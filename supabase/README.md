# Calendary - Supabase 데이터베이스 스키마

Calendary 개인 생산성 OS의 데이터베이스 스키마 문서입니다.

## 📋 목차

1. [테이블 구조](#테이블-구조)
2. [관계도](#관계도)
3. [반복 일정 처리](#반복-일정-처리)
4. [구글 캘린더 연동](#구글-캘린더-연동)
5. [보안 정책](#보안-정책)

## 🗂️ 테이블 구조

### 1. `profiles` - 사용자 프로필

사용자의 추가 프로필 정보를 저장합니다. (Supabase Auth의 `auth.users` 확장)

| 컬럼 | 타입 | 설명 |
|------|------|------|
| `id` | UUID | Primary Key (auth.users 참조) |
| `email` | TEXT | 이메일 (고유) |
| `full_name` | TEXT | 사용자 이름 |
| `avatar_url` | TEXT | 프로필 이미지 URL |
| `timezone` | TEXT | 시간대 (기본: Asia/Seoul) |
| `language` | TEXT | 언어 설정 (ko/en) |
| `theme` | TEXT | 테마 (light/dark/system) |
| `google_calendar_connected` | BOOLEAN | 구글 캘린더 연동 여부 |
| `google_refresh_token` | TEXT | 구글 OAuth 리프레시 토큰 |
| `google_access_token` | TEXT | 구글 OAuth 액세스 토큰 |
| `google_token_expiry` | TIMESTAMPTZ | 토큰 만료 시간 |

### 2. `categories` - 카테고리

일정, 작업, 루틴의 카테고리를 관리합니다.

| 컬럼 | 타입 | 설명 |
|------|------|------|
| `id` | UUID | Primary Key |
| `user_id` | UUID | 사용자 ID (profiles 참조) |
| `name_ko` | TEXT | 한글 이름 |
| `name_en` | TEXT | 영문 이름 |
| `color` | TEXT | Hex 색상 코드 (#FF2D55) |
| `icon` | TEXT | 아이콘 식별자 |
| `type` | TEXT[] | 카테고리 타입 (calendar/task/routine) |
| `is_default` | BOOLEAN | 시스템 기본 카테고리 여부 |
| `order_index` | INTEGER | 표시 순서 |

**기본 카테고리:**
- 전화상담 (Call) - #FF2D55 - 📞
- 업무 (Work) - #FF9500 - 💼
- 미팅 (Meeting) - #5856D6 - 👥
- 개인 (Personal) - #34C759 - 👤
- 운동 (Exercise) - #00C7BE - 🏋️
- 학습 (Study) - #32ADE6 - 📚

### 3. `events` - 캘린더 일정

캘린더 이벤트 및 반복 일정을 관리합니다.

| 컬럼 | 타입 | 설명 |
|------|------|------|
| `id` | UUID | Primary Key |
| `user_id` | UUID | 사용자 ID |
| `category_id` | UUID | 카테고리 ID |
| `title` | TEXT | 일정 제목 |
| `description` | TEXT | 상세 설명 |
| `start_date` | DATE | 시작 날짜 |
| `end_date` | DATE | 종료 날짜 (기간 일정) |
| `start_time` | TIME | 시작 시간 |
| `end_time` | TIME | 종료 시간 |
| `is_all_day` | BOOLEAN | 하루 종일 일정 여부 |
| **반복 일정 필드** | | |
| `is_recurring` | BOOLEAN | 반복 일정 여부 |
| `rrule` | TEXT | RRule 문자열 (RFC 5545) |
| `recurrence_freq` | TEXT | 반복 주기 (DAILY/WEEKLY/MONTHLY/YEARLY) |
| `recurrence_interval` | INTEGER | 반복 간격 |
| `recurrence_byweekday` | INTEGER[] | 요일 선택 (0=월, 6=일) |
| `recurrence_until` | DATE | 반복 종료 날짜 |
| `recurrence_count` | INTEGER | 반복 횟수 |
| `recurrence_id` | UUID | 원본 반복 일정 ID |
| `is_exception` | BOOLEAN | 반복 일정 예외 여부 |
| `exception_date` | DATE | 예외 발생 날짜 |
| **구글 캘린더 연동** | | |
| `google_event_id` | TEXT | 구글 이벤트 ID |
| `google_calendar_id` | TEXT | 구글 캘린더 ID |
| `synced_at` | TIMESTAMPTZ | 마지막 동기화 시간 |
| **기타** | | |
| `location` | TEXT | 장소 |
| `attendees` | JSONB | 참석자 정보 |
| `reminders` | JSONB | 알림 설정 |

### 4. `tasks` - 할일

작업(Task) 및 체크리스트를 관리합니다.

| 컬럼 | 타입 | 설명 |
|------|------|------|
| `id` | UUID | Primary Key |
| `user_id` | UUID | 사용자 ID |
| `category_id` | UUID | 카테고리 ID |
| `title` | TEXT | 작업 제목 |
| `description` | TEXT | 상세 설명 |
| `is_completed` | BOOLEAN | 완료 여부 |
| `completed_at` | TIMESTAMPTZ | 완료 시간 |
| `priority` | TEXT | 우선순위 (low/medium/high/urgent) |
| `due_date` | DATE | 마감일 |
| `due_time` | TIME | 마감 시간 |
| `is_recurring` | BOOLEAN | 반복 작업 여부 |
| `rrule` | TEXT | RRule 문자열 |
| `parent_task_id` | UUID | 상위 작업 ID (서브태스크) |
| `tags` | TEXT[] | 태그 |
| `order_index` | INTEGER | 정렬 순서 |

### 5. `routines` - 루틴

일상 루틴 및 습관을 관리합니다.

| 컬럼 | 타입 | 설명 |
|------|------|------|
| `id` | UUID | Primary Key |
| `user_id` | UUID | 사용자 ID |
| `category_id` | UUID | 카테고리 ID |
| `title` | TEXT | 루틴 제목 |
| `description` | TEXT | 상세 설명 |
| `routine_type` | TEXT | 루틴 타입 (morning/daily/evening/weekly/custom) |
| `rrule` | TEXT | RRule 문자열 (필수) |
| `recurrence_freq` | TEXT | 반복 주기 |
| `preferred_time` | TIME | 선호 시간 |
| `estimated_duration` | INTEGER | 예상 소요 시간 (분) |
| `checklist` | JSONB | 체크리스트 |
| `is_active` | BOOLEAN | 활성화 상태 |
| `reminders` | JSONB | 알림 설정 |

### 6. `routine_completions` - 루틴 완료 기록

루틴의 일별 완료 기록을 추적합니다.

| 컬럼 | 타입 | 설명 |
|------|------|------|
| `id` | UUID | Primary Key |
| `routine_id` | UUID | 루틴 ID |
| `user_id` | UUID | 사용자 ID |
| `completion_date` | DATE | 완료 날짜 |
| `completion_time` | TIME | 완료 시간 |
| `checklist_state` | JSONB | 체크리스트 완료 상태 |
| `notes` | TEXT | 노트 |

### 7. `analytics` - 통계 데이터

일별 생산성 통계를 저장합니다.

| 컬럼 | 타입 | 설명 |
|------|------|------|
| `id` | UUID | Primary Key |
| `user_id` | UUID | 사용자 ID |
| `date` | DATE | 날짜 |
| `events_count` | INTEGER | 일정 개수 |
| `events_completed` | INTEGER | 완료된 일정 개수 |
| `events_duration_minutes` | INTEGER | 총 일정 소요 시간 |
| `tasks_count` | INTEGER | 작업 개수 |
| `tasks_completed` | INTEGER | 완료된 작업 개수 |
| `tasks_completion_rate` | DECIMAL | 작업 완료율 (%) |
| `routines_count` | INTEGER | 루틴 개수 |
| `routines_completed` | INTEGER | 완료된 루틴 개수 |
| `routines_completion_rate` | DECIMAL | 루틴 완료율 (%) |
| `category_distribution` | JSONB | 카테고리별 시간 분배 |
| `productivity_score` | INTEGER | 생산성 점수 (0-100) |

### 8. `google_calendar_sync` - 구글 캘린더 동기화

구글 캘린더 동기화 설정 및 상태를 관리합니다.

| 컬럼 | 타입 | 설명 |
|------|------|------|
| `id` | UUID | Primary Key |
| `user_id` | UUID | 사용자 ID |
| `google_calendar_id` | TEXT | 구글 캘린더 ID |
| `calendar_name` | TEXT | 캘린더 이름 |
| `is_primary` | BOOLEAN | 기본 캘린더 여부 |
| `sync_enabled` | BOOLEAN | 동기화 활성화 |
| `sync_direction` | TEXT | 동기화 방향 (import_only/export_only/bidirectional) |
| `last_sync_at` | TIMESTAMPTZ | 마지막 동기화 시간 |
| `last_sync_token` | TEXT | 증분 동기화 토큰 |

## 🔗 관계도

```
auth.users (Supabase Auth)
    ↓
profiles (1:1)
    ↓
    ├─→ categories (1:N)
    │       ↓
    │       ├─→ events (N:1)
    │       ├─→ tasks (N:1)
    │       └─→ routines (N:1)
    │
    ├─→ events (1:N)
    │       ├─→ recurrence_id (self-reference)
    │       └─→ google_event_id
    │
    ├─→ tasks (1:N)
    │       └─→ parent_task_id (self-reference)
    │
    ├─→ routines (1:N)
    │       └─→ routine_completions (1:N)
    │
    ├─→ analytics (1:N)
    │
    └─→ google_calendar_sync (1:N)
```

## 🔁 반복 일정 처리

### RRule 표준 (RFC 5545)

Calendary는 iCalendar RFC 5545 표준의 RRule을 사용하여 반복 일정을 관리합니다.

#### RRule 문자열 예시:

```sql
-- 매주 월요일 9시 (주간 스탠드업)
DTSTART:20260303T090000Z
RRULE:FREQ=WEEKLY;BYDAY=MO

-- 매일 아침 8시 (모닝 루틴)
DTSTART:20260303T080000Z
RRULE:FREQ=DAILY

-- 매주 월/수/금 (운동)
DTSTART:20260303T070000Z
RRULE:FREQ=WEEKLY;BYDAY=MO,WE,FR

-- 매월 1일 (월별 보고서)
DTSTART:20260301T100000Z
RRULE:FREQ=MONTHLY;BYMONTHDAY=1

-- 10회 반복 후 종료
DTSTART:20260303T090000Z
RRULE:FREQ=WEEKLY;COUNT=10

-- 2026년 12월 31일까지 반복
DTSTART:20260303T090000Z
RRULE:FREQ=WEEKLY;UNTIL=20261231T235959Z
```

### 반복 일정 예외 처리

반복 일정의 특정 인스턴스를 수정하거나 삭제할 때:

1. **수정**: 새로운 `events` 레코드 생성
   - `recurrence_id`: 원본 반복 일정의 ID
   - `is_exception`: TRUE
   - `exception_date`: 예외가 발생한 날짜

2. **삭제**: 예외 레코드 생성 (title을 "DELETED"로 설정)

### 프론트엔드에서 반복 일정 확장

```typescript
import { RRule } from 'rrule';

function expandRecurringEvents(
  events: Event[],
  startDate: Date,
  endDate: Date
): Event[] {
  const expandedEvents: Event[] = [];

  events.forEach((event) => {
    if (event.is_recurring && event.rrule) {
      const rule = RRule.fromString(event.rrule);
      const occurrences = rule.between(startDate, endDate, true);

      occurrences.forEach((occurrence) => {
        expandedEvents.push({
          ...event,
          id: `${event.id}-${occurrence.getTime()}`,
          start_date: occurrence,
          is_recurring_instance: true,
          original_event_id: event.id,
        });
      });
    } else {
      expandedEvents.push(event);
    }
  });

  return expandedEvents;
}
```

## 🔄 구글 캘린더 연동

### 연동 흐름

1. **OAuth 인증**: 구글 OAuth 2.0으로 사용자 인증
2. **토큰 저장**: `profiles` 테이블에 access_token 및 refresh_token 저장
3. **캘린더 목록**: `google_calendar_sync` 테이블에 연동할 캘린더 저장
4. **이벤트 동기화**:
   - Calendary → Google: `events` 테이블의 이벤트를 Google Calendar API로 전송
   - Google → Calendary: Google Calendar API에서 이벤트를 가져와 `events` 테이블에 저장
   - `google_event_id`로 중복 방지

### 증분 동기화

- `last_sync_token` 사용하여 변경된 이벤트만 동기화
- 동기화 방향 설정: `import_only`, `export_only`, `bidirectional`

### Google Calendar API 매핑

| Calendary | Google Calendar API |
|-----------|-------------------|
| `title` | `summary` |
| `description` | `description` |
| `start_date` + `start_time` | `start.dateTime` |
| `end_date` + `end_time` | `end.dateTime` |
| `location` | `location` |
| `attendees` | `attendees[]` |
| `reminders` | `reminders` |
| `rrule` | `recurrence[]` |

## 🔒 보안 정책 (RLS)

### Row Level Security (RLS)

모든 테이블에 RLS가 활성화되어 있으며, 사용자는 자신의 데이터만 접근할 수 있습니다.

#### 정책 예시:

```sql
-- profiles 테이블
CREATE POLICY "Users can view own profile" 
  ON public.profiles FOR SELECT 
  USING (auth.uid() = id);

-- events 테이블
CREATE POLICY "Users can manage own events" 
  ON public.events 
  USING (auth.uid() = user_id);
```

### 인증 방식

- **이메일/비밀번호**: Supabase Auth
- **OAuth**: Google OAuth 2.0

## 📊 인덱스 전략

성능 최적화를 위한 주요 인덱스:

- `user_id`: 모든 테이블에 인덱스 (사용자별 필터링)
- `start_date`, `end_date`: 날짜 범위 쿼리 최적화
- `is_completed`, `is_active`: 상태별 필터링
- `category_id`: 카테고리별 그룹화
- GIN 인덱스: `tags`, `type` 배열 필드

## 🚀 마이그레이션 실행

```bash
# Supabase CLI로 마이그레이션 실행
supabase db push

# 또는 Supabase 대시보드에서 SQL 편집기를 통해 실행
```

## 📝 추가 고려사항

### 1. 데이터 백업
- 일일 자동 백업 설정
- Point-in-time recovery 활성화

### 2. 성능 모니터링
- Slow query 로그 확인
- 인덱스 사용률 모니터링

### 3. 확장성
- 파티셔닝: `analytics` 테이블은 월별 파티션 고려
- 아카이빙: 오래된 데이터 아카이빙 정책

### 4. 데이터 무결성
- Foreign Key 제약조건으로 참조 무결성 보장
- CHECK 제약조건으로 유효한 값만 허용

---

**작성일**: 2026-03-03  
**버전**: 1.0.0
