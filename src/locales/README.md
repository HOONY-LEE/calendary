# 다국어 지원 (Internationalization)

이 프로젝트는 react-i18next를 사용하여 다국어를 지원합니다.

## 지원 언어

- 한국어 (ko) - 기본 언어
- 영어 (en)

## 프로젝트 구조

```
/src
  /locales
    /ko
      translation.json    # 한국어 번역
    /en
      translation.json    # 영어 번역
  /i18n
    config.ts            # i18n 초기 설정
```

## 새로운 언어 추가하기

1. `/src/locales/` 폴더에 새로운 언어 코드로 폴더를 생성합니다 (예: `ja` for Japanese)
2. 해당 폴더에 `translation.json` 파일을 생성하고 번역을 추가합니다
3. `/src/i18n/config.ts` 파일을 수정하여 새로운 언어를 등록합니다:

```typescript
import jaTranslation from '../locales/ja/translation.json';

i18n
  .use(initReactI18next)
  .init({
    resources: {
      ko: { translation: koTranslation },
      en: { translation: enTranslation },
      ja: { translation: jaTranslation }, // 새로운 언어 추가
    },
    // ... rest of config
  });
```

4. Settings 페이지(`/src/app/pages/Settings.tsx`)의 언어 선택 UI에 새 언어 버튼을 추가합니다

## 번역 키 구조

번역은 네임스페이스로 구조화되어 있습니다:

- `common`: 공통적으로 사용되는 텍스트 (저장, 취소, 삭제 등)
- `nav`: 네비게이션 메뉴 항목
- `auth`: 로그인/회원가입 관련
- `dashboard`: 대시보드 페이지
- `calendar`: 캘린더 페이지
- `tasks`: 작업 페이지
- `routine`: 루틴 페이지
- `analytics`: 통계 페이지
- `settings`: 설정 페이지
- `notFound`: 404 페이지

## 사용 방법

### 컴포넌트에서 번역 사용하기

```typescript
import { useTranslation } from 'react-i18next';

function MyComponent() {
  const { t } = useTranslation();
  
  return <h1>{t('common.appName')}</h1>;
}
```

### 언어 변경하기

```typescript
import { useTranslation } from 'react-i18next';

function LanguageSwitcher() {
  const { i18n } = useTranslation();
  
  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
    localStorage.setItem('language', lng);
  };
  
  return (
    <button onClick={() => changeLanguage('en')}>
      Switch to English
    </button>
  );
}
```

### 현재 언어 확인하기

```typescript
const { i18n } = useTranslation();
console.log(i18n.language); // 'ko' or 'en'
```

## 번역 파일 형식

모든 번역 파일은 JSON 형식입니다:

```json
{
  "common": {
    "appName": "Productivity OS",
    "save": "Save",
    "cancel": "Cancel"
  },
  "nav": {
    "dashboard": "Dashboard",
    "tasks": "Tasks"
  }
}
```

## 주의사항

- 모든 새로운 텍스트는 번역 파일에 추가해야 합니다
- 번역 키는 의미있는 이름을 사용하세요
- 동일한 텍스트가 여러 곳에서 사용된다면 `common` 네임스페이스를 활용하세요
- 언어 변경 시 localStorage에 저장되어 페이지 새로고침 후에도 유지됩니다
