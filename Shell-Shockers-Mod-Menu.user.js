// ==UserScript==
// @name         Shell Shockers Mod Menu
// @namespace    https://github.com/Virojet
// @version      1.3.1
// @description  One menu for your Shell Shockers mods. Add any userscript, switch themes and turn mods on or off without reloading.
// @author       Virojet
// @license      MIT
// @homepageURL  https://github.com/Virojet/Shell-Shockers-Mod-Menu
// @supportURL   https://github.com/Virojet/Shell-Shockers-Mod-Menu/issues
// @downloadURL  https://raw.githubusercontent.com/Virojet/Shell-Shockers-Mod-Menu/main/Shell-Shockers-Mod-Menu.user.js
// @updateURL    https://raw.githubusercontent.com/Virojet/Shell-Shockers-Mod-Menu/main/Shell-Shockers-Mod-Menu.user.js
// @match        *://*.shellshock.io/*
// @match        *://*.shellgame.me/*
// @match        *://*.algebra.best/*
// @match        *://*.algebra.vip/*
// @match        *://*.biologyclass.club/*
// @match        *://*.deadlyegg.com/*
// @match        *://*.deathegg.world/*
// @match        *://*.eggboy.club/*
// @match        *://*.eggboy.xyz/*
// @match        *://*.eggcombat.com/*
// @match        *://*.egg.dance/*
// @match        *://*.eggfacts.fun/*
// @match        *://*.egghead.institute/*
// @match        *://*.eggisthenewblack.com/*
// @match        *://*.eggsarecool.com/*
// @match        *://*.geometry.best/*
// @match        *://*.geometry.monster/*
// @match        *://*.geometry.pw/*
// @match        *://*.geometry.report/*
// @match        *://*.hardboiled.life/*
// @match        *://*.hardshell.life/*
// @match        *://*.humanorganising.org/*
// @match        *://*.mathactivity.xyz/*
// @match        *://*.mathactivity.club/*
// @match        *://*.mathdrills.info/*
// @match        *://*.mathdrills.life/*
// @match        *://*.mathfun.rocks/*
// @match        *://*.mathgames.world/*
// @match        *://*.math.international/*
// @match        *://*.mathlete.fun/*
// @match        *://*.mathlete.pro/*
// @match        *://*.overeasy.club/*
// @match        *://*.risenegg.com/*
// @match        *://*.scrambled.tech/*
// @match        *://*.scrambled.today/*
// @match        *://*.scrambled.us/*
// @match        *://*.scrambled.world/*
// @match        *://*.shellshockers.club/*
// @match        *://*.shellshockers.life/*
// @match        *://*.shellshockers.site/*
// @match        *://*.shellshockers.us/*
// @match        *://*.shellshockers.world/*
// @match        *://*.shellshockers.xyz/*
// @match        *://*.shellsocks.com/*
// @match        *://*.softboiled.club/*
// @match        *://*.urbanegger.com/*
// @match        *://*.violentegg.club/*
// @match        *://*.violentegg.fun/*
// @match        *://*.yolk.best/*
// @match        *://*.yolk.life/*
// @match        *://*.yolk.rocks/*
// @match        *://*.yolk.tech/*
// @match        *://*.yolk.quest/*
// @match        *://*.yolk.today/*
// @match        *://*.zygote.cafe/*
// @match        *://*.shellshockers.best/*
// @match        *://*.eggboy.me/*
// @run-at       document-start
// @grant        none
// @noframes
// ==/UserScript==

/* Mod Menu: one place to switch themes and turn mods on or off, live.

   Any userscript can be added to the menu: a link to its .user.js, its code, or the file. Tampermonkey can't turn
   one script off from another, so the menu runs the scripts added to it. While a script runs, the menu keeps track
   of what it does: what it adds to or changes on the page, its listeners, timers and observers, and the globals
   and built-in functions it replaces. Turning it off stops all of that and puts the page back; turning it on runs
   it again from the start. GM_* functions are there for them (values, styles, menu commands, and the downloads a
   site allows). What can't be undone live, like changes a script made to the game while the page loaded, is
   said on its card with a Reload button.

   Mods it knows when Tampermonkey runs them: the Cherry Blossom, Blossom V4 and Fuji Dusk themes (switched by turning their
   stylesheets off and hiding what they add) and Better HUD (listed, with a shortcut to its MODS tab; its game
   patches load with the page, so it can't be switched off live).

   A script can also add itself, with its own on/off code. Run your mod as usual, then:
     (window.ssModMenuQueue = window.ssModMenuQueue || []).push({
       id: "my-mod", name: "My Mod", description: "What it does.",
       group: "mod",                // or "theme": only one theme is on at a time
       enable() { ... }, disable() { ... },   // must work again and again, without a reload
     });
   The queue works whichever script Tampermonkey runs first. If the saved choice is "off", the menu calls
   disable() right away, before the first paint. Optional: version, defaultOn (false = starts off),
   active (false = not applied yet), openSettings() (adds a Settings button), alwaysOn (listed, no switch).
   window.ssModMenu has register, setEnabled, isEnabled, setTheme, list, addScript, removeScript, open and close;
   it fires "ssmodmenu:change" on window with { id, enabled } after each change. */
(() => {
  "use strict";
  if (window.ssModMenu) return;

  const VERSION = "1.3.1";
  // Saved before anything can wrap it: the menu's own record of page changes uses it.
  const NativeMO = window.MutationObserver;
  const STORE = "ssmm.v1";
  const DEFAULT_KEY = "Backquote";
  const byId = id => document.getElementById(id);
  // The game's own UI sounds, used the way the game uses them: a button clicks, a switch or theme changes, the Add view
  // toggles like a tab, the menu opens and closes like a popup, an added script confirms, and a removal or a refusal
  // resets. One asked for before the game has loaded it logs an error, so it's skipped.
  const sound = name => { try { const b = window.BAWK; if (b?.sounds?.[name]) b.play(name); } catch { /* not ready yet */ } };

  /* ---- Saved choices ---- */
  let state;
  try { state = JSON.parse(localStorage.getItem(STORE)); } catch { /* storage blocked: choices last this visit */ }
  if (!state || typeof state !== "object" || Array.isArray(state)) state = {};
  if (!state.on || typeof state.on !== "object") state.on = {};
  if (typeof state.key !== "string" || !state.key) state.key = DEFAULT_KEY;
  // A theme that wasn't here on the last visit was just installed, so it takes over. On the very first visit
  // the first theme found is used.
  const firstRun = !Array.isArray(state.seen);
  const seenBefore = new Set(firstRun ? [] : state.seen);
  if (firstRun) state.seen = [];
  const save = () => { try { localStorage.setItem(STORE, JSON.stringify(state)); } catch { /* this visit only */ } };

  /* ---- Registry ---- */
  const mods = new Map();
  const ID_RE = /^[a-z0-9][a-z0-9._-]{0,47}$/i;
  const SCRIPT = Symbol("script");
  const emit = (type, detail) => window.dispatchEvent(new CustomEvent("ssmodmenu:" + type, { detail }));
  const wanted = m => m.alwaysOn || (m.group === "theme" ? state.theme === m.id : (state.on[m.id] ?? m.def.defaultOn !== false));
  const activeTheme = () => [...mods.values()].find(m => m.group === "theme" && m.active);

  function apply(m, on) {
    if (m.alwaysOn || m.active === on) return;
    try {
      (on ? m.def.enable : m.def.disable).call(m.def);
      m.active = on;
      m.error = "";
      emit("change", { id: m.id, enabled: on });
    } catch (err) {
      m.error = `Couldn't turn it ${on ? "on" : "off"}: ${(err && err.message) || err}`;
      console.warn("[Mod Menu]", m.name, err);
      // The saved choice follows what actually happened, so a broken mod isn't retried on every change.
      if (m.group !== "theme") state.on[m.id] = m.active;
      else if (on && state.theme === m.id) state.theme = "none";
      save();
    }
  }
  // Everything that should be off goes off first, so two themes never stack.
  function sync() {
    within(MENU, () => {
      const list = [...mods.values()];
      for (const m of list) if (!wanted(m)) apply(m, false);
      for (const m of list) if (wanted(m)) apply(m, true);
      paint();
    }, null, []);
  }

  function register(def) {
    // A script the menu runs that adds itself joins its own card: its disable() runs before the rest is undone.
    const run = def && typeof def === "object" && !def[SCRIPT] ? callerRun(true) : null;
    if (run) return adopt(run, def);
    const ok = def && typeof def === "object" && ID_RE.test(String(def.id)) &&
      (def.alwaysOn || (typeof def.enable === "function" && typeof def.disable === "function"));
    if (!ok) {
      console.warn("[Mod Menu] A mod needs an id plus enable() and disable().", def);
      return null;
    }
    const id = String(def.id);
    if (mods.has(id)) return handle(id);
    const m = {
      id, def,
      name: String(def.name || id).slice(0, 60),
      description: String(def.description || "").slice(0, 220),
      version: def.version == null ? "" : String(def.version).slice(0, 20),
      group: def.group === "theme" ? "theme" : "mod",
      alwaysOn: !!def.alwaysOn,
      active: def.alwaysOn || def.active !== false,
      error: "",
      // Scripts the menu runs: the saved script, its run while it's on, and what its card says about it.
      script: def[SCRIPT] || null, run: null, warn: "", note: "", reload: false,
    };
    mods.set(id, m);
    // Saved only when something changed: every mod registers on every page load.
    let dirty = false;
    if (m.group === "theme" && (state.theme == null || (!firstRun && !seenBefore.has(id)))) { state.theme = id; dirty = true; }
    if (!state.seen.includes(id)) { state.seen.push(id); dirty = true; }
    if (dirty) save();
    sync();
    emit("register", { id });
    return handle(id);
  }
  const handle = id => ({ id, isEnabled: () => isEnabled(id), setEnabled: on => setEnabled(id, on), unregister: () => unregister(id) });
  function unregister(id) {
    if (!mods.delete(id)) return false;
    paint();
    return true;
  }
  function isEnabled(id) {
    const m = mods.get(id);
    return !!m && m.active;
  }
  function setEnabled(id, on) {
    const m = mods.get(id);
    if (!m || m.alwaysOn) return false;
    if (m.group === "theme") {
      if (on) state.theme = id;
      else if (state.theme === id) state.theme = "none";
    } else state.on[id] = !!on;
    save();
    sync();
    return !m.error;
  }
  function setTheme(id) {
    if (id === "none" || id == null) {
      state.theme = "none";
      save();
      sync();
      return true;
    }
    return mods.get(id)?.group === "theme" && setEnabled(id, true);
  }

  /* ---- Scripts the menu runs ---- */
  // Saved apart from the choices above: the list, then each script's code, the files it @requires, its
  // @resources and its GM values under keys of their own. Code is read synchronously at start-up, so a script set
  // to run at document-start still runs before the game.
  const store = {
    get: k => { try { return localStorage.getItem(k); } catch { return null; } },
    set: (k, v) => localStorage.setItem(k, v), // throws when storage is full
    del: k => { try { localStorage.removeItem(k); } catch { /* blocked */ } },
  };
  const LIST = "ssmm.scripts";
  const codeKey = k => "ssmm.code." + k, libKey = k => "ssmm.lib." + k, resKey = k => "ssmm.res." + k, valKey = k => "ssmm.val." + k;
  let scripts = [];
  try {
    const a = JSON.parse(store.get(LIST));
    if (Array.isArray(a)) scripts = a.filter(s => s && typeof s.key === "string" && typeof s.name === "string");
  } catch { /* nothing saved yet */ }
  const saveScripts = () => store.set(LIST, JSON.stringify(scripts));

  // The ==UserScript== block. Translated lines (@name:fr) are skipped.
  function parseMeta(code) {
    const meta = { name: "", namespace: "", version: "", description: "", author: "", "run-at": "", match: [], include: [], exclude: [], "exclude-match": [], require: [], resource: [], grant: [] };
    const block = /\/\/[ \t]*==UserScript==[\s\S]*?\/\/[ \t]*==\/UserScript==/.exec(code);
    if (!block) return { meta, block: "" };
    for (const line of block[0].split(/\r?\n/)) {
      const m = /^\s*\/\/\s*@([\w-]+)(:\S+)?(?:\s+(.*?))?\s*$/.exec(line);
      if (!m || m[2] || !(m[1] in meta)) continue;
      const v = m[3] || "";
      if (Array.isArray(meta[m[1]])) { if (v) meta[m[1]].push(v); } else if (!meta[m[1]]) meta[m[1]] = v;
    }
    return { meta, block: block[0] };
  }
  const globRe = g => new RegExp("^" + g.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*") + "$", "i");
  function matchPattern(p, u) {
    if (p === "<all_urls>") return true;
    const m = /^(\*|[a-z-]+):\/\/(\*|\*\.[^/]+|[^/*]*)(\/.*)?$/i.exec(p);
    if (!m) return false;
    const [, scheme, host, path = "/*"] = m;
    if (scheme === "*" ? !/^https?:$/.test(u.protocol) : u.protocol !== scheme.toLowerCase() + ":") return false;
    const h = host.toLowerCase();
    if (h !== "*" && (h.startsWith("*.") ? !(u.hostname === h.slice(2) || u.hostname.endsWith(h.slice(1))) : u.hostname !== h)) return false;
    return globRe(path).test(u.pathname + u.search);
  }
  function includeRule(p, u) {
    const re = /^\/(.+)\/([a-z]*)$/i.exec(p);
    if (re) { try { return new RegExp(re[1], re[2]).test(u.href); } catch { return false; } }
    return globRe(p).test(u.href);
  }
  function runsHere(s) {
    const u = new URL(location.href);
    if ((s.exclude || []).some(p => includeRule(p, u)) || (s.excludeMatch || []).some(p => matchPattern(p, u))) return false;
    if (!s.match?.length && !s.include?.length) return true;
    return (s.match || []).some(p => matchPattern(p, u)) || (s.include || []).some(p => includeRule(p, u));
  }
  const hash = str => {
    let h = 0x811c9dc5;
    for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 0x01000193); }
    return (h >>> 0).toString(36);
  };
  const slug = n => (n.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "script").slice(0, 40);
  const shortName = n => n.replace(/^\s*shell[\s-]*shockers?\b\s*[-–—:|]?\s*/i, "").trim() || n;
  const fileName = u => { try { return decodeURIComponent(new URL(u).pathname.split("/").pop()) || u; } catch { return u; } };

  /* Who is running. Each script's code is compiled with its own source name (mm-script:/<run>/...), so the
     browser's stack says which script made a call, even after an await. The menu's own wrappers on top of the
     stack are skipped, and the code under them decides:
     - a page change belongs to the script whose code made it;
     - a listener, timer or observer belongs to a script only when nothing under the script's code is the page's
       or another script's. When a script wraps a game function and the game calls it, what the game sets up
       through the wrapper stays the game's, so turning the script off never stops the game's own loop. */
  const live = new Set();     // runs that are on
  const runs = new Map();     // run number → run, while it's on
  const MENU = { on: false }; // the menu's own code is running: nothing it does belongs to a script
  let current = null;         // the run whose code is running right now (null: the page's)
  let nextRun = 1;
  const RUN_URL = /^mm-script:\/(\d+)\//;
  const PEEK = 12, DEPTH = 60;
  const v8 = typeof Error.captureStackTrace === "function";
  const frameName = f => f.getScriptNameOrSourceURL?.() || f.getFileName?.() || (f.isEval?.() ? "eval" : "");
  const textNames = text => String(text || "").split("\n").map(l => (/@(.+?)(?::\d+)*$/.exec(l)?.[1] || "").replace(/ line \d+ > .*$/, ""));
  function stack(depth, prepare) {
    const keep = Error.prepareStackTrace, limit = Error.stackTraceLimit;
    try {
      Error.prepareStackTrace = prepare;
      Error.stackTraceLimit = depth;
      return new Error().stack;
    } finally {
      Error.prepareStackTrace = keep;
      Error.stackTraceLimit = limit;
    }
  }
  const selfFile = (v8 && stack(1, (_, frames) => frameName(frames[0]))) || textNames(new Error().stack)[0] || "";
  const runOf = n => { const m = RUN_URL.exec(n); return m ? runs.get(+m[1]) || null : null; };
  const same = n => n;
  // frames: the stack, top first, and name(frame) its source name. Each name is read only when it's needed, since
  // most calls are settled by the first few. Returns undefined when the stack was cut off before it could tell.
  function ownerOf(frames, name, strict, cut) {
    let run = null;
    for (const f of frames) {
      const n = name(f);
      if (!n) continue;
      if (n === selfFile) {
        if (run) return run; // the menu called the script: what follows is the script's own call
        continue;            // the menu's wrappers
      }
      const r = runOf(n);
      if (!r || (run && r !== run)) return null;
      if (!strict) return r;
      run = r;
    }
    return cut ? undefined : run;
  }
  // One reader per kind of look, made once: this runs on every call a wrapped function gets while a script is on.
  const readers = [false, true].map(strict => [PEEK, DEPTH].map(depth => (_, frames) => ownerOf(frames, frameName, strict, frames.length >= depth)));
  function callerRun(strict) {
    if (!live.size || current === MENU) return null;
    if (!v8) return ownerOf(textNames(new Error().stack), same, strict, false) || null;
    // A short look settles almost every call (the game's own calls at once); the long one is rarely needed.
    const look = readers[+strict], r = stack(PEEK, look[0]);
    return (r !== undefined ? r : stack(DEPTH, look[1])) || null;
  }

  // Page changes are recorded all the time while a script is on, and handed to the run whose code made them:
  // the records are taken when its code starts and when it ends. Whatever arrives on its own was the page's.
  const journal = new NativeMO(() => { /* the page's own changes */ });
  let journalOn = false;
  function take(run) {
    if (!journalOn) return;
    const recs = journal.takeRecords();
    if (run && run.on && recs.length) run.note(recs);
  }
  // Runs fn as `run`: a script's run, the menu (MENU) or the page (null).
  function within(run, fn, self, args) {
    const prev = current;
    if (prev === run) return Reflect.apply(fn, self, args);
    take(prev);
    current = run;
    try {
      return Reflect.apply(fn, self, args);
    } finally {
      take(run);
      current = prev;
      if (run && run !== MENU) wake();
    }
  }
  // Right after a script's code runs, the promise callbacks it started may run (the rest of an async function
  // after an await). For those few microtasks, every page change is checked for its owner; at other times only
  // nodes going on or off the page are, which keeps the game's own frequent updates cheap.
  const microtask = queueMicrotask.bind(window);
  let awake = 0;
  const settle = () => { if (awake && --awake) microtask(settle); };
  function wake() {
    if (!awake) microtask(settle);
    awake = 24;
  }
  const isMenuNode = n => n === host || n === launcher || n === pageCss;

  const KEEP = 3000; // a script that keeps removing what the game keeps adding: the oldest notes go
  const trim = map => { if (map.size > KEEP) for (const k of map.keys()) { map.delete(k); if (map.size <= KEEP * 0.8) break; } };
  const nat = {}; // the browser's own functions, saved before they're wrapped
  const wrappers = new WeakMap(); // a script's listener → its wrapped copies
  let scratch = null;
  function styleMap(text) {
    scratch ||= document.createElement("div");
    scratch.setAttribute("style", text || "");
    const map = new Map(), st = scratch.style;
    for (let i = 0; i < st.length; i++) map.set(st[i], [st.getPropertyValue(st[i]), st.getPropertyPriority(st[i])]);
    return map;
  }
  // Puts back an attribute or text the script changed, unless someone else changed it since. Classes and inline
  // styles go back one by one, so the game's own later changes to them stay.
  function restore(t, e) {
    if (e.name == null) { if (t.data === e.now) t.data = e.old ?? ""; return; }
    const now = e.ns ? t.getAttributeNS(e.ns, e.name) : t.getAttribute(e.name);
    if (now === e.old) return;
    // An attribute that wasn't there before goes away again once nothing is left in it.
    const tidy = () => { if (e.old == null && !(t.getAttribute(e.name) || "").trim()) t.removeAttribute(e.name); };
    if (!e.ns && e.name === "class" && now != null) {
      const was = new Set((e.old || "").split(/\s+/).filter(Boolean)), set = new Set((e.now || "").split(/\s+/).filter(Boolean));
      for (const c of set) if (!was.has(c)) t.classList.remove(c);
      for (const c of was) if (!set.has(c)) t.classList.add(c);
      return tidy();
    }
    if (!e.ns && e.name === "style" && now != null && t.style) {
      const was = styleMap(e.old), set = styleMap(e.now);
      for (const p of new Set([...was.keys(), ...set.keys()])) {
        const a = was.get(p), b = set.get(p);
        if (a && b && a[0] === b[0] && a[1] === b[1]) continue;
        if (t.style.getPropertyValue(p) !== (b ? b[0] : "")) continue;
        if (a) t.style.setProperty(p, a[0], a[1]); else t.style.removeProperty(p);
      }
      return tidy();
    }
    if (now !== e.now) return;
    if (e.old == null) e.ns ? t.removeAttributeNS(e.ns, e.name) : t.removeAttribute(e.name);
    else e.ns ? t.setAttributeNS(e.ns, e.name, e.old) : t.setAttribute(e.name, e.old);
  }

  // Globals and built-ins a script replaces at start-up are found by comparing these objects before and after it.
  function watchedObjects() {
    const W = window, p = name => W[name]?.prototype;
    const list = [W, document, W.navigator, W.performance, W.console, W.Math, W.JSON, W.Reflect, W.Object, Object.prototype, Function.prototype,
      Array.prototype, String.prototype, Number.prototype, p("Promise"), p("Date"), p("Map"), p("Set"), p("EventTarget"), p("Node"), p("Element"),
      p("HTMLElement"), p("Document"), p("HTMLDocument"), p("HTMLCanvasElement"), p("CanvasRenderingContext2D"), p("WebGLRenderingContext"),
      p("WebGL2RenderingContext"), p("XMLHttpRequest"), p("WebSocket"), p("Response"), p("Storage"), p("HTMLScriptElement"), p("HTMLMediaElement"),
      p("BaseAudioContext"), p("AudioNode"), p("Event"), p("KeyboardEvent"), p("MouseEvent"), p("Navigator"), p("History"), p("Performance")];
    return list.filter((o, i) => o && list.indexOf(o) === i);
  }
  const snapshot = () => watchedObjects().map(o => [o, new Map(Reflect.ownKeys(o).map(k => [k, Object.getOwnPropertyDescriptor(o, k)]))]);
  const sameDesc = (a, b) => !!a && !!b && Object.is(a.value, b.value) && a.get === b.get && a.set === b.set &&
    a.writable === b.writable && a.enumerable === b.enumerable && a.configurable === b.configurable;
  function changes(before) {
    const out = [];
    for (const [obj, was] of before) {
      for (const key of Reflect.ownKeys(obj)) {
        const now = Object.getOwnPropertyDescriptor(obj, key), old = was.get(key);
        if (!sameDesc(old, now)) out.push({ obj, key, was: old, now });
      }
      for (const [key, old] of was) if (!Object.prototype.hasOwnProperty.call(obj, key)) out.push({ obj, key, was: old, now: undefined });
    }
    return out;
  }
  // Hooks that change the game as it loads: what they did stays until a reload.
  function hooksTheGame(props) {
    const W = window, deep = new Set([W.XMLHttpRequest?.prototype, W.Response?.prototype, W.HTMLScriptElement?.prototype, W.WebSocket?.prototype, Function.prototype, Object.prototype]);
    return props.some(p => deep.has(p.obj) || (p.obj === W && (/^(fetch|eval|Function|XMLHttpRequest|WebSocket)$/.test(String(p.key)) || (!p.was && p.now && "get" in p.now))));
  }

  // One run of a script, from turning it on to turning it off.
  class Run {
    constructor(m) {
      this.n = nextRun++;
      this.m = m;
      this.on = true;
      this.booting = true;
      this.lateReady = document.readyState !== "loading";
      this.lateLoad = document.readyState === "complete";
      this.listeners = new Set();
      this.timers = new Set();
      this.intervals = new Set();
      this.frames = new Set();
      this.idles = new Set();
      this.observers = new Set();
      this.added = new Set();   // nodes it put on the page
      this.removed = new Map(); // nodes it took off, and where they were
      this.changed = new Map(); // attributes and text it changed: node → key → { old, now }
      this.props = [];
      this.defs = [];           // what it registered with the menu's API
      this.commands = new Map();
      this.watchers = new Map();
      this.hooks = false;
      this.stuck = false;       // something couldn't be put back
    }
    owns(node) {
      for (let n = node; n; n = n.parentNode || n.host) if (this.added.has(n)) return true;
      return false;
    }
    note(recs) {
      const touched = [];
      for (const r of recs) {
        const t = r.target;
        if (isMenuNode(t)) continue;
        if (r.type === "childList") {
          for (const n of r.removedNodes) {
            if (this.added.delete(n) || this.removed.has(n) || this.owns(t)) continue;
            this.removed.set(n, { parent: t, prev: r.previousSibling, next: r.nextSibling });
          }
          if (!this.owns(t)) for (const n of r.addedNodes) if (!isMenuNode(n)) this.added.add(n);
          continue;
        }
        if (this.owns(t)) continue;
        const key = r.type === "attributes" ? (r.attributeNamespace || "") + "|" + r.attributeName : "#text";
        let map = this.changed.get(t);
        if (!map) this.changed.set(t, map = new Map());
        let e = map.get(key);
        if (!e) map.set(key, e = { name: r.type === "attributes" ? r.attributeName : null, ns: r.attributeNamespace, old: r.oldValue, now: null });
        touched.push([t, e]);
      }
      for (const [t, e] of touched) e.now = e.name == null ? t.data : e.ns ? t.getAttributeNS(e.ns, e.name) : t.getAttribute(e.name);
      // Its nodes the page took away are forgotten now and then.
      if (this.added.size > KEEP) for (const n of this.added) if (!n.isConnected) this.added.delete(n);
      trim(this.removed);
      trim(this.changed);
    }
    stop() {
      if (!this.on) return;
      for (const d of this.defs) {
        if (typeof d.disable === "function") try { within(MENU, d.disable, d, []); } catch (err) { console.warn("[Mod Menu]", this.m.name, err); }
      }
      take(current);
      this.on = false;
      live.delete(this);
      runs.delete(this.n);
      const W = window;
      for (const id of this.timers) nat.clearTimeout.call(W, id);
      for (const id of this.intervals) nat.clearInterval.call(W, id);
      for (const id of this.frames) nat.cancelAnimationFrame.call(W, id);
      for (const id of this.idles) nat.cancelIdleCallback?.call(W, id);
      for (const e of this.listeners) {
        nat.removeEventListener.call(e.target, e.type, e.fn, e.capture);
        const list = wrappers.get(e.listener), i = list ? list.indexOf(e) : -1;
        if (i >= 0) list.splice(i, 1);
      }
      for (const o of this.observers) try { o.disconnect(); } catch { /* already gone */ }
      within(MENU, () => { this.undoPage(); this.undoProps(); }, null, []);
      this.commands.clear();
      this.watchers.clear();
      this.defs = [];
      if (!live.size && journalOn) { journal.disconnect(); journalOn = false; }
    }
    undoPage() {
      // Its nodes come out; what it took out goes back where it was, newest first.
      for (const n of this.added) if (n.parentNode) nat.removeChild.call(n.parentNode, n);
      for (const [n, at] of [...this.removed].reverse()) {
        if (n.isConnected) continue;
        const ref = at.next?.parentNode === at.parent ? at.next : at.prev?.parentNode === at.parent ? at.prev.nextSibling : null;
        try { nat.insertBefore.call(at.parent, n, ref); } catch { this.stuck = true; }
      }
      for (const [t, map] of this.changed) for (const e of map.values()) try { restore(t, e); } catch { this.stuck = true; }
      this.added.clear();
      this.removed.clear();
      this.changed.clear();
    }
    undoProps() {
      for (const { obj, key, was, now } of this.props.slice().reverse()) {
        const cur = Object.getOwnPropertyDescriptor(obj, key);
        try {
          if (!now) { if (!cur && was) Object.defineProperty(obj, key, was); continue; } // it deleted something
          if (!cur) continue;
          const trap = "get" in now || "set" in now;
          if (!was && !trap) { if (!("get" in cur)) delete obj[key]; continue; }   // a global of its own
          if (!sameDesc(cur, now)) { this.stuck = true; continue; }                 // replaced again since
          if (was) { Object.defineProperty(obj, key, was); continue; }
          // A trap it set for something the game adds later: the game's value stays, the trap goes.
          const v = cur.get ? cur.get.call(obj) : undefined;
          delete obj[key];
          if (v !== undefined) { obj[key] = v; this.stuck = true; }
        } catch { this.stuck = true; }
      }
      this.props = [];
    }
  }

  // Wraps the browser functions scripts use to listen, wait, observe and change the page. When no script the
  // menu runs is on, each wrapper just calls through.
  let patched = false;
  function patchPage() {
    if (patched) return;
    patched = true;
    const W = window, ET = EventTarget.prototype;
    const swap = (obj, key, wrap) => {
      const d = obj && Object.getOwnPropertyDescriptor(obj, key);
      if (!d || !d.configurable) return;
      if (typeof d.value === "function") {
        const fn = wrap(d.value);
        Object.defineProperty(fn, "name", { value: key });
        Object.defineProperty(obj, key, { ...d, value: fn });
      } else if (d.set) {
        const set = wrap(d.set);
        Object.defineProperty(set, "name", { value: "set " + key });
        Object.defineProperty(obj, key, { ...d, set });
      }
    };
    Object.assign(nat, {
      removeEventListener: ET.removeEventListener, clearTimeout: W.clearTimeout, clearInterval: W.clearInterval,
      cancelAnimationFrame: W.cancelAnimationFrame, cancelIdleCallback: W.cancelIdleCallback, setTimeout: W.setTimeout,
      removeChild: Node.prototype.removeChild, insertBefore: Node.prototype.insertBefore,
    });

    const captureOf = o => typeof o === "boolean" ? o : !!(o && o.capture);
    swap(ET, "addEventListener", add => function (type, listener, options) {
      const target = this ?? W;
      const run = listener && (typeof listener === "function" || typeof listener === "object") ? callerRun(true) : null;
      if (!run) return add.call(target, type, listener, options);
      type = String(type);
      const capture = captureOf(options);
      let list = wrappers.get(listener);
      if (!list) wrappers.set(listener, list = []);
      let e = list.find(x => x.target === target && x.type === type && x.capture === capture);
      if (!e) {
        e = { run, target, type, capture, listener };
        e.fn = function (ev) {
          if (!run.on) return;
          const fn = typeof listener === "function" ? listener : listener.handleEvent;
          if (typeof fn === "function") return within(run, fn, typeof listener === "function" ? this : listener, [ev]);
        };
        list.push(e);
        run.listeners.add(e);
      }
      add.call(target, type, e.fn, options);
      // Turned on after the page loaded: it still gets the start-up events it waits for.
      if (run.booting && ((type === "DOMContentLoaded" && run.lateReady && (target === document || target === W)) || (type === "load" && run.lateLoad && target === W))) {
        nat.setTimeout.call(W, () => { if (run.on && run.listeners.has(e)) e.fn.call(target, new Event(type)); });
      }
    });
    swap(ET, "removeEventListener", remove => function (type, listener, options) {
      const target = this ?? W, list = listener && wrappers.get(listener), t = String(type), capture = captureOf(options);
      const i = list ? list.findIndex(x => x.target === target && x.type === t && x.capture === capture) : -1;
      if (i < 0) return remove.call(target, type, listener, options);
      const [e] = list.splice(i, 1);
      e.run.listeners.delete(e);
      return remove.call(target, type, e.fn, options);
    });

    const ownFn = fn => typeof fn === "function" ? callerRun(true) : null;
    swap(W, "setTimeout", set => function (fn, ms, ...args) {
      const run = ownFn(fn);
      if (!run) return set.call(W, fn, ms, ...args);
      const id = set.call(W, () => { run.timers.delete(id); if (run.on) within(run, fn, W, args); }, ms);
      run.timers.add(id);
      return id;
    });
    swap(W, "setInterval", set => function (fn, ms, ...args) {
      const run = ownFn(fn);
      if (!run) return set.call(W, fn, ms, ...args);
      const id = set.call(W, () => { if (run.on) within(run, fn, W, args); }, ms);
      run.intervals.add(id);
      return id;
    });
    swap(W, "requestAnimationFrame", set => function (fn) {
      const run = ownFn(fn);
      if (!run) return set.call(W, fn);
      const id = set.call(W, t => { run.frames.delete(id); if (run.on) within(run, fn, W, [t]); });
      run.frames.add(id);
      return id;
    });
    swap(W, "requestIdleCallback", set => function (fn, opts) {
      const run = ownFn(fn);
      if (!run) return set.call(W, fn, opts);
      const id = set.call(W, d => { run.idles.delete(id); if (run.on) within(run, fn, W, [d]); }, opts);
      run.idles.add(id);
      return id;
    });
    swap(W, "queueMicrotask", set => function (fn) {
      const run = ownFn(fn);
      return set.call(W, run ? () => { if (run.on) within(run, fn, W, []); } : fn);
    });

    for (const name of ["MutationObserver", "ResizeObserver", "IntersectionObserver", "PerformanceObserver", "ReportingObserver"]) {
      const Native = W[name], d = Object.getOwnPropertyDescriptor(W, name);
      if (typeof Native !== "function" || !d?.configurable) continue;
      const Observer = function (cb, ...rest) {
        if (!new.target) return Reflect.apply(Native, this, [cb, ...rest]); // throws, like the real one
        const run = ownFn(cb);
        const obs = Reflect.construct(Native, [run ? function (...a) { if (run.on) return within(run, cb, this, a); } : cb, ...rest], new.target === Observer ? Native : new.target);
        if (run) run.observers.add(obs);
        return obs;
      };
      Observer.prototype = Native.prototype;
      Object.defineProperty(Observer, "name", { value: name });
      Object.defineProperty(Observer, "length", { value: Native.length });
      Object.defineProperty(W, name, { ...d, value: Observer });
    }

    // Each change goes on the record of whoever's code made it: a script's after an await or in a promise
    // callback, and the game's when a script's code calls into the game. Changes off the page (to nodes not in
    // the document yet) aren't recorded, so they aren't checked either.
    const viaRun = light => f => function (...a) {
      if (!live.size || current === MENU || (light && !current && !awake) || this?.isConnected === false) return Reflect.apply(f, this, a);
      const run = callerRun(false);
      return run === current ? Reflect.apply(f, this, a) : within(run, f, this, a);
    };
    const each = (proto, light, keys) => { if (proto) for (const k of keys) swap(proto, k, viaRun(light)); };
    // Nodes going on or off the page: always checked.
    each(Node.prototype, false, ["appendChild", "insertBefore", "removeChild", "replaceChild"]);
    each(Element.prototype, false, ["append", "prepend", "before", "after", "replaceWith", "replaceChildren", "remove", "insertAdjacentElement",
      "insertAdjacentHTML", "insertAdjacentText", "innerHTML", "outerHTML"]);
    each(W.CharacterData?.prototype, false, ["before", "after", "replaceWith", "remove"]);
    each(Document.prototype, false, ["append", "prepend", "replaceChildren"]);
    // Text, attributes, classes and styles: what the game changes most often, checked only right after a script ran.
    each(Node.prototype, true, ["textContent", "nodeValue"]);
    each(Element.prototype, true, ["setAttribute", "setAttributeNS", "removeAttribute", "removeAttributeNS", "toggleAttribute", "className", "id"]);
    each(W.CharacterData?.prototype, true, ["data", "appendData", "insertData", "deleteData", "replaceData"]);
    each(Document.prototype, true, ["title"]);
    each(HTMLElement.prototype, true, ["innerText", "outerText", "hidden", "title", "style"]);
    each(DOMTokenList.prototype, true, ["add", "remove", "toggle", "replace", "value"]);
    each(CSSStyleDeclaration.prototype, true, ["setProperty", "removeProperty", "cssText", "display", "visibility", "opacity", "pointerEvents", "zIndex", "position",
      "top", "left", "right", "bottom", "width", "height", "transform", "filter", "background", "backgroundColor", "backgroundImage", "color", "fontSize"]);
  }

  /* GM_* functions for the scripts the menu runs, close to Tampermonkey's. Values are kept per script. Downloads
     go through the page, so they only reach sites that allow it. */
  const API_NAMES = ["GM_info", "GM_getValue", "GM_setValue", "GM_deleteValue", "GM_listValues", "GM_getValues", "GM_setValues", "GM_deleteValues",
    "GM_addValueChangeListener", "GM_removeValueChangeListener", "GM_addStyle", "GM_addElement", "GM_xmlhttpRequest", "GM_registerMenuCommand",
    "GM_unregisterMenuCommand", "GM_setClipboard", "GM_openInTab", "GM_notification", "GM_getResourceText", "GM_getResourceURL", "GM_log", "GM", "unsafeWindow"];
  function gmRequest(run, d) {
    d = d || {};
    const ctrl = new AbortController();
    let timer = 0, done = false;
    const call = (name, res) => {
      const f = d[name];
      if (typeof f === "function" && run.on) try { within(run, f, d, [res]); } catch (err) { console.error(err); }
    };
    const fail = (name, error) => {
      if (done) return;
      done = true;
      const res = { readyState: 4, status: 0, statusText: "", finalUrl: String(d.url), responseHeaders: "", response: null, responseText: "", error, context: d.context };
      call(name, res);
      call("onloadend", res);
    };
    if (d.timeout > 0) timer = setTimeout(() => { fail("ontimeout", "timeout"); ctrl.abort(); }, d.timeout);
    (async () => {
      try {
        const r = await fetch(d.url, { method: d.method || "GET", headers: d.headers, body: d.data, signal: ctrl.signal, credentials: d.anonymous ? "omit" : "same-origin" });
        let response, text = "";
        if (d.responseType === "arraybuffer") response = await r.arrayBuffer();
        else if (d.responseType === "blob") response = await r.blob();
        else {
          response = text = await r.text();
          if (d.responseType === "json") try { response = JSON.parse(text); } catch { response = undefined; }
          else if (d.responseType === "document") response = new DOMParser().parseFromString(text, "text/html");
        }
        if (done) return;
        done = true;
        clearTimeout(timer);
        const res = { readyState: 4, status: r.status, statusText: r.statusText, finalUrl: r.url, responseHeaders: [...r.headers].map(([k, v]) => k + ": " + v).join("\r\n"),
          response, responseText: text, responseXML: null, context: d.context };
        call("onreadystatechange", res);
        call("onload", res);
        call("onloadend", res);
      } catch (err) {
        clearTimeout(timer);
        fail(err?.name === "AbortError" ? "onabort" : "onerror", `The request was blocked or failed: ${err?.message || err}`);
      }
    })();
    return { abort() { ctrl.abort(); } };
  }
  function gmApi(run) {
    const s = run.m.script, vk = valKey(s.key);
    const values = () => { try { const v = JSON.parse(store.get(vk)); return v && typeof v === "object" ? v : {}; } catch { return {}; } };
    const keep = v => { try { store.set(vk, JSON.stringify(v)); } catch (err) { console.warn("[Mod Menu]", s.name, "couldn't save a value:", err); } };
    const tell = (k, old, now) => { for (const w of run.watchers.values()) if (w.key === k) try { w.fn(k, old, now, false); } catch (err) { console.error(err); } };
    const getValue = (k, d) => { const v = values(); return Object.prototype.hasOwnProperty.call(v, k) ? v[k] : d; };
    const setValue = (k, val) => { const v = values(), old = v[k]; v[k] = val; keep(v); tell(k, old, val); };
    const deleteValue = k => { const v = values(), old = v[k]; delete v[k]; keep(v); tell(k, old, undefined); };
    const listValues = () => Object.keys(values());
    const getValues = keys => {
      const v = values();
      if (Array.isArray(keys)) return Object.fromEntries(keys.filter(k => k in v).map(k => [k, v[k]]));
      if (keys && typeof keys === "object") return Object.fromEntries(Object.entries(keys).map(([k, d]) => [k, k in v ? v[k] : d]));
      return v;
    };
    const setValues = obj => { for (const [k, val] of Object.entries(obj || {})) setValue(k, val); };
    const deleteValues = keys => { for (const k of keys || []) deleteValue(k); };
    let watch = 0, cmd = 0;
    const addValueChangeListener = (key, fn) => { run.watchers.set(++watch, { key, fn }); return watch; };
    const removeValueChangeListener = id => { run.watchers.delete(id); };
    const addStyle = css => within(run, () => {
      const st = document.createElement("style");
      st.textContent = String(css);
      (document.head || document.documentElement).appendChild(st);
      return st;
    }, null, []);
    const addElement = (parent, tag, attrs) => {
      if (typeof parent === "string") { attrs = tag; tag = parent; parent = null; }
      return within(run, () => {
        const n = document.createElement(tag);
        for (const [k, v] of Object.entries(attrs || {})) k === "textContent" || k === "innerHTML" ? (n[k] = v) : n.setAttribute(k, v);
        (parent || document.head || document.documentElement).appendChild(n);
        return n;
      }, null, []);
    };
    const registerMenuCommand = (caption, fn, opts) => {
      const id = opts && typeof opts === "object" && opts.id != null ? opts.id : ++cmd;
      run.commands.set(String(id), { caption: String(caption).slice(0, 40), fn });
      paint();
      return id;
    };
    const unregisterMenuCommand = id => { run.commands.delete(String(id)); paint(); };
    const setClipboard = text => { navigator.clipboard?.writeText(String(text)).catch(() => { /* not allowed right now */ }); };
    const openInTab = url => { window.open(url, "_blank", "noopener"); return { close() { }, closed: false }; };
    const notification = (d, title) => { const text = d && typeof d === "object" ? d.text || d.title : d || title; if (text) toast(`${run.m.name}: ${text}`); };
    let res = {};
    try { res = JSON.parse(store.get(resKey(s.key))) || {}; } catch { /* none */ }
    const getResourceURL = name => res[name] || null;
    const getResourceText = name => {
      const u = res[name];
      if (!u) return null;
      try { return new TextDecoder().decode(Uint8Array.from(atob(u.slice(u.indexOf(",") + 1)), c => c.charCodeAt(0))); } catch { return null; }
    };
    const info = {
      script: { name: s.name, namespace: s.namespace, version: s.version, description: s.description, author: s.author, matches: s.match || [], includes: s.include || [],
        excludes: s.exclude || [], "run-at": s.runAt, grant: s.grant || [], resources: Object.keys(res).map(name => ({ name })) },
      scriptMetaStr: s.meta || "", scriptHandler: "Mod Menu", version: VERSION,
    };
    const xmlhttpRequest = d => gmRequest(run, d);
    const later = f => (...a) => { try { return Promise.resolve(f(...a)); } catch (err) { return Promise.reject(err); } };
    const GM = Object.freeze({
      info, getValue: later(getValue), setValue: later(setValue), deleteValue: later(deleteValue), listValues: later(listValues),
      getValues: later(getValues), setValues: later(setValues), deleteValues: later(deleteValues),
      addValueChangeListener: later(addValueChangeListener), removeValueChangeListener: later(removeValueChangeListener),
      addStyle: later(addStyle), addElement: later(addElement), registerMenuCommand: later(registerMenuCommand), unregisterMenuCommand: later(unregisterMenuCommand),
      setClipboard: later(setClipboard), openInTab: later(openInTab), notification: later(notification), getResourceUrl: later(getResourceURL),
      getResourceText: later(getResourceText), log: console.log.bind(console),
      xmlHttpRequest(d = {}) {
        let h;
        const p = new Promise((ok, no) => {
          const pass = (name, end) => r => { if (typeof d[name] === "function") d[name](r); end(r); };
          h = xmlhttpRequest({ ...d, onload: pass("onload", ok), onerror: pass("onerror", no), ontimeout: pass("ontimeout", no), onabort: pass("onabort", no) });
        });
        p.abort = () => h.abort();
        return p;
      },
    });
    return {
      GM_info: info, GM_getValue: getValue, GM_setValue: setValue, GM_deleteValue: deleteValue, GM_listValues: listValues, GM_getValues: getValues,
      GM_setValues: setValues, GM_deleteValues: deleteValues, GM_addValueChangeListener: addValueChangeListener, GM_removeValueChangeListener: removeValueChangeListener,
      GM_addStyle: addStyle, GM_addElement: addElement, GM_xmlhttpRequest: xmlhttpRequest, GM_registerMenuCommand: registerMenuCommand,
      GM_unregisterMenuCommand: unregisterMenuCommand, GM_setClipboard: setClipboard, GM_openInTab: openInTab, GM_notification: notification,
      GM_getResourceText: getResourceText, GM_getResourceURL: getResourceURL, GM_log: console.log.bind(console), GM, unsafeWindow: window,
    };
  }

  // Scripts that run later than document-start wait for the page to be parsed, as in Tampermonkey.
  const pendingStart = new Set();
  let booted = false;
  function startScript(m) {
    const s = m.script;
    m.warn = m.note = "";
    m.reload = false;
    if (!runsHere(s)) { m.note = "It isn't set to run on this site."; return; }
    if (document.readyState === "loading" && s.runAt !== "document-start") { pendingStart.add(m); return; }
    const code = store.get(codeKey(s.key));
    if (code == null) throw new Error("its code is missing. Remove it and add it again");
    patchPage();
    const run = new Run(m);
    let fn;
    try {
      fn = new Function(...API_NAMES, `${store.get(libKey(s.key)) || ""}\n${code}\n//# sourceURL=mm-script:/${run.n}/${slug(s.name)}.user.js`);
    } catch (err) {
      throw new Error(`its code has an error: ${err.message}`);
    }
    runs.set(run.n, run);
    live.add(run);
    m.run = run;
    if (!journalOn) {
      journal.observe(document, { childList: true, subtree: true, attributes: true, attributeOldValue: true, characterData: true, characterDataOldValue: true });
      journalOn = true;
    }
    const api = gmApi(run), before = snapshot();
    try {
      within(run, fn, window, API_NAMES.map(k => api[k]));
    } catch (err) {
      m.warn = `It hit an error while starting: ${(err && err.message) || err}`;
      console.error("[Mod Menu]", s.name, err);
    }
    run.booting = false;
    run.props = changes(before);
    run.hooks = hooksTheGame(run.props);
    if (run.hooks && booted) {
      m.note = "Parts of it start with the page. Reload to start them.";
      m.reload = true;
    }
  }
  function stopScript(m) {
    if (pendingStart.delete(m)) return;
    const run = m.run;
    m.run = null;
    m.warn = "";
    if (!run) return;
    run.stop();
    m.reload = run.hooks || run.stuck;
    m.note = m.reload ? "Some of its changes stay until you reload." : "";
  }
  function runPending() {
    for (const m of [...pendingStart]) {
      pendingStart.delete(m);
      try {
        startScript(m);
      } catch (err) {
        m.active = false;
        m.error = `Couldn't turn it on: ${(err && err.message) || err}`;
        console.warn("[Mod Menu]", m.name, err);
      }
    }
    paint();
  }
  function adopt(run, def) {
    run.defs.push(def);
    if (def.active === false && typeof def.enable === "function") {
      try { within(run, def.enable, def, []); } catch (err) { console.warn("[Mod Menu]", run.m.name, err); }
    }
    paint();
    const id = run.m.id;
    return { id, isEnabled: () => isEnabled(id), setEnabled: on => setEnabled(id, on), unregister: () => { run.defs = run.defs.filter(d => d !== def); paint(); return true; } };
  }
  function scriptDef(s) {
    return {
      id: "us." + s.key, name: shortName(s.name), version: s.version, group: s.group, active: false,
      description: s.description || (s.from ? `Added from ${fileName(s.from)}.` : "A script you added."),
      enable() { startScript(mods.get(this.id)); },
      disable() { stopScript(mods.get(this.id)); },
      [SCRIPT]: s,
    };
  }

  // A Greasy Fork page link is looked up, and a GitHub file page becomes its raw file.
  async function download(url) {
    let u = url.trim();
    const gf = /^https?:\/\/(?:www\.)?(greasyfork|sleazyfork)\.org\/(?:[\w-]+\/)?scripts\/(\d+)(?:-[^/?#]*)?\/?(?:[?#].*)?$/i.exec(u);
    if (gf) {
      try {
        const r = await fetch(`https://${gf[1].toLowerCase()}.org/scripts/${gf[2]}.json`, { credentials: "omit" });
        u = (r.ok && (await r.json()).code_url) || "";
      } catch { u = ""; }
      if (!u) throw new Error("Couldn't look up that Greasy Fork script. Open it, copy all of its code, and paste it here.");
    }
    const gh = /^https?:\/\/github\.com\/([^/]+)\/([^/]+)\/(?:blob|raw)\/(.+)$/i.exec(u);
    if (gh) u = `https://raw.githubusercontent.com/${gh[1]}/${gh[2]}/${gh[3]}`;
    let r;
    try {
      r = await fetch(u, { credentials: "omit", cache: "no-cache" });
    } catch {
      throw new Error("That site doesn't let the game download from it. Open the link, copy all of the code, and paste it here.");
    }
    if (!r.ok) throw new Error(`The download failed (error ${r.status}). Check the link.`);
    return r.text();
  }
  const dataUrl = blob => new Promise((ok, no) => { const fr = new FileReader(); fr.onload = () => ok(fr.result); fr.onerror = () => no(fr.error); fr.readAsDataURL(blob); });

  // Adds a script from a link or its code, or updates one already added (same @name and @namespace). It's
  // turned on right away.
  async function addScript(source) {
    let code = String(source ?? "").trim(), from = "";
    if (!code) throw new Error("Paste a link or a script first.");
    if (/^https?:\/\/\S+$/i.test(code)) { from = code; code = await download(code); }
    if (/^\s*<(?:!doctype|html)/i.test(code)) throw new Error("That link opens a web page, not a script. Use the link to the .user.js file.");
    const { meta, block } = parseMeta(code);
    if (/^shell shockers mod menu$/i.test(meta.name)) throw new Error("That's the Mod Menu itself.");
    const name = meta.name.slice(0, 120) || "Pasted script";
    const key = hash(block ? meta.namespace + "\n" + name : code);
    let lib = "";
    for (const u of meta.require) {
      try { lib += (await download(u)) + "\n;\n"; } catch (err) { throw new Error(`Couldn't download ${fileName(u)}, a file it needs. ${err.message}`); }
    }
    const res = {};
    for (const line of meta.resource) {
      const [, rn, ru] = /^(\S+)\s+(\S+)/.exec(line) || [];
      if (!rn) continue;
      try {
        const r = await fetch(ru, { credentials: "omit" });
        if (!r.ok) throw new Error(String(r.status));
        res[rn] = await dataUrl(await r.blob());
      } catch { throw new Error(`Couldn't download ${fileName(ru)}, a file it needs.`); }
    }
    try { new Function(...API_NAMES, lib + "\n" + code); } catch (err) { throw new Error(`Its code has an error: ${err.message}`); }
    const s = {
      key, name, namespace: meta.namespace, version: meta.version.slice(0, 24), description: meta.description.slice(0, 300), author: meta.author,
      runAt: meta["run-at"] || "document-idle", match: meta.match, include: meta.include, exclude: meta.exclude, excludeMatch: meta["exclude-match"],
      grant: meta.grant, group: /theme/i.test(name) ? "theme" : "mod", from, meta: block.slice(0, 6000),
    };
    const id = "us." + key, old = mods.get(id);
    if (old) apply(old, false);
    const list = scripts.filter(x => x.key !== key);
    const at = scripts.findIndex(x => x.key === key);
    list.splice(at < 0 ? list.length : at, 0, s);
    try {
      store.set(codeKey(key), code);
      if (lib) store.set(libKey(key), lib); else store.del(libKey(key));
      if (Object.keys(res).length) store.set(resKey(key), JSON.stringify(res)); else store.del(resKey(key));
      store.set(LIST, JSON.stringify(list));
    } catch {
      if (!old) [codeKey, libKey, resKey].forEach(k => store.del(k(key)));
      if (old) sync();
      throw new Error("There's no room left to save it. Remove a script you don't use, then try again.");
    }
    scripts = list;
    if (old) mods.delete(id);
    state.on[id] = true;
    if (s.group === "theme") state.theme = id;
    save();
    register(scriptDef(s));
    return id;
  }
  function removeScript(id) {
    const m = mods.get(id);
    if (!m?.script) return false;
    apply(m, false);
    pendingStart.delete(m);
    const key = m.script.key;
    [codeKey, libKey, resKey, valKey].forEach(k => store.del(k(key)));
    scripts = scripts.filter(x => x.key !== key);
    try { saveScripts(); } catch { /* the list only got shorter */ }
    delete state.on[id];
    if (state.theme === id) state.theme = "none";
    state.seen = state.seen.filter(x => x !== id);
    save();
    mods.delete(id);
    sync();
    return true;
  }

  /* ---- Known mods ---- */
  // These scripts don't know about the menu, so they're switched from the outside: their stylesheet is turned
  // off with media="not all", and what they add to the page is hidden by a class on <html>.
  const root = () => document.documentElement;
  const styleOff = (id, off) => {
    const s = byId(id);
    if (s) off ? s.setAttribute("media", "not all") : s.removeAttribute("media");
  };
  const inMatchView = () => {
    const app = byId("app");
    return !!app && (app.classList.contains("game-screen") || app.classList.contains("photo-booth"));
  };
  // Fuji Dusk shows its corner button again on every screen change, and Right Shift opens its dialog while the
  // button isn't hidden, so while the theme is off the button is kept hidden.
  function hideFujiButton() {
    const c = byId("fuji-dusk-controls");
    if (!c) return;
    c.shadowRoot?.querySelector("dialog[open]")?.close();
    c.hidden = true;
  }
  const fujiWatch = new MutationObserver(() => {
    const c = byId("fuji-dusk-controls");
    if (c && !c.hidden && mods.get("fuji-dusk")?.active === false) c.hidden = true;
  });

  const known = [
    {
      marker: "ss-sakura-style",
      def: {
        id: "cherry-blossom", name: "Cherry Blossom", group: "theme",
        description: "Pink and plum menus with petals drifting down.",
        enable() { styleOff("ss-sakura-style", false); root().classList.remove("ssmm-off-cherry-blossom"); },
        disable() { styleOff("ss-sakura-style", true); root().classList.add("ssmm-off-cherry-blossom"); },
      },
    },
    {
      marker: "blossom-v4-style",
      def: {
        id: "blossom-v4", name: "Blossom V4", group: "theme",
        description: "Black and pink menus over cherry blossom art, with a pink HUD.",
        enable() { styleOff("blossom-v4-style", false); },
        disable() { styleOff("blossom-v4-style", true); },
      },
    },
    {
      marker: "fuji-dusk-style",
      def: {
        id: "fuji-dusk", name: "Fuji Dusk", group: "theme",
        description: "Slate glass panels and amber accents over a photo of Mount Fuji.",
        enable() {
          styleOff("fuji-dusk-style", false);
          root().classList.add("fd-theme");
          root().classList.remove("ssmm-off-fuji-dusk");
          const c = byId("fuji-dusk-controls");
          if (c) c.hidden = inMatchView();
        },
        disable() {
          styleOff("fuji-dusk-style", true);
          root().classList.remove("fd-theme");
          root().classList.add("ssmm-off-fuji-dusk");
          hideFujiButton();
        },
        openSettings() {
          const c = byId("fuji-dusk-controls");
          if (!c || c.hidden) return false;
          c.shadowRoot?.querySelector(".trigger")?.click();
          return true;
        },
      },
    },
  ];

  // What a script the menu runs puts on the page is already on that script's card.
  const fromScript = node => [...live].some(r => r.owns(node));
  function findBetterHud() {
    if (mods.has("better-hud") || !window.SSB_VERSION || !window.__ssbSettings) return;
    if ([...mods.values()].some(m => m.script && /better[\s-]*(hud|ui)/i.test(m.script.name)) ||
      [...live].some(r => r.props.some(p => p.obj === window && p.key === "__ssbSettings"))) return;
    register({
      id: "better-hud", name: "Better HUD", version: window.SSB_VERSION, alwaysOn: true,
      description: "Always on: it patches the game as the page loads. Its own switches are in Settings ▸ MODS.",
      openSettings() {
        if (typeof window.vueApp?.showSettingsPopup !== "function") return false;
        window.vueApp.showSettingsPopup();
        let tries = 0;
        const t = setInterval(() => {
          const tab = byId("mod-settings-tab");
          if (tab || ++tries > 40) { clearInterval(t); tab?.click(); }
        }, 50);
        return true;
      },
    });
  }

  const watched = new WeakSet();
  const watcher = new MutationObserver(scan);
  function scan() {
    for (const k of known) {
      const mark = !k.found && byId(k.marker);
      if (mark && !fromScript(mark)) { k.found = true; register(k.def); }
    }
    // Only direct children are watched: the themes add their stylesheets to <html> or <head>, and their
    // extras to <body>, so the game's own DOM churn never wakes this up.
    for (const el of [document.documentElement, document.head, document.body]) {
      if (el && !watched.has(el)) { watched.add(el); watcher.observe(el, { childList: true }); }
    }
    const c = byId("fuji-dusk-controls");
    if (c && !watched.has(c)) {
      watched.add(c);
      fujiWatch.observe(c, { attributes: true, attributeFilter: ["hidden"] });
      if (mods.get("fuji-dusk")?.active === false) hideFujiButton();
    }
  }

  /* ---- Public API ---- */
  window.ssModMenu = Object.freeze({
    version: VERSION,
    register, unregister, isEnabled, setEnabled, setTheme, addScript, removeScript,
    getTheme: () => activeTheme()?.id || "none",
    list: () => [...mods.values()].map(m => ({ id: m.id, name: m.name, group: m.group, version: m.version, enabled: m.active, alwaysOn: m.alwaysOn, script: !!m.script })),
    open: () => open(), close: () => close(), toggle: () => toggle(),
  });
  const queued = Array.isArray(window.ssModMenuQueue) ? window.ssModMenuQueue : [];
  window.ssModMenuQueue = { push: (...defs) => { defs.forEach(register); return mods.size; } };

  /* ---- Menu ---- */
  // It looks like Better HUD's MODS tab, in the game's own colours. Each theme it knows gets a look of its own.
  // Any other theme is followed through the game's colour variables, and gets dark glass when it makes the text
  // light, so the menu stays readable whatever the theme does.
  const CSS = `
    :host { all: initial; }
    :host {
      --mm-size: clamp(13px, 1.48vh, 40px);
      --mm-font: "Nunito", system-ui, sans-serif;
      --mm-ease: cubic-bezier(.2, .8, .2, 1);
      --mm-spring: cubic-bezier(.34, 1.4, .64, 1);
      --mm-ink: var(--ss-blue5, #0C576F);
      --mm-sub: color-mix(in srgb, var(--mm-ink) 74%, transparent);
      --mm-head: #fff;
      --mm-head-sub: rgba(255, 255, 255, .9);
      --mm-panel: linear-gradient(to bottom, var(--ss-blue8, #1192BC), var(--ss-blue6, #8dd3ea));
      --mm-veil: color-mix(in srgb, var(--ss-blue8, #1192BC) 94%, transparent);
      --mm-frame: var(--ss-blue5, #0C576F);
      --mm-sheen: rgba(255, 255, 255, .28);
      --mm-glass: rgba(255, 255, 255, .24);
      --mm-glass-hi: rgba(255, 255, 255, .4);
      --mm-glass-on: rgba(255, 255, 255, .44);
      --mm-edge: rgba(255, 255, 255, .5);
      --mm-edge-hi: rgba(255, 255, 255, .9);
      --mm-line: rgba(255, 255, 255, .35);
      --mm-lip: inset 0 1px 0 rgba(255, 255, 255, .5);
      --mm-shade: 0 2px 6px rgba(8, 62, 84, .06);
      --mm-shade-hi: 0 .75em 1.5em -.6em rgba(8, 62, 84, .3);
      --mm-track: color-mix(in srgb, var(--mm-ink) 22%, transparent);
      --mm-track-shade: inset 0 2px 4px rgba(8, 62, 84, .28);
      --mm-knob: #fff;
      --mm-on: linear-gradient(180deg, #ffb23f, #ff961d);
      --mm-on-edge: #cf700c;
      --mm-on-ring: rgba(255, 152, 31, .65);
      --mm-bar: linear-gradient(180deg, color-mix(in srgb, var(--ss-blue0, #c8edf8) 45%, rgba(255, 255, 255, .75)), color-mix(in srgb, var(--ss-blue0, #c8edf8) 70%, rgba(255, 255, 255, .8)));
      --mm-bar-shade: inset 0 1px 0 rgba(255, 255, 255, .6), 0 8px 22px rgba(8, 62, 84, .12);
      --mm-btn: rgba(255, 255, 255, .72);
      --mm-btn-hi: #fff;
      --mm-kbd: rgba(255, 255, 255, .85);
      --mm-toast: color-mix(in srgb, var(--ss-blue0, #c8edf8) 35%, rgba(255, 255, 255, .97));
      --mm-toast-shade: 0 .75em 2em rgba(6, 44, 60, .3);
      --mm-err: #a3231a;
      --mm-focus: var(--mm-ink);
      --mm-close-hi: rgba(255, 255, 255, .16);
      --mm-backdrop: rgba(4, 34, 46, .5);
      --mm-lift: 0 1.6em 3.8em rgba(6, 44, 60, .42), 0 .4em 1em rgba(6, 44, 60, .16);
      --mm-title-font: 400 1.375em/1.15 "Sigmar One", var(--mm-font);
      --mm-title-shade: .15em .15em 0 color-mix(in srgb, var(--ss-blue3, #0B93BD) 90%, transparent);
    }
    /* A theme the menu has no look for, whose text is light. */
    :host([data-tone="dark"]) {
      --mm-glass: rgba(0, 0, 0, .24);
      --mm-glass-hi: rgba(0, 0, 0, .34);
      --mm-glass-on: rgba(0, 0, 0, .4);
      --mm-edge: rgba(255, 255, 255, .2);
      --mm-edge-hi: rgba(255, 255, 255, .45);
      --mm-line: rgba(255, 255, 255, .22);
      --mm-lip: inset 0 1px 0 rgba(255, 255, 255, .08);
      --mm-track: rgba(255, 255, 255, .18);
      --mm-bar: rgba(0, 0, 0, .3);
      --mm-bar-shade: none;
      --mm-btn: rgba(0, 0, 0, .3);
      --mm-btn-hi: rgba(0, 0, 0, .45);
      --mm-kbd: rgba(255, 255, 255, .1);
      --mm-toast: rgba(18, 20, 24, .96);
      --mm-err: #ffb4a8;
      --mm-title-shade: .12em .12em 0 rgba(0, 0, 0, .55);
    }
    /* Cherry Blossom: its plum and pink, with pink for what's on. */
    :host([data-skin="cherry-blossom"]) {
      --mm-ink: #5a2c4f;
      --mm-sub: rgba(90, 44, 79, .78);
      --mm-head-sub: rgba(255, 240, 247, .94);
      --mm-panel: linear-gradient(to bottom, #a8508a, #c47aa6 55%, #e7a6c6);
      --mm-veil: rgba(168, 80, 138, .94);
      --mm-frame: #5a2c4f;
      --mm-glass: rgba(255, 240, 247, .26);
      --mm-glass-hi: rgba(255, 240, 247, .42);
      --mm-glass-on: rgba(255, 240, 247, .5);
      --mm-edge: rgba(255, 228, 240, .55);
      --mm-line: rgba(255, 228, 240, .4);
      --mm-shade: 0 2px 6px rgba(90, 44, 79, .08);
      --mm-shade-hi: 0 .75em 1.5em -.6em rgba(90, 44, 79, .34);
      --mm-track-shade: inset 0 2px 4px rgba(90, 44, 79, .3);
      --mm-on: linear-gradient(180deg, #ff9fcb, #ff7fb8);
      --mm-on-edge: #c94f8c;
      --mm-on-ring: rgba(255, 127, 184, .8);
      --mm-bar: linear-gradient(180deg, rgba(255, 240, 247, .78), rgba(251, 227, 238, .86));
      --mm-bar-shade: inset 0 1px 0 rgba(255, 255, 255, .6), 0 8px 22px rgba(90, 44, 79, .14);
      --mm-btn: rgba(255, 245, 250, .78);
      --mm-kbd: rgba(255, 245, 250, .9);
      --mm-toast: rgba(255, 240, 247, .97);
      --mm-toast-shade: 0 .75em 2em rgba(60, 20, 50, .35);
      --mm-err: #9b1c3c;
      --mm-backdrop: rgba(37, 27, 45, .55);
      --mm-lift: 0 1.6em 3.8em rgba(40, 14, 34, .5), 0 .4em 1em rgba(40, 14, 34, .18);
      --mm-title-shade: .15em .15em 0 rgba(162, 77, 128, .9);
    }
    /* Blossom V4: black glass over its cherry blossom art, pink for what's on. */
    :host([data-skin="blossom-v4"]) {
      --mm-ink: #fff;
      --mm-sub: rgba(255, 255, 255, .7);
      --mm-head-sub: rgba(254, 197, 229, .92);
      --mm-panel: linear-gradient(rgba(12, 7, 10, .8), rgba(12, 7, 10, .9)), var(--bv-art, none) center / cover, #0c070a;
      --mm-veil: rgba(12, 7, 10, .92);
      --mm-frame: var(--bv-pink, #f9b5b5);
      --mm-sheen: rgba(255, 220, 235, .14);
      --mm-glass: rgba(0, 0, 0, .44);
      --mm-glass-hi: rgba(36, 14, 24, .62);
      --mm-glass-on: rgba(91, 23, 48, .5);
      --mm-edge: rgba(249, 181, 181, .24);
      --mm-edge-hi: rgba(249, 181, 181, .6);
      --mm-line: rgba(249, 181, 181, .28);
      --mm-lip: inset 0 1px 0 rgba(255, 220, 235, .07);
      --mm-shade: 0 0 transparent;
      --mm-shade-hi: 0 .75em 1.5em -.6em rgba(0, 0, 0, .6);
      --mm-track: rgba(255, 255, 255, .16);
      --mm-track-shade: inset 0 2px 4px rgba(0, 0, 0, .45);
      --mm-on: linear-gradient(180deg, #ffbfd8, #f594b5);
      --mm-on-edge: #f9b5b5;
      --mm-on-ring: rgba(249, 181, 181, .7);
      --mm-bar: rgba(0, 0, 0, .5);
      --mm-bar-shade: inset 0 1px 0 rgba(255, 220, 235, .07);
      --mm-btn: rgba(255, 255, 255, .08);
      --mm-btn-hi: rgba(249, 181, 181, .16);
      --mm-kbd: rgba(255, 255, 255, .1);
      --mm-toast: rgba(14, 8, 11, .96);
      --mm-toast-shade: 0 .75em 2em rgba(0, 0, 0, .55);
      --mm-err: #ff9bb0;
      --mm-focus: var(--bv-pink-light, #fec5e5);
      --mm-close-hi: rgba(249, 181, 181, .14);
      --mm-backdrop: rgba(0, 0, 0, .55);
      --mm-lift: 0 1.6em 4.5em rgba(0, 0, 0, .65);
      --mm-title-shade: .1em .1em 0 rgba(0, 0, 0, .85);
    }
    /* Fuji Dark: Blossom V4's look in Fuji colours, gray glass over its photo with blue for what's on. */
    :host([data-skin="fuji-dark"]) {
      --mm-ink: #eef3f8;
      --mm-sub: rgba(238, 243, 248, .72);
      --mm-head: #eef3f8;
      --mm-head-sub: rgba(188, 215, 242, .92);
      --mm-panel: linear-gradient(rgba(11, 13, 16, .78), rgba(11, 13, 16, .9)), var(--fk-art, none) center / cover, #0e1013;
      --mm-veil: rgba(11, 13, 16, .92);
      --mm-frame: var(--fk-blue, #8fb8e0);
      --mm-sheen: rgba(225, 238, 255, .14);
      --mm-glass: rgba(0, 0, 0, .44);
      --mm-glass-hi: rgba(32, 36, 41, .62);
      --mm-glass-on: rgba(36, 66, 100, .45);
      --mm-edge: rgba(201, 206, 212, .22);
      --mm-edge-hi: rgba(143, 184, 224, .6);
      --mm-line: rgba(201, 206, 212, .24);
      --mm-lip: inset 0 1px 0 rgba(225, 238, 255, .07);
      --mm-shade: 0 0 transparent;
      --mm-shade-hi: 0 .75em 1.5em -.6em rgba(0, 0, 0, .6);
      --mm-track: rgba(255, 255, 255, .16);
      --mm-track-shade: inset 0 2px 4px rgba(0, 0, 0, .45);
      --mm-on: linear-gradient(180deg, #bcd7f2, #7fadd9);
      --mm-on-edge: #8fb8e0;
      --mm-on-ring: rgba(143, 184, 224, .7);
      --mm-bar: rgba(0, 0, 0, .5);
      --mm-bar-shade: inset 0 1px 0 rgba(225, 238, 255, .07);
      --mm-btn: rgba(255, 255, 255, .08);
      --mm-btn-hi: rgba(143, 184, 224, .16);
      --mm-kbd: rgba(255, 255, 255, .1);
      --mm-toast: rgba(14, 16, 19, .96);
      --mm-toast-shade: 0 .75em 2em rgba(0, 0, 0, .55);
      --mm-err: #ffb4a8;
      --mm-focus: #bcd7f2;
      --mm-close-hi: rgba(143, 184, 224, .14);
      --mm-backdrop: rgba(0, 0, 0, .55);
      --mm-lift: 0 1.6em 4.5em rgba(0, 0, 0, .65);
      --mm-title-shade: .1em .1em 0 rgba(0, 0, 0, .85);
    }
    /* Fuji Dusk paints with its own tokens, which reach in here from <html>. */
    :host([data-skin="fuji-dusk"]) {
      --mm-ink: var(--fd-text, #f4f0e7);
      --mm-sub: var(--fd-muted, #b4c1bb);
      --mm-head: var(--fd-text, #f4f0e7);
      --mm-head-sub: var(--fd-muted, #b4c1bb);
      --mm-panel: rgba(23, 34, 34, .97);
      --mm-veil: rgba(23, 34, 34, .95);
      --mm-frame: var(--fd-border, rgba(235, 232, 218, .16));
      --mm-sheen: rgba(255, 255, 241, .1);
      --mm-glass: rgba(255, 255, 255, .045);
      --mm-glass-hi: rgba(255, 255, 255, .085);
      --mm-glass-on: color-mix(in srgb, var(--fd-accent, #ddb47f) 9%, transparent);
      --mm-edge: var(--fd-border, rgba(235, 232, 218, .16));
      --mm-edge-hi: rgba(235, 232, 218, .34);
      --mm-line: var(--fd-border, rgba(235, 232, 218, .16));
      --mm-lip: inset 0 1px 0 rgba(255, 255, 241, .08);
      --mm-shade: 0 0 transparent;
      --mm-shade-hi: 0 .75em 1.5em -.6em rgba(0, 0, 0, .5);
      --mm-track: rgba(255, 255, 255, .14);
      --mm-track-shade: inset 0 2px 4px rgba(0, 0, 0, .35);
      --mm-on: var(--fd-accent, #ddb47f);
      --mm-on-edge: var(--fd-accent, #ddb47f);
      --mm-on-ring: color-mix(in srgb, var(--fd-accent, #ddb47f) 65%, transparent);
      --mm-bar: rgba(255, 255, 255, .045);
      --mm-bar-shade: none;
      --mm-btn: rgba(255, 255, 255, .08);
      --mm-btn-hi: rgba(255, 255, 255, .14);
      --mm-kbd: rgba(255, 255, 255, .08);
      --mm-toast: rgba(23, 34, 34, .96);
      --mm-toast-shade: 0 .75em 2em rgba(0, 0, 0, .5);
      --mm-err: #ffb4a8;
      --mm-focus: var(--fd-accent, #ddb47f);
      --mm-close-hi: rgba(255, 255, 255, .08);
      --mm-backdrop: rgba(10, 18, 18, .6);
      --mm-lift: 0 1.4em 4.5em rgba(0, 0, 0, .55);
      --mm-title-font: 800 1.375em/1.15 var(--mm-font);
      --mm-title-shade: none;
    }
    * { box-sizing: border-box; }
    button, textarea { font: inherit; color: inherit; }
    [hidden] { display: none !important; }

    dialog {
      padding: 0; margin: auto; border: 0; background: none; color: var(--mm-ink); overflow: visible; max-width: none; max-height: none;
      font: 700 var(--mm-size)/1.35 var(--mm-font); -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale;
    }
    dialog::backdrop { background: var(--mm-backdrop); }
    dialog[open]::backdrop { animation: mm-fade .24s ease-out; }
    dialog.out::backdrop { animation: mm-fade-out .16s ease-in both; }
    /* No backdrop blur: the game draws behind the menu every frame, so it would be worked out again every frame. */
    .panel {
      position: relative; display: flex; flex-direction: column; width: min(36em, calc(100vw - 32px)); max-height: min(48em, calc(100vh - 32px));
      padding: 1.2em 1.25em 1.1em; border: .15em solid var(--mm-frame); border-radius: .875em;
      background: var(--mm-panel); box-shadow: inset 0 1px 0 var(--mm-sheen), var(--mm-lift);
    }
    .panel:focus { outline: none; }
    dialog[open] .panel { animation: mm-in .3s var(--mm-ease) both; }
    dialog.out .panel { animation: mm-out .16s ease-in both; }
    @keyframes mm-in { from { opacity: 0; transform: translateY(.75em) scale(.98); } }
    @keyframes mm-out { to { opacity: 0; transform: translateY(.4em) scale(.98); } }
    @keyframes mm-fade { from { opacity: 0; } }
    @keyframes mm-fade-out { to { opacity: 0; } }

    header { display: flex; align-items: flex-start; gap: 1em; margin-bottom: 1em; padding-bottom: .9em; border-bottom: 1px solid var(--mm-line); }
    .titles { flex: 1; min-width: 0; }
    h2 { margin: 0; font: var(--mm-title-font); letter-spacing: .01em; color: var(--mm-head); text-shadow: var(--mm-title-shade); }
    .sub { margin: .3em 0 0; font-size: .84em; font-weight: 700; color: var(--mm-head-sub); }
    .close {
      flex: none; display: grid; place-items: center; width: 2.1em; height: 2.1em; margin: -.4em -.45em 0 0; padding: 0; border: 0; border-radius: 50%;
      background: transparent; color: var(--mm-head); cursor: pointer; transition: background-color .15s, transform .15s var(--mm-ease);
    }
    .close:hover { background-color: var(--mm-close-hi); transform: scale(1.06); }
    .close:active { transform: scale(.94); }
    .close svg { width: 1.3em; height: 1.3em; filter: drop-shadow(.08em .1em 0 rgba(0, 0, 0, .2)); }
    :host([data-skin="fuji-dusk"]) .close svg { filter: none; }

    .list {
      --ft: 0em; --fb: 0em;
      min-height: 0; overflow-y: auto; overscroll-behavior: contain; margin: 0 -.6em 0 0; padding: .15em .6em .3em 0;
      scrollbar-width: thin; scrollbar-color: color-mix(in srgb, var(--mm-ink) 35%, transparent) transparent;
    }
    /* Where there's more to scroll, the edge of the list fades out. */
    .list.more-up { --ft: 1.6em; }
    .list.more-down { --fb: 2.2em; }
    .list.more-up, .list.more-down {
      -webkit-mask-image: linear-gradient(transparent, #000 var(--ft), #000 calc(100% - var(--fb)), transparent);
      mask-image: linear-gradient(transparent, #000 var(--ft), #000 calc(100% - var(--fb)), transparent);
    }
    .group + .group { margin-top: 1.15em; }
    h3 {
      display: flex; align-items: baseline; gap: .6em; margin: 0 .15em .55em; font-size: .76em; font-weight: 900; letter-spacing: .08em;
      text-transform: uppercase; color: var(--mm-head-sub);
    }
    .count { margin-left: auto; font-weight: 800; letter-spacing: .03em; text-transform: none; opacity: .85; }
    .cards { display: grid; gap: .6em; }
    .themes { grid-template-columns: repeat(auto-fill, minmax(min(100%, 14.5em), 1fr)); }
    .themes > :last-child:nth-child(odd) { grid-column: 1 / -1; }

    .card {
      position: relative; display: grid; grid-template-columns: minmax(0, 1fr) auto auto; grid-template-areas: "name btns ctl" "desc btns ctl";
      align-items: center; row-gap: .2em; min-height: 4.1em; padding: .75em .875em;
      border: 1px solid var(--mm-edge); border-radius: .875em; background-color: var(--mm-glass); box-shadow: var(--mm-lip), var(--mm-shade);
      cursor: pointer; -webkit-user-select: none; user-select: none; -webkit-tap-highlight-color: transparent;
      transition: background-color .18s, border-color .18s, box-shadow .2s, transform .2s var(--mm-ease);
    }
    .card:hover { background-color: var(--mm-glass-hi); box-shadow: var(--mm-lip), var(--mm-shade-hi); transform: translateY(-1px); }
    .card:active:not(:has(.btn:active)) { transform: scale(.99); transition-duration: .08s; }
    .card:has(input:checked) { background-color: var(--mm-glass-on); border-color: var(--mm-on-ring); }
    .card.fixed { cursor: default; }
    .card.fixed:hover, .card.fixed:active { transform: none; }
    .card.has-cmds { grid-template-areas: "name btns ctl" "desc btns ctl" "cmds cmds cmds"; }
    .themes .card { grid-template-columns: minmax(0, 1fr) auto; grid-template-areas: "name ctl" "desc ctl"; }
    .themes .card.has-btns { grid-template-areas: "name ctl" "desc ctl" "btns btns"; }
    .themes .card.has-cmds { grid-template-areas: "name ctl" "desc ctl" "cmds cmds"; }
    .themes .card.has-btns.has-cmds { grid-template-areas: "name ctl" "desc ctl" "btns btns" "cmds cmds"; }
    .name { grid-area: name; align-self: end; min-width: 0; font-size: 1.03em; font-weight: 800; line-height: 1.25; overflow-wrap: anywhere; }
    .ver { margin-left: .45em; font-size: .78em; font-weight: 700; color: var(--mm-sub); }
    .desc {
      grid-area: desc; align-self: start; min-width: 0; font-size: .78em; font-weight: 600; line-height: 1.35; color: var(--mm-sub);
      display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 3; overflow: hidden;
    }
    .desc.err { color: var(--mm-err); -webkit-line-clamp: 6; }
    .btns { grid-area: btns; display: flex; flex-wrap: wrap; align-items: center; justify-content: flex-end; gap: .45em; margin-left: .75em; }
    .btns:empty { display: none; }
    .themes .btns { justify-content: flex-start; margin: .5em 0 0; }
    .ctl { grid-area: ctl; display: flex; align-items: center; margin-left: .875em; }
    .cmds { grid-area: cmds; display: flex; flex-wrap: wrap; gap: .45em; margin-top: .5em; padding-top: .6em; border-top: 1px solid var(--mm-line); }
    input { position: absolute; width: 1px; height: 1px; margin: 0; opacity: 0; pointer-events: none; }

    .switch, .radio { flex: none; position: relative; background-color: var(--mm-track); box-shadow: var(--mm-track-shade); }
    .switch { width: 2.875em; height: 1.625em; border-radius: 999px; }
    .radio { width: 1.5em; height: 1.5em; border-radius: 50%; }
    /* The "on" fill fades in over the track, so the colour change is as smooth as the knob. */
    .switch::before, .radio::before {
      content: ""; position: absolute; inset: 0; border-radius: inherit; background: var(--mm-on);
      box-shadow: inset 0 1px 2px rgba(0, 0, 0, .15), 0 0 0 1px var(--mm-on-edge); opacity: 0; transition: opacity .2s;
    }
    .switch::after, .radio::after { content: ""; position: absolute; border-radius: 50%; background: var(--mm-knob); box-shadow: 0 2px 5px rgba(0, 0, 0, .25); }
    .switch::after { top: .1875em; left: .1875em; width: 1.25em; height: 1.25em; transition: transform .28s var(--mm-spring); }
    .radio::after { inset: .42em; transform: scale(0); transition: transform .24s var(--mm-spring); }
    input:checked + .switch::before, input:checked + .radio::before { opacity: 1; }
    input:checked + .switch::after { transform: translateX(1.25em); }
    input:checked + .radio::after { transform: scale(1); }
    input:focus-visible + .switch, input:focus-visible + .radio, button:focus-visible { outline: 2px solid var(--mm-focus); outline-offset: 3px; }

    .btn {
      flex: none; display: inline-flex; align-items: center; justify-content: center; gap: .45em; height: 2.2em; padding: 0 .9em;
      border: 1px solid var(--mm-edge); border-radius: .6em; background-color: var(--mm-btn); color: var(--mm-ink);
      font-size: .82em; font-weight: 900; white-space: nowrap; cursor: pointer;
      transition: background-color .15s, border-color .15s, color .15s, opacity .15s, transform .12s var(--mm-ease);
    }
    .btn:hover { background-color: var(--mm-btn-hi); border-color: var(--mm-edge-hi); }
    .btn:active { transform: translateY(1px); }
    .btn:disabled { opacity: .55; cursor: default; transform: none; }
    .btn.quiet { background-color: transparent; border-color: transparent; color: var(--mm-sub); }
    .btn.quiet:hover { background-color: var(--mm-glass-hi); border-color: var(--mm-edge); color: var(--mm-ink); }
    .btn.danger, .btn.danger:hover { background-color: var(--mm-btn); border-color: currentColor; color: var(--mm-err); }
    .btn.cmd { height: 2em; padding: 0 .8em; font-size: .76em; }

    .empty {
      display: grid; justify-items: center; gap: .9em; padding: 1.8em 1.2em; border: 1px dashed var(--mm-edge); border-radius: .875em;
      text-align: center; font-size: .9em; color: var(--mm-head-sub);
    }
    .empty p { margin: 0; max-width: 26em; }

    .add { min-height: 0; overflow-y: auto; }
    .addbox {
      display: grid; gap: .75em; padding: .875em; border: 1px solid var(--mm-edge); border-radius: .875em;
      background-color: var(--mm-glass); box-shadow: var(--mm-lip), var(--mm-shade);
    }
    .addnote, .addmsg { margin: 0; font-size: .84em; line-height: 1.4; }
    .addnote { font-weight: 700; color: var(--mm-sub); }
    .addmsg { font-weight: 800; }
    .addmsg:empty { display: none; }
    .addmsg.warn { color: var(--mm-err); }
    textarea {
      display: block; width: 100%; min-height: 10em; max-height: 24em; resize: vertical; margin: 0; padding: .7em .8em;
      border: 1px solid var(--mm-edge); border-radius: .6em; outline: none; background-color: var(--mm-btn); color: var(--mm-ink);
      font: 600 .8em/1.45 ui-monospace, Consolas, monospace; scrollbar-width: thin; transition: border-color .15s, box-shadow .15s, opacity .15s;
    }
    textarea::placeholder { color: var(--mm-sub); opacity: 1; }
    textarea:focus { border-color: var(--mm-edge-hi); box-shadow: 0 0 0 3px color-mix(in srgb, var(--mm-focus) 22%, transparent); }
    textarea[aria-invalid="true"] { border-color: var(--mm-err); }
    textarea:read-only { opacity: .65; }
    .addbar { display: flex; align-items: center; gap: .6em; }
    .grow { flex: 1; }
    .go { min-width: 5.5em; }
    .go.busy::before {
      content: ""; flex: none; width: .95em; height: .95em; border-radius: 50%; border: .17em solid currentColor; border-right-color: transparent;
      animation: mm-spin .7s linear infinite;
    }
    @keyframes mm-spin { to { transform: rotate(1turn); } }
    .drop {
      position: absolute; inset: .45em; z-index: 2; display: grid; place-items: center; padding: 1em;
      border: 2px dashed var(--mm-edge-hi); border-radius: .7em; background: var(--mm-veil); color: var(--mm-head);
      font-size: 1.05em; font-weight: 900; text-align: center; opacity: 0; visibility: hidden; pointer-events: none;
      transition: opacity .15s, visibility .15s;
    }
    .panel.dropping .drop { opacity: 1; visibility: visible; }

    footer {
      display: flex; align-items: center; gap: .6em; margin-top: 1em; padding: .5em .5em .5em .875em;
      border: 1px solid var(--mm-edge); border-radius: 1em; background: var(--mm-bar); box-shadow: var(--mm-bar-shade);
      font-size: .875em; font-weight: 900;
    }
    .mmver { flex: none; }
    .hint { flex: 1; min-width: 0; font-size: .9em; font-weight: 700; color: var(--mm-sub); }
    .hint.warn { color: var(--mm-err); }
    .addbtn[aria-expanded="true"] { background-color: var(--mm-glass-on); border-color: var(--mm-edge-hi); }
    .key { padding-right: .35em; }
    kbd {
      display: inline-grid; place-items: center; min-width: 1.75em; height: 1.6em; padding: 0 .4em; border-radius: .35em;
      border: 1px solid color-mix(in srgb, var(--mm-ink) 30%, transparent); border-bottom-width: 2px; background: var(--mm-kbd);
      font: 900 1.05em/1 var(--mm-font); color: var(--mm-ink);
    }
    /* A one-character symbol key gets a typewriter face. \` and ' sit so high and small in any font that they're drawn
       as a stroke in the middle of the key instead; the character itself stays there for screen readers. */
    kbd { position: relative; }
    kbd span { display: inline-block; font: 700 1.2em/1 ui-monospace, Consolas, monospace; }
    kbd.mark::before { content: ""; width: .13em; height: .55em; border-radius: .1em; background: currentColor; }
    kbd.grave::before { transform: rotate(-38deg); }
    kbd.mark span { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); white-space: nowrap; }
    .key.listening { border-color: var(--mm-on-edge); background-color: var(--mm-glass-on); }
    .key.listening kbd { color: var(--mm-on-edge); animation: mm-blink 1s ease-in-out infinite; }
    @keyframes mm-blink { 50% { opacity: .35; } }

    .toast {
      position: fixed; inset: 1.2em auto auto 50%; transform: translateX(-50%); margin: 0; display: none;
      max-width: min(30em, calc(100vw - 32px)); padding: .75em 1.15em; border: 1px solid var(--mm-edge); border-radius: .9em;
      background: var(--mm-toast); color: var(--mm-ink); font: 800 var(--mm-size)/1.35 var(--mm-font);
      box-shadow: var(--mm-toast-shade); overflow: visible; -webkit-font-smoothing: antialiased;
    }
    .toast.show { display: block; animation: mm-toast-in .32s var(--mm-ease) both; }
    .toast.hide { animation: mm-toast-out .2s ease-in both; }
    @keyframes mm-toast-in { from { opacity: 0; transform: translate(-50%, -.7em) scale(.97); } }
    @keyframes mm-toast-out { to { opacity: 0; transform: translate(-50%, -.5em) scale(.97); } }
    .probe { display: none; color: color-mix(in srgb, var(--mm-ink), transparent 0%); }
    @media (prefers-reduced-motion: reduce) {
      *, *::before, *::after, dialog::backdrop { transition: none !important; animation: none !important; }
    }
  `;

  let host, shadow, dialog, panel, listEl, themeGroup, modGroup, themeBox, modBox, countEl, emptyEl, keyBtn, keyCap, hintEl, toastEl, probe;
  let addView, addBtn, codeBox, addMsg, goBtn, pickBtn, launcher, toastTimer = 0, closing = 0, listening = false;
  let adding = false, busy = false, removing = null, inputs = 0, dragDepth = 0;
  const motion = window.matchMedia?.("(prefers-reduced-motion: reduce)");
  const calm = () => !!motion?.matches;

  function buildUi() {
    if (host || !document.body) return !!host;
    if (current !== MENU) return within(MENU, buildUi, null, []);
    host = document.createElement("div");
    host.id = "ss-mod-menu";
    shadow = host.attachShadow({ mode: "open" });
    shadow.innerHTML = `<style>${CSS}</style>
      <dialog aria-labelledby="mm-title" aria-describedby="mm-sub">
        <div class="panel" tabindex="-1" autofocus>
          <header>
            <div class="titles">
              <h2 id="mm-title">Mod Menu</h2>
              <p class="sub" id="mm-sub">Switch themes and turn mods on or off. No reload needed.</p>
            </div>
            <button type="button" class="close" data-sound="" aria-label="Close" title="Close (Esc)"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.6" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg></button>
          </header>
          <div class="list">
            <section class="group" hidden>
              <h3 id="mm-themes">Theme</h3>
              <div class="cards themes" role="radiogroup" aria-labelledby="mm-themes"></div>
            </section>
            <section class="group" hidden>
              <h3><span id="mm-mods">Mods</span><span class="count"></span></h3>
              <div class="cards mods" role="group" aria-labelledby="mm-mods"></div>
            </section>
            <div class="empty" hidden>
              <p>No mods yet. Add a script, or install a theme or a mod that works with the Mod Menu.</p>
              <button type="button" class="btn" data-add data-sound="ui_toggletab">Add a script</button>
            </div>
          </div>
          <section class="add" hidden>
            <h3 id="mm-add-title">Add a script</h3>
            <div class="addbox">
              <p class="addnote">Paste a link to a .user.js file (raw GitHub, a GitHub file page or Greasy Fork), or the whole script. You can also drop the file here.</p>
              <textarea spellcheck="false" autocomplete="off" placeholder="https://…/my-script.user.js" aria-labelledby="mm-add-title"></textarea>
              <p class="addmsg" role="status"></p>
              <div class="addbar">
                <button type="button" class="btn pick">Choose file</button>
                <span class="grow"></span>
                <button type="button" class="btn quiet cancel" data-sound="ui_toggletab">Cancel</button>
                <button type="button" class="btn go" data-sound="" title="Ctrl+Enter">Add</button>
              </div>
            </div>
            <input type="file" accept=".js,text/javascript,application/javascript" hidden>
          </section>
          <footer>
            <span class="mmver">Mod Menu v${VERSION}</span>
            <span class="hint" role="status"></span>
            <button type="button" class="btn addbtn" data-sound="ui_toggletab" aria-expanded="false">Add script</button>
            <button type="button" class="btn key" title="Change the key that opens this menu">Hotkey <kbd></kbd></button>
          </footer>
          <div class="drop" aria-hidden="true">Drop the script to add it</div>
        </div>
      </dialog>
      <div class="toast" popover="manual" role="status"></div>
      <i class="probe"></i>`;
    const q = s => shadow.querySelector(s);
    dialog = q("dialog");
    panel = q(".panel");
    listEl = q(".list");
    [themeGroup, modGroup] = shadow.querySelectorAll(".group");
    themeBox = q(".themes");
    modBox = q(".mods");
    countEl = q(".count");
    emptyEl = q(".empty");
    keyBtn = q(".key");
    keyCap = keyBtn.querySelector("kbd");
    hintEl = q(".hint");
    toastEl = q(".toast");
    probe = q(".probe");
    addView = q(".add");
    addBtn = q(".addbtn");
    codeBox = q("textarea");
    addMsg = q(".addmsg");
    goBtn = q(".go");
    pickBtn = q(".pick");
    const fileIn = q("input[type=file]");

    // Keys pressed inside the open menu stay out of the game. Once it closes, they reach the game,
    // even while the browser hasn't moved focus out of the menu yet.
    for (const type of ["keydown", "keyup", "keypress"]) host.addEventListener(type, e => { if (dialog.open) e.stopPropagation(); });
    // Every button in the menu clicks, keyboard presses included. One with a sound of its own names it in
    // data-sound; an empty one leaves it to what the button does (closing, adding).
    shadow.addEventListener("click", e => {
      const b = e.target.closest?.("button"), s = b && (b.dataset.sound ?? "ui_click");
      if (s && !b.disabled) sound(s);
    });
    q(".close").addEventListener("click", () => close());
    // A click outside the panel lands on the dialog itself (its backdrop). One that started inside the panel,
    // like selecting text in the Add box and letting go outside, doesn't close it.
    let downOutside = false;
    dialog.addEventListener("pointerdown", e => { downOutside = e.target === dialog; });
    dialog.addEventListener("click", e => { if (e.target === dialog && downOutside) close(); });
    dialog.addEventListener("cancel", e => {
      e.preventDefault();
      back();
    });
    dialog.addEventListener("close", () => {
      clearTimeout(closing);
      closing = 0;
      dialog.classList.remove("out");
      stopListening();
      if (!busy) showAdd(false);
    });
    keyBtn.addEventListener("click", () => listening ? stopListening() : startListening());
    listEl.addEventListener("change", e => {
      const t = e.target;
      sound("ui_onchange");
      if (t.name === "mm-theme") morph(() => setTheme(t.value));
      else if (t.dataset.id) setEnabled(t.dataset.id, t.checked);
    });
    listEl.addEventListener("click", e => {
      const b = e.target.closest?.("button");
      if (!b) return;
      e.preventDefault();
      const d = b.dataset;
      if ("add" in d) return showAdd(true);
      const m = mods.get(d.settings || d.reload || d.remove || d.of);
      if (!m) return;
      if (d.reload) return location.reload();
      if (d.remove) return removeClicked(m);
      // A mod's settings or command opens over the game, so the menu gets out of the way at once.
      close(true);
      if (d.cmd) return runCommand(m, d.cmd);
      let opened = false;
      const s = settingsOf(m);
      try { opened = !!s && within(s === m.def ? MENU : m.run, s.openSettings, s, []) !== false; } catch (err) { console.warn("[Mod Menu]", m.name, err); }
      if (!opened) toast(`${m.name} settings open from the home screen.`);
    });
    // A description cut short shows in full on hover.
    listEl.addEventListener("pointerover", e => {
      const d = e.target.closest?.(".desc");
      if (d) d.title = d.scrollHeight > d.clientHeight + 1 ? d.textContent : "";
    });
    listEl.addEventListener("scroll", edges, { passive: true });
    new ResizeObserver(edges).observe(listEl);

    addBtn.addEventListener("click", () => showAdd(!adding));
    q(".cancel").addEventListener("click", () => showAdd(false));
    pickBtn.addEventListener("click", () => fileIn.click());
    fileIn.addEventListener("change", () => {
      const f = fileIn.files[0];
      fileIn.value = "";
      if (f) addFrom(f);
    });
    goBtn.addEventListener("click", () => addFrom(codeBox.value));
    codeBox.addEventListener("keydown", e => {
      if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) { e.preventDefault(); addFrom(codeBox.value); }
    });
    codeBox.addEventListener("input", () => {
      if (!codeBox.hasAttribute("aria-invalid")) return;
      codeBox.removeAttribute("aria-invalid");
      addNote("");
    });
    // A .user.js file dropped anywhere on the menu is added. While one is dragged over it, the menu says so.
    const files = e => !!e.dataTransfer?.types?.includes("Files");
    const dropping = on => { dragDepth = on ? dragDepth : 0; panel.classList.toggle("dropping", on); };
    panel.addEventListener("dragenter", e => { if (files(e) && !busy) { dragDepth++; dropping(true); } });
    panel.addEventListener("dragleave", e => { if (files(e) && --dragDepth <= 0) dropping(false); });
    panel.addEventListener("dragover", e => {
      if (!files(e)) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = busy ? "none" : "copy";
    });
    panel.addEventListener("drop", e => {
      dropping(false);
      const f = e.dataTransfer?.files[0];
      if (!f) return;
      e.preventDefault();
      addFrom(f);
    });
    document.body.appendChild(host);
    paint();
    return true;
  }

  const el = (tag, cls, text) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  };
  const button = (cls, text, data, title) => {
    const b = el("button", "btn" + (cls ? " " + cls : ""), text);
    b.type = "button";
    Object.assign(b.dataset, data);
    if (title) b.title = title;
    return b;
  };
  // Its own settings, or those of what an added script registered with the menu.
  const settingsOf = m => (typeof m.def?.openSettings === "function" && m.def) || (m.run?.on && m.run.defs.find(d => typeof d.openSettings === "function")) || null;
  const NONE = { id: "none", name: "Game default", version: "", description: "The game's own look, with no theme.", group: "theme" };

  // Cards are kept and changed in place, so a switch slides across instead of being drawn again. Each part is
  // only touched when what it shows has changed.
  const cardEls = new Map();
  function card(m, theme, checked) {
    const key = m === NONE ? "" : m.id, kind = m.alwaysOn ? "fixed" : theme ? "radio" : "switch";
    let k = cardEls.get(key);
    if (!k || k.kind !== kind) {
      const c = el(m.alwaysOn ? "div" : "label", "card" + (m.alwaysOn ? " fixed" : ""));
      k = { el: c, kind, sig: {}, cmds: null, input: null };
      k.name = c.appendChild(el("span", "name"));
      k.desc = c.appendChild(el("span", "desc"));
      k.btns = c.appendChild(el("span", "btns"));
      if (!m.alwaysOn) {
        const ctl = c.appendChild(el("span", "ctl")), input = k.input = ctl.appendChild(el("input"));
        if (theme) {
          input.type = "radio";
          input.name = "mm-theme";
          input.value = m.id;
        } else {
          input.type = "checkbox";
          input.setAttribute("role", "switch");
          input.dataset.id = m.id;
        }
        // Clicking the card works its switch, not the first button on it.
        input.id = "mm-in-" + ++inputs;
        c.htmlFor = input.id;
        k.desc.id = input.id + "-d";
        input.setAttribute("aria-describedby", k.desc.id);
        ctl.appendChild(el("span", theme ? "radio" : "switch"));
      }
      cardEls.set(key, k);
    }
    const c = k.el, s = k.sig, name = m.name + "\n" + m.version;
    if (s.name !== name) {
      s.name = name;
      k.name.textContent = m.name;
      if (m.version) k.name.appendChild(el("span", "ver", "v" + m.version));
      k.input?.setAttribute("aria-label", m.name);
    }
    const problem = m.error || m.warn, text = problem || m.note || m.description, desc = (problem ? "!" : "") + text;
    if (s.desc !== desc) {
      s.desc = desc;
      k.desc.textContent = text;
      k.desc.classList.toggle("err", !!problem);
    }
    const btns = [];
    if (m.reload) btns.push(["", "Reload", "reload", "Reload the game"]);
    if ((m.alwaysOn || m.active) && settingsOf(m)) btns.push(["", "Settings", "settings"]);
    if (m.script) btns.push(removing?.id === m.id ? ["danger", "Remove it?", "remove", "Click again to remove it and everything it saved", "ui_reset"] : ["quiet", "Remove", "remove"]);
    const bs = btns.join("|");
    if (s.btns !== bs) {
      s.btns = bs;
      k.btns.replaceChildren(...btns.map(([cls, label, act, title, snd]) => button(cls, label, snd ? { [act]: m.id, sound: snd } : { [act]: m.id }, title)));
      c.classList.toggle("has-btns", btns.length > 0);
    }
    // Commands the script added with GM_registerMenuCommand.
    const cmds = m.run?.on ? [...m.run.commands] : [], cs = cmds.map(([id, cmd]) => id + "\u0001" + cmd.caption).join("\u0002");
    if (s.cmds !== cs) {
      s.cmds = cs;
      k.cmds?.remove();
      k.cmds = null;
      if (cmds.length) {
        k.cmds = c.appendChild(el("span", "cmds"));
        for (const [id, cmd] of cmds) k.cmds.appendChild(button("cmd", cmd.caption, { cmd: id, of: m.id }));
      }
      c.classList.toggle("has-cmds", cmds.length > 0);
    }
    if (k.input && k.input.checked !== checked) k.input.checked = checked;
    return c;
  }
  // Which control had focus, so it can have it again if its card was drawn again.
  const focusKey = n => {
    const d = n?.dataset;
    if (!d) return "";
    if (n.name === "mm-theme") return "t:" + n.value;
    if (d.cmd) return `c:${d.of}:${d.cmd}`;
    for (const k of ["id", "settings", "reload", "remove"]) if (d[k]) return k + ":" + d[k];
    return "";
  };
  function render() {
    if (!listEl || !dialog.open) return;
    const had = focusKey(shadow.activeElement), seen = new Set();
    const all = [...mods.values()], themes = all.filter(m => m.group === "theme"), others = all.filter(m => m.group !== "theme");
    const chosen = activeTheme()?.id || "none";
    // Cards go in again only when the order changed: moving one would cut its switch's slide short.
    const fill = (box, list) => {
      const nodes = list.map(([m, theme, on]) => (seen.add(m === NONE ? "" : m.id), card(m, theme, on)));
      if (nodes.length !== box.children.length || nodes.some((n, i) => box.children[i] !== n)) box.replaceChildren(...nodes);
    };
    themeGroup.hidden = !themes.length;
    fill(themeBox, themes.length ? [[NONE, true, chosen === "none"], ...themes.map(m => [m, true, chosen === m.id])] : []);
    modGroup.hidden = !others.length;
    fill(modBox, others.map(m => [m, false, m.active]));
    const on = others.filter(m => m.active).length;
    countEl.textContent = on === others.length ? "All on" : on ? `${on} of ${others.length} on` : "All off";
    emptyEl.hidden = all.length > 0;
    for (const key of cardEls.keys()) if (!seen.has(key)) cardEls.delete(key);
    if (had && focusKey(shadow.activeElement) !== had) [...listEl.querySelectorAll("input, button")].find(n => focusKey(n) === had)?.focus({ preventScroll: true });
    edges();
  }
  // The list's edges fade where there's more to scroll.
  function edges() {
    const l = listEl, up = l.scrollTop > 1, down = l.scrollTop + l.clientHeight < l.scrollHeight - 1;
    if (l.classList.contains("more-up") !== up) l.classList.toggle("more-up", up);
    if (l.classList.contains("more-down") !== down) l.classList.toggle("more-down", down);
  }

  // The look follows the active theme. A theme added as a script, under one of the known names, gets its look too.
  const SKINS = { "cherry-blossom": /cherry[\s-]*blossom/i, "blossom-v4": /blossom[\s-]*v4/i, "fuji-dusk": /fuji[\s-]*dusk/i, "fuji-dark": /fuji[\s-]*dark/i };
  const skinOf = t => !t ? "" : Object.hasOwn(SKINS, t.id) ? t.id : (t.script && Object.keys(SKINS).find(k => SKINS[k].test(t.script.name))) || "";
  // Any other theme: the colour its text ends up with decides between the light glass and the dark.
  let toneOf = null;
  function tone(t, fresh) {
    const id = skinOf(t) ? "" : t?.id || "none";
    if (!fresh && id === toneOf) return;
    toneOf = id;
    let dark = false;
    if (id) {
      const c = getComputedStyle(probe).color, n = (c.match(/[\d.]+/g) || []).map(Number), max = c.startsWith("color(") ? 1 : 255;
      dark = n.length >= 3 && (.2126 * n[0] + .7152 * n[1] + .0722 * n[2]) / max > .6;
    }
    if (dark) host.dataset.tone = "dark";
    else delete host.dataset.tone;
  }
  // Cheap refresh after a change: the look follows the active theme, and the list is redrawn only while it shows.
  function paint() {
    if (!host) return;
    if (current !== MENU) return within(MENU, paint, null, []);
    const t = activeTheme(), skin = skinOf(t);
    if ((host.dataset.skin || "") !== skin) {
      if (skin) host.dataset.skin = skin;
      else delete host.dataset.skin;
    }
    if (dialog.open) tone(t);
    if (!listening) showKey(state.key);
    if (launcher) launcher.title = `Mod Menu (${keyLabel(state.key)})`;
    render();
  }

  function open() {
    if (!buildUi()) return;
    if (current !== MENU) return within(MENU, open, null, []);
    if (closing) { // opened again while it fades out
      clearTimeout(closing);
      closing = 0;
      dialog.classList.remove("out");
      panel.focus({ preventScroll: true });
      return;
    }
    if (dialog.open) return;
    findBetterHud();
    if (document.pointerLockElement) document.exitPointerLock();
    say("");
    dialog.showModal();
    tone(activeTheme(), true);
    paint();
    sound("ui_popupopen");
  }
  // Fades out, unless something else opens over the game right after (a mod's settings), which needs the page now.
  function close(now) {
    if (!dialog?.open || (closing && !now)) return;
    shadow.activeElement?.blur();
    stopListening();
    if (now || calm()) return dialog.close();
    dialog.classList.add("out");
    closing = setTimeout(() => {
      closing = 0;
      dialog.classList.remove("out");
      dialog.close();
    }, 160);
    sound("ui_popupclose");
  }
  function toggle() {
    dialog?.open && !closing ? close() : open();
  }
  // Esc steps back first: out of choosing a key, then out of Add a script, then out of the menu. Each sounds like
  // the button that does the same.
  function back() {
    if (listening) {
      stopListening();
      sound("ui_click");
    } else if (adding) {
      showAdd(false);
      sound("ui_toggletab");
    } else close();
  }
  // A theme picked in the menu fades the whole screen from the old look to the new one, where the browser can.
  // While it fades, the browser shows a picture of the page, so a click can't reach the menu: the fade then ends at
  // once and the click goes to what's under it. Focus stays in the menu, so Esc still works.
  let fade = null, missed = null;
  function morph(fn) {
    if (calm() || document.hidden || typeof document.startViewTransition !== "function") return fn();
    let vt;
    try { vt = document.startViewTransition(fn); } catch { return fn(); }
    vt.ready.catch(() => { /* skipped before it began */ });
    fade = vt;
    vt.finished.catch(() => { /* skipped: the theme still changed */ }).finally(() => {
      if (fade !== vt) return;
      fade = null;
      if (dialog.open && !shadow.activeElement) panel.focus({ preventScroll: true });
    });
  }
  window.addEventListener("pointerdown", e => {
    missed = null;
    if (!fade || !dialog?.open) return;
    missed = { x: e.clientX, y: e.clientY };
    e.preventDefault();
    fade.skipTransition();
  }, true);
  window.addEventListener("click", e => {
    if (!missed) return;
    const at = missed;
    missed = null;
    if (e.target !== document.documentElement && e.target !== document.body) return; // it reached the menu after all
    e.preventDefault();
    e.stopImmediatePropagation();
    requestAnimationFrame(() => {
      const n = dialog.open && shadow.elementFromPoint(at.x, at.y);
      if (n === dialog) close();
      else if (n && dialog.contains(n)) (n.closest("button") || n).click?.(); // the close button's icon can't be clicked itself
    });
  }, true);
  const reveal = n => {
    if (!calm()) n.animate?.([{ opacity: 0, transform: "translateY(.4em)" }, { opacity: 1, transform: "none" }], { duration: 220, easing: "cubic-bezier(.2, .8, .2, 1)" });
  };

  function toast(text, ms = 4200) {
    if (!buildUi()) return;
    if (current !== MENU) return within(MENU, toast, null, [text, ms]);
    tone(activeTheme());
    clearTimeout(toastTimer);
    toastEl.textContent = text;
    // A new message slides in again, even over one still showing.
    if (toastEl.classList.contains("show")) {
      toastEl.classList.remove("show", "hide");
      void toastEl.offsetWidth;
    }
    toastEl.classList.add("show");
    // Shown again so it's above a menu opened since.
    try { if (toastEl.matches(":popover-open")) toastEl.hidePopover(); toastEl.showPopover(); } catch { /* no popover support: it shows as a fixed box */ }
    toastTimer = setTimeout(() => {
      toastEl.classList.add("hide");
      toastTimer = setTimeout(() => {
        toastEl.classList.remove("show", "hide");
        try { toastEl.hidePopover(); } catch { /* already hidden */ }
      }, calm() ? 0 : 200);
    }, ms);
  }

  /* ---- Adding and removing scripts ---- */
  function showAdd(on) {
    const was = adding;
    adding = on;
    addView.hidden = !on;
    listEl.hidden = on;
    addBtn.setAttribute("aria-expanded", on);
    if (on) {
      if (!busy) {
        addNote("");
        codeBox.removeAttribute("aria-invalid");
      }
      codeBox.focus();
    } else {
      render();
      if (addView.contains(shadow.activeElement)) addBtn.focus();
    }
    if (was !== on && dialog.open) reveal(on ? addView : listEl);
  }
  function addNote(text, warn = false) {
    addMsg.textContent = text;
    addMsg.classList.toggle("warn", warn);
  }
  function setBusy(on) {
    busy = on;
    goBtn.disabled = pickBtn.disabled = on;
    goBtn.classList.toggle("busy", on);
    codeBox.readOnly = on;
  }
  async function addFrom(src) {
    if (busy) return;
    setBusy(true);
    if (!adding) showAdd(true);
    codeBox.removeAttribute("aria-invalid");
    try {
      const text = typeof src === "string" ? src : await src.text(), link = typeof src === "string" && /^\s*https?:\/\/\S+\s*$/i.test(text);
      addNote(typeof src !== "string" ? `Adding ${src.name}…` : link ? "Downloading…" : "Adding…");
      // Code or a file is added at once and only its result sounds. A download takes a moment, so it clicks first.
      if (link) sound("ui_click");
      const m = mods.get(await addScript(text));
      codeBox.value = "";
      setBusy(false);
      showAdd(false);
      toast(m.error || m.warn ? `Added ${m.name}, but it ran into a problem. Its card says what.`
        : `Added ${m.name}. If Tampermonkey runs it too, turn it off there so it doesn't run twice.`, 7000);
      sound("ui_playconfirm");
    } catch (err) {
      addNote((err && err.message) || String(err), true);
      codeBox.setAttribute("aria-invalid", "true");
      sound("ui_reset");
    } finally {
      setBusy(false);
    }
  }
  // Remove asks once more: a second click within 4 seconds removes the script and everything it saved.
  function removeClicked(m) {
    if (removing?.id === m.id) {
      clearTimeout(removing.timer);
      removing = null;
      removeScript(m.id);
      panel.focus();
      toast(`Removed ${m.name}.`);
      return;
    }
    if (removing) clearTimeout(removing.timer);
    removing = { id: m.id, timer: setTimeout(() => { removing = null; render(); }, 4000) };
    render();
  }
  function runCommand(m, key) {
    const cmd = m.run?.on && m.run.commands.get(key);
    if (!cmd) return;
    try {
      within(m.run, cmd.fn, null, []);
    } catch (err) {
      console.error("[Mod Menu]", m.name, err);
      toast(`${m.name}: ${(err && err.message) || err}`);
    }
  }

  /* ---- Hotkey ---- */
  const KEY_NAMES = {
    Backquote: "`", Backslash: "\\", BracketLeft: "[", BracketRight: "]", Semicolon: ";", Quote: "'", Comma: ",", Period: ".", Slash: "/",
    Minus: "-", Equal: "=", ShiftLeft: "Left Shift", ShiftRight: "Right Shift", ControlLeft: "Left Ctrl", ControlRight: "Right Ctrl",
    AltLeft: "Left Alt", AltRight: "Right Alt", ArrowUp: "↑", ArrowDown: "↓", ArrowLeft: "←", ArrowRight: "→", IntlBackslash: "\\",
  };
  const keyLabel = code => KEY_NAMES[code] || code.replace(/^Key|^Digit/, "").replace(/^Numpad/, "Num ");
  function showKey(code) {
    const label = keyLabel(code), symbol = label.length === 1 && !/[\p{L}\p{N}]/u.test(label);
    keyCap.className = label === "`" ? "mark grave" : label === "'" ? "mark" : "";
    keyCap.replaceChildren(symbol ? el("span", null, label) : label);
  }
  const REFUSED = new Set(["Escape", "Tab", "Enter", "Space", "MetaLeft", "MetaRight", "ContextMenu", "CapsLock", "NumpadEnter"]);
  function gameKeyUsing(code) {
    try {
      const game = window.vueApp.$data.settingsUi.settings.controls.keyboard.game;
      const hit = Object.entries(game).find(([, v]) => v && v.code === code);
      return hit ? hit[0].replace(/_/g, " ") : "";
    } catch { return ""; }
  }
  function say(text, warn = false) {
    hintEl.textContent = text;
    hintEl.classList.toggle("warn", warn);
  }
  function startListening() {
    listening = true;
    keyBtn.classList.add("listening");
    keyCap.className = "";
    keyCap.textContent = "…";
    say("Press a key for the menu. Esc cancels.");
  }
  function stopListening() {
    if (!listening) return;
    listening = false;
    keyBtn.classList.remove("listening");
    showKey(state.key);
    if (!hintEl.classList.contains("warn")) say("");
  }
  const typingIn = t => !!t && (t.isContentEditable || t.tagName === "TEXTAREA" || t.tagName === "SELECT" ||
    (t.tagName === "INPUT" && !/^(checkbox|radio|button|range|color|submit|reset)$/i.test(t.type)));

  window.addEventListener("keydown", e => {
    if (listening) {
      e.preventDefault();
      e.stopImmediatePropagation();
      if (e.code === "Escape") {
        stopListening();
        sound("ui_click");
        return say("");
      }
      // A key that can't be used sounds like the game's own refusals, once per press.
      const refuse = text => {
        if (!e.repeat) sound("ui_reset");
        say(text, true);
      };
      if (REFUSED.has(e.code) || !e.code) return refuse(`${e.key === " " ? "Space" : e.key || "That key"} can't open the menu. Pick another key.`);
      const used = gameKeyUsing(e.code);
      if (used) return refuse(`${keyLabel(e.code)} is the game's ${used} key. Pick another key.`);
      state.key = e.code;
      save();
      stopListening();
      say(`The menu now opens with ${keyLabel(e.code)}.`);
      sound("ui_onchange");
      paint();
      return;
    }
    // While the menu is open it owns Esc, so an overlay underneath (a mod's guide, the game's pause menu) doesn't
    // take it first. This listener is added as the page starts, ahead of the ones mods add later.
    if (e.key === "Escape" && dialog?.open && !closing && !e.isComposing) {
      e.preventDefault();
      e.stopImmediatePropagation();
      if (!e.repeat) back();
      return;
    }
    if (e.code !== state.key || e.repeat || e.ctrlKey || e.altKey || e.metaKey || typingIn(e.composedPath()[0])) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    toggle();
  }, true);

  /* ---- Launcher: a button beside the game's Settings and Fullscreen buttons ---- */
  // The game rebuilds its top bar on some screen changes. The bar and what holds it are watched for their own
  // children only, so the button is back at once and the game's other updates never wake this up.
  const barWatch = new NativeMO(() => placeLauncher());
  function placeLauncher() {
    const row = byId("corner-buttons");
    if (!row || (launcher && launcher.parentNode === row)) return;
    if (current !== MENU) return within(MENU, placeLauncher, null, []);
    const gear = row.querySelector(".fa-cog")?.closest("button");
    if (!launcher) {
      launcher = el("button");
      launcher.id = "ssmm-launch";
      launcher.type = "button";
      launcher.className = gear?.className || "ss_button btn_blue bevel_blue box_relative pause-screen-ui btn-account-w-icon text-shadow-none text_blue1";
      launcher.innerHTML = '<i class="fas fa-puzzle-piece"></i>';
      launcher.setAttribute("aria-label", "Mod Menu");
      launcher.addEventListener("click", e => { e.stopPropagation(); open(); });
    }
    launcher.title = `Mod Menu (${keyLabel(state.key)})`;
    row.insertBefore(launcher, gear || row.lastElementChild);
    barWatch.disconnect();
    for (let n = row; n && n !== document.body; n = n.parentNode) barWatch.observe(n, { childList: true });
    if (!state.hinted) {
      state.hinted = true;
      save();
      setTimeout(() => toast(`Mod Menu is ready. Press ${keyLabel(state.key)} or the puzzle button to open it.`), 1200);
    }
  }

  /* ---- Start ---- */
  // Page rules for the things the themes add outside their stylesheets.
  const pageCss = el("style");
  pageCss.id = "ssmm-page-style";
  pageCss.textContent = `
    html.ssmm-off-cherry-blossom #ss-sakura-petals, html.ssmm-off-fuji-dusk #fuji-dusk-controls { display: none !important; }
    #ssmm-launch > i { pointer-events: none; }
  `;
  const start = () => {
    root().appendChild(pageCss);
    // Added scripts first, so one set to run at document-start runs before the game does.
    for (const s of scripts) register(scriptDef(s));
    queued.forEach(register);
    scan();
  };
  if (document.documentElement) start();
  else new MutationObserver((_, o) => { if (document.documentElement) { o.disconnect(); start(); } }).observe(document, { childList: true });
  // The themes add themselves at start-up; stop looking a minute after the page has loaded.
  window.addEventListener("load", () => setTimeout(() => watcher.disconnect(), 60000), { once: true });

  const boot = () => {
    // Scripts set to run later than document-start run once the page is parsed.
    runPending();
    booted = true;
    buildUi();
    findBetterHud();
    placeLauncher();
    // In case the whole top bar is replaced somewhere the watch above can't see.
    setInterval(placeLauncher, 2000);
  };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot, { once: true });
  else boot();
})();
