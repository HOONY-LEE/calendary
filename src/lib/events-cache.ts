import type { CalendarEvent } from "../app/pages/calendar/types";

interface EventsCache {
  events: CalendarEvent[];
  timestamp: number;
}

// 모듈 레벨 캐시 - 컴포넌트 라이프사이클과 독립적
let cache: EventsCache | null = null;

// 캐시 유효 시간: 5분
const CACHE_TTL = 5 * 60 * 1000;

export function getCachedEvents(): CalendarEvent[] | null {
  if (!cache) return null;
  if (Date.now() - cache.timestamp > CACHE_TTL) {
    cache = null;
    return null;
  }
  return cache.events;
}

export function setCachedEvents(events: CalendarEvent[]) {
  cache = {
    events,
    timestamp: Date.now(),
  };
}

export function isCacheStale(): boolean {
  if (!cache) return true;
  return Date.now() - cache.timestamp > CACHE_TTL;
}

export function invalidateEventsCache() {
  cache = null;
}
