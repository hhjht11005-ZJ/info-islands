/**
 * 網站設定
 * API_URL:Google Apps Script 部署後的「網頁應用程式網址」(結尾為 /exec)。
 *         留空 = 離線體驗模式(詳細測驗紀錄只存在這台電腦的瀏覽器,不會寫入個人明細試算表)。
 *         部署步驟見 docs/SETUP.md
 * GAS_LEADERBOARD_URL: 年級風雲榜 Google Apps Script 跨電腦即時排行榜端點。
 */
const GAS_LEADERBOARD_URL = "https://script.google.com/macros/s/AKfycbwctpDZWbnaWoAT6cyRSR6sSTxSRMbZ-7-sxlhfCOycoxhMziCZ3gF5BRkHPNCRb21U/exec";

window.APP_CONFIG = {
  API_URL: "",
  LEADERBOARD_URL: GAS_LEADERBOARD_URL,
  SCHOOL: ""   // 例如「○○國中」,會顯示在登入畫面
};
