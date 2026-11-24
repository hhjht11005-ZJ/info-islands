/* 學員登入彈窗（動森登島船票/冒險護照風格＋個人驗證碼雙階段設定）+ 右上角學員資訊 */
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
            <label><span class="lbl-ico">🔑 驗證碼</span>
              <div class="pin-input-wrap">
                <input name="pinCode" id="loginPinInput" type="password" maxlength="6" autocomplete="off" placeholder="請輸入 4~6 碼個人驗證碼" required />
                <button type="button" class="pin-eye-btn" id="loginPinEye" aria-label="顯示或隱藏驗證碼" title="顯示／隱藏驗證碼">👁️</button>
              </div>
            </label>
          </div>
          <div class="pin-setup-box" id="loginPinSetupBox" hidden>
            <p class="pin-setup-tip" id="loginPinSetupTip">🌟 歡迎首次登入！請設定您的專屬個人驗證碼（下次登入需輸入此碼）</p>
            <label><span class="lbl-ico">🔐 再次輸入確認驗證碼</span>
              <div class="pin-input-wrap">
                <input name="pinConfirm" id="loginPinConfirmInput" type="password" maxlength="6" autocomplete="off" placeholder="請再次輸入相同的 4~6 碼驗證碼" />
                <button type="button" class="pin-eye-btn" id="loginPinConfirmEye" aria-label="顯示或隱藏確認驗證碼" title="顯示／隱藏確認驗證碼">👁️</button>
              </div>
            </label>
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

  const form = $("#loginForm");
  const err = $("#loginErr");
  const btn = $("#loginBtn");
  const pinInput = $("#loginPinInput", form);
  const pinConfirmInput = $("#loginPinConfirmInput", form);
  const setupBox = $("#loginPinSetupBox", form);
  const setupTip = $("#loginPinSetupTip", form);

  let pendingSetup = false;

  const hasLbSync = typeof Store.hasLeaderboardSync === "function" && Store.hasLeaderboardSync();
  $("#loginMode").textContent = Store.online()
    ? ""
    : (hasLbSync
      ? "已連線雲端驗證與年級風雲榜資料庫（更換電腦也能還原造型與進度）。"
      : "目前為離線體驗模式：成績只會儲存在這台電腦。");

  function bindEyeToggle(eyeSelector, inputEl) {
    const eyeBtn = $(eyeSelector, form);
    if (!eyeBtn || !inputEl) return;
    eyeBtn.addEventListener("click", () => {
      const showPlain = inputEl.type === "password";
      inputEl.type = showPlain ? "text" : "password";
      eyeBtn.textContent = showPlain ? "🙈" : "👁️";
      eyeBtn.setAttribute("aria-pressed", String(showPlain));
    });
  }
  bindEyeToggle("#loginPinEye", pinInput);
  bindEyeToggle("#loginPinConfirmEye", pinConfirmInput);

  function resetPinSetupState() {
    pendingSetup = false;
    if (setupBox) setupBox.hidden = true;
    if (pinConfirmInput) {
      pinConfirmInput.value = "";
      pinConfirmInput.type = "password";
    }
    if (btn) btn.textContent = "🎒 領取裝備，即刻登島！";
  }

  ["grade", "room", "seat", "name"].forEach((fieldName) => {
    const el = form.elements[fieldName];
    if (!el) return;
    const handler = () => {
      err.textContent = "";
      if (pendingSetup) resetPinSetupState();
    };
    el.addEventListener("change", handler);
    el.addEventListener("input", handler);
  });

  function show() {
    resetPinSetupState();
    err.textContent = "";
    modal.hidden = false;
    modal.classList.remove("hidden", "pointer-events-none");
    modal.classList.add("show");
    setTimeout(() => form.grade.focus(), 50);
  }
  function hide() {
    modal.classList.remove("show");
    modal.classList.add("hidden", "pointer-events-none");
    modal.hidden = true;
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    err.textContent = "";
    const v = Object.fromEntries(new FormData(form));
    v.name = (v.name || "").trim();
    v.pinCode = (v.pinCode || "").trim();
    v.pinConfirm = (v.pinConfirm || "").trim();

    if (!v.grade || !v.room || !v.seat) {
      err.textContent = "請選擇年級、班級與座號";
      return;
    }
    if (v.name.length < 2 || !/^[\u4e00-\u9fa5A-Za-z·\s]{2,10}$/.test(v.name)) {
      err.textContent = "請輸入 2–10 字的姓名（中文或英文）";
      return;
    }
    if (v.pinCode.length < 4 || v.pinCode.length > 6) {
      err.textContent = "請輸入 4~6 碼個人驗證碼";
      if (pinInput) pinInput.focus();
      return;
    }

    if (pendingSetup) {
      if (!v.pinConfirm) {
        err.textContent = "請再次輸入確認驗證碼";
        if (pinConfirmInput) pinConfirmInput.focus();
        return;
      }
      if (v.pinConfirm !== v.pinCode) {
        err.textContent = "❌ 兩次輸入的驗證碼不一致，請重新確認！";
        if (pinConfirmInput) {
          pinConfirmInput.focus();
          pinConfirmInput.select();
        }
        return;
      }
    }

    btn.classList.add("is-pressing");
    setTimeout(() => btn.classList.remove("is-pressing"), 240);
    btn.disabled = true;
    btn.textContent = pendingSetup ? "🔐 正在設定專屬驗證碼…" : "✈️ 驗證身分與載入雲端紀錄…";

    const r = await Store.login({
      grade: v.grade,
      room: v.room,
      seat: v.seat,
      name: v.name,
      pinCode: v.pinCode,
      isConfirmSetup: pendingSetup
    });

    btn.disabled = false;

    if (r && r.status === "need_pin_setup") {
      pendingSetup = true;
      if (setupTip) {
        setupTip.textContent = (r.hasRosterMatch && r.maskedName)
          ? `🌟 歡迎 ${r.maskedName} 同學首次登入！請設定您的專屬個人驗證碼（下次登入需輸入此碼）`
          : "🌟 歡迎首次登入！請設定您的專屬個人驗證碼（下次登入需輸入此碼）";
      }
      if (setupBox) setupBox.hidden = false;
      btn.textContent = "✅ 確認設定並登入";
      if (pinConfirmInput) {
        pinConfirmInput.value = "";
        setTimeout(() => pinConfirmInput.focus(), 40);
      }
      return;
    }

    if (!r || !r.ok) {
      btn.textContent = pendingSetup ? "✅ 確認設定並登入" : "🎒 領取裝備，即刻登島！";
      err.textContent = (r && r.msg) || "登入失敗，請稍後再試";
      if (r && r.status === "invalid_pin" && pinInput) {
        pinInput.focus();
        pinInput.select();
      }
      return;
    }

    resetPinSetupState();
    if (pinInput) pinInput.value = "";
    hide();
    renderChip();
    if (window.AudioManager && typeof window.AudioManager.startBGM === "function") {
      window.AudioManager.startBGM();
    }
    document.dispatchEvent(new CustomEvent("ii:login"));
    if (window.AvatarSystem && typeof window.AvatarSystem.toast === "function") {
      window.AvatarSystem.toast(
        r.isNewPin
          ? "🔑 專屬驗證碼設定成功！歡迎登島冒險！"
          : "☁️ 驗證成功！已同步載入你的角色外觀與學習進度。",
        "ok",
        3000
      );
    }
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
    $("#logoutBtn").onclick = () => {
      Store.logout();
      renderChip();
      form.reset();
      resetPinSetupState();
      show();
      document.dispatchEvent(new CustomEvent("ii:logout"));
    };
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
  else hide();
  window.Auth = { show, hide, requireLogin: () => { if (!Store.profile) { show(); return false; } return true; }, renderChip };
})();
