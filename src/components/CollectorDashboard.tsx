import React, { useState, useEffect, useMemo } from 'react';
import { 
  PlusCircle, 
  MinusCircle, 
  CheckCircle, 
  RefreshCw, 
  Printer, 
  Wifi, 
  X, 
  History, 
  Wallet, 
  Coins, 
  Target, 
  ShieldCheck, 
  UserCheck, 
  UserX, 
  Plus, 
  CalendarCheck2 
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { User, AppSettings, Transaction, Customer, Packet } from '../types';
import { cn, formatPeriod, getUnpaidMonthsList } from '../lib/utils';
import { generateInvoicePDF } from '../lib/pdf';
import { FormattedNumberInput } from './Common';

export default function CollectorDashboard({ user, settings, onShowReceipt, refreshTrigger, setRefreshTrigger }: { user: User, settings: AppSettings | null, onShowReceipt?: (t: Transaction, u: string) => void, refreshTrigger?: number, setRefreshTrigger: React.Dispatch<React.SetStateAction<number>> }) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [packets, setPackets] = useState<Packet[]>([]);
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('Tagihan Bulanan');
  const [searchTerm, setSearchTerm] = useState('');
  const [showCustomerList, setShowCustomerList] = useState(false);
  const [customerPayments, setCustomerPayments] = useState<any[]>([]);
  const [selectedPeriods, setSelectedPeriods] = useState<string[]>([]);
  const [amount, setAmount] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [showPrinterSettings, setShowPrinterSettings] = useState(false);
  const [historyTab, setHistoryTab] = useState<'transaksi' | 'rekap'>('transaksi');
  const [depositStats, setDepositStats] = useState({ heldAmount: 0, pendingConfirmation: 0, confirmedAmount: 0, pendingCount: 0 });
  const [recapToPreview, setRecapToPreview] = useState<Transaction[] | null>(null);
  const [defaultMonthCount, setDefaultMonthCount] = useState(2);

  const printTransaction = async (id: number) => {
    try {
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
      }
    } catch (err) {
      console.error(err);
    }
  };

  const heldBalance = depositStats.heldAmount || 0;

  const fetchInitialData = async () => {
    try {
      const [transRes, custRes, packRes, statsRes] = await Promise.all([
        fetch('/api/transactions', { headers: { 'x-user-id': String(user.id) } }),
        fetch('/api/customers', { headers: { 'x-user-id': String(user.id) } }),
        fetch('/api/packets', { headers: { 'x-user-id': String(user.id) } }),
        fetch('/api/deposits/stats', { headers: { 'x-user-id': String(user.id) } })
      ]);
      if (transRes.ok) setTransactions(await transRes.json());
      if (custRes.ok) setCustomers(await custRes.json());
      if (packRes.ok) setPackets(await packRes.json());
      if (statsRes.ok) setDepositStats(await statsRes.json());
    } catch (err) {
      console.error('Failed to fetch initial collector data:', err);
    }
  };

  useEffect(() => { fetchInitialData(); }, [refreshTrigger]);

  useEffect(() => {
    if (selectedCustomerId) {
      const customer = customers.find(c => String(c.id) === selectedCustomerId);
      if (customer) {
        setSearchTerm(customer.name);
        const unpaid = getUnpaidMonthsList(customer);
        if (unpaid.length > 0) {
          setSelectedPeriods(unpaid.slice(0, defaultMonthCount));
        } else {
          setSelectedPeriods([]);
        }

        if (selectedCategory === 'Tagihan Bulanan') {
          const priceMatch = customer.packet.match(/Rp\s?([\d.,]+)/);
          if (priceMatch) {
            const numericPrice = priceMatch[1].replace(/[.,]/g, '');
            setAmount(numericPrice);
          }
        }
      }
      
      fetch(`/api/customers/${selectedCustomerId}/payments`, { headers: { 'x-user-id': String(user.id) } })
        .then(res => res.json())
        .then(data => setCustomerPayments(data))
        .catch(err => console.error(err));
        
    } else {
      setCustomerPayments([]);
      setAmount('');
      setSelectedPeriods([]);
      setSearchTerm('');
    }
  }, [selectedCustomerId, customers, selectedCategory, defaultMonthCount]);

  useEffect(() => {
    if (selectedCustomerId && selectedCategory === 'Tagihan Bulanan') {
      const customer = customers.find(c => String(c.id) === selectedCustomerId);
      if (customer) {
        const priceMatch = customer.packet.match(/Rp\s?([\d.,]+)/);
        if (priceMatch) {
          const numericPrice = priceMatch[1].replace(/[.,]/g, '');
          setAmount(numericPrice);
        }
      }
    }
  }, [selectedCategory]);

  const filteredCustomers = useMemo(() => customers.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.address?.toLowerCase().includes(searchTerm.toLowerCase())
  ), [customers, searchTerm]);

  const selectedCustomer = customers.find(c => String(c.id) === selectedCustomerId);
  const unpaidMonthsList = getUnpaidMonthsList(selectedCustomer);

  const togglePeriod = (period: string) => {
    setSelectedPeriods(prev => 
      prev.includes(period) 
        ? prev.filter(p => p !== period) 
        : [...prev, period]
    );
  };

  const totalAmount = (Number(amount) || 0) * (selectedPeriods.length || 1);

  const handleDeposit = async () => {
    if (heldBalance === 0) return alert('Tidak ada uang yang perlu disetor.');
    const pendingTrans = transactions.filter(t => t.status === 'pending' && t.type === 'pemasukan');
    setRecapToPreview(pendingTrans);
  };

  const confirmDepositSubmission = async () => {
    try {
      const res = await fetch('/api/deposits/submit', {
        method: 'POST',
        headers: { 'x-user-id': String(user.id) }
      });
      
      if (res.ok) {
        setRefreshTrigger(prev => prev + 1);
        setRecapToPreview(null);
        alert('Berhasil! Segera serahkan uang fisik ke Admin.');
      } else {
        const errorData = await res.json();
        alert(errorData.error || 'Gagal mengirim setoran.');
      }
    } catch (err) {
      console.error(err);
      alert('Terjadi kesalahan koneksi saat menyetor.');
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (loading) return;

    if (selectedPeriods.length === 0 && selectedCategory === 'Tagihan Bulanan') {
      alert('Pilih setidaknya satu bulan tagihan.');
      return;
    }

    setLoading(true);
    
    try {
      const periodsToPay = selectedCategory === 'Tagihan Bulanan' ? selectedPeriods : [new Date().toISOString().slice(0, 7)];
      
      const data = {
        type: 'pemasukan',
        category: selectedCategory,
        amount: totalAmount,
        description: selectedCategory === 'Tagihan Bulanan' 
          ? `Internet ${periodsToPay.map(p => formatPeriod(p).split(' ')[0]).join(', ')}` 
          : (e.currentTarget as any).description.value,
        billing_period: selectedCategory === 'Tagihan Bulanan' ? periodsToPay.join(',') : null,
        transaction_date: new Date().toISOString().split('T')[0],
        customer_id: selectedCustomerId ? Number(selectedCustomerId) : null
      };

      const res = await fetch('/api/transactions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': String(user.id)
        },
        body: JSON.stringify(data)
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Gagal menyimpan transaksi.');
      }

      const result = await res.json();
      const lastTransactionId = result.id;

      alert('Pembayaran Berhasil Dicatat!');
      
      if (lastTransactionId) {
        const transRes = await fetch(`/api/transactions/${lastTransactionId}`, {
          headers: { 'x-user-id': String(user.id) }
        });
        if (transRes.ok) {
          const fullTrans = await transRes.json();
          if (periodsToPay.length > 1) {
            fullTrans.billing_period = periodsToPay.join(', ');
            fullTrans.amount = totalAmount;
          }
          if (onShowReceipt) onShowReceipt(fullTrans, user.name);
          else window.print();
        }
      }

      setSelectedPeriods([]); 
      setRefreshTrigger(prev => prev + 1);
      
      if (e.currentTarget.description) e.currentTarget.description.value = '';

      setTimeout(() => {
        const cust = customers.find(c => String(c.id) === selectedCustomerId);
        if (cust && getUnpaidMonthsList(cust).length === 0) {
          setSelectedCustomerId('');
          setSearchTerm('');
        }
      }, 1000);

    } catch (err: any) {
      alert(err.message || 'Terjadi kesalahan.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 max-w-2xl mx-auto pb-12">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-indigo-600 p-8 rounded-[3rem] text-white shadow-2xl shadow-indigo-200 border-b-8 border-indigo-800 flex flex-col justify-between min-h-[220px]">
               <div>
                 <p className="text-xs font-black text-indigo-200 uppercase tracking-widest mb-2 flex items-center gap-2">
                   <Wallet className="w-4 h-4" /> Uang yang Anda Pegang
                 </p>
                 <p className="text-5xl font-black tracking-tighter leading-none mb-2">Rp {heldBalance.toLocaleString()}</p>
                 <p className="text-[10px] text-indigo-300 font-bold uppercase tracking-wider">Silakan setorkan ke Admin jika sudah banyak</p>
               </div>
               <button 
                 onClick={handleDeposit}
                 disabled={heldBalance === 0}
                 className="mt-8 w-full bg-white text-indigo-600 py-5 rounded-[2rem] font-black text-sm uppercase tracking-[0.1em] active:scale-95 transition-all shadow-xl shadow-indigo-900/20 disabled:opacity-50 flex items-center justify-center gap-3"
               >
                 <Coins className="w-5 h-5" /> KONFIRMASI SETORAN
               </button>
            </div>
           
           <div className="grid grid-cols-2 gap-4">
             <div 
               onClick={() => setShowPrinterSettings(!showPrinterSettings)}
               className={cn(
                 "p-5 rounded-[2rem] border transition-all active:scale-95 cursor-pointer flex flex-col justify-between",
                 showPrinterSettings ? "bg-slate-900 border-slate-900 shadow-xl" : "bg-white border-slate-100 shadow-sm"
               )}
             >
                 <div className={cn(
                   "w-10 h-10 rounded-xl flex items-center justify-center mb-3",
                   showPrinterSettings ? "bg-white/10 text-white" : "bg-indigo-50 text-indigo-600"
                 )}>
                    <Printer className="w-5 h-5" />
                 </div>
                 <div>
                    <p className={cn("text-[8px] font-black uppercase tracking-widest leading-none mb-1", showPrinterSettings ? "text-slate-500" : "text-slate-400")}>Printer</p>
                    <p className={cn("text-xs font-black", showPrinterSettings ? "text-white" : "text-slate-800")}>Thermal</p>
                 </div>
             </div>
             <div className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col justify-between">
                <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center mb-3">
                   <Target className="w-5 h-5" />
                </div>
                <div>
                   <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Target</p>
                   <p className="text-xs font-black text-emerald-600">Terbaik</p>
                </div>
             </div>
           </div>
        </div>

        <AnimatePresence>
          {showPrinterSettings && (
            <motion.div 
               initial={{ opacity: 0 }}
               animate={{ opacity: 1 }}
               exit={{ opacity: 0 }}
               transition={{ duration: 0.2 }}
               className="bg-indigo-600 rounded-3xl p-5 overflow-hidden"
            >
               <div className="flex items-center justify-between mb-4">
                  <h4 className="text-white font-black text-xs uppercase tracking-widest">Printer Thermal</h4>
                  <div className="px-3 py-1 bg-white/20 rounded-full text-[8px] font-black text-white uppercase">Bluetooth Mode</div>
               </div>
               <p className="text-white/70 text-[10px] leading-relaxed mb-4">Pastikan printer thermal 58mm/80mm Anda sudah terkoneksi dengan HP melalui Bluetooth. Sistem akan otomatis memanggil aplikasi printer thermal saat mencetak.</p>
               <button 
                  onClick={() => window.print()}
                  className="w-full bg-white text-indigo-600 py-3 rounded-2xl font-black text-xs uppercase tracking-widest active:scale-95 transition-all flex items-center justify-center gap-2"
               >
                  <Wifi className="w-4 h-4" /> Tes Cetak Sekarang
               </button>
            </motion.div>
          )}
      </AnimatePresence>


      <AnimatePresence>
        {recapToPreview && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setRecapToPreview(null)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
            >
               <div className="p-8 border-b border-slate-100 flex items-center justify-between shrink-0 text-slate-800">
                  <div>
                    <h3 className="text-xl font-black text-slate-900 tracking-tight">Cek Rekap Setoran</h3>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Daftar transaksi yang akan disetor</p>
                  </div>
                  <button onClick={() => setRecapToPreview(null)} className="p-3 bg-slate-50 text-slate-400 rounded-2xl">
                    <X className="w-5 h-5" />
                  </button>
               </div>

               <div className="flex-1 overflow-y-auto px-8 py-6 bg-slate-50/30">
                  <div className="bg-white rounded-[2rem] border border-slate-100 p-6 shadow-sm space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
                       <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white">
                             <History className="w-5 h-5" />
                          </div>
                          <div>
                             <p className="text-[10px] font-black text-slate-400 uppercase">Kolektor</p>
                             <p className="text-xs font-bold text-slate-900">{user.name}</p>
                          </div>
                       </div>
                       <div className="text-right">
                          <p className="text-[10px] font-black text-slate-400 uppercase">Total</p>
                          <p className="text-lg font-black text-indigo-600">Rp {recapToPreview.reduce((sum, t) => sum + t.amount, 0).toLocaleString()}</p>
                       </div>
                    </div>

                    <div className="space-y-3">
                       {recapToPreview.map((t, idx) => (
                          <div key={t.id} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0 text-slate-800">
                             <div className="flex items-center gap-3">
                                <span className="text-[10px] font-black text-slate-300 w-4">{idx + 1}.</span>
                                <div>
                                   <p className="text-[11px] font-extrabold text-slate-800 leading-tight truncate max-w-[150px]">{t.customer_name || t.category}</p>
                                   <p className="text-[8px] font-bold text-slate-400 uppercase">{t.billing_period ? formatPeriod(t.billing_period.split(',')[0].trim()) : t.category}</p>
                                </div>
                             </div>
                             <p className="text-[11px] font-black text-slate-700 tabular-nums">Rp {t.amount.toLocaleString()}</p>
                          </div>
                       ))}
                    </div>
                  </div>
               </div>

               <div className="p-8 border-t border-slate-100 bg-white grid grid-cols-2 gap-4 shrink-0">
                  <button 
                    onClick={() => window.print()}
                    className="flex items-center justify-center gap-2 py-4 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest active:scale-95 transition-all"
                  >
                    <Printer className="w-4 h-4" /> Cetak Rekap
                  </button>
                  <button 
                    onClick={confirmDepositSubmission}
                    className="flex items-center justify-center gap-2 py-4 bg-indigo-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest active:scale-95 transition-all shadow-lg shadow-indigo-100"
                  >
                    <ShieldCheck className="w-4 h-4" /> Setor Sekarang
                  </button>
               </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>


      <header className="flex flex-col md:flex-row md:items-center justify-between gap-8 mb-10 pb-8 border-b border-slate-200/50">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-emerald-500 rounded-[2rem] flex items-center justify-center text-white shadow-xl shadow-emerald-100 rotate-3">
              <Coins className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-[28px] font-black tracking-tighter text-slate-900 leading-none">Penagihan Lapangan</h2>
              <p className="text-emerald-600 text-[10px] font-black uppercase tracking-[0.2em] mt-1.5 flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-emerald-500 animate-pulse rounded-full" /> Input Tagihan Customer
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center bg-white p-2 rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden min-w-[200px]">
           <div className="px-4 border-r border-slate-100">
             <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Held Cash</p>
             <p className="text-sm font-extrabold text-indigo-600">Rp {heldBalance.toLocaleString()}</p>
           </div>
           <button onClick={handleDeposit} className="p-3 text-indigo-600 hover:bg-indigo-50 rounded-full transition-all">
             <RefreshCw className="w-4 h-4" />
           </button>
        </div>
      </header>

      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.2 }}
        className="bg-white rounded-[3rem] p-8 md:p-10 shadow-lg border border-slate-100 text-slate-800"
      >
        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-slate-800">
            <div className="space-y-2">
              <div className="flex justify-between items-center px-1">
                <label className="block text-xs font-black text-slate-400 uppercase tracking-[0.1em]">Cari Pelanggan</label>
              </div>
              <div className="relative">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Masukkan nama atau alamat..."
                    value={searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value);
                      setShowCustomerList(true);
                      if (!e.target.value) setSelectedCustomerId('');
                    }}
                    onFocus={() => setShowCustomerList(true)}
                    className={cn(
                      "w-full bg-slate-50 text-slate-900 border-2 border-slate-100 px-6 py-5 rounded-[1.5rem] focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-bold text-lg pr-12 placeholder:text-slate-300",
                      selectedCustomerId && "bg-indigo-50/10 border-indigo-200"
                    )}
                  />
                  {selectedCustomerId && (
                    <div className="absolute right-12 top-1/2 -translate-y-1/2 flex items-center gap-2 pointer-events-none">
                       {(() => {
                          const customer = customers.find(c => String(c.id) === selectedCustomerId);
                          if (!customer) return null;
                          const unpaid = getUnpaidMonthsList(customer);
                          const now = new Date();
                          const currentMonth = now.toISOString().slice(0, 7);
                          const hasPastUnpaid = unpaid.some(p => p <= currentMonth);
                          
                          if (unpaid.length === 0) return <span className="text-[8px] font-black bg-emerald-600 text-white px-2 py-0.5 rounded-full uppercase">LUNAS TOTAL</span>;
                          if (hasPastUnpaid) return <span className="text-[8px] font-black bg-rose-600 text-white px-2 py-0.5 rounded-full uppercase">MENUNGGAK</span>;
                          return <span className="text-[8px] font-black bg-indigo-600 text-white px-2 py-0.5 rounded-full uppercase">LUNAS BLN INI</span>;
                       })()}
                    </div>
                  )}
                  {searchTerm && (
                    <button 
                      type="button"
                      onClick={() => {
                        setSelectedCustomerId('');
                        setSearchTerm('');
                        setSelectedPeriods([]);
                      }}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-rose-500 transition-colors"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  )}
                </div>
                
                {showCustomerList && (
                  <div className="absolute z-[110] left-0 right-0 mt-2 bg-white rounded-2xl shadow-xl border border-indigo-100 max-h-72 overflow-y-auto p-2">
                    {filteredCustomers.length > 0 ? (
                      filteredCustomers.map(c => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => {
                            setSelectedCustomerId(String(c.id));
                            setSearchTerm(c.name);
                            setShowCustomerList(false);
                            setSelectedCategory('Tagihan Bulanan');
                          }}
                          className="w-full text-left px-5 py-4 hover:bg-indigo-50/50 rounded-xl transition-all border-b last:border-0 border-slate-50 active:scale-[0.98] group"
                        >
                          <div className="font-bold text-slate-900 flex items-center justify-between mb-0.5">
                            <span className="group-hover:text-indigo-600 transition-colors uppercase">{c.name}</span>
                          </div>
                          <div className="text-[10px] text-slate-500 uppercase flex justify-between items-center opacity-70">
                            <span className="truncate max-w-[150px] italic">{c.address}</span>
                            <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-[8px]">ID: {c.id}</span>
                          </div>
                        </button>
                      ))
                    ) : (
                      <div className="px-5 py-8 text-center text-slate-800">
                        <UserX className="w-10 h-10 mx-auto text-slate-200 mb-2" />
                        <p className="text-slate-400 italic text-xs font-bold uppercase tracking-tight">Pelanggan tidak ditemukan</p>
                      </div>
                    )}
                  </div>
                )}
                {showCustomerList && (
                  <div className="fixed inset-0 z-[105]" onClick={() => setShowCustomerList(false)} />
                )}
              </div>
            </div>
            <div className="space-y-4">
              <label className="block text-xs font-black text-slate-400 uppercase tracking-[0.1em] px-1">Pilih Keterangan Setoran</label>
              <div className="grid grid-cols-2 gap-3">
                {['Tagihan Bulanan', 'Lainnya'].map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => {
                      setSelectedCategory(cat);
                      if (cat === 'Lainnya') {
                        setSelectedPeriods([]);
                        setAmount('');
                      }
                    }}
                    className={cn(
                      "py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border-2",
                      selectedCategory === cat 
                        ? "bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-200 scale-[1.02]" 
                        : "bg-slate-50 border-slate-100 text-slate-400 hover:border-slate-200"
                    )}
                  >
                    {cat === 'Tagihan Bulanan' ? 'TAGIHAN BULANAN' : 'BIAYA LAINNYA'}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {selectedCategory === 'Lainnya' && (
            <motion.div 
               initial={{ opacity: 0, y: -10 }}
               animate={{ opacity: 1, y: 0 }}
               className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50 p-6 rounded-[2rem] border-2 border-dashed border-slate-200"
            >
              <div className="space-y-2">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Keterangan Biaya</label>
                <input 
                   name="description" 
                   placeholder="Mis: Biaya Router, Perbaikan..." 
                   className="w-full bg-white border border-slate-200 h-14 px-5 rounded-xl font-bold text-slate-800 outline-none focus:ring-4 focus:ring-indigo-500/10"
                   required={selectedCategory === 'Lainnya'}
                />
              </div>
              <div className="space-y-2 text-slate-800">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nominal (Rp)</label>
                <FormattedNumberInput 
                   name="amount" 
                   value={amount} 
                   onChange={(val) => setAmount(val)}
                   placeholder="0"
                   className="w-full bg-white border border-slate-200 h-14 px-5 rounded-xl font-black text-lg text-slate-800 outline-none focus:ring-4 focus:ring-indigo-500/10"
                   required={selectedCategory === 'Lainnya'}
                />
              </div>
            </motion.div>
          )}

          {selectedCategory === 'Tagihan Bulanan' && unpaidMonthsList.length > 0 && (
            <motion.div 
               initial={{ opacity: 0 }}
               animate={{ opacity: 1 }}
               className="space-y-4"
            >
                <div className="flex justify-between items-center px-1">
                <label className="block text-xs font-black text-slate-400 uppercase tracking-[0.1em]">Pilih Bulan yang Dibayar</label>
                <div className="flex items-center gap-3">
                  <div className="flex items-center bg-slate-50 rounded-xl px-2 py-1 border border-slate-100">
                    <span className="text-[8px] font-black text-slate-400 uppercase mr-2 ml-1">Auto:</span>
                    <select 
                      value={defaultMonthCount}
                      onChange={(e) => setDefaultMonthCount(Number(e.target.value))}
                      className="bg-transparent text-[10px] font-black text-indigo-600 outline-none cursor-pointer"
                    >
                      <option value={1}>1 Bln</option>
                      <option value={2}>2 Bln</option>
                      <option value={3}>3 Bln</option>
                      <option value={6}>6 Bln</option>
                    </select>
                  </div>
                  <button 
                    type="button"
                    onClick={() => setSelectedPeriods(unpaidMonthsList)}
                    className="text-[9px] font-black text-indigo-600 uppercase tracking-widest hover:underline"
                  >
                    Pilih Semua
                  </button>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 max-h-[200px] overflow-y-auto pr-2 custom-scrollbar">
                {unpaidMonthsList.map(m => {
                  const isFuture = m > new Date().toISOString().slice(0, 7);
                  return (
                    <button
                      key={m}
                      type="button"
                      onClick={() => togglePeriod(m)}
                      className={cn(
                        "relative px-4 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border-2 flex flex-col items-center gap-1 min-w-[90px]",
                        selectedPeriods.includes(m) 
                          ? "bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-100 scale-105 z-10" 
                          : isFuture
                            ? "bg-white border-slate-100 text-slate-400 hover:border-indigo-100"
                            : "bg-rose-50 border-rose-100 text-rose-600 hover:border-rose-200"
                      )}
                    >
                      <span>{formatPeriod(m)}</span>
                      {selectedPeriods.includes(m) && (
                        <div className="absolute top-1 right-1 bg-white rounded-full p-0.5">
                          <CheckCircle className="w-2 h-2 text-indigo-600" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </motion.div>
          )}

          <div className="space-y-4">
             <label className="block text-xs font-black text-slate-400 uppercase tracking-[0.1em] px-1">Konfirmasi Nominal</label>
             <div className="bg-slate-900 border-b-8 border-slate-950 p-10 rounded-[2.5rem] text-center shadow-lg overflow-hidden relative group">
                <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-2">Total Terima Uang</p>
                <p className={cn(
                  "text-5xl font-black tracking-tighter leading-none mb-4 transition-all tabular-nums",
                  totalAmount > 0 ? "text-emerald-400" : "text-white/20"
                )}>
                  Rp {totalAmount.toLocaleString()}
                </p>
             </div>
          </div>

          <button 
            type="submit" 
            disabled={loading || !selectedCustomerId || (selectedCategory === 'Tagihan Bulanan' && selectedPeriods.length === 0)}
            className="w-full bg-indigo-600 hover:bg-black text-white py-8 rounded-[3rem] font-black text-xl uppercase tracking-[0.2em] shadow-lg transition-all active:scale-95 disabled:opacity-30 flex flex-col items-center justify-center gap-1 group"
          >
            <div className="flex items-center gap-3">
               {loading ? <RefreshCw className="w-6 h-6 animate-spin" /> : <CheckCircle className="w-6 h-6 group-hover:scale-110 transition-transform" />}
               <span>SIMPAN SEKARANG</span>
            </div>
          </button>
        </form>
      </motion.div>

      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-lg flex items-center gap-2">
            <History className="w-5 h-5 text-indigo-600" />
            Riwayat Operasional
          </h3>
          <div className="bg-slate-100 p-1 rounded-xl flex">
             <button 
               onClick={() => setHistoryTab('transaksi')}
               className={cn(
                 "px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all",
                 historyTab === 'transaksi' ? "bg-white text-indigo-600 shadow-sm" : "text-slate-400"
               )}
             >
               Transaksi
             </button>
             <button 
               onClick={() => setHistoryTab('rekap')}
               className={cn(
                 "px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all",
                 historyTab === 'rekap' ? "bg-white text-indigo-600 shadow-sm" : "text-slate-400"
               )}
             >
               Rekap Setoran
             </button>
          </div>
        </div>

        {historyTab === 'transaksi' ? (
          <div className="space-y-3">
            {transactions.slice(0, 10).map((t) => (
              <motion.div 
                key={t.id} 
                layout
                className="relative overflow-hidden bg-white rounded-3xl border border-slate-100 shadow-sm group p-4"
              >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "w-12 h-12 rounded-2xl flex items-center justify-center font-black text-lg",
                        t.type === 'pemasukan' ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"
                      )}>
                        {t.type === 'pemasukan' ? <PlusCircle className="w-6 h-6" /> : <MinusCircle className="w-6 h-6" />}
                      </div>
                      <div>
                        <p className="font-black text-slate-800 text-sm">{t.customer_name || t.category}</p>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">
                           {t.billing_period ? t.billing_period.split(',').map(p => formatPeriod(p.trim())).join(', ') : t.category}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={cn(
                        "font-black text-sm tabular-nums",
                        t.type === 'pemasukan' ? "text-emerald-600" : "text-rose-600"
                      )}>
                        Rp {t.amount.toLocaleString()}
                      </p>
                      <button onClick={() => printTransaction(t.id)} className="text-indigo-600 text-[10px] font-black uppercase">Cetak Ulang</button>
                    </div>
                  </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="space-y-4">
             <div className="bg-indigo-600 p-6 rounded-[3.5rem] text-white shadow-xl shadow-indigo-100">
                <p className="text-[10px] font-black text-indigo-200 uppercase tracking-widest mb-1">Held Balance</p>
                <p className="text-3xl font-black">Rp {depositStats.heldAmount.toLocaleString()}</p>
                <button 
                   onClick={handleDeposit}
                   className="w-full mt-6 bg-white text-indigo-600 py-4 rounded-2xl font-black text-xs uppercase"
                >
                   Kirim Recap
                </button>
             </div>
          </div>
        )}
      </div>

      <div className="space-y-4">
        <h3 className="font-bold text-lg flex items-center gap-2">
          <CalendarCheck2 className="w-5 h-5 text-rose-500" />
          Penagihan Belum Lunas
        </h3>
        <div className="grid grid-cols-1 gap-3">
          {customers
            .map(c => ({ ...c, unpaid: getUnpaidMonthsList(c) }))
            .filter(c => c.unpaid.length > 0)
            .map((c) => (
                <div 
                  key={c.id}
                  onClick={() => {
                    setSelectedCustomerId(String(c.id));
                    setSearchTerm(c.name);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="bg-white p-5 rounded-2xl border-l-4 border-l-rose-500 border-slate-100 shadow-sm cursor-pointer"
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-bold text-slate-800">{c.name}</p>
                      <p className="text-[10px] text-slate-400">{c.address}</p>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {c.unpaid.map(m => (
                          <span key={m} className="text-[8px] font-bold bg-rose-50 text-rose-500 px-1.5 py-0.5 rounded uppercase">{formatPeriod(m)}</span>
                        ))}
                      </div>
                    </div>
                    <p className="text-sm font-black text-rose-600">{c.unpaid.length} Bln</p>
                  </div>
                </div>
            ))}
        </div>
      </div>
    </div>
  );
}
