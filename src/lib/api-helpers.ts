// API 호출 헬퍼 함수 - 재시도 로직 포함

/**
 * fetch 호출을 재시도하는 헬퍼 함수
 * @param fn - 실행할 함수
 * @param retries - 재시도 횟수 (기본값: 2)
 * @param delay - 재시도 간 지연 시간 (ms, 기본값: 1000)
 */
export async function retryFetch<T>(
  fn: () => Promise<T>,
  retries = 2,
  delay = 1000
): Promise<T> {
  let lastError: Error | null = null;

  for (let i = 0; i <= retries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      
      // 마지막 시도가 아니면 재시도
      if (i < retries) {
        console.log(`[RetryFetch] Attempt ${i + 1} failed, retrying in ${delay}ms...`);
        console.log(`[RetryFetch] Error:`, error);
        
        // 지연 후 재시도
        await new Promise(resolve => setTimeout(resolve, delay));
        
        // 지수 백오프: 다음 재시도는 2배 지연
        delay *= 2;
      }
    }
  }

  // 모든 재시도 실패
  console.error(`[RetryFetch] All ${retries + 1} attempts failed`);
  throw lastError;
}

/**
 * 네트워크 에러인지 확인
 */
export function isNetworkError(error: unknown): boolean {
  if (error instanceof TypeError && error.message === 'Failed to fetch') {
    return true;
  }
  if (error instanceof Error && error.message.includes('NetworkError')) {
    return true;
  }
  return false;
}

/**
 * 인증 에러인지 확인
 */
export function isAuthError(error: unknown): boolean {
  if (error instanceof Error) {
    return error.message.includes('Authentication failed') ||
           error.message.includes('Unauthorized') ||
           error.message.includes('401');
  }
  return false;
}

/**
 * 에러 타입에 따라 사용자 친화적인 메시지 반환
 */
export function getErrorMessage(error: unknown, language: string = 'ko'): string {
  if (isNetworkError(error)) {
    return language === 'ko'
      ? '서버에 연결할 수 없습니다. 네트워크 연결을 확인해주세요.'
      : 'Cannot connect to server. Please check your network connection.';
  }
  
  if (isAuthError(error)) {
    return language === 'ko'
      ? '세션이 만료되었습니다. 다시 로그인해주세요.'
      : 'Session expired. Please sign in again.';
  }
  
  if (error instanceof Error) {
    return error.message;
  }
  
  return language === 'ko'
    ? '알 수 없는 오류가 발생했습니다.'
    : 'An unknown error occurred.';
}
