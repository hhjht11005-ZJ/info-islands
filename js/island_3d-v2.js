/**
 * ===============================================================
 * 資訊課程島 — 3D 場景渲染模組 v2「科技等角幾何島嶼 × 動森生活樂園細節」
 * ===============================================================
 * 【設計核心】：
 *  1. 現代明亮的「厚邊框正六角形（外圍七島）／正八角形（中央聖殿）」階梯台地：
 *     - 基座邊緣：米白色 / 暖杏色防波堤邊框，厚實具倒角感。
 *     - 台地表面：明亮嫩綠色草皮（MeshToonMaterial，鮮活清新）。
 *  2. 緊湊島距與實體連通道：
 *     - 七島緊湊環繞於聖殿外圍（半徑約 50 單位，落於 45~55 規格區間）。
 *     - 7 座實體微拱木棧橋直通七島，鋪設深淺棕色木板條、木質圍欄、垂掛麻繩與紅白立體救生圈。
 *  3. 七島具象科技地標 + 中央榮耀聖殿（原生幾何體拼裝，各展學科特色）：
 *     - 01 電腦探險島（sys）：雙層伺服器機櫃（發光 LED）+ 復古 CRT 螢幕 + 散熱管線與風扇。
 *     - 02 數位公民島（citizen）：微光守護防護盾 + 藍白條紋訊號燈塔（旋轉聚光）+ 紅白安全閘門。
 *     - 03 程式森林島（code）：巨型筆電工坊（掀開鍵盤、代碼螢幕）+ 綠色立體積木樹（微風輕晃）。
 *     - 04 演算法山（algo）：五層石磚階梯金字塔 + 石階 + 頂端「if?」分叉決策標誌柱（True/False）。
 *     - 05 資料海灣（data）：二進位刻痕方塊 + 發光高低條狀統計圖水晶柱（彩色呼吸跳動）。
 *     - 06 創作協作島（create）：巨型復古相機 + 巨型木質畫架繪圖板 + 巨型五色調色盤與畫筆。
 *     - 07 AI 智慧島（ai）：半透明科技玻璃穹頂 + 內部懸浮發光機器人核心 + 旋轉軌道環。
 *     - 中央資訊聖殿（sanctuary）：全場最高的三層圓形榮耀基座 + 頂部金屬獎盃與環繞的七島立體旗幟。
 *  4. 動森生活微細節：
 *     - 水岸浪花波紋（Shoreline Foam）：基座與水面交界處的半透明雙圈波紋，動畫迴圈縮放跳動。
 *     - 地面細部：建築前不規則鵝卵石步道、圓木長椅、黑色復古路燈（夜間光暈）、多色小花叢。
 *     - 低多邊形 NPC：木棧橋行走小人、碼頭垂釣小人（釣竿、浮標微波晃動）、長椅看書小人。
 *     - 動態水面：綠松石色（Turquoise）透明海面，微波平滑起伏。
 *  5. 相機控制與點擊特寫（Diorama 等角微縮視角）：
 *     - 相機 FOV 40°，預設斜俯視角，呈現精緻玩具箱質感。
 *     - 點擊島嶼平滑特寫（controls.target 與 camera.position 平滑插值），點擊空白處重置回全景。
 *     - 綁定 Raycaster 確保七大島嶼與中央聖殿點擊時，正常開啟單元抽屜與聖殿介面。
 *
 * 【對外相容 API】：
 *   window.initScene()
 *   window.focusIsland(id, tab, unitKey) / window.resetView() / window.resetCameraToPanorama()
 *   window.updateIslandsProgress(optionsOrRecords) / window.applyIslandGradeFilter(grade)
 *   window.triggerIslandScaleBounce(id, level) / window.triggerSanctuaryAwakening()
 *   window.triggerBoardingCameraTransition() / window.openSanctuaryCertificateModal()
 *   window.launchCelebrationConfetti() / window.__island3D / window.SceneV2
 *
 * 【保護規範】：純讀取，不修改 data/islands.js 與 data/units/*.js。
 * ===============================================================
 */
(() => {
  "use strict";

  if (typeof window === "undefined" || typeof document === "undefined") return;
  if (typeof THREE === "undefined") {
    console.warn("[scene-v2] Three.js 未載入，略過 3D 場景初始化。");
    return;
  }

  const TAU = Math.PI * 2;
  const GY = 1.7; // 島面（草皮）高度
  const TY = 2.2; // 中央階梯台地高度
  const RING_RADIUS = 50; // 七島環繞半徑（規格 45~55 單位）
  const ISLAND_R = 11.5; // 六角島外接圓半徑
  const TEMPLE_R = 12.5; // 八角聖殿島外接圓半徑
  const BRIDGE_Z0 = 9.3; // 橋起點（距聖殿中心）
  const BRIDGE_Z1 = RING_RADIUS - ISLAND_R * Math.cos(Math.PI / 6) + 1.0; // 橋終點（踏上島面）

  // 依規格編號排列：01 電腦 / 02 數位公民 / 03 程式 / 04 演算法 / 05 資料 / 06 創作 / 07 AI
  const ORDER = ["sys", "citizen", "code", "algo", "data", "create", "ai"];
  const FALLBACK_ISLANDS = [
    { id: "sys", name: "電腦探險島", emoji: "🖥️", color: "#4fb3ff", tag: "系統平臺" },
    { id: "citizen", name: "數位公民島", emoji: "🛡️", color: "#ff8a65", tag: "資訊科技與人類社會" },
    { id: "code", name: "程式森林島", emoji: "🌲", color: "#5fd18b", tag: "程式設計" },
    { id: "algo", name: "演算法山", emoji: "⛰️", color: "#ffd166", tag: "演算法" },
    { id: "data", name: "資料海灣", emoji: "📊", color: "#2ec4b6", tag: "資料表示、處理及分析" },
    { id: "create", name: "創作協作島", emoji: "🎨", color: "#c58bff", tag: "合作共創 · 溝通表達" },
    { id: "ai", name: "AI 智慧島", emoji: "🤖", color: "#ff6fb5", tag: "延伸 · 校本課程" }
  ];

  let instance = null;

  /* ============================================================
   * 小工具
   * ============================================================ */
  function mulberry32(seed) {
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const easeInOutCubic = (u) => (u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2);
  const smoothstep = (a, b, x) => {
    const u = clamp((x - a) / (b - a), 0, 1);
    return u * u * (3 - 2 * u);
  };

  function canvasTex(w, h, draw) {
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    draw(c.getContext("2d"), w, h);
    const t = new THREE.CanvasTexture(c);
    t.anisotropy = 4;
    return t;
  }

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  /** 多邊形頂點（與旋轉 π/n 後的 CylinderGeometry 對齊：+z 方向為邊中點） */
  function polyPts(R, n) {
    const pts = [];
    for (let k = 0; k < n; k++) {
      const a = Math.PI / n + (TAU * k) / n;
      pts.push(new THREE.Vector2(R * Math.sin(a), -R * Math.cos(a)));
    }
    return pts;
  }

  /** 平放於 XZ 平面的多邊形環（浪花波紋用） */
  function polyRingGeo(rOut, rIn, n) {
    const shape = new THREE.Shape(polyPts(rOut, n));
    shape.holes.push(new THREE.Path(polyPts(rIn, n)));
    const g = new THREE.ShapeGeometry(shape);
    g.rotateX(-Math.PI / 2);
    return g;
  }

  function instanced(geo, mat, items) {
    const im = new THREE.InstancedMesh(geo, mat, items.length);
    const m4 = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const e = new THREE.Euler();
    const p = new THREE.Vector3();
    const s = new THREE.Vector3();
    const col = new THREE.Color();
    items.forEach((it, i) => {
      e.set(it.rx || 0, it.ry || 0, it.rz || 0);
      q.setFromEuler(e);
      p.set(it.x, it.y, it.z);
      s.set(it.sx || 1, it.sy || 1, it.sz || 1);
      m4.compose(p, q, s);
      im.setMatrixAt(i, m4);
      if (it.color !== undefined) {
        col.set(it.color);
        im.setColorAt(i, col);
      }
    });
    im.instanceMatrix.needsUpdate = true;
    if (im.instanceColor) im.instanceColor.needsUpdate = true;
    im.frustumCulled = false;
    im.userData.noShadow = true;
    return im;
  }

  function safePlayAudio(name) {
    if (window.AudioManager && typeof window.AudioManager[name] === "function") {
      try {
        window.AudioManager[name]();
      } catch (err) {
        console.warn(`[audio] ${name} 播放失敗:`, err);
      }
    }
  }

  /* ============================================================
   * initScene — 建立整個 3D 場景
   * ============================================================ */
  function initScene() {
    if (instance) return instance;

    const mapWrap = document.querySelector("#viewMap .map-wrap");
    if (!mapWrap) {
      console.warn("[scene-v2] 找不到 #viewMap .map-wrap，略過 3D 場景初始化。");
      return null;
    }
    const viewMapEl = document.getElementById("viewMap");

    const ISLANDS_DATA = (() => {
      const src = Array.isArray(window.ISLANDS) && window.ISLANDS.length ? window.ISLANDS.slice() : FALLBACK_ISLANDS.slice();
      const rank = (i) => {
        const k = ORDER.indexOf(i.id);
        return k < 0 ? 99 : k;
      };
      return src
        .map((d, i) => ({ d, i }))
        .sort((a, b) => rank(a.d) - rank(b.d) || a.i - b.i)
        .map((o) => o.d)
        .slice(0, 7);
    })();

    /* ---------- DOM：樣式、舞台、HUD 按鈕 ---------- */
    const styleEl = document.createElement("style");
    styleEl.id = "scene-v2-style";
    styleEl.textContent = `
      #viewMap .map-wrap { position: fixed; inset: 0; width: 100vw; height: 100vh; max-width: none; margin: 0; border: 0;
        border-radius: 0; background: linear-gradient(180deg, #7fd3ff 0%, #dff5ff 100%); transition: background .6s ease; pointer-events: none; }
      #viewMap .map-wrap #map, #viewMap .map-wrap .route-toggle { display: none !important; }
      #island3dStage { position: fixed; inset: 0; width: 100vw; height: 100vh; overflow: hidden; z-index: 1; cursor: grab; pointer-events: auto; }
      #island3dStage:active { cursor: grabbing; }
      #island3dStage canvas { display: block; width: 100%; height: 100%; outline: none; }
      .v2-bubble { position: fixed; z-index: 30; transform: translate(-50%, -100%); max-width: 270px; padding: 9px 15px;
        background: #fffdf5; color: #3d3226; border: 2.5px solid #f0d9a8; border-radius: 18px; font-weight: 700; font-size: .88rem;
        box-shadow: 0 8px 22px rgba(20,60,90,.28); pointer-events: none; opacity: 0; transition: opacity .22s ease-out; }
      .v2-bubble.show { opacity: 1; }
      .v2-bubble::after { content: ""; position: absolute; left: 50%; bottom: -9px; width: 14px; height: 14px; background: #fffdf5;
        border-right: 2.5px solid #f0d9a8; border-bottom: 2.5px solid #f0d9a8; transform: translateX(-50%) rotate(45deg); }
      .v2-toast { position: fixed; left: 50%; bottom: 9%; z-index: 40; transform: translate(-50%, 12px); padding: 11px 22px; border-radius: 999px;
        background: rgba(15,41,66,.92); color: #fff; font-weight: 800; font-size: .94rem; pointer-events: none; opacity: 0; transition: all .3s; }
      .v2-toast.show { opacity: 1; transform: translate(-50%, 0); }
      .v2-cert-wrap { position: fixed; inset: 0; z-index: 9000; display: none; align-items: center; justify-content: center; background: rgba(8,28,54,.65); backdrop-filter: blur(4px); }
      .v2-cert-wrap.show { display: flex; }
      .v2-cert { width: min(580px, 92vw); max-height: 90vh; overflow: auto; padding: 28px 32px; border-radius: 24px; text-align: center;
        background: linear-gradient(160deg, #fffaf0, #fff0cf); color: #4a3a22; border: 4px solid #f2c14e; box-shadow: 0 24px 70px rgba(0,0,0,.45); }
      .v2-cert h2 { margin: 0 0 6px; font-size: 1.55rem; color: #2e2312; }
      .v2-cert .who { font-size: 1.2rem; font-weight: 800; margin: 12px 0 2px; color: #1c3552; }
      .v2-cert .meta { font-size: .84rem; opacity: .8; }
      .v2-cert ul { list-style: none; margin: 16px 0; padding: 0; display: grid; gap: 7px; text-align: left; }
      .v2-cert li { padding: 7px 14px; border-radius: 12px; background: #fff; border-left: 6px solid var(--c, #f2c14e); font-weight: 700; display: flex; justify-content: space-between; gap: 8px; box-shadow: 0 2px 6px rgba(0,0,0,.04); }
      .v2-cert .acts { display: flex; gap: 10px; justify-content: center; flex-wrap: wrap; margin-top: 14px; }
      .v2-cert button { border: 0; padding: 9px 20px; border-radius: 999px; font-weight: 800; font-size: .9rem; cursor: pointer; background: #f2c14e; color: #3d2f12; transition: transform .15s; }
      .v2-cert button:hover { transform: scale(1.04); }
      .v2-cert button.ghost { background: #e8e1d0; color: #4a3a22; }
    `;
    document.head.appendChild(styleEl);

    const stage = document.createElement("div");
    stage.id = "island3dStage";
    stage.setAttribute("role", "region");
    stage.setAttribute("aria-label", "3D 資訊課程島嶼地圖");
    mapWrap.insertBefore(stage, mapWrap.firstChild);

    const hudParent = document.querySelector(".scene-controls") || mapWrap;
    let toggleBtn = document.getElementById("dayNightToggleBtn");
    if (!toggleBtn) {
      toggleBtn = document.createElement("button");
      toggleBtn.type = "button";
      toggleBtn.id = "dayNightToggleBtn";
      toggleBtn.className = "daynight-toggle-btn";
      toggleBtn.setAttribute("aria-pressed", "false");
      toggleBtn.innerHTML = `<span>☀️ 白天 / 🌙 夜晚</span><span class="dn-pill" id="dnStateLabel">目前：☀️ 白天</span>`;
      hudParent.appendChild(toggleBtn);
    }
    let resetCamBtn = document.getElementById("cameraResetBtn");
    if (!resetCamBtn) {
      resetCamBtn = document.createElement("button");
      resetCamBtn.type = "button";
      resetCamBtn.id = "cameraResetBtn";
      resetCamBtn.className = "camera-reset-btn";
      resetCamBtn.setAttribute("aria-label", "全景視角重置");
      resetCamBtn.title = "點擊返回微縮全景視角";
      resetCamBtn.innerHTML = `<span>🌐 微縮全景</span>`;
      hudParent.appendChild(resetCamBtn);
    }

    const bubbleEl = document.createElement("div");
    bubbleEl.className = "v2-bubble";
    bubbleEl.setAttribute("role", "status");
    document.body.appendChild(bubbleEl);
    const toastEl = document.createElement("div");
    toastEl.className = "v2-toast";
    toastEl.setAttribute("role", "status");
    document.body.appendChild(toastEl);

    /* ============================================================
     * 渲染器、場景、相機（FOV 40°，等角微縮）、控制器
     * ============================================================ */
    const scene = new THREE.Scene();
    const initW = stage.clientWidth || window.innerWidth || 1200;
    const initH = stage.clientHeight || window.innerHeight || 700;

    const camera = new THREE.PerspectiveCamera(40, initW / initH, 0.3, 1200);

    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
    renderer.setSize(initW, initH);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    stage.appendChild(renderer.domElement);

    const controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.screenSpacePanning = true;
    controls.minDistance = 14;
    controls.maxDistance = 240;
    controls.minPolarAngle = 0.15;
    controls.maxPolarAngle = Math.PI / 2.08;

    /** 全景（Diorama 等角微縮）相機姿態：依畫面長寬比自適應拉遠 */
    function panoramaPose() {
      const aspect = camera.aspect || 1.7;
      const dist = 132 * Math.max(1, 1.72 / aspect);
      const el = (40 * Math.PI) / 180;
      const az = (14 * Math.PI) / 180;
      const target = new THREE.Vector3(0, 1.5, 4);
      const pos = new THREE.Vector3(
        Math.sin(az) * Math.cos(el) * dist,
        Math.sin(el) * dist,
        Math.cos(az) * Math.cos(el) * dist
      ).add(target);
      return { pos, target };
    }
    {
      const p = panoramaPose();
      camera.position.copy(p.pos);
      controls.target.copy(p.target);
      camera.lookAt(p.target);
      controls.update();
    }

    /* ---------- 漸層天空 ---------- */
    function skyTexture(top, bottom) {
      return canvasTex(8, 256, (ctx, w, h) => {
        const g = ctx.createLinearGradient(0, 0, 0, h);
        g.addColorStop(0, top);
        g.addColorStop(1, bottom);
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, w, h);
      });
    }
    const skyDay = skyTexture("#6cc8ff", "#e6f8ff");
    const skyNight = skyTexture("#0a1230", "#27427d");
    scene.background = skyDay;
    scene.fog = new THREE.FogExp2(0xdff5ff, 0.0016);

    /* ---------- 燈光系統 ---------- */
    const hemiLight = new THREE.HemisphereLight(0xffffff, 0xcfe8d0, 0.72);
    scene.add(hemiLight);
    const sunLight = new THREE.DirectionalLight(0xfff2d6, 0.62);
    sunLight.position.set(44, 78, 36);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.set(2048, 2048);
    sunLight.shadow.camera.left = -78;
    sunLight.shadow.camera.right = 78;
    sunLight.shadow.camera.top = 78;
    sunLight.shadow.camera.bottom = -78;
    sunLight.shadow.camera.near = 10;
    sunLight.shadow.camera.far = 220;
    sunLight.shadow.bias = -0.0006;
    sunLight.shadow.normalBias = 0.05;
    scene.add(sunLight);

    /* ============================================================
     * 材質庫（MeshToonMaterial 色階卡通風格）
     * ============================================================ */
    const gradientMap = (() => {
      const isGL2 = renderer.capabilities && renderer.capabilities.isWebGL2;
      const fmt = isGL2 ? THREE.RedFormat : THREE.LuminanceFormat;
      const data = new Uint8Array([120, 200, 255]);
      const t = new THREE.DataTexture(data, data.length, 1, fmt);
      t.minFilter = THREE.NearestFilter;
      t.magFilter = THREE.NearestFilter;
      t.generateMipmaps = false;
      t.needsUpdate = true;
      return t;
    })();

    const matCache = new Map();
    function toon(color, opt) {
      const o = opt || {};
      if (o.map) return new THREE.MeshToonMaterial(Object.assign({ color, gradientMap }, o));
      const key = color + "|" + JSON.stringify(o);
      let m = matCache.get(key);
      if (!m) {
        m = new THREE.MeshToonMaterial(Object.assign({ color, gradientMap }, o));
        matCache.set(key, m);
      }
      return m;
    }

    const nightGlows = [];
    const glowSet = new Set();
    function glow(color, day, night, opt) {
      const m = new THREE.MeshToonMaterial(
        Object.assign(
          { color: new THREE.Color(color).multiplyScalar(0.45), emissive: color, emissiveIntensity: day === undefined ? 0.9 : day, gradientMap },
          opt || {}
        )
      );
      glowSet.add(m);
      if (night !== undefined) nightGlows.push({ m, day, night });
      return m;
    }
    const glass = (color, opacity) =>
      new THREE.MeshPhongMaterial({
        color,
        transparent: true,
        opacity: opacity === undefined ? 0.28 : opacity,
        shininess: 90,
        side: THREE.DoubleSide,
        depthWrite: false
      });

    /* ---------- 幾何快捷函式 ---------- */
    const put = (parent, mesh, x, y, z) => {
      if (x !== undefined) mesh.position.set(x, y || 0, z || 0);
      parent.add(mesh);
      return mesh;
    };
    const boxM = (w, h, d, mat) => new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    const cylM = (rt, rb, h, seg, mat) => new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), mat);
    const sphM = (r, mat, ws, hs) => new THREE.Mesh(new THREE.SphereGeometry(r, ws || 14, hs || 10), mat);
    const torM = (R, t, mat, arc, tubSeg) => new THREE.Mesh(new THREE.TorusGeometry(R, t, 8, tubSeg || 28, arc || TAU), mat);
    const coneM = (r, h, seg, mat) => new THREE.Mesh(new THREE.ConeGeometry(r, h, seg), mat);
    const addBox = (p, w, h, d, mat, x, y, z) => put(p, boxM(w, h, d, mat), x, y, z);
    const addCyl = (p, rt, rb, h, seg, mat, x, y, z) => put(p, cylM(rt, rb, h, seg, mat), x, y, z);
    const addSph = (p, r, mat, x, y, z, ws, hs) => put(p, sphM(r, mat, ws, hs), x, y, z);
    const addTor = (p, R, t, mat, x, y, z, arc, tubSeg) => put(p, torM(R, t, mat, arc, tubSeg), x, y, z);
    const addCone = (p, r, h, seg, mat, x, y, z) => put(p, coneM(r, h, seg, mat), x, y, z);

    function tube(points, radius, mat, seg) {
      const curve = new THREE.CatmullRomCurve3(points);
      return new THREE.Mesh(new THREE.TubeGeometry(curve, seg || 40, radius, 5, false), mat);
    }

    function setShadows(root) {
      root.traverse((o) => {
        if (!o.isMesh) return;
        const mt = o.material;
        if (mt && mt.transparent) return;
        o.receiveShadow = true;
        if (o.userData.noShadow) return;
        const geo = o.geometry;
        if (!geo.boundingSphere) geo.computeBoundingSphere();
        const r = geo.boundingSphere.radius * Math.max(o.scale.x, o.scale.y, o.scale.z);
        if (r > 0.55) o.castShadow = true;
      });
    }

    const updaters = [];
    const tickers = (fn) => updaters.push(fn);

    /* ============================================================
     * 動態水面（綠松石 Turquoise、半透明、微波平滑起伏）
     * ============================================================ */
    const SEA_SEG = 70;
    const seaGeo = new THREE.PlaneGeometry(520, 520, SEA_SEG, SEA_SEG);
    seaGeo.rotateX(-Math.PI / 2);
    const seaMat = new THREE.MeshPhongMaterial({
      color: 0x35d6cf,
      specular: 0xcffffb,
      shininess: 55,
      transparent: true,
      opacity: 0.8,
      flatShading: false
    });
    const sea = new THREE.Mesh(seaGeo, seaMat);
    sea.renderOrder = 1;
    sea.userData.noPick = true;
    scene.add(sea);
    const seaBase = Float32Array.from(seaGeo.attributes.position.array);

    const seabedMat = new THREE.MeshBasicMaterial({ color: 0x1e9bb8 });
    const seabed = new THREE.Mesh(new THREE.PlaneGeometry(900, 900), seabedMat);
    seabed.rotation.x = -Math.PI / 2;
    seabed.position.y = -7;
    scene.add(seabed);

    tickers((t) => {
      const pos = seaGeo.attributes.position;
      const arr = pos.array;
      for (let i = 0; i < pos.count; i++) {
        const x = seaBase[i * 3];
        const z = seaBase[i * 3 + 2];
        arr[i * 3 + 1] = Math.sin(x * 0.07 + t * 0.9) * 0.065 + Math.cos(z * 0.06 + t * 0.7) * 0.055 + Math.sin((x + z) * 0.11 + t * 1.3) * 0.03;
      }
      pos.needsUpdate = true;
    });

    /* ============================================================
     * 1. 島嶼階梯基座（厚邊框正六角形/正八角形階梯台地）
     * ============================================================ */
    const COLORS = {
      seawall: 0xf4ead2, // 米白色防波堤
      rim: 0xf3c9a0,     // 暖杏色倒角邊框
      under: 0xc8a47a,   // 水下泥岩
      grass: 0x8fe36a,   // 鮮活嫩綠草皮
      grassTier: 0xa9ef80, // 上階草皮
      stoneStep: 0xf0e3c2
    };

    /** 厚邊框多邊形島嶼基座：{ group, foam[], apothem, tier } */
    function buildIslandBase(R, n, accent, withTier) {
      const g = new THREE.Group();
      const rot = Math.PI / n;
      const cylRot = (rt, rb, h, mat, y) => {
        const geo = new THREE.CylinderGeometry(rt, rb, h, n);
        geo.rotateY(rot);
        return put(g, new THREE.Mesh(geo, mat), 0, y, 0);
      };
      cylRot(R + 1.0, R * 0.72, 3.4, toon(COLORS.under), -1.4); // 水下島身
      cylRot(R + 1.1, R + 1.3, 1.5, toon(COLORS.seawall), 0.55); // 米白色防波堤
      cylRot(R + 1.26, R + 1.26, 0.16, toon(accent), 0.45); // 島色飾帶
      cylRot(R + 0.78, R + 1.12, 0.32, toon(COLORS.rim), 1.46); // 暖杏色倒角厚邊框
      cylRot(R, R, 0.42, toon(COLORS.grass), 1.5); // 嫩綠草皮

      // 邊角護欄樁與彩色圓頂
      polyPts(R + 0.95, n).forEach((p) => {
        addCyl(g, 0.3, 0.34, 0.5, 8, toon(COLORS.seawall), p.x, 1.85, -p.y);
        addSph(g, 0.24, toon(accent), p.x, 2.15, -p.y, 10, 8);
      });

      let tier = null;
      if (withTier) {
        const Rt = R * 0.58;
        tier = new THREE.Group();
        tier.position.set(0, 0, -1.5);
        const mk = (rt, rb, h, mat, y) => {
          const geo = new THREE.CylinderGeometry(rt, rb, h, n);
          geo.rotateY(rot);
          return put(tier, new THREE.Mesh(geo, mat), 0, y, 0);
        };
        mk(Rt + 0.3, Rt + 0.34, 0.24, toon(COLORS.stoneStep), GY + 0.12);
        mk(Rt, Rt, 0.5, toon(COLORS.grassTier), GY + 0.25);
        g.add(tier);
        g.userData.tierR = Rt;
      }

      // 水岸浪花波紋（Shoreline Foam）：雙圈半透明外擴波紋
      const foam = [];
      const mkFoam = (rOut, rIn, op) => {
        const m = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: op, depthWrite: false, side: THREE.DoubleSide });
        const mesh = new THREE.Mesh(polyRingGeo(rOut, rIn, n), m);
        mesh.position.y = 0.2;
        mesh.renderOrder = 2;
        mesh.raycast = () => {};
        mesh.userData.noDim = true;
        mesh.userData.baseOpacity = op;
        g.add(mesh);
        foam.push(mesh);
        return mesh;
      };
      mkFoam(R + 2.4, R + 1.15, 0.55);
      mkFoam(R + 3.8, R + 3.0, 0.3);

      return { group: g, foam, apothem: R * Math.cos(Math.PI / n), tier };
    }

    /* ============================================================
     * 1. 實體木棧橋（拱形、木板條、圍欄、麻繩、紅白立體救生圈）
     * ============================================================ */
    function makeLifebuoy() {
      const g = new THREE.Group();
      const red = toon(0xe5383b);
      const white = toon(0xffffff);
      addTor(g, 0.44, 0.17, red, 0, 0, 0, TAU, 20);
      for (let k = 0; k < 4; k++) {
        const part = torM(0.44, 0.18, white, Math.PI / 4, 6);
        part.rotation.z = (k * Math.PI) / 2 + Math.PI / 8;
        g.add(part);
      }
      const rope = torM(0.14, 0.03, toon(0xd9c08a), TAU, 10);
      rope.position.y = 0.62;
      g.add(rope);
      g.rotation.y = Math.PI / 2;
      const wrap = new THREE.Group();
      wrap.add(g);
      return wrap;
    }

    const woodColors = [0x8d5a35, 0xa56d41, 0x7a4b2a, 0xb8814d, 0x96623a];
    const woodMat = toon(0xa56d41);
    const woodDarkMat = toon(0x6e4426);
    const ropeMat = toon(0xd9c08a);

    function buildBridge(theta, idx) {
      const g = new THREE.Group();
      g.rotation.y = Math.atan2(Math.cos(theta), Math.sin(theta)); // 朝向對應島嶼
      g.userData.isBridge = true;
      const rng = mulberry32(900 + idx * 31);
      const L = BRIDGE_Z1 - BRIDGE_Z0;
      const ARCH = 1.35;
      const W = 3.0;
      const yAt = (t) => GY + 0.14 + ARCH * Math.sin(Math.PI * t);
      const zAt = (t) => BRIDGE_Z0 + L * t;
      const slopeAt = (t) => (ARCH * Math.PI * Math.cos(Math.PI * t)) / L;

      // 深淺相間木板條
      const N = Math.round(L / 0.86);
      const planks = [];
      for (let i = 0; i < N; i++) {
        const t = (i + 0.5) / N;
        planks.push({
          x: (rng() - 0.5) * 0.06,
          y: yAt(t),
          z: zAt(t),
          rx: -Math.atan(slopeAt(t)),
          sx: W,
          sy: 0.16,
          sz: (L / N) * 0.9,
          color: woodColors[Math.floor(rng() * woodColors.length)]
        });
      }
      g.add(instanced(new THREE.BoxGeometry(1, 1, 1), toon(0xffffff), planks));

      // 橋底縱樑
      for (const s of [-1, 1]) {
        const pts = [];
        for (let k = 0; k <= 14; k++) {
          const t = k / 14;
          pts.push(new THREE.Vector3(s * 1.05, yAt(t) - 0.2, zAt(t)));
        }
        g.add(tube(pts, 0.12, woodDarkMat, 36));
      }

      // 木質圍欄：立柱、雙層欄杆、垂掛麻繩、紅白救生圈
      const K = 10;
      for (const s of [-1, 1]) {
        const x = s * 1.5;
        for (let k = 0; k <= K; k++) {
          const t = k / K;
          addBox(g, 0.18, 1.1, 0.18, toon(0x7a4b2a), x, yAt(t) + 0.55 + 0.08, zAt(t));
          addSph(g, 0.13, toon(0xb8814d), x, yAt(t) + 1.2, zAt(t), 8, 6);
        }
        const topPts = [];
        const lowPts = [];
        for (let k = 0; k <= 20; k++) {
          const t = k / 20;
          topPts.push(new THREE.Vector3(x, yAt(t) + 1.12, zAt(t)));
          lowPts.push(new THREE.Vector3(x, yAt(t) + 0.42, zAt(t)));
        }
        g.add(tube(topPts, 0.08, woodMat, 40));
        g.add(tube(lowPts, 0.055, woodMat, 40));
        const ropePts = [];
        for (let k = 0; k < K; k++) {
          const t0 = k / K;
          const tm = (k + 0.5) / K;
          ropePts.push(new THREE.Vector3(x, yAt(t0) + 1.04, zAt(t0)));
          ropePts.push(new THREE.Vector3(x, yAt(tm) + 0.7, zAt(tm)));
        }
        ropePts.push(new THREE.Vector3(x, yAt(1) + 1.04, zAt(1)));
        g.add(tube(ropePts, 0.035, ropeMat, 70));

        // 紅白立體救生圈裝飾
        for (const t of s > 0 ? [0.3, 0.7] : [0.5]) {
          const lb = makeLifebuoy();
          lb.position.set(s * 1.72, yAt(t) + 0.62, zAt(t));
          lb.rotation.x = -Math.atan(slopeAt(t));
          g.add(lb);
        }
      }
      // 水中木樁
      for (const t of [0.28, 0.5, 0.72]) {
        for (const s of [-1, 1]) {
          const top = yAt(t) - 0.12;
          addCyl(g, 0.17, 0.2, top + 2.2, 8, woodDarkMat, s * 1.3, (top - 2.2) / 2, zAt(t));
        }
      }
      setShadows(g);
      return { group: g, yAt, zAt, slopeAt };
    }

    /* ============================================================
     * 3. 低多邊形小人 NPC（球體頭部、圓錐身體、黃帽/背包）
     * ============================================================ */
    const npcList = [];
    function makeNPC(o) {
      o = o || {};
      const pose = o.pose || "stand";
      const root = new THREE.Group();
      const inner = new THREE.Group();
      inner.scale.setScalar(o.scale || 1.45);
      root.add(inner);
      const bodyM = toon(o.body || 0x4aa3ff);
      const skinM = toon(0xffd9b5);
      const hatM = toon(o.hat || 0xffd23f);
      const packM = toon(o.pack || 0xe5533d);
      const darkM = toon(0x2b2b2b);
      const pantsM = toon(0x3b4a6b);

      const mkLeg = (x) => {
        const l = new THREE.Group();
        l.position.set(x, 0.33, 0);
        addCyl(l, 0.08, 0.08, 0.32, 8, pantsM, 0, -0.16, 0);
        addSph(l, 0.1, darkM, 0, -0.32, 0.04, 8, 6);
        inner.add(l);
        return l;
      };
      const legL = mkLeg(-0.15);
      const legR = mkLeg(0.15);
      const torso = new THREE.Group();
      inner.add(torso);
      addCone(torso, 0.46, 0.95, 10, bodyM, 0, 0.8, 0); // 圓錐身體
      addBox(torso, 0.42, 0.52, 0.2, packM, 0, 0.85, -0.38); // 背包

      const head = new THREE.Group();
      head.position.set(0, 1.5, 0);
      torso.add(head);
      addSph(head, 0.36, skinM, 0, 0, 0, 16, 12); // 球體頭部
      addSph(head, 0.045, darkM, -0.12, 0.02, 0.32, 6, 5);
      addSph(head, 0.045, darkM, 0.12, 0.02, 0.32, 6, 5);
      addSph(head, 0.06, toon(0xff9aa8), -0.22, -0.08, 0.27, 6, 5);
      addSph(head, 0.06, toon(0xff9aa8), 0.22, -0.08, 0.27, 6, 5);
      const hat = new THREE.Mesh(new THREE.SphereGeometry(0.4, 14, 8, 0, TAU, 0, Math.PI / 2), hatM); // 小黃帽
      hat.position.y = 0.06;
      head.add(hat);
      addCyl(head, 0.5, 0.5, 0.04, 16, hatM, 0, 0.07, 0);
      addBox(head, 0.46, 0.04, 0.3, hatM, 0, 0.08, 0.4);

      const mkArm = (x) => {
        const a = new THREE.Group();
        a.position.set(x, 1.02, 0);
        addCyl(a, 0.065, 0.065, 0.42, 8, bodyM, 0, -0.2, 0);
        addSph(a, 0.08, skinM, 0, -0.43, 0, 8, 6);
        torso.add(a);
        return a;
      };
      const armL = mkArm(-0.24);
      const armR = mkArm(0.24);

      const rec = {
        root,
        inner,
        torso,
        head,
        legL,
        legR,
        armL,
        armR,
        pose,
        bob: null,
        baseBobY: 0,
        phase: o.phase || 0,
        lines: o.lines || ["你好！歡迎來到資訊課程島 🏝️"]
      };

      if (pose === "read") {
        armL.rotation.x = -1.2;
        armR.rotation.x = -1.2;
        head.rotation.x = 0.35;
        const book = new THREE.Group();
        book.position.set(0, 0.85, 0.5);
        book.rotation.x = -0.75;
        addBox(book, 0.56, 0.06, 0.4, toon(0xd94a4a), 0, 0, 0);
        addBox(book, 0.5, 0.07, 0.34, toon(0xfffaf0), 0, 0.02, 0);
        torso.add(book);
      }
      if (pose === "fish") {
        armL.rotation.x = -1.0;
        armR.rotation.x = -1.0;
        const rod = new THREE.Group();
        rod.position.set(0.28, 0.95, 0.3);
        rod.rotation.x = 0.9;
        addCyl(rod, 0.025, 0.04, 2.4, 6, toon(0x8b5a2b), 0, 1.2, 0);
        torso.add(rod);
        const tipY = 0.95 + 2.4 * Math.cos(0.9);
        const tipZ = 0.3 + 2.4 * Math.sin(0.9);
        const drop = (o.waterDrop || 1.6) / (o.scale || 1.45);
        const lineLen = tipY + drop;
        addCyl(torso, 0.008, 0.008, lineLen, 4, toon(0xffffff), 0.28, tipY - lineLen / 2, tipZ);
        rec.baseBobY = tipY - lineLen;
        rec.bob = addSph(torso, 0.09, toon(0xff3b3b), 0.28, rec.baseBobY, tipZ, 8, 6);
      }
      if (o.sit) {
        inner.position.y = -0.3;
        legL.rotation.x = -Math.PI / 2;
        legR.rotation.x = -Math.PI / 2;
      }
      root.userData.npc = rec;
      npcList.push(rec);
      return rec;
    }

    /* ============================================================
     * 3. 動森生活微細節：鵝卵石步道、圓木長椅、復古路燈、小花叢、碼頭
     * ============================================================ */
    const pebbleColors = [0xe9e0cf, 0xd6ccb8, 0xc9bfae, 0xf3ece0, 0xdcd2c0];
    function pebbleStrip(rng, x0, z0, z1, halfW, parent, baseY = GY) {
      const items = [];
      const dir = z1 >= z0 ? 1 : -1;
      for (let z = z0; (z1 - z) * dir > 0; z += dir * 0.92) {
        const cols = 2 + Math.floor(rng() * 2);
        for (let c = 0; c < cols; c++) {
          const x = x0 - halfW + ((c + 0.5) / cols) * halfW * 2 + (rng() - 0.5) * 0.3;
          items.push({
            x,
            y: baseY + 0.045,
            z: z + (rng() - 0.5) * 0.3,
            ry: (rng() - 0.5) * 0.6,
            sx: 0.62 + rng() * 0.5,
            sy: 0.09,
            sz: 0.55 + rng() * 0.38,
            color: pebbleColors[Math.floor(rng() * pebbleColors.length)]
          });
        }
      }
      if (items.length) {
        parent.add(instanced(new THREE.BoxGeometry(1, 1, 1), toon(0xffffff), items));
      }
    }

    function makeBench() {
      const g = new THREE.Group();
      const log = toon(0xa0693b);
      const logEnd = toon(0xd9b383);
      const seat = cylM(0.24, 0.24, 2.2, 10, log);
      seat.rotation.z = Math.PI / 2;
      seat.position.y = 0.62;
      g.add(seat);
      const back = cylM(0.17, 0.17, 2.2, 10, log);
      back.rotation.z = Math.PI / 2;
      back.position.set(0, 1.15, -0.32);
      g.add(back);
      for (const s of [-1, 1]) {
        addCyl(g, 0.12, 0.12, 0.62, 8, log, s * 0.85, 0.31, 0);
        addCyl(g, 0.1, 0.1, 0.7, 8, log, s * 0.85, 0.85, -0.32);
        const cap = cylM(0.2, 0.2, 0.03, 10, logEnd);
        cap.rotation.z = Math.PI / 2;
        cap.position.set(s * 1.11, 0.62, 0);
        g.add(cap);
      }
      return g;
    }

    const lampHalos = [];
    let _halo = null;
    function haloTexture() {
      if (_halo) return _halo;
      _halo = canvasTex(64, 64, (ctx, w, h) => {
        const g = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
        g.addColorStop(0, "rgba(255,255,255,1)");
        g.addColorStop(0.4, "rgba(255,255,255,.35)");
        g.addColorStop(1, "rgba(255,255,255,0)");
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, w, h);
      });
      return _halo;
    }

    function makeLamp() {
      const g = new THREE.Group();
      const iron = toon(0x1f2228);
      addCyl(g, 0.28, 0.34, 0.3, 8, iron, 0, 0.15, 0);
      addCyl(g, 0.09, 0.12, 3.0, 8, iron, 0, 1.7, 0);
      addCyl(g, 0.2, 0.2, 0.12, 8, iron, 0, 3.2, 0);
      const bulbMat = glow(0xffe08a, 0.45, 1.9, { transparent: true, opacity: 0.95 });
      addBox(g, 0.5, 0.62, 0.5, bulbMat, 0, 3.55, 0);
      addCone(g, 0.5, 0.35, 4, iron, 0, 4.0, 0).rotation.y = Math.PI / 4;
      addSph(g, 0.08, iron, 0, 4.25, 0, 6, 5);
      const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: haloTexture(), color: 0xffd98a, transparent: true, opacity: 0, depthWrite: false }));
      halo.scale.set(3.4, 3.4, 1);
      halo.position.y = 3.55;
      halo.userData.isHalo = true;
      halo.raycast = () => {};
      g.add(halo);
      lampHalos.push(halo.material);
      return g;
    }

    const flowerColors = [0xff7aa8, 0xffd23f, 0xffffff, 0xc58bff, 0xff9a5c];
    function makeFlowerBush(rng) {
      const g = new THREE.Group();
      const leaf = toon(0x4fbf55);
      const b = addSph(g, 0.5, leaf, 0, 0.3, 0, 9, 7);
      b.scale.set(1, 0.65, 1);
      for (let i = 0; i < 5; i++) {
        const a = rng() * TAU;
        const r = 0.15 + rng() * 0.3;
        addSph(g, 0.13, toon(flowerColors[Math.floor(rng() * flowerColors.length)]), Math.cos(a) * r, 0.5 + rng() * 0.15, Math.sin(a) * r, 7, 5);
      }
      g.scale.setScalar(0.85 + rng() * 0.5);
      return g;
    }

    function makeDock(R, apothemWall) {
      const g = new THREE.Group();
      const z0 = apothemWall - 0.7;
      const len = 5.2;
      const plankN = 9;
      for (let i = 0; i < plankN; i++) {
        addBox(g, 2.3, 0.14, (len / plankN) * 0.88, toon(woodColors[i % woodColors.length]), 0, 1.47, z0 + (i + 0.5) * (len / plankN));
      }
      addBox(g, 0.18, 0.2, len, woodDarkMat, -0.9, 1.3, z0 + len / 2);
      addBox(g, 0.18, 0.2, len, woodDarkMat, 0.9, 1.3, z0 + len / 2);
      for (const zz of [z0 + 1.2, z0 + len - 0.4]) {
        for (const s of [-1, 1]) addCyl(g, 0.17, 0.2, 3.6, 8, woodDarkMat, s * 1.05, -0.2, zz);
      }
      addCyl(g, 0.17, 0.2, 0.6, 8, toon(0x5e3b20), 0.95, 1.8, z0 + len - 0.35); // 繫船柱
      addTor(g, 0.2, 0.04, ropeMat, 0.95, 1.95, z0 + len - 0.35, TAU, 12).rotation.x = Math.PI / 2;
      addBox(g, 0.7, 0.6, 0.7, toon(0xc6955a), -0.6, 1.84, z0 + 0.9); // 木箱
      addBox(g, 0.72, 0.08, 0.72, toon(0x8d5a35), -0.6, 2.17, z0 + 0.9);
      return { group: g, endZ: z0 + len };
    }

    /* ============================================================
     * 2. 七島具象科技地標（原生幾何體拼裝，各顯學科特色）
     * ============================================================ */
    function codeScreenTex(rng) {
      return canvasTex(512, 320, (ctx, w, h) => {
        ctx.fillStyle = "#0e1b33";
        ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = "#1d2f55";
        ctx.fillRect(0, 0, w, 30);
        ["#ff5f57", "#febc2e", "#28c840"].forEach((c, i) => {
          ctx.fillStyle = c;
          ctx.beginPath();
          ctx.arc(20 + i * 22, 15, 6, 0, TAU);
          ctx.fill();
        });
        const pal = ["#7ee787", "#79c0ff", "#ffa657", "#d2a8ff", "#ff7b72", "#e6edf3"];
        let y = 52;
        const indents = [0, 1, 1, 2, 2, 1, 0, 1, 2, 2, 1, 0];
        for (let i = 0; i < 11; i++) {
          let x = 22 + indents[i] * 30;
          const segs = 2 + Math.floor(rng() * 3);
          for (let s = 0; s < segs; s++) {
            const sw = 30 + rng() * 90;
            ctx.fillStyle = pal[Math.floor(rng() * pal.length)];
            roundRect(ctx, x, y, sw, 13, 5);
            ctx.fill();
            x += sw + 12;
          }
          ctx.fillStyle = "#4b5d85";
          ctx.font = "12px monospace";
          ctx.fillText(String(i + 1), 4, y + 11);
          y += 24;
        }
        ctx.fillStyle = "#7ee787";
        ctx.fillRect(22, y, 12, 16);
      });
    }

    // 01 電腦探險島（硬體系統）：雙層伺服器機櫃 + 復古發光 CRT 螢幕 + 散熱管線
    function lmHardware() {
      const g = new THREE.Group();
      const steel = toon(0x46566e);
      const steelL = toon(0x6b7f9c);
      const dark = toon(0x2a3342);
      const ledG = glow(0x5dff9a, 0.9);
      const ledB = glow(0x59c8ff, 0.9);
      const ledR = glow(0xff6b6b, 0.9);

      // 雙層伺服器機櫃
      const rack = new THREE.Group();
      rack.position.set(-2.7, 0, -0.2);
      g.add(rack);
      addBox(rack, 3.2, 2.4, 2.1, steel, 0, 1.2, 0);
      addBox(rack, 2.8, 1.9, 1.9, steelL, 0, 3.35, 0);
      addBox(rack, 3.3, 0.14, 2.2, dark, 0, 2.45, 0);
      addBox(rack, 2.9, 0.14, 2.0, dark, 0, 4.35, 0);
      for (let i = 0; i < 4; i++) {
        addBox(rack, 2.7, 0.36, 0.08, dark, 0, 0.4 + i * 0.52, 1.07);
        addSph(rack, 0.06, i % 2 ? ledB : ledG, 1.15, 0.4 + i * 0.52, 1.12, 6, 5);
        addSph(rack, 0.06, ledR, 0.95, 0.4 + i * 0.52, 1.12, 6, 5);
      }
      for (let j = 0; j < 3; j++) {
        addBox(rack, 2.4, 0.38, 0.08, dark, 0, 2.75 + j * 0.52, 0.97);
        addSph(rack, 0.06, j % 2 ? ledG : ledB, 1.0, 2.75 + j * 0.52, 1.02, 6, 5);
      }
      addCyl(rack, 0.35, 0.35, 0.3, 12, dark, 0.7, 4.55, 0);

      // 復古發光陰極射線螢幕（CRT）
      const crt = new THREE.Group();
      crt.position.set(2.7, 0, 0.7);
      crt.rotation.y = -0.38;
      g.add(crt);
      const beige = toon(0xe9dfc6);
      addCyl(crt, 0.95, 1.15, 0.28, 12, toon(0xcfc3a6), 0, 0.14, 0);
      addCyl(crt, 0.35, 0.5, 0.45, 8, toon(0xcfc3a6), 0, 0.5, 0);
      addBox(crt, 2.7, 2.3, 2.1, beige, 0, 1.95, 0);
      const back = cylM(0.75, 1.1, 1.2, 8, toon(0xd8cdb0));
      back.rotation.x = Math.PI / 2;
      back.position.set(0, 1.95, -1.6);
      crt.add(back);
      addBox(crt, 2.25, 1.85, 0.14, toon(0xb9ad92), 0, 2.0, 1.04);
      const crtTex = canvasTex(256, 200, (c, w, h) => {
        c.fillStyle = "#06261d";
        c.fillRect(0, 0, w, h);
        c.fillStyle = "#6bffb0";
        c.font = "bold 22px monospace";
        ["C:\\> RUN ISLAND", "Loading...  OK", "CPU  RAM  I/O", "> _"].forEach((s, i) => c.fillText(s, 14, 40 + i * 34));
        c.fillStyle = "rgba(0,0,0,.25)";
        for (let y = 0; y < h; y += 4) c.fillRect(0, y, w, 1);
      });
      const crtScreen = addBox(crt, 1.95, 1.55, 0.1, new THREE.MeshBasicMaterial({ map: crtTex, color: 0xcfffe9 }), 0, 2.0, 1.12);
      crtScreen.userData.noShadow = true;
      addSph(crt, 0.07, ledG, 0.95, 0.95, 1.06, 6, 5);
      addSph(crt, 0.07, ledR, 0.75, 0.95, 1.06, 6, 5);
      for (const s of [-1, 1]) {
        const ant = cylM(0.025, 0.025, 1.3, 5, steel);
        ant.position.set(s * 0.45, 3.5, -0.1);
        ant.rotation.z = -s * 0.5;
        crt.add(ant);
      }

      // 散熱管線與風扇
      const pipeB = toon(0x3aa0ff);
      const pipeC = toon(0xd08a4a);
      const pA = cylM(0.2, 0.2, 2.4, 10, pipeB);
      pA.rotation.x = Math.PI / 2;
      pA.position.set(-3.3, 1.0, -2.3);
      g.add(pA);
      addSph(g, 0.27, pipeC, -3.3, 1.0, -3.5, 10, 8);
      const pB = cylM(0.2, 0.2, 7.2, 10, pipeB);
      pB.rotation.z = Math.PI / 2;
      pB.position.set(0.3, 1.0, -3.5);
      g.add(pB);
      addSph(g, 0.27, pipeC, 3.9, 1.0, -3.5, 10, 8);
      addCyl(g, 0.2, 0.2, 1.9, 10, pipeB, 3.9, 1.95, -3.5);
      const fanBox = new THREE.Group();
      fanBox.position.set(0, 2.0, -3.3);
      g.add(fanBox);
      addBox(fanBox, 1.8, 1.8, 0.5, steel, 0, 0, 0);
      addTor(fanBox, 0.7, 0.07, steelL, 0, 0, 0.27, TAU, 18);
      const blades = new THREE.Group();
      blades.position.z = 0.28;
      for (let k = 0; k < 4; k++) {
        const bl = boxM(0.22, 0.62, 0.06, toon(0x9fd0ff));
        bl.position.y = 0.32;
        const holder = new THREE.Group();
        holder.rotation.z = (k * Math.PI) / 2;
        holder.add(bl);
        blades.add(holder);
      }
      addSph(blades, 0.12, dark, 0, 0, 0.04, 8, 6);
      fanBox.add(blades);
      addCyl(g, 0.16, 0.16, 1.1, 8, pipeC, 0, 1.55, -3.5);
      addTor(g, 0.9, 0.12, pipeC, 2.7, 0.1, -2.0, Math.PI, 14).rotation.x = Math.PI / 2;

      tickers((t) => {
        blades.rotation.z = -t * 9;
        const k = 0.55 + 0.45 * Math.sin(t * 4);
        ledG.emissiveIntensity = 0.5 + 0.9 * k;
        ledB.emissiveIntensity = 0.5 + 0.9 * (1 - k);
        ledR.emissiveIntensity = Math.sin(t * 2.2) > 0.6 ? 1.4 : 0.35;
      });
      return g;
    }

    // 02 數位公民島（網路資安）：微光守護防護盾 + 藍白條紋訊號燈塔與安全閘門
    function lmSecurity() {
      const g = new THREE.Group();
      // 微光守護防護盾
      const sp = new THREE.Group();
      sp.position.set(-2.8, 0, 0.3);
      g.add(sp);
      addCyl(sp, 1.9, 2.2, 0.5, 20, toon(0xcfd8e6), 0, 0.25, 0);
      addCyl(sp, 1.5, 1.7, 0.2, 20, toon(0x8fa3c0), 0, 0.6, 0);
      const shape = new THREE.Shape();
      shape.moveTo(-1.1, 1.2);
      shape.lineTo(1.1, 1.2);
      shape.lineTo(1.1, 0.2);
      shape.bezierCurveTo(1.1, -0.7, 0.4, -1.2, 0, -1.5);
      shape.bezierCurveTo(-0.4, -1.2, -1.1, -0.7, -1.1, 0.2);
      shape.closePath();
      const mkShield = (scale, color, depth, bevel) => {
        const geo = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 2, curveSegments: 12 });
        geo.translate(0, 0, -depth / 2);
        const m = new THREE.Mesh(geo, color);
        m.scale.setScalar(scale);
        return m;
      };
      const shieldG = new THREE.Group();
      shieldG.position.y = 3.2;
      sp.add(shieldG);
      shieldG.add(mkShield(1.15, toon(0x3b8cff, { emissive: 0x1a4a9a, emissiveIntensity: 0.5 }), 0.35, 0.08));
      const inner = mkShield(0.8, toon(0xeaf4ff), 0.2, 0.04);
      inner.position.z = 0.28;
      shieldG.add(inner);
      // 鎖頭圖示
      addBox(shieldG, 0.62, 0.5, 0.14, toon(0x3b8cff), 0, -0.1, 0.5);
      addTor(shieldG, 0.2, 0.05, toon(0x3b8cff), 0, 0.2, 0.5, Math.PI, 12);
      addSph(shieldG, 0.07, toon(0xeaf4ff), 0, -0.1, 0.58, 6, 5);
      const halo = sphM(2.0, new THREE.MeshBasicMaterial({ color: 0x7fd0ff, transparent: true, opacity: 0.16, depthWrite: false }), 20, 14);
      halo.userData.noShadow = true;
      halo.raycast = () => {};
      shieldG.add(halo);

      // 藍白條紋訊號燈塔
      const lh = new THREE.Group();
      lh.position.set(3.0, 0, -0.4);
      g.add(lh);
      addCyl(lh, 1.45, 1.7, 0.6, 18, toon(0xc4ccd8), 0, 0.3, 0);
      const stripeBlue = toon(0x3b82f6);
      const stripeWhite = toon(0xffffff);
      for (let i = 0; i < 5; i++) {
        const rb = 1.25 - i * 0.07;
        const rt = 1.25 - (i + 1) * 0.07;
        addCyl(lh, rt, rb, 0.9, 16, i % 2 ? stripeWhite : stripeBlue, 0, 0.6 + 0.45 + i * 0.9, 0);
      }
      addCyl(lh, 1.2, 1.0, 0.2, 16, toon(0xe5383b), 0, 5.2, 0);
      addCyl(lh, 0.7, 0.7, 1.0, 12, glow(0xfff0a0, 0.8, 1.8, { transparent: true, opacity: 0.92 }), 0, 5.8, 0);
      addCone(lh, 0.95, 0.9, 12, toon(0xe5383b), 0, 6.75, 0);
      addSph(lh, 0.12, toon(0xffffff), 0, 7.25, 0, 6, 5);
      const beamPivot = new THREE.Group();
      beamPivot.position.y = 5.8;
      lh.add(beamPivot);
      const beam = new THREE.Mesh(
        new THREE.CylinderGeometry(1.7, 0.1, 7.5, 14, 1, true),
        new THREE.MeshBasicMaterial({ color: 0xfff3a0, transparent: true, opacity: 0.2, depthWrite: false, side: THREE.DoubleSide })
      );
      beam.rotation.z = -Math.PI / 2;
      beam.position.x = 3.75;
      beam.userData.noShadow = true;
      beam.raycast = () => {};
      beamPivot.add(beam);

      // 安全閘門
      const gate = new THREE.Group();
      gate.position.set(0, 0, 3.9);
      g.add(gate);
      const post = toon(0xe8edf5);
      addBox(gate, 0.45, 2.0, 0.45, post, -1.3, 1.0, 0);
      addBox(gate, 0.45, 2.0, 0.45, post, 1.3, 1.0, 0);
      addSph(gate, 0.28, toon(0xe5383b), -1.3, 2.1, 0, 8, 6);
      addSph(gate, 0.28, toon(0xe5383b), 1.3, 2.1, 0, 8, 6);
      addBox(gate, 0.55, 0.4, 0.5, toon(0x3b82f6), -1.3, 1.3, 0.05);
      const arm = new THREE.Group();
      arm.position.set(-1.3, 1.45, 0.4);
      gate.add(arm);
      for (let i = 0; i < 6; i++) addBox(arm, 0.45, 0.2, 0.2, i % 2 ? toon(0xffffff) : toon(0xe5383b), 0.25 + i * 0.4, 0, 0);
      addBox(arm, 0.4, 0.3, 0.3, toon(0x333b4d), -0.3, 0, 0);
      addBox(gate, 0.2, 0.2, 0.2, glow(0x5dff9a, 0.9), 1.3, 1.6, 0.25);

      tickers((t) => {
        shieldG.position.y = 3.2 + Math.sin(t * 1.6) * 0.18;
        shieldG.rotation.y = Math.sin(t * 0.7) * 0.5;
        halo.scale.setScalar(1 + Math.sin(t * 2.2) * 0.06);
        beamPivot.rotation.y = t * 1.3;
        const open = smoothstep(-0.3, 0.3, Math.sin(t * 0.8));
        arm.rotation.z = open * 1.05;
      });
      return g;
    }

    // 03 程式森林島（演程邏輯）：巨型筆記型電腦工坊 + 綠色立體積木樹
    function lmProgramming(ctx) {
      const g = new THREE.Group();
      // 巨型筆記型電腦工坊
      const lap = new THREE.Group();
      lap.position.set(0, 0, 1.4);
      g.add(lap);
      const silver = toon(0xcfd6e0);
      const silverD = toon(0x9ba6b6);
      addBox(lap, 6.0, 0.3, 3.8, silver, 0, 0.15, 0);
      addBox(lap, 6.1, 0.08, 3.9, silverD, 0, 0.02, 0);
      const keyItems = [];
      for (let r = 0; r < 5; r++) {
        for (let c = 0; c < 13; c++) {
          keyItems.push({ x: -2.5 + c * 0.42, y: 0.34, z: -1.4 + r * 0.4, sx: 0.36, sy: 0.12, sz: 0.34, color: r === 4 && c > 2 && c < 10 ? 0x39425a : 0x2a3142 });
        }
      }
      lap.add(instanced(new THREE.BoxGeometry(1, 1, 1), toon(0xffffff), keyItems));
      addBox(lap, 2.2, 0.06, 1.0, toon(0xe6ebf2), 0, 0.31, 1.35); // 觸控板
      // 掀開的螢幕（發光代碼）
      const lid = new THREE.Group();
      lid.position.set(0, 0.3, -1.85);
      lid.rotation.x = -0.28;
      lap.add(lid);
      addBox(lid, 6.0, 3.9, 0.2, silver, 0, 1.95, 0);
      const scr = addBox(lid, 5.5, 3.4, 0.06, new THREE.MeshBasicMaterial({ map: codeScreenTex(ctx.rng) }), 0, 1.95, 0.13);
      scr.userData.noShadow = true;
      addCyl(lid, 0.12, 0.12, 0.3, 8, silverD, -2.0, 0.05, 0).rotation.z = Math.PI / 2;
      addCyl(lid, 0.12, 0.12, 0.3, 8, silverD, 2.0, 0.05, 0).rotation.z = Math.PI / 2;

      // 綠色立體積木樹
      const greens = [0x39c26a, 0x4fd678, 0x7be28f];
      const brown = toon(0x8b5a2b);
      function blockTree(x, z, sc, hueShift) {
        const t = new THREE.Group();
        t.position.set(x, 0, z);
        t.scale.setScalar(sc);
        for (let i = 0; i < 3; i++) addBox(t, 0.7, 0.7, 0.7, brown, 0, 0.35 + i * 0.7, 0);
        const layers = [2.5, 1.9, 1.3];
        layers.forEach((s, i) => addBox(t, s, 0.8, s, toon(greens[(i + hueShift) % 3]), 0, 2.5 + i * 0.8, 0));
        const studMat = toon(greens[(hueShift + 1) % 3]);
        for (const [sx, sz] of [[-0.35, -0.35], [0.35, -0.35], [-0.35, 0.35], [0.35, 0.35]]) addCyl(t, 0.18, 0.18, 0.14, 10, studMat, sx, 4.97, sz);
        g.add(t);
        return t;
      }
      const trees = [blockTree(-4.5, -0.8, 1.0, 0), blockTree(4.4, 0.4, 0.85, 1), blockTree(3.4, -3.2, 0.7, 2), blockTree(-3.6, -3.2, 0.6, 1)];
      tickers((t) => {
        trees.forEach((tr, i) => (tr.rotation.z = Math.sin(t * 0.9 + i) * 0.015));
      });
      return g;
    }

    function brickTexture() {
      return canvasTex(128, 64, (c, w, h) => {
        c.fillStyle = "#cdbf9f";
        c.fillRect(0, 0, w, h);
        c.strokeStyle = "#a69571";
        c.lineWidth = 3;
        for (let r = 0; r < 4; r++) {
          const y = (r * h) / 4;
          c.beginPath();
          c.moveTo(0, y);
          c.lineTo(w, y);
          c.stroke();
          const off = r % 2 ? w / 4 : 0;
          for (let x = off; x < w + 1; x += w / 2) {
            c.beginPath();
            c.moveTo(x, y);
            c.lineTo(x, y + h / 4);
            c.stroke();
          }
        }
      });
    }

    // 04 演算法山（運算思維）：多層石磚階梯金字塔 + 頂端分叉指示決策標誌柱
    function lmAlgorithm() {
      const g = new THREE.Group();
      const tiers = 5;
      const th = 0.85;
      const sizes = [7.8, 6.3, 4.8, 3.3, 1.9];
      const baseTex = brickTexture();
      baseTex.wrapS = baseTex.wrapT = THREE.RepeatWrapping;
      const tints = [0xffffff, 0xf0e6cf];
      for (let k = 0; k < tiers; k++) {
        const tex = baseTex.clone();
        tex.needsUpdate = true;
        tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
        tex.repeat.set(sizes[k] / 2.2, 1);
        addBox(g, sizes[k], th, sizes[k], toon(tints[k % 2], { map: tex }), 0, th / 2 + k * th, 0);
        addBox(g, sizes[k] + 0.12, 0.1, sizes[k] + 0.12, toon(0xb7a782), 0, k * th + 0.05, 0);
      }
      // 石階
      for (let k = 0; k < tiers; k++) addBox(g, 1.7, th, 0.95, toon(0xece1c6), 0, th / 2 + k * th, sizes[k] / 2 - 0.05);

      // 頂端分叉指示決策標誌柱
      const topY = tiers * th;
      addCyl(g, 0.1, 0.12, 3.6, 8, toon(0x5b4636), 0, topY + 1.8, 0);
      const signTex = canvasTex(128, 128, (c, w, h) => {
        c.fillStyle = "#ffd166";
        c.fillRect(0, 0, w, h);
        c.strokeStyle = "#8a5a00";
        c.lineWidth = 8;
        c.strokeRect(6, 6, w - 12, h - 12);
        c.fillStyle = "#5b3a00";
        c.font = "bold 62px sans-serif";
        c.textAlign = "center";
        c.textBaseline = "middle";
        c.fillText("if?", w / 2, h / 2 + 4);
      });
      const diamond = new THREE.Group();
      diamond.position.set(0, topY + 3.7, 0);
      diamond.rotation.z = Math.PI / 4;
      addBox(diamond, 1.55, 1.55, 0.16, toon(0xffb703), 0, 0, 0);
      const face = new THREE.Mesh(new THREE.PlaneGeometry(1.25, 1.25), new THREE.MeshBasicMaterial({ map: signTex }));
      face.position.z = 0.09;
      face.userData.noShadow = true;
      diamond.add(face);
      g.add(diamond);
      addBox(g, 2.6, 0.12, 0.12, toon(0x5b4636), 0, topY + 2.45, 0);
      const mkArrow = (side, color, text) => {
        const a = new THREE.Group();
        a.position.set(side * 1.35, topY + 2.0, 0);
        a.rotation.z = -side * 0.35;
        addBox(a, 1.3, 0.42, 0.12, toon(color), 0, 0, 0);
        const tip = addCone(a, 0.3, 0.5, 3, toon(color), side * 0.9, 0, 0);
        tip.rotation.z = -side * Math.PI / 2;
        const tex = canvasTex(128, 48, (c, w, h) => {
          c.fillStyle = "rgba(0,0,0,0)";
          c.clearRect(0, 0, w, h);
          c.fillStyle = "#fff";
          c.font = "bold 34px sans-serif";
          c.textAlign = "center";
          c.textBaseline = "middle";
          c.fillText(text, w / 2, h / 2);
        });
        const lab = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 0.4), new THREE.MeshBasicMaterial({ map: tex, transparent: true }));
        lab.position.z = 0.07;
        lab.userData.noShadow = true;
        a.add(lab);
        g.add(a);
      };
      mkArrow(-1, 0x2ec27e, "True");
      mkArrow(1, 0xe5533d, "False");
      addCone(g, 0.18, 0.4, 6, toon(0xffd166), 0, topY + 4.75, 0);
      tickers((t) => {
        diamond.position.y = topY + 3.7 + Math.sin(t * 1.8) * 0.06;
      });
      return g;
    }

    // 05 資料海灣（數據儲存）：二進位刻痕方塊 + 發光高低條狀統計圖水晶柱
    function lmData(ctx) {
      const g = new THREE.Group();
      // 二進位刻痕方塊
      const binTex = canvasTex(256, 256, (c, w, h) => {
        c.fillStyle = "#3b5a78";
        c.fillRect(0, 0, w, h);
        c.font = "bold 40px monospace";
        c.textBaseline = "middle";
        for (let r = 0; r < 6; r++) {
          let s = "";
          for (let i = 0; i < 7; i++) s += ctx.rng() > 0.5 ? "1" : "0";
          c.fillStyle = "#223b52";
          c.fillText(s, 12, 28 + r * 40 + 2);
          c.fillStyle = "#9fe3ff";
          c.fillText(s, 10, 28 + r * 40);
        }
        c.strokeStyle = "#7fc9e6";
        c.lineWidth = 8;
        c.strokeRect(4, 4, w - 8, h - 8);
      });
      const binMat = toon(0xffffff, { map: binTex });
      const cube = (s, x, y, z, ry) => {
        const m = addBox(g, s, s, s, binMat, x, y, z);
        m.rotation.y = ry;
        return m;
      };
      cube(1.8, -3.0, 0.9, 0.2, 0.3);
      cube(1.4, -1.0, 0.7, 1.9, -0.25);
      cube(1.15, -3.0, 2.38, 0.2, 0.85);
      cube(0.9, -4.1, 0.45, 2.3, 0.1);

      // 發光高低條狀統計圖水晶柱
      addBox(g, 6.0, 0.3, 3.4, toon(0x1d6f78), 2.2, 0.15, -0.2);
      addBox(g, 5.6, 0.06, 0.08, toon(0xbff4f0), 2.2, 0.33, 1.25);
      addBox(g, 0.08, 0.06, 2.6, toon(0xbff4f0), -0.4, 0.33, 0.0);
      const heights = [1.6, 2.7, 2.0, 3.5, 2.5, 4.2];
      const crystals = [];
      heights.forEach((h, i) => {
        const grp = new THREE.Group();
        grp.position.set(0.15 + i * 0.88, 0.3, -0.2);
        const col = new THREE.Color().setHSL(0.47 - i * 0.012, 0.75, 0.55);
        const mat = new THREE.MeshToonMaterial({ color: col, emissive: col, emissiveIntensity: 0.45, transparent: true, opacity: 0.82, gradientMap });
        const body = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, h, 6), mat);
        body.position.y = h / 2;
        body.userData.noShadow = true;
        grp.add(body);
        const tip = new THREE.Mesh(new THREE.ConeGeometry(0.4, 0.55, 6), mat);
        tip.position.y = h + 0.275;
        tip.userData.noShadow = true;
        grp.add(tip);
        g.add(grp);
        crystals.push({ grp, mat, phase: i * 0.9 });
      });
      tickers((t) => {
        crystals.forEach((c) => {
          c.grp.scale.y = 1 + Math.sin(t * 1.5 + c.phase) * 0.06;
          c.mat.emissiveIntensity = 0.4 + 0.25 * (0.5 + 0.5 * Math.sin(t * 2 + c.phase));
        });
      });
      return g;
    }

    // 06 創作協作島（多媒體互動）：巨型復古相機 + 巨型木質繪圖板與調色盤
    function lmCreative() {
      const g = new THREE.Group();
      // 巨型復古相機
      const cam = new THREE.Group();
      cam.position.set(-2.7, 0, 0.3);
      cam.rotation.y = 0.28;
      g.add(cam);
      addBox(cam, 3.0, 0.5, 2.1, toon(0xa56d41), 0, 0.25, 0);
      addBox(cam, 3.8, 1.0, 1.9, toon(0x23262e), 0, 1.0, 0);
      addBox(cam, 3.8, 0.95, 1.9, toon(0xdfe3ea), 0, 1.98, 0);
      addBox(cam, 3.9, 0.12, 2.0, toon(0x9aa3b2), 0, 2.5, 0);
      addCyl(cam, 0.95, 0.95, 0.7, 28, toon(0x1c1f26), 0, 1.7, 1.2).rotation.x = Math.PI / 2;
      addCyl(cam, 0.78, 0.78, 0.5, 28, toon(0xb9c0cc), 0, 1.7, 1.62).rotation.x = Math.PI / 2;
      addCyl(cam, 0.55, 0.55, 0.12, 24, glow(0x59b8ff, 0.7, 0.9), 0, 1.7, 1.9).rotation.x = Math.PI / 2;
      addSph(cam, 0.14, toon(0xffffff), -0.2, 1.9, 2.0, 8, 6);
      addTor(cam, 0.82, 0.06, toon(0xe5383b), 0, 1.7, 1.66, TAU, 24);
      addBox(cam, 0.95, 0.5, 0.5, toon(0x3a3f4a), -1.1, 2.8, 0);
      addBox(cam, 0.9, 0.5, 0.5, toon(0x3a3f4a), 1.1, 2.8, 0.05);
      addBox(cam, 0.6, 0.3, 0.1, glow(0xfff2b0, 0.9, 1.2), 1.1, 2.82, 0.32);
      addCyl(cam, 0.2, 0.2, 0.2, 10, toon(0xe5383b), 1.5, 2.65, -0.4);
      const strap = torM(1.2, 0.07, toon(0xc0392b), Math.PI, 20);
      strap.rotation.z = Math.PI;
      strap.position.set(0, 2.5, -0.9);
      cam.add(strap);

      // 巨型木質繪圖板（畫架）
      const easel = new THREE.Group();
      easel.position.set(2.9, 0, 0.1);
      easel.rotation.y = -0.2;
      g.add(easel);
      const wood = toon(0xb07a45);
      for (const s of [-1, 1]) {
        const leg = cylM(0.1, 0.12, 4.4, 8, wood);
        leg.position.set(s * 1.15, 2.1, 0.15);
        leg.rotation.z = s * 0.06;
        leg.rotation.x = -0.1;
        easel.add(leg);
      }
      const backLeg = cylM(0.1, 0.12, 4.2, 8, wood);
      backLeg.position.set(0, 2.0, -1.0);
      backLeg.rotation.x = 0.33;
      easel.add(backLeg);
      const board = new THREE.Group();
      board.position.set(0, 2.9, 0.3);
      board.rotation.x = -0.12;
      easel.add(board);
      addBox(board, 3.0, 3.4, 0.2, wood, 0, 0, 0);
      const paintTex = canvasTex(256, 300, (c, w, h) => {
        const sk = c.createLinearGradient(0, 0, 0, h);
        sk.addColorStop(0, "#7fd0ff");
        sk.addColorStop(1, "#ffe9b0");
        c.fillStyle = sk;
        c.fillRect(0, 0, w, h);
        c.fillStyle = "#ffcf33";
        c.beginPath();
        c.arc(190, 70, 34, 0, TAU);
        c.fill();
        c.fillStyle = "#6fcf6f";
        c.beginPath();
        c.moveTo(0, 220);
        c.quadraticCurveTo(80, 140, 170, 210);
        c.quadraticCurveTo(220, 240, 256, 190);
        c.lineTo(256, h);
        c.lineTo(0, h);
        c.fill();
        c.fillStyle = "#e5533d";
        c.fillRect(70, 160, 46, 40);
        c.fillStyle = "#7a4b2a";
        c.beginPath();
        c.moveTo(62, 160);
        c.lineTo(93, 132);
        c.lineTo(124, 160);
        c.fill();
        ["#c58bff", "#ff6fb5", "#4fb3ff"].forEach((col, i) => {
          c.strokeStyle = col;
          c.lineWidth = 7;
          c.beginPath();
          c.moveTo(24 + i * 18, 270);
          c.quadraticCurveTo(40 + i * 18, 240, 60 + i * 18, 275);
          c.stroke();
        });
      });
      const paper = addBox(board, 2.6, 3.0, 0.08, new THREE.MeshBasicMaterial({ map: paintTex }), 0, 0, 0.13);
      paper.userData.noShadow = true;
      addBox(easel, 3.2, 0.14, 0.7, wood, 0, 1.1, 0.5);

      // 巨型調色盤
      const pal = new THREE.Group();
      pal.position.set(4.1, 0.1, 3.0);
      pal.rotation.y = -0.6;
      g.add(pal);
      const palBody = cylM(1.25, 1.25, 0.14, 24, toon(0xe0aa6e));
      palBody.scale.set(1.3, 1, 1);
      pal.add(palBody);
      addCyl(pal, 0.2, 0.2, 0.16, 12, toon(0x6b4a2b), -0.9, 0.01, 0.55);
      [0xe5383b, 0xffd23f, 0x3b82f6, 0x2ec27e, 0xc58bff].forEach((col, i) => {
        const a = -2.6 + i * 0.62;
        const b = sphM(0.28, toon(col), 10, 8);
        b.scale.set(1.2, 0.5, 1);
        b.position.set(Math.cos(a) * 1.35, 0.12, Math.sin(a) * 0.8);
        pal.add(b);
      });
      const brush = cylM(0.045, 0.045, 1.6, 6, toon(0x7a4b2a));
      brush.rotation.z = Math.PI / 2;
      brush.rotation.y = 0.5;
      brush.position.set(0.3, 0.2, 0);
      pal.add(brush);
      return g;
    }

    // 07 AI 智慧島（智慧應用）：半透明科技玻璃穹頂 + 內部懸浮機器人核心與旋轉軌道環
    function lmAI() {
      const g = new THREE.Group();
      const metal = toon(0x7a8aa6);
      addCyl(g, 4.6, 4.8, 0.45, 32, metal, 0, 0.225, 0);
      addTor(g, 4.3, 0.1, glow(0xff6fb5, 1.0, 1.6), 0, 0.5, 0, TAU, 48).rotation.x = Math.PI / 2;
      for (let k = 0; k < 8; k++) {
        const a = (k / 8) * TAU;
        addBox(g, 0.4, 0.3, 0.7, toon(0x56658a), Math.cos(a) * 4.7, 0.2, Math.sin(a) * 4.7).rotation.y = -a;
      }
      // 半透明科技玻璃穹頂
      const dome = new THREE.Mesh(new THREE.SphereGeometry(4.3, 36, 18, 0, TAU, 0, Math.PI / 2), glass(0xaee9ff, 0.2));
      dome.position.y = 0.45;
      dome.userData.noShadow = true;
      g.add(dome);
      const wire = new THREE.Mesh(
        new THREE.SphereGeometry(4.33, 16, 8, 0, TAU, 0, Math.PI / 2),
        new THREE.MeshBasicMaterial({ color: 0xffffff, wireframe: true, transparent: true, opacity: 0.32, depthWrite: false })
      );
      wire.position.y = 0.45;
      wire.userData.noShadow = true;
      g.add(wire);

      // 內部懸浮發光機器人核心
      addCyl(g, 0.9, 1.25, 0.9, 20, toon(0x3b4568), 0, 0.9, 0);
      addTor(g, 1.1, 0.07, glow(0x59e0ff, 1.0, 1.6), 0, 1.38, 0, TAU, 28).rotation.x = Math.PI / 2;
      const robot = new THREE.Group();
      robot.position.y = 3.0;
      g.add(robot);
      const white = toon(0xf6f9ff);
      addSph(robot, 0.62, white, 0, 0.95, 0, 18, 14);
      const visor = addSph(robot, 0.5, toon(0x1c2340), 0, 0.95, 0.38, 14, 10);
      visor.scale.set(1.05, 0.62, 0.5);
      const eyeMat = glow(0x59e0ff, 1.1, 1.6);
      addSph(robot, 0.09, eyeMat, -0.2, 0.97, 0.72, 8, 6);
      addSph(robot, 0.09, eyeMat, 0.2, 0.97, 0.72, 8, 6);
      addCyl(robot, 0.04, 0.04, 0.5, 6, white, 0, 1.75, 0);
      addSph(robot, 0.12, glow(0xff6fb5, 1.2, 1.8), 0, 2.05, 0, 8, 6);
      addSph(robot, 0.55, white, 0, 0.0, 0, 16, 12);
      addSph(robot, 0.26, glow(0xff6fb5, 1.2, 1.9), 0, 0.02, 0.46, 10, 8); // 發光核心
      for (const s of [-1, 1]) {
        addSph(robot, 0.17, toon(0xdfe6f2), s * 0.72, 0.1, 0, 8, 6);
        addSph(robot, 0.2, toon(0xdfe6f2), s * 0.22, -0.62, 0.0, 8, 6);
      }
      // 旋轉軌道環
      const ringDefs = [
        { R: 2.1, color: 0x59e0ff, speed: 1.1, tilt: [0.5, 0, 0.2] },
        { R: 2.6, color: 0xff6fb5, speed: -0.8, tilt: [-0.4, 0, 1.0] },
        { R: 3.1, color: 0xffd166, speed: 0.6, tilt: [1.1, 0.3, -0.3] }
      ];
      const rings = ringDefs.map((d) => {
        const holder = new THREE.Group();
        holder.position.y = 3.4;
        holder.rotation.set(d.tilt[0], d.tilt[1], d.tilt[2]);
        const spin = new THREE.Group();
        holder.add(spin);
        const ringMat = glow(d.color, 0.9, 1.5);
        addTor(spin, d.R, 0.05, ringMat, 0, 0, 0, TAU, 56).rotation.x = Math.PI / 2;
        addSph(spin, 0.17, ringMat, d.R, 0, 0, 8, 6);
        g.add(holder);
        return { spin, speed: d.speed };
      });
      tickers((t) => {
        robot.position.y = 3.0 + Math.sin(t * 1.7) * 0.22;
        robot.rotation.y = Math.sin(t * 0.8) * 0.5;
        rings.forEach((r) => (r.spin.rotation.y = t * r.speed));
      });
      return g;
    }

    function lmGeneric(ctx) {
      const g = new THREE.Group();
      addCyl(g, 2.4, 2.8, 1.2, 8, toon(0xd9d2c2), 0, 0.6, 0);
      addCone(g, 2.0, 3, 8, toon(parseInt(String(ctx.accent).replace("#", ""), 16) || 0x5aa9ff), 0, 2.7, 0);
      return g;
    }

    const LANDMARKS = { sys: lmHardware, citizen: lmSecurity, code: lmProgramming, algo: lmAlgorithm, data: lmData, create: lmCreative, ai: lmAI };

    /* ============================================================
     * 標籤精靈（島名 + 繁榮度星等）
     * ============================================================ */
    function makeLabel() {
      const canvas = document.createElement("canvas");
      canvas.width = 640;
      canvas.height = 190;
      const tex = new THREE.CanvasTexture(canvas);
      tex.anisotropy = 4;
      const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false, depthWrite: false });
      const sprite = new THREE.Sprite(mat);
      sprite.scale.set(11.5, 3.4, 1);
      sprite.renderOrder = 10;
      sprite.userData.state = {};
      sprite.userData.draw = (s) => {
        const st = Object.assign(sprite.userData.state, s || {});
        const ctx = canvas.getContext("2d");
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        const w = canvas.width;
        ctx.save();
        ctx.globalAlpha = st.dim ? 0.55 : 1;
        roundRect(ctx, 10, 12, w - 20, 130, 60);
        ctx.fillStyle = st.dim ? "rgba(235,238,242,.92)" : "rgba(255,255,255,.96)";
        ctx.fill();
        ctx.lineWidth = 8;
        ctx.strokeStyle = st.dim ? "#aab4c0" : st.accent || "#5aa9ff";
        ctx.stroke();
        ctx.fillStyle = st.dim ? "#7b8794" : "#1f3347";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.font = "800 54px 'Noto Sans TC','Microsoft JhengHei',sans-serif";
        ctx.fillText(`${st.emoji || ""} ${st.title || ""}`.trim(), w / 2, 60);
        ctx.font = "700 30px 'Noto Sans TC','Microsoft JhengHei',sans-serif";
        ctx.fillStyle = st.dim ? "#9aa5b1" : "#51667a";
        ctx.fillText(st.sub || "", w / 2, 108);
        ctx.restore();
        // 指標箭頭
        ctx.beginPath();
        ctx.moveTo(w / 2 - 22, 140);
        ctx.lineTo(w / 2 + 22, 140);
        ctx.lineTo(w / 2, 176);
        ctx.closePath();
        ctx.fillStyle = st.dim ? "#aab4c0" : st.accent || "#5aa9ff";
        ctx.fill();
        tex.needsUpdate = true;
      };
      return sprite;
    }
    const starText = (lv) => "★".repeat(lv) + "☆".repeat(3 - lv);

    /* ============================================================
     * 組裝：中央資訊聖殿、外圍七島、七座實體木棧橋
     * ============================================================ */
    const islandsGroup = new THREE.Group();
    const bridgesGroup = new THREE.Group();
    scene.add(islandsGroup, bridgesGroup);
    const islandRecords = [];
    const bridges = [];
    const pickRoots = [];
    const walkers = [];
    const dockFishers = [];
    const gradeRings = [];

    // ---------- 外圍七大島嶼 ----------
    ISLANDS_DATA.forEach((isl, idx) => {
      const total = ISLANDS_DATA.length;
      const theta = Math.PI + (idx * TAU) / total;
      const accentHex = new THREE.Color(isl.color || "#5aa9ff").getHex();
      const rng = mulberry32(1000 + idx * 97);
      const base = buildIslandBase(ISLAND_R, 6, accentHex, true);
      const root = new THREE.Group();
      root.add(base.group);
      root.position.set(Math.cos(theta) * RING_RADIUS, 0, Math.sin(theta) * RING_RADIUS);
      const inward = new THREE.Vector3(-Math.cos(theta), 0, -Math.sin(theta));
      root.rotation.y = Math.atan2(inward.x, inward.z); // 局部 +z 朝向中央聖殿
      root.userData.islandId = isl.id;
      islandsGroup.add(root);

      // 地標
      const lmCtx = { rng, accent: isl.color, idx };
      const builder = LANDMARKS[isl.id] || lmGeneric;
      const lmark = builder(lmCtx);
      lmark.position.set(0, TY, -1.5);
      root.add(lmark);

      // 步道與石階（鵝卵石交錯排列）
      const tierR = base.group.userData.tierR;
      const tierFront = -1.5 + tierR * Math.cos(Math.PI / 6);
      pebbleStrip(rng, 0, base.apothem + 0.4, tierFront + 0.9, 1.35, root, GY);
      addBox(root, 3.4, 0.3, 0.9, toon(0xf0e3c2), 0, GY + 0.15, tierFront + 0.55);
      // 台地前鵝卵石廣場
      pebbleStrip(rng, 0, tierFront - 0.4, tierFront - 3.2, 2.2, root, TY);

      // 圓木長椅、黑色復古路燈
      const benchL = makeBench();
      benchL.position.set(-4.9, GY, 6.6);
      benchL.rotation.y = Math.PI / 2;
      root.add(benchL);
      const benchR = makeBench();
      benchR.position.set(4.9, GY, 6.6);
      benchR.rotation.y = -Math.PI / 2;
      root.add(benchR);
      for (const sx of [-2.5, 2.5]) {
        const lamp = makeLamp();
        lamp.position.set(sx, GY, 8.2);
        root.add(lamp);
      }
      const lamp3 = makeLamp();
      lamp3.position.set(-tierR * 0.95, GY, -1.5 + 2.0);
      root.add(lamp3);

      // 小花叢
      let placed = 0;
      let guard = 0;
      while (placed < 11 && guard++ < 200) {
        const a = rng() * TAU;
        const r = 4 + rng() * 6.0;
        const x = Math.sin(a) * r;
        const z = Math.cos(a) * r;
        if (Math.hypot(x, z + 1.5) < tierR + 0.9) continue;
        if (Math.abs(x) < 2.2 && z > 3) continue;
        if (Math.hypot(Math.abs(x) - 4.9, z - 6.6) < 1.9) continue;
        if (Math.hypot(x, z) > ISLAND_R * 0.84) continue;
        const bush = makeFlowerBush(rng);
        bush.position.set(x, GY, z);
        root.add(bush);
        placed++;
      }

      // 碼頭 + 垂釣 NPC（生活細節）
      const side = idx % 2 ? 1 : -1;
      const dockPsi = (side * 2 * Math.PI) / 3;
      const dock = makeDock(ISLAND_R, base.apothem * ((ISLAND_R + 1.2) / ISLAND_R));
      const dockRoot = new THREE.Group();
      dockRoot.rotation.y = dockPsi;
      dockRoot.add(dock.group);
      root.add(dockRoot);
      const fisher = makeNPC({
        pose: "fish",
        body: [0x4aa3ff, 0x2ec27e, 0xff8a65, 0xc58bff][idx % 4],
        phase: idx,
        waterDrop: 1.55,
        lines: ["魚兒今天不太上鉤…🎣", "海風好舒服～", "釣到一條會寫程式的魚！"]
      });
      fisher.root.position.set(0.1, 1.54, dock.endZ - 0.9);
      dockRoot.add(fisher.root);
      dockFishers.push(fisher);

      // 長椅旁看書 NPC
      const reader = makeNPC({
        pose: "read",
        sit: true,
        body: [0xff7a8a, 0xffb347, 0x6bcf8e, 0x7aa7ff][idx % 4],
        pack: 0x8b5a2b,
        lines: ["這章好有趣，再看一頁！📖", "資訊課真好玩～", "我在複習單元重點。"]
      });
      const readerOnLeft = idx % 2 === 0;
      reader.root.position.set(readerOnLeft ? -4.9 : 4.9, GY + 0.68, 6.6);
      reader.root.rotation.y = readerOnLeft ? Math.PI / 2 : -Math.PI / 2;
      root.add(reader.root);

      // 繁榮度升級建築（Lv.1 旗幟 / Lv.2 彩旗拱門 / Lv.3 金星光環）
      const lv1 = new THREE.Group();
      const flagPole = new THREE.Group();
      flagPole.position.set(-6.1, GY, 3.2);
      addCyl(flagPole, 0.07, 0.09, 4.0, 6, toon(0xdadfe8), 0, 2.0, 0);
      addSph(flagPole, 0.14, toon(0xf2c14e), 0, 4.05, 0, 8, 6);
      const flagCloth = addBox(flagPole, 1.5, 0.9, 0.05, toon(accentHex), 0.78, 3.5, 0);
      lv1.add(flagPole);
      root.add(lv1);
      const lv2 = new THREE.Group();
      for (const sx of [-1, 1]) addCyl(lv2, 0.08, 0.1, 3.4, 6, toon(0xdadfe8), sx * 3.1, GY + 1.7, 9.0);
      const bunt = [];
      for (let k = 0; k <= 8; k++) {
        const u = k / 8;
        bunt.push({
          x: -3.1 + u * 6.2,
          y: GY + 3.25 - Math.sin(Math.PI * u) * 0.55 - 0.18,
          z: 9.0,
          rz: Math.PI,
          sx: 0.45,
          sy: 0.55,
          sz: 0.45,
          color: [accentHex, 0xffd23f, 0xffffff, 0xff7aa8][k % 4]
        });
      }
      const buntMesh = instanced(new THREE.ConeGeometry(0.5, 1, 3), toon(0xffffff, { side: THREE.DoubleSide }), bunt);
      lv2.add(buntMesh);
      root.add(lv2);
      const lv3 = new THREE.Group();
      const star = new THREE.Mesh(new THREE.OctahedronGeometry(0.75, 0), glow(0xffd23f, 1.1, 1.6));
      star.scale.y = 1.35;
      star.position.set(0, TY + 9.3, -1.5);
      lv3.add(star);
      const halo = torM(1.3, 0.07, glow(0xffd23f, 1.0, 1.5), TAU, 36);
      halo.position.copy(star.position);
      halo.rotation.x = Math.PI / 2.4;
      lv3.add(halo);
      root.add(lv3);
      tickers((t) => {
        star.rotation.y = t * 1.6;
        star.position.y = TY + 9.3 + Math.sin(t * 2 + idx) * 0.18;
        halo.position.y = star.position.y;
        halo.rotation.z = t * 0.9;
        flagCloth.rotation.y = Math.sin(t * 3 + idx) * 0.25;
        flagCloth.position.x = 0.75 + Math.sin(t * 3 + idx) * 0.03;
      });
      lv1.visible = lv2.visible = lv3.visible = false;

      // 年級篩選金色呼吸光環
      const beaconMat = new THREE.MeshBasicMaterial({ color: 0xffd23f, transparent: true, opacity: 0.8, depthWrite: false, side: THREE.DoubleSide });
      const beacon = new THREE.Mesh(polyRingGeo(ISLAND_R + 5.4, ISLAND_R + 4.2, 6), beaconMat);
      beacon.position.y = 0.28;
      beacon.renderOrder = 3;
      beacon.visible = false;
      beacon.raycast = () => {};
      beacon.userData.noDim = true;
      root.add(beacon);
      gradeRings.push({ mat: beaconMat, mesh: beacon });

      // 島嶼名稱與星等標籤
      const label = makeLabel();
      label.position.set(0, TY + 10.8, -1.5);
      root.add(label);
      label.userData.draw({ emoji: isl.emoji, title: isl.name, sub: `${isl.tag || ""}  ${starText(0)}`, accent: isl.color });

      setShadows(root);

      const seqGrades = [...new Set((isl.sequence || []).map((s) => s.grade).filter(Boolean))];
      let finalGrades = seqGrades;
      if (!finalGrades.length && Array.isArray(isl.grade) && isl.grade.length) {
        const lo = Math.min(...isl.grade);
        const hi = Math.max(...isl.grade);
        finalGrades = [];
        for (let gr = lo; gr <= hi; gr++) finalGrades.push(gr);
      }

      root.updateMatrixWorld(true);
      const dockWorld = root.localToWorld(new THREE.Vector3(0, GY, base.apothem));
      islandRecords.push({
        id: isl.id,
        name: isl.name,
        emoji: isl.emoji,
        tag: isl.tag,
        color: isl.color,
        sequenceLen: Array.isArray(isl.sequence) ? isl.sequence.length : 0,
        index: idx,
        angle: theta,
        group: root,
        foam: base.foam,
        foamRing: base.foam[0],
        outerFoamRing: base.foam[1],
        labelSprite: label,
        beaconRing: beacon,
        beaconMat,
        grades: finalGrades,
        dimmed: false,
        level1Props: lv1,
        level2Props: lv2,
        level3Props: lv3,
        currentLevel: null,
        progressPct: 0,
        inward,
        dockPos: dockWorld,
        pos: root.position.clone()
      });
      root.userData.record = islandRecords[islandRecords.length - 1];
      pickRoots.push(root);

      // 實體木棧橋直通中央聖殿
      const br = buildBridge(theta, idx);
      bridgesGroup.add(br.group);
      bridges.push(br);
      pickRoots.push(br.group);

      // 橋上行走 NPC
      const walkerCount = idx % 3 === 0 ? 2 : 1;
      for (let w = 0; w < walkerCount; w++) {
        const npc = makeNPC({
          pose: "walk",
          body: [0x4aa3ff, 0xff7a8a, 0x6bcf8e, 0xffb347, 0xc58bff][(idx + w * 2) % 5],
          lines: ["橋上風景真棒！🌉", "我要去隔壁島串門子～", "小心木板，慢慢走～"]
        });
        const dir = w % 2 === 0 ? 1 : -1;
        const st = { npc, br, dir, u: 0.12 + rng() * 0.76, speed: 0.012 + rng() * 0.01, lane: dir > 0 ? 0.62 : -0.62 };
        walkers.push(st);
        br.group.add(npc.root);
      }
    });

    // ---------- 2. 中央資訊聖殿（八角、全場最高的三層圓形榮耀基座 + 獎盃 + 環繞旗幟） ----------
    const templeRoot = new THREE.Group();
    templeRoot.userData.isSanctuary = true;
    scene.add(templeRoot);
    pickRoots.push(templeRoot);
    const templeBase = buildIslandBase(TEMPLE_R, 8, 0xf2c14e, false);
    templeRoot.add(templeBase.group);
    const marble = toon(0xf7f3ea);
    const cream = toon(0xf1d9a8);
    const goldM = new THREE.MeshToonMaterial({ color: 0xf2c14e, emissive: 0x6b4a00, emissiveIntensity: 0.25, gradientMap });
    const trophyMat = new THREE.MeshToonMaterial({ color: 0xf2c14e, emissive: 0xffb300, emissiveIntensity: 0.1, gradientMap, side: THREE.DoubleSide });

    // 三層圓形榮耀基座
    addCyl(templeRoot, 8.4, 8.8, 1.0, 24, marble, 0, GY + 0.5, 0);
    addCyl(templeRoot, 8.55, 8.55, 0.14, 24, goldM, 0, GY + 1.0, 0);
    addCyl(templeRoot, 6.4, 6.7, 1.1, 24, cream, 0, GY + 1.0 + 0.55, 0);
    addCyl(templeRoot, 6.55, 6.55, 0.14, 24, goldM, 0, GY + 2.1, 0);
    addCyl(templeRoot, 4.4, 4.7, 1.2, 24, marble, 0, GY + 2.1 + 0.6, 0);
    addCyl(templeRoot, 4.55, 4.55, 0.16, 24, goldM, 0, GY + 3.3, 0);
    const T_TOP = GY + 3.3;

    // 圓柱廊與環形楣樑
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * TAU + Math.PI / 8;
      const cx = Math.sin(a) * 7.55;
      const cz = Math.cos(a) * 7.55;
      addCyl(templeRoot, 0.34, 0.4, 3.0, 10, marble, cx, GY + 1.0 + 1.5, cz);
      addBox(templeRoot, 0.95, 0.25, 0.95, cream, cx, GY + 1.0 + 3.1, cz).rotation.y = a;
      addBox(templeRoot, 0.8, 0.22, 0.8, cream, cx, GY + 1.0 + 0.11, cz).rotation.y = a;
    }
    addTor(templeRoot, 7.55, 0.26, goldM, 0, GY + 1.0 + 3.35, 0, TAU, 48).rotation.x = Math.PI / 2;

    // 頂部金屬獎盃（LatheGeometry 車削輪廓 + 雙耳杯把 + 旋轉星光）
    addCyl(templeRoot, 1.2, 1.5, 0.8, 16, toon(0x3b4568), 0, T_TOP + 0.4, 0);
    addCyl(templeRoot, 1.0, 1.1, 0.25, 16, goldM, 0, T_TOP + 0.9, 0);
    addCyl(templeRoot, 0.45, 0.65, 1.5, 12, goldM, 0, T_TOP + 1.8, 0);
    const trophy = new THREE.Group();
    trophy.position.set(0, T_TOP + 2.55, 0);
    templeRoot.add(trophy);
    const cupPts = [
      [0.001, 0], [0.55, 0], [0.4, 0.3], [0.28, 0.85], [0.5, 1.2], [1.05, 1.7], [1.5, 2.6], [1.58, 3.35], [1.42, 3.4],
      [1.32, 2.65], [0.95, 1.95], [0.001, 1.8]
    ].map((p) => new THREE.Vector2(p[0], p[1]));
    trophy.add(new THREE.Mesh(new THREE.LatheGeometry(cupPts, 32), trophyMat));
    addTor(trophy, 1.5, 0.1, goldM, 0, 3.38, 0, TAU, 40).rotation.x = Math.PI / 2;
    for (const s of [-1, 1]) {
      const h = torM(0.7, 0.12, goldM, Math.PI, 18);
      h.position.set(s * 1.5, 2.55, 0);
      h.rotation.z = s > 0 ? -Math.PI / 2 : Math.PI / 2;
      trophy.add(h);
    }
    const trophyStar = new THREE.Mesh(new THREE.OctahedronGeometry(0.62, 0), glow(0xffe27a, 1.0, 1.5));
    trophyStar.scale.y = 1.4;
    trophyStar.position.y = 4.4;
    trophy.add(trophyStar);

    // 環繞立體旗幟（七島島色；未完成島嶼旗幟為灰色）
    const flagCarousel = new THREE.Group();
    flagCarousel.position.y = T_TOP;
    templeRoot.add(flagCarousel);
    const flagMats = {};
    ISLANDS_DATA.forEach((isl, i) => {
      const a = (i / ISLANDS_DATA.length) * TAU;
      const pole = new THREE.Group();
      pole.position.set(Math.sin(a) * 3.3, 0, Math.cos(a) * 3.3);
      pole.rotation.y = a + Math.PI / 2;
      addCyl(pole, 0.06, 0.07, 3.8, 6, toon(0xe8ecf3), 0, 1.9, 0);
      addSph(pole, 0.12, goldM, 0, 3.85, 0, 8, 6);
      const fm = new THREE.MeshToonMaterial({ color: 0x9aa8b8, gradientMap });
      const cloth = addBox(pole, 1.35, 0.8, 0.06, fm, 0.7, 3.2, 0);
      flagMats[isl.id] = { mat: fm, cloth, color: new THREE.Color(isl.color || "#5aa9ff") };
      flagCarousel.add(pole);
    });

    // 封印穹罩（未解封時保護獎盃）
    const sealMat = new THREE.MeshPhongMaterial({ color: 0x9fb4d6, transparent: true, opacity: 0.34, shininess: 60, depthWrite: false });
    const seal = new THREE.Mesh(new THREE.SphereGeometry(3.3, 24, 16), sealMat);
    seal.position.y = T_TOP + 4.6;
    seal.userData.noShadow = true;
    seal.raycast = () => {};
    templeRoot.add(seal);

    // 覺醒金色光環
    const awakeRingMat = new THREE.MeshBasicMaterial({ color: 0xffe27a, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide });
    const awakeRing = new THREE.Mesh(new THREE.RingGeometry(1, 1.4, 48), awakeRingMat);
    awakeRing.rotation.x = -Math.PI / 2;
    awakeRing.position.y = T_TOP + 0.3;
    awakeRing.raycast = () => {};
    templeRoot.add(awakeRing);

    // 聖殿周邊橋頭鵝卵石步道與路燈
    ISLANDS_DATA.forEach((isl, i) => {
      const theta = Math.PI + (i * TAU) / ISLANDS_DATA.length;
      const strip = new THREE.Group();
      strip.rotation.y = Math.atan2(Math.cos(theta), Math.sin(theta));
      pebbleStrip(mulberry32(77 + i), 0, 8.9, BRIDGE_Z0 + 1.1, 1.3, strip, GY);
      templeRoot.add(strip);
      const la = Math.PI + (i + 0.5) * (TAU / ISLANDS_DATA.length);
      const lamp = makeLamp();
      lamp.position.set(Math.cos(la) * 10.2, GY, Math.sin(la) * 10.2);
      templeRoot.add(lamp);
    });

    // 聖殿長椅與看書小人
    {
      const bench = makeBench();
      const a = Math.PI + 1.5 * (TAU / 7) + 0.3;
      bench.position.set(Math.cos(a) * 9.4, GY, Math.sin(a) * 9.4);
      bench.rotation.y = Math.atan2(-Math.cos(a), -Math.sin(a));
      templeRoot.add(bench);
      const npc = makeNPC({ pose: "read", sit: true, body: 0xffb347, lines: ["聖殿的獎盃好閃亮！🏆", "集滿七面旗就能解封囉～"] });
      npc.root.position.set(bench.position.x, GY + 0.68, bench.position.z);
      npc.root.rotation.y = bench.rotation.y;
      templeRoot.add(npc.root);
    }

    // 聖殿標籤
    const templeLabel = makeLabel();
    templeLabel.position.set(0, T_TOP + 11.2, 0);
    templeLabel.scale.set(13, 3.8, 1);
    templeRoot.add(templeLabel);
    setShadows(templeRoot);

    /* ============================================================
     * 環境裝飾：白雲飄動、夜間螢火蟲
     * ============================================================ */
    const cloudMat = new THREE.MeshToonMaterial({ color: 0xffffff, transparent: true, opacity: 0.94, gradientMap });
    const clouds = [];
    for (let i = 0; i < 7; i++) {
      const c = new THREE.Group();
      const rr = mulberry32(300 + i);
      const n = 3 + Math.floor(rr() * 3);
      for (let k = 0; k < n; k++) {
        const s = sphM(2.2 + rr() * 2.2, cloudMat, 12, 8);
        s.position.set((k - n / 2) * 2.6, rr() * 1.2, (rr() - 0.5) * 2);
        s.scale.y = 0.62;
        s.userData.noPick = true;
        c.add(s);
      }
      const ang = (i / 7) * TAU;
      c.userData = { ang, rad: 88 + rr() * 22, y: 15 + rr() * 8, speed: 0.01 + rr() * 0.01 };
      scene.add(c);
      clouds.push(c);
    }
    tickers((t) => {
      clouds.forEach((c) => {
        const a = c.userData.ang + t * c.userData.speed * 0.2;
        c.position.set(Math.cos(a) * c.userData.rad, c.userData.y, Math.sin(a) * c.userData.rad);
      });
    });

    const fireflyCount = 160;
    const ffGeo = new THREE.BufferGeometry();
    const ffArr = new Float32Array(fireflyCount * 3);
    {
      const rr = mulberry32(55);
      for (let i = 0; i < fireflyCount; i++) {
        const a = rr() * TAU;
        const r = 8 + rr() * 58;
        ffArr[i * 3] = Math.cos(a) * r;
        ffArr[i * 3 + 1] = 2.5 + rr() * 9;
        ffArr[i * 3 + 2] = Math.sin(a) * r;
      }
    }
    ffGeo.setAttribute("position", new THREE.BufferAttribute(ffArr, 3));
    const ffMat = new THREE.PointsMaterial({ color: 0xfff2a8, size: 0.7, transparent: true, opacity: 0.9, depthWrite: false, map: haloTexture() });
    const fireflies = new THREE.Points(ffGeo, ffMat);
    fireflies.visible = false;
    fireflies.frustumCulled = false;
    scene.add(fireflies);

    /* ============================================================
     * 日夜模式切換
     * ============================================================ */
    let isNight = false;
    const dnStateLabel = toggleBtn.querySelector("#dnStateLabel");
    function applyDayNight(night) {
      isNight = !!night;
      toggleBtn.classList.toggle("is-night", isNight);
      if (resetCamBtn) resetCamBtn.classList.toggle("is-night", isNight);
      toggleBtn.setAttribute("aria-pressed", String(isNight));
      if (dnStateLabel) dnStateLabel.textContent = isNight ? "目前：🌙 夜晚" : "目前：☀️ 白天";
      mapWrap.style.background = isNight ? "#0a1230" : "linear-gradient(180deg, #7fd3ff 0%, #dff5ff 100%)";
      scene.background = isNight ? skyNight : skyDay;
      scene.fog.color.setHex(isNight ? 0x27427d : 0xdff5ff);
      hemiLight.color.setHex(isNight ? 0x7f95d6 : 0xffffff);
      hemiLight.groundColor.setHex(isNight ? 0x1a2547 : 0xcfe8d0);
      hemiLight.intensity = isNight ? 0.5 : 0.72;
      sunLight.color.setHex(isNight ? 0x9db4ff : 0xfff2d6);
      sunLight.intensity = isNight ? 0.28 : 0.62;
      seaMat.color.setHex(isNight ? 0x14789f : 0x35d6cf);
      seaMat.opacity = isNight ? 0.88 : 0.8;
      seabedMat.color.setHex(isNight ? 0x0a3d5e : 0x1e9bb8);
      cloudMat.color.setHex(isNight ? 0x8ca8d6 : 0xffffff);
      cloudMat.opacity = isNight ? 0.6 : 0.94;
      nightGlows.forEach((g) => (g.m.emissiveIntensity = isNight ? g.night : g.day));
      lampHalos.forEach((m) => (m.opacity = isNight ? 0.85 : 0));
      fireflies.visible = isNight;
    }
    toggleBtn.addEventListener("click", () => {
      safePlayAudio("playClick");
      applyDayNight(!isNight);
    });

    /* ============================================================
     * 4. 相機特寫 / 全景（平滑插值）
     * ============================================================ */
    const clock = new THREE.Clock();
    const tween = {
      active: false,
      t0: 0,
      dur: 1.2,
      fromPos: new THREE.Vector3(),
      toPos: new THREE.Vector3(),
      fromTarget: new THREE.Vector3(),
      toTarget: new THREE.Vector3(),
      isFocused: false,
      focusedId: null
    };

    function flyTo(pos, target, dur, focusedId) {
      tween.active = true;
      tween.t0 = clock.getElapsedTime();
      tween.dur = dur;
      tween.fromPos.copy(camera.position);
      tween.fromTarget.copy(controls.target);
      tween.toPos.copy(pos);
      tween.toTarget.copy(target);
      tween.isFocused = !!focusedId;
      tween.focusedId = focusedId || null;
      intro.active = false;
    }

    function focusOnIsland(rec) {
      if (!rec) return;
      const p = rec.group.position;
      // 於橋側（島前方）斜上方特寫，地標正面對鏡頭
      const pos = new THREE.Vector3(p.x + rec.inward.x * 23, 16.5, p.z + rec.inward.z * 23);
      const target = new THREE.Vector3(p.x - rec.inward.x * 1.5, 3.4, p.z - rec.inward.z * 1.5);
      flyTo(pos, target, 1.15, rec.id);
    }

    function focusOnSanctuary() {
      flyTo(new THREE.Vector3(7, 22, 32), new THREE.Vector3(0, 7.5, 0), 1.25, "sanctuary");
    }

    function resetCameraToPanorama() {
      const p = panoramaPose();
      flyTo(p.pos, p.target, 1.2, null);
    }
    const resetView = resetCameraToPanorama;

    resetCamBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      safePlayAudio("playClick");
      resetCameraToPanorama();
    });

    // 登島運鏡動畫
    const intro = { active: false, t0: 0, dur: 1.45, fromPos: new THREE.Vector3(-30, 150, 120), fromTarget: new THREE.Vector3(0, 0, 0) };
    function triggerBoardingCameraTransition() {
      const p = panoramaPose();
      intro.active = true;
      intro.t0 = clock.getElapsedTime();
      intro.toPos = p.pos;
      intro.toTarget = p.target;
      tween.active = false;
      tween.isFocused = false;
      tween.focusedId = null;
      camera.position.copy(intro.fromPos);
      controls.target.copy(intro.fromTarget);
      controls.update();
    }

    /* ============================================================
     * 抽屜開展、聖殿榮譽證書、彩帶施放
     * ============================================================ */
    function openIslandDrawer(islandId, tab, unitKey) {
      if (typeof window.openIslandDrawer === "function" && window.openIslandDrawer !== openIslandDrawer) {
        window.openIslandDrawer(islandId, tab, unitKey);
        return;
      }
      if (typeof window.openIsland === "function") {
        window.openIsland(islandId, tab || "標準", unitKey || null);
        return;
      }
      const svgIsland = document.querySelector(`#map .island[data-id="${islandId}"]`);
      if (svgIsland) svgIsland.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
    }
    if (typeof window.openIslandDrawer !== "function") window.openIslandDrawer = openIslandDrawer;

    function launchCelebrationConfetti() {
      if (typeof window.confetti !== "function") return;
      const fire = (origin, angle) =>
        window.confetti({ particleCount: 90, spread: 70, angle, origin, zIndex: 9500, colors: ["#ffd166", "#ff6fb5", "#4fb3ff", "#5fd18b", "#c58bff"] });
      fire({ x: 0.1, y: 0.75 }, 60);
      fire({ x: 0.9, y: 0.75 }, 120);
      setTimeout(() => window.confetti({ particleCount: 140, spread: 100, startVelocity: 38, origin: { x: 0.5, y: 0.45 }, zIndex: 9500 }), 260);
    }

    let toastTimer = null;
    function showToast(msg) {
      toastEl.textContent = msg;
      toastEl.classList.add("show");
      clearTimeout(toastTimer);
      toastTimer = setTimeout(() => toastEl.classList.remove("show"), 2600);
    }

    // 聖殿榮譽證書
    const certWrap = document.createElement("div");
    certWrap.className = "v2-cert-wrap";
    certWrap.setAttribute("role", "dialog");
    certWrap.setAttribute("aria-modal", "true");
    document.body.appendChild(certWrap);
    const closeCert = () => certWrap.classList.remove("show");
    certWrap.addEventListener("click", (e) => {
      if (e.target === certWrap) closeCert();
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && certWrap.classList.contains("show")) closeCert();
    });

    function openBuiltinCertificate() {
      const p = window.Store && window.Store.profile;
      const school = (window.APP_CONFIG && window.APP_CONFIG.SCHOOL) || "資訊課程島學園";
      const gradeMap = { 7: "七", 8: "八", 9: "九" };
      let who = "榮譽領航員（訪客體驗模式）";
      if (p && p.cls && p.seat && p.name) {
        const gc = gradeMap[String(p.cls)[0]] || String(p.cls)[0];
        who = `${gc}年${parseInt(String(p.cls).slice(1), 10) || String(p.cls).slice(1)}班 ${p.seat}號 · ${p.name}`;
      }
      const d = new Date();
      const ds = `${d.getFullYear()} 年 ${String(d.getMonth() + 1).padStart(2, "0")} 月 ${String(d.getDate()).padStart(2, "0")} 日`;
      certWrap.innerHTML = `
        <div class="v2-cert">
          <div class="meta">🏛️ ${school}</div>
          <h2>🏆 資訊聖殿 · 終極榮譽證書</h2>
          <div class="who">${who}</div>
          <div class="meta">已完成七大島嶼全部挑戰　核發日期：${ds}</div>
          <ul>${ISLANDS_DATA.map((i) => `<li style="--c:${i.color}"><span>${i.emoji} ${i.name}</span><span>Lv.3 · 100% 滿分</span></li>`).join("")}</ul>
          <div class="acts">
            <button type="button" id="v2CertConfetti">🎉 再次施放彩帶</button>
            <button type="button" class="ghost" id="v2CertDownload">📥 下載榮譽證書</button>
            <button type="button" class="ghost" id="v2CertClose">關閉</button>
          </div>
        </div>`;
      certWrap.querySelector("#v2CertConfetti").onclick = () => {
        safePlayAudio("playSanctuaryFanfare");
        launchCelebrationConfetti();
      };
      certWrap.querySelector("#v2CertClose").onclick = closeCert;
      const dlBtn = certWrap.querySelector("#v2CertDownload");
      if (dlBtn) {
        dlBtn.onclick = async () => {
          if (typeof window.html2canvas !== "function") {
            alert("截圖模組尚未就緒，請稍候重試！");
            return;
          }
          try {
            const certCard = certWrap.querySelector(".v2-cert");
            dlBtn.style.opacity = "0.5";
            const canvas = await window.html2canvas(certCard, { scale: 2, useCORS: true, backgroundColor: null });
            dlBtn.style.opacity = "";
            const link = document.createElement("a");
            link.download = `資訊課程島_榮譽證書_${Date.now()}.png`;
            link.href = canvas.toDataURL("image/png");
            link.click();
          } catch (e) {
            console.warn("[cert] 下載失敗:", e);
            dlBtn.style.opacity = "";
          }
        };
      }
      certWrap.classList.add("show");
    }

    function openSanctuaryCertificateModal() {
      if (typeof window.openSanctuaryCertificateModal === "function" && window.openSanctuaryCertificateModal !== openSanctuaryCertificateModal) {
        window.openSanctuaryCertificateModal();
      } else {
        openBuiltinCertificate();
      }
    }
    if (typeof window.openSanctuaryCertificateModal !== "function") window.openSanctuaryCertificateModal = openSanctuaryCertificateModal;

    /* ============================================================
     * 學習進度 → 島嶼建築等級（Lv.0~3）與聖殿解封
     * ============================================================ */
    const sanctuaryState = { unlocked: false, awakeningActive: false, awakeT0: 0, pendingAwakeningReplay: false, fullCount: 0 };
    const bounces = [];
    const pendingUpgradeReplays = [];

    const computeCompletionLevel = (pct) => (pct >= 100 ? 3 : pct >= 50 ? 2 : pct >= 1 ? 1 : 0);

    function calculateIslandProgressMap(customInput) {
      const map = {};
      if (customInput && typeof customInput === "object" && !Array.isArray(customInput) && !(customInput instanceof Event) && !("animateUpgrade" in customInput)) {
        islandRecords.forEach((rec) => {
          const raw = Number(customInput[rec.id]);
          map[rec.id] = Number.isFinite(raw) ? clamp(Math.round(raw), 0, 100) : 0;
        });
        return map;
      }
      const rawEvents = Array.isArray(customInput) ? customInput : window.Store && typeof window.Store.events === "function" ? window.Store.events() : [];
      const quizEvents = (Array.isArray(rawEvents) ? rawEvents : []).filter((e) => e && (!e.type || e.type === "quiz"));
      islandRecords.forEach((rec) => {
        const mine = quizEvents.filter((e) => e.island === rec.id || (e.unit && String(e.unit).split("-")[0] === rec.id));
        if (!mine.length) {
          map[rec.id] = 0;
          return;
        }
        const bestScore = mine.reduce((m, e) => Math.max(m, Number(e.score) || 0), 0);
        const unitBest = {};
        mine.forEach((e) => {
          if (e.unit) unitBest[e.unit] = Math.max(unitBest[e.unit] === undefined ? -1 : unitBest[e.unit], Number(e.score) || 0);
        });
        let totalUnits = 0;
        let passed = 0;
        const seqLen = rec.sequenceLen || 5;
        for (let u = 1; u <= seqLen; u++) {
          const key = `${rec.id}-${u}`;
          const q = window.CONTENT && window.CONTENT[key] && window.CONTENT[key].quiz;
          if (q) {
            totalUnits++;
            const passScore = Number(q.passScore) || 60;
            if ((unitBest[key] === undefined ? -1 : unitBest[key]) >= passScore) passed++;
          }
        }
        const unitPct = totalUnits > 0 ? Math.round((passed / totalUnits) * 100) : 0;
        map[rec.id] = clamp(Math.round(Math.max(bestScore, unitPct)), 0, 100);
      });
      return map;
    }

    function triggerIslandScaleBounce(rec, fromLevel, toLevel) {
      if (!rec) return;
      safePlayAudio("playLevelUp");
      const groups = [rec.level1Props, rec.level2Props, rec.level3Props];
      const t0 = clock.getElapsedTime();
      for (let lv = (fromLevel || 0) + 1; lv <= (toLevel || rec.currentLevel || 1); lv++) {
        const grp = groups[lv - 1];
        if (!grp || !grp.visible) continue;
        grp.scale.setScalar(0.01);
        bounces.push({ grp, t0: t0 + (lv - fromLevel - 1) * 0.18 });
      }
    }

    function refreshLabel(rec) {
      const lv = rec.currentLevel || 0;
      rec.labelSprite.userData.draw({
        sub: `${rec.tag || ""}  ${starText(lv)}${rec.progressPct ? " " + rec.progressPct + "%" : ""}`,
        dim: rec.dimmed
      });
    }

    function refreshTempleLabel() {
      const un = sanctuaryState.unlocked;
      templeLabel.userData.draw({
        emoji: un ? "🏆" : "🔒",
        title: "資訊聖殿",
        sub: un ? "專題殿堂 · 已解封 ✨" : `專題殿堂 · 聖柱 ${sanctuaryState.fullCount} / ${islandRecords.length}`,
        accent: un ? "#f2c14e" : "#9aa8c7"
      });
    }

    function setSanctuaryUnlocked(unlocked, animate) {
      const was = sanctuaryState.unlocked;
      sanctuaryState.unlocked = unlocked;
      if (unlocked && !was && animate) {
        triggerSanctuaryAwakening();
      } else if (unlocked) {
        sealMat.opacity = 0;
        seal.visible = false;
        trophyMat.emissiveIntensity = 0.55;
      } else {
        sealMat.opacity = 0.34;
        seal.visible = true;
        trophyMat.emissiveIntensity = 0.1;
      }
      refreshTempleLabel();
    }

    function triggerSanctuaryAwakening() {
      sanctuaryState.awakeningActive = true;
      sanctuaryState.awakeT0 = clock.getElapsedTime();
      seal.visible = true;
      safePlayAudio("playSanctuaryFanfare");
      launchCelebrationConfetti();
    }

    function updateIslandsProgress(arg) {
      const isOpts = arg && typeof arg === "object" && !Array.isArray(arg) && !(arg instanceof Event) && "animateUpgrade" in arg;
      const animate = isOpts ? Boolean(arg.animateUpgrade) : true;
      const input = isOpts ? arg.records : arg;
      const map = calculateIslandProgressMap(input);
      const summary = {};
      let fullCount = 0;
      islandRecords.forEach((rec) => {
        const pct = map[rec.id] || 0;
        const lv = computeCompletionLevel(pct);
        const prev = rec.currentLevel;
        rec.level1Props.visible = lv >= 1;
        rec.level2Props.visible = lv >= 2;
        rec.level3Props.visible = lv >= 3;
        [rec.level1Props, rec.level2Props, rec.level3Props].forEach((grp, i) => {
          if (lv >= i + 1 && (prev === null || lv <= prev)) grp.scale.setScalar(1);
        });
        if (animate && prev !== null && lv > prev) {
          const quizModal = document.getElementById("quizModal");
          const drawer = document.getElementById("drawer");
          const modalOpen = (quizModal && quizModal.classList.contains("show")) || (drawer && drawer.classList.contains("open"));
          if (modalOpen) pendingUpgradeReplays.push({ rec, fromLevel: prev, toLevel: lv });
          else triggerIslandScaleBounce(rec, prev, lv);
        }
        rec.currentLevel = lv;
        rec.progressPct = pct;
        if (pct >= 100) fullCount++;
        const fm = flagMats[rec.id];
        if (fm) {
          fm.mat.color.copy(pct >= 100 ? fm.color : new THREE.Color(0x9aa8b8));
          fm.mat.emissive.copy(pct >= 100 ? fm.color : new THREE.Color(0x000000));
          fm.mat.emissiveIntensity = pct >= 100 ? 0.35 : 0;
        }
        refreshLabel(rec);
        summary[rec.id] = { pct, level: lv };
      });
      sanctuaryState.fullCount = fullCount;
      const unlocked = islandRecords.length > 0 && fullCount === islandRecords.length;
      const wasUnlocked = sanctuaryState.unlocked;
      setSanctuaryUnlocked(unlocked, animate);
      if (unlocked && !wasUnlocked && animate) {
        const quizModal = document.getElementById("quizModal");
        const drawer = document.getElementById("drawer");
        if ((quizModal && quizModal.classList.contains("show")) || (drawer && drawer.classList.contains("open"))) sanctuaryState.pendingAwakeningReplay = true;
      }
      return summary;
    }

    // 測驗完成關閉視窗後重播升級動畫
    document.addEventListener("click", (e) => {
      if (!pendingUpgradeReplays.length && !sanctuaryState.pendingAwakeningReplay) return;
      const t = e.target;
      const isClose = t.closest && (t.closest("#qDone") || t.closest("#quizClose"));
      if (!isClose) return;
      const closeBtn = document.getElementById("closeBtn");
      if (closeBtn) closeBtn.click();
      const replays = pendingUpgradeReplays.splice(0, pendingUpgradeReplays.length);
      const replaySanctuary = sanctuaryState.pendingAwakeningReplay;
      sanctuaryState.pendingAwakeningReplay = false;
      setTimeout(() => {
        replays.forEach((r) => triggerIslandScaleBounce(r.rec, r.fromLevel, r.toLevel));
        if (replaySanctuary && sanctuaryState.unlocked) triggerSanctuaryAwakening();
      }, 180);
    });

    document.addEventListener("ii:quizdone", () => updateIslandsProgress({ animateUpgrade: true }));
    document.addEventListener("ii:login", () => {
      islandRecords.forEach((r) => (r.currentLevel = null));
      sanctuaryState.unlocked = false;
      updateIslandsProgress({ animateUpgrade: false });
      triggerBoardingCameraTransition();
    });
    document.addEventListener("ii:logout", () => {
      islandRecords.forEach((r) => (r.currentLevel = null));
      sanctuaryState.unlocked = false;
      updateIslandsProgress({ animateUpgrade: false });
    });
    window.addEventListener("storage", () => updateIslandsProgress({ animateUpgrade: true }));
    updateIslandsProgress({ animateUpgrade: false });

    window.updateIslandsProgress = updateIslandsProgress;
    window.triggerIslandScaleBounce = (islandId, level) => {
      const rec = islandRecords.find((r) => r.id === islandId);
      if (!rec) return;
      if (typeof level === "number") {
        const lv = clamp(Math.floor(level), 0, 3);
        rec.level1Props.visible = lv >= 1;
        rec.level2Props.visible = lv >= 2;
        rec.level3Props.visible = lv >= 3;
        rec.currentLevel = lv;
      }
      triggerIslandScaleBounce(rec, 0, rec.currentLevel || 1);
    };
    window.triggerBoardingCameraTransition = triggerBoardingCameraTransition;
    window.triggerSanctuaryAwakening = triggerSanctuaryAwakening;
    window.launchCelebrationConfetti = launchCelebrationConfetti;
    window.launchConfetti = launchCelebrationConfetti;
    window.retriggerConfetti = launchCelebrationConfetti;

    /* ============================================================
     * 年級篩選（符合 → 金色呼吸光環；不符合 → 半透明與淡出）
     * ============================================================ */
    const DIM_OPACITY = 0.35;
    function collectDim(rec) {
      if (rec.dimMats) return rec.dimMats;
      const list = [];
      rec.group.traverse((o) => {
        if (!o.isMesh || o.userData.noDim) return;
        const m = o.material;
        if (!m || Array.isArray(m) || glowSet.has(m)) return;
        o.material = m.clone();
        list.push({ mat: o.material, transparent: m.transparent, opacity: m.opacity });
      });
      rec.dimMats = list;
      return list;
    }
    function applyGradeFilter(grade) {
      const g = Number(grade) || 0;
      islandRecords.forEach((rec) => {
        const match = !g || rec.grades.includes(g);
        const dim = g !== 0 && !match;
        rec.dimmed = dim;
        if (dim || rec.dimMats) {
          collectDim(rec).forEach((e) => {
            e.mat.transparent = dim ? true : e.transparent;
            e.mat.opacity = dim ? Math.min(e.opacity, DIM_OPACITY) : e.opacity;
            e.mat.needsUpdate = true;
          });
        }
        rec.beaconRing.visible = g !== 0 && match;
        rec.labelSprite.material.opacity = dim ? 0.7 : 1;
        refreshLabel(rec);
        if (dim && hoveredRec === rec) hoveredRec = null;
      });
    }
    window.applyIslandGradeFilter = applyGradeFilter;
    document.addEventListener("ii:gradefilter", (e) => applyGradeFilter(e.detail && e.detail.grade));

    /* ============================================================
     * 4. 互動：Raycaster 點擊/懸停、NPC 對話泡泡
     * ============================================================ */
    const raycaster = new THREE.Raycaster();
    const ndc = new THREE.Vector2();
    let hoveredRec = null;
    let hoveredSanctuary = false;
    let pendingMove = null;
    let pointerDown = null;
    let drawerTimer = null;
    let activeBubbleNpc = null;
    let bubbleTimer = null;

    function pickAt(ev) {
      const rect = renderer.domElement.getBoundingClientRect();
      if (!rect.width || !rect.height) return null;
      ndc.set(((ev.clientX - rect.left) / rect.width) * 2 - 1, -((ev.clientY - rect.top) / rect.height) * 2 + 1);
      raycaster.setFromCamera(ndc, camera);
      const hits = raycaster.intersectObjects(pickRoots, true);
      for (const h of hits) {
        if (h.object.userData.noPick) continue;
        let o = h.object;
        while (o) {
          if (o.userData.npc) return { type: "npc", npc: o.userData.npc };
          if (o.userData.isSanctuary) return { type: "sanctuary" };
          if (o.userData.islandId) {
            const rec = o.userData.record;
            return rec && !rec.dimmed ? { type: "island", rec } : null;
          }
          if (o.userData.isBridge) return null;
          o = o.parent;
        }
      }
      return null;
    }

    const tmpV = new THREE.Vector3();
    function updateBubblePosition() {
      if (!activeBubbleNpc || !bubbleEl.classList.contains("show")) return;
      activeBubbleNpc.root.getWorldPosition(tmpV);
      tmpV.y += 2.9;
      tmpV.project(camera);
      const rect = renderer.domElement.getBoundingClientRect();
      const sx = (tmpV.x * 0.5 + 0.5) * rect.width + rect.left;
      const sy = (-tmpV.y * 0.5 + 0.5) * rect.height + rect.top;
      bubbleEl.style.left = `${clamp(sx, 150, window.innerWidth - 150)}px`;
      bubbleEl.style.top = `${clamp(sy, 90, window.innerHeight - 30)}px`;
    }

    function hideNpcSpeechBubble() {
      bubbleEl.classList.remove("show");
      activeBubbleNpc = null;
      clearTimeout(bubbleTimer);
    }

    function showNpcSpeechBubble(npc) {
      if (!npc) return;
      activeBubbleNpc = npc;
      bubbleEl.textContent = npc.lines[Math.floor(Math.random() * npc.lines.length)];
      bubbleEl.classList.add("show");
      updateBubblePosition();
      clearTimeout(bubbleTimer);
      bubbleTimer = setTimeout(hideNpcSpeechBubble, 3800);
    }

    function triggerDockGreeting(islandIdx) {
      const f = dockFishers[islandIdx];
      if (f) showNpcSpeechBubble(f);
    }

    renderer.domElement.addEventListener("pointerdown", (e) => {
      if (e.button !== 0 && e.pointerType === "mouse") return;
      pointerDown = { x: e.clientX, y: e.clientY, t: performance.now() };
      tween.active = false;
      intro.active = false;
    });
    renderer.domElement.addEventListener("pointermove", (e) => {
      pendingMove = e;
    });
    renderer.domElement.addEventListener("pointerleave", () => {
      pendingMove = null;
      hoveredRec = null;
      hoveredSanctuary = false;
    });
    renderer.domElement.addEventListener("pointerup", (e) => {
      if (!pointerDown) return;
      const dist = Math.hypot(e.clientX - pointerDown.x, e.clientY - pointerDown.y);
      const dt = performance.now() - pointerDown.t;
      pointerDown = null;
      if (dist > 7 || dt > 750) return; // 拖曳旋轉視角，不觸發點擊

      const picked = pickAt(e);
      if (!picked) {
        hideNpcSpeechBubble();
        if (tween.isFocused) {
          safePlayAudio("playClick");
          resetCameraToPanorama(); // 點擊空白處重置回全景
        }
        return;
      }
      if (picked.type === "npc") {
        safePlayAudio("playClick");
        showNpcSpeechBubble(picked.npc);
        return;
      }
      hideNpcSpeechBubble();
      if (picked.type === "sanctuary") {
        safePlayAudio("playClick");
        clickSanctuary();
        return;
      }
      if (picked.type === "island") {
        safePlayAudio("playClick");
        focusOnIsland(picked.rec);
        scheduleDrawer(picked.rec.id, "標準", null);
      }
    });

    function scheduleDrawer(id, tab, unitKey) {
      clearTimeout(drawerTimer);
      drawerTimer = setTimeout(() => openIslandDrawer(id, tab, unitKey), 650);
    }

    function clickSanctuary() {
      focusOnSanctuary();
      if (sanctuaryState.unlocked) {
        safePlayAudio("playSanctuaryFanfare");
        launchCelebrationConfetti();
        openSanctuaryCertificateModal();
      } else {
        showToast(`🔒 聖殿封印中：已點亮聖柱 ${sanctuaryState.fullCount} / ${islandRecords.length}，完成各島測驗即可解封！`);
      }
    }

    /** 搜尋或單元導引 API：相機平滑特寫該島，並開啟抽屜與單元 */
    function focusIsland(islandId, tab, unitKey) {
      if (islandId === "sanctuary") {
        clickSanctuary();
        return;
      }
      const rec = islandRecords.find((r) => r.id === islandId);
      if (!rec) {
        openIslandDrawer(islandId, tab, unitKey);
        return;
      }
      hideNpcSpeechBubble();
      focusOnIsland(rec);
      scheduleDrawer(rec.id, tab || "標準", unitKey || null);
    }

    /* ============================================================
     * 視窗尺寸調整
     * ============================================================ */
    function handleResize() {
      const w = stage.clientWidth || window.innerWidth;
      const h = stage.clientHeight || window.innerHeight;
      if (!w || !h) return;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    }
    window.addEventListener("resize", handleResize);
    let resizeObs = null;
    if (typeof ResizeObserver !== "undefined") {
      resizeObs = new ResizeObserver(handleResize);
      resizeObs.observe(stage);
    }

    /* ============================================================
     * 動畫迴圈
     * ============================================================ */
    const PAN_LIMIT = 85;
    let rafId = 0;
    let lastT = 0;
    function animate() {
      rafId = requestAnimationFrame(animate);
      if (viewMapEl && !viewMapEl.classList.contains("active")) return;
      const t = clock.getElapsedTime();
      const dt = Math.min(0.1, t - lastT);
      lastT = t;

      // 相機補間平滑插值
      if (tween.active) {
        const u = clamp((t - tween.t0) / tween.dur, 0, 1);
        const e = easeInOutCubic(u);
        camera.position.lerpVectors(tween.fromPos, tween.toPos, e);
        controls.target.lerpVectors(tween.fromTarget, tween.toTarget, e);
        if (u >= 1) tween.active = false;
      } else if (intro.active) {
        const u = clamp((t - intro.t0) / intro.dur, 0, 1);
        const e = 1 - Math.pow(1 - u, 3);
        camera.position.lerpVectors(intro.fromPos, intro.toPos, e);
        controls.target.lerpVectors(intro.fromTarget, intro.toTarget, e);
        if (u >= 1) intro.active = false;
      } else {
        const d = Math.hypot(controls.target.x, controls.target.z);
        if (d > PAN_LIMIT) {
          const k = PAN_LIMIT / d;
          const dx = controls.target.x * (k - 1);
          const dz = controls.target.z * (k - 1);
          controls.target.x += dx;
          controls.target.z += dz;
          camera.position.x += dx;
          camera.position.z += dz;
        }
      }
      controls.update();

      // 懸停游標偵測
      if (pendingMove) {
        const picked = pickAt(pendingMove);
        pendingMove = null;
        hoveredRec = picked && picked.type === "island" ? picked.rec : null;
        hoveredSanctuary = !!(picked && picked.type === "sanctuary");
        stage.style.cursor = picked ? "pointer" : "grab";
      }

      // 3. 水岸浪花波紋：微幅縮放跳動
      islandRecords.forEach((rec, i) => {
        const hv = hoveredRec === rec ? 1 : 0;
        const k1 = Math.sin(t * 1.6 + i * 0.9);
        const k2 = Math.sin(t * 1.1 + i * 0.9 + 1.7);
        rec.foam[0].scale.setScalar(1.015 + k1 * 0.02 + hv * 0.015);
        rec.foam[0].material.opacity = rec.foam[0].userData.baseOpacity * (0.82 + 0.18 * k1) + hv * 0.15;
        rec.foam[1].scale.setScalar(1.02 + k2 * 0.04);
        rec.foam[1].material.opacity = rec.foam[1].userData.baseOpacity * (0.6 + 0.4 * (0.5 + 0.5 * k2));
        const target = hv ? 1.1 : 1;
        const s = rec.labelSprite.scale.x / 11.5;
        const ns = s + (target - s) * 0.18;
        rec.labelSprite.scale.set(11.5 * ns, 3.4 * ns, 1);
        if (rec.beaconRing.visible) rec.beaconMat.opacity = 0.45 + 0.4 * (0.5 + 0.5 * Math.sin(t * 3 + i));
      });
      templeBase.foam[0].scale.setScalar(1.015 + Math.sin(t * 1.4) * 0.02);
      templeBase.foam[0].material.opacity = 0.55 * (0.82 + 0.18 * Math.sin(t * 1.4));
      templeBase.foam[1].scale.setScalar(1.02 + Math.sin(t * 1.0 + 1.1) * 0.04);
      templeBase.foam[1].material.opacity = 0.3 * (0.6 + 0.4 * (0.5 + 0.5 * Math.sin(t * 1.0 + 1.1)));

      // 聖殿旗幟旋轉、獎盃星光與解封動畫
      flagCarousel.rotation.y = t * 0.28;
      Object.keys(flagMats).forEach((k, i) => (flagMats[k].cloth.rotation.y = Math.sin(t * 3 + i) * 0.22));
      trophyStar.rotation.y = t * 1.8;
      trophyStar.position.y = 4.4 + Math.sin(t * 2) * 0.12;
      if (sanctuaryState.unlocked) {
        trophy.rotation.y = t * 0.45;
        trophyMat.emissiveIntensity = 0.45 + 0.2 * Math.sin(t * 2.4);
      } else {
        trophy.rotation.y = Math.sin(t * 0.5) * 0.15;
      }
      if (hoveredSanctuary) trophy.scale.setScalar(1 + 0.03 * Math.sin(t * 8));
      else trophy.scale.setScalar(1);
      if (sanctuaryState.awakeningActive) {
        const u = clamp((t - sanctuaryState.awakeT0) / 2.6, 0, 1);
        sealMat.opacity = 0.34 * (1 - smoothstep(0.1, 0.8, u));
        seal.scale.setScalar(1 + u * 0.7);
        awakeRing.scale.setScalar(1 + u * 9);
        awakeRingMat.opacity = (1 - u) * 0.85;
        trophy.position.y = T_TOP + 2.55 + Math.sin(u * Math.PI) * 0.9;
        if (u >= 1) {
          sanctuaryState.awakeningActive = false;
          seal.visible = false;
          seal.scale.setScalar(1);
          awakeRingMat.opacity = 0;
          trophy.position.y = T_TOP + 2.55;
        }
      } else if (sanctuaryState.unlocked) {
        seal.visible = false;
      } else {
        seal.scale.setScalar(1 + Math.sin(t * 1.5) * 0.015);
      }

      // 繁榮度升級彈跳 Scale Bounce
      for (let i = bounces.length - 1; i >= 0; i--) {
        const b = bounces[i];
        const u = (t - b.t0) / 0.7;
        if (u < 0) continue;
        if (u >= 1) {
          b.grp.scale.setScalar(1);
          bounces.splice(i, 1);
          continue;
        }
        const s = u < 0.55 ? (u / 0.55) * 1.2 : 1.2 - 0.2 * ((u - 0.55) / 0.45);
        b.grp.scale.setScalar(Math.max(0.01, s));
      }

      // 橋上行走 NPC
      walkers.forEach((w) => {
        w.u += w.dir * w.speed * dt;
        if (w.u > 0.92) {
          w.u = 0.92;
          w.dir = -1;
          w.lane = -0.62;
        } else if (w.u < 0.08) {
          w.u = 0.08;
          w.dir = 1;
          w.lane = 0.62;
        }
        const n = w.npc;
        const y = w.br.yAt(w.u);
        n.root.position.set(w.lane, y + 0.08 + Math.abs(Math.sin(t * 7 + n.phase)) * 0.05, w.br.zAt(w.u));
        n.root.rotation.y = w.dir > 0 ? 0 : Math.PI;
        n.root.rotation.x = -Math.atan(w.br.slopeAt(w.u)) * w.dir;
        const sw = Math.sin(t * 7 + n.phase) * 0.7;
        n.legL.rotation.x = sw;
        n.legR.rotation.x = -sw;
        n.armL.rotation.x = -sw * 0.8;
        n.armR.rotation.x = sw * 0.8;
      });

      // 碼頭垂釣 NPC：浮標輕晃
      dockFishers.forEach((f, i) => {
        if (f.bob) f.bob.position.y = f.baseBobY + Math.sin(t * 2.4 + i) * 0.05;
        f.head.rotation.x = 0.1 + Math.sin(t * 1.2 + i) * 0.04;
      });

      // 長椅看書 NPC：低頭閱讀
      npcList.forEach((n) => {
        if (n.pose === "read") n.head.rotation.x = 0.3 + Math.sin(t * 0.9 + n.phase) * 0.06;
      });

      if (activeBubbleNpc) updateBubblePosition();

      // 螢火蟲點綴
      if (fireflies.visible) {
        fireflies.rotation.y = t * 0.03;
        ffMat.opacity = 0.65 + 0.3 * Math.sin(t * 3);
      }

      updaters.forEach((fn) => fn(t, dt));
      renderer.render(scene, camera);
    }

    applyDayNight(false);

    const api = {
      __v2: true,
      version: 2,
      scene,
      camera,
      controls,
      renderer,
      stage,
      islandRecords,
      bridges,
      sanctuaryState,
      npcList,
      initScene,
      focusIsland,
      focusOnIsland,
      focusOnSanctuary,
      resetView,
      resetCameraToPanorama,
      applyGradeFilter,
      showNpcSpeechBubble,
      hideNpcSpeechBubble,
      triggerDockGreeting,
      updateIslandsProgress,
      triggerSanctuaryAwakening,
      triggerBoardingCameraTransition,
      triggerIslandScaleBounce,
      launchCelebrationConfetti,
      retriggerConfetti: launchCelebrationConfetti,
      launchConfetti: launchCelebrationConfetti,
      setNight: applyDayNight,
      isNight: () => isNight,
      dispose() {
        cancelAnimationFrame(rafId);
        window.removeEventListener("resize", handleResize);
        if (resizeObs) resizeObs.disconnect();
        renderer.dispose();
        if (stage.parentNode) stage.parentNode.removeChild(stage);
        [bubbleEl, toastEl, certWrap, styleEl].forEach((el) => el.parentNode && el.parentNode.removeChild(el));
        instance = null;
        if (window.__island3D === api) delete window.__island3D;
        if (window.SceneV2 === api) delete window.SceneV2;
      }
    };

    instance = api;
    window.__island3D = api;
    window.SceneV2 = api;
    window.initScene = initScene;
    window.resetView = resetCameraToPanorama;
    window.focusIsland = focusIsland;

    handleResize();
    animate();
    return api;
  }

  window.initScene = initScene;

  if (!window.__SCENE_V2_MANUAL) {
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", () => initScene());
    else initScene();
  }
})();
