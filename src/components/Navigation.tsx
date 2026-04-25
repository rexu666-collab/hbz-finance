import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Wallet, Receipt, PieChart, CreditCard, Settings } from 'lucide-react';

const navItems = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/accounts', label: 'Hesaplarım', icon: Wallet },
  { path: '/transactions', label: 'İşlemler', icon: Receipt },
  { path: '/funds', label: 'Fonlar', icon: PieChart },
  { path: '/credit-cards', label: 'Kartlarım', icon: CreditCard },
  { path: '/settings', label: 'Ayarlar', icon: Settings },
];

export default function Navigation({ isBottom = false, onNavigate }: { isBottom?: boolean; onNavigate?: () => void }) {
  if (isBottom) {
    return (
      <nav className="flex justify-around py-2 px-1">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            onClick={onNavigate}
            className={({ isActive }) =>
              `flex flex-col items-center gap-0.5 p-2 rounded-xl transition-all duration-200 ${
                isActive
                  ? 'text-indigo-600 dark:text-indigo-400'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
              }`
            }
          >
            <item.icon size={20} strokeWidth={2} />
            <span className="text-[10px] font-medium">{item.label}</span>
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
