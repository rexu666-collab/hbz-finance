import { useAccounts, useTransactions, useUserFunds, useExchangeRates } from '../hooks/useSupabase';
import { useAuth } from '../contexts/AuthContext';
import { formatTRY, formatCurrency } from '../lib/utils';
import { 
  TrendingUp, TrendingDown, Wallet, CreditCard, 
  Landmark, ArrowUpRight, ArrowDownRight, Activity,
  Coins, Gem, Calendar, CalendarDays, CalendarRange, CalendarCheck
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
    const value = getAccountValueTRY(acc);
    return acc.type === 'credit_card' || acc.type === 'loan' ? sum : sum + value;
  }, 0) || 0;

  const totalLiabilities = accounts?.reduce((sum, acc) => {
    const value = getAccountValueTRY(acc);
    return acc.type === 'credit_card' || acc.type === 'loan' ? sum + Math.abs(value) : sum;
  }, 0) || 0;

  const fundTotal = userFunds?.reduce((sum, uf) => {
    return sum + (uf.shares * uf.current_price);
  }, 0) || 0;

  const netWorth = totalAssets - totalLiabilities + fundTotal;

  const recentTransactions = transactions?.slice(0, 5) || [];

  // Account distribution for pie chart
  const accountDistribution = accounts?.reduce((acc: Record<string, number>, account) => {
    const value = getAccountValueTRY(account);
    if (account.type === 'credit_card' || account.type === 'loan') return acc;
    const typeLabel = account.type === 'cash' ? 'Nakit' : 
                     account.type === 'bank' ? 'Banka' : 
                     account.type === 'investment' ? 'Yatırım' : 'Diğer';
    acc[typeLabel] = (acc[typeLabel] || 0) + value;
    return acc;
  }, {});

  if (userFunds && userFunds.length > 0) {
    accountDistribution!['Fonlar'] = fundTotal;
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
    
    // Create 6 data points
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

  const isLoading = accountsLoading || txLoading || fundsLoading;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-slate-200 dark:bg-slate-700 rounded-lg skeleton" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-32 bg-slate-200 dark:bg-slate-700 rounded-2xl skeleton" />
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
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Dashboard</h1>
          <p className="text-gray-500 dark:text-slate-400 text-sm mt-0.5">
            Hoş geldiniz, {user?.email?.split('@')[0] || 'Kullanıcı'}
          </p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-sm font-medium">
          <Activity size={14} />
          <span>Canlı</span>
        </div>
      </div>

      {/* Returns */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <ReturnCard label="Günlük Getiri" value={dailyReturn} icon={<Calendar size={18} />} />
        <ReturnCard label="Haftalık Getiri" value={weeklyReturn} icon={<CalendarDays size={18} />} />
        <ReturnCard label="Aylık Getiri" value={monthlyReturn} icon={<CalendarRange size={18} />} />
        <ReturnCard label="Yıllık Getiri" value={yearlyReturn} icon={<CalendarCheck size={18} />} />
      </div>

      {/* Exchange Rates */}
      {majorRates.length > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {majorRates.map((rate) => (
            <div key={rate.currency_code} className="bg-gray-100 dark:bg-slate-800 rounded-xl p-3 border border-gray-300 dark:border-slate-700">
              <p className="text-xs text-gray-500 dark:text-slate-400">{rate.currency_code}</p>
              <p className="text-lg font-bold text-gray-800 dark:text-white">{rate.rate_to_try.toFixed(2)} ₺</p>
            </div>
          ))}
        </div>
      )}

      {/* Net Worth Card - Hero with Pie Chart */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 p-6 text-white shadow-xl shadow-indigo-500/20">
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/20 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/10 rounded-full blur-2xl" />
        </div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center gap-6">
          <div className="flex-1">
            <div className="flex items-center justify-between mb-2">
              <span className="text-indigo-100 text-sm font-medium">Net Varlık</span>
              <TrendingUp size={20} className="text-indigo-200" />
            </div>
            <div className="text-4xl font-bold mb-4">{formatTRY(netWorth)}</div>
            <div className="flex gap-6 text-sm">
              <div className="flex items-center gap-1.5">
                <ArrowUpRight size={16} className="text-emerald-300" />
                <span className="text-indigo-100">Varlık: {formatTRY(totalAssets + fundTotal)}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <ArrowDownRight size={16} className="text-red-300" />
                <span className="text-indigo-100">Borç: {formatTRY(totalLiabilities)}</span>
              </div>
            </div>
          </div>
          
          {/* Pie Chart inside hero card */}
          {pieData.length > 0 && (
            <div className="w-full md:w-48 h-40">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={35}
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
                      backgroundColor: 'rgba(15, 23, 42, 0.9)', 
                      border: 'none', 
                      borderRadius: '12px',
                      color: '#fff',
                      fontSize: '12px'
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-wrap gap-2 justify-center -mt-2">
                {pieData.slice(0, 3).map((entry, index) => (
                  <div key={entry.name} className="flex items-center gap-1 text-[10px] text-indigo-100">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                    <span>{entry.name}</span>
                  </div>
                ))}
                {pieData.length > 3 && (
                  <span className="text-[10px] text-indigo-200">+{pieData.length - 3}</span>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard
          icon={<Wallet size={20} />}
          label="Nakit"
          value={formatTRY(accounts?.filter(a => a.type === 'cash').reduce((s, a) => s + getAccountValueTRY(a), 0) || 0)}
          gradient="from-emerald-500 to-teal-600"
        />
        <SummaryCard
          icon={<Landmark size={20} />}
          label="Banka"
          value={formatTRY(accounts?.filter(a => a.type === 'bank').reduce((s, a) => s + getAccountValueTRY(a), 0) || 0)}
          gradient="from-blue-500 to-indigo-600"
        />
        <SummaryCard
          icon={<CreditCard size={20} />}
          label="Kredi Kartı"
          value={formatTRY(Math.abs(accounts?.filter(a => a.type === 'credit_card').reduce((s, a) => s + getAccountValueTRY(a), 0) || 0))}
          gradient="from-red-500 to-pink-600"
        />
        <SummaryCard
          icon={<Coins size={20} />}
          label="Fonlar"
          value={formatTRY(fundTotal)}
          gradient="from-purple-500 to-violet-600"
        />
      </div>

      {/* Charts Row */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Net Worth Trend */}
        <div className="bg-gray-100 dark:bg-slate-800 rounded-2xl p-6 border border-gray-300 dark:border-slate-700 shadow-sm card-hover">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">Net Varlık Trendi</h3>
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={netWorthHistory}>
              <defs>
                <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={(v) => `₺${(v / 1000).toFixed(0)}K`} />
              <Tooltip 
                formatter={(value: any) => formatTRY(Number(value))}
                contentStyle={{ 
                  backgroundColor: 'rgba(15, 23, 42, 0.9)', 
                  border: 'none', 
                  borderRadius: '12px',
                  color: '#fff'
                }}
              />
              <Area type="monotone" dataKey="value" stroke="#6366f1" strokeWidth={2} fillOpacity={1} fill="url(#colorValue)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Category Spending */}
        <div className="bg-gray-100 dark:bg-slate-800 rounded-2xl p-6 border border-gray-300 dark:border-slate-700 shadow-sm card-hover">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">Kategori Harcamaları</h3>
          {categoryPieData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={categoryPieData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                  <XAxis type="number" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={(v) => `₺${(v / 1000).toFixed(0)}K`} />
                  <YAxis dataKey="name" type="category" width={80} tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <Tooltip 
                    formatter={(value: any) => formatTRY(Number(value))}
                    contentStyle={{ 
                      backgroundColor: 'rgba(15, 23, 42, 0.9)', 
                      border: 'none', 
                      borderRadius: '12px',
                      color: '#fff'
                    }}
                  />
                  <Bar dataKey="value" fill="#6366f1" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </>
          ) : (
            <div className="h-[200px] flex items-center justify-center text-gray-400">
              Henüz gider kaydı yok
            </div>
          )}
        </div>
      </div>

      {/* Recent Transactions */}
      <div className="bg-gray-100 dark:bg-slate-800 rounded-2xl p-6 border border-gray-300 dark:border-slate-700 shadow-sm card-hover">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white">Son İşlemler</h3>
          <span className="text-xs text-slate-400">Son 5 işlem</span>
        </div>
        <div className="space-y-2">
          {recentTransactions.length === 0 ? (
            <div className="text-center py-8 text-slate-400">
              <Gem size={32} className="mx-auto mb-2 opacity-50" />
              <p>Henüz işlem yok</p>
            </div>
          ) : (
            recentTransactions.map((tx, index) => (
              <div 
                key={tx.id} 
                className="flex items-center justify-between p-3 rounded-xl bg-gray-200 dark:bg-slate-700/50 hover:bg-gray-300 dark:hover:bg-slate-700 transition-colors slide-in"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${
                    tx.type === 'income' ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600' : 
                    tx.type === 'expense' ? 'bg-red-100 dark:bg-red-900/30 text-red-600' : 
                    'bg-blue-100 dark:bg-blue-900/30 text-blue-600'
                  }`}>
                    {tx.type === 'income' ? <TrendingUp size={16} /> : 
                     tx.type === 'expense' ? <TrendingDown size={16} /> : 
                     <Activity size={16} />}
                  </div>
                  <div>
                    <p className="font-medium text-sm text-gray-800 dark:text-white">{tx.description || tx.accounts?.name}</p>
                    <p className="text-xs text-gray-500 dark:text-slate-400">{tx.transaction_date}</p>
                  </div>
                </div>
                <span className={`font-semibold text-sm ${
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

function ReturnCard({ label, value, icon }: { label: string; value: number; icon: React.ReactNode }) {
  const isPositive = value >= 0;
  return (
    <div className="bg-gray-100 dark:bg-slate-800 rounded-2xl p-4 border border-gray-300 dark:border-slate-700 shadow-sm">
      <div className="flex items-center gap-2 mb-2">
        <div className={`p-1.5 rounded-lg ${isPositive ? 'bg-emerald-100 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400' : 'bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400'}`}>
          {icon}
        </div>
        <p className="text-xs text-gray-500 dark:text-slate-400 uppercase tracking-wider">{label}</p>
      </div>
      <p className={`text-lg font-bold ${isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
        {isPositive ? '+' : ''}{formatTRY(value)}
      </p>
    </div>
  );
}

function SummaryCard({ icon, label, value, gradient }: { icon: React.ReactNode; label: string; value: string; gradient: string }) {
  return (
    <div className="bg-gray-100 dark:bg-slate-800 rounded-2xl p-4 border border-gray-300 dark:border-slate-700 shadow-sm card-hover">
      <div className={`inline-flex p-2.5 rounded-xl bg-gradient-to-br ${gradient} text-white mb-3 shadow-lg`}>
        {icon}
      </div>
      <p className="text-xs text-gray-500 dark:text-slate-400 uppercase tracking-wider">{label}</p>
      <p className="text-lg font-bold text-gray-800 dark:text-white mt-0.5">{value}</p>
    </div>
  );
}
