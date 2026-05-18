import { createClient } from '@supabase/supabase-js';

export default async function handler(req: any, res: any) {
  if (req.method !== 'GET') return res.status(405).end();

  const quotationNumber = req.query.q as string;
  if (!quotationNumber) return res.status(400).json({ error: 'q (quotation_number) is required' });

  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
  const serviceKey  = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  if (!supabaseUrl || !serviceKey) return res.status(500).json({ error: 'Server config error' });

  const db = createClient(supabaseUrl, serviceKey);

  const [{ data: q, error }, { data: store }] = await Promise.all([
    db.from('quotations').select('*').eq('quotation_number', quotationNumber).single(),
    db.from('store_settings').select('store_name,phone_main,address,contact_email,logo_url,signature_url').single(),
  ]);

  if (error || !q) return res.status(404).json({ error: 'Quotation not found' });

  res.setHeader('Cache-Control', 'no-store');
  return res.json({ quotation: q, store });
}
