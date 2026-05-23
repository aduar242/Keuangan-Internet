import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertTriangle, X } from 'lucide-react';

export function ConfirmationModal({ 
  isOpen, 
  title, 
  message, 
  onConfirm, 
  onCancel,
  confirmText = "HAPUS",
  cancelText = "BATAL"
}: { 
  isOpen: boolean, 
  title: string, 
  message: string, 
  onConfirm: () => void, 
  onCancel: () => void,
  confirmText?: string,
  cancelText?: string
}) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onCancel}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" 
          />
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            className="relative bg-white w-full max-w-sm rounded-[2rem] shadow-2xl overflow-hidden p-6 text-center"
          >
             <div className="w-16 h-16 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center mx-auto mb-4">
               <AlertTriangle className="w-8 h-8" />
             </div>
             <h3 className="text-xl font-black text-slate-800 tracking-tight mb-2">{title}</h3>
             <p className="text-sm font-bold text-slate-500 leading-relaxed mb-8">{message}</p>
             <div className="flex gap-3">
               <button 
                 onClick={onCancel}
                 className="flex-1 py-4 bg-slate-50 text-slate-500 font-black rounded-2xl uppercase tracking-widest text-[10px] active:scale-95 transition-all"
               >
                 {cancelText}
               </button>
               <button 
                 onClick={() => { onConfirm(); onCancel(); }}
                 className="flex-1 py-4 bg-rose-500 text-white font-black rounded-2xl uppercase tracking-widest text-[10px] shadow-lg shadow-rose-200 active:scale-95 transition-all"
               >
                 {confirmText}
               </button>
             </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

export function FormattedNumberInput({ value, onChange, placeholder, className, required, name }: { value: string, onChange: (val: string) => void, placeholder?: string, className?: string, required?: boolean, name?: string }) {
  const displayValue = useMemo(() => {
    if (!value) return '';
    const numeric = String(value).replace(/\D/g, '');
    return new Intl.NumberFormat('id-ID').format(Number(numeric));
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
