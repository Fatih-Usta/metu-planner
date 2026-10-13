/*
 * Shared page chrome: theme toggle, language picker, mobile drawer and the contact dialog.
 * Every page used to carry its own copy of this; they only ever differed in which function
 * re-renders the page after a language or theme change.
 *
 *   var chrome = METU_CHROME.init({ applyLanguage: applyLanguage });
 *
 * applyLanguage(lang) is the page's own translator. It runs on language changes and on theme
 * changes too, because each page sets its #themeLabel / #mobileThemeLabel text in there.
 *
 * Expected ids (all optional): themeToggle, themeLabel, mobileThemeLabel, langSelect, langButton,
 * langButtonLabel, langList, langCombo, mobileLangTr, mobileLangEn, mobileMenuBtn,
 * mobileDrawerOverlay, mobileDrawerClose, mobileThemeBtn, mobileContactBtn, envelopeBtn,
 * envelopeDialog, envelopeModalClose.
 */
(function (global) {
    "use strict";

    var LANG_LABELS = { tr: "Türkçe", en: "English" };

    function byId(id) {
        return document.getElementById(id);
    }

    function readLang() {
        try {
            return localStorage.getItem("lang") === "tr" ? "tr" : "en";
        } catch (e) {
            return "en";
        }
    }

    function readTheme() {
        return document.documentElement.getAttribute("data-theme") === "light" ? "light" : "dark";
    }

    function store(key, value) {
        try {
            localStorage.setItem(key, value);
        } catch (e) {
            /* private mode / blocked storage: the page still works, the choice just is not remembered */
        }
    }

    function init(options) {
        var opts = options || {};
        var applyLanguage = typeof opts.applyLanguage === "function" ? opts.applyLanguage : function () {};
        var root = document.documentElement;

        // The pages set the saved theme inline in <head> so there is no flash; this is the fallback.
        if (!root.getAttribute("data-theme")) {
            var saved = null;
            try {
                saved = localStorage.getItem("theme");
            } catch (e) { /* ignore */ }
            root.setAttribute("data-theme", saved === "light" || saved === "dark" ? saved : (opts.defaultTheme || "light"));
        }

        var langList = byId("langList");
        var langButton = byId("langButton");
        var langSelect = byId("langSelect");
        var mobileLangTr = byId("mobileLangTr");
        var mobileLangEn = byId("mobileLangEn");
        var envelopeDialog = byId("envelopeDialog");
        var mobileDrawerOverlay = byId("mobileDrawerOverlay");
        var mobileMenuBtn = byId("mobileMenuBtn");

        function closeLangList() {
            if (langList) langList.classList.remove("is-open");
            if (langButton) langButton.setAttribute("aria-expanded", "false");
        }

        function markLangPills(lang) {
            if (mobileLangTr) mobileLangTr.classList.toggle("is-active", lang === "tr");
            if (mobileLangEn) mobileLangEn.classList.toggle("is-active", lang !== "tr");
        }

        function setLanguage(langRaw) {
            var lang = langRaw === "tr" ? "tr" : "en";
            store("lang", lang);
            root.lang = lang;
            if (langSelect) langSelect.value = lang;
            var label = byId("langButtonLabel");
            if (label) label.textContent = LANG_LABELS[lang];
            markLangPills(lang);
            closeLangList();
            applyLanguage(lang);
        }

        function setTheme(themeRaw) {
            var theme = themeRaw === "light" ? "light" : "dark";
            root.setAttribute("data-theme", theme);
            store("theme", theme);
            // The page's own translator writes the theme labels, so re-run it.
            applyLanguage(readLang());
            if (typeof opts.onTheme === "function") opts.onTheme(theme);
        }

        function toggleTheme() {
            setTheme(readTheme() === "light" ? "dark" : "light");
        }

        function setDrawerOpen(open) {
            if (!mobileDrawerOverlay || !mobileMenuBtn) return;
            mobileDrawerOverlay.classList.toggle("is-open", !!open);
            mobileDrawerOverlay.setAttribute("aria-hidden", open ? "false" : "true");
            mobileMenuBtn.setAttribute("aria-expanded", open ? "true" : "false");
            root.style.overflow = open ? "hidden" : "";
        }

        function openContact() {
            if (envelopeDialog && typeof envelopeDialog.showModal === "function") envelopeDialog.showModal();
        }

        // ---- language picker (dropdown + the hidden select pages keep for their own code) ----
        if (langList && langButton) {
            langList.innerHTML = "";
            var codes = langSelect && langSelect.options.length
                ? Array.prototype.map.call(langSelect.options, function (o) { return o.value; })
                : ["tr", "en"];
            codes.forEach(function (code) {
                var item = document.createElement("button");
                item.type = "button";
                // Weekly styles its dropdown rows with its own class; everything else uses the shared one.
                item.className = opts.itemClass || "course-search-item";
                item.setAttribute("role", "option");
                item.textContent = LANG_LABELS[code] || code;
                item.addEventListener("click", function () { setLanguage(code); });
                langList.appendChild(item);
            });
            langButton.addEventListener("click", function () {
                var isOpen = langList.classList.contains("is-open");
                langList.classList.toggle("is-open", !isOpen);
                langButton.setAttribute("aria-expanded", !isOpen ? "true" : "false");
            });
            document.addEventListener("click", function (ev) {
                if (!langList.classList.contains("is-open")) return;
                var combo = byId("langCombo");
                var inside = langButton.contains(ev.target) || langList.contains(ev.target) || (combo && combo.contains(ev.target));
                if (!inside) closeLangList();
            });
        }
        if (langSelect) {
            langSelect.addEventListener("change", function () { setLanguage(langSelect.value); });
        }

        // ---- theme ----
        var themeToggle = byId("themeToggle");
        if (themeToggle) themeToggle.addEventListener("click", toggleTheme);
        var mobileThemeBtn = byId("mobileThemeBtn");
        if (mobileThemeBtn) mobileThemeBtn.addEventListener("click", function () {
            toggleTheme();
            setDrawerOpen(false);
        });

        // ---- mobile drawer ----
        if (mobileMenuBtn) mobileMenuBtn.addEventListener("click", function () { setDrawerOpen(true); });
        var mobileDrawerClose = byId("mobileDrawerClose");
        if (mobileDrawerClose) mobileDrawerClose.addEventListener("click", function () { setDrawerOpen(false); });
        if (mobileDrawerOverlay) mobileDrawerOverlay.addEventListener("click", function (e) {
            if (e.target === mobileDrawerOverlay) setDrawerOpen(false);
        });
        document.addEventListener("keydown", function (e) { if (e.key === "Escape") setDrawerOpen(false); });
        if (mobileLangTr) mobileLangTr.addEventListener("click", function () {
            setLanguage("tr");
            setDrawerOpen(false);
        });
        if (mobileLangEn) mobileLangEn.addEventListener("click", function () {
            setLanguage("en");
            setDrawerOpen(false);
        });

        // ---- contact dialog ----
        var envelopeBtn = byId("envelopeBtn");
        if (envelopeBtn) envelopeBtn.addEventListener("click", openContact);
        var envelopeModalClose = byId("envelopeModalClose");
        if (envelopeModalClose && envelopeDialog) envelopeModalClose.addEventListener("click", function () { envelopeDialog.close(); });
        if (envelopeDialog) envelopeDialog.addEventListener("click", function (e) {
            if (e.target === envelopeDialog) envelopeDialog.close();
        });
        if (byId("mobileContactBtn")) byId("mobileContactBtn").addEventListener("click", function () {
            setDrawerOpen(false);
            openContact();
        });

        // ---- first paint ----
        var lang = readLang();
        if (langSelect) langSelect.value = lang;
        var startLabel = byId("langButtonLabel");
        if (startLabel) startLabel.textContent = LANG_LABELS[lang];
        markLangPills(lang);
        root.lang = lang;
        if (opts.applyOnInit !== false) applyLanguage(lang);

        return {
            setLanguage: setLanguage,
            getLanguage: readLang,
            toggleTheme: toggleTheme,
            setTheme: setTheme,
            getTheme: readTheme,
            setDrawerOpen: setDrawerOpen,
            openContact: openContact
        };
    }

    global.METU_CHROME = { init: init };
})(window);
