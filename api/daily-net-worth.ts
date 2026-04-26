import { createClient } from '@supabase/supabase-js';

export const config = {
  runtime: 'edge',
};

export default async function handler(request: Request) {
  // Optional secret check
  const url = new URL(request.url);
  const secret = url.searchParams.get('secret');
  const expectedSecret = process.env.CRON_SECRET;
  if (expectedSecret && secret !== expectedSecret) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

  if (!supabaseUrl || !supabaseKey) {
    return new Response(JSON.stringify({ error: 'Missing Supabase credentials' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false },
  });

  try {
    // Get all users with profiles
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id');

    if (profilesError) throw profilesError;
    if (!profiles || profiles.length === 0) {
      return new Response(JSON.stringify({ message: 'No users found' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const today = new Date().toISOString().split('T')[0];
    const results = [];

    for (const profile of profiles) {
      const userId = profile.id;

      // Get accounts
      const { data: accounts } = await supabase
        .from('accounts')
        .select('*')
        .eq('user_id', userId);

      // Get exchange rates
      const { data: rates } = await supabase
        .from('exchange_rates')
        .select('*');

      const getRate = (currency: string) => {
        if (currency === 'TRY') return 1;
        const rate = rates?.find((r: any) => r.currency_code === currency);
        return rate?.rate_to_try || 1;
      };

      const totalAssets = accounts?.reduce((sum: number, acc: any) => {
        return sum + (acc.balance * getRate(acc.currency));
      }, 0) || 0;

      // Get funds
      const { data: userFunds } = await supabase
        .from('user_funds')
        .select('shares, current_price')
        .eq('user_id', userId);

      const fundTotal = userFunds?.reduce((sum: number, uf: any) => {
        return sum + (uf.shares * uf.current_price);
      }, 0) || 0;

      // Get credit card debt
      const { data: creditCards } = await supabase
        .from('credit_cards')
        .select('current_debt')
        .eq('user_id', userId);

      const creditCardDebt = creditCards?.reduce((sum: number, c: any) => sum + c.current_debt, 0) || 0;

      const netWorth = totalAssets + fundTotal - creditCardDebt;

      // Upsert net worth history
      const { error: upsertError } = await supabase
        .from('net_worth_history')
        .upsert({
          user_id: userId,
          total_try: netWorth,
          record_date: today,
        }, { onConflict: 'user_id, record_date' });

      if (upsertError) {
        results.push({ userId, error: upsertError.message });
      } else {
        results.push({ userId, total_try: netWorth, record_date: today });
      }
    }

    return new Response(JSON.stringify({ success: true, count: results.length, results }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
