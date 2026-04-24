import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import type { Account, Transaction, Category, Fund, UserFund, ExchangeRate } from '../types';

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
        .select('*, accounts(name), categories(name)')
        .order('transaction_date', { ascending: false });
      if (error) throw error;
      return data as (Transaction & { accounts: { name: string }; categories: { name: string } | null })[];
    },
  });
}

export function useCreateTransaction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (transaction: Omit<Transaction, 'id' | 'created_at'>) => {
      const { data: txData, error: txError } = await supabase.from('transactions').insert(transaction as any).select().single();
      if (txError) throw txError;
      
      // Update account balance
      const { data: account } = await supabase.from('accounts').select('balance').eq('id', transaction.account_id).single();
      if (account) {
        const delta = transaction.type === 'income' ? transaction.amount : transaction.type === 'expense' ? -transaction.amount : 0;
        const newBalance = (account.balance || 0) + delta;
        await supabase.from('accounts').update({ balance: newBalance }).eq('id', transaction.account_id);
      }
      
      return txData;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
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
      // Remove duplicates by name (same user may have duplicate entries)
      const seen = new Set<string>();
      return (data as Category[]).filter((cat) => {
        if (seen.has(cat.name)) return false;
        seen.add(cat.name);
        return true;
      });
    },
  });
}

export function useExchangeRates() {
  return useQuery({
    queryKey: ['exchange_rates'],
    queryFn: async () => {
      // Fetch live doviz rates from free API (TRY base -> inverse to get rate_to_try)
      const res = await fetch('https://open.er-api.com/v6/latest/TRY');
      const json = await res.json();
      if (json.result !== 'success') throw new Error('Exchange rate API failed');

      const apiRates: ExchangeRate[] = [];
      const dovizCodes = ['USD', 'EUR', 'GBP', 'CHF', 'JPY'];

      for (const code of dovizCodes) {
        const val = json.rates?.[code];
        if (typeof val === 'number') {
          apiRates.push({
            currency_code: code as any,
            rate_to_try: 1 / val,
            rate_type: 'doviz',
            updated_at: new Date().toISOString(),
          });
        }
      }

      // TRY is always 1
      apiRates.push({
        currency_code: 'TRY',
        rate_to_try: 1,
        rate_type: 'doviz',
        updated_at: new Date().toISOString(),
      });

      // Fallback: fetch altin rates from Supabase (not available in free API)
      const { data: sbRates, error } = await supabase
        .from('exchange_rates')
        .select('*')
        .in('currency_code', ['XAU', 'XAG', 'CUM', 'YAR', 'TAM']);
      if (!error && sbRates) {
        apiRates.push(...(sbRates as ExchangeRate[]));
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
      const res = await fetch('https://open.er-api.com/v6/latest/TRY');
      const json = await res.json();
      if (json.result !== 'success') throw new Error('Exchange rate API failed');

      const rates: Partial<ExchangeRate>[] = [
        { currency_code: 'USD', rate_to_try: 1 / json.rates.USD, rate_type: 'doviz' },
        { currency_code: 'EUR', rate_to_try: 1 / json.rates.EUR, rate_type: 'doviz' },
        { currency_code: 'GBP', rate_to_try: 1 / json.rates.GBP, rate_type: 'doviz' },
        { currency_code: 'CHF', rate_to_try: 1 / json.rates.CHF, rate_type: 'doviz' },
        { currency_code: 'JPY', rate_to_try: 1 / json.rates.JPY, rate_type: 'doviz' },
        { currency_code: 'TRY', rate_to_try: 1, rate_type: 'doviz' },
      ];

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
