import { useState } from 'react';
import { useFunds, useUserFunds, useCreateUserFund, useUpdateUserFund, useDeleteUserFund } from '../hooks/useSupabase';
import { formatTRY, formatPercent } from '../lib/utils';
import { Plus, Search, RefreshCw, Trash2, TrendingUp } from 'lucide-react';
import Modal from '../components/Modal';

export default function Funds() {
  const { data: allFunds } = useFunds();
  const { data: userFunds, isLoading } = useUserFunds();
  const createUserFund = useCreateUserFund();
  const updateUserFund = useUpdateUserFund();
  const deleteUserFund = useDeleteUserFund();

  const [addModalOpen, setAddModalOpen] = useState(false);
  const [updateModalOpen, setUpdateModalOpen] = useState(false);
  const [selectedFund, setSelectedFund] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [newPrice, setNewPrice] = useState('');
  const [form, setForm] = useState({
    fund_code: '',
    shares: 0,
    purchase_price: 0,
  });

  const filteredFunds = allFunds?.filter((fund) =>
    fund.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
    fund.name.toLowerCase().includes(searchQuery.toLowerCase())
  ).slice(0, 20);

  const handleAddFund = async (e: React.FormEvent) => {
    e.preventDefault();
    await createUserFund.mutateAsync(form);
    setAddModalOpen(false);
    setForm({ fund_code: '', shares: 0, purchase_price: 0 });
    setSearchQuery('');
  };

  const handleUpdatePrice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedFund) {
      await updateUserFund.mutateAsync({
        id: selectedFund.id,
        current_price: parseFloat(newPrice),
      });
      setUpdateModalOpen(false);
      setSelectedFund(null);
      setNewPrice('');
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Bu fonu portföyünüzden kaldırmak istediğinize emin misiniz?')) {
      await deleteUserFund.mutateAsync(id);
    }
  };

  const openUpdateModal = (fund: any) => {
    setSelectedFund(fund);
    setNewPrice(fund.current_price.toString());
    setUpdateModalOpen(true);
  };

  if (isLoading) {
    return <div className="text-center py-8">Yükleniyor...</div>;
  }

  const totalValue = userFunds?.reduce((sum, uf) => sum + (uf.shares * uf.current_price), 0) || 0;
  const totalCost = userFunds?.reduce((sum, uf) => sum + (uf.shares * uf.purchase_price), 0) || 0;
  const totalProfit = totalValue - totalCost;
  const totalProfitPercent = totalCost > 0 ? (totalProfit / totalCost) * 100 : 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="section-title">Fon Portföyü</h1>
          <p className="text-slate-500 dark:text-slate-400">Yatırım fonlarınızı takip edin</p>
        </div>
        <button
          onClick={() => setAddModalOpen(true)}
          className="btn btn-primary"
        >
          <Plus size={18} />
          <span>Fon Ekle</span>
        </button>
      </div>

      {/* Summary */}
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
          <div className="card card-light dark:card-dark text-center py-12">
            <TrendingUp size={48} className="mx-auto text-slate-300 dark:text-slate-600 mb-4" />
            <p className="text-slate-500 dark:text-slate-400">Henüz fon eklemediniz</p>
            <button onClick={() => setAddModalOpen(true)} className="btn btn-primary mt-4">
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
              <div key={uf.id} className="card card-light dark:card-dark">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="px-2 py-1 rounded bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 text-xs font-bold">
                        {uf.fund?.code || uf.fund_code}
                      </span>
                      <span className="text-sm text-slate-500 dark:text-slate-400">
                        {uf.fund?.name || 'Bilinmeyen Fon'}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-3">
                      <div>
                        <p className="text-xs text-slate-500 dark:text-slate-400">Lot</p>
                        <p className="font-semibold">{uf.shares}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500 dark:text-slate-400">Alış Fiyatı</p>
                        <p className="font-semibold">{formatTRY(uf.purchase_price)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500 dark:text-slate-400">Güncel Fiyat</p>
                        <p className="font-semibold">{formatTRY(uf.current_price)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500 dark:text-slate-400">Değer</p>
                        <p className="font-semibold">{formatTRY(currentValue)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      <span className={`text-sm font-medium ${isProfit ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                        {isProfit ? '+' : ''}{formatTRY(profit)} ({formatPercent(profitPercent)})
                      </span>
                      {uf.last_price_update && (
                        <span className="text-xs text-slate-400">
                          Son güncelleme: {new Date(uf.last_price_update).toLocaleDateString('tr-TR')}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => openUpdateModal(uf)}
                      className="btn btn-secondary text-sm py-1.5 px-3"
                    >
                      <RefreshCw size={14} />
                      <span>Güncelle</span>
                    </button>
                    <button
                      onClick={() => handleDelete(uf.id)}
                      className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500 transition-colors"
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
            <label className="label">Fon Ara</label>
            <div className="relative">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input pl-10"
                placeholder="Kod veya isim ile arayın (örn: AFT, MAC, TTE)"
              />
            </div>
          </div>

          {searchQuery && (
            <div className="max-h-48 overflow-y-auto border border-slate-200 dark:border-slate-700 rounded-lg">
              {filteredFunds?.length === 0 ? (
                <p className="p-3 text-sm text-slate-500">Sonuç bulunamadı</p>
              ) : (
                filteredFunds?.map((fund) => (
                  <button
                    key={fund.code}
                    type="button"
                    onClick={() => { setForm({ ...form, fund_code: fund.code }); setSearchQuery(fund.name); }}
                    className={`w-full text-left p-3 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors border-b border-slate-100 dark:border-slate-700 last:border-0 ${
                      form.fund_code === fund.code ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-bold text-sm">{fund.code}</span>
                        <span className="text-sm text-slate-600 dark:text-slate-300 ml-2">{fund.name}</span>
                      </div>
                      {form.fund_code === fund.code && (
                        <span className="text-blue-600 text-sm font-medium">Seçildi</span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 mt-1">{fund.company} • {fund.category}</p>
                  </button>
                ))
              )}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Lot / Pay Adedi</label>
              <input
                type="number"
                step="0.01"
                value={form.shares}
                onChange={(e) => setForm({ ...form, shares: parseFloat(e.target.value) || 0 })}
                className="input"
                required
              />
            </div>
            <div>
              <label className="label">Alış Fiyatı (TL)</label>
              <input
                type="number"
                step="0.01"
                value={form.purchase_price}
                onChange={(e) => setForm({ ...form, purchase_price: parseFloat(e.target.value) || 0 })}
                className="input"
                required
              />
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setAddModalOpen(false)} className="btn btn-secondary flex-1">
              İptal
            </button>
            <button type="submit" className="btn btn-primary flex-1" disabled={!form.fund_code}>
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
            <label className="label">Fon</label>
            <p className="font-semibold">{selectedFund?.fund?.code || selectedFund?.fund_code}</p>
            <p className="text-sm text-slate-500">{selectedFund?.fund?.name}</p>
          </div>

          <div>
            <label className="label">Yeni Güncel Fiyat (TL)</label>
            <input
              type="number"
              step="0.01"
              value={newPrice}
              onChange={(e) => setNewPrice(e.target.value)}
              className="input"
              required
              autoFocus
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setUpdateModalOpen(false)} className="btn btn-secondary flex-1">
              İptal
            </button>
            <button type="submit" className="btn btn-primary flex-1">
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
    <div className="card card-light dark:card-dark p-4">
      <p className="text-sm text-slate-500 dark:text-slate-400">{label}</p>
      <p className={`text-lg font-bold ${valueClass}`}>{value}</p>
    </div>
  );
}
