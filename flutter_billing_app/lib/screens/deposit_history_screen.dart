import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';
import 'package:flutter_spinkit/flutter_spinkit.dart';
import '../models/models.dart';
import '../providers/app_provider.dart';

class DepositHistoryScreen extends StatefulWidget {
  const DepositHistoryScreen({Key? key}) : super(key: key);

  @override
  _DepositHistoryScreenState createState() => _DepositHistoryScreenState();
}

class _DepositHistoryScreenState extends State<DepositHistoryScreen> {
  @override
  Widget build(BuildContext context) {
    final provider = Provider.of<AppProvider>(context);
    final currencyFormat = NumberFormat.currency(locale: 'id_ID', symbol: 'Rp ', decimalDigits: 0);

    // Group local cache transactions categorized by date for detailed audit
    final transactions = provider.localTransactions;

    // Filter payments transactions
    final paymentTransactions = transactions.where((t) => t.type == 'pemasukan').toList();

    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        title: Text(
          "Audit & Rincian Transaksi",
          style: GoogleFonts.spaceGrotesk(color: const Color(0xFF1E293B), fontWeight: FontWeight.bold, fontSize: 16),
        ),
        backgroundColor: Colors.white,
        elevation: 0,
        iconTheme: const IconThemeData(color: Color(0xFF1E293B)),
      ),
      body: paymentTransactions.isEmpty
          ? Center(
              child: Padding(
                padding: const EdgeInsets.all(40.0),
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(Icons.receipt_long, size: 48, color: Colors.slate[200]),
                    const SizedBox(height: 12),
                    Text(
                      "Belum Ada Pembayaran Dicatat",
                      style: GoogleFonts.spaceGrotesk(fontWeight: FontWeight.bold, color: const Color(0xFF64748B)),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      "Lakukan penagihan rumah ke rumah untuk menampung riwayat di sini.",
                      textAlign: TextAlign.center,
                      style: GoogleFonts.inter(fontSize: 11, color: const Color(0xFF94A3B8)),
                    ),
                  ],
                ),
              ),
            )
          : ListView.builder(
              padding: const EdgeInsets.all(20.0),
              itemCount: paymentTransactions.length,
              itemBuilder: (context, i) {
                final tx = paymentTransactions[i];
                final isOfflinePending = tx.status == 'pending';
                final isWaitingConfirm = tx.status == 'deposited';
                
                Color statusColor = Colors.emerald;
                String statusLabel = "Diterima Admin";
                if (isOfflinePending) {
                  statusColor = Colors.amber;
                  statusLabel = "Offline (Pending Sync)";
                } else if (isWaitingConfirm) {
                  statusColor = Colors.indigoAccent;
                  statusLabel = "Menunggu Terima Admin";
                }

                return Card(
                  elevation: 0,
                  margin: const EdgeInsets.only(bottom: 14),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(20),
                    border: Border.all(color: const Color(0xFFE2E8F0)),
                  ),
                  child: ExpansionTile(
                    tilePadding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
                    childrenPadding: const EdgeInsets.all(20),
                    expandedAlignment: Alignment.topLeft,
                    title: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            Container(
                              width: 6,
                              height: 6,
                              decoration: BoxDecoration(color: statusColor, shape: BoxShape.circle),
                            ),
                            const SizedBox(width: 6),
                            Text(
                              statusLabel.toUpperCase(),
                              style: GoogleFonts.jetBrainsMono(
                                fontWeight: FontWeight.black,
                                fontSize: 8,
                                color: statusColor,
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 8),
                        Text(
                          tx.customerName ?? tx.category,
                          style: GoogleFonts.spaceGrotesk(
                            fontWeight: FontWeight.bold,
                            fontSize: 14,
                            color: const Color(0xFF1E293B),
                          ),
                        ),
                      ],
                    ),
                    trailing: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      crossAxisAlignment: CrossAxisAlignment.end,
                      children: [
                        Text(
                          currencyFormat.format(tx.amount),
                          style: GoogleFonts.jetBrainsMono(
                            fontWeight: FontWeight.black,
                            fontSize: 13,
                            color: Colors.indigo[900],
                          ),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          tx.transactionDate,
                          style: GoogleFonts.inter(fontSize: 10, color: const Color(0xFF94A3B8)),
                        ),
                      ],
                    ),
                    children: [
                      // Rincian Pembayaran Antara Pelanggan dan Penagih
                      Text(
                        "RINCIAN TRANSAKSI PENAGIHAN",
                        style: GoogleFonts.jetBrainsMono(
                          fontSize: 9,
                          fontWeight: FontWeight.w900,
                          color: const Color(0xFF94A3B8),
                          letterSpacing: 1,
                        ),
                      ),
                      const SizedBox(height: 14),
                      _buildDetailRow("Pelanggan", tx.customerName ?? "-"),
                      _buildDetailRow("Tipe Penerimaan", tx.category),
                      if (tx.billingPeriod != null && tx.billingPeriod!.isNotEmpty)
                        _buildDetailRow("Bulan Di-Bayar", tx.billingPeriod!),
                      _buildDetailRow("Tanggal Penagihan", tx.transactionDate),
                      _buildDetailRow("Keterangan", tx.description.isEmpty ? "-" : tx.description),
                      _buildDetailRow("Penagih Lapangan", tx.collectorName ?? "Petugas"),
                      const Divider(height: 24, color: Color(0xFFF1F5F9)),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.between,
                        children: [
                          Text(
                            "TOTAL DITOTALKAN",
                            style: GoogleFonts.spaceGrotesk(fontWeight: FontWeight.bold, fontSize: 11),
                          ),
                          Text(
                            currencyFormat.format(tx.amount),
                            style: GoogleFonts.jetBrainsMono(
                              fontWeight: FontWeight.black,
                              fontSize: 14,
                              color: Colors.emerald[700],
                            ),
                          ),
                        ],
                      )
                    ],
                  ),
                );
              },
            ),
    );
  }

  Widget _buildDetailRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8.0),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 120,
            child: Text(
              label,
              style: GoogleFonts.inter(fontSize: 11, color: const Color(0xFF64748B), fontWeight: FontWeight.bold),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Text(
              value,
              style: GoogleFonts.inter(fontSize: 11, color: const Color(0xFF1E293B), fontWeight: FontWeight.bold),
            ),
          )
        ],
      ),
    );
  }
}
