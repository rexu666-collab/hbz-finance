import { useState } from 'react';
import Navigation from './Navigation';
import { useAuth } from '../contexts/AuthContext';
import { LogOut, Menu, X } from 'lucide-react';

export default function Layout({ children }: { children: React.ReactNode }) {
  const { signOut } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100">
      {/* Top Bar - Mobile */}
      <div className="lg:hidden flex items-center justify-between p-4 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 sticky top-0 z-40">
        <h1 className="text-xl font-bold text-blue-600">HBZ Finance</h1>
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700"
        >
          {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      <div className="flex">
        {/* Sidebar - Desktop */}
        <div className="hidden lg:block w-64 h-screen sticky top-0 bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700">
          <div className="p-6">
            <h1 className="text-2xl font-bold text-blue-600">HBZ Finance</h1>
          </div>
          <Navigation />
          <div className="absolute bottom-0 w-full p-4 border-t border-slate-200 dark:border-slate-700">
            <button
              onClick={signOut}
              className="flex items-center gap-2 w-full px-4 py-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
            >
              <LogOut size={20} />
              <span>Çıkış Yap</span>
            </button>
          </div>
        </div>

        {/* Mobile Menu Overlay */}
        {mobileMenuOpen && (
          <div className="lg:hidden fixed inset-0 z-50 bg-black/50" onClick={() => setMobileMenuOpen(false)}>
            <div
              className="absolute right-0 top-0 h-full w-64 bg-white dark:bg-slate-800 shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-4 flex justify-end">
                <button onClick={() => setMobileMenuOpen(false)} className="p-2">
                  <X size={24} />
                </button>
              </div>
              <Navigation onNavigate={() => setMobileMenuOpen(false)} />
              <div className="absolute bottom-0 w-full p-4 border-t border-slate-200 dark:border-slate-700">
                <button
                  onClick={() => { signOut(); setMobileMenuOpen(false); }}
                  className="flex items-center gap-2 w-full px-4 py-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                >
                  <LogOut size={20} />
                  <span>Çıkış Yap</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Main Content */}
        <div className="flex-1 min-h-screen">
          <main className="page-container">
            {children}
          </main>
        </div>
      </div>

      {/* Bottom Navigation - Mobile */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 z-40">
        <Navigation isBottom />
      </div>
    </div>
  );
}
