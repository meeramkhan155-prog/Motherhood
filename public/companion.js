// Motherhood companion features: a 30-second welcome setup, a "Today" card, a voice baby log
// (Nemotron tool calling), a weekly mood check-in (EPDS), and a short tour.
// Everything is stored on this phone only. Interface words are written in English and translated
// automatically into the other languages (and saved), like the library.
(function () {
  "use strict";

  // ---------- words ----------
  const EN = {
    setupTitle: "Welcome to Motherhood", setupIntro: "Tell me a little about you, so I can help in the right way. It takes 30 seconds, and it stays only on this phone.",
    yourName: "Your name", namePh: "For example, Fatima", next: "Next", back: "Back", skip: "Skip for now", done: "Done", save: "Save",
    whereTitle: "Where are you in your journey?", pregnant: "I'm pregnant", babyHere: "My baby is here", dueDate: "Due date",
    babyName: "Baby's name", babyNamePh: "For example, Ali", birthDate: "Baby's birth date", feeding: "How is your baby fed?",
    fBreast: "Breastfeeding", fFormula: "Formula", fBoth: "Both", myDetails: "My details", meSaved: "Saved.",
    todayAgeBaby: "{name} is {age} old", todayAgePreg: "You're about {n} weeks pregnant", thisWeek: "Right now", tipToday: "A small tip",
    days: "{n} days", oneWeek: "1 week", weeksDays: "{w} weeks and {d} days", weeks: "{n} weeks", months: "{n} months",
    openLog: "Baby log", checkIn: "Weekly check-in", checkInDue: "How have you been feeling? Take the weekly check-in.",
    logTitle: "Baby log", last24: "Last 24 hours", feeds: "Feeds", wet: "Wet diapers", dirty: "Dirty diapers", sleep: "Sleep",
    lastFeed: "Last feed: {t} ago", noFeedYet: "No feeds logged yet", hrs: "{h} h {m} min", mins: "{m} min",
    quick: "Quick log", qLeft: "Breastfeed left", qRight: "Breastfeed right", qBottle: "Bottle", qWet: "Wet diaper", qDirty: "Dirty diaper",
    qSleep: "Fell asleep", qWake: "Woke up", tellMe: "Or just tell me", tellPh: "For example: she fed 20 minutes on the left",
    logIt: "Log it", logging: "Logging...", logged: "Logged: {x}", nothingToLog: "I couldn't find anything to log there. Try something like: two wet diapers this morning.",
    recent: "Recent", deleteEntry: "Delete", logPrivacy: "Your log stays only on this phone.",
    eBreastfeed: "breastfeed", eBottle: "bottle", ePump: "pumping", eWet: "wet diaper", eDirty: "dirty diaper", eSleep: "fell asleep", eWake: "woke up",
    left: "left", right: "right", bothSides: "both sides", ago: "{t} ago", justNow: "just now",
    wLowWet: "{n} wet diapers logged in the last 24 hours. At {age}, expect about {m} or more. If this is right, call your midwife or doctor today.",
    wFewFeeds: "{n} feeds logged in 24 hours. Newborns usually feed 8 to 12 times a day. Offer feeds more often, and call your midwife if baby is very sleepy.",
    wLongGap: "No feed logged for {t}. Young babies usually feed every 2 to 3 hours. Offer a feed, and get help if baby is hard to wake.",
    moodTitle: "Weekly check-in", moodIntro: "Ten short questions about the past 7 days. There are no right or wrong answers. This is a gentle check, not a diagnosis.",
    moodSource: "Based on the Edinburgh Postnatal Depression Scale (Cox, Holden and Sagovsky, 1987).", start: "Start",
    q: "Question {n} of {m}", inPast7: "In the past 7 days:",
    rOk: "You seem to be coping, and that's wonderful. Keep resting, eating, and leaning on your people. Check in again next week.",
    rMaybe: "Some of your answers suggest you're carrying a lot right now. Please tell your midwife, doctor or health worker how you've been feeling, and check in again in two weeks. You're not alone.",
    rHigh: "Your answers suggest you may be going through postpartum depression. It's very common, it's not your fault, and it gets better with help. Please talk to your doctor or midwife this week, and tell someone close to you how you feel.",
    rSafety: "You said the thought of harming yourself has come to you. Please don't carry this alone. Call for help now and tell someone close to you.",
    moodPrivacy: "Your answers stay only on this phone.", lastCheck: "Last check-in: {d}",
    tourTitle: "What Motherhood can do", tour1: "Talk to me: tap the big button and speak. I listen patiently and answer out loud.",
    tour2: "Library and guides: gentle articles, a pregnancy week by week, and picture guides for latching, burping, swaddling and safe sleep.",
    tour3: "Baby log: just say \"she fed 20 minutes\" or \"two wet diapers\". I keep track, and tell you if something looks low.",
    tour4: "Emergency: the red button shows danger signs and calls help in one tap, even without internet.",
    tour5: "Your village: hear your loved ones' voices, check family traditions, and use Motherhood in English, Urdu, Arabic, Spanish or Turkish.",
    tourMenu: "What Motherhood can do", logMenu: "Baby log", moodMenu: "Weekly check-in",
    translatingUi: "Translating...", yourBabyName: "Your baby",
  };
  // Baby's first year, by age: what's normal now, and one small tip.
  const STAGES = [
    { upTo: 3, now: "Lots of sleep, small feeds of the thick yellow first milk, and black, sticky poop. Weight loss in the first days is normal.", tip: "Feed whenever baby shows hunger signs, 8 to 12 times a day. Skin to skin helps both of you." },
    { upTo: 7, now: "Your milk is coming in. Poop changes from black to green to yellow. Baby wants to feed often.", tip: "Count wet diapers: about 6 or more heavy ones a day from day 5 means baby is getting enough." },
    { upTo: 14, now: "Most babies are back to their birth weight by about two weeks. The cord stump usually falls off soon.", tip: "Keep the cord clean and dry, and fold the diaper below it." },
    { upTo: 28, now: "Cluster feeding in the evenings is common, especially around 2 to 3 weeks. Baby is more alert and looks at faces.", tip: "Short tummy time while baby is awake and watched, a few minutes at a time." },
    { upTo: 42, now: "Crying often peaks around 6 weeks. It's normal, and it passes. Baby may start to smile.", tip: "If you're at your limit, put baby down safely in the cot and take a few minutes to breathe." },
    { upTo: 60, now: "Real smiles and cooing. Baby holds their head up a little during tummy time.", tip: "Talk and sing to your baby. Your voice is their favorite sound." },
    { upTo: 91, now: "Baby follows you with their eyes, laughs, and may start to sleep a little longer at night.", tip: "Ask about baby's vaccinations at around this age if you haven't yet." },
    { upTo: 182, now: "Rolling, grabbing toys, and lots of babbling. Many babies are ready for solid foods at about 6 months.", tip: "Look for signs of readiness for solids: sitting with support, good head control, and interest in food." },
    { upTo: 273, now: "Sitting up, maybe crawling, and trying lots of new foods. Babies may become shy with strangers.", tip: "Offer soft finger foods and let baby explore. Mess is part of learning." },
    { upTo: 400, now: "Pulling up to stand, first words, and maybe first steps around the first birthday.", tip: "Baby-proof the home: cover sockets, and keep small objects and cords out of reach." },
  ];
  // Edinburgh Postnatal Depression Scale, 10 items. Scores for each answer in order.
  const EPDS = [
    ["I have been able to laugh and see the funny side of things", [["As much as I always could", 0], ["Not quite so much now", 1], ["Definitely not so much now", 2], ["Not at all", 3]]],
    ["I have looked forward with enjoyment to things", [["As much as I ever did", 0], ["Rather less than I used to", 1], ["Definitely less than I used to", 2], ["Hardly at all", 3]]],
    ["I have blamed myself unnecessarily when things went wrong", [["Yes, most of the time", 3], ["Yes, some of the time", 2], ["Not very often", 1], ["No, never", 0]]],
    ["I have been anxious or worried for no good reason", [["No, not at all", 0], ["Hardly ever", 1], ["Yes, sometimes", 2], ["Yes, very often", 3]]],
    ["I have felt scared or panicky for no very good reason", [["Yes, quite a lot", 3], ["Yes, sometimes", 2], ["No, not much", 1], ["No, not at all", 0]]],
    ["Things have been getting on top of me", [["Yes, most of the time I haven't been able to cope at all", 3], ["Yes, sometimes I haven't been coping as well as usual", 2], ["No, most of the time I have coped quite well", 1], ["No, I have been coping as well as ever", 0]]],
    ["I have been so unhappy that I have had difficulty sleeping", [["Yes, most of the time", 3], ["Yes, sometimes", 2], ["Not very often", 1], ["No, not at all", 0]]],
    ["I have felt sad or miserable", [["Yes, most of the time", 3], ["Yes, quite often", 2], ["Not very often", 1], ["No, not at all", 0]]],
    ["I have been so unhappy that I have been crying", [["Yes, most of the time", 3], ["Yes, quite often", 2], ["Only occasionally", 1], ["No, never", 0]]],
    ["The thought of harming myself has occurred to me", [["Yes, quite often", 3], ["Sometimes", 2], ["Hardly ever", 1], ["Never", 0]]],
  ];
  const ALL_TEXT = [...Object.values(EN), ...STAGES.flatMap((s) => [s.now, s.tip]), ...EPDS.flatMap(([q, a]) => [q, ...a.map((x) => x[0])])];

  // English, or the saved translation in her language. Fill {placeholders} after translating.
  function w(key, vars = {}) {
    let s = tx(EN[key] || key);
    for (const [k, v] of Object.entries(vars)) s = s.split(`{${k}}`).join(v);
    return s;
  }
  const wt = (text) => tx(text);
  let translated = LANG === "en";
  function translateUi() {
    if (LANG === "en") { translated = true; return; }
    translated = false;
    const lang = LANG;
    ensureTr(ALL_TEXT).then(() => { if (LANG === lang) { translated = true; rerenderAll(); } });
  }

  // ---------- storage ----------
  const load = (k, d) => { try { return JSON.parse(localStorage.getItem(k) || "null") ?? d; } catch { return d; } };
  const store = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };
  let profile = load("mh-profile", null);
  let events = load("mh-log", []);
  let moods = load("mh-mood", []);
  const saveProfile = () => store("mh-profile", profile);
  const saveEvents = () => { events = events.slice(-500); store("mh-log", events); };

  const DAY = 86400000;
  const today0 = () => { const d = new Date(); d.setHours(12, 0, 0, 0); return d; };
  const parseDate = (s) => { const d = new Date(s + "T12:00:00"); return isNaN(d) ? null : d; };
  function babyAgeDays() {
    if (!profile || profile.stage !== "baby" || !profile.birthDate) return null;
    const b = parseDate(profile.birthDate);
    return b ? Math.max(0, Math.round((today0() - b) / DAY)) : null;
  }
  function pregnancyWeek() {
    if (!profile || profile.stage !== "pregnant" || !profile.dueDate) return null;
    const d = parseDate(profile.dueDate);
    if (!d) return null;
    return Math.max(1, Math.min(42, Math.floor((280 - Math.round((d - today0()) / DAY)) / 7)));
  }
  function ageText(days) {
    if (days < 7) return w("days", { n: days });
    if (days < 14) return days === 7 ? w("oneWeek") : w("weeksDays", { w: 1, d: days - 7 });
    if (days < 91) return days % 7 ? w("weeksDays", { w: Math.floor(days / 7), d: days % 7 }) : w("weeks", { n: days / 7 });
    return w("months", { n: Math.floor(days / 30.4) });
  }

  // ---------- small helpers ----------
  const el = (tag, cls, text) => { const n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; };
  const btn = (text, cls, onClick) => { const b = el("button", cls || "pill", text); b.type = "button"; if (onClick) b.addEventListener("click", onClick); return b; };
  function makeSheet(id) {
    const sheet = el("div", "sheet");
    sheet.id = id;
    sheet.hidden = true;
    const panel = el("section", "sheet-panel lib-panel");
    panel.setAttribute("role", "dialog");
    panel.setAttribute("aria-modal", "true");
    const head = el("header", "sheet-head");
    const spacer = el("span", "sheet-btn is-hidden");
    const title = el("h2", "");
    title.id = id + "-title";
    panel.setAttribute("aria-labelledby", title.id);
    const x = btn("", "sheet-btn");
    x.setAttribute("aria-label", "Close");
    x.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>';
    head.append(spacer, title, x);
    const body = el("div", "");
    panel.append(head, body);
    sheet.appendChild(panel);
    document.body.appendChild(sheet);
    let lastFocus = null;
    const api = {
      sheet, body, title, panel,
      open() { lastFocus = document.activeElement; sheet.hidden = false; document.body.classList.add("sheet-open"); x.focus(); },
      close() { sheet.hidden = true; document.body.classList.remove("sheet-open"); if (lastFocus && lastFocus.focus) lastFocus.focus(); },
    };
    x.addEventListener("click", api.close);
    sheet.addEventListener("click", (e) => { if (e.target === sheet) api.close(); });
    document.addEventListener("keydown", (e) => { if (!sheet.hidden && e.key === "Escape") api.close(); });
    return api;
  }
  const field = (labelText, input) => { const l = el("label", "mh-field"); l.append(el("span", "", labelText), input); return l; };
  const choice = (options, value, onPick) => {
    const wrap = el("div", "vs-seg");
    wrap.setAttribute("role", "radiogroup");
    for (const [val, text] of options) {
      const b = btn(text, "");
      b.setAttribute("role", "radio");
      b.setAttribute("aria-checked", String(val === value));
      b.addEventListener("click", () => onPick(val));
      wrap.appendChild(b);
    }
    return wrap;
  };

  // ---------- 1. welcome setup / my details ----------
  const setup = makeSheet("mh-setup");
  let draft = null, step = 0;
  function renderSetup() {
    setup.title.textContent = profile ? w("myDetails") : w("setupTitle");
    const b = setup.body;
    b.textContent = "";
    if (step === 0) {
      b.appendChild(el("p", "lib-intro", w("setupIntro")));
      const name = el("input", "lib-search");
      name.value = draft.name || ""; name.placeholder = w("namePh"); name.maxLength = 40; name.autocomplete = "given-name";
      name.addEventListener("input", () => (draft.name = name.value));
      b.appendChild(field(w("yourName"), name));
      const langs = el("div", "vs-seg mh-langs");
      for (const l of LANGS) {
        const lb = btn(l.name, "");
        lb.lang = l.id;
        lb.setAttribute("aria-checked", String(l.id === LANG));
        lb.setAttribute("role", "radio");
        lb.addEventListener("click", () => { document.querySelector(`.lang-menu button[lang="${l.id}"]`)?.click(); renderSetup(); });
        langs.appendChild(lb);
      }
      b.appendChild(langs);
      const nav = el("div", "lib-actions mh-nav");
      nav.append(btn(w("next"), "pill", () => { step = 1; renderSetup(); }), btn(w("skip"), "pill quiet", finishSkip));
      b.appendChild(nav);
    } else if (step === 1) {
      b.appendChild(el("h3", "vs-h", w("whereTitle")));
      b.appendChild(choice([["pregnant", w("pregnant")], ["baby", w("babyHere")]], draft.stage, (v) => { draft.stage = v; renderSetup(); }));
      if (draft.stage === "pregnant") {
        const d = el("input", "lib-search"); d.type = "date"; d.value = draft.dueDate || "";
        d.addEventListener("change", () => (draft.dueDate = d.value));
        b.appendChild(field(w("dueDate"), d));
      } else if (draft.stage === "baby") {
        const n = el("input", "lib-search"); n.value = draft.babyName || ""; n.placeholder = w("babyNamePh"); n.maxLength = 40;
        n.addEventListener("input", () => (draft.babyName = n.value));
        const d = el("input", "lib-search"); d.type = "date"; d.value = draft.birthDate || ""; d.max = new Date().toISOString().slice(0, 10);
        d.addEventListener("change", () => (draft.birthDate = d.value));
        b.append(field(w("babyName"), n), field(w("birthDate"), d), el("h3", "vs-h", w("feeding")),
          choice([["breast", w("fBreast")], ["formula", w("fFormula")], ["both", w("fBoth")]], draft.feeding, (v) => { draft.feeding = v; renderSetup(); }));
      }
      const nav = el("div", "lib-actions mh-nav");
      nav.append(btn(w("done"), "pill", finishSetup), btn(w("back"), "pill quiet", () => { step = 0; renderSetup(); }));
      b.appendChild(nav);
    }
    if (!translated) b.appendChild(el("p", "tr-note", w("translatingUi")));
  }
  function openSetup() { draft = { ...(profile || {}) }; step = 0; renderSetup(); setup.open(); }
  function finishSetup() {
    profile = { ...draft, name: (draft.name || "").trim().slice(0, 40), babyName: (draft.babyName || "").trim().slice(0, 40), updated: Date.now() };
    saveProfile();
    setup.close();
    renderToday();
    if (!load("mh-toured", false)) { store("mh-toured", true); openTour(); }
  }
  function finishSkip() { store("mh-setup-skipped", true); setup.close(); if (!load("mh-toured", false)) { store("mh-toured", true); openTour(); } }

  // ---------- 2. Today card on the welcome screen ----------
  const card = el("button", "today-card");
  card.type = "button";
  card.hidden = true;
  document.querySelector(".stage")?.appendChild(card);
  function stageFor(days) { return STAGES.find((s) => days <= s.upTo) || STAGES[STAGES.length - 1]; }
  function renderToday() {
    const days = babyAgeDays(), wk = pregnancyWeek();
    card.textContent = "";
    if (days == null && wk == null) { card.hidden = true; return; }
    card.hidden = false;
    let head, now, tip;
    if (days != null) {
      const s = stageFor(days);
      head = w("todayAgeBaby", { name: profile.babyName || w("yourBabyName"), age: ageText(days) });
      now = wt(s.now); tip = wt(s.tip);
    } else {
      const W = (window.MOTHERHOOD_LIBRARY && window.MOTHERHOOD_LIBRARY.weeks) || [];
      const d = W.find((x) => x.w === Math.max(4, Math.min(40, wk)));
      head = w("todayAgePreg", { n: wk });
      now = d ? tx(d.baby) : ""; tip = d ? tx(d.tip) : "";
    }
    card.append(el("b", "", head), el("span", "today-now", now), el("span", "today-tip", "· " + tip));
    const due = !moods.length || Date.now() - moods[moods.length - 1].at > 7 * DAY;
    if (due) card.appendChild(el("span", "today-mood", w("checkInDue")));
    card.onclick = (e) => {
      if (e.target.classList.contains("today-mood")) { e.stopPropagation(); openMood(); return; }
      if (days != null) openLog();
      else { library.open("week-by-week", { week: wk }); }
    };
  }

  // ---------- 3. baby log ----------
  const log = makeSheet("mh-log");
  const LABEL = { breastfeed: "eBreastfeed", bottle: "eBottle", pump: "ePump", wet: "eWet", dirty: "eDirty", sleep: "eSleep", wake: "eWake" };
  function describe(e) {
    let s = w(LABEL[e.type]);
    if (e.side) s += " (" + w(e.side === "both" ? "bothSides" : e.side) + ")";
    if (e.minutes) s += ", " + w("mins", { m: Math.round(e.minutes) });
    if (e.ml) s += ", " + Math.round(e.ml) + " ml";
    if (e.count > 1) s = e.count + " × " + s;
    return s;
  }
  function since(ms) {
    const m = Math.round(ms / 60000);
    if (m < 2) return w("justNow");
    return m < 60 ? w("mins", { m }) : w("hrs", { h: Math.floor(m / 60), m: m % 60 });
  }
  function addEvents(list) {
    const now = Date.now();
    for (const e of list) {
      const n = Math.max(1, Math.min(5, e.count || 1));
      for (let i = 0; i < n; i++) events.push({ ...e, count: 1, at: now - (e.minutesAgo || 0) * 60000 - i * 1000, id: now.toString(36) + Math.random().toString(36).slice(2, 6) });
    }
    events.sort((a, b) => a.at - b.at);
    saveEvents();
  }
  function summary() {
    const now = Date.now(), recent = events.filter((e) => now - e.at < DAY);
    const feedsL = recent.filter((e) => ["breastfeed", "bottle"].includes(e.type));
    const lastFeed = events.filter((e) => ["breastfeed", "bottle"].includes(e.type)).pop();
    let sleepMin = 0;
    let asleep = null;
    for (const e of events.filter((x) => now - x.at < DAY + 12 * 3600000)) {
      if (e.type === "sleep") { if (e.minutes) sleepMin += e.minutes; else asleep = e.at; }
      if (e.type === "wake" && asleep) { sleepMin += (e.at - Math.max(asleep, now - DAY)) / 60000; asleep = null; }
    }
    return {
      count: recent.length, feeds: feedsL.length, wet: recent.filter((e) => e.type === "wet").length,
      dirty: recent.filter((e) => e.type === "dirty").length, sleepMin: Math.max(0, Math.round(sleepMin)),
      lastFeedAgo: lastFeed ? now - lastFeed.at : null,
    };
  }
  function warnings(s) {
    const days = babyAgeDays();
    const out = [];
    if (days == null || s.count < 3) return out; // only judge when she's actually been logging
    const expectWet = days <= 0 ? 1 : days >= 5 ? 6 : days;
    const loggingLongEnough = events.some((e) => Date.now() - e.at > 20 * 3600000);
    if (loggingLongEnough && s.wet < expectWet) out.push(w("wLowWet", { n: s.wet, age: ageText(days), m: expectWet }));
    if (loggingLongEnough && days < 30 && s.feeds < 8) out.push(w("wFewFeeds", { n: s.feeds }));
    if (days < 30 && s.lastFeedAgo != null && s.lastFeedAgo > 4 * 3600000) out.push(w("wLongGap", { t: since(s.lastFeedAgo) }));
    return out;
  }
  function renderLog(message) {
    log.title.textContent = w("logTitle");
    const b = log.body;
    b.textContent = "";
    const s = summary();
    b.appendChild(el("h3", "vs-h", w("last24")));
    const grid = el("div", "log-grid");
    for (const [k, v] of [["feeds", s.feeds], ["wet", s.wet], ["dirty", s.dirty], ["sleep", s.sleepMin ? since(s.sleepMin * 60000) : "0"]]) {
      const c = el("div", "log-stat"); c.append(el("b", "", String(v)), el("span", "", w(k))); grid.appendChild(c);
    }
    b.appendChild(grid);
    b.appendChild(el("p", "log-last", s.lastFeedAgo != null ? w("lastFeed", { t: since(s.lastFeedAgo) }) : w("noFeedYet")));
    for (const warn of warnings(s)) b.appendChild(el("p", "log-warn", warn));
    if (message) { const m = el("p", "log-msg", message); m.setAttribute("role", "status"); b.appendChild(m); }

    b.appendChild(el("h3", "vs-h", w("tellMe")));
    const row = el("div", "log-tell");
    const input = el("input", "lib-search"); input.placeholder = w("tellPh"); input.maxLength = 300;
    const go = btn(w("logIt"), "pill");
    const send = async () => {
      const text = input.value.trim();
      if (!text) return;
      go.disabled = true; go.textContent = w("logging");
      const found = await parseLog(text);
      if (found && found.length) { addEvents(found); renderLog(w("logged", { x: found.map(describe).join(", ") })); }
      else renderLog(w("nothingToLog"));
      renderToday();
    };
    go.addEventListener("click", send);
    input.addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); send(); } });
    row.append(input, go);
    b.appendChild(row);

    b.appendChild(el("h3", "vs-h", w("quick")));
    const quick = el("div", "log-quick");
    for (const [key, ev] of [["qLeft", { type: "breastfeed", side: "left" }], ["qRight", { type: "breastfeed", side: "right" }], ["qBottle", { type: "bottle" }],
      ["qWet", { type: "wet" }], ["qDirty", { type: "dirty" }], ["qSleep", { type: "sleep" }], ["qWake", { type: "wake" }]]) {
      quick.appendChild(btn(w(key), "vv-small", () => { addEvents([ev]); renderLog(w("logged", { x: describe(ev) })); renderToday(); }));
    }
    b.appendChild(quick);

    b.appendChild(el("h3", "vs-h", w("recent")));
    const list = el("div", "log-list");
    for (const e of events.slice(-12).reverse()) {
      const r = el("div", "vv-clip");
      r.append(el("span", "", describe(e) + " · " + w("ago", { t: since(Date.now() - e.at) })),
        btn(w("deleteEntry"), "vv-small danger", () => { events = events.filter((x) => x.id !== e.id); saveEvents(); renderLog(); renderToday(); }));
      list.appendChild(r);
    }
    b.appendChild(list);
    b.appendChild(el("p", "tr-note", w("logPrivacy")));
  }
  async function parseLog(text) {
    try {
      const res = await fetch("/api/log", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text }) });
      if (!res.ok) return null;
      return (await res.json()).events || [];
    } catch { return null; }
  }
  function openLog() { renderLog(); log.open(); }

  // ---------- 4. weekly mood check-in ----------
  const mood = makeSheet("mh-mood");
  let mStep = -1, answers = [];
  function renderMood() {
    mood.title.textContent = w("moodTitle");
    const b = mood.body;
    b.textContent = "";
    if (mStep === -1) {
      b.append(el("p", "lib-intro", w("moodIntro")));
      if (moods.length) b.appendChild(el("p", "tr-note", w("lastCheck", { d: new Date(moods[moods.length - 1].at).toLocaleDateString(LANG) })));
      const nav = el("div", "lib-actions mh-nav");
      nav.appendChild(btn(w("start"), "pill", () => { mStep = 0; answers = []; renderMood(); }));
      b.append(nav, el("p", "tr-note", w("moodSource")), el("p", "tr-note", w("moodPrivacy")));
      return;
    }
    if (mStep < EPDS.length) {
      const [qText, opts] = EPDS[mStep];
      b.append(el("p", "tr-note", w("q", { n: mStep + 1, m: EPDS.length })), el("p", "mood-lead", w("inPast7")), el("h3", "mood-q", wt(qText)));
      const list = el("div", "mood-opts");
      for (const [aText, score] of opts) {
        list.appendChild(btn(wt(aText), "mood-opt", () => {
          answers[mStep] = score;
          if (mStep === 9 && score > 0) { finishMood(true); return; } // safety first
          mStep++; renderMood();
        }));
      }
      b.appendChild(list);
      if (mStep > 0) b.appendChild(btn(w("back"), "pill quiet", () => { mStep--; renderMood(); }));
      return;
    }
    finishMood(false);
  }
  function finishMood(safety) {
    const score = answers.reduce((a, x) => a + (x || 0), 0);
    moods.push({ at: Date.now(), score: safety ? Math.max(score, 13) : score, safety });
    moods = moods.slice(-52);
    store("mh-mood", moods);
    const b = mood.body;
    b.textContent = "";
    const text = safety ? w("rSafety") : score >= 13 ? w("rHigh") : score >= 10 ? w("rMaybe") : w("rOk");
    const p = el("p", safety || score >= 10 ? "em-self" : "lib-intro", text);
    p.setAttribute("role", "status");
    b.appendChild(p);
    if (safety || score >= 13) b.appendChild(btn(t("emBtn"), "pill", () => { mood.close(); emergency.open(); }));
    b.appendChild(el("p", "tr-note", w("moodPrivacy")));
    renderToday();
    if (safety) setTimeout(() => { mood.close(); emergency.open(); }, 2500);
  }
  function openMood() { mStep = -1; renderMood(); mood.open(); }

  // ---------- 5. tour ----------
  const tour = makeSheet("mh-tour");
  let tStep = 0;
  function renderTour() {
    tour.title.textContent = w("tourTitle");
    const b = tour.body;
    b.textContent = "";
    const keys = ["tour1", "tour2", "tour3", "tour4", "tour5"];
    const dots = el("div", "tour-dots");
    keys.forEach((_, i) => { const d = el("span", i === tStep ? "on" : ""); dots.appendChild(d); });
    b.append(el("p", "tour-text", w(keys[tStep])), dots);
    const nav = el("div", "lib-actions mh-nav");
    if (tStep < keys.length - 1) nav.append(btn(w("next"), "pill", () => { tStep++; renderTour(); }), btn(w("skip"), "pill quiet", tour.close));
    else nav.append(btn(w("done"), "pill", tour.close));
    if (tStep > 0) nav.appendChild(btn(w("back"), "pill quiet", () => { tStep--; renderTour(); }));
    b.appendChild(nav);
  }
  function openTour() { tStep = 0; renderTour(); tour.open(); }

  // ---------- menu items, composer button, chat hooks ----------
  window.__menuExtras = (menu) => {
    for (const [key, fn] of [["myDetails", openSetup], ["logMenu", openLog], ["moodMenu", openMood], ["tourMenu", openTour]]) {
      const b = btn(w(key), "");
      b.addEventListener("click", () => { menu.hidden = true; fn(); });
      menu.appendChild(b);
    }
  };
  const logBtn = document.getElementById("log-btn");
  if (logBtn) logBtn.addEventListener("click", openLog);

  // In the chat: if she describes something to log (not a question), log it instead of chatting.
  const LOG_HINT = /\b(fed|feed|feeding|nursed|breastfed|bottle|ml|oz|ounces|diaper|nappy|nappies|diapers|pee|peed|poo|poop|pooped|wet|dirty|slept|sleeping|asleep|woke|nap|napped|pumped)\b|دودھ|ڈائپر|پیشاب|سو گئ|جاگ|رضع|حفاض|نام|بيبرون|pañal|pecho|biberón|durmió|mama|bez|emzir|uyudu/i;
  const QUESTION = /\?|^(how|what|why|when|is|are|should|can|could|does|do|will|which|who)\b|کیا|کیسے|کیوں|کب|هل|كيف|لماذا|cómo|qué|por qué|nasıl|neden|mi\b|mı\b/i;
  async function maybeLogFromChat(text) {
    if (!LOG_HINT.test(text) || QUESTION.test(text.trim())) return null;
    const found = await parseLog(text);
    if (!found || !found.length) return null;
    addEvents(found);
    renderToday();
    return w("logged", { x: found.map(describe).join(", ") });
  }

  // What the AI should know about her, sent with each question.
  function forAI() {
    if (!profile) return { profile: null, tracker: null };
    const p = { name: profile.name || "", stage: profile.stage || "", babyName: profile.babyName || "", feeding: profile.feeding || "" };
    const d = babyAgeDays(), wk = pregnancyWeek();
    if (d != null) p.babyAgeDays = d;
    if (wk != null) p.pregnancyWeek = wk;
    const s = summary();
    const tracker = s.count ? { summary: `${s.feeds} feeds, ${s.wet} wet diapers, ${s.dirty} dirty diapers, about ${Math.round(s.sleepMin / 60)} hours of sleep logged${s.lastFeedAgo != null ? ", last feed " + Math.round(s.lastFeedAgo / 60000) + " minutes ago" : ""}` } : null;
    return { profile: p, tracker };
  }

  function rerenderAll() {
    renderToday();
    if (!setup.sheet.hidden) renderSetup();
    if (!log.sheet.hidden) renderLog();
    if (!mood.sheet.hidden && mStep === -1) renderMood();
    if (!tour.sheet.hidden) renderTour();
    if (logBtn) logBtn.setAttribute("aria-label", w("logMenu"));
  }
  onLang(() => { translateUi(); rerenderAll(); });

  window.companion = { openSetup, openLog, openMood, openTour, maybeLogFromChat, forAI };
  translateUi();
  renderToday();
  // First visit: the welcome setup (unless she skipped it before).
  if (!profile && !load("mh-setup-skipped", false)) setTimeout(openSetup, 600);
})();
