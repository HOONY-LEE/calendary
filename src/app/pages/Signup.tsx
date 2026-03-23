import { useState } from 'react';
import { useNavigate } from 'react-router';
import { CheckCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import calendaryIcon from '@/assets/e735c8e5404257a8d70b2c1243da5c30fde7a306.png';

export function Signup() {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const language = i18n.language;
  const { signUpWithEmail, signInWithGoogle } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [signupSuccess, setSignupSuccess] = useState(false);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) {
      setError(language === 'ko' ? '이름을 입력해주세요' : 'Please enter your name');
      return;
    }

    if (password.length < 6) {
      setError(language === 'ko' ? '비밀번호는 최소 6자 이상이어야 합니다' : 'Password must be at least 6 characters');
      return;
    }

    if (password !== confirmPassword) {
      setError(language === 'ko' ? '비밀번호가 일치하지 않습니다' : 'Passwords do not match');
      return;
    }

    setLoading(true);

    try {
      const result = await signUpWithEmail(email, password, name);
      console.log('Signup result:', result);
      
      // 🔥 회원가입 성공 - 서버에서 이메일 인증 자동 완료 및 자동 로그인
      // needsEmailConfirmation이 false이면 바로 로그인됨
      if (!result.needsEmailConfirmation) {
        // 자동 로그인 완료 - Calendar 페이지로 이동
        console.log('✅ Auto sign-in successful, redirecting to calendar...');
        navigate('/calendar');
      } else {
        // 이메일 인증 필요 (이전 방식)
        setSignupSuccess(true);
      }
    } catch (err: any) {
      console.error('Signup error:', err);
      if (err.message?.includes('User already registered') || err.message?.includes('already registered')) {
        setError(language === 'ko' ? '이미 가입된 이메일입니다. 로그인해주세요.' : 'Email already registered. Please sign in.');
      } else {
        setError(err.message || (language === 'ko' ? '회원가입에 실패했습니다' : 'Failed to sign up'));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignup = async () => {
    try {
      await signInWithGoogle();
    } catch (err: any) {
      console.error('Google signup error:', err);
      setError(err.message || (language === 'ko' ? 'Google 로그인에 실패했습니다' : 'Failed to sign in with Google'));
    }
  };

  // 회원가입 성공 화면
  if (signupSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="max-w-md w-full text-center">
          <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
          </div>
          <h2 className="text-3xl font-semibold mb-4">
            {language === 'ko' ? '계정이 생성되었습니다!' : 'Account Created!'}
          </h2>
          <p className="text-muted-foreground mb-2">
            {language === 'ko' 
              ? '회원가입이 완료되었습니다' 
              : 'You have successfully signed up'}
          </p>
          <p className="text-foreground font-medium mb-4">{email}</p>
          
          {/* 중요 안내 */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-200 dark:border-blue-800 rounded-xl p-4 mb-8">
            <p className="text-sm text-blue-900 dark:text-blue-100">
              {language === 'ko' 
                ? '✅ 이메일 인증이 필요합니다.\n인증 메일을 확인하여 계정을 활성화하세요.' 
                : '✅ Email verification is required.\nPlease check your email to activate your account.'}
            </p>
          </div>
          
          <button
            onClick={() => navigate('/login')}
            className="w-full py-4 bg-[#0C8CE9] text-white rounded-xl font-medium hover:bg-[#0C8CE9]/90 transition-all duration-200"
          >
            {language === 'ko' ? '로그인하기' : 'Sign In'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="max-w-md w-full">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="flex justify-center items-center mb-6">
            <img src={calendaryIcon} alt="Calendary" className="w-20 h-20 rounded-2xl" />
          </div>
          <h1 className="text-3xl font-semibold tracking-tight mb-2">
            {language === 'ko' ? 'Calendary 계정 생성' : 'Create Calendary Account'}
          </h1>
        </div>

        {/* Google Sign Up */}
        <button
          onClick={handleGoogleSignup}
          className="w-full flex items-center justify-center gap-3 bg-background border-2 border-border rounded-xl px-6 py-4 font-medium hover:bg-accent transition-colors mb-6"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
          <span className="text-foreground">
            {language === 'ko' ? 'Google로 가입' : 'Sign up with Google'}
          </span>
        </button>

        {/* Divider */}
        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-border"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-4 bg-background text-muted-foreground">
              {language === 'ko' ? '또는' : 'or'}
            </span>
          </div>
        </div>

        {/* Signup Form */}
        <form onSubmit={handleSignup} className="space-y-4">
          <div>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onFocus={() => setError('')}
              className="w-full px-4 py-4 bg-background border-2 border-border rounded-xl focus:outline-none focus:border-[#0C8CE9] transition-all duration-200 text-base"
              placeholder={language === 'ko' ? '이름' : 'Name'}
              required
            />
          </div>

          <div>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onFocus={() => setError('')}
              className="w-full px-4 py-4 bg-background border-2 border-border rounded-xl focus:outline-none focus:border-[#0C8CE9] transition-all duration-200 text-base"
              placeholder={language === 'ko' ? '이메일' : 'Email'}
              required
            />
          </div>

          <div>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onFocus={() => setError('')}
              className="w-full px-4 py-4 bg-background border-2 border-border rounded-xl focus:outline-none focus:border-[#0C8CE9] transition-all duration-200 text-base"
              placeholder={language === 'ko' ? '비밀번호 (최소 6자)' : 'Password (min. 6 characters)'}
              required
            />
          </div>

          <div>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              onFocus={() => setError('')}
              className="w-full px-4 py-4 bg-background border-2 border-border rounded-xl focus:outline-none focus:border-[#0C8CE9] transition-all duration-200 text-base"
              placeholder={language === 'ko' ? '비밀번호 확인' : 'Confirm password'}
              required
            />
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-[#0C8CE9] text-white rounded-xl font-medium hover:bg-[#0C8CE9]/90 transition-all duration-200 disabled:opacity-50"
          >
            {loading
              ? language === 'ko'
                ? '계정 생성 중...'
                : 'Creating account...'
              : language === 'ko'
              ? '계정 생성'
              : 'Create Account'}
          </button>
        </form>

        {/* Login Link */}
        <div className="mt-6 text-center">
          <button
            onClick={() => navigate('/login')}
            className="text-[#0C8CE9] text-base hover:underline"
          >
            {language === 'ko' ? '이미 계정이 있으신가요? 로그인' : 'Already have an account? Sign in'}
          </button>
        </div>

        {/* Privacy Notice */}
        <p className="mt-8 text-center text-xs text-muted-foreground leading-relaxed">
          {language === 'ko'
            ? '계정을 생성하면 Calendary의 서비스 약관 및 개인정보 보호정책에 동의하는 것입니다.'
            : 'By creating an account, you agree to our Terms of Service and Privacy Policy.'}
        </p>
      </div>
    </div>
  );
}