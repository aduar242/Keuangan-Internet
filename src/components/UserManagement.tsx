import React, { useState, useEffect } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { motion } from 'motion/react';
import { User } from '../types';
import { cn } from '../lib/utils';

export default function UserManagement({ user, refreshTrigger }: { user: User, refreshTrigger?: number }) {
  const [users, setUsers] = useState<User[]>([]);
  const [showForm, setShowForm] = useState(false);

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/users', { headers: { 'x-user-id': String(user.id) } });
      if (res.ok) setUsers(await res.json());
    } catch (err) {
      console.error('Failed to fetch users:', err);
    }
  };

  useEffect(() => { fetchUsers(); }, [refreshTrigger]);

  const handleAdd = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    try {
      const formData = new FormData(e.currentTarget);
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-id': String(user.id) },
        body: JSON.stringify(Object.fromEntries(formData))
      });
      if (res.ok) {
        setShowForm(false);
        fetchUsers();
      } else {
        const errorData = await res.json();
        alert(errorData.error || 'Gagal menyimpan petugas.');
      }
    } catch (err) {
      console.error(err);
      alert('Terjadi kesalahan koneksi saat menyimpan petugas.');
    }
  };

  const handleDelete = async (id: number) => {
    if (id === user.id) return alert('Tidak bisa menghapus akun sendiri!');
    if (!confirm('Hapus petugas ini?')) return;
    try {
      const res = await fetch(`/api/users/${id}`, { method: 'DELETE', headers: { 'x-user-id': String(user.id) } });
      if (res.ok) {
        fetchUsers();
      } else {
        const errorData = await res.json();
        alert(errorData.error || 'Gagal menghapus petugas.');
      }
    } catch (err) {
      console.error(err);
      alert('Terjadi kesalahan koneksi saat menghapus petugas.');
    }
  };

  return (
    <div className="space-y-6">
      <header className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Tim Penagih</h2>
          <p className="text-slate-500">Kelola hak akses petugas lapangan</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-xl font-bold transition-all active:scale-95">
          <Plus className="w-5 h-5" /> Tambah Petugas
        </button>
      </header>

      {showForm && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-lg">
          <form onSubmit={handleAdd} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input name="name" placeholder="Nama Lengkap" className="bg-slate-50 border-slate-100 p-3 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all font-medium" required />
            <input name="username" placeholder="Username Login" className="bg-slate-50 border-slate-100 p-3 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all font-medium" required />
            <input name="password" type="password" placeholder="Password" className="bg-slate-50 border-slate-100 p-3 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all font-medium" required />
            <select name="role" className="bg-slate-50 border-slate-100 p-3 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all font-medium">
              <option value="penagih">Penagih (Restricted)</option>
              <option value="admin">Admin (Full Access)</option>
            </select>
            <button type="submit" className="md:col-span-2 bg-indigo-600 text-white py-3 rounded-xl font-bold shadow-lg shadow-indigo-100 active:scale-95 transition-all">Daftarkan User</button>
          </form>
        </motion.div>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        {/* Mobile View: Cards */}
        <div className="md:hidden divide-y divide-slate-100">
          {users.map(u => (
            <div key={u.id} className="p-4 flex items-center justify-between">
              <div>
                <div className="font-bold text-slate-900">{u.name}</div>
                <div className="text-xs text-slate-400 font-mono italic">{u.username}</div>
                <span className={cn(
                  "text-[9px] font-black px-2 py-0.5 rounded-full uppercase mt-1 inline-block",
                  u.role === 'admin' ? "bg-indigo-100 text-indigo-700" : "bg-orange-100 text-orange-700"
                )}>{u.role}</span>
              </div>
              <button 
                onClick={() => handleDelete(u.id)} 
                className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-300 hover:text-rose-600 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>

        {/* Desktop View: Table */}
        <div className="hidden md:block">
          <table className="w-full text-left font-sans">
            <thead className="bg-slate-50 text-slate-400 text-xs uppercase font-bold">
              <tr>
                <th className="px-6 py-4">Nama</th>
                <th className="px-6 py-4">Username</th>
                <th className="px-6 py-4">Role</th>
                <th className="px-6 py-4 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.map(u => (
                <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 font-bold text-slate-900">{u.name}</td>
                  <td className="px-6 py-4 text-slate-500 font-mono">{u.username}</td>
                  <td className="px-6 py-4">
                    <span className={cn(
                      "text-[10px] font-bold px-2 py-0.5 rounded-full uppercase",
                      u.role === 'admin' ? "bg-indigo-100 text-indigo-700" : "bg-orange-100 text-orange-700"
                    )}>{u.role}</span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <button onClick={() => handleDelete(u.id)} className="text-slate-300 hover:text-rose-600 transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
