/* 學習成果:資訊素養七向度雷達圖(7 軸 = 7 座島) */
(() => {
  const ISLANDS = window.ISLANDS;
  let chart = null;

  const wrap = document.createElement("div");
  wrap.id = "resultModal"; wrap.className = "modal-wrap";
  wrap.innerHTML = `<div class="modal result-modal" role="dialog" aria-modal="true" aria-labelledby="resTitle">
    <button class="close" id="resClose" aria-label="關閉">✕</button>
    <div class="res-head">
      <div class="res-head-row">
        <div><h2 id="resTitle">📈 我的學習成果</h2><p id="resWho"></p></div>
        <button type="button" class="res-to-lb-btn" id="resToLbBtn">🏅 切換年級風雲榜</button>
      </div>
    </div>
    <div class="res-body">
      <h3>資訊素養七向度雷達圖</h3>
      <div class="radar-box"><canvas id="radarCanvas" aria-label="資訊素養七向度雷達圖" role="img"></canvas></div>
      <p class="res-note">每個向度對應一座島,顯示該島<b>最新一次</b>測驗得分;尚未完成測驗的島嶼以 0 分計。</p>
      <div id="resList" class="res-list"></div>
      <h3>🏅 我的徽章牆</h3>
      <div id="resBadges" class="res-badges"></div>
    </div></div>`;
  document.body.appendChild(wrap);
  const $ = (s) => wrap.querySelector(s);
  const close = () => wrap.classList.remove("show");
  $("#resClose").onclick = close;
  $("#resToLbBtn").onclick = () => {
    close();
    if (window.Leaderboard && typeof window.Leaderboard.open === "function") {
      window.Leaderboard.open();
    }
  };
  wrap.addEventListener("click", (e) => { if (e.target === wrap) close(); });
  document.addEventListener("keydown", (e) => {
    if (window.shouldSkipGlobalEvent && window.shouldSkipGlobalEvent(e)) return;
    if (e.key === "Escape" && wrap.classList.contains("show")) close();
  });

  /** 讀取 localStorage 內的測驗成績,回傳每座島最新得分(沒有則 0) */
  function islandScores() {
    const quiz = Store.events().filter(e => e.type === "quiz");
    return ISLANDS.map(isl => {
      const mine = quiz.filter(e => e.island === isl.id).sort((a, b) => b.ts - a.ts);
      return { isl, done: mine.length > 0, score: mine.length ? mine[0].score : 0, latest: mine[0] || null, attempts: mine.length };
    });
  }

  function render() {
    const p = Store.profile;
    const cls = p.cls, g = { 7: "七", 8: "八", 9: "九" }[cls[0]];
    $("#resWho").textContent = `${p.name} · ${g}年${+cls.slice(1)}班 ${p.seat}號`;
    const rows = islandScores();
    const labels = rows.map(r => r.isl.name), data = rows.map(r => r.score);

    $("#resList").innerHTML = rows.map(r => `<div class="res-row" style="--c:${r.isl.color}">
        <span class="nm">${r.isl.emoji} ${r.isl.name}</span>
        <span class="bar"><i style="width:${r.score}%"></i></span>
        <span class="sc">${r.done ? r.score + " 分" : "尚未測驗"}</span>
        <span class="meta">${r.done ? `${r.attempts} 次 · ${new Date(r.latest.ts).toLocaleDateString("zh-TW")}` : ""}</span></div>`).join("");

    const bd = Store.badges(), BG = (window.Quiz && Quiz.BADGES) || {};
    $("#resBadges").innerHTML = bd.length ? bd.sort((a, b) => b.ts - a.ts).map(b => `<div class="res-badge b-${b.type}">
        <span class="rb-ico">${(BG[b.type] || {}).icon || "🏅"}</span>
        <div><b>${(BG[b.type] || {}).name || b.type}</b><small>${b.unitName || b.unit} · ${new Date(b.ts).toLocaleDateString("zh-TW")}</small></div></div>`).join("")
      : `<p class="res-note">還沒有徽章。在支援分級測驗的單元通過「中」可得銀色羅盤徽章、通過「難」可得金色大師徽章!</p>`;

    if (typeof Chart === "undefined") {
      $(".radar-box").innerHTML = `<p class="err">圖表函式庫載入失敗,請檢查網路連線後重新整理。</p>`; return;
    }
    if (chart) chart.destroy();
    const ctx = $("#radarCanvas").getContext("2d");
    chart = new Chart(ctx, {
      type: "radar",
      data: {
        labels,
        datasets: [{
          label: "最新得分", data,
          backgroundColor: "rgba(255,209,102,.30)", borderColor: "#ffd166", borderWidth: 2,
          pointBackgroundColor: rows.map(r => r.isl.color), pointBorderColor: "#fff", pointRadius: 5, pointHoverRadius: 7
        }]
      },
      options: {
        responsive: true, maintainAspectRatio: true, aspectRatio: 1.1,
        scales: {
          r: {
            min: 0, max: 100, ticks: { stepSize: 20, color: "#a9c3dc", backdropColor: "transparent" },
            grid: { color: "rgba(255,255,255,.2)" }, angleLines: { color: "rgba(255,255,255,.2)" },
            pointLabels: { color: "#eaf4ff", font: { size: 13, weight: "600" } }
          }
        },
        plugins: {
          legend: { display: false },
          tooltip: { callbacks: { label: (c) => ` ${c.parsed.r} 分${rows[c.dataIndex].done ? "" : "(尚未測驗)"}` } }
        }
      }
    });
  }

  function open() {
    if (!window.Auth.requireLogin()) return;
    wrap.classList.add("show"); render();
  }
  document.getElementById("resultBtn").addEventListener("click", open);
  // 若視窗開著時又有新成績,即時更新
  document.addEventListener("ii:quizdone", () => { if (wrap.classList.contains("show")) render(); });
  document.addEventListener("ii:logout", close);
  window.Results = { open, islandScores };
})();
