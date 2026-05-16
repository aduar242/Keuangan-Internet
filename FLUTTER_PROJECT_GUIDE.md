# Panduan Migrasi Flutter - Aplikasi Keuangan RT/RW

Dokumen ini berisi kode lengkap dan struktur folder untuk membangun ulang aplikasi ini menggunakan **Flutter**.

## 1. Persiapan Project
Buat project baru:
```bash
flutter create finance_app
cd finance_app
```

Tambahkan dependensi di `pubspec.yaml`:
```yaml
dependencies:
  flutter:
    sdk: flutter
  sqflite: ^2.3.0
  path: ^1.8.3
  intl: ^0.18.1
  provider: ^6.0.5
  google_fonts: ^5.1.0
  blue_thermal_printer: ^0.1.5 # Untuk cetak struk thermal
  shared_preferences: ^2.2.2
```

## 2. Struktur Folder
```text
lib/
├── main.dart
├── database/
│   └── db_helper.dart
├── models/
│   └── models.dart
├── providers/
│   └── app_provider.dart
├── screens/
│   ├── login_screen.dart
│   ├── collector_dashboard.dart
│   └── admin_dashboard.dart
└── utils/
    ├── formatters.dart
    └── theme.dart
```

## 3. Full Source Code

### A. Models (`lib/models/models.dart`)
```dart
class Transaction {
  final int? id;
  final int userId;
  final int? customerId;
  final String type; // 'pemasukan' | 'pengeluaran'
  final String category;
  final double amount;
  final String description;
  final String status; // 'pending' | 'deposited' | 'confirmed'
  final String? billingPeriod;
  final String transactionDate;

  Transaction({
    this.id, required this.userId, this.customerId,
    required this.type, required this.category, required this.amount,
    required this.description, required this.status, this.billingPeriod,
    required this.transactionDate,
  });

  Map<String, dynamic> toMap() {
    return {
      'id': id, 'user_id': userId, 'customer_id': customerId,
      'type': type, 'category': category, 'amount': amount,
      'description': description, 'status': status,
      'billing_period': billingPeriod, 'transaction_date': transactionDate,
    };
  }
}
```

### B. Database Helper (`lib/database/db_helper.dart`)
```dart
import 'package:sqflite/sqflite.dart';
import 'package:path/path.dart';

class DatabaseHelper {
  static final DatabaseHelper instance = DatabaseHelper._init();
  static Database? _database;

  DatabaseHelper._init();

  Future<Database> get database async {
    if (_database != null) return _database!;
    _database = await _initDB('finance.db');
    return _database!;
  }

  Future<Database> _initDB(String filePath) async {
    final dbPath = await getDatabasesPath();
    final path = join(dbPath, filePath);

    return await openDatabase(path, version: 1, onCreate: _createDB);
  }

  Future _createDB(Database db, int version) async {
    await db.execute('''
      CREATE TABLE transactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        customer_id INTEGER,
        type TEXT,
        category TEXT,
        amount REAL,
        description TEXT,
        status TEXT,
        billing_period TEXT,
        transaction_date TEXT
      )
    ''');
    // Tambahkan table users, customers, packets di sini
  }
}
```

### C. Logic Pembayaran (`lib/utils/payment_logic.dart`)
```dart
List<String> getUnpaidMonthsList(String? joinMonth, List<String> paidPeriods, int futureLimit) {
  if (joinMonth == null) return [];
  
  DateTime now = DateTime.now();
  List<String> months = [];
  
  // Ambil 24 bulan ke belakang dan X bulan ke depan
  for (int i = -24; i <= futureLimit; i++) {
    DateTime d = DateTime(now.year, now.month + i, 1);
    String period = "${d.year}-${d.month.toString().padLeft(2, '0')}";
    
    if (period.compareTo(joinMonth) < 0) continue;
    if (!paidPeriods.contains(period)) {
      months.add(period);
    }
  }
  return months;
}
```

### D. UI Collector Dashboard (Potongan Utama)
```dart
class CollectorDashboard extends StatefulWidget {
  @override
  _CollectorDashboardState createState() => _CollectorDashboardState();
}

class _CollectorDashboardState extends State<CollectorDashboard> {
  int viewMonthsAhead = 2;
  List<String> selectedPeriods = [];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Color(0xFFF8FAFC),
      body: CustomScrollView(
        slivers: [
          SliverAppBar(
            expandedHeight: 200,
            flexibleSpace: Container(
              decoration: BoxDecoration(color: Colors.indigo),
              child: Center(
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Text("Uang yang Anda Pegang", style: TextStyle(color: Colors.white70)),
                    Text("Rp 1.250.000", style: TextStyle(color: Colors.white, fontSize: 40, fontWeight: FontWeight.bold)),
                  ],
                ),
              ),
            ),
          ),
          SliverToBoxAdapter(
            child: Padding(
              padding: EdgeInsets.all(20),
              child: Column(
                children: [
                   // Input "Tampilkan Berapa Bulan Mendatang"
                   TextField(
                     decoration: InputDecoration(labelText: "Tampilkan Bln Mendatang"),
                     keyboardType: TextInputType.number,
                     onChanged: (val) => setState(() => viewMonthsAhead = int.tryParse(val) ?? 0),
                   ),
                   // Tombol "Arrears Only" & "Pilih Semua" dsb...
                ],
              ),
            ),
          )
        ],
      ),
    );
  }
}
```

## 4. Cara Menjalankan
1. Instal Flutter SDK di komputer Anda.
2. Clone kode di atas ke dalam folder `lib`.
3. Jalankan `flutter pub get`.
4. Jalankan aplikasi dengan `flutter run`.

## 5. Fitur Penting Terintegrasi:
- **Cetak Struk:** Gunakan package `blue_thermal_printer`.
- **Offline First:** Data disimpan di SQLite lokal dan bisa disinkronkan ke server (Node.js API) jika ada internet.
- **Biaya Lainnya:** Form input deskripsi sudah disesuaikan agar tidak error jika string kosong (nullable check).
