import { useState } from 'react';
import { useAccounts, useCreateAccount, useUpdateAccount, useDeleteAccount, useExchangeRates } from '../hooks/useSupabase';
import { formatCurrency } from '../lib/utils';
import { Plus, Pencil, Trash2, Wallet, Landmark, CreditCard, FileText, TrendingUp, PieChart } from 'lucide-react';
import Modal from '../components/Modal';
import type { AccountType, CurrencyCode } from '../types';

const ACCOUNT_TYPES: { value: AccountType; label: string; icon: React.ReactNode }[] = [
  { value: 'cash', label: 'Nakit', icon: <Wallet size={18} /> },
  { value: 'bank', label: 'Banka Hesabı', icon: <Landmark size={18} /> },
  { value: 'credit_card', label: 'Kredi Kartı', icon: <CreditCard size={18} /> },
  { value: 'loan', label: 'Kredi', icon: <FileText size={18} /> },
  { value: 'investment', label: 'Yatırım', icon: <TrendingUp size={18} /> },
  { value: 'fund', label: 'Yatırım Fonu', icon: <PieChart size={18} /> },
];

const CURRENCIES: CurrencyCode[] = ['TRY', 'USD', 'EUR', 'GBP', 'CHF', 'JPY', 'XAU', 'XAG', 'CUM', 'YAR', 'TAM'];

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];

export default function Accounts() {
  const { data: accounts, isLoading } = useAccounts();
  const { data: exchangeRates } = useExchangeRates();
  const createAccount = useCreateAccount();
  const updateAccount = useUpdateAccount();
  const deleteAccount = useDeleteAccount();

  const [modalOpen, setModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<any>(null);
  const [form, setForm] = useState({
    name: '',
    type: 'cash' as AccountType,
    currency: 'TRY' as CurrencyCode,
    balance: 0,
    color: '#6366f1',
    icon: 'wallet',
  });

  const getRate = (currency: CurrencyCode) => {
    if (currency === 'TRY') return 1;
    return exchangeRates?.find((r) => r.currency_code === currency)?.rate_to_try || 1;
  };

  const resetForm = () => {
    setForm({ name: '', type: 'cash', currency: 'TRY', balance: 0, color: '#6366f1', icon: 'wallet' });
    setEditingAccount(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const data = { 
        ...form, 
        initial_balance: form.balance,
        balance: form.type === 'credit_card' || form.type === 'loan' ? -Math.abs(form.balance) : form.balance
      };
      
      if (editingAccount) {
        await updateAccount.mutateAsync({ id: editingAccount.id, ...data });
      } else {
        await createAccount.mutateAsync(data);
      }
      setModalOpen(false);
      resetForm();
    } catch (err: any) {
      alert('Hata: ' + (err.message || 'Hesap eklenemedi'));
    }
  };

  const handleEdit = (account: any) => {
    setEditingAccount(account);
    setForm({
      name: account.name,
      type: account.type,
      currency: account.currency,
      balance: Math.abs(account.balance),
      color: account.color || '#6366f1',
      icon: account.icon || 'wallet',
    });
    setModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Bu hesabı silmek istediğinize emin misiniz?')) {
      try {
        await deleteAccount.mutateAsync(id);
      } catch (err: any) {
        alert('Silme hatası: ' + err.message);
      }
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-slate-200 dark:bg-slate-700 rounded-lg skeleton" />
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-40 bg-slate-200 dark:bg-slate-700 rounded-2xl skeleton" />
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
          <p className="text-gray-500 dark:text-slate-400 text-sm mt-0.5">Tüm finansal hesaplarınızı yönetin</p>
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
          const isNegative = account.type === 'credit_card' || account.type === 'loan';
          const typeInfo = ACCOUNT_TYPES.find(t => t.value === account.type);

          return (
            <div key={account.id} className="bg-gray-100 dark:bg-slate-800 rounded-2xl p-5 border border-gray-300 dark:border-slate-700 shadow-sm card-hover group">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div
                    className="w-11 h-11 rounded-xl flex items-center justify-center text-white shadow-lg"
                    style={{ backgroundColor: account.color || '#6366f1' }}
                  >
                    {typeInfo?.icon}
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-800 dark:text-white">{account.name}</h3>
                    <p className="text-xs text-gray-500 dark:text-slate-400">{typeInfo?.label}</p>
                  </div>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => handleEdit(account)}
                    className="p-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-slate-700 text-slate-400 transition-colors"
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
                <p className={`text-2xl font-bold ${isNegative ? 'text-red-600 dark:text-red-400' : 'text-gray-800 dark:text-white'}`}>
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
          <Wallet size={48} className="mx-auto text-slate-300 dark:text-slate-600 mb-4" />
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
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1.5">Hesap Adı</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-slate-700 bg-gray-100 dark:bg-slate-800 text-gray-800 dark:text-white outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all"
              placeholder="Örn: Ziraat Bankası"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1.5">Hesap Tipi</label>
            <div className="grid grid-cols-2 gap-2">
              {ACCOUNT_TYPES.map((type) => (
                <button
                  key={type.value}
                  type="button"
                  onClick={() => setForm({ ...form, type: type.value })}
                  className={`flex items-center gap-2 p-3 rounded-xl border transition-all ${
                    form.type === type.value
                      ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400'
                      : 'border-gray-300 dark:border-slate-700 hover:bg-gray-100 dark:hover:bg-slate-800'
                  }`}
                >
                  {type.icon}
                  <span className="text-sm">{type.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1.5">Para Birimi</label>
              <select
                value={form.currency}
                onChange={(e) => setForm({ ...form, currency: e.target.value as CurrencyCode })}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-slate-700 bg-gray-100 dark:bg-slate-800 text-gray-800 dark:text-white outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all"
              >
                {CURRENCIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1.5">Bakiye</label>
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

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1.5">Renk</label>
            <div className="flex gap-2 flex-wrap">
              {COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setForm({ ...form, color })}
                  className={`w-8 h-8 rounded-full transition-transform ${form.color === color ? 'scale-125 ring-2 ring-offset-2 ring-slate-400 dark:ring-slate-600' : ''}`}
                  style={{ backgroundColor: color }}
                />
              ))}
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
