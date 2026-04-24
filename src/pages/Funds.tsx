import { useState, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useFunds, useUserFunds, useCreateUserFund, useUpdateUserFund, useDeleteUserFund } from '../hooks/useSupabase';
import { formatTRY, formatPercent } from '../lib/utils';
import { Plus, Search, RefreshCw, Trash2, TrendingUp, Download } from 'lucide-react';
import Modal from '../components/Modal';

export default function Funds() {
  const { user } = useAuth();
  const { data: allFunds, isLoading: fundsLoading } = useFunds();
  const { data: userFunds, isLoading: userFundsLoading } = useUserFunds();
  const createUserFund = useCreateUserFund();
  const updateUserFund = useUpdateUserFund();
  const deleteUserFund = useDeleteUserFund();

  const [addModalOpen, setAddModalOpen] = useState(false);
  const [updateModalOpen, setUpdateModalOpen] = useState(false);
  const [selectedFund, setSelectedFund] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [newPrice, setNewPrice] = useState('');
  const [autoUpdating, setAutoUpdating] = useState<string | null>(null);
  const [form, setForm] = useState({
    fund_code: '',
    shares: 0,
    purchase_price: 0,
  });

  // Filter funds based on search
  const filteredFunds = useMemo(() => {
    if (!allFunds) return [];
    if (!searchQuery.trim()) return allFunds.slice(0, 10);
    return allFunds.filter((fund) =>
      fund.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      fund.name.toLowerCase().includes(searchQuery.toLowerCase())
    ).slice(0, 20);
  }, [allFunds, searchQuery]);

  const handleAddFund = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.fund_code) {
      alert('Lütfen bir fon seçin');
      return;
    }
    if (!user?.id) {
      alert('Oturum bulunamadı. Lütfen tekrar giriş yapın.');
      return;
    }
    try {
      await createUserFund.mutateAsync({ ...form, user_id: user.id });
      setAddModalOpen(false);
      setForm({ fund_code: '', shares: 0, purchase_price: 0 });
      setSearchQuery('');
    } catch (err: any) {
      console.error('Fund error:', err);
      alert('Hata: ' + (err?.message || err?.error_description || JSON.stringify(err) || 'Fon eklenemedi'));
    }
  };

  const handleUpdatePrice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedFund && newPrice) {
      try {
        await updateUserFund.mutateAsync({
          id: selectedFund.id,
          current_price: parseFloat(newPrice),
        });
        setUpdateModalOpen(false);
        setSelectedFund(null);
        setNewPrice('');
      } catch (err: any) {
        alert('Güncelleme hatası: ' + err.message);
      }
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Bu fonu portföyünüzden kaldırmak istediğinize emin misiniz?')) {
      try {
        await deleteUserFund.mutateAsync(id);
      } catch (err: any) {
        alert('Silme hatası: ' + err.message);
      }
    }
  };

  const handleAutoFetch = async (uf: any) => {
    setAutoUpdating(uf.id);
    try {
      const res = await fetch(`/api/fund-price?code=${encodeURIComponent(uf.fund_code)}`);
      const data = await res.json();
      if (!res.ok || !data.price) {
        throw new Error(data.error || 'Fiyat bulunamadı');
      }
      await updateUserFund.mutateAsync({
        id: uf.id,
        current_price: data.price,
      });
    } catch (err: any) {
      // Otomatik çekme başarısız olursa TEFAS sayfasını aç
      const tefasUrl = `https://www.tefas.gov.tr/FonAnaliz.aspx?FonKodu=${encodeURIComponent(uf.fund_code)}`;
      window.open(tefasUrl, '_blank', 'noopener,noreferrer');
      alert(
        `"${uf.fund_code}" fonu için otomatik fiyat çekilemedi.\n\n` +
        `TEFAS sayfası yeni sekmede açıldı.\n` +
        `Lütfen "Son Fiyat" değerini kopyalayıp "Manuel" butonu ile güncelleyin.`
      );
    } finally {
      setAutoUpdating(null);
    }
  };

  const totalValue = userFunds?.reduce((sum, uf) => sum + (uf.shares * uf.current_price), 0) || 0;
  const totalCost = userFunds?.reduce((sum, uf) => sum + (uf.shares * uf.purchase_price), 0) || 0;
  const totalProfit = totalValue - totalCost;
  const totalProfitPercent = totalCost > 0 ? (totalProfit / totalCost) * 100 : 0;

  const isLoading = fundsLoading || userFundsLoading;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-slate-200 dark:bg-slate-700 rounded-lg skeleton" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-24 bg-slate-200 dark:bg-slate-700 rounded-2xl skeleton" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Fon Portföyü</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-0.5">Yatırım fonlarınızı takip edin</p>
        </div>
        <button
          onClick={() => setAddModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-medium hover:from-indigo-600 hover:to-purple-700 transition-all shadow-lg shadow-indigo-500/25"
        >
          <Plus size={18} />
          <span>Fon Ekle</span>
        </button>
      </div>

      {/* Summary Cards */}
      {userFunds && userFunds.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <SummaryCard label="Toplam Değer" value={formatTRY(totalValue)} />
          <SummaryCard label="Maliyet" value={formatTRY(totalCost)} />
          <SummaryCard
            label="Kar/Zarar"
            value={formatTRY(totalProfit)}
            valueClass={totalProfit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}
          />
          <SummaryCard
            label="Getiri %"
            value={formatPercent(totalProfitPercent)}
            valueClass={totalProfitPercent >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}
          />
        </div>
      )}

      {/* Funds List */}
      <div className="space-y-4">
        {userFunds?.length === 0 ? (
          <div className="bg-gray-100 dark:bg-slate-800 rounded-2xl border border-gray-300 dark:border-slate-700 border-dashed text-center py-16">
            <TrendingUp size={48} className="mx-auto text-slate-300 dark:text-slate-600 mb-4" />
            <p className="text-gray-500 dark:text-gray-400">Henüz fon eklemediniz</p>
            <button onClick={() => setAddModalOpen(true)} className="mt-4 px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-medium">
              İlk Fonunuzu Ekleyin
            </button>
          </div>
        ) : (
          userFunds?.map((uf) => {
            const currentValue = uf.shares * uf.current_price;
            const costValue = uf.shares * uf.purchase_price;
            const profit = currentValue - costValue;
            const profitPercent = costValue > 0 ? (profit / costValue) * 100 : 0;
            const isProfit = profit >= 0;

            return (
              <div key={uf.id} className="bg-gray-100 dark:bg-slate-800 rounded-2xl p-5 border border-gray-300 dark:border-slate-700 shadow-sm card-hover">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="px-2.5 py-1 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 text-xs font-bold">
                        {uf.fund?.code || uf.fund_code}
                      </span>
                      <span className="text-sm text-gray-600 dark:text-slate-300">
                        {uf.fund?.name || 'Bilinmeyen Fon'}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-3">
                      <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">Lot</p>
                        <p className="font-bold text-gray-800 dark:text-white">{uf.shares}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">Alış</p>
                        <p className="font-bold text-gray-800 dark:text-white">{formatTRY(uf.purchase_price)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">Güncel</p>
                        <p className="font-bold text-gray-800 dark:text-white">{formatTRY(uf.current_price)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">Değer</p>
                        <p className="font-bold text-gray-800 dark:text-white">{formatTRY(currentValue)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 mt-3">
                      <span className={`text-sm font-bold ${isProfit ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                        {isProfit ? '+' : ''}{formatTRY(profit)} ({formatPercent(profitPercent)})
                      </span>
                      {uf.last_price_update && (
                        <span className="text-xs text-gray-400">
                          Son güncelleme: {new Date(uf.last_price_update).toLocaleDateString('tr-TR')}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleAutoFetch(uf)}
                      disabled={autoUpdating === uf.id}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-100 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 text-sm font-medium hover:bg-emerald-200 dark:hover:bg-emerald-900/30 transition-colors disabled:opacity-50"
                    >
                      <Download size={14} className={autoUpdating === uf.id ? 'animate-bounce' : ''} />
                      <span>{autoUpdating === uf.id ? 'Çekiliyor...' : 'Otomatik Çek'}</span>
                    </button>
                    <button
                      onClick={() => { setSelectedFund(uf); setNewPrice(uf.current_price.toString()); setUpdateModalOpen(true); }}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gray-300 dark:bg-slate-700 text-gray-700 dark:text-slate-300 text-sm font-medium hover:bg-gray-300 dark:hover:bg-slate-600 transition-colors"
                    >
                      <RefreshCw size={14} />
                      <span>Manuel</span>
                    </button>
                    <button
                      onClick={() => handleDelete(uf.id)}
                      className="p-2 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500 transition-colors"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Add Fund Modal */}
      <Modal
        isOpen={addModalOpen}
        onClose={() => { setAddModalOpen(false); setSearchQuery(''); }}
        title="Fon Ekle"
        size="lg"
      >
        <form onSubmit={handleAddFund} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1.5">Fon Ara</label>
            <div className="relative">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-300 dark:border-slate-700 bg-gray-100 dark:bg-slate-800 text-gray-800 dark:text-white outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all"
                placeholder="Kod veya isim ile arayın (örn: AFT, MAC, TTE)"
              />
            </div>
          </div>

          {searchQuery && (
            <div className="max-h-56 overflow-y-auto border border-gray-300 dark:border-slate-700 rounded-xl divide-y divide-slate-100 dark:divide-slate-700">
              {filteredFunds.length === 0 ? (
                <p className="p-4 text-sm text-gray-500 text-center">Sonuç bulunamadı</p>
              ) : (
                filteredFunds.map((fund) => (
                  <button
                    key={fund.code}
                    type="button"
                    onClick={() => { setForm({ ...form, fund_code: fund.code }); setSearchQuery(fund.name); }}
                    className={`w-full text-left p-3 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors ${
                      form.fund_code === fund.code ? 'bg-indigo-50 dark:bg-indigo-900/20' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-bold text-sm text-gray-800 dark:text-white">{fund.code}</span>
                        <span className="text-sm text-gray-600 dark:text-slate-300 ml-2">{fund.name}</span>
                      </div>
                      {form.fund_code === fund.code && (
                        <span className="text-indigo-600 text-sm font-medium">Seçildi</span>
                      )}
                    </div>
                    <p className="text-xs text-gray-400 mt-1">{fund.company} • {fund.category}</p>
                  </button>
                ))
              )}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1.5">Lot / Pay Adedi</label>
              <input
                type="number"
                step="0.01"
                value={form.shares}
                onChange={(e) => setForm({ ...form, shares: parseFloat(e.target.value) || 0 })}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-slate-700 bg-gray-100 dark:bg-slate-800 text-gray-800 dark:text-white outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1.5">Alış Fiyatı (TL)</label>
              <input
                type="number"
                step="0.01"
                value={form.purchase_price}
                onChange={(e) => setForm({ ...form, purchase_price: parseFloat(e.target.value) || 0 })}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-slate-700 bg-gray-100 dark:bg-slate-800 text-gray-800 dark:text-white outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all"
                required
              />
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setAddModalOpen(false)} className="flex-1 px-4 py-2.5 rounded-xl border border-gray-300 dark:border-slate-700 text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors font-medium">
              İptal
            </button>
            <button type="submit" className="flex-1 px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-medium hover:from-indigo-600 hover:to-purple-700 transition-all shadow-lg shadow-indigo-500/25" disabled={!form.fund_code}>
              Ekle
            </button>
          </div>
        </form>
      </Modal>

      {/* Update Price Modal */}
      <Modal
        isOpen={updateModalOpen}
        onClose={() => { setUpdateModalOpen(false); setSelectedFund(null); }}
        title="Fiyat Güncelle"
      >
        <form onSubmit={handleUpdatePrice} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1.5">Fon</label>
            <p className="font-bold text-gray-800 dark:text-white">{selectedFund?.fund?.code || selectedFund?.fund_code}</p>
            <p className="text-sm text-gray-500">{selectedFund?.fund?.name}</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1.5">Yeni Güncel Fiyat (TL)</label>
            <input
              type="number"
              step="0.01"
              value={newPrice}
              onChange={(e) => setNewPrice(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-slate-700 bg-gray-100 dark:bg-slate-800 text-gray-800 dark:text-white outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all"
              required
              autoFocus
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setUpdateModalOpen(false)} className="flex-1 px-4 py-2.5 rounded-xl border border-gray-300 dark:border-slate-700 text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors font-medium">
              İptal
            </button>
            <button type="submit" className="flex-1 px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-medium hover:from-indigo-600 hover:to-purple-700 transition-all shadow-lg shadow-indigo-500/25">
              Güncelle
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
