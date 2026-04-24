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
    mutationFn: async (account: Omit<Account, 'id' | 'user_id' | 'created_at'>) => {
      const { data: { session } } = await supabase.auth.getSession();
      const userId = session?.user?.id;
      if (!userId) throw new Error('Oturum bulunamadı');
      const { data, error } = await supabase.from('accounts').insert({ ...account, user_id: userId } as any).select().single();
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
    mutationFn: async (transaction: Omit<Transaction, 'id' | 'user_id' | 'created_at'>) => {
      const { data: { session } } = await supabase.auth.getSession();
      const userId = session?.user?.id;
      if (!userId) throw new Error('Oturum bulunamadı');
      const { data, error } = await supabase.from('transactions').insert({ ...transaction, user_id: userId } as any).select().single();
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
      return data as Category[];
    },
  });
}

export function useExchangeRates() {
  return useQuery({
    queryKey: ['exchange_rates'],
    queryFn: async () => {
      const { data, error } = await supabase.from('exchange_rates').select('*');
      if (error) throw error;
      return data as ExchangeRate[];
    },
  });
}

export function useUpdateExchangeRates() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const response = await fetch('https://www.tcmb.gov.tr/kurlar/today.xml');
      const xmlText = await response.text();
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(xmlText, 'text/xml');
      const currencies = xmlDoc.querySelectorAll('Currency');
      
      const rates: Partial<ExchangeRate>[] = [];
      
      currencies.forEach((currency) => {
        const code = currency.getAttribute('Kod');
        const forexBuying = currency.querySelector('ForexBuying')?.textContent;
        if (code && forexBuying) {
          rates.push({
            currency_code: code as any,
            rate_to_try: parseFloat(forexBuying),
            rate_type: ['XAU', 'XAG', 'CUM', 'YAR', 'TAM'].includes(code) ? 'altin' : 'doviz',
            updated_at: new Date().toISOString(),
          });
        }
      });

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
    mutationFn: async (userFund: Omit<UserFund, 'id' | 'user_id' | 'current_price' | 'last_price_update' | 'created_at'>) => {
      const { data: { session } } = await supabase.auth.getSession();
      const userId = session?.user?.id;
      if (!userId) throw new Error('Oturum bulunamadı');
      const { data, error } = await supabase.from('user_funds').insert({
        ...userFund,
        user_id: userId,
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
