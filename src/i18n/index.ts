import { useCallback } from 'react'
import vi from './vi.json'
import { useSettings, type Language } from '../store/settingsStore'

/** The game is Vietnamese only (1.16): all UI strings live in vi.json. */
export type I18nKey = keyof typeof vi
type Dictionary = Record<I18nKey, string>

const dictionaries: Record<Language, Dictionary> = { vi }

export type TranslateVars = Record<string, string | number>

export function translate(language: Language, key: I18nKey, vars?: TranslateVars): string {
  const template = dictionaries[language][key] ?? dictionaries.vi[key] ?? key
  if (!vars) return template
  return template.replace(/\{(\w+)\}/g, (match, name: string) =>
    name in vars ? String(vars[name]) : match,
  )
}

/** React hook: returns a `t(key, vars?)` bound to the current language. */
export function useT() {
  const language = useSettings((s) => s.language)
  return useCallback(
    (key: I18nKey, vars?: TranslateVars) => translate(language, key, vars),
    [language],
  )
}
