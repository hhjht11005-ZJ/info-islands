/* ==========================================================================
 * RPG 角色紙娃娃換裝 ＋ 裝備圖鑑 ＋ NPC 探索星幣系統
 * --------------------------------------------------------------------------
 * - 所有換裝、解鎖與星幣進度僅儲存於 localStorage（每位學生獨立一把 key）
 * - 三階兌換券由既有測驗紀錄（Store.events）即時追溯計算，不另外存檔
 * - 分層 SVG 渲染器：背景 → 光環 → 坐騎 → 斗篷 → 髮後 → 腿/褲 → 上衣 → 手臂
 *   → 外套 → 頭/臉 → 髮前 → 頭飾 → 臉飾 → 武器 → 寵物 → 光環前景
 * - 提示訊息一律使用頁面內 Toast（不使用 alert / confirm / prompt）
 * ========================================================================== */
(() => {
  const OL = "#4a3426";          // 線稿描邊色
  const SKIN = "#ffe3cc";
  const COIN_PER_QUESTION = 25;
  const PASS_SCORE = 60;
  let SEQ = 0;

  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]));

  /* ------------------------------------------------------------------
   * 一、SVG 小工具
   * ------------------------------------------------------------------ */
  function starPath(cx, cy, R, r, n = 5) {
    let d = "";
    for (let i = 0; i < n * 2; i++) {
      const rad = i % 2 ? r : R;
      const a = (Math.PI / n) * i - Math.PI / 2;
      d += (i ? "L" : "M") + (cx + rad * Math.cos(a)).toFixed(1) + " " + (cy + rad * Math.sin(a)).toFixed(1);
    }
    return d + "Z";
  }
  function sparkle(x, y, s, color, op = 1) {
    return `<path d="M${x} ${y - s} Q${x} ${y} ${x + s} ${y} Q${x} ${y} ${x} ${y + s} Q${x} ${y} ${x - s} ${y} Q${x} ${y} ${x} ${y - s}Z" fill="${color}" opacity="${op}"/>`;
  }
  function pixelArt(rows, size, ox, oy, pal) {
    let s = "";
    rows.forEach((row, y) => {
      [...row].forEach((ch, x) => {
        if (pal[ch]) s += `<rect x="${(ox + x * size).toFixed(1)}" y="${(oy + y * size).toFixed(1)}" width="${(size + 0.35).toFixed(2)}" height="${(size + 0.35).toFixed(2)}" fill="${pal[ch]}"/>`;
      });
    });
    return s;
  }
  function note(x, y, color, rot = 0) {
    return `<g transform="translate(${x} ${y}) rotate(${rot})"><ellipse cx="0" cy="6" rx="4.6" ry="3.4" fill="${color}" transform="rotate(-22 0 6)"/><path d="M4 5 V-9 Q11 -7 12 -1" fill="none" stroke="${color}" stroke-width="2.2" stroke-linecap="round"/></g>`;
  }
  const lg = (id, stops, x2 = 0, y2 = 1) => `<linearGradient id="${id}" x1="0" y1="0" x2="${x2}" y2="${y2}">${stops.map(([o, c, op]) => `<stop offset="${o}" stop-color="${c}"${op != null ? ` stop-opacity="${op}"` : ""}/>`).join("")}</linearGradient>`;

  /* ------------------------------------------------------------------
   * 二、免費捏臉：髮型 / 髮色 / 表情
   * ------------------------------------------------------------------ */
  const HAIR_STYLES = [
    { id: "short", name: "俐落短髮" },
    { id: "ponytail", name: "活力高馬尾" },
    { id: "wavy", name: "微捲潮髮" },
    { id: "twintail", name: "雙馬尾挑染髮" }
  ];
  const HAIR_COLORS = [
    { id: "black", name: "星空黑", c: "#2f3150", s: "#1a1b30", hl: "#ff4d8d", shine: "#8f96d8" },
    { id: "brown", name: "焦糖棕", c: "#a8672f", s: "#6e3f17", hl: "#ffd166", shine: "#f0b878" },
    { id: "pink", name: "櫻花粉", c: "#f7a1c4", s: "#d9739f", hl: "#7dd3fc", shine: "#ffe3ef" },
    { id: "blue", name: "電光藍", c: "#3fa9ff", s: "#1c64c8", hl: "#ff79c6", shine: "#c8e8ff" }
  ];
  const FACES = [
    { id: "smile", name: "自信微笑" },
    { id: "cool", name: "酷炫墨鏡臉" },
    { id: "stars", name: "閃亮星星眼" }
  ];
  const DEFAULT_LOOK = { hair: "short", hairColor: "black", face: "smile" };

  const shine = (h, d = "M86 64 Q108 52 136 56") => `<path d="${d}" fill="none" stroke="${h.shine}" stroke-width="4" stroke-linecap="round" opacity=".55"/>`;
  const HAIR = {
    short: {
      back: (h) => `<path d="M60 120 Q52 46 120 41 Q188 46 180 120 Q178 134 168 138 L72 138 Q62 134 60 120Z" fill="${h.s}" stroke="${OL}" stroke-width="2.2"/>`,
      front: (h) => `<path d="M60 114 Q56 48 120 45 Q184 48 180 114 Q176 96 168 88 L160 101 Q152 85 140 82 L132 98 Q124 82 112 82 L100 98 Q94 84 84 86 L78 101 Q70 98 60 114Z" fill="${h.c}" stroke="${OL}" stroke-width="2.2" stroke-linejoin="round"/>
        <path d="M62 108 Q60 128 67 138 L74 112Z" fill="${h.c}" stroke="${OL}" stroke-width="1.8" stroke-linejoin="round"/>
        <path d="M178 108 Q180 128 173 138 L166 112Z" fill="${h.c}" stroke="${OL}" stroke-width="1.8" stroke-linejoin="round"/>${shine(h)}`
    },
    ponytail: {
      back: (h) => `<path d="M62 118 Q56 46 120 42 Q184 46 178 118Z" fill="${h.s}" stroke="${OL}" stroke-width="2.2"/>
        <path d="M148 58 Q198 40 208 94 Q214 134 192 174 Q188 150 184 132 Q178 104 158 78Z" fill="${h.c}" stroke="${OL}" stroke-width="2.2" stroke-linejoin="round"/>
        <path d="M172 70 Q198 104 192 152" fill="none" stroke="${h.s}" stroke-width="2" opacity=".6"/>`,
      front: (h) => `<path d="M60 114 Q56 50 120 45 Q184 50 180 114 Q172 88 150 86 Q130 104 104 96 Q84 92 72 104 Q64 108 60 114Z" fill="${h.c}" stroke="${OL}" stroke-width="2.2" stroke-linejoin="round"/>
        <circle cx="156" cy="56" r="7" fill="#ff6b9d" stroke="${OL}" stroke-width="2"/><circle cx="154" cy="54" r="2" fill="#fff" opacity=".8"/>${shine(h, "M82 66 Q104 54 128 56")}`
    },
    wavy: {
      back: (h) => `<path d="M58 120 Q50 50 120 42 Q190 50 182 120 Q192 140 180 152 Q188 166 170 168 Q160 178 150 164 L90 164 Q80 178 70 168 Q52 166 60 152 Q48 140 58 120Z" fill="${h.s}" stroke="${OL}" stroke-width="2.2" stroke-linejoin="round"/>`,
      front: (h) => `<path d="M60 116 Q54 48 120 44 Q186 48 180 116 Q184 96 168 90 Q164 104 150 96 Q144 108 130 98 Q122 110 110 98 Q100 108 90 96 Q78 104 72 92 Q56 100 60 116Z" fill="${h.c}" stroke="${OL}" stroke-width="2.2" stroke-linejoin="round"/>
        <path d="M62 112 Q56 132 64 146 Q70 138 68 128 Q74 122 70 112Z" fill="${h.c}" stroke="${OL}" stroke-width="1.8"/>
        <path d="M178 112 Q184 132 176 146 Q170 138 172 128 Q166 122 170 112Z" fill="${h.c}" stroke="${OL}" stroke-width="1.8"/>
        <path d="M98 60 q6 -7 13 -1 q-6 3 -3 8" fill="none" stroke="${h.shine}" stroke-width="2.4" stroke-linecap="round" opacity=".7"/>
        <path d="M136 58 q7 -6 13 0 q-6 3 -3 8" fill="none" stroke="${h.shine}" stroke-width="2.4" stroke-linecap="round" opacity=".7"/>`
    },
    twintail: {
      back: (h) => `<path d="M62 116 Q56 48 120 44 Q184 48 178 116Z" fill="${h.s}" stroke="${OL}" stroke-width="2.2"/>
        <path d="M72 70 Q34 70 30 120 Q28 160 44 198 Q50 170 56 150 Q62 120 78 96Z" fill="${h.c}" stroke="${OL}" stroke-width="2.2" stroke-linejoin="round"/>
        <path d="M168 70 Q206 70 210 120 Q212 160 196 198 Q190 170 184 150 Q178 120 162 96Z" fill="${h.c}" stroke="${OL}" stroke-width="2.2" stroke-linejoin="round"/>
        <path d="M52 88 Q38 130 44 182" fill="none" stroke="${h.hl}" stroke-width="5" stroke-linecap="round" opacity=".9"/>
        <path d="M188 88 Q202 130 196 182" fill="none" stroke="${h.hl}" stroke-width="5" stroke-linecap="round" opacity=".9"/>`,
      front: (h) => `<path d="M62 116 Q56 50 120 45 Q184 50 178 116 Q174 92 156 92 L150 101 L142 92 Q128 96 118 92 L110 103 L104 92 Q86 92 70 96 Q62 104 62 116Z" fill="${h.c}" stroke="${OL}" stroke-width="2.2" stroke-linejoin="round"/>
        <path d="M138 50 Q146 72 144 92" fill="none" stroke="${h.hl}" stroke-width="5" stroke-linecap="round"/>
        <circle cx="72" cy="74" r="7" fill="${h.hl}" stroke="${OL}" stroke-width="2"/><circle cx="168" cy="74" r="7" fill="${h.hl}" stroke="${OL}" stroke-width="2"/>${shine(h, "M84 64 Q100 54 118 54")}`
    }
  };

  const eyeSmile = (x) => `<ellipse cx="${x}" cy="116" rx="6.5" ry="8.5" fill="#2d1e2f"/><circle cx="${x + 2}" cy="112.5" r="2.6" fill="#fff"/><circle cx="${x - 1.5}" cy="119.5" r="1.2" fill="#fff"/>`;
  const FACE = {
    smile: (h) => `${eyeSmile(98)}${eyeSmile(142)}
      <path d="M89 102 Q98 97 106 101" fill="none" stroke="${h.s}" stroke-width="2.6" stroke-linecap="round"/>
      <path d="M134 101 Q142 97 151 102" fill="none" stroke="${h.s}" stroke-width="2.6" stroke-linecap="round"/>
      <path d="M110 135 Q121 143 131 133" fill="none" stroke="${OL}" stroke-width="2.6" stroke-linecap="round"/>`,
    cool: (h, c) => `<defs>${lg(`${c.u}-shade`, [[0, "#3a3f5c"], [1, "#0b0c14"]])}</defs>
      <path d="M88 99 L106 103" fill="none" stroke="${h.s}" stroke-width="2.8" stroke-linecap="round"/>
      <path d="M134 103 L152 99" fill="none" stroke="${h.s}" stroke-width="2.8" stroke-linecap="round"/>
      <path d="M76 110 H164" stroke="#111" stroke-width="3"/>
      <rect x="79" y="106" width="36" height="21" rx="9" fill="url(#${c.u}-shade)" stroke="#111" stroke-width="2.5"/>
      <rect x="125" y="106" width="36" height="21" rx="9" fill="url(#${c.u}-shade)" stroke="#111" stroke-width="2.5"/>
      <path d="M86 112 L94 108 M88 120 L102 110" stroke="#fff" stroke-width="2" stroke-linecap="round" opacity=".55"/>
      <path d="M132 112 L140 108 M134 120 L148 110" stroke="#fff" stroke-width="2" stroke-linecap="round" opacity=".55"/>
      <path d="M112 138 Q123 142 133 132" fill="none" stroke="${OL}" stroke-width="2.6" stroke-linecap="round"/>`,
    stars: (h) => `<ellipse cx="98" cy="116" rx="8" ry="9.5" fill="#24305e"/><ellipse cx="142" cy="116" rx="8" ry="9.5" fill="#24305e"/>
      <path d="${starPath(98, 116, 6.2, 2.6)}" fill="#ffe66d"/><path d="${starPath(142, 116, 6.2, 2.6)}" fill="#ffe66d"/>
      <circle cx="101.5" cy="110.5" r="1.6" fill="#fff"/><circle cx="145.5" cy="110.5" r="1.6" fill="#fff"/>
      ${sparkle(82, 104, 4, "#ffd166")}${sparkle(160, 104, 4, "#ffd166")}
      <path d="M89 101 Q98 95 106 100" fill="none" stroke="${h.s}" stroke-width="2.6" stroke-linecap="round"/>
      <path d="M134 100 Q142 95 151 101" fill="none" stroke="${h.s}" stroke-width="2.6" stroke-linecap="round"/>
      <path d="M110 132 Q121 149 132 132Z" fill="#c7354a" stroke="${OL}" stroke-width="2" stroke-linejoin="round"/>
      <path d="M115 139.5 Q121 145 127 139.5 Q121 136.5 115 139.5Z" fill="#ff8fa3"/>`
  };

  /* ------------------------------------------------------------------
   * 三、基礎身體圖層
   * ------------------------------------------------------------------ */
  const TORSO = "M93 156 Q120 149 147 156 L157 214 Q120 222 83 214 Z";
  const legs = () => `<rect x="98" y="206" width="17" height="48" rx="8" fill="${SKIN}" stroke="${OL}" stroke-width="2"/>
    <rect x="125" y="206" width="17" height="48" rx="8" fill="${SKIN}" stroke="${OL}" stroke-width="2"/>
    <rect x="99" y="238" width="15" height="12" fill="#fff"/><rect x="126" y="238" width="15" height="12" fill="#fff"/>`;
  const shoes = () => `<ellipse cx="105" cy="255" rx="13" ry="7.5" fill="#fff" stroke="${OL}" stroke-width="2"/>
    <ellipse cx="135" cy="255" rx="13" ry="7.5" fill="#fff" stroke="${OL}" stroke-width="2"/>
    <path d="M93 257 Q105 262 117 257" fill="none" stroke="#ff7b54" stroke-width="2.6"/><path d="M123 257 Q135 262 147 257" fill="none" stroke="#ff7b54" stroke-width="2.6"/>`;
  const defShorts = () => `<path d="M84 204 L156 204 L158 230 Q140 234 122 230 L120 222 L118 230 Q100 234 82 230 Z" fill="#3d5a80" stroke="${OL}" stroke-width="2.2" stroke-linejoin="round"/>`;
  const neck = () => `<rect x="111" y="144" width="18" height="16" rx="6" fill="#f6cfb2" stroke="${OL}" stroke-width="1.8"/>`;
  const defTop = () => `<path d="${TORSO}" fill="#e8f6ff" stroke="${OL}" stroke-width="2.2" stroke-linejoin="round"/>
    <path d="M106 154 Q120 164 134 154" fill="none" stroke="#7ec8e3" stroke-width="3" stroke-linecap="round"/>
    <path d="${starPath(120, 186, 9, 4)}" fill="#ffd166" stroke="#e0a800" stroke-width="1.2"/>`;
  const headBase = () => `<circle cx="63" cy="113" r="9" fill="${SKIN}" stroke="${OL}" stroke-width="2.2"/><circle cx="177" cy="113" r="9" fill="${SKIN}" stroke="${OL}" stroke-width="2.2"/>
    <ellipse cx="120" cy="104" rx="58" ry="53" fill="${SKIN}" stroke="${OL}" stroke-width="2.4"/>
    <ellipse cx="88" cy="131" rx="8" ry="4.5" fill="#ff9fb0" opacity=".55"/><ellipse cx="152" cy="131" rx="8" ry="4.5" fill="#ff9fb0" opacity=".55"/>`;
  const HAND_R = { x: 164, y: 203 };
  const rightHand = () => `<circle cx="${HAND_R.x}" cy="${HAND_R.y}" r="7.5" fill="${SKIN}" stroke="${OL}" stroke-width="2"/>`;
  function arms(top) {
    const sl = (top && top.sleeve) || { color: "#e8f6ff", long: false, cuff: "#7ec8e3" };
    const P = (d, col, w) => `<path d="${d}" fill="none" stroke="${col}" stroke-width="${w}" stroke-linecap="round"/>`;
    const L = "M95 162 Q82 178 77 200", R = "M145 162 Q158 178 164 200";
    let s = P(L, OL, 17) + P(L, SKIN, 13) + P(R, OL, 17) + P(R, SKIN, 13);
    if (sl.long) {
      s += P(L, OL, 19) + P(L, sl.color, 15) + P(R, OL, 19) + P(R, sl.color, 15);
      if (sl.cuff) s += P("M78.6 194 L77.4 199", sl.cuff, 15) + P("M162.6 194 L163.8 199", sl.cuff, 15);
    } else {
      const Lu = "M95 162 Q88 170 84 180", Ru = "M145 162 Q152 170 156 180";
      s += P(Lu, OL, 19) + P(Lu, sl.color, 15) + P(Ru, OL, 19) + P(Ru, sl.color, 15);
      if (sl.cuff) s += P("M85.5 177 L84 180", sl.cuff, 15) + P("M154.5 177 L156 180", sl.cuff, 15);
    }
    return s + `<circle cx="77" cy="203" r="7.5" fill="${SKIN}" stroke="${OL}" stroke-width="2"/>` + rightHand();
  }
  function defaultBg(c) {
    return `<defs>${lg(`${c.u}-bg`, [[0, "#9fd6ff"], [0.62, "#e3f6ff"], [1, "#fff3d6"]])}</defs>
      <rect width="240" height="300" fill="url(#${c.u}-bg)"/>
      <circle cx="198" cy="46" r="18" fill="#fff6c8" opacity=".9"/>
      <g fill="#fff" opacity=".9"><ellipse cx="46" cy="54" rx="22" ry="8"/><ellipse cx="58" cy="47" rx="13" ry="9"/><ellipse cx="170" cy="96" rx="18" ry="6"/><ellipse cx="180" cy="91" rx="10" ry="7"/></g>
      <rect y="226" width="240" height="40" fill="#7fd3f5" opacity=".55"/>
      <ellipse cx="120" cy="294" rx="172" ry="44" fill="#ffe3a3"/><ellipse cx="120" cy="288" rx="150" ry="30" fill="#fff0c9"/>`;
  }

  /* ------------------------------------------------------------------
   * 四、裝備圖鑑（24 件三階裝備 ＋ 5 件星幣限定）
   *   slot：head 頭飾 / face 臉飾 / top 上衣 / bottom 褲裙 / outer 外披
   *         weapon 武器 / pet 寵物 / aura 光環 / bg 背景 / mount 坐騎
   * ------------------------------------------------------------------ */
  const PET = (inner) => `<g transform="translate(38 236)">${inner}</g>`;
  const WEAPON = (rot, inner) => `<g transform="translate(${HAND_R.x} ${HAND_R.y}) rotate(${rot})">${inner}</g>`;

  const ITEMS = [
    /* ===== 【易】帽子與飾品 ===== */
    {
      id: "vr_goggles", tier: "easy", slot: "face", style: "tech", name: "VR 賽博護目鏡", desc: "全息視界一秒開啟，掃描所有程式漏洞。",
      L: {
        front: (c) => `<defs>${lg(`${c.u}-vr`, [[0, "#00f5ff"], [0.5, "#7b2ff7"], [1, "#ff00c8"]], 1, 0)}</defs>
          <path d="M60 116 Q120 106 180 116" fill="none" stroke="#1f2233" stroke-width="7" stroke-linecap="round"/>
          <rect x="64" y="104" width="12" height="20" rx="4" fill="#2a2d44" stroke="${OL}" stroke-width="1.5"/>
          <rect x="164" y="104" width="12" height="20" rx="4" fill="#2a2d44" stroke="${OL}" stroke-width="1.5"/>
          <rect x="74" y="99" width="92" height="31" rx="14" fill="url(#${c.u}-vr)" stroke="#1a1a2e" stroke-width="3" filter="${c.sglow}"/>
          <path d="M86 107 H122" stroke="#fff" stroke-width="3" stroke-linecap="round" opacity=".75"/>
          <path d="M82 119 H158" stroke="#fff" stroke-width="1.2" opacity=".4" stroke-dasharray="3 3"/>
          <circle cx="150" cy="108" r="2.4" fill="#fff"/><circle cx="157" cy="108" r="2.4" fill="#7dffb3"/>`
      }
    },
    {
      id: "esports_headset", tier: "easy", slot: "head", style: "tech", name: "黑紅電競貓耳耳機", desc: "RGB 貓耳隨節奏閃爍，戰力 +200%。",
      L: {
        front: (c) => `<path d="M64 108 Q60 38 120 36 Q180 38 176 108" fill="none" stroke="#1b1b1b" stroke-width="9" stroke-linecap="round"/>
          <path d="M66 100 Q64 42 120 40 Q176 42 174 100" fill="none" stroke="#e63946" stroke-width="2.4" stroke-linecap="round"/>
          <path d="M80 62 L84 28 L108 50 Z" fill="#1b1b1b" stroke="#111" stroke-width="2" stroke-linejoin="round"/>
          <path d="M87 54 L88 38 L100 50Z" fill="#ff2e4d" filter="${c.sglow}"/>
          <path d="M160 62 L156 28 L132 50 Z" fill="#1b1b1b" stroke="#111" stroke-width="2" stroke-linejoin="round"/>
          <path d="M153 54 L152 38 L140 50Z" fill="#ff2e4d" filter="${c.sglow}"/>
          <rect x="49" y="97" width="22" height="34" rx="10" fill="#1b1b1b" stroke="#000" stroke-width="1.5"/>
          <rect x="54" y="103" width="12" height="22" rx="6" fill="none" stroke="#ff2e4d" stroke-width="2.6" filter="${c.sglow}"/>
          <rect x="169" y="97" width="22" height="34" rx="10" fill="#1b1b1b" stroke="#000" stroke-width="1.5"/>
          <rect x="174" y="103" width="12" height="22" rx="6" fill="none" stroke="#ff2e4d" stroke-width="2.6" filter="${c.sglow}"/>
          <path d="M58 130 Q64 150 92 146" fill="none" stroke="#333" stroke-width="3" stroke-linecap="round"/>
          <circle cx="94" cy="146" r="3.6" fill="#ff2e4d"/>`
      }
    },
    {
      id: "hacker_hood", tier: "easy", slot: "head", style: "tech", name: "駭客連帽兜", desc: "兜帽滾邊流動綠色程式碼，神秘感滿點。",
      L: {
        back: () => `<path d="M46 132 Q38 24 120 22 Q202 24 194 132 Q196 166 172 170 L68 170 Q44 166 46 132Z" fill="#2b2f3a" stroke="${OL}" stroke-width="2.4"/>`,
        front: () => `<path d="M60 136 Q52 44 120 40 Q188 44 180 136" fill="none" stroke="#3a4050" stroke-width="13" stroke-linecap="round"/>
          <path d="M60 136 Q52 44 120 40 Q188 44 180 136" fill="none" stroke="#39ff88" stroke-width="2" stroke-dasharray="7 4" opacity=".9"/>
          <path d="M70 140 L72 166" stroke="#e8e8e8" stroke-width="2.4" stroke-linecap="round"/><path d="M170 140 L168 166" stroke="#e8e8e8" stroke-width="2.4" stroke-linecap="round"/>
          <rect x="69" y="164" width="6" height="7" rx="2" fill="#39ff88"/><rect x="165" y="164" width="6" height="7" rx="2" fill="#39ff88"/>
          <text x="120" y="35" text-anchor="middle" font-family="Consolas, monospace" font-size="9" font-weight="700" fill="#39ff88">&lt;/&gt;</text>`
      }
    },
    {
      id: "holo_monocle", tier: "easy", slot: "face", style: "tech", name: "全息投影單片眼鏡", desc: "右眼即時投影資料面板，分析一切數據。",
      L: {
        front: (c) => `<path d="M150 108 L162 84 L198 74 L198 102 L160 112Z" fill="#22d3ee" opacity=".12"/>
          <g class="av-holo"><path d="M162 84 L198 74 L198 102 L162 110Z" fill="#22d3ee" fill-opacity=".22" stroke="#22d3ee" stroke-width="1.4"/>
          <path d="M167 89 L190 83 M167 95 L186 90 M167 101 L192 95" stroke="#a5f3fc" stroke-width="1.6" stroke-linecap="round"/></g>
          <circle cx="142" cy="116" r="15" fill="#7df9ff" fill-opacity=".25" stroke="#ffd166" stroke-width="3.2" filter="${c.sglow}"/>
          <circle cx="142" cy="116" r="10.5" fill="none" stroke="#22d3ee" stroke-width="1.2" stroke-dasharray="3 2.5"/>
          <path d="M142 99 V103 M142 129 V133 M125 116 H129 M155 116 H159" stroke="#ffd166" stroke-width="1.6"/>
          <path d="M157 121 Q168 140 177 122" fill="none" stroke="#ffd166" stroke-width="1.5"/>`
      }
    },
    {
      id: "boba_clip", tier: "easy", slot: "head", style: "cute", name: "珍珠奶茶頭飾", desc: "Q 彈珍珠滿滿，帶來一整天的好心情。",
      L: {
        front: () => `<g transform="translate(150 44) rotate(16)">
          <ellipse cx="0" cy="26" rx="10" ry="3.5" fill="#ff8fb8"/>
          <path d="M-12 -6 L12 -6 L9 22 Q0 26 -9 22 Z" fill="#f3d9bd" stroke="${OL}" stroke-width="2" stroke-linejoin="round"/>
          <path d="M-11 4 L11 4 L9 22 Q0 26 -9 22 Z" fill="#d9a77a"/>
          <circle cx="-5" cy="17" r="2.7" fill="#3e2723"/><circle cx="1.5" cy="19" r="2.7" fill="#3e2723"/><circle cx="6" cy="15" r="2.7" fill="#3e2723"/><circle cx="-1" cy="12.5" r="2.7" fill="#3e2723"/>
          <rect x="1" y="-30" width="4.5" height="26" rx="2" fill="#ff6b9d" stroke="${OL}" stroke-width="1.3" transform="rotate(12 3 -17)"/>
          <path d="M-14 -6 Q0 -18 14 -6 Z" fill="#fff" fill-opacity=".85" stroke="${OL}" stroke-width="1.8"/>
          <circle cx="-4" cy="5" r="1.4" fill="${OL}"/><circle cx="4" cy="5" r="1.4" fill="${OL}"/><path d="M-2 8 Q0 10 2 8" fill="none" stroke="${OL}" stroke-width="1.2"/>
          <ellipse cx="-7" cy="8" rx="2" ry="1.2" fill="#ff8fa3"/><ellipse cx="7" cy="8" rx="2" ry="1.2" fill="#ff8fa3"/></g>`
      }
    },
    {
      id: "shiba_ears", tier: "easy", slot: "head", style: "cute", name: "柴犬耳朵髮箍", desc: "毛茸茸的柴柴耳，可愛度直接爆表。",
      L: {
        front: () => `<path d="M64 98 Q62 42 120 40 Q178 42 176 98" fill="none" stroke="#e07a2e" stroke-width="5" stroke-linecap="round"/>
          <path d="M72 70 Q68 34 82 22 Q100 38 108 54 Z" fill="#f39c4a" stroke="${OL}" stroke-width="2.2" stroke-linejoin="round"/>
          <path d="M79 62 Q78 41 84 33 Q95 45 100 54Z" fill="#fff1dc"/>
          <path d="M168 70 Q172 34 158 22 Q140 38 132 54 Z" fill="#f39c4a" stroke="${OL}" stroke-width="2.2" stroke-linejoin="round"/>
          <path d="M161 62 Q162 41 156 33 Q145 45 140 54Z" fill="#fff1dc"/>`
      }
    },
    {
      id: "strawberry_beret", tier: "easy", slot: "head", style: "cute", name: "草莓畫家貝雷帽", desc: "戴上它，靈感像草莓籽一樣滿出來。",
      L: {
        front: () => `<g transform="rotate(-10 120 60)">
          <ellipse cx="120" cy="56" rx="60" ry="21" fill="#e63946" stroke="${OL}" stroke-width="2.2"/>
          <path d="M64 60 Q120 78 176 60" fill="none" stroke="#b71c2c" stroke-width="3"/>
          <g fill="#ffe66d"><ellipse cx="92" cy="52" rx="2" ry="3"/><ellipse cx="108" cy="60" rx="2" ry="3"/><ellipse cx="126" cy="50" rx="2" ry="3"/><ellipse cx="144" cy="60" rx="2" ry="3"/><ellipse cx="158" cy="50" rx="2" ry="3"/><ellipse cx="80" cy="62" rx="2" ry="3"/><ellipse cx="136" cy="68" rx="2" ry="3"/></g>
          <path d="M106 38 Q113 30 120 36 Q127 30 134 38 Q125 43 120 41 Q115 43 106 38Z" fill="#43a047" stroke="#1b5e20" stroke-width="1.4"/>
          <path d="M120 36 Q118 28 124 24" fill="none" stroke="#2e7d32" stroke-width="3" stroke-linecap="round"/></g>
          <g transform="translate(170 58) rotate(36)"><rect x="-2" y="-18" width="4" height="24" rx="1.5" fill="#8d6e63" stroke="${OL}" stroke-width="1"/><path d="M-3 -18 Q0 -30 3 -18Z" fill="#42a5f5" stroke="${OL}" stroke-width="1"/></g>`
      }
    },
    {
      id: "star_crown", tier: "easy", slot: "head", style: "cute", name: "星光小皇冠", desc: "閃閃發亮的星星皇冠，今天你最耀眼。",
      L: {
        front: (c) => `<defs>${lg(`${c.u}-gold`, [[0, "#fff3a0"], [0.5, "#ffd166"], [1, "#f4a100"]])}</defs>
          <g transform="translate(120 52) rotate(-6)">
          <path d="M-26 0 L-26 -14 L-14 -5 L0 -22 L14 -5 L26 -14 L26 0 Z" fill="url(#${c.u}-gold)" stroke="#b8860b" stroke-width="2" stroke-linejoin="round"/>
          <rect x="-27" y="-1" width="54" height="7" rx="3" fill="#ffc94d" stroke="#b8860b" stroke-width="1.6"/>
          <circle cx="-13" cy="2.5" r="2.4" fill="#ff6b9d"/><circle cx="0" cy="2.5" r="2.6" fill="#4cc9f0"/><circle cx="13" cy="2.5" r="2.4" fill="#ff6b9d"/>
          <path d="${starPath(-26, -17, 5, 2.2)}" fill="#fff59d" stroke="#e0a800" stroke-width="1"/>
          <path d="${starPath(0, -26, 6, 2.6)}" fill="#fff59d" stroke="#e0a800" stroke-width="1"/>
          <path d="${starPath(26, -17, 5, 2.2)}" fill="#fff59d" stroke="#e0a800" stroke-width="1"/></g>
          ${sparkle(86, 40, 5, "#fff59d")}${sparkle(156, 34, 4, "#fff")}`
      }
    },

    /* ===== 【中】上衣與褲裙 ===== */
    {
      id: "neon_hoodie", tier: "medium", slot: "top", style: "tech", name: "霓虹代碼連帽衛衣", desc: "胸前霓虹 </> 標誌，寫程式的戰袍。",
      sleeve: { color: "#2a2566", long: true, cuff: "#22d3ee" },
      L: {
        main: (c) => `<path d="${TORSO}" fill="#2a2566" stroke="${OL}" stroke-width="2.2" stroke-linejoin="round"/>
          <path d="M96 153 Q120 168 144 153 Q140 145 120 145 Q100 145 96 153Z" fill="#3b3590" stroke="${OL}" stroke-width="1.8"/>
          <path d="M100 194 H140 L146 213 Q120 218 94 213 Z" fill="#221e57" stroke="#15123a" stroke-width="1.6"/>
          <g filter="${c.sglow}" stroke-linecap="round" stroke-linejoin="round" fill="none">
          <path d="M109 172 l-7 6 l7 6" stroke="#22d3ee" stroke-width="3"/><path d="M131 172 l7 6 l-7 6" stroke="#22d3ee" stroke-width="3"/>
          <path d="M124 169 l-8 18" stroke="#f472b6" stroke-width="3"/></g>
          <path d="M112 157 L111 176 M128 157 L129 176" stroke="#e5e7eb" stroke-width="1.8"/><circle cx="111" cy="177" r="1.8" fill="#22d3ee"/><circle cx="129" cy="177" r="1.8" fill="#22d3ee"/>
          <path d="M86 210 Q120 218 154 210" fill="none" stroke="#22d3ee" stroke-width="2" opacity=".8"/>`
      }
    },
    {
      id: "cyber_jacket", tier: "medium", slot: "top", style: "tech", name: "賽博龐克機能夾克", desc: "警示黃撞色＋發光條，夜之城街頭最潮。",
      sleeve: { color: "#262626", long: true, cuff: "#ffd60a" },
      L: {
        main: (c) => `<path d="${TORSO}" fill="#262626" stroke="${OL}" stroke-width="2.2" stroke-linejoin="round"/>
          <path d="M93 156 L103 158 L99 216 L83 214Z" fill="#ffd60a" stroke="${OL}" stroke-width="1.6"/>
          <path d="M147 156 L139 158 L143 217 L157 214Z" fill="#ffd60a" stroke="${OL}" stroke-width="1.6"/>
          <path d="M98 150 L120 162 L142 150 L146 160 L120 172 L94 160Z" fill="#3a3a3a" stroke="${OL}" stroke-width="1.8" stroke-linejoin="round"/>
          <path d="M127 165 L114 218" stroke="#c7c7c7" stroke-width="2.2" stroke-dasharray="2.5 2"/>
          <path d="M131 182 H146" stroke="#ff2e63" stroke-width="3.2" stroke-linecap="round" filter="${c.sglow}"/>
          <path d="M131 190 H143" stroke="#00f5ff" stroke-width="2.4" stroke-linecap="round" filter="${c.sglow}"/>
          <rect x="104" y="176" width="13" height="9" rx="2" fill="#ffd60a"/><text x="110.5" y="183.3" text-anchor="middle" font-family="Consolas, monospace" font-size="7" font-weight="700" fill="#262626">07</text>`
      }
    },
    {
      id: "space_suit", tier: "medium", slot: "top", style: "tech", name: "未來太空飛行服", desc: "胸前控制面板閃爍，隨時準備發射升空。",
      sleeve: { color: "#f1f5f9", long: true, cuff: "#ff7a1a" },
      L: {
        main: () => `<path d="${TORSO}" fill="#f1f5f9" stroke="${OL}" stroke-width="2.2" stroke-linejoin="round"/>
          <path d="M96 160 L90 214" stroke="#ff7a1a" stroke-width="5"/><path d="M144 160 L150 214" stroke="#ff7a1a" stroke-width="5"/>
          <ellipse cx="120" cy="155" rx="23" ry="6.5" fill="#cbd5e1" stroke="${OL}" stroke-width="1.8"/>
          <rect x="105" y="172" width="30" height="20" rx="4" fill="#334155" stroke="${OL}" stroke-width="1.6"/>
          <circle cx="112" cy="178" r="2.6" fill="#ef4444"/><circle cx="120" cy="178" r="2.6" fill="#22c55e"/><circle cx="128" cy="178" r="2.6" fill="#facc15"/>
          <rect x="109" y="184" width="22" height="4" rx="2" fill="#38bdf8"/>
          <rect x="85" y="204" width="70" height="7" rx="3" fill="#94a3b8" stroke="${OL}" stroke-width="1.4"/>
          <circle cx="139" cy="166" r="5" fill="#1e3a8a" stroke="#fff" stroke-width="1.2"/><path d="${starPath(139, 166, 3.2, 1.4)}" fill="#fff"/>`
      }
    },
    {
      id: "circuit_cargo", tier: "medium", slot: "bottom", style: "tech", name: "發光電路板工裝褲", desc: "褲管流動螢光電路，走到哪亮到哪。",
      L: {
        main: (c) => `<path d="M84 202 H119 L117 252 H98 Z" fill="#14532d" stroke="${OL}" stroke-width="2.2" stroke-linejoin="round"/>
          <path d="M121 202 H156 L142 252 H123 Z" fill="#14532d" stroke="${OL}" stroke-width="2.2" stroke-linejoin="round"/>
          <rect x="83" y="200" width="74" height="9" rx="3" fill="#0f3d22" stroke="${OL}" stroke-width="1.8"/>
          <rect x="86" y="222" width="9" height="12" rx="2" fill="#166534" stroke="#0b2e18" stroke-width="1.2"/><rect x="145" y="222" width="9" height="12" rx="2" fill="#166534" stroke="#0b2e18" stroke-width="1.2"/>
          <g fill="none" stroke="#a3e635" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" filter="${c.sglow}">
          <path d="M101 212 V224 H111 V244"/><path d="M107 212 V218 H114"/><path d="M139 212 V226 H129 V246"/><path d="M134 212 V219 H126"/></g>
          <g fill="#d9f99d"><circle cx="111" cy="244" r="2"/><circle cx="114" cy="218" r="2"/><circle cx="129" cy="246" r="2"/><circle cx="126" cy="219" r="2"/></g>`
      }
    },
    {
      id: "sailor_set", tier: "medium", slot: "top", style: "cute", name: "動森風水手服套裝", desc: "海軍藍領＋紅色蝴蝶結，元氣滿滿去上學。",
      sleeve: { color: "#ffffff", long: false, cuff: "#1d3557" },
      L: {
        main: () => `<path d="${TORSO}" fill="#ffffff" stroke="${OL}" stroke-width="2.2" stroke-linejoin="round"/>
          <path d="M90 156 Q120 150 150 156 L152 172 L120 192 L88 172 Z" fill="#1d3557" stroke="${OL}" stroke-width="2" stroke-linejoin="round"/>
          <path d="M94 160 L93 170 L120 187 L147 170 L146 160" fill="none" stroke="#fff" stroke-width="2"/>
          <path d="M108 154 L120 178 L132 154 Z" fill="#fff"/>
          <path d="M120 182 L106 174 L106 190 Z" fill="#e63946" stroke="${OL}" stroke-width="1.6" stroke-linejoin="round"/>
          <path d="M120 182 L134 174 L134 190 Z" fill="#e63946" stroke="${OL}" stroke-width="1.6" stroke-linejoin="round"/>
          <path d="M117 184 L111 200 M123 184 L129 200" stroke="#e63946" stroke-width="3.2" stroke-linecap="round"/>
          <circle cx="120" cy="182" r="4" fill="#c1121f" stroke="${OL}" stroke-width="1.4"/>
          <path d="M86 210 Q120 218 154 210" fill="none" stroke="#1d3557" stroke-width="2.4"/>`
      }
    },
    {
      id: "plaid_skirt", tier: "medium", slot: "bottom", style: "cute", name: "英倫格紋百褶裙", desc: "經典紅綠格紋百褶，學院氣質滿分。",
      L: {
        main: (c) => `<defs><pattern id="${c.u}-tartan" width="14" height="14" patternUnits="userSpaceOnUse"><rect width="14" height="14" fill="#b3202a"/><rect width="5" height="14" fill="#1d4d2b" opacity=".75"/><rect width="14" height="5" fill="#1d4d2b" opacity=".6"/><rect x="9" width="1.2" height="14" fill="#ffd166"/><rect y="9" width="14" height="1.2" fill="#ffd166" opacity=".8"/><rect x="2" width="1" height="14" fill="#0b1d3a" opacity=".6"/></pattern></defs>
          <path d="M86 202 H154 L168 238 Q120 246 72 238 Z" fill="url(#${c.u}-tartan)" stroke="${OL}" stroke-width="2.2" stroke-linejoin="round"/>
          <path d="M98 205 L90 240 M110 205 L106 242 M120 205 L120 243 M130 205 L134 242 M142 205 L150 240" stroke="#5c0f14" stroke-width="1.4" opacity=".6"/>
          <rect x="85" y="200" width="70" height="8" rx="3" fill="#1d3557" stroke="${OL}" stroke-width="1.6"/>`
      }
    },
    {
      id: "bear_overalls", tier: "medium", slot: "bottom", style: "cute", name: "小熊背帶褲", desc: "胸前小熊補丁陪你一起冒險。",
      L: {
        main: () => `<path d="M84 202 L156 202 L158 232 Q140 236 122 232 L120 224 L118 232 Q100 236 82 232 Z" fill="#a47148" stroke="${OL}" stroke-width="2.2" stroke-linejoin="round"/>
          <path d="M83 226 Q100 230 118 226 L118 232 Q100 236 82 232Z M122 226 Q140 230 157 226 L158 232 Q140 236 122 232Z" fill="#c99a6e"/>`,
        over: () => `<path d="M104 178 L96 157 M136 178 L144 157" stroke="${OL}" stroke-width="8" stroke-linecap="round"/>
          <path d="M104 178 L96 157 M136 178 L144 157" stroke="#a47148" stroke-width="5" stroke-linecap="round"/>
          <rect x="101" y="176" width="38" height="36" rx="6" fill="#a47148" stroke="${OL}" stroke-width="2"/>
          <circle cx="105" cy="181" r="2.4" fill="#ffd166"/><circle cx="135" cy="181" r="2.4" fill="#ffd166"/>
          <circle cx="113" cy="187" r="3.6" fill="#6d4c33"/><circle cx="127" cy="187" r="3.6" fill="#6d4c33"/>
          <circle cx="120" cy="195" r="8.5" fill="#6d4c33"/><ellipse cx="120" cy="198" rx="4.6" ry="3.4" fill="#e8c9a0"/>
          <circle cx="116.5" cy="193" r="1.2" fill="#1a1a1a"/><circle cx="123.5" cy="193" r="1.2" fill="#1a1a1a"/><circle cx="120" cy="197" r="1.3" fill="#1a1a1a"/>`
      }
    },
    {
      id: "star_cloak", tier: "medium", slot: "outer", style: "cute", name: "星辰魔法師斗篷", desc: "披上銀河星辰，詠唱演算法咒語。",
      L: {
        back: (c) => `<defs>${lg(`${c.u}-cloak`, [[0, "#4b3693"], [1, "#1f1647"]])}</defs>
          <path d="M88 154 Q58 210 64 258 Q120 270 176 258 Q182 210 152 154 Z" fill="url(#${c.u}-cloak)" stroke="${OL}" stroke-width="2.2" stroke-linejoin="round"/>
          <path d="M66 254 Q120 266 174 254" fill="none" stroke="#b388ff" stroke-width="3"/>
          <path d="${starPath(74, 228, 4, 1.7)}" fill="#ffe066"/><path d="${starPath(168, 222, 4.5, 1.9)}" fill="#ffe066"/><path d="${starPath(160, 246, 3, 1.3)}" fill="#fff"/><path d="${starPath(80, 196, 3, 1.3)}" fill="#fff"/>`,
        front: () => `<path d="M90 154 Q120 170 150 154 L154 163 Q120 180 86 163 Z" fill="#3b2a6b" stroke="${OL}" stroke-width="2" stroke-linejoin="round"/>
          <path d="${starPath(120, 168, 7, 3)}" fill="#ffd166" stroke="#b8860b" stroke-width="1.4"/>`
      }
    },

    /* ===== 【難】武器與寵物（光暈動畫） ===== */
    {
      id: "binary_saber", tier: "hard", slot: "weapon", style: "tech", name: "二進位光劍", desc: "0 與 1 交織的光刃，一揮斬斷所有 Bug。",
      L: {
        main: (c) => WEAPON(28, `<rect x="-8" y="-124" width="16" height="118" rx="8" fill="#00e5ff" opacity=".45" filter="${c.glow}"/>
          <rect x="-4.5" y="-121" width="9" height="113" rx="4.5" fill="#e0ffff"/>
          ${"10110100101".split("").map((d, i) => `<text x="0" y="${-14 - i * 9.6}" text-anchor="middle" font-family="Consolas, monospace" font-size="8" font-weight="700" fill="#0088a8">${d}</text>`).join("")}
          <rect x="-11" y="-9" width="22" height="6" rx="2" fill="#4b5563" stroke="#111" stroke-width="1.2"/>
          <rect x="-5" y="-4" width="10" height="26" rx="3" fill="#9aa5b1" stroke="#1f2937" stroke-width="1.4"/>
          <path d="M-5 3 H5 M-5 9 H5 M-5 15 H5" stroke="#4b5563" stroke-width="1.4"/>`)
      }
    },
    {
      id: "keyboard_greatsword", tier: "hard", slot: "weapon", style: "tech", name: "機械鍵盤大劍", desc: "RGB 機械軸劍身，每一擊都是清脆青軸聲。",
      L: {
        main: () => {
          const cols = ["#ff595e", "#ff924c", "#ffca3a", "#8ac926", "#1982c4", "#6a4c93", "#ff6bd6", "#4cc9f0"];
          let keys = "";
          for (let r = 0; r < 8; r++) {
            keys += `<rect x="-11" y="${-124 + r * 13}" width="10" height="10" rx="2" fill="${cols[r]}" stroke="#111" stroke-width=".8"/>`;
            keys += `<rect x="1" y="${-124 + r * 13}" width="10" height="10" rx="2" fill="${cols[(r + 3) % 8]}" stroke="#111" stroke-width=".8"/>`;
          }
          return WEAPON(24, `<path d="M-14 -128 L0 -148 L14 -128Z" fill="#2b2d42" stroke="#111" stroke-width="1.6" stroke-linejoin="round"/>
            <rect x="-14" y="-128" width="28" height="114" rx="3" fill="#2b2d42" stroke="#111" stroke-width="1.6"/>${keys}
            <rect x="-25" y="-16" width="50" height="9" rx="4" fill="#ffd166" stroke="#8a6100" stroke-width="1.6"/>
            <rect x="-5" y="-8" width="10" height="26" rx="3" fill="#6d4c41" stroke="#3e2723" stroke-width="1.4"/>
            <circle cx="0" cy="21" r="5" fill="#ffd166" stroke="#8a6100" stroke-width="1.4"/>`);
        }
      }
    },
    {
      id: "shiba_drone", tier: "hard", slot: "pet", style: "tech", name: "機械柴犬無人機", desc: "雙旋翼柴柴偵察機，自動巡航守護主人。",
      L: {
        main: (c) => PET(`<ellipse cx="0" cy="30" rx="12" ry="3" fill="#22d3ee" opacity=".5" filter="${c.glow}"/>
          <path d="M0 -14 V-24" stroke="#64748b" stroke-width="2.4"/>
          <g class="av-spin"><ellipse cx="0" cy="-25" rx="20" ry="3.2" fill="#94a3b8" opacity=".85"/></g>
          <circle cx="0" cy="-25" r="2.6" fill="#334155"/>
          <path d="M-18 -4 L-15 -22 L-5 -12Z" fill="#f39c4a" stroke="${OL}" stroke-width="1.8" stroke-linejoin="round"/>
          <path d="M18 -4 L15 -22 L5 -12Z" fill="#f39c4a" stroke="${OL}" stroke-width="1.8" stroke-linejoin="round"/>
          <ellipse cx="0" cy="2" rx="21" ry="17" fill="#f39c4a" stroke="${OL}" stroke-width="2"/>
          <ellipse cx="0" cy="9" rx="13" ry="9" fill="#fff1dc"/>
          <rect x="-15" y="-8" width="30" height="9" rx="4.5" fill="#cbd5e1" stroke="#475569" stroke-width="1.4"/>
          <rect x="-10" y="-6.5" width="7" height="5" rx="2" fill="#22d3ee" filter="${c.sglow}"/><rect x="3" y="-6.5" width="7" height="5" rx="2" fill="#22d3ee" filter="${c.sglow}"/>
          <ellipse cx="0" cy="6" rx="3" ry="2.2" fill="#2d1e2f"/><path d="M-4 10 Q0 13 4 10" fill="none" stroke="#2d1e2f" stroke-width="1.4" stroke-linecap="round"/>
          <path d="M-21 6 H-27 M21 6 H27" stroke="#64748b" stroke-width="2.4" stroke-linecap="round"/>`)
      }
    },
    {
      id: "ai_ghost", tier: "hard", slot: "pet", style: "tech", name: "藍光 AI 小幽靈", desc: "會學習你習慣的 AI 小精靈，永遠在線。",
      L: {
        main: (c) => PET(`<defs>${lg(`${c.u}-ghost`, [[0, "#b9f3ff"], [1, "#3a86ff"]])}</defs>
          <path d="M-19 14 Q-21 -24 0 -26 Q21 -24 19 14 Q15 7 10 15 Q5 7 0 15 Q-5 7 -10 15 Q-15 7 -19 14 Z" fill="url(#${c.u}-ghost)" fill-opacity=".92" stroke="#1d4ed8" stroke-width="1.8" filter="${c.glow}"/>
          <rect x="-11" y="-12" width="8" height="10" rx="3" fill="#fff"/><rect x="3" y="-12" width="8" height="10" rx="3" fill="#fff"/>
          <rect x="-8.5" y="-9" width="3.6" height="5" rx="1.4" fill="#1e3a8a"/><rect x="5.5" y="-9" width="3.6" height="5" rx="1.4" fill="#1e3a8a"/>
          <path d="M-4 2 Q0 5 4 2" fill="none" stroke="#1e3a8a" stroke-width="1.6" stroke-linecap="round"/>
          <rect x="-7" y="5" width="14" height="7" rx="2" fill="#1e3a8a"/><text x="0" y="10.6" text-anchor="middle" font-family="Consolas, monospace" font-size="6.5" font-weight="700" fill="#7df9ff">AI</text>
          <text x="-24" y="-18" font-family="Consolas, monospace" font-size="7" fill="#60a5fa">1</text><text x="20" y="-22" font-family="Consolas, monospace" font-size="7" fill="#60a5fa">0</text>`)
      }
    },
    {
      id: "python_staff", tier: "hard", slot: "weapon", style: "cute", name: "Python 魔法星杖", desc: "藍黃雙蛇守護的星杖，咒語就是程式碼。",
      L: {
        main: (c) => WEAPON(18, `<rect x="-3.5" y="-104" width="7" height="128" rx="3.5" fill="#8e5a3c" stroke="${OL}" stroke-width="1.4"/>
          <path d="M-3.5 -40 L3.5 -46 M-3.5 -30 L3.5 -36" stroke="#ffd166" stroke-width="2"/>
          <path d="M-4 -100 Q-14 -92 -8 -84" fill="none" stroke="#ff8fb8" stroke-width="3" stroke-linecap="round"/>
          <circle cx="0" cy="-122" r="24" fill="#b388ff" opacity=".35" filter="${c.glow}"/>
          <path d="${starPath(0, -122, 21, 10)}" fill="#c4a1ff" stroke="#ffd166" stroke-width="2.2" stroke-linejoin="round"/>
          <rect x="-8" y="-131" width="10" height="9" rx="3" fill="#3776ab"/><rect x="-2" y="-122" width="10" height="9" rx="3" fill="#ffd43b" stroke="#c79a00" stroke-width=".6"/>
          <circle cx="-5" cy="-128" r="1.3" fill="#fff"/><circle cx="5" cy="-116" r="1.3" fill="#fff"/>
          ${sparkle(-24, -140, 5, "#fff59d")}${sparkle(22, -146, 4, "#fff")}${sparkle(26, -110, 3.5, "#ffd6f5")}`)
      }
    },
    {
      id: "pixel_hammer", tier: "hard", slot: "weapon", style: "cute", name: "像素彩虹戰鎚", desc: "8-bit 彩虹像素鎚，敲出一整片彩虹。",
      L: {
        main: () => {
          const cols = ["#ff595e", "#ff924c", "#ffca3a", "#c5ca30", "#8ac926", "#52a675", "#1982c4", "#4267ac", "#6a4c93"];
          let px = "";
          for (let x = 0; x < 9; x++) for (let y = 0; y < 5; y++) px += `<rect x="${-27 + x * 6}" y="${-114 + y * 6}" width="6.3" height="6.3" fill="${cols[x]}"/>`;
          return WEAPON(20, `<rect x="-3.5" y="-86" width="7" height="108" fill="#a1887f" stroke="${OL}" stroke-width="1.4" shape-rendering="crispEdges"/>
            <rect x="-3.5" y="10" width="7" height="12" fill="#ff8fb8" shape-rendering="crispEdges"/>
            <g shape-rendering="crispEdges">${px}<rect x="-27" y="-114" width="54" height="6" fill="#fff" opacity=".35"/>
            <rect x="-27" y="-114" width="54" height="30" fill="none" stroke="#2b2d42" stroke-width="2"/></g>
            <path d="M-6 -126 h4 v-4 h4 v4 h4 v4 h-4 v4 h-4 v-4 h-4z" fill="#ff6bd6" shape-rendering="crispEdges"/>`);
        }
      }
    },
    {
      id: "pixel_cat", tier: "hard", slot: "pet", style: "cute", name: "發光像素小黑貓", desc: "8-bit 夜光小黑貓，眼睛會發出黃色光芒。",
      L: {
        main: (c) => PET(`<g filter="${c.glow}" shape-rendering="crispEdges">${pixelArt([
          "K........K..",
          "KK......KK..",
          "KKKKKKKKKK..",
          "KYYKKKKYYK..",
          "KKYKKKKYKK..",
          "KKKKPPKKKK..",
          ".KKKKKKKK...",
          "..KKGGKK..T.",
          ".KKKKKKKK.T.",
          ".KKKKKKKKTT.",
          ".KK.KK.KK..."
        ], 4.4, -26, -26, { K: "#1f1d2b", Y: "#ffe14d", P: "#ff8fb8", G: "#ffd166", T: "#2c2940" })}</g>`)
      }
    },
    {
      id: "mini_duck", tier: "hard", slot: "pet", style: "cute", name: "迷你黃色小鴨跟班", desc: "嘎嘎！最忠心的除錯小鴨（Rubber Duck）。",
      L: {
        main: (c) => PET(`<ellipse cx="0" cy="22" rx="24" ry="4" fill="#7fd3f5" opacity=".7"/>
          <ellipse cx="-2" cy="8" rx="21" ry="14" fill="#ffd93d" stroke="#c99a00" stroke-width="2" filter="${c.sglow}"/>
          <path d="M-16 4 Q-24 -4 -20 -10 Q-14 0 -8 2Z" fill="#ffd93d" stroke="#c99a00" stroke-width="1.6"/>
          <circle cx="4" cy="-11" r="12" fill="#ffd93d" stroke="#c99a00" stroke-width="2"/>
          <ellipse cx="17" cy="-8" rx="7.5" ry="4" fill="#ff8c42" stroke="#c45a10" stroke-width="1.4"/>
          <circle cx="8" cy="-14" r="2.2" fill="#2d1e2f"/><circle cx="8.8" cy="-14.8" r=".8" fill="#fff"/>
          <ellipse cx="3" cy="-7" rx="3" ry="1.8" fill="#ff9fb0"/>
          <path d="M-6 6 Q2 14 10 6" fill="none" stroke="#e0b100" stroke-width="2" stroke-linecap="round"/>
          <path d="M-2 -23 L4 -21 L-1 -17Z" fill="#ff6b9d"/>`)
      }
    },

    /* ===== 【⭐ NPC 星幣限定夢幻逸品】 ===== */
    {
      id: "barista_apron", tier: "star", price: 100, slot: "outer", style: "cute", name: "星光咖啡師圍裙", desc: "量子沙漏咖啡島認證，咖啡香裡帶點星光。",
      L: {
        front: (c) => `<path d="M106 152 Q120 144 134 152" fill="none" stroke="#5a3d2b" stroke-width="3"/>
          <path d="M101 164 Q120 158 139 164 L147 238 Q120 244 93 238 Z" fill="#7b5a43" stroke="${OL}" stroke-width="2" stroke-linejoin="round"/>
          <path d="M101 164 L106 152 M139 164 L134 152" stroke="#5a3d2b" stroke-width="3"/>
          <path d="M90 206 Q84 212 82 220 M150 206 Q156 212 158 220" fill="none" stroke="#5a3d2b" stroke-width="3" stroke-linecap="round"/>
          <circle cx="120" cy="180" r="10" fill="#ffd166" opacity=".35" filter="${c.glow}"/>
          <path d="${starPath(120, 180, 8, 3.4)}" fill="#ffd166" stroke="#b8860b" stroke-width="1.2"/>
          <rect x="108" y="206" width="24" height="16" rx="3" fill="#8f6a50" stroke="#4a3426" stroke-width="1.4"/>
          <path d="M114 210 h10 v6 q-5 4 -10 0z" fill="#fff"/><path d="M124 211 q4 1 0 4" fill="none" stroke="#fff" stroke-width="1.3"/>
          ${sparkle(102, 176, 3.5, "#fff59d")}${sparkle(140, 192, 3, "#fff")}`
      }
    },
    {
      id: "note_halo", tier: "star", price: 150, slot: "aura", style: "cute", name: "發光音符漂浮光環", desc: "芯片音樂島的旋律化成光環，在頭頂旋轉。",
      L: {
        back: (c) => `<ellipse cx="120" cy="104" rx="84" ry="84" fill="#ffe066" opacity=".12" filter="${c.glow}"/>`,
        front: (c) => `<g class="av-halo"><ellipse cx="120" cy="30" rx="40" ry="9" fill="none" stroke="#ffe066" stroke-width="4.5" filter="${c.glow}"/>
          <ellipse cx="120" cy="30" rx="40" ry="9" fill="none" stroke="#fffbe6" stroke-width="1.6"/></g>
          <g class="av-notes">${note(74, 26, "#ff6bd6", -12)}${note(160, 20, "#4cc9f0", 10)}${note(118, 8, "#b388ff")}${note(190, 58, "#ffd166", 14)}${note(46, 60, "#7dffb3", -10)}</g>`
      }
    },
    {
      id: "bg_cyber", tier: "star", price: 200, slot: "bg", style: "tech", name: "戰績卡背景：賽博霓虹夜空", desc: "霓虹城市天際線與透視網格，未來感爆棚。",
      L: {
        main: (c) => {
          const bld = [[0, 150, 26], [24, 120, 22], [44, 168, 18], [60, 132, 28], [86, 176, 16], [150, 160, 20], [168, 118, 26], [192, 146, 22], [212, 128, 28]];
          let city = "";
          bld.forEach(([x, y, w], i) => {
            city += `<rect x="${x}" y="${y}" width="${w}" height="${232 - y}" fill="#140a2e" stroke="#2a1660" stroke-width="1"/>`;
            for (let yy = y + 8; yy < 224; yy += 11) for (let xx = x + 4; xx < x + w - 4; xx += 7) {
              if ((xx * 7 + yy * 3 + i) % 5 < 2) city += `<rect x="${xx}" y="${yy}" width="3" height="4" fill="${(xx + yy) % 3 ? "#ffd166" : "#22d3ee"}" opacity=".85"/>`;
            }
          });
          let grid = "";
          for (let i = -6; i <= 6; i++) grid += `<path d="M120 232 L${120 + i * 40} 300" stroke="#ff2bd6" stroke-width="1.2" opacity=".7"/>`;
          [238, 248, 262, 280].forEach((y) => { grid += `<path d="M0 ${y} H240" stroke="#ff2bd6" stroke-width="1.2" opacity=".6"/>`; });
          return `<defs>${lg(`${c.u}-cy`, [[0, "#0b0326"], [0.55, "#3b0a5e"], [1, "#8a1f6b"]])}</defs>
            <rect width="240" height="300" fill="url(#${c.u}-cy)"/>
            <g fill="#fff">${[[20, 20], [60, 40], [110, 18], [150, 50], [200, 22], [226, 70], [36, 88], [92, 70], [130, 92]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="1.2"/>`).join("")}</g>
            <circle cx="186" cy="56" r="18" fill="#ffd6f5" filter="${c.glow}"/>
            ${city}<rect y="232" width="240" height="68" fill="#1b0838"/>${grid}
            <path d="M0 232 H240" stroke="#22d3ee" stroke-width="2" filter="${c.sglow}"/>`;
        }
      }
    },
    {
      id: "bg_sakura", tier: "star", price: 200, slot: "bg", style: "cute", name: "戰績卡背景：櫻花飄落碼頭", desc: "粉色晚霞、木棧碼頭與飄落的櫻花瓣。",
      L: {
        main: (c) => {
          const petals = [[30, 70, 0], [70, 30, -1.5], [150, 60, -3], [200, 100, -4.5], [110, 120, -2], [180, 30, -5], [50, 150, -3.5], [220, 170, -1]];
          return `<defs>${lg(`${c.u}-sk`, [[0, "#ffc4dd"], [0.5, "#ffeef5"], [1, "#c9ecff"]])}</defs>
            <rect width="240" height="300" fill="url(#${c.u}-sk)"/>
            <circle cx="186" cy="72" r="20" fill="#fff4f8" opacity=".9"/>
            <rect y="196" width="240" height="60" fill="#8fd3ef"/>
            <path d="M0 210 Q30 205 60 210 T120 210 T180 210 T240 210 M0 228 Q30 223 60 228 T120 228 T180 228 T240 228" fill="none" stroke="#fff" stroke-width="1.6" opacity=".7"/>
            <rect y="248" width="240" height="52" fill="#c49a6c"/>
            <path d="M0 260 H240 M0 274 H240 M0 288 H240" stroke="#9c7349" stroke-width="1.6"/>
            <path d="M40 248 V300 M120 248 V300 M200 248 V300" stroke="#8a6238" stroke-width="2"/>
            <path d="M0 18 Q40 26 70 14 Q92 6 110 12" fill="none" stroke="#6d4c41" stroke-width="5" stroke-linecap="round"/>
            <path d="M40 22 Q46 40 36 56" fill="none" stroke="#6d4c41" stroke-width="3" stroke-linecap="round"/>
            <g fill="#ffb7d0">${[[10, 14], [26, 24], [48, 16], [64, 26], [84, 10], [104, 18], [36, 46], [30, 58], [56, 8], [0, 30]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="7.5"/>`).join("")}</g>
            <g fill="#ff8fb8">${[[18, 18], [56, 22], [96, 14], [40, 52]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="3"/>`).join("")}</g>
            ${petals.map(([x, y, d]) => `<g transform="translate(${x} ${y})"><g class="av-petal" style="animation-delay:${d}s"><ellipse rx="3.4" ry="2" fill="#ff9cc2" transform="rotate(30)"/></g></g>`).join("")}`;
        }
      }
    },
    {
      id: "golden_board", tier: "star", price: 350, slot: "mount", style: "tech", name: "傳說坐騎：黃金鍵盤浮空滑板", desc: "黃金鍵帽打造的浮空滑板，反重力推進！",
      L: {
        main: (c) => {
          let caps = "";
          for (let x = 66; x <= 166; x += 12.5) caps += `<rect x="${x}" y="249" width="10" height="6" rx="1.6" fill="#fff8e1" stroke="#b8860b" stroke-width="1"/>`;
          return `<defs>${lg(`${c.u}-gb`, [[0, "#fff1a8"], [0.5, "#ffd23f"], [1, "#e09a00"]])}</defs>
            <g class="av-thrust"><ellipse cx="82" cy="276" rx="9" ry="5" fill="#22d3ee" opacity=".8" filter="${c.glow}"/><ellipse cx="158" cy="276" rx="9" ry="5" fill="#22d3ee" opacity=".8" filter="${c.glow}"/></g>
            <path d="M56 254 Q48 262 60 268 H180 Q192 262 184 254 Z" fill="url(#${c.u}-gb)" stroke="#a87400" stroke-width="2" stroke-linejoin="round"/>
            <rect x="74" y="266" width="16" height="6" rx="2" fill="#475569"/><rect x="150" y="266" width="16" height="6" rx="2" fill="#475569"/>
            ${caps}${sparkle(60, 246, 4, "#fff59d")}${sparkle(184, 248, 4, "#fff")}`;
        }
      }
    }
  ];
  const ITEM_MAP = Object.fromEntries(ITEMS.map((it) => [it.id, it]));

  const TIERS = {
    easy: { key: "easy", ticket: "初階造型券", short: "初階券", icon: "🎟️", diffName: "易", color: "#4ade80", cat: "帽子／飾品" },
    medium: { key: "medium", ticket: "進階服裝券", short: "進階券", icon: "🎟️", diffName: "中", color: "#60a5fa", cat: "上衣／褲裙" },
    hard: { key: "hard", ticket: "傳說武裝券", short: "傳說券", icon: "🎟️", diffName: "難", color: "#f472b6", cat: "武器／寵物" },
    star: { key: "star", ticket: "探索星幣", short: "星幣", icon: "⭐", diffName: "NPC", color: "#ffd166", cat: "星幣限定" }
  };
  const SLOT_NAME = { head: "頭飾", face: "臉飾", top: "上衣", bottom: "褲裙", outer: "外披", weapon: "武器", pet: "寵物", aura: "光環", bg: "背景", mount: "坐騎" };
  const SLOT_VIEW = {
    head: "34 6 172 156", face: "54 68 132 96", top: "50 136 140 116", bottom: "60 186 120 92", outer: "40 136 160 134",
    weapon: "122 52 118 180", pet: "4 200 68 68", aura: "40 0 160 92", bg: "0 0 240 300", mount: "36 226 168 66"
  };

  /* ------------------------------------------------------------------
   * 五、分層 SVG 渲染
   * ------------------------------------------------------------------ */
  function renderAvatar(st, opt = {}) {
    const u = "av" + ++SEQ + "x" + Math.floor(Math.random() * 1e4);
    const look = Object.assign({}, DEFAULT_LOOK, (st && st.look) || {});
    const hc = HAIR_COLORS.find((x) => x.id === look.hairColor) || HAIR_COLORS[0];
    const hair = HAIR[look.hair] || HAIR.short;
    const face = FACE[look.face] || FACE.smile;
    const c = { u, h: hc, glow: `url(#${u}-glow)`, sglow: `url(#${u}-sglow)` };
    const eq = (st && st.equipped) || {};
    const it = (slot) => {
      const item = eq[slot] ? ITEM_MAP[eq[slot]] : null;
      return item && item.slot === slot ? item : null;
    };
    const L = (item, layer) => (item && item.L && item.L[layer] ? item.L[layer](c) : "");
    const I = { head: it("head"), face: it("face"), top: it("top"), bottom: it("bottom"), outer: it("outer"), weapon: it("weapon"), pet: it("pet"), aura: it("aura"), bg: it("bg"), mount: it("mount") };
    const size = opt.width ? ` width="${opt.width}" height="${opt.height}"` : "";
    let s = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${opt.viewBox || "0 0 240 300"}"${size} class="av-svg ${opt.cls || ""}" role="img" aria-label="${esc(opt.label || "Q 版角色")}">`;
    s += `<defs><filter id="${u}-glow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="3.2" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
      <filter id="${u}-sglow" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="1.4" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>`;
    if (!opt.noBg) s += I.bg ? L(I.bg, "main") : defaultBg(c);
    s += L(I.aura, "back");
    s += I.mount
      ? `<ellipse cx="120" cy="286" rx="40" ry="5.5" fill="rgba(0,0,0,.16)"/>`
      : `<ellipse cx="120" cy="264" rx="46" ry="6.5" fill="rgba(0,0,0,.16)"/>`;
    s += `<g class="${I.mount ? "av-hover" : "av-idle"}">`;
    if (I.mount) s += L(I.mount, "main") + `<g transform="translate(0 -10)">`;
    s += L(I.outer, "back") + L(I.head, "back") + hair.back(hc);
    s += legs() + (I.bottom ? L(I.bottom, "main") : defShorts()) + shoes();
    s += neck() + (I.top ? L(I.top, "main") : defTop()) + L(I.bottom, "over");
    s += arms(I.top) + L(I.outer, "front");
    s += headBase() + face(hc, c) + hair.front(hc) + L(I.head, "front") + L(I.face, "front");
    if (I.weapon) s += `<g class="av-weapon av-legend">${L(I.weapon, "main")}</g>` + rightHand();
    if (I.mount) s += `</g>`;
    s += `</g>`;
    if (I.pet) s += `<g class="av-pet av-legend">${L(I.pet, "main")}</g>`;
    s += L(I.aura, "front");
    return s + `</svg>`;
  }

  /** 裝備縮圖：以目前捏臉造型穿上單一裝備，裁切到該部位 */
  function renderThumb(itemId, look) {
    const item = ITEM_MAP[itemId];
    if (!item) return "";
    return renderAvatar({ look, equipped: { [item.slot]: item.id } }, {
      viewBox: SLOT_VIEW[item.slot], noBg: item.slot !== "bg", cls: "av-thumb-svg", label: item.name
    });
  }
  function renderLookThumb(look) {
    return renderAvatar({ look, equipped: {} }, { viewBox: "34 14 172 156", noBg: true, cls: "av-thumb-svg", label: "造型預覽" });
  }

  /* ------------------------------------------------------------------
   * 六、資料層（localStorage）：解鎖、穿戴、星幣
   * ------------------------------------------------------------------ */
  const profile = () => (window.Store && window.Store.profile) || null;
  const stateKey = (p) => `ii:avatar:${p.cls}-${p.seat}-${p.name}`;
  const blankState = () => ({ v: 1, look: Object.assign({}, DEFAULT_LOOK), unlocked: [], equipped: {}, npcSolved: [] });
  let guestState = blankState();

  function getState() {
    const p = profile();
    if (!p) return guestState;
    let raw = null;
    try { raw = JSON.parse(localStorage.getItem(stateKey(p)) || "null"); } catch { raw = null; }
    const st = blankState();
    if (raw && typeof raw === "object") {
      Object.assign(st.look, raw.look || {});
      st.unlocked = Array.isArray(raw.unlocked) ? raw.unlocked.filter((id) => ITEM_MAP[id]) : [];
      st.npcSolved = Array.isArray(raw.npcSolved) ? raw.npcSolved.filter((id) => NPC_Q_IDS.has(id)) : [];
      const eq = raw.equipped && typeof raw.equipped === "object" ? raw.equipped : {};
      Object.keys(eq).forEach((slot) => {
        const item = ITEM_MAP[eq[slot]];
        if (item && item.slot === slot && st.unlocked.includes(item.id)) st.equipped[slot] = item.id;
      });
    }
    return st;
  }
  function saveState(st) {
    const p = profile();
    if (!p) { guestState = st; return; }
    try { localStorage.setItem(stateKey(p), JSON.stringify(st)); } catch (e) { console.warn(e); }
  }
  const emit = () => document.dispatchEvent(new CustomEvent("ii:avatar-changed"));

  /** 讀取既有測驗紀錄，追溯各難度通過單元數（任一次 ≥ 60 分即算通過） */
  function quizStats() {
    const evs = window.Store && window.Store.profile ? window.Store.events().filter((e) => e && e.type === "quiz") : [];
    const passed = { easy: new Set(), medium: new Set(), hard: new Set() };
    const cleared = new Set();
    evs.forEach((e) => {
      const unit = String(e.unit || e.unitId || "").trim();
      if (!unit) return;
      const raw = e.difficulty || e.quizDifficulty || (e.detail && e.detail.difficulty) || "single";
      const diff = raw === "single" ? "easy" : raw; // 早期無分級的單元測驗視同「易」
      if ((Number(e.score) || 0) >= PASS_SCORE) {
        if (passed[diff]) passed[diff].add(unit);
        cleared.add(unit);
      }
    });
    const sum = window.Store && window.Store.summarizeQuizEvents ? window.Store.summarizeQuizEvents(evs) : { totalScore: 0, crowns: 0, quizCount: 0 };
    const isl = Array.isArray(window.ISLANDS) ? window.ISLANDS : [];
    const totalUnits = isl.reduce((n, i) => n + ((i.sequence && i.sequence.length) || 0), 0) || 1;
    return {
      passed, cleared: cleared.size, totalUnits,
      totalScore: sum.totalScore || 0, crowns: sum.crowns || 0, quizCount: sum.quizCount || 0,
      maxScore: Math.max(isl.length, 1) * 300, maxCrowns: Math.max(isl.length, 1) * 3
    };
  }

  function wallet(st = getState(), qs = quizStats()) {
    const earned = { easy: qs.passed.easy.size, medium: qs.passed.medium.size, hard: qs.passed.hard.size };
    const used = { easy: 0, medium: 0, hard: 0 };
    let spent = 0;
    st.unlocked.forEach((id) => {
      const item = ITEM_MAP[id];
      if (!item) return;
      if (item.tier === "star") spent += item.price;
      else used[item.tier]++;
    });
    const avail = {};
    Object.keys(earned).forEach((k) => { avail[k] = Math.max(0, earned[k] - used[k]); });
    const coinsEarned = st.npcSolved.length * COIN_PER_QUESTION;
    return { earned, used, avail, coinsEarned, spent, coins: Math.max(0, coinsEarned - spent) };
  }

  const TITLES = [
    { min: 0, name: "見習領航員", icon: "🧭", color: "#7dd3fc" },
    { min: 300, name: "資料探索者", icon: "🔍", color: "#86efac" },
    { min: 900, name: "演算法騎士", icon: "⚔️", color: "#c4b5fd" },
    { min: 1600, name: "資訊島大魔導士", icon: "🔮", color: "#ffd166" }
  ];
  function title(score) {
    let idx = 0;
    TITLES.forEach((t, i) => { if (score >= t.min) idx = i; });
    const cur = TITLES[idx], next = TITLES[idx + 1] || null;
    return { ...cur, level: idx + 1, next, need: next ? next.min - score : 0, pct: next ? Math.round(((score - cur.min) / (next.min - cur.min)) * 100) : 100 };
  }

  function unlock(id) {
    const item = ITEM_MAP[id];
    if (!item) return { ok: false, msg: "找不到這件裝備。" };
    if (!profile()) return { ok: false, msg: "請先登入探險護照，才能解鎖裝備喔！" };
    const st = getState();
    if (st.unlocked.includes(id)) return { ok: true, already: true };
    const w = wallet(st);
    if (item.tier === "star") {
      if (w.coins < item.price) return { ok: false, msg: `⭐ 探索星幣不足，還差 ${item.price - w.coins} 枚！去 NPC 島答題賺星幣吧。` };
    } else if (w.avail[item.tier] < 1) {
      const t = TIERS[item.tier];
      return { ok: false, msg: `🎟️ ${t.ticket}不足！再通過 1 個單元的「${t.diffName}」測驗即可獲得。` };
    }
    st.unlocked.push(id);
    st.equipped[item.slot] = id;
    saveState(st);
    emit();
    return { ok: true, item };
  }
  function toggleEquip(id) {
    const item = ITEM_MAP[id];
    const st = getState();
    if (!item || !st.unlocked.includes(id)) return { ok: false, msg: "這件裝備尚未解鎖。" };
    const wearing = st.equipped[item.slot] === id;
    if (wearing) delete st.equipped[item.slot];
    else st.equipped[item.slot] = id;
    saveState(st);
    emit();
    return { ok: true, equipped: !wearing, item };
  }
  function setLook(key, val) {
    const st = getState();
    st.look[key] = val;
    saveState(st);
    emit();
  }

  /* ------------------------------------------------------------------
   * 七、頁面內 Toast 提示（取代 alert / confirm / prompt）
   * ------------------------------------------------------------------ */
  let toastStack = null;
  function toast(msg, type = "info", ms = 2800) {
    if (!toastStack) {
      toastStack = document.createElement("div");
      toastStack.className = "av-toast-stack";
      toastStack.setAttribute("role", "status");
      toastStack.setAttribute("aria-live", "polite");
      document.body.appendChild(toastStack);
    }
    const el = document.createElement("div");
    el.className = `av-toast av-toast-${type}`;
    el.textContent = msg;
    toastStack.appendChild(el);
    requestAnimationFrame(() => el.classList.add("show"));
    setTimeout(() => {
      el.classList.remove("show");
      setTimeout(() => el.remove(), 350);
    }, ms);
  }

  /* ------------------------------------------------------------------
   * 八、NPC 島「⭐ 領航員隨堂快問快答」題庫（7 島 × 4 題 = 28 題）
   * ------------------------------------------------------------------ */
  const TF = ["⭕ 正確", "❌ 錯誤"];
  const NPC_QUIZ = {
    "quantum-cafe": [
      { id: "cafe-1", type: "tf", q: "量子電腦的「量子位元（qubit）」可以同時處於 0 與 1 的疊加狀態。", answer: 0, explain: "沒錯！疊加態讓量子電腦能同時探索多種可能，特別適合某些特定的運算問題。" },
      { id: "cafe-2", type: "single", q: "咖啡廳點餐採「先來先服務」，最像哪一種資料結構？", options: ["堆疊 Stack", "佇列 Queue", "樹 Tree", "圖 Graph"], answer: 1, explain: "佇列（Queue）是先進先出（FIFO），就像排隊點咖啡一樣！" },
      { id: "cafe-3", type: "tf", q: "1 GB 剛好等於 1000 KB。", answer: 1, explain: "差很多！1 GB ≈ 1024 MB ≈ 1024 × 1024 KB，大約一百萬 KB。" },
      { id: "cafe-4", type: "single", q: "沙漏倒數時要「重複檢查時間到了沒」，程式中最適合用哪種結構？", options: ["註解", "迴圈", "變數命名", "字型設定"], answer: 1, explain: "迴圈可以反覆執行同一段指令，直到條件滿足（時間到）才停止。" }
    ],
    observatory: [
      { id: "obs-1", type: "single", q: "在 1～100 猜數字，每次只告訴你「太大／太小」，最有效率的策略是？", options: ["從 1 依序往上猜", "每次猜剩餘範圍的中間值", "完全隨機亂猜", "只猜偶數"], answer: 1, explain: "這就是「二分搜尋法」！每次排除一半，最多 7 次就能猜中。" },
      { id: "obs-2", type: "tf", q: "GPS 衛星定位需要同時接收多顆衛星的訊號，才能算出你的位置。", answer: 0, explain: "正確！通常至少需要 4 顆衛星的訊號，才能計算出經緯度、高度與時間。" },
      { id: "obs-3", type: "single", q: "二進位數字 1011 換成十進位是多少？", options: ["9", "10", "11", "13"], answer: 2, explain: "1×8 + 0×4 + 1×2 + 1×1 = 11。" },
      { id: "obs-4", type: "tf", q: "一個好的演算法必須能在「有限的步驟」內結束。", answer: 0, explain: "正確！「有限性」是演算法的基本特性之一，不能無止盡地執行下去。" }
    ],
    "bottle-post": [
      { id: "post-1", type: "single", q: "被譽為「世界上第一位程式設計師」，曾為分析機寫下演算法的是誰？", options: ["艾達・勒芙蕾絲", "愛迪生", "牛頓", "達文西"], answer: 0, explain: "Ada Lovelace 在 19 世紀就為巴貝奇的分析機寫出演算法，後來還有程式語言以她命名！" },
      { id: "post-2", type: "tf", q: "電子郵件地址中的「@」用來分隔「使用者名稱」與「郵件伺服器網域」。", answer: 0, explain: "正確！例如 student@school.edu.tw，@ 後面就是郵件伺服器的網域名稱。" },
      { id: "post-3", type: "single", q: "「Bug（程式錯誤）」這個詞有個有名的故事，工程師曾在電腦裡發現了什麼？", options: ["一隻飛蛾", "一隻老鼠", "一片樹葉", "一根頭髮"], answer: 0, explain: "1947 年，工程師在 Mark II 電腦的繼電器裡找到一隻飛蛾，還把牠貼進了工作日誌！" },
      { id: "post-4", type: "single", q: "網址開頭「https」中的「s」代表什麼意思？", options: ["Speed 速度", "Secure 安全加密", "Server 伺服器", "Simple 簡易"], answer: 1, explain: "s 代表 Secure，表示傳輸內容經過加密，比較不容易被竊聽。" }
    ],
    "fishing-pier": [
      { id: "fish-1", type: "tf", q: "收到「包裹配送失敗，請點連結重新填寫信用卡」的簡訊，應該立刻點擊處理。", answer: 1, explain: "這是常見的釣魚簡訊！請直接到官方 App 或網站查詢，不要點陌生連結。" },
      { id: "fish-2", type: "single", q: "下列哪一組密碼最安全？", options: ["123456", "20120101（生日）", "Fish!Sea7#Moon", "password"], answer: 2, explain: "混合大小寫、數字與符號，且夠長、不含個資的密碼最不容易被破解。" },
      { id: "fish-3", type: "single", q: "「雙重驗證（2FA）」主要的功用是什麼？", options: ["讓網路速度變快", "多一道驗證，防止帳號被盜", "自動備份照片", "讓手機更省電"], answer: 1, explain: "就算密碼外洩，壞人沒有你的第二道驗證碼也登不進去！" },
      { id: "fish-4", type: "tf", q: "在咖啡廳的公共 Wi-Fi 下登入網路銀行完全沒有風險。", answer: 1, explain: "公共 Wi-Fi 可能被有心人監聽，處理重要帳號時建議改用行動網路。" }
    ],
    "music-box": [
      { id: "music-1", type: "single", q: "聲音數位化時，「每秒對聲波量測的次數」稱為什麼？", options: ["取樣頻率", "螢幕解析度", "音量大小", "檔案名稱"], answer: 0, explain: "取樣頻率越高，越能還原聲音細節，CD 音質是每秒 44,100 次！" },
      { id: "music-2", type: "tf", q: "MP3 是一種「有損壓縮」的音訊格式。", answer: 0, explain: "正確！MP3 會刪去人耳不易察覺的聲音資訊，換取更小的檔案。" },
      { id: "music-3", type: "single", q: "紅白機 8-bit 遊戲音樂常用、聲音清脆明亮的基本波形是？", options: ["方波 Square Wave", "真人錄音", "白噪音", "立體環繞音"], answer: 0, explain: "方波聲音明亮有穿透力，是復古遊戲主旋律的招牌音色！" },
      { id: "music-4", type: "tf", q: "取樣的「位元深度」越高，能記錄的音量層次就越細膩。", answer: 0, explain: "正確！16 位元可以記錄 65,536 個音量層次，比 8 位元的 256 層細膩許多。" }
    ],
    greenhouse: [
      { id: "green-1", type: "single", q: "溫室自動灑水系統要偵測「土壤是否乾燥」，需要哪種裝置？", options: ["濕度感測器", "喇叭", "螢幕", "滑鼠"], answer: 0, explain: "感測器負責「輸入」環境資料，再交給程式判斷是否啟動灑水。" },
      { id: "green-2", type: "tf", q: "資料中心是耗電大戶，因此散熱與節能設計非常重要。", answer: 0, explain: "正確！許多資料中心會用自然冷卻、再生能源等方式減少碳排放。" },
      { id: "green-3", type: "single", q: "家裡用不到的舊手機，最環保的處理方式是？", options: ["丟進一般垃圾桶", "交給合格的回收管道", "埋在花園裡", "直接燒掉"], answer: 1, explain: "電子產品含有重金屬與可回收的貴金屬，應交給合格回收單位處理。" },
      { id: "green-4", type: "tf", q: "關閉不用的分頁、把螢幕亮度調低，可以讓筆電更省電。", answer: 0, explain: "正確！螢幕與背景程式都很耗電，小習慣也能累積大能量。" }
    ],
    lighthouse: [
      { id: "light-1", type: "single", q: "燈塔用閃光的「長、短」組合傳遞訊息，最像哪一種編碼？", options: ["摩斯電碼", "JPEG 圖片", "HTML 網頁", "MP4 影片"], answer: 0, explain: "摩斯電碼用長短訊號組合代表字母，是早期重要的數位通訊方式！" },
      { id: "light-2", type: "single", q: "把網址（如 google.com）轉換成 IP 位址的網路服務是？", options: ["DNS", "USB", "CPU", "PDF"], answer: 0, explain: "DNS 就像網路的電話簿，幫你把好記的網址翻譯成電腦看得懂的 IP。" },
      { id: "light-3", type: "tf", q: "最短路徑演算法可以幫導航 App 找出兩地之間較快的路線。", answer: 0, explain: "正確！像 Dijkstra 演算法就是經典的最短路徑演算法。" },
      { id: "light-4", type: "single", q: "網路傳輸時，資料會被切成許多小單位分別傳送，這些小單位稱為？", options: ["封包", "像素", "圖層", "資料夾"], answer: 0, explain: "封包各自找路抵達目的地，再依序組合回完整的資料。" }
    ]
  };
  const NPC_Q_IDS = new Set(Object.values(NPC_QUIZ).flat().map((q) => q.id));

  function answerNpc(qid) {
    if (!NPC_Q_IDS.has(qid)) return { ok: false, gained: 0 };
    if (!profile()) return { ok: false, guest: true, gained: 0 };
    const st = getState();
    if (st.npcSolved.includes(qid)) return { ok: true, gained: 0 };
    st.npcSolved.push(qid);
    saveState(st);
    emit();
    return { ok: true, gained: COIN_PER_QUESTION };
  }

  /** 掛載到 NPC 島互動視窗內的快問快答小元件 */
  function mountNpcQuiz(host, islandId) {
    if (!host) return;
    const set = NPC_QUIZ[islandId];
    if (!set) { host.innerHTML = ""; host.hidden = true; return; }
    host.hidden = false;
    const solvedSet = () => new Set(getState().npcSolved);
    let idx = Math.max(0, set.findIndex((q) => !solvedSet().has(q.id)));

    function render() {
      const solved = solvedSet();
      const doneCount = set.filter((q) => solved.has(q.id)).length;
      const q = set[idx];
      const isDone = solved.has(q.id);
      const coins = wallet().coins;
      const opts = q.type === "tf" ? TF : q.options;
      host.innerHTML = `<div class="npcq npc-fade-in">
        <div class="npcq-head">
          <span class="npcq-title">⭐ 領航員隨堂快問快答</span>
          <span class="npcq-prog">本島已破解 ${doneCount} / ${set.length}</span>
          <span class="npcq-coin" data-coin>⭐ <b>${coins}</b></span>
        </div>
        <div class="npcq-dots">${set.map((x, i) => `<span class="${solved.has(x.id) ? "ok" : ""}${i === idx ? " cur" : ""}"></span>`).join("")}</div>
        <p class="npcq-q"><span class="npcq-type">${q.type === "tf" ? "是非題" : "選擇題"}</span>${esc(q.q)}
          ${isDone ? `<span class="npcq-done">✔ 星幣已領取</span>` : `<span class="npcq-reward">答對 +${COIN_PER_QUESTION} ⭐</span>`}</p>
        <div class="npcq-opts${q.type === "tf" ? " is-tf" : ""}">${opts.map((o, i) => `<button type="button" class="npcq-opt" data-i="${i}">${esc(o)}</button>`).join("")}</div>
        <div class="npcq-fb" hidden></div>
        <div class="npcq-actions">
          ${profile() ? "" : `<span class="npcq-hint">🔒 登入探險護照後答對才會累積星幣喔</span>`}
          <button type="button" class="npc-action-btn npcq-next">下一題 ➜</button>
        </div>
      </div>`;
      host.querySelectorAll(".npcq-opt").forEach((btn) => btn.addEventListener("click", () => choose(Number(btn.dataset.i))));
      host.querySelector(".npcq-next").addEventListener("click", next);
    }

    function choose(i) {
      const q = set[idx];
      const ok = i === q.answer;
      host.querySelectorAll(".npcq-opt").forEach((b, bi) => {
        b.disabled = true;
        if (bi === q.answer) b.classList.add("is-correct");
        else if (bi === i && !ok) b.classList.add("is-wrong");
      });
      const fb = host.querySelector(".npcq-fb");
      fb.hidden = false;
      fb.className = `npcq-fb ${ok ? "is-ok" : "is-warn"}`;
      let gainedHtml = "";
      if (ok) {
        const r = answerNpc(q.id);
        if (r.gained) {
          gainedHtml = `<b class="npcq-gain">🌟 獲得 +${r.gained} 探索星幣！</b>`;
          coinPop(host.querySelector("[data-coin]"), r.gained);
          toast(`🌟 答對了！獲得 ${r.gained} 枚探索星幣（目前 ${wallet().coins} ⭐）`, "coin");
          if (typeof window.confetti === "function") { try { window.confetti({ particleCount: 36, spread: 60, origin: { y: 0.6 }, colors: ["#ffd166", "#fff59d", "#ffb703"] }); } catch {} }
        } else if (r.guest) {
          gainedHtml = `<small>（登入後答對即可獲得星幣）</small>`;
        } else {
          gainedHtml = `<small>（這題的星幣先前已領取過囉）</small>`;
        }
      }
      fb.innerHTML = `<div class="npcq-fb-head">${ok ? "🎉 答對了！" : "💡 差一點點！"} ${gainedHtml}</div><p>${esc(q.explain)}</p>`;
      const doneCount = set.filter((x) => solvedSet().has(x.id)).length;
      const dots = host.querySelectorAll(".npcq-dots span");
      if (ok && dots[idx]) dots[idx].classList.add("ok");
      host.querySelector(".npcq-prog").textContent = `本島已破解 ${doneCount} / ${set.length}`;
      if (ok && doneCount === set.length) setTimeout(() => toast("🏆 本島快問快答全數破解！去其他 NPC 島繼續探索吧！", "ok"), 900);
      if (!ok) host.querySelector(".npcq-next").textContent = "換一題 ➜";
    }

    function next() {
      const solved = solvedSet();
      for (let step = 1; step <= set.length; step++) {
        const j = (idx + step) % set.length;
        if (!solved.has(set[j].id)) { idx = j; render(); return; }
      }
      idx = (idx + 1) % set.length;
      render();
    }

    render();
  }

  function coinPop(anchor, n) {
    if (!anchor) return;
    anchor.classList.remove("bump");
    void anchor.offsetWidth;
    anchor.classList.add("bump");
    const b = anchor.querySelector("b");
    if (b) b.textContent = wallet().coins;
    const pop = document.createElement("span");
    pop.className = "av-coin-pop";
    pop.textContent = `+${n} ⭐`;
    anchor.appendChild(pop);
    setTimeout(() => pop.remove(), 1300);
  }

  /* ------------------------------------------------------------------
   * 九、角色戰績卡（SVG → Canvas → PNG）
   * ------------------------------------------------------------------ */
  function loadSvgImage(svg) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("SVG 轉圖失敗"));
      img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
    });
  }
  function rr(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }
  const FONT = '"Noto Sans TC", "Microsoft JhengHei", "PingFang TC", sans-serif';

  async function downloadCard() {
    const p = profile();
    if (!p) { toast("請先登入探險護照！", "warn"); return false; }
    const st = getState(), qs = quizStats(), w = wallet(st, qs), t = title(qs.totalScore);
    const bgId = st.equipped.bg;
    const theme = bgId === "bg_cyber" ? { a: "#12052e", b: "#4a0d6b", ac: "#ff4fd8", tx: "#ffffff" }
      : bgId === "bg_sakura" ? { a: "#ff9cc2", b: "#7cc8ef", ac: "#ffffff", tx: "#ffffff" }
      : { a: "#0b3a66", b: "#127a8f", ac: "#ffd166", tx: "#ffffff" };
    const W = 1080, H = 1500;
    const cv = document.createElement("canvas");
    cv.width = W; cv.height = H;
    const ctx = cv.getContext("2d");
    try { if (document.fonts && document.fonts.load) await document.fonts.load(`700 40px ${FONT}`); } catch {}

    const g = ctx.createLinearGradient(0, 0, W, H);
    g.addColorStop(0, theme.a); g.addColorStop(1, theme.b);
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    for (let i = 0; i < 70; i++) {
      ctx.fillStyle = `rgba(255,255,255,${0.15 + ((i * 37) % 50) / 100})`;
      ctx.beginPath(); ctx.arc((i * 151) % W, (i * 97) % H, 1.5 + (i % 3), 0, Math.PI * 2); ctx.fill();
    }
    rr(ctx, 30, 30, W - 60, H - 60, 44);
    ctx.lineWidth = 6; ctx.strokeStyle = theme.ac; ctx.stroke();

    ctx.textAlign = "center"; ctx.fillStyle = theme.tx;
    ctx.font = `700 26px ${FONT}`; ctx.globalAlpha = 0.8;
    ctx.fillText("INFO ISLANDS · ADVENTURER CARD", W / 2, 96); ctx.globalAlpha = 1;
    ctx.font = `900 54px ${FONT}`;
    ctx.fillText("🏝️ 資訊課程島 冒險者戰績卡", W / 2, 166);

    const AX = 230, AY = 200, AW = 620, AH = 775;
    const img = await loadSvgImage(renderAvatar(st, { width: AW, height: AH }));
    ctx.save(); rr(ctx, AX, AY, AW, AH, 36); ctx.clip(); ctx.drawImage(img, AX, AY, AW, AH); ctx.restore();
    rr(ctx, AX, AY, AW, AH, 36); ctx.lineWidth = 8; ctx.strokeStyle = "#ffffff"; ctx.stroke();

    const badgeTxt = `${t.icon} Lv.${t.level} ${t.name}`;
    ctx.font = `900 46px ${FONT}`;
    const bw = ctx.measureText(badgeTxt).width + 90;
    rr(ctx, W / 2 - bw / 2, AY + AH - 40, bw, 84, 42);
    ctx.fillStyle = "#1b1446"; ctx.fill(); ctx.lineWidth = 5; ctx.strokeStyle = t.color; ctx.stroke();
    ctx.fillStyle = t.color; ctx.fillText(badgeTxt, W / 2, AY + AH + 16);

    const g7 = { 7: "七", 8: "八", 9: "九" }[String(p.cls)[0]] || "";
    ctx.fillStyle = theme.tx; ctx.font = `900 50px ${FONT}`;
    ctx.fillText(p.name, W / 2, 1110);
    ctx.font = `500 30px ${FONT}`; ctx.globalAlpha = 0.9;
    ctx.fillText(`${g7}年 ${Number(String(p.cls).slice(1))} 班 ${p.seat} 號`, W / 2, 1156); ctx.globalAlpha = 1;

    const stats = [
      ["🏝️ 單元開拓", `${qs.cleared} / ${qs.totalUnits}`],
      ["👑 滿分皇冠", `${qs.crowns}`],
      ["📊 總積分", `${qs.totalScore}`]
    ];
    const sw = 290, gap = 25, sx0 = (W - (sw * 3 + gap * 2)) / 2;
    stats.forEach(([lab, val], i) => {
      const x = sx0 + i * (sw + gap);
      rr(ctx, x, 1196, sw, 140, 28);
      ctx.fillStyle = "rgba(255,255,255,.16)"; ctx.fill();
      ctx.lineWidth = 2; ctx.strokeStyle = "rgba(255,255,255,.45)"; ctx.stroke();
      ctx.fillStyle = theme.tx; ctx.font = `700 28px ${FONT}`; ctx.fillText(lab, x + sw / 2, 1246);
      ctx.fillStyle = theme.ac === "#ffffff" ? "#fff6a8" : theme.ac; ctx.font = `900 50px ${FONT}`; ctx.fillText(val, x + sw / 2, 1310);
    });

    const gear = Object.values(st.equipped).map((id) => ITEM_MAP[id]).filter(Boolean).length;
    ctx.fillStyle = theme.tx; ctx.font = `600 28px ${FONT}`;
    ctx.fillText(`⚔️ 已收藏裝備 ${st.unlocked.length} / ${ITEMS.length} 件 · 穿戴中 ${gear} 件 · ⭐ 探索星幣 ${w.coins}`, W / 2, 1392);
    ctx.font = `500 24px ${FONT}`; ctx.globalAlpha = 0.75;
    ctx.fillText(`發行日期 ${new Date().toLocaleDateString("zh-TW")} · 資訊課程島 Info Islands`, W / 2, 1436); ctx.globalAlpha = 1;

    const blob = await new Promise((res) => cv.toBlob(res, "image/png"));
    if (!blob) throw new Error("PNG 匯出失敗");
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `角色戰績卡_${p.cls}-${p.seat}_${p.name}.png`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
    return true;
  }

  window.AvatarSystem = {
    ITEMS, ITEM_MAP, TIERS, SLOT_NAME, HAIR_STYLES, HAIR_COLORS, FACES, TITLES, NPC_QUIZ, COIN_PER_QUESTION,
    renderAvatar, renderThumb, renderLookThumb,
    getState, quizStats, wallet, title, unlock, toggleEquip, setLook, answerNpc,
    toast, mountNpcQuiz, downloadCard, esc
  };
})();
