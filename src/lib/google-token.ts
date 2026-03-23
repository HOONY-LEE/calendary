/**
 * Google provider_token 관리 헬퍼
 * - session.provider_token → localStorage 백업
 * - 만료 시 provider_refresh_token으로 자동 갱신
 */

const TOKEN_KEY = 'google_provider_token';
const REFRESH_KEY = 'google_refresh_token';
const EXPIRY_KEY = 'google_token_expiry';

// Google OAuth Client ID (공개 정보, 프론트에서 사용 가능)
const GOOGLE_CLIENT_ID = '140623008481-6ut0fehsct4mcupi2cioem44us17u41j.apps.googleusercontent.com';

/**
 * Google access token을 가져옴 (만료 시 자동 갱신)
 */
export async function getGoogleTokenAsync(session: any): Promise<string | null> {
  // 1. session에 fresh token이 있으면 저장하고 반환
  if (session?.provider_token) {
    saveTokens(session.provider_token, session.provider_refresh_token);
    return session.provider_token;
  }

  // 2. localStorage에서 토큰 확인
  const savedToken = localStorage.getItem(TOKEN_KEY);
  const expiryStr = localStorage.getItem(EXPIRY_KEY);

  if (savedToken && expiryStr) {
    const expiry = parseInt(expiryStr, 10);
    // 만료 5분 전까지는 유효한 것으로 간주
    if (Date.now() < expiry - 5 * 60 * 1000) {
      return savedToken;
    }
  }

  // 3. 만료되었으면 refresh token으로 갱신 시도
  const refreshToken = localStorage.getItem(REFRESH_KEY);
  if (refreshToken) {
    const newToken = await refreshAccessToken(refreshToken);
    if (newToken) {
      return newToken;
    }
  }

  // 4. refresh도 실패하면 localStorage의 토큰을 그대로 반환 (Google이 거부할 수 있음)
  return savedToken || null;
}

/**
 * 동기 버전 - 기존 호환성 유지 (만료 확인 없이 저장된 토큰 반환)
 */
export function getGoogleToken(session: any): string | null {
  if (session?.provider_token) {
    saveTokens(session.provider_token, session.provider_refresh_token);
    return session.provider_token;
  }
  return localStorage.getItem(TOKEN_KEY) || null;
}

/**
 * 토큰 저장
 */
function saveTokens(accessToken: string, refreshToken?: string | null) {
  localStorage.setItem(TOKEN_KEY, accessToken);
  // 토큰 만료 시간: 현재로부터 1시간 (Google 기본)
  localStorage.setItem(EXPIRY_KEY, String(Date.now() + 3600 * 1000));

  if (refreshToken) {
    localStorage.setItem(REFRESH_KEY, refreshToken);
    console.log('[GoogleToken] 💾 Refresh token saved');
  }
}

/**
 * Refresh token으로 새 access token 발급
 * Google의 token endpoint에 client_id + refresh_token만으로 갱신 가능
 * (PKCE flow에서는 client_secret 불필요)
 */
async function refreshAccessToken(refreshToken: string): Promise<string | null> {
  try {
    console.log('[GoogleToken] 🔄 Refreshing access token...');

    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: GOOGLE_CLIENT_ID,
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('[GoogleToken] ❌ Refresh failed:', error);
      // refresh token이 무효화된 경우 정리
      if (error.error === 'invalid_grant') {
        clearTokens();
      }
      return null;
    }

    const data = await response.json();
    const newToken = data.access_token;
    const expiresIn = data.expires_in || 3600;

    localStorage.setItem(TOKEN_KEY, newToken);
    localStorage.setItem(EXPIRY_KEY, String(Date.now() + expiresIn * 1000));

    console.log('[GoogleToken] ✅ Access token refreshed, expires in', expiresIn, 'seconds');
    return newToken;
  } catch (error) {
    console.error('[GoogleToken] ❌ Refresh error:', error);
    return null;
  }
}

/**
 * 토큰 전체 정리 (로그아웃 시)
 */
export function clearGoogleTokens() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_KEY);
  localStorage.removeItem(EXPIRY_KEY);
  console.log('[GoogleToken] 🗑️ All tokens cleared');
}

function clearTokens() {
  clearGoogleTokens();
}
