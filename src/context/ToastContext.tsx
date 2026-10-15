import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { Check, CircleAlert, X } from 'lucide-react';

interface Toast { id: number; message: string; tone: 'success' | 'error' | 'info'; }
interface ToastContextValue { notify: (message: string, tone?: Toast['tone']) => void; }
const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const notify = useCallback((message: string, tone: Toast['tone'] = 'success') => {
    const id = Date.now() + Math.random();
    setToasts((list) => [...list, { id, message, tone }]);
    window.setTimeout(() => setToasts((list) => list.filter((toast) => toast.id !== id)), 4200);
  }, []);
  const value = useMemo(() => ({ notify }), [notify]);
  return <ToastContext.Provider value={value}>{children}<div className="toast-stack" aria-live="polite">{toasts.map((toast) => <div className={`toast toast-${toast.tone}`} key={toast.id}>{toast.tone === 'error' ? <CircleAlert size={18} /> : <Check size={18} />}<span>{toast.message}</span><button aria-label="Fechar aviso" onClick={() => setToasts((list) => list.filter((item) => item.id !== toast.id))}><X size={16} /></button></div>)}</div></ToastContext.Provider>;
}
export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast precisa ser usado dentro de ToastProvider.');
  return context;
}
