/*
 * Capability layer. Loaded by every page, in the browser and in the desktop app.
 *
 * The browser and the app run the same pages. Anything that needs abilities a browser does not
 * have (reaching SAIS without CORS, storing a session) lives under app/ and is pulled in here at
 * runtime — never with a <script src="app/…"> tag, because that would 404 on the public site.
 *
 *   METU_PLATFORM.isApp        true inside the Tauri shell
 *   METU_PLATFORM.http(req)    native request in the app; plain fetch in the browser
 *   METU_PLATFORM.name         "app" | "browser", handy for logs and UI copy
 */
(function (global) {
    "use strict";

    var isApp = typeof global.__TAURI__ !== "undefined" || typeof global.__TAURI_INTERNALS__ !== "undefined";

    function browserHttp(input, init) {
        return global.fetch(input, init);
    }

    // Tauri's HTTP plugin keeps the fetch signature, so callers do not care which one they get.
    function appHttp(input, init) {
        var t = global.__TAURI__;
        if (t && t.http && typeof t.http.fetch === "function") return t.http.fetch(input, init);
        return global.fetch(input, init);
    }

    global.METU_PLATFORM = {
        isApp: isApp,
        name: isApp ? "app" : "browser",
        http: isApp ? appHttp : browserHttp
    };

    // App-only code. The browser never requests this file.
    if (isApp) {
        import("./app/boot.js").catch(function (err) {
            console.error("[platform] app/boot.js could not be loaded:", err);
        });
    }
})(window);
