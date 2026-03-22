import { createClient } from '@supabase/supabase-js';
import { projectId, publicAnonKey } from './supabase-info';

const supabaseUrl = `https://${projectId}.supabase.co`;

export const supabase = createClient(supabaseUrl, publicAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    // 🔥 CRITICAL: flowType을 'pkce'로 강제
    flowType: 'pkce',
    // 🔥 localStorage를 명시적으로 사용
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
    storageKey: 'supabase.auth.token',
  },
});

// 🔥 세션 정리는 AuthContext에서 처리하므로 여기서는 제거
// (동시에 getUser() 호출 시 AbortError 방지)