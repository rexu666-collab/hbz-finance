import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { useAccounts, useCreateAccount, useUpdateAccount, useDeleteAccount, useExchangeRates } from '../hooks/useSupabase';
import { formatCurrency } from '../lib/utils';
import { Plus, Pencil, Trash2, Landmark } from 'lucide-react';
import Modal from '../components/Modal';
import type { CurrencyCode } from '../types';

const CURRENCIES: CurrencyCode[] = ['TRY', 'USD', 'EUR', 'GBP', 'CHF', 'JPY', 'XAU', 'XAG', 'CUM', 'YAR', 'TAM'];

const COLORS = ['#2563eb', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1'];

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
    type: 'bank' as const,
    currency: 'TRY' as CurrencyCode,
    balance: 0,
    color: '#2563eb',
    icon: 'landmark',
  });

  const getRate = (currency: CurrencyCode) => {
    if (currency === 'TRY') return 1;
    return exchangeRates?.find((r) => r.currency_code === currency)?.rate_to_try || 1;
  };

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
      const data = { 
        ...form, 
        user_id: user.id,
        initial_balance: form.balance,
        balance: form.balance
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
      type: 'bank',
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
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Banka Hesaplarım</h1>
          <p className="text-gray-500 dark:text-slate-400 text-sm mt-0.5">Tüm banka hesaplarınızı yönetin</p>
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

          return (
            <div key={account.id} className="bg-gray-100 dark:bg-slate-800 rounded-2xl p-5 border border-gray-300 dark:border-slate-700 shadow-sm card-hover group">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div
                    className="w-11 h-11 rounded-xl flex items-center justify-center text-white shadow-lg"
                    style={{ backgroundColor: account.color || '#2563eb' }}
                  >
                    <Landmark size={18} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-800 dark:text-white">{account.name}</h3>
                    <p className="text-xs text-gray-500 dark:text-slate-400">Banka Hesabı</p>
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
          <Landmark size={48} className="mx-auto text-gray-300 dark:text-slate-600 mb-4" />
          <p className="text-gray-500 dark:text-slate-400">Henüz hesap eklemediniz</p>
          <button onClick={() => setModalOpen(true)} className="mt-4 px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-medium">
            İlk Hesabınızı Ekleyin
          </button>
        </div>
      )}

      <Modal
        isOpen={modalOpen}
        onClose={() => { setModalOpen(false); resetForm(); }}
        title={editingAccount ? 'Hesap Düzenle' : 'Yeni Banka Hesabı'}
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
                  className={`w-8 h-8 rounded-full transition-transform ${form.color === color ? 'scale-125 ring-2 ring-offset-2 ring-gray-400 dark:ring-gray-600' : ''}`}
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
