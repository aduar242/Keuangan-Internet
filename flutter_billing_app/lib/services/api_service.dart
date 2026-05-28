import 'package:dio/dio.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../models/models.dart';

class ApiService {
  final Dio _dio = Dio();
  String? _baseUrl;
  String? _token;

  static final ApiService instance = ApiService._internal();
  ApiService._internal() {
    _dio.options.connectTimeout = const Duration(seconds: 10);
    _dio.options.receiveTimeout = const Duration(seconds: 10);
    
    // Add request interceptor for Authorization headers
    _dio.interceptors.add(InterceptorsWrapper(
      onRequest: (options, handler) async {
        if (_token == null) {
          final prefs = await SharedPreferences.getInstance();
          _token = prefs.getString('auth_token');
          _baseUrl = prefs.getString('api_base_url');
        }
        
        if (_baseUrl != null) {
          options.baseUrl = _baseUrl!;
        }
        
        if (_token != null) {
          // Both formats: standard Bearer Token or custom x-user-id header
          options.headers['Authorization'] = 'Bearer $_token';
          
          final userId = prefsGetUserId();
          if (userId != null) {
            options.headers['x-user-id'] = userId.toString();
          }
        }
        
        return handler.next(options);
      },
      onError: (e, handler) {
        print("API ERROR: ${e.response?.statusCode} - ${e.message}");
        return handler.next(e);
      }
    ));
  }

  Future<void> saveSettings(String baseUrl, String? token, int? userId) async {
    _baseUrl = baseUrl;
    _token = token;
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('api_base_url', baseUrl);
    if (token != null) {
      await prefs.setString('auth_token', token);
    }
    if (userId != null) {
      await prefs.setInt('auth_user_id', userId);
    }
  }

  Future<int?> prefsGetUserId() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getInt('auth_user_id');
  }

  Future<User> login(String baseUrl, String username, String password) async {
    // Standardize URL formatting
    String formattedUrl = baseUrl;
    if (!formattedUrl.startsWith('http://') && !formattedUrl.startsWith('https://')) {
      formattedUrl = 'https://$formattedUrl';
    }
    if (formattedUrl.endsWith('/')) {
      formattedUrl = formattedUrl.substring(0, formattedUrl.length - 1);
    }

    final response = await Dio().post(
      '$formattedUrl/api/auth/login',
      data: {'username': username, 'password': password},
      options: Options(connectTimeout: const Duration(seconds: 5)),
    );

    if (response.statusCode == 200) {
      final data = response.data;
      final user = User.fromJson(data);
      final rawToken = data['token'] ?? String.fromCharCodes(Iterable.generate(16, (i) => 97 + i)); // Fallback fake token if server only sends profile info
      await saveSettings(formattedUrl, rawToken, user.id);
      return user;
    } else {
      throw Exception(response.data['error'] ?? 'Login gagal, periksa credentials Anda');
    }
  }

  Future<List<Customer>> fetchCustomers() async {
    if (_baseUrl == null) throw Exception("API Base URL not configured.");
    final response = await _dio.get('/api/customers');
    if (response.statusCode == 200) {
      final List<dynamic> list = response.data;
      return list.map((item) => Customer.fromJson(item)).toList();
    }
    throw Exception("Gagal mengambil data pelanggan");
  }

  Future<AppSettings> fetchAppSettings() async {
    if (_baseUrl == null) throw Exception("API Base URL not configured.");
    final response = await _dio.get('/api/settings');
    if (response.statusCode == 200) {
      return AppSettings.fromJson(response.data);
    }
    // Return standard fallback
    return AppSettings(
      companyName: "ISP NETWORK",
      companyAddress: "Alamat Kantor RT/RW Net",
      companyPhone: "081234567890",
      receiptFooter: "Simpan bukti setor ini sebagai tanda bukti pembayaran sah.",
    );
  }

  // Sync a single transaction to the remote Node.js Express API
  Future<Transaction> uploadTransaction(Transaction t) async {
    if (_baseUrl == null) throw Exception("API Base URL not configured.");
    
    final payload = {
      'type': t.type,
      'category': t.category,
      'amount': t.amount,
      'description': t.description,
      'transaction_date': t.transactionDate,
      if (t.billingPeriod != null) 'billing_period': t.billingPeriod,
      if (t.customerId != null) 'customer_id': t.customerId,
    };

    final response = await _dio.post('/api/transactions', data: payload);
    if (response.statusCode == 200 || response.statusCode == 201) {
      return Transaction.fromJson(response.data);
    }
    throw Exception("Gagal sinkronisasi transaksi: ${response.data['error'] ?? 'Unknown error'}");
  }

  Future<Map<String, dynamic>> fetchCollectorStats() async {
    if (_baseUrl == null) return {'heldAmount': 0.0, 'pendingCount': 0};
    try {
      final response = await _dio.get('/api/deposits/stats');
      if (response.statusCode == 200) {
        return {
          'heldAmount': (response.data['heldAmount'] as num?)?.toDouble() ?? 0.0,
          'collector_name': response.data['collector_name'] ?? '',
        };
      }
    } catch (e) {
      print("Error fetching remote metrics: $e");
    }
    return {'heldAmount': 0.0, 'pendingCount': 0};
  }

  Future<void> triggerRemoteDeposit() async {
    if (_baseUrl == null) throw Exception("API Base URL not configured.");
    final userId = await prefsGetUserId();
    if (userId == null) throw Exception("User identification missing.");
    
    // Node.js backend handles cash deposit request by routing collector ID
    final response = await _dio.post('/api/deposits/request', data: {
      'collector_id': userId,
    });
    if (response.statusCode != 200 && response.statusCode != 201) {
      throw Exception("Gagal mengajukan setoran: ${response.data['error'] ?? 'Unknown Error'}");
    }
  }

  Future<void> logout() async {
    _token = null;
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('auth_token');
    await prefs.remove('auth_user_id');
  }
}
