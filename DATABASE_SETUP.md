# Calendary 데이터베이스 설정 가이드

## "Failed to fetch" 에러 해결 방법

이 에러는 Supabase 데이터베이스에 필요한 테이블이 생성되지 않았을 때 발생합니다.

## 설정 단계

### 1. Supabase 프로젝트 열기

1. [Supabase Dashboard](https://supabase.com/dashboard)에 로그인
2. 프로젝트 선택: `mewukojmfdghsmmciaps`

### 2. SQL Editor에서 스크립트 실행

1. 왼쪽 메뉴에서 **SQL Editor** 클릭
2. **New query** 버튼 클릭
3. `supabase-setup.sql` 파일의 내용을 복사하여 붙여넣기
4. **Run** 버튼 클릭 (또는 Ctrl/Cmd + Enter)

### 3. 테이블 생성 확인

1. 왼쪽 메뉴에서 **Table Editor** 클릭
2. 다음 테이블이 생성되었는지 확인:
   - ✅ `categories` - 카테고리 데이터
   - ✅ `events` - 이벤트 데이터

### 4. RLS 정책 확인 (선택사항)

1. 각 테이블 클릭
2. 오른쪽 상단의 **RLS** 버튼 확인
3. 정책이 활성화되어 있어야 함:
   - Users can view their own [table]
   - Users can create their own [table]
   - Users can update their own [table]
   - Users can delete their own [table]

## 생성되는 테이블 구조

### Categories 테이블
```
- id: UUID (Primary Key)
- user_id: UUID (외래키 - auth.users)
- name_ko: TEXT (한국어 이름)
- name_en: TEXT (영어 이름)
- color: TEXT (색상 코드)
- icon: TEXT (아이콘)
- type: TEXT[] (타입 배열)
- is_default: BOOLEAN (기본 카테고리 여부)
- order_index: INTEGER (정렬 순서)
- created_at: TIMESTAMPTZ
- updated_at: TIMESTAMPTZ
```

### Events 테이블
```
- id: UUID (Primary Key)
- user_id: UUID (외래키 - auth.users)
- category_id: UUID (외래키 - categories)
- task_id: UUID
- title: TEXT (제목)
- description: TEXT (설명)
- start_date: DATE (시작 날짜)
- end_date: DATE (종료 날짜)
- start_time: TIMESTAMPTZ (시작 시간)
- end_time: TIMESTAMPTZ (종료 시간)
- location: TEXT (장소)
- rrule: TEXT (반복 규칙)
- google_event_id: TEXT
- google_calendar_id: TEXT
- is_synced: BOOLEAN
- created_at: TIMESTAMPTZ
- updated_at: TIMESTAMPTZ
```

## Google OAuth 설정 (선택사항)

Google 로그인을 사용하려면:

1. Supabase Dashboard → **Authentication** → **Providers**
2. **Google** 활성화
3. [Google Cloud Console](https://console.cloud.google.com/)에서:
   - OAuth 2.0 클라이언트 ID 생성
   - Authorized redirect URIs 추가:
     ```
     https://mewukojmfdghsmmciaps.supabase.co/auth/v1/callback
     ```
4. Client ID와 Client Secret을 Supabase에 입력

자세한 가이드: https://supabase.com/docs/guides/auth/social-login/auth-google

## 문제 해결

### 여전히 "Failed to fetch" 에러가 발생하는 경우

1. **브라우저 콘솔 확인**
   - F12를 눌러 개발자 도구 열기
   - Console 탭에서 상세 에러 메시지 확인

2. **네트워크 탭 확인**
   - Network 탭에서 실패한 요청 확인
   - URL이 올바른지 확인: `https://mewukojmfdghsmmciaps.supabase.co/rest/v1/...`

3. **Supabase 프로젝트 상태 확인**
   - Dashboard에서 프로젝트가 **Active** 상태인지 확인
   - Paused 상태라면 Restore 클릭

4. **RLS 정책 재확인**
   - Table Editor에서 각 테이블의 RLS 정책 확인
   - 정책이 없다면 `supabase-setup.sql` 다시 실행

## 지원

문제가 계속되면:
- Supabase Logs 확인: Dashboard → Logs
- 브라우저 콘솔의 에러 메시지 복사
- GitHub Issues에 리포트
