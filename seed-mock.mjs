import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://iezgxfitxnmettaayfod.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_WoySeEQE9324Z2ZnREL1YQ_0JWYkhCl';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const AGENT_ID = 'f66013a3-bd83-415b-ab5c-0344080cb273'; // Ruslan

const clients = [
  {
    name: 'Шерзод',
    phone: '+998901234567',
    deals: [
      {
        id: `DEAL-${Date.now()}-1`,
        product: 'MacBook Pro 16 M3 Max',
        totalAmount: 3500,
        monthlyAmount: 583.33,
        months: 6,
        paidMonths: 2,
        status: 'active',
        startDate: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
        payments: [
          { monthNumber: 1, amount: 583.33, status: 'paid', paidDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), dueDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString() },
          { monthNumber: 2, amount: 583.33, status: 'paid', paidDate: new Date().toISOString(), dueDate: new Date().toISOString() },
          { monthNumber: 3, amount: 583.33, status: 'pending', dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() },
          { monthNumber: 4, amount: 583.33, status: 'pending', dueDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString() },
          { monthNumber: 5, amount: 583.33, status: 'pending', dueDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString() },
          { monthNumber: 6, amount: 583.33, status: 'pending', dueDate: new Date(Date.now() + 120 * 24 * 60 * 60 * 1000).toISOString() },
        ]
      }
    ]
  },
  {
    name: 'Нилуфар',
    phone: '+998911122334',
    deals: [
      {
        id: `DEAL-${Date.now()}-2`,
        product: 'Dyson Airwrap',
        totalAmount: 600,
        monthlyAmount: 100,
        months: 6,
        paidMonths: 1,
        status: 'active',
        startDate: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000).toISOString(),
        payments: [
          { monthNumber: 1, amount: 100, status: 'paid', paidDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(), dueDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString() },
          { monthNumber: 2, amount: 100, status: 'overdue', dueDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(), overdueDays: 5 },
          { monthNumber: 3, amount: 100, status: 'pending', dueDate: new Date(Date.now() + 25 * 24 * 60 * 60 * 1000).toISOString() },
          { monthNumber: 4, amount: 100, status: 'pending', dueDate: new Date(Date.now() + 55 * 24 * 60 * 60 * 1000).toISOString() },
          { monthNumber: 5, amount: 100, status: 'pending', dueDate: new Date(Date.now() + 85 * 24 * 60 * 60 * 1000).toISOString() },
          { monthNumber: 6, amount: 100, status: 'pending', dueDate: new Date(Date.now() + 115 * 24 * 60 * 60 * 1000).toISOString() },
        ]
      },
      {
        id: `DEAL-${Date.now()}-3`,
        product: 'iPhone 15 Pro Max',
        totalAmount: 1500,
        monthlyAmount: 250,
        months: 6,
        paidMonths: 0,
        status: 'active',
        startDate: new Date().toISOString(),
        payments: [
          { monthNumber: 1, amount: 250, status: 'extended', dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(), extendedDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString() },
          { monthNumber: 2, amount: 250, status: 'pending', dueDate: new Date(Date.now() + 32 * 24 * 60 * 60 * 1000).toISOString() },
          { monthNumber: 3, amount: 250, status: 'pending', dueDate: new Date(Date.now() + 62 * 24 * 60 * 60 * 1000).toISOString() },
          { monthNumber: 4, amount: 250, status: 'pending', dueDate: new Date(Date.now() + 92 * 24 * 60 * 60 * 1000).toISOString() },
          { monthNumber: 5, amount: 250, status: 'pending', dueDate: new Date(Date.now() + 122 * 24 * 60 * 60 * 1000).toISOString() },
          { monthNumber: 6, amount: 250, status: 'pending', dueDate: new Date(Date.now() + 152 * 24 * 60 * 60 * 1000).toISOString() },
        ]
      }
    ]
  },
  {
    name: 'Фаррух',
    phone: '+998997776655',
    deals: [
      {
        id: `DEAL-${Date.now()}-4`,
        product: 'Samsung S24 Ultra',
        totalAmount: 1200,
        monthlyAmount: 400,
        months: 3,
        paidMonths: 3,
        status: 'completed',
        startDate: new Date(Date.now() - 100 * 24 * 60 * 60 * 1000).toISOString(),
        payments: [
          { monthNumber: 1, amount: 400, status: 'paid', paidDate: new Date(Date.now() - 70 * 24 * 60 * 60 * 1000).toISOString(), dueDate: new Date(Date.now() - 70 * 24 * 60 * 60 * 1000).toISOString() },
          { monthNumber: 2, amount: 400, status: 'paid', paidDate: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000).toISOString(), dueDate: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000).toISOString() },
          { monthNumber: 3, amount: 400, status: 'paid', paidDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(), dueDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString() },
        ]
      }
    ]
  }
];

async function seed() {
  console.log('Authenticating...');
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: 'ruslan@trust-network.uz',
    password: 'trust123'
  });

  if (authError) {
    console.error('Auth error:', authError);
    return;
  }
  console.log('Authenticated successfully!');

  for (const client of clients) {
    for (const deal of client.deals) {
      console.log(`Inserting deal ${deal.id} for ${client.name}...`);
      
      const { error: dealError } = await supabase.from('deals').insert({
        id: deal.id,
        agent_id: AGENT_ID,
        client: client.name,
        phone: client.phone,
        product: deal.product,
        total_amount: deal.totalAmount,
        monthly_amount: deal.monthlyAmount,
        months: deal.months,
        paid_months: deal.paidMonths,
        start_date: deal.startDate,
        status: deal.status
      });

      if (dealError) {
        console.error('Error inserting deal:', dealError);
        continue;
      }

      const payments = deal.payments.map(p => ({
        id: `PAY-${deal.id}-${p.monthNumber}`,
        deal_id: deal.id,
        month_number: p.monthNumber,
        due_date: p.dueDate,
        paid_date: p.paidDate || null,
        extended_date: p.extendedDate || null,
        amount: p.amount,
        status: p.status,
        overdue_days: p.overdueDays || null
      }));

      const { error: paymentsError } = await supabase.from('payments').insert(payments);
      
      if (paymentsError) {
        console.error('Error inserting payments:', paymentsError);
      } else {
        console.log(`Inserted ${payments.length} payments for deal ${deal.id}`);
      }
    }
  }

  console.log('Seed completed successfully!');
}

seed();
