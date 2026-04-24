import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { Sun, Moon, Monitor, User, Palette } from 'lucide-react';

export default function Settings() {
  const { user } = useAuth();
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [message, setMessage] = useState('');

  const themes = [
    { value: 'light' as const, label: 'Açık', icon: <Sun size={18} /> },
    { value: 'dark' as const, label: 'Koyu', icon: <Moon size={18} /> },
    { value: 'system' as const, label: 'Sistem', icon: <Monitor size={18} /> },
  ];

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="section-title">Ayarlar</h1>
        <p className="text-slate-500 dark:text-slate-400">Uygulama tercihlerinizi yönetin</p>
      </div>

      {message && (
        <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 text-sm">
          {message}
        </div>
      )}

      {/* Profile */}
      <div className="card card-light dark:card-dark">
        <div className="flex items-center gap-3 mb-4">
          <User size={20} className="text-blue-600" />
          <h3 className="font-semibold">Profil</h3>
        </div>
        <div className="space-y-3">
          <div>
            <label className="label">E-posta</label>
            <input type="email" value={user?.email || ''} disabled className="input bg-slate-100 dark:bg-slate-700 cursor-not-allowed" />
          </div>
          <div>
            <label className="label">Kullanıcı ID</label>
            <input type="text" value={user?.id || ''} disabled className="input bg-slate-100 dark:bg-slate-700 cursor-not-allowed text-xs" />
          </div>
        </div>
      </div>

      {/* Theme */}
      <div className="card card-light dark:card-dark">
        <div className="flex items-center gap-3 mb-4">
          <Palette size={20} className="text-purple-600" />
          <h3 className="font-semibold">Tema</h3>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {themes.map((t) => (
            <button
              key={t.value}
              onClick={() => { setTheme(t.value); setMessage('Tema güncellendi!'); setTimeout(() => setMessage(''), 2000); }}
              className={`flex flex-col items-center gap-2 p-4 rounded-lg border transition-all ${
                theme === t.value
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                  : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
            >
              {t.icon}
              <span className="text-sm font-medium">{t.label}</span>
            </button>
          ))}
        </div>
        <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
          Aktif tema: <span className="font-medium capitalize">{resolvedTheme}</span>
        </p>
      </div>

      {/* About */}
      <div className="card card-light dark:card-dark">
        <h3 className="font-semibold mb-2">HBZ Finance Hakkında</h3>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Kişisel finans yönetim uygulamanız. Banka hesapları, kredi kartları, krediler, döviz, altın ve yatırım fonlarınızı tek bir yerden takip edin.
        </p>
        <div className="mt-4 text-xs text-slate-400 space-y-1">
          <p>Versiyon: 1.0.0</p>
          <p>Veritabanı: Supabase</p>
          <p>Hosting: Vercel</p>
        </div>
      </div>
    </div>
  );
}
