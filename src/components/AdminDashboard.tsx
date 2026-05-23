import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  Plus, 
  Wallet, 
  ArrowUpCircle, 
  ArrowDownCircle, 
  Coins, 
  Check, 
  FileText, 
  Search, 
  Calendar, 
  User as UserIcon, 
  Printer, 
  Download, 
  Trash2, 
  ArrowLeft 
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { User, Transaction, DashboardStats, Customer, AppSettings } from '../types';
import { cn, formatPeriod } from '../lib/utils';
import { generateInvoicePDF } from '../lib/pdf';
import TransactionModal from './TransactionModal';

export function StatCard({ title, amount, icon, color, settings }: { title: string, amount: number, icon: React.ReactNode, color: 'indigo' | 'emerald' | 'rose' | 'amber', settings?: AppSettings | null }) {
  const isNegative = amount < 0;
  const colorMap = {
    indigo: { accent: 'bg-indigo-600', text: 'text-indigo-600', light: 'bg-indigo-50 border-indigo-100/50' },
    emerald: { accent: 'bg-emerald-600', text: 'text-emerald-600', light: 'bg-emerald-50 border-emerald-100/50' },
    rose: { accent: 'bg-rose-600', text: 'text-rose-600', light: 'bg-rose-50 border-rose-100/50' },
    amber: { accent: 'bg-amber-600', text: 'text-amber-600', light: 'bg-amber-50 border-amber-100/50' },
  };

  const style = colorMap[color] || colorMap.indigo;

  return (
    <motion.div 
      whileHover={{ y: -5, scale: 1.01 }}
      className="bg-white p-7 rounded-[2.5rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 relative overflow-hidden group transition-all duration-300"
    >
      <div className={cn(
        "absolute -top-10 -right-10 w-32 h-32 rounded-full opacity-[0.03] group-hover:opacity-[0.08] transition-all duration-700",
        style.accent
      )} />
      
      <div className="flex items-start justify-between mb-6 relative z-10">
        <div className={cn("p-4 rounded-2xl shadow-sm", style.light)}>
          {React.cloneElement(icon as React.ReactElement, { className: cn("w-6 h-6", style.text) })}
        </div>
        <div className={cn("px-2.5 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest flex items-center gap-1.5", style.light, style.text)}>
          <span className={cn("w-1 h-1 rounded-full animate-pulse", style.accent)} />
          Live Update
        </div>
      </div>
      
      <div className="relative z-10">
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.25em] mb-2.5 leading-none">{title}</p>
        <p className={cn(
          "text-3xl font-extrabold tracking-tighter tabular-nums leading-none",
          isNegative ? "text-rose-600" : "text-slate-900"
        )}>
          <span className="text-sm font-bold text-slate-400 mr-2 uppercase">{settings?.currency_symbol || 'Rp'}</span>
          {new Intl.NumberFormat('id-ID').format(Math.abs(amount))}
        </p>
      </div>

      <div className="mt-6 pt-5 border-t border-slate-50 flex items-center justify-between relative z-10">
         <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Aktivitas Terakhir</span>
         <ArrowRightCircle className="w-3.5 h-3.5 text-slate-200 group-hover:text-indigo-400 transition-colors" />
      </div>
    </motion.div>
  );
}

const ArrowRightCircle = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><circle cx="12" cy="12" r="10"/><path d="M8 12h8"/><path d="m12 16 4-4-4-4"/></svg>
);

export default function AdminDashboard({ user, settings, onShowReceipt, refreshTrigger, setRefreshTrigger }: { user: User, settings: AppSettings | null, onShowReceipt?: (t: Transaction, u: string) => void, refreshTrigger?: number, setRefreshTrigger?: React.Dispatch<React.SetStateAction<number>> }) {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [pendingDeposits, setPendingDeposits] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);

  const printTransaction = async (id: number) => {
    try {
      setIsPrinting(true);
      const res = await fetch(`/api/transactions/${id}`, {
        headers: { 'x-user-id': String(user.id) }
      });
      if (res.ok) {
        const trans = await res.json();
        if (onShowReceipt) {
          onShowReceipt(trans, user.name);
        } else {
          window.print();
        }
        setIsPrinting(false);
      } else {
        setIsPrinting(false);
      }
    } catch (err) {
      console.error(err);
      setIsPrinting(false);
    }
  };

  const fetchData = async () => {
    try {
      const [statsRes, transRes, depRes, custRes] = await Promise.all([
        fetch('/api/stats', { headers: { 'x-user-id': String(user.id) } }),
        fetch('/api/transactions', { headers: { 'x-user-id': String(user.id) } }),
        fetch('/api/deposits/pending', { headers: { 'x-user-id': String(user.id) } }),
        fetch('/api/customers', { headers: { 'x-user-id': String(user.id) } })
      ]);
      if (statsRes.ok && transRes.ok && depRes.ok && custRes.ok) {
        setStats(await statsRes.json());
        setTransactions(await transRes.json());
        setPendingDeposits(await depRes.json());
        setCustomers(await custRes.json());
      }
    } catch (err) {
      console.error('Failed to fetch admin data:', err);
    }
  };

  useEffect(() => { fetchData(); }, [refreshTrigger]);

  const handleDownloadInvoice = async (transactionId: number) => {
    try {
      const res = await fetch(`/api/invoices/${transactionId}`, { headers: { 'x-user-id': String(user.id) } });
      if (res.ok) {
        const fullData = await res.json();
        const customerObj: Customer = {
          id: fullData.customer_id,
          name: fullData.customer_name,
          address: fullData.customer_address,
          packet: fullData.customer_packet,
          phone: fullData.customer_phone,
          created_at: fullData.customer_created_at || fullData.created_at
        };
        const transObj: Transaction = {
          id: fullData.id,
          user_id: fullData.user_id,
          customer_id: fullData.customer_id,
          type: fullData.type,
          category: fullData.category,
          amount: fullData.amount,
          description: fullData.description,
          status: fullData.status,
          billing_period: fullData.billing_period,
          transaction_date: fullData.transaction_date,
          collector_name: fullData.collector_name,
          created_at: fullData.created_at
        };
        await generateInvoicePDF(customerObj, transObj, fullData.collector_name || 'Admin');
      }
    } catch (err) {
      console.error('Download failed:', err);
      alert('Gagal mendownload PDF.');
    }
  };

  const handleDelete = async (id: number) => {
    try {
      const res = await fetch(`/api/transactions/${id}`, {
        method: 'DELETE',
        headers: { 'x-user-id': String(user.id) }
      });
      if (res.ok) {
        fetchData();
      } else {
        console.error('Gagal menghapus transaksi.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleConfirmDeposit = async (collectorId: number) => {
    try {
      const res = await fetch('/api/deposits/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-id': String(user.id) },
        body: JSON.stringify({ collector_id: collectorId })
      });
      if (res.ok) {
        fetchData();
      } else {
        console.error('Gagal konfirmasi setoran.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-8 pb-12">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-8 mb-10 pb-8 border-b border-slate-200/50">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-indigo-100">
              <LayoutDashboard className="w-5 h-5" />
            </div>
            <h2 className="text-[28px] font-black tracking-tighter text-slate-900 leading-none">Ringkasan Sistem</h2>
          </div>
          <p className="text-slate-400 text-sm font-semibold tracking-tight">Monitoring arus kas dan operasional layanan ISP secara real-time</p>
        </div>
        <div className="flex items-center bg-white p-2 rounded-[2rem] border border-slate-100 shadow-sm">
          <button onClick={() => setShowModal(true)} className="w-full md:w-auto h-12 bg-indigo-600 hover:bg-black text-white px-6 rounded-xl font-bold flex items-center justify-center gap-2 transition-all active:scale-95">
            <Plus className="w-5 h-5" /> 
            <span>Transaksi Baru</span>
          </button>
        </div>
      </header>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Saldo Kas Saat Ini" amount={stats?.balance || 0} icon={<Wallet className="w-6 h-6 text-indigo-600" />} color="indigo" settings={settings} />
        <StatCard title="Total Pemasukan" amount={stats?.totalIncome || 0} icon={<ArrowUpCircle className="w-6 h-6 text-emerald-600" />} color="emerald" settings={settings} />
        <StatCard title="Uang Masuk Petugas" amount={stats?.pendingAmount || 0} icon={<Coins className="w-6 h-6 text-amber-600" />} color="amber" settings={settings} />
        <StatCard title="Total Pengeluaran" amount={stats?.totalExpense || 0} icon={<ArrowDownCircle className="w-6 h-6 text-rose-600" />} color="rose" settings={settings} />
      </div>

      {/* Pending Deposits Section */}
      {pendingDeposits.length > 0 && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.2 }}
          className="bg-amber-50 border border-amber-200 rounded-[2rem] p-8 shadow-md"
        >
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-amber-500 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-amber-200">
                <Coins className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-black text-amber-900 leading-tight">Konfirmasi Setoran</h3>
                <p className="text-amber-700/60 text-xs font-bold uppercase tracking-widest">Uang fisik sudah siap diterima</p>
              </div>
            </div>
            <span className="hidden md:block text-[10px] font-black bg-amber-500 text-white px-3 py-1 rounded-full">ACTION REQUIRED</span>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {pendingDeposits.map(d => (
              <div key={d.collector_id} className="bg-white p-5 rounded-2xl border border-amber-200 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow group">
                <div className="mb-4">
                  <p className="font-black text-slate-800 text-sm uppercase mb-1 tracking-tight">{d.collector_name}</p>
                  <div className="flex items-center gap-2 text-[10px] text-slate-400 font-bold mb-3">
                    <FileText className="w-3 h-3" />
                    <span>{d.transactionCount} TRANSAKSI BELUM DISETOR</span>
                  </div>
                  <p className="text-2xl font-black text-amber-600 tabular-nums">
                    Rp {(d.totalAmount || 0).toLocaleString()}
                  </p>
                </div>
                <button 
                  onClick={() => handleConfirmDeposit(d.collector_id)}
                  className="w-full bg-emerald-600 hover:bg-black text-white text-xs font-black px-4 py-3 rounded-xl transition-all shadow-lg shadow-emerald-200 hover:shadow-none flex items-center justify-center gap-2"
                >
                  <Check className="w-4 h-4" /> TERIMA UANG FISIK
                </button>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Transactions List */}
      <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-200 overflow-hidden">
        <div className="px-8 py-6 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between bg-white gap-4">
          <div>
            <h3 className="font-black text-slate-800 tracking-tight">Log Transaksi Keluar Masuk</h3>
            <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">Real-time update dari lapangan</p>
          </div>
          <div className="flex items-center gap-3">
             <div className="relative group">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 group-focus-within:text-indigo-500 transition-colors" />
                <input 
                  type="text" 
                  placeholder="Cari transaksi..."
                  className="pl-9 pr-4 py-2 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 w-full md:w-64 transition-all"
                />
             </div>
          </div>
        </div>
        
        {/* Desktop View Table Only for Dashboard Snippet */}
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-slate-400 text-[10px] uppercase tracking-[0.2em] font-black bg-slate-50/50">
                <th className="px-8 py-5">Tanggal</th>
                <th className="px-8 py-5">Pelanggan / Kategori</th>
                <th className="px-8 py-5 text-center">Status</th>
                <th className="px-8 py-5 text-right">Nominal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 text-sm">
              {transactions.slice(0, 10).map((t) => (
                <tr key={t.id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="px-8 py-5 font-mono text-slate-400 text-xs">{t.transaction_date}</td>
                  <td className="px-8 py-5">
                    <div className="font-black text-slate-800">{t.customer_name || t.category}</div>
                    <div className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">
                      {t.customer_name ? t.category : t.description}
                      {t.billing_period && t.category === 'Tagihan Bulanan' && ` - ${t.billing_period.split(',').map(p => formatPeriod(p.trim())).join(', ')}`}
                    </div>
                  </td>
                  <td className="px-8 py-5 text-center">
                    <div className={cn(
                      "text-[9px] font-black uppercase px-3 py-1 rounded-full inline-flex items-center gap-1.5",
                      t.status === 'confirmed' ? "bg-emerald-50 text-emerald-600 border border-emerald-100" : 
                      t.status === 'deposited' ? "bg-amber-50 text-amber-600 border border-amber-100" :
                      "bg-slate-50 text-slate-400"
                    )}>
                      {t.status === 'confirmed' && <Check className="w-2.5 h-2.5" />}
                      {t.status}
                    </div>
                  </td>
                  <td className={cn(
                    "px-8 py-5 text-right font-black tabular-nums text-base",
                    t.type === 'pemasukan' ? "text-emerald-600" : "text-rose-600"
                  )}>
                    {t.type === 'pemasukan' ? '+' : '-'} {new Intl.NumberFormat('id-ID').format(t.amount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {transactions.length === 0 && (
            <div className="py-20 text-center text-slate-300 italic font-medium uppercase tracking-[0.2em] text-[10px]">
              Empty Transaction History
            </div>
          )}
        </div>
      </div>

      <AnimatePresence>
        {showModal && (
          <TransactionModal 
            user={user} 
            onClose={() => setShowModal(false)} 
            onSuccess={() => {
              setShowModal(false);
              if (setRefreshTrigger) setRefreshTrigger(t => t + 1);
            }} 
          />
        )}
      </AnimatePresence>
    </div>
  );
}
