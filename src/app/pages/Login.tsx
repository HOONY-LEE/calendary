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
  const language = i18n.language as "ko" | "en";
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
          language === "ko"
            ? "이메일 또는 비밀번호가 올바르지 않습니다.\n\n아직 계정이 없다면 회원가입을 진행해주세요.\n회원가입 후 이메일 인증을 완료해야 로그인할 수 있습니다."
            : "Invalid email or password.\n\nIf you don't have an account, please sign up first.\nYou must verify your email after signing up to log in.",
        );
      } else if (
        error.message?.includes("Email not confirmed")
      ) {
        setError(
          language === "ko"
            ? "이메일 인증이 완료되지 않았습니다.\n받은 메일함을 확인하여 인증 링크를 클릭해주세요."
            : "Email not confirmed.\nPlease check your inbox and click the verification link.",
        );
      } else {
        setError(
          error.message ||
            (language === "ko"
              ? "로그인에 실패했습니다"
              : "Failed to sign in"),
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

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="max-w-md w-full">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="flex justify-center items-center mb-8">
            <img
              src={calendaryIcon}
              alt="Calendary"
              className="w-24 h-24 rounded-2xl"
            />
          </div>
          <h1 className="text-3xl font-semibold tracking-tight mb-2">
            {language === "ko"
              ? "Calendary 계정으로 로그인"
              : "Sign in to Calendary"}
          </h1>
        </div>

        {/* Email/Password Form */}
        <form
          onSubmit={handleEmailSignIn}
          className="space-y-4"
        >
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
                placeholder={
                  language === "ko"
                    ? "이메일 또는 전화번호"
                    : "Email or phone number"
                }
              />
              {isValidEmail(email) && (
                <button
                  type="button"
                  onClick={handleEmailContinue}
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-[#0C8CE9] hover:bg-[#0C8CE9]/90 rounded-lg flex items-center justify-center transition-all"
                >
                  <ArrowRight className="w-5 h-5 text-white" />
                </button>
              )}
            </div>
          )}

          {/* Password Input - Only show when email is entered */}
          {showPassword && (
            <div className="space-y-4">
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <input
                  type="email"
                  value={email}
                  className="w-full pl-12 py-4 bg-background border-2 border-gray-200 dark:border-gray-700 rounded-md text-base"
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
                  placeholder={
                    language === "ko" ? "비밀번호" : "Password"
                  }
                  required
                  autoFocus
                />
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowPassword(false);
                  setPassword("");
                  setError("");
                }}
                className="text-[#0C8CE9] text-sm hover:underline"
              >
                {language === "ko"
                  ? "이메일 변경"
                  : "Change email"}
              </button>
            </div>
          )}

          {error && (
            <div className="text-sm text-red-500 whitespace-pre-line">
              {error}
            </div>
          )}

          {/* Login Button - Only show when password field is visible */}
          {showPassword && (
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-4 bg-[#0C8CE9] text-white rounded-md
              font-medium hover:bg-[#0C8CE9]/90 transition-all duration-200 disabled:opacity-50"
            >
              {isLoading
                ? language === "ko"
                  ? "로그인 중..."
                  : "Signing in..."
                : language === "ko"
                  ? "로그인"
                  : "Sign In"}
            </button>
          )}
        </form>

        {/* Create Account Link */}
        <div className="mt-6 text-center">
          <button
            onClick={() => navigate("/signup")}
            className="text-[#0C8CE9] text-base hover:underline"
          >
            {language === "ko"
              ? "Calendary 계정 생성"
              : "Create Calendary Account"}
          </button>
        </div>

        {/* Divider */}
        <div className="relative my-8">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-border"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-4 bg-background text-muted-foreground">
              {language === "ko" ? "또는" : "or"}
            </span>
          </div>
        </div>

        {/* Google Sign In */}
        <button
          onClick={handleGoogleSignIn}
          className="w-full flex items-center justify-center gap-3 bg-background border-1 border-border rounded-md px-6 py-4 font-medium hover:bg-accent transition-colors"
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
            {language === "ko"
              ? "Google로 로그인"
              : "Sign in with Google"}
          </span>
        </button>

        {/* Privacy Notice */}
        <p className="mt-8 text-center text-xs text-muted-foreground leading-relaxed">
          {language === "ko"
            ? "Calendary 계정은 사용자가 안전하게 로그인하여 자신의 데이터에 접근할 수 있도록 하기 위해 사용됩니다."
            : "Your Calendary account is used to securely sign in and access your data."}
        </p>
      </div>
    </div>
  );
}