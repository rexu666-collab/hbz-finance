import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { Sun, Moon, Monitor, User, Palette, Info, Check } from 'lucide-react';

export default function Settings() {
  const { user } = useAuth();
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [message, setMessage] = useState('');

  const themes = [
    { value: 'light' as const, label: 'Açık', icon: <Sun size={18} />, desc: 'Aydınlık arayüz' },
    { value: 'dark' as const, label: 'Koyu', icon: <Moon size={18} />, desc: 'Karanlık arayüz' },
    { value: 'system' as const, label: 'Otomatik', icon: <Monitor size={18} />, desc: 'Sistem teması' },
  ];

  const handleThemeChange = (newTheme: 'light' | 'dark' | 'system') => {
    setTheme(newTheme);
    setMessage('Tema güncellendi!');
    setTimeout(() => setMessage(''), 2000);
  };

  return (
    <div className="space-y-6 max-w-2xl fade-in">
      <div>
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Ayarlar</h1>
        <p className="text-gray-500 dark:text-slate-400 text-sm mt-0.5">Uygulama tercihlerinizi yönetin</p>
      </div>

      {message && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-sm slide-in">
          <Check size={16} />
          {message}
        </div>
      )}

      {/* Profile */}
      <div className="bg-gray-100 dark:bg-slate-800 rounded-2xl p-6 border border-gray-300 dark:border-slate-700 shadow-sm">
        <div className="flex items-center gap-3 mb-5">
          <div className="p-2.5 rounded-xl bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400">
            <User size={20} />
          </div>
          <div>
            <h3 className="font-semibold text-gray-800 dark:text-white">Profil</h3>
            <p className="text-xs text-slate-500">Hesap bilgileriniz</p>
          </div>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-500 dark:text-slate-400 mb-1">E-posta</label>
            <input 
              type="email" 
              value={user?.email || ''} 
              disabled 
              className="w-full px-4 py-2.5 rounded-xl bg-gray-300 dark:bg-slate-700/50 border border-gray-300 dark:border-slate-700 text-slate-500 cursor-not-allowed text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-500 dark:text-slate-400 mb-1">Kullanıcı ID</label>
            <input 
              type="text" 
              value={user?.id || ''} 
              disabled 
              className="w-full px-4 py-2.5 rounded-xl bg-gray-300 dark:bg-slate-700/50 border border-gray-300 dark:border-slate-700 text-slate-500 cursor-not-allowed text-xs font-mono"
            />
          </div>
        </div>
      </div>

      {/* Theme */}
      <div className="bg-gray-100 dark:bg-slate-800 rounded-2xl p-6 border border-gray-300 dark:border-slate-700 shadow-sm">
        <div className="flex items-center gap-3 mb-5">
          <div className="p-2.5 rounded-xl bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400">
            <Palette size={20} />
          </div>
          <div>
            <h3 className="font-semibold text-gray-800 dark:text-white">Tema</h3>
            <p className="text-xs text-slate-500">Arayüz görünümünü özelleştirin</p>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {themes.map((t) => (
            <button
              key={t.value}
              onClick={() => handleThemeChange(t.value)}
              className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                theme === t.value
                  ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400'
                  : 'border-gray-300 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 text-slate-600 dark:text-slate-400'
              }`}
            >
              {t.icon}
              <span className="text-sm font-medium">{t.label}</span>
              <span className="text-xs opacity-70">{t.desc}</span>
            </button>
          ))}
        </div>
        <p className="mt-3 text-sm text-slate-500">
          Aktif tema: <span className="font-medium text-gray-800 dark:text-white capitalize">{resolvedTheme}</span>
        </p>
      </div>

      {/* About */}
      <div className="bg-gray-100 dark:bg-slate-800 rounded-2xl p-6 border border-gray-300 dark:border-slate-700 shadow-sm">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2.5 rounded-xl bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400">
            <Info size={20} />
          </div>
          <h3 className="font-semibold text-gray-800 dark:text-white">HBZ Finance Hakkında</h3>
        </div>
        <p className="text-sm text-gray-500 dark:text-slate-400 leading-relaxed">
          Kişisel finans yönetim uygulamanız. Banka hesapları, kredi kartları, krediler, döviz, altın ve yatırım fonlarınızı tek bir yerden takip edin.
        </p>
        <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-700 grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-lg font-bold text-gray-800 dark:text-white">1.0</p>
            <p className="text-xs text-slate-500">Versiyon</p>
          </div>
          <div>
            <p className="text-lg font-bold text-gray-800 dark:text-white">Supabase</p>
            <p className="text-xs text-slate-500">Veritabanı</p>
          </div>
          <div>
            <p className="text-lg font-bold text-gray-800 dark:text-white">Vercel</p>
            <p className="text-xs text-slate-500">Hosting</p>
          </div>
        </div>
      </div>
    </div>
  );
}
