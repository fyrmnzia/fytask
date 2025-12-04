"use client";

import { useEffect } from "react";
import { I18nextProvider } from "react-i18next";
import i18n from "@/i18n/config";
import { useUIStore } from "@/store/ui-store";

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const language = useUIStore((state) => state.language);

  useEffect(() => {
    i18n.changeLanguage(language);
  }, [language]);

  return <I18nextProvider i18n={i18n}>{children}</I18nextProvider>;
}
