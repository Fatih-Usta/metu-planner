/**
 * METU Portal – ICS (iCalendar) export for weekly schedules
 * Exports schedule to .ics file for Google Calendar, Outlook, Apple Calendar.
 */
(function (global) {
  "use strict";

  function parseTimeToMinutes(str) {
    if (!str) return null;
    var parts = String(str).trim().split(":");
    if (parts.length < 2) return null;
    var h = parseInt(parts[0], 10);
    var m = parseInt(parts[1], 10);
    if (isNaN(h) || isNaN(m)) return null;
    return h * 60 + m;
  }

  function dayToWeekday(dayStr) {
    var d = (String(dayStr || "").toLowerCase()).replace(/[^a-z]/g, "");
    if (d.indexOf("mon") === 0 || d === "m") return 1;
    if (d.indexOf("tue") === 0 || d === "tu") return 2;
    if (d.indexOf("wed") === 0 || d === "w") return 3;
    if (d.indexOf("thu") === 0 || d === "th") return 4;
    if (d.indexOf("fri") === 0 || d === "f") return 5;
    if (d.indexOf("paz") === 0) return 1; // Turkish Pazartesi
    if (d.indexOf("sal") === 0) return 2; // Salı
    if (d.indexOf("car") === 0) return 3; // Çarşamba
    if (d.indexOf("per") === 0) return 4; // Perşembe
    if (d.indexOf("cum") === 0) return 5; // Cuma
    return null;
  }

  function getSemesterDates(semesterCode) {
    var code = parseInt(semesterCode, 10);
    var now = new Date();
    var year = now.getFullYear();
    var month = now.getMonth();

    if (!isNaN(code) && code >= 20200 && code <= 20300) {
      year = Math.floor(code / 10);
      var term = code % 10;
      if (term === 1) {
        return { start: new Date(year, 8, 15), end: new Date(year, 11, 20) };
      }
      if (term === 2) {
        return { start: new Date(year + 1, 1, 2), end: new Date(year + 1, 4, 25) };
      }
      if (term === 5) {
        return { start: new Date(year, 5, 15), end: new Date(year, 6, 25) };
      }
    }

    if (month >= 8) {
      return { start: new Date(year, 8, 15), end: new Date(year, 11, 20) };
    }
    if (month >= 5) {
      return { start: new Date(year, 5, 15), end: new Date(year, 6, 25) };
    }
    return { start: new Date(year, 1, 2), end: new Date(year, 4, 25) };
  }

  function pad2(n) {
    return (n < 10 ? "0" : "") + n;
  }

  function formatIcsDate(d, addTime) {
    var y = d.getFullYear();
    var m = pad2(d.getMonth() + 1);
    var day = pad2(d.getDate());
    if (addTime) {
      var h = pad2(d.getHours());
      var min = pad2(d.getMinutes());
      var s = pad2(d.getSeconds());
      return y + m + day + "T" + h + min + s;
    }
    return y + m + day;
  }

  function escapeIcsText(s) {
    return String(s || "")
      .replace(/\\/g, "\\\\")
      .replace(/;/g, "\\;")
      .replace(/,/g, "\\,")
      .replace(/\n/g, "\\n");
  }

  function generateUID() {
    return "metu-portal-" + Date.now() + "-" + Math.random().toString(36).slice(2) + "@metu";
  }

  function scheduleToIcs(schedule, semesterCode) {
    if (!Array.isArray(schedule) || !schedule.length) {
      return "BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//METU Portal//Schedule//EN\r\nEND:VCALENDAR";
    }

    var dates = getSemesterDates(semesterCode);
    var endD = new Date(dates.end);
    endD.setHours(23, 59, 59, 0);
    var untilStr = formatIcsDate(endD, true);

    var events = [];
    var evtIndex = 0;

    schedule.forEach(function (item) {
      var code = (item.code || "").trim();
      var sectionNum = item.sectionNum != null ? String(item.sectionNum) : "";
      var summary = code + (sectionNum ? " Sec " + sectionNum : "");
      var meetings = Array.isArray(item.meetings) ? item.meetings : [];

      meetings.forEach(function (m) {
        var dayNum = dayToWeekday(m.day);
        var startMin = parseTimeToMinutes(m.start);
        var endMin = parseTimeToMinutes(m.end);
        if (dayNum == null || startMin == null || endMin == null) return;

        var firstMonday = new Date(dates.start);
        var dayOfWeek = firstMonday.getDay();
        var daysUntilMonday = dayOfWeek === 0 ? 1 : (dayOfWeek === 1 ? 0 : 1 - dayOfWeek);
        firstMonday.setDate(firstMonday.getDate() + daysUntilMonday);

        var daysToAdd = dayNum - 1;
        var firstOccurrence = new Date(firstMonday);
        firstOccurrence.setDate(firstOccurrence.getDate() + daysToAdd);

        var dtStart = new Date(firstOccurrence);
        dtStart.setHours(Math.floor(startMin / 60), startMin % 60, 0, 0);
        var dtEnd = new Date(firstOccurrence);
        dtEnd.setHours(Math.floor(endMin / 60), endMin % 60, 0, 0);

        var dtstartStr = formatIcsDate(dtStart, true);
        var dtendStr = formatIcsDate(dtEnd, true);
        var location = (m.room || "").trim();
        var desc = summary + (location ? " – " + location : "");

        var evt = [
          "BEGIN:VEVENT",
          "UID:" + generateUID(),
          "DTSTART:" + dtstartStr,
          "DTEND:" + dtendStr,
          "RRULE:FREQ=WEEKLY;UNTIL=" + untilStr,
          "SUMMARY:" + escapeIcsText(summary),
          "DESCRIPTION:" + escapeIcsText(desc)
        ];
        if (location) evt.push("LOCATION:" + escapeIcsText(location));
        evt.push("END:VEVENT");
        events.push(evt.join("\r\n"));
      });
    });

    var body = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//METU Portal//Schedule//EN",
      "CALSCALE:GREGORIAN",
      "METHOD:PUBLISH"
    ].concat(events).concat(["END:VCALENDAR"]).join("\r\n");

    return body;
  }

  function downloadIcs(icsContent, filename) {
    var blob = new Blob([icsContent], { type: "text/calendar;charset=utf-8" });
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = filename || "metu-schedule.ics";
    a.click();
    URL.revokeObjectURL(a.href);
  }

  function exportScheduleToIcs(schedule, semesterCode, filename) {
    var sem = semesterCode != null ? String(semesterCode) : "20252";
    var ics = scheduleToIcs(schedule, sem);
    downloadIcs(ics, filename || "metu-weekly-schedule.ics");
  }

  global.METU_ICS_exportSchedule = exportScheduleToIcs;
  global.METU_ICS_scheduleToIcs = scheduleToIcs;
})(typeof window !== "undefined" ? window : this);
