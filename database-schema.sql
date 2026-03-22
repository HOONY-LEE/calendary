-- Calendary Database Schema
-- 이 SQL을 Supabase SQL Editor에서 실행하세요

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Users 테이블 (Supabase Auth와 연동)
-- auth.users는 Supabase에서 자동 관리되므로 추가 프로필 정보만 저장

CREATE TABLE public.user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  avatar_url TEXT,
  timezone TEXT DEFAULT 'Asia/Seoul',
  language TEXT DEFAULT 'ko',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Categories 테이블 (작업 카테고리)
CREATE TABLE public.categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#94A3B8',
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, name)
);

-- 3. Tasks 테이블 (작업 관리)
CREATE TABLE public.tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL CHECK (type IN ('single', 'routine', 'event')),
  completed BOOLEAN DEFAULT FALSE,
  priority TEXT CHECK (priority IN ('low', 'medium', 'high')),
  due_date DATE,
  due_time TIME,
  -- Routine 관련 필드
  routine_frequency TEXT CHECK (routine_frequency IN ('daily', 'weekly', 'monthly', 'custom')),
  routine_days JSONB, -- 요일 설정 [0,1,2,3,4,5,6]
  routine_rrule TEXT, -- RRule 형식의 반복 규칙
  routine_end_date DATE,
  -- 메타데이터
  position INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- 4. Events 테이블 (캘린더 이벤트)
CREATE TABLE public.events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  all_day BOOLEAN DEFAULT FALSE,
  color TEXT DEFAULT '#0C8CE9',
  location TEXT,
  -- Google Calendar 연동
  google_event_id TEXT,
  google_calendar_id TEXT,
  is_synced BOOLEAN DEFAULT FALSE,
  -- 메타데이터
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Task Completions 테이블 (루틴 작업 완료 기록)
CREATE TABLE public.task_completions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  completed_date DATE NOT NULL,
  completed_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(task_id, completed_date)
);

-- 6. Analytics 테이블 (생산성 분석 데이터)
CREATE TABLE public.analytics_daily (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  tasks_completed INTEGER DEFAULT 0,
  tasks_created INTEGER DEFAULT 0,
  events_count INTEGER DEFAULT 0,
  focus_minutes INTEGER DEFAULT 0,
  categories_data JSONB, -- 카테고리별 통계
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, date)
);

-- 7. Google Calendar 연동 설정
CREATE TABLE public.google_calendar_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  access_token TEXT,
  refresh_token TEXT,
  token_expires_at TIMESTAMPTZ,
  calendar_id TEXT,
  sync_enabled BOOLEAN DEFAULT FALSE,
  last_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for better performance
CREATE INDEX idx_tasks_user_id ON public.tasks(user_id);
CREATE INDEX idx_tasks_due_date ON public.tasks(due_date);
CREATE INDEX idx_tasks_type ON public.tasks(type);
CREATE INDEX idx_events_user_id ON public.events(user_id);
CREATE INDEX idx_events_start_time ON public.events(start_time);
CREATE INDEX idx_categories_user_id ON public.categories(user_id);
CREATE INDEX idx_task_completions_task_id ON public.task_completions(task_id);
CREATE INDEX idx_task_completions_date ON public.task_completions(completed_date);
CREATE INDEX idx_analytics_user_date ON public.analytics_daily(user_id, date);

-- Row Level Security (RLS) 활성화
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_completions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_daily ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.google_calendar_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies: 사용자는 자신의 데이터만 접근 가능

-- user_profiles policies
CREATE POLICY "Users can view own profile" ON public.user_profiles
  FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.user_profiles
  FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.user_profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- categories policies
CREATE POLICY "Users can view own categories" ON public.categories
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own categories" ON public.categories
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own categories" ON public.categories
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own categories" ON public.categories
  FOR DELETE USING (auth.uid() = user_id);

-- tasks policies
CREATE POLICY "Users can view own tasks" ON public.tasks
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own tasks" ON public.tasks
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own tasks" ON public.tasks
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own tasks" ON public.tasks
  FOR DELETE USING (auth.uid() = user_id);

-- events policies
CREATE POLICY "Users can view own events" ON public.events
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own events" ON public.events
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own events" ON public.events
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own events" ON public.events
  FOR DELETE USING (auth.uid() = user_id);

-- task_completions policies
CREATE POLICY "Users can view own completions" ON public.task_completions
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own completions" ON public.task_completions
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own completions" ON public.task_completions
  FOR DELETE USING (auth.uid() = user_id);

-- analytics_daily policies
CREATE POLICY "Users can view own analytics" ON public.analytics_daily
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own analytics" ON public.analytics_daily
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own analytics" ON public.analytics_daily
  FOR UPDATE USING (auth.uid() = user_id);

-- google_calendar_settings policies
CREATE POLICY "Users can view own google settings" ON public.google_calendar_settings
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own google settings" ON public.google_calendar_settings
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own google settings" ON public.google_calendar_settings
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own google settings" ON public.google_calendar_settings
  FOR DELETE USING (auth.uid() = user_id);

-- Functions and Triggers

-- 1. updated_at 자동 업데이트 함수
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- updated_at 트리거 적용
CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON public.user_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_categories_updated_at BEFORE UPDATE ON public.categories
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_events_updated_at BEFORE UPDATE ON public.events
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_google_calendar_settings_updated_at BEFORE UPDATE ON public.google_calendar_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 2. 신규 사용자 프로필 자동 생성
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- 사용자 프로필 생성
  INSERT INTO public.user_profiles (id, display_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.email)
  );
  
  -- 기본 카테고리 생성
  INSERT INTO public.categories (user_id, name, color, is_default)
  VALUES (NEW.id, '기타', '#94A3B8', TRUE);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 신규 사용자 트리거
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 3. Task 완료 시 completed_at 업데이트
CREATE OR REPLACE FUNCTION update_task_completed_at()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.completed = TRUE AND OLD.completed = FALSE THEN
    NEW.completed_at = NOW();
  ELSIF NEW.completed = FALSE AND OLD.completed = TRUE THEN
    NEW.completed_at = NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER task_completed_trigger BEFORE UPDATE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION update_task_completed_at();

-- 초기 데이터 확인 쿼리 (선택사항)
-- SELECT * FROM public.categories;
-- SELECT * FROM public.tasks;
-- SELECT * FROM public.events;
