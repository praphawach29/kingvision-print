import React, { useState, useEffect, useRef } from 'react';
import { MessageCircle, X, Send, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Link } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import nongKingAvatar from '../assets/nong-king.jpg';

const MAX_HISTORY = 30;
const SESSION_KEY = 'kv_chat_session_id';
const LOCAL_HISTORY_KEY = (id: string) => `kv_chat_history_${id}`;

function getSessionId(): string {
  let id = localStorage.getItem(SESSION_KEY);
  if (!id) { id = crypto.randomUUID(); localStorage.setItem(SESSION_KEY, id); }
  return id;
}

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

interface AgentConfig {
  personaName: string;
  gender: 'male' | 'female';
  aiEnabled: boolean;
}

type ConnStatus = 'idle' | 'ok' | 'error';

function buildGreeting(cfg: AgentConfig): string {
  if (cfg.gender === 'female') {
    return `à¸ªà¸§à¸±à¸ªà¸”à¸µà¸„à¹ˆà¸°! à¸«à¸™à¸¹ "${cfg.personaName}" à¸žà¸™à¸±à¸à¸‡à¸²à¸™à¸‚à¸²à¸¢à¸ˆà¸²à¸ KingVision Print ðŸ–¨ï¸ à¸§à¸±à¸™à¸™à¸µà¹‰à¸ªà¸™à¹ƒà¸ˆà¸”à¸¹à¹€à¸„à¸£à¸·à¹ˆà¸­à¸‡à¸žà¸´à¸¡à¸žà¹Œà¸£à¸¸à¹ˆà¸™à¹„à¸«à¸™ à¸«à¸£à¸·à¸­à¸¡à¸µà¸­à¸°à¹„à¸£à¹ƒà¸«à¹‰à¸Šà¹ˆà¸§à¸¢à¹€à¸Šà¹‡à¸„à¸ªà¸•à¹‡à¸­à¸à¹„à¸«à¸¡à¸„à¸°?`;
  }
  return `à¸ªà¸§à¸±à¸ªà¸”à¸µà¸„à¸£à¸±à¸š! à¸œà¸¡ "${cfg.personaName}" à¸žà¸™à¸±à¸à¸‡à¸²à¸™à¸‚à¸²à¸¢à¸ˆà¸²à¸ KingVision Print ðŸ–¨ï¸ à¸§à¸±à¸™à¸™à¸µà¹‰à¸ªà¸™à¹ƒà¸ˆà¸”à¸¹à¹€à¸„à¸£à¸·à¹ˆà¸­à¸‡à¸žà¸´à¸¡à¸žà¹Œà¸£à¸¸à¹ˆà¸™à¹„à¸«à¸™ à¸«à¸£à¸·à¸­à¸¡à¸µà¸­à¸°à¹„à¸£à¹ƒà¸«à¹‰à¸œà¸¡à¸Šà¹ˆà¸§à¸¢à¹€à¸Šà¹‡à¸„à¸ªà¸•à¹‡à¸­à¸à¹„à¸«à¸¡à¸„à¸£à¸±à¸š?`;
}

const DEFAULT_CONFIG: AgentConfig = { personaName: 'à¸™à¹‰à¸­à¸‡à¸„à¸´à¸‡', gender: 'male', aiEnabled: true };

const QUICK_REPLIES = [
  { label: 'à¸•à¸´à¸”à¸•à¸²à¸¡à¸­à¸­à¹€à¸”à¸­à¸£à¹Œ',       text: 'à¸•à¸´à¸”à¸•à¸²à¸¡à¸­à¸­à¹€à¸”à¸­à¸£à¹Œà¸‚à¸­à¸‡à¸‰à¸±à¸™' },
  { label: 'à¸—à¸µà¹ˆà¸•à¸±à¹‰à¸‡à¸£à¹‰à¸²à¸™',          text: 'à¸—à¸µà¹ˆà¸•à¸±à¹‰à¸‡à¸£à¹‰à¸²à¸™à¸­à¸¢à¸¹à¹ˆà¸—à¸µà¹ˆà¹„à¸«à¸™?' },
  { label: 'à¹à¸™à¸°à¸™à¸³à¹€à¸„à¸£à¸·à¹ˆà¸­à¸‡à¸žà¸´à¸¡à¸žà¹Œ',   text: 'à¹à¸™à¸°à¸™à¸³à¹€à¸„à¸£à¸·à¹ˆà¸­à¸‡à¸žà¸´à¸¡à¸žà¹Œà¸—à¸µà¹ˆà¸‚à¸²à¸¢à¸”à¸µà¸«à¸™à¹ˆà¸­à¸¢à¸„à¸£à¸±à¸š' },
  { label: 'à¹€à¸Šà¹‡à¸„à¸ªà¸•à¹‡à¸­à¸',           text: 'à¸­à¸¢à¸²à¸à¹€à¸Šà¹‡à¸„à¸ªà¸•à¹‡à¸­à¸à¸ªà¸´à¸™à¸„à¹‰à¸²' },
  { label: 'à¸£à¸²à¸„à¸²à¸«à¸¡à¸¶à¸ HP',         text: 'à¸«à¸¡à¸¶à¸ HP à¸¡à¸µà¸£à¸¸à¹ˆà¸™à¹„à¸«à¸™à¸šà¹‰à¸²à¸‡ à¸£à¸²à¸„à¸²à¹€à¸—à¹ˆà¸²à¹„à¸«à¸£à¹ˆ?' },
];

export function ChatAgent() {
  const [isOpen, setIsOpen]         = useState(false);
  const [input, setInput]           = useState('');
  const [messages, setMessages]     = useState<Message[]>([]);
  const [isLoading, setIsLoading]   = useState(false);
  const [config, setConfig]         = useState<AgentConfig>(DEFAULT_CONFIG);
  const [connStatus, setConnStatus] = useState<ConnStatus>('idle');
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const sendingRef = useRef(false);
  const sessionId = useRef<string>(getSessionId());
  const { addToCart } = useCart();
  const { user }      = useAuth();

  // Load agent config + chat history on first open
  useEffect(() => {
    if (!isOpen || connStatus !== 'idle') return;

    // Load history from localStorage first (instant)
    const localKey = LOCAL_HISTORY_KEY(user?.id ?? sessionId.current);
    try {
      const stored = localStorage.getItem(localKey);
      if (stored) {
        const parsed: Message[] = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setMessages(parsed);
          setHistoryLoaded(true);
        }
      }
    } catch { /* ignore parse errors */ }

    // If logged in, also try to pull from Supabase (may have richer history)
    if (user?.id) {
      supabase
        .from('chat_history')
        .select('messages')
        .eq('user_id', user.id)
        .maybeSingle()
        .then(({ data }) => {
          if (data?.messages && Array.isArray(data.messages) && data.messages.length > 0) {
            setMessages(data.messages as Message[]);
            localStorage.setItem(localKey, JSON.stringify(data.messages));
            setHistoryLoaded(true);
          }
        })
        .catch(() => { /* ignore */ });
    }

    // Fetch agent config
    fetch('/api/ai/health')
      .then(r => r.json())
      .then(data => {
        setConfig({
          personaName: data.personaName || 'à¸™à¹‰à¸­à¸‡à¸„à¸´à¸‡',
          gender:      data.gender === 'female' ? 'female' : 'male',
          aiEnabled:   data.aiEnabled ?? true,
        });
        setConnStatus('ok');
      })
      .catch(() => setConnStatus('error'));
  }, [isOpen]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  const handleSend = async (overrideText?: string) => {
    const text = (overrideText ?? input).trim();
    if (!text || isLoading || sendingRef.current) return;
    sendingRef.current = true;

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
      if (res.status === 429) {
        setMessages(prev => [...prev, { role: 'assistant', content: json?.error || 'à¸ªà¹ˆà¸‡à¸‚à¹‰à¸­à¸„à¸§à¸²à¸¡à¹€à¸£à¹‡à¸§à¹€à¸à¸´à¸™à¹„à¸›à¸„à¸£à¸±à¸š à¸à¸£à¸¸à¸“à¸²à¸£à¸­à¸ªà¸±à¸à¸„à¸£à¸¹à¹ˆà¹à¸¥à¹‰à¸§à¸¥à¸­à¸‡à¹ƒà¸«à¸¡à¹ˆ' }]);
        setIsLoading(false);
        return;
      }
      if (!res.ok) throw new Error(json?.error || 'AI request failed');

      const assistantMsg: Message = { role: 'assistant', content: json.text || 'à¸‚à¸­à¸­à¸ à¸±à¸¢à¸„à¸£à¸±à¸š à¹„à¸¡à¹ˆà¹„à¸”à¹‰à¸£à¸±à¸šà¸à¸²à¸£à¸•à¸­à¸šà¸à¸¥à¸±à¸š' };
      setMessages(prev => {
        const last = prev[prev.length - 1];
        if (last?.role === 'assistant' && last?.content?.trim() === assistantMsg.content.trim()) {
          return prev;
        }
        const next = [...prev, assistantMsg].slice(-MAX_HISTORY);
        // Save to localStorage always
        const localKey = LOCAL_HISTORY_KEY(user?.id ?? sessionId.current);
        localStorage.setItem(localKey, JSON.stringify(next));
        // Save to Supabase if logged in (background, no await)
        if (user?.id) {
          supabase.from('chat_history').upsert(
            { user_id: user.id, session_id: sessionId.current, messages: next, updated_at: new Date().toISOString() },
            { onConflict: 'user_id' }
          ).catch(() => { /* ignore */ });
        }
        return next;
      });

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
      let errText = 'à¸‚à¸­à¸­à¸ à¸±à¸¢à¸„à¸£à¸±à¸š à¹€à¸à¸´à¸”à¸‚à¹‰à¸­à¸œà¸´à¸”à¸žà¸¥à¸²à¸”à¹ƒà¸™à¸à¸²à¸£à¹€à¸Šà¸·à¹ˆà¸­à¸¡à¸•à¹ˆà¸­ à¸à¸£à¸¸à¸“à¸²à¸¥à¸­à¸‡à¹ƒà¸«à¸¡à¹ˆà¸­à¸µà¸à¸„à¸£à¸±à¹‰à¸‡à¸™à¸°à¸„à¸£à¸±à¸š';
      if (err?.message?.includes('429') || err?.message?.toLowerCase().includes('quota')) {
        errText = 'à¸‚à¸­à¸­à¸ à¸±à¸¢à¸„à¸£à¸±à¸š à¸‚à¸“à¸°à¸™à¸µà¹‰à¸¡à¸µà¸œà¸¹à¹‰à¹ƒà¸Šà¹‰à¸‡à¸²à¸™à¸ˆà¸³à¸™à¸§à¸™à¸¡à¸²à¸ à¸à¸£à¸¸à¸“à¸²à¸£à¸­à¸ªà¸±à¸à¸„à¸£à¸¹à¹ˆà¹à¸¥à¹‰à¸§à¸¥à¸­à¸‡à¹ƒà¸«à¸¡à¹ˆà¸™à¸°à¸„à¸£à¸±à¸š';
      }
      setMessages(prev => [...prev, { role: 'assistant', content: errText }]);
    } finally {
      setIsLoading(false);
      sendingRef.current = false;
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
                    alt="à¸™à¹‰à¸­à¸‡à¸„à¸´à¸‡"
                    className="w-full h-full object-cover"
                    onError={e => { (e.target as HTMLImageElement).src = 'https://picsum.photos/seed/staff-man/100/100'; }}
                  />
                </div>
                <div>
                  <div className="text-white font-black text-sm leading-none">{config.personaName}</div>
                  <div className="text-[10px] font-bold uppercase tracking-widest mt-1 flex items-center gap-1">
                    {connStatus === 'idle' && (
                      <><span className="w-1.5 h-1.5 bg-gray-400 rounded-full" /><span className="text-gray-300">à¸à¸³à¸¥à¸±à¸‡à¹€à¸Šà¸·à¹ˆà¸­à¸¡à¸•à¹ˆà¸­...</span></>
                    )}
                    {connStatus === 'ok' && (
                      <><span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" /><span className="text-green-300">à¹€à¸Šà¸·à¹ˆà¸­à¸¡à¸•à¹ˆà¸­à¹à¸¥à¹‰à¸§</span></>
                    )}
                    {connStatus === 'error' && (
                      <><span className="w-1.5 h-1.5 bg-red-400 rounded-full" /><span className="text-red-300">à¹„à¸¡à¹ˆà¸ªà¸²à¸¡à¸²à¸£à¸–à¹€à¸Šà¸·à¹ˆà¸­à¸¡à¸•à¹ˆà¸­à¹„à¸”à¹‰</span></>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {messages.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setMessages([]);
                      setHistoryLoaded(false);
                      const localKey = LOCAL_HISTORY_KEY(user?.id ?? sessionId.current);
                      localStorage.removeItem(localKey);
                      if (user?.id) {
                        supabase.from('chat_history').delete().eq('user_id', user.id).catch(() => {});
                      }
                    }}
                    className="text-white/50 hover:text-white/80 text-[10px] font-bold transition-all"
                    title="à¸¥à¹‰à¸²à¸‡à¸›à¸£à¸°à¸§à¸±à¸•à¸´à¹à¸Šà¸—"
                  >
                    à¸¥à¹‰à¸²à¸‡
                  </button>
                )}
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
                  {connStatus === 'error'
                    ? 'à¸‚à¸­à¸­à¸ à¸±à¸¢à¸„à¹ˆà¸°/à¸„à¸£à¸±à¸š à¸‚à¸“à¸°à¸™à¸µà¹‰à¸£à¸°à¸šà¸š AI à¹„à¸¡à¹ˆà¸ªà¸²à¸¡à¸²à¸£à¸–à¹€à¸Šà¸·à¹ˆà¸­à¸¡à¸•à¹ˆà¸­à¹„à¸”à¹‰ à¸à¸£à¸¸à¸“à¸²à¸•à¸´à¸”à¸•à¹ˆà¸­à¹€à¸ˆà¹‰à¸²à¸«à¸™à¹‰à¸²à¸—à¸µà¹ˆà¸œà¹ˆà¸²à¸™ LINE à¸„à¹ˆà¸°/à¸„à¸£à¸±à¸š'
                    : buildGreeting(config)
                  }
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
                    <span className="text-[10px] font-bold text-gray-400">à¸™à¹‰à¸­à¸‡à¸„à¸´à¸‡à¸à¸³à¸¥à¸±à¸‡à¸„à¸´à¸”...</span>
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
                  placeholder="à¸žà¸´à¸¡à¸žà¹Œà¸‚à¹‰à¸­à¸„à¸§à¸²à¸¡à¸—à¸µà¹ˆà¸™à¸µà¹ˆ..."
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
          <div className="text-kv-navy font-black text-xs">à¸ªà¸­à¸šà¸–à¸²à¸¡ "à¸™à¹‰à¸­à¸‡à¸„à¸´à¸‡" à¹„à¸”à¹‰à¸—à¸µà¹ˆà¸™à¸µà¹ˆ!</div>
        </div>
      </motion.button>
    </div>
  );
}

