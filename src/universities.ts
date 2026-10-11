/**
 * Universities students can pick on the Connect page. One deployment serves one LMS
 * (`LMS_URL`); entries whose `lmsUrl` doesn't match are shown as "not yet available".
 */
import type { Lang } from "./web/i18n";

export interface University {
  id: string;
  /** English name; `names` holds translations for other languages. */
  name: string;
  names?: Partial<Record<Lang, string>>;
  short: string;
  lmsUrl: string;
}

export const UNIVERSITIES: University[] = [
  {
    id: "ozu",
    name: "Özyeğin University",
    names: { tr: "Özyeğin Üniversitesi" },
    short: "OzU",
    lmsUrl: "https://lms.ozyegin.edu.tr",
  },
];

export function universityName(u: University, lang: Lang): string {
  return u.names?.[lang] ?? u.name;
}

export function universitiesFor(env: Env) {
  const norm = (u: string) => u.replace(/\/+$/, "").toLowerCase();
  return UNIVERSITIES.map((u) => ({ ...u, available: norm(u.lmsUrl) === norm(env.LMS_URL) }));
}
