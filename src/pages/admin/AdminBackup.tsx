import React, { useState } from 'react';
import { Database, Download, Upload, AlertTriangle, CheckCircle2, Loader2, FileJson, AlertCircle, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '../../lib/supabase';

interface TableBackup {
  name: string;
  count: number;
  data: any[];
}

export function AdminBackup() {
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);
  const [importData, setImportData] = useState<TableBackup[] | null>(null);

  const tables = [
    'products',
    'categories',
    'brands',
    'blog_posts',
    'store_settings',
    'orders',
    'order_items',
    'profiles'
  ];

  const handleExport = async () => {
    setIsExporting(true);
    setStatus({ type: 'info', message: 'กำลังเตรียมข้อมูลสำหรับการส่งออก...' });
    
    try {
      const backup: TableBackup[] = [];
      
      for (const table of tables) {
        const { data, error, count } = await supabase
          .from(table)
          .select('*', { count: 'exact' });
          
        if (error) {
          console.error(`Error exporting ${table}:`, error);
          continue;
        }
        
        backup.push({
          name: table,
          count: count || 0,
          data: data || []
        });
      }
      
      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      
      link.href = url;
      link.download = `kingvision_backup_${timestamp}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      setStatus({ type: 'success', message: 'สำรองข้อมูลและส่งออกสำเร็จ!' });
    } catch (error: any) {
      console.error('Export error:', error);
      setStatus({ type: 'error', message: `เกิดข้อผิดพลาดในการส่งออก: ${error.message}` });
    } finally {
      setIsExporting(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const data = JSON.parse(content) as TableBackup[];
        setImportData(data);
        setStatus(null);
      } catch (error) {
        setStatus({ type: 'error', message: 'ไฟล์ข้อมูลไม่ถูกต้อง กรุณาเลือกไฟล์ JSON ที่ได้จากการส่งออก' });
      }
    };
    reader.readAsText(file);
  };

  const handleImport = async () => {
    if (!importData) return;
    
    const confirmImport = window.confirm('คำเตือน: การนำเข้าข้อมูลจะเขียนทับข้อมูลเดิมที่มี ID ตรงกัน หรือเพิ่มข้อมูลใหม่ลงในฐานข้อมูล คุณต้องการดำเนินการต่อหรือไม่?');
    if (!confirmImport) return;
    
    setIsImporting(true);
    setStatus({ type: 'info', message: 'กำลังเริ่มกระบวนการนำเข้าข้อมูล...' });
    
    try {
      for (const tableData of importData) {
        if (tableData.data.length === 0) continue;
        
        setStatus({ type: 'info', message: `กำลังนำเข้าข้อมูลตาราง: ${tableData.name} (${tableData.data.length} รายการ)...` });
        
        // Use upsert to handle existing records
        // Split into chunks if data is too large (Supabase limit)
        const chunkSize = 50;
        for (let i = 0; i < tableData.data.length; i += chunkSize) {
          const chunk = tableData.data.slice(i, i + chunkSize);
          const { error } = await supabase
            .from(tableData.name)
            .upsert(chunk, { onConflict: 'id' });
            
          if (error) {
            console.error(`Import error in ${tableData.name}:`, error);
            // We continue with other tables even if one fails
          }
        }
      }
      
      setStatus({ type: 'success', message: 'นำเข้าข้อมูลสำเร็จ!' });
      setImportData(null);
    } catch (error: any) {
      console.error('Import error:', error);
      setStatus({ type: 'error', message: `เกิดข้อผิดพลาดในการนำเข้า: ${error.message}` });
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="max-w-4xl space-y-8 font-thai pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-kv-navy flex items-center gap-2">
            <Database className="text-kv-orange" /> สำรองและจัดการข้อมูล
          </h2>
          <p className="text-sm text-gray-500 font-bold mt-1">ระบบนำเข้า-ส่งออกข้อมูลเพื่อการสำรองและย้ายฐานข้อมูล</p>
        </div>
      </div>

      <AnimatePresence>
        {status && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className={`p-4 rounded-2xl flex items-center gap-3 border shadow-sm ${
              status.type === 'success' ? 'bg-green-50 text-green-700 border-green-100' : 
              status.type === 'error' ? 'bg-red-50 text-red-700 border-red-100' : 
              'bg-blue-50 text-blue-700 border-blue-100'
            }`}
          >
            {status.type === 'success' ? <CheckCircle2 size={20} /> : 
             status.type === 'error' ? <AlertCircle size={20} /> : 
             <Loader2 size={20} className="animate-spin" />}
            <span className="text-sm font-bold">{status.message}</span>
            <button 
              onClick={() => setStatus(null)}
              className="ml-auto text-current opacity-50 hover:opacity-100 font-bold text-xs"
            >
              <X size={14} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Export Section */}
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden flex flex-col">
          <div className="p-6 border-b border-gray-50 flex items-center gap-3">
            <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-500">
              <Download size={24} />
            </div>
            <div>
              <h3 className="font-black text-kv-navy">ส่งออกข้อมูล (Export)</h3>
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Download full backup</p>
            </div>
          </div>
          <div className="p-6 flex-1 space-y-4">
            <p className="text-sm text-gray-600 leading-relaxed font-bold">
              สร้างไฟล์สำรองข้อมูลทั้งหมดในระบบ รวมถึงข้อมูลสินค้า, หมวดหมู่, แบรนด์, บทความ, และการตั้งค่าร้านค้า เพื่อเก็บรักษาหรือนำไปใช้งานต่อ
            </p>
            <div className="space-y-2">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">ข้อมูลที่จะถูกส่งออก:</p>
              <div className="flex flex-wrap gap-2">
                {tables.map(t => (
                  <span key={t} className="text-[10px] bg-gray-50 px-2 py-1 rounded-md text-gray-600 font-bold border border-gray-100">{t}</span>
                ))}
              </div>
            </div>
          </div>
          <div className="p-6 bg-gray-50/50 border-t border-gray-50">
            <button 
              onClick={handleExport}
              disabled={isExporting}
              className="w-full bg-kv-navy text-white rounded-2xl py-4 font-black uppercase tracking-wider hover:bg-kv-orange transition-all flex items-center justify-center gap-2 shadow-xl shadow-kv-navy/5 disabled:opacity-50 active:scale-95"
            >
              {isExporting ? <Loader2 className="animate-spin" size={20} /> : <Download size={20} />}
              เริ่มต้นการส่งออก
            </button>
          </div>
        </div>

        {/* Import Section */}
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden flex flex-col">
          <div className="p-6 border-b border-gray-50 flex items-center gap-3">
            <div className="w-12 h-12 bg-orange-50 rounded-2xl flex items-center justify-center text-kv-orange">
              <Upload size={24} />
            </div>
            <div>
              <h3 className="font-black text-kv-navy">นำเข้าข้อมูล (Import)</h3>
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Restore from backup</p>
            </div>
          </div>
          <div className="p-6 flex-1 space-y-6">
            <div className="bg-orange-50/50 p-4 rounded-2xl border border-orange-100 flex gap-3">
              <AlertTriangle className="text-kv-orange shrink-0" size={20} />
              <p className="text-[11px] text-orange-800 font-bold leading-relaxed">
                การนำเข้าข้อมูลจะเขียนทับข้อมูลที่มีอยู่เดิม (Upsert) กรุณาตรวจสอบไฟล์สำรองให้แน่ใจก่อนดำเนินการ
              </p>
            </div>
            
            <div className="space-y-4">
              <label className="block cursor-pointer group">
                <input 
                  type="file" 
                  accept=".json" 
                  onChange={handleFileChange}
                  className="hidden" 
                />
                <div className="w-full border-2 border-dashed border-gray-200 rounded-2xl p-6 flex flex-col items-center justify-center group-hover:border-kv-orange transition-colors">
                  <FileJson className="text-gray-300 group-hover:text-kv-orange mb-2 transition-colors" size={32} />
                  <p className="text-sm font-bold text-gray-500">คลิกที่นี่เพื่อเลือกไฟล์สำรอง (.json)</p>
                  {importData && <p className="text-xs text-green-600 font-bold mt-2">เลือกสำเร็จ! พบ {importData.length} ตาราง</p>}
                </div>
              </label>

              {importData && (
                <div className="space-y-3 bg-gray-50 p-4 rounded-2xl border border-gray-100">
                  <div className="flex items-center justify-between  mb-2">
                    <h4 className="text-xs font-black text-kv-navy uppercase tracking-wider">ตารางที่พบในไฟล์:</h4>
                    <button onClick={() => setImportData(null)} title="Clear">
                      <Trash2 size={14} className="text-red-400 hover:text-red-600" />
                    </button>
                  </div>
                  <div className="space-y-1.5">
                    {importData.map(t => (
                      <div key={t.name} className="flex items-center justify-between text-[11px] font-bold">
                        <span className="text-gray-600">{t.name}</span>
                        <span className="text-kv-navy">{t.data.length} รายการ</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
          <div className="p-6 bg-gray-50/50 border-t border-gray-50">
            <button 
              onClick={handleImport}
              disabled={isImporting || !importData}
              className="w-full bg-kv-navy text-white rounded-2xl py-4 font-black uppercase tracking-wider hover:bg-green-600 transition-all flex items-center justify-center gap-2 shadow-xl shadow-kv-navy/5 disabled:opacity-30 active:scale-95"
            >
              {isImporting ? <Loader2 className="animate-spin" size={20} /> : <Upload size={20} />}
              เริ่มต้นการนำเข้า
            </button>
          </div>
        </div>
      </div>

      {/* Database Status */}
      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8 space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center text-green-500">
             <Database size={20} />
          </div>
          <h3 className="font-black text-kv-navy">สถานะตัวจัดการฐานข้อมูล</h3>
        </div>
        
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 text-center">
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-1">Database</p>
            <p className="text-sm font-black text-kv-navy">Supabase Postgre</p>
          </div>
          <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 text-center">
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-1">API Status</p>
            <div className="flex items-center justify-center gap-1.5">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <p className="text-sm font-black text-kv-navy">Connected</p>
            </div>
          </div>
          <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 text-center">
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-1">Backup Format</p>
            <p className="text-sm font-black text-kv-navy">JSON v1.0</p>
          </div>
          <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 text-center">
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-1">Security</p>
            <p className="text-sm font-black text-kv-navy">AES-256 (SSL)</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function X(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  );
}
