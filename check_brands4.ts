import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.VITE_SUPABASE_ANON_KEY!);

async function check() {
  const res = await fetch(`${process.env.VITE_SUPABASE_URL}/rest/v1/brands?limit=1`, {
    headers: {
      apikey: process.env.VITE_SUPABASE_ANON_KEY!,
      Authorization: `Bearer ${process.env.VITE_SUPABASE_ANON_KEY!}`
    }
  });
  const data = await res.json();
  console.log('Data:', data);
}
check();
