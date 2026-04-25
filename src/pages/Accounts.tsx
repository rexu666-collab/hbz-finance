import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { useAccounts, useCreateAccount, useUpdateAccount, useDeleteAccount, useExchangeRates } from '../hooks/useSupabase';
import { formatCurrency } from '../lib/utils';
import { Plus, Pencil, Trash2, CreditCard, Landmark, Coins, CircleDollarSign } from 'lucide-react';
import Modal from '../components/Modal';
import type { CurrencyCode, AccountType } from '../types';

const DOVIZ_CODES: CurrencyCode[] = ['USD', 'EUR', 'GBP', 'CHF', 'JPY'];
const ALTIN_CODES: CurrencyCode[] = ['XAU', 'XAG', 'CUM', 'YAR', 'TAM', 'ATA', 'CUMH', 'BILEZIK'];
const BANK_CODES: CurrencyCode[] = ['TRY', 'USD', 'EUR', 'GBP', 'CHF', 'JPY'];

const TYPE_CONFIG: Record<AccountType, { label: string; icon: React.ReactNode; color: string; currencies: CurrencyCode[] }> = {
  bank: { label: 'Banka Hesabı', icon: <Landmark size={18} />, color: '#2563eb', currencies: BANK_CODES },
  doviz: { label: 'Döviz Hesabı', icon: <CircleDollarSign size={18} />, color: '#10b981', currencies: DOVIZ_CODES },
  altin: { label: 'Altın Hesabı', icon: <Coins size={18} />, color: '#f59e0b', currencies: ALTIN_CODES },
};

// Bank logo helpers (shared logic with CreditCards)
const LOCAL_BANK_LOGOS: Record<string, string> = {
  garanti: '/bank-logos/garanti.svg',
  garantibbva: '/bank-logos/garanti.svg',
  bbva: '/bank-logos/garanti.svg',
  akbank: '/bank-logos/akbank.svg',
  isbank: '/bank-logos/isbank.svg',
  isbankasi: '/bank-logos/isbank.svg',
  turkiyeisbankasi: '/bank-logos/isbank.svg',
  ziraat: '/bank-logos/ziraat.svg',
  ziraatbank: '/bank-logos/ziraat.svg',
  ziraatbankasi: '/bank-logos/ziraat.svg',
  halkbank: '/bank-logos/halkbank.svg',
  teb: '/bank-logos/teb.svg',
  turkekonomibankasi: '/bank-logos/teb.svg',
  ing: '/bank-logos/ing.svg',
  ingbank: '/bank-logos/ing.svg',
  enpara: '/bank-logos/enpara.png',
  enparacom: '/bank-logos/enpara.png',
};

function getBankLogoPath(name: string): string | null {
  const n = name.toLowerCase().replace(/[^a-zğüşıöç]/gi, '');
  for (const slug in LOCAL_BANK_LOGOS) {
    if (n.includes(slug)) return LOCAL_BANK_LOGOS[slug];
  }
  return null;
}

function getBankColor(name: string): string {
  const n = name.toLowerCase();
  if (n.includes('garanti')) return '#F47920';
  if (n.includes('akbank')) return '#E30613';
  if (n.includes('is') && (n.includes('bank') || n.includes('bankasi'))) return '#633588';
  if (n.includes('ziraat')) return '#CC0000';
  if (n.includes('halkbank')) return '#FF6600';
  if (n.includes('yapikredi') || n.includes('ykb')) return '#0047AB';
  if (n.includes('vakif')) return '#FFD700';
  if (n.includes('ing')) return '#FF6200';
  if (n.includes('qnb') || n.includes('finansbank')) return '#00A9E0';
  if (n.includes('deniz')) return '#0088CC';
  if (n.includes('teb')) return '#003399';
  if (n.includes('fibabanka') || n.includes('fiba')) return '#0055A4';
  if (n.includes('hsbc')) return '#DB0011';
  if (n.includes('enpara')) return '#00C853';
  if (n.includes('odeabank') || n.includes('odea')) return '#6B2D5C';
  return '#2563eb';
}

function BankLogo({ bankName }: { bankName: string }) {
  const [error, setError] = useState(false);
  const path = getBankLogoPath(bankName);

  if (path && !error) {
    return (
      <img
        src={path}
        alt={bankName}
        className="w-12 h-12 object-contain rounded-lg bg-gray-50 dark:bg-gray-50 shadow-lg shrink-0"
        onError={() => setError(true)}
        loading="lazy"
      />
    );
  }

  const color = getBankColor(bankName);
  const initial = bankName.charAt(0).toUpperCase();
  return (
    <div
      className="w-12 h-12 rounded-lg flex items-center justify-center shadow-lg shrink-0"
      style={{ backgroundColor: color, color: '#fff' }}
      title={bankName}
    >
      <span className="text-lg font-bold">{initial}</span>
    </div>
  );
}

export default function Accounts() {
  const { user } = useAuth();
  const { addToast } = useToast();
  const { data: accounts, isLoading } = useAccounts();
  const { data: exchangeRates } = useExchangeRates();
  const createAccount = useCreateAccount();
  const updateAccount = useUpdateAccount();
  const deleteAccount = useDeleteAccount();

  const [modalOpen, setModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<any>(null);
  const [form, setForm] = useState({
    name: '',
    type: 'bank' as AccountType,
    currency: 'TRY' as CurrencyCode,
    balance: 0,
    color: '#2563eb',
    icon: 'landmark',
  });

  const getRate = (currency: CurrencyCode) => {
    if (currency === 'TRY') return 1;
    return exchangeRates?.find((r) => r.currency_code === currency)?.rate_to_try || 1;
  };

  const getTypeConfig = (type: AccountType) => TYPE_CONFIG[type];

  const resetForm = () => {
    setForm({ name: '', type: 'bank', currency: 'TRY', balance: 0, color: '#2563eb', icon: 'landmark' });
    setEditingAccount(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) {
      addToast('Oturum bulunamadı. Lütfen tekrar giriş yapın.', 'error');
      return;
    }
    try {
      const autoColor = form.type === 'bank' ? getBankColor(form.name) : getTypeConfig(form.type).color;
      const data = { 
        ...form, 
        user_id: user.id,
        initial_balance: form.balance,
        balance: form.balance,
        color: autoColor,
      };
      
      if (editingAccount) {
        await updateAccount.mutateAsync({ id: editingAccount.id, ...data });
        addToast('Hesap güncellendi!', 'success');
      } else {
        await createAccount.mutateAsync(data);
        addToast('Hesap eklendi!', 'success');
      }
      setModalOpen(false);
      resetForm();
    } catch (err: any) {
      console.error('Account error:', err);
      addToast('Hata: ' + (err?.message || 'Hesap eklenemedi'), 'error');
    }
  };

  const handleEdit = (account: any) => {
    setEditingAccount(account);
    setForm({
      name: account.name,
      type: account.type || 'bank',
      currency: account.currency,
      balance: Math.abs(account.balance),
      color: account.color || '#2563eb',
      icon: account.icon || 'landmark',
    });
    setModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Bu hesabı silmek istediğinize emin misiniz?')) {
      try {
        await deleteAccount.mutateAsync(id);
        addToast('Hesap silindi!', 'success');
      } catch (err: any) {
        addToast('Silme hatası: ' + err.message, 'error');
      }
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-gray-300 dark:bg-slate-700 rounded-lg skeleton" />
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-40 bg-gray-300 dark:bg-slate-700 rounded-2xl skeleton" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Hesaplarım</h1>
          <p className="text-gray-500 dark:text-slate-400 text-sm mt-0.5">Banka, döviz ve altın hesaplarınızı yönetin</p>
        </div>
        <button
          onClick={() => { resetForm(); setModalOpen(true); }}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-medium hover:from-indigo-600 hover:to-purple-700 transition-all shadow-lg shadow-indigo-500/25"
        >
          <Plus size={18} />
          <span className="hidden sm:inline">Yeni Hesap</span>
        </button>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {accounts?.map((account) => {
          const tryValue = account.balance * getRate(account.currency);
          const config = getTypeConfig(account.type || 'bank');

          return (
            <div key={account.id} className="bg-gray-100 dark:bg-slate-800 rounded-2xl p-5 border border-gray-300 dark:border-slate-700 shadow-sm card-hover group">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  {account.type === 'bank' ? (
                    <BankLogo bankName={account.name} />
                  ) : (
                    <div
                      className="w-12 h-12 rounded-lg flex items-center justify-center text-white shadow-lg shrink-0"
                      style={{ backgroundColor: account.color || config.color }}
                    >
                      {config.icon}
                    </div>
                  )}
                  <div>
                    <h3 className="font-semibold text-gray-800 dark:text-white">{account.name}</h3>
                    <p className="text-xs text-gray-500 dark:text-slate-400">{config.label}</p>
                  </div>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => handleEdit(account)}
                    className="p-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-slate-700 text-gray-400 transition-colors"
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    onClick={() => handleDelete(account.id)}
                    className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-400 transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              <div className="space-y-1">
                <p className="text-2xl font-bold text-gray-800 dark:text-white">
                  {formatCurrency(account.balance, account.currency)}
                </p>
                {account.currency !== 'TRY' && (
                  <p className="text-sm text-gray-500 dark:text-slate-400">
                    ≈ {formatCurrency(tryValue, 'TRY')}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {accounts?.length === 0 && (
        <div className="text-center py-16 bg-gray-100 dark:bg-slate-800 rounded-2xl border border-gray-300 dark:border-slate-700 border-dashed">
          <CreditCard size={48} className="mx-auto text-gray-300 dark:text-slate-600 mb-4" />
          <p className="text-gray-500 dark:text-slate-400">Henüz hesap eklemediniz</p>
          <button onClick={() => setModalOpen(true)} className="mt-4 px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-medium">
            İlk Hesabınızı Ekleyin
          </button>
        </div>
      )}

      <Modal
        isOpen={modalOpen}
        onClose={() => { setModalOpen(false); resetForm(); }}
        title={editingAccount ? 'Hesap Düzenle' : 'Yeni Hesap'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Account Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1.5">Hesap Tipi</label>
            <div className="grid grid-cols-3 gap-2">
              {(['bank', 'doviz', 'altin'] as AccountType[]).map((t) => {
                const cfg = TYPE_CONFIG[t];
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setForm({ ...form, type: t, currency: cfg.currencies[0] })}
                    className={`flex flex-col items-center gap-1 p-3 rounded-xl border text-xs font-medium transition-all ${
                      form.type === t
                        ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400'
                        : 'border-gray-300 dark:border-slate-700 hover:bg-gray-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    {cfg.icon}
                    <span>{cfg.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1.5">Hesap Adı</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-slate-700 bg-gray-100 dark:bg-slate-800 text-gray-800 dark:text-white outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all"
              placeholder={form.type === 'bank' ? 'Örn: Ziraat Bankası' : form.type === 'doviz' ? 'Örn: Döviz Birikimim' : 'Örn: Altın Hesabım'}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1.5">Birim</label>
              <select
                value={form.currency}
                onChange={(e) => setForm({ ...form, currency: e.target.value as CurrencyCode })}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-slate-700 bg-gray-100 dark:bg-slate-800 text-gray-800 dark:text-white outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all"
              >
                {getTypeConfig(form.type).currencies.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1.5">Miktar</label>
              <input
                type="number"
                step="0.01"
                value={form.balance}
                onChange={(e) => setForm({ ...form, balance: parseFloat(e.target.value) || 0 })}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-slate-700 bg-gray-100 dark:bg-slate-800 text-gray-800 dark:text-white outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all"
                required
              />
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setModalOpen(false)} className="flex-1 px-4 py-2.5 rounded-xl border border-gray-300 dark:border-slate-700 text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors font-medium">
              İptal
            </button>
            <button type="submit" className="flex-1 px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-medium hover:from-indigo-600 hover:to-purple-700 transition-all shadow-lg shadow-indigo-500/25">
              {editingAccount ? 'Güncelle' : 'Kaydet'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
