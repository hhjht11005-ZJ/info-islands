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
      skyBg: new THREE.Color(0x061024),           // 夜晚：深邃背景
      fogColor: new THREE.Color(0x08152e),
      waterColor: new THREE.Color(0x28567a),      // 夜晚深海藍綠乘色
      waterEmissive: new THREE.Color(0x04182b),
      deepSeaColor: new THREE.Color(0x041526),
      ambientColor: new THREE.Color(0x1e3566),
      ambientIntensity: 0.42,
      hemiSky: new THREE.Color(0x3a66b8),
      hemiGround: new THREE.Color(0x08182b),
      hemiIntensity: 0.38,
      dirColor: new THREE.Color(0x5282ff),        // 夜晚：深藍月光
      dirIntensity: 0.62,
      dirPos: new THREE.Vector3(-42, 74, -36),
      rippleOpacity: 0.12,
      foamOpacity: 0.3,
      dockLightIntensity: 2.35,                   // 海島碼頭橘黃點光源
      bulbOpacity: 1.0,
      fireflyOpacity: 0.95                        // 漂浮螢火蟲微粒
    }
  };

  let isNight = false;
  scene.background = THEME.day.skyBg.clone();
  scene.fog = new THREE.FogExp2(THEME.day.fogColor.getHex(), 0.0042);

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
  const goldTrimMat = new THREE.MeshStandardMaterial({ color: 0xffd166, emissive: 0xd97706, emissiveIntensity: 0.35, roughness: 0.28, metalness: 0.45, flatShading: true });
  const cyanGlowMat = new THREE.MeshStandardMaterial({ color: 0x90e0ef, emissive: 0x00b4d8, emissiveIntensity: 0.85, roughness: 0.2, flatShading: true });
  const goldenCoreGlowMat = new THREE.MeshStandardMaterial({ color: 0xfff3b0, emissive: 0xffb703, emissiveIntensity: 1.5, roughness: 0.15, flatShading: true });
  const torchFlameMat = new THREE.MeshStandardMaterial({ color: 0xff9f1c, emissive: 0xff7b00, emissiveIntensity: 1.2, roughness: 0.2, flatShading: true });
  const torchStoneMat = new THREE.MeshStandardMaterial({ color: 0x5a6578, roughness: 0.75, flatShading: true });
  const roofTileWarmMat = new THREE.MeshStandardMaterial({ color: 0xd96b43, roughness: 0.7, flatShading: true });
  const roofTileBlueMat = new THREE.MeshStandardMaterial({ color: 0x3a6073, roughness: 0.7, flatShading: true });
  const roofTileGreenMat = new THREE.MeshStandardMaterial({ color: 0x2d6a4f, roughness: 0.7, flatShading: true });
  const windowFrameMat = new THREE.MeshStandardMaterial({ color: 0x6e431f, roughness: 0.75, flatShading: true });
  const windowWarmGlowMat = new THREE.MeshStandardMaterial({ color: 0xffec99, emissive: 0xffaa00, emissiveIntensity: 0.85, roughness: 0.25, flatShading: true });
  const lanternWarmMat = new THREE.MeshStandardMaterial({ color: 0xfff3b0, emissive: 0xffbe0b, emissiveIntensity: 1.0, roughness: 0.2, flatShading: true });
  const bridgeLampCoreMat = new THREE.MeshStandardMaterial({ color: 0xffedd5, emissive: 0xffaa00, emissiveIntensity: 2.0, roughness: 0.3 });
  const bridgeLampCapMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1f, roughness: 0.5, metalness: 0.6, flatShading: true });
  const bridgeLampHaloMat = new THREE.MeshBasicMaterial({
    color: 0xffb347,
    transparent: true,
    opacity: 0.28,
    blending: THREE.AdditiveBlending,
    depthWrite: false
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
    glassDome: SM(0xbfe8ff, { transparent: true, opacity: 0.26, roughness: 0.08, side: THREE.DoubleSide, depthWrite: false }),
    metalDark: SM(0x2b3340, { metalness: 0.5, roughness: 0.45 }),
    metalLight: SM(0xc3ccd8, { metalness: 0.55, roughness: 0.35 }),
    white: SM(0xf4f7fb),
    gold: SG(0xffd166, 0xd97706, 0.55, { metalness: 0.6 }),
    goldBeam: SB(0xffe08a, { transparent: true, opacity: 0.42, depthWrite: false, blending: THREE.AdditiveBlending }),
    holo: SB(0x7fe9ff, { wireframe: true, transparent: true, opacity: 0.85 }),
    holoSolid: SB(0x7fe9ff, { transparent: true, opacity: 0.35, depthWrite: false, blending: THREE.AdditiveBlending }),
    cyanGlow: SG(0x7ff0ff, 0x00b4d8, 1.2),
    // 電腦探險島
    screen: SB(0x7ff0ff),
    pcb: SM(0x0b3d91, { roughness: 0.6 }),
    pcbTrace: SG(0x4fd0ff, 0x1e90ff, 1.4),
    ramGreen: SM(0x1f8a4c),
    chip: SM(0x15171c, { metalness: 0.4 }),
    coolBlue: SG(0x4fb3ff, 0x1d6fd0, 0.8),
    // 數位公民島
    shieldBlue: SG(0x2d7bd8, 0x0b3d91, 0.35),
    shieldWhite: SM(0xf2f7ff, { roughness: 0.35 }),
    fireRed: SG(0xff5a36, 0xff2a00, 1.1),
    // 創作協作島
    camBody: SM(0x2e323d, { roughness: 0.6 }),
    lensGlass: SG(0x3b6cff, 0x1237a8, 0.9, { metalness: 0.4 }),
    red: SG(0xff5964, 0x7a1220, 0.35),
    yellow: SG(0xffd166, 0x8a6200, 0.35),
    blue: SG(0x4fb3ff, 0x0b4a8f, 0.35),
    green: SG(0x5fd18b, 0x0f6b3a, 0.35),
    purple: SG(0xc58bff, 0x5a2fa8, 0.4),
    orange: SG(0xff8a3d, 0x9a3a00, 0.4),
    water: SM(0x5cc8ff, { transparent: true, opacity: 0.72, roughness: 0.15, depthWrite: false }),
    // 程式森林島
    woodScreen: SG(0x1b2a24, 0x0a3b26, 0.5),
    codeGreen: SB(0x7dffb0),
    leaf: SM(0x3f9d62),
    // 演算法山
    templeStone: SM(0xe9dfc9, { roughness: 0.7 }),
    // 資料海灣
    siloBody: SM(0x5aa9d6, { metalness: 0.3, roughness: 0.4 }),
    siloBand: SG(0x2ec4b6, 0x0c9a8c, 1.0),
    crystalTeal: SG(0x2ec4b6, 0x0c6a62, 0.8, { transparent: true, opacity: 0.88 }),
    neonPink: SG(0xff6fb5, 0xff2f93, 1.0),
    // AI 智慧島
    aiPink: SG(0xff6fb5, 0xff2f93, 0.9),
    aiPurple: SG(0x9b5cff, 0x5a1fd1, 1.0),
    aiGold: SG(0xffc83d, 0xd98a00, 1.0),
    aiFiber: SB(0xffa8dd, { transparent: true, opacity: 0.85 }),
    // 二進位文字貼圖（0 / 1）
    bin0: stageCanvasMat((x, w, h) => { x.fillStyle = "#0b3b2a"; x.fillRect(0, 0, w, h); x.fillStyle = "#7dffb0"; x.font = "bold 92px monospace"; x.textAlign = "center"; x.textBaseline = "middle"; x.fillText("0", w / 2, h / 2 + 4); }),
    bin1: stageCanvasMat((x, w, h) => { x.fillStyle = "#0b3b2a"; x.fillRect(0, 0, w, h); x.fillStyle = "#ffe08a"; x.font = "bold 92px monospace"; x.textAlign = "center"; x.textBaseline = "middle"; x.fillText("1", w / 2, h / 2 + 4); }),
    // 施工地基與告示牌
    foundFill: SB(0xffffff, { transparent: true, opacity: 0.1, depthWrite: false }),
    foundLine: new THREE.LineBasicMaterial({ color: 0xffe08a, transparent: true, opacity: 0.75 }),
    signPost: SM(0x784a25),
    signBoards: [
      ["🚧 建造中", "「易」測驗 100 分", "解鎖 1/3 主建築"],
      ["🚧 擴建中", "「中」測驗 100 分", "解鎖 2/3 左右雙翼"],
      ["🚧 即將竣工", "「難」測驗 100 分", "解鎖 3/3 榮耀冠冕"]
    ].map((lines) => stageCanvasMat((x, w, h) => {
      x.fillStyle = "#f3d9a4"; x.fillRect(0, 0, w, h);
      x.strokeStyle = "#8b5a2b"; x.lineWidth = 8; x.strokeRect(4, 4, w - 8, h - 8);
      x.fillStyle = "#5a3a14"; x.textAlign = "center"; x.textBaseline = "middle";
      x.font = "bold 40px sans-serif"; x.fillText(lines[0], w / 2, 52);
      x.font = "bold 30px sans-serif"; x.fillText(lines[1], w / 2, 112);
      x.font = "26px sans-serif"; x.fillText(lines[2], w / 2, 160);
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

  // 6 座環繞小浮島專屬材質庫
  const isletMat = {
    lighthouseRed: SM(0xe5484d),
    lighthouseWhite: SM(0xf8fafc),
    lighthouseLantern: SB(0xfff1a8),
    lighthouseRim: SM(0x3a4252),
    lighthouseBeam: SB(0xfff2a8, { transparent: true, opacity: 0.24, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }),
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
    campfireOuter: SG(0xff8a1d, 0xff5400, 1.15),
    campfireInner: SG(0xffe066, 0xffc300, 1.35),
    gazeboWhite: SM(0xf4f7fb),
    gazeboRoof: SM(0x3a6073),
    brassGold: SM(0xffb703, { metalness: 0.6, roughness: 0.28 }),
    starLens: SG(0x7ff0ff, 0x00b4d8, 1.0),
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
    fishLine: SB(0xffffff)
  };

  // 中央神殿升級 + 終極通關特效材質庫
  const sanctExtraMat = {
    starTileDark: SM(0x253252, { roughness: 0.42, metalness: 0.12 }),
    starTileGold: SG(0xffd166, 0xd97706, 0.4, { metalness: 0.5 }),
    chaliceGold: SG(0xffd166, 0xd97706, 0.5, { metalness: 0.62, roughness: 0.22 }),
    chaliceCore: SG(0xfff3b0, 0xffb703, 1.6, { roughness: 0.12 }),
    altarMarble: SM(0xf4f6fb, { roughness: 0.35 }),
    brazierBronze: SM(0x9a6b32, { metalness: 0.48, roughness: 0.38 }),
    runeMote: SG(0x7ff0ff, 0x00e5ff, 1.25),
    finaleGoldStar: SG(0xffe066, 0xffaa00, 1.15, { metalness: 0.55 }),
    finalePillarBeam: SB(0xffd166, { transparent: true, opacity: 0.36, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }),
    finaleRayMat: SB(0xffe680, { transparent: true, opacity: 0.52, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }),
    finaleCrownRainbow: [0x4fb3ff, 0xff8a65, 0xc58bff, 0x5fd18b, 0xffd166, 0x2ec4b6, 0xff6fb5].map(
      (hex) => SG(hex, hex, 1.1, { roughness: 0.22 })
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
    ctx.fillText(`${emoji} ${title}`, 256, 65);

    // 副標題（#0f172a 粗體加柔和立體陰影）
    ctx.fillStyle = isDim ? "#94a3b8" : isLocked ? "#334155" : "#0f172a";
    ctx.font = "800 23px 'Noto Sans TC', 'Microsoft JhengHei', sans-serif";
    ctx.shadowColor = "rgba(255, 255, 255, 0.85)";
    ctx.shadowBlur = 2;
    ctx.shadowOffsetY = 1;
    ctx.fillText(subtitle, 256, 115);
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
        [-1.35, 1.35].forEach((x) => { cy(s1, 0.38, 0.42, 2.3, M.shieldWhite, x, 1.45, -0.55, 10); co(s1, 0.5, 0.6, M.shieldBlue, x, 2.9, -0.55, 10); });
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
        bx(s1, 1.9, 0.18, 1.5, M.gold, 0, 2.5, -0.1);
        co(s1, 1.1, 0.5, M.gold, 0, 2.84, -0.1, 4).rotation.y = Math.PI / 4;
        // Stage 2 左：高低排序石柱陣 (高 2.2)
        bx(wingL, 2.0, 0.15, 0.7, stoneDarkMat, 0, 0.08, 0);
        [0.7, 1.0, 1.3, 1.6, 1.9, 2.2].forEach((h, i) => bx(wingL, 0.28, h, 0.28, [M.green, M.green, M.yellow, M.orange, M.red, M.purple][i], -0.8 + i * 0.32, 0.15 + h / 2, 0));
        // Stage 2 右：二分搜尋觀測台 (高 2.3)
        cy(wingR, 0.75, 0.85, 1.5, stoneGrayMat, 0, 0.75, 0, 14);
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

    // ---- 組裝三個階段群組（皆位於草皮頂面 y = STAGE_BASE_Y，初始隱藏）----
    const stage1Group = grp(null, 0, STAGE_BASE_Y, 0); stage1Group.name = "stage1Group"; stage1Group.add(s1);
    const stage2Group = grp(null, 0, STAGE_BASE_Y, 0); stage2Group.name = "stage2Group"; stage2Group.add(wingL, wingR);
    const stage3Group = grp(null, 0, STAGE_BASE_Y, 0); stage3Group.name = "stage3Group"; stage3Group.add(crown, yard);
    [stage1Group, stage2Group, stage3Group].forEach((g) => { g.visible = false; });

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
      stage1Group, stage2Group, stage3Group, foundation,
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
        fMain.visible = n < 1;
        fWings.forEach((f) => { f.visible = n < 2; });
        fYard.visible = n < 3;
        sign.visible = n < 3;
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
  const sharedDockWaterGlowGeo = new THREE.CircleGeometry(2.6, 16);
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
    trunk: new THREE.CylinderGeometry(0.1, 0.16, 0.7, 5),
    crownLo: new THREE.ConeGeometry(0.58, 0.95, 6),
    crownHi: new THREE.ConeGeometry(0.42, 0.85, 6)
  };
  const decorMat = {
    fence: new THREE.MeshLambertMaterial({ color: 0xb98150 }),
    pole: new THREE.MeshLambertMaterial({ color: 0x5b4636 }),
    lantern: new THREE.MeshBasicMaterial({ color: 0xffd98a }),
    trunk: new THREE.MeshLambertMaterial({ color: 0x8d5b3c }),
    crown: new THREE.MeshLambertMaterial({ color: 0xffffff })
  };
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
    treeSpots.forEach((ts, i) => {
      const x = Math.cos(ts.a) * ts.rr;
      const z = Math.sin(ts.a) * ts.rr;
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
    [posts, rails, poles, lanterns, trunks, crownsLo, crownsHi].forEach((m) => {
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
    islandRoot.add(stageSys.stage1Group);
    islandRoot.add(stageSys.stage2Group);
    islandRoot.add(stageSys.stage3Group);
    islandRoot.userData.stageSys = stageSys;
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
      depthWrite: false
    });
    dockLampGlowMaterials.push(dockGlowMat);
    const dockGlowMesh = new THREE.Mesh(sharedDockLampGlowGeo, dockGlowMat);
    dockGlowMesh.position.set(0.24, 2.48, 9.45);
    dockGroup.add(dockGlowMesh);

    // 碼頭水面暖橘色光暈倒影
    const waterGlowMat = new THREE.MeshBasicMaterial({
      color: 0xff9f38,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    dockWaterGlowMaterials.push(waterGlowMat);
    const waterGlowMesh = new THREE.Mesh(sharedDockWaterGlowGeo, waterGlowMat);
    waterGlowMesh.position.set(0.24, 0.18, 9.45);
    dockGroup.add(waterGlowMesh);

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

      // 向上微光光柱
      const beamGeo = new THREE.CylinderGeometry(0.08, 0.32, 2.8, 8, 1, true);
      const beamMat = new THREE.MeshBasicMaterial({
        color: 0xffa200,
        transparent: true,
        opacity: 0.25,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide
      });
      const beam = new THREE.Mesh(beamGeo, beamMat);
      beam.position.y = 2.65;
      torchGroup.add(beam);

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
      depthWrite: false
    });
    const haloRing = new THREE.Mesh(pillarHaloGeo, haloMat);
    haloRing.position.y = 0.08;
    pillarHolder.add(haloRing);

    sealPillarsGroup.add(pillarHolder);
    sealPillars.push({
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
      isLit: false,
      phase: idx * 0.85
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
  const sanctGoldMat = new THREE.MeshStandardMaterial({
    color: 0xffd166,
    emissive: 0xd97706,
    emissiveIntensity: 0.45,
    roughness: 0.24,
    metalness: 0.46,
    flatShading: true
  });
  const sanctCyanMat = new THREE.MeshStandardMaterial({
    color: 0x90e0ef,
    emissive: 0x00b4d8,
    emissiveIntensity: 0.85,
    roughness: 0.2,
    flatShading: true
  });

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
    depthWrite: false
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
    depthWrite: false
  });
  const innerBeam = new THREE.Mesh(
    new THREE.CylinderGeometry(0.28, 1.3, 54, 12, 1, true),
    innerBeamMat
  );
  innerBeam.position.y = 27;
  goldenBeamGroup.add(innerBeam);

  const beamHaloRings = [];
  for (let r = 0; r < 3; r++) {
    const hMat = new THREE.MeshBasicMaterial({
      color: 0xffe66d,
      transparent: true,
      opacity: 0.75,
      blending: THREE.AdditiveBlending,
      depthWrite: false
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

  /* ---------- 8c. NPC 小副島（無害裝飾，填補外海空隙） ---------- */
  const npcIsletGroup = new THREE.Group();
  npcIsletGroup.name = "npcIslets";
  scene.add(npcIsletGroup);

  const isletSandGeo = createRoundedCylinderGeometry(3.6, 4.2, 1.3, 0.35, 12);
  const isletTurfGeo = createRoundedCylinderGeometry(3.1, 3.45, 0.8, 0.35, 12);
  const isletShallowGeo = new THREE.RingGeometry(3.9, 6.3, 28);
  isletShallowGeo.rotateX(-Math.PI / 2);
  const isletFoamGeo = new THREE.RingGeometry(4.2, 4.8, 28);
  isletFoamGeo.rotateX(-Math.PI / 2);
  const isletSandMat = LM(0xf6dfa4);
  const isletTurfMat = LM(0x7fd88a);
  const isletTreeSpots = [];
  const isletFlowerSpots = [];
  const woodM = LM(0xa8714a);
  const woodDarkM = LM(0x6f4518);
  const darkEyeMat = new THREE.MeshBasicMaterial({ color: 0x1e293b });
  const sphereGeo8 = new THREE.SphereGeometry(1, 8, 6);
  const cubeGeo = new THREE.BoxGeometry(1, 1, 1);

  const sharedMiniNpcBodyGeo = new THREE.CylinderGeometry(0.2, 0.27, 0.5, 8);
  const sharedMiniNpcHatConeGeo = new THREE.ConeGeometry(0.26, 0.22, 8);
  const sharedMiniNpcHatBrimGeo = new THREE.CylinderGeometry(0.34, 0.34, 0.03, 10);

  function makeMiniNPC(shirtHex, hatHex, skinHex) {
    const root = new THREE.Group();
    mk(sharedMiniNpcBodyGeo, LM(shirtHex), 0, 0.32, 0, root, true);
    const head = new THREE.Group();
    head.position.y = 0.78;
    root.add(head);
    const skin = LM(skinHex || 0xffd7b0);
    const headMesh = mk(sphereGeo8, skin, 0, 0, 0, head, true);
    headMesh.scale.setScalar(0.24);
    [-0.09, 0.09].forEach((ex) => {
      const e = mk(sphereGeo8, darkEyeMat, ex, 0.02, 0.21, head);
      e.scale.setScalar(0.03);
    });
    if (hatHex) {
      mk(sharedMiniNpcHatConeGeo, LM(hatHex), 0, 0.26, 0, head, true);
      mk(sharedMiniNpcHatBrimGeo, LM(hatHex), 0, 0.17, 0, head);
    }
    const armL = mk(sphereGeo8, skin, -0.27, 0.45, 0, root);
    armL.scale.setScalar(0.08);
    const armR = mk(sphereGeo8, skin, 0.27, 0.45, 0, root);
    armR.scale.setScalar(0.08);
    [-0.1, 0.1].forEach((fx) => {
      const f = mk(sphereGeo8, npcExtraMat.bootDark, fx, 0.06, 0.03, root);
      f.scale.set(0.09, 0.06, 0.12);
    });
    return { root, head, armL, armR };
  }

  function addNpcIdle(npc, phase) {
    expansionAnims.push((t) => {
      npc.root.position.y = (npc.baseY || 0) + Math.abs(Math.sin(t * 2.2 + phase)) * 0.05;
      npc.head.rotation.y = Math.sin(t * 1.1 + phase) * 0.45;
      npc.armR.position.y = 0.45 + Math.max(0, Math.sin(t * 3 + phase)) * 0.18;
    });
  }

  function addBuddyIsletIdle(buddy, phase, baseY = 0) {
    expansionAnims.push((t) => {
      buddy.root.position.y = baseY + Math.abs(Math.sin(t * 2.6 + phase)) * 0.07;
      buddy.headPivot.rotation.y = Math.sin(t * 1.35 + phase) * 0.38;
      if (buddy.armR) buddy.armR.rotation.z = -0.35 - Math.abs(Math.sin(t * 3.2 + phase)) * 0.45;
      if (buddy.tailPivot) buddy.tailPivot.rotation.y = Math.sin(t * 4.0 + phase) * 0.35;
    });
  }

  function isletTree(local, spot) {
    isletTreeSpots.push({ x: local.x + spot[0], y: local.y + 1.55, z: local.z + spot[1], s: spot[2] || 1 });
  }

  function createNpcIslet(spec) {
    const a = (spec.angleDeg * Math.PI) / 180;
    const g = new THREE.Group();
    const pos = new THREE.Vector3(Math.cos(a) * spec.radius, 0, Math.sin(a) * spec.radius);
    g.position.copy(pos);
    g.scale.setScalar(spec.scale || 1);
    npcIsletGroup.add(g);

    mk(isletShallowGeo, shallowLagoonMat, 0, 0.08, 0, g);
    mk(isletFoamGeo, foamMat, 0, 0.13, 0, g);
    const sand = mk(isletSandGeo, isletSandMat, 0, 0.4, 0, g, true);
    sand.receiveShadow = true;
    const turf = mk(isletTurfGeo, isletTurfMat, 0, 1.15, 0, g, true);
    turf.receiveShadow = true;

    const content = new THREE.Group();
    content.position.y = GROUND_TOP_Y.ISLET_TURF;
    g.add(content);

    spec.build(content, g, pos);
    return g;
  }

  // 1) 紅白微風燈塔島 + 看海 NPC
  function buildLighthouseBreezeIsle(c, g, pos) {
    const stripes = [isletMat.lighthouseWhite, isletMat.lighthouseRed, isletMat.lighthouseWhite];
    [0.45, 1.3, 2.15].forEach((y, i) => {
      mk(new THREE.CylinderGeometry(0.58 - i * 0.07, 0.68 - i * 0.07, 0.85, 8), stripes[i], -0.75, y, -0.55, c, true);
    });
    mk(new THREE.CylinderGeometry(0.72, 0.72, 0.1, 8), isletMat.lighthouseRim, -0.75, 2.62, -0.55, c);
    mk(new THREE.CylinderGeometry(0.3, 0.3, 0.46, 8), isletMat.lighthouseLantern, -0.75, 2.9, -0.55, c);
    mk(new THREE.ConeGeometry(0.5, 0.46, 8), isletMat.lighthouseRed, -0.75, 3.4, -0.55, c, true);

    const beamGeo = new THREE.ConeGeometry(0.85, 5, 12, 1, true);
    beamGeo.translate(0, -2.5, 0);
    beamGeo.rotateZ(Math.PI / 2);
    const beamPivot = new THREE.Group();
    beamPivot.position.set(-0.75, 2.9, -0.55);
    c.add(beamPivot);
    mk(beamGeo, isletMat.lighthouseBeam, 0, 0, 0, beamPivot);
    const beam2 = mk(beamGeo, isletMat.lighthouseBeam, 0, 0, 0, beamPivot);
    beam2.rotation.y = Math.PI;
    expansionAnims.push((t) => {
      beamPivot.rotation.y = t * 1.15;
    });

    // 觀海矮護欄與長凳
    for (let i = 0; i < 4; i++) {
      mk(new THREE.BoxGeometry(0.08, 0.42, 0.08), woodM, 0.4 + i * 0.55, 0.21, 1.8, c);
    }
    mk(new THREE.BoxGeometry(1.75, 0.06, 0.06), woodM, 1.22, 0.35, 1.8, c);
    mk(cubeGeo, woodM, -1.65, 0.2, 0.9, c, true).scale.setScalar(0.38);

    // 看海 NPC（面向外海揮手望遠）
    const keeper = makeMiniNPC(0x2b59c3, 0x1e3a5f, 0xffd7b0);
    keeper.root.position.set(1.05, 0, 1.35);
    keeper.root.rotation.y = 0.25;
    keeper.baseY = 0;
    c.add(keeper.root);
    addNpcIdle(keeper, 0.3);

    [[-2.05, -0.9, 0.85], [1.75, -1.45, 0.82], [-1.45, 1.75, 0.72]].forEach((s) => isletTree(pos, s));
  }

  // 2) 荷蘭木風車花圃島 + 澆花小動物
  function buildWindmillFlowerIsle(c, g, pos) {
    mk(new THREE.CylinderGeometry(0.62, 0.98, 2.4, 8), isletMat.windmillWall, -0.65, 1.2, -0.55, c, true);
    mk(new THREE.ConeGeometry(0.86, 0.76, 8), isletMat.windmillRoof, -0.65, 2.78, -0.55, c, true);
    mk(new THREE.BoxGeometry(0.34, 0.55, 0.06), woodDarkM, -0.65, 0.28, 0.42, c);
    const blades = new THREE.Group();
    blades.position.set(-0.65, 2.22, 0.46);
    c.add(blades);
    mk(new THREE.CylinderGeometry(0.1, 0.1, 0.2, 8), woodDarkM, 0, 0, 0, blades).rotation.x = Math.PI / 2;
    for (let i = 0; i < 4; i++) {
      const arm = new THREE.Group();
      arm.rotation.z = (i * Math.PI) / 2;
      blades.add(arm);
      mk(new THREE.BoxGeometry(0.1, 1.5, 0.05), woodDarkM, 0, 0.8, 0, arm);
      mk(new THREE.BoxGeometry(0.4, 0.95, 0.03), isletMat.windmillSail, 0.22, 0.95, 0.03, arm);
    }
    expansionAnims.push((t) => {
      blades.rotation.z = -t * 1.1;
    });

    // 荷蘭鬱金香彩色花圃
    const tulipMats = [isletMat.tulipRed, isletMat.tulipYellow, isletMat.tulipPurple];
    mk(new THREE.BoxGeometry(1.7, 0.12, 1.15), woodM, 1.15, 0.06, 0.95, c, true);
    for (let row = 0; row < 2; row++) {
      for (let col = 0; col < 4; col++) {
        const fx = 0.55 + col * 0.38;
        const fz = 0.65 + row * 0.55;
        mk(new THREE.CylinderGeometry(0.02, 0.02, 0.22, 4), flowerBushGreenMat, fx, 0.2, fz, c);
        mk(new THREE.SphereGeometry(0.09, 6, 5), tulipMats[(row + col) % tulipMats.length], fx, 0.32, fz, c);
      }
    }
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2;
      isletFlowerSpots.push({ x: pos.x + Math.cos(a) * 2.1, y: pos.y + 1.55 + 0.1, z: pos.z + Math.sin(a) * 1.8, c: [0xff4d6d, 0xffd166, 0xc77dff][i % 3] });
    }

    // 澆花小動物（奶油小兔提著藍色澆花壺）
    const gardener = createCuteIslandBuddy("bunny", { furMat: npcExtraMat.bunnyWhite, scale: 1.08 });
    gardener.root.position.set(0.35, 0, 1.45);
    gardener.root.rotation.y = 0.85;
    const can = mk(new THREE.CylinderGeometry(0.09, 0.11, 0.16, 8), isletMat.wateringCan, 0.24, 0.22, 0.14, gardener.bodyPivot);
    mk(new THREE.CylinderGeometry(0.02, 0.04, 0.16, 6), isletMat.wateringCan, 0.32, 0.28, 0.18, gardener.bodyPivot).rotation.z = -0.85;
    void can;
    c.add(gardener.root);
    addBuddyIsletIdle(gardener, 1.4, 0);

    [[2.1, -0.8, 0.9], [-2.1, 1.0, 0.85], [1.65, -1.9, 0.78]].forEach((s) => isletTree(pos, s));
  }

  // 3) 夏日黃色露營帳篷與營火島 + 烤火 NPC
  function buildSummerCampIsle(c, g, pos) {
    const tent = mk(new THREE.ConeGeometry(1.12, 1.28, 4), isletMat.tentYellow, -1.05, 0.64, -0.45, c, true);
    tent.rotation.y = Math.PI / 4;
    tent.scale.z = 1.25;
    mk(new THREE.BoxGeometry(0.36, 0.52, 0.06), isletMat.tentDoor, -0.52, 0.28, 0.02, c).rotation.y = Math.PI / 4;

    const flame1 = mk(new THREE.ConeGeometry(0.22, 0.58, 6), isletMat.campfireOuter, 1.05, 0.31, -0.1, c);
    const flame2 = mk(new THREE.ConeGeometry(0.13, 0.4, 6), isletMat.campfireInner, 1.05, 0.26, -0.1, c);
    for (let i = 0; i < 6; i++) {
      const sa = (i / 6) * Math.PI * 2;
      const st = mk(sphereGeo8, isletMat.campfireStone, 1.05 + Math.cos(sa) * 0.38, 0.08, -0.1 + Math.sin(sa) * 0.38, c);
      st.scale.set(0.12, 0.08, 0.12);
    }
    [0.6, -0.6].forEach((r) => {
      const log = mk(new THREE.CylinderGeometry(0.06, 0.06, 0.6, 5), woodDarkM, 1.05, 0.07, -0.1, c);
      log.rotation.set(Math.PI / 2, r, 0);
    });
    expansionAnims.push((t) => {
      flame1.scale.set(1 + Math.sin(t * 11) * 0.1, 1 + Math.sin(t * 9 + 1) * 0.18, 1 + Math.sin(t * 11) * 0.1);
      flame2.scale.set(1 + Math.sin(t * 13) * 0.12, 1 + Math.sin(t * 10) * 0.22, 1);
    });

    // 原木椅與烤火 NPC
    mk(new THREE.CylinderGeometry(0.14, 0.14, 0.72, 6), woodM, 0.35, 0.14, 1.15, c).rotation.z = Math.PI / 2;
    const camper = makeMiniNPC(0xe76f51, 0xe9c46a, 0xffd7b0);
    camper.root.position.set(0.35, 0, 1.15);
    camper.root.rotation.y = 2.45;
    camper.baseY = 0;
    c.add(camper.root);
    addNpcIdle(camper, 0.6);

    const campKitty = createCuteIslandBuddy("cat", { furMat: npcExtraMat.catOrange, scale: 0.92 });
    campKitty.root.position.set(-0.55, 0, 1.45);
    campKitty.root.rotation.y = 0.8;
    c.add(campKitty.root);
    addBuddyIsletIdle(campKitty, 2.2, 0);

    [[-2.15, 0.8, 0.95], [2.15, -1.0, 0.85], [1.75, 1.7, 0.72]].forEach((s) => isletTree(pos, s));
  }

  // 4) 觀星小涼亭與望遠鏡島 + 觀星學者 NPC
  function buildStargazingIsle(c, g, pos) {
    // 觀星白石小涼亭
    mk(new THREE.CylinderGeometry(1.18, 1.25, 0.16, 6), isletMat.gazeboWhite, -0.78, 0.08, -0.45, c, true);
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
      mk(new THREE.CylinderGeometry(0.08, 0.09, 1.65, 6), isletMat.gazeboWhite, -0.78 + Math.cos(a) * 0.86, 0.9, -0.45 + Math.sin(a) * 0.86, c, true);
    }
    mk(new THREE.ConeGeometry(1.38, 0.85, 6), isletMat.gazeboRoof, -0.78, 2.12, -0.45, c, true);
    mk(new THREE.OctahedronGeometry(0.18, 0), isletMat.brassGold, -0.78, 2.62, -0.45, c);

    // 黃銅天文望遠鏡
    const scopeGroup = new THREE.Group();
    scopeGroup.position.set(1.05, 0, 0.55);
    c.add(scopeGroup);
    for (let i = 0; i < 3; i++) {
      const ta = (i / 3) * Math.PI * 2;
      const leg = mk(new THREE.CylinderGeometry(0.025, 0.02, 0.88, 5), woodDarkM, Math.cos(ta) * 0.16, 0.4, Math.sin(ta) * 0.16, scopeGroup);
      leg.rotation.set(Math.sin(ta) * 0.25, 0, -Math.cos(ta) * 0.25);
    }
    const barrelPivot = new THREE.Group();
    barrelPivot.position.set(0, 0.82, 0);
    barrelPivot.rotation.set(-0.58, -0.4, 0);
    scopeGroup.add(barrelPivot);
    mk(new THREE.CylinderGeometry(0.11, 0.07, 1.05, 10), isletMat.brassGold, 0, 0, 0, barrelPivot, true).rotation.x = Math.PI / 2;
    mk(new THREE.CylinderGeometry(0.125, 0.125, 0.14, 10), isletMat.starLens, 0, 0, 0.52, barrelPivot).rotation.x = Math.PI / 2;
    expansionAnims.push((t) => {
      barrelPivot.rotation.y = -0.4 + Math.sin(t * 0.7) * 0.22;
    });

    // 觀星學者 NPC
    const scholar = makeMiniNPC(0x3a6073, 0x1e3a5f, 0xffd7b0);
    scholar.root.position.set(0.35, 0, 0.92);
    scholar.root.rotation.y = 2.1;
    scholar.baseY = 0;
    c.add(scholar.root);
    addNpcIdle(scholar, 1.9);

    [[-2.1, 1.1, 0.85], [2.1, -1.1, 0.88], [1.4, 1.85, 0.72]].forEach((s) => isletTree(pos, s));
  }

  // 5) 椰林沙灘遮陽傘度假島 + 休息小動物
  function buildPalmResortIsle(c, g, pos) {
    // 兩棵弧形椰子樹
    [[-1.15, -0.75, 1.0, 0.2], [-1.75, 0.45, 0.82, -0.18]].forEach(([px, pz, sc, lean]) => {
      const palm = new THREE.Group();
      palm.position.set(px, 0, pz);
      palm.scale.setScalar(sc);
      c.add(palm);
      for (let seg = 0; seg < 4; seg++) {
        mk(new THREE.CylinderGeometry(0.14 - seg * 0.015, 0.17 - seg * 0.015, 0.55, 6), isletMat.palmTrunk, seg * lean * 0.4, 0.26 + seg * 0.48, 0, palm, true).rotation.z = -lean * 0.7;
      }
      const topX = 3 * lean * 0.4;
      const topY = 2.05;
      for (let f = 0; f < 6; f++) {
        const fa = (f / 6) * Math.PI * 2;
        const frond = mk(new THREE.BoxGeometry(0.26, 0.05, 1.05), isletMat.palmLeaf, topX + Math.sin(fa) * 0.5, topY + 0.06, Math.cos(fa) * 0.5, palm, true);
        frond.rotation.y = fa;
        frond.rotation.x = 0.28;
      }
      [-0.14, 0.14].forEach((cx) => mk(sphereGeo8, isletMat.coconut, topX + cx, topY - 0.12, 0.12, palm).scale.setScalar(0.11));
    });

    // 紅白沙灘遮陽傘 + 海灘墊
    mk(new THREE.CylinderGeometry(0.045, 0.045, 1.75, 6), woodM, 0.85, 0.88, -0.35, c);
    for (let u = 0; u < 6; u++) {
      const slice = mk(new THREE.ConeGeometry(1.15, 0.42, 6, 1, false, (u / 6) * Math.PI * 2, Math.PI / 3), u % 2 === 0 ? isletMat.umbrellaRed : isletMat.umbrellaWhite, 0.85, 1.72, -0.35, c, true);
      void slice;
    }
    mk(new THREE.BoxGeometry(1.15, 0.05, 1.55), isletMat.towelBlue, 0.85, 0.025, 0.75, c);
    mk(new THREE.BoxGeometry(1.16, 0.055, 0.24), isletMat.towelStripe, 0.85, 0.028, 0.22, c);

    // 休息小動物（奶茶小熊 + 小灰貓）
    const bear = createCuteIslandBuddy("bear", { furMat: npcExtraMat.bearTan, scale: 1.02 });
    bear.root.position.set(0.85, 0.05, 0.75);
    bear.root.rotation.y = -0.35;
    c.add(bear.root);
    addBuddyIsletIdle(bear, 0.7, 0.05);

    const beachCat = createCuteIslandBuddy("cat", { furMat: npcExtraMat.catGray, scale: 0.92 });
    beachCat.root.position.set(-0.3, 0, 1.25);
    beachCat.root.rotation.y = 0.7;
    c.add(beachCat.root);
    addBuddyIsletIdle(beachCat, 2.5, 0);
  }

  // 6) 漂流藏寶箱與木棧釣魚島 + 垂釣 NPC
  function buildTreasureFishingIsle(c, g, pos) {
    // 敞開裝滿金幣與藍綠寶石的藏寶箱
    mk(new THREE.BoxGeometry(0.95, 0.52, 0.68), isletMat.chestWood, -0.95, 0.26, -0.4, c, true);
    const lid = mk(new THREE.BoxGeometry(0.95, 0.24, 0.68), isletMat.chestWood, -0.95, 0.66, -0.68, c, true);
    lid.rotation.x = -0.75;
    mk(new THREE.BoxGeometry(0.82, 0.16, 0.54), isletMat.chestGold, -0.95, 0.52, -0.4, c);
    mk(new THREE.OctahedronGeometry(0.18, 0), isletMat.chestGem, -0.95, 0.68, -0.4, c);
    mk(cubeGeo, woodM, 0.25, 0.22, -0.85, c, true).scale.setScalar(0.42);
    mk(new THREE.CylinderGeometry(0.2, 0.17, 0.32, 8), isletMat.bucketBlue, 0.95, 0.16, 1.1, c);

    // 延伸出島緣的木造釣魚棧橋 (top = -0.65 + 0.07 = -0.58)
    mk(new THREE.BoxGeometry(3.2, 0.14, 0.95), woodM, 3.65, -0.65, 0.6, c, true);
    [
      [2.5, 0.22],
      [2.5, 0.98],
      [4.9, 0.22],
      [4.9, 0.98]
    ].forEach(([x, z]) => mk(new THREE.CylinderGeometry(0.07, 0.07, 1.4, 5), woodDarkM, x, -1.05, z, c));

    // 垂釣 NPC（精準立於木棧板頂面 y = -0.58）
    const angler = makeMiniNPC(0x2ec4b6, 0xe9c46a, 0xf3c9a0);
    angler.root.position.set(4.85, -0.58, 0.6);
    angler.root.rotation.y = Math.PI / 2;
    angler.baseY = -0.58;
    c.add(angler.root);
    addNpcIdle(angler, 1.1);

    const rodPivot = new THREE.Group();
    rodPivot.position.set(4.95, -0.08, 0.72);
    rodPivot.rotation.y = Math.PI / 2;
    c.add(rodPivot);
    mk(new THREE.CylinderGeometry(0.015, 0.025, 1.55, 4), woodDarkM, 0, 0.3, 0.6, rodPivot).rotation.x = 1.15;
    mk(new THREE.CylinderGeometry(0.006, 0.006, 1.15, 3), isletMat.fishLine, 0, -0.3, 1.25, rodPivot);
    const bobber = mk(sphereGeo8, isletMat.bobberRed, 0, -0.92, 1.25, rodPivot);
    bobber.scale.setScalar(0.07);
    expansionAnims.push((t) => {
      rodPivot.rotation.x = Math.sin(t * 1.6) * 0.05;
      bobber.position.y = -0.92 + Math.sin(t * 3.4) * 0.04;
    });

    [[-2.0, 1.1, 0.85], [1.45, -1.55, 0.82], [-1.35, 1.85, 0.7]].forEach((s) => isletTree(pos, s));
  }

  // 6 座環繞小浮島：均勻分佈於七島外環空檔 (1.22 ~ 1.32 × ringRadius=49)，避開所有吊橋與主題島嶼
  [
    { angleDeg: -64, radius: 61.5, scale: 1.0, build: buildLighthouseBreezeIsle },
    { angleDeg: -10, radius: 64.0, scale: 1.0, build: buildWindmillFlowerIsle },
    { angleDeg: 42, radius: 61.0, scale: 1.0, build: buildSummerCampIsle },
    { angleDeg: 92, radius: 63.5, scale: 1.0, build: buildStargazingIsle },
    { angleDeg: 142, radius: 61.5, scale: 1.0, build: buildPalmResortIsle },
    { angleDeg: 242, radius: 64.0, scale: 1.0, build: buildTreasureFishingIsle }
  ].forEach(createNpcIslet);

  // 小副島樹木 / 花朵：單一 InstancedMesh（世界座標，小副島靜止不浮動）
  (function buildIsletInstanced() {
    const n = isletTreeSpots.length;
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
    const fn = isletFlowerSpots.length;
    const flowers = makeDecorInstanced(new THREE.IcosahedronGeometry(0.1, 0), new THREE.MeshLambertMaterial({ color: 0xffffff }), fn, npcIsletGroup);
    const stems = makeDecorInstanced(new THREE.CylinderGeometry(0.015, 0.015, 0.2, 3), LM(0x3a9d56), fn, npcIsletGroup);
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
    [trunks, lo, hi, flowers, stems].forEach((m) => {
      m.instanceMatrix.needsUpdate = true;
      if (m.instanceColor) m.instanceColor.needsUpdate = true;
    });
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

    // 船底水花尾跡圈
    const wakeGeo = new THREE.RingGeometry(0.68, 1.18, 16);
    wakeGeo.rotateX(-Math.PI / 2);
    const wakeMat = foamMat.clone();
    const wakeRing = new THREE.Mesh(wakeGeo, wakeMat);
    wakeRing.scale.set(0.82, 1, 1.95);
    wakeRing.position.set(0, 0.12, -0.15);
    root.add(wakeRing);

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

    // 頂端呼吸警示燈罩與點光源
    const beaconMat = new THREE.MeshBasicMaterial({
      color: 0xff5a5f,
      transparent: true,
      opacity: 0.95
    });
    const beaconBulb = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 10), beaconMat);
    beaconBulb.position.y = 1.38;
    tiltPivot.add(beaconBulb);

    const haloMat = new THREE.MeshBasicMaterial({
      color: 0xff6b6b,
      transparent: true,
      opacity: 0.45,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    const haloSphere = new THREE.Mesh(new THREE.SphereGeometry(0.36, 10, 10), haloMat);
    haloSphere.position.y = 1.38;
    tiltPivot.add(haloSphere);

    // 底部小水花圈
    const ringGeo = new THREE.RingGeometry(0.52, 0.85, 16);
    ringGeo.rotateX(-Math.PI / 2);
    const ringMat = foamMat.clone();
    const ringMesh = new THREE.Mesh(ringGeo, ringMat);
    ringMesh.position.y = 0.1;
    root.add(ringMesh);

    return { root, tiltPivot, beaconBulb, haloSphere, haloMat, ringMesh, ringMat };
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

    // 木筏底部水波圈
    const wakeGeo = new THREE.RingGeometry(0.75, 1.32, 18);
    wakeGeo.rotateX(-Math.PI / 2);
    const wakeMat = foamMat.clone();
    const wakeRing = new THREE.Mesh(wakeGeo, wakeMat);
    wakeRing.scale.set(0.95, 1, 1.35);
    wakeRing.position.set(0, 0.08, 0);
    root.add(wakeRing);

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
  }

  drawStudentBadgeCanvas();
  document.addEventListener("ii:login", drawStudentBadgeCanvas);
  document.addEventListener("ii:logout", drawStudentBadgeCanvas);
  window.addEventListener("storage", drawStudentBadgeCanvas);

  function createClayStudentCharacter() {
    const root = new THREE.Group();
    const bodyPivot = new THREE.Group();
    root.add(bodyPivot);

    // 黏土質感材質 (Soft Matte Clay Materials)
    const skinMat = new THREE.MeshStandardMaterial({ color: 0xffe2c8, roughness: 0.55, metalness: 0.02 });
    const coatMat = new THREE.MeshStandardMaterial({ color: 0xff6b6b, roughness: 0.52, metalness: 0.04 });
    const scarfMat = new THREE.MeshStandardMaterial({ color: 0xffd166, roughness: 0.5, metalness: 0.05 });
    const hatMat = new THREE.MeshStandardMaterial({ color: 0x4fb3ff, roughness: 0.48, metalness: 0.05 });
    const bootMat = new THREE.MeshStandardMaterial({ color: 0x2b3a55, roughness: 0.65, metalness: 0.05 });
    const packMat = new THREE.MeshStandardMaterial({ color: 0x2ec4b6, roughness: 0.55, metalness: 0.05 });
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0x1b263b });
    const blushMat = new THREE.MeshBasicMaterial({ color: 0xff8fa3, transparent: true, opacity: 0.82 });
    const sproutMat = new THREE.MeshStandardMaterial({
      color: 0xa8ff78,
      emissive: 0x5fd18b,
      emissiveIntensity: 0.45,
      roughness: 0.4
    });

    // 腳底柔和陰影圈
    const shadowGeo = new THREE.CircleGeometry(0.55, 18);
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

    // 左右小短腿/小靴子 (腳底對齊 origin y=0)
    const leftLeg = new THREE.Group();
    leftLeg.position.set(-0.18, 0.22, 0);
    const leftBoot = new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 10), bootMat);
    leftBoot.scale.set(0.95, 0.85, 1.3);
    leftBoot.position.set(0, -0.08, 0.05);
    leftBoot.castShadow = true;
    leftLeg.add(leftBoot);
    bodyPivot.add(leftLeg);

    const rightLeg = new THREE.Group();
    rightLeg.position.set(0.18, 0.22, 0);
    const rightBoot = new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 10), bootMat);
    rightBoot.scale.set(0.95, 0.85, 1.3);
    rightBoot.position.set(0, -0.08, 0.05);
    rightBoot.castShadow = true;
    rightLeg.add(rightBoot);
    bodyPivot.add(rightLeg);

    // 圓潤水滴狀黏土斗篷身體
    const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.46, 0.72, 16), coatMat);
    torso.position.y = 0.56;
    torso.castShadow = true;
    torso.receiveShadow = true;
    bodyPivot.add(torso);

    const hem = new THREE.Mesh(new THREE.SphereGeometry(0.45, 16, 12), coatMat);
    hem.scale.set(1, 0.45, 1);
    hem.position.y = 0.26;
    bodyPivot.add(hem);

    // 暖黃色圓領圍巾
    const scarf = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.085, 10, 20), scarfMat);
    scarf.rotation.x = Math.PI / 2;
    scarf.position.y = 0.9;
    scarf.castShadow = true;
    bodyPivot.add(scarf);

    // 背後小書包
    const backpack = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.44, 0.26), packMat);
    backpack.position.set(0, 0.58, -0.34);
    backpack.castShadow = true;
    bodyPivot.add(backpack);

    // 左右可愛黏土小手（可隨跑步擺動）
    const leftArm = new THREE.Group();
    leftArm.position.set(-0.38, 0.78, 0);
    const leftHand = new THREE.Mesh(new THREE.SphereGeometry(0.13, 12, 10), coatMat);
    leftHand.scale.set(0.85, 1.65, 0.85);
    leftHand.position.set(-0.04, -0.15, 0);
    leftHand.castShadow = true;
    leftArm.add(leftHand);
    bodyPivot.add(leftArm);

    const rightArm = new THREE.Group();
    rightArm.position.set(0.38, 0.78, 0);
    const rightHand = new THREE.Mesh(new THREE.SphereGeometry(0.13, 12, 10), coatMat);
    rightHand.scale.set(0.85, 1.65, 0.85);
    rightHand.position.set(0.04, -0.15, 0);
    rightHand.castShadow = true;
    rightArm.add(rightHand);
    bodyPivot.add(rightArm);

    // Q 版大頭與五官
    const headGroup = new THREE.Group();
    headGroup.position.y = 1.32;
    bodyPivot.add(headGroup);

    const headMesh = new THREE.Mesh(new THREE.SphereGeometry(0.46, 20, 18), skinMat);
    headMesh.scale.set(1.06, 0.98, 1.02);
    headMesh.castShadow = true;
    headGroup.add(headMesh);

    // 圓眼睛與白色高光
    const eyeGeo = new THREE.SphereGeometry(0.062, 10, 10);
    const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
    leftEye.position.set(-0.16, 0.03, 0.43);
    headGroup.add(leftEye);

    const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
    rightEye.position.set(0.16, 0.03, 0.43);
    headGroup.add(rightEye);

    // 粉紅腮紅
    const blushGeo = new THREE.SphereGeometry(0.075, 10, 10);
    const leftBlush = new THREE.Mesh(blushGeo, blushMat);
    leftBlush.scale.set(1.25, 0.7, 0.35);
    leftBlush.position.set(-0.27, -0.06, 0.4);
    headGroup.add(leftBlush);

    const rightBlush = new THREE.Mesh(blushGeo, blushMat);
    rightBlush.scale.set(1.25, 0.7, 0.35);
    rightBlush.position.set(0.27, -0.06, 0.4);
    headGroup.add(rightBlush);

    // 探險家圓帽與頭頂發光小嫩芽
    const capDome = new THREE.Mesh(new THREE.SphereGeometry(0.45, 16, 12), hatMat);
    capDome.scale.set(1.08, 0.52, 1.08);
    capDome.position.set(0, 0.28, -0.02);
    capDome.castShadow = true;
    headGroup.add(capDome);

    const capBrim = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.07, 14), scarfMat);
    capBrim.scale.set(1.1, 1, 0.7);
    capBrim.position.set(0, 0.24, 0.32);
    capBrim.rotation.x = 0.22;
    headGroup.add(capBrim);

    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.04, 0.24, 6), sproutMat);
    stem.position.set(0, 0.6, 0);
    headGroup.add(stem);

    const leafBulb = new THREE.Mesh(new THREE.OctahedronGeometry(0.13, 1), sproutMat);
    leafBulb.position.set(0, 0.75, 0);
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

    return {
      root,
      bodyPivot,
      leftArm,
      rightArm,
      leftLeg,
      rightLeg,
      headGroup,
      leafBulb,
      badgeSprite
    };
  }

  const studentChar = createClayStudentCharacter();
  scene.add(studentChar.root);

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
  let hoveredSanctuary = false;
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

  function showSanctuarySealPrompt() {
    const pillsHtml = sealPillars
      .map(
        (p) =>
          `<span class="seal-pill${p.isLit ? " lit" : ""}" style="--c:${p.colorHex}">${p.emoji} ${p.name} ${
            p.isLit ? "✔ 100%" : "🔒"
          }</span>`
      )
      .join("");
    sealToastEl.innerHTML = `<div class="seal-msg">🔒 ${SEAL_MESSAGE}</div><div class="seal-pillars-bar">${pillsHtml}</div>`;
    sealToastEl.classList.add("show");
    if (sealToastTimer) clearTimeout(sealToastTimer);
    sealToastTimer = setTimeout(() => {
      sealToastEl.classList.remove("show");
    }, 4500);
  }

  // 建立「國中資訊科技全域領航證書」Modal
  const certModalWrap = document.createElement("div");
  certModalWrap.id = "certModal";
  certModalWrap.className = "modal-wrap";
  certModalWrap.innerHTML = `
    <div class="modal cert-modal" role="dialog" aria-modal="true" aria-labelledby="certTitle">
      <button class="close" id="certCloseBtn" aria-label="關閉">✕</button>
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

    certModalWrap.querySelector("#certSchoolBadge").textContent = `🏛️ ${school} · 終極榮譽證書`;
    certModalWrap.querySelector("#certStudentWho").textContent = studentText;
    certModalWrap.querySelector("#certSerialNo").textContent = `證書編號：${serialCode}`;
    certModalWrap.querySelector("#certIssueDate").textContent = `核發日期：${dateStr}`;
    certModalWrap.dataset.fileSuffix = fileSuffix;

    const listEl = certModalWrap.querySelector("#certIslandsList");
    listEl.innerHTML = ISLANDS_DATA.slice(0, 7)
      .map(
        (isl) => `
        <div class="cert-island-item" style="--c:${isl.color}">
          <span>${isl.emoji} <b>${isl.name}</b> <small style="color:#a9c3dc">(${isl.tag})</small></span>
          <span class="ci-tag">Lv.3 · 100% 滿分</span>
        </div>`
      )
      .join("");

    certModalWrap.classList.add("show");
    bindConfettiBtn();

    // 繪製 7 向度滿分雷達圖
    const canvas = certModalWrap.querySelector("#certRadarCanvas");
    const labels = ISLANDS_DATA.slice(0, 7).map((i) => i.name);
    const colors = ISLANDS_DATA.slice(0, 7).map((i) => i.color);
    const scores = ISLANDS_DATA.slice(0, 7).map((i) => {
      const rec = islandRecords.find((r) => r.id === i.id);
      return rec && rec.progressPct > 0 ? rec.progressPct : 100;
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

    // 2. 偵測島嶼與中央聖殿島
    const hits = raycaster.intersectObjects(
      [...islandsGroup.children, mysteryReefGroup],
      true
    );
    for (let i = 0; i < hits.length; i++) {
      const obj = hits[i].object;
      if (isSanctuaryHit(obj)) {
        return { type: "sanctuary" };
      }
      const rec = findIslandRecordFromHit(obj);
      if (rec) {
        if (rec.dimmed) continue; // 不符合年級篩選的島嶼暫停互動
        return { type: "island", rec };
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

  // 綁定右上角全景重置按鈕
  const cameraResetBtnEl = document.getElementById("cameraResetBtn");
  if (cameraResetBtnEl) {
    cameraResetBtnEl.addEventListener("click", (e) => {
      e.stopPropagation();
      resetCameraToPanorama();
    });
  }

  let hoveredGuardianNpc = null;

  renderer.domElement.addEventListener("pointerdown", (e) => {
    if (e.button !== 0 && e.pointerType === "mouse") return;
    pointerDownPos = { x: e.clientX, y: e.clientY };
    pointerDownTime = performance.now();
    // 使用者手動拖曳視角時中止相機自動過渡
    cameraFocusState.active = false;
    cameraIntroState.active = false;
  });

  renderer.domElement.addEventListener("pointermove", (e) => {
    const picked = pickSceneTargetAtEvent(e);
    hoveredGuardianNpc = picked && picked.type === "npc" ? picked.npc : null;
    hoveredIslandRec = picked && picked.type === "island" ? picked.rec : null;
    hoveredSanctuary = Boolean(picked && picked.type === "sanctuary");
    stage.style.cursor = picked ? "pointer" : "grab";
  });

  renderer.domElement.addEventListener("pointerup", (e) => {
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
      focusOnIsland(picked.rec);
      startRunToIsland(picked.rec);
    }
  });

  /* ============================================================
   * 日夜模式切換邏輯
   * ============================================================ */
  const dnStateLabel = toggleBtn.querySelector("#dnStateLabel");

  function applyDayNightTheme(nightMode) {
    isNight = nightMode;
    const target = isNight ? THEME.night : THEME.day;

    toggleBtn.classList.toggle("is-night", isNight);
    if (resetCamBtn) resetCamBtn.classList.toggle("is-night", isNight);
    toggleBtn.setAttribute("aria-pressed", String(isNight));
    if (dnStateLabel) {
      dnStateLabel.textContent = isNight ? "目前：🌙 夜晚" : "目前：☀️ 白天";
    }
    mapWrap.style.background = isNight
      ? "#061024"
      : "linear-gradient(180deg, #0284c7 0%, #0369a1 100%)";

    scene.background.copy(target.skyBg);
    scene.fog.color.copy(target.fogColor);

    oceanMat.color.copy(target.waterColor);
    oceanMat.emissive.copy(target.waterEmissive);
    deepSeaMat.color.copy(target.deepSeaColor);
    shallowLagoonMat.opacity = isNight ? 0.25 : 0.55;

    ambientLight.color.copy(target.ambientColor);
    ambientLight.intensity = target.ambientIntensity;

    hemiLight.color.copy(target.hemiSky);
    hemiLight.groundColor.copy(target.hemiGround);
    hemiLight.intensity = target.hemiIntensity;

    mainDirLight.color.copy(target.dirColor);
    mainDirLight.intensity = target.dirIntensity;
    mainDirLight.position.copy(target.dirPos);

    rippleMat.opacity = target.rippleOpacity;
    foamMat.opacity = target.foamOpacity;
    mistMat.color.setHex(isNight ? 0x6c7fa6 : 0xdce8f7);
    mistMat.opacity = (isNight ? 0.42 : 0.56) * (1 - (sanctuaryState.mistDispersion || 0));

    // 切換海島碼頭與吊橋風燈發光光暈
    dockLampGlowMaterials.forEach((gMat) => {
      gMat.opacity = isNight ? 0.42 : 0.08;
    });
    bridgeLampHaloMat.opacity = isNight ? 0.45 : 0.14;
    bridgeLampCoreMat.emissiveIntensity = isNight ? 2.4 : 1.4;
    dockBulbMaterials.forEach((bMat) => {
      bMat.opacity = target.bulbOpacity;
    });
    dockWaterGlowMaterials.forEach((gMat) => {
      gMat.opacity = isNight ? 0.55 : 0;
    });

    // 切換夜晚漂浮星光微粒與白雲色調
    fireflyPoints.visible = isNight;
    fireflyMat.opacity = target.fireflyOpacity;
    cloudMat.color.setHex(isNight ? 0x8ca8d6 : 0xffffff);
    cloudMat.emissive.setHex(isNight ? 0x1e3566 : 0xd8eeff);
    cloudMat.opacity = isNight ? 0.68 : 0.94;

    // 調整航線虛線與跳石於日夜模式的柔和光感
    routeDashMaterials.forEach((dMat) => {
      dMat.opacity = isNight ? 0.38 : 0.52;
      dMat.color.setHex(isNight ? 0xb8e2ff : 0xffffff);
    });
    stoneMat.emissive.setHex(isNight ? 0x3b82c4 : 0xd8f3ff);
    stoneMat.emissiveIntensity = isNight ? 0.45 : 0.25;
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
   * 8. 島嶼建築繁榮度進度計算與升級彈跳動畫 (Scale Bounce)
   * ------------------------------------------------------------
   * - 完成度 0%      -> Lv.0 (level1/2/3 皆隱藏)
   * - 完成度 1~49%   -> Lv.1 (顯示 level1Props)
   * - 完成度 50~99%  -> Lv.2 (顯示 level1Props, level2Props)
   * - 完成度 100%    -> Lv.3 (顯示 level1Props, level2Props, level3Props)
   * ============================================================ */
  const activeBounceAnims = [];
  const pendingUpgradeReplays = [];

  // 升級慶祝光環（落成時在島面擴散消退）
  const burstRingGeo = new THREE.RingGeometry(0.6, 1.05, 24);
  burstRingGeo.rotateX(-Math.PI / 2);

  function computeCompletionLevel(pct) {
    if (pct >= 100) return 3;
    if (pct >= 50) return 2;
    if (pct >= 1) return 1;
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

  function calculateIslandProgressMap(customInput) {
    const progressMap = {};

    // 支援直接傳入 { sys: 80, citizen: 100 } 形式供快速測試
    if (
      customInput &&
      typeof customInput === "object" &&
      !Array.isArray(customInput) &&
      !(customInput instanceof Event) &&
      !("animateUpgrade" in customInput)
    ) {
      islandRecords.forEach((rec) => {
        const raw = Number(customInput[rec.id]);
        progressMap[rec.id] = Number.isFinite(raw)
          ? Math.max(0, Math.min(100, Math.round(raw)))
          : 0;
      });
      return progressMap;
    }

    const rawEvents = Array.isArray(customInput)
      ? customInput
      : window.Store && typeof window.Store.events === "function"
      ? window.Store.events()
      : [];

    const quizEvents = (Array.isArray(rawEvents) ? rawEvents : []).filter(
      (e) => e && (!e.type || e.type === "quiz")
    );

    islandRecords.forEach((rec) => {
      const islQuiz = quizEvents.filter((e) => {
        if (e.island === rec.id) return true;
        if (e.unit && String(e.unit).split("-")[0] === rec.id) return true;
        return false;
      });

      if (!islQuiz.length) {
        progressMap[rec.id] = 0;
        return;
      }

      // 1. 學生於該島測驗的最高得分 (0 ~ 100)
      const bestScore = islQuiz.reduce(
        (maxSc, e) => Math.max(maxSc, Number(e.score) || 0),
        0
      );

      // 2. 統計該島各單元完成比例（若該島所有可測驗單元皆已通過，亦視為 100%）
      const unitBest = {};
      islQuiz.forEach((e) => {
        if (e.unit) {
          unitBest[e.unit] = Math.max(unitBest[e.unit] ?? -1, Number(e.score) || 0);
        }
      });

      let totalQuizUnits = 0;
      let passedUnits = 0;
      const seqLen = rec.sequenceLen || 5;
      for (let uIdx = 1; uIdx <= seqLen; uIdx++) {
        const uKey = `${rec.id}-${uIdx}`;
        const qCfg = window.CONTENT && window.CONTENT[uKey] && window.CONTENT[uKey].quiz;
        if (qCfg) {
          totalQuizUnits++;
          const passScore = Number(qCfg.passScore) || 60;
          if ((unitBest[uKey] ?? -1) >= passScore) {
            passedUnits++;
          }
        }
      }

      const unitCompletionPct =
        totalQuizUnits > 0 ? Math.round((passedUnits / totalQuizUnits) * 100) : 0;

      const finalPct = Math.max(0, Math.min(100, Math.round(Math.max(bestScore, unitCompletionPct))));
      progressMap[rec.id] = finalPct;
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
   * 讀取學生的作答紀錄，計算各島完成度（0%, 1~49%, 50~99%, 100%），
   * 動態切換各群組（level1Props, level2Props, level3Props）的 visible 屬性；
   * 若分數使島嶼升級，觸發平滑彈跳縮放動畫（Scale Bounce）展示建築落成；
   * 同步更新中央聖殿島 7 根封印石柱光芒，若 7 島全數 100% 則觸發終極解鎖演出。
   */
  let grandFinalePreview = false;

  function updateIslandsProgress(optionsOrRecords) {
    const isOptionsObj =
      optionsOrRecords &&
      typeof optionsOrRecords === "object" &&
      !Array.isArray(optionsOrRecords) &&
      !(optionsOrRecords instanceof Event) &&
      ("animateUpgrade" in optionsOrRecords || "records" in optionsOrRecords);

    const animateUpgrade = isOptionsObj ? Boolean(optionsOrRecords.animateUpgrade) : true;
    const customRecords = isOptionsObj ? optionsOrRecords.records : optionsOrRecords;
    const previewFullMap = grandFinalePreview
      ? Object.fromEntries(islandRecords.map((r) => [r.id, 100]))
      : null;
    const progressMap = calculateIslandProgressMap(previewFullMap || customRecords);

    const summary = {};
    let fullCount = 0;

    islandRecords.forEach((rec, idx) => {
      const pct = progressMap[rec.id] ?? 0;
      const newLevel = computeCompletionLevel(pct);
      const prevLevel = rec.currentLevel;

      // 依完成度動態切換三個子群組 visible 屬性
      rec.level1Props.visible = newLevel >= 1;
      rec.level2Props.visible = newLevel >= 2;
      rec.level3Props.visible = newLevel >= 3;

      // 確保已顯示的群組預設縮放為 1（若接下來觸發升級動畫則會由動畫接手）
      if (newLevel >= 1 && (prevLevel === null || newLevel <= prevLevel)) {
        rec.level1Props.scale.setScalar(1);
      }
      if (newLevel >= 2 && (prevLevel === null || newLevel <= prevLevel)) {
        rec.level2Props.scale.setScalar(1);
      }
      if (newLevel >= 3 && (prevLevel === null || newLevel <= prevLevel)) {
        rec.level3Props.scale.setScalar(1);
      }

      // 更新島嶼懸浮名牌副標題（顯示繁榮度等級與完成度）
      if (rec.labelSprite && rec.labelSprite.userData && rec.labelSprite.userData.updateSubtitle) {
        rec.labelSprite.userData.updateSubtitle(`${rec.tag} · Lv.${newLevel} (${pct}%)`);
      }

      // 當完成測驗、分數使島嶼升級時，觸發 Scale Bounce 彈跳縮放動畫
      const leveledUp = prevLevel !== null && newLevel > prevLevel;
      if (animateUpgrade && leveledUp) {
        triggerIslandScaleBounce(rec, prevLevel, newLevel);

        // 若測驗彈窗或課程抽屜正開啟遮擋畫面，記錄待彈窗關閉時再次重播落成彈跳動畫
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
      rec.progressPct = pct;
      summary[rec.id] = { pct, level: newLevel, leveledUp };
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
          // 初始載入即已全滿分：直接呈現解鎖後聖殿、散去迷霧並施放慶祝彩帶
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

    return summary;
  }

  window.updateIslandsProgress = updateIslandsProgress;
  window.triggerIslandScaleBounce = (islandId, level) => {
    const rec = islandRecords.find((r) => r.id === islandId);
    if (!rec) return;
    if (typeof level === "number") {
      const lv = Math.max(0, Math.min(3, Math.floor(level)));
      rec.level1Props.visible = lv >= 1;
      rec.level2Props.visible = lv >= 2;
      rec.level3Props.visible = lv >= 3;
      rec.currentLevel = lv;
    }
    triggerIslandScaleBounce(rec, 0, rec.currentLevel || 1);
  };

  // 初次載入時同步學生既有作答紀錄（不觸發升級動畫）
  updateIslandsProgress({ animateUpgrade: false });

  /* ============================================================
   * 【易/中/難 100 分】三階段建築解鎖
   *   易(easy)  100 → Stage 1；再加 中(medium) 100 → Stage 2；再加 難(hard) 100 → Stage 3
   *   資料來源：Store.events()（localStorage ii:ev:*）中 type=quiz 且帶 difficulty 的紀錄（相容既有結構）
   * ============================================================ */
  const stageDebug = { override: null };
  function computeIslandStage(rec) {
    const evs = window.Store && typeof window.Store.events === "function" ? window.Store.events() : [];
    const full = { easy: false, medium: false, hard: false };
    (Array.isArray(evs) ? evs : []).forEach((e) => {
      if (!e || (e.type && e.type !== "quiz") || !e.difficulty || !(e.difficulty in full)) return;
      const belongs = e.island === rec.id || (e.unit && String(e.unit).split("-")[0] === rec.id);
      if (belongs && Number(e.score) >= 100) full[e.difficulty] = true;
    });
    if (!full.easy) return 0;
    if (!full.medium) return 1;
    return full.hard ? 3 : 2;
  }
  window.refreshIslandBuildings = function refreshIslandBuildings(opts) {
    const animate = !(opts && opts.animate === false);
    const result = {};
    islandRecords.forEach((rec) => {
      const target = stageDebug.override !== null ? stageDebug.override : computeIslandStage(rec);
      const prev = rec.stageLevel;
      rec.stageSys.setStage(target, animate && prev !== null && target > prev);
      rec.stageLevel = target;
      result[rec.id] = target;
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
      updateIslandsProgress({ animateUpgrade: false });
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
      updateIslandsProgress({ animateUpgrade: true });
      focusOnGrandFinale();
      console.log("[previewAllStage] Stage 4 終極滿分大通關已啟動（全島 3/3 ＋ 中央神殿榮耀狀態，previewAllStage() 還原）");
      return { mode: 4, grandFinale: true, stages: buildingSummary };
    }

    stageDebug.override = stageInt;
    grandFinalePreview = false;
    const buildingSummary = window.refreshIslandBuildings({ animate: true });
    updateIslandsProgress({ animateUpgrade: false });
    // Stage 0~3 預覽時強制中央神殿維持常態並關閉終極特效
    finaleEffectsGroup.visible = false;
    confettiGroup.visible = false;
    if (prevWasFinale) resetCameraToPanorama();
    console.log(`[previewAllStage] 全島切換為 Stage ${stageInt}（中央神殿維持常態；輸入 previewAllStage(4) 預覽終極大通關，() 還原）`);
    return { mode: stageInt, grandFinale: false, stages: buildingSummary };
  };
  window.previewAllStage = window.previewAllStages;
  window.refreshIslandBuildings({ animate: false });

  window.toggleGrandFinalePreview = function toggleGrandFinalePreview(forceState) {
    const next = typeof forceState === "boolean" ? forceState : !grandFinalePreview;
    window.previewAllStages(next ? 4 : "auto");
    return next;
  };

  let pendingQuizUpgradeSync = false;
  function syncBuildingsAfterQuiz() {
    window.refreshIslandBuildings({ animate: true });
    updateIslandsProgress({ animateUpgrade: true });
  }
  document.addEventListener("ii:quizdone", () => {
    const qm = document.getElementById("quizModal");
    if (qm && qm.classList.contains("show")) {
      // 測驗視窗仍開啟時，先標記待同步，待學生關閉測驗視窗瞬間立即播放建築升級與慶祝動畫
      pendingQuizUpgradeSync = true;
    } else {
      syncBuildingsAfterQuiz();
    }
  });
  document.addEventListener("ii:quizclosed", () => {
    if (pendingQuizUpgradeSync) {
      pendingQuizUpgradeSync = false;
      syncBuildingsAfterQuiz();
    }
  });
  document.addEventListener("ii:login", () => { pendingQuizUpgradeSync = false; islandRecords.forEach((r) => { r.stageLevel = null; }); window.refreshIslandBuildings({ animate: false }); });
  document.addEventListener("ii:logout", () => { pendingQuizUpgradeSync = false; islandRecords.forEach((r) => { r.stageLevel = null; }); window.refreshIslandBuildings({ animate: false }); });
  window.addEventListener("storage", () => window.refreshIslandBuildings({ animate: true }));

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

  // 監聽登入、登出與跨分頁儲存事件（ii:quizdone 已統一於上方處理並與關閉測驗視窗同步）
  document.addEventListener("ii:login", () => {
    // 切換學生帳號時重置基準等級並依新帳號紀錄設定顯示
    islandRecords.forEach((r) => {
      r.currentLevel = null;
    });
    sanctuaryState.unlocked = false;
    updateIslandsProgress({ animateUpgrade: false });
    triggerBoardingCameraTransition();
  });
  document.addEventListener("ii:logout", () => {
    islandRecords.forEach((r) => {
      r.currentLevel = null;
    });
    sanctuaryState.unlocked = false;
    updateIslandsProgress({ animateUpgrade: false });
  });
  window.addEventListener("storage", () => {
    updateIslandsProgress({ animateUpgrade: true });
  });

  // 當學生在測驗升級後關閉測驗視窗時，自動收起抽屜並重播建築落成 Scale Bounce 或聖殿甦醒動畫以利觀賞
  document.addEventListener("click", (e) => {
    if (!pendingUpgradeReplays.length && !sanctuaryState.pendingAwakeningReplay) return;
    const isQuizClose =
      e.target.closest("#qDone") ||
      e.target.closest("#quizClose") ||
      (e.target.id === "quizModal" && !e.target.classList.contains("show"));
    if (isQuizClose) {
      const closeDrawerBtn = document.getElementById("closeBtn");
      if (closeDrawerBtn) closeDrawerBtn.click();
      const replays = pendingUpgradeReplays.splice(0, pendingUpgradeReplays.length);
      const shouldReplaySanctuary = sanctuaryState.pendingAwakeningReplay;
      sanctuaryState.pendingAwakeningReplay = false;
      setTimeout(() => {
        replays.forEach(({ rec, fromLevel, toLevel }) => {
          triggerIslandScaleBounce(rec, fromLevel, toLevel);
        });
        if (shouldReplaySanctuary && sanctuaryState.unlocked) {
          triggerSanctuaryAwakening();
        }
      }, 180);
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
      if (!obj.isMesh || obj.isSprite || skipObjs.has(obj) || obj.userData.isBeacon) return;
      const m = obj.material;
      if (!m || Array.isArray(m) || skipMats.has(m)) return;
      // 材質多為跨島共用，首次篩選時為每個網格複製獨立材質，避免影響其他島嶼
      obj.material = m.clone();
      list.push({
        mat: obj.material,
        transparent: m.transparent,
        opacity: m.opacity
      });
    });
    rec.dimMats = list;
    return list;
  }

  function setIslandDim(rec, dim) {
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

  function applyGradeFilter(grade) {
    const g = Number(grade) || 0;
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
    focusOnIsland(rec);
    startRunToIsland(rec);
    moveState.targetTab = tab || "標準";
    moveState.targetUnitKey = unitKey || null;
  }

  function renderSceneFrame() {
    const t = clock.getElapsedTime();

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

    // 2. 白天白色微波輕微起伏與擺動
    rippleItems.forEach((item) => {
      const waveOffset = Math.sin(t * item.speed + item.phase);
      item.mesh.position.y = 0.22 + waveOffset * 0.12;
      item.mesh.scale.x = 0.85 + Math.cos(t * item.speed + item.phase) * 0.22;
    });

    // 3. 7 座小島隨海浪輕柔微幅浮動、岸邊與淺灘外緣浪花呼吸縮放與淡入淡出、滑鼠懸停回饋與建築動態
    const baseFoamOp = isNight ? THEME.night.foamOpacity : THEME.day.foamOpacity;
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
      const baseMistOpacity = isNight ? 0.42 : 0.56;
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

    navBuoys.forEach((nb) => {
      const waveY =
        Math.sin(nb.x * 0.16 + t * 1.65) * 0.16 +
        Math.cos(nb.z * 0.18 + t * 1.35) * 0.12;
      nb.root.position.y = 0.06 + waveY;
      nb.tiltPivot.rotation.z = Math.sin(t * 2.1 + nb.phase) * 0.13;
      nb.tiltPivot.rotation.x = Math.cos(t * 1.8 + nb.phase) * 0.1;

      // 頂端警示燈罩呼吸微光
      const pulse = 0.5 + 0.5 * Math.sin(t * 3.4 + nb.phase);
      nb.haloMat.opacity = (isNight ? 0.72 : 0.42) * (0.3 + 0.7 * pulse);
      nb.haloSphere.scale.setScalar(0.85 + pulse * 0.45);
      nb.ringMat.opacity = baseFoamOp * (0.35 + 0.55 * pulse);
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

    // (2) 外圍深海區 2 隻【跳躍海豚】以拋物線弧度定時躍出水面並激起微小水花粒子後潛入
    const dtDolphin = 0.016;
    jumpingDolphins.forEach((d) => {
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

    // 6. 夜晚星光與螢火蟲微粒漂浮、透明度/亮度微閃效果與碼頭燈光微幅閃爍
    if (isNight) {
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

      dockLampGlowMaterials.forEach((gMat, idx) => {
        gMat.opacity = 0.36 + Math.sin(t * 3.5 + idx) * 0.1;
      });
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
    scene,
    camera,
    islandRecords,
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
    updateIslandsProgress,
    triggerSanctuaryAwakening,
    launchCelebrationConfetti,
    retriggerConfetti: launchCelebrationConfetti,
    launchConfetti: launchCelebrationConfetti,
    setNight: (night) => applyDayNightTheme(!!night),
    isNight: () => isNight
  };

  let animFrameId = null;
  function isScenePaused() {
    if (document.hidden) return true;
    return !!document.querySelector("#quizModal.show, #docModal.show, #leaderboardModal.show, #resultModal.show");
  }

  function animate() {
    if (isScenePaused()) {
      animFrameId = null;
      return;
    }
    animFrameId = requestAnimationFrame(animate);
    renderSceneFrame();
  }

  function resumeSceneLoop() {
    if (animFrameId === null && !isScenePaused()) {
      animate();
    }
  }

  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) resumeSceneLoop();
  });
  document.addEventListener("ii:quizclosed", resumeSceneLoop);

  if (typeof MutationObserver !== "undefined") {
    const modalObserver = new MutationObserver(() => {
      resumeSceneLoop();
    });
    document.querySelectorAll("#quizModal, #docModal, #leaderboardModal, #resultModal").forEach((m) => {
      modalObserver.observe(m, { attributes: true, attributeFilter: ["class"] });
    });
  }

  // 確保視口尺寸、相機座標與第一幀完全渲染完畢後，再平滑淡入顯示 Canvas
  handleResize();
  controls.update();
  renderSceneFrame();
  requestAnimationFrame(() => {
    stage.classList.add("is-ready");
    resumeSceneLoop();
  });
})();
