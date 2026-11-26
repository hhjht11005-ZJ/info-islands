/* ==========================================================================
 * 天穹試煉浮島右殿：🕵️ 跨島綜合解謎檔案室（2 大 Clue-Chaining 動態線索案件）
 * --------------------------------------------------------------------------
 * - 純前端 SVG / DOM 實戰鑑識與工程調校系統（嚴禁簡化為普通選擇題）
 * - 落實動態線索串聯（Clue-Chaining）：前一關鑑識出的真實數據必須於下一關輸入驗證
 * - 案件一 (capstone:zero-day)  ：《零日危機：校慶系統癱瘓與勒索封包追蹤》（4 階段）
 * - 案件二 (capstone:smart-city)：《失控的智慧城市：無人配送車隊調度風暴》（4 階段）
 * - 每案全破發放 +50 ⭐ 探索星幣，雙案全破（與資安鑑識通關）解鎖「首席資安鑑識官」
 * ========================================================================== */
(() => {
  const esc = (s) =>
    String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  const CASES = [
    { id: "capstone:zero-day", short: "零日危機案件", title: "《零日危機：校慶系統癱瘓與勒索封包追蹤》", icon: "🚨", badge: "電腦探險 → 網路資安 → 資料海灣 → 程式森林", coins: 50 },
    { id: "capstone:smart-city", short: "智慧城市風暴", title: "《失控的智慧城市：無人配送車隊調度風暴》", icon: "🚐", badge: "AI 智慧 → 演算法山 → 創作協作 → 資料程式", coins: 50 }
  ];

  function getTokens() {
    if (window.Store && typeof window.Store.getCitadelTokens === "function") {
      return window.Store.getCitadelTokens();
    }
    if (window.AvatarSystem && typeof window.AvatarSystem.getState === "function") {
      return window.AvatarSystem.getState().citadelTokens || [];
    }
    return [];
  }

  function isCompleted(token) {
    return getTokens().includes(token);
  }

  function notify(msg, type = "info", ms = 3200) {
    if (window.AvatarSystem && typeof window.AvatarSystem.toast === "function") {
      window.AvatarSystem.toast(msg, type, ms);
    }
  }

  function completeCase(token, label, onUpdate) {
    const wasAll = CASES.every((c) => isCompleted(c.id));
    let res = { ok: true, isNew: false, gained: 0 };
    if (window.Store && typeof window.Store.recordCitadelToken === "function") {
      res = window.Store.recordCitadelToken(token);
    } else if (window.AvatarSystem && typeof window.AvatarSystem.grantCitadelToken === "function") {
      res = window.AvatarSystem.grantCitadelToken(token);
    }
    const nowAll = CASES.every((c) => isCompleted(c.id));
    if (res && res.gained > 0) {
      notify(`🎉 結案「${label}」！獲得 +${res.gained} ⭐ 探索星幣！`, "coin", 3800);
      if (typeof window.confetti === "function") {
        try {
          window.confetti({ particleCount: 80, spread: 75, origin: { y: 0.56 }, colors: ["#ffd166", "#34d399", "#38bdf8", "#f472b6"] });
        } catch {}
      }
    }
    if (!wasAll && nowAll) {
      setTimeout(() => {
        notify("🕵️ 跨島雙案全破！解鎖終局稱號【首席資安鑑識官】！", "ok", 4800);
        if (typeof window.confetti === "function") {
          try {
            window.confetti({ particleCount: 120, spread: 98, origin: { y: 0.5 }, colors: ["#ffd166", "#38bdf8", "#34d399"] });
          } catch {}
        }
      }, 450);
    }
    if (typeof onUpdate === "function") onUpdate(res);
    return res;
  }

  /* ========================================================================
   * 案件一：《零日危機：校慶系統癱瘓與勒索封包追蹤》資料集
   * ======================================================================== */
  const ZERO_DAY_PROCESSES = [
    { pid: 100, ppid: 0, name: "systemd_kernel", ram: 420, disk: 12, status: "系統核心", kind: "system", conn: "—" },
    { pid: 412, ppid: 100, name: "nginx_anniv_web.exe", ram: 680, disk: 18, status: "校慶網頁服務", kind: "benign", conn: "0.0.0.0:443 (HTTPS)" },
    { pid: 880, ppid: 412, name: "anniv_db_worker.exe", ram: 1120, disk: 45, status: "報名資料庫", kind: "benign", conn: "127.0.0.1:5432" },
    { pid: 905, ppid: 412, name: "ticket_cache_srv.exe", ram: 510, disk: 9, status: "票券快取", kind: "benign", conn: "127.0.0.1:6379" },
    { pid: 1337, ppid: 412, name: "sync_updater_daemon.exe", ram: 4850, disk: 620, status: "⚠️ 未簽章高負載母程序", kind: "root_malicious", conn: "監聽內部 IPC 管線" },
    { pid: 1402, ppid: 1337, name: "swap_locker.bin", ram: 2980, disk: 410, status: "⚠️ 觸發虛擬記憶體置換風暴", kind: "child_malicious", conn: "Local Disk Thrashing" },
    { pid: 1409, ppid: 1337, name: "exfil_agent.exe", ram: 340, disk: 95, status: "⚠️ 可疑加密外連程序", kind: "child_malicious", conn: "185.220.101.47:8443 @ 13:42:18" },
    { pid: 1520, ppid: 100, name: "backup_cron.sh", ram: 220, disk: 24, status: "每日定時備份", kind: "benign", conn: "10.0.2.15:22" }
  ];

  // 25 筆 PCAP 網路封包
  const ZERO_DAY_PACKETS = [
    { no: 1, time: "13:40:02", src: "10.1.4.21", dst: "10.1.0.10", port: "443", proto: "TLSv1.3", cert: "CN=school.edu.tw (Valid)", payload: "R0VUIC9pbmRleC5odG1sIEhUVFAvMS4x" },
    { no: 2, time: "13:40:15", src: "10.1.4.35", dst: "10.1.0.10", port: "443", proto: "TLSv1.3", cert: "CN=school.edu.tw (Valid)", payload: "UE9TVCAvYXBpL3ZvdGUgU1RBVFVTPTIwMA==" },
    { no: 3, time: "13:40:44", src: "10.1.0.10", dst: "10.1.0.5", port: "5432", proto: "PGSQL", cert: "Internal-mTLS", payload: "U0VMRUNUIGNvdW50KCopIEZST00gdGlja2V0cw==" },
    { no: 4, time: "13:41:03", src: "10.1.8.12", dst: "10.1.0.10", port: "80", proto: "HTTP", cert: "None", payload: "R0VUIC9zdHlsZS5jc3MgSFRUUC8xLjE=" },
    { no: 5, time: "13:41:18", src: "10.1.0.10", dst: "172.16.0.8", port: "53", proto: "DNS", cert: "None", payload: "UVVFUlkgaW50cmEuc2Nob29sLmVkdS50dw==" },
    { no: 6, time: "13:41:29", src: "10.1.2.99", dst: "10.1.0.10", port: "8443", proto: "TLSv1.2", cert: "CN=admin-monitor.school.edu.tw (Valid)", payload: "SEVBTFRIX0NIRUNLP09LPzIwMA==" },
    { no: 7, time: "13:41:40", src: "10.1.4.88", dst: "10.1.0.10", port: "443", proto: "TLSv1.3", cert: "CN=school.edu.tw (Valid)", payload: "R0VUIC9tYXAucG5nIEhUVFAvMS4x" },
    { no: 8, time: "13:41:52", src: "10.1.0.10", dst: "10.1.0.22", port: "6379", proto: "REDIS", cert: "None", payload: "UElORyAtPiBQT05H" },
    { no: 9, time: "13:42:01", src: "10.1.3.14", dst: "10.1.0.10", port: "443", proto: "TLSv1.3", cert: "CN=school.edu.tw (Valid)", payload: "R0VUIC9zY2hlZHVsZSBIVFRQLzEuMQ==" },
    { no: 10, time: "13:42:08", src: "10.1.0.12", dst: "185.220.101.47", port: "8443", proto: "TLSv1.2", cert: "CN=fake-school-ca (Self-Signed · 2023 Expired)", payload: "SEFORFNIQUtFX0lOSVQ7S0VZPUVYUElSRUQ=", suspect: true },
    { no: 11, time: "13:42:11", src: "10.1.5.7", dst: "10.1.0.10", port: "443", proto: "TLSv1.3", cert: "CN=school.edu.tw (Valid)", payload: "UE9TVCAvYXBpL2NoZWNraW4gT0s=" },
    { no: 12, time: "13:42:14", src: "10.1.0.10", dst: "10.1.0.8", port: "22", proto: "SSH", cert: "Ed25519-HostKey", payload: "U1NIX0JFUVVFU1RfQkFDS1VQX09L" },
    { no: 13, time: "13:42:16", src: "10.1.6.40", dst: "10.1.0.10", port: "443", proto: "TLSv1.3", cert: "CN=school.edu.tw (Valid)", payload: "R0VUIC9ib290aHMuanNvbiBIVFRQLzEuMQ==" },
    { no: 14, time: "13:42:18", src: "10.1.0.12", dst: "185.220.101.47", port: "8443", proto: "TLSv1.2", cert: "CN=fake-school-ca (Self-Signed · 2023 Expired)", payload: "VEFSR0VUPURCX05PREVfMDc7TUVUSE9EPVNRTEk=", suspect: true, keyPacket: true },
    { no: 15, time: "13:42:22", src: "10.1.7.19", dst: "10.1.0.10", port: "80", proto: "HTTP", cert: "None", payload: "R0VUIC9mYXZpY29uLmljbyBIVFRQLzEuMQ==" },
    { no: 16, time: "13:42:27", src: "10.1.0.10", dst: "10.1.0.5", port: "5432", proto: "PGSQL", cert: "Internal-mTLS", payload: "VVBEQVRFIHNlc3Npb25zIFNFVCBhY3RpdmU9MQ==" },
    { no: 17, time: "13:42:35", src: "10.1.2.99", dst: "10.1.0.10", port: "8443", proto: "TLSv1.2", cert: "CN=admin-monitor.school.edu.tw (Valid)", payload: "TUVUUklDUz9DUFU9OTkl" },
    { no: 18, time: "13:42:41", src: "10.1.4.11", dst: "10.1.0.10", port: "443", proto: "TLSv1.3", cert: "CN=school.edu.tw (Valid)", payload: "R0VUIC9mb290ZXIucG5nIEhUVFAvMS4x" },
    { no: 19, time: "13:42:48", src: "10.1.0.10", dst: "172.16.0.8", port: "53", proto: "DNS", cert: "None", payload: "UVVFUlkgaW1nLnNjaG9vbC5lZHUudHc=" },
    { no: 20, time: "13:42:55", src: "10.1.8.63", dst: "10.1.0.10", port: "443", proto: "TLSv1.3", cert: "CN=school.edu.tw (Valid)", payload: "UE9TVCAvYXBpL3JhZmZsZSBPSw==" },
    { no: 21, time: "13:43:04", src: "10.1.0.10", dst: "10.1.0.22", port: "6379", proto: "REDIS", cert: "None", payload: "R0VUIGNvdW50ZXI6dmlzaXRz" },
    { no: 22, time: "13:43:12", src: "10.1.1.18", dst: "10.1.0.10", port: "443", proto: "TLSv1.3", cert: "CN=school.edu.tw (Valid)", payload: "R0VUIC9nYWxsZXJ5IEhUVFAvMS4x" },
    { no: 23, time: "13:43:19", src: "10.1.0.10", dst: "10.1.0.5", port: "5432", proto: "PGSQL", cert: "Internal-mTLS", payload: "Q09NTUlUIFRSQU5TQUNUSU9O" },
    { no: 24, time: "13:43:28", src: "10.1.5.42", dst: "10.1.0.10", port: "80", proto: "HTTP", cert: "None", payload: "R0VUIC9sb2dvLnN2ZyBIVFRQLzEuMQ==" },
    { no: 25, time: "13:43:39", src: "10.1.9.10", dst: "10.1.0.10", port: "443", proto: "TLSv1.3", cert: "CN=school.edu.tw (Valid)", payload: "R0VUIC9hYm91dCBIVFRQLzEuMQ==" }
  ];

  // 30 筆 DB_NODE_07 帳務交易表（含 3 筆短少合計 $14,850 之偽造交易列，對應帳號 USR-904）
  const ZERO_DAY_LEDGER = Array.from({ length: 30 }, (_, idx) => {
    const idNum = 701 + idx;
    const txId = `TX-${String(idNum).padStart(4, "0")}`;
    const forgedMap = {
      13: { txId: "TX-0714", account: "USR-904", item: "校慶園遊會攤位撥款(偽造重複)", amount: 4950, chk: "ERR-9F02", exp: "OK-7A11", forged: true },
      20: { txId: "TX-0721", account: "USR-904", item: "舞台設備押金退款(異常負向繞過)", amount: 5200, chk: "ERR-4D88", exp: "OK-3C19", forged: true },
      27: { txId: "TX-0728", account: "USR-904", item: "紀念品預購折抵(溢位憑證)", amount: 4700, chk: "ERR-1B77", exp: "OK-8E44", forged: true }
    };
    if (forgedMap[idx]) {
      return { ...forgedMap[idx], time: `13:42:${15 + (idx % 9)}` };
    }
    const validAccs = ["USR-102", "USR-215", "USR-308", "USR-419", "USR-522", "USR-611"];
    const validItems = ["班級飲料攤結算", "園遊券儲值", "校慶徽章義賣", "社團舞台燈光分攤", "紀念帆布袋預購"];
    const chk = `OK-${((idNum * 37) % 90 + 10)}A${(idNum % 9) + 1}`;
    return {
      txId,
      account: validAccs[idx % validAccs.length],
      item: validItems[idx % validItems.length],
      amount: 350 + ((idx * 175) % 1200),
      chk,
      exp: chk,
      forged: false,
      time: `13:${30 + Math.floor(idx / 3)}:${String((idx * 7) % 60).padStart(2, "0")}`
    };
  });

  const ZERO_DAY_TESTS = [
    { name: "測試 1：負數金額攻擊 (-500)", args: [-500, 10000, 5000], expected: false },
    { name: "測試 2：零元邊界阻擋 (0)", args: [0, 10000, 5000], expected: false },
    { name: "測試 3：剛好等於上限 (5000 === maxLimit)", args: [5000, 10000, 5000], expected: true },
    { name: "測試 4：上限溢位阻擋 (5001 > maxLimit)", args: [5001, 10000, 5000], expected: false },
    { name: "測試 5：餘額不足阻擋 (8000 > balance 6000)", args: [8000, 6000, 10000], expected: false }
  ];

  function safeDecodeBase64(b64) {
    try {
      const bin = atob(String(b64 || "").trim());
      return bin;
    } catch {
      return "（無法解碼：非有效 Base64 字串）";
    }
  }

  function evaluateZeroDayPatch(line1Op, line2Op) {
    const fn = (amount, balance, maxLimit) => {
      if (typeof amount !== "number" || !Number.isFinite(amount)) return false;
      const cond1 = line1Op === "<=" ? (amount <= 0) : (line1Op === "<" ? (amount < 0) : (amount === 0));
      if (cond1) return false;
      const cond2 = line2Op === ">"
        ? (amount > balance || amount > maxLimit)
        : (line2Op === ">="
          ? (amount >= balance || amount >= maxLimit)
          : (amount < balance || amount < maxLimit));
      if (cond2) return false;
      return true;
    };
    const results = ZERO_DAY_TESTS.map((t) => {
      const got = fn(...t.args);
      return { ...t, got, ok: got === t.expected };
    });
    return { results, allPassed: results.every((r) => r.ok) };
  }

  function mountZeroDayCase(ctx) {
    const st = {
      stage: 0,
      maxStage: 0,
      passedStages: new Set(),
      // Stage 1
      killedPids: new Set(),
      stage1Msg: "",
      // Stage 2
      portInput: "",
      timeFilter: "",
      selectedPacketNo: null,
      b64Input: "",
      b64Decoded: "",
      tlsChoice: "",
      nodeInput: "",
      stage2Msg: "",
      // Stage 3
      dbQueryInput: "",
      dbLoaded: false,
      onlyMismatch: false,
      markedTxIds: new Set(),
      shortAmountInput: "",
      hackerAccInput: "",
      stage3Msg: "",
      // Stage 4
      line1Op: "===",
      line2Op: ">=",
      testResults: null,
      stage4Msg: "",
      solvedNotified: false
    };

    const stageLabels = [
      "Stage 1｜電腦探險島：程序樹鑑識",
      "Stage 2｜網路資安島：PCAP & TLS",
      "Stage 3｜資料海灣島：帳務稽核",
      "Stage 4｜程式森林島：漏洞修補"
    ];

    const render = () => {
      const renderStageContent = () => {
        if (st.stage === 0) {
          const rootKilled = st.killedPids.has(1337);
          const totalRam = ZERO_DAY_PROCESSES.reduce((s, p) => {
            if (st.killedPids.has(p.pid) || (rootKilled && p.ppid === 1337)) return s;
            return s + p.ram;
          }, 0);
          return `
            <div class="cap-brief">
              <b>📌 鑑識任務（電腦探險島）：</b>校慶主機發生嚴重的虛擬記憶體置換（Disk Thrashing）癱瘓！請檢查下方的系統處理程序樹（PID / PPID / RAM / Disk I/O），沿著父子程序關係<b>終止造成記憶體爆量的根源惡意母程序</b>，取得外洩連線線索。
            </div>
            <div class="cap-hud-row">
              <span class="cap-pill ${rootKilled ? "is-ok" : "is-bad"}">系統記憶體使用：<b>${totalRam} / 8192 MB</b> ${rootKilled ? "（已恢復正常）" : "（⚠️ 嚴重爆量置換中）"}</span>
              ${rootKilled ? `<span class="cap-clue-chip">🔑 已取得線索：異常埠號 <code>8443</code> ｜ 外洩時間 <code>13:42:18</code></span>` : ""}
            </div>
            <div class="cap-table-wrap" data-scrollable="true">
              <table class="cap-table">
                <thead><tr><th>PID</th><th>PPID</th><th>程序名稱</th><th>RAM (MB)</th><th>Disk I/O</th><th>狀態／連線紀錄</th><th>操作</th></tr></thead>
                <tbody>
                  ${ZERO_DAY_PROCESSES.map((p) => {
                    const isKilled = st.killedPids.has(p.pid) || (rootKilled && p.ppid === 1337);
                    const indent = p.ppid === 1337 ? "↳ " : (p.ppid === 412 ? "└ " : "");
                    return `<tr class="${isKilled ? "is-dim" : (p.kind !== "benign" && p.kind !== "system" ? "is-warn-row" : "")}">
                      <td><code>${p.pid}</code></td>
                      <td><code>${p.ppid}</code></td>
                      <td><b>${indent}${esc(p.name)}</b></td>
                      <td>${p.ram}</td>
                      <td>${p.disk} MB/s</td>
                      <td><div>${esc(p.status)}</div><small class="cap-muted">${esc(p.conn)}</small></td>
                      <td>${isKilled ? `<span class="cap-tag ok">已終止</span>` : `<button type="button" class="cap-mini-btn danger" data-kill="${p.pid}">🛑 終止</button>`}</td>
                    </tr>`;
                  }).join("")}
                </tbody>
              </table>
            </div>
            ${st.stage1Msg ? `<div class="cap-msg ${rootKilled ? "is-ok" : "is-bad"}">${esc(st.stage1Msg)}</div>` : ""}
            ${rootKilled ? `<div class="cap-next-bar">
              <span>✅ 根源程序 <code>PID 1337</code> 已終止！請記下線索 <b>埠號 <code>8443</code></b> 與 <b>時間 <code>13:42:18</code></b>。</span>
              <button type="button" class="cap-btn is-accent" id="zdGoStage2">➡ 前往 Stage 2 追蹤網路封包</button>
            </div>` : ""}
          `;
        }

        if (st.stage === 1) {
          const portQ = st.portInput.trim();
          const timeQ = st.timeFilter.trim();
          const filtered = portQ
            ? ZERO_DAY_PACKETS.filter((pk) => pk.port === portQ && (!timeQ || pk.time.includes(timeQ)))
            : [];
          const stage2Done = st.passedStages.has(1);
          return `
            <div class="cap-brief">
              <b>📌 鑑識任務（網路資安島）：</b>請輸入 Stage 1 追查出的<b>異常埠號</b>過濾 25 筆 PCAP 封包，找出 TLS 憑證異常之封包並解碼 Base64 負載，鎖定遭入侵的<b>資料庫節點代碼</b>。
            </div>
            <div class="cap-filter-bar">
              <label>異常埠號 (Port)：<input type="text" id="zdPortInput" value="${esc(st.portInput)}" placeholder="輸入 Stage 1 異常埠號" /></label>
              <label>時間篩選 (選填)：<input type="text" id="zdTimeFilter" value="${esc(st.timeFilter)}" placeholder="例如 13:42:18" /></label>
              <span class="cap-pill">顯示：<b>${filtered.length}</b> / ${ZERO_DAY_PACKETS.length} 筆封包</span>
            </div>
            <div class="cap-table-wrap" data-scrollable="true">
              ${portQ ? (filtered.length ? `
                <table class="cap-table">
                  <thead><tr><th>No.</th><th>時間</th><th>來源 → 目的</th><th>Port</th><th>TLS 憑證狀態</th><th>Base64 負載</th></tr></thead>
                  <tbody>
                    ${filtered.map((pk) => `<tr class="${pk.suspect ? "is-warn-row" : ""}">
                      <td>#${pk.no}</td>
                      <td><code>${pk.time}</code></td>
                      <td><code>${pk.src} → ${pk.dst}</code></td>
                      <td><code>${pk.port}</code></td>
                      <td>${esc(pk.cert)}</td>
                      <td><button type="button" class="cap-mini-btn info" data-b64="${esc(pk.payload)}">🔓 帶入解碼</button></td>
                    </tr>`).join("")}
                  </tbody>
                </table>
              ` : `<div class="cap-empty">查無符合埠號「${esc(portQ)}」之封包，請確認 Stage 1 取得的異常埠號！</div>`)
                : `<div class="cap-empty">🔒 請先在上方輸入 Stage 1 鑑識出的<b>異常埠號</b>，才能過濾 25 筆 PCAP 封包紀錄。</div>`}
            </div>
            <div class="cap-grid-2">
              <div class="cap-box">
                <b>🧰 Base64 負載即時解碼器</b>
                <input type="text" id="zdB64Input" value="${esc(st.b64Input)}" placeholder="點擊上方「帶入解碼」或貼上 Base64 字串…" />
                <button type="button" class="cap-mini-btn" id="zdDecodeBtn" style="margin-top:6px;">⚡ 解碼 Base64</button>
                <div class="cap-code-out">${st.b64Decoded ? `解碼結果：<code>${esc(st.b64Decoded)}</code>` : "尚無解碼輸出"}</div>
              </div>
              <div class="cap-box">
                <b>🛡️ 憑證破綻與入侵節點驗證</b>
                <label class="cap-field">TLS 憑證破綻判斷：
                  <select id="zdTlsChoice">
                    <option value="">-- 請選擇檢驗結果 --</option>
                    <option value="valid" ${st.tlsChoice === "valid" ? "selected" : ""}>憑證合法且未過期</option>
                    <option value="self_expired" ${st.tlsChoice === "self_expired" ? "selected" : ""}>自簽偽造憑證 (Self-Signed) 且已過期</option>
                    <option value="http_plain" ${st.tlsChoice === "http_plain" ? "selected" : ""}>純明文 HTTP 無加密</option>
                  </select>
                </label>
                <label class="cap-field">遭入侵資料庫節點代碼：
                  <input type="text" id="zdNodeInput" value="${esc(st.nodeInput)}" placeholder="例如 DB_NODE_XX" />
                </label>
                <button type="button" class="cap-btn is-accent" id="zdVerifyS2">✅ 確認節點與憑證鑑識結果</button>
              </div>
            </div>
            ${st.stage2Msg ? `<div class="cap-msg ${stage2Done ? "is-ok" : "is-bad"}">${esc(st.stage2Msg)}</div>` : ""}
            ${stage2Done ? `<div class="cap-next-bar">
              <span>🔑 已解鎖節點線索：<code>DB_NODE_07</code></span>
              <button type="button" class="cap-btn is-accent" id="zdGoStage3">➡ 前往 Stage 3 稽核帳務資料</button>
            </div>` : ""}
          `;
        }

        if (st.stage === 2) {
          const rowsToShow = st.onlyMismatch ? ZERO_DAY_LEDGER.filter((r) => r.chk !== r.exp) : ZERO_DAY_LEDGER;
          const markedSum = ZERO_DAY_LEDGER.filter((r) => st.markedTxIds.has(r.txId)).reduce((s, r) => s + r.amount, 0);
          const stage3Done = st.passedStages.has(2);
          return `
            <div class="cap-brief">
              <b>📌 鑑識任務（資料海灣島）：</b>請輸入 Stage 2 取得的<b>資料庫節點代碼</b>載入 30 筆帳務交易表，比對檢核碼異常（類似 <code>COUNTIFS</code> / <code>IF(D2=E2,"OK","ERR")</code> 規則），勾選出 <b>3 筆偽造交易列</b>、計算短少總金額，並鎖定駭客內部帳號。
            </div>
            <div class="cap-filter-bar">
              <label>載入資料庫節點：<input type="text" id="zdDbQueryInput" value="${esc(st.dbQueryInput)}" placeholder="輸入 Stage 2 節點代碼" /></label>
              <button type="button" class="cap-btn is-cmd" id="zdLoadDbBtn">📂 查詢並載入節點帳務</button>
              ${st.dbLoaded ? `<label class="cap-chk"><input type="checkbox" id="zdOnlyMismatch" ${st.onlyMismatch ? "checked" : ""} /> 套用公式篩選 <code>檢核碼 !== 預期碼</code></label>` : ""}
            </div>
            ${st.dbLoaded ? `
              <div class="cap-hud-row">
                <span class="cap-pill">已標記可疑交易：<b>${st.markedTxIds.size}</b> 筆（合計 <b>$${markedSum.toLocaleString()}</b>）</span>
                <span class="cap-pill">總資料筆數：<b>${ZERO_DAY_LEDGER.length}</b> 筆</span>
              </div>
              <div class="cap-table-wrap" data-scrollable="true">
                <table class="cap-table">
                  <thead><tr><th>標記</th><th>交易序號</th><th>內部帳號</th><th>項目說明</th><th>金額 ($)</th><th>系統檢核碼</th><th>預期檢核碼</th></tr></thead>
                  <tbody>
                    ${rowsToShow.map((r) => {
                      const checked = st.markedTxIds.has(r.txId);
                      const bad = r.chk !== r.exp;
                      return `<tr class="${checked ? "is-warn-row" : ""}">
                        <td><input type="checkbox" data-mark-tx="${r.txId}" ${checked ? "checked" : ""} aria-label="標記 ${r.txId}" /></td>
                        <td><code>${r.txId}</code></td>
                        <td><code>${r.account}</code></td>
                        <td>${esc(r.item)}</td>
                        <td>$${r.amount.toLocaleString()}</td>
                        <td><code class="${bad ? "cap-err-code" : ""}">${r.chk}</code></td>
                        <td><code>${r.exp}</code></td>
                      </tr>`;
                    }).join("")}
                  </tbody>
                </table>
              </div>
              <div class="cap-filter-bar">
                <label>短少總金額 ($)：<input type="text" id="zdShortAmt" value="${esc(st.shortAmountInput)}" placeholder="例如 14850" /></label>
                <label>鎖定駭客內部帳號：<input type="text" id="zdHackerAcc" value="${esc(st.hackerAccInput)}" placeholder="例如 USR-XXX" /></label>
                <button type="button" class="cap-btn is-accent" id="zdVerifyS3">🔍 提交帳務稽核報告</button>
              </div>
            ` : `<div class="cap-empty">🔒 請輸入 Stage 2 取得的節點代碼（例如 <code>DB_NODE_XX</code>）以載入 30 筆帳務明細。</div>`}
            ${st.stage3Msg ? `<div class="cap-msg ${stage3Done ? "is-ok" : "is-bad"}">${esc(st.stage3Msg)}</div>` : ""}
            ${stage3Done ? `<div class="cap-next-bar">
              <span>🔑 已鎖定內部帳號 <code>USR-904</code> 與短少金額 <code>$14,850</code>！</span>
              <button type="button" class="cap-btn is-accent" id="zdGoStage4">➡ 前往 Stage 4 修補後端驗證漏洞</button>
            </div>` : ""}
          `;
        }

        const stage4Done = st.passedStages.has(3);
        return `
          <div class="cap-brief">
            <b>📌 鑑識任務（程式森林島）：</b>稽核日誌顯示內部帳號 <code>USR-904</code> 利用後端轉帳函式 <code>validateTransfer(amount, balance, maxLimit)</code> 的兩項邏輯缺陷發動攻擊：<b>① 負數輸入未阻擋</b>、<b>② <code>&gt;</code> 與 <code>&gt;=</code> 邊界運算子寫反</b>。請修補程式碼並通過全部 <b>5 組極端邊界單元測試</b>！
          </div>
          <div class="cap-code-editor">
            <div class="cap-code-line"><span class="ln">1</span><code>function validateTransfer(amount, balance, maxLimit) {</code></div>
            <div class="cap-code-line"><span class="ln">2</span><code>  if (typeof amount !== "number" || !Number.isFinite(amount)) return false;</code></div>
            <div class="cap-code-line is-buggy"><span class="ln">3</span><code>  // 缺陷 1：需阻擋 0 與負數金額輸入</code></div>
            <div class="cap-code-line is-buggy"><span class="ln">4</span><code>  if (amount <select id="zdLine1Op" aria-label="缺陷 1 運算子">
              <option value="===" ${st.line1Op === "===" ? "selected" : ""}>=== (僅擋 0，負數會漏過!)</option>
              <option value="<" ${st.line1Op === "<" ? "selected" : ""}>&lt; (僅擋負數，0 會漏過!)</option>
              <option value="<=" ${st.line1Op === "<=" ? "selected" : ""}>&lt;= (阻擋負數與 0)</option>
            </select> 0) return false;</code></div>
            <div class="cap-code-line is-buggy"><span class="ln">5</span><code>  // 缺陷 2：剛好等於餘額或上限應允許，超過才拒絕</code></div>
            <div class="cap-code-line is-buggy"><span class="ln">6</span><code>  if (amount <select id="zdLine2Op" aria-label="缺陷 2 邊界運算子">
              <option value=">=" ${st.line2Op === ">=" ? "selected" : ""}>&gt;= (寫反：等於上限也被拒絕!)</option>
              <option value="<" ${st.line2Op === "<" ? "selected" : ""}>&lt; (寫反：小於上限反而拒絕!)</option>
              <option value=">" ${st.line2Op === ">" ? "selected" : ""}>&gt; (超過才拒絕)</option>
            </select> balance || amount <span class="cap-op-mirror">${esc(st.line2Op)}</span> maxLimit) return false;</code></div>
            <div class="cap-code-line"><span class="ln">7</span><code>  return true;</code></div>
            <div class="cap-code-line"><span class="ln">8</span><code>}</code></div>
          </div>
          <div class="cap-ctrl-row">
            <button type="button" class="cap-btn is-accent" id="zdRunTests">🧪 執行 5 組極端邊界單元測試並結案</button>
          </div>
          ${st.testResults ? `
            <div class="cap-test-list">
              ${st.testResults.map((r) => `<div class="cap-test-item ${r.ok ? "is-ok" : "is-bad"}">
                <span>${r.ok ? "✅ PASS" : "❌ FAIL"}</span>
                <b>${esc(r.name)}</b>
                <small>預期 ${String(r.expected)} ／ 實際 ${String(r.got)}</small>
              </div>`).join("")}
            </div>
          ` : ""}
          ${st.stage4Msg ? `<div class="cap-msg ${stage4Done ? "is-ok" : "is-bad"}">${esc(st.stage4Msg)}</div>` : ""}
        `;
      };

      ctx.body.innerHTML = `
        <div class="cap-case-shell">
          <div class="cap-stage-bar">
            ${stageLabels.map((lbl, idx) => {
              const unlocked = idx <= st.maxStage || isCompleted(CASES[0].id);
              const done = st.passedStages.has(idx) || isCompleted(CASES[0].id);
              return `<button type="button" class="cap-stage-btn ${st.stage === idx ? "is-cur" : ""} ${done ? "is-done" : ""}" data-cstage="${idx}" ${unlocked ? "" : "disabled"}>${done ? "✔ " : ""}${esc(lbl)}</button>`;
            }).join("")}
          </div>
          <div class="cap-stage-body">${renderStageContent()}</div>
        </div>
      `;

      ctx.body.querySelectorAll("[data-scrollable='true']").forEach((el) => {
        el.addEventListener("wheel", (e) => e.stopPropagation(), { passive: true });
        el.addEventListener("touchmove", (e) => e.stopPropagation(), { passive: true });
      });

      ctx.body.querySelectorAll("[data-cstage]").forEach((btn) => {
        btn.addEventListener("click", () => {
          st.stage = Number(btn.dataset.cstage);
          render();
        });
      });

      if (st.stage === 0) {
        ctx.body.querySelectorAll("[data-kill]").forEach((btn) => {
          btn.addEventListener("click", () => {
            const pid = Number(btn.dataset.kill);
            const proc = ZERO_DAY_PROCESSES.find((p) => p.pid === pid);
            if (!proc) return;
            if (proc.kind === "system" || proc.kind === "benign") {
              st.stage1Msg = `⚠️ 不可誤殺系統或正常校慶服務程序（${proc.name}）！請追蹤占用記憶體與磁碟 I/O 的可疑程序樹。`;
            } else if (proc.kind === "child_malicious") {
              st.stage1Msg = `⚠️ 子程序 ${proc.name} (PID ${proc.pid}) 被母程序 PPID ${proc.ppid} 自動重啟！請沿著 PPID 終止根源惡意母程序。`;
            } else {
              st.killedPids.add(pid);
              st.passedStages.add(0);
              st.maxStage = Math.max(st.maxStage, 1);
              st.stage1Msg = "✅ 成功終止根源惡意程序 PID 1337！已擷取其子程序連線線索：異常埠號 8443、外洩時間 13:42:18。";
            }
            render();
          });
        });
        const go2 = ctx.body.querySelector("#zdGoStage2");
        if (go2) go2.addEventListener("click", () => { st.stage = 1; render(); });
      } else if (st.stage === 1) {
        ctx.body.querySelector("#zdPortInput").addEventListener("change", (e) => { st.portInput = e.target.value; render(); });
        ctx.body.querySelector("#zdPortInput").addEventListener("keydown", (e) => { if (e.key === "Enter") { st.portInput = e.target.value; render(); } });
        ctx.body.querySelector("#zdTimeFilter").addEventListener("change", (e) => { st.timeFilter = e.target.value; render(); });
        ctx.body.querySelectorAll("[data-b64]").forEach((btn) => {
          btn.addEventListener("click", () => {
            st.b64Input = btn.dataset.b64;
            st.b64Decoded = safeDecodeBase64(st.b64Input);
            render();
          });
        });
        ctx.body.querySelector("#zdDecodeBtn").addEventListener("click", () => {
          st.b64Input = ctx.body.querySelector("#zdB64Input").value;
          st.b64Decoded = safeDecodeBase64(st.b64Input);
          render();
        });
        ctx.body.querySelector("#zdTlsChoice").addEventListener("change", (e) => { st.tlsChoice = e.target.value; });
        ctx.body.querySelector("#zdNodeInput").addEventListener("input", (e) => { st.nodeInput = e.target.value; });
        ctx.body.querySelector("#zdVerifyS2").addEventListener("click", () => {
          st.portInput = ctx.body.querySelector("#zdPortInput").value.trim();
          st.tlsChoice = ctx.body.querySelector("#zdTlsChoice").value;
          st.nodeInput = ctx.body.querySelector("#zdNodeInput").value.trim().toUpperCase();
          if (st.portInput !== "8443") {
            st.stage2Msg = "❌ 請先以 Stage 1 的異常埠號 8443 過濾 PCAP 封包。";
          } else if (st.tlsChoice !== "self_expired") {
            st.stage2Msg = "❌ 請檢視封包 #14 的 TLS 憑證破綻（Self-Signed 且過期）！";
          } else if (st.nodeInput !== "DB_NODE_07") {
            st.stage2Msg = "❌ 資料庫節點代碼不正確，請解碼 13:42:18 封包的 Base64 負載！";
          } else {
            st.passedStages.add(1);
            st.maxStage = Math.max(st.maxStage, 2);
            st.stage2Msg = "✅ 網路封包鑑識成功！已確認遭入侵節點為 DB_NODE_07。";
          }
          render();
        });
        const go3 = ctx.body.querySelector("#zdGoStage3");
        if (go3) go3.addEventListener("click", () => { st.stage = 2; render(); });
      } else if (st.stage === 2) {
        ctx.body.querySelector("#zdLoadDbBtn").addEventListener("click", () => {
          st.dbQueryInput = ctx.body.querySelector("#zdDbQueryInput").value.trim().toUpperCase();
          if (st.dbQueryInput === "DB_NODE_07") {
            st.dbLoaded = true;
            st.stage3Msg = "";
          } else {
            st.dbLoaded = false;
            st.stage3Msg = "❌ 查無此資料庫節點，請輸入 Stage 2 解碼出的節點代碼！";
          }
          render();
        });
        const mm = ctx.body.querySelector("#zdOnlyMismatch");
        if (mm) mm.addEventListener("change", (e) => { st.onlyMismatch = e.target.checked; render(); });
        ctx.body.querySelectorAll("[data-mark-tx]").forEach((cb) => {
          cb.addEventListener("change", () => {
            const id = cb.dataset.markTx;
            if (cb.checked) st.markedTxIds.add(id);
            else st.markedTxIds.delete(id);
            render();
          });
        });
        const saEl = ctx.body.querySelector("#zdShortAmt");
        if (saEl) saEl.addEventListener("input", (e) => { st.shortAmountInput = e.target.value; });
        const haEl = ctx.body.querySelector("#zdHackerAcc");
        if (haEl) haEl.addEventListener("input", (e) => { st.hackerAccInput = e.target.value; });
        const v3 = ctx.body.querySelector("#zdVerifyS3");
        if (v3) {
          v3.addEventListener("click", () => {
            st.shortAmountInput = ctx.body.querySelector("#zdShortAmt").value.trim();
            st.hackerAccInput = ctx.body.querySelector("#zdHackerAcc").value.trim().toUpperCase();
            const forgedIds = ZERO_DAY_LEDGER.filter((r) => r.forged).map((r) => r.txId);
            const markedOk = st.markedTxIds.size === 3 && forgedIds.every((id) => st.markedTxIds.has(id));
            const cleanAmt = Number(st.shortAmountInput.replace(/[$,\s]/g, ""));
            if (!markedOk) {
              st.stage3Msg = "❌ 請正確標記出所有 3 筆檢核碼異常的偽造交易列（TX-0714、TX-0721、TX-0728）！";
            } else if (cleanAmt !== 14850) {
              st.stage3Msg = "❌ 短少總金額計算有誤，請加總該 3 筆偽造交易的金額（4950 + 5200 + 4700）。";
            } else if (st.hackerAccInput !== "USR-904") {
              st.stage3Msg = "❌ 駭客內部帳號不正確，請檢視偽造交易列所屬帳號欄位！";
            } else {
              st.passedStages.add(2);
              st.maxStage = Math.max(st.maxStage, 3);
              st.stage3Msg = "✅ 帳務稽核完成！已鎖定異常金額 $14,850 與內部帳號 USR-904。";
            }
            render();
          });
        }
        const go4 = ctx.body.querySelector("#zdGoStage4");
        if (go4) go4.addEventListener("click", () => { st.stage = 3; render(); });
      } else if (st.stage === 3) {
        ctx.body.querySelector("#zdLine1Op").addEventListener("change", (e) => { st.line1Op = e.target.value; });
        ctx.body.querySelector("#zdLine2Op").addEventListener("change", (e) => {
          st.line2Op = e.target.value;
          const mirror = ctx.body.querySelector(".cap-op-mirror");
          if (mirror) mirror.textContent = st.line2Op;
        });
        ctx.body.querySelector("#zdRunTests").addEventListener("click", () => {
          st.line1Op = ctx.body.querySelector("#zdLine1Op").value;
          st.line2Op = ctx.body.querySelector("#zdLine2Op").value;
          const evalRes = evaluateZeroDayPatch(st.line1Op, st.line2Op);
          st.testResults = evalRes.results;
          if (evalRes.allPassed) {
            st.passedStages.add(3);
            st.stage4Msg = "✅ 全部 5 組極端邊界單元測試全數通過！USR-904 攻擊漏洞已正式修補結案！";
            if (!st.solvedNotified) {
              st.solvedNotified = true;
              ctx.pass();
            }
          } else {
            st.stage4Msg = "❌ 部分單元測試未通過！請確認同時修復「負數與 0 阻擋 (<=)」與「超過才拒絕 (>)」。";
          }
          render();
        });
      }
    };

    render();
  }

  /* ========================================================================
   * 案件二：《失控的智慧城市：無人配送車隊調度風暴》資料集
   * ======================================================================== */
  const AI_SAMPLE_PACKS = [
    { id: "rain_night", name: "夜間暴雨＋車燈濕滑路面反光樣本 (180 張)", deltaTp: 20, deltaFp: -1, deltaFn: -18, good: true, desc: "精準補足低光源雨天辨識盲區" },
    { id: "rain_dusk", name: "黃昏積水倒影＋行人深色雨衣邊界樣本 (140 張)", deltaTp: 14, deltaFp: 0, deltaFn: -12, good: true, desc: "大幅降低積水倒影造成之偽陰性漏判" },
    { id: "sunny_hwy", name: "晴天高速公路晴朗乾燥路面 (300 張)", deltaTp: 1, deltaFp: 4, deltaFn: 0, good: false, desc: "資料分佈偏斜，反增雨天反光誤判率" },
    { id: "dup_day", name: "既有白天晴天複製擴增樣本 (250 張)", deltaTp: 0, deltaFp: 6, deltaFn: 2, good: false, desc: "過擬合白天場景，降低極端天氣泛化能力" },
    { id: "blur_noise", name: "鏡頭嚴重遮蔽無標註雜訊圖 (120 張)", deltaTp: 0, deltaFp: 11, deltaFn: 3, good: false, desc: "未清洗雜訊污染分類邊界" }
  ];

  function computeAiMetrics(selectedIds) {
    let tp = 72, fp = 7, fn = 38, tn = 183;
    AI_SAMPLE_PACKS.forEach((p) => {
      if (selectedIds.has(p.id)) {
        tp += p.deltaTp;
        fp += p.deltaFp;
        fn += p.deltaFn;
      }
    });
    tp = Math.max(1, tp); fp = Math.max(0, fp); fn = Math.max(0, fn);
    const precision = tp / (tp + fp);
    const recall = tp / (tp + fn);
    const f1 = (2 * precision * recall) / (precision + recall);
    return { tp, fp, fn, tn, precision, recall, f1 };
  }

  // 8 節點城市雙權重路網
  const CITY_NODES = [
    { id: "N0", label: "N0 倉儲", x: 65, y: 120, charge: 0 },
    { id: "N1", label: "N1 北區", x: 185, y: 55, charge: 0 },
    { id: "N2", label: "N2 南區", x: 185, y: 185, charge: 0 },
    { id: "N3", label: "N3 ⚡充電站", x: 315, y: 120, charge: 35 },
    { id: "N4", label: "N4 高架", x: 315, y: 40, charge: 0 },
    { id: "N5", label: "N5 園區", x: 445, y: 80, charge: 0 },
    { id: "N6", label: "N6 港區", x: 445, y: 175, charge: 0 },
    { id: "N7", label: "N7 終點", x: 565, y: 120, charge: 0 }
  ];
  const CITY_NODE_MAP = Object.fromEntries(CITY_NODES.map((n) => [n.id, n]));
  const CITY_EDGES = [
    { from: "N0", to: "N1", time: 4, batt: 32 },
    { from: "N0", to: "N2", time: 5, batt: 25 },
    { from: "N1", to: "N4", time: 4, batt: 38 },
    { from: "N1", to: "N3", time: 6, batt: 20 }, // 含進站充電時間
    { from: "N2", to: "N3", time: 8, batt: 22 },
    { from: "N2", to: "N5", time: 6, batt: 45 },
    { from: "N3", to: "N5", time: 4, batt: 28 },
    { from: "N3", to: "N6", time: 6, batt: 35 },
    { from: "N4", to: "N7", time: 5, batt: 22 }, // N0->N1->N4->N7 剩 8% < 15% 陷阱!
    { from: "N4", to: "N6", time: 4, batt: 18 },
    { from: "N5", to: "N7", time: 7, batt: 24 }, // N0->N2->N5->N7 剩 6% < 15% 陷阱!
    { from: "N6", to: "N7", time: 5, batt: 18 }
  ];

  const CC_ASSETS = [
    { id: "opencity", name: "OpenCity-Vector-v2", license: "CC BY 4.0", desc: "商業市政可使用，只需標示原作者", shouldKeep: true },
    { id: "metromap", name: "MetroMap-Pro-Free", license: "CC BY-NC 4.0", desc: "非商業條款 (NC)：嚴禁商業車隊營運使用", shouldKeep: false },
    { id: "twroad", name: "TaiwanRoad-HD", license: "CC BY-SA 4.0", desc: "允許商業與改作，衍生圖資需同條款分享", shouldKeep: true },
    { id: "geonight", name: "GeoNight-Tiles", license: "CC BY-ND 4.0", desc: "禁止改作條款 (ND)：無法融合裁切進車載導航", shouldKeep: false }
  ];

  // 24 筆遙測感測器讀值：t=8 為單點突波 (92)，t=18..20 為連續 3 次真實異常 (96, 98, 100)
  const TELEM_SERIES = [
    49, 51, 50, 48, 52, 50, 51, 92, // t=1..8 (index 0..7)
    50, 49, 51, 50, 48, 52, 50, 49, 51, // t=9..17 (index 8..16)
    96, 98, 100, 99, 97, 98, 96 // t=18..24 (index 17..23)
  ];

  function evalTelemetry(windowSize, kSigma, consecReq) {
    const baseMean = 50;
    const baseSigma = 5;
    const threshold = baseMean + kSigma * baseSigma;
    const ma = TELEM_SERIES.map((_, i) => {
      const start = Math.max(0, i - windowSize + 1);
      const slice = TELEM_SERIES.slice(start, i + 1);
      return slice.reduce((a, b) => a + b, 0) / slice.length;
    });
    let streak = 0;
    let falseTripAt = null;
    let realTripAt = null;
    ma.forEach((v, idx) => {
      const tick = idx + 1;
      if (v > threshold) {
        streak++;
        if (streak >= consecReq) {
          if (tick <= 17 && falseTripAt === null) falseTripAt = tick;
          if (tick >= 18 && realTripAt === null) realTripAt = tick;
        }
      } else {
        streak = 0;
      }
    });
    const ok = falseTripAt === null && realTripAt !== null && realTripAt <= 20;
    return { ma, threshold, falseTripAt, realTripAt, ok };
  }

  function mountSmartCityCase(ctx) {
    const st = {
      stage: 0,
      maxStage: 0,
      passedStages: new Set(),
      // Stage 1
      selectedPacks: new Set(),
      stage1Msg: "",
      // Stage 2
      firmwareInput: "",
      firmwareLoaded: false,
      route: ["N0"],
      stage2Msg: "",
      // Stage 3
      fleetTokenInput: "",
      fleetLoaded: false,
      roleEng: "admin",
      roleDisp: "dispatch",
      roleIntern: "readonly",
      branchLock: false,
      assetChoice: { opencity: "keep", metromap: "keep", twroad: "keep", geonight: "keep" },
      stage3Msg: "",
      // Stage 4
      telemKeyInput: "",
      telemLoaded: false,
      winSize: 1,
      kSigma: 2.0,
      consecReq: 2,
      stage4Msg: "",
      solvedNotified: false
    };

    const stageLabels = [
      "Stage 1｜AI 智慧島：混淆矩陣補樣",
      "Stage 2｜演算法山：雙權重路徑調度",
      "Stage 3｜創作協作島：權限與 CC 授權",
      "Stage 4｜資料×程式：濾波與熔斷調校"
    ];

    const evalRoute = () => {
      let batt = 100;
      let time = 0;
      let minBatt = 100;
      let failedUnder15 = false;
      for (let i = 0; i < st.route.length - 1; i++) {
        const edge = CITY_EDGES.find((e) => e.from === st.route[i] && e.to === st.route[i + 1]);
        if (!edge) break;
        time += edge.time;
        batt -= edge.batt;
        if (batt < minBatt) minBatt = batt;
        if (batt < 15) failedUnder15 = true;
        const dst = CITY_NODE_MAP[edge.to];
        if (dst && dst.charge > 0) batt = Math.min(100, batt + dst.charge);
      }
      return { batt, time, minBatt, failedUnder15 };
    };

    const render = () => {
      const renderStageContent = () => {
        if (st.stage === 0) {
          const m = computeAiMetrics(st.selectedPacks);
          const stage1Done = st.passedStages.has(0);
          return `
            <div class="cap-brief">
              <b>📌 鑑識任務（AI 智慧島）：</b>雨夜無人車發生煞車不及事故！檢視目前模型的混淆矩陣，從資料池挑選合適的<b>「低光源＋濕滑反光路面」</b>邊界樣本（避開偏斜或雜訊包），重新訓練使 <b>F1-score 突破 0.92</b>，取得安全韌體版本代碼！
            </div>
            <div class="cap-grid-2">
              <div class="cap-box">
                <b>📊 混淆矩陣 (Confusion Matrix)</b>
                <div class="cap-cm-grid">
                  <div class="cap-cm-cell ok"><span>TP (正確偵測障礙)</span><b>${m.tp}</b></div>
                  <div class="cap-cm-cell warn"><span>FP (誤報煞車)</span><b>${m.fp}</b></div>
                  <div class="cap-cm-cell bad"><span>FN (漏判危險障礙!)</span><b>${m.fn}</b></div>
                  <div class="cap-cm-cell"><span>TN (安全通行)</span><b>${m.tn}</b></div>
                </div>
                <div class="cap-hud-row" style="margin-top:8px;">
                  <span class="cap-pill">Precision：<b>${m.precision.toFixed(3)}</b></span>
                  <span class="cap-pill">Recall：<b>${m.recall.toFixed(3)}</b></span>
                  <span class="cap-pill ${m.f1 >= 0.92 ? "is-ok" : "is-bad"}">F1-score：<b>${m.f1.toFixed(3)}</b> (門檻 &ge; 0.920)</span>
                </div>
              </div>
              <div class="cap-box">
                <b>🧪 候選補齊訓練資料池（勾選後按重新訓練）</b>
                <div class="cap-pack-list">
                  ${AI_SAMPLE_PACKS.map((pk) => `
                    <label class="cap-pack-item ${st.selectedPacks.has(pk.id) ? "is-sel" : ""}">
                      <input type="checkbox" data-aipack="${pk.id}" ${st.selectedPacks.has(pk.id) ? "checked" : ""} />
                      <div><b>${esc(pk.name)}</b><small>${esc(pk.desc)}</small></div>
                    </label>
                  `).join("")}
                </div>
                <button type="button" class="cap-btn is-accent" id="scTrainBtn" style="margin-top:8px;">🧠 重新訓練並評估模型</button>
              </div>
            </div>
            ${st.stage1Msg ? `<div class="cap-msg ${stage1Done ? "is-ok" : "is-bad"}">${esc(st.stage1Msg)}</div>` : ""}
            ${stage1Done ? `<div class="cap-next-bar">
              <span>🔑 已解鎖安全韌體版本代碼：<code>v4.2-SAFE</code></span>
              <button type="button" class="cap-btn is-accent" id="scGoStage2">➡ 前往 Stage 2 規劃無人車配送路線</button>
            </div>` : ""}
          `;
        }

        if (st.stage === 1) {
          const curNode = st.route[st.route.length - 1];
          const rInfo = evalRoute();
          const nextEdges = CITY_EDGES.filter((e) => e.from === curNode && !st.route.includes(e.to));
          const reachedEnd = curNode === "N7";
          const routeOk = reachedEnd && !rInfo.failedUnder15 && rInfo.time <= 24;
          const stage2Done = st.passedStages.has(1);

          const edgesSvg = CITY_EDGES.map((e) => {
            const a = CITY_NODE_MAP[e.from], b = CITY_NODE_MAP[e.to];
            const inRoute = st.route.some((nid, idx) => nid === e.from && st.route[idx + 1] === e.to);
            const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
            return `
              <line x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}" stroke="${inRoute ? "#34d399" : "rgba(148,163,184,0.45)"}" stroke-width="${inRoute ? 3.2 : 1.8}" marker-end="url(#sc-arr)" />
              <rect x="${mx - 28}" y="${my - 10}" width="56" height="17" rx="5" fill="#0f172a" opacity="0.88" />
              <text x="${mx}" y="${my + 2}" text-anchor="middle" fill="${inRoute ? "#6ee7b7" : "#fde68a"}" font-size="9" font-weight="700">${e.time}m / -${e.batt}%</text>
            `;
          }).join("");

          const nodesSvg = CITY_NODES.map((n) => {
            const visited = st.route.includes(n.id);
            const isCur = curNode === n.id;
            const fill = n.charge > 0 ? "#065f46" : (isCur ? "#1d4ed8" : (visited ? "#0f766e" : "#1e293b"));
            const stroke = isCur ? "#38bdf8" : (n.charge > 0 ? "#34d399" : "#64748b");
            return `
              <g>
                <circle cx="${n.x}" cy="${n.y}" r="22" fill="${fill}" stroke="${stroke}" stroke-width="${isCur ? 3 : 2}" />
                <text x="${n.x}" y="${n.y + 4}" text-anchor="middle" fill="#fff" font-size="10.5" font-weight="900">${esc(n.id)}</text>
                <text x="${n.x}" y="${n.y + 34}" text-anchor="middle" fill="#cbd5e1" font-size="9.5" font-weight="700">${esc(n.label.replace(n.id, "").trim())}</text>
              </g>
            `;
          }).join("");

          return `
            <div class="cap-brief">
              <b>📌 鑑識任務（演算法山）：</b>輸入 Stage 1 解鎖的<b>安全韌體版本代碼</b>後，在 8 節點城市路網逐點規劃從 <code>N0</code> 到 <code>N7</code> 的路線：途經<b>任何節點剩餘電量必須維持 &ge; 15%</b>，且<b>總耗時 &le; 24 分鐘</b>！（提示：貪心直衝將使電量跌破 15%，必須繞行充電站）
            </div>
            <div class="cap-filter-bar">
              <label>安全韌體版本：<input type="text" id="scFwInput" value="${esc(st.firmwareInput)}" placeholder="輸入 Stage 1 韌體代碼" /></label>
              <button type="button" class="cap-btn is-cmd" id="scLoadFwBtn">⚙️ 載入韌體並啟動路網</button>
            </div>
            ${st.firmwareLoaded ? `
              <div class="cap-hud-row">
                <span class="cap-pill ${rInfo.failedUnder15 ? "is-bad" : "is-ok"}">目前電量：<b>${rInfo.batt}%</b> (全程最低 ${rInfo.minBatt}% · 需 &ge; 15%)</span>
                <span class="cap-pill ${rInfo.time > 24 ? "is-bad" : ""}">累積耗時：<b>${rInfo.time}</b> / 24 分鐘</span>
                <span class="cap-pill">目前路線：<code>${st.route.join(" → ")}</code></span>
              </div>
              <div class="dojo-svg-wrap">
                <svg viewBox="0 0 630 230" class="dojo-svg" role="img" aria-label="8 節點雙權重配送路網">
                  <defs><marker id="sc-arr" viewBox="0 0 10 10" refX="17" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M 0 1 L 10 5 L 0 9 z" fill="#94a3b8" /></marker></defs>
                  ${edgesSvg}
                  ${nodesSvg}
                </svg>
              </div>
              <div class="cap-ctrl-row">
                ${nextEdges.map((e) => `<button type="button" class="cap-btn is-cmd" data-next-node="${e.to}" ${rInfo.failedUnder15 ? "disabled" : ""}>➡ 前往 ${e.to} (${e.time}m, -${e.batt}%)</button>`).join("")}
                <button type="button" class="cap-btn is-ghost" id="scRouteUndo" ${st.route.length <= 1 ? "disabled" : ""}>↩ 退回</button>
                <button type="button" class="cap-btn is-ghost" id="scRouteReset">🔄 重置路線</button>
              </div>
              ${rInfo.failedUnder15 ? `<div class="cap-msg is-bad">⚠️ 危險！途中剩餘電量曾跌至 ${rInfo.minBatt}%（低於 15% 安全下限），車輛拋錨！請退回並繞行 ⚡ N3 充電站！</div>` : ""}
              ${reachedEnd && !rInfo.failedUnder15 && !routeOk ? `<div class="cap-msg is-bad">⚠️ 總時間 ${rInfo.time} 分鐘超過 24 分鐘配送時限！請嘗試更快的充電路徑。</div>` : ""}
            ` : `<div class="cap-empty">🔒 請輸入 Stage 1 取得的韌體版本代碼（如 <code>v4.X-XXXX</code>）啟動無人車路網模擬。</div>`}
            ${st.stage2Msg ? `<div class="cap-msg ${stage2Done ? "is-ok" : "is-bad"}">${esc(st.stage2Msg)}</div>` : ""}
            ${stage2Done ? `<div class="cap-next-bar">
              <span>🔑 已取得車隊更新授權金鑰：<code>FLEET-SYNC-500</code></span>
              <button type="button" class="cap-btn is-accent" id="scGoStage3">➡ 前往 Stage 3 設定車隊協作與授權</button>
            </div>` : ""}
          `;
        }

        if (st.stage === 2) {
          const stage3Done = st.passedStages.has(2);
          return `
            <div class="cap-brief">
              <b>📌 鑑識任務（創作協作島）：</b>輸入 Stage 2 取得的<b>車隊更新金鑰</b>開啟 500 台商用市政車隊更新庫：設定最小權限分工與主幹保護鎖定，並審查 4 套第三方圖資套件，剔除違反<b>「商業市政用途」</b>與<b>「需改作整合」</b>之授權條款！
            </div>
            <div class="cap-filter-bar">
              <label>車隊更新金鑰：<input type="text" id="scFleetInput" value="${esc(st.fleetTokenInput)}" placeholder="輸入 Stage 2 金鑰" /></label>
              <button type="button" class="cap-btn is-cmd" id="scLoadFleetBtn">🔓 解鎖 500 台車隊協作庫</button>
            </div>
            ${st.fleetLoaded ? `
              <div class="cap-grid-2">
                <div class="cap-box">
                  <b>👥 車隊更新庫角色權限與保護鎖定</b>
                  <label class="cap-field">核心韌體工程師：
                    <select id="scRoleEng">
                      <option value="admin" ${st.roleEng === "admin" ? "selected" : ""}>可編輯與發起合併（需覆核）</option>
                      <option value="readonly" ${st.roleEng === "readonly" ? "selected" : ""}>僅唯讀檢視</option>
                    </select>
                  </label>
                  <label class="cap-field">區域調度督導：
                    <select id="scRoleDisp">
                      <option value="admin" ${st.roleDisp === "admin" ? "selected" : ""}>完全修改核心韌體權限</option>
                      <option value="dispatch" ${st.roleDisp === "dispatch" ? "selected" : ""}>僅調度參數／檢視（不可改寫核心碼）</option>
                    </select>
                  </label>
                  <label class="cap-field">外部實習檢視員：
                    <select id="scRoleIntern">
                      <option value="dispatch" ${st.roleIntern === "dispatch" ? "selected" : ""}>可修改線上調度參數</option>
                      <option value="readonly" ${st.roleIntern === "readonly" ? "selected" : ""}>僅唯讀檢視（最小權限原則）</option>
                    </select>
                  </label>
                  <label class="cap-chk" style="margin-top:6px;"><input type="checkbox" id="scBranchLock" ${st.branchLock ? "checked" : ""} /> 啟用「主幹分支保護鎖定與雙人簽章覆核」</label>
                </div>
                <div class="cap-box">
                  <b>📜 第三方圖資創用 CC 授權審查（商業＋改作）</b>
                  <div class="cap-cc-list">
                    ${CC_ASSETS.map((a) => `
                      <div class="cap-cc-row">
                        <div><b>${esc(a.name)}</b> <span class="cap-cc-tag">${esc(a.license)}</span><small>${esc(a.desc)}</small></div>
                        <select data-cc="${a.id}">
                          <option value="keep" ${st.assetChoice[a.id] === "keep" ? "selected" : ""}>✅ 保留使用</option>
                          <option value="reject" ${st.assetChoice[a.id] === "reject" ? "selected" : ""}>🚫 剔除違規套件</option>
                        </select>
                      </div>
                    `).join("")}
                  </div>
                </div>
              </div>
              <div class="cap-ctrl-row"><button type="button" class="cap-btn is-accent" id="scVerifyS3">🛡️ 驗證權限與圖資合規性</button></div>
            ` : `<div class="cap-empty">🔒 請輸入 Stage 2 核發之金鑰以開啟 500 台商用車隊更新庫。</div>`}
            ${st.stage3Msg ? `<div class="cap-msg ${stage3Done ? "is-ok" : "is-bad"}">${esc(st.stage3Msg)}</div>` : ""}
            ${stage3Done ? `<div class="cap-next-bar">
              <span>🔑 已取得遙測校正密鑰：<code>TELEM-MA-K3</code></span>
              <button type="button" class="cap-btn is-accent" id="scGoStage4">➡ 前往 Stage 4 調校遙測熔斷器</button>
            </div>` : ""}
          `;
        }

        const evalT = evalTelemetry(st.winSize, st.kSigma, st.consecReq);
        const stage4Done = st.passedStages.has(3);
        const svgW = 580, svgH = 195, padL = 36, padR = 16, padT = 16, padB = 26;
        const plotW = svgW - padL - padR, plotH = svgH - padT - padB;
        const mapX = (i) => padL + (i / (TELEM_SERIES.length - 1)) * plotW;
        const mapY = (v) => padT + (1 - Math.max(0, Math.min(110, v)) / 110) * plotH;
        const rawPts = TELEM_SERIES.map((v, i) => `${mapX(i).toFixed(1)},${mapY(v).toFixed(1)}`).join(" ");
        const maPts = evalT.ma.map((v, i) => `${mapX(i).toFixed(1)},${mapY(v).toFixed(1)}`).join(" ");
        const thrY = mapY(evalT.threshold).toFixed(1);

        return `
          <div class="cap-brief">
            <b>📌 鑑識任務（資料海灣島 × 程式森林島）：</b>輸入 Stage 3 的<b>遙測校正密鑰</b>載入感測器波形。第 8 筆為<b>單點雜訊突波 (92)</b>，第 18~20 筆為<b>連續 3 次真實異常 (96, 98, 100)</b>。請調整移動平均滑動視窗 <code>W</code>、標準差倍數 <code>K</code>（閾值 = 50 + K×5）與連續次數 <code>C</code>，做到<b>過濾單點雜訊 0 誤報</b>並於真實異常第 3 次即時熔斷停機！
          </div>
          <div class="cap-filter-bar">
            <label>遙測校正密鑰：<input type="text" id="scTelemKey" value="${esc(st.telemKeyInput)}" placeholder="輸入 Stage 3 密鑰" /></label>
            <button type="button" class="cap-btn is-cmd" id="scLoadTelemBtn">📡 載入遙測濾波引擎</button>
          </div>
          ${st.telemLoaded ? `
            <div class="cap-hud-row">
              <span class="cap-pill">滑動視窗 W：<b>${st.winSize}</b></span>
              <span class="cap-pill">熔斷閾值：<b>${evalT.threshold.toFixed(1)}</b> (50 + ${st.kSigma}σ)</span>
              <span class="cap-pill">連續觸發門檻：<b>${st.consecReq}</b> 次</span>
              <span class="cap-pill ${evalT.falseTripAt ? "is-bad" : "is-ok"}">${evalT.falseTripAt ? `⚠️ t=${evalT.falseTripAt} 誤停機` : "✅ 單點雜訊 0 誤報"}</span>
              <span class="cap-pill ${evalT.realTripAt && evalT.realTripAt <= 20 ? "is-ok" : "is-bad"}">${evalT.realTripAt ? `🛑 t=${evalT.realTripAt} 觸發停機` : "❌ 未觸發真實熔斷"}</span>
            </div>
            <div class="dojo-svg-wrap">
              <svg viewBox="0 0 ${svgW} ${svgH}" class="dojo-svg" role="img" aria-label="移動平均與熔斷閾值遙測圖">
                <line x1="${padL}" y1="${thrY}" x2="${svgW - padR}" y2="${thrY}" stroke="#f87171" stroke-width="1.8" stroke-dasharray="6 4" />
                <text x="${svgW - padR}" y="${Number(thrY) - 5}" text-anchor="end" fill="#fca5a5" font-size="9.5" font-weight="800">熔斷閾值 ${evalT.threshold.toFixed(1)}</text>
                <polyline fill="none" stroke="rgba(148,163,184,0.45)" stroke-width="1.4" points="${rawPts}" />
                <polyline fill="none" stroke="#38bdf8" stroke-width="2.6" points="${maPts}" />
                ${TELEM_SERIES.map((v, i) => `<circle cx="${mapX(i).toFixed(1)}" cy="${mapY(v).toFixed(1)}" r="${i === 7 ? 4.5 : (i >= 17 && i <= 19 ? 4.5 : 2.5)}" fill="${i === 7 ? "#fbbf24" : (i >= 17 && i <= 19 ? "#f87171" : "#94a3b8")}" />`).join("")}
                <text x="${mapX(7)}" y="12" text-anchor="middle" fill="#fde68a" font-size="9">t=8 單點突波</text>
                <text x="${mapX(18)}" y="12" text-anchor="middle" fill="#fca5a5" font-size="9">t=18~20 真實異常</text>
              </svg>
            </div>
            <div class="cap-grid-2">
              <div class="cap-box">
                <label class="cap-field">移動平均視窗大小 W (1 ~ 7)：<b>${st.winSize}</b>
                  <input type="range" id="scWinRange" min="1" max="7" step="1" value="${st.winSize}" />
                </label>
                <label class="cap-field">標準差熔斷倍數 K (1.5 ~ 5.0)：<b>${st.kSigma.toFixed(1)}σ</b>
                  <input type="range" id="scKRange" min="1.5" max="5.0" step="0.5" value="${st.kSigma}" />
                </label>
              </div>
              <div class="cap-box">
                <label class="cap-field">連續異常停機門檻 (次)：
                  <select id="scConsecSel">
                    ${[1, 2, 3, 4].map((c) => `<option value="${c}" ${st.consecReq === c ? "selected" : ""}>連續 ${c} 次超標觸發停機</option>`).join("")}
                  </select>
                </label>
                <button type="button" class="cap-btn is-accent" id="scVerifyS4" style="margin-top:8px;">🚀 部署濾波與熔斷參數結案</button>
              </div>
            </div>
          ` : `<div class="cap-empty">🔒 請輸入 Stage 3 取得的遙測校正密鑰以啟動感測器濾波器調校台。</div>`}
          ${st.stage4Msg ? `<div class="cap-msg ${stage4Done ? "is-ok" : "is-bad"}">${esc(st.stage4Msg)}</div>` : ""}
        `;
      };

      ctx.body.innerHTML = `
        <div class="cap-case-shell">
          <div class="cap-stage-bar">
            ${stageLabels.map((lbl, idx) => {
              const unlocked = idx <= st.maxStage || isCompleted(CASES[1].id);
              const done = st.passedStages.has(idx) || isCompleted(CASES[1].id);
              return `<button type="button" class="cap-stage-btn ${st.stage === idx ? "is-cur" : ""} ${done ? "is-done" : ""}" data-cstage="${idx}" ${unlocked ? "" : "disabled"}>${done ? "✔ " : ""}${esc(lbl)}</button>`;
            }).join("")}
          </div>
          <div class="cap-stage-body">${renderStageContent()}</div>
        </div>
      `;

      ctx.body.querySelectorAll("[data-scrollable='true']").forEach((el) => {
        el.addEventListener("wheel", (e) => e.stopPropagation(), { passive: true });
        el.addEventListener("touchmove", (e) => e.stopPropagation(), { passive: true });
      });

      ctx.body.querySelectorAll("[data-cstage]").forEach((btn) => {
        btn.addEventListener("click", () => { st.stage = Number(btn.dataset.cstage); render(); });
      });

      if (st.stage === 0) {
        ctx.body.querySelectorAll("[data-aipack]").forEach((cb) => {
          cb.addEventListener("change", () => {
            if (cb.checked) st.selectedPacks.add(cb.dataset.aipack);
            else st.selectedPacks.delete(cb.dataset.aipack);
            render();
          });
        });
        ctx.body.querySelector("#scTrainBtn").addEventListener("click", () => {
          const m = computeAiMetrics(st.selectedPacks);
          if (m.f1 >= 0.92) {
            st.passedStages.add(0);
            st.maxStage = Math.max(st.maxStage, 1);
            st.stage1Msg = `✅ 重新訓練完成！F1-score 提升至 ${m.f1.toFixed(3)} (≥ 0.92)，安全韌體 v4.2-SAFE 已簽發！`;
          } else {
            st.stage1Msg = `❌ 目前 F1-score 僅 ${m.f1.toFixed(3)}（未達 0.92）。請專注補齊「低光源＋濕滑反光」邊界樣本，避免加入晴天或雜訊資料！`;
          }
          render();
        });
        const go2 = ctx.body.querySelector("#scGoStage2");
        if (go2) go2.addEventListener("click", () => { st.stage = 1; render(); });
      } else if (st.stage === 1) {
        ctx.body.querySelector("#scLoadFwBtn").addEventListener("click", () => {
          st.firmwareInput = ctx.body.querySelector("#scFwInput").value.trim();
          if (st.firmwareInput.toUpperCase() === "V4.2-SAFE") {
            st.firmwareLoaded = true;
            st.stage2Msg = "";
          } else {
            st.firmwareLoaded = false;
            st.stage2Msg = "❌ 韌體版本代碼錯誤，請輸入 Stage 1 解鎖的 v4.2-SAFE！";
          }
          render();
        });
        ctx.body.querySelectorAll("[data-next-node]").forEach((btn) => {
          btn.addEventListener("click", () => {
            st.route.push(btn.dataset.nextNode);
            const rInfo = evalRoute();
            if (btn.dataset.nextNode === "N7" && !rInfo.failedUnder15 && rInfo.time <= 24) {
              st.passedStages.add(1);
              st.maxStage = Math.max(st.maxStage, 2);
              st.stage2Msg = `✅ 安全抵達終點 N7！總耗時 ${rInfo.time} 分鐘，全程最低電量 ${rInfo.minBatt}% ≥ 15%，已核發車隊更新金鑰 FLEET-SYNC-500！`;
            }
            render();
          });
        });
        const uBtn = ctx.body.querySelector("#scRouteUndo");
        if (uBtn) uBtn.addEventListener("click", () => { if (st.route.length > 1) { st.route.pop(); render(); } });
        const rBtn = ctx.body.querySelector("#scRouteReset");
        if (rBtn) rBtn.addEventListener("click", () => { st.route = ["N0"]; st.stage2Msg = ""; render(); });
        const go3 = ctx.body.querySelector("#scGoStage3");
        if (go3) go3.addEventListener("click", () => { st.stage = 2; render(); });
      } else if (st.stage === 2) {
        ctx.body.querySelector("#scLoadFleetBtn").addEventListener("click", () => {
          st.fleetTokenInput = ctx.body.querySelector("#scFleetInput").value.trim().toUpperCase();
          if (st.fleetTokenInput === "FLEET-SYNC-500") {
            st.fleetLoaded = true;
            st.stage3Msg = "";
          } else {
            st.fleetLoaded = false;
            st.stage3Msg = "❌ 金鑰不正確，請輸入 Stage 2 取得的 FLEET-SYNC-500！";
          }
          render();
        });
        if (st.fleetLoaded) {
          ctx.body.querySelector("#scRoleEng").addEventListener("change", (e) => { st.roleEng = e.target.value; });
          ctx.body.querySelector("#scRoleDisp").addEventListener("change", (e) => { st.roleDisp = e.target.value; });
          ctx.body.querySelector("#scRoleIntern").addEventListener("change", (e) => { st.roleIntern = e.target.value; });
          ctx.body.querySelector("#scBranchLock").addEventListener("change", (e) => { st.branchLock = e.target.checked; });
          ctx.body.querySelectorAll("[data-cc]").forEach((sel) => {
            sel.addEventListener("change", () => { st.assetChoice[sel.dataset.cc] = sel.value; });
          });
          ctx.body.querySelector("#scVerifyS3").addEventListener("click", () => {
            const rolesOk = st.roleEng === "admin" && st.roleDisp === "dispatch" && st.roleIntern === "readonly" && st.branchLock;
            const ccOk = CC_ASSETS.every((a) => st.assetChoice[a.id] === (a.shouldKeep ? "keep" : "reject"));
            if (!rolesOk) {
              st.stage3Msg = "❌ 權限設定尚未符合最小權限與安全保護規則！請確認外部實習生唯讀、區域督導不改寫核心碼，並開啟主幹保護鎖定。";
            } else if (!ccOk) {
              st.stage3Msg = "❌ 創用 CC 審查有誤！商業市政車隊需改作圖資，必須剔除 CC BY-NC（非商業）與 CC BY-ND（禁止改作）套件！";
            } else {
              st.passedStages.add(2);
              st.maxStage = Math.max(st.maxStage, 3);
              st.stage3Msg = "✅ 500 台車隊權限與授權合規驗證通過！已核發遙測校正密鑰 TELEM-MA-K3。";
            }
            render();
          });
        }
        const go4 = ctx.body.querySelector("#scGoStage4");
        if (go4) go4.addEventListener("click", () => { st.stage = 3; render(); });
      } else if (st.stage === 3) {
        ctx.body.querySelector("#scLoadTelemBtn").addEventListener("click", () => {
          st.telemKeyInput = ctx.body.querySelector("#scTelemKey").value.trim().toUpperCase();
          if (st.telemKeyInput === "TELEM-MA-K3") {
            st.telemLoaded = true;
            st.stage4Msg = "";
          } else {
            st.telemLoaded = false;
            st.stage4Msg = "❌ 密鑰錯誤，請輸入 Stage 3 取得的 TELEM-MA-K3！";
          }
          render();
        });
        if (st.telemLoaded) {
          ctx.body.querySelector("#scWinRange").addEventListener("input", (e) => { st.winSize = Number(e.target.value); render(); });
          ctx.body.querySelector("#scKRange").addEventListener("input", (e) => { st.kSigma = Number(e.target.value); render(); });
          ctx.body.querySelector("#scConsecSel").addEventListener("change", (e) => { st.consecReq = Number(e.target.value); render(); });
          ctx.body.querySelector("#scVerifyS4").addEventListener("click", () => {
            const res = evalTelemetry(st.winSize, st.kSigma, st.consecReq);
            if (res.ok) {
              st.passedStages.add(3);
              st.stage4Msg = `✅ 完美調校！W=${st.winSize}、閾值 ${res.threshold.toFixed(1)} (${st.kSigma}σ)、連續 ${st.consecReq} 次觸發：成功過濾 t=8 單點突波並於 t=${res.realTripAt} 緊急熔斷，智慧城市車隊危機解除！`;
              if (!st.solvedNotified) {
                st.solvedNotified = true;
                ctx.pass();
              }
            } else {
              st.stage4Msg = res.falseTripAt
                ? `❌ 調校失敗：第 ${res.falseTripAt} 筆單點突波誤觸停機！請嘗試增大滑動視窗 W 或調整閾值 K 與連續次數 C=3。`
                : "❌ 調校失敗：未能於第 18~20 筆連續 3 次真實異常時及時熔斷！請嘗試 W=3, K=3.0σ, 連續 3 次。";
            }
            render();
          });
        }
      }
    };

    render();
  }

  /* ========================================================================
   * 檔案室掛載引擎
   * ======================================================================== */
  function unmount() {}

  function mount(container, opts = {}) {
    if (!container) return;
    let activeCaseId = opts.initialCase || CASES[0].id;

    const renderShell = () => {
      const doneCount = CASES.filter((c) => isCompleted(c.id)).length;
      const allDone = doneCount === CASES.length;
      const curCase = CASES.find((c) => c.id === activeCaseId) || CASES[0];

      container.innerHTML = `
        <div class="cap-wrap" data-scrollable="true">
          <div class="cap-header">
            <div>
              <h3>🕵️ 跨島綜合解謎檔案室（Clue-Chaining 動態線索串聯）</h3>
              <p>前一關鑑識出的真實數據必須於下一關輸入檢核 · 每案全破發放 <b>+50 ⭐ 探索星幣</b> · 雙案全破解鎖稱號 <b>「🕵️ 首席資安鑑識官」</b></p>
            </div>
            <div class="dojo-master-pill ${allDone ? "is-done" : ""}">
              ${allDone ? "🕵️ 已獲稱號：首席資安鑑識官" : `破案進度：${doneCount} / 2 案`}
            </div>
          </div>
          <div class="dojo-tabs" role="tablist">
            ${CASES.map((c, idx) => {
              const done = isCompleted(c.id);
              const cur = c.id === curCase.id;
              return `<button type="button" class="dojo-tab ${cur ? "is-cur" : ""} ${done ? "is-done" : ""}" data-case="${c.id}" role="tab" aria-selected="${cur}">
                <span class="dt-num">${done ? "✔" : idx + 1}</span>
                <span class="dt-lbl">${c.icon} ${esc(c.short)}</span>
              </button>`;
            }).join("")}
          </div>
          <div class="dojo-board-head">
            <div>
              <span class="dojo-badge">${esc(curCase.badge)}</span>
              <h4>${curCase.icon} ${esc(curCase.title)}</h4>
            </div>
            <span class="dojo-coin-tag ${isCompleted(curCase.id) ? "is-done" : ""}">
              ${isCompleted(curCase.id) ? "✔ 已結案 · +50 ⭐ 已入帳" : "⭐ 結案獎勵 +50"}
            </span>
          </div>
          <div id="capCaseBody" class="cap-case-body"></div>
        </div>
      `;

      container.querySelectorAll(".dojo-tab").forEach((btn) => {
        btn.addEventListener("click", () => {
          activeCaseId = btn.dataset.case;
          renderShell();
        });
      });

      const caseBody = container.querySelector("#capCaseBody");
      const ctx = {
        body: caseBody,
        pass: () => {
          completeCase(curCase.id, curCase.short, () => {
            const dCount = CASES.filter((c) => isCompleted(c.id)).length;
            const pill = container.querySelector(".dojo-master-pill");
            if (pill) {
              pill.classList.toggle("is-done", dCount === CASES.length);
              pill.textContent = dCount === CASES.length ? "🕵️ 已獲稱號：首席資安鑑識官" : `破案進度：${dCount} / 2 案`;
            }
            const tag = container.querySelector(".dojo-coin-tag");
            if (tag) {
              tag.classList.add("is-done");
              tag.textContent = "✔ 已結案 · +50 ⭐ 已入帳";
            }
            const tabBtn = container.querySelector(`.dojo-tab[data-case="${curCase.id}"]`);
            if (tabBtn) {
              tabBtn.classList.add("is-done");
              const numEl = tabBtn.querySelector(".dt-num");
              if (numEl) numEl.textContent = "✔";
            }
            if (typeof opts.onProgress === "function") opts.onProgress();
          });
        }
      };

      if (curCase.id === "capstone:zero-day") mountZeroDayCase(ctx);
      else mountSmartCityCase(ctx);
    };

    renderShell();
  }

  window.CapstoneCases = {
    CASES,
    mount,
    unmount,
    isCompleted,
    evaluateZeroDayPatch,
    computeAiMetrics,
    evalTelemetry
  };
})();
