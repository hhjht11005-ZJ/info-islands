/**
 * 資訊課程島 — Google Apps Script 多校／多師獨立管理版（方案 B ＋ 全國跨校總榜）
 * 安裝方式：在「總控主試算表」的「擴充功能 → Apps Script」貼上本檔，部署為網頁應用程式（執行身分：我；誰可以存取：所有人）。
 *
 * 教師帳號管理與獨立試算表架構：
 *   - 總控主試算表（Master Spreadsheet）內含：
 *       Teachers          : teacherId, schoolName, teacherName, account, passwordHash, sheetId, createdAt
 *       GlobalLeaderboard : globalKey, teacherId, schoolName, grade, className, seat, maskedName,
 *                           totalScore, crownCount, updatedAt, avatarLook(JSON)
 *   - 每位註冊教師皆自動建立一份獨立 Google 試算表（sheetId），內含：
 *       Leaderboard, WrongLogs, Roster, Config, 名冊, 紀錄(全部), 班級XXX...
 *
 * 相容性保留：
 *   - 若未帶 teacherId（單校舊版模式），自動使用總控主試算表及指令碼屬性 TEACHER_PASSWORD（預設 "info2026"）。
 */
var TZ = "Asia/Taipei";
var SHEET_ROSTER = "名冊";
var SHEET_TEACHER_ROSTER = "Roster";
var SHEET_LEADERBOARD = "Leaderboard";
var SHEET_WRONGLOGS = "WrongLogs";
var SHEET_CONFIG = "Config";
var SHEET_LOG = "紀錄(全部)";
var SHEET_TEACHERS = "Teachers";
var SHEET_GLOBAL_LB = "GlobalLeaderboard";

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
var TEACHERS_HEADER = ["teacherId", "schoolName", "teacherName", "account", "passwordHash", "sheetId", "createdAt"];
var GLOBAL_LB_HEADER = [
  "globalKey", "teacherId", "schoolName", "grade", "className", "seat",
  "maskedName", "totalScore", "crownCount", "updatedAt", "avatarLook(JSON)"
];

function doGet(e) {
  try {
    var masterSs = masterSs_();
    var teacherId = (e && e.parameter && e.parameter.teacherId) ? String(e.parameter.teacherId).trim() : "";
    var teachersList = getPublicTeachersList_(masterSs);
    var currentTeacher = null;
    var targetSs = masterSs;

    if (teacherId) {
      var found = findTeacherById_(masterSs, teacherId);
      if (found) {
        currentTeacher = {
          teacherId: found.teacherId,
          schoolName: found.schoolName,
          teacherName: found.teacherName
        };
        targetSs = openTeacherSpreadsheet_(found, masterSs);
      } else {
        targetSs = null;
      }
    }

    var data = targetSs ? getLeaderboardPublicData_(targetSs) : { "7": [], "8": [], "9": [] };
    var config = targetSs ? getConfigData_(targetSs) : defaultConfigObj_();
    var globalData = getGlobalLeaderboardData_(masterSs);

    return jsonOut_({
      status: "ok",
      data: data,
      globalData: globalData,
      teachersList: teachersList,
      currentTeacher: currentTeacher,
      config: config
    });
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
  if (req.action === "register_teacher") return registerTeacher_(req);
  if (req.action === "teacher_login") return teacherLogin_(req);
  if (req.action === "teacher_dashboard") return teacherDashboard_(req);
  if (req.action === "save_roster") return saveRoster_(req);
  if (req.action === "reset_student_pin") return resetStudentPin_(req);
  if (req.action === "unlock_student_avatar") return unlockStudentAvatar_(req);
  if (req.action === "save_config") return saveConfig_(req);

  if (req.action === "student_login") return studentLogin_(req);
  if (req.action === "save_avatar") return saveStudentAvatar_(req);
  if (req.action === "login" || req.action === "submit") return route_(req);
  if (req.className !== undefined && req.seat !== undefined && req.name !== undefined) {
    return recordLeaderboardAndWrongLogs_(req);
  }
  return { ok: false, status: "error", error: "未知的動作", message: "未知的動作" };
}

function route_(req) {
  var who = validateWho_(req);
  if (who.error) return { ok: false, error: who.error };
  var ctx = resolveStudentContext_(req);
  if (ctx.error) return { ok: false, status: "error", error: ctx.error, message: ctx.error };
  if (req.action === "login") return login_(who, ctx.targetSs);
  if (req.action === "submit") return submit_(who, req.event, ctx.targetSs);
  return { ok: false, error: "未知的動作" };
}

/* ---------- 基礎工具 ---------- */
function jsonOut_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
function masterSs_() { return SpreadsheetApp.getActiveSpreadsheet(); }
function sheetOn_(ss, name, header) {
  var sh = ss.getSheetByName(name);
  if (!sh) {
    sh = ss.insertSheet(name);
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
function leaderboardSheetOn_(ss) {
  var sh = sheetOn_(ss, SHEET_LEADERBOARD, LEADERBOARD_HEADER);
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
function validateWho_(r) {
  var cls = String(r.cls || "");
  if (!/^[789]\d{2}$/.test(cls)) return { error: "班級格式不正確(應為 701、802 這類三碼)" };
  var seat = Number(r.seat);
  if (!(seat >= 1 && seat <= 60) || seat % 1 !== 0) return { error: "座號不正確" };
  var name = String(r.name || "").trim();
  if (name.length < 1 || name.length > 20) return { error: "姓名不正確" };
  return { cls: cls, seat: seat, name: name };
}

/* ---------- 密碼雜湊與教師目錄管理（Teachers 分頁） ---------- */
function hashPassword_(plain) {
  var raw = String(plain || "");
  var bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, "II_SALT_2026::" + raw, Utilities.Charset.UTF_8);
  var hex = "";
  for (var i = 0; i < bytes.length; i++) {
    var b = bytes[i];
    if (b < 0) b += 256;
    var h = b.toString(16);
    if (h.length === 1) h = "0" + h;
    hex += h;
  }
  return "sha256:" + hex;
}
function verifyPassword_(plain, stored) {
  var s = String(stored || "").trim();
  if (!s) return false;
  if (s.indexOf("sha256:") === 0) {
    return hashPassword_(plain) === s;
  }
  return String(plain || "") === s;
}

function teachersSheet_(masterSs) {
  return sheetOn_(masterSs || masterSs_(), SHEET_TEACHERS, TEACHERS_HEADER);
}

function listTeacherRecords_(masterSs) {
  var sh = (masterSs || masterSs_()).getSheetByName(SHEET_TEACHERS);
  if (!sh || sh.getLastRow() <= 1) return [];
  var rows = sh.getDataRange().getValues();
  var out = [];
  for (var i = 1; i < rows.length; i++) {
    var r = rows[i];
    var tid = String(r[0] || "").trim();
    if (!tid) continue;
    out.push({
      rowNum: i + 1,
      teacherId: tid,
      schoolName: String(r[1] || "").trim(),
      teacherName: String(r[2] || "").trim(),
      account: String(r[3] || "").trim(),
      passwordHash: String(r[4] || "").trim(),
      sheetId: String(r[5] || "").trim(),
      createdAt: String(r[6] || "").trim()
    });
  }
  return out;
}

function getPublicTeachersList_(masterSs) {
  return listTeacherRecords_(masterSs).map(function (t) {
    return {
      teacherId: t.teacherId,
      schoolName: t.schoolName,
      teacherName: t.teacherName
    };
  });
}

function findTeacherById_(masterSs, teacherId) {
  var target = String(teacherId || "").trim();
  if (!target) return null;
  var list = listTeacherRecords_(masterSs);
  for (var i = 0; i < list.length; i++) {
    if (list[i].teacherId === target) return list[i];
  }
  return null;
}

function findTeacherByAccount_(masterSs, account) {
  var target = String(account || "").trim().toLowerCase();
  if (!target) return null;
  var list = listTeacherRecords_(masterSs);
  for (var i = 0; i < list.length; i++) {
    if (list[i].account.toLowerCase() === target) return list[i];
  }
  return null;
}

function generateNextTeacherId_(masterSs) {
  var list = listTeacherRecords_(masterSs);
  var maxNum = 1000;
  for (var i = 0; i < list.length; i++) {
    var m = /^T(\d+)$/i.exec(list[i].teacherId);
    if (m) {
      var n = Number(m[1]);
      if (n > maxNum) maxNum = n;
    }
  }
  return "T" + (maxNum + 1);
}

function initTeacherSpreadsheet_(newSs) {
  sheetOn_(newSs, SHEET_LEADERBOARD, LEADERBOARD_HEADER);
  sheetOn_(newSs, SHEET_WRONGLOGS, WRONGLOGS_HEADER);
  sheetOn_(newSs, SHEET_TEACHER_ROSTER, TEACHER_ROSTER_HEADER);
  sheetOn_(newSs, SHEET_CONFIG, CONFIG_HEADER);
  sheetOn_(newSs, SHEET_ROSTER, ROSTER_HEADER);
  sheetOn_(newSs, SHEET_LOG, LOG_HEADER);
  var defaultNames = ["工作表1", "Sheet1"];
  for (var i = 0; i < defaultNames.length; i++) {
    var defSh = newSs.getSheetByName(defaultNames[i]);
    if (defSh && newSs.getSheets().length > 1) {
      try { newSs.deleteSheet(defSh); } catch (e) {}
    }
  }
}

function openTeacherSpreadsheet_(teacher, masterSs) {
  var fallback = masterSs || masterSs_();
  if (!teacher || !teacher.sheetId) return fallback;
  try {
    return SpreadsheetApp.openById(teacher.sheetId);
  } catch (err) {
    throw new Error("無法開啟該教師專屬試算表（" + teacher.teacherId + "）：" + err);
  }
}

function resolveStudentContext_(req) {
  var masterSs = masterSs_();
  var teacherId = String((req && req.teacherId) || "").trim();
  if (!teacherId) {
    return {
      teacherId: "",
      schoolName: "",
      teacherName: "",
      targetSs: masterSs
    };
  }
  var teacher = findTeacherById_(masterSs, teacherId);
  if (!teacher) {
    return { error: "找不到指定的教師或學校代碼（" + teacherId + "），請重新選擇所屬學校與老師" };
  }
  return {
    teacherId: teacher.teacherId,
    schoolName: teacher.schoolName,
    teacherName: teacher.teacherName,
    targetSs: openTeacherSpreadsheet_(teacher, masterSs)
  };
}

function authenticateTeacher_(req) {
  var masterSs = masterSs_();
  var teacherId = String((req && req.teacherId) || "").trim();
  var account = String((req && req.account) || "").trim();
  var password = String((req && req.password) || "");

  if (teacherId || account) {
    var teacher = teacherId ? findTeacherById_(masterSs, teacherId) : findTeacherByAccount_(masterSs, account);
    if (!teacher) {
      return { ok: false, message: "找不到此教師帳號，請重新登入" };
    }
    if (!verifyPassword_(password, teacher.passwordHash)) {
      return { ok: false, message: "教師密碼錯誤，請重新輸入" };
    }
    return {
      ok: true,
      teacher: {
        teacherId: teacher.teacherId,
        schoolName: teacher.schoolName,
        teacherName: teacher.teacherName,
        account: teacher.account
      },
      targetSs: openTeacherSpreadsheet_(teacher, masterSs)
    };
  }

  // 相容舊版單師密碼模式
  var expected = PropertiesService.getScriptProperties().getProperty("TEACHER_PASSWORD") || "info2026";
  if (password !== String(expected)) {
    return { ok: false, message: "密碼錯誤" };
  }
  return {
    ok: true,
    teacher: {
      teacherId: "",
      schoolName: "",
      teacherName: "管理教師",
      account: ""
    },
    targetSs: masterSs
  };
}

/* ---------- 教師註冊開通與登入 ---------- */
function registerTeacher_(req) {
  var schoolName = String(req.schoolName || "").trim();
  var teacherName = String(req.teacherName || "").trim();
  var account = String(req.account || "").trim();
  var password = String(req.password || "");

  if (schoolName.length < 2 || schoolName.length > 40) {
    return { status: "error", message: "請輸入有效的學校名稱（2~40 字）" };
  }
  if (teacherName.length < 1 || teacherName.length > 20) {
    return { status: "error", message: "請輸入教師姓名（1~20 字）" };
  }
  if (account.length < 3 || account.length > 80) {
    return { status: "error", message: "請輸入有效的登入帳號（3~80 字）" };
  }
  if (password.length < 4 || password.length > 64) {
    return { status: "error", message: "請設定至少 4 碼的登入密碼" };
  }

  var masterSs = masterSs_();
  var tSh = teachersSheet_(masterSs);
  if (findTeacherByAccount_(masterSs, account)) {
    return { status: "error", message: "此登入帳號已被註冊，請改用「教師登入」或更換其他帳號" };
  }

  var teacherId = generateNextTeacherId_(masterSs);
  var newSs = SpreadsheetApp.create("資訊課程島 - " + schoolName + " - " + teacherName);
  initTeacherSpreadsheet_(newSs);

  var sheetId = newSs.getId();
  var passwordHash = hashPassword_(password);
  var ts = now_();

  tSh.appendRow([teacherId, schoolName, teacherName, account, passwordHash, sheetId, ts]);

  var teacherPublic = {
    teacherId: teacherId,
    schoolName: schoolName,
    teacherName: teacherName,
    account: account
  };
  var payload = buildTeacherDashboardPayload_(newSs, teacherPublic);
  payload.isNewTeacher = true;
  return payload;
}

function teacherLogin_(req) {
  var account = String(req.account || "").trim();
  var password = String(req.password || "");
  if (!account) {
    return { status: "unauthorized", message: "請輸入教師帳號" };
  }
  if (!password) {
    return { status: "unauthorized", message: "請輸入密碼" };
  }
  var auth = authenticateTeacher_({ account: account, password: password });
  if (!auth.ok) {
    return { status: "unauthorized", message: auth.message || "帳號或密碼錯誤" };
  }
  return buildTeacherDashboardPayload_(auth.targetSs, auth.teacher);
}

/* ---------- 名冊與學生列查詢 ---------- */
function findRosterStudentName_(ss, className, seat) {
  var targetCls = String(className || "").trim();
  var targetSeat = Number(seat);
  var names = [SHEET_TEACHER_ROSTER, SHEET_ROSTER];
  for (var s = 0; s < names.length; s++) {
    var sh = ss.getSheetByName(names[s]);
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

  var ctx = resolveStudentContext_(req);
  if (ctx.error) {
    return { status: "error", message: ctx.error };
  }
  var ss = ctx.targetSs;

  var grade = parseGrade_(req.grade, className);
  var studentKey = grade + "_" + className + "_" + seat;
  var rosterName = findRosterStudentName_(ss, className, seatNum);
  var lbSh = leaderboardSheetOn_(ss);
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

    login_({ cls: className, seat: seatNum, name: name }, ss);

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
  login_({ cls: className, seat: seatNum, name: savedName }, ss);

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

  var ctx = resolveStudentContext_(req);
  if (ctx.error) {
    return { status: "error", message: ctx.error };
  }
  var ss = ctx.targetSs;

  var grade = parseGrade_(req.grade, className);
  var studentKey = grade + "_" + className + "_" + seat;
  var lbSh = leaderboardSheetOn_(ss);
  var hit = findLeaderboardRowByKey_(lbSh, studentKey);
  var avatarJson = JSON.stringify(avatarObj);
  var ts = now_();

  var scoreVal = 0;
  var crownVal = 0;
  var finalName = name;
  if (hit) {
    lbSh.getRange(hit.rowNum, 10).setValue(avatarJson);
    scoreVal = Number(hit.row[5]) || 0;
    crownVal = Number(hit.row[6]) || 0;
    finalName = String(hit.row[4] || "").trim() || name;
  } else {
    lbSh.appendRow([studentKey, grade, className, seat, name, 0, 0, ts, "", avatarJson, "[]"]);
  }

  var publicLook = (avatarObj.look && typeof avatarObj.look === "object") ? avatarObj.look : null;
  upsertGlobalLeaderboard_({
    teacherId: ctx.teacherId || "DEFAULT",
    schoolName: ctx.schoolName || "資訊課程島",
    studentKey: studentKey,
    grade: grade,
    className: className,
    seat: seat,
    maskedName: maskName_(finalName),
    totalScore: scoreVal,
    crownCount: crownVal,
    updatedAt: ts,
    avatarLook: publicLook
  });

  return { status: "ok" };
}

/* ---------- 教師戰情室 ---------- */
function readRosterList_(ss) {
  var roster = [];
  var rSh = ss.getSheetByName(SHEET_TEACHER_ROSTER);
  if (!rSh || rSh.getLastRow() <= 1) {
    rSh = ss.getSheetByName(SHEET_ROSTER);
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
  return roster;
}

function buildTeacherDashboardPayload_(ss, teacherPublic) {
  var roster = readRosterList_(ss);

  var students = [];
  var lbSh = ss.getSheetByName(SHEET_LEADERBOARD);
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

  var wrongLogs = [];
  var wlSh = ss.getSheetByName(SHEET_WRONGLOGS);
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
    teacher: teacherPublic || null,
    roster: roster,
    students: students,
    wrongLogs: wrongLogs,
    config: getConfigData_(ss)
  };
}

function teacherDashboard_(req) {
  var auth = authenticateTeacher_(req);
  if (!auth.ok) {
    return { status: "unauthorized", message: auth.message || "密碼錯誤" };
  }
  return buildTeacherDashboardPayload_(auth.targetSs, auth.teacher);
}

function normalizeRosterClass_(rawGrade, rawClass) {
  var c = String(rawClass || "").trim().replace(/班$/, "");
  var digits = c.replace(/\D/g, "");
  if (/^[789]\d{2}$/.test(digits)) return digits;
  var g = String(rawGrade || "").trim();
  if (/^[789]$/.test(g) && /^\d{1,2}$/.test(digits)) {
    return g + (digits.length === 1 ? "0" + digits : digits);
  }
  return c;
}

function saveRoster_(req) {
  var auth = authenticateTeacher_(req);
  if (!auth.ok) {
    return { status: "unauthorized", message: auth.message || "密碼錯誤" };
  }
  var mode = String(req.mode || "merge").trim().toLowerCase();
  if (mode !== "overwrite") mode = "merge";
  var entries = Array.isArray(req.entries) ? req.entries : [];
  if (entries.length === 0) {
    return { status: "error", message: "請提供至少一筆有效的班級名冊資料" };
  }

  var ss = auth.targetSs;
  var sh = sheetOn_(ss, SHEET_TEACHER_ROSTER, TEACHER_ROSTER_HEADER);
  var map = {};

  if (mode === "merge" && sh.getLastRow() > 1) {
    var existing = sh.getDataRange().getValues();
    for (var i = 1; i < existing.length; i++) {
      var eCls = String(existing[i][0] || "").trim();
      var eSeat = Number(existing[i][1]);
      var eName = String(existing[i][2] || "").trim();
      if (!eCls || !(eSeat >= 1 && eSeat <= 60)) continue;
      map[eCls + "__" + eSeat] = { className: eCls, seat: eSeat, name: eName };
    }
  }

  for (var j = 0; j < entries.length; j++) {
    var item = entries[j];
    if (!item || typeof item !== "object") continue;
    var cls = normalizeRosterClass_(item.grade, item.className || item.cls);
    var seat = Number(item.seat);
    var name = String(item.name || "").trim();
    if (!cls || !(seat >= 1 && seat <= 60) || seat % 1 !== 0 || !name) continue;
    map[cls + "__" + seat] = { className: cls, seat: seat, name: name.slice(0, 20) };
  }

  var list = Object.keys(map).map(function (k) { return map[k]; });
  list.sort(function (a, b) {
    if (a.className !== b.className) return a.className < b.className ? -1 : 1;
    return a.seat - b.seat;
  });

  if (sh.getLastRow() > 1) {
    sh.getRange(2, 1, sh.getLastRow() - 1, Math.max(3, sh.getLastColumn())).clearContent();
  }
  if (list.length > 0) {
    var rowsToWrite = list.map(function (it) {
      return [it.className, it.seat, it.name];
    });
    sh.getRange(2, 1, rowsToWrite.length, 3).setValues(rowsToWrite);
  }

  var rosterOut = list.map(function (it) {
    return {
      grade: parseGrade_("", it.className),
      className: it.className,
      seat: String(it.seat),
      name: it.name
    };
  });
  return { status: "ok", mode: mode, count: rosterOut.length, roster: rosterOut };
}

function resetStudentPin_(req) {
  var auth = authenticateTeacher_(req);
  if (!auth.ok) {
    return { status: "unauthorized", message: auth.message || "密碼錯誤" };
  }
  var className = String(req.className || "").trim();
  var seat = String(req.seat || "").trim();
  var grade = parseGrade_(req.grade, className);
  var studentKey = String(req.studentKey || (grade + "_" + className + "_" + seat)).trim();
  if (!studentKey) return { status: "error", message: "缺少學生識別鍵" };

  var lbSh = leaderboardSheetOn_(auth.targetSs);
  var hit = findLeaderboardRowByKey_(lbSh, studentKey);
  if (!hit) {
    return { status: "ok", cleared: false, message: "該生尚無雲端登入紀錄" };
  }
  lbSh.getRange(hit.rowNum, 9).setValue("");
  return { status: "ok", cleared: true, studentKey: studentKey };
}

function unlockStudentAvatar_(req) {
  var auth = authenticateTeacher_(req);
  if (!auth.ok) {
    return { status: "unauthorized", message: auth.message || "密碼錯誤" };
  }
  var className = String(req.className || "").trim();
  var seat = String(req.seat || "").trim();
  var grade = parseGrade_(req.grade, className);
  var studentKey = String(req.studentKey || (grade + "_" + className + "_" + seat)).trim();
  if (!studentKey) return { status: "error", message: "缺少學生識別鍵" };

  var lbSh = leaderboardSheetOn_(auth.targetSs);
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
function defaultConfigObj_() {
  return {
    announcement: "",
    targetIsland: "",
    taskLinkTitle: "",
    taskLinkUrl: ""
  };
}

function getConfigData_(ss) {
  var cfg = defaultConfigObj_();
  var sh = (ss || masterSs_()).getSheetByName(SHEET_CONFIG);
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
  var auth = authenticateTeacher_(req);
  if (!auth.ok) {
    return { status: "unauthorized", message: auth.message || "密碼錯誤" };
  }
  var incoming = (req.config && typeof req.config === "object") ? req.config : {};
  var nextCfg = {
    announcement: String(incoming.announcement || "").trim(),
    targetIsland: String(incoming.targetIsland || "").trim(),
    taskLinkTitle: String(incoming.taskLinkTitle || "").trim(),
    taskLinkUrl: String(incoming.taskLinkUrl || "").trim()
  };

  var sh = sheetOn_(auth.targetSs, SHEET_CONFIG, CONFIG_HEADER);
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

/* ---------- 本校／教師獨立風雲榜 + 全國跨校總榜 ---------- */
function sortPublicLeaderboardBuckets_(out) {
  ["7", "8", "9"].forEach(function (g) {
    out[g].sort(function (a, b) {
      if (b.totalScore !== a.totalScore) return b.totalScore - a.totalScore;
      if (b.crownCount !== a.crownCount) return b.crownCount - a.crownCount;
      return (Number(a.seat) || 0) - (Number(b.seat) || 0);
    });
  });
  return out;
}

function getLeaderboardPublicData_(ss) {
  var out = { "7": [], "8": [], "9": [] };
  var sh = (ss || masterSs_()).getSheetByName(SHEET_LEADERBOARD);
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
  return sortPublicLeaderboardBuckets_(out);
}

function upsertGlobalLeaderboard_(entry) {
  if (!entry || !entry.studentKey || !entry.className) return;
  var masterSs = masterSs_();
  var gSh = sheetOn_(masterSs, SHEET_GLOBAL_LB, GLOBAL_LB_HEADER);
  var tid = String(entry.teacherId || "DEFAULT").trim();
  var globalKey = tid + "__" + entry.studentKey;
  var avatarLookJson = entry.avatarLook ? JSON.stringify(entry.avatarLook) : "";
  var score = Math.max(0, Math.round(Number(entry.totalScore) || 0));
  var crowns = Math.max(0, Math.round(Number(entry.crownCount) || 0));

  var rows = gSh.getDataRange().getValues();
  var hitRow = -1;
  var prevScore = 0;
  var prevCrowns = 0;
  var prevAvatarJson = "";
  for (var i = 1; i < rows.length; i++) {
    if (String(rows[i][0] || "").trim() === globalKey) {
      hitRow = i + 1;
      prevScore = Number(rows[i][7]) || 0;
      prevCrowns = Number(rows[i][8]) || 0;
      prevAvatarJson = String(rows[i][10] || "");
      break;
    }
  }

  var nextRow = [
    globalKey,
    tid,
    String(entry.schoolName || "").trim(),
    String(entry.grade || "7"),
    String(entry.className || "").trim(),
    String(entry.seat || "").trim(),
    String(entry.maskedName || "匿名"),
    Math.max(prevScore, score),
    Math.max(prevCrowns, crowns),
    String(entry.updatedAt || now_()),
    avatarLookJson || prevAvatarJson
  ];

  if (hitRow > 0) {
    gSh.getRange(hitRow, 1, 1, GLOBAL_LB_HEADER.length).setValues([nextRow]);
  } else {
    gSh.appendRow(nextRow);
  }
}

function getGlobalLeaderboardData_(masterSs) {
  var out = { "7": [], "8": [], "9": [] };
  var gSh = (masterSs || masterSs_()).getSheetByName(SHEET_GLOBAL_LB);
  if (!gSh || gSh.getLastRow() <= 1) return out;
  var rows = gSh.getDataRange().getValues();
  for (var i = 1; i < rows.length; i++) {
    var r = rows[i];
    var cls = String(r[4] || "").trim();
    if (!cls) continue;
    var g = parseGrade_(r[3], cls);
    if (!out[g]) out[g] = [];
    var totalScore = Number(r[7]) || 0;
    var crownCount = Number(r[8]) || 0;
    if (totalScore <= 0 && crownCount <= 0) continue;
    var lookObj = safeJsonParse_(String(r[10] || ""), null);
    var globalKey = String(r[0] || "").trim();
    var parts = globalKey.split("__");
    var studentKey = parts.length > 1 ? parts.slice(1).join("__") : (g + "_" + cls + "_" + String(r[5] || "").trim());
    out[g].push({
      globalKey: globalKey,
      studentKey: studentKey,
      teacherId: String(r[1] || "").trim(),
      schoolName: String(r[2] || "").trim(),
      grade: g,
      className: cls,
      seat: String(r[5] || "").trim(),
      maskedName: String(r[6] || "").trim() || "匿名",
      totalScore: totalScore,
      crownCount: crownCount,
      updatedAt: String(r[9] || ""),
      avatarLook: (lookObj && typeof lookObj === "object") ? lookObj : null
    });
  }
  sortPublicLeaderboardBuckets_(out);
  ["7", "8", "9"].forEach(function (g) {
    if (out[g].length > 50) out[g] = out[g].slice(0, 50);
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

  var ctx = resolveStudentContext_(req);
  if (ctx.error) {
    return { status: "error", message: ctx.error };
  }
  var ss = ctx.targetSs;

  var grade = parseGrade_(req.grade, className);
  var studentKey = grade + "_" + className + "_" + seat;
  var totalScore = Math.max(0, Math.round(Number(req.totalScore) || 0));
  var crownCount = Math.max(0, Math.round(Number(req.crownCount) || 0));
  var incomingProgress = Array.isArray(req.completedProgress) ? req.completedProgress : [];
  var avatarObj = (req.avatar && typeof req.avatar === "object") ? req.avatar : null;
  var incomingAvatar = avatarObj ? JSON.stringify(avatarObj) : "";
  var ts = now_();

  var lbSh = leaderboardSheetOn_(ss);
  var hit = findLeaderboardRowByKey_(lbSh, studentKey);
  var finalScore = totalScore;
  var finalCrowns = crownCount;
  var finalAvatarObj = avatarObj;

  if (hit) {
    var prevScore = Number(hit.row[5]) || 0;
    var prevCrowns = Number(hit.row[6]) || 0;
    var prevProgress = safeJsonParse_(String(hit.row[10] || "[]"), []);
    var mergedProgress = mergeProgress_(prevProgress, incomingProgress);
    finalScore = Math.max(prevScore, totalScore);
    finalCrowns = Math.max(prevCrowns, crownCount);
    lbSh.getRange(hit.rowNum, 5, 1, 4).setValues([[
      name,
      finalScore,
      finalCrowns,
      ts
    ]]);
    if (incomingAvatar) {
      lbSh.getRange(hit.rowNum, 10).setValue(incomingAvatar);
    } else {
      finalAvatarObj = safeJsonParse_(String(hit.row[9] || ""), null);
    }
    lbSh.getRange(hit.rowNum, 11).setValue(JSON.stringify(mergedProgress));
  } else {
    var cleanProgress = mergeProgress_([], incomingProgress);
    lbSh.appendRow([
      studentKey, grade, className, seat, name,
      totalScore, crownCount, ts, "", incomingAvatar, JSON.stringify(cleanProgress)
    ]);
  }

  var publicLook = (finalAvatarObj && finalAvatarObj.look && typeof finalAvatarObj.look === "object")
    ? finalAvatarObj.look
    : null;
  upsertGlobalLeaderboard_({
    teacherId: ctx.teacherId || "DEFAULT",
    schoolName: ctx.schoolName || "資訊課程島",
    studentKey: studentKey,
    grade: grade,
    className: className,
    seat: seat,
    maskedName: maskName_(name),
    totalScore: finalScore,
    crownCount: finalCrowns,
    updatedAt: ts,
    avatarLook: publicLook
  });

  // 記錄錯題索引鍵
  if (req.wrongQuestions && req.wrongQuestions.length > 0) {
    var wlSh = sheetOn_(ss, SHEET_WRONGLOGS, WRONGLOGS_HEADER);
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
function login_(who, targetSs) {
  var ss = targetSs || masterSs_();
  var sh = sheetOn_(ss, SHEET_ROSTER, ROSTER_HEADER);
  var rows = sh.getDataRange().getValues();
  for (var i = 1; i < rows.length; i++) {
    if (String(rows[i][0]) === who.cls && Number(rows[i][1]) === who.seat) {
      sh.getRange(i + 1, 3).setValue(who.name);
      sh.getRange(i + 1, 5).setValue(now_());
      return { ok: true, status: "returning" };
    }
  }
  sh.appendRow([who.cls, who.seat, who.name, now_(), now_()]);
  return { ok: true, status: "new" };
}

/* ---------- 寫入成績:全部紀錄 + 該班級分頁 ---------- */
function submit_(who, ev, targetSs) {
  if (!ev || !ev.eid || !/^(quiz|worksheet)$/.test(String(ev.type))) return { ok: false, error: "紀錄格式不正確" };
  var ss = targetSs || masterSs_();
  var log = sheetOn_(ss, SHEET_LOG, LOG_HEADER);

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

  var diff = String(ev.difficulty || "");
  log.appendRow([t, String(ev.eid), who.cls, who.seat, who.name, ev.type].concat(common).concat([detail, diff]));
  sheetOn_(ss, "班級" + who.cls, CLASS_HEADER)
    .appendRow([t, who.cls, who.seat, who.name, ev.type].concat(common).concat([detail, diff]));
  return { ok: true };
}
