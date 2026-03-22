import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import koTranslation from '../locales/ko/translation.json';
import enTranslation from '../locales/en/translation.json';

// 브라우저에서 저장된 언어 또는 기본값(한국어)
const savedLanguage = localStorage.getItem('language') || 'ko';

i18n
  .use(initReactI18next)
  .init({
    resources: {
      ko: {
        translation: koTranslation,
      },
      en: {
        translation: enTranslation,
      },
    },
    lng: savedLanguage, // 기본 언어
    fallbackLng: 'ko', // 번역이 없을 경우 대체 언어
    interpolation: {
      escapeValue: false, // React는 XSS를 자동으로 방지
    },
    debug: false, // 개발 중 디버깅이 필요하면 true로 설정
  });

export default i18n;
