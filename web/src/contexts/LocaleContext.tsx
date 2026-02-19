import { createContext, useContext, useState, useCallback, useMemo } from "react";
import { getT, getStoredLocale, setStoredLocale, type Locale } from "@/lib/i18n";

const LocaleContext = createContext<{
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: (key: string) => string;
} | null>(null);

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(getStoredLocale);
  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l);
    setStoredLocale(l);
  }, []);
  const t = useMemo(() => getT(locale), [locale]);
  const value = useMemo(() => ({ locale, setLocale, t }), [locale, setLocale, t]);
  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale() {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error("useLocale must be used within LocaleProvider");
  return ctx;
}
