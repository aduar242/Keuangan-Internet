import React, { useState, useEffect, useMemo } from 'react';
import { 
  Search, 
  RefreshCw, 
  ArrowUpCircle, 
  ArrowDownCircle, 
  Printer, 
  History 
} from 'lucide-react';
import { motion } from 'motion/react';
import { User, Transaction } from '../types';
import { cn, formatPeriod } from '../lib/utils';

export default function TransactionHistory({ user, refreshTrigger, onShowReceipt }: { user: User, refreshTrigger: number, onShowReceipt: (t: Transaction, u: string) => void }) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchTransactions = async () => {
    try {
      const res = await fetch('/api/transactions', { headers: { 'x-user-id': String(user.id) } });
      if (res.ok) setTransactions(await res.json());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchTransactions(); }, [refreshTrigger]);

  const filtered = useMemo(() => transactions.filter(t => 
    (t.customer_name || t.category).toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.description?.toLowerCase().includes(searchTerm.toLowerCase())
  ), [transactions, searchTerm]);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">Log Transaksi</h2>
          <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-1">Total {transactions.length} Aktivitas</p>
        </div>
        <div className="relative group w-full md:w-96">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300 group-focus-within:text-indigo-500 transition-colors" />
          <input 
            type="text" 
            placeholder="Cari nama, kategori, atau catatan..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full h-16 pl-14 pr-6 bg-white border border-slate-100 rounded-3xl font-bold text-slate-700 shadow-sm focus:ring-4 focus:ring-indigo-500/5 outline-none transition-all"
          />
        </div>
      </header>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
           <RefreshCw className="w-10 h-10 text-indigo-600 animate-spin" />
           <p className="font-black text-slate-400 text-xs uppercase tracking-widest">Sinkronisasi Data...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filtered.map(t => (
            <motion.div 
              key={t.id}
              layout
              className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 group hover:shadow-xl hover:shadow-indigo-500/5 transition-all"
            >
              <div className="flex items-center gap-4">
                <div className={cn(
                  "w-14 h-14 rounded-2xl flex items-center justify-center shadow-inner",
                  t.type === 'pemasukan' ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"
                )}>
                  {t.type === 'pemasukan' ? <ArrowUpCircle className="w-8 h-8" /> : <ArrowDownCircle className="w-8 h-8" />}
                </div>
                <div>
                  <h4 className="font-black text-slate-900 text-sm">{t.customer_name || t.category}</h4>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight flex items-center gap-2 mt-0.5">
                    {t.category} 
                    {t.billing_period && (
                      <span className="text-indigo-400">({t.billing_period.split(',').map(p => formatPeriod(p.trim())).join(', ')})</span>
                    )}
                  </p>
                  <p className="text-[10px] text-slate-500 font-medium mt-1 truncate max-w-xs">{t.description}</p>
                </div>
              </div>

              <div className="flex items-center justify-between md:justify-end gap-10">
                <div className="text-right">
                  <p className="text-[10px] text-slate-300 font-black uppercase tracking-tighter mb-1">{t.transaction_date}</p>
                  <p className={cn(
                    "text-xl font-black tabular-nums tracking-tighter leading-none",
                    t.type === 'pemasukan' ? "text-emerald-600" : "text-rose-600"
                  )}>
                    {t.type === 'pemasukan' ? '+' : '-'} {(t.amount || 0).toLocaleString()}
                  </p>
                </div>
                <button 
                  onClick={() => onShowReceipt(t, user.name)}
                  className="w-12 h-12 bg-slate-50 text-slate-400 hover:bg-slate-950 hover:text-white rounded-2xl flex items-center justify-center transition-all active:scale-90"
                >
                  <Printer className="w-5 h-5" />
                </button>
              </div>
            </motion.div>
          ))}

          {filtered.length === 0 && (
            <div className="bg-white p-20 rounded-[3.5rem] border-2 border-dashed border-slate-100 text-center">
               <History className="w-16 h-16 text-slate-100 mx-auto mb-4" />
               <p className="text-slate-400 font-black text-xs uppercase tracking-widest italic">Tidak ada histori transaksi ditemukan</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
