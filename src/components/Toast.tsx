// Small bottom toast for feedback ("저장했어요!", rewards). One at a time; a new one replaces the old.
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';

interface ToastMsg {
  id: number;
  text: string;
  action?: { label: string; onClick: () => void };
}

type Show = (text: string, action?: ToastMsg['action']) => void;

const ToastContext = createContext<Show>(() => {});

export function ToastProvider({ children }: { children: ReactNode }) {
  const [msg, setMsg] = useState<ToastMsg | null>(null);
  const timer = useRef<number>();
  const seq = useRef(0);

  const show = useCallback<Show>((text, action) => {
    window.clearTimeout(timer.current);
    setMsg({ id: ++seq.current, text, action });
    timer.current = window.setTimeout(() => setMsg(null), action ? 4000 : 2200);
  }, []);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  return (
    <ToastContext.Provider value={show}>
      {children}
      <div className="toast-region" role="status" aria-live="polite">
        {msg && (
          <div className="toast" key={msg.id}>
            <span>{msg.text}</span>
            {msg.action && (
              <button
                type="button"
                onClick={() => {
                  msg.action?.onClick();
                  setMsg(null);
                }}
              >
                {msg.action.label}
              </button>
            )}
          </div>
        )}
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);
