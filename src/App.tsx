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
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { User, Transaction, DashboardStats, Customer, Packet } from './types';
import { cn } from './lib/utils';
import { generateInvoicePDF } from './lib/pdf';

const CATEGORIES = {
  pemasukan: ['Tagihan Bulanan', 'Voucher', 'Pemasangan Baru', 'Denda', 'Lainnya'],
  pengeluaran: ['ISP Pusat', 'Alat', 'Operasional', 'Gaji', 'Sewa Tempat', 'Lainnya']
};

const getBillingPeriods = () => {
  const periods = [];
  const now = new Date();
  for (let i = -6; i <= 3; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    periods.push(d.toISOString().slice(0, 7));
  }
  return periods.sort();
};

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [printerStatus, setPrinterStatus] = useState<'not_connected' | 'checking' | 'ready'>('not_connected');

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
    <div className="min-h-screen flex flex-col md:flex-row">
      {/* Sidebar - Desktop */}
      <aside className="hidden md:flex w-64 bg-slate-900 text-slate-300 flex-col p-6 space-y-8 sticky top-0 h-screen">
        <div className="flex items-center gap-3 text-white">
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <Coins className="w-6 h-6" />
          </div>
          <div>
            <h1 className="font-bold text-lg leading-tight uppercase tracking-wider">RT/RW NET</h1>
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
            </>
          )}
          <SidebarLink active={activeTab === 'history'} onClick={() => setActiveTab('history')} icon={<History className="w-5 h-5" />} label="Riwayat" />
        </nav>

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
              <span className="block font-black text-slate-900 tracking-tighter text-lg leading-none">RT/RW NET</span>
              <div className="flex items-center gap-1.5 mt-1">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{user.role}</span>
                <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                <div className="flex items-center gap-1">
                  <div className={cn("w-1.5 h-1.5 rounded-full animate-pulse", printerStatus === 'ready' ? "bg-emerald-500" : "bg-rose-500")}></div>
                  <span className="text-[9px] font-bold text-slate-400">PRINTER {printerStatus === 'ready' ? 'SIAP' : 'OFF'}</span>
                </div>
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
                {activeTab === 'dashboard' && <AdminDashboard user={user} />}
                {activeTab === 'customers' && <CustomerManagement user={user} />}
                {activeTab === 'packets' && <PacketManagement user={user} />}
                {activeTab === 'users' && <UserManagement user={user} />}
                {activeTab === 'reports' && <PaymentReport user={user} />}
                {activeTab === 'history' && <AdminDashboard user={user} />}
              </>
            ) : (
              <>
                {activeTab === 'dashboard' && <CollectorDashboard user={user} />}
                {activeTab === 'customers' && <CustomerManagement user={user} />}
                {activeTab === 'history' && <CollectorDashboard user={user} />}
              </>
            )}
          </motion.div>
        </AnimatePresence>

        <MobileNav activeTab={activeTab} setActiveTab={setActiveTab} user={user} />
      </main>

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
    <nav className="md:hidden fixed bottom-6 left-4 right-4 bg-slate-900 shadow-2xl shadow-indigo-900/40 px-6 py-3 rounded-2xl flex items-center justify-between z-[100] border border-slate-800 backdrop-blur-md bg-opacity-95">
      <MobileNavItem active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} icon={<LayoutDashboard className="w-6 h-6" />} />
      <MobileNavItem active={activeTab === 'customers'} onClick={() => setActiveTab('customers')} icon={<UsersIcon className="w-6 h-6" />} />
      {user.role === 'admin' && (
        <>
          <MobileNavItem active={activeTab === 'packets'} onClick={() => setActiveTab('packets')} icon={<BarChart3 className="w-6 h-6" />} />
          <MobileNavItem active={activeTab === 'reports'} onClick={() => setActiveTab('reports')} icon={<CalendarCheck2 className="w-6 h-6" />} />
        </>
      )}
      <MobileNavItem active={activeTab === 'history'} onClick={() => setActiveTab('history')} icon={<History className="w-6 h-6" />} />
    </nav>
  );
}

function MobileNavItem({ active, onClick, icon }: { active: boolean, onClick: () => void, icon: React.ReactNode }) {
  return (
    <button onClick={onClick} className={cn(
      "p-2 rounded-xl transition-all duration-300 relative",
      active ? "text-indigo-400 scale-110" : "text-slate-500"
    )}>
      {icon}
      {active && (
        <motion.div 
          layoutId="mobile-nav-indicator"
          className="absolute -bottom-1 left-1 right-1 h-0.5 bg-indigo-500 rounded-full"
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

        <div className="bg-[#11141b]/80 backdrop-blur-2xl border border-white/5 p-10 rounded-[3rem] shadow-2xl relative">
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

function AdminDashboard({ user }: { user: User }) {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [pendingDeposits, setPendingDeposits] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [transactionToPrint, setTransactionToPrint] = useState<Transaction | null>(null);
  const [isPrinting, setIsPrinting] = useState(false);

  const printTransaction = async (id: number) => {
    try {
      setIsPrinting(true);
      const res = await fetch(`/api/transactions/${id}`, {
        headers: { 'x-user-id': String(user.id) }
      });
      if (res.ok) {
        const trans = await res.json();
        setTransactionToPrint(trans);
        setTimeout(() => {
          window.print();
          setIsPrinting(false);
        }, 500);
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

  useEffect(() => { fetchData(); }, []);

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
            <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></span>
            <h2 className="text-2xl font-black tracking-tight text-slate-800">Ringkasan Sistem</h2>
          </div>
          <p className="text-slate-500 text-sm">Monitoring arus kas dan operasional RT/RW Net</p>
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
        <StatCard title="Saldo Kas Saat Ini" amount={stats?.balance || 0} icon={<Wallet className="w-6 h-6 text-indigo-600" />} color="indigo" />
        <StatCard title="Total Pemasukan" amount={stats?.totalIncome || 0} icon={<ArrowUpCircle className="w-6 h-6 text-emerald-600" />} color="emerald" />
        <StatCard title="Uang Masuk Petugas" amount={stats?.pendingAmount || 0} icon={<Coins className="w-6 h-6 text-amber-600" />} color="amber" />
        <StatCard title="Total Pengeluaran" amount={stats?.totalExpense || 0} icon={<ArrowDownCircle className="w-6 h-6 text-rose-600" />} color="rose" />
      </div>

      {/* Pending Deposits Section */}
      {pendingDeposits.length > 0 && (
        <motion.div 
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-amber-50 border border-amber-200 rounded-[2rem] p-8 shadow-xl shadow-amber-500/5"
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
            <div key={t.id} className="p-5 hover:bg-slate-50/50 transition-colors">
              <div className="flex justify-between items-start mb-2">
                <div className="flex items-center gap-3">
                   <div className={cn(
                     "w-10 h-10 rounded-xl flex items-center justify-center",
                     t.type === 'pemasukan' ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"
                   )}>
                     {t.type === 'pemasukan' ? <ArrowUpCircle className="w-5 h-5" /> : <ArrowDownCircle className="w-5 h-5" />}
                   </div>
                   <div>
                     <div className="font-black text-slate-800 leading-tight">{t.customer_name || t.category}</div>
                     <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{t.customer_name ? t.category : t.description}</div>
                   </div>
                </div>
                <div className={cn(
                  "font-black tabular-nums text-sm",
                  t.type === 'pemasukan' ? "text-emerald-600" : "text-rose-600"
                )}>
                  {t.type === 'pemasukan' ? '+' : '-'} {new Intl.NumberFormat('id-ID').format(t.amount)}
                </div>
              </div>
              <div className="flex justify-between items-center bg-slate-50 p-3 rounded-xl mt-3">
                <div className="text-[9px] text-slate-400 font-black uppercase tracking-widest leading-none">
                  <div className="mb-1">{t.transaction_date}</div>
                  <div className="flex items-center gap-1 text-indigo-500">
                    <UserIcon className="w-3 h-3" />
                    {t.collector_name || 'System / Admin'}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => printTransaction(t.id)} className="p-2 transition-all active:scale-90"><Printer className="w-4 h-4 text-slate-300" /></button>
                  <button onClick={() => handleDelete(t.id)} className="p-2 transition-all active:scale-90"><Trash2 className="w-4 h-4 text-rose-300" /></button>
                </div>
              </div>
            </div>
          ))}
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
                    <div className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">{t.customer_name ? t.category : t.description}</div>
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


      <Receipt transaction={transactionToPrint} userName={user.name} />

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

function CollectorDashboard({ user }: { user: User }) {
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
  const [transactionToPrint, setTransactionToPrint] = useState<Transaction | null>(null);
  const [isPrinting, setIsPrinting] = useState(false);
  const [isOldInQuickAdd, setIsOldInQuickAdd] = useState(false);

  const printTransaction = async (id: number) => {
    try {
      setIsPrinting(true);
      const res = await fetch(`/api/transactions/${id}`, {
        headers: { 'x-user-id': String(user.id) }
      });
      if (res.ok) {
        const trans = await res.json();
        setTransactionToPrint(trans);
        setTimeout(() => {
          window.print();
          setIsPrinting(false);
        }, 500);
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
      const [transRes, custRes, packRes] = await Promise.all([
        fetch('/api/transactions', { headers: { 'x-user-id': String(user.id) } }),
        fetch('/api/customers', { headers: { 'x-user-id': String(user.id) } }),
        fetch('/api/packets', { headers: { 'x-user-id': String(user.id) } })
      ]);
      if (transRes.ok) setTransactions(await transRes.json());
      if (custRes.ok) setCustomers(await custRes.json());
      if (packRes.ok) setPackets(await packRes.json());
    } catch (err) {
      console.error('Failed to fetch initial collector data:', err);
    }
  };

  useEffect(() => { fetchInitialData(); }, []);

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
      fetch(`/api/customers/${selectedCustomerId}/payments`, { headers: { 'x-user-id': String(user.id) } })
        .then(res => res.json())
        .then(data => {
          setCustomerPayments(data);
          const unpaid = getUnpaidMonthsList(data);
          if (unpaid.length > 0) {
            setSelectedPeriods([unpaid[unpaid.length - 1]]);
          } else {
            setSelectedPeriods([]);
          }
        });
      
      const customer = customers.find(c => String(c.id) === selectedCustomerId);
      if (customer) {
        setSearchTerm(customer.name);
        
        // Auto-set amount for Monthly Billing category
        if (selectedCategory === 'Tagihan Bulanan') {
          // Extract price more robustly: look for Rp then numbers, dots, or commas
          const priceMatch = customer.packet.match(/Rp\s?([\d.,]+)/);
          if (priceMatch) {
            // Remove dots and commas to get the raw number
            const numericPrice = priceMatch[1].replace(/[.,]/g, '');
            setAmount(numericPrice);
          }
        }
      }
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

  const getUnpaidMonthsList = (payments: any[]) => {
    if (!selectedCustomerId) return [];
    const customer = customers.find(c => String(c.id) === selectedCustomerId);
    const joinMonth = customer?.created_at?.slice(0, 7) || '2000-01';
    
    const now = new Date();
    const months = [];
    for (let i = -6; i <= 3; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
      const period = d.toISOString().slice(0, 7);
      
      // Filter: only show months starting from join month
      if (period < joinMonth) continue;
      
      const isPaid = payments.some(p => p.billing_period === period && p.category === 'Tagihan Bulanan');
      if (!isPaid) {
        months.push(period);
      }
    }
    return months.sort();
  };

  const getUnpaidForCustomer = (c: Customer) => {
    const paidArr = c.paid_months ? c.paid_months.split(',') : [];
    const joinMonth = c.created_at?.slice(0, 7) || '2000-01';
    const now = new Date();
    const months = [];
    for (let i = -6; i <= 0; i++) {
        const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
        const period = d.toISOString().slice(0, 7);
        if (period < joinMonth) continue;
        if (!paidArr.includes(period)) {
            months.push(period);
        }
    }
    return months.sort();
  };

  const unpaidMonthsList = getUnpaidMonthsList(customerPayments);

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
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    const customerId = formData.get('customer_id');
    const billingPeriod = formData.get('billing_period');
    const billingPeriods = selectedPeriods.length > 0 ? selectedPeriods : (billingPeriod ? [String(billingPeriod)] : []);

    if (billingPeriods.length === 0) {
      alert('Pilih setidaknya satu bulan tagihan.');
      setLoading(false);
      return;
    }

    try {
      for (const period of billingPeriods) {
        const data = {
          type: 'pemasukan',
          category: formData.get('category') || 'Tagihan Bulanan',
          amount: Number(amount),
          description: billingPeriods.length > 1 ? `Pembayaran: ${billingPeriods.join(', ')}` : (formData.get('description') || `Tagihan Bulan ${period}`),
          billing_period: period,
          transaction_date: new Date().toISOString().split('T')[0],
          customer_id: customerId ? Number(customerId) : null
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
          const savedTrans = await res.json();
          const customer = customers.find(c => c.id === data.customer_id);
          const printObj = { ...savedTrans, customer_name: customer?.name, billing_period: billingPeriods.join(', ') };
          setTransactionToPrint(printObj);
          
          // Small delay to ensure state is updated before print
          setTimeout(() => {
            window.print();
          }, 500);
        } else {
          const errorData = await res.json();
          alert(errorData.error || 'Gagal menyimpan transaksi.');
          setLoading(false);
          return;
        }
      }

      setSelectedCustomerId('');
      setAmount('');
      setSelectedPeriods([]);
      e.currentTarget.reset();
      fetchInitialData();
    } catch (err) {
      console.error(err);
      alert('Gagal menyimpan. Terjadi kesalahan koneksi.');
    }
    setLoading(false);
  };

  return (
    <div className="space-y-8 max-w-2xl mx-auto pb-12">
      <div className="bg-white border border-slate-200 rounded-[2rem] p-8 shadow-xl shadow-indigo-900/5 flex flex-col md:flex-row md:items-center justify-between gap-8">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center">
            <Wallet className="w-8 h-8" />
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Kas di Tangan Anda</p>
            <p className="text-4xl font-black text-slate-800 tracking-tighter">Rp {heldBalance.toLocaleString()}</p>
          </div>
        </div>
        <button 
          onClick={handleDeposit}
          disabled={heldBalance === 0}
          className="bg-indigo-600 text-white font-black px-8 py-5 rounded-2xl hover:bg-black disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-xl shadow-indigo-500/20 flex items-center justify-center gap-3 w-full md:w-auto group active:scale-95"
        >
          <Coins className="w-6 h-6 group-hover:scale-125 transition-transform" /> 
          <span className="uppercase tracking-widest text-xs">Setor ke Admin</span>
        </button>
      </div>


      <header className="mb-4">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
          <h2 className="text-2xl font-black tracking-tight text-slate-800 font-sans">Input Data Tagihan</h2>
        </div>
        <p className="text-slate-500 text-sm">Pastikan nominal dan periode sudah sesuai dengan penagihan</p>
      </header>

      {/* Input Form Card */}
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-indigo-600 rounded-3xl p-6 md:p-8 text-white shadow-2xl shadow-indigo-200 border-b-4 border-indigo-800"
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-sm font-medium text-indigo-100">Pilih Pelanggan</label>
                <button 
                  type="button"
                  onClick={() => setShowQuickAdd(true)}
                  className="text-[10px] font-bold bg-indigo-500/50 hover:bg-white hover:text-indigo-600 px-2 py-1 rounded transition-all flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" /> Tambah Baru
                </button>
              </div>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Cari nama atau alamat..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setShowCustomerList(true);
                  }}
                  onFocus={() => setShowCustomerList(true)}
                  className="w-full bg-white text-slate-900 border-none px-4 py-3 rounded-xl focus:ring-4 focus:ring-indigo-400/30 transition-all font-medium"
                />
                <input type="hidden" name="customer_id" value={selectedCustomerId} />
                
                {showCustomerList && searchTerm && (
                  <div className="absolute z-[110] left-0 right-0 mt-2 bg-white rounded-2xl shadow-2xl border border-slate-100 max-h-60 overflow-y-auto overflow-x-hidden">
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
                          className="w-full text-left px-5 py-3 hover:bg-slate-50 transition-colors border-b last:border-0 border-slate-50"
                        >
                          <div className="font-bold text-slate-900 flex items-center justify-between">
                            <span>{c.name}</span>
                            {c.is_paid ? (
                              <span className="text-[9px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">LUNAS</span>
                            ) : (
                              <span className="text-[9px] font-black text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full">BELUM BAYAR</span>
                            )}
                          </div>
                          <div className="text-[10px] text-slate-500 uppercase flex justify-between">
                            <span>{c.packet}</span>
                            <span className="italic">{c.address}</span>
                          </div>
                        </button>
                      ))
                    ) : (
                      <div className="px-5 py-4 text-center text-slate-400 italic text-sm">
                        Pelanggan tidak ditemukan.
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
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-indigo-100 mb-2">Bulan Tagihan (Klik untuk Pilih Multiple)</label>
              {selectedCustomerId && (
                <div className="mb-3 flex items-center gap-2">
                  <span className="text-[10px] font-bold bg-indigo-500/50 text-indigo-50 px-2 py-1 rounded-full flex items-center gap-1">
                    <History className="w-3 h-3" /> 
                    Tracking sejak: {customers.find(c => String(c.id) === selectedCustomerId)?.created_at?.slice(0, 7) || '-'}
                  </span>
                </div>
              )}
              <div className="flex flex-wrap gap-2">
                {unpaidMonthsList.length > 0 ? (
                  unpaidMonthsList.map(m => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => togglePeriod(m)}
                      className={cn(
                        "px-3 py-2 rounded-xl text-xs font-bold transition-all border-2",
                        selectedPeriods.includes(m) 
                          ? "bg-white text-indigo-600 border-white shadow-lg" 
                          : "bg-indigo-500 text-indigo-100 border-indigo-400 hover:bg-indigo-400"
                      )}
                    >
                      {m}
                      {m > new Date().toISOString().slice(0, 7) && <span className="ml-1 opacity-50">(Depan)</span>}
                      {selectedPeriods.includes(m) && <Check className="w-3 h-3 ml-1 inline" />}
                    </button>
                  ))
                ) : (
                  <input name="billing_period" type="month" defaultValue={new Date().toISOString().slice(0, 7)} className="w-full bg-white text-slate-900 border-none px-4 py-3 rounded-xl focus:ring-4 focus:ring-indigo-400/30 transition-all font-medium" />
                )}
              </div>
              {unpaidMonthsList.length > 1 && !selectedPeriods.includes(unpaidMonthsList[0]) && (
                <p className="text-[10px] text-indigo-200 mt-2 italic">Pelanggan memiliki tunggakan dari bulan {unpaidMonthsList[0]}</p>
              )}
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-indigo-100 mb-2">Kategori Setoran</label>
              <select 
                name="category" 
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full bg-white text-slate-900 border-none px-4 py-3 rounded-xl focus:ring-4 focus:ring-indigo-400/30 transition-all font-medium"
              >
                <option value="Tagihan Bulanan">Tagihan Bulanan</option>
                <option value="Pemasangan Baru">Pemasangan Baru</option>
                <option value="Lain-lain">Lain-lain</option>
              </select>
            </div>
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-sm font-medium text-indigo-100">
                  Jumlah {selectedPeriods.length > 1 ? `x ${selectedPeriods.length} Bulan` : ''} (Rp)
                </label>
                {selectedCategory === 'Tagihan Bulanan' && amount && (
                  <span className="text-[10px] font-bold bg-green-500/30 text-white px-2 py-0.5 rounded-full flex items-center gap-1">
                    <Lock className="w-2.5 h-2.5" /> Terkunci Harga Paket
                  </span>
                )}
              </div>
              <div className="relative">
                <input 
                  name="amount" 
                  type="number" 
                  required 
                  value={amount}
                  readOnly={selectedCategory === 'Tagihan Bulanan'}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="Contoh: 150000"
                  className={cn(
                    "w-full text-slate-900 border-none px-4 py-3 rounded-xl focus:ring-4 transition-all font-bold text-lg",
                    selectedCategory === 'Tagihan Bulanan' 
                      ? "bg-indigo-50/50 cursor-not-allowed focus:ring-transparent" 
                      : "bg-white focus:ring-indigo-400/30"
                  )}
                />
                {selectedPeriods.length > 1 && (
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 bg-indigo-50 text-indigo-600 px-3 py-1 rounded-lg text-xs font-black">
                    Total: Rp {totalAmount.toLocaleString()}
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-6">
            <div>
              <label className="block text-sm font-medium text-indigo-100 mb-2">Keterangan (Opsional)</label>
              <input 
                name="description" 
                type="text" 
                placeholder="Catatan kecil..."
                className="w-full bg-white text-slate-900 border-none px-4 py-3 rounded-xl focus:ring-4 focus:ring-indigo-400/30 transition-all" 
              />
            </div>
          </div>
          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-white text-indigo-600 font-bold py-4 rounded-2xl hover:bg-slate-100 active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-lg"
          >
            {loading ? 'Sabar Menabung...' : <><Plus className="w-6 h-6" /> Simpan Transaksi</>}
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
          {transactions.slice(0, 5).map((t) => (
            <motion.div 
              key={t.id} 
              layout
              className="bg-white p-4 rounded-2xl border border-slate-100 flex items-center justify-between shadow-sm hover:shadow-md transition-shadow group"
            >
              <div className="flex-1">
                <p className="font-bold text-slate-800">{t.customer_name || t.category}</p>
                <p className="text-xs text-slate-400 font-mono italic">{t.customer_name ? t.category : t.description}</p>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className="text-emerald-600 font-bold">
                    + {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(t.amount)}
                  </p>
                  <p className="text-[10px] text-slate-300 font-medium">{t.transaction_date}</p>
                </div>
                <button 
                  onClick={() => printTransaction(t.id)}
                  disabled={isPrinting}
                  className="p-2 bg-slate-50 text-slate-400 hover:text-indigo-600 rounded-lg group-hover:scale-110 transition-all disabled:opacity-50"
                  title="Cetak Struk"
                >
                  <Printer className={cn("w-4 h-4", isPrinting && transactionToPrint?.id === t.id && "animate-pulse")} />
                </button>
                {t.customer_id && (
                  <button 
                    onClick={() => handleDownloadInvoice(t.id)}
                    className="p-2 bg-slate-50 text-slate-400 hover:text-emerald-600 rounded-lg group-hover:scale-110 transition-all ml-1"
                    title="Download PDF"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                )}
              </div>
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
            {customers.filter(c => !c.is_paid).length} Pelanggan
          </span>
        </div>
        <div className="grid grid-cols-1 gap-3">
          {customers.filter(c => !c.is_paid).map((c) => {
            const unpaid = getUnpaidForCustomer(c);
            const amount = c.packet.split(' - Rp ')[1] || '0';
            
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
                      {unpaid.map(m => (
                        <span key={m} className="text-[9px] font-black bg-rose-50 text-rose-500 px-2 py-1 rounded-md border border-rose-100">
                          {m}
                        </span>
                      ))}
                      {unpaid.length === 0 && <span className="text-[9px] text-emerald-500 font-bold">Periode ini belum update</span>}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-6 text-right shrink-0">
                    <div>
                      <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">Tagihan</p>
                      <p className="text-sm font-black text-rose-600">Rp {amount}</p>
                    </div>
                    <div className="hidden sm:block">
                      <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">Bayar Terakhir</p>
                      <p className="text-xs font-mono font-bold text-slate-600">
                        {c.last_payment_date?.split('T')[0] || <span className="text-rose-300 italic">N/A</span>}
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
          {customers.filter(c => !c.is_paid).length === 0 && (
            <div className="text-center py-10 bg-emerald-50 border-2 border-dashed border-emerald-100 rounded-2xl">
              <Check className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
              <p className="text-emerald-700 font-bold">Luar Biasa! Semua pelanggan sudah lunas.</p>
            </div>
          )}
        </div>
      </div>

      <Receipt transaction={transactionToPrint} userName={user.name} />

      <AnimatePresence>
        {showQuickAdd && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-white rounded-3xl p-8 w-full max-w-lg shadow-2xl overflow-y-auto max-h-[90vh]"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-slate-800">Tambah Pelanggan Cepat</h3>
                <div className="flex bg-slate-100 p-1 rounded-lg scale-90">
                  <button 
                    type="button"
                    onClick={() => setIsOldInQuickAdd(false)}
                    className={cn("px-3 py-1.5 text-[9px] font-black rounded-md transition-all", !isOldInQuickAdd ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500")}
                  >
                    BARU
                  </button>
                  <button 
                    type="button"
                    onClick={() => setIsOldInQuickAdd(true)}
                    className={cn("px-3 py-1.5 text-[9px] font-black rounded-md transition-all", isOldInQuickAdd ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500")}
                  >
                    LAMA
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
                      setTransactionToPrint(newTrans);
                      // Slight delay to allow modal close before print
                      setTimeout(() => {
                        window.print();
                        fetchInitialData();
                      }, 500);
                    }
                  }

                  setShowQuickAdd(false);
                  await fetchInitialData();
                  setSelectedCustomerId(String(newCust.id));
                }
              }} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Nama Lengkap</label>
                    <input name="name" required className="w-full border-2 border-slate-100 rounded-xl px-4 py-3 focus:border-indigo-500 outline-none transition-all" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Pilih Paket</label>
                    <select 
                      name="packet" 
                      required 
                      className="w-full border-2 border-slate-100 rounded-xl px-4 py-3 focus:border-indigo-500 outline-none transition-all"
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
                      <option value="">-- Pilih Paket --</option>
                      {packets.map(p => (
                        <option key={p.id} value={`${p.name} - Rp ${p.price.toLocaleString()}`}>
                          {p.name} (Rp {p.price.toLocaleString()})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Alamat</label>
                  <input name="address" className="w-full border-2 border-slate-100 rounded-xl px-4 py-3 focus:border-indigo-500 outline-none transition-all" />
                </div>

                {isOldInQuickAdd && (
                  <div className="bg-indigo-50/50 p-4 rounded-2xl border border-indigo-100/50">
                    <label className="block text-[10px] font-bold text-indigo-400 uppercase mb-1">Bulan Bergabung (Join Month)</label>
                    <input 
                      name="created_at" 
                      type="month" 
                      required 
                      defaultValue={new Date().toISOString().slice(0, 7)}
                      className="w-full bg-white border-2 border-indigo-100 rounded-xl px-4 py-2 focus:border-indigo-500 outline-none transition-all" 
                    />
                  </div>
                )}

                <div className="pt-4 border-t border-slate-100">
                   <label className="flex items-center gap-3 cursor-pointer group">
                      <input type="checkbox" name="pay_now" className="w-5 h-5 rounded border-2 border-slate-200 text-indigo-600 focus:ring-indigo-500" />
                      <span className="text-sm font-bold text-slate-700 group-hover:text-indigo-600 transition-colors">Catat Pembayaran Langsung?</span>
                   </label>
                </div>

                <div className="space-y-4 bg-slate-50 p-4 rounded-2xl hidden has-[input[name='pay_now']:checked]:block">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Kategori</label>
                      <select name="p_category" className="w-full bg-white border-2 border-white rounded-lg px-3 py-2 text-sm outline-none focus:border-indigo-500">
                        <option value="Pemasangan Baru">Pemasangan Baru</option>
                        <option value="Tagihan Bulanan">Tagihan Bulanan</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Bulan</label>
                      <select 
                        name="p_period" 
                        defaultValue={new Date().toISOString().slice(0, 7)}
                        className="w-full bg-white border-2 border-white rounded-lg px-3 py-2 text-sm outline-none focus:border-indigo-500"
                      >
                        {getBillingPeriods().map(p => <option key={p} value={p}>{p}</option>)}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Jumlah Bayar (Rp)</label>
                    <input name="p_amount" type="number" className="w-full bg-white border-2 border-white rounded-lg px-3 py-2 text-sm font-bold outline-none focus:border-indigo-500" />
                  </div>
                </div>

                <div className="flex gap-3 pt-6">
                  <button type="button" onClick={() => setShowQuickAdd(false)} className="flex-1 px-4 py-3 text-slate-400 font-bold hover:text-slate-600">Batal</button>
                  <button type="submit" className="flex-1 bg-indigo-600 text-white font-bold py-3 rounded-xl hover:bg-black transition-all">Simpan</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Receipt({ transaction, userName }: { transaction: Transaction | null, userName: string }) {
  if (!transaction) return null;
  return (
    <div className="print-container hidden print:block text-slate-900 bg-white p-6 w-[80mm] mx-auto border border-slate-100 font-sans">
      {/* Header */}
      <div className="text-center border-b-2 border-slate-900 pb-3 mb-4">
        <h1 className="font-black text-lg tracking-tighter uppercase leading-tight">NET CORE WIFI</h1>
        <p className="text-[9px] font-black tracking-[0.2em] text-slate-500 mb-1">RT/RW NET SOLUTION</p>
        <p className="text-[8px] font-medium text-slate-400">Jln. Kebon Jeruk No. 88, Jakarta Selatan</p>
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
            Terima kasih telah berlangganan.<br/>
            Pembayaran Anda telah tercatat dalam sistem kami.<br/>
            <span className="text-indigo-500 mt-1 block">CS: 0812-XXXX-XXXX (WhatsApp Only)</span>
          </p>
        </div>
        
        <div className="text-[6px] font-mono text-center opacity-30 mt-4 border-t border-slate-100 pt-2 tracking-[0.3em]">
          X-CORE CLOUD PRINT-ENGINE v2.4
        </div>
      </div>
    </div>
  );
}

function CustomerManagement({ user }: { user: User }) {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [packets, setPackets] = useState<Packet[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [isOldCustomer, setIsOldCustomer] = useState(false);

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

  useEffect(() => { fetchData(); }, []);

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

  return (
    <div className="space-y-6">
      <header className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Data Pelanggan</h2>
          <p className="text-slate-500">Kelola daftar pelanggan aktif Anda</p>
        </div>
        <button 
          onClick={() => {
            if (showForm && editingCustomer) {
              setEditingCustomer(null);
              setIsOldCustomer(false);
            } else {
              setShowForm(!showForm);
              setEditingCustomer(null);
              setIsOldCustomer(false);
            }
          }} 
          className={cn("btn-primary", showForm && "bg-slate-800")}
        >
          {showForm ? 'Tutup Form' : <><Plus className="w-5 h-5" /> Tambah Pelanggan</>}
        </button>
      </header>

      {showForm && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="bg-white p-6 rounded-2xl border border-slate-200">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-bold text-slate-800">{editingCustomer ? 'Update Data Pelanggan' : 'Daftarkan Pelanggan'}</h3>
            {!editingCustomer && (
              <div className="flex bg-slate-100 p-1 rounded-lg">
                <button 
                  onClick={() => setIsOldCustomer(false)}
                  className={cn("px-3 py-1.5 text-[10px] font-bold rounded-md transition-all", !isOldCustomer ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500")}
                >
                  PELANGGAN BARU
                </button>
                <button 
                  onClick={() => setIsOldCustomer(true)}
                  className={cn("px-3 py-1.5 text-[10px] font-bold rounded-md transition-all", isOldCustomer ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500")}
                >
                  PELANGGAN LAMA / MIGRASI
                </button>
              </div>
            )}
          </div>
          
          <form onSubmit={handleAdd} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Nama Pelanggan</label>
                <input name="name" defaultValue={editingCustomer?.name} placeholder="Contoh: Budi Santoso" className="input-field" required />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">No HP / WA</label>
                <input name="phone" defaultValue={editingCustomer?.phone} placeholder="6281..." className="input-field" />
              </div>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Pilih Paket</label>
                <select name="packet" defaultValue={editingCustomer?.packet} className="input-field" required>
                  <option value="">-- Pilih Paket --</option>
                  {packets.map(p => {
                    const packetVal = `${p.name} - Rp ${p.price.toLocaleString()}`;
                    return <option key={p.id} value={packetVal}>{p.name} (Rp {p.price.toLocaleString()})</option>;
                  })}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Alamat</label>
                <input name="address" defaultValue={editingCustomer?.address} placeholder="Nama Jalan / Blok" className="input-field" />
              </div>
            </div>

            {(isOldCustomer || editingCustomer) && (
              <div className="md:col-span-2 bg-indigo-50/50 p-4 rounded-xl border border-indigo-100/50">
                <label className="block text-[10px] font-bold text-indigo-400 uppercase mb-2">Bulan Bergabung (Join Date)</label>
                <input 
                  name="created_at" 
                  type="month" 
                  required
                  defaultValue={editingCustomer?.created_at?.slice(0, 7) || new Date().toISOString().slice(0, 7)}
                  className="input-field border-indigo-100 bg-white" 
                />
                <p className="text-[10px] text-indigo-400 mt-2">Pilih bulan pertama kali pelanggan mulai berlangganan untuk tracking tunggakan.</p>
              </div>
            )}

            <div className="md:col-span-2 flex gap-3 pt-2">
              <button type="submit" className="flex-1 btn-primary">
                {editingCustomer ? 'Simpan Perubahan' : 'Daftarkan Pelanggan'}
              </button>
              {editingCustomer && (
                <button type="button" onClick={() => { setShowForm(false); setEditingCustomer(null); }} className="btn-secondary">Batal</button>
              )}
            </div>
          </form>
        </motion.div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {customers.map(c => (
          <div key={c.id} className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-start mb-2">
                <h4 className="font-bold text-slate-900">{c.name}</h4>
                <div className="flex flex-col items-end gap-1">
                  <span className="text-[10px] font-bold bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full uppercase">{c.packet}</span>
                  {c.is_paid ? (
                    <span className="text-[10px] font-bold bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full uppercase flex items-center gap-1">
                      <Check className="w-2 h-2" /> Lunas
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold bg-rose-100 text-rose-700 px-2 py-0.5 rounded-full uppercase">Belum Bayar</span>
                  )}
                </div>
              </div>
              <p className="text-xs text-slate-500 mb-1 flex items-center gap-1">
                <Phone className="w-3 h-3 text-slate-400" /> {c.phone || 'No phone'}
              </p>
              <p className="text-xs text-slate-400 italic mb-2">{c.address || 'No address'}</p>
              <div className="bg-slate-50 px-3 py-2 rounded-xl flex items-center justify-between border border-dashed border-slate-200">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Input Tunggakan Mulai</span>
                <span className="text-[10px] font-black text-indigo-500 flex items-center gap-1">
                  <Calendar className="w-3 h-3" /> {c.created_at?.slice(0, 7) || 'Manual'}
                </span>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-slate-50 flex justify-between items-center">
               <button onClick={() => handleEdit(c)} className="text-indigo-400 hover:text-indigo-600 transition-colors flex items-center gap-1 text-xs font-bold">
                  <Plus className="w-3 h-3 rotate-45" /> Edit / Ganti Paket
               </button>
               {user.role === 'admin' && (
                 <button onClick={() => handleDelete(c.id)} className="text-slate-300 hover:text-rose-600 transition-colors">
                    <Trash2 className="w-4 h-4" />
                 </button>
               )}
            </div>
          </div>
        ))}
        {customers.length === 0 && (
          <div className="col-span-full py-12 text-center border-2 border-dashed border-slate-100 rounded-3xl text-slate-400">
            Belum ada pelanggan.
          </div>
        )}
      </div>
    </div>
  );
}

function PacketManagement({ user }: { user: User }) {
  const [packets, setPackets] = useState<Packet[]>([]);
  const [showForm, setShowForm] = useState(false);

  const fetchPackets = async () => {
    try {
      const res = await fetch('/api/packets', { headers: { 'x-user-id': String(user.id) } });
      if (res.ok) setPackets(await res.json());
    } catch (err) {
      console.error('Failed to fetch packets:', err);
    }
  };

  useEffect(() => { fetchPackets(); }, []);

  const handleAdd = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    try {
      const formData = new FormData(e.currentTarget);
      const res = await fetch('/api/packets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-id': String(user.id) },
        body: JSON.stringify({
          name: formData.get('name'),
          price: Number(formData.get('price'))
        })
      });
      if (res.ok) {
        setShowForm(false);
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

  return (
    <div className="space-y-6">
      <header className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Paket Internet</h2>
          <p className="text-slate-500">Kelola daftar layanan internet Anda</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary">
          <Plus className="w-5 h-5" /> Tambah Paket
        </button>
      </header>

      {showForm && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="bg-white p-6 rounded-2xl border border-slate-200">
          <form onSubmit={handleAdd} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input name="name" placeholder="Nama Paket (mis: 10Mbps Gold)" className="input-field" required />
            <input name="price" type="number" placeholder="Harga Bulanan (Rp)" className="input-field" required />
            <button type="submit" className="md:col-span-2 btn-primary">Simpan Paket</button>
          </form>
        </motion.div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {packets.map(p => (
          <div key={p.id} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col justify-between">
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Paket Internet</p>
              <h4 className="text-xl font-black text-slate-800 mb-2">{p.name}</h4>
              <p className="text-2xl font-bold text-indigo-600">
                {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(p.price)}
                <span className="text-xs text-slate-400 font-normal ml-1">/ bulan</span>
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-slate-50 flex justify-end">
               <button onClick={() => handleDelete(p.id)} className="text-slate-300 hover:text-rose-600 transition-colors">
                  <Trash2 className="w-5 h-5" />
               </button>
            </div>
          </div>
        ))}
        {packets.length === 0 && (
          <div className="col-span-full py-12 text-center border-2 border-dashed border-slate-100 rounded-3xl text-slate-400">
            Belum ada paket internet.
          </div>
        )}
      </div>
    </div>
  );
}

function UserManagement({ user }: { user: User }) {
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

  useEffect(() => { fetchUsers(); }, []);

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

function StatCard({ title, amount, icon, color }: { title: string, amount: number, icon: React.ReactNode, color: 'indigo' | 'emerald' | 'rose' | 'amber' }) {
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
        {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount)}
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

function TransactionModal({ user, isAdmin, onClose, onSuccess }: { user: User, isAdmin: boolean, onClose: () => void, onSuccess: () => void }) {
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
        billing_period: formData.get('billing_period'),
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
        onSuccess();
      } else {
        const errorText = await res.text();
        alert('Gagal menyimpan transaksi: ' + errorText);
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
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" 
      />
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="relative bg-white w-full max-w-lg rounded-3xl shadow-2xl p-8"
      >
        <h3 className="text-xl font-bold text-slate-900 mb-6">Catat Transaksi Manual</h3>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-2 gap-4 p-1 bg-slate-100 rounded-xl">
             <button 
                type="button" 
                onClick={() => setType('pemasukan')}
                className={cn("py-2 rounded-lg text-sm font-bold transition-all", type === 'pemasukan' ? "bg-white text-emerald-600 shadow-sm" : "text-slate-500 hover:text-slate-700")}
             >
               Pemasukan
             </button>
             <button 
                type="button" 
                onClick={() => setType('pengeluaran')}
                className={cn("py-2 rounded-lg text-sm font-bold transition-all", type === 'pengeluaran' ? "bg-white text-rose-600 shadow-sm" : "text-slate-500 hover:text-slate-700")}
             >
               Pengeluaran
             </button>
          </div>
          <input type="hidden" name="type" value={type} />
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Kategori</label>
              <select name="category" className="input-field">
                {CATEGORIES[type].map(cat => <option key={cat} value={cat}>{cat}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Tanggal</label>
              <input name="transaction_date" type="date" defaultValue={new Date().toISOString().split('T')[0]} className="input-field" required />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Bulan Tagihan (Khusus Bulanan)</label>
            <input name="billing_period" type="month" className="input-field" />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Jumlah (Rp)</label>
            <input name="amount" type="number" step="1000" className="input-field font-bold text-lg" placeholder="0" required />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Deskripsi</label>
            <textarea name="description" className="input-field min-h-[80px]" placeholder="Keterangan singkat..."></textarea>
          </div>

          <div className="flex gap-3 pt-4">
            <button type="button" onClick={onClose} className="flex-1 btn-secondary">Batal</button>
            <button type="submit" className="flex-1 btn-primary">Simpan</button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

function PaymentReport({ user }: { user: User }) {
  const [data, setData] = useState<any[]>([]);
  const [months, setMonths] = useState<string[]>([]);

  useEffect(() => {
    const fetchReport = async () => {
      try {
        const res = await fetch('/api/reports/payments', { headers: { 'x-user-id': String(user.id) } });
        if (res.ok) {
          const result = await res.json();
          setData(result);
          const uniqueMonths = Array.from(new Set(result.map((r: any) => r.billing_period))).sort().reverse();
          setMonths(uniqueMonths as string[]);
        }
      } catch (err) {
        console.error('Failed to fetch payment report:', err);
      }
    };
    fetchReport();
  }, []);

  const customers = Array.from(new Set(data.map(d => d.customer_name))).sort();

  return (
    <div className="space-y-6">
      <header>
        <h2 className="text-2xl font-bold tracking-tight">Laporan Pembayaran Bulanan</h2>
        <p className="text-slate-500">Monitor status tagihan pelanggan per bulan</p>
      </header>

      <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-x-auto">
        <table className="w-full text-left font-sans">
          <thead className="bg-slate-50 text-slate-400 text-[10px] uppercase font-bold">
            <tr>
              <th className="px-6 py-4 sticky left-0 bg-slate-50 z-10 w-48">Pelanggan</th>
              {months.map(m => (
                <th key={m} className="px-4 py-4 text-center">{m}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {customers.map(c => (
              <tr key={c} className="hover:bg-slate-50 transition-colors">
                <td className="px-6 py-4 font-bold text-slate-900 sticky left-0 bg-white z-10 shadow-[2px_0_5px_rgba(0,0,0,0.02)]">
                  {c}
                </td>
                {months.map(m => {
                  const payment = data.find(d => d.customer_name === c && d.billing_period === m);
                  const isCurrentOrPast = m <= new Date().toISOString().slice(0, 7);
                  return (
                    <td key={m} className="px-4 py-4 text-center">
                      {payment ? (
                        <div className="flex flex-col items-center">
                          <div className={cn(
                            "w-6 h-6 rounded-full flex items-center justify-center mx-auto shadow-sm",
                            payment.status === 'confirmed' ? "bg-emerald-500 text-white" : "bg-amber-400 text-white"
                          )}>
                            <CalendarCheck2 className="w-3.5 h-3.5" />
                          </div>
                          <span className="text-[8px] text-slate-400 mt-1 font-bold">Rp {payment.amount?.toLocaleString()}</span>
                        </div>
                      ) : (
                        <div className={cn(
                          "w-6 h-6 rounded-full mx-auto flex items-center justify-center",
                          isCurrentOrPast ? "bg-rose-50 border-2 border-rose-200 text-rose-500" : "border-2 border-slate-100 text-slate-200"
                        )}>
                           {isCurrentOrPast && <span className="text-[8px] font-black italic">BELUM</span>}
                        </div>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
            {customers.length === 0 && (
              <tr>
                <td colSpan={months.length + 1} className="py-20 text-center text-slate-400 italic">
                  Belum ada data pembayaran bulanan yang tercatat.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
