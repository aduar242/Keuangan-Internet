import React, { useState, useEffect } from 'react';
import { Printer, X, Download } from 'lucide-react';
import { motion } from 'motion/react';
import { DepositReceiptState, AppSettings } from '../types';

export default function DepositReceiptModal({ 
  receipt, 
  settings, 
  onClose 
}: { 
  receipt: DepositReceiptState, 
  settings: AppSettings | null, 
  onClose: () => void 
}) {
  const [details, setDetails] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDetails = async () => {
       try {
         const res = await fetch(`/api/deposits/details?date=${receipt.date}&collector_id=${receipt.collector_id}`, {
            headers: { 'x-user-id': String(receipt.collector_id) }
         });
         if (res.ok) setDetails(await res.json());
       } catch (err) {
         console.error(err);
       } finally {
         setLoading(false);
       }
    };
    fetchDetails();
  }, [receipt]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm print:hidden" 
      />
      
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className="relative bg-white w-full max-w-sm rounded-[2rem] shadow-2xl overflow-hidden print:shadow-none print:rounded-none print:w-[80mm] print:absolute print:left-0 print:top-0"
      >
        <div className="p-4 bg-slate-50 border-b border-slate-100 flex justify-between items-center print:hidden">
          <h3 className="font-bold text-slate-800 text-sm">Pratinjau Struk Setoran</h3>
          <button onClick={onClose} className="w-8 h-8 flex flex-col items-center justify-center bg-white rounded-full text-slate-400 hover:text-slate-600 shadow-sm"><X className="w-4 h-4" /></button>
        </div>

         <div id="deposit-receipt" className="p-6 bg-white shrink-0 mx-auto text-slate-800 flex flex-col" style={{ width: '80mm', maxHeight: 'none' }}>
          <div className="text-center mb-6 border-b border-dashed border-slate-300 pb-4 shrink-0">
             <h2 className="font-black text-xl tracking-tight leading-tight uppercase">{settings?.company_name || 'ISP NETWORK'}</h2>
             <p className="text-[10px] font-bold mt-1 text-slate-500">{settings?.company_address || 'Alamat tidak diatur'}</p>
             <p className="text-[10px] font-bold text-slate-500">{settings?.company_phone || 'No Telp'}</p>
          </div>

          <div className="mb-4 shrink-0">
             <h3 className="font-black text-lg text-center uppercase tracking-widest border-b-2 border-slate-800 pb-1 inline-block border-dashed">BUKTI SETORAN</h3>
          </div>

          <div className="space-y-1 mb-6 text-xs font-bold font-mono shrink-0">
            <div className="flex justify-between"><span>TANGGAL</span><span>{receipt.date}</span></div>
            <div className="flex justify-between"><span>PETUGAS</span><span>{receipt.collector_name}</span></div>
            <div className="flex justify-between"><span>STATUS</span><span>BERHASIL / DITERIMA</span></div>
          </div>

          <div className="border-t border-dashed border-slate-300 pt-4 mb-4 flex-1 flex flex-col min-h-0">
             <p className="text-[10px] font-black uppercase text-center mb-2 shrink-0">Rincian Transaksi Pelanggan</p>
             {loading ? <p className="text-xs text-center p-4">Memuat...</p> : (
               <div className="space-y-3 text-[10px] font-mono overflow-y-auto print:overflow-visible flex-1 pr-1 custom-scrollbar max-h-[40vh] print:max-h-none">
                 {details.map((d, i) => {
                    let periods = [];
                    if (d.category === 'Tagihan Bulanan' && d.billing_period) {
                       periods = d.billing_period.split(',').map((p: string) => p.trim());
                    }
                    return (
                       <div key={i} className="flex flex-col border-b border-dashed border-slate-100 pb-2 last:border-0 last:pb-0">
                         <div className="flex justify-between items-start mb-1">
                           <span className="font-bold flex-1 pr-2">{d.customer_name || d.category}</span>
                           <span className="font-black whitespace-nowrap">Rp {d.amount.toLocaleString()}</span>
                         </div>
                         {periods.length > 0 && (
                           <div className="text-[9px] text-slate-500 font-bold mb-1">
                              Bulan: {periods.join(', ')}
                           </div>
                         )}
                         <span className="text-[8px] text-slate-400">{d.transaction_date}</span>
                       </div>
                    );
                 })}
               </div>
             )}
          </div>

          <div className="border-t border-dashed border-slate-300 pt-4 mb-8 shrink-0">
            <div className="flex justify-between items-center bg-slate-50 p-2 rounded">
              <span className="text-xs font-black uppercase tracking-widest">TOTAL SETOR</span>
              <span className="text-sm font-black tabular-nums">Rp {receipt.total_amount.toLocaleString()}</span>
            </div>
          </div>
          
          <div className="text-center shrink-0">
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Terima Kasih</p>
            <p className="text-[8px] font-medium text-slate-400 mt-1">{new Date().toLocaleString()}</p>
          </div>
        </div>

        <div className="p-4 bg-slate-50 border-t border-slate-100 flex gap-2 print:hidden shrink-0">
           <button onClick={handlePrint} className="flex-1 bg-indigo-600 text-white font-black py-4 rounded-xl shadow-lg shadow-indigo-200 active:scale-95 transition-all text-xs uppercase tracking-widest flex items-center justify-center gap-2">
             <Printer className="w-4 h-4" /> Cetak
           </button>
        </div>
      </motion.div>

      <style>{`
        @media print {
          body * { visibility: hidden; }
          #deposit-receipt, #deposit-receipt * { visibility: visible; }
          #deposit-receipt { 
            position: absolute; 
            left: 0; 
            top: 0; 
            width: 80mm !important; 
            margin: 0 !important; 
            padding: 4mm !important;
          }
        }
      `}</style>
    </div>
  );
}
