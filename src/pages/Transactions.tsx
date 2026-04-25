import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { useTransactions, useAccounts, useCategories, useCreditCards, useCreateTransaction, useUpdateTransaction, useDeleteTransaction, useCreateCategory, useDeleteCategory } from '../hooks/useSupabase';
import { formatCurrency, formatDate, formatTRY } from '../lib/utils';
import { Mask } from '../contexts/SensitiveContext';
import Skeleton from '../components/Skeleton';
import EmptyState from '../components/EmptyState';
import { Plus, Trash2, Pencil, ArrowUpRight, ArrowDownRight, ArrowLeftRight, Filter, ChevronLeft, ChevronRight, CreditCard, Wallet, Landmark, Repeat } from 'lucide-react';
import Modal from '../components/Modal';
import type { TransactionType, CurrencyCode, PaymentMethod } from '../types';

const PAYMENT_METHODS: { value: PaymentMethod; label: string; icon: React.ReactNode }[] = [
  { value: 'havale', label: 'Havale/EFT', icon: <Landmark size={14} /> },
  { value: 'credit_card', label: 'Kredi Kartı', icon: <CreditCard size={14} /> },
  { value: 'cash', label: 'Nakit', icon: <Wallet size={14} /> },
  { value: 'other', label: 'Diğer', icon: <ArrowLeftRight size={14} /> },
];

export default function Transactions() {
  const { user } = useAuth();
  const { addToast } = useToast();
  const { data: transactions, isLoading } = useTransactions();
  const { data: accounts } = useAccounts();
  const { data: categories } = useCategories();
  const { data: creditCards } = useCreditCards();
  const createTransaction = useCreateTransaction();
  const updateTransaction = useUpdateTransaction();
  const deleteTransaction = useDeleteTransaction();
  const createCategory = useCreateCategory();
  const deleteCategory = useDeleteCategory();

  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');

  const [modalOpen, setModalOpen] = useState(false);
  const [editingTx, setEditingTx] = useState<any>(null);
  const [filterType, setFilterType] = useState<TransactionType | 'all'>('all');
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [form, setForm] = useState({
    account_id: '',
    type: 'expense' as TransactionType,
    category_id: '',
    amount: 0,
    currency: 'TRY' as CurrencyCode,
    description: '',
    payment_method: 'other' as PaymentMethod,
    credit_card_id: '',
    installment_count: 1,
    is_recurring: false,
    recurring_interval: 'monthly' as 'monthly' | 'weekly' | 'yearly',
    transaction_date: new Date().toISOString().split('T')[0],
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) {
      addToast('Oturum bulunamadı. Lütfen tekrar giriş yapın.', 'error');
      return;
    }
    try {
      const payload = {
        ...form,
        account_id: form.account_id || null,
        category_id: form.category_id || null,
        credit_card_id: form.credit_card_id || null,
        installment_number: 1,
        parent_transaction_id: null,
        is_recurring: form.is_recurring,
        recurring_interval: form.is_recurring ? form.recurring_interval : null,
        recurring_day: form.is_recurring ? parseInt(form.transaction_date.split('-')[2]) : null,
      };
      if (editingTx) {
        await updateTransaction.mutateAsync({ id: editingTx.id, ...payload });
        addToast('İşlem güncellendi!', 'success');
      } else {
        await createTransaction.mutateAsync({ ...payload, user_id: user.id });
        addToast('İşlem eklendi!', 'success');
      }
      setModalOpen(false);
      setEditingTx(null);
      setForm({
        account_id: '',
        type: 'expense',
        category_id: '',
        amount: 0,
        currency: 'TRY',
        description: '',
        payment_method: 'other',
        credit_card_id: '',
        installment_count: 1,
        is_recurring: false,
        recurring_interval: 'monthly',
        transaction_date: new Date().toISOString().split('T')[0],
      });
    } catch (err: any) {
      console.error('Transaction error:', err);
      addToast('Hata: ' + (err?.message || 'İşlem eklenemedi'), 'error');
    }
  };

  const handleEdit = (tx: any) => {
    setEditingTx(tx);
    setForm({
      account_id: tx.account_id,
      type: tx.type,
      category_id: tx.category_id || '',
      amount: tx.amount,
      currency: tx.currency,
      description: tx.description || '',
      payment_method: (tx.payment_method === 'eft' ? 'havale' : tx.payment_method) || 'other',
      credit_card_id: tx.credit_card_id || '',
      installment_count: tx.installment_count || 1,
      is_recurring: tx.is_recurring || false,
      recurring_interval: tx.recurring_interval || 'monthly',
      transaction_date: tx.transaction_date,
    });
    setModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Bu işlemi silmek istediğinize emin misiniz?')) {
      try {
        await deleteTransaction.mutateAsync(id);
        addToast('İşlem silindi!', 'success');
      } catch (err: any) {
        addToast('Silme hatası: ' + err.message, 'error');
      }
    }
  };

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryName.trim() || !user?.id) return;
    try {
      await createCategory.mutateAsync({
        name: newCategoryName.trim(),
        type: form.type === 'transfer' ? 'expense' : form.type,
        user_id: user.id,
        color: '#6366f1',
        icon: 'tag',
        is_default: false,
      });
      addToast('Kategori eklendi!', 'success');
      setNewCategoryName('');
    } catch (err: any) {
      addToast('Hata: ' + (err?.message || 'Kategori eklenemedi'), 'error');
    }
  };

  const handleDeleteCategory = async (id: string, name: string) => {
    if (confirm(`"${name}" kategorisini silmek istediğinize emin misiniz?`)) {
      try {
        await deleteCategory.mutateAsync(id);
        addToast('Kategori silindi!', 'success');
        if (form.category_id === id) setForm({ ...form, category_id: '' });
      } catch (err: any) {
        addToast('Silme hatası: ' + err.message, 'error');
      }
    }
  };

  const monthStart = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
  const monthEnd = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);

  const filteredTransactions = transactions?.filter((tx) => {
    const txDate = new Date(tx.transaction_date);
    const inMonth = txDate >= monthStart && txDate <= monthEnd;
    const inType = filterType === 'all' ? true : tx.type === filterType;
    return inMonth && inType;
  });

  // Monthly summary
  const monthIncome = filteredTransactions?.filter(tx => tx.type === 'income').reduce((s, tx) => s + tx.amount, 0) || 0;
  const monthExpense = filteredTransactions?.filter(tx => tx.type === 'expense').reduce((s, tx) => s + tx.amount, 0) || 0;
  const monthNet = monthIncome - monthExpense;

  const monthLabel = currentMonth.toLocaleDateString('tr-TR', { year: 'numeric', month: 'long' });

  const goPrevMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  const goNextMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));

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
        <Skeleton className="h-8 w-48" />
        <div className="space-y-2">
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="h-16 rounded-xl" />
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
          onClick={() => { setEditingTx(null); setModalOpen(true); }}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-medium hover:from-indigo-600 hover:to-purple-700 transition-all shadow-lg shadow-indigo-500/25"
        >
          <Plus size={18} />
          <span>Yeni İşlem</span>
        </button>
      </div>

      {/* Month Navigation */}
      <div className="flex items-center justify-between bg-gray-100 dark:bg-slate-800 rounded-2xl border border-gray-300 dark:border-slate-700 p-3">
        <button onClick={goPrevMonth} className="p-2 rounded-xl hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors text-gray-600 dark:text-slate-400">
          <ChevronLeft size={20} />
        </button>
        <span className="font-semibold text-gray-800 dark:text-white">{monthLabel}</span>
        <button onClick={goNextMonth} className="p-2 rounded-xl hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors text-gray-600 dark:text-slate-400">
          <ChevronRight size={20} />
        </button>
      </div>

      {/* Monthly Summary */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-emerald-50 dark:bg-emerald-900/10 rounded-2xl p-4 border border-emerald-200 dark:border-emerald-800">
          <p className="text-xs text-emerald-600 dark:text-emerald-400 uppercase tracking-wider mb-1">Gelir</p>
          <p className="text-xl font-bold text-emerald-700 dark:text-emerald-300">+<Mask>{formatTRY(monthIncome)}</Mask></p>
        </div>
        <div className="bg-red-50 dark:bg-red-900/10 rounded-2xl p-4 border border-red-200 dark:border-red-800">
          <p className="text-xs text-red-600 dark:text-red-400 uppercase tracking-wider mb-1">Gider</p>
          <p className="text-xl font-bold text-red-700 dark:text-red-300">-<Mask>{formatTRY(monthExpense)}</Mask></p>
        </div>
        <div className={`${monthNet >= 0 ? 'bg-blue-50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-800' : 'bg-orange-50 dark:bg-orange-900/10 border-orange-200 dark:border-orange-800'} rounded-2xl p-4 border`}>
          <p className={`text-xs uppercase tracking-wider mb-1 ${monthNet >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-orange-600 dark:text-orange-400'}`}>Net</p>
          <p className={`text-xl font-bold ${monthNet >= 0 ? 'text-blue-700 dark:text-blue-300' : 'text-orange-700 dark:text-orange-300'}`}>
            <Mask>{monthNet >= 0 ? '+' : ''}{formatTRY(monthNet)}</Mask>
          </p>
        </div>
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
                : 'bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-400 border border-gray-300 dark:border-slate-700 hover:border-gray-400 dark:hover:border-slate-600'
            }`}
          >
            {type === 'all' ? 'Tümü' : getTypeLabel(type)}
          </button>
        ))}
      </div>

      {/* Transactions List */}
      <div className="bg-gray-100 dark:bg-slate-800 rounded-2xl border border-gray-300 dark:border-slate-700 shadow-sm overflow-hidden">
        <div className="divide-y divide-gray-100 dark:divide-slate-700">
          {filteredTransactions?.length === 0 ? (
            <EmptyState icon={Filter} title="Henüz işlem yok" description="Bu ay için kaydedilmiş işlem bulunmuyor." />
          ) : (
            filteredTransactions?.map((tx) => (
              <div
                key={tx.id}
                className="flex items-center justify-between p-3 sm:p-4 hover:bg-gray-100 dark:hover:bg-slate-700/50 transition-colors group gap-2 min-w-0"
              >
                <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                  <div className={`p-2 rounded-xl shrink-0 ${
                    tx.type === 'income' ? 'bg-emerald-100 dark:bg-emerald-900/20' : 
                    tx.type === 'expense' ? 'bg-red-100 dark:bg-red-900/20' : 
                    'bg-indigo-100 dark:bg-indigo-900/20'
                  }`}>
                    {getTypeIcon(tx.type)}
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-sm text-gray-800 dark:text-white truncate">
                      {tx.description || tx.accounts?.name}
                      {tx.installment_count > 1 && (
                        <span className="ml-1 text-[10px] px-1.5 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400">
                          {tx.installment_number}/{tx.installment_count}
                        </span>
                      )}
                      {tx.is_recurring && (
                        <Repeat size={12} className="inline ml-1 text-purple-500 dark:text-purple-400" />
                      )}
                    </p>
                    <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-slate-400 mt-0.5 truncate">
                      {tx.accounts?.name && <span className="truncate">{tx.accounts.name}</span>}
                      {tx.credit_cards?.name && (
                        <>
                          {tx.accounts?.name && <span className="shrink-0">•</span>}
                          <span className="truncate text-indigo-500 dark:text-indigo-400">{tx.credit_cards.name}</span>
                        </>
                      )}
                      <span className="shrink-0">•</span>
                      <span className="shrink-0">{formatDate(tx.transaction_date)}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                  <span className={`font-semibold text-sm whitespace-nowrap ${
                    tx.type === 'income' ? 'text-emerald-600 dark:text-emerald-400' : 
                    tx.type === 'expense' ? 'text-red-600 dark:text-red-400' : 'text-indigo-600 dark:text-indigo-400'
                  }`}>
                    {tx.type === 'income' ? '+' : tx.type === 'expense' ? '-' : ''}
                    {formatCurrency(tx.amount, tx.currency)}
                  </span>
                  <div className="hidden sm:flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => handleEdit(tx)}
                      className="p-1.5 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-900/20 text-indigo-400 transition-colors"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      onClick={() => handleDelete(tx.id)}
                      className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-400 transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <Modal
        isOpen={modalOpen}
        onClose={() => { setModalOpen(false); setEditingTx(null); }}
        title={editingTx ? 'İşlem Düzenle' : 'Yeni İşlem'}
      >
        <form onSubmit={handleSubmit} className="space-y-1.5">
          <div>
            <div className="grid grid-cols-3 gap-1">
              {(['income', 'expense', 'transfer'] as TransactionType[]).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setForm({ ...form, type })}
                  className={`py-1 px-1.5 rounded-md border text-[11px] font-medium transition-all ${
                    form.type === type
                      ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400'
                      : 'border-gray-300 dark:border-slate-700 hover:bg-gray-100 dark:hover:bg-slate-800'
                  }`}
                >
                  {getTypeLabel(type)}
                </button>
              ))}
            </div>
          </div>

          {form.payment_method === 'havale' && (
            <div>
              <select
                value={form.account_id}
                onChange={(e) => setForm({ ...form, account_id: e.target.value })}
                className="w-full px-3 py-1.5 rounded-lg border border-gray-300 dark:border-slate-700 bg-gray-100 dark:bg-slate-800 text-xs text-gray-800 dark:text-white outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all"
                required
              >
                <option value="">Hesap seçin</option>
                {accounts?.map((acc) => (
                  <option key={acc.id} value={acc.id}>{acc.name} ({acc.currency})</option>
                ))}
              </select>
            </div>
          )}

          <div>
            <div className="grid grid-cols-3 gap-1">
              {PAYMENT_METHODS.map((method) => (
                <button
                  key={method.value}
                  type="button"
                  onClick={() => setForm({ ...form, payment_method: method.value })}
                  className={`flex items-center justify-center gap-1 py-1 px-1 rounded-md border text-[10px] font-medium transition-all ${
                    form.payment_method === method.value
                      ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400'
                      : 'border-gray-300 dark:border-slate-700 hover:bg-gray-100 dark:hover:bg-slate-800'
                  }`}
                >
                  {method.icon}
                  <span>{method.label}</span>
                </button>
              ))}
            </div>
            {form.payment_method === 'credit_card' && (
              <>
                <div className="mt-1.5">
                  <select
                    value={form.credit_card_id}
                    onChange={(e) => setForm({ ...form, credit_card_id: e.target.value })}
                    className="w-full px-3 py-1.5 rounded-lg border border-gray-300 dark:border-slate-700 bg-gray-100 dark:bg-slate-800 text-xs text-gray-800 dark:text-white outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all"
                    required={form.payment_method === 'credit_card'}
                  >
                    <option value="">Kredi kartı seçin</option>
                    {creditCards?.map((card) => (
                      <option key={card.id} value={card.id}>{card.name} {card.card_last_four ? `(*${card.card_last_four})` : ''}</option>
                    ))}
                  </select>
                </div>
                <div className="mt-1.5 flex items-center gap-2">
                  <span className="text-[10px] text-gray-500 dark:text-slate-400">Taksit:</span>
                  <div className="flex gap-1">
                    {[1, 2, 3, 6, 9, 12].map((n) => (
                      <button
                        key={n}
                        type="button"
                        onClick={() => setForm({ ...form, installment_count: n })}
                        className={`px-2 py-0.5 rounded-md text-[10px] font-medium border transition-all ${
                          form.installment_count === n
                            ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400'
                            : 'border-gray-300 dark:border-slate-700 text-gray-600 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-800'
                        }`}
                      >
                        {n === 1 ? 'Tek' : `${n}`}
                      </button>
                    ))}
                  </div>
                </div>
                {form.installment_count > 1 && form.amount > 0 && (
                  <div className="mt-0.5 text-[10px] text-indigo-500 dark:text-indigo-400">
                    Aylık tutar: {formatCurrency(form.amount / form.installment_count, form.currency)} x {form.installment_count} ay
                  </div>
                )}
              </>
            )}
          </div>

          <div>
            <div className="flex items-center justify-between mb-0.5 px-0.5">
              <span className="text-[10px] font-medium text-gray-500 dark:text-slate-400">Kategori</span>
              <button
                type="button"
                onClick={() => setCategoryModalOpen(true)}
                className="text-[10px] text-indigo-500 hover:text-indigo-600 font-medium"
              >
                Yönet
              </button>
            </div>
            <select
              value={form.category_id}
              onChange={(e) => setForm({ ...form, category_id: e.target.value })}
              className="w-full px-3 py-1.5 rounded-lg border border-gray-300 dark:border-slate-700 bg-gray-100 dark:bg-slate-800 text-xs text-gray-800 dark:text-white outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all"
            >
              <option value="">Kategori seçin (isteğe bağlı)</option>
              {categories?.filter(c => c.type === form.type).map((cat) => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <input
                type="number"
                step="0.01"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: parseFloat(e.target.value) || 0 })}
                className="w-full px-3 py-1.5 rounded-lg border border-gray-300 dark:border-slate-700 bg-gray-100 dark:bg-slate-800 text-xs text-gray-800 dark:text-white outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all"
                placeholder="Tutar"
                required
              />
            </div>
            <div>
              <select
                value={form.currency}
                onChange={(e) => setForm({ ...form, currency: e.target.value as CurrencyCode })}
                className="w-full px-3 py-1.5 rounded-lg border border-gray-300 dark:border-slate-700 bg-gray-100 dark:bg-slate-800 text-xs text-gray-800 dark:text-white outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all"
              >
                {['TRY', 'USD', 'EUR', 'GBP', 'CHF', 'JPY'].map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <input
              type="text"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="w-full px-3 py-1.5 rounded-lg border border-gray-300 dark:border-slate-700 bg-gray-100 dark:bg-slate-800 text-xs text-gray-800 dark:text-white outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all"
              placeholder="Açıklama (isteğe bağlı)"
            />
          </div>

          <div>
            <input
              type="date"
              value={form.transaction_date}
              onChange={(e) => setForm({ ...form, transaction_date: e.target.value })}
              className="w-full px-3 py-1.5 rounded-lg border border-gray-300 dark:border-slate-700 bg-gray-100 dark:bg-slate-800 text-xs text-gray-800 dark:text-white outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all"
              required
            />
          </div>

          {form.type !== 'transfer' && (
            <div className="flex items-center justify-between px-1">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.is_recurring}
                  onChange={(e) => setForm({ ...form, is_recurring: e.target.checked })}
                  className="w-3.5 h-3.5 rounded border-gray-300 text-indigo-500 focus:ring-indigo-500"
                />
                <span className="text-[11px] text-gray-600 dark:text-slate-300">Tekrarlayan işlem</span>
              </label>
              {form.is_recurring && (
                <select
                  value={form.recurring_interval}
                  onChange={(e) => setForm({ ...form, recurring_interval: e.target.value as 'monthly' | 'weekly' | 'yearly' })}
                  className="px-2 py-0.5 rounded border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-[11px] text-gray-700 dark:text-slate-300 outline-none"
                >
                  <option value="monthly">Her ay</option>
                  <option value="weekly">Her hafta</option>
                  <option value="yearly">Her yıl</option>
                </select>
              )}
            </div>
          )}

          <div className="flex gap-2 pt-0.5">
            <button type="button" onClick={() => { setModalOpen(false); setEditingTx(null); }} className="flex-1 px-3 py-1.5 rounded-lg border border-gray-300 dark:border-slate-700 text-xs text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors font-medium">
              İptal
            </button>
            <button type="submit" className="flex-1 px-3 py-1.5 rounded-lg bg-gradient-to-r from-indigo-500 to-purple-600 text-xs text-white font-medium hover:from-indigo-600 hover:to-purple-700 transition-all shadow-lg shadow-indigo-500/25">
              {editingTx ? 'Güncelle' : 'Kaydet'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Category Manager Modal */}
      <Modal
        isOpen={categoryModalOpen}
        onClose={() => setCategoryModalOpen(false)}
        title="Kategorileri Yönet"
        size="sm"
      >
        <div className="space-y-4">
          <form onSubmit={handleAddCategory} className="flex gap-2">
            <input
              type="text"
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              placeholder="Yeni kategori adı"
              className="flex-1 px-3 py-2 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm text-gray-800 dark:text-white outline-none focus:border-indigo-500"
            />
            <button
              type="submit"
              disabled={!newCategoryName.trim()}
              className="px-4 py-2 rounded-lg bg-indigo-500 text-white text-sm font-medium hover:bg-indigo-600 disabled:opacity-50 transition-colors"
            >
              Ekle
            </button>
          </form>

          <div className="space-y-1.5 max-h-60 overflow-y-auto">
            <p className="text-xs font-medium text-gray-500 dark:text-slate-400 mb-1">
              {form.type === 'income' ? 'Gelir' : 'Gider'} Kategorileri
            </p>
            {categories?.filter(c => c.type === form.type && !c.is_default).length === 0 ? (
              <p className="text-sm text-gray-400 italic">Henüz özel kategori yok</p>
            ) : (
              categories?.filter(c => c.type === form.type && !c.is_default).map((cat) => (
                <div
                  key={cat.id}
                  className="flex items-center justify-between px-3 py-2 rounded-lg bg-gray-200/50 dark:bg-slate-700/50"
                >
                  <span className="text-sm text-gray-800 dark:text-white">{cat.name}</span>
                  <button
                    type="button"
                    onClick={() => handleDeleteCategory(cat.id, cat.name)}
                    className="p-1 rounded-md hover:bg-red-100 dark:hover:bg-red-900/30 text-red-400 hover:text-red-500 transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </Modal>
    </div>
  );
}
