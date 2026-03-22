export type ViewType = "day" | "week" | "month" | "year";

export interface Category {
  id: string;
  name: string;
  color: string;
  isGoogleCalendar?: boolean;
  googleCalendarId?: string;
}

export interface CalendarEvent {
  id: string;
  title: string;
  date: Date;
  endDate?: Date; // 여러 날짜에 걸친 일정을 위한 종료일
  startTime?: string;
  endTime?: string;
  description?: string;
  categoryId?: string;
  recurrence?: {
    freq: "DAILY" | "WEEKLY" | "MONTHLY" | "YEARLY";
    interval: number;
    byweekday?: number[];
    until?: Date;
    count?: number;
  };
  rrule?: string;
  exdate?: Date[]; // 반복 일정에서 제외할 날짜들 (EXDATE)
  isRecurringInstance?: boolean; // 반복 일정의 인스턴스인지 표시
  recurringEventId?: string; // 원본 반복 일정의 ID
  isGoogleEvent?: boolean; // 구글 캘린더에서 가져온 일정인지 표시
  googleCalendarName?: string; // 구글 캘린더 이름
  googleEventId?: string; // 구글 캘린더 이벤트 ID (수정/삭제용)
  googleCalendarId?: string; // 구글 캘린더 ID (수정/삭제용)
  isHoliday?: boolean; // 공휴일 여부 (구글 캘린더 공휴일)
}
