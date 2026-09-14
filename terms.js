/**
 * METU Portal – OIBS term configuration shared by the pages.
 * Reads data/terms.json (written by scripts/check_semester.py --write).
 *
 *   METU_TERMS_load()            -> Promise<{ current: "20261", available: ["20261", "20252", ...] }>
 *   METU_TERMS_label(code, lang) -> "2026-2027 Fall" / "2026-2027 Güz"
 *   METU_TERMS_FALLBACK          -> term used when data/terms.json is missing
 */
(function (global) {
  "use strict";

  var FALLBACK_TERM = "20261";
  var TERM_RE = /^\d{5}$/;
  var loadPromise = null;

  function normalize(data) {
    var available = (data && Array.isArray(data.available) ? data.available : [])
      .map(String)
      .filter(function (t) { return TERM_RE.test(t); });
    var current = data && TERM_RE.test(String(data.current)) ? String(data.current) : (available[0] || FALLBACK_TERM);
    if (available.indexOf(current) === -1) available.push(current);
    available.sort().reverse();
    return { current: current, available: available };
  }

  function load() {
    if (!loadPromise) {
      loadPromise = fetch("data/terms.json", { cache: "no-cache" })
        .then(function (r) { return r.ok ? r.json() : null; })
        .catch(function () { return null; })
        .then(normalize);
    }
    return loadPromise;
  }

  function label(code, lang) {
    code = String(code || "");
    if (!TERM_RE.test(code)) return code;
    var year = parseInt(code.slice(0, 4), 10);
    var names = lang === "tr"
      ? { "1": "Güz", "2": "Bahar", "3": "Yaz" }
      : { "1": "Fall", "2": "Spring", "3": "Summer" };
    return year + "-" + (year + 1) + " " + (names[code.slice(-1)] || code.slice(-1));
  }

  global.METU_TERMS_load = load;
  global.METU_TERMS_label = label;
  global.METU_TERMS_FALLBACK = FALLBACK_TERM;
})(typeof window !== "undefined" ? window : this);
