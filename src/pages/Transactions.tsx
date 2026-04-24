import { useState } from 'react';
import { useTransactions, useAccounts, useCategories, useCreateTransaction, useDeleteTransaction } from '../hooks/useSupabase';
import { formatCurrency, formatDate } from '../lib/utils';
import { Plus, Trash2, ArrowUpRight, ArrowDownRight, ArrowLeftRight } from 'lucide-react';
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
  };

  const filteredTransactions = transactions?.filter((tx) =>
    filterType === 'all' ? true : tx.type === filterType
  );

  const getTypeIcon = (type: TransactionType) => {
    switch (type) {
      case 'income': return <ArrowUpRight size={18} className="text-emerald-500" />;
      case 'expense': return <ArrowDownRight size={18} className="text-red-500" />;
      case 'transfer': return <ArrowLeftRight size={18} className="text-blue-500" />;
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
    return <div className="text-center py-8">Yükleniyor...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="section-title">İşlemler</h1>
          <p className="text-slate-500 dark:text-slate-400">Tüm gelir ve gider işlemleriniz</p>
        </div>
        <button
          onClick={() => setModalOpen(true)}
          className="btn btn-primary"
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
            className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
              filterType === type
                ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700'
            }`}
          >
            {type === 'all' ? 'Tümü' : getTypeLabel(type)}
          </button>
        ))}
      </div>

      {/* Transactions List */}
      <div className="card card-light dark:card-dark">
        <div className="space-y-2">
          {filteredTransactions?.length === 0 ? (
            <p className="text-center py-8 text-slate-500 dark:text-slate-400">Henüz işlem yok</p>
          ) : (
            filteredTransactions?.map((tx) => (
              <div
                key={tx.id}
                className="flex items-center justify-between p-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-700">
                    {getTypeIcon(tx.type)}
                  </div>
                  <div>
                    <p className="font-medium">{tx.description || tx.accounts?.name}</p>
                    <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
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
                  <span className={`font-semibold ${
                    tx.type === 'income' ? 'text-emerald-600 dark:text-emerald-400' : 
                    tx.type === 'expense' ? 'text-red-600 dark:text-red-400' : 'text-blue-600 dark:text-blue-400'
                  }`}>
                    {tx.type === 'income' ? '+' : tx.type === 'expense' ? '-' : ''}
                    {formatCurrency(tx.amount, tx.currency)}
                  </span>
                  <button
                    onClick={() => { if (confirm('Bu işlemi silmek istediğinize emin misiniz?')) deleteTransaction.mutateAsync(tx.id); }}
                    className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500 opacity-0 group-hover:opacity-100"
                  >
                    <Trash2 size={16} />
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
            <label className="label">İşlem Tipi</label>
            <div className="grid grid-cols-3 gap-2">
              {(['income', 'expense', 'transfer'] as TransactionType[]).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setForm({ ...form, type })}
                  className={`p-2 rounded-lg border text-sm font-medium transition-all ${
                    form.type === type
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                      : 'border-slate-200 dark:border-slate-700'
                  }`}
                >
                  {getTypeLabel(type)}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="label">Hesap</label>
            <select
              value={form.account_id}
              onChange={(e) => setForm({ ...form, account_id: e.target.value })}
              className="input"
              required
            >
              <option value="">Hesap seçin</option>
              {accounts?.map((acc) => (
                <option key={acc.id} value={acc.id}>{acc.name} ({acc.currency})</option>
              ))}
            </select>
          </div>

          <div>
            <label className="label">Kategori</label>
            <select
              value={form.category_id}
              onChange={(e) => setForm({ ...form, category_id: e.target.value })}
              className="input"
            >
              <option value="">Kategori seçin (isteğe bağlı)</option>
              {categories?.filter(c => c.type === form.type).map((cat) => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Tutar</label>
              <input
                type="number"
                step="0.01"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: parseFloat(e.target.value) || 0 })}
                className="input"
                required
              />
            </div>
            <div>
              <label className="label">Para Birimi</label>
              <select
                value={form.currency}
                onChange={(e) => setForm({ ...form, currency: e.target.value as CurrencyCode })}
                className="input"
              >
                {['TRY', 'USD', 'EUR', 'GBP', 'CHF', 'JPY'].map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="label">Açıklama</label>
            <input
              type="text"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="input"
              placeholder="İşlem açıklaması"
            />
          </div>

          <div>
            <label className="label">Tarih</label>
            <input
              type="date"
              value={form.transaction_date}
              onChange={(e) => setForm({ ...form, transaction_date: e.target.value })}
              className="input"
              required
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setModalOpen(false)} className="btn btn-secondary flex-1">
              İptal
            </button>
            <button type="submit" className="btn btn-primary flex-1">
              Kaydet
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
