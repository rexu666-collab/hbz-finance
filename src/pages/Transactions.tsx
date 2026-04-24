import { useState } from 'react';
import { useTransactions, useAccounts, useCategories, useCreateTransaction, useDeleteTransaction } from '../hooks/useSupabase';
import { formatCurrency, formatDate } from '../lib/utils';
import { Plus, Trash2, ArrowUpRight, ArrowDownRight, ArrowLeftRight, Filter } from 'lucide-react';
import Modal from '../components/Modal';
import type { TransactionType, CurrencyCode } from '../types';

export default function Transactions() {
  const { data: transactions, isLoading } = useTransactions();
  const { data: accounts } = useAccounts();
  const { data: categories } = useCategories();
  const createTransaction = useCreateTransaction();
  const deleteTransaction = useDeleteTransaction();

  const [modalOpen, setModalOpen] = useState(false);
  const [filterType, setFilterType] = useState<TransactionType | 'all'>('all');
  const [form, setForm] = useState({
    account_id: '',
    type: 'expense' as TransactionType,
    category_id: '',
    amount: 0,
    currency: 'TRY' as CurrencyCode,
    description: '',
    transaction_date: new Date().toISOString().split('T')[0],
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createTransaction.mutateAsync(form);
      setModalOpen(false);
      setForm({
        account_id: '',
        type: 'expense',
        category_id: '',
        amount: 0,
        currency: 'TRY',
        description: '',
        transaction_date: new Date().toISOString().split('T')[0],
      });
    } catch (err: any) {
      alert('Hata: ' + (err.message || 'İşlem eklenemedi'));
    }
  };

  const filteredTransactions = transactions?.filter((tx) =>
    filterType === 'all' ? true : tx.type === filterType
  );

  const getTypeIcon = (type: TransactionType) => {
    switch (type) {
      case 'income': return <ArrowUpRight size={16} className="text-emerald-500" />;
      case 'expense': return <ArrowDownRight size={16} className="text-red-500" />;
      case 'transfer': return <ArrowLeftRight size={16} className="text-indigo-500" />;
    }
  };

  const getTypeLabel = (type: TransactionType) => {
    switch (type) {
      case 'income': return 'Gelir';
      case 'expense': return 'Gider';
      case 'transfer': return 'Transfer';
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-slate-200 dark:bg-slate-700 rounded-lg skeleton" />
        <div className="space-y-2">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-16 bg-slate-200 dark:bg-slate-700 rounded-xl skeleton" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white">İşlemler</h1>
          <p className="text-gray-500 dark:text-slate-400 text-sm mt-0.5">Tüm gelir ve gider işlemleriniz</p>
        </div>
        <button
          onClick={() => setModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-medium hover:from-indigo-600 hover:to-purple-700 transition-all shadow-lg shadow-indigo-500/25"
        >
          <Plus size={18} />
          <span>Yeni İşlem</span>
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {(['all', 'income', 'expense', 'transfer'] as const).map((type) => (
          <button
            key={type}
            onClick={() => setFilterType(type)}
            className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
              filterType === type
                ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800'
                : 'bg-gray-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-gray-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
            }`}
          >
            {type === 'all' ? 'Tümü' : getTypeLabel(type)}
          </button>
        ))}
      </div>

      {/* Transactions List */}
      <div className="bg-gray-50 dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 shadow-sm overflow-hidden">
        <div className="divide-y divide-gray-100 dark:divide-slate-700">
          {filteredTransactions?.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <Filter size={32} className="mx-auto mb-2 opacity-50" />
              <p>Henüz işlem yok</p>
            </div>
          ) : (
            filteredTransactions?.map((tx) => (
              <div
                key={tx.id}
                className="flex items-center justify-between p-4 hover:bg-gray-100 dark:hover:bg-slate-700/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-xl ${
                    tx.type === 'income' ? 'bg-emerald-100 dark:bg-emerald-900/20' : 
                    tx.type === 'expense' ? 'bg-red-100 dark:bg-red-900/20' : 
                    'bg-indigo-100 dark:bg-indigo-900/20'
                  }`}>
                    {getTypeIcon(tx.type)}
                  </div>
                  <div>
                    <p className="font-medium text-sm text-gray-800 dark:text-white">{tx.description || tx.accounts?.name}</p>
                    <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-slate-400 mt-0.5">
                      <span>{tx.accounts?.name}</span>
                      <span>•</span>
                      <span>{formatDate(tx.transaction_date)}</span>
                      {tx.categories?.name && (
                        <>
                          <span>•</span>
                          <span>{tx.categories.name}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`font-semibold text-sm ${
                    tx.type === 'income' ? 'text-emerald-600 dark:text-emerald-400' : 
                    tx.type === 'expense' ? 'text-red-600 dark:text-red-400' : 'text-indigo-600 dark:text-indigo-400'
                  }`}>
                    {tx.type === 'income' ? '+' : tx.type === 'expense' ? '-' : ''}
                    {formatCurrency(tx.amount, tx.currency)}
                  </span>
                  <button
                    onClick={() => { if (confirm('Bu işlemi silmek istediğinize emin misiniz?')) deleteTransaction.mutateAsync(tx.id); }}
                    className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Yeni İşlem"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1.5">İşlem Tipi</label>
            <div className="grid grid-cols-3 gap-2">
              {(['income', 'expense', 'transfer'] as TransactionType[]).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setForm({ ...form, type })}
                  className={`p-3 rounded-xl border text-sm font-medium transition-all ${
                    form.type === type
                      ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400'
                      : 'border-gray-200 dark:border-slate-700 hover:bg-gray-100 dark:hover:bg-slate-800'
                  }`}
                >
                  {getTypeLabel(type)}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1.5">Hesap</label>
            <select
              value={form.account_id}
              onChange={(e) => setForm({ ...form, account_id: e.target.value })}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 text-gray-800 dark:text-white outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all"
              required
            >
              <option value="">Hesap seçin</option>
              {accounts?.map((acc) => (
                <option key={acc.id} value={acc.id}>{acc.name} ({acc.currency})</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1.5">Kategori</label>
            <select
              value={form.category_id}
              onChange={(e) => setForm({ ...form, category_id: e.target.value })}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 text-gray-800 dark:text-white outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all"
            >
              <option value="">Kategori seçin (isteğe bağlı)</option>
              {categories?.filter(c => c.type === form.type).map((cat) => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1.5">Tutar</label>
              <input
                type="number"
                step="0.01"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: parseFloat(e.target.value) || 0 })}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 text-gray-800 dark:text-white outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1.5">Para Birimi</label>
              <select
                value={form.currency}
                onChange={(e) => setForm({ ...form, currency: e.target.value as CurrencyCode })}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 text-gray-800 dark:text-white outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all"
              >
                {['TRY', 'USD', 'EUR', 'GBP', 'CHF', 'JPY'].map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1.5">Açıklama</label>
            <input
              type="text"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 text-gray-800 dark:text-white outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all"
              placeholder="İşlem açıklaması"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1.5">Tarih</label>
            <input
              type="date"
              value={form.transaction_date}
              onChange={(e) => setForm({ ...form, transaction_date: e.target.value })}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 text-gray-800 dark:text-white outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all"
              required
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setModalOpen(false)} className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors font-medium">
              İptal
            </button>
            <button type="submit" className="flex-1 px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-medium hover:from-indigo-600 hover:to-purple-700 transition-all shadow-lg shadow-indigo-500/25">
              Kaydet
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
