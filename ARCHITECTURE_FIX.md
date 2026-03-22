# 구조적 문제 해결 보고서

## 📋 개요
반복적으로 발생하는 에러의 근본 원인을 파악하고 구조적으로 수정했습니다.

## 🔴 발견된 구조적 문제

### 1. Import 경로 불일치 문제
**문제점:**
- `/src/app/pages/Calendar.tsx`만 상대 경로 사용: `../../../utils/supabase/info`
- 다른 모든 파일은 절대 경로 사용: `/utils/supabase/info`

**영향:**
- 모듈 중복 로드 가능성
- 예측 불가능한 동작 발생

**해결:**
- Calendar.tsx의 import를 절대 경로로 통일
```typescript
// Before
import { projectId } from "../../../utils/supabase/info";

// After
import { projectId } from "/utils/supabase/info";
```

---

### 2. 카테고리 API 이중 구조 문제
**문제점:**
- `/src/lib/api.ts` - Supabase Postgres DB 직접 호출 (REST API)
- `/src/lib/api/categories.ts` - 서버 Edge Function 호출 (KV store)
- 두 개의 다른 데이터 소스로 인한 불일치

**영향:**
- 카테고리 데이터가 KV store에만 저장되고 DB에는 없음
- API 호출 시 데이터 불일치로 인한 에러 발생

**해결:**
1. `/src/lib/api/categories.ts` 파일 삭제
2. `/src/lib/api.ts`의 categoriesAPI만 사용하도록 통일
3. 서버 API를 KV store 대신 Postgres DB 직접 사용하도록 수정

---

### 3. 서버 API 데이터 저장소 혼란
**문제점:**
- 서버의 `/make-server-f973dbc1/categories` 엔드포인트가 KV store 사용
- 실제 데이터베이스는 Postgres의 `categories` 테이블

**영향:**
- 카테고리가 KV store에만 저장
- DB 조회 시 카테고리가 없어서 에러 발생
- RLS 정책과 충돌

**해결:**
서버 엔드포인트를 모두 Postgres DB 직접 사용하도록 수정:
```typescript
// Before (KV store 사용)
const categories = await kv.get(`categories:${user.id}`);

// After (Postgres DB 사용)
const { data: categories, error } = await client
  .from('categories')
  .select('*')
  .order('order_index', { ascending: true });
```

---

## ✅ 추가 개선 사항

### 1. 에러 핸들링 강화
- `/src/lib/api-helpers.ts` 파일 생성
- 재시도 로직 추가 (`retryFetch` 함수)
- 에러 타입 감지 (네트워크 에러, 인증 에러)
- 사용자 친화적인 에러 메시지 생성

### 2. CRUD 엔드포인트 일관성 확보
모든 카테고리 관련 엔드포인트를 Postgres DB로 통일:
- ✅ GET `/categories` - 조회
- ✅ POST `/categories` - 생성
- ✅ PATCH `/categories/:id` - 수정
- ✅ DELETE `/categories/:id` - 삭제
- ✅ POST `/users/initialize` - 초기화
- ✅ POST `/categories/reset` - 리셋

---

## 🎯 기대 효과

### Before (문제 상황)
```
사용자 로그인
  ↓
카테고리 API 호출 → KV store 저장
  ↓
Calendar.tsx에서 DB 직접 조회 → 카테고리 없음 ❌
  ↓
에러 발생
```

### After (해결 후)
```
사용자 로그인
  ↓
카테고리 API 호출 → Postgres DB 저장
  ↓
Calendar.tsx에서 DB 조회 → 카테고리 있음 ✅
  ↓
정상 작동
```

---

## 📊 변경된 파일 목록

1. **삭제된 파일:**
   - `/src/lib/api/categories.ts` - 중복 제거

2. **수정된 파일:**
   - `/src/app/pages/Calendar.tsx` - import 경로 수정
   - `/supabase/functions/server/index.tsx` - 모든 카테고리 엔드포인트를 Postgres DB로 변경

3. **신규 생성된 파일:**
   - `/src/lib/api-helpers.ts` - 에러 핸들링 헬퍼

4. **개선된 파일:**
   - `/src/lib/api.ts` - 재시도 로직 import 추가

---

## 🔧 향후 개선 방안

1. **토큰 자동 갱신**: 
   - Google OAuth token이 만료되었을 때 자동 갱신 로직 추가

2. **오프라인 지원**:
   - 네트워크 연결이 끊겼을 때 로컬 캐시 사용

3. **통합 테스트**:
   - E2E 테스트로 데이터 흐름 검증

4. **모니터링**:
   - Sentry 등의 에러 트래킹 도구 도입

---

## ✨ 결론

**근본 원인**: 데이터 저장소의 이중 구조 (KV store vs Postgres DB)

**해결 방법**: 모든 데이터를 Postgres DB로 통일하여 일관성 확보

**결과**: 반복적인 에러 발생 원인 제거 및 안정성 향상
