import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { Calendar, User, ArrowLeft, Tag, Share2 } from 'lucide-react';
import { Breadcrumb } from '../components/Breadcrumb';
import { SEO } from '../components/SEO';
import { supabase } from '../lib/supabase';

interface BlogPost {
  id: string;
  title: string;
  excerpt: string;
  content: string;
  image_url: string;
  category: string;
  created_at: string;
}

export function BlogPostPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [post, setPost] = useState<BlogPost | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    window.scrollTo(0, 0);
    if (id) fetchPost(id);
  }, [id]);

  async function fetchPost(postId: string) {
    setIsLoading(true);
    const { data } = await supabase
      .from('blog_posts')
      .select('id,title,excerpt,content,image_url,category,created_at')
      .eq('id', postId)
      .eq('published', true)
      .single();
    setPost(data || null);
    setIsLoading(false);
  }

  if (isLoading) {
    return <div className="min-h-screen bg-gray-50" />;
  }

  if (!post) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 font-thai">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">???????????</h1>
        <p className="text-gray-500 mb-8">???????????????????????????????????????????????</p>
        <button
          onClick={() => navigate('/blog')}
          className="px-6 py-3 bg-kv-navy text-white rounded-full hover:bg-kv-orange transition-colors"
        >
          ????????????????
        </button>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 min-h-screen font-thai pb-16">
      <SEO
        title={post.title}
        description={post.excerpt}
        image={post.image_url}
        type="article"
      />
      <div className="w-full h-[40vh] md:h-[50vh] relative">
        <img
          src={post.image_url}
          alt={post.title}
          className="w-full h-full object-cover"
          referrerPolicy="no-referrer"
        />
        <div className="absolute inset-0 bg-black/40"></div>
        <div className="absolute inset-0 flex items-end pb-12">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
            <Breadcrumb
              items={[
                { label: '??????', path: '/blog' },
                { label: post.title }
              ]}
              light
              className="mb-6"
            />
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <span className="bg-kv-orange text-white text-sm font-bold px-3 py-1 rounded-full shadow-md inline-flex items-center mb-4">
                <Tag size={14} className="mr-1" /> {post.category}
              </span>
              <h1 className="text-3xl md:text-5xl font-bold text-white leading-tight mb-4 text-shadow-sm">
                {post.title}
              </h1>
              <div className="flex items-center text-white/90 text-sm space-x-6">
                <div className="flex items-center">
                  <Calendar size={16} className="mr-2" />
                  {new Date(post.created_at).toLocaleDateString('th-TH')}
                </div>
                <div className="flex items-center">
                  <User size={16} className="mr-2" />
                  KingVision Team
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white rounded-2xl shadow-sm p-6 md:p-10 -mt-20 relative z-10 border border-gray-100">
          <div className="prose prose-lg max-w-none text-gray-700 whitespace-pre-wrap">
            <p className="text-xl text-gray-600 font-medium leading-relaxed mb-8 border-l-4 border-kv-orange pl-4">
              {post.excerpt}
            </p>
            <p className="leading-relaxed">{post.content}</p>
          </div>

          <div className="mt-12 pt-8 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between">
            <div className="flex items-center space-x-2 mb-4 sm:mb-0">
              <span className="text-gray-500 font-medium">????:</span>
              <span className="bg-gray-100 text-gray-600 text-sm px-3 py-1 rounded-full">{post.category}</span>
              <span className="bg-gray-100 text-gray-600 text-sm px-3 py-1 rounded-full">??????????</span>
            </div>

            <button className="flex items-center text-kv-navy hover:text-kv-orange font-bold transition-colors">
              <Share2 size={18} className="mr-2" />
              ?????????????
            </button>
          </div>

          <Link to="/blog" className="inline-flex items-center mt-8 text-kv-navy hover:text-kv-orange font-bold transition-colors">
            <ArrowLeft size={16} className="mr-2" />
            ??????????????
          </Link>
        </div>
      </div>
    </div>
  );
}
