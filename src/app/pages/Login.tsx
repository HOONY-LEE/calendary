import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { useAuth } from "../context/AuthContext";
import { useTranslation } from "react-i18next";
import { ChevronRight, ArrowRight, Mail, Lock } from "lucide-react";
import { projectId, publicAnonKey } from "../../lib/supabase-info";
import calendaryIcon from "@/assets/e735c8e5404257a8d70b2c1243da5c30fde7a306.png";
import { supabase } from "../../lib/supabase";

export function Login() {
  const { signInWithGoogle, signInWithEmail } = useAuth();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const language = i18n.language;
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // 🔥 페이지 로드 시 기존 세션 정리 (orphaned session 방지)
  useEffect(() => {
    const clearStaleSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session) {
          console.log('[Login] Found existing session, validating user...');
          
          // 사용자가 실제로 존재하는지 확인
          const { data: { user }, error: userError } = await supabase.auth.getUser();
          
          if (userError || !user) {
            console.log('[Login] 🚨 Orphaned session detected, clearing...');
            await supabase.auth.signOut();
          } else {
            console.log('[Login] ✅ Valid session exists, user:', user.email);
            // 유효한 세션이 있으면 캘린더로 리다이렉트
            navigate('/calendar');
          }
        }
      } catch (error) {
        console.error('[Login] Error checking session:', error);
        // 에러 발생 시 세션 정리
        await supabase.auth.signOut();
      }
    };
    
    clearStaleSession();
  }, [navigate]);

  // Email validation regex
  const isValidEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleEmailContinue = () => {
    if (isValidEmail(email)) {
      setShowPassword(true);
    }
  };

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();

    // 비밀번호 입력 화면이 아직 안 보이면 먼저 보여주기
    if (!showPassword) {
      handleEmailContinue();
      return;
    }

    // 비밀번호가 입력되지 않았으면 로그인 시도하지 않음
    if (!password) {
      return;
    }

    setError("");
    setIsLoading(true);

    try {
      console.log("Attempting to sign in with:", email);
      await signInWithEmail(email, password);
      console.log(
        "Sign in successful, redirecting to calendar...",
      );
      navigate("/calendar");
    } catch (error: any) {
      console.error("Login failed:", error);
      console.error("Error details:", {
        message: error.message,
        status: error.status,
        name: error.name,
      });

      // More detailed error message
      if (
        error.message?.includes("Invalid login credentials")
      ) {
        setError(
          ({ ko: "이메일 또는 비밀번호가 올바르지 않습니다.\n\n아직 계정이 없다면 회원가입을 진행해주세요.\n회원가입 후 이메일 인증을 완료해야 로그인할 수 있습니다.", en: "Invalid email or password.\n\nIf you don't have an account, please sign up first.\nYou must verify your email after signing up to log in.", zh: "邮箱或密码不正确。\n\n如果您还没有账户，请先注册。\n注册后需要验证邮箱才能登录。" } as Record<string, string>)[language] || "Invalid email or password.\n\nIf you don't have an account, please sign up first.\nYou must verify your email after signing up to log in.",
        );
      } else if (
        error.message?.includes("Email not confirmed")
      ) {
        setError(
          ({ ko: "이메일 인증이 완료되지 않았습니다.\n받은 메일함을 확인하여 인증 링크를 클릭해주세요.", en: "Email not confirmed.\nPlease check your inbox and click the verification link.", zh: "邮箱尚未验证。\n请检查收件箱并点击验证链接。" } as Record<string, string>)[language] || "Email not confirmed.\nPlease check your inbox and click the verification link.",
        );
      } else {
        setError(
          error.message ||
            (({ ko: "로그인에 실패했습니다", en: "Failed to sign in", zh: "登录失败" } as Record<string, string>)[language] || "Failed to sign in"),
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      await signInWithGoogle();
    } catch (error: any) {
      console.error("Login failed:", error);
      setError(
        error.message || "Failed to sign in with Google",
      );
    }
  };

  const [showLoginForm, setShowLoginForm] = useState(false);

  // ── 랜딩 화면 ──────────────────────────────────────────────
  if (!showLoginForm) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
        <div className="flex flex-col items-center text-center max-w-sm w-full">
          {/* App Icon */}
          <img
            src="/icon.png"
            alt="Calendary"
            className="w-28 h-28 rounded-[28px] mb-8 shadow-sm"
          />

          {/* Title */}
          <h1 className="text-4xl font-bold tracking-tight mb-4">
            {({ ko: "Calendary 캘린더", en: "Calendary Calendar", zh: "Calendary 日历" } as Record<string, string>)[language] || "Calendary Calendar"}
          </h1>

          {/* Subtitle */}
          <p className="text-base text-muted-foreground mb-10 leading-relaxed">
            {({ ko: "Calendary 캘린더로 시간과 업무를 관리하세요.\n당신의 생산성 향상을 위한 최고의 앱입니다.", en: "Manage your time and tasks with Calendary.\nThe best app for boosting your productivity.", zh: "用 Calendary 管理您的时间和任务。\n提升生产力的最佳应用。" } as Record<string, string>)[language] || "Manage your time and tasks with Calendary.\nThe best app for boosting your productivity."}
          </p>

          {/* Login Button */}
          <button
            onClick={() => setShowLoginForm(true)}
            className="w-full py-3.5 bg-foreground text-background rounded-full text-base font-semibold hover:opacity-90 transition-opacity cursor-pointer"
          >
            {({ ko: "로그인", en: "Sign In", zh: "登录" } as Record<string, string>)[language] || "Sign In"}
          </button>

          {/* Create Account */}
          <button
            onClick={() => navigate("/signup")}
            className="mt-4 text-[#0C8CE9] text-sm hover:underline cursor-pointer"
          >
            {({ ko: "Calendary 계정 생성", en: "Create Account", zh: "创建账户" } as Record<string, string>)[language] || "Create Account"}
          </button>

          {/* Privacy */}
          <p className="mt-12 text-xs text-muted-foreground">
            <a href="/privacy" className="hover:underline">
              {({ ko: "개인정보처리방침", en: "Privacy Policy", zh: "隐私政策" } as Record<string, string>)[language] || "Privacy Policy"}
            </a>
            <span className="mx-2">·</span>
            <a href="/terms" className="hover:underline">
              {({ ko: "이용약관", en: "Terms of Service", zh: "服务条款" } as Record<string, string>)[language] || "Terms of Service"}
            </a>
          </p>
        </div>
      </div>
    );
  }

  // ── 로그인 폼 화면 ─────────────────────────────────────────
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="max-w-md w-full">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="flex justify-center items-center mb-6">
            <img
              src="/icon.png"
              alt="Calendary"
              className="w-20 h-20 rounded-[20px] shadow-sm"
            />
          </div>
          <h1 className="text-2xl font-bold tracking-tight mb-1">
            {({ ko: "Calendary 캘린더", en: "Calendary Calendar", zh: "Calendary 日历" } as Record<string, string>)[language] || "Calendary Calendar"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {({ ko: "계정으로 로그인", en: "Sign in to your account", zh: "登录您的账户" } as Record<string, string>)[language] || "Sign in to your account"}
          </p>
        </div>

        {/* Email/Password Form */}
        <form onSubmit={handleEmailSignIn} className="space-y-4">
          {/* Email Input */}
          {!showPassword && (
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onFocus={() => setError("")}
                className="w-full pl-12 pr-14 py-4 bg-background border-2 border-gray-200 dark:border-gray-700 rounded-md focus:outline-none focus:border-[#0C8CE9] transition-all duration-200 text-base"
                placeholder={({ ko: "이메일 또는 전화번호", en: "Email or phone number", zh: "邮箱或电话号码" } as Record<string, string>)[language] || "Email or phone number"}
                autoFocus
              />
              {isValidEmail(email) && (
                <button
                  type="button"
                  onClick={handleEmailContinue}
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-[#0C8CE9] hover:bg-[#0C8CE9]/90 rounded-lg flex items-center justify-center transition-all cursor-pointer"
                >
                  <ArrowRight className="w-5 h-5 text-white" />
                </button>
              )}
            </div>
          )}

          {/* Password Input */}
          {showPassword && (
            <div className="space-y-4">
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <input
                  type="email"
                  value={email}
                  className="w-full pl-12 py-4 bg-background border-2 border-gray-200 dark:border-gray-700 rounded-md text-base opacity-60"
                  disabled
                />
              </div>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-12 py-4 bg-background border-2 border-gray-200 dark:border-gray-700 rounded-md focus:outline-none focus:border-[#0C8CE9] transition-all duration-200 text-base"
                  placeholder={({ ko: "비밀번호", en: "Password", zh: "密码" } as Record<string, string>)[language] || "Password"}
                  required
                  autoFocus
                />
              </div>
              <button
                type="button"
                onClick={() => { setShowPassword(false); setPassword(""); setError(""); }}
                className="text-[#0C8CE9] text-sm hover:underline cursor-pointer"
              >
                {({ ko: "이메일 변경", en: "Change email", zh: "更改邮箱" } as Record<string, string>)[language] || "Change email"}
              </button>
            </div>
          )}

          {error && (
            <div className="text-sm text-red-500 whitespace-pre-line">{error}</div>
          )}

          {showPassword && (
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-4 bg-foreground text-background rounded-md font-semibold hover:opacity-90 transition-all duration-200 disabled:opacity-50 cursor-pointer"
            >
              {isLoading
                ? (({ ko: "로그인 중...", en: "Signing in...", zh: "登录中..." } as Record<string, string>)[language] || "Signing in...")
                : (({ ko: "로그인", en: "Sign In", zh: "登录" } as Record<string, string>)[language] || "Sign In")}
            </button>
          )}
        </form>

        {/* Create Account */}
        <div className="mt-6 text-center">
          <button onClick={() => navigate("/signup")} className="text-[#0C8CE9] text-base hover:underline cursor-pointer">
            {({ ko: "Calendary 계정 생성", en: "Create Calendary Account", zh: "创建 Calendary 账户" } as Record<string, string>)[language] || "Create Calendary Account"}
          </button>
        </div>

        {/* Divider */}
        <div className="relative my-8">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-border"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-4 bg-background text-muted-foreground">
              {({ ko: "또는", en: "or", zh: "或" } as Record<string, string>)[language] || "or"}
            </span>
          </div>
        </div>

        {/* Google Sign In */}
        <button
          onClick={handleGoogleSignIn}
          className="w-full flex items-center justify-center gap-3 bg-background border border-border rounded-md px-6 py-4 font-medium hover:bg-accent transition-colors cursor-pointer"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          <span className="text-foreground">
            {({ ko: "Google로 로그인", en: "Sign in with Google", zh: "使用 Google 登录" } as Record<string, string>)[language] || "Sign in with Google"}
          </span>
        </button>

        {/* Back + Privacy */}
        <div className="mt-6 text-center">
          <button onClick={() => { setShowLoginForm(false); setEmail(""); setPassword(""); setShowPassword(false); setError(""); }} className="text-muted-foreground text-sm hover:underline cursor-pointer">
            ← {({ ko: "뒤로", en: "Back", zh: "返回" } as Record<string, string>)[language] || "Back"}
          </button>
        </div>
        <p className="mt-4 text-center text-xs text-muted-foreground">
          <a href="/privacy" className="hover:underline">{({ ko: "개인정보처리방침", en: "Privacy Policy", zh: "隐私政策" } as Record<string, string>)[language] || "Privacy Policy"}</a>
          <span className="mx-2">·</span>
          <a href="/terms" className="hover:underline">{({ ko: "이용약관", en: "Terms of Service", zh: "服务条款" } as Record<string, string>)[language] || "Terms of Service"}</a>
        </p>
      </div>
    </div>
  );
}