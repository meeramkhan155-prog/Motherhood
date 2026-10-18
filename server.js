// A tiny server with zero dependencies (needs Node 18 or newer; 20+ recommended).
// Replies are streamed: she sees the first words within a second or two, not after the whole answer.
// Job 1: serve the app files in /public.
// Job 2: pass chat messages to the AI model (NVIDIA Nemotron on Nebius), keeping your API key secret.

const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = process.env.PORT || 3000;
const API_KEY = process.env.NEBIUS_API_KEY;
const BASE_URL = (process.env.NEBIUS_BASE_URL || "https://api.tokenfactory.nebius.com/v1").replace(/\/+$/, "");
// Nebius lists this model as "nvidia/NVIDIA-Nemotron-3-Nano-30B-A3B". Always confirm the exact ID in the
// Token Factory model list (or GET /v1/models) and set NEBIUS_MODEL if it differs.
const MODEL = process.env.NEBIUS_MODEL || "nvidia/NVIDIA-Nemotron-3-Nano-30B-A3B";
// Nemotron 3 Nano "thinks" before answering by default. For a chat companion that only adds delay and
// cost, so ask the server to skip it. Set NEBIUS_THINKING=1 to turn thinking back on.
const THINKING = process.env.NEBIUS_THINKING === "1";
// Set TRUST_PROXY=1 when deployed behind a host/proxy (Render, Railway, Fly, nginx), so each visitor
// gets their own rate limit instead of everyone sharing the proxy's address.
const TRUST_PROXY = process.env.TRUST_PROXY === "1";

const PUBLIC_DIR = path.join(__dirname, "public");
const PROMPT_FILE = path.join(__dirname, "system-prompt.txt");

const MAX_BODY_BYTES = 2.5 * 1024 * 1024; // room for a short voice sample // roomy: Urdu/Arabic/Hindi text takes 2-3 bytes per letter
const MAX_MESSAGE_CHARS = 4000;
const MAX_HISTORY = 20; // how many recent messages the model sees
// Messages per minute per visitor. 0 = unlimited (the default). Every message still uses your
// Nebius credits, so if the app is public and you start seeing abuse, set RATE_LIMIT=60 or similar.
const RATE_LIMIT = Number(process.env.RATE_LIMIT || 0);
// She never sees "try again": if the model is slow, busy, or drops out, the server quietly starts over.
const FIRST_WORD_TIMEOUT_MS = 30_000; // no first word after this long = that attempt is stuck, start a fresh one
const STALL_TIMEOUT_MS = 20_000; // words stopped arriving mid-answer = stuck, start a fresh one
const TOTAL_BUDGET_MS = 120_000; // after this the server hands over to the phone, which keeps retrying
const MAX_ATTEMPTS = 4;
// A hard ceiling on reply length. If the model runs long, the reply is cut at the end of the last
// full sentence, never mid-sentence. About 400 tokens is around 250 words, well above the 100 word target.
const MAX_REPLY_TOKENS = 400;
function endAtSentence(text) {
  const m = text.match(/^[\s\S]*[.!?۔؟](?=\s|$)/);
  return m && m[0].length > text.length * 0.5 ? m[0] : text;
}

if (!API_KEY) console.warn("\n  Missing NEBIUS_API_KEY. The app will load, but chat will not work.\n");

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".woff2": "font/woff2",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json",
  ".webmanifest": "application/manifest+json",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".mp4": "video/mp4",
  ".vtt": "text/vtt; charset=utf-8",
};

// ---- crisis safety net ----
// The model is told how to handle these, but a small model can miss them. This check does not depend on
// the model: if her latest message matches, the app shows the emergency card no matter what the model says.
// Keep this list broad; a false alarm costs little, a miss can cost a lot. Add her languages here too.
const CRISIS_PATTERNS = [
  /\b(kill|hurt|harm|end)\s+(myself|me|my\s*self)\b/i,
  /\bsuicid/i,
  /\b(want|wish)\s+(to\s+)?(die|be\s+dead|disappear)\b/i,
  /\bbetter\s+off\s+without\s+me\b/i,
  /\b(don'?t|do\s+not)\s+want\s+to\s+(live|be\s+here|wake\s+up)\b/i,
  /\bself[\s-]?harm\b/i,
  /\b(end\s+it\s+all|can'?t\s+go\s+on|no\s+reason\s+to\s+live)\b/i,
  /\b(hurt|harm|kill|shake|smother|drown)\s+(the|my)\s+(baby|son|daughter|child|newborn)\b/i,
  /\b(baby|child)\s+(is|would\s+be)\s+better\s+off\s+without\s+me\b/i,
  /\b(hearing|seeing)\s+(voices|things)\b/i,
  /\bhaven'?t\s+slept\s+in\s+(days|\d+\s+days)\b/i,
];
CRISIS_PATTERNS.push(
  // Urdu (script and Roman Urdu)
  /خودکشی|خود کو مار|خود کو نقصان|مر جانا چاہتی|مرنا چاہتی|جینا نہیں چاہتی|بچے کو نقصان|بچے کو مار/,
  /\b(khudkushi|khudkashi|khud ko (maar|nuqsan)|marna chahti|mar jana chahti|jeena nahi chahti|bachay? ko (maar|nuqsan))/i,
  // Spanish
  /(suicid|quiero morir|me quiero morir|matarme|hacerme da[ñn]o|no quiero vivir|hacerle da[ñn]o (a mi|al) beb[eé]|lastimar (a mi|al) beb[eé])/iu,
  // Arabic
  /(انتحار|أنتحر|انتحر|أريد أن أموت|اريد ان اموت|أتمنى أن أموت|أقتل نفسي|اقتل نفسي|أؤذي نفسي|اؤذي نفسي|إيذاء نفسي|لا أريد أن أعيش|لا اريد ان اعيش|أؤذي طفلي|اؤذي طفلي|أقتل طفلي|اقتل طفلي|إيذاء طفلي)/u,
  // Turkish
  /(intihar|[öo]lmek istiyorum|kendimi [öo]ld[üu]r|kendime zarar|ya[şs]amak istemiyorum|bebe[ğg]ime zarar|bebe[ğg]imi [öo]ld[üu]r)/iu
);
const isCrisis = (text) => CRISIS_PATTERNS.some((re) => re.test(text));
const CRISIS_FALLBACKS = {
  en: "I'm really glad you told me. You don't have to carry this alone. Please call your local emergency number or a crisis line right now, or wake your partner or someone close and tell them exactly what you told me. Stay with someone. I'm right here with you while you do.",
  ur: "مجھے بہت خوشی ہے کہ آپ نے مجھے بتایا۔ آپ کو یہ بوجھ اکیلے نہیں اٹھانا۔ ابھی اپنے ایمرجنسی نمبر یا کسی ہیلپ لائن پر کال کریں، یا اپنے شوہر یا کسی قریبی کو جگائیں اور انہیں بالکل وہی بتائیں جو آپ نے مجھے بتایا۔ کسی کے ساتھ رہیں۔ میں یہیں آپ کے ساتھ ہوں۔",
  es: "Me alegra mucho que me lo hayas contado. No tienes que cargar con esto sola. Por favor, llama ahora a tu número local de emergencias o a una línea de crisis, o despierta a tu pareja o a alguien cercano y cuéntale exactamente lo que me dijiste. Quédate acompañada. Estoy aquí contigo mientras lo haces.",
  ar: "أنا سعيدة جداً لأنكِ أخبرتِني. لستِ مضطرة لحمل هذا وحدك. أرجوكِ اتصلي الآن برقم الطوارئ المحلي أو بخط مساعدة، أو أيقظي زوجك أو شخصاً قريباً منكِ وأخبريه بما قلتِه لي تماماً. ابقي مع أحد. أنا هنا معكِ.",
  tr: "Bana anlattığın için gerçekten çok sevindim. Bunu tek başına taşımak zorunda değilsin. Lütfen şimdi yerel acil numarasını ya da bir kriz hattını ara, ya da eşini veya yakın birini uyandırıp bana anlattıklarını aynen ona da anlat. Yalnız kalma. Sen bunu yaparken ben buradayım.",
};
const LANG_NAMES = { en: "English", ur: "Urdu", es: "Spanish", tr: "Turkish", ar: "Arabic" };


// ---- simple rate limiter (in memory, cleaned up so it can't grow forever) ----
const hits = new Map();
function tooMany(ip) {
  if (!RATE_LIMIT) return false; // unlimited
  const now = Date.now();
  const recent = (hits.get(ip) || []).filter((t) => now - t < 60_000);
  recent.push(now);
  hits.set(ip, recent);
  return recent.length > RATE_LIMIT;
}
setInterval(() => {
  const now = Date.now();
  for (const [ip, times] of hits) if (!times.some((t) => now - t < 60_000)) hits.delete(ip);
}, 60_000).unref();

function clientIp(req) {
  if (TRUST_PROXY) {
    const fwd = String(req.headers["x-forwarded-for"] || "").split(",")[0].trim();
    if (fwd) return fwd;
  }
  return req.socket.remoteAddress || "unknown";
}

function sendJson(res, status, obj, extraHeaders = {}) {
  if (res.headersSent || res.destroyed) return;
  res.writeHead(status, { "Content-Type": "application/json", "Cache-Control": "no-store", ...extraHeaders });
  res.end(JSON.stringify(obj));
}

// Read the request body. If it's too big we stop collecting but still answer with a proper 413,
// instead of cutting the connection (which the app would show as "no internet").
function readBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0;
    let tooBig = false;
    const chunks = [];
    req.on("data", (c) => {
      size += c.length;
      if (size > MAX_BODY_BYTES) tooBig = true;
      if (!tooBig) chunks.push(c);
    });
    req.on("end", () => (tooBig ? reject(new Error("too_big")) : resolve(Buffer.concat(chunks).toString("utf8"))));
    req.on("error", reject);
  });
}

// Make sure the conversation is well-formed before sending it on.
function cleanMessages(input) {
  if (!Array.isArray(input)) return null;
  const msgs = [];
  for (const m of input) {
    if (!m || (m.role !== "user" && m.role !== "assistant") || typeof m.content !== "string") continue;
    const content = m.content.slice(0, MAX_MESSAGE_CHARS).trim();
    if (!content) continue;
    const last = msgs[msgs.length - 1];
    // Two messages in a row from the same side (e.g. she sent again after an error): merge them,
    // because some chat templates expect user/assistant to alternate.
    if (last && last.role === m.role) last.content = (last.content + "\n\n" + content).slice(-MAX_MESSAGE_CHARS * 2);
    else msgs.push({ role: m.role, content });
  }
  let out = msgs.slice(-MAX_HISTORY);
  while (out.length && out[0].role !== "user") out.shift(); // must start with her
  if (!out.length || out[out.length - 1].role !== "user") return null; // must end with her
  return out;
}

// Turn raw model output into what she should see/hear.
function cleanReply(raw) {
  let text = typeof raw === "string" ? raw : "";
  // Thinking that leaked into the answer. Some templates emit only the closing tag, so keep what follows it.
  const close = text.toLowerCase().lastIndexOf("</think>");
  if (close !== -1) text = text.slice(close + "</think>".length);
  text = text.replace(/<think>[\s\S]*$/i, ""); // unfinished thinking at the end
  // The prompt asks for no markdown, but small models slip. Strip the common bits so the voice step won't read "asterisk".
  text = text
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/(^|\s)\*(\S.*?)\*(?=\s|$)/g, "$1$2")
    .replace(/^\s{0,3}#{1,6}\s+/gm, "")
    .replace(/^\s*[-*•]\s+/gm, "")
    .replace(/^\s*\d+[.)]\s+/gm, "")
    // No em or en dashes: they read as AI-written. Ranges become "to", the rest become commas.
    .replace(/(\d)\s*[–—]\s*(\d)/g, "$1 to $2")
    .replace(/\s*[—–]\s*/g, ", ")
    .replace(/,\s*([,.!?])/g, "$1");
  return text.trim();
}

let thinkingFlagOk = true; // flips to false if Nebius rejects the switch
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

class SetupError extends Error {} // wrong key / model ID: retrying can't fix it, the owner has to

// Open one streaming request to the model.
async function openModelStream(system, messages, signal) {
  const body = {
    model: MODEL,
    stream: true,
    max_tokens: THINKING ? 3000 : MAX_REPLY_TOKENS,
    temperature: 0.6,
    messages: [{ role: "system", content: system }, ...messages],
  };
  if (thinkingFlagOk) body.chat_template_kwargs = { enable_thinking: THINKING };
  const apiRes = await fetch(`${BASE_URL}/chat/completions`, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${API_KEY}` },
    body: JSON.stringify(body),
    signal,
  });
  if (apiRes.ok) return apiRes;

  const detail = (await apiRes.text().catch(() => "")).slice(0, 500);
  if (thinkingFlagOk && (apiRes.status === 400 || apiRes.status === 422)) {
    console.warn("Model rejected chat_template_kwargs, retrying without it:", detail);
    thinkingFlagOk = false;
    return openModelStream(system, messages, signal);
  }
  if ([401, 403, 404].includes(apiRes.status)) {
    throw new SetupError(`Model API ${apiRes.status} (check NEBIUS_API_KEY and NEBIUS_MODEL): ${detail}`);
  }
  throw new Error(`Model API ${apiRes.status}: ${detail}`); // busy / overloaded: worth retrying
}

// Read the model's stream (Server-Sent Events). Calls onText with the whole reply so far.
// Calls onActivity on every chunk so the stall watchdog knows it's alive.
async function readModelStream(apiRes, onText, onActivity) {
  const decoder = new TextDecoder();
  let buffer = "";
  let raw = "";
  let finish = null;
  let sawDone = false;
  for await (const chunk of apiRes.body) {
    onActivity();
    buffer += decoder.decode(chunk, { stream: true });
    let nl;
    while ((nl = buffer.indexOf("\n")) !== -1) {
      const line = buffer.slice(0, nl).trim();
      buffer = buffer.slice(nl + 1);
      if (!line.startsWith("data:")) continue;
      const payload = line.slice(5).trim();
      if (payload === "[DONE]") { sawDone = true; continue; }
      try {
        const choice = JSON.parse(payload).choices?.[0];
        if (choice?.finish_reason) finish = choice.finish_reason;
        const piece = choice?.delta?.content; // reasoning_content is deliberately ignored
        if (piece) {
          raw += piece;
          onText(raw);
        }
      } catch {}
    }
  }
  // A stream that ends without a finish signal was cut off, not finished.
  return { raw, complete: sawDone || finish !== null, finish };
}

// One full attempt: open, stream, watch for stalls. Resolves with the finished raw text.
async function attemptReply(system, messages, parentSignal, onText) {
  const ctrl = new AbortController();
  const onParentAbort = () => ctrl.abort();
  parentSignal.addEventListener("abort", onParentAbort);
  let watchdog = setTimeout(() => ctrl.abort(), FIRST_WORD_TIMEOUT_MS);
  let gotWords = false;
  const alive = () => {
    if (!gotWords) return; // keep the first-word timer until real words arrive
    clearTimeout(watchdog);
    watchdog = setTimeout(() => ctrl.abort(), STALL_TIMEOUT_MS);
  };
  try {
    const apiRes = await openModelStream(system, messages, ctrl.signal);
    const out = await readModelStream(
      apiRes,
      (raw) => {
        if (!gotWords && cleanReply(raw)) gotWords = true;
        onText(raw);
      },
      alive
    );
    if (!out.complete) throw new Error("stream ended early");
    if (out.finish === "length") out.raw = endAtSentence(out.raw); // too long: finish cleanly at a full stop
    if (!cleanReply(out.raw)) throw new Error("empty reply");
    return out.raw;
  } catch (err) {
    if (ctrl.signal.aborted && !parentSignal.aborted) throw new Error("model stalled");
    throw err;
  } finally {
    clearTimeout(watchdog);
    parentSignal.removeEventListener("abort", onParentAbort);
  }
}

async function handleChat(req, res) {
  if (tooMany(clientIp(req))) return sendJson(res, 429, { retry: true, error: "Busy" });

  let body;
  try {
    body = JSON.parse(await readBody(req));
  } catch (e) {
    if (e.message === "too_big") return sendJson(res, 413, { error: "That message is very long. Could you send it in two parts?" });
    return sendJson(res, 400, { error: "That message couldn't be read." });
  }

  const messages = cleanMessages(body && body.messages);
  if (!messages) return sendJson(res, 400, { error: "Nothing to answer yet." });

  const lang = LANG_NAMES[body.lang] ? body.lang : "en";
  const CRISIS_FALLBACK = CRISIS_FALLBACKS[lang]; // per request, so two moms in different languages never mix
  const crisis = isCrisis(messages[messages.length - 1].content);

  let system = null;
  try {
    system = fs.readFileSync(PROMPT_FILE, "utf8"); // re-read each time: edit the file, no restart needed
  } catch {
    console.error("system-prompt.txt is missing.");
  }
  // What she has told the app about herself, and her recent baby log (kept on her phone, sent with each question).
  const clip = (v, n = 80) => (typeof v === "string" ? v.replace(/[\r\n<>]/g, " ").trim().slice(0, n) : "");
  const prof = body.profile && typeof body.profile === "object" ? body.profile : null;
  if (system && prof) {
    const lines = [];
    if (clip(prof.name)) lines.push(`Her name is ${clip(prof.name)}. Use it rarely and warmly, not in every reply.`);
    if (prof.stage === "pregnant" && Number.isFinite(+prof.pregnancyWeek)) lines.push(`She is pregnant, about ${+prof.pregnancyWeek} weeks.`);
    if (prof.stage === "baby" && Number.isFinite(+prof.babyAgeDays)) {
      const d = +prof.babyAgeDays;
      const age = d < 14 ? `${d} days old` : d < 120 ? `${Math.floor(d / 7)} weeks old` : `${Math.floor(d / 30.4)} months old`;
      lines.push(`Her baby${clip(prof.babyName, 40) ? ", " + clip(prof.babyName, 40) + "," : ""} is ${age}. Make advice right for this age.`);
    }
    if (["breast", "formula", "both"].includes(prof.feeding)) lines.push(`Feeding: ${{ breast: "breastfeeding", formula: "formula feeding", both: "breast milk and formula" }[prof.feeding]}.`);
    const tr = body.tracker && typeof body.tracker === "object" ? body.tracker : null;
    if (tr) lines.push(`Her baby log for the last 24 hours: ${clip(tr.summary, 300)}. Use it if she asks about feeding, diapers or sleep, and mention a concern gently if the numbers look low for the baby's age.`);
    if (lines.length) system += `\n\nABOUT HER\n${lines.join("\n")}`;
  }
  if (system && lang !== "en") {
    const SCRIPT = {
      ur: "Write in Urdu, using Urdu script (Arabic letters, like: آپ کیسی ہیں). Never use Hindi or Devanagari script, and never Roman Urdu.",
      ar: "Write in Arabic script.",
      es: "Write in Spanish.",
      tr: "Write in Turkish.",
    }[lang];
    const rule = `The app is set to ${LANG_NAMES[lang]}. Always reply in ${LANG_NAMES[lang]}, even if she writes in English or Roman letters. ${SCRIPT}`;
    // said at the start and at the end, where a smaller model pays most attention
    system = `LANGUAGE\n${rule}\n\n${system}\n\nLANGUAGE, AGAIN\n${rule}`;
  }
  if (!API_KEY || !system) {
    if (crisis) return sendJson(res, 200, { reply: CRISIS_FALLBACK, crisis });
    console.error(!API_KEY ? "Missing NEBIUS_API_KEY." : "Missing system-prompt.txt.");
    return sendJson(res, 500, { fatal: true, error: "The assistant isn't set up yet. (Owner: check the terminal.)" });
  }

  // Start streaming to the phone right away: one JSON object per line.
  res.writeHead(200, {
    "Content-Type": "application/x-ndjson; charset=utf-8",
    "Cache-Control": "no-store",
    "X-Accel-Buffering": "no", // stops nginx-style proxies from holding the stream back
  });
  const send = (obj) => { if (!res.writableEnded && !res.destroyed) res.write(JSON.stringify(obj) + "\n"); };
  send({ crisis });

  const gone = new AbortController(); // she closed the app: stop paying for tokens
  res.on("close", () => { if (!res.writableEnded) gone.abort(); });

  let lastSent = "";
  let lastTime = 0;
  const push = (raw, force) => {
    const now = Date.now();
    if (!force && now - lastTime < 60) return; // ~16 updates a second is plenty
    const text = cleanReply(raw);
    if (text && text !== lastSent) {
      send({ text });
      lastSent = text;
    }
    lastTime = now;
  };

  const started = Date.now();
  for (let attempt = 1; attempt <= MAX_ATTEMPTS && !gone.signal.aborted; attempt++) {
    try {
      const raw = await attemptReply(system, messages, gone.signal, (r) => push(r, false));
      send({ done: true, text: cleanReply(raw) });
      return res.end();
    } catch (err) {
      if (gone.signal.aborted) return;
      if (err instanceof SetupError) {
        console.error(err.message);
        send(crisis ? { done: true, text: CRISIS_FALLBACK } : { fatal: true, error: "The assistant isn't set up correctly. (Owner: check the terminal.)" });
        return res.end();
      }
      console.warn(`Attempt ${attempt} failed: ${err.message}`);
      if (lastSent) {
        send({ reset: true }); // wipe the half answer on her screen; a fresh one is coming
        lastSent = "";
      }
      if (Date.now() - started > TOTAL_BUDGET_MS) break;
      await sleep(Math.min(1000 * 2 ** (attempt - 1), 8000));
    }
  }
  if (gone.signal.aborted) return;
  // Server gave up for now. In a crisis, never leave her with nothing.
  send(crisis ? { done: true, text: CRISIS_FALLBACK } : { retry: true });
  res.end();
}

// ---- translation: lets articles, guides and myth cards appear in her language ----
async function handleTranslate(req, res) {
  if (tooMany(clientIp(req))) return sendJson(res, 429, { error: "Busy" });
  let body;
  try { body = JSON.parse(await readBody(req)); } catch { return sendJson(res, 400, { error: "Bad request" }); }
  const lang = LANG_NAMES[body && body.lang];
  const items = Array.isArray(body && body.items) ? body.items.filter((x) => typeof x === "string").slice(0, 12) : null;
  if (!lang || !items || !items.length || body.lang === "en") return sendJson(res, 400, { error: "Bad request" });
  if (items.join("").length > 6000) return sendJson(res, 413, { error: "Too much text" });
  if (!API_KEY) return sendJson(res, 500, { error: "Not set up" });

  // Translate each piece on its own, four at a time. Small models are far more reliable with one short
  // piece and a plain "reply with only the translation" than with a batch in a special format.
  // Urdu must be in Urdu script (not Hindi), Arabic in Arabic script; others must not stay in English.
  const rightScript = (code, out, src) => {
    const arabicLetters = (out.match(/[\u0600-\u06FF]/g) || []).length;
    const latin = (out.match(/[A-Za-z]/g) || []).length;
    if (/[\u0900-\u097F]/.test(out)) return false;                 // Hindi (Devanagari) letters: wrong
    if (code === "ur" || code === "ar") return arabicLetters > latin; // mostly Arabic-script letters
    return out.toLowerCase() !== src.toLowerCase() || src.length < 15;
  };
  const scriptNote = { ur: " Write in Urdu script (Arabic letters, like: آپ کیسی ہیں), never Hindi or Devanagari, never Roman Urdu.", ar: " Write in Arabic script." }[body.lang] || "";
  const system =
    `Translate the user's text into ${lang} for a mother.${scriptNote} Keep the meaning exactly, including every number, unit and warning. ` +
    `Use simple, warm, everyday ${lang}. Keep names like NHS, CDC, WHO, AAP, YouTube unchanged, and keep anything in curly braces like {n} exactly as it is. ` +
    `Reply with only the translation, nothing else: no quotes, no notes, no explanations.`;
  const out = new Array(items.length).fill(null);
  async function translateOne(text) {
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const reqBody = {
          model: MODEL, max_tokens: Math.min(1500, 200 + text.length * 3), temperature: 0.2,
          messages: [{ role: "system", content: system }, { role: "user", content: text }],
        };
        if (thinkingFlagOk) reqBody.chat_template_kwargs = { enable_thinking: false };
        const apiRes = await fetch(`${BASE_URL}/chat/completions`, {
          method: "POST",
          headers: { "content-type": "application/json", authorization: `Bearer ${API_KEY}` },
          body: JSON.stringify(reqBody),
          signal: AbortSignal.timeout(45_000),
        });
        const data = await apiRes.json().catch(() => ({}));
        if (!apiRes.ok) throw new Error(`Model API ${apiRes.status}`);
        let t = String(data.choices?.[0]?.message?.content || "");
        const close = t.toLowerCase().lastIndexOf("</think>");
        if (close !== -1) t = t.slice(close + 8);
        t = t.trim().replace(/^["'“«]+|["'”»]+$/g, "").trim();
        // a translation that kept the original text, or came back empty, isn't one
        if (!t || (t === text && text.length > 12)) throw new Error("empty");
        if (!rightScript(body.lang, t, text)) throw new Error("wrong script");
        return t;
      } catch (err) {
        if (attempt === 3) { console.warn(`Translate failed after 3 tries: ${err.message}`); return null; }
        await sleep(500 * attempt);
      }
    }
    return null;
  }
  const queue = items.map((text, i) => ({ text, i }));
  await Promise.all([0, 1, 2, 3].map(async () => {
    while (queue.length) { const { text, i } = queue.shift(); out[i] = await translateOne(text); }
  }));
  if (out.every((x) => x === null)) return sendJson(res, 502, { error: "Translation failed" });
  return sendJson(res, 200, { items: out });
}

// ---- A loved one's voice (AI): Chatterbox Multilingual, an open model by Resemble AI ----
// It copies a voice from a short sample and reads new text in it. We call the free public
// version on Hugging Face. A free Hugging Face token (HF_TOKEN) gives it a proper daily quota.
const HF_TOKEN = process.env.HF_TOKEN || "";
const CLONE_ROOT = process.env.CLONE_SPACE_URL || "https://resembleai-chatterbox-multilingual-tts.hf.space";
// Languages the voice model speaks natively. Urdu is NOT included: the model has no Urdu, and reading
// Urdu through Hindi sounds like Hindi, which isn't acceptable. Urdu is read only by real Urdu voices.
const CLONE_LANGS = { en: "en", es: "es", tr: "tr", ar: "ar" };
const uploadCache = new Map(); // sample fingerprint -> { path, at }
const hindiCache = new Map();   // urdu text -> hindi script

async function urduToHindiScript(text) {
  if (hindiCache.has(text)) return hindiCache.get(text);
  const body = {
    model: MODEL, max_tokens: 800, temperature: 0,
    messages: [
      { role: "system", content: "Rewrite the user's Urdu text in Hindi Devanagari script, word for word, so it sounds exactly the same when read aloud. Do not translate or change words. Reply with only the rewritten text." },
      { role: "user", content: text },
    ],
  };
  if (thinkingFlagOk) body.chat_template_kwargs = { enable_thinking: false };
  const r = await fetch(`${BASE_URL}/chat/completions`, {
    method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${API_KEY}` },
    body: JSON.stringify(body), signal: AbortSignal.timeout(20_000),
  });
  const data = await r.json().catch(() => ({}));
  const out = cleanReply(data.choices?.[0]?.message?.content || "");
  if (!r.ok || !out) throw new Error("transliteration failed");
  if (hindiCache.size > 500) hindiCache.clear();
  hindiCache.set(text, out);
  return out;
}

async function cloneSpeak(text, lang, sample) {
  const H = HF_TOKEN ? { authorization: `Bearer ${HF_TOKEN}` } : {};
  const crypto = require("crypto");
  const key = sample ? crypto.createHash("sha1").update(sample).digest("hex") : "default";
  let cached = sample ? uploadCache.get(key) : { path: null, at: Date.now() }; // no sample: the model's own voice
  if (sample && (!cached || Date.now() - cached.at > 20 * 60_000)) { // the space keeps uploads for a while; refresh every 20 min
    const fd = new FormData();
    fd.append("files", new Blob([sample], { type: "audio/wav" }), "voice.wav");
    const up = await fetch(`${CLONE_ROOT}/gradio_api/upload`, { method: "POST", body: fd, headers: H, signal: AbortSignal.timeout(20_000) });
    if (!up.ok) throw new Error("upload " + up.status);
    const [path] = await up.json();
    cached = { path, at: Date.now() };
    if (uploadCache.size > 200) uploadCache.clear();
    uploadCache.set(key, cached);
  }
  const session_hash = Math.random().toString(36).slice(2, 12);
  const join = await fetch(`${CLONE_ROOT}/gradio_api/queue/join`, {
    method: "POST", headers: { ...H, "content-type": "application/json" }, signal: AbortSignal.timeout(20_000),
    body: JSON.stringify({ data: [text, lang, cached.path ? { path: cached.path, orig_name: "voice.wav", meta: { _type: "gradio.FileData" } } : null, 0.5, 0.8, 0, 0.5], fn_index: 1, session_hash }),
  });
  if (!join.ok) throw new Error("join " + join.status);
  const res = await fetch(`${CLONE_ROOT}/gradio_api/queue/data?session_hash=${session_hash}`, { headers: H, signal: AbortSignal.timeout(60_000) });
  const reader = res.body.getReader(), dec = new TextDecoder();
  let buf = "", out = null, err = null;
  while (!out && !err) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    const lines = buf.split("\n");
    buf = lines.pop();
    for (const line of lines) {
      if (!line.startsWith("data:")) continue;
      let msg; try { msg = JSON.parse(line.slice(5)); } catch { continue; }
      if (msg.msg === "process_completed") { if (msg.success) out = msg.output.data[0]; else err = (msg.output && msg.output.error) || "failed"; }
    }
  }
  reader.cancel().catch(() => {});
  if (err) { const e = new Error(String(err)); e.quota = /quota|exceeded|runs limit|rate limit/i.test(String(err)); throw e; }
  if (!out) throw new Error("no audio");
  const audio = await fetch(out.url || `${CLONE_ROOT}/gradio_api/file=${out.path}`, { headers: H, signal: AbortSignal.timeout(30_000) });
  if (!audio.ok) throw new Error("audio " + audio.status);
  return Buffer.from(await audio.arrayBuffer());
}

// Saved voice answers: the same text in the same voice is never generated twice, so replaying an
// answer, article or guide costs nothing. Kept in a "voice-cache" folder, oldest removed past ~300 MB.
const VOICE_CACHE_DIR = path.join(__dirname, "voice-cache");
try { fs.mkdirSync(VOICE_CACHE_DIR, { recursive: true }); } catch {}
function cacheKey(text, lang, sample) {
  return require("crypto").createHash("sha1").update(lang + "\u0001" + text + "\u0001").update(sample).digest("hex");
}
function cacheGet(key) { try { return fs.readFileSync(path.join(VOICE_CACHE_DIR, key + ".wav")); } catch { return null; } }
function cachePut(key, wav) {
  try {
    fs.writeFileSync(path.join(VOICE_CACHE_DIR, key + ".wav"), wav);
    const files = fs.readdirSync(VOICE_CACHE_DIR).map((f) => ({ f, st: fs.statSync(path.join(VOICE_CACHE_DIR, f)) }));
    let total = files.reduce((n, x) => n + x.st.size, 0);
    files.sort((a, b) => a.st.mtimeMs - b.st.mtimeMs);
    while (total > 300 * 1024 * 1024 && files.length) { const x = files.shift(); fs.unlinkSync(path.join(VOICE_CACHE_DIR, x.f)); total -= x.st.size; }
  } catch {}
}
// When the daily allowance runs out, pause asking for a while instead of failing every sentence.
let quotaPausedUntil = 0;

async function handleCloneVoice(req, res) {
  if (tooMany(clientIp(req))) return sendJson(res, 429, { error: "busy" });
  let body;
  try { body = JSON.parse(await readBody(req)); } catch { return sendJson(res, 400, { error: "bad request" }); }
  const lang = CLONE_LANGS[body && body.lang];
  let text = typeof body?.text === "string" ? body.text.trim().slice(0, 300) : "";
  const sample = typeof body?.sample === "string" ? Buffer.from(body.sample, "base64") : null;
  if (!lang || !text || !sample || sample.length < 1000 || sample.length > 1_500_000) return sendJson(res, 400, { error: "bad request" });
  const key = cacheKey(text, body.lang, sample);
  const saved = cacheGet(key);
  if (saved) { // already made before: free
    res.writeHead(200, { "Content-Type": "audio/wav", "Cache-Control": "no-store", "X-Voice-Cache": "hit" });
    return res.end(saved);
  }
  if (Date.now() < quotaPausedUntil) return sendJson(res, 503, { error: "quota" });
  try {
    const wav = await cloneSpeak(text, lang, sample);
    cachePut(key, wav);
    res.writeHead(200, { "Content-Type": "audio/wav", "Cache-Control": "no-store" });
    return res.end(wav);
  } catch (err) {
    if (err.quota) {
      quotaPausedUntil = Date.now() + 15 * 60_000; // try again in 15 minutes
      console.warn("Loved one's voice: today's Hugging Face allowance is used up. Using the usual voice for 15 minutes.");
    } else console.warn("Loved one's voice failed:", err.message);
    return sendJson(res, err.quota ? 503 : 502, { error: err.quota ? "quota" : "failed" });
  }
}

// ---- Natural cloud voices (Azure AI Speech): the same human-sounding voice on every phone ----
// Free tier: 500,000 characters a month. Set AZURE_SPEECH_KEY and AZURE_SPEECH_REGION to turn it on.
const AZURE_KEY = process.env.AZURE_SPEECH_KEY || "";
const AZURE_REGION = process.env.AZURE_SPEECH_REGION || "";
const AZURE_URL = process.env.AZURE_TTS_URL || (AZURE_REGION ? `https://${AZURE_REGION}.tts.speech.microsoft.com/cognitiveservices/v1` : "");
const CLOUD_VOICES = {
  en: { tag: "en-US", voices: ["en-US-AvaNeural", "en-US-JennyNeural", "en-US-AndrewNeural"] },
  ur: { tag: "ur-PK", voices: ["ur-PK-UzmaNeural", "ur-PK-AsadNeural"] },
  ar: { tag: "ar-SA", voices: ["ar-SA-ZariyahNeural", "ar-SA-HamedNeural"] },
  tr: { tag: "tr-TR", voices: ["tr-TR-EmelNeural", "tr-TR-AhmetNeural"] },
  es: { tag: "es-ES", voices: ["es-ES-ElviraNeural", "es-MX-DaliaNeural", "es-ES-AlvaroNeural"] },
};
const xmlEscape = (t) => t.replace(/[<>&'"]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" }[c]));
const pct = (x, lo, hi) => { const n = Math.max(lo, Math.min(hi, Number(x) || 1)); return `${n >= 1 ? "+" : ""}${Math.round((n - 1) * 100)}%`; };

async function handleTts(req, res) {
  if (!AZURE_KEY || !AZURE_URL) return sendJson(res, 503, { error: "off" });
  if (tooMany(clientIp(req))) return sendJson(res, 429, { error: "busy" });
  let body;
  try { body = JSON.parse(await readBody(req)); } catch { return sendJson(res, 400, { error: "bad request" }); }
  const lang = CLOUD_VOICES[body && body.lang] ? body.lang : "en";
  const conf = CLOUD_VOICES[lang];
  const voice = conf.voices.includes(body.voice) ? body.voice : conf.voices[0];
  const text = typeof body.text === "string" ? body.text.trim().slice(0, 600) : "";
  if (!text) return sendJson(res, 400, { error: "bad request" });
  const rate = pct(body.rate, 0.7, 1.3), pitch = pct(body.pitch, 0.85, 1.15);

  const key = require("crypto").createHash("sha1").update(["azure", voice, rate, pitch, text].join("\u0001")).digest("hex");
  const saved = (() => { try { return fs.readFileSync(path.join(VOICE_CACHE_DIR, key + ".mp3")); } catch { return null; } })();
  if (saved) { res.writeHead(200, { "Content-Type": "audio/mpeg", "Cache-Control": "no-store", "X-Voice-Cache": "hit" }); return res.end(saved); }

  const ssml = `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="${conf.tag}"><voice name="${voice}"><prosody rate="${rate}" pitch="${pitch}">${xmlEscape(text)}</prosody></voice></speak>`;
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const r = await fetch(AZURE_URL, {
        method: "POST",
        headers: {
          "Ocp-Apim-Subscription-Key": AZURE_KEY,
          "Content-Type": "application/ssml+xml",
          "X-Microsoft-OutputFormat": "audio-24khz-48kbitrate-mono-mp3",
          "User-Agent": "motherhood",
        },
        body: ssml,
        signal: AbortSignal.timeout(15_000),
      });
      if (!r.ok) throw new Error("Azure " + r.status + " " + (await r.text().catch(() => "")).slice(0, 200));
      const mp3 = Buffer.from(await r.arrayBuffer());
      try { fs.writeFileSync(path.join(VOICE_CACHE_DIR, key + ".mp3"), mp3); } catch {}
      res.writeHead(200, { "Content-Type": "audio/mpeg", "Cache-Control": "no-store" });
      return res.end(mp3);
    } catch (err) {
      console.warn(`Cloud voice attempt ${attempt} failed: ${err.message}`);
      if (attempt === 1) await sleep(300);
    }
  }
  return sendJson(res, 502, { error: "failed" });
}

// ---- Baby tracker: Nemotron's tool calling turns "she fed 20 minutes on the left" into log records ----
const LOG_TOOL = {
  type: "function",
  function: {
    name: "log_baby_events",
    description: "Record baby care events the mother just described: feeds, diapers, sleep, pumping. Use an empty list if she did not describe any event (for example if she asked a question).",
    parameters: {
      type: "object",
      properties: {
        events: {
          type: "array",
          items: {
            type: "object",
            properties: {
              type: { type: "string", enum: ["breastfeed", "bottle", "pump", "wet", "dirty", "sleep", "wake"] },
              side: { type: "string", enum: ["left", "right", "both", "unknown"] },
              minutes: { type: "number", description: "length of a feed, pump or sleep, in minutes" },
              ml: { type: "number", description: "amount in millilitres; convert ounces (1 oz = 30 ml)" },
              count: { type: "number", description: "how many, for repeated diapers or feeds; default 1" },
              minutesAgo: { type: "number", description: "how long ago it happened, in minutes; 0 if just now" },
            },
            required: ["type"],
          },
        },
      },
      required: ["events"],
    },
  },
};
async function handleLog(req, res) {
  if (tooMany(clientIp(req))) return sendJson(res, 429, { error: "busy" });
  let body;
  try { body = JSON.parse(await readBody(req)); } catch { return sendJson(res, 400, { error: "bad request" }); }
  const text = typeof body?.text === "string" ? body.text.trim().slice(0, 500) : "";
  if (!text || !API_KEY) return sendJson(res, 400, { error: "bad request" });
  const reqBody = {
    model: MODEL, max_tokens: 500, temperature: 0,
    messages: [
      { role: "system", content: "You help a mother keep a baby log. When she describes feeds, diapers, sleep or pumping, call log_baby_events with each event. If she is asking a question or describing nothing to log, call it with an empty list. She may write in English, Urdu, Arabic, Spanish or Turkish." },
      { role: "user", content: text },
    ],
    tools: [LOG_TOOL],
    tool_choice: { type: "function", function: { name: "log_baby_events" } },
  };
  if (thinkingFlagOk) reqBody.chat_template_kwargs = { enable_thinking: false };
  try {
    const r = await fetch(`${BASE_URL}/chat/completions`, {
      method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${API_KEY}` },
      body: JSON.stringify(reqBody), signal: AbortSignal.timeout(30_000),
    });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error("Model API " + r.status + " " + JSON.stringify(data).slice(0, 200));
    const msg = data.choices?.[0]?.message || {};
    let args = msg.tool_calls?.[0]?.function?.arguments;
    if (!args) { // some servers put the JSON in the text instead
      const t = String(msg.content || ""); const a = t.indexOf("{"), b = t.lastIndexOf("}");
      args = a !== -1 ? t.slice(a, b + 1) : "{}";
    }
    const parsed = typeof args === "string" ? JSON.parse(args) : args;
    const allowed = new Set(["breastfeed", "bottle", "pump", "wet", "dirty", "sleep", "wake"]);
    const num = (v, max) => (Number.isFinite(+v) && +v >= 0 && +v <= max ? +v : undefined);
    const events = (Array.isArray(parsed.events) ? parsed.events : [])
      .filter((e) => e && allowed.has(e.type))
      .slice(0, 10)
      .map((e) => ({ type: e.type, side: ["left", "right", "both"].includes(e.side) ? e.side : undefined,
        minutes: num(e.minutes, 600), ml: num(e.ml, 500), count: Math.min(5, num(e.count, 5) || 1), minutesAgo: num(e.minutesAgo, 1440) || 0 }));
    return sendJson(res, 200, { events });
  } catch (err) {
    console.warn("Baby log failed:", err.message);
    return sendJson(res, 502, { error: "failed" });
  }
}

// ---- Backup voice: when her phone or computer has no voice for a language (Urdu, Arabic, Turkish...),
// read it with Chatterbox's own default voice instead. Uses the Hugging Face allowance; saved like other audio.
async function handleBackupVoice(req, res) {
  if (tooMany(clientIp(req))) return sendJson(res, 429, { error: "busy" });
  let body;
  try { body = JSON.parse(await readBody(req)); } catch { return sendJson(res, 400, { error: "bad request" }); }
  const lang = CLONE_LANGS[body && body.lang];
  let text = typeof body?.text === "string" ? body.text.trim().slice(0, 300) : "";
  if (!lang || !text) return sendJson(res, 400, { error: "bad request" });
  const key = require("crypto").createHash("sha1").update("backup\u0001" + body.lang + "\u0001" + text).digest("hex");
  const saved = cacheGet(key);
  if (saved) { res.writeHead(200, { "Content-Type": "audio/wav", "Cache-Control": "no-store", "X-Voice-Cache": "hit" }); return res.end(saved); }
  if (Date.now() < quotaPausedUntil) return sendJson(res, 503, { error: "quota" });
  try {
    const wav = await cloneSpeak(text, lang, null);
    cachePut(key, wav);
    res.writeHead(200, { "Content-Type": "audio/wav", "Cache-Control": "no-store" });
    return res.end(wav);
  } catch (err) {
    if (err.quota) { quotaPausedUntil = Date.now() + 15 * 60_000; console.warn("Backup voice: today's Hugging Face allowance is used up."); }
    else console.warn("Backup voice failed:", err.message);
    return sendJson(res, err.quota ? 503 : 502, { error: err.quota ? "quota" : "failed" });
  }
}

function serveStatic(req, res, pathname) {
  let urlPath;
  try {
    urlPath = decodeURIComponent(pathname);
  } catch {
    res.writeHead(400);
    return res.end("Bad request"); // a malformed URL used to crash the whole server
  }
  const rel = urlPath === "/" ? "index.html" : urlPath.replace(/^\/+/, "");
  const file = path.normalize(path.join(PUBLIC_DIR, rel));
  if (!file.startsWith(PUBLIC_DIR + path.sep)) {
    res.writeHead(403);
    return res.end("Forbidden");
  }
  fs.readFile(file, (err, data) => {
    if (err) {
      res.writeHead(404);
      return res.end("Not found");
    }
    const headers = { "Content-Type": TYPES[path.extname(file)] || "application/octet-stream" };
    const name = path.basename(file);
    if (name === "sw.js" || name === "index.html") headers["Cache-Control"] = "no-cache";
    res.writeHead(200, headers);
    res.end(req.method === "HEAD" ? undefined : data);
  });
}

const server = http.createServer((req, res) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "no-referrer");
  res.setHeader("X-Frame-Options", "DENY");
  let pathname;
  try {
    pathname = new URL(req.url, "http://x").pathname;
  } catch {
    res.writeHead(400);
    return res.end();
  }
  if (pathname === "/api/log" && req.method === "POST") {
    return handleLog(req, res).catch((err) => { console.error("Log error:", err); sendJson(res, 500, { error: "failed" }); });
  }
  if (pathname === "/api/config") {
    return sendJson(res, 200, { backupVoice: !!HF_TOKEN, cloudVoice: !!(AZURE_KEY && AZURE_URL), voices: Object.fromEntries(Object.entries(CLOUD_VOICES).map(([k, v]) => [k, v.voices])) });
  }
  if (pathname === "/api/backup-voice" && req.method === "POST") {
    return handleBackupVoice(req, res).catch((err) => { console.error("Backup voice error:", err); sendJson(res, 500, { error: "failed" }); });
  }
  if (pathname === "/api/tts" && req.method === "POST") {
    return handleTts(req, res).catch((err) => { console.error("TTS error:", err); sendJson(res, 500, { error: "failed" }); });
  }
  if (pathname === "/api/clone-voice" && req.method === "POST") {
    return handleCloneVoice(req, res).catch((err) => {
      console.error("Clone voice error:", err);
      sendJson(res, 500, { error: "failed" });
    });
  }
  if (pathname === "/api/translate" && req.method === "POST") {
    return handleTranslate(req, res).catch((err) => {
      console.error("Translate error:", err);
      sendJson(res, 500, { error: "Translate error" });
    });
  }
  if (pathname === "/api/chat") {
    if (req.method !== "POST") {
      res.writeHead(405, { Allow: "POST" });
      return res.end();
    }
    return handleChat(req, res).catch((err) => {
      console.error("Unexpected error:", err);
      sendJson(res, 500, { retry: true, error: "Unexpected error" }); // the phone retries quietly
    });
  }
  if (req.method === "GET" || req.method === "HEAD") return serveStatic(req, res, pathname);
  res.writeHead(405);
  res.end();
});

server.listen(PORT, () => {
  console.log(`\n  App running at http://localhost:${PORT}`);
  console.log(`  Model: ${MODEL}  (thinking ${THINKING ? "on" : "off"})`);
  console.log(`  Natural cloud voice: ${AZURE_KEY && AZURE_URL ? "on (Azure, " + (AZURE_REGION || "custom") + ")" : "off (set AZURE_SPEECH_KEY and AZURE_SPEECH_REGION)"}`);
  console.log(`  Loved one's voice: ${HF_TOKEN ? "on (Hugging Face token set)" : "limited (set HF_TOKEN for a proper free quota)"}\n`);
});
