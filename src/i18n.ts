import i18next from "i18next";
import { initReactI18next } from "react-i18next";
import XHR from "i18next-http-backend";
import LanguageDetector from "i18next-browser-languagedetector";

//Import translation files
import translationEnglish from "./translations/en.json";
import translationGerman from "./translations/de.json";

const resources = {
    en: {
        main: translationEnglish,
    },
    de: {
        main: translationGerman,
    },
}

export const supportedLngs = {
  en: "English",
  de: "Deutsch",
};

i18next
.use(XHR)
.use(initReactI18next)
.use(LanguageDetector)
.init({
  resources: resources,
  detection: { 
    order: ['querystring', 'cookie', 'localStorage', 'sessionStorage', 'navigator', 'htmlTag', 'path', 'subdomain'],
    lookupQuerystring: 'lng',
  },
  fallbackLng: "en",
  supportedLngs: Object.keys(supportedLngs),
  //lng:"en", //default language
  interpolation: {
    escapeValue: false, // react already safes from xss
  },
});

export default i18next;