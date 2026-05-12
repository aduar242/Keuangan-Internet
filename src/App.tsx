import React, { useState, useEffect } from 'react';
import { 
  BarChart3, 
  Wallet, 
  ArrowUpCircle, 
  ArrowDownCircle, 
  LogOut, 
  Plus, 
  History, 
  Trash2,
  PieChart,
  User as UserIcon,
  Search,
  LayoutDashboard,
  Coins,
  Printer,
  Target,
  Users as UsersIcon,
  Users2,
  CalendarCheck2,
  Check,
  Lock,
  FileText,
  Download,
  Phone,
  Calendar,
  RefreshCw,
  ArrowRightCircle,
  Settings,
  UserPlus,
  WifiOff,
  Wifi,
  MapPin,
  AlertTriangle,
  X,
  CheckCircle,
  ArrowLeft,
  PlusCircle,
  MinusCircle,
  UserCheck,
  UserX,
  Home,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { User, Transaction, DashboardStats, Customer, Packet, AppSettings } from './types';
import { cn } from './lib/utils';
import { generateInvoicePDF } from './lib/pdf';
import { io, Socket } from 'socket.io-client';

const socket: Socket = io();

function FormattedNumberInput({ value, onChange, placeholder, className, required, name }: { value: string, onChange: (val: string) => void, placeholder?: string, className?: string, required?: boolean, name?: string }) {
  const [displayValue, setDisplayValue] = useState('');

  useEffect(() => {
    if (!value) {
      setDisplayValue('');
      return;
    }
    const numeric = String(value).replace(/\D/g, '');
    setDisplayValue(new Intl.NumberFormat('id-ID').format(Number(numeric)));
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value.replace(/\D/g, '');
    onChange(rawValue);
  };

  return (
    <>
      <input 
        type="text"
        placeholder={placeholder}
        className={className}
        required={required}
        value={displayValue}
        onChange={handleChange}
      />
      {name && <input type="hidden" name={name} value={value} />}
    </>
  );
}

const CATEGORIES = {
  pemasukan: ['Tagihan Bulanan', 'Voucher', 'Pemasangan Baru', 'Denda', 'Lainnya'],
  pengeluaran: ['ISP Pusat', 'Alat', 'Operasional', 'Gaji', 'Sewa Tempat', 'Lainnya']
};

const getBillingPeriods = () => {
  const periods = [];
  const now = new Date();
  for (let i = -12; i <= 3; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    periods.push(d.toISOString().slice(0, 7));
  }
  return periods.sort();
};

const formatPeriod = (period: string) => {
  if (!period) return '';
  const [year, month] = period.split('-');
  const monthNames = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];
  return `${monthNames[parseInt(month) - 1]} ${year}`;
};

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [printerStatus, setPrinterStatus] = useState<'not_connected' | 'checking' | 'ready'>('not_connected');
  const [receiptToPreview, setReceiptToPreview] = useState<{ transaction: Transaction; userName: string } | null>(null);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    socket.on('transaction:created', () => setRefreshTrigger(prev => prev + 1));
    socket.on('transaction:deleted', () => setRefreshTrigger(prev => prev + 1));
    socket.on('customer:updated', () => setRefreshTrigger(prev => prev + 1));
    socket.on('packet:updated', () => setRefreshTrigger(prev => prev + 1));
    socket.on('settings:updated', (newSettings) => setSettings(newSettings));
    socket.on('deposit:updated', () => setRefreshTrigger(prev => prev + 1));

    return () => {
      socket.off('transaction:created');
      socket.off('transaction:deleted');
      socket.off('customer:updated');
      socket.off('packet:updated');
      socket.off('settings:updated');
      socket.off('deposit:updated');
    };
  }, []);

  useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
    }
  };

  const fetchSettings = async (userId: number) => {
    try {
      const res = await fetch('/api/settings', {
        headers: { 'x-user-id': String(userId) }
      });
      if (res.ok) {
        setSettings(await res.json());
      }
    } catch (err) {
      console.error("Failed to fetch settings:", err);
    }
  };

  const checkPrinter = async () => {
    setPrinterStatus('checking');
    setTimeout(() => {
      if ('print' in window) {
        setPrinterStatus('ready');
      } else {
        setPrinterStatus('not_connected');
      }
    }, 1000);
  };

  useEffect(() => {
    checkPrinter();
  }, []);

  useEffect(() => {
    const initAuth = async () => {
      const savedUser = localStorage.getItem('user') || sessionStorage.getItem('user');
      if (savedUser) {
        try {
          const userObj = JSON.parse(savedUser);
          const res = await fetch('/api/me', {
            headers: { 'x-user-id': String(userObj.id) }
          });
          if (res.ok) {
            const data = await res.json();
            setUser(data);
            fetchSettings(data.id);
            // Sync with storage in case user data changed
            if (localStorage.getItem('user')) {
              localStorage.setItem('user', JSON.stringify(data));
            } else {
              sessionStorage.setItem('user', JSON.stringify(data));
            }
          } else {
            localStorage.removeItem('user');
            sessionStorage.removeItem('user');
          }
        } catch (e) {
          console.error("Auth init error:", e);
        }
      }
      setLoading(false);
    };
    initAuth();
  }, []);

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    try {
      const formData = new FormData(e.currentTarget);
      const username = formData.get('username');
      const password = formData.get('password');
      const remember = formData.get('remember') === 'on';

      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      if (res.ok) {
        const data = await res.json();
        setUser(data);
        fetchSettings(data.id);
        if (remember) {
          localStorage.setItem('user', JSON.stringify(data));
        } else {
          sessionStorage.setItem('user', JSON.stringify(data));
        }
      } else {
        const errorData = await res.json();
        alert(errorData.error || 'Login gagal. Periksa username dan password.');
      }
    } catch (err) {
      console.error(err);
      alert('Terjadi kesalahan koneksi saat login.');
    }
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('user');
    sessionStorage.removeItem('user');
  };

  if (loading) return null;

  if (!user) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-slate-50 transition-colors duration-500">
      {/* Sidebar - Desktop */}
      <aside className="hidden md:flex w-64 bg-slate-900 border-r border-slate-800 flex-col p-6 space-y-8 sticky top-0 h-screen">
        <div className="flex items-center gap-3 text-white">
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <Coins className="w-6 h-6" />
          </div>
          <div>
            <h1 className="font-bold text-lg leading-tight uppercase tracking-wider">{settings?.company_name || 'RT/RW NET'}</h1>
            <p className="text-[10px] text-slate-400 font-medium">FINANCE ADMIN v1.0</p>
          </div>
        </div>

        <nav className="flex-1 space-y-1">
          <SidebarLink active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} icon={<LayoutDashboard className="w-5 h-5" />} label="Dashboard" />
          <SidebarLink active={activeTab === 'customers'} onClick={() => setActiveTab('customers')} icon={<UsersIcon className="w-5 h-5" />} label="Pelanggan" />
          {user.role === 'admin' && (
            <>
              <SidebarLink active={activeTab === 'packets'} onClick={() => setActiveTab('packets')} icon={<BarChart3 className="w-5 h-5" />} label="Paket Internet" />
              <SidebarLink active={activeTab === 'users'} onClick={() => setActiveTab('users')} icon={<Users2 className="w-5 h-5" />} label="User Penagih" />
              <SidebarLink active={activeTab === 'reports'} onClick={() => setActiveTab('reports')} icon={<CalendarCheck2 className="w-5 h-5" />} label="Laporan Pembayaran" />
              <SidebarLink active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} icon={<Settings className="w-5 h-5" />} label="Pengaturan" />
            </>
          )}
          <SidebarLink active={activeTab === 'history'} onClick={() => setActiveTab('history')} icon={<History className="w-5 h-5" />} label="Riwayat" />
        </nav>

        {deferredPrompt && (
          <div className="bg-gradient-to-br from-indigo-600 to-indigo-700 rounded-2xl p-4 shadow-xl shadow-indigo-200 mb-4 mx-2 border border-indigo-400/30">
            <p className="text-[10px] font-black text-indigo-100 uppercase tracking-widest mb-1">Dapatkan Akses Cepat</p>
            <p className="text-xs font-bold text-white mb-3">Install Aplikasi ke Beranda</p>
            <button 
              onClick={handleInstallClick}
              className="w-full py-2.5 bg-white text-indigo-600 font-black text-[10px] rounded-xl shadow-lg active:scale-95 transition-all uppercase tracking-widest"
            >
              INSTALL APP
            </button>
          </div>
        )}

        <div className="bg-slate-800/50 rounded-2xl p-4 border border-slate-700/50 mb-4 mx-2">
          <div className="flex items-center gap-3 mb-3">
            <div className={cn(
              "w-9 h-9 rounded-xl flex items-center justify-center transition-all",
              printerStatus === 'ready' ? "bg-emerald-500/10 text-emerald-400 shadow-inner" : "bg-rose-500/10 text-rose-400 shadow-inner"
            )}>
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest leading-none mb-1">Thermal Printer</p>
              <p className={cn("text-xs font-bold leading-none", printerStatus === 'ready' ? "text-emerald-400" : "text-rose-400")}>
                {printerStatus === 'ready' ? 'TERHUBUNG' : 
                 printerStatus === 'checking' ? 'MENGECEK...' : 'TIDAK AKTIF'}
              </p>
            </div>
          </div>
          <button 
            onClick={checkPrinter}
            disabled={printerStatus === 'checking'}
            className="w-full py-2 bg-slate-700/50 hover:bg-slate-700 text-slate-300 text-[10px] font-black rounded-lg transition-all flex items-center justify-center gap-1.5 border border-slate-600/50 active:scale-95"
          >
            <RefreshCw className={cn("w-3 h-3", printerStatus === 'checking' && "animate-spin")} />
            REFRESH KONEKSI
          </button>
        </div>

        <div className="pt-6 border-t border-slate-800 space-y-4">
          <div className="flex items-center gap-3 px-2">
            <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold text-white uppercase">
              {user.name.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{user.name}</p>
              <p className="text-xs text-slate-500 capitalize">{user.role}</p>
            </div>
          </div>
          <button 
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-2 py-2 text-slate-400 hover:text-red-400 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span className="text-sm font-medium">Keluar</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 px-4 py-8 md:px-8 md:py-10 pb-32 md:pb-10 overflow-x-hidden">
        {/* Mobile Header */}
        <div className="md:hidden flex items-center justify-between mb-8">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-200">
              <Coins className="w-6 h-6 text-white" />
            </div>
            <div>
              <span className="block font-black text-slate-900 tracking-tighter text-lg leading-none">{settings?.company_name || 'RT/RW NET'}</span>
              <div className="flex items-center gap-1.5 mt-1">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{user.role}</span>
                <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                <button 
                  onClick={checkPrinter}
                  disabled={printerStatus === 'checking'}
                  className="flex items-center gap-1 active:scale-95 transition-transform"
                >
                  <div className={cn("w-1.5 h-1.5 rounded-full", printerStatus === 'ready' ? "bg-emerald-500" : "bg-rose-500")}></div>
                  <span className="text-[9px] font-bold text-slate-400 uppercase">PRINTER {printerStatus === 'ready' ? 'SIAP' : (printerStatus === 'checking' ? '...' : 'OFF')}</span>
                </button>
              </div>
            </div>
          </div>
          <button 
            className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200 active:scale-95 transition-all"
            onClick={handleLogout}
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>

        {deferredPrompt && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="md:hidden mb-6 bg-indigo-600 rounded-2xl p-4 flex items-center justify-between shadow-lg shadow-indigo-100 border border-indigo-400/50"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center text-white">
                <Download className="w-5 h-5" />
              </div>
              <div>
                <p className="text-white font-black text-sm tracking-tight">Install App</p>
                <p className="text-indigo-100 text-[10px] font-bold">Akses cepat ke peranti anda</p>
              </div>
            </div>
            <button 
              onClick={handleInstallClick}
              className="bg-white text-indigo-600 px-4 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest active:scale-95 transition-all"
            >
              PASANG
            </button>
          </motion.div>
        )}

        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            transition={{ duration: 0.2 }}
          >
            {user.role === 'admin' ? (
              <>
                {activeTab === 'dashboard' && <AdminDashboard user={user} settings={settings} refreshTrigger={refreshTrigger} setRefreshTrigger={setRefreshTrigger} onShowReceipt={(t, u) => setReceiptToPreview({ transaction: t, userName: u })} />}
                {activeTab === 'customers' && <CustomerManagement user={user} refreshTrigger={refreshTrigger} />}
                {activeTab === 'packets' && <PacketManagement user={user} refreshTrigger={refreshTrigger} />}
                {activeTab === 'users' && <UserManagement user={user} refreshTrigger={refreshTrigger} />}
                {activeTab === 'reports' && <PaymentReport user={user} refreshTrigger={refreshTrigger} />}
                {activeTab === 'settings' && (
                  <SettingsManagement 
                    user={user} 
                    deferredPrompt={deferredPrompt} 
                    onInstall={handleInstallClick} 
                    refreshTrigger={refreshTrigger}
                  />
                )}
                {activeTab === 'history' && <AdminDashboard user={user} settings={settings} refreshTrigger={refreshTrigger} setRefreshTrigger={setRefreshTrigger} onShowReceipt={(t, u) => setReceiptToPreview({ transaction: t, userName: u })} />}
              </>
            ) : (
              <>
                {activeTab === 'dashboard' && <CollectorDashboard user={user} settings={settings} refreshTrigger={refreshTrigger} setRefreshTrigger={setRefreshTrigger} onShowReceipt={(t, u) => setReceiptToPreview({ transaction: t, userName: u })} />}
                {activeTab === 'customers' && <CustomerManagement user={user} refreshTrigger={refreshTrigger} />}
                {activeTab === 'history' && <CollectorDashboard user={user} settings={settings} refreshTrigger={refreshTrigger} setRefreshTrigger={setRefreshTrigger} onShowReceipt={(t, u) => setReceiptToPreview({ transaction: t, userName: u })} />}
              </>
            )}
          </motion.div>
        </AnimatePresence>

        <MobileNav activeTab={activeTab} setActiveTab={setActiveTab} user={user} />
      </main>

      {/* Global Modals */}
      <AnimatePresence>
        {receiptToPreview && (
          <ReceiptPreviewModal 
            transaction={receiptToPreview.transaction} 
            userName={receiptToPreview.userName} 
            settings={settings} 
            onClose={() => setReceiptToPreview(null)} 
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function SidebarLink({ icon, label, onClick, active = false }: { icon: React.ReactNode, label: string, onClick?: () => void, active?: boolean }) {
  return (
    <button onClick={onClick} className={cn(
      "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all text-left",
      active ? "bg-indigo-600/10 text-indigo-400" : "hover:bg-slate-800 hover:text-white"
    )}>
      {icon}
      {label}
    </button>
  );
}

function MobileNav({ activeTab, setActiveTab, user }: { activeTab: string, setActiveTab: (t: string) => void, user: User }) {
  return (
    <nav className="md:hidden fixed bottom-6 left-1/2 -translate-x-1/2 w-[92%] max-w-sm bg-white shadow-xl px-6 py-4 rounded-[2.5rem] flex items-center justify-between z-[100] border border-slate-200 ring-1 ring-black/5">
      <MobileNavItem active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} icon={<Home className="w-7 h-7" />} label="Utama" />
      <MobileNavItem active={activeTab === 'customers'} onClick={() => setActiveTab('customers')} icon={<UsersIcon className="w-7 h-7" />} label="Pelanggan" />
      {user.role === 'admin' ? (
        <MobileNavItem active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} icon={<Settings className="w-7 h-7" />} label="Menu" />
      ) : (
        <MobileNavItem active={activeTab === 'history'} onClick={() => setActiveTab('history')} icon={<History className="w-7 h-7" />} label="Riwayat" />
      )}
    </nav>
  );
}

function MobileNavItem({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: React.ReactNode, label?: string }) {
  return (
    <button onClick={onClick} className={cn(
      "flex flex-col items-center justify-center p-2 rounded-2xl transition-all duration-300 relative min-w-[70px]",
      active ? "text-indigo-600 scale-110" : "text-slate-400"
    )}>
      <div className={cn(
        "p-2 rounded-2xl transition-all",
        active ? "bg-indigo-50" : ""
      )}>
        {icon}
      </div>
      {label && <span className={cn("text-[10px] font-black uppercase tracking-widest mt-1", active ? "text-indigo-600" : "text-slate-400")}>{label}</span>}
      {active && (
        <motion.div 
          layoutId="mobile-nav-indicator"
          className="absolute -bottom-1 w-6 h-1 bg-indigo-600 rounded-full"
        />
      )}
    </button>
  );
}

function LoginScreen({ onLogin }: { onLogin: (e: React.FormEvent<HTMLFormElement>) => void }) {
  return (
    <div className="min-h-screen bg-[#0a0c10] flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Abstract Background Design */}
      <div className="absolute top-[-15%] left-[-10%] w-[50%] h-[50%] bg-indigo-600/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-15%] right-[-10%] w-[50%] h-[50%] bg-emerald-600/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-[0.02] pointer-events-none" />

      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md relative z-10"
      >
        <div className="text-center mb-12">
          <motion.div 
            whileHover={{ rotate: 10, scale: 1.05 }}
            className="w-24 h-24 bg-indigo-600 rounded-[2.5rem] flex items-center justify-center mx-auto mb-8 shadow-[0_20px_50px_rgba(79,70,229,0.3)] border-t-4 border-indigo-400 relative overflow-hidden group"
          >
            <div className="absolute inset-0 bg-gradient-to-tr from-white/0 to-white/20 opacity-0 group-hover:opacity-100 transition-opacity" />
            <Coins className="w-12 h-12 text-white relative z-10" />
          </motion.div>
          <h1 className="text-5xl font-black text-white tracking-tighter uppercase mb-2 bg-clip-text text-transparent bg-gradient-to-b from-white to-white/60">NET CORE <span className="text-indigo-400 italic">PAY</span></h1>
          <div className="flex items-center justify-center gap-3">
             <div className="h-[1px] w-8 bg-slate-800" />
             <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.4em] font-mono whitespace-nowrap">Billing OS v2.4.0</p>
             <div className="h-[1px] w-8 bg-slate-800" />
          </div>
        </div>

        <div className="bg-[#11141b] border border-white/5 p-10 rounded-[3rem] shadow-xl relative">
          <div className="absolute -top-4 -right-4 bg-indigo-600 text-white text-[9px] font-black px-3 py-1 rounded-full shadow-lg border border-indigo-400 uppercase tracking-widest">PRO EDITION</div>
          
          <form onSubmit={onLogin} className="space-y-8">
            <div className="space-y-3">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] ml-1 text-left block">Identity Access</label>
              <div className="relative group">
                <div className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-indigo-400 transition-colors">
                  <UserIcon className="w-5 h-5" />
                </div>
                <input 
                  type="text" 
                  name="username"
                  placeholder="USERNAME"
                  className="w-full bg-[#0a0c10]/50 border border-slate-800 text-white h-16 pl-14 pr-4 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500/50 outline-none transition-all font-black text-sm tracking-widest placeholder:text-slate-700 placeholder:font-bold"
                  required
                />
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] ml-1 text-left block">Security Token</label>
              <div className="relative group">
                <div className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-indigo-400 transition-colors">
                  <Lock className="w-5 h-5" />
                </div>
                <input 
                  type="password" 
                  name="password"
                  placeholder="PASSWORD"
                   className="w-full bg-[#0a0c10]/50 border border-slate-800 text-white h-16 pl-14 pr-4 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500/50 outline-none transition-all font-black text-sm tracking-widest placeholder:text-slate-700 placeholder:font-bold"
                  required
                />
              </div>
            </div>

            <button 
              type="submit" 
              className="w-full bg-indigo-600 hover:bg-white text-white hover:text-indigo-900 h-20 rounded-[2rem] font-black uppercase tracking-[0.2em] text-sm transition-all shadow-[0_20px_40px_rgba(79,70,229,0.2)] active:scale-95 disabled:opacity-50 disabled:cursor-wait mt-4 flex items-center justify-center gap-3 group relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-indigo-400 to-indigo-600 translate-x-[-100%] group-hover:translate-x-0 transition-transform duration-500 opacity-20" />
              <span className="relative z-10">INITIALIZE ACCESS</span>
              <ArrowRightCircle className="w-6 h-6 relative z-10 group-hover:translate-x-1 transition-transform" />
            </button>
          </form>

          <div className="mt-12 pt-8 border-t border-white/5">
             <div className="flex items-center gap-3 text-slate-600 text-[9px] font-black uppercase tracking-[0.5em] mb-6 justify-center">
                <div className="h-[1px] flex-1 bg-slate-800/50"></div>
                <span>DEMO ACCOUNTS</span>
                <div className="h-[1px] flex-1 bg-slate-800/50"></div>
             </div>
             <div className="grid grid-cols-2 gap-4">
                <div className="bg-[#0a0c10]/40 p-4 rounded-2xl border border-slate-800 group hover:border-indigo-500/50 transition-all text-center">
                   <p className="text-white text-[10px] font-black mb-1 group-hover:text-indigo-400 transition-colors tracking-widest uppercase truncate">Admin</p>
                   <p className="text-slate-600 text-[8px] font-bold uppercase tracking-tighter">admin / admin123</p>
                </div>
                <div className="bg-[#0a0c10]/40 p-4 rounded-2xl border border-slate-800 group hover:border-indigo-500/50 transition-all text-center">
                   <p className="text-white text-[10px] font-black mb-1 group-hover:text-indigo-400 transition-colors tracking-widest uppercase truncate">Penagih</p>
                   <p className="text-slate-600 text-[8px] font-bold uppercase tracking-tighter">penagih1 / 123</p>
                </div>
             </div>
          </div>
        </div>
        
        <div className="flex items-center justify-center gap-6 mt-12 opacity-30 group">
           <div className="h-[1px] w-12 bg-slate-800 group-hover:w-20 transition-all" />
           <p className="text-slate-500 text-[8px] font-black uppercase tracking-[0.8em]">SECURED BY CORE-TECH</p>
           <div className="h-[1px] w-12 bg-slate-800 group-hover:w-20 transition-all" />
        </div>
      </motion.div>
    </div>
  );
}

function AdminDashboard({ user, settings, onShowReceipt, refreshTrigger, setRefreshTrigger }: { user: User, settings: AppSettings | null, onShowReceipt?: (t: Transaction, u: string) => void, refreshTrigger?: number, setRefreshTrigger?: React.Dispatch<React.SetStateAction<number>> }) {
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
          // Fallback if global modal not available
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
        generateInvoicePDF(customerObj, transObj, fullData.collector_name || 'Admin');
      }
    } catch (err) {
      console.error('Download failed:', err);
      alert('Gagal mendownload PDF.');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Yakin ingin menghapus transaksi ini?')) return;
    try {
      const res = await fetch(`/api/transactions/${id}`, {
        method: 'DELETE',
        headers: { 'x-user-id': String(user.id) }
      });
      if (res.ok) {
        fetchData();
      } else {
        const errorData = await res.json();
        alert(errorData.error || 'Gagal menghapus transaksi.');
      }
    } catch (err) {
      console.error(err);
      alert('Terjadi kesalahan koneksi saat menghapus.');
    }
  };

  const handleConfirmDeposit = async (collectorId: number) => {
    if (!confirm('Konfirmasi terima uang setoran ini?')) return;
    try {
      const res = await fetch('/api/deposits/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-id': String(user.id) },
        body: JSON.stringify({ collector_id: collectorId })
      });
      if (res.ok) {
        fetchData();
      } else {
        const errorData = await res.json();
        alert(errorData.error || 'Gagal konfirmasi setoran.');
      }
    } catch (err) {
      console.error(err);
      alert('Terjadi kesalahan koneksi saat konfirmasi setoran.');
    }
  };

  return (
    <div className="space-y-8 pb-12">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
            <h2 className="text-2xl font-black tracking-tight text-slate-800">Ringkasan Sistem</h2>
          </div>
          <p className="text-slate-500 text-sm font-medium">Monitoring arus kas dan operasional RT/RW Net</p>
        </div>
        <div className="flex gap-3">
          <button onClick={() => setShowModal(true)} className="btn-primary group">
            <Plus className="w-5 h-5 group-hover:rotate-90 transition-transform" /> 
            <span>Input Transaksi</span>
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
                    Rp {d.totalAmount.toLocaleString()}
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
        
        {/* Mobile View: Cards */}
        <div className="md:hidden divide-y divide-slate-100">
          {transactions.map((t) => (
            <motion.div 
              key={t.id} 
              layout
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="relative overflow-hidden group border-b border-slate-50 last:border-0"
            >
              {/* Background Actions (Revealed via Drag) */}
              <div className="absolute inset-0 bg-slate-50 border-b border-slate-100 flex items-center justify-end px-6 gap-3">
                 <button onClick={() => handleDelete(t.id)} className="w-12 h-12 bg-rose-500 text-white rounded-2xl shadow-lg shadow-rose-200 flex items-center justify-center">
                    <Trash2 className="w-6 h-6" />
                 </button>
                 <button onClick={() => printTransaction(t.id)} className="w-12 h-12 bg-indigo-600 text-white rounded-2xl shadow-lg shadow-indigo-200 flex items-center justify-center">
                    <Printer className="w-6 h-6" />
                 </button>
              </div>

              <motion.div 
                drag="x"
                dragConstraints={{ left: -140, right: 0 }}
                dragElastic={0.1}
                whileDrag={{ scale: 1.02 }}
                className="p-5 hover:bg-slate-50/50 transition-colors relative z-10 bg-white"
              >
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center gap-3">
                     <div className={cn(
                       "w-12 h-12 rounded-2xl flex items-center justify-center shadow-sm",
                       t.type === 'pemasukan' ? "bg-emerald-50 text-emerald-600 shadow-emerald-100" : "bg-rose-50 text-rose-600 shadow-rose-100"
                     )}>
                       {t.type === 'pemasukan' ? <ArrowUpCircle className="w-6 h-6" /> : <ArrowDownCircle className="w-6 h-6" />}
                     </div>
                     <div>
                       <div className="font-black text-slate-800 leading-tight text-sm">{t.customer_name || t.category}</div>
                       <div className="flex items-center gap-1.5 mt-1">
                          <div className="bg-indigo-50 text-indigo-500 text-[8px] font-black uppercase px-2 py-0.5 rounded-full flex items-center gap-1">
                             <UserIcon className="w-2.5 h-2.5" />
                             {t.collector_name?.split(' ')[0] || 'ADMIN'}
                          </div>
                          <div className={cn(
                            "text-[8px] font-black uppercase px-2 py-0.5 rounded-full",
                            t.status === 'confirmed' ? "bg-emerald-50 text-emerald-600" : 
                            t.status === 'deposited' ? "bg-amber-50 text-amber-600" :
                            "bg-slate-50 text-slate-400"
                          )}>
                            {t.status}
                          </div>
                       </div>
                       <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-1">
                          {t.customer_name ? t.category : t.description}
                          {t.billing_period && t.category === 'Tagihan Bulanan' && ` - ${t.billing_period.split(',').map(p => formatPeriod(p.trim())).join(', ')}`}
                       </div>
                     </div>
                  </div>
                </div>
                
                <div className="flex justify-between items-center mt-4 pt-3 border-t border-slate-50">
                  <div className="text-[9px] text-slate-400 font-black uppercase tracking-widest flex items-center gap-3">
                    <span className="flex items-center gap-1"><Calendar className="w-3" /> {t.transaction_date.split('-').reverse().join('/')}</span>
                  </div>
                  <div className="text-right">
                    <div className={cn(
                      "font-black tabular-nums text-base",
                      t.type === 'pemasukan' ? "text-emerald-600" : "text-rose-600"
                    )}>
                      {t.type === 'pemasukan' ? '+' : '-'} {new Intl.NumberFormat('id-ID').format(t.amount)}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-50 justify-center">
                    <span className="text-[8px] font-black text-slate-300 uppercase tracking-tighter">Geser ke kiri untuk aksi</span>
                    <ArrowLeft className="w-3 h-3 text-slate-300" />
                </div>
              </motion.div>
            </motion.div>
          ))}
          {transactions.length === 0 && (
            <div className="py-20 text-center text-slate-300 italic font-medium uppercase tracking-[0.2em] text-[10px]">
              Empty Transaction History
            </div>
          )}
        </div>

        {/* Desktop View: Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-slate-400 text-[10px] uppercase tracking-[0.2em] font-black bg-slate-50/50">
                <th className="px-8 py-5">Tanggal</th>
                <th className="px-8 py-5">Pelanggan / Kategori</th>
                <th className="px-8 py-5 text-center">Status Bukti</th>
                <th className="px-8 py-5 text-right">Nominal</th>
                <th className="px-8 py-5 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 text-sm">
              {transactions.map((t) => (
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
                  <td className="px-8 py-5 text-center">
                    <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => printTransaction(t.id)}
                        disabled={isPrinting}
                        className="p-2 text-slate-300 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                      >
                        <Printer className="w-4 h-4" />
                      </button>
                      {t.customer_id && (
                        <button 
                          onClick={() => handleDownloadInvoice(t.id)}
                          className="p-2 text-slate-300 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                      )}
                      <button 
                        onClick={() => handleDelete(t.id)}
                        className="p-2 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
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
            isAdmin 
            onClose={() => setShowModal(false)} 
            onSuccess={() => { setShowModal(false); fetchData(); }} 
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function CollectorDashboard({ user, settings, onShowReceipt, refreshTrigger, setRefreshTrigger }: { user: User, settings: AppSettings | null, onShowReceipt?: (t: Transaction, u: string) => void, refreshTrigger?: number, setRefreshTrigger?: React.Dispatch<React.SetStateAction<number>> }) {
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
  const [collectorId, setCollectorId] = useState<string>('');
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [isOldInQuickAdd, setIsOldInQuickAdd] = useState(false);
  const [pAmount, setPAmount] = useState('');
  const [showPrinterSettings, setShowPrinterSettings] = useState(false);

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

  const heldBalance = transactions
    .filter(t => t.status === 'pending')
    .reduce((sum, t) => sum + t.amount, 0);

  const fetchInitialData = async () => {
    try {
      const [transRes, custRes, packRes, userRes] = await Promise.all([
        fetch('/api/transactions', { headers: { 'x-user-id': String(user.id) } }),
        fetch('/api/customers', { headers: { 'x-user-id': String(user.id) } }),
        fetch('/api/packets', { headers: { 'x-user-id': String(user.id) } }),
        fetch('/api/users', { headers: { 'x-user-id': String(user.id) } })
      ]);
      if (transRes.ok) setTransactions(await transRes.json());
      if (custRes.ok) setCustomers(await custRes.json());
      if (packRes.ok) setPackets(await packRes.json());
      if (userRes.ok) setUsers(await userRes.json());
    } catch (err) {
      console.error('Failed to fetch initial collector data:', err);
    }
  };

  useEffect(() => { fetchInitialData(); }, [refreshTrigger]);

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
        generateInvoicePDF(customerObj, transObj, fullData.collector_name || user.name);
      }
    } catch (err) {
      console.error('Download failed:', err);
      alert('Gagal mendownload PDF.');
    }
  };

  useEffect(() => {
    if (selectedCustomerId) {
      const customer = customers.find(c => String(c.id) === selectedCustomerId);
      if (customer) {
        setSearchTerm(customer.name);
        
        // Calculate unpaid months for this customer
        const unpaid = getUnpaidMonthsList(customer);
        if (unpaid.length > 0) {
          // If no periods currently selected (or if user just switched customer), select the first unpaid
          if (selectedPeriods.length === 0) {
             setSelectedPeriods([unpaid[0]]);
          }
        } else {
          setSelectedPeriods([]);
        }

        // Auto-set amount for Monthly Billing
        if (selectedCategory === 'Tagihan Bulanan') {
          const priceMatch = customer.packet.match(/Rp\s?([\d.,]+)/);
          if (priceMatch) {
            const numericPrice = priceMatch[1].replace(/[.,]/g, '');
            setAmount(numericPrice);
          }
        }
      }
      
      // Also fetch history context for this customer (optional but good for tracking)
      fetch(`/api/customers/${selectedCustomerId}/payments`, { headers: { 'x-user-id': String(user.id) } })
        .then(res => res.json())
        .then(data => setCustomerPayments(data));
        
    } else {
      setCustomerPayments([]);
      setAmount('');
      setSelectedPeriods([]);
      setSearchTerm('');
    }
  }, [selectedCustomerId, customers, selectedCategory]);

  // Handle category changes to re-sync price
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

  const filteredCustomers = customers.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.address?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Robust logic for calculating unpaid months
  const getUnpaidMonthsList = (customer: Customer | undefined) => {
    if (!customer) return [];
    
    const paidPeriods = new Set<string>();
    if (customer.paid_months) {
      customer.paid_months.split(',').forEach(p => paidPeriods.add(p.trim()));
    }

    const joinMonth = customer.created_at?.slice(0, 7) || '2000-01';
    const now = new Date();
    const months = [];
    
    // We check from join date up to NEXT month (for advance payments)
    // Professional ISP usually bills for current month.
    // Let's check from 12 months back up to 2 months ahead.
    for (let i = -12; i <= 2; i++) {
        const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
        const period = d.toISOString().slice(0, 7);
        if (period < joinMonth) continue;
        if (!paidPeriods.has(period)) {
            months.push(period);
        }
    }
    return months.sort();
  };

  // Helper for formatting period display
  const formatPeriod = (period: string) => {
    if (!period || period === '') return '';
    const [year, month] = period.split('-');
    const monthNames = [
      'JAN', 'FEB', 'MAR', 'APR', 'MEI', 'JUN',
      'JUL', 'AGU', 'SEP', 'OKT', 'NOV', 'DES'
    ];
    return `${monthNames[parseInt(month) - 1]} ${year}`;
  };

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
    if (!confirm(`Setor uang Rp ${heldBalance.toLocaleString()} ke Admin?`)) return;
    
    try {
      const res = await fetch('/api/deposits/submit', {
        method: 'POST',
        headers: { 'x-user-id': String(user.id) }
      });
      
      if (res.ok) {
        alert('Berhasil! Segera serahkan uang fisik ke Admin.');
        fetchInitialData();
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
      
      // To unify the report, we send ONE transaction with comma-separated periods
      const data = {
        type: 'pemasukan',
        category: selectedCategory,
        amount: totalAmount, // Use the total amount for all periods
        description: selectedCategory === 'Tagihan Bulanan' 
          ? `Internet ${periodsToPay.map(p => formatPeriod(p).split(' ')[0]).join(', ')}` 
          : (e.currentTarget.description as any).value,
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

      // If we made it here, payment succeeded
      alert('Pembayaran Berhasil Dicatat!');
      
      // Auto-Print Receipt if requested
      if (lastTransactionId) {
        const transRes = await fetch(`/api/transactions/${lastTransactionId}`, {
          headers: { 'x-user-id': String(user.id) }
        });
        if (transRes.ok) {
          const fullTrans = await transRes.json();
          // For the receipt, if we paid multiple months, we might want to override the period display
          if (periodsToPay.length > 1) {
            fullTrans.billing_period = periodsToPay.join(', ');
            fullTrans.amount = totalAmount; // Show total on receipt
          }
          if (onShowReceipt) onShowReceipt(fullTrans, user.name);
          else window.print();
        }
      }

      // Reset selection but keep customer selected so they can see remaining unpaid
      setSelectedPeriods([]); 
      setRefreshTrigger(prev => prev + 1);
      
      // Clear description
      const descInput = e.currentTarget.querySelector('[name="description"]') as HTMLInputElement;
      if (descInput) descInput.value = '';

      // If no more unpaid, clear everything
      setTimeout(() => {
        const currentCustomers = customers; // Using a closure-safe ref or rely on next render
        const currentId = selectedCustomerId;
        const cust = currentCustomers.find(c => String(c.id) === currentId);
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
        {/* Quick Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
           {/* Summary Tooltips */}
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
             {/* Printer Card */}
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
             {/* Info Card */}
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

        {/* Printer Settings Overlay (Mobile Only) */}
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


      <header className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-3 h-3 rounded-full bg-emerald-500 shadow shadow-emerald-200"></div>
          <h2 className="text-3xl font-black tracking-tight text-slate-800 font-sans">Input Tagihan</h2>
        </div>
        <p className="text-slate-500 text-sm font-medium">Layanan pencatatan pembayaran pelanggan</p>
      </header>

      {/* Input Form Card */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.2 }}
        className="bg-white rounded-[3rem] p-8 md:p-10 shadow-lg border border-slate-100"
      >
        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-2">
              <div className="flex justify-between items-center px-1">
                <label className="block text-xs font-black text-slate-400 uppercase tracking-[0.1em]">Cari Pelanggan</label>
                <button 
                  type="button"
                  onClick={() => setShowQuickAdd(true)}
                  className="text-[10px] font-black text-indigo-600 hover:text-indigo-700 flex items-center gap-1 uppercase tracking-widest"
                >
                  <Plus className="w-3 h-3" /> Pelanggan Baru
                </button>
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
                    }}
                    onFocus={() => setShowCustomerList(true)}
                    className="w-full bg-slate-50 text-slate-900 border-2 border-slate-100 px-6 py-5 rounded-[1.5rem] focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-bold text-lg pr-12 placeholder:text-slate-300"
                  />
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
                <input type="hidden" name="customer_id" value={selectedCustomerId} />
                
                {showCustomerList && (
                  <div className="absolute z-[110] left-0 right-0 mt-2 bg-white rounded-2xl shadow-xl border border-indigo-100 max-h-72 overflow-y-auto overflow-x-hidden p-2">
                    <div className="px-3 py-2 border-b border-slate-50 mb-1 flex justify-between items-center">
                       <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">Pilih Pelanggan ({filteredCustomers.length})</p>
                       <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                    </div>
                    {filteredCustomers.length > 0 ? (
                      filteredCustomers.map(c => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => {
                            setSelectedCustomerId(String(c.id));
                            setSearchTerm(c.name);
                            setShowCustomerList(false);
                          }}
                          className="w-full text-left px-5 py-4 hover:bg-indigo-50/50 rounded-xl transition-all border-b last:border-0 border-slate-50 active:scale-[0.98] group"
                        >
                          <div className="font-bold text-slate-900 flex items-center justify-between mb-0.5">
                            <span className="group-hover:text-indigo-600 transition-colors">{c.name}</span>
                            {getUnpaidMonthsList(c).length === 0 ? (
                              <span className="text-[9px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">LUNAS</span>
                            ) : (
                              <span className="text-[9px] font-black text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-100">{getUnpaidMonthsList(c).length} BLN</span>
                            )}
                          </div>
                          <div className="text-[10px] text-slate-500 uppercase flex justify-between items-center opacity-70">
                            <span className="truncate max-w-[150px] italic">{c.address}</span>
                            <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-[8px]">ID: {c.id}</span>
                          </div>
                        </button>
                      ))
                    ) : (
                      <div className="px-5 py-8 text-center">
                        <UserX className="w-10 h-10 mx-auto text-slate-200 mb-2" />
                        <p className="text-slate-400 italic text-xs font-bold uppercase tracking-tight">Pelanggan tidak ditemukan</p>
                      </div>
                    )}
                  </div>
                )}
                {/* Backdrop handle to close on click outside */}
                {showCustomerList && (
                  <div 
                    className="fixed inset-0 z-[105]" 
                    onClick={() => setShowCustomerList(false)}
                  />
                )}
              </div>
            </div>
            <div className="space-y-4">
              <label className="block text-xs font-black text-slate-400 uppercase tracking-[0.1em] px-1">Pilih Keterangan Setoran</label>
              <div className="grid grid-cols-2 gap-3">
                {['Tagihan Bulanan', 'Pemasangan Baru', 'Denda', 'Voucher', 'Lain-lain'].map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setSelectedCategory(cat)}
                    className={cn(
                      "py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border-2",
                      selectedCategory === cat 
                        ? "bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-200 scale-[1.02]" 
                        : "bg-slate-50 border-slate-100 text-slate-400 hover:border-slate-200"
                    )}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {selectedCategory === 'Tagihan Bulanan' && unpaidMonthsList.length > 0 ? (
            <motion.div 
               initial={{ opacity: 0 }}
               animate={{ opacity: 1 }}
               transition={{ duration: 0.2 }}
               className="space-y-4"
            >
              <label className="block text-xs font-black text-slate-400 uppercase tracking-[0.1em] px-1">Pilih Bulan yang Dibayar (Bisa pilih banyak)</label>
              <div className="flex flex-wrap gap-2">
                {unpaidMonthsList.map(m => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => togglePeriod(m)}
                    className={cn(
                      "px-4 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border-2",
                      selectedPeriods.includes(m) 
                        ? "bg-emerald-600 border-emerald-600 text-white shadow-lg shadow-emerald-100 scale-110 z-10" 
                        : "bg-slate-50 border-slate-100 text-slate-400 hover:border-slate-200"
                    )}
                  >
                    {formatPeriod(m)}
                    {m > new Date().toISOString().slice(0, 7) && <span className="ml-1 opacity-50 text-[8px]">(DEPAN)</span>}
                  </button>
                ))}
              </div>
            </motion.div>
          ) : selectedCategory === 'Tagihan Bulanan' && selectedCustomerId ? (
            <div className="bg-emerald-50 border-2 border-emerald-100 p-6 rounded-3xl flex items-center justify-center gap-3">
              <CheckCircle className="w-5 h-5 text-emerald-600" />
              <span className="text-xs font-black text-emerald-800 uppercase tracking-widest">Semua Tagihan Sudah Lunas</span>
            </div>
          ) : null}

          <div className="space-y-4">
             <label className="block text-xs font-black text-slate-400 uppercase tracking-[0.1em] px-1">Konfirmasi Nominal</label>
             <div className="bg-slate-900 border-b-8 border-slate-950 p-10 rounded-[2.5rem] text-center shadow-lg overflow-hidden relative group">
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                  <Coins className="w-20 h-20 text-white" />
                </div>
                <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-2">Total Terima Uang</p>
                <p className={cn(
                  "text-5xl font-black tracking-tighter leading-none mb-4 transition-all",
                  totalAmount > 0 ? "text-emerald-400" : "text-white/20"
                )}>
                  Rp {totalAmount.toLocaleString()}
                </p>
                {selectedCategory === 'Tagihan Bulanan' && selectedPeriods.length > 0 && (
                   <div className="bg-white/5 py-2 px-4 rounded-full inline-flex items-center gap-2">
                     <span className="text-[9px] font-black text-white/40 uppercase tracking-widest">Pembayaran untuk</span>
                     <span className="text-[9px] font-black text-emerald-400 uppercase">{selectedPeriods.length} BULAN</span>
                   </div>
                )}
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
            <span className="text-[9px] text-white/50 font-bold uppercase tracking-widest group-disabled:hidden">Struk akan otomatis dibuat</span>
          </button>
        </form>
      </motion.div>

      {/* History Card */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-lg flex items-center gap-2">
            <History className="w-5 h-5 text-indigo-600" />
            Riwayat Setoran Hari Ini
          </h3>
        </div>
        <div className="space-y-3">
          {transactions.slice(0, 10).map((t) => (
            <motion.div 
              key={t.id} 
              layout
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="relative overflow-hidden bg-white rounded-3xl border border-slate-100 shadow-sm hover:shadow-xl hover:shadow-indigo-500/5 transition-all group"
            >
              {/* Status Indicator */}
              <div className="absolute inset-y-0 left-0 w-1 flex flex-col">
                 <div className={cn("flex-1", t.status === 'confirmed' ? "bg-emerald-400" : t.status === 'deposited' ? "bg-amber-400" : "bg-slate-200")}></div>
              </div>

              {/* Background Action (Revealed via Drag) */}
              <div className="absolute inset-0 bg-indigo-50 flex items-center justify-end px-6 gap-3">
                 <button onClick={() => printTransaction(t.id)} className="w-12 h-12 bg-indigo-600 text-white rounded-2xl shadow-lg shadow-indigo-200 flex items-center justify-center">
                    <Printer className="w-6 h-6" />
                 </button>
              </div>

              <motion.div 
                drag="x"
                dragConstraints={{ left: -80, right: 0 }}
                dragElastic={0.1}
                className="bg-white p-4 relative z-10"
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
                      <p className="font-black text-slate-800 text-sm whitespace-nowrap overflow-hidden text-ellipsis max-w-32">{t.customer_name || t.category}</p>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">
                        {t.customer_name ? t.category : t.description}
                        {t.billing_period && t.category === 'Tagihan Bulanan' && ` - ${t.billing_period.split(',').map(p => formatPeriod(p.trim())).join(', ')}`}
                      </p>
                      <p className="text-[8px] text-indigo-400 font-black uppercase mt-1 flex items-center gap-1">
                        <UserCheck className="w-2 h-2" /> Petugas: {t.collector_name || user.name}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={cn(
                      "font-black text-sm tabular-nums",
                      t.type === 'pemasukan' ? "text-emerald-600" : "text-rose-600"
                    )}>
                      {t.type === 'pemasukan' ? '+' : '-'} {new Intl.NumberFormat('id-ID').format(t.amount)}
                    </p>
                    <p className="text-[9px] text-slate-300 font-black uppercase tracking-tighter flex items-center gap-2 justify-end">
                       <span className="flex items-center gap-1"><Printer className="w-2 h-2" /> Geser</span>
                    </p>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          ))}
          {transactions.length === 0 && (
            <div className="text-center py-10 text-slate-400 border-2 border-dashed border-slate-100 rounded-2xl">
              Belum ada setoran hari ini.
            </div>
          )}
        </div>
      </div>

      {/* Unpaid Customers Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-lg flex items-center gap-2">
            <CalendarCheck2 className="w-5 h-5 text-rose-500" />
            Penagihan Belum Lunas ({new Date().toLocaleString('id-ID', { month: 'long' })})
          </h3>
          <span className="text-[10px] font-bold bg-rose-50 text-rose-600 px-2 py-1 rounded-full uppercase">
            {customers.filter(c => getUnpaidMonthsList(c).length > 0).length} Menunggak
          </span>
        </div>
        <div className="grid grid-cols-1 gap-3">
          {customers
            .map(c => ({ ...c, unpaid: getUnpaidMonthsList(c) }))
            .filter(c => c.unpaid.length > 0)
            .map((c) => {
              const amountMatch = c.packet.match(/Rp\s?([\d.,]+)/);
              const price = amountMatch ? amountMatch[1] : '0';
              
              return (
                <motion.div 
                  key={c.id}
                  whileHover={{ x: 5 }}
                  onClick={() => {
                    setSelectedCustomerId(String(c.id));
                    setSearchTerm(c.name);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="bg-white p-5 rounded-2xl border-l-4 border-l-rose-500 border-y border-r border-slate-100 shadow-sm hover:shadow-md transition-all cursor-pointer group"
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-bold text-slate-800">{c.name}</p>
                        <span className="text-[9px] font-bold bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded uppercase">{c.packet.split(' - ')[0]}</span>
                      </div>
                      <p className="text-[10px] text-slate-400 font-medium mb-3">{c.address}</p>
                      
                      <div className="flex flex-wrap gap-1.5">
                        {c.unpaid.map(m => (
                          <span key={m} className="text-[9px] font-black bg-rose-50 text-rose-500 px-2 py-1 rounded-md border border-rose-100 uppercase tracking-tighter">
                            {formatPeriod(m)}
                          </span>
                        ))}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-6 text-right shrink-0">
                      <div>
                        <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">Tunggakan</p>
                        <p className="text-sm font-black text-rose-600">{c.unpaid.length} Bulan</p>
                      </div>
                      <div className="hidden sm:block">
                        <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">Estimasi Total</p>
                        <p className="text-xs font-mono font-bold text-slate-600">
                          Rp {(parseInt(price.replace(/[.,]/g, '')) * c.unpaid.length).toLocaleString()}
                        </p>
                      </div>
                      <div className="w-10 h-10 rounded-full bg-slate-50 text-slate-400 flex items-center justify-center group-hover:bg-rose-500 group-hover:text-white transition-colors">
                        <Plus className="w-5 h-5" />
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          {customers.filter(c => getUnpaidMonthsList(c).length > 0).length === 0 && (
            <div className="text-center py-10 bg-emerald-50 border-2 border-dashed border-emerald-100 rounded-2xl">
              <Check className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
              <p className="text-emerald-700 font-bold">Luar Biasa! Semua pelanggan sudah lunas.</p>
            </div>
          )}
        </div>
      </div>

      <AnimatePresence>
        {showQuickAdd && (
          <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative bg-slate-50 w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden"
            >
              <div className="bg-white p-6 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-black text-slate-800 tracking-tight flex items-center gap-2">
                    <UserPlus className="w-5 h-5 text-indigo-500" /> Registrasi Cepat
                  </h3>
                  <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-widest">Input Pelanggan & Bayar Sekaligus</p>
                </div>
                <div className="flex bg-slate-100 p-1.5 rounded-xl scale-90">
                  <button 
                    type="button"
                    onClick={() => setIsOldInQuickAdd(false)}
                    className={cn("px-4 py-2 text-[10px] font-black rounded-lg transition-all uppercase tracking-widest", !isOldInQuickAdd ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500")}
                  >
                    BARU
                  </button>
                  <button 
                    type="button"
                    onClick={() => setIsOldInQuickAdd(true)}
                    className={cn("px-4 py-2 text-[10px] font-black rounded-lg transition-all uppercase tracking-widest", isOldInQuickAdd ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500")}
                  >
                    MIGRASI
                  </button>
                </div>
              </div>

              <form onSubmit={async (e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                const customerData = {
                  name: formData.get('name'),
                  packet: formData.get('packet'),
                  address: formData.get('address'),
                  created_at: isOldInQuickAdd ? formData.get('created_at') : null
                };
                
                const res = await fetch('/api/customers', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json', 'x-user-id': String(user.id) },
                  body: JSON.stringify(customerData)
                });
                
                if (res.ok) {
                  const newCust = await res.json();
                  
                  // Handle Immediate Payment if enabled
                  if (formData.get('pay_now') === 'on') {
                    const transRes = await fetch('/api/transactions', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json', 'x-user-id': String(user.id) },
                      body: JSON.stringify({
                        customer_id: newCust.id,
                        amount: Number(formData.get('p_amount')),
                        category: formData.get('p_category'),
                        billing_period: formData.get('p_period'),
                        description: `Pembayaran awal saat pendaftaran oleh ${user.name}`
                      })
                    });
                    
                    if (transRes.ok) {
                      const newTrans = await transRes.json();
                      const cust = customers.find(c => c.id === newTrans.customer_id) || newCust;
                      const printObj = { ...newTrans, customer_name: cust.name };
                      
                      if (onShowReceipt) {
                        onShowReceipt(printObj, user.name);
                      } else {
                        window.print();
                        fetchInitialData();
                      }
                    }
                  }

                  setShowQuickAdd(false);
                  await fetchInitialData();
                  setSelectedCustomerId(String(newCust.id));
                }
              }} className="p-8 space-y-6 max-h-[70vh] overflow-y-auto">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nama Lengkap</label>
                    <div className="relative group">
                      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-500">
                        <UserIcon className="w-4 h-4" />
                      </div>
                      <input name="name" required className="w-full bg-white border border-slate-100 h-14 pl-12 pr-4 rounded-2xl font-bold text-slate-700 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Pilih Paket</label>
                    <div className="relative group">
                      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-500">
                        <BarChart3 className="w-4 h-4" />
                      </div>
                      <select 
                        name="packet" 
                        required 
                        className="w-full bg-white border border-slate-100 h-14 pl-12 pr-4 rounded-2xl font-bold text-slate-700 focus:ring-4 focus:ring-indigo-500/10 outline-none appearance-none transition-all"
                        onChange={(e) => {
                          const priceMatch = e.target.value.match(/Rp\s?([\d.,]+)/);
                          if (priceMatch) {
                            const numericPrice = priceMatch[1].replace(/[.,]/g, '');
                            const form = e.target.closest('form');
                            if (form) {
                              const amountInput = form.querySelector('[name="p_amount"]') as HTMLInputElement;
                              if (amountInput) amountInput.value = numericPrice;
                            }
                          }
                        }}
                      >
                        <option value="">-- PAKET --</option>
                        {packets.map(p => (
                          <option key={p.id} value={`${p.name} - Rp ${p.price.toLocaleString()}`}>
                            {p.name} (Rp {p.price.toLocaleString()})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Alamat Pemasangan</label>
                  <div className="relative group">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-500">
                      <LayoutDashboard className="w-4 h-4" />
                    </div>
                    <input name="address" className="w-full bg-white border border-slate-100 h-14 pl-12 pr-4 rounded-2xl font-bold text-slate-700 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all" />
                  </div>
                </div>

                {isOldInQuickAdd && (
                  <div className="bg-indigo-600 rounded-3xl p-6 text-white shadow-xl shadow-indigo-100">
                    <label className="block text-[10px] font-black text-indigo-200 uppercase tracking-widest mb-3">Historical Join Date</label>
                    <input 
                      name="created_at" 
                      type="month" 
                      required 
                      defaultValue={new Date().toISOString().slice(0, 7)}
                      className="w-full bg-indigo-500 border border-indigo-400 h-14 px-4 rounded-xl font-black text-white outline-none focus:ring-4 focus:ring-white/20 transition-all" 
                    />
                  </div>
                )}

                <div className="pt-4 border-t border-slate-100">
                   <label className="flex items-center gap-4 cursor-pointer group bg-slate-100 p-4 rounded-2xl transition-all hover:bg-indigo-50">
                      <input type="checkbox" name="pay_now" className="w-6 h-6 rounded-lg border-2 border-slate-300 text-indigo-600 focus:ring-indigo-500 transition-all" />
                      <div>
                        <span className="text-sm font-black text-slate-700 block uppercase tracking-tight">Catat Pembayaran Langsung</span>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Sangat direkomendasikan untuk aktivasi instant</span>
                      </div>
                   </label>
                </div>

                  <div className="space-y-6 bg-slate-100 p-6 rounded-3xl hidden has-[input[name='pay_now']:checked]:block border-2 border-indigo-100 animate-in fade-in slide-in-from-top-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Kategori</label>
                        <select name="p_category" className="w-full bg-white border-none h-12 px-4 rounded-xl font-bold text-slate-700 outline-none">
                          <option value="Pemasangan Baru">Pemasangan Baru</option>
                          <option value="Tagihan Bulanan">Tagihan Bulanan</option>
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Periode</label>
                        <select 
                          name="p_period" 
                          defaultValue={new Date().toISOString().slice(0, 7)}
                          className="w-full bg-white border-none h-12 px-4 rounded-xl font-bold text-slate-700 outline-none"
                        >
                          {getBillingPeriods().map(p => <option key={p} value={p}>{p}</option>)}
                        </select>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Total Bayar (Rp)</label>
                      <FormattedNumberInput 
                        name="p_amount" 
                        onChange={(val) => setPAmount(val)}
                        value={pAmount} 
                        className="w-full bg-white border-none h-16 px-6 rounded-2xl font-black text-2xl text-slate-800 outline-none tabular-nums" 
                      />
                    </div>
                  </div>

                <div className="flex gap-4 pt-4 bg-white sticky bottom-0">
                  <button type="button" onClick={() => setShowQuickAdd(false)} className="flex-1 py-4 text-slate-400 font-black text-xs uppercase tracking-widest hover:text-slate-600 active:scale-95 transition-all">Batal</button>
                  <button type="submit" className="flex-1 bg-indigo-600 hover:bg-black text-white font-black py-4 rounded-2xl shadow-xl shadow-indigo-200 active:scale-95 transition-all uppercase tracking-widest text-xs">Simpan & Proses</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ReceiptPreviewModal({ transaction, userName, settings, onClose }: { transaction: Transaction, userName: string, settings: AppSettings | null, onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-slate-900/80 backdrop-blur-md" 
      />
      <motion.div 
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0, y: 20 }}
        className="relative bg-slate-100 w-full max-w-sm rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        <div className="p-6 bg-white flex items-center justify-between border-b border-slate-100">
           <div>
              <h3 className="font-black text-slate-800 tracking-tight flex items-center gap-2 uppercase text-sm">
                <Printer className="w-4 h-4 text-indigo-500" /> Struk Digital
              </h3>
              <p className="text-[10px] font-bold text-slate-400 mt-0.5 uppercase tracking-widest leading-none">Review & Print Preview</p>
           </div>
           <button onClick={onClose} className="p-2 hover:bg-slate-50 rounded-xl text-slate-400 transition-colors">
              <LogOut className="w-5 h-5 rotate-180" />
           </button>
        </div>

        <div className="flex-1 overflow-y-auto p-8 flex justify-center bg-[#f8fafc]">
           <div className="receipt-paper bg-white w-full max-w-[300px] shadow-[0_10px_30px_rgba(0,0,0,0.05)] p-6 font-sans text-slate-900 relative">
              {/* Receipt Content Mirroring the Print View */}
              <div className="text-center border-b border-slate-200 pb-4 mb-4">
                 <h4 className="font-black text-sm uppercase leading-tight tracking-tighter">{settings?.company_name || 'NET CORE WIFI'}</h4>
                 <p className="text-[8px] font-black text-slate-500 tracking-[0.2em] mt-1">PRO BILLING SYSTEM</p>
                 <p className="text-[7px] text-slate-400 mt-1 max-w-[150px] mx-auto">{settings?.company_address || 'Jakarta Selatan'}</p>
                 <div className="mt-2 text-[8px] bg-slate-900 text-white rounded-full px-2 py-0.5 inline-block font-bold">BUKTI BAYAR SAH</div>
              </div>

              <div className="space-y-3 text-[10px]">
                 <div className="flex justify-between border-b border-slate-50 pb-2">
                    <span className="text-[7px] font-bold text-slate-400 uppercase">No. Struk</span>
                    <span className="font-black">#{String(transaction.id).padStart(8, '0')}</span>
                 </div>
                 <div className="flex justify-between">
                    <span className="text-[7px] font-bold text-slate-400 uppercase">Pelanggan</span>
                    <span className="font-black uppercase truncate ml-4">{transaction.customer_name || 'Umum'}</span>
                 </div>
                 <div className="flex justify-between">
                    <span className="text-[7px] font-bold text-slate-400 uppercase">Layanan</span>
                    <span className="font-bold text-right italic">{transaction.category}</span>
                 </div>
                 {transaction.billing_period && (
                    <div className="bg-indigo-50/50 p-2 rounded-lg flex justify-between items-center border border-indigo-100/50">
                       <span className="text-[7px] font-bold text-indigo-400 uppercase">Periode</span>
                       <span className="font-black text-indigo-600 bg-white px-1.5 py-0.5 rounded shadow-sm text-[9px]">
                          {transaction.billing_period.split(',').map(p => formatPeriod(p.trim())).join(', ')}
                       </span>
                    </div>
                 )}
                 <div className="flex justify-between border-t border-slate-50 pt-2">
                    <span className="text-[7px] font-bold text-slate-400 uppercase">Petugas</span>
                    <span className="font-black uppercase">{transaction.collector_name || userName}</span>
                 </div>
                 <div className="pt-2 border-t border-slate-100">
                    <div className="flex justify-between items-center mb-1">
                       <span className="text-[8px] font-bold text-slate-400 uppercase">Jumlah Bayar</span>
                       <span className="font-bold">Rp {transaction.amount.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center text-lg font-black tracking-tighter border-t border-slate-900 pt-1 mt-1">
                       <span className="text-[9px] uppercase">TOTAL</span>
                       <span>Rp {transaction.amount.toLocaleString()}</span>
                    </div>
                 </div>
              </div>

              <div className="mt-6 text-center">
                 <div className="inline-block border border-indigo-600 text-indigo-600 px-3 py-1 rounded-full text-[8px] font-black uppercase mb-3">LUNAS ✅</div>
                 <p className="text-[7px] text-slate-400 font-medium leading-relaxed italic">
                    "{settings?.receipt_footer || 'Terima kasih telah berlangganan.'}"
                 </p>
                 <div className="mt-4 pt-4 border-t border-dashed border-slate-200">
                    <p className="text-[6px] text-slate-300 uppercase tracking-widest font-mono">Core-Tech Enterprise v2.4</p>
                 </div>
              </div>
           </div>
        </div>

        <div className="p-6 bg-white border-t border-slate-100 flex gap-4">
           <button 
             onClick={onClose}
             className="flex-1 py-4 text-slate-400 font-black text-xs uppercase tracking-widest hover:text-slate-600 active:scale-95 transition-all"
           >
             Tutup
           </button>
           <button 
             onClick={() => { window.print(); }}
             className="flex-1 bg-indigo-600 hover:bg-black text-white font-black py-4 rounded-2xl shadow-xl shadow-indigo-200 active:scale-95 transition-all flex items-center justify-center gap-2 text-xs uppercase tracking-widest"
           >
             <Printer className="w-4 h-4" /> Cetak Thermal
           </button>
        </div>
      </motion.div>

      {/* Hidden container for window.print() */}
      <Receipt transaction={transaction} userName={userName} settings={settings} />
    </div>
  );
}

function Receipt({ transaction, userName, settings }: { transaction: Transaction | null, userName: string, settings: AppSettings | null }) {
  if (!transaction) return null;
  return (
    <div className="print-container hidden print:block text-slate-900 bg-white p-6 w-[80mm] mx-auto border border-slate-100 font-sans">
      {/* Header */}
      <div className="text-center border-b-2 border-slate-900 pb-3 mb-4">
        <h1 className="font-black text-lg tracking-tighter uppercase leading-tight">{settings?.company_name || 'NET CORE WIFI'}</h1>
        <p className="text-[9px] font-black tracking-[0.2em] text-slate-500 mb-1">RT/RW NET SOLUTION</p>
        <p className="text-[8px] font-medium text-slate-400">{settings?.company_address || 'Jln. Kebon Jeruk No. 88, Jakarta Selatan'}</p>
        <p className="text-[8px] font-bold text-slate-900 border-t border-slate-100 mt-2 pt-1 uppercase">Struk Pembayaran Sah</p>
      </div>

      {/* Info Boxes */}
      <div className="space-y-4 text-[10px]">
        <div className="grid grid-cols-2 gap-4 border-b border-slate-100 pb-3">
          <div>
            <p className="text-[7px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Nomor Struk</p>
            <p className="font-bold underline tracking-tighter">#{String(transaction.id).padStart(8, '0')}</p>
          </div>
          <div className="text-right">
            <p className="text-[7px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Tanggal</p>
            <p className="font-bold">{new Date().toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' })}</p>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between items-baseline">
            <span className="text-[8px] font-black text-slate-400 uppercase">Pelanggan</span>
            <span className="font-black text-right uppercase border-b border-slate-900">{transaction.customer_name || 'Umum'}</span>
          </div>
          <div className="flex justify-between items-baseline">
            <span className="text-[8px] font-black text-slate-400 uppercase">Layanan</span>
            <span className="font-bold text-right uppercase italic">{transaction.category}</span>
          </div>
          {transaction.billing_period && (
            <div className="flex justify-between items-center bg-slate-100 p-2 rounded-lg">
              <span className="text-[8px] font-black text-slate-500 uppercase">Periode Tagihan</span>
              <span className="font-black text-indigo-600 bg-white px-2 py-1 rounded shadow-sm scale-110">{transaction.billing_period}</span>
            </div>
          )}
          <div className="flex justify-between items-baseline pt-2">
            <span className="text-[8px] font-black text-slate-400 uppercase">Input Oleh</span>
            <span className="font-bold text-right capitalize">{userName}</span>
          </div>
        </div>

        {/* Amount */}
        <div className="border-t-2 border-slate-900 pt-4 pb-1">
          <div className="flex justify-between items-center mb-1">
             <span className="text-[9px] font-black text-slate-900 uppercase">Subtotal</span>
             <span className="font-bold">Rp {transaction.amount.toLocaleString()}</span>
          </div>
          <div className="flex justify-between items-center mb-4">
             <span className="text-[9px] font-black text-slate-900 uppercase">Biaya Admin</span>
             <span className="font-bold text-slate-400">Rp 0</span>
          </div>
          
          <div className="bg-slate-900 text-white p-3 rounded-xl flex justify-between items-center">
            <span className="text-[10px] font-black uppercase tracking-widest">Total Bayar</span>
            <span className="text-lg font-black tracking-tighter">
              {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(transaction.amount)}
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center pt-6 pb-2">
          <div className="inline-block border-2 border-indigo-600 text-indigo-600 px-4 py-1.5 rounded-full text-[9px] font-black uppercase mb-4 tracking-tighter">
            Lunas / Paid ✅
          </div>
          <p className="text-[7px] text-slate-400 font-bold uppercase leading-relaxed">
            {settings?.receipt_footer || 'Terima kasih telah berlangganan.'}<br/>
            Pembayaran Anda telah tercatat dalam sistem kami.<br/>
            <span className="text-indigo-500 mt-1 block">CS: {settings?.company_phone || '0812-XXXX-XXXX'} (WhatsApp Only)</span>
          </p>
        </div>
        
        <div className="text-[6px] font-mono text-center opacity-30 mt-4 border-t border-slate-100 pt-2 tracking-[0.3em]">
          X-CORE CLOUD PRINT-ENGINE v2.4
        </div>
      </div>
    </div>
  );
}

function CustomerManagement({ user, refreshTrigger }: { user: User, refreshTrigger?: number }) {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [packets, setPackets] = useState<Packet[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [isOldCustomer, setIsOldCustomer] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchData = async () => {
    try {
      const [custRes, packRes] = await Promise.all([
        fetch('/api/customers', { headers: { 'x-user-id': String(user.id) } }),
        fetch('/api/packets', { headers: { 'x-user-id': String(user.id) } })
      ]);
      if (custRes.ok) setCustomers(await custRes.json());
      if (packRes.ok) setPackets(await packRes.json());
    } catch (err) {
      console.error('Failed to fetch customer management data:', err);
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

  const handleDelete = async (id: number) => {
    if (!confirm('Hapus pelanggan ini?')) return;
    try {
      const res = await fetch(`/api/customers/${id}`, { method: 'DELETE', headers: { 'x-user-id': String(user.id) } });
      if (res.ok) {
        fetchData();
      } else {
        const errorData = await res.json();
        alert(errorData.error || 'Gagal menghapus pelanggan.');
      }
    } catch (err) {
      console.error(err);
      alert('Terjadi kesalahan koneksi saat menghapus pelanggan.');
    }
  };

  const handleEdit = (customer: Customer) => {
    setEditingCustomer(customer);
    setShowForm(true);
  };

  const filtered = customers.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    c.address?.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => { setShowForm(false); setEditingCustomer(null); }}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" 
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl overflow-hidden"
            >
              <div className="p-8 bg-white border-b border-slate-100 flex items-center justify-between">
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

              <div className="p-8 max-h-[70vh] overflow-y-auto">
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
                          <option key={p.id} value={`${p.name} - Rp ${p.price.toLocaleString()}`}>{p.name} (Rp {p.price.toLocaleString()})</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Alamat Pemasangan</label>
                    <textarea name="address" defaultValue={editingCustomer?.address} rows={2} placeholder="Gg. Kenanga No. 5..." className="w-full bg-slate-50 border-none p-6 rounded-2xl font-bold text-slate-700 outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all resize-none" />
                  </div>

                  {(isOldCustomer || editingCustomer) && (
                    <div className="bg-indigo-600 rounded-3xl p-6 text-white shadow-xl shadow-indigo-200">
                      <label className="text-[10px] font-black text-indigo-200 uppercase tracking-[0.2em] mb-4 block">Bulan Mulai Berlangganan</label>
                      <input 
                        name="created_at" 
                        type="month" 
                        required
                        defaultValue={editingCustomer?.created_at?.slice(0, 7) || new Date().toISOString().slice(0, 7)}
                        className="w-full bg-indigo-500 border border-indigo-400 h-14 px-6 rounded-2xl font-black text-white outline-none" 
                      />
                      <p className="text-[9px] font-bold text-indigo-300 mt-4 italic leading-relaxed uppercase tracking-tighter">Sistem akan otomatis menghitung tunggakan mulai dari bulan yang Anda pilih.</p>
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
          <motion.div 
            key={c.id} 
            layout
            className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-2xl hover:shadow-indigo-500/10 transition-all group relative overflow-hidden"
          >
             <div className="flex justify-between items-start mb-6">
                <div>
                   <h4 className="text-lg font-black text-slate-800 leading-tight">{c.name}</h4>
                   <div className="flex items-center gap-1.5 mt-2">
                      <div className={cn(
                        "px-3 py-1 rounded-full text-[8px] font-black uppercase flex items-center gap-1 shadow-sm",
                        c.is_paid ? "bg-emerald-50 text-emerald-600 border border-emerald-100" : "bg-rose-50 text-rose-600 border border-rose-100"
                      )}>
                         {c.is_paid ? <CheckCircle className="w-2.5 h-2.5" /> : <AlertTriangle className="w-2.5 h-2.5" />}
                         {c.is_paid ? 'LUNAS' : 'TUNGGAKAN'}
                      </div>
                      <div className="px-3 py-1 bg-indigo-50 text-indigo-600 text-[8px] font-black uppercase rounded-full border border-indigo-100 shadow-sm">
                         {c.packet.split(' - ')[0]}
                      </div>
                   </div>
                </div>
                <div className="flex flex-col gap-2">
                   <button onClick={() => handleEdit(c)} className="p-3 bg-slate-50 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-2xl transition-all active:scale-90">
                      <Plus className="w-5 h-5 rotate-45" />
                   </button>
                </div>
             </div>

             <div className="space-y-4 mb-6">
                <div className="flex items-center gap-3 text-xs font-bold text-slate-500">
                   <div className="w-8 h-8 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400"><MapPin className="w-4 h-4" /></div>
                   <span className="truncate">{c.address || 'Alamat tidak diatur'}</span>
                </div>
                <div className="flex items-center gap-3 text-xs font-bold text-slate-500">
                   <div className="w-8 h-8 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400"><Phone className="w-4 h-4" /></div>
                   <span>{c.phone || 'No WhatsApp'}</span>
                </div>
             </div>

             <div className="bg-slate-50/50 p-4 rounded-3xl border border-dashed border-slate-200 space-y-3">
                <div className="flex justify-between items-center">
                   <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none">Mulai Berlangganan</span>
                   <span className="text-[10px] font-bold text-slate-700 flex items-center gap-1">
                      <Calendar className="w-3" /> {c.created_at?.slice(0, 7) || 'Manual'}
                   </span>
                </div>
             </div>

             {user.role === 'admin' && (
                <div className="mt-6 pt-4 border-t border-slate-50 flex justify-end">
                   <button onClick={() => handleDelete(c.id)} className="p-2 text-slate-200 hover:text-rose-400 transition-colors">
                      <Trash2 className="w-4 h-4" />
                   </button>
                </div>
             )}
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function PacketManagement({ user, refreshTrigger }: { user: User, refreshTrigger?: number }) {
  const [packets, setPackets] = useState<Packet[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingPacket, setEditingPacket] = useState<Packet | null>(null);
  const [price, setPrice] = useState('');

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

  const handleDelete = async (id: number) => {
    if (!confirm('Hapus paket ini?')) return;
    try {
      const res = await fetch(`/api/packets/${id}`, { method: 'DELETE', headers: { 'x-user-id': String(user.id) } });
      if (res.ok) {
        fetchPackets();
      } else {
        const errorData = await res.json();
        alert(errorData.error || 'Gagal menghapus paket.');
      }
    } catch (err) {
      console.error(err);
      alert('Terjadi kesalahan koneksi saat menghapus paket.');
    }
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
             className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-2xl transition-all group relative overflow-hidden"
           >
              <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50 rounded-full -mr-16 -mt-16 group-hover:scale-125 transition-transform duration-500"></div>
              <div className="relative">
                 <p className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em] mb-1">Standard Plan</p>
                 <h4 className="text-xl font-black text-slate-800 tracking-tight">{p.name}</h4>
                 <div className="mt-8 flex items-baseline gap-1">
                    <span className="text-xs font-bold text-slate-400 uppercase">Rp</span>
                    <span className="text-4xl font-black text-slate-800 tracking-tighter">
                       {new Intl.NumberFormat('id-ID').format(p.price)}
                    </span>
                    <span className="text-[10px] text-slate-400 font-bold uppercase ml-1">/ Bln</span>
                 </div>
                 
                 <div className="mt-8 flex justify-between items-center border-t border-slate-50 pt-6">
                    <div className="flex gap-2">
                       <button 
                        onClick={() => handleEdit(p)}
                        className="p-3 bg-indigo-50 text-indigo-400 hover:text-indigo-600 rounded-xl transition-all active:scale-90"
                       >
                          <Settings className="w-5 h-5" />
                       </button>
                       <button 
                        onClick={() => handleDelete(p.id)}
                        className="p-3 bg-rose-50 text-rose-300 hover:text-rose-600 rounded-xl transition-all active:scale-90"
                       >
                          <Trash2 className="w-5 h-5" />
                       </button>
                    </div>
                    <div className="flex -space-x-2">
                       {[1,2,3].map(i => <div key={i} className="w-6 h-6 rounded-full bg-slate-100 border-2 border-white"></div>)}
                    </div>
                 </div>
              </div>
           </motion.div>
        ))}
        {packets.length === 0 && (
          <div className="col-span-full py-20 text-center border-4 border-dashed border-slate-50 rounded-[3rem] text-slate-300 font-black tracking-widest text-xs uppercase">
            Belum ada paket layanan
          </div>
        )}
      </div>
    </div>
  );
}

function SettingsManagement({ user, deferredPrompt, onInstall, refreshTrigger }: { user: User, deferredPrompt?: any, onInstall?: () => void, refreshTrigger?: number }) {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

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
          <p className="text-slate-500 text-sm">Kelola identitas bisnis dan konfigurasi aplikasi</p>
        </div>
      </header>

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
                  className="input-field h-12 font-bold" 
                  placeholder="Contoh: KONEKSINET"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Nomor Kontak (WhatsApp)</label>
                <input 
                  name="company_phone"
                  defaultValue={settings?.company_phone}
                  className="input-field h-12 font-mono" 
                  placeholder="0812-XXXX-XXXX"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Simbol Mata Uang</label>
                <input 
                  name="currency_symbol"
                  defaultValue={settings?.currency_symbol}
                  className="input-field h-12 w-24 text-center font-bold" 
                  placeholder="Rp"
                />
              </div>
            </div>

            <div className="space-y-4">
               {/* Spacer for layout */}
            </div>
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
                  className="input-field min-h-[100px] py-3 text-sm" 
                  placeholder="Alamat lengkap usaha"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Footer Struk (Terima Kasih)</label>
                <textarea 
                  name="receipt_footer"
                  defaultValue={settings?.receipt_footer}
                  className="input-field min-h-[100px] py-3 text-sm" 
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

      <div className="bg-amber-50 border border-amber-100 rounded-3xl p-6 flex flex-col md:flex-row items-center gap-6">
        <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center text-amber-500 shadow-sm border border-amber-100 flex-shrink-0">
           <Printer className="w-10 h-10" />
        </div>
        <div className="flex-1">
          <h4 className="font-bold text-amber-900 leading-tight">Uji Coba Cetak</h4>
          <p className="text-amber-800/60 text-sm mt-1">Pastikan printer thermal Anda terhubung sebelum melakukan pengaturan lebih lanjut.</p>
        </div>
        <button className="bg-white border border-amber-200 text-amber-600 font-bold px-6 py-3 rounded-xl hover:bg-amber-100 transition-all uppercase tracking-widest text-[10px]">
           Tes Print Halaman
        </button>
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
               <button 
                 onClick={async () => {
                   if (confirm('APAKAH ANDA YAKIN? Semua data pelanggan dan transaksi akan DIHAPUS PERMANEN. Akun petugas tidak akan terhapus.')) {
                     const pass = prompt('Ketik "KONFIRMASI" untuk melanjutkan:');
                     if (pass === 'KONFIRMASI') {
                       try {
                          const res = await fetch('/api/admin/reset-database', {
                            method: 'POST',
                            headers: { 'x-user-id': String(user.id) }
                          });
                          if (res.ok) {
                            alert('Database berhasil dikosongkan!');
                            window.location.reload();
                          } else {
                            alert('Gagal mengosongkan database.');
                          }
                       } catch (err) {
                          alert('Terjadi kesalahan koneksi.');
                       }
                     }
                   }
                 }}
                 className="bg-rose-500 hover:bg-black text-white font-black px-10 py-5 rounded-2xl shadow-xl shadow-rose-200 transition-all active:scale-95 text-xs uppercase tracking-[0.2em] flex items-center justify-center gap-3"
               >
                 <Trash2 className="w-5 h-5" />
                 Reset Database
               </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function UserManagement({ user, refreshTrigger }: { user: User, refreshTrigger?: number }) {
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
        <button onClick={() => setShowForm(!showForm)} className="btn-primary">
          <Plus className="w-5 h-5" /> Tambah Petugas
        </button>
      </header>

      {showForm && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="bg-white p-6 rounded-2xl border border-slate-200">
          <form onSubmit={handleAdd} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input name="name" placeholder="Nama Lengkap" className="input-field" required />
            <input name="username" placeholder="Username Login" className="input-field" required />
            <input name="password" type="password" placeholder="Password" className="input-field" required />
            <select name="role" className="input-field">
              <option value="penagih">Penagih (Restricted)</option>
              <option value="admin">Admin (Full Access)</option>
            </select>
            <button type="submit" className="md:col-span-2 btn-primary">Daftarkan User</button>
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

function StatCard({ title, amount, icon, color, settings }: { title: string, amount: number, icon: React.ReactNode, color: 'indigo' | 'emerald' | 'rose' | 'amber', settings?: AppSettings | null }) {
  const isNegative = amount < 0;
  
  const colorMap = {
    indigo: {
      bg: 'bg-indigo-50',
      iconBg: 'bg-indigo-500/10',
      text: 'text-indigo-600',
      accent: 'bg-indigo-600'
    },
    emerald: {
      bg: 'bg-emerald-50',
      iconBg: 'bg-emerald-500/10',
      text: 'text-emerald-600',
      accent: 'bg-emerald-600'
    },
    rose: {
      bg: 'bg-rose-50',
      iconBg: 'bg-rose-500/10',
      text: 'text-rose-600',
      accent: 'bg-rose-600'
    },
    amber: {
      bg: 'bg-amber-50',
      iconBg: 'bg-amber-500/10',
      text: 'text-amber-600',
      accent: 'bg-amber-600'
    }
  };

  const style = colorMap[color] || colorMap.indigo;

  return (
    <motion.div 
      whileHover={{ y: -4 }}
      className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 relative overflow-hidden group transition-all duration-300"
    >
      <div className={cn(
        "absolute top-0 right-0 w-24 h-24 -mr-8 -mt-8 rounded-full opacity-[0.03] group-hover:opacity-[0.08] transition-all duration-500",
        style.accent
      )} />
      
      <div className="flex items-center gap-4 mb-4 relative z-10 text-slate-100">
        <div className={cn("p-3 rounded-2xl transition-transform group-hover:scale-110", style.bg)}>
          {icon}
        </div>
        <div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">{title}</p>
          <div className="h-0.5 w-6 rounded-full bg-slate-100 mt-1" />
        </div>
      </div>
      
      <p className={cn(
        "text-2xl font-black tracking-tight tabular-nums relative z-10",
        isNegative ? "text-rose-600" : "text-slate-800"
      )}>
        {settings?.currency_symbol || 'Rp'} {Math.abs(amount).toLocaleString('id-ID')}
      </p>
      
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-slate-50 overflow-hidden rounded-full mx-6 mb-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <motion.div 
          initial={{ width: 0 }}
          whileInView={{ width: '100%' }}
          className={cn("h-full", style.accent)} 
        />
      </div>
    </motion.div>
  );
}

function TransactionModal({ user, isAdmin, onClose, onSuccess }: { user: User, isAdmin: boolean, onClose: () => void, onSuccess: (t: Transaction) => void }) {
  const [type, setType] = useState<'pemasukan' | 'pengeluaran'>('pemasukan');

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    try {
      const formData = new FormData(e.currentTarget);
      const data = {
        type: formData.get('type'),
        category: formData.get('category'),
        amount: Number(formData.get('amount')),
        description: formData.get('description'),
        billing_period: (formData.get('category') === 'Tagihan Bulanan' || formData.get('billing_period')) ? formData.get('billing_period') : null,
        transaction_date: formData.get('transaction_date')
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-slate-900/70 backdrop-blur-sm" 
      />
      <motion.div 
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0, y: 20 }}
        className="relative bg-slate-50 w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden"
      >
        <div className="bg-white p-6 border-b border-slate-100 flex items-center justify-between">
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

        <form onSubmit={handleSubmit} className="p-8 space-y-6">
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
                <select name="category" className="w-full bg-white border border-slate-100 h-12 pl-11 pr-4 rounded-xl font-bold text-slate-700 focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500/50 outline-none appearance-none transition-all">
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
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-500 transition-colors">
                <Coins className="w-5 h-5" />
              </div>
              <input name="amount" type="number" step="1000" className="w-full bg-white border border-slate-100 h-16 pl-12 pr-4 rounded-2xl font-black text-2xl text-slate-800 focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500/50 outline-none transition-all tabular-nums placeholder:text-slate-200" placeholder="0" required />
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

function PaymentReport({ user, refreshTrigger }: { user: User, refreshTrigger?: number }) {
  const [data, setData] = useState<any[]>([]);
  const [months, setMonths] = useState<string[]>([]);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  useEffect(() => {
    // Generate last 12 months for the selected year
    const last12Months = [];
    for (let i = 0; i < 12; i++) {
      const d = new Date(selectedYear, i, 1);
      last12Months.push(d.toISOString().slice(0, 7));
    }
    // Order from left to right (chronological) is already done by i = 0 to 11
    setMonths(last12Months);
  }, [selectedYear]);

  useEffect(() => {
    const fetchReport = async () => {
      try {
        const res = await fetch('/api/reports/payments', { headers: { 'x-user-id': String(user.id) } });
        if (res.ok) {
          setData(await res.json());
        }
      } catch (err) {
        console.error('Failed to fetch payment report:', err);
      }
    };
    fetchReport();
  }, [refreshTrigger]);

  const customers = Array.from(new Set(data.map(d => d.customer_name))).sort();

  return (
    <div className="space-y-6">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Laporan Pembayaran Bulanan</h2>
          <p className="text-slate-500">Monitor status tagihan pelanggan per bulan</p>
        </div>
        <div className="flex items-center gap-2 bg-white p-2 rounded-2xl border border-slate-200">
          <button 
            onClick={() => setSelectedYear(selectedYear - 1)}
            className="p-2 hover:bg-slate-100 rounded-xl transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <span className="font-black text-slate-800 px-4">{selectedYear}</span>
          <button 
            onClick={() => setSelectedYear(selectedYear + 1)}
            className="p-2 hover:bg-slate-100 rounded-xl transition-colors"
          >
            <ArrowRightCircle className="w-4 h-4" />
          </button>
        </div>
      </header>

      <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left font-sans min-w-[1000px]">
            <thead className="bg-slate-50 text-slate-400 text-[10px] uppercase font-bold border-b border-slate-100">
              <tr>
                <th className="px-6 py-5 sticky left-0 bg-slate-50 z-20 w-64 border-r border-slate-100">Pelanggan / Alamat</th>
                {months.map(m => (
                  <th key={m} className="px-4 py-5 text-center min-w-[80px]">{formatPeriod(m).split(' ')[0]}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {customers.map(c => {
                const customerData = data.filter(d => d.customer_name === c);
                const address = customerData[0]?.customer_address || '';
                
                return (
                  <tr key={c} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-6 py-4 sticky left-0 bg-white group-hover:bg-slate-50 z-10 border-r border-slate-100 shadow-[2px_0_10px_rgba(0,0,0,0.03)]">
                      <div className="flex flex-col">
                        <span className="font-black text-slate-900 text-sm">{c}</span>
                        <span className="text-[10px] text-slate-400 font-medium truncate max-w-[200px]">{address}</span>
                      </div>
                    </td>
                    {months.map(m => {
                      const payment = data.find(d => 
                        d.customer_name === c && 
                        d.billing_period && 
                        d.billing_period.split(',').includes(m)
                      );
                      const customerInfo = data.find(d => d.customer_name === c);
                      const registrationMonth = customerInfo?.customer_created_at?.slice(0, 7) || '2000-01';
                      const isAfterRegistration = m >= registrationMonth;
                      const isPastOrCurrent = m <= new Date().toISOString().slice(0, 7);
                      const shouldBePaid = isAfterRegistration && isPastOrCurrent;
                      
                      return (
                        <td key={m} className="px-2 py-4 text-center">
                          {payment ? (
                            <motion.div 
                              initial={{ scale: 0.8, opacity: 0 }}
                              animate={{ scale: 1, opacity: 1 }}
                              className="group/item relative"
                            >
                              <div className={cn(
                                "w-8 h-8 rounded-xl flex items-center justify-center mx-auto shadow-sm transition-transform group-hover/item:scale-110",
                                payment.status === 'confirmed' ? "bg-emerald-500 text-white" : "bg-amber-400 text-white"
                              )}>
                                <CheckCircle className="w-4 h-4" />
                              </div>
                              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 opacity-0 group-hover/item:opacity-100 transition-opacity bg-slate-900 text-white text-[9px] py-2 px-3 rounded-xl whitespace-nowrap z-50 pointer-events-none shadow-2xl flex flex-col gap-1 items-center border border-white/10">
                                <span className="font-black text-indigo-400 border-b border-indigo-500/30 pb-0.5 mb-0.5">{payment.status === 'confirmed' ? 'LUNAS' : 'PENDING'}</span>
                                <span className="font-bold">Rp {payment.amount?.toLocaleString()}</span>
                                <span className="text-[8px] opacity-70">Bayar: {payment.transaction_date}</span>
                                <span className="text-[8px] opacity-80 flex items-center gap-1 font-black">
                                  <UserCheck className="w-2.5 h-2.5" /> {payment.collector_name || 'Admin'}
                                </span>
                              </div>
                            </motion.div>
                          ) : (
                            <div className={cn(
                              "w-8 h-8 rounded-xl mx-auto flex items-center justify-center transition-all",
                              shouldBePaid ? "bg-rose-50 border border-rose-200 text-rose-500 shadow-inner group/unpaid relative" : "bg-slate-50 border border-slate-100 text-slate-200"
                            )}>
                               {shouldBePaid ? (
                                 <div className="flex items-center justify-center">
                                   <X className="w-3.5 h-3.5" />
                                   <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 opacity-0 group-hover/unpaid:opacity-100 transition-opacity bg-rose-600 text-white text-[8px] py-1 px-2 rounded-lg whitespace-nowrap z-50 pointer-events-none font-bold shadow-lg">
                                      MENUNGGAK
                                   </div>
                                 </div>
                               ) : (
                                 <div className="w-1 h-1 rounded-full bg-slate-200" />
                               )}
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
              {customers.length === 0 && (
                <tr>
                  <td colSpan={months.length + 1} className="py-32 text-center">
                    <div className="flex flex-col items-center gap-2">
                       <FileText className="w-12 h-12 text-slate-100" />
                       <p className="text-slate-400 text-sm font-medium italic">Belum ada data pelanggan tercatat.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      
      <div className="flex flex-wrap gap-6 items-center bg-slate-50 p-6 rounded-3xl border border-slate-100">
         <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center text-white shadow-lg shadow-emerald-500/20">
               <CheckCircle className="w-5 h-5" />
            </div>
            <div>
               <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Lunas</p>
               <p className="text-xs font-bold text-slate-700">Telah diverifikasi</p>
            </div>
         </div>
         <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-400 rounded-xl flex items-center justify-center text-white shadow-lg shadow-amber-500/20">
               <CheckCircle className="w-5 h-5" />
            </div>
            <div>
               <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Pending</p>
               <p className="text-xs font-bold text-slate-700">Belum disetor/konfirmasi</p>
            </div>
         </div>
         <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-rose-50 border border-rose-200 rounded-xl flex items-center justify-center text-rose-500">
               <X className="w-5 h-5" />
            </div>
            <div>
               <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Menunggak</p>
               <p className="text-xs font-bold text-slate-700">Lewat jatuh tempo</p>
            </div>
         </div>
      </div>
    </div>
  );
}
