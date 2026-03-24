/**
 * Google provider_token 관리 헬퍼
 *
 * 핵심 문제: Supabase는 세션 갱신 시 provider_token을 기본 scope(profile, email) 토큰으로
 * 교체합니다. Calendar scope가 있는 토큰을 보호해야 합니다.
 *
 * 전략:
 * 1. Calendar scope가 있는 토큰만 localStorage에 저장 (CALENDAR_TOKEN_KEY)
 * 2. 기본 scope 토큰은 저장하지 않음
 * 3. 만료 시 refresh_token으로 자동 갱신
 */

const CALENDAR_TOKEN_KEY = 'google_calendar_token';
const REFRESH_KEY = 'google_refresh_token';
const EXPIRY_KEY = 'google_token_expiry';
const API_ENABLED_KEY = 'google_calendar_api_enabled';

// 하위 호환: 기존 키도 정리
const LEGACY_TOKEN_KEY = 'google_provider_token';

/**
 * 사용자가 구글 캘린더 API 연동을 활성화했는지 여부
 */
export function isGoogleCalendarApiEnabled(): boolean {
  return localStorage.getItem(API_ENABLED_KEY) === 'true';
}

export function setGoogleCalendarApiEnabled(enabled: boolean) {
  if (enabled) {
    localStorage.setItem(API_ENABLED_KEY, 'true');
  } else {
    localStorage.removeItem(API_ENABLED_KEY);
  }
}

// Google OAuth Client ID
const GOOGLE_CLIENT_ID = '140623008481-6ut0fehsct4mcupi2cioem44us17u41j.apps.googleusercontent.com';

/**
 * 토큰에 Calendar scope가 있는지 빠르게 확인
 */
async function hasCalendarScope(token: string): Promise<boolean> {
  try {
    const res = await fetch(`https://www.googleapis.com/oauth2/v1/tokeninfo?access_token=${token}`);
    if (!res.ok) return false;
    const data = await res.json();
    return data.scope?.includes('googleapis.com/auth/calendar') || false;
  } catch {
    return false;
  }
}

/**
 * Google Calendar access token을 가져옴 (만료 시 자동 갱신)
 * Calendar scope가 있는 토큰만 반환합니다.
 */
export async function getGoogleTokenAsync(session: any): Promise<string | null> {
  // 1. session에 fresh token이 있고 calendar scope가 있으면 저장
  if (session?.provider_token) {
    const hasScope = await hasCalendarScope(session.provider_token);
    if (hasScope) {
      saveCalendarToken(session.provider_token, session.provider_refresh_token);
      return session.provider_token;
    }
    // calendar scope가 없는 토큰은 무시 (기본 로그인 토큰)
  }

  // 2. localStorage에서 calendar 전용 토큰 확인
  const savedToken = localStorage.getItem(CALENDAR_TOKEN_KEY);
  const expiryStr = localStorage.getItem(EXPIRY_KEY);

  if (savedToken && expiryStr) {
    const expiry = parseInt(expiryStr, 10);
    // 만료 5분 전까지는 유효
    if (Date.now() < expiry - 5 * 60 * 1000) {
      return savedToken;
    }
  }

  // 3. 만료되었으면 refresh token으로 갱신
  const refreshToken = localStorage.getItem(REFRESH_KEY);
  if (refreshToken) {
    const newToken = await refreshAccessToken(refreshToken);
    if (newToken) {
      return newToken;
    }
  }

  // 4. 모든 시도 실패
  return null;
}

/**
 * 동기 버전 - Calendar scope 토큰만 반환
 */
export function getGoogleToken(session: any): string | null {
  // session.provider_token은 scope를 모르므로 저장하지 않음
  // localStorage의 calendar 전용 토큰만 반환
  const savedToken = localStorage.getItem(CALENDAR_TOKEN_KEY);
  if (savedToken) {
    const expiryStr = localStorage.getItem(EXPIRY_KEY);
    if (expiryStr) {
      const expiry = parseInt(expiryStr, 10);
      if (Date.now() < expiry - 5 * 60 * 1000) {
        return savedToken;
      }
    }
    // 만료되었지만 일단 반환 (async 버전에서 갱신)
    return savedToken;
  }
  return null;
}

/**
 * Calendar scope 토큰 저장
 */
function saveCalendarToken(accessToken: string, refreshToken?: string | null) {
  localStorage.setItem(CALENDAR_TOKEN_KEY, accessToken);
  localStorage.setItem(EXPIRY_KEY, String(Date.now() + 3600 * 1000));
  // 기존 키 정리
  localStorage.removeItem(LEGACY_TOKEN_KEY);

  if (refreshToken) {
    localStorage.setItem(REFRESH_KEY, refreshToken);
    console.log('[GoogleToken] 💾 Calendar token + refresh token saved');
  } else {
    console.log('[GoogleToken] 💾 Calendar token saved (no refresh token)');
  }
}

/**
 * Refresh token으로 새 access token 발급
 */
async function refreshAccessToken(refreshToken: string): Promise<string | null> {
  try {
    console.log('[GoogleToken] 🔄 Refreshing calendar access token...');

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
      if (error.error === 'invalid_grant') {
        clearGoogleTokens();
      }
      return null;
    }

    const data = await response.json();
    const newToken = data.access_token;
    const expiresIn = data.expires_in || 3600;

    localStorage.setItem(CALENDAR_TOKEN_KEY, newToken);
    localStorage.setItem(EXPIRY_KEY, String(Date.now() + expiresIn * 1000));

    console.log('[GoogleToken] ✅ Calendar token refreshed, expires in', expiresIn, 's');
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
  localStorage.removeItem(CALENDAR_TOKEN_KEY);
  localStorage.removeItem(LEGACY_TOKEN_KEY);
  localStorage.removeItem(EXPIRY_KEY);
  // REFRESH_KEY, API_ENABLED_KEY 유지 → 재로그인 시 refresh token으로 자동 갱신
  console.log('[GoogleToken] 🗑️ Access tokens cleared (refresh token & API flag preserved)');
}
