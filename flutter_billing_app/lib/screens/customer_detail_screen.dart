import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';
import 'package:blue_thermal_printer/blue_thermal_printer.dart' as bt;
import 'package:flutter_spinkit/flutter_spinkit.dart';
import '../models/models.dart';
import '../providers/app_provider.dart';
import '../services/printer_service.dart';

class CustomerDetailScreen extends StatefulWidget {
  final Customer customer;
  const CustomerDetailScreen({Key? key, required this.customer}) : super(key: key);

  @override
  _CustomerDetailScreenState createState() => _CustomerDetailScreenState();
}

class _CustomerDetailScreenState extends State<CustomerDetailScreen> {
  String _selectedCategory = "Tagihan Bulanan";
  double _customAmount = 0.0;
  final _descController = TextEditingController();
  final _amountController = TextEditingController();
  bool _isSaving = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final provider = Provider.of<AppProvider>(context, listen: false);
      provider.clearSelectedPeriods();
      // Initially select oldest debt period automatically
      final unpaid = provider.getUnpaidMonthsList(widget.customer, provider.viewMonthsAhead);
      if (unpaid.isNotEmpty) {
        provider.togglePeriod(unpaid.first);
      }
      _parsePacketPrice();
    });
  }

  @override
  void dispose() {
    _descController.dispose();
    _amountController.dispose();
    super.dispose();
  }

  // Extracts packet price dynamically (e.g., "Family 50Mbps Rp 150.000" -> 150000)
  void _parsePacketPrice() {
    try {
      final priceMatch = RegExp(r'Rp\s?([\d.,]+)').firstMatch(widget.customer.packet);
      if (priceMatch != null) {
        final numericString = priceMatch.group(1)!.replaceAll('.', '').replaceAll(',', '');
        _customAmount = double.parse(numericString);
        _amountController.text = _customAmount.toStringAsFixed(0);
      } else {
        _customAmount = 150000.00; // Standard ISP default
        _amountController.text = "150000";
      }
    } catch (_) {
      _customAmount = 150000.00;
      _amountController.text = "150000";
    }
  }

  void _handlePay() async {
    final provider = Provider.of<AppProvider>(context, listen: false);
    
    // Safety check for redundant payments
    if (_selectedCategory == "Tagihan Bulanan" && provider.selectedPeriods.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text("Pilih minimal 1 bulan layanan yang akan dibayar!"), backgroundColor: Colors.amber),
      );
      return;
    }

    final double singleMonthAmount = double.tryParse(_amountController.text) ?? _customAmount;
    final int selectedMonthsCount = _selectedCategory == "Tagihan Bulanan" ? provider.selectedPeriods.length : 1;
    final double computedTotal = singleMonthAmount * selectedMonthsCount;

    final confirmMess = _selectedCategory == "Tagihan Bulanan" 
        ? "Konfirmasi menerima pembayaran tagihan bulanan untuk periode [${provider.selectedPeriods.join(', ')}] sebesar Rp ${NumberFormat.decimalPattern('id_ID').format(computedTotal)}?"
        : "Konfirmasi menerima pembayaran ${_selectedCategory} sebesar Rp ${NumberFormat.decimalPattern('id_ID').format(computedTotal)}?";

    final confirm = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: Text("Konfirmasi Pembayaran", style: GoogleFonts.spaceGrotesk(fontWeight: FontWeight.bold)),
        content: Text(confirmMess),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context, false), child: const Text("Batal")),
          ElevatedButton(
            onPressed: () => Navigator.pop(context, true),
            style: ElevatedButton.styleFrom(backgroundColor: Colors.emerald),
            child: const Text("Ya, Terima Uang"),
          ),
        ],
      ),
    );

    if (confirm != true) return;

    setState(() => _isSaving = true);

    try {
      // 1. Dual validation context checking before completing transaction
      if (_selectedCategory == "Tagihan Bulanan") {
        final paidList = widget.customer.paid_months ?? '';
        final List<String> arrPaid = paidList.split(',').map((p) => p.trim()).toList();
        
        for (var p in provider.selectedPeriods) {
          if (arrPaid.contains(p)) {
            throw Exception("SALAH: Periode bulan $p terdeteksi sudah Lunas di data lokal! Pembayaran duplikat ditolak.");
          }
        }
      }

      // 2. Perform SQLite write
      final periodsJoined = provider.selectedPeriods.join(',');
      final Transaction recorded = await provider.recordTransaction(
        customerId: widget.customer.id,
        customerName: widget.customer.name,
        amount: computedTotal,
        category: _selectedCategory,
        description: _descController.text.trim().isEmpty ? "Pembayaran $_selectedCategory" : _descController.text.trim(),
        selectedPeriodsString: periodsJoined,
      );

      _descController.clear();
      _parsePacketPrice();
      provider.clearSelectedPeriods();

      if (!mounted) return;
      
      // 3. Propose thermal print
      _proposePrint(recorded);

    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(e.toString().replaceAll("Exception: ", "")),
          backgroundColor: Colors.redAccent,
          duration: const Duration(seconds: 4),
        ),
      );
    } finally {
      setState(() => _isSaving = false);
    }
  }

  void _proposePrint(Transaction tx) async {
    final printerAvail = PrinterService.instance.isConnected;
    
    if (!printerAvail) {
      final selectPrinter = await showDialog<bool>(
        context: context,
        builder: (context) => const BluetoothPrinterSelectionDialog(),
      );
      if (selectPrinter != true) return;
    }

    // Attempt print
    try {
      final appSettings = Provider.of<AppProvider>(context, listen: false).settings ?? 
          AppSettings(companyName: "ISP NETWORK", companyAddress: "Alamat Kantor", companyPhone: "081-XX", receiptFooter: "Bukti Sah.");
          
      await PrinterService.instance.printReceipt(
        transaction: tx,
        settings: appSettings,
        customerName: widget.customer.name,
        collectorName: tx.collectorName ?? "Petugas",
      );
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text("Gagal cetak, periksa Bluetooth printer: ${e.toString()}"),
          backgroundColor: Colors.amber,
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final provider = Provider.of<AppProvider>(context);
    final currencyFormat = NumberFormat.currency(locale: 'id_ID', symbol: 'Rp ', decimalDigits: 0);
    
    final unpaidMonths = provider.getUnpaidMonthsList(widget.customer, provider.viewMonthsAhead);

    final double singleMonthAmount = double.tryParse(_amountController.text) ?? _customAmount;
    final int selectedMonthsCount = _selectedCategory == "Tagihan Bulanan" ? provider.selectedPeriods.length : 1;
    final double calculatedTotal = singleMonthAmount * selectedMonthsCount;

    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        title: Text("Profil Pelanggan", style: GoogleFonts.spaceGrotesk(color: const Color(0xFF1E293B), fontWeight: FontWeight.bold)),
        backgroundColor: Colors.white,
        elevation: 0,
        iconTheme: const IconThemeData(color: Color(0xFF1E293B)),
      ),
      body: _isSaving 
          ? const Center(child: SpinKitFadingCube(color: Colors.indigo, size: 40))
          : SingleChildScrollView(
              padding: const EdgeInsets.all(20.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  // 1. INFO CARD
                  Container(
                    padding: const EdgeInsets.all(24),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(28),
                      border: Border.all(color: const Color(0xFFE2E8F0)),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            Container(
                              padding: const EdgeInsets.all(12),
                              decoration: BoxDecoration(color: Colors.indigo[50], shape: BoxShape.circle),
                              child: const Icon(Icons.person_pin, color: Colors.indigo, size: 28),
                            ),
                            const SizedBox(width: 14),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    widget.customer.name,
                                    style: GoogleFonts.spaceGrotesk(fontWeight: FontWeight.bold, fontSize: 18, color: const Color(0xFF1E293B)),
                                  ),
                                  const SizedBox(height: 2),
                                  Text(
                                    "ID Pelanggan: #${widget.customer.id}",
                                    style: GoogleFonts.jetBrainsMono(fontSize: 10, color: const Color(0xFF94A3B8), fontWeight: FontWeight.bold),
                                  ),
                                ],
                              ),
                            )
                          ],
                        ),
                        const Divider(height: 32, color: Color(0xFFF1F5F9)),
                        
                        // Address Block
                        Row(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Icon(Icons.location_on_outlined, size: 14, color: Color(0xFF64748B)),
                            const SizedBox(width: 8),
                            Expanded(
                              child: Text(
                                widget.customer.address,
                                style: GoogleFonts.inter(fontSize: 12, color: const Color(0xFF334155), fontWeight: FontWeight.medium),
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 10),
                        
                        // Phone block
                        Row(
                          children: [
                            const Icon(Icons.phone_outlined, size: 14, color: Color(0xFF64748B)),
                            const SizedBox(width: 8),
                            Text(
                              widget.customer.phone.isEmpty ? "Tidak ada telepon" : widget.customer.phone,
                              style: GoogleFonts.inter(fontSize: 12, color: const Color(0xFF334155), fontWeight: FontWeight.bold),
                            ),
                          ],
                        ),
                        const SizedBox(height: 10),

                        // Packet Block
                        Row(
                          children: [
                            const Icon(Icons.speed_outlined, size: 14, color: Color(0xFF64748B)),
                            const SizedBox(width: 8),
                            Expanded(
                              child: Text(
                                "Paket: ${widget.customer.packet}",
                                style: GoogleFonts.inter(fontSize: 12, color: Colors.indigo, fontWeight: FontWeight.bold),
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 28),

                  // 2. TRANSACTION TYPE SWITCH (Tabs)
                  Row(
                    children: [
                      Expanded(
                        child: GestureDetector(
                          onTap: () => setState(() => _selectedCategory = "Tagihan Bulanan"),
                          child: Container(
                            alignment: Alignment.center,
                            padding: const EdgeInsets.symmetric(vertical: 14),
                            decoration: BoxDecoration(
                              color: _selectedCategory == "Tagihan Bulanan" ? Colors.indigoAccent : Colors.white,
                              borderRadius: BorderRadius.circular(16),
                              border: Border.all(color: _selectedCategory == "Tagihan Bulanan" ? Colors.indigoAccent : const Color(0xFFE2E8F0)),
                            ),
                            child: Text(
                              "TAGIHAN BULANAN",
                              style: GoogleFonts.spaceGrotesk(
                                fontSize: 11,
                                fontWeight: FontWeight.black,
                                color: _selectedCategory == "Tagihan Bulanan" ? Colors.white : const Color(0xFF64748B),
                              ),
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: GestureDetector(
                          onTap: () => setState(() => _selectedCategory = "Biaya Lainnya"),
                          child: Container(
                            alignment: Alignment.center,
                            padding: const EdgeInsets.symmetric(vertical: 14),
                            decoration: BoxDecoration(
                              color: _selectedCategory != "Tagihan Bulanan" ? Colors.indigoAccent : Colors.white,
                              borderRadius: BorderRadius.circular(16),
                              border: Border.all(color: _selectedCategory != "Tagihan Bulanan" ? Colors.indigoAccent : const Color(0xFFE2E8F0)),
                            ),
                            child: Text(
                              "BIAYA LAINNYA",
                              style: GoogleFonts.spaceGrotesk(
                                fontSize: 11,
                                fontWeight: FontWeight.black,
                                color: _selectedCategory != "Tagihan Bulanan" ? Colors.white : const Color(0xFF64748B),
                              ),
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 24),

                  // 3. SERVICE PERIOD CHOOSER (Month Selection for Monthly Bills)
                  if (_selectedCategory == "Tagihan Bulanan") ...[
                    Row(
                      mainAxisAlignment: MainAxisAlignment.between,
                      children: [
                        Text(
                          "PILIH BULAN LAYANAN",
                          style: GoogleFonts.inter(fontSize: 10, fontWeight: FontWeight.w900, color: const Color(0xFF64748B), letterSpacing: 1.2),
                        ),
                        // Arrears trigger button
                        TextButton.icon(
                          onPressed: () => provider.selectArrearsOnly(widget.customer),
                          icon: const Icon(Icons.filter_list, size: 12, color: Colors.rose),
                          label: Text("HANYA TUNGGAKAN", style: GoogleFonts.spaceGrotesk(fontSize: 9, fontWeight: FontWeight.black, color: Colors.rose)),
                        )
                      ],
                    ),
                    const SizedBox(height: 8),

                    if (unpaidMonths.isEmpty) ...[
                      // Lunas total card
                      Container(
                        padding: const EdgeInsets.all(20),
                        decoration: BoxDecoration(color: const Color(0xFFECFDF5), borderRadius: BorderRadius.circular(20), border: Border.all(color: const Color(0xFFA7F3D0))),
                        child: Row(
                          children: [
                            const Icon(Icons.check_circle, color: Color(0xFF059669)),
                            const SizedBox(width: 12),
                            Expanded(
                              child: Text(
                                "Pelanggan Lunas Total untuk limit waktu display saat ini.",
                                style: GoogleFonts.inter(fontSize: 12, color: const Color(0xFF047857), fontWeight: FontWeight.bold),
                              ),
                            )
                          ],
                        ),
                      ),
                    ] else ...[
                      // Months Wrap List
                      Wrap(
                        spacing: 8,
                        runSpacing: 8,
                        children: unpaidMonths.map((month) {
                          final isSelected = provider.selectedPeriods.contains(month);
                          return ChoiceChip(
                            label: Text(
                              month,
                              style: GoogleFonts.jetBrainsMono(
                                fontWeight: FontWeight.w900,
                                fontSize: 11,
                                color: isSelected ? Colors.white : const Color(0xFF1E293B),
                              ),
                            ),
                            selected: isSelected,
                            selectedColor: Colors.slate[900],
                            backgroundColor: Colors.white,
                            onSelected: (_) => provider.togglePeriod(month),
                            elevation: 0,
                            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide(color: isSelected ? Colors.slate[950]! : const Color(0xFFE2E8F0))),
                          );
                        }).toList(),
                      ),
                    ]
                  ] else ...[
                    // Custom non-billing layout picker
                    Text(
                      "KATEGORI PENERIMAAN",
                      style: GoogleFonts.inter(fontSize: 10, fontWeight: FontWeight.w900, color: const Color(0xFF64748B), letterSpacing: 1.2),
                    ),
                    const SizedBox(height: 10),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 16),
                      decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(16), border: Border.all(color: const Color(0xFFE2E8F0))),
                      child: DropdownButtonHideUnderline(
                        child: DropdownButton<String>(
                          value: _selectedCategory == "Biaya Lainnya" ? "Voucher" : _selectedCategory,
                          isExpanded: true,
                          style: GoogleFonts.inter(fontWeight: FontWeight.bold, color: const Color(0xFF1E293B)),
                          onChanged: (newValue) {
                            if (newValue != null) {
                              setState(() => _selectedCategory = newValue);
                            }
                          },
                          items: <String>['Voucher', 'Pemasangan Baru', 'Denda', 'Lainnya']
                              .map<DropdownMenuItem<String>>((value) {
                            return DropdownMenuItem<String>(
                              value: value,
                              child: Text(value),
                            );
                          }).toList(),
                        ),
                      ),
                    ),
                    const SizedBox(height: 20),
                    
                    // Custom description
                    Text(
                      "DESKRIPSI (OPSIONAL)",
                      style: GoogleFonts.inter(fontSize: 10, fontWeight: FontWeight.w900, color: const Color(0xFF64748B)),
                    ),
                    const SizedBox(height: 8),
                    TextField(
                      controller: _descController,
                      style: GoogleFonts.inter(fontWeight: FontWeight.semibold),
                      decoration: InputDecoration(
                        hintText: "cth: Upgrade bandwith atau denda kabel putus",
                        filled: true,
                        fillColor: Colors.white,
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(16), borderSide: const BorderSide(color: Color(0xFFE2E8F0))),
                      ),
                    ),
                  ],
                  const SizedBox(height: 28),

                  // 4. AMOUNT TO BE CHARGED
                  Text(
                    "NOMINAL BIAYA / BULAN",
                    style: GoogleFonts.inter(fontSize: 10, fontWeight: FontWeight.w900, color: const Color(0xFF64748B)),
                  ),
                  const SizedBox(height: 8),
                  TextField(
                    controller: _amountController,
                    keyboardType: TextInputType.number,
                    style: GoogleFonts.jetBrainsMono(fontWeight: FontWeight.black, fontSize: 16, color: Colors.indigoAccent),
                    decoration: InputDecoration(
                      prefixText: "Rp ",
                      prefixStyle: GoogleFonts.jetBrainsMono(fontWeight: FontWeight.bold, color: Colors.indigo),
                      filled: true,
                      fillColor: Colors.white,
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(16), borderSide: const BorderSide(color: Color(0xFFE2E8F0))),
                    ),
                  ),
                  const SizedBox(height: 32),

                  // 5. SUMMARIZED PAYMENT RECEIPT (What months paid, total price)
                  Container(
                    padding: const EdgeInsets.all(22),
                    decoration: BoxDecoration(
                      color: const Color(0xFF0F172A), // Slate 900
                      borderRadius: BorderRadius.circular(24),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        Text(
                          "PULPAD / STRUK RINGKASAN",
                          style: GoogleFonts.jetBrainsMono(fontWeight: FontWeight.bold, fontSize: 9, color: Colors.indigo[200], letterSpacing: 1.5),
                        ),
                        const SizedBox(height: 14),
                        Row(
                          mainAxisAlignment: MainAxisAlignment.between,
                          children: [
                            Text("ITEM KAS", style: GoogleFonts.inter(fontSize: 11, color: const Color(0xFF94A3B8), fontWeight: FontWeight.bold)),
                            Text(_selectedCategory, style: GoogleFonts.inter(fontSize: 11, color: Colors.white, fontWeight: FontWeight.black)),
                          ],
                        ),
                        
                        // Detail months
                        if (_selectedCategory == "Tagihan Bulanan" && provider.selectedPeriods.isNotEmpty) ...[
                          const SizedBox(height: 10),
                          Row(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            mainAxisAlignment: MainAxisAlignment.between,
                            children: [
                              Text("BULAN DI-BAYAR", style: GoogleFonts.inter(fontSize: 11, color: const Color(0xFF94A3B8), fontWeight: FontWeight.bold)),
                              Expanded(
                                child: Text(
                                  provider.selectedPeriods.join(', '),
                                  textAlign: TextAlign.end,
                                  style: GoogleFonts.jetBrainsMono(fontSize: 10, color: Colors.amber, fontWeight: FontWeight.bold),
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 4),
                          Row(
                            mainAxisAlignment: MainAxisAlignment.between,
                            children: [
                              Text("BANYAK BULAN", style: GoogleFonts.inter(fontSize: 11, color: const Color(0xFF94A3B8), fontWeight: FontWeight.bold)),
                              Text("${provider.selectedPeriods.length} Bulan", style: GoogleFonts.inter(fontSize: 11, color: Colors.white, fontWeight: FontWeight.black)),
                            ],
                          ),
                        ],
                        const Padding(
                          padding: EdgeInsets.symmetric(vertical: 14.0),
                          child: Divider(color: Color(0xFF1E293B)),
                        ),
                        
                        Row(
                          mainAxisAlignment: MainAxisAlignment.between,
                          children: [
                            Text("TOTAL TERIMA KAS", style: GoogleFonts.spaceGrotesk(fontSize: 12, color: Colors.white, fontWeight: FontWeight.w900, letterSpacing: 1)),
                            Text(
                              currencyFormat.format(calculatedTotal),
                              style: GoogleFonts.jetBrainsMono(fontSize: 16, color: Colors.emeraldAccent, fontWeight: FontWeight.black),
                            ),
                          ],
                        )
                      ],
                    ),
                  ),
                  const SizedBox(height: 32),

                  // 6. ACTION BLUE RECEIPT SUBMISSION
                  SizedBox(
                    height: 58,
                    child: ElevatedButton.icon(
                      onPressed: _handlePay,
                      icon: const Icon(Icons.check_circle, size: 18),
                      label: Text(
                        _selectedCategory == "Tagihan Bulanan"
                            ? "CATAT BAYAR & CETAK RESI"
                            : "SIMPAN TRANSAKSI TUNAI",
                        style: GoogleFonts.spaceGrotesk(fontSize: 13, fontWeight: FontWeight.black),
                      ),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFF10B981), // Emerald 500
                        foregroundColor: Colors.white,
                        elevation: 4,
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(18)),
                      ),
                    ),
                  )
                ],
              ),
            ),
    );
  }
}

// Dialog to let user easily select and connect paired thermal bluetooth printers
class BluetoothPrinterSelectionDialog extends StatefulWidget {
  const BluetoothPrinterSelectionDialog({Key? key}) : super(key: key);

  @override
  _BluetoothPrinterSelectionDialogState createState() => _BluetoothPrinterSelectionDialogState();
}

class _BluetoothPrinterSelectionDialogState extends State<BluetoothPrinterSelectionDialog> {
  List<bt.BluetoothDevice> _devices = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _fetchDevices();
  }

  void _fetchDevices() async {
    final list = await PrinterService.instance.getPairedDevices();
    setState(() {
      _devices = list;
      _loading = false;
    });
  }

  void _handleConnect(bt.BluetoothDevice d) async {
    setState(() => _loading = true);
    final success = await PrinterService.instance.connect(d);
    if (!mounted) return;
    
    if (success) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text("Tersambung ke printer: ${d.name}"), backgroundColor: Colors.emerald),
      );
      Navigator.pop(context, true);
    } else {
      setState(() => _loading = false);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text("Gagal tersambung ke printer: ${d.name}"), backgroundColor: Colors.rose),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: Text("Hubungkan Printer Bluetooth", style: GoogleFonts.spaceGrotesk(fontWeight: FontWeight.bold, fontSize: 16)),
      content: _loading
          ? const SizedBox(
              height: 120,
              child: Center(child: SpinKitThreeBounce(color: Colors.indigo, size: 24)),
            )
          : _devices.isEmpty
              ? Container(
                  height: 100,
                  alignment: Alignment.center,
                  child: const Text("Tidak ada device printer berpasangan (paired). Hubungkan di settings Bluetooth HP Anda dahulu.", textAlign: TextAlign.center, style: TextStyle(fontSize: 12)),
                )
              : SizedBox(
                  width: double.maxFinite,
                  child: ListView.builder(
                    shrinkWrap: true,
                    itemCount: _devices.length,
                    itemBuilder: (context, i) {
                      final d = _devices[i];
                      return ListTile(
                        leading: const Icon(Icons.print, color: Colors.indigoAccent),
                        title: Text(d.name ?? "Device Tanpa Nama", style: GoogleFonts.inter(fontWeight: FontWeight.bold, fontSize: 13)),
                        subtitle: Text(d.address ?? ""),
                        onTap: () => _handleConnect(d),
                      );
                    },
                  ),
                ),
      actions: [
        TextButton(onPressed: () => Navigator.pop(context, false), child: const Text("Lewati / Lewat PDF")),
      ],
    );
  }
}
