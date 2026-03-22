/**
 * Google provider_token을 session 또는 localStorage에서 가져오는 헬퍼
 * Supabase는 세션 갱신 시 provider_token을 유지하지 않으므로 localStorage fallback 사용
 */
export function getGoogleToken(session: any): string | null {
  return session?.provider_token || localStorage.getItem('google_provider_token') || null;
}
