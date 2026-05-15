import React, { useState } from 'react';
import { motion } from 'motion/react';
import { MapPin, Phone, Mail, Clock, Send, MessageCircle } from 'lucide-react';
import { useSettings } from '../context/SettingsContext';

export function ContactPage() {
  const { settings } = useSettings();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    subject: '',
    message: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'ส่งข้อความไม่สำเร็จ');

      setIsSuccess(true);
      setFormData({ name: '', email: '', phone: '', subject: '', message: '' });
      setTimeout(() => setIsSuccess(false), 8000);
    } catch (err: any) {
      setError(err.message || 'เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-gray-50 min-h-screen font-thai pb-16">
      {/* Hero Section */}
      <div className="bg-kv-navy text-white py-16 px-4 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0">
          <div className="absolute -top-24 -right-24 w-96 h-96 bg-kv-orange rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
          <div className="absolute top-24 -left-24 w-72 h-72 bg-blue-400 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>
        </div>
        
        <div className="max-w-7xl mx-auto relative z-10 text-center">
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl md:text-5xl font-bold mb-4"
          >
            ติดต่อเรา
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-lg md:text-xl text-gray-300 max-w-2xl mx-auto"
          >
            เราพร้อมให้คำปรึกษาและบริการคุณอย่างเต็มที่ ไม่ว่าจะเป็นเรื่องสินค้า บริการหลังการขาย หรือแจ้งปัญหาการใช้งาน
          </motion.p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Contact Information */}
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="lg:col-span-1 space-y-6"
          >
            <div className="bg-white rounded-2xl shadow-sm p-8 border border-gray-100">
              <h2 className="text-2xl font-bold text-kv-navy mb-6">ข้อมูลการติดต่อ</h2>
              
              <div className="space-y-6">
                {settings.address && (
                  <div className="flex items-start">
                    <div className="w-12 h-12 bg-blue-50 text-kv-navy rounded-full flex items-center justify-center shrink-0 mr-4">
                      <MapPin size={24} />
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900 mb-1">ที่ตั้งสำนักงาน</h3>
                      <p className="text-gray-600 text-sm leading-relaxed whitespace-pre-line">{settings.address}</p>
                    </div>
                  </div>
                )}

                {(settings.phone_main || settings.phone_support) && (
                  <div className="flex items-start">
                    <div className="w-12 h-12 bg-orange-50 text-kv-orange rounded-full flex items-center justify-center shrink-0 mr-4">
                      <Phone size={24} />
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900 mb-1">เบอร์โทรศัพท์</h3>
                      {settings.phone_main && (
                        <a href={`tel:${settings.phone_main.replace(/-/g, '')}`} className="block text-gray-600 text-sm hover:text-kv-orange transition-colors">
                          {settings.phone_main} (ฝ่ายขาย)
                        </a>
                      )}
                      {settings.phone_support && (
                        <a href={`tel:${settings.phone_support.replace(/-/g, '')}`} className="block text-gray-600 text-sm hover:text-kv-orange transition-colors">
                          {settings.phone_support} (ฝ่ายซัพพอร์ต)
                        </a>
                      )}
                    </div>
                  </div>
                )}

                {(settings.line_oa_id || settings.line_oa_link) && (
                  <div className="flex items-start">
                    <div className="w-12 h-12 bg-green-50 text-green-600 rounded-full flex items-center justify-center shrink-0 mr-4">
                      <MessageCircle size={24} />
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900 mb-1">LINE Official</h3>
                      {settings.line_oa_id && <p className="text-gray-600 text-sm">{settings.line_oa_id}</p>}
                      <a href={settings.line_oa_link || '#'} target="_blank" rel="noopener noreferrer" className="text-green-600 text-sm font-bold hover:underline mt-1 inline-block">
                        คลิกเพื่อแอดไลน์
                      </a>
                    </div>
                  </div>
                )}

                {(settings.contact_email || settings.email_sales) && (
                  <div className="flex items-start">
                    <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center shrink-0 mr-4">
                      <Mail size={24} />
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900 mb-1">อีเมล</h3>
                      {settings.contact_email && <p className="text-gray-600 text-sm">{settings.contact_email}</p>}
                      {settings.email_sales && <p className="text-gray-600 text-sm">{settings.email_sales}</p>}
                    </div>
                  </div>
                )}

                {settings.business_hours && (
                  <div className="flex items-start">
                    <div className="w-12 h-12 bg-gray-100 text-gray-600 rounded-full flex items-center justify-center shrink-0 mr-4">
                      <Clock size={24} />
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900 mb-1">เวลาทำการ</h3>
                      <p className="text-gray-600 text-sm whitespace-pre-line">{settings.business_hours}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </motion.div>

          {/* Contact Form */}
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="lg:col-span-2"
          >
            <div className="bg-white rounded-2xl shadow-sm p-8 border border-gray-100 h-full">
              <h2 className="text-2xl font-bold text-kv-navy mb-2">ส่งข้อความถึงเรา</h2>
              <p className="text-gray-500 mb-8">กรอกข้อมูลด้านล่างเพื่อให้เจ้าหน้าที่ติดต่อกลับโดยเร็วที่สุด</p>

              {isSuccess ? (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-green-50 border border-green-200 text-green-700 p-6 rounded-xl text-center"
                >
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Send size={32} className="text-green-600" />
                  </div>
                  <h3 className="text-xl font-bold mb-2">ส่งข้อความสำเร็จ!</h3>
                  <p>ขอบคุณที่ติดต่อเรา เจ้าหน้าที่จะรีบดำเนินการและติดต่อกลับโดยเร็วที่สุดครับ</p>
                </motion.div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">ชื่อ - นามสกุล *</label>
                      <input
                        type="text"
                        id="name"
                        name="name"
                        required
                        value={formData.name}
                        onChange={handleChange}
                        className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-kv-orange focus:border-kv-orange outline-none transition-colors"
                        placeholder="ระบุชื่อของคุณ"
                      />
                    </div>
                    <div>
                      <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">เบอร์โทรศัพท์ *</label>
                      <input
                        type="tel"
                        id="phone"
                        name="phone"
                        required
                        value={formData.phone}
                        onChange={handleChange}
                        className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-kv-orange focus:border-kv-orange outline-none transition-colors"
                        placeholder="08X-XXX-XXXX"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">อีเมล</label>
                      <input
                        type="email"
                        id="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-kv-orange focus:border-kv-orange outline-none transition-colors"
                        placeholder="example@email.com"
                      />
                    </div>
                    <div>
                      <label htmlFor="subject" className="block text-sm font-medium text-gray-700 mb-2">หัวข้อการติดต่อ *</label>
                      <select
                        id="subject"
                        name="subject"
                        required
                        value={formData.subject}
                        onChange={handleChange}
                        className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-kv-orange focus:border-kv-orange outline-none transition-colors bg-white"
                      >
                        <option value="">-- เลือกหัวข้อ --</option>
                        <option value="สอบถามข้อมูลสินค้า">สอบถามข้อมูลสินค้า</option>
                        <option value="แจ้งปัญหาการใช้งาน/เคลมสินค้า">แจ้งปัญหาการใช้งาน / เคลมสินค้า</option>
                        <option value="ติดตามสถานะการจัดส่ง">ติดตามสถานะการจัดส่ง</option>
                        <option value="ติดต่อเรื่องอื่นๆ">ติดต่อเรื่องอื่นๆ</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-2">รายละเอียด *</label>
                    <textarea
                      id="message"
                      name="message"
                      required
                      rows={5}
                      value={formData.message}
                      onChange={handleChange}
                      className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-kv-orange focus:border-kv-orange outline-none transition-colors resize-none"
                      placeholder="พิมพ์ข้อความของคุณที่นี่..."
                    ></textarea>
                  </div>

                  {error && (
                    <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                      {error}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className={`w-full py-4 rounded-lg font-bold text-white flex items-center justify-center transition-all ${
                      isSubmitting ? 'bg-gray-400 cursor-not-allowed' : 'bg-kv-navy hover:bg-kv-orange shadow-md hover:shadow-lg'
                    }`}
                  >
                    {isSubmitting ? (
                      <span className="flex items-center">
                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        กำลังส่งข้อความ...
                      </span>
                    ) : (
                      <span className="flex items-center">
                        <Send size={20} className="mr-2" />
                        ส่งข้อความ
                      </span>
                    )}
                  </button>
                </form>
              )}
            </div>
          </motion.div>
        </div>

        {/* Map Section */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mt-12 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden"
        >
          <div className="p-6 border-b border-gray-100">
            <h2 className="text-xl font-bold text-kv-navy">แผนที่การเดินทาง</h2>
          </div>
          <div className="w-full h-[400px] bg-gray-100 relative">
            {settings.map_embed_url ? (
              (() => {
                const isEmbedUrl = settings.map_embed_url.includes('/maps/embed') || settings.map_embed_url.includes('output=embed');
                if (isEmbedUrl) {
                  return (
                    <iframe
                      src={settings.map_embed_url}
                      width="100%"
                      height="100%"
                      style={{ border: 0 }}
                      allowFullScreen={true}
                      loading="lazy"
                      referrerPolicy="no-referrer-when-downgrade"
                      title="KingVision Location"
                    />
                  );
                }
                return (
                  <div className="w-full h-full flex flex-col items-center justify-center gap-4 text-gray-500 bg-gray-50">
                    <div className="w-16 h-16 bg-kv-orange/10 rounded-full flex items-center justify-center">
                      <MapPin size={32} className="text-kv-orange" />
                    </div>
                    <div className="text-center">
                      <p className="font-bold text-gray-700 mb-1">ดูแผนที่การเดินทาง</p>
                      {settings.address && <p className="text-sm text-gray-500 max-w-xs">{settings.address}</p>}
                    </div>
                    <a
                      href={settings.map_embed_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-6 py-3 bg-kv-navy text-white rounded-xl font-bold text-sm hover:bg-kv-orange transition-all flex items-center gap-2"
                    >
                      <MapPin size={16} /> เปิดใน Google Maps
                    </a>
                  </div>
                );
              })()
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center gap-3 text-gray-400">
                <MapPin size={40} className="text-gray-300" />
                <p className="text-sm font-medium">ยังไม่ได้ตั้งค่าแผนที่</p>
                <p className="text-xs">ไปที่ Admin → ตั้งค่า → ข้อมูลหน้าติดต่อเรา เพื่อเพิ่ม Google Maps</p>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
