import React, { useState, useEffect, useMemo, Suspense, lazy } from 'react';
import { 
  AnimatePresence,
  motion 
} from 'motion/react';
import { Plus } from 'lucide-react';
import { 
  User, 
  AppSettings, 
  Transaction, 
  ReceiptState,
} from './types';
import { 
  DashboardSkeleton, 
} from './components/LoadingSkeleton';

import { 
  DesktopSidebar, 
  MobileHeader, 
  MobileNav, 
  MobileMenuDrawer, 
  ReceiptPreviewModal 
} from './components/Layout';

// Lazy load modules
const LoginScreen = lazy(() => import('./components/LoginScreen'));
const AdminDashboard = lazy(() => import('./components/AdminDashboard'));
const CustomerManagement = lazy(() => import('./components/CustomerManagement'));
const TransactionHistory = lazy(() => import('./components/TransactionHistory'));
const PaymentReport = lazy(() => import('./components/PaymentReport'));
const PacketManagement = lazy(() => import('./components/PacketManagement'));
const UserManagement = lazy(() => import('./components/UserManagement'));
const AdminSettings = lazy(() => import('./components/AdminSettings'));
const CollectorDashboard = lazy(() => import('./components/CollectorDashboard'));
const DepositManagement = lazy(() => import('./components/DepositManagement'));
const TransactionModal = lazy(() => import('./components/TransactionModal'));

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [printerStatus, setPrinterStatus] = useState<'checking' | 'ready' | 'error'>('ready');
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [receipt, setReceipt] = useState<ReceiptState | null>(null);
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    const initAuth = () => {
      const savedUser = localStorage.getItem('user') || sessionStorage.getItem('user');
      if (savedUser) {
        try {
          const parsed = JSON.parse(savedUser);
          setUser(parsed);
        } catch (err) {
          localStorage.removeItem('user');
          sessionStorage.removeItem('user');
        }
      }
      setLoadingInitial(false);
    };

    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    initAuth();

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const fetchSettings = async (userId: number) => {
    try {
      const res = await fetch('/api/settings', {
        headers: { 'x-user-id': String(userId) }
      });
      if (res.ok) setSettings(await res.json());
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (user) {
      fetchSettings(user.id);
    }
  }, [user, refreshTrigger]);

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const username = formData.get('username');
    const password = formData.get('password');
    const remember = formData.get('remember') === 'on';

    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      
      if (res.ok) {
        const userData = await res.json();
        setUser(userData);
        if (remember) {
          localStorage.setItem('user', JSON.stringify(userData));
        } else {
          sessionStorage.setItem('user', JSON.stringify(userData));
        }
      } else {
        const errorData = await res.json();
        alert(errorData.error || 'Login gagal. Periksa username dan password.');
      }
    } catch (err) {
      alert('Terjadi kesalahan koneksi.');
    }
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('user');
    sessionStorage.removeItem('user');
  };

  const checkPrinter = () => {
    setPrinterStatus('checking');
    setTimeout(() => setPrinterStatus('ready'), 800);
  };

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
    }
  };

  const renderContent = () => {
    if (!user) return null;

    return (
      <Suspense fallback={<DashboardSkeleton />}>
        {activeTab === 'dashboard' && (
          user.role === 'admin' ? 
          <AdminDashboard 
            user={user} 
            settings={settings} 
            refreshTrigger={refreshTrigger} 
            setRefreshTrigger={setRefreshTrigger}
            onShowReceipt={(t, u) => setReceipt({ transaction: t, userName: u })}
          /> : 
          <CollectorDashboard 
            user={user} 
            settings={settings} 
            onShowReceipt={(t, u) => setReceipt({ transaction: t, userName: u })} 
            refreshTrigger={refreshTrigger}
            setRefreshTrigger={setRefreshTrigger}
          />
        )}
        {activeTab === 'customers' && <CustomerManagement user={user} refreshTrigger={refreshTrigger} />}
        {activeTab === 'history' && (
          <TransactionHistory 
            user={user} 
            refreshTrigger={refreshTrigger} 
            onShowReceipt={(t, u) => setReceipt({ transaction: t, userName: u })} 
          />
        )}
        
        {user.role === 'admin' && (
          <>
            {activeTab === 'packets' && <PacketManagement user={user} refreshTrigger={refreshTrigger} />}
            {activeTab === 'users' && (
              <div className="space-y-8">
                <UserManagement user={user} refreshTrigger={refreshTrigger} />
                <DepositManagement 
                  user={user} 
                  refreshTrigger={refreshTrigger} 
                  onRefresh={() => setRefreshTrigger(t => t + 1)} 
                />
              </div>
            )}
            {activeTab === 'reports' && <PaymentReport user={user} refreshTrigger={refreshTrigger} />}
            {activeTab === 'settings' && (
              <AdminSettings 
                user={user} 
                refreshTrigger={refreshTrigger} 
                deferredPrompt={deferredPrompt}
                onInstall={handleInstallClick}
              />
            )}
          </>
        )}
      </Suspense>
    );
  };

  if (loadingInitial) return null;
  if (!user) return (
    <Suspense fallback={<DashboardSkeleton />}>
      <LoginScreen onLogin={handleLogin} />
    </Suspense>
  );

  return (
    <div className="min-h-screen bg-slate-50 flex font-sans selection:bg-indigo-100 selection:text-indigo-600 overflow-hidden">
      <DesktopSidebar 
        user={user} 
        settings={settings} 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        printerStatus={printerStatus} 
        checkPrinter={checkPrinter} 
        handleLogout={handleLogout} 
      />

      <main className="flex-1 min-w-0 pb-24 md:pb-0 h-screen overflow-y-auto relative">
        <MobileHeader 
          user={user} 
          settings={settings} 
          printerStatus={printerStatus} 
          checkPrinter={checkPrinter} 
          handleLogout={handleLogout} 
        />

        <div className="p-6 md:p-10 max-w-[1600px] mx-auto pb-32 md:pb-20">
          {renderContent()}
        </div>

        {user.role === 'admin' && (
           <button 
             onClick={() => setIsManualModalOpen(true)}
             className="hidden md:flex fixed bottom-10 right-10 w-20 h-20 bg-indigo-600 hover:bg-slate-900 rounded-[2rem] shadow-2xl shadow-indigo-200 items-center justify-center text-white active:scale-95 transition-all z-40 group border-b-4 border-indigo-800"
           >
              <Plus className="w-8 h-8 group-hover:rotate-90 transition-transform duration-300" />
           </button>
        )}

        <MobileNav 
          activeTab={activeTab} 
          setActiveTab={(t) => { setActiveTab(t); setShowMobileMenu(false); }} 
          user={user} 
          onOpenMenu={() => setShowMobileMenu(true)} 
        />

        <AnimatePresence>
          {showMobileMenu && (
            <MobileMenuDrawer 
              user={user} 
              activeTab={activeTab} 
              setActiveTab={(t) => { setActiveTab(t); setShowMobileMenu(false); }} 
              onClose={() => setShowMobileMenu(false)} 
            />
          )}

          {receipt && (
            <ReceiptPreviewModal 
              transaction={receipt.transaction} 
              userName={receipt.userName} 
              settings={settings} 
              onClose={() => setReceipt(null)} 
            />
          )}

          {isManualModalOpen && (
            <TransactionModal 
              user={user} 
              onClose={() => setIsManualModalOpen(false)} 
              onSuccess={() => {
                setIsManualModalOpen(false);
                setRefreshTrigger(prev => prev + 1);
              }} 
            />
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
