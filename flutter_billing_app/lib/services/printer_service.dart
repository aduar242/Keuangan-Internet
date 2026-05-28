import 'package:blue_thermal_printer/blue_thermal_printer.dart';
import '../models/models.dart';
import 'package:intl/intl.dart';

class PrinterService {
  static final PrinterService instance = PrinterService._internal();
  PrinterService._internal();

  final BlueThermalPrinter _bluetooth = BlueThermalPrinter.instance;
  bool _isConnected = false;
  BluetoothDevice? _connectedDevice;

  bool get isConnected => _isConnected;
  BluetoothDevice? get connectedDevice => _connectedDevice;

  Future<List<BluetoothDevice>> getPairedDevices() async {
    try {
      return await _bluetooth.getBondedDevices();
    } catch (e) {
      print("Error getting bonded BT devices: $e");
      return [];
    }
  }

  Future<bool> connect(BluetoothDevice device) async {
    try {
      final isAlreadyConnected = await _bluetooth.isConnected;
      if (isAlreadyConnected ?? false) {
        _isConnected = true;
        _connectedDevice = device;
        return true;
      }

      await _bluetooth.connect(device);
      _isConnected = true;
      _connectedDevice = device;
      return true;
    } catch (e) {
      print("Bluetooth connection error: $e");
      _isConnected = false;
      _connectedDevice = null;
      return false;
    }
  }

  Future<void> disconnect() async {
    await _bluetooth.disconnect();
    _isConnected = false;
    _connectedDevice = null;
  }

  // Prints a highly professional ESC/POS layout for customer subscriptions
  Future<void> printReceipt({
    required Transaction transaction,
    required AppSettings settings,
    required String customerName,
    required String collectorName,
  }) async {
    final connected = await _bluetooth.isConnected;
    if (connected != true) {
      throw Exception("Printer bluetooth tidak dalam kondisi tersambung.");
    }

    final currencyFormat = NumberFormat.currency(locale: 'id_ID', symbol: 'Rp ', decimalDigits: 0);
    final printTime = DateFormat('dd/MM/yyyy HH:mm:ss').format(DateTime.now());

    // --- Start ESC/POS Receipt Printing ---
    // Sizes: 0 = Normal, 1 = Large text, 2 = Medium text, 3 = Align center/left/right
    
    // Header
    _bluetooth.writeGPT("\n");
    _bluetooth.printCustom(settings.companyName.toUpperCase(), 3, 1); // Center, Large, bold
    _bluetooth.printCustom(settings.companyAddress, 0, 1); // Center, Normal
    _bluetooth.printCustom("HP: ${settings.companyPhone}", 0, 1); // Center, Normal
    _bluetooth.printCustom("================================", 0, 1); // Line divider
    
    // Doc Type
    _bluetooth.printCustom("BUKTI PEMBAYARAN RESMI", 2, 1); // Center, Medium Text
    _bluetooth.printCustom("--------------------------------", 0, 1);
    
    // Metadata block
    _bluetooth.printLeftRight("Tanggal:", transaction.transactionDate, 1);
    _bluetooth.printLeftRight("Pelanggan:", customerName, 1);
    _bluetooth.printLeftRight("Petugas:", collectorName, 1);
    _bluetooth.printLeftRight("Status:", "LUNAS / SELESAI", 1);
    _bluetooth.printCustom("--------------------------------", 0, 1);

    // Dynamic Items Block
    _bluetooth.printCustom("RINCIAN PEMBAYARAN:", 1, 1); // Left alignment, normal bold
    _bluetooth.printLeftRight(transaction.category, currencyFormat.format(transaction.amount), 1);
    
    if (transaction.category == 'Tagihan Bulanan' && transaction.billingPeriod != null) {
      final periods = transaction.billingPeriod!.split(',');
      for (var period in periods) {
        _bluetooth.printCustom(" - Bulan Layanan: ${formatPeriodIndo(period.trim())}", 0, 1);
      }
    } else if (transaction.description.isNotEmpty) {
      _bluetooth.printCustom(" Ket: ${transaction.description}", 0, 1);
    }
    
    _bluetooth.printCustom("================================", 0, 1);
    
    // Grand Total
    _bluetooth.printLeftRight("TOTAL BAYAR:", currencyFormat.format(transaction.amount), 2); // Center bold representation
    _bluetooth.printCustom("================================", 0, 1);

    // Footer
    _bluetooth.printCustom(settings.receiptFooter, 0, 1);
    _bluetooth.printCustom("Waktu Cetak: $printTime", 0, 1);
    _bluetooth.printCustom("\n\n\n", 0, 1); // Scroll down to easily tear off
  }

  // Format YYYY-MM to readable Indonesian representation (e.g., "Mei 2026")
  String formatPeriodIndo(String yyyymm) {
    try {
      final parts = yyyymm.split('-');
      if (parts.length != 2) return yyyymm;
      final year = parts[0];
      final monthIndex = int.parse(parts[1]);
      const months = [
        'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
        'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
      ];
      if (monthIndex < 1 || monthIndex > 12) return yyyymm;
      return "${months[monthIndex - 1]} $year";
    } catch (e) {
      return yyyymm;
    }
  }
}

// Extension to allow easy mock-safe direct printer mapping if package has slightly different signatures
extension ThermalPrinterExt on BlueThermalPrinter {
  void writeGPT(String raw) {
    try {
      write(raw);
    } catch (_) {
      // safe fallback
    }
  }
}
