// Fetching course files from the LMS and turning them into text for the AI.
// Only files served by the LMS's own pluginfile endpoint are allowed; the stored
// token is added server-side and never appears in tool output.
import { extractText } from "unpdf";
import { strFromU8, unzipSync } from "fflate";
import { stripHtml } from "./moodle";

export const MAX_FILE_BYTES = 15 * 1024 * 1024;
export const DEFAULT_TEXT_CHARS = 80_000;
export const MAX_TEXT_CHARS = 250_000;
const FETCH_TIMEOUT_MS = 25_000;

export interface FileText {
  name: string;
  mimeType: string;
  size: number;
  kind: "pdf" | "docx" | "pptx" | "text" | "html" | "other";
  /** True when the file came from outside the LMS (fetched without any credentials). */
  external: boolean;
  pages?: number;
  text: string;
  truncated: boolean;
  note?: string;
}

/**
 * Accepts only the LMS's own file endpoint and returns the URL to fetch (without any
 * token the caller may have included). `/pluginfile.php/…` links from the web UI are
 * mapped to the token-authenticated `/webservice/pluginfile.php/…` form.
 */
export function lmsFileUrl(lmsUrl: string, url: string): URL | null {
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    return null;
  }
  const lms = new URL(lmsUrl);
  if (u.origin !== lms.origin) return null;
  const base = lms.pathname.replace(/\/+$/, "");
  const path = u.pathname;
  if (path.startsWith(`${base}/pluginfile.php/`)) {
    u.pathname = `${base}/webservice/pluginfile.php/${path.slice(`${base}/pluginfile.php/`.length)}`;
  } else if (!path.startsWith(`${base}/webservice/pluginfile.php/`)) {
    return null;
  }
  u.searchParams.delete("token");
  u.searchParams.delete("wstoken");
  u.searchParams.delete("forcedownload");
  u.hash = "";
  return u;
}

/** Thrown for URLs outside the LMS when the user has not confirmed the fetch. */
export class NeedsConfirmation extends Error {
  constructor(public readonly host: string) {
    super("needs confirmation");
  }
}

/**
 * A URL outside the LMS that is safe enough to fetch anonymously: http(s) only, a real
 * host name (no raw IPs, localhost or internal names). Returns null otherwise.
 */
export function externalUrl(url: string): URL | null {
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    return null;
  }
  if (u.protocol !== "https:" && u.protocol !== "http:") return null;
  const h = u.hostname.toLowerCase();
  if (!h.includes(".") || h.endsWith(".local") || h.endsWith(".internal") || h.endsWith(".localhost")) return null;
  if (/^[\d.]+$/.test(h) || h.startsWith("[") || h.includes(":")) return null; // raw IPv4 / IPv6
  if (u.username || u.password) return null;
  u.hash = "";
  return u;
}

function fileNameOf(u: URL): string {
  const last = u.pathname.split("/").pop() ?? "file";
  try {
    return decodeURIComponent(last);
  } catch {
    return last;
  }
}

function kindOf(name: string, mime: string): FileText["kind"] {
  const ext = name.toLowerCase().split(".").pop() ?? "";
  if (ext === "pdf" || mime === "application/pdf") return "pdf";
  if (ext === "docx") return "docx";
  if (ext === "pptx") return "pptx";
  if (ext === "html" || ext === "htm" || mime.startsWith("text/html")) return "html";
  if (
    ["txt", "md", "markdown", "csv", "json", "xml", "yaml", "yml", "tex", "py", "java", "c", "cpp", "h", "js", "ts", "sql", "sh", "r"].includes(ext) ||
    mime.startsWith("text/") ||
    mime === "application/json"
  )
    return "text";
  return "other";
}

/** Text of every <tag>…</tag> occurrence, in document order. */
function xmlText(xml: string, tag: string, paragraphTag?: string): string {
  const parts: string[] = [];
  const re = new RegExp(`<${tag}(?:\\s[^>]*)?>([^<]*)</${tag}>|<(${paragraphTag ?? "\\0"})(?:\\s[^>]*)?/?>|</(${paragraphTag ?? "\\0"})>`, "g");
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml))) {
    if (m[1] !== undefined) parts.push(decodeXml(m[1]));
    else parts.push("\n");
  }
  return parts.join("").replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
}

function decodeXml(s: string): string {
  return s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&amp;/g, "&");
}

function docxText(bytes: Uint8Array): string {
  const files = unzipSync(bytes, { filter: (f) => f.name === "word/document.xml" });
  const xml = files["word/document.xml"];
  if (!xml) throw new Error("Not a Word document");
  // Paragraph ends become newlines; tabs/breaks become spaces.
  return xmlText(strFromU8(xml).replace(/<w:tab\/>/g, " ").replace(/<w:br\/>/g, "\n"), "w:t", "w:p");
}

function pptxText(bytes: Uint8Array): { text: string; slides: number } {
  const files = unzipSync(bytes, { filter: (f) => /^ppt\/slides\/slide\d+\.xml$/.test(f.name) });
  const names = Object.keys(files).sort((a, b) => Number(a.match(/\d+/)![0]) - Number(b.match(/\d+/)![0]));
  const out = names.map((n, i) => `--- Slide ${i + 1} ---\n${xmlText(strFromU8(files[n]), "a:t", "a:p")}`);
  return { text: out.join("\n\n"), slides: names.length };
}

/** Download a file from the LMS and convert it to text. */
export async function fetchFileText(
  lmsUrl: string,
  token: string,
  url: string,
  maxChars = DEFAULT_TEXT_CHARS,
  opts: { confirmedByUser?: boolean } = {},
): Promise<FileText> {
  let target = lmsFileUrl(lmsUrl, url);
  let external = false;
  if (!target) {
    // Not an LMS file. Same-origin non-file paths are never fetched (they need the session);
    // anything else is fetched anonymously, and only once the user has said yes.
    const ext = externalUrl(url);
    if (!ext || ext.origin === new URL(lmsUrl).origin) {
      throw new Error("Only files hosted on the LMS can be read (links from get_course_contents, list_assignments or get_assignment_status).");
    }
    if (!opts.confirmedByUser) throw new NeedsConfirmation(ext.host);
    target = ext;
    external = true;
  }
  const name = fileNameOf(target);
  const fetchUrl = new URL(target);
  if (!external) fetchUrl.searchParams.set("token", token); // the LMS token never leaves the LMS origin

  // The LMS (or its WAF) answers 403 to requests without a User-Agent, which Workers' fetch omits.
  const res = await fetch(fetchUrl, {
    headers: { "user-agent": "Mcp4Lms/0.1 (+https://github.com/threos/mcp4lms)", accept: "*/*" },
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    redirect: "follow",
  });
  if (!res.ok) throw new Error(`The LMS refused the file (HTTP ${res.status}).`);
  const mime = (res.headers.get("content-type") ?? "").split(";")[0].trim().toLowerCase();
  const declared = Number(res.headers.get("content-length") ?? 0);
  if (declared > MAX_FILE_BYTES) throw new Error(`File is too large to read (${Math.round(declared / 1048576)} MB; limit ${MAX_FILE_BYTES / 1048576} MB).`);
  const buf = new Uint8Array(await res.arrayBuffer());
  if (buf.byteLength > MAX_FILE_BYTES) throw new Error(`File is too large to read (limit ${MAX_FILE_BYTES / 1048576} MB).`);
  // Moodle answers a token problem with a JSON/HTML error page instead of the file.
  if (!external && mime === "application/json" && kindOf(name, "") !== "text") {
    const err = JSON.parse(new TextDecoder().decode(buf)) as { message?: string; error?: string };
    throw new Error(`The LMS refused the file: ${err.message ?? err.error ?? "unknown error"}`);
  }

  const kind = kindOf(name, mime);
  const size = buf.byteLength; // pdf.js detaches the buffer, so read this first
  let text = "";
  let pages: number | undefined;
  let note: string | undefined;
  switch (kind) {
    case "pdf": {
      const r = await extractText(buf, { mergePages: true });
      text = r.text.replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
      pages = r.totalPages;
      if (!text) note = "The PDF has no text layer (scanned pages?), so nothing could be extracted.";
      break;
    }
    case "docx":
      text = docxText(buf);
      break;
    case "pptx": {
      const r = pptxText(buf);
      text = r.text;
      pages = r.slides;
      break;
    }
    case "html":
      text = stripHtml(new TextDecoder().decode(buf), Number.MAX_SAFE_INTEGER) ?? "";
      break;
    case "text":
      text = new TextDecoder().decode(buf);
      break;
    default:
      note = "This file type isn't converted to text. The user can open it from the LMS link.";
  }

  const limit = Math.min(Math.max(maxChars, 1000), MAX_TEXT_CHARS);
  const truncated = text.length > limit;
  if (truncated) text = text.slice(0, limit);
  return { name, mimeType: mime || "application/octet-stream", size, kind, external, pages, text, truncated, note };
}
