/**
 * 시간대 유틸리티 모듈
 * 설정에서 선택한 시간대(app_timezone)를 앱 전체에 적용
 */

/** 사용자가 설정한 시간대 반환 (없으면 브라우저 기본값) */
export function getAppTimezone(): string {
  return localStorage.getItem('app_timezone') || Intl.DateTimeFormat().resolvedOptions().timeZone;
}

/** 앱 시간대 기준 오늘 날짜 문자열 (YYYY-MM-DD) */
export function getTodayInTimezone(tz?: string): string {
  const timezone = tz || getAppTimezone();
  // en-CA 로케일은 자연스럽게 YYYY-MM-DD 형식
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

/**
 * 앱 시간대 기준 현재 시각의 Date 객체 반환
 * 반환된 Date의 getFullYear/getMonth/getDate/getHours 등이
 * 앱 시간대의 벽시계 시간과 일치
 */
export function nowInTimezone(tz?: string): Date {
  const timezone = tz || getAppTimezone();
  const now = new Date();
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).formatToParts(now);

  const get = (type: string) => parseInt(parts.find(p => p.type === type)?.value || '0');
  return new Date(get('year'), get('month') - 1, get('day'), get('hour'), get('minute'), get('second'));
}

/**
 * Date 객체를 앱 시간대 기준 ISO 8601 문자열로 변환
 * 예: 2024-06-10T14:30:00+09:00
 */
export function toISOStringInTimezone(date: Date, tz?: string): string {
  const timezone = tz || getAppTimezone();
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).formatToParts(date);

  const get = (type: string) => parts.find(p => p.type === type)?.value || '00';
  const dateStr = `${get('year')}-${get('month')}-${get('day')}T${get('hour')}:${get('minute')}:${get('second')}`;

  // UTC 오프셋 계산
  const offsetParts = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    timeZoneName: 'shortOffset',
  }).formatToParts(date);
  const offsetStr = offsetParts.find(p => p.type === 'timeZoneName')?.value || 'GMT';

  if (offsetStr === 'GMT') return dateStr + '+00:00';
  const m = offsetStr.match(/GMT([+-])(\d+)(?::(\d+))?/);
  if (m) {
    const sign = m[1];
    const hours = m[2].padStart(2, '0');
    const minutes = (m[3] || '0').padStart(2, '0');
    return `${dateStr}${sign}${hours}:${minutes}`;
  }
  return dateStr + 'Z';
}
