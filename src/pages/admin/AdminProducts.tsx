import React, { useState, useEffect, useRef } from 'react';
import { Plus, Search, Edit, Trash2, Loader2, X, Save, Image as ImageIcon, AlertCircle, Package, Upload, FileDown, FileUp, Layers } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { motion, AnimatePresence } from 'motion/react';
import Papa from 'papaparse';
import { notificationService } from '../../services/notificationService';

interface ProductOption {
  name: string;
  values: {
    label: string;
    price_modifier: number;
    stock?: number;
  }[];
}

interface Product {
  id: string;
  title: string;
  price: number;
  description: string;
  short_description?: string;
  image_url: string;
  images?: string[];
  specifications?: { key: string; value: string }[];
  options?: ProductOption[];
  brand: string;
  brand_id?: string;
  grade: string;
  condition: string;
  category: string;
  stock?: number;
  sku?: string;
  is_sale: boolean;
  is_popular: boolean;
  is_new: boolean;
}

export function AdminProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterBrand, setFilterBrand] = useState('');
  const [filterGrade, setFilterGrade] = useState('');
  const [filterStock, setFilterStock] = useState('all'); // all, low, out
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const itemsPerPage = 10;

  // DB Categories and Brands
  const [dbCategories, setDbCategories] = useState<{id: string, name: string}[]>([]);
  const [dbBrands, setDbBrands] = useState<{id: string, name: string}[]>([]);

  // Form state
  const [formData, setFormData] = useState<Partial<Product>>({
    title: '',
    price: 0,
    description: '',
    short_description: '',
    image_url: '',
    images: [],
    specifications: [],
    options: [],
    brand: '',
    grade: 'A',
    condition: 'มือสอง',
    category: 'เครื่องปริ้นเตอร์',
    stock: 0,
    sku: '',
    is_sale: false,
    is_popular: false,
    is_new: false
  });

  useEffect(() => {
    fetchProducts();
    fetchDbOptions();
    testConnection();
  }, [currentPage, searchTerm, filterCategory, filterBrand, filterGrade, filterStock]);

  async function testConnection() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single();
        
        console.log('Current user role:', profile?.role);
        if (profile && profile.role !== 'admin' && profile.role !== 'super_admin') {
          console.warn('User is not an admin. Saving may fail due to RLS policies.');
        }
      }

      const { error } = await supabase.from('products').select('id, options').limit(1);
      if (error) {
        console.error('Database connection test failed:', error);
        if (error.message.includes('products')) {
          setError('ไม่พบตาราง products ในฐานข้อมูล กรุณารัน SQL ในไฟล์ supabase_setup.sql');
        } else if (error.message.includes('options')) {
          setError('พบข้อผิดพลาด: คอลัมน์ "options" หายไปจากตาราง products กรุณารันคำสั่ง SQL สำหรับเพิ่มคอลัมน์ใน Supabase SQL Editor');
        }
      }
    } catch (err) {
      console.error('Connection test error:', err);
    }
  }

  async function fetchDbOptions() {
    try {
      const [{ data: cats }, { data: brs }] = await Promise.all([
        supabase.from('categories').select('id, name').order('name'),
        supabase.from('brands').select('id, name').order('name')
      ]);
      if (cats) setDbCategories(cats);
      if (brs) setDbBrands(brs);
    } catch (err) {
      console.error('Error fetching options:', err);
    }
  }

  async function fetchProducts() {
    try {
      setLoading(true);
      
      let query = supabase
        .from('products')
        .select('*', { count: 'exact' });

      if (searchTerm) {
        query = query.or(`title.ilike.%${searchTerm}%,brand.ilike.%${searchTerm}%`);
      }

      if (filterCategory) {
        query = query.eq('category', filterCategory);
      }

      if (filterBrand) {
        query = query.eq('brand', filterBrand);
      }

      if (filterGrade) {
        query = query.eq('grade', filterGrade);
      }

      if (filterStock === 'low') {
        query = query.lt('stock', 5).gt('stock', 0);
      } else if (filterStock === 'out') {
        query = query.eq('stock', 0);
      }

      const from = (currentPage - 1) * itemsPerPage;
      const to = from + itemsPerPage - 1;

      const { data, error, count } = await query
        .order('created_at', { ascending: false })
        .range(from, to);

      if (error) throw error;
      setProducts(data || []);
      setTotalCount(count || 0);
    } catch (err: any) {
      console.error('Error fetching products:', err);
      let msg = err.message;
      if (msg.includes('relation "products" does not exist')) {
        msg = 'ไม่พบตารางข้อมูลสินค้าในระบบ กรุณาไปที่ไฟล์ supabase_setup.sql และคัดลอกคำสั่ง SQL ไปรันใน Supabase SQL Editor เพื่อสร้างตารางที่จำเป็น';
      }
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  const totalPages = Math.ceil(totalCount / itemsPerPage);

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1); // Reset to first page on search
  };

  const handleOpenModal = (product?: Product) => {
    if (product) {
      setEditingProduct(product);
      setFormData({
        ...product,
        category: product.category || 'เครื่องปริ้นเตอร์',
        grade: product.grade || 'A',
        condition: product.condition || 'มือสอง',
        images: product.images || [],
        specifications: product.specifications || [],
        options: product.options || []
      });
    } else {
      setEditingProduct(null);
      setFormData({
        title: '',
        price: 0,
        description: '',
        short_description: '',
        image_url: '',
        images: [],
        specifications: [],
        options: [],
        brand: '',
        grade: 'A',
        condition: 'มือสอง',
        category: 'เครื่องปริ้นเตอร์',
        stock: 0,
        is_sale: false,
        is_popular: false,
        is_new: false
      });
    }
    setIsModalOpen(true);
    setError(null);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('คุณแน่ใจหรือไม่ว่าต้องการลบสินค้านี้?')) return;

    try {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setProducts(products.filter(p => p.id !== id));
    } catch (err: any) {
      alert('เกิดข้อผิดพลาดในการลบสินค้า: ' + err.message);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('กรุณาเลือกไฟล์รูปภาพเท่านั้น');
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      setError('ขนาดไฟล์ต้องไม่เกิน 2MB');
      return;
    }

    // Create instant local preview
    const localPreview = URL.createObjectURL(file);
    
    // Add temporary preview to images array
    setFormData(prev => ({
      ...prev,
      images: [...(prev.images || []), localPreview]
    }));

    try {
      setIsUploading(true);
      setError(null);

      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`;
      const filePath = `product-images/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('products')
        .upload(filePath, file);

      if (uploadError) {
        if (uploadError.message.includes('bucket not found')) {
          throw new Error('ไม่พบโฟลเดอร์เก็บข้อมูล (Bucket: products) กรุณาสร้าง Bucket ใน Supabase Storage ก่อน');
        }
        throw uploadError;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('products')
        .getPublicUrl(filePath);

      // Replace local preview with actual public URL
      setFormData(prev => ({
        ...prev,
        images: (prev.images || []).map(img => img === localPreview ? publicUrl : img),
        // If no main image, set this as main
        image_url: prev.image_url || publicUrl 
      }));
    } catch (err: any) {
      console.error('Error uploading file:', err);
      setError('เกิดข้อผิดพลาดในการอัปโหลด: ' + err.message);
      // Remove the failed preview
      setFormData(prev => ({
        ...prev,
        images: (prev.images || []).filter(img => img !== localPreview)
      }));
    } finally {
      setIsUploading(false);
    }
  };

  const addSpecification = () => {
    const specs = formData.specifications || [];
    setFormData({
      ...formData,
      specifications: [...specs, { key: '', value: '' }]
    });
  };

  const updateSpecification = (index: number, key: string, value: string) => {
    const specs = [...(formData.specifications || [])];
    specs[index] = { key, value };
    setFormData({ ...formData, specifications: specs });
  };

  const removeSpecification = (index: number) => {
    const specs = [...(formData.specifications || [])];
    specs.splice(index, 1);
    setFormData({ ...formData, specifications: specs });
  };

  const addOption = () => {
    const options = formData.options || [];
    setFormData({
      ...formData,
      options: [...options, { name: '', values: [{ label: '', price_modifier: 0 }] }]
    });
  };

  const updateOptionName = (index: number, name: string) => {
    const options = [...(formData.options || [])];
    options[index] = { ...options[index], name };
    setFormData({ ...formData, options });
  };

  const removeOption = (index: number) => {
    const options = [...(formData.options || [])];
    options.splice(index, 1);
    
    // Recalculate total stock
    let totalStock = 0;
    options.forEach(opt => {
      opt.values.forEach(val => {
        totalStock += (val.stock || 0);
      });
    });

    setFormData({ ...formData, options, stock: totalStock });
  };

  const addOptionValue = (optionIndex: number) => {
    const options = [...(formData.options || [])];
    options[optionIndex].values.push({ label: '', price_modifier: 0, stock: 0 });
    setFormData({ ...formData, options });
  };

  const updateOptionValue = (optionIndex: number, valueIndex: number, label: string, price_modifier: number, stock: number) => {
    const options = [...(formData.options || [])];
    options[optionIndex].values[valueIndex] = { label, price_modifier, stock };
    
    // Calculate total stock from all options
    // If there are multiple options, we sum all values (simple approach)
    let totalStock = 0;
    options.forEach(opt => {
      opt.values.forEach(val => {
        totalStock += (val.stock || 0);
      });
    });

    setFormData({ ...formData, options, stock: totalStock });
  };

  const removeOptionValue = (optionIndex: number, valueIndex: number) => {
    const options = [...(formData.options || [])];
    options[optionIndex].values.splice(valueIndex, 1);
    
    // Recalculate total stock
    let totalStock = 0;
    options.forEach(opt => {
      opt.values.forEach(val => {
        totalStock += (val.stock || 0);
      });
    });

    setFormData({ ...formData, options, stock: totalStock });
  };

  const removeImage = (index: number) => {
    const images = [...(formData.images || [])];
    const removedUrl = images[index];
    images.splice(index, 1);
    
    let newMainUrl = formData.image_url;
    if (formData.image_url === removedUrl) {
      newMainUrl = images.length > 0 ? images[0] : '';
    }
    
    setFormData({ ...formData, images, image_url: newMainUrl });
  };

  const setMainImage = (url: string) => {
    setFormData({ ...formData, image_url: url });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError(null);

    try {
      // Check authentication
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) {
        throw new Error('กรุณาเข้าสู่ระบบใหม่อีกครั้ง');
      }

      // Clean up formData before sending to Supabase
      // Create a copy and remove fields that shouldn't be sent or need conversion
      const { id, created_at, ...rest } = formData as any;
      const dataToSave = { ...rest };
      
      // Ensure numeric fields are numbers
      dataToSave.price = Number(dataToSave.price) || 0;
      dataToSave.stock = Number(dataToSave.stock) || 0;
      
      // Sync is_new with condition
      dataToSave.is_new = dataToSave.condition === 'สินค้าใหม่';

      // Remove any empty strings or nulls for optional fields if necessary
      // but image_url is required by our logic
      if (!dataToSave.image_url) dataToSave.image_url = '';

      console.log('Attempting to save product data:', dataToSave);

      let result;
      if (editingProduct) {
        result = await supabase
          .from('products')
          .update(dataToSave)
          .eq('id', editingProduct.id);
        
        if (result.error) throw result.error;

        // Log stock change if stock was modified
        if (dataToSave.stock !== undefined && dataToSave.stock !== (editingProduct.stock || 0)) {
          await supabase.from('inventory_logs').insert([{
            product_id: editingProduct.id,
            change_amount: dataToSave.stock - (editingProduct.stock || 0),
            previous_stock: editingProduct.stock || 0,
            new_stock: dataToSave.stock,
            reason: 'adjustment',
            user_id: authUser.id
          }]);
        }

        // Check for low stock notification
        if (dataToSave.stock !== undefined && dataToSave.stock <= 5 && dataToSave.stock < (editingProduct.stock || 0)) {
          await notificationService.notifyLowStock(dataToSave.title || editingProduct.title, dataToSave.stock);
        }
      } else {
        result = await supabase
          .from('products')
          .insert([dataToSave]);
        
        if (result.error) throw result.error;
      }
      
      await fetchProducts();
      setIsModalOpen(false);
    } catch (err: any) {
      console.error('Submit error details:', err);
      
      let errorMessage = err.message || 'เกิดข้อผิดพลาดที่ไม่ทราบสาเหตุ';
      const rawError = JSON.stringify(err);
      
      // Specific handling for schema cache errors
      if (errorMessage.toLowerCase().includes('schema cache') || (err.code === 'PGRST204')) {
        errorMessage = 'ระบบฐานข้อมูลยังไม่อัปเดต (Schema Cache) หรือคอลัมน์หายไป กรุณารันคำสั่ง SQL "Fix Database" ที่ผมเตรียมให้ในแชท แล้วกดปุ่มรีโหลดด้านล่าง';
      } else if (errorMessage.toLowerCase().includes('row-level security') || err.code === '42501') {
        errorMessage = 'คุณไม่มีสิทธิ์ในการบันทึกข้อมูล (RLS Policy) กรุณาตรวจสอบว่าบัญชีของคุณมีสิทธิ์เป็น Admin ในตาราง profiles หรือรันคำสั่ง SQL ในไฟล์ supabase_setup.sql อีกครั้ง';
      } else if (errorMessage.toLowerCase().includes('column') && errorMessage.toLowerCase().includes('does not exist')) {
        errorMessage = `พบข้อผิดพลาด: คอลัมน์ในฐานข้อมูลไม่ครบถ้วน (${errorMessage}) กรุณารันคำสั่ง SQL ทั้งหมดในไฟล์ supabase_setup.sql ใน Supabase SQL Editor`;
      }
      
      setError(`ไม่สามารถบันทึกข้อมูลได้: ${errorMessage}${rawError !== '{}' ? ` (Debug: ${rawError})` : ''}`);
    } finally {
      setIsSaving(false);
    }
  };

  const downloadTemplate = () => {
    const headers = [
      'ชื่อสินค้า (title)', 
      'ราคา (price)', 
      'รายละเอียดสั้น (short_description)',
      'รายละเอียด (description)', 
      'แบรนด์ (brand)', 
      'หมวดหมู่ (category)', 
      'สต็อก (stock)', 
      'SKU (sku)',
      'เกรด (grade)', 
      'URLรูปภาพหลัก (image_url)', 
      'รูปภาพเพิ่มเติม (images: url1,url2)',
      'คุณสมบัติ (specifications: key1:val1,key2:val2)',
      'ตัวเลือกสินค้า (options: Name:Val1|Price1|Stock1,Val2|Price2|Stock2)',
      'สินค้าใหม่ (is_new: true/false)', 
      'ลดราคา (is_sale: true/false)', 
      'ยอดนิยม (is_popular: true/false)'
    ];
    const sampleData = [
      [
        'HP LaserJet Pro M15w', 
        '4500', 
        'ปริ้นเตอร์เลเซอร์จิ๋วแต่แจ๋ว',
        'เครื่องปริ้นเตอร์เลเซอร์ขนาดเล็ก เหมาะสำหรับโฮมออฟฟิศ', 
        'HP', 
        'เครื่องปริ้นเตอร์', 
        '10', 
        'KV-PR-001', 
        'A', 
        'https://example.com/main.jpg', 
        'https://example.com/img1.jpg,https://example.com/img2.jpg',
        'ความเร็ว:18 ppm,การเชื่อมต่อ:Wi-Fi',
        'การรับประกัน:1 เดือน|0|5,3 เดือน|500|5',
        'true', 
        'false', 
        'true'
      ],
      [
        'Canon PIXMA G3010', 
        '5200', 
        'All-in-One Ink Tank',
        'เครื่องปริ้นเตอร์ Ink Tank ประหยัดหมึก', 
        'Canon', 
        'เครื่องปริ้นเตอร์', 
        '5', 
        'KV-PR-002', 
        'A', 
        '', 
        '',
        '',
        '',
        'true', 
        'true', 
        'false'
      ]
    ];
    
    const csvContent = Papa.unparse({
      fields: headers,
      data: sampleData
    });

    // Add UTF-8 BOM to fix Thai characters in Excel
    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'products_template.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportToCSV = () => {
    if (products.length === 0) {
      alert('ไม่มีข้อมูลสินค้าที่จะส่งออก');
      return;
    }

    const csvData = products.map(p => ({
      'ชื่อสินค้า (title)': p.title,
      'ราคา (price)': p.price,
      'รายละเอียดสั้น (short_description)': p.short_description || '',
      'รายละเอียด (description)': p.description,
      'แบรนด์ (brand)': p.brand,
      'หมวดหมู่ (category)': p.category,
      'สต็อก (stock)': p.stock || 0,
      'SKU (sku)': p.sku || '',
      'เกรด (grade)': p.grade,
      'URLรูปภาพหลัก (image_url)': p.image_url,
      'รูปภาพเพิ่มเติม (images)': (p.images || []).join(','),
      'สินค้าใหม่ (is_new)': p.is_new,
      'ลดราคา (is_sale)': p.is_sale,
      'ยอดนิยม (is_popular)': p.is_popular
    }));

    const csvContent = Papa.unparse(csvData);
    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `kingvision_products_${new Date().toLocaleDateString('th-TH').replace(/\//g, '-')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleCSVImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    setError(null);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        try {
          const productsToInsert = results.data.map((row: any) => {
            // Map Thai or English headers to field names
            const getVal = (thaiKey: string, engKey: string) => {
              for (const key of Object.keys(row)) {
                if (key.includes(thaiKey) || key.includes(engKey)) return row[key];
              }
              return '';
            };

            const title = getVal('ชื่อสินค้า', 'title');
            const price = getVal('ราคา', 'price');
            const shortDescription = getVal('รายละเอียดสั้น', 'short_description');
            const description = getVal('รายละเอียด', 'description');
            const brand = getVal('แบรนด์', 'brand');
            const category = getVal('หมวดหมู่', 'category');
            const stock = getVal('สต็อก', 'stock');
            const sku = getVal('SKU', 'sku');
            const grade = getVal('เกรด', 'grade');
            const imageUrl = getVal('URLรูปภาพหลัก', 'image_url');
            const imagesStr = getVal('รูปภาพเพิ่มเติม', 'images');
            const specsStr = getVal('คุณสมบัติ', 'specifications');
            const optionsStr = getVal('ตัวเลือกสินค้า', 'options');
            const isNew = getVal('สินค้าใหม่', 'is_new');
            const isSale = getVal('ลดราคา', 'is_sale');
            const isPopular = getVal('ยอดนิยม', 'is_popular');

            // Parse images
            let images = [];
            if (imagesStr) {
              images = imagesStr.split(',').map((url: string) => url.trim()).filter((url: string) => url !== '');
            }

            // Parse specifications
            let specifications = [];
            if (specsStr) {
              specifications = specsStr.split(',').map((spec: string) => {
                const [key, value] = spec.split(':');
                return { key: (key || '').trim(), value: (value || '').trim() };
              }).filter((s: any) => s.key !== '');
            }

            // Parse options
            let options = [];
            if (optionsStr) {
              try {
                options = optionsStr.split(';').map((optGroup: string) => {
                  const [name, valuesPart] = optGroup.split(':');
                  if (!name || !valuesPart) return null;
                  
                  const values = valuesPart.split(',').map((valPart: string) => {
                    const [label, price_modifier, valStock] = valPart.split('|');
                    return {
                      label: (label || '').trim(),
                      price_modifier: Number(price_modifier) || 0,
                      stock: Number(valStock) || 0
                    };
                  }).filter((v: any) => v.label !== '');
                  
                  return { name: name.trim(), values };
                }).filter((o: any) => o !== null && o.values.length > 0);
              } catch (e) {
                console.error('Error parsing options string:', optionsStr, e);
              }
            }

            // Calculate total stock if options exist and stock is not explicitly provided or is 0
            let finalStock = Number(stock) || 0;
            if (options.length > 0 && finalStock === 0) {
              options.forEach((opt: any) => {
                opt.values.forEach((val: any) => {
                  finalStock += (val.stock || 0);
                });
              });
            }

            const selectedBrand = dbBrands.find(b => b.name === (brand || '').trim());
            const selectedCategory = dbCategories.find(c => c.name === (category || '').trim());

            return {
              title: title || '',
              price: Number(price) || 0,
              short_description: shortDescription || '',
              description: description || '',
              brand: brand || '',
              brand_id: selectedBrand?.id,
              category: category || 'เครื่องปริ้นเตอร์',
              category_id: selectedCategory?.id,
              stock: finalStock,
              sku: sku || '',
              grade: grade || 'A',
              condition: (isNew === 'true' || isNew === 'ใช่') ? 'สินค้าใหม่' : 'มือสอง',
              image_url: imageUrl || '',
              images: images.length > 0 ? images : (imageUrl ? [imageUrl] : []),
              specifications: specifications,
              options: options,
              is_new: isNew === 'true' || isNew === 'ใช่',
              is_sale: isSale === 'true' || isSale === 'ใช่',
              is_popular: isPopular === 'true' || isPopular === 'ใช่',
              created_at: new Date().toISOString()
            };
          });

          if (productsToInsert.length === 0) {
            throw new Error('ไม่พบข้อมูลในไฟล์');
          }

          const { error: insertError } = await supabase
            .from('products')
            .insert(productsToInsert);

          if (insertError) throw insertError;

          alert(`นำเข้าข้อมูลสำเร็จ ${productsToInsert.length} รายการ`);
          await fetchProducts();
        } catch (err: any) {
          console.error('Import error:', err);
          setError('เกิดข้อผิดพลาดในการนำเข้า: ' + err.message);
        } finally {
          setIsImporting(false);
          if (fileInputRef.current) fileInputRef.current.value = '';
        }
      },
      error: (err) => {
        setError('เกิดข้อผิดพลาดในการอ่านไฟล์: ' + err.message);
        setIsImporting(false);
      }
    });
  };

  if (loading && products.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center">
        <Loader2 className="animate-spin text-kv-orange" size={32} />
      </div>
    );
  }

  return (
    <div className="space-y-6 font-thai">
      {error && (
        <div className="bg-red-50 border border-red-100 text-red-600 p-4 rounded-xl flex flex-col gap-3 animate-shake">
          <div className="flex items-start gap-3">
            <AlertCircle className="shrink-0 mt-0.5" size={18} />
            <div className="text-sm font-bold">{error}</div>
          </div>
          {error.includes('Schema Cache') && (
            <button 
              onClick={async () => {
                try {
                  const { error: rpcError } = await supabase.rpc('reload_schema');
                  if (rpcError) throw rpcError;
                  alert('ส่งคำสั่งรีโหลด Schema สำเร็จ ระบบจะรีโหลดหน้าเว็บใน 3 วินาที...');
                  setTimeout(() => window.location.reload(), 3000);
                } catch (err: any) {
                  console.error('Reload schema error:', err);
                  alert('ไม่สามารถรีโหลดอัตโนมัติได้: ' + err.message + '\nกรุณารันคำสั่ง SQL ใน Supabase SQL Editor');
                }
              }}
              className="ml-7 w-fit px-4 py-2 bg-red-600 text-white rounded-lg text-xs font-black hover:bg-red-700 transition-all shadow-md active:scale-95"
            >
              คลิกเพื่อรีโหลด Schema และรีเฟรชหน้าเว็บ
            </button>
          )}
        </div>
      )}
      <div className="flex flex-col gap-4 bg-white p-6 rounded-2xl shadow-sm border border-gray-50">
        <div className="flex flex-col lg:flex-row justify-between items-stretch lg:items-center gap-4">
          <div className="relative flex-1">
            <input 
              type="text" 
              placeholder="ค้นหาชื่อสินค้า หรือแบรนด์..." 
              value={searchTerm}
              onChange={handleSearch}
              className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-kv-orange focus:border-transparent transition-all font-bold text-kv-navy"
            />
            <Search className="absolute left-3 top-3.5 text-gray-400" size={18} />
          </div>
          <div className="grid grid-cols-3 sm:flex items-center gap-2 w-full lg:w-auto">
            <button 
              onClick={exportToCSV}
              className="flex-1 sm:flex-none bg-blue-50 text-blue-700 border border-blue-100 px-2 sm:px-4 py-3 rounded-xl flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 hover:bg-blue-100 transition-all font-bold shadow-sm active:scale-95"
              title="ส่งออกรายการสินค้าทั้งหมดเป็น CSV"
            >
              <FileDown size={18} /> 
              <span className="text-[10px] sm:text-xs whitespace-nowrap">ส่งออก</span>
            </button>
            <button 
              onClick={() => fileInputRef.current?.click()}
              disabled={isImporting}
              className="flex-1 sm:flex-none bg-emerald-50 text-emerald-700 border border-emerald-100 px-2 sm:px-4 py-3 rounded-xl flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 hover:bg-emerald-100 transition-all font-bold shadow-sm active:scale-95 disabled:opacity-50"
              title="นำเข้าข้อมูลจากไฟล์ CSV"
            >
              {isImporting ? <Loader2 className="animate-spin" size={18} /> : <FileUp size={18} />}
              <span className="text-[10px] sm:text-xs whitespace-nowrap">นำเข้า</span>
            </button>
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleCSVImport} 
              accept=".csv" 
              className="hidden" 
            />
            <button 
              onClick={() => handleOpenModal()}
              className="flex-1 sm:flex-none bg-kv-navy text-white px-2 sm:px-6 py-3 rounded-xl flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 hover:bg-kv-orange transition-all font-bold shadow-lg shadow-kv-navy/20 active:scale-95"
            >
              <Plus size={20} /> 
              <span className="text-[10px] sm:text-xs whitespace-nowrap">เพิ่มสินค้า</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <select 
            value={filterCategory}
            onChange={(e) => { setFilterCategory(e.target.value); setCurrentPage(1); }}
            className="px-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl text-xs font-bold text-kv-navy outline-none focus:ring-2 focus:ring-kv-orange"
          >
            <option value="">ทุกหมวดหมู่</option>
            {dbCategories.map(cat => (
              <option key={cat.id} value={cat.name}>{cat.name}</option>
            ))}
          </select>

          <select 
            value={filterBrand}
            onChange={(e) => { setFilterBrand(e.target.value); setCurrentPage(1); }}
            className="px-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl text-xs font-bold text-kv-navy outline-none focus:ring-2 focus:ring-kv-orange"
          >
            <option value="">ทุกแบรนด์</option>
            {dbBrands.map(brand => (
              <option key={brand.id} value={brand.name}>{brand.name}</option>
            ))}
          </select>

          <select 
            value={filterGrade}
            onChange={(e) => { setFilterGrade(e.target.value); setCurrentPage(1); }}
            className="px-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl text-xs font-bold text-kv-navy outline-none focus:ring-2 focus:ring-kv-orange"
          >
            <option value="">ทุกเกรด</option>
            <option value="A">เกรด A</option>
            <option value="B">เกรด B</option>
            <option value="C">เกรด C</option>
          </select>

          <select 
            value={filterStock}
            onChange={(e) => { setFilterStock(e.target.value); setCurrentPage(1); }}
            className="px-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl text-xs font-bold text-kv-navy outline-none focus:ring-2 focus:ring-kv-orange"
          >
            <option value="all">สถานะสต็อกทั้งหมด</option>
            <option value="low">ใกล้หมด (น้อยกว่า 5)</option>
            <option value="out">สินค้าหมด</option>
          </select>
        </div>
        
        {(filterCategory || filterBrand || filterGrade || filterStock !== 'all') && (
          <div className="flex justify-end">
            <button 
              onClick={() => {
                setFilterCategory('');
                setFilterBrand('');
                setFilterGrade('');
                setFilterStock('all');
                setSearchTerm('');
              }}
              className="text-[10px] font-bold text-red-500 hover:underline"
            >
              ล้างตัวกรองทั้งหมด
            </button>
          </div>
        )}
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-50 overflow-hidden">
        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-gray-50/50">
              <tr className="border-b border-gray-100 text-xs text-gray-400 uppercase tracking-widest">
                <th className="p-4 font-bold">รูปภาพ</th>
                <th className="p-4 font-bold">ชื่อสินค้า</th>
                <th className="p-4 font-bold">แบรนด์/หมวดหมู่</th>
                <th className="p-4 font-bold">ราคา</th>
                <th className="p-4 font-bold">สต็อก</th>
                <th className="p-4 font-bold">สถานะ</th>
                <th className="p-4 font-bold">จัดการ</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {products.map((product) => (
                <tr key={product.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                  <td className="p-4">
                    <img 
                      src={product.image_url && product.image_url.trim() !== '' ? product.image_url : 'https://via.placeholder.com/50'} 
                      alt={product.title} 
                      className="w-12 h-12 rounded-lg object-cover bg-gray-100 shadow-sm" 
                      referrerPolicy="no-referrer" 
                    />
                  </td>
                  <td className="p-4">
                    <div className="font-bold text-kv-navy line-clamp-1">{product.title}</div>
                    <div className="text-[10px] text-gray-400 font-mono">ID: {product.id.slice(0, 8)}</div>
                  </td>
                  <td className="p-4">
                    <div className="text-kv-navy font-bold">{product.brand || '-'}</div>
                    <div className="text-xs text-gray-500">{product.category || 'เครื่องปริ้นเตอร์'}</div>
                  </td>
                  <td className="p-4 font-black text-kv-navy text-base">฿{product.price.toLocaleString()}</td>
                  <td className="p-4">
                    <div className={`font-bold ${((product.stock || 0) < 5) ? 'text-red-600' : 'text-kv-navy'}`}>
                      {product.stock || 0}
                    </div>
                    {((product.stock || 0) < 5) && <div className="text-[10px] text-red-500 font-black animate-pulse">ใกล้หมด!</div>}
                  </td>
                  <td className="p-4">
                    <div className="flex flex-wrap gap-1">
                      {product.condition && (
                        <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-tighter ${
                          product.condition === 'ใหม่' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                        }`}>
                          {product.condition}
                        </span>
                      )}
                      {product.is_new && <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-[10px] font-black uppercase tracking-tighter">ใหม่</span>}
                      {product.is_sale && <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded text-[10px] font-black uppercase tracking-tighter">ลดราคา</span>}
                      {product.is_popular && <span className="px-2 py-0.5 bg-orange-100 text-orange-700 rounded text-[10px] font-black uppercase tracking-tighter">ยอดนิยม</span>}
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => handleOpenModal(product)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" 
                        title="แก้ไข"
                      >
                        <Edit size={18} />
                      </button>
                      <button 
                        onClick={() => handleDelete(product.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors" 
                        title="ลบ"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile Card View */}
        <div className="md:hidden divide-y divide-gray-50">
          {products.map((product) => (
            <div key={product.id} className="p-4 flex gap-4 items-start active:bg-gray-50 transition-colors">
              <img 
                src={product.image_url && product.image_url.trim() !== '' ? product.image_url : 'https://via.placeholder.com/100'} 
                alt={product.title} 
                className="w-20 h-20 rounded-xl object-cover bg-gray-100 shadow-sm shrink-0" 
                referrerPolicy="no-referrer" 
              />
              <div className="flex-1 min-w-0 space-y-2">
                <div>
                  <h4 className="font-bold text-kv-navy text-sm line-clamp-2 leading-tight">{product.title}</h4>
                  <p className="text-[10px] text-gray-400 font-medium">{product.brand} • {product.category}</p>
                </div>
                <div className="flex justify-between items-end">
                  <div className="space-y-1">
                    <p className="font-black text-kv-navy">฿{product.price.toLocaleString()}</p>
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-bold ${((product.stock || 0) < 5) ? 'text-red-600' : 'text-gray-400'}`}>
                        สต็อก: {product.stock || 0}
                      </span>
                      {((product.stock || 0) < 5) && <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-ping" />}
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {product.condition && (
                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-black ${
                          product.condition === 'ใหม่' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                        }`}>
                          {product.condition}
                        </span>
                      )}
                      {product.is_new && <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded text-[9px] font-black">ใหม่</span>}
                      {product.is_sale && <span className="px-1.5 py-0.5 bg-red-100 text-red-700 rounded text-[9px] font-black">ลด</span>}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button 
                      onClick={() => handleOpenModal(product)}
                      className="p-2 text-blue-600 bg-blue-50 rounded-lg"
                    >
                      <Edit size={16} />
                    </button>
                    <button 
                      onClick={() => handleDelete(product.id)}
                      className="p-2 text-red-600 bg-red-50 rounded-lg"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {products.length === 0 && (
          <div className="p-12 text-center text-gray-400 font-bold">
            ไม่พบสินค้าที่ค้นหา
          </div>
        )}
      </div>

      {/* Pagination Controls */}
      {totalCount > itemsPerPage && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-2xl shadow-sm border border-gray-50">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">
            แสดง {((currentPage - 1) * itemsPerPage) + 1} - {Math.min(currentPage * itemsPerPage, totalCount)} จาก {totalCount} รายการ
          </p>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="px-4 py-2 bg-gray-50 text-kv-navy rounded-xl font-bold text-sm disabled:opacity-50 hover:bg-gray-100 transition-colors border border-gray-100"
            >
              ก่อนหน้า
            </button>
            <div className="flex items-center gap-1">
              {[...Array(totalPages)].map((_, i) => {
                const pageNum = i + 1;
                // Show only a few page numbers around current page
                if (
                  pageNum === 1 || 
                  pageNum === totalPages || 
                  (pageNum >= currentPage - 1 && pageNum <= currentPage + 1)
                ) {
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setCurrentPage(pageNum)}
                      className={`w-10 h-10 rounded-xl font-black text-sm transition-all ${
                        currentPage === pageNum 
                          ? 'bg-kv-orange text-white shadow-lg shadow-kv-orange/20' 
                          : 'bg-gray-50 text-gray-400 hover:bg-gray-100'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                }
                if (pageNum === currentPage - 2 || pageNum === currentPage + 2) {
                  return <span key={pageNum} className="text-gray-300">...</span>;
                }
                return null;
              })}
            </div>
            <button 
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="px-4 py-2 bg-gray-50 text-kv-navy rounded-xl font-bold text-sm disabled:opacity-50 hover:bg-gray-100 transition-colors border border-gray-100"
            >
              ถัดไป
            </button>
          </div>
        </div>
      )}

      {/* Product Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center sm:p-4 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, y: 100 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 100 }}
              className="bg-white w-full h-full sm:h-auto sm:max-h-[90vh] sm:max-w-2xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col"
            >
              <div className="p-4 sm:p-6 border-b border-gray-100 flex justify-between items-center shrink-0 bg-white z-10">
                <div className="flex items-center gap-3">
                  <div className="w-1.5 h-6 bg-kv-orange rounded-full" />
                  <h3 className="text-lg sm:text-xl font-black text-kv-navy uppercase tracking-tight">
                    {editingProduct ? 'แก้ไขข้อมูลสินค้า' : 'เพิ่มสินค้าใหม่'}
                  </h3>
                </div>
                <button 
                  onClick={() => setIsModalOpen(false)} 
                  className="p-2 text-gray-400 hover:text-kv-navy hover:bg-gray-100 rounded-xl transition-all"
                >
                  <X size={24} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 sm:p-8 space-y-6 sm:space-y-8 pb-24 sm:pb-8">
                {error && (
                  <div className="bg-red-50 text-red-700 p-4 rounded-2xl flex flex-col gap-3 border border-red-100 animate-shake">
                    <div className="flex items-center gap-3">
                      <AlertCircle size={20} className="shrink-0" />
                      <p className="text-xs sm:text-sm font-bold">{error}</p>
                    </div>
                  {error.includes('Schema Cache') && (
                    <button 
                      type="button"
                      onClick={async () => {
                        try {
                          const { error: rpcError } = await supabase.rpc('reload_schema');
                          if (rpcError) throw rpcError;
                          alert('ส่งคำสั่งรีโหลด Schema สำเร็จ ระบบจะรีโหลดหน้าเว็บใน 3 วินาที...');
                          setTimeout(() => window.location.reload(), 3000);
                        } catch (err: any) {
                          console.error('Reload schema error:', err);
                          alert('ไม่สามารถรีโหลดอัตโนมัติได้: ' + err.message + '\nกรุณารันคำสั่ง SQL ใน Supabase SQL Editor');
                        }
                      }}
                      className="ml-8 w-fit px-4 py-2 bg-red-600 text-white rounded-lg text-[10px] font-black hover:bg-red-700 transition-all shadow-md active:scale-95"
                    >
                      คลิกเพื่อรีโหลด Schema และรีเฟรชหน้าเว็บ
                    </button>
                  )}
                  </div>
                )}

                <div className="space-y-6">
                  {/* Basic Info Section */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-kv-navy/40 mb-2">
                      <ImageIcon size={14} />
                      <span className="text-[10px] font-black uppercase tracking-widest">ข้อมูลพื้นฐาน</span>
                    </div>
                    
                    <div className="space-y-1.5">
                      <label className="text-xs font-black text-gray-400 uppercase tracking-wider ml-1">ชื่อสินค้า</label>
                      <input 
                        type="text"
                        required
                        value={formData.title || ''}
                        onChange={(e) => setFormData({...formData, title: e.target.value})}
                        className="w-full px-4 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-kv-orange outline-none font-bold text-kv-navy transition-all"
                        placeholder="เช่น HP LaserJet Pro M15w"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-xs font-black text-gray-400 uppercase tracking-wider ml-1">SKU / รหัสสินค้า</label>
                        <input 
                          type="text"
                          value={formData.sku || ''}
                          onChange={(e) => setFormData({...formData, sku: e.target.value})}
                          className="w-full px-4 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-kv-orange outline-none font-bold text-kv-navy transition-all"
                          placeholder="เช่น KV-PR-001"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-black text-gray-400 uppercase tracking-wider ml-1">ราคา (บาท)</label>
                        <div className="relative">
                          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">฿</span>
                          <input 
                            type="number"
                            required
                            value={(formData.price === 0 || formData.price === undefined || formData.price === null) ? '' : formData.price}
                            onChange={(e) => setFormData({...formData, price: e.target.value === '' ? 0 : Number(e.target.value)})}
                            className="w-full pl-8 pr-4 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-kv-orange outline-none font-bold text-kv-navy transition-all"
                          />
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-black text-gray-400 uppercase tracking-wider ml-1">
                          สต็อก {formData.options && formData.options.length > 0 && '(จากตัวเลือก)'}
                        </label>
                        <input 
                          type="number"
                          required
                          readOnly={formData.options && formData.options.length > 0}
                          value={(formData.stock === 0 || formData.stock === undefined || formData.stock === null) ? '' : formData.stock}
                          onChange={(e) => setFormData({...formData, stock: e.target.value === '' ? 0 : Number(e.target.value)})}
                          className={`w-full px-4 py-3.5 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-kv-orange outline-none font-bold text-kv-navy transition-all ${
                            formData.options && formData.options.length > 0 ? 'bg-gray-100 cursor-not-allowed' : 'bg-gray-50'
                          }`}
                          placeholder="0"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Classification Section */}
                  <div className="space-y-4 pt-2">
                    <div className="flex items-center gap-2 text-kv-navy/40 mb-2">
                      <Package size={14} />
                      <span className="text-[10px] font-black uppercase tracking-widest">หมวดหมู่และเกรด</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-xs font-black text-gray-400 uppercase tracking-wider ml-1">แบรนด์</label>
                        <select 
                          value={formData.brand || ''}
                          onChange={(e) => {
                            const selectedBrand = dbBrands.find(b => b.name === e.target.value);
                            setFormData({
                              ...formData, 
                              brand: e.target.value,
                              brand_id: selectedBrand?.id
                            });
                          }}
                          className="w-full px-4 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-kv-orange outline-none font-bold text-kv-navy appearance-none transition-all"
                        >
                          <option value="">เลือกแบรนด์</option>
                          {dbBrands.map(brand => (
                            <option key={brand.id} value={brand.name}>{brand.name}</option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-black text-gray-400 uppercase tracking-wider ml-1">หมวดหมู่</label>
                        <select 
                          value={formData.category || ''}
                          onChange={(e) => setFormData({...formData, category: e.target.value})}
                          className="w-full px-4 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-kv-orange outline-none font-bold text-kv-navy appearance-none transition-all"
                        >
                          <option value="">เลือกหมวดหมู่</option>
                          {dbCategories.map(cat => (
                            <option key={cat.id} value={cat.name}>{cat.name}</option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-black text-gray-400 uppercase tracking-wider ml-1">สภาพสินค้า</label>
                        <select 
                          value={formData.condition || 'มือสอง'}
                          onChange={(e) => setFormData({...formData, condition: e.target.value})}
                          className="w-full px-4 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-kv-orange outline-none font-bold text-kv-navy appearance-none transition-all"
                        >
                          <option value="มือสอง">มือสอง</option>
                          <option value="ใหม่">ใหม่ (แกะกล่อง)</option>
                        </select>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-black text-gray-400 uppercase tracking-wider ml-1">เกรดสินค้า</label>
                        <select 
                          value={formData.grade || 'A'}
                          onChange={(e) => setFormData({...formData, grade: e.target.value})}
                          className="w-full px-4 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-kv-orange outline-none font-bold text-kv-navy appearance-none transition-all"
                        >
                          <option value="A">เกรด A</option>
                          <option value="B">เกรด B</option>
                          <option value="C">เกรด C</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Media Section */}
                  <div className="space-y-4 pt-2">
                    <div className="flex items-center gap-2 text-kv-navy/40 mb-2">
                      <ImageIcon size={14} />
                      <span className="text-[10px] font-black uppercase tracking-widest">รูปภาพสินค้า</span>
                    </div>
                    <div className="space-y-4">
                      {/* Image Gallery */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {formData.images?.filter(img => img && img.trim() !== '').map((img, idx) => (
                          <div key={idx} className={`relative aspect-square rounded-xl overflow-hidden border-2 transition-all ${formData.image_url === img ? 'border-kv-orange' : 'border-gray-100'}`}>
                            <img src={img} alt={`Product ${idx}`} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                            <div className="absolute top-1 right-1 flex gap-1">
                              <button 
                                type="button"
                                onClick={() => removeImage(idx)}
                                className="p-1 bg-red-500 text-white rounded-full hover:bg-red-600 shadow-sm"
                              >
                                <X size={12} />
                              </button>
                            </div>
                            <button 
                              type="button"
                              onClick={() => setMainImage(img)}
                              className={`absolute bottom-0 left-0 right-0 py-1 text-[9px] font-black uppercase tracking-tighter text-center transition-all ${
                                formData.image_url === img ? 'bg-kv-orange text-white' : 'bg-black/40 text-white/80 hover:bg-black/60'
                              }`}
                            >
                              {formData.image_url === img ? 'รูปหลัก' : 'ตั้งเป็นรูปหลัก'}
                            </button>
                          </div>
                        ))}
                        <label className="aspect-square border-2 border-dashed border-gray-200 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50 transition-all">
                          {isUploading ? (
                            <Loader2 className="animate-spin text-kv-orange" size={20} />
                          ) : (
                            <>
                              <Plus className="text-gray-400" size={24} />
                              <span className="text-[10px] font-bold text-gray-400 mt-1">เพิ่มรูป</span>
                            </>
                          )}
                          <input type="file" className="hidden" accept="image/*" onChange={handleFileUpload} disabled={isUploading} />
                        </label>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-black text-gray-400 uppercase tracking-wider ml-1">หรือระบุ URL รูปภาพ (แยกด้วยเครื่องหมายขึ้นบรรทัดใหม่)</label>
                        <textarea 
                          value={formData.images?.join('\n') || ''}
                          onChange={(e) => {
                            const urls = e.target.value.split('\n').filter(url => url.trim() !== '');
                            setFormData({...formData, images: urls, image_url: formData.image_url || urls[0] || ''});
                          }}
                          className="w-full h-24 px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-kv-orange outline-none font-bold text-kv-navy transition-all resize-none"
                          placeholder="https://example.com/image1.jpg&#10;https://example.com/image2.jpg"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Description Section */}
                  <div className="space-y-6 pt-2">
                    <div className="space-y-1.5">
                      <label className="text-xs font-black text-gray-400 uppercase tracking-wider ml-1">รายละเอียดย่อย (Short Description)</label>
                      <textarea 
                        rows={2}
                        value={formData.short_description || ''}
                        onChange={(e) => setFormData({...formData, short_description: e.target.value})}
                        className="w-full px-4 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-kv-orange outline-none resize-none font-bold text-kv-navy transition-all"
                        placeholder="สรุปจุดเด่นสั้นๆ..."
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-black text-gray-400 uppercase tracking-wider ml-1">รายละเอียดสินค้าแบบเต็ม (Full Description)</label>
                      <textarea 
                        rows={6}
                        value={formData.description || ''}
                        onChange={(e) => setFormData({...formData, description: e.target.value})}
                        className="w-full px-4 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-kv-orange outline-none resize-none font-bold text-kv-navy transition-all"
                        placeholder="กรอกรายละเอียดสินค้าแบบละเอียด..."
                      />
                    </div>
                  </div>

                  {/* Specifications Section */}
                  <div className="space-y-4 pt-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-kv-navy/40">
                        <Package size={14} />
                        <span className="text-[10px] font-black uppercase tracking-widest">ข้อมูลจำเพาะ (Specifications)</span>
                      </div>
                      <button 
                        type="button"
                        onClick={addSpecification}
                        className="text-[10px] font-black text-kv-orange uppercase tracking-widest hover:underline"
                      >
                        + เพิ่มสเปค
                      </button>
                    </div>
                    
                    <div className="space-y-3">
                      {formData.specifications?.map((spec, idx) => (
                        <div key={idx} className="flex gap-2 items-center">
                          <input 
                            type="text"
                            placeholder="หัวข้อ (เช่น แบรนด์)"
                            value={spec.key || ''}
                            onChange={(e) => updateSpecification(idx, e.target.value, spec.value)}
                            className="flex-1 px-3 py-2 bg-gray-50 border border-gray-100 rounded-xl outline-none text-xs font-bold text-kv-navy"
                          />
                          <input 
                            type="text"
                            placeholder="ข้อมูล (เช่น HP)"
                            value={spec.value || ''}
                            onChange={(e) => updateSpecification(idx, spec.key, e.target.value)}
                            className="flex-1 px-3 py-2 bg-gray-50 border border-gray-100 rounded-xl outline-none text-xs font-bold text-kv-navy"
                          />
                          <button 
                            type="button"
                            onClick={() => removeSpecification(idx)}
                            className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                          >
                            <X size={16} />
                          </button>
                        </div>
                      ))}
                      {(!formData.specifications || formData.specifications.length === 0) && (
                        <p className="text-[10px] text-gray-400 text-center py-4 border-2 border-dashed border-gray-100 rounded-2xl">ยังไม่มีข้อมูลจำเพาะ</p>
                      )}
                    </div>
                  </div>

                  {/* Options Section */}
                  <div className="space-y-4 pt-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-kv-navy/40">
                        <Layers size={14} />
                        <span className="text-[10px] font-black uppercase tracking-widest">ตัวเลือกเพิ่มเติม (Options)</span>
                      </div>
                      <button 
                        type="button"
                        onClick={addOption}
                        className="text-[10px] font-black text-kv-orange uppercase tracking-widest hover:underline"
                      >
                        + เพิ่มตัวเลือก
                      </button>
                    </div>
                    
                    <div className="space-y-6">
                      {formData.options?.map((option, optIdx) => (
                        <div key={optIdx} className="p-4 bg-gray-50 rounded-2xl border border-gray-100 space-y-4">
                          <div className="flex gap-2 items-center">
                            <input 
                              type="text"
                              placeholder="ชื่อตัวเลือก (เช่น สี, อุปกรณ์เสริม)"
                              value={option.name || ''}
                              onChange={(e) => updateOptionName(optIdx, e.target.value)}
                              className="flex-1 px-4 py-2 bg-white border border-gray-100 rounded-xl outline-none text-sm font-bold text-kv-navy"
                            />
                            <button 
                              type="button"
                              onClick={() => removeOption(optIdx)}
                              className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                            >
                              <X size={18} />
                            </button>
                          </div>
                          
                          <div className="space-y-2 pl-4 border-l-2 border-gray-200">
                            {option.values.map((val, valIdx) => (
                              <div key={valIdx} className="flex gap-2 items-center">
                                <input 
                                  type="text"
                                  placeholder="ชื่อค่า (เช่น สีแดง)"
                                  value={val.label || ''}
                                  onChange={(e) => updateOptionValue(optIdx, valIdx, e.target.value, val.price_modifier, val.stock || 0)}
                                  className="flex-1 px-3 py-2 bg-white border border-gray-100 rounded-xl outline-none text-xs font-bold text-kv-navy"
                                />
                                <div className="relative w-24">
                                  <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] text-gray-400 font-bold">+฿</span>
                                  <input 
                                    type="number"
                                    placeholder="ราคา"
                                    value={(val.price_modifier === 0 || val.price_modifier === undefined || val.price_modifier === null) ? '' : val.price_modifier}
                                    onChange={(e) => updateOptionValue(optIdx, valIdx, val.label, Number(e.target.value), val.stock || 0)}
                                    className="w-full pl-7 pr-2 py-2 bg-white border border-gray-100 rounded-xl outline-none text-xs font-bold text-kv-navy"
                                  />
                                </div>
                                <div className="relative w-24">
                                  <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] text-gray-400 font-bold">สต็อก</span>
                                  <input 
                                    type="number"
                                    placeholder="0"
                                    value={(val.stock === 0 || val.stock === undefined || val.stock === null) ? '' : val.stock}
                                    onChange={(e) => updateOptionValue(optIdx, valIdx, val.label, val.price_modifier, Number(e.target.value))}
                                    className="w-full pl-10 pr-2 py-2 bg-white border border-gray-100 rounded-xl outline-none text-xs font-bold text-kv-navy"
                                  />
                                </div>
                                <button 
                                  type="button"
                                  onClick={() => removeOptionValue(optIdx, valIdx)}
                                  className="p-1.5 text-gray-400 hover:text-red-500"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            ))}
                            <button 
                              type="button"
                              onClick={() => addOptionValue(optIdx)}
                              className="text-[10px] font-bold text-kv-navy/60 hover:text-kv-orange transition-colors"
                            >
                              + เพิ่มค่าตัวเลือก
                            </button>
                          </div>
                        </div>
                      ))}
                      {(!formData.options || formData.options.length === 0) && (
                        <p className="text-[10px] text-gray-400 text-center py-4 border-2 border-dashed border-gray-100 rounded-2xl">ยังไม่มีตัวเลือกเพิ่มเติม</p>
                      )}
                    </div>
                  </div>

                  {/* Flags Section */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                    {[
                      { id: 'is_new', label: 'สินค้าใหม่', state: formData.is_new },
                      { id: 'is_sale', label: 'ลดราคา', state: formData.is_sale },
                      { id: 'is_popular', label: 'ยอดนิยม', state: formData.is_popular },
                    ].map((flag) => (
                      <label key={flag.id} className={`flex items-center justify-between p-4 rounded-2xl border transition-all cursor-pointer ${
                        flag.state ? 'bg-orange-50 border-kv-orange/30 ring-1 ring-kv-orange/10' : 'bg-gray-50 border-gray-100'
                      }`}>
                        <span className={`text-xs font-black uppercase tracking-wider ${flag.state ? 'text-kv-orange' : 'text-gray-400'}`}>
                          {flag.label}
                        </span>
                        <input 
                          type="checkbox"
                          checked={flag.state}
                          onChange={(e) => setFormData({...formData, [flag.id]: e.target.checked})}
                          className="w-5 h-5 rounded-lg border-gray-300 text-kv-orange focus:ring-kv-orange"
                        />
                      </label>
                    ))}
                  </div>
                </div>

                {/* Footer Buttons (Mobile Fixed) */}
                <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-100 sm:relative sm:p-0 sm:border-0 sm:bg-transparent flex gap-3 z-20">
                  <button 
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1 py-4 border border-gray-100 rounded-2xl font-black uppercase tracking-widest text-gray-400 hover:bg-gray-50 transition-all active:scale-95"
                  >
                    ยกเลิก
                  </button>
                  <button 
                    type="submit"
                    disabled={isSaving || isUploading}
                    className="flex-[2] py-4 bg-kv-navy text-white rounded-2xl font-black uppercase tracking-widest hover:bg-kv-orange transition-all flex items-center justify-center gap-2 shadow-xl shadow-kv-navy/20 disabled:opacity-70 active:scale-95"
                  >
                    {isSaving ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
                    {editingProduct ? 'บันทึกข้อมูล' : 'เพิ่มสินค้า'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
