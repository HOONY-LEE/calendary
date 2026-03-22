# 카테고리 데이터 정리 가이드

## 문제 상황
현재 DB에 "전화상담", "업무", "미팅", "개인", "운동", "학습" 등의 기본 카테고리가 생성되어 있습니다.
이제부터는 각 유저마다 독립적으로 "기타" 카테고리 하나만 기본으로 생성됩니다.

## 해결 방법

### 1. 데이터베이스 마이그레이션 (Supabase 트리거 수정)

1. **Supabase Dashboard** 접속
2. **SQL Editor** 메뉴로 이동
3. `/supabase/migrations/002_fix_categories.sql` 파일의 내용을 복사하여 실행
4. 이 작업은 다음을 수행합니다:
   - 신규 사용자 가입 시 "기타" 카테고리 하나만 생성하도록 트리거 수정
   - (선택사항) 기존 기본 카테고리 삭제

### 2. KV Store 카테고리 데이터 리셋

현재 로그인한 사용자의 카테고리 데이터를 초기화하려면:

#### 방법 1: 브라우저 콘솔에서 직접 실행

1. 브라우저 개발자 도구 열기 (F12)
2. Console 탭으로 이동
3. 다음 코드 실행:

```javascript
// 카테고리 리셋 API 호출
const accessToken = localStorage.getItem('supabase.auth.token');
const token = accessToken ? JSON.parse(accessToken).access_token : null;

if (token) {
  fetch('https://YOUR_PROJECT_ID.supabase.co/functions/v1/make-server-f973dbc1/categories/reset', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    }
  })
  .then(res => res.json())
  .then(data => {
    console.log('카테고리 리셋 완료:', data);
    // 페이지 새로고침
    window.location.reload();
  })
  .catch(err => console.error('에러:', err));
} else {
  console.error('로그인 토큰을 찾을 수 없습니다.');
}
```

#### 방법 2: Calendar 페이지에서 임시 리셋 기능 사용

Calendar 페이지에서 개발자 도구 콘솔을 열고 다음 명령어 실행:

```javascript
// React 컴포넌트에서 직접 호출 (useAuth 훅 사용)
// Calendar 페이지가 열려있는 상태에서 실행
window.resetCategories();
```

## 변경사항 요약

### Before (이전)
- 신규 가입 시 6개 기본 카테고리 자동 생성: 전화상담, 업무, 미팅, 개인, 운동, 학습
- 모든 사용자가 동일한 기본 카테고리를 가짐

### After (변경 후)
- 신규 가입 시 1개 기본 카테고리만 생성: "기타" (Other)
- 각 유저가 독립적으로 자신만의 카테고리 생성 및 관리
- 카테고리는 user_id로 완전히 분리되어 RLS로 보호됨

## 주의사항

⚠️ **카테고리 리셋 시 주의사항:**
- 카테고리를 리셋하면 기존에 생성한 모든 카테고리가 삭제됩니다.
- 이벤트에 연결된 카테고리도 참조가 해제될 수 있습니다.
- 중요한 데이터가 있다면 먼저 백업하세요.

## 확인 방법

카테고리가 정상적으로 리셋되었는지 확인:

1. Calendar 페이지 새로고침
2. 이벤트 생성 팝업에서 카테고리 확인
3. "기타" 카테고리만 표시되어야 함
4. 새로운 카테고리 추가 가능
