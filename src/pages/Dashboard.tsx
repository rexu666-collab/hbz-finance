import { useAccounts, useTransactions, useUserFunds, useExchangeRates } from '../hooks/useSupabase';
import { useAuth } from '../contexts/AuthContext';
import { formatTRY, formatCurrency } from '../lib/utils';
import { 
  TrendingUp, TrendingDown, Wallet, CreditCard, 
  Landmark, ArrowUpRight, ArrowDownRight, Activity,
  Coins, Gem
} from 'lucide-react';
import { 
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip, 
  AreaChart, Area, XAxis, YAxis, CartesianGrid 
} from 'recharts';
import type { Account, CurrencyCode } from '../types';

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4'];

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

  // Net worth history (mock data for now - will be real when net_worth_history is populated)
  const netWorthHistory = [
    { date: '01.04', value: netWorth * 0.95 },
    { date: '05.04', value: netWorth * 0.97 },
    { date: '10.04', value: netWorth * 0.94 },
    { date: '15.04', value: netWorth * 0.98 },
    { date: '20.04', value: netWorth * 0.99 },
    { date: 'Bugün', value: netWorth },
  ];

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

      {/* Net Worth Card - Hero */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 p-6 text-white shadow-xl shadow-indigo-500/20">
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/20 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/10 rounded-full blur-2xl" />
        </div>
        <div className="relative z-10">
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

      {/* Charts */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Asset Distribution */}
        <div className="bg-gray-100 dark:bg-slate-800 rounded-2xl p-6 border border-gray-300 dark:border-slate-700 shadow-sm card-hover">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">Varlık Dağılımı</h3>
          {pieData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={85}
                    paddingAngle={4}
                    dataKey="value"
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
                      color: '#fff'
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-wrap gap-3 justify-center mt-2">
                {pieData.map((entry, index) => (
                  <div key={entry.name} className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-slate-400">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                    <span>{entry.name}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="h-[220px] flex items-center justify-center text-slate-400">
              Henüz veri yok
            </div>
          )}
        </div>

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
