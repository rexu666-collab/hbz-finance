import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Wallet, Receipt, PieChart, CreditCard, Settings, StickyNote } from 'lucide-react';

const navItems = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard, short: 'Ana' },
  { path: '/accounts', label: 'Hesaplarım', icon: Wallet, short: 'Hesap' },
  { path: '/transactions', label: 'İşlemler', icon: Receipt, short: 'İşlem' },
  { path: '/funds', label: 'Fonlar', icon: PieChart, short: 'Fon' },
  { path: '/credit-cards', label: 'Kartlarım', icon: CreditCard, short: 'Kart' },
  { path: '/notes', label: 'Notlarım', icon: StickyNote, short: 'Not' },
  { path: '/settings', label: 'Ayarlar', icon: Settings, short: 'Ayar' },
];

export default function Navigation({ isBottom = false, onNavigate }: { isBottom?: boolean; onNavigate?: () => void }) {
  if (isBottom) {
    return (
      <nav className="flex justify-around items-center h-16">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            onClick={onNavigate}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center gap-0.5 min-w-0 flex-1 h-full transition-all duration-200 ${
                isActive
                  ? 'text-indigo-600 dark:text-indigo-400'
                  : 'text-slate-500 dark:text-slate-400'
              }`
            }
          >
            <item.icon size={22} strokeWidth={2} />
            <span className="text-[10px] font-medium truncate px-1">{item.short}</span>
          </NavLink>
        ))}
      </nav>
    );
  }

  return (
    <nav className="px-3 space-y-1">
      {navItems.map((item) => (
        <NavLink
          key={item.path}
          to={item.path}
          onClick={onNavigate}
          className={({ isActive }) =>
            `flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
              isActive
                ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 font-medium'
                : 'text-gray-600 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-800 hover:text-gray-800 dark:hover:text-white'
            }`
          }
        >
          <item.icon size={20} strokeWidth={2} />
          <span className="text-sm">{item.label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
