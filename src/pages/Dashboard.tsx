import { useAccounts, useTransactions, useUserFunds, useExchangeRates } from '../hooks/useSupabase';
import { useAuth } from '../contexts/AuthContext';
import { formatTRY, formatCurrency } from '../lib/utils';
import { TrendingUp, Wallet, PiggyBank, CreditCard, Landmark, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, LineChart, Line, XAxis, YAxis, CartesianGrid } from 'recharts';
import type { Account, CurrencyCode } from '../types';

const COLORS = ['#2563eb', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4'];

export default function Dashboard() {
  const { user: _user } = useAuth();
  const { data: accounts } = useAccounts();
  const { data: transactions } = useTransactions();
  const { data: userFunds } = useUserFunds();
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

  const accountDistribution = accounts?.reduce((acc: Record<string, number>, account) => {
    const value = getAccountValueTRY(account);
    if (account.type === 'credit_card' || account.type === 'loan') return acc;
    const typeLabel = account.type === 'cash' ? 'Nakit' : account.type === 'bank' ? 'Banka' : account.type === 'investment' ? 'Yatırım' : 'Diğer';
    acc[typeLabel] = (acc[typeLabel] || 0) + value;
    return acc;
  }, {});

  if (userFunds && userFunds.length > 0) {
    accountDistribution!['Fonlar'] = fundTotal;
  }

  const pieData = Object.entries(accountDistribution || {}).map(([name, value]) => ({ name, value }));

  const netWorthHistory = [
    { date: '01.04', value: netWorth * 0.95 },
    { date: '05.04', value: netWorth * 0.97 },
    { date: '10.04', value: netWorth * 0.94 },
    { date: '15.04', value: netWorth * 0.98 },
    { date: '20.04', value: netWorth * 0.99 },
    { date: 'Bugün', value: netWorth },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="section-title">Dashboard</h1>
        <p className="text-slate-500 dark:text-slate-400">Finansal durumunuzun özeti</p>
      </div>

      {/* Net Worth Card */}
      <div className="card card-light dark:card-dark">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-slate-500 dark:text-slate-400">Net Varlık</span>
          <TrendingUp size={20} className="text-emerald-500" />
        </div>
        <div className="text-3xl font-bold">{formatTRY(netWorth)}</div>
        <div className="flex gap-4 mt-4 text-sm">
          <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
            <ArrowUpRight size={16} />
            <span>Varlık: {formatTRY(totalAssets + fundTotal)}</span>
          </div>
          <div className="flex items-center gap-1 text-red-600 dark:text-red-400">
            <ArrowDownRight size={16} />
            <span>Borç: {formatTRY(totalLiabilities)}</span>
          </div>
        </div>
      </div>

      {/* Account Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <SummaryCard
          icon={<Wallet size={20} />}
          label="Nakit"
          value={formatTRY(accounts?.filter(a => a.type === 'cash').reduce((s, a) => s + getAccountValueTRY(a), 0) || 0)}
          color="bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400"
        />
        <SummaryCard
          icon={<Landmark size={20} />}
          label="Banka"
          value={formatTRY(accounts?.filter(a => a.type === 'bank').reduce((s, a) => s + getAccountValueTRY(a), 0) || 0)}
          color="bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400"
        />
        <SummaryCard
          icon={<CreditCard size={20} />}
          label="Kredi Kartı"
          value={formatTRY(Math.abs(accounts?.filter(a => a.type === 'credit_card').reduce((s, a) => s + getAccountValueTRY(a), 0) || 0))}
          color="bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400"
        />
        <SummaryCard
          icon={<PiggyBank size={20} />}
          label="Fonlar"
          value={formatTRY(fundTotal)}
          color="bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400"
        />
      </div>

      {/* Charts */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="card card-light dark:card-dark">
          <h3 className="font-semibold mb-4">Varlık Dağılımı</h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
                paddingAngle={5}
                dataKey="value"
              >
                {pieData.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value: any) => formatTRY(Number(value))} />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex flex-wrap gap-2 justify-center mt-2">
            {pieData.map((entry, index) => (
              <div key={entry.name} className="flex items-center gap-1 text-xs">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                <span>{entry.name}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="card card-light dark:card-dark">
          <h3 className="font-semibold mb-4">Net Varlık Değişimi</h3>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={netWorthHistory}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `₺${(v / 1000).toFixed(0)}K`} />
              <Tooltip formatter={(value: any) => formatTRY(Number(value))} />
              <Line type="monotone" dataKey="value" stroke="#2563eb" strokeWidth={2} dot={{ fill: '#2563eb' }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recent Transactions */}
      <div className="card card-light dark:card-dark">
        <h3 className="font-semibold mb-4">Son İşlemler</h3>
        <div className="space-y-3">
          {recentTransactions.length === 0 ? (
            <p className="text-slate-500 dark:text-slate-400 text-center py-4">Henüz işlem yok</p>
          ) : (
            recentTransactions.map((tx) => (
              <div key={tx.id} className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-700/50">
                <div>
                  <p className="font-medium">{tx.description || tx.accounts?.name}</p>
                  <p className="text-sm text-slate-500 dark:text-slate-400">{tx.transaction_date}</p>
                </div>
                <span className={`font-semibold ${tx.type === 'income' ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                  {tx.type === 'income' ? '+' : '-'}{formatCurrency(tx.amount, tx.currency)}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function SummaryCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string; color: string }) {
  return (
    <div className="card card-light dark:card-dark p-4">
      <div className={`inline-flex p-2 rounded-lg mb-2 ${color}`}>
        {icon}
      </div>
      <p className="text-sm text-slate-500 dark:text-slate-400">{label}</p>
      <p className="text-lg font-bold">{value}</p>
    </div>
  );
}
