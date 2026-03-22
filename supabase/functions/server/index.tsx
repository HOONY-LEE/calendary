import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import * as kv from "./kv_store.tsx";
import { createClient } from "npm:@supabase/supabase-js@2";
import * as googleCalendar from "./google-calendar.tsx";
import * as googleTasks from "./google-tasks.tsx";

// Calendary Event Management API - v2.2
const app = new Hono();

// Enable logger
app.use('*', logger(console.log));

// Enable CORS for all routes and methods
app.use(
  "/*",
  cors({
    origin: "*",
    allowHeaders: ["Content-Type", "Authorization", "X-User-JWT", "X-Google-Access-Token", "x-google-access-token"],
    allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    exposeHeaders: ["Content-Length", "Content-Type"],
    maxAge: 600,
    credentials: true,
  }),
);

// JWT 인증 및 Supabase 클라이언트 생성 헬퍼
async function authenticateAndGetClient(authHeader: string | undefined, userJWT: string | undefined) {
  console.log('[Auth] authenticateAndGetClient called');
  console.log('[Auth] Auth header present:', !!authHeader);
  console.log('[Auth] User JWT header present:', !!userJWT);
  
  // X-User-JWT 헤더에서 JWT 가져오기 (우선순위)
  const token = userJWT || (authHeader ? authHeader.replace('Bearer ', '') : null);
  
  if (!token) {
    console.error('[Auth] No JWT token provided');
    return { error: 'No authorization token', client: null, user: null };
  }
  
  console.log('[Auth] Token extracted (first 30 chars):', token.substring(0, 30) + '...');
  console.log('[Auth] Token length:', token.length);
  
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
  
  if (!supabaseUrl || !supabaseServiceKey || !supabaseAnonKey) {
    console.error('[Auth] Missing environment variables!');
    console.error('[Auth] SUPABASE_URL present:', !!supabaseUrl);
    console.error('[Auth] SUPABASE_SERVICE_ROLE_KEY present:', !!supabaseServiceKey);
    console.error('[Auth] SUPABASE_ANON_KEY present:', !!supabaseAnonKey);
    return { error: 'Server configuration error', client: null, user: null };
  }
  
  // 🔥 ANON_KEY로 클라이언트 생성하여 JWT 검증
  const userClient = createClient(supabaseUrl, supabaseAnonKey);
  
  console.log('[Auth] Attempting to verify JWT...');
  
  try {
    // 🔥 토큰을 직접 전달하여 사용자 정보 가져오기
    const { data: { user }, error } = await userClient.auth.getUser(token);
    
    if (error || !user) {
      console.error('[Auth] Failed to verify JWT');
      console.error('[Auth] Error message:', error?.message);
      console.error('[Auth] Error code:', error?.code);
      console.error('[Auth] Error status:', error?.status);
      console.error('[Auth] Full error:', JSON.stringify(error, null, 2));
      
      // 🔥 사용자가 존재하지 않는 경우 명확한 에러 메시지 반환
      if (error?.code === 'user_not_found' || error?.message?.includes('does not exist')) {
        return { 
          error: 'User from sub claim in JWT does not exist', 
          client: null, 
          user: null 
        };
      }
      
      return { error: error?.message || 'Invalid token', client: null, user: null };
    }
    
    console.log('[Auth] ✅ User verified successfully:', user.id, user.email);
    
    return { error: null, client: userClient, user };
  } catch (err) {
    console.error('[Auth] Exception during JWT verification:', err);
    console.error('[Auth] Exception message:', err.message);
    console.error('[Auth] Exception stack:', err.stack);
    return { error: 'Authentication failed', client: null, user: null };
  }
}

// Health check endpoint
app.get("/make-server-f973dbc1/health", (c) => {
  return c.json({ 
    status: "ok",
    version: "2.2.0",
    timestamp: new Date().toISOString(),
    cors_updated: true,
  });
});

// ==================== 인증 API ====================

// 회원���입 엔드포인트 (이메일 인증 자동 처리)
app.post("/make-server-f973dbc1/auth/signup", async (c) => {
  console.log('[POST /auth/signup] Request received');
  
  try {
    const body = await c.req.json();
    const { email, password, name } = body;
    
    if (!email || !password || !name) {
      console.error('[POST /auth/signup] Missing required fields');
      return c.json({ error: 'Missing required fields: email, password, name' }, 400);
    }
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('[POST /auth/signup] Missing environment variables');
      return c.json({ error: 'Server configuration error' }, 500);
    }
    
    // Service Role Key로 관리자 클라이언트 생성
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    console.log('[POST /auth/signup] Creating user with email:', email);
    
    // 관리자 API로 사용자 생성 (이메일 인증 자동 완료)
    // 🔥 DB 트리거가 자동으로 기본 카테고리 3개 생성
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      user_metadata: { name },
      email_confirm: true, // 이메일 인증 자동 완료
    });
    
    if (error) {
      console.error('[POST /auth/signup] Signup error:', error);
      console.error('[POST /auth/signup] Error name:', error.name);
      console.error('[POST /auth/signup] Error status:', error.status);
      console.error('[POST /auth/signup] Error code:', error.code);
      console.error('[POST /auth/signup] Full error object:', JSON.stringify(error, null, 2));
      return c.json({ error: error.message }, 400);
    }
    
    console.log('[POST /auth/signup] Success - User created:', data.user?.id, data.user?.email);
    console.log('[POST /auth/signup] Default categories will be created automatically by DB trigger');
    
    return c.json({ 
      user: data.user,
      needsEmailConfirmation: false // 이메일 인증이 자동으로 완료됨
    });
  } catch (error) {
    console.error('[POST /auth/signup] Unexpected error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// 이메일 확인 처리 엔드포인 (이미 가입된 계정 이메일 인증)
app.post("/make-server-f973dbc1/auth/confirm-email", async (c) => {
  console.log('[POST /auth/confirm-email] Request received');
  
  try {
    const body = await c.req.json();
    const { email } = body;
    
    if (!email) {
      console.error('[POST /auth/confirm-email] Missing email');
      return c.json({ error: 'Missing email' }, 400);
    }
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('[POST /auth/confirm-email] Missing environment variables');
      return c.json({ error: 'Server configuration error' }, 500);
    }
    
    // Service Role Key로 관리자 클라이언트 생성
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    console.log('[POST /auth/confirm-email] Confirming email for:', email);
    
    // 이메일로 사용자 찾기
    const { data: users, error: listError } = await supabase.auth.admin.listUsers();
    
    if (listError) {
      console.error('[POST /auth/confirm-email] Error listing users:', listError);
      return c.json({ error: listError.message }, 500);
    }
    
    const user = users.users.find(u => u.email === email);
    
    if (!user) {
      console.error('[POST /auth/confirm-email] User not found');
      return c.json({ error: 'User not found' }, 404);
    }
    
    // 이메일 확인 처리
    const { data, error } = await supabase.auth.admin.updateUserById(
      user.id,
      { email_confirm: true }
    );
    
    if (error) {
      console.error('[POST /auth/confirm-email] Error confirming email:', error);
      return c.json({ error: error.message }, 500);
    }
    
    console.log('[POST /auth/confirm-email] Success - Email confirmed for user:', user.id);
    
    return c.json({ 
      success: true,
      message: 'Email confirmed successfully'
    });
  } catch (error) {
    console.error('[POST /auth/confirm-email] Unexpected error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// ==================== 이벤트 API ====================

// 이벤트 목록 조회
app.get("/make-server-f973dbc1/events", async (c) => {
  console.log('[GET /events] Request received');
  
  const authHeader = c.req.header('Authorization');
  const userJWT = c.req.header('X-User-JWT');
  const { error: authError, client, user } = await authenticateAndGetClient(authHeader, userJWT);
  
  if (authError || !client || !user) {
    return c.json({ error: authError || 'Unauthorized' }, 401);
  }
  
  try {
    console.log('[GET /events] Fetching events for user:', user.id);
    
    // 🔥 SERVICE_ROLE_KEY로 서버 클라이언트 생성 (RLS 우회)
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const serverClient = createClient(supabaseUrl!, supabaseServiceKey!);
    
    // 🔥 현재 사용자의 이벤트만 조회
    const { data: events, error } = await serverClient
      .from('events')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('[GET /events] Database error:', error);
      console.error('[GET /events] Error code:', error.code);
      console.error('[GET /events] Error message:', error.message);
      return c.json({ error: error.message }, 500);
    }
    
    console.log('[GET /events] Success - Retrieved', events?.length || 0, 'events for user', user.id);
    return c.json({ events: events || [] });
  } catch (error) {
    console.error('[GET /events] Unexpected error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// 이벤트 생성
app.post("/make-server-f973dbc1/events", async (c) => {
  console.log('[POST /events] Request received');
  
  const authHeader = c.req.header('Authorization');
  const userJWT = c.req.header('X-User-JWT');
  const { error: authError, client, user } = await authenticateAndGetClient(authHeader, userJWT);
  
  if (authError || !client || !user) {
    return c.json({ error: authError || 'Unauthorized' }, 401);
  }
  
  try {
    const body = await c.req.json();
    console.log('[POST /events] Request body:', body);
    
    const { summary, description, start_time, end_time, rrule } = body;
    
    if (!summary || !start_time || !end_time) {
      console.error('[POST /events] Missing required fields');
      return c.json({ error: 'Missing required fields: summary, start_time, end_time' }, 400);
    }
    
    // RLS가 자동으로 user_id를 설정함
    const insertData: any = {
      summary,
      start_time,
      end_time,
    };
    
    // 선택적 필드들
    if (description) {
      insertData.description = description;
    }
    
    // rrule이 있으면 추가 (컬럼이 존재하는 경우에만)
    if (rrule) {
      insertData.rrule = rrule;
    }
    
    const { data: event, error } = await client
      .from('events')
      .insert(insertData)
      .select()
      .single();
    
    if (error) {
      console.error('[POST /events] Database error:', error);
      return c.json({ error: error.message }, 500);
    }
    
    console.log('[POST /events] Success - Created event:', event?.id);
    return c.json({ event });
  } catch (error) {
    console.error('[POST /events] Unexpected error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// 이벤트 수정
app.put("/make-server-f973dbc1/events/:id", async (c) => {
  const eventId = c.req.param('id');
  console.log('[PUT /events] Request received for event:', eventId);
  
  const authHeader = c.req.header('Authorization');
  const userJWT = c.req.header('X-User-JWT');
  const { error: authError, client, user } = await authenticateAndGetClient(authHeader, userJWT);
  
  if (authError || !client || !user) {
    return c.json({ error: authError || 'Unauthorized' }, 401);
  }
  
  try {
    const body = await c.req.json();
    console.log('[PUT /events] Request body:', body);
    
    const { summary, description, start_time, end_time, rrule } = body;
    
    // 업데이트할 데이터 구성
    const updateData: any = {
      summary,
      start_time,
      end_time,
    };
    
    // 선택적 필드들
    if (description) {
      updateData.description = description;
    }
    
    // rrule이 있으면 추가 (컬럼이 존재하는 경우에만)
    if (rrule !== undefined) {
      updateData.rrule = rrule;
    }
    
    // RLS가 user_id 확인을 자동으로 처리
    const { data: event, error } = await client
      .from('events')
      .update(updateData)
      .eq('id', eventId)
      .select()
      .single();
    
    if (error) {
      console.error('[PUT /events] Database error:', error);
      return c.json({ error: error.message }, 500);
    }
    
    console.log('[PUT /events] Success - Updated event:', event?.id);
    return c.json({ event });
  } catch (error) {
    console.error('[PUT /events] Unexpected error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// 이벤트 삭제
app.delete("/make-server-f973dbc1/events/:id", async (c) => {
  const eventId = c.req.param('id');
  console.log('[DELETE /events] Request received for event:', eventId);
  
  const authHeader = c.req.header('Authorization');
  const userJWT = c.req.header('X-User-JWT');
  const { error: authError, client, user } = await authenticateAndGetClient(authHeader, userJWT);
  
  if (authError || !client || !user) {
    return c.json({ error: authError || 'Unauthorized' }, 401);
  }
  
  try {
    // RLS가 user_id 확인을 자동으로 처리
    const { error } = await client
      .from('events')
      .delete()
      .eq('id', eventId);
    
    if (error) {
      console.error('[DELETE /events] Database error:', error);
      return c.json({ error: error.message }, 500);
    }
    
    console.log('[DELETE /events] Success - Deleted event:', eventId);
    return c.json({ success: true });
  } catch (error) {
    console.error('[DELETE /events] Unexpected error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// ==================== 구글 캘린더 연동 API ====================

// 구글 캘린더 이벤트 목록 가져오기
app.get("/make-server-f973dbc1/google-calendar/events", async (c) => {
  console.log('[GET /google-calendar/events] Request received');
  
  const authHeader = c.req.header('Authorization');
  const userJWT = c.req.header('X-User-JWT');
  const { error: authError, client, user } = await authenticateAndGetClient(authHeader, userJWT);
  
  if (authError || !client || !user) {
    console.error('[GET /google-calendar/events] Authentication failed:', authError);
    return c.json({ error: authError || 'Unauthorized' }, 401);
  }
  
  console.log('[GET /google-calendar/events] User authenticated:', user.id, user.email);
  
  try {
    const timeMin = c.req.query('timeMin');
    const timeMax = c.req.query('timeMax');
    const forceRefresh = c.req.query('forceRefresh') === 'true';
    
    // 캐시 키 생성
    const cacheKey = `google_calendar_cache:${user.id}:${timeMin || 'all'}:${timeMax || 'all'}`;
    
    // 캐시 확인 (강제 새로고침이 아닌 경우)
    if (!forceRefresh) {
      console.log('[GET /google-calendar/events] Checking cache...');
      const cachedData = await kv.get(cacheKey);
      
      if (cachedData) {
        const cache = JSON.parse(cachedData);
        const cacheAge = Date.now() - cache.timestamp;
        const cacheTTL = 5 * 60 * 1000; // 5분
        
        if (cacheAge < cacheTTL) {
          console.log('[GET /google-calendar/events] Cache hit! Age:', Math.round(cacheAge / 1000), 'seconds');
          return c.json({
            events: cache.events || [],
            calendars: cache.calendars || [],
            cached: true,
            cacheAge: Math.round(cacheAge / 1000)
          });
        } else {
          console.log('[GET /google-calendar/events] Cache expired');
        }
      } else {
        console.log('[GET /google-calendar/events] Cache miss');
      }
    } else {
      console.log('[GET /google-calendar/events] Force refresh requested');
    }
    
    // X-Google-Access-Token 헤더에서 Google access token 가져오기
    const googleAccessToken = c.req.header('X-Google-Access-Token');
    
    if (!googleAccessToken) {
      console.error('[GET /google-calendar/events] Missing Google access token');
      return c.json({ error: 'Google access token not provided' }, 400);
    }
    
    console.log('[GET /google-calendar/events] Google token exists (first 30 chars):', googleAccessToken.substring(0, 30) + '...');
    console.log('[GET /google-calendar/events] Calling Google Calendar API...');
    
    const result = await googleCalendar.getGoogleCalendarEvents(
      googleAccessToken,
      timeMin,
      timeMax
    );
    
    console.log('[GET /google-calendar/events] Success - Retrieved', result.items?.length || 0, 'events');
    console.log('[GET /google-calendar/events] Found', result.calendars?.length || 0, 'calendars');
    
    // 캐시에 저장
    const cacheData = {
      events: result.items || [],
      calendars: result.calendars || [],
      timestamp: Date.now()
    };
    await kv.set(cacheKey, JSON.stringify(cacheData));
    console.log('[GET /google-calendar/events] Data cached with key:', cacheKey);
    
    return c.json({ 
      events: result.items || [], 
      calendars: result.calendars || [],
      cached: false
    });
  } catch (error) {
    console.error('[GET /google-calendar/events] Error:', error);
    console.error('[GET /google-calendar/events] Error details:', JSON.stringify(error, null, 2));
    return c.json({ error: error.message || 'Failed to fetch Google Calendar events' }, 500);
  }
});

// 구글 캘린더에 이벤트 생성
app.post("/make-server-f973dbc1/google-calendar/events/:calendarId", async (c) => {
  const calendarId = c.req.param('calendarId');
  console.log('[POST /google-calendar/events] Request received for calendar:', calendarId);
  
  const authHeader = c.req.header('Authorization');
  const userJWT = c.req.header('X-User-JWT');
  const { error: authError, client, user } = await authenticateAndGetClient(authHeader, userJWT);
  
  if (authError || !client || !user) {
    return c.json({ error: authError || 'Unauthorized' }, 401);
  }
  
  try {
    const googleAccessToken = c.req.header('X-Google-Access-Token');
    
    if (!googleAccessToken) {
      return c.json({ error: 'Google access token not provided' }, 400);
    }
    
    const body = await c.req.json();
    console.log('[POST /google-calendar/events] Request body:', JSON.stringify(body));
    
    const event = googleCalendar.convertToGoogleCalendarEvent(body);
    console.log('[POST /google-calendar/events] Converted event:', JSON.stringify(event));
    
    const result = await googleCalendar.createGoogleCalendarEvent(
      googleAccessToken,
      calendarId,
      event
    );
    
    // 캐시 무효화 - prefix로 시작하는 모든 키 삭제
    try {
      const supabaseUrl = Deno.env.get('SUPABASE_URL');
      const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
      const supabase = createClient(supabaseUrl, supabaseServiceKey);
      
      const prefix = `google_calendar_cache:${user.id}:`;
      const { data: cacheRows } = await supabase
        .from('kv_store_f973dbc1')
        .select('key')
        .like('key', `${prefix}%`);
      
      if (cacheRows && cacheRows.length > 0) {
        const keys = cacheRows.map(row => row.key);
        await kv.mdel(keys);
        console.log('[POST /google-calendar/events] Cache invalidated:', keys.length, 'keys');
      }
    } catch (cacheError) {
      console.warn('[POST /google-calendar/events] Cache invalidation failed:', cacheError);
      // 캐시 삭제 실패는 무시하고 계속 진행
    }
    
    console.log('[POST /google-calendar/events] Success - Created event:', result.id);
    return c.json(result);
  } catch (error) {
    console.error('[POST /google-calendar/events] Error:', error);
    console.error('[POST /google-calendar/events] Error stack:', error.stack);
    return c.json({ error: error.message || 'Failed to create Google Calendar event' }, 500);
  }
});

// 구글 캘린더 이벤트 수정
app.patch("/make-server-f973dbc1/google-calendar/events/:calendarId/:eventId", async (c) => {
  const calendarId = c.req.param('calendarId');
  const eventId = c.req.param('eventId');
  console.log('[PATCH /google-calendar/events] Request received for event:', eventId, 'in calendar:', calendarId);
  
  const authHeader = c.req.header('Authorization');
  const userJWT = c.req.header('X-User-JWT');
  const { error: authError, client, user } = await authenticateAndGetClient(authHeader, userJWT);
  
  if (authError || !client || !user) {
    return c.json({ error: authError || 'Unauthorized' }, 401);
  }
  
  try {
    const googleAccessToken = c.req.header('X-Google-Access-Token');
    
    if (!googleAccessToken) {
      return c.json({ error: 'Google access token not provided' }, 400);
    }
    
    const body = await c.req.json();
    console.log('[PATCH /google-calendar/events] Request body:', JSON.stringify(body));
    
    const event = googleCalendar.convertToGoogleCalendarEvent(body);
    console.log('[PATCH /google-calendar/events] Converted event:', JSON.stringify(event));
    
    const result = await googleCalendar.updateGoogleCalendarEvent(
      googleAccessToken,
      calendarId,
      eventId,
      event
    );
    
    console.log('[PATCH /google-calendar/events] Success - Updated event:', result.id);

    // 🔥 캐시 무효화를 응답 후 비동기 실행 (응답 속도 개선)
    const userId = user.id;
    queueMicrotask(async () => {
      try {
        const supabaseUrl = Deno.env.get('SUPABASE_URL');
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
        const supabase = createClient(supabaseUrl, supabaseServiceKey);
        const prefix = `google_calendar_cache:${userId}:`;
        const { data: cacheRows } = await supabase.from('kv_store_f973dbc1').select('key').like('key', `${prefix}%`);
        if (cacheRows && cacheRows.length > 0) {
          await kv.mdel(cacheRows.map(row => row.key));
        }
      } catch (e) {
        console.warn('[PATCH] Cache invalidation failed:', e);
      }
    });

    return c.json({ event: result });
  } catch (error) {
    console.error('[PATCH /google-calendar/events] Error:', error);
    console.error('[PATCH /google-calendar/events] Error message:', error.message);
    console.error('[PATCH /google-calendar/events] Error stack:', error.stack);
    return c.json({ error: error.message || 'Failed to update Google Calendar event' }, 500);
  }
});

// 구글 캘린더 이벤트 삭제
app.delete("/make-server-f973dbc1/google-calendar/events/:calendarId/:eventId", async (c) => {
  const calendarId = c.req.param('calendarId');
  const eventId = c.req.param('eventId');
  console.log('[DELETE /google-calendar/events] Request received for event:', eventId, 'in calendar:', calendarId);
  
  const authHeader = c.req.header('Authorization');
  const userJWT = c.req.header('X-User-JWT');
  const { error: authError, client, user } = await authenticateAndGetClient(authHeader, userJWT);
  
  if (authError || !client || !user) {
    return c.json({ error: authError || 'Unauthorized' }, 401);
  }
  
  try {
    const googleAccessToken = c.req.header('X-Google-Access-Token');
    
    if (!googleAccessToken) {
      return c.json({ error: 'Google access token not provided' }, 400);
    }
    
    await googleCalendar.deleteGoogleCalendarEvent(googleAccessToken, calendarId, eventId);
    
    console.log('[DELETE /google-calendar/events] Success - Deleted event:', eventId);

    // 🔥 캐시 무효화를 응답 후 비동기 실행 (응답 속도 개선)
    const userId = user.id;
    queueMicrotask(async () => {
      try {
        const supabaseUrl = Deno.env.get('SUPABASE_URL');
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
        const supabase = createClient(supabaseUrl, supabaseServiceKey);
        const prefix = `google_calendar_cache:${userId}:`;
        const { data: cacheRows } = await supabase.from('kv_store_f973dbc1').select('key').like('key', `${prefix}%`);
        if (cacheRows && cacheRows.length > 0) {
          await kv.mdel(cacheRows.map(row => row.key));
        }
      } catch (e) {
        console.warn('[DELETE] Cache invalidation failed:', e);
      }
    });

    return c.json({ success: true });
  } catch (error) {
    console.error('[DELETE /google-calendar/events] Error:', error);
    return c.json({ error: error.message || 'Failed to delete Google Calendar event' }, 500);
  }
});

// 구글 캘린더 이벤트를 다른 캘린더로 이동
app.post("/make-server-f973dbc1/google-calendar/events/:sourceCalendarId/:eventId/move", async (c) => {
  const sourceCalendarId = c.req.param('sourceCalendarId');
  const eventId = c.req.param('eventId');
  console.log('[POST /google-calendar/events/move] Request received for event:', eventId, 'from calendar:', sourceCalendarId);
  
  const authHeader = c.req.header('Authorization');
  const userJWT = c.req.header('X-User-JWT');
  const { error: authError, client, user } = await authenticateAndGetClient(authHeader, userJWT);
  
  if (authError || !client || !user) {
    return c.json({ error: authError || 'Unauthorized' }, 401);
  }
  
  try {
    const googleAccessToken = c.req.header('X-Google-Access-Token');
    
    if (!googleAccessToken) {
      return c.json({ error: 'Google access token not provided' }, 400);
    }
    
    const body = await c.req.json();
    const { destinationCalendarId, eventData } = body;
    
    if (!destinationCalendarId) {
      return c.json({ error: 'Missing destinationCalendarId' }, 400);
    }
    
    console.log('[POST /google-calendar/events/move] Moving to calendar:', destinationCalendarId);
    
    // Google Calendar API의 move 메서드 사용
    const movedEvent = await googleCalendar.moveGoogleCalendarEvent(
      googleAccessToken,
      sourceCalendarId,
      eventId,
      destinationCalendarId
    );
    
    // 이동 후 이벤트 데이터가 있다면 업데이트 (제목, 시간 등)
    if (eventData) {
      console.log('[POST /google-calendar/events/move] Updating moved event with new data');
      const event = googleCalendar.convertToGoogleCalendarEvent(eventData);
      
      const updatedEvent = await googleCalendar.updateGoogleCalendarEvent(
        googleAccessToken,
        destinationCalendarId,
        eventId,
        event
      );
      
      console.log('[POST /google-calendar/events/move] Success - Moved and updated event:', updatedEvent.id);
      return c.json({ event: updatedEvent });
    }
    
    console.log('[POST /google-calendar/events/move] Success - Moved event:', movedEvent.id);
    return c.json({ event: movedEvent });
  } catch (error) {
    console.error('[POST /google-calendar/events/move] Error:', error);
    console.error('[POST /google-calendar/events/move] Error message:', error.message);
    console.error('[POST /google-calendar/events/move] Error stack:', error.stack);
    return c.json({ error: error.message || 'Failed to move Google Calendar event' }, 500);
  }
});

// 🔥 구글 캘린더 데이터 마이그레이션 (일회성) - Updated schema to use 'summary' instead of 'title'
app.post("/make-server-f973dbc1/google-calendar/migrate", async (c) => {
  console.log('[POST /google-calendar/migrate] ✨ Migration request received (v2 - summary field)');
  
  const authHeader = c.req.header('Authorization');
  const userJWT = c.req.header('X-User-JWT');
  const { error: authError, client, user } = await authenticateAndGetClient(authHeader, userJWT);
  
  if (authError || !client || !user) {
    console.error('[POST /google-calendar/migrate] Authentication failed:', authError);
    return c.json({ error: authError || 'Unauthorized' }, 401);
  }
  
  console.log('[POST /google-calendar/migrate] User authenticated:', user.id, user.email);
  
  try {
    const googleAccessToken = c.req.header('X-Google-Access-Token');
    
    if (!googleAccessToken) {
      console.error('[POST /google-calendar/migrate] No Google access token');
      return c.json({ error: 'Google access token not provided' }, 400);
    }
    
    console.log('[POST /google-calendar/migrate] 🔄 Starting migration for user:', user.id);
    console.log('[POST /google-calendar/migrate] Google access token (first 30 chars):', googleAccessToken.substring(0, 30) + '...');
    
    // 🔥 토큰 스코프 확인
    try {
      const tokenInfoResponse = await fetch(
        `https://www.googleapis.com/oauth2/v1/tokeninfo?access_token=${googleAccessToken}`
      );
      const tokenInfo = await tokenInfoResponse.json();
      console.log('[POST /google-calendar/migrate] 🔑 Token info:', JSON.stringify(tokenInfo, null, 2));
      
      const scopes = tokenInfo.scope ? tokenInfo.scope.split(' ') : [];
      const hasCalendarScope = scopes.some((s: string) => s === 'https://www.googleapis.com/auth/calendar');
      const hasTasksScope = scopes.some((s: string) => s === 'https://www.googleapis.com/auth/tasks');
      
      console.log('[POST /google-calendar/migrate] Has calendar scope:', hasCalendarScope);
      console.log('[POST /google-calendar/migrate] Has tasks scope:', hasTasksScope);
      
      if (!hasCalendarScope) {
        console.error('[POST /google-calendar/migrate] ❌ Missing calendar scope!');
        return c.json({ error: 'Missing required calendar scope. Please reconnect with proper permissions.' }, 403);
      }
      
      if (!hasTasksScope) {
        console.warn('[POST /google-calendar/migrate] ⚠️ Missing tasks scope, will skip tasks migration');
      }
    } catch (scopeError) {
      console.error('[POST /google-calendar/migrate] Failed to check token scopes:', scopeError);
    }
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // 1. 구글 캘린더 이벤트 가져오기
    console.log('[POST /google-calendar/migrate] Fetching Google Calendar events...');
    const timeMin = new Date();
    timeMin.setMonth(timeMin.getMonth() - 6); // 최근 6개월
    const timeMax = new Date();
    timeMax.setMonth(timeMax.getMonth() + 6); // 앞으로 6개월
    
    const { items: googleEvents, calendars } = await googleCalendar.getGoogleCalendarEvents(
      googleAccessToken,
      timeMin.toISOString(),
      timeMax.toISOString()
    );
    
    console.log('[POST /google-calendar/migrate] Found', googleEvents?.length || 0, 'Google Calendar events');
    console.log('[POST /google-calendar/migrate] Found', calendars?.length || 0, 'Google Calendars');
    
    // 1.5. 구글 캘린더를 카테고리로 생성 (캘린더 → 카테고리 매핑)
    const calendarToCategoryMap = new Map<string, string>(); // calendarId -> categoryId
    
    if (calendars && calendars.length > 0) {
      console.log('[POST /google-calendar/migrate] Creating categories from Google Calendars...');
      
      for (const calendar of calendars) {
        try {
          const calendarId = calendar.id;
          const calendarName = calendar.summary || 'Untitled Calendar';
          const calendarColor = calendar.backgroundColor || '#3B82F6'; // 기본 파란색
          
          console.log(`[POST /google-calendar/migrate] Processing calendar: ${calendarName} (${calendarId})`);
          
          // 이미 이 구글 캘린더로부터 생성된 카테고리가 있는지 확인
          // (google_calendar_id 컬럼이 있다면 사용, 없다면 이름으로 중복 확인)
          const { data: existingCategory, error: checkError } = await supabase
            .from('categories')
            .select('id, name, color')
            .eq('user_id', user.id)
            .eq('name', calendarName)
            .maybeSingle();
          
          if (checkError) {
            console.error('[POST /google-calendar/migrate] Error checking existing category:', checkError);
          }
          
          if (existingCategory) {
            console.log(`[POST /google-calendar/migrate] ✅ Category already exists: ${calendarName} (${existingCategory.id})`);
            calendarToCategoryMap.set(calendarId, existingCategory.id);
          } else {
            // 새 카테고리 생성
            const { data: newCategory, error: insertError } = await supabase
              .from('categories')
              .insert({
                user_id: user.id,
                name: calendarName,
                color: calendarColor,
                type: ['event'], // 이벤트용 카테고리
                is_default: false,
                order_index: 999, // 마지막에 추가
              })
              .select()
              .single();
            
            if (insertError) {
              console.error('[POST /google-calendar/migrate] Failed to create category:', insertError);
            } else if (newCategory) {
              console.log(`[POST /google-calendar/migrate] ✅ Created category: ${calendarName} (${newCategory.id})`);
              calendarToCategoryMap.set(calendarId, newCategory.id);
            }
          }
        } catch (calendarError) {
          console.error('[POST /google-calendar/migrate] Error processing calendar:', calendarError);
        }
      }
      
      console.log(`[POST /google-calendar/migrate] ✅ Category mapping complete: ${calendarToCategoryMap.size} calendars mapped`);
    }
    
    // 2. 구글 Tasks 가져오기
    console.log('[POST /google-calendar/migrate] Fetching Google Tasks...');
    const { items: googleTasksData, taskLists } = await googleTasks.getGoogleTasks(
      googleAccessToken,
      timeMin.toISOString(),
      timeMax.toISOString()
    );
    
    console.log('[POST /google-calendar/migrate] Found', googleTasksData?.length || 0, 'Google Tasks');
    console.log('[POST /google-calendar/migrate] Found', taskLists?.length || 0, 'Google Task Lists');
    
    // 2.5. 구글 Task Lists를 카테고리로 생성 (Task List → 카테고리 매핑)
    const taskListToCategoryMap = new Map<string, string>(); // taskListId -> categoryId
    
    if (taskLists && taskLists.length > 0) {
      console.log('[POST /google-calendar/migrate] Creating categories from Google Task Lists...');
      
      for (const taskList of taskLists) {
        try {
          const taskListId = taskList.id;
          const taskListName = taskList.title || 'Untitled Task List';
          const taskListColor = '#10B981'; // 기본 초록색 (Task용)
          
          console.log(`[POST /google-calendar/migrate] Processing task list: ${taskListName} (${taskListId})`);
          
          // 이미 이 구글 Task List로부터 생성된 카테고리가 있는지 확인
          const { data: existingCategory, error: checkError } = await supabase
            .from('categories')
            .select('id, name, color')
            .eq('user_id', user.id)
            .eq('name', taskListName)
            .maybeSingle();
          
          if (checkError) {
            console.error('[POST /google-calendar/migrate] Error checking existing category:', checkError);
          }
          
          if (existingCategory) {
            console.log(`[POST /google-calendar/migrate] ✅ Category already exists: ${taskListName} (${existingCategory.id})`);
            taskListToCategoryMap.set(taskListId, existingCategory.id);
          } else {
            // 새 카테고리 생성
            const { data: newCategory, error: insertError } = await supabase
              .from('categories')
              .insert({
                user_id: user.id,
                name: taskListName,
                color: taskListColor,
                type: ['task'], // 태스크용 카테고리
                is_default: false,
                order_index: 999, // 마지막에 추가
              })
              .select()
              .single();
            
            if (insertError) {
              console.error('[POST /google-calendar/migrate] Failed to create category:', insertError);
            } else if (newCategory) {
              console.log(`[POST /google-calendar/migrate] ✅ Created category: ${taskListName} (${newCategory.id})`);
              taskListToCategoryMap.set(taskListId, newCategory.id);
            }
          }
        } catch (taskListError) {
          console.error('[POST /google-calendar/migrate] Error processing task list:', taskListError);
        }
      }
      
      console.log(`[POST /google-calendar/migrate] ✅ Task list mapping complete: ${taskListToCategoryMap.size} task lists mapped`);
    }
    
    // 3. 이벤트를 Supabase에 저장
    let eventsCount = 0;
    if (googleEvents && googleEvents.length > 0) {
      console.log('[POST /google-calendar/migrate] Migrating', googleEvents.length, 'events to database...');
      
      for (let i = 0; i < googleEvents.length; i++) {
        const event = googleEvents[i];
        try {
          // 진행 상황 로그
          console.log(`[POST /google-calendar/migrate] [${i + 1}/${googleEvents.length}] Processing: ${event.summary || 'Untitled'}`);
          console.log(`[POST /google-calendar/migrate] Event data:`, JSON.stringify(event.start));
          
          // 날짜 파싱 먼저
          const isAllDay = !event.start?.dateTime;
          let startDate, startDatetime, endDate, endDatetime;
          
          console.log(`[POST /google-calendar/migrate] Is all day:`, isAllDay);
          
          if (isAllDay) {
            startDate = event.start?.date;
            endDate = event.end?.date;
            console.log(`[POST /google-calendar/migrate] All-day: ${startDate} to ${endDate}`);
          } else {
            startDatetime = event.start?.dateTime;
            endDatetime = event.end?.dateTime;
            console.log(`[POST /google-calendar/migrate] Timed: ${startDatetime} to ${endDatetime}`);
          }
          
          if (!startDate && !startDatetime) {
            console.error(`[POST /google-calendar/migrate] No start date/datetime, skipping`);
            continue;
          }
          
          // 중복 확인
          console.log(`[POST /google-calendar/migrate] Checking for duplicates...`);
          const { data: existing, error: checkError } = await supabase
            .from('events')
            .select('id')
            .eq('user_id', user.id)
            .eq('summary', event.summary || 'Untitled')
            .eq(isAllDay ? 'start_date' : 'start_datetime', isAllDay ? startDate : startDatetime)
            .maybeSingle();
          
          if (checkError) {
            console.error('[POST /google-calendar/migrate] Duplicate check error:', checkError);
          }
          
          if (existing) {
            console.log('[POST /google-calendar/migrate] Duplicate exists, skipping');
            continue;
          }
          
          // 데이터 준비
          const insertData: any = {
            user_id: user.id,
            summary: event.summary || 'Untitled',
            description: event.description || '',
            is_all_day: isAllDay,
          };
          
          // 카테고리 ID 추가 (구글 캘린더 ID로 매핑)
          if (event.calendarId && calendarToCategoryMap.has(event.calendarId)) {
            insertData.category_id = calendarToCategoryMap.get(event.calendarId);
            console.log(`[POST /google-calendar/migrate] Assigning to category: ${insertData.category_id} (from calendar: ${event.calendarSummary})`);
          }
          
          if (isAllDay) {
            insertData.start_date = startDate;
            if (endDate) {
              insertData.end_date = endDate;
            }
          } else {
            insertData.start_datetime = startDatetime;
            if (endDatetime) {
              insertData.end_datetime = endDatetime;
            }
          }
          
          console.log(`[POST /google-calendar/migrate] Inserting:`, JSON.stringify(insertData));
          
          const { error: insertError } = await supabase
            .from('events')
            .insert(insertData);
          
          if (insertError) {
            console.error('[POST /google-calendar/migrate] Insert FAILED:', JSON.stringify(insertError));
          } else {
            eventsCount++;
            console.log(`[POST /google-calendar/migrate] ✅ Success! Total: ${eventsCount}`);
          }
        } catch (eventError) {
          console.error(`[POST /google-calendar/migrate] EXCEPTION in event ${i + 1}:`, eventError);
          console.error('[POST /google-calendar/migrate] Stack:', eventError.stack);
        }
      }
      
      console.log('[POST /google-calendar/migrate] ✅ Finished migrating events. Success:', eventsCount, '/', googleEvents.length);
    }
    
    // 4. 태스크를 Supabase에 저장
    let tasksCount = 0;
    if (googleTasksData && googleTasksData.length > 0) {
      console.log('[POST /google-calendar/migrate] Migrating', googleTasksData.length, 'tasks to database...');
      
      for (let i = 0; i < googleTasksData.length; i++) {
        const task = googleTasksData[i];
        try {
          // 진행 상황 로그 (매 10개마다)
          if (i % 10 === 0) {
            console.log(`[POST /google-calendar/migrate] Processing task ${i + 1}/${googleTasksData.length}`);
          }
          
          // due date 파싱 (RFC 3339 형식을 YYYY-MM-DD로 변환)
          let dueDate = null;
          if (task.due) {
            try {
              dueDate = new Date(task.due).toISOString().split('T')[0];
            } catch (e) {
              console.warn('[POST /google-calendar/migrate] Failed to parse due date:', task.due);
            }
          }
          
          // 이미 존재하는지 확인 (중복 방지)
          const { data: existing } = await supabase
            .from('tasks')
            .select('id')
            .eq('user_id', user.id)
            .eq('title', task.title || 'Untitled')
            .maybeSingle();
          
          if (existing) {
            console.log('[POST /google-calendar/migrate] Task already exists, skipping:', task.title);
            continue;
          }
          
          // 새 태스크 생성
          const insertData: any = {
            user_id: user.id,
            title: task.title || 'Untitled',
            description: task.notes || '',
            is_completed: task.status === 'completed',
            task_type: 'single',
          };
          
          // 카테고리 ID 추가 (구글 Task List ID로 매핑)
          if (task.taskListId && taskListToCategoryMap.has(task.taskListId)) {
            insertData.category_id = taskListToCategoryMap.get(task.taskListId);
            console.log(`[POST /google-calendar/migrate] Assigning task to category: ${insertData.category_id} (from list: ${task.taskListTitle})`);
          }
          
          if (dueDate) {
            insertData.due_date = dueDate;
          }
          
          const { error: insertError } = await supabase
            .from('tasks')
            .insert(insertData);
          
          if (insertError) {
            console.error('[POST /google-calendar/migrate] Failed to insert task:', insertError);
          } else {
            tasksCount++;
          }
        } catch (taskError) {
          console.error('[POST /google-calendar/migrate] Error migrating task:', taskError);
        }
      }
      
      console.log('[POST /google-calendar/migrate] ✅ Finished migrating tasks. Success:', tasksCount, '/', googleTasksData.length);
    }
    
    console.log('[POST /google-calendar/migrate] ✅ Migration complete!');
    console.log('[POST /google-calendar/migrate] Events migrated:', eventsCount);
    console.log('[POST /google-calendar/migrate] Tasks migrated:', tasksCount);
    console.log('[POST /google-calendar/migrate] Calendar categories created:', calendarToCategoryMap.size);
    console.log('[POST /google-calendar/migrate] Task list categories created:', taskListToCategoryMap.size);
    
    return c.json({
      success: true,
      eventsCount,
      tasksCount,
      categoriesCount: calendarToCategoryMap.size + taskListToCategoryMap.size,
      version: 'v3-with-categories',
      message: `Successfully migrated ${eventsCount} events and ${tasksCount} tasks with ${calendarToCategoryMap.size + taskListToCategoryMap.size} categories`,
    });
  } catch (error) {
    console.error('[POST /google-calendar/migrate] Migration error:', error);
    console.error('[POST /google-calendar/migrate] Error message:', error.message);
    console.error('[POST /google-calendar/migrate] Error stack:', error.stack);
    return c.json({ error: error.message || 'Migration failed' }, 500);
  }
});

// ==================== 구글 태스크 연동 API ====================

// 구글 태스크 목록 가져오기
app.get("/make-server-f973dbc1/google-tasks/tasks", async (c) => {
  console.log('[GET /google-tasks/tasks] Request received');
  
  const authHeader = c.req.header('Authorization');
  const userJWT = c.req.header('X-User-JWT');
  const { error: authError, client, user } = await authenticateAndGetClient(authHeader, userJWT);
  
  if (authError || !client || !user) {
    console.error('[GET /google-tasks/tasks] Authentication failed:', authError);
    return c.json({ error: authError || 'Unauthorized' }, 401);
  }
  
  console.log('[GET /google-tasks/tasks] User authenticated:', user.id, user.email);
  
  try {
    const timeMin = c.req.query('timeMin');
    const timeMax = c.req.query('timeMax');
    const forceRefresh = c.req.query('forceRefresh') === 'true';
    
    // 캐시 키 생성
    const cacheKey = `google_tasks_cache:${user.id}:${timeMin || 'all'}:${timeMax || 'all'}`;
    
    // 캐시 확인 (강제 새로고침이 아닌 경우)
    if (!forceRefresh) {
      console.log('[GET /google-tasks/tasks] Checking cache...');
      const cachedData = await kv.get(cacheKey);
      
      if (cachedData) {
        const cache = JSON.parse(cachedData);
        const cacheAge = Date.now() - cache.timestamp;
        const cacheTTL = 5 * 60 * 1000; // 5분
        
        if (cacheAge < cacheTTL) {
          console.log('[GET /google-tasks/tasks] Cache hit! Age:', Math.round(cacheAge / 1000), 'seconds');
          return c.json({
            tasks: cache.tasks || [],
            lists: cache.lists || [],
            cached: true,
            cacheAge: Math.round(cacheAge / 1000)
          });
        } else {
          console.log('[GET /google-tasks/tasks] Cache expired');
        }
      } else {
        console.log('[GET /google-tasks/tasks] Cache miss');
      }
    } else {
      console.log('[GET /google-tasks/tasks] Force refresh requested');
    }
    
    // X-Google-Access-Token 헤더에서 Google access token 가져오기
    const googleAccessToken = c.req.header('X-Google-Access-Token');
    
    if (!googleAccessToken) {
      console.error('[GET /google-tasks/tasks] Missing Google access token');
      return c.json({ error: 'Google access token not provided' }, 400);
    }
    
    console.log('[GET /google-tasks/tasks] Google token exists (first 30 chars):', googleAccessToken.substring(0, 30) + '...');
    console.log('[GET /google-tasks/tasks] Calling Google Tasks API...');
    
    const result = await googleTasks.getGoogleTasks(
      googleAccessToken,
      timeMin,
      timeMax
    );
    
    console.log('[GET /google-tasks/tasks] Success - Retrieved', result.items?.length || 0, 'tasks');
    console.log('[GET /google-tasks/tasks] Found', result.lists?.length || 0, 'lists');
    
    // 캐시에 저장
    const cacheData = {
      tasks: result.items || [],
      lists: result.lists || [],
      timestamp: Date.now()
    };
    await kv.set(cacheKey, JSON.stringify(cacheData));
    console.log('[GET /google-tasks/tasks] Data cached with key:', cacheKey);
    
    return c.json({ 
      tasks: result.items || [], 
      lists: result.lists || [],
      cached: false
    });
  } catch (error) {
    console.error('[GET /google-tasks/tasks] Error:', error);
    console.error('[GET /google-tasks/tasks] Error details:', JSON.stringify(error, null, 2));
    
    // 🔥 Google Tasks 권한 부족은 정상적인 상황 (기본 구글 로그인은 Tasks 권한 없음)
    if (error.message?.includes('403') || error.message?.includes('insufficient authentication scopes')) {
      console.log('[GET /google-tasks/tasks] ⚠️ Google Tasks permission not granted - returning empty result');
      return c.json({ 
        tasks: [], 
        lists: [],
        needsPermission: true,
        message: 'Google Tasks 권한이 필요합니다. 재인증해주세요.'
      });
    }
    
    return c.json({ error: error.message || 'Failed to fetch Google Tasks' }, 500);
  }
});

// 구글 태스크 생성
app.post("/make-server-f973dbc1/google-tasks/tasks/:listId", async (c) => {
  const listId = c.req.param('listId');
  console.log('[POST /google-tasks/tasks] Request received for list:', listId);
  
  const authHeader = c.req.header('Authorization');
  const userJWT = c.req.header('X-User-JWT');
  const { error: authError, client, user } = await authenticateAndGetClient(authHeader, userJWT);
  
  if (authError || !client || !user) {
    return c.json({ error: authError || 'Unauthorized' }, 401);
  }
  
  try {
    const googleAccessToken = c.req.header('X-Google-Access-Token');
    
    if (!googleAccessToken) {
      return c.json({ error: 'Google access token not provided' }, 400);
    }
    
    const body = await c.req.json();
    console.log('[POST /google-tasks/tasks] Request body:', JSON.stringify(body));
    
    const task = googleTasks.convertToGoogleTask(body);
    console.log('[POST /google-tasks/tasks] Converted task:', JSON.stringify(task));
    
    const result = await googleTasks.createGoogleTask(
      googleAccessToken,
      listId,
      task
    );
    
    // 캐시 무효화 - prefix로 시작하는 모든 키 삭제
    try {
      const supabaseUrl = Deno.env.get('SUPABASE_URL');
      const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
      const supabase = createClient(supabaseUrl, supabaseServiceKey);
      
      const prefix = `google_tasks_cache:${user.id}:`;
      const { data: cacheRows } = await supabase
        .from('kv_store_f973dbc1')
        .select('key')
        .like('key', `${prefix}%`);
      
      if (cacheRows && cacheRows.length > 0) {
        const keys = cacheRows.map(row => row.key);
        await kv.mdel(keys);
        console.log('[POST /google-tasks/tasks] Cache invalidated:', keys.length, 'keys');
      }
    } catch (cacheError) {
      console.warn('[POST /google-tasks/tasks] Cache invalidation failed:', cacheError);
      // 캐시 삭제 실패는 무시하고 계속 진행
    }
    
    console.log('[POST /google-tasks/tasks] Success - Created task:', result.id);
    return c.json(result);
  } catch (error) {
    console.error('[POST /google-tasks/tasks] Error:', error);
    console.error('[POST /google-tasks/tasks] Error stack:', error.stack);
    return c.json({ error: error.message || 'Failed to create Google Task' }, 500);
  }
});

// 구글 태스크 수정
app.patch("/make-server-f973dbc1/google-tasks/tasks/:listId/:taskId", async (c) => {
  const listId = c.req.param('listId');
  const taskId = c.req.param('taskId');
  console.log('[PATCH /google-tasks/tasks] Request received for task:', taskId, 'in list:', listId);
  
  const authHeader = c.req.header('Authorization');
  const userJWT = c.req.header('X-User-JWT');
  const { error: authError, client, user } = await authenticateAndGetClient(authHeader, userJWT);
  
  if (authError || !client || !user) {
    return c.json({ error: authError || 'Unauthorized' }, 401);
  }
  
  try {
    const googleAccessToken = c.req.header('X-Google-Access-Token');
    
    if (!googleAccessToken) {
      return c.json({ error: 'Google access token not provided' }, 400);
    }
    
    const body = await c.req.json();
    console.log('[PATCH /google-tasks/tasks] Request body:', JSON.stringify(body));
    
    // 🔥 undefined 필드 제거 - PATCH는 제공된 필드만 업데이트
    const updates: any = {};
    if (body.title !== undefined) updates.title = body.title;
    if (body.notes !== undefined) updates.notes = body.notes;
    if (body.status !== undefined) updates.status = body.status;
    if (body.due !== undefined) updates.due = body.due;
    
    console.log('[PATCH /google-tasks/tasks] Cleaned updates:', JSON.stringify(updates));
    
    const result = await googleTasks.updateGoogleTask(
      googleAccessToken,
      listId,
      taskId,
      updates
    );
    
    // 캐시 무효화
    try {
      const supabaseUrl = Deno.env.get('SUPABASE_URL');
      const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
      const supabase = createClient(supabaseUrl, supabaseServiceKey);
      
      const prefix = `google_tasks_cache:${user.id}:`;
      const { data: cacheRows } = await supabase
        .from('kv_store_f973dbc1')
        .select('key')
        .like('key', `${prefix}%`);
      
      if (cacheRows && cacheRows.length > 0) {
        const keys = cacheRows.map(row => row.key);
        await kv.mdel(keys);
        console.log('[PATCH /google-tasks/tasks] Cache invalidated:', keys.length, 'keys');
      }
    } catch (cacheError) {
      console.warn('[PATCH /google-tasks/tasks] Cache invalidation failed:', cacheError);
    }
    
    console.log('[PATCH /google-tasks/tasks] Success - Updated task:', result.id);
    return c.json({ task: result });
  } catch (error) {
    console.error('[PATCH /google-tasks/tasks] Error:', error);
    console.error('[PATCH /google-tasks/tasks] Error message:', error.message);
    console.error('[PATCH /google-tasks/tasks] Error stack:', error.stack);
    return c.json({ error: error.message || 'Failed to update Google Task' }, 500);
  }
});

// 구글 태스크 삭제
app.delete("/make-server-f973dbc1/google-tasks/tasks/:listId/:taskId", async (c) => {
  const listId = c.req.param('listId');
  const taskId = c.req.param('taskId');
  console.log('[DELETE /google-tasks/tasks] Request received for task:', taskId, 'in list:', listId);
  
  const authHeader = c.req.header('Authorization');
  const userJWT = c.req.header('X-User-JWT');
  const { error: authError, client, user } = await authenticateAndGetClient(authHeader, userJWT);
  
  if (authError || !client || !user) {
    return c.json({ error: authError || 'Unauthorized' }, 401);
  }
  
  try {
    const googleAccessToken = c.req.header('X-Google-Access-Token');
    
    if (!googleAccessToken) {
      return c.json({ error: 'Google access token not provided' }, 400);
    }
    
    await googleTasks.deleteGoogleTask(googleAccessToken, listId, taskId);
    
    // 캐시 무효화
    try {
      const supabaseUrl = Deno.env.get('SUPABASE_URL');
      const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
      const supabase = createClient(supabaseUrl, supabaseServiceKey);
      
      const prefix = `google_tasks_cache:${user.id}:`;
      const { data: cacheRows } = await supabase
        .from('kv_store_f973dbc1')
        .select('key')
        .like('key', `${prefix}%`);
      
      if (cacheRows && cacheRows.length > 0) {
        const keys = cacheRows.map(row => row.key);
        await kv.mdel(keys);
        console.log('[DELETE /google-tasks/tasks] Cache invalidated:', keys.length, 'keys');
      }
    } catch (cacheError) {
      console.warn('[DELETE /google-tasks/tasks] Cache invalidation failed:', cacheError);
    }
    
    console.log('[DELETE /google-tasks/tasks] Success - Deleted task:', taskId);
    return c.json({ success: true });
  } catch (error) {
    console.error('[DELETE /google-tasks/tasks] Error:', error);
    return c.json({ error: error.message || 'Failed to delete Google Task' }, 500);
  }
});

// ==================== 카테고리 API ====================

// 카테고리 목록 조회
app.get("/make-server-f973dbc1/categories", async (c) => {
  console.log('[GET /categories] Request received');
  
  const authHeader = c.req.header('Authorization');
  const userJWT = c.req.header('X-User-JWT');
  const { error: authError, client, user } = await authenticateAndGetClient(authHeader, userJWT);
  
  if (authError || !client || !user) {
    return c.json({ error: authError || 'Unauthorized' }, 401);
  }
  
  try {
    console.log('[GET /categories] Fetching categories for user:', user.id);
    
    // 🔥 SERVICE_ROLE_KEY로 서버 클라이언트 생성 (RLS 우회)
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const serverClient = createClient(supabaseUrl!, supabaseServiceKey!);
    
    // 🔥 변경: KV store 대신 Postgres DB 직접 조회 + user_id 필터 추가
    const { data: categories, error } = await serverClient
      .from('categories')
      .select('*')
      .eq('user_id', user.id)  // 🔥 현재 사용자의 카테고리만 조회
      .order('order_index', { ascending: true });
    
    if (error) {
      console.error('[GET /categories] Database error:', error);
      console.error('[GET /categories] Error code:', error.code);
      console.error('[GET /categories] Error message:', error.message);
      return c.json({ error: error.message }, 500);
    }
    
    console.log('[GET /categories] Success - Retrieved', categories?.length || 0, 'categories for user', user.id);
    console.log('[GET /categories] Categories:', categories);
    return c.json({ categories: categories || [] });
  } catch (error) {
    console.error('[GET /categories] Unexpected error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// 🔥 기본 카테고리 자동 생성 (중복 방지)
app.post("/make-server-f973dbc1/categories/init-defaults", async (c) => {
  console.log('[POST /categories/init-defaults] Request received');
  
  const authHeader = c.req.header('Authorization');
  const userJWT = c.req.header('X-User-JWT');
  const { error: authError, client, user } = await authenticateAndGetClient(authHeader, userJWT);
  
  if (authError || !client || !user) {
    return c.json({ error: authError || 'Unauthorized' }, 401);
  }
  
  try {
    console.log('[POST /categories/init-defaults] Creating default categories for user:', user.id);
    
    // 🔥 SERVICE_ROLE_KEY로 서버 클라이언트 생성 (RLS 우회)
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const serverClient = createClient(supabaseUrl!, supabaseServiceKey!);
    
    // 🔥 1단계: 기존 카테고리 확인 (중복 방지)
    const { data: existingCategories, error: checkError } = await serverClient
      .from('categories')
      .select('id')
      .eq('user_id', user.id);
    
    if (checkError) {
      console.error('[POST /categories/init-defaults] Check error:', checkError);
      return c.json({ error: checkError.message }, 500);
    }
    
    if (existingCategories && existingCategories.length > 0) {
      console.log('[POST /categories/init-defaults] ✅ Categories already exist, skipping creation');
      return c.json({ 
        message: 'Categories already initialized', 
        count: existingCategories.length 
      });
    }
    
    // 🔥 2단계: 기본 카테고리 3개 생성
    const defaultCategories = [
      { 
        user_id: user.id,
        name: '개인', 
        color: '#FF2D55', 
        icon: 'tag',
        type: ['calendar', 'task'],
        is_default: true,
        order_index: 1
      },
      { 
        user_id: user.id,
        name: '업무', 
        color: '#007AFF', 
        icon: 'tag',
        type: ['calendar', 'task'],
        is_default: false,
        order_index: 2
      },
      { 
        user_id: user.id,
        name: '휴가', 
        color: '#34C759', 
        icon: 'tag',
        type: ['calendar', 'task'],
        is_default: false,
        order_index: 3
      },
    ];
    
    const { data: createdCategories, error: insertError } = await serverClient
      .from('categories')
      .insert(defaultCategories)
      .select();
    
    if (insertError) {
      console.error('[POST /categories/init-defaults] Insert error:', insertError);
      return c.json({ error: insertError.message }, 500);
    }
    
    console.log('[POST /categories/init-defaults] ✅ Successfully created', createdCategories?.length, 'categories');
    return c.json({ 
      message: 'Default categories created', 
      categories: createdCategories 
    });
  } catch (error) {
    console.error('[POST /categories/init-defaults] Unexpected error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// 카테���리 생성
app.post("/make-server-f973dbc1/categories", async (c) => {
  console.log('[POST /categories] Request received');
  
  const authHeader = c.req.header('Authorization');
  const userJWT = c.req.header('X-User-JWT');
  const { error: authError, client, user } = await authenticateAndGetClient(authHeader, userJWT);
  
  if (authError || !client || !user) {
    return c.json({ error: authError || 'Unauthorized' }, 401);
  }
  
  try {
    const body = await c.req.json();
    console.log('[POST /categories] Request body:', body);
    
    const { name, color, icon, type, order_index } = body;
    
    if (!name || !color) {
      return c.json({ error: 'Missing required fields: name, color' }, 400);
    }
    
    // 🔥 변경: KV store 대신 Postgres DB에 직접 저장
    const { data: category, error } = await client
      .from('categories')
      .insert({
        user_id: user.id,
        name,
        color,
        icon: icon || 'tag',
        type: type || ['calendar'],
        is_default: false,
        order_index: order_index || 0,
      })
      .select()
      .single();
    
    if (error) {
      console.error('[POST /categories] Database error:', error);
      return c.json({ error: error.message }, 500);
    }
    
    console.log('[POST /categories] Success - Created category:', category.id);
    return c.json({ category });
  } catch (error) {
    console.error('[POST /categories] Unexpected error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// 카테고리 순서 일괄 업데이트 (⚠️ 반드시 /categories/:id 보다 먼저 정의)
app.patch("/make-server-f973dbc1/categories/reorder", async (c) => {
  console.log('[PATCH /categories/reorder] Request received');
  
  const authHeader = c.req.header('Authorization');
  const userJWT = c.req.header('X-User-JWT');
  const { error: authError, client, user } = await authenticateAndGetClient(authHeader, userJWT);
  
  if (authError || !client || !user) {
    return c.json({ error: authError || 'Unauthorized' }, 401);
  }
  
  try {
    const body = await c.req.json();
    console.log('[PATCH /categories/reorder] Request body:', body);
    
    const { categoryOrders } = body; // [{ id, order_index }, ...]
    
    if (!Array.isArray(categoryOrders) || categoryOrders.length === 0) {
      return c.json({ error: 'Invalid categoryOrders array' }, 400);
    }
    
    // 🔥 SERVICE_ROLE_KEY로 서버 클라이언트 생성 (RLS 우회)
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const serverClient = createClient(supabaseUrl!, supabaseServiceKey!);
    
    // 각 카테고리의 order_index 업데이트
    const updatePromises = categoryOrders.map(({ id, order_index }) =>
      serverClient
        .from('categories')
        .update({ order_index })
        .eq('id', id)
        .eq('user_id', user.id) // 보안: 본인 카테고리만 수정
    );
    
    const results = await Promise.all(updatePromises);
    
    // 에러 체크
    const errors = results.filter(r => r.error);
    if (errors.length > 0) {
      console.error('[PATCH /categories/reorder] Update errors:', errors);
      return c.json({ error: 'Failed to update some categories' }, 500);
    }
    
    console.log('[PATCH /categories/reorder] Success - Updated', categoryOrders.length, 'categories');
    return c.json({ success: true });
  } catch (error) {
    console.error('[PATCH /categories/reorder] Unexpected error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// 카테고리 수정
app.patch("/make-server-f973dbc1/categories/:id", async (c) => {
  const categoryId = c.req.param('id');
  console.log('[PATCH /categories] Request received for category:', categoryId);
  
  const authHeader = c.req.header('Authorization');
  const userJWT = c.req.header('X-User-JWT');
  const { error: authError, client, user } = await authenticateAndGetClient(authHeader, userJWT);
  
  if (authError || !client || !user) {
    console.error('[PATCH /categories] Auth error:', authError);
    return c.json({ error: authError || 'Unauthorized' }, 401);
  }
  
  console.log('[PATCH /categories] Authenticated user ID:', user.id);
  
  try {
    const body = await c.req.json();
    console.log('[PATCH /categories] Request body:', body);
    
    // 🔥 SERVICE_ROLE_KEY로 서버 클라이언트 생성 (RLS 우회)
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const serverClient = createClient(supabaseUrl!, supabaseServiceKey!);
    
    // 🔥 먼저 카테고리가 존재하는지 확인
    const { data: existingCategory, error: fetchError } = await serverClient
      .from('categories')
      .select('*')
      .eq('id', categoryId)
      .single();
    
    if (fetchError || !existingCategory) {
      console.error('[PATCH /categories] Category not found:', fetchError);
      return c.json({ error: 'Category not found' }, 404);
    }
    
    console.log('[PATCH /categories] Existing category:', {
      id: existingCategory.id,
      name: existingCategory.name,
      user_id: existingCategory.user_id,
    });
    
    // 🔥 사용자 ID 확인
    if (existingCategory.user_id !== user.id) {
      console.error('[PATCH /categories] Access denied - user_id mismatch:', {
        category_user_id: existingCategory.user_id,
        authenticated_user_id: user.id,
      });
      return c.json({ error: 'Access denied' }, 403);
    }
    
    const updateData: any = {};
    if (body.name !== undefined) updateData.name = body.name;
    if (body.color !== undefined) updateData.color = body.color;
    if (body.icon !== undefined) updateData.icon = body.icon;
    if (body.type !== undefined) updateData.type = body.type;
    if (body.order_index !== undefined) updateData.order_index = body.order_index;
    
    console.log('[PATCH /categories] Update data:', updateData);
    
    const { data: categories, error } = await serverClient
      .from('categories')
      .update(updateData)
      .eq('id', categoryId)
      .eq('user_id', user.id)
      .select();
    
    if (error) {
      console.error('[PATCH /categories] Database error:', error);
      return c.json({ error: error.message }, 500);
    }
    
    // 🔥 업데이트된 레코드가 없으면 404 반환
    if (!categories || categories.length === 0) {
      console.error('[PATCH /categories] Category not found or access denied');
      return c.json({ error: 'Category not found or access denied' }, 404);
    }
    
    const category = categories[0];
    console.log('[PATCH /categories] Success - Updated category:', category.id);
    return c.json({ category });
  } catch (error) {
    console.error('[PATCH /categories] Unexpected error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// 카테고리 삭제
app.delete("/make-server-f973dbc1/categories/:id", async (c) => {
  const categoryId = c.req.param('id');
  console.log('[DELETE /categories] Request received for category:', categoryId);
  
  const authHeader = c.req.header('Authorization');
  const userJWT = c.req.header('X-User-JWT');
  const { error: authError, client, user } = await authenticateAndGetClient(authHeader, userJWT);
  
  if (authError || !client || !user) {
    return c.json({ error: authError || 'Unauthorized' }, 401);
  }
  
  try {
    const { error } = await client
      .from('categories')
      .delete()
      .eq('id', categoryId);
    
    if (error) {
      console.error('[DELETE /categories] Database error:', error);
      return c.json({ error: error.message }, 500);
    }
    
    console.log('[DELETE /categories] Success - Deleted category:', categoryId);
    return c.json({ success: true });
  } catch (error) {
    console.error('[DELETE /categories] Unexpected error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// 사용자 초기화 (기본 카테고리 생성)
// 🔥 DEPRECATED - 회원가입 시 자동으로 카테고리가 생성되므로 이 엔드포인트는 더 이상 사용하지 않습니다.
app.post("/make-server-f973dbc1/users/initialize", async (c) => {
  console.log('[POST /users/initialize] ⚠️ DEPRECATED - This endpoint is no longer needed');
  console.log('[POST /users/initialize] Categories are now created automatically during signup');
  
  return c.json({ 
    message: 'This endpoint is deprecated. Categories are created automatically during signup.',
    deprecated: true 
  }, 200);
});

// ==================== Tasks CRUD API (통합 스키마) ====================

// 모든 Tasks 가져오기 (로컬 + Google 통합)
app.get("/make-server-f973dbc1/tasks", async (c) => {
  console.log('[GET /tasks] Request received');
  
  const authHeader = c.req.header('Authorization');
  const userJWT = c.req.header('X-User-JWT');
  const { error: authError, client, user } = await authenticateAndGetClient(authHeader, userJWT);
  
  if (authError || !client || !user) {
    return c.json({ error: authError || 'Unauthorized' }, 401);
  }
  
  try {
    // Postgres에서 Tasks 가져오기 (RLS가 자동로 user_id 필터링)
    const { data: allTasks, error } = await client
      .from('tasks')
      .select('*')
      .order('due_date', { ascending: true, nullsFirst: false })
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('[GET /tasks] Database error:', error);
      return c.json({ error: error.message }, 500);
    }
    
    console.log('[GET /tasks] Retrieved', allTasks?.length || 0, 'tasks');
    return c.json({ tasks: allTasks || [] });
  } catch (error) {
    console.error('[GET /tasks] Error:', error);
    return c.json({ error: 'Failed to fetch tasks' }, 500);
  }
});

// Task 생성
app.post("/make-server-f973dbc1/tasks", async (c) => {
  console.log('[POST /tasks] Request received');
  
  const authHeader = c.req.header('Authorization');
  const userJWT = c.req.header('X-User-JWT');
  const { error: authError, client, user } = await authenticateAndGetClient(authHeader, userJWT);
  
  if (authError || !client || !user) {
    return c.json({ error: authError || 'Unauthorized' }, 401);
  }
  
  try {
    const body = await c.req.json();
    console.log('[POST /tasks] Request body:', body);
    
    if (!body.title) {
      return c.json({ error: 'Missing required field: title' }, 400);
    }
    
    const insertData: any = {
      user_id: user.id,
      title: body.title,
      notes: body.notes,
      is_completed: body.is_completed || body.completed || false,  // 🔥 변경
      due_date: body.due_date || body.date,
      task_type: body.task_type || body.type || 'single',  // 🔥 변경
      category_id: body.category_id,
    };
    
    const { data: task, error } = await client
      .from('tasks')
      .insert(insertData)
      .select()
      .single();
    
    if (error) {
      console.error('[POST /tasks] Database error:', error);
      return c.json({ error: error.message }, 500);
    }
    
    console.log('[POST /tasks] Success - Created task:', task.id);
    return c.json({ task });
  } catch (error) {
    console.error('[POST /tasks] Error:', error);
    return c.json({ error: 'Failed to create task' }, 500);
  }
});

// Task 수정
app.patch("/make-server-f973dbc1/tasks/:id", async (c) => {
  const taskId = c.req.param('id');
  console.log('[PATCH /tasks] Request received for task:', taskId);
  
  const authHeader = c.req.header('Authorization');
  const userJWT = c.req.header('X-User-JWT');
  const { error: authError, client, user } = await authenticateAndGetClient(authHeader, userJWT);
  
  if (authError || !client || !user) {
    return c.json({ error: authError || 'Unauthorized' }, 401);
  }
  
  try {
    const body = await c.req.json();
    console.log('[PATCH /tasks] Request body:', body);
    
    const updateData: any = {};
    if (body.title !== undefined) updateData.title = body.title;
    if (body.notes !== undefined) updateData.notes = body.notes;
    if (body.is_completed !== undefined) updateData.is_completed = body.is_completed;  // 🔥 변경
    if (body.completed !== undefined) updateData.is_completed = body.completed;  // 🔥 하위 호환성
    if (body.due_date !== undefined) updateData.due_date = body.due_date;
    if (body.date !== undefined) updateData.due_date = body.date;  // 🔥 하위 호환성
    if (body.task_type !== undefined) updateData.task_type = body.task_type;  // 🔥 변경
    if (body.type !== undefined) updateData.task_type = body.type;  // 🔥 하위 호환성
    if (body.category_id !== undefined) updateData.category_id = body.category_id;
    
    const { data: task, error } = await client
      .from('tasks')
      .update(updateData)
      .eq('id', taskId)
      .select()
      .single();
    
    if (error) {
      console.error('[PATCH /tasks] Database error:', error);
      return c.json({ error: error.message }, 500);
    }
    
    console.log('[PATCH /tasks] Success - Updated task:', task.id);
    return c.json({ task });
  } catch (error) {
    console.error('[PATCH /tasks] Error:', error);
    return c.json({ error: 'Failed to update task' }, 500);
  }
});

// Task 삭제
app.delete("/make-server-f973dbc1/tasks/:id", async (c) => {
  const taskId = c.req.param('id');
  console.log('[DELETE /tasks] Request received for task:', taskId);
  
  const authHeader = c.req.header('Authorization');
  const userJWT = c.req.header('X-User-JWT');
  const { error: authError, client, user } = await authenticateAndGetClient(authHeader, userJWT);
  
  if (authError || !client || !user) {
    return c.json({ error: authError || 'Unauthorized' }, 401);
  }
  
  try {
    const { error } = await client
      .from('tasks')
      .delete()
      .eq('id', taskId);
    
    if (error) {
      console.error('[DELETE /tasks] Database error:', error);
      return c.json({ error: error.message }, 500);
    }
    
    console.log('[DELETE /tasks] Success - Deleted task:', taskId);
    return c.json({ success: true });
  } catch (error) {
    console.error('[DELETE /tasks] Error:', error);
    return c.json({ error: 'Failed to delete task' }, 500);
  }
});

console.log('🚀 Server starting...');
console.log('📍 Version: 2.2.0');
console.log('🌐 CORS enabled for all origins');
console.log('✅ Server ready to accept requests');

Deno.serve(app.fetch);