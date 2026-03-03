/**
 * Web Worker: finds all non-conflicting schedules via backtracking.
 * Uses MRV (Minimum Remaining Values): courses with fewest allowed sections first.
 * No cap — returns every valid schedule.
 */
(function () {
    "use strict";

    function parseTimeToMinutes(str) {
        if (!str) return null;
        var parts = String(str).split(":");
        if (parts.length !== 2) return null;
        var h = parseInt(parts[0], 10);
        var m = parseInt(parts[1], 10);
        if (isNaN(h) || isNaN(m)) return null;
        return h * 60 + m;
    }

    function canonicalDayKey(dayStr) {
        if (!dayStr) return "";
        var d = String(dayStr).toLowerCase();
        if (d.length >= 3) return d.slice(0, 3);
        return d;
    }

    function canPlaceMeetings(meetings, placed, checkCollision) {
        meetings = meetings || [];
        if (!checkCollision) return true;
        for (var i = 0; i < meetings.length; i++) {
            var m = meetings[i];
            var day = canonicalDayKey(m.day || "");
            if (!day) continue;
            var start = parseTimeToMinutes(m.start);
            var end = parseTimeToMinutes(m.end);
            if (start == null || end == null) continue;
            if (!placed[day]) placed[day] = [];
            var slots = placed[day];
            for (var j = 0; j < slots.length; j++) {
                var s2 = slots[j];
                // if other slot doesn't enforce collisions, skip it
                if (!s2.checkCollision) continue;
                if (start < s2.end && end > s2.start) return false;
            }
        }
        return true;
    }

    function placeMeetings(placed, code, meetings, checkCollision) {
        meetings = meetings || [];
        for (var i = 0; i < meetings.length; i++) {
            var m = meetings[i];
            var day = canonicalDayKey(m.day || "");
            if (!day) continue;
            var start = parseTimeToMinutes(m.start);
            var end = parseTimeToMinutes(m.end);
            if (start == null || end == null) continue;
            if (!placed[day]) placed[day] = [];
            placed[day].push({ start: start, end: end, code: code, checkCollision: !!checkCollision });
        }
    }

    function deepCopyPlaced(placed) {
        var out = {};
        for (var day in placed) {
            if (placed.hasOwnProperty(day) && Array.isArray(placed[day])) {
                out[day] = placed[day].slice();
            }
        }
        return out;
    }

    function scheduleKey(chosen) {
        return chosen.map(function (x) { return x.code + ":" + x.sectionNum; }).sort().join("|");
    }

    self.onmessage = function (e) {
        var payload = e.data;
        var allowedByCourse = payload.allowedByCourse || [];

        // Pre‑placed "busy" slots from the UI: { dayKey: [{start,end}, ...], ... }
        var busySlots = payload.busySlots || {};
        var placedInitial = {};
        for (var day in busySlots) {
            if (!busySlots.hasOwnProperty(day)) continue;
            var arr = busySlots[day] || [];
            if (!arr.length) continue;
            placedInitial[day] = [];
            for (var i = 0; i < arr.length; i++) {
                var b = arr[i];
                if (b && typeof b.start === "number" && typeof b.end === "number") {
                    placedInitial[day].push({
                        start: b.start,
                        end: b.end,
                        code: "__busy__",
                        checkCollision: true
                    });
                }
            }
        }

        // MRV: sort by number of allowed sections ascending (fewest first)
        allowedByCourse = allowedByCourse.slice().sort(function (a, b) {
            var na = (a.sections && a.sections.length) || 0;
            var nb = (b.sections && b.sections.length) || 0;
            return na - nb;
        });

        var n = allowedByCourse.length;
        var out = [];
        var seenKeys = {};

        function backtrack(placed, chosen, idx) {
            if (idx === n) {
                var key = scheduleKey(chosen);
                if (!seenKeys[key]) {
                    seenKeys[key] = true;
                    out.push(chosen.slice());
                }
                return;
            }
            var item = allowedByCourse[idx];
            var pc = item.pc;
            var sections = item.sections || [];
            var checkCollision = item.checkCollision !== false;
            for (var i = 0; i < sections.length; i++) {
                var s = sections[i];
                var meetings = s.meetings || [];
                if (!canPlaceMeetings(meetings, placed, checkCollision)) continue;
                var placedNext = deepCopyPlaced(placed);
                placeMeetings(placedNext, pc.code, meetings, checkCollision);
                chosen.push({
                    code: pc.code,
                    code7: pc.code7,
                    sectionNum: s.section,
                    meetings: meetings
                });
                backtrack(placedNext, chosen, idx + 1);
                chosen.pop();
            }
        }

        backtrack(placedInitial, [], 0);
        self.postMessage({ list: out });
    };
})();
