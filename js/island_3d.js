/**
 * 資訊課程島 — 3D 動森玩具箱風格地圖場景 (Three.js r128)
 * ---------------------------------------------------------------
 * 功能包含：
 * 1. 正交相機 (OrthographicCamera) 俯視 45 度動森玩具箱視角 + OrbitControls
 * 2. 熱帶淺藍海洋 (Turquoise) 正弦波上下微動態水面 + 白天白色微波
 * 3. 環狀排列 7 座 Low-poly 圓角幾何小島（對應 data/islands.js）+ 海島碼頭
 * 4. 中央未解鎖「迷霧神秘礁岩」（含環繞動態迷霧團）
 * 5. 畫面上方懸浮「☀️ 白天 / 🌙 夜晚」切換按鈕（平行光/月光、碼頭點光源、漂浮螢火蟲微粒）
 * 6. 極簡幾何 Q 版黏土小人角色，頭頂以 CanvasTexture 即時顯示登入學生「班級與座號」
 * 7. 各島碼頭間 CatmullRomCurve3 平滑海路軌跡（水面淡淡白色虛線航線與跳石）
 * 8. Raycaster 島嶼點擊偵測、1.2 秒沿曲線上下彈跳 (Bobbing) 跑向目標碼頭，抵達後觸發 openIslandDrawer(islandId)
 * 9. 七座島嶼四階段建築繁榮度（Lv.0 ~ Lv.3：level1Props, level2Props, level3Props）、updateIslandsProgress() 與升級 Scale Bounce 彈跳動畫
 */
(() => {
  const mapWrap = document.querySelector("#viewMap .map-wrap");
  if (typeof THREE === "undefined") {
    console.warn("[island_3d] Three.js 未載入，略過 3D 場景初始化。");
    if (mapWrap) mapWrap.classList.add("fallback-2d");
    return;
  }

  if (!mapWrap) return;
  if (window.__island3D && document.getElementById("island3dStage")) {
    return;
  }

  const ISLANDS_DATA = Array.isArray(window.ISLANDS) && window.ISLANDS.length
    ? window.ISLANDS
    : [
        { id: "sys", name: "電腦探險島", emoji: "🖥️", color: "#4fb3ff", tag: "系統平臺" },
        { id: "citizen", name: "數位公民島", emoji: "🛡️", color: "#ff8a65", tag: "資訊科技與人類社會" },
        { id: "create", name: "創作協作島", emoji: "🎨", color: "#c58bff", tag: "合作共創 · 溝通表達" },
        { id: "code", name: "程式森林島", emoji: "🌲", color: "#5fd18b", tag: "程式設計" },
        { id: "algo", name: "演算法山", emoji: "⛰️", color: "#ffd166", tag: "演算法" },
        { id: "data", name: "資料海灣", emoji: "📊", color: "#2ec4b6", tag: "資料表示、處理及分析" },
        { id: "ai", name: "AI 智慧島", emoji: "🤖", color: "#ff6fb5", tag: "延伸 · 校本課程" }
      ];

  /* ============================================================
   * 樣式注入與 DOM 容器建置
   * ============================================================ */
  const styleEl = document.createElement("style");
  styleEl.textContent = `
    #viewMap .map-wrap {
      position: fixed;
      inset: 0;
      width: 100vw;
      height: 100vh;
      max-width: none;
      margin: 0;
      border: 0;
      border-radius: 0;
      background: linear-gradient(180deg, #0284c7 0%, #0369a1 100%);
      transition: background 0.6s ease;
      pointer-events: none;
    }
    #viewMap .map-wrap #map,
    #viewMap .map-wrap .route-toggle {
      display: none !important;
    }
    #island3dStage {
      position: fixed;
      inset: 0;
      width: 100vw;
      height: 100vh;
      overflow: hidden;
      z-index: 1;
      cursor: grab;
      pointer-events: auto;
      opacity: 0;
      transition: opacity 0.3s ease;
    }
    #island3dStage.is-ready {
      opacity: 1;
    }
    #island3dStage:active {
      cursor: grabbing;
    }
    #island3dStage canvas {
      display: block;
      width: 100vw;
      height: 100vh;
      outline: none;
    }
    .daynight-toggle-btn,
    .camera-reset-btn {
      position: relative;
      top: auto;
      left: auto;
      z-index: 21;
      display: inline-flex;
      align-items: center;
      border-radius: 999px;
      border: 1.5px solid rgba(255, 255, 255, 0.72);
      background: rgba(255, 255, 255, 0.85);
      color: #0f2942;
      font-weight: 800;
      font-size: 0.88rem;
      letter-spacing: 0.03em;
      box-shadow: 0 8px 24px rgba(10, 45, 80, 0.22), inset 0 1px 0 rgba(255, 255, 255, 0.92);
      backdrop-filter: blur(14px);
      -webkit-backdrop-filter: blur(14px);
      transition: all 0.25s cubic-bezier(0.2, 0.8, 0.2, 1);
      user-select: none;
      cursor: pointer;
      pointer-events: auto;
      white-space: nowrap;
    }
    .daynight-toggle-btn {
      gap: 8px;
      padding: 7px 16px;
    }
    .camera-reset-btn {
      gap: 6px;
      padding: 7px 15px;
    }
    .daynight-toggle-btn:hover,
    .camera-reset-btn:hover {
      transform: translateY(-2px) scale(1.03);
      box-shadow: 0 12px 28px rgba(10, 45, 80, 0.3);
    }
    .daynight-toggle-btn:active,
    .camera-reset-btn:active {
      transform: translateY(0) scale(0.98);
    }
    .daynight-toggle-btn.is-night,
    .camera-reset-btn.is-night {
      background: rgba(13, 27, 56, 0.85);
      color: #ffe8a3;
      border-color: rgba(255, 209, 102, 0.55);
    }
    .daynight-toggle-btn.is-night {
      box-shadow: 0 8px 28px rgba(0, 0, 0, 0.55), 0 0 18px rgba(255, 180, 60, 0.28);
    }
    .daynight-toggle-btn .dn-pill {
      font-size: 0.75rem;
      padding: 2px 8px;
      border-radius: 999px;
      background: rgba(15, 41, 66, 0.12);
      color: inherit;
      font-weight: 700;
    }
    .daynight-toggle-btn.is-night .dn-pill {
      background: rgba(255, 209, 102, 0.2);
      color: #ffd166;
    }
    #viewMap .map-wrap .legend {
      z-index: 12;
      background: rgba(8, 28, 54, 0.56);
      color: #eaf4ff;
      padding: 6px 14px;
      border-radius: 999px;
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      pointer-events: none;
    }
  `;
  document.head.appendChild(styleEl);

  const stage = document.createElement("div");
  stage.id = "island3dStage";
  stage.setAttribute("role", "region");
  stage.setAttribute("aria-label", "3D 資訊課程島嶼地圖");
  mapWrap.insertBefore(stage, mapWrap.firstChild);

  let toggleBtn = document.getElementById("dayNightToggleBtn");
  if (!toggleBtn) {
    toggleBtn = document.createElement("button");
    toggleBtn.type = "button";
    toggleBtn.id = "dayNightToggleBtn";
    toggleBtn.className = "daynight-toggle-btn";
    toggleBtn.setAttribute("aria-pressed", "false");
    toggleBtn.innerHTML = `<span>☀️ 白天 / 🌙 夜晚</span><span class="dn-pill" id="dnStateLabel">目前：☀️ 白天</span>`;
    const targetParent = document.querySelector(".scene-controls") || mapWrap;
    targetParent.appendChild(toggleBtn);
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
    const targetParent = document.querySelector(".scene-controls") || mapWrap;
    targetParent.appendChild(resetCamBtn);
  }

  /* ============================================================
   * 1. 場景、正交相機 (俯視 45 度動森玩具箱視角)、渲染器與控制器
   * ============================================================ */
  const scene = new THREE.Scene();

  const THEME = {
    day: {
      skyBg: new THREE.Color(0x0284c7),
      fogColor: new THREE.Color(0x0369a1),
      waterColor: new THREE.Color(0xffffff),      // 搭配頂點漸層呈現深青藍海面 (#0284c7 ~ #0369a1)
      waterEmissive: new THREE.Color(0x012a40),
      deepSeaColor: new THREE.Color(0x0369a1),
      ambientColor: new THREE.Color(0xa0c4ff),
      ambientIntensity: 0.0,                      // 白天改由 HemisphereLight 提供柔和天地環境光，避免死白死光
      hemiSky: new THREE.Color(0xa0c4ff),
      hemiGround: new THREE.Color(0xd7ccc8),
      hemiIntensity: 0.5,
      dirColor: new THREE.Color(0xfff5db),        // 溫暖米黃色 (#fff5db)，強度調降至 0.75
      dirIntensity: 0.75,
      dirPos: new THREE.Vector3(52, 76, 46),
      rippleOpacity: 0.34,
      foamOpacity: 0.72,
      dockLightIntensity: 0,
      bulbOpacity: 0.25,
      fireflyOpacity: 0
    },
    night: {
      skyBg: new THREE.Color(0x030a18),           // 夜晚：深邃星空背景
      fogColor: new THREE.Color(0x051026),
      waterColor: new THREE.Color(0x16395c),      // 夜晚深海藍綠乘色
      waterEmissive: new THREE.Color(0x031122),
      deepSeaColor: new THREE.Color(0x020b18),
      ambientColor: new THREE.Color(0x1e386b),
      ambientIntensity: 0.24,
      hemiSky: new THREE.Color(0x4777c9),
      hemiGround: new THREE.Color(0x0d1830),
      hemiIntensity: 0.30,
      dirColor: new THREE.Color(0x88b0ff),        // 夜晚：清澈銀藍月光（保留建築與角色輪廓並凸顯暖光對比）
      dirIntensity: 0.48,
      dirPos: new THREE.Vector3(-42, 74, -36),
      rippleOpacity: 0.12,
      foamOpacity: 0.3,
      dockLightIntensity: 2.35,                   // 海島碼頭橘黃點光源
      bulbOpacity: 1.0,
      fireflyOpacity: 0.95                        // 漂浮螢火蟲微粒
    }
  };

  let isNight = false;
  let nightBlend = 0;
  let oceanEnv = null; // 四層大環境生態模組（js/oceanEnvironment.js），於島群建置完成後初始化
  scene.background = THEME.day.skyBg.clone();
  scene.fog = new THREE.FogExp2(THEME.day.fogColor.getHex(), 0.0042);

  // 程式生成柔和徑向漸層光暈貼圖（零 PointLight 模擬草地／木棧道／水面受光光斑）
  function createRadialGlowTexture(size = 128) {
    const cv = document.createElement("canvas");
    cv.width = size;
    cv.height = size;
    const ctx = cv.getContext("2d");
    const c = size * 0.5;
    const grad = ctx.createRadialGradient(c, c, 0, c, c, c);
    grad.addColorStop(0.0, "rgba(255, 255, 255, 1.0)");
    grad.addColorStop(0.22, "rgba(255, 255, 255, 0.72)");
    grad.addColorStop(0.5, "rgba(255, 255, 255, 0.28)");
    grad.addColorStop(0.78, "rgba(255, 255, 255, 0.07)");
    grad.addColorStop(1.0, "rgba(255, 255, 255, 0.0)");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);
    const tex = new THREE.CanvasTexture(cv);
    tex.minFilter = THREE.LinearFilter;
    tex.magFilter = THREE.LinearFilter;
    return tex;
  }
  const radialGlowTex = createRadialGlowTexture(128);

  // 柔和體積感半透明光錐（頂點色平滑漸隱至透明，無硬邊）
  function buildSoftLightConeGeo(rTop, rBot, height, segs = 14, topTint = 0xffe48a, botTint = 0x000000) {
    const raw = new THREE.CylinderGeometry(rTop, rBot, height, segs, 1, true);
    const g = raw.index ? raw.toNonIndexed() : raw;
    if (raw !== g) raw.dispose();
    const pa = g.attributes.position;
    const cols = new Float32Array(pa.count * 3);
    const halfH = height * 0.5;
    const cTop = new THREE.Color(topTint);
    const cBot = new THREE.Color(botTint);
    const cMix = new THREE.Color();
    for (let i = 0; i < pa.count; i++) {
      const u = Math.max(0, Math.min(1, (pa.getY(i) + halfH) / height));
      cMix.copy(cBot).lerp(cTop, u);
      cols[i * 3] = cMix.r;
      cols[i * 3 + 1] = cMix.g;
      cols[i * 3 + 2] = cMix.b;
    }
    g.setAttribute("color", new THREE.BufferAttribute(cols, 3));
    return g;
  }

  function makeGroundGlowPlane(w, h, colorHex, y = 0.04, renderOrder = 2) {
    const mat = new THREE.MeshBasicMaterial({
      map: radialGlowTex,
      color: colorHex,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      fog: false,
      side: THREE.DoubleSide
    });
    const geo = new THREE.PlaneGeometry(w, h);
    geo.rotateX(-Math.PI / 2);
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.y = y;
    mesh.renderOrder = renderOrder;
    mesh.visible = false;
    mesh.userData.skipDimClone = true;
    return { mesh, mat };
  }

  function makeNightGlowSprite(colorHex, scale = 1.4) {
    const mat = new THREE.SpriteMaterial({
      map: radialGlowTex,
      color: colorHex,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      fog: false
    });
    const sprite = new THREE.Sprite(mat);
    sprite.scale.setScalar(scale);
    sprite.renderOrder = 4;
    sprite.visible = false;
    sprite.userData.skipDimClone = true;
    return { sprite, mat };
  }

  const nightMatConfigs = [];
  const nightMatMap = new Map();
  const clonedNightMatLinks = [];
  const nightGlowUpdaters = [];

  function registerNightMat(mat, cfg) {
    if (!mat) return mat;
    const rec = Object.assign({ mat }, cfg);
    nightMatConfigs.push(rec);
    nightMatMap.set(mat, rec);
    return mat;
  }

  // 透視相機設定 (PerspectiveCamera) - FOV 40 度微縮玩具箱質感，Near 0.2 避免近距穿面裁切
  const initWidth = window.innerWidth || stage.clientWidth || 1200;
  const initHeight = window.innerHeight || stage.clientHeight || 700;
  const initAspect = initWidth / initHeight;

  const camera = new THREE.PerspectiveCamera(40, initAspect, 0.2, 1200);
  const defaultCamPos = new THREE.Vector3(0, 68, 76);
  const defaultCamTarget = new THREE.Vector3(0, 3.5, 0);

  // 俯視 45 度角飽滿緊緻 Diorama 微縮視角（一步到位直接套用最終座標與焦點）
  camera.position.copy(defaultCamPos);
  camera.lookAt(defaultCamTarget);

  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
  renderer.setSize(initWidth, initHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.85;
  stage.appendChild(renderer.domElement);

  // OrbitControls 控制器
  const controls = new THREE.OrbitControls(camera, renderer.domElement);
  controls.target.copy(defaultCamTarget);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.screenSpacePanning = true;
  controls.minDistance = 22; // 允許滾輪推進放大檢視微細節
  controls.maxDistance = 180;
  controls.minPolarAngle = 0.15;
  controls.maxPolarAngle = Math.PI / 2.1; // 避免視角沈入海底
  controls.update();

  /* ============================================================
   * 燈光系統（白天暖米黃平行光 #fff5db 強度 0.75 + 半球環境光 0xa0c4ff / 0xd7ccc8）
   * ============================================================ */
  const ambientLight = new THREE.AmbientLight(THEME.day.ambientColor, THEME.day.ambientIntensity);
  scene.add(ambientLight);

  const hemiLight = new THREE.HemisphereLight(0xa0c4ff, 0xd7ccc8, 0.5);
  hemiLight.position.set(0, 80, 0);
  scene.add(hemiLight);

  const mainDirLight = new THREE.DirectionalLight(0xfff5db, 0.75);
  mainDirLight.position.copy(THEME.day.dirPos);
  mainDirLight.castShadow = true;
  mainDirLight.shadow.mapSize.width = 2048;
  mainDirLight.shadow.mapSize.height = 2048;
  const shadowCamSize = 52; // 校正陰影相機範圍以配合收緊群島，陰影解析度大幅提升
  mainDirLight.shadow.camera.left = -shadowCamSize;
  mainDirLight.shadow.camera.right = shadowCamSize;
  mainDirLight.shadow.camera.top = shadowCamSize;
  mainDirLight.shadow.camera.bottom = -shadowCamSize;
  mainDirLight.shadow.camera.near = 10;
  mainDirLight.shadow.camera.far = 240;
  mainDirLight.shadow.bias = -0.0005; // 避免陰影刺 (Shadow Acne)
  mainDirLight.shadow.normalBias = 0.02;
  scene.add(mainDirLight);

  /* ============================================================
   * 2. 水面設計：沉穩柔和的藍綠漸層 (#3498db -> #16a085) + roughness 0.9 消除刺眼反光
   * ============================================================ */
  // 深海襯底層（配合擴大群島擴充為 420x420）
  const deepSeaGeo = new THREE.PlaneGeometry(420, 420);
  deepSeaGeo.rotateX(-Math.PI / 2);
  const deepSeaMat = new THREE.MeshBasicMaterial({ color: THEME.day.deepSeaColor.clone() });
  const deepSeaMesh = new THREE.Mesh(deepSeaGeo, deepSeaMat);
  deepSeaMesh.position.y = -2.4;
  scene.add(deepSeaMesh);

  // 主海面網格（擴充為 360x360，頂點段數維持 76 保證極致 60 FPS）
  const oceanSegments = 76;
  const oceanGeo = new THREE.PlaneGeometry(360, 360, oceanSegments, oceanSegments);
  oceanGeo.rotateX(-Math.PI / 2);

  const oceanPosAttr = oceanGeo.attributes.position;
  const oceanBaseVertices = new Float32Array(oceanPosAttr.array.length);
  oceanBaseVertices.set(oceanPosAttr.array);

  const waterTopCol = new THREE.Color("#0284c7");
  const waterBotCol = new THREE.Color("#0369a1");
  const tempWaterCol = new THREE.Color();
  const oceanColors = new Float32Array(oceanPosAttr.count * 3);
  for (let i = 0; i < oceanPosAttr.count; i++) {
    const vx = oceanPosAttr.getX(i);
    const vz = oceanPosAttr.getZ(i);
    // 結合徑向與前後景斜向漸層，配合大水域比例
    const radialT = Math.min(1, Math.hypot(vx, vz) / 108);
    const diagT = Math.min(1, Math.max(0, (vz + 140) / 280));
    const mixT = Math.min(1, Math.max(0, radialT * 0.62 + diagT * 0.38));
    tempWaterCol.copy(waterTopCol).lerp(waterBotCol, mixT);
    oceanColors[i * 3] = tempWaterCol.r;
    oceanColors[i * 3 + 1] = tempWaterCol.g;
    oceanColors[i * 3 + 2] = tempWaterCol.b;
  }
  oceanGeo.setAttribute("color", new THREE.BufferAttribute(oceanColors, 3));

  const oceanMat = new THREE.MeshStandardMaterial({
    color: THEME.day.waterColor.clone(),
    emissive: THEME.day.waterEmissive.clone(),
    emissiveIntensity: 0.08,
    roughness: 0.9,
    metalness: 0.0,
    vertexColors: true,
    flatShading: true,
    transparent: true,
    opacity: 0.95
  });

  const oceanMesh = new THREE.Mesh(oceanGeo, oceanMat);
  oceanMesh.receiveShadow = true;
  scene.add(oceanMesh);

  // 海面白色微波條紋（白天明顯、夜晚柔和）
  const oceanRipplesGroup = new THREE.Group();
  const rippleMat = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: THEME.day.rippleOpacity,
    side: THREE.DoubleSide
  });

  const rippleItems = [];
  for (let i = 0; i < 68; i++) {
    const rAngle = (i / 68) * Math.PI * 2 + (i % 3) * 0.25;
    const rDist = 11 + ((i * 17) % 44);
    const len = 1.4 + (i % 4) * 0.55;
    const ribGeo = new THREE.PlaneGeometry(len, 0.22, 4, 1);
    ribGeo.rotateX(-Math.PI / 2);
    const ribMesh = new THREE.Mesh(ribGeo, rippleMat);
    const rx = Math.cos(rAngle) * rDist;
    const rz = Math.sin(rAngle) * rDist;
    ribMesh.position.set(rx, 0.16, rz);
    ribMesh.rotation.y = -rAngle + Math.PI / 2;
    oceanRipplesGroup.add(ribMesh);
    rippleItems.push({
      mesh: ribMesh,
      baseX: rx,
      baseZ: rz,
      phase: i * 0.43,
      speed: 1.4 + (i % 5) * 0.2
    });
  }
  scene.add(oceanRipplesGroup);

  /* ============================================================
   * 場景共用材質庫 (Shared Materials - 全域共用，避免未定義或作用域異常)
   * ============================================================ */
  const woodLightMat = new THREE.MeshStandardMaterial({ 
    color: 0xd7a15c, // 溫暖淺木色
    roughness: 0.8 
  });
  const woodDarkMat = new THREE.MeshStandardMaterial({ 
    color: 0x8b5a2b, // 深棕原木色
    roughness: 0.8 
  });
  const stoneGrayMat = new THREE.MeshStandardMaterial({
    color: 0x95a5b5,
    roughness: 0.78
  });
  const stoneDarkMat = new THREE.MeshStandardMaterial({
    color: 0x64748b,
    roughness: 0.82
  });
  const accentMat = new THREE.MeshStandardMaterial({
    color: 0x4fb3ff,
    roughness: 0.5
  });
  const ropeMat = new THREE.MeshStandardMaterial({
    color: 0xd4a373,
    roughness: 0.8
  });

  // --- 全域宣告升級新增材質（防呆宣告，嚴禁 ReferenceError） ---
  const woodPlankMat = new THREE.MeshStandardMaterial({ color: 0xe2ba86, roughness: 0.76, flatShading: true });
  const woodLogMat = new THREE.MeshStandardMaterial({ color: 0x7c4f28, roughness: 0.82, flatShading: true });
  const woodFenceMat = new THREE.MeshStandardMaterial({ color: 0xb58253, roughness: 0.8, flatShading: true });
  const ropeCableMat = new THREE.MeshStandardMaterial({ color: 0xd4a373, roughness: 0.88, flatShading: true });
  const ropeThinMat = new THREE.MeshStandardMaterial({ color: 0xc89868, roughness: 0.9, flatShading: true });
  const whiteMarbleMat = new THREE.MeshStandardMaterial({ color: 0xfbfbfd, roughness: 0.32, metalness: 0.05, flatShading: true });
  const stoneReliefMat = new THREE.MeshStandardMaterial({ color: 0xe8ecf1, roughness: 0.42, metalness: 0.08, flatShading: true });
  const goldTrimMat = registerNightMat(new THREE.MeshStandardMaterial({ color: 0xffd166, emissive: 0xd97706, emissiveIntensity: 0.28, roughness: 0.28, metalness: 0.45, flatShading: true }), { dayEi: 0.28, nightEi: 0.85 });
  const cyanGlowMat = registerNightMat(new THREE.MeshStandardMaterial({ color: 0x90e0ef, emissive: 0x00b4d8, emissiveIntensity: 0.55, roughness: 0.2, flatShading: true }), { dayEi: 0.55, nightEi: 1.9 });
  const goldenCoreGlowMat = registerNightMat(new THREE.MeshStandardMaterial({ color: 0xfff3b0, emissive: 0xffb703, emissiveIntensity: 0.95, roughness: 0.15, flatShading: true }), { dayEi: 0.95, nightEi: 2.4 });
  const torchFlameMat = registerNightMat(new THREE.MeshStandardMaterial({ color: 0xff9f1c, emissive: 0xff7b00, emissiveIntensity: 0.85, roughness: 0.2, flatShading: true }), { dayEi: 0.85, nightEi: 2.5 });
  const torchStoneMat = new THREE.MeshStandardMaterial({ color: 0x5a6578, roughness: 0.75, flatShading: true });
  const roofTileWarmMat = new THREE.MeshStandardMaterial({ color: 0xd96b43, roughness: 0.7, flatShading: true });
  const roofTileBlueMat = new THREE.MeshStandardMaterial({ color: 0x3a6073, roughness: 0.7, flatShading: true });
  const roofTileGreenMat = new THREE.MeshStandardMaterial({ color: 0x2d6a4f, roughness: 0.7, flatShading: true });
  const windowFrameMat = new THREE.MeshStandardMaterial({ color: 0x6e431f, roughness: 0.75, flatShading: true });
  const windowWarmGlowMat = registerNightMat(
    new THREE.MeshStandardMaterial({ color: 0xfef3c7, emissive: 0xffa812, emissiveIntensity: 0.15, roughness: 0.22, flatShading: true }),
    { dayEi: 0.15, nightEi: 2.05 }
  );
  const lanternWarmMat = registerNightMat(
    new THREE.MeshStandardMaterial({ color: 0xfff3b0, emissive: 0xffbe0b, emissiveIntensity: 0.25, roughness: 0.2, flatShading: true }),
    { dayEi: 0.25, nightEi: 2.2 }
  );
  const bridgeLampCoreMat = registerNightMat(
    new THREE.MeshStandardMaterial({ color: 0xffedd5, emissive: 0xffaa00, emissiveIntensity: 0.3, roughness: 0.3 }),
    { dayEi: 0.3, nightEi: 2.55 }
  );
  const bridgeLampCapMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1f, roughness: 0.5, metalness: 0.6, flatShading: true });
  const bridgeLampHaloMat = new THREE.MeshBasicMaterial({
    color: 0xffb347,
    transparent: true,
    opacity: 0.0,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    fog: false
  });
  const lanternCapMat = new THREE.MeshStandardMaterial({ color: 0x4a3b32, roughness: 0.6, metalness: 0.4, flatShading: true });
  const doorStepMat = new THREE.MeshStandardMaterial({ color: 0xc89666, roughness: 0.78, flatShading: true });
  const signBoardWoodMat = new THREE.MeshStandardMaterial({ color: 0xd4a373, roughness: 0.75, flatShading: true });
  const signPostMat = new THREE.MeshStandardMaterial({ color: 0x784a25, roughness: 0.85, flatShading: true });
  const cobbleStonePathMat = new THREE.MeshStandardMaterial({ color: 0xc4cdd5, roughness: 0.85, flatShading: true });
  const flowerBushGreenMat = new THREE.MeshStandardMaterial({ color: 0x40916c, roughness: 0.65, flatShading: true });
  const flowerBushLightGreenMat = new THREE.MeshStandardMaterial({ color: 0x74c69d, roughness: 0.65, flatShading: true });
  const flowerDotPinkMat = new THREE.MeshStandardMaterial({ color: 0xff70a6, roughness: 0.5, flatShading: true });
  const flowerDotYellowMat = new THREE.MeshStandardMaterial({ color: 0xffd166, roughness: 0.5, flatShading: true });
  const flowerDotWhiteMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.5, flatShading: true });
  const flowerDotRedMat = new THREE.MeshStandardMaterial({ color: 0xff5964, roughness: 0.5, flatShading: true });
  const flowerDotPurpleMat = new THREE.MeshStandardMaterial({ color: 0xb588f7, roughness: 0.5, flatShading: true });
  const npcFurCaramelMat = new THREE.MeshStandardMaterial({ color: 0xbc6c25, roughness: 0.6, flatShading: true });
  const npcFurCreamMat = new THREE.MeshStandardMaterial({ color: 0xfff3e0, roughness: 0.58, flatShading: true });
  const npcFurBunnyMat = new THREE.MeshStandardMaterial({ color: 0xf3d2c1, roughness: 0.55, flatShading: true });
  const npcFrogGreenMat = new THREE.MeshStandardMaterial({ color: 0x80b918, roughness: 0.5, flatShading: true });
  const npcShibaTanMat = new THREE.MeshStandardMaterial({ color: 0xdd8833, roughness: 0.6, flatShading: true });
  const npcPenguinNavyMat = new THREE.MeshStandardMaterial({ color: 0x1d3557, roughness: 0.5, flatShading: true });
  const npcDeerBrownMat = new THREE.MeshStandardMaterial({ color: 0xa06030, roughness: 0.62, flatShading: true });
  const npcClothYellowMat = new THREE.MeshStandardMaterial({ color: 0xffcc00, roughness: 0.7, flatShading: true });
  const npcClothTealMat = new THREE.MeshStandardMaterial({ color: 0x2a9d8f, roughness: 0.7, flatShading: true });
  const npcClothMintMat = new THREE.MeshStandardMaterial({ color: 0x80ed99, roughness: 0.7, flatShading: true });

  /* ============================================================
   * 【三階段建築群】所有新增材質統一在此宣告（Stage 1/2/3 建築、施工地基與告示牌）
   * ============================================================ */
  const stageAnims = []; // 三階段建築動畫回呼 (t) => void，於 expansionAnims 迴圈中執行
  const SM = (hex, o = {}) => new THREE.MeshStandardMaterial(Object.assign({ color: hex, roughness: 0.55, flatShading: true }, o));
  const SG = (hex, em, ei = 0.8, o = {}) => SM(hex, Object.assign({ emissive: em, emissiveIntensity: ei, roughness: 0.3 }, o));
  const SB = (hex, o = {}) => new THREE.MeshBasicMaterial(Object.assign({ color: hex }, o));
  const stageCanvasMat = (draw, w = 128, h = 128) => {
    const c = document.createElement("canvas");
    c.width = w; c.height = h;
    draw(c.getContext("2d"), w, h);
    const tex = new THREE.CanvasTexture(c);
    return new THREE.MeshBasicMaterial({ map: tex, transparent: true });
  };
  const stageMat = {
    // 通用
    glass: SM(0x9bd7ff, { transparent: true, opacity: 0.32, roughness: 0.1, metalness: 0.2, depthWrite: false }),
    glassDome: registerNightMat(SM(0xbfe8ff, { emissive: 0x38bdf8, emissiveIntensity: 0.08, transparent: true, opacity: 0.28, roughness: 0.08, side: THREE.DoubleSide, depthWrite: false }), { dayEi: 0.08, nightEi: 0.65 }),
    metalDark: SM(0x2b3340, { metalness: 0.5, roughness: 0.45 }),
    metalLight: SM(0xc3ccd8, { metalness: 0.55, roughness: 0.35 }),
    white: SM(0xf4f7fb),
    gold: registerNightMat(SG(0xffd166, 0xd97706, 0.35, { metalness: 0.6 }), { dayEi: 0.35, nightEi: 1.35 }),
    goldBeam: registerNightMat(SB(0xffe08a, { transparent: true, opacity: 0.3, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }), { dayOp: 0.26, nightOp: 0.62 }),
    holo: SB(0x7fe9ff, { wireframe: true, transparent: true, opacity: 0.85 }),
    holoSolid: registerNightMat(SB(0x7fe9ff, { transparent: true, opacity: 0.28, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }), { dayOp: 0.26, nightOp: 0.56 }),
    cyanGlow: registerNightMat(SG(0x7ff0ff, 0x00b4d8, 0.7), { dayEi: 0.7, nightEi: 2.25 }),
    // 電腦探險島
    screen: registerNightMat(SG(0x7ff0ff, 0x00d4ff, 0.55), { dayEi: 0.55, nightEi: 2.15 }),
    pcb: SM(0x0b3d91, { roughness: 0.6 }),
    pcbTrace: registerNightMat(SG(0x4fd0ff, 0x1e90ff, 0.75), { dayEi: 0.75, nightEi: 2.3 }),
    ramGreen: SM(0x1f8a4c),
    chip: SM(0x15171c, { metalness: 0.4 }),
    coolBlue: registerNightMat(SG(0x4fb3ff, 0x1d6fd0, 0.5), { dayEi: 0.5, nightEi: 1.85 }),
    // 數位公民島
    shieldBlue: registerNightMat(SG(0x2d7bd8, 0x0b3d91, 0.25), { dayEi: 0.25, nightEi: 0.85 }),
    shieldWhite: SM(0xf2f7ff, { roughness: 0.35 }),
    fireRed: registerNightMat(SG(0xff5a36, 0xff2a00, 0.65), { dayEi: 0.65, nightEi: 2.1 }),
    // 創作協作島
    camBody: SM(0x2e323d, { roughness: 0.6 }),
    lensGlass: registerNightMat(SG(0x3b6cff, 0x1237a8, 0.55, { metalness: 0.4 }), { dayEi: 0.55, nightEi: 1.8 }),
    red: registerNightMat(SG(0xff5964, 0x7a1220, 0.25), { dayEi: 0.25, nightEi: 0.9 }),
    yellow: registerNightMat(SG(0xffd166, 0x8a6200, 0.25), { dayEi: 0.25, nightEi: 0.9 }),
    blue: registerNightMat(SG(0x4fb3ff, 0x0b4a8f, 0.25), { dayEi: 0.25, nightEi: 0.9 }),
    green: registerNightMat(SG(0x5fd18b, 0x0f6b3a, 0.25), { dayEi: 0.25, nightEi: 0.9 }),
    purple: registerNightMat(SG(0xc58bff, 0x5a2fa8, 0.3), { dayEi: 0.3, nightEi: 1.0 }),
    orange: registerNightMat(SG(0xff8a3d, 0x9a3a00, 0.3), { dayEi: 0.3, nightEi: 1.0 }),
    water: SM(0x5cc8ff, { transparent: true, opacity: 0.72, roughness: 0.15, depthWrite: false }),
    // 程式森林島
    woodScreen: registerNightMat(SG(0x1b2a24, 0x0a5c38, 0.35), { dayEi: 0.35, nightEi: 1.45 }),
    codeGreen: registerNightMat(SG(0x7dffb0, 0x10b981, 0.55), { dayEi: 0.55, nightEi: 2.1 }),
    leaf: SM(0x3f9d62),
    // 演算法山
    templeStone: SM(0xe9dfc9, { roughness: 0.7 }),
    // 資料海灣
    siloBody: SM(0x5aa9d6, { metalness: 0.3, roughness: 0.4 }),
    siloBand: registerNightMat(SG(0x2ec4b6, 0x0c9a8c, 0.6), { dayEi: 0.6, nightEi: 2.1 }),
    crystalTeal: registerNightMat(SG(0x2ec4b6, 0x0c6a62, 0.5, { transparent: true, opacity: 0.88 }), { dayEi: 0.5, nightEi: 1.85 }),
    neonPink: registerNightMat(SG(0xff6fb5, 0xff2f93, 0.6), { dayEi: 0.6, nightEi: 2.2 }),
    // AI 智慧島
    aiPink: registerNightMat(SG(0xff6fb5, 0xff2f93, 0.55), { dayEi: 0.55, nightEi: 2.1 }),
    aiPurple: registerNightMat(SG(0x9b5cff, 0x5a1fd1, 0.65), { dayEi: 0.65, nightEi: 2.2 }),
    aiGold: registerNightMat(SG(0xffc83d, 0xd98a00, 0.65), { dayEi: 0.65, nightEi: 2.1 }),
    aiFiber: registerNightMat(SB(0xffa8dd, { transparent: true, opacity: 0.68 }), { dayOp: 0.68, nightOp: 1.0 }),
    // 二進位文字貼圖（0 / 1）
    bin0: stageCanvasMat((x, w, h) => { x.fillStyle = "#0b3b2a"; x.fillRect(0, 0, w, h); x.fillStyle = "#7dffb0"; x.font = "bold 92px monospace"; x.textAlign = "center"; x.textBaseline = "middle"; x.fillText("0", w / 2, h / 2 + 4); }),
    bin1: stageCanvasMat((x, w, h) => { x.fillStyle = "#0b3b2a"; x.fillRect(0, 0, w, h); x.fillStyle = "#ffe08a"; x.font = "bold 92px monospace"; x.textAlign = "center"; x.textBaseline = "middle"; x.fillText("1", w / 2, h / 2 + 4); }),
    // 施工地基與告示牌
    foundFill: SB(0xffffff, { transparent: true, opacity: 0.1, depthWrite: false }),
    foundLine: new THREE.LineBasicMaterial({ color: 0xffe08a, transparent: true, opacity: 0.75 }),
    signPost: SM(0x784a25),
    signBoards: [
      ["🚧 基礎建置", "完成度達 1%", "解鎖第 1 階段主建築"],
      ["🚧 擴建準備中", "完成度達 34%", "解鎖第 2 階段雙翼"],
      ["🚧 即將竣工", "完成度達 67%", "解鎖第 3 階段榮耀"]
    ].map((lines) => stageCanvasMat((x, w, h) => {
      x.fillStyle = "#f3d9a4"; x.fillRect(0, 0, w, h);
      x.strokeStyle = "#8b5a2b"; x.lineWidth = 8; x.strokeRect(4, 4, w - 8, h - 8);
      x.fillStyle = "#5a3a14"; x.textAlign = "center"; x.textBaseline = "middle";
      x.font = "bold 40px 'Noto Sans TC', sans-serif"; x.fillText(lines[0], w / 2, 52);
      x.font = "bold 30px 'Noto Sans TC', sans-serif"; x.fillText(lines[1], w / 2, 112);
      x.font = "26px 'Noto Sans TC', sans-serif"; x.fillText(lines[2], w / 2, 160);
    }, 384, 200))
  };

  /* 三階段建築空間分區（島嶼局部座標，原點 = 島嶼中心；用於避開樹木、路燈）
   * rect = [xMin, xMax, zMin, zMax] */
  const STAGE_ZONES = [
    [-3.4, 3.4, -5.9, -1.1], // Stage 1 核心主建築
    [-7.4, -4.6, -1.5, 3.5], // Stage 2 左翼
    [4.6, 7.4, -1.5, 3.5],   // Stage 2 右翼
    [-3.6, 3.6, 4.3, 7.9]    // Stage 3 前庭
  ];
  const inStageZone = (x, z) => STAGE_ZONES.some(([x0, x1, z0, z1]) => x >= x0 && x <= x1 && z >= z0 && z <= z1);

  /* ============================================================
   * 【精準地表高度常數 & 全域預宣告共用材質庫】（防呆宣告，嚴禁 ReferenceError）
   * ============================================================ */
  const GROUND_TOP_Y = {
    ISLAND_SAND: 1.80,   // sandBase(0.6) + halfH(1.2)
    ISLAND_TURF: 3.04,   // midTurfMesh(2.2) + halfH(0.84)
    ISLAND_DOCK: 1.09,   // dockDeck(0.95) + halfH(0.14)
    ISLET_TURF: 1.55,    // isletTurf(1.15) + halfH(0.4) -> content group origin y=0
    SANCT_TIER1: 5.60,   // sanctTerrace(2.8) + halfH(2.8)
    SANCT_TIER2: 11.40,  // tier2Deck(10.9) + halfH(0.5)
    SANCT_TIER3: 15.04   // daisStep(14.75) + halfH(0.29)
  };

  // Q 版新增島民 / 小動物材質庫
  const npcExtraMat = {
    eyeDark: SB(0x111827),
    cheekPink: SB(0xff8fa3, { transparent: true, opacity: 0.8 }),
    skinLight: SM(0xffe2c8),
    skinWarm: SM(0xf3c9a0),
    catOrange: SM(0xf4a261),
    catCream: SM(0xfff3e0),
    catGray: SM(0x9aa5b4),
    bearBrown: SM(0x8d5524),
    bearTan: SM(0xe6ccb2),
    bearPanda: SM(0xf8fafc),
    penguinNavy: SM(0x1d3557),
    penguinWhite: SM(0xf8fafc),
    penguinBeak: SM(0xff9f1c),
    bunnyWhite: SM(0xfafafa),
    bunnyGray: SM(0xd8dee9),
    shirtCoral: SM(0xff6b6b),
    shirtTeal: SM(0x2ec4b6),
    shirtBlue: SM(0x4fb3ff),
    shirtGold: SM(0xffd166),
    shirtPurple: SM(0xb588f7),
    shirtGreen: SM(0x5fd18b),
    hatStraw: SM(0xe9c46a),
    hatNavy: SM(0x1e3a5f),
    hatRed: SM(0xe5484d),
    bootDark: SM(0x2b3340)
  };

  // 6 座環繞小浮島 + 量子沙漏咖啡島專屬共用材質庫（全發光效果皆以 emissive 屬性實現，不使用 PointLight）
  const isletMat = {
    lighthouseRed: SM(0xe5484d),
    lighthouseWhite: SM(0xf8fafc),
    lighthouseLantern: registerNightMat(SG(0xfff1a8, 0xffb703, 0.35), { dayEi: 0.35, nightEi: 3.1 }),
    lighthouseRim: SM(0x3a4252),
    lighthouseBeam: SM(0xffe680, { emissive: 0xffc83d, emissiveIntensity: 0.4, transparent: true, opacity: 0.0, depthWrite: false, side: THREE.DoubleSide, roughness: 0.25 }),
    windmillWall: SM(0xf3e5c8),
    windmillRoof: SM(0xd96b43),
    windmillSail: SM(0xfff7e0),
    wateringCan: SM(0x4ea8de, { metalness: 0.25 }),
    tulipRed: SM(0xff4d6d),
    tulipYellow: SM(0xffd166),
    tulipPurple: SM(0xc77dff),
    tentYellow: SM(0xffca3a),
    tentDoor: SM(0x7c4f28),
    campfireStone: SM(0x7b8794),
    campfireOuter: registerNightMat(SG(0xff8a1d, 0xff5400, 0.85), { dayEi: 0.85, nightEi: 2.2 }),
    campfireInner: registerNightMat(SG(0xffe066, 0xffc300, 1.05), { dayEi: 1.05, nightEi: 2.6 }),
    gazeboWhite: SM(0xf4f7fb),
    gazeboRoof: SM(0x3a6073),
    brassGold: SM(0xffb703, { metalness: 0.6, roughness: 0.28 }),
    starLens: registerNightMat(SG(0x7ff0ff, 0x00b4d8, 0.5), { dayEi: 0.5, nightEi: 2.1 }),
    palmTrunk: SM(0x8d5b3c),
    palmLeaf: SM(0x4cc970),
    coconut: SM(0x5c3a21),
    umbrellaRed: SM(0xff5964),
    umbrellaWhite: SM(0xffffff),
    towelBlue: SM(0x48cae4),
    towelStripe: SM(0xffd166),
    chestWood: SM(0x9c6644),
    chestGold: SG(0xffd166, 0xd97706, 0.55, { metalness: 0.5 }),
    chestGem: SG(0x00f5d4, 0x00bbf9, 1.1),
    bucketBlue: SM(0x38a3d1),
    bobberRed: SM(0xff4d4d),
    fishLine: SM(0xffffff, { emissive: 0xffffff, emissiveIntensity: 0.35 }),
    // 升級 7 座 NPC 島共用主題材質
    cafeSand: SM(0xfbf2da, { roughness: 0.78 }),
    cafeTurf: SM(0x7ad680, { roughness: 0.68 }),
    mintRoof: SM(0x52d6a6, { roughness: 0.52 }),
    crystalCyan: registerNightMat(SG(0x7fe9ff, 0x00d4ff, 0.45, { transparent: true, opacity: 0.68, roughness: 0.14, metalness: 0.12 }), { dayEi: 0.45, nightEi: 2.45 }),
    starGoldEmissive: registerNightMat(SG(0xffe066, 0xffb703, 0.45, { metalness: 0.45, roughness: 0.22 }), { dayEi: 0.45, nightEi: 1.85 }),
    buoyGlow: registerNightMat(SG(0x7ff0ff, 0x00d4ff, 0.6), { dayEi: 0.6, nightEi: 2.35 }),
    lampEmissive: registerNightMat(SG(0xfff0a8, 0xffaa00, 0.2), { dayEi: 0.2, nightEi: 2.25 }),
    coffeeCeramic: SM(0xfffdf8, { roughness: 0.28 }),
    coffeeLiquid: SM(0x5c3a21, { roughness: 0.35 }),
    observatoryWall: SM(0xf8fafc, { roughness: 0.48 }),
    observatoryDome: SM(0x2563eb, { roughness: 0.44 }),
    postRed: SM(0xe11d48, { roughness: 0.52 }),
    bottleGlass: SG(0x9be7ff, 0x38bdf8, 0.3, { transparent: true, opacity: 0.65, roughness: 0.14 }),
    corkGlow: registerNightMat(SG(0xffd166, 0xff9f1c, 0.35), { dayEi: 0.35, nightEi: 2.0 }),
    parchment: SM(0xfef3c7, { roughness: 0.65 }),
    koiOrange: registerNightMat(SG(0xff7b3a, 0xff5a00, 0.35), { dayEi: 0.35, nightEi: 2.55 }),
    koiCyan: registerNightMat(SG(0x5eead4, 0x14f1d9, 0.35), { dayEi: 0.35, nightEi: 2.45 }),
    vinylBlack: SM(0x1e293b, { roughness: 0.32, metalness: 0.2 }),
    noteNeonPink: SG(0xff70a6, 0xff2e88, 0.5),
    noteNeonCyan: SG(0x64dfdf, 0x00bbf9, 0.5),
    greenhouseGlass: registerNightMat(SG(0xc8f7ff, 0x5eead4, 0.16, { transparent: true, opacity: 0.4, roughness: 0.12, side: THREE.DoubleSide, depthWrite: false }), { dayEi: 0.16, nightEi: 1.15, dayOp: 0.4, nightOp: 0.56 }),
    glowFlowerCyan: SG(0x7ff0ff, 0x00e5a8, 0.45),
    glowFlowerPink: SG(0xff9ecd, 0xe855ff, 0.45),
    headphoneGlow: registerNightMat(SG(0x38bdf8, 0x0ea5e9, 0.55), { dayEi: 0.55, nightEi: 2.1 }),
    gogglesLens: registerNightMat(SG(0x67e8f9, 0x06b6d4, 0.5), { dayEi: 0.5, nightEi: 1.85 }),
    apronCoffee: SM(0x6f4e37, { roughness: 0.72 })
  };

  // 中央神殿升級 + 終極通關特效材質庫
  const sanctExtraMat = {
    starTileDark: SM(0x253252, { roughness: 0.42, metalness: 0.12 }),
    starTileGold: registerNightMat(SG(0xffd166, 0xd97706, 0.32, { metalness: 0.5 }), { dayEi: 0.32, nightEi: 1.15 }),
    chaliceGold: registerNightMat(SG(0xffd166, 0xd97706, 0.4, { metalness: 0.62, roughness: 0.22 }), { dayEi: 0.4, nightEi: 1.3 }),
    chaliceCore: registerNightMat(SG(0xfff3b0, 0xffb703, 1.1, { roughness: 0.12 }), { dayEi: 1.1, nightEi: 2.6 }),
    altarMarble: SM(0xf4f6fb, { roughness: 0.35 }),
    brazierBronze: SM(0x9a6b32, { metalness: 0.48, roughness: 0.38 }),
    runeMote: registerNightMat(SG(0x7ff0ff, 0x00e5ff, 0.7), { dayEi: 0.7, nightEi: 2.25 }),
    finaleGoldStar: registerNightMat(SG(0xffe066, 0xffaa00, 0.75, { metalness: 0.55 }), { dayEi: 0.75, nightEi: 2.0 }),
    finalePillarBeam: registerNightMat(SB(0xffd166, { transparent: true, opacity: 0.3, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false }), { dayOp: 0.28, nightOp: 0.55 }),
    finaleRayMat: registerNightMat(SB(0xffe680, { transparent: true, opacity: 0.42, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false }), { dayOp: 0.4, nightOp: 0.75 }),
    finaleCrownRainbow: [0x4fb3ff, 0xff8a65, 0xc58bff, 0x5fd18b, 0xffd166, 0x2ec4b6, 0xff6fb5].map(
      (hex) => registerNightMat(SG(hex, hex, 0.65, { roughness: 0.22 }), { dayEi: 0.65, nightEi: 1.85 })
    )
  };
  const npcClothRaincoatMat = new THREE.MeshStandardMaterial({ color: 0xff9f1c, roughness: 0.55, flatShading: true });
  const npcClothRedMat = new THREE.MeshStandardMaterial({ color: 0xe63946, roughness: 0.7, flatShading: true });
  const npcClothBlueMat = new THREE.MeshStandardMaterial({ color: 0x457b9d, roughness: 0.7, flatShading: true });
  const npcClothBeigeMat = new THREE.MeshStandardMaterial({ color: 0xeddcd2, roughness: 0.75, flatShading: true });
  const npcCheekPinkMat = new THREE.MeshStandardMaterial({ color: 0xff8fa3, roughness: 0.5, flatShading: true });
  const npcEyeBlackMat = new THREE.MeshStandardMaterial({ color: 0x1a1a24, roughness: 0.2, flatShading: true });
  const npcWhiteBellyMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.55, flatShading: true });
  const npcBeakOrangeMat = new THREE.MeshStandardMaterial({ color: 0xf77f00, roughness: 0.45, flatShading: true });

  /* ============================================================
   * 工具函式：建立圓角幾何島體 (LatheGeometry) 與文字標籤 Sprite
   * ============================================================ */
  function createRoundedCylinderGeometry(radiusTop, radiusBottom, height, bevelRadius, radialSegments = 14) {
    const pts = [];
    const rT = Math.max(0.2, radiusTop - bevelRadius);
    const halfH = height / 2;
    // 底部中心至外側斜坡
    pts.push(new THREE.Vector2(0, -halfH));
    pts.push(new THREE.Vector2(radiusBottom, -halfH));
    pts.push(new THREE.Vector2(radiusTop, halfH - bevelRadius));
    // 頂部圓角導角 (Bevel)
    const bevelSteps = 4;
    for (let i = 1; i <= bevelSteps; i++) {
      const theta = (i / bevelSteps) * (Math.PI / 2);
      const bx = rT + Math.cos(theta) * bevelRadius;
      const by = (halfH - bevelRadius) + Math.sin(theta) * bevelRadius;
      pts.push(new THREE.Vector2(bx, by));
    }
    pts.push(new THREE.Vector2(0, halfH));
    const geo = new THREE.LatheGeometry(pts, radialSegments);
    geo.computeVertexNormals();
    return geo;
  }

  function drawLabelCanvas(ctx, emoji, title, subtitle, accentColor, isLocked = false, isDim = false) {
    ctx.clearRect(0, 0, 512, 176);
    // 高對比圓角白膠囊樣式（背景 rgba(255, 253, 245, 0.92)、邊框 2px solid #334155、字體 #0f172a 粗體加陰影）
    const x = 22, y = 18, w = 468, h = 134, r = 67;
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();

    ctx.fillStyle = isDim ? "rgba(203, 213, 225, 0.55)" : "rgba(255, 253, 245, 0.92)";
    ctx.shadowColor = "rgba(15, 23, 42, 0.36)";
    ctx.shadowBlur = 16;
    ctx.shadowOffsetY = 6;
    ctx.fill();

    // 2px solid #334155 邊框（2x Canvas 解析度對應 4px）
    ctx.shadowColor = "transparent";
    ctx.lineWidth = 4;
    ctx.strokeStyle = isDim ? "rgba(100, 116, 139, 0.55)" : "#334155";
    ctx.stroke();
    ctx.restore();

    // 主標題 (Emoji + 島名：#0f172a 粗體加陰影)
    ctx.save();
    ctx.fillStyle = isDim ? "#94a3b8" : "#0f172a";
    ctx.font = "900 40px 'Noto Sans TC', 'Microsoft JhengHei', sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.shadowColor = "rgba(15, 23, 42, 0.22)";
    ctx.shadowBlur = 4;
    ctx.shadowOffsetY = 2;
    ctx.fillText(`${emoji} ${title}`, 256, 65, 434);

    // 副標題（#0f172a 粗體加柔和立體陰影）
    ctx.fillStyle = isDim ? "#94a3b8" : isLocked ? "#334155" : "#0f172a";
    ctx.font = "800 23px 'Noto Sans TC', 'Microsoft JhengHei', sans-serif";
    ctx.shadowColor = "rgba(255, 255, 255, 0.85)";
    ctx.shadowBlur = 2;
    ctx.shadowOffsetY = 1;
    ctx.fillText(subtitle, 256, 115, 434);
    ctx.restore();
  }

  function createLabelSprite(emoji, title, subtitle, accentColor, isLocked = false) {
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 176;
    const ctx = canvas.getContext("2d");

    let curState = { emoji, title, subtitle, accentColor, isLocked, isDim: false };
    const redraw = () =>
      drawLabelCanvas(ctx, curState.emoji, curState.title, curState.subtitle, curState.accentColor, curState.isLocked, curState.isDim);
    redraw();

    const texture = new THREE.CanvasTexture(canvas);
    texture.minFilter = THREE.LinearFilter;
    const spriteMat = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      depthTest: false,
      toneMapped: false
    });
    const sprite = new THREE.Sprite(spriteMat);
    sprite.scale.set(11.5, 3.95, 1);
    sprite.renderOrder = 10;
    sprite.userData.updateSubtitle = (newSubtitle) => {
      curState.subtitle = newSubtitle;
      redraw();
      texture.needsUpdate = true;
    };
    sprite.userData.updateFullLabel = (patch = {}) => {
      curState = { ...curState, ...patch };
      redraw();
      texture.needsUpdate = true;
    };
    return sprite;
  }

  // 共用低多邊形小樹裝飾（全域共享幾何體與材質池，避免重複 new 造成 Draw Call 與記憶體浪費）
  const sharedToyTreeTrunkGeo = new THREE.CylinderGeometry(0.18, 0.26, 1.0, 6);
  const sharedToyTreeCrownGeo1 = new THREE.DodecahedronGeometry(0.85, 0);
  const sharedToyTreeCrownGeo2 = new THREE.DodecahedronGeometry(0.62, 0);
  const sharedToyTreeTrunkMat = new THREE.MeshStandardMaterial({ color: 0x8d5b3c, flatShading: true, roughness: 0.85 });
  const sharedToyTreeCrownMats = new Map();

  function createToyTree(crownColor = 0x56c972, scale = 1) {
    const tree = new THREE.Group();
    const trunk = new THREE.Mesh(sharedToyTreeTrunkGeo, sharedToyTreeTrunkMat);
    trunk.position.y = 0.5;
    trunk.castShadow = true;
    tree.add(trunk);

    let crownMat = sharedToyTreeCrownMats.get(crownColor);
    if (!crownMat) {
      crownMat = new THREE.MeshStandardMaterial({ color: crownColor, flatShading: true, roughness: 0.65 });
      sharedToyTreeCrownMats.set(crownColor, crownMat);
    }
    const c1 = new THREE.Mesh(sharedToyTreeCrownGeo1, crownMat);
    c1.position.y = 1.35;
    c1.castShadow = true;
    tree.add(c1);

    const c2 = new THREE.Mesh(sharedToyTreeCrownGeo2, crownMat);
    c2.position.set(0.2, 1.95, 0.1);
    c2.castShadow = true;
    tree.add(c2);

    tree.scale.setScalar(scale);
    return tree;
  }

  /* ============================================================
   * 四階段建築繁榮度（Lv.0 ~ Lv.3）純幾何 Low-poly 建築群組生成
   * ------------------------------------------------------------
   * 為每座島建立三個子群組：level1Props, level2Props, level3Props
   * - 電腦探險島 (sys)    : 帳篷 -> 組裝工坊+風扇 -> 水晶 CPU 方碑
   * - 數位公民島 (citizen): 木警示牌 -> 防禦石塔 -> 真理燈塔與光盾
   * - 創作協作島 (create) : 畫架積木 -> 彩色木屋 -> 稜鏡藝廊與彩虹
   * - 程式森林島 (code)   : 積木小樹 -> 邏輯水車木屋 -> 綠光邏輯神木
   * - 演算法山   (algo)   : 流程圖石階 -> 日晷觀測台 -> 思維巔峰神殿
   * - 資料海灣   (data)   : 0與1木箱 -> 分揀貨櫃站 -> 水晶數據天文台
   * - AI 智慧島  (ai)     : 休眠小機器人 -> 數據訓練塔 -> 懸浮 AI 核心球
   * ============================================================ */
  /* ============================================================
   * 四階段建築繁榮度（Lv.0 ~ Lv.3）純幾何 Low-poly 建築群組生成
   * 【重大升級】：強化建築近距微細節（凸出立體窗框、雙層斜屋頂簷口、木質門廊台階、鵝卵石小徑）
   * 與七島專屬微結構（散熱格柵、開關按鈕、外接纜線、石質塔樓、鉚釘大門、微光護盾浮雕、
   * 畫架木支架、外掛立體調色盤、旋轉連軸齒輪、積木榫接邊框、樹枝微光邏輯燈籠、
   * 層階金字塔石磚紋理、引導路標柱與分支分叉路徑、水晶柱金屬基盤、二進位刻痕方塊、
   * 數據管道接口、多軸旋轉軌道環、基座神經光纖發光紋路）
   * ============================================================ */
  function createIslandProsperityProps(islandId, accentHex) {
    const level1Props = new THREE.Group();
    level1Props.name = "level1Props";
    level1Props.position.set(-1.45, 3.04, 0.85);

    const level2Props = new THREE.Group();
    level2Props.name = "level2Props";
    level2Props.position.set(1.4, 3.04, 0.45);

    const level3Props = new THREE.Group();
    level3Props.name = "level3Props";
    level3Props.position.set(0, 3.04, -0.25);

    const animRefs = {};

    const mat = (color, opts = {}) =>
      new THREE.MeshStandardMaterial({
        color,
        flatShading: true,
        roughness: opts.roughness ?? 0.5,
        metalness: opts.metalness ?? 0.08,
        emissive: opts.emissive ?? 0x000000,
        emissiveIntensity: opts.emissiveIntensity ?? 0,
        transparent: opts.transparent ?? false,
        opacity: opts.opacity ?? 1
      });

    const whiteMat = mat(0xf6f9fc, { roughness: 0.48 });
    const darkMat = mat(0x22334d, { roughness: 0.42 });
    const goldMat = mat(0xffd166, { roughness: 0.32, metalness: 0.35, emissive: 0xb87d00, emissiveIntensity: 0.22 });
    const ironMat = mat(0x475569, { roughness: 0.4, metalness: 0.65 });
    const cyanLightMat = mat(0x00f0ff, { emissive: 0x00b4d8, emissiveIntensity: 0.85 });

    // 【共同微細節輔助函式】：凸出立體窗框（外凸邊框、窗台、十字木窗櫺、玻璃窗格）
    function addFramedWindow(parent, x, y, z, w, h, glassColor = 0x4fb3ff, rotY = 0) {
      const winGroup = new THREE.Group();
      winGroup.position.set(x, y, z);
      winGroup.rotation.y = rotY;

      // 凸出實木外框
      const frame = new THREE.Mesh(new THREE.BoxGeometry(w + 0.12, h + 0.12, 0.08), woodDarkMat);
      frame.castShadow = true;
      winGroup.add(frame);

      // 下凸出窗台板
      const sill = new THREE.Mesh(new THREE.BoxGeometry(w + 0.18, 0.06, 0.14), woodDarkMat);
      sill.position.set(0, -h / 2 - 0.03, 0.03);
      winGroup.add(sill);

      // 發光玻璃窗
      const glass = new THREE.Mesh(
        new THREE.BoxGeometry(w, h, 0.04),
        mat(glassColor, { emissive: glassColor, emissiveIntensity: 0.65, roughness: 0.2 })
      );
      glass.position.z = 0.03;
      winGroup.add(glass);

      // 十字木窗櫺
      const mullionH = new THREE.Mesh(new THREE.BoxGeometry(w, 0.035, 0.06), woodDarkMat);
      mullionH.position.z = 0.04;
      winGroup.add(mullionH);

      const mullionV = new THREE.Mesh(new THREE.BoxGeometry(0.035, h, 0.06), woodDarkMat);
      mullionV.position.z = 0.04;
      winGroup.add(mullionV);

      parent.add(winGroup);
      return winGroup;
    }

    // 【共同微細節輔助函式】：木質門廊台階（雙層踏步踏階、立體木門檻與左右扶手立柱）
    function addWoodenPorch(parent, x, y, z, w = 0.8, d = 0.65, rotY = 0) {
      const porch = new THREE.Group();
      porch.position.set(x, y, z);
      porch.rotation.y = rotY;

      const step1 = new THREE.Mesh(new THREE.BoxGeometry(w, 0.1, d), woodLightMat);
      step1.position.set(0, 0.05, 0);
      step1.receiveShadow = true;
      porch.add(step1);

      const step2 = new THREE.Mesh(new THREE.BoxGeometry(w * 0.85, 0.1, d * 0.55), woodDarkMat);
      step2.position.set(0, 0.15, -d * 0.22);
      step2.receiveShadow = true;
      porch.add(step2);

      [-w / 2 + 0.06, w / 2 - 0.06].forEach((px) => {
        const post = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.45, 0.08), woodDarkMat);
        post.position.set(px, 0.25, d / 2 - 0.06);
        post.castShadow = true;
        porch.add(post);
      });

      parent.add(porch);
      return porch;
    }

    // 【共同微細節輔助函式】：地面鵝卵石小徑（散落的自然圓角石板路）
    function addCobblestonePath(parent, pts) {
      const pathGroup = new THREE.Group();
      const stoneGeo = new THREE.CylinderGeometry(0.16, 0.2, 0.04, 6);
      const stoneMat2 = mat(0xc2cad0, { roughness: 0.85 });
      pts.forEach(([px, pz, rot = 0, scale = 1]) => {
        const stone = new THREE.Mesh(stoneGeo, stoneMat2);
        stone.position.set(px, 0.02, pz);
        stone.rotation.y = rot;
        stone.scale.set(scale, 1, scale * 0.85);
        stone.receiveShadow = true;
        pathGroup.add(stone);
      });
      parent.add(pathGroup);
      return pathGroup;
    }

    switch (islandId) {
      /* ----------------------------------------------------------
       * 1. 電腦探險島 (sys)：帳篷 -> 組裝工坊+風扇 -> 水晶 CPU 方碑
       *    [微細節] 主機散熱格柵、發光螢幕開關按鈕、外接管道纜線、雙層斜屋頂簷口、凸出窗框
       * ---------------------------------------------------------- */
      case "sys": {
        // [Lv.1] 帳篷 (Explorer Tent) + 門廊 + 外接主機散熱格柵與纜線
        const tentPad = new THREE.Mesh(new THREE.CylinderGeometry(1.05, 1.15, 0.12, 8), woodLightMat);
        tentPad.position.y = 0.06;
        tentPad.receiveShadow = true;
        level1Props.add(tentPad);

        const tentBodyGeo = new THREE.ConeGeometry(0.95, 1.35, 4);
        const tentBody = new THREE.Mesh(tentBodyGeo, mat(0x4fb3ff, { roughness: 0.55 }));
        tentBody.position.y = 0.74;
        tentBody.rotation.y = Math.PI / 4;
        tentBody.scale.set(1.1, 1, 1.25);
        tentBody.castShadow = true;
        level1Props.add(tentBody);

        const tentStripe = new THREE.Mesh(new THREE.ConeGeometry(0.97, 0.55, 4), whiteMat);
        tentStripe.position.y = 1.15;
        tentStripe.rotation.y = Math.PI / 4;
        tentStripe.scale.set(0.46, 1, 0.52);
        level1Props.add(tentStripe);

        const tentDoor = new THREE.Mesh(new THREE.ConeGeometry(0.42, 0.78, 3), darkMat);
        tentDoor.position.set(0, 0.46, 0.65);
        tentDoor.rotation.y = Math.PI;
        level1Props.add(tentDoor);

        const ridgePole = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.55, 6), woodDarkMat);
        ridgePole.position.set(0, 1.38, 0);
        ridgePole.rotation.x = Math.PI / 2;
        level1Props.add(ridgePole);

        addWoodenPorch(level1Props, 0, 0.06, 0.95, 0.7, 0.4);

        // 微型探險主機箱（主機散熱格柵 + 發光開關）
        const miniPC = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.38, 0.32), darkMat);
        miniPC.position.set(0.82, 0.22, 0.35);
        miniPC.castShadow = true;
        level1Props.add(miniPC);

        for (let g = 0; g < 3; g++) {
          const louver = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.03, 0.02), ironMat);
          louver.position.set(0.82, 0.16 + g * 0.08, 0.52);
          level1Props.add(louver);
        }
        const ledDot = new THREE.Mesh(new THREE.SphereGeometry(0.025, 6, 6), mat(0x00ff88, { emissive: 0x00ff88, emissiveIntensity: 1 }));
        ledDot.position.set(0.9, 0.35, 0.52);
        level1Props.add(ledDot);

        const campLantern = new THREE.Mesh(
          new THREE.OctahedronGeometry(0.18, 0),
          mat(0xffd166, { emissive: 0xff9f1c, emissiveIntensity: 0.7 })
        );
        campLantern.position.set(0.68, 0.25, 0.75);
        level1Props.add(campLantern);

        // [Lv.2] 組裝工坊 (Assembly Workshop) + 散熱格柵 + 發光開關按鈕 + 雙層簷口 + 凸出窗框 + 外接管道纜線
        const wsBase = new THREE.Mesh(new THREE.BoxGeometry(1.95, 0.22, 1.65), stoneDarkMat);
        wsBase.position.y = 0.11;
        wsBase.receiveShadow = true;
        level2Props.add(wsBase);

        const wsWalls = new THREE.Mesh(new THREE.BoxGeometry(1.68, 1.28, 1.38), whiteMat);
        wsWalls.position.y = 0.82;
        wsWalls.castShadow = true;
        wsWalls.receiveShadow = true;
        level2Props.add(wsWalls);

        // 雙層斜屋頂簷口 (Double-layered pitched eaves)
        const wsEavesUnder = new THREE.Mesh(new THREE.BoxGeometry(1.88, 0.1, 1.58), woodDarkMat);
        wsEavesUnder.position.y = 1.48;
        wsEavesUnder.castShadow = true;
        level2Props.add(wsEavesUnder);

        const wsRoof = new THREE.Mesh(
          new THREE.ConeGeometry(1.42, 0.82, 4),
          mat(0x1e6091, { roughness: 0.45 })
        );
        wsRoof.position.y = 1.86;
        wsRoof.rotation.y = Math.PI / 4;
        wsRoof.scale.set(1.12, 1, 0.94);
        wsRoof.castShadow = true;
        level2Props.add(wsRoof);

        // 凸出立體窗框
        addFramedWindow(level2Props, -0.32, 0.92, 0.7, 0.58, 0.42, 0x4fb3ff);
        addWoodenPorch(level2Props, 0.45, 0.18, 0.92, 0.65, 0.45);

        const wsDoor = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.74, 0.08), woodDarkMat);
        wsDoor.position.set(0.45, 0.56, 0.7);
        level2Props.add(wsDoor);

        // 主機散熱格柵 (Multi-slat Cooling Louvers on workshop flank)
        const louverBox = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.72, 0.65), darkMat);
        louverBox.position.set(-0.86, 0.85, 0);
        level2Props.add(louverBox);
        for (let s = 0; s < 5; s++) {
          const slat = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.05, 0.52), ironMat);
          slat.position.set(-0.88, 0.6 + s * 0.12, 0);
          slat.rotation.z = -0.15;
          level2Props.add(slat);
        }

        // 發光螢幕開關按鈕 (LED Buttons)
        const powerBtn = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.04, 8), mat(0x00ff88, { emissive: 0x00ff88, emissiveIntensity: 1 }));
        powerBtn.rotation.x = Math.PI / 2;
        powerBtn.position.set(0.08, 0.95, 0.71);
        level2Props.add(powerBtn);

        const amberLed = new THREE.Mesh(new THREE.SphereGeometry(0.025, 6, 6), mat(0xffb703, { emissive: 0xffb703, emissiveIntensity: 1 }));
        amberLed.position.set(0.08, 0.85, 0.71);
        level2Props.add(amberLed);

        // 外接管道纜線 (External Cable Conduit)
        const conduitCurve = new THREE.CatmullRomCurve3([
          new THREE.Vector3(-0.84, 0.45, -0.3),
          new THREE.Vector3(-0.95, 0.22, 0.2),
          new THREE.Vector3(-0.65, 0.12, 0.85),
          new THREE.Vector3(-0.15, 0.06, 0.95)
        ]);
        const conduitMesh = new THREE.Mesh(new THREE.TubeGeometry(conduitCurve, 14, 0.045, 6, false), darkMat);
        level2Props.add(conduitMesh);

        // 旋轉散熱風扇
        const fanHousing = new THREE.Mesh(new THREE.TorusGeometry(0.38, 0.07, 6, 12), darkMat);
        fanHousing.position.set(0, 1.15, -0.7);
        level2Props.add(fanHousing);

        const fanRotor = new THREE.Group();
        fanRotor.position.set(0, 1.15, -0.72);
        const fanHub = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.08, 8), goldMat);
        fanHub.rotation.x = Math.PI / 2;
        fanRotor.add(fanHub);
        for (let b = 0; b < 4; b++) {
          const blade = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.09, 0.03), mat(0x4fb3ff, { emissive: 0x1b6ca8, emissiveIntensity: 0.5 }));
          const ba = (b / 4) * Math.PI * 2;
          blade.position.set(Math.cos(ba) * 0.18, Math.sin(ba) * 0.18, 0);
          blade.rotation.z = ba + 0.35;
          fanRotor.add(blade);
        }
        level2Props.add(fanRotor);
        animRefs.sysFan = fanRotor;

        addCobblestonePath(level2Props, [
          [0.45, 1.25, 0.1, 1],
          [0.35, 1.55, 0.4, 0.9],
          [0.15, 1.82, -0.2, 1.1]
        ]);

        // [Lv.3] 水晶 CPU 方碑 (Crystal CPU Obelisk) + 散熱片微結構 + 粗外接電力管道 + 脈動 LED + 鵝卵石徑
        const pcbBase = new THREE.Mesh(
          new THREE.BoxGeometry(2.55, 0.28, 2.55),
          mat(0x0f4c5c, { roughness: 0.38, metalness: 0.35 })
        );
        pcbBase.position.y = 0.14;
        pcbBase.castShadow = true;
        pcbBase.receiveShadow = true;
        level3Props.add(pcbBase);

        // 金色 CPU 針腳陣列
        for (let side = 0; side < 4; side++) {
          for (let p = -2; p <= 2; p++) {
            const pin = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.18, 0.12), goldMat);
            const dist = 1.18;
            const offset = p * 0.42;
            if (side === 0) pin.position.set(offset, 0.32, dist);
            if (side === 1) pin.position.set(offset, 0.32, -dist);
            if (side === 2) pin.position.set(dist, 0.32, offset);
            if (side === 3) pin.position.set(-dist, 0.32, offset);
            level3Props.add(pin);
          }
        }

        // 鋁金屬散熱鰭片組 (CPU heat sink fin arrays)
        const cpuDie = new THREE.Mesh(new THREE.BoxGeometry(1.85, 0.35, 1.85), mat(0x334155, { roughness: 0.3, metalness: 0.6 }));
        cpuDie.position.y = 0.42;
        cpuDie.castShadow = true;
        level3Props.add(cpuDie);

        for (let f = -3; f <= 3; f++) {
          const fin = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.25, 0.06), ironMat);
          fin.position.set(0, 0.68, f * 0.22);
          fin.castShadow = true;
          level3Props.add(fin);
        }

        // 四角發光開關按鈕 / 狀態指示燈
        [[-0.8, -0.8], [0.8, -0.8], [-0.8, 0.8], [0.8, 0.8]].forEach(([cx, cz], ci) => {
          const ledCol = ci % 2 === 0 ? 0x00ff88 : 0x00d4ff;
          const statusLed = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.12, 8), mat(ledCol, { emissive: ledCol, emissiveIntensity: 1.2 }));
          statusLed.position.set(cx, 0.32, cz);
          level3Props.add(statusLed);
        });

        // 粗厚外接電力/數據管道纜線 (Heavy External Conduits into Junction Box)
        const cable1 = new THREE.Mesh(new THREE.TorusGeometry(1.35, 0.065, 8, 20, Math.PI / 1.5), mat(0x1a2536, { roughness: 0.4 }));
        cable1.rotation.x = Math.PI / 2;
        cable1.rotation.z = 0.4;
        cable1.position.set(0, 0.2, 0);
        level3Props.add(cable1);

        const cable2 = new THREE.Mesh(new THREE.TorusGeometry(1.45, 0.055, 8, 20, Math.PI / 1.8), mat(0x0077b6, { roughness: 0.5 }));
        cable2.rotation.x = Math.PI / 2;
        cable2.rotation.z = -1.8;
        cable2.position.set(0, 0.16, 0);
        level3Props.add(cable2);

        // 水晶方碑主體與尖頂
        const obeliskGroup = new THREE.Group();
        obeliskGroup.position.y = 0.82;
        const crystalMatSys = mat(0x4fb3ff, {
          emissive: 0x0096c7,
          emissiveIntensity: 0.78,
          roughness: 0.18,
          metalness: 0.2,
          transparent: true,
          opacity: 0.92
        });
        const obeliskShaft = new THREE.Mesh(new THREE.CylinderGeometry(0.48, 0.78, 2.75, 6), crystalMatSys);
        obeliskShaft.position.y = 1.38;
        obeliskShaft.castShadow = true;
        obeliskGroup.add(obeliskShaft);

        const obeliskTip = new THREE.Mesh(new THREE.ConeGeometry(0.48, 0.92, 6), crystalMatSys);
        obeliskTip.position.y = 3.2;
        obeliskTip.castShadow = true;
        obeliskGroup.add(obeliskTip);

        const energyRing = new THREE.Mesh(
          new THREE.TorusGeometry(0.95, 0.06, 6, 20),
          mat(0x90e0ef, { emissive: 0x48cae4, emissiveIntensity: 0.95 })
        );
        energyRing.rotation.x = Math.PI / 2;
        energyRing.position.y = 1.75;
        obeliskGroup.add(energyRing);

        level3Props.add(obeliskGroup);
        animRefs.sysObeliskRing = energyRing;

        addCobblestonePath(level3Props, [
          [0, 1.45, 0, 1.2],
          [0.2, 1.75, 0.3, 1],
          [-0.1, 2.05, -0.2, 1.1]
        ]);
        break;
      }

      /* ----------------------------------------------------------
       * 2. 數位公民島 (citizen)：木警示牌 -> 防禦石塔 -> 真理燈塔與光盾
       *    [微細節] 石質守護塔樓、金屬鉚釘加固大門、微光護盾浮雕、雙層簷口、石階路徑
       * ---------------------------------------------------------- */
      case "citizen": {
        // [Lv.1] 木警示牌 (Wooden Warning Sign) + 金屬鉚釘護條
        const signMound = new THREE.Mesh(new THREE.CylinderGeometry(0.65, 0.8, 0.18, 7), stoneGrayMat);
        signMound.position.y = 0.09;
        level1Props.add(signMound);

        const signPost = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.13, 1.35, 6), woodDarkMat);
        signPost.position.y = 0.75;
        signPost.castShadow = true;
        level1Props.add(signPost);

        const boardRim = new THREE.Mesh(
          new THREE.CylinderGeometry(0.72, 0.72, 0.14, 3),
          mat(0xff8a65, { roughness: 0.45 })
        );
        boardRim.rotation.x = Math.PI / 2;
        boardRim.rotation.z = Math.PI;
        boardRim.position.set(0, 1.35, 0.1);
        boardRim.castShadow = true;
        level1Props.add(boardRim);

        const boardFace = new THREE.Mesh(
          new THREE.CylinderGeometry(0.52, 0.52, 0.16, 3),
          mat(0xfff3b0, { roughness: 0.5 })
        );
        boardFace.rotation.x = Math.PI / 2;
        boardFace.rotation.z = Math.PI;
        boardFace.position.set(0, 1.35, 0.11);
        level1Props.add(boardFace);

        // 金屬鉚釘加固
        [[-0.35, 1.1], [0.35, 1.1], [0, 1.62]].forEach(([rx, ry]) => {
          const rivet = new THREE.Mesh(new THREE.SphereGeometry(0.04, 6, 6), goldMat);
          rivet.position.set(rx, ry, 0.2);
          level1Props.add(rivet);
        });

        const bangBar = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.3, 0.06), darkMat);
        bangBar.position.set(0, 1.44, 0.2);
        level1Props.add(bangBar);
        const bangDot = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 0.06), darkMat);
        bangDot.position.set(0, 1.18, 0.2);
        level1Props.add(bangDot);

        // [Lv.2] 石質守護塔樓 (Stone Bastion Tower) + 鉚釘加固大門 + 微光護盾浮雕 + 箭孔
        const towerBase = new THREE.Mesh(new THREE.CylinderGeometry(1.08, 1.25, 0.38, 8), stoneDarkMat);
        towerBase.position.y = 0.19;
        towerBase.receiveShadow = true;
        level2Props.add(towerBase);

        // 鑿石厚重塔身 (Chiseled masonry stone body)
        const towerBody = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 1.02, 2.15, 8), stoneGrayMat);
        towerBody.position.y = 1.35;
        towerBody.castShadow = true;
        towerBody.receiveShadow = true;
        level2Props.add(towerBody);

        // 箭孔 (Arrow slit embrasures)
        [Math.PI / 4, -Math.PI / 4, Math.PI * 0.75].forEach((sa) => {
          const slit = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.42, 0.24), darkMat);
          slit.position.set(Math.cos(sa) * 0.9, 1.45, Math.sin(sa) * 0.9);
          slit.rotation.y = -sa;
          level2Props.add(slit);
        });

        // 凸出挑樑與城垛雉堞雙層簷口
        const towerCrown = new THREE.Mesh(new THREE.CylinderGeometry(1.05, 0.92, 0.38, 8), stoneDarkMat);
        towerCrown.position.y = 2.5;
        towerCrown.castShadow = true;
        level2Props.add(towerCrown);

        for (let c = 0; c < 8; c++) {
          const ca = (c / 8) * Math.PI * 2;
          const crenel = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.28, 0.24), stoneGrayMat);
          crenel.position.set(Math.cos(ca) * 0.88, 2.82, Math.sin(ca) * 0.88);
          crenel.rotation.y = -ca;
          crenel.castShadow = true;
          level2Props.add(crenel);
        }

        // 金屬鉚釘加固大門 (Metal Rivet Reinforced Portal)
        const doorFrame = new THREE.Mesh(new THREE.BoxGeometry(0.74, 1.02, 0.16), stoneDarkMat);
        doorFrame.position.set(0, 0.65, 0.92);
        level2Props.add(doorFrame);

        const heavyDoor = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.86, 0.1), woodDarkMat);
        heavyDoor.position.set(0, 0.62, 0.97);
        heavyDoor.castShadow = true;
        level2Props.add(heavyDoor);

        // 鐵條與金色鉚釘
        [-0.15, 0.15].forEach((hx) => {
          const strap = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.82, 0.12), ironMat);
          strap.position.set(hx, 0.62, 0.98);
          level2Props.add(strap);
          [-0.25, 0, 0.25].forEach((ry) => {
            const rivet = new THREE.Mesh(new THREE.SphereGeometry(0.028, 6, 6), goldMat);
            rivet.position.set(hx, 0.62 + ry, 1.04);
            level2Props.add(rivet);
          });
        });

        // 微光護盾浮雕 (Embossed Radiant Shield Relief above Portal)
        const shieldRelief = new THREE.Mesh(
          new THREE.CylinderGeometry(0.24, 0.24, 0.08, 6),
          mat(0xff8a65, { emissive: 0xff6b35, emissiveIntensity: 0.85 })
        );
        shieldRelief.rotation.x = Math.PI / 2;
        shieldRelief.position.set(0, 1.35, 0.96);
        level2Props.add(shieldRelief);

        const shieldReliefCore = new THREE.Mesh(new THREE.OctahedronGeometry(0.12, 0), goldMat);
        shieldReliefCore.position.set(0, 1.35, 1.01);
        level2Props.add(shieldReliefCore);

        addCobblestonePath(level2Props, [
          [0, 1.25, 0.1, 1],
          [-0.1, 1.55, -0.2, 0.9],
          [0.15, 1.85, 0.3, 1.1]
        ]);

        // [Lv.3] 真理燈塔與懸浮微光護盾 (Truth Lighthouse & Radiant Shield)
        const lhPlinth = new THREE.Mesh(new THREE.CylinderGeometry(1.25, 1.48, 0.42, 8), stoneDarkMat);
        lhPlinth.position.y = 0.21;
        lhPlinth.receiveShadow = true;
        level3Props.add(lhPlinth);

        const stripeColors = [0xf8f9fa, 0xff8a65, 0xf8f9fa, 0xff8a65];
        stripeColors.forEach((col, sIdx) => {
          const rBot = 1.05 - sIdx * 0.09;
          const rTop = rBot - 0.08;
          const tier = new THREE.Mesh(new THREE.CylinderGeometry(rTop, rBot, 0.72, 8), mat(col, { roughness: 0.45 }));
          tier.position.y = 0.78 + sIdx * 0.72;
          tier.castShadow = true;
          level3Props.add(tier);
        });

        const galleryDeck = new THREE.Mesh(new THREE.CylinderGeometry(0.92, 0.82, 0.22, 8), darkMat);
        galleryDeck.position.y = 3.4;
        level3Props.add(galleryDeck);

        const beaconCrystal = new THREE.Mesh(
          new THREE.OctahedronGeometry(0.55, 0),
          mat(0xffe66d, { emissive: 0xff9f1c, emissiveIntensity: 1.1 })
        );
        beaconCrystal.position.y = 3.95;
        level3Props.add(beaconCrystal);

        const lhDome = new THREE.Mesh(new THREE.ConeGeometry(0.92, 0.85, 8), mat(0xff6b35, { roughness: 0.4 }));
        lhDome.position.y = 4.62;
        lhDome.castShadow = true;
        level3Props.add(lhDome);

        // 懸浮雙重浮雕微光護盾 (Floating Double-Embossed Light Shield)
        const shieldGroup = new THREE.Group();
        shieldGroup.position.set(0, 2.05, 1.25);
        const shieldPlate = new THREE.Mesh(
          new THREE.CylinderGeometry(0.85, 0.85, 0.12, 6),
          mat(0x48cae4, { emissive: 0x0096c7, emissiveIntensity: 0.75, transparent: true, opacity: 0.88 })
        );
        shieldPlate.rotation.x = Math.PI / 2;
        shieldGroup.add(shieldPlate);

        const shieldCore = new THREE.Mesh(new THREE.OctahedronGeometry(0.42, 0), goldMat);
        shieldCore.scale.set(1, 1.28, 0.48);
        shieldCore.position.z = 0.09;
        shieldGroup.add(shieldCore);

        const shieldRim = new THREE.Mesh(new THREE.TorusGeometry(0.88, 0.07, 6, 6), goldMat);
        shieldGroup.add(shieldRim);

        level3Props.add(shieldGroup);
        animRefs.citizenBeacon = beaconCrystal;
        animRefs.citizenShield = shieldGroup;

        addCobblestonePath(level3Props, [
          [0, 1.45, 0, 1.2],
          [-0.2, 1.8, 0.3, 1],
          [0.2, 2.1, -0.2, 1.1]
        ]);
        break;
      }

      /* ----------------------------------------------------------
       * 3. 創作協作島 (create)：畫架積木 -> 彩色木屋 -> 稜鏡藝廊與彩虹
       *    [微細節] 畫架木支架與微型顏料管、外掛立體調色盤、旋轉連軸齒輪、雙層簷口、凸出窗框
       * ---------------------------------------------------------- */
      case "create": {
        // [Lv.1] 畫架木支架 + 外掛立體調色盤 + 顏料管 + 彩色積木
        const easelGroup = new THREE.Group();
        [-0.34, 0.34].forEach((lx) => {
          const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.055, 1.55, 6), woodLightMat);
          leg.position.set(lx, 0.72, 0.14);
          leg.rotation.z = lx < 0 ? -0.14 : 0.14;
          leg.rotation.x = -0.15;
          leg.castShadow = true;
          easelGroup.add(leg);
        });
        const backLeg = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.055, 1.55, 6), woodLightMat);
        backLeg.position.set(0, 0.7, -0.3);
        backLeg.rotation.x = 0.28;
        easelGroup.add(backLeg);

        // 畫板托架橫樑與調整木栓 (Easel Shelf & Pegs)
        const shelf = new THREE.Mesh(new THREE.BoxGeometry(0.98, 0.06, 0.14), woodDarkMat);
        shelf.position.set(0, 0.58, 0.2);
        easelGroup.add(shelf);

        // 微型顏料管 (Mini paint tubes on shelf)
        [0xff595e, 0xffca3a, 0x1982c4].forEach((tc, ti) => {
          const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.025, 0.08, 6), mat(tc));
          tube.position.set(-0.25 + ti * 0.1, 0.63, 0.2);
          tube.rotation.z = Math.PI / 2;
          easelGroup.add(tube);
        });

        const canvasBoard = new THREE.Mesh(new THREE.BoxGeometry(1.02, 0.78, 0.09), whiteMat);
        canvasBoard.position.set(0, 0.98, 0.18);
        canvasBoard.rotation.x = -0.15;
        canvasBoard.castShadow = true;
        easelGroup.add(canvasBoard);

        // 畫布塗鴉
        [
          { c: 0xc58bff, x: -0.24, y: 1.05, r: 0.16 },
          { c: 0xffd166, x: 0.2, y: 1.02, r: 0.15 },
          { c: 0xff6fb5, x: 0.0, y: 0.82, r: 0.14 }
        ].forEach((dot) => {
          const blob = new THREE.Mesh(new THREE.DodecahedronGeometry(dot.r, 0), mat(dot.c));
          blob.position.set(dot.x, dot.y, 0.25);
          easelGroup.add(blob);
        });

        // 外掛立體調色盤 (3D Painter's Palette with Paint Dollops)
        const palette = new THREE.Group();
        palette.position.set(0.55, 0.55, 0.18);
        palette.rotation.y = -0.3;
        const palWood = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.035, 12), woodLightMat);
        palWood.scale.set(1.2, 1, 0.9);
        palette.add(palWood);

        // 拇指孔
        const thumbHole = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.04, 8), darkMat);
        thumbHole.position.set(0.16, 0, 0);
        palette.add(thumbHole);

        // 5 色立體顏料坨 (Paint Dollops)
        [0xff595e, 0xffca3a, 0x8ac926, 0x1982c4, 0x9b5de5].forEach((dc, di) => {
          const da = (di / 5) * Math.PI * 1.5 - Math.PI * 0.75;
          const dollop = new THREE.Mesh(new THREE.SphereGeometry(0.04, 6, 6), mat(dc));
          dollop.position.set(Math.cos(da) * 0.18, 0.025, Math.sin(da) * 0.14);
          palette.add(dollop);
        });
        easelGroup.add(palette);
        level1Props.add(easelGroup);

        // 旁側彩色積木堆
        const b1 = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.48, 0.48), mat(0xc58bff));
        b1.position.set(0.72, 0.24, 0.38);
        b1.castShadow = true;
        level1Props.add(b1);

        const b2 = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.4, 0.4), mat(0xffd166));
        b2.position.set(0.72, 0.68, 0.38);
        b2.rotation.y = 0.4;
        b2.castShadow = true;
        level1Props.add(b2);

        // [Lv.2] 彩色木屋 (Colorful Wooden Studio) + 旋轉連軸齒輪 + 雙層簷口 + 凸出窗框 + 門廊
        const cabinFoundation = new THREE.Mesh(new THREE.BoxGeometry(1.85, 0.22, 1.58), woodDarkMat);
        cabinFoundation.position.y = 0.11;
        level2Props.add(cabinFoundation);

        const cabinBody = new THREE.Mesh(new THREE.BoxGeometry(1.62, 1.32, 1.38), mat(0xfef9ef, { roughness: 0.55 }));
        cabinBody.position.y = 0.88;
        cabinBody.castShadow = true;
        cabinBody.receiveShadow = true;
        level2Props.add(cabinBody);

        // 彩色木條拼貼
        [0xc58bff, 0xff6fb5, 0xffd166, 0x4fb3ff].forEach((col, idx) => {
          const plank = new THREE.Mesh(new THREE.BoxGeometry(0.38, 1.32, 0.06), mat(col));
          plank.position.set(-0.57 + idx * 0.38, 0.88, 0.7);
          level2Props.add(plank);
        });

        // 雙層斜屋頂簷口 (Double-layer pitched eaves)
        const cabinEavesUnder = new THREE.Mesh(new THREE.BoxGeometry(1.85, 0.1, 1.6), woodDarkMat);
        cabinEavesUnder.position.y = 1.58;
        level2Props.add(cabinEavesUnder);

        const cabinRoof = new THREE.Mesh(new THREE.ConeGeometry(1.45, 1.02, 4), mat(0x9b5de5, { roughness: 0.42 }));
        cabinRoof.position.y = 2.05;
        cabinRoof.rotation.y = Math.PI / 4;
        cabinRoof.castShadow = true;
        level2Props.add(cabinRoof);

        // 凸出立體窗框與門廊台階
        addFramedWindow(level2Props, -0.35, 0.95, 0.71, 0.52, 0.42, 0xff6fb5);
        addWoodenPorch(level2Props, 0.45, 0.18, 0.92, 0.65, 0.45);

        const cabinDoor = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.78, 0.1), mat(0x00bbf9));
        cabinDoor.position.set(0.45, 0.6, 0.72);
        level2Props.add(cabinDoor);

        // 旋轉連軸齒輪機構 (Meshed Rotating Gears on Cabin Side)
        const gearGroup = new THREE.Group();
        gearGroup.position.set(-0.84, 0.98, 0);
        gearGroup.rotation.y = Math.PI / 2;

        const gear1 = new THREE.Group();
        const g1Ring = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.06, 12), goldMat);
        gear1.add(g1Ring);
        for (let t = 0; t < 6; t++) {
          const ta = (t / 6) * Math.PI * 2;
          const tooth = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.1, 0.08), goldMat);
          tooth.position.set(Math.cos(ta) * 0.34, Math.sin(ta) * 0.34, 0);
          tooth.rotation.z = ta;
          gear1.add(tooth);
        }
        gearGroup.add(gear1);

        const gear2 = new THREE.Group();
        gear2.position.set(0.48, 0.22, 0);
        const g2Ring = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.06, 10), mat(0xc58bff, { roughness: 0.4 }));
        gear2.add(g2Ring);
        for (let t = 0; t < 5; t++) {
          const ta = (t / 5) * Math.PI * 2;
          const tooth = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.08, 0.08), mat(0xc58bff));
          tooth.position.set(Math.cos(ta) * 0.22, Math.sin(ta) * 0.22, 0);
          tooth.rotation.z = ta;
          gear2.add(tooth);
        }
        gearGroup.add(gear2);
        level2Props.add(gearGroup);
        animRefs.createGears = { g1: gear1, g2: gear2 };

        addCobblestonePath(level2Props, [
          [0.45, 1.25, 0.1, 1],
          [0.3, 1.55, 0.3, 0.9],
          [0.1, 1.85, -0.2, 1.1]
        ]);

        // [Lv.3] 稜鏡藝廊與彩虹 (Prism Art Gallery & Rainbow)
        const galleryBase = new THREE.Mesh(new THREE.CylinderGeometry(1.55, 1.75, 0.35, 8), whiteMat);
        galleryBase.position.y = 0.18;
        galleryBase.receiveShadow = true;
        level3Props.add(galleryBase);

        const prismHall = new THREE.Mesh(
          new THREE.CylinderGeometry(1.05, 1.32, 1.95, 8),
          mat(0xe0aaff, { emissive: 0x7b2cbf, emissiveIntensity: 0.38, transparent: true, opacity: 0.9, roughness: 0.25 })
        );
        prismHall.position.y = 1.32;
        prismHall.castShadow = true;
        level3Props.add(prismHall);

        const floatingPrism = new THREE.Mesh(
          new THREE.OctahedronGeometry(0.68, 0),
          mat(0xff6fb5, { emissive: 0xc77dff, emissiveIntensity: 0.85, roughness: 0.15 })
        );
        floatingPrism.position.y = 2.92;
        floatingPrism.castShadow = true;
        level3Props.add(floatingPrism);
        animRefs.createPrism = floatingPrism;

        // 5 色立體幾何彩虹拱橋與雲朵底座
        const rainbowGroup = new THREE.Group();
        rainbowGroup.position.set(0, 1.55, -0.38);
        const rbColors = [0xff595e, 0xffca3a, 0x8ac926, 0x1982c4, 0x9b5de5];
        rbColors.forEach((rc, rIdx) => {
          const arch = new THREE.Mesh(
            new THREE.TorusGeometry(2.25 - rIdx * 0.13, 0.072, 6, 24, Math.PI),
            mat(rc, { emissive: rc, emissiveIntensity: 0.35 })
          );
          rainbowGroup.add(arch);
        });

        [-2.0, 2.0].forEach((cx) => {
          const cloud = new THREE.Mesh(new THREE.IcosahedronGeometry(0.48, 0), whiteMat);
          cloud.scale.set(1.3, 0.78, 1.0);
          cloud.position.set(cx, 0.05, 0);
          rainbowGroup.add(cloud);
        });
        level3Props.add(rainbowGroup);

        addCobblestonePath(level3Props, [
          [0, 1.45, 0.2, 1.2],
          [-0.25, 1.75, 0.4, 1],
          [0.2, 2.05, -0.1, 1.1]
        ]);
        break;
      }

      /* ----------------------------------------------------------
       * 4. 程式森林島 (code)：積木小樹 -> 邏輯水車木屋 -> 綠光邏輯神木
       *    [微細節] 積木榫接凹凸邊框、掛在樹枝上的微光邏輯符號燈籠、水車水渠、雙層簷口
       * ---------------------------------------------------------- */
      case "code": {
        // [Lv.1] 積木小樹 (Block Saplings) + 榫接凸齒 (Mortise & Tenon Studs)
        const blockSpecs = [
          { x: -0.38, z: 0.15, h: 0.55, s: 0.72, col: 0x5fd18b },
          { x: 0.42, z: -0.15, h: 0.45, s: 0.6, col: 0x38b000 },
          { x: 0.05, z: 0.48, h: 0.35, s: 0.48, col: 0x80ed99 }
        ];
        blockSpecs.forEach((bs) => {
          const sapling = new THREE.Group();
          sapling.position.set(bs.x, 0, bs.z);

          const bTrunk = new THREE.Mesh(new THREE.BoxGeometry(0.24, bs.h, 0.24), woodDarkMat);
          bTrunk.position.y = bs.h / 2;
          bTrunk.castShadow = true;
          sapling.add(bTrunk);

          const cubeCrown1 = new THREE.Mesh(new THREE.BoxGeometry(bs.s, bs.s, bs.s), mat(bs.col));
          cubeCrown1.position.y = bs.h + bs.s * 0.45;
          cubeCrown1.castShadow = true;
          sapling.add(cubeCrown1);

          // 積木頂部榫接圓柱凸粒 (Studs)
          for (let sx = -1; sx <= 1; sx += 2) {
            for (let sz = -1; sz <= 1; sz += 2) {
              const stud = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.065, 0.06, 8), mat(bs.col));
              stud.position.set(sx * bs.s * 0.25, bs.h + bs.s * 0.98, sz * bs.s * 0.25);
              sapling.add(stud);
            }
          }

          level1Props.add(sapling);
        });

        // [Lv.2] 邏輯水車木屋 (Logic Waterwheel Cabin) + 凸出窗框 + 雙層簷口 + 榫接牆角
        const millBase = new THREE.Mesh(new THREE.BoxGeometry(1.68, 0.2, 1.48), stoneDarkMat);
        millBase.position.y = 0.1;
        level2Props.add(millBase);

        const millCabin = new THREE.Mesh(new THREE.BoxGeometry(1.55, 1.25, 1.35), woodLightMat);
        millCabin.position.y = 0.72;
        millCabin.castShadow = true;
        millCabin.receiveShadow = true;
        level2Props.add(millCabin);

        // 榫接邊框（Corner interlocking notched teeth）
        for (let cz = -1; cz <= 1; cz += 2) {
          for (let cy = 0; cy < 4; cy++) {
            const tooth = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.14, 0.12), woodDarkMat);
            tooth.position.set(0.8, 0.35 + cy * 0.28, cz * 0.7);
            level2Props.add(tooth);
          }
        }

        // 雙層斜屋頂簷口
        const millEaves = new THREE.Mesh(new THREE.BoxGeometry(1.78, 0.1, 1.55), woodDarkMat);
        millEaves.position.y = 1.38;
        level2Props.add(millEaves);

        const millRoof = new THREE.Mesh(new THREE.ConeGeometry(1.35, 0.88, 4), mat(0x2d6a4f, { roughness: 0.55 }));
        millRoof.position.y = 1.85;
        millRoof.rotation.y = Math.PI / 4;
        millRoof.castShadow = true;
        level2Props.add(millRoof);

        addFramedWindow(level2Props, 0.1, 0.82, 0.69, 0.54, 0.42, 0x5fd18b);
        addWoodenPorch(level2Props, 0.52, 0.18, 0.9, 0.6, 0.42);

        // 發光邏輯水道與旋轉水車
        const trough = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.18, 1.65), mat(0x48cae4, { emissive: 0x0096c7, emissiveIntensity: 0.6 }));
        trough.position.set(-0.95, 0.15, 0);
        level2Props.add(trough);

        const waterWheel = new THREE.Group();
        waterWheel.position.set(-0.9, 0.82, 0.1);
        const wheelRim = new THREE.Mesh(new THREE.TorusGeometry(0.58, 0.07, 6, 12), woodDarkMat);
        wheelRim.rotation.y = Math.PI / 2;
        waterWheel.add(wheelRim);

        for (let p = 0; p < 8; p++) {
          const pa = (p / 8) * Math.PI * 2;
          const paddle = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.16, 0.05), woodLightMat);
          paddle.position.set(0, Math.sin(pa) * 0.58, Math.cos(pa) * 0.58);
          paddle.rotation.x = -pa;
          waterWheel.add(paddle);
        }
        level2Props.add(waterWheel);
        animRefs.codeWaterWheel = waterWheel;

        addCobblestonePath(level2Props, [
          [0.45, 1.25, 0.1, 1],
          [0.25, 1.55, 0.4, 0.9],
          [0.05, 1.85, -0.2, 1.1]
        ]);

        // [Lv.3] 綠光邏輯神木 (Green-Glow Logic Sacred Tree) + 掛在樹枝上的微光邏輯符號燈籠
        const sacredTrunk = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 1.22, 2.45, 7), mat(0x5c3a21, { roughness: 0.88 }));
        sacredTrunk.position.y = 1.22;
        sacredTrunk.castShadow = true;
        sacredTrunk.receiveShadow = true;
        level3Props.add(sacredTrunk);

        // 樹幹綠光電路符文條
        const runeGlowMat = mat(0x72efdd, { emissive: 0x38b000, emissiveIntensity: 0.95 });
        for (let r = 0; r < 5; r++) {
          const ra = (r / 5) * Math.PI * 2;
          const runeStrip = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.65, 0.12), runeGlowMat);
          runeStrip.position.set(Math.cos(ra) * 0.82, 1.25, Math.sin(ra) * 0.82);
          runeStrip.rotation.y = -ra;
          level3Props.add(runeStrip);
        }

        // 巨型多層樹冠
        const canopySpecs = [
          { x: 0, y: 3.0, z: 0, r: 1.65, col: 0x2dc653 },
          { x: -1.0, y: 2.55, z: 0.45, r: 1.15, col: 0x5fd18b },
          { x: 1.0, y: 2.6, z: 0.35, r: 1.15, col: 0x40916c },
          { x: 0, y: 3.85, z: -0.1, r: 1.25, col: 0x80ed99 }
        ];
        canopySpecs.forEach((cs) => {
          const crown = new THREE.Mesh(new THREE.DodecahedronGeometry(cs.r, 0), mat(cs.col, { roughness: 0.55 }));
          crown.position.set(cs.x, cs.y, cs.z);
          crown.castShadow = true;
          level3Props.add(crown);
        });

        // 掛在樹枝上的微光邏輯符號燈籠 (Glowing Logic Lanterns dangling from branches)
        const lanternsGroup = new THREE.Group();
        const lanternSpots = [
          { x: -1.45, y: 2.2, z: 0.65, col: 0x72efdd },
          { x: 1.45, y: 2.3, z: 0.55, col: 0xffd166 },
          { x: 0.35, y: 2.65, z: -1.25, col: 0x5fd18b },
          { x: -0.65, y: 2.85, z: 1.15, col: 0xff6fb5 }
        ];
        const lanternMeshes = [];
        lanternSpots.forEach((ls) => {
          const lanternHolder = new THREE.Group();
          lanternHolder.position.set(ls.x, ls.y, ls.z);

          // 吊繩
          const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.45, 4), darkMat);
          cord.position.y = 0.22;
          lanternHolder.add(cord);

          // 八面體微光燈籠主體
          const bulb = new THREE.Mesh(
            new THREE.OctahedronGeometry(0.18, 0),
            mat(ls.col, { emissive: ls.col, emissiveIntensity: 1.1, roughness: 0.15 })
          );
          lanternHolder.add(bulb);

          // 燈籠木框
          const rim = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.025, 4, 8), woodDarkMat);
          rim.rotation.x = Math.PI / 2;
          lanternHolder.add(rim);

          lanternsGroup.add(lanternHolder);
          lanternMeshes.push(lanternHolder);
        });
        level3Props.add(lanternsGroup);
        animRefs.codeLanterns = lanternMeshes;

        // 環繞神木懸浮的綠光邏輯結晶
        const orbitNodes = new THREE.Group();
        orbitNodes.position.y = 2.45;
        for (let k = 0; k < 4; k++) {
          const ka = (k / 4) * Math.PI * 2;
          const node = new THREE.Mesh(new THREE.OctahedronGeometry(0.26, 0), runeGlowMat);
          node.position.set(Math.cos(ka) * 1.8, (k % 2) * 0.35, Math.sin(ka) * 1.8);
          orbitNodes.add(node);
        }
        level3Props.add(orbitNodes);
        animRefs.codeSacredOrbit = orbitNodes;

        addCobblestonePath(level3Props, [
          [0, 1.45, 0.1, 1.2],
          [0.2, 1.75, 0.35, 1],
          [-0.15, 2.05, -0.2, 1.1]
        ]);
        break;
      }

      /* ----------------------------------------------------------
       * 5. 演算法山 (algo)：流程圖石階 -> 日晷觀測台 -> 思維巔峰神殿
       *    [微細節] 層階金字塔石磚階梯紋理、引導路標柱與分支分叉路徑、神殿柱廊與三角山牆
       * ---------------------------------------------------------- */
      case "algo": {
        // [Lv.1] 流程圖石階 + 引導路標柱
        const startStone = new THREE.Mesh(new THREE.CylinderGeometry(0.44, 0.5, 0.25, 10), mat(0xff8a65));
        startStone.position.set(-0.45, 0.12, 0.48);
        startStone.castShadow = true;
        level1Props.add(startStone);

        const procStone = new THREE.Mesh(new THREE.BoxGeometry(0.82, 0.48, 0.58), stoneGrayMat);
        procStone.position.set(0.05, 0.24, 0.05);
        procStone.castShadow = true;
        level1Props.add(procStone);

        const decStone = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.74, 0.72), goldMat);
        decStone.position.set(0.55, 0.38, -0.42);
        decStone.rotation.y = Math.PI / 4;
        decStone.castShadow = true;
        level1Props.add(decStone);

        const arrowMat = mat(0x4fb3ff, { emissive: 0x0077b6, emissiveIntensity: 0.65 });
        const arrow1 = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.32, 4), arrowMat);
        arrow1.position.set(-0.2, 0.42, 0.28);
        arrow1.rotation.z = -Math.PI / 3;
        arrow1.rotation.y = Math.PI / 4;
        level1Props.add(arrow1);

        // 引導路標柱 (Guidance Milestone Signpost)
        const signpostGroup = new THREE.Group();
        signpostGroup.position.set(0.75, 0, 0.45);
        const postPole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, 1.2, 6), woodDarkMat);
        postPole.position.y = 0.6;
        postPole.castShadow = true;
        signpostGroup.add(postPole);

        const signTrue = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.14, 0.05), mat(0x5fd18b));
        signTrue.position.set(0.18, 0.98, 0);
        signTrue.rotation.y = 0.35;
        signpostGroup.add(signTrue);

        const signFalse = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.14, 0.05), mat(0xff6b4a));
        signFalse.position.set(-0.18, 0.8, 0);
        signFalse.rotation.y = -0.35;
        signpostGroup.add(signFalse);
        level1Props.add(signpostGroup);

        // [Lv.2] 日晷觀測台 (Sundial Observatory) + 分支分叉石階小徑 + 刻度石磚
        const dialBase1 = new THREE.Mesh(new THREE.CylinderGeometry(1.22, 1.38, 0.28, 12), stoneDarkMat);
        dialBase1.position.y = 0.14;
        dialBase1.receiveShadow = true;
        level2Props.add(dialBase1);

        const dialFace = new THREE.Mesh(new THREE.CylinderGeometry(1.02, 1.1, 0.24, 12), mat(0xf4f1de, { roughness: 0.6 }));
        dialFace.position.y = 0.38;
        dialFace.receiveShadow = true;
        level2Props.add(dialFace);

        for (let h = 0; h < 12; h++) {
          const ha = (h / 12) * Math.PI * 2;
          const tick = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.24), stoneDarkMat);
          tick.position.set(Math.cos(ha) * 0.82, 0.51, Math.sin(ha) * 0.82);
          tick.rotation.y = -ha;
          level2Props.add(tick);
        }

        const gnomon = new THREE.Mesh(new THREE.ConeGeometry(0.28, 1.25, 3), goldMat);
        gnomon.position.set(0, 1.0, -0.1);
        gnomon.rotation.x = -0.38;
        gnomon.castShadow = true;
        level2Props.add(gnomon);

        // 分叉分支路徑 (Branching Split Cobblestone Paths)
        addCobblestonePath(level2Props, [
          [-0.35, 1.1, 0.2, 1],
          [-0.65, 1.38, 0.5, 0.9],   // 分支路徑 A (左分叉)
          [-0.95, 1.65, 0.3, 0.9],
          [0.35, 1.12, -0.2, 1],
          [0.65, 1.42, -0.4, 0.9],   // 分支路徑 B (右分叉)
          [0.92, 1.68, -0.3, 0.9]
        ]);

        // [Lv.3] 思維巔峰神殿 (Peak of Thought Temple) + 層階金字塔石磚階梯紋理 + 六石柱長廊 + 三角山牆
        // 多層階梯狀金字塔山形基座（帶有立體石磚台階刻痕）
        [
          { rT: 1.75, rB: 2.05, h: 0.68, y: 0.34, col: 0xd4a373 },
          { rT: 1.42, rB: 1.68, h: 0.68, y: 1.02, col: 0xe9c46a },
          { rT: 1.15, rB: 1.35, h: 0.58, y: 1.65, col: 0xffd166 }
        ].forEach((tier, tIdx) => {
          const stepMesh = new THREE.Mesh(
            new THREE.CylinderGeometry(tier.rT, tier.rB, tier.h, 7),
            mat(tier.col, { roughness: 0.65 })
          );
          stepMesh.position.y = tier.y;
          stepMesh.castShadow = true;
          stepMesh.receiveShadow = true;
          level3Props.add(stepMesh);

          // 正面石磚階梯紋理 (Ashlar Stone Stairs on front slope)
          const stairStep = new THREE.Mesh(
            new THREE.BoxGeometry(0.72 - tIdx * 0.12, 0.12, 0.35),
            mat(0xf8fafc, { roughness: 0.5 })
          );
          stairStep.position.set(0, tier.y + tier.h / 2, tier.rB * 0.85);
          stairStep.receiveShadow = true;
          level3Props.add(stairStep);
        });

        // 巔峰神殿地板、六根石柱與三角山牆雙層簷口
        const templeFloor = new THREE.Mesh(new THREE.BoxGeometry(1.85, 0.22, 1.55), whiteMat);
        templeFloor.position.y = 2.04;
        templeFloor.castShadow = true;
        level3Props.add(templeFloor);

        const colPositions = [
          [-0.72, 0.55], [0, 0.55], [0.72, 0.55],
          [-0.72, -0.55], [0, -0.55], [0.72, -0.55]
        ];
        colPositions.forEach(([cx, cz]) => {
          const colMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.13, 1.25, 7), whiteMat);
          colMesh.position.set(cx, 2.76, cz);
          colMesh.castShadow = true;
          level3Props.add(colMesh);
        });

        // 雙層簷口與三角山牆屋頂
        const templeArchitrave = new THREE.Mesh(new THREE.BoxGeometry(1.95, 0.14, 1.65), whiteMat);
        templeArchitrave.position.y = 3.44;
        templeArchitrave.castShadow = true;
        level3Props.add(templeArchitrave);

        const templeRoof = new THREE.Mesh(new THREE.ConeGeometry(1.42, 0.78, 4), goldMat);
        templeRoof.position.y = 3.88;
        templeRoof.rotation.y = Math.PI / 4;
        templeRoof.scale.set(1.15, 1, 0.94);
        templeRoof.castShadow = true;
        level3Props.add(templeRoof);

        const wisdomCore = new THREE.Mesh(
          new THREE.OctahedronGeometry(0.38, 0),
          mat(0xffe66d, { emissive: 0xffb703, emissiveIntensity: 1.0 })
        );
        wisdomCore.position.y = 2.76;
        level3Props.add(wisdomCore);
        animRefs.algoWisdomCore = wisdomCore;

        addCobblestonePath(level3Props, [
          [0, 1.45, 0.2, 1.2],
          [-0.3, 1.75, 0.45, 1],
          [0.25, 2.05, -0.1, 1.1]
        ]);
        break;
      }

      /* ----------------------------------------------------------
       * 6. 資料海灣 (data)：0與1木箱 -> 分揀貨櫃站 -> 水晶數據天文台
       *    [微細節] 水晶柱底座金屬基盤、二進位刻痕方塊、數據管道接口、雙層簷口、凸出窗框
       * ---------------------------------------------------------- */
      case "data": {
        // [Lv.1] 0與1木箱 (0 & 1 Wooden Crates) + 二進位刻痕 + 金屬包角
        const binaryGlowMat = mat(0x2ec4b6, { emissive: 0x00a896, emissiveIntensity: 0.85 });

        // 左箱：二進位刻痕 "0"
        const crate0 = new THREE.Mesh(new THREE.BoxGeometry(0.74, 0.74, 0.74), woodLightMat);
        crate0.position.set(-0.38, 0.37, 0.15);
        crate0.castShadow = true;
        level1Props.add(crate0);

        const zeroMesh = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.06, 6, 14), binaryGlowMat);
        zeroMesh.position.set(-0.38, 0.37, 0.54);
        level1Props.add(zeroMesh);

        // 右箱：二進位刻痕 "1"
        const crate1 = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.7, 0.7), woodDarkMat);
        crate1.position.set(0.42, 0.35, 0.05);
        crate1.castShadow = true;
        level1Props.add(crate1);

        const oneMesh = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.42, 0.07), binaryGlowMat);
        oneMesh.position.set(0.42, 0.35, 0.42);
        level1Props.add(oneMesh);

        // 頂部二進位小方塊
        const crateTop = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.58, 0.58), woodLightMat);
        crateTop.position.set(0.02, 1.02, -0.05);
        crateTop.rotation.y = 0.25;
        crateTop.castShadow = true;
        level1Props.add(crateTop);

        // [Lv.2] 分揀貨櫃站 (Sorting Container Station) + 數據管道接口 + 天車架 + 凸出操作窗
        const stationPad = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.18, 1.65), stoneDarkMat);
        stationPad.position.y = 0.09;
        stationPad.receiveShadow = true;
        level2Props.add(stationPad);

        const cont1 = new THREE.Mesh(new THREE.BoxGeometry(1.35, 0.68, 0.68), mat(0x2ec4b6));
        cont1.position.set(-0.1, 0.5, -0.22);
        cont1.castShadow = true;
        level2Props.add(cont1);

        const cont2 = new THREE.Mesh(new THREE.BoxGeometry(1.35, 0.68, 0.68), mat(0x4fb3ff));
        cont2.position.set(-0.1, 1.18, -0.22);
        cont2.castShadow = true;
        level2Props.add(cont2);

        const cont3 = new THREE.Mesh(new THREE.BoxGeometry(0.98, 0.6, 0.6), mat(0xffd166));
        cont3.position.set(0.18, 0.46, 0.45);
        cont3.castShadow = true;
        level2Props.add(cont3);

        // 數據管道接口 (High-pressure data pipe manifolds with flanges)
        [-0.45, 0.45].forEach((px) => {
          const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 1.35, 8), ironMat);
          pipe.rotation.z = Math.PI / 2;
          pipe.position.set(px, 0.3, -0.62);
          level2Props.add(pipe);

          // 圓形法蘭接口 (Flange Coupling)
          const flange = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.04, 8), goldMat);
          flange.rotation.z = Math.PI / 2;
          flange.position.set(px, 0.3, -0.62);
          level2Props.add(flange);
        });

        // 門式分揀天車架 (Gantry Crane)
        [-0.82, 0.76].forEach((gx) => {
          const craneLeg = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.95, 0.12), darkMat);
          craneLeg.position.set(gx, 1.05, 0.35);
          craneLeg.castShadow = true;
          level2Props.add(craneLeg);
        });
        const craneBeam = new THREE.Mesh(new THREE.BoxGeometry(1.85, 0.18, 0.18), goldMat);
        craneBeam.position.set(-0.03, 2.05, 0.35);
        craneBeam.castShadow = true;
        level2Props.add(craneBeam);

        addCobblestonePath(level2Props, [
          [0.45, 1.25, 0.1, 1],
          [0.2, 1.55, -0.3, 0.9],
          [-0.1, 1.85, 0.2, 1.1]
        ]);

        // [Lv.3] 水晶數據天文台 (Crystal Data Observatory) + 金屬基盤 + 數據管道接口 + 3根水晶柱
        const obsBase = new THREE.Mesh(new THREE.CylinderGeometry(1.28, 1.52, 1.22, 8), whiteMat);
        obsBase.position.y = 0.61;
        obsBase.castShadow = true;
        obsBase.receiveShadow = true;
        level3Props.add(obsBase);

        const obsDome = new THREE.Mesh(
          new THREE.IcosahedronGeometry(1.15, 1),
          mat(0x2ec4b6, { emissive: 0x0a9396, emissiveIntensity: 0.55, roughness: 0.2, transparent: true, opacity: 0.92 })
        );
        obsDome.position.y = 1.55;
        obsDome.castShadow = true;
        level3Props.add(obsDome);

        const scopeTube = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.3, 1.45, 8), darkMat);
        scopeTube.position.set(0, 2.18, 0.7);
        scopeTube.rotation.x = Math.PI / 3.2;
        scopeTube.castShadow = true;
        level3Props.add(scopeTube);

        const scopeLens = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.09, 8), mat(0x90e0ef, { emissive: 0x00b4d8, emissiveIntensity: 0.95 }));
        scopeLens.position.set(0, 2.58, 1.28);
        scopeLens.rotation.x = Math.PI / 3.2;
        level3Props.add(scopeLens);

        // 水晶柱底座金屬基盤 (Machined Metal Base Chassis)
        const chassisBase = new THREE.Mesh(new THREE.BoxGeometry(1.65, 0.14, 0.65), ironMat);
        chassisBase.position.set(-0.85, 0.07, -0.85);
        chassisBase.receiveShadow = true;
        level3Props.add(chassisBase);

        // 螺栓鉚釘 (Plinth Bolts)
        [[-1.4, -0.7], [-0.3, -0.7], [-1.4, -1.0], [-0.3, -1.0]].forEach(([bx, bz]) => {
          const bolt = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.08, 6), goldMat);
          bolt.position.set(bx, 0.15, bz);
          level3Props.add(bolt);
        });

        // 3 根長條圖水晶柱矗立於金屬基座上
        const barColors = [0x80ed99, 0x2ec4b6, 0x4fb3ff];
        [1.15, 1.85, 2.55].forEach((bh, bIdx) => {
          const bar = new THREE.Mesh(
            new THREE.BoxGeometry(0.42, bh, 0.42),
            mat(barColors[bIdx], { emissive: barColors[bIdx], emissiveIntensity: 0.38, roughness: 0.25 })
          );
          bar.position.set(-1.35 + bIdx * 0.48, bh / 2 + 0.14, -0.85);
          bar.castShadow = true;
          level3Props.add(bar);
        });

        // 數據管道接口連接
        const pipeConduit = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.25, 6), ironMat);
        pipeConduit.position.set(-0.35, 0.28, -0.45);
        pipeConduit.rotation.z = Math.PI / 3;
        level3Props.add(pipeConduit);

        const dataOrbit = new THREE.Mesh(new THREE.TorusGeometry(1.48, 0.05, 6, 24), mat(0x72efdd, { emissive: 0x2ec4b6, emissiveIntensity: 0.88 }));
        dataOrbit.position.y = 1.75;
        dataOrbit.rotation.x = Math.PI / 2.3;
        level3Props.add(dataOrbit);
        animRefs.dataOrbitRing = dataOrbit;

        addCobblestonePath(level3Props, [
          [0, 1.45, 0.2, 1.2],
          [0.25, 1.75, 0.4, 1],
          [-0.2, 2.05, -0.1, 1.1]
        ]);
        break;
      }

      /* ----------------------------------------------------------
       * 7. AI 智慧島 (ai)：休眠小機器人 -> 數據訓練塔 -> 懸浮 AI 核心球
       *    [微細節] 懸空光核外的多軸旋轉軌道環 (3軸旋轉陀螺環)、基座神經光纖發光紋路、散熱格柵
       * ---------------------------------------------------------- */
      case "ai":
      default: {
        // [Lv.1] 休眠小機器人 + 散熱格柵 + 胸前心跳 LED
        const botGroup = new THREE.Group();
        const botTorso = new THREE.Mesh(new THREE.BoxGeometry(0.78, 0.68, 0.68), whiteMat);
        botTorso.position.y = 0.36;
        botTorso.castShadow = true;
        botGroup.add(botTorso);

        // 胸前脈動 LED 指示燈
        const heartLed = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 8), mat(0xff6fb5, { emissive: 0xff007f, emissiveIntensity: 1.2 }));
        heartLed.position.set(0, 0.42, 0.36);
        botGroup.add(heartLed);

        // 軀幹散熱格柵
        for (let g = 0; g < 3; g++) {
          const louver = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.025, 0.02), darkMat);
          louver.position.set(0, 0.22 + g * 0.06, 0.35);
          botGroup.add(louver);
        }

        const botHead = new THREE.Group();
        botHead.position.set(0, 0.96, 0.06);
        botHead.rotation.x = 0.26;
        botHead.rotation.z = -0.12;

        const headBox = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.72, 0.72), whiteMat);
        headBox.castShadow = true;
        botHead.add(headBox);

        const visorDark = new THREE.Mesh(new THREE.BoxGeometry(0.74, 0.34, 0.08), darkMat);
        visorDark.position.set(0, 0, 0.35);
        botHead.add(visorDark);

        // 閉眼休眠橫線
        [-0.18, 0.18].forEach((ex) => {
          const sleepEye = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.045, 0.04), mat(0xff6fb5, { emissive: 0xff4d6d, emissiveIntensity: 0.6 }));
          sleepEye.position.set(ex, 0, 0.39);
          botHead.add(sleepEye);
        });

        const antenna = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.38, 6), darkMat);
        antenna.position.set(0, 0.5, 0);
        antenna.rotation.z = -0.35;
        botHead.add(antenna);

        botGroup.add(botHead);

        [-0.24, 0.24].forEach((fx) => {
          const foot = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.2, 0.45), darkMat);
          foot.position.set(fx, 0.12, 0.38);
          botGroup.add(foot);
        });
        level1Props.add(botGroup);

        // [Lv.2] 數據訓練塔 (Data Training Tower) + 凸出觀測窗 + 3層發光數據環
        const trainBase = new THREE.Mesh(new THREE.CylinderGeometry(0.88, 1.08, 0.3, 6), darkMat);
        trainBase.position.y = 0.15;
        level2Props.add(trainBase);

        const trainShaft = new THREE.Mesh(new THREE.CylinderGeometry(0.44, 0.75, 2.35, 6), mat(0x2b2d42, { roughness: 0.35, metalness: 0.3 }));
        trainShaft.position.y = 1.42;
        trainShaft.castShadow = true;
        level2Props.add(trainShaft);

        // 凸出立體觀測窗 (Training Tower Observer Window)
        addFramedWindow(level2Props, 0, 1.65, 0.48, 0.38, 0.38, 0xff6fb5);

        // 三層發光神經網路數據環
        [0.8, 1.42, 2.05].forEach((ry, rIdx) => {
          const ringCol = rIdx % 2 === 0 ? 0xff6fb5 : 0x4cc9f0;
          const nRing = new THREE.Mesh(
            new THREE.TorusGeometry(0.7 - rIdx * 0.08, 0.065, 6, 18),
            mat(ringCol, { emissive: ringCol, emissiveIntensity: 0.85 })
          );
          nRing.rotation.x = Math.PI / 2;
          nRing.position.y = ry;
          level2Props.add(nRing);
        });

        const trainTop = new THREE.Mesh(new THREE.OctahedronGeometry(0.35, 0), mat(0xff6fb5, { emissive: 0xf72585, emissiveIntensity: 0.95 }));
        trainTop.position.y = 2.85;
        level2Props.add(trainTop);

        addCobblestonePath(level2Props, [
          [0.45, 1.25, 0.1, 1],
          [0.15, 1.55, 0.4, 0.9],
          [-0.1, 1.85, -0.2, 1.1]
        ]);

        // [Lv.3] 懸浮 AI 核心球 (Floating AI Core Sphere) + 多軸旋轉軌道環 (3軸旋轉陀螺儀) + 基座神經光纖發光紋路
        const corePedestal = new THREE.Mesh(new THREE.CylinderGeometry(1.35, 1.62, 0.52, 8), darkMat);
        corePedestal.position.y = 0.26;
        corePedestal.castShadow = true;
        corePedestal.receiveShadow = true;
        level3Props.add(corePedestal);

        // 基座神經光纖發光紋路 (Neural Fiber Optic Glowing Circuit Traces on Pedestal)
        const neuralCircuitGroup = new THREE.Group();
        neuralCircuitGroup.position.y = 0.53;
        for (let b = 0; b < 8; b++) {
          const ba = (b / 8) * Math.PI * 2;
          const traceLength = 0.95 + (b % 2) * 0.35;
          const circuitMat = mat(b % 2 === 0 ? 0xff6fb5 : 0x00f0ff, {
            emissive: b % 2 === 0 ? 0xff007f : 0x00b4d8,
            emissiveIntensity: 1.0
          });
          const trace = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.02, traceLength), circuitMat);
          trace.position.set(Math.cos(ba) * traceLength * 0.55, 0, Math.sin(ba) * traceLength * 0.55);
          trace.rotation.y = -ba;
          neuralCircuitGroup.add(trace);

          // 終端突觸節點 (Synapse Nodes)
          const node = new THREE.Mesh(new THREE.SphereGeometry(0.045, 6, 6), circuitMat);
          node.position.set(Math.cos(ba) * traceLength, 0.02, Math.sin(ba) * traceLength);
          neuralCircuitGroup.add(node);
        }
        level3Props.add(neuralCircuitGroup);

        const pedGlowRing = new THREE.Mesh(
          new THREE.TorusGeometry(1.22, 0.065, 6, 24),
          mat(0xff6fb5, { emissive: 0xf72585, emissiveIntensity: 0.88 })
        );
        pedGlowRing.rotation.x = Math.PI / 2;
        pedGlowRing.position.y = 0.54;
        level3Props.add(pedGlowRing);

        // 懸浮 AI 核心球主體與多軸旋轉軌道環 (Multi-axis Gyroscope Orbital Rings on Pitch, Roll, Yaw)
        const aiCoreFloatingGroup = new THREE.Group();
        aiCoreFloatingGroup.position.y = 2.45;

        const aiSphere = new THREE.Mesh(
          new THREE.IcosahedronGeometry(0.82, 1),
          mat(0xff6fb5, { emissive: 0xd90429, emissiveIntensity: 0.85, roughness: 0.2, metalness: 0.25 })
        );
        aiSphere.castShadow = true;
        aiCoreFloatingGroup.add(aiSphere);

        // 軌道環 1 (Pitch 軸)
        const gyroRing1 = new THREE.Mesh(
          new THREE.TorusGeometry(1.22, 0.055, 6, 28),
          mat(0x4cc9f0, { emissive: 0x0096c7, emissiveIntensity: 0.9 })
        );
        gyroRing1.rotation.x = Math.PI / 3;
        aiCoreFloatingGroup.add(gyroRing1);

        // 軌道環 2 (Roll 軸)
        const gyroRing2 = new THREE.Mesh(
          new THREE.TorusGeometry(1.42, 0.048, 6, 28),
          goldMat
        );
        gyroRing2.rotation.y = Math.PI / 3;
        aiCoreFloatingGroup.add(gyroRing2);

        // 軌道環 3 (Yaw 軸第三軸獨立旋轉環)
        const gyroRing3 = new THREE.Mesh(
          new THREE.TorusGeometry(1.62, 0.042, 6, 28),
          mat(0x72efdd, { emissive: 0x2ec4b6, emissiveIntensity: 0.85 })
        );
        gyroRing3.rotation.z = Math.PI / 4;
        aiCoreFloatingGroup.add(gyroRing3);

        level3Props.add(aiCoreFloatingGroup);
        animRefs.aiCoreGroup = aiCoreFloatingGroup;
        animRefs.aiGyro1 = gyroRing1;
        animRefs.aiGyro2 = gyroRing2;
        animRefs.aiGyro3 = gyroRing3;

        addCobblestonePath(level3Props, [
          [0, 1.45, 0.2, 1.2],
          [0.2, 1.75, 0.45, 1],
          [-0.25, 2.05, -0.15, 1.1]
        ]);
        break;
      }
    }

    // 預設 Lv.0：三個階段群組皆隱藏，由 updateIslandsProgress() 依進度動態切換
    level1Props.visible = false;
    level2Props.visible = false;
    level3Props.visible = false;

    return { level1Props, level2Props, level3Props, animRefs };
  }

  /* ============================================================
   * 3. 島嶼佈局：環狀排列 7 座 Low-poly 圓角幾何小島 + 海島碼頭與點光源
   * ============================================================ */
  /* ============================================================
   * 【七島三階段建築群】createIslandStageSystem(islandId)
   * 座標皆為「島嶼局部座標」（原點=島嶼中心，Y 0 = 草皮頂面，實際加上 STAGE_BASE_Y）
   *   Stage 1  s1    : (0, 0, -3.5)          核心主建築（中央偏後）
   *   Stage 2  wingL : (-6, 0, +1)           左翼（高度 < 主建築）
   *            wingR : (+6, 0, +1)           右翼
   *   Stage 3  crown : (0, H1+4.4+R, -3.5)   主建築正上方高空冠冕（≥ +4 淨空）
   *            yard  : (0, 0, +6)            前庭低矮景觀（高度 ≤ 1.5）
   * ============================================================ */
  const STAGE_BASE_Y = 3.04;
  function createIslandStageSystem(islandId) {
    const M = stageMat;
    const grp = (parent, x = 0, y = 0, z = 0) => {
      const g = new THREE.Group();
      g.position.set(x, y, z);
      if (parent) parent.add(g);
      return g;
    };
    const put = (parent, geo, mat, x, y, z) => {
      const m = new THREE.Mesh(geo, mat);
      m.position.set(x, y, z);
      m.castShadow = true;
      parent.add(m);
      return m;
    };
    const bx = (p, w, h, d, m, x, y, z) => put(p, new THREE.BoxGeometry(w, h, d), m, x, y, z);
    const cy = (p, rt, rb, h, m, x, y, z, seg = 14) => put(p, new THREE.CylinderGeometry(rt, rb, h, seg), m, x, y, z);
    const sp = (p, r, m, x, y, z, seg = 14) => put(p, new THREE.SphereGeometry(r, seg, Math.max(6, seg - 4)), m, x, y, z);
    const to = (p, R, t, m, x, y, z, arc = Math.PI * 2, seg = 28) => put(p, new THREE.TorusGeometry(R, t, 8, seg, arc), m, x, y, z);
    const co = (p, r, h, m, x, y, z, seg = 12) => put(p, new THREE.ConeGeometry(r, h, seg), m, x, y, z);
    const palette = [M.red, M.orange, M.yellow, M.green, M.blue, M.purple];
    const upd = [];

    const s1 = grp(null, 0, 0, -3.5);
    const wingL = grp(null, -6, 0, 1);
    const wingR = grp(null, 6, 0, 1);
    const crown = grp(null, 0, 8, -3.5);
    const yard = grp(null, 0, 0, 6);

    const makeGear = (p, r, teeth, thick, m, x, y, z, phase = 0) => {
      const g = grp(p, x, y, z);
      const body = cy(g, r, r, thick, m, 0, 0, 0, 20);
      body.rotation.x = Math.PI / 2;
      for (let i = 0; i < teeth; i++) {
        const a = phase + (i / teeth) * Math.PI * 2;
        const t = bx(g, 0.16, 0.2, thick, m, Math.cos(a) * (r + 0.07), Math.sin(a) * (r + 0.07), 0);
        t.rotation.z = a;
      }
      return g;
    };
    const makeWheel = (p, R, paddles, rimMat, padMat, width) => {
      const g = grp(p, 0, 0, 0);
      to(g, R, 0.06, rimMat, 0, 0, 0);
      for (let i = 0; i < paddles; i++) {
        const a = (i / paddles) * Math.PI * 2;
        const sp1 = bx(g, R * 2, 0.05, 0.05, rimMat, 0, 0, 0);
        sp1.rotation.z = a;
        const pd = bx(g, 0.1, 0.28, width, padMat, Math.cos(a) * R, Math.sin(a) * R, 0);
        pd.rotation.z = a;
      }
      return g;
    };

    switch (islandId) {
      /* ================= 電腦探險島 ================= */
      case "sys": {
        // Stage 1：透明機殼主機大樓 + 正面發光螢幕 (高 2.96)
        bx(s1, 2.6, 0.2, 2.0, M.metalDark, 0, 0.1, 0);
        bx(s1, 2.4, 2.6, 1.8, M.glass, 0, 1.5, 0);
        [[-1.2, -0.9], [1.2, -0.9], [-1.2, 0.9], [1.2, 0.9]].forEach(([x, z]) => bx(s1, 0.12, 2.7, 0.12, M.metalDark, x, 1.5, z));
        bx(s1, 2.6, 0.16, 2.0, M.metalLight, 0, 2.88, 0);
        bx(s1, 2.0, 2.0, 0.08, M.pcb, 0, 1.5, -0.75);
        [-0.6, -0.25, 0.1].forEach((x) => bx(s1, 0.12, 0.8, 0.28, M.ramGreen, x, 2.05, -0.58));
        bx(s1, 0.9, 0.5, 0.35, M.chip, 0.65, 1.1, -0.55);
        const gpuFan = cy(s1, 0.28, 0.28, 0.06, M.coolBlue, 0.65, 1.1, -0.36, 10);
        gpuFan.rotation.x = Math.PI / 2;
        bx(s1, 2.05, 1.25, 0.05, M.metalDark, 0, 1.65, 0.91);
        bx(s1, 1.9, 1.1, 0.05, M.screen, 0, 1.65, 0.95);
        bx(s1, 0.2, 0.08, 0.06, M.green, 0.8, 0.9, 0.95);
        // Stage 2 左：雙風扇水冷散熱塔 (高 2.4)
        bx(wingL, 1.7, 0.2, 1.2, M.metalDark, 0, 0.1, 0);
        bx(wingL, 1.5, 2.0, 0.6, M.metalLight, 0, 1.2, -0.1);
        const fans = [0.85, 1.7].map((y) => {
          const g = grp(wingL, 0, y, 0.25);
          to(g, 0.4, 0.05, M.metalDark, 0, 0, 0);
          for (let i = 0; i < 4; i++) { const b = bx(g, 0.5, 0.12, 0.03, M.coolBlue, 0, 0, 0); b.rotation.z = (i * Math.PI) / 4; }
          return g;
        });
        cy(wingL, 0.07, 0.07, 1.2, M.cyanGlow, -0.55, 2.55 - 0.5, -0.1, 8);
        cy(wingL, 0.07, 0.07, 1.2, M.cyanGlow, 0.55, 2.55 - 0.5, -0.1, 8);
        upd.push((t) => fans.forEach((f, i) => { f.rotation.z = t * (i ? -5 : 5); }));
        // Stage 2 右：記憶體金手指排陣立柱 (高 2.2)
        bx(wingR, 2.0, 0.2, 1.0, M.metalDark, 0, 0.1, 0);
        [-0.7, -0.23, 0.23, 0.7].forEach((x, i) => {
          bx(wingR, 0.3, 2.0, 0.1, M.ramGreen, x, 1.2, 0);
          [0.35, 0.8, 1.25].forEach((y) => bx(wingR, 0.2, 0.28, 0.14, M.chip, x, y + 0.5, 0.01));
          bx(wingR, 0.26, 0.16, 0.12, M.gold, x, 0.28, 0.01);
        });
        // Stage 3 高空：黃金 CPU 晶片光環 (R≈0.9)
        crown.position.y = 2.96 + 4.4 + 0.8;
        const cpu = grp(crown);
        bx(cpu, 1.4, 0.14, 1.4, M.gold, 0, 0, 0);
        bx(cpu, 0.8, 0.18, 0.8, M.chip, 0, 0.02, 0);
        for (let i = -3; i <= 3; i++) [[-0.75, 0], [0.75, 0], [0, -0.75], [0, 0.75]].forEach(([x, z]) => {
          const px = z === 0 ? x : i * 0.18, pz = z === 0 ? i * 0.18 : z;
          bx(cpu, x ? 0.12 : 0.05, 0.05, x ? 0.05 : 0.12, M.metalLight, px, -0.05, pz);
        });
        const cpuRing = to(cpu, 1.15, 0.07, M.gold, 0, 0, 0);
        cpuRing.rotation.x = Math.PI / 2;
        upd.push((t) => { cpu.rotation.y = t * 0.9; cpu.position.y = Math.sin(t * 1.6) * 0.12; });
        // Stage 3 前庭：藍光電路板圖騰步道 (高 ≤0.12)
        bx(yard, 3.2, 0.06, 2.6, M.pcb, 0, 0.03, 0);
        [[-1.0, 0.6, 1.2, 0.07], [0, -0.2, 2.4, 0.07], [0.8, 0.5, 0.07, 1.0], [-0.5, -0.8, 0.07, 0.8]].forEach(([x, z, w, d]) => bx(yard, w, 0.04, d, M.pcbTrace, x, 0.08, z));
        [[-1.6 + 0.3, 0.6], [1.0, 1.0], [1.2, -0.2], [-0.5, -1.2]].forEach(([x, z]) => cy(yard, 0.13, 0.13, 0.05, M.gold, x, 0.1, z, 8));
        break;
      }
      /* ================= 數位公民島 ================= */
      case "citizen": {
        // Stage 1：藍白聖盾守護主堡 (高 3.2)
        bx(s1, 3.0, 0.3, 2.2, M.shieldWhite, 0, 0.15, 0);
        bx(s1, 2.6, 1.7, 1.8, M.shieldBlue, 0, 1.15, 0);
        [-1.35, 1.35].forEach((x) => {
          cy(s1, 0.38, 0.42, 2.3, M.shieldWhite, x, 1.45, -0.55, 10);
          co(s1, 0.5, 0.6, M.shieldBlue, x, 2.9, -0.55, 10);
          // 塔樓暖黃窗光
          bx(s1, 0.24, 0.38, 0.08, windowWarmGlowMat, x, 1.75, -0.15);
        });
        // 主堡正面與側面暖黃燈窗
        [-0.86, 0.86].forEach((x) => bx(s1, 0.36, 0.44, 0.06, windowWarmGlowMat, x, 1.25, 0.91));
        [-1.31, 1.31].forEach((x) => bx(s1, 0.06, 0.44, 0.44, windowWarmGlowMat, x, 1.25, 0.15));
        [-0.9, -0.3, 0.3, 0.9].forEach((x) => bx(s1, 0.3, 0.3, 0.3, M.shieldWhite, x, 2.15, 0.75));
        const sh = new THREE.Shape();
        sh.moveTo(0, 0.55); sh.lineTo(0.42, 0.4); sh.lineTo(0.42, -0.05);
        sh.quadraticCurveTo(0.35, -0.4, 0, -0.6); sh.quadraticCurveTo(-0.35, -0.4, -0.42, -0.05);
        sh.lineTo(-0.42, 0.4); sh.lineTo(0, 0.55);
        const shGeo = new THREE.ExtrudeGeometry(sh, { depth: 0.12, bevelEnabled: false, curveSegments: 5 });
        const shOuter = put(s1, shGeo, M.shieldWhite, 0, 1.25, 0.92); shOuter.scale.set(1.5, 1.5, 1);
        const shInner = put(s1, shGeo, M.shieldBlue, 0, 1.25, 0.96); shInner.scale.set(1.1, 1.1, 1);
        sp(s1, 0.12, M.gold, 0, 1.3, 1.12); bx(s1, 0.07, 0.3, 0.05, M.gold, 0, 1.12, 1.12);
        // Stage 2 左：防火牆光柵哨塔 (高 2.5)
        bx(wingL, 1.8, 0.2, 1.0, M.shieldWhite, 0, 0.1, 0);
        [-0.8, 0.8].forEach((x) => bx(wingL, 0.14, 2.1, 0.14, M.metalDark, x, 1.25, 0));
        for (let i = 0; i < 6; i++) bx(wingL, 1.5, 0.1, 0.1, M.fireRed, 0, 0.5 + i * 0.3, 0);
        [-0.4, 0, 0.4].forEach((x) => bx(wingL, 0.05, 1.6, 0.06, M.metalDark, x, 1.3, 0.04));
        co(wingL, 1.0, 0.4, M.gold, 0, 2.5, 0, 4).rotation.y = Math.PI / 4;
        // Stage 2 右：智慧著作權天秤雕像台 (高 2.4)
        bx(wingR, 1.9, 0.3, 1.1, M.shieldWhite, 0, 0.15, 0);
        cy(wingR, 0.1, 0.14, 1.8, M.metalLight, 0, 1.2, 0, 10);
        const beam = grp(wingR, 0, 2.15, 0);
        bx(beam, 1.6, 0.07, 0.09, M.gold, 0, 0, 0);
        sp(beam, 0.12, M.gold, 0, 0.05, 0);
        [-0.75, 0.75].forEach((x, i) => {
          const pg = grp(beam, x, 0, 0);
          pg.userData.side = i;
          cy(pg, 0.01, 0.01, 0.7, M.metalLight, 0, -0.35, 0, 4);
          cy(pg, 0.3, 0.22, 0.06, M.gold, 0, -0.72, 0, 14);
          if (i === 0) cy(pg, 0.12, 0.12, 0.04, M.yellow, 0, -0.66, 0, 12);
        });
        upd.push((t) => { beam.rotation.z = Math.sin(t * 1.3) * 0.12; beam.children.forEach((c) => { if (c.userData.side !== undefined) c.rotation.z = -beam.rotation.z; }); });
        // Stage 3 高空：旋轉資安防護光網
        crown.position.y = 3.2 + 4.4 + 1.2;
        const web = grp(crown);
        put(web, new THREE.IcosahedronGeometry(1.2, 1), M.holo, 0, 0, 0);
        sp(web, 0.3, M.cyanGlow, 0, 0, 0, 12);
        const webRing = to(web, 1.5, 0.04, M.shieldBlue, 0, 0, 0); webRing.rotation.x = Math.PI / 2;
        upd.push((t) => { web.rotation.y = t * 0.8; web.rotation.x = Math.sin(t * 0.5) * 0.3; });
        // Stage 3 前庭：黃金密碼鎖地標石台 (高 1.2)
        cy(yard, 1.4, 1.5, 0.3, stoneGrayMat, 0, 0.15, 0, 18);
        const lkRing = to(yard, 1.35, 0.04, M.gold, 0, 0.32, 0); lkRing.rotation.x = Math.PI / 2;
        bx(yard, 0.85, 0.55, 0.38, M.gold, 0, 0.6, 0);
        to(yard, 0.26, 0.07, M.gold, 0, 0.88, 0, Math.PI, 14);
        bx(yard, 0.08, 0.2, 0.05, M.chip, 0, 0.62, 0.2);
        break;
      }
      /* ================= 創作協作島 ================= */
      case "create": {
        // Stage 1：巨型單眼相機工坊 (高 2.5)
        bx(s1, 2.9, 1.6, 1.4, M.camBody, 0, 1.0, 0);
        bx(s1, 2.9, 0.16, 1.44, M.metalLight, 0, 1.88, 0);
        bx(s1, 1.0, 0.55, 0.9, M.camBody, 0, 2.23, -0.05);
        bx(s1, 0.5, 0.14, 0.4, M.metalLight, 0.9, 2.03, 0);
        bx(s1, 0.5, 1.4, 0.1, M.red, -1.1, 1.0, 0.72);
        // 工作室側窗與背面觀景窗暖光
        [-1.46, 1.46].forEach((x) => bx(s1, 0.06, 0.52, 0.56, windowWarmGlowMat, x, 1.05, 0));
        bx(s1, 1.1, 0.62, 0.06, windowWarmGlowMat, 0, 1.05, -0.71);
        cy(s1, 0.14, 0.14, 0.12, M.red, 1.0, 2.0, 0.2, 10);
        const lens = cy(s1, 0.78, 0.78, 1.0, M.metalDark, 0.1, 1.1, 1.1, 20); lens.rotation.x = Math.PI / 2;
        const lensRing = to(s1, 0.66, 0.06, M.yellow, 0.1, 1.1, 1.6); 
        const lensGlass = cy(s1, 0.55, 0.55, 0.06, M.lensGlass, 0.1, 1.1, 1.62, 18); lensGlass.rotation.x = Math.PI / 2;
        sp(s1, 0.12, M.white, -0.2, 1.3, 1.68, 8);
        // Stage 2 左：巨型手繪板斜台 (高 1.7)
        [-0.7, 0.7].forEach((x) => cy(wingL, 0.07, 0.07, 1.0, M.metalDark, x, 0.5, -0.45, 8));
        const tab = grp(wingL, 0, 1.0, 0); tab.rotation.x = 0.5;
        bx(tab, 2.0, 0.1, 1.4, M.camBody, 0, 0, 0);
        bx(tab, 1.8, 0.04, 1.2, M.white, 0, 0.06, 0);
        [[-0.5, 0.2, 0.6, M.red], [0.1, -0.2, 0.8, M.blue], [0.5, 0.3, 0.5, M.green], [-0.2, 0.45, 0.7, M.purple]].forEach(([x, z, w, m]) => bx(tab, w, 0.03, 0.09, m, x, 0.09, z));
        const stylus = cy(tab, 0.04, 0.04, 1.0, M.purple, 0.6, 0.15, -0.1, 8); stylus.rotation.z = Math.PI / 2; stylus.rotation.y = 0.5;
        // Stage 2 右：雙色立體咬合齒輪塔 (高 2.4)
        bx(wingR, 1.6, 0.2, 1.0, M.metalDark, 0, 0.1, 0);
        cy(wingR, 0.1, 0.1, 2.0, M.metalLight, 0, 1.2, -0.35, 8);
        const gA = makeGear(wingR, 0.45, 10, 0.3, M.orange, 0, 0.7, 0.0, 0);
        const gB = makeGear(wingR, 0.45, 10, 0.3, M.blue, 0, 1.65, 0.0, Math.PI / 10);
        upd.push((t) => { gA.rotation.z = t * 0.8; gB.rotation.z = -t * 0.8; });
        // Stage 3 高空：旋轉彩色全息膠卷環
        crown.position.y = 2.5 + 4.4 + 1.0;
        const film = grp(crown);
        for (let i = 0; i < 16; i++) {
          const a = (i / 16) * Math.PI * 2;
          const fr = bx(film, 0.36, 0.5, 0.05, palette[i % palette.length], Math.cos(a) * 1.25, 0, Math.sin(a) * 1.25);
          fr.rotation.y = -a + Math.PI / 2;
        }
        [0.3, -0.3].forEach((y) => { const r = to(film, 1.25, 0.03, M.metalLight, 0, y, 0); r.rotation.x = Math.PI / 2; });
        upd.push((t) => { film.rotation.y = t * 0.7; film.position.y = Math.sin(t * 1.4) * 0.1; });
        // Stage 3 前庭：彩色調色盤噴泉池 (高 ≤0.9)
        cy(yard, 1.55, 1.65, 0.35, stoneGrayMat, 0, 0.175, 0, 20);
        cy(yard, 1.4, 1.4, 0.05, M.water, 0, 0.34, 0, 20);
        for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; sp(yard, 0.22, palette[i], Math.cos(a) * 1.1, 0.42, Math.sin(a) * 1.1, 10); }
        const jets = [0, 1, 2].map((i) => { const j = cy(yard, 0.04, 0.09, 0.6, M.water, (i - 1) * 0.3, 0.6, 0, 8); return j; });
        upd.push((t) => jets.forEach((j, i) => { const s = 0.7 + Math.abs(Math.sin(t * 2.4 + i)) * 0.7; j.scale.y = s; j.position.y = 0.34 + 0.3 * s; }));
        break;
      }
      /* ================= 程式森林島 ================= */
      case "code": {
        // Stage 1：巨型掀蓋筆電木屋 (螢幕朝前發光，高 2.7)
        bx(s1, 3.0, 0.35, 2.2, woodLightMat, 0, 0.18, 0.1);
        bx(s1, 2.6, 0.06, 1.1, M.metalDark, 0, 0.38, 0.5);
        for (let r = 0; r < 3; r++) for (let c = 0; c < 8; c++) bx(s1, 0.24, 0.05, 0.24, M.metalLight, -0.95 + c * 0.27, 0.43, 0.2 + r * 0.3);
        bx(s1, 0.8, 0.04, 0.3, M.metalLight, 0, 0.4, 0.98);
        [-1.0, 0, 1.0].forEach((x) => bx(s1, 0.4, 0.22, 0.04, windowWarmGlowMat, x, 0.18, 1.22));
        const lid = grp(s1, 0, 0.35, -0.9); lid.rotation.x = -0.15;
        bx(lid, 3.0, 2.3, 0.16, woodDarkMat, 0, 1.15, 0);
        bx(lid, 2.7, 1.95, 0.04, M.woodScreen, 0, 1.15, 0.09);
        [[0.8, 0.5], [1.4, 1.1], [0.5, 1.5], [1.9, 1.5], [1.1, 1.9], [0.7, 2.3]].forEach(([w, y], i) => bx(lid, w, 0.07, 0.03, M.codeGreen, -1.0 + w / 2 + (i % 3) * 0.25, 0.4 + (i * 0.28), 0.12));
        co(s1, 0.28, 0.35, roofTileGreenMat, 1.2, 2.9, -0.9, 6);
        // Stage 2 左：If-Else 分支雙向木拱門 (高 2.2)
        bx(wingL, 2.0, 0.15, 1.0, woodPlankMat, 0, 0.08, 0);
        [-0.55, 0.55].forEach((x, i) => {
          to(wingL, 0.42, 0.09, woodDarkMat, x, 1.05, 0, Math.PI, 16);
          [-0.42, 0.42].forEach((dx) => cy(wingL, 0.09, 0.09, 1.05, woodDarkMat, x + dx, 0.675, 0, 8));
          bx(wingL, 0.75, 1.0, 0.04, i ? M.red : M.green, x, 0.7, 0);
        });
        cy(wingL, 0.05, 0.05, 0.6, woodLogMat, 0, 1.9, 0, 6);
        co(wingL, 0.12, 0.3, M.green, -0.3, 2.15, 0, 4).rotation.z = 0.7;
        co(wingL, 0.12, 0.3, M.red, 0.3, 2.15, 0, 4).rotation.z = -0.7;
        // Stage 2 右：Loop 迴圈旋轉水車 (高 2.25)
        bx(wingR, 2.0, 0.25, 1.1, M.blue, 0, 0.12, 0);
        [-0.45, 0.45].forEach((z) => bx(wingR, 0.15, 1.3, 0.15, woodLogMat, 0, 0.8, z));
        const wheel = makeWheel(wingR, 0.85, 8, woodDarkMat, woodPlankMat, 0.6); wheel.position.set(0, 1.2, 0);
        upd.push((t) => { wheel.rotation.z = -t * 0.9; });
        // Stage 3 高空：發光二進位王冠光環
        crown.position.y = 2.9 + 4.4 + 1.0;
        const bcrown = grp(crown);
        const bring = to(bcrown, 1.1, 0.1, M.gold, 0, 0, 0); bring.rotation.x = Math.PI / 2;
        for (let i = 0; i < 8; i++) {
          const a = (i / 8) * Math.PI * 2;
          co(bcrown, 0.12, 0.5, M.gold, Math.cos(a) * 1.1, 0.3, Math.sin(a) * 1.1, 6);
          bx(bcrown, 0.32, 0.32, 0.32, i % 2 ? M.bin1 : M.bin0, Math.cos(a) * 1.1, 0.7, Math.sin(a) * 1.1);
        }
        upd.push((t) => { bcrown.rotation.y = t * 0.8; bcrown.position.y = Math.sin(t * 1.5) * 0.1; });
        // Stage 3 前庭：彩色積木拼圖花圃 (高 ≤0.55)
        bx(yard, 3.0, 0.15, 2.0, M.leaf, 0, 0.08, 0);
        [[-1.0, -0.5], [-0.4, -0.5], [0.2, -0.5], [0.8, -0.5], [-0.7, 0.1], [-0.1, 0.1], [0.5, 0.1], [1.1, 0.1], [-0.4, 0.65], [0.3, 0.65]].forEach(([x, z], i) => {
          bx(yard, 0.52, 0.3, 0.52, palette[i % palette.length], x, 0.3, z);
          [[-0.12, -0.12], [0.12, -0.12], [-0.12, 0.12], [0.12, 0.12]].forEach(([dx, dz]) => cy(yard, 0.07, 0.07, 0.08, palette[i % palette.length], x + dx, 0.49, z + dz, 8));
        });
        break;
      }
      /* ================= 演算法山 ================= */
      case "algo": {
        // Stage 1：階梯式流程圖神殿 (高 3.1)
        [[3.2, 2.4, 0.5, 0], [2.5, 1.9, 0.5, 0.5], [1.8, 1.4, 0.5, 1.0]].forEach(([w, d, h, y], i) => {
          bx(s1, w, h, d, M.templeStone, 0, y + h / 2, -i * 0.05);
          bx(s1, w + 0.08, 0.06, d + 0.08, M.gold, 0, y + h, -i * 0.05);
        });
        bx(s1, 0.5, 0.5, 0.06, M.cyanGlow, 0, 0.28, 1.22).rotation.z = Math.PI / 4;
        [-1.0, 1.0].forEach((x) => bx(s1, 0.5, 0.3, 0.06, M.orange, x, 0.28, 1.22));
        bx(s1, 0.4, 0.06, 0.06, M.gold, -0.5, 0.28, 1.22); bx(s1, 0.4, 0.06, 0.06, M.gold, 0.5, 0.28, 1.22);
        bx(s1, 0.6, 0.5, 0.06, M.cyanGlow, 0, 0.78, 0.92).rotation.z = Math.PI / 4;
        [-0.65, 0.65].forEach((x) => bx(s1, 0.4, 0.28, 0.06, M.orange, x, 0.78, 0.92));
        [-0.6, 0.6].forEach((x) => [-0.4, 0.4].forEach((z) => cy(s1, 0.1, 0.1, 0.9, M.templeStone, x, 1.95, z - 0.1, 10)));
        // 古閣殿內暖黃窗光與觀測台圓頂星光縫隙
        bx(s1, 0.72, 0.58, 0.48, windowWarmGlowMat, 0, 1.9, -0.1);
        bx(s1, 1.9, 0.18, 1.5, M.gold, 0, 2.5, -0.1);
        co(s1, 1.1, 0.5, M.gold, 0, 2.84, -0.1, 4).rotation.y = Math.PI / 4;
        // Stage 2 左：高低排序石柱陣 (高 2.2)
        bx(wingL, 2.0, 0.15, 0.7, stoneDarkMat, 0, 0.08, 0);
        [0.7, 1.0, 1.3, 1.6, 1.9, 2.2].forEach((h, i) => bx(wingL, 0.28, h, 0.28, [M.green, M.green, M.yellow, M.orange, M.red, M.purple][i], -0.8 + i * 0.32, 0.15 + h / 2, 0));
        // Stage 2 右：二分搜尋觀測台 (高 2.3)
        cy(wingR, 0.75, 0.85, 1.5, stoneGrayMat, 0, 0.75, 0, 14);
        bx(wingR, 0.32, 0.42, 0.08, windowWarmGlowMat, 0, 0.82, 0.78);
        const dome = put(wingR, new THREE.SphereGeometry(0.75, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), M.metalLight, 0, 1.5, 0);
        bx(wingR, 0.25, 0.6, 0.3, M.metalDark, 0, 1.75, 0.6);
        const scope = cy(wingR, 0.09, 0.11, 1.0, M.metalDark, 0, 1.95, 0.5, 8); scope.rotation.x = -0.9;
        const halfRing = to(wingR, 0.95, 0.04, M.gold, 0, 0.5, 0); halfRing.rotation.x = Math.PI / 2;
        // Stage 3 高空：黃金最佳解光束燈塔
        crown.position.y = 3.1 + 4.4 + 0.8;
        const lh = grp(crown);
        cy(lh, 0.3, 0.45, 0.6, M.gold, 0, -0.5, 0, 10);
        cy(lh, 0.2, 0.3, 0.9, M.white, 0, 0.25, 0, 10);
        sp(lh, 0.26, M.gold, 0, 0.85, 0, 10);
        cy(lh, 0.12, 0.35, 3.2, M.goldBeam, 0, 2.6, 0, 10);
        const lhRing = to(lh, 0.55, 0.04, M.gold, 0, 0.9, 0); lhRing.rotation.x = Math.PI / 2;
        upd.push((t) => { lh.position.y = Math.sin(t * 1.4) * 0.12; lhRing.rotation.z = t * 2; });
        // Stage 3 前庭：發光決策羅盤地磚 (高 ≤0.15)
        cy(yard, 1.35, 1.35, 0.08, M.metalDark, 0, 0.04, 0, 24);
        const cpRing = to(yard, 1.27, 0.05, M.gold, 0, 0.1, 0); cpRing.rotation.x = Math.PI / 2;
        bx(yard, 2.3, 0.04, 0.1, M.gold, 0, 0.1, 0); bx(yard, 0.1, 0.04, 2.3, M.gold, 0, 0.1, 0);
        const needle = grp(yard, 0, 0.13, 0);
        const nr = co(needle, 0.14, 0.9, M.red, 0, 0, 0.45, 4); nr.rotation.x = Math.PI / 2;
        const nw = co(needle, 0.14, 0.9, M.white, 0, 0, -0.45, 4); nw.rotation.x = -Math.PI / 2;
        cy(yard, 0.3, 0.3, 0.05, M.cyanGlow, 0, 0.1, 0, 16);
        upd.push((t) => { needle.rotation.y = Math.sin(t * 0.9) * 1.2; });
        break;
      }
      /* ================= 資料海灣 ================= */
      case "data": {
        // Stage 1：圓柱形雲端資料庫主塔 (高 3.1)
        [0.4, 1.3, 2.2].forEach((y) => cy(s1, 1.3, 1.3, 0.8, M.siloBody, 0, y, 0, 24));
        [0.85, 1.75].forEach((y) => { const b = to(s1, 1.32, 0.07, M.siloBand, 0, y, 0, Math.PI * 2, 32); b.rotation.x = Math.PI / 2; });
        const siloDome = put(s1, new THREE.SphereGeometry(1.3, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), M.metalLight, 0, 2.6, 0);
        siloDome.scale.y = 0.4;
        cy(s1, 0.04, 0.04, 0.5, M.metalDark, 0, 3.1, 0, 6);
        bx(s1, 0.75, 1.0, 0.08, M.metalDark, 0, 0.5, 1.28);
        [-0.55, 0.55].forEach((x) => bx(s1, 0.08, 1.8, 0.06, M.siloBand, x, 1.5, 1.18));
        [1.3, 2.2].forEach((y) => [-0.25, 0, 0.25].forEach((x) => bx(s1, 0.14, 0.14, 0.05, M.siloBand, x, y, 1.3)));
        // Stage 2 左：發光長條圖水晶簇 (高 2.0)
        bx(wingL, 2.0, 0.12, 0.8, M.metalDark, 0, 0.06, 0);
        [0.8, 1.4, 1.1, 1.9, 1.5].forEach((h, i) => {
          const x = -0.8 + i * 0.4, z = i % 2 ? 0.12 : -0.12;
          cy(wingL, 0.17, 0.2, h, M.crystalTeal, x, 0.12 + h / 2, z, 6);
          co(wingL, 0.17, 0.3, M.cyanGlow, x, 0.12 + h + 0.15, z, 6);
        });
        // Stage 2 右：數據清洗過濾水車 (高 2.3)
        bx(wingR, 2.0, 0.2, 1.0, M.metalDark, 0, 0.1, 0);
        [-0.45, 0.45].forEach((z) => bx(wingR, 0.14, 1.3, 0.14, M.metalDark, 0.3, 0.8, z));
        const dw = makeWheel(wingR, 0.75, 6, M.metalLight, M.siloBand, 0.6); dw.position.set(0.3, 1.1, 0);
        put(wingR, new THREE.ConeGeometry(0.5, 0.5, 10, 1, true), M.metalLight, -0.5, 2.0, 0).rotation.x = Math.PI;
        cy(wingR, 0.06, 0.06, 0.5, M.orange, -0.5, 2.45 - 0.0, 0, 6);
        cy(wingR, 0.06, 0.06, 0.6, M.cyanGlow, -0.5, 1.45, 0, 6);
        [-0.1, 0.1, 0.3].forEach((x) => bx(wingR, 0.04, 0.5, 0.5, M.metalLight, 0.3 + x * 0.0 - 0.7 + (x + 0.1) * 0.5, 0.45, 0.0));
        upd.push((t) => { dw.rotation.z = t * 0.9; });
        // Stage 3 高空：大數據全息旋轉地球儀
        crown.position.y = 3.1 + 4.4 + 0.9;
        const globe = grp(crown);
        put(globe, new THREE.SphereGeometry(0.9, 14, 10), M.holo, 0, 0, 0);
        put(globe, new THREE.SphereGeometry(0.6, 12, 8), M.holoSolid, 0, 0, 0);
        const gr = to(globe, 1.25, 0.04, M.siloBand, 0, 0, 0); gr.rotation.x = Math.PI / 2.4;
        upd.push((t) => { globe.rotation.y = t * 0.9; globe.position.y = Math.sin(t * 1.3) * 0.1; });
        // Stage 3 前庭：低矮霓虹引航燈柱群 (高 1.35)
        const poles = [];
        for (let i = 0; i < 6; i++) {
          const x = -3.0 + i * 1.2, z = 0.9 - 0.5 * (1 - Math.pow(x / 3.0, 2));
          cy(yard, 0.05, 0.07, 1.1, M.metalDark, x, 0.55, z + 0.4, 8);
          poles.push(sp(yard, 0.16, i % 2 ? M.neonPink : M.cyanGlow, x, 1.2, z + 0.4, 10));
        }
        upd.push((t) => poles.forEach((p, i) => p.scale.setScalar(0.85 + Math.sin(t * 3 + i) * 0.2)));
        break;
      }
      /* ================= AI 智慧島 ================= */
      case "ai": {
        // Stage 1：半透明科技生態穹頂 + 內部 AI 機器人核心 (高 2.4)
        cy(s1, 1.6, 1.7, 0.9, M.metalLight, 0, 0.45, 0, 24);
        const aiBand = to(s1, 1.62, 0.06, M.aiPink, 0, 0.7, 0, Math.PI * 2, 32); aiBand.rotation.x = Math.PI / 2;
        put(s1, new THREE.SphereGeometry(1.5, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), M.glassDome, 0, 0.9, 0).castShadow = false;
        const bot = grp(s1, 0, 0.9, 0);
        bx(bot, 0.6, 0.7, 0.45, M.white, 0, 0.45, 0);
        sp(bot, 0.13, M.aiPink, 0, 0.5, 0.24, 10);
        const head = grp(bot, 0, 1.05, 0);
        bx(head, 0.55, 0.42, 0.46, M.white, 0, 0, 0);
        [-0.13, 0.13].forEach((x) => bx(head, 0.1, 0.1, 0.05, M.aiPink, x, 0.03, 0.24));
        cy(head, 0.02, 0.02, 0.25, M.metalDark, 0, 0.32, 0, 6); sp(head, 0.07, M.aiPink, 0, 0.47, 0, 8);
        const orbs = [0, 1, 2].map((i) => sp(bot, 0.09, M.aiPurple, 0, 0.9, 0, 8));
        upd.push((t) => {
          bot.position.y = 0.9 + Math.sin(t * 1.8) * 0.06; head.rotation.y = Math.sin(t * 1.1) * 0.5;
          orbs.forEach((o, i) => { const a = t * 1.3 + (i * Math.PI * 2) / 3; o.position.set(Math.cos(a) * 0.95, 0.9 + Math.sin(t * 2 + i) * 0.2, Math.sin(a) * 0.95); });
        });
        // Stage 2 左右對稱：神經網路發光節點柱與光纖連橋 (高 2.1)
        const nodes = [];
        [wingL, wingR].forEach((w) => {
          bx(w, 2.0, 0.15, 0.9, M.metalDark, 0, 0.08, 0);
          [-0.7, 0.7].forEach((x) => {
            cy(w, 0.1, 0.13, 1.7, M.metalLight, x, 1.0, 0, 8);
            [0.5, 1.05, 1.6].forEach((y, k) => nodes.push(sp(w, 0.18, [M.aiPink, M.aiPurple, M.aiGold][k], x, y, 0, 10)));
            nodes.push(sp(w, 0.24, M.aiGold, x, 1.95, 0, 12));
          });
          [0.5, 1.05, 1.6].forEach((y) => { const f = cy(w, 0.035, 0.035, 1.4, M.aiFiber, 0, y, 0, 6); f.rotation.z = Math.PI / 2; });
          [[0.5, 1.05], [1.05, 1.6]].forEach(([y0, y1]) => {
            [1, -1].forEach((s) => {
              const len = Math.hypot(1.4, y1 - y0), f = cy(w, 0.02, 0.02, len, M.aiFiber, 0, (y0 + y1) / 2, 0.0, 5);
              f.rotation.z = Math.PI / 2 + s * Math.atan2(y1 - y0, 1.4) * -1;
            });
          });
        });
        upd.push((t) => nodes.forEach((n, i) => n.scale.setScalar(0.88 + Math.sin(t * 3.2 + i * 0.7) * 0.18)));
        // Stage 3 高空：雙軸旋轉深度學習智慧光環
        crown.position.y = 2.4 + 4.4 + 1.1;
        const dl = grp(crown);
        sp(dl, 0.32, M.aiPurple, 0, 0, 0, 14);
        const ringA = to(dl, 1.1, 0.06, M.aiGold, 0, 0, 0);
        const ringB = to(dl, 0.85, 0.06, M.aiPink, 0, 0, 0);
        upd.push((t) => { ringA.rotation.set(t * 1.0, 0, t * 0.4); ringB.rotation.set(0, t * 1.3, Math.PI / 2 + t * 0.3); dl.position.y = Math.sin(t * 1.4) * 0.1; });
        // Stage 3 前庭：脈動紫金能量陣列地磚 (高 ≤0.25)
        const tiles = [];
        for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) {
          const tl = bx(yard, 0.95, 0.1, 0.95, (i + j) % 2 === 0 ? M.aiPurple : M.aiGold, i * 1.05, 0.05, j * 0.95);
          tiles.push([tl, i, j]);
        }
        upd.push((t) => tiles.forEach(([tl, i, j]) => { const s = 1 + (Math.sin(t * 3 - (i + j) * 0.9) * 0.5 + 0.5) * 1.2; tl.scale.y = s; tl.position.y = 0.05 * s; }));
        break;
      }
      default:
        bx(s1, 2, 2, 2, M.white, 0, 1, 0);
    }

    stageAnims.push((t) => upd.forEach((f) => f(t)));

    // ---- 各建築正下方草地投影暖黃光暈（零 PointLight 模擬照明）----
    const s1GroundGlow = makeGroundGlowPlane(6.8, 6.2, 0xffbe55, 0.035);
    s1.add(s1GroundGlow.mesh);
    const wingLGlow = makeGroundGlowPlane(4.4, 4.0, 0xffbe55, 0.035);
    wingL.add(wingLGlow.mesh);
    const wingRGlow = makeGroundGlowPlane(4.4, 4.0, 0xffbe55, 0.035);
    wingR.add(wingRGlow.mesh);
    const yardGlow = makeGroundGlowPlane(4.8, 4.2, 0xffcf6b, 0.035);
    yard.add(yardGlow.mesh);

    // ---- 組裝三個階段群組（皆位於草皮頂面 y = STAGE_BASE_Y；初始化預設皆為隱藏 visible = false，完成度 >= 1% 才顯示第一階段）----
    const stage1Group = grp(null, 0, STAGE_BASE_Y, 0); stage1Group.name = "tier1Group"; stage1Group.add(s1);
    const stage2Group = grp(null, 0, STAGE_BASE_Y, 0); stage2Group.name = "tier2Group"; stage2Group.add(wingL, wingR);
    const stage3Group = grp(null, 0, STAGE_BASE_Y, 0); stage3Group.name = "tier3Group"; stage3Group.add(crown, yard);
    stage1Group.visible = false;
    stage2Group.visible = false;
    stage3Group.visible = false;

    // ---- 2/3 & 3/3 高階段解鎖夜間能量流光環與向上微光光束 ----
    const stageAuraGroup = grp(null, 0, STAGE_BASE_Y, -3.5);
    stageAuraGroup.visible = false;
    stageAuraGroup.userData.dimFactor = 1;
    stageAuraGroup.userData.effectiveStage = 0;

    const flowRingMat = new THREE.MeshBasicMaterial({
      color: islandId === "data" || islandId === "sys" || islandId === "citizen" ? 0x38e5ff : 0xffd166,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
      fog: false
    });
    const flowRingGeo = new THREE.RingGeometry(2.1, 2.95, 32);
    flowRingGeo.rotateX(-Math.PI / 2);
    const flowRingMesh = new THREE.Mesh(flowRingGeo, flowRingMat);
    flowRingMesh.position.y = 0.06;
    flowRingMesh.renderOrder = 2;
    flowRingMesh.userData.skipDimClone = true;
    stageAuraGroup.add(flowRingMesh);

    const riseRingMat = new THREE.MeshBasicMaterial({
      color: 0x7ff0ff,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      fog: false
    });
    const riseRingMesh = new THREE.Mesh(new THREE.TorusGeometry(2.05, 0.05, 6, 32), riseRingMat);
    riseRingMesh.rotation.x = Math.PI / 2;
    riseRingMesh.renderOrder = 3;
    riseRingMesh.userData.skipDimClone = true;
    stageAuraGroup.add(riseRingMesh);

    const beamColor = islandId === "sys" || islandId === "data" || islandId === "citizen" ? 0x7ff0ff : 0xffe48a;
    const beamMeshMat = new THREE.MeshBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
      fog: false
    });
    const beamMesh = new THREE.Mesh(buildSoftLightConeGeo(0.45, 2.05, 11.5, 16, 0x000000, beamColor), beamMeshMat);
    beamMesh.position.y = 5.75;
    beamMesh.renderOrder = 3;
    beamMesh.visible = false;
    beamMesh.userData.skipDimClone = true;
    stageAuraGroup.add(beamMesh);

    nightGlowUpdaters.push((nb, t) => {
      const df = stageAuraGroup.userData.dimFactor ?? 1;
      const showBase = nb > 0.01;
      s1GroundGlow.mesh.visible = showBase && stage1Group.visible;
      wingLGlow.mesh.visible = showBase && stage2Group.visible;
      wingRGlow.mesh.visible = showBase && stage2Group.visible;
      yardGlow.mesh.visible = showBase && stage3Group.visible;
      if (showBase) {
        const op = 0.44 * nb * df;
        s1GroundGlow.mat.opacity = op;
        wingLGlow.mat.opacity = op * 0.88;
        wingRGlow.mat.opacity = op * 0.88;
        yardGlow.mat.opacity = op * 0.9;
      }

      const effStage = Number(stageAuraGroup.userData.effectiveStage ?? api.stage ?? 0);
      const showAura = nb > 0.01 && effStage >= 2;
      stageAuraGroup.visible = showAura;
      if (showAura) {
        const breath = 0.5 + 0.5 * Math.sin(t * 2.2);
        const fScale = 0.96 + breath * 0.1;
        flowRingMesh.scale.set(fScale, 1, fScale);
        flowRingMat.opacity = (0.34 + breath * 0.22) * nb * df;

        const cycle = (t * 0.42) % 1;
        riseRingMesh.position.y = 0.25 + cycle * 4.4;
        const rSc = 0.92 + cycle * 0.3;
        riseRingMesh.scale.set(rSc, rSc, 1);
        riseRingMat.opacity = Math.sin(cycle * Math.PI) * 0.48 * nb * df;

        const showBeam = effStage >= 3;
        beamMesh.visible = showBeam;
        if (showBeam) {
          beamMeshMat.opacity = (0.28 + 0.08 * Math.sin(t * 2.5)) * nb * df;
        }
      }
    });

    // ---- 施工地基（半透明框線）+ 前庭施工預告小立牌 + 低矮鵝卵石步道 ----
    const foundation = grp(null, 0, STAGE_BASE_Y, 0);
    const plate = (w, d, x, z) => {
      const g = grp(foundation, x, 0.04, z);
      const pl = new THREE.Mesh(new THREE.PlaneGeometry(w, d), M.foundFill); pl.rotation.x = -Math.PI / 2; g.add(pl);
      g.add(new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(w, 0.02, d)), M.foundLine));
      return g;
    };
    const fMain = plate(3.8, 3.2, 0, -3.5);
    const fWings = [plate(2.4, 2.2, -6, 1), plate(2.4, 2.2, 6, 1)];
    const fYard = plate(3.6, 2.6, 0, 6);
    const sign = grp(foundation, 3.0, 0, 4.6);
    cy(sign, 0.04, 0.05, 1.0, M.signPost, 0, 0.5, 0, 6);
    const board = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.625), M.signBoards[0]);
    board.position.set(0, 1.0, 0.06); sign.add(board);
    for (let i = 0; i < 4; i++) {
      const st = cy(foundation, 0.2, 0.22, 0.04, cobbleStonePathMat, (i % 2 ? 0.2 : -0.2), 0.02, 0.4 + i * 0.95, 7);
      st.receiveShadow = true;
    }

    const bounces = [];
    stageAnims.push(() => {
      if (!bounces.length) return;
      const now = performance.now();
      for (let i = bounces.length - 1; i >= 0; i--) {
        const b = bounces[i];
        const k = Math.min(1, Math.max(0, (now - b.start) / b.dur));
        const c1 = 1.70158, c3 = c1 + 1;
        const e = k <= 0 ? 0.001 : 1 + c3 * Math.pow(k - 1, 3) + c1 * Math.pow(k - 1, 2); // easeOutBack
        b.obj.scale.setScalar(Math.max(0.001, e));
        if (k >= 1) { b.obj.scale.setScalar(1); bounces.splice(i, 1); }
      }
    });

    const api = {
      tier1Group: stage1Group,
      tier2Group: stage2Group,
      tier3Group: stage3Group,
      stage1Group, stage2Group, stage3Group, foundation, stageAuraGroup,
      stage: 0,
      setStage(n, animate) {
        n = Math.max(0, Math.min(3, n | 0));
        const prev = api.stage;
        [stage1Group, stage2Group, stage3Group].forEach((g, i) => {
          const show = n >= i + 1;
          const isNew = show && animate && prev < i + 1;
          g.visible = show;
          g.children.forEach((c) => {
            for (let k = bounces.length - 1; k >= 0; k--) if (bounces[k].obj === c) bounces.splice(k, 1);
            c.scale.setScalar(1);
            if (isNew) { c.scale.setScalar(0.001); bounces.push({ obj: c, start: performance.now() + i * 120, dur: 900 }); }
          });
        });
        foundation.visible = n >= 1;
        fMain.visible = n < 1;
        fWings.forEach((f) => { f.visible = n >= 1 && n < 2; });
        fYard.visible = n >= 1 && n < 3;
        sign.visible = n >= 1 && n < 3;
        board.material = M.signBoards[Math.min(2, n)];
        api.stage = n;
      }
    };
    api.setStage(0, false);
    return api;
  }

  const islandsGroup = new THREE.Group();
  scene.add(islandsGroup);

  // 【七大主題島嶼規模放大 1.4 倍】：群島環狀半徑調整為 49.0，為島際動森風吊橋留出通透海域
  const ringRadius = 49.0;
  const islandRecords = [];
  const dockBulbMaterials = [];
  const dockLampGlowMaterials = [];
  const dockWaterGlowMaterials = [];
  const sharedDockLampPoleGeo = new THREE.CylinderGeometry(0.08, 0.1, 2.05, 6);
  const sharedDockLampArmGeo = new THREE.BoxGeometry(0.55, 0.09, 0.09);
  const sharedDockLampBulbGeo = new THREE.OctahedronGeometry(0.32, 1);
  const sharedDockLampGlowGeo = new THREE.SphereGeometry(0.75, 10, 8);
  const sharedDockWaterGlowGeo = new THREE.PlaneGeometry(5.8, 5.8);
  sharedDockWaterGlowGeo.rotateX(-Math.PI / 2);

  const foamMat = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: THEME.day.foamOpacity,
    side: THREE.DoubleSide,
    depthWrite: false
  });

  // 半透明淡薄荷青淺灘圓環材質 (#38bdf8，透明度 0.55，稍微浮於深水上方)
  const shallowLagoonMat = new THREE.MeshBasicMaterial({
    color: 0x38bdf8,
    transparent: true,
    opacity: 0.55,
    side: THREE.DoubleSide,
    depthWrite: false
  });

  // 【基礎地形與底座規模放大 1.4 倍】：三層動森立體階梯台地幾何初始即為放大最終尺寸
  // 底層沙灘基底：y = 0.6, 頂面高約 1.8
  const sandGeometry = createRoundedCylinderGeometry(11.2, 12.32, 2.4, 0.65, 16);
  // 中層綠草皮台地（配置 NPC、植被、小動物與單元標籤）：y = 2.2, 頂面高約 3.04
  const midTurfGeometry = createRoundedCylinderGeometry(9.24, 10.08, 1.68, 0.55, 16);
  // 頂層高台（頂面高約 5.08）：擺放該島核心主題地標
  const summitTurfGeometry = createRoundedCylinderGeometry(6.16, 6.86, 2.16, 0.45, 16);

  const shallowRingGeo = new THREE.RingGeometry(10.6, 16.2, 32);
  shallowRingGeo.rotateX(-Math.PI / 2);
  const foamRingGeo = new THREE.RingGeometry(11.3, 12.7, 28);
  foamRingGeo.rotateX(-Math.PI / 2);
  const outerFoamRingGeo = new THREE.RingGeometry(15.5, 16.6, 32);
  outerFoamRingGeo.rotateX(-Math.PI / 2);

  /* ============================================================
   * 3b. 主題島嶼細節強化：雙層台地、木製圍籬、路燈與低多邊形樹林
   *     全部使用 InstancedMesh + 共用幾何/材質（每島僅約 6 個 draw call）
   * ============================================================ */
  const decorTmp = new THREE.Object3D();
  const decorGeo = {
    terrace: createRoundedCylinderGeometry(6.9, 7.1, 0.65, 0.25, 16),
    post: new THREE.BoxGeometry(0.1, 0.55, 0.1),
    rail: new THREE.BoxGeometry(1, 0.06, 0.05),
    pole: new THREE.CylinderGeometry(0.045, 0.065, 1.5, 5),
    lantern: new THREE.OctahedronGeometry(0.15, 0),
    lampGround: (() => {
      const g = new THREE.PlaneGeometry(3.6, 3.6);
      g.rotateX(-Math.PI / 2);
      return g;
    })(),
    lampHalo: new THREE.SphereGeometry(0.42, 8, 6),
    trunk: new THREE.CylinderGeometry(0.1, 0.16, 0.7, 5),
    crownLo: new THREE.ConeGeometry(0.58, 0.95, 6),
    crownHi: new THREE.ConeGeometry(0.42, 0.85, 6)
  };
  const decorMat = {
    fence: new THREE.MeshLambertMaterial({ color: 0xb98150 }),
    pole: new THREE.MeshLambertMaterial({ color: 0x5b4636 }),
    lantern: registerNightMat(
      new THREE.MeshStandardMaterial({ color: 0xffe8a3, emissive: 0xffb703, emissiveIntensity: 0.2, roughness: 0.25 }),
      { dayEi: 0.2, nightEi: 2.35 }
    ),
    lampGround: new THREE.MeshBasicMaterial({
      map: radialGlowTex,
      color: 0xffc652,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      fog: false,
      side: THREE.DoubleSide
    }),
    lampHalo: new THREE.MeshBasicMaterial({
      color: 0xffc652,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      fog: false
    }),
    trunk: new THREE.MeshLambertMaterial({ color: 0x8d5b3c }),
    crown: new THREE.MeshLambertMaterial({ color: 0xffffff })
  };
  const islandDecorLampGlowMeshes = [];
  nightGlowUpdaters.push((nb, t) => {
    const show = nb > 0.01;
    islandDecorLampGlowMeshes.forEach((m) => { m.visible = show; });
    if (show) {
      const flicker = 0.92 + 0.08 * Math.sin(t * 3.1);
      decorMat.lampGround.opacity = 0.54 * nb * flicker;
      decorMat.lampHalo.opacity = 0.36 * nb * flicker;
    }
  });
  const decorTreePalette = [0x4cc970, 0x68d886, 0x3ab764, 0x7bdc6e, 0x2fa65a].map((c) => new THREE.Color(c));

  function decorRand(a, b) {
    const v = Math.sin(a * 12.9898 + b * 78.233) * 43758.5453;
    return v - Math.floor(v);
  }

  function makeDecorInstanced(geo, mat, count, parent, shadow = false) {
    const mesh = new THREE.InstancedMesh(geo, mat, Math.max(1, count));
    mesh.count = count;
    mesh.frustumCulled = false; // r128 的 InstancedMesh 以單一幾何包圍球裁切，關閉避免實例被誤裁
    mesh.castShadow = shadow;
    mesh.receiveShadow = false;
    parent.add(mesh);
    return mesh;
  }

  function addIslandDecor(islandRoot, ix, iz, idx, themeHex) {
    const inward = Math.atan2(-iz, -ix);
    const angDiff = (a) => {
      let d = a - inward;
      while (d > Math.PI) d -= Math.PI * 2;
      while (d < -Math.PI) d += Math.PI * 2;
      return Math.abs(d);
    };
    // 中層台地綠草坪基準高度 (放大後頂面)
    const ledgeY = 3.04;

    // 木製圍籬（環繞中層台地外緣，避開碼頭方向，半徑放大 1.4 倍）
    const N = 28;
    const R = 7.3;
    const postList = [];
    const railList = [];
    for (let i = 0; i < N; i++) {
      const a = (i / N) * Math.PI * 2;
      if (angDiff(a) > 0.4) postList.push(a);
      const am = a + Math.PI / N;
      if (angDiff(am) > 0.4 && angDiff(a) > 0.4 && angDiff(a + (Math.PI * 2) / N) > 0.4) railList.push(am);
    }
    const posts = makeDecorInstanced(decorGeo.post, decorMat.fence, postList.length, islandRoot);
    postList.forEach((a, i) => {
      decorTmp.position.set(Math.cos(a) * R, ledgeY + 0.275, Math.sin(a) * R);
      decorTmp.rotation.set(0, 0, 0);
      decorTmp.scale.set(1, 1, 1);
      decorTmp.updateMatrix();
      posts.setMatrixAt(i, decorTmp.matrix);
    });
    const chord = 2 * R * Math.sin(Math.PI / N);
    const rails = makeDecorInstanced(decorGeo.rail, decorMat.fence, railList.length * 2, islandRoot);
    railList.forEach((a, i) => {
      [0.2, 0.42].forEach((h, k) => {
        decorTmp.position.set(Math.cos(a) * R * Math.cos(Math.PI / N), ledgeY + h, Math.sin(a) * R * Math.cos(Math.PI / N));
        decorTmp.rotation.set(0, -(a + Math.PI / 2), 0);
        decorTmp.scale.set(chord, 1, 1);
        decorTmp.updateMatrix();
        rails.setMatrixAt(i * 2 + k, decorTmp.matrix);
      });
    });

    // 路燈（4 盞，亮面材質在夜間仍保有溫暖光點）
    const lampAngles = [];
    for (let k = 0; k < 4; k++) {
      const a = (k / 4) * Math.PI * 2 + Math.PI / 4 + idx * 0.21;
      if (angDiff(a) > 0.6 && !inStageZone(Math.cos(a) * 6.4, Math.sin(a) * 6.4)) lampAngles.push(a);
    }
    const poles = makeDecorInstanced(decorGeo.pole, decorMat.pole, lampAngles.length, islandRoot, true);
    const lanterns = makeDecorInstanced(decorGeo.lantern, decorMat.lantern, lampAngles.length, islandRoot);
    const lampGrounds = makeDecorInstanced(decorGeo.lampGround, decorMat.lampGround, lampAngles.length, islandRoot);
    lampGrounds.renderOrder = 2;
    lampGrounds.visible = false;
    lampGrounds.userData.skipDimClone = true;
    const lampHalos = makeDecorInstanced(decorGeo.lampHalo, decorMat.lampHalo, lampAngles.length, islandRoot);
    lampHalos.renderOrder = 3;
    lampHalos.visible = false;
    lampHalos.userData.skipDimClone = true;
    islandDecorLampGlowMeshes.push(lampGrounds, lampHalos);

    lampAngles.forEach((a, i) => {
      const lx = Math.cos(a) * 6.4;
      const lz = Math.sin(a) * 6.4;
      decorTmp.rotation.set(0, 0, 0);
      decorTmp.scale.set(1, 1, 1);
      decorTmp.position.set(lx, ledgeY + 0.75, lz);
      decorTmp.updateMatrix();
      poles.setMatrixAt(i, decorTmp.matrix);
      decorTmp.position.set(lx, ledgeY + 1.58, lz);
      decorTmp.updateMatrix();
      lanterns.setMatrixAt(i, decorTmp.matrix);
      lampHalos.setMatrixAt(i, decorTmp.matrix);
      decorTmp.position.set(lx, ledgeY + 0.035, lz);
      decorTmp.updateMatrix();
      lampGrounds.setMatrixAt(i, decorTmp.matrix);
    });

    // 低多邊形樹林（兩層錐形樹冠 + 實例顏色，配置於中層邊緣）
    const treeSpots = [];
    const TN = 12;
    for (let i = 0; i < TN; i++) {
      const a = (i / TN) * Math.PI * 2 + idx * 0.37 + decorRand(idx, i) * 0.25;
      if (angDiff(a) < 0.62) continue;
      const rr = 5.3 + decorRand(i, idx) * 1.7;
      if (inStageZone(Math.cos(a) * rr, Math.sin(a) * rr)) continue; // 避開三階段建築分區
      treeSpots.push({ a, rr, s: 0.75 + decorRand(idx + 3, i) * 0.55, c: (i + idx) % decorTreePalette.length });
    }
    const trunks = makeDecorInstanced(decorGeo.trunk, decorMat.trunk, treeSpots.length, islandRoot, true);
    const crownsLo = makeDecorInstanced(decorGeo.crownLo, decorMat.crown, treeSpots.length, islandRoot, true);
    const crownsHi = makeDecorInstanced(decorGeo.crownHi, decorMat.crown, treeSpots.length, islandRoot, true);
    const treeCoords = [];
    treeSpots.forEach((ts, i) => {
      const x = Math.cos(ts.a) * ts.rr;
      const z = Math.sin(ts.a) * ts.rr;
      treeCoords.push({ x, z, y: ledgeY + 0.1 + 1.9 * ts.s });
      const baseY = ledgeY + 0.1;
      decorTmp.rotation.set(0, ts.a * 3, 0);
      decorTmp.scale.setScalar(ts.s);
      decorTmp.position.set(x, baseY + 0.35 * ts.s, z);
      decorTmp.updateMatrix();
      trunks.setMatrixAt(i, decorTmp.matrix);
      decorTmp.position.set(x, baseY + 1.0 * ts.s, z);
      decorTmp.updateMatrix();
      crownsLo.setMatrixAt(i, decorTmp.matrix);
      crownsLo.setColorAt(i, decorTreePalette[ts.c]);
      decorTmp.position.set(x, baseY + 1.62 * ts.s, z);
      decorTmp.updateMatrix();
      crownsHi.setMatrixAt(i, decorTmp.matrix);
      crownsHi.setColorAt(i, decorTreePalette[(ts.c + 1) % decorTreePalette.length]);
    });
    islandRoot.userData.treeCoords = treeCoords;
    [posts, rails, poles, lanterns, lampGrounds, lampHalos, trunks, crownsLo, crownsHi].forEach((m) => {
      m.instanceMatrix.needsUpdate = true;
      if (m.instanceColor) m.instanceColor.needsUpdate = true;
    });
  }



  const sandMat = new THREE.MeshStandardMaterial({
    color: 0xf6dfa4,
    roughness: 0.82,
    metalness: 0.02,
    flatShading: true
  });

  const woodMat = new THREE.MeshStandardMaterial({
    color: 0x9c6644,
    roughness: 0.85,
    flatShading: true
  });
  const postMat = new THREE.MeshStandardMaterial({
    color: 0x6f4518,
    roughness: 0.9,
    flatShading: true
  });

  /* ============================================================
   * 島嶼生態與生物動態產生器（草地跳躍小白兔、岸邊小鴨、微型巡邏小人）
   * ============================================================ */
  const islandCritters = [];
  const critterWhiteMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.55, flatShading: true });
  const critterPinkMat = new THREE.MeshStandardMaterial({ color: 0xffafcc, roughness: 0.5, flatShading: true });
  const critterYellowMat = new THREE.MeshStandardMaterial({ color: 0xffd166, roughness: 0.48, flatShading: true });
  const critterBeakMat = new THREE.MeshStandardMaterial({ color: 0xfb8500, roughness: 0.45, flatShading: true });
  const critterDarkMat = new THREE.MeshBasicMaterial({ color: 0x1e293b });

  function createLowPolyBunny() {
    const root = new THREE.Group();
    const bodyPivot = new THREE.Group();
    root.add(bodyPivot);

    const body = new THREE.Mesh(new THREE.DodecahedronGeometry(0.19, 0), critterWhiteMat);
    body.scale.set(0.95, 0.86, 1.2);
    body.position.y = 0.165;
    body.castShadow = true;
    bodyPivot.add(body);

    [-0.075, 0.075].forEach((px) => {
      const paw = new THREE.Mesh(new THREE.SphereGeometry(0.045, 6, 5), critterWhiteMat);
      paw.scale.set(0.9, 0.55, 1.25);
      paw.position.set(px, 0.025, 0.11);
      bodyPivot.add(paw);
    });

    const tail = new THREE.Mesh(new THREE.DodecahedronGeometry(0.075, 0), critterWhiteMat);
    tail.position.set(0, 0.15, -0.2);
    bodyPivot.add(tail);

    const headPivot = new THREE.Group();
    headPivot.position.set(0, 0.28, 0.16);
    bodyPivot.add(headPivot);

    const head = new THREE.Mesh(new THREE.DodecahedronGeometry(0.14, 0), critterWhiteMat);
    head.castShadow = true;
    headPivot.add(head);

    const nose = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.035, 0.04), critterPinkMat);
    nose.position.set(0, 0.0, 0.13);
    headPivot.add(nose);

    const earGeo = new THREE.BoxGeometry(0.048, 0.22, 0.055);
    const leftEar = new THREE.Mesh(earGeo, critterWhiteMat);
    leftEar.position.set(-0.055, 0.18, -0.02);
    leftEar.rotation.z = 0.12;
    leftEar.rotation.x = -0.1;
    headPivot.add(leftEar);

    const rightEar = new THREE.Mesh(earGeo, critterWhiteMat);
    rightEar.position.set(0.055, 0.18, -0.02);
    rightEar.rotation.z = -0.12;
    rightEar.rotation.x = -0.1;
    headPivot.add(rightEar);

    return { root, bodyPivot, headPivot, kind: "bunny" };
  }

  function createLowPolyDuck() {
    const root = new THREE.Group();
    const bodyPivot = new THREE.Group();
    root.add(bodyPivot);

    const body = new THREE.Mesh(new THREE.DodecahedronGeometry(0.18, 0), critterYellowMat);
    body.scale.set(0.92, 0.78, 1.25);
    body.position.y = 0.155;
    body.castShadow = true;
    bodyPivot.add(body);

    [-0.065, 0.065].forEach((px) => {
      const webFoot = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.02, 0.085), critterBeakMat);
      webFoot.position.set(px, 0.01, 0.04);
      bodyPivot.add(webFoot);
    });

    const tail = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.15, 4), critterYellowMat);
    tail.position.set(0, 0.2, -0.21);
    tail.rotation.x = -Math.PI / 3;
    bodyPivot.add(tail);

    const headPivot = new THREE.Group();
    headPivot.position.set(0, 0.29, 0.15);
    bodyPivot.add(headPivot);

    const head = new THREE.Mesh(new THREE.DodecahedronGeometry(0.125, 0), critterYellowMat);
    head.castShadow = true;
    headPivot.add(head);

    const bill = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.045, 0.13), critterBeakMat);
    bill.position.set(0, -0.015, 0.13);
    headPivot.add(bill);

    const lEye = new THREE.Mesh(new THREE.BoxGeometry(0.026, 0.026, 0.026), critterDarkMat);
    lEye.position.set(-0.075, 0.025, 0.075);
    headPivot.add(lEye);
    const rEye = lEye.clone();
    rEye.position.x = 0.075;
    headPivot.add(rEye);

    return { root, bodyPivot, headPivot, kind: "duck" };
  }

  function createMiniPatrolVillager(accentHex = "#4fb3ff") {
    const root = new THREE.Group();
    const bodyPivot = new THREE.Group();
    root.add(bodyPivot);

    const tunicMat = new THREE.MeshStandardMaterial({ color: accentHex, roughness: 0.55, flatShading: true });
    const skinMat = npcExtraMat.skinLight;

    [-0.065, 0.065].forEach((fx) => {
      const boot = new THREE.Mesh(new THREE.SphereGeometry(0.055, 6, 5), npcExtraMat.bootDark);
      boot.scale.set(0.9, 0.72, 1.25);
      boot.position.set(fx, 0.04, 0.03);
      bodyPivot.add(boot);
    });

    const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.16, 0.26, 7), tunicMat);
    torso.position.y = 0.18;
    torso.castShadow = true;
    bodyPivot.add(torso);

    const headPivot = new THREE.Group();
    headPivot.position.set(0, 0.38, 0);
    bodyPivot.add(headPivot);

    const head = new THREE.Mesh(new THREE.DodecahedronGeometry(0.135, 1), skinMat);
    head.castShadow = true;
    headPivot.add(head);

    const hat = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.16, 6), critterYellowMat);
    hat.position.y = 0.13;
    headPivot.add(hat);

    return { root, bodyPivot, headPivot, kind: "villager" };
  }

  /* ============================================================
   * Q 版新增島民 / 低多邊形小動物共用產生器 (origin y=0 精準對齊腳底板最底部)
   * ============================================================ */
  const islandBuddies = [];
  const sanctuaryNPCs = [];

  function createCuteIslandBuddy(species = "chibi", opts = {}) {
    const root = new THREE.Group();
    const bodyPivot = new THREE.Group();
    root.add(bodyPivot);
    const headPivot = new THREE.Group();
    const tailPivot = new THREE.Group();
    const armL = new THREE.Group();
    const armR = new THREE.Group();

    const makeEye = (x, y, z, parent) => {
      const e = new THREE.Mesh(new THREE.BoxGeometry(0.026, 0.03, 0.024), npcExtraMat.eyeDark);
      e.position.set(x, y, z);
      parent.add(e);
    };
    const makeCheek = (x, y, z, parent) => {
      const ch = new THREE.Mesh(new THREE.SphereGeometry(0.024, 6, 5), npcExtraMat.cheekPink);
      ch.scale.set(1.2, 0.7, 0.5);
      ch.position.set(x, y, z);
      parent.add(ch);
    };

    if (species === "bunny") {
      const furMat = opts.furMat || npcExtraMat.bunnyWhite;
      [-0.075, 0.075].forEach((px) => {
        const paw = new THREE.Mesh(new THREE.SphereGeometry(0.045, 6, 5), furMat);
        paw.scale.set(0.95, 0.55, 1.25);
        paw.position.set(px, 0.025, 0.11);
        bodyPivot.add(paw);
      });
      const body = new THREE.Mesh(new THREE.DodecahedronGeometry(0.18, 0), furMat);
      body.scale.set(0.95, 0.9, 1.15);
      body.position.y = 0.165;
      body.castShadow = true;
      bodyPivot.add(body);
      tailPivot.position.set(0, 0.16, -0.19);
      const tail = new THREE.Mesh(new THREE.SphereGeometry(0.065, 6, 5), npcExtraMat.bunnyWhite);
      tailPivot.add(tail);
      bodyPivot.add(tailPivot);

      headPivot.position.set(0, 0.32, 0.11);
      bodyPivot.add(headPivot);
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.145, 9, 8), furMat);
      head.castShadow = true;
      headPivot.add(head);
      [-0.055, 0.055].forEach((ex, i) => {
        const ear = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.22, 0.05), furMat);
        ear.position.set(ex, 0.19, -0.02);
        ear.rotation.z = i === 0 ? 0.14 : -0.14;
        headPivot.add(ear);
        makeEye(ex * 1.1, 0.03, 0.125, headPivot);
        makeCheek(ex * 1.45, -0.025, 0.12, headPivot);
      });
      const nose = new THREE.Mesh(new THREE.BoxGeometry(0.038, 0.028, 0.035), critterPinkMat);
      nose.position.set(0, -0.01, 0.14);
      headPivot.add(nose);
    } else if (species === "cat") {
      const furMat = opts.furMat || npcExtraMat.catOrange;
      const bellyMat = npcExtraMat.catCream;
      [-0.075, 0.075].forEach((px) => {
        const paw = new THREE.Mesh(new THREE.SphereGeometry(0.05, 6, 5), bellyMat);
        paw.scale.set(0.9, 0.6, 1.25);
        paw.position.set(px, 0.03, 0.05);
        bodyPivot.add(paw);
      });
      const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.155, 0.25, 8), furMat);
      torso.position.y = 0.175;
      torso.castShadow = true;
      bodyPivot.add(torso);
      const belly = new THREE.Mesh(new THREE.SphereGeometry(0.11, 8, 6), bellyMat);
      belly.scale.set(0.9, 1.0, 0.45);
      belly.position.set(0, 0.17, 0.11);
      bodyPivot.add(belly);

      armL.position.set(-0.14, 0.24, 0);
      armR.position.set(0.14, 0.24, 0);
      [armL, armR].forEach((ag, i) => {
        const hand = new THREE.Mesh(new THREE.SphereGeometry(0.045, 6, 5), furMat);
        hand.position.set(i === 0 ? -0.02 : 0.02, -0.04, 0.02);
        ag.add(hand);
        bodyPivot.add(ag);
      });

      tailPivot.position.set(0, 0.16, -0.14);
      const tail = new THREE.Mesh(new THREE.CylinderGeometry(0.026, 0.036, 0.26, 6), furMat);
      tail.position.set(0, 0.10, -0.06);
      tail.rotation.x = -0.6;
      tailPivot.add(tail);
      bodyPivot.add(tailPivot);

      headPivot.position.set(0, 0.37, 0.02);
      bodyPivot.add(headPivot);
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.15, 10, 8), furMat);
      head.scale.set(1.06, 0.94, 0.98);
      head.castShadow = true;
      headPivot.add(head);
      [-0.095, 0.095].forEach((ex, i) => {
        const ear = new THREE.Mesh(new THREE.ConeGeometry(0.055, 0.11, 4), furMat);
        ear.position.set(ex, 0.14, 0);
        ear.rotation.z = i === 0 ? 0.28 : -0.28;
        headPivot.add(ear);
        makeEye(ex * 0.62, 0.015, 0.135, headPivot);
        makeCheek(ex * 0.95, -0.03, 0.125, headPivot);
      });
      const muzzle = new THREE.Mesh(new THREE.SphereGeometry(0.055, 6, 5), bellyMat);
      muzzle.scale.set(1.2, 0.75, 0.65);
      muzzle.position.set(0, -0.035, 0.13);
      headPivot.add(muzzle);
    } else if (species === "bear") {
      const furMat = opts.furMat || npcExtraMat.bearBrown;
      const muzzleMat = furMat === npcExtraMat.bearPanda ? npcExtraMat.bearPanda : npcExtraMat.bearTan;
      const earMat = furMat === npcExtraMat.bearPanda ? npcExtraMat.eyeDark : furMat;
      [-0.085, 0.085].forEach((px) => {
        const paw = new THREE.Mesh(new THREE.SphereGeometry(0.055, 6, 5), earMat);
        paw.scale.set(1.0, 0.65, 1.3);
        paw.position.set(px, 0.04, 0.04);
        bodyPivot.add(paw);
      });
      const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.135, 0.18, 0.27, 8), furMat);
      torso.position.y = 0.19;
      torso.castShadow = true;
      bodyPivot.add(torso);
      const belly = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 6), muzzleMat);
      belly.scale.set(0.95, 1.0, 0.45);
      belly.position.set(0, 0.19, 0.125);
      bodyPivot.add(belly);

      armL.position.set(-0.16, 0.26, 0);
      armR.position.set(0.16, 0.26, 0);
      [armL, armR].forEach((ag, i) => {
        const arm = new THREE.Mesh(new THREE.SphereGeometry(0.052, 6, 5), earMat);
        arm.scale.set(0.9, 1.25, 0.9);
        arm.position.set(i === 0 ? -0.02 : 0.02, -0.04, 0.02);
        ag.add(arm);
        bodyPivot.add(ag);
      });

      headPivot.position.set(0, 0.40, 0.01);
      bodyPivot.add(headPivot);
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 8), furMat);
      head.scale.set(1.08, 0.96, 1.0);
      head.castShadow = true;
      headPivot.add(head);
      [-0.125, 0.125].forEach((ex) => {
        const ear = new THREE.Mesh(new THREE.SphereGeometry(0.055, 6, 5), earMat);
        ear.position.set(ex, 0.125, 0);
        headPivot.add(ear);
        makeEye(ex * 0.48, 0.02, 0.145, headPivot);
        makeCheek(ex * 0.72, -0.025, 0.135, headPivot);
      });
      const snout = new THREE.Mesh(new THREE.SphereGeometry(0.06, 6, 5), muzzleMat);
      snout.scale.set(1.1, 0.85, 0.75);
      snout.position.set(0, -0.035, 0.145);
      headPivot.add(snout);
    } else if (species === "penguin") {
      [-0.075, 0.075].forEach((fx) => {
        const webFoot = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.025, 0.1), npcExtraMat.penguinBeak);
        webFoot.position.set(fx, 0.0125, 0.05);
        bodyPivot.add(webFoot);
      });
      const torso = new THREE.Mesh(new THREE.SphereGeometry(0.165, 10, 8), npcExtraMat.penguinNavy);
      torso.scale.set(1.0, 1.18, 0.92);
      torso.position.y = 0.21;
      torso.castShadow = true;
      bodyPivot.add(torso);
      const belly = new THREE.Mesh(new THREE.SphereGeometry(0.135, 8, 8), npcExtraMat.penguinWhite);
      belly.scale.set(0.92, 1.08, 0.48);
      belly.position.set(0, 0.205, 0.105);
      bodyPivot.add(belly);

      armL.position.set(-0.16, 0.26, 0);
      armR.position.set(0.16, 0.26, 0);
      [armL, armR].forEach((ag, i) => {
        const wing = new THREE.Mesh(new THREE.CylinderGeometry(0.036, 0.022, 0.2, 6), npcExtraMat.penguinNavy);
        wing.position.set(i === 0 ? -0.025 : 0.025, -0.06, 0);
        wing.rotation.z = i === 0 ? 0.32 : -0.32;
        ag.add(wing);
        bodyPivot.add(ag);
      });

      headPivot.position.set(0, 0.41, 0.01);
      bodyPivot.add(headPivot);
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.135, 9, 8), npcExtraMat.penguinNavy);
      head.castShadow = true;
      headPivot.add(head);
      const beak = new THREE.Mesh(new THREE.ConeGeometry(0.042, 0.09, 5), npcExtraMat.penguinBeak);
      beak.rotation.x = Math.PI / 2;
      beak.position.set(0, -0.02, 0.145);
      headPivot.add(beak);
      [-0.055, 0.055].forEach((ex) => {
        makeEye(ex, 0.025, 0.12, headPivot);
        makeCheek(ex * 1.35, -0.02, 0.115, headPivot);
      });
    } else {
      // Q 版探險人物角色 ("chibi")
      const shirtMat = opts.shirtMat || npcExtraMat.shirtBlue;
      const hatMat = opts.hatMat || npcExtraMat.hatStraw;
      const skinMat = opts.skinMat || npcExtraMat.skinLight;

      [-0.08, 0.08].forEach((fx) => {
        const boot = new THREE.Mesh(new THREE.SphereGeometry(0.062, 6, 5), npcExtraMat.bootDark);
        boot.scale.set(0.95, 0.65, 1.3);
        boot.position.set(fx, 0.042, 0.03);
        bodyPivot.add(boot);
      });
      const tunic = new THREE.Mesh(new THREE.CylinderGeometry(0.105, 0.17, 0.28, 8), shirtMat);
      tunic.position.y = 0.20;
      tunic.castShadow = true;
      bodyPivot.add(tunic);

      armL.position.set(-0.155, 0.295, 0);
      armR.position.set(0.155, 0.295, 0);
      [armL, armR].forEach((ag, i) => {
        const sleeve = new THREE.Mesh(new THREE.CylinderGeometry(0.038, 0.034, 0.14, 6), shirtMat);
        sleeve.position.set(i === 0 ? -0.02 : 0.02, -0.05, 0);
        ag.add(sleeve);
        const hand = new THREE.Mesh(new THREE.SphereGeometry(0.042, 6, 5), skinMat);
        hand.position.set(i === 0 ? -0.02 : 0.02, -0.12, 0.01);
        ag.add(hand);
        bodyPivot.add(ag);
      });

      headPivot.position.set(0, 0.43, 0);
      bodyPivot.add(headPivot);
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.155, 10, 9), skinMat);
      head.castShadow = true;
      headPivot.add(head);
      [-0.058, 0.058].forEach((ex) => {
        makeEye(ex, 0.01, 0.142, headPivot);
        makeCheek(ex * 1.45, -0.035, 0.132, headPivot);
      });
      if (hatMat) {
        const cap = new THREE.Mesh(new THREE.SphereGeometry(0.162, 10, 6, 0, Math.PI * 2, 0, Math.PI * 0.52), hatMat);
        cap.position.y = 0.025;
        headPivot.add(cap);
        const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.025, 12), hatMat);
        brim.position.y = 0.035;
        headPivot.add(brim);
      }
    }

    if (opts.scale) root.scale.setScalar(opts.scale);
    return { root, bodyPivot, headPivot, tailPivot, armL, armR, species };
  }

  /* ============================================================
   * 七大主題島嶼守護 NPC 產生器與頭頂「！」迎賓驚嘆號 Sprite
   * ============================================================ */
  const guardianNPCsGroup = new THREE.Group();
  guardianNPCsGroup.name = "guardianNPCsGroup";
  scene.add(guardianNPCsGroup);
  const guardianNPCs = [];

  let sharedExclTexture = null;
  function createExclamationSprite(scaleSize = 1.25) {
    if (!sharedExclTexture) {
      const c = document.createElement("canvas");
      c.width = 128;
      c.height = 128;
      const ctx = c.getContext("2d");
      ctx.save();
      // 動森風水滴圓角驚嘆號氣泡
      ctx.beginPath();
      ctx.arc(64, 54, 42, 0, Math.PI * 2);
      ctx.fillStyle = "#fffdf2";
      ctx.shadowColor = "rgba(15, 23, 42, 0.38)";
      ctx.shadowBlur = 10;
      ctx.shadowOffsetY = 4;
      ctx.fill();
      ctx.lineWidth = 6;
      ctx.strokeStyle = "#f59e0b";
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(52, 90);
      ctx.lineTo(64, 114);
      ctx.lineTo(76, 90);
      ctx.closePath();
      ctx.fillStyle = "#fffdf2";
      ctx.fill();
      ctx.lineWidth = 5;
      ctx.strokeStyle = "#f59e0b";
      ctx.stroke();

      ctx.fillStyle = "#ea580c";
      ctx.font = "900 62px 'Noto Sans TC', 'Microsoft JhengHei', sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("！", 64, 56);
      ctx.restore();
      sharedExclTexture = new THREE.CanvasTexture(c);
      sharedExclTexture.minFilter = THREE.LinearFilter;
    }
    const mat = new THREE.SpriteMaterial({
      map: sharedExclTexture,
      transparent: true,
      depthTest: false,
      toneMapped: false
    });
    const sp = new THREE.Sprite(mat);
    sp.scale.set(0.001, 0.001, 1);
    sp.visible = false;
    sp.renderOrder = 25;
    sp.userData.targetScale = scaleSize;
    return sp;
  }

  function createBinaryBellyTexture() {
    const c = document.createElement("canvas");
    c.width = 128;
    c.height = 128;
    const ctx = c.getContext("2d");
    ctx.fillStyle = "#f6eac2";
    ctx.beginPath();
    ctx.arc(64, 64, 58, 0, Math.PI * 2);
    ctx.fill();
    ctx.lineWidth = 6;
    ctx.strokeStyle = "#2ec4b6";
    ctx.stroke();
    ctx.fillStyle = "#0f172a";
    ctx.font = "900 54px 'Courier New', 'Noto Sans TC', monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("0 1", 64, 68);
    const tex = new THREE.CanvasTexture(c);
    tex.minFilter = THREE.LinearFilter;
    return tex;
  }

  const GUARDIAN_NPC_SPECS = {
    sys: {
      name: "水獺工程師阿水",
      title: "🖥️ 電腦探險島 · 守護島民",
      emoji: "🦦",
      color: "#4fb3ff",
      homeOffset: new THREE.Vector3(0.18, GROUND_TOP_Y.ISLAND_TURF, 2.15),
      quotes: [
        "🛠️ 電腦當機先別敲螢幕！90% 的疑難雜症，「存檔＋重開機」都能溫柔化解喔嘎～",
        "💡 CPU 是大腦、RAM 是工作桌，瀏覽器一次開 100 個分頁，水獺也會累到翻肚啦！",
        "🔌 主機背後線材像義大利麵？認明 USB、HDMI 防呆缺口，對準再插才不會歪針腳嘎！"
      ]
    },
    citizen: {
      name: "巡邏犬警長布魯",
      title: "🛡️ 數位公民島 · 守護島民",
      emoji: "🐕",
      color: "#ff8a65",
      homeOffset: new THREE.Vector3(0.15, GROUND_TOP_Y.ISLAND_TURF, 2.15),
      quotes: [
        "🐾 汪！密碼設成「123456」就像把家門鑰匙掛在狗項圈上，駭客看了都搖尾巴！",
        "🔍 收到「恭喜中獎點此領取」先別衝動！拿起放大鏡看清假網址，別被釣魚網站騙走個資汪！",
        "🛡️ 網路留言跟現實說話一樣有重量，做個溫暖有禮的數位好公民，布魯給你蓋榮譽章！"
      ]
    },
    create: {
      name: "變色龍畫家卡蜜",
      title: "🎨 創作協作島 · 守護島民",
      emoji: "🦎",
      color: "#c58bff",
      homeOffset: new THREE.Vector3(0.22, GROUND_TOP_Y.ISLAND_TURF, 2.12),
      quotes: [
        "🎨 借用別人的美圖與音樂記得看清楚「創用 CC」授權標章，尊重原創讓作品更閃亮唷～",
        "🌈 雲端共編簡報最怕隊友誤刪？打開「版本歷史紀錄」，一秒鐘就能變回完美畫布！",
        "✨ 點陣圖放大會變成馬賽克方塊，向量圖怎麼拉都滑順，就像我的漸層保護色一樣咕嚕～"
      ]
    },
    code: {
      name: "工匠狸點點",
      title: "🌲 程式森林島 · 守護島民",
      emoji: "🦝",
      color: "#5fd18b",
      homeOffset: new THREE.Vector3(0.0, GROUND_TOP_Y.ISLAND_TURF, 2.08),
      quotes: [
        "🍃 寫程式少打一個冒號或縮排歪掉，Bug 就會像橡果一樣從樹上掉下來砸頭狸！",
        "🧱 學會 For 迴圈，重複搬 100 塊三色積木只要三行指令，省下的時間拿來睡午覺狸～",
        "🌲 If 天氣晴朗 Then 出海探險 Else 在樹屋寫扣——這就是最實用的條件判斷式狸！"
      ]
    },
    algo: {
      name: "思維白鶴仙人",
      title: "⛰️ 演算法山 · 守護島民",
      emoji: "🦢",
      color: "#ffd166",
      homeOffset: new THREE.Vector3(0.22, GROUND_TOP_Y.ISLAND_TURF, 2.15),
      quotes: [
        "🦢 翻字典找字若從第一頁傻傻翻，天黑也找不到；用「二分搜尋法」，七步之內必見真章。",
        "⛰️ 動手寫程式前先畫好流程圖，就像登山前先看等高線，邏輯通了自然步步生風。",
        "🍃 泡沫排序一步步交換、快速排序分而治之，選對演算法，單腳站立未酸便已算完。"
      ]
    },
    data: {
      name: "海獺搬運工",
      title: "📊 資料海灣 · 守護島民",
      emoji: "🦦",
      color: "#2ec4b6",
      homeOffset: new THREE.Vector3(0.22, GROUND_TOP_Y.ISLAND_TURF, 3.45),
      quotes: [
        "🛢️ 電腦肚子裡只有 0 跟 1！連我最愛吃的蛤蜊高畫質美照，拆開來也全都是 0101 喔！",
        "📊 俗話說「垃圾進、垃圾出（GIGO）」，先把空值跟錯字清理乾淨，圖表才不會說謊唷～",
        "🌊 8 個 Bit 裝成 1 個 Byte 小資料桶，記得定期異地備份，就不怕海浪把作業沖走啦！"
      ]
    },
    ai: {
      name: "懸浮小助理 Pixel",
      title: "🤖 AI 智慧島 · 守護島民",
      emoji: "🤖",
      color: "#ff6fb5",
      homeOffset: new THREE.Vector3(0.12, GROUND_TOP_Y.ISLAND_TURF, 2.12),
      quotes: [
        "🤖 嗶嗶！生成式 AI 偶爾也會「一本正經地胡說八道（幻覺）」，重要事實記得親自查證喔！",
        "✨ 我不是會讀心魔法，我只是從巨量資料中努力算機率！人類的同理心與創意才是無價超能力嗶～",
        "📡 訓練資料如果偏心，AI 判斷也會跟著歪掉；公平、透明與負責任才是智慧島的最高準則！"
      ]
    }
  };

  function createGuardianNPC(islandId, spec, idx) {
    const root = new THREE.Group();
    root.name = `guardianNPC_${islandId}`;
    root.userData = {
      isGuardianNPC: true,
      npcId: islandId,
      npcName: spec.name
    };

    const bodyPivot = new THREE.Group();
    root.add(bodyPivot);

    const headPivot = new THREE.Group();
    bodyPivot.add(headPivot);

    const leftArm = new THREE.Group();
    const rightArm = new THREE.Group();
    bodyPivot.add(leftArm);
    bodyPivot.add(rightArm);

    const workProps = new THREE.Group();
    workProps.name = "workProps";
    root.add(workProps);

    const animRefs = {};

    // 腳底柔和陰影圓盤
    const shadowGeo = new THREE.CircleGeometry(0.48, 16);
    shadowGeo.rotateX(-Math.PI / 2);
    const shadowMat = new THREE.MeshBasicMaterial({
      color: 0x0a2239,
      transparent: true,
      opacity: 0.26,
      depthWrite: false
    });
    const shadowMesh = new THREE.Mesh(shadowGeo, shadowMat);
    shadowMesh.position.y = 0.03;
    root.add(shadowMesh);

    // 透明點擊偵測膠囊（讓校園平板或滑鼠點擊 NPC 任何部位皆靈敏觸發）
    const hitGeo = new THREE.CylinderGeometry(0.75, 0.75, 1.95, 8);
    const hitMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0,
      depthWrite: false
    });
    const hitMesh = new THREE.Mesh(hitGeo, hitMat);
    hitMesh.position.y = 0.95;
    hitMesh.userData = { isGuardianNPC: true, npcId: islandId };
    root.add(hitMesh);

    const stdMat = (color, opts = {}) =>
      new THREE.MeshStandardMaterial({
        color,
        flatShading: opts.flatShading ?? true,
        roughness: opts.roughness ?? 0.55,
        metalness: opts.metalness ?? 0.06,
        emissive: opts.emissive ?? 0x000000,
        emissiveIntensity: opts.emissiveIntensity ?? 0,
        transparent: opts.transparent ?? false,
        opacity: opts.opacity ?? 1
      });

    const eyeDarkMat = new THREE.MeshBasicMaterial({ color: 0x111827 });
    const whiteMat = stdMat(0xffffff, { roughness: 0.45 });
    const blushMat = new THREE.MeshBasicMaterial({ color: 0xff8fa3, transparent: true, opacity: 0.78 });

    switch (islandId) {
      /* ----------------------------------------------------------
       * 1. 🖥️ 電腦探險島：【水獺工程師阿水】
       *    棕色圓角身軀、額頭護目鏡、手持小扳手，有規律敲擊小石塊的微動作
       * ---------------------------------------------------------- */
      case "sys": {
        const otterBrown = stdMat(0x7f4f24, { roughness: 0.62 });
        const otterCream = stdMat(0xe6ccb2, { roughness: 0.58 });
        const brassMat = stdMat(0xf59e0b, { roughness: 0.3, metalness: 0.55 });
        const lensMat = stdMat(0x48cae4, { emissive: 0x0096c7, emissiveIntensity: 0.75, roughness: 0.18 });
        const steelMat = stdMat(0xcbd5e1, { roughness: 0.28, metalness: 0.65 });

        // 棕色圓角身軀
        const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.27, 0.35, 0.58, 12), otterBrown);
        torso.position.y = 0.44;
        torso.castShadow = true;
        bodyPivot.add(torso);

        const belly = new THREE.Mesh(new THREE.SphereGeometry(0.26, 10, 10), otterCream);
        belly.scale.set(0.88, 1.08, 0.42);
        belly.position.set(0, 0.43, 0.24);
        bodyPivot.add(belly);

        const tail = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.48, 7), otterBrown);
        tail.rotation.x = -Math.PI / 2.6;
        tail.position.set(0, 0.26, -0.36);
        bodyPivot.add(tail);

        [-0.14, 0.14].forEach((lx) => {
          const foot = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 8), otterBrown);
          foot.scale.set(0.9, 0.65, 1.35);
          foot.position.set(lx, 0.08, 0.06);
          bodyPivot.add(foot);
        });

        // 水獺圓頭與嘴鼻墊
        headPivot.position.set(0, 0.94, 0);
        const head = new THREE.Mesh(new THREE.SphereGeometry(0.34, 12, 10), otterBrown);
        head.scale.set(1.06, 0.95, 1.0);
        head.castShadow = true;
        headPivot.add(head);

        [-0.28, 0.28].forEach((ex) => {
          const ear = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 8), otterBrown);
          ear.position.set(ex, 0.2, -0.02);
          headPivot.add(ear);
        });

        const muzzleL = new THREE.Mesh(new THREE.SphereGeometry(0.11, 8, 8), otterCream);
        muzzleL.position.set(-0.07, -0.06, 0.3);
        headPivot.add(muzzleL);
        const muzzleR = muzzleL.clone();
        muzzleR.position.x = 0.07;
        headPivot.add(muzzleR);

        const nose = new THREE.Mesh(new THREE.SphereGeometry(0.055, 8, 8), eyeDarkMat);
        nose.position.set(0, -0.01, 0.38);
        headPivot.add(nose);

        [-0.13, 0.13].forEach((ex) => {
          const eye = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 8), eyeDarkMat);
          eye.position.set(ex, 0.05, 0.32);
          headPivot.add(eye);
        });

        // 額頭護目鏡 (Goggles on forehead)
        const strap = new THREE.Mesh(new THREE.CylinderGeometry(0.345, 0.345, 0.08, 12), stdMat(0x1e293b));
        strap.position.y = 0.17;
        headPivot.add(strap);

        [-0.13, 0.13].forEach((gx) => {
          const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.1, 10), brassMat);
          rim.rotation.x = Math.PI / 2;
          rim.position.set(gx, 0.18, 0.29);
          headPivot.add(rim);

          const lens = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.085, 0.11, 10), lensMat);
          lens.rotation.x = Math.PI / 2;
          lens.position.set(gx, 0.18, 0.3);
          headPivot.add(lens);
        });

        // 左右手臂與手持小扳手
        leftArm.position.set(-0.31, 0.58, 0.04);
        const lPaw = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 8), otterBrown);
        lPaw.scale.set(0.85, 1.45, 0.85);
        lPaw.position.set(-0.03, -0.12, 0.05);
        leftArm.add(lPaw);

        rightArm.position.set(0.31, 0.58, 0.06);
        const rPaw = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 8), otterBrown);
        rPaw.scale.set(0.85, 1.45, 0.85);
        rPaw.position.set(0.03, -0.12, 0.08);
        rightArm.add(rPaw);

        // 小扳手 (Wrench)
        const wrenchGroup = new THREE.Group();
        wrenchGroup.position.set(0.04, -0.22, 0.16);
        wrenchGroup.rotation.x = Math.PI / 2.2;
        const wShaft = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.36, 0.04), steelMat);
        wShaft.position.y = 0.12;
        wrenchGroup.add(wShaft);
        const wHeadL = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.12, 0.045), steelMat);
        wHeadL.position.set(-0.055, 0.32, 0);
        wrenchGroup.add(wHeadL);
        const wHeadR = wHeadL.clone();
        wHeadR.position.x = 0.055;
        wrenchGroup.add(wHeadR);
        const wBase = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.05, 0.045), steelMat);
        wBase.position.set(0, 0.27, 0);
        wrenchGroup.add(wBase);
        rightArm.add(wrenchGroup);
        animRefs.handTool = wrenchGroup;

        // 面前被規律敲擊的小石塊與晶體
        const rockHolder = new THREE.Group();
        rockHolder.position.set(0.24, 0.18, 0.52);
        const smallRock = new THREE.Mesh(
          new THREE.DodecahedronGeometry(0.22, 0),
          stdMat(0x64748b, { roughness: 0.78 })
        );
        smallRock.scale.set(1.15, 0.85, 1.05);
        smallRock.castShadow = true;
        rockHolder.add(smallRock);

        const chipCrystal = new THREE.Mesh(
          new THREE.OctahedronGeometry(0.1, 0),
          lensMat
        );
        chipCrystal.position.set(0, 0.18, 0);
        rockHolder.add(chipCrystal);

        const sparkRingGeo = new THREE.RingGeometry(0.12, 0.22, 12);
        sparkRingGeo.rotateX(-Math.PI / 2);
        const sparkMat = new THREE.MeshBasicMaterial({
          color: 0xffd166,
          transparent: true,
          opacity: 0,
          side: THREE.DoubleSide
        });
        const sparkRing = new THREE.Mesh(sparkRingGeo, sparkMat);
        sparkRing.position.y = 0.24;
        rockHolder.add(sparkRing);

        workProps.add(rockHolder);
        animRefs.sysRock = rockHolder;
        animRefs.sysSparkRing = sparkRing;
        animRefs.sysSparkMat = sparkMat;
        break;
      }

      /* ----------------------------------------------------------
       * 2. 🛡️ 數位公民島：【巡邏犬警長布魯】
       *    黃白柴犬造型、戴深藍警帽、持放大鏡低頭探查
       * ---------------------------------------------------------- */
      case "citizen": {
        const shibaGold = stdMat(0xe9963e, { roughness: 0.56 });
        const shibaWhite = stdMat(0xf8fafc, { roughness: 0.5 });
        const policeNavy = stdMat(0x16294a, { roughness: 0.42 });
        const goldBadgeMat = stdMat(0xffd166, { emissive: 0xd97706, emissiveIntensity: 0.35, metalness: 0.5 });

        const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.34, 0.56, 12), shibaGold);
        torso.position.y = 0.44;
        torso.castShadow = true;
        bodyPivot.add(torso);

        const chestWhite = new THREE.Mesh(new THREE.SphereGeometry(0.25, 10, 10), shibaWhite);
        chestWhite.scale.set(0.88, 1.05, 0.44);
        chestWhite.position.set(0, 0.45, 0.23);
        bodyPivot.add(chestWhite);

        // 柴犬捲尾
        const shibaTail = new THREE.Mesh(
          new THREE.TorusGeometry(0.13, 0.055, 6, 12, Math.PI * 1.35),
          shibaGold
        );
        shibaTail.position.set(0, 0.42, -0.32);
        shibaTail.rotation.y = Math.PI / 2;
        bodyPivot.add(shibaTail);
        animRefs.citizenTail = shibaTail;

        [-0.14, 0.14].forEach((lx) => {
          const paw = new THREE.Mesh(new THREE.SphereGeometry(0.11, 8, 8), shibaWhite);
          paw.scale.set(0.9, 0.75, 1.25);
          paw.position.set(lx, 0.085, 0.05);
          bodyPivot.add(paw);
        });

        // 柴犬頭部與三角立耳
        headPivot.position.set(0, 0.95, 0.04);
        const head = new THREE.Mesh(new THREE.SphereGeometry(0.34, 12, 10), shibaGold);
        head.scale.set(1.06, 0.96, 1.02);
        head.castShadow = true;
        headPivot.add(head);

        const snout = new THREE.Mesh(new THREE.ConeGeometry(0.17, 0.24, 8), shibaWhite);
        snout.rotation.x = Math.PI / 2;
        snout.position.set(0, -0.05, 0.32);
        headPivot.add(snout);

        const nose = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 8), eyeDarkMat);
        nose.position.set(0, -0.02, 0.44);
        headPivot.add(nose);

        // 柴犬招牌白眉毛圓點與雙眼
        [-0.13, 0.13].forEach((ex) => {
          const eye = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 8), eyeDarkMat);
          eye.position.set(ex, 0.05, 0.31);
          headPivot.add(eye);

          const brow = new THREE.Mesh(new THREE.SphereGeometry(0.035, 6, 6), shibaWhite);
          brow.position.set(ex * 0.95, 0.13, 0.31);
          headPivot.add(brow);

          const ear = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.26, 4), shibaGold);
          ear.position.set(ex * 1.65, 0.28, -0.02);
          ear.rotation.z = ex < 0 ? 0.22 : -0.22;
          headPivot.add(ear);
        });

        // 深藍警帽 (Deep Navy Police Cap)
        const capGroup = new THREE.Group();
        capGroup.position.set(0, 0.28, 0.02);
        const capCrown = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.28, 0.17, 8), policeNavy);
        capCrown.castShadow = true;
        capGroup.add(capCrown);

        const capBrim = new THREE.Mesh(
          new THREE.CylinderGeometry(0.26, 0.26, 0.045, 10),
          stdMat(0x0f172a, { roughness: 0.25 })
        );
        capBrim.scale.set(1.05, 1, 0.72);
        capBrim.position.set(0, -0.06, 0.18);
        capBrim.rotation.x = 0.2;
        capGroup.add(capBrim);

        const badge = new THREE.Mesh(new THREE.OctahedronGeometry(0.065, 0), goldBadgeMat);
        badge.position.set(0, 0.02, 0.29);
        capGroup.add(badge);
        headPivot.add(capGroup);

        // 手臂與放大鏡 (Magnifying Glass)
        leftArm.position.set(-0.31, 0.56, 0.04);
        const lArmMesh = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 8), shibaGold);
        lArmMesh.scale.set(0.85, 1.4, 0.85);
        lArmMesh.position.set(-0.02, -0.12, 0.04);
        leftArm.add(lArmMesh);

        rightArm.position.set(0.31, 0.56, 0.08);
        const rArmMesh = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 8), shibaGold);
        rArmMesh.scale.set(0.85, 1.4, 0.85);
        rArmMesh.position.set(0.02, -0.12, 0.06);
        rightArm.add(rArmMesh);

        const magGroup = new THREE.Group();
        magGroup.position.set(0.02, -0.22, 0.18);
        magGroup.rotation.x = Math.PI / 2.6;
        const magHandle = new THREE.Mesh(
          new THREE.CylinderGeometry(0.032, 0.038, 0.26, 8),
          stdMat(0x5c3a21)
        );
        magHandle.position.y = 0.1;
        magGroup.add(magHandle);

        const magRim = new THREE.Mesh(new THREE.TorusGeometry(0.17, 0.03, 8, 16), goldBadgeMat);
        magRim.position.y = 0.38;
        magGroup.add(magRim);

        const magLens = new THREE.Mesh(
          new THREE.CylinderGeometry(0.155, 0.155, 0.02, 14),
          stdMat(0x90e0ef, {
            emissive: 0x00b4d8,
            emissiveIntensity: 0.45,
            transparent: true,
            opacity: 0.65,
            roughness: 0.15
          })
        );
        magLens.rotation.x = Math.PI / 2;
        magLens.position.y = 0.38;
        magGroup.add(magLens);

        rightArm.add(magGroup);
        animRefs.handTool = magGroup;
        break;
      }

      /* ----------------------------------------------------------
       * 3. 🎨 創作協作島：【變色龍畫家卡蜜】
       *    圓眼、捲曲尾巴、旁有迷你調色盤畫架，身體顏色微幅漸層變換
       * ---------------------------------------------------------- */
      case "create": {
        const camiSkinMat = stdMat(0x5fd18b, {
          roughness: 0.46,
          emissive: 0x1b4332,
          emissiveIntensity: 0.18
        });
        animRefs.camiSkinMat = camiSkinMat;

        const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.33, 0.56, 12), camiSkinMat);
        torso.position.y = 0.43;
        torso.castShadow = true;
        bodyPivot.add(torso);

        // 背部小棘刺
        for (let s = 0; s < 4; s++) {
          const spine = new THREE.Mesh(new THREE.ConeGeometry(0.045, 0.1, 4), goldMatScalar());
          spine.rotation.x = -Math.PI / 2;
          spine.position.set(0, 0.3 + s * 0.11, -0.3);
          bodyPivot.add(spine);
        }
        function goldMatScalar() {
          return stdMat(0xffd166, { roughness: 0.4 });
        }

        // 捲曲尾巴 (Coiled Spiral Tail)
        const tailGroup = new THREE.Group();
        tailGroup.position.set(0, 0.32, -0.36);
        const outerCoil = new THREE.Mesh(
          new THREE.TorusGeometry(0.18, 0.06, 8, 16, Math.PI * 1.65),
          camiSkinMat
        );
        outerCoil.rotation.y = Math.PI / 2;
        tailGroup.add(outerCoil);
        const innerCoil = new THREE.Mesh(
          new THREE.TorusGeometry(0.09, 0.045, 6, 12, Math.PI * 1.5),
          camiSkinMat
        );
        innerCoil.rotation.y = Math.PI / 2;
        innerCoil.position.set(0, 0.02, -0.04);
        tailGroup.add(innerCoil);
        bodyPivot.add(tailGroup);
        animRefs.createTail = tailGroup;

        [-0.14, 0.14].forEach((lx) => {
          const foot = new THREE.Mesh(new THREE.SphereGeometry(0.11, 8, 8), camiSkinMat);
          foot.scale.set(0.9, 0.7, 1.3);
          foot.position.set(lx, 0.08, 0.05);
          bodyPivot.add(foot);
        });

        // 變色龍頭冠與大圓眼 (Turret Eyes)
        headPivot.position.set(0, 0.94, 0.04);
        const head = new THREE.Mesh(new THREE.SphereGeometry(0.32, 12, 10), camiSkinMat);
        head.scale.set(1.0, 0.96, 1.12);
        head.castShadow = true;
        headPivot.add(head);

        const casque = new THREE.Mesh(new THREE.ConeGeometry(0.24, 0.34, 5), camiSkinMat);
        casque.position.set(0, 0.28, -0.08);
        casque.rotation.x = -0.35;
        headPivot.add(casque);

        [-0.22, 0.22].forEach((ex, eIdx) => {
          const eyeTurret = new THREE.Group();
          eyeTurret.position.set(ex, 0.08, 0.24);
          const pod = new THREE.Mesh(new THREE.SphereGeometry(0.11, 10, 10), camiSkinMat);
          eyeTurret.add(pod);
          const sclera = new THREE.Mesh(new THREE.SphereGeometry(0.085, 8, 8), whiteMat);
          sclera.position.z = 0.05;
          eyeTurret.add(sclera);
          const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 8), eyeDarkMat);
          pupil.position.z = 0.11;
          eyeTurret.add(pupil);
          headPivot.add(eyeTurret);
          if (eIdx === 0) animRefs.camiEyeL = eyeTurret;
          else animRefs.camiEyeR = eyeTurret;
        });

        // 手臂與畫筆
        leftArm.position.set(-0.29, 0.56, 0.05);
        const lHand = new THREE.Mesh(new THREE.SphereGeometry(0.095, 8, 8), camiSkinMat);
        lHand.scale.set(0.85, 1.4, 0.85);
        lHand.position.set(-0.02, -0.12, 0.04);
        leftArm.add(lHand);

        rightArm.position.set(0.29, 0.56, 0.06);
        const rHand = new THREE.Mesh(new THREE.SphereGeometry(0.095, 8, 8), camiSkinMat);
        rHand.scale.set(0.85, 1.4, 0.85);
        rHand.position.set(0.02, -0.12, 0.06);
        rightArm.add(rHand);

        const brushGroup = new THREE.Group();
        brushGroup.position.set(0.02, -0.2, 0.14);
        brushGroup.rotation.x = Math.PI / 2.3;
        const bStick = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.028, 0.34, 6), stdMat(0x8d5b3c));
        bStick.position.y = 0.12;
        brushGroup.add(bStick);
        const bTip = new THREE.Mesh(
          new THREE.ConeGeometry(0.045, 0.11, 6),
          stdMat(0xff6fb5, { emissive: 0xf72585, emissiveIntensity: 0.4 })
        );
        bTip.position.y = 0.33;
        brushGroup.add(bTip);
        rightArm.add(brushGroup);
        animRefs.handTool = brushGroup;

        // 旁側迷你調色盤畫架 (Mini Palette & Easel)
        const miniEasel = new THREE.Group();
        miniEasel.position.set(0.58, 0, 0.25);
        miniEasel.rotation.y = -0.45;
        const woodE = stdMat(0xc88a52, { roughness: 0.78 });
        [-0.18, 0.18].forEach((lx) => {
          const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.035, 0.92, 6), woodE);
          leg.position.set(lx, 0.44, 0.06);
          leg.rotation.z = lx < 0 ? -0.12 : 0.12;
          miniEasel.add(leg);
        });
        const backLeg = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.035, 0.9, 6), woodE);
        backLeg.position.set(0, 0.42, -0.18);
        backLeg.rotation.x = 0.26;
        miniEasel.add(backLeg);

        const miniBoard = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.44, 0.05), whiteMat);
        miniBoard.position.set(0, 0.58, 0.09);
        miniBoard.rotation.x = -0.12;
        miniBoard.castShadow = true;
        miniEasel.add(miniBoard);

        // 畫架旁迷你調色盤與色點
        const palette = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.035, 10), woodE);
        palette.scale.set(1.25, 1, 0.9);
        palette.position.set(0, 0.34, 0.22);
        palette.rotation.x = 0.35;
        miniEasel.add(palette);

        [0xff595e, 0xffca3a, 0x1982c4, 0x8ac926].forEach((dc, dIdx) => {
          const a = (dIdx / 4) * Math.PI * 1.4 - 0.5;
          const dot = new THREE.Mesh(new THREE.SphereGeometry(0.042, 6, 6), stdMat(dc));
          dot.position.set(Math.cos(a) * 0.13, 0.37, 0.22 + Math.sin(a) * 0.09);
          miniEasel.add(dot);
        });

        workProps.add(miniEasel);
        break;
      }

      /* ----------------------------------------------------------
       * 4. 🌲 程式森林島：【工匠狸點點】
       *    圓滾滾小狸貓、頭頂小綠葉，面前放置紅黃藍三色積木方塊並上下拼裝
       * ---------------------------------------------------------- */
      case "code": {
        const tanukiBrown = stdMat(0x8d5b3c, { roughness: 0.65 });
        const tanukiDark = stdMat(0x4a2c11, { roughness: 0.7 });
        const tanukiCream = stdMat(0xf3d5b5, { roughness: 0.58 });
        const leafGreen = stdMat(0x5fd18b, { emissive: 0x2dc653, emissiveIntensity: 0.32 });

        // 圓滾滾小狸貓身軀
        const chubbyBody = new THREE.Mesh(new THREE.SphereGeometry(0.38, 12, 10), tanukiBrown);
        chubbyBody.scale.set(1.06, 0.96, 1.02);
        chubbyBody.position.y = 0.42;
        chubbyBody.castShadow = true;
        bodyPivot.add(chubbyBody);

        const belly = new THREE.Mesh(new THREE.SphereGeometry(0.29, 10, 10), tanukiCream);
        belly.scale.set(0.92, 0.95, 0.45);
        belly.position.set(0, 0.41, 0.26);
        bodyPivot.add(belly);

        // 蓬鬆狸貓大尾巴
        const bushyTail = new THREE.Mesh(new THREE.SphereGeometry(0.18, 8, 8), tanukiBrown);
        bushyTail.scale.set(0.85, 0.85, 1.55);
        bushyTail.position.set(0, 0.28, -0.4);
        bushyTail.rotation.x = 0.35;
        bodyPivot.add(bushyTail);

        [-0.15, 0.15].forEach((lx) => {
          const foot = new THREE.Mesh(new THREE.SphereGeometry(0.11, 8, 8), tanukiDark);
          foot.scale.set(0.95, 0.7, 1.25);
          foot.position.set(lx, 0.08, 0.05);
          bodyPivot.add(foot);
        });

        // 狸貓圓頭、深色眼罩花紋與頭頂小綠葉
        headPivot.position.set(0, 0.92, 0.03);
        const head = new THREE.Mesh(new THREE.SphereGeometry(0.35, 12, 10), tanukiBrown);
        head.scale.set(1.08, 0.95, 1.0);
        head.castShadow = true;
        headPivot.add(head);

        [-0.14, 0.14].forEach((ex) => {
          const maskPatch = new THREE.Mesh(new THREE.SphereGeometry(0.11, 8, 8), tanukiDark);
          maskPatch.scale.set(1.1, 0.88, 0.45);
          maskPatch.position.set(ex, 0.04, 0.29);
          headPivot.add(maskPatch);

          const eye = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 8), whiteMat);
          eye.position.set(ex, 0.05, 0.34);
          headPivot.add(eye);

          const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.028, 6, 6), eyeDarkMat);
          pupil.position.set(ex, 0.05, 0.37);
          headPivot.add(pupil);

          const ear = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 8), tanukiDark);
          ear.position.set(ex * 1.85, 0.25, -0.02);
          headPivot.add(ear);
        });

        const snout = new THREE.Mesh(new THREE.SphereGeometry(0.11, 8, 8), tanukiCream);
        snout.scale.set(1.15, 0.85, 0.9);
        snout.position.set(0, -0.06, 0.32);
        headPivot.add(snout);

        const nose = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 8), eyeDarkMat);
        nose.position.set(0, -0.03, 0.4);
        headPivot.add(nose);

        // 頭頂小綠葉
        const leafPivot = new THREE.Group();
        leafPivot.position.set(0, 0.33, 0);
        const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.025, 0.14, 5), leafGreen);
        stem.position.y = 0.06;
        leafPivot.add(stem);
        const leafBlade = new THREE.Mesh(new THREE.OctahedronGeometry(0.16, 0), leafGreen);
        leafBlade.scale.set(1.35, 0.32, 0.85);
        leafBlade.position.set(0.06, 0.14, 0);
        leafBlade.rotation.z = -0.25;
        leafPivot.add(leafBlade);
        headPivot.add(leafPivot);
        animRefs.codeLeaf = leafPivot;

        leftArm.position.set(-0.33, 0.54, 0.08);
        const lPaw = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 8), tanukiBrown);
        lPaw.scale.set(0.88, 1.35, 0.88);
        lPaw.position.set(0, -0.1, 0.08);
        leftArm.add(lPaw);

        rightArm.position.set(0.33, 0.54, 0.08);
        const rPaw = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 8), tanukiBrown);
        rPaw.scale.set(0.88, 1.35, 0.88);
        rPaw.position.set(0, -0.1, 0.08);
        rightArm.add(rPaw);

        // 面前紅、黃、藍三色積木方塊 (Red, Yellow, Blue Blocks)
        const blocksHolder = new THREE.Group();
        blocksHolder.position.set(0, 0, 0.62);

        const makeLegoBlock = (col, sizeW) => {
          const grp = new THREE.Group();
          const bMat = stdMat(col, { roughness: 0.38 });
          const box = new THREE.Mesh(new THREE.BoxGeometry(sizeW, 0.24, sizeW), bMat);
          box.castShadow = true;
          grp.add(box);
          const stud = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.06, 8), bMat);
          stud.position.y = 0.15;
          grp.add(stud);
          return grp;
        };

        const blockRed = makeLegoBlock(0xff595e, 0.38);
        const blockYellow = makeLegoBlock(0xffca3a, 0.34);
        const blockBlue = makeLegoBlock(0x1982c4, 0.3);
        blocksHolder.add(blockRed, blockYellow, blockBlue);
        workProps.add(blocksHolder);

        animRefs.blockRed = blockRed;
        animRefs.blockYellow = blockYellow;
        animRefs.blockBlue = blockBlue;
        break;
      }

      /* ----------------------------------------------------------
       * 5. ⛰️ 演算法山：【思維白鶴仙人】
       *    細長雙腿、身披羽翼斗笠，於石碑旁單腳獨立沈思
       * ---------------------------------------------------------- */
      case "algo": {
        const craneWhite = stdMat(0xf8fafc, { roughness: 0.46 });
        const craneBlack = stdMat(0x1e293b, { roughness: 0.55 });
        const craneLegAmber = stdMat(0xf4a261, { roughness: 0.5 });
        const hatStraw = stdMat(0xd4a373, { roughness: 0.75 });
        const crownRed = stdMat(0xe63946, { emissive: 0x9d0208, emissiveIntensity: 0.25 });
        const runeGold = stdMat(0xffd166, { emissive: 0xffb703, emissiveIntensity: 0.85 });

        // 單腳獨立之細長左腿 (Standing Leg) + 彎曲抬起之右腿 (Raised Meditation Leg)
        const standLeg = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.036, 0.62, 6), craneLegAmber);
        standLeg.position.set(-0.07, 0.31, 0);
        standLeg.castShadow = true;
        bodyPivot.add(standLeg);

        const raisedLegGroup = new THREE.Group();
        raisedLegGroup.position.set(0.09, 0.52, 0.04);
        const upperLeg = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.032, 0.28, 6), craneLegAmber);
        upperLeg.rotation.x = -Math.PI / 3;
        upperLeg.position.set(0, -0.06, 0.1);
        raisedLegGroup.add(upperLeg);
        const lowerLeg = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.03, 0.26, 6), craneLegAmber);
        lowerLeg.rotation.x = Math.PI / 5;
        lowerLeg.position.set(0, -0.22, 0.14);
        raisedLegGroup.add(lowerLeg);
        bodyPivot.add(raisedLegGroup);
        animRefs.craneRaisedLeg = raisedLegGroup;

        // 白鶴優雅身軀與羽翼披風
        const craneTorso = new THREE.Mesh(new THREE.SphereGeometry(0.3, 12, 10), craneWhite);
        craneTorso.scale.set(0.95, 1.15, 1.22);
        craneTorso.position.y = 0.72;
        craneTorso.castShadow = true;
        bodyPivot.add(craneTorso);

        const cloakCape = new THREE.Mesh(
          new THREE.ConeGeometry(0.36, 0.52, 8),
          stdMat(0xe2e8f0, { roughness: 0.55 })
        );
        cloakCape.position.set(0, 0.82, -0.04);
        bodyPivot.add(cloakCape);

        const tailPlume = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.32, 5), craneBlack);
        tailPlume.rotation.x = -Math.PI / 2.4;
        tailPlume.position.set(0, 0.64, -0.38);
        bodyPivot.add(tailPlume);

        // 修長鶴頸與鶴首、丹頂、斗笠
        headPivot.position.set(0, 1.12, 0.06);
        const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.12, 0.36, 8), craneWhite);
        neck.position.y = 0.04;
        headPivot.add(neck);

        const head = new THREE.Mesh(new THREE.SphereGeometry(0.2, 10, 10), craneWhite);
        head.position.set(0, 0.25, 0.04);
        head.castShadow = true;
        headPivot.add(head);

        const redCrown = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 8), crownRed);
        redCrown.scale.set(1, 0.6, 1.1);
        redCrown.position.set(0, 0.41, 0.06);
        headPivot.add(redCrown);

        const beak = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.34, 5), craneLegAmber);
        beak.rotation.x = Math.PI / 2.15;
        beak.position.set(0, 0.22, 0.34);
        headPivot.add(beak);

        [-0.1, 0.1].forEach((ex) => {
          const eye = new THREE.Mesh(new THREE.SphereGeometry(0.032, 6, 6), eyeDarkMat);
          eye.position.set(ex, 0.26, 0.2);
          headPivot.add(eye);
        });

        // 羽翼斗笠 (Conical Bamboo Hat)
        const bambooHat = new THREE.Group();
        bambooHat.position.set(0, 0.44, 0.02);
        const hatCone = new THREE.Mesh(new THREE.ConeGeometry(0.54, 0.24, 12), hatStraw);
        hatCone.castShadow = true;
        bambooHat.add(hatCone);
        const hatRim = new THREE.Mesh(new THREE.TorusGeometry(0.52, 0.025, 6, 16), runeGold);
        hatRim.rotation.x = Math.PI / 2;
        hatRim.position.y = -0.11;
        bambooHat.add(hatRim);
        headPivot.add(bambooHat);

        // 雙翼手臂（合十沉思 / 慶祝拍手）
        leftArm.position.set(-0.28, 0.8, 0.05);
        const lWing = new THREE.Mesh(new THREE.ConeGeometry(0.13, 0.44, 5), craneWhite);
        lWing.scale.set(0.55, 1, 1.2);
        lWing.position.set(-0.04, -0.15, 0.04);
        lWing.rotation.z = 0.25;
        leftArm.add(lWing);

        rightArm.position.set(0.28, 0.8, 0.05);
        const rWing = new THREE.Mesh(new THREE.ConeGeometry(0.13, 0.44, 5), craneWhite);
        rWing.scale.set(0.55, 1, 1.2);
        rWing.position.set(0.04, -0.15, 0.04);
        rWing.rotation.z = -0.25;
        rightArm.add(rWing);

        // 旁側演算法古石碑 (Stone Stele)
        const steleGroup = new THREE.Group();
        steleGroup.position.set(-0.58, 0, 0.14);
        steleGroup.rotation.y = 0.35;
        const steleStoneMat = stdMat(0x64748b, { roughness: 0.8 });
        const steleBase = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.16, 0.38), steleStoneMat);
        steleBase.position.y = 0.08;
        steleGroup.add(steleBase);
        const steleSlab = new THREE.Mesh(new THREE.BoxGeometry(0.46, 1.08, 0.2), steleStoneMat);
        steleSlab.position.y = 0.68;
        steleSlab.castShadow = true;
        steleGroup.add(steleSlab);
        const steleTop = new THREE.Mesh(new THREE.ConeGeometry(0.34, 0.28, 4), steleStoneMat);
        steleTop.rotation.y = Math.PI / 4;
        steleTop.scale.set(1, 1, 0.48);
        steleTop.position.y = 1.36;
        steleGroup.add(steleTop);

        // 石碑上的發光演算法菱形符文
        const steleRune = new THREE.Mesh(new THREE.OctahedronGeometry(0.13, 0), runeGold);
        steleRune.scale.set(1, 1.2, 0.35);
        steleRune.position.set(0, 0.78, 0.11);
        steleGroup.add(steleRune);
        animRefs.algoSteleRune = steleRune;

        workProps.add(steleGroup);
        break;
      }

      /* ----------------------------------------------------------
       * 6. 📊 資料海灣：【海獺搬運工】
       *    肚皮印有 0 與 1 標籤，抱著金屬資料桶在淺灘搖晃
       * ---------------------------------------------------------- */
      case "data": {
        const seaOtterBrown = stdMat(0x5c3a21, { roughness: 0.62 });
        const seaOtterTan = stdMat(0xf3e5ab, { roughness: 0.55 });
        const metalTeal = stdMat(0x94a3b8, { roughness: 0.25, metalness: 0.65 });
        const dataCyan = stdMat(0x2ec4b6, { emissive: 0x00a896, emissiveIntensity: 0.85 });

        const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.36, 0.62, 12), seaOtterBrown);
        torso.position.y = 0.45;
        torso.castShadow = true;
        bodyPivot.add(torso);

        // 肚皮印有 0 與 1 標籤 (CanvasTexture + 立體 0/1 浮雕)
        const bellyPatch = new THREE.Mesh(
          new THREE.CircleGeometry(0.26, 16),
          new THREE.MeshBasicMaterial({ map: createBinaryBellyTexture() })
        );
        bellyPatch.position.set(0, 0.34, 0.355);
        bodyPivot.add(bellyPatch);

        const zeroBadge = new THREE.Mesh(new THREE.TorusGeometry(0.065, 0.022, 6, 12), dataCyan);
        zeroBadge.position.set(-0.085, 0.34, 0.365);
        bodyPivot.add(zeroBadge);

        const oneBadge = new THREE.Mesh(new THREE.BoxGeometry(0.042, 0.16, 0.03), dataCyan);
        oneBadge.position.set(0.085, 0.34, 0.365);
        bodyPivot.add(oneBadge);

        [-0.15, 0.15].forEach((lx) => {
          const flipper = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 8), seaOtterBrown);
          flipper.scale.set(0.95, 0.6, 1.4);
          flipper.position.set(lx, 0.075, 0.06);
          bodyPivot.add(flipper);
        });

        headPivot.position.set(0, 0.96, 0.02);
        const head = new THREE.Mesh(new THREE.SphereGeometry(0.34, 12, 10), seaOtterBrown);
        head.scale.set(1.06, 0.94, 1.0);
        head.castShadow = true;
        headPivot.add(head);

        [-0.08, 0.08].forEach((mx) => {
          const cheek = new THREE.Mesh(new THREE.SphereGeometry(0.11, 8, 8), seaOtterTan);
          cheek.position.set(mx, -0.05, 0.3);
          headPivot.add(cheek);
        });

        const nose = new THREE.Mesh(new THREE.OctahedronGeometry(0.055, 0), eyeDarkMat);
        nose.position.set(0, -0.01, 0.38);
        headPivot.add(nose);

        [-0.13, 0.13].forEach((ex) => {
          const eye = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 8), eyeDarkMat);
          eye.position.set(ex, 0.06, 0.32);
          headPivot.add(eye);

          const ear = new THREE.Mesh(new THREE.SphereGeometry(0.085, 8, 8), seaOtterBrown);
          ear.position.set(ex * 2.1, 0.18, -0.02);
          headPivot.add(ear);
        });

        // 懷抱金屬資料桶 (Metallic Data Barrel)
        const barrelGroup = new THREE.Group();
        barrelGroup.position.set(0, 0.66, 0.36);
        barrelGroup.rotation.z = Math.PI / 2;
        const barrelBody = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.44, 10), metalTeal);
        barrelBody.castShadow = true;
        barrelGroup.add(barrelBody);
        [-0.13, 0.13].forEach((ry) => {
          const ring = new THREE.Mesh(new THREE.TorusGeometry(0.175, 0.022, 6, 14), dataCyan);
          ring.rotation.x = Math.PI / 2;
          ring.position.y = ry;
          barrelGroup.add(ring);
        });
        bodyPivot.add(barrelGroup);
        animRefs.dataBarrel = barrelGroup;

        leftArm.position.set(-0.31, 0.62, 0.1);
        const lHug = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 8), seaOtterBrown);
        lHug.scale.set(0.85, 1.45, 0.85);
        lHug.position.set(0.06, -0.06, 0.16);
        lHug.rotation.x = -Math.PI / 3;
        leftArm.add(lHug);

        rightArm.position.set(0.31, 0.62, 0.1);
        const rHug = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 8), seaOtterBrown);
        rHug.scale.set(0.85, 1.45, 0.85);
        rHug.position.set(-0.06, -0.06, 0.16);
        rHug.rotation.x = -Math.PI / 3;
        rightArm.add(rHug);

        // 淺灘水紋圈
        const puddleGeo = new THREE.RingGeometry(0.36, 0.66, 18);
        puddleGeo.rotateX(-Math.PI / 2);
        const puddleMat = new THREE.MeshBasicMaterial({
          color: 0x72efdd,
          transparent: true,
          opacity: 0.55,
          side: THREE.DoubleSide
        });
        const puddleRing = new THREE.Mesh(puddleGeo, puddleMat);
        puddleRing.position.y = 0.04;
        workProps.add(puddleRing);
        animRefs.dataPuddleRing = puddleRing;
        break;
      }

      /* ----------------------------------------------------------
       * 7. 🤖 AI 智慧島：【懸浮小助理 Pixel】
       *    無腳圓柱小機器人、頭頂微光天線，在空中緩慢上下浮動懸停
       * ---------------------------------------------------------- */
      case "ai":
      default: {
        const botWhite = stdMat(0xf8fafc, { roughness: 0.28, metalness: 0.18 });
        const visorBlack = stdMat(0x0f172a, { roughness: 0.2 });
        const neonPink = stdMat(0xff6fb5, { emissive: 0xf72585, emissiveIntensity: 0.85 });
        const neonCyan = stdMat(0x4cc9f0, { emissive: 0x00b4d8, emissiveIntensity: 0.9 });

        // 無腳圓柱小機器人身軀
        const cylBody = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.2, 0.52, 14), botWhite);
        cylBody.position.y = 0.42;
        cylBody.castShadow = true;
        bodyPivot.add(cylBody);

        const thrusterBottom = new THREE.Mesh(new THREE.SphereGeometry(0.19, 10, 8), neonCyan);
        thrusterBottom.scale.set(1, 0.55, 1);
        thrusterBottom.position.y = 0.16;
        bodyPivot.add(thrusterBottom);

        const chestTrim = new THREE.Mesh(new THREE.TorusGeometry(0.25, 0.03, 6, 16), neonPink);
        chestTrim.rotation.x = Math.PI / 2;
        chestTrim.position.y = 0.54;
        bodyPivot.add(chestTrim);

        // 圓柱圓頂機器人頭與頭頂微光天線
        headPivot.position.set(0, 0.88, 0);
        const headCyl = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.32, 14), botWhite);
        headCyl.castShadow = true;
        headPivot.add(headCyl);

        const headDome = new THREE.Mesh(new THREE.SphereGeometry(0.3, 12, 8), botWhite);
        headDome.scale.set(1, 0.5, 1);
        headDome.position.y = 0.15;
        headPivot.add(headDome);

        const visor = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.22, 0.12), visorBlack);
        visor.position.set(0, 0.02, 0.24);
        headPivot.add(visor);

        // 發光像素雙眼 (^ ^)
        [-0.11, 0.11].forEach((ex) => {
          const pEye = new THREE.Mesh(new THREE.BoxGeometry(0.085, 0.085, 0.03), neonCyan);
          pEye.position.set(ex, 0.03, 0.3);
          headPivot.add(pEye);
        });

        // 頭頂微光天線
        const antRod = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.035, 0.26, 6), visorBlack);
        antRod.position.y = 0.38;
        headPivot.add(antRod);

        const antOrb = new THREE.Mesh(new THREE.SphereGeometry(0.09, 10, 10), neonPink);
        antOrb.position.y = 0.54;
        headPivot.add(antOrb);

        const antHaloMat = new THREE.MeshBasicMaterial({
          color: 0xff6fb5,
          transparent: true,
          opacity: 0.45,
          blending: THREE.AdditiveBlending,
          depthWrite: false
        });
        const antHalo = new THREE.Mesh(new THREE.SphereGeometry(0.18, 10, 10), antHaloMat);
        antHalo.position.y = 0.54;
        headPivot.add(antHalo);
        animRefs.pixelAntOrb = antOrb;
        animRefs.pixelAntHalo = antHalo;
        animRefs.pixelAntHaloMat = antHaloMat;

        // 懸浮小手
        leftArm.position.set(-0.36, 0.46, 0.04);
        const lPod = new THREE.Mesh(new THREE.SphereGeometry(0.085, 8, 8), botWhite);
        lPod.scale.set(0.8, 1.35, 0.8);
        leftArm.add(lPod);

        rightArm.position.set(0.36, 0.46, 0.04);
        const rPod = new THREE.Mesh(new THREE.SphereGeometry(0.085, 8, 8), botWhite);
        rPod.scale.set(0.8, 1.35, 0.8);
        rightArm.add(rPod);

        // 地面全息懸浮光環
        const hoverRingGeo = new THREE.RingGeometry(0.24, 0.42, 18);
        hoverRingGeo.rotateX(-Math.PI / 2);
        const hoverRing = new THREE.Mesh(hoverRingGeo, neonCyan);
        hoverRing.position.y = 0.05;
        workProps.add(hoverRing);
        animRefs.pixelHoverRing = hoverRing;
        break;
      }
    }

    // 頭頂迎賓驚嘆號「！」Sprite
    const exclSprite = createExclamationSprite(1.35);
    exclSprite.position.set(0, 2.05, 0);
    root.add(exclSprite);

    root.scale.setScalar(1.16);

    return {
      id: islandId,
      index: idx,
      name: spec.name,
      title: spec.title,
      emoji: spec.emoji,
      color: spec.color,
      quotes: spec.quotes,
      quoteCursor: 0,
      homeOffset: spec.homeOffset.clone(),
      root,
      bodyPivot,
      headPivot,
      leftArm,
      rightArm,
      workProps,
      exclSprite,
      animRefs,
      greetStart: -99,
      greetDuration: 1.15,
      talkBounceStart: -99,
      phase: idx * 0.95
    };
  }

  /* ============================================================
   * 七大主題島嶼主建築細節深化產生器 (動森溫潤 Low-poly 風格)
   * 包含：立體斜屋頂瓦片層次、凸出木製窗框與暖黃發光窗戶、門口小踏階、
   * 主題立體招牌、矮木樁圍欄、建築周圍鵝卵石步道與圓滾滾花叢
   * ============================================================ */
  function buildIslandThemeHouse(isl, idx, islandRoot) {
    const houseGroup = new THREE.Group();
    // 放置於島嶼頂層高台 (y = 4.0)，微向前方微調
    houseGroup.position.set(0, 3.04, -0.35);

    const houseSpecs = {
      sys: {
        name: "🖥️ 探險工坊",
        wallCol: 0xebd9c2,
        roofMat: roofTileWarmMat,
        roofAngle: 0,
        signIco: "🖥️"
      },
      citizen: {
        name: "🛡️ 數位守護所",
        wallCol: 0xd9e2ec,
        roofMat: roofTileBlueMat,
        roofAngle: 0,
        signIco: "🛡️"
      },
      create: {
        name: "🎨 創意共創館",
        wallCol: 0xfde2e4,
        roofMat: roofTileWarmMat,
        roofAngle: 0,
        signIco: "🎨"
      },
      code: {
        name: "🌲 程式驛站",
        wallCol: 0xd8f3dc,
        roofMat: roofTileGreenMat,
        roofAngle: 0,
        signIco: "🌲"
      },
      algo: {
        name: "⛰️ 算思古閣",
        wallCol: 0xfff1e6,
        roofMat: roofTileWarmMat,
        roofAngle: 0,
        signIco: "⛰️"
      },
      data: {
        name: "📊 數據海關",
        wallCol: 0xe0f2fe,
        roofMat: roofTileBlueMat,
        roofAngle: 0,
        signIco: "📊"
      },
      ai: {
        name: "🤖 智慧中樞",
        wallCol: 0xf3e8ff,
        roofMat: roofTileWarmMat,
        roofAngle: 0,
        signIco: "🤖"
      }
    };
    const spec = houseSpecs[isl.id] || houseSpecs.sys;

    // 1. 地面鵝卵石步道 (自然蜿蜒石板路)
    const cobblePts = [
      [0, 1.35, 1.1],
      [-0.45, 1.65, 0.95],
      [0.35, 1.85, 0.9],
      [-0.2, 2.15, 1.05],
      [0.4, 2.45, 0.85],
      [-0.35, 2.75, 0.95],
      [0.1, 3.05, 1.15],
      [-0.8, 1.15, 0.8],
      [0.85, 1.25, 0.85]
    ];
    cobblePts.forEach(([cx, cz, s]) => {
      const stone = new THREE.Mesh(new THREE.CylinderGeometry(0.24 * s, 0.28 * s, 0.05, 7), cobbleStonePathMat);
      stone.position.set(cx, 0.03, cz);
      stone.rotation.y = cx * 2.5;
      stone.receiveShadow = true;
      houseGroup.add(stone);
    });

    // 2. 矮木樁圍欄 (圓潤的原木圍籬環繞花園，留出入口)
    const fencePosts = [
      [-1.9, 0.6], [-2.1, 1.2], [-2.0, 1.8], [-1.7, 2.4],
      [1.9, 0.6], [2.1, 1.2], [2.0, 1.8], [1.7, 2.4],
      [-1.2, 2.7], [1.2, 2.7]
    ];
    fencePosts.forEach(([fx, fz]) => {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.09, 0.55, 6), woodFenceMat);
      post.position.set(fx, 0.28, fz);
      post.castShadow = true;
      houseGroup.add(post);

      const cap = new THREE.Mesh(new THREE.SphereGeometry(0.095, 6, 5), woodFenceMat);
      cap.position.set(fx, 0.56, fz);
      houseGroup.add(cap);
    });
    // 橫向木欄索
    [
      [[-2.0, 0.9], [-2.05, 1.5]],
      [[2.0, 0.9], [2.05, 1.5]]
    ].forEach((pair) => {
      const rail = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 1.2, 5), woodFenceMat);
      rail.position.set(pair[0][0], 0.35, pair[0][1]);
      rail.rotation.x = Math.PI / 2;
      houseGroup.add(rail);
    });

    // 3. 主建築本體 (溫潤粉彩 Low-poly 牆面)
    const wallMat = new THREE.MeshStandardMaterial({ color: spec.wallCol, roughness: 0.72, flatShading: true });
    const mainBody = new THREE.Mesh(new THREE.BoxGeometry(2.7, 1.6, 2.1), wallMat);
    mainBody.position.set(0, 0.8, 0);
    mainBody.castShadow = true;
    mainBody.receiveShadow = true;
    houseGroup.add(mainBody);

    // 牆角立柱加固 (Timber Corner Posts)
    [-1.32, 1.32].forEach((cx) => {
      [-1.02, 1.02].forEach((cz) => {
        const cPost = new THREE.Mesh(new THREE.BoxGeometry(0.14, 1.62, 0.14), woodDarkMat);
        cPost.position.set(cx, 0.8, cz);
        cPost.castShadow = true;
        houseGroup.add(cPost);
      });
    });

    // 4. 立體斜屋頂瓦片層次 (Layered Pitched Roof with Overlapping Tiles & Eaves)
    const roofGroup = new THREE.Group();
    roofGroup.position.set(0, 1.6, 0);

    // 主斜屋頂本體
    const mainRoof = new THREE.Mesh(new THREE.ConeGeometry(2.35, 1.25, 4), spec.roofMat);
    mainRoof.position.y = 0.62;
    mainRoof.rotation.y = Math.PI / 4;
    mainRoof.scale.set(1.15, 1.0, 0.95);
    mainRoof.castShadow = true;
    roofGroup.add(mainRoof);

    // 雙層立體簷口 (Eaves Molding Layers)
    const eave1 = new THREE.Mesh(new THREE.BoxGeometry(2.95, 0.14, 2.35), woodDarkMat);
    eave1.position.y = 0.06;
    eave1.castShadow = true;
    roofGroup.add(eave1);

    const eave2 = new THREE.Mesh(new THREE.BoxGeometry(3.1, 0.08, 2.5), spec.roofMat);
    eave2.position.y = 0.14;
    eave2.castShadow = true;
    roofGroup.add(eave2);

    // 屋脊木樑 (Ridge Beam)
    const ridge = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 2.3, 6), woodDarkMat);
    ridge.position.set(0, 1.25, 0);
    ridge.rotation.x = Math.PI / 2;
    roofGroup.add(ridge);

    // 可愛小煙囪 (Chimney with Smoke Cap)
    const chimney = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.85, 0.32), stoneDarkMat);
    chimney.position.set(0.75, 0.9, -0.45);
    chimney.castShadow = true;
    roofGroup.add(chimney);
    const chimneyCap = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.1, 0.42), woodDarkMat);
    chimneyCap.position.set(0.75, 1.35, -0.45);
    roofGroup.add(chimneyCap);

    houseGroup.add(roofGroup);

    // 5. 門口小踏階與原木大門 (Wooden Entrance Doorstep & Front Door)
    const doorStep1 = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.12, 0.45), doorStepMat);
    doorStep1.position.set(0, 0.06, 1.15);
    doorStep1.receiveShadow = true;
    houseGroup.add(doorStep1);

    const doorStep2 = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.12, 0.35), woodDarkMat);
    doorStep2.position.set(0, 0.18, 1.05);
    doorStep2.receiveShadow = true;
    houseGroup.add(doorStep2);

    // 原木門與門楣
    const doorFrame = new THREE.Mesh(new THREE.BoxGeometry(0.68, 1.15, 0.08), woodDarkMat);
    doorFrame.position.set(0, 0.68, 1.04);
    houseGroup.add(doorFrame);

    const doorPanel = new THREE.Mesh(new THREE.BoxGeometry(0.56, 1.05, 0.06), woodLightMat);
    doorPanel.position.set(0, 0.65, 1.06);
    houseGroup.add(doorPanel);

    const doorKnob = new THREE.Mesh(new THREE.SphereGeometry(0.035, 6, 6), goldTrimMat);
    doorKnob.position.set(0.2, 0.65, 1.1);
    houseGroup.add(doorKnob);

    // 6. 凸出立體木製窗框與暖黃發光窗戶 (Protruding Wooden Windows with Warm Golden Light)
    function makeProtrudingWindow(wx, wy, wz, rotY = 0) {
      const winGroup = new THREE.Group();
      winGroup.position.set(wx, wy, wz);
      winGroup.rotation.y = rotY;

      // 凸出實木外框
      const frame = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.65, 0.12), windowFrameMat);
      frame.castShadow = true;
      winGroup.add(frame);

      // 下凸窗台 (Window Sill)
      const sill = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.07, 0.18), windowFrameMat);
      sill.position.set(0, -0.32, 0.04);
      winGroup.add(sill);

      // 暖黃發光窗格
      const glass = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.52, 0.06), windowWarmGlowMat);
      glass.position.z = 0.03;
      winGroup.add(glass);

      // 十字木窗櫺
      const crossH = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.04, 0.08), windowFrameMat);
      crossH.position.z = 0.05;
      winGroup.add(crossH);

      const crossV = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.52, 0.08), windowFrameMat);
      crossV.position.z = 0.05;
      winGroup.add(crossV);

      // 窗頂遮雨小木棚
      const canopy = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.06, 0.22), spec.roofMat);
      canopy.position.set(0, 0.35, 0.08);
      canopy.rotation.x = 0.25;
      winGroup.add(canopy);

      return winGroup;
    }

    // 正面兩側窗戶
    houseGroup.add(makeProtrudingWindow(-0.85, 0.85, 1.05));
    houseGroup.add(makeProtrudingWindow(0.85, 0.85, 1.05));
    // 側面窗戶
    houseGroup.add(makeProtrudingWindow(-1.36, 0.85, 0, -Math.PI / 2));
    houseGroup.add(makeProtrudingWindow(1.36, 0.85, 0, Math.PI / 2));

    // 7. 主題立體招牌 (3D Themed Signboard on Post beside Entrance)
    const signPost = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.055, 1.0, 6), signPostMat);
    signPost.position.set(0.95, 0.5, 1.45);
    signPost.castShadow = true;
    houseGroup.add(signPost);

    const signBoard = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.38, 0.08), signBoardWoodMat);
    signBoard.position.set(0.95, 0.82, 1.45);
    signBoard.castShadow = true;
    houseGroup.add(signBoard);

    const signBorder = new THREE.Mesh(new THREE.BoxGeometry(0.74, 0.44, 0.05), woodDarkMat);
    signBorder.position.set(0.95, 0.82, 1.44);
    houseGroup.add(signBorder);

    // 招牌主題色小印記
    const signBadge = new THREE.Mesh(
      new THREE.CylinderGeometry(0.12, 0.12, 0.06, 8),
      new THREE.MeshStandardMaterial({ color: isl.color || 0x4fb3ff, roughness: 0.4, emissive: isl.color || 0x4fb3ff, emissiveIntensity: 0.5 })
    );
    signBadge.position.set(0.95, 0.82, 1.5);
    signBadge.rotation.x = Math.PI / 2;
    houseGroup.add(signBadge);

    // 8. 圓滾滾花叢 (共用幾何體以減少記憶體與 Draw Call)
    const sharedBushFoliageGeo1 = new THREE.IcosahedronGeometry(0.38, 1);
    const sharedBushFoliageGeo2 = new THREE.IcosahedronGeometry(0.28, 1);
    const sharedBushBlossomGeo = new THREE.OctahedronGeometry(0.065, 0);
    function makeFlowerBush(bx, bz, scale = 1.0, flowerMat = flowerDotPinkMat) {
      const bushGroup = new THREE.Group();
      bushGroup.position.set(bx, 0.22 * scale, bz);
      bushGroup.scale.setScalar(scale);

      // 主綠色球體樹叢 (低多邊形二十面體)
      const foliage = new THREE.Mesh(sharedBushFoliageGeo1, flowerBushGreenMat);
      foliage.castShadow = true;
      bushGroup.add(foliage);

      const foliage2 = new THREE.Mesh(sharedBushFoliageGeo2, flowerBushLightGreenMat);
      foliage2.position.set(0.18, 0.12, 0.12);
      bushGroup.add(foliage2);

      // 叢上散落盛開小花朵
      const flowerOffsets = [
        [0.0, 0.36, 0.15],
        [-0.22, 0.22, 0.26],
        [0.26, 0.25, 0.18],
        [-0.15, 0.12, 0.34],
        [0.15, 0.35, -0.15],
        [-0.28, 0.2, -0.18]
      ];
      flowerOffsets.forEach(([fx, fy, fz]) => {
        const blossom = new THREE.Mesh(sharedBushBlossomGeo, flowerMat);
        blossom.position.set(fx, fy, fz);
        bushGroup.add(blossom);
      });

      return bushGroup;
    }

    // 沿著房屋正面、圍欄與角落配置圓滾滾花叢
    const bushSpecs = [
      [-1.5, 1.25, 1.15, flowerDotPinkMat],
      [-1.15, 1.45, 0.85, flowerDotYellowMat],
      [1.45, 1.25, 1.1, flowerDotWhiteMat],
      [1.65, 0.5, 0.9, flowerDotRedMat],
      [-1.7, 0.5, 0.95, flowerDotPurpleMat],
      [-0.45, 0.15, -1.2, flowerDotYellowMat],
      [0.65, 0.15, -1.2, flowerDotPinkMat]
    ];
    bushSpecs.forEach(([bx, bz, bs, fMat]) => {
      houseGroup.add(makeFlowerBush(bx, bz, bs, fMat));
    });

    islandRoot.add(houseGroup);
    return houseGroup;
  }

  ISLANDS_DATA.slice(0, 7).forEach((isl, idx) => {
    // 由正上方順時針環狀排列 7 座島嶼
    const angle = (idx / 7) * Math.PI * 2 - Math.PI / 2;
    const ix = Math.cos(angle) * ringRadius;
    const iz = Math.sin(angle) * ringRadius;

    const islandRoot = new THREE.Group();
    islandRoot.position.set(ix, 0, iz);
    islandRoot.userData = { islandId: isl.id, islandName: isl.name };

    // 1. 島嶼底座周圍半透明淡薄荷青淺灘圓環 (#38bdf8, 透明度 0.55, 浮於深水上方)
    const shallowRing = new THREE.Mesh(shallowRingGeo, shallowLagoonMat);
    shallowRing.position.y = 0.08;
    islandRoot.add(shallowRing);

    // 2. 內側沙灘浪花圈 + 淺灘外緣動態白色浪花圈 (Shore Foam：獨立材質支援呼吸縮放與淡入淡出)
    const innerFoamMat = foamMat.clone();
    const foamRing = new THREE.Mesh(foamRingGeo, innerFoamMat);
    foamRing.position.y = 0.14;
    islandRoot.add(foamRing);

    const outerFoamMat = foamMat.clone();
    const outerFoamRing = new THREE.Mesh(outerFoamRingGeo, outerFoamMat);
    outerFoamRing.position.y = 0.11;
    islandRoot.add(outerFoamRing);

    // 圓角沙灘基底（底層：海面沙灘延伸）
    const sandBase = new THREE.Mesh(sandGeometry, sandMat);
    sandBase.position.y = 0.6;
    sandBase.castShadow = true;
    sandBase.receiveShadow = true;
    islandRoot.add(sandBase);

    // 海面沙灘或木棧延伸平台 (Wooden Deck Platform Extension)
    const inwardAngle = Math.atan2(-ix, -iz);
    const beachDeck = new THREE.Mesh(new THREE.BoxGeometry(3.3, 0.22, 3.0), woodMat);
    beachDeck.position.set(0, 1.0, 8.6);
    beachDeck.rotation.y = inwardAngle;
    beachDeck.castShadow = true;
    beachDeck.receiveShadow = true;
    islandRoot.add(beachDeck);

    // 中層：綠草皮台地（配置小動物 NPC、植被、圍籬、單元標籤）
    const topColor = new THREE.Color(isl.color || "#5fd18b").lerp(new THREE.Color(0x6fd87f), 0.25);
    const turfMat = new THREE.MeshStandardMaterial({
      color: topColor,
      roughness: 0.68,
      metalness: 0.04,
      flatShading: true
    });
    const midTurfMesh = new THREE.Mesh(midTurfGeometry, turfMat);
    midTurfMesh.position.y = 2.2;
    midTurfMesh.castShadow = true;
    midTurfMesh.receiveShadow = true;
    islandRoot.add(midTurfMesh);

    // 建造該島核心主題建築（立體瓦片斜屋頂、凸出木窗框、暖黃發光窗戶、門口小階梯、主題招牌、圍欄、花叢步道）
    // 【舊單一地標已移除】改由 createIslandStageSystem 的 Stage 1/2/3 取代，避免 (0,y,0) 原點新舊穿模
    // buildIslandThemeHouse(isl, idx, islandRoot);

    // 島嶼四階段繁榮度建築子群組（level1Props, level2Props, level3Props - 頂層核心傲立）
    const { level1Props, level2Props, level3Props, animRefs: islandAnimRefs } = createIslandProsperityProps(
      isl.id,
      isl.color
    );
    // 舊四階段繁榮度小道具（帳篷、小石碑等）不再加入場景，避免與新三階段建築群重疊
    const stageSys = createIslandStageSystem(isl.id);
    islandRoot.add(stageSys.foundation);
    islandRoot.add(stageSys.tier1Group);
    islandRoot.add(stageSys.tier2Group);
    islandRoot.add(stageSys.tier3Group);
    islandRoot.add(stageSys.stageAuraGroup);
    islandRoot.userData.stageSys = stageSys;
    islandRoot.userData.tier1Group = stageSys.tier1Group;
    islandRoot.userData.tier2Group = stageSys.tier2Group;
    islandRoot.userData.tier3Group = stageSys.tier3Group;
    islandRoot.userData.level1Props = level1Props;
    islandRoot.userData.level2Props = level2Props;
    islandRoot.userData.level3Props = level3Props;

    // 動森風低多邊形小樹點綴（配置於中層綠草皮邊緣，適度放大展開）
    const tree1 = createToyTree(0x4cc970, 1.15);
    tree1.position.set(-3.85, 3.04, -1.95);
    islandRoot.add(tree1);

    const tree2 = createToyTree(0x68d886, 1.05);
    tree2.position.set(3.8, 3.04, -2.1);
    islandRoot.add(tree2);

    const tree3 = createToyTree(0x3ab764, 0.95);
    tree3.position.set(-3.3, 3.04, 2.6);
    islandRoot.add(tree3);

    // 島嶼生態與生物動態：配置於中層綠草皮台地
    const critter1 = idx % 2 === 0 ? createLowPolyBunny() : createMiniPatrolVillager(isl.color);
    const c1Excl = createExclamationSprite(0.95);
    c1Excl.position.set(0, 0.85, 0);
    critter1.root.add(c1Excl);
    const c1HomeX = -2.85;
    const c1HomeZ = 0.25;
    const c1BaseY = 3.04;
    critter1.root.position.set(c1HomeX, c1BaseY, c1HomeZ);
    islandRoot.add(critter1.root);
    islandCritters.push({
      ...critter1,
      islandId: isl.id,
      islandIndex: idx,
      exclSprite: c1Excl,
      greetStart: -99,
      greetDuration: 1.15,
      homeX: c1HomeX,
      homeZ: c1HomeZ,
      baseY: c1BaseY,
      curX: c1HomeX,
      curZ: c1HomeZ,
      targetX: c1HomeX + 0.45,
      targetZ: c1HomeZ - 0.35,
      roamRadius: 0.68,
      state: "walk",
      nextSwitchTime: idx * 0.7 + 1.2,
      speed: 0.55 + (idx % 3) * 0.12,
      phase: idx * 1.3
    });

    const critter2 = idx % 3 === 1 ? createLowPolyBunny() : createLowPolyDuck();
    const c2Excl = createExclamationSprite(0.95);
    c2Excl.position.set(0, 0.85, 0);
    critter2.root.add(c2Excl);
    const c2HomeX = idx % 2 === 0 ? 3.35 : 3.05;
    const c2HomeZ = idx % 2 === 0 ? 2.45 : 2.15;
    const c2BaseY = GROUND_TOP_Y.ISLAND_TURF;
    critter2.root.position.set(c2HomeX, c2BaseY, c2HomeZ);
    islandRoot.add(critter2.root);
    islandCritters.push({
      ...critter2,
      islandId: isl.id,
      islandIndex: idx,
      exclSprite: c2Excl,
      greetStart: -99,
      greetDuration: 1.15,
      homeX: c2HomeX,
      homeZ: c2HomeZ,
      baseY: c2BaseY,
      curX: c2HomeX,
      curZ: c2HomeZ,
      targetX: c2HomeX - 0.38,
      targetZ: c2HomeZ + 0.32,
      roamRadius: 0.55,
      state: "peck",
      nextSwitchTime: idx * 0.9 + 1.8,
      speed: 0.48 + (idx % 2) * 0.12,
      phase: idx * 2.1 + 0.8
    });

    // 建立該島專屬的「主題守護 NPC」
    const npcSpec = GUARDIAN_NPC_SPECS[isl.id] || GUARDIAN_NPC_SPECS.sys;
    const guardianNPC = createGuardianNPC(isl.id, npcSpec, idx);
    guardianNPC.root.position.set(
      ix + guardianNPC.homeOffset.x,
      guardianNPC.homeOffset.y,
      iz + guardianNPC.homeOffset.z
    );
    guardianNPCsGroup.add(guardianNPC.root);
    guardianNPCs.push(guardianNPC);

    // 【任務 2】各主題島嶼額外增設 2 名可愛 Q 版 NPC / 低多邊形小動物（草地 / 長椅旁，避開 Stage 1~3 與守護 NPC）
    const buddySpecsByIsland = [
      [
        { species: "chibi", shirtMat: npcExtraMat.shirtBlue, hatMat: npcExtraMat.hatNavy, skinMat: npcExtraMat.skinLight, mode: "wave" },
        { species: "penguin", mode: "circle" }
      ],
      [
        { species: "bear", furMat: npcExtraMat.bearBrown, mode: "wave" },
        { species: "cat", furMat: npcExtraMat.catOrange, mode: "hop" }
      ],
      [
        { species: "chibi", shirtMat: npcExtraMat.shirtPurple, hatMat: npcExtraMat.hatStraw, skinMat: npcExtraMat.skinWarm, mode: "wave" },
        { species: "bunny", furMat: npcExtraMat.bunnyGray, mode: "circle" }
      ],
      [
        { species: "cat", furMat: npcExtraMat.catGray, mode: "look" },
        { species: "bear", furMat: npcExtraMat.bearPanda, mode: "hop" }
      ],
      [
        { species: "chibi", shirtMat: npcExtraMat.shirtGold, hatMat: npcExtraMat.hatStraw, skinMat: npcExtraMat.skinLight, mode: "look" },
        { species: "bunny", furMat: npcExtraMat.bunnyWhite, mode: "wave" }
      ],
      [
        { species: "penguin", mode: "hop" },
        { species: "chibi", shirtMat: npcExtraMat.shirtTeal, hatMat: npcExtraMat.hatRed, skinMat: npcExtraMat.skinWarm, mode: "circle" }
      ],
      [
        { species: "cat", furMat: npcExtraMat.catCream, mode: "wave" },
        { species: "bear", furMat: npcExtraMat.bearTan, mode: "circle" }
      ]
    ];
    const pairSpecs = buddySpecsByIsland[idx % buddySpecsByIsland.length];
    const buddySpots = [
      { x: -2.05, z: 2.35, yaw: 0.45 },
      { x: 2.55, z: 0.45, yaw: -0.55 }
    ];
    pairSpecs.forEach((bSpec, bIdx) => {
      const sp = buddySpots[bIdx];
      const buddy = createCuteIslandBuddy(bSpec.species, { ...bSpec, scale: 1.05 });
      buddy.root.position.set(sp.x, GROUND_TOP_Y.ISLAND_TURF, sp.z);
      buddy.root.rotation.y = sp.yaw;
      islandRoot.add(buddy.root);
      islandBuddies.push({
        ...buddy,
        islandIndex: idx,
        homeX: sp.x,
        homeZ: sp.z,
        baseY: GROUND_TOP_Y.ISLAND_TURF,
        baseYaw: sp.yaw,
        mode: bSpec.mode,
        phase: idx * 1.45 + bIdx * 2.1
      });
    });

    // 左前草地小木椅點綴（供島民夥伴歇息，避開建築區與步道）
    const islandBench = new THREE.Group();
    islandBench.position.set(-2.05, GROUND_TOP_Y.ISLAND_TURF, 1.72);
    const benchSeat = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.08, 0.34), decorMat.trunk);
    benchSeat.position.y = 0.26;
    benchSeat.castShadow = true;
    islandBench.add(benchSeat);
    [-0.36, 0.36].forEach((lx) => {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.24, 0.3), decorMat.fence);
      leg.position.set(lx, 0.12, 0);
      islandBench.add(leg);
    });
    islandRoot.add(islandBench);

    // 中層台地圍籬、路燈與低多邊形樹林
    addIslandDecor(islandRoot, ix, iz, idx, isl.color);

    // 【碰撞體同步立體擴大對齊】：涵蓋 1.4 倍放大後 3 層階梯台地與高頂建築，確保 Raycaster 點擊 100% 精準拾取
    const islandHitGeo = new THREE.CylinderGeometry(12.5, 13.5, 8.0, 16);
    const islandHitMesh = new THREE.Mesh(islandHitGeo, new THREE.MeshBasicMaterial({ visible: false }));
    islandHitMesh.position.y = 3.6;
    islandRoot.add(islandHitMesh);

    // 海島木造碼頭（朝向中央海域延伸）
    const dockGroup = new THREE.Group();
    dockGroup.rotation.y = inwardAngle;

    const dockDeck = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.28, 6.0), woodMat);
    dockDeck.position.set(0, 0.95, 11.8);
    dockDeck.castShadow = true;
    dockDeck.receiveShadow = true;
    dockGroup.add(dockDeck);

    // 碼頭木樁
    [
      [-0.95, 9.4],
      [0.95, 9.4],
      [-0.95, 14.2],
      [0.95, 14.2]
    ].forEach(([px, pz]) => {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 1.6, 6), postMat);
      post.position.set(px, 0.25, pz);
      post.castShadow = true;
      dockGroup.add(post);
    });

    // 碼頭燈柱與橘黃色燈籠（使用自發光材質＋微光光暈球體，免除多餘 PointLight 效能開銷）
    const lampPole = new THREE.Mesh(sharedDockLampPoleGeo, postMat);
    lampPole.position.set(0.68, 1.75, 9.45);
    dockGroup.add(lampPole);

    const lampArm = new THREE.Mesh(sharedDockLampArmGeo, postMat);
    lampArm.position.set(0.46, 2.72, 9.45);
    dockGroup.add(lampArm);

    const bulbMat = new THREE.MeshBasicMaterial({
      color: 0xffaa33,
      transparent: true,
      opacity: THEME.day.bulbOpacity
    });
    dockBulbMaterials.push(bulbMat);

    const lanternBulb = new THREE.Mesh(sharedDockLampBulbGeo, bulbMat);
    lanternBulb.position.set(0.24, 2.48, 9.45);
    dockGroup.add(lanternBulb);

    const dockGlowMat = new THREE.MeshBasicMaterial({
      color: 0xff9f38,
      transparent: true,
      opacity: isNight ? 0.42 : 0.08,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      fog: false
    });
    dockLampGlowMaterials.push(dockGlowMat);
    const dockGlowMesh = new THREE.Mesh(sharedDockLampGlowGeo, dockGlowMat);
    dockGlowMesh.position.set(0.24, 2.48, 9.45);
    dockGlowMesh.userData.skipDimClone = true;
    dockGroup.add(dockGlowMesh);

    // 碼頭水面暖橘色柔和徑向光暈倒影 + 木板地面光斑
    const waterGlowMat = new THREE.MeshBasicMaterial({
      map: radialGlowTex,
      color: 0xff9f38,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      fog: false,
      side: THREE.DoubleSide
    });
    dockWaterGlowMaterials.push(waterGlowMat);
    const waterGlowMesh = new THREE.Mesh(sharedDockWaterGlowGeo, waterGlowMat);
    waterGlowMesh.position.set(0.24, 0.18, 9.45);
    waterGlowMesh.userData.skipDimClone = true;
    dockGroup.add(waterGlowMesh);

    const dockPlankGlow = makeGroundGlowPlane(3.2, 3.2, 0xffbe4d, 1.11);
    dockPlankGlow.mesh.position.set(0.24, 1.11, 9.45);
    dockGroup.add(dockPlankGlow.mesh);
    nightGlowUpdaters.push((nb) => {
      const show = nb > 0.01;
      dockPlankGlow.mesh.visible = show;
      if (show) dockPlankGlow.mat.opacity = 0.48 * nb;
    });

    islandRoot.add(dockGroup);

    // 島嶼懸浮名稱牌（適度抬高以適配 3 層台地與高台建築）
    const labelSprite = createLabelSprite(isl.emoji, isl.name, isl.tag, isl.color, false);
    labelSprite.position.set(0, 13.4, 0);
    islandRoot.add(labelSprite);

    // 年級篩選「Highlight Beacon」金黃呼吸微光圓環
    const beaconMat = new THREE.MeshBasicMaterial({
      color: 0xffd166,
      transparent: true,
      opacity: 0.85,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    const beaconGeo = new THREE.RingGeometry(11.8, 12.8, 48);
    beaconGeo.rotateX(-Math.PI / 2);
    const beaconRing = new THREE.Mesh(beaconGeo, beaconMat);
    beaconRing.position.y = 0.2;
    beaconRing.visible = false;
    beaconRing.userData.isBeacon = true;
    islandRoot.add(beaconRing);
    const islandGrades = Array.isArray(isl.grade)
      ? isl.grade.map(Number)
      : [...new Set((isl.sequence || []).map((s) => s.grade))];

    islandsGroup.add(islandRoot);
    const dockRadius = ringRadius - 11.5;
    const dockWaterRadius = ringRadius - 15.0;
    const dockPos = new THREE.Vector3(
      Math.cos(angle) * dockRadius,
      GROUND_TOP_Y.ISLAND_DOCK,
      Math.sin(angle) * dockRadius
    );
    const dockWaterPos = new THREE.Vector3(
      Math.cos(angle) * dockWaterRadius,
      0.26,
      Math.sin(angle) * dockWaterRadius
    );
    islandRecords.push({
      id: isl.id,
      name: isl.name,
      tag: isl.tag,
      sequenceLen: Array.isArray(isl.sequence) ? isl.sequence.length : 0,
      index: idx,
      angle,
      group: islandRoot,
      shallowRing,
      foamRing,
      innerFoamMat,
      outerFoamRing,
      outerFoamMat,
      labelSprite,
      beaconRing,
      beaconMat,
      grades: islandGrades,
      dimmed: false,
      level1Props,
      level2Props,
      level3Props,
      tier1Group: stageSys.tier1Group,
      tier2Group: stageSys.tier2Group,
      tier3Group: stageSys.tier3Group,
      animRefs: islandAnimRefs,
      stageSys,
      stageLevel: null,
      guardianNPC,
      currentLevel: null,
      progressPct: 0,
      dockPos,
      dockWaterPos,
      inwardAngle,
      phase: idx * 0.9
    });
  });

  /* ============================================================
   * 中央聖殿島 / 未解鎖「迷霧神秘礁岩」(Central Sanctuary & Misty Reef)
   * ------------------------------------------------------------
   * 1. 封印狀態 (< 7 島 100%)：顯示迷霧神秘礁岩 + 周圍 7 根小石柱依各島是否滿分點亮專屬色彩光芒
   * 2. 解鎖狀態 (7 島皆 100%)：中央聖殿島自海面平滑升起、吹散迷霧、金字塔/領航塔頂端射出金色光芒，並發射低多邊形慶祝彩帶
   * ============================================================ */
  const animRefs = {};
  const mysteryReefGroup = new THREE.Group();
  mysteryReefGroup.position.set(0, 0, 0);
  mysteryReefGroup.userData = { isSanctuary: true };
  scene.add(mysteryReefGroup);

  /* ============================================================
   * 中央主神殿建築細節深化產生器 (Sanctuary Architectural Details)
   * 包含：多層環形白石階梯、精緻浮雕廊柱、拱門邊框與拱頂石、
   * 頂部懸浮雙環神聖資訊光核、階梯兩側溫暖火炬/光柱與小花圃
   * ============================================================ */
  function buildSanctuaryArchitecturalDetails(sanctuarySubgroup, animRefs) {
    const detailsGroup = new THREE.Group();
    sanctuarySubgroup.add(detailsGroup);

    // 1. 多層環形白石階梯 (Multi-tier Circular White Stone Steps)
    // Tier 1 基座宏偉同心白石台階 (白玉石階 + 黃金飾邊)
    const stepConfigs = [
      { rTop: 22.2, rBot: 22.8, h: 0.38, y: 3.58 },
      { rTop: 20.2, rBot: 20.8, h: 0.38, y: 3.96 },
      { rTop: 18.2, rBot: 18.8, h: 0.38, y: 4.34 }
    ];
    stepConfigs.forEach((sc) => {
      const stepMesh = new THREE.Mesh(
        new THREE.CylinderGeometry(sc.rTop, sc.rBot, sc.h, 32),
        whiteMarbleMat
      );
      stepMesh.position.y = sc.y;
      stepMesh.receiveShadow = true;
      stepMesh.castShadow = true;
      detailsGroup.add(stepMesh);

      const goldRim = new THREE.Mesh(
        new THREE.TorusGeometry(sc.rTop, 0.08, 6, 32),
        goldTrimMat
      );
      goldRim.rotation.x = Math.PI / 2;
      goldRim.position.y = sc.y + sc.h / 2;
      detailsGroup.add(goldRim);
    });

    // 2. 拱門邊框與拱頂石 (Arched Moldings & Keystones for the 8 Viaduct Arches)
    const archCount = 8;
    const archR = 15.7;
    for (let a = 0; a < archCount; a++) {
      const aAng = (a / archCount) * Math.PI * 2;
      const ax = Math.cos(aAng) * archR;
      const az = Math.sin(aAng) * archR;

      const archDetailGroup = new THREE.Group();
      archDetailGroup.position.set(ax, 0, az);
      archDetailGroup.rotation.y = -aAng + Math.PI / 2;

      // 拱頂立體凸出黃金拱頂石 (Projecting Gold Keystone)
      const keystone = new THREE.Mesh(
        new THREE.BoxGeometry(0.48, 0.65, 0.85),
        goldTrimMat
      );
      keystone.position.set(0, 10.75, 0);
      keystone.castShadow = true;
      archDetailGroup.add(keystone);

      // 拱頂徽章刻痕
      const medallion = new THREE.Mesh(
        new THREE.OctahedronGeometry(0.22, 0),
        cyanGlowMat
      );
      medallion.position.set(0, 10.75, 0.44);
      archDetailGroup.add(medallion);

      // 拱弧立體邊框環線
      const archBorder = new THREE.Mesh(
        new THREE.TorusGeometry(1.15, 0.08, 6, 16, Math.PI),
        goldTrimMat
      );
      archBorder.position.set(0, 10.15, 0.35);
      archDetailGroup.add(archBorder);

      detailsGroup.add(archDetailGroup);
    }

    // 3. 精緻浮雕廊柱 (Relief Carved Colonnade Pillars for the 12 Summit Columns)
    const colCount = 12;
    const colR = 7.26;
    for (let c = 0; c < colCount; c++) {
      const ca = (c / colCount) * Math.PI * 2;
      const cx = Math.cos(ca) * colR;
      const cz = Math.sin(ca) * colR;

      // 柱身雙層浮雕環飾 (Carved Torus Relief Collars)
      [17.5, 21.2].forEach((ry) => {
        const collar = new THREE.Mesh(
          new THREE.TorusGeometry(0.38, 0.055, 6, 12),
          goldTrimMat
        );
        collar.rotation.x = Math.PI / 2;
        collar.position.set(cx, ry, cz);
        detailsGroup.add(collar);
      });

      // 柱基八角形雙階浮雕座 (Octagonal Carved Relief Pedestal)
      const basePedestal = new THREE.Mesh(
        new THREE.CylinderGeometry(0.62, 0.72, 0.28, 8),
        stoneReliefMat
      );
      basePedestal.position.set(cx, 15.35, cz);
      basePedestal.castShadow = true;
      detailsGroup.add(basePedestal);
    }

    // 4. 溫暖火炬與光柱 (Warm Stone Torches & Light Beams flanking Stairs and Dais)
    const torches = [];
    const torchAngles = [0.22, -0.22, Math.PI / 2, -Math.PI / 2, Math.PI * 0.75, -Math.PI * 0.75];
    torchAngles.forEach((ang, ti) => {
      const tx = Math.cos(ang) * 17.5;
      const tz = Math.sin(ang) * 17.5;
      const ty = 4.75;

      const torchGroup = new THREE.Group();
      torchGroup.position.set(tx, ty, tz);

      // 石柱基座
      const tBase = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.42, 0.95, 8), torchStoneMat);
      tBase.position.y = 0.48;
      tBase.castShadow = true;
      torchGroup.add(tBase);

      // 青銅金邊火盆
      const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.48, 0.28, 0.28, 8), goldTrimMat);
      bowl.position.y = 1.05;
      torchGroup.add(bowl);

      // 溫暖發光火焰多面晶體
      const flame = new THREE.Mesh(new THREE.OctahedronGeometry(0.24, 0), torchFlameMat);
      flame.scale.set(0.8, 1.45, 0.8);
      flame.position.y = 1.32;
      torchGroup.add(flame);

      // 向上微光光柱與火炬石座暖光光暈
      const beamGeo = new THREE.CylinderGeometry(0.08, 0.32, 2.8, 8, 1, true);
      const beamMat = new THREE.MeshBasicMaterial({
        color: 0xffa200,
        transparent: true,
        opacity: 0.25,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        fog: false,
        side: THREE.DoubleSide
      });
      const beam = new THREE.Mesh(beamGeo, beamMat);
      beam.position.y = 2.65;
      torchGroup.add(beam);

      const torchGroundGlow = makeGroundGlowPlane(3.6, 3.6, 0xffae3d, 0.04);
      torchGroup.add(torchGroundGlow.mesh);
      nightGlowUpdaters.push((nb, t) => {
        const show = nb > 0.01 && sanctuarySubgroup.visible;
        torchGroundGlow.mesh.visible = show;
        if (show) torchGroundGlow.mat.opacity = (0.48 + 0.1 * Math.sin(t * 7.5 + ti)) * nb;
      });

      detailsGroup.add(torchGroup);
      torches.push({ flame, beam, phase: ti * 1.1 });
    });

    // 5. 平台階梯小花圃 (Terrace Garden Planters & Flowers)
    const planterAngles = [0.45, -0.45, 1.25, -1.25, 2.1, -2.1];
    planterAngles.forEach((ang, pi) => {
      const px = Math.cos(ang) * 19.5;
      const pz = Math.sin(ang) * 19.5;

      const planter = new THREE.Group();
      planter.position.set(px, 4.15, pz);
      planter.rotation.y = -ang;

      // 石雕花槽
      const trough = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.32, 0.75), stoneReliefMat);
      trough.position.y = 0.16;
      trough.castShadow = true;
      planter.add(trough);

      // 槽內綠草泥土
      const soil = new THREE.Mesh(new THREE.BoxGeometry(1.48, 0.1, 0.65), flowerBushGreenMat);
      soil.position.y = 0.32;
      planter.add(soil);

      // 花朵點綴
      const fCols = [flowerDotPinkMat, flowerDotYellowMat, flowerDotWhiteMat];
      [-0.45, 0, 0.45].forEach((fx, fi) => {
        const bl = new THREE.Mesh(new THREE.IcosahedronGeometry(0.14, 0), fCols[(pi + fi) % fCols.length]);
        bl.position.set(fx, 0.42, (fi % 2 === 0 ? 0.08 : -0.08));
        planter.add(bl);
      });

      detailsGroup.add(planter);
    });

    // 6. 頂部懸浮雙環神聖資訊光核 (Top Floating Dual-Ring Sacred Information Core, y = 35.0)
    const apexCoreGroup = new THREE.Group();
    apexCoreGroup.position.set(0, 35.0, 0);
    detailsGroup.add(apexCoreGroup);

    // 內環：賽博青發光雙環 (Inner Cyan Runic Gyro Ring)
    const innerRingGroup = new THREE.Group();
    apexCoreGroup.add(innerRingGroup);
    const innerRing = new THREE.Mesh(
      new THREE.TorusGeometry(3.6, 0.12, 8, 36),
      cyanGlowMat
    );
    innerRingGroup.add(innerRing);

    // 內環上嵌 8 顆發光數據棱鏡
    const prismCount = 8;
    for (let p = 0; p < prismCount; p++) {
      const pAng = (p / prismCount) * Math.PI * 2;
      const prism = new THREE.Mesh(new THREE.OctahedronGeometry(0.24, 0), goldenCoreGlowMat);
      prism.position.set(Math.cos(pAng) * 3.6, Math.sin(pAng) * 3.6, 0);
      innerRingGroup.add(prism);
    }

    // 外環：黃金神聖符文軌道環 (Outer Golden Sacred Glyph Ring)
    const outerRingGroup = new THREE.Group();
    apexCoreGroup.add(outerRingGroup);
    const outerRing = new THREE.Mesh(
      new THREE.TorusGeometry(4.8, 0.10, 8, 36),
      goldTrimMat
    );
    outerRingGroup.add(outerRing);

    // 外環上 12 顆數據符文方塊
    for (let g = 0; g < 12; g++) {
      const gAng = (g / 12) * Math.PI * 2;
      const runeBox = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.25, 0.25), cyanGlowMat);
      runeBox.position.set(Math.cos(gAng) * 4.8, Math.sin(gAng) * 4.8, 0);
      outerRingGroup.add(runeBox);
    }

    // 中央超幾何晶核 (Pulsating Sacred Hyper-Crystal Core)
    const coreCrystal = new THREE.Mesh(
      new THREE.IcosahedronGeometry(1.6, 1),
      cyanGlowMat
    );
    apexCoreGroup.add(coreCrystal);

    const coreInnerDiamond = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.95, 0),
      goldenCoreGlowMat
    );
    apexCoreGroup.add(coreInnerDiamond);

    const coreAura = new THREE.Mesh(
      new THREE.SphereGeometry(2.4, 16, 12),
      new THREE.MeshBasicMaterial({
        color: 0x00f5d4,
        transparent: true,
        opacity: 0.32,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      })
    );
    apexCoreGroup.add(coreAura);

    animRefs.sanctuaryDetails = {
      apexCoreGroup,
      innerRingGroup,
      outerRingGroup,
      coreCrystal,
      coreInnerDiamond,
      coreAura,
      torches
    };
  }

  // 中央聖殿島海面固定淺灘圓環（規模放大 1.65 倍至半徑 31.0）與雙層呼吸浪花圈
  const reefShallowGeo = new THREE.RingGeometry(18.5, 31.0, 40);
  reefShallowGeo.rotateX(-Math.PI / 2);
  const reefShallowRing = new THREE.Mesh(reefShallowGeo, shallowLagoonMat);
  reefShallowRing.position.set(0, 0.08, 0);
  scene.add(reefShallowRing);

  const reefFoamGeo = new THREE.RingGeometry(21.1, 24.1, 36);
  reefFoamGeo.rotateX(-Math.PI / 2);
  const reefInnerFoamMat = foamMat.clone();
  const reefFoam = new THREE.Mesh(reefFoamGeo, reefInnerFoamMat);
  reefFoam.position.y = 0.14;
  mysteryReefGroup.add(reefFoam);

  const reefOuterFoamGeo = new THREE.RingGeometry(29.8, 31.8, 40);
  reefOuterFoamGeo.rotateX(-Math.PI / 2);
  const reefOuterFoamMat = foamMat.clone();
  const reefOuterFoam = new THREE.Mesh(reefOuterFoamGeo, reefOuterFoamMat);
  reefOuterFoam.position.set(0, 0.11, 0);
  mysteryReefGroup.add(reefOuterFoam);

  // 暗紫灰低多邊形神秘礁岩基座與尖峰群（規模放大 1.65 倍，宏偉全場核心）
  const reefRockMat = new THREE.MeshStandardMaterial({
    color: 0x2f324b,
    roughness: 0.82,
    metalness: 0.15,
    flatShading: true
  });
  const reefDarkMat = new THREE.MeshStandardMaterial({
    color: 0x1f2235,
    roughness: 0.88,
    flatShading: true
  });

  const reefBase = new THREE.Mesh(
    createRoundedCylinderGeometry(20.1, 22.8, 5.6, 1.15, 18),
    reefDarkMat
  );
  reefBase.position.y = 2.8;
  reefBase.castShadow = true;
  reefBase.receiveShadow = true;
  mysteryReefGroup.add(reefBase);

  // 【中央聖殿點擊碰撞體同步放大 1.65 倍】：覆蓋全高度立體柱狀（半徑 23.5，高度 39.6，中心 y=19.8）
  const reefHitGeo = new THREE.CylinderGeometry(23.5, 25.5, 39.6, 18);
  const reefHitMesh = new THREE.Mesh(reefHitGeo, new THREE.MeshBasicMaterial({ visible: false }));
  reefHitMesh.position.y = 19.8;
  reefHitMesh.userData = { isSanctuary: true };
  mysteryReefGroup.add(reefHitMesh);

  // [A] 封印階段尖峰岩群（放大 1.65 倍）
  const sealedReefSubgroup = new THREE.Group();
  sealedReefSubgroup.name = "sealedReefSubgroup";
  mysteryReefGroup.add(sealedReefSubgroup);

  const spireSpecs = [
    { r: 8.6, h: 28.8, x: 0, z: 0, rotZ: 0.04 },
    { r: 6.2, h: 22.2, x: -7.4, z: 4.3, rotZ: -0.15 },
    { r: 5.9, h: 21.1, x: 7.9, z: 3.3, rotZ: 0.14 },
    { r: 5.6, h: 18.9, x: -4.9, z: -7.2, rotZ: 0.12 },
    { r: 6.2, h: 21.7, x: 5.6, z: -6.6, rotZ: -0.13 }
  ];
  spireSpecs.forEach((sp) => {
    const spire = new THREE.Mesh(new THREE.ConeGeometry(sp.r, sp.h, 6), reefRockMat);
    spire.position.set(sp.x, sp.h / 2 + 1.2, sp.z);
    spire.rotation.z = sp.rotZ;
    spire.castShadow = true;
    spire.receiveShadow = true;
    sealedReefSubgroup.add(spire);
  });

  // [B] 周圍 7 根封印石柱（位於下層宏偉台地 surface y=3.4，半徑 9.8）
  const sealPillarsGroup = new THREE.Group();
  sealPillarsGroup.name = "sealPillarsGroup";
  mysteryReefGroup.add(sealPillarsGroup);

  const pillarStoneMat = new THREE.MeshStandardMaterial({
    color: 0x4a5568,
    roughness: 0.75,
    metalness: 0.12,
    flatShading: true
  });
  const pillarCapMat = new THREE.MeshStandardMaterial({
    color: 0x718096,
    roughness: 0.65,
    flatShading: true
  });
  const pillarHaloGeo = new THREE.RingGeometry(0.7, 1.15, 18);
  pillarHaloGeo.rotateX(-Math.PI / 2);

  const sealPillars = [];
  const pillarRingRadius = 16.2;

  ISLANDS_DATA.slice(0, 7).forEach((isl, idx) => {
    const pAngle = (idx / 7) * Math.PI * 2 - Math.PI / 2;
    const px = Math.cos(pAngle) * pillarRingRadius;
    const pz = Math.sin(pAngle) * pillarRingRadius;

    const pillarHolder = new THREE.Group();
    pillarHolder.position.set(px, 5.6, pz);
    pillarHolder.rotation.y = -pAngle;

    // 石柱基座、柱身與柱頭
    const pBase = new THREE.Mesh(new THREE.CylinderGeometry(0.68, 0.82, 0.45, 6), pillarStoneMat);
    pBase.position.y = 0.22;
    pBase.castShadow = true;
    pillarHolder.add(pBase);

    const pShaft = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.54, 2.15, 6), pillarStoneMat);
    pShaft.position.y = 1.48;
    pShaft.castShadow = true;
    pillarHolder.add(pShaft);

    const pCap = new THREE.Mesh(new THREE.CylinderGeometry(0.58, 0.42, 0.32, 6), pillarCapMat);
    pCap.position.y = 2.68;
    pCap.castShadow = true;
    pillarHolder.add(pCap);

    // 柱身專屬色彩符文環與柱頂寶石
    const islColor = new THREE.Color(isl.color || "#ffd166");
    const runeBandMat = new THREE.MeshStandardMaterial({
      color: 0x2d3748,
      emissive: 0x000000,
      emissiveIntensity: 0,
      roughness: 0.35,
      flatShading: true
    });
    const runeBand = new THREE.Mesh(new THREE.CylinderGeometry(0.48, 0.52, 0.44, 6), runeBandMat);
    runeBand.position.y = 1.62;
    pillarHolder.add(runeBand);

    const gemMat = new THREE.MeshStandardMaterial({
      color: 0x3b4252,
      emissive: 0x1a202c,
      emissiveIntensity: 0.15,
      roughness: 0.22,
      metalness: 0.2,
      flatShading: true
    });
    const gemMesh = new THREE.Mesh(new THREE.OctahedronGeometry(0.55, 0), gemMat);
    gemMesh.scale.set(0.85, 1.35, 0.85);
    gemMesh.position.y = 3.42;
    gemMesh.castShadow = true;
    pillarHolder.add(gemMesh);

    const haloMat = new THREE.MeshBasicMaterial({
      color: islColor,
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      fog: false
    });
    const haloRing = new THREE.Mesh(pillarHaloGeo, haloMat);
    haloRing.position.y = 0.08;
    pillarHolder.add(haloRing);

    const pillarBeamMat = new THREE.MeshBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      fog: false
    });
    const pillarBeam = new THREE.Mesh(
      buildSoftLightConeGeo(0.24, 0.72, 6.0, 10, 0x000000, islColor.getHex()),
      pillarBeamMat
    );
    pillarBeam.position.y = 5.4;
    pillarBeam.visible = false;
    pillarHolder.add(pillarBeam);

    const pillarGroundGlow = makeGroundGlowPlane(3.2, 3.2, islColor.getHex(), 0.06);
    pillarHolder.add(pillarGroundGlow.mesh);

    sealPillarsGroup.add(pillarHolder);
    const pillarRec = {
      id: isl.id,
      name: isl.name,
      emoji: isl.emoji,
      colorHex: isl.color || "#ffd166",
      islColor,
      group: pillarHolder,
      gemMesh,
      gemMat,
      runeBandMat,
      haloRing,
      haloMat,
      pillarBeam,
      pillarBeamMat,
      pillarGroundGlow,
      isLit: false,
      phase: idx * 0.85
    };
    sealPillars.push(pillarRec);
    nightGlowUpdaters.push((nb, t) => {
      const showLit = nb > 0.01 && pillarRec.isLit && sealedReefSubgroup.visible;
      pillarBeam.visible = showLit;
      pillarGroundGlow.mesh.visible = showLit;
      if (showLit) {
        const pulse = 0.85 + 0.15 * Math.sin(t * 2.5 + pillarRec.phase);
        pillarBeamMat.opacity = 0.42 * nb * pulse;
        pillarGroundGlow.mat.opacity = 0.56 * nb * pulse;
      }
    });
  });

  // [C] 解鎖後「中央資訊聖殿島」主殿（Sanctuary Subgroup）——垂直拔高之全場景最高地標
  const sanctuarySubgroup = new THREE.Group();
  sanctuarySubgroup.name = "sanctuarySubgroup";
  sanctuarySubgroup.visible = false;
  mysteryReefGroup.add(sanctuarySubgroup);

  const sanctMarbleMat = new THREE.MeshStandardMaterial({
    color: 0xf8f9fa,
    roughness: 0.36,
    metalness: 0.08,
    flatShading: true
  });
  const sanctGoldMat = registerNightMat(
    new THREE.MeshStandardMaterial({
      color: 0xffd166,
      emissive: 0xd97706,
      emissiveIntensity: 0.35,
      roughness: 0.24,
      metalness: 0.46,
      flatShading: true
    }),
    { dayEi: 0.35, nightEi: 1.25 }
  );
  const sanctCyanMat = registerNightMat(
    new THREE.MeshStandardMaterial({
      color: 0x90e0ef,
      emissive: 0x00b4d8,
      emissiveIntensity: 0.6,
      roughness: 0.2,
      flatShading: true
    }),
    { dayEi: 0.6, nightEi: 2.15 }
  );

  /* -------------------------------------------------------------
   * 1. Tier 1: 低層宏偉白玉基座台地 (放大 1.65 倍, y=2.8 ~ 5.6)
   * ------------------------------------------------------------- */
  const sanctTerrace = new THREE.Mesh(
    createRoundedCylinderGeometry(20.1, 22.8, 5.6, 1.15, 18),
    sanctMarbleMat
  );
  sanctTerrace.position.y = 2.8;
  sanctTerrace.castShadow = true;
  sanctTerrace.receiveShadow = true;
  sanctuarySubgroup.add(sanctTerrace);

  const tier1Rim = new THREE.Mesh(new THREE.TorusGeometry(20.1, 0.36, 6, 36), sanctGoldMat);
  tier1Rim.rotation.x = Math.PI / 2;
  tier1Rim.position.y = 5.58;
  sanctuarySubgroup.add(tier1Rim);

  /* -------------------------------------------------------------
   * 2. Tier 2: 中層穿透式拱門基座台地 (放大 1.65 倍, y=6.0 ~ 11.4)
   * ------------------------------------------------------------- */
  const viaductPlinth = new THREE.Mesh(new THREE.CylinderGeometry(16.2, 17.8, 0.8, 18), sanctMarbleMat);
  viaductPlinth.position.y = 6.0;
  viaductPlinth.castShadow = true;
  viaductPlinth.receiveShadow = true;
  sanctuarySubgroup.add(viaductPlinth);

  // 8 座穿透式石造拱門
  const archwayCount = 8;
  const archRadius = 15.7;
  for (let a = 0; a < archwayCount; a++) {
    const aAng = (a / archwayCount) * Math.PI * 2;
    const archGroup = new THREE.Group();
    archGroup.position.set(Math.cos(aAng) * archRadius, 0, Math.sin(aAng) * archRadius);
    archGroup.rotation.y = -aAng + Math.PI / 2;

    // 左右兩座石墩柱 (Pier Columns)
    [-1.24, 1.24].forEach((px) => {
      const pier = new THREE.Mesh(new THREE.BoxGeometry(0.78, 4.45, 0.78), sanctMarbleMat);
      pier.position.set(px, 8.2, 0);
      pier.castShadow = true;
      archGroup.add(pier);

      const pierCap = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.26, 0.95), sanctGoldMat);
      pierCap.position.set(px, 10.55, 0);
      archGroup.add(pierCap);
    });

    // 穿透式拱門楣樑 (Architrave Lintel)
    const lintel = new THREE.Mesh(new THREE.BoxGeometry(3.3, 0.74, 1.05), sanctMarbleMat);
    lintel.position.set(0, 10.75, 0);
    lintel.castShadow = true;
    archGroup.add(lintel);

    // 拱弧裝飾 (Arch Vault Under-arch)
    const archCurve = new THREE.Mesh(
      new THREE.TorusGeometry(1.12, 0.18, 6, 12, Math.PI),
      sanctGoldMat
    );
    archCurve.position.set(0, 10.2, 0);
    archGroup.add(archCurve);

    const archFloorGlow = makeGroundGlowPlane(3.6, 3.6, 0xffcf66, 6.45);
    archGroup.add(archFloorGlow.mesh);
    nightGlowUpdaters.push((nb) => {
      const show = nb > 0.01 && sanctuarySubgroup.visible;
      archFloorGlow.mesh.visible = show;
      if (show) archFloorGlow.mat.opacity = 0.38 * nb;
    });

    sanctuarySubgroup.add(archGroup);
  }

  // Tier 2 頂部走道地板 (Deck Slab)
  const tier2Deck = new THREE.Mesh(new THREE.CylinderGeometry(15.7, 17.0, 1.0, 18), sanctMarbleMat);
  tier2Deck.position.y = 10.9;
  tier2Deck.castShadow = true;
  tier2Deck.receiveShadow = true;
  sanctuarySubgroup.add(tier2Deck);

  const tier2Rim = new THREE.Mesh(new THREE.TorusGeometry(15.8, 0.3, 6, 28), sanctGoldMat);
  tier2Rim.rotation.x = Math.PI / 2;
  tier2Rim.position.y = 11.35;
  sanctuarySubgroup.add(tier2Rim);

  /* -------------------------------------------------------------
   * 3. Tier 3: 頂層神聖祭壇台地 (放大 1.65 倍, y=12.7 ~ 15.3)
   * ------------------------------------------------------------- */
  const daisBase = new THREE.Mesh(new THREE.CylinderGeometry(12.2, 13.8, 3.6, 18), sanctMarbleMat);
  daisBase.position.y = 12.7;
  daisBase.castShadow = true;
  daisBase.receiveShadow = true;
  sanctuarySubgroup.add(daisBase);

  const daisStep = new THREE.Mesh(new THREE.CylinderGeometry(10.9, 11.5, 0.58, 18), sanctGoldMat);
  daisStep.position.y = 14.75;
  daisStep.castShadow = true;
  daisStep.receiveShadow = true;
  sanctuarySubgroup.add(daisStep);

  /* -------------------------------------------------------------
   * 4. 頂部衛城主殿 (Summit Temple Citadel, y=15.2 ~ 32.7)
   *    12 根科林斯式黃金/白玉柱廊 + 雙層簷口 + 黃金金字塔尖塔
   * ------------------------------------------------------------- */
  const colCount = 12;
  const templeColRadius = 7.26;
  for (let c = 0; c < colCount; c++) {
    const ca = (c / colCount) * Math.PI * 2;
    const cx = Math.cos(ca) * templeColRadius;
    const cz = Math.sin(ca) * templeColRadius;

    // 柱基
    const cPlinth = new THREE.Mesh(new THREE.CylinderGeometry(0.58, 0.68, 0.36, 8), sanctGoldMat);
    cPlinth.position.set(cx, 15.2, cz);
    cPlinth.castShadow = true;
    sanctuarySubgroup.add(cPlinth);

    // 柱身 (Fluted Shaft)
    const colShaft = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.42, 7.2, 8), sanctMarbleMat);
    colShaft.position.set(cx, 18.9, cz);
    colShaft.castShadow = true;
    sanctuarySubgroup.add(colShaft);

    // 柱頭 (Corinthian Capital)
    const cCap = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.38, 0.58, 8), sanctGoldMat);
    cCap.position.set(cx, 22.8, cz);
    cCap.castShadow = true;
    sanctuarySubgroup.add(cCap);
  }

  // 雙層柱頂楣樑與山牆簷口 (Circular Entablature & Frieze)
  const entablatureRing = new THREE.Mesh(new THREE.CylinderGeometry(7.9, 7.6, 0.9, 18), sanctMarbleMat);
  entablatureRing.position.y = 23.5;
  entablatureRing.castShadow = true;
  sanctuarySubgroup.add(entablatureRing);

  const friezeRing = new THREE.Mesh(new THREE.CylinderGeometry(7.3, 7.3, 0.5, 18), sanctGoldMat);
  friezeRing.position.y = 24.2;
  friezeRing.castShadow = true;
  sanctuarySubgroup.add(friezeRing);

  // 四角黃金金字塔主屋頂 (Golden Pyramid Spire)
  const navigatorPyramid = new THREE.Mesh(new THREE.ConeGeometry(6.6, 5.9, 4), sanctGoldMat);
  navigatorPyramid.position.y = 27.5;
  navigatorPyramid.rotation.y = Math.PI / 4;
  navigatorPyramid.castShadow = true;
  sanctuarySubgroup.add(navigatorPyramid);

  // 金字塔頂部階梯式座與金尖針 (Apex Spire Needle)
  const spireBase = new THREE.Mesh(new THREE.BoxGeometry(1.98, 0.5, 1.98), sanctMarbleMat);
  spireBase.position.y = 30.6;
  sanctuarySubgroup.add(spireBase);

  const spireNeedle = new THREE.Mesh(new THREE.ConeGeometry(0.36, 2.6, 6), sanctGoldMat);
  spireNeedle.position.y = 32.1;
  sanctuarySubgroup.add(spireNeedle);

  // 建築細節深化：多層環形白石階梯、精緻浮雕廊柱、拱門邊框、頂部懸浮雙環神聖資訊光核、火炬光柱與花圃
  buildSanctuaryArchitecturalDetails(sanctuarySubgroup, animRefs);

  /* -------------------------------------------------------------
   * 5. 頂端懸浮發光資訊光核 (Floating Glowing Information Core, y=21.2)
   *    全場景之冠：內嵌發光多面星晶 + 3 軸旋轉星盤儀 + 光核光暈 + 升空光柱
   * ------------------------------------------------------------- */
  const apexCrystal = new THREE.Mesh(
    new THREE.IcosahedronGeometry(1.15, 1),
    new THREE.MeshStandardMaterial({
      color: 0xbff6ff,
      emissive: 0x48cae4,
      emissiveIntensity: 1.2,
      roughness: 0.15,
      metalness: 0.3,
      flatShading: true
    })
  );
  apexCrystal.position.y = 35.0;
  sanctuarySubgroup.add(apexCrystal);

  const apexDiamondCore = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.65, 0),
    new THREE.MeshStandardMaterial({
      color: 0xfff3b0,
      emissive: 0xffb703,
      emissiveIntensity: 1.6,
      roughness: 0.1,
      flatShading: true
    })
  );
  apexDiamondCore.position.y = 35.0;
  sanctuarySubgroup.add(apexDiamondCore);

  const apexAuraHalo = new THREE.Mesh(
    new THREE.SphereGeometry(1.65, 16, 12),
    new THREE.MeshBasicMaterial({
      color: 0x00f5d4,
      transparent: true,
      opacity: 0.28,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    })
  );
  apexAuraHalo.position.y = 35.0;
  sanctuarySubgroup.add(apexAuraHalo);

  // 3 軸獨立旋轉星盤儀軌道環 (3-Axis Astrolabe Gyro Rings)
  const apexAstrolabe = new THREE.Mesh(new THREE.TorusGeometry(2.1, 0.08, 6, 32), sanctCyanMat);
  apexAstrolabe.position.y = 35.0;
  apexAstrolabe.rotation.x = Math.PI / 3;
  sanctuarySubgroup.add(apexAstrolabe);

  const apexAstrolabe2 = new THREE.Mesh(new THREE.TorusGeometry(2.5, 0.07, 6, 32), sanctGoldMat);
  apexAstrolabe2.position.y = 35.0;
  apexAstrolabe2.rotation.y = Math.PI / 4;
  sanctuarySubgroup.add(apexAstrolabe2);

  const apexAstrolabe3 = new THREE.Mesh(
    new THREE.TorusGeometry(2.9, 0.06, 6, 32),
    new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0x90e0ef,
      emissiveIntensity: 0.7,
      roughness: 0.2
    })
  );
  apexAstrolabe3.position.y = 35.0;
  apexAstrolabe3.rotation.z = Math.PI / 6;
  sanctuarySubgroup.add(apexAstrolabe3);

  // 6 顆環繞光核運行的微光數據方塊 (Orbital Data Motes)
  const sanctuaryDataMotes = [];
  const moteGeo = new THREE.BoxGeometry(0.2, 0.2, 0.2);
  const moteMat = new THREE.MeshBasicMaterial({ color: 0x7ff0ff });
  for (let m = 0; m < 6; m++) {
    const moteMesh = new THREE.Mesh(moteGeo, moteMat);
    sanctuarySubgroup.add(moteMesh);
    sanctuaryDataMotes.push({
      mesh: moteMesh,
      orbitR: 1.8 + (m % 2) * 0.45,
      speed: 1.2 + m * 0.2,
      phase: (m / 6) * Math.PI * 2,
      yOffset: ((m - 2.5) / 3) * 0.5
    });
  }
  animRefs.sanctuaryDataMotes = sanctuaryDataMotes;
  animRefs.apexAstrolabe2 = apexAstrolabe2;
  animRefs.apexAstrolabe3 = apexAstrolabe3;
  animRefs.apexDiamondCore = apexDiamondCore;
  animRefs.apexAuraHalo = apexAuraHalo;

  // 頂端射出之金色通天光柱 (Golden Skyward Beacon Beam, 自 y=21.2 射入高空)
  const goldenBeamGroup = new THREE.Group();
  goldenBeamGroup.position.set(0, 35.0, 0);
  sanctuarySubgroup.add(goldenBeamGroup);

  const outerBeamMat = new THREE.MeshBasicMaterial({
    color: 0xffd166,
    transparent: true,
    opacity: 0.42,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    fog: false
  });
  const outerBeam = new THREE.Mesh(
    new THREE.CylinderGeometry(0.85, 3.8, 54, 16, 1, true),
    outerBeamMat
  );
  outerBeam.position.y = 27;
  goldenBeamGroup.add(outerBeam);

  const innerBeamMat = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.82,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    fog: false
  });
  const innerBeam = new THREE.Mesh(
    new THREE.CylinderGeometry(0.28, 1.3, 54, 12, 1, true),
    innerBeamMat
  );
  innerBeam.position.y = 27;
  goldenBeamGroup.add(innerBeam);

  // 夜晚神殿主殿環繞上升金色能量流光錐與地面星芒大光暈
  const sanctAuraConeMat = new THREE.MeshBasicMaterial({
    vertexColors: true,
    transparent: true,
    opacity: 0,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    fog: false
  });
  const sanctAuraCone = new THREE.Mesh(
    buildSoftLightConeGeo(3.2, 7.6, 26, 20, 0x000000, 0xffd466),
    sanctAuraConeMat
  );
  sanctAuraCone.position.y = GROUND_TOP_Y.SANCT_TIER3 + 13;
  sanctAuraCone.visible = false;
  sanctuarySubgroup.add(sanctAuraCone);
  nightGlowUpdaters.push((nb, t) => {
    const show = nb > 0.01 && sanctuarySubgroup.visible;
    sanctAuraCone.visible = show;
    if (show) sanctAuraConeMat.opacity = (0.28 + 0.08 * Math.sin(t * 2.0)) * nb;
  });

  const beamHaloRings = [];
  for (let r = 0; r < 3; r++) {
    const hMat = new THREE.MeshBasicMaterial({
      color: 0xffe66d,
      transparent: true,
      opacity: 0.75,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      fog: false
    });
    const hMesh = new THREE.Mesh(new THREE.TorusGeometry(1.85, 0.12, 6, 24), hMat);
    hMesh.rotation.x = Math.PI / 2;
    goldenBeamGroup.add(hMesh);
    beamHaloRings.push({ mesh: hMesh, mat: hMat, phase: r / 3 });
  }

  const sanctuaryPointLight = new THREE.PointLight(0xffd166, 0, 65, 1.6);
  sanctuaryPointLight.position.set(0, 35.5, 0);
  sanctuarySubgroup.add(sanctuaryPointLight);

  /* ============================================================
   * 7b. 終局高空聖殿：【天穹試煉浮島 (Aether Citadel)】＋ Q 版四階段建築進化系統 (Lv.0 ~ Lv.3)
   *     - 100% 沿用七大島嶼「Q 版 Low-Poly 生態微縮景觀」材質與色票（flatShading: true）
   *     - 嚴格遵守零 PointLight / 零即時陰影光源：全發光使用 emissive + AdditiveBlending + Canvas 2D 漸層貼圖
   *     - 座標固定於中央海域高空 (14, 19.5, -25)，與七大島及中央聖殿互不碰撞
   * ============================================================ */
  const CITADEL_BASE_POS = { x: 14, y: 19.5, z: -25 };
  const CITADEL_CHALLENGE_KEYS = [
    "dojo:fsm",
    "dojo:dag",
    "dojo:bitwise",
    "dojo:recursion",
    "capstone:zero-day",
    "capstone:smart-city"
  ];
  const aetherCitadelGroup = new THREE.Group();
  aetherCitadelGroup.name = "aetherCitadelGroup";
  aetherCitadelGroup.position.set(CITADEL_BASE_POS.x, CITADEL_BASE_POS.y, CITADEL_BASE_POS.z);
  aetherCitadelGroup.userData = { isAetherCitadel: true };
  scene.add(aetherCitadelGroup);

  const citadelState = {
    unlocked: false,
    allSevenAt80: false,
    teacherTempOpen: false,
    metCount: 0,
    archLevel: null,
    completedCount: 0,
    archOverride: null,
    upgradeBounceTime: null
  };
  let pendingCitadelArchSync = false;
  let isCitadelCursorSystemReady = false;

  // 與七大島嶼一致的 Q 版 Low-Poly 材質庫（無 PointLight、無陰影投射以確保 60FPS）
  const citadelRockTopMat = new THREE.MeshStandardMaterial({ color: 0x918e85, roughness: 0.82, metalness: 0.04, flatShading: true });
  const citadelRockMidMat = new THREE.MeshStandardMaterial({ color: 0x78756e, roughness: 0.85, metalness: 0.05, flatShading: true });
  const citadelRockDeepMat = new THREE.MeshStandardMaterial({ color: 0x5d5b56, roughness: 0.88, metalness: 0.06, flatShading: true });
  const citadelTurfEmeraldMat = new THREE.MeshStandardMaterial({ color: 0x56cf85, roughness: 0.68, metalness: 0.04, flatShading: true });
  const citadelTurfCyanGoldMat = new THREE.MeshStandardMaterial({ color: 0x35c9aa, roughness: 0.66, metalness: 0.05, flatShading: true });
  const citadelMarbleMat = new THREE.MeshStandardMaterial({ color: 0xfaf7ef, roughness: 0.35, metalness: 0.05, flatShading: true });
  const citadelIvoryTrimMat = new THREE.MeshStandardMaterial({ color: 0xebe5d5, roughness: 0.45, metalness: 0.06, flatShading: true });
  const citadelWallCreamMat = new THREE.MeshStandardMaterial({ color: 0xfff8eb, roughness: 0.65, metalness: 0.04, flatShading: true });
  const citadelRoofGoldMat = registerNightMat(
    new THREE.MeshStandardMaterial({ color: 0xf5c451, emissive: 0xc27803, emissiveIntensity: 0.16, roughness: 0.32, metalness: 0.38, flatShading: true }),
    { dayEi: 0.16, nightEi: 0.65 }
  );
  const citadelRoofTealMat = new THREE.MeshStandardMaterial({ color: 0x2f7f8c, roughness: 0.62, metalness: 0.1, flatShading: true });
  const citadelRoofWarmTileMat = new THREE.MeshStandardMaterial({ color: 0xd97448, roughness: 0.66, flatShading: true });
  const citadelGoldTrimMat = registerNightMat(
    new THREE.MeshStandardMaterial({ color: 0xffd166, emissive: 0xd97706, emissiveIntensity: 0.3, roughness: 0.25, metalness: 0.48, flatShading: true }),
    { dayEi: 0.3, nightEi: 1.05 }
  );
  const citadelCrystalMat = registerNightMat(
    new THREE.MeshStandardMaterial({ color: 0x67e8f9, emissive: 0x06b6d4, emissiveIntensity: 0.72, roughness: 0.2, metalness: 0.18, flatShading: true }),
    { dayEi: 0.72, nightEi: 1.85 }
  );
  const citadelGoldCrystalMat = registerNightMat(
    new THREE.MeshStandardMaterial({ color: 0xffe066, emissive: 0xf59e0b, emissiveIntensity: 0.68, roughness: 0.2, metalness: 0.25, flatShading: true }),
    { dayEi: 0.68, nightEi: 1.75 }
  );
  const citadelDormantCrystalMat = new THREE.MeshStandardMaterial({
    color: 0x64748b,
    emissive: 0x0ea5e9,
    emissiveIntensity: 0.18,
    roughness: 0.35,
    metalness: 0.25,
    flatShading: true
  });
  const citadelRingCyanMat = registerNightMat(
    new THREE.MeshStandardMaterial({ color: 0x7ff0ff, emissive: 0x00b4d8, emissiveIntensity: 0.32, roughness: 0.22, metalness: 0.28, flatShading: true }),
    { dayEi: 0.32, nightEi: 0.95 }
  );
  const citadelRingGoldMat = registerNightMat(
    new THREE.MeshStandardMaterial({ color: 0xffe066, emissive: 0xd97706, emissiveIntensity: 0.28, roughness: 0.24, metalness: 0.42, flatShading: true }),
    { dayEi: 0.28, nightEi: 0.9 }
  );
  const citadelArchMat = new THREE.MeshStandardMaterial({
    color: 0xcbd5e1,
    emissive: 0x1e293b,
    emissiveIntensity: 0.1,
    roughness: 0.36,
    metalness: 0.25,
    flatShading: true
  });
  const citadelWingFeatherMat = registerNightMat(
    new THREE.MeshStandardMaterial({ color: 0xfff8e7, emissive: 0xfbbf24, emissiveIntensity: 0.45, roughness: 0.22, metalness: 0.22, flatShading: true }),
    { dayEi: 0.45, nightEi: 1.35 }
  );
  const citadelWingCyanAuraMat = new THREE.MeshBasicMaterial({
    color: 0x7ff0ff,
    transparent: true,
    opacity: 0.34,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
    fog: false
  });
  const citadelEnergyBridgeMat = new THREE.MeshBasicMaterial({
    color: 0x67e8f9,
    transparent: true,
    opacity: 0.42,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
    fog: false
  });
  const citadelEnergyRailMat = new THREE.MeshBasicMaterial({
    color: 0xfde047,
    transparent: true,
    opacity: 0.62,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    fog: false
  });

  // 共用幾何體（降 Draw Call 與記憶體分配）
  const sharedCitadelRockChunkGeo = new THREE.DodecahedronGeometry(1.0, 0);
  const sharedCitadelCrystalGeo = new THREE.ConeGeometry(0.42, 1.85, 5);
  const sharedCitadelShardGeo = new THREE.ConeGeometry(0.24, 1.1, 5);
  const sharedCitadelLanternPostGeo = new THREE.CylinderGeometry(0.11, 0.15, 0.62, 6);
  const sharedCitadelLanternCoreGeo = new THREE.BoxGeometry(0.28, 0.3, 0.28);
  const sharedCitadelLanternCapGeo = new THREE.ConeGeometry(0.36, 0.22, 4);
  const sharedCitadelFencePostGeo = new THREE.CylinderGeometry(0.065, 0.075, 0.48, 6);
  const sharedCitadelFenceCapGeo = new THREE.SphereGeometry(0.08, 6, 5);
  const sharedCitadelBushGeo1 = new THREE.IcosahedronGeometry(0.36, 1);
  const sharedCitadelBushGeo2 = new THREE.IcosahedronGeometry(0.25, 1);
  const sharedCitadelBlossomGeo = new THREE.OctahedronGeometry(0.065, 0);
  const sharedCitadelWindowFrameGeo = new THREE.BoxGeometry(0.56, 0.56, 0.1);
  const sharedCitadelWindowSillGeo = new THREE.BoxGeometry(0.64, 0.06, 0.14);
  const sharedCitadelWindowGlassGeo = new THREE.BoxGeometry(0.44, 0.44, 0.05);
  const sharedCitadelWindowMullHGeo = new THREE.BoxGeometry(0.44, 0.035, 0.07);
  const sharedCitadelWindowMullVGeo = new THREE.BoxGeometry(0.035, 0.44, 0.07);

  // Q 版輔助建模函式（窗框、石燈籠、花叢、低多邊形小樹）
  function addCitadelFramedWindow(parent, x, y, z, rotY = 0, scale = 1.0) {
    const wg = new THREE.Group();
    wg.position.set(x, y, z);
    wg.rotation.y = rotY;
    wg.scale.setScalar(scale);
    const frame = new THREE.Mesh(sharedCitadelWindowFrameGeo, woodDarkMat);
    const sill = new THREE.Mesh(sharedCitadelWindowSillGeo, woodDarkMat);
    sill.position.set(0, -0.28, 0.03);
    const glass = new THREE.Mesh(sharedCitadelWindowGlassGeo, windowWarmGlowMat);
    glass.position.z = 0.028;
    const mh = new THREE.Mesh(sharedCitadelWindowMullHGeo, woodDarkMat);
    mh.position.z = 0.04;
    const mv = new THREE.Mesh(sharedCitadelWindowMullVGeo, woodDarkMat);
    mv.position.z = 0.04;
    wg.add(frame, sill, glass, mh, mv);
    parent.add(wg);
    return wg;
  }

  function addCitadelStoneLantern(parent, x, y, z) {
    const lg = new THREE.Group();
    lg.position.set(x, y, z);
    const plinth = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.16, 0.44), citadelIvoryTrimMat);
    plinth.position.y = 0.08;
    const post = new THREE.Mesh(sharedCitadelLanternPostGeo, citadelRockMidMat);
    post.position.y = 0.46;
    const core = new THREE.Mesh(sharedCitadelLanternCoreGeo, windowWarmGlowMat);
    core.position.y = 0.9;
    const cap = new THREE.Mesh(sharedCitadelLanternCapGeo, citadelRockDeepMat);
    cap.position.y = 1.15;
    cap.rotation.y = Math.PI / 4;
    const finial = new THREE.Mesh(new THREE.OctahedronGeometry(0.08, 0), citadelGoldTrimMat);
    finial.position.y = 1.3;
    lg.add(plinth, post, core, cap, finial);

    const groundGlow = makeGroundGlowPlane(2.7, 2.7, 0xffc652, 0.035);
    lg.add(groundGlow.mesh);
    nightGlowUpdaters.push((nb, t) => {
      const show = nb > 0.01;
      groundGlow.mesh.visible = show;
      if (show) groundGlow.mat.opacity = (0.42 + 0.06 * Math.sin(t * 3.1 + x)) * nb;
    });
    parent.add(lg);
    return lg;
  }

  function addCitadelFlowerBush(parent, x, y, z, scale = 1.0, flowerMat = flowerDotPinkMat) {
    const bg = new THREE.Group();
    bg.position.set(x, y + 0.2 * scale, z);
    bg.scale.setScalar(scale);
    const f1 = new THREE.Mesh(sharedCitadelBushGeo1, flowerBushGreenMat);
    const f2 = new THREE.Mesh(sharedCitadelBushGeo2, flowerBushLightGreenMat);
    f2.position.set(0.16, 0.1, 0.12);
    bg.add(f1, f2);
    [
      [0.0, 0.34, 0.14],
      [-0.2, 0.2, 0.24],
      [0.24, 0.22, 0.16],
      [-0.14, 0.1, 0.31],
      [0.14, 0.32, -0.14]
    ].forEach(([fx, fy, fz]) => {
      const bl = new THREE.Mesh(sharedCitadelBlossomGeo, flowerMat);
      bl.position.set(fx, fy, fz);
      bg.add(bl);
    });
    parent.add(bg);
    return bg;
  }

  function addCitadelPineTree(parent, x, y, z, colorHex = 0x3ab764, scale = 1.0) {
    const tg = new THREE.Group();
    tg.position.set(x, y, z);
    tg.scale.setScalar(scale);
    const crownMat = new THREE.MeshStandardMaterial({ color: colorHex, flatShading: true, roughness: 0.65 });
    const trunk = new THREE.Mesh(decorGeo.trunk, sharedToyTreeTrunkMat);
    trunk.position.y = 0.35;
    const c1 = new THREE.Mesh(decorGeo.crownLo, crownMat);
    c1.position.y = 1.02;
    const c2 = new THREE.Mesh(decorGeo.crownHi, crownMat);
    c2.position.y = 1.64;
    tg.add(trunk, c1, c2);
    parent.add(tg);
    return tg;
  }

  // 1) 分層生態浮空島底座：暖灰多層切面岩盤 + 岩縫青金能量結晶 + 翠綠／青金交織草坪 + 象牙白大理石階梯廣場
  const CITADEL_TURF_Y = 0.86;
  const CITADEL_PLAZA_Y = 1.20;
  const CITADEL_DAIS_Y = 1.54;

  // 多層次暖灰岩盤浮島底座
  const citadelRockTier1 = new THREE.Mesh(new THREE.CylinderGeometry(7.7, 7.1, 1.05, 10), citadelRockTopMat);
  citadelRockTier1.position.y = -0.22;
  aetherCitadelGroup.add(citadelRockTier1);

  const citadelRockTier2 = new THREE.Mesh(new THREE.CylinderGeometry(6.8, 4.9, 1.75, 9), citadelRockMidMat);
  citadelRockTier2.position.y = -1.55;
  citadelRockTier2.rotation.y = 0.28;
  aetherCitadelGroup.add(citadelRockTier2);

  const citadelRockTier3 = new THREE.Mesh(new THREE.CylinderGeometry(4.6, 1.35, 2.4, 7), citadelRockDeepMat);
  citadelRockTier3.position.y = -3.45;
  citadelRockTier3.rotation.y = -0.22;
  aetherCitadelGroup.add(citadelRockTier3);

  // 岩盤外緣立體切面岩塊（營造低多邊形手雕岩石棱角）
  const rockLedgeSpecs = [
    { a: 0.2, r: 6.4, y: -0.95, sx: 1.7, sy: 0.75, sz: 1.3, mat: citadelRockTopMat },
    { a: 1.05, r: 6.1, y: -1.35, sx: 1.5, sy: 0.9, sz: 1.4, mat: citadelRockMidMat },
    { a: 1.9, r: 5.5, y: -1.8, sx: 1.8, sy: 0.95, sz: 1.35, mat: citadelRockMidMat },
    { a: 2.75, r: 6.2, y: -1.05, sx: 1.65, sy: 0.8, sz: 1.45, mat: citadelRockTopMat },
    { a: 3.55, r: 5.8, y: -1.65, sx: 1.6, sy: 0.88, sz: 1.3, mat: citadelRockMidMat },
    { a: 4.35, r: 4.4, y: -2.65, sx: 1.45, sy: 1.0, sz: 1.2, mat: citadelRockDeepMat },
    { a: 5.15, r: 6.1, y: -1.25, sx: 1.75, sy: 0.82, sz: 1.35, mat: citadelRockTopMat },
    { a: 5.85, r: 4.6, y: -2.45, sx: 1.5, sy: 0.95, sz: 1.25, mat: citadelRockDeepMat }
  ];
  rockLedgeSpecs.forEach((sp, ri) => {
    const chunk = new THREE.Mesh(sharedCitadelRockChunkGeo, sp.mat);
    chunk.position.set(Math.cos(sp.a) * sp.r, sp.y, Math.sin(sp.a) * sp.r);
    chunk.scale.set(sp.sx, sp.sy, sp.sz);
    chunk.rotation.set(0.22 * (ri % 3), sp.a + 0.4, -0.18 * (ri % 2));
    aetherCitadelGroup.add(chunk);
  });

  // 岩縫間鑲嵌的發光青金色能量結晶簇
  for (let c = 0; c < 6; c++) {
    const cAng = (c / 6) * Math.PI * 2 + 0.35;
    const isGold = c % 2 === 1;
    const cryMat = isGold ? citadelGoldCrystalMat : citadelCrystalMat;
    const cryCluster = new THREE.Group();
    const rFissure = 4.65 + (c % 2) * 0.75;
    const yFissure = -1.65 - (c % 3) * 0.48;
    cryCluster.position.set(Math.cos(cAng) * rFissure, yFissure, Math.sin(cAng) * rFissure);
    cryCluster.rotation.y = -cAng;

    const mainCry = new THREE.Mesh(sharedCitadelCrystalGeo, cryMat);
    mainCry.rotation.z = -1.95;
    cryCluster.add(mainCry);

    const sideShard = new THREE.Mesh(sharedCitadelShardGeo, isGold ? citadelCrystalMat : citadelGoldCrystalMat);
    sideShard.position.set(0.22, -0.25, 0.24);
    sideShard.rotation.set(0.32, 0.2, -2.18);
    cryCluster.add(sideShard);
    aetherCitadelGroup.add(cryCluster);
  }

  // 浮島底端核心結晶簇＋柔和發光暈（零 PointLight）
  const bottomApexCrystal = new THREE.Group();
  bottomApexCrystal.position.y = -5.25;
  const apexMainGem = new THREE.Mesh(new THREE.OctahedronGeometry(0.95, 0), citadelCrystalMat);
  apexMainGem.scale.set(0.82, 1.55, 0.82);
  bottomApexCrystal.add(apexMainGem);
  for (let bs = 0; bs < 3; bs++) {
    const ba = (bs / 3) * Math.PI * 2;
    const bShard = new THREE.Mesh(sharedCitadelShardGeo, bs % 2 === 0 ? citadelGoldCrystalMat : citadelCrystalMat);
    bShard.position.set(Math.cos(ba) * 0.68, 0.42, Math.sin(ba) * 0.68);
    bShard.rotation.set(Math.sin(ba) * 0.45, 0, Math.cos(ba) * 0.45 + Math.PI);
    bottomApexCrystal.add(bShard);
  }
  aetherCitadelGroup.add(bottomApexCrystal);

  const citadelUnderGlow = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: radialGlowTex,
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.42,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      fog: false
    })
  );
  citadelUnderGlow.scale.set(13.5, 13.5, 1);
  citadelUnderGlow.position.y = -4.6;
  citadelUnderGlow.renderOrder = 3;
  aetherCitadelGroup.add(citadelUnderGlow);

  // 島頂外緣米白石質護邊＋圓角翠綠草坪＋青金交織草坪台地
  const citadelCurbGeo = createRoundedCylinderGeometry(7.96, 7.88, 0.24, 0.08, 16);
  const citadelCurbMesh = new THREE.Mesh(citadelCurbGeo, citadelIvoryTrimMat);
  citadelCurbMesh.position.y = 0.22;
  aetherCitadelGroup.add(citadelCurbMesh);

  const citadelEmeraldTurfGeo = createRoundedCylinderGeometry(7.85, 8.12, 0.72, 0.28, 16);
  const citadelEmeraldTurfMesh = new THREE.Mesh(citadelEmeraldTurfGeo, citadelTurfEmeraldMat);
  citadelEmeraldTurfMesh.position.y = 0.5;
  aetherCitadelGroup.add(citadelEmeraldTurfMesh);

  // 青金草坪台地（左翼、右翼、後庭交織草坪與金色邊飾）
  const citadelWingTurfGeo = createRoundedCylinderGeometry(2.35, 2.55, 0.2, 0.08, 12);
  [-4.85, 4.85].forEach((tx) => {
    const wingTurf = new THREE.Mesh(citadelWingTurfGeo, citadelTurfCyanGoldMat);
    wingTurf.position.set(tx, 0.86, -0.35);
    aetherCitadelGroup.add(wingTurf);
    const wingGoldRim = new THREE.Mesh(new THREE.TorusGeometry(2.38, 0.045, 5, 16), citadelGoldTrimMat);
    wingGoldRim.rotation.x = Math.PI / 2;
    wingGoldRim.position.set(tx, 0.89, -0.35);
    aetherCitadelGroup.add(wingGoldRim);
  });
  const citadelRearTurf = new THREE.Mesh(createRoundedCylinderGeometry(3.15, 3.4, 0.18, 0.07, 12), citadelTurfCyanGoldMat);
  citadelRearTurf.position.set(0, 0.85, -4.55);
  aetherCitadelGroup.add(citadelRearTurf);

  // 象牙白大理石階梯廣場＋主殿高台＋前方迎賓大階梯
  const citadelPlazaTier1 = new THREE.Mesh(createRoundedCylinderGeometry(4.55, 4.9, 0.36, 0.11, 8), citadelMarbleMat);
  citadelPlazaTier1.position.set(0, 1.02, 0.45);
  aetherCitadelGroup.add(citadelPlazaTier1);

  const citadelPlazaRim1 = new THREE.Mesh(new THREE.TorusGeometry(4.56, 0.065, 6, 8), citadelGoldTrimMat);
  citadelPlazaRim1.rotation.x = Math.PI / 2;
  citadelPlazaRim1.rotation.z = Math.PI / 8;
  citadelPlazaRim1.position.set(0, 1.18, 0.45);
  aetherCitadelGroup.add(citadelPlazaRim1);

  const citadelCentralDais = new THREE.Mesh(createRoundedCylinderGeometry(3.05, 3.35, 0.34, 0.1, 8), citadelMarbleMat);
  citadelCentralDais.position.set(0, 1.37, -1.75);
  aetherCitadelGroup.add(citadelCentralDais);

  const citadelDaisRim = new THREE.Mesh(new THREE.TorusGeometry(3.06, 0.06, 6, 8), citadelGoldTrimMat);
  citadelDaisRim.rotation.x = Math.PI / 2;
  citadelDaisRim.rotation.z = Math.PI / 8;
  citadelDaisRim.position.set(0, 1.53, -1.75);
  aetherCitadelGroup.add(citadelDaisRim);

  // 前方迎賓象牙白大理石階梯（對齊島下螺旋星階終點）
  const stairGroup = new THREE.Group();
  stairGroup.position.set(0, 0, 0);
  aetherCitadelGroup.add(stairGroup);
  [
    { w: 3.1, h: 0.2, d: 0.85, y: 1.1, z: 4.85 },
    { w: 3.3, h: 0.22, d: 0.85, y: 0.96, z: 5.55 },
    { w: 3.5, h: 0.24, d: 0.9, y: 0.8, z: 6.25 }
  ].forEach((st) => {
    const stepMesh = new THREE.Mesh(new THREE.BoxGeometry(st.w, st.h, st.d), citadelMarbleMat);
    stepMesh.position.set(0, st.y, st.z);
    stairGroup.add(stepMesh);
    const goldLip = new THREE.Mesh(new THREE.BoxGeometry(st.w + 0.04, 0.04, 0.06), citadelGoldTrimMat);
    goldLip.position.set(0, st.y + st.h * 0.45, st.z + st.d * 0.48);
    stairGroup.add(goldLip);
  });
  [-1.78, 1.78].forEach((sx) => {
    const cheek = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.56, 2.2), citadelIvoryTrimMat);
    cheek.position.set(sx, 1.05, 5.55);
    stairGroup.add(cheek);
    const postHead = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 6), citadelGoldTrimMat);
    postHead.position.set(sx, 1.42, 6.48);
    stairGroup.add(postHead);
  });

  // 鵝卵石小徑（連接廣場與左右書院草坪）
  [
    [-3.15, 0.88, 1.65, 1.0], [-3.55, 0.88, 1.25, 0.9], [-3.95, 0.88, 0.9, 1.05],
    [3.15, 0.88, 1.65, 1.0], [3.55, 0.88, 1.25, 0.9], [3.95, 0.88, 0.9, 1.05]
  ].forEach(([cx, cy, cz, cs]) => {
    const stone = new THREE.Mesh(new THREE.CylinderGeometry(0.22 * cs, 0.26 * cs, 0.05, 7), cobbleStonePathMat);
    stone.position.set(cx, cy, cz);
    stone.rotation.y = cx * 2.1;
    aetherCitadelGroup.add(stone);
  });

  // Q 版低多邊形小樹（圓球樹＋松樹混搭）、花叢、石燈籠與可愛木欄杆
  aetherCitadelGroup.add((() => { const t = createToyTree(0x4cc970, 0.95); t.position.set(-4.85, CITADEL_TURF_Y, -4.35); return t; })());
  aetherCitadelGroup.add((() => { const t = createToyTree(0x68d886, 0.95); t.position.set(4.85, CITADEL_TURF_Y, -4.35); return t; })());
  aetherCitadelGroup.add((() => { const t = createToyTree(0x56c972, 0.82); t.position.set(-5.6, CITADEL_TURF_Y, 3.05); return t; })());
  aetherCitadelGroup.add((() => { const t = createToyTree(0x68d886, 0.82); t.position.set(5.6, CITADEL_TURF_Y, 3.05); return t; })());
  addCitadelPineTree(aetherCitadelGroup, -3.15, 0.94, -5.55, 0x3ab764, 0.88);
  addCitadelPineTree(aetherCitadelGroup, 3.15, 0.94, -5.55, 0x52d6a6, 0.85);

  addCitadelFlowerBush(aetherCitadelGroup, -3.55, CITADEL_TURF_Y, 4.55, 1.05, flowerDotPinkMat);
  addCitadelFlowerBush(aetherCitadelGroup, 3.55, CITADEL_TURF_Y, 4.55, 1.05, flowerDotYellowMat);
  addCitadelFlowerBush(aetherCitadelGroup, -6.25, CITADEL_TURF_Y, 1.55, 0.9, flowerDotWhiteMat);
  addCitadelFlowerBush(aetherCitadelGroup, 6.25, CITADEL_TURF_Y, 1.55, 0.9, flowerDotPinkMat);
  addCitadelFlowerBush(aetherCitadelGroup, -2.55, 0.94, -4.65, 0.92, flowerDotYellowMat);
  addCitadelFlowerBush(aetherCitadelGroup, 2.55, 0.94, -4.65, 0.92, flowerDotWhiteMat);

  addCitadelStoneLantern(aetherCitadelGroup, -2.25, CITADEL_TURF_Y, 5.4);
  addCitadelStoneLantern(aetherCitadelGroup, 2.25, CITADEL_TURF_Y, 5.4);
  addCitadelStoneLantern(aetherCitadelGroup, -3.45, CITADEL_TURF_Y, 2.45);
  addCitadelStoneLantern(aetherCitadelGroup, 3.45, CITADEL_TURF_Y, 2.45);

  // 外緣可愛低多邊形木柵欄（避開前方大階梯與左右能量光橋登陸口）
  const citadelFenceAngles = [];
  for (let fi = 0; fi < 24; fi++) {
    const fa = (fi / 24) * Math.PI * 2;
    const fx = Math.cos(fa) * 7.25;
    const fz = Math.sin(fa) * 7.25;
    if (fz > 4.2 && Math.abs(fx) < 3.6) continue;
    if (Math.abs(fx) > 6.2 && fz > -1.7 && fz < 0.7) continue;
    citadelFenceAngles.push({ fa, fx, fz });
  }
  citadelFenceAngles.forEach(({ fx, fz }) => {
    const post = new THREE.Mesh(sharedCitadelFencePostGeo, woodFenceMat);
    post.position.set(fx, CITADEL_TURF_Y + 0.22, fz);
    const cap = new THREE.Mesh(sharedCitadelFenceCapGeo, citadelIvoryTrimMat);
    cap.position.set(fx, CITADEL_TURF_Y + 0.48, fz);
    aetherCitadelGroup.add(post, cap);
  });

  // 2) 外圍兩道緩慢反向旋轉的青金色星軌光環（Lv.3 全亮並增輝）
  const citadelOuterRingPivot = new THREE.Group();
  citadelOuterRingPivot.position.y = 0.4;
  citadelOuterRingPivot.rotation.set(0.13, 0, 0.08);
  aetherCitadelGroup.add(citadelOuterRingPivot);

  const citadelOuterRingRot = new THREE.Group();
  citadelOuterRingPivot.add(citadelOuterRingRot);
  const citadelOuterTorus = new THREE.Mesh(new THREE.TorusGeometry(9.65, 0.13, 6, 48), citadelRingCyanMat);
  citadelOuterTorus.rotation.x = Math.PI / 2;
  citadelOuterRingRot.add(citadelOuterTorus);

  const citadelOuterAuraMat = new THREE.MeshBasicMaterial({
    color: 0x67e8f9,
    transparent: true,
    opacity: 0.32,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    fog: false
  });
  const citadelOuterAuraRing = new THREE.Mesh(new THREE.TorusGeometry(9.65, 0.26, 6, 48), citadelOuterAuraMat);
  citadelOuterAuraRing.rotation.x = Math.PI / 2;
  citadelOuterAuraRing.visible = false;
  citadelOuterRingRot.add(citadelOuterAuraRing);

  const sharedStarNodeGeo = new THREE.OctahedronGeometry(0.36, 0);
  const citadelOuterStarNodes = [];
  for (let sn = 0; sn < 8; sn++) {
    const a = (sn / 8) * Math.PI * 2;
    const node = new THREE.Mesh(sharedStarNodeGeo, sn % 2 === 0 ? citadelRingGoldMat : citadelRingCyanMat);
    node.position.set(Math.cos(a) * 9.65, 0, Math.sin(a) * 9.65);
    if (sn % 2 === 1) node.visible = false;
    citadelOuterRingRot.add(node);
    citadelOuterStarNodes.push({ mesh: node, isExtra: sn % 2 === 1 });
  }

  const citadelInnerRingPivot = new THREE.Group();
  citadelInnerRingPivot.position.y = 0.4;
  citadelInnerRingPivot.rotation.set(-0.16, 0, -0.09);
  aetherCitadelGroup.add(citadelInnerRingPivot);

  const citadelInnerRingRot = new THREE.Group();
  citadelInnerRingPivot.add(citadelInnerRingRot);
  const citadelInnerTorus = new THREE.Mesh(new THREE.TorusGeometry(8.5, 0.1, 6, 40), citadelRingGoldMat);
  citadelInnerTorus.rotation.x = Math.PI / 2;
  citadelInnerRingRot.add(citadelInnerTorus);

  const citadelInnerAuraMat = new THREE.MeshBasicMaterial({
    color: 0xfde047,
    transparent: true,
    opacity: 0.28,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    fog: false
  });
  const citadelInnerAuraRing = new THREE.Mesh(new THREE.TorusGeometry(8.5, 0.22, 6, 40), citadelInnerAuraMat);
  citadelInnerAuraRing.rotation.x = Math.PI / 2;
  citadelInnerAuraRing.visible = false;
  citadelInnerRingRot.add(citadelInnerAuraRing);

  // 3) 四階段建築進化群組 (Lv.0 ~ Lv.3)
  // [Lv.0 基礎配置]：白玉傳送拱門（z = +1.55）＋ Q 版守門衛士「阿爾法」（z = +3.85）＋ 中央未啟動迷你星象儀底座
  const archwayGroup = new THREE.Group();
  archwayGroup.position.set(0, CITADEL_PLAZA_Y, 1.55);
  aetherCitadelGroup.add(archwayGroup);

  const archPillarPlinthGeo = new THREE.BoxGeometry(0.86, 0.34, 0.86);
  const archPillarGeo = new THREE.CylinderGeometry(0.28, 0.34, 2.75, 8);
  [-2.25, 2.25].forEach((ax) => {
    const plinth = new THREE.Mesh(archPillarPlinthGeo, citadelMarbleMat);
    plinth.position.set(ax, 0.17, 0);
    const ap = new THREE.Mesh(archPillarGeo, citadelArchMat);
    ap.position.set(ax, 1.65, 0);
    const collar = new THREE.Mesh(new THREE.TorusGeometry(0.34, 0.055, 6, 12), citadelGoldTrimMat);
    collar.rotation.x = Math.PI / 2;
    collar.position.set(ax, 2.95, 0);
    const sconce = new THREE.Mesh(new THREE.OctahedronGeometry(0.16, 0), windowWarmGlowMat);
    sconce.position.set(ax, 1.9, 0.36);
    archwayGroup.add(plinth, ap, collar, sconce);
  });
  const archSpan = new THREE.Mesh(new THREE.TorusGeometry(2.25, 0.26, 8, 24, Math.PI), citadelArchMat);
  archSpan.position.set(0, 2.95, 0);
  const archKeystone = new THREE.Mesh(new THREE.OctahedronGeometry(0.32, 0), citadelGoldTrimMat);
  archKeystone.position.set(0, 5.28, 0);
  archwayGroup.add(archSpan, archKeystone);

  // 傳送門 Canvas 2D 輻射漸層貼圖（解封時點亮）
  function createPortalTexture() {
    const cv = document.createElement("canvas");
    cv.width = 128;
    cv.height = 128;
    const ctx = cv.getContext("2d");
    const g = ctx.createRadialGradient(64, 64, 4, 64, 64, 62);
    g.addColorStop(0.0, "rgba(255, 250, 210, 1.0)");
    g.addColorStop(0.32, "rgba(103, 232, 249, 0.85)");
    g.addColorStop(0.7, "rgba(251, 191, 36, 0.45)");
    g.addColorStop(1.0, "rgba(56, 189, 248, 0.0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 128, 128);
    const tex = new THREE.CanvasTexture(cv);
    tex.minFilter = THREE.LinearFilter;
    return tex;
  }
  const portalMat = new THREE.MeshBasicMaterial({
    map: createPortalTexture(),
    transparent: true,
    opacity: 0.88,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
    fog: false
  });
  const citadelPortalMesh = new THREE.Mesh(new THREE.CircleGeometry(1.95, 24), portalMat);
  citadelPortalMesh.position.set(0, 2.52, 0);
  citadelPortalMesh.visible = false;
  archwayGroup.add(citadelPortalMesh);

  // Q 版守門衛士：【全息機關守衛．阿爾法】（圓潤動森公仔比例＋六角能量盾＋邏輯星杖）
  const guardAlphaGroup = new THREE.Group();
  guardAlphaGroup.position.set(0, CITADEL_PLAZA_Y, 3.8);
  aetherCitadelGroup.add(guardAlphaGroup);

  const guardArmorMat = new THREE.MeshStandardMaterial({ color: 0x3b4d66, roughness: 0.36, metalness: 0.45, flatShading: true });
  const guardIvoryPlateMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.38, metalness: 0.12, flatShading: true });
  const guardTrimMat = new THREE.MeshStandardMaterial({ color: 0xfbbf24, emissive: 0xd97706, emissiveIntensity: 0.35, roughness: 0.25, metalness: 0.55, flatShading: true });
  const guardVisorMat = new THREE.MeshStandardMaterial({ color: 0x67e8f9, emissive: 0x06b6d4, emissiveIntensity: 1.1, roughness: 0.15, flatShading: true });
  const guardShieldFaceMat = new THREE.MeshBasicMaterial({
    color: 0x38bdf8,
    transparent: true,
    opacity: 0.45,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide
  });

  // 圓潤短足與裝甲軀幹（Q 版三頭身比例）
  const guardLegGeo = new THREE.CylinderGeometry(0.19, 0.25, 0.62, 8);
  [-0.26, 0.26].forEach((lx) => {
    const leg = new THREE.Mesh(guardLegGeo, guardArmorMat);
    leg.position.set(lx, 0.31, 0);
    const boot = new THREE.Mesh(new THREE.SphereGeometry(0.24, 8, 6), guardTrimMat);
    boot.scale.set(1.0, 0.65, 1.25);
    boot.position.set(lx, 0.14, 0.06);
    guardAlphaGroup.add(leg, boot);
  });
  const guardTorso = new THREE.Mesh(new THREE.CylinderGeometry(0.48, 0.56, 0.92, 8), guardArmorMat);
  guardTorso.position.y = 1.05;
  guardAlphaGroup.add(guardTorso);
  const guardChestPlate = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.58, 0.22), guardIvoryPlateMat);
  guardChestPlate.position.set(0, 1.08, 0.36);
  guardAlphaGroup.add(guardChestPlate);
  const guardChestCore = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.19, 0.12, 6), guardVisorMat);
  guardChestCore.rotation.x = Math.PI / 2;
  guardChestCore.position.set(0, 1.08, 0.45);
  guardAlphaGroup.add(guardChestCore);

  const guardPauldronGeo = new THREE.DodecahedronGeometry(0.28, 0);
  [-0.64, 0.64].forEach((px) => {
    const pld = new THREE.Mesh(guardPauldronGeo, guardTrimMat);
    pld.position.set(px, 1.42, 0);
    guardAlphaGroup.add(pld);
  });

  // 可愛放大圓角頭盔＋發光眼罩＋金色羽冠天線
  const guardHead = new THREE.Mesh(new THREE.DodecahedronGeometry(0.56, 0), guardIvoryPlateMat);
  guardHead.scale.set(1.08, 0.92, 0.98);
  guardHead.position.y = 1.98;
  guardAlphaGroup.add(guardHead);
  const guardHelmCrest = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.42, 5), guardTrimMat);
  guardHelmCrest.position.set(0, 2.58, 0);
  guardAlphaGroup.add(guardHelmCrest);
  const guardVisorBg = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.3, 0.2), guardArmorMat);
  guardVisorBg.position.set(0, 1.98, 0.42);
  guardAlphaGroup.add(guardVisorBg);
  const guardVisor = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.18, 0.1), guardVisorMat);
  guardVisor.position.set(0, 1.98, 0.5);
  guardAlphaGroup.add(guardVisor);

  // 左手：六角能量盾
  const guardLeftArmPivot = new THREE.Group();
  guardLeftArmPivot.position.set(0.66, 1.32, 0);
  guardAlphaGroup.add(guardLeftArmPivot);
  const guardArmL = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.14, 0.68, 6), guardArmorMat);
  guardArmL.position.set(0, -0.28, 0.14);
  guardArmL.rotation.x = -0.35;
  guardLeftArmPivot.add(guardArmL);

  const hexShieldGroup = new THREE.Group();
  hexShieldGroup.position.set(0.12, -0.35, 0.56);
  guardLeftArmPivot.add(hexShieldGroup);
  const hexShieldFace = new THREE.Mesh(new THREE.CylinderGeometry(0.82, 0.82, 0.07, 6), guardShieldFaceMat);
  hexShieldFace.rotation.x = Math.PI / 2;
  hexShieldGroup.add(hexShieldFace);
  const hexShieldRim = new THREE.Mesh(new THREE.TorusGeometry(0.84, 0.055, 6, 6), guardVisorMat);
  hexShieldGroup.add(hexShieldRim);

  // 右手：星晶邏輯法杖
  const guardRightArmPivot = new THREE.Group();
  guardRightArmPivot.position.set(-0.66, 1.32, 0);
  guardAlphaGroup.add(guardRightArmPivot);
  const guardArmR = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.14, 0.68, 6), guardArmorMat);
  guardArmR.position.set(0, -0.28, 0.12);
  guardArmR.rotation.x = -0.3;
  guardRightArmPivot.add(guardArmR);

  const staffShaft = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 2.35, 6), guardTrimMat);
  staffShaft.position.set(-0.1, -0.05, 0.38);
  guardRightArmPivot.add(staffShaft);
  const staffCrystal = new THREE.Mesh(new THREE.OctahedronGeometry(0.26, 0), citadelCrystalMat);
  staffCrystal.position.set(-0.1, 1.28, 0.38);
  guardRightArmPivot.add(staffCrystal);
  const staffHalo = new THREE.Mesh(new THREE.TorusGeometry(0.38, 0.038, 6, 16), guardTrimMat);
  staffHalo.position.set(-0.1, 1.28, 0.38);
  guardRightArmPivot.add(staffHalo);

  // [Lv.0 中央未啟動迷你星象儀底座]（Lv.0~1 顯示，Lv.2 起由宏偉星樞主殿取代）
  const citadelLv0AstrolabeGroup = new THREE.Group();
  citadelLv0AstrolabeGroup.name = "citadelLv0AstrolabeGroup";
  citadelLv0AstrolabeGroup.position.set(0, CITADEL_DAIS_Y, -1.75);
  aetherCitadelGroup.add(citadelLv0AstrolabeGroup);

  const astroStep1 = new THREE.Mesh(new THREE.CylinderGeometry(1.45, 1.65, 0.28, 8), citadelMarbleMat);
  astroStep1.position.y = 0.14;
  const astroStep2 = new THREE.Mesh(new THREE.CylinderGeometry(1.02, 1.18, 0.34, 8), citadelIvoryTrimMat);
  astroStep2.position.y = 0.45;
  const astroGoldRing = new THREE.Mesh(new THREE.TorusGeometry(1.04, 0.05, 6, 16), citadelGoldTrimMat);
  astroGoldRing.rotation.x = Math.PI / 2;
  astroGoldRing.position.y = 0.62;
  citadelLv0AstrolabeGroup.add(astroStep1, astroStep2, astroGoldRing);

  [[-0.78, -0.78], [0.78, -0.78], [-0.78, 0.78], [0.78, 0.78]].forEach(([px, pz]) => {
    const miniCol = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.11, 0.78, 6), citadelMarbleMat);
    miniCol.position.set(px, 0.66, pz);
    const miniCap = new THREE.Mesh(new THREE.OctahedronGeometry(0.11, 0), citadelGoldTrimMat);
    miniCap.position.set(px, 1.12, pz);
    citadelLv0AstrolabeGroup.add(miniCol, miniCap);
  });
  const astroCradle = new THREE.Mesh(new THREE.TorusGeometry(0.54, 0.055, 6, 16), citadelIvoryTrimMat);
  astroCradle.rotation.x = Math.PI / 2;
  astroCradle.position.y = 0.96;
  const astroDormantCore = new THREE.Mesh(new THREE.OctahedronGeometry(0.4, 0), citadelDormantCrystalMat);
  astroDormantCore.position.y = 1.32;
  citadelLv0AstrolabeGroup.add(astroCradle, astroDormantCore);

  // [Lv.1 雙翼書院擴建]：左側「邏輯智庫鐘樓」＋ 右側「鑑識檔案閣」＋ 中央第一層青金色旋轉渾天儀環
  const citadelLv1LeftTower = new THREE.Group();
  citadelLv1LeftTower.name = "citadelLv1LeftTower";
  citadelLv1LeftTower.position.set(-4.85, 0.96, -0.35);
  citadelLv1LeftTower.visible = false;
  aetherCitadelGroup.add(citadelLv1LeftTower);

  // 左側「邏輯智庫鐘樓」
  const ctPlinth = new THREE.Mesh(new THREE.BoxGeometry(1.96, 0.26, 1.96), citadelMarbleMat);
  ctPlinth.position.y = 0.13;
  const ctStep = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.14, 0.45), woodLightMat);
  ctStep.position.set(0, 0.07, 1.12);
  const ctBody = new THREE.Mesh(new THREE.BoxGeometry(1.56, 1.68, 1.56), citadelWallCreamMat);
  ctBody.position.y = 1.1;
  citadelLv1LeftTower.add(ctPlinth, ctStep, ctBody);

  [-0.76, 0.76].forEach((px) => {
    [-0.76, 0.76].forEach((pz) => {
      const beam = new THREE.Mesh(new THREE.BoxGeometry(0.14, 1.7, 0.14), woodDarkMat);
      beam.position.set(px, 1.1, pz);
      citadelLv1LeftTower.add(beam);
    });
  });
  // 鐘樓大門與暖黃發光窗格
  const ctDoor = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.82, 0.08), woodLightMat);
  ctDoor.position.set(0, 0.68, 0.79);
  citadelLv1LeftTower.add(ctDoor);
  addCitadelFramedWindow(citadelLv1LeftTower, 0, 1.48, 0.8, 0, 0.9);
  addCitadelFramedWindow(citadelLv1LeftTower, -0.8, 1.25, 0, -Math.PI / 2, 0.9);
  addCitadelFramedWindow(citadelLv1LeftTower, 0.8, 1.25, 0, Math.PI / 2, 0.9);

  // 鐘樓上層開放式鐘亭＋搖擺金鐘＋雙層小尖塔屋頂
  const ctMidEave = new THREE.Mesh(new THREE.BoxGeometry(1.86, 0.14, 1.86), citadelIvoryTrimMat);
  ctMidEave.position.y = 2.0;
  citadelLv1LeftTower.add(ctMidEave);
  [[-0.54, -0.54], [0.54, -0.54], [-0.54, 0.54], [0.54, 0.54]].forEach(([bx, bz]) => {
    const bCol = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.09, 0.95, 6), citadelMarbleMat);
    bCol.position.set(bx, 2.54, bz);
    citadelLv1LeftTower.add(bCol);
  });
  const ctBellPivot = new THREE.Group();
  ctBellPivot.position.set(0, 2.95, 0);
  const ctBellBody = new THREE.Mesh(new THREE.ConeGeometry(0.24, 0.36, 8), citadelGoldTrimMat);
  ctBellBody.position.y = -0.22;
  const ctBellClapper = new THREE.Mesh(new THREE.SphereGeometry(0.07, 6, 6), citadelCrystalMat);
  ctBellClapper.position.y = -0.4;
  ctBellPivot.add(ctBellBody, ctBellClapper);
  citadelLv1LeftTower.add(ctBellPivot);

  const ctClockDial = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.06, 12), windowWarmGlowMat);
  ctClockDial.rotation.x = Math.PI / 2;
  ctClockDial.position.set(0, 2.56, 0.64);
  const ctClockRim = new THREE.Mesh(new THREE.TorusGeometry(0.25, 0.035, 6, 12), citadelGoldTrimMat);
  ctClockRim.position.set(0, 2.56, 0.65);
  citadelLv1LeftTower.add(ctClockDial, ctClockRim);

  const ctRoofEave = new THREE.Mesh(new THREE.BoxGeometry(1.72, 0.12, 1.72), citadelRoofWarmTileMat);
  ctRoofEave.position.y = 3.06;
  const ctSpireRoof = new THREE.Mesh(new THREE.ConeGeometry(1.22, 1.48, 4), citadelRoofGoldMat);
  ctSpireRoof.position.y = 3.84;
  ctSpireRoof.rotation.y = Math.PI / 4;
  const ctSpireTip = new THREE.Mesh(new THREE.OctahedronGeometry(0.18, 0), citadelCrystalMat);
  ctSpireTip.position.y = 4.68;
  citadelLv1LeftTower.add(ctRoofEave, ctSpireRoof, ctSpireTip);

  const ctNightGlow = makeGroundGlowPlane(3.8, 3.8, 0xffbe55, 0.04);
  citadelLv1LeftTower.add(ctNightGlow.mesh);
  nightGlowUpdaters.push((nb) => {
    const show = nb > 0.01 && citadelLv1LeftTower.visible;
    ctNightGlow.mesh.visible = show;
    if (show) ctNightGlow.mat.opacity = 0.44 * nb;
  });

  // 右側「鑑識檔案閣」
  const citadelLv1RightArchive = new THREE.Group();
  citadelLv1RightArchive.name = "citadelLv1RightArchive";
  citadelLv1RightArchive.position.set(4.85, 0.96, -0.35);
  citadelLv1RightArchive.visible = false;
  aetherCitadelGroup.add(citadelLv1RightArchive);

  const arPlinth = new THREE.Mesh(new THREE.BoxGeometry(2.12, 0.24, 1.78), citadelMarbleMat);
  arPlinth.position.y = 0.12;
  const arStep = new THREE.Mesh(new THREE.BoxGeometry(0.92, 0.14, 0.44), woodLightMat);
  arStep.position.set(0, 0.07, 1.04);
  const arBody = new THREE.Mesh(new THREE.BoxGeometry(1.86, 1.32, 1.48), citadelWallCreamMat);
  arBody.position.y = 0.9;
  citadelLv1RightArchive.add(arPlinth, arStep, arBody);

  [-0.9, 0.9].forEach((px) => {
    [-0.71, 0.71].forEach((pz) => {
      const beam = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.34, 0.12), woodDarkMat);
      beam.position.set(px, 0.9, pz);
      citadelLv1RightArchive.add(beam);
    });
  });
  const arDoorFrame = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.88, 0.08), woodDarkMat);
  arDoorFrame.position.set(0, 0.66, 0.75);
  const arDoorPanel = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.78, 0.06), woodLightMat);
  arDoorPanel.position.set(0, 0.64, 0.77);
  citadelLv1RightArchive.add(arDoorFrame, arDoorPanel);

  addCitadelFramedWindow(citadelLv1RightArchive, -0.58, 0.96, 0.76, 0, 0.78);
  addCitadelFramedWindow(citadelLv1RightArchive, 0.58, 0.96, 0.76, 0, 0.78);
  addCitadelFramedWindow(citadelLv1RightArchive, -0.95, 0.96, 0, -Math.PI / 2, 0.82);
  addCitadelFramedWindow(citadelLv1RightArchive, 0.95, 0.96, 0, Math.PI / 2, 0.82);

  // 青藍瓦片雙層斜屋頂＋暖金屋脊＋放大鏡／卷宗發光徽章
  const arEave1 = new THREE.Mesh(new THREE.BoxGeometry(2.14, 0.12, 1.76), woodDarkMat);
  arEave1.position.y = 1.6;
  const arRoof = new THREE.Mesh(new THREE.ConeGeometry(1.58, 1.05, 4), citadelRoofTealMat);
  arRoof.position.y = 2.16;
  arRoof.rotation.y = Math.PI / 4;
  arRoof.scale.set(1.18, 1.0, 0.95);
  const arRidge = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 1.65, 6), citadelGoldTrimMat);
  arRidge.rotation.x = Math.PI / 2;
  arRidge.position.y = 2.66;
  const arLensBadge = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.055, 6, 12), citadelGoldTrimMat);
  arLensBadge.position.set(0, 2.02, 0.75);
  const arLensGlass = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.05, 10), citadelCrystalMat);
  arLensGlass.rotation.x = Math.PI / 2;
  arLensGlass.position.set(0, 2.02, 0.75);
  const arChimney = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.55, 0.26), citadelIvoryTrimMat);
  arChimney.position.set(0.52, 2.28, -0.36);
  citadelLv1RightArchive.add(arEave1, arRoof, arRidge, arLensBadge, arLensGlass, arChimney);

  const arNightGlow = makeGroundGlowPlane(3.8, 3.8, 0xffbe55, 0.04);
  citadelLv1RightArchive.add(arNightGlow.mesh);
  nightGlowUpdaters.push((nb) => {
    const show = nb > 0.01 && citadelLv1RightArchive.visible;
    arNightGlow.mesh.visible = show;
    if (show) arNightGlow.mat.opacity = 0.44 * nb;
  });

  // 中央星象儀第一層青金色旋轉渾天儀環（Lv.1 顯示）
  const citadelLv1Armillary = new THREE.Group();
  citadelLv1Armillary.name = "citadelLv1Armillary";
  citadelLv1Armillary.position.set(0, CITADEL_DAIS_Y + 1.32, -1.75);
  citadelLv1Armillary.visible = false;
  aetherCitadelGroup.add(citadelLv1Armillary);

  const lv1AstroCore = new THREE.Mesh(new THREE.OctahedronGeometry(0.45, 0), citadelCrystalMat);
  citadelLv1Armillary.add(lv1AstroCore);
  const lv1ArmRingA = new THREE.Group();
  lv1ArmRingA.rotation.set(0.38, 0, 0.24);
  const lv1RingCyan = new THREE.Mesh(new THREE.TorusGeometry(1.12, 0.068, 6, 32), citadelRingCyanMat);
  lv1RingCyan.rotation.x = Math.PI / 2;
  lv1ArmRingA.add(lv1RingCyan);
  for (let b = 0; b < 4; b++) {
    const ba = (b / 4) * Math.PI * 2;
    const bead = new THREE.Mesh(new THREE.OctahedronGeometry(0.12, 0), citadelGoldTrimMat);
    bead.position.set(Math.cos(ba) * 1.12, 0, Math.sin(ba) * 1.12);
    lv1ArmRingA.add(bead);
  }
  const lv1ArmRingB = new THREE.Mesh(new THREE.TorusGeometry(1.36, 0.05, 6, 32), citadelGoldTrimMat);
  lv1ArmRingB.rotation.set(Math.PI / 2.6, 0.35, 0);
  citadelLv1Armillary.add(lv1ArmRingA, lv1ArmRingB);

  // [Lv.2 星樞主殿與衛星副島]：金頂雙層神殿＋全息觀測塔尖、左右衛星懸空晶石副島＋能量光橋、慶典旗幟與漂浮晶簇
  const citadelLv2Temple = new THREE.Group();
  citadelLv2Temple.name = "citadelLv2Temple";
  citadelLv2Temple.position.set(0, CITADEL_DAIS_Y, -1.75);
  citadelLv2Temple.visible = false;
  aetherCitadelGroup.add(citadelLv2Temple);

  // 第一層神殿廊柱殿堂
  const t2Plinth = new THREE.Mesh(new THREE.CylinderGeometry(2.75, 2.95, 0.34, 8), citadelMarbleMat);
  t2Plinth.position.y = 0.17;
  const t2CoreWall = new THREE.Mesh(new THREE.CylinderGeometry(1.78, 1.88, 2.05, 8), citadelWallCreamMat);
  t2CoreWall.position.y = 1.36;
  citadelLv2Temple.add(t2Plinth, t2CoreWall);

  // 主殿暖黃發光長窗與神殿大門
  [0.72, -0.72, Math.PI / 2, -Math.PI / 2, Math.PI - 0.65, -Math.PI + 0.65].forEach((wa) => {
    const wx = Math.sin(wa) * 1.82;
    const wz = Math.cos(wa) * 1.82;
    const winMesh = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.88, 0.08), windowWarmGlowMat);
    winMesh.position.set(wx, 1.42, wz);
    winMesh.rotation.y = wa;
    const winTrim = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.96, 0.05), citadelGoldTrimMat);
    winTrim.position.set(wx * 0.99, 1.42, wz * 0.99);
    winTrim.rotation.y = wa;
    citadelLv2Temple.add(winTrim, winMesh);
  });
  const t2FrontDoor = new THREE.Mesh(new THREE.BoxGeometry(0.76, 1.25, 0.12), citadelGoldTrimMat);
  t2FrontDoor.position.set(0, 0.96, 1.82);
  const t2DoorGlow = new THREE.Mesh(new THREE.BoxGeometry(0.52, 1.05, 0.08), citadelCrystalMat);
  t2DoorGlow.position.set(0, 0.96, 1.87);
  citadelLv2Temple.add(t2FrontDoor, t2DoorGlow);

  // 6 根象牙白廊柱＋金飾柱頭＋青藍能量環
  for (let c = 0; c < 6; c++) {
    const ca = (c / 6) * Math.PI * 2 + Math.PI / 6;
    const cx = Math.cos(ca) * 2.38;
    const cz = Math.sin(ca) * 2.38;
    const colBase = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.28, 0.22, 8), citadelGoldTrimMat);
    colBase.position.set(cx, 0.45, cz);
    const colShaft = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.2, 2.05, 8), citadelMarbleMat);
    colShaft.position.set(cx, 1.56, cz);
    const colRing = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.04, 6, 12), citadelCrystalMat);
    colRing.rotation.x = Math.PI / 2;
    colRing.position.set(cx, 2.35, cz);
    citadelLv2Temple.add(colBase, colShaft, colRing);
  }

  // 一層飛簷金頂裙邊
  const t2EaveBase = new THREE.Mesh(new THREE.CylinderGeometry(2.65, 2.85, 0.24, 8), citadelMarbleMat);
  t2EaveBase.position.y = 2.68;
  const t2FirstRoof = new THREE.Mesh(new THREE.CylinderGeometry(2.05, 2.95, 0.52, 8), citadelRoofGoldMat);
  t2FirstRoof.position.y = 3.04;
  citadelLv2Temple.add(t2EaveBase, t2FirstRoof);

  // 第二層神殿圓亭與暖金雙層金頂
  const t2UpperWall = new THREE.Mesh(new THREE.CylinderGeometry(1.48, 1.56, 1.28, 8), citadelWallCreamMat);
  t2UpperWall.position.y = 3.92;
  citadelLv2Temple.add(t2UpperWall);
  for (let uc = 0; uc < 6; uc++) {
    const uca = (uc / 6) * Math.PI * 2;
    const uCol = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.13, 1.28, 8), citadelMarbleMat);
    uCol.position.set(Math.cos(uca) * 1.78, 3.92, Math.sin(uca) * 1.78);
    citadelLv2Temple.add(uCol);
    const uWin = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.56, 0.08), windowWarmGlowMat);
    const wa = uca + Math.PI / 6;
    uWin.position.set(Math.sin(wa) * 1.5, 3.94, Math.cos(wa) * 1.5);
    uWin.rotation.y = wa;
    citadelLv2Temple.add(uWin);
  }
  const t2UpperCornice = new THREE.Mesh(new THREE.CylinderGeometry(1.92, 1.78, 0.2, 8), citadelMarbleMat);
  t2UpperCornice.position.y = 4.64;
  const t2GoldDomeLower = new THREE.Mesh(new THREE.CylinderGeometry(1.32, 2.08, 0.55, 8), citadelRoofGoldMat);
  t2GoldDomeLower.position.y = 5.0;
  const t2GoldDomeCap = new THREE.Mesh(new THREE.ConeGeometry(1.42, 1.25, 8), citadelRoofGoldMat);
  t2GoldDomeCap.position.y = 5.88;
  const t2SpirePedestal = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.52, 0.35, 8), citadelGoldTrimMat);
  t2SpirePedestal.position.y = 6.56;
  citadelLv2Temple.add(t2UpperCornice, t2GoldDomeLower, t2GoldDomeCap, t2SpirePedestal);

  // 全息觀測塔尖 (Holographic Observatory Spire)
  const templeHoloSpireGroup = new THREE.Group();
  templeHoloSpireGroup.position.set(0, 7.25, 0);
  citadelLv2Temple.add(templeHoloSpireGroup);
  const templeRoofPrism = new THREE.Mesh(new THREE.OctahedronGeometry(0.48, 0), citadelCrystalMat);
  const holoRing1 = new THREE.Mesh(new THREE.TorusGeometry(0.92, 0.045, 6, 28), citadelRingCyanMat);
  holoRing1.rotation.x = Math.PI / 3;
  const holoRing2 = new THREE.Mesh(new THREE.TorusGeometry(1.16, 0.038, 6, 28), citadelGoldTrimMat);
  holoRing2.rotation.y = Math.PI / 4;
  templeHoloSpireGroup.add(templeRoofPrism, holoRing1, holoRing2);

  const lv2TempleGlow = makeGroundGlowPlane(6.2, 6.2, 0xffd166, 0.04);
  citadelLv2Temple.add(lv2TempleGlow.mesh);
  nightGlowUpdaters.push((nb) => {
    const show = nb > 0.01 && citadelLv2Temple.visible;
    lv2TempleGlow.mesh.visible = show;
    if (show) lv2TempleGlow.mat.opacity = 0.48 * nb;
  });

  // 左右兩座「衛星懸空晶石副島」＋ 半透明能量光橋
  function buildSatelliteCrystalIslet(sideSign) {
    const root = new THREE.Group();
    root.position.set(sideSign * 12.2, 1.35, -0.55);
    root.userData = { sideSign, baseY: 1.35 };
    const bounceWrap = new THREE.Group();
    root.add(bounceWrap);

    // 暖灰分層浮空岩座＋底部發光晶簇
    const sRock1 = new THREE.Mesh(new THREE.CylinderGeometry(2.15, 1.5, 0.95, 7), citadelRockTopMat);
    sRock1.position.y = -0.35;
    const sRock2 = new THREE.Mesh(new THREE.CylinderGeometry(1.45, 0.38, 1.35, 6), citadelRockDeepMat);
    sRock2.position.y = -1.42;
    sRock2.rotation.y = 0.4;
    bounceWrap.add(sRock1, sRock2);

    [0.5, 2.6, 4.7].forEach((a) => {
      const ledge = new THREE.Mesh(sharedCitadelRockChunkGeo, citadelRockMidMat);
      ledge.position.set(Math.cos(a) * 1.45, -0.78, Math.sin(a) * 1.45);
      ledge.scale.set(0.62, 0.36, 0.55);
      bounceWrap.add(ledge);
    });
    const satBotCrystal = new THREE.Mesh(sharedCitadelCrystalGeo, sideSign < 0 ? citadelCrystalMat : citadelGoldCrystalMat);
    satBotCrystal.position.y = -2.35;
    satBotCrystal.rotation.x = Math.PI;
    bounceWrap.add(satBotCrystal);

    // 翠綠／青金圓角草坪頂＋迷你白玉符文台＋懸空晶柱
    const sTurf = new THREE.Mesh(
      createRoundedCylinderGeometry(2.22, 2.36, 0.44, 0.15, 12),
      sideSign < 0 ? citadelTurfCyanGoldMat : citadelTurfEmeraldMat
    );
    sTurf.position.y = 0.22;
    bounceWrap.add(sTurf);

    const sAltar = new THREE.Mesh(new THREE.CylinderGeometry(0.86, 0.96, 0.22, 6), citadelMarbleMat);
    sAltar.position.y = 0.54;
    const sAltarRing = new THREE.Mesh(new THREE.TorusGeometry(0.88, 0.04, 6, 12), citadelGoldTrimMat);
    sAltarRing.rotation.x = Math.PI / 2;
    sAltarRing.position.y = 0.65;
    bounceWrap.add(sAltar, sAltarRing);

    const sCrystal = new THREE.Mesh(new THREE.OctahedronGeometry(0.52, 0), sideSign < 0 ? citadelCrystalMat : citadelGoldCrystalMat);
    sCrystal.scale.set(0.75, 1.45, 0.75);
    sCrystal.position.y = 1.55;
    const sCrystalRing = new THREE.Mesh(new THREE.TorusGeometry(0.72, 0.04, 6, 16), citadelRingCyanMat);
    sCrystalRing.rotation.x = Math.PI / 2.4;
    sCrystalRing.position.y = 1.55;
    bounceWrap.add(sCrystal, sCrystalRing);

    // 點綴微型灌木與接橋晶柱
    addCitadelFlowerBush(bounceWrap, sideSign * 0.95, 0.44, -0.95, 0.72, sideSign < 0 ? flowerDotYellowMat : flowerDotPinkMat);
    const satPylon = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.18, 0.75, 6), citadelMarbleMat);
    satPylon.position.set(-sideSign * 1.75, 0.72, 0);
    const satPylonGem = new THREE.Mesh(new THREE.OctahedronGeometry(0.18, 0), citadelCrystalMat);
    satPylonGem.position.set(-sideSign * 1.75, 1.24, 0);
    bounceWrap.add(satPylon, satPylonGem);

    return { root, bounceWrap, crystal: sCrystal, ring: sCrystalRing };
  }

  const citadelSatLeft = buildSatelliteCrystalIslet(-1);
  const citadelSatRight = buildSatelliteCrystalIslet(1);
  citadelSatLeft.root.visible = false;
  citadelSatRight.root.visible = false;
  aetherCitadelGroup.add(citadelSatLeft.root, citadelSatRight.root);

  function buildEnergyBridge(sideSign) {
    const bg = new THREE.Group();
    bg.position.set(sideSign * 8.9, 1.28, -0.55);
    bg.visible = false;
    // 主島端錨點水晶柱
    const mainPylon = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.2, 0.85, 6), citadelMarbleMat);
    mainPylon.position.set(-sideSign * 1.55, 0.02, 0);
    const mainPylonGem = new THREE.Mesh(new THREE.OctahedronGeometry(0.2, 0), citadelCrystalMat);
    mainPylonGem.position.set(-sideSign * 1.55, 0.6, 0);
    bg.add(mainPylon, mainPylonGem);

    // 5 段柔和拱形半透明能量光橋板＋兩側金青護欄光線
    for (let seg = 0; seg < 5; seg++) {
      const u = (seg + 0.5) / 5;
      const sx = sideSign * (-1.35 + u * 2.95);
      const sy = -0.25 + u * 0.62 + Math.sin(u * Math.PI) * 0.22;
      const plank = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.07, 1.15), citadelEnergyBridgeMat);
      plank.position.set(sx, sy, 0);
      plank.rotation.z = sideSign * 0.2;
      bg.add(plank);
    }
    [-0.56, 0.56].forEach((rz) => {
      const rail = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.032, 3.2, 6), citadelEnergyRailMat);
      rail.position.set(sideSign * 0.12, 0.22, rz);
      rail.rotation.z = Math.PI / 2 - sideSign * 0.2;
      bg.add(rail);
    });
    aetherCitadelGroup.add(bg);
    return bg;
  }
  const citadelLv2BridgeLeft = buildEnergyBridge(-1);
  const citadelLv2BridgeRight = buildEnergyBridge(1);

  // 慶典小旗幟與漂浮能量晶簇 (Lv.2)
  const citadelLv2Decor = new THREE.Group();
  citadelLv2Decor.name = "citadelLv2Decor";
  citadelLv2Decor.visible = false;
  aetherCitadelGroup.add(citadelLv2Decor);

  const citadelPennants = [];
  const pennantColors = [0xffd166, 0x38bdf8, 0xff70a6, 0x38bdf8, 0xffd166, 0x34d399];
  const pennantSpots = [
    [-2.75, CITADEL_PLAZA_Y, 4.25],
    [2.75, CITADEL_PLAZA_Y, 4.25],
    [-4.05, CITADEL_PLAZA_Y, 1.55],
    [4.05, CITADEL_PLAZA_Y, 1.55],
    [-3.25, 0.94, -3.55],
    [3.25, 0.94, -3.55]
  ];
  pennantSpots.forEach(([fx, fy, fz], fi) => {
    const fg = new THREE.Group();
    fg.position.set(fx, fy, fz);
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 1.65, 6), woodLightMat);
    pole.position.y = 0.825;
    const tip = new THREE.Mesh(new THREE.SphereGeometry(0.08, 6, 6), citadelGoldTrimMat);
    tip.position.y = 1.68;
    const flagGeo = new THREE.ConeGeometry(0.24, 0.68, 3);
    flagGeo.rotateZ(-Math.PI / 2);
    const flagMat = new THREE.MeshStandardMaterial({ color: pennantColors[fi % pennantColors.length], roughness: 0.55, flatShading: true });
    const flagPivot = new THREE.Group();
    flagPivot.position.set(0.04, 1.38, 0);
    const flagMesh = new THREE.Mesh(flagGeo, flagMat);
    flagMesh.position.x = 0.34;
    flagMesh.scale.set(1, 1, 0.25);
    flagPivot.add(flagMesh);
    fg.add(pole, tip, flagPivot);
    citadelLv2Decor.add(fg);
    citadelPennants.push({ pivot: flagPivot, phase: fi * 1.1 });
  });

  const citadelFloatingClusters = [];
  const clusterSpots = [
    { x: -7.9, y: 2.35, z: 3.1, gold: false },
    { x: 7.9, y: 2.35, z: 3.1, gold: true },
    { x: -6.9, y: 3.1, z: -4.4, gold: true },
    { x: 6.9, y: 3.1, z: -4.4, gold: false },
    { x: -12.2, y: 4.1, z: -0.55, gold: true },
    { x: 12.2, y: 4.1, z: -0.55, gold: false }
  ];
  clusterSpots.forEach((cs, ci) => {
    const cg = new THREE.Group();
    cg.position.set(cs.x, cs.y, cs.z);
    const cMain = new THREE.Mesh(new THREE.OctahedronGeometry(0.3, 0), cs.gold ? citadelGoldCrystalMat : citadelCrystalMat);
    cMain.scale.set(0.75, 1.45, 0.75);
    const cSub = new THREE.Mesh(sharedCitadelShardGeo, cs.gold ? citadelCrystalMat : citadelGoldCrystalMat);
    cSub.scale.setScalar(0.65);
    cSub.position.set(0.24, -0.1, 0.14);
    cSub.rotation.z = -0.45;
    cg.add(cMain, cSub);
    citadelLv2Decor.add(cg);
    citadelFloatingClusters.push({ group: cg, baseY: cs.y, phase: ci * 1.05 });
  });

  // [Lv.3 永恆星冠聖殿完全體]：主殿頂端「金色皇家星冠徽章」＋ 展開「流光聖翼造型」＋ 外圍雙星軌全亮
  const citadelLv3Crown = new THREE.Group();
  citadelLv3Crown.name = "citadelLv3Crown";
  citadelLv3Crown.position.set(0, CITADEL_DAIS_Y + 8.38, -1.75);
  citadelLv3Crown.visible = false;
  aetherCitadelGroup.add(citadelLv3Crown);

  const crownSpinGroup = new THREE.Group();
  citadelLv3Crown.add(crownSpinGroup);
  const crownBaseRing = new THREE.Mesh(new THREE.TorusGeometry(1.12, 0.085, 6, 24), citadelGoldTrimMat);
  crownBaseRing.rotation.x = Math.PI / 2;
  const crownCyanInnerRing = new THREE.Mesh(new THREE.TorusGeometry(0.86, 0.055, 6, 24), citadelCrystalMat);
  crownCyanInnerRing.rotation.x = Math.PI / 2;
  crownSpinGroup.add(crownBaseRing, crownCyanInnerRing);

  for (let cp = 0; cp < 6; cp++) {
    const ca = (cp / 6) * Math.PI * 2;
    const spike = new THREE.Mesh(new THREE.ConeGeometry(0.13, 0.62, 5), citadelGoldTrimMat);
    spike.position.set(Math.cos(ca) * 1.12, 0.34, Math.sin(ca) * 1.12);
    const gem = new THREE.Mesh(new THREE.OctahedronGeometry(0.11, 0), citadelCrystalMat);
    gem.position.set(Math.cos(ca) * 1.12, 0.7, Math.sin(ca) * 1.12);
    crownSpinGroup.add(spike, gem);
  }
  // 皇家立體星芒核心徽章
  const royalStarCore = new THREE.Mesh(new THREE.OctahedronGeometry(0.42, 0), citadelGoldCrystalMat);
  royalStarCore.position.y = 0.52;
  const royalStarBarH = new THREE.Mesh(new THREE.OctahedronGeometry(0.55, 0), citadelGoldTrimMat);
  royalStarBarH.scale.set(1.5, 0.24, 0.24);
  royalStarBarH.position.y = 0.52;
  const royalStarBarV = new THREE.Mesh(new THREE.OctahedronGeometry(0.55, 0), citadelGoldTrimMat);
  royalStarBarV.scale.set(0.24, 1.5, 0.24);
  royalStarBarV.position.y = 0.52;
  const crownHaloSprite = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: radialGlowTex,
      color: 0xffe066,
      transparent: true,
      opacity: 0.68,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      fog: false
    })
  );
  crownHaloSprite.scale.set(4.5, 4.5, 1);
  crownHaloSprite.position.y = 0.52;
  crownSpinGroup.add(royalStarCore, royalStarBarH, royalStarBarV, crownHaloSprite);

  // 展開的流光聖翼造型
  const citadelLv3Wings = new THREE.Group();
  citadelLv3Wings.name = "citadelLv3Wings";
  citadelLv3Wings.position.set(0, CITADEL_DAIS_Y + 2.75, -2.65);
  citadelLv3Wings.visible = false;
  aetherCitadelGroup.add(citadelLv3Wings);

  function buildSacredWing(sideSign) {
    const wingPivot = new THREE.Group();
    wingPivot.position.set(sideSign * 1.35, 0, 0);
    const spine = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.16, 0.16), citadelGoldTrimMat);
    spine.position.set(sideSign * 1.25, 0.65, -0.1);
    spine.rotation.z = sideSign * 0.48;
    wingPivot.add(spine);

    const featherConfigs = [
      { x: 1.15, y: 1.65, len: 2.35, w: 0.42, ang: 0.42 },
      { x: 2.05, y: 1.38, len: 2.85, w: 0.46, ang: 0.62 },
      { x: 2.65, y: 0.85, len: 2.55, w: 0.42, ang: 0.85 },
      { x: 2.35, y: 0.25, len: 2.05, w: 0.36, ang: 1.08 },
      { x: 1.75, y: -0.25, len: 1.55, w: 0.32, ang: 1.28 }
    ];
    featherConfigs.forEach((fc, idx) => {
      const fBlade = new THREE.Mesh(
        new THREE.BoxGeometry(fc.w, fc.len, 0.1),
        idx % 2 === 0 ? citadelWingFeatherMat : citadelGoldTrimMat
      );
      fBlade.position.set(sideSign * fc.x, fc.y, -0.18 - idx * 0.03);
      fBlade.rotation.z = -sideSign * fc.ang;
      const fAura = new THREE.Mesh(new THREE.PlaneGeometry(fc.w * 1.35, fc.len * 1.06), citadelWingCyanAuraMat);
      fAura.position.set(sideSign * fc.x, fc.y, -0.26 - idx * 0.03);
      fAura.rotation.z = -sideSign * fc.ang;
      wingPivot.add(fBlade, fAura);
    });
    citadelLv3Wings.add(wingPivot);
    return wingPivot;
  }
  const citadelWingLeft = buildSacredWing(-1);
  const citadelWingRight = buildSacredWing(1);

  // 4) 封印狀態：極柔和通透淡青金色半球形光幕（opacity: 0.12）＋ 底部微光符文環（移除刺眼密集線框球）
  const citadelBarrierGroup = new THREE.Group();
  citadelBarrierGroup.position.y = 0.72;
  aetherCitadelGroup.add(citadelBarrierGroup);

  function createBarrierDomeTexture() {
    const cv = document.createElement("canvas");
    cv.width = 64;
    cv.height = 128;
    const ctx = cv.getContext("2d");
    const g = ctx.createLinearGradient(0, 0, 0, 128);
    g.addColorStop(0.0, "rgba(165, 243, 252, 0.28)");
    g.addColorStop(0.45, "rgba(186, 230, 253, 0.62)");
    g.addColorStop(0.82, "rgba(253, 230, 138, 0.9)");
    g.addColorStop(1.0, "rgba(253, 224, 71, 1.0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 64, 128);
    const tex = new THREE.CanvasTexture(cv);
    tex.minFilter = THREE.LinearFilter;
    return tex;
  }

  function createBarrierRuneTexture() {
    const cv = document.createElement("canvas");
    cv.width = 256;
    cv.height = 256;
    const ctx = cv.getContext("2d");
    ctx.clearRect(0, 0, 256, 256);
    ctx.translate(128, 128);
    ctx.strokeStyle = "rgba(165, 243, 252, 0.78)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, 114, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = "rgba(253, 230, 138, 0.72)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, 102, 0, Math.PI * 2);
    ctx.stroke();
    for (let i = 0; i < 24; i++) {
      const ang = (i / 24) * Math.PI * 2;
      ctx.save();
      ctx.rotate(ang);
      ctx.fillStyle = i % 2 === 0 ? "rgba(253, 230, 138, 0.88)" : "rgba(165, 243, 252, 0.85)";
      if (i % 3 === 0) {
        ctx.beginPath();
        ctx.moveTo(108, -4);
        ctx.lineTo(114, 0);
        ctx.lineTo(108, 4);
        ctx.lineTo(102, 0);
        ctx.closePath();
        ctx.fill();
      } else {
        ctx.fillRect(104, -1.5, 8, 3);
      }
      ctx.restore();
    }
    const tex = new THREE.CanvasTexture(cv);
    tex.minFilter = THREE.LinearFilter;
    return tex;
  }

  const barrierDomeMat = new THREE.MeshBasicMaterial({
    map: createBarrierDomeTexture(),
    transparent: true,
    opacity: 0.12,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
    fog: false
  });
  const barrierDomeMesh = new THREE.Mesh(
    new THREE.SphereGeometry(9.6, 32, 16, 0, Math.PI * 2, 0, Math.PI * 0.54),
    barrierDomeMat
  );
  citadelBarrierGroup.add(barrierDomeMesh);

  const barrierRuneMat = new THREE.MeshBasicMaterial({
    map: createBarrierRuneTexture(),
    transparent: true,
    opacity: 0.52,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
    fog: false
  });
  const barrierRuneGeo = new THREE.RingGeometry(8.3, 9.65, 48);
  barrierRuneGeo.rotateX(-Math.PI / 2);
  const barrierRuneMesh = new THREE.Mesh(barrierRuneGeo, barrierRuneMat);
  barrierRuneMesh.position.y = 0.08;
  citadelBarrierGroup.add(barrierRuneMesh);

  const barrierBaseRimMat = new THREE.MeshBasicMaterial({
    color: 0xfde68a,
    transparent: true,
    opacity: 0.34,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    fog: false
  });
  const barrierBaseRimMesh = new THREE.Mesh(new THREE.TorusGeometry(9.55, 0.045, 6, 48), barrierBaseRimMat);
  barrierBaseRimMesh.rotation.x = Math.PI / 2;
  barrierBaseRimMesh.position.y = 0.08;
  citadelBarrierGroup.add(barrierBaseRimMesh);

  // 5) 解封狀態：島下垂直傳送光束 ＋ 環繞懸空星階（完全位於浮島正下方垂直軸線，與中央迷霧神秘礁岩零重疊，無 PointLight）
  const citadelAscensionGroup = new THREE.Group();
  citadelAscensionGroup.name = "citadelAscensionGroup";
  citadelAscensionGroup.position.set(CITADEL_BASE_POS.x, 0, CITADEL_BASE_POS.z);
  citadelAscensionGroup.userData = { isAetherCitadel: true };
  citadelAscensionGroup.visible = false;
  scene.add(citadelAscensionGroup);

  function createVerticalBeamTexture(topRgba, midRgba, botRgba) {
    const cv = document.createElement("canvas");
    cv.width = 64;
    cv.height = 256;
    const ctx = cv.getContext("2d");
    const g = ctx.createLinearGradient(0, 0, 0, 256);
    g.addColorStop(0.0, topRgba);
    g.addColorStop(0.45, midRgba);
    g.addColorStop(1.0, botRgba);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 64, 256);
    ctx.fillStyle = "rgba(255, 255, 255, 0.22)";
    for (let sx = 6; sx < 64; sx += 16) {
      ctx.fillRect(sx, 0, 3, 256);
    }
    const tex = new THREE.CanvasTexture(cv);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.ClampToEdgeWrapping;
    tex.minFilter = THREE.LinearFilter;
    return tex;
  }

  const citadelBeamHeight = 17.5;
  const citadelInnerBeamTex = createVerticalBeamTexture(
    "rgba(253, 224, 71, 0.92)",
    "rgba(103, 232, 249, 0.95)",
    "rgba(56, 189, 248, 0.45)"
  );
  const citadelInnerBeamMat = new THREE.MeshBasicMaterial({
    map: citadelInnerBeamTex,
    transparent: true,
    opacity: 0.35,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
    fog: false
  });
  const citadelInnerBeamMesh = new THREE.Mesh(
    new THREE.CylinderGeometry(1.18, 1.88, citadelBeamHeight, 24, 1, true),
    citadelInnerBeamMat
  );
  citadelInnerBeamMesh.position.y = 0.1 + citadelBeamHeight / 2;
  citadelInnerBeamMesh.renderOrder = 4;
  citadelAscensionGroup.add(citadelInnerBeamMesh);

  const citadelOuterBeamTex = createVerticalBeamTexture(
    "rgba(167, 139, 250, 0.72)",
    "rgba(56, 189, 248, 0.85)",
    "rgba(129, 140, 248, 0.25)"
  );
  const citadelOuterBeamMat = new THREE.MeshBasicMaterial({
    map: citadelOuterBeamTex,
    transparent: true,
    opacity: 0.16,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
    fog: false
  });
  const citadelOuterBeamMesh = new THREE.Mesh(
    new THREE.CylinderGeometry(2.35, 3.25, citadelBeamHeight, 24, 1, true),
    citadelOuterBeamMat
  );
  citadelOuterBeamMesh.position.y = 0.1 + citadelBeamHeight / 2;
  citadelOuterBeamMesh.renderOrder = 3;
  citadelAscensionGroup.add(citadelOuterBeamMesh);

  const citadelRippleRings = [];
  const citadelRippleSpecs = [
    { inner: 2.0, outer: 2.55, color: 0x67e8f9, y: 0.15, phase: 0.0 },
    { inner: 2.8, outer: 3.35, color: 0xfde047, y: 0.16, phase: 0.5 }
  ];
  citadelRippleSpecs.forEach((sp) => {
    const rMat = new THREE.MeshBasicMaterial({
      color: sp.color,
      transparent: true,
      opacity: 0.65,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
      fog: false
    });
    const rMesh = new THREE.Mesh(new THREE.RingGeometry(sp.inner, sp.outer, 32), rMat);
    rMesh.rotation.x = -Math.PI / 2;
    rMesh.position.y = sp.y;
    rMesh.userData.phase = sp.phase;
    citadelAscensionGroup.add(rMesh);
    citadelRippleRings.push(rMesh);
  });

  const citadelAscendRings = [];
  const citadelAscendRingGeo = new THREE.TorusGeometry(1.75, 0.085, 8, 32);
  [0.0, 0.5].forEach((phase, idx) => {
    const aMat = new THREE.MeshBasicMaterial({
      color: idx === 0 ? 0xfde047 : 0x67e8f9,
      transparent: true,
      opacity: 0.78,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      fog: false
    });
    const aRing = new THREE.Mesh(citadelAscendRingGeo, aMat);
    aRing.rotation.x = Math.PI / 2;
    aRing.position.y = 1 + phase * 16;
    aRing.userData.phase = phase;
    citadelAscensionGroup.add(aRing);
    citadelAscendRings.push(aRing);
  });

  const citadelSpiralSteps = [];
  const sharedCitadelStepCoreGeo = new THREE.CylinderGeometry(1.12, 0.94, 0.34, 6);
  const sharedCitadelStepTrimGeo = new THREE.CylinderGeometry(1.24, 1.06, 0.16, 6);
  const sharedCitadelStepPadGeo = new THREE.CylinderGeometry(0.76, 0.76, 0.05, 6);
  const citadelStepCoreMat = new THREE.MeshStandardMaterial({
    color: 0xfaf7ef,
    emissive: 0x0e7490,
    emissiveIntensity: 0.22,
    roughness: 0.38,
    metalness: 0.15,
    flatShading: true
  });
  const citadelStepTrimMat = new THREE.MeshStandardMaterial({
    color: 0xffd166,
    emissive: 0xd97706,
    emissiveIntensity: 0.55,
    roughness: 0.26,
    metalness: 0.35,
    flatShading: true
  });
  const citadelStepPadMat = new THREE.MeshStandardMaterial({
    color: 0x67e8f9,
    emissive: 0x06b6d4,
    emissiveIntensity: 0.85,
    roughness: 0.2,
    transparent: true,
    opacity: 0.9,
    flatShading: true
  });

  for (let i = 0; i < 7; i++) {
    const u = i / 6;
    const stepAng = -Math.PI * 0.6 + u * (Math.PI * 1.1);
    const stepRadius = 4.4 + u * 2.55;
    const stepBaseY = 1.6 + i * 2.55;

    const stepGroup = new THREE.Group();
    stepGroup.position.set(Math.cos(stepAng) * stepRadius, stepBaseY, Math.sin(stepAng) * stepRadius);
    stepGroup.rotation.y = -stepAng + Math.PI / 2;
    stepGroup.userData = { baseY: stepBaseY, index: i, isAetherCitadel: true };

    const core = new THREE.Mesh(sharedCitadelStepCoreGeo, citadelStepCoreMat);
    const trim = new THREE.Mesh(sharedCitadelStepTrimGeo, citadelStepTrimMat);
    trim.position.y = 0.04;
    const pad = new THREE.Mesh(sharedCitadelStepPadGeo, citadelStepPadMat);
    pad.position.y = 0.18;
    stepGroup.add(core, trim, pad);

    citadelAscensionGroup.add(stepGroup);
    citadelSpiralSteps.push(stepGroup);
  }

  // 升級慶祝金色擴散光環
  const citadelUpgradeRingGeo = new THREE.RingGeometry(0.6, 1.05, 24);
  citadelUpgradeRingGeo.rotateX(-Math.PI / 2);
  const citadelUpgradeRingMat = new THREE.MeshBasicMaterial({
    color: 0xffd166,
    transparent: true,
    opacity: 0,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    fog: false
  });
  const citadelUpgradeRing = new THREE.Mesh(citadelUpgradeRingGeo, citadelUpgradeRingMat);
  citadelUpgradeRing.position.set(0, 1.32, 0);
  citadelUpgradeRing.visible = false;
  aetherCitadelGroup.add(citadelUpgradeRing);

  // 6) 射線碰撞體與懸浮名牌
  const citadelHitMesh = new THREE.Mesh(
    new THREE.CylinderGeometry(11.4, 11.4, 17.5, 16),
    new THREE.MeshBasicMaterial({ visible: false })
  );
  citadelHitMesh.position.y = 2.8;
  citadelHitMesh.userData = { isAetherCitadel: true };
  aetherCitadelGroup.add(citadelHitMesh);

  const citadelLabelSprite = createLabelSprite("🔒", "天穹結界封印中", "天穹試煉浮島 · 七島皆達 80% 解封 (0/7)", "#7dd3fc", true);
  citadelLabelSprite.scale.set(12.2, 4.15, 1);
  citadelLabelSprite.position.set(0, 10.2, 0);
  citadelLabelSprite.renderOrder = 15;
  aetherCitadelGroup.add(citadelLabelSprite);

  function isCitadelModalOpen() {
    const modal = document.getElementById("aetherCitadelModal");
    return !!(modal && modal.classList.contains("show") && !modal.hidden);
  }

  function readCitadelChallengeProgress() {
    const tokenSet = new Set();
    const storeList = (window.Store && typeof window.Store.getCitadelTokens === "function")
      ? window.Store.getCitadelTokens()
      : [];
    if (Array.isArray(storeList)) {
      storeList.forEach((t) => tokenSet.add(String(t || "").trim().toLowerCase()));
    }
    const avList = (window.AvatarSystem && typeof window.AvatarSystem.getState === "function")
      ? (window.AvatarSystem.getState().citadelTokens || [])
      : [];
    if (Array.isArray(avList)) {
      avList.forEach((t) => tokenSet.add(String(t || "").trim().toLowerCase()));
    }
    const completedCount = CITADEL_CHALLENGE_KEYS.filter((k) => tokenSet.has(k)).length;
    let level = 0;
    if (completedCount >= 6) level = 3;
    else if (completedCount >= 3) level = 2;
    else if (completedCount >= 1) level = 1;
    return { completedCount, totalCount: CITADEL_CHALLENGE_KEYS.length, level };
  }

  function refreshCitadelLabelAndRings() {
    const lv = typeof citadelState.archLevel === "number" ? citadelState.archLevel : 0;
    const cnt = Number(citadelState.completedCount) || 0;
    const isMax = lv >= 3;

    // 外圍雙星軌光環：Lv.3 全亮增輝，Lv.0~2 維持柔和星軌
    const cyanCfg = nightMatMap.get(citadelRingCyanMat);
    if (cyanCfg) {
      cyanCfg.dayEi = isMax ? 1.45 : (citadelState.unlocked ? 0.55 : 0.28);
      cyanCfg.nightEi = isMax ? 2.4 : (citadelState.unlocked ? 1.3 : 0.72);
      citadelRingCyanMat.emissiveIntensity = THREE.MathUtils.lerp(cyanCfg.dayEi, cyanCfg.nightEi, nightBlend);
    }
    const goldCfg = nightMatMap.get(citadelRingGoldMat);
    if (goldCfg) {
      goldCfg.dayEi = isMax ? 1.35 : (citadelState.unlocked ? 0.48 : 0.24);
      goldCfg.nightEi = isMax ? 2.25 : (citadelState.unlocked ? 1.2 : 0.68);
      citadelRingGoldMat.emissiveIntensity = THREE.MathUtils.lerp(goldCfg.dayEi, goldCfg.nightEi, nightBlend);
    }
    citadelOuterAuraRing.visible = isMax;
    citadelInnerAuraRing.visible = isMax;
    citadelOuterStarNodes.forEach((n) => {
      if (n.isExtra) n.mesh.visible = isMax;
      n.mesh.scale.setScalar(isMax ? 1.32 : 0.92);
    });

    citadelLabelSprite.position.y = lv >= 2 ? 12.1 : 10.2;

    if (citadelLabelSprite.userData && citadelLabelSprite.userData.updateFullLabel) {
      if (isMax && (citadelState.unlocked || citadelState.archOverride !== null)) {
        citadelLabelSprite.userData.updateFullLabel({
          emoji: "👑",
          title: "永恆星冠聖殿（已攻頂）",
          subtitle: "Lv.3 (6/6) · 雙星軌全亮 · 天穹榮耀完全體",
          accentColor: "#ffd166",
          isLocked: false
        });
      } else if (citadelState.unlocked || citadelState.archOverride !== null) {
        const tierTitles = [
          "天穹試煉浮島 · 初始星台",
          "天穹試煉浮島 · 雙翼書院",
          "天穹試煉浮島 · 星樞主殿"
        ];
        const tierEmojis = ["✨", "🏛️", "🌟"];
        const tierSub = lv === 0
          ? (citadelState.teacherTempOpen && !citadelState.allSevenAt80
              ? `⚡ 演示模式 · Lv.0 (${cnt}/6) · 雙殿堂已敞開`
              : `Lv.0 (${cnt}/6) · 守衛阿爾法＆雙殿堂已敞開`)
          : lv === 1
            ? `Lv.1 (${cnt}/6) · 智庫鐘樓＆鑑識檔案閣已落成`
            : `Lv.2 (${cnt}/6) · 星樞主殿＆衛星晶石副島已升起`;
        citadelLabelSprite.userData.updateFullLabel({
          emoji: tierEmojis[lv] || "✨",
          title: tierTitles[lv] || "天穹試煉浮島",
          subtitle: tierSub,
          accentColor: "#ffd166",
          isLocked: false
        });
      } else {
        citadelLabelSprite.userData.updateFullLabel({
          emoji: "🔒",
          title: "天穹結界封印中",
          subtitle: `天穹試煉浮島 · 七島皆達 80% 解封 (${citadelState.metCount}/7)`,
          accentColor: "#7dd3fc",
          isLocked: true
        });
      }
    }

    const citadelHudBtn = document.getElementById("citadelHudBtn");
    if (citadelHudBtn) {
      if (isMax && citadelState.unlocked) {
        citadelHudBtn.textContent = "👑 永恆星冠聖殿";
      } else if (citadelState.unlocked) {
        citadelHudBtn.textContent = lv > 0 ? `✨ 天穹浮島 Lv.${lv}` : "✨ 天穹浮島";
      } else {
        citadelHudBtn.textContent = `🔒 天穹浮島 (${citadelState.metCount}/7)`;
      }
      citadelHudBtn.classList.toggle("is-unlocked", citadelState.unlocked);
      citadelHudBtn.classList.toggle("is-max", Boolean(isMax && citadelState.unlocked));
    }
  }

  function triggerCitadelArchitectureBounce(fromLevel, toLevel) {
    const now = clock.getElapsedTime();
    const lv1Targets = [citadelLv1LeftTower, citadelLv1RightArchive, citadelLv1Armillary];
    const lv2Targets = [
      citadelLv2Temple,
      citadelSatLeft.bounceWrap,
      citadelSatRight.bounceWrap,
      citadelLv2BridgeLeft,
      citadelLv2BridgeRight,
      citadelLv2Decor
    ];
    const lv3Targets = [citadelLv3Crown, citadelLv3Wings];
    const allByTier = [lv1Targets, lv2Targets, lv3Targets];

    const bounceItems = [];
    for (let lv = 1; lv <= 3; lv++) {
      if (lv > fromLevel && lv <= toLevel) {
        const delayBase = 0.08 + (lv - Math.max(1, fromLevel + 1)) * 0.16;
        allByTier[lv - 1].forEach((grp, idx) => {
          if (grp && grp.visible) {
            bounceItems.push({ group: grp, delay: delayBase + idx * 0.05 });
          }
        });
      }
    }

    bounceItems.forEach(({ group, delay }) => {
      for (let i = activeBounceAnims.length - 1; i >= 0; i--) {
        if (activeBounceAnims[i].group === group) {
          activeBounceAnims.splice(i, 1);
        }
      }
      group.scale.setScalar(0.001);
      activeBounceAnims.push({
        group,
        startTime: now + delay,
        duration: 0.92
      });
    });

    citadelState.upgradeBounceTime = now + 0.06;
    citadelUpgradeRing.visible = true;
    citadelUpgradeRing.scale.setScalar(1);
    citadelUpgradeRingMat.opacity = 0.85;

    if (window.AudioManager && typeof window.AudioManager.playLevelUp === "function") {
      window.AudioManager.playLevelUp();
    }
    if (toLevel >= 3 && typeof launchCelebrationConfetti === "function") {
      launchCelebrationConfetti();
    }
  }

  function updateAetherCitadelArchitecture(opts = {}) {
    const isNumArg = typeof opts === "number";
    const animate = isNumArg ? true : (opts.animate !== false);
    const hasOverrideLevel = isNumArg || (opts && typeof opts.level === "number");
    let targetLevel;
    let completedCount;

    if (hasOverrideLevel) {
      const rawLv = isNumArg ? opts : opts.level;
      targetLevel = Math.max(0, Math.min(3, Math.floor(rawLv)));
      citadelState.archOverride = targetLevel;
      completedCount = [0, 2, 4, 6][targetLevel];
    } else if (opts && opts.resetOverride) {
      citadelState.archOverride = null;
      const prog = readCitadelChallengeProgress();
      targetLevel = prog.level;
      completedCount = prog.completedCount;
    } else if (citadelState.archOverride !== null) {
      targetLevel = citadelState.archOverride;
      completedCount = [0, 2, 4, 6][targetLevel];
    } else {
      const prog = readCitadelChallengeProgress();
      targetLevel = prog.level;
      completedCount = prog.completedCount;
    }

    const prevLevel = citadelState.archLevel;
    const leveledUp = prevLevel !== null && targetLevel > prevLevel;

    // 依 Lv.0 ~ Lv.3 動態切換建築群組顯示狀態
    citadelLv0AstrolabeGroup.visible = targetLevel <= 1;
    astroDormantCore.material = targetLevel >= 1 ? citadelCrystalMat : citadelDormantCrystalMat;
    citadelLv1LeftTower.visible = targetLevel >= 1;
    citadelLv1RightArchive.visible = targetLevel >= 1;
    citadelLv1Armillary.visible = targetLevel === 1;

    citadelLv2Temple.visible = targetLevel >= 2;
    citadelSatLeft.root.visible = targetLevel >= 2;
    citadelSatRight.root.visible = targetLevel >= 2;
    citadelLv2BridgeLeft.visible = targetLevel >= 2;
    citadelLv2BridgeRight.visible = targetLevel >= 2;
    citadelLv2Decor.visible = targetLevel >= 2;

    citadelLv3Crown.visible = targetLevel >= 3;
    citadelLv3Wings.visible = targetLevel >= 3;

    // 重置未升級群組縮放，避免殘留縮放
    if (!animate || !leveledUp) {
      [
        citadelLv1LeftTower, citadelLv1RightArchive, citadelLv1Armillary,
        citadelLv2Temple, citadelSatLeft.bounceWrap, citadelSatRight.bounceWrap,
        citadelLv2BridgeLeft, citadelLv2BridgeRight, citadelLv2Decor,
        citadelLv3Crown, citadelLv3Wings
      ].forEach((g) => {
        if (g) g.scale.setScalar(1);
      });
    }

    citadelState.archLevel = targetLevel;
    citadelState.completedCount = completedCount;
    refreshCitadelLabelAndRings();

    if (animate && leveledUp) {
      if (typeof focusOnAetherCitadel === "function") {
        focusOnAetherCitadel();
      }
      triggerCitadelArchitectureBounce(prevLevel, targetLevel);
    }

    return { level: targetLevel, completedCount, leveledUp };
  }
  window.updateAetherCitadelArchitecture = updateAetherCitadelArchitecture;

  function syncCitadelVisualState() {
    const access = (window.AetherCitadel && typeof window.AetherCitadel.checkAccess === "function")
      ? window.AetherCitadel.checkAccess()
      : (() => {
          const metCount = islandRecords.filter((r) => (r.progressPct || 0) >= 80).length;
          const allSevenAt80 = islandRecords.length >= 7 && metCount === islandRecords.length;
          const teacherTempOpen = !!(window.CloudConfig && typeof window.CloudConfig.isCitadelTempUnlocked === "function" && window.CloudConfig.isCitadelTempUnlocked());
          return { unlocked: allSevenAt80 || teacherTempOpen, allSevenAt80, teacherTempOpen, metCount, totalCount: islandRecords.length || 7 };
        })();

    const prevUnlocked = citadelState.unlocked;
    citadelState.unlocked = Boolean(access.unlocked);
    citadelState.allSevenAt80 = Boolean(access.allSevenAt80);
    citadelState.teacherTempOpen = Boolean(access.teacherTempOpen);
    citadelState.metCount = Number(access.metCount) || 0;

    citadelBarrierGroup.visible = !citadelState.unlocked;
    citadelAscensionGroup.visible = citadelState.unlocked;
    citadelPortalMesh.visible = citadelState.unlocked;

    if (citadelState.unlocked) {
      citadelArchMat.color.setHex(0xffd166);
      citadelArchMat.emissive.setHex(0xf59e0b);
      citadelArchMat.emissiveIntensity = 0.78;
      guardLeftArmPivot.rotation.set(0.08, 0.05, 0.34);
      guardRightArmPivot.rotation.set(-0.62, 0, -0.22);
      guardVisorMat.color.setHex(0xffe066);
      guardVisorMat.emissive.setHex(0xf59e0b);
      if (isCitadelCursorSystemReady && !prevUnlocked && typeof setPlayerCursorTarget === "function") {
        setPlayerCursorTarget("aetherCitadel", { persist: false });
      }
    } else {
      citadelArchMat.color.setHex(0xcbd5e1);
      citadelArchMat.emissive.setHex(0x1e293b);
      citadelArchMat.emissiveIntensity = 0.1;
      guardLeftArmPivot.rotation.set(-0.55, 0.72, -0.25);
      guardRightArmPivot.rotation.set(-0.22, 0, -0.15);
      guardVisorMat.color.setHex(0x67e8f9);
      guardVisorMat.emissive.setHex(0x06b6d4);
      if (isCitadelCursorSystemReady && prevUnlocked && playerCursorState.targetId === "aetherCitadel" && typeof syncPlayerCursorFromStorageOrSmart === "function") {
        syncPlayerCursorFromStorageOrSmart(currentGradeFilter, { snap: false });
      }
    }

    if (citadelState.archLevel === null) {
      updateAetherCitadelArchitecture({ animate: false });
    } else {
      refreshCitadelLabelAndRings();
    }
  }

  /* ============================================================
   * 8. 世界擴建（聖殿主殿強化 + 七島微型地標 + NPC 小副島）
   *    - 所有新增物件加入 scene / mysteryReefGroup，不加入 islandsGroup，故不影響島嶼點擊判定
   *    - 材質以 MeshLambertMaterial 快取共用；大量重複物件使用 InstancedMesh
   * ============================================================ */
  const expansionAnims = [];
  expansionAnims.push((t) => { for (let i = 0; i < stageAnims.length; i++) stageAnims[i](t); }); // 三階段建築動畫
  const lambertCache = new Map();
  function LM(hex, emissiveHex) {
    const key = hex + "_" + (emissiveHex === undefined ? "n" : emissiveHex);
    let m = lambertCache.get(key);
    if (!m) {
      m = new THREE.MeshLambertMaterial({ color: hex });
      if (emissiveHex !== undefined) m.emissive = new THREE.Color(emissiveHex);
      lambertCache.set(key, m);
    }
    return m;
  }

  function mk(geo, mat, x, y, z, parent, shadow) {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x || 0, y || 0, z || 0);
    if (shadow) m.castShadow = true;
    if (parent) parent.add(m);
    return m;
  }

  const binTexCache = {};
  function binTexMat(ch, fg, bg) {
    const key = ch + fg + bg;
    if (!binTexCache[key]) {
      const c = document.createElement("canvas");
      c.width = 64;
      c.height = 64;
      const cx = c.getContext("2d");
      cx.fillStyle = bg;
      cx.fillRect(0, 0, 64, 64);
      cx.strokeStyle = fg;
      cx.lineWidth = 4;
      cx.strokeRect(3, 3, 58, 58);
      cx.fillStyle = fg;
      cx.font = "bold 44px monospace";
      cx.textAlign = "center";
      cx.textBaseline = "middle";
      cx.fillText(ch, 32, 35);
      binTexCache[key] = new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(c) });
    }
    return binTexCache[key];
  }

  /* ---------- 8a. 中央資訊聖殿主殿大升級：星芒地磚、榮耀聖盃、七島微縮聖壇、神殿聚落與終極榮耀特效 ---------- */
  // Tier 3 頂層榮耀廣場中心地面裝飾 (y = 15.06，精準貼合 daisStep 表面 GROUND_TOP_Y.SANCT_TIER3)
  const sanctDaisFloorDeco = new THREE.Group();
  sanctDaisFloorDeco.position.y = GROUND_TOP_Y.SANCT_TIER3 + 0.02;
  sanctuarySubgroup.add(sanctDaisFloorDeco);

  const sanctStarOctagon = new THREE.Mesh(
    new THREE.CylinderGeometry(6.5, 6.5, 0.04, 16),
    sanctExtraMat.starTileDark
  );
  sanctStarOctagon.receiveShadow = true;
  sanctDaisFloorDeco.add(sanctStarOctagon);

  for (let s = 0; s < 8; s++) {
    const sa = (s / 8) * Math.PI * 2;
    const starRay = new THREE.Mesh(
      new THREE.BoxGeometry(0.3, 0.05, 5.4),
      sanctExtraMat.starTileGold
    );
    starRay.position.set(Math.cos(sa) * 3.4, 0.01, Math.sin(sa) * 3.4);
    starRay.rotation.y = -sa + Math.PI / 2;
    sanctDaisFloorDeco.add(starRay);
  }
  const starRimRing = new THREE.Mesh(
    new THREE.TorusGeometry(6.35, 0.075, 6, 32),
    sanctExtraMat.starTileGold
  );
  starRimRing.rotation.x = Math.PI / 2;
  starRimRing.position.y = 0.03;
  sanctDaisFloorDeco.add(starRimRing);

  const sanctDaisFloorGlow = makeGroundGlowPlane(13.0, 13.0, 0xffd15c, 0.05);
  sanctDaisFloorDeco.add(sanctDaisFloorGlow.mesh);
  nightGlowUpdaters.push((nb, t) => {
    const show = nb > 0.01 && sanctuarySubgroup.visible;
    sanctDaisFloorGlow.mesh.visible = show;
    if (show) sanctDaisFloorGlow.mat.opacity = (0.48 + 0.1 * Math.sin(t * 2.4)) * nb;
  });

  // 中央「榮耀聖盃」祭壇 (y = 15.04 起往上疊加，上方懸浮 infoOrbGroup 光核)
  const gloryChaliceGroup = new THREE.Group();
  gloryChaliceGroup.position.set(0, GROUND_TOP_Y.SANCT_TIER3, 0);
  sanctuarySubgroup.add(gloryChaliceGroup);

  mk(new THREE.CylinderGeometry(1.38, 1.56, 0.42, 12), sanctExtraMat.altarMarble, 0, 0.21, 0, gloryChaliceGroup, true);
  mk(new THREE.CylinderGeometry(1.05, 1.24, 0.52, 12), sanctExtraMat.starTileGold, 0, 0.68, 0, gloryChaliceGroup, true);
  mk(new THREE.CylinderGeometry(0.32, 0.48, 0.65, 12), sanctExtraMat.chaliceGold, 0, 1.26, 0, gloryChaliceGroup, true);
  mk(new THREE.CylinderGeometry(1.02, 0.36, 0.88, 16), sanctExtraMat.chaliceGold, 0, 1.98, 0, gloryChaliceGroup, true);
  const chaliceRim = mk(new THREE.TorusGeometry(1.02, 0.09, 8, 24), sanctExtraMat.chaliceGold, 0, 2.42, 0, gloryChaliceGroup);
  chaliceRim.rotation.x = Math.PI / 2;
  const chaliceFlame = mk(new THREE.OctahedronGeometry(0.46, 1), sanctExtraMat.chaliceCore, 0, 2.66, 0, gloryChaliceGroup);

  const infoOrbGroup = new THREE.Group();
  infoOrbGroup.position.y = GROUND_TOP_Y.SANCT_TIER3 + 3.55;
  sanctuarySubgroup.add(infoOrbGroup);
  const infoOrb = new THREE.Mesh(
    new THREE.IcosahedronGeometry(0.74, 1),
    sanctCyanMat
  );
  infoOrbGroup.add(infoOrb);
  const infoOrbHalo = new THREE.Mesh(
    new THREE.SphereGeometry(1.18, 12, 10),
    new THREE.MeshBasicMaterial({
      color: 0x5de0ff,
      transparent: true,
      opacity: 0.28,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    })
  );
  infoOrbGroup.add(infoOrbHalo);
  const infoOrbRing1 = mk(new THREE.TorusGeometry(1.42, 0.05, 6, 28), sanctCyanMat, 0, 0, 0, infoOrbGroup);
  const infoOrbRing2 = mk(new THREE.TorusGeometry(1.72, 0.04, 6, 28), sanctGoldMat, 0, 0, 0, infoOrbGroup);

  // Tier 2 外環對稱暖光聖火盆與低矮花圃石牆 (y = 11.40，r = 14.7，前低後高不遮擋)
  const sanctBraziers = [];
  for (let b = 0; b < 6; b++) {
    const ba = (b / 6) * Math.PI * 2 + Math.PI / 6;
    const bx = Math.cos(ba) * 14.75;
    const bz = Math.sin(ba) * 14.75;
    const brazier = new THREE.Group();
    brazier.position.set(bx, GROUND_TOP_Y.SANCT_TIER2, bz);
    mk(new THREE.CylinderGeometry(0.32, 0.44, 0.45, 8), sanctExtraMat.altarMarble, 0, 0.225, 0, brazier, true);
    mk(new THREE.CylinderGeometry(0.44, 0.24, 0.24, 8), sanctExtraMat.brazierBronze, 0, 0.56, 0, brazier);
    const bFlame = mk(new THREE.OctahedronGeometry(0.2, 0), isletMat.campfireOuter, 0, 0.78, 0, brazier);
    bFlame.scale.set(0.85, 1.35, 0.85);
    const bGroundGlow = makeGroundGlowPlane(3.4, 3.4, 0xffa838, 0.04);
    brazier.add(bGroundGlow.mesh);
    nightGlowUpdaters.push((nb, t) => {
      const show = nb > 0.01 && sanctuarySubgroup.visible;
      bGroundGlow.mesh.visible = show;
      if (show) bGroundGlow.mat.opacity = (0.45 + 0.08 * Math.sin(t * 7.2 + b)) * nb;
    });
    sanctuarySubgroup.add(brazier);
    sanctBraziers.push({ flame: bFlame, phase: b * 1.1 });

    // 鄰近低矮花圃矮牆（與火盆錯開角度）
    const wa = ba + Math.PI / 6;
    const wx = Math.cos(wa) * 14.75;
    const wz = Math.sin(wa) * 14.75;
    const wallGroup = new THREE.Group();
    wallGroup.position.set(wx, GROUND_TOP_Y.SANCT_TIER2, wz);
    wallGroup.rotation.y = -wa + Math.PI / 2;
    mk(new THREE.BoxGeometry(1.45, 0.28, 0.48), sanctExtraMat.altarMarble, 0, 0.14, 0, wallGroup, true);
    mk(new THREE.BoxGeometry(1.32, 0.1, 0.36), flowerBushGreenMat, 0, 0.3, 0, wallGroup);
    [-0.42, 0, 0.42].forEach((fx, fi) => {
      const fMat = [isletMat.tulipRed, isletMat.tulipYellow, isletMat.tulipPurple][(b + fi) % 3];
      mk(new THREE.IcosahedronGeometry(0.11, 0), fMat, fx, 0.4, 0, wallGroup);
    });
    sanctuarySubgroup.add(wallGroup);
  }

  // Tier 1 正前方迎賓寬石階（位於 +Z 正前方不擋後景）
  for (let st = 0; st < 3; st++) {
    const stepW = 4.2 - st * 0.45;
    const stepD = 1.65 - st * 0.45;
    mk(
      new THREE.BoxGeometry(stepW, 0.28, stepD),
      sanctExtraMat.altarMarble,
      0,
      GROUND_TOP_Y.SANCT_TIER1 + st * 0.24,
      19.2 - st * 0.55,
      sanctuarySubgroup,
      true
    );
  }

  // 環繞神殿懸浮符文光點 (前側較低、後側較高)
  const sanctRuneMotes = [];
  for (let rm = 0; rm < 12; rm++) {
    const rMesh = new THREE.Mesh(new THREE.OctahedronGeometry(0.18, 0), sanctExtraMat.runeMote);
    sanctuarySubgroup.add(rMesh);
    sanctRuneMotes.push({
      mesh: rMesh,
      radius: rm < 6 ? 16.4 : 11.4,
      baseY: rm < 6 ? 12.2 : 17.8,
      speed: rm < 6 ? 0.32 : -0.45,
      phase: (rm / 6) * Math.PI * 2
    });
  }

  // 象徵七大島嶼的「7 座精緻微型聖壇/圖騰」（對稱環繞於 Tier 3 外環 r = 9.35, y = 15.04）
  const sanctuaryShrines = [];
  const finaleEffectsGroup = new THREE.Group();
  finaleEffectsGroup.name = "finaleEffectsGroup";
  finaleEffectsGroup.visible = false;
  sanctuarySubgroup.add(finaleEffectsGroup);

  const shrineRingR = 9.35;
  const shrineChaliceTarget = new THREE.Vector3(0, GROUND_TOP_Y.SANCT_TIER3 + 2.66, 0);
  const upAxisVec = new THREE.Vector3(0, 1, 0);

  function buildMicroIslandShrineTotem(id) {
    const tg = new THREE.Group();
    if (id === "sys") {
      // 微型發光電腦主機
      mk(new THREE.BoxGeometry(0.66, 0.78, 0.46), LM(0x1e293b), 0, 0.39, 0, tg, true);
      mk(new THREE.BoxGeometry(0.54, 0.64, 0.06), sanctCyanMat, 0, 0.42, 0.23, tg);
      mk(new THREE.CylinderGeometry(0.14, 0.14, 0.06, 8), LM(0xff9f1c), 0, 0.56, 0.26, tg).rotation.x = Math.PI / 2;
    } else if (id === "citizen") {
      // 資安藍光聖盾
      const rim = mk(new THREE.CylinderGeometry(0.42, 0.28, 0.12, 6), sanctExtraMat.starTileGold, 0, 0.46, 0, tg, true);
      rim.rotation.x = Math.PI / 2;
      const shield = mk(new THREE.CylinderGeometry(0.35, 0.22, 0.15, 6), sanctCyanMat, 0, 0.46, 0.02, tg);
      shield.rotation.x = Math.PI / 2;
      mk(new THREE.BoxGeometry(0.18, 0.22, 0.18), sanctExtraMat.starTileGold, 0, 0.42, 0.04, tg);
    } else if (id === "create") {
      // 彩色創客畫架
      mk(new THREE.BoxGeometry(0.08, 0.85, 0.08), LM(0xa8714a), -0.22, 0.42, 0, tg).rotation.z = -0.15;
      mk(new THREE.BoxGeometry(0.08, 0.85, 0.08), LM(0xa8714a), 0.22, 0.42, 0, tg).rotation.z = 0.15;
      const board = mk(new THREE.BoxGeometry(0.62, 0.52, 0.06), npcExtraMat.bunnyWhite, 0, 0.52, 0.05, tg, true);
      board.rotation.x = -0.2;
      [0xff4d6d, 0xffd166, 0x4cc9f0].forEach((hex, si) => {
        const stripe = mk(new THREE.BoxGeometry(0.46, 0.09, 0.07), LM(hex, hex), 0, 0.64 - si * 0.13, 0.06, tg);
        stripe.rotation.x = -0.2;
      });
    } else if (id === "code") {
      // 展開的程式筆電
      mk(new THREE.BoxGeometry(0.68, 0.08, 0.48), LM(0xcbd5e1), 0, 0.06, 0.08, tg, true);
      const scr = mk(new THREE.BoxGeometry(0.66, 0.48, 0.06), LM(0x1e293b), 0, 0.34, -0.12, tg, true);
      scr.rotation.x = -0.28;
      const glow = mk(new THREE.BoxGeometry(0.56, 0.38, 0.02), LM(0x34d399, 0x10b981), 0, 0.34, -0.09, tg);
      glow.rotation.x = -0.28;
    } else if (id === "algo") {
      // 演算法黃金階梯
      [0, 1, 2].forEach((step) => {
        mk(
          new THREE.BoxGeometry(0.62 - step * 0.14, 0.18, 0.54 - step * 0.12),
          sanctExtraMat.chaliceGold,
          0,
          0.09 + step * 0.18,
          0,
          tg,
          true
        );
      });
      mk(new THREE.OctahedronGeometry(0.18, 0), sanctCyanMat, 0, 0.78, 0, tg);
    } else if (id === "data") {
      // 資料水晶柱
      [
        { x: 0, h: 0.88, z: 0, s: 0.17 },
        { x: -0.22, h: 0.56, z: 0.12, s: 0.12 },
        { x: 0.22, h: 0.62, z: -0.1, s: 0.13 }
      ].forEach((c) => {
        mk(new THREE.ConeGeometry(c.s, c.h, 6), LM(0x2ec4b6, 0x0ea5e9), c.x, c.h * 0.5, c.z, tg, true);
      });
    } else {
      // ai: AI 懸浮光環
      mk(new THREE.CylinderGeometry(0.28, 0.36, 0.16, 10), LM(0x334155), 0, 0.08, 0, tg);
      const r1 = mk(new THREE.TorusGeometry(0.32, 0.055, 6, 20), LM(0xff6fb5, 0xec4899), 0, 0.54, 0, tg);
      r1.rotation.x = Math.PI / 3;
      const r2 = mk(new THREE.TorusGeometry(0.24, 0.045, 6, 18), sanctCyanMat, 0, 0.54, 0, tg);
      r2.rotation.y = Math.PI / 3;
      mk(new THREE.SphereGeometry(0.14, 8, 8), sanctExtraMat.chaliceCore, 0, 0.54, 0, tg);
    }
    return tg;
  }

  islandRecords.forEach((isl, idx) => {
    const sa = (idx / islandRecords.length) * Math.PI * 2 - Math.PI / 2;
    const sx = Math.cos(sa) * shrineRingR;
    const sz = Math.sin(sa) * shrineRingR;
    const shrineGroup = new THREE.Group();
    shrineGroup.position.set(sx, GROUND_TOP_Y.SANCT_TIER3, sz);
    shrineGroup.rotation.y = -sa + Math.PI / 2;
    sanctuarySubgroup.add(shrineGroup);

    // 聖壇雙層白玉金邊基座 (height = 0.66)
    mk(new THREE.CylinderGeometry(0.56, 0.66, 0.58, 8), sanctExtraMat.altarMarble, 0, 0.29, 0, shrineGroup, true);
    mk(new THREE.CylinderGeometry(0.62, 0.62, 0.08, 8), sanctExtraMat.starTileGold, 0, 0.62, 0, shrineGroup);

    const totem = buildMicroIslandShrineTotem(isl.id);
    totem.position.y = 0.66;
    shrineGroup.add(totem);

    const shrineGroundGlow = makeGroundGlowPlane(2.4, 2.4, isl.color || 0xffd166, 0.04);
    shrineGroup.add(shrineGroundGlow.mesh);
    nightGlowUpdaters.push((nb) => {
      const show = nb > 0.01 && sanctuarySubgroup.visible;
      shrineGroundGlow.mesh.visible = show;
      if (show) shrineGroundGlow.mat.opacity = 0.42 * nb;
    });

    // 【終極特效 2】7 座微縮聖壇升起金色光柱 + 能量光束匯聚至中央聖盃
    const pillarBeam = new THREE.Mesh(
      new THREE.CylinderGeometry(0.32, 0.62, 11.5, 10, 1, true),
      sanctExtraMat.finalePillarBeam
    );
    pillarBeam.position.set(sx, GROUND_TOP_Y.SANCT_TIER3 + 6.45, sz);
    finaleEffectsGroup.add(pillarBeam);

    const startPt = new THREE.Vector3(sx, GROUND_TOP_Y.SANCT_TIER3 + 1.15, sz);
    const beamVec = new THREE.Vector3().subVectors(shrineChaliceTarget, startPt);
    const beamLen = beamVec.length();
    const energyRay = new THREE.Mesh(
      new THREE.CylinderGeometry(0.08, 0.14, beamLen, 8, 1, true),
      sanctExtraMat.finaleRayMat
    );
    energyRay.position.copy(startPt).addScaledVector(beamVec, 0.5);
    energyRay.quaternion.setFromUnitVectors(upAxisVec, beamVec.clone().normalize());
    finaleEffectsGroup.add(energyRay);

    sanctuaryShrines.push({ id: isl.id, totem, pillarBeam, energyRay, phase: idx * 0.9 });
  });

  // 【終極特效 1】神殿上方巨型雙層旋轉金色星環與七彩榮耀光冠 (y = 37.8，不與 y=35 光核穿模)
  const finaleCrownGroup = new THREE.Group();
  finaleCrownGroup.position.set(0, 37.8, 0);
  finaleEffectsGroup.add(finaleCrownGroup);

  const finaleOuterStarRing = new THREE.Group();
  finaleCrownGroup.add(finaleOuterStarRing);
  const outerHalo = new THREE.Mesh(new THREE.TorusGeometry(7.4, 0.18, 8, 42), sanctExtraMat.finaleGoldStar);
  outerHalo.rotation.x = Math.PI / 2;
  finaleOuterStarRing.add(outerHalo);
  for (let s = 0; s < 8; s++) {
    const a = (s / 8) * Math.PI * 2;
    const star = new THREE.Mesh(new THREE.OctahedronGeometry(0.52, 0), sanctExtraMat.finaleGoldStar);
    star.position.set(Math.cos(a) * 7.4, 0, Math.sin(a) * 7.4);
    finaleOuterStarRing.add(star);
  }

  const finaleInnerStarRing = new THREE.Group();
  finaleInnerStarRing.rotation.x = 0.22;
  finaleCrownGroup.add(finaleInnerStarRing);
  const innerHalo = new THREE.Mesh(new THREE.TorusGeometry(5.9, 0.14, 8, 36), sanctExtraMat.finaleGoldStar);
  innerHalo.rotation.x = Math.PI / 2;
  finaleInnerStarRing.add(innerHalo);
  for (let s = 0; s < 6; s++) {
    const a = (s / 6) * Math.PI * 2;
    const gem = new THREE.Mesh(new THREE.OctahedronGeometry(0.4, 0), sanctExtraMat.chaliceCore);
    gem.position.set(Math.cos(a) * 5.9, 0, Math.sin(a) * 5.9);
    finaleInnerStarRing.add(gem);
  }

  const finaleRainbowCrown = new THREE.Group();
  finaleRainbowCrown.position.y = 0.9;
  finaleCrownGroup.add(finaleRainbowCrown);
  sanctExtraMat.finaleCrownRainbow.forEach((rbMat, ri) => {
    const a = (ri / sanctExtraMat.finaleCrownRainbow.length) * Math.PI * 2;
    const arcGeo = new THREE.TorusGeometry(4.5, 0.2, 8, 12, Math.PI * 0.23);
    const arc = new THREE.Mesh(arcGeo, rbMat);
    arc.rotation.x = Math.PI / 2;
    arc.rotation.z = a;
    finaleRainbowCrown.add(arc);
    const crownJewel = new THREE.Mesh(new THREE.ConeGeometry(0.32, 0.85, 5), rbMat);
    crownJewel.position.set(Math.cos(a + 0.35) * 4.5, 0.45, Math.sin(a + 0.35) * 4.5);
    finaleRainbowCrown.add(crownJewel);
  });

  // 【任務 4】中央神殿 8 位可愛領航員 NPC 與神殿守護小動物（腳底精準對齊各層地板 Y）
  const sanctuaryNpcSpecs = [
    { species: "chibi", shirtMat: npcExtraMat.shirtBlue, hatMat: npcExtraMat.hatNavy, r: 3.55, a: -2.35, y: GROUND_TOP_Y.SANCT_TIER3 },
    { species: "chibi", shirtMat: npcExtraMat.shirtGold, hatMat: npcExtraMat.hatRed, r: 3.55, a: -0.78, y: GROUND_TOP_Y.SANCT_TIER3 },
    { species: "chibi", shirtMat: npcExtraMat.shirtPurple, hatMat: npcExtraMat.hatStraw, r: 8.35, a: 0.46, y: GROUND_TOP_Y.SANCT_TIER3 },
    { species: "chibi", shirtMat: npcExtraMat.shirtTeal, hatMat: npcExtraMat.hatNavy, r: 8.35, a: 2.68, y: GROUND_TOP_Y.SANCT_TIER3 },
    { species: "penguin", r: 4.1, a: 0.82, y: GROUND_TOP_Y.SANCT_TIER3 },
    { species: "bunny", furMat: npcExtraMat.bunnyWhite, r: 14.55, a: 1.98, y: GROUND_TOP_Y.SANCT_TIER2 },
    { species: "cat", furMat: npcExtraMat.catOrange, r: 14.55, a: 1.12, y: GROUND_TOP_Y.SANCT_TIER2 },
    { species: "bear", furMat: npcExtraMat.bearBrown, r: 18.9, a: 1.82, y: GROUND_TOP_Y.SANCT_TIER1 }
  ];
  sanctuaryNpcSpecs.forEach((sp, si) => {
    const snpc = createCuteIslandBuddy(sp.species, { ...sp, scale: 1.15 });
    const sx = Math.cos(sp.a) * sp.r;
    const sz = Math.sin(sp.a) * sp.r;
    snpc.root.position.set(sx, sp.y, sz);
    snpc.root.rotation.y = Math.atan2(-sx, -sz);
    sanctuarySubgroup.add(snpc.root);
    sanctuaryNPCs.push({
      ...snpc,
      baseX: sx,
      baseY: sp.y,
      baseZ: sz,
      baseYaw: snpc.root.rotation.y,
      phase: si * 0.95
    });
  });

  expansionAnims.push((t) => {
    if (!sanctuarySubgroup.visible) return;
    infoOrbGroup.position.y = GROUND_TOP_Y.SANCT_TIER3 + 3.55 + Math.sin(t * 1.9) * 0.24;
    chaliceFlame.rotation.y = -t * 1.4;
    chaliceFlame.scale.setScalar(1 + Math.sin(t * 3.5) * 0.08);
    infoOrb.rotation.y = t * 1.3;
    infoOrb.rotation.x = t * 0.8;
    const pulse = 1 + Math.sin(t * 3.1) * 0.08;
    infoOrbHalo.scale.setScalar(pulse);
    infoOrbRing1.rotation.set(t * 1.1, t * 0.7, 0);
    infoOrbRing2.rotation.set(Math.PI / 3, t * -0.9, t * 0.5);

    sanctBraziers.forEach((bz) => {
      bz.flame.scale.set(0.85, 1.35 + Math.sin(t * 9 + bz.phase) * 0.18, 0.85);
    });
    sanctRuneMotes.forEach((rm) => {
      const a = rm.phase + t * rm.speed;
      rm.mesh.position.set(Math.cos(a) * rm.radius, rm.baseY + Math.sin(t * 2.2 + rm.phase) * 0.35, Math.sin(a) * rm.radius);
      rm.mesh.rotation.y = t * 1.6;
    });

    if (finaleEffectsGroup.visible) {
      finaleOuterStarRing.rotation.y = t * 0.55;
      finaleInnerStarRing.rotation.y = -t * 0.82;
      finaleRainbowCrown.rotation.y = t * 0.38;
      finaleRainbowCrown.position.y = 0.9 + Math.sin(t * 2.1) * 0.22;
      sanctuaryShrines.forEach((sh) => {
        sh.totem.rotation.y = Math.sin(t * 0.9 + sh.phase) * 0.16;
        const beamPulse = 0.88 + Math.sin(t * 3.0 + sh.phase) * 0.14;
        sh.pillarBeam.scale.set(beamPulse, 1, beamPulse);
        const rayPulse = 0.85 + Math.sin(t * 4.2 + sh.phase) * 0.2;
        sh.energyRay.scale.set(rayPulse, 1, rayPulse);
      });
    }
  });

  /* ---------- 8b. 環殿七島微型地標（7 座對稱浮空平台，半徑 14.5 繞於神殿環湖淺灘） ---------- */
  const landmarkRingR = 24.0;
  const landmarkRoot = new THREE.Group();
  landmarkRoot.name = "reefLandmarks";
  mysteryReefGroup.add(landmarkRoot);

  const lmPlatGeo = new THREE.CylinderGeometry(1.45, 1.3, 0.32, 10);
  const lmUnderGeo = new THREE.ConeGeometry(1.25, 1.4, 8);
  lmUnderGeo.rotateX(Math.PI);
  const lmRingGeo = new THREE.TorusGeometry(1.42, 0.05, 5, 20);
  lmRingGeo.rotateX(Math.PI / 2);
  const lmStone = LM(0xd5dbe5);
  const lmStoneDark = LM(0x7d8aa0);
  const lmWhiteEdgeMat = (hex) => new THREE.LineBasicMaterial({ color: hex });

  function buildLandmarkSys() {
    const g = new THREE.Group();
    mk(new THREE.BoxGeometry(1.1, 0.3, 0.8), LM(0xe8dcc0), 0, 0.15, 0.1, g, true);
    mk(new THREE.BoxGeometry(0.85, 0.7, 0.62), LM(0xe8dcc0), 0, 0.65, 0, g, true);
    mk(new THREE.BoxGeometry(0.66, 0.5, 0.05), new THREE.MeshBasicMaterial({ color: 0x7ff0ff }), 0, 0.68, 0.33, g);
    mk(new THREE.BoxGeometry(0.9, 0.06, 0.28), LM(0x8a94a6), 0, 0.33, 0.47, g);
    const blocks = [0x4fb3ff, 0x7ff0ff, 0xffffff].map((c, i) => {
      const m = mk(new THREE.BoxGeometry(0.22, 0.22, 0.22), LM(c, c), 0, 1.0, 0, g);
      m.userData.phase = (i / 3) * Math.PI * 2;
      return m;
    });
    return {
      group: g,
      update(t) {
        blocks.forEach((b) => {
          const a = t * 1.2 + b.userData.phase;
          b.position.set(Math.cos(a) * 0.85, 1.05 + Math.sin(t * 2 + b.userData.phase) * 0.15, Math.sin(a) * 0.55);
          b.rotation.set(t, t * 1.3, 0);
        });
      }
    };
  }

  function buildLandmarkCitizen() {
    const g = new THREE.Group();
    mk(new THREE.CylinderGeometry(0.34, 0.5, 0.3, 8), lmStoneDark, 0, 0.15, 0, g, true);
    const sh = new THREE.Shape();
    sh.moveTo(0, 0.55);
    sh.lineTo(0.42, 0.4);
    sh.lineTo(0.42, -0.05);
    sh.quadraticCurveTo(0.35, -0.4, 0, -0.6);
    sh.quadraticCurveTo(-0.35, -0.4, -0.42, -0.05);
    sh.lineTo(-0.42, 0.4);
    sh.lineTo(0, 0.55);
    const shGeo = new THREE.ExtrudeGeometry(sh, { depth: 0.14, bevelEnabled: false, curveSegments: 4 });
    shGeo.translate(0, 0, -0.07);
    const shieldGroup = new THREE.Group();
    shieldGroup.position.y = 1.1;
    g.add(shieldGroup);
    mk(shGeo, LM(0x2d9cff, 0x0b4a8f), 0, 0, 0, shieldGroup, true);
    const inner = mk(shGeo, LM(0xa9e2ff, 0x3b8fc7), 0, 0, 0.03, shieldGroup);
    inner.scale.set(0.72, 0.72, 1);
    const keyGroup = new THREE.Group();
    keyGroup.position.set(0, 0.06, 0.12);
    shieldGroup.add(keyGroup);
    const goldM = LM(0xffd166, 0x8a5a00);
    mk(new THREE.TorusGeometry(0.11, 0.04, 5, 10), goldM, 0, 0.14, 0, keyGroup);
    mk(new THREE.BoxGeometry(0.06, 0.34, 0.05), goldM, 0, -0.1, 0, keyGroup);
    mk(new THREE.BoxGeometry(0.14, 0.05, 0.05), goldM, 0.07, -0.2, 0, keyGroup);
    mk(new THREE.BoxGeometry(0.1, 0.05, 0.05), goldM, 0.05, -0.1, 0, keyGroup);
    const halo = mk(new THREE.TorusGeometry(0.78, 0.03, 5, 24), new THREE.MeshBasicMaterial({ color: 0x7fd0ff }), 0, 1.1, 0, g);
    return {
      group: g,
      update(t) {
        shieldGroup.rotation.y = Math.sin(t * 1.2) * 0.5;
        shieldGroup.position.y = 1.1 + Math.sin(t * 2.0) * 0.08;
        halo.rotation.set(Math.PI / 2, 0, t * 0.8);
        halo.position.y = shieldGroup.position.y;
      }
    };
  }

  function buildLandmarkCreate() {
    const g = new THREE.Group();
    const puz = new THREE.Group();
    puz.position.y = 0.95;
    g.add(puz);
    const cols = [0xff6b6b, 0xffd166, 0x5fd18b, 0x4fb3ff];
    const blockGeo = new THREE.BoxGeometry(0.42, 0.42, 0.42);
    const knobGeo = new THREE.SphereGeometry(0.1, 6, 5);
    cols.forEach((c, i) => {
      const a = (i / 4) * Math.PI * 2;
      const holder = new THREE.Group();
      holder.position.set(Math.cos(a) * 0.5, Math.sin(a * 2) * 0.12, Math.sin(a) * 0.5);
      holder.rotation.y = -a;
      mk(blockGeo, LM(c, c), 0, 0, 0, holder, true);
      mk(knobGeo, LM(c, c), 0.26, 0, 0, holder);
      puz.add(holder);
    });
    const brush = new THREE.Group();
    brush.position.set(0.78, 0.75, 0.15);
    brush.rotation.z = -0.45;
    g.add(brush);
    mk(new THREE.CylinderGeometry(0.04, 0.055, 1.0, 6), LM(0x9c6b3f), 0, 0.2, 0, brush);
    mk(new THREE.CylinderGeometry(0.07, 0.07, 0.16, 6), LM(0xcfd6e0), 0, -0.34, 0, brush);
    mk(new THREE.ConeGeometry(0.09, 0.3, 6), LM(0xc58bff, 0x6a2fb8), 0, -0.55, 0, brush).rotation.x = Math.PI;
    mk(new THREE.CylinderGeometry(0.3, 0.38, 0.3, 8), lmStoneDark, -0.7, 0.15, -0.1, g, true);
    return {
      group: g,
      update(t) {
        puz.rotation.y = t * 1.1;
        puz.position.y = 0.95 + Math.sin(t * 1.8) * 0.1;
        brush.rotation.z = -0.45 + Math.sin(t * 2.4) * 0.12;
      }
    };
  }

  function buildLandmarkCode() {
    const g = new THREE.Group();
    mk(new THREE.BoxGeometry(0.22, 0.7, 0.22), LM(0x1d5f5a), 0, 0.5, 0, g, true);
    const neon = LM(0x3ddc84, 0x17803f);
    const sizes = [0.95, 0.68, 0.42];
    const ys = [0.98, 1.5, 1.9];
    sizes.forEach((s, i) => {
      const geo = new THREE.BoxGeometry(s, s * 0.72, s);
      const c = mk(geo, neon, 0, ys[i], 0, g, true);
      c.rotation.y = i * Math.PI / 4;
      const edges = new THREE.LineSegments(new THREE.EdgesGeometry(geo), lmWhiteEdgeMat(0xc9ffd9));
      edges.rotation.y = c.rotation.y;
      edges.position.y = ys[i];
      g.add(edges);
    });
    const zero = mk(new THREE.BoxGeometry(0.26, 0.26, 0.26), binTexMat("0", "#7dffb0", "#0b3b2a"), 0, 1.2, 0, g);
    const one = mk(new THREE.BoxGeometry(0.26, 0.26, 0.26), binTexMat("1", "#7dffb0", "#0b3b2a"), 0, 1.2, 0, g);
    return {
      group: g,
      update(t) {
        zero.position.set(Math.cos(t * 1.4) * 0.95, 1.3 + Math.sin(t * 2.1) * 0.12, Math.sin(t * 1.4) * 0.95);
        one.position.set(Math.cos(t * 1.4 + Math.PI) * 0.95, 1.3 + Math.cos(t * 2.1) * 0.12, Math.sin(t * 1.4 + Math.PI) * 0.95);
        zero.rotation.y = t * 2;
        one.rotation.y = -t * 2;
      }
    };
  }

  function buildLandmarkAlgo() {
    const g = new THREE.Group();
    const gold = LM(0xffd166, 0x7a5200);
    [
      [1.5, 0.15],
      [1.05, 0.45],
      [0.6, 0.75]
    ].forEach(([s, y], i) => {
      mk(new THREE.BoxGeometry(s, 0.3, s), i === 1 ? LM(0xffe29a, 0x6a4a00) : gold, 0, y, 0, g, true);
    });
    const orange = LM(0xff8a3d, 0xa33d00);
    mk(new THREE.CylinderGeometry(0.04, 0.04, 0.5, 5), orange, 0, 1.15, 0, g);
    const heads = [];
    [-1, 1].forEach((s) => {
      const arm = new THREE.Group();
      arm.position.set(0, 1.42, 0);
      arm.rotation.z = -s * 0.75;
      g.add(arm);
      mk(new THREE.CylinderGeometry(0.035, 0.035, 0.55, 5), orange, 0, 0.27, 0, arm);
      const head = mk(new THREE.ConeGeometry(0.1, 0.24, 6), orange, 0, 0.65, 0, arm);
      heads.push(head);
    });
    mk(new THREE.ConeGeometry(0.1, 0.24, 6), orange, 0, 1.52, 0, g);
    return {
      group: g,
      update(t) {
        heads.forEach((h, i) => h.scale.setScalar(1 + Math.sin(t * 3.2 + i * 1.6) * 0.18));
        g.rotation.y = Math.sin(t * 0.6) * 0.25;
      }
    };
  }

  function buildLandmarkData() {
    const g = new THREE.Group();
    mk(new THREE.BoxGeometry(1.9, 0.1, 0.6), lmStoneDark, 0, 0.05, 0, g, true);
    const crys = LM(0x2ec4b6, 0x0c6a62);
    [
      [-0.66, 0.5],
      [-0.22, 0.85],
      [0.22, 1.2],
      [0.66, 0.7]
    ].forEach(([x, h]) => {
      mk(new THREE.CylinderGeometry(0.14, 0.14, h, 6), crys, x, 0.1 + h / 2, 0, g, true);
      mk(new THREE.ConeGeometry(0.14, 0.22, 6), crys, x, 0.1 + h + 0.11, 0, g, true);
    });
    const c0 = mk(new THREE.BoxGeometry(0.3, 0.3, 0.3), binTexMat("0", "#9ff8ee", "#0b4a48"), -0.5, 1.4, 0.4, g);
    const c1 = mk(new THREE.BoxGeometry(0.3, 0.3, 0.3), binTexMat("1", "#9ff8ee", "#0b4a48"), 0.5, 1.5, 0.4, g);
    return {
      group: g,
      update(t) {
        c0.position.y = 1.4 + Math.sin(t * 2.2) * 0.1;
        c1.position.y = 1.5 + Math.sin(t * 2.2 + 1.7) * 0.1;
        c0.rotation.y = t * 1.6;
        c1.rotation.y = -t * 1.6;
      }
    };
  }

  function buildLandmarkAi() {
    const g = new THREE.Group();
    mk(new THREE.CylinderGeometry(0.3, 0.46, 0.3, 8), lmStoneDark, 0, 0.15, 0, g, true);
    const core = new THREE.Group();
    core.position.y = 1.15;
    g.add(core);
    const coreMat = new THREE.MeshLambertMaterial({ color: 0xff6fb5, emissive: new THREE.Color(0xff2f93) });
    const coreCube = mk(new THREE.BoxGeometry(0.46, 0.46, 0.46), coreMat, 0, 0, 0, core);
    const shellGeo = new THREE.BoxGeometry(1.1, 1.1, 1.1);
    core.add(new THREE.LineSegments(new THREE.EdgesGeometry(shellGeo), lmWhiteEdgeMat(0xffc2e2)));
    const nodeGeo = new THREE.SphereGeometry(0.075, 6, 5);
    const nodeMat = new THREE.MeshBasicMaterial({ color: 0xffe3f1 });
    const linePts = [];
    for (let i = 0; i < 8; i++) {
      const x = i & 1 ? 0.55 : -0.55;
      const y = i & 2 ? 0.55 : -0.55;
      const z = i & 4 ? 0.55 : -0.55;
      mk(nodeGeo, nodeMat, x, y, z, core);
      linePts.push(new THREE.Vector3(0, 0, 0), new THREE.Vector3(x, y, z));
    }
    core.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(linePts), lmWhiteEdgeMat(0xff9ccc)));
    return {
      group: g,
      update(t) {
        core.rotation.y = t * 0.9;
        core.rotation.x = Math.sin(t * 0.7) * 0.25;
        const p = 1 + Math.sin(t * 4.2) * 0.16;
        coreCube.scale.setScalar(p);
        coreMat.emissiveIntensity = 0.7 + Math.sin(t * 4.2) * 0.3;
        core.position.y = 1.15 + Math.sin(t * 1.7) * 0.08;
      }
    };
  }

  const landmarkBuilders = {
    sys: buildLandmarkSys,
    citizen: buildLandmarkCitizen,
    create: buildLandmarkCreate,
    code: buildLandmarkCode,
    algo: buildLandmarkAlgo,
    data: buildLandmarkData,
    ai: buildLandmarkAi
  };
  const landmarkOrder = ["sys", "citizen", "create", "code", "algo", "data", "ai"];

  ISLANDS_DATA.slice(0, 7).forEach((isl, idx) => {
    const ang = (idx / 7) * Math.PI * 2 - Math.PI / 2;
    const builder = landmarkBuilders[isl.id] || landmarkBuilders[landmarkOrder[idx]];
    const lm = builder();
    const accent = new THREE.Color(isl.color || "#ffd166");
    const plat = new THREE.Group();
    plat.position.set(Math.cos(ang) * landmarkRingR, 2.2, Math.sin(ang) * landmarkRingR);
    plat.rotation.y = Math.PI / 2 - ang;
    landmarkRoot.add(plat);
    mk(lmPlatGeo, lmStone, 0, 0, 0, plat, true);
    mk(lmUnderGeo, lmStoneDark, 0, -0.86, 0, plat, true);
    const accentMat = new THREE.MeshBasicMaterial({ color: accent });
    mk(lmRingGeo, accentMat, 0, 0.17, 0, plat);
    lm.group.position.y = 0.16;
    lm.group.scale.setScalar(0.95);
    plat.add(lm.group);
    expansionAnims.push((t) => {
      plat.position.y = 2.2 + Math.sin(t * 1.2 + idx * 0.9) * 0.14;
      lm.update(t);
    });
  });

  /* ---------- 8c. 7 座主題 NPC 島（6 座外海主題小浮島全面升級 + 第 7 座核心航道「⏳ 量子沙漏咖啡島」） ---------- */
  const npcIsletGroup = new THREE.Group();
  npcIsletGroup.name = "npcIslets";
  scene.add(npcIsletGroup);
  const npcIslandRecords = [];

  const isletSandGeo = createRoundedCylinderGeometry(3.6, 4.2, 1.3, 0.35, 12);
  const isletTurfGeo = createRoundedCylinderGeometry(3.1, 3.45, 0.8, 0.35, 12);
  const isletShallowGeo = new THREE.RingGeometry(3.9, 6.3, 28);
  isletShallowGeo.rotateX(-Math.PI / 2);
  const isletFoamGeo = new THREE.RingGeometry(4.2, 4.8, 28);
  isletFoamGeo.rotateX(-Math.PI / 2);

  // 量子沙漏咖啡島專用雙層圓弧階梯台地幾何
  const cafeSandGeo = createRoundedCylinderGeometry(4.35, 4.95, 1.2, 0.35, 16);
  const cafeTurfGeo = createRoundedCylinderGeometry(3.55, 3.9, 0.9, 0.32, 16);
  const cafeShallowGeo = new THREE.RingGeometry(4.7, 7.1, 28);
  cafeShallowGeo.rotateX(-Math.PI / 2);
  const cafeFoamGeo = new THREE.RingGeometry(4.95, 5.6, 28);
  cafeFoamGeo.rotateX(-Math.PI / 2);

  const isletSandMat = LM(0xf6dfa4);
  const isletTurfMat = LM(0x7fd88a);
  const isletTreeSpots = [];
  const isletFlowerSpots = [];
  const woodM = LM(0xa8714a);
  const woodDarkM = LM(0x6f4518);
  const darkEyeMat = new THREE.MeshBasicMaterial({ color: 0x1e293b });
  const sphereGeo8 = new THREE.SphereGeometry(1, 8, 6);
  const cubeGeo = new THREE.BoxGeometry(1, 1, 1);

  // 極致效能共用幾何體池（欄杆、柱子、燈柱、花草、方塊、桌椅、浮標、NPC 零件）
  const sharedMiniNpcBodyGeo = new THREE.CylinderGeometry(0.2, 0.27, 0.5, 8);
  const sharedMiniNpcHatConeGeo = new THREE.ConeGeometry(0.26, 0.22, 8);
  const sharedMiniNpcHatBrimGeo = new THREE.CylinderGeometry(0.34, 0.34, 0.03, 10);
  const sharedMiniNpcCapDomeGeo = new THREE.SphereGeometry(0.25, 10, 6, 0, Math.PI * 2, 0, Math.PI * 0.52);
  const sharedMiniNpcApronGeo = new THREE.BoxGeometry(0.32, 0.34, 0.06);
  const sharedMiniNpcGoggleGeo = new THREE.TorusGeometry(0.068, 0.018, 5, 10);
  const sharedMiniNpcLensGeo = new THREE.CylinderGeometry(0.055, 0.055, 0.03, 8);
  const sharedMiniNpcHeadbandGeo = new THREE.TorusGeometry(0.255, 0.024, 5, 14, Math.PI * 1.1);
  const sharedMiniNpcEarCupGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.06, 8);
  const sharedMiniNpcBagGeo = new THREE.BoxGeometry(0.18, 0.2, 0.1);

  const sharedRailPostGeo = new THREE.BoxGeometry(0.08, 0.42, 0.08);
  const sharedRailBarGeo = new THREE.BoxGeometry(1, 0.06, 0.06);
  const sharedPillarGeo = new THREE.CylinderGeometry(0.085, 0.095, 1.62, 7);
  const sharedLampPostGeo = new THREE.CylinderGeometry(0.045, 0.065, 1.1, 6);
  const sharedLampGlobeGeo = new THREE.OctahedronGeometry(0.14, 0);
  const sharedDataCubeGeo = new THREE.BoxGeometry(0.16, 0.16, 0.16);
  const sharedFlowerStemGeo = new THREE.CylinderGeometry(0.02, 0.025, 0.22, 4);
  const sharedFlowerHeadGeo = new THREE.DodecahedronGeometry(0.1, 0);
  const sharedUmbrellaSliceGeo = new THREE.ConeGeometry(0.78, 0.3, 6, 1, false, 0, Math.PI / 3);
  const sharedUmbrellaPoleGeo = new THREE.CylinderGeometry(0.035, 0.04, 1.48, 6);
  const sharedTableTopGeo = new THREE.CylinderGeometry(0.42, 0.42, 0.06, 10);
  const sharedTableLegGeo = new THREE.CylinderGeometry(0.05, 0.09, 0.44, 6);
  const sharedStoolGeo = new THREE.CylinderGeometry(0.15, 0.13, 0.26, 8);
  const sharedCupGeo = new THREE.CylinderGeometry(0.06, 0.042, 0.08, 8);
  const sharedSaucerGeo = new THREE.CylinderGeometry(0.1, 0.085, 0.02, 8);
  const sharedBuoyBaseGeo = new THREE.CylinderGeometry(0.26, 0.34, 0.32, 8);
  const sharedBuoyMastGeo = new THREE.CylinderGeometry(0.038, 0.055, 0.52, 6);
  const sharedBuoyGlowGeo = new THREE.OctahedronGeometry(0.16, 0);
  const sharedBottleBodyGeo = new THREE.CylinderGeometry(0.13, 0.14, 0.36, 8);
  const sharedBottleNeckGeo = new THREE.CylinderGeometry(0.055, 0.09, 0.12, 8);
  const sharedBottleCorkGeo = new THREE.CylinderGeometry(0.052, 0.045, 0.09, 8);
  const sharedFishBodyGeo = new THREE.ConeGeometry(0.11, 0.34, 5);
  const sharedFishTailGeo = new THREE.ConeGeometry(0.08, 0.16, 4);
  const sharedNoteStemGeo = new THREE.BoxGeometry(0.045, 0.32, 0.045);
  const sharedIsletHitGeo = new THREE.CylinderGeometry(4.6, 5.0, 5.4, 12);
  const sharedCafeHitGeo = new THREE.CylinderGeometry(5.2, 5.6, 6.2, 14);
  const sharedHitMat = new THREE.MeshBasicMaterial({ visible: false });

  function makeMiniNPC(shirtHex, hatHex, skinHex, opts = {}) {
    const root = new THREE.Group();
    const bodyPivot = new THREE.Group();
    root.add(bodyPivot);
    const shirtMat = LM(shirtHex);
    mk(sharedMiniNpcBodyGeo, shirtMat, 0, 0.32, 0, bodyPivot, true);
    if (opts.apronMat) {
      mk(sharedMiniNpcApronGeo, opts.apronMat, 0, 0.29, 0.22, bodyPivot);
    }
    if (opts.backpackMat) {
      mk(sharedMiniNpcBagGeo, opts.backpackMat, 0, 0.35, -0.22, bodyPivot);
    }

    const head = new THREE.Group();
    head.position.y = 0.78;
    bodyPivot.add(head);
    const skin = LM(skinHex || 0xffd7b0);
    const headMesh = mk(sphereGeo8, skin, 0, 0, 0, head, true);
    headMesh.scale.setScalar(0.24);
    [-0.09, 0.09].forEach((ex) => {
      const e = mk(sphereGeo8, darkEyeMat, ex, 0.02, 0.21, head);
      e.scale.setScalar(0.03);
    });

    if (opts.goggles) {
      [-0.095, 0.095].forEach((gx) => {
        mk(sharedMiniNpcGoggleGeo, isletMat.brassGold, gx, 0.14, 0.2, head);
        const lens = mk(sharedMiniNpcLensGeo, isletMat.gogglesLens, gx, 0.14, 0.2, head);
        lens.rotation.x = Math.PI / 2;
      });
    }
    if (opts.glasses) {
      [-0.09, 0.09].forEach((gx) => {
        mk(sharedMiniNpcGoggleGeo, npcExtraMat.bootDark, gx, 0.02, 0.225, head).scale.setScalar(0.95);
      });
    }
    if (opts.headphones) {
      const hb = mk(sharedMiniNpcHeadbandGeo, npcExtraMat.bootDark, 0, 0.04, 0, head);
      hb.rotation.z = -Math.PI * 0.05;
      [-0.25, 0.25].forEach((hx) => {
        const cup = mk(sharedMiniNpcEarCupGeo, isletMat.headphoneGlow, hx, 0.01, 0, head);
        cup.rotation.z = Math.PI / 2;
      });
    }
    if (hatHex) {
      const hatMat = LM(hatHex);
      if (opts.hatStyle === "cap") {
        mk(sharedMiniNpcCapDomeGeo, hatMat, 0, 0.05, 0, head, true);
        mk(sharedMiniNpcHatBrimGeo, hatMat, 0, 0.08, 0.04, head).scale.set(0.85, 1, 0.95);
      } else {
        mk(sharedMiniNpcHatConeGeo, hatMat, 0, 0.26, 0, head, true);
        mk(sharedMiniNpcHatBrimGeo, hatMat, 0, 0.17, 0, head);
      }
    }

    const armL = new THREE.Group();
    armL.position.set(-0.27, 0.45, 0);
    bodyPivot.add(armL);
    const armMeshL = mk(sphereGeo8, skin, 0, 0, 0, armL);
    armMeshL.scale.setScalar(0.08);

    const armR = new THREE.Group();
    armR.position.set(0.27, 0.45, 0);
    bodyPivot.add(armR);
    const armMeshR = mk(sphereGeo8, skin, 0, 0, 0, armR);
    armMeshR.scale.setScalar(0.08);

    [-0.1, 0.1].forEach((fx) => {
      const f = mk(sphereGeo8, npcExtraMat.bootDark, fx, 0.06, 0.03, root);
      f.scale.set(0.09, 0.06, 0.12);
    });
    return { root, bodyPivot, head, armL, armR };
  }

  function addNpcIdle(npc, phase, opts = {}) {
    expansionAnims.push((t) => {
      const baseY = npc.baseY || 0;
      if (opts.seated) {
        npc.bodyPivot.rotation.x = Math.sin(t * 1.8 + phase) * 0.05;
        npc.head.rotation.y = Math.sin(t * 1.1 + phase) * 0.28;
        return;
      }
      if (opts.dj) {
        const beat = Math.abs(Math.sin(t * 5.4 + phase));
        npc.root.position.y = baseY + beat * 0.08;
        npc.head.rotation.x = Math.sin(t * 5.4 + phase) * 0.18;
        npc.bodyPivot.rotation.z = Math.sin(t * 2.7 + phase) * 0.08;
        npc.armL.position.y = 0.45 + beat * 0.12;
        npc.armR.position.y = 0.45 + Math.abs(Math.cos(t * 5.4 + phase)) * 0.12;
        return;
      }
      npc.root.position.y = baseY + Math.abs(Math.sin(t * 2.2 + phase)) * 0.05;
      npc.head.rotation.y = Math.sin(t * 1.1 + phase) * 0.38;
      if (opts.wave) {
        npc.armR.position.y = 0.58 + Math.sin(t * 6.0 + phase) * 0.12;
        npc.armR.position.x = 0.30 + Math.cos(t * 6.0 + phase) * 0.05;
      } else {
        npc.armR.position.y = 0.45 + Math.max(0, Math.sin(t * 3 + phase)) * 0.12;
      }
    });
  }

  function isletTree(local, spot, topY = GROUND_TOP_Y.ISLET_TURF) {
    isletTreeSpots.push({ x: local.x + spot[0], y: local.y + topY, z: local.z + spot[1], s: spot[2] || 1 });
  }

  function createNpcIslet(spec) {
    const g = new THREE.Group();
    const pos = spec.worldPos
      ? spec.worldPos.clone()
      : new THREE.Vector3(
          Math.cos((spec.angleDeg * Math.PI) / 180) * spec.radius,
          0,
          Math.sin((spec.angleDeg * Math.PI) / 180) * spec.radius
        );
    g.position.copy(pos);
    g.scale.setScalar(spec.scale || 1);
    g.userData = { npcIslandId: spec.id, npcIslandName: spec.name };
    npcIsletGroup.add(g);

    const isCafe = spec.id === "quantum-cafe";
    mk(isCafe ? cafeShallowGeo : isletShallowGeo, shallowLagoonMat, 0, 0.08, 0, g);
    mk(isCafe ? cafeFoamGeo : isletFoamGeo, foamMat, 0, 0.13, 0, g);

    const sand = mk(
      isCafe ? cafeSandGeo : isletSandGeo,
      isCafe ? isletMat.cafeSand : isletSandMat,
      0,
      isCafe ? 0.6 : 0.4,
      0,
      g,
      true
    );
    sand.receiveShadow = true;

    const turf = mk(
      isCafe ? cafeTurfGeo : isletTurfGeo,
      isCafe ? isletMat.cafeTurf : isletTurfMat,
      0,
      isCafe ? 1.55 : 1.15,
      0,
      g,
      true
    );
    turf.receiveShadow = true;

    const content = new THREE.Group();
    content.position.y = isCafe ? 2.0 : GROUND_TOP_Y.ISLET_TURF;
    g.add(content);

    // 隱形點擊碰撞體
    const hitMesh = mk(isCafe ? sharedCafeHitGeo : sharedIsletHitGeo, sharedHitMat, 0, 2.4, 0, g);
    hitMesh.userData = { npcIslandId: spec.id };

    // 可愛縮放版島名浮動牌（不擋住主島名牌）
    const labelSprite = createLabelSprite(spec.emoji, spec.name, spec.subtitle, spec.accent, false);
    labelSprite.scale.set(7.4, 2.55, 1);
    labelSprite.position.set(0, spec.labelY || 6.4, 0);
    g.add(labelSprite);

    // 夜晚專屬水面環繞柔光光暈（零 PointLight）
    const isletWaterHalo = makeGroundGlowPlane(isCafe ? 15.2 : 13.8, isCafe ? 15.2 : 13.8, spec.accent || 0x38bdf8, 0.14);
    g.add(isletWaterHalo.mesh);
    nightGlowUpdaters.push((nb, t) => {
      const show = nb > 0.01;
      isletWaterHalo.mesh.visible = show;
      if (show) isletWaterHalo.mat.opacity = (0.2 + 0.05 * Math.sin(t * 1.8 + pos.x)) * nb;
    });

    spec.build(content, g, pos);

    const rec = {
      id: spec.id,
      name: spec.name,
      emoji: spec.emoji,
      group: g,
      content,
      labelSprite,
      baseScale: spec.scale || 1
    };
    npcIslandRecords.push(rec);
    return g;
  }

  // 共用輔助：建立迷你露天咖啡座（紅白條紋遮陽傘 + 原木圓桌 + 迷你咖啡杯 + 小圓凳）
  function buildCafeSeatingSet(parent, x, z) {
    const grp = new THREE.Group();
    grp.position.set(x, 0, z);
    parent.add(grp);

    // 原木圓桌 (高 0.47)
    mk(sharedTableLegGeo, woodDarkM, 0, 0.22, 0, grp, true);
    mk(sharedTableTopGeo, woodPlankMat, 0, 0.45, 0, grp, true);

    // 2 個迷你咖啡杯 + 杯碟
    [
      [-0.14, 0.12],
      [0.14, -0.1]
    ].forEach(([cx, cz]) => {
      mk(sharedSaucerGeo, isletMat.coffeeCeramic, cx, 0.49, cz, grp);
      mk(sharedCupGeo, isletMat.coffeeCeramic, cx, 0.54, cz, grp);
      const coffeeTop = mk(sharedSaucerGeo, isletMat.coffeeLiquid, cx, 0.575, cz, grp);
      coffeeTop.scale.set(0.45, 0.4, 0.45);
    });

    // 2 張原木小圓凳
    [
      [-0.56, 0.18],
      [0.56, -0.15]
    ].forEach(([sx, sz]) => {
      mk(sharedStoolGeo, woodM, sx, 0.13, sz, grp, true);
    });

    // 咖啡桌小風燈與木棧道／草地投影暖光圈
    mk(new THREE.CylinderGeometry(0.055, 0.07, 0.03, 6), woodDarkM, 0.25, 0.495, 0.16, grp);
    mk(new THREE.CylinderGeometry(0.05, 0.05, 0.11, 6), isletMat.lampEmissive, 0.25, 0.565, 0.16, grp);
    mk(new THREE.ConeGeometry(0.075, 0.055, 6), woodDarkM, 0.25, 0.64, 0.16, grp);
    const tableGlowSprite = makeNightGlowSprite(0xffcb4d, 0.95);
    tableGlowSprite.sprite.position.set(0.25, 0.57, 0.16);
    grp.add(tableGlowSprite.sprite);
    const seatGroundGlow = makeGroundGlowPlane(2.9, 2.9, 0xffc34d, 0.035);
    grp.add(seatGroundGlow.mesh);
    nightGlowUpdaters.push((nb, t) => {
      const show = nb > 0.01;
      tableGlowSprite.sprite.visible = show;
      seatGroundGlow.mesh.visible = show;
      if (show) {
        const pulse = 0.92 + 0.08 * Math.sin(t * 3.6 + x);
        tableGlowSprite.mat.opacity = 0.62 * nb * pulse;
        seatGroundGlow.mat.opacity = 0.52 * nb * pulse;
      }
    });

    // 紅白條紋遮陽傘（共用傘骨與 6 片錐形傘瓣幾何）
    mk(sharedUmbrellaPoleGeo, woodDarkM, 0, 0.96, 0, grp);
    for (let u = 0; u < 6; u++) {
      const slice = mk(
        sharedUmbrellaSliceGeo,
        u % 2 === 0 ? isletMat.umbrellaRed : isletMat.umbrellaWhite,
        0,
        1.68,
        0,
        grp,
        true
      );
      slice.rotation.y = (u / 6) * Math.PI * 2;
    }
  }

  // 0) 【第 7 座核心航道 NPC 島】⏳ 量子沙漏驛站・星光咖啡島
  function buildQuantumHourglassCafeIsle(c, g, pos) {
    // 面向中央海灣與視角微調角度
    c.rotation.y = Math.atan2(-pos.x, 22 - pos.z);

    // 雙層圓弧階梯台地前方木質踏階（從沙灘 1.20 銜接草地 2.00）
    const stairGroup = new THREE.Group();
    stairGroup.position.set(0, -0.8, 3.65);
    c.add(stairGroup);
    mk(cubeGeo, woodPlankMat, 0, 0.22, 0.35, stairGroup, true).scale.set(1.55, 0.24, 0.55);
    mk(cubeGeo, woodPlankMat, 0, 0.52, -0.05, stairGroup, true).scale.set(1.45, 0.34, 0.55);

    // 中央八角木造涼亭（8 根原木柱 + 矮欄杆 + 薄荷綠錐頂）
    const pavX = 0;
    const pavZ = -0.55;
    const pavDeck = mk(new THREE.CylinderGeometry(1.7, 1.82, 0.16, 8), woodPlankMat, pavX, 0.08, pavZ, c, true);
    pavDeck.rotation.y = Math.PI / 8;
    const pavR = 1.46;
    for (let i = 0; i < 8; i++) {
      const ang = (i / 8) * Math.PI * 2 + Math.PI / 8;
      const px = pavX + Math.cos(ang) * pavR;
      const pz = pavZ + Math.sin(ang) * pavR;
      mk(sharedPillarGeo, woodLogMat, px, 0.97, pz, c, true);

      // 矮欄杆（正面 +z 兩柱之間留出入口）
      const nextAng = ((i + 1) / 8) * Math.PI * 2 + Math.PI / 8;
      const nx = pavX + Math.cos(nextAng) * pavR;
      const nz = pavZ + Math.sin(nextAng) * pavR;
      const midAng = (ang + nextAng) * 0.5;
      if (Math.sin(midAng) > 0.85) continue; // 正前方留入口

      const mx = (px + nx) * 0.5;
      const mz = (pz + nz) * 0.5;
      const segLen = Math.hypot(nx - px, nz - pz);
      const rail = mk(sharedRailBarGeo, woodFenceMat, mx, 0.46, mz, c);
      rail.scale.set(segLen, 1, 1);
      rail.rotation.y = Math.atan2(-(nz - pz), nx - px);
      mk(sharedRailPostGeo, woodFenceMat, mx, 0.32, mz, c);
    }

    // 薄荷綠八角錐頂 + 金色簷環 + 涼亭屋簷暖黃小串燈
    const roof = mk(new THREE.ConeGeometry(2.06, 0.95, 8), isletMat.mintRoof, pavX, 2.25, pavZ, c, true);
    roof.rotation.y = Math.PI / 8;
    const eave = mk(new THREE.TorusGeometry(1.86, 0.055, 6, 16), isletMat.starGoldEmissive, pavX, 1.78, pavZ, c);
    eave.rotation.x = Math.PI / 2;

    const stringBulbMat = registerNightMat(
      new THREE.MeshStandardMaterial({ color: 0xfff3b0, emissive: 0xffb703, emissiveIntensity: 0.2, roughness: 0.2 }),
      { dayEi: 0.2, nightEi: 2.55 }
    );
    const stringBulbGeo = new THREE.SphereGeometry(0.052, 6, 5);
    for (let sb = 0; sb < 16; sb++) {
      const sa = (sb / 16) * Math.PI * 2;
      const dip = sb % 2 === 1 ? 0.06 : 0.0;
      mk(stringBulbGeo, stringBulbMat, pavX + Math.cos(sa) * 1.9, 1.73 - dip, pavZ + Math.sin(sa) * 1.9, c);
    }
    const pavGroundGlow = makeGroundGlowPlane(4.4, 4.4, 0xffc652, 0.18);
    pavGroundGlow.mesh.position.set(pavX, 0.18, pavZ);
    c.add(pavGroundGlow.mesh);
    const stairGlow = makeGroundGlowPlane(2.8, 2.8, 0xffc34d, -0.36);
    stairGlow.mesh.position.set(0, -0.36, 3.65);
    c.add(stairGlow.mesh);

    // 兩盞涼亭入口旁發光小風燈（使用 emissive，零 PointLight ＋ 地面光斑）
    const cafeLampHalos = [];
    [-0.95, 0.95].forEach((lx) => {
      mk(sharedLampPostGeo, woodDarkM, lx, 0.55, 1.55, c);
      mk(sharedLampGlobeGeo, isletMat.lampEmissive, lx, 1.15, 1.55, c);
      const lSp = makeNightGlowSprite(0xffcb4d, 1.45);
      lSp.sprite.position.set(lx, 1.15, 1.55);
      c.add(lSp.sprite);
      const lGr = makeGroundGlowPlane(2.7, 2.7, 0xffc652, 0.035);
      lGr.mesh.position.set(lx, 0.035, 1.55);
      c.add(lGr.mesh);
      cafeLampHalos.push({ lSp, lGr });
    });

    // 涼亭屋頂上方懸浮「雙錐水晶沙漏」＋金色星軌環＋4 顆發光金色數據方塊＋星塵粒子
    const hgPivot = new THREE.Group();
    hgPivot.position.set(pavX, 3.62, pavZ);
    c.add(hgPivot);

    const coneGeo = new THREE.ConeGeometry(0.5, 0.68, 8);
    const upperCone = mk(coneGeo, isletMat.crystalCyan, 0, 0.34, 0, hgPivot);
    upperCone.rotation.x = Math.PI;
    mk(coneGeo, isletMat.crystalCyan, 0, -0.34, 0, hgPivot);

    const hgGlowSprite = makeNightGlowSprite(0x00e5ff, 3.2);
    hgPivot.add(hgGlowSprite.sprite);

    const capRingGeo = new THREE.TorusGeometry(0.52, 0.045, 6, 16);
    const capTop = mk(capRingGeo, isletMat.starGoldEmissive, 0, 0.68, 0, hgPivot);
    capTop.rotation.x = Math.PI / 2;
    const capBot = mk(capRingGeo, isletMat.starGoldEmissive, 0, -0.68, 0, hgPivot);
    capBot.rotation.x = Math.PI / 2;

    const starOrbit = new THREE.Group();
    starOrbit.rotation.set(0.45, 0, -0.28);
    hgPivot.add(starOrbit);
    const orbitRing = mk(new THREE.TorusGeometry(1.02, 0.032, 6, 28), isletMat.starGoldEmissive, 0, 0, 0, starOrbit);
    orbitRing.rotation.x = Math.PI / 2;

    const dataCubes = [];
    for (let i = 0; i < 4; i++) {
      const dc = mk(sharedDataCubeGeo, goldenCoreGlowMat, 0, 0, 0, hgPivot);
      dc.scale.setScalar(0.85);
      dataCubes.push({ mesh: dc, phase: (i / 4) * Math.PI * 2 });
    }
    // 沙漏內部金色星塵微粒（隨時間閃爍旋轉）
    const stardustGeo = new THREE.OctahedronGeometry(0.048, 0);
    const stardustList = [];
    for (let s = 0; s < 10; s++) {
      const sm = new THREE.MeshBasicMaterial({ color: 0xffe478, transparent: true, opacity: 0.9, fog: false });
      const sp = mk(stardustGeo, sm, 0, 0, 0, hgPivot);
      stardustList.push({
        mesh: sp,
        mat: sm,
        r: 0.1 + (s % 3) * 0.08,
        yBase: ((s / 9) - 0.5) * 0.95,
        ph: s * 0.92,
        speed: 1.8 + (s % 4) * 0.5
      });
    }

    expansionAnims.push((t) => {
      hgPivot.position.y = 3.62 + Math.sin(t * 1.8) * 0.18;
      hgPivot.rotation.y = t * 0.65;
      starOrbit.rotation.y = -t * 1.15;
      dataCubes.forEach((d, idx) => {
        const a = t * 1.9 + d.phase;
        const r = 0.22 + (idx % 2) * 0.06;
        d.mesh.position.set(Math.cos(a) * r, Math.sin(t * 2.4 + d.phase) * 0.38, Math.sin(a) * r);
        d.mesh.rotation.set(t * 1.4, t * 1.8, 0);
      });
      stardustList.forEach((st) => {
        const sa = t * st.speed + st.ph;
        st.mesh.position.set(Math.cos(sa) * st.r, st.yBase + Math.sin(t * 3.0 + st.ph) * 0.08, Math.sin(sa) * st.r);
        const tw = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(t * 5.2 + st.ph));
        st.mesh.scale.setScalar((0.65 + tw * 0.65) * (0.55 + 0.45 * nightBlend));
        st.mat.opacity = 0.35 + 0.65 * tw * (0.3 + 0.7 * nightBlend);
      });
    });

    nightGlowUpdaters.push((nb, t) => {
      const show = nb > 0.01;
      pavGroundGlow.mesh.visible = show;
      stairGlow.mesh.visible = show;
      hgGlowSprite.sprite.visible = show;
      cafeLampHalos.forEach(({ lSp, lGr }) => {
        lSp.sprite.visible = show;
        lGr.mesh.visible = show;
      });
      if (show) {
        pavGroundGlow.mat.opacity = 0.42 * nb;
        stairGlow.mat.opacity = 0.38 * nb;
        hgGlowSprite.mat.opacity = (0.55 + 0.14 * Math.sin(t * 2.4)) * nb;
        cafeLampHalos.forEach(({ lSp, lGr }, idx) => {
          const fl = 0.92 + 0.08 * Math.sin(t * 3.8 + idx);
          lSp.mat.opacity = 0.62 * nb * fl;
          lGr.mat.opacity = 0.5 * nb * fl;
        });
      }
    });

    // 2 組露天咖啡座
    buildCafeSeatingSet(c, -2.05, 1.35);
    buildCafeSeatingSet(c, 2.05, 1.35);

    // 4 位特色造型 NPC（腳底精準貼合草地 y=0）
    // 1. 護目鏡機械師
    const mechanic = makeMiniNPC(0x0ea5e9, 0x334155, 0xffd7b0, { goggles: true, hatStyle: "cap" });
    mechanic.root.position.set(-1.1, 0, 0.85);
    mechanic.root.rotation.y = 0.35;
    mechanic.baseY = 0;
    c.add(mechanic.root);
    addNpcIdle(mechanic, 0.4);

    // 2. 眼鏡學者
    const scholar = makeMiniNPC(0x3a6073, 0x1e3a5f, 0xffd7b0, { glasses: true, hatStyle: "cap" });
    scholar.root.position.set(1.1, 0, 0.85);
    scholar.root.rotation.y = -0.35;
    scholar.baseY = 0;
    c.add(scholar.root);
    addNpcIdle(scholar, 1.5);

    // 3. 圍裙咖啡師
    const barista = makeMiniNPC(0xf8fafc, 0x6f4e37, 0xffd7b0, { apronMat: isletMat.apronCoffee, hatStyle: "cap" });
    barista.root.position.set(0, 0, 0.35);
    barista.root.rotation.y = 0.05;
    barista.baseY = 0;
    c.add(barista.root);
    addNpcIdle(barista, 2.6);

    // 4. 招手領航員
    const navigator = makeMiniNPC(0x2563eb, 0xfbbf24, 0xffd7b0, { hatStyle: "cap" });
    navigator.root.position.set(0.15, 0, 2.45);
    navigator.root.rotation.y = 0.0;
    navigator.baseY = 0;
    c.add(navigator.root);
    addNpcIdle(navigator, 3.2, { wave: true });

    // 周圍海面 2 顆發光導航浮標（使用 emissive 材質 ＋ 海面青色投影光暈）
    const buoySpots = [
      [-5.35, 2.1, 0.2],
      [5.35, -1.9, 2.5]
    ];
    buoySpots.forEach(([bx, bz, phase]) => {
      const buoyRoot = new THREE.Group();
      buoyRoot.position.set(bx, 0.08, bz);
      g.add(buoyRoot);
      mk(sharedBuoyBaseGeo, isletMat.umbrellaRed, 0, 0.16, 0, buoyRoot, true);
      mk(sharedBuoyMastGeo, isletMat.lighthouseWhite, 0, 0.55, 0, buoyRoot);
      const beacon = mk(sharedBuoyGlowGeo, isletMat.buoyGlow, 0, 0.9, 0, buoyRoot);
      const bWaterGlow = makeGroundGlowPlane(3.6, 3.6, 0x00e5ff, 0.14);
      bWaterGlow.mesh.position.set(bx, 0.14, bz);
      g.add(bWaterGlow.mesh);
      const bGlowSp = makeNightGlowSprite(0x00e5ff, 1.5);
      bGlowSp.sprite.position.set(0, 0.9, 0);
      buoyRoot.add(bGlowSp.sprite);
      expansionAnims.push((t) => {
        buoyRoot.position.y = 0.08 + Math.sin(t * 2.1 + phase) * 0.12;
        buoyRoot.rotation.z = Math.sin(t * 1.7 + phase) * 0.1;
        buoyRoot.rotation.x = Math.cos(t * 1.5 + phase) * 0.08;
        beacon.rotation.y = t * 1.4;
      });
      nightGlowUpdaters.push((nb, t) => {
        const show = nb > 0.01;
        bWaterGlow.mesh.visible = show;
        bGlowSp.sprite.visible = show;
        if (show) {
          const p = 0.72 + 0.28 * Math.sin(t * 2.6 + phase);
          bWaterGlow.mat.opacity = 0.48 * nb * p;
          bGlowSp.mat.opacity = 0.58 * nb * p;
        }
      });
    });

    // 周圍幾株點綴花叢與小樹（精準貼地 y = 2.0）
    [
      [-2.45, -1.75, 0.85],
      [2.45, -1.7, 0.82]
    ].forEach((s) => isletTree(pos, s, 2.0));
  }

  // 1) 🔭 星象觀測小島（Observatory Islet）
  function buildObservatoryIslet(c, g, pos) {
    // 白牆藍頂半圓球天文台
    mk(new THREE.CylinderGeometry(1.12, 1.2, 1.05, 12), isletMat.observatoryWall, -0.72, 0.525, -0.48, c, true);
    const dome = mk(
      new THREE.SphereGeometry(1.14, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.52),
      isletMat.observatoryDome,
      -0.72,
      1.04,
      -0.48,
      c,
      true
    );
    void dome;
    const domeRim = mk(new THREE.TorusGeometry(1.13, 0.05, 5, 16), isletMat.starGoldEmissive, -0.72, 1.05, -0.48, c);
    domeRim.rotation.x = Math.PI / 2;
    mk(cubeGeo, woodDarkM, -0.72, 0.34, 0.68, c).scale.set(0.42, 0.65, 0.08);
    mk(sharedLampGlobeGeo, isletMat.starLens, -0.72, 2.25, -0.48, c);

    // 天文台圓頂縫隙：神祕紫藍色星光 ＋ 地面紫藍光暈
    const obsSlitMat = registerNightMat(
      new THREE.MeshStandardMaterial({ color: 0xa78bfa, emissive: 0x6366f1, emissiveIntensity: 0.25, roughness: 0.2 }),
      { dayEi: 0.25, nightEi: 2.6 }
    );
    const domeSlit = mk(new THREE.TorusGeometry(1.145, 0.048, 6, 16, Math.PI * 0.52), obsSlitMat, -0.72, 1.05, -0.48, c);
    domeSlit.rotation.set(0, Math.PI / 2, 0.08);
    const domeSlitRim = mk(new THREE.TorusGeometry(1.155, 0.025, 5, 24), obsSlitMat, -0.72, 1.08, -0.48, c);
    domeSlitRim.rotation.x = Math.PI / 2;
    const obsGlowSprite = makeNightGlowSprite(0x7c5cff, 2.2);
    obsGlowSprite.sprite.position.set(-0.72, 1.82, 0.28);
    c.add(obsGlowSprite.sprite);
    const obsGroundGlow = makeGroundGlowPlane(4.4, 4.4, 0x7c5cff, 0.04);
    obsGroundGlow.mesh.position.set(-0.72, 0.04, -0.48);
    c.add(obsGroundGlow.mesh);

    // 伸出的黃銅色望遠鏡筒（緩慢左右巡天轉動）
    const scopeGroup = new THREE.Group();
    scopeGroup.position.set(1.08, 0, 0.45);
    c.add(scopeGroup);
    for (let i = 0; i < 3; i++) {
      const ta = (i / 3) * Math.PI * 2;
      const leg = mk(
        new THREE.CylinderGeometry(0.025, 0.02, 0.88, 5),
        woodDarkM,
        Math.cos(ta) * 0.16,
        0.4,
        Math.sin(ta) * 0.16,
        scopeGroup
      );
      leg.rotation.set(Math.sin(ta) * 0.25, 0, -Math.cos(ta) * 0.25);
    }
    const barrelPivot = new THREE.Group();
    barrelPivot.position.set(0, 0.84, 0);
    barrelPivot.rotation.set(-0.55, -0.3, 0);
    scopeGroup.add(barrelPivot);
    mk(new THREE.CylinderGeometry(0.11, 0.075, 1.15, 10), isletMat.brassGold, 0, 0, 0, barrelPivot, true).rotation.x =
      Math.PI / 2;
    mk(new THREE.CylinderGeometry(0.125, 0.125, 0.14, 10), isletMat.starLens, 0, 0, 0.56, barrelPivot).rotation.x =
      Math.PI / 2;

    // 望遠鏡鏡頭射向夜空的微弱星象雷射光束
    const laserGeo = buildSoftLightConeGeo(0.015, 0.11, 9.2, 8, 0x9bf0ff, 0x000000);
    laserGeo.rotateX(-Math.PI / 2);
    laserGeo.translate(0, 0, 5.2);
    const laserMat = new THREE.MeshBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
      fog: false
    });
    const laserBeam = new THREE.Mesh(laserGeo, laserMat);
    laserBeam.visible = false;
    barrelPivot.add(laserBeam);
    const lensGlowSp = makeNightGlowSprite(0x7fe9ff, 1.15);
    lensGlowSp.sprite.position.set(0, 0, 0.62);
    barrelPivot.add(lensGlowSp.sprite);

    expansionAnims.push((t) => {
      barrelPivot.rotation.y = -0.3 + Math.sin(t * 0.65) * 0.45;
    });
    nightGlowUpdaters.push((nb, t) => {
      const show = nb > 0.01;
      obsGlowSprite.sprite.visible = show;
      obsGroundGlow.mesh.visible = show;
      laserBeam.visible = show;
      lensGlowSp.sprite.visible = show;
      if (show) {
        const pulse = 0.85 + 0.15 * Math.sin(t * 2.3);
        obsGlowSprite.mat.opacity = 0.45 * nb * pulse;
        obsGroundGlow.mat.opacity = 0.46 * nb * pulse;
        laserMat.opacity = (0.36 + 0.08 * Math.sin(t * 3.1)) * nb;
        lensGlowSp.mat.opacity = 0.62 * nb;
      }
    });

    // 星象木牌
    mk(sharedLampPostGeo, woodDarkM, -1.55, 0.42, 1.15, c).scale.set(0.9, 0.75, 0.9);
    const signBoard = mk(cubeGeo, woodPlankMat, -1.55, 0.88, 1.15, c, true);
    signBoard.scale.set(0.68, 0.44, 0.06);
    signBoard.rotation.y = 0.45;
    mk(sharedLampGlobeGeo, isletMat.starGoldEmissive, -1.55, 0.9, 1.2, c).scale.setScalar(0.65);

    // 觀星小學者 NPC（眼鏡＋天文帽，腳底貼地）
    const scholar = makeMiniNPC(0x3a6073, 0x1e3a5f, 0xffd7b0, { glasses: true });
    scholar.root.position.set(0.28, 0, 1.08);
    scholar.root.rotation.y = 2.0;
    scholar.baseY = 0;
    c.add(scholar.root);
    addNpcIdle(scholar, 1.1);

    [
      [-2.05, 1.15, 0.85],
      [1.95, -1.25, 0.85],
      [1.45, 1.85, 0.72]
    ].forEach((s) => isletTree(pos, s));
  }

  // 2) 📮 海風瓶中信郵局（Bottle Post Islet）
  function buildBottlePostIslet(c, g, pos) {
    // 紅屋頂原木小郵局小屋（前後左右暖光窗戶 ＋ 草地投影暖光圈）
    mk(cubeGeo, woodPlankMat, -0.78, 0.52, -0.52, c, true).scale.set(1.55, 1.04, 1.28);
    const roof = mk(new THREE.ConeGeometry(1.32, 0.82, 4), isletMat.postRed, -0.78, 1.44, -0.52, c, true);
    roof.rotation.y = Math.PI / 4;
    mk(cubeGeo, woodDarkM, -0.78, 0.34, 0.14, c).scale.set(0.38, 0.66, 0.06);
    mk(cubeGeo, isletMat.lampEmissive, -0.25, 0.58, 0.14, c).scale.set(0.28, 0.28, 0.05);
    mk(cubeGeo, isletMat.lampEmissive, -1.3, 0.58, 0.14, c).scale.set(0.28, 0.28, 0.05);
    mk(cubeGeo, isletMat.lampEmissive, -1.56, 0.58, -0.52, c).scale.set(0.05, 0.28, 0.32);
    mk(cubeGeo, isletMat.lampEmissive, 0.0, 0.58, -0.52, c).scale.set(0.05, 0.28, 0.32);

    const postCabinGlow = makeGroundGlowPlane(3.8, 3.8, 0xffbe4d, 0.04);
    postCabinGlow.mesh.position.set(-0.65, 0.04, 0.35);
    c.add(postCabinGlow.mesh);

    // 門口超大紅色動森風郵筒
    const mb = new THREE.Group();
    mb.position.set(0.92, 0, 0.65);
    c.add(mb);
    mk(sharedLampPostGeo, woodDarkM, 0, 0.38, 0, mb).scale.set(1.3, 0.7, 1.3);
    mk(cubeGeo, isletMat.postRed, 0, 0.86, 0, mb, true).scale.set(0.48, 0.42, 0.58);
    const mbTop = mk(new THREE.CylinderGeometry(0.24, 0.24, 0.58, 10), isletMat.postRed, 0, 1.07, 0, mb, true);
    mbTop.rotation.x = Math.PI / 2;
    mk(cubeGeo, isletMat.lighthouseWhite, 0, 0.94, 0.3, mb).scale.set(0.32, 0.07, 0.04);
    mk(cubeGeo, isletMat.starGoldEmissive, 0.27, 1.05, 0, mb).scale.set(0.05, 0.24, 0.12);

    // 島邊海面漂浮 2 個玻璃瓶中信（螢光綠與暖橘微光 ＋ 隨波浪晃動的水面投影光暈）
    const bottleThemes = [
      { bx: 3.3, bz: 2.8, phase: 0.3, color: 0x34ff9e, emissive: 0x10e87a },
      { bx: -3.5, bz: 3.0, phase: 2.1, color: 0xff9436, emissive: 0xff6200 }
    ];
    const bottleVisuals = bottleThemes.map(({ bx, bz, phase, color, emissive }) => {
      const bPivot = new THREE.Group();
      bPivot.position.set(bx, 0.1, bz);
      bPivot.rotation.set(0.55, phase, 0.35);
      g.add(bPivot);
      const bGlassMat = registerNightMat(
        new THREE.MeshStandardMaterial({ color, emissive, emissiveIntensity: 0.25, transparent: true, opacity: 0.68, roughness: 0.14 }),
        { dayEi: 0.25, nightEi: 1.9 }
      );
      const bScrollMat = registerNightMat(
        new THREE.MeshStandardMaterial({ color: 0xfef3c7, emissive, emissiveIntensity: 0.15, roughness: 0.5 }),
        { dayEi: 0.15, nightEi: 1.75 }
      );
      mk(sharedBottleBodyGeo, bGlassMat, 0, 0, 0, bPivot);
      mk(sharedBottleNeckGeo, bGlassMat, 0, 0.23, 0, bPivot);
      mk(sharedBottleCorkGeo, isletMat.corkGlow, 0, 0.32, 0, bPivot);
      mk(sharedBottleBodyGeo, bScrollMat, 0, -0.02, 0, bPivot).scale.set(0.55, 0.65, 0.55);

      const bSprite = makeNightGlowSprite(color, 1.85);
      bSprite.sprite.position.set(0, 0.08, 0);
      bPivot.add(bSprite.sprite);

      const bWaterGlow = makeGroundGlowPlane(4.0, 4.0, color, 0.14);
      bWaterGlow.mesh.position.set(bx, 0.14, bz);
      g.add(bWaterGlow.mesh);

      expansionAnims.push((t) => {
        const wy = Math.sin(t * 2.2 + phase);
        bPivot.position.y = 0.1 + wy * 0.11;
        bPivot.rotation.z = 0.35 + Math.sin(t * 1.8 + phase) * 0.14;
        bPivot.rotation.x = 0.55 + Math.cos(t * 1.5 + phase) * 0.12;
        bWaterGlow.mesh.position.x = bx + Math.sin(t * 1.8 + phase) * 0.12;
        bWaterGlow.mesh.position.z = bz + Math.cos(t * 1.5 + phase) * 0.12;
      });
      return { bSprite, bWaterGlow, phase };
    });

    nightGlowUpdaters.push((nb, t) => {
      const show = nb > 0.01;
      postCabinGlow.mesh.visible = show;
      if (show) postCabinGlow.mat.opacity = 0.45 * nb;
      bottleVisuals.forEach(({ bSprite, bWaterGlow, phase }) => {
        bSprite.sprite.visible = show;
        bWaterGlow.mesh.visible = show;
        if (show) {
          const p = 0.78 + 0.22 * Math.sin(t * 2.6 + phase);
          bSprite.mat.opacity = 0.68 * nb * p;
          bWaterGlow.mat.opacity = 0.54 * nb * p;
          const sc = 0.94 + 0.14 * Math.sin(t * 2.2 + phase);
          bWaterGlow.mesh.scale.set(sc, 1, sc);
        }
      });
    });

    // 海風郵差 NPC（藍色郵差裝＋郵差帽＋郵包，腳底貼地）
    const postman = makeMiniNPC(0x0284c7, 0x1e3a5f, 0xffd7b0, {
      hatStyle: "cap",
      backpackMat: isletMat.chestWood
    });
    postman.root.position.set(0.15, 0, 1.32);
    postman.root.rotation.y = 0.25;
    postman.baseY = 0;
    c.add(postman.root);
    addNpcIdle(postman, 0.8, { wave: true });

    [
      [2.0, -0.95, 0.88],
      [-2.1, 1.05, 0.82],
      [1.55, -1.85, 0.75]
    ].forEach((s) => isletTree(pos, s));
  }

  // 3) 🎣 像素釣魚棧橋島（Pixel Fishing Pier Islet）
  function buildFishingPierIslet(c, g, pos) {
    // 讓棧橋朝正外側海面延伸，絕對不碰撞主島或吊橋
    const outYaw = Math.atan2(pos.x, pos.z);
    c.rotation.y = outYaw;

    // 島上小遮陽棚＋木桶＋釣魚箱
    const canopy = new THREE.Group();
    canopy.position.set(-0.85, 0, -0.45);
    c.add(canopy);
    [
      [-0.65, -0.55],
      [0.65, -0.55],
      [-0.65, 0.55],
      [0.65, 0.55]
    ].forEach(([px, pz]) => {
      mk(sharedLampPostGeo, woodDarkM, px, 0.62, pz, canopy).scale.set(0.9, 1.15, 0.9);
    });
    mk(cubeGeo, isletMat.towelBlue, 0, 1.28, 0, canopy, true).scale.set(1.55, 0.08, 1.3);
    mk(cubeGeo, isletMat.umbrellaWhite, 0, 1.33, 0, canopy).scale.set(1.56, 0.03, 0.45);

    // 木桶與釣魚箱
    mk(new THREE.CylinderGeometry(0.24, 0.22, 0.44, 8), isletMat.chestWood, 1.05, 0.22, -0.55, c, true);
    mk(cubeGeo, isletMat.bucketBlue, 0.95, 0.16, 0.45, c, true).scale.set(0.46, 0.3, 0.34);

    // 向外海延伸的木棧道碼頭 (top = -0.62 + 0.07 = -0.55)
    mk(cubeGeo, woodPlankMat, 0, -0.62, 3.65, c, true).scale.set(1.15, 0.14, 3.5);
    [
      [-0.45, 2.45],
      [0.45, 2.45],
      [-0.45, 5.05],
      [0.45, 5.05]
    ].forEach(([px, pz]) => {
      mk(sharedLampPostGeo, woodDarkM, px, -1.1, pz, c).scale.set(1.2, 1.2, 1.2);
    });

    // 棧橋盡頭暖橘色漁火燈籠（照亮木棧橋與下方水面）
    const fishLanternMat = registerNightMat(
      new THREE.MeshStandardMaterial({ color: 0xffb36b, emissive: 0xff6e1a, emissiveIntensity: 0.25, roughness: 0.2 }),
      { dayEi: 0.25, nightEi: 2.7 }
    );
    mk(sharedLampPostGeo, woodDarkM, -0.48, 0.0, 5.28, c).scale.set(0.85, 1.05, 0.85);
    mk(cubeGeo, woodDarkM, -0.34, 0.55, 5.34, c).scale.set(0.32, 0.05, 0.05);
    mk(new THREE.ConeGeometry(0.14, 0.09, 6), woodDarkM, -0.22, 0.48, 5.4, c);
    mk(new THREE.SphereGeometry(0.13, 8, 6), fishLanternMat, -0.22, 0.35, 5.4, c);
    const pierLanternSp = makeNightGlowSprite(0xff8a2e, 2.0);
    pierLanternSp.sprite.position.set(-0.22, 0.35, 5.4);
    c.add(pierLanternSp.sprite);
    const pierWaterGlow = makeGroundGlowPlane(4.8, 4.8, 0xff8a2e, -1.4);
    pierWaterGlow.mesh.position.set(-0.1, -1.4, 5.3);
    c.add(pierWaterGlow.mesh);
    const pierDeckGlow = makeGroundGlowPlane(2.4, 2.4, 0xff9a3d, -0.52);
    pierDeckGlow.mesh.position.set(-0.15, -0.52, 5.0);
    c.add(pierDeckGlow.mesh);
    const canopyGroundGlow = makeGroundGlowPlane(3.0, 3.0, 0xffbe55, 0.04);
    canopyGroundGlow.mesh.position.set(-0.85, 0.04, -0.45);
    c.add(canopyGroundGlow.mesh);

    // 坐姿釣魚 NPC（坐在棧橋末端，腳貼於木棧板表面 y = -0.55）
    const angler = makeMiniNPC(0x2ec4b6, 0xe9c46a, 0xf3c9a0);
    angler.root.position.set(0, -0.55, 4.95);
    angler.root.rotation.y = 0;
    angler.baseY = -0.55;
    c.add(angler.root);
    addNpcIdle(angler, 1.4, { seated: true });

    const rodPivot = new THREE.Group();
    rodPivot.position.set(0.22, -0.08, 5.05);
    c.add(rodPivot);
    mk(new THREE.CylinderGeometry(0.016, 0.026, 1.55, 4), woodDarkM, 0, 0.32, 0.62, rodPivot).rotation.x = 1.12;
    mk(new THREE.CylinderGeometry(0.006, 0.006, 1.15, 3), isletMat.fishLine, 0, -0.32, 1.28, rodPivot);
    const bobber = mk(sphereGeo8, isletMat.bobberRed, 0, -0.94, 1.28, rodPivot);
    bobber.scale.setScalar(0.075);

    // 棧橋下水中的發光錦鯉/像素魚剪影繞圈游動（夜晚轉為發光錦鯉剪影）
    const fishGroup = new THREE.Group();
    fishGroup.position.set(0, -1.42, 4.35);
    c.add(fishGroup);
    const fishes = [0, 1, 2].map((fi) => {
      const fPivot = new THREE.Group();
      const isOrange = fi % 2 === 0;
      const mat = isOrange ? isletMat.koiOrange : isletMat.koiCyan;
      const body = mk(sharedFishBodyGeo, mat, 0, 0, 0, fPivot);
      body.rotation.x = Math.PI / 2;
      const tail = mk(sharedFishTailGeo, mat, 0, 0, -0.22, fPivot);
      tail.rotation.x = -Math.PI / 2;
      const koiGlow = makeGroundGlowPlane(1.15, 1.45, isOrange ? 0xff6e2b : 0x2bf5dc, -0.02);
      fPivot.add(koiGlow.mesh);
      fishGroup.add(fPivot);
      return { fPivot, koiGlow, radius: 0.95 + fi * 0.32, phase: fi * 2.1, speed: 1.05 + fi * 0.18 };
    });

    expansionAnims.push((t) => {
      rodPivot.rotation.x = Math.sin(t * 1.6) * 0.06;
      bobber.position.y = -0.94 + Math.sin(t * 3.6) * 0.05;
      fishes.forEach((f) => {
        const a = t * f.speed + f.phase;
        f.fPivot.position.set(Math.cos(a) * f.radius, Math.sin(t * 2.5 + f.phase) * 0.04, Math.sin(a) * f.radius);
        f.fPivot.rotation.y = -a;
      });
    });

    nightGlowUpdaters.push((nb, t) => {
      const show = nb > 0.01;
      pierLanternSp.sprite.visible = show;
      pierWaterGlow.mesh.visible = show;
      pierDeckGlow.mesh.visible = show;
      canopyGroundGlow.mesh.visible = show;
      fishes.forEach((f) => { f.koiGlow.mesh.visible = show; });
      if (show) {
        const fl = 0.9 + 0.1 * Math.sin(t * 4.2);
        pierLanternSp.mat.opacity = 0.72 * nb * fl;
        pierWaterGlow.mat.opacity = 0.62 * nb * fl;
        pierDeckGlow.mat.opacity = 0.45 * nb * fl;
        canopyGroundGlow.mat.opacity = 0.34 * nb;
        fishes.forEach((f, idx) => {
          f.koiGlow.mat.opacity = (0.48 + 0.16 * Math.sin(t * 3.0 + idx)) * nb;
        });
      }
    });

    [
      [-1.95, -1.1, 0.82],
      [1.85, -1.25, 0.85]
    ].forEach((s) => isletTree(pos, s));
  }

  // 4) 🎵 芯片音樂八音盒島（Chiptune Music Box Islet）
  function buildMusicBoxIslet(c, g, pos) {
    // 黑膠唱片造型圓形木舞台 (頂面 y = 0.30) ＋ 邊緣霓虹粉與電光藍環形燈條
    mk(new THREE.CylinderGeometry(1.9, 2.06, 0.24, 16), woodPlankMat, 0, 0.12, 0.25, c, true);
    mk(new THREE.CylinderGeometry(1.72, 1.72, 0.06, 20), isletMat.vinylBlack, 0, 0.27, 0.25, c, true);
    mk(new THREE.CylinderGeometry(0.55, 0.55, 0.07, 16), isletMat.umbrellaRed, 0, 0.275, 0.25, c);
    const groove = mk(new THREE.TorusGeometry(1.16, 0.025, 4, 24), isletMat.starGoldEmissive, 0, 0.305, 0.25, c);
    groove.rotation.x = Math.PI / 2;

    const neonStripBlueMat = SG(0x38e8ff, 0x00d9ff, 0.25);
    const neonStripPinkMat = SG(0xff6eb8, 0xff2e93, 0.25);
    const neonOuterStrip = mk(new THREE.TorusGeometry(1.93, 0.045, 6, 32), neonStripBlueMat, 0, 0.24, 0.25, c);
    neonOuterStrip.rotation.x = Math.PI / 2;
    const neonInnerStrip = mk(new THREE.TorusGeometry(1.74, 0.038, 6, 32), neonStripPinkMat, 0, 0.295, 0.25, c);
    neonInnerStrip.rotation.x = Math.PI / 2;

    const stagePinkGlow = makeGroundGlowPlane(5.2, 5.2, 0xff3898, 0.04);
    stagePinkGlow.mesh.position.set(0, 0.04, 0.25);
    c.add(stagePinkGlow.mesh);
    const stageCyanGlow = makeGroundGlowPlane(4.4, 4.4, 0x00d9ff, 0.045);
    stageCyanGlow.mesh.position.set(0, 0.045, 0.25);
    c.add(stageCyanGlow.mesh);

    // 舞台後方巨大的金色發條鑰匙雕塑（持續緩慢旋轉 ＋ 夜色節奏閃耀）
    const musicKeyMat = SG(0xffe066, 0xffb703, 0.45, { metalness: 0.45, roughness: 0.22 });
    const keyPivot = new THREE.Group();
    keyPivot.position.set(0, 0, -1.78);
    c.add(keyPivot);
    mk(new THREE.CylinderGeometry(0.11, 0.13, 2.0, 8), musicKeyMat, 0, 1.0, 0, keyPivot, true);
    [-0.48, 0.48].forEach((kx) => {
      mk(new THREE.TorusGeometry(0.46, 0.1, 6, 14), musicKeyMat, kx, 2.25, 0, keyPivot, true);
    });

    // 發光音符方塊（共用幾何體與材質 ＋ 光暈點綴）
    const noteSpecs = [
      [-1.55, 1.25, 0.8, isletMat.noteNeonPink, 0.0, 0xff3898],
      [1.6, 1.4, 0.65, isletMat.noteNeonCyan, 1.6, 0x00d9ff],
      [-1.1, 1.75, -0.85, isletMat.noteNeonCyan, 3.1, 0x00d9ff],
      [1.25, 1.65, -0.75, isletMat.noteNeonPink, 4.4, 0xff3898]
    ];
    const notes = noteSpecs.map(([nx, ny, nz, nMat, phase, glowCol]) => {
      const ng = new THREE.Group();
      ng.position.set(nx, ny, nz);
      mk(sharedDataCubeGeo, nMat, 0, 0, 0, ng).scale.set(1.2, 0.9, 1.2);
      mk(sharedNoteStemGeo, nMat, 0.08, 0.22, 0, ng);
      const nSp = makeNightGlowSprite(glowCol, 1.35);
      ng.add(nSp.sprite);
      c.add(ng);
      return { ng, nSp, baseY: ny, phase };
    });

    expansionAnims.push((t) => {
      keyPivot.rotation.y = t * 0.9;
      notes.forEach((n) => {
        n.ng.position.y = n.baseY + Math.sin(t * 3.1 + n.phase) * 0.16;
        n.ng.rotation.y = Math.sin(t * 1.4 + n.phase) * 0.35;
      });
    });

    nightGlowUpdaters.push((nb, t) => {
      const beatA = 0.5 + 0.5 * Math.sin(t * 5.2);
      const beatB = 0.5 + 0.5 * Math.sin(t * 5.2 + Math.PI);
      neonStripPinkMat.emissiveIntensity = 0.25 + (1.6 + beatA * 1.2) * nb;
      neonStripBlueMat.emissiveIntensity = 0.25 + (1.6 + beatB * 1.2) * nb;
      isletMat.noteNeonPink.emissiveIntensity = 0.45 + (1.4 + beatA * 1.25) * nb;
      isletMat.noteNeonCyan.emissiveIntensity = 0.45 + (1.4 + beatB * 1.25) * nb;
      musicKeyMat.emissiveIntensity = 0.45 + (1.35 + beatA * 0.9) * nb;

      const show = nb > 0.01;
      stagePinkGlow.mesh.visible = show;
      stageCyanGlow.mesh.visible = show;
      notes.forEach((n) => { n.nSp.sprite.visible = show; });
      if (show) {
        stagePinkGlow.mat.opacity = (0.34 + 0.2 * beatA) * nb;
        stageCyanGlow.mat.opacity = (0.34 + 0.2 * beatB) * nb;
        notes.forEach((n, idx) => {
          const b = idx % 2 === 0 ? beatA : beatB;
          n.nSp.mat.opacity = (0.45 + 0.32 * b) * nb;
        });
      }
    });

    // 戴耳機的 DJ NPC 站在黑膠舞台頂面 (y = 0.30) 隨節奏點頭擺動
    const dj = makeMiniNPC(0xec4899, 0x1e293b, 0xffd7b0, { headphones: true, hatStyle: "cap" });
    dj.root.position.set(0, 0.3, 0.35);
    dj.baseY = 0.3;
    c.add(dj.root);
    addNpcIdle(dj, 0.2, { dj: true });

    [
      [-2.15, 1.15, 0.8],
      [2.15, -1.05, 0.85]
    ].forEach((s) => isletTree(pos, s));
  }

  // 5) 🌱 數位綠洲溫室島（Digital Oasis Greenhouse Islet）
  function buildGreenhouseIslet(c, g, pos) {
    // 半透明玻璃圓頂花房（低多邊形半透明材質）
    const ghX = -0.52;
    const ghZ = -0.45;
    const ghRim = mk(new THREE.TorusGeometry(1.48, 0.09, 6, 16), isletMat.lighthouseWhite, ghX, 0.06, ghZ, c);
    ghRim.rotation.x = Math.PI / 2;
    mk(
      new THREE.SphereGeometry(1.48, 10, 6, 0, Math.PI * 2, 0, Math.PI * 0.5),
      isletMat.greenhouseGlass,
      ghX,
      0.06,
      ghZ,
      c
    );
    [0, Math.PI / 2].forEach((ry) => {
      const rib = mk(new THREE.TorusGeometry(1.49, 0.032, 4, 14, Math.PI), isletMat.lighthouseWhite, ghX, 0.06, ghZ, c);
      rib.rotation.y = ry;
    });

    // 夜晚溫室水晶球夢幻內光暈與地面粉紫／青綠交織光斑
    const ghCrystalAuraMat = new THREE.MeshBasicMaterial({
      color: 0x5eead4,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
      fog: false
    });
    const ghCrystalAura = mk(
      new THREE.SphereGeometry(1.42, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.5),
      ghCrystalAuraMat,
      ghX,
      0.06,
      ghZ,
      c
    );
    ghCrystalAura.visible = false;
    const ghCyanGround = makeGroundGlowPlane(4.4, 4.4, 0x2ee6b8, 0.045);
    ghCyanGround.mesh.position.set(ghX, 0.045, ghZ);
    c.add(ghCyanGround.mesh);
    const ghPinkGround = makeGroundGlowPlane(3.6, 3.6, 0xe879f9, 0.05);
    ghPinkGround.mesh.position.set(ghX, 0.05, ghZ);
    c.add(ghPinkGround.mesh);

    // 內部與門前發光的青藍色與暖粉色奇幻花叢（共用花莖與花冠幾何體）
    const flowerCoords = [
      [-0.9, -0.65, true],
      [-0.25, -0.85, false],
      [-0.65, -0.05, true],
      [-0.1, -0.2, false],
      [-1.15, -0.2, false],
      [0.45, 0.95, true],
      [0.85, 1.2, false]
    ];
    const flowerSprites = [];
    flowerCoords.forEach(([fx, fz, isCyan], fi) => {
      mk(sharedFlowerStemGeo, flowerBushGreenMat, fx, 0.11, fz, c);
      mk(sharedFlowerHeadGeo, isCyan ? isletMat.glowFlowerCyan : isletMat.glowFlowerPink, fx, 0.28, fz, c);
      const fSp = makeNightGlowSprite(isCyan ? 0x2ee6b8 : 0xe879f9, 0.85);
      fSp.sprite.position.set(fx, 0.3, fz);
      c.add(fSp.sprite);
      flowerSprites.push({ fSp, isCyan, fi });
    });

    // 小噴泉
    mk(new THREE.CylinderGeometry(0.55, 0.62, 0.24, 10), stoneReliefMat, 1.38, 0.12, 0.62, c, true);
    mk(new THREE.CylinderGeometry(0.14, 0.18, 0.45, 8), stoneReliefMat, 1.38, 0.34, 0.62, c);
    const waterJet = mk(sharedLampGlobeGeo, isletMat.crystalCyan, 1.38, 0.72, 0.62, c);
    waterJet.scale.set(1.2, 1.5, 1.2);
    const fountainGroundGlow = makeGroundGlowPlane(2.4, 2.4, 0x38bdf8, 0.04);
    fountainGroundGlow.mesh.position.set(1.38, 0.04, 0.62);
    c.add(fountainGroundGlow.mesh);

    // 花叢生物螢光呼吸動畫與水晶花房夜光連動
    expansionAnims.push((t) => {
      const bioC = 0.5 + 0.5 * Math.sin(t * 2.1);
      const bioP = 0.5 + 0.5 * Math.sin(t * 2.1 + Math.PI * 0.8);
      isletMat.glowFlowerCyan.emissiveIntensity = 0.35 + 0.45 * bioC + (1.3 + 1.0 * bioC) * nightBlend;
      isletMat.glowFlowerPink.emissiveIntensity = 0.35 + 0.45 * bioP + (1.3 + 1.0 * bioP) * nightBlend;
      waterJet.scale.y = 1.35 + Math.sin(t * 4.2) * 0.25;
      waterJet.rotation.y = t * 1.4;
    });
    nightGlowUpdaters.push((nb, t) => {
      const show = nb > 0.01;
      ghCrystalAura.visible = show;
      ghCyanGround.mesh.visible = show;
      ghPinkGround.mesh.visible = show;
      fountainGroundGlow.mesh.visible = show;
      flowerSprites.forEach(({ fSp }) => { fSp.sprite.visible = show; });
      if (show) {
        const bioC = 0.5 + 0.5 * Math.sin(t * 2.1);
        const bioP = 0.5 + 0.5 * Math.sin(t * 2.1 + Math.PI * 0.8);
        ghCrystalAuraMat.opacity = (0.18 + 0.08 * bioC) * nb;
        ghCyanGround.mat.opacity = (0.36 + 0.18 * bioC) * nb;
        ghPinkGround.mat.opacity = (0.32 + 0.18 * bioP) * nb;
        fountainGroundGlow.mat.opacity = 0.36 * nb;
        flowerSprites.forEach(({ fSp, isCyan }) => {
          fSp.mat.opacity = (0.45 + 0.3 * (isCyan ? bioC : bioP)) * nb;
        });
      }
    });

    // 拿著澆水壺照料植物的園丁 NPC（腳底貼地 y = 0）
    const gardener = makeMiniNPC(0x10b981, 0xe9c46a, 0xffd7b0, { apronMat: isletMat.windmillSail });
    gardener.root.position.set(0.35, 0, 1.45);
    gardener.root.rotation.y = 0.75;
    gardener.baseY = 0;
    c.add(gardener.root);
    mk(new THREE.CylinderGeometry(0.08, 0.1, 0.15, 8), isletMat.wateringCan, 0.32, 0.42, 0.14, gardener.bodyPivot);
    mk(new THREE.CylinderGeometry(0.02, 0.035, 0.14, 6), isletMat.wateringCan, 0.4, 0.48, 0.18, gardener.bodyPivot).rotation.z =
      -0.85;
    addNpcIdle(gardener, 1.7);

    [
      [2.05, -0.9, 0.88],
      [-2.1, 1.1, 0.82]
    ].forEach((s) => isletTree(pos, s));
  }

  // 6) 🧭 迷霧燈塔瞭望島（Mist Lighthouse Islet）
  function buildLighthouseLookoutIslet(c, g, pos) {
    // 紅白相間條紋高聳圓柱燈塔
    const stripes = [
      isletMat.lighthouseWhite,
      isletMat.lighthouseRed,
      isletMat.lighthouseWhite,
      isletMat.lighthouseRed
    ];
    [0.45, 1.28, 2.1, 2.9].forEach((y, i) => {
      mk(
        new THREE.CylinderGeometry(0.62 - i * 0.06, 0.72 - i * 0.06, 0.84, 10),
        stripes[i],
        -0.68,
        y,
        -0.52,
        c,
        true
      );
    });
    mk(new THREE.CylinderGeometry(0.74, 0.74, 0.12, 10), isletMat.lighthouseRim, -0.68, 3.38, -0.52, c);
    mk(new THREE.CylinderGeometry(0.36, 0.36, 0.52, 8), isletMat.lighthouseLantern, -0.68, 3.7, -0.52, c);
    mk(new THREE.ConeGeometry(0.54, 0.48, 8), isletMat.lighthouseRed, -0.68, 4.2, -0.52, c, true);

    // 頂部金色風向標
    const vanePivot = new THREE.Group();
    vanePivot.position.set(-0.68, 4.55, -0.52);
    c.add(vanePivot);
    mk(new THREE.CylinderGeometry(0.025, 0.025, 0.35, 5), isletMat.starGoldEmissive, 0, -0.05, 0, vanePivot);
    mk(cubeGeo, isletMat.starGoldEmissive, 0, 0.08, 0, vanePivot).scale.set(0.55, 0.04, 0.04);

    // 燈塔頂部玻璃燈室光暈 ＋ 兩道半透明金色探照光錐在海面上緩慢 360 度掃射
    const lhLanternSp = makeNightGlowSprite(0xffd866, 3.2);
    lhLanternSp.sprite.position.set(-0.68, 3.7, -0.52);
    c.add(lhLanternSp.sprite);
    const lhBaseGlow = makeGroundGlowPlane(3.8, 3.8, 0xffd15c, 0.04);
    lhBaseGlow.mesh.position.set(-0.68, 0.04, -0.52);
    c.add(lhBaseGlow.mesh);

    const searchGeo = buildSoftLightConeGeo(0.24, 3.4, 21.0, 16, 0xffcf56, 0x000000);
    searchGeo.rotateX(-Math.PI / 2);
    searchGeo.translate(0, 0, 10.5);
    const searchBeamMat = new THREE.MeshBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.FrontSide,
      fog: false
    });

    const beamPivot = new THREE.Group();
    beamPivot.position.set(-0.68, 3.7, -0.52);
    c.add(beamPivot);
    const beam1 = mk(searchGeo, searchBeamMat, 0, 0, 0, beamPivot);
    beam1.rotation.x = 0.21; // 微微向下傾角照向海面
    const beam2 = mk(searchGeo, searchBeamMat, 0, 0, 0, beamPivot);
    beam2.rotation.y = Math.PI;
    beam2.rotation.x = -0.21; // 旋轉 180 度後向另一側海面微傾

    // 同步於海面上 360 度掃射的兩塊金色受光水斑
    const waterBeamPivot = new THREE.Group();
    waterBeamPivot.position.set(-0.68, 0.18, -0.52);
    g.add(waterBeamPivot);
    const waterSpot1 = makeGroundGlowPlane(8.6, 12.2, 0xffd866, 0.0);
    waterSpot1.mesh.position.set(0, 0, 13.5);
    waterBeamPivot.add(waterSpot1.mesh);
    const waterSpot2 = makeGroundGlowPlane(8.6, 12.2, 0xffd866, 0.0);
    waterSpot2.mesh.position.set(0, 0, -13.5);
    waterBeamPivot.add(waterSpot2.mesh);

    expansionAnims.push((t) => {
      const sweepY = t * 0.52;
      beamPivot.rotation.y = sweepY;
      waterBeamPivot.rotation.y = sweepY;
      vanePivot.rotation.y = Math.sin(t * 1.2) * 0.45;
    });
    nightGlowUpdaters.push((nb) => {
      const show = nb > 0.01;
      lhLanternSp.sprite.visible = show;
      lhBaseGlow.mesh.visible = show;
      beam1.visible = show;
      beam2.visible = show;
      waterSpot1.mesh.visible = show;
      waterSpot2.mesh.visible = show;
      if (show) {
        lhLanternSp.mat.opacity = 0.78 * nb;
        lhBaseGlow.mat.opacity = 0.48 * nb;
        searchBeamMat.opacity = 0.25 * nb;
        waterSpot1.mat.opacity = 0.45 * nb;
        waterSpot2.mat.opacity = 0.45 * nb;
      }
    });

    // 觀海矮護欄（共用幾何體）
    for (let i = 0; i < 4; i++) {
      mk(sharedRailPostGeo, woodM, 0.4 + i * 0.52, 0.21, 1.75, c);
    }
    mk(sharedRailBarGeo, woodM, 1.18, 0.35, 1.75, c).scale.set(1.65, 1, 1);

    // 燈塔守望員 NPC（黃色雨衣外套＋航海帽，腳底貼地）
    const keeper = makeMiniNPC(0xf59e0b, 0x1e3a5f, 0xffd7b0, { hatStyle: "cap" });
    keeper.root.position.set(1.05, 0, 1.25);
    keeper.root.rotation.y = 0.25;
    keeper.baseY = 0;
    c.add(keeper.root);
    addNpcIdle(keeper, 0.5, { wave: true });

    [
      [-2.0, -0.95, 0.85],
      [1.75, -1.4, 0.82],
      [-1.4, 1.75, 0.72]
    ].forEach((s) => isletTree(pos, s));
  }

  // 精準計算「AI 智慧島」與「資料海灣」的中心座標中點，並朝外側海面垂直偏移 7.6 個單位
  const aiIslandRec = islandRecords.find((r) => r.id === "ai");
  const dataIslandRec = islandRecords.find((r) => r.id === "data");
  let cafeWorldPos = new THREE.Vector3(-50.4, 0, -11.5);
  if (aiIslandRec && dataIslandRec) {
    const p1 = aiIslandRec.group.position;
    const p2 = dataIslandRec.group.position;
    const midX = (p1.x + p2.x) * 0.5;
    const midZ = (p1.z + p2.z) * 0.5;
    const dx = p2.x - p1.x;
    const dz = p2.z - p1.z;
    const len = Math.hypot(dx, dz) || 1;
    let nx = -dz / len;
    let nz = dx / len;
    if (nx * midX + nz * midZ < 0) {
      nx = -nx;
      nz = -nz;
    }
    const outwardOffset = 7.6; // 6～8 單位距離，完全避開兩島間吊橋與雙島嶼
    cafeWorldPos.set(midX + nx * outwardOffset, 0, midZ + nz * outwardOffset);
  }

  // 建置 7 座主題特色 NPC 島（第 7 座核心航道咖啡島 + 6 座外海升級主題浮島，保留原位置）
  [
    {
      id: "quantum-cafe",
      emoji: "⏳",
      name: "量子沙漏咖啡島",
      subtitle: "核心航道驛站 · 點擊抽冷知識",
      accent: "#00b4d8",
      worldPos: cafeWorldPos,
      scale: 1.0,
      labelY: 7.4,
      build: buildQuantumHourglassCafeIsle
    },
    {
      id: "observatory",
      emoji: "🔭",
      name: "星象觀測小島",
      subtitle: "演算法幸運籤 · 點擊占卜",
      accent: "#4f7cff",
      angleDeg: -64,
      radius: 61.5,
      scale: 1.0,
      labelY: 6.1,
      build: buildObservatoryIslet
    },
    {
      id: "bottle-post",
      emoji: "📮",
      name: "海風瓶中信郵局",
      subtitle: "資訊史故事 · 點擊撈瓶",
      accent: "#e11d48",
      angleDeg: -10,
      radius: 64.0,
      scale: 1.0,
      labelY: 6.1,
      build: buildBottlePostIslet
    },
    {
      id: "fishing-pier",
      emoji: "🎣",
      name: "像素釣魚棧橋島",
      subtitle: "防詐快問快答 · 點擊垂釣",
      accent: "#14b8a6",
      angleDeg: 42,
      radius: 61.0,
      scale: 1.0,
      labelY: 6.1,
      build: buildFishingPierIslet
    },
    {
      id: "music-box",
      emoji: "🎵",
      name: "芯片音樂八音盒島",
      subtitle: "8-bit 旋律 · 點擊聆聽",
      accent: "#ec4899",
      angleDeg: 92,
      radius: 63.5,
      scale: 1.0,
      labelY: 6.2,
      build: buildMusicBoxIslet
    },
    {
      id: "greenhouse",
      emoji: "🌱",
      name: "數位綠洲溫室島",
      subtitle: "綠色科技 · 點擊探索",
      accent: "#10b981",
      angleDeg: 142,
      radius: 61.5,
      scale: 1.0,
      labelY: 6.1,
      build: buildGreenhouseIslet
    },
    {
      id: "lighthouse",
      emoji: "🧭",
      name: "迷霧燈塔瞭望島",
      subtitle: "智慧航線羅盤 · 點擊導航",
      accent: "#f59e0b",
      angleDeg: 242,
      radius: 64.0,
      scale: 1.0,
      labelY: 7.5,
      build: buildLighthouseLookoutIslet
    }
  ].forEach(createNpcIslet);

  // 小副島樹木 / 花朵：單一 InstancedMesh（世界座標，小副島靜止不浮動）
  (function buildIsletInstanced() {
    const n = isletTreeSpots.length;
    if (n > 0) {
      const trunks = makeDecorInstanced(decorGeo.trunk, decorMat.trunk, n, npcIsletGroup, true);
      const lo = makeDecorInstanced(decorGeo.crownLo, decorMat.crown, n, npcIsletGroup, true);
      const hi = makeDecorInstanced(decorGeo.crownHi, decorMat.crown, n, npcIsletGroup, true);
      isletTreeSpots.forEach((s, i) => {
        const sc = s.s * 1.1;
        decorTmp.rotation.set(0, i * 1.7, 0);
        decorTmp.scale.setScalar(sc);
        decorTmp.position.set(s.x, s.y + 0.35 * sc, s.z);
        decorTmp.updateMatrix();
        trunks.setMatrixAt(i, decorTmp.matrix);
        decorTmp.position.set(s.x, s.y + 1.0 * sc, s.z);
        decorTmp.updateMatrix();
        lo.setMatrixAt(i, decorTmp.matrix);
        lo.setColorAt(i, decorTreePalette[i % decorTreePalette.length]);
        decorTmp.position.set(s.x, s.y + 1.62 * sc, s.z);
        decorTmp.updateMatrix();
        hi.setMatrixAt(i, decorTmp.matrix);
        hi.setColorAt(i, decorTreePalette[(i + 2) % decorTreePalette.length]);
      });
      [trunks, lo, hi].forEach((m) => {
        m.instanceMatrix.needsUpdate = true;
        if (m.instanceColor) m.instanceColor.needsUpdate = true;
      });
    }
    const fn = isletFlowerSpots.length;
    if (fn > 0) {
      const flowers = makeDecorInstanced(
        new THREE.IcosahedronGeometry(0.1, 0),
        new THREE.MeshLambertMaterial({ color: 0xffffff }),
        fn,
        npcIsletGroup
      );
      const stems = makeDecorInstanced(
        new THREE.CylinderGeometry(0.015, 0.015, 0.2, 3),
        LM(0x3a9d56),
        fn,
        npcIsletGroup
      );
      const col = new THREE.Color();
      isletFlowerSpots.forEach((f, i) => {
        decorTmp.rotation.set(0, 0, 0);
        decorTmp.scale.set(1, 1, 1);
        decorTmp.position.set(f.x, f.y + 0.1, f.z);
        decorTmp.updateMatrix();
        flowers.setMatrixAt(i, decorTmp.matrix);
        flowers.setColorAt(i, col.setHex(f.c));
        decorTmp.position.set(f.x, f.y, f.z);
        decorTmp.updateMatrix();
        stems.setMatrixAt(i, decorTmp.matrix);
      });
      [flowers, stems].forEach((m) => {
        m.instanceMatrix.needsUpdate = true;
        if (m.instanceColor) m.instanceColor.needsUpdate = true;
      });
    }
  })();

  
  

    let expansionLastT = 0;
  function updateWorldExpansion(t) {
    const dt = Math.min(0.1, Math.max(0, t - expansionLastT));
    expansionLastT = t;
    for (let i = 0; i < expansionAnims.length; i++) expansionAnims[i](t, dt);
  }



  // 低多邊形慶祝彩帶粒子群 (Low-poly Celebration Confetti)
  const confettiGroup = new THREE.Group();
  confettiGroup.name = "confettiGroup";
  confettiGroup.visible = false;
  mysteryReefGroup.add(confettiGroup);

  const confettiColors = [0x4fb3ff, 0xff8a65, 0xc58bff, 0x5fd18b, 0xffd166, 0x2ec4b6, 0xff6fb5, 0xffe66d];
  const confettiGeoRibbon = new THREE.BoxGeometry(0.36, 0.04, 0.16);
  const confettiGeoTri = new THREE.TetrahedronGeometry(0.2, 0);
  const confettiItems = [];

  for (let i = 0; i < 96; i++) {
    const cMat = new THREE.MeshStandardMaterial({
      color: confettiColors[i % confettiColors.length],
      emissive: confettiColors[i % confettiColors.length],
      emissiveIntensity: 0.35,
      roughness: 0.35,
      flatShading: true
    });
    const cMesh = new THREE.Mesh(i % 3 === 0 ? confettiGeoTri : confettiGeoRibbon, cMat);
    confettiGroup.add(cMesh);
    confettiItems.push({
      mesh: cMesh,
      vx: 0,
      vy: 0,
      vz: 0,
      rx: (Math.random() - 0.5) * 8,
      ry: (Math.random() - 0.5) * 8,
      rz: (Math.random() - 0.5) * 8,
      age: 0,
      maxLife: 2.8 + Math.random() * 1.8
    });
  }

  function resetConfettiPiece(item, initialDelay = 0) {
    const theta = Math.random() * Math.PI * 2;
    const speed = 2.6 + Math.random() * 4.8;
    item.mesh.position.set(
      Math.cos(theta) * (1.2 + Math.random() * 3.5),
      29.5 + Math.random() * 4.5,
      Math.sin(theta) * (1.2 + Math.random() * 3.5)
    );
    item.vx = Math.cos(theta) * speed;
    item.vy = 1.6 + Math.random() * 3.8;
    item.vz = Math.sin(theta) * speed;
    item.age = -initialDelay;
    item.maxLife = 3.2 + Math.random() * 2.0;
    item.mesh.scale.setScalar(initialDelay > 0 ? 0.001 : 1);
  }

  // 螢幕前景高層級 2D 彩帶畫布控制器 (z-index: 99999，飛舞於全域領航證書彈窗之上)
  let screenConfettiCanvas = null;
  let screenConfettiCtx = null;
  let screenConfettiAnimId = null;
  let screenConfettiParticles = [];

  function triggerScreenConfetti() {
    // 優先使用 canvas-confetti 函式庫（若已由 CDN 載入）
    if (typeof window.confetti === "function") {
      try {
        const baseOpts = {
          zIndex: 99999,
          disableForReducedMotion: false
        };
        // 中央爆發
        window.confetti(Object.assign({}, baseOpts, {
          particleCount: 75,
          spread: 85,
          origin: { x: 0.5, y: 0.55 },
          colors: ["#ffd166", "#ff8a65", "#4fb3ff", "#5fd18b", "#c58bff", "#ff6fb5", "#ffe66d"]
        }));
        // 左下方禮炮
        window.confetti(Object.assign({}, baseOpts, {
          particleCount: 45,
          angle: 60,
          spread: 55,
          origin: { x: 0.1, y: 0.7 }
        }));
        // 右下方禮炮
        window.confetti(Object.assign({}, baseOpts, {
          particleCount: 45,
          angle: 120,
          spread: 55,
          origin: { x: 0.9, y: 0.7 }
        }));
        return;
      } catch (err) {
        console.warn("[Confetti] window.confetti 執行異常，切換至內建 2D 畫布引擎:", err);
      }
    }

    // 內建獨立 2D Canvas Confetti 引擎備援（確保離線或無外部函式庫時 100% 正常施放）
    if (!screenConfettiCanvas) {
      screenConfettiCanvas = document.createElement("canvas");
      screenConfettiCanvas.id = "screenConfettiCanvas";
      screenConfettiCanvas.style.cssText =
        "position:fixed;top:0;left:0;width:100vw;height:100vh;pointer-events:none;z-index:99999;";
      document.body.appendChild(screenConfettiCanvas);
      screenConfettiCtx = screenConfettiCanvas.getContext("2d");
      window.addEventListener("resize", () => {
        if (screenConfettiCanvas) {
          screenConfettiCanvas.width = window.innerWidth;
          screenConfettiCanvas.height = window.innerHeight;
        }
      });
    }

    screenConfettiCanvas.width = window.innerWidth;
    screenConfettiCanvas.height = window.innerHeight;

    const colors = ["#ffd166", "#ff8a65", "#4fb3ff", "#5fd18b", "#c58bff", "#ff6fb5", "#ffe66d", "#06d6a0"];
    const count = 120;
    const w = screenConfettiCanvas.width;
    const h = screenConfettiCanvas.height;

    for (let i = 0; i < count; i++) {
      const isLeft = i % 2 === 0;
      screenConfettiParticles.push({
        x: isLeft ? w * 0.2 + Math.random() * (w * 0.1) : w * 0.8 - Math.random() * (w * 0.1),
        y: h * 0.55 + (Math.random() - 0.5) * 60,
        vx: (isLeft ? 1 : -1) * (4 + Math.random() * 8) + (Math.random() - 0.5) * 6,
        vy: -9 - Math.random() * 9,
        size: 7 + Math.random() * 7,
        tilt: Math.random() * 10,
        tiltAngle: Math.random() * Math.PI,
        tiltAngleSpeed: 0.05 + Math.random() * 0.08,
        color: colors[Math.floor(Math.random() * colors.length)],
        opacity: 1,
        decay: 0.003 + Math.random() * 0.004
      });
    }

    if (!screenConfettiAnimId) {
      let lastTime = performance.now();
      function updateScreenConfetti(now) {
        const dt = Math.min(0.033, (now - lastTime) / 1000 || 0.016);
        lastTime = now;
        screenConfettiCtx.clearRect(0, 0, screenConfettiCanvas.width, screenConfettiCanvas.height);

        for (let i = screenConfettiParticles.length - 1; i >= 0; i--) {
          const p = screenConfettiParticles[i];
          p.x += p.vx * 60 * dt;
          p.y += p.vy * 60 * dt;
          p.vy += 18 * dt;
          p.vx *= 0.985;
          p.tiltAngle += p.tiltAngleSpeed;
          p.tilt = Math.sin(p.tiltAngle) * 12;
          p.opacity -= p.decay;

          if (p.opacity <= 0 || p.y > screenConfettiCanvas.height + 40) {
            screenConfettiParticles.splice(i, 1);
            continue;
          }

          screenConfettiCtx.save();
          screenConfettiCtx.globalAlpha = Math.max(0, p.opacity);
          screenConfettiCtx.fillStyle = p.color;
          screenConfettiCtx.beginPath();
          screenConfettiCtx.translate(p.x, p.y);
          screenConfettiCtx.rotate(p.tiltAngle * 0.3);
          screenConfettiCtx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * (0.6 + Math.abs(p.tilt) / 12));
          screenConfettiCtx.restore();
        }

        if (screenConfettiParticles.length > 0) {
          screenConfettiAnimId = requestAnimationFrame(updateScreenConfetti);
        } else {
          screenConfettiCtx.clearRect(0, 0, screenConfettiCanvas.width, screenConfettiCanvas.height);
          screenConfettiAnimId = null;
        }
      }
      screenConfettiAnimId = requestAnimationFrame(updateScreenConfetti);
    }
  }

  function launchCelebrationConfetti(e) {
    console.log("[Confetti] 再次施放彩帶觸發");

    // 1. 微按鈕縮放回饋（active:scale-95 / 動態 class 回饋）
    const btn = (e && e.currentTarget) || document.querySelector("#certConfettiBtn");
    if (btn) {
      btn.classList.add("confetti-btn-active");
      setTimeout(() => btn.classList.remove("confetti-btn-active"), 220);
    }

    // 2. 音效系統連動觸發
    if (window.AudioManager && typeof window.AudioManager.playSanctuaryFanfare === "function") {
      window.AudioManager.playSanctuaryFanfare();
    }

    // 3. 2D 螢幕前景彩帶（高層級 z-index: 99999，在聖殿證書彈窗上方飛舞）
    triggerScreenConfetti();

    // 4. Three.js 3D 聖殿頂端低多邊形彩帶粒子群重置並持續噴發
    confettiGroup.visible = true;
    const curTime = (typeof clock !== "undefined" && clock) ? clock.getElapsedTime() : performance.now() / 1000;
    sanctuaryState.confettiActiveUntil = curTime + 7.5;
    confettiItems.forEach((item, idx) => {
      resetConfettiPiece(item, (idx % 24) * 0.06);
    });
  }

  // 掛載至全域 window 物件，防範作用域隔離與 HTML onclick 呼叫失效
  window.launchCelebrationConfetti = launchCelebrationConfetti;
  window.launchConfetti = launchCelebrationConfetti;
  window.retriggerConfetti = launchCelebrationConfetti;

  // 環繞礁岩的立體動態迷霧雲團
  const mistGroup = new THREE.Group();
  const mistMat = new THREE.MeshStandardMaterial({
    color: 0xdce8f7,
    transparent: true,
    opacity: 0.56,
    roughness: 1.0,
    flatShading: true,
    depthWrite: false
  });
  const mistClouds = [];
  for (let i = 0; i < 18; i++) {
    const mAngle = (i / 18) * Math.PI * 2;
    const mRadius = (2.8 + (i % 3) * 1.45) * 1.65;
    const mSize = (1.15 + (i % 4) * 0.32) * 1.5;
    const puff = new THREE.Mesh(new THREE.IcosahedronGeometry(mSize, 1), mistMat);
    const my = 2.4 + (i % 3) * 1.6;
    puff.position.set(Math.cos(mAngle) * mRadius, my, Math.sin(mAngle) * mRadius);
    puff.scale.set(1.35, 0.72, 1.15);
    mistGroup.add(puff);
    mistClouds.push({
      mesh: puff,
      angle: mAngle,
      radius: mRadius,
      baseY: my,
      speed: 0.18 + (i % 3) * 0.06,
      phase: i * 0.6
    });
  }
  mysteryReefGroup.add(mistGroup);

  const reefLabel = createLabelSprite("🔒", "迷霧神秘礁岩", "尚未解鎖 · 隱藏海域", "#9aa8c7", true);
  reefLabel.position.set(0, 14.5, 0);
  mysteryReefGroup.add(reefLabel);

  const sanctuaryState = {
    unlocked: false,
    awakeningActive: false,
    awakeningStart: 0,
    awakeningDuration: 2.5,
    mistDispersion: 0,
    confettiActiveUntil: 0,
    pendingAwakeningReplay: false
  };

  /* ============================================================
   * 4. 夜間星空與微閃星光粒子 + 低多邊形飄動白雲 + 拍翅盤旋海鷗
   * ============================================================ */
  function createFireflyTexture() {
    const c = document.createElement("canvas");
    c.width = 64;
    c.height = 64;
    const ctx = c.getContext("2d");
    const grad = ctx.createRadialGradient(32, 32, 1.5, 32, 32, 30);
    grad.addColorStop(0, "rgba(255, 255, 255, 1)");
    grad.addColorStop(0.35, "rgba(255, 244, 180, 0.88)");
    grad.addColorStop(1, "rgba(180, 225, 255, 0)");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 64, 64);
    return new THREE.CanvasTexture(c);
  }

  // 增加粒子密度（540 顆）並將 size 縮小至原本 18 的 1/3（size = 6），支援獨立微閃效果
  const fireflyCount = 540;
  const fireflyGeo = new THREE.BufferGeometry();
  const fireflyPositions = new Float32Array(fireflyCount * 3);
  const fireflyColors = new Float32Array(fireflyCount * 3);
  const fireflyBase = [];

  const starPalette = [
    new THREE.Color(0xfff6cc),
    new THREE.Color(0xd9ff8c),
    new THREE.Color(0xb8e6ff),
    new THREE.Color(0xffdf9e)
  ];

  for (let i = 0; i < fireflyCount; i++) {
    const isHighStar = i >= 220;
    const r = isHighStar ? 10 + Math.random() * 88 : 5 + Math.random() * 44;
    const theta = Math.random() * Math.PI * 2;
    const x = Math.cos(theta) * r;
    const y = isHighStar ? 10 + Math.random() * 28 : 1.4 + Math.random() * 10.5;
    const z = Math.sin(theta) * r;
    fireflyPositions[i * 3] = x;
    fireflyPositions[i * 3 + 1] = y;
    fireflyPositions[i * 3 + 2] = z;

    const baseCol = starPalette[i % starPalette.length];
    fireflyColors[i * 3] = baseCol.r;
    fireflyColors[i * 3 + 1] = baseCol.g;
    fireflyColors[i * 3 + 2] = baseCol.b;

    fireflyBase.push({
      x,
      y,
      z,
      r: baseCol.r,
      g: baseCol.g,
      b: baseCol.b,
      isHighStar,
      phase: Math.random() * Math.PI * 2,
      speed: 0.45 + Math.random() * 0.95,
      twinkleSpeed: 2.2 + Math.random() * 4.2,
      twinklePhase: Math.random() * Math.PI * 2
    });
  }
  fireflyGeo.setAttribute("position", new THREE.BufferAttribute(fireflyPositions, 3));
  fireflyGeo.setAttribute("color", new THREE.BufferAttribute(fireflyColors, 3));

  const fireflyMat = new THREE.PointsMaterial({
    size: 1.35, // 放大 3 倍 (0.45 x 3)，星點清晰明亮
    sizeAttenuation: true,
    map: createFireflyTexture(),
    vertexColors: true,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    blending: THREE.AdditiveBlending
  });

  const fireflyPoints = new THREE.Points(fireflyGeo, fireflyMat);
  fireflyPoints.visible = false;
  scene.add(fireflyPoints);

  // =========================================================================
  // 2.6b 七大主島樹林螢火蟲群 (35 顆暖黃綠色呼吸微粒，夜晚緩慢漂浮)
  // =========================================================================
  const GROVE_FIREFLIES_PER_ISLAND = 5;
  const groveCount = Math.max(1, islandRecords.length) * GROVE_FIREFLIES_PER_ISLAND;
  const grovePositions = new Float32Array(groveCount * 3);
  const groveColors = new Float32Array(groveCount * 3);
  const grovePalette = [
    new THREE.Color(0xc8ff4d),
    new THREE.Color(0xa3e635),
    new THREE.Color(0xeaff7b),
    new THREE.Color(0xfde047)
  ];
  const groveFireflyData = [];
  for (let i = 0; i < islandRecords.length; i++) {
    const rec = islandRecords[i];
    const tc = rec.group && rec.group.userData && rec.group.userData.treeCoords;
    for (let k = 0; k < GROVE_FIREFLIES_PER_ISLAND; k++) {
      let lx, ly, lz;
      if (tc && tc.length > 0) {
        const pt = tc[Math.floor((k * tc.length) / GROVE_FIREFLIES_PER_ISLAND) % tc.length];
        lx = Array.isArray(pt) ? pt[0] : (pt.x || 0);
        lz = Array.isArray(pt) ? (pt.length > 2 ? pt[2] : pt[1]) : (pt.z || 0);
        const rawY = Array.isArray(pt) ? (pt.length > 2 ? pt[1] : 3.2) : (typeof pt.y === "number" ? pt.y : 3.2);
        ly = Math.max(3.85, rawY + 0.95) + ((k * 0.37) % 1.15);
        lx += Math.sin(k * 2.4 + i) * 0.65;
        lz += Math.cos(k * 2.1 + i) * 0.65;
      } else {
        const ang = (k / GROVE_FIREFLIES_PER_ISLAND) * Math.PI * 2 + i * 0.5;
        const rad = 3.2 + (k % 2) * 1.1;
        lx = Math.cos(ang) * rad;
        lz = Math.sin(ang) * rad;
        ly = 4.35 + (k % 3) * 0.45;
      }
      const col = grovePalette[(i * 3 + k) % grovePalette.length];
      const idx = groveFireflyData.length;
      grovePositions[idx * 3] = (rec.group ? rec.group.position.x : 0) + lx;
      grovePositions[idx * 3 + 1] = (rec.group ? rec.group.position.y : 0) + ly;
      grovePositions[idx * 3 + 2] = (rec.group ? rec.group.position.z : 0) + lz;
      groveColors[idx * 3] = col.r;
      groveColors[idx * 3 + 1] = col.g;
      groveColors[idx * 3 + 2] = col.b;
      groveFireflyData.push({
        rec,
        lx,
        ly,
        lz,
        ampX: 0.45 + (k % 3) * 0.16,
        ampY: 0.28 + ((k + i) % 3) * 0.12,
        ampZ: 0.45 + ((k + 1) % 3) * 0.16,
        speed: 0.45 + ((i * 5 + k) % 7) * 0.08,
        blinkSpeed: 1.45 + ((i + k * 2) % 5) * 0.32,
        phase: (i * 1.7 + k * 1.29) % (Math.PI * 2),
        baseR: col.r,
        baseG: col.g,
        baseB: col.b
      });
    }
  }
  const groveGeo = new THREE.BufferGeometry();
  const grovePosAttr = new THREE.BufferAttribute(grovePositions, 3);
  const groveColAttr = new THREE.BufferAttribute(groveColors, 3);
  groveGeo.setAttribute("position", grovePosAttr);
  groveGeo.setAttribute("color", groveColAttr);
  const groveFireflyMat = new THREE.PointsMaterial({
    size: 1.08,
    sizeAttenuation: true,
    map: createFireflyTexture(),
    vertexColors: true,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    fog: false
  });
  const groveFireflyPoints = new THREE.Points(groveGeo, groveFireflyMat);
  groveFireflyPoints.visible = false;
  groveFireflyPoints.userData.skipDimClone = true;
  scene.add(groveFireflyPoints);

  nightGlowUpdaters.push((nb, t) => {
    groveFireflyPoints.visible = nb > 0.01 && groveFireflyData.length > 0;
    groveFireflyMat.opacity = nb * 0.94;
    if (!groveFireflyPoints.visible) return;
    for (let i = 0; i < groveFireflyData.length; i++) {
      const d = groveFireflyData[i];
      const gx = d.rec && d.rec.group ? d.rec.group.position.x : 0;
      const gy = d.rec && d.rec.group ? d.rec.group.position.y : 0;
      const gz = d.rec && d.rec.group ? d.rec.group.position.z : 0;
      grovePositions[i * 3] = gx + d.lx + Math.sin(t * d.speed + d.phase) * d.ampX;
      grovePositions[i * 3 + 1] = gy + d.ly + Math.sin(t * d.speed * 1.35 + d.phase * 1.7) * d.ampY;
      grovePositions[i * 3 + 2] = gz + d.lz + Math.cos(t * d.speed * 0.92 + d.phase * 1.3) * d.ampZ;
      const breath = 0.28 + 0.72 * (0.5 + 0.5 * Math.sin(t * d.blinkSpeed + d.phase * 2.1));
      const dimMul = d.rec && d.rec.dimmed ? 0.35 : 1.0;
      const lum = breath * dimMul;
      groveColors[i * 3] = d.baseR * lum;
      groveColors[i * 3 + 1] = d.baseG * lum;
      groveColors[i * 3 + 2] = d.baseB * lum;
    }
    grovePosAttr.needsUpdate = true;
    groveColAttr.needsUpdate = true;
  });

  // 4b. 5 朵低多邊形緩慢飄動的白雲 (Low-poly Drifting Clouds)
  const skyCloudsGroup = new THREE.Group();
  scene.add(skyCloudsGroup);
  const cloudMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    emissive: 0xd8eeff,
    emissiveIntensity: 0.18,
    roughness: 0.85,
    metalness: 0.02,
    flatShading: true,
    transparent: true,
    opacity: 0.94
  });

  function createLowPolyCloud(scale = 1) {
    const grp = new THREE.Group();
    const puffConfigs = [
      { x: 0, y: 0.35, z: 0, sx: 1.55, sy: 1.05, sz: 1.15, r: 1.45 },
      { x: -1.35, y: 0.08, z: 0.18, sx: 1.25, sy: 0.88, sz: 1.0, r: 1.15 },
      { x: 1.4, y: 0.12, z: -0.15, sx: 1.3, sy: 0.92, sz: 1.05, r: 1.2 },
      { x: -0.55, y: 0.55, z: -0.35, sx: 1.1, sy: 0.85, sz: 0.95, r: 1.0 },
      { x: 0.65, y: 0.48, z: 0.38, sx: 1.15, sy: 0.82, sz: 0.95, r: 1.05 }
    ];
    puffConfigs.forEach((p, idx) => {
      const geo = new THREE.DodecahedronGeometry(p.r, 0);
      const mesh = new THREE.Mesh(geo, cloudMat);
      mesh.position.set(p.x, p.y, p.z);
      mesh.scale.set(p.sx, p.sy, p.sz);
      mesh.rotation.set(idx * 0.4, idx * 0.7, idx * 0.3);
      mesh.castShadow = true;
      mesh.receiveShadow = false;
      grp.add(mesh);
    });
    grp.scale.setScalar(scale);
    return grp;
  }

  const driftingClouds = [];
  const cloudInitSpecs = [
    { x: -38, y: 17.5, z: -28, scale: 1.25, speed: 0.75, phase: 0.2 },
    { x: -12, y: 19.2, z: -36, scale: 1.05, speed: 0.58, phase: 1.6 },
    { x: 24, y: 18.0, z: -22, scale: 1.35, speed: 0.68, phase: 3.1 },
    { x: 36, y: 16.8, z: 18, scale: 1.12, speed: 0.62, phase: 4.4 },
    { x: -28, y: 18.6, z: 26, scale: 1.18, speed: 0.72, phase: 5.5 }
  ];
  cloudInitSpecs.forEach((spec, i) => {
    const cloudMesh = createLowPolyCloud(spec.scale);
    cloudMesh.position.set(spec.x, spec.y, spec.z);
    cloudMesh.rotation.y = (i * 0.55) - 0.3;
    skyCloudsGroup.add(cloudMesh);
    driftingClouds.push({
      mesh: cloudMesh,
      baseY: spec.y,
      baseZ: spec.z,
      speed: spec.speed,
      phase: spec.phase
    });
  });

  // 4c. 空中拍翅盤旋的低多邊形海鷗 (Low-poly Flapping Seagulls)
  const seagullsGroup = new THREE.Group();
  scene.add(seagullsGroup);

  const gullBodyMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.5,
    flatShading: true
  });
  const gullTipMat = new THREE.MeshStandardMaterial({
    color: 0x334155,
    roughness: 0.6,
    flatShading: true
  });
  const gullBeakMat = new THREE.MeshStandardMaterial({
    color: 0xffb703,
    roughness: 0.45,
    flatShading: true
  });

  function createLowPolySeagull(scale = 0.85) {
    const root = new THREE.Group();

    // 流線型低多邊形身體
    const bodyGeo = new THREE.ConeGeometry(0.18, 0.78, 5);
    bodyGeo.rotateX(Math.PI / 2);
    const bodyMesh = new THREE.Mesh(bodyGeo, gullBodyMat);
    root.add(bodyMesh);

    // 頭部與黃色鳥喙
    const headMesh = new THREE.Mesh(new THREE.DodecahedronGeometry(0.14, 0), gullBodyMat);
    headMesh.position.set(0, 0.08, 0.34);
    root.add(headMesh);

    const beakGeo = new THREE.ConeGeometry(0.055, 0.22, 4);
    beakGeo.rotateX(Math.PI / 2);
    const beakMesh = new THREE.Mesh(beakGeo, gullBeakMat);
    beakMesh.position.set(0, 0.06, 0.5);
    root.add(beakMesh);

    // 尾羽
    const tailGeo = new THREE.ConeGeometry(0.16, 0.32, 3);
    tailGeo.rotateX(-Math.PI / 2);
    const tailMesh = new THREE.Mesh(tailGeo, gullTipMat);
    tailMesh.scale.set(1.2, 0.35, 1);
    tailMesh.position.set(0, 0.02, -0.44);
    root.add(tailMesh);

    // 左右拍動雙翼 (內翼白 + 翼尖深灰)
    const leftWingPivot = new THREE.Group();
    leftWingPivot.position.set(-0.1, 0.06, 0.04);
    const leftInner = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.04, 0.26), gullBodyMat);
    leftInner.position.set(-0.28, 0, 0);
    leftWingPivot.add(leftInner);
    const leftOuter = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.035, 0.2), gullTipMat);
    leftOuter.position.set(-0.72, -0.02, -0.03);
    leftOuter.rotation.z = 0.14;
    leftWingPivot.add(leftOuter);
    root.add(leftWingPivot);

    const rightWingPivot = new THREE.Group();
    rightWingPivot.position.set(0.1, 0.06, 0.04);
    const rightInner = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.04, 0.26), gullBodyMat);
    rightInner.position.set(0.28, 0, 0);
    rightWingPivot.add(rightInner);
    const rightOuter = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.035, 0.2), gullTipMat);
    rightOuter.position.set(0.72, -0.02, -0.03);
    rightOuter.rotation.z = -0.14;
    rightWingPivot.add(rightOuter);
    root.add(rightWingPivot);

    root.scale.setScalar(scale);
    return { root, leftWingPivot, rightWingPivot };
  }

  const circlingSeagulls = [];
  const gullSpecs = [
    { cx: 0, cz: 0, rx: 22, rz: 18, baseY: 12.2, orbitSpeed: 0.38, flapSpeed: 9.2, phase: 0.0, scale: 0.92 },
    { cx: -10, cz: -8, rx: 16, rz: 14, baseY: 13.8, orbitSpeed: -0.44, flapSpeed: 10.1, phase: 1.5, scale: 0.82 },
    { cx: 12, cz: 6, rx: 18, rz: 15, baseY: 11.4, orbitSpeed: 0.41, flapSpeed: 9.6, phase: 2.9, scale: 0.86 },
    { cx: -6, cz: 12, rx: 25, rz: 20, baseY: 14.5, orbitSpeed: 0.33, flapSpeed: 8.8, phase: 4.1, scale: 0.9 },
    { cx: 8, cz: -12, rx: 20, rz: 16, baseY: 12.9, orbitSpeed: -0.39, flapSpeed: 9.8, phase: 5.3, scale: 0.8 }
  ];
  gullSpecs.forEach((gs) => {
    const gull = createLowPolySeagull(gs.scale);
    seagullsGroup.add(gull.root);
    circlingSeagulls.push({ ...gs, ...gull });
  });

  /* ============================================================
   * 4d. 海面巡航雙桅小帆船 (Low-poly Two-Masted Sailboats)
   *     木質船身 + 雙桅桿 + 三角白帆，沿環狀海域巡航並隨波左右傾斜 (Roll) 與起伏
   * ============================================================ */
  const sailboatsGroup = new THREE.Group();
  scene.add(sailboatsGroup);

  const boatHullMat = new THREE.MeshStandardMaterial({ color: 0x8d5524, roughness: 0.78, flatShading: true });
  const boatDeckMat = new THREE.MeshStandardMaterial({ color: 0xc68b59, roughness: 0.82, flatShading: true });
  const boatMastMat = new THREE.MeshStandardMaterial({ color: 0x5c3a21, roughness: 0.85, flatShading: true });
  const boatSailMat = new THREE.MeshStandardMaterial({
    color: 0xfffdf7,
    roughness: 0.55,
    side: THREE.DoubleSide,
    flatShading: true
  });

  function createTriangleSailGeometry(width, height, billow = 0.18) {
    const geo = new THREE.BufferGeometry();
    // 三角白帆頂點：桅桿頂 -> 桅桿底 -> 帆角外展（微拱弧度）
    const vertices = new Float32Array([
      0, height, 0,
      0, 0, 0.08,
      0, 0.08, -width,
      // 中腹微鼓風面
      0, height, 0,
      billow, height * 0.38, -width * 0.42,
      0, 0, 0.08,
      0, height, 0,
      0, 0.08, -width,
      billow, height * 0.38, -width * 0.42,
      0, 0, 0.08,
      billow, height * 0.38, -width * 0.42,
      0, 0.08, -width
    ]);
    geo.setAttribute("position", new THREE.BufferAttribute(vertices, 3));
    geo.computeVertexNormals();
    return geo;
  }

  const mainSailGeo = createTriangleSailGeometry(1.18, 1.85, 0.2);
  const foreSailGeo = createTriangleSailGeometry(0.88, 1.42, 0.15);

  function createLowPolySailboat(trimColor = 0xe76f51, scale = 1.0) {
    const root = new THREE.Group();
    const rockPivot = new THREE.Group();
    root.add(rockPivot);

    const trimMat = new THREE.MeshStandardMaterial({ color: trimColor, roughness: 0.5, flatShading: true });

    // 低多邊形木質船身 (拉長六角錐台)
    const hullGeo = new THREE.CylinderGeometry(0.58, 0.36, 0.48, 6);
    const hullMesh = new THREE.Mesh(hullGeo, boatHullMat);
    hullMesh.scale.set(0.95, 1, 2.55);
    hullMesh.position.y = 0.24;
    hullMesh.castShadow = true;
    hullMesh.receiveShadow = true;
    rockPivot.add(hullMesh);

    // 甲板與彩色船舷飾條
    const deckMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.54, 0.52, 0.08, 6), boatDeckMat);
    deckMesh.scale.set(0.9, 1, 2.38);
    deckMesh.position.y = 0.48;
    rockPivot.add(deckMesh);

    const gunwaleMesh = new THREE.Mesh(new THREE.BoxGeometry(0.92, 0.1, 2.2), trimMat);
    gunwaleMesh.position.y = 0.46;
    rockPivot.add(gunwaleMesh);

    // 船尾小舵樓與船首斜桅
    const cabin = new THREE.Mesh(new THREE.BoxGeometry(0.66, 0.28, 0.68), boatHullMat);
    cabin.position.set(0, 0.62, -0.68);
    cabin.castShadow = true;
    rockPivot.add(cabin);

    const bowsprit = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.05, 0.95, 5), boatMastMat);
    bowsprit.rotation.x = Math.PI / 2.6;
    bowsprit.position.set(0, 0.58, 1.42);
    rockPivot.add(bowsprit);

    // 主桅桿 (Main Mast) + 主三角白帆 + 橫桁 + 頂端三角旗
    const mainMast = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.065, 2.25, 6), boatMastMat);
    mainMast.position.set(0, 1.55, -0.12);
    mainMast.castShadow = true;
    rockPivot.add(mainMast);

    const mainBoom = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.04, 1.18, 5), boatMastMat);
    mainBoom.rotation.x = Math.PI / 2;
    mainBoom.position.set(0, 0.72, -0.68);
    rockPivot.add(mainBoom);

    const mainSail = new THREE.Mesh(mainSailGeo, boatSailMat);
    mainSail.position.set(0, 0.68, -0.1);
    mainSail.castShadow = true;
    rockPivot.add(mainSail);

    const pennant = new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.36, 3), trimMat);
    pennant.rotation.x = -Math.PI / 2;
    pennant.position.set(0, 2.65, -0.28);
    rockPivot.add(pennant);

    // 前桅桿 (Fore Mast) + 前三角白帆
    const foreMast = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.055, 1.75, 6), boatMastMat);
    foreMast.position.set(0, 1.32, 0.68);
    foreMast.castShadow = true;
    rockPivot.add(foreMast);

    const foreBoom = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.035, 0.88, 5), boatMastMat);
    foreBoom.rotation.x = Math.PI / 2;
    foreBoom.position.set(0, 0.68, 1.08);
    rockPivot.add(foreBoom);

    const foreSail = new THREE.Mesh(foreSailGeo, boatSailMat);
    foreSail.rotation.y = Math.PI;
    foreSail.position.set(0, 0.65, 0.68);
    foreSail.castShadow = true;
    rockPivot.add(foreSail);

    // 夜間航海燈火：桅杆暖黃頂燈、船身紅綠舷燈、船尾窗光與水面金色反光
    const sailLanternMat = new THREE.MeshStandardMaterial({
      color: 0xffd166,
      emissive: 0xffb703,
      emissiveIntensity: 0.15,
      roughness: 0.3
    });
    registerNightMat(sailLanternMat, { dayEi: 0.15, nightEi: 2.35 });
    const mastLantern = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 8), sailLanternMat);
    mastLantern.position.set(0, 2.86, 0.02);
    rockPivot.add(mastLantern);
    const mastGlow = makeNightGlowSprite(0xffcb5c, 1.45);
    mastGlow.sprite.position.set(0, 2.86, 0.02);
    rockPivot.add(mastGlow.sprite);

    const sternWin = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.14, 0.22), sailLanternMat);
    sternWin.position.set(0, 0.68, -0.78);
    rockPivot.add(sternWin);

    const portMat = new THREE.MeshStandardMaterial({
      color: 0xff4d6d,
      emissive: 0xff3355,
      emissiveIntensity: 0.1,
      roughness: 0.3
    });
    registerNightMat(portMat, { dayEi: 0.1, nightEi: 2.2 });
    const portLight = new THREE.Mesh(new THREE.SphereGeometry(0.068, 8, 8), portMat);
    portLight.position.set(0.6, 0.62, 0.32);
    rockPivot.add(portLight);
    const portGlow = makeNightGlowSprite(0xff4d6d, 0.92);
    portGlow.sprite.position.set(0.6, 0.62, 0.32);
    rockPivot.add(portGlow.sprite);

    const stbdMat = new THREE.MeshStandardMaterial({
      color: 0x2ee6a8,
      emissive: 0x10b981,
      emissiveIntensity: 0.1,
      roughness: 0.3
    });
    registerNightMat(stbdMat, { dayEi: 0.1, nightEi: 2.2 });
    const stbdLight = new THREE.Mesh(new THREE.SphereGeometry(0.068, 8, 8), stbdMat);
    stbdLight.position.set(-0.6, 0.62, 0.32);
    rockPivot.add(stbdLight);
    const stbdGlow = makeNightGlowSprite(0x2ee6a8, 0.92);
    stbdGlow.sprite.position.set(-0.6, 0.62, 0.32);
    rockPivot.add(stbdGlow.sprite);

    const sailWaterGlow = makeGroundGlowPlane(4.8, 6.8, 0xffc65c, 0.13, 2);
    root.add(sailWaterGlow.mesh);

    // 船底水花尾跡圈
    const wakeGeo = new THREE.RingGeometry(0.68, 1.18, 16);
    wakeGeo.rotateX(-Math.PI / 2);
    const wakeMat = foamMat.clone();
    const wakeDayColor = wakeMat.color.clone();
    const wakeNightColor = new THREE.Color(0xbae6fd);
    const wakeRing = new THREE.Mesh(wakeGeo, wakeMat);
    wakeRing.scale.set(0.82, 1, 1.95);
    wakeRing.position.set(0, 0.12, -0.15);
    root.add(wakeRing);

    const glowPhase = Math.random() * Math.PI * 2;
    nightGlowUpdaters.push((nb, t) => {
      const flicker = 0.9 + 0.1 * Math.sin(t * 4.1 + glowPhase);
      mastGlow.sprite.visible = nb > 0.01;
      mastGlow.mat.opacity = nb * 0.68 * flicker;
      portGlow.sprite.visible = nb > 0.01;
      portGlow.mat.opacity = nb * 0.48;
      stbdGlow.sprite.visible = nb > 0.01;
      stbdGlow.mat.opacity = nb * 0.48;
      sailWaterGlow.mesh.visible = nb > 0.01;
      sailWaterGlow.mat.opacity = nb * 0.42 * flicker;
      wakeMat.color.copy(wakeDayColor).lerp(wakeNightColor, nb);
    });

    root.scale.setScalar(scale);
    return { root, rockPivot, wakeRing, wakeMat };
  }

  function buildCircularSeaLoop(radius, numPts = 16, waveWobble = 2.2, clockwise = true) {
    const pts = [];
    for (let i = 0; i < numPts; i++) {
      const ratio = clockwise ? i / numPts : 1 - i / numPts;
      const a = ratio * Math.PI * 2;
      const r = radius + Math.sin(a * 3) * waveWobble;
      pts.push(new THREE.Vector3(Math.cos(a) * r, 0.15, Math.sin(a) * r));
    }
    return new THREE.CatmullRomCurve3(pts, true, "centripetal", 0.5);
  }

  const sailingBoats = [];
  const boatConfigs = [
    // 內環巡航帆船（穿梭於中央聖殿微型地標與 7 島碼頭之間，半徑約 26.5）
    { curve: buildCircularSeaLoop(26.5, 20, 1.8, true), speed: 0.018, startU: 0.08, trim: 0xf4a261, scale: 1.05, phase: 0.3 },
    // 外海巡航帆船 1（環繞 7 座島外圍海域順時針航行，半徑約 64.5）
    { curve: buildCircularSeaLoop(64.5, 28, 2.4, true), speed: 0.012, startU: 0.42, trim: 0xe76f51, scale: 1.15, phase: 1.9 },
    // 外海巡航帆船 2（環繞外圍海域對側航行，半徑約 66.8）
    { curve: buildCircularSeaLoop(66.8, 28, -2.2, false), speed: 0.013, startU: 0.78, trim: 0x2ec4b6, scale: 1.1, phase: 3.7 }
  ];

  boatConfigs.forEach((cfg) => {
    const boat = createLowPolySailboat(cfg.trim, cfg.scale);
    sailboatsGroup.add(boat.root);
    sailingBoats.push({ ...cfg, ...boat });
  });

  /* ============================================================
   * 4e. 大地圖冒險氛圍點綴（海中礁石群、無人微型沙洲+棕櫚樹+寶箱、漂流木桶/漂流木、紅白航路浮標）
   * ============================================================ */
  const seaAdventureGroup = new THREE.Group();
  scene.add(seaAdventureGroup);

  const seaSlateRockMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.85, flatShading: true });
  const seaDarkRockMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.9, flatShading: true });
  const seaReefClusters = [];

  // 1) 4 處海中低多邊形礁石群（深灰石塊 + 淺灘環 + 呼吸小碎浪）
  const reefClusterCoords = [
    { x: -18.5, z: -13.5, scale: 1.05, phase: 0.4 },
    { x: 19.2, z: -11.8, scale: 0.95, phase: 1.7 },
    { x: 14.5, z: 18.2, scale: 1.1, phase: 3.1 },
    { x: -16.8, z: 16.4, scale: 0.92, phase: 4.5 }
  ];

  reefClusterCoords.forEach((rc, idx) => {
    const grp = new THREE.Group();
    grp.position.set(rc.x, 0, rc.z);

    const shGeo = new THREE.RingGeometry(0.9, 2.25, 18);
    shGeo.rotateX(-Math.PI / 2);
    const shMesh = new THREE.Mesh(shGeo, shallowLagoonMat);
    shMesh.position.y = 0.07;
    grp.add(shMesh);

    const surfGeo = new THREE.RingGeometry(1.75, 2.15, 20);
    surfGeo.rotateX(-Math.PI / 2);
    const surfMat = foamMat.clone();
    const surfRing = new THREE.Mesh(surfGeo, surfMat);
    surfRing.position.y = 0.12;
    grp.add(surfRing);

    const rockSpecs = [
      { x: 0, z: 0, r: 0.78, sy: 1.45, mat: seaSlateRockMat },
      { x: -0.68, z: 0.42, r: 0.52, sy: 1.1, mat: seaDarkRockMat },
      { x: 0.62, z: -0.35, r: 0.46, sy: 0.95, mat: seaSlateRockMat },
      { x: 0.18, z: 0.65, r: 0.34, sy: 0.78, mat: seaDarkRockMat }
    ];
    rockSpecs.forEach((rk, rIdx) => {
      const m = new THREE.Mesh(new THREE.DodecahedronGeometry(rk.r, 0), rk.mat);
      m.scale.set(1.05, rk.sy, 0.92);
      m.position.set(rk.x, rk.r * 0.45, rk.z);
      m.rotation.set(rIdx * 0.5, idx + rIdx * 0.9, rIdx * 0.3);
      m.castShadow = true;
      m.receiveShadow = true;
      grp.add(m);
    });

    grp.scale.setScalar(rc.scale);
    seaAdventureGroup.add(grp);
    seaReefClusters.push({ group: grp, surfRing, surfMat, phase: rc.phase });
  });

  // 2) 2 座無人微型沙洲（迷你黃沙小丘 + 單棵小棕櫚樹 + 寶箱；共用幾何體與材質池）
  const sharedPalmTrunkMat = new THREE.MeshStandardMaterial({ color: 0x8d5b3c, roughness: 0.85, flatShading: true });
  const sharedPalmLeafMat = new THREE.MeshStandardMaterial({ color: 0x4cc970, roughness: 0.6, flatShading: true });
  const sharedPalmCocoMat = new THREE.MeshStandardMaterial({ color: 0x5c3a21, roughness: 0.8, flatShading: true });
  const sharedPalmTrunkSegGeos = [0, 1, 2, 3].map(
    (s) => new THREE.CylinderGeometry(0.14 - s * 0.018, 0.17 - s * 0.018, 0.46, 6)
  );
  const sharedPalmCocoGeo = new THREE.DodecahedronGeometry(0.09, 0);
  const sharedPalmFrondGeo = new THREE.ConeGeometry(0.24, 1.05, 4);

  function createLowPolyPalmTree(scale = 1) {
    const palm = new THREE.Group();

    // 微彎四段棕櫚樹幹
    for (let s = 0; s < 4; s++) {
      const seg = new THREE.Mesh(sharedPalmTrunkSegGeos[s], sharedPalmTrunkMat);
      seg.position.set(s * 0.08, 0.22 + s * 0.4, 0);
      seg.rotation.z = -s * 0.09;
      seg.castShadow = true;
      palm.add(seg);
    }

    const crownTop = new THREE.Group();
    crownTop.position.set(0.28, 1.72, 0);
    palm.add(crownTop);

    // 椰子果實
    for (let c = 0; c < 3; c++) {
      const ca = (c / 3) * Math.PI * 2;
      const coco = new THREE.Mesh(sharedPalmCocoGeo, sharedPalmCocoMat);
      coco.position.set(Math.cos(ca) * 0.12, -0.06, Math.sin(ca) * 0.12);
      crownTop.add(coco);
    }

    // 5 片垂弧棕櫚葉
    for (let f = 0; f < 5; f++) {
      const fa = (f / 5) * Math.PI * 2 + 0.2;
      const frondPivot = new THREE.Group();
      frondPivot.rotation.y = fa;
      const frond = new THREE.Mesh(sharedPalmFrondGeo, sharedPalmLeafMat);
      frond.scale.set(0.75, 1, 0.22);
      frond.rotation.z = -Math.PI / 2.5;
      frond.position.set(0.45, -0.05, 0);
      frond.castShadow = true;
      frondPivot.add(frond);
      crownTop.add(frondPivot);
    }

    palm.scale.setScalar(scale);
    return palm;
  }

  function createLowPolyTreasureChest(scale = 1) {
    const chest = new THREE.Group();
    const boxWoodMat = new THREE.MeshStandardMaterial({ color: 0x9c5221, roughness: 0.75, flatShading: true });
    const bandGoldMat = new THREE.MeshStandardMaterial({
      color: 0xffd166,
      emissive: 0xb45309,
      emissiveIntensity: 0.25,
      roughness: 0.35,
      metalness: 0.4,
      flatShading: true
    });

    const base = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.3, 0.38), boxWoodMat);
    base.position.y = 0.15;
    base.castShadow = true;
    chest.add(base);

    const lid = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.19, 0.56, 6), boxWoodMat);
    lid.rotation.z = Math.PI / 2;
    lid.position.y = 0.3;
    lid.castShadow = true;
    chest.add(lid);

    const bandL = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.42, 0.41), bandGoldMat);
    bandL.position.set(-0.18, 0.21, 0);
    chest.add(bandL);

    const bandR = bandL.clone();
    bandR.position.x = 0.18;
    chest.add(bandR);

    const lock = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.14, 0.06), bandGoldMat);
    lock.position.set(0, 0.26, 0.21);
    chest.add(lock);

    chest.scale.setScalar(scale);
    return chest;
  }

  const miniSandbarCoords = [
    { x: -24.5, z: -29.5, rotY: 0.4, scale: 1.05, phase: 0.9 },
    { x: 25.8, z: 27.5, rotY: -0.7, scale: 1.0, phase: 2.6 }
  ];

  miniSandbarCoords.forEach((sb) => {
    const grp = new THREE.Group();
    grp.position.set(sb.x, 0, sb.z);
    grp.rotation.y = sb.rotY;

    const shGeo = new THREE.RingGeometry(1.6, 3.65, 24);
    shGeo.rotateX(-Math.PI / 2);
    const shRing = new THREE.Mesh(shGeo, shallowLagoonMat);
    shRing.position.y = 0.075;
    grp.add(shRing);

    const surfGeo = new THREE.RingGeometry(3.35, 3.78, 24);
    surfGeo.rotateX(-Math.PI / 2);
    const surfMat = foamMat.clone();
    const surfRing = new THREE.Mesh(surfGeo, surfMat);
    surfRing.position.y = 0.11;
    grp.add(surfRing);

    // 迷你黃沙小丘
    const moundGeo = createRoundedCylinderGeometry(1.85, 2.35, 0.85, 0.28, 12);
    const mound = new THREE.Mesh(moundGeo, sandMat);
    mound.position.y = 0.25;
    mound.castShadow = true;
    mound.receiveShadow = true;
    grp.add(mound);

    // 單棵小棕櫚樹
    const palm = createLowPolyPalmTree(0.95);
    palm.position.set(-0.38, 0.62, -0.18);
    grp.add(palm);

    // 冒險寶箱
    const chest = createLowPolyTreasureChest(0.95);
    chest.position.set(0.55, 0.64, 0.32);
    chest.rotation.y = -0.45;
    grp.add(chest);

    grp.scale.setScalar(sb.scale);
    seaAdventureGroup.add(grp);
    seaReefClusters.push({ group: grp, surfRing, surfMat, phase: sb.phase });
  });

  // 3) 數個在海面上隨水波緩慢旋轉漂浮的木桶與漂流木
  const floatingFlotsam = [];
  const barrelIronMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.5, metalness: 0.4, flatShading: true });

  function createFloatingBarrel() {
    const grp = new THREE.Group();
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.58, 8), woodMat);
    body.rotation.z = Math.PI / 2.2;
    body.castShadow = true;
    grp.add(body);

    const hoop1 = new THREE.Mesh(new THREE.CylinderGeometry(0.255, 0.255, 0.05, 8), barrelIronMat);
    hoop1.rotation.z = Math.PI / 2.2;
    hoop1.position.x = -0.15;
    grp.add(hoop1);

    const hoop2 = hoop1.clone();
    hoop2.position.x = 0.15;
    grp.add(hoop2);
    return grp;
  }

  function createFloatingDriftwood() {
    const grp = new THREE.Group();
    const log = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.14, 1.25, 6), postMat);
    log.rotation.z = Math.PI / 2;
    log.castShadow = true;
    grp.add(log);

    const branch = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.07, 0.42, 5), postMat);
    branch.position.set(0.2, 0.12, 0.08);
    branch.rotation.z = -0.6;
    branch.rotation.x = 0.35;
    grp.add(branch);
    return grp;
  }

  const flotsamSpecs = [
    { x: -11.5, z: -18.2, type: "barrel", phase: 0.3, rotSpeed: 0.22 },
    { x: 12.8, z: -17.5, type: "log", phase: 1.4, rotSpeed: -0.18 },
    { x: 21.5, z: 3.2, type: "barrel", phase: 2.1, rotSpeed: 0.25 },
    { x: 9.6, z: 20.4, type: "log", phase: 3.2, rotSpeed: 0.16 },
    { x: -12.4, z: 19.8, type: "barrel", phase: 4.1, rotSpeed: -0.21 },
    { x: -21.8, z: -2.4, type: "log", phase: 5.0, rotSpeed: 0.19 },
    { x: 3.5, z: -22.2, type: "barrel", phase: 5.8, rotSpeed: -0.24 }
  ];

  flotsamSpecs.forEach((fs, idx) => {
    const mesh = fs.type === "barrel" ? createFloatingBarrel() : createFloatingDriftwood();
    mesh.position.set(fs.x, 0.14, fs.z);
    mesh.rotation.y = idx * 1.1;
    seaAdventureGroup.add(mesh);
    floatingFlotsam.push({ mesh, x: fs.x, z: fs.z, phase: fs.phase, rotSpeed: fs.rotSpeed });
  });

  // 4) 2 根紅白相間的航路浮標（頂端帶有呼吸微光的警示點光源）
  const navBuoys = [];
  const buoyRedMat = new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.48, flatShading: true });
  const buoyWhiteMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.48, flatShading: true });

  function createNavigationBuoy() {
    const root = new THREE.Group();
    const tiltPivot = new THREE.Group();
    root.add(tiltPivot);

    // 浮筒底座（紅白相間）
    const baseRed = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.46, 0.32, 10), buoyRedMat);
    baseRed.position.y = 0.16;
    baseRed.castShadow = true;
    tiltPivot.add(baseRed);

    const midWhite = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.52, 0.28, 10), buoyWhiteMat);
    midWhite.position.y = 0.44;
    midWhite.castShadow = true;
    tiltPivot.add(midWhite);

    const topRed = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.38, 0.38, 8), buoyRedMat);
    topRed.position.y = 0.76;
    topRed.castShadow = true;
    tiltPivot.add(topRed);

    const stripeWhite = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.22, 0.32, 8), buoyWhiteMat);
    stripeWhite.position.y = 1.1;
    tiltPivot.add(stripeWhite);

    // 頂端呼吸警示燈罩與點光源（暖黃 / 青綠雙色輪流閃爍）
    const buoyIdx = createNavigationBuoy._seq = (createNavigationBuoy._seq || 0) + 1;
    const isAmberBuoy = buoyIdx % 2 === 1;
    const lampHex = isAmberBuoy ? 0xffd147 : 0x2bf5c5;
    const beaconMat = new THREE.MeshBasicMaterial({
      color: lampHex,
      transparent: true,
      opacity: 0.95
    });
    const beaconBulb = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 10), beaconMat);
    beaconBulb.position.y = 1.38;
    tiltPivot.add(beaconBulb);

    const haloMat = new THREE.MeshBasicMaterial({
      color: lampHex,
      transparent: true,
      opacity: 0.45,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      fog: false
    });
    const haloSphere = new THREE.Mesh(new THREE.SphereGeometry(0.38, 10, 10), haloMat);
    haloSphere.position.y = 1.38;
    tiltPivot.add(haloSphere);

    const waterGlow = makeGroundGlowPlane(4.6, 4.6, lampHex, 0.11, 2);
    root.add(waterGlow.mesh);

    // 底部小水花圈
    const ringGeo = new THREE.RingGeometry(0.52, 0.85, 16);
    ringGeo.rotateX(-Math.PI / 2);
    const ringMat = foamMat.clone();
    const ringMesh = new THREE.Mesh(ringGeo, ringMat);
    ringMesh.position.y = 0.1;
    root.add(ringMesh);

    return { root, tiltPivot, beaconBulb, beaconMat, haloSphere, haloMat, ringMesh, ringMat, waterGlow, isAmberBuoy };
  }

  const buoyCoords = [
    { x: -13.5, z: -8.2, phase: 0.0 },
    { x: 14.2, z: 9.4, phase: Math.PI }
  ];
  buoyCoords.forEach((bc) => {
    const buoy = createNavigationBuoy();
    buoy.root.position.set(bc.x, 0.08, bc.z);
    seaAdventureGroup.add(buoy.root);
    navBuoys.push({ ...bc, ...buoy });
  });

  /* ============================================================
   * 5. 海路軌跡：各島嶼碼頭間平滑曲線 (CatmullRomCurve3) 與白色虛線跳石航線
   * ============================================================ */
  const seaRoutesGroup = new THREE.Group();
  scene.add(seaRoutesGroup);

  const routeDashMaterials = [];
  const steppingStones = [];
  const segmentCurves = []; // 儲存相鄰島嶼碼頭間的 CatmullRomCurve3

  const stoneGeo = new THREE.CylinderGeometry(0.42, 0.55, 0.18, 7);
  const stoneMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    emissive: 0xd8f3ff,
    emissiveIntensity: 0.25,
    roughness: 0.5,
    flatShading: true,
    transparent: true,
    opacity: 0.82
  });

  const stoneRingGeo = new THREE.RingGeometry(0.48, 0.68, 14);
  stoneRingGeo.rotateX(-Math.PI / 2);
  const stoneRingMat = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.38,
    side: THREE.DoubleSide
  });

  const numIslands = islandRecords.length;
  for (let i = 0; i < numIslands; i++) {
    const curr = islandRecords[i];
    const next = islandRecords[(i + 1) % numIslands];

    let a1 = curr.angle;
    let a2 = next.angle;
    if (a2 < a1) a2 += Math.PI * 2;
    const midA1 = a1 + (a2 - a1) * 0.33;
    const midA2 = a1 + (a2 - a1) * 0.67;
    const seaLaneRadius = ringRadius - 17.5; // 與碼頭外海點 (34.0) 平滑銜接並避開神殿環湖淺灘 (24.0)

    const pStart = curr.dockPos.clone();
    const pWater1 = curr.dockWaterPos.clone();
    const pMid1 = new THREE.Vector3(Math.cos(midA1) * seaLaneRadius, 0.24, Math.sin(midA1) * seaLaneRadius);
    const pMid2 = new THREE.Vector3(Math.cos(midA2) * seaLaneRadius, 0.24, Math.sin(midA2) * seaLaneRadius);
    const pWater2 = next.dockWaterPos.clone();
    const pEnd = next.dockPos.clone();

    // 碼頭到碼頭完整曲線
    const fullCurve = new THREE.CatmullRomCurve3([pStart, pWater1, pMid1, pMid2, pWater2, pEnd]);
    // 水面航線區段曲線（供繪製白色虛線與跳石）
    const waterCurve = new THREE.CatmullRomCurve3([pWater1, pMid1, pMid2, pWater2]);
    segmentCurves.push({ from: i, to: (i + 1) % numIslands, fullCurve, waterCurve, pMid1, pMid2 });

    // 水面淡淡的白色虛線航線
    const curvePts = waterCurve.getPoints(44);
    const lineGeo = new THREE.BufferGeometry().setFromPoints(curvePts);
    const lineMat = new THREE.LineDashedMaterial({
      color: 0xffffff,
      dashSize: 0.75,
      gapSize: 0.55,
      transparent: true,
      opacity: 0.52
    });
    const dashedLine = new THREE.Line(lineGeo, lineMat);
    dashedLine.computeLineDistances();
    dashedLine.position.y = 0.04;
    seaRoutesGroup.add(dashedLine);
    routeDashMaterials.push(lineMat);

    // 沿著曲線配置可愛的白色跳石 (Stepping Stones)
    const stoneCount = 7;
    for (let s = 1; s < stoneCount; s++) {
      const u = s / stoneCount;
      const pt = waterCurve.getPointAt(u);
      const stoneHolder = new THREE.Group();
      stoneHolder.position.set(pt.x, 0.22, pt.z);

      const stoneMesh = new THREE.Mesh(stoneGeo, stoneMat);
      stoneMesh.rotation.y = (i * 1.7 + s * 0.9);
      stoneMesh.scale.set(0.85 + (s % 2) * 0.2, 1, 0.85 + ((s + 1) % 2) * 0.18);
      stoneMesh.castShadow = false;
      stoneMesh.receiveShadow = true;
      stoneHolder.add(stoneMesh);

      const sRing = new THREE.Mesh(stoneRingGeo, stoneRingMat);
      sRing.position.y = -0.04;
      stoneHolder.add(sRing);

      seaRoutesGroup.add(stoneHolder);
      steppingStones.push({
        group: stoneHolder,
        ring: sRing,
        baseY: 0.22,
        phase: i * 1.3 + s * 0.65
      });
    }
  }

  /* ============================================================
   * 7 座動森風輕巧吊橋 (Suspension Bridges) 與 7 位跨島漫步 NPC
   * ============================================================ */
  const bridgeNPCs = [];
  const bridgesGroup = new THREE.Group();
  bridgesGroup.name = "suspensionBridges";
  scene.add(bridgesGroup);

  const BRIDGE_NPC_SPECS = [
    { name: "小熊 貝貝", species: "bear", furMat: npcFurCaramelMat, clothMat: npcClothYellowMat, speed: 0.17, phase: 0.0 },
    { name: "貓咪 咪露", species: "cat", furMat: npcFurCreamMat, clothMat: npcClothTealMat, speed: 0.21, phase: 1.1 },
    { name: "小兔 糖糖", species: "bunny", furMat: npcFurBunnyMat, clothMat: npcClothMintMat, speed: 0.19, phase: 2.3 },
    { name: "青蛙 豆豆", species: "frog", furMat: npcFrogGreenMat, clothMat: npcClothRaincoatMat, speed: 0.23, phase: 3.5 },
    { name: "小柴 旺仔", species: "shiba", furMat: npcShibaTanMat, clothMat: npcClothRedMat, speed: 0.20, phase: 4.6 },
    { name: "企鵝 波波", species: "penguin", furMat: npcPenguinNavyMat, clothMat: npcClothBlueMat, speed: 0.18, phase: 5.7 },
    { name: "小鹿 奇奇", species: "deer", furMat: npcDeerBrownMat, clothMat: npcClothBeigeMat, speed: 0.20, phase: 6.8 }
  ];

  function createBridgeWalkingNPC(spec) {
    const root = new THREE.Group();
    const bodyPivot = new THREE.Group();
    root.add(bodyPivot);

    // 身體 (動森圓潤小偶)
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.32, 0.52, 8), spec.clothMat);
    body.position.y = 0.32;
    body.castShadow = true;
    bodyPivot.add(body);

    const tummy = new THREE.Mesh(new THREE.SphereGeometry(0.18, 8, 6), npcWhiteBellyMat);
    tummy.position.set(0, 0.32, 0.14);
    bodyPivot.add(tummy);

    // 頭部
    const head = new THREE.Group();
    head.position.y = 0.72;
    bodyPivot.add(head);

    const headSphere = new THREE.Mesh(new THREE.SphereGeometry(0.32, 10, 8), spec.furMat);
    headSphere.castShadow = true;
    head.add(headSphere);

    // 眼睛與可愛腮紅
    [-0.12, 0.12].forEach((ex) => {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.042, 6, 6), npcEyeBlackMat);
      eye.position.set(ex, 0.05, 0.29);
      head.add(eye);

      const gleam = new THREE.Mesh(new THREE.SphereGeometry(0.015, 4, 4), whiteMarbleMat);
      gleam.position.set(ex + 0.015, 0.07, 0.32);
      head.add(gleam);

      const cheek = new THREE.Mesh(new THREE.SphereGeometry(0.055, 6, 5), npcCheekPinkMat);
      cheek.position.set(ex * 1.35, -0.06, 0.26);
      cheek.scale.set(1.2, 0.6, 0.8);
      head.add(cheek);
    });

    // 依動物種類建立專屬特徵
    if (spec.species === "bear") {
      [-0.24, 0.24].forEach((ex) => {
        const ear = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 6), spec.furMat);
        ear.position.set(ex, 0.28, 0);
        head.add(ear);
        const inner = new THREE.Mesh(new THREE.SphereGeometry(0.07, 6, 5), npcClothYellowMat);
        inner.position.set(ex * 0.95, 0.28, 0.04);
        head.add(inner);
      });
      const snout = new THREE.Mesh(new THREE.SphereGeometry(0.12, 6, 6), npcWhiteBellyMat);
      snout.position.set(0, -0.02, 0.28);
      head.add(snout);
      const nose = new THREE.Mesh(new THREE.SphereGeometry(0.04, 6, 6), npcEyeBlackMat);
      nose.position.set(0, 0.04, 0.38);
      head.add(nose);
    } else if (spec.species === "cat") {
      [-0.2, 0.2].forEach((ex, ei) => {
        const ear = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.24, 4), ei === 0 ? npcFurCaramelMat : spec.furMat);
        ear.position.set(ex, 0.35, 0);
        ear.rotation.z = -ex * 0.6;
        head.add(ear);
      });
      const nose = new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.04, 3), npcCheekPinkMat);
      nose.position.set(0, -0.02, 0.32);
      nose.rotation.x = Math.PI;
      head.add(nose);
    } else if (spec.species === "bunny") {
      [-0.14, 0.14].forEach((ex) => {
        const ear = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.09, 0.48, 6), spec.furMat);
        ear.position.set(ex, 0.48, -0.02);
        ear.rotation.z = -ex * 0.3;
        head.add(ear);
        const inner = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.05, 0.4, 6), npcCheekPinkMat);
        inner.position.set(ex * 0.95, 0.48, 0.02);
        head.add(inner);
      });
    } else if (spec.species === "frog") {
      [-0.18, 0.18].forEach((ex) => {
        const eyeDome = new THREE.Mesh(new THREE.SphereGeometry(0.14, 8, 6), spec.furMat);
        eyeDome.position.set(ex, 0.26, 0.08);
        head.add(eyeDome);
      });
    } else if (spec.species === "shiba") {
      [-0.2, 0.2].forEach((ex) => {
        const ear = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.22, 4), spec.furMat);
        ear.position.set(ex, 0.34, 0);
        ear.rotation.z = -ex * 0.7;
        head.add(ear);
        const brow = new THREE.Mesh(new THREE.SphereGeometry(0.04, 5, 4), npcWhiteBellyMat);
        brow.position.set(ex * 0.7, 0.14, 0.27);
        head.add(brow);
      });
    } else if (spec.species === "penguin") {
      const beanie = new THREE.Mesh(new THREE.ConeGeometry(0.34, 0.32, 8), spec.clothMat);
      beanie.position.set(0, 0.35, 0);
      head.add(beanie);
      const pompom = new THREE.Mesh(new THREE.SphereGeometry(0.1, 6, 6), whiteMarbleMat);
      pompom.position.set(0, 0.54, 0);
      head.add(pompom);
      const beak = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.16, 4), npcBeakOrangeMat);
      beak.position.set(0, -0.02, 0.36);
      beak.rotation.x = Math.PI / 2;
      head.add(beak);
    } else if (spec.species === "deer") {
      [-0.18, 0.18].forEach((ex) => {
        const antler = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.04, 0.28, 5), woodDarkMat);
        antler.position.set(ex, 0.38, 0);
        antler.rotation.z = -ex * 0.6;
        head.add(antler);
      });
    }

    // 擺動雙手與腳
    const armL = new THREE.Group();
    armL.position.set(-0.32, 0.42, 0);
    bodyPivot.add(armL);
    const armMeshL = new THREE.Mesh(new THREE.SphereGeometry(0.09, 6, 5), spec.furMat);
    armMeshL.scale.set(0.9, 1.4, 0.9);
    armMeshL.position.y = -0.1;
    armL.add(armMeshL);

    const armR = new THREE.Group();
    armR.position.set(0.32, 0.42, 0);
    bodyPivot.add(armR);
    const armMeshR = new THREE.Mesh(new THREE.SphereGeometry(0.09, 6, 5), spec.furMat);
    armMeshR.scale.set(0.9, 1.4, 0.9);
    armMeshR.position.y = -0.1;
    armR.add(armMeshR);

    // 小腳丫 (origin y=0 對齊腳底最底部)
    [-0.13, 0.13].forEach((fx) => {
      const foot = new THREE.Mesh(new THREE.SphereGeometry(0.09, 6, 5), spec.species === "penguin" ? npcBeakOrangeMat : spec.furMat);
      foot.position.set(fx, 0.055, 0.03);
      foot.scale.set(1.0, 0.6, 1.3);
      bodyPivot.add(foot);
    });

    root.scale.setScalar(0.92);
    return { root, bodyPivot, head, armL, armR };
  }

  function buildSuspensionBridges() {
    const numIslands = 7;
    const bridgeLampGroundPositions = [];
    // 共用吊橋結構與風燈幾何體池（7 座橋共用，大幅減少 GPU 記憶體與 Draw Call）
    const sharedBridgePostGeo = new THREE.CylinderGeometry(0.16, 0.19, 2.55, 8);
    const sharedBridgePostCapGeo = new THREE.SphereGeometry(0.18, 8, 6);
    const sharedBridgeLampBaseGeo = new THREE.CylinderGeometry(0.15, 0.17, 0.06, 8);
    const sharedBridgeLampCoreGeo = new THREE.SphereGeometry(0.17, 10, 8);
    const sharedBridgeLampHaloGeo = new THREE.SphereGeometry(0.46, 10, 8);
    const sharedBridgeLampBarGeo = new THREE.CylinderGeometry(0.012, 0.012, 0.3, 4);
    const sharedBridgeLampCapGeo = new THREE.ConeGeometry(0.24, 0.17, 8);
    const sharedBridgeLampKnobGeo = new THREE.SphereGeometry(0.04, 6, 5);
    const sharedBridgeCrossBeamGeo = new THREE.CylinderGeometry(0.11, 0.11, 3.0, 6);
    const sharedBridgePlankGeo = new THREE.BoxGeometry(2.64, 0.07, 0.50);

    for (let i = 0; i < numIslands; i++) {
      const nextIdx = (i + 1) % numIslands;
      const angleA = (i / 7) * Math.PI * 2 - Math.PI / 2;
      const angleB = (nextIdx / 7) * Math.PI * 2 - Math.PI / 2;

      const cA = new THREE.Vector3(Math.cos(angleA) * ringRadius, 0, Math.sin(angleA) * ringRadius);
      const cB = new THREE.Vector3(Math.cos(angleB) * ringRadius, 0, Math.sin(angleB) * ringRadius);

      const spanVec = new THREE.Vector3().subVectors(cB, cA);
      const spanDir = spanVec.clone().normalize();
      // 橋面寬度法向量 (橫向)
      const normalW = new THREE.Vector3(-spanDir.z, 0, spanDir.x).normalize();

      // 兩端錨點精準貼合島嶼草地邊緣 (r = 9.8，穩固立於岸邊 turf，非浮於海面)
      const pA = cA.clone().addScaledVector(spanDir, 9.8);
      pA.y = 2.85;
      const pB = cB.clone().addScaledVector(spanDir, -9.8);
      pB.y = 2.85;

      const bridgeSpan = pA.distanceTo(pB);
      const bridgeYaw = Math.atan2(spanDir.x, spanDir.z);

      const bridgeHolder = new THREE.Group();
      bridgesGroup.add(bridgeHolder);

      // 1. 兩端島岸圓潤原木橋柱 + 頂端點綴微光小風燈（橫向內縮對齊 2.64 踏板最外緣 ±1.44）
      [pA, pB].forEach((anchorPt) => {
        [-1.44, 1.44].forEach((wx) => {
          const postPos = anchorPt.clone().addScaledVector(normalW, wx);
          bridgeLampGroundPositions.push(postPos.clone());
          const post = new THREE.Mesh(sharedBridgePostGeo, woodLogMat);
          post.position.set(postPos.x, postPos.y + 0.56, postPos.z);
          post.castShadow = true;
          bridgeHolder.add(post);

          const postCap = new THREE.Mesh(sharedBridgePostCapGeo, woodLogMat);
          postCap.position.set(postPos.x, postPos.y + 1.85, postPos.z);
          bridgeHolder.add(postCap);

          // 立體小風燈：黑色金屬底座/燈帽 + 高自發光暖黃燈芯 + 微光光暈球體（取代 PointLight）
          const lampBase = new THREE.Mesh(sharedBridgeLampBaseGeo, bridgeLampCapMat);
          lampBase.position.set(postPos.x, postPos.y + 2.06, postPos.z);
          bridgeHolder.add(lampBase);
          const lampCore = new THREE.Mesh(sharedBridgeLampCoreGeo, bridgeLampCoreMat);
          lampCore.position.set(postPos.x, postPos.y + 2.22, postPos.z);
          bridgeHolder.add(lampCore);
          const lampHalo = new THREE.Mesh(sharedBridgeLampHaloGeo, bridgeLampHaloMat);
          lampHalo.position.set(postPos.x, postPos.y + 2.22, postPos.z);
          bridgeHolder.add(lampHalo);
          [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sz]) => {
            const bar = new THREE.Mesh(sharedBridgeLampBarGeo, bridgeLampCapMat);
            bar.position.set(postPos.x + sx * 0.13, postPos.y + 2.22, postPos.z + sz * 0.13);
            bridgeHolder.add(bar);
          });
          const lampCap = new THREE.Mesh(sharedBridgeLampCapGeo, bridgeLampCapMat);
          lampCap.position.set(postPos.x, postPos.y + 2.44, postPos.z);
          bridgeHolder.add(lampCap);
          const lampKnob = new THREE.Mesh(sharedBridgeLampKnobGeo, bridgeLampCapMat);
          lampKnob.position.set(postPos.x, postPos.y + 2.55, postPos.z);
          bridgeHolder.add(lampKnob);
        });

        // 橋端橫向原木門檻樑（沿橋面法向量水平橫跨左右雙柱）
        const crossBeam = new THREE.Mesh(sharedBridgeCrossBeamGeo, woodLogMat);
        crossBeam.position.set(anchorPt.x, anchorPt.y + 0.05, anchorPt.z);
        crossBeam.rotation.order = "YXZ";
        crossBeam.rotation.y = bridgeYaw;
        crossBeam.rotation.z = Math.PI / 2;
        bridgeHolder.add(crossBeam);
      });

      // 2. 麻繩索道纜線 (Catenary Curves: 上層扶手索與下層橋座索，同步內縮貼合 2.64 踏板邊緣 ±1.32)
      const numPts = 24;
      const topCablePtsL = [];
      const topCablePtsR = [];
      const botCablePtsL = [];
      const botCablePtsR = [];

      for (let k = 0; k <= numPts; k++) {
        const u = k / numPts;
        const curPt = new THREE.Vector3().lerpVectors(pA, pB, u);
        const sag = 4 * u * (1 - u);

        // 扶手纜線 (垂弧 sag * 1.15，基準高度 y = 4.15)
        const yTop = 4.15 - sag * 1.15;
        // 橋面支撐纜線 (垂弧 sag * 0.72，基準高度 y = 2.85)
        const yBot = 2.85 - sag * 0.72;

        topCablePtsL.push(curPt.clone().addScaledVector(normalW, -1.32).setComponent(1, yTop));
        topCablePtsR.push(curPt.clone().addScaledVector(normalW, 1.32).setComponent(1, yTop));
        botCablePtsL.push(curPt.clone().addScaledVector(normalW, -1.24).setComponent(1, yBot));
        botCablePtsR.push(curPt.clone().addScaledVector(normalW, 1.24).setComponent(1, yBot));
      }

      // 生成左右麻繩纜管
      [topCablePtsL, topCablePtsR].forEach((pts) => {
        const curve = new THREE.CatmullRomCurve3(pts);
        const tube = new THREE.Mesh(new THREE.TubeGeometry(curve, 32, 0.038, 6, false), ropeCableMat);
        bridgeHolder.add(tube);
      });
      [botCablePtsL, botCablePtsR].forEach((pts) => {
        const curve = new THREE.CatmullRomCurve3(pts);
        const tube = new THREE.Mesh(new THREE.TubeGeometry(curve, 32, 0.030, 6, false), ropeCableMat);
        bridgeHolder.add(tube);
      });

      // 垂直懸索 (Connecting Handrails to Deck，對齊縮減後橋緣 ±1.28)
      const dropperCount = 14;
      for (let d = 1; d < dropperCount; d++) {
        const u = d / dropperCount;
        const pt = new THREE.Vector3().lerpVectors(pA, pB, u);
        const sag = 4 * u * (1 - u);
        const yTop = 4.15 - sag * 1.15;
        const yBot = 2.85 - sag * 0.72;
        const h = Math.max(0.1, yTop - yBot);

        [-1.28, 1.28].forEach((wx) => {
          const dropPt = pt.clone().addScaledVector(normalW, wx);
          const dropMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, h, 4), ropeThinMat);
          dropMesh.position.set(dropPt.x, yBot + h / 2, dropPt.z);
          bridgeHolder.add(dropMesh);
        });
      }

      // 3. 輕薄淺木色踏板（橫向寬度 2.64 = 原 5.28 的 50%，沿橋樑切線前後厚度 0.50，留有自然間隙）
      const plankCount = 28;
      for (let p = 0; p < plankCount; p++) {
        const u = (p + 0.5) / plankCount;
        const pt = new THREE.Vector3().lerpVectors(pA, pB, u);
        const sag = 4 * u * (1 - u);
        const y = 2.85 - sag * 0.72;

        const plank = new THREE.Mesh(sharedBridgePlankGeo, woodPlankMat);
        plank.position.set(pt.x, y, pt.z);
        plank.rotation.order = "YXZ";
        plank.rotation.y = bridgeYaw;
        // 沿弧線切線輕微俯仰傾斜（pitch 繞橫向 X 軸）
        const slope = -4 * 0.72 * (1 - 2 * u) / bridgeSpan;
        plank.rotation.x = slope;
        // 微小自然手作左右晃動
        plank.rotation.z = Math.sin(p * 1.7) * 0.015;
        plank.castShadow = true;
        plank.receiveShadow = true;
        bridgeHolder.add(plank);
      }

      // 4. 配置 1 位可愛跨島漫步 NPC
      const spec = BRIDGE_NPC_SPECS[i % BRIDGE_NPC_SPECS.length];
      const npc = createBridgeWalkingNPC(spec);
      bridgesGroup.add(npc.root);

      bridgeNPCs.push({
        ...npc,
        spec,
        pA,
        pB,
        bridgeYaw,
        curU: 0.12 + (i % 3) * 0.25,
        speed: spec.speed,
        phase: spec.phase
      });
    }

    // 吊橋兩端 28 盞風燈的正下方草地投影暖光斑（單一 InstancedMesh 零掉幀渲染）
    if (bridgeLampGroundPositions.length > 0) {
      const bGroundGeo = new THREE.PlaneGeometry(4.0, 4.0);
      bGroundGeo.rotateX(-Math.PI / 2);
      const bGroundMat = new THREE.MeshBasicMaterial({
        map: radialGlowTex,
        color: 0xffbe3b,
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        fog: false
      });
      const bGroundInst = new THREE.InstancedMesh(bGroundGeo, bGroundMat, bridgeLampGroundPositions.length);
      const bDummy = new THREE.Object3D();
      bridgeLampGroundPositions.forEach((p, idx) => {
        bDummy.position.set(p.x, 3.05, p.z);
        bDummy.updateMatrix();
        bGroundInst.setMatrixAt(idx, bDummy.matrix);
      });
      bGroundInst.instanceMatrix.needsUpdate = true;
      bGroundInst.renderOrder = 2;
      bGroundInst.visible = false;
      bGroundInst.userData.skipDimClone = true;
      bridgesGroup.add(bGroundInst);
      nightGlowUpdaters.push((nb, t) => {
        bGroundInst.visible = nb > 0.01;
        bGroundMat.opacity = nb * (0.58 + 0.05 * Math.sin(t * 2.4));
      });
    }
  }

  function updateBridgeNPCs(t) {
    bridgeNPCs.forEach((item) => {
      const { root, bodyPivot, head, armL, armR, pA, pB, bridgeYaw, spec } = item;
      // 沿曲線在 0.10 ~ 0.90 之間來回平滑漫步 (不穿出橋頭)
      const cycle = t * spec.speed + spec.phase;
      const u = 0.12 + 0.76 * (0.5 + 0.5 * Math.sin(cycle));
      const vel = Math.cos(cycle);
      const targetYaw = vel >= 0 ? bridgeYaw : bridgeYaw + Math.PI;

      // 平滑轉向
      let diff = targetYaw - root.rotation.y;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      root.rotation.y += diff * 0.14;

      // 橋面座標
      const pt = new THREE.Vector3().lerpVectors(pA, pB, u);
      const sag = 4 * u * (1 - u);
      pt.y = 2.85 - sag * 0.72 + 0.04;

      // 動森可愛 waddle 步態動畫 (上下彈跳 + 左右搖晃)
      const stepFreq = t * 8.6 + spec.phase;
      const hop = Math.abs(Math.sin(stepFreq)) * 0.09;
      const roll = Math.sin(stepFreq) * 0.14;

      pt.y += hop;
      root.position.copy(pt);
      bodyPivot.rotation.z = roll;
      armL.rotation.x = Math.sin(stepFreq) * 0.45;
      armR.rotation.x = -Math.sin(stepFreq) * 0.45;
      head.rotation.x = Math.abs(Math.sin(stepFreq)) * 0.06;
      head.rotation.z = -roll * 0.35;
    });
  }

  function updateSanctuaryDetails(t) {
    if (!animRefs.sanctuaryDetails) return;
    const { innerRingGroup, outerRingGroup, coreCrystal, coreInnerDiamond, coreAura, torches } = animRefs.sanctuaryDetails;

    // 頂部神聖光核雙環雙向旋轉
    if (innerRingGroup) {
      innerRingGroup.rotation.x = t * 0.9;
      innerRingGroup.rotation.y = t * 1.2;
    }
    if (outerRingGroup) {
      outerRingGroup.rotation.x = -t * 0.7;
      outerRingGroup.rotation.z = t * 0.85;
    }
    if (coreCrystal) {
      coreCrystal.rotation.y = t * 1.4;
      coreCrystal.rotation.x = t * 0.7;
    }
    if (coreInnerDiamond) {
      coreInnerDiamond.rotation.y = -t * 1.8;
      const pulse = 1.0 + Math.sin(t * 3.2) * 0.12;
      coreInnerDiamond.scale.setScalar(pulse);
    }
    if (coreAura) {
      coreAura.scale.setScalar(1.0 + Math.sin(t * 2.4) * 0.08);
    }

    // 火炬微閃
    if (torches) {
      torches.forEach((tc) => {
        const fl = 1.0 + Math.sin(t * 12.0 + tc.phase) * 0.12;
        tc.flame.scale.set(0.8 * fl, 1.45 * fl, 0.8 * fl);
        tc.beam.material.opacity = 0.22 + Math.sin(t * 8.0 + tc.phase) * 0.08;
      });
    }
  }

  buildSuspensionBridges();

  /* ============================================================
   * 5b. 海空巡遊動態 NPC（信差海鷗、深海跳躍海豚、釣魚小熊微型木筏）
   * ============================================================ */
  // 1) 空中：戴著斜背包的低多邊形【信差海鷗】沿大半徑圓形軌道盤旋巡航
  function createMessengerSeagull() {
    const baseGull = createLowPolySeagull(1.42);
    const root = baseGull.root;

    const strapBrownMat = new THREE.MeshStandardMaterial({ color: 0x6f4518, roughness: 0.75, flatShading: true });
    const pouchMat = new THREE.MeshStandardMaterial({ color: 0x2ec4b6, roughness: 0.55, flatShading: true });
    const capBlueMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.48, flatShading: true });
    const letterWhiteMat = new THREE.MeshStandardMaterial({ color: 0xfffdf7, roughness: 0.4, flatShading: true });
    const sealRedMat = new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.4, flatShading: true });

    // 郵差小圓帽
    const postCap = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.1, 0.08, 8), capBlueMat);
    postCap.position.set(0, 0.21, 0.35);
    root.add(postCap);
    const postVisor = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.025, 0.1), capBlueMat);
    postVisor.position.set(0, 0.18, 0.42);
    root.add(postVisor);

    // 斜背皮帶 (Crossbody Strap)
    const strapRing = new THREE.Mesh(new THREE.TorusGeometry(0.19, 0.026, 6, 14), strapBrownMat);
    strapRing.scale.set(0.95, 1.05, 1.35);
    strapRing.rotation.y = Math.PI / 4;
    strapRing.rotation.x = Math.PI / 3;
    strapRing.position.set(0, 0.01, 0.05);
    root.add(strapRing);

    // 側背郵差斜背包與露出來的信件
    const bagGroup = new THREE.Group();
    bagGroup.position.set(0.19, -0.08, 0.02);
    bagGroup.rotation.z = -0.22;

    const pouch = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.2, 0.24), pouchMat);
    pouch.castShadow = true;
    bagGroup.add(pouch);

    const flap = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.08, 0.25), strapBrownMat);
    flap.position.y = 0.07;
    bagGroup.add(flap);

    const letter = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.14, 0.18), letterWhiteMat);
    letter.position.set(0.02, 0.11, 0);
    letter.rotation.z = -0.18;
    bagGroup.add(letter);

    const waxSeal = new THREE.Mesh(new THREE.SphereGeometry(0.028, 6, 6), sealRedMat);
    waxSeal.position.set(0.04, 0.12, 0);
    bagGroup.add(waxSeal);

    root.add(bagGroup);

    return {
      ...baseGull,
      bagGroup,
      orbitRadius: 24.0,
      baseY: 15.2,
      orbitSpeed: 0.23,
      flapSpeed: 7.8,
      phase: 0.8
    };
  }

  const messengerGull = createMessengerSeagull();
  seagullsGroup.add(messengerGull.root);

  // 2) 海面：外圍深海區 2 隻【跳躍海豚】（拋物線弧度躍出水面 + 激起微小水花粒子後潛入）
  const dolphinsGroup = new THREE.Group();
  dolphinsGroup.name = "dolphinsGroup";
  scene.add(dolphinsGroup);

  const dolphinBlueMat = new THREE.MeshStandardMaterial({
    color: 0x38a3d1,
    roughness: 0.35,
    metalness: 0.1,
    flatShading: true
  });
  const dolphinBellyMat = new THREE.MeshStandardMaterial({
    color: 0xe0f2fe,
    roughness: 0.42,
    flatShading: true
  });
  const splashDropMat = new THREE.MeshBasicMaterial({
    color: 0xe0f7ff,
    transparent: true,
    opacity: 0.9
  });

  function createLowPolyDolphin(scale = 1.15) {
    const holder = new THREE.Group();
    const bodyGroup = new THREE.Group();
    holder.add(bodyGroup);

    // 流線海豚軀幹與腹面
    const midTorso = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.34, 0.95, 8), dolphinBlueMat);
    midTorso.rotation.x = Math.PI / 2;
    midTorso.castShadow = true;
    bodyGroup.add(midTorso);

    const belly = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.27, 0.88, 8), dolphinBellyMat);
    belly.rotation.x = Math.PI / 2;
    belly.position.set(0, -0.08, 0);
    bodyGroup.add(belly);

    const headCone = new THREE.Mesh(new THREE.SphereGeometry(0.3, 8, 8), dolphinBlueMat);
    headCone.scale.set(0.95, 0.9, 1.25);
    headCone.position.set(0, 0.02, 0.48);
    bodyGroup.add(headCone);

    // 瓶鼻吻部
    const Rostrum = new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.38, 6), dolphinBlueMat);
    Rostrum.rotation.x = Math.PI / 2;
    Rostrum.position.set(0, -0.03, 0.88);
    bodyGroup.add(Rostrum);

    // 尾部漸縮段與水平尾鰭
    const tailStock = new THREE.Mesh(new THREE.ConeGeometry(0.28, 0.95, 7), dolphinBlueMat);
    tailStock.rotation.x = -Math.PI / 2;
    tailStock.position.set(0, 0, -0.92);
    bodyGroup.add(tailStock);

    const flukeL = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.48, 4), dolphinBlueMat);
    flukeL.scale.set(1, 1, 0.3);
    flukeL.rotation.z = Math.PI / 2.4;
    flukeL.position.set(-0.2, 0, -1.35);
    bodyGroup.add(flukeL);

    const flukeR = flukeL.clone();
    flukeR.rotation.z = -Math.PI / 2.4;
    flukeR.position.x = 0.2;
    bodyGroup.add(flukeR);

    // 背鰭與左右胸鰭
    const dorsalFin = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.42, 4), dolphinBlueMat);
    dorsalFin.scale.set(0.35, 1, 1);
    dorsalFin.rotation.x = -0.35;
    dorsalFin.position.set(0, 0.38, -0.08);
    bodyGroup.add(dorsalFin);

    [-0.28, 0.28].forEach((fx) => {
      const flipper = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.38, 4), dolphinBlueMat);
      flipper.scale.set(1, 1, 0.32);
      flipper.rotation.z = fx < 0 ? Math.PI / 1.65 : -Math.PI / 1.65;
      flipper.position.set(fx, -0.14, 0.25);
      bodyGroup.add(flipper);
    });

    bodyGroup.scale.setScalar(scale);

    // 水花粒子群 (18 顆微小水滴 + 躍出/潛入水紋圈)
    const splashGroup = new THREE.Group();
    holder.add(splashGroup);
    const droplets = [];
    const dropGeo = new THREE.OctahedronGeometry(0.1, 0);
    for (let i = 0; i < 18; i++) {
      const dMesh = new THREE.Mesh(dropGeo, splashDropMat);
      dMesh.visible = false;
      splashGroup.add(dMesh);
      droplets.push({
        mesh: dMesh,
        vx: 0,
        vy: 0,
        vz: 0,
        age: 99,
        maxLife: 0.65
      });
    }

    const splashRingGeo = new THREE.RingGeometry(0.35, 0.72, 16);
    splashRingGeo.rotateX(-Math.PI / 2);
    const splashRingMat = foamMat.clone();
    splashRingMat.opacity = 0;
    const splashRing = new THREE.Mesh(splashRingGeo, splashRingMat);
    splashRing.position.y = 0.14;
    splashGroup.add(splashRing);

    return { holder, bodyGroup, splashGroup, droplets, splashRing, splashRingMat };
  }

  function burstDolphinSplash(dolphin, worldX, worldZ) {
    dolphin.splashRing.position.set(worldX, 0.14, worldZ);
    dolphin.splashRingAge = 0;
    dolphin.droplets.forEach((d, idx) => {
      const ang = (idx / dolphin.droplets.length) * Math.PI * 2 + (Math.random() - 0.5) * 0.35;
      const spd = 1.2 + Math.random() * 2.2;
      d.mesh.visible = true;
      d.mesh.position.set(worldX + Math.cos(ang) * 0.25, 0.2, worldZ + Math.sin(ang) * 0.25);
      d.vx = Math.cos(ang) * spd;
      d.vy = 2.4 + Math.random() * 2.2;
      d.vz = Math.sin(ang) * spd;
      d.age = 0;
      d.maxLife = 0.55 + Math.random() * 0.25;
      d.mesh.scale.setScalar(1);
    });
  }

  const jumpingDolphins = [
    {
      ...createLowPolyDolphin(1.18),
      centerX: -43.5,
      centerZ: 8.5,
      dirX: 0.32,
      dirZ: 0.95,
      jumpLength: 7.4,
      jumpHeight: 3.8,
      cyclePeriod: 3.6,
      jumpDuration: 1.55,
      phaseOffset: 0.2,
      emergedTriggered: false,
      divedTriggered: false,
      splashRingAge: 99
    },
    {
      ...createLowPolyDolphin(1.15),
      centerX: 43.8,
      centerZ: -6.5,
      dirX: -0.28,
      dirZ: 0.96,
      jumpLength: 7.2,
      jumpHeight: 3.6,
      cyclePeriod: 3.6,
      jumpDuration: 1.55,
      phaseOffset: 2.0,
      emergedTriggered: false,
      divedTriggered: false,
      splashRingAge: 99
    }
  ];
  jumpingDolphins.forEach((d) => {
    dolphinsGroup.add(d.holder);
  });

  // 3) 海陸交通：載著【釣魚小熊】的微型木筏，緩慢在鄰近兩座島嶼碼頭之間穿梭航行
  function createFishingBearRaft() {
    const root = new THREE.Group();
    const rockPivot = new THREE.Group();
    root.add(rockPivot);

    const logMat = new THREE.MeshStandardMaterial({ color: 0x8d5b3c, roughness: 0.82, flatShading: true });
    const tieMat = new THREE.MeshStandardMaterial({ color: 0xd4a373, roughness: 0.78, flatShading: true });
    const bearBrownMat = new THREE.MeshStandardMaterial({ color: 0x7f4f24, roughness: 0.6, flatShading: true });
    const bearCreamMat = new THREE.MeshStandardMaterial({ color: 0xf3d5b5, roughness: 0.55, flatShading: true });
    const hatStrawMat = new THREE.MeshStandardMaterial({ color: 0xe9c46a, roughness: 0.7, flatShading: true });
    const bucketBlueMat = new THREE.MeshStandardMaterial({ color: 0x38bdf8, roughness: 0.45, flatShading: true });
    const darkEye = new THREE.MeshBasicMaterial({ color: 0x111827 });

    // 6 根圓木拼裝之微型木筏
    for (let i = -2.5; i <= 2.5; i += 1) {
      const log = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 2.15, 7), logMat);
      log.rotation.x = Math.PI / 2;
      log.position.set(i * 0.25, 0.14, 0);
      log.castShadow = true;
      log.receiveShadow = true;
      rockPivot.add(log);
    }

    // 橫向綁木條
    [-0.68, 0.68].forEach((cz) => {
      const crossBeam = new THREE.Mesh(new THREE.BoxGeometry(1.58, 0.08, 0.14), tieMat);
      crossBeam.position.set(0, 0.26, cz);
      rockPivot.add(crossBeam);
    });

    // 小木凳與裝魚水桶
    const stool = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.22, 0.42), tieMat);
    stool.position.set(0, 0.36, -0.18);
    rockPivot.add(stool);

    const fishBucket = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.13, 0.26, 8), bucketBlueMat);
    fishBucket.position.set(-0.42, 0.38, 0.32);
    rockPivot.add(fishBucket);

    // 【釣魚小熊】本體
    const bearGroup = new THREE.Group();
    bearGroup.position.set(0, 0.44, -0.14);
    rockPivot.add(bearGroup);

    const bearTorso = new THREE.Mesh(new THREE.SphereGeometry(0.3, 10, 10), bearBrownMat);
    bearTorso.scale.set(1.02, 1.08, 0.95);
    bearTorso.position.y = 0.24;
    bearTorso.castShadow = true;
    bearGroup.add(bearTorso);

    const bearBelly = new THREE.Mesh(new THREE.SphereGeometry(0.21, 8, 8), bearCreamMat);
    bearBelly.scale.set(0.9, 0.95, 0.45);
    bearBelly.position.set(0, 0.23, 0.21);
    bearGroup.add(bearBelly);

    const bearHead = new THREE.Group();
    bearHead.position.set(0, 0.64, 0.02);
    bearGroup.add(bearHead);

    const headSphere = new THREE.Mesh(new THREE.SphereGeometry(0.27, 10, 10), bearBrownMat);
    headSphere.castShadow = true;
    bearHead.add(headSphere);

    [-0.2, 0.2].forEach((ex) => {
      const ear = new THREE.Mesh(new THREE.SphereGeometry(0.095, 8, 8), bearBrownMat);
      ear.position.set(ex, 0.21, -0.02);
      bearHead.add(ear);
    });

    const snout = new THREE.Mesh(new THREE.SphereGeometry(0.11, 8, 8), bearCreamMat);
    snout.scale.set(1.1, 0.85, 0.95);
    snout.position.set(0, -0.04, 0.24);
    bearHead.add(snout);

    const nose = new THREE.Mesh(new THREE.SphereGeometry(0.04, 6, 6), darkEye);
    nose.position.set(0, -0.01, 0.33);
    bearHead.add(nose);

    [-0.1, 0.1].forEach((ex) => {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.036, 6, 6), darkEye);
      eye.position.set(ex, 0.04, 0.25);
      bearHead.add(eye);
    });

    // 小熊草帽
    const strawBrim = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.36, 0.04, 12), hatStrawMat);
    strawBrim.position.y = 0.22;
    bearHead.add(strawBrim);
    const strawTop = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.22, 0.14, 10), hatStrawMat);
    strawTop.position.y = 0.29;
    bearHead.add(strawTop);

    // 釣魚竿 + 釣魚線 + 水面紅白浮標
    const rodPivot = new THREE.Group();
    rodPivot.position.set(0.22, 0.32, 0.12);
    bearGroup.add(rodPivot);

    const rodPole = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.032, 1.35, 6), tieMat);
    rodPole.rotation.x = Math.PI / 3.1;
    rodPole.position.set(0, 0.32, 0.52);
    rodPivot.add(rodPole);

    const lineGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0.66, 1.08),
      new THREE.Vector3(0, -0.62, 1.18)
    ]);
    const fishingLine = new THREE.Line(
      lineGeo,
      new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.72 })
    );
    rodPivot.add(fishingLine);

    const bobberFloat = new THREE.Mesh(
      new THREE.SphereGeometry(0.075, 8, 8),
      new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.35 })
    );
    bobberFloat.position.set(0, -0.62, 1.18);
    rodPivot.add(bobberFloat);

    // 釣魚熊木筏夜燈：船首提燈立柱、暖黃發光燈球與水面暖光暈
    const raftPost = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.04, 0.56, 6), woodDarkMat);
    raftPost.position.set(-0.56, 0.42, 0.72);
    rockPivot.add(raftPost);
    const raftLanternMat = new THREE.MeshStandardMaterial({
      color: 0xffd166,
      emissive: 0xffb703,
      emissiveIntensity: 0.14,
      roughness: 0.3
    });
    registerNightMat(raftLanternMat, { dayEi: 0.14, nightEi: 2.35 });
    const raftLanternBulb = new THREE.Mesh(new THREE.SphereGeometry(0.095, 10, 10), raftLanternMat);
    raftLanternBulb.position.set(-0.56, 0.7, 0.72);
    rockPivot.add(raftLanternBulb);
    const raftLanternGlow = makeNightGlowSprite(0xffc04d, 1.18);
    raftLanternGlow.sprite.position.set(-0.56, 0.7, 0.72);
    rockPivot.add(raftLanternGlow.sprite);
    const raftWaterGlow = makeGroundGlowPlane(4.5, 5.2, 0xffc44d, 0.09, 2);
    raftWaterGlow.mesh.position.z = 0.12;
    root.add(raftWaterGlow.mesh);

    // 木筏底部水波圈
    const wakeGeo = new THREE.RingGeometry(0.75, 1.32, 18);
    wakeGeo.rotateX(-Math.PI / 2);
    const wakeMat = foamMat.clone();
    const raftWakeDayColor = wakeMat.color.clone();
    const raftWakeNightColor = new THREE.Color(0xbae6fd);
    const wakeRing = new THREE.Mesh(wakeGeo, wakeMat);
    wakeRing.scale.set(0.95, 1, 1.35);
    wakeRing.position.set(0, 0.08, 0);
    root.add(wakeRing);

    nightGlowUpdaters.push((nb, t) => {
      const flicker = 0.93 + 0.07 * Math.sin(t * 5.2 + 0.7);
      raftLanternGlow.sprite.visible = nb > 0.01;
      raftLanternGlow.mat.opacity = nb * 0.65 * flicker;
      raftWaterGlow.mesh.visible = nb > 0.01;
      raftWaterGlow.mat.opacity = nb * 0.42 * flicker;
      wakeMat.color.copy(raftWakeDayColor).lerp(raftWakeNightColor, nb);
    });

    root.scale.setScalar(1.06);
    return {
      root,
      rockPivot,
      bearGroup,
      bearHead,
      rodPivot,
      bobberFloat,
      wakeRing,
      wakeMat,
      routeSegmentIndex: 3, // 穿梭於前景兩座相鄰島嶼（程式森林島 <-> 演算法山）碼頭之間
      speed: 0.085
    };
  }

  const fishingBearRaft = createFishingBearRaft();
  scene.add(fishingBearRaft.root);

  // 根據起點與目標島嶼建立平滑移動曲線 (CatmullRomCurve3)
  function buildTravelCurve(startWorldPos, fromIdx, toIdx) {
    const targetRec = islandRecords[toIdx];
    const startPt = startWorldPos.clone();

    if (fromIdx < 0) {
      // 若學生目前位於中央聖殿榮譽廣場，建立直接由中央聖殿跑向目標島嶼碼頭的平滑海路曲線
      const midPt = startPt.clone().lerp(targetRec.dockWaterPos, 0.55);
      midPt.y = 0.26;
      return new THREE.CatmullRomCurve3([startPt, midPt, targetRec.dockWaterPos.clone(), targetRec.dockPos.clone()]);
    }

    if (fromIdx === toIdx && startPt.distanceTo(targetRec.dockPos) < 1.2) {
      // 若已在同一座島的碼頭，產生一段在碼頭與島緣之間輕快彈跳的小迴圈曲線
      const inwardDir = new THREE.Vector3(-Math.cos(targetRec.angle), 0, -Math.sin(targetRec.angle));
      const sideDir = new THREE.Vector3(-inwardDir.z, 0, inwardDir.x);
      const p1 = targetRec.dockPos.clone().addScaledVector(inwardDir, 1.1).addScaledVector(sideDir, 0.65);
      p1.y = 0.72;
      const p2 = targetRec.dockPos.clone().addScaledVector(inwardDir, -0.85).addScaledVector(sideDir, -0.55);
      p2.y = 0.95;
      return new THREE.CatmullRomCurve3([startPt, p1, p2, targetRec.dockPos.clone()]);
    }

    // 計算沿著環狀航線最短路徑（順時針或逆時針繞行，避開中央迷霧神秘礁岩）
    const cwSteps = (toIdx - fromIdx + numIslands) % numIslands;
    const ccwSteps = (fromIdx - toIdx + numIslands) % numIslands;
    const stepDir = cwSteps <= ccwSteps ? 1 : -1;
    const totalSteps = Math.min(cwSteps, ccwSteps);

    const waypoints = [startPt];
    const fromRec = islandRecords[fromIdx];
    if (startPt.distanceTo(fromRec.dockWaterPos) > 0.8) {
      waypoints.push(fromRec.dockWaterPos.clone());
    }

    let curIdx = fromIdx;
    for (let step = 0; step < totalSteps; step++) {
      const nextIdx = (curIdx + stepDir + numIslands) % numIslands;
      if (stepDir === 1) {
        const seg = segmentCurves[curIdx];
        waypoints.push(seg.pMid1.clone(), seg.pMid2.clone());
      } else {
        const seg = segmentCurves[nextIdx];
        waypoints.push(seg.pMid2.clone(), seg.pMid1.clone());
      }
      if (step < totalSteps - 1) {
        // 途經中間島嶼碼頭外海點
        const passRec = islandRecords[nextIdx];
        const passSeaPt = new THREE.Vector3(
          Math.cos(passRec.angle) * (ringRadius - 15.0),
          0.26,
          Math.sin(passRec.angle) * (ringRadius - 15.0)
        );
        waypoints.push(passSeaPt);
      }
      curIdx = nextIdx;
    }

    waypoints.push(targetRec.dockWaterPos.clone());
    waypoints.push(targetRec.dockPos.clone());

    return new THREE.CatmullRomCurve3(waypoints, false, "centripetal", 0.5);
  }

  /* ============================================================
   * 6. 學生角色設計：Q 版黏土小人 + 頭頂 CanvasTexture「班級與座號」名牌
   * ============================================================ */
  function getStudentClassSeatText() {
    const p = window.Store && window.Store.profile;
    if (p && p.cls && p.seat) {
      const gradeMap = { "7": "七", "8": "八", "9": "九" };
      const gChar = gradeMap[String(p.cls)[0]] || String(p.cls)[0];
      const roomNum = parseInt(String(p.cls).slice(1), 10) || String(p.cls).slice(1);
      return `${gChar}年${roomNum}班 ${p.seat}號`;
    }
    return "訪客 · 未登入";
  }

  const badgeCanvas = document.createElement("canvas");
  badgeCanvas.width = 384;
  badgeCanvas.height = 112;
  const badgeCtx = badgeCanvas.getContext("2d");
  const badgeTexture = new THREE.CanvasTexture(badgeCanvas);
  badgeTexture.minFilter = THREE.LinearFilter;

  function drawStudentBadgeCanvas() {
    try {
      const text = getStudentClassSeatText();
      badgeCtx.clearRect(0, 0, badgeCanvas.width, badgeCanvas.height);

      const x = 18, y = 14, w = 348, h = 76, r = 38;
      badgeCtx.save();
      badgeCtx.beginPath();
      badgeCtx.moveTo(x + r, y);
      badgeCtx.lineTo(x + w - r, y);
      badgeCtx.quadraticCurveTo(x + w, y, x + w, y + r);
      badgeCtx.lineTo(x + w, y + h - r);
      badgeCtx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
      badgeCtx.lineTo(x + r, y + h);
      badgeCtx.quadraticCurveTo(x, y + h, x, y + h - r);
      badgeCtx.lineTo(x, y + r);
      badgeCtx.quadraticCurveTo(x, y, x + r, y);
      badgeCtx.closePath();

      // 底部可愛小箭頭指標
      badgeCtx.moveTo(180, y + h);
      badgeCtx.lineTo(192, y + h + 14);
      badgeCtx.lineTo(204, y + h);

      badgeCtx.fillStyle = "rgba(255, 252, 242, 0.95)";
      badgeCtx.shadowColor = "rgba(10, 38, 71, 0.35)";
      badgeCtx.shadowBlur = 10;
      badgeCtx.shadowOffsetY = 4;
      badgeCtx.fill();

      badgeCtx.lineWidth = 5;
      badgeCtx.strokeStyle = "#ff8a65";
      badgeCtx.stroke();
      badgeCtx.restore();

      badgeCtx.fillStyle = "#16324f";
      badgeCtx.font = "bold 30px 'Noto Sans TC', 'Microsoft JhengHei', sans-serif";
      badgeCtx.textAlign = "center";
      badgeCtx.textBaseline = "middle";
      badgeCtx.fillText(`🎒 ${text}`, 192, y + h / 2 + 1);

      badgeTexture.needsUpdate = true;
    } catch (err) {
      console.error("[island_3d] drawStudentBadgeCanvas error:", err);
    }
  }

  drawStudentBadgeCanvas();
  document.addEventListener("ii:login", drawStudentBadgeCanvas);
  document.addEventListener("ii:logout", drawStudentBadgeCanvas);
  window.addEventListener("storage", drawStudentBadgeCanvas);

  function createClayStudentCharacter() {
    const root = new THREE.Group();
    const bodyPivot = new THREE.Group();
    root.add(bodyPivot);

    // 設計師盲盒公仔霧面光澤材質 (Designer Vinyl Toy Satin-Matte Materials)
    const skinMat = new THREE.MeshStandardMaterial({ color: 0xffe2c8, roughness: 0.42, metalness: 0.03 });
    const innerEarMat = new THREE.MeshStandardMaterial({ color: 0xf0b28e, roughness: 0.5, metalness: 0.02 });
    const coatMat = new THREE.MeshStandardMaterial({ color: 0xdcf1ff, roughness: 0.4, metalness: 0.04 });
    const collarMat = new THREE.MeshStandardMaterial({ color: 0x6ec5e9, roughness: 0.42, metalness: 0.04 });
    const pantsMat = new THREE.MeshStandardMaterial({ color: 0x3d5a80, roughness: 0.48, metalness: 0.04 });
    const bootMat = new THREE.MeshStandardMaterial({ color: 0xf4f7fb, roughness: 0.36, metalness: 0.05 });
    const bootSoleMat = new THREE.MeshStandardMaterial({ color: 0xff7b54, roughness: 0.48, metalness: 0.04 });
    const bootCuffMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.5, metalness: 0.05 });
    const packMat = new THREE.MeshStandardMaterial({ color: 0x2ec4b6, roughness: 0.44, metalness: 0.05 });
    const eyeMat = new THREE.MeshStandardMaterial({ color: 0x1d162b, roughness: 0.16, metalness: 0.08 });
    const eyeWhiteMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const mouthMat = new THREE.MeshBasicMaterial({ color: 0x4a3426 });
    const mouthOpenMat = new THREE.MeshBasicMaterial({ color: 0xc93b52 });
    const tearMat = new THREE.MeshStandardMaterial({ color: 0x7dd3fc, emissive: 0x38bdf8, emissiveIntensity: 0.25, roughness: 0.2 });
    const blushMat = new THREE.MeshBasicMaterial({ color: 0xff85a6, transparent: true, opacity: 0.72 });

    // 腳底柔和陰影圈
    const shadowGeo = new THREE.CircleGeometry(0.58, 18);
    shadowGeo.rotateX(-Math.PI / 2);
    const shadowMat = new THREE.MeshBasicMaterial({
      color: 0x0a2239,
      transparent: true,
      opacity: 0.28,
      depthWrite: false
    });
    const footShadow = new THREE.Mesh(shadowGeo, shadowMat);
    footShadow.position.y = 0.03;
    root.add(footShadow);

    // 圓頭厚實短靴＋微胖小短腿 (腳底對齊 y=0)
    function makeChunkyBootLeg(xPos) {
      const legGroup = new THREE.Group();
      legGroup.position.set(xPos, 0.34, 0);

      const thigh = new THREE.Mesh(new THREE.CylinderGeometry(0.105, 0.115, 0.16, 10), skinMat);
      thigh.position.y = -0.06;
      legGroup.add(thigh);

      const cuff = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.125, 0.07, 12), bootCuffMat);
      cuff.position.y = -0.14;
      legGroup.add(cuff);

      const bootBody = new THREE.Mesh(new THREE.SphereGeometry(0.155, 12, 10), bootMat);
      bootBody.scale.set(0.96, 0.76, 1.32);
      bootBody.position.set(0, -0.22, 0.045);
      bootBody.castShadow = true;
      legGroup.add(bootBody);

      const sole = new THREE.Mesh(new THREE.CylinderGeometry(0.148, 0.152, 0.055, 12), bootSoleMat);
      sole.scale.set(0.96, 1, 1.32);
      sole.position.set(0, -0.31, 0.045);
      legGroup.add(sole);

      return legGroup;
    }

    const leftLeg = makeChunkyBootLeg(-0.175);
    const rightLeg = makeChunkyBootLeg(0.175);
    bodyPivot.add(leftLeg);
    bodyPivot.add(rightLeg);

    // 微胖公仔軀幹 (y = 0.32 ~ 0.98)
    const pantsHip = new THREE.Mesh(new THREE.SphereGeometry(0.34, 14, 10), pantsMat);
    pantsHip.scale.set(1.04, 0.62, 0.92);
    pantsHip.position.y = 0.42;
    bodyPivot.add(pantsHip);

    const torsoUpper = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.35, 0.48, 16), coatMat);
    torsoUpper.position.y = 0.68;
    torsoUpper.castShadow = true;
    torsoUpper.receiveShadow = true;
    bodyPivot.add(torsoUpper);

    const bellyRound = new THREE.Mesh(new THREE.SphereGeometry(0.34, 16, 12), coatMat);
    bellyRound.scale.set(1.02, 0.75, 0.92);
    bellyRound.position.y = 0.56;
    bodyPivot.add(bellyRound);

    const neckMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.16, 0.12, 12), skinMat);
    neckMesh.position.y = 0.97;
    bodyPivot.add(neckMesh);

    const collar = new THREE.Mesh(new THREE.TorusGeometry(0.24, 0.055, 8, 18), collarMat);
    collar.rotation.x = Math.PI / 2;
    collar.position.y = 0.91;
    collar.castShadow = true;
    bodyPivot.add(collar);

    // 背後小書包（長髮或斗篷時自動隱藏避免穿模）
    const backpack = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.38, 0.2), packMat);
    backpack.position.set(0, 0.64, -0.3);
    backpack.castShadow = true;
    bodyPivot.add(backpack);

    // 外套/圍裙掛載層 & 浮空滑板掛載層
    const outerMount = new THREE.Group();
    bodyPivot.add(outerMount);

    const mountGroup = new THREE.Group();
    root.add(mountGroup);

    // 寵物跟班懸浮掛載層
    const petMount = new THREE.Group();
    petMount.position.set(-0.84, 0.92, 0.12);
    root.add(petMount);

    // 微胖短手（圓柱上臂 + 圓球小手）
    function makeVinylArm(xPos, sign) {
      const armGroup = new THREE.Group();
      armGroup.position.set(xPos, 0.82, 0);

      const shoulder = new THREE.Mesh(new THREE.SphereGeometry(0.095, 10, 8), coatMat);
      armGroup.add(shoulder);

      const sleeve = new THREE.Mesh(new THREE.CylinderGeometry(0.082, 0.092, 0.2, 10), coatMat);
      sleeve.position.set(sign * 0.03, -0.1, 0);
      sleeve.rotation.z = sign * 0.18;
      sleeve.castShadow = true;
      armGroup.add(sleeve);

      const hand = new THREE.Mesh(new THREE.SphereGeometry(0.1, 10, 8), skinMat);
      hand.position.set(sign * 0.06, -0.24, 0.02);
      hand.castShadow = true;
      armGroup.add(hand);

      return armGroup;
    }

    const leftArm = makeVinylArm(-0.34, -1);
    const rightArm = makeVinylArm(0.34, 1);
    bodyPivot.add(leftArm);
    bodyPivot.add(rightArm);

    const weaponMount = new THREE.Group();
    weaponMount.position.set(0.06, -0.24, 0.06);
    rightArm.add(weaponMount);

    // 1 : 1.2 大頭二頭身公仔頭部節點 (chin y=1.00 -> head height ~0.85)
    const headGroup = new THREE.Group();
    headGroup.position.y = 1.00;
    bodyPivot.add(headGroup);

    const headCenterY = 0.42;
    const headMesh = new THREE.Mesh(new THREE.SphereGeometry(0.45, 20, 16), skinMat);
    headMesh.scale.set(1.08, 0.94, 1.02);
    headMesh.position.y = headCenterY;
    headMesh.castShadow = true;
    headGroup.add(headMesh);

    // 兩側對稱半圓形小耳朵（精靈造型時自動隱藏改掛尖耳）
    const roundEarsGroup = new THREE.Group();
    headGroup.add(roundEarsGroup);
    [-1, 1].forEach((side) => {
      const ear = new THREE.Mesh(new THREE.SphereGeometry(0.105, 10, 8), skinMat);
      ear.scale.set(0.55, 0.92, 0.72);
      ear.position.set(side * 0.48, 0.39, 0.0);
      ear.castShadow = true;
      roundEarsGroup.add(ear);

      const earInner = new THREE.Mesh(new THREE.SphereGeometry(0.058, 8, 6), innerEarMat);
      earInner.scale.set(0.42, 0.78, 0.65);
      earInner.position.set(side * 0.495, 0.39, 0.02);
      roundEarsGroup.add(earInner);
    });

    // 粉嫩腮紅（兩側對稱）
    const blushGeo = new THREE.SphereGeometry(0.075, 10, 8);
    [-1, 1].forEach((side) => {
      const blush = new THREE.Mesh(blushGeo, blushMat);
      blush.scale.set(1.3, 0.68, 0.3);
      blush.position.set(side * 0.285, 0.29, 0.395);
      headGroup.add(blush);
    });

    // 五官、髮型、頭飾、臉飾、光環動態掛載點
    const faceExprMount = new THREE.Group();
    headGroup.add(faceExprMount);

    const hairMount = new THREE.Group();
    headGroup.add(hairMount);

    const headMount = new THREE.Group();
    headGroup.add(headMount);

    const faceMount = new THREE.Group();
    headGroup.add(faceMount);

    const auraMount = new THREE.Group();
    auraMount.position.y = 1.02;
    headGroup.add(auraMount);

    // 保留相容的 leafBulb 參考（避免動畫迴圈存取報錯）
    const leafBulb = new THREE.Group();
    leafBulb.visible = false;
    headGroup.add(leafBulb);

    // 頭頂「班級與座號」CanvasTexture Sprite
    const badgeSpriteMat = new THREE.SpriteMaterial({
      map: badgeTexture,
      transparent: true,
      depthTest: false,
      toneMapped: false
    });
    const badgeSprite = new THREE.Sprite(badgeSpriteMat);
    badgeSprite.scale.set(6.8, 1.98, 1);
    badgeSprite.position.set(0, 2.75, 0);
    badgeSprite.renderOrder = 20;
    root.add(badgeSprite);

    root.scale.setScalar(1.15);

    // ---- 動態清理工具（避免切換造型產生記憶體殘留） ----
    function clearGroup(grp) {
      while (grp.children.length > 0) {
        const child = grp.children[0];
        grp.remove(child);
        if (child.geometry) child.geometry.dispose();
        if (child.material) {
          if (Array.isArray(child.material)) child.material.forEach((m) => m.dispose());
          else child.material.dispose();
        }
        if (child.children && child.children.length) clearGroup(child);
      }
    }

    function addPart(parent, geo, mat, x, y, z, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1) {
      const m = new THREE.Mesh(geo, mat);
      m.position.set(x, y, z);
      m.rotation.set(rx, ry, rz);
      m.scale.set(sx, sy, sz);
      m.castShadow = true;
      parent.add(m);
      return m;
    }

    // ---- 5 款 3D 公仔表情 ＋ 8 款招牌角色專屬發光瞳孔（純 emissive 材質，禁用 PointLight） ----
    function rebuildFace3D(faceId, hairShadeHex, hairId = "male_gojo", faceEquipId = "") {
      clearGroup(faceExprMount);
      const browMat = new THREE.MeshStandardMaterial({ color: hairShadeHex, roughness: 0.5 });

      const EYE_3D = {
        male_gojo: { color: 0x38bdf8, emissive: 0x38bdf8, intensity: 1.15, scleraGlow: true },
        male_tanjiro: { color: 0x991b1b, emissive: 0x450a0a, intensity: 0.35 },
        male_bakugo: { color: 0xef4444, emissive: 0xef4444, intensity: 0.9, sharp: true },
        male_hinata: { color: 0xd97706, emissive: 0x92400e, intensity: 0.3, bigEyes: true },
        female_frieren: { color: 0x34d399, emissive: 0x10b981, intensity: 0.45, halfLid: true },
        female_anya: { color: 0x10b981, emissive: 0x059669, intensity: 0.45, bigEyes: true, starSparkle: true },
        female_nezuko: { color: 0xf472b6, emissive: 0xdb2777, intensity: 0.45, bigEyes: true },
        female_miku: { color: 0x2dd4bf, emissive: 0x14b8a6, intensity: 0.5 }
      };
      const ep = EYE_3D[hairId] || EYE_3D.male_gojo;
      const customEyeMat = new THREE.MeshStandardMaterial({
        color: ep.color,
        emissive: ep.emissive,
        emissiveIntensity: ep.intensity,
        roughness: 0.16,
        metalness: 0.08
      });

      function buildEyeMesh(side, sx, sy) {
        if (ep.scleraGlow) {
          const rimMat = new THREE.MeshStandardMaterial({
            color: 0xe0f2fe,
            emissive: 0x7dd3fc,
            emissiveIntensity: 0.55,
            roughness: 0.2
          });
          addPart(faceExprMount, new THREE.SphereGeometry(0.084, 12, 10), rimMat, side * 0.185, 0.375, 0.41, 0, 0, 0, sx, sy, 0.36);
        }
        addPart(faceExprMount, new THREE.SphereGeometry(0.07, 12, 10), customEyeMat, side * 0.185, 0.375, 0.422, 0, 0, 0, sx, sy, 0.42);
        addPart(faceExprMount, new THREE.SphereGeometry(0.022, 8, 6), eyeWhiteMat, side * 0.185 - 0.022, 0.405, 0.454);
        addPart(faceExprMount, new THREE.SphereGeometry(0.011, 6, 6), eyeWhiteMat, side * 0.185 + 0.024, 0.345, 0.452);

        if (ep.starSparkle) {
          const starWhite = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 0.9, roughness: 0.1 });
          addPart(faceExprMount, new THREE.OctahedronGeometry(0.026, 0), starWhite, side * 0.185, 0.365, 0.454, 0, 0, 0, 1, 1, 0.35);
        }
        if (ep.halfLid) {
          addPart(faceExprMount, new THREE.BoxGeometry(0.145, 0.038, 0.045), skinMat, side * 0.185, 0.43, 0.432);
          addPart(faceExprMount, new THREE.BoxGeometry(0.145, 0.016, 0.032), browMat, side * 0.185, 0.412, 0.445);
        }
      }

      if (faceId === "happy") {
        // 彎月開心笑：眯眯弧形眼 + 微笑開口
        [-1, 1].forEach((side) => {
          const happyEyeMat = (hairId === "male_gojo" && side === 1 && !faceEquipId) || (hairId === "male_bakugo" && !faceEquipId) ? customEyeMat : eyeMat;
          addPart(faceExprMount, new THREE.TorusGeometry(0.068, 0.018, 6, 12, Math.PI), happyEyeMat, side * 0.185, 0.365, 0.425, 0, 0, 0);
          addPart(faceExprMount, new THREE.BoxGeometry(0.11, 0.02, 0.02), browMat, side * 0.185, 0.52, 0.415, 0, 0, side * -0.1);
        });
        addPart(faceExprMount, new THREE.SphereGeometry(0.055, 10, 8), mouthOpenMat, 0, 0.245, 0.43, 0, 0, 0, 1.15, 0.85, 0.4);
      } else {
        // 寬眼距立體大眼珠（calm / angry / surprised / teary）
        const eyeSy = faceId === "angry" ? 1.05 : faceId === "surprised" ? 1.32 : ep.bigEyes ? 1.28 : ep.sharp ? 1.06 : 1.2;
        const eyeSx = faceId === "surprised" ? 1.02 : ep.bigEyes ? 0.96 : 0.92;
        [-1, 1].forEach((side) => buildEyeMesh(side, eyeSx, eyeSy));

        if (faceId === "angry") {
          [-1, 1].forEach((side) => {
            addPart(faceExprMount, new THREE.BoxGeometry(0.13, 0.026, 0.024), browMat, side * 0.175, 0.495, 0.425, 0, 0, side * -0.35);
          });
          addPart(faceExprMount, new THREE.TorusGeometry(0.036, 0.012, 6, 10, Math.PI), mouthMat, 0, 0.235, 0.435, 0, 0, 0);
        } else if (faceId === "surprised") {
          [-1, 1].forEach((side) => {
            addPart(faceExprMount, new THREE.BoxGeometry(0.11, 0.02, 0.02), browMat, side * 0.185, 0.545, 0.405, 0, 0, side * 0.12);
          });
          addPart(faceExprMount, new THREE.SphereGeometry(0.042, 10, 8), mouthOpenMat, 0, 0.24, 0.435, 0, 0, 0, 0.9, 1.15, 0.45);
        } else if (faceId === "teary") {
          [-1, 1].forEach((side) => {
            addPart(faceExprMount, new THREE.BoxGeometry(0.12, 0.022, 0.022), browMat, side * 0.185, 0.505, 0.42, 0, 0, side * 0.32);
            addPart(faceExprMount, new THREE.SphereGeometry(0.034, 8, 6), tearMat, side * 0.255, 0.315, 0.42, 0, 0, side * -0.25, 0.85, 1.25, 0.65);
          });
          addPart(faceExprMount, new THREE.TorusGeometry(0.032, 0.012, 6, 10, Math.PI), mouthMat, 0, 0.235, 0.435, 0, 0, 0);
        } else {
          // calm 表情
          [-1, 1].forEach((side) => {
            addPart(faceExprMount, new THREE.BoxGeometry(0.11, 0.02, 0.02), browMat, side * 0.185, 0.51, 0.415, 0, 0, side * -0.05);
          });
          if (hairId === "male_hinata") {
            addPart(faceExprMount, new THREE.SphereGeometry(0.06, 10, 8), eyeWhiteMat, 0, 0.245, 0.432, 0, 0, 0, 1.35, 0.65, 0.4);
          } else if (hairId === "male_bakugo") {
            addPart(faceExprMount, new THREE.TorusGeometry(0.042, 0.013, 6, 10, Math.PI), mouthMat, 0.02, 0.255, 0.435, 0, 0, Math.PI + 0.28);
          } else {
            addPart(faceExprMount, new THREE.TorusGeometry(0.032, 0.012, 6, 10, Math.PI), mouthMat, 0, 0.255, 0.435, 0, 0, Math.PI);
          }
        }
      }

      // ---- 角色招牌臉部配件（若玩家另戴獎勵眼鏡，則暫時替換眼罩／面具槽位） ----
      if (hairId === "male_gojo" && !faceEquipId) {
        const clothMat = new THREE.MeshStandardMaterial({ color: 0x141418, roughness: 0.78, metalness: 0.05 });
        addPart(faceExprMount, new THREE.CylinderGeometry(0.495, 0.495, 0.135, 20, 1, true, Math.PI * 0.32, Math.PI * 1.48), clothMat, 0, 0.39, -0.01, 0, Math.PI * 0.15, 0, 1.07, 1, 1.02);
        addPart(faceExprMount, new THREE.BoxGeometry(0.32, 0.15, 0.09), clothMat, -0.14, 0.39, 0.425, 0, -0.18, 0);
        addPart(faceExprMount, new THREE.BoxGeometry(0.24, 0.055, 0.07), clothMat, 0.18, 0.46, 0.415, 0, 0.24, -0.08);
        addPart(faceExprMount, new THREE.BoxGeometry(0.24, 0.052, 0.07), clothMat, 0.18, 0.31, 0.415, 0, 0.24, 0.06);
      } else if (hairId === "male_bakugo" && !faceEquipId) {
        // 爆豪純黑底色＋亮橘色鋸齒尖角立體眼罩
        const maskBlk = new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.55 });
        const orangeRim = new THREE.MeshStandardMaterial({ color: 0xf97316, emissive: 0xea580c, emissiveIntensity: 0.35, roughness: 0.35 });
        addPart(faceExprMount, new THREE.BoxGeometry(0.12, 0.11, 0.07), maskBlk, 0, 0.38, 0.435);
        addPart(faceExprMount, new THREE.BoxGeometry(0.58, 0.04, 0.07), maskBlk, 0, 0.45, 0.41);
        addPart(faceExprMount, new THREE.BoxGeometry(0.58, 0.036, 0.07), maskBlk, 0, 0.305, 0.41);
        [-1, 1].forEach((side) => {
          addPart(faceExprMount, new THREE.BoxGeometry(0.08, 0.14, 0.07), maskBlk, side * 0.3, 0.38, 0.36, 0, side * 0.55, 0);
          addPart(faceExprMount, new THREE.ConeGeometry(0.065, 0.22, 4), orangeRim, side * 0.42, 0.46, 0.33, 0.2, 0, side * -1.15);
          addPart(faceExprMount, new THREE.ConeGeometry(0.055, 0.19, 4), orangeRim, side * 0.42, 0.31, 0.33, 0.2, 0, side * -1.75);
        });
      } else if (hairId === "female_nezuko") {
        // 禰豆子翠綠色竹節竹筒＋紅棕綁帶
        const bambooMat = new THREE.MeshStandardMaterial({ color: 0x22c55e, roughness: 0.38 });
        const nodeMat = new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.4 });
        const strapMat = new THREE.MeshStandardMaterial({ color: 0x7f1d1d, roughness: 0.55 });
        addPart(faceExprMount, new THREE.CylinderGeometry(0.055, 0.055, 0.27, 12), bambooMat, 0, 0.23, 0.455, 0, 0, Math.PI / 2);
        addPart(faceExprMount, new THREE.CylinderGeometry(0.06, 0.06, 0.025, 12), nodeMat, 0, 0.23, 0.455, 0, 0, Math.PI / 2);
        [-1, 1].forEach((side) => {
          addPart(faceExprMount, new THREE.BoxGeometry(0.22, 0.026, 0.026), strapMat, side * 0.23, 0.27, 0.39, 0, side * 0.5, side * 0.18);
        });
      }
    }

    // ---- 8 款招牌動漫角色 3D 立體髮型 ＋ 精靈耳／日輪花牌／小角／蝴蝶結／耳麥 ----
    function rebuildHair3D(hairId, hc, headId) {
      clearGroup(hairMount);
      roundEarsGroup.visible = hairId !== "female_frieren";

      const mainMat = new THREE.MeshStandardMaterial({ color: hc.c, roughness: 0.4, metalness: 0.04 });
      const shadeMat = new THREE.MeshStandardMaterial({ color: hc.s, roughness: 0.46, metalness: 0.03 });
      const tipMat = new THREE.MeshStandardMaterial({ color: hc.bot || hc.c, roughness: 0.38, metalness: 0.04 });
      const midMat = new THREE.MeshStandardMaterial({ color: hc.mid || hc.bot || hc.c, roughness: 0.4, metalness: 0.04 });
      const coverHat = headId === "strawberry_beret" || headId === "hacker_hood";

      // 僅包覆後腦與頭頂後方（正面額頭 100% 留空）
      const capScaleY = coverHat ? 0.94 : 1.0;
      addPart(hairMount, new THREE.SphereGeometry(0.47, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.44), mainMat, 0, 0.43, -0.05, -0.46, 0, 0, 1.08, capScaleY, 1.04);
      if (headId !== "hacker_hood") {
        addPart(hairMount, new THREE.SphereGeometry(0.468, 16, 12, Math.PI * 0.72, Math.PI * 1.56, Math.PI * 0.16, Math.PI * 0.68), shadeMat, 0, 0.41, -0.06, 0.08, 0, 0, 1.07, 0.95, 1.02);
      }

      if (hairId === "male_gojo") {
        // 1｜白髮眼罩咒術師（五條悟特徵）
        if (!coverHat) {
          const spikes = [
            [-0.26, 0.86, 0.08, -0.1, 0, 0.48, 0.12, 0.36],
            [-0.1, 0.94, 0.13, 0.12, 0, 0.18, 0.13, 0.4],
            [0.1, 0.94, 0.13, 0.12, 0, -0.18, 0.13, 0.4],
            [0.26, 0.86, 0.08, -0.1, 0, -0.48, 0.12, 0.36],
            [-0.16, 0.83, -0.18, -0.52, 0, 0.3, 0.125, 0.34],
            [0.16, 0.83, -0.18, -0.52, 0, -0.3, 0.125, 0.34]
          ];
          spikes.forEach(([x, y, z, rx, ry, rz, r, h]) => addPart(hairMount, new THREE.ConeGeometry(r, h, 7), mainMat, x, y, z, rx, ry, rz));
        }
        [[-0.18, 0.74, 0.28, 0.42, 0.2], [0.0, 0.76, 0.3, 0.48, 0], [0.18, 0.74, 0.28, 0.42, -0.2]].forEach(([x, y, z, rx, rz]) => {
          addPart(hairMount, new THREE.ConeGeometry(0.08, 0.2, 6), mainMat, x, y, z, rx, 0, rz);
        });
        [-1, 1].forEach((s) => addPart(hairMount, new THREE.ConeGeometry(0.075, 0.24, 6), mainMat, s * 0.43, 0.34, 0.2, 0.15, 0, s * 2.95));
      } else if (hairId === "male_tanjiro") {
        // 2｜火焰傷紋劍士（竈門炭治郎特徵）：黑紅漸層層次碎髮＋額頭左暗紅傷紋＋兩側日輪花牌耳飾
        if (!coverHat) {
          [[-0.22, 0.82, 0.05, 0.36], [-0.04, 0.87, 0.08, 0.08], [0.14, 0.86, 0.06, -0.18], [0.28, 0.79, 0.02, -0.45]].forEach(([x, y, z, rz]) => {
            addPart(hairMount, new THREE.ConeGeometry(0.11, 0.28, 7), tipMat, x, y, z, -0.22, 0, rz);
          });
        }
        [[0.02, 0.65, 0.41, -0.05], [0.17, 0.64, 0.38, -0.16], [0.29, 0.68, 0.3, -0.26], [-0.27, 0.68, 0.31, 0.25]].forEach(([x, y, z, rz]) => {
          addPart(hairMount, new THREE.ConeGeometry(0.075, 0.2, 7), tipMat, x, y, z, 2.72, 0, rz);
        });
        [-1, 1].forEach((s) => addPart(hairMount, new THREE.ConeGeometry(0.08, 0.24, 6), tipMat, s * 0.43, 0.32, 0.2, 2.85, 0, s * -0.12));
        // 額頭左側暗紅色火焰狀斑紋傷疤
        const scarMat = new THREE.MeshStandardMaterial({ color: 0x991b1b, emissive: 0x450a0a, emissiveIntensity: 0.25, roughness: 0.45 });
        addPart(hairMount, new THREE.BoxGeometry(0.12, 0.085, 0.025), scarMat, -0.17, 0.6, 0.405, -0.25, -0.25, 0.15);
        addPart(hairMount, new THREE.ConeGeometry(0.045, 0.09, 4), scarMat, -0.2, 0.64, 0.4, -0.2, 0, 0.35);
        // 兩側垂掛長方形日輪花牌耳飾
        const cardWhite = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3 });
        const cardSun = new THREE.MeshStandardMaterial({ color: 0xef4444, emissive: 0x991b1b, emissiveIntensity: 0.2, roughness: 0.35 });
        const cardRim = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.45 });
        [-1, 1].forEach((s) => {
          addPart(hairMount, new THREE.BoxGeometry(0.022, 0.155, 0.092), cardRim, s * 0.5, 0.22, 0.03);
          addPart(hairMount, new THREE.BoxGeometry(0.028, 0.138, 0.076), cardWhite, s * 0.5, 0.22, 0.03);
          addPart(hairMount, new THREE.CylinderGeometry(0.024, 0.024, 0.032, 10), cardSun, s * 0.5, 0.24, 0.03, 0, 0, Math.PI / 2);
        });
      } else if (hairId === "male_bakugo") {
        // 3｜爆破英雄少年（爆豪勝己特徵）：耀眼金黃炸裂尖刺刺蝟頭
        if (!coverHat) {
          const spikes = [
            [-0.36, 0.72, 0.06, -0.1, 0, 0.85, 0.12, 0.36],
            [0.36, 0.72, 0.06, -0.1, 0, -0.85, 0.12, 0.36],
            [-0.22, 0.88, 0.08, 0.05, 0, 0.45, 0.125, 0.4],
            [0.22, 0.88, 0.08, 0.05, 0, -0.45, 0.125, 0.4],
            [0.0, 0.95, 0.1, 0.15, 0, 0, 0.135, 0.42],
            [-0.2, 0.8, -0.2, -0.55, 0, 0.38, 0.125, 0.35],
            [0.2, 0.8, -0.2, -0.55, 0, -0.38, 0.125, 0.35]
          ];
          spikes.forEach(([x, y, z, rx, ry, rz, r, h]) => addPart(hairMount, new THREE.ConeGeometry(r, h, 7), mainMat, x, y, z, rx, ry, rz));
        }
        [[-0.22, 0.72, 0.32, 0.25], [-0.06, 0.72, 0.36, 0.08], [0.08, 0.72, 0.36, -0.08], [0.22, 0.72, 0.32, -0.25]].forEach(([x, y, z, rz]) => {
          addPart(hairMount, new THREE.ConeGeometry(0.08, 0.22, 6), mainMat, x, y, z, 2.75, 0, rz);
        });
        [-1, 1].forEach((s) => addPart(hairMount, new THREE.ConeGeometry(0.09, 0.26, 6), mainMat, s * 0.45, 0.38, 0.18, 0.2, 0, s * 2.4));
      } else if (hairId === "male_hinata") {
        // 4｜橘子頭王牌少年（日向翔陽特徵）：亮橘蓬鬆亂翹短髮＋俏皮橘子呆毛
        const puffs = [
          [-0.22, 0.65, 0.34, 0.11], [-0.07, 0.63, 0.39, 0.115], [0.08, 0.63, 0.39, 0.115], [0.23, 0.65, 0.34, 0.11]
        ];
        puffs.forEach(([x, y, z, r]) => addPart(hairMount, new THREE.SphereGeometry(r, 10, 8), mainMat, x, y, z, 0, 0, 0, 1.0, 1.15, 0.75));
        if (!coverHat) {
          addPart(hairMount, new THREE.SphereGeometry(0.18, 10, 8), mainMat, 0, 0.79, 0.12, 0, 0, 0, 1.45, 0.76, 1.05);
          addPart(hairMount, new THREE.SphereGeometry(0.14, 10, 8), mainMat, -0.22, 0.75, 0.14, 0, 0, 0.25, 1.15, 0.78, 0.95);
          addPart(hairMount, new THREE.SphereGeometry(0.14, 10, 8), mainMat, 0.22, 0.75, 0.14, 0, 0, -0.25, 1.15, 0.78, 0.95);
        }
        // 頭頂俏皮橘子呆毛（戴帽也保留）
        addPart(hairMount, new THREE.ConeGeometry(0.055, 0.26, 7), mainMat, -0.08, 0.96, 0.08, 0.1, 0, 0.45);
        addPart(hairMount, new THREE.ConeGeometry(0.06, 0.29, 7), mainMat, 0.09, 0.98, 0.06, 0.05, 0, -0.42);
        [-1, 1].forEach((s) => addPart(hairMount, new THREE.SphereGeometry(0.11, 9, 8), mainMat, s * 0.44, 0.38, 0.2, 0, 0, 0, 0.78, 1.38, 0.85));
      } else if (hairId === "female_frieren") {
        // 5｜銀髮精靈魔法使（芙莉蓮特徵）：保留原設計
        const goldMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.25, metalness: 0.65 });
        const rubyMat = new THREE.MeshStandardMaterial({ color: 0xef4444, emissive: 0x991b1b, emissiveIntensity: 0.3, roughness: 0.18 });
        const tieMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.4 });
        [-1, 1].forEach((s) => {
          addPart(hairMount, new THREE.SphereGeometry(0.11, 10, 8), mainMat, s * 0.22, 0.67, 0.34, 0, 0, s * -0.58, 1.32, 0.74, 0.75);
          addPart(hairMount, new THREE.SphereGeometry(0.088, 8, 8), mainMat, s * 0.38, 0.38, 0.24, 0, 0, s * 0.1, 0.72, 1.48, 0.78);
          addPart(hairMount, new THREE.ConeGeometry(0.08, 0.3, 8), skinMat, s * 0.56, 0.41, 0.02, 0, 0, s * -1.35);
          addPart(hairMount, new THREE.TorusGeometry(0.028, 0.008, 6, 12), goldMat, s * 0.49, 0.32, 0.03);
          addPart(hairMount, new THREE.OctahedronGeometry(0.045, 0), rubyMat, s * 0.49, 0.24, 0.03, 0, 0, 0, 0.85, 1.25, 0.65);
          addPart(hairMount, new THREE.TorusGeometry(0.065, 0.022, 6, 12), tieMat, s * 0.42, 0.34, -0.14, 0, Math.PI / 2, 0);
          addPart(hairMount, new THREE.SphereGeometry(0.135, 10, 8), mainMat, s * 0.47, 0.16, -0.18, 0, 0, s * -0.18, 0.88, 1.45, 0.9);
          addPart(hairMount, new THREE.ConeGeometry(0.11, 0.26, 8), shadeMat, s * 0.49, -0.05, -0.2, 3.0, 0, s * -0.15);
        });
      } else if (hairId === "female_anya") {
        // 6｜讀心超能力少女（安妮亞特徵）：粉色內彎鮑伯短髮＋頭頂黑底金邊圓錐形雙小角頭飾
        addPart(hairMount, new THREE.CylinderGeometry(0.49, 0.44, 0.34, 16, 1, false, Math.PI * 0.22, Math.PI * 1.56), shadeMat, 0, 0.25, -0.05, 0, Math.PI, 0, 1.06, 1, 0.98);
        [-0.21, -0.075, 0.075, 0.21].forEach((x) => addPart(hairMount, new THREE.SphereGeometry(0.082, 8, 8), mainMat, x, 0.61, 0.41, 0, 0, 0, 0.9, 1.1, 0.68));
        [-1, 1].forEach((s) => addPart(hairMount, new THREE.SphereGeometry(0.11, 10, 8), mainMat, s * 0.42, 0.26, 0.22, 0, 0, s * -0.15, 0.7, 1.82, 0.85));
        // 黑底金邊圓錐形雙小角頭飾（戴帽也保留）
        const hornBlk = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.35 });
        const hornGold = new THREE.MeshStandardMaterial({ color: 0xfacc15, emissive: 0xb45309, emissiveIntensity: 0.2, roughness: 0.28, metalness: 0.45 });
        [-1, 1].forEach((s) => {
          const hx = s * (coverHat ? 0.34 : 0.28);
          const hy = coverHat ? 0.86 : 0.88;
          addPart(hairMount, new THREE.ConeGeometry(0.105, 0.25, 10), hornBlk, hx, hy, 0.05, 0.08, 0, s * -0.35);
          addPart(hairMount, new THREE.TorusGeometry(0.095, 0.022, 6, 14), hornGold, hx - s * 0.03, hy - 0.09, 0.05, Math.PI / 2, s * -0.35, 0);
        });
      } else if (hairId === "female_nezuko") {
        // 7｜竹筒鬼殺隊少女（竈門禰豆子特徵）：烏黑長捲髮＋髮尾漸層亮橘紅色＋左側淺粉色小蝴蝶結
        [-0.22, -0.07, 0.08, 0.22].forEach((x) => addPart(hairMount, new THREE.SphereGeometry(0.082, 8, 8), mainMat, x, 0.62, 0.4, 0, 0, 0, 0.92, 1.1, 0.68));
        [-1, 1].forEach((s) => {
          addPart(hairMount, new THREE.SphereGeometry(0.095, 8, 8), mainMat, s * 0.4, 0.22, 0.22, 0, 0, s * -0.08, 0.76, 1.9, 0.84);
          addPart(hairMount, new THREE.SphereGeometry(0.095, 8, 8), tipMat, s * 0.41, -0.04, 0.19, 0, 0, 0, 0.8, 1.0, 0.8);
        });
        if (headId !== "hacker_hood") {
          [
            [0, 0.08, -0.39, 0.34, 0.95, mainMat],
            [-0.22, -0.14, -0.37, 0.22, 1.15, mainMat],
            [0.22, -0.14, -0.37, 0.22, 1.15, mainMat],
            [0, -0.26, -0.38, 0.26, 1.15, midMat],
            [-0.18, -0.44, -0.36, 0.19, 1.0, tipMat],
            [0.18, -0.44, -0.36, 0.19, 1.0, tipMat]
          ].forEach(([x, y, z, r, sy, m]) => addPart(hairMount, new THREE.SphereGeometry(r, 10, 8), m, x, y, z, 0, 0, 0, 1.15, sy, 0.58));
        }
        // 左側淺粉色立體小蝴蝶結（戴帽也保留）
        const bowPink = new THREE.MeshStandardMaterial({ color: 0xf9a8d4, roughness: 0.35 });
        const bowKnot = new THREE.MeshStandardMaterial({ color: 0xf472b6, roughness: 0.35 });
        const bowGrp = new THREE.Group();
        bowGrp.position.set(-0.28, coverHat ? 0.68 : 0.76, 0.25);
        bowGrp.rotation.set(0.15, -0.25, 0.32);
        addPart(bowGrp, new THREE.SphereGeometry(0.04, 8, 6), bowKnot, 0, 0, 0);
        [-1, 1].forEach((s) => addPart(bowGrp, new THREE.ConeGeometry(0.055, 0.11, 5), bowPink, s * 0.075, 0, 0, 0, 0, s * 1.55));
        hairMount.add(bowGrp);
      } else if (hairId === "female_miku") {
        // 8｜虛擬歌姬雙馬尾（初音未來特徵）：湖水藍綠齊瀏海＋超長雙馬尾＋黑粉方形髮夾＋銀黑科技耳麥
        [-0.21, -0.07, 0.07, 0.21].forEach((x) => addPart(hairMount, new THREE.SphereGeometry(0.082, 8, 8), mainMat, x, 0.61, 0.41, 0, 0, 0, 0.92, 1.1, 0.68));
        [-1, 1].forEach((s) => {
          addPart(hairMount, new THREE.CylinderGeometry(0.068, 0.052, 0.52, 8), mainMat, s * 0.41, 0.26, 0.22, 0, 0, s * -0.08);
          // 垂落至腳邊的超長雙馬尾圓錐束
          addPart(hairMount, new THREE.SphereGeometry(0.145, 10, 8), mainMat, s * 0.5, 0.45, -0.1, 0, 0, s * -0.18, 0.9, 1.45, 0.95);
          addPart(hairMount, new THREE.CylinderGeometry(0.11, 0.145, 0.72, 10), mainMat, s * 0.56, 0.04, -0.15, 0.06, 0, s * 0.12);
          addPart(hairMount, new THREE.ConeGeometry(0.14, 0.46, 10), shadeMat, s * 0.61, -0.5, -0.18, 3.12, 0, s * 0.1);
          // 雙馬尾根部純黑底＋亮粉紅外框方形幾何髮飾（戴帽也保留）
          const clipBlk = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.35 });
          const clipPink = new THREE.MeshStandardMaterial({ color: 0xec4899, emissive: 0xec4899, emissiveIntensity: 0.45, roughness: 0.25 });
          addPart(hairMount, new THREE.BoxGeometry(0.095, 0.11, 0.11), clipPink, s * 0.46, 0.6, -0.04, 0, 0, s * -0.25);
          addPart(hairMount, new THREE.BoxGeometry(0.105, 0.075, 0.075), clipBlk, s * 0.46, 0.6, -0.04, 0, 0, s * -0.25);
        });
        // 銀黑科技耳麥（未戴電競耳機時顯示）
        if (headId !== "esports_headset") {
          const hsDark = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.35, metalness: 0.4 });
          const hsLed = new THREE.MeshStandardMaterial({ color: 0x2dd4bf, emissive: 0x2dd4bf, emissiveIntensity: 0.75, roughness: 0.2 });
          [-1, 1].forEach((s) => {
            addPart(hairMount, new THREE.CylinderGeometry(0.12, 0.12, 0.065, 12), hsDark, s * 0.5, 0.39, 0.02, 0, 0, Math.PI / 2);
            addPart(hairMount, new THREE.CylinderGeometry(0.075, 0.075, 0.075, 12), hsLed, s * 0.505, 0.39, 0.02, 0, 0, Math.PI / 2);
          });
          addPart(hairMount, new THREE.BoxGeometry(0.18, 0.02, 0.02), hsDark, -0.38, 0.27, 0.21, 0, -0.7, 0.28);
        }
      }
    }

    // ---- 同步 3D 裝備（精準掛載不穿模） ----
    function rebuildGear3D(eq, hairId) {
      clearGroup(headMount);
      clearGroup(faceMount);
      clearGroup(outerMount);
      clearGroup(weaponMount);
      clearGroup(petMount);
      clearGroup(auraMount);
      clearGroup(mountGroup);

      // 依服裝更新材質色彩（未換穿其他上衣時，日向自動顯示烏野黑底亮橘運動領口）
      const topId = eq.top || "";
      const botId = eq.bottom || "";
      const outerId = eq.outer || "";
      const headId = eq.head || "";
      const faceItemId = eq.face || "";
      const weaponId = eq.weapon || "";
      const petId = eq.pet || "";
      const auraId = eq.aura || "";
      const mountId = eq.mount || "";

      const defaultTopPal = hairId === "male_hinata" ? [0x18181b, 0xfb923c] : [0xdcf1ff, 0x6ec5e9];
      const topPal = {
        neon_hoodie: [0x2a2566, 0x22d3ee],
        cyber_jacket: [0x262626, 0xffd60a],
        space_suit: [0xf1f5f9, 0xff7a1a],
        sailor_set: [0xffffff, 0x1d3557]
      }[topId] || defaultTopPal;
      coatMat.color.setHex(topPal[0]);
      collarMat.color.setHex(topPal[1]);

      const botHex = {
        circuit_cargo: 0x14532d,
        plaid_skirt: 0xb3202a,
        bear_overalls: 0xa47148
      }[botId] || 0x3d5a80;
      pantsMat.color.setHex(botHex);

      // 長捲髮／長雙馬尾或斗篷時自動隱藏書包防穿模
      backpack.visible = hairId !== "female_nezuko" && hairId !== "female_miku" && outerId !== "star_cloak";

      // 1. 頭飾（完美貼合頭頂且保留瀏海與鬢角）
      if (headId === "esports_headset") {
        const blk = new THREE.MeshStandardMaterial({ color: 0x1b1b1b, roughness: 0.35 });
        const neonRed = new THREE.MeshStandardMaterial({ color: 0xff2e4d, emissive: 0xff2e4d, emissiveIntensity: 0.7, roughness: 0.25 });
        addPart(headMount, new THREE.TorusGeometry(0.49, 0.045, 8, 20, Math.PI), blk, 0, 0.44, 0, 0, 0, 0);
        [-1, 1].forEach((s) => {
          addPart(headMount, new THREE.CylinderGeometry(0.14, 0.14, 0.09, 12), blk, s * 0.52, 0.39, 0, 0, 0, Math.PI / 2);
          addPart(headMount, new THREE.TorusGeometry(0.1, 0.02, 6, 12), neonRed, s * 0.56, 0.39, 0, 0, Math.PI / 2, 0);
          addPart(headMount, new THREE.ConeGeometry(0.11, 0.22, 4), blk, s * 0.28, 0.96, 0, 0, Math.PI / 4, s * -0.2);
          addPart(headMount, new THREE.ConeGeometry(0.06, 0.13, 4), neonRed, s * 0.28, 0.95, 0.03, 0, Math.PI / 4, s * -0.2);
        });
      } else if (headId === "hacker_hood") {
        const hoodMat = new THREE.MeshStandardMaterial({ color: 0x2b2f3a, roughness: 0.6 });
        const neonGrn = new THREE.MeshStandardMaterial({ color: 0x39ff88, emissive: 0x39ff88, emissiveIntensity: 0.6, roughness: 0.3 });
        addPart(headMount, new THREE.SphereGeometry(0.51, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.65), hoodMat, 0, 0.43, -0.05, -0.25, 0, 0, 1.08, 1.02, 1.08);
        addPart(headMount, new THREE.TorusGeometry(0.47, 0.05, 8, 20, Math.PI * 1.15), hoodMat, 0, 0.44, 0.14, -0.15, 0, -Math.PI * 0.075);
        addPart(headMount, new THREE.TorusGeometry(0.47, 0.018, 6, 20, Math.PI * 1.1), neonGrn, 0, 0.44, 0.18, -0.15, 0, -Math.PI * 0.05);
      } else if (headId === "boba_clip") {
        const cupMat = new THREE.MeshStandardMaterial({ color: 0xd9a77a, roughness: 0.35 });
        const lidMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3 });
        const strawMat = new THREE.MeshStandardMaterial({ color: 0xff6b9d, roughness: 0.35 });
        addPart(headMount, new THREE.CylinderGeometry(0.09, 0.07, 0.18, 10), cupMat, 0.28, 0.87, 0.16, 0, 0, -0.28);
        addPart(headMount, new THREE.SphereGeometry(0.092, 10, 6, 0, Math.PI * 2, 0, Math.PI * 0.5), lidMat, 0.31, 0.95, 0.16, 0, 0, -0.28);
        addPart(headMount, new THREE.CylinderGeometry(0.018, 0.018, 0.16, 6), strawMat, 0.34, 1.05, 0.16, 0, 0, -0.42);
      } else if (headId === "shiba_ears") {
        const bandMat = new THREE.MeshStandardMaterial({ color: 0xe07a2e, roughness: 0.45 });
        const furMat = new THREE.MeshStandardMaterial({ color: 0xf39c4a, roughness: 0.48 });
        const creamMat = new THREE.MeshStandardMaterial({ color: 0xfff1dc, roughness: 0.5 });
        addPart(headMount, new THREE.TorusGeometry(0.47, 0.035, 6, 18, Math.PI), bandMat, 0, 0.46, 0.04, 0, 0, 0);
        [-1, 1].forEach((s) => {
          addPart(headMount, new THREE.ConeGeometry(0.11, 0.22, 6), furMat, s * 0.29, 0.94, 0.04, 0.1, 0, s * -0.28);
          addPart(headMount, new THREE.ConeGeometry(0.06, 0.14, 6), creamMat, s * 0.29, 0.92, 0.08, 0.1, 0, s * -0.28);
        });
      } else if (headId === "strawberry_beret") {
        const redMat = new THREE.MeshStandardMaterial({ color: 0xe63946, roughness: 0.45 });
        const leafMat = new THREE.MeshStandardMaterial({ color: 0x43a047, roughness: 0.45 });
        addPart(headMount, new THREE.SphereGeometry(0.48, 16, 10), redMat, -0.05, 0.82, -0.02, 0, 0, 0.18, 1.15, 0.42, 1.12);
        addPart(headMount, new THREE.CylinderGeometry(0.03, 0.04, 0.14, 6), leafMat, -0.08, 1.03, -0.02, 0, 0, 0.22);
      } else if (headId === "star_crown") {
        const goldMat = new THREE.MeshStandardMaterial({ color: 0xffd166, emissive: 0xb8860b, emissiveIntensity: 0.25, roughness: 0.25, metalness: 0.55 });
        const crownY = (hairId === "male_gojo" || hairId === "male_bakugo" || hairId === "male_hinata" || hairId === "female_anya") ? 0.93 : 0.88;
        addPart(headMount, new THREE.CylinderGeometry(0.22, 0.19, 0.16, 6), goldMat, 0, crownY, 0.04, 0.1, 0, 0);
        for (let i = 0; i < 5; i++) {
          const a = (i / 5) * Math.PI * 2;
          addPart(headMount, new THREE.ConeGeometry(0.055, 0.14, 5), goldMat, Math.cos(a) * 0.19, crownY + 0.13, 0.04 + Math.sin(a) * 0.19);
        }
      }

      // 2. 臉飾（護目鏡 / 單片眼鏡）
      if (faceItemId === "vr_goggles") {
        const frameMat = new THREE.MeshStandardMaterial({ color: 0x1f2233, roughness: 0.4 });
        const visorMat = new THREE.MeshStandardMaterial({ color: 0x22d3ee, emissive: 0x7b2ff7, emissiveIntensity: 0.85, roughness: 0.18, metalness: 0.2 });
        addPart(faceMount, new THREE.BoxGeometry(0.56, 0.19, 0.12), frameMat, 0, 0.38, 0.46);
        addPart(faceMount, new THREE.BoxGeometry(0.5, 0.13, 0.06), visorMat, 0, 0.38, 0.5);
      } else if (faceItemId === "holo_monocle") {
        const goldRing = new THREE.MeshStandardMaterial({ color: 0xffd166, emissive: 0xffb703, emissiveIntensity: 0.35, roughness: 0.3 });
        const holoMat = new THREE.MeshBasicMaterial({ color: 0x22d3ee, transparent: true, opacity: 0.65 });
        addPart(faceMount, new THREE.TorusGeometry(0.095, 0.016, 8, 16), goldRing, 0.185, 0.38, 0.47);
        addPart(faceMount, new THREE.BoxGeometry(0.22, 0.14, 0.01), holoMat, 0.39, 0.48, 0.45, 0, -0.35, 0.08);
      }

      // 3. 外披（圍裙 / 魔法師斗篷）
      if (outerId === "barista_apron") {
        const apronMat = new THREE.MeshStandardMaterial({ color: 0x7b5a43, roughness: 0.55 });
        const goldStar = new THREE.MeshStandardMaterial({ color: 0xffd166, emissive: 0xffb703, emissiveIntensity: 0.3 });
        addPart(outerMount, new THREE.CylinderGeometry(0.26, 0.36, 0.52, 12, 1, false, -Math.PI * 0.38, Math.PI * 0.76), apronMat, 0, 0.62, 0.02);
        addPart(outerMount, new THREE.OctahedronGeometry(0.075, 0), goldStar, 0, 0.72, 0.32, 0, 0, 0, 1, 1, 0.35);
      } else if (outerId === "star_cloak") {
        const cloakMat = new THREE.MeshStandardMaterial({ color: 0x3b2a6b, roughness: 0.55 });
        const starMat = new THREE.MeshStandardMaterial({ color: 0xffd166, emissive: 0xffd166, emissiveIntensity: 0.55 });
        addPart(outerMount, new THREE.ConeGeometry(0.46, 0.74, 12, 1, true, Math.PI * 0.45, Math.PI * 1.1), cloakMat, 0, 0.58, -0.08, 0.12, 0, 0);
        addPart(outerMount, new THREE.OctahedronGeometry(0.065, 0), starMat, 0, 0.84, 0.27, 0, 0, 0, 1, 1, 0.4);
      }

      // 4. 武器（掛載於右手手心，向前斜舉不穿模）
      if (weaponId === "binary_saber") {
        const hiltMat = new THREE.MeshStandardMaterial({ color: 0x4b5563, metalness: 0.6, roughness: 0.3 });
        const bladeMat = new THREE.MeshStandardMaterial({ color: 0x7df9ff, emissive: 0x00e5ff, emissiveIntensity: 1.0, roughness: 0.15 });
        addPart(weaponMount, new THREE.CylinderGeometry(0.032, 0.032, 0.22, 8), hiltMat, 0, 0.02, 0.04, Math.PI / 3, 0, 0);
        addPart(weaponMount, new THREE.CylinderGeometry(0.038, 0.038, 0.78, 8), bladeMat, 0, 0.28, 0.44, Math.PI / 3, 0, 0);
      } else if (weaponId === "keyboard_greatsword") {
        const darkMat = new THREE.MeshStandardMaterial({ color: 0x2b2d42, roughness: 0.4 });
        const goldMat = new THREE.MeshStandardMaterial({ color: 0xffd166, roughness: 0.35 });
        const rgbMat = new THREE.MeshStandardMaterial({ color: 0x4cc9f0, emissive: 0xff595e, emissiveIntensity: 0.45 });
        addPart(weaponMount, new THREE.BoxGeometry(0.08, 0.22, 0.06), goldMat, 0, 0.04, 0.05, Math.PI / 3, 0, 0);
        addPart(weaponMount, new THREE.BoxGeometry(0.2, 0.76, 0.05), darkMat, 0, 0.3, 0.44, Math.PI / 3, 0, 0);
        addPart(weaponMount, new THREE.BoxGeometry(0.14, 0.62, 0.06), rgbMat, 0, 0.3, 0.44, Math.PI / 3, 0, 0);
      } else if (weaponId === "python_staff") {
        const woodMat = new THREE.MeshStandardMaterial({ color: 0x8e5a3c, roughness: 0.55 });
        const gemMat = new THREE.MeshStandardMaterial({ color: 0xc4a1ff, emissive: 0x9b5de5, emissiveIntensity: 0.75 });
        addPart(weaponMount, new THREE.CylinderGeometry(0.03, 0.03, 0.92, 8), woodMat, 0, 0.22, 0.28, Math.PI / 3.4, 0, 0);
        addPart(weaponMount, new THREE.OctahedronGeometry(0.14, 0), gemMat, 0, 0.48, 0.65);
      } else if (weaponId === "pixel_hammer") {
        const handleMat = new THREE.MeshStandardMaterial({ color: 0xa1887f, roughness: 0.6 });
        const headBoxMat = new THREE.MeshStandardMaterial({ color: 0xff6bd6, emissive: 0xff924c, emissiveIntensity: 0.3 });
        addPart(weaponMount, new THREE.CylinderGeometry(0.032, 0.032, 0.72, 6), handleMat, 0, 0.16, 0.22, Math.PI / 3.2, 0, 0);
        addPart(weaponMount, new THREE.BoxGeometry(0.36, 0.22, 0.22), headBoxMat, 0, 0.36, 0.5, Math.PI / 3.2, 0, 0);
      }

      // 5. 寵物跟班
      if (petId === "mini_duck") {
        const yel = new THREE.MeshStandardMaterial({ color: 0xffd93d, roughness: 0.4 });
        const org = new THREE.MeshStandardMaterial({ color: 0xff8c42, roughness: 0.45 });
        addPart(petMount, new THREE.SphereGeometry(0.16, 10, 8), yel, 0, 0, 0, 0, 0, 0, 1.0, 0.85, 1.25);
        addPart(petMount, new THREE.SphereGeometry(0.12, 10, 8), yel, 0, 0.16, 0.08);
        addPart(petMount, new THREE.SphereGeometry(0.05, 8, 6), org, 0, 0.14, 0.21, 0, 0, 0, 1.2, 0.6, 1.1);
      } else if (petId === "ai_ghost") {
        const ghostMat = new THREE.MeshStandardMaterial({ color: 0x7df9ff, emissive: 0x3a86ff, emissiveIntensity: 0.7, transparent: true, opacity: 0.9 });
        addPart(petMount, new THREE.SphereGeometry(0.16, 10, 8), ghostMat, 0, 0.08, 0);
        addPart(petMount, new THREE.CylinderGeometry(0.16, 0.18, 0.18, 10), ghostMat, 0, -0.04, 0);
      } else if (petId === "pixel_cat") {
        const blk = new THREE.MeshStandardMaterial({ color: 0x1f1d2b, roughness: 0.5 });
        const yel = new THREE.MeshStandardMaterial({ color: 0xffe14d, emissive: 0xffe14d, emissiveIntensity: 0.8 });
        addPart(petMount, new THREE.BoxGeometry(0.24, 0.22, 0.22), blk, 0, 0.06, 0);
        [-1, 1].forEach((s) => {
          addPart(petMount, new THREE.ConeGeometry(0.055, 0.1, 4), blk, s * 0.08, 0.21, 0);
          addPart(petMount, new THREE.BoxGeometry(0.045, 0.045, 0.02), yel, s * 0.055, 0.09, 0.115);
        });
      } else if (petId === "shiba_drone") {
        const fur = new THREE.MeshStandardMaterial({ color: 0xf39c4a, roughness: 0.45 });
        const cyan = new THREE.MeshStandardMaterial({ color: 0x22d3ee, emissive: 0x22d3ee, emissiveIntensity: 0.8 });
        addPart(petMount, new THREE.SphereGeometry(0.16, 10, 8), fur, 0, 0.04, 0);
        addPart(petMount, new THREE.BoxGeometry(0.22, 0.06, 0.04), cyan, 0, 0.08, 0.14);
        addPart(petMount, new THREE.CylinderGeometry(0.22, 0.22, 0.02, 10), cyan, 0, 0.24, 0);
        [-1, 1].forEach((s) => addPart(petMount, new THREE.ConeGeometry(0.05, 0.1, 5), fur, s * 0.1, 0.2, 0));
      }

      // 6. 頭頂光環
      if (auraId === "note_halo") {
        const haloMat = new THREE.MeshStandardMaterial({ color: 0xffe066, emissive: 0xffd166, emissiveIntensity: 0.85, roughness: 0.2 });
        const haloY = (headId === "star_crown" || hairId === "male_gojo" || hairId === "male_bakugo" || hairId === "male_hinata" || hairId === "female_anya") ? 0.16 : 0.0;
        addPart(auraMount, new THREE.TorusGeometry(0.32, 0.032, 8, 22), haloMat, 0, haloY, 0, Math.PI / 2, 0, 0);
      }

      // 7. 傳說坐騎：黃金鍵盤浮空滑板（抬升角色站立於滑板之上不穿模）
      const onBoard = mountId === "golden_board";
      bodyPivot.position.y = onBoard ? 0.24 : 0;
      if (onBoard) {
        const goldBoard = new THREE.MeshStandardMaterial({ color: 0xffd23f, emissive: 0xb8860b, emissiveIntensity: 0.25, roughness: 0.28, metalness: 0.45 });
        const keyCap = new THREE.MeshStandardMaterial({ color: 0xfff8e1, roughness: 0.35 });
        const thruster = new THREE.MeshStandardMaterial({ color: 0x22d3ee, emissive: 0x22d3ee, emissiveIntensity: 0.95 });
        addPart(mountGroup, new THREE.BoxGeometry(0.72, 0.08, 1.38), goldBoard, 0, 0.18, 0.04);
        for (let k = -2; k <= 2; k++) {
          addPart(mountGroup, new THREE.BoxGeometry(0.46, 0.035, 0.16), keyCap, 0, 0.235, 0.04 + k * 0.22);
        }
        addPart(mountGroup, new THREE.SphereGeometry(0.11, 8, 6), thruster, 0, 0.12, -0.42, 0, 0, 0, 1.2, 0.55, 1.2);
        addPart(mountGroup, new THREE.SphereGeometry(0.11, 8, 6), thruster, 0, 0.12, 0.48, 0, 0, 0, 1.2, 0.55, 1.2);
      }

      // 動態調整頭頂班級座號名牌高度，避免與高髮型／皇冠／滑板重疊
      let spriteY = 2.68;
      if (hairId === "male_gojo" || hairId === "male_bakugo" || hairId === "male_hinata" || hairId === "female_anya") spriteY += 0.18;
      if (headId === "star_crown" || headId === "shiba_ears" || headId === "esports_headset") spriteY += 0.18;
      if (auraId === "note_halo") spriteY += 0.16;
      if (onBoard) spriteY += 0.24;
      badgeSprite.position.y = spriteY;
    }

    function syncAvatarAppearance() {
      try {
        const av = window.AvatarSystem;
        const st = av && typeof av.getState === "function" ? av.getState() : null;
        const look = av && typeof av.normalizeLook === "function"
          ? av.normalizeLook(st && st.look)
          : Object.assign({ hair: "male_gojo", hairColor: "silver", face: "calm" }, (st && st.look) || {});
        const colors = (av && av.HAIR_COLORS) || [
          { id: "silver", c: "#F1F5F9", s: "#B8C7D9", hl: "#38BDF8" },
          { id: "crimson", c: "#27161B", bot: "#991B1B", s: "#450A0A", hl: "#EF4444" },
          { id: "gold", c: "#FACC15", s: "#CA8A04", hl: "#F97316" },
          { id: "orange", c: "#FB923C", s: "#C2410C", hl: "#18181B" },
          { id: "pink", c: "#F9A8D4", s: "#DB2777", hl: "#FACC15" },
          { id: "flameblack", c: "#1F1B24", mid: "#FB7185", bot: "#F97316", s: "#EA580C", hl: "#F472B6" },
          { id: "teal", c: "#2DD4BF", s: "#0F766E", hl: "#EC4899" },
          { id: "black", c: "#2B2E4D", s: "#17182B", hl: "#FF4D8D" }
        ];
        const hc = (av && typeof av.getHairPalette === "function")
          ? av.getHairPalette(look.hair, look.hairColor)
          : (colors.find((x) => x.id === look.hairColor) || colors[0]);
        const eq = (st && st.equipped) || {};
        const headId = eq.head || "";

        rebuildFace3D(look.face, hc.s, look.hair, eq.face || "");
        rebuildHair3D(look.hair, hc, headId);
        rebuildGear3D(eq, look.hair);
      } catch (err) {
        console.error("[island_3d] syncAvatarAppearance error:", err);
      }
    }

    syncAvatarAppearance();

    return {
      root,
      bodyPivot,
      leftArm,
      rightArm,
      leftLeg,
      rightLeg,
      headGroup,
      leafBulb,
      petMount,
      auraMount,
      badgeSprite,
      syncAvatarAppearance
    };
  }

  const studentChar = createClayStudentCharacter();
  scene.add(studentChar.root);

  const safeSyncAvatarAppearance = () => {
    try {
      studentChar.syncAvatarAppearance();
    } catch (err) {
      console.error("[island_3d] safeSyncAvatarAppearance error:", err);
    }
  };
  document.addEventListener("ii:avatar-changed", safeSyncAvatarAppearance);
  document.addEventListener("avatarUpdated", safeSyncAvatarAppearance);
  document.addEventListener("ii:login", safeSyncAvatarAppearance);
  document.addEventListener("ii:logout", safeSyncAvatarAppearance);
  window.addEventListener("storage", safeSyncAvatarAppearance);

  // 預設起始位置：第 0 座島（電腦探險島 sys）碼頭
  let currentIslandIndex = 0;
  const initIslandRec = islandRecords[0];
  studentChar.root.position.copy(initIslandRec.dockPos);
  studentChar.root.rotation.y = initIslandRec.inwardAngle;

  /* ============================================================
   * 7. 點擊互動：Raycaster 偵測島嶼、1.2 秒曲線彈跳跑動與 openIslandDrawer
   * ============================================================ */
  function openIslandDrawer(islandId, tab, unitKey) {
    if (
      typeof window.openIslandDrawer === "function" &&
      window.openIslandDrawer !== openIslandDrawer
    ) {
      window.openIslandDrawer(islandId, tab, unitKey);
      return;
    }
    if (typeof window.openIsland === "function") {
      window.openIsland(islandId, tab || "標準", unitKey || null);
      return;
    }
    const svgIsland = document.querySelector(`#map .island[data-id="${islandId}"]`);
    if (svgIsland) {
      svgIsland.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
    }
  }
  if (typeof window.openIslandDrawer !== "function") {
    window.openIslandDrawer = openIslandDrawer;
  }

  const raycaster = new THREE.Raycaster();
  const pointerNDC = new THREE.Vector2();
  const MOVE_DURATION = 1.2; // 1.2 秒內沿曲線平滑跑向目標碼頭

  const moveState = {
    active: false,
    curve: null,
    startTime: 0,
    duration: MOVE_DURATION,
    targetIndex: 0,
    targetIslandId: null
  };

  let hoveredIslandRec = null;
  let hoveredNpcIslandRec = null;
  let hoveredSanctuary = false;
  let hoveredAetherCitadel = false;
  let pointerDownPos = null;
  let pointerDownTime = 0;

  /* ============================================================
   * 中央聖殿島：封印提示訊息與「國中資訊科技全域領航證書」Modal
   * ============================================================ */
  const sealToastEl = document.createElement("div");
  sealToastEl.id = "sanctuarySealToast";
  sealToastEl.className = "sanctuary-seal-toast";
  sealToastEl.setAttribute("role", "status");
  sealToastEl.setAttribute("aria-live", "polite");
  mapWrap.appendChild(sealToastEl);

  let sealToastTimer = null;
  const SEAL_MESSAGE = "迷霧深處沉睡著資訊聖殿……需集齊 7 座島嶼完全繁榮方能喚醒。";

  function buildSanctuaryTaskBannerHtml() {
    const cfg = window.CloudConfig && typeof window.CloudConfig.get === "function" ? window.CloudConfig.get() : null;
    if (!cfg) return "";
    const ann = String(cfg.announcement || "").trim();
    const rawUrl = String(cfg.taskLinkUrl || "").trim();
    const safeUrl = (window.CloudConfig && typeof window.CloudConfig.sanitizeUrl === "function")
      ? window.CloudConfig.sanitizeUrl(rawUrl)
      : rawUrl;
    if (!ann && !safeUrl) return "";
    const escTxt = (s) => String(s || "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
    const btnLabel = String(cfg.taskLinkTitle || "").trim() || "前往任務連結";
    return `<div class="sanctuary-task-banner">
      <div class="stb-title">📢 今日上課任務公告</div>
      ${ann ? `<div class="stb-msg">${escTxt(ann).replace(/\n/g, "<br>")}</div>` : ""}
      ${safeUrl ? `<a class="stb-btn" href="${escTxt(safeUrl)}" target="_blank" rel="noopener noreferrer">🚀 ${escTxt(btnLabel)}</a>` : ""}
    </div>`;
  }

  function showSanctuarySealPrompt() {
    const taskHtml = buildSanctuaryTaskBannerHtml();
    const pillsHtml = sealPillars
      .map(
        (p) =>
          `<span class="seal-pill${p.isLit ? " lit" : ""}" style="--c:${p.colorHex}">${p.emoji} ${p.name} ${
            p.isLit ? "✔ 100%" : "🔒"
          }</span>`
      )
      .join("");
    sealToastEl.classList.toggle("has-task", !!taskHtml);
    sealToastEl.innerHTML = `${taskHtml}<div class="seal-msg">🔒 ${SEAL_MESSAGE}</div><div class="seal-pillars-bar">${pillsHtml}</div>`;
    sealToastEl.classList.add("show");
    if (sealToastTimer) clearTimeout(sealToastTimer);
    sealToastTimer = setTimeout(() => {
      sealToastEl.classList.remove("show");
    }, taskHtml ? 8500 : 4500);
  }

  // 建立「國中資訊科技全域領航證書」Modal
  const certModalWrap = document.createElement("div");
  certModalWrap.id = "certModal";
  certModalWrap.className = "modal-wrap";
  certModalWrap.innerHTML = `
    <div class="modal cert-modal" role="dialog" aria-modal="true" aria-labelledby="certTitle">
      <button class="close" id="certCloseBtn" aria-label="關閉">✕</button>
      <div id="certTaskBanner"></div>
      <div id="certificateCard" class="cert-card">
        <div class="cert-header">
          <span class="cert-Header-badge" id="certSchoolBadge">🏛️ 資訊聖殿島 · 終極榮譽證書</span>
          <h2 id="certTitle">國中資訊科技全域領航證書</h2>
          <p class="cert-en">JUNIOR HIGH INFORMATION TECHNOLOGY GRAND NAVIGATOR CERTIFICATE</p>
        </div>
        <div class="cert-student-banner">
          <div class="cert-student-main">
            <div class="cert-honor">👑 全域領航獲獎學員</div>
            <div class="cert-name" id="certStudentWho">載入中…</div>
            <p class="cert-desc">茲證明該生已完成資訊課程島七大核心領域挑戰，全數達成 <b>100% 滿分完全繁榮（Lv.3）</b>，成功喚醒中央資訊聖殿，具備卓越資訊科技素養。</p>
          </div>
          <div class="cert-stamp">🏛️ 資訊聖殿認證<br>七島滿分通過</div>
        </div>
        <div class="cert-grid">
          <div class="cert-radar-wrap">
            <h4>📊 資訊素養七向度滿分雷達圖</h4>
            <div class="cert-radar-box">
              <canvas id="certRadarCanvas" width="320" height="300" aria-label="七向度滿分雷達圖" role="img"></canvas>
            </div>
          </div>
          <div class="cert-islands-list" id="certIslandsList"></div>
        </div>
        <div class="cert-footer">
          <span id="certSerialNo">證書編號：II-SANCTUARY-0001</span>
          <span id="certIssueDate">核發日期：</span>
        </div>
      </div>
      <div class="cert-actions">
        <button type="button" class="btn-cert-download" id="downloadCertBtn">📥 下載證書圖片 (html2canvas)</button>
        <button type="button" class="btn-ghost btn-confetti-retrigger" id="certConfettiBtn" aria-label="再次施放彩帶" onclick="window.retriggerConfetti && window.retriggerConfetti(event)">🎉 再次施放彩帶</button>
        <button type="button" class="btn-ghost" id="certDoneBtn">關閉</button>
      </div>
    </div>
  `;
  document.body.appendChild(certModalWrap);

  let certRadarChart = null;

  function closeCertModal() {
    certModalWrap.classList.remove("show");
  }
  certModalWrap.querySelector("#certCloseBtn").onclick = closeCertModal;
  certModalWrap.querySelector("#certDoneBtn").onclick = closeCertModal;

  const bindConfettiBtn = () => {
    const confettiBtn = certModalWrap.querySelector("#certConfettiBtn");
    if (confettiBtn) {
      confettiBtn.onclick = (e) => {
        console.log("[Confetti] 再次施放彩帶觸發");
        launchCelebrationConfetti(e);
      };
    }
  };
  bindConfettiBtn();

  certModalWrap.addEventListener("click", (e) => {
    if (e.target === certModalWrap) closeCertModal();
  });
  document.addEventListener("keydown", (e) => {
    if (window.shouldSkipGlobalEvent && window.shouldSkipGlobalEvent(e)) return;
    if (e.key === "Escape" && certModalWrap.classList.contains("show")) closeCertModal();
  });

  function drawFallbackRadarCanvas(canvas, labels, colors) {
    const ctx = canvas.getContext("2d");
    const w = canvas.width || 320;
    const h = canvas.height || 300;
    ctx.clearRect(0, 0, w, h);
    const cx = w / 2;
    const cy = h / 2 + 6;
    const maxR = Math.min(w, h) * 0.34;
    const n = labels.length;

    // 繪製五層網格
    for (let step = 1; step <= 5; step++) {
      const r = (step / 5) * maxR;
      ctx.beginPath();
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2 - Math.PI / 2;
        const x = cx + Math.cos(a) * r;
        const y = cy + Math.sin(a) * r;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.strokeStyle = "rgba(255, 255, 255, 0.2)";
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    // 滿分 100% 金色多邊形區域
    ctx.beginPath();
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 - Math.PI / 2;
      const x = cx + Math.cos(a) * maxR;
      const y = cy + Math.sin(a) * maxR;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fillStyle = "rgba(255, 209, 102, 0.35)";
    ctx.fill();
    ctx.strokeStyle = "#ffd166";
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // 頂點與文字
    ctx.font = "bold 12px 'Noto Sans TC', sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 - Math.PI / 2;
      const px = cx + Math.cos(a) * maxR;
      const py = cy + Math.sin(a) * maxR;
      ctx.beginPath();
      ctx.arc(px, py, 5, 0, Math.PI * 2);
      ctx.fillStyle = colors[i] || "#ffd166";
      ctx.fill();
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 1.5;
      ctx.stroke();

      const lx = cx + Math.cos(a) * (maxR + 26);
      const ly = cy + Math.sin(a) * (maxR + 20);
      ctx.fillStyle = "#eaf4ff";
      ctx.fillText(labels[i], lx, ly);
    }
  }

  function openSanctuaryCertificateModal() {
    const p = window.Store && window.Store.profile;
    const school = (window.APP_CONFIG && window.APP_CONFIG.SCHOOL) || "資訊課程島學園";
    const gradeMap = { "7": "七", "8": "八", "9": "九" };

    let studentText = "榮譽領航員（訪客體驗模式）";
    let fileSuffix = "榮譽領航員";
    let serialCode = "II-700-GUEST";

    if (p && p.cls && p.seat && p.name) {
      const gChar = gradeMap[String(p.cls)[0]] || String(p.cls)[0];
      const roomNum = parseInt(String(p.cls).slice(1), 10) || String(p.cls).slice(1);
      studentText = `${gChar}年${roomNum}班 ${p.seat}號 · ${p.name}`;
      fileSuffix = `${p.cls}_${p.seat}_${p.name}`;
      serialCode = `II-${p.cls}-${String(p.seat).padStart(2, "0")}-100`;
    }

    const now = new Date();
    const dateStr = `${now.getFullYear()} 年 ${String(now.getMonth() + 1).padStart(2, "0")} 月 ${String(
      now.getDate()
    ).padStart(2, "0")} 日`;

    const certTaskBannerEl = certModalWrap.querySelector("#certTaskBanner");
    if (certTaskBannerEl) certTaskBannerEl.innerHTML = buildSanctuaryTaskBannerHtml();
    certModalWrap.querySelector("#certSchoolBadge").textContent = `🏛️ ${school} · 終極榮譽證書`;
    certModalWrap.querySelector("#certStudentWho").textContent = studentText;
    certModalWrap.querySelector("#certSerialNo").textContent = `證書編號：${serialCode}`;
    certModalWrap.querySelector("#certIssueDate").textContent = `核發日期：${dateStr}`;
    certModalWrap.dataset.fileSuffix = fileSuffix;

    const listEl = certModalWrap.querySelector("#certIslandsList");
    listEl.innerHTML = ISLANDS_DATA.slice(0, 7)
      .map((isl) => {
        const comp = (!grandFinalePreview && typeof window.calculateIslandCompletion === "function")
          ? window.calculateIslandCompletion(isl.id)
          : null;
        const pct = grandFinalePreview ? 100 : (comp ? comp.percentage : 0);
        const lv = computeCompletionLevel(pct);
        const stageText = comp ? `${comp.passedStages}/${comp.totalStages} 關` : `${pct}%`;
        return `
        <div class="cert-island-item" style="--c:${isl.color}">
          <span>${isl.emoji} <b>${isl.name}</b> <small style="color:#a9c3dc">(${isl.tag})</small></span>
          <span class="ci-tag">Lv.${lv} · ${pct}%${pct >= 100 ? " 滿分" : ` (${stageText})`}</span>
        </div>`;
      })
      .join("");

    certModalWrap.classList.add("show");
    bindConfettiBtn();

    // 繪製 7 向度滿分雷達圖
    const canvas = certModalWrap.querySelector("#certRadarCanvas");
    const labels = ISLANDS_DATA.slice(0, 7).map((i) => i.name);
    const colors = ISLANDS_DATA.slice(0, 7).map((i) => i.color);
    const scores = ISLANDS_DATA.slice(0, 7).map((i) => {
      if (grandFinalePreview) return 100;
      const comp = typeof window.calculateIslandCompletion === "function"
        ? window.calculateIslandCompletion(i.id)
        : null;
      if (comp) return comp.percentage;
      const rec = islandRecords.find((r) => r.id === i.id);
      return rec ? (rec.progressPct || 0) : 0;
    });

    if (typeof Chart !== "undefined") {
      if (certRadarChart) certRadarChart.destroy();
      certRadarChart = new Chart(canvas.getContext("2d"), {
        type: "radar",
        data: {
          labels,
          datasets: [
            {
              label: "全域領航滿分",
              data: scores,
              backgroundColor: "rgba(255, 209, 102, 0.34)",
              borderColor: "#ffd166",
              borderWidth: 2.5,
              pointBackgroundColor: colors,
              pointBorderColor: "#ffffff",
              pointRadius: 5,
              pointHoverRadius: 7
            }
          ]
        },
        options: {
          animation: { duration: 350 },
          responsive: true,
          maintainAspectRatio: true,
          aspectRatio: 1.08,
          scales: {
            r: {
              min: 0,
              max: 100,
              ticks: { stepSize: 20, color: "#a9c3dc", backdropColor: "transparent" },
              grid: { color: "rgba(255, 255, 255, 0.22)" },
              angleLines: { color: "rgba(255, 255, 255, 0.22)" },
              pointLabels: { color: "#eaf4ff", font: { size: 12, weight: "700" } }
            }
          },
          plugins: {
            legend: { display: false }
          }
        }
      });
    } else {
      drawFallbackRadarCanvas(canvas, labels, colors);
    }
  }

  window.openSanctuaryCertificateModal = openSanctuaryCertificateModal;

  function ensureHtml2CanvasLoaded() {
    if (typeof window.html2canvas === "function") {
      return Promise.resolve(window.html2canvas);
    }
    return new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = "https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js";
      s.onload = () => resolve(window.html2canvas);
      s.onerror = () => reject(new Error("html2canvas 載入失敗"));
      document.head.appendChild(s);
    });
  }

  certModalWrap.querySelector("#downloadCertBtn").addEventListener("click", async (e) => {
    const btn = e.currentTarget;
    const origText = btn.textContent;
    btn.disabled = true;
    btn.textContent = "⏳ 正在產製高解析證書圖片…";
    try {
      const h2c = await ensureHtml2CanvasLoaded();
      const cardEl = document.getElementById("certificateCard");
      const shotCanvas = await h2c(cardEl, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#0a1e38"
      });
      const link = document.createElement("a");
      const suffix = certModalWrap.dataset.fileSuffix || "領航員";
      link.download = `國中資訊科技全域領航證書_${suffix}.png`;
      link.href = shotCanvas.toDataURL("image/png");
      document.body.appendChild(link);
      link.click();
      link.remove();
      btn.textContent = "✅ 證書圖片已下載！";
      setTimeout(() => {
        btn.textContent = origText;
        btn.disabled = false;
      }, 1800);
    } catch (err) {
      console.error("[island_3d] 證書匯出失敗:", err);
      btn.textContent = "⚠ 匯出失敗，請重試";
      setTimeout(() => {
        btn.textContent = origText;
        btn.disabled = false;
      }, 2000);
    }
  });

  /* ============================================================
   * 島嶼守護 NPC 點擊對話氣泡 (2D HTML Overlay) 與碼頭迎賓機制
   * ============================================================ */
  const npcSpeechBubbleEl = document.createElement("div");
  npcSpeechBubbleEl.id = "npcSpeechBubble";
  npcSpeechBubbleEl.className = "npc-speech-bubble";
  npcSpeechBubbleEl.setAttribute("role", "status");
  npcSpeechBubbleEl.setAttribute("aria-live", "polite");
  mapWrap.appendChild(npcSpeechBubbleEl);

  let activeBubbleNpc = null;
  let npcBubbleTimer = null;
  const tempProjVec = new THREE.Vector3();

  function updateNpcBubbleScreenPosition() {
    if (!activeBubbleNpc || !npcSpeechBubbleEl.classList.contains("show")) return;
    tempProjVec.copy(activeBubbleNpc.root.position);
    tempProjVec.y += 2.25;
    tempProjVec.project(camera);

    const rect = renderer.domElement.getBoundingClientRect();
    const sx = (tempProjVec.x * 0.5 + 0.5) * rect.width + rect.left;
    const sy = (-tempProjVec.y * 0.5 + 0.5) * rect.height + rect.top;

    // 限制在視窗安全邊界內避免超出畫面
    const clampedX = Math.max(150, Math.min(window.innerWidth - 150, sx));
    const clampedY = Math.max(105, Math.min(window.innerHeight - 40, sy));
    npcSpeechBubbleEl.style.left = `${clampedX}px`;
    npcSpeechBubbleEl.style.top = `${clampedY}px`;
  }

  function hideNpcSpeechBubble() {
    if (npcBubbleTimer) {
      clearTimeout(npcBubbleTimer);
      npcBubbleTimer = null;
    }
    npcSpeechBubbleEl.classList.remove("show");
    activeBubbleNpc = null;
  }

  function showNpcSpeechBubble(npc) {
    if (!npc) return;
    const quotes = Array.isArray(npc.quotes) && npc.quotes.length ? npc.quotes : ["歡迎來到資訊課程島！"];
    const quoteText = quotes[npc.quoteCursor % quotes.length];
    npc.quoteCursor = (npc.quoteCursor + 1) % quotes.length;

    npcSpeechBubbleEl.style.setProperty("--npc-accent", npc.color || "#4fb3ff");
    npcSpeechBubbleEl.innerHTML = `
      <span class="npc-bubble-tag">${npc.emoji} ${npc.name}</span>
      <p class="npc-bubble-quote">${quoteText}</p>
      <div class="npc-bubble-hint">💬 點擊守護島民切換金句 · 3 秒自動收起</div>
    `;
    activeBubbleNpc = npc;
    npc.talkBounceStart = clock.getElapsedTime();
    npcSpeechBubbleEl.classList.add("show");
    updateNpcBubbleScreenPosition();

    if (window.AudioManager && typeof window.AudioManager.playClick === "function") {
      window.AudioManager.playClick();
    }

    if (npcBubbleTimer) clearTimeout(npcBubbleTimer);
    npcBubbleTimer = setTimeout(() => {
      hideNpcSpeechBubble();
    }, 3000);
  }

  npcSpeechBubbleEl.addEventListener("click", (e) => {
    e.stopPropagation();
    if (activeBubbleNpc) {
      showNpcSpeechBubble(activeBubbleNpc);
    }
  });

  function triggerDockGreeting(islandIdx, frameTime) {
    const now = typeof frameTime === "number" ? frameTime : clock.getElapsedTime();
    const npc = guardianNPCs[islandIdx];
    if (npc) {
      npc.greetStart = now;
      npc.greetDuration = 1.15;
      if (npc.exclSprite) npc.exclSprite.visible = true;
    }
    islandCritters.forEach((cr) => {
      if (cr.islandIndex === islandIdx) {
        cr.greetStart = now;
        cr.greetDuration = 1.15;
        if (cr.exclSprite) cr.exclSprite.visible = true;
      }
    });
  }

  function findGuardianNPCFromHit(object3d) {
    let cur = object3d;
    while (cur) {
      if (cur.userData && cur.userData.isGuardianNPC && cur.userData.npcId) {
        return guardianNPCs.find((n) => n.id === cur.userData.npcId) || null;
      }
      cur = cur.parent;
    }
    return null;
  }

  function findIslandRecordFromHit(object3d) {
    let cur = object3d;
    while (cur) {
      if (cur.userData && cur.userData.islandId) {
        return islandRecords.find((r) => r.id === cur.userData.islandId) || null;
      }
      cur = cur.parent;
    }
    return null;
  }

  function findNpcIslandRecordFromHit(object3d) {
    let cur = object3d;
    while (cur) {
      if (cur.userData && cur.userData.npcIslandId) {
        return npcIslandRecords.find((r) => r.id === cur.userData.npcIslandId) || null;
      }
      cur = cur.parent;
    }
    return null;
  }

  function isSanctuaryHit(object3d) {
    let cur = object3d;
    while (cur) {
      if (cur === mysteryReefGroup || (cur.userData && cur.userData.isSanctuary)) {
        return true;
      }
      cur = cur.parent;
    }
    return false;
  }

  function isAetherCitadelHit(object3d) {
    let cur = object3d;
    while (cur) {
      if (cur === aetherCitadelGroup || cur === citadelAscensionGroup || (cur.userData && cur.userData.isAetherCitadel)) {
        return true;
      }
      cur = cur.parent;
    }
    return false;
  }

  function updatePointerNDC(event) {
    const rect = renderer.domElement.getBoundingClientRect();
    pointerNDC.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    pointerNDC.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  }

  function pickSceneTargetAtEvent(event) {
    updatePointerNDC(event);
    raycaster.setFromCamera(pointerNDC, camera);

    // 1. 優先偵測是否點擊或懸停於任意【島嶼守護 NPC】（避免被上方懸浮島名牌 Sprite 遮擋）
    const npcHits = raycaster.intersectObjects(guardianNPCsGroup.children, true);
    for (let i = 0; i < npcHits.length; i++) {
      const obj = npcHits[i].object;
      if (obj.type === "Sprite") continue;
      const npc = findGuardianNPCFromHit(obj);
      if (npc) {
        return { type: "npc", npc };
      }
    }

    // 2. 偵測天穹試煉浮島（含解封後之島下光束與懸空星階）、7 大主課程島嶼、中央聖殿島與 7 座主題 NPC 島
    const pickRoots = citadelAscensionGroup.visible
      ? [aetherCitadelGroup, citadelAscensionGroup, ...islandsGroup.children, mysteryReefGroup, ...npcIsletGroup.children]
      : [aetherCitadelGroup, ...islandsGroup.children, mysteryReefGroup, ...npcIsletGroup.children];
    const hits = raycaster.intersectObjects(pickRoots, true);
    const hasCitadelHit = hits.some((h) => isAetherCitadelHit(h.object));
    for (let i = 0; i < hits.length; i++) {
      const obj = hits[i].object;
      if (hasCitadelHit && obj === reefHitMesh) continue;
      if (hasCitadelHit && obj.type === "Sprite" && !isAetherCitadelHit(obj)) continue;
      if (isAetherCitadelHit(obj)) {
        return { type: "aetherCitadel" };
      }
      if (isSanctuaryHit(obj)) {
        return { type: "sanctuary" };
      }
      const rec = findIslandRecordFromHit(obj);
      if (rec) {
        if (rec.dimmed) continue; // 不符合年級篩選的島嶼暫停互動
        return { type: "island", rec };
      }
      const npcRec = findNpcIslandRecordFromHit(obj);
      if (npcRec) {
        return { type: "npcIsland", rec: npcRec };
      }
    }
    return null;
  }

  function startRunToIsland(targetRec) {
    if (!targetRec) return;
    hideNpcSpeechBubble();
    sanctuaryState.studentAtPlaza = false;
    const startPos = studentChar.root.position.clone();
    const travelCurve = buildTravelCurve(startPos, currentIslandIndex, targetRec.index);

    moveState.active = true;
    moveState.curve = travelCurve;
    moveState.startTime = clock.getElapsedTime();
    moveState.duration = MOVE_DURATION;
    moveState.targetIndex = targetRec.index;
    moveState.targetIslandId = targetRec.id;
    moveState.greetingTriggered = false;
  }

  const clock = new THREE.Clock();

  /* ============================================================
   * 鏡頭控制升級：精緻特寫聚焦模式 (Focus Mode) 與平滑微縮全景重置
   * ============================================================ */
  const cameraFocusState = {
    active: false,
    startTime: 0,
    duration: 1.15,
    fromCamPos: new THREE.Vector3(),
    toCamPos: new THREE.Vector3(),
    fromTarget: new THREE.Vector3(),
    toTarget: new THREE.Vector3(),
    isFocused: false,
    focusedIslandId: null
  };

  function focusOnIsland(rec) {
    if (!rec) return;
    cameraIntroState.active = false;
    cameraFocusState.active = true;
    cameraFocusState.startTime = clock.getElapsedTime();
    cameraFocusState.duration = 1.15;
    cameraFocusState.fromCamPos.copy(camera.position);
    cameraFocusState.fromTarget.copy(controls.target);

    // 目標島嶼視覺中心 (中層台地 y≈3.04 與頂層高台 y≈5.08 之間，約 y=3.8)
    const targetCenter = new THREE.Vector3(rec.group.position.x, 3.8, rec.group.position.z);
    cameraFocusState.toTarget.copy(targetCenter);

    // 相機滑翔至該島斜上方約 45 度（特寫視角適度後退適應 1.4 倍放大建築）
    cameraFocusState.toCamPos.set(
      targetCenter.x,
      targetCenter.y + 22.0,
      targetCenter.z + 23.5
    );

    cameraFocusState.isFocused = true;
    cameraFocusState.focusedIslandId = rec.id;
  }

  function focusOnNpcIsland(rec) {
    if (!rec || !rec.group) return;
    cameraIntroState.active = false;
    cameraFocusState.active = true;
    cameraFocusState.startTime = clock.getElapsedTime();
    cameraFocusState.duration = 1.05;
    cameraFocusState.fromCamPos.copy(camera.position);
    cameraFocusState.fromTarget.copy(controls.target);

    const targetCenter = new THREE.Vector3(rec.group.position.x, 2.2, rec.group.position.z);
    cameraFocusState.toTarget.copy(targetCenter);
    cameraFocusState.toCamPos.set(targetCenter.x, targetCenter.y + 15.5, targetCenter.z + 17.5);

    cameraFocusState.isFocused = true;
    cameraFocusState.focusedIslandId = rec.id;
  }

  function focusOnSanctuary() {
    cameraIntroState.active = false;
    cameraFocusState.active = true;
    cameraFocusState.startTime = clock.getElapsedTime();
    cameraFocusState.duration = 1.25;
    cameraFocusState.fromCamPos.copy(camera.position);
    cameraFocusState.fromTarget.copy(controls.target);

    const targetCenter = new THREE.Vector3(0, 14.0, 0);
    cameraFocusState.toTarget.copy(targetCenter);
    cameraFocusState.toCamPos.set(0, targetCenter.y + 28.0, 32.0);

    cameraFocusState.isFocused = true;
    cameraFocusState.focusedIslandId = "sanctuary";
  }

  function focusOnGrandFinale() {
    cameraIntroState.active = false;
    cameraFocusState.active = true;
    cameraFocusState.startTime = clock.getElapsedTime();
    cameraFocusState.duration = 1.25;
    cameraFocusState.fromCamPos.copy(camera.position);
    cameraFocusState.fromTarget.copy(controls.target);

    cameraFocusState.toTarget.set(0, 21.0, 0);
    cameraFocusState.toCamPos.set(0, 50.0, 68.0);

    cameraFocusState.isFocused = true;
    cameraFocusState.focusedIslandId = "sanctuary";
  }

  function focusOnAetherCitadel() {
    cameraIntroState.active = false;
    cameraFocusState.active = true;
    cameraFocusState.startTime = clock.getElapsedTime();
    cameraFocusState.duration = 1.15;
    cameraFocusState.fromCamPos.copy(camera.position);
    cameraFocusState.fromTarget.copy(controls.target);

    cameraFocusState.toTarget.set(CITADEL_BASE_POS.x, CITADEL_BASE_POS.y + 2.4, CITADEL_BASE_POS.z);
    cameraFocusState.toCamPos.set(CITADEL_BASE_POS.x + 8.5, CITADEL_BASE_POS.y + 17.5, CITADEL_BASE_POS.z + 35.0);

    cameraFocusState.isFocused = true;
    cameraFocusState.focusedIslandId = "aetherCitadel";
  }

  function flyToIsland(islandId) {
    if (islandId === "aetherCitadel") {
      focusOnAetherCitadel();
      return;
    }
    if (islandId === "sanctuary") {
      focusOnSanctuary();
      return;
    }
    const rec = islandRecords.find((r) => r.id === islandId);
    if (!rec) return;
    setPlayerCursorTarget(rec.id, { persist: true });
    focusOnIsland(rec);
    startRunToIsland(rec);
    moveState.targetIslandId = null;
  }

  function resetCameraToPanorama() {
    cameraIntroState.active = false;
    cameraFocusState.active = true;
    cameraFocusState.startTime = clock.getElapsedTime();
    cameraFocusState.duration = 1.2;
    cameraFocusState.fromCamPos.copy(camera.position);
    cameraFocusState.fromTarget.copy(controls.target);

    cameraFocusState.toCamPos.copy(defaultCamPos);
    cameraFocusState.toTarget.copy(defaultCamTarget);

    cameraFocusState.isFocused = false;
    cameraFocusState.focusedIslandId = null;
  }

  let aetherCitadelLoadPromise = null;
  async function openAetherCitadelLazy(opts = {}) {
    if (window.AetherCitadel && typeof window.AetherCitadel.open === "function") {
      window.AetherCitadel.open(opts);
      return;
    }
    const hudBtn = document.getElementById("citadelHudBtn");
    const prevText = hudBtn ? hudBtn.textContent : "";
    if (hudBtn) {
      hudBtn.disabled = true;
      hudBtn.textContent = "⏳ 載入天穹浮島中…";
    }
    if (window.AvatarSystem && typeof window.AvatarSystem.toast === "function") {
      window.AvatarSystem.toast("⏳ 正在載入天穹試煉浮島模組…", "info", 1800);
    }
    try {
      if (!aetherCitadelLoadPromise) {
        aetherCitadelLoadPromise = import("./aetherCitadel.js");
      }
      await aetherCitadelLoadPromise;
      if (typeof attachSceneModalObservers === "function") {
        attachSceneModalObservers();
      }
      if (window.AetherCitadel && typeof window.AetherCitadel.open === "function") {
        window.AetherCitadel.open(opts);
      }
    } catch (err) {
      aetherCitadelLoadPromise = null;
      console.error("[island_3d] 動態載入天穹試煉浮島失敗:", err);
      if (window.AvatarSystem && typeof window.AvatarSystem.toast === "function") {
        window.AvatarSystem.toast("⚠️ 天穹浮島模組載入失敗，請檢查網路後再試一次。", "warn", 3200);
      }
    } finally {
      if (hudBtn) {
        hudBtn.disabled = false;
        if (hudBtn.textContent === "⏳ 載入天穹浮島中…") {
          hudBtn.textContent = prevText;
        }
      }
      if (typeof syncCitadelVisualState === "function") {
        syncCitadelVisualState();
      }
    }
  }

  // 綁定全景重置按鈕
  const cameraResetBtnEl = document.getElementById("cameraResetBtn");
  if (cameraResetBtnEl) {
    cameraResetBtnEl.addEventListener("click", (e) => {
      e.stopPropagation();
      resetCameraToPanorama();
    });
  }

  // 建立天穹試煉浮島（中央聖殿）HUD 入口按鈕，並置入第二層藍色檢視膠囊列 (#viewChips)
  if (!document.getElementById("citadelHudBtn")) {
    const citadelHudBtn = document.createElement("button");
    citadelHudBtn.id = "citadelHudBtn";
    citadelHudBtn.type = "button";
    citadelHudBtn.className = "chip citadel-hud-btn";
    citadelHudBtn.textContent = "🔒 天穹浮島 (0/7)";
    citadelHudBtn.title = "開啟天穹試煉浮島狀態檢核與雙殿堂";
    citadelHudBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      void openAetherCitadelLazy();
    });
    const isMobileViewport = typeof window.matchMedia === "function" && window.matchMedia("(max-width: 767px)").matches;
    const viewChipsEl = document.getElementById("viewChips");
    const mobileUserActionsEl = document.querySelector(".mobile-user-actions");
    const fallbackControlsWrap = cameraResetBtnEl ? cameraResetBtnEl.parentElement : null;
    const mountTarget = isMobileViewport
      ? (mobileUserActionsEl || viewChipsEl || fallbackControlsWrap)
      : (viewChipsEl || fallbackControlsWrap);
    if (mountTarget) {
      mountTarget.appendChild(citadelHudBtn);
    }
    syncCitadelVisualState();
  }

  let hoveredGuardianNpc = null;

  renderer.domElement.addEventListener("pointerdown", (e) => {
    if (window.shouldSkipGlobalEvent && window.shouldSkipGlobalEvent(e)) return;
    if (e.button !== 0 && e.pointerType === "mouse") return;
    pointerDownPos = { x: e.clientX, y: e.clientY };
    pointerDownTime = performance.now();
    // 使用者手動拖曳視角時中止相機自動過渡
    cameraFocusState.active = false;
    cameraIntroState.active = false;
  });

  renderer.domElement.addEventListener("pointermove", (e) => {
    if (window.isTeacherCockpitOpen && window.isTeacherCockpitOpen()) return;
    const picked = pickSceneTargetAtEvent(e);
    hoveredGuardianNpc = picked && picked.type === "npc" ? picked.npc : null;
    hoveredIslandRec = picked && picked.type === "island" ? picked.rec : null;
    hoveredNpcIslandRec = picked && picked.type === "npcIsland" ? picked.rec : null;
    hoveredSanctuary = Boolean(picked && picked.type === "sanctuary");
    hoveredAetherCitadel = Boolean(picked && picked.type === "aetherCitadel");
    stage.style.cursor = picked ? "pointer" : "grab";
  });

  renderer.domElement.addEventListener("pointerup", (e) => {
    if (window.shouldSkipGlobalEvent && window.shouldSkipGlobalEvent(e)) {
      pointerDownPos = null;
      return;
    }
    if (!pointerDownPos) return;
    const dx = e.clientX - pointerDownPos.x;
    const dy = e.clientY - pointerDownPos.y;
    const dist = Math.hypot(dx, dy);
    const dt = performance.now() - pointerDownTime;
    pointerDownPos = null;

    // 區分視角拖曳與點擊（移動距離小於 7px 視為點擊）
    if (dist > 7 || dt > 750) return;

    const picked = pickSceneTargetAtEvent(e);
    if (!picked) {
      hideNpcSpeechBubble();
      // 點擊空白海面或背景時，鏡頭平滑退回微縮全景
      if (cameraFocusState.isFocused) {
        resetCameraToPanorama();
      }
      return;
    }

    if (picked.type === "npc" && picked.npc) {
      // 點擊島嶼守護 NPC：鏡頭不切換，直接於該 NPC 頭頂上方彈出圓角動森風對話框
      showNpcSpeechBubble(picked.npc);
      return;
    }

    hideNpcSpeechBubble();

    if (picked.type === "aetherCitadel") {
      focusOnAetherCitadel();
      void openAetherCitadelLazy();
      return;
    }

    if (picked.type === "sanctuary") {
      focusOnSanctuary();
      if (sanctuaryState.unlocked) {
        launchCelebrationConfetti();
        openSanctuaryCertificateModal();
      } else {
        sanctuaryState.sealClickPulseTime = clock.getElapsedTime();
        showSanctuarySealPrompt();
      }
      return;
    }

    if (picked.type === "island" && picked.rec) {
      setPlayerCursorTarget(picked.rec.id, { persist: true });
      focusOnIsland(picked.rec);
      startRunToIsland(picked.rec);
      return;
    }

    if (picked.type === "npcIsland" && picked.rec) {
      focusOnNpcIsland(picked.rec);
      if (typeof window.openNpcIslandModal === "function") {
        window.openNpcIslandModal(picked.rec.id);
      }
    }
  });

  /* ============================================================
   * 日夜模式切換邏輯
   * ============================================================ */
  const dnStateLabel = toggleBtn.querySelector("#dnStateLabel");

  // 四層大環境生態（淺灘浪花/礁石拱門、巡航船與浮標、魚群海豚、積雲熱氣球海鷗紙飛機）
  // 只讀取主島與 NPC 島座標進行避讓，不修改任何島嶼、吊橋與計分邏輯
  if (typeof window.createOceanEnvironment === "function") {
    try {
      oceanEnv = window.createOceanEnvironment({
        THREE,
        scene,
        islandRecords,
        npcIslandRecords,
        ringRadius,
        isNight
      });
    } catch (err) {
      console.warn("[oceanEnvironment] 初始化失敗，已略過環境生態層：", err);
      oceanEnv = null;
    }
  }

  let animFrameId = null;
  let lastNightUpdateTime = null;

  const dayFoamColor = foamMat.color.clone();
  const nightBlueTearsFoamColor = new THREE.Color(0x38bdf8);
  const mistDayColor = new THREE.Color(0xdce8f7);
  const mistNightColor = new THREE.Color(0x6c7fa6);
  const cloudDayColor = new THREE.Color(0xffffff);
  const cloudNightColor = new THREE.Color(0x8ca8d6);
  const cloudDayEmissive = new THREE.Color(0xd8eeff);
  const cloudNightEmissive = new THREE.Color(0x1e3566);
  const routeDayColor = new THREE.Color(0xffffff);
  const routeNightColor = new THREE.Color(0xb8e2ff);
  const stoneDayEmissive = new THREE.Color(0xd8f3ff);
  const stoneNightEmissive = new THREE.Color(0x3b82c4);

  function applyNightVisuals(nb, t) {
    scene.background.copy(THEME.day.skyBg).lerp(THEME.night.skyBg, nb);
    scene.fog.color.copy(THEME.day.fogColor).lerp(THEME.night.fogColor, nb);

    oceanMat.color.copy(THEME.day.waterColor).lerp(THEME.night.waterColor, nb);
    oceanMat.emissive.copy(THEME.day.waterEmissive).lerp(THEME.night.waterEmissive, nb);
    deepSeaMat.color.copy(THEME.day.deepSeaColor).lerp(THEME.night.deepSeaColor, nb);
    shallowLagoonMat.opacity = THREE.MathUtils.lerp(0.55, 0.25, nb);

    ambientLight.color.copy(THEME.day.ambientColor).lerp(THEME.night.ambientColor, nb);
    ambientLight.intensity = THREE.MathUtils.lerp(THEME.day.ambientIntensity, THEME.night.ambientIntensity, nb);

    hemiLight.color.copy(THEME.day.hemiSky).lerp(THEME.night.hemiSky, nb);
    hemiLight.groundColor.copy(THEME.day.hemiGround).lerp(THEME.night.hemiGround, nb);
    hemiLight.intensity = THREE.MathUtils.lerp(THEME.day.hemiIntensity, THEME.night.hemiIntensity, nb);

    mainDirLight.color.copy(THEME.day.dirColor).lerp(THEME.night.dirColor, nb);
    mainDirLight.intensity = THREE.MathUtils.lerp(THEME.day.dirIntensity, THEME.night.dirIntensity, nb);
    mainDirLight.position.lerpVectors(THEME.day.dirPos, THEME.night.dirPos, nb);

    rippleMat.opacity = THREE.MathUtils.lerp(THEME.day.rippleOpacity, THEME.night.rippleOpacity, nb);
    foamMat.opacity = THREE.MathUtils.lerp(THEME.day.foamOpacity, THEME.night.foamOpacity, nb);
    foamMat.color.copy(dayFoamColor).lerp(nightBlueTearsFoamColor, nb);
    for (let i = 0; i < islandRecords.length; i++) {
      const r = islandRecords[i];
      if (r.innerFoamMat) r.innerFoamMat.color.copy(dayFoamColor).lerp(nightBlueTearsFoamColor, nb);
      if (r.outerFoamMat) r.outerFoamMat.color.copy(dayFoamColor).lerp(nightBlueTearsFoamColor, nb);
    }
    reefInnerFoamMat.color.copy(dayFoamColor).lerp(nightBlueTearsFoamColor, nb);
    reefOuterFoamMat.color.copy(dayFoamColor).lerp(nightBlueTearsFoamColor, nb);

    mistMat.color.copy(mistDayColor).lerp(mistNightColor, nb);
    if (!sanctuaryState.awakeningActive) {
      mistMat.opacity = THREE.MathUtils.lerp(0.56, 0.42, nb) * (1 - (sanctuaryState.mistDispersion || 0));
    }

    // 海島碼頭、橋燈光暈與投影水面光斑平滑連動
    for (let i = 0; i < dockLampGlowMaterials.length; i++) {
      const nightGlowOp = 0.36 + Math.sin(t * 3.5 + i) * 0.1;
      dockLampGlowMaterials[i].opacity = THREE.MathUtils.lerp(0.08, nightGlowOp, nb);
    }
    bridgeLampHaloMat.opacity = THREE.MathUtils.lerp(0.14, 0.56 + Math.sin(t * 2.5) * 0.06, nb);
    bridgeLampCoreMat.emissiveIntensity = THREE.MathUtils.lerp(1.4, 2.55, nb);
    const targetBulbOp = THREE.MathUtils.lerp(THEME.day.bulbOpacity, THEME.night.bulbOpacity, nb);
    for (let i = 0; i < dockBulbMaterials.length; i++) {
      dockBulbMaterials[i].opacity = targetBulbOp;
    }
    for (let i = 0; i < dockWaterGlowMaterials.length; i++) {
      dockWaterGlowMaterials[i].opacity = nb * (0.48 + 0.08 * Math.sin(t * 2.6 + i));
    }

    // 夜晚星空螢火蟲與白雲/航線/跳石色調
    fireflyPoints.visible = nb > 0.01;
    fireflyMat.opacity = THREE.MathUtils.lerp(THEME.day.fireflyOpacity, THEME.night.fireflyOpacity, nb);
    cloudMat.color.copy(cloudDayColor).lerp(cloudNightColor, nb);
    cloudMat.emissive.copy(cloudDayEmissive).lerp(cloudNightEmissive, nb);
    cloudMat.opacity = THREE.MathUtils.lerp(0.94, 0.68, nb);

    for (let i = 0; i < routeDashMaterials.length; i++) {
      const dMat = routeDashMaterials[i];
      dMat.opacity = THREE.MathUtils.lerp(0.52, 0.38, nb);
      dMat.color.copy(routeDayColor).lerp(routeNightColor, nb);
    }
    stoneMat.emissive.copy(stoneDayEmissive).lerp(stoneNightEmissive, nb);
    stoneMat.emissiveIntensity = THREE.MathUtils.lerp(0.25, 0.45, nb);

    // 所有已註冊自發光材質 & 年級篩選複製材質
    for (let i = 0; i < nightMatConfigs.length; i++) {
      const cfg = nightMatConfigs[i];
      if (cfg.dayEi !== undefined && cfg.nightEi !== undefined) {
        cfg.mat.emissiveIntensity = THREE.MathUtils.lerp(cfg.dayEi, cfg.nightEi, nb);
      }
      if (cfg.dayOp !== undefined && cfg.nightOp !== undefined) {
        cfg.mat.opacity = THREE.MathUtils.lerp(cfg.dayOp, cfg.nightOp, nb);
      }
    }
    for (let i = 0; i < clonedNightMatLinks.length; i++) {
      const link = clonedNightMatLinks[i];
      const cfg = link.cfg;
      if (cfg.dayEi !== undefined && cfg.nightEi !== undefined) {
        link.cloneMat.emissiveIntensity = THREE.MathUtils.lerp(cfg.dayEi, cfg.nightEi, nb);
      }
      if (!link.rec.dimmed && cfg.dayOp !== undefined && cfg.nightOp !== undefined) {
        link.cloneMat.opacity = THREE.MathUtils.lerp(cfg.dayOp, cfg.nightOp, nb);
      }
    }

    // 全部夜間投影光暈、光束與動態粒子系統
    for (let i = 0; i < nightGlowUpdaters.length; i++) {
      nightGlowUpdaters[i](nb, t);
    }
  }

  function applyDayNightTheme(nightMode) {
    isNight = !!nightMode;
    if (oceanEnv) oceanEnv.setNight(isNight);

    toggleBtn.classList.toggle("is-night", isNight);
    if (resetCamBtn) resetCamBtn.classList.toggle("is-night", isNight);
    toggleBtn.setAttribute("aria-pressed", String(isNight));
    if (dnStateLabel) {
      dnStateLabel.textContent = isNight ? "目前：🌙 夜晚" : "目前：☀️ 白天";
    }
    mapWrap.style.background = isNight
      ? "#061024"
      : "linear-gradient(180deg, #0284c7 0%, #0369a1 100%)";

    if (animFrameId === null || isScenePaused()) {
      nightBlend = isNight ? 1 : 0;
      if (oceanEnv && oceanEnv.snapNight) oceanEnv.snapNight(isNight);
      applyNightVisuals(nightBlend, clock.getElapsedTime());
    }
  }

  toggleBtn.addEventListener("click", () => {
    applyDayNightTheme(!isNight);
  });

  /* ============================================================
   * 視窗尺寸調整與動畫迴圈 (正弦波動態、小人曲線移動與微粒漂浮)
   * ============================================================ */
  function handleResize() {
    const w = stage.clientWidth || mapWrap.clientWidth || window.innerWidth || 1200;
    const h = stage.clientHeight || mapWrap.clientHeight || window.innerHeight || 700;
    if (w === 0 || h === 0) return;

    camera.aspect = w / h;
    camera.updateProjectionMatrix();

    renderer.setSize(w, h);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  }

  window.addEventListener("resize", handleResize);
  if (typeof ResizeObserver !== "undefined") {
    new ResizeObserver(handleResize).observe(stage);
  }

  /* ============================================================
   * 8. 島嶼建築四階段顯示控制與升級彈跳動畫 (Scale Bounce)
   * ------------------------------------------------------------
   * 統一呼叫全站權威 window.calculateIslandCompletion(islandId, progress)：
   * - 原始自然島（0%）        -> Lv.0 (tier1Group=false, tier2Group=false, tier3Group=false)
   * - 第一階段（1%  ～ 33%）  -> Lv.1 (tier1Group=true,  tier2Group=false, tier3Group=false)
   * - 第二階段（34% ～ 66%）  -> Lv.2 (tier1Group=true,  tier2Group=true,  tier3Group=false)
   * - 第三階段（67% ～ 100%） -> Lv.3 (tier1Group=true,  tier2Group=true,  tier3Group=true)
   * ============================================================ */
  const activeBounceAnims = [];
  const pendingUpgradeReplays = [];

  // 升級慶祝光環（落成時在島面擴散消退）
  const burstRingGeo = new THREE.RingGeometry(0.6, 1.05, 24);
  burstRingGeo.rotateX(-Math.PI / 2);

  function computeCompletionLevel(pct) {
    const p = Math.max(0, Math.min(100, Number(pct) || 0));
    if (p >= 67) return 3;
    if (p >= 34) return 2;
    if (p >= 1) return 1;
    return 0;
  }

  function triggerIslandScaleBounce(rec, fromLevel = 0, toLevel = rec.currentLevel || 1) {
    if (!rec) return;
    const now = clock.getElapsedTime();
    const allGroups = [rec.level1Props, rec.level2Props, rec.level3Props];
    const targetGroups = [];

    for (let lv = 1; lv <= 3; lv++) {
      const grp = allGroups[lv - 1];
      if (!grp || !grp.visible) continue;
      if (lv > fromLevel && lv <= toLevel) {
        targetGroups.push({ group: grp, delay: (lv - Math.max(1, fromLevel + 1)) * 0.14 });
      }
    }

    if (targetGroups.length === 0 && toLevel >= 1) {
      const topGrp = allGroups[Math.min(3, toLevel) - 1];
      if (topGrp && topGrp.visible) {
        targetGroups.push({ group: topGrp, delay: 0 });
      }
    }

    targetGroups.forEach(({ group, delay }) => {
      // 移除同一群組舊的未完成動畫
      for (let i = activeBounceAnims.length - 1; i >= 0; i--) {
        if (activeBounceAnims[i].group === group) {
          activeBounceAnims.splice(i, 1);
        }
      }
      group.scale.setScalar(0.001);
      activeBounceAnims.push({
        group,
        rec,
        startTime: now + delay,
        duration: 0.92
      });
    });

    // 整座島嶼同步產生輕快升級回彈與金色擴散光環，並播放升級音效
    if (window.AudioManager && typeof window.AudioManager.playLevelUp === "function") {
      window.AudioManager.playLevelUp();
    }
    rec.upgradeBounceTime = now;
    if (!rec.upgradeRing) {
      const ringMat = new THREE.MeshBasicMaterial({
        color: 0xffd166,
        transparent: true,
        opacity: 0,
        side: THREE.DoubleSide,
        depthWrite: false
      });
      const ringMesh = new THREE.Mesh(burstRingGeo, ringMat);
      ringMesh.position.set(0, 1.9, 0);
      rec.group.add(ringMesh);
      rec.upgradeRing = ringMesh;
    }
  }

  function calculateIslandCompletionMap(customInput) {
    const completionMap = {};
    const knownIds = new Set(islandRecords.map((r) => r.id));

    // 支援直接傳入 { sys: 80, citizen: 100 } 形式供快速預覽或測試
    const isPlainObj = customInput && typeof customInput === "object" && !Array.isArray(customInput)
      && !(customInput instanceof Event) && !(customInput instanceof Set)
      && !("animateUpgrade" in customInput) && !("animate" in customInput)
      && !("records" in customInput) && !("progress" in customInput);
    const objKeys = isPlainObj ? Object.keys(customInput) : [];
    const isNumericOverride = objKeys.length > 0 && objKeys.every((k) => knownIds.has(k) && typeof customInput[k] === "number");

    if (isNumericOverride) {
      islandRecords.forEach((rec) => {
        const raw = Number(customInput[rec.id]);
        const totalStages = Math.max(0, (rec.sequenceLen || 0) * 3);
        const pct = Number.isFinite(raw) ? Math.max(0, Math.min(100, Math.round(raw))) : 0;
        const passedStages = totalStages > 0 ? Math.round((pct / 100) * totalStages) : 0;
        completionMap[rec.id] = { percentage: pct, passedStages, totalStages };
      });
      return completionMap;
    }

    const sourceState = customInput !== undefined && !(customInput instanceof Event)
      ? customInput
      : (window.Store && window.Store.profile && typeof window.Store.events === "function" ? window.Store.events() : []);

    islandRecords.forEach((rec) => {
      if (typeof window.calculateIslandCompletion === "function") {
        completionMap[rec.id] = window.calculateIslandCompletion(rec.id, sourceState);
      } else {
        completionMap[rec.id] = { percentage: 0, passedStages: 0, totalStages: (rec.sequenceLen || 0) * 3 };
      }
    });

    return completionMap;
  }

  function calculateIslandProgressMap(customInput) {
    const compMap = calculateIslandCompletionMap(customInput);
    const progressMap = {};
    islandRecords.forEach((rec) => {
      progressMap[rec.id] = compMap[rec.id] ? compMap[rec.id].percentage : 0;
    });
    return progressMap;
  }

  function triggerSanctuaryAwakening() {
    const now = clock.getElapsedTime();
    sanctuaryState.unlocked = true;
    sanctuaryState.awakeningActive = true;
    sanctuaryState.awakeningStart = now;
    sanctuaryState.awakeningDuration = 2.6;
    sanctuaryState.mistDispersion = 0;
    sanctuaryState.studentAtPlaza = true;
    currentIslandIndex = -1;

    sealedReefSubgroup.visible = false;
    sanctuarySubgroup.visible = true;
    mistGroup.visible = true;
    mistMat.opacity = isNight ? 0.42 : 0.56;

    // 中央聖殿島自海面下 -9.5 平滑升起
    mysteryReefGroup.position.y = -9.5;
    goldenBeamGroup.scale.set(1, 0.01, 1);
    sanctuaryPointLight.intensity = 2.8;

    // 發射低多邊形慶祝彩帶並觸發聖殿慶祝音效
    if (window.AudioManager && typeof window.AudioManager.playSanctuaryFanfare === "function") {
      window.AudioManager.playSanctuaryFanfare();
    }
    launchCelebrationConfetti();
  }

  window.triggerSanctuaryAwakening = triggerSanctuaryAwakening;

  /**
   * 統一透過全站權威函式 window.calculateIslandCompletion(islandId, progress)
   * 計算七大島嶼完成度百分比並嚴格套用四段式建築顯示規則：
   * - 0%（原始地形）：tier1Group=false, tier2Group=false, tier3Group=false
   * - 1% ～ 33%    ：tier1Group=true,  tier2Group=false, tier3Group=false
   * - 34% ～ 66%   ：tier1Group=true,  tier2Group=true,  tier3Group=false
   * - 67% ～ 100%  ：tier1Group=true,  tier2Group=true,  tier3Group=true
   * 同步更新中央聖殿島 7 根封印石柱光芒、懸浮名牌與天穹結界狀態。
   */
  let grandFinalePreview = false;
  const stageDebug = { override: null };

  function updateAllIslandArchitectures(optionsOrRecords) {
    const isOptionsObj =
      optionsOrRecords &&
      typeof optionsOrRecords === "object" &&
      !Array.isArray(optionsOrRecords) &&
      !(optionsOrRecords instanceof Event) &&
      !(optionsOrRecords instanceof Set) &&
      ("animateUpgrade" in optionsOrRecords || "animate" in optionsOrRecords || "records" in optionsOrRecords || "progress" in optionsOrRecords);

    const animateUpgrade = isOptionsObj
      ? (optionsOrRecords.animate !== undefined ? Boolean(optionsOrRecords.animate) : Boolean(optionsOrRecords.animateUpgrade))
      : true;
    const customRecords = isOptionsObj
      ? (optionsOrRecords.records !== undefined ? optionsOrRecords.records : optionsOrRecords.progress)
      : optionsOrRecords;
    const previewFullMap = grandFinalePreview
      ? Object.fromEntries(islandRecords.map((r) => [r.id, 100]))
      : null;
    const completionMap = calculateIslandCompletionMap(previewFullMap || customRecords);

    const summary = {};
    let fullCount = 0;
    const hasTeacherPreviewOverride = stageDebug.override !== null && customRecords === undefined && !grandFinalePreview;

    islandRecords.forEach((rec, idx) => {
      const comp = completionMap[rec.id] || { percentage: 0, passedStages: 0, totalStages: (rec.sequenceLen || 0) * 3 };
      const pct = comp.percentage ?? 0;
      const newLevel = hasTeacherPreviewOverride
        ? Math.max(0, Math.min(3, Math.floor(stageDebug.override)))
        : computeCompletionLevel(pct);
      const prevLevel = rec.currentLevel;
      const prevStage = rec.stageLevel;
      const shouldAnimateStage = animateUpgrade && prevStage !== null && newLevel > prevStage;

      // 依三階段門檻切換真正渲染於場景之 tier1Group / tier2Group / tier3Group
      if (rec.stageSys && typeof rec.stageSys.setStage === "function") {
        rec.stageSys.setStage(newLevel, shouldAnimateStage);
      }
      if (rec.tier1Group) rec.tier1Group.visible = newLevel >= 1;
      if (rec.tier2Group) rec.tier2Group.visible = newLevel >= 2;
      if (rec.tier3Group) rec.tier3Group.visible = newLevel >= 3;

      // 同步舊版屬性參照以維持外部相容性
      rec.level1Props.visible = newLevel >= 1;
      rec.level2Props.visible = newLevel >= 2;
      rec.level3Props.visible = newLevel >= 3;
      if (newLevel >= 1 && (prevLevel === null || newLevel <= prevLevel)) {
        rec.level1Props.scale.setScalar(1);
      }
      if (newLevel >= 2 && (prevLevel === null || newLevel <= prevLevel)) {
        rec.level2Props.scale.setScalar(1);
      }
      if (newLevel >= 3 && (prevLevel === null || newLevel <= prevLevel)) {
        rec.level3Props.scale.setScalar(1);
      }

      // 更新島嶼懸浮名牌副標題（顯示建築階段與唯一權威完成度）
      if (rec.labelSprite && rec.labelSprite.userData && rec.labelSprite.userData.updateSubtitle) {
        rec.labelSprite.userData.updateSubtitle(`${rec.tag} · Lv.${newLevel} (${pct}% · ${comp.passedStages}/${comp.totalStages})`);
      }

      // 當完成測驗使島嶼升級時，觸發 Scale Bounce 彈跳縮放動畫
      const leveledUp = prevLevel !== null && newLevel > prevLevel;
      if (animateUpgrade && leveledUp) {
        triggerIslandScaleBounce(rec, prevLevel, newLevel);

        const quizModal = document.getElementById("quizModal");
        const drawer = document.getElementById("drawer");
        const isModalOpen =
          (quizModal && quizModal.classList.contains("show")) ||
          (drawer && drawer.classList.contains("open"));
        if (isModalOpen) {
          pendingUpgradeReplays.push({ rec, fromLevel: prevLevel, toLevel: newLevel });
        }
      }

      // 同步更新中央聖殿島對應方位之封印小石柱（100% 滿分點亮專屬色彩光芒）
      const isFull = pct >= 100;
      if (isFull) fullCount++;
      const pillar = sealPillars[idx];
      if (pillar) {
        pillar.isLit = isFull;
        if (isFull) {
          pillar.gemMat.color.copy(pillar.islColor);
          pillar.gemMat.emissive.copy(pillar.islColor);
          pillar.gemMat.emissiveIntensity = 0.95;
          pillar.runeBandMat.color.copy(pillar.islColor);
          pillar.runeBandMat.emissive.copy(pillar.islColor);
          pillar.runeBandMat.emissiveIntensity = 0.78;
          pillar.haloMat.opacity = 0.8;
        } else {
          pillar.gemMat.color.setHex(0x3b4252);
          pillar.gemMat.emissive.setHex(0x1a202c);
          pillar.gemMat.emissiveIntensity = 0.15;
          pillar.runeBandMat.color.setHex(0x2d3748);
          pillar.runeBandMat.emissive.setHex(0x000000);
          pillar.runeBandMat.emissiveIntensity = 0;
          pillar.haloMat.opacity = 0;
        }
      }

      rec.currentLevel = newLevel;
      rec.stageLevel = newLevel;
      rec.progressPct = pct;
      rec.passedStages = comp.passedStages;
      rec.totalStages = comp.totalStages;
      if (rec.stageSys && rec.stageSys.stageAuraGroup) {
        rec.stageSys.stageAuraGroup.userData.effectiveStage = newLevel;
      }
      summary[rec.id] = { pct, passedStages: comp.passedStages, totalStages: comp.totalStages, level: newLevel, leveledUp };
    });

    // 判斷中央聖殿島是否達成 7 島 100% 終極解鎖
    const allSevenFull = fullCount === islandRecords.length && islandRecords.length >= 7;
    if (allSevenFull) {
      const wasUnlocked = sanctuaryState.unlocked;
      sanctuaryState.unlocked = true;
      sealedReefSubgroup.visible = false;
      sanctuarySubgroup.visible = true;
      finaleEffectsGroup.visible = true;
      sanctuaryPointLight.intensity = 2.8;

      if (reefLabel && reefLabel.userData && reefLabel.userData.updateFullLabel) {
        reefLabel.userData.updateFullLabel({
          emoji: "🏛️",
          title: "中央資訊聖殿",
          subtitle: "🌟 全域領航解鎖 · 點擊領取證書",
          accentColor: "#ffd166",
          isLocked: false
        });
      }

      if (!wasUnlocked) {
        sanctuaryState.studentAtPlaza = true;
        currentIslandIndex = -1;
        if (animateUpgrade) {
          triggerSanctuaryAwakening();
          const quizModal = document.getElementById("quizModal");
          const drawer = document.getElementById("drawer");
          const isModalOpen =
            (quizModal && quizModal.classList.contains("show")) ||
            (drawer && drawer.classList.contains("open"));
          if (isModalOpen) {
            sanctuaryState.pendingAwakeningReplay = true;
          }
        } else {
          sanctuaryState.awakeningActive = false;
          sanctuaryState.mistDispersion = 1;
          mistGroup.visible = false;
          mysteryReefGroup.position.y = 0;
          goldenBeamGroup.scale.set(1, 1, 1);
          launchCelebrationConfetti();
        }
      }
    } else {
      sanctuaryState.unlocked = false;
      sanctuaryState.awakeningActive = false;
      sanctuaryState.pendingAwakeningReplay = false;
      sanctuaryState.mistDispersion = 0;
      sanctuaryState.studentAtPlaza = false;
      if (currentIslandIndex < 0) currentIslandIndex = 0;
      sealedReefSubgroup.visible = true;
      sanctuarySubgroup.visible = false;
      finaleEffectsGroup.visible = false;
      confettiGroup.visible = false;
      mistGroup.visible = true;
      mistMat.opacity = isNight ? 0.42 : 0.56;
      mysteryReefGroup.position.y = 0;
      sanctuaryPointLight.intensity = 0;

      if (reefLabel && reefLabel.userData && reefLabel.userData.updateFullLabel) {
        reefLabel.userData.updateFullLabel({
          emoji: "🔒",
          title: "迷霧神秘礁岩",
          subtitle: `聖柱已點亮 ${fullCount} / 7 · 隱藏海域`,
          accentColor: "#9aa8c7",
          isLocked: true
        });
      }
    }

    if (typeof syncCitadelVisualState === "function") {
      syncCitadelVisualState();
    }

    return summary;
  }

  const updateIslandsProgress = updateAllIslandArchitectures;
  window.updateAllIslandArchitectures = updateAllIslandArchitectures;
  window.updateIslandsProgress = updateAllIslandArchitectures;
  window.triggerIslandScaleBounce = (islandId, level) => {
    const rec = islandRecords.find((r) => r.id === islandId);
    if (!rec) return;
    if (typeof level === "number") {
      const lv = Math.max(0, Math.min(3, Math.floor(level)));
      if (rec.stageSys && typeof rec.stageSys.setStage === "function") {
        rec.stageSys.setStage(lv, true);
      }
      if (rec.tier1Group) rec.tier1Group.visible = lv >= 1;
      if (rec.tier2Group) rec.tier2Group.visible = lv >= 2;
      if (rec.tier3Group) rec.tier3Group.visible = lv >= 3;
      rec.level1Props.visible = lv >= 1;
      rec.level2Props.visible = lv >= 2;
      rec.level3Props.visible = lv >= 3;
      rec.currentLevel = lv;
      rec.stageLevel = lv;
    }
    triggerIslandScaleBounce(rec, 0, rec.currentLevel || 1);
  };

  function computeIslandStage(rec) {
    if (!rec) return 0;
    if (stageDebug.override !== null) return Math.max(0, Math.min(3, Math.floor(stageDebug.override)));
    if (grandFinalePreview) return 3;
    const sourceState = (window.Store && window.Store.profile && typeof window.Store.events === "function")
      ? window.Store.events()
      : [];
    const comp = typeof window.calculateIslandCompletion === "function"
      ? window.calculateIslandCompletion(rec.id, sourceState)
      : { percentage: 0 };
    return computeCompletionLevel(comp ? comp.percentage : 0);
  }

  window.refreshIslandBuildings = function refreshIslandBuildings(opts) {
    const animate = !(opts && opts.animate === false);
    const summary = updateAllIslandArchitectures({ animateUpgrade: animate });
    const result = {};
    islandRecords.forEach((rec) => {
      result[rec.id] = summary[rec.id] ? summary[rec.id].level : (rec.stageLevel ?? 0);
    });
    return result;
  };

  /**
   * 老師 / 開發者 Console 預覽指令（同時支援單數 previewAllStage 與複數 previewAllStages）：
   *   previewAllStage(0|1|2|3) → 七大島嶼切換至 Stage 0~3，中央神殿維持常態（關閉終極特效）
   *   previewAllStage(4)       → 七大島嶼全部顯示 3/3 完整建築＋中央神殿啟動 Grand Finale 終極通關榮耀＋聚焦全景
   *   previewAllStage() / "auto" → 還原為實際測驗成績
   */
  window.previewAllStages = function previewAllStages(stageNum) {
    const prevWasFinale = grandFinalePreview;
    if (stageNum === undefined || stageNum === null || stageNum === "auto") {
      stageDebug.override = null;
      grandFinalePreview = false;
      const buildingSummary = window.refreshIslandBuildings({ animate: true });
      if (prevWasFinale) resetCameraToPanorama();
      console.log("[previewAllStage] 已還原為實際測驗成績");
      return { mode: "auto", grandFinale: false, stages: buildingSummary };
    }

    const n = Number(stageNum);
    if (!Number.isFinite(n) || n < 0 || n > 4) {
      console.warn("[previewAllStage] 請輸入 0, 1, 2, 3（建築階段）、4（終極滿分大通關）或 () 還原");
      return;
    }

    const stageInt = Math.floor(n);
    if (stageInt === 4) {
      stageDebug.override = 3;
      grandFinalePreview = true;
      const buildingSummary = window.refreshIslandBuildings({ animate: true });
      focusOnGrandFinale();
      console.log("[previewAllStage] Stage 4 終極滿分大通關已啟動（全島 3/3 ＋ 中央神殿榮耀狀態，previewAllStage() 還原）");
      return { mode: 4, grandFinale: true, stages: buildingSummary };
    }

    stageDebug.override = stageInt;
    grandFinalePreview = false;
    const buildingSummary = window.refreshIslandBuildings({ animate: true });
    // Stage 0~3 預覽時強制中央神殿維持常態並關閉終極特效
    finaleEffectsGroup.visible = false;
    confettiGroup.visible = false;
    if (prevWasFinale) resetCameraToPanorama();
    console.log(`[previewAllStage] 全島切換為 Stage ${stageInt}（中央神殿維持常態；輸入 previewAllStage(4) 預覽終極大通關，() 還原）`);
    return { mode: stageInt, grandFinale: false, stages: buildingSummary };
  };
  window.previewAllStage = window.previewAllStages;

  window.toggleGrandFinalePreview = function toggleGrandFinalePreview(forceState) {
    const next = typeof forceState === "boolean" ? forceState : !grandFinalePreview;
    window.previewAllStages(next ? 4 : "auto");
    return next;
  };

  // 初次載入時立即同步學生既有作答紀錄（不觸發升級動畫）
  updateAllIslandArchitectures({ animateUpgrade: false });

  let pendingQuizUpgradeSync = false;
  document.addEventListener("ii:quizdone", (e) => {
    const completedIslandId =
      (e && e.detail && (e.detail.island || (e.detail.key ? String(e.detail.key).split("-")[0] : ""))) || "";
    const qm = document.getElementById("quizModal");
    if (qm && qm.classList.contains("show")) {
      // 測驗視窗仍開啟時先更新建築階段並記錄重播，待關閉視窗瞬間重播升級慶祝動畫
      pendingQuizUpgradeSync = true;
      updateAllIslandArchitectures({ animateUpgrade: true });
    } else {
      pendingQuizUpgradeSync = false;
      updateAllIslandArchitectures({ animateUpgrade: true });
    }
    if (completedIslandId && typeof advanceCursorAfterQuiz === "function") {
      advanceCursorAfterQuiz(completedIslandId);
    }
  });
  document.addEventListener("ii:quizclosed", () => {
    const hadPending = pendingQuizUpgradeSync;
    pendingQuizUpgradeSync = false;
    updateAllIslandArchitectures({ animateUpgrade: hadPending });

    if (pendingUpgradeReplays.length || sanctuaryState.pendingAwakeningReplay) {
      const closeDrawerBtn = document.getElementById("closeBtn");
      if (closeDrawerBtn) closeDrawerBtn.click();
      const replays = pendingUpgradeReplays.splice(0, pendingUpgradeReplays.length);
      const shouldReplaySanctuary = sanctuaryState.pendingAwakeningReplay;
      sanctuaryState.pendingAwakeningReplay = false;
      setTimeout(() => {
        replays.forEach(({ rec, fromLevel, toLevel }) => {
          if (rec && rec.stageSys && typeof rec.stageSys.setStage === "function") {
            rec.stageSys.setStage(toLevel, true);
          }
          triggerIslandScaleBounce(rec, fromLevel, toLevel);
        });
        if (shouldReplaySanctuary && sanctuaryState.unlocked) {
          triggerSanctuaryAwakening();
        }
      }, 180);
    }
  });

  // 登島視角無縫過渡狀態（避免跳回遠距舊座標造成視覺閃爍）
  const cameraIntroState = {
    active: false,
    startTime: 0,
    duration: 1.0,
    fromPos: defaultCamPos.clone(),
    toPos: defaultCamPos.clone(),
    fromTarget: defaultCamTarget.clone(),
    toTarget: defaultCamTarget.clone()
  };

  function triggerBoardingCameraTransition() {
    if (
      camera.position.distanceToSquared(defaultCamPos) < 0.01 &&
      controls.target.distanceToSquared(defaultCamTarget) < 0.01
    ) {
      cameraIntroState.active = false;
      camera.position.copy(defaultCamPos);
      controls.target.copy(defaultCamTarget);
      controls.update();
      return;
    }
    cameraIntroState.fromPos.copy(camera.position);
    cameraIntroState.fromTarget.copy(controls.target);
    cameraIntroState.toPos.copy(defaultCamPos);
    cameraIntroState.toTarget.copy(defaultCamTarget);
    cameraIntroState.active = true;
    cameraIntroState.startTime = clock.getElapsedTime();
  }
  window.triggerBoardingCameraTransition = triggerBoardingCameraTransition;

  // 監聽登入、登出與跨分頁儲存事件：立即重繪 3D 島嶼建築階段，確保與帳號完成度 100% 同步
  document.addEventListener("ii:login", () => {
    pendingQuizUpgradeSync = false;
    pendingUpgradeReplays.length = 0;
    islandRecords.forEach((r) => {
      r.currentLevel = null;
      r.stageLevel = null;
    });
    sanctuaryState.unlocked = false;
    citadelState.archLevel = null;
    citadelState.archOverride = null;
    pendingCitadelArchSync = false;
    updateAllIslandArchitectures({ animateUpgrade: false });
    if (typeof updateAetherCitadelArchitecture === "function") {
      updateAetherCitadelArchitecture({ animate: false });
    }
    if (typeof syncPlayerCursorFromStorageOrSmart === "function") {
      syncPlayerCursorFromStorageOrSmart(currentGradeFilter, { snap: false });
    }
    triggerBoardingCameraTransition();
  });
  document.addEventListener("ii:logout", () => {
    pendingQuizUpgradeSync = false;
    grandFinalePreview = false;
    stageDebug.override = null;
    pendingUpgradeReplays.length = 0;
    closeCertModal();
    hideNpcSpeechBubble();
    if (sealToastEl) sealToastEl.classList.remove("show");
    islandRecords.forEach((r) => {
      r.currentLevel = null;
      r.stageLevel = null;
    });
    sanctuaryState.unlocked = false;
    citadelState.archLevel = null;
    citadelState.archOverride = null;
    pendingCitadelArchSync = false;
    updateAllIslandArchitectures({ animateUpgrade: false });
    if (typeof updateAetherCitadelArchitecture === "function") {
      updateAetherCitadelArchitecture({ animate: false });
    }
    if (typeof syncPlayerCursorFromStorageOrSmart === "function") {
      syncPlayerCursorFromStorageOrSmart(currentGradeFilter, { snap: false });
    }
  });
  window.addEventListener("storage", () => {
    updateAllIslandArchitectures({ animateUpgrade: true });
    if (typeof updateAetherCitadelArchitecture === "function") {
      updateAetherCitadelArchitecture({ animate: true });
    }
    if (typeof syncPlayerCursorFromStorageOrSmart === "function") {
      syncPlayerCursorFromStorageOrSmart(currentGradeFilter, { snap: false });
    }
  });

  /* ============================================================
   * 年級篩選：高對比聚焦（符合年級 → 金色呼吸光環；不符合 → 透明度 0.35、標籤變灰、停用互動）
   * ============================================================ */
  const DIM_OPACITY = 0.35;
  function collectDimMaterials(rec) {
    if (rec.dimMats) return rec.dimMats;
    const skipMats = new Set([...dockBulbMaterials, ...dockWaterGlowMaterials]);
    const skipObjs = new Set([rec.shallowRing, rec.foamRing, rec.outerFoamRing, rec.upgradeRing, rec.beaconRing]);
    const list = [];
    rec.group.traverse((obj) => {
      if (!obj.isMesh || obj.isSprite || obj.userData.skipDimClone || skipObjs.has(obj) || obj.userData.isBeacon) return;
      const m = obj.material;
      if (!m || Array.isArray(m) || skipMats.has(m)) return;
      // 材質多為跨島共用，首次篩選時為每個網格複製獨立材質，避免影響其他島嶼
      const cloned = m.clone();
      obj.material = cloned;
      const nightCfg = nightMatMap.get(m);
      if (nightCfg) {
        clonedNightMatLinks.push({ cloneMat: cloned, cfg: nightCfg, rec });
      }
      list.push({
        mat: cloned,
        transparent: m.transparent,
        opacity: m.opacity
      });
    });
    rec.dimMats = list;
    return list;
  }

  function setIslandDim(rec, dim) {
    if (rec.stageSys && rec.stageSys.stageAuraGroup) {
      rec.stageSys.stageAuraGroup.userData.dimFactor = dim ? DIM_OPACITY : 1;
    }
    if (!dim && !rec.dimMats) return;
    collectDimMaterials(rec).forEach((e) => {
      if (dim) {
        e.mat.transparent = true;
        e.mat.opacity = DIM_OPACITY;
      } else {
        e.mat.transparent = e.transparent;
        e.mat.opacity = e.opacity;
      }
      e.mat.needsUpdate = true;
    });
  }

  let currentGradeFilter = 0;
  function applyGradeFilter(grade) {
    const g = Number(grade) || 0;
    currentGradeFilter = g;
    islandRecords.forEach((rec) => {
      const match = !g || rec.grades.includes(g);
      const dim = g !== 0 && !match;
      rec.dimmed = dim;
      setIslandDim(rec, dim);
      if (rec.beaconRing) rec.beaconRing.visible = g !== 0 && match;
      if (rec.labelSprite && rec.labelSprite.userData.updateFullLabel) {
        rec.labelSprite.userData.updateFullLabel({ isDim: dim });
      }
      rec.labelSprite.material.opacity = dim ? 0.7 : 1;
      if (dim && hoveredIslandRec && hoveredIslandRec.id === rec.id) hoveredIslandRec = null;
    });
    if (typeof syncPlayerCursorFromStorageOrSmart === "function") {
      syncPlayerCursorFromStorageOrSmart(currentGradeFilter, { snap: false });
    }
  }
  window.applyIslandGradeFilter = applyGradeFilter;
  document.addEventListener("ii:gradefilter", (e) => applyGradeFilter(e.detail && e.detail.grade));

  /* 搜尋選單或單元導引：鏡頭特寫聚焦 + 角色跑向目標島，抵達後開啟抽屜（可指定分頁與單元） */
  function focusIsland(islandId, tab, unitKey) {
    if (islandId === "sanctuary") {
      focusOnSanctuary();
      return;
    }
    const rec = islandRecords.find((r) => r.id === islandId);
    if (!rec) {
      openIslandDrawer(islandId, tab, unitKey);
      return;
    }
    setPlayerCursorTarget(rec.id, { persist: true });
    focusOnIsland(rec);
    startRunToIsland(rec);
    moveState.targetTab = tab || "標準";
    moveState.targetUnitKey = unitKey || null;
  }

  /* ============================================================
   * 學生個人挑戰進度 3D 智慧指引黃色菱形游標 (window.playerCursorMesh)
   * ------------------------------------------------------------
   * - 獨立於教師雲端指定任務光柱，專屬於學生個人的即時挑戰位置標記
   * - 支援點擊/開測驗跟隨、3/3 滿分自動推進下一島、初次載入智慧定位
   * - 依目標島嶼當前建築解鎖階段 (0/3 ~ 3/3) 動態計算高度防穿模
   * ============================================================ */
  const ISLAND_ROOF_TOP_BY_STAGE = {
    sys: [4.40, 6.00, 6.00, 11.42],
    citizen: [4.40, 6.24, 6.24, 13.34],
    create: [4.40, 5.55, 5.55, 11.34],
    code: [4.40, 6.12, 6.12, 12.30],
    algo: [4.40, 6.13, 6.13, 12.57],
    data: [4.40, 6.39, 6.39, 12.79],
    ai: [4.40, 5.53, 5.53, 12.20]
  };
  const SANCTUARY_ROOF_TOP_Y = 38.2;
  const CURSOR_DIAMOND_HALF_H = 2.45;
  const CURSOR_ROOF_CLEARANCE = 2.55;

  const playerCursorGroup = new THREE.Group();
  playerCursorGroup.name = "playerCursorMesh";
  scene.add(playerCursorGroup);

  const cursorDiamondMat = new THREE.MeshStandardMaterial({
    color: 0xffd166,
    emissive: 0xffaa00,
    emissiveIntensity: 0.95,
    metalness: 0.45,
    roughness: 0.2
  });
  const cursorDiamond = new THREE.Mesh(new THREE.OctahedronGeometry(1.35, 0), cursorDiamondMat);
  cursorDiamond.scale.set(1, 1.45, 1);
  playerCursorGroup.add(cursorDiamond);

  const cursorWireMat = new THREE.MeshBasicMaterial({
    color: 0xfff3b0,
    wireframe: true,
    transparent: true,
    opacity: 0.72
  });
  const cursorWire = new THREE.Mesh(new THREE.OctahedronGeometry(1.68, 0), cursorWireMat);
  cursorWire.scale.set(1, 1.45, 1);
  playerCursorGroup.add(cursorWire);

  window.playerCursorMesh = playerCursorGroup;

  const playerCursorState = {
    targetId: "sys",
    x: 0,
    z: 0,
    baseY: 10,
    startX: 0,
    startZ: 0,
    totalDist: 0,
    initialized: false
  };
  isCitadelCursorSystemReady = true;

  function getCursorTargetMetrics(targetId) {
    if (targetId === "aetherCitadel") {
      const citY = aetherCitadelGroup ? aetherCitadelGroup.position.y : CITADEL_BASE_POS.y;
      const topClearance = (citadelState.archLevel || 0) >= 2 ? 12.6 : 9.4;
      return {
        x: CITADEL_BASE_POS.x,
        z: CITADEL_BASE_POS.z,
        baseY: citY + topClearance
      };
    }
    if (targetId === "sanctuary") {
      const reefY = mysteryReefGroup ? mysteryReefGroup.position.y : 0;
      return {
        x: 0,
        z: 0,
        baseY: SANCTUARY_ROOF_TOP_Y + reefY + CURSOR_ROOF_CLEARANCE + CURSOR_DIAMOND_HALF_H
      };
    }
    const rec = islandRecords.find((r) => r.id === targetId) || islandRecords[0];
    if (!rec) return { x: 0, z: 0, baseY: 10 };
    const stageIdx = Math.max(
      0,
      Math.min(
        3,
        rec.stageSys && typeof rec.stageSys.stage === "number"
          ? rec.stageSys.stage
          : (typeof rec.stageLevel === "number" ? rec.stageLevel : 0)
      )
    );
    const heights = ISLAND_ROOF_TOP_BY_STAGE[rec.id] || [4.4, 6.4, 6.4, 13.4];
    const roofTopY = heights[stageIdx] + (rec.group ? rec.group.position.y : 0);
    return {
      x: rec.group ? rec.group.position.x : 0,
      z: rec.group ? rec.group.position.z : 0,
      baseY: roofTopY + CURSOR_ROOF_CLEARANCE + CURSOR_DIAMOND_HALF_H
    };
  }

  function getOrderedRouteIslandRecords() {
    const route = (window.SITE && Array.isArray(window.SITE.route) && window.SITE.route.length)
      ? window.SITE.route
      : islandRecords.map((r) => r.id);
    const ordered = route.map((id) => islandRecords.find((r) => r.id === id)).filter(Boolean);
    islandRecords.forEach((r) => {
      if (!ordered.includes(r)) ordered.push(r);
    });
    return ordered;
  }

  function isAllIslandsCompleted() {
    return islandRecords.length > 0 && islandRecords.every((r) => (r.progressPct || 0) >= 100);
  }

  function isAllIslandsAt80() {
    if (islandRecords.length < 7) return false;
    return islandRecords.every((r) => (r.progressPct || 0) >= 80);
  }

  function setPlayerCursorTarget(targetId, opts = {}) {
    const rawId = String(targetId || "").trim();
    const valid = rawId === "aetherCitadel" || rawId === "sanctuary" || islandRecords.some((r) => r.id === rawId);
    const resolvedId = valid ? rawId : (islandRecords[0] ? islandRecords[0].id : "sys");

    if (opts.persist && window.Store && typeof window.Store.setActiveIslandId === "function") {
      window.Store.setActiveIslandId(resolvedId, { silent: true });
    }

    const dest = getCursorTargetMetrics(resolvedId);
    if (opts.snap || !playerCursorState.initialized) {
      playerCursorState.targetId = resolvedId;
      playerCursorState.x = dest.x;
      playerCursorState.z = dest.z;
      playerCursorState.baseY = dest.baseY;
      playerCursorState.startX = dest.x;
      playerCursorState.startZ = dest.z;
      playerCursorState.totalDist = 0;
      playerCursorState.initialized = true;
      playerCursorGroup.position.set(dest.x, dest.baseY, dest.z);
      return resolvedId;
    }

    if (resolvedId !== playerCursorState.targetId) {
      const curX = playerCursorGroup.position.x;
      const curZ = playerCursorGroup.position.z;
      playerCursorState.x = curX;
      playerCursorState.z = curZ;
      playerCursorState.startX = curX;
      playerCursorState.startZ = curZ;
      playerCursorState.totalDist = Math.hypot(dest.x - curX, dest.z - curZ);
      playerCursorState.targetId = resolvedId;
    }
    return resolvedId;
  }

  function resolveSmartCursorTarget(gradeFilter) {
    if (isAllIslandsAt80() || citadelState.unlocked) {
      return "aetherCitadel";
    }
    const stored = (window.Store && typeof window.Store.getActiveIslandId === "function")
      ? window.Store.getActiveIslandId()
      : "";
    if (stored) {
      if (stored === "aetherCitadel" && (isAllIslandsAt80() || citadelState.unlocked)) {
        return "aetherCitadel";
      }
      if (stored === "sanctuary" && isAllIslandsCompleted()) {
        return "sanctuary";
      }
      if (islandRecords.some((r) => r.id === stored)) {
        return stored;
      }
    }
    const g = Number(gradeFilter) || 0;
    const ordered = getOrderedRouteIslandRecords();
    const candidates = g
      ? ordered.filter((r) => Array.isArray(r.grades) && r.grades.includes(g))
      : ordered;
    const firstUnfinished = candidates.find((r) => (r.progressPct || 0) < 100);
    if (firstUnfinished) return firstUnfinished.id;
    if (isAllIslandsCompleted()) return "sanctuary";
    if (candidates.length > 0) return candidates[0].id;
    return islandRecords[0] ? islandRecords[0].id : "sys";
  }

  function syncPlayerCursorFromStorageOrSmart(gradeFilter, opts = {}) {
    const targetId = resolveSmartCursorTarget(gradeFilter);
    return setPlayerCursorTarget(targetId, { persist: false, snap: Boolean(opts.snap) });
  }

  function advanceCursorAfterQuiz(completedIslandId) {
    const cid = String(completedIslandId || "").trim();
    if (!cid) return;
    const completedRec = islandRecords.find((r) => r.id === cid);
    if (!completedRec) return;
    const completedComp = typeof window.calculateIslandCompletion === "function"
      ? window.calculateIslandCompletion(completedRec.id)
      : null;
    const completedPct = completedComp ? completedComp.percentage : (completedRec.progressPct || 0);
    if (completedPct < 100) {
      setPlayerCursorTarget(cid, { persist: true });
      return;
    }
    const ordered = getOrderedRouteIslandRecords();
    const startIdx = ordered.findIndex((r) => r.id === cid);
    let nextTarget = "";
    for (let offset = 1; offset < ordered.length; offset++) {
      const cand = ordered[(Math.max(0, startIdx) + offset) % ordered.length];
      if (cand && (cand.progressPct || 0) < 100) {
        nextTarget = cand.id;
        break;
      }
    }
    if (!nextTarget) {
      nextTarget = (isAllIslandsAt80() || citadelState.unlocked)
        ? "aetherCitadel"
        : (isAllIslandsCompleted() ? "sanctuary" : cid);
    } else if (isAllIslandsAt80() || citadelState.unlocked) {
      nextTarget = "aetherCitadel";
    }
    setPlayerCursorTarget(nextTarget, { persist: true });
  }

  function updatePlayerCursor(t, dt) {
    if (!playerCursorState.initialized) return;
    const dest = getCursorTargetMetrics(playerCursorState.targetId);
    const horizAlpha = 1 - Math.exp(-5.0 * dt);
    const vertAlpha = 1 - Math.exp(-5.5 * dt);

    playerCursorState.x = THREE.MathUtils.lerp(playerCursorState.x, dest.x, horizAlpha);
    playerCursorState.z = THREE.MathUtils.lerp(playerCursorState.z, dest.z, horizAlpha);
    playerCursorState.baseY = THREE.MathUtils.lerp(playerCursorState.baseY, dest.baseY, vertAlpha);

    const remDist = Math.hypot(dest.x - playerCursorState.x, dest.z - playerCursorState.z);
    let displayX = playerCursorState.x;
    let displayZ = playerCursorState.z;
    let arcLiftY = 0;

    if (playerCursorState.totalDist > 0.5 && remDist > 0.05) {
      const progress = Math.max(0, Math.min(1, 1 - remDist / playerCursorState.totalDist));
      const arcSin = Math.sin(progress * Math.PI);
      const dx = dest.x - playerCursorState.startX;
      const dz = dest.z - playerCursorState.startZ;
      const len = Math.hypot(dx, dz) || 1;
      const nx = -dz / len;
      const nz = dx / len;
      const lateralOffset = arcSin * Math.min(7.5, playerCursorState.totalDist * 0.12);
      displayX += nx * lateralOffset;
      displayZ += nz * lateralOffset;
      arcLiftY = arcSin * Math.min(11.5, Math.max(2.5, playerCursorState.totalDist * 0.16));
    } else if (remDist <= 0.05) {
      playerCursorState.x = dest.x;
      playerCursorState.z = dest.z;
      playerCursorState.totalDist = 0;
    }

    const bob = Math.sin(t * 2.8) * 0.45;
    playerCursorGroup.position.set(displayX, playerCursorState.baseY + arcLiftY + bob, displayZ);
    cursorDiamond.rotation.y = t * 1.9;
    cursorWire.rotation.y = -t * 1.25;
  }

  document.addEventListener("ii:active-island-changed", (e) => {
    const nextId = e && e.detail ? e.detail.islandId : "";
    if (nextId) {
      setPlayerCursorTarget(nextId, { persist: false });
    }
  });

  // 初次載入智慧定位：優先讀取 localStorage activeIslandId，否則定位至當前所選年級的第一座未完成島嶼
  syncPlayerCursorFromStorageOrSmart(currentGradeFilter, { snap: true });

  /* ============================================================
   * 今日指定任務島 3D 高亮定位標記（金色地面光環＋垂直光束）
   * ============================================================ */
  const targetIslandBeaconGroup = new THREE.Group();
  targetIslandBeaconGroup.visible = false;
  targetIslandBeaconGroup.name = "targetIslandBeacon";
  scene.add(targetIslandBeaconGroup);

  const beaconGroundRingMat = new THREE.MeshBasicMaterial({
    color: 0xffe066,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.65,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });
  const beaconGroundRing = new THREE.Mesh(new THREE.RingGeometry(11.5, 13.0, 64), beaconGroundRingMat);
  beaconGroundRing.rotation.x = -Math.PI / 2;
  beaconGroundRing.position.y = 0.65;
  targetIslandBeaconGroup.add(beaconGroundRing);

  const beaconPulseRingMat = new THREE.MeshBasicMaterial({
    color: 0xffd166,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.78,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });
  const beaconPulseRing = new THREE.Mesh(new THREE.RingGeometry(8.5, 9.5, 48), beaconPulseRingMat);
  beaconPulseRing.rotation.x = -Math.PI / 2;
  beaconPulseRing.position.y = 0.72;
  targetIslandBeaconGroup.add(beaconPulseRing);

  const beaconOuterBeamMat = new THREE.MeshBasicMaterial({
    vertexColors: true,
    transparent: true,
    opacity: 0.42,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
    fog: false
  });
  const beaconOuterBeam = new THREE.Mesh(
    buildSoftLightConeGeo(1.8, 3.8, 42, 20, 0x000000, 0xffd166),
    beaconOuterBeamMat
  );
  beaconOuterBeam.position.y = 22.0;
  beaconOuterBeam.renderOrder = 4;
  targetIslandBeaconGroup.add(beaconOuterBeam);

  const beaconInnerBeamMat = new THREE.MeshBasicMaterial({
    vertexColors: true,
    transparent: true,
    opacity: 0.52,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
    fog: false
  });
  const beaconInnerBeam = new THREE.Mesh(
    buildSoftLightConeGeo(0.55, 1.45, 42, 16, 0x000000, 0xfff3b0),
    beaconInnerBeamMat
  );
  beaconInnerBeam.position.y = 22.0;
  beaconInnerBeam.renderOrder = 4;
  targetIslandBeaconGroup.add(beaconInnerBeam);

  let activeTargetIslandId = "";
  function setTargetIslandHighlight(islandId) {
    activeTargetIslandId = String(islandId || "").trim();
    const rec = activeTargetIslandId ? islandRecords.find((r) => r.id === activeTargetIslandId) : null;
    if (!rec || !rec.group) {
      targetIslandBeaconGroup.visible = false;
      return;
    }
    targetIslandBeaconGroup.position.set(rec.group.position.x, 0, rec.group.position.z);
    targetIslandBeaconGroup.visible = true;
  }

  function updateTargetIslandBeacon(t) {
    if (!targetIslandBeaconGroup.visible) return;
    const wave = (t * 0.75) % 1;
    const s = 0.92 + wave * 0.58;
    beaconPulseRing.scale.set(s, s, 1);
    beaconPulseRingMat.opacity = (1 - wave) * 0.78;

    const gWave = 1 + Math.sin(t * 3.2) * 0.06;
    beaconGroundRing.scale.set(gWave, gWave, 1);
    beaconGroundRingMat.opacity = 0.48 + Math.sin(t * 3.2) * 0.22;

    const beamPulse = 0.5 + 0.5 * Math.sin(t * 2.6);
    beaconOuterBeamMat.opacity = 0.30 + beamPulse * 0.18;
    beaconInnerBeamMat.opacity = 0.38 + beamPulse * 0.22;
    beaconOuterBeam.rotation.y = t * 0.45;
  }

  document.addEventListener("ii:config-updated", (e) => {
    setTargetIslandHighlight(e && e.detail ? e.detail.targetIsland : "");
    if (typeof syncCitadelVisualState === "function") {
      syncCitadelVisualState();
    }
    if (stage.classList.contains("is-ready") && typeof renderSceneFrame === "function") {
      renderSceneFrame();
    }
  });
  if (window.CloudConfig && typeof window.CloudConfig.get === "function") {
    setTargetIslandHighlight(window.CloudConfig.get().targetIsland);
    if (typeof syncCitadelVisualState === "function") {
      syncCitadelVisualState();
    }
  } else if (typeof syncCitadelVisualState === "function") {
    syncCitadelVisualState();
  }
  document.addEventListener("ii:citadel-updated", () => {
    if (typeof syncCitadelVisualState === "function") syncCitadelVisualState();
    if (typeof isCitadelModalOpen === "function" && isCitadelModalOpen()) {
      pendingCitadelArchSync = true;
      return;
    }
    if (typeof updateAetherCitadelArchitecture === "function") {
      updateAetherCitadelArchitecture({ animate: true });
    }
  });
  document.addEventListener("ii:avatar-changed", () => {
    if (typeof isCitadelModalOpen === "function" && isCitadelModalOpen()) {
      pendingCitadelArchSync = true;
      return;
    }
    if (typeof updateAetherCitadelArchitecture === "function") {
      updateAetherCitadelArchitecture({ animate: false });
    }
  });

  function renderSceneFrame(frameOpts = {}) {
    const ecoMode = Boolean(frameOpts && frameOpts.ecoMode) && hasRenderedInitialFullFrame;
    const t = clock.getElapsedTime();
    const dt = lastNightUpdateTime === null ? 0.016 : Math.min(0.1, Math.max(0.001, t - lastNightUpdateTime));
    lastNightUpdateTime = t;
    const targetNight = isNight ? 1 : 0;
    nightBlend += (targetNight - nightBlend) * Math.min(1, dt * 4.5);
    if (Math.abs(targetNight - nightBlend) < 0.002) nightBlend = targetNight;
    applyNightVisuals(nightBlend, t);

    updateTargetIslandBeacon(t);
    updatePlayerCursor(t, dt);

    // 更新【天穹試煉浮島】輕量級漂浮律動、四階段建築微動態、柔和結界光幕、傳送門、島下光束與懸空星階
    if (aetherCitadelGroup) {
      aetherCitadelGroup.position.y = CITADEL_BASE_POS.y + Math.sin(t * 1.2) * 0.45;
      let targetCitScale = hoveredAetherCitadel ? 1.04 : 1.0;
      if (typeof citadelState.upgradeBounceTime === "number") {
        const uElapsed = t - citadelState.upgradeBounceTime;
        if (uElapsed >= 0 && uElapsed < 0.85) {
          const uNorm = uElapsed / 0.85;
          targetCitScale += Math.sin(uNorm * Math.PI * 2.5) * Math.exp(-3.8 * uNorm) * 0.09;
          if (citadelUpgradeRing) {
            citadelUpgradeRing.visible = true;
            citadelUpgradeRing.scale.setScalar(1 + uNorm * 6.5);
            citadelUpgradeRingMat.opacity = (1 - uNorm) * 0.85;
          }
        } else if (uElapsed >= 0.85) {
          citadelState.upgradeBounceTime = null;
          if (citadelUpgradeRing) {
            citadelUpgradeRingMat.opacity = 0;
            citadelUpgradeRing.visible = false;
          }
        }
      }
      const nextCitScale = THREE.MathUtils.lerp(aetherCitadelGroup.scale.x, targetCitScale, 0.16);
      aetherCitadelGroup.scale.setScalar(nextCitScale);

      // 外圍雙星軌緩慢旋轉（Lv.3 全亮增輝微脈動）
      const ringSpeedMul = (citadelState.archLevel || 0) >= 3 ? 1.0 : 0.65;
      citadelOuterRingRot.rotation.y = t * 0.28 * ringSpeedMul;
      citadelInnerRingRot.rotation.y = -t * 0.42 * ringSpeedMul;
      if (citadelOuterAuraRing.visible) {
        citadelOuterAuraMat.opacity = 0.28 + Math.sin(t * 2.2) * 0.08;
        citadelInnerAuraMat.opacity = 0.24 + Math.cos(t * 2.4) * 0.07;
      }

      bottomApexCrystal.rotation.y = -t * 0.75;
      staffCrystal.rotation.y = t * 1.8;
      staffHalo.rotation.z = t * 1.3;

      if (citadelLv0AstrolabeGroup.visible) {
        astroDormantCore.rotation.y = t * 0.65;
      }
      if (citadelLv1LeftTower.visible) {
        ctBellPivot.rotation.z = Math.sin(t * 2.2) * 0.11;
        ctSpireTip.rotation.y = t * 1.1;
      }
      if (citadelLv1Armillary.visible) {
        lv1AstroCore.rotation.y = t * 1.35;
        lv1ArmRingA.rotation.y = t * 0.9;
        lv1ArmRingB.rotation.z = -t * 0.75;
      }
      if (citadelLv2Temple.visible) {
        templeHoloSpireGroup.position.y = 7.25 + Math.sin(t * 2.0) * 0.14;
        templeRoofPrism.rotation.y = t * 1.25;
        holoRing1.rotation.y = t * 1.1;
        holoRing2.rotation.z = -t * 0.95;
      }
      if (citadelSatLeft.root.visible) {
        citadelSatLeft.root.position.y = citadelSatLeft.root.userData.baseY + Math.sin(t * 1.5) * 0.28;
        citadelSatLeft.crystal.rotation.y = t * 1.1;
        citadelSatLeft.ring.rotation.z = t * 1.4;

        citadelSatRight.root.position.y = citadelSatRight.root.userData.baseY + Math.sin(t * 1.5 + Math.PI * 0.7) * 0.28;
        citadelSatRight.crystal.rotation.y = -t * 1.1;
        citadelSatRight.ring.rotation.z = -t * 1.4;
      }
      if (citadelLv2Decor.visible) {
        for (let pi = 0; pi < citadelPennants.length; pi++) {
          const p = citadelPennants[pi];
          p.pivot.rotation.y = Math.sin(t * 3.4 + p.phase) * 0.22;
        }
        for (let ci = 0; ci < citadelFloatingClusters.length; ci++) {
          const c = citadelFloatingClusters[ci];
          c.group.position.y = c.baseY + Math.sin(t * 2.1 + c.phase) * 0.22;
          c.group.rotation.y = t * 0.9 + c.phase;
        }
      }
      if (citadelLv3Crown.visible) {
        crownSpinGroup.rotation.y = t * 0.75;
        crownSpinGroup.position.y = Math.sin(t * 2.0) * 0.14;
      }
      if (citadelLv3Wings.visible) {
        const wingBreath = Math.sin(t * 1.4) * 0.06;
        citadelWingLeft.rotation.y = 0.22 + wingBreath;
        citadelWingRight.rotation.y = -0.22 - wingBreath;
      }

      if (citadelBarrierGroup.visible) {
        citadelBarrierGroup.rotation.y = t * 0.18;
        barrierDomeMat.opacity = 0.12 + Math.sin(t * 2.0) * 0.015;
        barrierRuneMat.opacity = 0.48 + Math.sin(t * 2.2) * 0.08;
      }
      if (citadelPortalMesh.visible) {
        citadelPortalMesh.rotation.z = t * 0.8;
        portalMat.opacity = 0.72 + Math.sin(t * 3.0) * 0.16;
      }
      if (citadelAscensionGroup.visible) {
        citadelInnerBeamTex.offset.x = (t * 0.16) % 1;
        citadelOuterBeamTex.offset.x = -(t * 0.1) % 1;
        citadelInnerBeamMesh.rotation.y = t * 0.35;
        citadelOuterBeamMesh.rotation.y = -t * 0.2;

        for (let rIdx = 0; rIdx < citadelRippleRings.length; rIdx++) {
          const rMesh = citadelRippleRings[rIdx];
          const p = (t * 0.42 + rMesh.userData.phase) % 1;
          const sc = 0.85 + p * 0.72;
          rMesh.scale.set(sc, sc, 1);
          rMesh.material.opacity = (1 - p) * 0.68;
        }

        for (let aIdx = 0; aIdx < citadelAscendRings.length; aIdx++) {
          const aRing = citadelAscendRings[aIdx];
          const p = (t * 0.32 + aRing.userData.phase) % 1;
          aRing.position.y = 1 + p * 16;
          const rScale = 1.08 - p * 0.36;
          aRing.scale.set(rScale, rScale, 1);
          const edgeFade = Math.sin(p * Math.PI);
          aRing.material.opacity = 0.25 + edgeFade * 0.65;
        }

        for (let sIdx = 0; sIdx < citadelSpiralSteps.length; sIdx++) {
          const st = citadelSpiralSteps[sIdx];
          st.position.y = st.userData.baseY + Math.sin(t * 2.0 + st.userData.index * 0.8) * 0.25;
        }
      }
    }

    // 更新 7 座動森風吊橋走動 NPC 與中央聖殿神聖雙環/火炬
    if (typeof updateBridgeNPCs === "function") {
      updateBridgeNPCs(t);
    }
    if (typeof updateSanctuaryDetails === "function") {
      updateSanctuaryDetails(t);
    }

    // 更新世界擴展動態（七島微型地標、NPC 小副島與聖殿光球）
    if (typeof updateWorldExpansion === "function") {
      updateWorldExpansion(t);
    }

    if (!ecoMode) {
      // 1. 海面正弦波上下微動態
      const posArr = oceanPosAttr.array;
      for (let i = 0; i < posArr.length; i += 3) {
        const bx = oceanBaseVertices[i];
        const bz = oceanBaseVertices[i + 2];
        const waveY =
          Math.sin(bx * 0.16 + t * 1.65) * 0.24 +
          Math.cos(bz * 0.18 + t * 1.35) * 0.2 +
          Math.sin((bx + bz) * 0.1 + t * 2.1) * 0.1;
        posArr[i + 1] = waveY;
      }
      oceanPosAttr.needsUpdate = true;
      oceanGeo.computeVertexNormals();

      // 四層大環境生態動態更新
      if (oceanEnv) oceanEnv.update(t);

      // 2. 白天白色微波輕微起伏與擺動
      rippleItems.forEach((item) => {
        const waveOffset = Math.sin(t * item.speed + item.phase);
        item.mesh.position.y = 0.22 + waveOffset * 0.12;
        item.mesh.scale.x = 0.85 + Math.cos(t * item.speed + item.phase) * 0.22;
      });
    }

    // 3. 7 座小島隨海浪輕柔微幅浮動、岸邊與淺灘外緣浪花呼吸縮放與淡入淡出、滑鼠懸停回饋與建築動態
    const baseFoamOp = THREE.MathUtils.lerp(THEME.day.foamOpacity, THEME.night.foamOpacity, nightBlend);
    islandRecords.forEach((rec) => {
      const bob = Math.sin(t * 1.4 + rec.phase) * 0.12;
      rec.group.position.y = bob;

      // 年級篩選 Highlight Beacon：金黃呼吸微光圓環
      if (rec.beaconRing && rec.beaconRing.visible) {
        const bp = 0.5 + 0.5 * Math.sin(t * 3.0 + rec.phase);
        rec.beaconMat.opacity = 0.35 + 0.55 * bp;
        const bs = 1 + bp * 0.07;
        rec.beaconRing.scale.set(bs, 1, bs);
      }

      // 內圈沙灘浪花與淺灘外緣浪花圈 (Shore Foam)：半徑呼吸微縮放 + 淡入淡出動態
      const innerBreath = 0.5 + 0.5 * Math.sin(t * 2.1 + rec.phase);
      const foamScale = 1 + (innerBreath - 0.5) * 0.08;
      rec.foamRing.scale.set(foamScale, 1, foamScale);
      if (rec.innerFoamMat) {
        rec.innerFoamMat.opacity = baseFoamOp * (0.45 + 0.55 * innerBreath);
      }

      if (rec.outerFoamRing && rec.outerFoamMat) {
        const outerBreath = 0.5 + 0.5 * Math.sin(t * 1.75 + rec.phase + 1.4);
        const outerScale = 1 + (outerBreath - 0.5) * 0.09;
        rec.outerFoamRing.scale.set(outerScale, 1, outerScale);
        rec.outerFoamMat.opacity = baseFoamOp * (0.32 + 0.68 * (1 - outerBreath));
      }

      let targetScale = hoveredIslandRec && hoveredIslandRec.id === rec.id ? 1.045 : 1.0;

      // 若該島剛升級，整座島嶼同步產生平滑回彈與金色擴散光環
      if (typeof rec.upgradeBounceTime === "number") {
        const uElapsed = t - rec.upgradeBounceTime;
        if (uElapsed >= 0 && uElapsed < 0.85) {
          const uNorm = uElapsed / 0.85;
          const islandPulse = Math.sin(uNorm * Math.PI * 2.5) * Math.exp(-3.8 * uNorm) * 0.12;
          targetScale += islandPulse;
          if (rec.upgradeRing) {
            rec.upgradeRing.scale.setScalar(1 + uNorm * 4.2);
            rec.upgradeRing.material.opacity = (1 - uNorm) * 0.85;
          }
        } else {
          rec.upgradeBounceTime = null;
          if (rec.upgradeRing) rec.upgradeRing.material.opacity = 0;
        }
      }

      const nextScale = THREE.MathUtils.lerp(rec.group.scale.x, targetScale, 0.16);
      rec.group.scale.setScalar(nextScale);

      // 各島繁榮度建築的細緻待機動態（近距檢視微動態）
      const refs = rec.animRefs || {};
      if (rec.level2Props.visible) {
        if (refs.sysFan) refs.sysFan.rotation.z = -t * 5.2;
        if (refs.codeWaterWheel) refs.codeWaterWheel.rotation.x = t * 2.1;
        if (refs.createGears) {
          refs.createGears.g1.rotation.z = t * 1.6;
          refs.createGears.g2.rotation.z = -t * 2.2;
        }
      }
      if (rec.level3Props.visible) {
        if (refs.sysObeliskRing) {
          refs.sysObeliskRing.rotation.z = t * 1.8;
          refs.sysObeliskRing.position.y = 1.65 + Math.sin(t * 2.6) * 0.15;
        }
        if (refs.citizenBeacon) {
          refs.citizenBeacon.rotation.y = t * 1.6;
        }
        if (refs.citizenShield) {
          refs.citizenShield.position.y = 1.85 + Math.sin(t * 2.4) * 0.12;
          refs.citizenShield.rotation.z = Math.sin(t * 1.5) * 0.08;
        }
        if (refs.createPrism) {
          refs.createPrism.rotation.y = t * 1.7;
          refs.createPrism.position.y = 2.75 + Math.sin(t * 2.5) * 0.12;
        }
        if (refs.codeSacredOrbit) {
          refs.codeSacredOrbit.rotation.y = t * 1.25;
        }
        if (refs.codeLanterns) {
          refs.codeLanterns.forEach((lt, li) => {
            lt.rotation.z = Math.sin(t * 2.2 + li * 1.2) * 0.16;
            lt.rotation.x = Math.cos(t * 1.8 + li * 0.8) * 0.1;
          });
        }
        if (refs.algoWisdomCore) {
          refs.algoWisdomCore.rotation.y = t * 1.9;
          refs.algoWisdomCore.position.y = 2.58 + Math.sin(t * 2.6) * 0.1;
        }
        if (refs.dataOrbitRing) {
          refs.dataOrbitRing.rotation.z = t * 1.6;
        }
        if (refs.aiCoreGroup) {
          refs.aiCoreGroup.position.y = 2.25 + Math.sin(t * 2.4) * 0.16;
          refs.aiCoreGroup.rotation.y = t * 0.9;
        }
        if (refs.aiGyro1) refs.aiGyro1.rotation.z = t * 2.2;
        if (refs.aiGyro2) refs.aiGyro2.rotation.x = t * 1.8;
        if (refs.aiGyro3) refs.aiGyro3.rotation.y = t * 1.4;
      }
    });

    // 7 座主題 NPC 島：懸停柔和放大回饋
    npcIslandRecords.forEach((nRec) => {
      const targetS = hoveredNpcIslandRec && hoveredNpcIslandRec.id === nRec.id ? nRec.baseScale * 1.045 : nRec.baseScale;
      const curS = THREE.MathUtils.lerp(nRec.group.scale.x, targetS, 0.16);
      nRec.group.scale.setScalar(curS);
    });

    // 3a. 建築升級落成平滑彈跳縮放動畫 (Scale Bounce)
    for (let i = activeBounceAnims.length - 1; i >= 0; i--) {
      const anim = activeBounceAnims[i];
      if (t < anim.startTime) {
        anim.group.scale.setScalar(0.001);
        continue;
      }
      const u = (t - anim.startTime) / anim.duration;
      if (u >= 1) {
        anim.group.scale.set(1, 1, 1);
        activeBounceAnims.splice(i, 1);
      } else {
        // 阻尼彈性彈跳曲線：0 -> 1.24 -> 0.93 -> 1.03 -> 1.0
        const elastic = Math.max(0.001, 1 - Math.exp(-5.2 * u) * Math.cos(2.6 * Math.PI * u));
        const stretch = Math.sin(u * Math.PI * 2.6) * Math.exp(-4.2 * u) * 0.08;
        const sy = Math.max(0.001, elastic * (1 + stretch));
        const sxz = Math.max(0.001, elastic * (1 - stretch * 0.5));
        anim.group.scale.set(sxz, sy, sxz);
      }
    }

    // 3b. 水面航線白色跳石隨波微幅浮動
    steppingStones.forEach((st) => {
      st.group.position.y = st.baseY + Math.sin(t * 1.85 + st.phase) * 0.09;
      const rScale = 1 + Math.sin(t * 2.3 + st.phase) * 0.08;
      st.ring.scale.set(rScale, 1, rScale);
    });

    // 3c. 學生角色移動與上下彈跳動畫 (1.2 秒沿 CatmullRomCurve3 跑向目標碼頭)
    if (moveState.active && moveState.curve) {
      const elapsed = t - moveState.startTime;
      const rawProgress = Math.min(1, Math.max(0, elapsed / moveState.duration));
      // 平滑加減速 (Ease-in-out)
      const easedU =
        rawProgress < 0.5
          ? 2 * rawProgress * rawProgress
          : 1 - Math.pow(-2 * rawProgress + 2, 2) / 2;

      const curPos = moveState.curve.getPointAt(easedU);
      const tangent = moveState.curve.getTangentAt(easedU);

      // 跑動時 Y 軸可愛上下彈跳動畫 (Bobbing effect: 8 次輕快跳躍)
      const hopPhase = rawProgress * Math.PI * 8;
      const bobOffset = Math.abs(Math.sin(hopPhase)) * 0.68;

      studentChar.root.position.set(curPos.x, curPos.y + bobOffset, curPos.z);

      if (tangent.lengthSq() > 0.0001) {
        const targetYaw = Math.atan2(tangent.x, tangent.z);
        // 平滑轉向切線方向
        let diff = targetYaw - studentChar.root.rotation.y;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        studentChar.root.rotation.y += diff * 0.28;
      }

      // 擺臂、邁步與 Q 彈縮放動態
      const stride = Math.sin(rawProgress * Math.PI * 16);
      studentChar.leftArm.rotation.x = stride * 0.78;
      studentChar.rightArm.rotation.x = -stride * 0.78;
      studentChar.leftLeg.rotation.x = -stride * 0.68;
      studentChar.rightLeg.rotation.x = stride * 0.68;
      studentChar.bodyPivot.rotation.z = Math.sin(hopPhase) * 0.1;
      studentChar.bodyPivot.rotation.x = 0.14;
      const squash = 1 + Math.sin(rawProgress * Math.PI * 16) * 0.06;
      studentChar.bodyPivot.scale.set(1 / Math.sqrt(squash), squash, 1 / Math.sqrt(squash));

      // 當角色即將抵達目標島嶼碼頭時（進度 >= 68%），觸發該島守護 NPC 與小動物轉身浮現「！」並歡呼跳躍 2 次
      if (rawProgress >= 0.68 && !moveState.greetingTriggered) {
        moveState.greetingTriggered = true;
        triggerDockGreeting(moveState.targetIndex, t);
      }

      if (rawProgress >= 1) {
        moveState.active = false;
        currentIslandIndex = moveState.targetIndex;
        const arrivedRec = islandRecords[currentIslandIndex];

        if (!moveState.greetingTriggered) {
          moveState.greetingTriggered = true;
          triggerDockGreeting(currentIslandIndex, t);
        }

        // 抵達目標碼頭，恢復站姿並面向島嶼/中央
        studentChar.root.position.set(
          arrivedRec.dockPos.x,
          arrivedRec.dockPos.y + arrivedRec.group.position.y,
          arrivedRec.dockPos.z
        );
        studentChar.root.rotation.y = arrivedRec.inwardAngle;
        studentChar.leftArm.rotation.x = 0;
        studentChar.rightArm.rotation.x = 0;
        studentChar.leftLeg.rotation.x = 0;
        studentChar.rightLeg.rotation.x = 0;
        studentChar.bodyPivot.rotation.set(0, 0, 0);
        studentChar.bodyPivot.scale.set(1, 1, 1);

        // 抵達後呼叫既有 openIslandDrawer(islandId) 展開課程抽屜
        if (moveState.targetIslandId) {
          openIslandDrawer(moveState.targetIslandId, moveState.targetTab, moveState.targetUnitKey);
          moveState.targetTab = null;
          moveState.targetUnitKey = null;
        }
      }
    } else {
      // 待機狀態：若 7 島 100% 終極聖殿共聚且學生位於中央榮譽廣場，站立於聖殿中央與 7 位守護 NPC 同慶；否則站在目前島嶼碼頭
      if (sanctuaryState.unlocked && sanctuaryState.studentAtPlaza) {
        const cheerHop = Math.abs(Math.sin(t * 4.2)) * 0.16;
        studentChar.root.position.set(
          0,
          GROUND_TOP_Y.SANCT_TIER3 + mysteryReefGroup.position.y + cheerHop,
          3.0
        );
        studentChar.root.rotation.y = 0;
        studentChar.bodyPivot.rotation.z = Math.sin(t * 4.2) * 0.06;
        studentChar.leftArm.rotation.x = -0.55 + Math.sin(t * 8.4) * 0.35;
        studentChar.rightArm.rotation.x = -0.55 - Math.sin(t * 8.4) * 0.35;
        studentChar.leftArm.rotation.z = 0.25;
        studentChar.rightArm.rotation.z = -0.25;
        studentChar.leafBulb.rotation.y = t * 2.4;
      } else {
        const stayRec = islandRecords[currentIslandIndex] || islandRecords[0];
        if (stayRec) {
          studentChar.root.position.x = stayRec.dockPos.x;
          studentChar.root.position.z = stayRec.dockPos.z;
          studentChar.root.position.y =
            stayRec.dockPos.y + stayRec.group.position.y + Math.abs(Math.sin(t * 2.6)) * 0.06;
        }
        studentChar.bodyPivot.rotation.z = Math.sin(t * 2.2) * 0.03;
        studentChar.leftArm.rotation.x = 0;
        studentChar.rightArm.rotation.x = 0;
        studentChar.leftArm.rotation.z = 0.12 + Math.sin(t * 2.6) * 0.06;
        studentChar.rightArm.rotation.z = -0.12 - Math.sin(t * 2.6) * 0.06;
        studentChar.leafBulb.rotation.y = t * 1.5;
      }
    }

    if (studentChar.petMount && studentChar.petMount.children.length > 0) {
      studentChar.petMount.position.y = 0.92 + Math.sin(t * 3.1) * 0.1;
      studentChar.petMount.rotation.y = Math.sin(t * 1.4) * 0.18;
    }
    if (studentChar.auraMount && studentChar.auraMount.children.length > 0) {
      studentChar.auraMount.rotation.y = t * 1.8;
    }

    // 4. 中央聖殿島 / 迷霧神秘礁岩：7 根石柱光芒、海面升起演出、迷霧吹散、頂端金色光束與慶祝彩帶
    sealPillars.forEach((p) => {
      if (p.isLit) {
        p.gemMesh.rotation.y = t * 1.9 + p.phase;
        p.gemMesh.position.y = 2.15 + Math.sin(t * 2.5 + p.phase) * 0.1;
        const hScale = 1 + Math.sin(t * 2.8 + p.phase) * 0.12;
        p.haloRing.scale.set(hScale, hScale, 1);
      } else {
        p.gemMesh.position.y = 2.15;
      }
    });

    if (sanctuaryState.awakeningActive) {
      const aElapsed = Math.max(0, t - sanctuaryState.awakeningStart);
      const u = Math.min(1, aElapsed / sanctuaryState.awakeningDuration);
      // Cubic ease-out 從海面下 -9.5 平滑升起至 0
      const easeOut = 1 - Math.pow(1 - u, 3);
      mysteryReefGroup.position.y = THREE.MathUtils.lerp(-9.5, 0, easeOut);

      // 迷霧向外吹散並淡出
      sanctuaryState.mistDispersion = easeOut;
      const baseMistOpacity = THREE.MathUtils.lerp(0.56, 0.42, nightBlend);
      mistMat.opacity = Math.max(0, baseMistOpacity * (1 - easeOut));

      // 金字塔/領航塔頂端金色光束向上射出展開
      const beamProgress = Math.max(0.01, Math.min(1, (u - 0.15) / 0.85));
      goldenBeamGroup.scale.set(1, beamProgress, 1);

      if (u >= 1) {
        sanctuaryState.awakeningActive = false;
        mysteryReefGroup.position.y = 0;
        mistGroup.visible = false;
        goldenBeamGroup.scale.set(1, 1, 1);
      }
    } else if (sanctuaryState.unlocked) {
      mysteryReefGroup.position.y = Math.sin(t * 1.3) * 0.1;
    } else {
      mysteryReefGroup.position.y = 0;
    }

    // 滑鼠懸停與封印點擊回饋縮放
    let sanctTargetScale = hoveredSanctuary ? 1.045 : 1.0;
    if (typeof sanctuaryState.sealClickPulseTime === "number") {
      const pElapsed = t - sanctuaryState.sealClickPulseTime;
      if (pElapsed >= 0 && pElapsed < 0.55) {
        sanctTargetScale += Math.sin((pElapsed / 0.55) * Math.PI * 2) * 0.05;
      } else {
        sanctuaryState.sealClickPulseTime = null;
      }
    }
    mysteryReefGroup.scale.setScalar(
      THREE.MathUtils.lerp(mysteryReefGroup.scale.x, sanctTargetScale, 0.15)
    );

    if (mistGroup.visible) {
      const disp = sanctuaryState.mistDispersion || 0;
      mistClouds.forEach((mc) => {
        const curAngle = mc.angle + t * mc.speed + disp * 1.8;
        const curRadius = mc.radius + disp * 12.5;
        mc.mesh.position.x = Math.cos(curAngle) * curRadius;
        mc.mesh.position.z = Math.sin(curAngle) * curRadius;
        mc.mesh.position.y = mc.baseY + disp * 2.4 + Math.sin(t * 1.5 + mc.phase) * 0.28;
        mc.mesh.rotation.y = -curAngle;
      });
    }

    if (sanctuaryState.unlocked && sanctuarySubgroup.visible) {
      const coreBob = Math.sin(t * 2.6) * 0.18;
      apexCrystal.rotation.y = t * 2.1;
      apexCrystal.position.y = 35.0 + coreBob;

      if (animRefs.apexDiamondCore) {
        animRefs.apexDiamondCore.position.y = 35.0 + coreBob;
        animRefs.apexDiamondCore.rotation.y = -t * 1.6;
        animRefs.apexDiamondCore.rotation.x = t * 1.1;
      }
      if (animRefs.apexAuraHalo) {
        animRefs.apexAuraHalo.position.y = 35.0 + coreBob;
        const auraPulse = 1 + Math.sin(t * 3.4) * 0.08;
        animRefs.apexAuraHalo.scale.setScalar(auraPulse);
      }
      apexAstrolabe.position.y = 35.0 + coreBob;
      apexAstrolabe.rotation.z = t * 1.7;
      apexAstrolabe.rotation.y = t * 1.1;

      if (animRefs.apexAstrolabe2) {
        animRefs.apexAstrolabe2.position.y = 35.0 + coreBob;
        animRefs.apexAstrolabe2.rotation.x = t * 1.4;
        animRefs.apexAstrolabe2.rotation.z = -t * 0.9;
      }
      if (animRefs.apexAstrolabe3) {
        animRefs.apexAstrolabe3.position.y = 35.0 + coreBob;
        animRefs.apexAstrolabe3.rotation.y = -t * 1.2;
        animRefs.apexAstrolabe3.rotation.x = t * 0.8;
      }
      if (animRefs.sanctuaryDataMotes) {
        animRefs.sanctuaryDataMotes.forEach((dm) => {
          const ma = t * dm.speed + dm.phase;
          dm.mesh.position.set(
            Math.cos(ma) * dm.orbitR,
            35.0 + coreBob + dm.yOffset + Math.sin(t * 2.5 + dm.phase) * 0.12,
            Math.sin(ma) * dm.orbitR
          );
          dm.mesh.rotation.set(t * 1.5, t * 1.8, 0);
        });
      }

      // 金色光束上的上升光環與呼吸感
      outerBeamMat.opacity = 0.36 + Math.sin(t * 3.2) * 0.08;
      beamHaloRings.forEach((hr) => {
        const cycle = (t * 0.45 + hr.phase) % 1;
        hr.mesh.position.y = cycle * 24;
        const rScale = 1 + cycle * 1.8;
        hr.mesh.scale.set(rScale, rScale, 1);
        hr.mat.opacity = (1 - cycle) * 0.75;
      });
    }

    // 終極解鎖 / 預覽狀態保持 3D 慶祝彩帶持續從神殿高空飄落
    if (sanctuaryState.unlocked && sanctuarySubgroup.visible) {
      if (!confettiGroup.visible) {
        confettiGroup.visible = true;
        confettiItems.forEach((item, idx) => resetConfettiPiece(item, (idx % 24) * 0.06));
      }
      sanctuaryState.confettiActiveUntil = t + 2.0;
    }

    // 低多邊形慶祝彩帶動態更新
    if (confettiGroup.visible) {
      const dt = 0.016;
      const keepSpawning = t < sanctuaryState.confettiActiveUntil;
      let anyAlive = false;

      confettiItems.forEach((item) => {
        item.age += dt;
        if (item.age < 0) {
          item.mesh.scale.setScalar(0.001);
          anyAlive = true;
          return;
        }
        if (item.age < item.maxLife) {
          anyAlive = true;
          item.vy -= 2.6 * dt; // 重力與空氣飄浮感
          item.mesh.position.x += (item.vx + Math.sin(t * 3 + item.rx) * 0.35) * dt;
          item.mesh.position.y += item.vy * dt;
          item.mesh.position.z += (item.vz + Math.cos(t * 3 + item.rz) * 0.35) * dt;
          item.mesh.rotation.x += item.rx * dt;
          item.mesh.rotation.y += item.ry * dt;
          item.mesh.rotation.z += item.rz * dt;

          const fade = Math.max(0.001, 1 - Math.max(0, (item.age - item.maxLife * 0.7) / (item.maxLife * 0.3)));
          item.mesh.scale.setScalar(fade);
        } else if (keepSpawning) {
          anyAlive = true;
          resetConfettiPiece(item, 0);
          item.mesh.scale.setScalar(1);
        } else {
          item.mesh.scale.setScalar(0.001);
        }
      });

      if (!anyAlive && !keepSpawning) {
        confettiGroup.visible = false;
      }
    }

    const reefBreath = 0.5 + 0.5 * Math.sin(t * 1.8);
    const reefScale = 1 + (reefBreath - 0.5) * 0.08;
    reefFoam.scale.set(reefScale, 1, reefScale);
    reefInnerFoamMat.opacity = baseFoamOp * (0.45 + 0.55 * reefBreath);

    const reefOuterBreath = 0.5 + 0.5 * Math.sin(t * 1.55 + 1.2);
    const reefOuterScale = 1 + (reefOuterBreath - 0.5) * 0.09;
    reefOuterFoam.scale.set(reefOuterScale, 1, reefOuterScale);
    reefOuterFoamMat.opacity = baseFoamOp * (0.32 + 0.68 * (1 - reefOuterBreath));

    // 4a. 七大主題島嶼守護 NPC 動態（呼吸、專屬微動態、碼頭迎賓「！」跳躍、終極聖殿共聚拍手慶祝）
    guardianNPCs.forEach((npc) => {
      const rec = islandRecords[npc.index];
      if (!rec) return;

      // 變色龍畫家卡蜜身體色彩隨時保持柔和漸層變換
      if (npc.id === "create" && npc.animRefs.camiSkinMat) {
        const hue = (0.36 + Math.sin(t * 0.52) * 0.18 + 1) % 1;
        npc.animRefs.camiSkinMat.color.setHSL(hue, 0.68, 0.56);
      }

      // 呼吸縮放律動與滑鼠懸停回饋
      const breath = Math.sin(t * 2.8 + npc.phase) * 0.032;
      npc.bodyPivot.scale.set(1 - breath * 0.45, 1 + breath, 1 - breath * 0.45);
      const targetNpcScale = hoveredGuardianNpc && hoveredGuardianNpc.id === npc.id ? 1.26 : 1.16;
      npc.root.scale.setScalar(THREE.MathUtils.lerp(npc.root.scale.x, targetNpcScale, 0.2));

      // 點擊對話時的開心小彈跳
      let talkHop = 0;
      if (t - npc.talkBounceStart >= 0 && t - npc.talkBounceStart < 0.55) {
        const tu = (t - npc.talkBounceStart) / 0.55;
        talkHop = Math.abs(Math.sin(tu * Math.PI * 2)) * 0.26;
      }

      // 【終極聖殿共聚】：若 7 座島皆達到 100% 滿分，所有守護 NPC 同步瞬移至中央榮譽廣場周圍排開，對著中央角色拍手慶祝
      if (sanctuaryState.unlocked) {
        npc.workProps.visible = false;
        if (npc.animRefs.handTool) npc.animRefs.handTool.visible = false;
        npc.exclSprite.visible = false;

        const plazaAngle = (npc.index / 7) * Math.PI * 2 - Math.PI / 2 + Math.PI / 7;
        const plazaRadius = 5.2;
        const px = Math.cos(plazaAngle) * plazaRadius;
        const pz = Math.sin(plazaAngle) * plazaRadius;
        const cheerHop = Math.abs(Math.sin(t * 5.2 + npc.phase)) * 0.28;
        const hoverOffset = npc.id === "ai" ? 0.34 + (Math.sin(t * 3.2 + npc.phase) + 1) * 0.5 * 0.24 : 0;
        const py = GROUND_TOP_Y.SANCT_TIER3 + mysteryReefGroup.position.y + cheerHop + hoverOffset + talkHop;

        npc.root.position.set(px, py, pz);

        // 面向中央榮譽廣場上的學生角色（若學生正跑向他島則面向聖殿中心）
        const focusX = sanctuaryState.studentAtPlaza ? studentChar.root.position.x : 0;
        const focusZ = sanctuaryState.studentAtPlaza ? studentChar.root.position.z : 0;
        npc.root.rotation.y = Math.atan2(focusX - px, focusZ - pz);

        // 雙手熱情拍手慶祝動態
        const clapWave = Math.abs(Math.sin(t * 10.5 + npc.phase));
        npc.leftArm.rotation.set(-0.78, 0.32 + clapWave * 0.42, 0.32 + clapWave * 0.38);
        npc.rightArm.rotation.set(-0.78, -0.32 - clapWave * 0.42, -0.32 - clapWave * 0.38);
        npc.bodyPivot.rotation.set(0, 0, Math.sin(t * 5.2 + npc.phase) * 0.08);
        npc.headPivot.rotation.set(-0.08 + Math.sin(t * 5.2 + npc.phase) * 0.08, 0, 0);
        return;
      }

      // 平時駐守於各自島嶼核心設施旁
      npc.workProps.visible = true;
      if (npc.animRefs.handTool) npc.animRefs.handTool.visible = true;

      const worldX = rec.group.position.x + npc.homeOffset.x;
      const worldZ = rec.group.position.z + npc.homeOffset.z;
      const baseIslandY = rec.group.position.y + npc.homeOffset.y;

      // 檢查是否處於「碼頭迎賓」狀態（轉向學生、頭頂浮現「！」並原地歡呼小跳躍 2 次）
      const greetElapsed = t - npc.greetStart;
      const isGreeting = greetElapsed >= 0 && greetElapsed < npc.greetDuration;

      if (isGreeting) {
        const gU = greetElapsed / npc.greetDuration;
        // 原地歡呼小跳躍 2 次 (2 full sine half-waves: sin(gU * Math.PI * 2))
        const greetHop = Math.abs(Math.sin(gU * Math.PI * 2)) * 0.48;
        const aiHover = npc.id === "ai" ? 0.36 : 0;
        npc.root.position.set(worldX, baseIslandY + aiHover + greetHop + talkHop, worldZ);

        // 頭頂浮現「！」驚嘆號彈出效果
        npc.exclSprite.visible = true;
        const popScale = gU < 0.18 ? (gU / 0.18) * 1.18 : gU > 0.85 ? ((1 - gU) / 0.15) : 1.0;
        npc.exclSprite.scale.setScalar(Math.max(0.01, 1.35 * popScale));

        // 轉向面向抵達碼頭的學生
        const targetYaw = Math.atan2(
          studentChar.root.position.x - worldX,
          studentChar.root.position.z - worldZ
        );
        let diff = targetYaw - npc.root.rotation.y;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        npc.root.rotation.y += diff * 0.28;

        // 雙手高舉歡呼揮動
        const wave = Math.sin(gU * Math.PI * 6);
        npc.leftArm.rotation.set(-0.95, 0, 0.35 + wave * 0.25);
        npc.rightArm.rotation.set(-0.95, 0, -0.35 - wave * 0.25);
        npc.bodyPivot.rotation.set(0, 0, Math.sin(gU * Math.PI * 4) * 0.1);
        npc.headPivot.rotation.set(-0.12, 0, 0);
        return;
      }

      npc.exclSprite.visible = false;

      // 平滑轉回面對島嶼外緣/正面視角
      const defaultYaw = Math.atan2(rec.dockPos.x - worldX, rec.dockPos.z - worldZ) * 0.35;
      let yawDiff = defaultYaw - npc.root.rotation.y;
      while (yawDiff > Math.PI) yawDiff -= Math.PI * 2;
      while (yawDiff < -Math.PI) yawDiff += Math.PI * 2;
      npc.root.rotation.y += yawDiff * 0.12;

      // 重置基礎姿態後套用各島守護 NPC 專屬微動態
      npc.bodyPivot.rotation.set(0, 0, 0);
      npc.headPivot.rotation.set(0, 0, 0);
      npc.leftArm.rotation.set(0, 0, 0);
      npc.rightArm.rotation.set(0, 0, 0);

      let extraHoverY = 0;

      switch (npc.id) {
        case "sys": {
          // 🖥️ 水獺工程師阿水：手持小扳手，有規律敲擊小石塊的微動作
          const strikeWave = Math.sin(t * 3.5);
          const strike = Math.pow(Math.max(0, strikeWave), 3);
          npc.rightArm.rotation.set(-0.42 + strike * 1.05, 0, 0);
          npc.leftArm.rotation.set(0, 0, 0.15 + Math.sin(t * 2.2) * 0.06);
          npc.headPivot.rotation.set(0.12 + strike * 0.16, Math.sin(t * 1.4) * 0.08, 0);
          npc.bodyPivot.rotation.x = strike * 0.08;

          if (npc.animRefs.sysRock && npc.animRefs.sysSparkRing && npc.animRefs.sysSparkMat) {
            if (strike > 0.65) {
              const impact = (strike - 0.65) / 0.35;
              npc.animRefs.sysRock.scale.set(1 + impact * 0.14, 1 - impact * 0.16, 1 + impact * 0.14);
              npc.animRefs.sysSparkRing.scale.setScalar(0.8 + impact * 0.95);
              npc.animRefs.sysSparkMat.opacity = impact * 0.9;
            } else {
              npc.animRefs.sysRock.scale.set(1, 1, 1);
              npc.animRefs.sysSparkMat.opacity = 0;
            }
          }
          break;
        }

        case "citizen": {
          // 🛡️ 巡邏犬警長布魯：持放大鏡低頭探查 + 柴犬捲尾搖擺
          const scanSweep = Math.sin(t * 1.75);
          const nodInspect = Math.abs(Math.sin(t * 2.4));
          npc.headPivot.rotation.set(0.34 + nodInspect * 0.12, scanSweep * 0.38, 0);
          npc.rightArm.rotation.set(-0.58 + nodInspect * 0.14, scanSweep * 0.32, 0);
          npc.leftArm.rotation.set(0.12, 0, 0.16);
          npc.bodyPivot.rotation.x = 0.1;
          if (npc.animRefs.citizenTail) {
            npc.animRefs.citizenTail.rotation.z = Math.sin(t * 6.8) * 0.26;
          }
          break;
        }

        case "create": {
          // 🎨 變色龍畫家卡蜜：持畫筆揮灑、大圓眼獨立轉動觀察、捲尾微擺
          npc.rightArm.rotation.set(-0.52 + Math.sin(t * 3.8) * 0.34, -0.26 + Math.cos(t * 1.9) * 0.18, 0);
          npc.leftArm.rotation.set(-0.2, 0, 0.18);
          npc.headPivot.rotation.set(Math.sin(t * 1.8) * 0.08, -0.18 + Math.sin(t * 1.3) * 0.18, 0);
          if (npc.animRefs.camiEyeL) {
            npc.animRefs.camiEyeL.rotation.y = Math.sin(t * 2.4) * 0.32;
          }
          if (npc.animRefs.camiEyeR) {
            npc.animRefs.camiEyeR.rotation.x = Math.cos(t * 2.9) * 0.25;
          }
          if (npc.animRefs.createTail) {
            npc.animRefs.createTail.rotation.z = Math.sin(t * 2.1) * 0.14;
          }
          break;
        }

        case "code": {
          // 🌲 工匠狸點點：頭頂小綠葉搖擺，面前紅黃藍三色積木方塊上下拼裝
          const assembleCycle = 0.5 + 0.5 * Math.sin(t * 2.3);
          npc.leftArm.rotation.set(-0.48 + Math.sin(t * 4.6) * 0.3, 0.18, 0);
          npc.rightArm.rotation.set(-0.48 - Math.sin(t * 4.6) * 0.3, -0.18, 0);
          npc.headPivot.rotation.set(0.14 + Math.sin(t * 2.3) * 0.08, 0, Math.sin(t * 2.3) * 0.06);
          if (npc.animRefs.codeLeaf) {
            npc.animRefs.codeLeaf.rotation.z = Math.sin(t * 3.8) * 0.24;
          }
          if (npc.animRefs.blockRed && npc.animRefs.blockYellow && npc.animRefs.blockBlue) {
            npc.animRefs.blockRed.position.set(
              THREE.MathUtils.lerp(-0.28, 0, assembleCycle),
              0.12 + Math.abs(Math.sin(t * 2.3)) * 0.03,
              0
            );
            npc.animRefs.blockYellow.position.set(
              0,
              THREE.MathUtils.lerp(0.12, 0.39, assembleCycle) + Math.abs(Math.sin(t * 4.6)) * 0.08,
              0
            );
            npc.animRefs.blockBlue.position.set(
              THREE.MathUtils.lerp(0.28, 0, assembleCycle),
              THREE.MathUtils.lerp(0.12, 0.66, assembleCycle) + Math.abs(Math.cos(t * 4.6)) * 0.12,
              0
            );
            npc.animRefs.blockBlue.rotation.y = (1 - assembleCycle) * 0.55;
          }
          break;
        }

        case "algo": {
          // ⛰️ 思維白鶴仙人：於石碑旁單腳獨立沈思
          npc.bodyPivot.rotation.z = Math.sin(t * 1.45) * 0.05;
          npc.headPivot.rotation.set(0.14 + Math.sin(t * 1.8) * 0.07, Math.sin(t * 0.9) * 0.1, 0);
          npc.leftArm.rotation.set(-0.35, 0.38, 0.24);
          npc.rightArm.rotation.set(-0.35, -0.38, -0.24);
          if (npc.animRefs.craneRaisedLeg) {
            npc.animRefs.craneRaisedLeg.position.y = 0.52 + Math.sin(t * 2.2) * 0.045;
          }
          if (npc.animRefs.algoSteleRune) {
            npc.animRefs.algoSteleRune.rotation.y = t * 1.8;
            npc.animRefs.algoSteleRune.position.y = 0.78 + Math.sin(t * 2.6) * 0.05;
          }
          break;
        }

        case "data": {
          // 📊 海獺搬運工：肚皮印有 0 與 1 標籤，抱著金屬資料桶在淺灘搖晃
          const rockSway = Math.sin(t * 2.65);
          npc.bodyPivot.rotation.z = rockSway * 0.15;
          npc.bodyPivot.rotation.x = Math.cos(t * 1.85) * 0.06;
          npc.headPivot.rotation.z = -rockSway * 0.08;
          npc.leftArm.rotation.z = 0.08 + Math.sin(t * 2.65) * 0.05;
          npc.rightArm.rotation.z = -0.08 + Math.sin(t * 2.65) * 0.05;
          if (npc.animRefs.dataBarrel) {
            npc.animRefs.dataBarrel.position.y = 0.66 + Math.abs(rockSway) * 0.05;
          }
          if (npc.animRefs.dataPuddleRing) {
            const pScale = 1 + Math.sin(t * 3.2) * 0.12;
            npc.animRefs.dataPuddleRing.scale.set(pScale, 1, pScale);
          }
          break;
        }

        case "ai":
        default: {
          // 🤖 懸浮小助理 Pixel：無腳圓柱小機器人、頭頂微光天線，在空中緩慢上下浮動懸停
          extraHoverY = 0.28 + (Math.sin(t * 3.1 + npc.phase) + 1) * 0.5 * 0.34;
          npc.bodyPivot.rotation.z = Math.sin(t * 2.0) * 0.06;
          npc.headPivot.rotation.y = Math.sin(t * 1.65) * 0.28;
          npc.leftArm.position.y = 0.46 + Math.sin(t * 4.2) * 0.06;
          npc.rightArm.position.y = 0.46 + Math.cos(t * 4.2) * 0.06;
          if (npc.animRefs.pixelAntHalo && npc.animRefs.pixelAntHaloMat) {
            const pulse = 0.5 + 0.5 * Math.sin(t * 5.2);
            npc.animRefs.pixelAntHalo.scale.setScalar(0.85 + pulse * 0.55);
            npc.animRefs.pixelAntHaloMat.opacity = 0.32 + pulse * 0.52;
          }
          if (npc.animRefs.pixelHoverRing) {
            const hScale = 0.88 - Math.sin(t * 3.1 + npc.phase) * 0.16;
            npc.animRefs.pixelHoverRing.scale.set(hScale, 1, hScale);
          }
          break;
        }
      }

      npc.root.position.set(worldX, baseIslandY + extraHoverY + talkHop, worldZ);
    });

    // 4b. 島嶼生態小動物自主動態（隨機走動、停頓、低頭覓食、Q 版小跳躍與碼頭迎賓「！」歡呼跳躍 2 次）
    islandCritters.forEach((cr) => {
      const crGreetElapsed = t - cr.greetStart;
      if (crGreetElapsed >= 0 && crGreetElapsed < cr.greetDuration) {
        const gU = crGreetElapsed / cr.greetDuration;
        const greetHop = Math.abs(Math.sin(gU * Math.PI * 2)) * 0.34;
        cr.root.position.set(cr.curX, cr.baseY + greetHop, cr.curZ);
        cr.bodyPivot.rotation.z = Math.sin(gU * Math.PI * 4) * 0.1;
        cr.headPivot.rotation.set(-0.15, 0, 0);

        if (cr.exclSprite) {
          cr.exclSprite.visible = true;
          const popScale = gU < 0.2 ? gU / 0.2 : gU > 0.85 ? (1 - gU) / 0.15 : 1.0;
          cr.exclSprite.scale.setScalar(Math.max(0.01, 0.92 * popScale));
        }

        // 轉向該島碼頭方向迎賓
        const islRec = islandRecords[cr.islandIndex];
        if (islRec) {
          const localDockX = islRec.dockPos.x - islRec.group.position.x;
          const localDockZ = islRec.dockPos.z - islRec.group.position.z;
          cr.root.rotation.y = Math.atan2(localDockX - cr.curX, localDockZ - cr.curZ);
        }
        return;
      }

      if (cr.exclSprite) {
        cr.exclSprite.visible = false;
      }

      if (t >= cr.nextSwitchTime) {
        const roll = Math.random();
        if (roll < 0.48) {
          cr.state = "walk";
          const randAng = Math.random() * Math.PI * 2;
          const randDist = (0.25 + Math.random() * 0.75) * cr.roamRadius;
          cr.targetX = cr.homeX + Math.cos(randAng) * randDist;
          cr.targetZ = cr.homeZ + Math.sin(randAng) * randDist;
          cr.nextSwitchTime = t + 1.4 + Math.random() * 1.8;
        } else if (roll < 0.78) {
          cr.state = "peck";
          cr.nextSwitchTime = t + 1.1 + Math.random() * 1.4;
        } else {
          cr.state = "idle";
          cr.nextSwitchTime = t + 0.9 + Math.random() * 1.3;
        }
      }

      if (cr.state === "walk") {
        const dx = cr.targetX - cr.curX;
        const dz = cr.targetZ - cr.curZ;
        const dist = Math.hypot(dx, dz);
        if (dist > 0.04) {
          const step = Math.min(dist, cr.speed * 0.016);
          cr.curX += (dx / dist) * step;
          cr.curZ += (dz / dist) * step;
          const targetYaw = Math.atan2(dx, dz);
          let diff = targetYaw - cr.root.rotation.y;
          while (diff > Math.PI) diff -= Math.PI * 2;
          while (diff < -Math.PI) diff += Math.PI * 2;
          cr.root.rotation.y += diff * 0.22;
        } else {
          cr.state = "peck";
        }
        // Q 版小跳躍動畫
        const hop = Math.abs(Math.sin(t * 9.5 + cr.phase)) * (cr.kind === "bunny" ? 0.19 : 0.11);
        cr.root.position.set(cr.curX, cr.baseY + hop, cr.curZ);
        cr.bodyPivot.rotation.z = Math.sin(t * 9.5 + cr.phase) * 0.08;
        cr.headPivot.rotation.x = 0;
      } else if (cr.state === "peck") {
        // 停頓並低頭覓食 / 點頭觀察
        const miniHop = Math.abs(Math.sin(t * 3.2 + cr.phase)) * 0.03;
        cr.root.position.set(cr.curX, cr.baseY + miniHop, cr.curZ);
        cr.bodyPivot.rotation.z = 0;
        cr.headPivot.rotation.x = Math.abs(Math.sin(t * 6.8 + cr.phase)) * 0.45;
      } else {
        // 停頓東張西望
        cr.root.position.set(cr.curX, cr.baseY, cr.curZ);
        cr.bodyPivot.rotation.z = 0;
        cr.headPivot.rotation.x = 0;
        cr.headPivot.rotation.y = Math.sin(t * 2.6 + cr.phase) * 0.35;
      }
    });

    // 4b2. 各島新增 Q 版島民與小動物微動態（純非負跳躍，絕不沉入地板）
    islandBuddies.forEach((bd) => {
      if (bd.mode === "circle") {
        const ca = t * 1.35 + bd.phase;
        const cr = 0.34;
        const nx = bd.homeX + Math.cos(ca) * cr;
        const nz = bd.homeZ + Math.sin(ca) * cr;
        const hop = Math.abs(Math.sin(t * 7.2 + bd.phase)) * 0.08;
        bd.root.position.set(nx, bd.baseY + hop, nz);
        bd.root.rotation.y = -ca;
        bd.bodyPivot.rotation.z = Math.sin(t * 7.2 + bd.phase) * 0.07;
      } else if (bd.mode === "wave") {
        const hop = Math.abs(Math.sin(t * 3.4 + bd.phase)) * 0.07;
        bd.root.position.set(bd.homeX, bd.baseY + hop, bd.homeZ);
        bd.headPivot.rotation.y = Math.sin(t * 1.8 + bd.phase) * 0.32;
        if (bd.armR) bd.armR.rotation.z = -0.55 - Math.abs(Math.sin(t * 5.2 + bd.phase)) * 0.75;
      } else if (bd.mode === "hop") {
        const hop = Math.abs(Math.sin(t * 4.5 + bd.phase)) * 0.14;
        bd.root.position.set(bd.homeX, bd.baseY + hop, bd.homeZ);
        bd.bodyPivot.rotation.z = Math.sin(t * 4.5 + bd.phase) * 0.06;
        bd.headPivot.rotation.x = Math.sin(t * 4.5 + bd.phase) * 0.08;
      } else {
        const hop = Math.abs(Math.sin(t * 2.4 + bd.phase)) * 0.03;
        bd.root.position.set(bd.homeX, bd.baseY + hop, bd.homeZ);
        bd.headPivot.rotation.y = Math.sin(t * 1.4 + bd.phase) * 0.48;
      }
      if (bd.tailPivot) bd.tailPivot.rotation.y = Math.sin(t * 4.2 + bd.phase) * 0.36;
    });

    // 4b3. 中央神殿 8 位領航員與守護小動物聚落動態（隨解鎖或終極預覽歡呼跳躍，精準貼合各層 y）
    if (sanctuarySubgroup.visible) {
      sanctuaryNPCs.forEach((snpc) => {
        const isCheering = finaleEffectsGroup.visible;
        const speed = isCheering ? 5.6 : 2.8;
        const amp = isCheering ? 0.22 : 0.06;
        const hop = Math.abs(Math.sin(t * speed + snpc.phase)) * amp;
        snpc.root.position.set(snpc.baseX, snpc.baseY + hop, snpc.baseZ);
        snpc.headPivot.rotation.y = Math.sin(t * 1.6 + snpc.phase) * 0.3;
        snpc.bodyPivot.rotation.z = Math.sin(t * speed + snpc.phase) * (isCheering ? 0.08 : 0.03);
        if (snpc.armL) snpc.armL.rotation.z = 0.35 + (isCheering ? Math.abs(Math.sin(t * 7.5 + snpc.phase)) * 0.8 : 0);
        if (snpc.armR) snpc.armR.rotation.z = -0.35 - (isCheering ? Math.abs(Math.sin(t * 7.5 + snpc.phase)) * 0.8 : 0);
        if (snpc.tailPivot) snpc.tailPivot.rotation.y = Math.sin(t * 4.5 + snpc.phase) * 0.35;
      });
    }

    // 4c. 海面巡航雙桅小帆船動態（沿環狀路徑巡航 + 隨波浪左右傾斜 Roll 與起伏晃動）
    sailingBoats.forEach((sb) => {
      const u = (sb.startU + t * sb.speed) % 1;
      const pt = sb.curve.getPointAt(u);
      const tan = sb.curve.getTangentAt(u);

      const waveHeave = Math.sin(t * 2.3 + sb.phase) * 0.14;
      sb.root.position.set(pt.x, pt.y + waveHeave, pt.z);
      if (tan.lengthSq() > 0.0001) {
        sb.root.rotation.y = Math.atan2(tan.x, tan.z);
      }

      // 隨波浪左右傾斜 (Roll) 與前後微俯仰 (Pitch)
      sb.rockPivot.rotation.z = Math.sin(t * 2.0 + sb.phase) * 0.12;
      sb.rockPivot.rotation.x = Math.cos(t * 1.6 + sb.phase) * 0.05;

      const wakeBreath = 0.5 + 0.5 * Math.sin(t * 3.1 + sb.phase);
      sb.wakeRing.scale.set(0.78 + wakeBreath * 0.16, 1, 1.85 + wakeBreath * 0.25);
      sb.wakeMat.opacity = baseFoamOp * (0.35 + 0.45 * wakeBreath);
    });

    // 4d. 大地圖海域冒險點綴動態（海中礁石與沙洲碎浪、漂流木桶/漂流木旋轉起伏、紅白浮標呼吸警示燈）
    seaReefClusters.forEach((rc) => {
      const b = 0.5 + 0.5 * Math.sin(t * 2.0 + rc.phase);
      const s = 1 + (b - 0.5) * 0.1;
      rc.surfRing.scale.set(s, 1, s);
      rc.surfMat.opacity = baseFoamOp * (0.35 + 0.65 * b);
    });

    floatingFlotsam.forEach((fl) => {
      const waveY =
        Math.sin(fl.x * 0.16 + t * 1.65) * 0.18 +
        Math.cos(fl.z * 0.18 + t * 1.35) * 0.14;
      fl.mesh.position.y = 0.12 + waveY;
      fl.mesh.rotation.y += fl.rotSpeed * 0.016;
      fl.mesh.rotation.x = Math.sin(t * 1.9 + fl.phase) * 0.14;
      fl.mesh.rotation.z = Math.cos(t * 1.7 + fl.phase) * 0.14;
    });

    navBuoys.forEach((b) => {
      const waveY =
        Math.sin(b.x * 0.16 + t * 1.65) * 0.16 +
        Math.cos(b.z * 0.18 + t * 1.35) * 0.12;
      b.root.position.y = 0.06 + waveY;
      b.tiltPivot.rotation.z = Math.sin(t * 2.1 + b.phase) * 0.13;
      b.tiltPivot.rotation.x = Math.cos(t * 1.8 + b.phase) * 0.1;

      // 頂端警示燈罩交替閃爍與水面投影同步亮滅
      const rawPulse = 0.5 + 0.5 * Math.sin(t * 2.6 + b.phase);
      const pulse = Math.pow(rawPulse, 1.35);
      const dayHalo = 0.28 * (0.35 + 0.65 * pulse);
      const nightHalo = 0.85 * (0.22 + 0.78 * pulse);
      b.haloMat.opacity = THREE.MathUtils.lerp(dayHalo, nightHalo, nightBlend);
      b.haloSphere.scale.setScalar(0.82 + pulse * 0.55 * (0.7 + 0.3 * nightBlend));
      if (b.beaconMat) {
        b.beaconMat.opacity = THREE.MathUtils.lerp(0.85, 0.45 + 0.55 * pulse, nightBlend);
      }
      if (b.waterGlow) {
        b.waterGlow.mesh.visible = nightBlend > 0.01;
        b.waterGlow.mat.opacity = nightBlend * (0.14 + 0.52 * pulse);
        const wgScale = 0.88 + 0.24 * pulse;
        b.waterGlow.mesh.scale.set(wgScale, 1, wgScale);
      }
      b.ringMat.color.copy(dayFoamColor).lerp(nightBlueTearsFoamColor, nightBlend * 0.75);
      b.ringMat.opacity = baseFoamOp * (0.35 + 0.55 * pulse);
    });

    // 5. 低多邊形白雲緩慢飄動與海鷗拍翅盤旋
    driftingClouds.forEach((cl) => {
      cl.mesh.position.x += cl.speed * 0.016;
      if (cl.mesh.position.x > 68) {
        cl.mesh.position.x = -68;
      }
      cl.mesh.position.y = cl.baseY + Math.sin(t * 0.65 + cl.phase) * 0.32;
      cl.mesh.position.z = cl.baseZ + Math.cos(t * 0.45 + cl.phase) * 0.4;
    });

    circlingSeagulls.forEach((g) => {
      const ang = t * g.orbitSpeed + g.phase;
      const nx = g.cx + Math.cos(ang) * g.rx;
      const nz = g.cz + Math.sin(ang) * g.rz;
      const ny = g.baseY + Math.sin(t * 1.6 + g.phase) * 0.55;
      g.root.position.set(nx, ny, nz);

      // 沿切線方向飛行並微微側傾 (Banking)
      const tx = -Math.sin(ang) * g.rx * g.orbitSpeed;
      const tz = Math.cos(ang) * g.rz * g.orbitSpeed;
      g.root.rotation.y = Math.atan2(tx, tz);
      g.root.rotation.z = (g.orbitSpeed > 0 ? -0.18 : 0.18) + Math.sin(t * 2.2 + g.phase) * 0.05;

      // 雙翼拍動 (偶爾滑翔)
      const glideMod = Math.sin(t * 0.9 + g.phase) > 0.55 ? 0.18 : 1.0;
      const flap = Math.sin(t * g.flapSpeed + g.phase) * 0.56 * glideMod;
      g.leftWingPivot.rotation.z = flap;
      g.rightWingPivot.rotation.z = -flap;
    });

    // 5b. 海空巡遊動態 NPC（信差海鷗、深海跳躍海豚、釣魚小熊微型木筏）
    // (1) 【信差海鷗】沿大半徑圓形軌道緩慢盤旋巡航
    if (messengerGull) {
      const mAng = t * messengerGull.orbitSpeed + messengerGull.phase;
      const mx = Math.cos(mAng) * messengerGull.orbitRadius;
      const mz = Math.sin(mAng) * messengerGull.orbitRadius;
      const my = messengerGull.baseY + Math.sin(t * 1.45) * 0.65;
      messengerGull.root.position.set(mx, my, mz);

      const mtx = -Math.sin(mAng) * messengerGull.orbitRadius * messengerGull.orbitSpeed;
      const mtz = Math.cos(mAng) * messengerGull.orbitRadius * messengerGull.orbitSpeed;
      messengerGull.root.rotation.y = Math.atan2(mtx, mtz);
      messengerGull.root.rotation.z = -0.16 + Math.sin(t * 2.1) * 0.05;

      const mFlap = Math.sin(t * messengerGull.flapSpeed) * 0.58;
      messengerGull.leftWingPivot.rotation.z = mFlap;
      messengerGull.rightWingPivot.rotation.z = -mFlap;
      if (messengerGull.bagGroup) {
        messengerGull.bagGroup.rotation.z = -0.22 + Math.sin(t * 3.8) * 0.06;
      }
    }

    // (2) 外圍深海區 2 隻【跳躍海豚】以拋物線弧度定時躍出水面並激起微小水花粒子後潛入（省電登入模式暫停粒子）
    const dtDolphin = 0.016;
    if (!ecoMode) jumpingDolphins.forEach((d) => {
      const cycleTime = (t + d.phaseOffset) % d.cyclePeriod;
      if (cycleTime < d.jumpDuration) {
        const u = cycleTime / d.jumpDuration; // 0 -> 1
        d.bodyGroup.visible = true;

        // 拋物線運動軌跡：x/z 等速推進，y 呈拋物線 4 * H * u * (1 - u)
        const s = (u - 0.5) * d.jumpLength;
        const wx = d.centerX + d.dirX * s;
        const wz = d.centerZ + d.dirZ * s;
        const wy = -1.25 + 4 * d.jumpHeight * u * (1 - u);
        d.bodyGroup.position.set(wx, wy, wz);

        // 沿拋物線切線俯仰角 (Pitch) 與前進方位角 (Yaw)
        const dyDu = 4 * d.jumpHeight * (1 - 2 * u);
        const dsDu = d.jumpLength;
        const pitch = -Math.atan2(dyDu, dsDu);
        const yaw = Math.atan2(d.dirX, d.dirZ);
        d.bodyGroup.rotation.set(pitch, yaw, 0);

        // 躍出水面瞬間與重返海面瞬間各激起一次水花粒子
        if (u >= 0.08 && !d.emergedTriggered) {
          d.emergedTriggered = true;
          burstDolphinSplash(d, wx, wz);
        }
        if (u >= 0.88 && !d.divedTriggered) {
          d.divedTriggered = true;
          burstDolphinSplash(d, wx, wz);
        }
      } else {
        d.bodyGroup.visible = false;
        d.emergedTriggered = false;
        d.divedTriggered = false;
      }

      // 更新海豚水花粒子與水紋擴散圈
      d.droplets.forEach((drop) => {
        if (!drop.mesh.visible) return;
        drop.age += dtDolphin;
        if (drop.age < drop.maxLife) {
          drop.vy -= 9.2 * dtDolphin;
          drop.mesh.position.x += drop.vx * dtDolphin;
          drop.mesh.position.y += drop.vy * dtDolphin;
          drop.mesh.position.z += drop.vz * dtDolphin;
          const sFade = Math.max(0.01, 1 - drop.age / drop.maxLife);
          drop.mesh.scale.setScalar(sFade);
        } else {
          drop.mesh.visible = false;
        }
      });

      if (d.splashRingAge < 0.75) {
        d.splashRingAge += dtDolphin;
        const rNorm = Math.min(1, d.splashRingAge / 0.75);
        d.splashRing.scale.setScalar(0.8 + rNorm * 2.4);
        d.splashRingMat.opacity = (1 - rNorm) * 0.82;
      } else {
        d.splashRingMat.opacity = 0;
      }
    });

    // (3) 海陸交通：載著【釣魚小熊】的微型木筏，緩慢在鄰近兩座島嶼碼頭之間穿梭航行
    if (fishingBearRaft && segmentCurves.length > 0) {
      const seg = segmentCurves[fishingBearRaft.routeSegmentIndex % segmentCurves.length];
      if (seg && seg.waterCurve) {
        // 以平滑三角餘弦往返於 0.14 ~ 0.86 之間（鄰近兩座島嶼碼頭之間）
        const rawPhase = t * fishingBearRaft.speed;
        const uRaft = 0.5 - 0.36 * Math.cos(rawPhase);
        const dirSign = Math.sin(rawPhase) >= 0 ? 1 : -1;

        const rPt = seg.waterCurve.getPointAt(uRaft);
        const rTan = seg.waterCurve.getTangentAt(uRaft).multiplyScalar(dirSign);
        const waveY = Math.sin(t * 2.1) * 0.12;

        fishingBearRaft.root.position.set(rPt.x, 0.1 + waveY, rPt.z);
        if (rTan.lengthSq() > 0.0001) {
          const targetYaw = Math.atan2(rTan.x, rTan.z);
          let diff = targetYaw - fishingBearRaft.root.rotation.y;
          while (diff > Math.PI) diff -= Math.PI * 2;
          while (diff < -Math.PI) diff += Math.PI * 2;
          fishingBearRaft.root.rotation.y += diff * 0.08;
        }

        // 木筏隨波輕微搖晃與釣魚小熊點頭拉竿微動態
        fishingBearRaft.rockPivot.rotation.z = Math.sin(t * 1.95) * 0.09;
        fishingBearRaft.rockPivot.rotation.x = Math.cos(t * 1.55) * 0.05;
        fishingBearRaft.bearHead.rotation.x = 0.08 + Math.sin(t * 2.2) * 0.06;
        fishingBearRaft.rodPivot.rotation.x = Math.sin(t * 2.8) * 0.08;
        fishingBearRaft.bobberFloat.position.y = -0.62 + Math.sin(t * 4.2) * 0.06;

        const wBreath = 0.5 + 0.5 * Math.sin(t * 2.8);
        fishingBearRaft.wakeRing.scale.set(0.9 + wBreath * 0.14, 1, 1.3 + wBreath * 0.2);
        fishingBearRaft.wakeMat.opacity = baseFoamOp * (0.35 + 0.45 * wBreath);
      }
    }

    // 6. 夜晚星光與螢火蟲微粒漂浮、透明度/亮度微閃效果（省電登入模式暫停高頻微粒更新）
    if (!ecoMode && nightBlend > 0.01) {
      const ffArr = fireflyGeo.attributes.position.array;
      const colArr = fireflyGeo.attributes.color.array;
      for (let i = 0; i < fireflyCount; i++) {
        const b = fireflyBase[i];
        const driftAmp = b.isHighStar ? 0.25 : 1.15;
        ffArr[i * 3] = b.x + Math.sin(t * b.speed + b.phase) * driftAmp;
        ffArr[i * 3 + 1] = b.y + Math.sin(t * (b.speed * 1.3) + b.phase) * (driftAmp * 0.65);
        ffArr[i * 3 + 2] = b.z + Math.cos(t * b.speed + b.phase) * driftAmp;

        // 獨立透明度/亮度微閃 (Twinkle: 0.22 ~ 1.0)
        const twinkle = 0.22 + 0.78 * (0.5 + 0.5 * Math.sin(t * b.twinkleSpeed + b.twinklePhase));
        colArr[i * 3] = b.r * twinkle;
        colArr[i * 3 + 1] = b.g * twinkle;
        colArr[i * 3 + 2] = b.b * twinkle;
      }
      fireflyGeo.attributes.position.needsUpdate = true;
      fireflyGeo.attributes.color.needsUpdate = true;
    }

    controls.update();

    // 鏡頭精緻特寫平滑過渡 (Focus Mode: 點擊島嶼/全景重置)
    if (cameraFocusState.active) {
      const fElapsed = Math.max(0, t - cameraFocusState.startTime);
      const u = Math.min(1, fElapsed / cameraFocusState.duration);
      // 平滑三次 EaseInOut: u < 0.5 ? 4*u*u*u : 1 - Math.pow(-2*u + 2, 3) / 2
      const ease = u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2;
      camera.position.lerpVectors(cameraFocusState.fromCamPos, cameraFocusState.toCamPos, ease);
      controls.target.lerpVectors(cameraFocusState.fromTarget, cameraFocusState.toTarget, ease);
      if (u >= 1) {
        cameraFocusState.active = false;
      }
    }

    // 登島初始鳥瞰俯衝動畫
    if (cameraIntroState.active) {
      const cElapsed = Math.max(0, t - cameraIntroState.startTime);
      const u = Math.min(1, cElapsed / cameraIntroState.duration);
      const easeOut = 1 - Math.pow(1 - u, 3);
      camera.position.lerpVectors(cameraIntroState.fromPos, cameraIntroState.toPos, easeOut);
      controls.target.lerpVectors(cameraIntroState.fromTarget, cameraIntroState.toTarget, easeOut);
      if (u >= 1) {
        cameraIntroState.active = false;
      }
    }

    // 即時同步動森風 NPC 2D 對話氣泡之頭頂投影座標
    if (activeBubbleNpc) {
      updateNpcBubbleScreenPosition();
    }

    renderer.render(scene, camera);
    hasRenderedInitialFullFrame = true;
  }

  const resetView = resetCameraToPanorama;

  function initScene() {
    return window.__island3D;
  }

  window.initScene = initScene;
  window.resetView = resetView;
  window.focusIsland = focusIsland;
  window.resetCameraToPanorama = resetCameraToPanorama;
  window.applyIslandGradeFilter = applyGradeFilter;
  window.applyGradeFilter = applyGradeFilter;

  window.__island3D = {
    initScene,
    resetView,
    focusOnSanctuary,
    focusOnAetherCitadel,
    flyToIsland,
    syncCitadelState: syncCitadelVisualState,
    updateAetherCitadelArchitecture,
    aetherCitadelGroup,
    citadelAscensionGroup,
    citadelState,
    scene,
    camera,
    islandRecords,
    npcIslandRecords,
    guardianNPCs,
    islandCritters,
    messengerGull,
    jumpingDolphins,
    fishingBearRaft,
    studentChar,
    moveState,
    sanctuaryState,
    startRunToIsland,
    focusIsland,
    focusOnIsland,
    resetCameraToPanorama,
    applyGradeFilter,
    showNpcSpeechBubble,
    hideNpcSpeechBubble,
    triggerDockGreeting,
    updateAllIslandArchitectures,
    updateIslandsProgress,
    triggerSanctuaryAwakening,
    launchCelebrationConfetti,
    retriggerConfetti: launchCelebrationConfetti,
    launchConfetti: launchCelebrationConfetti,
    setNight: (night) => applyDayNightTheme(!!night),
    isNight: () => isNight,
    setTargetIslandHighlight,
    resumeMainMapControls,
    playerCursorMesh: playerCursorGroup,
    playerCursorState,
    setPlayerCursorTarget,
    getActiveIslandId: () => playerCursorState.targetId
  };
  window.resumeMainMapControls = resumeMainMapControls;

  let isModalOpen = false;
  const ECO_FRAME_INTERVAL_MS = 1000 / 24; // 登入視窗開啟期間節流至 ~24 FPS 省電平滑模式
  let lastRenderTimestamp = 0;
  let hasRenderedInitialFullFrame = false;

  function isAnyBlockingModalOpen() {
    return !!document.querySelector("#quizModal.show, #docModal.show, #leaderboardModal.show, #resultModal.show, #aetherCitadelModal.show");
  }

  function isLoginModalOpen() {
    const loginEl = document.getElementById("loginModal");
    const tcAuthEl = document.getElementById("tcAuthModal");
    const studentOpen = !!(loginEl && loginEl.classList.contains("show") && !loginEl.hidden);
    const teacherOpen = !!(tcAuthEl && tcAuthEl.classList.contains("show") && !tcAuthEl.hidden);
    return studentOpen || teacherOpen;
  }

  function isScenePaused() {
    if (document.hidden) return true;
    if (window.isTeacherCockpitOpen && window.isTeacherCockpitOpen()) return true;
    isModalOpen = isAnyBlockingModalOpen();
    return isModalOpen;
  }

  function animate(nowMs) {
    // 永遠在函式最開頭持續排程下一幀，絕不在提早 return 時中斷 requestAnimationFrame 迴圈
    animFrameId = requestAnimationFrame(animate);
    if (isScenePaused()) {
      return;
    }
    const ecoMode = isLoginModalOpen();
    const now = typeof nowMs === "number" ? nowMs : performance.now();
    if (ecoMode) {
      if (lastRenderTimestamp && (now - lastRenderTimestamp) < ECO_FRAME_INTERVAL_MS) {
        return;
      }
      lastRenderTimestamp = now;
    } else {
      lastRenderTimestamp = 0;
    }
    try {
      renderSceneFrame({ ecoMode });
    } catch (err) {
      console.error("[island_3d] renderSceneFrame error:", err);
    }
  }

  function resumeMainMapControls() {
    const cockpitOpen = !!(window.isTeacherCockpitOpen && window.isTeacherCockpitOpen());
    const loginOpen = isLoginModalOpen();
    isModalOpen = isAnyBlockingModalOpen();
    document.body.style.overflow = "";
    cameraFocusState.active = false;
    cameraIntroState.active = false;
    pointerDownPos = null;
    hoveredIslandRec = null;
    hoveredNpcIslandRec = null;
    hoveredGuardianNpc = null;
    hoveredSanctuary = false;
    hoveredAetherCitadel = false;
    if (stage) {
      stage.style.cursor = "grab";
    }
    controls.enabled = !cockpitOpen && !isModalOpen && !loginOpen;
    controls.update();
    if (!loginOpen) lastRenderTimestamp = 0;
    if (animFrameId === null) {
      animate();
    }
    if (!document.hidden && !cockpitOpen && !isModalOpen) {
      try {
        lastNightUpdateTime = clock.getElapsedTime();
        renderSceneFrame({ ecoMode: loginOpen });
      } catch (err) {
        console.error("[island_3d] resumeMainMapControls render error:", err);
      }
    }
  }

  function resumeSceneLoop() {
    const cockpitOpen = !!(window.isTeacherCockpitOpen && window.isTeacherCockpitOpen());
    const loginOpen = isLoginModalOpen();
    isModalOpen = isAnyBlockingModalOpen();
    controls.enabled = !cockpitOpen && !isModalOpen && !loginOpen;
    if (!loginOpen) lastRenderTimestamp = 0;
    if (animFrameId === null) {
      animate();
    }
    if (!cockpitOpen && !isModalOpen && !loginOpen) {
      controls.update();
    }
  }

  const isInsideModalOrScrollable = (target) => {
    if (!target || typeof target.closest !== "function") return false;
    return !!target.closest("#tcCockpit, #tcAuthModal, #tcDetailModal, #tcConfirmModal, #tcProjectorModal, #teacher-question-projector, #teacher-island-details-modal, #teacher-dashboard-modal, #aetherCitadelModal, #loginModal, [data-scrollable='true']");
  };
  const guardCanvasScroll = (e) => {
    if (isInsideModalOrScrollable(e.target) || (window.isTeacherCockpitOpen && window.isTeacherCockpitOpen())) {
      controls.enabled = false;
      return;
    }
  };
  if (renderer && renderer.domElement) {
    renderer.domElement.addEventListener("wheel", guardCanvasScroll, { capture: true, passive: true });
    renderer.domElement.addEventListener("touchmove", guardCanvasScroll, { capture: true, passive: true });
  }

  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) resumeMainMapControls();
  });
  document.addEventListener("ii:quizclosed", resumeMainMapControls);
  document.addEventListener("ii:modalclosed", (e) => {
    resumeMainMapControls();
    const closedId = e && e.detail && e.detail.id;
    if (closedId === "aetherCitadelModal" || pendingCitadelArchSync) {
      pendingCitadelArchSync = false;
      if (typeof updateAetherCitadelArchitecture === "function") {
        updateAetherCitadelArchitecture({ animate: true });
      }
    }
  });
  document.addEventListener("ii:login", () => {
    lastRenderTimestamp = 0;
    resumeSceneLoop();
  });
  document.addEventListener("ii:logout", () => {
    resumeSceneLoop();
  });
  document.addEventListener("ii:cockpit-toggle", (e) => {
    if (e && e.detail && typeof e.detail.open === "boolean") {
      controls.enabled = !e.detail.open && !isAnyBlockingModalOpen() && !isLoginModalOpen();
    }
    resumeSceneLoop();
  });

  let attachSceneModalObservers = null;
  const observeBlockingModals = () => {
    if (typeof MutationObserver === "undefined") return;
    const modalObserver = new MutationObserver((mutations) => {
      const onlyLoginChanged = mutations.every((m) => m.target && (m.target.id === "loginModal" || m.target.id === "tcAuthModal"));
      if (onlyLoginChanged) {
        if (!isLoginModalOpen()) lastRenderTimestamp = 0;
        resumeSceneLoop();
        return;
      }
      if (!isScenePaused()) {
        resumeMainMapControls();
      } else {
        resumeSceneLoop();
      }
    });
    const attach = () => {
      document.querySelectorAll("#quizModal, #docModal, #leaderboardModal, #resultModal, #aetherCitadelModal").forEach((m) => {
        if (!m.dataset.sceneObserved) {
          m.dataset.sceneObserved = "1";
          modalObserver.observe(m, { attributes: true, attributeFilter: ["class"] });
        }
      });
      document.querySelectorAll("#loginModal, #tcAuthModal").forEach((m) => {
        if (!m.dataset.sceneObserved) {
          m.dataset.sceneObserved = "1";
          modalObserver.observe(m, { attributes: true, attributeFilter: ["class", "hidden"] });
        }
      });
    };
    attachSceneModalObservers = attach;
    attach();
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", attach, { once: true });
    }
    setTimeout(attach, 0);
  };
  observeBlockingModals();

  // 確保視口尺寸、相機座標與第一幀完全渲染完畢後，再平滑淡入顯示 Canvas
  handleResize();
  controls.update();
  renderSceneFrame({ ecoMode: false });
  requestAnimationFrame(() => {
    stage.classList.add("is-ready");
    resumeSceneLoop();
  });
})();
