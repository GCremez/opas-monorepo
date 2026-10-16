import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';
import en from './en.json';
import fi from './fi.json';
import sv from './sv.json';

const resources = {
  en: { translation: en },
  fi: { translation: fi },
  sv: { translation: sv },
};

const locale = Localization.getLocales?.()?.[0]?.languageCode ?? 'en';
const supported = ['en', 'fi', 'sv'];

i18n.use(initReactI18next).init({
  resources,
  lng: supported.includes(locale) ? locale : 'en',
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
  compatibilityJSON: 'v3',
});

export default i18n;
