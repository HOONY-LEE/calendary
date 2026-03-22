-- =====================================================
-- Calendary - 기본 카테고리 자동 생성 트리거
-- =====================================================
-- 설명: 새 유저 생성 시 자동으로 기본 카테고리 3개 생성
-- 실행 방법: Supabase Dashboard > SQL Editor에서 실행
-- =====================================================

-- 1️⃣ 트리거 함수 생성: 새 유저 생성 시 자동으로 기본 카테고리 3개 생성
CREATE OR REPLACE FUNCTION public.create_default_categories_for_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- 중복 방지: 이미 카테고리가 있는지 체크
  IF NOT EXISTS (
    SELECT 1 FROM public.categories WHERE user_id = NEW.id
  ) THEN
    -- 기본 카테고리 3개 삽입
    INSERT INTO public.categories (user_id, name, color, icon, type, is_default, order_index)
    VALUES 
      (NEW.id, '개인', '#FF2D55', 'tag', ARRAY['calendar', 'task']::text[], true, 1),
      (NEW.id, '업무', '#007AFF', 'tag', ARRAY['calendar', 'task']::text[], false, 2),
      (NEW.id, '휴가', '#34C759', 'tag', ARRAY['calendar', 'task']::text[], false, 3);
    
    -- 로그 (선택사항 - Supabase 로그에서 확인 가능)
    RAISE NOTICE 'Created 3 default categories for user: %', NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2️⃣ 트리거 생성: auth.users 테이블에 새 유저 INSERT 시 자동 실행
CREATE OR REPLACE TRIGGER trigger_create_default_categories
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.create_default_categories_for_new_user();

-- =====================================================
-- ✅ 트리거 설치 완료!
-- =====================================================
-- 다음 작업:
-- 1. 위 SQL을 복사하여 Supabase SQL Editor에서 실행
-- 2. 아래의 중복 카테고리 정리 SQL 실행 (선택사항)
-- =====================================================
