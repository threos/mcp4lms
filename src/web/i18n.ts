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
  footer: {
    open: "Open source · free · AGPL-3.0",
    affiliation: "Not affiliated with any university, Moodle HQ, Anthropic, OpenAI, Google or Anysphere.",
    trademark: "Moodle™ is a trademark of Moodle Pty Ltd. Other names and logos belong to their owners.",
    disclaimer: "Disclaimer",
  },
  copy: "Copy",
  copied: "Copied",

  tutorial: {
    caption: "The whole thing, in 22 seconds",
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
    open: (host: string) => `Open ${host} ↗`,
    step3: (bookmark: string) => html`Click <b>${bookmark}</b> while your LMS is open`,
    step3Lead:
      "You'll come back here with your personal key. The bookmark asks your LMS for an app token, encrypts it so only this service can read it, and sends it here. It never sees your password.",
    js: {
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
    deleteNote: "To also end the app session on your LMS itself, log out of all devices there.",
    revoked: "App disconnected.",
    deletedTitle: "Deleted",
    deleted: "Your account, encrypted token and all app connections are gone.",
    backHome: "Back to home",
  },

  privacy: {
    title: "Privacy",
    lead: "Short version: we store an encrypted token, you hold the key, and Claude can only read.",
    storeTitle: "What we store",
    store: [
      "An account id, your LMS user id and when you connected.",
      "Your LMS app token, encrypted with your personal key. We don't keep the key, so we can't decrypt it on our own.",
      "For each connected app (like Claude): a record of the connection. Your token is copied into it, encrypted again with that app's access token, so it can only be read when that app makes a request.",
    ],
    storeNote:
      "No name, email, password, course content or grades. Course data passes through our server to Claude when Claude asks, and isn't saved or logged.",
    neverTitle: "What we never see",
    never:
      "Your LMS or Microsoft password. You log in on your LMS's own site, in your own browser. The Connect bookmark only asks your LMS for an app token, the same kind the official Moodle app uses, and encrypts it before sending it here.",
    canTitle: "What Claude can do",
    can: "Read courses, course contents, deadlines, assignments and submission status, grades, announcements and the text of course files (PDF, Word, PowerPoint, text). Mcp4Lms allows a fixed list of read-only LMS functions. It can't submit, post, message or change anything.",
    knowTitle: "What you should know",
    know: [
      "When the AI reads a course file, its contents pass through our server to the AI tool once and aren't stored or logged.",
      "Your key and the token can read your LMS data. Keep the key private.",
      "While Claude is using Mcp4Lms, our server handles your token in memory. You're trusting that the server runs the published open-source code.",
      "When your connection expires (or you delete it), we delete the encrypted token and disconnect apps, but we do not revoke the app token on the LMS itself; you can end it there by logging out of all devices on your LMS.",
    ],
    knowAccount: html`Disconnect apps or delete everything under <a href="/account">Account</a>, any time.`,
    disclaimerTitle: "Disclaimer",
    disclaimer: [
      "Mcp4Lms is provided free of charge, as is, without warranty of any kind. It is an independent open-source project released under the AGPL-3.0 license. It is not affiliated with, endorsed by or operated by any university, Moodle HQ, Anthropic, OpenAI, Google, Anysphere (Cursor) or any other AI tool vendor.",
      "Use is at your own risk. You are responsible for keeping your personal key private, for how you use your course data through AI tools, and for complying with your university's rules on account use and academic integrity.",
      "AI tools can misread, omit or summarize information incorrectly. Always verify deadlines, grades and requirements on your LMS before acting on them.",
      "To the extent permitted by law, the people running this service are not liable for any damages, missed deadlines, lost data, grading outcomes or account problems arising from its use. The service may change or stop at any time without notice.",
    ],
  },

  notFound: { title: "Not found", message: "This page doesn't exist.", home: "Home" },

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
  footer: {
    open: "Açık kaynak · ücretsiz · AGPL-3.0",
    affiliation: "Hiçbir üniversite, Moodle HQ, Anthropic, OpenAI, Google veya Anysphere ile bağlantılı değildir.",
    trademark: "Moodle™, Moodle Pty Ltd'nin tescilli markasıdır. Diğer adlar ve logolar sahiplerine aittir.",
    disclaimer: "Sorumluluk reddi",
  },
  copy: "Kopyala",
  copied: "Kopyalandı",

  tutorial: {
    caption: "Tamamı, 22 saniyede",
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
    mobile: "Telefonda görünüyorsunuz. Bu adımı bilgisayarda yapın. Sonrasında Claude telefonunuzda da çalışır.",
    pickTitle: "Üniversitenizi seçin",
    pickLead: "Mcp4Lms üniversitenizin LMS'ine bağlanır. Sizinkini seçin.",
    notAvailable: "henüz mevcut değil",
    change: "Değiştir",
    affiliation: (uni: unknown) =>
      html`Mcp4Lms bağımsız bir açık kaynak projesidir. ${uni} ile bağlantılı değildir ve onun tarafından onaylanmamıştır.`,
    step1: "Yer imini ekleyin",
    step1Lead: "Aşağıdaki düğmeyi tarayıcınızın yer imleri çubuğuna sürükleyin.",
    mockApps: "Uygulamalar",
    mockCalendar: "Takvim",
    dragTitle: "Beni yer imleri çubuğunuza sürükleyin",
    hint: "Bunu yukarıya, yer imleri çubuğunuza sürükleyin.",
    barHidden: (shortcut: unknown) => html`Yer imleri çubuğu gizli mi? ${shortcut} tuşlarına basın.`,
    added: "Ekledim",
    byHand: "Sürükleyemiyor musunuz? Elle ekleyin",
    copyBookmark: "Yer imi adresini kopyala",
    byHand2: html`Yer imleri çubuğuna sağ tıklayın ve <b>Sayfa ekle…</b> (Chrome, Edge) ya da <b>Yer İmi Ekle…</b> (Firefox) seçeneğini seçin.`,
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
    open: (host: string) => `${host} adresini açın ↗`,
    step3: (bookmark: string) => html`LMS'iniz açıkken <b>${bookmark}</b> yer imine tıklayın`,
    step3Lead:
      "Kişisel anahtarınızla buraya geri döneceksiniz. Yer imi LMS'inizden bir uygulama belirteci ister, yalnızca bu hizmetin okuyabileceği şekilde şifreler ve buraya gönderir. Parolanızı asla görmez.",
    js: {
      clickedHere: "Buraya tıklamayın. Yukarıya, gerçek yer imleri çubuğunuza sürükleyin.",
      dragging: "Bu pencerenin üstündeki yer imleri çubuğuna bırakın.",
      notAdded: "Henüz eklenmedi. En yukarıya, adres çubuğunun altına kadar sürükleyin.",
      picture: "Bu sadece bir resim. Tarayıcınızın kendi yer imleri çubuğuna, bu sayfanın üstüne bırakın.",
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
      "Tüm uygulamaların bağlantısını keser; şifrelenmiş LMS belirtecinizi ve hesabınızı siler. İstediğiniz zaman yeniden bağlanabilirsiniz.",
    deleteButton: "Her şeyi sil",
    deleteNote: "LMS'inizdeki uygulama oturumunu da sonlandırmak için orada tüm cihazlardan çıkış yapın.",
    revoked: "Uygulamanın bağlantısı kesildi.",
    deletedTitle: "Silindi",
    deleted: "Hesabınız, şifrelenmiş belirteciniz ve tüm uygulama bağlantılarınız silindi.",
    backHome: "Ana sayfaya dön",
  },

  privacy: {
    title: "Gizlilik",
    lead: "Kısaca: biz şifrelenmiş bir belirteç saklarız, anahtar sizde durur ve Claude yalnızca okuyabilir.",
    storeTitle: "Ne saklıyoruz",
    store: [
      "Bir hesap kimliği, LMS kullanıcı kimliğiniz ve ne zaman bağlandığınız.",
      "Kişisel anahtarınızla şifrelenmiş LMS uygulama belirteciniz. Anahtarı saklamadığımız için onu kendi başımıza çözemeyiz.",
      "Bağlı her uygulama (örneğin Claude) için: bağlantının bir kaydı. Belirteciniz bu kayda, o uygulamanın erişim belirteciyle yeniden şifrelenerek kopyalanır; böylece yalnızca o uygulama istek yaptığında okunabilir.",
    ],
    storeNote:
      "Ad, e-posta, parola, ders içeriği veya not saklanmaz. Ders verileri Claude sorduğunda sunucumuz üzerinden Claude'a geçer; kaydedilmez ve günlüğe yazılmaz.",
    neverTitle: "Asla görmediklerimiz",
    never:
      "LMS veya Microsoft parolanız. LMS'inizin kendi sitesinde, kendi tarayıcınızda giriş yaparsınız. Bağlan yer imi LMS'inizden yalnızca resmî Moodle uygulamasının kullandığı türden bir uygulama belirteci ister ve buraya göndermeden önce şifreler.",
    canTitle: "Claude ne yapabilir",
    can: "Dersleri, ders içeriklerini, son teslim tarihlerini, ödevleri ve teslim durumunu, notları, duyuruları ve ders dosyalarının metnini (PDF, Word, PowerPoint, düz metin) okuyabilir. Mcp4Lms yalnızca sabit bir salt okunur LMS işlevleri listesine izin verir. Teslim edemez, gönderi paylaşamaz, mesaj atamaz ve hiçbir şeyi değiştiremez.",
    knowTitle: "Bilmeniz gerekenler",
    know: [
      "Yapay zekâ bir ders dosyasını okuduğunda içeriği sunucumuz üzerinden yapay zekâ aracına bir kez iletilir; saklanmaz ve kaydedilmez.",
      "Anahtarınız ve belirteç LMS verilerinizi okuyabilir. Anahtarı gizli tutun.",
      "Claude Mcp4Lms'i kullanırken sunucumuz belirtecinizi bellekte işler. Sunucunun yayımlanan açık kaynak kodu çalıştırdığına güveniyorsunuz.",
      "Bağlantınızın süresi dolduğunda (veya onu sildiğinizde) şifrelenmiş belirteci siler ve uygulamaların bağlantısını keseriz; ancak LMS'in kendisindeki uygulama belirtecini iptal etmeyiz. Onu orada sonlandırmak için LMS'inizde tüm cihazlardan çıkış yapın.",
    ],
    knowAccount: html`İstediğiniz zaman <a href="/account">Hesap</a> altından uygulamaların bağlantısını kesin veya her şeyi silin.`,
    disclaimerTitle: "Sorumluluk reddi",
    disclaimer: [
      "Mcp4Lms ücretsiz, \"olduğu gibi\" ve hiçbir garanti olmaksızın sunulur. AGPL-3.0 lisansıyla yayımlanan bağımsız bir açık kaynak projesidir. Hiçbir üniversite, Moodle HQ, Anthropic, OpenAI, Google, Anysphere (Cursor) veya başka bir yapay zekâ aracı sağlayıcısı ile bağlantılı değildir; onlar tarafından onaylanmamış veya işletilmemektedir.",
      "Kullanım riski size aittir. Kişisel anahtarınızı gizli tutmaktan, ders verilerinizi yapay zekâ araçlarında nasıl kullandığınızdan ve üniversitenizin hesap kullanımı ile akademik dürüstlük kurallarına uymaktan siz sorumlusunuz.",
      "Yapay zekâ araçları bilgileri yanlış okuyabilir, atlayabilir veya hatalı özetleyebilir. Teslim tarihlerini, notları ve gereksinimleri bir karar vermeden önce her zaman LMS'inizden doğrulayın.",
      "Yasaların izin verdiği ölçüde, bu hizmeti işletenler hizmetin kullanımından doğan zararlardan, kaçırılan teslim tarihlerinden, veri kaybından, not sonuçlarından veya hesap sorunlarından sorumlu tutulamaz. Hizmet önceden bildirilmeksizin herhangi bir zamanda değişebilir veya durdurulabilir.",
    ],
  },

  notFound: { title: "Bulunamadı", message: "Bu sayfa mevcut değil.", home: "Ana sayfa" },

  api: {
    missing: "Veri eksik. Bağlan sayfasından yeniden başlayın.",
    invalid: "Bu bağlantı linki geçersiz. Yer iminiz eski olabilir: Bağlan sayfasından yeniden ekleyin.",
    expired: "Bu bağlantı linkinin süresi doldu. LMS'te yer imine tekrar tıklayın.",
    unexpected: "LMS'ten beklenmedik bir yanıt geldi.",
    used: "Bu bağlantı linki zaten kullanıldı.",
    rejected: "LMS belirteci reddetti.",
    unreachable: "LMS'e ulaşılamadı.",
    tryAgain: "Lütfen tekrar deneyin.",
    otherSite: "Bu belirteç başka bir siteye ait.",
    unverified: "LMS yanıtı doğrulanamadı.",
  },

  bookmarklet: {
    wrongSite: "Mcp4Lms LMS'inizde ({host}) çalışır. Şimdi açılsın mı? Sonra yer imine tekrar tıklayın.",
    login: "Mcp4Lms: lütfen önce LMS'inize giriş yapın, sonra yer imine tekrar tıklayın.",
  },
};

export const strings: Record<Lang, Strings> = { en, tr };
