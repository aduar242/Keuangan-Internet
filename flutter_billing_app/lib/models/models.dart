class User {
  final int id;
  final String name;
  final String username;
  final String role;
  final String? token;

  User({
    required this.id,
    required this.name,
    required this.username,
    required this.role,
    this.token,
  });

  factory User.fromJson(Map<String, dynamic> json) {
    return User(
      id: json['id'] is String ? int.parse(json['id']) : json['id'] ?? 0,
      name: json['name'] ?? '',
      username: json['username'] ?? '',
      role: json['role'] ?? 'penagih',
      token: json['token'],
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'username': username,
      'role': role,
      if (token != null) 'token': token,
    };
  }

  factory User.fromMap(Map<String, dynamic> map) {
    return User(
      id: map['id'] ?? 0,
      name: map['name'] ?? '',
      username: map['username'] ?? '',
      role: map['role'] ?? 'penagih',
      token: map['token'],
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'id': id,
      'name': name,
      'username': username,
      'role': role,
      'token': token,
    };
  }
}

class Packet {
  final int id;
  final String name;
  final int speed;
  final double price;
  final String? description;

  Packet({
    required this.id,
    required this.name,
    required this.speed,
    required this.price,
    this.description,
  });

  factory Packet.fromJson(Map<String, dynamic> json) {
    return Packet(
      id: json['id'] is String ? int.parse(json['id']) : json['id'] ?? 0,
      name: json['name'] ?? '',
      speed: json['speed'] is String ? int.parse(json['speed']) : json['speed'] ?? 0,
      price: json['price'] is String ? double.parse(json['price']) : (json['price'] as num?)?.toDouble() ?? 0.0,
      description: json['description'],
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'speed': speed,
      'price': price,
      'description': description,
    };
  }
}

class Customer {
  final int id;
  final String name;
  final String address;
  final String phone;
  final String packet;
  final String? createdAt;
  final int? collectorId;
  final String? paidMonths;

  Customer({
    required this.id,
    required this.name,
    required this.address,
    required this.phone,
    required this.packet,
    this.createdAt,
    this.collectorId,
    this.paidMonths,
  });

  factory Customer.fromJson(Map<String, dynamic> json) {
    return Customer(
      id: json['id'] is String ? int.parse(json['id']) : json['id'] ?? 0,
      name: json['name'] ?? '',
      address: json['address'] ?? '',
      phone: json['phone'] ?? '',
      packet: json['packet'] ?? '',
      createdAt: json['created_at'],
      collectorId: json['collector_id'] is String ? int.tryParse(json['collector_id']) : json['collector_id'],
      paidMonths: json['paid_months'],
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'address': address,
      'phone': phone,
      'packet': packet,
      'created_at': createdAt,
      'collector_id': collectorId,
      'paid_months': paidMonths,
    };
  }

  factory Customer.fromMap(Map<String, dynamic> map) {
    return Customer(
      id: map['id'] ?? 0,
      name: map['name'] ?? '',
      address: map['address'] ?? '',
      phone: map['phone'] ?? '',
      packet: map['packet'] ?? '',
      createdAt: map['created_at'],
      collectorId: map['collector_id'],
      paidMonths: map['paid_months'],
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'id': id,
      'name': name,
      'address': address,
      'phone': phone,
      'packet': packet,
      'created_at': createdAt,
      'collector_id': collectorId,
      'paid_months': paidMonths,
    };
  }
}

class Transaction {
  final int? id;
  final int userId;
  final int? customerId;
  final String? customerName;
  final String? collectorName;
  final String type; // 'pemasukan' | 'pengeluaran'
  final String category; // 'Tagihan Bulanan', 'Voucher', etc.
  final double amount;
  final String description;
  final String status; // 'pending' | 'deposited' | 'confirmed'
  final String? billingPeriod; // Format: 'YYYY-MM' or multiple values like '2026-05,2026-06'
  final String transactionDate; // Format: 'YYYY-MM-DD'
  final String? createdAt; // ISO string

  Transaction({
    this.id,
    required this.userId,
    this.customerId,
    this.customerName,
    this.collectorName,
    required this.type,
    required this.category,
    required this.amount,
    required this.description,
    required this.status,
    this.billingPeriod,
    required this.transactionDate,
    this.createdAt,
  });

  factory Transaction.fromJson(Map<String, dynamic> json) {
    return Transaction(
      id: json['id'] is String ? int.tryParse(json['id']) : json['id'],
      userId: json['user_id'] is String ? int.parse(json['user_id']) : json['user_id'] ?? 0,
      customerId: json['customer_id'] is String ? int.tryParse(json['customer_id']) : json['customer_id'],
      customerName: json['customer_name'],
      collectorName: json['collector_name'],
      type: json['type'] ?? 'pemasukan',
      category: json['category'] ?? '',
      amount: json['amount'] is String ? double.parse(json['amount']) : (json['amount'] as num?)?.toDouble() ?? 0.0,
      description: json['description'] ?? '',
      status: json['status'] ?? 'pending',
      billingPeriod: json['billing_period'],
      transactionDate: json['transaction_date'] ?? DateTime.now().toIso8601String().split('T')[0],
      createdAt: json['created_at'],
    );
  }

  Map<String, dynamic> toJson() {
    return {
      if (id != null) 'id': id,
      'user_id': userId,
      'customer_id': customerId,
      if (customerName != null) 'customer_name': customerName,
      if (collectorName != null) 'collector_name': collectorName,
      'type': type,
      'category': category,
      'amount': amount,
      'description': description,
      'status': status,
      'billing_period': billingPeriod,
      'transaction_date': transactionDate,
      if (createdAt != null) 'created_at': createdAt,
    };
  }

  factory Transaction.fromMap(Map<String, dynamic> map) {
    return Transaction(
      id: map['id'],
      userId: map['user_id'] ?? 0,
      customerId: map['customer_id'],
      customerName: map['customer_name'],
      collectorName: map['collector_name'],
      type: map['type'] ?? 'pemasukan',
      category: map['category'] ?? '',
      amount: (map['amount'] as num?)?.toDouble() ?? 0.0,
      description: map['description'] ?? '',
      status: map['status'] ?? 'pending',
      billingPeriod: map['billing_period'],
      transactionDate: map['transaction_date'] ?? '',
      createdAt: map['created_at'],
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'id': id,
      'user_id': userId,
      'customer_id': customerId,
      'customer_name': customerName,
      'collector_name': collectorName,
      'type': type,
      'category': category,
      'amount': amount,
      'description': description,
      'status': status,
      'billing_period': billingPeriod,
      'transaction_date': transactionDate,
      'created_at': createdAt,
    };
  }
}

class AppSettings {
  final String companyName;
  final String companyAddress;
  final String companyPhone;
  final String receiptFooter;

  AppSettings({
    required this.companyName,
    required this.companyAddress,
    required this.companyPhone,
    required this.receiptFooter,
  });

  factory AppSettings.fromJson(Map<String, dynamic> json) {
    return AppSettings(
      companyName: json['company_name'] ?? 'ISP NETWORK',
      companyAddress: json['company_address'] ?? 'Alamat Default',
      companyPhone: json['company_phone'] ?? '0812-XXXX-XXXX',
      receiptFooter: json['receipt_footer'] ?? 'Simpan bukti bayar ini sebagai tanda lunas\nTerima Kasih.',
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'company_name': companyName,
      'company_address': companyAddress,
      'company_phone': companyPhone,
      'receipt_footer': receiptFooter,
    };
  }
}
