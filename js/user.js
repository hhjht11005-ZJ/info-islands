/* 學員登入彈窗（動森登島船票/冒險護照風格＋個人驗證碼雙階段設定）+ 右上角學員資訊 */
(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const opt = (from, to, fmt = v => v) => Array.from({ length: to - from + 1 }, (_, k) => `<option value="${from + k}">${fmt(from + k)}</option>`).join("");

  const esc = (s) => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

  let modal = $("#loginModal");
  if (!modal) {
    modal = document.createElement("div");
    modal.id = "loginModal"; modal.className = "modal-wrap"; modal.setAttribute("role", "dialog"); modal.setAttribute("aria-modal", "true");
    modal.innerHTML = `
      <form class="modal login passport-ticket" id="loginForm" data-scrollable="true" novalidate>
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
          <div class="login-teacher-bar" id="loginTeacherBar">
            <div class="login-teacher-status" id="loginTeacherStatus" hidden>
              <span class="login-teacher-badge" id="loginTeacherBadge"></span>
              <button type="button" class="login-teacher-switch-btn" id="loginSwitchTeacherBtn" title="切換教師代碼">切換</button>
            </div>
            <label class="login-teacher-picker" id="loginTeacherPickerWrap" hidden>
              <span class="lbl-ico">🏫 選擇教師代碼（請向老師確認）</span>
              <select id="loginTeacherSelect" name="teacherIdSelect">
                <option value="">⏳ 正在載入教師代碼…</option>
              </select>
            </label>
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
                <input name="pinCode" id="loginPinInput" type="password" inputMode="text" maxlength="6" autocomplete="off" placeholder="請輸入 4~6 碼個人驗證碼" required />
                <button type="button" class="pin-eye-btn" id="loginPinEye" aria-label="顯示或隱藏驗證碼" title="顯示／隱藏驗證碼">👁️</button>
              </div>
            </label>
          </div>
          <div class="pin-setup-box" id="loginPinSetupBox" hidden>
            <p class="pin-setup-tip" id="loginPinSetupTip">🌟 歡迎首次登入！請設定您的專屬個人驗證碼（下次登入需輸入此碼）</p>
            <label><span class="lbl-ico">🔐 再次輸入確認驗證碼</span>
              <div class="pin-input-wrap">
                <input name="pinConfirm" id="loginPinConfirmInput" type="password" inputMode="text" maxlength="6" autocomplete="off" placeholder="請再次輸入相同的 4~6 碼驗證碼" />
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
  }

  const form = $("#loginForm");
  if (form) form.setAttribute("data-scrollable", "true");
  const err = $("#loginErr");
  const btn = $("#loginBtn");
  const pinInput = $("#loginPinInput", form);
  const pinConfirmInput = $("#loginPinConfirmInput", form);
  const setupBox = $("#loginPinSetupBox", form);
  const setupTip = $("#loginPinSetupTip", form);
  const teacherStatusEl = $("#loginTeacherStatus", form);
  const teacherBadgeEl = $("#loginTeacherBadge", form);
  const switchTeacherBtn = $("#loginSwitchTeacherBtn", form);
  const teacherPickerWrap = $("#loginTeacherPickerWrap", form);
  const teacherSelect = $("#loginTeacherSelect", form);
  const schoolSubEl = $("#loginSchoolSub", form);

  let pendingSetup = false;
  let isSwitchingTeacher = false;
  let isSubmitting = false;
  const LOGIN_TIMEOUT_MS = 8000;
  let directoryLoaded = false;
  let directorySyncState = "idle"; // "idle" | "syncing" | "ok" | "error"
  let lastTeacherOptionsSig = "";
  let bootSyncPromise = null;

  const hasLbSync = typeof Store.hasLeaderboardSync === "function" && Store.hasLeaderboardSync();
  $("#loginMode").textContent = Store.online()
    ? ""
    : (hasLbSync
      ? "已連線雲端驗證與年級風雲榜資料庫（更換電腦也能還原造型與進度）。"
      : "目前為離線體驗模式：成績只會儲存在這台電腦。");

  function renderTeacherConnectionUI() {
    if (!teacherSelect || !teacherStatusEl || !teacherPickerWrap || !teacherBadgeEl) return;
    const tid = typeof Store.getTeacherId === "function" ? Store.getTeacherId() : "";
    const list = typeof Store.getTeachersList === "function" ? Store.getTeachersList() : [];
    const cur = (typeof Store.getCurrentTeacher === "function" ? Store.getCurrentTeacher() : null)
      || list.find((t) => t && t.teacherId === tid)
      || null;
    if (schoolSubEl) schoolSubEl.textContent = "請先辦理探險護照，測驗成績才會記到你的名下";

    // 渲染學校與教師下拉選單（SWR：有快取立即完整呈現；僅在清單或狀態變更時更新 DOM，不打斷打字與點選）
    let nextSig = "";
    let nextHtml = "";
    if (list.length > 0) {
      nextSig = `list:${tid}:${list.map((t) => t.teacherId).join(";")}`;
      nextHtml = [
        `<option value="">-- 請選擇老師提供的教師代碼 --</option>`,
        ...list.map((t) => {
          const label = `教師代碼 ${t.teacherId}`;
          return `<option value="${esc(t.teacherId)}"${t.teacherId === tid ? " selected" : ""}>${esc(label)}</option>`;
        })
      ].join("");
    } else if (!directoryLoaded && directorySyncState === "syncing") {
      nextSig = "syncing";
      nextHtml = `<option value="">⏳ 背景同步教師代碼中…</option>`;
    } else if (directorySyncState === "error") {
      nextSig = "error";
      nextHtml = `<option value="">（名單背景更新失敗，可直接登入或稍後重試）</option>`;
    } else {
      nextSig = "empty";
      nextHtml = `<option value="">（尚無已開通教師，請點右下角教師入口註冊）</option>`;
    }

    if (nextSig !== lastTeacherOptionsSig) {
      teacherSelect.innerHTML = nextHtml;
      lastTeacherOptionsSig = nextSig;
    } else if (list.length > 0 && teacherSelect.value !== tid) {
      teacherSelect.value = tid;
    }

    if (tid && !isSwitchingTeacher) {
      const invalidBound = directoryLoaded && list.length > 0 && !cur;
      teacherStatusEl.hidden = false;
      teacherStatusEl.classList.toggle("is-warn", !!invalidBound);
      if (invalidBound) {
        teacherBadgeEl.textContent = `⚠️ 找不到教師代碼（${tid}），請重新選擇`;
        teacherPickerWrap.hidden = false;
      } else if (cur) {
        teacherBadgeEl.textContent = `🏫 已連線教師代碼：${tid}`;
        teacherPickerWrap.hidden = true;
      } else {
        teacherBadgeEl.textContent = `🏫 已鎖定教師代碼：${tid}（背景確認中…）`;
        teacherPickerWrap.hidden = true;
      }
      if (switchTeacherBtn) switchTeacherBtn.textContent = "切換";
    } else {
      if (tid && isSwitchingTeacher) {
        teacherStatusEl.hidden = false;
        teacherBadgeEl.textContent = `🏫 目前教師代碼：${tid}`;
        if (switchTeacherBtn) switchTeacherBtn.textContent = "取消";
      } else {
        teacherStatusEl.hidden = true;
      }
      teacherPickerWrap.hidden = false;
      if (schoolSubEl && !tid) schoolSubEl.textContent = "請先選擇教師代碼並辦理探險護照，測驗成績才會記到你的名下";
    }
  }

  if (switchTeacherBtn) {
    switchTeacherBtn.addEventListener("click", () => {
      isSwitchingTeacher = !isSwitchingTeacher;
      err.textContent = "";
      renderTeacherConnectionUI();
      if (isSwitchingTeacher && teacherSelect) {
        setTimeout(() => teacherSelect.focus(), 40);
      }
    });
  }

  if (teacherSelect) {
    teacherSelect.addEventListener("change", () => {
      const picked = String(teacherSelect.value || "").trim();
      err.textContent = "";
      if (!picked) return;
      isSwitchingTeacher = false;
      const list = typeof Store.getTeachersList === "function" ? Store.getTeachersList() : [];
      const found = list.find((t) => t && t.teacherId === picked) || null;
      if (typeof Store.setTeacherId === "function") {
        Store.setTeacherId(picked, found);
      }
      renderTeacherConnectionUI();
    });
  }

  document.addEventListener("ii:gas-boot", () => {
    directoryLoaded = true;
    directorySyncState = "ok";
    renderTeacherConnectionUI();
  });
  document.addEventListener("ii:gas-snapshot", () => {
    directoryLoaded = true;
    directorySyncState = "ok";
    renderTeacherConnectionUI();
  });
  document.addEventListener("ii:teacher-changed", () => {
    renderTeacherConnectionUI();
  });

  // 兩階段非阻塞背景同步：
  // 1) 立即從 SWR 快取在 0ms 渲染登入介面
  // 2) 背景發送輕量 ?mode=boot&t=... 預熱 GAS 容器並秒速更新學校清單
  // 3) 同時背景靜默拉取完整排行榜與公告更新 localStorage 快取
  if (hasLbSync) {
    directorySyncState = "syncing";
    if (typeof Store.fetchGasBoot === "function") {
      bootSyncPromise = Store.fetchGasBoot().then(() => {
        directoryLoaded = true;
        directorySyncState = "ok";
        renderTeacherConnectionUI();
      }).catch(() => {
        if (!directoryLoaded) directorySyncState = "error";
        directoryLoaded = true;
        renderTeacherConnectionUI();
      });
    }
    if (typeof Store.fetchGasSnapshot === "function") {
      void Store.fetchGasSnapshot().then(() => {
        directoryLoaded = true;
        directorySyncState = "ok";
        renderTeacherConnectionUI();
      }).catch(() => {
        if (!directoryLoaded && !bootSyncPromise) {
          directorySyncState = "error";
          directoryLoaded = true;
          renderTeacherConnectionUI();
        }
      });
    }
  } else {
    directoryLoaded = true;
    directorySyncState = "ok";
  }
  renderTeacherConnectionUI();

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
    isSwitchingTeacher = false;
    renderTeacherConnectionUI();
    err.textContent = "";
    modal.hidden = false;
    modal.classList.remove("hidden", "pointer-events-none");
    modal.classList.add("show");
    setTimeout(() => {
      const tid = typeof Store.getTeacherId === "function" ? Store.getTeacherId() : "";
      if (!tid && teacherSelect && !teacherPickerWrap.hidden) teacherSelect.focus();
      else form.grade.focus();
    }, 50);
  }
  function hide() {
    modal.classList.remove("show");
    modal.classList.add("hidden", "pointer-events-none");
    modal.hidden = true;
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (isSubmitting) return;
    err.textContent = "";
    const v = Object.fromEntries(new FormData(form));
    v.name = String(v.name ?? "").trim();
    v.pinCode = String(v.pinCode ?? "").trim();
    v.pinConfirm = String(v.pinConfirm ?? "").trim();

    let boundTid = typeof Store.getTeacherId === "function" ? Store.getTeacherId() : "";
    let knownTeachers = typeof Store.getTeachersList === "function" ? Store.getTeachersList() : [];
    if (hasLbSync && knownTeachers.length > 0 && !boundTid) {
      err.textContent = "請先選擇老師提供的教師代碼";
      if (teacherPickerWrap) teacherPickerWrap.hidden = false;
      if (teacherSelect) teacherSelect.focus();
      return;
    }

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

    isSubmitting = true;
    btn.classList.add("is-pressing");
    setTimeout(() => btn.classList.remove("is-pressing"), 240);
    btn.disabled = true;
    btn.textContent = "⏳ 驗證連線中...";

    let loginGuardTimer = null;
    const submitStartAt = Date.now();
    try {
      // 若瀏覽器尚無本地教師名單快取且 boot 同步仍在進行中，短暫等候最多 3 秒以確保不會漏選學校
      if (hasLbSync && !boundTid && knownTeachers.length === 0 && !directoryLoaded && bootSyncPromise) {
        await Promise.race([
          bootSyncPromise.catch(() => {}),
          new Promise((resolve) => setTimeout(resolve, 3000))
        ]);
        boundTid = typeof Store.getTeacherId === "function" ? Store.getTeacherId() : "";
        knownTeachers = typeof Store.getTeachersList === "function" ? Store.getTeachersList() : [];
        if (knownTeachers.length > 0 && !boundTid) {
          err.textContent = "請先選擇老師提供的教師代碼";
          if (teacherPickerWrap) teacherPickerWrap.hidden = false;
          if (teacherSelect) teacherSelect.focus();
          btn.textContent = pendingSetup ? "✅ 確認設定並登入" : "🎒 領取裝備，即刻登島！";
          return;
        }
      }

      const remainingTimeoutMs = Math.max(1500, LOGIN_TIMEOUT_MS - (Date.now() - submitStartAt));
      const timeoutPromise = new Promise((resolve) => {
        loginGuardTimer = setTimeout(() => {
          resolve({
            ok: false,
            status: "timeout",
            msg: "⏳ 雲端伺服器回應逾時（超過 8 秒），請確認網路連線後再點擊一次重試！"
          });
        }, remainingTimeoutMs);
      });

      const r = await Promise.race([
        Store.login({
          grade: v.grade,
          room: v.room,
          seat: v.seat,
          name: v.name,
          pinCode: v.pinCode,
          isConfirmSetup: pendingSetup
        }),
        timeoutPromise
      ]);

      if (r && r.status === "need_pin_setup") {
        const targetP = {
          cls: String(v.grade) + String(v.room).padStart(2, "0"),
          seat: Number(v.seat),
          name: v.name
        };
        if (typeof Store.clearStudentLocalData === "function") {
          Store.clearStudentLocalData(targetP, { includeActiveIsland: true, clearLeaderboardCaches: true });
        }
        if (window.AvatarSystem && typeof window.AvatarSystem.clearStudentState === "function") {
          window.AvatarSystem.clearStudentState(targetP, { resetGuest: true });
        }
        renderChip();
        if (typeof window.updateAllIslandArchitectures === "function") {
          window.updateAllIslandArchitectures({ animateUpgrade: false });
        }
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

      if (r.student && typeof Store.isCloudStudentRecordEmpty === "function" && Store.isCloudStudentRecordEmpty(r.student)) {
        const curP = Store.profile || {
          cls: String(v.grade) + String(v.room).padStart(2, "0"),
          seat: Number(v.seat),
          name: v.name
        };
        if (typeof Store.clearStudentLocalData === "function") {
          Store.clearStudentLocalData(curP, { includeActiveIsland: true, clearLeaderboardCaches: true, altNames: [v.name] });
        }
        if (window.AvatarSystem && typeof window.AvatarSystem.clearStudentState === "function") {
          window.AvatarSystem.clearStudentState(curP, { altNames: [v.name], resetGuest: true });
        }
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
    } catch (submitErr) {
      btn.textContent = pendingSetup ? "✅ 確認設定並登入" : "🎒 領取裝備，即刻登島！";
      err.textContent = (submitErr && submitErr.message) || "登入連線異常，請稍後再點擊一次重試！";
    } finally {
      if (loginGuardTimer) clearTimeout(loginGuardTimer);
      isSubmitting = false;
      btn.disabled = false;
    }
  });

  /* 右上角學員資訊（主畫面個人名片：即時連動紙娃娃裝備頭像） */
  const chip = $("#userChip");
  function renderChip() {
    const p = Store.profile;
    if (!p) { chip.innerHTML = ""; return; }
    const pend = Store.pending();
    const AV = window.AvatarSystem;
    const miniSvg = (AV && typeof AV.renderMiniAvatar === "function" && typeof AV.getState === "function")
      ? `<span class="user-chip-avatar" aria-hidden="true">${AV.renderMiniAvatar(AV.getState(), { label: p.name })}</span>`
      : `👤`;
    chip.innerHTML = `<span class="who" id="userChipProfile" title="點擊開啟角色更衣室與學習成果">${miniSvg} <span class="who-txt"><b>${p.name}</b> <small>${p.cls[0] === "7" ? "七" : p.cls[0] === "8" ? "八" : "九"}年${+p.cls.slice(1)}班 ${p.seat}號</small></span></span>
      ${pend ? `<span class="pend" title="有 ${pend} 筆成績尚未同步,稍後會自動補送">⏳${pend}</span>` : ""}
      <button class="link" id="logoutBtn">登出</button>`;
    const profileEl = $("#userChipProfile", chip);
    if (profileEl) {
      profileEl.onclick = () => {
        if (window.Results && typeof window.Results.open === "function") window.Results.open();
      };
    }
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
  document.addEventListener("ii:avatar-changed", renderChip);
  document.addEventListener("ii:login", renderChip);
  document.addEventListener("ii:citadel-updated", renderChip);

  const teacherEntryBtn = $("#loginTeacherEntryBtn", modal);
  if (teacherEntryBtn) {
    teacherEntryBtn.addEventListener("click", () => {
      if (window.TeacherCockpit && typeof window.TeacherCockpit.open === "function") {
        window.TeacherCockpit.open();
      }
    });
  }

  function hasActiveTeacherSession() {
    try {
      for (const key of ["ii_teacher_session", "island_teacher_session"]) {
        const raw = sessionStorage.getItem(key);
        if (!raw) continue;
        const parsed = JSON.parse(raw);
        if (!parsed || typeof parsed !== "object" || !parsed.password) continue;
        const exp = Number(parsed.expiresAt);
        if (Number.isFinite(exp) && exp > 0 && Date.now() > exp) continue;
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }

  renderChip();
  if (!Store.profile && !hasActiveTeacherSession()) show();    // 初次入島自動跳出（教師演示工作階段除外）
  else hide();
  window.Auth = { show, hide, requireLogin: () => { if (!Store.profile) { show(); return false; } return true; }, renderChip };
})();
