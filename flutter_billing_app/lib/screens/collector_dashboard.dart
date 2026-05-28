import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';
import 'package:flutter_spinkit/flutter_spinkit.dart';
import '../providers/app_provider.dart';
import 'customer_detail_screen.dart';
import 'deposit_history_screen.dart';
import 'login_screen.dart';

class CollectorDashboard extends StatefulWidget {
  const CollectorDashboard({Key? key}) : super(key: key);

  @override
  _CollectorDashboardState createState() => _CollectorDashboardState();
}

class _CollectorDashboardState extends State<CollectorDashboard> {
  String _searchQuery = "";
  final _searchController = TextEditingController();

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      Provider.of<AppProvider>(context, listen: false).syncData();
    });
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  void _handleLogout() async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: Text("Keluar Aplikasi", style: GoogleFonts.spaceGrotesk(fontWeight: FontWeight.bold)),
        content: const Text("Apakah Anda yakin ingin logout? Data cache lokal akan dihapus."),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context, false), child: const Text("Batal")),
          ElevatedButton(
            onPressed: () => Navigator.pop(context, true),
            style: ElevatedButton.styleFrom(backgroundColor: Colors.rose),
            child: const Text("Keluar"),
          ),
        ],
      ),
    );

    if (confirm == true) {
      final provider = Provider.of<AppProvider>(context, listen: false);
      await provider.logoutUser();
      if (!mounted) return;
      Navigator.pushReplacement(
        context,
        MaterialPageRoute(builder: (context) => const LoginScreen()),
      );
    }
  }

  void _handleDepositRequest() async {
    final provider = Provider.of<AppProvider>(context, listen: false);
    if (provider.heldBalance <= 0) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text("Saldo Anda Rp 0. Tidak ada yang perlu disetorkan."),
          backgroundColor: Colors.amber,
        ),
      );
      return;
    }

    final confirm = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: Text("Setor Kas Ke Admin", style: GoogleFonts.spaceGrotesk(fontWeight: FontWeight.bold)),
        content: Text("Buat pengajuan setoran tunai sebesar Rp ${NumberFormat.decimalPattern('id_ID').format(provider.heldBalance)} ke Admin?"),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context, false), child: const Text("Batal")),
          ElevatedButton(
            onPressed: () => Navigator.pop(context, true),
            style: ElevatedButton.styleFrom(backgroundColor: Colors.indigoAccent),
            child: const Text("Ajukan Sekarang"),
          ),
        ],
      ),
    );

    if (confirm == true) {
      try {
        await provider.requestDeposit();
        if (!mounted) return;
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text("Berhasil membuat pengajuan setoran! Status transaksi pending berubah: Menunggu Konfirmasi."),
            backgroundColor: Colors.emerald,
          ),
        );
      } catch (e) {
        if (!mounted) return;
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text("Gagal mengajukan: ${e.toString()}"),
            backgroundColor: Colors.rose,
          ),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final provider = Provider.of<AppProvider>(context);
    final currencyFormat = NumberFormat.currency(locale: 'id_ID', symbol: 'Rp ', decimalDigits: 0);

    // Filter customers list
    final filteredCustomers = provider.customers.where((c) {
      final nameMatch = c.name.toLowerCase().contains(_searchQuery.toLowerCase());
      final addrMatch = c.address.toLowerCase().contains(_searchQuery.toLowerCase());
      return nameMatch || addrMatch;
    }).toList();

    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC), // Off-white / zinc 50
      appBar: AppBar(
        title: Text(
          "ISP BILLING MOBILE",
          style: GoogleFonts.spaceGrotesk(fontWeight: FontWeight.w900, color: const Color(0xFF1E293B)),
        ),
        backgroundColor: Colors.white,
        elevation: 0,
        actions: [
          // Connection Status Beacon
          Container(
            margin: const EdgeInsets.symmetric(vertical: 16, horizontal: 8),
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
            decoration: BoxDecoration(
              color: provider.isOffline ? Colors.amber[50] : Colors.emerald[50],
              borderRadius: BorderRadius.circular(20),
              border: Border.all(color: provider.isOffline ? Colors.amber : Colors.emerald),
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Container(
                  width: 8,
                  height: 8,
                  decoration: BoxDecoration(
                    color: provider.isOffline ? Colors.amber : Colors.emerald,
                    shape: BoxShape.circle,
                  ),
                ),
                const SizedBox(width: 6),
                Text(
                  provider.isOffline ? "OFFLINE" : "ONLINE",
                  style: GoogleFonts.jetBrainsMono(
                    color: provider.isOffline ? Colors.amber[900] : Colors.emerald[950],
                    fontSize: 10,
                    fontWeight: FontWeight.w900,
                  ),
                ),
              ],
            ),
          ),
          IconButton(
            icon: const Icon(Icons.logout, color: Color(0xFFF43F5E)),
            onPressed: _handleLogout,
          )
        ],
      ),
      body: RefreshIndicator(
        onRefresh: () => provider.syncData(),
        child: SingleChildScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.all(20.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // 1. WELCOME CARD
              Row(
                children: [
                  CircleAvatar(
                    backgroundColor: Colors.indigo[100],
                    radius: 20,
                    child: Text(
                      provider.currentUser?.name.substring(0, 1).toUpperCase() ?? "P",
                      style: GoogleFonts.spaceGrotesk(fontWeight: FontWeight.black, color: Colors.indigo[950]),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        "Petugas Lapangan",
                        style: GoogleFonts.inter(fontSize: 10, color: const Color(0xFF64748B), fontWeight: FontWeight.bold),
                      ),
                      Text(
                        provider.currentUser?.name ?? "Penagih",
                        style: GoogleFonts.inter(fontSize: 15, color: const Color(0xFF1E293B), fontWeight: FontWeight.bold),
                      ),
                    ],
                  ),
                ],
              ),
              const SizedBox(height: 24),

              // 2. WIDE BANNER FOR HELD BALANCE (Uang yang Anda Pegang)
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(28.0),
                decoration: BoxDecoration(
                  gradient: const LinearGradient(
                    colors: [Color(0xFF4F46E5), Color(0xFF3730A3)], // Indigo 600 to 800
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                  ),
                  borderRadius: BorderRadius.circular(32),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.indigo.withOpacity(0.24),
                      blurRadius: 24,
                      offset: const Offset(0, 12),
                    )
                  ],
                ),
                child: Column(
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        const Icon(Icons.payments, color: Color(0xFFC7D2FE), size: 16),
                        const SizedBox(width: 8),
                        Text(
                          "UANG YANG ANDA PEGANG",
                          style: GoogleFonts.inter(
                            color: const Color(0xFFC7D2FE),
                            fontWeight: FontWeight.w900,
                            fontSize: 10,
                            letterSpacing: 1.5,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 10),
                    Text(
                      currencyFormat.format(provider.heldBalance),
                      style: GoogleFonts.spaceGrotesk(
                        color: Colors.white,
                        fontSize: 38,
                        fontWeight: FontWeight.w900,
                        letterSpacing: -1.5,
                      ),
                    ),
                    const SizedBox(height: 6),
                    Text(
                      "Setorkan uang ini ke admin kantor secepatnya",
                      style: GoogleFonts.inter(color: const Color(0xFF818CF8), fontSize: 10, fontWeight: FontWeight.bold),
                    ),
                    const SizedBox(height: 24),
                    
                    // Banner CTA Buttons
                    Row(
                      children: [
                        Expanded(
                          child: ElevatedButton.icon(
                            onPressed: _handleDepositRequest,
                            icon: const Icon(Icons.currency_exchange, size: 14),
                            label: const Text("SETOR KAS"),
                            style: ElevatedButton.styleFrom(
                              backgroundColor: Colors.white,
                              foregroundColor: const Color(0xFF4F46E5),
                              elevation: 0,
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                              padding: const EdgeInsets.symmetric(vertical: 14),
                              textStyle: GoogleFonts.spaceGrotesk(fontWeight: FontWeight.black, fontSize: 11),
                            ),
                          ),
                        ),
                        const SizedBox(width: 12),
                        Container(
                          decoration: BoxDecoration(
                            border: Border.all(color: Colors.white.withOpacity(0.2)),
                            borderRadius: BorderRadius.circular(16),
                          ),
                          child: IconButton(
                            icon: const Icon(Icons.receipt_long, color: Colors.white, size: 18),
                            onPressed: () {
                              Navigator.push(
                                context,
                                MaterialPageRoute(builder: (context) => const DepositHistoryScreen()),
                              );
                            },
                            tooltip: "Riwayat Setoran",
                          ),
                        )
                      ],
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 32),

              // 3. SET DISPLAY MONTHS LIMIT ("Tampilkan Bln Mendatang")
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(color: const Color(0xFFE2E8F0)),
                ),
                child: Row(
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            "Tampilkan Bln Mendatang",
                            style: GoogleFonts.inter(fontWeight: FontWeight.black, fontSize: 11, color: const Color(0xFF475569)),
                          ),
                          const SizedBox(height: 2),
                          Text(
                            "Mengatur visibilitas jatuh tempo",
                            style: GoogleFonts.inter(fontSize: 10, color: const Color(0xFF94A3B8)),
                          ),
                        ],
                      ),
                    ),
                    
                    // Plus minus controller
                    Row(
                      children: [
                        IconButton(
                          onPressed: () {
                            if (provider.viewMonthsAhead > 0) {
                              provider.setViewMonthsAhead(provider.viewMonthsAhead - 1);
                            }
                          },
                          icon: const Icon(Icons.remove_circle_outline, color: Color(0xFF64748B)),
                          constraints: const BoxConstraints(),
                          padding: EdgeInsets.zero,
                        ),
                        Padding(
                          padding: const EdgeInsets.symmetric(horizontal: 14.0),
                          child: Text(
                            "${provider.viewMonthsAhead}",
                            style: GoogleFonts.spaceGrotesk(fontWeight: FontWeight.black, color: Colors.indigo, fontSize: 16),
                          ),
                        ),
                        IconButton(
                          onPressed: () => provider.setViewMonthsAhead(provider.viewMonthsAhead + 1),
                          icon: const Icon(Icons.add_circle_outline, color: Color(0xFF64748B)),
                          constraints: const BoxConstraints(),
                          padding: EdgeInsets.zero,
                        ),
                      ],
                    )
                  ],
                ),
              ),
              const SizedBox(height: 32),

              // 4. SEARCH BOX
              Text(
                "DATA PELANGGAN",
                style: GoogleFonts.inter(
                  fontSize: 10,
                  fontWeight: FontWeight.w900,
                  color: const Color(0xFF64748B),
                  letterSpacing: 1.5,
                ),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: _searchController,
                onChanged: (val) => setState(() => _searchQuery = val),
                style: GoogleFonts.inter(fontWeight: FontWeight.semibold, fontSize: 14),
                decoration: InputDecoration(
                  prefixIcon: const Icon(Icons.search, color: Color(0xFF94A3B8)),
                  hintText: "Cari nama atau alamat...",
                  filled: true,
                  fillColor: Colors.white,
                  suffixIcon: _searchQuery.isNotEmpty
                      ? IconButton(
                          icon: const Icon(Icons.close, size: 16),
                          onPressed: () => setState(() {
                            _searchController.clear();
                            _searchQuery = "";
                          }),
                        )
                      : null,
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(16),
                    borderSide: const BorderSide(color: Color(0xFFE2E8F0)),
                  ),
                  enabledBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(16),
                    borderSide: const BorderSide(color: Color(0xFFE2E8F0)),
                  ),
                ),
              ),
              const SizedBox(height: 20),

              // LOADING OVERLAY
              if (provider.isLoading)
                const Padding(
                  padding: EdgeInsets.all(40.0),
                  child: Center(
                    child: SpinKitFadingCube(color: Colors.indigo, size: 32),
                  ),
                )
              else if (filteredCustomers.isEmpty)
                // EMPTY STATE
                Container(
                  padding: const EdgeInsets.all(40),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(24),
                  ),
                  child: Column(
                    children: [
                      Icon(Icons.people_outline, color: Colors.slate[200], size: 48),
                      const SizedBox(height: 12),
                      Text(
                        "Tidak Ada Pelanggan",
                        style: GoogleFonts.spaceGrotesk(fontWeight: FontWeight.bold, color: const Color(0xFF475569)),
                      ),
                      Text(
                        "Koneksi sedang bermasalah atau penagih tidak memiliki target.",
                        textAlign: TextAlign.center,
                        style: GoogleFonts.inter(fontSize: 11, color: const Color(0xFF94A3B8)),
                      ),
                    ],
                  ),
                )
              else
                // 5. CUSTOMERS LISTING
                ListView.separated(
                  shrinkWrap: true,
                  physics: const NeverScrollableScrollPhysics(),
                  itemCount: filteredCustomers.length,
                  separatorBuilder: (context, index) => const SizedBox(height: 14),
                  itemBuilder: (context, index) {
                    final customer = filteredCustomers[index];
                    final unpaid = provider.getUnpaidMonthsList(customer, provider.viewMonthsAhead);
                    final now = DateTime.now();
                    final currentMonthStr = "${now.year}-${now.month.toString().padLeft(2, '0')}";
                    final hasPastUnpaid = unpaid.any((p) => p.compareTo(currentMonthStr) <= 0);

                    // Choose dynamic badge matching layout requirements
                    Widget statusBadge;
                    if (unpaid.isEmpty) {
                      statusBadge = Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                        decoration: BoxDecoration(color: const Color(0xFFECFDF5), borderRadius: BorderRadius.circular(12)),
                        child: Text("LUNAS TOTAL", style: GoogleFonts.jetBrainsMono(color: const Color(0xFF059669), fontSize: 8, fontWeight: FontWeight.black)),
                      );
                    } else if (hasPastUnpaid) {
                      statusBadge = Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                        decoration: BoxDecoration(color: const Color(0xFFFEF2F2), borderRadius: BorderRadius.circular(12)),
                        child: Text("MENUNGGAK (${unpaid.length} Bln)", style: GoogleFonts.jetBrainsMono(color: const Color(0xFFDC2626), fontSize: 8, fontWeight: FontWeight.black)),
                      );
                    } else {
                      statusBadge = Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                        decoration: BoxDecoration(color: const Color(0xFFEEF2FF), borderRadius: BorderRadius.circular(12)),
                        child: Text("LUNAS BLN INI", style: GoogleFonts.jetBrainsMono(color: const Color(0xFF4F46E5), fontSize: 8, fontWeight: FontWeight.black)),
                      );
                    }

                    return GestureDetector(
                      onTap: () {
                        Navigator.push(
                          context,
                          MaterialPageRoute(
                            builder: (context) => CustomerDetailScreen(customer: customer),
                          ),
                        );
                      },
                      child: Container(
                        padding: const EdgeInsets.all(20),
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(24),
                          border: Border.all(color: const Color(0xFFF1F5F9)),
                          boxShadow: [
                            BoxShadow(
                              color: const Color(0xFF0F172A).withOpacity(0.02),
                              blurRadius: 10,
                              offset: const Offset(0, 4),
                            )
                          ],
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.stretch,
                          children: [
                            Row(
                              mainAxisAlignment: MainAxisAlignment.between,
                              children: [
                                statusBadge,
                                Text(
                                  customer.packet,
                                  style: GoogleFonts.jetBrainsMono(
                                    fontWeight: FontWeight.w900,
                                    color: const Color(0xFF64748B),
                                    fontSize: 10,
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 12),
                            Text(
                              customer.name,
                              style: GoogleFonts.spaceGrotesk(
                                fontSize: 16,
                                fontWeight: FontWeight.bold,
                                color: const Color(0xFF1E293B),
                              ),
                            ),
                            const SizedBox(height: 4),
                            Row(
                              children: [
                                const Icon(Icons.place, size: 12, color: Color(0xFF94A3B8)),
                                const SizedBox(width: 4),
                                Expanded(
                                  child: Text(
                                    customer.address,
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                    style: GoogleFonts.inter(fontSize: 11, color: const Color(0xFF64748B), fontWeight: FontWeight.bold),
                                  ),
                                ),
                              ],
                            ),
                            if (unpaid.isNotEmpty) ...[
                              const SizedBox(height: 12),
                              Container(
                                padding: const EdgeInsets.all(10),
                                decoration: BoxDecoration(
                                  color: const Color(0xFFF8FAFC),
                                  borderRadius: BorderRadius.circular(12),
                                ),
                                child: Text(
                                  "Belum Bayar: ${unpaid.join(', ')}",
                                  style: GoogleFonts.jetBrainsMono(fontSize: 9, fontWeight: FontWeight.bold, color: const Color(0xFFDC2626)),
                                ),
                              )
                            ]
                          ],
                        ),
                      ),
                    );
                  },
                )
            ],
          ),
        ),
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: () => provider.syncData(),
        backgroundColor: Colors.indigoAccent,
        child: const Icon(Icons.sync_alt, color: Colors.white),
      ),
    );
  }
}
