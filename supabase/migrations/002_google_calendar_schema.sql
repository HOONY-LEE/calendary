-- ============================================================================
-- Calendary - Google Calendar 호환 스키마 (2.0)
-- 기존 데이터를 모두 삭제하고 구글 캘린더 형식으로 통일
-- ============================================================================

-- 1. 기존 테이블 삭제 (데이터 포함)
DROP TABLE IF EXISTS public.events CASCADE;
DROP TABLE IF EXISTS public.categories CASCADE;

-- ============================================================================
-- 2. CATEGORIES 테이블 재생성
-- ============================================================================
CREATE TABLE public.categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- 카테고리 정보
  name_ko TEXT NOT NULL,
  name_en TEXT NOT NULL,
  color TEXT NOT NULL, -- HEX 색상 코드
  icon TEXT DEFAULT 'tag',
  
  -- 카테고리 타입
  type TEXT[] DEFAULT ARRAY['calendar']::TEXT[], -- calendar, task, routine
  is_default BOOLEAN DEFAULT FALSE,
  order_index INTEGER DEFAULT 0,
  
  -- 메타데이터
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스
CREATE INDEX idx_categories_user_id ON public.categories(user_id);

-- RLS 정책
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own categories" 
  ON public.categories FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own categories" 
  ON public.categories FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own categories" 
  ON public.categories FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own categories" 
  ON public.categories FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- 3. EVENTS 테이블 재생성 (Google Calendar 호환)
-- ============================================================================
CREATE TABLE public.events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  
  -- Google Calendar 기본 필드
  summary TEXT NOT NULL, -- 제목 (Google: summary)
  description TEXT, -- 설명
  location TEXT, -- 장소
  
  -- 시간 정보 (Google Calendar 형식)
  -- start.dateTime 또는 start.date
  start_datetime TIMESTAMPTZ, -- 시간이 있는 일정
  start_date DATE, -- 종일 일정
  start_timezone TEXT DEFAULT 'Asia/Seoul',
  
  -- end.dateTime 또는 end.date  
  end_datetime TIMESTAMPTZ, -- 시간이 있는 일정
  end_date DATE, -- 종일 일정
  end_timezone TEXT DEFAULT 'Asia/Seoul',
  
  -- 일정 타입
  is_all_day BOOLEAN DEFAULT FALSE,
  
  -- Google Calendar 색상
  color_id TEXT, -- Google Calendar colorId (1-11)
  background_color TEXT, -- HEX 색상 (category 색상 또는 custom)
  foreground_color TEXT, -- 텍스트 색상
  
  -- 반복 일정 (Google Calendar recurrence)
  recurrence TEXT[], -- RRULE 배열 (예: ["RRULE:FREQ=WEEKLY;BYDAY=MO,WE"])
  is_recurring BOOLEAN DEFAULT FALSE,
  recurring_event_id UUID REFERENCES public.events(id) ON DELETE CASCADE,
  original_start_time TIMESTAMPTZ, -- 반복 일정의 원래 시작 시간
  
  -- 참석자 (Google Calendar attendees)
  attendees JSONB, -- [{ email, displayName, responseStatus, organizer, self }]
  organizer JSONB, -- { email, displayName, self }
  creator JSONB, -- { email, displayName, self }
  
  -- 알림 (Google Calendar reminders)
  reminders JSONB, -- { useDefault: boolean, overrides: [{ method, minutes }] }
  
  -- 투명도 및 공개 설정
  transparency TEXT DEFAULT 'opaque', -- opaque, transparent
  visibility TEXT DEFAULT 'default', -- default, public, private, confidential
  
  -- 상태
  status TEXT DEFAULT 'confirmed', -- confirmed, tentative, cancelled
  
  -- Google Calendar 연동
  google_event_id TEXT UNIQUE, -- Google Calendar Event ID
  google_calendar_id TEXT, -- 어느 Google Calendar에서 왔는지
  google_ical_uid TEXT, -- iCalUID
  google_html_link TEXT, -- Google Calendar 웹 링크
  etag TEXT, -- Google Calendar ETag
  
  -- Gmail 연동
  event_type TEXT DEFAULT 'default', -- default, outOfOffice, focusTime, fromGmail
  source JSONB, -- Gmail에서 생성된 경우 { url, title }
  
  -- 동기화 정보
  synced_at TIMESTAMPTZ,
  last_modified TIMESTAMPTZ DEFAULT NOW(),
  
  -- 메타데이터
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- 제약 조건: start_datetime 또는 start_date 중 하나는 반드시 존재
  CONSTRAINT check_start_time CHECK (
    (start_datetime IS NOT NULL AND start_date IS NULL) OR
    (start_datetime IS NULL AND start_date IS NOT NULL)
  ),
  
  -- 제약 조건: end_datetime 또는 end_date 중 하나는 반드시 존재
  CONSTRAINT check_end_time CHECK (
    (end_datetime IS NOT NULL AND end_date IS NULL) OR
    (end_datetime IS NULL AND end_date IS NOT NULL)
  )
);

-- 인덱스
CREATE INDEX idx_events_user_id ON public.events(user_id);
CREATE INDEX idx_events_category_id ON public.events(category_id);
CREATE INDEX idx_events_start_datetime ON public.events(start_datetime);
CREATE INDEX idx_events_start_date ON public.events(start_date);
CREATE INDEX idx_events_end_datetime ON public.events(end_datetime);
CREATE INDEX idx_events_end_date ON public.events(end_date);
CREATE INDEX idx_events_google_event_id ON public.events(google_event_id);
CREATE INDEX idx_events_is_recurring ON public.events(is_recurring);
CREATE INDEX idx_events_recurring_event_id ON public.events(recurring_event_id);

-- RLS 정책
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own events" 
  ON public.events FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own events" 
  ON public.events FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own events" 
  ON public.events FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own events" 
  ON public.events FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- 4. 트리거 함수 (updated_at 자동 업데이트)
-- ============================================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Categories 트리거
CREATE TRIGGER update_categories_updated_at
  BEFORE UPDATE ON public.categories
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Events 트리거
CREATE TRIGGER update_events_updated_at
  BEFORE UPDATE ON public.events
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 완료
-- ============================================================================
