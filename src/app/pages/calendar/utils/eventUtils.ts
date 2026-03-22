import { RRule } from "rrule";
import type { CalendarEvent } from "../types";

/**
 * 반복 일정을 특정 기간 동안 확장하는 함수
 */
export function expandRecurringEvents(
  events: CalendarEvent[],
  startDate: Date,
  endDate: Date,
): CalendarEvent[] {
  const expandedEvents: CalendarEvent[] = [];

  events.forEach((event) => {
    if (event.recurrence && event.rrule) {
      // 반복 일정인 경우
      try {
        const rule = RRule.fromString(event.rrule);

        // 지정된 기간 내의 발생 날짜들을 가져옴
        const occurrences = rule.between(
          startDate,
          endDate,
          true,
        );

        occurrences.forEach((occurrence, index) => {
          // EXDATE 확인: 제외할 날짜인지 검사
          const isExcluded = event.exdate?.some((exdate) => {
            return (
              exdate.getFullYear() ===
                occurrence.getFullYear() &&
              exdate.getMonth() === occurrence.getMonth() &&
              exdate.getDate() === occurrence.getDate()
            );
          });

          // 제외되지 않은 날짜만 추가
          if (!isExcluded) {
            // 각 발생 날짜마다 새로운 이벤트 인스턴스 생성
            expandedEvents.push({
              ...event,
              id: `${event.id}-recur-${occurrence.getTime()}`,
              date: occurrence,
              isRecurringInstance: true,
              recurringEventId: event.id,
            });
          }
        });
      } catch (error) {
        console.error(
          "Failed to expand recurring event:",
          error,
        );
        // 오류 발생 시 원본 이벤트 추가
        expandedEvents.push(event);
      }
    } else {
      // 일반 일정인 경우 그대로 추가
      expandedEvents.push(event);
    }
  });

  return expandedEvents;
}

/**
 * 특정 날짜의 이벤트를 가져오고 시작 시간순으로 정렬
 */
export function getEventsForDate(
  date: Date | null,
  events: CalendarEvent[],
  selectedCategoryIds: string[],
): CalendarEvent[] {
  if (!date) return [];
  return events
    .filter((event) => {
      // 시작일과 같은지 확인
      const startDateMatch =
        event.date.getDate() === date.getDate() &&
        event.date.getMonth() === date.getMonth() &&
        event.date.getFullYear() === date.getFullYear();

      // 여러 날짜에 걸친 일정인 경우, 범위 내에 있는지 확인
      let dateInRange = startDateMatch;
      if (!dateInRange && event.endDate) {
        const checkDate = new Date(
          date.getFullYear(),
          date.getMonth(),
          date.getDate(),
        );
        const start = new Date(
          event.date.getFullYear(),
          event.date.getMonth(),
          event.date.getDate(),
        );
        const end = new Date(
          event.endDate.getFullYear(),
          event.endDate.getMonth(),
          event.endDate.getDate(),
        );
        dateInRange = checkDate >= start && checkDate <= end;
      }

      if (!dateInRange) return false;

      if (
        event.categoryId &&
        !selectedCategoryIds.includes(event.categoryId)
      ) {
        return false;
      }

      return true;
    })
    .sort((a, b) => {
      // 시작 시간이 없는 경우 맨 뒤로
      if (!a.startTime && !b.startTime) return 0;
      if (!a.startTime) return 1;
      if (!b.startTime) return -1;

      // 시작 시간을 비교 (HH:MM 형식)
      const timeA = a.startTime.split(":").map(Number);
      const timeB = b.startTime.split(":").map(Number);

      const minutesA = timeA[0] * 60 + timeA[1];
      const minutesB = timeB[0] * 60 + timeB[1];

      return minutesA - minutesB;
    });
}

/**
 * 다음 사용 가능한 시간 찾기 함수
 */
export const getNextAvailableTime = (
  date: Date | null,
  eventsList: CalendarEvent[],
): string => {
  if (!date) return "09:00";

  // 해당 날짜의 이벤트만 필터링
  const dayEvents = eventsList.filter((event) => {
    const eventDate = new Date(event.date);
    return (
      eventDate.getFullYear() === date.getFullYear() &&
      eventDate.getMonth() === date.getMonth() &&
      eventDate.getDate() === date.getDate()
    );
  });

  // 09:00부터 23:00까지 체크
  for (let hour = 9; hour < 24; hour++) {
    const timeStr = `${hour.toString().padStart(2, "0")}:00`;
    const hasEvent = dayEvents.some(
      (event) => event.startTime === timeStr,
    );
    if (!hasEvent) {
      return timeStr;
    }
  }

  // 모든 시간이 차있으면 09:00 반환 (기본값)
  return "09:00";
};
