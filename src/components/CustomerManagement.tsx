import React, { useState, useEffect, useMemo } from 'react';
import { 
  Search, 
  PlusCircle, 
  User as UserIcon, 
  X, 
  MapPin, 
  Phone, 
  Calendar, 
  Trash2, 
  AlertTriangle, 
  CheckCircle 
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { User, Customer, Packet } from '../types';
import { cn, getUnpaidMonthsList } from '../lib/utils';
import { ConfirmationModal } from './Common';

export const CustomerCard = React.memo(({ customer, currentMonthStr, isAdmin, onEdit, onDelete }: { customer: Customer, currentMonthStr: string, isAdmin: boolean, onEdit: (c: Customer) => void, onDelete: (id: number) => void }) => {
  const unpaid = useMemo(() => getUnpaidMonthsList(customer), [customer]);
  const hasPastUnpaid = useMemo(() => unpaid.some(p => p <= currentMonthStr), [unpaid, currentMonthStr]);

  let statusText = 'LUNAS';
  let statusColor = 'bg-emerald-50 text-emerald-600 border border-emerald-100';
  
  if (unpaid.length === 0) {
    statusText = 'LUNAS TOTAL';
  } else if (hasPastUnpaid) {
    statusText = 'MENUNGGAK';
    statusColor = 'bg-rose-50 text-rose-600 border border-rose-100';
  } else {
    statusText = 'LUNAS BLN INI';
    statusColor = 'bg-indigo-50 text-indigo-600 border border-indigo-100';
  }

  return (
    <motion.div 
      layout
      className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-2xl hover:shadow-indigo-500/10 transition-all group relative overflow-hidden"
    >
        <div className="flex justify-between items-start mb-6">
          <div>
              <h4 className="text-lg font-black text-slate-800 leading-tight">{customer.name}</h4>
              <div className="flex items-center gap-1.5 mt-2">
                <div className={cn("px-3 py-1 rounded-full text-[8px] font-black uppercase flex items-center gap-1 shadow-sm", statusColor)}>
                  {statusText === 'MENUNGGAK' ? <AlertTriangle className="w-2.5 h-2.5" /> : <CheckCircle className="w-2.5 h-2.5" />}
                  {statusText}
                </div>
                <div className="px-3 py-1 bg-slate-50 text-slate-500 text-[8px] font-black uppercase rounded-full border border-slate-100 shadow-sm">
                    {customer.packet ? customer.packet.split(' - ')[0] : '-'}
                </div>
              </div>
          </div>
          <div className="flex flex-col gap-2">
              <button onClick={() => onEdit(customer)} className="p-3 bg-slate-50 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-2xl transition-all active:scale-90">
                <PlusCircle className="w-5 h-5 rotate-45" />
              </button>
          </div>
        </div>

        <div className="space-y-4 mb-6">
          <div className="flex items-center gap-3 text-xs font-bold text-slate-500">
              <div className="w-8 h-8 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400"><MapPin className="w-4 h-4" /></div>
              <span className="truncate">{customer.address || 'Alamat tidak diatur'}</span>
          </div>
          <div className="flex items-center gap-3 text-xs font-bold text-slate-500">
              <div className="w-8 h-8 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400"><Phone className="w-4 h-4" /></div>
              <span>{customer.phone || 'No WhatsApp'}</span>
          </div>
        </div>

        <div className="bg-slate-50/50 p-4 rounded-3xl border border-dashed border-slate-200 space-y-3">
          <div className="flex justify-between items-center">
              <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none">Mulai Berlangganan</span>
              <span className="text-[10px] font-bold text-slate-700 flex items-center gap-1">
                <Calendar className="w-3" /> {customer.created_at?.slice(0, 7) || 'Manual'}
              </span>
          </div>
        </div>

        {isAdmin && (
          <div className="mt-6 pt-4 border-t border-slate-50 flex justify-end">
              <button onClick={() => onDelete(customer.id)} className="p-2 text-slate-200 hover:text-rose-400 transition-colors">
                <Trash2 className="w-4 h-4" />
              </button>
          </div>
        )}
    </motion.div>
  );
});

export default function CustomerManagement({ user, refreshTrigger }: { user: User, refreshTrigger?: number }) {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [packets, setPackets] = useState<Packet[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [isOldCustomer, setIsOldCustomer] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [customerToDelete, setCustomerToDelete] = useState<number | null>(null);
  const currentMonthStr = useMemo(() => new Date().toISOString().slice(0, 7), []);

  const fetchData = async () => {
    try {
      const [cRes, pRes] = await Promise.all([
        fetch('/api/customers', { headers: { 'x-user-id': String(user.id) } }),
        fetch('/api/packets', { headers: { 'x-user-id': String(user.id) } })
      ]);
      if (cRes.ok) setCustomers(await cRes.json());
      if (pRes.ok) setPackets(await pRes.json());
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => { fetchData(); }, [refreshTrigger]);

  const handleAdd = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    try {
      const formData = new FormData(e.currentTarget);
      const data = Object.fromEntries(formData);
      
      const method = editingCustomer ? 'PUT' : 'POST';
      const url = editingCustomer ? `/api/customers/${editingCustomer.id}` : '/api/customers';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', 'x-user-id': String(user.id) },
        body: JSON.stringify(data)
      });
      if (res.ok) {
        const savedCustomer = await res.json();

        // Rekam pembayaran awal untuk pelanggan baru jika opsi dicentang
        if (!editingCustomer && formData.get('record_initial_payment') === 'on' && data.packet) {
           const packetPriceStr = String(data.packet).split(' - Rp ')[1] || '0';
           const amount = Number(packetPriceStr.replace(/\D/g, ''));
           if (amount > 0) {
              await fetch('/api/transactions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'x-user-id': String(user.id) },
                body: JSON.stringify({
                  customer_id: savedCustomer.id,
                  type: 'pemasukan',
                  category: 'Pemasangan Baru',
                  amount: amount,
                  description: 'Pembayaran awal registrasi pelanggan',
                  transaction_date: new Date().toISOString().split('T')[0]
                })
              });
           }
        }

        setShowForm(false);
        setEditingCustomer(null);
        setIsOldCustomer(false);
        fetchData();
      } else {
        const errorData = await res.json();
        alert(errorData.error || 'Gagal menyimpan data pelanggan.');
      }
    } catch (err) {
      console.error(err);
      alert('Terjadi kesalahan koneksi saat menyimpan pelanggan.');
    }
  };

  const confirmDelete = async () => {
    if (!customerToDelete) return;
    try {
      const res = await fetch(`/api/customers/${customerToDelete}`, { method: 'DELETE', headers: { 'x-user-id': String(user.id) } });
      if (res.ok) {
        setCustomerToDelete(null);
        fetchData();
      } else {
        console.error('Gagal menghapus pelanggan.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = (id: number) => {
    setCustomerToDelete(id);
  };

  const handleEdit = (customer: Customer) => {
    setEditingCustomer(customer);
    setShowForm(true);
  };

  const filtered = useMemo(() => customers.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    c.address?.toLowerCase().includes(searchTerm.toLowerCase())
  ), [customers, searchTerm]);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
      <div className="bg-white p-8 rounded-[2.5rem] shadow-xl shadow-slate-200/50 border border-slate-100 flex flex-col md:flex-row justify-between items-center gap-6">
        <div>
          <h2 className="text-3xl font-black text-slate-800 tracking-tight">Data Pelanggan</h2>
          <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-1">Total: {customers.length} Terdaftar</p>
        </div>
        <div className="flex gap-4 w-full md:w-auto">
          <div className="relative flex-1 md:w-64 group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 group-focus-within:text-indigo-500 transition-colors" />
            <input 
              type="text" 
              placeholder="Cari nama atau alamat..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full h-14 pl-12 pr-6 bg-slate-50 border-none rounded-2xl font-bold text-slate-700 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all"
            />
          </div>
          <button 
            onClick={() => setShowForm(true)} 
            className="w-14 h-14 bg-indigo-600 text-white rounded-2xl shadow-lg shadow-indigo-200 flex items-center justify-center active:scale-95 transition-all flex-shrink-0"
          >
            <PlusCircle className="w-8 h-8" />
          </button>
        </div>
      </div>

      <AnimatePresence>
        {showForm && (
          <div className="fixed inset-0 z-[100] flex items-end justify-center md:items-center sm:p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => { setShowForm(false); setEditingCustomer(null); }}
              transition={{ duration: 0.2 }}
              className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm" 
            />
            <motion.div 
              initial={{ opacity: 0, y: 100 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 100 }}
              transition={{ duration: 0.3, type: "spring", damping: 25, stiffness: 200 }}
              className="relative bg-white w-full max-w-2xl rounded-t-[2.5rem] md:rounded-[2.5rem] shadow-2xl overflow-hidden max-h-[95vh] md:max-h-[85vh] flex flex-col"
            >
              <div className="p-6 md:p-8 bg-white border-b border-slate-100 flex items-center justify-between shrink-0">
                 <div>
                    <h3 className="text-xl font-black text-slate-800 tracking-tight flex items-center gap-2">
                       <UserIcon className="w-5 h-5 text-indigo-500" /> 
                       {editingCustomer ? 'Update Data' : 'Registrasi Pelanggan'}
                    </h3>
                    <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-widest leading-none">Database & Inventori Pelanggan</p>
                 </div>
                 <button onClick={() => { setShowForm(false); setEditingCustomer(null); }} className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-all active:rotate-90">
                    <X className="w-6 h-6" />
                 </button>
              </div>

              <div className="p-6 md:p-8 overflow-y-auto">
                {!editingCustomer && (
                  <div className="flex bg-slate-100 p-2 rounded-2xl mb-8">
                    <button 
                      onClick={() => setIsOldCustomer(false)}
                      className={cn("flex-1 py-3 text-[10px] font-black rounded-xl transition-all uppercase tracking-widest", !isOldCustomer ? "bg-white text-indigo-600 shadow-xl" : "text-slate-500")}
                    >
                      BARU
                    </button>
                    <button 
                      onClick={() => setIsOldCustomer(true)}
                      className={cn("flex-1 py-3 text-[10px] font-black rounded-xl transition-all uppercase tracking-widest", isOldCustomer ? "bg-white text-indigo-600 shadow-xl" : "text-slate-500")}
                    >
                      MIGRASI
                    </button>
                  </div>
                )}
                
                <form onSubmit={handleAdd} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nama Pelanggan</label>
                      <input name="name" defaultValue={editingCustomer?.name} placeholder="Nama Lengkap..." className="w-full bg-slate-50 border-none h-14 px-6 rounded-2xl font-bold text-slate-700 outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all" required />
                    </div>
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">No. WhatsApp</label>
                       <input name="phone" defaultValue={editingCustomer?.phone} placeholder="62812..." className="w-full bg-slate-50 border-none h-14 px-6 rounded-2xl font-bold text-slate-700 outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Paket Layanan</label>
                      <select name="packet" defaultValue={editingCustomer?.packet} className="w-full bg-slate-50 border-none h-14 px-6 rounded-2xl font-bold text-slate-700 outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all appearance-none" required>
                        <option value="">-- PILIH PAKET --</option>
                        {packets.map(p => (
                          <option key={p.id} value={`${p.name} - Rp ${(p.price || 0).toLocaleString()}`}>{p.name} (Rp {(p.price || 0).toLocaleString()})</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Alamat Pemasangan</label>
                    <textarea name="address" defaultValue={editingCustomer?.address} rows={2} placeholder="Gg. Kenanga No. 5..." className="w-full bg-slate-50 border-none p-6 rounded-2xl font-bold text-slate-700 outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all resize-none" />
                  </div>

                  {(isOldCustomer || editingCustomer) ? (
                    <div className="bg-indigo-600 rounded-3xl p-6 text-white shadow-xl shadow-indigo-200">
                      <label className="text-[10px] font-black text-indigo-200 uppercase tracking-[0.2em] mb-4 block">Bulan Mulai Berlangganan</label>
                      <input 
                        name="created_at" 
                        type="date" 
                        required
                        defaultValue={editingCustomer?.created_at?.slice(0, 10) || new Date().toISOString().slice(0, 10)}
                        className="w-full bg-indigo-500 border border-indigo-400 h-14 px-6 rounded-2xl font-black text-white outline-none" 
                      />
                      <p className="text-[9px] font-bold text-indigo-300 mt-4 italic leading-relaxed uppercase tracking-tighter">Sistem akan otomatis menghitung tunggakan mulai dari bulan yang Anda pilih.</p>
                    </div>
                  ) : (
                    <div className="bg-emerald-50 border border-emerald-100 rounded-3xl p-6">
                      <label className="flex items-center gap-4 cursor-pointer">
                        <input type="checkbox" name="record_initial_payment" defaultChecked className="w-6 h-6 rounded-lg text-emerald-600 focus:ring-emerald-500/20" />
                        <div>
                          <p className="text-xs font-black text-emerald-800 uppercase tracking-widest">Catat Pembayaran Awal</p>
                          <p className="text-[10px] font-bold text-emerald-600/70 mt-1">Sistem otomatis mencatat pemasukan sesuai harga paket layanan.</p>
                        </div>
                      </label>
                    </div>
                  )}

                  <button type="submit" className="w-full bg-indigo-600 text-white font-black py-5 rounded-2xl shadow-xl shadow-indigo-200 uppercase tracking-widest text-xs active:scale-95 transition-all">
                    {editingCustomer ? 'Update Database' : 'Finalisasi Registrasi'}
                  </button>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filtered.map(c => (
          <CustomerCard 
            key={c.id} 
            customer={c} 
            currentMonthStr={currentMonthStr} 
            isAdmin={user.role === 'admin'} 
            onEdit={handleEdit} 
            onDelete={handleDelete} 
          />
        ))}
      </div>

      <ConfirmationModal 
        isOpen={!!customerToDelete}
        title="Hapus Pelanggan?"
        message="Data pelanggan dan semua historis transaksi pembayaran pelanggan ini akan dihapus permanen. Aksi ini tidak dapat dibatalkan."
        onConfirm={confirmDelete}
        onCancel={() => setCustomerToDelete(null)}
      />
    </div>
  );
}
