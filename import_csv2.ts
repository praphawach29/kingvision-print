import fs from 'fs';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import Papa from 'papaparse';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function importData() {
  const csvText = fs.readFileSync('products.csv', 'utf-8');
  
  Papa.parse(csvText, {
    header: true,
    skipEmptyLines: true,
    complete: async (results) => {
      try {
        const productsToInsert = results.data.map((row: any) => {
          const getVal = (thaiKey: string, engKey: string) => {
            for (const key of Object.keys(row)) {
              if (key.includes(thaiKey) || key.includes(engKey)) return row[key];
            }
            return '';
          };

          const title = getVal('รุ่น', 'title') || getVal('สินค้า', 'name');
          const priceStr = getVal('ราคา', 'price');
          const price = priceStr ? Number(priceStr.replace(/,/g, '')) : 0;
          const description = getVal('รายละเอียด', 'description');
          const brand = getVal('ยี่ห้อ', 'brand');
          const category = getVal('หมวดหมู่', 'category');
          const type = getVal('ประเภทสินค้า', 'type');
          const stock = getVal('สต็อก', 'stock');
          const grade = getVal('เกรด', 'grade');
          const imageUrl = getVal('URLรูปภาพ', 'image_url');
          const isNew = getVal('สินค้าใหม่', 'is_new');
          const isSale = getVal('ลดราคา', 'is_sale');
          const isPopular = getVal('ยอดนิยม', 'is_popular');

          return {
            title: title || '',
            price: price || 0,
            description: description || '',
            short_description: type || '',
            brand: brand || '',
            category: category || 'เครื่องปริ้นเตอร์',
            stock: Number(stock) || 10,
            grade: grade || 'A',
            condition: (isNew === 'true' || isNew === 'ใช่') ? 'สินค้าใหม่' : 'มือสอง',
            image_url: imageUrl || '',
            is_new: true,
            is_sale: isSale === 'true' || isSale === 'ใช่',
            is_popular: isPopular === 'true' || isPopular === 'ใช่',
            created_at: new Date().toISOString()
          };
        });

        if (productsToInsert.length === 0) {
          throw new Error('ไม่พบข้อมูลในไฟล์');
        }

        console.log(`Found ${productsToInsert.length} products to import.`);

        // We can't use insert directly because of RLS, so we'll output SQL
        let sql = 'INSERT INTO products (title, price, description, short_description, brand, category, stock, grade, condition, image_url, is_new, is_sale, is_popular) VALUES\n';
        
        const values = productsToInsert.map((p: any) => {
          const escapeStr = (str: string) => str ? `'${str.replace(/'/g, "''")}'` : 'NULL';
          return `(${escapeStr(p.title)}, ${p.price}, ${escapeStr(p.description)}, ${escapeStr(p.short_description)}, ${escapeStr(p.brand)}, ${escapeStr(p.category)}, ${p.stock}, ${escapeStr(p.grade)}, ${escapeStr(p.condition)}, ${escapeStr(p.image_url)}, ${p.is_new}, ${p.is_sale}, ${p.is_popular})`;
        });

        sql += values.join(',\n') + ';';
        
        fs.writeFileSync('import_products.sql', sql);
        console.log('Generated import_products.sql. Please run this in your Supabase SQL Editor.');

      } catch (err: any) {
        console.error('Import error:', err);
      }
    }
  });
}

importData().catch(console.error);
