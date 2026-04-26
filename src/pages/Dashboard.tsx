import { useState, useEffect } from 'react';
import { useAccounts, useTransactions, useUserFunds, useExchangeRates, useCreditCards, useNetWorthHistory } from '../hooks/useSupabase';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { formatTRY, formatCurrency } from '../lib/utils';
import { Mask } from '../contexts/SensitiveContext';
import Skeleton from '../components/Skeleton';
import EmptyState from '../components/EmptyState';
import { 
  TrendingUp, TrendingDown, 
  Landmark, ArrowUpRight, ArrowDownRight, Activity,
  Coins, Gem,
  DollarSign, Euro, PoundSterling, Gem as GemIcon, CreditCard as CreditCardIcon,
  CreditCard, RefreshCw
} from 'lucide-react';
import { 
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip
} from 'recharts';
import type { Account, CurrencyCode } from '../types';

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];

export default function Dashboard() {
  const { user } = useAuth();
  const { data: accounts, isLoading: accountsLoading } = useAccounts();
  const { data: transactions, isLoading: txLoading } = useTransactions();
  const { data: userFunds, isLoading: fundsLoading } = useUserFunds();
  const { data: creditCards, isLoading: cardsLoading } = useCreditCards();
  const { data: exchangeRates, refetch: refetchRates, isFetching: ratesFetching } = useExchangeRates();
  const { data: netWorthHistory } = useNetWorthHistory();

  // BIST 100 data from Yahoo Finance
  const [bistData, setBistData] = useState<{ price: number; change: number } | null>(null);
  useEffect(() => {
    fetch('/api/bist100')
      .then(r => r.json())
      .then(data => {
        if (data.price) {
          setBistData({ price: data.price, change: data.change });
        }
      })
      .catch(() => {});
  }, []);

  const getRate = (currency: CurrencyCode) => {
    if (currency === 'TRY') return 1;
    const rate = exchangeRates?.find((r) => r.currency_code === currency);
    return rate?.rate_to_try || 1;
  };

  const getAccountValueTRY = (account: Account) => {
    return account.balance * getRate(account.currency);
  };

  const totalAssets = accounts?.reduce((sum, acc) => {
    return sum + getAccountValueTRY(acc);
  }, 0) || 0;

  const fundTotal = userFunds?.reduce((sum, uf) => {
    return sum + (uf.shares * uf.current_price);
  }, 0) || 0;

  const creditCardDebt = creditCards?.reduce((sum, c) => sum + c.current_debt, 0) || 0;

  const netWorth = totalAssets + fundTotal - creditCardDebt;

  // Monthly income/expense for summary cards
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const thisMonthTx = transactions?.filter(tx => new Date(tx.transaction_date) >= monthStart) || [];
  const monthIncome = thisMonthTx.filter(tx => tx.type === 'income').reduce((s, tx) => s + tx.amount, 0);
  const monthExpense = thisMonthTx.filter(tx => tx.type === 'expense').reduce((s, tx) => s + tx.amount, 0);

  const recentTransactions = transactions?.slice(0, 5) || [];

  // Account distribution for pie chart - show each account individually
  const getPieData = () => {
    const data: { name: string; value: number }[] = [];
    
    // Each account individually
    accounts?.forEach((account) => {
      const value = getAccountValueTRY(account);
      if (value > 0) {
        data.push({ name: account.name, value });
      }
    });
    
    // Funds
    if (fundTotal > 0) {
      data.push({ name: 'Fonlar', value: fundTotal });
    }
    
    // Credit card debt (shown as negative)
    if (creditCardDebt > 0) {
      data.push({ name: 'K.K. Borç', value: creditCardDebt });
    }
    
    return data.sort((a, b) => b.value - a.value);
  };

  const pieData = getPieData();

  // Returns calculation from net worth history
  const getReturn = (days: number) => {
    if (!netWorthHistory || netWorthHistory.length < 2) return 0;
    const sorted = [...netWorthHistory].sort((a, b) => new Date(a.record_date).getTime() - new Date(b.record_date).getTime());
    const now = new Date();
    const cutoff = new Date();
    cutoff.setDate(now.getDate() - days);
    const past = sorted.filter(h => new Date(h.record_date) <= cutoff).pop();
    const latest = sorted[sorted.length - 1];
    if (!past || !latest || past.total_try === 0) return 0;
    return ((latest.total_try - past.total_try) / past.total_try) * 100;
  };

  const dailyReturn = getReturn(1);
  const weeklyReturn = getReturn(7);
  const monthlyReturn = getReturn(30);
  const yearlyReturn = getReturn(365);

  // Category spending analysis
  const categoryData = transactions
    ?.filter(tx => tx.type === 'expense')
    .reduce((acc: Record<string, number>, tx) => {
      const catName = tx.categories?.name || 'Diğer';
      acc[catName] = (acc[catName] || 0) + tx.amount;
      return acc;
    }, {});

  const categoryPieData = Object.entries(categoryData || {})
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 6);

  // Exchange rates display
  const majorRates = exchangeRates?.filter(r => ['USD', 'EUR', 'GBP', 'XAU'].includes(r.currency_code)) || [];
  const rateIcons: Record<string, React.ReactNode> = {
    'USD': <DollarSign size={14} />,
    'EUR': <Euro size={14} />,
    'GBP': <PoundSterling size={14} />,
    'XAU': <GemIcon size={14} />,
  };

  const isLoading = accountsLoading || txLoading || fundsLoading || cardsLoading;

  if (isLoading) {
    return (
      <div className="space-y-6 p-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-48 w-full rounded-2xl" />
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          {[1, 2, 3, 4, 5].map(i => (
            <Skeleton key={i} className="h-32 rounded-2xl" />
          ))}
        </div>
        <div className="grid lg:grid-cols-2 gap-6">
          <Skeleton className="h-64 rounded-2xl" />
          <Skeleton className="h-64 rounded-2xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 dark:text-white">Dashboard</h1>
          <p className="text-gray-500 dark:text-slate-400 text-sm mt-1">
            Hoş geldiniz, <span className="font-semibold text-indigo-500">{user?.email?.split('@')[0] || 'Kullanıcı'}</span>
          </p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-sm font-medium border border-emerald-200 dark:border-emerald-800">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>Canlı</span>
        </div>
      </div>

      {/* Net Worth Card - Hero with Pie Chart */}
      <div 
        className="relative overflow-hidden rounded-2xl sm:rounded-3xl animated-gradient p-5 sm:p-8 text-white shadow-2xl"
        style={{ boxShadow: '0 25px 80px -20px rgba(99, 102, 241, 0.4)' }}
      >
        {/* Animated background orbs */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-20 -right-20 w-80 h-80 bg-white/10 rounded-full blur-3xl float-animation" />
          <div className="absolute -bottom-20 -left-20 w-60 h-60 bg-pink-500/20 rounded-full blur-3xl float-animation" style={{ animationDelay: '2s' }} />
        </div>
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center gap-8">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2 sm:mb-3">
              <span className="text-white/70 text-xs sm:text-sm font-medium tracking-wide uppercase">Net Varlık</span>
              <TrendingUp size={16} className="text-white/50 sm:hidden" />
              <TrendingUp size={20} className="text-white/50 hidden sm:block" />
            </div>
            <div className="text-3xl sm:text-5xl font-bold mb-4 sm:mb-6 tracking-tight break-all">
              <Mask>{formatTRY(netWorth)}</Mask>
            </div>
              <div className="flex flex-wrap gap-2 sm:gap-4 text-xs sm:text-sm">
                <div className="flex items-center gap-1.5 sm:gap-2 bg-white/10 backdrop-blur-md rounded-lg sm:rounded-xl px-3 sm:px-4 py-1.5 sm:py-2">
                  <ArrowUpRight size={14} className="text-emerald-300 sm:hidden" />
                  <ArrowUpRight size={16} className="text-emerald-300 hidden sm:block" />
                  <span className="text-white/80">Varlık: <Mask>{formatTRY(totalAssets + fundTotal)}</Mask></span>
                </div>
                {fundTotal > 0 && (
                  <div className="flex items-center gap-1.5 sm:gap-2 bg-white/10 backdrop-blur-md rounded-lg sm:rounded-xl px-3 sm:px-4 py-1.5 sm:py-2">
                    <ArrowDownRight size={14} className="text-purple-300 sm:hidden" />
                    <ArrowDownRight size={16} className="text-purple-300 hidden sm:block" />
                    <span className="text-white/80">Fonlar: <Mask>{formatTRY(fundTotal)}</Mask></span>
                  </div>
                )}
                {creditCardDebt > 0 && (
                  <div className="flex items-center gap-1.5 sm:gap-2 bg-white/10 backdrop-blur-md rounded-lg sm:rounded-xl px-3 sm:px-4 py-1.5 sm:py-2">
                    <ArrowDownRight size={14} className="text-orange-300 sm:hidden" />
                    <ArrowDownRight size={16} className="text-orange-300 hidden sm:block" />
                    <span className="text-white/80">K.K. Borç: <Mask>{formatTRY(creditCardDebt)}</Mask></span>
                  </div>
                )}
              </div>
          </div>
          
          {/* Pie Chart + Legend side by side */}
          {pieData.length > 0 && (
            <div className="flex flex-row-reverse items-center gap-4 md:gap-6">
              {/* Chart on the right */}
              <div className="w-32 h-32 sm:w-40 sm:h-40 shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={30}
                      outerRadius={55}
                      paddingAngle={3}
                      dataKey="value"
                      stroke="none"
                    >
                      {pieData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value: any) => formatTRY(Number(value))}
                      contentStyle={{ 
                        backgroundColor: 'rgba(15, 23, 42, 0.95)', 
                        border: 'none', 
                        borderRadius: '16px',
                        color: '#fff',
                        fontSize: '13px',
                        padding: '12px 16px',
                        boxShadow: '0 10px 40px rgba(0,0,0,0.3)'
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Legend list on the left */}
              {(() => {
                const total = pieData.reduce((sum, d) => sum + d.value, 0);
                const displayItems = pieData.slice(0, 5);
                const others = pieData.slice(5);
                const othersPct = others.reduce((sum, d) => sum + (d.value / total) * 100, 0);
                return (
                  <div className="flex flex-col gap-1.5 min-w-0">
                    {displayItems.map((entry, index) => (
                      <div key={entry.name} className="flex items-center gap-2 text-[11px] sm:text-xs text-white/90">
                        <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                        <span className="font-bold shrink-0">%{((entry.value / total) * 100).toFixed(1)}</span>
                        <span className="truncate">{entry.name}</span>
                      </div>
                    ))}
                    {others.length > 0 && (
                      <div className="flex items-center gap-2 text-[11px] sm:text-xs text-white/60">
                        <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: COLORS[5 % COLORS.length] }} />
                        <span className="font-bold shrink-0">%{othersPct.toFixed(1)}</span>
                        <span>Diğer</span>
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          )}
        </div>
      </div>

      {/* Returns compact bar */}
      <div className="flex items-center bg-gray-100 dark:bg-slate-800 rounded-2xl border border-gray-300 dark:border-slate-700 divide-x divide-gray-300 dark:divide-slate-700 overflow-hidden">
        {[
          { label: 'Günlük', value: dailyReturn },
          { label: 'Haftalık', value: weeklyReturn },
          { label: 'Aylık', value: monthlyReturn },
          { label: 'Yıllık', value: yearlyReturn },
        ].map((item) => {
          const isPositive = item.value >= 0;
          return (
            <div key={item.label} className="flex-1 px-3 py-2.5 text-center">
              <span className="text-[10px] text-gray-500 dark:text-slate-400 uppercase tracking-wider block leading-tight">{item.label}</span>
              <span className={`text-sm font-bold ${isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                <Mask>{isPositive ? '+' : ''}{item.value.toFixed(2)}%</Mask>
              </span>
            </div>
          );
        })}
      </div>

      {/* Exchange Rates Ticker */}
      {majorRates.length > 0 && (
        <div className="flex gap-3 overflow-x-auto pb-1 items-center">
          {majorRates.map((rate) => (
            <div 
              key={rate.currency_code}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gray-100 dark:bg-slate-800 border border-gray-300 dark:border-slate-700 whitespace-nowrap"
            >
              <span className="text-indigo-500">{rateIcons[rate.currency_code]}</span>
              <span className="text-xs font-bold text-gray-500 dark:text-slate-400">{rate.currency_code}</span>
              <span className="text-sm font-bold text-gray-800 dark:text-white">{rate.rate_to_try.toFixed(2)}</span>
              <span className="text-xs text-gray-400">₺</span>
            </div>
          ))}
          {bistData && (
            <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gray-100 dark:bg-slate-800 border border-gray-300 dark:border-slate-700 whitespace-nowrap">
              <span className="text-indigo-500"><TrendingUp size={14} /></span>
              <span className="text-xs font-bold text-gray-500 dark:text-slate-400">BIST 100</span>
              <span className="text-sm font-bold text-gray-800 dark:text-white">{bistData.price.toFixed(2)}</span>
              <span className={`text-[10px] font-bold ${bistData.change >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                {bistData.change >= 0 ? '+' : ''}{bistData.change.toFixed(2)}%
              </span>
            </div>
          )}
          <button
            onClick={() => { refetchRates(); fetch('/api/bist100').then(r => r.json()).then(data => { if (data.price) setBistData({ price: data.price, change: data.change }); }).catch(() => {}); }}
            disabled={ratesFetching}
            className="shrink-0 p-2.5 rounded-xl bg-gray-100 dark:bg-slate-800 border border-gray-300 dark:border-slate-700 text-gray-500 dark:text-slate-400 hover:text-indigo-500 dark:hover:text-indigo-400 hover:border-indigo-300 dark:hover:border-indigo-700 transition-all disabled:opacity-50"
            title="Kurları yenile"
          >
            <RefreshCw size={16} className={ratesFetching ? 'animate-spin' : ''} />
          </button>
        </div>
      )}

      {/* Summary Cards */}
      <SummaryCards
        cards={[
          { icon: <Landmark size={22} />, label: 'Banka', value: totalAssets, gradient: 'from-blue-400 to-indigo-500', color: '#3b82f6', route: '/accounts' },
          { icon: <Coins size={22} />, label: 'Fonlar', value: fundTotal, gradient: 'from-purple-400 to-violet-500', color: '#8b5cf6', route: '/funds' },
          { icon: <TrendingUp size={22} />, label: 'Bu Ay Gelir', value: monthIncome, gradient: 'from-emerald-400 to-teal-500', color: '#10b981', route: '/transactions' },
          { icon: <TrendingDown size={22} />, label: 'Bu Ay Gider', value: monthExpense, gradient: 'from-red-400 to-pink-500', color: '#ef4444', route: '/transactions' },
          { icon: <CreditCardIcon size={22} />, label: 'K.K. Borç', value: creditCardDebt, gradient: 'from-orange-400 to-red-500', color: '#f97316', route: '/credit-cards' },
        ]}
      />

      {/* Charts Row */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Credit Card Status */}
        <div className="bg-gray-100 dark:bg-slate-800 rounded-2xl p-5 sm:p-6 border border-gray-300 dark:border-slate-700 shadow-sm relative overflow-hidden card-hover">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-orange-400 via-red-500 to-pink-500" />
          <h3 className="text-base sm:text-lg font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
            <CreditCard size={18} className="text-orange-500" />
            Kredi Kartı Durumu
          </h3>
          {creditCards && creditCards.length > 0 ? (
            <div className="space-y-4 max-h-[260px] overflow-y-auto pr-1">
              {creditCards.map((card) => {
                const usage = card.credit_limit > 0 ? (card.current_debt / card.credit_limit) * 100 : 0;
                const available = card.credit_limit - card.current_debt;
                return (
                  <div key={card.id} className="p-3 rounded-xl bg-gray-200/50 dark:bg-slate-700/30">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-semibold text-sm text-gray-800 dark:text-white">{card.name}</span>
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${usage >= 90 ? 'bg-red-100 text-red-600' : usage >= 70 ? 'bg-orange-100 text-orange-600' : 'bg-emerald-100 text-emerald-600'}`}>
                        %{usage.toFixed(1)}
                      </span>
                    </div>
                    <div className="w-full h-2 bg-gray-300 dark:bg-slate-600 rounded-full overflow-hidden mb-2">
                      <div
                        className={`h-full rounded-full transition-all ${usage >= 90 ? 'bg-red-500' : usage >= 70 ? 'bg-orange-500' : 'bg-emerald-500'}`}
                        style={{ width: `${Math.min(usage, 100)}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-xs text-gray-500 dark:text-slate-400">
                      <span>Borç: <Mask>{formatTRY(card.current_debt)}</Mask></span>
                      <span>Kalan: <Mask>{formatTRY(available)}</Mask></span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <EmptyState icon={CreditCard} title="Henüz kredi kartı yok" />
          )}
        </div>

        {/* Category Spending Pie */}
        <div className="bg-gray-100 dark:bg-slate-800 rounded-2xl p-5 sm:p-6 border border-gray-300 dark:border-slate-700 shadow-sm relative overflow-hidden card-hover">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500" />
          <h3 className="text-base sm:text-lg font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
            <TrendingDown size={18} className="text-pink-500" />
            Kategorilere Göre Harcamalar
          </h3>
          {categoryPieData.length > 0 ? (
            <div className="flex flex-row-reverse items-center gap-4">
              <div className="w-32 h-32 sm:w-36 sm:h-36 shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categoryPieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={28}
                      outerRadius={50}
                      paddingAngle={3}
                      dataKey="value"
                      stroke="none"
                    >
                      {categoryPieData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: any) => formatTRY(Number(value))}
                      contentStyle={{
                        backgroundColor: 'rgba(15, 23, 42, 0.95)',
                        border: 'none',
                        borderRadius: '16px',
                        color: '#fff',
                        fontSize: '13px',
                        padding: '12px 16px',
                        boxShadow: '0 10px 40px rgba(0,0,0,0.3)'
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              {(() => {
                const total = categoryPieData.reduce((sum, d) => sum + d.value, 0);
                return (
                  <div className="flex flex-col gap-1.5 min-w-0 flex-1">
                    {categoryPieData.map((entry, index) => (
                      <div key={entry.name} className="flex items-center gap-2 text-[11px] sm:text-xs text-gray-700 dark:text-white/90">
                        <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                        <span className="font-bold shrink-0">%{((entry.value / total) * 100).toFixed(1)}</span>
                        <span className="truncate">{entry.name}</span>
                        <span className="text-gray-400 dark:text-slate-400 shrink-0 ml-auto">{formatTRY(entry.value)}</span>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>
          ) : (
            <div className="h-[200px] flex items-center justify-center text-gray-400 flex-col gap-3">
              <Gem size={40} className="opacity-30" />
              <p>Henüz gider kaydı yok</p>
            </div>
          )}
        </div>
      </div>

      {/* Recent Transactions */}
      <div className="bg-gray-100 dark:bg-slate-800 rounded-2xl p-6 border border-gray-300 dark:border-slate-700 shadow-sm relative overflow-hidden card-hover">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 via-blue-500 to-purple-500" />
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-bold text-gray-800 dark:text-white flex items-center gap-2">
            <Activity size={18} className="text-emerald-500" />
            Son İşlemler
          </h3>
          <span className="text-xs text-gray-400 bg-gray-200 dark:bg-slate-700 px-3 py-1 rounded-full">Son 5 işlem</span>
        </div>
        <div className="space-y-2">
          {recentTransactions.length === 0 ? (
            <EmptyState icon={Gem} title="Henüz işlem yok" description="İlk işlemini eklemek için + butonuna tıkla." />
          ) : (
            recentTransactions.map((tx, index) => (
              <div 
                key={tx.id}
                className="flex items-center justify-between p-4 rounded-xl bg-gray-200/50 dark:bg-slate-700/30 hover:bg-gray-300/50 dark:hover:bg-slate-700/50 transition-all cursor-pointer slide-in"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2.5 rounded-xl ${
                    tx.type === 'income' ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600' : 
                    tx.type === 'expense' ? 'bg-red-100 dark:bg-red-900/30 text-red-600' : 
                    'bg-blue-100 dark:bg-blue-900/30 text-blue-600'
                  }`}>
                    {tx.type === 'income' ? <TrendingUp size={18} /> : 
                     tx.type === 'expense' ? <TrendingDown size={18} /> : 
                     <Activity size={18} />}
                  </div>
                  <div>
                    <p className="font-semibold text-sm text-gray-800 dark:text-white">{tx.description || tx.accounts?.name}</p>
                    <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">{tx.transaction_date}</p>
                  </div>
                </div>
                <span className={`font-bold text-sm ${
                  tx.type === 'income' ? 'text-emerald-600 dark:text-emerald-400' : 
                  tx.type === 'expense' ? 'text-red-600 dark:text-red-400' : 
                  'text-blue-600 dark:text-blue-400'
                }`}>
                  {tx.type === 'income' ? '+' : tx.type === 'expense' ? '-' : ''}
                  {formatCurrency(tx.amount, tx.currency)}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function SummaryCards({ cards }: { cards: { icon: React.ReactNode; label: string; value: number; gradient: string; color: string; route: string }[] }) {
  const navigate = useNavigate();
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
      {cards.map((card) => (
        <div
          key={card.label}
          onClick={() => navigate(card.route)}
          className="relative bg-gray-100 dark:bg-slate-800 rounded-2xl p-3 sm:p-5 border border-gray-300 dark:border-slate-700 shadow-sm overflow-hidden group cursor-pointer card-hover"
        >
          <div
            className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
            style={{ background: `radial-gradient(circle at 50% 0%, ${card.color}20, transparent 70%)` }}
          />
          <div className="relative z-10">
            <div className={`inline-flex p-2 sm:p-3 rounded-lg sm:rounded-xl bg-gradient-to-br ${card.gradient} text-white mb-2 sm:mb-4 shadow-lg`}>
              {card.icon}
            </div>
            <p className="text-[10px] sm:text-xs text-gray-500 dark:text-slate-400 uppercase tracking-wider font-semibold truncate">{card.label}</p>
            <p className="text-base sm:text-xl font-bold text-gray-800 dark:text-white mt-0.5 sm:mt-1 truncate">
              <Mask>{formatTRY(card.value)}</Mask>
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}


