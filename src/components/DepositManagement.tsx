import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { History, ShieldCheck, UserCheck } from 'lucide-react';
import { User } from '../types';

export default function DepositManagement({ user, refreshTrigger, onRefresh }: { user: User, refreshTrigger?: number, onRefresh?: () => void }) {
  const [pendingDeposits, setPendingDeposits] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDeposits = async () => {
    try {
      const res = await fetch('/api/deposits/pending', { headers: { 'x-user-id': String(user.id) } });
      if (res.ok) {
        setPendingDeposits(await res.json());
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

  if (loading && pendingDeposits.length === 0) return null;
  if (pendingDeposits.length === 0) return null;

  return (
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
               <p className="text-2xl font-black text-indigo-600 tabular-nums">Rp {d.total_amount.toLocaleString()}</p>
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
  );
}
