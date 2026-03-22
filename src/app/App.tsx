import { RouterProvider } from 'react-router';
import { ThemeProvider } from './context/ThemeContext';
import { router } from './routes';
import { Toaster } from './components/ui/sonner';
import '../i18n/config';
import { useEffect } from 'react';
import { supabase } from '../lib/supabase';

export default function App() {
  // 🔥 앱 시작 시 세션 검증 및 정리
  useEffect(() => {
    const validateSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.log('[App] Session error on startup:', error.message);
          // 세션 에러가 있으면 정리
          await supabase.auth.signOut();
          return;
        }
        
        if (session) {
          // 세션이 있으면 사용자가 실제로 존재하는지 확인
          const { data: { user }, error: userError } = await supabase.auth.getUser();
          
          if (userError || !user) {
            console.log('[App] 🚨 User does not exist (orphaned session), clearing...');
            console.log('[App] User error:', userError?.message);
            // 사용자가 없으면 세션 정리
            await supabase.auth.signOut();
            
            // 로그인 페이지가 아니면 리다이렉트
            if (window.location.pathname !== '/login' && window.location.pathname !== '/signup') {
              window.location.href = '/login';
            }
          } else {
            console.log('[App] ✅ Session validated, user exists:', user.email);
          }
        }
      } catch (error) {
        console.error('[App] Session validation error:', error);
        // 예외 발생 시 세션 정리
        await supabase.auth.signOut();
      }
    };
    
    validateSession();
  }, []);

  return (
    <ThemeProvider>
      <RouterProvider router={router} />
      <Toaster />
    </ThemeProvider>
  );
}