import fs from 'fs';
import Papa from 'papaparse';
import crypto from 'crypto';

async function run() {
  const csvData = fs.readFileSync('sheet.csv', 'utf8');
  const results = Papa.parse(csvData, { header: true, skipEmptyLines: true });
  
  const groupedProducts = new Map();
  
  for (const row of results.data as any[]) {
    const title = row['ชื่อสินค้า']?.trim();
    if (!title) continue;
    
    if (!groupedProducts.has(title)) {
      groupedProducts.set(title, {
        title: title,
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
        is_sale: Math.random() > 0.7,
        is_popular: Math.random() > 0.8,
        is_new: true,
        specifications: []
      });
      
      const product = groupedProducts.get(title);
      
      for (let i = 1; i <= 9; i++) {
        const img = row[`รูปภาพสินค้า ${i}`];
        if (img && img.trim()) {
          product.images.push(img.trim());
        }
      }
      
      if (title.toUpperCase().includes('EPSON')) product.brand = 'EPSON';
      else if (title.toUpperCase().includes('HP')) product.brand = 'HP';
      else if (title.toUpperCase().includes('CANON')) product.brand = 'Canon';
      else if (title.toUpperCase().includes('BROTHER')) product.brand = 'Brother';
      else if (title.toUpperCase().includes('SAMSUNG')) product.brand = 'Samsung';

      if (title.includes('หมึก') || title.includes('Ink') || title.includes('Toner')) product.category = 'หมึกพิมพ์';
      else if (title.includes('เครื่องปริ้น') || title.includes('Printer')) product.category = 'เครื่องปริ้นเตอร์';
      else if (title.includes('หัวพิมพ์') || title.includes('สายแพร') || title.includes('อะไหล่') || title.includes('Mainboard') || title.includes('บอร์ด')) product.category = 'อะไหล่ปริ้นเตอร์';
      else if (title.includes('สายไฟ') || title.includes('สาย AC')) product.category = 'อุปกรณ์เสริม';
    }
    
    const product = groupedProducts.get(title);
    
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
    
    const currentStock = parseInt(row['คลัง']) || 0;
    if (product.initialRowParsed) {
       product.stock += currentStock;
    } else {
       product.stock = currentStock; 
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

  const values = productsToInsert.map((p, index) => {
    // Escape strings for SQL
    const esc = (str: string) => "'" + str.replace(/'/g, "''") + "'";
    const escJson = (obj: any) => "'" + JSON.stringify(obj).replace(/'/g, "''") + "'";
    const escArray = (arr: string[]) => {
      if (!arr || arr.length === 0) return "ARRAY[]::text[]";
      return "ARRAY[" + arr.map(a => "'" + a.replace(/'/g, "''") + "'").join(", ") + "]::text[]";
    };
    
    // Deterministic ID based on title
    const id = crypto.createHash('md5').update(p.title).digest('hex');
    const formattedId = `${id.substring(0,8)}-${id.substring(8,12)}-4${id.substring(13,16)}-a${id.substring(17,20)}-${id.substring(20)}`;

    let slugBase = p.title.toLowerCase()
      .replace(/[^a-z0-9\u0E00-\u0E7F]/gi, '')
      .substring(0, 50)
      .trim()
      .replace(/\s+/g, '-');
    if (!slugBase) slugBase = 'product';
    const slug = `${slugBase}-${index}`;
    
    return `(
      '${formattedId}',
      ${esc(p.title)}, 
      ${esc(slug)},
      ${esc(p.short_description)}, 
      ${esc(p.description)}, 
      ${p.price}, 
      ${p.stock}, 
      ${esc(p.image_url)}, 
      ${escArray(p.images)}, 
      ${escJson(p.options)}::jsonb, 
      ${esc(p.brand)}, 
      ${esc(p.grade)}, 
      ${esc(p.condition)}, 
      ${esc(p.category)}, 
      ${p.is_sale}, 
      ${p.is_popular}, 
      ${p.is_new}, 
      ${escJson(p.specifications)}::jsonb,
      'published'
    )`;
  });
  
  let sql = 'INSERT INTO products (id, title, slug, short_description, description, price, stock, image_url, images, options, brand, grade, condition, category, is_sale, is_popular, is_new, specifications, status) VALUES \n';
  sql += values.join(',\n') + '\nON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title, slug = EXCLUDED.slug, short_description = EXCLUDED.short_description, description = EXCLUDED.description, price = EXCLUDED.price, stock = EXCLUDED.stock, image_url = EXCLUDED.image_url, images = EXCLUDED.images, options = EXCLUDED.options, brand = EXCLUDED.brand, grade = EXCLUDED.grade, condition = EXCLUDED.condition, category = EXCLUDED.category, is_sale = EXCLUDED.is_sale, is_popular = EXCLUDED.is_popular, is_new = EXCLUDED.is_new, specifications = EXCLUDED.specifications, status = EXCLUDED.status;';
  
  fs.writeFileSync('insert_products.sql', sql);
  console.log('Successfully generated insert_products.sql');

  // Generate Categories SQL
  const uniqueCats = Array.from(new Set(productsToInsert.map(p => p.category)));
  let catSql = 'INSERT INTO categories (id, name, slug) VALUES \n';
  const catValues = uniqueCats.map((cat, index) => {
    const id = crypto.createHash('md5').update('cat-' + cat).digest('hex');
    const formattedId = `${id.substring(0,8)}-${id.substring(8,12)}-4${id.substring(13,16)}-a${id.substring(17,20)}-${id.substring(20)}`;
    const slug = cat.toLowerCase().replace(/[^a-z0-9\u0E00-\u0E7F]/gi, '').substring(0, 50);
    return `('${formattedId}', '${cat.replace(/'/g, "''")}', '${slug}')`;
  });
  catSql += catValues.join(',\n') + '\nON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name;';
  fs.writeFileSync('insert_categories.sql', catSql);
  console.log('Successfully generated insert_categories.sql');

  // Generate Brands SQL
  const uniqueBrands = Array.from(new Set(productsToInsert.map(p => p.brand)));
  let brandSql = 'INSERT INTO brands (id, name, slug) VALUES \n';
  const brandValues = uniqueBrands.map((brand, index) => {
    const id = crypto.createHash('md5').update('brand-' + brand).digest('hex');
    const formattedId = `${id.substring(0,8)}-${id.substring(8,12)}-4${id.substring(13,16)}-a${id.substring(17,20)}-${id.substring(20)}`;
    const slug = brand.toLowerCase().replace(/[^a-z0-9\u0E00-\u0E7F]/gi, '').substring(0, 50);
    return `('${formattedId}', '${brand.replace(/'/g, "''")}', '${slug}')`;
  });
  brandSql += brandValues.join(',\n') + '\nON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name;';
  fs.writeFileSync('insert_brands.sql', brandSql);
  console.log('Successfully generated insert_brands.sql');
}

run();
