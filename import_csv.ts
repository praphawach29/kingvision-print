import fs from 'fs';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

function parseCSV(text: string) {
  const result = [];
  let row = [];
  let inQuotes = false;
  let currentVal = '';
  
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      row.push(currentVal.trim());
      currentVal = '';
    } else if (char === '\n' && !inQuotes) {
      row.push(currentVal.trim());
      result.push(row);
      row = [];
      currentVal = '';
    } else if (char === '\r' && !inQuotes) {
      // ignore
    } else {
      currentVal += char;
    }
  }
  if (currentVal || row.length > 0) {
    row.push(currentVal.trim());
    result.push(row);
  }
  return result;
}

async function importData() {
  const csvText = fs.readFileSync('products.csv', 'utf-8');
  const rows = parseCSV(csvText);
  
  // Skip header
  const dataRows = rows.slice(1).filter(row => row.length >= 5);
  
  console.log(`Found ${dataRows.length} products to import.`);
  
  for (const row of dataRows) {
    const [category, brand, title, type, priceStr] = row;
    
    // Parse price
    let price = 0;
    if (priceStr) {
      price = parseInt(priceStr.replace(/,/g, ''), 10);
    }
    
    if (isNaN(price)) price = 0;
    
    // Check if product exists
    const { data: existing } = await supabase
      .from('products')
      .select('id')
      .eq('title', title)
      .single();
      
    const productData = {
      title,
      brand,
      category,
      price,
      short_description: type,
      stock: 10, // Default stock
      is_new: true,
      grade: 'A',
      condition: 'ใหม่'
    };
    
    if (existing) {
      console.log(`Updating: ${title}`);
      const { error } = await supabase
        .from('products')
        .update(productData)
        .eq('id', existing.id);
      if (error) console.error(`Error updating ${title}:`, error);
    } else {
      console.log(`Inserting: ${title}`);
      const { error } = await supabase
        .from('products')
        .insert([productData]);
      if (error) console.error(`Error inserting ${title}:`, error);
    }
  }
  
  console.log('Import complete!');
}

importData().catch(console.error);
