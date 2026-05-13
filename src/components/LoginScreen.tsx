import React from 'react';
import { motion } from 'motion/react';
import { User as UserIcon, Lock, Coins, ArrowRightCircle } from 'lucide-react';

export default function LoginScreen({ onLogin }: { onLogin: (e: React.FormEvent<HTMLFormElement>) => void }) {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 relative overflow-hidden font-sans">
      {/* Subtle Background elements */}
      <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-indigo-500/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] bg-emerald-500/5 rounded-full blur-[120px] pointer-events-none" />

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm relative z-10"
      >
        <div className="bg-white p-10 rounded-[3rem] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.05)] border border-slate-100">
          <div className="text-center mb-10">
            <motion.div 
              whileHover={{ scale: 1.05 }}
              className="w-20 h-20 bg-indigo-600 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-xl shadow-indigo-100 border-2 border-white"
            >
              <Coins className="w-10 h-10 text-white" />
            </motion.div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight mb-2">Billing <span className="text-indigo-600">Net</span></h1>
            <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">Enterprise Solution 2024</p>
          </div>
          
          <form onSubmit={onLogin} className="space-y-6">
            <div className="space-y-2">
              <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Username</label>
              <div className="relative group">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-500 transition-colors">
                  <UserIcon className="w-5 h-5" />
                </div>
                <input 
                  type="text" 
                  name="username"
                  placeholder="admin / penagih1"
                  className="w-full bg-slate-50 border border-slate-100 text-slate-900 h-14 pl-12 pr-4 rounded-2xl focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500/30 outline-none transition-all font-bold text-sm"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Password</label>
              <div className="relative group">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-500 transition-colors">
                  <Lock className="w-5 h-5" />
                </div>
                <input 
                  type="password" 
                  name="password"
                  placeholder="••••••••"
                  className="w-full bg-slate-50 border border-slate-100 text-slate-900 h-14 pl-12 pr-4 rounded-2xl focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500/30 outline-none transition-all font-bold text-sm"
                  required
                />
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <input type="checkbox" id="remember" name="remember" className="w-5 h-5 rounded-lg border-2 border-slate-200 text-indigo-600 focus:ring-indigo-500" />
              <label htmlFor="remember" className="text-xs font-bold text-slate-500 cursor-pointer">Simpan sesi login ini</label>
            </div>

            <button 
              type="submit" 
              className="w-full bg-indigo-600 hover:bg-slate-900 text-white h-16 rounded-2xl font-black uppercase tracking-widest text-xs transition-all shadow-lg shadow-indigo-100 active:scale-95 flex items-center justify-center gap-2"
            >
              MASUK SEKARANG
              <ArrowRightCircle className="w-4 h-4" />
            </button>
          </form>

          <div className="mt-10 pt-6 border-t border-slate-50">
             <div className="grid grid-cols-1 gap-3">
                <div className="text-center">
                   <p className="text-[10px] text-slate-300 font-bold uppercase tracking-widest">Aplikasi ini memerlukan akses khusus</p>
                </div>
             </div>
          </div>
        </div>
        
        <p className="text-center mt-12 text-slate-300 text-[10px] font-bold uppercase tracking-[0.2em]">Designed & Developed by Core-Tech</p>
      </motion.div>
    </div>
  );
}
