import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Mail, Lock, AlertCircle, Eye, EyeOff, ArrowRight, Crown, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const navigate = useNavigate();

  const getPasswordStrength = (pass: string) => {
    if (!pass) return 0;
    let strength = 0;
    if (pass.length >= 8) strength += 1;
    if (/[A-Z]/.test(pass)) strength += 1;
    if (/[a-z]/.test(pass)) strength += 1;
    if (/[0-9]/.test(pass)) strength += 1;
    if (/[^A-Za-z0-9]/.test(pass)) strength += 1;
    return strength;
  };

  const strength = getPasswordStrength(password);
  const strengthLabels = ['สั้นเกินไป', 'อ่อนแอ', 'ปานกลาง', 'ดี', 'แข็งแกร่งมาก'];
  const strengthColors = ['bg-gray-200', 'bg-red-500', 'bg-yellow-500', 'bg-blue-500', 'bg-green-500'];

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccessMessage(null);

    if (isForgotPassword) {
      try {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/auth?type=recovery`,
        });
        if (error) throw error;
        setSuccessMessage('ส่งลิงก์รีเซ็ตรหัสผ่านไปยังอีเมลของคุณแล้ว กรุณาตรวจสอบกล่องจดหมาย');
      } catch (err: any) {
        setError(err.message || 'เกิดข้อผิดพลาดในการส่งอีเมลรีเซ็ตรหัสผ่าน');
      } finally {
        setLoading(false);
      }
      return;
    }

    // Validation for signup
    if (!isLogin && password !== confirmPassword) {
      setError('รหัสผ่านและการยืนยันรหัสผ่านไม่ตรงกัน');
      setLoading(false);
      return;
    }

    if (!isLogin && password.length < 6) {
      setError('รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร');
      setLoading(false);
      return;
    }

    try {
      if (isLogin) {
        const { data: { user }, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;

        // Check user role for redirection
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user?.id)
          .single();

        if (profile?.role === 'admin' || profile?.role === 'super_admin' || email === 'jack291625@gmail.com') {
          navigate('/admin');
        } else {
          navigate('/account');
        }
      } else {
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
        });
        if (signUpError) throw signUpError;
        
        // Create profile entry for the new user
        if (signUpData.user) {
          const { error: profileError } = await supabase
            .from('profiles')
            .insert([
              { 
                id: signUpData.user.id, 
                email: email,
                full_name: email.split('@')[0],
                role: email === 'jack291625@gmail.com' ? 'admin' : 'user'
              }
            ]);
          
          if (profileError) {
            console.error('Error creating profile:', profileError);
            // We don't throw here to avoid confusing the user if the account was created but profile failed
          }
        }

        setSuccessMessage('สมัครสมาชิกสำเร็จ! กรุณาตรวจสอบอีเมลเพื่อยืนยันตัวตน (ถ้ามีการตั้งค่าไว้) หรือล็อกอินเพื่อเข้าสู่ระบบ');
        setIsLogin(true);
        setPassword('');
        setConfirmPassword('');
      }
    } catch (err: any) {
      if (isLogin && err.message === 'Invalid login credentials') {
        setError('ไม่พบผู้ใช้งานนี้ในระบบ หรือรหัสผ่านไม่ถูกต้อง หากคุณยังไม่มีบัญชี กรุณาคลิก "สร้างบัญชีใหม่" ด้านล่าง');
      } else {
        setError(err.message || 'เกิดข้อผิดพลาดในการดำเนินการ');
      }
    } finally {
      setLoading(false);
    }
  };

  const toggleMode = () => {
    setIsLogin(!isLogin);
    setIsForgotPassword(false);
    setError(null);
    setSuccessMessage(null);
    setPassword('');
    setConfirmPassword('');
  };

  const toggleForgotPassword = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsForgotPassword(!isForgotPassword);
    setError(null);
    setSuccessMessage(null);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-thai relative overflow-hidden">
      {/* Background Decorative Elements */}
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-kv-orange/10 rounded-full blur-3xl"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-kv-navy/5 rounded-full blur-3xl"></div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10 px-4 sm:px-0">
        <Link to="/" className="flex justify-center items-center text-3xl font-black text-kv-navy mb-8 hover:scale-105 transition-transform">
          <Crown className="text-kv-orange mr-2" size={36} />
          King<span className="text-kv-orange">Vision</span>
        </Link>

        <div className="bg-white py-8 px-6 shadow-2xl sm:rounded-3xl sm:px-10 border border-gray-100">
          <div className="mb-8 text-center">
            <h2 className="text-2xl font-bold text-gray-900 tracking-tight">
              {isForgotPassword ? 'ลืมรหัสผ่าน?' : (isLogin ? 'ยินดีต้อนรับกลับมา' : 'สร้างบัญชีใหม่')}
            </h2>
            <p className="mt-2 text-sm text-gray-500">
              {isForgotPassword 
                ? 'กรอกอีเมลของคุณเพื่อรับลิงก์รีเซ็ตรหัสผ่าน' 
                : (isLogin ? 'เข้าสู่ระบบเพื่อจัดการออเดอร์และดูประวัติการสั่งซื้อ' : 'สมัครสมาชิกเพื่อรับสิทธิพิเศษและประสบการณ์ช้อปปิ้งที่ดีกว่า')}
            </p>
          </div>

          <AnimatePresence mode="wait">
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="mb-6 bg-red-50 border-l-4 border-red-500 p-4 rounded-r-lg flex items-start"
              >
                <AlertCircle size={20} className="text-red-500 mr-3 shrink-0 mt-0.5" />
                <p className="text-sm text-red-700">{error}</p>
              </motion.div>
            )}
            {successMessage && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="mb-6 bg-green-50 border-l-4 border-green-500 p-4 rounded-r-lg flex items-start"
              >
                <CheckCircle2 size={20} className="text-green-500 mr-3 shrink-0 mt-0.5" />
                <p className="text-sm text-green-700">{successMessage}</p>
              </motion.div>
            )}
          </AnimatePresence>

          <form className="space-y-5" onSubmit={handleAuth}>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1.5">อีเมล</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Mail size={18} className="text-gray-400" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoCapitalize="none"
                  autoComplete="email"
                  className="block w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-kv-orange focus:border-transparent focus:bg-white transition-all outline-none"
                  placeholder="you@example.com"
                />
              </div>
            </div>

            {!isForgotPassword && (
              <>
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-sm font-bold text-gray-700">รหัสผ่าน</label>
                    {isLogin && (
                      <button 
                        onClick={toggleForgotPassword}
                        className="text-xs font-medium text-kv-orange hover:text-kv-navy transition-colors"
                      >
                        ลืมรหัสผ่าน?
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <Lock size={18} className="text-gray-400" />
                    </div>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      autoCapitalize="none"
                      autoCorrect="off"
                      spellCheck="false"
                      className="block w-full pl-11 pr-12 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-kv-orange focus:border-transparent focus:bg-white transition-all outline-none"
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-600 focus:outline-none"
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                  
                  {/* Password Strength Meter */}
                  {!isLogin && password.length > 0 && (
                    <div className="mt-2">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">ความปลอดภัย: {strengthLabels[strength - 1] || 'สั้นเกินไป'}</span>
                        <span className="text-[10px] font-bold text-gray-500">{strength * 20}%</span>
                      </div>
                      <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden flex gap-0.5">
                        {[1, 2, 3, 4, 5].map((step) => (
                          <div 
                            key={step} 
                            className={`h-full flex-1 transition-all duration-500 ${step <= strength ? strengthColors[strength] : 'bg-gray-200'}`}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <AnimatePresence>
                  {!isLogin && (
                    <motion.div
                      initial={{ opacity: 0, height: 0, marginTop: 0 }}
                      animate={{ opacity: 1, height: 'auto', marginTop: 20 }}
                      exit={{ opacity: 0, height: 0, marginTop: 0 }}
                      className="overflow-hidden"
                    >
                      <label className="block text-sm font-bold text-gray-700 mb-1.5">ยืนยันรหัสผ่าน</label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                          <Lock size={18} className="text-gray-400" />
                        </div>
                        <input
                          type={showPassword ? 'text' : 'password'}
                          required={!isLogin}
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          className="block w-full pl-11 pr-12 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-kv-orange focus:border-transparent focus:bg-white transition-all outline-none"
                          placeholder="••••••••"
                        />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </>
            )}

            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center items-center py-3.5 px-4 border border-transparent rounded-xl shadow-md text-sm font-bold text-white bg-kv-navy hover:bg-kv-orange focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-kv-orange transition-all disabled:opacity-70 disabled:cursor-not-allowed group"
              >
                {loading ? (
                  <span className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    กำลังดำเนินการ...
                  </span>
                ) : (
                  <>
                    {isForgotPassword ? 'ส่งลิงก์รีเซ็ตรหัสผ่าน' : (isLogin ? 'เข้าสู่ระบบ' : 'สมัครสมาชิก')}
                    <ArrowRight size={18} className="ml-2 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </button>
            </div>
          </form>

          <div className="mt-8">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-white text-gray-500">หรือ</span>
              </div>
            </div>

            <div className="mt-6 text-center">
              <button
                onClick={isForgotPassword ? toggleForgotPassword : toggleMode}
                className="text-sm font-bold text-kv-navy hover:text-kv-orange transition-colors"
              >
                {isForgotPassword 
                  ? 'กลับไปหน้าเข้าสู่ระบบ' 
                  : (isLogin ? 'ยังไม่มีบัญชีใช่ไหม? สร้างบัญชีใหม่' : 'มีบัญชีอยู่แล้ว? เข้าสู่ระบบ')}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
