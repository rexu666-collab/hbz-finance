import { useAccounts, useTransactions, useUserFunds, useExchangeRates, useCreditCards } from '../hooks/useSupabase';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { formatTRY, formatCurrency } from '../lib/utils';
import { 
  TrendingUp, TrendingDown, 
  Landmark, ArrowUpRight, ArrowDownRight, Activity,
  Coins, Gem,
  DollarSign, Euro, PoundSterling, Gem as GemIcon, CreditCard as CreditCardIcon
} from 'lucide-react';
import { 
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip, 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, BarChart, Bar
} from 'recharts';
import type { Account, CurrencyCode } from '../types';

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];

export default function Dashboard() {
  const { user } = useAuth();
  const { data: accounts, isLoading: accountsLoading } = useAccounts();
  const { data: transactions, isLoading: txLoading } = useTransactions();
  const { data: userFunds, isLoading: fundsLoading } = useUserFunds();
  const { data: creditCards, isLoading: cardsLoading } = useCreditCards();
  const { data: exchangeRates } = useExchangeRates();

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

  // Account distribution for pie chart
  const accountDistribution = accounts?.reduce((acc: Record<string, number>, account) => {
    const value = getAccountValueTRY(account);
    acc['Banka'] = (acc['Banka'] || 0) + value;
    return acc;
  }, {});

  if (userFunds && userFunds.length > 0) {
    accountDistribution!['Fonlar'] = fundTotal;
  }
  if (creditCardDebt > 0) {
    accountDistribution!['K.K. Borç'] = creditCardDebt;
  }

  const pieData = Object.entries(accountDistribution || {}).map(([name, value]) => ({ name, value }));

  // Returns calculation
  const getPeriodReturn = (days: number) => {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    const periodTx = transactions?.filter(tx => new Date(tx.transaction_date) >= cutoff) || [];
    const income = periodTx.filter(tx => tx.type === 'income').reduce((s, tx) => s + tx.amount, 0);
    const expense = periodTx.filter(tx => tx.type === 'expense').reduce((s, tx) => s + tx.amount, 0);
    return income - expense;
  };

  const dailyReturn = getPeriodReturn(1);
  const weeklyReturn = getPeriodReturn(7);
  const monthlyReturn = getPeriodReturn(30);
  const yearlyReturn = getPeriodReturn(365);

  // Real Net Worth History from transactions
  const getNetWorthHistory = () => {
    if (!transactions || transactions.length === 0) {
      return [{ date: 'Bugün', value: netWorth }];
    }
    
    const sortedTx = [...transactions].sort((a, b) => 
      new Date(a.transaction_date).getTime() - new Date(b.transaction_date).getTime()
    );
    
    const startDate = new Date(sortedTx[0].transaction_date);
    const today = new Date();
    const history: { date: string; value: number }[] = [];
    
    const points = 6;
    for (let i = 0; i < points; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + Math.floor((today.getTime() - startDate.getTime()) / (points - 1) * i));
      
      const cumTx = sortedTx.filter(tx => new Date(tx.transaction_date) <= date);
      const cumIncome = cumTx.filter(tx => tx.type === 'income').reduce((s, tx) => s + tx.amount, 0);
      const cumExpense = cumTx.filter(tx => tx.type === 'expense').reduce((s, tx) => s + tx.amount, 0);
      const cumNet = cumIncome - cumExpense + totalAssets;
      
      const label = i === points - 1 ? 'Bugün' : date.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit' });
      history.push({ date: label, value: Math.max(0, cumNet) });
    }
    
    return history;
  };

  const netWorthHistory = getNetWorthHistory();

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
      <div className="space-y-6">
        <div className="h-8 w-48 bg-gray-300 dark:bg-slate-700 rounded-lg skeleton" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-32 bg-gray-300 dark:bg-slate-700 rounded-2xl skeleton" />
          ))}
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
                {isPositive ? '+' : ''}{formatTRY(item.value)}
              </span>
            </div>
          );
        })}
      </div>

      {/* Exchange Rates Ticker */}
      {majorRates.length > 0 && (
        <div className="flex gap-3 overflow-x-auto pb-1">
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
        </div>
      )}

      {/* Net Worth Card - Hero with Pie Chart */}
      <div 
        className="relative overflow-hidden rounded-3xl animated-gradient p-8 text-white shadow-2xl"
        style={{ boxShadow: '0 25px 80px -20px rgba(99, 102, 241, 0.4)' }}
      >
        {/* Animated background orbs */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-20 -right-20 w-80 h-80 bg-white/10 rounded-full blur-3xl float-animation" />
          <div className="absolute -bottom-20 -left-20 w-60 h-60 bg-pink-500/20 rounded-full blur-3xl float-animation" style={{ animationDelay: '2s' }} />
        </div>
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center gap-8">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-white/70 text-sm font-medium tracking-wide uppercase">Net Varlık</span>
              <TrendingUp size={20} className="text-white/50" />
            </div>
            <div className="text-5xl font-bold mb-6 tracking-tight">
              {formatTRY(netWorth)}
            </div>
              <div className="flex flex-wrap gap-4 text-sm">
                <div className="flex items-center gap-2 bg-white/10 backdrop-blur-md rounded-xl px-4 py-2">
                  <ArrowUpRight size={16} className="text-emerald-300" />
                  <span className="text-white/80">Varlık: {formatTRY(totalAssets + fundTotal)}</span>
                </div>
                {fundTotal > 0 && (
                  <div className="flex items-center gap-2 bg-white/10 backdrop-blur-md rounded-xl px-4 py-2">
                    <ArrowDownRight size={16} className="text-purple-300" />
                    <span className="text-white/80">Fonlar: {formatTRY(fundTotal)}</span>
                  </div>
                )}
                {creditCardDebt > 0 && (
                  <div className="flex items-center gap-2 bg-white/10 backdrop-blur-md rounded-xl px-4 py-2">
                    <ArrowDownRight size={16} className="text-orange-300" />
                    <span className="text-white/80">K.K. Borç: {formatTRY(creditCardDebt)}</span>
                  </div>
                )}
              </div>
          </div>
          
          {/* Pie Chart inside hero card */}
          {pieData.length > 0 && (
            <div className="w-full md:w-56 h-44">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={65}
                    paddingAngle={4}
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
              <div className="flex flex-wrap gap-3 justify-center -mt-1">
                {pieData.slice(0, 3).map((entry, index) => (
                  <div key={entry.name} className="flex items-center gap-1.5 text-[11px] text-white/80">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                    <span>{entry.name}</span>
                  </div>
                ))}
                {pieData.length > 3 && (
                  <span className="text-[11px] text-white/50">+{pieData.length - 3}</span>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

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
        {/* Net Worth Trend */}
        <div className="bg-gray-100 dark:bg-slate-800 rounded-2xl p-6 border border-gray-300 dark:border-slate-700 shadow-sm relative overflow-hidden card-hover">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" />
          <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-6 flex items-center gap-2">
            <Activity size={18} className="text-indigo-500" />
            Net Varlık Trendi
          </h3>
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={netWorthHistory}>
              <defs>
                <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4}/>
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="strokeGradient" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#6366f1" />
                  <stop offset="50%" stopColor="#8b5cf6" />
                  <stop offset="100%" stopColor="#ec4899" />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} opacity={0.5} />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={(v) => `₺${(v / 1000).toFixed(0)}K`} />
              <Tooltip 
                formatter={(value: any) => [formatTRY(Number(value)), 'Net Varlık']}
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
              <Area 
                type="monotone" 
                dataKey="value" 
                stroke="url(#strokeGradient)" 
                strokeWidth={3} 
                fillOpacity={1} 
                fill="url(#colorValue)" 
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Category Spending */}
        <div className="bg-gray-100 dark:bg-slate-800 rounded-2xl p-6 border border-gray-300 dark:border-slate-700 shadow-sm relative overflow-hidden card-hover">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500" />
          <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-6 flex items-center gap-2">
            <TrendingDown size={18} className="text-pink-500" />
            Kategori Harcamaları
          </h3>
          {categoryPieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={categoryPieData} layout="vertical" margin={{ left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" opacity={0.5} />
                <XAxis type="number" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={(v) => `₺${(v / 1000).toFixed(0)}K`} />
                <YAxis dataKey="name" type="category" width={70} tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <Tooltip 
                  formatter={(value: any) => [formatTRY(Number(value)), 'Harcama']}
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
                <Bar dataKey="value" radius={[0, 8, 8, 0]}>
                  {categoryPieData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[240px] flex items-center justify-center text-gray-400 flex-col gap-3">
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
            <div className="text-center py-10 text-gray-400 flex flex-col items-center gap-3">
              <Gem size={40} className="opacity-30" />
              <p>Henüz işlem yok</p>
            </div>
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
    <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
      {cards.map((card) => (
        <div
          key={card.label}
          onClick={() => navigate(card.route)}
          className="relative bg-gray-100 dark:bg-slate-800 rounded-2xl p-5 border border-gray-300 dark:border-slate-700 shadow-sm overflow-hidden group cursor-pointer card-hover"
        >
          <div
            className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
            style={{ background: `radial-gradient(circle at 50% 0%, ${card.color}20, transparent 70%)` }}
          />
          <div className="relative z-10">
            <div className={`inline-flex p-3 rounded-xl bg-gradient-to-br ${card.gradient} text-white mb-4 shadow-lg`}>
              {card.icon}
            </div>
            <p className="text-xs text-gray-500 dark:text-slate-400 uppercase tracking-wider font-semibold">{card.label}</p>
            <p className="text-xl font-bold text-gray-800 dark:text-white mt-1">
              {formatTRY(card.value)}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}


