import React, { useState, useEffect } from 'react';
import { PlusCircle, X, Trash2, Edit2, Zap, Tag } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { User, Packet } from '../types';
import { cn } from '../lib/utils';
import { FormattedNumberInput, ConfirmationModal } from './Common';

export default function PacketManagement({ user, refreshTrigger }: { user: User, refreshTrigger?: number }) {
  const [packets, setPackets] = useState<Packet[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingPacket, setEditingPacket] = useState<Packet | null>(null);
  const [price, setPrice] = useState('');
  const [packetToDelete, setPacketToDelete] = useState<number | null>(null);

  const fetchPackets = async () => {
    try {
      const res = await fetch('/api/packets', { headers: { 'x-user-id': String(user.id) } });
      if (res.ok) setPackets(await res.json());
    } catch (err) {
      console.error('Failed to fetch packets:', err);
    }
  };

  useEffect(() => { fetchPackets(); }, [refreshTrigger]);

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    try {
      const formData = new FormData(e.currentTarget);
      const url = editingPacket ? `/api/packets/${editingPacket.id}` : '/api/packets';
      const method = editingPacket ? 'PUT' : 'POST';
      
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', 'x-user-id': String(user.id) },
        body: JSON.stringify({
          name: formData.get('name'),
          price: Number(formData.get('price'))
        })
      });
      if (res.ok) {
        setShowForm(false);
        setEditingPacket(null);
        setPrice('');
        fetchPackets();
      } else {
        const errorData = await res.json();
        alert(errorData.error || 'Gagal menyimpan paket.');
      }
    } catch (err) {
      console.error(err);
      alert('Terjadi kesalahan koneksi saat menyimpan paket.');
    }
  };

  const confirmDelete = async () => {
    if (!packetToDelete) return;
    try {
      const res = await fetch(`/api/packets/${packetToDelete}`, { method: 'DELETE', headers: { 'x-user-id': String(user.id) } });
      if (res.ok) {
        setPacketToDelete(null);
        fetchPackets();
      } else {
        console.error('Gagal menghapus paket.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = (id: number) => {
    setPacketToDelete(id);
  };

  const handleEdit = (packet: Packet) => {
    setEditingPacket(packet);
    setPrice(String(packet.price));
    setShowForm(true);
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 text-slate-800">
      <div className="bg-white p-8 rounded-[2.5rem] shadow-xl shadow-slate-200/50 border border-slate-100 flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-black tracking-tight">Katalog Layanan</h2>
          <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-1">Total: {packets.length} Pilihan Paket</p>
        </div>
        <button 
          onClick={() => {
            if (showForm) {
              setEditingPacket(null);
              setPrice('');
            }
            setShowForm(!showForm);
          }} 
          className={cn(
            "w-14 h-14 rounded-2xl transition-all active:scale-95 shadow-lg flex items-center justify-center",
            showForm ? "bg-rose-500 text-white shadow-rose-200" : "bg-indigo-600 text-white shadow-indigo-200"
          )}
        >
          {showForm ? <X className="w-8 h-8" /> : <PlusCircle className="w-8 h-8" />}
        </button>
      </div>

      <AnimatePresence>
        {showForm && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-2xl shadow-indigo-500/10">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-6 px-1 italic">
              {editingPacket ? 'Perbarui Rincian Paket' : 'Buat Penawaran Paket Baru'}
            </h3>
            <form onSubmit={handleSave} className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nama Layanan</label>
                 <input name="name" defaultValue={editingPacket?.name} placeholder="mis: 10Mbps Gold" className="w-full bg-slate-50 border-none h-14 px-6 rounded-2xl font-bold text-slate-700 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all" required />
              </div>
              <div className="space-y-2">
                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Harga Bulanan</label>
                 <FormattedNumberInput 
                    name="price"
                    value={price}
                    onChange={(val) => setPrice(val)}
                    placeholder="mis: 150.000" 
                    className="w-full bg-slate-50 border-none h-14 px-6 rounded-2xl font-bold text-slate-700 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all" 
                    required 
                 />
              </div>
              <button type="submit" className="md:col-span-2 w-full bg-indigo-600 text-white py-5 rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-indigo-200 active:scale-[0.98] transition-all">
                {editingPacket ? 'Simpan Perubahan' : 'Simpan Katalog'}
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {packets.map(p => (
           <motion.div 
             key={p.id} 
             layout
             whileHover={{ y: -5 }}
             className="bg-white p-7 rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-2xl hover:shadow-indigo-500/5 transition-all group relative overflow-hidden"
           >
              <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-50 rounded-bl-[5rem] -mr-8 -mt-8 opacity-40 transition-transform group-hover:scale-110" />
              <div className="flex justify-between items-start mb-6">
                 <div className="w-14 h-14 bg-slate-900 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-slate-200 rotate-3 group-hover:rotate-0 transition-transform">
                    <Zap className="w-7 h-7" />
                 </div>
                 <div className="flex gap-2">
                    <button onClick={() => handleEdit(p)} className="w-10 h-10 bg-slate-50 text-slate-300 hover:text-indigo-600 rounded-xl flex items-center justify-center transition-all">
                       <Edit2 className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDelete(p.id)} className="w-10 h-10 bg-slate-50 text-slate-300 hover:text-rose-600 rounded-xl flex items-center justify-center transition-all">
                       <Trash2 className="w-4 h-4" />
                    </button>
                 </div>
              </div>
              
              <h4 className="text-xl font-black text-slate-800 tracking-tight mb-1">{p.name}</h4>
              <div className="flex items-center gap-2 mb-6">
                 <Tag className="w-3 h-3 text-indigo-500" />
                 <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">Base Plan</span>
              </div>
              
              <div className="pt-6 border-t border-slate-50">
                 <div className="flex items-baseline gap-1">
                    <span className="text-sm font-bold text-slate-400">Rp</span>
                    <span className="text-3xl font-black text-slate-900 tracking-tighter tabular-nums">
                       {(p.price || 0).toLocaleString()}
                    </span>
                    <span className="text-xs font-bold text-slate-300 uppercase tracking-widest ml-1">/ Bln</span>
                 </div>
              </div>
           </motion.div>
        ))}
      </div>

      <ConfirmationModal 
        isOpen={!!packetToDelete}
        title="Hapus Paket Layanan?"
        message="Hati-hati! Paket yang dihapus tidak tersedia lagi untuk registrasi pelanggan baru. Anda yakin ingin menghapus ini?"
        onConfirm={confirmDelete}
        onCancel={() => setPacketToDelete(null)}
      />
    </div>
  );
}
