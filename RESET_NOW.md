# 🚀 카테고리 즉시 리셋하기

## 📌 프로젝트 정보
- **프로젝트 ID**: `mewukojmfdghsmmciaps`
- **Supabase URL**: `https://mewukojmfdghsmmciaps.supabase.co`

---

## ✅ 1단계: 데이터베이스 트리거 수정

**Supabase Dashboard** → **SQL Editor**로 이동하여 아래 SQL 실행:

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

SELECT 'Database trigger updated successfully ✅' as status;
```

---

## ✅ 2단계: 현재 사용자 카테고리 리셋

### 방법 1: 간단한 방법 (권장) 🌟

1. **Calendar 페이지 열기**
2. **브라우저 개발자 도구 열기** (F12 또는 Ctrl+Shift+I)
3. **Console 탭**에서 아래 명령어 실행:

```javascript
resetCategories()
```

끝! 자동으로 페이지가 새로고침되고 "기타" 카테고리만 남습니다.

---

### 방법 2: 직접 실행 (어디서든 가능)

**브라우저 개발자 도구 (F12)** → **Console**에서 실행:

```javascript
const PROJECT_ID = 'mewukojmfdghsmmciaps';
const session = JSON.parse(localStorage.getItem(`sb-${PROJECT_ID}-auth-token`) || '{}');
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

---

## ✅ 완료 확인

리셋 후 다음을 확인하세요:

1. ✅ Calendar 페이지 새로고침
2. ✅ 이벤트 생성 팝오버 열기
3. ✅ 카테고리 드롭다운에 "기타" (또는 "Other") 하나만 표시
4. ✅ 새로운 카테고리 추가 가능

---

## 🎉 이제부터

- ✅ 각 유저가 독립적으로 자신만의 카테고리 관리
- ✅ 신규 가입자는 "기타" 카테고리 1개만 기본 제공  
- ✅ RLS로 완전히 보호된 유저별 데이터
- ✅ 필요한 카테고리는 Calendar 페이지에서 직접 추가

---

## ⚠️ 주의사항

- 카테고리 리셋 시 기존에 생성한 모든 카테고리가 삭제됩니다
- 이벤트에 연결된 카테고리 참조도 해제될 수 있습니다
- 중요한 데이터는 미리 백업하세요

---

## 🆘 문제가 발생했나요?

**로그인이 안 되어 있는 경우:**
1. 다시 로그인
2. Calendar 페이지 이동
3. `resetCategories()` 실행

**여전히 안 되는 경우:**
- 브라우저 콘솔에서 에러 메시지 확인
- 네트워크 탭에서 API 요청 상태 확인
- Supabase Dashboard에서 SQL 실행 결과 확인
