import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { History, ShieldCheck, UserCheck, Printer } from 'lucide-react';
import { User } from '../types';

export default function DepositManagement({ user, refreshTrigger, onRefresh, onShowDepositReceipt }: { user: User, refreshTrigger?: number, onRefresh?: () => void, onShowDepositReceipt?: (r: any) => void }) {
  const [pendingDeposits, setPendingDeposits] = useState<any[]>([]);
  const [depositHistory, setDepositHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDeposits = async () => {
    try {
      const res = await fetch('/api/deposits/pending', { headers: { 'x-user-id': String(user.id) } });
      if (res.ok) {
        setPendingDeposits(await res.json());
      }
      const historyRes = await fetch('/api/deposits/history', { headers: { 'x-user-id': String(user.id) } });
      if (historyRes.ok) {
        setDepositHistory(await historyRes.json());
      }
    } catch (err) {
      console.error('Failed to fetch deposits:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDeposits();
  }, [refreshTrigger]);

  const handleConfirmDeposit = async (collectorId: number) => {
    if (!confirm('Konfirmasi terima uang setoran ini?')) return;
    try {
      const res = await fetch('/api/deposits/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-id': String(user.id) },
        body: JSON.stringify({ collector_id: collectorId })
      });
      if (res.ok) {
        fetchDeposits();
        if (onRefresh) onRefresh();
      } else {
        const errorData = await res.json();
        alert(errorData.error || 'Gagal konfirmasi setoran.');
      }
    } catch (err) {
      console.error(err);
      alert('Terjadi kesalahan koneksi saat konfirmasi setoran.');
    }
  };

  if (loading && pendingDeposits.length === 0 && depositHistory.length === 0) return null;

  return (
    <div className="space-y-8">
      {pendingDeposits.length > 0 && (
        <div className="space-y-4">
          <h3 className="font-bold text-lg flex items-center gap-2">
            <History className="w-5 h-5 text-indigo-600" />
            Setoran Perlu Konfirmasi
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {pendingDeposits.map(d => (
              <motion.div 
                key={d.collector_id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-white p-6 rounded-[2rem] border-2 border-indigo-100 shadow-xl shadow-indigo-50 flex flex-col justify-between"
              >
                <div className="flex items-center gap-3 mb-4">
                   <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 font-bold uppercase">
                      {d.collector_name?.charAt(0)}
                   </div>
                   <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Kolektor Lapangan</p>
                      <p className="font-black text-slate-900">{d.collector_name}</p>
                   </div>
                </div>
                <div className="mb-6">
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Setoran</p>
                   <p className="text-2xl font-black text-indigo-600 tabular-nums">Rp {(d.total_amount || 0).toLocaleString()}</p>
                </div>
                <button 
                  onClick={() => handleConfirmDeposit(d.collector_id)}
                  className="w-full bg-emerald-600 hover:bg-black text-white py-4 rounded-xl font-black text-xs uppercase tracking-widest active:scale-95 transition-all flex items-center justify-center gap-2"
                >
                  <ShieldCheck className="w-4 h-4" /> TERIMA SETORAN
                </button>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {depositHistory.length > 0 && (
        <div className="space-y-4">
          <h3 className="font-bold text-lg flex items-center gap-2">
            <History className="w-5 h-5 text-indigo-600" />
            Riwayat Setoran
          </h3>
          <div className="bg-white rounded-[2rem] shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden">
             <div className="overflow-x-auto custom-scrollbar">
                <table className="w-full text-left border-collapse">
                   <thead>
                      <tr className="bg-slate-50 border-b border-slate-100">
                         <th className="py-4 px-6 text-[10px] uppercase tracking-widest font-black text-slate-400 whitespace-nowrap">Tanggal</th>
                         <th className="py-4 px-6 text-[10px] uppercase tracking-widest font-black text-slate-400 whitespace-nowrap">Petugas</th>
                         <th className="py-4 px-6 text-[10px] uppercase tracking-widest font-black text-slate-400 whitespace-nowrap">Total Setoran</th>
                         <th className="py-4 px-6 text-[10px] uppercase tracking-widest font-black text-slate-400 whitespace-nowrap">Status</th>
                         <th className="py-4 px-6 text-[10px] uppercase tracking-widest font-black text-slate-400 whitespace-nowrap text-right">Opsi</th>
                      </tr>
                   </thead>
                   <tbody className="divide-y divide-slate-50">
                      {depositHistory.map((h, i) => (
                         <tr 
                           key={i} 
                           className="hover:bg-slate-50/50 transition-colors cursor-pointer group"
                           onClick={() => {
                              if (onShowDepositReceipt) {
                                 onShowDepositReceipt({
                                    date: h.date,
                                    collector_id: h.collector_id,
                                    collector_name: h.collector_name,
                                    total_amount: h.total_amount
                                 });
                              }
                           }}
                         >
                            <td className="py-4 px-6 font-bold text-slate-700 whitespace-nowrap">{h.date}</td>
                            <td className="py-4 px-6 font-bold text-slate-700 whitespace-nowrap">{h.collector_name}</td>
                            <td className="py-4 px-6 font-black text-indigo-600 tabular-nums whitespace-nowrap">Rp {(h.total_amount || 0).toLocaleString()}</td>
                            <td className="py-4 px-6">
                               {h.status === 'confirmed' ? (
                                  <span className="bg-emerald-50 text-emerald-600 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider">Diterima</span>
                               ) : (
                                  <span className="bg-amber-50 text-amber-600 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider">Menunggu</span>
                               )}
                            </td>
                            <td className="py-4 px-6 text-right">
                               <button 
                                 onClick={(e) => {
                                    e.stopPropagation();
                                    if (onShowDepositReceipt) {
                                       onShowDepositReceipt({
                                          date: h.date,
                                          collector_id: h.collector_id,
                                          collector_name: h.collector_name,
                                          total_amount: h.total_amount
                                       });
                                    }
                                 }} 
                                 className="w-10 h-10 bg-slate-50 group-hover:bg-indigo-50 text-slate-400 group-hover:text-indigo-600 rounded-xl flex items-center justify-center transition-all inline-flex"
                               >
                                 <Printer className="w-4 h-4" />
                               </button>
                            </td>
                         </tr>
                      ))}
                   </tbody>
                </table>
             </div>
          </div>
        </div>
      )}
    </div>
  );
}
