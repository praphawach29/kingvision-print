import fs from 'fs';
import Papa from 'papaparse';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase env vars!");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const csvData = fs.readFileSync('sheet.csv', 'utf8');
  const results = Papa.parse(csvData, { header: true, skipEmptyLines: true });
  
  const groupedProducts = new Map();
  
  for (const row of results.data as any[]) {
    const title = row['ชื่อสินค้า']?.trim();
    if (!title) continue;
    
      if (!groupedProducts.has(title)) {
      let slugBase = title.toLowerCase().replace(/[^a-z0-9ก-๙\s]/g, '').trim().replace(/\s+/g, '-');
      if (!slugBase) slugBase = 'product';
      const randomSuffix = Math.random().toString(36).substring(2, 8);
      const slug = `${slugBase}-${Date.now()}-${randomSuffix}`;

      groupedProducts.set(title, {
        title: title,
        slug: slug,
        short_description: row['รายละเอียดสินค้าแบบย่อ'] || '',
        description: row['รายละเอียดสินค้าแบบเต็ม'] || row['รายละเอียดสินค้าแบบย่อ'] || '',
        price: parseInt(row['ราคา']) || 0,
        stock: parseInt(row['คลัง']) || 0,
        image_url: row['รูปภาพสินค้า 1'] || '',
        images: [],
        options: [],
        brand: 'อื่นๆ',
        grade: 'A',
        condition: 'มือสอง',
        category: 'อุปกรณ์เสริม',
        is_sale: false,
        is_popular: false,
        is_new: true, // Assuming from spreadsheet these are new
        specifications: []
      });
      
      const product = groupedProducts.get(title);
      
      // Collect images
      for (let i = 1; i <= 9; i++) {
        const img = row[`รูปภาพสินค้า ${i}`];
        if (img && img.trim()) {
          product.images.push(img.trim());
        }
      }
      
      // Basic category guessing
      if (title.includes('หมึก') || title.includes('Ink') || title.includes('Toner')) product.category = 'หมึกพิมพ์';
      else if (title.includes('เครื่องปริ้น') || title.includes('Printer')) product.category = 'เครื่องปริ้นเตอร์';
      else if (title.includes('หัวพิมพ์') || title.includes('สายแพร') || title.includes('อะไหล่') || title.includes('Mainboard')) product.category = 'อะไหล่ปริ้นเตอร์';
      else if (title.includes('สายไฟ') || title.includes('สาย AC')) product.category = 'อุปกรณ์เสริม';
    }
    
    const product = groupedProducts.get(title);
    
    // Add options
    for (let i = 1; i <= 3; i++) {
        const optName = row[`ชื่อตัวเลือก ${i}`]?.trim();
        const optVal = row[`การเลือกของตัวเลือก ${i}`]?.trim();
        if (optName && optVal) {
            let existingOpt = product.options.find((o: any) => o.name === optName);
            if (!existingOpt) {
                existingOpt = { name: optName, values: [] };
                product.options.push(existingOpt);
            }
            if (!existingOpt.values.includes(optVal)) {
                existingOpt.values.push(optVal);
            }
        }
    }
    
    // Aggregation (Stock)
    const currentStock = parseInt(row['คลัง']) || 0;
    if (product.initialRowParsed) {
       product.stock += currentStock;
    } else {
       product.stock = currentStock; // start with first row stock
       product.initialRowParsed = true;
    }
  }

  const productsToInsert = Array.from(groupedProducts.values()).map(p => {
    delete p.initialRowParsed;
    return p;
  });
  
  if (productsToInsert.length === 0) {
    console.log("No valid products found to insert.");
    return;
  }
  
  console.log(`Prepared ${productsToInsert.length} distinct products. Inserting...`);
  
  console.log("Deleting existing mock and empty image products...");
  const { error: deleteError } = await supabase
    .from('products')
    .delete()
    .or("image_url.is.null,image_url.eq.,image_url.like.https://images.unsplash.com%");
    
  if (deleteError) {
      console.error("Error deleting products:", deleteError);
  } else {
      console.log("Deleted old mock products.");
  }

  // Insert in batches of 50
  for (let i = 0; i < productsToInsert.length; i += 50) {
      const batch = productsToInsert.slice(i, i + 50);
      const { data, error } = await supabase.from('products').insert(batch);
      if (error) {
          console.error("Error inserting batch:", error);
      } else {
          console.log(`Inserted batch ${i/50 + 1}`);
      }
  }
  
  console.log("Done adding products!");
}

run();
