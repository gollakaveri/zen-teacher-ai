import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

import type { LanguageCode } from "@/lib/studyzen";

type LanguageState = {
  language: LanguageCode;
  setLanguage: (l: LanguageCode) => void;
};

const LanguageContext = createContext<LanguageState>({ language: "en", setLanguage: () => {} });

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<LanguageCode>("en");

  useEffect(() => {
    const stored = window.localStorage.getItem("studyzen.language");
    if (stored === "en" || stored === "te") setLanguageState(stored);
  }, []);

  const value = useMemo<LanguageState>(
    () => ({
      language,
      setLanguage: (l) => {
        setLanguageState(l);
        window.localStorage.setItem("studyzen.language", l);
      },
    }),
    [language],
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  return useContext(LanguageContext);
}
