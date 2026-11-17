/**
 * 資訊課程島 — Google Apps Script 接收程式
 * 安裝方式見 docs/SETUP.md(在「綁定試算表」的 Apps Script 貼上本檔,部署為網頁應用程式)。
 *
 * 試算表結構(自動建立):
 *   名冊          : 班級、座號、姓名、首次登入、最近登入
 *   紀錄(全部)   : 所有學員的測驗 / 學習單紀錄
 *   班級701 ...   : 依班級分頁儲存(每個班級自動建立一個分頁,給各班老師看)
 *
 * 支援的動作(前端以 JSON 字串 POST):
 *   {action:"login",  cls:"701", seat:12, name:"王小明"}
 *   {action:"submit", cls:"701", seat:12, name:"王小明", event:{eid, ts, type:"quiz", island, unit, unitName, grade, term, score, correct, total, sec, detail}}
 */
var TZ = "Asia/Taipei";
var SHEET_ROSTER = "名冊";
var SHEET_LOG = "紀錄(全部)";
var ROSTER_HEADER = ["班級", "座號", "姓名", "首次登入", "最近登入"];
var LOG_HEADER = ["時間", "紀錄編號", "班級", "座號", "姓名", "類型", "島嶼", "單元代碼", "單元名稱", "年級", "學期", "分數", "答對", "題數", "作答秒數", "詳細(JSON)", "難度"];
var CLASS_HEADER = ["時間", "班級", "座號", "姓名", "類型", "島嶼", "單元代碼", "單元名稱", "年級", "學期", "分數", "答對", "題數", "作答秒數", "詳細(JSON)", "難度"];

function doGet() {
  return ContentService.createTextOutput("資訊課程島 API 運作中").setMimeType(ContentService.MimeType.TEXT);
}

function doPost(e) {
  var lock = LockService.getScriptLock();
  var out;
  try {
    lock.waitLock(25000);
    var req = JSON.parse(e.postData.contents);
    out = route_(req);
  } catch (err) {
    out = { ok: false, error: "伺服器錯誤:" + err };
  } finally {
    try { lock.releaseLock(); } catch (x) {}
  }
  return ContentService.createTextOutput(JSON.stringify(out)).setMimeType(ContentService.MimeType.JSON);
}

function route_(req) {
  var who = validateWho_(req);
  if (who.error) return { ok: false, error: who.error };
  if (req.action === "login") return login_(who);
  if (req.action === "submit") return submit_(who, req.event);
  return { ok: false, error: "未知的動作" };
}

/* ---------- 工具 ---------- */
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
