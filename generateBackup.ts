import fs from 'fs';
import Papa from 'papaparse';

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
        sku: row['SKU'] || '',
        image_url: row['รูปภาพสินค้า 1'] || '',
        images: [],
        options: [],
        brand: 'อื่นๆ',
        grade: 'A',
        condition: 'สินค้าใหม่',
        category: 'อุปกรณ์เสริม',
        is_sale: false,
        is_popular: false,
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
      
      if (title.includes('หมึก') || title.includes('Ink') || title.includes('Toner')) product.category = 'หมึกพิมพ์';
      else if (title.includes('เครื่องปริ้น') || title.includes('Printer')) product.category = 'เครื่องปริ้นเตอร์';
      else if (title.includes('หัวพิมพ์') || title.includes('สายแพร') || title.includes('อะไหล่') || title.includes('Mainboard')) product.category = 'อะไหล่ปริ้นเตอร์';
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
  
  const backupFormat = [
    {
      name: "products",
      count: productsToInsert.length,
      data: productsToInsert
    }
  ];

  fs.writeFileSync('public/google_sheet_products.json', JSON.stringify(backupFormat, null, 2));
  console.log(`Generated public/google_sheet_products.json with ${productsToInsert.length} products!`);
}

run();
