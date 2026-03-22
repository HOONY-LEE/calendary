import { createClient } from "npm:@supabase/supabase-js@2";

// Google Calendar API 기본 URL
const GOOGLE_CALENDAR_API = "https://www.googleapis.com/calendar/v3";

/**
 * 사용자의 Google provider_token 가져오기
 */
export async function getGoogleProviderToken(
  userId: string,
): Promise<{ token: string | null; error: string | null }> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !supabaseServiceKey) {
    return {
      token: null,
      error: "Server configuration error: missing Supabase credentials",
    };
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  // identities 테이블에서 provider_token 조회
  const { data, error } = await supabase.auth.admin.getUserById(userId);

  if (error || !data) {
    console.error("[Google Calendar] Failed to get user:", error);
    return { token: null, error: "Failed to get user data" };
  }

  // Google identity 찾기
  const googleIdentity = data.user.identities?.find(
    (identity) => identity.provider === "google",
  );

  if (!googleIdentity) {
    return { token: null, error: "Google account not connected" };
  }

  // provider_token은 identity metadata에 없을 수 있으므로 session에서 가져와야 함
  // Supabase Auth의 제한으로 인해 클라이언트에서 전달받아야 함
  return { token: null, error: "Provider token must be sent from client" };
}

/**
 * Google Calendar API 호출 헬퍼
 */
async function callGoogleCalendarAPI(
  endpoint: string,
  method: string,
  accessToken: string,
  body?: unknown,
) {
  const url = `${GOOGLE_CALENDAR_API}${endpoint}`;
  const headers: HeadersInit = {
    Authorization: `Bearer ${accessToken}`,
    "Content-Type": "application/json",
  };

  const options: RequestInit = {
    method,
    headers,
  };

  if (body) {
    options.body = JSON.stringify(body);
    console.log(`[Google Calendar API] ${method} ${endpoint} - Request body:`, JSON.stringify(body));
  }

  console.log(`[Google Calendar API] ${method} ${url}`);
  const response = await fetch(url, options);

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`[Google Calendar API] Error ${response.status}:`, errorText);
    console.error(`[Google Calendar API] Request was:`, {
      method,
      url,
      body: body ? JSON.stringify(body) : null,
    });
    throw new Error(
      `Google Calendar API error: ${response.status} ${errorText}`,
    );
  }

  // DELETE 또는 204 No Content는 body가 없을 수 있음
  if (method === "DELETE" || response.status === 204) {
    console.log(`[Google Calendar API] ${method} ${endpoint} - Success (No Content)`);
    return { success: true };
  }

  const result = await response.json();
  console.log(`[Google Calendar API] ${method} ${endpoint} - Success`);
  return result;
}

/**
 * 구글 캘린더 리스트 가져오기 (사용자가 가진 모든 캘린더)
 */
export async function getGoogleCalendarList(accessToken: string) {
  return await callGoogleCalendarAPI(
    `/users/me/calendarList`,
    "GET",
    accessToken,
  );
}

/**
 * 구글 캘린더 이벤트 목록 가져오기 (모든 캘린더에서)
 */
export async function getGoogleCalendarEvents(
  accessToken: string,
  timeMin?: string,
  timeMax?: string,
) {
  console.log('[Google Calendar] Fetching calendar list...');
  
  // 1. 먼저 모든 캘린더 목록 가져오기
  const calendarListResponse = await callGoogleCalendarAPI(
    `/users/me/calendarList`,
    "GET",
    accessToken,
  );
  
  const calendars = calendarListResponse.items || [];
  console.log('[Google Calendar] Found', calendars.length, 'calendars');
  
  // 2. 모든 캘린더에서 이벤트를 병렬로 가져오기
  const eventPromises = calendars.map(async (calendar) => {
    try {
      const params = new URLSearchParams({
        singleEvents: "true",
        orderBy: "startTime",
      });

      if (timeMin) params.append("timeMin", timeMin);
      if (timeMax) params.append("timeMax", timeMax);

      console.log(`[Google Calendar] Fetching events from calendar: ${calendar.summary} (${calendar.id})`);
      
      const eventsResponse = await callGoogleCalendarAPI(
        `/calendars/${encodeURIComponent(calendar.id)}/events?${params.toString()}`,
        "GET",
        accessToken,
      );
      
      // 각 이벤트에 캘린더 정보 추가
      const events = (eventsResponse.items || []).map((event: any) => ({
        ...event,
        calendarId: calendar.id,
        calendarSummary: calendar.summary,
        calendarBackgroundColor: calendar.backgroundColor,
        calendarForegroundColor: calendar.foregroundColor,
      }));
      
      console.log(`[Google Calendar] Found ${events.length} events in ${calendar.summary}`);
      return events;
    } catch (error) {
      console.error(`[Google Calendar] Failed to fetch events from ${calendar.summary}:`, error);
      return []; // 한 캘린더에서 실패해도 빈 배열 반환
    }
  });
  
  // 모든 Promise가 완료될 때까지 대기
  const eventArrays = await Promise.all(eventPromises);
  const allEvents = eventArrays.flat();
  
  console.log('[Google Calendar] Total events:', allEvents.length);
  
  return {
    items: allEvents,
    calendars: calendars,
  };
}

/**
 * 구글 캘린더에 이벤트 생성
 */
export async function createGoogleCalendarEvent(
  accessToken: string,
  calendarId: string,
  event: {
    summary: string;
    description?: string;
    start: { date?: string; dateTime?: string; timeZone?: string };
    end: { date?: string; dateTime?: string; timeZone?: string };
    recurrence?: string[];
    colorId?: string;
  },
) {
  console.log('[createGoogleCalendarEvent] Creating event in calendar:', calendarId);
  console.log('[createGoogleCalendarEvent] Event data:', JSON.stringify(event));
  
  return await callGoogleCalendarAPI(
    `/calendars/${encodeURIComponent(calendarId)}/events`,
    "POST",
    accessToken,
    event,
  );
}

/**
 * 구글 캘린더 이벤트 수정
 */
export async function updateGoogleCalendarEvent(
  accessToken: string,
  calendarId: string,
  eventId: string,
  event: {
    summary?: string;
    description?: string;
    start?: { date?: string; dateTime?: string; timeZone?: string };
    end?: { date?: string; dateTime?: string; timeZone?: string };
    recurrence?: string[];
    colorId?: string;
  },
) {
  return await callGoogleCalendarAPI(
    `/calendars/${encodeURIComponent(calendarId)}/events/${eventId}`,
    "PATCH",
    accessToken,
    event,
  );
}

/**
 * 구글 캘린더 이벤트 삭제
 */
export async function deleteGoogleCalendarEvent(
  accessToken: string,
  calendarId: string,
  eventId: string,
) {
  return await callGoogleCalendarAPI(
    `/calendars/${encodeURIComponent(calendarId)}/events/${eventId}`,
    "DELETE",
    accessToken,
  );
}

/**
 * 구글 캘린더 이벤트를 다른 캘린더로 이동
 */
export async function moveGoogleCalendarEvent(
  accessToken: string,
  sourceCalendarId: string,
  eventId: string,
  destinationCalendarId: string,
) {
  console.log('[moveGoogleCalendarEvent] Moving event:', eventId);
  console.log('[moveGoogleCalendarEvent] From calendar:', sourceCalendarId);
  console.log('[moveGoogleCalendarEvent] To calendar:', destinationCalendarId);
  
  return await callGoogleCalendarAPI(
    `/calendars/${encodeURIComponent(sourceCalendarId)}/events/${eventId}/move?destination=${encodeURIComponent(destinationCalendarId)}`,
    "POST",
    accessToken,
  );
}

/**
 * Calendary 이벤트를 Google Calendar 형식으로 변환
 */
export function convertToGoogleCalendarEvent(calendaryEvent: {
  title: string;
  description?: string;
  startDate: string;
  endDate?: string;
  startTime?: string;
  endTime?: string;
  isAllDay?: boolean;
  rrule?: string;
}) {
  console.log('[convertToGoogleCalendarEvent] Input:', JSON.stringify(calendaryEvent));
  
  const event: {
    summary: string;
    description?: string;
    start: { date?: string; dateTime?: string; timeZone?: string };
    end: { date?: string; dateTime?: string; timeZone?: string };
    recurrence?: string[];
  } = {
    summary: calendaryEvent.title,
    description: calendaryEvent.description || "",
    start: {},
    end: {},
  };

  // 종일 일정 vs 시간 지정 일정
  if (calendaryEvent.isAllDay) {
    event.start.date = calendaryEvent.startDate;
    event.end.date = calendaryEvent.endDate || calendaryEvent.startDate;
    console.log('[convertToGoogleCalendarEvent] All-day event:', event.start.date, '-', event.end.date);
  } else {
    // HH:mm 형식을 HH:mm:00으로 변환
    const formatTime = (time: string) => {
      if (!time) return "00:00:00";
      return time.includes(":") && time.split(":").length === 2 ? `${time}:00` : time;
    };
    
    const startDateTime = `${calendaryEvent.startDate}T${formatTime(calendaryEvent.startTime || "00:00")}`;
    const endDateTime = `${calendaryEvent.endDate || calendaryEvent.startDate}T${formatTime(calendaryEvent.endTime || "23:59")}`;

    event.start.dateTime = startDateTime;
    event.start.timeZone = "Asia/Seoul";
    event.end.dateTime = endDateTime;
    event.end.timeZone = "Asia/Seoul";
    
    console.log('[convertToGoogleCalendarEvent] Timed event:', startDateTime, '-', endDateTime);
  }

  // 반복 일정
  if (calendaryEvent.rrule) {
    event.recurrence = [calendaryEvent.rrule];
  }

  console.log('[convertToGoogleCalendarEvent] Output:', JSON.stringify(event));
  return event;
}

/**
 * Google Calendar 이벤트를 Calendary 형식으로 변환
 */
export function convertFromGoogleCalendarEvent(googleEvent: {
  id: string;
  summary: string;
  description?: string;
  start: { date?: string; dateTime?: string };
  end: { date?: string; dateTime?: string };
  recurrence?: string[];
}) {
  const isAllDay = !!googleEvent.start.date;

  let startDate: string;
  let endDate: string;
  let startTime: string | undefined;
  let endTime: string | undefined;

  if (isAllDay) {
    startDate = googleEvent.start.date!;
    endDate = googleEvent.end.date!;
  } else {
    const startDateTime = new Date(googleEvent.start.dateTime!);
    const endDateTime = new Date(googleEvent.end.dateTime!);

    startDate = startDateTime.toISOString().split("T")[0];
    endDate = endDateTime.toISOString().split("T")[0];
    startTime = startDateTime.toTimeString().slice(0, 5);
    endTime = endDateTime.toTimeString().slice(0, 5);
  }

  return {
    googleCalendarId: googleEvent.id,
    title: googleEvent.summary,
    description: googleEvent.description || "",
    startDate,
    endDate: startDate !== endDate ? endDate : undefined,
    startTime,
    endTime,
    isAllDay,
    rrule: googleEvent.recurrence?.[0],
  };
}