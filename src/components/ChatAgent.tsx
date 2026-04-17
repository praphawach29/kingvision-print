import React, { useState, useEffect, useRef } from 'react';
import { MessageCircle, X, Send, Loader2, User, ShoppingCart, Search, Package } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { chatWithAgent, toolHandlers } from '../services/geminiService';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import nongKingAvatar from '../assets/nong-king.jpg';

interface Message {
  role: 'user' | 'model' | 'function';
  parts: { text?: string; functionCall?: any; functionResponse?: any; thought?: any }[];
}

export function ChatAgent() {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const greeting = 'สวัสดีครับ! ผม "น้องคิง" พนักงานขายจาก KingVision Print ยินดีให้บริการครับ วันนี้สนใจดูเครื่องพิมพ์รุ่นไหน หรือมีอะไรให้ผมช่วยเช็คสต็อกไหมครับ?';
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { addToCart } = useCart();
  const { user } = useAuth();

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      role: 'user',
      parts: [{ text: input }]
    };

    setMessages(prev => [...prev, userMessage]);
    
    // Safe history pruning: ensure it starts with a 'user' message and keep last 10 messages
    const getSafeHistory = (msgs: Message[]) => {
      let startIdx = Math.max(0, msgs.length - 10);
      while (startIdx < msgs.length && msgs[startIdx].role !== 'user') {
        startIdx++;
      }
      return msgs.slice(startIdx);
    };

    const currentHistory = [...getSafeHistory(messages), userMessage];
    
    setInput('');
    setIsLoading(true);

    try {
      await processChat(currentHistory);
    } catch (error: any) {
      console.error("Chat Error Details:", error);
      let errorMessage = 'ขออภัยครับ เกิดข้อผิดพลาดบางอย่างในการเชื่อมต่อ กรุณาลองใหม่อีกครั้งนะครับ';
      
      // Handle Quota Exceeded (429)
      if (error?.message?.includes('429') || error?.message?.includes('quota') || error?.status === 'RESOURCE_EXHAUSTED') {
        errorMessage = 'ขออภัยครับ ขณะนี้น้องคิงมีผู้ใช้งานจำนวนมากเกินโควตาชั่วคราว กรุณารอสักครู่แล้วลองใหม่อีกครั้งนะครับ';
      }

      setMessages(prev => [...prev, {
        role: 'model',
        parts: [{ text: errorMessage }]
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const processChat = async (currentMessages: Message[]) => {
    const response = await chatWithAgent(currentMessages, user?.id);
    
    // Use the content from the model directly to preserve all parts (including thoughts)
    const modelContent = response.candidates?.[0]?.content;
    if (!modelContent) {
      throw new Error('No response from AI model (possibly blocked by safety filters)');
    }

    const modelMessage: Message = {
      role: 'model',
      parts: modelContent.parts
    };

    setMessages(prev => [...prev, modelMessage]);

    if (response.functionCalls) {
      const functionResponses: Message = {
        role: 'function',
        parts: []
      };

      for (const call of response.functionCalls) {
        let result;
        try {
          if (call.name === 'add_to_cart') {
            const product = await toolHandlers.get_product_details({ productId: call.args.productId });
            addToCart({
              id: product.id,
              name: product.title,
              price: product.price,
              quantity: call.args.quantity || 1,
              image: product.image_url
            });
            result = { success: true, message: `เพิ่ม ${product.title} ลงตะกร้าเรียบร้อยแล้ว` };
          } else {
            const handler = (toolHandlers as any)[call.name];
            if (handler) {
              result = await handler(call.args, user?.id);
            } else {
              result = { error: 'Tool not found' };
            }
          }
        } catch (err) {
          console.error(`Tool ${call.name} execution failed:`, err);
          result = { error: err instanceof Error ? err.message : 'Internal tool error' };
        }

        functionResponses.parts.push({
          functionResponse: {
            name: call.name,
            response: { result }
          }
        });
      }

      setMessages(prev => [...prev, functionResponses]);
      // Continue the conversation with the tool results
      await processChat([...currentMessages, modelMessage, functionResponses]);
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
            className="fixed bottom-[100px] right-4 left-4 h-[65vh] sm:absolute sm:inset-auto sm:bottom-20 sm:right-0 w-auto sm:w-[360px] sm:h-[500px] bg-white rounded-[2rem] shadow-2xl border border-gray-100 overflow-hidden flex flex-col"
          >
            {/* Header */}
            <div className="bg-kv-navy p-4 flex justify-between items-center shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-white shadow-lg overflow-hidden border-2 border-kv-orange">
                  <img 
                    src={nongKingAvatar} 
                    alt="น้องคิง พนักงานขาย" 
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      // Fallback if image not uploaded yet
                      (e.target as HTMLImageElement).src = "https://picsum.photos/seed/staff-man/100/100";
                    }}
                  />
                </div>
                <div>
                  <div className="text-white font-black text-sm leading-none">น้องคิง (Nong King)</div>
                  <div className="text-kv-orange text-[10px] font-bold uppercase tracking-widest mt-1 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" /> Online
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <a 
                  href="https://line.me/ti/p/@kingvision" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="bg-[#06C755] text-white px-3 py-1 rounded-full text-[10px] font-bold flex items-center gap-1 hover:brightness-110 transition-all shadow-sm"
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
            <div 
              ref={scrollRef}
              className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50/50 scroll-smooth"
            >
              {/* Initial Greeting */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex justify-start"
              >
                <div className="max-w-[85%] p-3 rounded-2xl rounded-tl-none text-sm bg-white text-kv-navy border border-gray-100 shadow-sm font-bold">
                  {greeting}
                </div>
              </motion.div>

              {messages.filter(m => m.role !== 'function' && !m.parts.some(p => p.functionCall)).map((msg, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, x: msg.role === 'user' ? 20 : -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-[85%] p-3 rounded-2xl text-sm ${
                    msg.role === 'user' 
                      ? 'bg-kv-navy text-white rounded-tr-none shadow-md' 
                      : 'bg-white text-kv-navy border border-gray-100 rounded-tl-none shadow-sm'
                  }`}>
                    {msg.parts.map((p, pIdx) => p.text && (
                      <div key={pIdx} className="whitespace-pre-wrap font-bold">
                        {p.text}
                      </div>
                    ))}
                  </div>
                </motion.div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-white p-3 rounded-2xl rounded-tl-none border border-gray-100 shadow-sm flex items-center gap-2">
                    <div className="flex gap-1">
                      <motion.span
                        animate={{ opacity: [0.4, 1, 0.4] }}
                        transition={{ duration: 1, repeat: Infinity, delay: 0 }}
                        className="w-1.5 h-1.5 bg-kv-orange rounded-full"
                      />
                      <motion.span
                        animate={{ opacity: [0.4, 1, 0.4] }}
                        transition={{ duration: 1, repeat: Infinity, delay: 0.2 }}
                        className="w-1.5 h-1.5 bg-kv-orange rounded-full"
                      />
                      <motion.span
                        animate={{ opacity: [0.4, 1, 0.4] }}
                        transition={{ duration: 1, repeat: Infinity, delay: 0.4 }}
                        className="w-1.5 h-1.5 bg-kv-orange rounded-full"
                      />
                    </div>
                    <span className="text-[10px] font-bold text-gray-400">น้องคิงกำลังคิด...</span>
                  </div>
                </div>
              )}
            </div>

            {/* Input */}
            <div className="p-4 bg-white border-t border-gray-100 shrink-0 pb-safe">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                  placeholder="พิมพ์ข้อความที่นี่..."
                  className="flex-1 px-4 py-2 bg-gray-50 border border-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-kv-orange font-bold text-sm"
                />
                <button
                  onClick={handleSend}
                  disabled={!input.trim() || isLoading}
                  className="w-10 h-10 bg-kv-navy text-white rounded-xl flex items-center justify-center hover:bg-kv-orange transition-all disabled:opacity-50"
                >
                  <Send size={18} />
                </button>
              </div>
              <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
                <button 
                  onClick={() => setInput('ติดตามออเดอร์ของฉัน')}
                  className="whitespace-nowrap px-3 py-1 bg-gray-100 text-[10px] font-bold text-gray-500 rounded-full hover:bg-kv-orange hover:text-white transition-all"
                >
                  ติดตามออเดอร์
                </button>
                <button 
                  onClick={() => setInput('ที่ตั้งร้านอยู่ที่ไหน?')}
                  className="whitespace-nowrap px-3 py-1 bg-gray-100 text-[10px] font-bold text-gray-500 rounded-full hover:bg-kv-orange hover:text-white transition-all"
                >
                  ที่ตั้งร้าน
                </button>
                <button 
                  onClick={() => setInput('แนะนำเครื่องพิมพ์รุ่นไหนดี?')}
                  className="whitespace-nowrap px-3 py-1 bg-gray-100 text-[10px] font-bold text-gray-500 rounded-full hover:bg-kv-orange hover:text-white transition-all"
                >
                  แนะนำเครื่องพิมพ์
                </button>
                <button 
                  onClick={() => setInput('เช็คสต็อกสินค้าให้หน่อย')}
                  className="whitespace-nowrap px-3 py-1 bg-gray-100 text-[10px] font-bold text-gray-500 rounded-full hover:bg-kv-orange hover:text-white transition-all"
                >
                  เช็คสต็อก
                </button>
                <button 
                  onClick={() => setInput('ติดต่อเจ้าหน้าที่')}
                  className="whitespace-nowrap px-3 py-1 bg-gray-100 text-[10px] font-bold text-gray-500 rounded-full hover:bg-kv-orange hover:text-white transition-all"
                >
                  ติดต่อเจ้าหน้าที่
                </button>
                <a 
                  href="https://line.me/ti/p/@kingvision" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="whitespace-nowrap px-3 py-1 bg-[#06C755]/10 text-[10px] font-bold text-[#06C755] rounded-full hover:bg-[#06C755] hover:text-white transition-all flex items-center gap-1"
                >
                  คุยใน LINE
                </a>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        className={`w-14 h-14 bg-kv-orange text-white rounded-full shadow-2xl flex items-center justify-center hover:bg-kv-navy transition-all relative group ${isOpen ? 'hidden sm:flex' : 'flex'}`}
      >
        <AnimatePresence mode="wait">
          {isOpen ? (
            <motion.div key="close" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }}>
              <X size={28} />
            </motion.div>
          ) : (
            <motion.div key="chat" initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.8, opacity: 0 }} className="w-full h-full p-1">
              <div className="w-full h-full rounded-full overflow-hidden border-2 border-white shadow-inner">
                <img 
                  src={nongKingAvatar} 
                  alt="Nong King" 
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    // Fallback if image not uploaded yet
                    (e.target as HTMLImageElement).src = "https://picsum.photos/seed/staff-man/100/100";
                  }}
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
