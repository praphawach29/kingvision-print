import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { Calendar, User, ArrowRight, Tag } from 'lucide-react';
import { blogPosts } from '../data/blogPosts';
import { Breadcrumb } from '../components/Breadcrumb';
import { SEO } from '../components/SEO';

export function BlogPage() {
  return (
    <div className="bg-gray-50 min-h-screen font-thai pb-16">
      <SEO 
        title="บทความและข่าวสาร"
        description="อัปเดตความรู้ เทคนิคการใช้งาน และข่าวสารล่าสุดเกี่ยวกับเครื่องพิมพ์และอุปกรณ์ไอที จาก KingVision Print"
      />
      {/* Hero Section */}
      <div className="bg-kv-navy text-white py-16 px-4 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0">
          <div className="absolute -top-24 -right-24 w-96 h-96 bg-kv-orange rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
        </div>
        
        <div className="max-w-7xl mx-auto relative z-10 text-center">
          <Breadcrumb items={[{ label: 'บทความ' }]} light className="justify-center mb-4" />
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl md:text-5xl font-bold mb-4"
          >
            บทความและข่าวสาร
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-lg md:text-xl text-gray-300 max-w-2xl mx-auto"
          >
            อัปเดตความรู้ เทคนิคการใช้งาน และข่าวสารล่าสุดเกี่ยวกับเครื่องพิมพ์และอุปกรณ์ไอที
          </motion.p>
        </div>
      </div>

      {/* Blog Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {blogPosts.map((post, index) => (
            <motion.article
              key={post.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className="bg-white rounded-2xl shadow-sm hover:shadow-xl transition-shadow duration-300 overflow-hidden flex flex-col border border-gray-100"
            >
              <Link to={`/blog/${post.id}`} className="block relative h-56 overflow-hidden group">
                <img 
                  src={post.image} 
                  alt={post.title} 
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute top-4 left-4">
                  <span className="bg-kv-orange text-white text-xs font-bold px-3 py-1 rounded-full shadow-md flex items-center">
                    <Tag size={12} className="mr-1" /> {post.category}
                  </span>
                </div>
              </Link>
              
              <div className="p-6 flex flex-col flex-grow">
                <div className="flex items-center text-xs text-gray-500 mb-3 space-x-4">
                  <div className="flex items-center">
                    <Calendar size={14} className="mr-1" />
                    {post.date}
                  </div>
                  <div className="flex items-center">
                    <User size={14} className="mr-1" />
                    {post.author}
                  </div>
                </div>
                
                <Link to={`/blog/${post.id}`}>
                  <h2 className="text-xl font-bold text-gray-900 mb-3 hover:text-kv-orange transition-colors line-clamp-2">
                    {post.title}
                  </h2>
                </Link>
                
                <p className="text-gray-600 text-sm mb-6 flex-grow line-clamp-3">
                  {post.excerpt}
                </p>
                
                <Link 
                  to={`/blog/${post.id}`}
                  className="inline-flex items-center text-kv-navy font-bold hover:text-kv-orange transition-colors group"
                >
                  อ่านเพิ่มเติม 
                  <ArrowRight size={16} className="ml-2 group-hover:translate-x-1 transition-transform" />
                </Link>
              </div>
            </motion.article>
          ))}
        </div>
      </div>
    </div>
  );
}
