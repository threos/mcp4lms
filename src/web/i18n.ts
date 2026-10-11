// All user-visible copy of the web pages, in English and Turkish.
// `en` defines the shape; `tr` must provide every key. Entries are plain strings,
// `html` fragments (trusted markup, authored here) or functions that take the
// dynamic parts and return one of those. Strings that end up inside inline
// <script>s are plain strings and use {placeholders} replaced in the browser.
// MCP tool descriptions (src/mcp.ts) are meant for the AI and stay in English.
import { html } from "hono/html";
import type { Ttl } from "../accounts";

export type Lang = "en" | "tr";
export const LANGS: readonly Lang[] = ["en", "tr"];
export const DEFAULT_LANG: Lang = "en";
export const isLang = (x: unknown): x is Lang => typeof x === "string" && (LANGS as readonly string[]).includes(x);

/** Picks the best supported language from an Accept-Language header. */
export function langFromAcceptLanguage(header: string | undefined): Lang | undefined {
  if (!header) return undefined;
  const ranked = header
    .split(",")
    .map((part, i) => {
      const [tag, ...params] = part.trim().split(";");
      const q = params.map((p) => /^\s*q=([\d.]+)/.exec(p)).find(Boolean);
      return { lang: tag.trim().toLowerCase().split("-")[0], q: q ? Number(q[1]) : 1, i };
    })
    .filter((x) => x.q > 0)
    .sort((a, b) => b.q - a.q || a.i - b.i);
  return ranked.find((x) => isLang(x.lang))?.lang as Lang | undefined;
}

const en = {
  langName: "English",
  nav: { connect: "Connect", account: "Account", privacy: "Privacy", language: "Language" },
  lmsPicker: {
    title: "Choose your university",
    lead: "This link opens a page on your university's LMS. Pick yours first.",
    notAvailable: "not yet available",
    close: "Close",
  },
  footer: {
    open: "Open source · free · AGPL-3.0",
    affiliation: "Not affiliated with any university, Moodle HQ, Anthropic, OpenAI, Google or Anysphere.",
    trademark: "Moodle™ is a trademark of Moodle Pty Ltd. Other names and logos belong to their owners.",
    disclaimer: "Disclaimer",
    universities: "For universities",
  },
  copy: "Copy",
  copied: "Copied",

  tutorial: {
    caption: "The whole thing, in 22 seconds",
    demoCaption: "Ask Claude about a course",
    hint: "Click to pause or play",
  },
  home: {
    title: "Your courses, in Claude",
    description: "Connect Claude to your university LMS. Read-only, open source, free.",
    h1: (rot: unknown) => html`Your courses,<br>in ${rot}.`,
    /** Per-tool forms of the rotating name in `h1` (e.g. Turkish case suffixes), in the order of the tool list; undefined = the plain names. */
    h1Forms: undefined as string[] | undefined,
    lead: (rot: unknown) =>
      html`Ask about deadlines, materials, assignments, grades and announcements from your university's LMS. ${rot} reads, never writes.`,
    connectCta: "Connect your LMS",
    haveKey: "I have a key",
    prompt: "What's due this week?",
    facts: ["Read-only", "Open source", "Free", "Delete your data any time"],
    haveTitle: "Already have a key?",
    haveLead: "Add Mcp4Lms to your AI tool, then enter your key.",
    manage: html`Manage connected apps or delete everything under <a href="/account">Account</a>.`,
  },

  /** How long the stored LMS token stays usable. Keys are seconds, matching TTL_CHOICES in src/accounts.ts. */
  ttl: {
    label: "Access expires after",
    options: { 86400: "24 hours", 604800: "7 days", 2592000: "30 days", 7776000: "90 days" } satisfies Record<Ttl, string>,
    hint: "After that Claude loses access until you connect again. You can change this later under Account.",
  },

  picker: {
    label: "Choose your AI tool",
    claude: {
      s1: html`In Claude, open <b>Settings → Connectors → Add custom connector</b>.`,
      s2: (urlRow: unknown) => html`Name it <code>Mcp4Lms</code> and paste this URL: ${urlRow}`,
      s3: html`Click <b>Connect</b> and enter your key when asked.`,
    },
    chatgpt: {
      s1: html`In ChatGPT, open <b>Settings → Connectors → Advanced</b> and turn on <b>Developer mode</b>.`,
      s2: (urlRow: unknown) =>
        html`Back in <b>Connectors</b>, click <b>Create</b>. Name it <code>Mcp4Lms</code>, paste this URL as the MCP server URL and choose <b>OAuth</b>: ${urlRow}`,
      s3: html`Enter your key when asked. In a chat, enable it under <b>+ → Connectors</b>.`,
    },
    gemini: {
      s1: "In a terminal with Gemini CLI installed, run:",
      s2: html`Start <code>gemini</code>, run <code>/mcp auth mcp4lms</code> and enter your key in the browser.`,
    },
    cursor: {
      add: "Add to Cursor",
      s1: (urlRow: unknown) => html`Or open <b>Cursor Settings → MCP → Add new MCP server</b> and use this URL: ${urlRow}`,
      s2: html`Click <b>Login</b> next to Mcp4Lms and enter your key.`,
    },
  },

  connect: {
    title: "Connect",
    h1: "Connect your LMS",
    lead: "About a minute, on a computer. You only do this once.",
    experimental: html`Mcp4Lms is an experimental open-source project. Continue at your own risk. See <a href="/privacy#encryption">how your access is protected</a>.`,
    chrome: html`Works best in <a href="https://www.google.com/chrome/" target="_blank" rel="noopener">Google Chrome</a> on a computer. Other browsers can block or hide bookmarklets.`,
    mobile: "You seem to be on a phone. Do this step on a computer. Afterwards Claude works on your phone too.",
    pickTitle: "Choose your university",
    pickLead: "Mcp4Lms connects to your university's LMS. Pick yours.",
    notAvailable: "not yet available",
    change: "Change",
    affiliation: (uni: unknown) =>
      html`Mcp4Lms is an independent open-source project. It is not affiliated with or endorsed by ${uni}.`,
    step1: "Add the bookmark",
    step1Lead: "Drag the button below onto your browser's bookmarks bar.",
    mockApps: "Apps",
    mockCalendar: "Calendar",
    dragTitle: "Drag me to your bookmarks bar",
    hint: "Drag this up to your bookmarks bar.",
    barHidden: (shortcut: unknown) => html`Bookmarks bar hidden? Press ${shortcut}.`,
    added: "I've added it",
    byHand: "Can't drag it? Add it by hand",
    copyBookmark: "Copy bookmark address",
    byHand2: html`Right-click your bookmarks bar and choose <b>Add page…</b> (Chrome, Edge) or <b>Add Bookmark…</b> (Firefox).`,
    byHand3: (name: string) => html`Name: <code>${name}</code>. URL: paste.`,
    console: "Prefer a script in the console instead",
    copyScript: "Copy script",
    console2: (lmsLink: unknown) =>
      html`Open ${lmsLink}, press <kbd>F12</kbd> (Mac: <kbd>⌥</kbd> <kbd>⌘</kbd> <kbd>I</kbd>), open <b>Console</b>.`,
    yourLms: "your LMS",
    console3: html`Paste, press <kbd>Enter</kbd>. Chrome may ask you to type <code>allow pasting</code> first.`,
    consoleTrust: (host: string) =>
      html`Only paste scripts from sites you trust. This one talks only to your LMS and ${host}, and it's open source.`,
    step2: "Open your LMS",
    step2Lead: "Log in as usual if it asks.",
    step3: (bookmark: string) => html`Click <b>${bookmark}</b> while your LMS is open`,
    step3Lead:
      "You'll come back here with your personal key. The bookmark asks your LMS for an app token, encrypts it so only this service can read it, and sends it here. It never sees your password.",
    js: {
      open: "Open {host} ↗",
      clickedHere: "Don't click it here. Drag it up to your real bookmarks bar.",
      dragging: "Drop it on the bookmarks bar at the top of this window.",
      notAdded: "Not added yet. Drag it all the way up, under the address bar.",
      picture: "That's just a picture. Drop it on your browser's own bookmarks bar, above this page.",
      added: "Added. Continue with step 2.",
    },
  },

  finish: {
    title: "Finish connecting",
    working: "Connecting…",
    workingLead: "Checking with your LMS.",
    failed: "That didn't work.",
    retry: "Try again",
    connected: "Connected.",
    lead: "One thing left: save your personal key.",
    replaced:
      "You had connected before. Your old key no longer works, and Claude apps that used it need to be connected again with this new key.",
    keyTitle: "Your personal key",
    keyLead:
      "Your LMS access is sealed with it and we don't keep a copy. Treat it like a password; a password manager is a good place for it.",
    copyKey: "Copy key",
    download: "Download as file",
    saved: "I've saved my key",
    saveFirst: "Save your key first. You'll need it to connect Claude.",
    lost: "Lost it later? Connect again and you get a new one.",
    backTitle: "Back to your AI tool",
    backLead: "It's waiting for this key.",
    continue: "Continue connecting",
    addTitle: "Add Mcp4Lms to your AI tool",
    thenAsk: (prompt: string) => html`Then ask: <i>“${prompt}”</i>`,
    js: {
      nothing: "Nothing to finish. Start from the Connect page.",
      wrong: "Something went wrong.",
      connected: "Connected.",
      connectedName: "Connected, {name}.",
      fileHead: "Mcp4Lms key",
      fileNote: "Keep this private. Anyone with it can read your courses through Mcp4Lms.",
      fileLost: "Lost it? Connect again at {url} to get a new one.",
      expires: "Expires on {date}. Connecting again resets it.",
      continueTo: "Continue to {client} ({host})",
      unknown: "We don't recognize this app. It will get read access to your courses at {host}. Continue only if you started this yourself from that app.",
      phishing: "This looks like phishing: the app calls itself “{client}” but would send your access to {host}, which is not {brand}. Don't continue unless you're sure.",
    },
  },

  authorize: {
    title: "Connect Claude",
    h1: (client: unknown) => html`Connect ${client} to your LMS`,
    lead: (client: string) =>
      html`<b>${client}</b> asks for read-only access to your courses, deadlines, assignments, grades and announcements.`,
    keyLabel: "Your personal key",
    keyHint: html`Starts with <code>m4l_</code>. You got it when you connected.`,
    redirect: (host: string) => html`You'll be sent back to <b>${host}</b>.`,
    loopback: html`<b>Note:</b> that's an app on this computer. Continue only if you started this from an app you trust.`,
    unknown: (host: string) =>
      html`<b>We don't recognize this app.</b> It will get read access to your courses and send you to <b>${host}</b>. Continue only if you started this yourself from that app.`,
    phishing: (client: string, host: string, brand: string) =>
      html`<b>This looks like phishing.</b> The app calls itself “${client}” but would send your access to <b>${host}</b>, which is not ${brand}. Don't continue unless you're sure.`,
    approve: "Approve",
    cancel: "Cancel",
    noKey: html`No key yet? <a href="/connect">Connect your LMS first</a> and you'll come back here.`,
    wrongKey: "That key doesn't work. Check that you copied all of it.",
    expired: "Your LMS connection has expired. Please connect your account again.",
    keyExpired: "This connection has expired, as you chose when connecting. Connect your LMS again to get a new key.",
    invalidTitle: "Invalid request",
    invalid: (detail: string) => `The app sent an invalid authorization request. ${detail}`,
    failedTitle: "Something went wrong",
    failed: (detail: string) => `Please start connecting again from Claude. (${detail})`,
  },

  account: {
    title: "Account",
    lead: "See connected apps, disconnect them, or delete everything.",
    keyLabel: "Your personal key",
    continue: "Continue",
    lostKey: html`Lost your key? <a href="/connect">Connect again</a> to get a new one.`,
    wrongKey: "That key doesn't work.",
    keyExpired: "This connection has expired, as you chose when connecting. Connect your LMS again to get a new key.",
    lmsTitle: "Your LMS",
    connectedAs: (name: string, date: string) => html`Connected as <b>${name}</b> on ${date}.`,
    connectedOn: (date: string) => `Connected on ${date}.`,
    expiresOn: (date: string) => html`Access expires on <b>${date}</b>.`,
    expiryLead: "Change it: the new period counts from now.",
    expiryUpdated: "Expiry updated.",
    appsTitle: "Connected apps",
    since: (date: string) => `since ${date}`,
    disconnect: "Disconnect",
    none: "Nothing connected yet.",
    deleteTitle: "Delete everything",
    deleteLead: "Disconnects every app and deletes your encrypted LMS token and account. You can always connect again.",
    deleteButton: "Delete everything",
    revokeLead:
      "This doesn't revoke the token on your LMS. To end it there too, reset it on your LMS after deleting here. This may sign you out of the Moodle app.",
    revokeButton: "Revoke the token on your LMS ↗",
    revoked: "App disconnected.",
    deletedTitle: "Deleted",
    deleted: "Your account, encrypted token and all app connections are gone.",
    deletedRevoke:
      "The token itself still works on your LMS until you revoke it there. Resetting it may sign you out of the Moodle app.",
    backHome: "Back to home",
  },

  privacy: {
    title: "Privacy",
    lead: "In short: we store an encrypted token, you hold the key, and Mcp4Lms only lets Claude read.",
    cryptoTitle: "Encryption and access",
    tocTitle: "On this page",
    cryptoLead:
      "Your LMS token is what lets Mcp4Lms read your courses. Here is where it goes and who can see it.",
    connectTitle: "When you connect",
    connectAlt:
      "Diagram: your browser logs in to your LMS and clicks the Connect bookmark. The LMS returns an app token. The bookmark encrypts it and sends it to Mcp4Lms, which encrypts it again with your personal key and stores only that. Your personal key is shown to you once.",
    connectPoints: [
      "You log in on your LMS as usual. We never see your password.",
      "The Connect bookmark gets an app token from your LMS and encrypts it before sending it to us. Only our server can open it.",
      "Our server encrypts the token again with your personal key and stores only that. We don't keep your key, so we can't open the stored token without you.",
    ],
    requestTitle: "When Claude asks a question",
    requestAlt:
      "Diagram: Claude sends a question to Mcp4Lms. Mcp4Lms decrypts your token in memory, makes one read-only request to your LMS, returns the course data to Claude and discards the token. Claude never receives the token.",
    requestPoints: [
      "Claude sends the question to Mcp4Lms.",
      "Mcp4Lms decrypts your token in memory, makes one read-only request to your LMS, and forgets the token again.",
      "Claude gets the course data back. It never receives the token.",
    ],
    whoTitle: "Who can read your token?",
    whoCols: { who: "Who", can: "Can read it?" },
    who: [
      { who: "You, with your personal key", kind: "yes", answer: "Yes", note: "The key is shown once and never stored." },
      { who: "Mcp4Lms, while stored", kind: "no", answer: "No", note: "The database holds only the encrypted token." },
      { who: "Mcp4Lms, during a request", kind: "mem", answer: "In memory only", note: "Decrypted for one request, then discarded." },
      { who: "Claude", kind: "no", answer: "No", note: "Claude receives course data, never the token." },
      { who: "Your LMS", kind: "lms", answer: "Issued it", note: "You can end it there by logging out of all devices." },
    ],
    techTitle: "Technical details",
    tech: [
      "Connect: the bookmark encrypts the token with the server's RSA-OAEP public key, so it never appears in plain text in a URL, your browser history or the console.",
      "Storage: the token is encrypted with AES-256-GCM under a key derived (HKDF) from your personal key. Only a verifier of the key is stored, never the key.",
      "Use: when you connect an app, the token is placed in that app's connection, encrypted again with the app's own access token. Each request decrypts it in memory for a single read-only LMS call.",
    ],
    storeTitle: "What we store",
    store: [
      "An account id, your LMS user id and the date you connected.",
      "Your LMS app token, encrypted with your personal key. We don't keep the key, so we can't decrypt the token ourselves.",
      "A connection record for each app you connect (such as Claude). Your token is copied into that record, encrypted again with the app's own access token, so it can only be decrypted when that app makes a request.",
    ],
    storeNote:
      "We don't store your name, email, password, course content or grades. Course data passes through our server to Claude only when Claude requests it, and is never saved or logged.",
    neverTitle: "What we never see",
    never:
      "Your LMS or Microsoft password. You log in to your LMS on its own site, in your own browser. The Connect bookmark only asks the LMS for an app token, the same kind the official Moodle app uses, and encrypts it before sending it to us.",
    canTitle: "What Claude can do",
    can: "Read your courses, course contents, deadlines, assignments and submission status, grades, announcements, and the text of course files (PDF, Word, PowerPoint, plain text). Mcp4Lms allows only a fixed set of read-only LMS functions. Claude cannot submit assignments, post, send messages or change anything.",
    tokenTitle: "What the LMS token itself can do",
    token:
      "It's the same kind of token the official Moodle app uses, so technically it can do anything you can do in that app, such as submitting assignments or sending messages. Mcp4Lms only ever uses it for a fixed set of read-only calls. Deleting your data here, or letting it expire, doesn't revoke it on your LMS.",
    tokenReset: (a: (text: string) => unknown) =>
      html`To revoke it, open ${a("Security keys on your LMS")} and reset the key for the Moodle mobile service. This may sign you out of the Moodle app.`,
    knowTitle: "What you should know",
    know: [
      "When the AI reads a course file, its contents pass through our server to the AI tool once, and are never stored or logged.",
      "Links outside the LMS are opened only after you confirm them in the conversation, and never with your LMS credentials.",
      "Your key and your token give access to your LMS data. Don't share your key with anyone.",
      "While Claude is using Mcp4Lms, our server handles your token in memory only. At that point you are trusting that the server runs the published open-source code.",
      "When your connection expires, or you delete it, we delete the encrypted token and remove app access. We don't revoke the app token on the LMS itself; see above for how to revoke it there.",
    ],
    knowAccount: html`You can disconnect apps or delete all your data at any time under <a href="/account">Account</a>.`,
    securityTitle: "Security contact and disclosure",
    security: [
      html`Found a vulnerability? Email <a href="mailto:security@mcp4lms.com">security@mcp4lms.com</a>. Include the steps to reproduce it, and don't access other people's data while testing. We aim to acknowledge reports within 3 days and will tell you when the issue is fixed.`,
      (repo: string) =>
        html`For anything else, such as questions, data requests or requests from a university, write to <a href="mailto:maintainers@mcp4lms.com">maintainers@mcp4lms.com</a>. The code is public on <a href="${repo}" target="_blank" rel="noopener">GitHub</a>; please report security issues by email rather than in a public issue.`,
    ],
    optOutTitle: "Opting out",
    optOut: [
      html`Open <a href="/account">Account</a>, enter your key, and disconnect individual apps or delete everything. Deletion removes your account, the encrypted token and all app connections immediately.`,
      "Lost your key? Connect again from your LMS. This issues a new key and invalidates the old one, and you can then delete your account from the Account page.",
      (a: (text: string) => unknown) =>
        html`To also end the app token on your LMS, reset it under ${a("Security keys")} there. This may sign you out of the Moodle app.`,
      "If you do nothing, your data is deleted automatically when the access period you chose expires.",
      html`Administering an LMS? See <a href="#universities">For universities and LMS admins</a>.`,
    ],
    uniTitle: "For universities and LMS admins",
    uniIntro:
      "Mcp4Lms uses the same app token mechanism as the official Moodle mobile app. A student signs in on your LMS themselves, and the token is used only for a fixed set of read-only web service calls on that student's own data. No course data is stored, and the token is encrypted with a key only the student holds.",
    uniCollab:
      "Today this works without your involvement, which is not ideal for anyone. We would much rather build an official, consent-gated and standardized path with you: a client registered on your LMS, a standard OAuth flow instead of a bookmark, and permission scopes that you define.",
    uniBenefits: [
      html`<b>Your institution</b> decides which data and permissions are allowed, and can revoke access centrally.`,
      html`<b>Students</b> sign in with their usual login and give clear, fine-grained consent, which is easier and more secure.`,
      html`<b>Maintainers</b> use proper verification, client registration and standard OAuth flows instead of workarounds.`,
    ],
    uniContact: html`We would be glad, and would prefer, to work with your IT and legal teams on an integration that fits your policies and your students' needs. Write to <a href="mailto:maintainers@mcp4lms.com">maintainers@mcp4lms.com</a>.`,
    uniOptOutTitle: "Requesting an opt-out",
    uniOptOut: [
      html`If you would prefer that your institution not be supported, email <a href="mailto:maintainers@mcp4lms.com">maintainers@mcp4lms.com</a> from an official institutional address. Include your concerns and any policy or legal basis, so we can resolve the request quickly for both sides.`,
      "We kindly ask that requests be non-confidential. An opt-out affects hundreds of students, so to keep trust and transparency in this open-source project, we share approved takedown requests in the project's public channels as proof to the community. For the fastest and smoothest resolution, please confirm that your request may be shared publicly once a takedown is approved. We do not publish requests that concern a proven privacy issue, security flaw or incident, or a newly discovered security or design flaw.",
      "Sending a request does not by itself guarantee removal. We review every request and reply. In many cases a scoped, official integration addresses the concern better than a block, so we would welcome a conversation first.",
      "Opted-out institutions are not listed on the hosted version at mcp4lms.com. Their LMS address is also added to a blocklist in the open-source code, so self-hosted copies do not work with it out of the box.",
    ],
    hostTitle: "Hosted MCP for institutions",
    hostIntro:
      "We encourage institutions to offer their own hosted MCP service, tailored to their policies, infrastructure and systems. You are welcome to fork Mcp4Lms and deploy your own instance.",
    hostCommunity:
      "In that case, the community can help on a voluntary basis to bring Mcp4Lms in as an official resource that your institution hosts, governs, manages and provides. Running it yourself gives you greater control over:",
    hostControls: [
      "Consent and how students connect",
      "Access logging. The open-source and hosted versions do not keep access or usage logs.",
      "AI policies and which tools are allowed",
      "Permissions, entity controls and role-based access control (RBAC)",
    ],
    hostContact: (repo: string) =>
      html`Reach out to <a href="mailto:maintainers@mcp4lms.com">maintainers@mcp4lms.com</a> to collaborate, or deploy your own customized instance from the <a href="${repo}" target="_blank" rel="noopener">source code</a> under the AGPL-3.0 license, which requires sharing your changes with the users of your service. Collaboration depends on the volunteers' availability at the time and is not guaranteed.`,
    hostNonProfit:
      "Mcp4Lms is a strictly non-profit, experimental and volunteer-run project. We do not ask for any payment for this.",
    disclaimerTitle: "Disclaimer",
    disclaimer: [
      "Mcp4Lms is provided free of charge, as is, without warranty of any kind. It is an independent open-source project released under the AGPL-3.0 license. It is not affiliated with, endorsed by or operated by any university, Moodle HQ, Anthropic, OpenAI, Google, Anysphere (Cursor) or any other AI tool vendor.",
      "You use the service at your own risk. You are responsible for keeping your personal key private, for how you use your course data in AI tools, and for complying with your university's rules on account use and academic integrity.",
      "AI tools can misread, omit or summarize information incorrectly. Always verify deadlines, grades and assignment requirements on your LMS before acting on them.",
      "To the extent permitted by law, the people running this service are not liable for any damages, missed deadlines, lost data, grading outcomes or account problems arising from its use. The service may change or stop at any time without notice.",
    ],
  },

  notFound: { title: "Not found", message: "This page doesn't exist.", home: "Home" },
  download: {
    invalidTitle: "Link used or expired",
    invalid: "This download link has already been used or has expired. Links work once, for 5 minutes. Ask Claude for a new one.",
    failedTitle: "Download failed",
    failed: "The LMS refused the file. Try again, or open it from the LMS.",
  },

  /** Errors returned by /api/connect; the finish page shows them verbatim. */
  api: {
    missing: "Missing data. Start again from the Connect page.",
    invalid: "This connect link is invalid. Your bookmark may be outdated: add it again from the Connect page.",
    expired: "This connect link has expired. Click the bookmark on the LMS again.",
    unexpected: "Unexpected response from the LMS.",
    used: "This connect link was already used.",
    rejected: "The LMS rejected the token.",
    unreachable: "Couldn't reach the LMS.",
    tryAgain: "Please try again.",
    otherSite: "This token belongs to a different site.",
    unverified: "Couldn't verify the LMS response.",
  },

  /** Dialogs shown by the bookmarklet on the LMS page. {host} is the LMS host. */
  bookmarklet: {
    wrongSite: "Mcp4Lms works on your LMS ({host}). Open it now? Then click the bookmark again.",
    login: "Mcp4Lms: please log in to your LMS first, then click the bookmark again.",
  },
};

export type Strings = typeof en;

const tr: Strings = {
  langName: "Türkçe",
  nav: { connect: "Bağlan", account: "Hesap", privacy: "Gizlilik", language: "Dil" },
  lmsPicker: {
    title: "Üniversitenizi seçin",
    lead: "Bu bağlantı üniversitenizin LMS'inde bir sayfa açar. Önce üniversitenizi seçin.",
    notAvailable: "henüz mevcut değil",
    close: "Kapat",
  },
  footer: {
    open: "Açık kaynak · ücretsiz · AGPL-3.0",
    affiliation: "Hiçbir üniversite, Moodle HQ, Anthropic, OpenAI, Google veya Anysphere ile bağlantılı değildir.",
    trademark: "Moodle™, Moodle Pty Ltd'nin tescilli markasıdır. Diğer adlar ve logolar sahiplerine aittir.",
    disclaimer: "Sorumluluk reddi",
    universities: "Üniversiteler için",
  },
  copy: "Kopyala",
  copied: "Kopyalandı",

  tutorial: {
    caption: "Hızlıca bağlayın",
    demoCaption: "Claude'a bir ders hakkında soru sorun",
    hint: "Durdurmak veya oynatmak için tıklayın",
  },
  home: {
    title: "Derslerinizi Claude'a sorun",
    description: "Claude'u üniversitenizin LMS'ine bağlayın. Salt okunur, açık kaynak, ücretsiz.",
    h1: (rot: unknown) => html`Derslerinizi<br>${rot} sorun.`,
    // Dative forms per tool, following vowel harmony; same order as the tool list in pages.ts.
    h1Forms: ["Claude'a", "ChatGPT'ye", "Gemini'ye", "Cursor'a"],
    lead: (rot: unknown) =>
      html`Üniversitenizin LMS'ine bağlanarak son teslim tarihleri, materyaller, ödevler ve duyuruları yapay zekâ araçlarınıza bağlayın. ${rot} yalnızca okur, sizin adınıza yazma işlemi yapmaz.`,
    connectCta: "LMS'inizi bağlayın",
    haveKey: "Anahtarım var",
    prompt: "Bugün hangi derslerin teslimi var?",
    facts: ["Salt okunur", "Açık kaynak", "Ücretsiz", "Verilerinizi istediğiniz zaman silin"],
    haveTitle: "Zaten anahtarınız var mı?",
    haveLead: "Mcp4Lms'i yapay zekâ aracınıza ekleyin, sonra anahtarınızı girin.",
    manage: html`Bağlı uygulamaları yönetmek veya her şeyi silmek için <a href="/account">Hesap</a> sayfasına gidin.`,
  },

  ttl: {
    label: "Erişim süresi",
    options: { 86400: "24 saat", 604800: "7 gün", 2592000: "30 gün", 7776000: "90 gün" },
    hint: "Süre dolunca Claude, siz yeniden bağlanana kadar erişimini kaybeder. Bunu daha sonra Hesap sayfasından değiştirebilirsiniz.",
  },

  picker: {
    label: "Yapay zekâ aracınızı seçin",
    claude: {
      s1: html`Claude'da <b>Settings → Connectors → Add custom connector</b> yolunu açın.`,
      s2: (urlRow: unknown) => html`Adını <code>Mcp4Lms</code> koyun ve bu URL'yi yapıştırın: ${urlRow}`,
      s3: html`<b>Connect</b>'e tıklayın ve sorulduğunda anahtarınızı girin.`,
    },
    chatgpt: {
      s1: html`ChatGPT'de <b>Settings → Connectors → Advanced</b> bölümünü açın ve <b>Developer mode</b>'u etkinleştirin.`,
      s2: (urlRow: unknown) =>
        html`<b>Connectors</b>'a dönüp <b>Create</b>'e tıklayın. Adını <code>Mcp4Lms</code> koyun, MCP sunucu URL'si olarak bu adresi yapıştırın ve <b>OAuth</b>'u seçin: ${urlRow}`,
      s3: html`Sorulduğunda anahtarınızı girin. Sohbette <b>+ → Connectors</b> altından etkinleştirin.`,
    },
    gemini: {
      s1: "Gemini CLI kurulu bir terminalde şunu çalıştırın:",
      s2: html`<code>gemini</code>'yi başlatın, <code>/mcp auth mcp4lms</code> komutunu çalıştırın ve tarayıcıda anahtarınızı girin.`,
    },
    cursor: {
      add: "Cursor'a ekle",
      s1: (urlRow: unknown) =>
        html`Ya da <b>Cursor Settings → MCP → Add new MCP server</b> yolunu açın ve bu URL'yi kullanın: ${urlRow}`,
      s2: html`Mcp4Lms'in yanındaki <b>Login</b>'e tıklayın ve anahtarınızı girin.`,
    },
  },

  connect: {
    title: "Bağlan",
    h1: "LMS'inizi bağlayın",
    lead: "Bilgisayarda yaklaşık bir dakika sürer. Bunu yalnızca bir kez yaparsınız.",
    experimental: html`Mcp4Lms deneysel bir açık kaynak projesidir. Lütfen kendi sorumluluğunuzda devam edin. Erişiminizi korumak için alınan önlemleri <a href="/privacy#encryption">burada</a> görebilirsiniz.`,
    chrome: html`En iyi sonuç için bilgisayarda <a href="https://www.google.com/chrome/" target="_blank" rel="noopener">Google Chrome</a> kullanın. Diğer tarayıcılar yer işareti uygulamacıklarını engelleyebilir veya gizleyebilir.`,
    mobile: "Telefonda görünüyorsunuz. Bu adımı bilgisayarda yapın. Sonrasında Claude telefonunuzda da çalışır.",
    pickTitle: "Üniversitenizi seçin",
    pickLead: "Mcp4Lms üniversitenizin LMS'ine bağlanır. Sizinkini seçin.",
    notAvailable: "henüz mevcut değil",
    change: "Değiştir",
    affiliation: (uni: unknown) =>
      html`Mcp4Lms bağımsız bir açık kaynak projesidir. ${uni} ile bağlantılı değildir ve onun tarafından onaylanmamıştır.`,
    step1: "Yer işaretini ekleyin",
    step1Lead: "Aşağıdaki düğmeyi tarayıcınızın yer işaretleri çubuğuna sürükleyin.",
    mockApps: "Uygulamalar",
    mockCalendar: "Takvim",
    dragTitle: "Beni yer işaretleri çubuğunuza sürükleyin",
    hint: "Bunu yukarıya, yer işaretleri çubuğunuza sürükleyin.",
    barHidden: (shortcut: unknown) => html`Yer işaretleri çubuğu gizli mi? ${shortcut} tuşlarına basın.`,
    added: "Ekledim",
    byHand: "Sürükleyemiyor musunuz? Elle ekleyin",
    copyBookmark: "Yer işareti adresini kopyala",
    byHand2: html`Yer işaretleri çubuğuna sağ tıklayın ve <b>Sayfa ekle…</b> (Chrome, Edge) ya da <b>Yer İmi Ekle…</b> (Firefox) seçeneğini seçin.`,
    byHand3: (name: string) => html`Ad: <code>${name}</code>. URL: yapıştırın.`,
    console: "Bunun yerine konsola betik yapıştırın",
    copyScript: "Betiği kopyala",
    console2: (lmsLink: unknown) =>
      html`${lmsLink} açın, <kbd>F12</kbd> tuşuna basın (Mac: <kbd>⌥</kbd> <kbd>⌘</kbd> <kbd>I</kbd>), <b>Console</b> sekmesini açın.`,
    yourLms: "LMS'inizi",
    console3: html`Yapıştırıp <kbd>Enter</kbd>'a basın. Chrome önce <code>allow pasting</code> yazmanızı isteyebilir.`,
    consoleTrust: (host: string) =>
      html`Yalnızca güvendiğiniz sitelerden betik yapıştırın. Bu betik sadece LMS'iniz ve ${host} ile konuşur ve açık kaynaklıdır.`,
    step2: "LMS'inizi açın",
    step2Lead: "Sorarsa her zamanki gibi giriş yapın.",
    step3: (bookmark: string) => html`LMS'iniz açıkken <b>${bookmark}</b> yer işaretine tıklayın`,
    step3Lead:
      "Kişisel anahtarınızla buraya geri döneceksiniz. Yer işareti LMS'inizden bir uygulama tokeni ister, yalnızca bu hizmetin okuyabileceği şekilde şifreler ve buraya gönderir. Parolanızı asla görmez.",
    js: {
      open: "{host} adresini açın ↗",
      clickedHere: "Buraya tıklamayın. Yukarıya, gerçek yer işaretleri çubuğunuza sürükleyin.",
      dragging: "Bu pencerenin üstündeki yer işaretleri çubuğuna bırakın.",
      notAdded: "Henüz eklenmedi. En yukarıya, adres çubuğunun altına kadar sürükleyin.",
      picture: "Bu sadece bir resim. Tarayıcınızın kendi yer işaretleri çubuğuna, bu sayfanın üstüne bırakın.",
      added: "Eklendi. 2. adımla devam edin.",
    },
  },

  finish: {
    title: "Bağlantıyı tamamlayın",
    working: "Bağlanıyor…",
    workingLead: "LMS'inizle doğrulanıyor.",
    failed: "Bu işe yaramadı.",
    retry: "Tekrar deneyin",
    connected: "Bağlandınız.",
    lead: "Son bir şey kaldı: kişisel anahtarınızı kaydedin.",
    replaced:
      "Daha önce bağlanmıştınız. Eski anahtarınız artık çalışmıyor; onu kullanan Claude uygulamalarının bu yeni anahtarla yeniden bağlanması gerekiyor.",
    keyTitle: "Kişisel anahtarınız",
    keyLead:
      "LMS erişiminiz bu anahtarla mühürlenir ve biz bir kopyasını saklamayız. Ona parola gibi davranın; bir parola yöneticisi onun için iyi bir yerdir.",
    copyKey: "Anahtarı kopyala",
    download: "Dosya olarak indir",
    saved: "Anahtarımı kaydettim",
    saveFirst: "Önce anahtarınızı kaydedin. Claude'u bağlamak için ona ihtiyacınız olacak.",
    lost: "Sonradan kaybederseniz? Yeniden bağlanın, yenisini alırsınız.",
    backTitle: "Yapay zekâ aracınıza dönün",
    backLead: "Bu anahtarı bekliyor.",
    continue: "Bağlanmaya devam edin",
    addTitle: "Mcp4Lms'i yapay zekâ aracınıza ekleyin",
    thenAsk: (prompt: string) => html`Sonra sorun: <i>“${prompt}”</i>`,
    js: {
      nothing: "Tamamlanacak bir şey yok. Bağlan sayfasından başlayın.",
      wrong: "Bir şeyler ters gitti.",
      connected: "Bağlandınız.",
      connectedName: "Bağlandınız, {name}.",
      fileHead: "Mcp4Lms anahtarı",
      fileNote: "Bunu gizli tutun. Elinde bulunan herkes Mcp4Lms üzerinden derslerinizi okuyabilir.",
      fileLost: "Kaybettiniz mi? Yenisini almak için {url} adresinden yeniden bağlanın.",
      expires: "Süresi {date} tarihinde dolar. Yeniden bağlanmak süreyi sıfırlar.",
      continueTo: "{client} uygulamasına devam edin ({host})",
      unknown: "Bu uygulamayı tanımıyoruz. {host} adresinde derslerinize okuma erişimi alacak. Yalnızca bunu o uygulamadan kendiniz başlattıysanız devam edin.",
      phishing: "Bu bir oltalama girişimine benziyor: uygulama kendini “{client}” olarak tanıtıyor ama erişiminizi {brand} olmayan {host} adresine gönderecek. Emin değilseniz devam etmeyin.",
    },
  },

  authorize: {
    title: "Claude'u bağlayın",
    h1: (client: unknown) => html`${client} uygulamasını LMS'inize bağlayın`,
    lead: (client: string) =>
      html`<b>${client}</b>, derslerinize, son teslim tarihlerinize, ödevlerinize, notlarınıza ve duyurularınıza salt okunur erişim istiyor.`,
    keyLabel: "Kişisel anahtarınız",
    keyHint: html`<code>m4l_</code> ile başlar. Bağlandığınızda almıştınız.`,
    redirect: (host: string) => html`<b>${host}</b> adresine geri gönderileceksiniz.`,
    loopback: html`<b>Not:</b> bu, bu bilgisayardaki bir uygulama. Yalnızca güvendiğiniz bir uygulamadan başlattıysanız devam edin.`,
    unknown: (host: string) =>
      html`<b>Bu uygulamayı tanımıyoruz.</b> Derslerinize okuma erişimi alacak ve sizi <b>${host}</b> adresine gönderecek. Yalnızca bunu o uygulamadan kendiniz başlattıysanız devam edin.`,
    phishing: (client: string, host: string, brand: string) =>
      html`<b>Bu bir oltalama girişimine benziyor.</b> Uygulama kendini “${client}” olarak tanıtıyor ama erişiminizi ${brand} olmayan <b>${host}</b> adresine gönderecek. Emin değilseniz devam etmeyin.`,
    approve: "Onayla",
    cancel: "İptal",
    noKey: html`Henüz anahtarınız yok mu? <a href="/connect">Önce LMS'inizi bağlayın</a>, sonra buraya geri döneceksiniz.`,
    wrongKey: "Bu anahtar çalışmıyor. Tamamını kopyaladığınızdan emin olun.",
    expired: "LMS bağlantınızın süresi doldu. Lütfen hesabınızı yeniden bağlayın.",
    keyExpired: "Bu bağlantının süresi, bağlanırken seçtiğiniz gibi doldu. Yeni bir anahtar almak için LMS'inizi yeniden bağlayın.",
    invalidTitle: "Geçersiz istek",
    invalid: (detail: string) => `Uygulama geçersiz bir yetkilendirme isteği gönderdi. ${detail}`,
    failedTitle: "Bir şeyler ters gitti",
    failed: (detail: string) => `Lütfen Claude'dan yeniden bağlanmayı başlatın. (${detail})`,
  },

  account: {
    title: "Hesap",
    lead: "Bağlı uygulamaları görün, bağlantılarını kesin veya her şeyi silin.",
    keyLabel: "Kişisel anahtarınız",
    continue: "Devam et",
    lostKey: html`Anahtarınızı mı kaybettiniz? Yenisini almak için <a href="/connect">yeniden bağlanın</a>.`,
    wrongKey: "Bu anahtar çalışmıyor.",
    keyExpired: "Bu bağlantının süresi, bağlanırken seçtiğiniz gibi doldu. Yeni bir anahtar almak için LMS'inizi yeniden bağlayın.",
    lmsTitle: "LMS'iniz",
    connectedAs: (name: string, date: string) => html`${date} tarihinde <b>${name}</b> olarak bağlandınız.`,
    connectedOn: (date: string) => `${date} tarihinde bağlandınız.`,
    expiresOn: (date: string) => html`Erişim süresi <b>${date}</b> tarihinde dolar.`,
    expiryLead: "Değiştirin: yeni süre şu andan itibaren sayılır.",
    expiryUpdated: "Süre güncellendi.",
    appsTitle: "Bağlı uygulamalar",
    since: (date: string) => `${date} tarihinden beri`,
    disconnect: "Bağlantıyı kes",
    none: "Henüz bağlı uygulama yok.",
    deleteTitle: "Her şeyi silin",
    deleteLead:
      "Tüm uygulamaların bağlantısını keser; şifrelenmiş LMS tokeninizi ve hesabınızı siler. İstediğiniz zaman yeniden bağlanabilirsiniz.",
    deleteButton: "Her şeyi sil",
    revokeLead:
      "Bu işlem LMS'inizdeki tokeni iptal etmez. Onu da sonlandırmak için burada sildikten sonra tokeni LMS'inizde sıfırlayın. Bu, Moodle uygulamasından çıkış yapmanıza neden olabilir.",
    revokeButton: "Tokeni LMS'inizde iptal edin ↗",
    revoked: "Uygulamanın bağlantısı kesildi.",
    deletedTitle: "Silindi",
    deleted: "Hesabınız, şifrelenmiş tokeniniz ve tüm uygulama bağlantılarınız silindi.",
    deletedRevoke:
      "Tokenin kendisi, siz LMS'inizde iptal edene kadar orada çalışmaya devam eder. Sıfırlamak, Moodle uygulamasından çıkış yapmanıza neden olabilir.",
    backHome: "Ana sayfaya dön",
  },

  privacy: {
    title: "Gizlilik",
    lead: "Özetle: şifrelenmiş bir token saklarız, anahtar sizde kalır ve Mcp4Lms, Claude'un yalnızca okuma yapmasına izin verir.",
    cryptoTitle: "Şifreleme ve erişim",
    tocTitle: "Bu sayfada",
    cryptoLead:
      "LMS tokeniniz, Mcp4Lms'in derslerinizi okumasını sağlayan şeydir. Aşağıda tokenin nereye gittiğini ve kimin görebildiğini bulabilirsiniz.",
    connectTitle: "Bağlanırken",
    connectAlt:
      "Şema: tarayıcınız LMS'inize giriş yapar ve Bağlan yer işaretine tıklar. LMS bir uygulama tokeni döndürür. Yer işareti tokeni şifreler ve Mcp4Lms'e gönderir; Mcp4Lms tokeni kişisel anahtarınızla yeniden şifreler ve yalnızca bunu saklar. Kişisel anahtarınız size bir kez gösterilir.",
    connectPoints: [
      "LMS'inize her zamanki gibi giriş yaparsınız. Parolanızı hiçbir zaman görmeyiz.",
      "Bağlan yer işareti LMS'inizden bir uygulama tokeni alır ve bize göndermeden önce şifreler. Bunu yalnızca sunucumuz açabilir.",
      "Sunucumuz tokeni kişisel anahtarınızla yeniden şifreler ve yalnızca bunu saklar. Anahtarınızı saklamadığımız için saklanan tokeni siz olmadan açamayız.",
    ],
    requestTitle: "Claude soru sorduğunda",
    requestAlt:
      "Şema: Claude, Mcp4Lms'e bir soru gönderir. Mcp4Lms tokeninizi bellekte çözer, LMS'inize tek bir salt okunur istek yapar, ders verisini Claude'a iletir ve tokeni bellekten siler. Claude tokeni hiçbir zaman almaz.",
    requestPoints: [
      "Claude soruyu Mcp4Lms'e gönderir.",
      "Mcp4Lms tokeninizi bellekte çözer, LMS'inize tek bir salt okunur istek yapar ve tokeni yeniden unutur.",
      "Claude ders verisini alır. Tokeni hiçbir zaman almaz.",
    ],
    whoTitle: "Tokeninizi kim okuyabilir?",
    whoCols: { who: "Kim", can: "Okuyabilir mi?" },
    who: [
      { who: "Siz, kişisel anahtarınızla", kind: "yes", answer: "Evet", note: "Anahtar bir kez gösterilir ve hiçbir yerde saklanmaz." },
      { who: "Mcp4Lms, saklama sırasında", kind: "no", answer: "Hayır", note: "Veritabanında yalnızca şifrelenmiş token bulunur." },
      { who: "Mcp4Lms, istek sırasında", kind: "mem", answer: "Yalnızca bellekte", note: "Tek bir istek için çözülür, ardından silinir." },
      { who: "Claude", kind: "no", answer: "Hayır", note: "Claude ders verisini alır, tokeni asla almaz." },
      { who: "LMS'iniz", kind: "lms", answer: "Tokeni veren taraf", note: "Tüm cihazlardan çıkış yaparak tokeni orada sonlandırabilirsiniz." },
    ],
    techTitle: "Teknik ayrıntılar",
    tech: [
      "Bağlantı: yer işareti tokeni sunucunun RSA-OAEP açık anahtarıyla şifreler; böylece token bir URL'de, tarayıcı geçmişinizde veya konsolda hiçbir zaman düz metin olarak görünmez.",
      "Saklama: token, kişisel anahtarınızdan türetilen (HKDF) bir anahtarla AES-256-GCM kullanılarak şifrelenir. Anahtarın kendisi değil, yalnızca bir doğrulama değeri saklanır.",
      "Kullanım: bir uygulamayı bağladığınızda token o uygulamanın bağlantısına, uygulamanın kendi erişim tokeniyle yeniden şifrelenerek yerleştirilir. Her istekte tek bir salt okunur LMS çağrısı için bellekte çözülür.",
    ],
    storeTitle: "Sakladığımız veriler",
    store: [
      "Bir hesap kimliği, LMS kullanıcı kimliğiniz ve bağlantı tarihi.",
      "Kişisel anahtarınızla şifrelenmiş LMS uygulama tokeniniz. Anahtarınızı saklamadığımız için bu tokeni kendi başımıza çözemeyiz.",
      "Bağladığınız her uygulama (örneğin Claude) için bir bağlantı kaydı. Tokeniniz bu kayda, ilgili uygulamanın erişim tokeniyle yeniden şifrelenerek kopyalanır; böylece yalnızca o uygulama istek gönderdiğinde çözülebilir.",
    ],
    storeNote:
      "Adınız, e-posta adresiniz, parolanız, ders içerikleriniz veya notlarınız saklanmaz. Ders verileri yalnızca Claude istekte bulunduğunda sunucumuz üzerinden Claude'a aktarılır; kaydedilmez ve günlüğe yazılmaz.",
    neverTitle: "Hiçbir zaman görmediğimiz veriler",
    never:
      "LMS veya Microsoft parolanız. LMS'e kendi tarayıcınızdan, LMS'in kendi sitesi üzerinden giriş yaparsınız. Bağlan yer işareti LMS'ten yalnızca resmî Moodle uygulamasının kullandığı türde bir uygulama tokeni ister ve bu tokeni bize göndermeden önce şifreler.",
    canTitle: "Claude'un yapabildikleri",
    can: "Dersleri, ders içeriklerini, son teslim tarihlerini, ödevleri ve teslim durumunu, notları, duyuruları ve ders dosyalarının metnini (PDF, Word, PowerPoint, düz metin) okuyabilir. Mcp4Lms yalnızca önceden belirlenmiş, salt okunur LMS işlevlerine izin verir. Claude ödev teslim edemez, gönderi paylaşamaz, mesaj gönderemez ve hiçbir veriyi değiştiremez.",
    tokenTitle: "LMS tokeninin kendisi neler yapabilir?",
    token:
      "Bu, resmî Moodle uygulamasının kullandığı türde bir tokendir; yani teknik olarak o uygulamada yapabildiğiniz her şeyi, örneğin ödev teslim etmeyi veya mesaj göndermeyi yapabilir. Mcp4Lms onu yalnızca önceden belirlenmiş salt okunur çağrılar için kullanır. Verilerinizi burada silmeniz veya sürenin dolması, tokeni LMS'inizde iptal etmez.",
    tokenReset: (a: (text: string) => unknown) =>
      html`İptal etmek için ${a("LMS'inizdeki Güvenlik anahtarları")} sayfasını açın ve Moodle mobil hizmetine ait anahtarı sıfırlayın. Bu, Moodle uygulamasından çıkış yapmanıza neden olabilir.`,
    knowTitle: "Bilmeniz gerekenler",
    know: [
      "Yapay zekâ bir ders dosyasını okuduğunda dosya içeriği sunucumuz üzerinden yapay zekâ aracına yalnızca bir kez aktarılır; saklanmaz ve günlüğe yazılmaz.",
      "LMS dışındaki bağlantılar yalnızca siz sohbette onayladıktan sonra açılır ve bu sırada LMS kimlik bilgileriniz hiçbir zaman kullanılmaz.",
      "Anahtarınız ve tokeniniz LMS verilerinize erişim sağlar. Anahtarınızı kimseyle paylaşmayın.",
      "Claude Mcp4Lms'i kullanırken sunucumuz tokeninizi yalnızca bellekte işler. Bu noktada sunucunun yayımlanmış açık kaynak kodu çalıştırdığına güvenmiş olursunuz.",
      "Bağlantınızın süresi dolduğunda veya bağlantıyı sildiğinizde şifrelenmiş tokeni siler ve uygulamaların erişimini kaldırırız; ancak LMS üzerindeki uygulama tokenini iptal etmeyiz. Orada nasıl iptal edeceğinizi yukarıda bulabilirsiniz.",
    ],
    knowAccount: html`Uygulamaların bağlantısını kesmek veya tüm verilerinizi silmek için istediğiniz zaman <a href="/account">Hesap</a> sayfasını kullanabilirsiniz.`,
    securityTitle: "Güvenlik iletişimi ve güvenlik zafiyeti bildirimi",
    security: [
      html`Bir güvenlik zafiyeti mi buldunuz? <a href="mailto:security@mcp4lms.com">security@mcp4lms.com</a> adresine yazın. Zafiyeti yeniden oluşturma adımlarını ekleyin ve test sırasında başkalarının verilerine erişmeyin. Bildirimleri 3 gün içinde yanıtlamayı hedefliyoruz ve sorun giderildiğinde size haber veririz.`,
      (repo: string) =>
        html`Sorular, veri talepleri veya üniversitelerden gelen talepler gibi diğer tüm konular için <a href="mailto:maintainers@mcp4lms.com">maintainers@mcp4lms.com</a> adresine yazın. Kod <a href="${repo}" target="_blank" rel="noopener">GitHub</a>'da herkese açıktır; güvenlik sorunlarını lütfen herkese açık bir issue yerine e-posta ile bildirin.`,
    ],
    optOutTitle: "Kullanımı sonlandırma",
    optOut: [
      html`<a href="/account">Hesap</a> sayfasını açın, anahtarınızı girin ve tek tek uygulamaların bağlantısını kesin veya her şeyi silin. Silme işlemi hesabınızı, şifrelenmiş tokeni ve tüm uygulama bağlantılarını anında kaldırır.`,
      "Anahtarınızı mı kaybettiniz? LMS'inizden yeniden bağlanın. Bu işlem yeni bir anahtar verir ve eskisini geçersiz kılar; ardından hesabınızı Hesap sayfasından silebilirsiniz.",
      (a: (text: string) => unknown) =>
        html`LMS üzerindeki uygulama tokenini de sonlandırmak için onu LMS'inizdeki ${a("Güvenlik anahtarları")} sayfasından sıfırlayın. Bu, Moodle uygulamasından çıkış yapmanıza neden olabilir.`,
      "Hiçbir şey yapmazsanız verileriniz, seçtiğiniz erişim süresi dolduğunda otomatik olarak silinir.",
      html`Bir LMS yönetiyorsanız <a href="#universities">Üniversiteler ve LMS yöneticileri için</a> bölümüne bakın.`,
    ],
    uniTitle: "Üniversiteler ve LMS yöneticileri için",
    uniIntro:
      "Mcp4Lms, resmî Moodle mobil uygulamasının kullandığı uygulama tokeni mekanizmasını kullanır. Öğrenci LMS'inize kendisi giriş yapar ve token yalnızca o öğrencinin kendi verileri üzerinde, önceden belirlenmiş salt okunur web servisi çağrıları için kullanılır. Ders verisi saklanmaz ve token yalnızca öğrencinin sahip olduğu bir anahtarla şifrelenir.",
    uniCollab:
      "Bu yöntem bugün kurumunuzun katılımı olmadan çalışıyor ve bu durum hiçbir taraf için ideal değildir. Sizinle birlikte resmî, onaya dayalı ve standart bir yol oluşturmayı tercih ederiz: LMS'inizde kayıtlı bir istemci, yer işareti yerine standart bir OAuth akışı ve sizin belirlediğiniz izin kapsamları.",
    uniBenefits: [
      html`<b>Kurumunuz</b> hangi verilere ve izinlere erişilebileceğine karar verir ve erişimi merkezi olarak iptal edebilir.`,
      html`<b>Öğrenciler</b> alışık oldukları girişle ve net, ayrıntılı bir onay vererek daha kolay ve daha güvenli şekilde bağlanır.`,
      html`<b>Geliştiriciler</b> geçici çözümler yerine resmî doğrulama, istemci kaydı ve standart OAuth akışlarını kullanır.`,
    ],
    uniContact: html`Kurumunuzun politikalarına ve öğrencilerinizin ihtiyaçlarına uygun bir entegrasyon için BT ve hukuk ekiplerinizle birlikte çalışmaktan memnuniyet duyarız ve bunu tercih ederiz. <a href="mailto:maintainers@mcp4lms.com">maintainers@mcp4lms.com</a> adresine yazabilirsiniz.`,
    uniOptOutTitle: "Hariç tutulma talebi",
    uniOptOut: [
      html`Kurumunuzun desteklenmemesini tercih ediyorsanız resmî bir kurum adresinden <a href="mailto:maintainers@mcp4lms.com">maintainers@mcp4lms.com</a> adresine yazın. Talebin her iki taraf için de hızlı sonuçlanabilmesi için endişelerinizi ve dayandığınız politika veya hukuki gerekçeleri belirtin.`,
      "Taleplerin gizli olmayan bir yazışma olarak gönderilmesini rica ederiz. Bir hariç tutulma kararı yüzlerce öğrenciyi etkiler; bu nedenle bu açık kaynak projede güveni ve şeffaflığı korumak için onaylanan kaldırma taleplerini, topluluğa kanıt olarak projenin herkese açık kanallarında paylaşırız. En hızlı ve sorunsuz çözüm için, kaldırma onaylandığında talebinizin herkese açık paylaşılabileceğini lütfen teyit edin. Kanıtlanmış bir gizlilik sorunu, güvenlik zafiyeti veya güvenlik olayı ya da yeni keşfedilen bir güvenlik veya tasarım kusuru içeren talepler herkese açık paylaşılmaz.",
      "Talep göndermek tek başına hariç tutulmayı garanti etmez. Her talebi inceler ve yanıtlarız. Çoğu durumda kapsamı belirlenmiş resmî bir entegrasyon, endişeleri doğrudan engellemekten daha iyi karşılar; bu nedenle önce bir görüşme yapmayı memnuniyetle karşılarız.",
      "Hariç tutulan kurumlar, mcp4lms.com üzerinde barındırılan sürümde listelenmez. Kurumun LMS adresi ayrıca açık kaynak koddaki engelleme listesine eklenir; böylece kendi sunucusunda çalıştırılan kopyalar bu kurumla varsayılan olarak çalışmaz.",
    ],
    hostTitle: "Kurumlar için barındırılan MCP",
    hostIntro:
      "Kurumları, kendi politikalarına, altyapılarına ve sistemlerine göre uyarlanmış, kendi barındırdıkları bir MCP hizmeti sunmaya teşvik ediyoruz. Mcp4Lms'i fork'layarak, yani kopyalayıp değiştirerek kendi sürümünüzü kurabilirsiniz.",
    hostCommunity:
      "Bu durumda topluluk, Mcp4Lms'in kurumunuz tarafından barındırılan, yönetilen ve sunulan resmî bir kaynak hâline gelmesine gönüllü olarak yardımcı olabilir. Hizmeti kendiniz çalıştırmak size şu konularda daha fazla kontrol sağlar:",
    hostControls: [
      "Onay süreci ve öğrencilerin nasıl bağlandığı",
      "Erişim kayıtları. Açık kaynak sürüm ve barındırılan sürüm erişim veya kullanım kaydı tutmaz.",
      "Yapay zekâ politikaları ve hangi araçlara izin verildiği",
      "İzinler, varlık denetimleri ve rol tabanlı erişim denetimi (RBAC)",
    ],
    hostContact: (repo: string) =>
      html`İş birliği için <a href="mailto:maintainers@mcp4lms.com">maintainers@mcp4lms.com</a> adresine yazabilir ya da <a href="${repo}" target="_blank" rel="noopener">kaynak koddan</a> AGPL-3.0 lisansına uygun olarak kendi özelleştirilmiş kopyanızı kurabilirsiniz. Bu lisans, yaptığınız değişiklikleri hizmetinizin kullanıcılarıyla paylaşmanızı gerektirir. İş birliği, o dönemde gönüllülerin uygunluğuna bağlıdır ve garanti edilmez.`,
    hostNonProfit:
      "Mcp4Lms tamamen kâr amacı gütmeyen, deneysel ve gönüllülerce yürütülen bir projedir. Bunun için herhangi bir ücret talep etmeyiz.",
    disclaimerTitle: "Sorumluluk reddi",
    disclaimer: [
      "Mcp4Lms ücretsiz olarak, \"olduğu gibi\" ve hiçbir garanti verilmeksizin sunulur. AGPL-3.0 lisansıyla yayımlanan bağımsız bir açık kaynak projesidir. Hiçbir üniversite, Moodle HQ, Anthropic, OpenAI, Google, Anysphere (Cursor) veya başka bir yapay zekâ aracı sağlayıcısıyla bağlantılı değildir; bu kuruluşlar tarafından onaylanmamakta veya işletilmemektedir.",
      "Kullanım sorumluluğu size aittir. Kişisel anahtarınızı gizli tutmak, ders verilerinizi yapay zekâ araçlarında nasıl kullandığınız ve üniversitenizin hesap kullanımı ile akademik dürüstlük kurallarına uymak sizin sorumluluğunuzdadır.",
      "Yapay zekâ araçları bilgileri yanlış okuyabilir, atlayabilir veya hatalı özetleyebilir. Son teslim tarihlerini, notları ve ödev gereksinimlerini, bunlara dayanarak işlem yapmadan önce her zaman LMS'inizden doğrulayın.",
      "Yasaların izin verdiği ölçüde, bu hizmeti işletenler hizmetin kullanımından kaynaklanan hiçbir zarardan, kaçırılan teslim tarihinden, veri kaybından, not sonucundan veya hesap sorunundan sorumlu tutulamaz. Hizmet önceden bildirilmeksizin herhangi bir zamanda değiştirilebilir veya durdurulabilir.",
    ],
  },

  notFound: { title: "Bulunamadı", message: "Bu sayfa mevcut değil.", home: "Ana sayfa" },
  download: {
    invalidTitle: "Bağlantı kullanılmış ya da süresi dolmuş",
    invalid: "Bu indirme bağlantısı zaten kullanılmış ya da süresi dolmuş. Bağlantılar yalnızca bir kez ve 5 dakika boyunca çalışır. Claude'dan yeni bir bağlantı isteyin.",
    failedTitle: "İndirme başarısız",
    failed: "LMS dosyayı vermedi. Tekrar deneyin ya da dosyayı LMS'ten açın.",
  },

  api: {
    missing: "Veri eksik. Bağlan sayfasından yeniden başlayın.",
    invalid: "Bu bağlantı linki geçersiz. Yer işaretiniz eski olabilir: Bağlan sayfasından yeniden ekleyin.",
    expired: "Bu bağlantı linkinin süresi doldu. LMS'te yer işaretine tekrar tıklayın.",
    unexpected: "LMS'ten beklenmedik bir yanıt geldi.",
    used: "Bu bağlantı linki zaten kullanıldı.",
    rejected: "LMS tokeni reddetti.",
    unreachable: "LMS'e ulaşılamadı.",
    tryAgain: "Lütfen tekrar deneyin.",
    otherSite: "Bu token başka bir siteye ait.",
    unverified: "LMS yanıtı doğrulanamadı.",
  },

  bookmarklet: {
    wrongSite: "Mcp4Lms LMS'inizde ({host}) çalışır. Şimdi açılsın mı? Sonra yer işaretine tekrar tıklayın.",
    login: "Mcp4Lms: lütfen önce LMS'inize giriş yapın, sonra yer işaretine tekrar tıklayın.",
  },
};

export const strings: Record<Lang, Strings> = { en, tr };
