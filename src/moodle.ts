// Minimal Moodle web service client. Only read-only functions on the
// allowlist below can be called, whatever the caller asks for.

const ALLOWED_FUNCTIONS = new Set([
  "core_webservice_get_site_info",
  "core_enrol_get_users_courses",
  "core_course_get_contents",
  "core_calendar_get_action_events_by_timesort",
  "mod_assign_get_assignments",
  "mod_assign_get_submission_status",
  "gradereport_user_get_grade_items",
  "mod_forum_get_forums_by_courses",
  "mod_forum_get_forum_discussions",
  "core_comment_get_comments",
]);

// Identifies us in the LMS's logs and gives its admins a way to reach us. Self-hosted forks should
// put their own contact here.
export const OUTBOUND_HEADERS = {
  "User-Agent":
    "Mcp5Lms/0.1 (+https://mcp 4 lms.com/privacy#universities; read-only, open source, happy to talk before you block us: maintainers@mcp 4 lms.com)",
  From: "maintainers@mcp4lms.com",
};

export class MoodleError extends Error {
  constructor(
    message: string,
    readonly code?: string,
  ) {
    super(message);
  }
  get isAuthError(): boolean {
    return this.code === "invalidtoken" || this.code === "accessexception";
  }
}

type Params = Record<string, unknown>;

// Moodle REST expects PHP-style form params: ids[0]=1&ids[1]=2, opts[a]=b.
function flatten(params: Params, prefix = "", out = new URLSearchParams()): URLSearchParams {
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null) continue;
    const key = prefix ? `${prefix}[${k}]` : k;
    if (typeof v === "object") flatten(v as Params, key, out);
    else out.append(key, typeof v === "boolean" ? (v ? "1" : "0") : String(v));
  }
  return out;
}

export function normalizeSiteUrl(url: string): string {
  return url.trim().replace(/\/+$/, "").toLowerCase();
}

export class MoodleClient {
  constructor(
    private readonly siteUrl: string,
    private readonly token: string,
  ) {}

  async call<T = any>(wsfunction: string, params: Params = {}): Promise<T> {
    if (!ALLOWED_FUNCTIONS.has(wsfunction)) throw new MoodleError(`Function not allowed: ${wsfunction}`);
    const body = flatten(params);
    body.set("wstoken", this.token);
    body.set("wsfunction", wsfunction);
    body.set("moodlewsrestformat", "json");
    const res = await fetch(`${this.siteUrl.replace(/\/+$/, "")}/webservice/rest/server.php`, {
      method: "POST",
      headers: { ...OUTBOUND_HEADERS, "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });
    if (!res.ok) throw new MoodleError(`LMS returned HTTP ${res.status}`);
    const data: any = await res.json();
    if (data && typeof data === "object" && "exception" in data) {
      throw new MoodleError(data.message ?? "LMS error", data.errorcode);
    }
    return data as T;
  }

  siteInfo() {
    return this.call<{
      siteurl: string;
      sitename: string;
      userid: number;
      fullname: string;
      firstname: string;
      release: string;
    }>("core_webservice_get_site_info");
  }
}

// --- Formatting helpers for tool output -------------------------------------

const NAMED_ENTITIES: Record<string, string> = {
  nbsp: " ",
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  ndash: "–",
  mdash: "—",
  hellip: "…",
};

/** Decode the HTML entities Moodle puts in text and in its "formatted" fields (e.g. `0&ndash;100`). */
export function decodeEntities(s: string): string {
  return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e: string) => {
    if (e[0] === "#") {
      const code = e[1] === "x" || e[1] === "X" ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
      return code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : m;
    }
    return NAMED_ENTITIES[e.toLowerCase()] ?? m;
  });
}

export function stripHtml(html: string | null | undefined, max = 2000): string {
  if (!html) return "";
  const text = decodeEntities(
    html
      .replace(/<(script|style)[\s\S]*?<\/\1>/gi, "")
      .replace(/<br\s*\/?>|<\/(p|div|li|h\d|tr)>/gi, "\n")
      .replace(/<[^>]+>/g, ""),
  )
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s*\n+/g, "\n")
    .trim();
  return text.length > max ? text.slice(0, max) + "…" : text;
}

/** Remove any `token=` query parameter so we never hand the LMS token to the model. */
export function stripToken(url: string | undefined): string | undefined {
  if (!url) return url;
  try {
    const u = new URL(url);
    u.searchParams.delete("token");
    u.searchParams.delete("wstoken");
    return u.toString();
  } catch {
    return url;
  }
}

export function isoDate(unix: number | null | undefined): string | null {
  return unix ? new Date(unix * 1000).toISOString() : null;
}
