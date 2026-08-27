// locales/i18n.js — Configuração de internacionalização (robusta)
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import ptBR from './pt-BR.json';
import en from './en.json';

const savedLang = localStorage.getItem('lang') || 'pt-BR';

i18n.use(initReactI18next).init({
  resources: {
    'pt-BR': { translation: ptBR },
    en: { translation: en },
  },
  lng: savedLang,
  fallbackLng: 'pt-BR',
  supportedLngs: ['pt-BR', 'en'],
  nonExplicitSupportedLngs: true,
  load: 'currentOnly',
  interpolation: { escapeValue: false },
  initImmediate: false,
  react: { useSuspense: false },
});

export default i18n;