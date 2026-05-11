
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

async function checkCounts() {
  const config = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf8'));
  // Note: The user is using Supabase, but the instructions mention firebase-applet-config.json.
  // Wait, the app is using Supabase. I should check where the Supabase config is.
  // I saw it in src/lib/supabase.ts earlier.
}

async function run() {
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase environment variables');
    return;
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  const { data: brands } = await supabase.from('brands').select('id, name');
  const { data: products } = await supabase.from('products').select('brand_id');

  console.log('Brands in DB:', brands?.length);
  console.log('Products in DB:', products?.length);

  const counts: Record<string, number> = {};
  products?.forEach(p => {
    if (p.brand_id) {
      counts[p.brand_id] = (counts[p.brand_id] || 0) + 1;
    }
  });

  brands?.forEach(b => {
    console.log(`Brand: ${b.name}, Count: ${counts[b.id] || 0}`);
  });
}

run();
