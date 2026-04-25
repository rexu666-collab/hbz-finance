import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { useCreditCards, useCreateCreditCard, useUpdateCreditCard, useDeleteCreditCard } from '../hooks/useSupabase';
import { formatTRY } from '../lib/utils';
import { Plus, Pencil, Trash2, CreditCard } from 'lucide-react';
import Modal from '../components/Modal';

// Local bank logo files in /public/bank-logos/
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
  return '#ef4444';
}

function BankLogo({ bankName }: { bankName: string }) {
  const [error, setError] = useState(false);
  const path = getBankLogoPath(bankName);

  if (path && !error) {
    return (
      <img
        src={path}
        alt={bankName}
        className="w-12 h-12 object-contain rounded-lg bg-white dark:bg-white p-0.5 shadow-lg shrink-0"
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

export default function CreditCards() {
  const { user } = useAuth();
  const { addToast } = useToast();
  const { data: cards, isLoading } = useCreditCards();
  const createCard = useCreateCreditCard();
  const updateCard = useUpdateCreditCard();
  const deleteCard = useDeleteCreditCard();

  const [modalOpen, setModalOpen] = useState(false);
  const [editingCard, setEditingCard] = useState<any>(null);
  const [form, setForm] = useState({
    name: '',
    bank_name: '',
    card_last_four: '',
    credit_limit: 0,
    current_debt: 0,
    statement_date: undefined as number | undefined,
    due_date: undefined as number | undefined,
  });

  const resetForm = () => {
    setForm({
      name: '', bank_name: '', card_last_four: '', credit_limit: 0, current_debt: 0,
      statement_date: undefined, due_date: undefined,
    });
    setEditingCard(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) {
      addToast('Oturum bulunamadı. Lütfen tekrar giriş yapın.', 'error');
      return;
    }
    try {
      const color = getBankColor(form.bank_name || form.name);
      const data: any = {
        ...form,
        user_id: user.id,
        card_last_four: form.card_last_four || null,
        bank_name: form.bank_name || null,
        statement_date: form.statement_date || null,
        due_date: form.due_date || null,
        color,
        icon: 'credit-card',
      };
      if (editingCard) {
        await updateCard.mutateAsync({ id: editingCard.id, ...data });
        addToast('Kredi kartı güncellendi!', 'success');
      } else {
        await createCard.mutateAsync(data);
        addToast('Kredi kartı eklendi!', 'success');
      }
      setModalOpen(false);
      resetForm();
    } catch (err: any) {
      console.error('Credit card error:', err);
      addToast('Hata: ' + (err?.message || 'Kredi kartı eklenemedi'), 'error');
    }
  };

  const handleEdit = (card: any) => {
    setEditingCard(card);
    setForm({
      name: card.name,
      bank_name: card.bank_name || '',
      card_last_four: card.card_last_four || '',
      credit_limit: card.credit_limit,
      current_debt: card.current_debt,
      statement_date: card.statement_date ?? undefined,
      due_date: card.due_date ?? undefined,
    });
    setModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Bu kredi kartını silmek istediğinize emin misiniz?')) {
      try {
        await deleteCard.mutateAsync(id);
        addToast('Kredi kartı silindi!', 'success');
      } catch (err: any) {
        addToast('Silme hatası: ' + err.message, 'error');
      }
    }
  };

  const totalLimit = cards?.reduce((sum, c) => sum + c.credit_limit, 0) || 0;
  const totalDebt = cards?.reduce((sum, c) => sum + c.current_debt, 0) || 0;
  const totalAvailable = totalLimit - totalDebt;
  const utilizationRate = totalLimit > 0 ? (totalDebt / totalLimit) * 100 : 0;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-gray-300 dark:bg-slate-700 rounded-lg skeleton" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-24 bg-gray-300 dark:bg-slate-700 rounded-2xl skeleton" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Kredi Kartlarım</h1>
          <p className="text-gray-500 dark:text-slate-400 text-sm mt-0.5">Limit ve borç takibi</p>
        </div>
        <button
          onClick={() => { resetForm(); setModalOpen(true); }}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-medium hover:from-indigo-600 hover:to-purple-700 transition-all shadow-lg shadow-indigo-500/25"
        >
          <Plus size={18} />
          <span className="hidden sm:inline">Kart Ekle</span>
        </button>
      </div>

      {/* Summary Cards */}
      {cards && cards.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <SummaryCard label="Toplam Limit" value={formatTRY(totalLimit)} />
          <SummaryCard label="Güncel Borç" value={formatTRY(totalDebt)} valueClass="text-red-600 dark:text-red-400" />
          <SummaryCard label="Kullanılabilir" value={formatTRY(totalAvailable)} valueClass="text-emerald-600 dark:text-emerald-400" />
          <SummaryCard label="Kullanım Oranı" value={`%${utilizationRate.toFixed(1)}`} valueClass={utilizationRate > 80 ? 'text-red-600 dark:text-red-400' : utilizationRate > 50 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'} />
        </div>
      )}

      {/* Cards List */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {cards?.map((card) => {
          const available = card.credit_limit - card.current_debt;
          const pct = card.credit_limit > 0 ? (card.current_debt / card.credit_limit) * 100 : 0;
          return (
            <div key={card.id} className="bg-gray-100 dark:bg-slate-800 rounded-2xl p-5 border border-gray-300 dark:border-slate-700 shadow-sm card-hover group">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <BankLogo bankName={card.bank_name || card.name} />
                  <div>
                    <h3 className="font-semibold text-gray-800 dark:text-white">{card.name}</h3>
                    <p className="text-xs text-gray-500 dark:text-slate-400">
                      {card.bank_name || 'Banka belirtilmemiş'}
                      {card.card_last_four ? ` • **** ${card.card_last_four}` : ''}
                    </p>
                  </div>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => handleEdit(card)}
                    className="p-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-slate-700 text-gray-400 transition-colors"
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    onClick={() => handleDelete(card.id)}
                    className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-400 transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              {/* Progress bar */}
              <div className="mb-4">
                <div className="h-2 bg-gray-200 dark:bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${Math.min(pct, 100)}%`,
                      backgroundColor: pct > 80 ? '#ef4444' : pct > 50 ? '#f59e0b' : '#10b981',
                    }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <p className="text-[10px] text-gray-500 dark:text-slate-400 uppercase tracking-wider">Limit</p>
                  <p className="text-sm font-bold text-gray-800 dark:text-white">{formatTRY(card.credit_limit)}</p>
                </div>
                <div>
                  <p className="text-[10px] text-gray-500 dark:text-slate-400 uppercase tracking-wider">Borç</p>
                  <p className="text-sm font-bold text-red-600 dark:text-red-400">{formatTRY(card.current_debt)}</p>
                </div>
                <div>
                  <p className="text-[10px] text-gray-500 dark:text-slate-400 uppercase tracking-wider">Kalan</p>
                  <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{formatTRY(available)}</p>
                </div>
              </div>

              {(card.statement_date || card.due_date) && (
                <div className="flex gap-4 mt-3 pt-3 border-t border-gray-200 dark:border-slate-700">
                  {card.statement_date && (
                    <span className="text-[11px] text-gray-500 dark:text-slate-400">
                      Hesap kesim: <span className="font-medium">{card.statement_date}</span>
                    </span>
                  )}
                  {card.due_date && (
                    <span className="text-[11px] text-gray-500 dark:text-slate-400">
                      Son ödeme: <span className="font-medium">{card.due_date}</span>
                    </span>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {cards?.length === 0 && (
        <div className="text-center py-16 bg-gray-100 dark:bg-slate-800 rounded-2xl border border-gray-300 dark:border-slate-700 border-dashed">
          <CreditCard size={48} className="mx-auto text-gray-300 dark:text-slate-600 mb-4" />
          <p className="text-gray-500 dark:text-slate-400">Henüz kredi kartı eklemediniz</p>
          <button onClick={() => setModalOpen(true)} className="mt-4 px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-medium">
            İlk Kartınızı Ekleyin
          </button>
        </div>
      )}

      {/* Add/Edit Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => { setModalOpen(false); resetForm(); }}
        title={editingCard ? 'Kredi Kartı Düzenle' : 'Yeni Kredi Kartı'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1.5">Kart Adı</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-slate-700 bg-gray-100 dark:bg-slate-800 text-gray-800 dark:text-white outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all"
              placeholder="Örn: Bonus Card"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1.5">Banka</label>
              <input
                type="text"
                value={form.bank_name}
                onChange={(e) => setForm({ ...form, bank_name: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-slate-700 bg-gray-100 dark:bg-slate-800 text-gray-800 dark:text-white outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all"
                placeholder="Örn: Garanti"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1.5">Son 4 Hane</label>
              <input
                type="text"
                maxLength={4}
                value={form.card_last_four}
                onChange={(e) => setForm({ ...form, card_last_four: e.target.value.replace(/\D/g, '') })}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-slate-700 bg-gray-100 dark:bg-slate-800 text-gray-800 dark:text-white outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all"
                placeholder="1234"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1.5">Limit (TL)</label>
              <input
                type="number"
                step="0.01"
                value={form.credit_limit}
                onChange={(e) => setForm({ ...form, credit_limit: parseFloat(e.target.value) || 0 })}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-slate-700 bg-gray-100 dark:bg-slate-800 text-gray-800 dark:text-white outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1.5">Güncel Borç (TL)</label>
              <input
                type="number"
                step="0.01"
                value={form.current_debt}
                onChange={(e) => setForm({ ...form, current_debt: parseFloat(e.target.value) || 0 })}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-slate-700 bg-gray-100 dark:bg-slate-800 text-gray-800 dark:text-white outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1.5">Hesap Kesim Günü</label>
              <input
                type="number"
                min={1}
                max={31}
                value={form.statement_date || ''}
                onChange={(e) => setForm({ ...form, statement_date: e.target.value ? parseInt(e.target.value) : undefined })}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-slate-700 bg-gray-100 dark:bg-slate-800 text-gray-800 dark:text-white outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all"
                placeholder="Örn: 15"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1.5">Son Ödeme Günü</label>
              <input
                type="number"
                min={1}
                max={31}
                value={form.due_date || ''}
                onChange={(e) => setForm({ ...form, due_date: e.target.value ? parseInt(e.target.value) : undefined })}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-slate-700 bg-gray-100 dark:bg-slate-800 text-gray-800 dark:text-white outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all"
                placeholder="Örn: 25"
              />
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setModalOpen(false)} className="flex-1 px-4 py-2.5 rounded-xl border border-gray-300 dark:border-slate-700 text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors font-medium">
              İptal
            </button>
            <button type="submit" className="flex-1 px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-medium hover:from-indigo-600 hover:to-purple-700 transition-all shadow-lg shadow-indigo-500/25">
              {editingCard ? 'Güncelle' : 'Kaydet'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

function SummaryCard({ label, value, valueClass = '' }: { label: string; value: string; valueClass?: string }) {
  return (
    <div className="bg-gray-100 dark:bg-slate-800 rounded-2xl p-4 border border-gray-300 dark:border-slate-700 shadow-sm">
      <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">{label}</p>
      <p className={`text-lg font-bold mt-1 ${valueClass || 'text-gray-800 dark:text-white'}`}>{value}</p>
    </div>
  );
}
