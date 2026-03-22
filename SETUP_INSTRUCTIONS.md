# Calendary 데이터베이스 설정 가이드

## 🚀 Supabase 데이터베이스 초기 설정

### 단계 1: Supabase Dashboard 접속
1. https://supabase.com 로그인
2. 프로젝트 선택

### 단계 2: SQL Editor에서 스키마 실행

1. **왼쪽 사이드바** → **SQL Editor** 클릭
2. **New query** 버튼 클릭  
3. 아래 SQL 전체를 복사하여 붙여넣기
4. **Run** 또는 `Ctrl/Cmd + Enter` 실행

### 단계 3: 실행할 SQL

프로젝트 루트의 `/database-schema.sql` 파일 전체를 복사하여 실행하세요.

또는 아래 명령어를 순서대로 실행:

```sql
-- 1. UUID 확장 활성화 확인
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. 테이블 생성 (database-schema.sql 참조)
-- 3. RLS 정책 설정 (이미 포함됨)
-- 4. 인덱스 생성 (이미 포함됨)
-- 5. 함수 및 트리거 생성 (이미 포함됨)
```

### 단계 4: 확인

SQL Editor에서 다음 쿼리로 테이블 확인:

```sql
-- 테이블 목록 확인
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public';

-- Events 테이블 구조 확인
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'events' AND table_schema = 'public';

-- RLS 정책 확인
SELECT schemaname, tablename, policyname 
FROM pg_policies 
WHERE schemaname = 'public' AND tablename = 'events';
```

### ✅ 예상 결과

**테이블 목록**:
- user_profiles
- categories
- tasks
- events ✅
- task_completions
- analytics_daily
- google_calendar_settings

**Events 테이블 RLS 정책**:
- Users can view own events (SELECT)
- Users can insert own events (INSERT)
- Users can update own events (UPDATE)
- Users can delete own events (DELETE)

## ⚠️ 문제 해결

### "일정을 불러오는데 실패했습니다" 에러가 발생하는 경우

1. **브라우저 콘솔 확인** (F12)
   - `[Calendar] Failed to load events` 메시지 확인
   - HTTP 상태 코드 확인 (401, 403, 500 등)

2. **주요 원인별 해결 방법**:

   **401 Unauthorized 에러**:
   - 로그아웃 후 다시 로그인
   - 토큰이 만료되었을 가능성

   **403 Forbidden 에러**:
   - RLS 정책이 제대로 설정되지 않음
   - 위의 SQL을 다시 실행

   **500 Server Error**:
   - events 테이블이 생성되지 않음
   - database-schema.sql 전체 재실행

   **"relation 'public.events' does not exist" 에러**:
   - events 테이블이 없음
   - database-schema.sql 실행 필요

3. **일정이 0개인 경우**:
   - 정상입니다! 신규 사용자는 일정이 없습니다
   - 캘린더에서 날짜를 클릭하여 일정을 생성해보세요

## 📝 Google OAuth 추가 설정 (선택사항)

Google 로그인을 사용 중이라면 추가 설정이 필요할 수 있습니다:

1. Supabase Dashboard → **Authentication** → **Providers**
2. **Google** 활성화 및 Client ID/Secret 입력
3. 설정 가이드: https://supabase.com/docs/guides/auth/social-login/auth-google

## 🎯 다음 단계

데이터베이스 설정이 완료되면:
1. 앱을 새로고침 (F5)
2. 캘린더 페이지 접속
3. 날짜를 클릭하여 첫 일정 생성
4. 브라우저 콘솔에서 로그 확인:
   - `[Calendar] Successfully loaded 0 events` → 정상 (일정 없음)
   - `[Calendar] Successfully loaded 1 events` → 일정 생성 성공!
