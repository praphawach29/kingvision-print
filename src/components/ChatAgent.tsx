import React, { useState, useEffect, useRef } from 'react';
import { MessageCircle, X, Send, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Link } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import nongKingAvatar from '../assets/nong-king.jpg';

// Render assistant text: convert [label](url) markdown links into clickable elements
function renderMessage(text: string) {
  const parts: React.ReactNode[] = [];
  const linkRegex = /\[([^\]]+)\]\((\/[^\)]*|https?:\/\/[^\)]*)\)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = linkRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    const [, label, href] = match;
    if (href.startsWith('/')) {
      parts.push(
        <Link key={match.index} to={href} className="text-kv-orange underline font-bold hover:text-kv-navy transition-colors" onClick={() => {}}>
          {label}
        </Link>
      );
    } else {
      parts.push(
        <a key={match.index} href={href} target="_blank" rel="noopener noreferrer" className="text-kv-orange underline font-bold hover:text-kv-navy transition-colors">
          {label}
        </a>
      );
    }
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < text.length) parts.push(text.slice(lastIndex));
  return parts;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

const GREETING = 'สวัสดีครับ! ผม "น้องคิง" พนักงานขายจาก KingVision Print 🖨️ วันนี้สนใจดูเครื่องพิมพ์รุ่นไหน หรือมีอะไรให้ผมช่วยเช็คสต็อกไหมครับ?';

const QUICK_REPLIES = [
  { label: 'ติดตามออเดอร์',       text: 'ติดตามออเดอร์ของฉัน' },
  { label: 'ที่ตั้งร้าน',          text: 'ที่ตั้งร้านอยู่ที่ไหน?' },
  { label: 'แนะนำเครื่องพิมพ์',   text: 'แนะนำเครื่องพิมพ์ที่ขายดีหน่อยครับ' },
  { label: 'เช็คสต็อก',           text: 'อยากเช็คสต็อกสินค้า' },
  { label: 'ราคาหมึก HP',         text: 'หมึก HP มีรุ่นไหนบ้าง ราคาเท่าไหร่?' },
];

export function ChatAgent() {
  const [isOpen, setIsOpen]     = useState(false);
  const [input, setInput]       = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { addToCart } = useCart();
  const { user }      = useAuth();

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  const handleSend = async (overrideText?: string) => {
    const text = (overrideText ?? input).trim();
    if (!text || isLoading) return;

    const userMsg: Message = { role: 'user', content: text };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    // Keep last 12 messages for context window (start with a user message)
    const history = [...messages, userMsg].slice(-12);
    const trimmed = history[0]?.role === 'assistant' ? history.slice(1) : history;

    try {
      const res = await fetch('/api/ai/chat', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ messages: trimmed, userId: user?.id })
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'AI request failed');

      const assistantMsg: Message = { role: 'assistant', content: json.text || 'ขออภัยครับ ไม่ได้รับการตอบกลับ' };
      setMessages(prev => [...prev, assistantMsg]);

      // Execute cart actions returned by server
      if (Array.isArray(json.cartActions) && json.cartActions.length > 0) {
        for (const ca of json.cartActions) {
          addToCart({
            id:       ca.productId,
            name:     ca.productName,
            price:    ca.price,
            quantity: ca.quantity,
            image:    ca.imageUrl
          });
        }
      }
    } catch (err: any) {
      let errText = 'ขออภัยครับ เกิดข้อผิดพลาดในการเชื่อมต่อ กรุณาลองใหม่อีกครั้งนะครับ';
      if (err?.message?.includes('429') || err?.message?.toLowerCase().includes('quota')) {
        errText = 'ขออภัยครับ ขณะนี้มีผู้ใช้งานจำนวนมาก กรุณารอสักครู่แล้วลองใหม่นะครับ';
      }
      setMessages(prev => [...prev, { role: 'assistant', content: errText }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed bottom-24 md:bottom-6 right-6 z-[9999] font-thai">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-[100px] right-4 left-4 h-[68vh] sm:absolute sm:inset-auto sm:bottom-20 sm:right-0 w-auto sm:w-[380px] sm:h-[540px] bg-white rounded-[2rem] shadow-2xl border border-gray-100 overflow-hidden flex flex-col"
          >
            {/* Header */}
            <div className="bg-kv-navy p-4 flex justify-between items-center shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-kv-orange shadow-lg">
                  <img
                    src={nongKingAvatar}
                    alt="น้องคิง"
                    className="w-full h-full object-cover"
                    onError={e => { (e.target as HTMLImageElement).src = 'https://picsum.photos/seed/staff-man/100/100'; }}
                  />
                </div>
                <div>
                  <div className="text-white font-black text-sm leading-none">น้องคิง (Nong King)</div>
                  <div className="text-kv-orange text-[10px] font-bold uppercase tracking-widest mt-1 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" /> Online
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href="https://line.me/ti/p/@kingvision"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-[#06C755] text-white px-3 py-1 rounded-full text-[10px] font-bold flex items-center gap-1 hover:brightness-110 transition-all"
                >
                  <MessageCircle size={12} /> LINE
                </a>
                <button
                  onClick={() => setIsOpen(false)}
                  className="w-8 h-8 flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 rounded-full transition-all"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50/50 scroll-smooth">
              {/* Greeting bubble */}
              <motion.div initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} className="flex justify-start">
                <div className="max-w-[88%] p-3 rounded-2xl rounded-tl-none text-sm bg-white text-kv-navy border border-gray-100 shadow-sm leading-relaxed">
                  {GREETING}
                </div>
              </motion.div>

              {messages.map((msg, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, x: msg.role === 'user' ? 16 : -16 }}
                  animate={{ opacity: 1, x: 0 }}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-[88%] p-3 rounded-2xl text-sm leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-kv-navy text-white rounded-tr-none shadow-md whitespace-pre-wrap'
                      : 'bg-white text-kv-navy border border-gray-100 rounded-tl-none shadow-sm'
                  }`}>
                    {msg.role === 'user'
                      ? msg.content
                      : msg.content.split('\n').map((line, i) => (
                          <React.Fragment key={i}>
                            {i > 0 && <br />}
                            {renderMessage(line)}
                          </React.Fragment>
                        ))
                    }
                  </div>
                </motion.div>
              ))}

              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-white p-3 rounded-2xl rounded-tl-none border border-gray-100 shadow-sm flex items-center gap-2">
                    <div className="flex gap-1">
                      {[0, 0.2, 0.4].map((delay, i) => (
                        <motion.span
                          key={i}
                          animate={{ opacity: [0.3, 1, 0.3] }}
                          transition={{ duration: 1, repeat: Infinity, delay }}
                          className="w-2 h-2 bg-kv-orange rounded-full"
                        />
                      ))}
                    </div>
                    <span className="text-[10px] font-bold text-gray-400">น้องคิงกำลังคิด...</span>
                  </div>
                </div>
              )}
            </div>

            {/* Input */}
            <div className="p-3 pb-5 bg-white border-t border-gray-100 shrink-0 space-y-2">
              {/* Quick reply chips */}
              <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
                {QUICK_REPLIES.map(qr => (
                  <button
                    key={qr.label}
                    onClick={() => handleSend(qr.text)}
                    disabled={isLoading}
                    className="whitespace-nowrap px-3 py-1.5 bg-gray-100 text-[10px] font-bold text-gray-600 rounded-full hover:bg-kv-orange hover:text-white transition-all disabled:opacity-40"
                  >
                    {qr.label}
                  </button>
                ))}
                <a
                  href="https://line.me/ti/p/@kingvision"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="whitespace-nowrap px-3 py-1.5 bg-[#06C755]/10 text-[10px] font-bold text-[#06C755] rounded-full hover:bg-[#06C755] hover:text-white transition-all flex items-center gap-1"
                >
                  LINE
                </a>
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
                  placeholder="พิมพ์ข้อความที่นี่..."
                  className="flex-1 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-kv-orange text-sm"
                />
                <button
                  onClick={() => handleSend()}
                  disabled={!input.trim() || isLoading}
                  className="w-10 h-10 bg-kv-navy text-white rounded-xl flex items-center justify-center hover:bg-kv-orange transition-all disabled:opacity-40"
                >
                  {isLoading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* FAB */}
      <motion.button
        whileHover={{ scale: 1.06 }}
        whileTap={{ scale: 0.94 }}
        onClick={() => setIsOpen(v => !v)}
        className={`w-14 h-14 bg-kv-orange text-white rounded-full shadow-2xl flex items-center justify-center hover:bg-kv-navy transition-all relative group ${isOpen ? 'hidden sm:flex' : 'flex'}`}
      >
        <AnimatePresence mode="wait">
          {isOpen ? (
            <motion.div key="x" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }}>
              <X size={26} />
            </motion.div>
          ) : (
            <motion.div key="avatar" initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.8, opacity: 0 }} className="w-full h-full p-1">
              <div className="w-full h-full rounded-full overflow-hidden border-2 border-white shadow-inner">
                <img
                  src={nongKingAvatar}
                  alt="Nong King"
                  className="w-full h-full object-cover"
                  onError={e => { (e.target as HTMLImageElement).src = 'https://picsum.photos/seed/staff-man/100/100'; }}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {!isOpen && (
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 border-2 border-white rounded-full animate-bounce" />
        )}
        <div className="absolute right-full mr-4 bg-white px-4 py-2 rounded-xl shadow-xl border border-gray-100 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap hidden sm:block">
          <div className="text-kv-navy font-black text-xs">สอบถาม "น้องคิง" ได้ที่นี่!</div>
        </div>
      </motion.button>
    </div>
  );
}
