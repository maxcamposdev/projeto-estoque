// locales/i18n.js — Configuração de internacionalização
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
  interpolation: { escapeValue: false },
});

export default i18n;