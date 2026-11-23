/* ============================================================
 * 資訊課程島 · 四層大環境生態與視覺豐富化模組 (Ocean Environment)
 * ------------------------------------------------------------
 * 1. 水面與岸際層：青綠淺灘環帶、週期擴散白浪花圈、外海礁石/沙洲 + 迷你松樹、2 座海蝕拱門岩
 * 2. 海上交通層：3 艘巡航特色船（木造條紋帆船 / 數據封包運輸艇 / 巨型橡皮小鴨）+ V 型尾跡、8 顆航道浮標
 * 3. 海洋生態層：5 組水下魚群剪影、2 處躍水海豚生態點（含水花粒子與水花環）
 * 4. 天空包覆層：14 朵立體積雲、2 顆拼布熱氣球、6 隻盤旋海鷗、2 架數位紙飛機
 *
 * 效能原則：
 * - 大量重複物件一律使用 THREE.InstancedMesh 或共用 BufferGeometry + Material。
 * - 複合造型以頂點色合併為單一幾何（mergeParts），一個物件只佔一個 Draw Call。
 * - 夜間發光全部使用 emissive / 加法混合材質，零 THREE.PointLight。
 * - 不修改任何主島 / NPC 島座標、吊橋與計分邏輯，只讀取座標避讓。
 * ============================================================ */
(function () {
  "use strict";

  function createOceanEnvironment(opts) {
    const THREE = (opts && opts.THREE) || window.THREE;
    if (!THREE || !opts || !opts.scene) return null;

    const scene = opts.scene;
    const islandRecords = opts.islandRecords || [];
    const npcIslandRecords = opts.npcIslandRecords || [];
    let night = !!opts.isNight;

    const root = new THREE.Group();
    root.name = "oceanEnvironment";
    scene.add(root);

    const DEG = Math.PI / 180;
    const TAU = Math.PI * 2;
    const polar = (deg, r) => new THREE.Vector3(Math.cos(deg * DEG) * r, 0, Math.sin(deg * DEG) * r);

    // 與主場景海面頂點波形完全一致的解析式（讓漂浮物貼合浪面）
    function waveY(x, z, t) {
      return (
        Math.sin(x * 0.16 + t * 1.65) * 0.24 +
        Math.cos(z * 0.18 + t * 1.35) * 0.2 +
        Math.sin((x + z) * 0.1 + t * 2.1) * 0.1
      );
    }

    // 固定種子亂數：每次載入外觀一致
    let seed = 20261123;
    function rand() {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      return seed / 4294967296;
    }
    const rr = (a, b) => a + (b - a) * rand();

    const dummy = new THREE.Object3D();
    const tmpM = new THREE.Matrix4();
    const tmpM2 = new THREE.Matrix4();
    const tmpColor = new THREE.Color();
    const tmpV = new THREE.Vector3();
    const tmpV2 = new THREE.Vector3();

    function makeInstanced(geo, mat, count, dynamic) {
      const m = new THREE.InstancedMesh(geo, mat, Math.max(1, count));
      m.count = count;
      m.frustumCulled = false; // r128 的 InstancedMesh 包圍球不含實例位移，關閉裁切避免誤判消失
      if (dynamic) m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      root.add(m);
      return m;
    }

    function setDummy(x, y, z, rx, ry, rz, sx, sy, sz) {
      dummy.position.set(x, y, z);
      dummy.rotation.set(rx || 0, ry || 0, rz || 0);
      dummy.scale.set(sx === undefined ? 1 : sx, sy === undefined ? sx === undefined ? 1 : sx : sy, sz === undefined ? sx === undefined ? 1 : sx : sz);
      dummy.updateMatrix();
      return dummy.matrix;
    }

    // 將多個子幾何（含各自顏色與變換）合併為單一非索引幾何（頂點色），一個造型只需一個 Draw Call
    function mergeParts(parts) {
      const positions = [];
      const normals = [];
      const colors = [];
      const uvs = [];
      const c = new THREE.Color();
      const m = new THREE.Matrix4();
      parts.forEach((p) => {
        const g = p.geo.index ? p.geo.toNonIndexed() : p.geo.clone();
        const pos = p.pos || [0, 0, 0];
        const rot = p.rot || [0, 0, 0];
        const sc = p.scale || [1, 1, 1];
        dummy.position.set(pos[0], pos[1], pos[2]);
        dummy.rotation.set(rot[0], rot[1], rot[2]);
        dummy.scale.set(sc[0], sc[1], sc[2]);
        dummy.updateMatrix();
        m.copy(dummy.matrix);
        g.applyMatrix4(m);
        if (!g.attributes.normal) g.computeVertexNormals();
        c.set(p.color === undefined ? 0xffffff : p.color);
        const pa = g.attributes.position;
        const na = g.attributes.normal;
        const ca = g.attributes.color;
        const ua = g.attributes.uv;
        for (let i = 0; i < pa.count; i++) {
          positions.push(pa.getX(i), pa.getY(i), pa.getZ(i));
          normals.push(na.getX(i), na.getY(i), na.getZ(i));
          if (ca && p.keepColors) colors.push(ca.getX(i), ca.getY(i), ca.getZ(i));
          else colors.push(c.r, c.g, c.b);
          if (ua) uvs.push(ua.getX(i), ua.getY(i));
          else uvs.push(0, 0);
        }
        g.dispose();
        if (p.disposeSource !== false) p.geo.dispose();
      });
      const out = new THREE.BufferGeometry();
      out.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
      out.setAttribute("normal", new THREE.Float32BufferAttribute(normals, 3));
      out.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
      out.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
      out.computeBoundingSphere();
      return out;
    }

    // 低多邊形岩石擾動（以頂點座標為鍵，確保共享頂點位移一致不裂面）
    function jitterGeometry(geo, amount) {
      const pos = geo.attributes.position;
      const offsets = new Map();
      for (let i = 0; i < pos.count; i++) {
        const key = `${pos.getX(i).toFixed(3)},${pos.getY(i).toFixed(3)},${pos.getZ(i).toFixed(3)}`;
        let o = offsets.get(key);
        if (!o) {
          o = [(rand() - 0.5) * amount, (rand() - 0.5) * amount, (rand() - 0.5) * amount];
          offsets.set(key, o);
        }
        pos.setXYZ(i, pos.getX(i) + o[0], pos.getY(i) + o[1], pos.getZ(i) + o[2]);
      }
      pos.needsUpdate = true;
      geo.computeVertexNormals();
      return geo;
    }

    // 程式生成柔和徑向漸層光暈貼圖（零 PointLight 模擬地面／水面受光光斑）
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

    // 柔和體積感半透明光錐幾何（頂點色線性漸隱至透明邊緣，避免硬切邊）
    function buildSoftConeGeometry(rTop, rBot, height, segs, topTint, botTint) {
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

    let nightMix = night ? 1 : 0;

    /* ============================================================
     * 共用材質庫
     * ============================================================ */
    const rockMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.92, flatShading: true });
    const vcMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.72, flatShading: true });
    const vcSmoothMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.42, metalness: 0.02 });
    const pineMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.85, flatShading: true });
    const additiveWhiteMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      fog: false,
      side: THREE.DoubleSide
    });

    /* ============================================================
     * 第 1 層：水面與岸際（淺灘光圈、動態浪花、外海礁石、海蝕拱門）
     * ============================================================ */
    const shoreTargets = [];
    islandRecords.forEach((rec) => {
      const p = rec.group.position;
      shoreTargets.push({ x: p.x, z: p.z, halo: 20.8, wave: 16.9 });
    });
    npcIslandRecords.forEach((rec) => {
      const p = rec.group.position;
      const s = rec.baseScale || 1;
      const isCafe = rec.id === "quantum-cafe";
      shoreTargets.push({ x: p.x, z: p.z, halo: (isCafe ? 9.1 : 8.1) * s, wave: (isCafe ? 7.3 : 6.5) * s });
    });

    // 1a. 青綠淺灘環帶（單一 InstancedMesh）
    const haloGeo = new THREE.RingGeometry(0.78, 1.0, 44, 1);
    haloGeo.rotateX(-Math.PI / 2);
    const haloMat = new THREE.MeshBasicMaterial({
      color: 0x5eead4,
      transparent: true,
      opacity: 0.26,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1
    });
    const haloMesh = makeInstanced(haloGeo, haloMat, shoreTargets.length, false);
    haloMesh.renderOrder = 1;
    shoreTargets.forEach((s, i) => {
      haloMesh.setMatrixAt(i, setDummy(s.x, 0.1, s.z, 0, 0, 0, s.halo, 1, s.halo));
    });
    haloMesh.instanceMatrix.needsUpdate = true;

    // 1b. 外海礁石與沙洲（避開島群、吊橋與航道：全部位於半徑 94 以外）
    const REEF_SPECS = [
      { a: -95, r: 95, type: "rock", size: 4.0, pines: 2 },
      { a: -14, r: 104, type: "sand", size: 5.2, pines: 3 },
      { a: 14, r: 116, type: "rock", size: 3.6, pines: 1 },
      { a: 45, r: 103, type: "sand", size: 5.0, pines: 2 },
      { a: 74, r: 113, type: "rock", size: 4.6, pines: 2 },
      { a: 106, r: 101, type: "rock", size: 3.4, pines: 1 },
      { a: 138, r: 116, type: "sand", size: 5.8, pines: 3 },
      { a: 175, r: 109, type: "rock", size: 4.0, pines: 2 },
      { a: 194, r: 102, type: "sand", size: 4.6, pines: 2 },
      { a: 292, r: 102, type: "rock", size: 3.8, pines: 1 }
    ];
    const ROCK_COLORS = [0x6b7280, 0x7c8796, 0x8a7a6a, 0x5f6b78, 0x9a8b7a];
    const rocks = []; // {x,y,z,sx,sy,sz,ry,color}
    const sandbars = [];
    const pines = []; // {x,y,z,s}
    const reefFoam = []; // {x,z,r}

    REEF_SPECS.forEach((spec) => {
      const c = polar(spec.a, spec.r);
      const S = spec.size;
      reefFoam.push({ x: c.x, z: c.z, r: S * 1.15 });
      if (spec.type === "sand") {
        const yaw = rr(0, TAU);
        sandbars.push({ x: c.x, y: 0.15, z: c.z, sx: S, sz: S * 0.62, ry: yaw });
        // 沙洲邊緣 2 顆小岩
        for (let k = 0; k < 2; k++) {
          const ang = yaw + k * Math.PI + rr(-0.4, 0.4);
          rocks.push({
            x: c.x + Math.cos(ang) * S * 0.85,
            y: 0.2,
            z: c.z + Math.sin(ang) * S * 0.55,
            sx: S * 0.22, sy: S * 0.26, sz: S * 0.2,
            ry: rand() * TAU,
            color: ROCK_COLORS[(k + spec.pines) % ROCK_COLORS.length]
          });
        }
        for (let k = 0; k < spec.pines; k++) {
          const ang = rand() * TAU;
          const d = rr(0, S * 0.4);
          pines.push({ x: c.x + Math.cos(ang) * d, y: 0.72, z: c.z + Math.sin(ang) * d * 0.6, s: rr(0.85, 1.25) });
        }
      } else {
        const sx = S * 0.6;
        const sy = S * 0.72;
        const sz = S * 0.52;
        const cy = S * 0.12;
        rocks.push({ x: c.x, y: cy, z: c.z, sx, sy, sz, ry: rand() * TAU, color: ROCK_COLORS[spec.pines % ROCK_COLORS.length] });
        const sideCount = 3;
        for (let k = 0; k < sideCount; k++) {
          const ang = (k / sideCount) * TAU + rr(-0.5, 0.5);
          const d = S * rr(0.62, 0.85);
          const s2 = S * rr(0.22, 0.36);
          rocks.push({
            x: c.x + Math.cos(ang) * d,
            y: s2 * 0.15,
            z: c.z + Math.sin(ang) * d,
            sx: s2, sy: s2 * rr(0.9, 1.3), sz: s2 * 0.9,
            ry: rand() * TAU,
            color: ROCK_COLORS[(k + 1) % ROCK_COLORS.length]
          });
        }
        for (let k = 0; k < spec.pines; k++) {
          const ox = (k - (spec.pines - 1) / 2) * sx * 0.55;
          pines.push({ x: c.x + ox, y: cy + sy * 0.68, z: c.z + rr(-0.25, 0.25), s: rr(0.75, 1.05) });
        }
      }
    });

    // 1c. 兩座大型海蝕拱門岩（遠景地標）
    const ARCH_SPECS = [
      { a: -50, r: 102, scale: 1.0, yawOffset: 0.35 },
      { a: -134, r: 103, scale: 0.88, yawOffset: -0.25 }
    ];
    const arches = [];
    ARCH_SPECS.forEach((spec) => {
      const c = polar(spec.a, spec.r);
      const yaw = -spec.a * DEG + Math.PI / 2 + spec.yawOffset; // 拱門面朝島群中心附近
      const s = spec.scale;
      const span = 5.6 * s;
      arches.push({ x: c.x, z: c.z, yaw, s, center: c });
      reefFoam.push({ x: c.x, z: c.z, r: 8.5 * s });
      // 兩側落腳巨岩 + 頂部冠岩
      const ux = Math.cos(yaw);
      const uz = -Math.sin(yaw);
      [-1, 1].forEach((side, k) => {
        rocks.push({
          x: c.x + ux * span * side,
          y: 0.6 * s,
          z: c.z + uz * span * side,
          sx: 2.5 * s, sy: 3.1 * s, sz: 2.3 * s,
          ry: rand() * TAU,
          color: k ? 0xa98467 : 0x9c7a5b
        });
      });
      rocks.push({ x: c.x, y: 7.3 * s, z: c.z, sx: 2.2 * s, sy: 1.2 * s, sz: 1.9 * s, ry: yaw, color: 0xb08d6e });
      pines.push({ x: c.x + ux * 0.6 * s, y: 8.15 * s, z: c.z + uz * 0.6 * s, s: 0.9 * s });
      pines.push({ x: c.x - ux * 0.9 * s, y: 8.0 * s, z: c.z - uz * 0.9 * s, s: 0.7 * s });
    });

    // 岩石 InstancedMesh（礁石 + 拱門落腳岩共用）
    const rockGeo = jitterGeometry(new THREE.DodecahedronGeometry(1, 0), 0.32);
    const rockMesh = makeInstanced(rockGeo, rockMat, rocks.length, false);
    rocks.forEach((r, i) => {
      rockMesh.setMatrixAt(i, setDummy(r.x, r.y, r.z, rr(-0.15, 0.15), r.ry, rr(-0.12, 0.12), r.sx, r.sy, r.sz));
      rockMesh.setColorAt(i, tmpColor.setHex(r.color));
    });
    rockMesh.instanceMatrix.needsUpdate = true;
    if (rockMesh.instanceColor) rockMesh.instanceColor.needsUpdate = true;

    // 沙洲 InstancedMesh
    const sandGeo = jitterGeometry(new THREE.CylinderGeometry(1, 1.22, 1.1, 10, 1), 0.08);
    const sandMat = new THREE.MeshStandardMaterial({ color: 0xf2dca4, roughness: 0.95, flatShading: true });
    const sandMesh = makeInstanced(sandGeo, sandMat, sandbars.length, false);
    sandbars.forEach((s, i) => {
      sandMesh.setMatrixAt(i, setDummy(s.x, s.y, s.z, 0, s.ry, 0, s.sx, 1, s.sz));
    });
    sandMesh.instanceMatrix.needsUpdate = true;

    // 拱門本體 InstancedMesh（半圓環 Torus）
    const archGeo = jitterGeometry(new THREE.TorusGeometry(5.6, 1.55, 6, 12, Math.PI), 0.45);
    const archMesh = makeInstanced(archGeo, rockMat, arches.length, false);
    arches.forEach((a, i) => {
      archMesh.setMatrixAt(i, setDummy(a.x, -0.5 * a.s, a.z, 0, a.yaw, 0, a.s, a.s * 1.08, a.s * 1.35));
      archMesh.setColorAt(i, tmpColor.setHex(i ? 0xb5926f : 0xc19a6b));
    });
    archMesh.instanceMatrix.needsUpdate = true;
    if (archMesh.instanceColor) archMesh.instanceColor.needsUpdate = true;

    // 迷你松樹：樹幹 1 個 InstancedMesh + 雙層樹冠 1 個 InstancedMesh
    const trunkGeo = new THREE.CylinderGeometry(0.1, 0.15, 0.7, 5);
    trunkGeo.translate(0, 0.35, 0);
    const crownGeo = new THREE.ConeGeometry(0.72, 1.25, 6);
    crownGeo.translate(0, 0.62, 0);
    const trunkMesh = makeInstanced(trunkGeo, pineMat, pines.length, false);
    const crownMesh = makeInstanced(crownGeo, pineMat, pines.length * 2, false);
    pines.forEach((p, i) => {
      const yaw = rand() * TAU;
      trunkMesh.setMatrixAt(i, setDummy(p.x, p.y, p.z, 0, yaw, 0, p.s));
      trunkMesh.setColorAt(i, tmpColor.setHex(0x7a4b2a));
      crownMesh.setMatrixAt(i * 2, setDummy(p.x, p.y + 0.5 * p.s, p.z, 0, yaw, 0, p.s));
      crownMesh.setColorAt(i * 2, tmpColor.setHex(0x2f7d4a));
      crownMesh.setMatrixAt(i * 2 + 1, setDummy(p.x, p.y + 1.15 * p.s, p.z, 0, yaw + 0.5, 0, p.s * 0.72));
      crownMesh.setColorAt(i * 2 + 1, tmpColor.setHex(0x3fa463));
    });
    [trunkMesh, crownMesh].forEach((m) => {
      m.instanceMatrix.needsUpdate = true;
      if (m.instanceColor) m.instanceColor.needsUpdate = true;
    });

    // 1d. 週期向外擴散、淡出的白色細浪花圈（島嶼 2 圈交錯 + 礁石/拱門 1 圈，單一加法混合 InstancedMesh）
    const waveRingEntries = [];
    shoreTargets.forEach((s, idx) => {
      for (let k = 0; k < 2; k++) {
        waveRingEntries.push({ x: s.x, z: s.z, r0: s.wave, grow: 0.26, period: 4.6, phase: k * 2.3 + idx * 0.37, y: 0.2, gain: 1 });
      }
    });
    reefFoam.forEach((f, idx) => {
      waveRingEntries.push({ x: f.x, z: f.z, r0: f.r, grow: 0.45, period: 3.8, phase: idx * 0.71, y: 0.24, gain: 1.15 });
    });
    const waveRingGeo = new THREE.RingGeometry(0.972, 1.0, 56, 1);
    waveRingGeo.rotateX(-Math.PI / 2);
    const waveRingMat = additiveWhiteMat.clone();
    waveRingMat.fog = false;
    const waveRingMesh = makeInstanced(waveRingGeo, waveRingMat, waveRingEntries.length, true);
    waveRingMesh.renderOrder = 2;
    waveRingEntries.forEach((e, i) => {
      waveRingMesh.setMatrixAt(i, setDummy(e.x, e.y, e.z, 0, 0, 0, e.r0, 1, e.r0));
      waveRingMesh.setColorAt(i, tmpColor.setRGB(0, 0, 0));
    });
    let waveBrightness = 0.5;

    function updateWaveRings(t) {
      const dayGain = 0.5 * (1 - nightMix);
      const nightGain = 0.28 * nightMix;
      for (let i = 0; i < waveRingEntries.length; i++) {
        const e = waveRingEntries[i];
        const p = ((t + e.phase) % e.period) / e.period;
        const s = e.r0 * (1 + e.grow * p);
        const fadeIn = Math.min(1, p / 0.12);
        const env = fadeIn * Math.pow(1 - p, 1.55) * e.gain;
        const aD = env * dayGain;
        const shimmer = 0.8 + 0.25 * Math.sin(t * 2.1 + e.phase);
        const aN = env * nightGain * shimmer;
        // 白天白色浪花，夜晚轉為「藍眼淚（生光藻）」青藍色微光
        waveRingMesh.setMatrixAt(i, setDummy(e.x, e.y, e.z, 0, 0, 0, s, 1, s));
        waveRingMesh.setColorAt(i, tmpColor.setRGB(aD + aN * 0.16, aD + aN * 0.85, aD + aN * 1.0));
      }
      waveRingMesh.instanceMatrix.needsUpdate = true;
      if (waveRingMesh.instanceColor) waveRingMesh.instanceColor.needsUpdate = true;
    }

    /* ============================================================
     * 第 2 層：海上動態交通網（3 艘巡航船 + V 型尾跡、8 顆航道浮標）
     * ============================================================ */
    function buildSeaLoop(radius, wobble, lobes, phase, clockwise) {
      const pts = [];
      const N = 36;
      for (let i = 0; i < N; i++) {
        const a = (i / N) * TAU * (clockwise ? -1 : 1);
        const r = radius + Math.sin(a * lobes + phase) * wobble;
        pts.push(new THREE.Vector3(Math.cos(a) * r, 0, Math.sin(a) * r));
      }
      return new THREE.CatmullRomCurve3(pts, true, "centripetal", 0.5);
    }

    // V 型白色水波尾跡（共用幾何，頂點色漸隱 + 加法混合）
    function buildWakeGeometry() {
      const pos = [];
      const col = [];
      const pushTri = (a, b, c, ia, ib, ic) => {
        pos.push(a[0], 0, a[1], b[0], 0, b[1], c[0], 0, c[1]);
        col.push(ia, ia, ia, ib, ib, ib, ic, ic, ic);
      };
      const L = 7.5;
      const spread = 2.9;
      const segs = 10;
      [-1, 1].forEach((side) => {
        const len = Math.hypot(spread, L);
        const nx = L / len;
        const nz = (side * spread) / len;
        for (let s = 0; s < segs; s++) {
          const f0 = s / segs;
          const f1 = (s + 1) / segs;
          const c0 = [side * spread * f0 + side * 0.3, -L * f0];
          const c1 = [side * spread * f1 + side * 0.3, -L * f1];
          const w0 = 0.1 + 0.32 * f0;
          const w1 = 0.1 + 0.32 * f1;
          const i0 = Math.pow(1 - f0, 1.4) * 0.95;
          const i1 = Math.pow(1 - f1, 1.4) * 0.95;
          const a0 = [c0[0] + nx * w0, c0[1] + nz * w0];
          const b0 = [c0[0] - nx * w0, c0[1] - nz * w0];
          const a1 = [c1[0] + nx * w1, c1[1] + nz * w1];
          const b1 = [c1[0] - nx * w1, c1[1] - nz * w1];
          pushTri(a0, b0, a1, i0, i0, i1);
          pushTri(b0, b1, a1, i0, i1, i1);
        }
      });
      // 中央螺旋槳白沫
      const cs = 6;
      for (let s = 0; s < cs; s++) {
        const f0 = s / cs;
        const f1 = (s + 1) / cs;
        const w0 = 0.35 + 0.4 * f0;
        const w1 = 0.35 + 0.4 * f1;
        const z0 = -4.2 * f0;
        const z1 = -4.2 * f1;
        const i0 = Math.pow(1 - f0, 1.2) * 0.6;
        const i1 = Math.pow(1 - f1, 1.2) * 0.6;
        pushTri([-w0, z0], [w0, z0], [-w1, z1], i0, i0, i1);
        pushTri([w0, z0], [w1, z1], [-w1, z1], i0, i1, i1);
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
      g.setAttribute("color", new THREE.Float32BufferAttribute(col, 3));
      return g;
    }
    const wakeGeo = buildWakeGeometry();
    const wakeMat = new THREE.MeshBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      fog: false,
      side: THREE.DoubleSide
    });

    function makeWaterGlowDisc(w, h, colorHex, x = 0, y = 0.15, z = 0) {
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
      const m = new THREE.Mesh(geo, mat);
      m.position.set(x, y, z);
      m.renderOrder = 2;
      m.visible = false;
      return { mesh: m, mat };
    }

    function makeGlowSprite(colorHex, scale) {
      const mat = new THREE.SpriteMaterial({
        map: radialGlowTex,
        color: colorHex,
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        fog: false
      });
      const sp = new THREE.Sprite(mat);
      sp.scale.setScalar(scale);
      sp.renderOrder = 4;
      sp.visible = false;
      return { sprite: sp, mat };
    }

    // 2a. 動森風木造小帆船（紅白條紋船帆 ＋ 桅杆夜航燈與船舷導航燈）
    function createStripeTexture() {
      const cv = document.createElement("canvas");
      cv.width = 8;
      cv.height = 64;
      const ctx = cv.getContext("2d");
      const bands = 7;
      for (let i = 0; i < bands; i++) {
        ctx.fillStyle = i % 2 === 0 ? "#e63946" : "#fff8ee";
        ctx.fillRect(0, (i * 64) / bands, 8, Math.ceil(64 / bands));
      }
      const tex = new THREE.CanvasTexture(cv);
      tex.magFilter = THREE.NearestFilter;
      return tex;
    }
    function buildSailGeometry(top, bottomFront, bottomBack, billowX) {
      const yMin = Math.min(bottomFront[1], bottomBack[1]);
      const yMax = top[1];
      const mid = [
        billowX,
        (top[1] + bottomFront[1] + bottomBack[1]) / 3,
        (top[2] + bottomFront[2] + bottomBack[2]) / 3
      ];
      const verts = [top, bottomFront, mid, bottomFront, bottomBack, mid, bottomBack, top, mid];
      const pos = [];
      const uv = [];
      verts.forEach((v) => {
        pos.push(v[0], v[1], v[2]);
        uv.push(0.5, (v[1] - yMin) / (yMax - yMin));
      });
      const g = new THREE.BufferGeometry();
      g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
      g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
      g.computeVertexNormals();
      return g;
    }
    const sailMat = new THREE.MeshStandardMaterial({
      map: createStripeTexture(),
      side: THREE.DoubleSide,
      roughness: 0.7,
      flatShading: true
    });
    const sailWarmLampMat = new THREE.MeshStandardMaterial({
      color: 0xffe8a3,
      emissive: 0xffb703,
      emissiveIntensity: 0.2,
      roughness: 0.25
    });
    const sailPortMat = new THREE.MeshStandardMaterial({
      color: 0xff6b6b,
      emissive: 0xff3b4e,
      emissiveIntensity: 0.15,
      roughness: 0.3
    });
    const sailStarboardMat = new THREE.MeshStandardMaterial({
      color: 0x5eead4,
      emissive: 0x10e5a8,
      emissiveIntensity: 0.15,
      roughness: 0.3
    });
    const sailWakeMat = wakeMat.clone();

    function createWoodenSailboat() {
      const holder = new THREE.Group();
      const pivot = new THREE.Group();
      holder.add(pivot);
      const hullGeo = mergeParts([
        { geo: new THREE.CylinderGeometry(0.95, 0.6, 0.8, 8), color: 0x9c6b3f, pos: [0, 0.32, 0], scale: [1, 1, 2.3] },
        { geo: new THREE.CylinderGeometry(0.985, 0.95, 0.16, 8), color: 0xfff8ee, pos: [0, 0.66, 0], scale: [1, 1, 2.3] },
        { geo: new THREE.BoxGeometry(1.7, 0.12, 3.6), color: 0xe9c48a, pos: [0, 0.76, 0] },
        { geo: new THREE.BoxGeometry(0.95, 0.55, 0.95), color: 0xd64045, pos: [0, 1.1, -1.15] },
        { geo: new THREE.ConeGeometry(0.78, 0.42, 4), color: 0x7a4a2a, pos: [0, 1.58, -1.15], rot: [0, Math.PI / 4, 0] },
        { geo: new THREE.CylinderGeometry(0.07, 0.09, 3.7, 6), color: 0x6b4423, pos: [0, 2.6, 0.32] },
        { geo: new THREE.CylinderGeometry(0.045, 0.045, 2.0, 5), color: 0x6b4423, pos: [0, 1.12, -0.6], rot: [Math.PI / 2, 0, 0] },
        { geo: new THREE.BoxGeometry(0.03, 0.32, 0.55), color: 0xe63946, pos: [0, 4.5, 0.06] },
        { geo: new THREE.BoxGeometry(0.18, 0.04, 0.04), color: 0x4a3525, pos: [0.1, 3.92, 0.38] }
      ]);
      pivot.add(new THREE.Mesh(hullGeo, vcMat));
      pivot.add(new THREE.Mesh(buildSailGeometry([0.02, 4.35, 0.3], [0.02, 1.1, 0.3], [0.02, 1.1, -1.55], 0.32), sailMat));
      pivot.add(new THREE.Mesh(buildSailGeometry([0.02, 3.9, 0.42], [0.02, 0.95, 0.42], [0.02, 0.95, 2.05], 0.24), sailMat));

      // 船艙暖黃窗戶 + 桅杆夜航燈 + 兩側紅綠舷燈
      const cabinWin = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.26, 0.06), sailWarmLampMat);
      cabinWin.position.set(0, 1.15, -0.66);
      pivot.add(cabinWin);

      const mastLamp = new THREE.Mesh(new THREE.OctahedronGeometry(0.14, 0), sailWarmLampMat);
      mastLamp.position.set(0.14, 3.78, 0.38);
      pivot.add(mastLamp);
      const mastGlow = makeGlowSprite(0xffcb47, 1.9);
      mastGlow.sprite.position.set(0.14, 3.78, 0.38);
      pivot.add(mastGlow.sprite);

      const portLight = new THREE.Mesh(new THREE.SphereGeometry(0.085, 8, 6), sailPortMat);
      portLight.position.set(0.91, 0.85, 0.48);
      pivot.add(portLight);
      const portGlow = makeGlowSprite(0xff5a6e, 1.1);
      portGlow.sprite.position.copy(portLight.position);
      pivot.add(portGlow.sprite);

      const stbdLight = new THREE.Mesh(new THREE.SphereGeometry(0.085, 8, 6), sailStarboardMat);
      stbdLight.position.set(-0.91, 0.85, 0.48);
      pivot.add(stbdLight);
      const stbdGlow = makeGlowSprite(0x2ee6a8, 1.1);
      stbdGlow.sprite.position.copy(stbdLight.position);
      pivot.add(stbdGlow.sprite);

      const waterGlow = makeWaterGlowDisc(8.6, 10.6, 0xffc65c, 0, 0.14, 0.1);
      holder.add(waterGlow.mesh);

      const wake = new THREE.Mesh(wakeGeo, sailWakeMat);
      wake.position.set(0, 0.22, -1.9);
      wake.renderOrder = 2;
      holder.add(wake);
      return {
        holder,
        pivot,
        wake,
        wakeMat: sailWakeMat,
        waterGlow,
        glowSprites: [mastGlow, portGlow, stbdGlow]
      };
    }

    // 2b. 科技風「數據封包運輸艇」（載 2 顆發光青藍色方塊 ＋ 水面青色科技光暈）
    const dataGlowMat = new THREE.MeshStandardMaterial({
      color: 0x7ff6ff,
      emissive: 0x00d8ff,
      emissiveIntensity: 0.9,
      roughness: 0.25,
      metalness: 0.1,
      flatShading: true
    });
    const dataWakeMat = wakeMat.clone();
    function createDataPacketBoat() {
      const holder = new THREE.Group();
      const pivot = new THREE.Group();
      holder.add(pivot);
      const hullGeo = mergeParts([
        { geo: new THREE.BoxGeometry(1.7, 0.62, 3.8), color: 0x1e293b, pos: [0, 0.28, -0.2] },
        { geo: new THREE.BoxGeometry(1.2, 0.62, 1.2), color: 0x1e293b, pos: [0, 0.28, 1.7], rot: [0, Math.PI / 4, 0] },
        { geo: new THREE.BoxGeometry(1.6, 0.06, 3.7), color: 0xcbd5e1, pos: [0, 0.62, -0.2] },
        { geo: new THREE.BoxGeometry(1.2, 0.72, 1.1), color: 0xe2e8f0, pos: [0, 0.98, -1.35] },
        { geo: new THREE.BoxGeometry(1.24, 0.2, 0.7), color: 0x0ea5e9, pos: [0, 1.1, -1.2] },
        { geo: new THREE.CylinderGeometry(0.03, 0.03, 0.9, 4), color: 0x94a3b8, pos: [0.35, 1.75, -1.55] },
        { geo: new THREE.BoxGeometry(0.5, 0.06, 0.5), color: 0x94a3b8, pos: [-0.25, 1.37, -1.45], rot: [0, 0.6, 0] }
      ]);
      pivot.add(new THREE.Mesh(hullGeo, vcMat));
      const glowGeo = mergeParts([
        { geo: new THREE.BoxGeometry(1.74, 0.07, 3.84), pos: [0, 0.48, -0.2] },
        { geo: new THREE.OctahedronGeometry(0.11, 0), pos: [0.35, 2.25, -1.55] }
      ]);
      pivot.add(new THREE.Mesh(glowGeo, dataGlowMat));

      const cubeGeo = new THREE.BoxGeometry(0.72, 0.72, 0.72);
      const dataGlowSprites = [];
      const cubes = [0.25, 1.25].map((z) => {
        const cube = new THREE.Mesh(cubeGeo, dataGlowMat);
        cube.position.set(0, 1.05, z);
        pivot.add(cube);
        const cg = makeGlowSprite(0x22d3ee, 2.3);
        cg.sprite.position.set(0, 1.05, z);
        pivot.add(cg.sprite);
        dataGlowSprites.push({ cube, glow: cg });
        return cube;
      });
      const antGlow = makeGlowSprite(0x38bdf8, 1.35);
      antGlow.sprite.position.set(0.35, 2.25, -1.55);
      pivot.add(antGlow.sprite);

      const waterGlow = makeWaterGlowDisc(10.6, 12.6, 0x00e5ff, 0, 0.14, 0.15);
      holder.add(waterGlow.mesh);

      const wake = new THREE.Mesh(wakeGeo, dataWakeMat);
      wake.position.set(0, 0.22, -2.1);
      wake.renderOrder = 2;
      holder.add(wake);
      return {
        holder,
        pivot,
        wake,
        wakeMat: dataWakeMat,
        cubes,
        dataGlowSprites,
        antGlow,
        waterGlow
      };
    }

    // 2c. 巨型黃色橡皮小鴨漂浮船（頭頂小皇冠與領結暖金自發光 ＋ 水面金色反射光暈 ＋ 夜光 V 字尾跡）
    const duckGoldMat = new THREE.MeshStandardMaterial({
      color: 0xffd166,
      emissive: 0xffaa00,
      emissiveIntensity: 0.25,
      roughness: 0.24,
      metalness: 0.42,
      flatShading: true
    });
    const duckWakeMat = wakeMat.clone();
    function createRubberDuck() {
      const holder = new THREE.Group();
      const pivot = new THREE.Group();
      holder.add(pivot);
      const duckGeo = mergeParts([
        { geo: new THREE.SphereGeometry(1, 14, 10), color: 0xffd60a, pos: [0, 0.5, 0], scale: [1.45, 0.95, 1.85] },
        { geo: new THREE.ConeGeometry(0.55, 1.0, 8), color: 0xffd60a, pos: [0, 1.05, -1.7], rot: [-Math.PI / 2 - 0.65, 0, 0] },
        { geo: new THREE.SphereGeometry(0.88, 14, 10), color: 0xffd60a, pos: [0, 1.95, 0.95] },
        { geo: new THREE.SphereGeometry(0.5, 10, 6), color: 0xff8c1a, pos: [0, 1.78, 1.78], scale: [1.1, 0.34, 1.0] },
        { geo: new THREE.SphereGeometry(0.12, 8, 6), color: 0x111111, pos: [0.4, 2.2, 1.62] },
        { geo: new THREE.SphereGeometry(0.12, 8, 6), color: 0x111111, pos: [-0.4, 2.2, 1.62] },
        { geo: new THREE.SphereGeometry(0.045, 6, 4), color: 0xffffff, pos: [0.44, 2.26, 1.72] },
        { geo: new THREE.SphereGeometry(0.045, 6, 4), color: 0xffffff, pos: [-0.36, 2.26, 1.72] },
        { geo: new THREE.SphereGeometry(1, 10, 6), color: 0xffc300, pos: [1.3, 0.82, -0.15], scale: [0.28, 0.45, 0.85] },
        { geo: new THREE.SphereGeometry(1, 10, 6), color: 0xffc300, pos: [-1.3, 0.82, -0.15], scale: [0.28, 0.45, 0.85] }
      ]);
      pivot.add(new THREE.Mesh(duckGeo, vcSmoothMat));

      // 小鴨頭頂暖金小皇冠 + 胸前可愛小領結（夜晚亮起暖金自發光）
      const crownParts = [
        { geo: new THREE.CylinderGeometry(0.32, 0.28, 0.14, 10), pos: [0, 2.86, 0.92] },
        { geo: new THREE.OctahedronGeometry(0.1, 0), pos: [0, 2.98, 0.92] }
      ];
      for (let k = 0; k < 5; k++) {
        const ka = (k / 5) * TAU;
        crownParts.push({
          geo: new THREE.ConeGeometry(0.09, 0.24, 4),
          pos: [Math.cos(ka) * 0.24, 3.03, 0.92 + Math.sin(ka) * 0.24]
        });
      }
      // 胸前暖金小領結
      crownParts.push(
        { geo: new THREE.ConeGeometry(0.18, 0.34, 4), pos: [0.2, 1.24, 1.56], rot: [0, 0, Math.PI / 2] },
        { geo: new THREE.ConeGeometry(0.18, 0.34, 4), pos: [-0.2, 1.24, 1.56], rot: [0, 0, -Math.PI / 2] },
        { geo: new THREE.SphereGeometry(0.1, 8, 6), pos: [0, 1.24, 1.58] }
      );
      pivot.add(new THREE.Mesh(mergeParts(crownParts), duckGoldMat));

      const crownGlow = makeGlowSprite(0xffd15c, 2.2);
      crownGlow.sprite.position.set(0, 2.95, 0.92);
      pivot.add(crownGlow.sprite);
      const bowGlow = makeGlowSprite(0xffc94d, 1.5);
      bowGlow.sprite.position.set(0, 1.24, 1.62);
      pivot.add(bowGlow.sprite);

      pivot.scale.setScalar(1.75);

      const waterGlow = makeWaterGlowDisc(12.6, 14.4, 0xffd147, 0, 0.14, 0.15);
      holder.add(waterGlow.mesh);

      const wake = new THREE.Mesh(wakeGeo, duckWakeMat);
      wake.position.set(0, 0.22, -2.8);
      wake.scale.set(1.5, 1, 1.3);
      wake.renderOrder = 2;
      holder.add(wake);
      return {
        holder,
        pivot,
        wake,
        wakeMat: duckWakeMat,
        waterGlow,
        isDuck: true,
        glowSprites: [crownGlow, bowGlow]
      };
    }

    // 航道半徑 77～92（避開半徑 74 浮標、半徑 <=72 NPC 島與半徑 >=94 礁石/海豚點）
    const cruisers = [
      { ...createWoodenSailboat(), curve: buildSeaLoop(79.0, 1.6, 3, 0.4, true), velocity: 2.6, u0: 0.18, float: 0.02, ph: 0.3, rollAmp: 0.07 },
      { ...createDataPacketBoat(), curve: buildSeaLoop(84.8, 1.8, 2, 1.7, false), velocity: 3.4, u0: 0.67, float: 0.04, ph: 1.9, rollAmp: 0.04 },
      { ...createRubberDuck(), curve: buildSeaLoop(90.2, 1.5, 4, 2.9, true), velocity: 1.5, u0: 0.28, float: 0.0, ph: 3.4, rollAmp: 0.09 }
    ];
    cruisers.forEach((b) => {
      b.length = b.curve.getLength();
      b.speed = b.velocity / b.length;
      b.p = new THREE.Vector3();
      b.tan = new THREE.Vector3();
      root.add(b.holder);
    });

    function updateCruisers(t) {
      for (let i = 0; i < cruisers.length; i++) {
        const b = cruisers[i];
        const u = (((b.u0 + t * b.speed) % 1) + 1) % 1;
        b.curve.getPointAt(u, b.p);
        b.curve.getTangentAt(u, b.tan);
        b.holder.position.set(b.p.x, waveY(b.p.x, b.p.z, t) * 0.85 + b.float, b.p.z);
        b.holder.rotation.y = Math.atan2(b.tan.x, b.tan.z);
        b.pivot.rotation.z = Math.sin(t * 1.3 + b.ph) * b.rollAmp;
        b.pivot.rotation.x = Math.cos(t * 1.1 + b.ph) * b.rollAmp * 0.6;
        b.wake.scale.z = (b.wake.userData.baseZ || (b.wake.userData.baseZ = b.wake.scale.z)) * (1 + Math.sin(t * 3.1 + b.ph) * 0.06);
        if (b.cubes) {
          b.cubes.forEach((cube, k) => {
            cube.position.y = 1.08 + Math.sin(t * 2.4 + k * 1.6) * 0.12;
            cube.rotation.y = t * 0.9 + k;
            cube.rotation.x = Math.sin(t * 0.7 + k) * 0.25;
            if (b.dataGlowSprites && b.dataGlowSprites[k]) {
              b.dataGlowSprites[k].glow.sprite.position.y = cube.position.y;
            }
          });
        }
        if (b.waterGlow) {
          const showGlow = nightMix > 0.01;
          b.waterGlow.mesh.visible = showGlow;
          if (showGlow) {
            const pulse = 0.5 + 0.5 * Math.sin(t * 2.4 + b.ph);
            const sc = 0.94 + pulse * 0.14;
            b.waterGlow.mesh.scale.set(sc, 1, sc);
            const baseOp = b.isDuck ? 0.44 + pulse * 0.12 : b.cubes ? 0.44 + pulse * 0.14 : 0.30 + pulse * 0.08;
            b.waterGlow.mat.opacity = baseOp * nightMix;
          }
        }
        if (b.glowSprites) {
          const showSp = nightMix > 0.01;
          b.glowSprites.forEach((gs, gi) => {
            gs.sprite.visible = showSp;
            if (showSp) gs.mat.opacity = (0.62 + 0.2 * Math.sin(t * 3.1 + gi)) * nightMix;
          });
        }
        if (b.dataGlowSprites) {
          const showDg = nightMix > 0.01;
          b.dataGlowSprites.forEach((dg, gi) => {
            dg.glow.sprite.visible = showDg;
            if (showDg) dg.glow.mat.opacity = (0.58 + 0.22 * Math.sin(t * 3.4 + gi)) * nightMix;
          });
          if (b.antGlow) {
            b.antGlow.sprite.visible = showDg;
            if (showDg) b.antGlow.mat.opacity = (0.65 + 0.25 * Math.sin(t * 4.5)) * nightMix;
          }
        }
      }
    }

    // 2d. 8 顆紅白相間航道浮標（夜晚輪流閃爍暖黃與青綠信號燈 ＋ 海面同步光暈投影）
    const buoyBodyGeo = mergeParts([
      { geo: new THREE.CylinderGeometry(0.6, 0.75, 0.9, 10), color: 0xe63946, pos: [0, 0.15, 0] },
      { geo: new THREE.CylinderGeometry(0.5, 0.6, 0.35, 10), color: 0xfafafa, pos: [0, 0.775, 0] },
      { geo: new THREE.CylinderGeometry(0.38, 0.5, 0.5, 10), color: 0xe63946, pos: [0, 1.2, 0] },
      { geo: new THREE.CylinderGeometry(0.3, 0.38, 0.25, 10), color: 0xfafafa, pos: [0, 1.575, 0] },
      { geo: new THREE.ConeGeometry(0.34, 0.32, 10), color: 0xe63946, pos: [0, 2.24, 0] },
      { geo: new THREE.CylinderGeometry(0.03, 0.03, 0.4, 4), color: 0x334155, pos: [0, 2.55, 0] }
    ]);
    const buoyLampGeo = new THREE.CylinderGeometry(0.26, 0.26, 0.4, 10);
    buoyLampGeo.translate(0, 1.89, 0);
    const buoyHaloGeo = new THREE.SphereGeometry(0.98, 10, 8);
    buoyHaloGeo.translate(0, 1.89, 0);
    const buoyWaterGlowGeo = new THREE.PlaneGeometry(7.2, 7.2);
    buoyWaterGlowGeo.rotateX(-Math.PI / 2);

    const buoyLampMat = new THREE.MeshBasicMaterial({ color: 0xffffff, fog: false });
    const buoyHaloMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.7,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      fog: false
    });
    const buoyWaterGlowMat = new THREE.MeshBasicMaterial({
      map: radialGlowTex,
      color: 0xffffff,
      transparent: true,
      opacity: 0.62,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      fog: false,
      side: THREE.DoubleSide
    });
    const buoySpots = [];
    for (let k = 0; k < 8; k++) {
      const p = polar(22.5 + k * 45, 74);
      buoySpots.push({ x: p.x, z: p.z, ph: k * 0.83 });
    }
    const buoyBodyMesh = makeInstanced(buoyBodyGeo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.55, flatShading: true }), 8, true);
    const buoyLampMesh = makeInstanced(buoyLampGeo, buoyLampMat, 8, true);
    const buoyHaloMesh = makeInstanced(buoyHaloGeo, buoyHaloMat, 8, true);
    buoyHaloMesh.renderOrder = 3;
    const buoyWaterGlowMesh = makeInstanced(buoyWaterGlowGeo, buoyWaterGlowMat, 8, true);
    buoyWaterGlowMesh.renderOrder = 2;

    const BUOY_COLOR_AMBER = new THREE.Color(0xffd147);
    const BUOY_COLOR_TEAL = new THREE.Color(0x2bf5c5);
    const BUOY_DAY_AMBER = new THREE.Color(0xcfa85a);
    const BUOY_DAY_TEAL = new THREE.Color(0x55a89b);
    const tmpBuoyCol = new THREE.Color();

    for (let i = 0; i < 8; i++) {
      buoyLampMesh.setColorAt(i, i % 2 === 0 ? BUOY_DAY_AMBER : BUOY_DAY_TEAL);
      buoyHaloMesh.setColorAt(i, tmpColor.setRGB(0, 0, 0));
      buoyWaterGlowMesh.setColorAt(i, tmpColor.setRGB(0, 0, 0));
    }

    function updateBuoys(t) {
      const showGlow = nightMix > 0.01;
      buoyHaloMesh.visible = showGlow;
      buoyWaterGlowMesh.visible = showGlow;
      for (let i = 0; i < buoySpots.length; i++) {
        const b = buoySpots[i];
        const wy = waveY(b.x, b.z, t);
        const y = wy * 0.9 - 0.05;
        const m = setDummy(b.x, y, b.z, Math.cos(t * 1.5 + b.ph) * 0.09, b.ph, Math.sin(t * 1.8 + b.ph) * 0.13);
        buoyBodyMesh.setMatrixAt(i, m);
        buoyLampMesh.setMatrixAt(i, m);
        buoyHaloMesh.setMatrixAt(i, m);

        const isEven = i % 2 === 0;
        const dayCol = isEven ? BUOY_DAY_AMBER : BUOY_DAY_TEAL;
        const nightCol = isEven ? BUOY_COLOR_AMBER : BUOY_COLOR_TEAL;
        // 輪流交替閃爍暖黃與青綠信號燈
        const wave = 0.5 + 0.5 * Math.sin(t * 2.6 + (isEven ? 0 : Math.PI) + i * 0.25);
        const pulse = 0.16 + 0.84 * Math.pow(wave, 1.7);

        tmpBuoyCol.copy(dayCol).lerp(nightCol, nightMix * (0.45 + 0.55 * pulse));
        buoyLampMesh.setColorAt(i, tmpBuoyCol);

        if (showGlow) {
          const glowStrength = nightMix * pulse;
          tmpColor.copy(nightCol).multiplyScalar(glowStrength);
          buoyHaloMesh.setColorAt(i, tmpColor);
          buoyWaterGlowMesh.setColorAt(i, tmpColor);
          const wgScale = 0.82 + 0.34 * pulse;
          buoyWaterGlowMesh.setMatrixAt(i, setDummy(b.x, wy * 0.55 + 0.15, b.z, 0, 0, 0, wgScale, 1, wgScale));
        }
      }
      buoyBodyMesh.instanceMatrix.needsUpdate = true;
      buoyLampMesh.instanceMatrix.needsUpdate = true;
      if (buoyLampMesh.instanceColor) buoyLampMesh.instanceColor.needsUpdate = true;
      if (showGlow) {
        buoyHaloMesh.instanceMatrix.needsUpdate = true;
        buoyWaterGlowMesh.instanceMatrix.needsUpdate = true;
        if (buoyHaloMesh.instanceColor) buoyHaloMesh.instanceColor.needsUpdate = true;
        if (buoyWaterGlowMesh.instanceColor) buoyWaterGlowMesh.instanceColor.needsUpdate = true;
      }
    }

    /* ============================================================
     * 第 3 層：海洋生態圈（水下魚群剪影、躍水海豚）
     * ============================================================ */
    // 3a. 5 組半透明深藍魚群剪影（主島之間內側淺水域，避開吊橋與碼頭）
    const fishShape = new THREE.Shape();
    fishShape.moveTo(0, 0.6);
    fishShape.quadraticCurveTo(0.27, 0.15, 0.05, -0.36);
    fishShape.lineTo(0.3, -0.72);
    fishShape.lineTo(0, -0.56);
    fishShape.lineTo(-0.3, -0.72);
    fishShape.lineTo(-0.05, -0.36);
    fishShape.quadraticCurveTo(-0.27, 0.15, 0, 0.6);
    const fishGeo = new THREE.ShapeGeometry(fishShape, 4);
    fishGeo.rotateX(Math.PI / 2); // 魚頭朝 +Z、平貼海面
    const fishMat = new THREE.MeshBasicMaterial({
      color: 0x0b3b6b,
      transparent: true,
      opacity: 0.5,
      depthWrite: false,
      side: THREE.DoubleSide
    });
    const fishSchools = [];
    const gapIdx = [0, 1, 3, 4, 6];
    gapIdx.forEach((k, si) => {
      const gapDeg = (k / 7) * 360 - 90 + 360 / 14;
      const c = polar(gapDeg, 39.2);
      fishSchools.push({ cx: c.x, cz: c.z, R: 2.4, omega: si % 2 === 0 ? 0.42 : -0.38, phase: si * 1.3 });
    });
    const FISH_PER_SCHOOL = 7;
    const fishList = [];
    fishSchools.forEach((sc, si) => {
      for (let f = 0; f < FISH_PER_SCHOOL; f++) {
        fishList.push({ school: sc, da: f * 0.16 + rr(-0.05, 0.05), dr: rr(-0.5, 0.5), s: rr(0.75, 1.15), wig: rr(0, TAU), si });
      }
    });
    const fishMesh = makeInstanced(fishGeo, fishMat, fishList.length, true);
    fishMesh.renderOrder = 2;

    function updateFish(t) {
      for (let i = 0; i < fishList.length; i++) {
        const f = fishList[i];
        const sc = f.school;
        const sign = sc.omega > 0 ? 1 : -1;
        const th = sc.omega * t + sc.phase - sign * f.da;
        const r = sc.R + f.dr;
        const x = sc.cx + Math.cos(th) * r;
        const z = sc.cz + Math.sin(th) * r;
        const dx = -Math.sin(th) * sign;
        const dz = Math.cos(th) * sign;
        const yaw = Math.atan2(dx, dz) + Math.sin(t * 7 + f.wig) * 0.16;
        fishMesh.setMatrixAt(i, setDummy(x, waveY(x, z, t) + 0.17, z, 0, yaw, 0, f.s));
      }
      fishMesh.instanceMatrix.needsUpdate = true;
    }

    // 3b. 外海躍水海豚（2 處生態點 × 2 隻，單一 InstancedMesh）
    const dolphinGeo = mergeParts([
      { geo: new THREE.SphereGeometry(1, 10, 8), color: 0x5d7f9e, scale: [0.42, 0.42, 1.25] },
      { geo: new THREE.SphereGeometry(1, 10, 8), color: 0xdbe7f0, pos: [0, -0.14, 0.12], scale: [0.34, 0.3, 1.0] },
      { geo: new THREE.ConeGeometry(0.15, 0.5, 6), color: 0x5d7f9e, pos: [0, -0.06, 1.38], rot: [Math.PI / 2, 0, 0] },
      { geo: new THREE.ConeGeometry(0.24, 0.55, 4), color: 0x4a6a88, pos: [0, 0.5, -0.12], rot: [-0.5, 0, 0], scale: [0.3, 1, 1] },
      { geo: new THREE.BoxGeometry(0.55, 0.05, 0.25), color: 0x4a6a88, pos: [0.38, -0.2, 0.35], rot: [0, 0, -0.4] },
      { geo: new THREE.BoxGeometry(0.55, 0.05, 0.25), color: 0x4a6a88, pos: [-0.38, -0.2, 0.35], rot: [0, 0, 0.4] },
      { geo: new THREE.ConeGeometry(0.24, 0.75, 6), color: 0x5d7f9e, pos: [0, 0, -1.45], rot: [-Math.PI / 2, 0, 0] },
      { geo: new THREE.BoxGeometry(1.05, 0.06, 0.36), color: 0x4a6a88, pos: [0, 0, -1.86] }
    ]);
    const dolphinMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.45, flatShading: true });
    const dolphinSites = [
      { c: polar(-33, 95.5), dirDeg: -33 + 90 + 12, period: 5.2, jumpDur: 1.7, L: 8.2, H: 3.1 },
      { c: polar(-148, 95.5), dirDeg: -148 - 90 - 12, period: 5.9, jumpDur: 1.75, L: 8.6, H: 3.4 }
    ];
    dolphinSites.forEach((s) => {
      s.dx = Math.cos(s.dirDeg * DEG);
      s.dz = Math.sin(s.dirDeg * DEG);
    });
    const dolphins = [];
    dolphinSites.forEach((site, si) => {
      [0, 1].forEach((k) => {
        dolphins.push({ site, lateral: k ? 1.3 : -0.9, timeOffset: si * 1.9 + k * 0.38, along: k ? -0.8 : 0.4, emerged: false, dived: false, s: k ? 0.92 : 1.05 });
      });
    });
    const dolphinMesh = makeInstanced(dolphinGeo, dolphinMat, dolphins.length, true);

    // 水花粒子池 + 水花環池
    const SPLASH_POOL = 72;
    const splashGeo = new THREE.IcosahedronGeometry(0.15, 0);
    const splashMat = new THREE.MeshBasicMaterial({ color: 0xf2fbff });
    const splashMesh = makeInstanced(splashGeo, splashMat, SPLASH_POOL, true);
    const splashParticles = [];
    for (let i = 0; i < SPLASH_POOL; i++) splashParticles.push({ alive: false, x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, age: 0, life: 1, s: 1 });
    const RING_POOL = 8;
    const splashRingMesh = makeInstanced(waveRingGeo, additiveWhiteMat.clone(), RING_POOL, true);
    splashRingMesh.renderOrder = 2;
    const splashRings = [];
    for (let i = 0; i < RING_POOL; i++) {
      splashRings.push({ alive: false, x: 0, z: 0, age: 0, life: 1.4 });
      splashRingMesh.setColorAt(i, tmpColor.setRGB(0, 0, 0));
    }
    let splashCursor = 0;
    let ringCursor = 0;

    function spawnSplash(x, z, power) {
      for (let k = 0; k < 9; k++) {
        const p = splashParticles[splashCursor];
        splashCursor = (splashCursor + 1) % SPLASH_POOL;
        const ang = rand() * TAU;
        const spd = rr(1.2, 2.6) * power;
        p.alive = true;
        p.x = x;
        p.y = 0.25;
        p.z = z;
        p.vx = Math.cos(ang) * spd;
        p.vz = Math.sin(ang) * spd;
        p.vy = rr(3.0, 5.2) * power;
        p.age = 0;
        p.life = rr(0.75, 1.1);
        p.s = rr(0.8, 1.4);
      }
      const r = splashRings[ringCursor];
      ringCursor = (ringCursor + 1) % RING_POOL;
      r.alive = true;
      r.x = x;
      r.z = z;
      r.age = 0;
    }

    function updateDolphins(t, dt) {
      for (let i = 0; i < dolphins.length; i++) {
        const d = dolphins[i];
        const site = d.site;
        const local = (((t + d.timeOffset) % site.period) + site.period) % site.period;
        const p = local / site.jumpDur;
        if (p >= 1) {
          d.emerged = false;
          d.dived = false;
          dolphinMesh.setMatrixAt(i, setDummy(0, -20, 0, 0, 0, 0, 0.0001));
          continue;
        }
        const base = 0.8;
        const h = site.H + base;
        const s = (p - 0.5) * site.L + d.along;
        const nx = -site.dz;
        const nz = site.dx;
        const x = site.c.x + site.dx * s + nx * d.lateral;
        const z = site.c.z + site.dz * s + nz * d.lateral;
        const y = -base + h * 4 * p * (1 - p);
        const dy = h * 4 * (1 - 2 * p);
        const pitch = -Math.atan2(dy, site.L);
        dummy.rotation.order = "YXZ";
        const m = setDummy(x, y, z, pitch, Math.atan2(site.dx, site.dz), 0, d.s);
        dummy.rotation.order = "XYZ";
        dolphinMesh.setMatrixAt(i, m);
        const pCross = 0.5 - 0.5 * Math.sqrt(1 - base / h);
        if (!d.emerged && p >= pCross) {
          d.emerged = true;
          spawnSplash(x, z, 1);
        }
        if (!d.dived && p >= 1 - pCross) {
          d.dived = true;
          spawnSplash(x, z, 0.85);
        }
      }
      dolphinMesh.instanceMatrix.needsUpdate = true;

      for (let i = 0; i < SPLASH_POOL; i++) {
        const sp = splashParticles[i];
        if (!sp.alive) {
          splashMesh.setMatrixAt(i, setDummy(0, -20, 0, 0, 0, 0, 0.0001));
          continue;
        }
        sp.age += dt;
        sp.vy -= 9.8 * dt;
        sp.x += sp.vx * dt;
        sp.y += sp.vy * dt;
        sp.z += sp.vz * dt;
        if (sp.age >= sp.life || sp.y < -0.4) {
          sp.alive = false;
          splashMesh.setMatrixAt(i, setDummy(0, -20, 0, 0, 0, 0, 0.0001));
          continue;
        }
        const k = 1 - sp.age / sp.life;
        splashMesh.setMatrixAt(i, setDummy(sp.x, sp.y, sp.z, sp.age * 4, sp.age * 3, 0, sp.s * (0.35 + 0.65 * k)));
      }
      splashMesh.instanceMatrix.needsUpdate = true;

      for (let i = 0; i < RING_POOL; i++) {
        const r = splashRings[i];
        if (!r.alive) {
          splashRingMesh.setMatrixAt(i, setDummy(0, -20, 0, 0, 0, 0, 0.0001));
          continue;
        }
        r.age += dt;
        const p = r.age / r.life;
        if (p >= 1) {
          r.alive = false;
          splashRingMesh.setMatrixAt(i, setDummy(0, -20, 0, 0, 0, 0, 0.0001));
          splashRingMesh.setColorAt(i, tmpColor.setRGB(0, 0, 0));
          continue;
        }
        const sc = 0.6 + p * 2.8;
        const env = Math.pow(1 - p, 1.4);
        const aD = env * 0.95 * (1 - nightMix);
        const aN = env * 0.62 * nightMix;
        splashRingMesh.setMatrixAt(i, setDummy(r.x, 0.26, r.z, 0, 0, 0, sc, 1, sc));
        splashRingMesh.setColorAt(i, tmpColor.setRGB(aD + aN * 0.2, aD + aN * 0.88, aD + aN * 1.0));
      }
      splashRingMesh.instanceMatrix.needsUpdate = true;
      if (splashRingMesh.instanceColor) splashRingMesh.instanceColor.needsUpdate = true;
    }

    /* ============================================================
     * 第 4 層：天空與地平線包覆（積雲、熱氣球、海鷗、數位紙飛機）
     * ============================================================ */
    // 4a. 14 朵動森風立體積雲（84 顆低多邊形雲朵 → 單一 InstancedMesh），沿 +X 風向循環飄移
    const cloudPuffGeo = new THREE.DodecahedronGeometry(1, 0);
    const skyCloudMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0xd8eeff,
      emissiveIntensity: 0.2,
      roughness: 0.88,
      flatShading: true
    });
    const PUFFS = [
      [0, 0.42, 0, 1.55, 1.08, 1.2],
      [-1.5, 0.05, 0.2, 1.18, 0.86, 1.0],
      [1.55, 0.1, -0.12, 1.26, 0.9, 1.05],
      [-0.6, 0.8, -0.35, 1.02, 0.86, 0.92],
      [0.72, 0.7, 0.4, 1.06, 0.82, 0.95],
      [2.65, -0.12, 0.15, 0.78, 0.62, 0.72]
    ];
    const puffLocal = PUFFS.map((p, idx) => {
      const m = new THREE.Matrix4();
      dummy.position.set(p[0], p[1], p[2]);
      dummy.rotation.set(idx * 0.4, idx * 0.7, idx * 0.3);
      dummy.scale.set(p[3], p[4], p[5]);
      dummy.updateMatrix();
      m.copy(dummy.matrix);
      return m;
    });
    const CLOUD_SPECS = [
      { x0: -110, z: -56, y: 17.8 },
      { x0: -52, z: -42, y: 19.6 },
      { x0: 8, z: -32, y: 21.2 },
      { x0: 64, z: -46, y: 18.8 },
      { x0: 120, z: -60, y: 17.5 },
      { x0: -140, z: -20, y: 22.5 },
      { x0: -78, z: -16, y: 24.2 },
      { x0: 76, z: -14, y: 23.6 },
      { x0: 140, z: -24, y: 21.8 },
      { x0: -115, z: -92, y: 26.2 },
      { x0: 18, z: -110, y: 28.4 },
      { x0: 124, z: -96, y: 25.4 },
      { x0: -68, z: 108, y: 24.8 },
      { x0: 72, z: 126, y: 27.2 }
    ];
    const CLOUD_X_MIN = -180;
    const CLOUD_SPAN = 360;
    const clouds = CLOUD_SPECS.map((sp) => ({
      x0: sp.x0,
      z: sp.z,
      y: sp.y,
      scale: rr(1.7, 2.8),
      speed: rr(0.55, 1.05),
      yaw: rr(-0.4, 0.4),
      flip: rand() > 0.5 ? -1 : 1,
      bobPh: rand() * TAU
    }));
    const cloudMesh = makeInstanced(cloudPuffGeo, skyCloudMat, clouds.length * PUFFS.length, true);

    function updateClouds(t) {
      let idx = 0;
      for (let i = 0; i < clouds.length; i++) {
        const c = clouds[i];
        const raw = c.x0 + c.speed * t - CLOUD_X_MIN;
        const x = (((raw % CLOUD_SPAN) + CLOUD_SPAN) % CLOUD_SPAN) + CLOUD_X_MIN;
        const edge = Math.min(x - CLOUD_X_MIN, CLOUD_X_MIN + CLOUD_SPAN - x);
        const e = Math.min(1, Math.max(0, edge / 30));
        const fade = e * e * (3 - 2 * e); // smoothstep：邊界處縮小隱沒，另一側平滑長出
        const s = c.scale * Math.max(0.0001, fade);
        dummy.position.set(x, c.y + Math.sin(t * 0.25 + c.bobPh) * 0.5, c.z);
        // 以旋轉 180° 取代負縮放鏡像（InstancedMesh 不會依實例行列式翻轉面向）
        dummy.rotation.set(0, c.yaw + (c.flip < 0 ? Math.PI : 0), 0);
        dummy.scale.set(s, s, s);
        dummy.updateMatrix();
        for (let k = 0; k < puffLocal.length; k++) {
          tmpM.multiplyMatrices(dummy.matrix, puffLocal[k]);
          cloudMesh.setMatrixAt(idx++, tmpM);
        }
      }
      cloudMesh.instanceMatrix.needsUpdate = true;
    }

    // 4b. 2 顆彩色拼布熱氣球 + 藤編吊籃（夜晚內部燃燒器火光透射成彩色天燈 ＋ 吊籃暖黃提燈與向下淡光錐）
    function buildBalloonParts() {
      const profile = [
        [0.05, 0], [0.55, 0.15], [1.2, 0.7], [1.85, 1.6], [2.2, 2.7],
        [2.25, 3.6], [2.0, 4.5], [1.4, 5.2], [0.6, 5.55], [0.02, 5.65]
      ].map((p) => new THREE.Vector2(p[0], p[1]));
      const lathe = new THREE.LatheGeometry(profile, 12);
      const env = lathe.index ? lathe.toNonIndexed() : lathe;
      env.computeVertexNormals();
      const palette = [0xff595e, 0xffca3a, 0x8ac926, 0x1982c4, 0x6a4c93, 0xff924c].map((h) => new THREE.Color(h));
      const pa = env.attributes.position;
      const ua = env.attributes.uv;
      const colors = new Float32Array(pa.count * 3);

      // 同步繪製拼布熱氣球夜光透射貼圖（底部開口燃燒處最亮暖橘，向上透出各色布面光澤）
      const emCv = document.createElement("canvas");
      emCv.width = 128;
      emCv.height = 128;
      const emCtx = emCv.getContext("2d");
      const warmFire = new THREE.Color(0xff9b3d);
      const patchCol = new THREE.Color();

      for (let i = 0; i < pa.count; i += 3) {
        const cx = (pa.getX(i) + pa.getX(i + 1) + pa.getX(i + 2)) / 3;
        const cy = (pa.getY(i) + pa.getY(i + 1) + pa.getY(i + 2)) / 3;
        const cz = (pa.getZ(i) + pa.getZ(i + 1) + pa.getZ(i + 2)) / 3;
        const seg = Math.floor((((Math.atan2(cx, cz) + TAU) % TAU) / TAU) * 12) % 12;
        const band = Math.floor(cy / 1.45);
        const col = palette[(seg + band * 2) % palette.length];
        for (let k = 0; k < 3; k++) {
          colors[(i + k) * 3] = col.r;
          colors[(i + k) * 3 + 1] = col.g;
          colors[(i + k) * 3 + 2] = col.b;
        }
        if (ua) {
          const uMin = Math.min(ua.getX(i), ua.getX(i + 1), ua.getX(i + 2));
          const uMax = Math.max(ua.getX(i), ua.getX(i + 1), ua.getX(i + 2));
          const vMin = Math.min(ua.getY(i), ua.getY(i + 1), ua.getY(i + 2));
          const vMax = Math.max(ua.getY(i), ua.getY(i + 1), ua.getY(i + 2));
          const vMid = (vMin + vMax) * 0.5;
          const fireMix = Math.max(0.28, 1.0 - vMid * 0.78);
          patchCol.copy(col).lerp(warmFire, fireMix * 0.55).multiplyScalar(0.5 + 0.65 * fireMix);
          emCtx.fillStyle = `rgb(${Math.min(255, Math.round(patchCol.r * 255))},${Math.min(255, Math.round(patchCol.g * 255))},${Math.min(255, Math.round(patchCol.b * 255))})`;
          const x0 = Math.floor(uMin * 128);
          const x1 = Math.ceil(uMax * 128);
          const y0 = Math.floor((1 - vMax) * 128);
          const y1 = Math.ceil((1 - vMin) * 128);
          emCtx.fillRect(x0, y0, Math.max(1, x1 - x0), Math.max(1, y1 - y0));
        }
      }
      env.setAttribute("color", new THREE.BufferAttribute(colors, 3));
      const emissiveMap = new THREE.CanvasTexture(emCv);
      emissiveMap.minFilter = THREE.LinearFilter;
      emissiveMap.magFilter = THREE.LinearFilter;

      const envGeo = mergeParts([{ geo: env, keepColors: true, pos: [0, 1.7, 0] }]);
      const basketParts = [
        { geo: new THREE.CylinderGeometry(0.58, 0.46, 0.62, 8), color: 0xa0703f },
        { geo: new THREE.CylinderGeometry(0.64, 0.64, 0.1, 8), color: 0x6b4423, pos: [0, 0.33, 0] },
        { geo: new THREE.CylinderGeometry(0.47, 0.47, 0.08, 8), color: 0x6b4423, pos: [0, -0.3, 0] },
        { geo: new THREE.CylinderGeometry(0.16, 0.2, 0.28, 6), color: 0x4b5563, pos: [0, 1.25, 0] },
        // 吊籃外側提燈小支架與燈帽
        { geo: new THREE.BoxGeometry(0.24, 0.035, 0.035), color: 0x5c3a21, pos: [0.58, 0.26, 0.18] },
        { geo: new THREE.ConeGeometry(0.13, 0.09, 6), color: 0x3b2a1e, pos: [0.68, 0.19, 0.18] }
      ];
      [[1, 1], [1, -1], [-1, 1], [-1, -1]].forEach(([sx, sz]) => {
        basketParts.push({ geo: new THREE.CylinderGeometry(0.022, 0.022, 1.45, 4), color: 0x8b6b4a, pos: [sx * 0.42, 1.05, sz * 0.42], rot: [-sz * 0.05, 0, sx * 0.05] });
      });
      return { envGeo, basketGeo: mergeParts(basketParts), emissiveMap };
    }

    const balloonParts = buildBalloonParts();
    const balloonEnvMat = new THREE.MeshStandardMaterial({
      vertexColors: true,
      emissive: 0xffc078,
      emissiveMap: balloonParts.emissiveMap,
      emissiveIntensity: 0,
      roughness: 0.6,
      flatShading: true
    });
    const balloonBasketMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.72, flatShading: true });
    const balloons = [
      { radius: 95, y: 12.2, omega: 0.014, phase: -140 * DEG, s: 1.28, bobPh: 0 },
      { radius: 97, y: 13.0, omega: -0.011, phase: -40 * DEG, s: 1.2, bobPh: 2.1 }
    ];
    const balloonEnvMesh = makeInstanced(balloonParts.envGeo, balloonEnvMat, balloons.length, true);
    const balloonBasketMesh = makeInstanced(balloonParts.basketGeo, balloonBasketMat, balloons.length, true);
    balloonEnvMesh.setColorAt(0, tmpColor.setRGB(1, 1, 1));
    balloonEnvMesh.setColorAt(1, tmpColor.setRGB(0.92, 1, 1));
    if (balloonEnvMesh.instanceColor) balloonEnvMesh.instanceColor.needsUpdate = true;
    balloonBasketMesh.setColorAt(0, tmpColor.setRGB(1, 1, 1));
    balloonBasketMesh.setColorAt(1, tmpColor.setRGB(1, 1, 1));
    if (balloonBasketMesh.instanceColor) balloonBasketMesh.instanceColor.needsUpdate = true;

    // 熱氣球燃燒器火球、內透光暈與吊籃小提燈光錐（白天自動隱藏，夜晚平滑亮起）
    const burnerFlameGeo = new THREE.OctahedronGeometry(0.24, 1);
    const lanternBulbGeo = new THREE.SphereGeometry(0.11, 8, 6);
    const lanternConeGeo = buildSoftConeGeometry(0.08, 1.55, 3.8, 14, 0xffe48a, 0x000000);
    const balloonLanternMat = new THREE.MeshStandardMaterial({
      color: 0xffe8a3,
      emissive: 0xffb703,
      emissiveIntensity: 0.15,
      roughness: 0.25
    });
    const balloonRigs = balloons.map((b) => {
      const rig = new THREE.Group();
      root.add(rig);

      const flameMat = new THREE.MeshBasicMaterial({ color: 0xff6b1a, transparent: true, opacity: 0, fog: false });
      const flame = new THREE.Mesh(burnerFlameGeo, flameMat);
      flame.position.set(0, 1.5, 0);
      flame.scale.set(0.95, 1.4, 0.95);
      flame.visible = false;
      rig.add(flame);

      const burnerGlow = makeGlowSprite(0xff7722, 3.1);
      burnerGlow.sprite.position.set(0, 1.52, 0);
      rig.add(burnerGlow.sprite);

      const throatGlow = makeGlowSprite(0xff9f43, 4.5);
      throatGlow.sprite.position.set(0, 2.6, 0);
      rig.add(throatGlow.sprite);

      const lanternBulb = new THREE.Mesh(lanternBulbGeo, balloonLanternMat);
      lanternBulb.position.set(0.68, 0.08, 0.18);
      rig.add(lanternBulb);

      const lanternGlow = makeGlowSprite(0xffd452, 1.9);
      lanternGlow.sprite.position.set(0.68, 0.08, 0.18);
      rig.add(lanternGlow.sprite);

      const coneMat = new THREE.MeshBasicMaterial({
        vertexColors: true,
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide,
        fog: false
      });
      const cone = new THREE.Mesh(lanternConeGeo, coneMat);
      cone.position.set(0.68, -1.88, 0.18);
      cone.renderOrder = 3;
      cone.visible = false;
      rig.add(cone);

      return { rig, flame, flameMat, burnerGlow, throatGlow, lanternGlow, cone, coneMat, bobPh: b.bobPh };
    });

    function updateBalloons(t) {
      let avgFlicker = 0;
      const showNight = nightMix > 0.01;
      for (let i = 0; i < balloons.length; i++) {
        const b = balloons[i];
        const a = b.omega * t + b.phase;
        const x = Math.cos(a) * b.radius;
        const z = Math.sin(a) * b.radius;
        const y = b.y + Math.sin(t * 0.45 + b.bobPh) * 1.1;
        const rx = Math.sin(t * 0.6 + b.bobPh) * 0.03;
        const ry = t * 0.05 + b.phase;
        const rz = Math.cos(t * 0.5 + b.bobPh) * 0.03;
        const m = setDummy(x, y, z, rx, ry, rz, b.s);
        balloonEnvMesh.setMatrixAt(i, m);
        balloonBasketMesh.setMatrixAt(i, m);

        const r = balloonRigs[i];
        r.rig.position.set(x, y, z);
        r.rig.rotation.set(rx, ry, rz);
        r.rig.scale.setScalar(b.s);

        const flicker = 0.5 + 0.35 * Math.sin(t * 14.5 + b.bobPh) + 0.15 * Math.sin(t * 23.0 + b.bobPh * 1.7);
        avgFlicker += flicker;

        r.flame.visible = showNight;
        r.burnerGlow.sprite.visible = showNight;
        r.throatGlow.sprite.visible = showNight;
        r.lanternGlow.sprite.visible = showNight;
        r.cone.visible = showNight;

        if (showNight) {
          const fScale = 0.85 + flicker * 0.32;
          r.flame.scale.set(0.95 * fScale, 1.45 * (0.88 + flicker * 0.38), 0.95 * fScale);
          r.flameMat.opacity = 0.92 * nightMix;
          r.burnerGlow.mat.opacity = (0.55 + flicker * 0.32) * nightMix;
          r.throatGlow.mat.opacity = (0.34 + flicker * 0.16) * nightMix;
          r.lanternGlow.mat.opacity = (0.62 + 0.14 * Math.sin(t * 3.8 + b.bobPh)) * nightMix;
          r.coneMat.opacity = (0.21 + 0.03 * Math.sin(t * 3.8 + b.bobPh)) * nightMix;
        }
      }
      balloonEnvMat.emissiveIntensity = nightMix * (0.95 + (avgFlicker / balloons.length) * 0.25);
      balloonEnvMesh.instanceMatrix.needsUpdate = true;
      balloonBasketMesh.instanceMatrix.needsUpdate = true;
    }

    // 4c. 6 隻展翅盤旋白色海鷗（燈塔島上空 3 隻 + 海蝕拱門上空 3 隻）
    const gullBodyGeo = mergeParts([
      { geo: new THREE.ConeGeometry(0.18, 0.78, 5), color: 0xffffff, rot: [Math.PI / 2, 0, 0] },
      { geo: new THREE.DodecahedronGeometry(0.14, 0), color: 0xffffff, pos: [0, 0.08, 0.34] },
      { geo: new THREE.ConeGeometry(0.055, 0.22, 4), color: 0xffb703, pos: [0, 0.06, 0.5], rot: [Math.PI / 2, 0, 0] },
      { geo: new THREE.ConeGeometry(0.16, 0.32, 3), color: 0x334155, pos: [0, 0.02, -0.44], rot: [-Math.PI / 2, 0, 0], scale: [1.2, 1, 0.35] }
    ]);
    const makeWingGeo = (side) => mergeParts([
      { geo: new THREE.BoxGeometry(0.58, 0.04, 0.26), color: 0xffffff, pos: [side * 0.29, 0, 0] },
      { geo: new THREE.BoxGeometry(0.36, 0.035, 0.2), color: 0x334155, pos: [side * 0.74, -0.02, -0.03], rot: [0, 0, side * -0.14] }
    ]);
    const gullMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.5, flatShading: true });
    const lighthouseRec = npcIslandRecords.find((r) => r.id === "lighthouse");
    const lighthousePos = lighthouseRec ? lighthouseRec.group.position.clone() : polar(242, 64);
    const archCenter = arches[0].center;
    const gulls = [
      { c: lighthousePos, rx: 5.0, rz: 4.2, y: 9.2, omega: 0.55, ph: 0.0, s: 1.25 },
      { c: lighthousePos, rx: 6.6, rz: 5.8, y: 10.6, omega: -0.47, ph: 2.1, s: 1.15 },
      { c: lighthousePos, rx: 8.0, rz: 7.0, y: 12.0, omega: 0.4, ph: 4.0, s: 1.2 },
      { c: archCenter, rx: 7.0, rz: 6.0, y: 10.6, omega: 0.45, ph: 0.9, s: 1.4 },
      { c: archCenter, rx: 9.0, rz: 7.6, y: 11.7, omega: -0.38, ph: 3.0, s: 1.3 },
      { c: archCenter, rx: 10.5, rz: 9.0, y: 12.8, omega: 0.34, ph: 5.1, s: 1.35 }
    ];
    gulls.forEach((g, i) => {
      g.flapSpeed = 8.6 + (i % 3) * 0.7;
    });
    const gullBodyMesh = makeInstanced(gullBodyGeo, gullMat, gulls.length, true);
    const gullLeftMesh = makeInstanced(makeWingGeo(-1), gullMat, gulls.length, true);
    const gullRightMesh = makeInstanced(makeWingGeo(1), gullMat, gulls.length, true);
    const wingPivotL = new THREE.Matrix4().makeTranslation(-0.1, 0.06, 0.04);
    const wingPivotR = new THREE.Matrix4().makeTranslation(0.1, 0.06, 0.04);
    const wingRot = new THREE.Matrix4();

    function updateGulls(t) {
      for (let i = 0; i < gulls.length; i++) {
        const g = gulls[i];
        const th = g.omega * t + g.ph;
        const sign = g.omega > 0 ? 1 : -1;
        const x = g.c.x + Math.cos(th) * g.rx;
        const z = g.c.z + Math.sin(th) * g.rz;
        const y = g.y + Math.sin(t * 0.8 + g.ph) * 0.6;
        const vx = -Math.sin(th) * g.rx * sign;
        const vz = Math.cos(th) * g.rz * sign;
        dummy.rotation.order = "YXZ";
        setDummy(x, y, z, 0, Math.atan2(vx, vz), -sign * 0.32, g.s);
        dummy.rotation.order = "XYZ";
        tmpM2.copy(dummy.matrix);
        gullBodyMesh.setMatrixAt(i, tmpM2);
        const amp = 0.22 + 0.38 * (0.5 + 0.5 * Math.sin(t * 0.7 + g.ph)); // 拍翅與滑翔交替
        const flap = Math.sin(t * g.flapSpeed + g.ph) * amp;
        wingRot.makeRotationZ(-flap);
        tmpM.multiplyMatrices(tmpM2, wingPivotL).multiply(wingRot);
        gullLeftMesh.setMatrixAt(i, tmpM);
        wingRot.makeRotationZ(flap);
        tmpM.multiplyMatrices(tmpM2, wingPivotR).multiply(wingRot);
        gullRightMesh.setMatrixAt(i, tmpM);
      }
      gullBodyMesh.instanceMatrix.needsUpdate = true;
      gullLeftMesh.instanceMatrix.needsUpdate = true;
      gullRightMesh.instanceMatrix.needsUpdate = true;
    }

    // 4d. 2 架青藍微光「數位紙飛機」（AI 智慧島 ↔ 資料海灣島高空弧線來回滑翔）+ 微光拖尾
    function buildPaperPlaneGeometry() {
      const N = [0, 0, 1.0];
      const LW = [-0.78, 0.09, -0.62];
      const RW = [0.78, 0.09, -0.62];
      const CB = [0, 0, -0.62];
      const K = [0, -0.24, -0.5];
      const tris = [N, CB, LW, N, RW, CB, N, K, CB];
      const pos = [];
      tris.forEach((v) => pos.push(v[0], v[1], v[2]));
      const g = new THREE.BufferGeometry();
      g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
      g.computeVertexNormals();
      return g;
    }
    const planeMat = new THREE.MeshStandardMaterial({
      color: 0xe6fdff,
      emissive: 0x22d3ee,
      emissiveIntensity: 0.6,
      roughness: 0.35,
      side: THREE.DoubleSide,
      flatShading: true
    });
    const aiRec = islandRecords.find((r) => r.id === "ai");
    const dataRec = islandRecords.find((r) => r.id === "data");
    const pA = aiRec ? aiRec.group.position.clone() : polar(218.6, 49);
    const pB = dataRec ? dataRec.group.position.clone() : polar(167.1, 49);
    pA.y = 0;
    pB.y = 0;
    const planeMid = pA.clone().add(pB).multiplyScalar(0.5);
    const planeAxis = pB.clone().sub(pA);
    const halfLen = planeAxis.length() * 0.5 + 3;
    planeAxis.normalize();
    const planeNormal = new THREE.Vector3(-planeAxis.z, 0, planeAxis.x);
    const planes = [
      { phase: 0, b: 6.5, y: 20.0, omega: 0.22, s: 1.5 },
      { phase: Math.PI, b: 4.2, y: 22.4, omega: 0.22, s: 1.35 }
    ];
    const planeMesh = makeInstanced(buildPaperPlaneGeometry(), planeMat, planes.length, true);
    const TRAIL_N = 7;
    const trailGeo = new THREE.OctahedronGeometry(0.16, 0);
    const trailMat = new THREE.MeshBasicMaterial({
      color: 0x7ff0ff,
      transparent: true,
      opacity: 0.35,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      fog: false
    });
    const trailMesh = makeInstanced(trailGeo, trailMat, planes.length * TRAIL_N, true);
    trailMesh.renderOrder = 3;

    function planePos(pl, time, out) {
      const phi = pl.omega * time + pl.phase;
      out.copy(planeMid)
        .addScaledVector(planeAxis, Math.cos(phi) * halfLen)
        .addScaledVector(planeNormal, Math.sin(phi) * pl.b);
      out.y = pl.y + Math.sin(phi * 2) * 1.8;
      return out;
    }

    function updatePlanes(t) {
      for (let i = 0; i < planes.length; i++) {
        const pl = planes[i];
        planePos(pl, t, tmpV);
        planePos(pl, t + 0.05, tmpV2);
        const vx = tmpV2.x - tmpV.x;
        const vy = tmpV2.y - tmpV.y;
        const vz = tmpV2.z - tmpV.z;
        const yaw = Math.atan2(vx, vz);
        const pitch = -Math.atan2(vy, Math.hypot(vx, vz)) * 0.8;
        const phi = pl.omega * t + pl.phase;
        const bank = -Math.sign(pl.b) * (0.18 + 0.4 * Math.pow(Math.cos(phi), 2));
        dummy.rotation.order = "YXZ";
        planeMesh.setMatrixAt(i, setDummy(tmpV.x, tmpV.y, tmpV.z, pitch, yaw, bank, pl.s));
        dummy.rotation.order = "XYZ";
        for (let k = 0; k < TRAIL_N; k++) {
          planePos(pl, t - (k + 1) * 0.09, tmpV2);
          const sc = (1 - k / TRAIL_N) * 1.1;
          trailMesh.setMatrixAt(i * TRAIL_N + k, setDummy(tmpV2.x, tmpV2.y, tmpV2.z, 0, t * 2 + k, 0, sc));
        }
      }
      planeMesh.instanceMatrix.needsUpdate = true;
      trailMesh.instanceMatrix.needsUpdate = true;
    }

    /* ============================================================
     * 日夜主題切換（全部以 emissive / 透明度／Radial Glow 貼圖實現，零 PointLight）
     * ============================================================ */
    const COL_DAY_WHITE = new THREE.Color(0xffffff);
    const COL_DAY_CLOUD_EM = new THREE.Color(0xd8eeff);
    const COL_NIGHT_CLOUD = new THREE.Color(0x8ca8d6);
    const COL_NIGHT_CLOUD_EM = new THREE.Color(0x1e3566);
    const COL_DAY_FISH = new THREE.Color(0x0b3b6b);
    const COL_NIGHT_FISH = new THREE.Color(0x04203f);
    const COL_DAY_SPLASH = new THREE.Color(0xf2fbff);
    const COL_NIGHT_SPLASH = new THREE.Color(0xb8d4f0);
    const COL_DUCK_NIGHT_WAKE = new THREE.Color(0xffe07d);
    const COL_DATA_NIGHT_WAKE = new THREE.Color(0x67e8f9);
    const COL_SAIL_NIGHT_WAKE = new THREE.Color(0xb8e2ff);

    function applyNightMix(m, t) {
      haloMat.opacity = 0.26 - 0.14 * m;
      waveBrightness = 0.5 - 0.32 * m;

      sailWakeMat.color.copy(COL_DAY_WHITE).lerp(COL_SAIL_NIGHT_WAKE, m);
      sailWakeMat.opacity = 0.85 - 0.36 * m;
      dataWakeMat.color.copy(COL_DAY_WHITE).lerp(COL_DATA_NIGHT_WAKE, m);
      dataWakeMat.opacity = 0.85 - 0.28 * m;
      duckWakeMat.color.copy(COL_DAY_WHITE).lerp(COL_DUCK_NIGHT_WAKE, m);
      duckWakeMat.opacity = 0.85 - 0.22 * m;

      sailWarmLampMat.emissiveIntensity = 0.18 + 2.1 * m;
      sailPortMat.emissiveIntensity = 0.12 + 1.8 * m;
      sailStarboardMat.emissiveIntensity = 0.12 + 1.8 * m;
      balloonLanternMat.emissiveIntensity = 0.15 + 2.2 * m;

      const techPulse = 0.5 + 0.5 * Math.sin((t || 0) * 3.0);
      dataGlowMat.emissiveIntensity = 0.85 + (2.05 + techPulse * 0.35) * m;
      duckGoldMat.emissiveIntensity = 0.22 + (1.75 + 0.25 * Math.sin((t || 0) * 2.5)) * m;

      planeMat.emissiveIntensity = 0.6 + 1.65 * m;
      trailMat.opacity = 0.35 + 0.5 * m;
      fishMat.color.copy(COL_DAY_FISH).lerp(COL_NIGHT_FISH, m);
      fishMat.opacity = 0.5 - 0.12 * m;
      skyCloudMat.color.copy(COL_DAY_WHITE).lerp(COL_NIGHT_CLOUD, m);
      skyCloudMat.emissive.copy(COL_DAY_CLOUD_EM).lerp(COL_NIGHT_CLOUD_EM, m);
      splashMat.color.copy(COL_DAY_SPLASH).lerp(COL_NIGHT_SPLASH, m);
    }

    function setNight(n) {
      night = !!n;
      if (lastT === null) {
        nightMix = night ? 1 : 0;
        applyNightMix(nightMix, 0);
      }
    }

    let lastT = null;
    function update(t) {
      const dt = lastT === null ? 0.016 : Math.min(0.1, Math.max(0, t - lastT));
      lastT = t;
      const targetNight = night ? 1 : 0;
      if (Math.abs(targetNight - nightMix) > 0.002) {
        nightMix += (targetNight - nightMix) * Math.min(1, dt * 5.5);
      } else {
        nightMix = targetNight;
      }
      applyNightMix(nightMix, t);
      updateWaveRings(t);
      updateCruisers(t);
      updateBuoys(t);
      updateFish(t);
      updateDolphins(t, dt);
      updateClouds(t);
      updateBalloons(t);
      updateGulls(t);
      updatePlanes(t);
    }

    setNight(night);
    update(0);

    return {
      root,
      update,
      setNight,
      snapNight: (n) => {
        night = !!n;
        nightMix = night ? 1 : 0;
        applyNightMix(nightMix, lastT || 0);
        updateWaveRings(lastT || 0);
        updateCruisers(lastT || 0);
        updateBuoys(lastT || 0);
        updateBalloons(lastT || 0);
      }
    };
  }

  window.createOceanEnvironment = createOceanEnvironment;
})();
