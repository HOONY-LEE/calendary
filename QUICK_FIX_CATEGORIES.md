# 카테고리 즉시 수정 가이드 ⚡

현재 DB에 불필요한 카테고리들(전화상담, 업무, 미팅, 개인, 운동, 학습)이 있는 문제를 해결합니다.

## 🚀 빠른 해결 방법 (2단계)

### 1단계: 데이터베이스 트리거 수정

**Supabase Dashboard** → **SQL Editor**에서 실행:

```sql
-- 기존 트리거 삭제
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- 새 트리거 생성 (기본 카테고리 1개만)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (NEW.id, NEW.email)
  ON CONFLICT (id) DO NOTHING;
  
  INSERT INTO public.categories (user_id, name_ko, name_en, color, icon, type, is_default, order_index)
  VALUES (NEW.id, '기타', 'Other', '#94A3B8', 'tag', ARRAY['calendar', 'task', 'routine']::TEXT[], TRUE, 1)
  ON CONFLICT DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

### 2단계: 현재 사용자 카테고리 리셋

**브라우저 개발자 도구 (F12)** → **Console**에서 실행:

```javascript
// 프로젝트 ID를 실제 값으로 변경하세요
const PROJECT_ID = 'YOUR_PROJECT_ID_HERE';

// 세션에서 토큰 가져오기
const session = JSON.parse(localStorage.getItem('sb-' + PROJECT_ID + '-auth-token') || '{}');
const token = session?.access_token;

if (token) {
  fetch(`https://${PROJECT_ID}.supabase.co/functions/v1/make-server-f973dbc1/categories/reset`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    }
  })
  .then(res => res.json())
  .then(data => {
    console.log('✅ 카테고리 리셋 완료:', data);
    alert('카테고리가 초기화되었습니다. 페이지를 새로고침합니다.');
    window.location.reload();
  })
  .catch(err => {
    console.error('❌ 에러:', err);
    alert('에러가 발생했습니다: ' + err.message);
  });
} else {
  alert('로그인 토큰을 찾을 수 없습니다. 다시 로그인해주세요.');
}
```

## ✅ 완료 확인

1. 페이지 새로고침
2. Calendar 페이지에서 이벤트 생성 시도
3. 카테고리 드롭다운에 "기타" (또는 "Other")만 표시되어야 함
4. ✨ 완료!

## 📝 이제부터

- ✅ 각 유저가 독립적으로 자신만의 카테고리 관리
- ✅ 신규 가입자는 "기타" 카테고리 1개만 기본 제공
- ✅ RLS로 완전히 보호된 유저별 데이터
- ✅ 필요한 카테고리는 직접 추가 가능

## ⚠️ 주의사항

- 카테고리 리셋 시 **기존 카테고리가 모두 삭제**됩니다
- 이벤트에 연결된 카테고리 참조도 해제됩니다
- 중요한 데이터는 미리 백업하세요
