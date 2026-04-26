import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import type { Account, Transaction, Category, Fund, UserFund, ExchangeRate, CreditCard, Note, NetWorthHistory } from '../types';

export function useAccounts() {
  return useQuery({
    queryKey: ['accounts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('accounts')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as Account[];
    },
  });
}

export function useCreateAccount() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (account: Omit<Account, 'id' | 'created_at'>) => {
      const { data, error } = await supabase.from('accounts').insert(account as any).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['accounts'] }),
  });
}

export function useUpdateAccount() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Account> & { id: string }) => {
      const { data, error } = await supabase.from('accounts').update(updates as any).eq('id', id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['accounts'] }),
  });
}

export function useDeleteAccount() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('accounts').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['accounts'] }),
  });
}

export function useTransactions() {
  return useQuery({
    queryKey: ['transactions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('transactions')
        .select('*, accounts(name), categories(name), credit_cards(name)')
        .order('transaction_date', { ascending: false });
      if (error) throw error;
      return data as (Transaction & { accounts: { name: string }; categories: { name: string } | null; credit_cards: { name: string } | null })[];
    },
  });
}

export function useCreateTransaction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (transaction: Omit<Transaction, 'id' | 'created_at'>) => {
      const count = transaction.installment_count || 1;
      const isInstallment = count > 1;
      const monthlyAmount = isInstallment ? transaction.amount / count : transaction.amount;

      // Insert main/first record
      const { data: parentTx, error: txError } = await supabase
        .from('transactions')
        .insert({ ...transaction, amount: monthlyAmount, installment_number: 1 } as any)
        .select()
        .single();
      if (txError) throw txError;

      // Insert remaining installment records
      if (isInstallment && parentTx) {
        const installments = [];
        for (let i = 2; i <= count; i++) {
          const nextDate = new Date(transaction.transaction_date);
          nextDate.setMonth(nextDate.getMonth() + (i - 1));
          installments.push({
            ...transaction,
            amount: monthlyAmount,
            installment_number: i,
            parent_transaction_id: parentTx.id,
            transaction_date: nextDate.toISOString().split('T')[0],
          });
        }
        if (installments.length > 0) {
          const { error: instError } = await supabase.from('transactions').insert(installments as any);
          if (instError) throw instError;
        }
      }

      // Update account balance (only if account_id exists)
      if (transaction.account_id) {
        const { data: account } = await supabase.from('accounts').select('balance').eq('id', transaction.account_id).single();
        if (account) {
          const delta = transaction.type === 'income' ? transaction.amount : transaction.type === 'expense' ? -transaction.amount : 0;
          const newBalance = (account.balance || 0) + delta;
          await supabase.from('accounts').update({ balance: newBalance }).eq('id', transaction.account_id);
        }
      }

      // Update credit card debt (full amount at once for installments too)
      if (transaction.credit_card_id && transaction.type === 'expense') {
        const { data: card } = await supabase.from('credit_cards').select('current_debt').eq('id', transaction.credit_card_id).single();
        if (card) {
          const newDebt = (card.current_debt || 0) + transaction.amount;
          await supabase.from('credit_cards').update({ current_debt: newDebt }).eq('id', transaction.credit_card_id);
        }
      }

      return parentTx;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['credit_cards'] });
    },
  });
}

export function useUpdateTransaction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Transaction> & { id: string }) => {
      const { data, error } = await supabase.from('transactions').update(updates as any).eq('id', id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
    },
  });
}

export function useDeleteTransaction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('transactions').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
    },
  });
}

export function useCategories() {
  return useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const { data, error } = await supabase.from('categories').select('*').order('name');
      if (error) throw error;
      // Deduplicate by name+type; prefer user categories over defaults
      const unique = new Map<string, Category>();
      (data as Category[]).forEach((cat) => {
        const key = `${cat.type}-${cat.name}`;
        const existing = unique.get(key);
        if (!existing || (!existing.user_id && cat.user_id)) {
          unique.set(key, cat);
        }
      });
      return Array.from(unique.values());
    },
  });
}

export function useCreateCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (category: Omit<Category, 'id' | 'created_at'>) => {
      const { data, error } = await supabase.from('categories').insert(category as any).select().single();
      if (error) throw error;
      return data as Category;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['categories'] }),
  });
}

export function useDeleteCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('categories').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['categories'] }),
  });
}

// Truncgil API mapping
const TRUNCGIL_MAP: Record<string, { code: string; rate_type: 'doviz' | 'altin' }> = {
  'USD': { code: 'USD', rate_type: 'doviz' },
  'EUR': { code: 'EUR', rate_type: 'doviz' },
  'GBP': { code: 'GBP', rate_type: 'doviz' },
  'CHF': { code: 'CHF', rate_type: 'doviz' },
  'JPY': { code: 'JPY', rate_type: 'doviz' },
  'gram-altin': { code: 'XAU', rate_type: 'altin' },
  'gumus': { code: 'XAG', rate_type: 'altin' },
  'ceyrek-altin': { code: 'CUM', rate_type: 'altin' },
  'yarim-altin': { code: 'YAR', rate_type: 'altin' },
  'tam-altin': { code: 'TAM', rate_type: 'altin' },
  'cumhuriyet-altini': { code: 'CUMH', rate_type: 'altin' },
  'ata-altin': { code: 'ATA', rate_type: 'altin' },
  '22-ayar-bilezik': { code: 'BILEZIK', rate_type: 'altin' },
};

function parseTruncgilValue(val: string): number {
  // Truncgil values use comma as decimal separator and dot as thousands separator
  // e.g. "6.815,04" or "45,0379"
  return parseFloat(val.replace(/\./g, '').replace(',', '.'));
}

export function useExchangeRates() {
  return useQuery({
    queryKey: ['exchange_rates'],
    queryFn: async () => {
      const res = await fetch('https://finans.truncgil.com/v3/today.json');
      const json = await res.json();

      const apiRates: ExchangeRate[] = [];

      for (const [key, meta] of Object.entries(TRUNCGIL_MAP)) {
        const item = json[key];
        if (item && item.Selling) {
          const rate = parseTruncgilValue(item.Selling);
          if (!isNaN(rate) && rate > 0) {
            apiRates.push({
              currency_code: meta.code as any,
              rate_to_try: rate,
              rate_type: meta.rate_type,
              updated_at: new Date().toISOString(),
            });
          }
        }
      }

      // TRY is always 1
      apiRates.push({
        currency_code: 'TRY',
        rate_to_try: 1,
        rate_type: 'doviz',
        updated_at: new Date().toISOString(),
      });

      // Persist to Supabase
      for (const rate of apiRates) {
        await supabase.from('exchange_rates').upsert(rate as any, { onConflict: 'currency_code' });
      }

      return apiRates;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

export function useUpdateExchangeRates() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const res = await fetch('https://finans.truncgil.com/v3/today.json');
      const json = await res.json();

      const rates: Partial<ExchangeRate>[] = [];
      for (const [key, meta] of Object.entries(TRUNCGIL_MAP)) {
        const item = json[key];
        if (item && item.Selling) {
          const rate = parseTruncgilValue(item.Selling);
          if (!isNaN(rate) && rate > 0) {
            rates.push({
              currency_code: meta.code as any,
              rate_to_try: rate,
              rate_type: meta.rate_type,
            });
          }
        }
      }
      rates.push({ currency_code: 'TRY', rate_to_try: 1, rate_type: 'doviz' });

      for (const rate of rates) {
        await supabase.from('exchange_rates').upsert(rate as any, { onConflict: 'currency_code' });
      }

      return rates;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['exchange_rates'] }),
  });
}

export function useFunds() {
  return useQuery({
    queryKey: ['funds'],
    queryFn: async () => {
      const { data, error } = await supabase.from('funds').select('*').order('name');
      if (error) throw error;
      return data as Fund[];
    },
  });
}

export function useUserFunds() {
  return useQuery({
    queryKey: ['user_funds'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_funds')
        .select('*, funds(*)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as (UserFund & { funds: Fund })[];
    },
  });
}

export function useCreateUserFund() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (userFund: Omit<UserFund, 'id' | 'current_price' | 'last_price_update' | 'created_at'>) => {
      const { data, error } = await supabase.from('user_funds').insert({
        ...userFund,
        current_price: userFund.purchase_price,
      } as any).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['user_funds'] }),
  });
}

export function useUpdateUserFund() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, current_price }: { id: string; current_price: number }) => {
      const { data, error } = await supabase
        .from('user_funds')
        .update({ current_price, last_price_update: new Date().toISOString() } as any)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['user_funds'] }),
  });
}

export function useDeleteUserFund() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('user_funds').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['user_funds'] }),
  });
}

// Credit Cards
export function useCreditCards() {
  return useQuery({
    queryKey: ['credit_cards'],
    queryFn: async () => {
      const { data, error } = await supabase.from('credit_cards').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return data as CreditCard[];
    },
  });
}

export function useCreateCreditCard() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (card: Omit<CreditCard, 'id' | 'created_at'>) => {
      const { data, error } = await supabase.from('credit_cards').insert(card as any).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['credit_cards'] }),
  });
}

export function useUpdateCreditCard() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<CreditCard> & { id: string }) => {
      const { data, error } = await supabase.from('credit_cards').update(updates as any).eq('id', id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['credit_cards'] }),
  });
}

export function useDeleteCreditCard() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('credit_cards').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['credit_cards'] }),
  });
}

export function useNetWorthHistory() {
  return useQuery({
    queryKey: ['net_worth_history'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('net_worth_history')
        .select('*')
        .order('record_date', { ascending: true });
      if (error) throw error;
      return data as NetWorthHistory[];
    },
  });
}

// Notes
export function useNotes() {
  return useQuery({
    queryKey: ['notes'],
    queryFn: async () => {
      const { data, error } = await supabase.from('notes').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return data as Note[];
    },
  });
}

export function useCreateNote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (note: Omit<Note, 'id' | 'created_at'>) => {
      const { data, error } = await supabase.from('notes').insert(note as any).select().single();
      if (error) throw error;
      return data as Note;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notes'] }),
  });
}

export function useUpdateNote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Note> & { id: string }) => {
      const { data, error } = await supabase.from('notes').update(updates as any).eq('id', id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notes'] }),
  });
}

export function useDeleteNote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('notes').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notes'] }),
  });
}
