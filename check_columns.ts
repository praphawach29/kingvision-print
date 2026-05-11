
import { createClient } from '@supabase/supabase-js';

async function run() {
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase environment variables');
    return;
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  const { data, error } = await supabase.from('products').select('*').limit(1);
  if (data && data.length > 0) {
    console.log('Product columns:', Object.keys(data[0]));
    console.log('Sample product:', data[0]);
  } else {
    console.log('No products found or error:', error);
  }
}

run();
