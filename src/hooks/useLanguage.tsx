import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

import type { LanguageCode } from "@/lib/studyzen";

type LanguageState = {
  /** Language the teacher SPEAKS in (also drives UI copy). */
  language: LanguageCode;
  /** Language written on the blackboard — independent of the spoken language. */
  boardLanguage: LanguageCode;
  setLanguage: (l: LanguageCode) => void;
  setBoardLanguage: (l: LanguageCode) => void;
  applyTeluguTeachingEnglishBoard: () => void;
};

const LanguageContext = createContext<LanguageState>({
  language: "en",
  boardLanguage: "en",
  setLanguage: () => {},
  setBoardLanguage: () => {},
  applyTeluguTeachingEnglishBoard: () => {},
});

function read(key: string): LanguageCode | null {
  const stored = window.localStorage.getItem(key);
  return stored === "en" || stored === "te" ? stored : null;
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<LanguageCode>("en");
  const [boardLanguage, setBoardLanguageState] = useState<LanguageCode>("en");

  useEffect(() => {
    const speak = read("studyzen.language");
    const board = read("studyzen.boardLanguage");
    if (speak) setLanguageState(speak);
    if (board) setBoardLanguageState(board);
  }, []);

  const value = useMemo<LanguageState>(() => {
    const setLanguage = (l: LanguageCode) => {
      setLanguageState(l);
      window.localStorage.setItem("studyzen.language", l);
    };
    const setBoardLanguage = (l: LanguageCode) => {
      setBoardLanguageState(l);
      window.localStorage.setItem("studyzen.boardLanguage", l);
    };
    return {
      language,
      boardLanguage,
      setLanguage,
      setBoardLanguage,
      applyTeluguTeachingEnglishBoard: () => {
        setLanguage("te");
        setBoardLanguage("en");
      },
    };
  }, [language, boardLanguage]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  return useContext(LanguageContext);
}
