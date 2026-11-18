/* 雲端動態公告與任務派發：啟動自動同步 GAS config + 左下角動森風格「今日任務公告」卡片 */
(() => {
  const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;"
  }[c]));

  function getGasUrl() {
    if (window.Store && typeof window.Store.getLeaderboardUrl === "function") {
      const u = window.Store.getLeaderboardUrl();
      if (u) return u;
    }
    const cfg = window.APP_CONFIG && window.APP_CONFIG.LEADERBOARD_URL;
    return typeof cfg === "string" ? cfg.trim() : "";
  }

  function sanitizeUrl(raw) {
    const u = String(raw || "").trim();
    if (!u) return "";
    if (/^https?:\/\//i.test(u)) return u;
    if (/^[\w.-]+\.[a-z]{2,}/i.test(u)) return `https://${u}`;
    return "";
  }

  let currentConfig = {
    announcement: "",
    targetIsland: "",
    taskLinkTitle: "",
    taskLinkUrl: ""
  };
  let isCollapsed = false;

  const card = document.createElement("aside");
  card.id = "cloudTaskCard";
  card.className = "cloud-task-card";
  card.setAttribute("aria-live", "polite");
  card.hidden = true;
  document.body.appendChild(card);

  function normalizeConfig(raw) {
    const src = (raw && typeof raw === "object") ? raw : {};
    return {
      announcement: String(src.announcement || "").trim(),
      targetIsland: String(src.targetIsland || "").trim(),
      taskLinkTitle: String(src.taskLinkTitle || "").trim(),
      taskLinkUrl: String(src.taskLinkUrl || "").trim()
    };
  }

  function renderCard() {
    const { announcement, taskLinkTitle, taskLinkUrl } = currentConfig;
    const safeUrl = sanitizeUrl(taskLinkUrl);
    if (!announcement && !safeUrl) {
      card.hidden = true;
      card.innerHTML = "";
      return;
    }
    card.hidden = false;
    card.classList.toggle("is-collapsed", isCollapsed);
    const btnText = taskLinkTitle || "前往任務連結";
    card.innerHTML = `
      <button type="button" class="ct-head" id="ctToggleBtn" aria-expanded="${String(!isCollapsed)}">
        <span class="ct-title">📢 今日任務公告</span>
        <span class="ct-chev">${isCollapsed ? "▸" : "▾"}</span>
      </button>
      <div class="ct-body"${isCollapsed ? " hidden" : ""}>
        ${announcement ? `<p class="ct-msg">${esc(announcement).replace(/\n/g, "<br>")}</p>` : ""}
        ${safeUrl ? `<a class="ct-link-btn" href="${esc(safeUrl)}" target="_blank" rel="noopener noreferrer">🚀 ${esc(btnText)}</a>` : ""}
      </div>
    `;
    const toggleBtn = card.querySelector("#ctToggleBtn");
    if (toggleBtn) {
      toggleBtn.onclick = () => {
        isCollapsed = !isCollapsed;
        renderCard();
      };
    }
  }

  function setConfig(raw) {
    currentConfig = normalizeConfig(raw);
    renderCard();
    document.dispatchEvent(new CustomEvent("ii:config-updated", { detail: { ...currentConfig } }));
  }

  async function fetchNow() {
    const url = getGasUrl();
    if (!url) return currentConfig;
    try {
      const res = await fetch(`${url}?t=${Date.now()}`, { cache: "no-store" });
      if (!res.ok) return currentConfig;
      const json = await res.json();
      if (json && json.status === "ok" && json.config) {
        setConfig(json.config);
      }
    } catch (e) {
      console.warn("讀取雲端任務設定失敗:", e);
    }
    return currentConfig;
  }

  window.CloudConfig = {
    get: () => ({ ...currentConfig }),
    set: setConfig,
    fetchNow,
    sanitizeUrl
  };

  fetchNow();
})();
