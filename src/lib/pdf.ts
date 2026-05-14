import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { Transaction, Customer } from '../types';

// Add type for autotable
declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
  }
}

export const generateInvoicePDF = (customer: Customer, transaction: Transaction, userName: string) => {
  const doc = new jsPDF();
  const date = new Date().toLocaleDateString('id-ID');

  // Header
  doc.setFontSize(22);
  doc.setTextColor(79, 70, 229); // Indigo-600
  doc.text('RT/RW NET INVOICE', 105, 20, { align: 'center' });
  
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text('Kuitansi Resmi Pembayaran Internet', 105, 28, { align: 'center' });

  // Invoice Details
  doc.setDrawColor(200);
  doc.line(15, 35, 195, 35);

  doc.setFontSize(12);
  doc.setTextColor(0);
  doc.setFont('helvetica', 'bold');
  doc.text('INFO PELANGGAN', 15, 45);
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Nama: ${customer.name}`, 15, 52);
  doc.text(`Alamat: ${customer.address || '-'}`, 15, 57);
  doc.text(`Paket: ${customer.packet}`, 15, 62);

  doc.setFont('helvetica', 'bold');
  doc.text('INFO TRANSAKSI', 120, 45);
  doc.setFont('helvetica', 'normal');
  doc.text(`No. Ref: #TRX-${transaction.id}`, 120, 52);
  doc.text(`Tanggal: ${transaction.transaction_date}`, 120, 57);
  doc.text(`Petugas: ${userName}`, 120, 62);

  // Table
  doc.autoTable({
    startY: 75,
    head: [['Deskripsi', 'Periode', 'Jumlah']],
    body: [
      [
        transaction.category,
        transaction.billing_period || '-',
        `Rp ${transaction.amount.toLocaleString()}`
      ]
    ],
    headStyles: { fillColor: [79, 70, 229], textColor: 255, fontStyle: 'bold' },
    styles: { fontSize: 10, cellPadding: 5 },
    columnStyles: {
      2: { halign: 'right' }
    }
  });

  const finalY = (doc as any).lastAutoTable.finalY + 10;

  // Total
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('TOTAL PEMBAYARAN', 130, finalY + 10);
  doc.setTextColor(79, 70, 229);
  doc.text(`Rp ${transaction.amount.toLocaleString()}`, 195, finalY + 10, { align: 'right' });

  // Footer
  doc.setTextColor(150);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'italic');
  doc.text('Terima kasih telah melakukan pembayaran tepat waktu.', 105, finalY + 30, { align: 'center' });
  doc.text('Simpan invoice ini sebagai bukti bayar yang sah.', 105, finalY + 35, { align: 'center' });
  
  doc.setFont('helvetica', 'normal');
  doc.text(`Dicetak pada: ${date}`, 15, doc.internal.pageSize.height - 10);

  // Save the PDF
  doc.save(`Invoice_${customer.name}_${transaction.transaction_date}.pdf`);
};
