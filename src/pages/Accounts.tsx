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
    color: '#2563eb',
  });

  const getRate = (currency: CurrencyCode) => {
    if (currency === 'TRY') return 1;
    return exchangeRates?.find((r) => r.currency_code === currency)?.rate_to_try || 1;
  };

  const resetForm = () => {
    setForm({ name: '', type: 'cash', currency: 'TRY', balance: 0, color: '#2563eb' });
    setEditingAccount(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const data = { ...form, initial_balance: form.balance, icon: 'wallet' };
    if (editingAccount) {
      await updateAccount.mutateAsync({ id: editingAccount.id, ...data });
    } else {
      await createAccount.mutateAsync(data);
    }
    setModalOpen(false);
    resetForm();
  };

  const handleEdit = (account: any) => {
    setEditingAccount(account);
    setForm({
      name: account.name,
      type: account.type,
      currency: account.currency,
      balance: account.balance,
      color: account.color || '#2563eb',
    });
    setModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Bu hesabı silmek istediğinize emin misiniz?')) {
      await deleteAccount.mutateAsync(id);
    }
  };

  if (isLoading) {
    return <div className="text-center py-8">Yükleniyor...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="section-title">Hesaplarım</h1>
          <p className="text-slate-500 dark:text-slate-400">Tüm finansal hesaplarınız</p>
        </div>
        <button
          onClick={() => { resetForm(); setModalOpen(true); }}
          className="btn btn-primary"
        >
          <Plus size={18} />
          <span className="hidden sm:inline">Yeni Hesap</span>
        </button>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {accounts?.map((account) => {
          const tryValue = account.balance * getRate(account.currency);
          const isNegative = account.type === 'credit_card' || account.type === 'loan';

          return (
            <div key={account.id} className="card card-light dark:card-dark relative group">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center text-white"
                    style={{ backgroundColor: account.color || '#2563eb' }}
                  >
                    {ACCOUNT_TYPES.find(t => t.value === account.type)?.icon}
                  </div>
                  <div>
                    <h3 className="font-semibold">{account.name}</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      {ACCOUNT_TYPES.find(t => t.value === account.type)?.label}
                    </p>
                  </div>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => handleEdit(account)}
                    className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500"
                  >
                    <Pencil size={16} />
                  </button>
                  <button
                    onClick={() => handleDelete(account.id)}
                    className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              <div className="space-y-1">
                <p className={`text-2xl font-bold ${isNegative ? 'text-red-600 dark:text-red-400' : ''}`}>
                  {formatCurrency(account.balance, account.currency)}
                </p>
                {account.currency !== 'TRY' && (
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    ≈ {formatCurrency(tryValue, 'TRY')}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {accounts?.length === 0 && (
        <div className="text-center py-12">
          <Wallet size={48} className="mx-auto text-slate-300 dark:text-slate-600 mb-4" />
          <p className="text-slate-500 dark:text-slate-400">Henüz hesap eklemediniz</p>
          <button onClick={() => setModalOpen(true)} className="btn btn-primary mt-4">
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
            <label className="label">Hesap Adı</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="input"
              placeholder="Örn: Ziraat Bankası"
              required
            />
          </div>

          <div>
            <label className="label">Hesap Tipi</label>
            <div className="grid grid-cols-2 gap-2">
              {ACCOUNT_TYPES.map((type) => (
                <button
                  key={type.value}
                  type="button"
                  onClick={() => setForm({ ...form, type: type.value })}
                  className={`flex items-center gap-2 p-3 rounded-lg border transition-all ${
                    form.type === type.value
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                      : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  {type.icon}
                  <span className="text-sm">{type.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="label">Para Birimi</label>
            <select
              value={form.currency}
              onChange={(e) => setForm({ ...form, currency: e.target.value as CurrencyCode })}
              className="input"
            >
              {CURRENCIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="label">Bakiye</label>
            <input
              type="number"
              step="0.01"
              value={form.balance}
              onChange={(e) => setForm({ ...form, balance: parseFloat(e.target.value) || 0 })}
              className="input"
              required
            />
          </div>

          <div>
            <label className="label">Renk</label>
            <div className="flex gap-2 flex-wrap">
              {['#2563eb', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'].map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setForm({ ...form, color })}
                  className={`w-8 h-8 rounded-full transition-transform ${form.color === color ? 'scale-125 ring-2 ring-offset-2 ring-slate-400' : ''}`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setModalOpen(false)} className="btn btn-secondary flex-1">
              İptal
            </button>
            <button type="submit" className="btn btn-primary flex-1">
              {editingAccount ? 'Güncelle' : 'Kaydet'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
