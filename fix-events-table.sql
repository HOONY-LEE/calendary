-- Calendary Events 테이블 및 RLS 정책 설정
-- 기존 테이블이 있을 경우를 대비한 안전한 생성

-- 1. Events 테이블 생성 (없을 경우에만)
CREATE TABLE IF NOT EXISTS public.events (
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

-- 2. 인덱스 생성 (이미 있으면 무시됨)
CREATE INDEX IF NOT EXISTS idx_events_user_id ON public.events(user_id);
CREATE INDEX IF NOT EXISTS idx_events_start_time ON public.events(start_time);

-- 3. RLS 활성화
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

-- 4. 기존 정책 삭제 (있을 경우)
DROP POLICY IF EXISTS "Users can view own events" ON public.events;
DROP POLICY IF EXISTS "Users can insert own events" ON public.events;
DROP POLICY IF EXISTS "Users can update own events" ON public.events;
DROP POLICY IF EXISTS "Users can delete own events" ON public.events;

-- 5. RLS 정책 생성
CREATE POLICY "Users can view own events" ON public.events
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own events" ON public.events
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own events" ON public.events
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own events" ON public.events
  FOR DELETE USING (auth.uid() = user_id);

-- 6. updated_at 트리거 (함수가 이미 있다고 가정)
-- 함수가 없으면 먼저 생성
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 트리거 생성 (이미 있으면 먼저 삭제)
DROP TRIGGER IF EXISTS update_events_updated_at ON public.events;
CREATE TRIGGER update_events_updated_at 
  BEFORE UPDATE ON public.events
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 7. 확인 쿼리
SELECT 'Events 테이블 설정 완료!' as status;

-- RLS 정책 확인
SELECT policyname, cmd 
FROM pg_policies 
WHERE schemaname = 'public' AND tablename = 'events';
