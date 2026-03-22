# 구글 캘린더 연동 설정 가이드

## 🔴 현재 상태
401 Unauthorized 에러 발생 - 구글 OAuth scope 설정 필요

## ✅ 해결 방법

### 1. Supabase 대시보드에서 Google OAuth 설정

1. **Supabase 대시보드 접속**
   - https://app.supabase.com 로그인
   - 프로젝트 선택

2. **Authentication > Providers > Google**으로 이동

3. **Authorized Client IDs 확인**
   - Client ID와 Client Secret이 올바르게 설정되어 있는지 확인

4. **⚠️ CRITICAL: Scopes 설정 (가장 중요)**
   
   Supabase의 Google Provider 설정에서 다음 scopes를 **반드시** 추가해야 합니다:
   
   ```
   openid email profile https://www.googleapis.com/auth/calendar.readonly
   ```
   
   또는 Supabase UI에서:
   - Additional Scopes 섹션에 `https://www.googleapis.com/auth/calendar.readonly` 추가
   
   **만약 이 설정이 없다면**, Google은 캘린더 접근 권한을 주지 않으며, `provider_token`이 캘린더 API를 호출할 권한이 없습니다.

---

### 2. Google Cloud Console에서 API 활성화

1. **Google Cloud Console 접속**
   - https://console.cloud.google.com
   - OAuth Client를 생성한 프로젝트 선택

2. **APIs & Services > Library**로 이동

3. **Google Calendar API 검색 및 활성화**
   - "Google Calendar API" 검색
   - **Enable** 버튼 클릭

4. **OAuth Consent Screen 확인**
   - APIs & Services > OAuth consent screen
   - Scopes 섹션에서 `../auth/calendar.readonly` scope가 추가되어 있는지 확인
   - 없다면 "ADD OR REMOVE SCOPES" 클릭 후 추가

---

### 3. 기존 사용자 재로그인 필요

**중요**: Scope를 추가한 후에는 기존에 로그인한 사용자는 **반드시 재로그인**해야 합니다.

왜냐하면:
- 기존 `provider_token`은 이전 scope로 발급됨
- 새로운 scope는 새로 로그인할 때만 적용됨

**재로그인 방법:**
1. 앱에서 로그아웃
2. 다시 "Google로 로그인" 클릭
3. Google 권한 요청 화면에서 **캘린더 읽기 권한** 확인
4. 권한 허용

---

## 🔍 문제 진단

### 현재 에러 상황 분석

```
[Calendar] Provider token exists: true  ✅
[Calendar] Access token exists: true    ✅
GET /google-calendar/events 401         ❌
```

이는 다음 중 하나를 의미합니다:

1. **Supabase에서 scope 설정 누락** (가장 가능성 높음)
   - 해결: 위의 Step 1 수행

2. **Google Calendar API 미활성화**
   - 해결: 위의 Step 2 수행

3. **기존 토큰이 새 scope 없이 발급됨**
   - 해결: 위의 Step 3 수행 (재로그인)

---

## 🧪 테스트 방법

### 1. 서버 로그 확인

Supabase Dashboard > Edge Functions > make-server-f973dbc1 > Logs

다음 로그를 확인:
```
[GET /google-calendar/events] Request received
[GET /google-calendar/events] Headers: {
  authorization: 'Present',
  googleToken: 'Present'
}
[Auth] User verified successfully: [user_id] [email]
[GET /google-calendar/events] User authenticated: [user_id] [email]
[GET /google-calendar/events] Google token exists (first 30 chars): ...
[GET /google-calendar/events] Calling Google Calendar API...
```

만약 "Auth failed" 로그가 보이면 → JWT 토큰 문제
만약 "Google Calendar API" 호출 후 에러가 보이면 → Google API 권한 문제

### 2. 브라우저 콘솔 확인

다음 명령어로 현재 세션 정보 확인:
```javascript
supabase.auth.getSession().then(({data}) => {
  console.log('Session:', data.session);
  console.log('Provider token:', data.session?.provider_token);
  console.log('Access token:', data.session?.access_token);
});
```

`provider_token`이 없다면 → 재로그인 필요

---

## 📝 체크리스트

설정 완료 후 다음을 확인:

- [ ] Supabase Google Provider에 `calendar.readonly` scope 추가됨
- [ ] Google Cloud Console에서 Google Calendar API 활성화됨
- [ ] OAuth Consent Screen에 `calendar.readonly` scope 추가됨
- [ ] 기존 사용자 로그아웃 후 재로그인 완료
- [ ] 재로그인 시 "캘린더 읽기 권한" 요청 화면이 나타남
- [ ] 권한 허용 후 `provider_token`이 새로 발급됨
- [ ] 구글 캘린더 일정이 정상적으로 로드됨

---

## 🚀 코드 변경 사항

### AuthContext.tsx
```typescript
scopes: 'openid email profile https://www.googleapis.com/auth/calendar.readonly'
```

이 scopes 설정은 **클라이언트 측에서 요청**하는 것이며, **Supabase 설정과 일치**해야 합니다.

---

## ❓ FAQ

### Q: Scope를 추가했는데도 여전히 401 에러가 발생해요
A: 기존 사용자는 반드시 재로그인해야 합니다. 브라우저 캐시를 지우고 다시 시도하세요.

### Q: 재로그인했는데도 "캘린더 읽기 권한" 요청 화면이 안 나와요
A: Google의 권한 캐시 때문일 수 있습니다. 
   1. https://myaccount.google.com/permissions 접속
   2. 앱 찾아서 권한 제거
   3. 다시 로그인

### Q: 서버 로그에서 "Google Calendar API error: 403"이 보여요
A: Google Cloud Console에서 Calendar API가 활성화되지 않았거나, API 할당량 초과입니다.

### Q: "Invalid Credentials" 에러가 발생해요
A: Supabase의 Google Client ID/Secret이 잘못되었거나, Google Cloud Console의 Authorized redirect URIs가 잘못되었습니다.

---

## 📞 추가 지원

위 단계를 모두 수행했는데도 문제가 해결되지 않으면:

1. **Supabase Edge Function 로그** 전체 복사
2. **브라우저 콘솔 에러** 전체 복사
3. **Google OAuth Consent Screen 스크린샷** 첨부

이 정보를 가지고 추가 디버깅을 진행하세요.
