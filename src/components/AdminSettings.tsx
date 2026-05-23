import React, { useState, useEffect } from 'react';
import { 
  Settings, 
  LayoutDashboard, 
  FileText, 
  RefreshCw, 
  Check, 
  Printer, 
  WifiOff, 
  Download, 
  Trash2 
} from 'lucide-react';
import { User, AppSettings } from '../types';

export default function AdminSettings({ user, deferredPrompt, onInstall, refreshTrigger }: { user: User, deferredPrompt?: any, onInstall?: () => void, refreshTrigger?: number }) {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [resetConfirmation, setResetConfirmation] = useState('');

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/settings', {
        headers: { 'x-user-id': String(user.id) }
      });
      if (res.ok) {
        setSettings(await res.json());
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchSettings(); }, [refreshTrigger]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);
    try {
      const formData = new FormData(e.currentTarget);
      const data = {
        company_name: formData.get('company_name'),
        company_address: formData.get('company_address'),
        company_phone: formData.get('company_phone'),
        receipt_footer: formData.get('receipt_footer'),
        currency_symbol: formData.get('currency_symbol'),
      };

      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'x-user-id': String(user.id) },
        body: JSON.stringify(data)
      });

      if (res.ok) {
        alert('Pengaturan berhasil disimpan!');
        fetchSettings();
      } else {
        alert('Gagal menyimpan pengaturan.');
      }
    } catch (err) {
      console.error(err);
      alert('Terjadi kesalahan saat menyimpan.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div>Memuat...</div>;

  return (
    <div className="space-y-8 max-w-4xl mx-auto pb-20">
      <header className="flex items-center gap-4">
        <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-indigo-200">
           <Settings className="w-7 h-7" />
        </div>
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">Pengaturan Sistem</h2>
          <p className="text-slate-500 text-sm">Kelola pengaturan perangkat dan identitas aplikasi</p>
        </div>
      </header>

      {user.role === 'admin' && (
        <form onSubmit={handleSubmit} className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden">
          <div className="p-8 space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <h3 className="font-black text-slate-800 uppercase tracking-widest text-xs flex items-center gap-2">
                  <LayoutDashboard className="w-4 h-4 text-indigo-500" /> Identitas Bisnis
                </h3>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Nama Perusahaan / RT/RW Net</label>
                <input 
                  name="company_name"
                  defaultValue={settings?.company_name}
                  className="w-full bg-slate-50 border-slate-100 p-3 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all font-bold h-12" 
                  placeholder="Contoh: KONEKSINET"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Nomor Kontak (WhatsApp)</label>
                <input 
                  name="company_phone"
                  defaultValue={settings?.company_phone}
                  className="w-full bg-slate-50 border-slate-100 p-3 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all font-mono h-12" 
                  placeholder="0812-XXXX-XXXX"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Simbol Mata Uang</label>
                <input 
                  name="currency_symbol"
                  defaultValue={settings?.currency_symbol}
                  className="w-full bg-slate-50 border-slate-100 p-3 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all font-bold h-12 w-24 text-center" 
                  placeholder="Rp"
                />
              </div>
            </div>
            <div className="space-y-4"></div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <h3 className="font-black text-slate-800 uppercase tracking-widest text-xs flex items-center gap-2">
                <FileText className="w-4 h-4 text-emerald-500" /> Konfigurasi Struk
              </h3>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Alamat (Untuk Struk)</label>
                <textarea 
                  name="company_address"
                  defaultValue={settings?.company_address}
                  className="w-full bg-slate-50 border-slate-100 p-3 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all text-sm min-h-[100px] py-3" 
                  placeholder="Alamat lengkap usaha"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Footer Struk (Terima Kasih)</label>
                <textarea 
                  name="receipt_footer"
                  defaultValue={settings?.receipt_footer}
                  className="w-full bg-slate-50 border-slate-100 p-3 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all text-sm min-h-[100px] py-3" 
                  placeholder="Pesan di bawah struk"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="p-8 bg-slate-50 border-t border-slate-100 flex justify-end">
           <button 
             type="submit" 
             disabled={saving}
             className="bg-indigo-600 hover:bg-black text-white font-black px-10 py-4 rounded-2xl shadow-xl shadow-indigo-200 transition-all active:scale-95 disabled:opacity-50 flex items-center gap-2"
           >
             {saving ? (
               <>
                 <RefreshCw className="w-5 h-5 animate-spin" />
                 MENYIMPAN...
               </>
             ) : (
               <>
                 <Check className="w-5 h-5" />
                 SIMPAN PERUBAHAN
               </>
             )}
           </button>
        </div>
      </form>
      )}

      <form onSubmit={async (e) => {
         e.preventDefault();
         const formData = new FormData(e.currentTarget);
         const password = formData.get('password') as string;
         if (!password) return;
         try {
           const res = await fetch('/api/users/me', {
             method: 'PUT',
             headers: { 'Content-Type': 'application/json', 'x-user-id': String(user.id) },
             body: JSON.stringify({ password })
           });
           if (res.ok) {
             alert('Password berhasil diperbarui.');
             (e.target as HTMLFormElement).reset();
           } else {
             alert('Gagal memperbarui password.');
           }
         } catch(err) {
           alert('Kesalahan koneksi.');
         }
      }} className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden">
        <div className="p-8 space-y-6">
          <h3 className="font-black text-slate-800 uppercase tracking-widest text-xs flex items-center gap-2">
            Profil Saya
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-end">
            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Username Login</label>
                <input disabled defaultValue={user.username} className="w-full bg-slate-50 border-none h-14 px-6 rounded-2xl font-bold text-slate-400 outline-none" />
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Nama Petugas</label>
                <input disabled defaultValue={user.name} className="w-full bg-slate-50 border-none h-14 px-6 rounded-2xl font-bold text-slate-400 outline-none" />
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Password Baru</label>
              <input name="password" minLength={6} placeholder="Ketik password baru..." className="w-full bg-slate-50 border-none h-14 px-6 rounded-2xl font-bold text-slate-700 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all mb-4" />
              <button type="submit" className="w-full bg-slate-900 hover:bg-black text-white font-black py-4 rounded-2xl transition-all active:scale-95 text-xs uppercase tracking-widest">
                Update Password
              </button>
            </div>
          </div>
        </div>
      </form>

      <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden">
        <div className="p-8 space-y-6">
          <h3 className="font-black text-slate-800 uppercase tracking-widest text-xs flex items-center gap-2">
            <Printer className="w-4 h-4 text-amber-500" /> Thermal Printer Integration
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Connection Status</p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center">
                  <WifiOff className="w-5 h-5" />
                </div>
                <div>
                   <p className="text-sm font-bold text-slate-700">Printer Disconnected</p>
                   <p className="text-[10px] text-slate-400 font-medium">Buka menu browser pada HP dan pilih 'Print' atau 'Share to Printer' untuk mencoba koneksi.</p>
                </div>
              </div>
            </div>
            <div className="flex flex-col justify-center gap-3">
              <button 
                onClick={() => window.print()}
                className="bg-white border-2 border-slate-200 text-slate-600 font-black py-4 rounded-2xl hover:bg-slate-50 transition-all flex items-center justify-center gap-2 text-xs uppercase tracking-widest"
              >
                <Printer className="w-4 h-4" /> Test Direct Print
              </button>
              <p className="text-center text-[9px] text-slate-400 font-bold uppercase tracking-widest leading-loose">
                Supports: 58mm / 80mm ESC/POS Thermal Printers<br/>
                Via Bluetooth / USB / Network
              </p>
            </div>
          </div>
        </div>
      </div>

      {deferredPrompt && (
        <div className="bg-gradient-to-br from-indigo-700 to-slate-900 rounded-[2.5rem] p-8 shadow-2xl shadow-indigo-200/50 border border-indigo-400/20 flex flex-col md:flex-row items-center justify-between gap-8 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full -mr-32 -mt-32 blur-3xl"></div>
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-500/5 rounded-full -ml-32 -mb-32 blur-3xl"></div>
          
          <div className="flex items-center gap-6 relative z-10">
            <div className="w-20 h-20 bg-white/10 rounded-3xl flex items-center justify-center text-white border border-white/20 shadow-inner">
              <Download className="w-10 h-10" />
            </div>
            <div>
              <h3 className="text-2xl font-black text-white tracking-tighter leading-none mb-2">Aplikasi Mobile Ready</h3>
              <p className="text-indigo-200 font-bold text-sm max-w-[300px] leading-relaxed">Pasang aplikasi ke layar utama untuk pengalaman yang lebih cepat, offline, dan stabil.</p>
            </div>
          </div>
          <button 
            onClick={onInstall}
            className="w-full md:w-auto bg-white text-indigo-700 hover:bg-indigo-50 px-10 py-5 rounded-2xl font-black text-xs uppercase tracking-[0.25em] shadow-2xl active:scale-95 transition-all relative z-10 flex items-center justify-center gap-3 lg:min-w-[200px]"
          >
            Install Sekarang
          </button>
        </div>
      )}

      {user.role === 'admin' && (
        <div className="bg-rose-50/70 rounded-[2.5rem] border border-rose-200 overflow-hidden mt-12 animate-in fade-in slide-in-from-bottom-4">
          <div className="p-8 space-y-6">
            <div className="flex items-center gap-4">
               <div className="w-14 h-14 bg-rose-500 rounded-3xl flex items-center justify-center text-white shadow-2xl shadow-rose-200">
                  <Trash2 className="w-8 h-8" />
               </div>
               <div>
                  <h3 className="text-xl font-black text-rose-600 tracking-tight">Danger Zone</h3>
                  <p className="text-rose-500/80 text-sm font-bold uppercase tracking-widest text-[10px]">Tindakan Tidak Terpulihkan</p>
               </div>
            </div>
            
            <div className="bg-white p-8 rounded-[2rem] border border-rose-100 flex flex-col lg:flex-row lg:items-center justify-between gap-8 shadow-sm">
               <div className="max-w-md">
                  <h4 className="font-black text-slate-800 text-lg">Kosongkan Database</h4>
                  <p className="text-sm text-slate-500 mt-2 leading-relaxed">
                    Menghapus seluruh data <strong>Pelanggan</strong> dan <strong>Riwayat Transaksi</strong>. 
                    Akun Petugas dan Pengaturan Bisnis tetap aman. Gunakan ini jika ingin mulai dari awal (Test over).
                  </p>
               </div>
               <div className="flex flex-col gap-3">
                 <input 
                   type="text" 
                   placeholder='Ketik "KONFIRMASI"' 
                   value={resetConfirmation}
                   onChange={e => setResetConfirmation(e.target.value)}
                   className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 text-center uppercase focus:ring-2 focus:ring-rose-500/20 outline-none"
                 />
                 <button 
                   disabled={resetConfirmation !== 'KONFIRMASI'}
                   onClick={async () => {
                     if (resetConfirmation === 'KONFIRMASI') {
                         try {
                            const res = await fetch('/api/admin/reset-database', {
                              method: 'POST',
                              headers: { 'x-user-id': String(user.id) }
                            });
                            if (res.ok) {
                              setResetConfirmation('');
                              window.location.reload();
                            }
                         } catch (err) {
                            console.error(err);
                         }
                     }
                   }}
                   className="bg-rose-500 disabled:opacity-50 hover:bg-black text-white font-black px-10 py-5 rounded-2xl shadow-xl shadow-rose-200 transition-all active:scale-95 text-xs uppercase tracking-[0.2em] flex items-center justify-center gap-3"
                 >
                   <Trash2 className="w-5 h-5" />
                   Reset Database
                 </button>
               </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
