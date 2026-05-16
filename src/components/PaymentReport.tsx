import React, { useState, useEffect, useMemo } from 'react';
import { 
  ArrowLeft, 
  ArrowRightCircle, 
  CheckCircle, 
  X, 
  UserCheck, 
  FileText 
} from 'lucide-react';
import { motion } from 'motion/react';
import { User } from '../types';
import { cn, formatPeriod } from '../lib/utils';

export default function PaymentReport({ user, refreshTrigger }: { user: User, refreshTrigger?: number }) {
  const [data, setData] = useState<any[]>([]);
  const [months, setMonths] = useState<string[]>([]);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  useEffect(() => {
    const yearMonths = [];
    for (let i = 0; i < 12; i++) {
        const d = new Date(selectedYear, i, 1);
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        yearMonths.push(`${y}-${m}`);
    }
    setMonths(yearMonths);
  }, [selectedYear]);

  useEffect(() => {
    const fetchReport = async () => {
      try {
        const res = await fetch('/api/reports/payments', { headers: { 'x-user-id': String(user.id) } });
        if (res.ok) {
          setData(await res.json());
        }
      } catch (err) {
        console.error('Failed to fetch payment report:', err);
      }
    };
    fetchReport();
  }, [refreshTrigger, user.id]);

  const customersList = useMemo(() => Array.from(new Set(data.map(d => d.customer_name))).sort(), [data]);

  const paymentsByCustomerAndMonth = useMemo(() => {
    const index: Record<string, Record<string, any>> = {};
    data.forEach(d => {
      if (!d.customer_name || !d.billing_period) return;
      if (!index[d.customer_name]) index[d.customer_name] = {};
      
      const periods = d.billing_period.split(',');
      periods.forEach((p: string) => {
        const trimmedP = p.trim();
        index[d.customer_name][trimmedP] = d;
      });
    });
    return index;
  }, [data]);

  return (
    <div className="space-y-6">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-800">Laporan Pembayaran Bulanan</h2>
          <p className="text-slate-500">Monitor status tagihan pelanggan per bulan</p>
        </div>
        <div className="flex items-center gap-2 bg-white p-2 rounded-2xl border border-slate-200">
          <button 
            onClick={() => setSelectedYear(selectedYear - 1)}
            className="p-2 hover:bg-slate-100 rounded-xl transition-colors text-slate-400"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <span className="font-black text-slate-800 px-4">{selectedYear}</span>
          <button 
            onClick={() => setSelectedYear(selectedYear + 1)}
            className="p-2 hover:bg-slate-100 rounded-xl transition-colors text-slate-400"
          >
            <ArrowRightCircle className="w-4 h-4" />
          </button>
        </div>
      </header>

      <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left font-sans min-w-[1000px]">
            <thead className="bg-slate-50 text-slate-400 text-[10px] uppercase font-bold border-b border-slate-100">
              <tr>
                <th className="px-6 py-5 sticky left-0 bg-slate-50 z-20 w-64 border-r border-slate-100">Pelanggan / Alamat</th>
                {months.map(m => (
                  <th key={m} className="px-4 py-5 text-center min-w-[80px]">{formatPeriod(m).split(' ')[0]}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {customersList.map(c => {
                const customerData = data.filter(d => d.customer_name === c);
                const address = customerData[0]?.customer_address || '';
                
                return (
                  <tr key={c} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-6 py-4 sticky left-0 bg-white group-hover:bg-slate-50 z-10 border-r border-slate-100 shadow-[2px_0_10px_rgba(0,0,0,0.03)]">
                      <div className="flex flex-col">
                        <span className="font-black text-slate-900 text-sm">{c}</span>
                        <span className="text-[10px] text-slate-400 font-medium truncate max-w-[200px]">{address}</span>
                      </div>
                    </td>
                    {months.map(m => {
                      const payment = paymentsByCustomerAndMonth[c]?.[m];
                      const customerInfo = data.find(d => d.customer_name === c);
                      const registrationMonth = customerInfo?.customer_created_at?.slice(0, 7) || '2000-01';
                      const isAfterRegistration = m >= registrationMonth;
                      const currentMonthStr = new Date().toISOString().slice(0, 7);
                      const isPastOrCurrent = m <= currentMonthStr;
                      const shouldBePaid = isAfterRegistration && isPastOrCurrent;
                      
                      return (
                        <td key={m} className="px-2 py-4 text-center">
                          {payment ? (
                            <motion.div 
                              initial={{ scale: 0.8, opacity: 0 }}
                              animate={{ scale: 1, opacity: 1 }}
                              className="group/item relative"
                            >
                              <div className={cn(
                                "w-8 h-8 rounded-xl flex items-center justify-center mx-auto shadow-sm transition-transform group-hover/item:scale-110",
                                payment.status === 'confirmed' ? "bg-emerald-500 text-white" : "bg-amber-400 text-white"
                              )}>
                                <CheckCircle className="w-4 h-4" />
                              </div>
                              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 opacity-0 group-hover/item:opacity-100 transition-opacity bg-slate-900 text-white text-[9px] py-2 px-3 rounded-xl whitespace-nowrap z-50 pointer-events-none shadow-2xl flex flex-col gap-1 items-center border border-white/10">
                                <span className="font-black text-indigo-400 border-b border-indigo-500/30 pb-0.5 mb-0.5">{payment.status === 'confirmed' ? 'LUNAS' : 'PENDING'}</span>
                                <span className="font-bold">Rp {payment.amount?.toLocaleString()}</span>
                                <span className="text-[8px] opacity-70">Bayar: {payment.transaction_date}</span>
                                <span className="text-[8px] opacity-80 flex items-center gap-1 font-black">
                                  <UserCheck className="w-2.5 h-2.5" /> {payment.collector_name || 'Admin'}
                                </span>
                              </div>
                            </motion.div>
                          ) : (
                            <div className={cn(
                              "w-8 h-8 rounded-xl mx-auto flex items-center justify-center transition-all",
                              shouldBePaid ? "bg-rose-50 border border-rose-200 text-rose-500 shadow-inner group/unpaid relative" : "bg-slate-50 border border-slate-100 text-slate-200"
                            )}>
                               {shouldBePaid ? (
                                 <div className="flex items-center justify-center">
                                   <X className="w-3.5 h-3.5" />
                                   <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 opacity-0 group-hover/unpaid:opacity-100 transition-opacity bg-rose-600 text-white text-[8px] py-1 px-2 rounded-lg whitespace-nowrap z-50 pointer-events-none font-bold shadow-lg">
                                      MENUNGGAK
                                   </div>
                                 </div>
                               ) : (
                                 <div className="w-1 h-1 rounded-full bg-slate-200" />
                               )}
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
              {customersList.length === 0 && (
                <tr>
                  <td colSpan={months.length + 1} className="py-32 text-center">
                    <div className="flex flex-col items-center gap-2">
                       <FileText className="w-12 h-12 text-slate-100" />
                       <p className="text-slate-400 text-sm font-medium italic">Belum ada data pelanggan tercatat.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      
      <div className="flex flex-wrap gap-6 items-center bg-slate-50 p-6 rounded-3xl border border-slate-100">
         <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center text-white shadow-lg shadow-emerald-500/20">
               <CheckCircle className="w-5 h-5" />
            </div>
            <div>
               <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Lunas</p>
               <p className="text-xs font-bold text-slate-700">Telah diverifikasi</p>
            </div>
         </div>
         <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-400 rounded-xl flex items-center justify-center text-white shadow-lg shadow-amber-500/20">
               <CheckCircle className="w-5 h-5" />
            </div>
            <div>
               <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Pending</p>
               <p className="text-xs font-bold text-slate-700">Belum disetor/konfirmasi</p>
            </div>
         </div>
         <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-rose-50 border border-rose-200 rounded-xl flex items-center justify-center text-rose-500">
               <X className="w-5 h-5" />
            </div>
            <div>
               <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Menunggak</p>
               <p className="text-xs font-bold text-slate-700">Lewat jatuh tempo</p>
            </div>
         </div>
      </div>
    </div>
  );
}
