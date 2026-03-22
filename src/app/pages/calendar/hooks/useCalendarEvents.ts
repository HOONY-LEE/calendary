import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import type { Session, User } from "@supabase/supabase-js";
import type { CalendarEvent, Category, ViewType } from "../types";
import { eventsAPI, DBEvent } from "../../../../lib/api";
import { toast } from "sonner";

interface UseCalendarEventsParams {
  session: Session | null;
  user: User | null;
  signOut: () => Promise<void>;
  language: "ko" | "en";
}

interface UseCalendarEventsReturn {
  events: CalendarEvent[];
  setEvents: React.Dispatch<React.SetStateAction<CalendarEvent[]>>;
  loadEvents: () => Promise<void>;
  isLoading: boolean;
  setIsLoading: React.Dispatch<React.SetStateAction<boolean>>;
}

export function useCalendarEvents({
  session,
  user,
  signOut,
  language,
}: UseCalendarEventsParams): UseCalendarEventsReturn {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // 서버에서 이벤트 로드 함수 (컴포넌트 레벨)
  const loadEvents = useCallback(async () => {
    if (!session?.access_token) {
      console.log("[Calendar] No session, skipping event load");
      setIsLoading(false);
      setEvents([]); // 세션이 없으면 빈 배열로 설정
      return;
    }

    setIsLoading(true);

    try {
      console.log("[Calendar] Loading events...");

      console.log(
        "[Calendar] Loading events with token (first 20 chars):",
        session.access_token.substring(0, 20) + "...",
      );
      console.log(
        "[Calendar] User email:",
        session.user?.email,
      );

      const dbEvents = await eventsAPI.getAll(
        session.access_token,
      );

      console.log("[Calendar] Received DB events:", dbEvents);

      // DB 이벤트를 CalendarEvent 형식으로 변환 (Google Calendar 스키마)
      const calendarEvents: CalendarEvent[] = dbEvents.map(
        (dbEvent) => {
          let startDate: Date;
          let endDate: Date | undefined;
          let startTime: string | undefined;
          let endTime: string | undefined;

          // 종일 일정 vs 시간 지정 일정
          if (dbEvent.is_all_day) {
            // 종일 일정
            startDate = new Date(dbEvent.start_date!);

            // 🔥 구글 캘린더 기준: end_date는 EXCLUSIVE
            // DB에 "start: 06-10, end: 06-15"로 저장되어 있으면
            // UI에는 "6월 10~14일"로 표시 (end -1일)
            if (
              dbEvent.end_date &&
              dbEvent.end_date !== dbEvent.start_date
            ) {
              const dbEndDate = new Date(dbEvent.end_date);
              dbEndDate.setDate(dbEndDate.getDate() - 1); // -1일 (exclusive → inclusive)
              endDate = dbEndDate;
            }
          } else {
            // 시간 지정 일정
            const startDateTime = new Date(
              dbEvent.start_datetime!,
            );
            const endDateTime = new Date(dbEvent.end_datetime!);

            startDate = startDateTime;
            startTime = `${startDateTime.getHours().toString().padStart(2, "0")}:${startDateTime.getMinutes().toString().padStart(2, "0")}`;
            endTime = `${endDateTime.getHours().toString().padStart(2, "0")}:${endDateTime.getMinutes().toString().padStart(2, "0")}`;

            // endDate는 다른 날짜인 경우에만 설정
            if (
              startDateTime.toDateString() !==
              endDateTime.toDateString()
            ) {
              endDate = endDateTime;
            }
          }

          // RRule 변환 (recurrence 배열 → rrule 문자열)
          let rrule: string | undefined;
          if (
            dbEvent.recurrence &&
            dbEvent.recurrence.length > 0
          ) {
            rrule = dbEvent.recurrence[0]; // 첫 번째 RRULE 사용
          }

          return {
            id: dbEvent.id,
            title: dbEvent.summary, // summary → title
            date: startDate,
            endDate: endDate,
            startTime,
            endTime,
            description: dbEvent.description,
            categoryId: dbEvent.category_id,
            rrule,
            isGoogleEvent: false,
          };
        },
      );

      // 🔥 구글 캘린더 자동 로드 제거 - 나중에 수동 연동 기능 추가 예정
      console.log(
        "[Calendar] ⏭️ Google Calendar auto-sync disabled - manual integration only",
      );
      const googleEvents: CalendarEvent[] = [];

      // Supabase 일정만 사용
      const allEvents = [...calendarEvents, ...googleEvents];
      setEvents(allEvents);
      console.log(
        "[Calendar] Successfully loaded",
        calendarEvents.length,
        "Supabase events",
      );

      if (calendarEvents.length === 0) {
        console.log(
          "[Calendar] No events found - this is normal for new users",
        );
      }
    } catch (error) {
      console.error(
        "[Calendar] Failed to load events - Error details:",
        error,
      );
      // 에러 상세 정보 출력
      if (error instanceof Error) {
        console.error(
          "[Calendar] Error message:",
          error.message,
        );
        console.error("[Calendar] Error stack:", error.stack);

        // 401 에러 (세션 만료) 처리
        if (error.message.includes("Authentication failed")) {
          console.log(
            "[Calendar] Session expired, signing out",
          );
          toast.error(
            language === "ko"
              ? "세션이 만료되었습니다. 다시 로그인해주세요."
              : "Session expired. Please sign in again.",
          );
          await signOut();
          return;
        }

        // Failed to fetch 에러 처리
        if (error.message === "Failed to fetch") {
          console.error(
            "[Calendar] Network error when loading events",
          );
          toast.error(
            language === "ko"
              ? "서버에 연결할 수 없습니다. 네트워크 연결을 확인해주세요."
              : "Cannot connect to server. Please check your network connection.",
          );
          return;
        }
      }

      toast.error(
        language === "ko"
          ? "일정을 불러오는데 실패했습니다"
          : "Failed to load events",
      );
      setEvents([]); // 에러 발생 시에도 빈 배열로 설정
    } finally {
      setIsLoading(false);
    }
  }, [session, language, signOut]);

  // 이벤트 로드 useEffect
  useEffect(() => {
    loadEvents();
  }, [session, language]);

  return {
    events,
    setEvents,
    loadEvents,
    isLoading,
    setIsLoading,
  };
}
