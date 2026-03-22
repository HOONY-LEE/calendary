-- Calendary 데이터베이스 스키마
-- 개인 생산성 OS: Calendar, Task, Routine, Analytics 기능 지원

-- UUID 확장 활성화
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- 1. USERS 테이블
-- ============================================================================
-- Supabase Auth를 사용하므로 auth.users를 참조
-- 추가 사용자 프로필 정보를 위한 profiles 테이블

CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  timezone TEXT DEFAULT 'Asia/Seoul',
  language TEXT DEFAULT 'ko' CHECK (language IN ('ko', 'en')),
  theme TEXT DEFAULT 'light' CHECK (theme IN ('light', 'dark', 'system')),
  
  -- 구글 캘린더 연동
  google_calendar_connected BOOLEAN DEFAULT FALSE,
  google_refresh_token TEXT,
  google_access_token TEXT,
  google_token_expiry TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS (Row Level Security) 활성화
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profiles 정책
CREATE POLICY "Users can view own profile" 
  ON public.profiles FOR SELECT 
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" 
  ON public.profiles FOR UPDATE 
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" 
  ON public.profiles FOR INSERT 
  WITH CHECK (auth.uid() = id);

-- ============================================================================
-- 2. CATEGORIES 테이블
-- ============================================================================
CREATE TABLE public.categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  
  name_ko TEXT NOT NULL,
  name_en TEXT NOT NULL,
  color TEXT NOT NULL, -- Hex color code (e.g., #FF2D55)
  icon TEXT, -- 아이콘 식별자 (예: 'phone', 'briefcase', 'users')
  
  -- 카테고리 타입 (calendar, task, routine)
  type TEXT[] DEFAULT ARRAY['calendar']::TEXT[] CHECK (
    type <@ ARRAY['calendar', 'task', 'routine']::TEXT[]
  ),
  
  is_default BOOLEAN DEFAULT FALSE, -- 시스템 기본 카테고리 여부
  order_index INTEGER DEFAULT 0, -- 표시 순서
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스
CREATE INDEX idx_categories_user_id ON public.categories(user_id);
CREATE INDEX idx_categories_type ON public.categories USING GIN(type);

-- RLS 정책
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own categories" 
  ON public.categories 
  USING (auth.uid() = user_id);

-- ============================================================================
-- 3. EVENTS 테이블 (캘린더 일정)
-- ============================================================================
CREATE TABLE public.events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  
  title TEXT NOT NULL,
  description TEXT,
  
  -- 날짜 및 시간
  start_date DATE NOT NULL,
  end_date DATE, -- 기간 일정의 경우 종료일
  start_time TIME, -- 하루 종일 일정의 경우 NULL
  end_time TIME,
  is_all_day BOOLEAN DEFAULT FALSE,
  
  -- 반복 일정 (RFC 5545 표준)
  is_recurring BOOLEAN DEFAULT FALSE,
  rrule TEXT, -- RRule 문자열 (예: "FREQ=WEEKLY;BYDAY=MO,WE,FR")
  recurrence_freq TEXT CHECK (recurrence_freq IN ('DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY')),
  recurrence_interval INTEGER DEFAULT 1,
  recurrence_byweekday INTEGER[], -- 0=MO, 1=TU, 2=WE, 3=TH, 4=FR, 5=SA, 6=SU
  recurrence_until DATE,
  recurrence_count INTEGER,
  
  -- 반복 일정 예외 처리
  recurrence_id UUID REFERENCES public.events(id) ON DELETE CASCADE, -- 원본 반복 일정 ID
  is_exception BOOLEAN DEFAULT FALSE, -- 반복 일정에서 수정된 인스턴스
  exception_date DATE, -- 예외가 발생한 날짜
  
  -- 구글 캘린더 연동
  google_event_id TEXT,
  google_calendar_id TEXT,
  synced_at TIMESTAMPTZ,
  
  -- 위치 및 참석자
  location TEXT,
  attendees JSONB, -- [{email: string, name: string, status: string}]
  
  -- 알림
  reminders JSONB, -- [{minutes: number, method: 'email'|'notification'}]
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스
CREATE INDEX idx_events_user_id ON public.events(user_id);
CREATE INDEX idx_events_category_id ON public.events(category_id);
CREATE INDEX idx_events_start_date ON public.events(start_date);
CREATE INDEX idx_events_end_date ON public.events(end_date);
CREATE INDEX idx_events_is_recurring ON public.events(is_recurring);
CREATE INDEX idx_events_recurrence_id ON public.events(recurrence_id);
CREATE INDEX idx_events_google_event_id ON public.events(google_event_id);

-- RLS 정책
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own events" 
  ON public.events 
  USING (auth.uid() = user_id);

-- ============================================================================
-- 4. TASKS 테이블 (할일)
-- ============================================================================
CREATE TABLE public.tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  
  title TEXT NOT NULL,
  description TEXT,
  
  -- 상태
  is_completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMPTZ,
  
  -- 우선순위
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  
  -- 날짜
  due_date DATE,
  due_time TIME,
  
  -- 반복 작업
  is_recurring BOOLEAN DEFAULT FALSE,
  rrule TEXT,
  recurrence_freq TEXT CHECK (recurrence_freq IN ('DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY')),
  recurrence_interval INTEGER DEFAULT 1,
  recurrence_byweekday INTEGER[],
  recurrence_until DATE,
  recurrence_count INTEGER,
  
  -- 서브태스크
  parent_task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE,
  
  -- 태그
  tags TEXT[],
  
  -- 정렬 순서
  order_index INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스
CREATE INDEX idx_tasks_user_id ON public.tasks(user_id);
CREATE INDEX idx_tasks_category_id ON public.tasks(category_id);
CREATE INDEX idx_tasks_is_completed ON public.tasks(is_completed);
CREATE INDEX idx_tasks_due_date ON public.tasks(due_date);
CREATE INDEX idx_tasks_parent_task_id ON public.tasks(parent_task_id);
CREATE INDEX idx_tasks_tags ON public.tasks USING GIN(tags);

-- RLS 정책
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own tasks" 
  ON public.tasks 
  USING (auth.uid() = user_id);

-- ============================================================================
-- 5. ROUTINES 테이블 (루틴)
-- ============================================================================
CREATE TABLE public.routines (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  
  title TEXT NOT NULL,
  description TEXT,
  
  -- 루틴 타입
  routine_type TEXT DEFAULT 'daily' CHECK (routine_type IN ('morning', 'daily', 'evening', 'weekly', 'custom')),
  
  -- 반복 설정
  rrule TEXT NOT NULL,
  recurrence_freq TEXT NOT NULL CHECK (recurrence_freq IN ('DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY')),
  recurrence_interval INTEGER DEFAULT 1,
  recurrence_byweekday INTEGER[],
  recurrence_until DATE,
  
  -- 시간 설정
  preferred_time TIME,
  estimated_duration INTEGER, -- 예상 소요 시간 (분)
  
  -- 체크리스트
  checklist JSONB, -- [{id: string, title: string, is_completed: boolean}]
  
  -- 활성화 상태
  is_active BOOLEAN DEFAULT TRUE,
  
  -- 알림
  reminders JSONB,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스
CREATE INDEX idx_routines_user_id ON public.routines(user_id);
CREATE INDEX idx_routines_category_id ON public.routines(category_id);
CREATE INDEX idx_routines_is_active ON public.routines(is_active);
CREATE INDEX idx_routines_routine_type ON public.routines(routine_type);

-- RLS 정책
ALTER TABLE public.routines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own routines" 
  ON public.routines 
  USING (auth.uid() = user_id);

-- ============================================================================
-- 6. ROUTINE_COMPLETIONS 테이블 (루틴 완료 기록)
-- ============================================================================
CREATE TABLE public.routine_completions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  routine_id UUID NOT NULL REFERENCES public.routines(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  
  completion_date DATE NOT NULL,
  completion_time TIME,
  
  -- 체크리스트 완료 상태
  checklist_state JSONB, -- 완료 시점의 체크리스트 상태
  
  -- 노트
  notes TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스
CREATE INDEX idx_routine_completions_routine_id ON public.routine_completions(routine_id);
CREATE INDEX idx_routine_completions_user_id ON public.routine_completions(user_id);
CREATE INDEX idx_routine_completions_date ON public.routine_completions(completion_date);

-- 유니크 제약조건: 하루에 한 번만 완료 가능
CREATE UNIQUE INDEX idx_unique_routine_completion 
  ON public.routine_completions(routine_id, completion_date);

-- RLS 정책
ALTER TABLE public.routine_completions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own routine completions" 
  ON public.routine_completions 
  USING (auth.uid() = user_id);

-- ============================================================================
-- 7. ANALYTICS 테이블 (통계 데이터)
-- ============================================================================
CREATE TABLE public.analytics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  
  date DATE NOT NULL,
  
  -- 일정 통계
  events_count INTEGER DEFAULT 0,
  events_completed INTEGER DEFAULT 0,
  events_duration_minutes INTEGER DEFAULT 0, -- 총 일정 소요 시간
  
  -- 작업 통계
  tasks_count INTEGER DEFAULT 0,
  tasks_completed INTEGER DEFAULT 0,
  tasks_completion_rate DECIMAL(5,2), -- 완료율 (%)
  
  -- 루틴 통계
  routines_count INTEGER DEFAULT 0,
  routines_completed INTEGER DEFAULT 0,
  routines_completion_rate DECIMAL(5,2),
  
  -- 카테고리별 시간 분배
  category_distribution JSONB, -- {category_id: minutes}
  
  -- 생산성 점수
  productivity_score INTEGER, -- 0-100
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스
CREATE INDEX idx_analytics_user_id ON public.analytics(user_id);
CREATE INDEX idx_analytics_date ON public.analytics(date);

-- 유니크 제약조건: 하루에 하나의 analytics 레코드
CREATE UNIQUE INDEX idx_unique_analytics_date 
  ON public.analytics(user_id, date);

-- RLS 정책
ALTER TABLE public.analytics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own analytics" 
  ON public.analytics 
  USING (auth.uid() = user_id);

-- ============================================================================
-- 8. GOOGLE_CALENDAR_SYNC 테이블 (구글 캘린더 동기화 상태)
-- ============================================================================
CREATE TABLE public.google_calendar_sync (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  
  google_calendar_id TEXT NOT NULL,
  calendar_name TEXT,
  calendar_description TEXT,
  is_primary BOOLEAN DEFAULT FALSE,
  
  -- 동기화 설정
  sync_enabled BOOLEAN DEFAULT TRUE,
  sync_direction TEXT DEFAULT 'bidirectional' CHECK (
    sync_direction IN ('import_only', 'export_only', 'bidirectional')
  ),
  
  -- 마지막 동기화
  last_sync_at TIMESTAMPTZ,
  last_sync_token TEXT, -- 증분 동기화를 위한 토큰
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스
CREATE INDEX idx_google_sync_user_id ON public.google_calendar_sync(user_id);
CREATE UNIQUE INDEX idx_unique_google_calendar 
  ON public.google_calendar_sync(user_id, google_calendar_id);

-- RLS 정책
ALTER TABLE public.google_calendar_sync ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own google calendar sync" 
  ON public.google_calendar_sync 
  USING (auth.uid() = user_id);

-- ============================================================================
-- FUNCTIONS & TRIGGERS
-- ============================================================================

-- updated_at 자동 업데이트 함수
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 각 테이블에 updated_at 트리거 적용
CREATE TRIGGER update_profiles_updated_at 
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_categories_updated_at 
  BEFORE UPDATE ON public.categories
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_events_updated_at 
  BEFORE UPDATE ON public.events
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tasks_updated_at 
  BEFORE UPDATE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_routines_updated_at 
  BEFORE UPDATE ON public.routines
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_analytics_updated_at 
  BEFORE UPDATE ON public.analytics
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_google_sync_updated_at 
  BEFORE UPDATE ON public.google_calendar_sync
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 초기 데이터 삽입 함수
-- ============================================================================

-- 신규 사용자를 위한 프로필 및 기본 카테고리 생성 함수
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- 프로필 생성
  INSERT INTO public.profiles (id, email)
  VALUES (NEW.id, NEW.email);
  
  -- 기본 카테고리 생성
  INSERT INTO public.categories (user_id, name_ko, name_en, color, icon, type, is_default, order_index)
  VALUES 
    (NEW.id, '전화상담', 'Call', '#FF2D55', 'phone', ARRAY['calendar']::TEXT[], TRUE, 1),
    (NEW.id, '업무', 'Work', '#FF9500', 'briefcase', ARRAY['calendar', 'task']::TEXT[], TRUE, 2),
    (NEW.id, '미팅', 'Meeting', '#5856D6', 'users', ARRAY['calendar']::TEXT[], TRUE, 3),
    (NEW.id, '개인', 'Personal', '#34C759', 'user', ARRAY['calendar', 'task']::TEXT[], TRUE, 4),
    (NEW.id, '운동', 'Exercise', '#00C7BE', 'dumbbell', ARRAY['routine']::TEXT[], TRUE, 5),
    (NEW.id, '학습', 'Study', '#32ADE6', 'book', ARRAY['task', 'routine']::TEXT[], TRUE, 6);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- auth.users에 새 사용자가 생성될 때 트리거
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
