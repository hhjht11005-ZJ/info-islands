/**
 * 資訊課程島 — Google Apps Script 接收程式（含個人驗證碼、雲端角色/進度同步、年級風雲榜、錯題紀錄與教師戰情室）
 * 安裝方式：在 Google 試算表的「擴充功能 → Apps Script」貼上本檔，部署為網頁應用程式。
 *
 * 教師戰情室密碼設定：
 *   建議於 Apps Script「專案設定 → 指令碼屬性」新增 TEACHER_PASSWORD（未設定時預設為 "info2026"）。
 *
 * 試算表結構（自動建立／自動補齊欄位）：
 *   Leaderboard  : studentKey(1)、年級(2)、班級(3)、座號(4)、姓名(5)、總積分(6)、皇冠數(7)、更新時間(8)、
 *                  驗證碼(9)、角色外觀(JSON)(10)、完成明細(JSON)(11)
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
var SHEET_CONFIG = "Config";
var SHEET_LOG = "紀錄(全部)";

var ROSTER_HEADER = ["班級", "座號", "姓名", "首次登入", "最近登入"];
var TEACHER_ROSTER_HEADER = ["班級", "座號", "姓名"];
var LEADERBOARD_HEADER = [
  "studentKey", "年級", "班級", "座號", "姓名",
  "總積分", "皇冠數", "更新時間", "驗證碼", "角色外觀(JSON)", "完成明細(JSON)"
];
var WRONGLOGS_HEADER = ["時間", "年級", "班級", "座號", "姓名", "單元代碼", "難度", "錯題索引鍵"];
var CONFIG_HEADER = ["key", "value"];
var LOG_HEADER = ["時間", "紀錄編號", "班級", "座號", "姓名", "類型", "島嶼", "單元代碼", "單元名稱", "年級", "學期", "分數", "答對", "題數", "作答秒數", "詳細(JSON)", "難度"];
var CLASS_HEADER = ["時間", "班級", "座號", "姓名", "類型", "島嶼", "單元代碼", "單元名稱", "年級", "學期", "分數", "答對", "題數", "作答秒數", "詳細(JSON)", "難度"];

function doGet() {
  try {
    var data = getLeaderboardPublicData_();
    var config = getConfigData_();
    return jsonOut_({ status: "ok", data: data, config: config });
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
  if (req.action === "student_login") return studentLogin_(req);
  if (req.action === "save_avatar") return saveStudentAvatar_(req);
  if (req.action === "teacher_dashboard") return teacherDashboard_(req);
  if (req.action === "reset_student_pin") return resetStudentPin_(req);
  if (req.action === "unlock_student_avatar") return unlockStudentAvatar_(req);
  if (req.action === "save_config") return saveConfig_(req);
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
function ensureLeaderboardSchema_(sh) {
  if (!sh) return;
  var curCols = sh.getLastColumn();
  if (curCols < LEADERBOARD_HEADER.length) {
    for (var c = curCols + 1; c <= LEADERBOARD_HEADER.length; c++) {
      sh.getRange(1, c).setValue(LEADERBOARD_HEADER[c - 1]).setFontWeight("bold").setBackground("#d9ead3");
    }
  }
}
function leaderboardSheet_() {
  var sh = sheet_(SHEET_LEADERBOARD, LEADERBOARD_HEADER);
  ensureLeaderboardSchema_(sh);
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
function safeJsonParse_(raw, fallback) {
  if (!raw || typeof raw !== "string") {
    return (raw && typeof raw === "object") ? raw : fallback;
  }
  try {
    var parsed = JSON.parse(raw);
    return parsed == null ? fallback : parsed;
  } catch (e) {
    return fallback;
  }
}
function mergeProgress_(arrA, arrB) {
  var map = {};
  var out = [];
  var addList = function (list) {
    if (!Array.isArray(list)) return;
    for (var i = 0; i < list.length; i++) {
      var item = String(list[i] || "").trim();
      if (item && !map[item]) {
        map[item] = true;
        out.push(item);
      }
    }
  };
  addList(arrA);
  addList(arrB);
  out.sort();
  return out;
}
function findRosterStudentName_(className, seat) {
  var targetCls = String(className || "").trim();
  var targetSeat = Number(seat);
  var names = [SHEET_TEACHER_ROSTER, SHEET_ROSTER];
  for (var s = 0; s < names.length; s++) {
    var sh = ss_().getSheetByName(names[s]);
    if (!sh || sh.getLastRow() <= 1) continue;
    var rows = sh.getDataRange().getValues();
    for (var i = 1; i < rows.length; i++) {
      var rCls = String(rows[i][0] || "").trim();
      var rSeat = Number(rows[i][1]);
      var rName = String(rows[i][2] || "").trim();
      if (rCls === targetCls && rSeat === targetSeat && rName) {
        return rName;
      }
    }
  }
  return "";
}
function findLeaderboardRowByKey_(sh, studentKey) {
  var rows = sh.getDataRange().getValues();
  for (var i = 1; i < rows.length; i++) {
    if (String(rows[i][0] || "").trim() === studentKey) {
      return { rowNum: i + 1, row: rows[i] };
    }
  }
  return null;
}

/* ---------- 學生驗證碼首次設定與登入驗證 ---------- */
function studentLogin_(req) {
  var className = String(req.className || req.cls || "").trim();
  var seatNum = Number(req.seat);
  var seat = String(seatNum || req.seat || "").trim();
  var name = String(req.name || "").trim();
  var pinCode = String(req.pinCode || "").trim();
  var isConfirmSetup = !!req.isConfirmSetup;

  if (!/^[789]\d{2}$/.test(className)) {
    return { status: "error", message: "班級格式不正確" };
  }
  if (!(seatNum >= 1 && seatNum <= 60) || seatNum % 1 !== 0) {
    return { status: "error", message: "座號不正確" };
  }
  if (name.length < 1 || name.length > 20) {
    return { status: "error", message: "姓名格式不正確" };
  }
  if (pinCode.length < 4 || pinCode.length > 6) {
    return { status: "error", message: "請輸入 4~6 碼個人驗證碼" };
  }

  var grade = parseGrade_(req.grade, className);
  var studentKey = grade + "_" + className + "_" + seat;
  var rosterName = findRosterStudentName_(className, seatNum);
  var lbSh = leaderboardSheet_();
  var hit = findLeaderboardRowByKey_(lbSh, studentKey);
  var ts = now_();

  var existingPin = hit ? String(hit.row[8] || "").trim() : "";

  // 尚未設定驗證碼（首次登入，或經老師重設驗證碼）
  if (!existingPin) {
    if (!isConfirmSetup) {
      return {
        status: "need_pin_setup",
        maskedName: maskName_(rosterName || name),
        hasRosterMatch: !!rosterName
      };
    }

    var avatarObj = hit ? safeJsonParse_(String(hit.row[9] || ""), null) : null;
    var progressArr = hit ? safeJsonParse_(String(hit.row[10] || "[]"), []) : [];
    if (!Array.isArray(progressArr)) progressArr = [];

    if (hit) {
      var rowName = String(hit.row[4] || "").trim() || name;
      lbSh.getRange(hit.rowNum, 5).setValue(rowName);
      lbSh.getRange(hit.rowNum, 8).setValue(ts);
      lbSh.getRange(hit.rowNum, 9).setValue(pinCode);
    } else {
      lbSh.appendRow([studentKey, grade, className, seat, name, 0, 0, ts, pinCode, "", "[]"]);
    }

    login_({ cls: className, seat: seatNum, name: name });

    return {
      status: "ok",
      isNewPin: true,
      student: {
        studentKey: studentKey,
        grade: grade,
        className: className,
        seat: seat,
        name: hit ? (String(hit.row[4] || "").trim() || name) : name,
        totalScore: hit ? (Number(hit.row[5]) || 0) : 0,
        crownCount: hit ? (Number(hit.row[6]) || 0) : 0,
        avatar: avatarObj,
        progress: progressArr
      }
    };
  }

  // 已設定過驗證碼 -> 核對驗證碼
  if (pinCode !== existingPin) {
    return {
      status: "invalid_pin",
      message: "驗證碼錯誤！請輸入您初次設定的驗證碼（若忘記請洽資訊老師重設）"
    };
  }

  // 驗證成功 -> 回傳雲端外觀與過關進度
  var savedName = String(hit.row[4] || "").trim() || name;
  var savedAvatar = safeJsonParse_(String(hit.row[9] || ""), null);
  var savedProgress = safeJsonParse_(String(hit.row[10] || "[]"), []);
  if (!Array.isArray(savedProgress)) savedProgress = [];

  lbSh.getRange(hit.rowNum, 8).setValue(ts);
  login_({ cls: className, seat: seatNum, name: savedName });

  return {
    status: "ok",
    isNewPin: false,
    student: {
      studentKey: studentKey,
      grade: grade,
      className: className,
      seat: seat,
      name: savedName,
      totalScore: Number(hit.row[5]) || 0,
      crownCount: Number(hit.row[6]) || 0,
      avatar: savedAvatar,
      progress: savedProgress
    }
  };
}

/* ---------- 同步儲存學生角色外觀 / 鎖定狀態 ---------- */
function saveStudentAvatar_(req) {
  var className = String(req.className || req.cls || "").trim();
  var seatNum = Number(req.seat);
  var seat = String(seatNum || req.seat || "").trim();
  var name = String(req.name || "").trim();
  if (!className || !seat || !name) {
    return { status: "error", message: "缺少班級、座號或姓名" };
  }
  var avatarObj = (req.avatar && typeof req.avatar === "object") ? req.avatar : null;
  if (!avatarObj) {
    return { status: "error", message: "無效的角色外觀資料" };
  }

  var grade = parseGrade_(req.grade, className);
  var studentKey = grade + "_" + className + "_" + seat;
  var lbSh = leaderboardSheet_();
  var hit = findLeaderboardRowByKey_(lbSh, studentKey);
  var avatarJson = JSON.stringify(avatarObj);
  var ts = now_();

  if (hit) {
    lbSh.getRange(hit.rowNum, 10).setValue(avatarJson);
  } else {
    lbSh.appendRow([studentKey, grade, className, seat, name, 0, 0, ts, "", avatarJson, "[]"]);
  }
  return { status: "ok" };
}

/* ---------- 教師戰情室 ---------- */
function checkTeacherPassword_(req) {
  var expected = PropertiesService.getScriptProperties().getProperty("TEACHER_PASSWORD") || "info2026";
  return String((req && req.password) || "") === String(expected);
}

function teacherDashboard_(req) {
  if (!checkTeacherPassword_(req)) {
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

  // 2. 讀取已上傳成績／已註冊學生紀錄（含第 9~11 欄：驗證碼、角色外觀、完成明細）
  var students = [];
  var lbSh = ss_().getSheetByName(SHEET_LEADERBOARD);
  if (lbSh && lbSh.getLastRow() > 1) {
    ensureLeaderboardSchema_(lbSh);
    var lbRows = lbSh.getDataRange().getValues();
    for (var j = 1; j < lbRows.length; j++) {
      var row = lbRows[j];
      var cls = String(row[2] || "").trim();
      if (!cls) continue;
      var avatarObj = safeJsonParse_(String(row[9] || ""), null);
      var progressArr = safeJsonParse_(String(row[10] || "[]"), []);
      if (!Array.isArray(progressArr)) progressArr = [];
      students.push({
        studentKey: String(row[0] || ""),
        grade: parseGrade_(row[1], cls),
        className: cls,
        seat: String(row[3] || "").trim(),
        name: String(row[4] || "").trim(),
        totalScore: Number(row[5]) || 0,
        crownCount: Number(row[6]) || 0,
        updatedAt: String(row[7] || ""),
        pinCode: String(row[8] || "").trim(),
        avatar: avatarObj,
        completedProgress: progressArr
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
    wrongLogs: wrongLogs,
    config: getConfigData_()
  };
}

function resetStudentPin_(req) {
  if (!checkTeacherPassword_(req)) {
    return { status: "unauthorized", message: "密碼錯誤" };
  }
  var className = String(req.className || "").trim();
  var seat = String(req.seat || "").trim();
  var grade = parseGrade_(req.grade, className);
  var studentKey = String(req.studentKey || (grade + "_" + className + "_" + seat)).trim();
  if (!studentKey) return { status: "error", message: "缺少學生識別鍵" };

  var lbSh = leaderboardSheet_();
  var hit = findLeaderboardRowByKey_(lbSh, studentKey);
  if (!hit) {
    return { status: "ok", cleared: false, message: "該生尚無雲端登入紀錄" };
  }
  lbSh.getRange(hit.rowNum, 9).setValue("");
  return { status: "ok", cleared: true, studentKey: studentKey };
}

function unlockStudentAvatar_(req) {
  if (!checkTeacherPassword_(req)) {
    return { status: "unauthorized", message: "密碼錯誤" };
  }
  var className = String(req.className || "").trim();
  var seat = String(req.seat || "").trim();
  var grade = parseGrade_(req.grade, className);
  var studentKey = String(req.studentKey || (grade + "_" + className + "_" + seat)).trim();
  if (!studentKey) return { status: "error", message: "缺少學生識別鍵" };

  var lbSh = leaderboardSheet_();
  var hit = findLeaderboardRowByKey_(lbSh, studentKey);
  if (!hit) {
    return { status: "ok", unlocked: false, message: "該生尚無雲端角色資料" };
  }
  var avatarObj = safeJsonParse_(String(hit.row[9] || ""), null);
  if (!avatarObj || typeof avatarObj !== "object") avatarObj = {};
  avatarObj.presetLocked = false;
  lbSh.getRange(hit.rowNum, 10).setValue(JSON.stringify(avatarObj));
  return { status: "ok", unlocked: true, studentKey: studentKey, avatar: avatarObj };
}

/* ---------- 雲端動態公告與任務派發 (Config 分頁) ---------- */
function getConfigData_() {
  var cfg = {
    announcement: "",
    targetIsland: "",
    taskLinkTitle: "",
    taskLinkUrl: ""
  };
  var sh = ss_().getSheetByName(SHEET_CONFIG);
  if (!sh || sh.getLastRow() <= 1) return cfg;
  var rows = sh.getDataRange().getValues();
  for (var i = 1; i < rows.length; i++) {
    var k = String(rows[i][0] || "").trim();
    var v = String(rows[i][1] || "").trim();
    if (k === "announcement" || k === "targetIsland" || k === "taskLinkTitle" || k === "taskLinkUrl") {
      cfg[k] = v;
    }
  }
  return cfg;
}

function saveConfig_(req) {
  if (!checkTeacherPassword_(req)) {
    return { status: "unauthorized", message: "密碼錯誤" };
  }
  var incoming = (req.config && typeof req.config === "object") ? req.config : {};
  var nextCfg = {
    announcement: String(incoming.announcement || "").trim(),
    targetIsland: String(incoming.targetIsland || "").trim(),
    taskLinkTitle: String(incoming.taskLinkTitle || "").trim(),
    taskLinkUrl: String(incoming.taskLinkUrl || "").trim()
  };

  var sh = sheet_(SHEET_CONFIG, CONFIG_HEADER);
  if (sh.getLastRow() > 1) {
    sh.getRange(2, 1, sh.getLastRow() - 1, 2).clearContent();
  }
  var rows = [
    ["announcement", nextCfg.announcement],
    ["targetIsland", nextCfg.targetIsland],
    ["taskLinkTitle", nextCfg.taskLinkTitle],
    ["taskLinkUrl", nextCfg.taskLinkUrl]
  ];
  sh.getRange(2, 1, rows.length, 2).setValues(rows);
  return { status: "ok", config: nextCfg };
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
    if (!cls) continue;
    var g = parseGrade_(r[1], cls);
    if (!out[g]) out[g] = [];
    var avatarObj = safeJsonParse_(String(r[9] || ""), null);
    var publicLook = (avatarObj && avatarObj.look && typeof avatarObj.look === "object") ? avatarObj.look : null;
    out[g].push({
      studentKey: String(r[0] || ""),
      grade: g,
      className: cls,
      seat: String(r[3] || "").trim(),
      maskedName: maskName_(r[4]),
      totalScore: Number(r[5]) || 0,
      crownCount: Number(r[6]) || 0,
      updatedAt: String(r[7] || ""),
      avatarLook: publicLook
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
  var incomingProgress = Array.isArray(req.completedProgress) ? req.completedProgress : [];
  var incomingAvatar = (req.avatar && typeof req.avatar === "object") ? JSON.stringify(req.avatar) : "";
  var ts = now_();

  var lbSh = leaderboardSheet_();
  var hit = findLeaderboardRowByKey_(lbSh, studentKey);
  if (hit) {
    var prevScore = Number(hit.row[5]) || 0;
    var prevCrowns = Number(hit.row[6]) || 0;
    var prevProgress = safeJsonParse_(String(hit.row[10] || "[]"), []);
    var mergedProgress = mergeProgress_(prevProgress, incomingProgress);
    lbSh.getRange(hit.rowNum, 5, 1, 4).setValues([[
      name,
      Math.max(prevScore, totalScore),
      Math.max(prevCrowns, crownCount),
      ts
    ]]);
    if (incomingAvatar) {
      lbSh.getRange(hit.rowNum, 10).setValue(incomingAvatar);
    }
    lbSh.getRange(hit.rowNum, 11).setValue(JSON.stringify(mergedProgress));
  } else {
    var cleanProgress = mergeProgress_([], incomingProgress);
    lbSh.appendRow([
      studentKey, grade, className, seat, name,
      totalScore, crownCount, ts, "", incomingAvatar, JSON.stringify(cleanProgress)
    ]);
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
