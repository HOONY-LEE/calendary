// API helper functions for Calendary
import { projectId, publicAnonKey } from './supabase-info';
import { retryFetch, isNetworkError, isAuthError } from './api-helpers';
import { supabase } from './supabase';

const API_BASE_URL = `https://${projectId}.supabase.co/functions/v1/make-server-f973dbc1`;

console.log('[API] Initializing API module');
console.log('[API] Project ID:', projectId);
console.log('[API] API Base URL:', API_BASE_URL);

// Health check 함수
export async function checkServerHealth(): Promise<boolean> {
  try {
    console.log('[API] Checking server health...');
    const response = await fetch(`${API_BASE_URL}/health`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      console.error('[API] Health check failed with status:', response.status);
      return false;
    }
    
    const data = await response.json();
    console.log('[API] Health check passed:', data);
    return data.status === 'ok';
  } catch (error) {
    console.error('[API] Health check error:', error);
    return false;
  }
}

// Supabase Client를 사용한 헬퍼 (CORS 문제 해결)
async function supabaseClientFetch<T>(
  table: string,
  operation: 'select' | 'insert' | 'update' | 'delete',
  options: {
    filter?: Record<string, any>;
    data?: any;
    order?: { column: string; ascending?: boolean };
  } = {}
): Promise<T> {
  console.log(`[Supabase Client] 🔵 ${operation.toUpperCase()} /${table} - START`);
  console.log(`[Supabase Client] Options:`, JSON.stringify(options));
  
  // 🔥 현재 세션을 확인하여 RLS 정책 통과
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();
  
  if (sessionError) {
    console.error('[Supabase Client] ❌ Session error:', sessionError);
    throw new Error('Authentication required');
  }
  
  if (!session) {
    console.error('[Supabase Client] ❌ No active session');
    throw new Error('No active session - please login');
  }
  
  console.log('[Supabase Client] ✅ Session found:', session.user.email);
  
  let query = supabase.from(table);
  
  if (operation === 'select') {
    query = query.select('*');
    
    if (options.order) {
      query = query.order(options.order.column, { ascending: options.order.ascending ?? true });
    }
    
    if (options.filter) {
      Object.entries(options.filter).forEach(([key, value]) => {
        query = query.eq(key, value);
      });
    }
    
    console.log(`[Supabase Client] 🔵 Executing query...`);
    const startTime = Date.now();
    
    // 🔥 타임아웃 추가 (10초)
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Query timeout after 10 seconds')), 10000);
    });
    
    const queryPromise = query;
    
    const { data, error } = await Promise.race([queryPromise, timeoutPromise]) as any;
    
    const duration = Date.now() - startTime;
    console.log(`[Supabase Client] Query completed in ${duration}ms`);
    
    if (error) {
      console.error(`[Supabase Client] ❌ ${operation} error:`, error);
      console.error(`[Supabase Client] Error code:`, error.code);
      console.error(`[Supabase Client] Error message:`, error.message);
      console.error(`[Supabase Client] Error hint:`, error.hint);
      
      // 🔥 JWT 에러 또는 인증 실패 시 세션 정리하고 로그인 페이지로 리다이렉트
      if (error.code === 'PGRST301' || error.message?.includes('JWT') || error.message?.includes('expired')) {
        console.log('[Supabase Client] 🚪 Auth error detected, signing out and redirecting...');
        await supabase.auth.signOut();
        if (window.location.pathname !== '/login' && window.location.pathname !== '/signup') {
          window.location.href = '/login';
        }
      }
      
      throw new Error(error.message);
    }
    
    console.log(`[Supabase Client] ✅ Success - Retrieved ${Array.isArray(data) ? data.length : 1} records`);
    console.log(`[Supabase Client] Data:`, data);
    return data as T;
  }
  
  if (operation === 'insert') {
    const { data, error } = await supabase
      .from(table)
      .insert(options.data)
      .select()
      .single();
    
    if (error) {
      console.error(`[Supabase Client] ❌ ${operation} error:`, error);
      console.error(`[Supabase Client] Error code:`, error.code);
      console.error(`[Supabase Client] Error message:`, error.message);
      console.error(`[Supabase Client] Error hint:`, error.hint);
      throw new Error(error.message);
    }
    
    console.log(`[Supabase Client] ✅ Success - Created record`);
    console.log(`[Supabase Client] Data:`, data);
    return data as T;
  }
  
  if (operation === 'update') {
    let updateQuery = supabase.from(table).update(options.data);
    
    if (options.filter) {
      Object.entries(options.filter).forEach(([key, value]) => {
        updateQuery = updateQuery.eq(key, value);
      });
    }
    
    const { data, error } = await updateQuery.select();
    
    if (error) {
      console.error(`[Supabase Client] ❌ ${operation} error:`, error);
      console.error(`[Supabase Client] Error code:`, error.code);
      console.error(`[Supabase Client] Error message:`, error.message);
      console.error(`[Supabase Client] Error hint:`, error.hint);
      
      // 🔥 JWT 에러 또는 인증 실패 시 세션 정리하고 로그인 페이지로 리다이렉트
      if (error.code === 'PGRST301' || error.message?.includes('JWT') || error.message?.includes('expired')) {
        console.log('[Supabase Client] 🚪 Auth error detected, signing out and redirecting...');
        await supabase.auth.signOut();
        if (window.location.pathname !== '/login' && window.location.pathname !== '/signup') {
          window.location.href = '/login';
        }
      }
      
      throw new Error(error.message);
    }
    
    // 🔥 업데이트된 레코드가 없으면 에러
    if (!data || data.length === 0) {
      console.error(`[Supabase Client] ❌ No records found to update with filter:`, options.filter);
      throw new Error(`No records found to update`);
    }
    
    console.log(`[Supabase Client] ✅ Success - Updated ${data.length} record(s)`);
    console.log(`[Supabase Client] Data:`, data);
    return data[0] as T;
  }
  
  if (operation === 'delete') {
    let deleteQuery = supabase.from(table).delete();
    
    if (options.filter) {
      Object.entries(options.filter).forEach(([key, value]) => {
        deleteQuery = deleteQuery.eq(key, value);
      });
    }
    
    const { error } = await deleteQuery;
    
    if (error) {
      console.error(`[Supabase Client] ❌ ${operation} error:`, error);
      console.error(`[Supabase Client] Error code:`, error.code);
      console.error(`[Supabase Client] Error message:`, error.message);
      console.error(`[Supabase Client] Error hint:`, error.hint);
      throw new Error(error.message);
    }
    
    console.log(`[Supabase Client] ✅ Success - Deleted record`);
    return null as T;
  }
  
  throw new Error(`Unknown operation: ${operation}`);
}

export interface DBEvent {
  id: string;
  user_id: string;
  category_id?: string;
  
  // Google Calendar 기본 필드
  summary: string; // 제목
  description?: string;
  location?: string;
  
  // 시간 정보 (Google Calendar 형식)
  start_datetime?: string; // ISO timestamp (시간이 있는 일정)
  start_date?: string; // YYYY-MM-DD (종일 일정)
  start_timezone?: string;
  
  end_datetime?: string; // ISO timestamp (시간이 있는 일정)
  end_date?: string; // YYYY-MM-DD (종일 일정)
  end_timezone?: string;
  
  is_all_day: boolean;
  
  // 색상
  color_id?: string; // Google Calendar colorId
  background_color?: string;
  foreground_color?: string;
  
  // 반복 일정
  recurrence?: string[]; // RRULE 배열
  is_recurring?: boolean;
  recurring_event_id?: string;
  original_start_time?: string;
  
  // 참석자
  attendees?: any; // JSONB
  organizer?: any; // JSONB
  creator?: any; // JSONB
  
  // 알림
  reminders?: any; // JSONB
  
  // 기타
  transparency?: string;
  visibility?: string;
  status?: string;
  event_type?: string;
  
  // Google Calendar 연동
  google_event_id?: string;
  google_calendar_id?: string;
  google_ical_uid?: string;
  google_html_link?: string;
  etag?: string;
  
  // 타데이
  synced_at?: string;
  last_modified?: string;
  created_at?: string;
  updated_at?: string;
}

async function fetchAPI(
  endpoint: string,
  options: RequestInit = {},
  accessToken?: string
) {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (accessToken) {
    console.log('[API] Using access token (first 20 chars):', accessToken.substring(0, 20) + '...');
    headers['Authorization'] = `Bearer ${accessToken}`;
  } else {
    console.log('[API] No access token, using anon key');
    headers['Authorization'] = `Bearer ${publicAnonKey}`;
  }

  console.log('[API] Fetching:', `${API_BASE_URL}${endpoint}`);

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`[API] Error (${response.status}):`, errorText);
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  return response.json();
}

// 이벤트 API
export const eventsAPI = {
  // 모든 이벤트 조회
  async getAll(accessToken: string): Promise<DBEvent[]> {
    console.log('[API] Getting all events via Supabase Client (direct)');
    
    // 🔥 Make 환경에서는 서버 엔드포인트가 없으므로 Supabase Client 직접 사용
    const result = await supabaseClientFetch<DBEvent[]>(
      'events',
      'select',
      { order: { column: 'created_at', ascending: false } }
    );
    
    const events = Array.isArray(result) ? result : [result];
    console.log('[API] Successfully fetched', events.length, 'events');
    return events;
  },

  // 이벤트 생성
  async create(
    eventData: {
      summary: string; // 제목 (구글 캘린더 형식)
      description?: string;
      start_datetime?: string; // ISO timestamp (시간 있는 일정)
      start_date?: string; // YYYY-MM-DD (종일 일정)
      end_datetime?: string;
      end_date?: string;
      is_all_day: boolean;
      category_id?: string;
      location?: string;
      recurrence?: string[]; // RRULE 배열
      color_id?: string;
      background_color?: string;
      user_id?: string;
    },
    accessToken: string
  ): Promise<DBEvent> {
    console.log('[API] Creating event in Supabase:', eventData.summary);
    
    const payload: any = {
      summary: eventData.summary,
      description: eventData.description,
      is_all_day: eventData.is_all_day,
      location: eventData.location,
      color_id: eventData.color_id,
      background_color: eventData.background_color,
      start_timezone: 'Asia/Seoul',
      end_timezone: 'Asia/Seoul',
    };

    // 종일 일정 vs 시간 지정 일정
    if (eventData.is_all_day) {
      payload.start_date = eventData.start_date;
      payload.end_date = eventData.end_date;
    } else {
      payload.start_datetime = eventData.start_datetime;
      payload.end_datetime = eventData.end_datetime;
    }

    // 반복 일정
    if (eventData.recurrence && eventData.recurrence.length > 0) {
      payload.recurrence = eventData.recurrence;
      payload.is_recurring = true;
    }

    // user_id 포함 (RLS 정책을 위해 필요)
    if (eventData.user_id) {
      payload.user_id = eventData.user_id;
    }

    // category_id가 유효한 UUID인 경우에만 포함
    if (eventData.category_id && eventData.category_id.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
      payload.category_id = eventData.category_id;
    }
    
    console.log('[API] Event payload:', payload);
    
    const result = await supabaseClientFetch<DBEvent>(
      'events',
      'insert',
      { data: payload }
    );
    
    const event = Array.isArray(result) ? result[0] : result;
    console.log('[API] Successfully created event:', event.id);
    return event;
  },

  // 이벤트 수정
  async update(
    id: string,
    eventData: {
      summary: string;
      description?: string;
      start_datetime?: string;
      start_date?: string;
      end_datetime?: string;
      end_date?: string;
      is_all_day: boolean;
      category_id?: string;
      location?: string;
      recurrence?: string[];
      color_id?: string;
      background_color?: string;
    },
    accessToken: string
  ): Promise<DBEvent> {
    console.log('[API] Updating event in Supabase:', id);
    
    const payload: any = {
      summary: eventData.summary,
      description: eventData.description,
      is_all_day: eventData.is_all_day,
      location: eventData.location,
      color_id: eventData.color_id,
      background_color: eventData.background_color,
    };

    // 종일 일정 vs 시간 지정 일정
    if (eventData.is_all_day) {
      payload.start_date = eventData.start_date;
      payload.end_date = eventData.end_date;
      payload.start_datetime = null;
      payload.end_datetime = null;
    } else {
      payload.start_datetime = eventData.start_datetime;
      payload.end_datetime = eventData.end_datetime;
      payload.start_date = null;
      payload.end_date = null;
    }

    // 반복 일정
    if (eventData.recurrence && eventData.recurrence.length > 0) {
      payload.recurrence = eventData.recurrence;
      payload.is_recurring = true;
    } else {
      payload.recurrence = null;
      payload.is_recurring = false;
    }

    // category_id가 유효한 UUID인 경우에만 포함
    if (eventData.category_id && eventData.category_id.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
      payload.category_id = eventData.category_id;
    }
    
    const result = await supabaseClientFetch<DBEvent>(
      'events',
      'update',
      { data: payload, filter: { id } }
    );
    
    const event = Array.isArray(result) ? result[0] : result;
    console.log('[API] Successfully updated event:', id);
    return event;
  },

  // 이벤트 삭제
  async delete(id: string, accessToken: string): Promise<void> {
    console.log('[API] Deleting event from Supabase:', id);
    
    await supabaseClientFetch<DBEvent>(
      'events',
      'delete',
      { filter: { id } }
    );
    
    console.log('[API] Successfully deleted event:', id);
  },
};

// 카테고리 API
export interface DBCategory {
  id: string;
  user_id: string;
  name: string;
  color: string;
  icon?: string;
  type: string[];
  is_default: boolean;
  order_index: number;
  created_at?: string;
  updated_at?: string;
}

export const categoriesAPI = {
  // 모든 카테고리 조회
  async getAll(accessToken: string): Promise<DBCategory[]> {
    console.log('[API] Getting all categories via Supabase Client (direct)');
    
    // 🔥 Make 환경에서는 서버 엔드포인트가 없으므로 Supabase Client 직접 사용
    const result = await supabaseClientFetch<DBCategory[]>(
      'categories',
      'select',
      { order: { column: 'order_index', ascending: true } }
    );
    
    const categories = Array.isArray(result) ? result : [result];
    console.log('[API] Successfully fetched', categories.length, 'categories');
    return categories;
  },

  // 카테고리 생성
  async create(
    categoryData: {
      name: string;
      color: string;
      icon?: string;
      type?: string[];
      order_index?: number;
      user_id?: string; // 사용자 ID 추가
    },
    accessToken: string
  ): Promise<DBCategory> {
    console.log('[API] Creating category in Supabase:', categoryData.name);
    
    const payload: any = {
      name: categoryData.name,
      color: categoryData.color,
      icon: categoryData.icon,
      type: categoryData.type || ['calendar'],
      is_default: false,
      order_index: categoryData.order_index || 0,
    };

    // user_id 포함 (RLS 정책을 위해 필요)
    if (categoryData.user_id) {
      payload.user_id = categoryData.user_id;
    }
    
    console.log('[API] Category payload:', payload);
    
    const result = await supabaseClientFetch<DBCategory>(
      'categories',
      'insert',
      { data: payload }
    );
    
    const category = Array.isArray(result) ? result[0] : result;
    console.log('[API] Successfully created category:', category.id);
    return category;
  },

  // 카테고리 수정
  async update(
    id: string,
    categoryData: {
      name?: string;
      color?: string;
      icon?: string;
      type?: string[];
      order_index?: number;
    },
    accessToken: string
  ): Promise<DBCategory> {
    console.log('[API] Updating category via Supabase Client (direct):', id);
    
    const result = await supabaseClientFetch<DBCategory>(
      'categories',
      'update',
      { data: categoryData, filter: { id } }
    );
    
    const category = Array.isArray(result) ? result[0] : result;
    console.log('[API] Successfully updated category:', id);
    return category;
  },

  // 카테고리 삭제
  async delete(id: string, accessToken: string): Promise<void> {
    console.log('[API] Deleting category from Supabase:', id);
    
    await supabaseClientFetch<DBCategory>(
      'categories',
      'delete',
      { filter: { id } }
    );
    
    console.log('[API] Successfully deleted category:', id);
  },

  // 카테고리 리셋 (모든 카테고리 삭제 후 기본 카테고리만 생성)
  async reset(accessToken: string): Promise<DBCategory[]> {
    console.log('[API] Resetting categories via server');
    
    return fetchAPI('/categories/reset', {
      method: 'POST',
    }, accessToken);
  },

  // 카테고리 순서 일괄 업데이트
  async reorder(
    categoryOrders: { id: string; order_index: number }[],
    accessToken: string
  ): Promise<void> {
    console.log('[API] Reordering categories via Supabase Client (direct):', categoryOrders.length);
    
    // 🔥 각 카테고리의 order_index를 병렬로 업데이트
    await Promise.all(
      categoryOrders.map(({ id, order_index }) =>
        supabaseClientFetch<DBCategory>(
          'categories',
          'update',
          { data: { order_index }, filter: { id } }
        )
      )
    );
    
    console.log('[API] Successfully reordered categories');
  },
};

// Tasks API
export interface DBTask {
  id: string;
  user_id: string;
  category_id?: string;
  title: string;
  notes?: string;
  is_completed: boolean;
  due_date: string;
  task_type: 'single' | 'routine' | 'event';
  order_index?: number;
  created_at?: string;
  updated_at?: string;
}

export const tasksAPI = {
  // 모든 Tasks 조회
  async getAll(accessToken: string): Promise<DBTask[]> {
    console.log('[API] Getting all tasks via Supabase Client (direct)');
    
    const result = await supabaseClientFetch<DBTask[]>(
      'tasks',
      'select',
      { order: { column: 'created_at', ascending: true } }
    );
    
    const tasks = Array.isArray(result) ? result : [result];
    console.log('[API] Successfully fetched', tasks.length, 'tasks');
    return tasks;
  },

  // Task 생성
  async create(
    taskData: {
      title: string;
      notes?: string;
      is_completed: boolean;
      due_date: string;
      task_type: 'single' | 'routine' | 'event';
      category_id?: string;
      user_id?: string;
    },
    accessToken: string
  ): Promise<DBTask> {
    console.log('[API] Creating task in Supabase:', taskData.title);
    
    // 🔥 현재 세션에서 user_id 가져오기
    const { data: { session } } = await supabase.auth.getSession();
    if (!session || !session.user) {
      throw new Error('No active session');
    }
    
    const payload: any = {
      title: taskData.title,
      notes: taskData.notes || '',
      is_completed: taskData.is_completed,
      due_date: taskData.due_date,
      task_type: taskData.task_type,
      user_id: session.user.id, // 🔥 현재 로그인한 사용자 ID
    };

    // category_id가 유효한 UUID인 경우에만 포함
    if (taskData.category_id && taskData.category_id.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
      payload.category_id = taskData.category_id;
    }
    
    console.log('[API] Task payload with user_id from session:', payload);
    
    const result = await supabaseClientFetch<DBTask>(
      'tasks',
      'insert',
      { data: payload }
    );
    
    const task = Array.isArray(result) ? result[0] : result;
    console.log('[API] Successfully created task:', task.id);
    return task;
  },

  // Task 수정
  async update(
    id: string,
    taskData: {
      title?: string;
      notes?: string;
      is_completed?: boolean;
      due_date?: string;
    },
    accessToken: string
  ): Promise<DBTask> {
    console.log('[API] Updating task in Supabase:', id);
    
    const result = await supabaseClientFetch<DBTask>(
      'tasks',
      'update',
      { data: taskData, filter: { id } }
    );
    
    const task = Array.isArray(result) ? result[0] : result;
    console.log('[API] Successfully updated task:', id);
    return task;
  },

  // Task 삭제
  async delete(id: string, accessToken: string): Promise<void> {
    console.log('[API] Deleting task from Supabase:', id);

    await supabaseClientFetch<DBTask>(
      'tasks',
      'delete',
      { filter: { id } }
    );

    console.log('[API] Successfully deleted task:', id);
  },

  // Task 순서 일괄 업데이트
  async reorder(
    taskOrders: { id: string; order_index: number }[],
    accessToken: string
  ): Promise<void> {
    console.log('[API] Reordering tasks:', taskOrders.length);

    await Promise.all(
      taskOrders.map(({ id, order_index }) =>
        supabaseClientFetch<DBTask>(
          'tasks',
          'update',
          { data: { order_index }, filter: { id } }
        )
      )
    );

    console.log('[API] Successfully reordered tasks');
  },
};