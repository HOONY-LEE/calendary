-- 카테고리 시스템 수정: 유저별 독립적인 단순 기본 카테고리
-- 실행 방법: Supabase Dashboard > SQL Editor에서 이 SQL을 복사하여 실행하세요

-- 1. 기존 handle_new_user 함수 삭제
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- 2. 새로운 handle_new_user 함수 생성 (기본 카테고리 1개만 생성)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- 프로필 생성
  INSERT INTO public.profiles (id, email)
  VALUES (NEW.id, NEW.email)
  ON CONFLICT (id) DO NOTHING;
  
  -- 기본 카테고리 1개만 생성: "기타" / "Other"
  INSERT INTO public.categories (user_id, name_ko, name_en, color, icon, type, is_default, order_index)
  VALUES (NEW.id, '기타', 'Other', '#94A3B8', 'tag', ARRAY['calendar', 'task', 'routine']::TEXT[], TRUE, 1)
  ON CONFLICT DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. 트리거 재생성
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 4. (선택사항) 기존 카테고리 데이터 정리
-- 주의: 이 쿼리는 모든 기본 카테고리를 삭제합니다. 
-- 실제 사용 중인 이벤트/태스크가 연결되어 있다면 주의하세요.
-- 필요한 경우에만 아래 주석을 해제하고 실행하세요:

-- DELETE FROM public.categories 
-- WHERE is_default = TRUE 
-- AND name_ko IN ('전화상담', '업무', '미팅', '개인', '운동', '학습');

-- 완료 확인
SELECT 'Migration 002 completed successfully' as status;
