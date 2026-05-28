import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  LogOut, 
  BarChart3, 
  Calendar, 
  CalendarCheck2, 
  Coins,
  Users
} from 'lucide-react';
import { motion } from 'motion/react';
import { User, Transaction, Customer } from '../types';
import { cn } from '../lib/utils';
import { FormattedNumberInput } from './Common';

const CATEGORIES = {
  pemasukan: ['Tagihan Bulanan', 'Voucher', 'Pemasangan Baru', 'Denda', 'Lainnya'],
  pengeluaran: ['ISP Pusat', 'Alat', 'Operasional', 'Gaji', 'Sewa Tempat', 'Lainnya']
};

export default function TransactionModal({ user, onClose, onSuccess }: { user: User, isAdmin?: boolean, onClose: () => void, onSuccess: (t: Transaction) => void }) {
  const [type, setType] = useState<'pemasukan' | 'pengeluaran'>('pemasukan');
  const [amount, setAmount] = useState('');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [category, setCategory] = useState(CATEGORIES['pemasukan'][0]);

  useEffect(() => {
    fetch('/api/customers', { headers: { 'x-user-id': String(user.id) } })
      .then(res => res.json())
      .then(data => setCustomers(data))
      .catch(err => console.error(err));
  }, [user.id]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    try {
      const formData = new FormData(e.currentTarget);
      const selCat = formData.get('category') as string;
      const data = {
        type: formData.get('type'),
        category: selCat,
        amount: Number(amount),
        description: formData.get('description') || '',
        billing_period: (selCat === 'Tagihan Bulanan' || formData.get('billing_period')) ? formData.get('billing_period') : null,
        transaction_date: formData.get('transaction_date'),
        customer_id: selCat === 'Tagihan Bulanan' ? Number(formData.get('customer_id')) : null
      };

      const res = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-user-id': String(user.id)
        },
        body: JSON.stringify(data)
      });

      if (res.ok) {
        const result = await res.json();
        onSuccess(result);
      } else {
        const errorData = await res.json();
        alert('Gagal menyimpan: ' + (errorData.error || 'Terjadi kesalahan sistem.'));
      }
    } catch (err) {
      console.error(err);
      alert('Terjadi kesalahan koneksi saat menyimpan transaksi manual.');
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center md:items-center p-0 md:p-4">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        transition={{ duration: 0.2 }}
        className="absolute inset-0 bg-slate-900/90 backdrop-blur-sm" 
      />
      <motion.div 
        initial={{ opacity: 0, y: 100 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 100 }}
        transition={{ duration: 0.3, type: 'spring', damping: 25, stiffness: 200 }}
        className="relative bg-slate-50 w-full md:max-w-lg rounded-t-[2.5rem] md:rounded-[2.5rem] shadow-2xl overflow-hidden max-h-[95vh] md:max-h-[90vh] flex flex-col"
      >
        <div className="bg-white p-6 md:p-8 border-b border-slate-100 flex items-center justify-between shrink-0">
           <div>
              <h3 className="text-xl font-black text-slate-800 tracking-tight flex items-center gap-2">
                <FileText className="w-5 h-5 text-indigo-500" /> Input Manual
              </h3>
              <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-widest">Catat Arus Kas Langsung</p>
           </div>
           <button onClick={onClose} className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors">
              <LogOut className="w-5 h-5 rotate-180" />
           </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 md:p-8 space-y-6 overflow-y-auto w-full">
          <div className="grid grid-cols-2 gap-4 p-1.5 bg-slate-200/50 rounded-2xl">
             <button 
                type="button" 
                onClick={() => setType('pemasukan')}
                className={cn(
                  "py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all", 
                  type === 'pemasukan' ? "bg-white text-emerald-600 shadow-lg" : "text-slate-500 hover:text-slate-700"
                )}
             >
               Pemasukan
             </button>
             <button 
                type="button" 
                onClick={() => setType('pengeluaran')}
                className={cn(
                  "py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all", 
                  type === 'pengeluaran' ? "bg-white text-rose-600 shadow-lg" : "text-slate-500 hover:text-slate-700"
                )}
             >
               Pengeluaran
             </button>
          </div>
          <input type="hidden" name="type" value={type} />
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Kategori Transaksi</label>
              <div className="relative group">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-500 transition-colors">
                  <BarChart3 className="w-4 h-4" />
                </div>
                <select name="category" value={category} onChange={(e) => setCategory(e.target.value)} className="w-full bg-white border border-slate-100 h-12 pl-11 pr-4 rounded-xl font-bold text-slate-700 focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500/50 outline-none appearance-none transition-all">
                  {CATEGORIES[type].map(cat => <option key={cat} value={cat}>{cat}</option>)}
                </select>
              </div>
            </div>
            
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Tanggal Eksekusi</label>
              <div className="relative group">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-500 transition-colors">
                  <Calendar className="w-4 h-4" />
                </div>
                <input name="transaction_date" type="date" defaultValue={new Date().toISOString().split('T')[0]} className="w-full bg-white border border-slate-100 h-12 pl-11 pr-4 rounded-xl font-bold text-slate-700 focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500/50 outline-none transition-all" required />
              </div>
            </div>
          </div>

          {category === 'Tagihan Bulanan' && (
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Pilih Pelanggan</label>
              <div className="relative group">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-500 transition-colors">
                  <Users className="w-4 h-4" />
                </div>
                <select name="customer_id" className="w-full bg-white border border-slate-100 h-12 pl-11 pr-4 rounded-xl font-bold text-slate-700 focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500/50 outline-none transition-all" required>
                  <option value="">-- Pilih Pelanggan --</option>
                  {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Bulan Layanan (Opsional)</label>
            <div className="relative group">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-500 transition-colors">
                <CalendarCheck2 className="w-4 h-4" />
              </div>
              <input name="billing_period" type="month" className="w-full bg-white border border-slate-100 h-12 pl-11 pr-4 rounded-xl font-bold text-slate-700 focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500/50 outline-none transition-all" />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Nilai Transaksi (Rp)</label>
            <div className="relative group">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-500 transition-colors z-10 w-5 h-5 flex items-center justify-center">
                <Coins className="w-5 h-5" />
              </div>
              <FormattedNumberInput 
                name="amount"
                value={amount}
                onChange={setAmount}
                className="w-full bg-white border border-slate-100 h-16 pl-12 pr-4 rounded-2xl font-black text-2xl text-slate-800 focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500/50 outline-none transition-all tabular-nums placeholder:text-slate-200"
                placeholder="0"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Catatan Tambahan</label>
            <textarea name="description" className="w-full bg-white border border-slate-100 p-4 rounded-2xl font-medium text-slate-700 focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500/50 outline-none transition-all min-h-[100px] placeholder:text-slate-300" placeholder="Jelaskan detail transaksi jika perlu..."></textarea>
          </div>

          <div className="flex gap-4 pt-4">
            <button type="button" onClick={onClose} className="flex-1 py-4 text-slate-400 font-black text-xs uppercase tracking-widest hover:text-slate-600 active:scale-95 transition-all">Batal</button>
            <button type="submit" className="flex-1 bg-indigo-600 hover:bg-black text-white font-black py-4 rounded-2xl shadow-xl shadow-indigo-200 active:scale-95 transition-all uppercase tracking-widest text-xs">Simpan Data</button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
