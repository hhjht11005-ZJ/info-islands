/**
 * 資訊課程島 — Google Apps Script 接收程式（含年級風雲榜、錯題紀錄與教師戰情室）
 * 安裝方式：在 Google 試算表的「擴充功能 → Apps Script」貼上本檔，部署為網頁應用程式。
 *
 * 教師戰情室密碼設定：
 *   建議於 Apps Script「專案設定 → 指令碼屬性」新增 TEACHER_PASSWORD（未設定時預設為 "info2026"）。
 *
 * 試算表結構（自動建立）：
 *   Leaderboard  : studentKey、年級、班級、座號、姓名、總積分、皇冠數、更新時間
 *   WrongLogs    : 時間、年級、班級、座號、姓名、單元代碼、難度、錯題索引鍵
 *   Roster       : 班級、座號、姓名（可由教師預先填入全班名單；若無則自動相容「名冊」分頁）
 *   名冊          : 班級、座號、姓名、首次登入、最近登入
 *   紀錄(全部)   : 所有學員的測驗 / 學習單紀錄
 *   班級701 ...   : 依班級分頁儲存
 */
var TZ = "Asia/Taipei";
var SHEET_ROSTER = "名冊";
var SHEET_TEACHER_ROSTER = "Roster";
var SHEET_LEADERBOARD = "Leaderboard";
var SHEET_WRONGLOGS = "WrongLogs";
var SHEET_LOG = "紀錄(全部)";

var ROSTER_HEADER = ["班級", "座號", "姓名", "首次登入", "最近登入"];
var TEACHER_ROSTER_HEADER = ["班級", "座號", "姓名"];
var LEADERBOARD_HEADER = ["studentKey", "年級", "班級", "座號", "姓名", "總積分", "皇冠數", "更新時間"];
var WRONGLOGS_HEADER = ["時間", "年級", "班級", "座號", "姓名", "單元代碼", "難度", "錯題索引鍵"];
var LOG_HEADER = ["時間", "紀錄編號", "班級", "座號", "姓名", "類型", "島嶼", "單元代碼", "單元名稱", "年級", "學期", "分數", "答對", "題數", "作答秒數", "詳細(JSON)", "難度"];
var CLASS_HEADER = ["時間", "班級", "座號", "姓名", "類型", "島嶼", "單元代碼", "單元名稱", "年級", "學期", "分數", "答對", "題數", "作答秒數", "詳細(JSON)", "難度"];

function doGet() {
  try {
    var data = getLeaderboardPublicData_();
    return jsonOut_({ status: "ok", data: data });
  } catch (err) {
    return jsonOut_({ status: "error", message: "讀取失敗:" + err });
  }
}

function doPost(e) {
  var lock = LockService.getScriptLock();
  var out;
  try {
    lock.waitLock(25000);
    var req = JSON.parse(e.postData.contents);
    out = dispatchPost_(req);
  } catch (err) {
    out = { ok: false, status: "error", message: "伺服器錯誤:" + err, error: "伺服器錯誤:" + err };
  } finally {
    try { lock.releaseLock(); } catch (x) {}
  }
  return jsonOut_(out);
}

function dispatchPost_(req) {
  if (!req || typeof req !== "object") return { ok: false, status: "error", message: "無效的請求" };
  if (req.action === "teacher_dashboard") return teacherDashboard_(req);
  if (req.action === "login" || req.action === "submit") return route_(req);
  if (req.className !== undefined && req.seat !== undefined && req.name !== undefined) {
    return recordLeaderboardAndWrongLogs_(req);
  }
  return { ok: false, status: "error", error: "未知的動作", message: "未知的動作" };
}

function route_(req) {
  var who = validateWho_(req);
  if (who.error) return { ok: false, error: who.error };
  if (req.action === "login") return login_(who);
  if (req.action === "submit") return submit_(who, req.event);
  return { ok: false, error: "未知的動作" };
}

/* ---------- 工具 ---------- */
function jsonOut_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
function validateWho_(r) {
  var cls = String(r.cls || "");
  if (!/^[789]\d{2}$/.test(cls)) return { error: "班級格式不正確(應為 701、802 這類三碼)" };
  var seat = Number(r.seat);
  if (!(seat >= 1 && seat <= 60) || seat % 1 !== 0) return { error: "座號不正確" };
  var name = String(r.name || "").trim();
  if (name.length < 1 || name.length > 20) return { error: "姓名不正確" };
  return { cls: cls, seat: seat, name: name };
}
function ss_() { return SpreadsheetApp.getActiveSpreadsheet(); }
function sheet_(name, header) {
  var sh = ss_().getSheetByName(name);
  if (!sh) {
    sh = ss_().insertSheet(name);
    sh.appendRow(header);
    sh.setFrozenRows(1);
    sh.getRange(1, 1, 1, header.length).setFontWeight("bold").setBackground("#d9ead3");
  }
  return sh;
}
function now_() { return Utilities.formatDate(new Date(), TZ, "yyyy-MM-dd HH:mm:ss"); }
function num_(v) { return (v === undefined || v === null || v === "") ? "" : Number(v); }
function parseGrade_(grade, className) {
  var g = Number(grade);
  if (g === 7 || g === 8 || g === 9) return String(g);
  var s = String(className || "").trim();
  if (/^8/.test(s)) return "8";
  if (/^9/.test(s)) return "9";
  return "7";
}
function maskName_(name) {
  var chars = String(name || "").trim().split("");
  if (chars.length === 0) return "匿名";
  if (chars.length <= 2) return chars[0] + "○";
  if (chars.length === 3) return chars[0] + "○" + chars[2];
  return chars[0] + "○" + chars.slice(2).join("");
}

/* ---------- 教師戰情室 ---------- */
function teacherDashboard_(req) {
  var expected = PropertiesService.getScriptProperties().getProperty("TEACHER_PASSWORD") || "info2026";
  if (String(req.password || "") !== String(expected)) {
    return { status: "unauthorized", message: "密碼錯誤" };
  }

  // 1. 讀取班級名冊（優先讀取 Roster，若無資料則退回名冊分頁）
  var roster = [];
  var rSh = ss_().getSheetByName(SHEET_TEACHER_ROSTER);
  if (!rSh || rSh.getLastRow() <= 1) {
    rSh = ss_().getSheetByName(SHEET_ROSTER);
  }
  if (rSh && rSh.getLastRow() > 1) {
    var rRows = rSh.getDataRange().getValues();
    for (var i = 1; i < rRows.length; i++) {
      var rCls = String(rRows[i][0] || "").trim();
      var rSeat = Number(rRows[i][1]);
      var rName = String(rRows[i][2] || "").trim();
      if (!rCls || !rSeat) continue;
      roster.push({
        grade: parseGrade_("", rCls),
        className: rCls,
        seat: String(rSeat),
        name: rName
      });
    }
  }

  // 2. 讀取已上傳成績之學生紀錄
  var students = [];
  var lbSh = ss_().getSheetByName(SHEET_LEADERBOARD);
  if (lbSh && lbSh.getLastRow() > 1) {
    var lbRows = lbSh.getDataRange().getValues();
    for (var j = 1; j < lbRows.length; j++) {
      var row = lbRows[j];
      var cls = String(row[2] || "").trim();
      if (!cls) continue;
      students.push({
        studentKey: String(row[0] || ""),
        grade: parseGrade_(row[1], cls),
        className: cls,
        seat: String(row[3] || "").trim(),
        name: String(row[4] || "").trim(),
        totalScore: Number(row[5]) || 0,
        crownCount: Number(row[6]) || 0,
        updatedAt: String(row[7] || "")
      });
    }
  }

  // 3. 讀取高頻錯題紀錄
  var wrongLogs = [];
  var wlSh = ss_().getSheetByName(SHEET_WRONGLOGS);
  if (wlSh && wlSh.getLastRow() > 1) {
    var wlRows = wlSh.getDataRange().getValues();
    for (var k = 1; k < wlRows.length; k++) {
      var w = wlRows[k];
      var qKey = String(w[7] || "").trim();
      if (!qKey) continue;
      wrongLogs.push({
        timestamp: String(w[0] || ""),
        grade: String(w[1] || ""),
        className: String(w[2] || "").trim(),
        seat: String(w[3] || "").trim(),
        name: String(w[4] || "").trim(),
        unitId: String(w[5] || "").trim(),
        difficulty: String(w[6] || "").trim(),
        questionKey: qKey
      });
    }
  }

  return {
    status: "ok",
    roster: roster,
    students: students,
    wrongLogs: wrongLogs
  };
}

/* ---------- 年級風雲榜 GET / POST ---------- */
function getLeaderboardPublicData_() {
  var out = { "7": [], "8": [], "9": [] };
  var sh = ss_().getSheetByName(SHEET_LEADERBOARD);
  if (!sh || sh.getLastRow() <= 1) return out;
  var rows = sh.getDataRange().getValues();
  for (var i = 1; i < rows.length; i++) {
    var r = rows[i];
    var cls = String(r[2] || "").trim();
    var g = parseGrade_(r[1], cls);
    if (!out[g]) out[g] = [];
    out[g].push({
      studentKey: String(r[0] || ""),
      grade: g,
      className: cls,
      seat: String(r[3] || "").trim(),
      maskedName: maskName_(r[4]),
      totalScore: Number(r[5]) || 0,
      crownCount: Number(r[6]) || 0,
      updatedAt: String(r[7] || "")
    });
  }
  ["7", "8", "9"].forEach(function (g) {
    out[g].sort(function (a, b) {
      if (b.totalScore !== a.totalScore) return b.totalScore - a.totalScore;
      if (b.crownCount !== a.crownCount) return b.crownCount - a.crownCount;
      return (Number(a.seat) || 0) - (Number(b.seat) || 0);
    });
  });
  return out;
}

function recordLeaderboardAndWrongLogs_(req) {
  var className = String(req.className || "").trim();
  var seat = String(req.seat || "").trim();
  var name = String(req.name || "").trim();
  if (!className || !seat || !name) {
    return { status: "error", message: "缺少班級、座號或姓名" };
  }
  var grade = parseGrade_(req.grade, className);
  var studentKey = grade + "_" + className + "_" + seat;
  var totalScore = Math.max(0, Math.round(Number(req.totalScore) || 0));
  var crownCount = Math.max(0, Math.round(Number(req.crownCount) || 0));
  var ts = now_();

  var lbSh = sheet_(SHEET_LEADERBOARD, LEADERBOARD_HEADER);
  var rows = lbSh.getDataRange().getValues();
  var foundRow = -1;
  for (var i = 1; i < rows.length; i++) {
    if (String(rows[i][0]) === studentKey) {
      foundRow = i + 1;
      break;
    }
  }
  if (foundRow > 0) {
    var prevScore = Number(rows[foundRow - 1][5]) || 0;
    var prevCrowns = Number(rows[foundRow - 1][6]) || 0;
    lbSh.getRange(foundRow, 5, 1, 4).setValues([[
      name,
      Math.max(prevScore, totalScore),
      Math.max(prevCrowns, crownCount),
      ts
    ]]);
  } else {
    lbSh.appendRow([studentKey, grade, className, seat, name, totalScore, crownCount, ts]);
  }

  // 記錄錯題索引鍵
  if (req.wrongQuestions && req.wrongQuestions.length > 0) {
    var wlSh = sheet_(SHEET_WRONGLOGS, WRONGLOGS_HEADER);
    var unitId = String(req.unitId || "").trim();
    var diff = String(req.difficulty || "").trim();
    var toAppend = [];
    for (var w = 0; w < req.wrongQuestions.length; w++) {
      var qKey = String(req.wrongQuestions[w] || "").trim();
      if (!qKey) continue;
      toAppend.push([ts, grade, className, seat, name, unitId, diff, qKey]);
    }
    if (toAppend.length > 0) {
      wlSh.getRange(wlSh.getLastRow() + 1, 1, toAppend.length, WRONGLOGS_HEADER.length).setValues(toAppend);
    }
  }

  return { status: "ok" };
}

/* ---------- 登入:更新名冊 ---------- */
function login_(who) {
  var sh = sheet_(SHEET_ROSTER, ROSTER_HEADER);
  var rows = sh.getDataRange().getValues();
  for (var i = 1; i < rows.length; i++) {
    if (String(rows[i][0]) === who.cls && Number(rows[i][1]) === who.seat) {
      sh.getRange(i + 1, 3).setValue(who.name);   // 姓名以最新輸入為準
      sh.getRange(i + 1, 5).setValue(now_());
      return { ok: true, status: "returning" };
    }
  }
  sh.appendRow([who.cls, who.seat, who.name, now_(), now_()]);
  return { ok: true, status: "new" };
}

/* ---------- 寫入成績:全部紀錄 + 該班級分頁 ---------- */
function submit_(who, ev) {
  if (!ev || !ev.eid || !/^(quiz|worksheet)$/.test(String(ev.type))) return { ok: false, error: "紀錄格式不正確" };
  var log = sheet_(SHEET_LOG, LOG_HEADER);

  // 防重複(離線補送時可能重送)
  if (log.getLastRow() > 1) {
    var hit = log.getRange(2, 2, log.getLastRow() - 1, 1).createTextFinder(String(ev.eid)).matchEntireCell(true).findNext();
    if (hit) return { ok: true, duplicate: true };
  }

  var detail = JSON.stringify(ev.detail || {});
  if (detail.length > 45000) detail = detail.slice(0, 45000);
  var t = now_();
  var common = [
    String(ev.island || ""), String(ev.unit || ""), String(ev.unitName || "").slice(0, 100),
    num_(ev.grade), num_(ev.term), num_(ev.score), num_(ev.correct), num_(ev.total), num_(ev.sec)
  ];

  var diff = String(ev.difficulty || "");  // 難度欄位(easy / medium / hard),追加於最後一欄,不影響既有欄位
  log.appendRow([t, String(ev.eid), who.cls, who.seat, who.name, ev.type].concat(common).concat([detail, diff]));
  // 跨班級分頁:每個班級各自一個分頁,不存在時自動建立
  sheet_("班級" + who.cls, CLASS_HEADER)
    .appendRow([t, who.cls, who.seat, who.name, ev.type].concat(common).concat([detail, diff]));
  return { ok: true };
}
