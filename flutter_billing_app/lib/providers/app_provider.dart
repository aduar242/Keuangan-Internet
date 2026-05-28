import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../models/models.dart';
import '../database/db_helper.dart';
import '../services/api_service.dart';

class AppProvider with ChangeNotifier {
  User? _currentUser;
  AppSettings? _settings;
  List<Customer> _customers = [];
  List<Transaction> _localTransactions = [];
  
  bool _isLoading = false;
  bool _isOffline = false;
  double _heldBalance = 0.0;
  int _viewMonthsAhead = 2; // Default, can be updated via UI
  List<String> _selectedPeriods = [];

  // Configuration settings
  String _apiBaseUrl = "https://your-api-url.com";

  // Getters
  User? get currentUser => _currentUser;
  AppSettings? get settings => _settings;
  List<Customer> get customers => _customers;
  List<Transaction> get localTransactions => _localTransactions;
  bool get isLoading => _isLoading;
  bool get isOffline => _isOffline;
  double get heldBalance => _heldBalance;
  int get viewMonthsAhead => _viewMonthsAhead;
  List<String> get selectedPeriods => _selectedPeriods;
  String get apiBaseUrl => _apiBaseUrl;

  // Initialize and load persisted configuration
  Future<void> initializeApp() async {
    _isLoading = true;
    notifyListeners();

    try {
      final prefs = await SharedPreferences.getInstance();
      _apiBaseUrl = prefs.getString('api_base_url') ?? "https://your-api-url.com";
      _viewMonthsAhead = prefs.getInt('view_months_ahead') ?? 2;

      // Check current user cache
      final userId = prefs.getInt('auth_user_id');
      final userName = prefs.getString('auth_user_name');
      final role = prefs.getString('auth_user_role');
      final token = prefs.getString('auth_token');

      if (userId != null && userName != null && role != null && token != null) {
        _currentUser = User(id: userId, name: userName, username: userName, role: role, token: token);
      }

      // Load cached offline customers first
      _customers = await DatabaseHelper.instance.getCustomers();
      _localTransactions = await DatabaseHelper.instance.getLocalTransactionsHistory();
      
      // Calculate offline held balance from SQLite records that are pending/deposited
      await recalculateOfflineHeldBalance();

    } catch (e) {
      print("Error initialized app state: $e");
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  // Set months offset dynamically
  void setViewMonthsAhead(int months) async {
    _viewMonthsAhead = months;
    notifyListeners();
    final prefs = await SharedPreferences.getInstance();
    await prefs.setInt('view_months_ahead', months);
  }

  // Select standard debt periods (arrears only) up to current month
  void selectArrearsOnly(Customer customer) {
    final now = DateTime.now();
    final currentMonthStr = "${now.year}-${now.month.toString().padLeft(2, '0')}";
    final unpaid = getUnpaidMonthsList(customer, 0); // No future limit for arrears
    
    _selectedPeriods = unpaid.where((p) => p.compareTo(currentMonthStr) <= 0).toList();
    notifyListeners();
  }

  // Toggle multi-period month collection
  void togglePeriod(String period) {
    if (_selectedPeriods.contains(period)) {
      _selectedPeriods.remove(period);
    } else {
      _selectedPeriods.add(period);
    }
    notifyListeners();
  }

  void clearSelectedPeriods() {
    _selectedPeriods = [];
    notifyListeners();
  }

  // Core Login
  Future<bool> loginUser(String baseUrl, String username, String password) async {
    _isLoading = true;
    notifyListeners();
    try {
      final user = await ApiService.instance.login(baseUrl, username, password);
      _currentUser = user;
      _apiBaseUrl = baseUrl;
      _isOffline = false;

      // Persist user properties
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString('auth_user_name', user.name);
      await prefs.setString('auth_user_role', user.role);

      // Trigger full sync right after login
      await syncData();
      return true;
    } catch (e) {
      print("Login error context: $e");
      rethrow;
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  // Save transaction (offline first)
  Future<Transaction> recordTransaction({
    required int customerId,
    required String customerName,
    required double amount,
    required String category,
    required String description,
    required String selectedPeriodsString,
  }) async {
    if (_currentUser == null) throw Exception("Tidak ada user aktif.");

    final now = DateTime.now();
    final transactionDateStr = "${now.year}-${now.month.toString().padLeft(2, '0')}-${now.day.toString().padLeft(2, '0')}";
    final customCreatedAt = now.toIso8601String();

    final offlineTx = Transaction(
      userId: _currentUser!.id,
      customerId: customerId,
      customerName: customerName,
      collectorName: _currentUser!.name,
      type: 'pemasukan',
      category: category,
      amount: amount,
      description: description,
      status: 'pending', // Offline status
      billingPeriod: category == 'Tagihan Bulanan' ? selectedPeriodsString : null,
      transactionDate: transactionDateStr,
      createdAt: customCreatedAt,
    );

    // Save transaction to local SQLite DB immediately
    final localId = await DatabaseHelper.instance.insertOfflineTransaction(offlineTx);
    final savedTx = Transaction(
      id: localId,
      userId: offlineTx.userId,
      customerId: offlineTx.customerId,
      customerName: offlineTx.customerName,
      collectorName: offlineTx.collectorName,
      type: offlineTx.type,
      category: offlineTx.category,
      amount: offlineTx.amount,
      description: offlineTx.description,
      status: offlineTx.status,
      billingPeriod: offlineTx.billingPeriod,
      transactionDate: offlineTx.transactionDate,
      createdAt: offlineTx.createdAt,
    );

    // Speed up customer UI cache: update SQLite customer model's paid months offline immediately
    if (category == 'Tagihan Bulanan') {
      final periodsList = selectedPeriodsString.split(',');
      for (var period in periodsList) {
        await DatabaseHelper.instance.updateCustomerPaidMonths(customerId, period.trim());
      }
    }

    // Refresh memory cache
    _customers = await DatabaseHelper.instance.getCustomers();
    _localTransactions = await DatabaseHelper.instance.getLocalTransactionsHistory();
    await recalculateOfflineHeldBalance();
    
    notifyListeners();

    // Silently perform background synchronization if online
    triggerBackgroundSync();

    return savedTx;
  }

  // Background Remote Uploader
  Future<void> triggerBackgroundSync() async {
    try {
      final pendingList = await DatabaseHelper.instance.getOfflinePendingTransactions();
      if (pendingList.isEmpty) return;

      for (var tx in pendingList) {
        final syncedTx = await ApiService.instance.uploadTransaction(tx);
        await DatabaseHelper.instance.markAsSynced(tx.id!, syncedTx.id ?? 1, syncedTx.status);
      }
      
      // Update data logs
      _localTransactions = await DatabaseHelper.instance.getLocalTransactionsHistory();
      await syncData(); // Retrieve fresh remote updates
    } catch (e) {
      print("Background sync silent note: $e (likely offline)");
    }
  }

  // Recalculates funds matching local transactions
  Future<void> recalculateOfflineHeldBalance() async {
    final txs = await DatabaseHelper.instance.getLocalTransactionsHistory();
    double sum = 0.0;
    for (var tx in txs) {
      // Unconfirmed or offline collected money that is held by user
      if (tx.type == 'pemasukan' && (tx.status == 'pending' || tx.status == 'deposited')) {
        sum += tx.amount;
      }
    }
    _heldBalance = sum;
  }

  // Deposit Request to Admin
  Future<void> requestDeposit() async {
    _isLoading = true;
    notifyListeners();
    try {
      await ApiService.instance.triggerRemoteDeposit();
      // Set status of local pending transactions to 'deposited'
      final db = await DatabaseHelper.instance.database;
      await db.rawUpdate("UPDATE transactions SET status = 'deposited' WHERE status = 'pending' AND type = 'pemasukan'");
      
      _localTransactions = await DatabaseHelper.instance.getLocalTransactionsHistory();
      await recalculateOfflineHeldBalance();
      await syncData(); // Fetch remote stats confirmation
    } catch (e) {
      print("Deposit error: $e");
      rethrow;
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  // Bidirectional Synchronization of Customers, Settings, & cached transactions
  Future<void> syncData() async {
    _isLoading = true;
    notifyListeners();
    try {
      _isOffline = false;

      // 1. First sync any pending local transactions to remote API
      final pendingTransactions = await DatabaseHelper.instance.getOfflinePendingTransactions();
      for (var localTx in pendingTransactions) {
        try {
          final serverTx = await ApiService.instance.uploadTransaction(localTx);
          await DatabaseHelper.instance.markAsSynced(localTx.id!, serverTx.id ?? 1, serverTx.status);
        } catch (txnError) {
          print("Failure syncing transaction id ${localTx.id}: $txnError");
        }
      }

      // 2. Load fresh Settings configuration
      _settings = await ApiService.instance.fetchAppSettings();

      // 3. Load fresh Customer data list
      final remoteCustomers = await ApiService.instance.fetchCustomers();
      _customers = remoteCustomers;
      // Persist to offline DB
      await DatabaseHelper.instance.saveCustomers(remoteCustomers);

      // 4. Fetch metrics/balance summaries
      final statsMap = await ApiService.instance.fetchCollectorStats();
      _heldBalance = statsMap['heldAmount'] ?? 0.0;

      // Load local history
      _localTransactions = await DatabaseHelper.instance.getLocalTransactionsHistory();

    } catch (e) {
      print("Sync error, falling back to cached local storage: $e");
      _isOffline = true;
      
      // Load from local database cache
      _customers = await DatabaseHelper.instance.getCustomers();
      _localTransactions = await DatabaseHelper.instance.getLocalTransactionsHistory();
      await recalculateOfflineHeldBalance();
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  // Log Out operation
  Future<void> logoutUser() async {
    _isLoading = true;
    notifyListeners();
    try {
      await ApiService.instance.logout();
      await DatabaseHelper.instance.clearAll();
      _currentUser = null;
      _customers = [];
      _localTransactions = [];
      _heldBalance = 0.0;
    } catch (e) {
      print("Logout error: $e");
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  // Core offline-safe custom unpaid period calculator for the view limit
  List<String> getUnpaidMonthsList(Customer? customer, int futureLimit) {
    if (customer == null) return [];
    
    final paidPeriods = <String>{};
    if (customer.paid_months != null && customer.paid_months!.isNotEmpty) {
      customer.paid_months!.split(',').forEach((p) => paidPeriods.add(p.trim()));
    }

    // Default connection fallback for date checking
    final joinMonth = (customer.createdAt != null && customer.createdAt!.length >= 7)
        ? customer.createdAt!.substring(0, 7)
        : '2020-01';
        
    final now = DateTime.now();
    final List<String> monthsList = [];
    
    // Check preceding 24 months to detect any depth of debts, plus future boundary offset
    for (int i = -24; i <= futureLimit; i++) {
        final d = DateTime(now.year, now.month + i, 1);
        final periodStr = "${d.year}-${d.month.toString().padLeft(2, '0')}";
        
        if (periodStr.compareTo(joinMonth) < 0) continue;
        if (!paidPeriods.contains(periodStr)) {
            monthsList.add(periodStr);
        }
    }
    return monthsList;
  }
}
