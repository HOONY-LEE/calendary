import { useState, useEffect, useCallback, useRef } from "react";
import { useTranslation } from "react-i18next";
import type { Session, User } from "@supabase/supabase-js";
import type { CalendarEvent, Category, ViewType } from "../types";
import { eventsAPI, DBEvent } from "../../../../lib/api";
import { projectId, publicAnonKey } from "../../../../lib/supabase-info";
import { toast } from "sonner";
import { getGoogleToken } from "../../../../lib/google-token";
import { getCachedEvents, setCachedEvents, isCacheStale } from "../../../../lib/events-cache";

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
  // 캐시가 있으면 즉시 사용, 없으면 빈 배열
  const cached = getCachedEvents();
  const [events, setEvents] = useState<CalendarEvent[]>(cached || []);
  const [isLoading, setIsLoading] = useState(!cached);

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

      // 🔥 구글 캘린더 실시간 동기화
      let googleEvents: CalendarEvent[] = [];

      if (getGoogleToken(session)) {
        try {
          const now = new Date();
          const timeMin = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();
          const timeMax = new Date(now.getFullYear(), now.getMonth() + 2, 0).toISOString();

          console.log("[Calendar] 📡 Fetching Google Calendar events...");

          const response = await fetch(
            `https://${projectId}.supabase.co/functions/v1/make-server-f973dbc1/google-calendar/events?timeMin=${encodeURIComponent(timeMin)}&timeMax=${encodeURIComponent(timeMax)}`,
            {
              headers: {
                'Authorization': `Bearer ${publicAnonKey}`,
                'X-User-JWT': session.access_token,
                'X-Google-Access-Token': getGoogleToken(session),
              },
            }
          );

          if (response.ok) {
            const data = await response.json();
            console.log("[Calendar] ✅ Google Calendar: ", data.events?.length || 0, "events from", data.calendars?.length || 0, "calendars");

            googleEvents = (data.events || []).map((gEvent: any) => {
              let startDate: Date;
              let endDate: Date | undefined;
              let startTime: string | undefined;
              let endTime: string | undefined;

              if (gEvent.start?.date) {
                // 종일 일정
                startDate = new Date(gEvent.start.date);
                if (gEvent.end?.date && gEvent.end.date !== gEvent.start.date) {
                  const eDate = new Date(gEvent.end.date);
                  eDate.setDate(eDate.getDate() - 1); // Google은 exclusive end
                  endDate = eDate;
                }
              } else {
                // 시간 지정 일정
                const s = new Date(gEvent.start?.dateTime);
                const e = new Date(gEvent.end?.dateTime);
                startDate = s;
                startTime = `${s.getHours().toString().padStart(2, '0')}:${s.getMinutes().toString().padStart(2, '0')}`;
                endTime = `${e.getHours().toString().padStart(2, '0')}:${e.getMinutes().toString().padStart(2, '0')}`;
                if (s.toDateString() !== e.toDateString()) {
                  endDate = e;
                }
              }

              return {
                id: `google-${gEvent.id}`,
                title: gEvent.summary || '(제목 없음)',
                date: startDate,
                endDate,
                startTime,
                endTime,
                description: gEvent.description,
                isGoogleEvent: true,
                googleEventId: gEvent.id,
                googleCalendarId: gEvent.calendarId,
                googleCalendarName: gEvent.calendarSummary,
                categoryId: `gcal-${gEvent.calendarId}`,
              } as CalendarEvent;
            });
          } else {
            console.warn("[Calendar] ⚠️ Google Calendar fetch failed:", response.status);
          }
        } catch (error) {
          console.warn("[Calendar] ⚠️ Google Calendar sync failed, showing local events only:", error);
        }
      } else {
        console.log("[Calendar] ⏭️ No provider_token - skipping Google Calendar sync");
      }

      const allEvents = [...calendarEvents, ...googleEvents];
      setEvents(allEvents);
      setCachedEvents(allEvents);
      console.log(
        "[Calendar] Successfully loaded",
        calendarEvents.length, "Supabase +",
        googleEvents.length, "Google events",
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
  // 캐시가 유효하면 백그라운드에서 조용히 갱신, 캐시가 없으면 즉시 로드
  const hasInitialCache = useRef(!!cached);
  useEffect(() => {
    if (hasInitialCache.current && !isCacheStale()) {
      // 캐시가 유효: 로딩 없이 백그라운드 갱신
      hasInitialCache.current = false;
      console.log("[Calendar] ♻️ Using cached events, refreshing in background...");
      setIsLoading(false);
      // 백그라운드 갱신 (로딩 스피너 없이)
      loadEvents().then(() => {
        console.log("[Calendar] ♻️ Background refresh complete");
      });
    } else {
      hasInitialCache.current = false;
      loadEvents();
    }
  }, [session, language]);

  // setEvents를 래핑하여 캐시도 동기화
  const setEventsWithCache = useCallback((updater: React.SetStateAction<CalendarEvent[]>) => {
    setEvents((prev) => {
      const newEvents = typeof updater === 'function' ? updater(prev) : updater;
      setCachedEvents(newEvents);
      return newEvents;
    });
  }, []);

  return {
    events,
    setEvents: setEventsWithCache,
    loadEvents,
    isLoading,
    setIsLoading,
  };
}
