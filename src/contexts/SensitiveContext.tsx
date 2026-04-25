import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';

interface SensitiveContextType {
  hidden: boolean;
  toggle: () => void;
}

const SensitiveContext = createContext<SensitiveContextType>({
  hidden: false,
  toggle: () => {},
});

export function SensitiveProvider({ children }: { children: ReactNode }) {
  const [hidden, setHidden] = useState(() => {
    return localStorage.getItem('hbz_hide_sensitive') === 'true';
  });

  useEffect(() => {
    localStorage.setItem('hbz_hide_sensitive', String(hidden));
  }, [hidden]);

  const toggle = () => setHidden((v) => !v);

  return (
    <SensitiveContext.Provider value={{ hidden, toggle }}>
      {children}
    </SensitiveContext.Provider>
  );
}

export function useSensitive() {
  return useContext(SensitiveContext);
}

export function Mask({ children, className = '' }: { children: ReactNode; className?: string }) {
  const { hidden } = useSensitive();
  if (!hidden) return <span className={className}>{children}</span>;
  return <span className={className}>***</span>;
}
