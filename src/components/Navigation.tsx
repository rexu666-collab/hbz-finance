import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Wallet, Receipt, PieChart, Settings } from 'lucide-react';
import { cn } from '../lib/utils';

const navItems = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/accounts', label: 'Hesaplarım', icon: Wallet },
  { path: '/transactions', label: 'İşlemler', icon: Receipt },
  { path: '/funds', label: 'Fonlar', icon: PieChart },
  { path: '/settings', label: 'Ayarlar', icon: Settings },
];

export default function Navigation({ isBottom = false, onNavigate }: { isBottom?: boolean; onNavigate?: () => void }) {
  if (isBottom) {
    return (
      <nav className="flex justify-around py-2">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            onClick={onNavigate}
            className={({ isActive }) =>
              cn(
                'flex flex-col items-center gap-1 p-2 rounded-lg transition-colors',
                isActive
                  ? 'text-blue-600 dark:text-blue-400'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
              )
            }
          >
            <item.icon size={20} />
            <span className="text-xs">{item.label}</span>
          </NavLink>
        ))}
      </nav>
    );
  }

  return (
    <nav className="px-4 space-y-1">
      {navItems.map((item) => (
        <NavLink
          key={item.path}
          to={item.path}
          onClick={onNavigate}
          className={({ isActive }) =>
            cn(
              'flex items-center gap-3 px-4 py-3 rounded-lg transition-colors',
              isActive
                ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
            )
          }
        >
          <item.icon size={20} />
          <span className="font-medium">{item.label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
