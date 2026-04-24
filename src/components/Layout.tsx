import { useState } from 'react';
import Navigation from './Navigation';
import { useAuth } from '../contexts/AuthContext';
import { LogOut, Menu, X, Moon, Sun } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

export default function Layout({ children }: { children: React.ReactNode }) {
  const { signOut } = useAuth();
  const { resolvedTheme, setTheme } = useTheme();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gray-200 dark:bg-slate-950 text-gray-900 dark:text-slate-100 transition-colors duration-300">
      {/* Top Bar - Mobile */}
      <div className="lg:hidden flex items-center justify-between p-4 bg-gray-200/80 dark:bg-slate-900/80 backdrop-blur-lg border-b border-gray-300 dark:border-slate-800 sticky top-0 z-40">
        <h1 className="text-xl font-bold gradient-text">HBZ Finance</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
            className="p-2 rounded-lg bg-gray-200 dark:bg-slate-800 text-gray-600 dark:text-slate-400"
          >
            {resolvedTheme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
          </button>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-lg bg-gray-200 dark:bg-slate-800 text-gray-600 dark:text-slate-400"
          >
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      <div className="flex">
        {/* Sidebar - Desktop */}
        <div className="hidden lg:flex w-64 h-screen sticky top-0 flex-col bg-gray-100 dark:bg-slate-900 border-r border-gray-300 dark:border-slate-800">
          <div className="p-6 border-b border-gray-200 dark:border-slate-800">
            <h1 className="text-2xl font-bold gradient-text">HBZ Finance</h1>
            <p className="text-xs text-gray-500 mt-1">Kişisel Finans Yönetimi</p>
          </div>
          <div className="flex-1 overflow-y-auto py-4">
            <Navigation />
          </div>
          <div className="p-4 border-t border-gray-200 dark:border-slate-800 space-y-2">
            <button
              onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
              className="flex items-center gap-3 w-full px-4 py-2.5 rounded-xl text-sm font-medium text-gray-600 dark:text-slate-400 hover:bg-gray-200 dark:hover:bg-slate-800 transition-colors"
            >
              {resolvedTheme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
              <span>{resolvedTheme === 'dark' ? 'Açık Tema' : 'Koyu Tema'}</span>
            </button>
            <button
              onClick={signOut}
              className="flex items-center gap-3 w-full px-4 py-2.5 rounded-xl text-sm font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
            >
              <LogOut size={18} />
              <span>Çıkış Yap</span>
            </button>
          </div>
        </div>

        {/* Mobile Menu Overlay */}
        {mobileMenuOpen && (
          <div className="lg:hidden fixed inset-0 z-50 bg-black/50 backdrop-blur-sm" onClick={() => setMobileMenuOpen(false)}>
            <div
              className="absolute right-0 top-0 h-full w-72 bg-gray-50 dark:bg-slate-900 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-4 flex justify-between items-center border-b border-gray-200 dark:border-slate-800">
                <h2 className="font-bold gradient-text">HBZ Finance</h2>
                <button onClick={() => setMobileMenuOpen(false)} className="p-2">
                  <X size={20} />
                </button>
              </div>
              <Navigation onNavigate={() => setMobileMenuOpen(false)} />
              <div className="absolute bottom-0 w-full p-4 border-t border-gray-200 dark:border-slate-800 space-y-2">
                <button
                  onClick={() => { setTheme(resolvedTheme === 'dark' ? 'light' : 'dark'); setMobileMenuOpen(false); }}
                  className="flex items-center gap-3 w-full px-4 py-2.5 rounded-xl text-sm font-medium text-gray-600 dark:text-slate-400 hover:bg-gray-200 dark:hover:bg-slate-800"
                >
                  {resolvedTheme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
                  <span>Tema Değiştir</span>
                </button>
                <button
                  onClick={() => { signOut(); setMobileMenuOpen(false); }}
                  className="flex items-center gap-3 w-full px-4 py-2.5 rounded-xl text-sm font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
                >
                  <LogOut size={18} />
                  <span>Çıkış Yap</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Main Content */}
        <div className="flex-1 min-h-screen">
          <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-24 lg:pb-8">
            {children}
          </main>
        </div>
      </div>

      {/* Bottom Navigation - Mobile */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-gray-200/90 dark:bg-slate-900/90 backdrop-blur-lg border-t border-gray-300 dark:border-slate-800 z-40 safe-area-pb">
        <Navigation isBottom />
      </div>
    </div>
  );
}
