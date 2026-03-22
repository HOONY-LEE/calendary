# Calendary - Supabase 설정 가이드

이 문서는 Calendary 앱을 위한 Supabase 프로젝트 설정 방법을 안내합니다.

## 📋 목차

1. [Supabase 프로젝트 생성](#1-supabase-프로젝트-생성)
2. [데이터베이스 마이그레이션](#2-데이터베이스-마이그레이션)
3. [환경 변수 설정](#3-환경-변수-설정)
4. [인증 설정](#4-인증-설정)
5. [구글 OAuth 설정](#5-구글-oauth-설정)
6. [데이터베이스 확인](#6-데이터베이스-확인)

## 1. Supabase 프로젝트 생성

### 1.1 Supabase 계정 생성

1. [Supabase](https://supabase.com) 접속
2. "Start your project" 클릭
3. GitHub, Google 등으로 가입

### 1.2 새 프로젝트 생성

1. Dashboard에서 "New Project" 클릭
2. 프로젝트 정보 입력:
   - **Name**: Calendary (또는 원하는 이름)
   - **Database Password**: 강력한 비밀번호 생성 (저장 필수!)
   - **Region**: Northeast Asia (Seoul) - 한국 사용자를 위해
   - **Pricing Plan**: Free 또는 Pro

3. "Create new project" 클릭 (프로젝트 생성에 2-3분 소요)

## 2. 데이터베이스 마이그레이션

### 2.1 SQL Editor 사용

1. Supabase Dashboard → SQL Editor 메뉴 이동
2. "New query" 클릭
3. `/supabase/migrations/001_initial_schema.sql` 파일 내용 복사
4. SQL Editor에 붙여넣기
5. "Run" 버튼 클릭 (또는 Cmd/Ctrl + Enter)

### 2.2 Supabase CLI 사용 (권장)

#### CLI 설치

```bash
# npm
npm install -g supabase

# macOS (Homebrew)
brew install supabase/tap/supabase

# Windows (Scoop)
scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
scoop install supabase
```

#### 프로젝트 연결

```bash
# Supabase 로그인
supabase login

# 프로젝트와 연결
supabase link --project-ref YOUR_PROJECT_ID
```

`YOUR_PROJECT_ID`는 Supabase Dashboard → Settings → General에서 확인 가능

#### 마이그레이션 실행

```bash
# 로컬에서 마이그레이션 실행
supabase db push

# 또는 특정 마이그레이션 파일 실행
supabase db push --file ./supabase/migrations/001_initial_schema.sql
```

## 3. 환경 변수 설정

### 3.1 Supabase 키 가져오기

1. Supabase Dashboard → Settings → API 메뉴
2. 다음 정보 복사:
   - **Project URL**: `https://xxxxx.supabase.co`
   - **anon public key**: `eyJhbGc...` (긴 문자열)

### 3.2 환경 변수 파일 생성

프로젝트 루트에 `.env` 파일 생성:

```bash
cp .env.example .env
```

`.env` 파일 내용:

```env
# Supabase 설정
VITE_SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-public-key-here

# 애플리케이션 설정
VITE_APP_URL=http://localhost:5173
```

⚠️ **주의**: `.env` 파일은 절대 Git에 커밋하지 마세요!

## 4. 인증 설정

### 4.1 이메일 인증 설정

1. Supabase Dashboard → Authentication → Settings
2. **Email Auth** 섹션:
   - ✅ Enable Email provider
   - ✅ Confirm email (이메일 확인 필수 설정)
   
3. **Email Templates** 커스터마이징 (선택):
   - Confirm signup
   - Magic Link
   - Reset password

### 4.2 사이트 URL 설정

1. Authentication → URL Configuration
2. **Site URL**: `http://localhost:5173` (개발) 또는 실제 도메인
3. **Redirect URLs** 추가:
   ```
   http://localhost:5173/**
   https://yourdomain.com/**
   ```

## 5. 구글 OAuth 설정

### 5.1 Google Cloud Console 설정

1. [Google Cloud Console](https://console.cloud.google.com) 접속
2. 새 프로젝트 생성 또는 기존 프로젝트 선택
3. **APIs & Services** → **OAuth consent screen**:
   - User Type: External
   - App name: Calendary
   - User support email: 본인 이메일
   - Developer contact: 본인 이메일

4. **Credentials** → **Create Credentials** → **OAuth client ID**:
   - Application type: Web application
   - Name: Calendary Web Client
   - **Authorized JavaScript origins**:
     ```
     http://localhost:5173
     https://YOUR_PROJECT_ID.supabase.co
     ```
   - **Authorized redirect URIs**:
     ```
     https://YOUR_PROJECT_ID.supabase.co/auth/v1/callback
     ```

5. Client ID와 Client Secret 복사

### 5.2 Google Calendar API 활성화

1. **APIs & Services** → **Library**
2. "Google Calendar API" 검색
3. "Enable" 클릭

### 5.3 Supabase에 Google OAuth 설정

1. Supabase Dashboard → Authentication → Providers
2. **Google** 섹션:
   - ✅ Enable Google provider
   - **Client ID**: Google에서 복사한 Client ID 입력
   - **Client Secret**: Google에서 복사한 Client Secret 입력
   - **Scopes** (선택):
     ```
     https://www.googleapis.com/auth/calendar
     https://www.googleapis.com/auth/calendar.events
     ```

3. "Save" 클릭

### 5.4 환경 변수 추가

`.env` 파일에 추가:

```env
VITE_GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
VITE_GOOGLE_CLIENT_SECRET=your-google-client-secret
```

## 6. 데이터베이스 확인

### 6.1 테이블 확인

1. Supabase Dashboard → Table Editor
2. 다음 테이블이 생성되었는지 확인:
   - ✅ profiles
   - ✅ categories
   - ✅ events
   - ✅ tasks
   - ✅ routines
   - ✅ routine_completions
   - ✅ analytics
   - ✅ google_calendar_sync

### 6.2 RLS (Row Level Security) 확인

1. 각 테이블 클릭
2. **Policies** 탭에서 정책이 활성화되어 있는지 확인

### 6.3 테스트 사용자 생성

#### SQL Editor에서:

```sql
-- 테스트 사용자 생성 (실제 이메일 사용 권장)
INSERT INTO auth.users (
  id,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at
) VALUES (
  gen_random_uuid(),
  'test@calendary.com',
  crypt('test123456', gen_salt('bf')),
  now(),
  now(),
  now()
);
```

또는 **Authentication → Users → Add user**에서 수동 생성

### 6.4 자동 생성 확인

테스트 사용자를 생성하면 자동으로:
- ✅ `profiles` 테이블에 프로필 생성
- ✅ `categories` 테이블에 기본 카테고리 6개 생성

확인:

```sql
-- 프로필 확인
SELECT * FROM profiles WHERE email = 'test@calendary.com';

-- 카테고리 확인
SELECT * FROM categories WHERE user_id = 'USER_ID_HERE';
```

## 7. 개발 환경 실행

```bash
# 패키지 설치
npm install

# Supabase 패키지 설치
npm install @supabase/supabase-js

# 개발 서버 실행
npm run dev
```

## 8. 프로덕션 배포

### 8.1 환경 변수 설정

배포 플랫폼 (Vercel, Netlify 등)에서 환경 변수 설정:

```env
VITE_SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-public-key
VITE_APP_URL=https://your-production-domain.com
VITE_GOOGLE_CLIENT_ID=your-google-client-id
VITE_GOOGLE_CLIENT_SECRET=your-google-client-secret
```

### 8.2 Redirect URLs 업데이트

1. Supabase Dashboard → Authentication → URL Configuration
2. **Redirect URLs**에 프로덕션 도메인 추가:
   ```
   https://your-production-domain.com/**
   ```

3. Google Cloud Console → Credentials에서도 업데이트:
   - Authorized JavaScript origins
   - Authorized redirect URIs

## 9. 데이터베이스 백업

### 9.1 자동 백업 (Pro Plan)

Supabase Pro 플랜에서는 자동 백업 제공:
- Settings → Database → Backups

### 9.2 수동 백업

```bash
# Supabase CLI를 통한 백업
supabase db dump -f backup.sql

# 특정 테이블만 백업
supabase db dump -f backup.sql --table profiles --table events
```

## 10. 문제 해결

### RLS 정책 오류

오류: "new row violates row-level security policy"

해결:
1. Table Editor → 해당 테이블 → Policies 확인
2. 정책이 올바르게 설정되었는지 확인
3. `auth.uid()`가 현재 사용자 ID와 일치하는지 확인

### 마이그레이션 실패

오류: "relation already exists"

해결:
```sql
-- 기존 테이블 삭제 (주의: 데이터 손실!)
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;
GRANT ALL ON SCHEMA public TO postgres;
GRANT ALL ON SCHEMA public TO public;

-- 마이그레이션 재실행
```

### 인증 오류

오류: "Invalid API key"

해결:
1. `.env` 파일의 키가 올바른지 확인
2. `VITE_` 접두사가 있는지 확인
3. 개발 서버 재시작

## 11. 유용한 SQL 쿼리

### 전체 데이터 조회

```sql
-- 사용자별 데이터 통계
SELECT 
  p.email,
  COUNT(DISTINCT e.id) as events_count,
  COUNT(DISTINCT t.id) as tasks_count,
  COUNT(DISTINCT r.id) as routines_count
FROM profiles p
LEFT JOIN events e ON e.user_id = p.id
LEFT JOIN tasks t ON t.user_id = p.id
LEFT JOIN routines r ON r.user_id = p.id
GROUP BY p.id, p.email;
```

### 반복 일정 확인

```sql
-- 반복 일정 목록
SELECT 
  title,
  recurrence_freq,
  rrule,
  start_date
FROM events
WHERE is_recurring = true
ORDER BY start_date DESC;
```

### Analytics 데이터 확인

```sql
-- 최근 30일 생산성 점수
SELECT 
  date,
  productivity_score,
  tasks_completion_rate,
  routines_completion_rate
FROM analytics
WHERE date >= CURRENT_DATE - INTERVAL '30 days'
ORDER BY date DESC;
```

---

## 📚 추가 리소스

- [Supabase 공식 문서](https://supabase.com/docs)
- [Supabase Auth 가이드](https://supabase.com/docs/guides/auth)
- [Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)
- [Google OAuth 설정](https://supabase.com/docs/guides/auth/social-login/auth-google)

## 🆘 도움말

문제가 발생하면:
1. [Supabase Discord](https://discord.supabase.com) 커뮤니티
2. [GitHub Issues](https://github.com/supabase/supabase/issues)
3. Supabase Dashboard → Support

---

**마지막 업데이트**: 2026-03-03
