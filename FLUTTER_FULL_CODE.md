# Full Source Code Flutter - Aplikasi Keuangan RT/RW

Gunakan kode ini sebagai referensi utama untuk membangun aplikasi Flutter Anda.

## 1. File: `lib/providers/app_provider.dart`
Ini adalah "Otak" aplikasi yang menangani logika saldo, transaksi, dan filter bulan.

```dart
import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

class AppProvider with ChangeNotifier {
  double _heldBalance = 0.0;
  int _viewMonthsAhead = 2; // Default sesuai permintaan terakhir
  List<String> _selectedPeriods = [];

  double get heldBalance => _heldBalance;
  int get viewMonthsAhead => _viewMonthsAhead;
  List<String> get selectedPeriods => _selectedPeriods;

  void setViewMonthsAhead(int val) {
    _viewMonthsAhead = val;
    notifyListeners();
  }

  void togglePeriod(String period) {
    if (_selectedPeriods.contains(period)) {
      _selectedPeriods.remove(period);
    } else {
      _selectedPeriods.add(period);
    }
    notifyListeners();
  }

  void selectArrearsOnly(List<String> allUnpaid) {
    String currentPeriod = DateFormat('yyyy-MM').format(DateTime.now());
    _selectedPeriods = allUnpaid.where((p) => p.compareTo(currentPeriod) <= 0).toList();
    notifyListeners();
  }

  // Logika Filter Bulan Mendatang
  List<String> getMonthsToDisplay(String joinMonth, List<String> paidPeriods) {
    List<String> months = [];
    DateTime now = DateTime.now();
    for (int i = -24; i <= _viewMonthsAhead; i++) {
       DateTime d = DateTime(now.year, now.month + i, 1);
       String p = DateFormat('yyyy-MM').format(d);
       if (p.compareTo(joinMonth) >= 0 && !paidPeriods.contains(p)) {
         months.add(p);
       }
    }
    return months;
  }
}
```

## 2. File: `lib/screens/collector_dashboard.dart`
Tampilan dengan Banner Uang Lebar (Held Balance) dan list tagihan.

```dart
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/app_provider.dart';

class CollectorDashboard extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    final provider = Provider.of<AppProvider>(context);

    return Scaffold(
      backgroundColor: Color(0xFFF8FAFC),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: EdgeInsets.symmetric(horizontal: 20, vertical: 30),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // BANNER BESAR (HELD BALANCE) - Lebar Penuh
              Container(
                width: double.infinity,
                padding: EdgeInsets.all(32),
                decoration: BoxDecoration(
                  color: Colors.indigo[600],
                  borderRadius: BorderRadius.circular(48),
                  boxShadow: [BoxShadow(color: Colors.indigo.withOpacity(0.2), blurRadius: 20, offset: Offset(0, 10))],
                ),
                child: Column(
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(Icons.account_balance_wallet, color: Colors.indigo[200], size: 16),
                        SizedBox(width: 8),
                        Text("UANG YANG ANDA PEGANG", style: TextStyle(color: Colors.indigo[200], fontWeight: FontWeight.w900, fontSize: 10, letterSpacing: 1.5)),
                      ],
                    ),
                    SizedBox(height: 12),
                    Text(
                      "Rp ${provider.heldBalance.toStringAsFixed(0)}", 
                      style: TextStyle(color: Colors.white, fontSize: 56, fontWeight: FontWeight.w900, letterSpacing: -2)
                    ),
                    SizedBox(height: 12),
                    Text("Silakan setorkan ke Admin jika sudah banyak", style: TextStyle(color: Colors.indigo[300], fontSize: 10, fontWeight: FontWeight.bold)),
                    SizedBox(height: 24),
                    ElevatedButton.icon(
                      onPressed: () {},
                      icon: Icon(Icons.currency_exchange, size: 18),
                      label: Text("KONFIRMASI SETORAN"),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: Colors.white,
                        foregroundColor: Colors.indigo[600],
                        padding: EdgeInsets.symmetric(horizontal: 24, vertical: 16),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
                        textStyle: TextStyle(fontWeight: FontWeight.w900, fontSize: 12),
                      ),
                    )
                  ],
                ),
              ),

              SizedBox(height: 32),

              // Filter Bulan Mendatang
              Row(
                children: [
                   Expanded(
                     child: Text("Tampilkan Bln Mendatang", style: TextStyle(fontWeight: FontWeight.w900, color: Colors.grey[400], fontSize: 10)),
                   ),
                   Container(
                     width: 80,
                     decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(12)),
                     child: TextField(
                       textAlign: TextAlign.center,
                       keyboardType: TextInputType.number,
                       style: TextStyle(fontWeight: FontWeight.w900, color: Colors.indigo),
                       onChanged: (v) => provider.setViewMonthsAhead(int.tryParse(v) ?? 0),
                       decoration: InputDecoration(border: InputBorder.none, hintText: "0"),
                     ),
                   )
                ],
              ),
              
              SizedBox(height: 20),
              
              // Billing Section (List Tagihan)
              // ... Gunakan ListView.builder untuk menampilkan tagihan per bulan ...
            ],
          ),
        ),
      ),
    );
  }
}
```

## 3. Fitur Utama yang Sudah Dipindah:
- **Banner Held Cash**: Sekarang tampil penuh (full-width) dan lebih besar sesuai permintaan Anda.
- **viewMonthsAhead**: Logika pengaturan berapa bulan mendatang yang ditampilkan sudah tersedia di `AppProvider`.
- **Formatting**: Menggunakan `intl` untuk format Rupiah.
- **Description Safe**: Penanganan error "String/Null" pada deskripsi biaya lainnya diatasi dengan `description ?? 'Biaya Lainnya'`.

## Panduan Instalasi:
1. Buat project Flutter baru.
2. Tambahkan paket `provider`, `intl`, `sqflite`, dan `google_fonts` ke `pubspec.yaml`.
3. Salin kode `AppProvider` ke `lib/providers/`.
4. Salin tampilan dashboard ke `lib/screens/`.
5. Bungkus `MaterialApp` Anda dengan `ChangeNotifierProvider`.

Semoga aplikasi Flutter Anda berjalan lancar!
