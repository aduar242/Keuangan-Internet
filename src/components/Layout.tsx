import React from 'react';
import { 
  LayoutDashboard, 
  Users as UsersIcon, 
  History, 
  BarChart3, 
  Users2, 
  CalendarCheck2, 
  Settings, 
  Coins, 
  LogOut, 
  Printer, 
  RefreshCw, 
  Home, 
  X, 
  UserCheck, 
  Download,
  Calendar,
  CheckCircle,
  ShieldCheck
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { User, AppSettings, Transaction } from '../types';
import { cn, formatPeriod } from '../lib/utils';

export function SidebarLink({ icon, label, onClick, active = false }: { icon: React.ReactNode, label: string, onClick?: () => void, active?: boolean, key?: React.Key }) {
  return (
    <button onClick={onClick} className={cn(
      "w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-[13px] font-bold transition-all text-left relative group",
      active 
        ? "bg-indigo-50 text-indigo-600 shadow-sm" 
        : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
    )}>
      {active && (
        <motion.div 
          layoutId="sidebar-active"
          className="absolute left-0 w-1.5 h-6 bg-indigo-600 rounded-full"
        />
      )}
      <div className={cn(
        "transition-transform group-hover:scale-110",
        active ? "text-indigo-600" : "text-slate-400 group-hover:text-slate-600"
      )}>
        {icon}
      </div>
      <span className="truncate tracking-tight">{label}</span>
    </button>
  );
}

export function DesktopSidebar({ user, settings, activeTab, setActiveTab, printerStatus, checkPrinter, handleLogout }: { user: User, settings: AppSettings | null, activeTab: string, setActiveTab: (t: string) => void, printerStatus: string, checkPrinter: () => void, handleLogout: () => void }) {
  const menuItems: { id: string, label: string, icon: React.ReactNode }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-[18px] h-[18px]" /> },
    { id: 'customers', label: 'Pelanggan', icon: <UsersIcon className="w-[18px] h-[18px]" /> },
  ];

  const adminItems: { id: string, label: string, icon: React.ReactNode }[] = [
    { id: 'packets', label: 'Paket Layanan', icon: <BarChart3 className="w-[18px] h-[18px]" /> },
    { id: 'users', label: 'Data Petugas', icon: <Users2 className="w-[18px] h-[18px]" /> },
    { id: 'reports', label: 'Laporan', icon: <CalendarCheck2 className="w-[18px] h-[18px]" /> },
    { id: 'settings', label: 'Pengaturan', icon: <Settings className="w-[18px] h-[18px]" /> },
  ];

  return (
    <aside className="hidden md:flex w-[280px] bg-white border-r border-slate-200/60 flex-col h-screen sticky top-0 z-30">
      <div className="p-8 mb-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-xl shadow-indigo-100 rotate-2">
            <Coins className="w-6 h-6 text-white" />
          </div>
          <div className="min-w-0">
            <h1 className="font-extrabold text-lg leading-none tracking-tight truncate text-slate-900">
              {settings?.company_name || 'BILLING SYSTEM'}
            </h1>
            <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-[0.2em] mt-1.5 leading-none">Management v2</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-4 space-y-1 overflow-y-auto">
        <p className="px-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3">Main Menu</p>
        <div className="space-y-1">
          {menuItems.map(item => (
            <SidebarLink 
              key={item.id}
              active={activeTab === item.id} 
              onClick={() => setActiveTab(item.id)} 
              icon={item.icon} 
              label={item.label} 
            />
          ))}
          <SidebarLink active={activeTab === 'history'} onClick={() => setActiveTab('history')} icon={<History className="w-[18px] h-[18px]" />} label="Riwayat" />
        </div>

        {user.role === 'admin' && (
          <div className="pt-8">
            <p className="px-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3">Administrator</p>
            <div className="space-y-1">
              {adminItems.map(item => (
                <SidebarLink 
                  key={item.id}
                  active={activeTab === item.id} 
                  onClick={() => setActiveTab(item.id)} 
                  icon={item.icon} 
                  label={item.label} 
                />
              ))}
            </div>
          </div>
        )}
      </nav>

      <div className="p-4 space-y-4">
        <div className="bg-slate-50 border border-slate-100 rounded-3xl p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className={cn(
              "w-10 h-10 rounded-2xl flex items-center justify-center shadow-inner transition-colors",
              printerStatus === 'ready' ? "bg-emerald-100 text-emerald-600" : "bg-rose-100 text-rose-600"
            )}>
              <Printer className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 leading-none">Status Printer</p>
              <p className={cn("text-[11px] font-bold leading-none truncate", printerStatus === 'ready' ? "text-emerald-600" : "text-rose-600")}>
                {printerStatus === 'ready' ? 'SIAP MENCETAK' : 'DISCONNECTED'}
              </p>
            </div>
          </div>
          <button 
            onClick={checkPrinter}
            className="w-full py-2.5 bg-white border border-slate-200 text-slate-500 text-[10px] font-black rounded-xl hover:bg-slate-50 transition-all flex items-center justify-center gap-2"
          >
            <RefreshCw className={cn("w-3 h-3", printerStatus === 'checking' && "animate-spin")} />
            REFRESH
          </button>
        </div>

        <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-100 rounded-[2rem]">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center text-indigo-600 font-black text-sm uppercase ring-2 ring-white shadow-sm flex-shrink-0">
              {user.name.charAt(0)}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-black text-slate-900 truncate leading-none">{user.name}</p>
              <p className="text-[10px] text-slate-400 font-bold uppercase mt-1 leading-none">{user.role}</p>
            </div>
          </div>
          <button 
            onClick={handleLogout}
            className="w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-400 hover:text-rose-500 transition-all active:scale-90 shadow-sm"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}

export function MobileHeader({ user, settings, printerStatus, checkPrinter, handleLogout }: { user: User, settings: AppSettings | null, printerStatus: string, checkPrinter: () => void, handleLogout: () => void }) {
  return (
    <header className="md:hidden flex items-center justify-between px-6 pt-10 pb-6 bg-slate-50/80 backdrop-blur-xl sticky top-0 z-40 border-b border-slate-200/50">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-xl shadow-indigo-100 rotate-2">
          <Coins className="w-7 h-7 text-white" />
        </div>
        <div>
          <span className="block font-black text-slate-900 tracking-tight text-xl leading-none truncate max-w-[150px]">
            {settings?.company_name || 'SYSTEM'}
          </span>
          <div className="flex items-center gap-2 mt-1.5">
            <div className={cn(
              "px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-widest",
              user.role === 'admin' ? "bg-indigo-100 text-indigo-600" : "bg-emerald-100 text-emerald-600"
            )}>
              {user.role}
            </div>
            <span className="w-1 h-1 rounded-full bg-slate-300"></span>
            <button 
              onClick={checkPrinter}
              className="flex items-center gap-1 active:scale-95 transition-transform"
            >
              <div className={cn("w-1.5 h-1.5 rounded-full", printerStatus === 'ready' ? "bg-emerald-500 animate-pulse" : "bg-rose-500")}></div>
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">PRINTER {printerStatus === 'ready' ? 'READY' : 'OFF'}</span>
            </button>
          </div>
        </div>
      </div>
      <button 
        className="w-12 h-12 rounded-2xl bg-white shadow-xl shadow-slate-200/50 flex items-center justify-center text-slate-400 hover:text-rose-500 active:scale-90 transition-all border border-slate-100"
        onClick={handleLogout}
      >
        <LogOut className="w-5 h-5" />
      </button>
    </header>
  );
}

export function MobileNavItem({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: React.ReactNode, label?: string }) {
  return (
    <button onClick={onClick} className={cn(
      "flex-1 flex flex-col items-center justify-center p-1 rounded-2xl transition-all duration-300 relative min-w-0 h-10 gap-0",
      active ? "text-indigo-600 translate-y-[-2px]" : "text-slate-400 opacity-60"
    )}>
      <div className={cn(
        "transition-transform",
        active ? "scale-105" : "scale-100"
      )}>
        {React.cloneElement(icon as React.ReactElement, { className: "w-5 h-5" })}
      </div>
      {label && (
        <span className={cn(
          "text-[8px] font-black uppercase tracking-tight truncate w-full text-center px-1 leading-none mt-0.5",
          active ? "text-indigo-600" : "text-slate-400"
        )}>
          {label}
        </span>
      )}
      {active && (
        <motion.div 
          layoutId="mobile-indicator"
          className="absolute -bottom-1 w-1 h-1 bg-indigo-600 rounded-full"
        />
      )}
    </button>
  );
}

export function MobileNav({ activeTab, setActiveTab, user, onOpenMenu }: { activeTab: string, setActiveTab: (t: string) => void, user: User, onOpenMenu: () => void }) {
  return (
    <nav className="md:hidden fixed bottom-4 left-1/2 -translate-x-1/2 w-[94%] max-w-sm bg-white/95 backdrop-blur-2xl shadow-[0_20px_50px_rgba(0,0,0,0.2)] px-2 py-2 rounded-[2.5rem] flex items-center justify-between z-[100] border border-white/50 ring-1 ring-black/5 ring-inset">
      <MobileNavItem active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} icon={<Home className="w-5 h-5" />} label="Home" />
      <MobileNavItem active={activeTab === 'customers'} onClick={() => setActiveTab('customers')} icon={<UsersIcon className="w-5 h-5" />} label="Data" />
      
      <div className="relative group">
        <button 
          onClick={onOpenMenu}
          className="w-14 h-14 -mt-10 bg-indigo-600 rounded-full flex items-center justify-center text-white shadow-2xl shadow-indigo-300 hover:scale-105 active:scale-95 transition-all ring-4 ring-slate-50 relative overflow-hidden group"
        >
          <div className="absolute inset-0 bg-gradient-to-tr from-white/0 to-white/20 opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="flex flex-col gap-0.5 items-center justify-center relative z-10">
            <span className="w-1 h-1 bg-white rounded-full"></span>
            <div className="flex gap-0.5">
              <span className="w-1 h-1 bg-white rounded-full"></span>
              <span className="w-1 h-1 bg-white rounded-full"></span>
            </div>
          </div>
        </button>
      </div>

      <MobileNavItem active={activeTab === 'history'} onClick={() => setActiveTab('history')} icon={<History className="w-5 h-5" />} label="Log" />
      <MobileNavItem active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} icon={<Settings className="w-5 h-5" />} label="Lainnya" />
    </nav>
  );
}

export function MobileMenuDrawer({ user, activeTab, setActiveTab, onClose }: { user: User, activeTab: string, setActiveTab: (t: string) => void, onClose: () => void }) {
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard />, description: 'Statistik real-time' },
    { id: 'customers', label: 'Pelanggan', icon: <UsersIcon />, description: 'Database & Profil' },
    { id: 'history', label: 'Riwayat', icon: <History />, description: 'Track transaksi' },
    ...(user.role === 'admin' ? [
      { id: 'packets', label: 'Paket', icon: <LayoutDashboard />, description: 'Atur layanan ISP' },
      { id: 'users', label: 'Petugas', icon: <Users2 />, description: 'Akses lapangan' },
      { id: 'reports', label: 'Laporan', icon: <CalendarCheck2 />, description: 'Visualisasi bayar' },
      { id: 'settings', label: 'Sistem', icon: <Settings />, description: 'General config' },
    ] : [])
  ];

  return (
    <div className="fixed inset-0 z-[110] flex items-end justify-center">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
      />
      <motion.div 
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 30, stiffness: 300 }}
        className="relative bg-white w-full max-w-lg rounded-t-[3rem] sm:rounded-t-[3.5rem] shadow-2xl overflow-hidden pb-safe flex flex-col max-h-[92vh] sm:max-h-[85vh]"
      >
        <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mt-4 mb-2 shrink-0" />
        
        <div className="px-6 sm:px-8 pt-4 pb-4 bg-white shrink-0">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 sm:w-16 sm:h-16 bg-slate-900 rounded-2xl sm:rounded-3xl flex items-center justify-center text-white text-xl sm:text-2xl font-black shadow-2xl relative overflow-hidden">
               <div className="absolute inset-0 bg-indigo-600 opacity-20" />
               {user.name.charAt(0)}
            </div>
            <div className="min-w-0">
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight leading-none truncate">{user.name}</h2>
              <div className="flex items-center gap-2 mt-1.5 sm:mt-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_10px_rgb(16,185,129,0.5)]" />
                <p className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{user.role} Verified</p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4">
          <p className="px-3 text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4 sm:mb-6">Navigasi Modul</p>
          <div className="grid grid-cols-2 gap-3 sm:gap-4 pb-12">
            {menuItems.map((item, idx) => (
              <motion.button
                key={item.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: idx * 0.03 }}
                onClick={() => setActiveTab(item.id)}
                className={cn(
                  "flex flex-col items-start p-4 sm:p-5 rounded-[2rem] sm:rounded-[2.5rem] transition-all border text-left active:scale-95 group relative overflow-hidden",
                  activeTab === item.id 
                    ? "bg-indigo-600 border-indigo-600 shadow-xl shadow-indigo-100" 
                    : "bg-slate-50 border-slate-100 hover:border-indigo-100"
                )}
              >
                <div className={cn(
                  "p-2.5 sm:p-3 rounded-xl sm:rounded-2xl mb-3 sm:mb-4 shadow-sm",
                  activeTab === item.id ? "bg-white/20 text-white" : "bg-white text-slate-400"
                )}>
                  {React.cloneElement(item.icon as React.ReactElement, { className: "w-5 h-5 sm:w-6 sm:h-6" })}
                </div>
                <span className={cn(
                  "text-[11px] sm:text-xs font-black uppercase tracking-tight",
                  activeTab === item.id ? "text-white" : "text-slate-900"
                )}>
                  {item.label}
                </span>
                <p className={cn(
                  "text-[8px] sm:text-[9px] font-bold mt-0.5 sm:mt-1 leading-tight tracking-tight",
                  activeTab === item.id ? "text-indigo-100" : "text-slate-400"
                )}>
                  {item.description}
                </p>
              </motion.button>
            ))}
          </div>
        </div>

        <div className="px-6 pb-8 pt-4 shrink-0 bg-white border-t border-slate-50">
          <button 
            onClick={onClose}
            className="w-full h-14 sm:h-16 bg-slate-100 text-slate-500 rounded-2xl sm:rounded-[2rem] font-bold text-[11px] sm:text-xs uppercase tracking-widest active:scale-95 transition-all flex items-center justify-center gap-2"
          >
            Sembunyikan Menu
          </button>
        </div>
      </motion.div>
    </div>
  );
}

export function ReceiptPreviewModal({ transaction, userName, settings, onClose }: { transaction: Transaction, userName: string, settings: AppSettings | null, onClose: () => void }) {
  const printIframe = () => {
    const iframe = document.getElementById('receipt-frame') as HTMLIFrameElement;
    if (iframe && iframe.contentWindow) {
      iframe.contentWindow.focus();
      iframe.contentWindow.print();
    }
  };

  const receiptContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        @page { size: 58mm auto; margin: 0; }
        body { 
          width: 58mm; 
          margin: 0; 
          padding: 8mm 4mm; 
          font-family: 'Courier New', Courier, monospace; 
          font-size: 11px; 
          line-height: 1.4;
          color: #000;
        }
        .center { text-align: center; }
        .bold { font-weight: bold; }
        .title { font-size: 14px; margin-bottom: 2px; }
        .divider { border-bottom: 1px dashed #000; margin: 6px 0; }
        .flex { display: flex; justify-content: space-between; }
        .mt-4 { margin-top: 10px; }
        .footer { font-size: 10px; margin-top: 15px; }
      </style>
    </head>
    <body>
      <div class="center bold title">${settings?.company_name || 'BILLING SYSTEM'}</div>
      <div class="center">${settings?.company_address || ''}</div>
      <div class="center">WA: ${settings?.company_phone || ''}</div>
      <div class="divider"></div>
      
      <div class="flex">
        <span>Tgl:</span>
        <span>${transaction.transaction_date}</span>
      </div>
      <div class="flex">
        <span>ID:</span>
        <span>TRX-${transaction.id}</span>
      </div>
      <div class="flex">
        <span>Petugas:</span>
        <span>${userName}</span>
      </div>
      
      <div class="divider"></div>
      
      <div class="bold uppercase">PELANGGAN:</div>
      <div>${transaction.customer_name || 'UMUM'}</div>
      
      <div class="mt-4 bold uppercase">DESKRIPSI:</div>
      <div>${transaction.category}</div>
      ${transaction.billing_period ? `<div class="bold italic">(${transaction.billing_period.split(',').map(p => formatPeriod(p.trim())).join(', ')})</div>` : ''}
      <div style="font-size: 9px; opacity: 0.8;">${transaction.description || ''}</div>
      
      <div class="divider"></div>
      
      <div class="flex bold" style="font-size: 13px;">
        <span>TOTAL:</span>
        <span>Rp ${transaction.amount.toLocaleString()}</span>
      </div>
      
      <div class="divider"></div>
      
      <div class="center footer">
        ${settings?.receipt_footer || 'SIMPAN BUKTI INI SEBAGAI\\nALAT BUKTI PEMBAYARAN SAH'}
        <br/><br/>
        Terima Kasih
      </div>
      
      <script>
        function formatPeriod(periodStr) {
          if (!periodStr) return '';
          const [year, month] = periodStr.split('-');
          const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
          return months[parseInt(month) - 1] + ' ' + year;
        }
      </script>
    </body>
    </html>
  `;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
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
        className="relative bg-white w-full max-w-sm rounded-[2.5rem] shadow-2xl overflow-hidden p-8"
      >
        <div className="flex justify-between items-center mb-6">
           <h3 className="font-black text-slate-800 uppercase tracking-widest text-xs">Receipt Preview</h3>
           <button onClick={onClose} className="p-2 hover:bg-slate-50 rounded-xl transition-colors">
              <X className="w-5 h-5 text-slate-400" />
           </button>
        </div>

        <div className="bg-slate-50 rounded-3xl p-4 border border-slate-100 flex justify-center mb-6 overflow-hidden max-h-[400px]">
           <iframe 
             id="receipt-frame"
             title="receipt"
             className="w-full h-[600px] bg-white shadow-inner scale-90 origin-top"
             srcDoc={receiptContent}
           />
        </div>

        <div className="flex gap-3">
          <button 
            onClick={printIframe}
            className="flex-1 bg-indigo-600 text-white font-black py-4 rounded-xl shadow-lg shadow-indigo-100 active:scale-95 transition-all text-xs uppercase tracking-widest flex items-center justify-center gap-2"
          >
            <Printer className="w-4 h-4" /> CETAK SEKARANG
          </button>
          <button 
            onClick={onClose}
            className="flex-1 bg-slate-100 text-slate-500 font-black py-4 rounded-xl active:scale-95 transition-all text-xs uppercase tracking-widest"
          >
            TUTUP
          </button>
        </div>
      </motion.div>
    </div>
  );
}
