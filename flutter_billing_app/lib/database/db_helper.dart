import 'package:sqflite/sqflite.dart';
import 'package:path/path.dart';
import '../models/models.dart';

class DatabaseHelper {
  static final DatabaseHelper instance = DatabaseHelper._init();
  static Database? _database;

  DatabaseHelper._init();

  Future<Database> get database async {
    if (_database != null) return _database!;
    _database = await _initDB('isp_finance.db');
    return _database!;
  }

  Future<Database> _initDB(String filePath) async {
    final dbPath = await getDatabasesPath();
    final path = join(dbPath, filePath);

    return await openDatabase(
      path,
      version: 1,
      onCreate: _createDB,
      onUpgrade: _upgradeDB,
    );
  }

  Future _createDB(Database db, int version) async {
    // Customers Table Table
    await db.execute('''
      CREATE TABLE customers (
        id INTEGER PRIMARY KEY,
        name TEXT NOT NULL,
        address TEXT,
        phone TEXT,
        packet TEXT,
        created_at TEXT,
        collector_id INTEGER,
        paid_months TEXT
      )
    ''');

    // Transactions Table
    await db.execute('''
      CREATE TABLE transactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        server_id INTEGER, -- Simpan ID transaksi setelah sukses sinkronisasi ke server
        user_id INTEGER NOT NULL,
        customer_id INTEGER,
        customer_name TEXT,
        collector_name TEXT,
        type TEXT NOT NULL,
        category TEXT NOT NULL,
        amount REAL NOT NULL,
        description TEXT,
        status TEXT NOT NULL, -- 'pending' (offline), 'deposited', 'confirmed'
        billing_period TEXT,
        transaction_date TEXT NOT NULL,
        created_at TEXT,
        is_synced INTEGER DEFAULT 0 -- 0 = Offline Pending Sync, 1 = Synced with Server
      )
    ''');

    // Settings Cache
    await db.execute('''
      CREATE TABLE settings (
        company_name TEXTPRIMARY KEY,
        company_address TEXT,
        company_phone TEXT,
        receipt_footer TEXT
      )
    ''');
  }

  Future _upgradeDB(Database db, int oldVersion, int newVersion) async {
    // Handle migrations if schema changes
  }

  // --- Customers Queries ---
  Future<void> saveCustomers(List<Customer> customers) async {
    final db = await instance.database;
    final batch = db.batch();
    
    // Clear old records to avoid dirty states
    batch.delete('customers');
    
    for (var customer in customers) {
      batch.insert('customers', customer.toMap());
    }
    await batch.commit(noResult: true);
  }

  Future<List<Customer>> getCustomers() async {
    final db = await instance.database;
    final maps = await db.query('customers', orderBy: 'name ASC');
    return maps.map((m) => Customer.fromMap(m)).toList();
  }

  Future<void> updateCustomerPaidMonths(int customerId, String period) async {
    final db = await instance.database;
    final res = await db.query('customers', where: 'id = ?', whereArgs: [customerId]);
    if (res.isNotEmpty) {
      final customer = Customer.fromMap(res.first);
      final currentPaid = customer.paid_months ?? '';
      final List<String> list = currentPaid.isEmpty ? [] : currentPaid.split(',').map((p) => p.trim()).toList();
      if (!list.contains(period)) {
        list.add(period);
        final newPaidString = list.join(',');
        await db.update(
          'customers',
          {'paid_months': newPaidString},
          where: 'id = ?',
          whereArgs: [customerId],
        );
      }
    }
  }

  // --- Transactions Queries ---
  Future<int> insertOfflineTransaction(Transaction transaction) async {
    final db = await instance.database;
    final map = transaction.toMap();
    map['is_synced'] = 0; // Offline
    return await db.insert('transactions', map);
  }

  Future<List<Transaction>> getOfflinePendingTransactions() async {
    final db = await instance.database;
    final maps = await db.query('transactions', where: 'is_synced = ?', whereArgs: [0]);
    return maps.map((m) => Transaction.fromMap(m)).toList();
  }

  Future<void> markAsSynced(int localId, int serverId, String status) async {
    final db = await instance.database;
    await db.update(
      'transactions',
      {
        'server_id': serverId,
        'is_synced': 1,
        'status': status,
      },
      where: 'id = ?',
      whereArgs: [localId],
    );
  }

  Future<List<Transaction>> getLocalTransactionsHistory() async {
    final db = await instance.database;
    final maps = await db.query('transactions', orderBy: 'transaction_date DESC, id DESC', limit: 100);
    return maps.map((m) => Transaction.fromMap(m)).toList();
  }

  Future<void> clearAll() async {
    final db = await instance.database;
    await db.delete('customers');
    await db.delete('transactions');
    await db.delete('settings');
  }
}
