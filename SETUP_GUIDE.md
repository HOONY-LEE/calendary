# Calendary Supabase 설정 가이드

## 1. Supabase 프로젝트 설정

### 1.1 데이터베이스 스키마 생성
1. Supabase Dashboard에 접속
2. SQL Editor로 이동
3. `/database-schema.sql` 파일의 내용을 복사하여 실행
4. 실행 완료 후 Table Editor에서 테이블 생성 확인

### 1.2 Google OAuth 설정

#### Supabase 설정
1. Supabase Dashboard → Authentication → Providers
2. Google Provider 활성화
3. Redirect URL 확인: `https://<your-project-id>.supabase.co/auth/v1/callback`

#### Google Cloud Console 설정
1. [Google Cloud Console](https://console.cloud.google.com/) 접속
2. 새 프로젝트 생성 또는 기존 프로젝트 선택
3. "APIs & Services" → "OAuth consent screen" 설정
   - User Type: External 선택
   - App name: Calendary
   - User support email: 본인 이메일
   - Authorized domains: `supabase.co` 추가
   - Developer contact: 본인 이메일

4. "Credentials" → "Create Credentials" → "OAuth 2.0 Client ID"
   - Application type: Web application
   - Name: Calendary Web Client
   - Authorized JavaScript origins: 
     - `http://localhost:5173` (개발용)
     - `https://<your-domain>` (프로덕션용)
   - Authorized redirect URIs:
     - `https://<your-project-id>.supabase.co/auth/v1/callback`

5. Client ID와 Client Secret 복사

6. Supabase Dashboard로 돌아가서:
   - Google Provider에 Client ID와 Client Secret 입력
   - Save 클릭

### 1.3 환경 변수 확인
- `/utils/supabase/info.tsx` 파일에 프로젝트 정보가 자동으로 설정되어 있는지 확인

## 2. 데이터베이스 구조 설명

### 멀티테넌트 구조
- **Row Level Security (RLS)** 활성화로 각 사용자는 자신의 데이터만 접근 가능
- 모든 테이블에 `user_id` 컬럼이 있어 사용자별 데이터 격리
- Supabase Auth의 `auth.uid()`를 사용하여 현재 로그인한 사용자 식별

### 주요 테이블

#### user_profiles
- 사용자 추가 정보 (이름, 아바타, 언어 설정 등)
- Auth.users와 1:1 관계

#### categories
- 작업 카테고리 관리
- 사용자별 독립적인 카테고리

#### tasks
- 단일 작업, 루틴, 이벤트 모두 관리
- type 필드로 구분: 'single', 'routine', 'event'
- 루틴 작업은 RRule 형식으로 반복 규칙 저장

#### events
- 캘린더 이벤트 정보
- Google Calendar와 연동 가능

#### task_completions
- 루틴 작업의 날짜별 완료 기록
- 단일 작업은 tasks 테이블의 completed 필드 사용

#### analytics_daily
- 일별 생산성 통계 데이터

#### google_calendar_settings
- Google Calendar 연동 설정 및 토큰 저장

## 3. 주요 기능

### 자동 트리거
1. **신규 사용자 자동 설정**: 회원가입 시 기본 프로필과 "기타" 카테고리 자동 생성
2. **updated_at 자동 업데이트**: 레코드 수정 시 자동으로 타임스탬프 갱신
3. **completed_at 자동 관리**: 작업 완료 시 완료 시간 자동 기록

### RLS 정책
- 모든 테이블에 사용자별 접근 제어 적용
- 사용자는 자신의 데이터만 CRUD 가능

## 4. 다음 단계

### 백엔드 API 개발
1. Supabase Edge Functions 또는 직접 Supabase Client 사용
2. Tasks CRUD API 구현
3. Events CRUD API 구현
4. Google Calendar 동기화 API 구현
5. Analytics 데이터 집계 API 구현

### 프론트엔드 연동
1. Tasks.tsx를 Supabase와 연동
2. Calendar.tsx 이벤트 데이터 연동
3. Analytics.tsx 통계 데이터 연동
4. 실시간 구독 기능 추가 (Supabase Realtime)

## 5. 보안 체크리스트

- [x] RLS 활성화
- [x] 사용자별 데이터 격리
- [x] Auth 기반 정책 설정
- [ ] Google OAuth 설정 완료
- [ ] HTTPS 사용 (프로덕션)
- [ ] API Rate Limiting 설정
- [ ] 민감 정보 암호화 (토큰 등)

## 6. 참고 링크

- [Supabase 공식 문서](https://supabase.com/docs)
- [Google OAuth 설정 가이드](https://supabase.com/docs/guides/auth/social-login/auth-google)
- [Row Level Security 가이드](https://supabase.com/docs/guides/auth/row-level-security)
