import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Wallet, Eye, EyeOff } from 'lucide-react';

export default function Login() {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { signIn, signUp } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (isRegister) {
      const { error } = await signUp(email, password, username);
      if (error) setError(error.message);
    } else {
      const { error } = await signIn(email, password);
      if (error) setError(error.message);
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900 p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-blue-600 text-white mb-4">
            <Wallet size={32} />
          </div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">HBZ Finance</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-2">Kişisel Finans Yönetimi</p>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg p-6">
          <h2 className="text-xl font-semibold mb-6 text-center">
            {isRegister ? 'Hesap Oluştur' : 'Giriş Yap'}
          </h2>

          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {isRegister && (
              <div>
                <label className="label">Kullanıcı Adı</label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="input"
                  placeholder="Kullanıcı adınız"
                  required
                />
              </div>
            )}

            <div>
              <label className="label">E-posta</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input"
                placeholder="ornek@email.com"
                required
              />
            </div>

            <div>
              <label className="label">Şifre</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input pr-10"
                  placeholder="••••••••"
                  required
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary w-full disabled:opacity-50"
            >
              {loading ? 'İşleniyor...' : isRegister ? 'Kayıt Ol' : 'Giriş Yap'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button
              onClick={() => { setIsRegister(!isRegister); setError(''); }}
              className="text-blue-600 dark:text-blue-400 hover:underline text-sm"
            >
              {isRegister ? 'Zaten hesabınız var mı? Giriş yapın' : 'Hesabınız yok mu? Kayıt olun'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
