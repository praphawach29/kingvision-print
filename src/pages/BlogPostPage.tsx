import React, { useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { Calendar, User, ArrowLeft, Tag, Share2 } from 'lucide-react';
import { blogPosts } from '../data/blogPosts';
import { Breadcrumb } from '../components/Breadcrumb';
import { SEO } from '../components/SEO';

export function BlogPostPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const post = blogPosts.find(p => p.id === id);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [id]);

  if (!post) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 font-thai">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">ไม่พบบทความ</h1>
        <p className="text-gray-500 mb-8">บทความที่คุณกำลังค้นหาอาจถูกลบหรือไม่มีอยู่จริง</p>
        <button 
          onClick={() => navigate('/blog')}
          className="px-6 py-3 bg-kv-navy text-white rounded-full hover:bg-kv-orange transition-colors"
        >
          กลับไปหน้าบทความ
        </button>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 min-h-screen font-thai pb-16">
      <SEO 
        title={post.title}
        description={post.excerpt}
        image={post.image}
        type="article"
        schema={{
          "@context": "https://schema.org",
          "@type": "BlogPosting",
          "headline": post.title,
          "image": [post.image],
          "datePublished": post.date,
          "author": [{
            "@type": "Person",
            "name": post.author
          }]
        }}
      />
      {/* Header Image */}
      <div className="w-full h-[40vh] md:h-[50vh] relative">
        <img 
          src={post.image} 
          alt={post.title} 
          className="w-full h-full object-cover"
          referrerPolicy="no-referrer"
        />
        <div className="absolute inset-0 bg-black/40"></div>
        <div className="absolute inset-0 flex items-end pb-12">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
            <Breadcrumb 
              items={[
                { label: 'บทความ', path: '/blog' },
                { label: post.title }
              ]} 
              light 
              className="mb-6"
            />
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <span className="bg-kv-orange text-white text-sm font-bold px-3 py-1 rounded-full shadow-md inline-flex items-center mb-4">
                <Tag size={14} className="mr-1" /> {post.category}
              </span>
              <h1 className="text-3xl md:text-5xl font-bold text-white leading-tight mb-4 text-shadow-sm">
                {post.title}
              </h1>
              <div className="flex items-center text-white/90 text-sm space-x-6">
                <div className="flex items-center">
                  <Calendar size={16} className="mr-2" />
                  {post.date}
                </div>
                <div className="flex items-center">
                  <User size={16} className="mr-2" />
                  {post.author}
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white rounded-2xl shadow-sm p-6 md:p-10 -mt-20 relative z-10 border border-gray-100">
          <div className="prose prose-lg max-w-none text-gray-700">
            <p className="text-xl text-gray-600 font-medium leading-relaxed mb-8 border-l-4 border-kv-orange pl-4">
              {post.excerpt}
            </p>
            
            {post.content.map((paragraph, index) => (
              <p key={index} className="mb-6 leading-relaxed">
                {paragraph}
              </p>
            ))}
          </div>

          {/* Share & Tags */}
          <div className="mt-12 pt-8 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between">
            <div className="flex items-center space-x-2 mb-4 sm:mb-0">
              <span className="text-gray-500 font-medium">แท็ก:</span>
              <span className="bg-gray-100 text-gray-600 text-sm px-3 py-1 rounded-full hover:bg-gray-200 cursor-pointer transition-colors">
                {post.category}
              </span>
              <span className="bg-gray-100 text-gray-600 text-sm px-3 py-1 rounded-full hover:bg-gray-200 cursor-pointer transition-colors">
                ปริ้นเตอร์
              </span>
            </div>
            
            <button className="flex items-center text-kv-navy hover:text-kv-orange font-bold transition-colors">
              <Share2 size={18} className="mr-2" />
              แชร์บทความนี้
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
