/* 學員登入彈窗（動森登島船票/冒險護照風格）+ 右上角學員資訊 */
(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const opt = (from, to, fmt = v => v) => Array.from({ length: to - from + 1 }, (_, k) => `<option value="${from + k}">${fmt(from + k)}</option>`).join("");

  let modal = $("#loginModal");
  if (!modal) {
    modal = document.createElement("div");
    modal.id = "loginModal"; modal.className = "modal-wrap"; modal.setAttribute("role", "dialog"); modal.setAttribute("aria-modal", "true");
    modal.innerHTML = `
      <form class="modal login passport-ticket" id="loginForm" novalidate>
        <div class="passport-stub">
          <div class="stub-ribbon">✈️ ISLAND AIRWAYS · BOARDING PASS</div>
          <div class="stub-emblem"><span class="emoji-big">🏝️</span><span class="stub-compass">🧭</span></div>
          <h2 id="loginPassportTitle">歡迎登島！</h2>
          <p class="sub" id="loginSchoolSub">請先辦理探險護照，測驗成績才會記到你的名下</p>
          <div class="vintage-stamp" aria-hidden="true">
            <div class="stamp-ring">
              <span class="stamp-top">INFO ISLANDS · CUSTOMS</span>
              <strong class="stamp-main">准予登島</strong>
              <span class="stamp-bot">STAGE IV · APPROVED</span>
            </div>
          </div>
          <div class="stub-barcode" aria-hidden="true"><div class="bars"></div><span>PASS NO. II-107-ADVENTURE</span></div>
        </div>
        <div class="passport-perf" aria-hidden="true"></div>
        <div class="passport-body">
          <div class="passport-body-head">
            <span class="pass-tag">🛂 ADVENTURER PASSPORT · 探險家登島登記</span>
            <span class="pass-gate">GATE 01</span>
          </div>
          <div class="row3">
            <label><span class="lbl-ico">🏫 年級</span><select name="grade" required><option value="">選擇</option>${opt(7, 9, v => ["", "", "", "", "", "", "", "七年級", "八年級", "九年級"][v])}</select></label>
            <label><span class="lbl-ico">🚩 班級</span><select name="room" id="loginRoomSelect" required><option value="">選擇</option>${opt(1, 30, v => v + " 班")}</select></label>
            <label><span class="lbl-ico">🪑 座號</span><select name="seat" id="loginSeatSelect" required><option value="">選擇</option>${opt(1, 50, v => v + " 號")}</select></label>
          </div>
          <div class="row2-passport">
            <label><span class="lbl-ico">🧭 探險者姓名</span><input name="name" type="text" maxlength="10" autocomplete="off" placeholder="請輸入真實姓名" required /></label>
            <label><span class="lbl-ico">🎫 學號驗證碼</span><input name="verifyCode" type="text" maxlength="16" autocomplete="off" placeholder="學號或通行碼（選填）" /></label>
          </div>
          <p class="err" id="loginErr" role="alert"></p>
          <button class="btn-primary btn-boarding" id="loginBtn" type="submit">🎒 領取裝備，即刻登島！</button>
          <p class="privacy">🔒 只收集「班級、座號、姓名」，僅供老師統計學習成績使用。</p>
          <div class="login-footer-row">
            <p class="mode" id="loginMode"></p>
            <button type="button" id="loginTeacherEntryBtn" class="login-teacher-link">🧑🏫 教師入口</button>
          </div>
        </div>
      </form>`;
    document.body.appendChild(modal);
  } else {
    const roomSel = $("#loginRoomSelect", modal);
    if (roomSel && roomSel.options.length <= 1) {
      roomSel.insertAdjacentHTML("beforeend", opt(1, 30, v => v + " 班"));
    }
    const seatSel = $("#loginSeatSelect", modal);
    if (seatSel && seatSel.options.length <= 1) {
      seatSel.insertAdjacentHTML("beforeend", opt(1, 50, v => v + " 號"));
    }
    const subEl = $("#loginSchoolSub", modal);
    if (subEl && window.APP_CONFIG && window.APP_CONFIG.SCHOOL) {
      subEl.textContent = `${window.APP_CONFIG.SCHOOL} · 請先辦理探險護照，測驗成績才會記到你的名下`;
    }
  }

  const form = $("#loginForm"), err = $("#loginErr");
  const hasLbSync = typeof Store.hasLeaderboardSync === "function" && Store.hasLeaderboardSync();
  $("#loginMode").textContent = Store.online()
    ? ""
    : (hasLbSync
      ? "已連線年級風雲榜雲端資料庫（單題作答明細僅存於本機）。"
      : "目前為離線體驗模式：成績只會儲存在這台電腦。");

  function show() { modal.classList.add("show"); setTimeout(() => form.grade.focus(), 50); }
  function hide() { modal.classList.remove("show"); }

  form.addEventListener("submit", async (e) => {
    e.preventDefault(); err.textContent = "";
    const v = Object.fromEntries(new FormData(form));
    v.name = (v.name || "").trim();
    if (!v.grade || !v.room || !v.seat) { err.textContent = "請選擇年級、班級與座號"; return; }
    if (v.name.length < 2 || !/^[\u4e00-\u9fa5A-Za-z·\s]{2,10}$/.test(v.name)) { err.textContent = "請輸入 2–10 字的姓名（中文或英文）"; return; }
    const btn = $("#loginBtn");
    btn.classList.add("is-pressing");
    setTimeout(() => btn.classList.remove("is-pressing"), 240);
    btn.disabled = true; btn.textContent = "✈️ 辦理登島手續中…";
    const r = await Store.login(v);
    btn.disabled = false; btn.textContent = "🎒 領取裝備，即刻登島！";
    if (!r.ok) { err.textContent = r.msg; return; }
    hide(); renderChip();
    if (window.AudioManager && typeof window.AudioManager.startBGM === "function") {
      window.AudioManager.startBGM();
    }
    document.dispatchEvent(new CustomEvent("ii:login"));
  });

  /* 右上角學員資訊 */
  const chip = $("#userChip");
  function renderChip() {
    const p = Store.profile;
    if (!p) { chip.innerHTML = ""; return; }
    const pend = Store.pending();
    chip.innerHTML = `<span class="who">👤 <b>${p.name}</b> <small>${p.cls[0] === "7" ? "七" : p.cls[0] === "8" ? "八" : "九"}年${+p.cls.slice(1)}班 ${p.seat}號</small></span>
      ${pend ? `<span class="pend" title="有 ${pend} 筆成績尚未同步,稍後會自動補送">⏳${pend}</span>` : ""}
      <button class="link" id="logoutBtn">登出</button>`;
    $("#logoutBtn").onclick = () => { Store.logout(); renderChip(); show(); form.reset(); document.dispatchEvent(new CustomEvent("ii:logout")); };
  }
  document.addEventListener("ii:synced", renderChip);

  const teacherEntryBtn = $("#loginTeacherEntryBtn", modal);
  if (teacherEntryBtn) {
    teacherEntryBtn.addEventListener("click", () => {
      if (window.TeacherCockpit && typeof window.TeacherCockpit.open === "function") {
        window.TeacherCockpit.open();
      }
    });
  }

  renderChip();
  if (!Store.profile) show();    // 初次入島自動跳出
  window.Auth = { show, hide, requireLogin: () => { if (!Store.profile) { show(); return false; } return true; }, renderChip };
})();
