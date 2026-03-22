-- =====================================================
-- Calendary - 중복 카테고리 정리 (선택사항)
-- =====================================================
-- 설명: 기존에 중복 생성된 카테고리를 정리합니다
-- 실행 방법: Supabase Dashboard > SQL Editor에서 실행
-- 주의: 트리거 설치 후에 실행하세요!
-- =====================================================

-- 🧹 중복된 카테고리 삭제 (가장 오래된 3개만 남기고 삭제)
WITH ranked_categories AS (
  SELECT 
    id,
    user_id,
    name,
    ROW_NUMBER() OVER (PARTITION BY user_id, name ORDER BY created_at ASC) as rn
  FROM public.categories
)
DELETE FROM public.categories
WHERE id IN (
  SELECT id FROM ranked_categories WHERE rn > 1
);

-- ✅ 정리 완료! 확인해보세요:
-- 각 유저당 카테고리 개수 확인
SELECT user_id, COUNT(*) as category_count
FROM public.categories
GROUP BY user_id
ORDER BY category_count DESC;

-- =====================================================
-- ✅ 중복 카테고리 정리 완료!
-- =====================================================
-- 결과: 각 유저당 최대 3개의 카테고리만 남음 (개인, 업무, 휴가)
-- =====================================================
