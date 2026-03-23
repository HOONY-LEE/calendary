import { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '../../lib/supabase';
import { projectId, publicAnonKey } from '../../lib/supabase-info';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isGoogleAuth: boolean; // 🔥 구글 OAuth 로그인 여부
  hasGoogleCalendar: boolean; // 🔥 구글 캘린더 권한 여부
  hasGoogleTasks: boolean; // 🔥 구글 Tasks 권한 여부
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string, name: string) => Promise<{ needsEmailConfirmation: boolean, user: User | null }>;
  signOut: () => Promise<void>;
  reauthorizeWithTasks: () => Promise<void>; // 🔥 Google Tasks 재인증
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isGoogleAuth, setIsGoogleAuth] = useState(false);
  const [hasGoogleCalendar, setHasGoogleCalendar] = useState(false);
  const [hasGoogleTasks, setHasGoogleTasks] = useState(false);

  // 🔥 트리거 방식으로 변경: DB 트리거가 자동으로 카테고리 생성
  // 프론트엔드에서는 카테고리 생성 로직 불필요

  useEffect(() => {
    // 인증 상태 변경 리스너
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state changed:', event, 'User:', session?.user?.email);
      
      // 🔥 OAuth 코드 교환 완료 후 URL 정리
      if (event === 'SIGNED_IN') {
        const url = new URL(window.location.href);
        const code = url.searchParams.get('code');
        
        if (code) {
          console.log('[AuthContext] 🔵 OAuth sign-in complete, cleaning URL...');
          url.searchParams.delete('code');
          window.history.replaceState({}, '', url.toString());
          console.log('[AuthContext] ✅ Cleaned URL:', url.toString());
        }
      }
      
      // TOKEN_REFRESHED 이벤트에서 에러 처리
      if (event === 'TOKEN_REFRESHED') {
        console.log('Token refreshed successfully');
      }
      
      // 🔥 세션 만료 또는 에러 발생 시 자동 로그아웃
      if (event === 'SIGNED_OUT' || event === 'USER_DELETED' || event === 'USER_NOT_FOUND') {
        console.log('[AuthContext] 🚪 User signed out, deleted, or not found - clearing session');
        setSession(null);
        setUser(null);
        setIsGoogleAuth(false);
        setHasGoogleCalendar(false);
        setHasGoogleTasks(false);
        setLoading(false);
        
        // 🔥 로그인 페이지로 리다이렉트
        if (window.location.pathname !== '/login' && window.location.pathname !== '/signup') {
          console.log('[AuthContext] 🔄 Redirecting to login page...');
          window.location.href = '/login';
        }
      } else if (session) {
        // 🔥 세션이 있으면 바로 상태 업데이트 (getUser 호출 제거 - 블로킹 이슈)
        console.log('[AuthContext] ✅ Session detected, updating state...');

        // 🔥 Google provider_token + refresh_token 관리
        // getGoogleToken() 호출 시 자동으로 localStorage에 저장됨
        if (!session.provider_token) {
          // session에 provider_token이 없으면 localStorage에서 복원
          const savedToken = localStorage.getItem('google_provider_token');
          if (savedToken) {
            (session as any).provider_token = savedToken;
            console.log('[AuthContext] 🔄 Google provider_token restored from localStorage');
          }
        }

        setSession(session);
        setUser(session?.user ?? null);

        // 🔥 구글 연동 상태 확인
        const isGoogle = session?.user?.app_metadata?.provider === 'google';
        const hasProviderToken = !!session?.provider_token;
        
        // 🔥 2024-03-16: 구글 기본 로그인은 프로필만 요청 (캘린더/Tasks 권한 없음)
        // provider_token이 있어도 scopes가 다르므로 무조건 false
        setIsGoogleAuth(isGoogle);
        setHasGoogleCalendar(false); // 🔥 기본적으로 캘린더 연동 안됨
        setHasGoogleTasks(false); // 🔥 기본적으로 Tasks 연동 안됨
        
        console.log('[AuthContext] 🔑 Google Auth Status:', {
          isGoogleAuth: isGoogle,
          hasProviderToken,
          hasGoogleCalendar: false, // 명시적으로 false
          hasGoogleTasks: false, // 명시적으로 false
          note: 'Google 기본 로그인 = 프로필만 (캘린더/Tasks 권한 없음)',
        });
        
        // 🔥 SIGNED_IN 이벤트에서 즉시 로딩 해제
        if (event === 'SIGNED_IN') {
          console.log('[AuthContext] 🚀 SIGNED_IN event - setting loading to false');
          setLoading(false);
        }
      } else {
        // 세션이 없는 경우
        setSession(null);
        setUser(null);
        setIsGoogleAuth(false);
        setHasGoogleCalendar(false);
        setHasGoogleTasks(false);
      }
      
      // OAuth 콜백 처리 완료 후 loading 해제
      if (event === 'INITIAL_SESSION' || event === 'SIGNED_OUT') {
        console.log('[AuthContext] 🚀 Setting loading to false for event:', event);
        setLoading(false);
      }
    });

    // 초기 세션 확인
    supabase.auth.getSession().then(async ({ data: { session }, error }) => {
      if (error) {
        // 🔥 세션 에러 발생 시 조용히 처리 (App.tsx에서 이미 정리함)
        if (error.message?.includes('does not exist') || error.code === 'user_not_found') {
          console.log('[AuthContext] Stale session detected, will be cleaned by App.tsx');
        } else {
          console.log('[AuthContext] Session check error:', error.message);
        }
        
        setSession(null);
        setUser(null);
        setIsGoogleAuth(false);
        setHasGoogleCalendar(false);
        setHasGoogleTasks(false);
        setLoading(false);
      } else {
        console.log('[AuthContext] ========== SESSION CHECK ==========');
        console.log('[AuthContext] Has session?', !!session);
        
        if (!session) {
          console.log('[AuthContext] No session found - user is not logged in');
          setSession(null);
          setUser(null);
          setIsGoogleAuth(false);
          setHasGoogleCalendar(false);
          setHasGoogleTasks(false);
        } else {
          // 🔥 세션이 있으면 사용자 존재 여부 확인
          const { data: { user }, error: userError } = await supabase.auth.getUser();
          
          if (userError || !user) {
            // 사용자가 존재하지 않으면 세션 정리
            console.log('[AuthContext] User does not exist, clearing session...');
            console.log('[AuthContext] User error:', userError?.message);
            
            await supabase.auth.signOut();
            setSession(null);
            setUser(null);
            setIsGoogleAuth(false);
            setHasGoogleCalendar(false);
            setHasGoogleTasks(false);
            setLoading(false);
            return;
          }
          
          console.log('[AuthContext] User email:', session.user?.email);
          console.log('[AuthContext] Access token exists?', !!session.access_token);
          if (session.access_token) {
            console.log('[AuthContext] Access token length:', session.access_token.length);
            console.log('[AuthContext] Access token (first 30 chars):', session.access_token.substring(0, 30) + '...');
          } else {
            console.error('[AuthContext] ❌ CRITICAL: No access_token in session!');
            console.error('[AuthContext] Session keys:', Object.keys(session));
            console.error('[AuthContext] Full session object:', JSON.stringify(session, null, 2));
          }
          
          setSession(session);
          setUser(session.user ?? null);
          
          // 🔥 구글 연동 상태 확인
          const isGoogle = session.user?.app_metadata?.provider === 'google';
          const hasProviderToken = !!session.provider_token;
          
          // 🔥 2024-03-16: 구글 기본 로그인은 프로필만 요청 (캘린더/Tasks 권한 없음)
          // provider_token이 있어도 scopes가 다르므로 무조건 false
          setIsGoogleAuth(isGoogle);
          setHasGoogleCalendar(false); // 🔥 기본적으로 캘린더 연동 안됨
          setHasGoogleTasks(false); // 🔥 기본적으로 Tasks 연동 안됨
          
          console.log('[AuthContext] Initial Google Auth Status:', {
            provider: session.user?.app_metadata?.provider,
            isGoogleAuth: isGoogle,
            hasProviderToken,
            hasGoogleCalendar: false, // 명시적으로 false
            hasGoogleTasks: false, // 명시적으로 false
            note: 'Google 기본 로그인 = 프로필만 (캘린더/Tasks 권한 없음)',
          });
        }
        console.log('[AuthContext] ========================================');
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/calendar`,
        // 🔥 기본 프로필 보만 요청 (캘린더/Tasks 권한 제거)
        scopes: 'openid email profile',
        // 🔥 PKCE flow 강제
        queryParams: {
          access_type: 'offline',
          prompt: 'select_account', // 계정 선택만
        },
      },
    });

    if (error) {
      console.error('Google sign in error:', error);
      throw error;
    }
  };

  const signInWithEmail = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      console.error('Email sign in error:', error);
      throw error;
    }
  };

  const signUpWithEmail = async (email: string, password: string, name: string) => {
    try {
      //  서버의 signup 엔드포인트 호출 (디폴트 카테고리 생성 포함)
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-f973dbc1/auth/signup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${publicAnonKey}`,
        },
        body: JSON.stringify({ email, password, name }),
      });

      const data = await response.json();

      if (!response.ok) {
        console.error('Server signup error:', data);
        throw new Error(data.error || 'Failed to sign up');
      }

      console.log('Signup success:', data);

      // 서버에서 이메일 인증을 자동으로 완료하므로 바로 로그인 가능
      // 자동 로그인 처리
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        console.error('Auto sign-in error:', signInError);
        // 회원가입은 성공했지만 자동 로그인 실패 - 수동 로그인 필요
        return { 
          needsEmailConfirmation: false,
          user: data.user 
        };
      }

      console.log('Auto sign-in success:', signInData);

      // 이메일 인증이 자동으로 완료되었으므로
      return { 
        needsEmailConfirmation: false,
        user: signInData.user 
      };
    } catch (error: any) {
      console.error('Email sign up error:', error);
      throw error;
    }
  };

  const signOut = async () => {
    console.log('[AuthContext] 🚪 signOut called');
    
    try {
      // 🔥 로컬 세션만 삭제 (global scope는 서버 응답을 기다려서 느림)
      const { error } = await supabase.auth.signOut({ scope: 'local' });
      
      if (error) {
        console.error('[AuthContext] ❌ Sign out error:', error);
        // 에러가 있어도 로컬 상태는 정리
        setSession(null);
        setUser(null);
        setIsGoogleAuth(false);
        setHasGoogleCalendar(false);
        setHasGoogleTasks(false);
        throw error;
      }
      
      // 🔥 저장된 Google 토큰도 정리
      const { clearGoogleTokens } = await import('../../lib/google-token');
      clearGoogleTokens();
      console.log('[AuthContext] ✅ Sign out successful');
      
      // 상태 초기화
      setSession(null);
      setUser(null);
      setIsGoogleAuth(false);
      setHasGoogleCalendar(false);
      setHasGoogleTasks(false);
    } catch (error) {
      console.error('[AuthContext] ❌ Sign out exception:', error);
      // 예외가 발생해도 로컬 상태는 정리
      setSession(null);
      setUser(null);
      setIsGoogleAuth(false);
      setHasGoogleCalendar(false);
      setHasGoogleTasks(false);
      throw error;
    }
  };

  const reauthorizeWithTasks = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/calendar`,
        // 🔥 구글 캘린더 읽기/쓰기 + Tasks 읽기/쓰기 권한 요청
        scopes: 'openid email profile https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/tasks',
        // 🔥 PKCE flow 강제 (Hash 대신 Query parameter 사용)
        queryParams: {
          access_type: 'offline',
          prompt: 'consent', // 항상 동의 화면 표시 (강제 재동의)
        },
      },
    });

    if (error) {
      console.error('Google reauthorization error:', error);
      throw error;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        loading,
        isGoogleAuth,
        hasGoogleCalendar,
        hasGoogleTasks,
        signInWithGoogle,
        signInWithEmail,
        signUpWithEmail,
        signOut,
        reauthorizeWithTasks, // 🔥 Google Tasks 재인증
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}