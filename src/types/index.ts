export interface Profile {
  id: string;
  username: string;
  full_name: string | null;
  created_at: string;
}

export type AccountType = 'bank' | 'doviz' | 'altin';
export type TransactionType = 'income' | 'expense' | 'transfer';
export type PaymentMethod = 'havale' | 'eft' | 'credit_card' | 'cash' | 'other';
export type CurrencyCode = 'TRY' | 'USD' | 'EUR' | 'GBP' | 'CHF' | 'JPY' | 'XAU' | 'XAG' | 'CUM' | 'YAR' | 'TAM' | 'ATA' | 'CUMH' | 'BILEZIK';

export interface Account {
  id: string;
  user_id: string;
  name: string;
  type: AccountType;
  currency: CurrencyCode;
  balance: number;
  initial_balance: number;
  color: string;
  icon: string;
  created_at: string;
}

export interface Transaction {
  id: string;
  user_id: string;
  account_id: string | null;
  type: TransactionType;
  category_id: string | null;
  amount: number;
  currency: CurrencyCode;
  description: string;
  payment_method: PaymentMethod;
  credit_card_id: string | null;
  installment_count: number;
  installment_number: number;
  parent_transaction_id: string | null;
  is_recurring: boolean;
  recurring_interval: string | null;
  recurring_day: number | null;
  transaction_date: string;
  created_at: string;
}

export interface Category {
  id: string;
  user_id: string | null;
  name: string;
  type: 'income' | 'expense';
  color: string;
  icon: string;
  is_default: boolean;
}

export interface ExchangeRate {
  currency_code: CurrencyCode;
  rate_to_try: number;
  rate_type: 'doviz' | 'altin';
  updated_at: string;
}

export interface Fund {
  code: string;
  name: string;
  category: string;
  company: string;
  currency: string;
}

export interface UserFund {
  id: string;
  user_id: string;
  fund_code: string;
  shares: number;
  purchase_price: number;
  current_price: number;
  last_price_update: string;
  created_at: string;
  fund?: Fund;
}

export interface NetWorthHistory {
  id: string;
  user_id: string;
  total_try: number;
  record_date: string;
}

export interface CreditCard {
  id: string;
  user_id: string;
  name: string;
  bank_name: string | null;
  card_last_four: string | null;
  credit_limit: number;
  current_debt: number;
  statement_date: number | null;
  due_date: number | null;
  color: string;
  icon: string;
  created_at: string;
}

export const CURRENCY_SYMBOLS: Record<string, string> = {
  TRY: '₺',
  USD: '$',
  EUR: '€',
  GBP: '£',
  CHF: 'Fr',
  JPY: '¥',
  XAU: 'gr',
  XAG: 'gr',
  CUM: 'adet',
  YAR: 'adet',
  TAM: 'adet',
  ATA: 'adet',
  CUMH: 'adet',
  BILEZIK: 'gr',
};

export const CURRENCY_LABELS: Record<string, string> = {
  TRY: 'Türk Lirası',
  USD: 'Amerikan Doları',
  EUR: 'Euro',
  GBP: 'İngiliz Sterlini',
  CHF: 'İsviçre Frangı',
  JPY: 'Japon Yeni',
  XAU: 'Gram Altın',
  XAG: 'Gram Gümüş',
  CUM: 'Çeyrek Altın',
  YAR: 'Yarım Altın',
  TAM: 'Tam Altın',
  ATA: 'Ata Altın',
  CUMH: 'Cumhuriyet Altını',
  BILEZIK: '22 Ayar Bilezik',
};

export const ACCOUNT_TYPE_LABELS: Record<AccountType, string> = {
  bank: 'Banka Hesabı',
  doviz: 'Döviz Hesabı',
  altin: 'Altın Hesabı',
};

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  havale: 'Havale',
  eft: 'EFT',
  credit_card: 'Kredi Kartı',
  cash: 'Nakit',
  other: 'Diğer',
};

export const ACCOUNT_COLORS = [
  '#2563eb', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899',
  '#06b6d4', '#84cc16', '#f97316', '#6366f1',
];

export const DEFAULT_CATEGORIES: Omit<Category, 'id' | 'user_id'>[] = [
  { name: 'Maaş', type: 'income', color: '#10b981', icon: 'briefcase', is_default: true },
  { name: 'Ek Gelir', type: 'income', color: '#3b82f6', icon: 'trending-up', is_default: true },
  { name: 'Market', type: 'expense', color: '#f59e0b', icon: 'shopping-cart', is_default: true },
  { name: 'Fatura', type: 'expense', color: '#ef4444', icon: 'zap', is_default: true },
  { name: 'Ulaşım', type: 'expense', color: '#8b5cf6', icon: 'car', is_default: true },
  { name: 'Sağlık', type: 'expense', color: '#ec4899', icon: 'heart', is_default: true },
  { name: 'Eğlence', type: 'expense', color: '#06b6d4', icon: 'film', is_default: true },
  { name: 'Eğitim', type: 'expense', color: '#6366f1', icon: 'book-open', is_default: true },
  { name: 'Yatırım', type: 'expense', color: '#84cc16', icon: 'bar-chart-2', is_default: true },
];
