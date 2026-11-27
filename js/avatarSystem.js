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
  const rg = (id, stops, cx = "45%", cy = "35%", r = "65%") => `<radialGradient id="${id}" cx="${cx}" cy="${cy}" r="${r}">${stops.map(([o, c, op]) => `<stop offset="${o}" stop-color="${c}"${op != null ? ` stop-opacity="${op}"` : ""}/>`).join("")}</radialGradient>`;

  /* ------------------------------------------------------------------
   * 二、熱門動漫招牌特徵造型（8 款角色預設 / 髮色 / 5 款表情）
   * ------------------------------------------------------------------ */
  const HAIR_STYLES = [
    { id: "male_gojo", group: "male", name: "白髮眼罩咒術師", defaultColor: "silver", baseHex: "#F1F5F9" },
    { id: "male_tanjiro", group: "male", name: "火焰傷紋劍士", defaultColor: "crimson", baseHex: "#18181B" },
    { id: "male_bakugo", group: "male", name: "爆破英雄少年", defaultColor: "gold", baseHex: "#FACC15" },
    { id: "male_hinata", group: "male", name: "橘子頭王牌少年", defaultColor: "orange", baseHex: "#FB923C" },
    { id: "female_frieren", group: "female", name: "銀髮精靈魔法使", defaultColor: "silver", baseHex: "#E2E8F0" },
    { id: "female_anya", group: "female", name: "讀心超能力少女", defaultColor: "pink", baseHex: "#F9A8D4" },
    { id: "female_nezuko", group: "female", name: "竹筒鬼殺隊少女", defaultColor: "flameblack", baseHex: "#18181B" },
    { id: "female_miku", group: "female", name: "虛擬歌姬雙馬尾", defaultColor: "teal", baseHex: "#2DD4BF" }
  ];
  const HAIR_COLORS = [
    { id: "silver", name: "純銀雪白", top: "#FFFFFF", c: "#F1F5F9", s: "#B8C7D9", hl: "#38BDF8", shine: "#FFFFFF" },
    { id: "crimson", name: "黑紅暗焰", top: "#141418", c: "#27161B", bot: "#991B1B", s: "#450A0A", hl: "#EF4444", shine: "#F87171" },
    { id: "gold", name: "耀眼金黃", top: "#FEF08A", c: "#FACC15", s: "#CA8A04", hl: "#F97316", shine: "#FEF9C3" },
    { id: "orange", name: "活力亮橘", top: "#FDBA74", c: "#FB923C", s: "#C2410C", hl: "#18181B", shine: "#FFEDD5" },
    { id: "pink", name: "櫻花粉晶", top: "#FCE7F3", c: "#F9A8D4", s: "#DB2777", hl: "#FACC15", shine: "#FFF1F7" },
    { id: "flameblack", name: "烏黑橘焰", top: "#141418", c: "#1F1B24", mid: "#FB7185", bot: "#F97316", s: "#EA580C", hl: "#F472B6", shine: "#94A3B8" },
    { id: "teal", name: "湖水藍綠", top: "#5EEAD4", c: "#2DD4BF", s: "#0F766E", hl: "#EC4899", shine: "#CCFBF1" },
    { id: "black", name: "星空黑", top: "#484D78", c: "#2B2E4D", s: "#17182B", hl: "#FF4D8D", shine: "#98A0E6" }
  ];
  const FACES = [
    { id: "calm", name: "呆萌平靜臉" },
    { id: "happy", name: "彎月開心笑" },
    { id: "angry", name: "鼓臉生氣氣" },
    { id: "surprised", name: "驚訝 O 型嘴" },
    { id: "teary", name: "委屈淚汪汪" }
  ];
  const LEGACY_HAIR_MAP = {
    male_jinwoo: "male_tanjiro",
    male_isagi: "male_hinata",
    male_okarun: "male_bakugo",
    female_ai: "female_miku",
    female_bocchi: "female_anya",
    female_momo: "female_nezuko",
    male_fluffy: "male_tanjiro",
    male_spiky: "male_gojo",
    male_comma: "male_hinata",
    male_wavy: "male_bakugo",
    female_bob: "female_anya",
    female_ponytail: "female_miku",
    female_buns: "female_frieren",
    female_longwavy: "female_nezuko",
    short: "male_hinata",
    ponytail: "female_miku",
    wavy: "male_bakugo",
    twintail: "female_frieren"
  };
  const LEGACY_FACE_MAP = {
    smile: "calm",
    cool: "calm",
    stars: "happy"
  };
  const DEFAULT_LOOK = { hair: "male_gojo", hairColor: "silver", face: "calm" };

  function getHairPalette(hairId, hairColorId) {
    const base = HAIR_COLORS.find((x) => x.id === hairColorId) || HAIR_COLORS[0];
    if (hairColorId === "silver" && hairId === "female_frieren") {
      return { ...base, top: "#F8FAFC", c: "#E2E8F0", s: "#94A3B8", hl: "#EF4444" };
    }
    return base;
  }

  function normalizeLook(rawLook) {
    const src = rawLook && typeof rawLook === "object" ? rawLook : {};
    const mappedLegacy = LEGACY_HAIR_MAP[src.hair];
    const rawHair = mappedLegacy || src.hair;
    const styleObj = HAIR_STYLES.find((x) => x.id === rawHair) || HAIR_STYLES[0];
    const hair = styleObj.id;
    const rawFace = LEGACY_FACE_MAP[src.face] || src.face;
    const face = FACES.some((x) => x.id === rawFace) ? rawFace : DEFAULT_LOOK.face;
    const hasValidColor = HAIR_COLORS.some((x) => x.id === src.hairColor);
    const hairColor = (!mappedLegacy && hasValidColor) ? src.hairColor : styleObj.defaultColor;
    return { hair, hairColor, face };
  }

  // 帽子類型判斷：覆蓋頭頂型（貝雷帽、連帽兜）vs 頭飾型（髮箍、皇冠、耳機、髮夾）
  const COVER_HATS = new Set(["strawberry_beret", "hacker_hood"]);

  const shine = (h, d = "M84 52 Q112 40 146 47") => `<path d="${d}" fill="none" stroke="${h.shine}" stroke-width="4" stroke-linecap="round" opacity=".52"/>`;
  const hairFill = (c) => `url(#${c.u}-hair)`;
  const hairBackFill = (c) => `url(#${c.u}-hairBack)`;

  // 共用高髮際線頭頂輪廓（底部弧線向上收於 y=56~60，絕不遮擋額頭，由各髮型自行決定前額造型）
  const openTopCap = (h, c, headId, shinePath) => COVER_HATS.has(headId)
    ? `<path d="M58 88 Q62 46 120 44 Q178 46 182 88 Q166 59 120 57 Q74 59 58 88 Z" fill="${hairFill(c)}" stroke="${OL}" stroke-width="2.1"/>`
    : `<path d="M57 90 Q58 42 120 40 Q182 42 183 90 Q168 58 120 56 Q72 58 57 90 Z" fill="${hairFill(c)}" stroke="${OL}" stroke-width="2.2"/>
       ${shinePath ? shine(h, shinePath) : ""}`;

  // 8 款招牌動漫角色立體雕塑髮型 ＋ 專屬髮飾
  const HAIR = {
    // 1｜白髮眼罩咒術師（五條悟特徵）：純銀白髮、向上放射狀多層次銳利沖天刺蝟髮束
    male_gojo: {
      back: (h, c) => `<path d="M54 114 L42 82 L56 68 L48 40 L76 46 L88 14 L112 36 L128 10 L144 36 L172 16 L168 46 L195 42 L182 70 L196 84 L184 114 Q176 134 164 138 L76 138 Q64 134 54 114Z" fill="${hairBackFill(c)}" stroke="${OL}" stroke-width="2.3" stroke-linejoin="round"/>`,
      crown: (h, c, headId) => COVER_HATS.has(headId)
        ? openTopCap(h, c, headId)
        : `<path d="M55 90 L42 64 L62 62 L52 34 L80 42 L91 11 L112 35 L127 9 L142 35 L170 15 L167 45 L196 39 L179 68 L193 79 L184 92 Q166 62 120 59 Q74 62 55 90 Z" fill="${hairFill(c)}" stroke="${OL}" stroke-width="2.3" stroke-linejoin="round"/>
          <path d="M94 26 L106 46 M127 22 L132 45 M160 28 L153 49 M66 44 L78 55" fill="none" stroke="${h.shine}" stroke-width="2.6" stroke-linecap="round" opacity=".75"/>
          <path d="M108 38 L114 54 M138 38 L136 53" fill="none" stroke="${h.s}" stroke-width="1.6" stroke-linecap="round" opacity=".55"/>`,
      sideburns: (h, c) => `<path d="M56 84 L48 110 L61 128 L68 96 Z" fill="${hairFill(c)}" stroke="${OL}" stroke-width="2" stroke-linejoin="round"/>
        <path d="M184 84 L192 110 L179 128 L172 96 Z" fill="${hairFill(c)}" stroke="${OL}" stroke-width="2" stroke-linejoin="round"/>`,
      bangs: (h, c, headId) => COVER_HATS.has(headId)
        ? `<path d="M63 83 Q78 58 120 56 Q162 58 177 83 Q156 64 120 62 Q84 64 63 83 Z" fill="${hairFill(c)}" stroke="${OL}" stroke-width="1.9" stroke-linejoin="round"/>`
        : `<path d="M60 85 Q74 58 120 55 Q166 58 180 85 Q158 64 146 66 L151 48 L136 62 L123 42 L113 61 L96 45 L99 63 Q80 65 60 85 Z" fill="${hairFill(c)}" stroke="${OL}" stroke-width="2.1" stroke-linejoin="round"/>`
    },

    // 2｜火焰傷紋劍士（竈門炭治郎特徵）：黑紅漸層碎短髮（向後上方微翹層次髮束）＋額頭左上方暗紅色火焰狀斑紋傷疤
    male_tanjiro: {
      back: (h, c) => `<path d="M52 114 L42 94 L55 82 Q52 44 120 38 Q188 44 185 82 L198 94 L188 114 Q178 134 166 138 L74 138 Q62 134 52 114Z" fill="${hairBackFill(c)}" stroke="${OL}" stroke-width="2.3" stroke-linejoin="round"/>`,
      crown: (h, c, headId) => COVER_HATS.has(headId)
        ? openTopCap(h, c, headId)
        : `<path d="M55 90 L46 72 L62 66 L56 42 L82 47 L96 24 L115 41 L134 22 L149 42 L176 30 L170 53 L192 52 L178 72 L185 90 Q166 60 120 58 Q74 60 55 90 Z" fill="${hairFill(c)}" stroke="${OL}" stroke-width="2.3" stroke-linejoin="round"/>
          <path d="M98 35 L108 50 M135 32 L139 49 M168 38 L158 54" fill="none" stroke="${h.shine}" stroke-width="2.2" stroke-linecap="round" opacity=".65"/>`,
      sideburns: (h, c) => `<path d="M57 84 L48 108 L61 126 L68 96 Z" fill="${hairFill(c)}" stroke="${OL}" stroke-width="2" stroke-linejoin="round"/>
        <path d="M183 84 L192 108 L179 126 L172 96 Z" fill="${hairFill(c)}" stroke="${OL}" stroke-width="2" stroke-linejoin="round"/>`,
      bangs: (h, c) => `
        <path d="M80 68 L85 62 L88 68 L94 61 L97 69 L102 72 L96 76 L99 84 L91 79 L87 86 L83 78 L77 80 L81 73 Z" fill="#991b1b" stroke="#450a0a" stroke-width="1.2" stroke-linejoin="round"/>
        <path d="M58 88 Q68 53 120 52 Q172 53 182 88 L170 72 L162 86 L149 66 L138 89 L126 65 L117 88 L106 64 L96 72 Q82 58 70 78 Z" fill="${hairFill(c)}" stroke="${OL}" stroke-width="2.1" stroke-linejoin="round"/>
        <path d="M114 62 L117 82 M141 62 L139 81" fill="none" stroke="${h.shine}" stroke-width="1.6" stroke-linecap="round" opacity=".55"/>`
    },

    // 3｜爆破英雄少年（爆豪勝己特徵）：耀眼金黃向四周炸裂張開的多層次尖刺刺蝟頭
    male_bakugo: {
      back: (h, c) => `<path d="M50 112 L32 88 L50 74 L34 46 L68 46 L76 14 L106 34 L120 6 L134 34 L164 14 L172 46 L206 46 L190 74 L208 88 L190 112 Q178 134 166 138 L74 138 Q62 134 50 112Z" fill="${hairBackFill(c)}" stroke="${OL}" stroke-width="2.3" stroke-linejoin="round"/>`,
      crown: (h, c, headId) => COVER_HATS.has(headId)
        ? openTopCap(h, c, headId)
        : `<path d="M52 90 L33 66 L56 62 L38 32 L72 40 L82 10 L108 33 L121 6 L136 33 L164 10 L170 40 L204 34 L184 64 L206 72 L188 92 Q168 62 120 59 Q72 62 52 90 Z" fill="${hairFill(c)}" stroke="${OL}" stroke-width="2.3" stroke-linejoin="round"/>
          <path d="M86 24 L100 44 M121 19 L124 44 M156 24 L148 45 M56 44 L74 56 M182 44 L166 56" fill="none" stroke="${h.shine}" stroke-width="2.5" stroke-linecap="round" opacity=".75"/>`,
      sideburns: (h, c) => `<path d="M55 84 L41 106 L58 124 L68 96 Z" fill="${hairFill(c)}" stroke="${OL}" stroke-width="2" stroke-linejoin="round"/>
        <path d="M185 84 L199 106 L182 124 L172 96 Z" fill="${hairFill(c)}" stroke="${OL}" stroke-width="2" stroke-linejoin="round"/>`,
      bangs: (h, c) => `<path d="M57 86 Q68 54 120 52 Q172 54 183 86 L168 72 L160 88 L146 66 L136 86 L122 62 L114 88 L101 66 L90 88 L79 70 L68 85 Z" fill="${hairFill(c)}" stroke="${OL}" stroke-width="2.1" stroke-linejoin="round"/>`
    },

    // 4｜橘子頭王牌少年（日向翔陽特徵）：活力亮橘蓬鬆亂翹短髮＋頭頂俏皮橘子呆毛
    male_hinata: {
      back: (h, c) => `<path d="M52 116 Q44 92 54 74 Q48 44 120 38 Q192 44 186 74 Q196 92 188 116 Q178 134 166 138 L74 138 Q62 134 52 116Z" fill="${hairBackFill(c)}" stroke="${OL}" stroke-width="2.3" stroke-linejoin="round"/>`,
      crown: (h, c, headId) => {
        const tufts = `<g>
          <path d="M112 44 Q102 22 92 16 Q109 22 118 40 Z" fill="${hairFill(c)}" stroke="${OL}" stroke-width="2" stroke-linejoin="round"/>
          <path d="M123 43 Q132 16 146 14 Q134 25 129 42 Z" fill="${hairFill(c)}" stroke="${OL}" stroke-width="2" stroke-linejoin="round"/>
        </g>`;
        if (COVER_HATS.has(headId)) return `${tufts}${openTopCap(h, c, headId)}`;
        return `${tufts}<path d="M54 90 Q46 64 66 50 Q78 30 106 38 Q124 24 146 38 Q174 32 182 54 Q196 68 186 90 Q168 60 120 58 Q72 60 54 90 Z" fill="${hairFill(c)}" stroke="${OL}" stroke-width="2.3" stroke-linejoin="round"/>
          ${shine(h, "M84 48 Q116 37 148 46")}`;
      },
      sideburns: (h, c) => `<path d="M56 84 Q45 104 54 122 Q63 128 69 116 L67 90 Z" fill="${hairFill(c)}" stroke="${OL}" stroke-width="2" stroke-linejoin="round"/>
        <path d="M184 84 Q195 104 186 122 Q177 128 171 116 L173 90 Z" fill="${hairFill(c)}" stroke="${OL}" stroke-width="2" stroke-linejoin="round"/>`,
      bangs: (h, c) => `<path d="M57 88 Q66 53 120 52 Q174 53 183 88 Q169 78 160 88 Q149 69 138 89 Q126 68 117 92 Q106 68 95 88 Q83 68 73 86 Q64 78 57 88 Z" fill="${hairFill(c)}" stroke="${OL}" stroke-width="2.1" stroke-linejoin="round"/>`
    },

    // 5｜銀髮精靈魔法使（芙莉蓮特徵）：珍珠銀白髮、中分八字瀏海＋蓬鬆低雙馬尾（精靈尖耳與紅寶石耳環在 headBase）
    female_frieren: {
      back: (h, c) => `<g>
        <path d="M64 112 Q42 126 36 168 Q32 204 52 216 Q66 212 68 184 Q72 152 72 120 Z" fill="${hairFill(c)}" stroke="${OL}" stroke-width="2.2" stroke-linejoin="round"/>
        <path d="M176 112 Q198 126 204 168 Q208 204 188 216 Q174 212 172 184 Q168 152 168 120 Z" fill="${hairFill(c)}" stroke="${OL}" stroke-width="2.2" stroke-linejoin="round"/>
        <path d="M50 144 Q44 176 52 202 M190 144 Q196 176 188 202" fill="none" stroke="${h.s}" stroke-width="2" stroke-linecap="round" opacity=".55"/>
        <circle cx="63" cy="116" r="5" fill="#475569" stroke="${OL}" stroke-width="1.6"/>
        <circle cx="177" cy="116" r="5" fill="#475569" stroke="${OL}" stroke-width="1.6"/>
        <path d="M56 116 Q52 44 120 40 Q188 44 184 116 Q178 134 166 138 L74 138 Q62 134 56 116Z" fill="${hairBackFill(c)}" stroke="${OL}" stroke-width="2.3"/>
      </g>`,
      crown: (h, c, headId) => openTopCap(h, c, headId, COVER_HATS.has(headId) ? "" : "M80 51 Q120 41 160 51"),
      sideburns: (h, c) => `<path d="M57 86 Q50 116 61 144 Q69 138 69 112 Z" fill="${hairFill(c)}" stroke="${OL}" stroke-width="2" stroke-linejoin="round"/>
        <path d="M183 86 Q190 116 179 144 Q171 138 171 112 Z" fill="${hairFill(c)}" stroke="${OL}" stroke-width="2" stroke-linejoin="round"/>`,
      bangs: (h, c) => `<path d="M58 95 Q62 54 119 52 Q112 74 93 92 Q78 104 61 106 Z" fill="${hairFill(c)}" stroke="${OL}" stroke-width="2.1" stroke-linejoin="round"/>
        <path d="M182 95 Q178 54 121 52 Q128 74 147 92 Q162 104 179 106 Z" fill="${hairFill(c)}" stroke="${OL}" stroke-width="2.1" stroke-linejoin="round"/>
        <path d="M106 63 Q92 80 74 94 M134 63 Q148 80 166 94" fill="none" stroke="${h.shine}" stroke-width="2.2" stroke-linecap="round" opacity=".65"/>`
    },

    // 6｜讀心超能力少女（安妮亞特徵）：櫻花粉晶內彎鮑伯短髮＋微弧空氣齊瀏海＋頭頂黑底金邊圓錐形雙小角頭飾
    female_anya: {
      back: (h, c) => `<path d="M52 118 Q46 44 120 39 Q194 44 188 118 Q190 152 166 156 Q154 156 148 148 L92 148 Q86 156 74 156 Q50 152 52 118Z" fill="${hairBackFill(c)}" stroke="${OL}" stroke-width="2.3" stroke-linejoin="round"/>`,
      crown: (h, c, headId) => {
        const covered = COVER_HATS.has(headId);
        const hy = covered ? 45 : 46;
        const horns = `<g>
          <g transform="translate(${covered ? 68 : 76} ${hy}) rotate(-26)">
            <path d="M-11 4 L0 -26 L11 4 Z" fill="#18181b" stroke="#09090b" stroke-width="2" stroke-linejoin="round"/>
            <ellipse cx="0" cy="4" rx="12" ry="4.5" fill="#facc15" stroke="${OL}" stroke-width="1.6"/>
            <path d="M-5 -8 L5 -8" stroke="#facc15" stroke-width="2.2" stroke-linecap="round"/>
          </g>
          <g transform="translate(${covered ? 172 : 164} ${hy}) rotate(26)">
            <path d="M-11 4 L0 -26 L11 4 Z" fill="#18181b" stroke="#09090b" stroke-width="2" stroke-linejoin="round"/>
            <ellipse cx="0" cy="4" rx="12" ry="4.5" fill="#facc15" stroke="${OL}" stroke-width="1.6"/>
            <path d="M-5 -8 L5 -8" stroke="#facc15" stroke-width="2.2" stroke-linecap="round"/>
          </g>
        </g>`;
        return `${openTopCap(h, c, headId, covered ? "" : "M84 51 Q120 40 156 51")}${horns}`;
      },
      sideburns: (h, c) => `<path d="M54 86 Q46 122 59 147 Q69 152 74 140 Q67 122 68 94 Z" fill="${hairFill(c)}" stroke="${OL}" stroke-width="2.1" stroke-linejoin="round"/>
        <path d="M186 86 Q194 122 181 147 Q171 152 166 140 Q173 122 172 94 Z" fill="${hairFill(c)}" stroke="${OL}" stroke-width="2.1" stroke-linejoin="round"/>`,
      bangs: (h, c) => `<path d="M60 88 Q66 53 120 53 Q174 53 180 88 Q166 91 154 88 Q149 71 144 89 Q132 91 126 88 Q121 70 116 88 Q106 91 96 88 Q91 71 86 89 Q74 91 60 88 Z" fill="${hairFill(c)}" stroke="${OL}" stroke-width="2.1" stroke-linejoin="round"/>
        <path d="M78 70 L76 84 M106 67 L106 84 M134 67 L134 84 M162 70 L164 84" fill="none" stroke="${h.s}" stroke-width="1.4" stroke-linecap="round" opacity=".4"/>`
    },

    // 7｜竹筒鬼殺隊少女（竈門禰豆子特徵）：烏黑長捲髮＋髮尾漸層亮橘紅色＋左側頭頂淺粉色立體小蝴蝶結
    female_nezuko: {
      back: (h, c) => `<path d="M51 114 Q44 42 120 38 Q196 42 189 114 Q203 146 193 178 Q206 212 186 244 Q172 252 162 240 L78 240 Q68 252 54 244 Q34 212 47 178 Q37 146 51 114Z" fill="${hairBackFill(c)}" stroke="${OL}" stroke-width="2.3" stroke-linejoin="round"/>
        <path d="M55 156 Q44 186 58 214 Q48 228 62 242 M185 156 Q196 186 182 214 Q192 228 178 242" fill="none" stroke="${h.bot || h.c}" stroke-width="4" stroke-linecap="round" opacity=".65"/>`,
      crown: (h, c, headId) => {
        const covered = COVER_HATS.has(headId);
        const bow = `<g transform="translate(${covered ? 72 : 76} ${covered ? 56 : 48}) rotate(-22)">
          <path d="M-2 0 L-16 -9 L-14 8 Z" fill="#f9a8d4" stroke="${OL}" stroke-width="1.8" stroke-linejoin="round"/>
          <path d="M2 0 L16 -9 L14 8 Z" fill="#f9a8d4" stroke="${OL}" stroke-width="1.8" stroke-linejoin="round"/>
          <path d="M-3 3 L-11 13 M3 3 L11 13" stroke="#f472b6" stroke-width="3" stroke-linecap="round"/>
          <circle cx="0" cy="0" r="4.2" fill="#f472b6" stroke="${OL}" stroke-width="1.5"/>
        </g>`;
        return `${openTopCap(h, c, headId, covered ? "" : "M84 51 Q118 41 156 51")}${bow}`;
      },
      sideburns: (h, c) => `<path d="M54 84 Q44 126 56 164 Q64 176 72 164 Q65 138 70 100 Z" fill="${hairFill(c)}" stroke="${OL}" stroke-width="2.1" stroke-linejoin="round"/>
        <path d="M186 84 Q196 126 184 164 Q176 176 168 164 Q175 138 170 100 Z" fill="${hairFill(c)}" stroke="${OL}" stroke-width="2.1" stroke-linejoin="round"/>`,
      bangs: (h, c) => `<path d="M58 94 Q64 53 120 52 Q176 53 182 94 L169 78 L158 92 Q144 74 134 86 Q124 72 114 86 Q102 74 88 92 L74 78 Z" fill="${hairFill(c)}" stroke="${OL}" stroke-width="2.1" stroke-linejoin="round"/>`
    },

    // 8｜虛擬歌姬雙馬尾（初音未來特徵）：湖水藍綠齊瀏海＋垂落至腳邊的超長飄逸雙馬尾＋純黑底亮粉框方形髮飾＋銀黑科技耳麥
    female_miku: {
      back: (h, c) => `<g>
        <path d="M54 66 Q22 96 16 164 Q12 224 24 274 Q42 272 48 228 Q54 172 64 102 Z" fill="${hairFill(c)}" stroke="${OL}" stroke-width="2.3" stroke-linejoin="round"/>
        <path d="M186 66 Q218 96 224 164 Q228 224 216 274 Q198 272 192 228 Q186 172 176 102 Z" fill="${hairFill(c)}" stroke="${OL}" stroke-width="2.3" stroke-linejoin="round"/>
        <path d="M36 112 Q24 178 30 250 M204 112 Q216 178 210 250" fill="none" stroke="${h.shine}" stroke-width="2.8" stroke-linecap="round" opacity=".6"/>
        <path d="M56 116 Q52 44 120 40 Q188 44 184 116 Q178 134 166 138 L74 138 Q62 134 56 116Z" fill="${hairBackFill(c)}" stroke="${OL}" stroke-width="2.3"/>
      </g>`,
      crown: (h, c, headId) => {
        const covered = COVER_HATS.has(headId);
        const cy = covered ? 72 : 64;
        const clips = `<g>
          <g transform="translate(55 ${cy}) rotate(-18)">
            <rect x="-10" y="-10" width="20" height="20" rx="3" fill="#18181b" stroke="#ec4899" stroke-width="2.5"/>
            <rect x="-4.5" y="-4.5" width="9" height="9" rx="1.5" fill="none" stroke="#f472b6" stroke-width="1.6"/>
          </g>
          <g transform="translate(185 ${cy}) rotate(18)">
            <rect x="-10" y="-10" width="20" height="20" rx="3" fill="#18181b" stroke="#ec4899" stroke-width="2.5"/>
            <rect x="-4.5" y="-4.5" width="9" height="9" rx="1.5" fill="none" stroke="#f472b6" stroke-width="1.6"/>
          </g>
        </g>`;
        return `${openTopCap(h, c, headId, covered ? "" : "M82 51 Q120 40 158 51")}${clips}`;
      },
      sideburns: (h, c, headId) => {
        const headset = headId === "esports_headset" ? "" : `<g>
          <rect x="46" y="96" width="14" height="26" rx="5" fill="#1e293b" stroke="#e2e8f0" stroke-width="2"/>
          <rect x="49.5" y="102" width="6" height="14" rx="2.5" fill="#2dd4bf" stroke="#ec4899" stroke-width="1.1"/>
          <rect x="180" y="96" width="14" height="26" rx="5" fill="#1e293b" stroke="#e2e8f0" stroke-width="2"/>
          <rect x="184.5" y="102" width="6" height="14" rx="2.5" fill="#2dd4bf" stroke="#ec4899" stroke-width="1.1"/>
          <path d="M52 121 Q58 134 78 134" fill="none" stroke="#334155" stroke-width="2.3" stroke-linecap="round"/>
          <circle cx="80" cy="134" r="2.6" fill="#ec4899" stroke="#1e293b" stroke-width="1"/>
        </g>`;
        return `<path d="M55 86 Q48 124 58 156 Q67 160 72 146 Q66 124 68 94 Z" fill="${hairFill(c)}" stroke="${OL}" stroke-width="2.1" stroke-linejoin="round"/>
          <path d="M185 86 Q192 124 182 156 Q173 160 168 146 Q174 124 172 94 Z" fill="${hairFill(c)}" stroke="${OL}" stroke-width="2.1" stroke-linejoin="round"/>${headset}`;
      },
      bangs: (h, c) => `<path d="M60 89 Q66 53 120 53 Q174 53 180 89 Q166 91 154 89 Q148 72 142 89 Q128 91 114 89 Q106 72 99 89 Q84 91 60 89 Z" fill="${hairFill(c)}" stroke="${OL}" stroke-width="2.1" stroke-linejoin="round"/>
        <path d="M84 68 L82 85 M120 65 L120 85 M156 68 L158 85" fill="none" stroke="${h.s}" stroke-width="1.4" stroke-linecap="round" opacity=".45"/>`
    }
  };

  // 各造型專屬瞳孔色彩與特效樣式
  const EYE_PRESETS = {
    male_gojo: { top: "#7dd3fc", mid: "#38bdf8", bot: "#0284c7", ring: "#bae6fd", scleraGlow: true },
    male_tanjiro: { top: "#dc2626", mid: "#991b1b", bot: "#450a0a", ring: "#fca5a5" },
    male_bakugo: { top: "#fca5a5", mid: "#ef4444", bot: "#7f1d1d", ring: "#fecaca", sharp: true },
    male_hinata: { top: "#fbbf24", mid: "#b45309", bot: "#451a03", ring: "#fde68a", bigEyes: true },
    female_frieren: { top: "#a7f3d0", mid: "#34d399", bot: "#047857", ring: "#6ee7b7", halfLid: true },
    female_anya: { top: "#6ee7b7", mid: "#10b981", bot: "#047857", ring: "#a7f3d0", bigEyes: true, starSparkle: true },
    female_nezuko: { top: "#fbcfe8", mid: "#f472b6", bot: "#be185d", ring: "#fdf2f8", bigEyes: true },
    female_miku: { top: "#99f6e4", mid: "#2dd4bf", bot: "#0f766e", ring: "#ccfbf1", digitalHighlight: true }
  };

  // 盲盒公仔立體大眼（寬眼距＋各角色專屬瞳孔、六眼、半垂眼瞼、星光閃耀）
  function vinylEye(x, c, opts = {}) {
    const ep = EYE_PRESETS[opts.hairId] || EYE_PRESETS.male_gojo;
    const ry = opts.ry || (ep.bigEyes ? 11.2 : ep.sharp ? 9.2 : 10.5);
    const rx = opts.rx || (ep.bigEyes ? 9.1 : 8.5);
    const cy = opts.cy || 112;
    let out = "";
    if (ep.scleraGlow) {
      out += `<ellipse cx="${x}" cy="${cy}" rx="${rx + 2.4}" ry="${ry + 1.6}" fill="#e0f2fe" stroke="#38bdf8" stroke-width="1.2" opacity=".95" filter="${c.sglow}"/>`;
    }
    out += `<ellipse cx="${x}" cy="${cy}" rx="${rx}" ry="${ry}" fill="url(#${c.u}-iris)" stroke="#20162b" stroke-width="1.4"${ep.scleraGlow ? ` filter="${c.sglow}"` : ""}/>`;
    out += `<ellipse cx="${x}" cy="${cy + ry * 0.36}" rx="${rx * 0.66}" ry="${ry * 0.34}" fill="${ep.ring}" opacity=".48"/>`;
    if (ep.scleraGlow) {
      out += `<circle cx="${x}" cy="${cy}" r="${(rx * 0.56).toFixed(1)}" fill="none" stroke="#e0f2fe" stroke-width="1.6" opacity=".92"/>`;
      out += `<circle cx="${x}" cy="${cy}" r="${(rx * 0.3).toFixed(1)}" fill="#0c4a6e"/>`;
    }
    if (ep.starSparkle) {
      out += `<path d="${starPath(x, cy + 1, 5.2, 2.1, 4)}" fill="#ffffff" opacity=".88"/>`;
    }
    if (ep.digitalHighlight) {
      out += `<rect x="${(x - 4.2).toFixed(1)}" y="${(cy + 1).toFixed(1)}" width="8.4" height="3.2" rx="1.2" fill="#ccfbf1" opacity=".7"/>`;
    }
    if (ep.halfLid) {
      out += `<path d="M${x - rx - 1.2} ${cy - ry - 1} H${x + rx + 1.2} V${cy - 2.6} Q${x} ${cy - 1.2} ${x - rx - 1.2} ${cy - 2.6} Z" fill="url(#${c.u}-skin)"/>`;
    }
    const lid = ep.halfLid
      ? `<path d="M${x - rx - 1} ${cy - 2.6} Q${x} ${cy - 1.2} ${x + rx + 1} ${cy - 2.6}" fill="none" stroke="#20162b" stroke-width="2.7" stroke-linecap="round"/>`
      : (opts.flatTop || ep.sharp)
        ? `<path d="M${x - rx - 1.2} ${cy - 3.2} L${x + rx + 1.2} ${cy - 3.2}" stroke="#20162b" stroke-width="3.2" stroke-linecap="round"/>`
        : `<path d="M${x - rx - 0.5} ${cy - 3.5} Q${x} ${cy - ry - 2.5} ${x + rx + 0.5} ${cy - 3.5}" fill="none" stroke="#20162b" stroke-width="2.6" stroke-linecap="round"/>`;
    out += lid;
    out += `<circle cx="${x - 2.6}" cy="${cy - 3.4}" r="2.9" fill="#ffffff"/>`;
    out += `<circle cx="${x + 2.8}" cy="${cy + 3.4}" r="1.4" fill="#ffffff" opacity=".95"/>`;
    return out;
  }

  // 角色臉部招牌配件（五條眼罩開右眼縫 / 爆豪黑底橘鋸齒面具眼罩 / 禰豆子翠綠竹筒）
  function characterFaceOverlay(hairId, c, faceId, exprId) {
    let s = "";
    if (hairId === "male_gojo" && !faceId) {
      // 純黑立體布質眼罩：右側拉開一道縫隙露出高亮度六眼瞳孔
      const rightEyeSlit = exprId === "happy"
        ? `<path d="M134 113 Q145 99 156 113" fill="none" stroke="#38bdf8" stroke-width="3.8" stroke-linecap="round" filter="${c.sglow}"/>`
        : vinylEye(145, c, { hairId });
      s += `<g>
        <path d="M57 93 Q96 86 130 92 Q158 88 183 94 L182 103 Q155 96 132 102 Q146 96 158 103 L179 102 L180 123 Q158 122 145 124 Q134 126 126 121 L120 124 Q90 129 58 122 Z" fill="#141418" stroke="#050507" stroke-width="1.9" stroke-linejoin="round"/>
        <ellipse cx="145" cy="112" rx="14.5" ry="11.5" fill="#e0f2fe" stroke="#09090b" stroke-width="2"/>
        ${rightEyeSlit}
        <path d="M128 103 Q145 97 161 104" fill="none" stroke="#3f3f46" stroke-width="2.1" stroke-linecap="round"/>
        <path d="M128 121 Q145 126 161 121" fill="none" stroke="#3f3f46" stroke-width="2.1" stroke-linecap="round"/>
        <path d="M68 102 Q92 98 115 102 M72 114 Q94 111 114 114" fill="none" stroke="#27272a" stroke-width="1.6" stroke-linecap="round"/>
      </g>`;
    } else if (hairId === "male_bakugo" && !faceId) {
      // 純黑底色＋亮橘色鋸齒尖角外框面具眼罩（中央露出銳利鮮紅雙眸）
      const leftEye = exprId === "happy"
        ? `<path d="M84 113 Q95 100 105 113" fill="none" stroke="#ef4444" stroke-width="3.4" stroke-linecap="round"/>`
        : vinylEye(95, c, { hairId });
      const rightEye = exprId === "happy"
        ? `<path d="M135 113 Q145 100 156 113" fill="none" stroke="#ef4444" stroke-width="3.4" stroke-linecap="round"/>`
        : vinylEye(145, c, { hairId });
      s += `<g>
        <path d="M60 95 L38 82 L55 105 L40 124 L62 121 L76 125 L114 121 L120 116 L126 121 L164 125 L178 121 L200 124 L185 105 L202 82 L180 95 L154 91 L120 96 L86 91 Z" fill="#111827" stroke="#f97316" stroke-width="3.2" stroke-linejoin="round"/>
        <path d="M48 89 L64 98 M49 119 L66 116 M192 89 L176 98 M191 119 L174 116" stroke="#fb923c" stroke-width="2" stroke-linecap="round"/>
        <ellipse cx="95" cy="111" rx="14" ry="10.5" fill="#fff5f5" stroke="#f97316" stroke-width="2"/>
        <ellipse cx="145" cy="111" rx="14" ry="10.5" fill="#fff5f5" stroke="#f97316" stroke-width="2"/>
        ${leftEye}${rightEye}
        <path d="M82 97 L107 104 M158 97 L133 104" stroke="#111827" stroke-width="3.4" stroke-linecap="round"/>
      </g>`;
    } else if (hairId === "female_nezuko") {
      // 翠綠色竹節竹筒＋紅棕綁帶（100% 靈魂特徵，保留可見）
      s += `<g>
        <path d="M61 119 Q80 128 96 132 M179 119 Q160 128 144 132 M62 135 Q80 137 96 136 M178 135 Q160 137 144 136" fill="none" stroke="#7f1d1d" stroke-width="3" stroke-linecap="round"/>
        <rect x="95" y="126" width="50" height="15" rx="6.5" fill="#22c55e" stroke="${OL}" stroke-width="2.1"/>
        <path d="M120 126 V141" stroke="#15803d" stroke-width="2.6"/>
        <path d="M100 130 H116 M124 130 H140" stroke="#86efac" stroke-width="2" stroke-linecap="round" opacity=".85"/>
        <rect x="97" y="125" width="4.5" height="17" rx="2" fill="#991b1b" stroke="#450a0a" stroke-width="1"/>
        <rect x="138.5" y="125" width="4.5" height="17" rx="2" fill="#991b1b" stroke="#450a0a" stroke-width="1"/>
      </g>`;
    }
    return s;
  }

  function calmMouth(hairId) {
    if (hairId === "male_bakugo") {
      return `<path d="M110 136 Q121 139 131 130" fill="none" stroke="${OL}" stroke-width="2.5" stroke-linecap="round"/>
        <path d="M124 134 L128 136" stroke="#ffffff" stroke-width="1.6" stroke-linecap="round"/>`;
    }
    if (hairId === "male_hinata") {
      return `<path d="M108 130 Q120 144 132 130 Z" fill="#ffffff" stroke="${OL}" stroke-width="2" stroke-linejoin="round"/>
        <path d="M111 134 H129" stroke="#e2e8f0" stroke-width="1"/>`;
    }
    if (hairId === "female_anya") {
      return `<path d="M112 133 Q120 141 128 133" fill="none" stroke="${OL}" stroke-width="2.4" stroke-linecap="round"/>
        <path d="M115 135 Q120 139 125 135" fill="#ff8fa3" opacity=".6"/>`;
    }
    return `<path d="M115.5 134.5 Q120 137.5 124.5 134.5" fill="none" stroke="${OL}" stroke-width="2.5" stroke-linecap="round"/>
      <path d="M118 138.5 Q120 139.6 122 138.5" fill="none" stroke="#d99a7e" stroke-width="1.6" stroke-linecap="round"/>`;
  }

  // 5 款盲盒公仔表情（整合各角色專屬瞳孔與臉部招牌特徵）
  const FACE = {
    calm: (h, c, hairId, faceId) => `${vinylEye(95, c, { hairId })}${vinylEye(145, c, { hairId })}
      <path d="M86 94 Q95 89 104 93" fill="none" stroke="${h.s}" stroke-width="2.6" stroke-linecap="round"/>
      <path d="M136 93 Q145 89 154 94" fill="none" stroke="${h.s}" stroke-width="2.6" stroke-linecap="round"/>
      ${calmMouth(hairId)}
      ${characterFaceOverlay(hairId, c, faceId, "calm")}`,

    happy: (h, c, hairId, faceId) => `<path d="M85 113 Q95 99 105 113" fill="none" stroke="#2a1a1f" stroke-width="3.6" stroke-linecap="round"/>
      <path d="M83 111 L87 113" stroke="#2a1a1f" stroke-width="2.2" stroke-linecap="round"/>
      <path d="M135 113 Q145 99 155 113" fill="none" stroke="#2a1a1f" stroke-width="3.6" stroke-linecap="round"/>
      <path d="M157 111 L153 113" stroke="#2a1a1f" stroke-width="2.2" stroke-linecap="round"/>
      <path d="M86 92 Q95 86 104 91" fill="none" stroke="${h.s}" stroke-width="2.6" stroke-linecap="round"/>
      <path d="M136 91 Q145 86 154 92" fill="none" stroke="${h.s}" stroke-width="2.6" stroke-linecap="round"/>
      <path d="M110 130 Q120 146 130 130 Z" fill="#c93b52" stroke="${OL}" stroke-width="2" stroke-linejoin="round"/>
      <path d="M114.5 136.5 Q120 142.5 125.5 136.5 Q120 133.5 114.5 136.5 Z" fill="#ff8fa3"/>
      ${characterFaceOverlay(hairId, c, faceId, "happy")}`,

    angry: (h, c, hairId, faceId) => `${vinylEye(95, c, { ry: 9.2, cy: 113, flatTop: true, hairId })}${vinylEye(145, c, { ry: 9.2, cy: 113, flatTop: true, hairId })}
      <path d="M84 95 L105 102" fill="none" stroke="${h.s}" stroke-width="3" stroke-linecap="round"/>
      <path d="M156 95 L135 102" fill="none" stroke="${h.s}" stroke-width="3" stroke-linecap="round"/>
      <ellipse cx="77" cy="129" rx="13" ry="7.5" fill="url(#${c.u}-blush)"/>
      <ellipse cx="163" cy="129" rx="13" ry="7.5" fill="url(#${c.u}-blush)"/>
      <path d="M111 135 Q115.5 131.5 120 135 Q124.5 131.5 129 135" fill="none" stroke="${OL}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M104 130 Q101 134 104 138 M136 130 Q139 134 136 138" fill="none" stroke="#d98c72" stroke-width="1.8" stroke-linecap="round"/>
      ${characterFaceOverlay(hairId, c, faceId, "angry")}`,

    surprised: (h, c, hairId, faceId) => `${vinylEye(95, c, { rx: 9.2, ry: 11.2, cy: 112, hairId })}${vinylEye(145, c, { rx: 9.2, ry: 11.2, cy: 112, hairId })}
      <path d="M86 89 Q95 83 104 88" fill="none" stroke="${h.s}" stroke-width="2.6" stroke-linecap="round"/>
      <path d="M136 88 Q145 83 154 89" fill="none" stroke="${h.s}" stroke-width="2.6" stroke-linecap="round"/>
      <ellipse cx="120" cy="136" rx="5.2" ry="6.4" fill="#d94862" stroke="${OL}" stroke-width="2.1"/>
      <ellipse cx="120" cy="138" rx="3" ry="2.6" fill="#ff94a8"/>
      ${characterFaceOverlay(hairId, c, faceId, "surprised")}`,

    teary: (h, c, hairId, faceId) => `${vinylEye(95, c, { rx: 8.8, ry: 10.6, cy: 113, hairId })}${vinylEye(145, c, { rx: 8.8, ry: 10.6, cy: 113, hairId })}
      <ellipse cx="95" cy="120.5" rx="6.8" ry="2.6" fill="#9fe3ff" opacity=".62"/>
      <ellipse cx="145" cy="120.5" rx="6.8" ry="2.6" fill="#9fe3ff" opacity=".62"/>
      <path d="M84 118 Q77 125 81 129 Q86 129 84 118 Z" fill="url(#${c.u}-tear)" stroke="#4ea8de" stroke-width="1"/>
      <path d="M156 118 Q163 125 159 129 Q154 129 156 118 Z" fill="url(#${c.u}-tear)" stroke="#4ea8de" stroke-width="1"/>
      <circle cx="81.5" cy="125.5" r="1" fill="#fff"/>
      <circle cx="158.5" cy="125.5" r="1" fill="#fff"/>
      <path d="M84 100 Q94 93 105 94" fill="none" stroke="${h.s}" stroke-width="2.6" stroke-linecap="round"/>
      <path d="M156 100 Q146 93 135 94" fill="none" stroke="${h.s}" stroke-width="2.6" stroke-linecap="round"/>
      <path d="M113 137 Q116.5 133.5 120 136 Q123.5 133.5 127 137" fill="none" stroke="${OL}" stroke-width="2.4" stroke-linecap="round"/>
      ${characterFaceOverlay(hairId, c, faceId, "teary")}`
  };

  /* ------------------------------------------------------------------
   * 三、基礎身體圖層（1 : 1.2 大頭二頭身盲盒公仔＋霧面立體漸層）
   * ------------------------------------------------------------------ */
  const TORSO = "M91 154 Q120 147 149 154 L158 214 Q120 223 82 214 Z";
  const legs = (c) => `<rect x="96" y="206" width="19" height="44" rx="9.5" fill="url(#${c.u}-skin)" stroke="${OL}" stroke-width="2.1"/>
    <rect x="125" y="206" width="19" height="44" rx="9.5" fill="url(#${c.u}-skin)" stroke="${OL}" stroke-width="2.1"/>`;
  const shoes = (c) => `
    <g>
      <path d="M92 238 H117 L119 254 Q120 265 104 265 Q87 265 89 253 Z" fill="url(#${c.u}-boot)" stroke="${OL}" stroke-width="2.1" stroke-linejoin="round"/>
      <rect x="91" y="236" width="27" height="7" rx="3.5" fill="#475569" stroke="${OL}" stroke-width="1.8"/>
      <path d="M89 258 Q104 264 119 258 L119 262 Q104 268 89 262 Z" fill="#ff7b54" stroke="${OL}" stroke-width="1.6"/>
      <ellipse cx="97" cy="251" rx="4" ry="2.2" fill="#fff" opacity=".75" transform="rotate(-18 97 251)"/>
      <path d="M123 238 H148 L151 253 Q153 265 136 265 Q120 265 121 254 Z" fill="url(#${c.u}-boot)" stroke="${OL}" stroke-width="2.1" stroke-linejoin="round"/>
      <rect x="122" y="236" width="27" height="7" rx="3.5" fill="#475569" stroke="${OL}" stroke-width="1.8"/>
      <path d="M121 258 Q136 264 151 258 L151 262 Q136 268 121 262 Z" fill="#ff7b54" stroke="${OL}" stroke-width="1.6"/>
      <ellipse cx="143" cy="251" rx="4" ry="2.2" fill="#fff" opacity=".75" transform="rotate(18 143 251)"/>
    </g>`;
  const defShorts = (c) => `<path d="M84 202 L156 202 L159 231 Q140 235 122 230 L120 222 L118 230 Q100 235 81 231 Z" fill="url(#${c.u}-shorts)" stroke="${OL}" stroke-width="2.2" stroke-linejoin="round"/>`;
  const neck = (c) => `<rect x="110" y="142" width="20" height="17" rx="7" fill="url(#${c.u}-skin)" stroke="${OL}" stroke-width="1.9"/>`;
  const defTop = (c, hairId) => {
    if (hairId === "male_hinata") {
      return `<path d="${TORSO}" fill="#18181b" stroke="${OL}" stroke-width="2.2" stroke-linejoin="round"/>
        <path d="M98 153 Q120 171 142 153" fill="none" stroke="#fb923c" stroke-width="5.2" stroke-linecap="round"/>
        <path d="M104 152 Q120 164 136 152" fill="none" stroke="#fdba74" stroke-width="2" stroke-linecap="round"/>
        <path d="M93 156 L87 214 M147 156 L153 214" stroke="#fb923c" stroke-width="3.2" stroke-linecap="round"/>
        <text x="120" y="196" text-anchor="middle" font-family="Noto Sans TC, sans-serif" font-size="16" font-weight="900" fill="#fb923c">10</text>`;
    }
    return `<path d="${TORSO}" fill="url(#${c.u}-defTop)" stroke="${OL}" stroke-width="2.2" stroke-linejoin="round"/>
      <path d="M104 153 Q120 165 136 153" fill="none" stroke="#6ec5e9" stroke-width="3.2" stroke-linecap="round"/>
      <path d="M96 164 Q102 186 98 206" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" opacity=".55"/>
      <path d="${starPath(120, 186, 9.5, 4.2)}" fill="#ffd166" stroke="#d99b00" stroke-width="1.3"/>`;
  };
  const headBase = (c, hairId) => {
    let earsHtml = `
      <circle cx="58" cy="110" r="10.5" fill="url(#${c.u}-skin)" stroke="${OL}" stroke-width="2.2"/>
      <circle cx="56.5" cy="110" r="5.5" fill="url(#${c.u}-ear)"/>
      <circle cx="182" cy="110" r="10.5" fill="url(#${c.u}-skin)" stroke="${OL}" stroke-width="2.2"/>
      <circle cx="183.5" cy="110" r="5.5" fill="url(#${c.u}-ear)"/>`;
    if (hairId === "female_frieren") {
      earsHtml = `
        <g>
          <path d="M64 102 Q42 99 24 106 Q40 118 62 119 Z" fill="url(#${c.u}-skin)" stroke="${OL}" stroke-width="2.2" stroke-linejoin="round"/>
          <path d="M58 106 Q44 105 33 108 Q45 113 58 114 Z" fill="url(#${c.u}-ear)"/>
          <path d="M176 102 Q198 99 216 106 Q200 118 178 119 Z" fill="url(#${c.u}-skin)" stroke="${OL}" stroke-width="2.2" stroke-linejoin="round"/>
          <path d="M182 106 Q196 105 207 108 Q195 113 182 114 Z" fill="url(#${c.u}-ear)"/>
          <circle cx="53" cy="120" r="2.6" fill="none" stroke="#f59e0b" stroke-width="1.9"/>
          <path d="M53 122 L59 131 L53 140 L47 131 Z" fill="#ef4444" stroke="#f59e0b" stroke-width="1.8" stroke-linejoin="round"/>
          <circle cx="51.5" cy="129" r="1.3" fill="#fecaca"/>
          <circle cx="187" cy="120" r="2.6" fill="none" stroke="#f59e0b" stroke-width="1.9"/>
          <path d="M187 122 L193 131 L187 140 L181 131 Z" fill="#ef4444" stroke="#f59e0b" stroke-width="1.8" stroke-linejoin="round"/>
          <circle cx="185.5" cy="129" r="1.3" fill="#fecaca"/>
        </g>`;
    } else if (hairId === "male_tanjiro") {
      const hanafuda = (cx) => `<g transform="translate(${cx} 120)">
        <line x1="0" y1="-2" x2="0" y2="2" stroke="#18181b" stroke-width="1.6"/>
        <rect x="-5.5" y="2" width="11" height="19" rx="1.6" fill="#ffffff" stroke="#18181b" stroke-width="1.8"/>
        <circle cx="0" cy="9" r="3.4" fill="#ef4444"/>
        <path d="M-4 17.5 L0 12.5 L4 17.5 M0 12.5 V19" fill="none" stroke="#ef4444" stroke-width="1.2" stroke-linecap="round"/>
      </g>`;
      earsHtml += hanafuda(53) + hanafuda(187);
    }
    const blushRx = hairId === "female_anya" ? 13.8 : 12;
    const blushRy = hairId === "female_anya" ? 7.6 : 6.8;
    return `${earsHtml}
      <path d="M120 46 C161 46 181 69 181 103 C181 134 159 150 120 150 C81 150 59 134 59 103 C59 69 79 46 120 46 Z" fill="url(#${c.u}-skin)" stroke="${OL}" stroke-width="2.4"/>
      <ellipse cx="77" cy="128" rx="${blushRx}" ry="${blushRy}" fill="url(#${c.u}-blush)"/>
      <ellipse cx="163" cy="128" rx="${blushRx}" ry="${blushRy}" fill="url(#${c.u}-blush)"/>`;
  };
  const HAND_R = { x: 164, y: 203 };
  const rightHand = (c) => `<circle cx="${HAND_R.x}" cy="${HAND_R.y}" r="8.4" fill="url(#${c.u}-skin)" stroke="${OL}" stroke-width="2.1"/>`;
  function arms(top, c) {
    const sl = (top && top.sleeve) || { color: "#d6efff", long: false, cuff: "#6ec5e9" };
    const P = (d, col, w) => `<path d="${d}" fill="none" stroke="${col}" stroke-width="${w}" stroke-linecap="round"/>`;
    const L = "M94 161 Q81 178 76 200", R = "M146 161 Q159 178 164 200";
    let s = P(L, OL, 19) + P(L, `url(#${c.u}-skin)`, 14.5) + P(R, OL, 19) + P(R, `url(#${c.u}-skin)`, 14.5);
    if (sl.long) {
      s += P(L, OL, 21) + P(L, sl.color, 16.5) + P(R, OL, 21) + P(R, sl.color, 16.5);
      if (sl.cuff) s += P("M77.5 194 L76.3 199", sl.cuff, 16.5) + P("M162.5 194 L163.7 199", sl.cuff, 16.5);
    } else {
      const Lu = "M94 161 Q87 169 83 179", Ru = "M146 161 Q153 169 157 179";
      s += P(Lu, OL, 21) + P(Lu, sl.color, 16.5) + P(Ru, OL, 21) + P(Ru, sl.color, 16.5);
      if (sl.cuff) s += P("M84.5 176 L83 179", sl.cuff, 16.5) + P("M155.5 176 L157 179", sl.cuff, 16.5);
    }
    return s + `<circle cx="76" cy="203" r="8.4" fill="url(#${c.u}-skin)" stroke="${OL}" stroke-width="2.1"/>` + rightHand(c);
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
    const look = normalizeLook(st && st.look);
    const hc = getHairPalette(look.hair, look.hairColor);
    const hair = HAIR[look.hair] || HAIR[DEFAULT_LOOK.hair];
    const face = FACE[look.face] || FACE[DEFAULT_LOOK.face];
    const ep = EYE_PRESETS[look.hair] || EYE_PRESETS.male_gojo;
    const c = { u, h: hc, glow: `url(#${u}-glow)`, sglow: `url(#${u}-sglow)` };
    const eq = (st && st.equipped) || {};
    const it = (slot) => {
      const item = eq[slot] ? ITEM_MAP[eq[slot]] : null;
      return item && item.slot === slot ? item : null;
    };
    const L = (item, layer) => (item && item.L && item.L[layer] ? item.L[layer](c) : "");
    const I = { head: it("head"), face: it("face"), top: it("top"), bottom: it("bottom"), outer: it("outer"), weapon: it("weapon"), pet: it("pet"), aura: it("aura"), bg: it("bg"), mount: it("mount") };
    const headId = I.head ? I.head.id : "";
    const faceId = I.face ? I.face.id : "";
    const keepLongBackWithHood = look.hair === "female_frieren" || look.hair === "female_nezuko" || look.hair === "female_miku";
    const hinataSleeve = !I.top && look.hair === "male_hinata" ? { sleeve: { color: "#18181b", long: false, cuff: "#fb923c" } } : I.top;
    const hairGradStops = hc.mid
      ? [[0, hc.top], [0.58, hc.c], [0.8, hc.mid], [1, hc.bot]]
      : hc.bot
        ? [[0, hc.top], [0.56, hc.c], [1, hc.bot]]
        : [[0, hc.top], [0.45, hc.c], [1, hc.s]];
    const hairBackGradStops = hc.mid
      ? [[0, hc.top], [0.56, hc.c], [0.78, hc.mid], [1, hc.bot]]
      : hc.bot
        ? [[0, hc.top], [0.55, hc.c], [1, hc.bot]]
        : [[0, hc.c], [1, hc.s]];
    const size = opt.width ? ` width="${opt.width}" height="${opt.height}"` : "";
    const animIdleCls = opt.noAnim ? "" : (I.mount ? "av-hover" : "av-idle");
    let s = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${opt.viewBox || "0 0 240 300"}"${size} class="av-svg ${opt.cls || ""}" role="img" aria-label="${esc(opt.label || "盲盒公仔角色")}">`;
    s += `<defs>
      <filter id="${u}-glow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="3.2" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
      <filter id="${u}-sglow" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="1.4" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
      ${rg(`${u}-skin`, [[0, "#fff2e6"], [0.48, "#ffe1c8"], [0.86, "#f7c9a6"], [1, "#e8ae86"]], "42%", "34%", "65%")}
      ${rg(`${u}-ear`, [[0, "#f4b998"], [1, "#dfa07b"]], "50%", "45%", "55%")}
      ${rg(`${u}-blush`, [[0, "#ff7a9e", 0.72], [0.6, "#ff94b2", 0.35], [1, "#ff94b2", 0]], "50%", "50%", "50%")}
      ${lg(`${u}-hair`, hairGradStops, 0.75, 1)}
      ${lg(`${u}-hairBack`, hairBackGradStops, 0, 1)}
      ${lg(`${u}-iris`, [[0, ep.bot], [0.55, ep.mid], [1, ep.top]], 0, 1)}
      ${lg(`${u}-tear`, [[0, "#e6f9ff"], [1, "#5dc2ff"]], 0, 1)}
      ${lg(`${u}-boot`, [[0, "#ffffff"], [0.55, "#eaf0f7"], [1, "#c8d5e5"]], 0.3, 1)}
      ${lg(`${u}-shorts`, [[0, "#5275a4"], [1, "#2c4263"]], 0.2, 1)}
      ${lg(`${u}-defTop`, [[0, "#ffffff"], [0.48, "#dcf1ff"], [1, "#a9daf8"]], 0.2, 1)}
    </defs>`;
    if (!opt.noBg) s += I.bg ? L(I.bg, "main") : defaultBg(c);
    s += L(I.aura, "back");
    if (!opt.noShadow) {
      s += I.mount
        ? `<ellipse cx="120" cy="286" rx="40" ry="5.5" fill="rgba(0,0,0,.16)"/>`
        : `<ellipse cx="120" cy="266" rx="46" ry="6.5" fill="rgba(0,0,0,.16)"/>`;
    }
    s += animIdleCls ? `<g class="${animIdleCls}">` : `<g>`;
    if (I.mount) s += L(I.mount, "main") + `<g transform="translate(0 -10)">`;
    s += L(I.outer, "back") + L(I.head, "back") + ((headId === "hacker_hood" && !keepLongBackWithHood) ? "" : hair.back(hc, c, headId));
    s += legs(c) + (I.bottom ? L(I.bottom, "main") : defShorts(c)) + shoes(c);
    s += neck(c) + (I.top ? L(I.top, "main") : defTop(c, look.hair)) + L(I.bottom, "over");
    s += arms(hinataSleeve, c) + L(I.outer, "front");
    if (hair.aura) s += hair.aura(hc, c, headId);
    s += headBase(c, look.hair) + face(hc, c, look.hair, faceId) + hair.crown(hc, c, headId) + hair.sideburns(hc, c, headId) + hair.bangs(hc, c, headId) + L(I.head, "front") + L(I.face, "front");
    if (I.weapon) s += `<g class="${opt.noAnim ? "" : "av-weapon "}av-legend">${L(I.weapon, "main")}</g>` + rightHand(c);
    if (I.mount) s += `</g>`;
    s += `</g>`;
    if (I.pet) s += `<g class="${opt.noAnim ? "" : "av-pet "}av-legend">${L(I.pet, "main")}</g>`;
    s += L(I.aura, "front");
    return s + `</svg>`;
  }

  /** 裝備縮圖：以目前捏臉造型穿上單一裝備，裁切到該部位 */
  function renderThumb(itemId, look) {
    const item = ITEM_MAP[itemId];
    if (!item) return "";
    return renderAvatar({ look, equipped: { [item.slot]: item.id } }, {
      viewBox: SLOT_VIEW[item.slot], noBg: item.slot !== "bg", noShadow: true, noAnim: true, cls: "av-thumb-svg", label: item.name
    });
  }
  function renderLookThumb(look) {
    return renderAvatar({ look, equipped: {} }, {
      viewBox: "22 4 196 178", noBg: true, noShadow: true, noAnim: true, cls: "av-thumb-svg", label: "造型預覽"
    });
  }
  /** 風雲榜 42px 圓形迷你公仔頭像 */
  function renderMiniAvatar(stOrLook, opt = {}) {
    const st = stOrLook && stOrLook.look ? stOrLook : { look: stOrLook || DEFAULT_LOOK, equipped: {} };
    return renderAvatar(st, {
      viewBox: "24 4 192 192", noBg: true, noShadow: true, noAnim: true, cls: opt.cls || "av-mini-svg", label: opt.label || "冒險者頭像"
    });
  }

  /* ------------------------------------------------------------------
   * 六、資料層（localStorage）：解鎖、穿戴、星幣
   * ------------------------------------------------------------------ */
  const profile = () => (window.Store && window.Store.profile) || null;
  const stateKey = (p) => `ii:avatar:${p.cls}-${p.seat}-${p.name}`;
  const labKey = (p) => (p ? `ii:microlab:${p.cls}-${p.seat}-${p.name}` : "ii:microlab:guest");
  const LAB_COIN_REWARD = 20;
  const DOJO_COIN_REWARD = 30;
  const CAPSTONE_COIN_REWARD = 50;
  const CITADEL_DOJO_KEYS = ["dojo:fsm", "dojo:dag", "dojo:bitwise", "dojo:recursion"];
  const CITADEL_CAPSTONE_KEYS = ["capstone:zero-day", "capstone:smart-city"];
  const CITADEL_ALL_KEYS = new Set([...CITADEL_DOJO_KEYS, ...CITADEL_CAPSTONE_KEYS, "citadel:unlocked"]);
  const CITADEL_HONOR_KEYS = new Set([...CITADEL_DOJO_KEYS, ...CITADEL_CAPSTONE_KEYS]);

  function sanitizeCitadelTokens(raw) {
    const out = new Set();
    const scan = (val) => {
      if (!val) return;
      if (Array.isArray(val)) {
        val.forEach((x) => {
          const k = String(x || "").trim().toLowerCase();
          if (CITADEL_ALL_KEYS.has(k)) out.add(k);
        });
      } else if (typeof val === "object") {
        if (Array.isArray(val.citadelTokens)) scan(val.citadelTokens);
        if (Array.isArray(val.citadelHonors)) scan(val.citadelHonors);
        if (val.look && Array.isArray(val.look.citadelHonors)) scan(val.look.citadelHonors);
      }
    };
    scan(raw);
    return Array.from(out).sort();
  }

  function getCitadelHonorsSummary(tokensInput) {
    const list = sanitizeCitadelTokens(tokensInput);
    const set = new Set(list);
    const dojoPassed = CITADEL_DOJO_KEYS.filter((k) => set.has(k));
    const capstonePassed = CITADEL_CAPSTONE_KEYS.filter((k) => set.has(k));
    const isDojoMaster = dojoPassed.length === CITADEL_DOJO_KEYS.length;
    const isForensicChief = capstonePassed.length === CITADEL_CAPSTONE_KEYS.length;
    const hasAnyHonor = dojoPassed.length > 0 || capstonePassed.length > 0;
    const titles = [];
    if (isDojoMaster) titles.push({ id: "algo-master", name: "演算法宗師", icon: "⚡" });
    if (isForensicChief) titles.push({ id: "forensic-chief", name: "首席資安鑑識官", icon: "🕵️" });
    let badgeText = "";
    if (isDojoMaster && isForensicChief) badgeText = "🏛️ 演算法宗師 · 首席資安鑑識官";
    else if (isDojoMaster) badgeText = "⚡ 演算法宗師";
    else if (isForensicChief) badgeText = "🕵️ 首席資安鑑識官";
    else if (capstonePassed.length > 0) badgeText = "🕵️ 天穹鑑識特派員";
    else if (dojoPassed.length > 0) badgeText = "⚡ 天穹試煉勇士";
    return {
      tokens: list,
      dojoPassed,
      capstonePassed,
      isDojoMaster,
      isForensicChief,
      hasAnyHonor,
      titles,
      badgeText
    };
  }
  const LAB_ID_ALIAS = {
    sys: "sys", hardware: "sys", hw: "sys",
    citizen: "citizen", security: "citizen", sec: "citizen",
    create: "create", creation: "create", creative: "create",
    code: "code", programming: "code", prog: "code",
    algo: "algo", algorithm: "algo", alg: "algo",
    data: "data",
    ai: "ai"
  };
  const LAB_ISLAND_IDS = new Set(["sys", "citizen", "create", "code", "algo", "data", "ai"]);
  function resolveLabIslandId(id) {
    const key = String(id || "").trim().toLowerCase();
    const mapped = LAB_ID_ALIAS[key] || "";
    return LAB_ISLAND_IDS.has(mapped) ? mapped : "";
  }
  function sanitizeLabList(raw) {
    if (!Array.isArray(raw)) return [];
    const out = [];
    raw.forEach((id) => {
      const c = resolveLabIslandId(id);
      if (c && !out.includes(c)) out.push(c);
    });
    return out;
  }
  function readGuestLabCompleted() {
    try {
      const raw = JSON.parse(localStorage.getItem(labKey(null)) || "[]");
      return sanitizeLabList(raw);
    } catch { return []; }
  }
  const blankState = () => ({
    v: 1,
    lockPolicyVersion: 2,
    look: Object.assign({}, DEFAULT_LOOK),
    unlocked: [],
    equipped: {},
    npcSolved: [],
    labCompleted: [],
    citadelTokens: [],
    presetLocked: false,
    presetId: "",
    lockedAt: null,
    starCoins: 0,
    vouchers: { easy: 0, medium: 0, hard: 0 },
    preLockStages: [],
    rewardedStages: [],
    labRewarded: [],
    citadelRewarded: [],
    npcRewarded: []
  });
  let guestState = (() => {
    const st = blankState();
    st.labCompleted = readGuestLabCompleted();
    return st;
  })();
  let cloudSyncTimer = null;

  function sanitizeStageList(raw) {
    if (!Array.isArray(raw)) return [];
    const out = [];
    raw.forEach((tok) => {
      const s = String(tok || "").trim().toLowerCase();
      if (/^[a-z]+-\d+:(easy|medium|hard)$/.test(s) && !out.includes(s)) out.push(s);
    });
    return out;
  }

  function isAvatarLocked(targetSt) {
    const st = targetSt !== undefined ? targetSt : getState();
    return Boolean(st && st.presetLocked === true && Boolean(String(st.presetId || "").trim()));
  }

  function sanitizeState(raw) {
    const st = blankState();
    if (raw && typeof raw === "object") {
      st.look = normalizeLook(raw.look);
      const rawLocked = raw.presetLocked === true;
      let rawPresetId = "";
      if (raw.presetId !== undefined && raw.presetId !== null) {
        rawPresetId = String(raw.presetId).trim();
      } else if (rawLocked && st.look && st.look.hair) {
        // 相容舊版雲端資料（尚未儲存 presetId 欄位前已鎖定角色者）
        rawPresetId = String(st.look.hair).trim();
      }
      const locked = rawLocked && Boolean(rawPresetId);
      st.presetLocked = locked;
      st.presetId = locked ? rawPresetId : "";
      st.lockedAt = locked && Number.isFinite(Number(raw.lockedAt)) ? Number(raw.lockedAt) : null;

      st.unlocked = Array.isArray(raw.unlocked) ? Array.from(new Set(raw.unlocked.filter((id) => ITEM_MAP[id]))) : [];
      st.npcSolved = Array.isArray(raw.npcSolved) ? Array.from(new Set(raw.npcSolved.filter((id) => NPC_Q_IDS.has(id)))) : [];
      st.labCompleted = sanitizeLabList(raw.labCompleted);
      st.citadelTokens = sanitizeCitadelTokens(raw);
      const eq = raw.equipped && typeof raw.equipped === "object" ? raw.equipped : {};
      Object.keys(eq).forEach((slot) => {
        const item = ITEM_MAP[eq[slot]];
        if (item && item.slot === slot && st.unlocked.includes(item.id)) st.equipped[slot] = item.id;
      });

      if (!locked) {
        // 尚未鎖定專屬角色前：嚴格清除星幣、兌換券與計酬紀錄，避免誤存未鎖定前餘額
        st.lockPolicyVersion = 2;
        st.starCoins = 0;
        st.vouchers = { easy: 0, medium: 0, hard: 0 };
        st.preLockStages = [];
        st.rewardedStages = [];
        st.labRewarded = [];
        st.citadelRewarded = [];
        st.npcRewarded = [];
      } else {
        const isLegacyLocked = raw.presetId === undefined && raw.lockPolicyVersion !== 2;
        st.lockPolicyVersion = isLegacyLocked ? 1 : 2;
        if (isLegacyLocked) {
          st.preLockStages = [];
          st.rewardedStages = [];
          st.labRewarded = st.labCompleted.slice();
          st.citadelRewarded = st.citadelTokens.filter((t) => CITADEL_HONOR_KEYS.has(t));
          st.npcRewarded = st.npcSolved.slice();
        } else {
          st.preLockStages = sanitizeStageList(raw.preLockStages);
          st.rewardedStages = sanitizeStageList(raw.rewardedStages);
          st.labRewarded = sanitizeLabList(raw.labRewarded);
          st.citadelRewarded = sanitizeCitadelTokens(raw.citadelRewarded).filter((t) => CITADEL_HONOR_KEYS.has(t));
          st.npcRewarded = Array.isArray(raw.npcRewarded) ? Array.from(new Set(raw.npcRewarded.filter((id) => NPC_Q_IDS.has(id)))) : [];
        }
      }
    }
    return st;
  }

  function syncStateBalanceFields(st, qs) {
    if (!st || typeof st !== "object") return st;
    if (!isAvatarLocked(st)) {
      st.presetLocked = false;
      st.presetId = "";
      st.starCoins = 0;
      st.vouchers = { easy: 0, medium: 0, hard: 0 };
      return st;
    }
    const w = computeWallet(st, qs);
    st.starCoins = w.coins;
    st.vouchers = { easy: w.avail.easy, medium: w.avail.medium, hard: w.avail.hard };
    return st;
  }

  function getState() {
    const p = profile();
    if (!p) {
      if (window.Store && typeof window.Store.getCitadelTokens === "function") {
        guestState.citadelTokens = sanitizeCitadelTokens([...guestState.citadelTokens, ...window.Store.getCitadelTokens(null)]);
      }
      return syncStateBalanceFields(guestState);
    }
    let raw = null;
    try { raw = JSON.parse(localStorage.getItem(stateKey(p)) || "null"); } catch { raw = null; }
    const st = sanitizeState(raw);
    try {
      const extraLabs = sanitizeLabList(JSON.parse(localStorage.getItem(labKey(p)) || "[]"));
      if (extraLabs.length) st.labCompleted = Array.from(new Set([...st.labCompleted, ...extraLabs]));
    } catch {}
    if (window.Store && typeof window.Store.getCitadelTokens === "function") {
      const storeTokens = window.Store.getCitadelTokens(p);
      if (storeTokens.length) st.citadelTokens = sanitizeCitadelTokens([...st.citadelTokens, ...storeTokens]);
    }
    if (st.lockPolicyVersion === 1 && isAvatarLocked(st)) {
      st.labRewarded = st.labCompleted.slice();
      st.citadelRewarded = st.citadelTokens.filter((t) => CITADEL_HONOR_KEYS.has(t));
    }
    return syncStateBalanceFields(st);
  }
  function buildCloudAvatarPayload(st) {
    const honorList = (st.citadelTokens || []).filter((t) => CITADEL_HONOR_KEYS.has(t));
    const nextLook = { ...st.look };
    if (honorList.length > 0) nextLook.citadelHonors = honorList;
    const synced = syncStateBalanceFields({ ...st, look: nextLook });
    return synced;
  }
  function saveState(st, opt = {}) {
    syncStateBalanceFields(st);
    const p = profile();
    if (!p) {
      guestState = st;
      try { localStorage.setItem(labKey(null), JSON.stringify(st.labCompleted || [])); } catch (e) { console.warn(e); }
      return;
    }
    try {
      localStorage.setItem(stateKey(p), JSON.stringify(st));
      localStorage.setItem(labKey(p), JSON.stringify(st.labCompleted || []));
    } catch (e) { console.warn(e); }
    if (opt.syncCloud !== false && window.Store && typeof window.Store.saveAvatarToCloud === "function") {
      const payload = buildCloudAvatarPayload(st);
      if (opt.immediate) {
        clearTimeout(cloudSyncTimer);
        window.Store.saveAvatarToCloud(payload, p);
      } else {
        clearTimeout(cloudSyncTimer);
        cloudSyncTimer = setTimeout(() => {
          window.Store.saveAvatarToCloud(buildCloudAvatarPayload(getState()), p);
        }, 450);
      }
    }
  }
  function resetGuestState({ silent = false } = {}) {
    clearTimeout(cloudSyncTimer);
    cloudSyncTimer = null;
    guestState = blankState();
    try {
      localStorage.removeItem(labKey(null));
      localStorage.removeItem("ii:microlab:stages:guest");
    } catch {}
    if (!silent) {
      emit();
      document.dispatchEvent(new CustomEvent("ii:microlab-updated", { detail: { reset: true } }));
    }
  }
  function restoreCloudAvatar(cloudAv, explicitProfile, opts = {}) {
    const p = explicitProfile || profile();
    if (!p) return getState();
    clearTimeout(cloudSyncTimer);
    cloudSyncTimer = null;

    if (opts && opts.replace) {
      const nextState = (cloudAv && typeof cloudAv === "object") ? sanitizeState(cloudAv) : blankState();
      syncStateBalanceFields(nextState);
      try {
        localStorage.setItem(stateKey(p), JSON.stringify(nextState));
        localStorage.setItem(labKey(p), JSON.stringify(nextState.labCompleted || []));
      } catch (e) { console.warn(e); }
      emit();
      document.dispatchEvent(new CustomEvent("ii:microlab-updated", { detail: { restored: true } }));
      return nextState;
    }

    if (!cloudAv || typeof cloudAv !== "object") return getState();
    let localRaw = null;
    try { localRaw = JSON.parse(localStorage.getItem(stateKey(p)) || "null"); } catch { localRaw = null; }
    const localSt = sanitizeState(localRaw);
    const cloudSt = sanitizeState(cloudAv);
    const mergedUnlocked = Array.from(new Set([...localSt.unlocked, ...cloudSt.unlocked]));
    const mergedNpcSolved = Array.from(new Set([...localSt.npcSolved, ...cloudSt.npcSolved]));
    const mergedLabs = Array.from(new Set([...localSt.labCompleted, ...cloudSt.labCompleted]));
    const mergedCitadel = Array.from(new Set([...localSt.citadelTokens, ...cloudSt.citadelTokens])).sort();
    const hasCloudLocked = cloudAv.presetLocked !== undefined;
    const presetLocked = hasCloudLocked ? (cloudAv.presetLocked === true) : localSt.presetLocked;
    const presetId = presetLocked
      ? (cloudSt.presetId || localSt.presetId || (cloudSt.look && cloudSt.look.hair) || (localSt.look && localSt.look.hair) || "")
      : "";
    const useCloudLook = Boolean(cloudAv.look && (cloudSt.presetLocked || !localRaw || !localRaw.look));
    const look = useCloudLook ? cloudSt.look : localSt.look;
    const eqSource = (Object.keys(cloudSt.equipped).length > 0 && (!localRaw || Object.keys(localSt.equipped).length === 0 || cloudSt.presetLocked))
      ? cloudSt.equipped
      : localSt.equipped;
    const merged = sanitizeState({
      v: 1,
      lockPolicyVersion: presetLocked ? Math.max(localSt.lockPolicyVersion || 2, cloudSt.lockPolicyVersion || 2) : 2,
      look,
      presetLocked,
      presetId,
      lockedAt: presetLocked ? (cloudSt.lockedAt || localSt.lockedAt || null) : null,
      unlocked: mergedUnlocked,
      npcSolved: mergedNpcSolved,
      labCompleted: mergedLabs,
      citadelTokens: mergedCitadel,
      equipped: eqSource,
      preLockStages: presetLocked ? Array.from(new Set([...(localSt.preLockStages || []), ...(cloudSt.preLockStages || [])])) : [],
      rewardedStages: presetLocked ? Array.from(new Set([...(localSt.rewardedStages || []), ...(cloudSt.rewardedStages || [])])) : [],
      labRewarded: presetLocked ? Array.from(new Set([...(localSt.labRewarded || []), ...(cloudSt.labRewarded || [])])) : [],
      citadelRewarded: presetLocked ? Array.from(new Set([...(localSt.citadelRewarded || []), ...(cloudSt.citadelRewarded || [])])) : [],
      npcRewarded: presetLocked ? Array.from(new Set([...(localSt.npcRewarded || []), ...(cloudSt.npcRewarded || [])])) : []
    });
    syncStateBalanceFields(merged);
    try {
      localStorage.setItem(stateKey(p), JSON.stringify(merged));
      localStorage.setItem(labKey(p), JSON.stringify(merged.labCompleted || []));
    } catch (e) { console.warn(e); }
    emit();
    return merged;
  }
  const emit = () => document.dispatchEvent(new CustomEvent("ii:avatar-changed"));
  document.addEventListener("ii:logout", () => resetGuestState());

  function getCompletedMicroLabs() {
    return (getState().labCompleted || []).slice();
  }
  function isMicroLabCompleted(islandId) {
    const cid = resolveLabIslandId(islandId);
    return cid ? getCompletedMicroLabs().includes(cid) : false;
  }
  function isMicroLabRewarded(islandId) {
    const cid = resolveLabIslandId(islandId);
    if (!cid) return false;
    const st = getState();
    if (!isAvatarLocked(st)) return false;
    if (st.lockPolicyVersion === 1) return (st.labCompleted || []).includes(cid);
    return Array.isArray(st.labRewarded) && st.labRewarded.includes(cid);
  }
  function completeMicroLab(islandId) {
    const cid = resolveLabIslandId(islandId);
    if (!cid) return { ok: false, gained: 0, coins: wallet().coins };
    const st = getState();
    const isGuest = !profile();
    const locked = isAvatarLocked(st);
    const already = st.labCompleted.includes(cid);
    const alreadyRewarded = Array.isArray(st.labRewarded) && st.labRewarded.includes(cid);
    let gained = 0;
    let changed = false;
    if (!already) {
      st.labCompleted = [...st.labCompleted, cid];
      changed = true;
    }
    if (locked && !already && !alreadyRewarded) {
      st.labRewarded = [...(st.labRewarded || []), cid];
      gained = LAB_COIN_REWARD;
      changed = true;
    }
    if (changed) {
      saveState(st, { immediate: true });
      emit();
      document.dispatchEvent(new CustomEvent("ii:microlab-updated", { detail: { islandId: cid, completed: true, gained, lockedRequired: !locked } }));
    }
    return {
      ok: true,
      islandId: cid,
      gained,
      already,
      lockedRequired: !locked,
      guest: isGuest,
      coins: wallet(st).coins
    };
  }

  function isCitadelTokenRewarded(token) {
    const clean = String(token || "").trim().toLowerCase();
    if (!clean) return false;
    const st = getState();
    if (!isAvatarLocked(st)) return false;
    if (st.lockPolicyVersion === 1) return (st.citadelTokens || []).includes(clean);
    return Array.isArray(st.citadelRewarded) && st.citadelRewarded.includes(clean);
  }

  function grantCitadelToken(token, opt = {}) {
    const clean = String(token || "").trim().toLowerCase();
    if (!CITADEL_ALL_KEYS.has(clean)) return { ok: false, gained: 0, coins: wallet().coins };
    const st = getState();
    const locked = isAvatarLocked(st);
    const already = (st.citadelTokens || []).includes(clean);
    const alreadyRewarded = Array.isArray(st.citadelRewarded) && st.citadelRewarded.includes(clean);
    let gained = 0;
    let changed = false;
    if (!already) {
      st.citadelTokens = sanitizeCitadelTokens([...(st.citadelTokens || []), clean]);
      changed = true;
    }
    if (locked && !already && !alreadyRewarded) {
      if (CITADEL_DOJO_KEYS.includes(clean)) {
        st.citadelRewarded = [...(st.citadelRewarded || []), clean];
        gained = DOJO_COIN_REWARD;
        changed = true;
      } else if (CITADEL_CAPSTONE_KEYS.includes(clean)) {
        st.citadelRewarded = [...(st.citadelRewarded || []), clean];
        gained = CAPSTONE_COIN_REWARD;
        changed = true;
      }
    }
    if (changed) {
      saveState(st, { syncCloud: opt.syncCloud !== false, immediate: true });
      emit();
    }
    return {
      ok: true,
      token: clean,
      already,
      lockedRequired: !locked,
      gained,
      tokens: st.citadelTokens.slice(),
      coins: wallet(st).coins
    };
  }

  /** 讀取既有測驗紀錄，追溯各難度通過單元數（任一次 ≥ 60 分即算通過） */
  function quizStats() {
    const evs = window.Store && window.Store.profile ? window.Store.events().filter((e) => e && e.type === "quiz") : [];
    const passed = { easy: new Set(), medium: new Set(), hard: new Set() };
    const cleared = new Set();
    const cc = window.CompletionCenter;
    if (cc && typeof cc.extractPassedStageSet === "function") {
      cc.extractPassedStageSet(evs).forEach((tok) => {
        const [unit, diff] = tok.split(":");
        if (unit && passed[diff]) {
          passed[diff].add(unit);
          cleared.add(unit);
        }
      });
    } else {
      evs.forEach((e) => {
        const unit = String(e.unit || e.unitId || "").trim();
        if (!unit) return;
        const raw = e.difficulty || e.quizDifficulty || (e.detail && e.detail.difficulty) || "single";
        const diff = raw === "single" ? "easy" : raw;
        if ((Number(e.score) || 0) >= PASS_SCORE) {
          if (passed[diff]) passed[diff].add(unit);
          cleared.add(unit);
        }
      });
    }
    const overall = cc && typeof cc.calculateOverallCompletion === "function"
      ? cc.calculateOverallCompletion(evs)
      : null;
    const sum = window.Store && window.Store.summarizeQuizEvents ? window.Store.summarizeQuizEvents(evs) : { totalScore: 0, crowns: 0, quizCount: 0 };
    const isl = Array.isArray(window.ISLANDS) ? window.ISLANDS : [];
    const totalUnits = overall ? overall.totalUnits : isl.reduce((n, i) => n + ((i.sequence && i.sequence.length) || 0), 0);
    const totalStages = overall ? overall.totalStages : totalUnits * 3;
    const passedStages = overall ? overall.passedStages : (passed.easy.size + passed.medium.size + passed.hard.size);
    const completionPct = overall ? overall.percentage : 0;
    return {
      passed,
      cleared: cleared.size,
      totalUnits,
      passedStages,
      totalStages,
      completionPct,
      totalScore: sum.totalScore || 0, crowns: sum.crowns || 0, quizCount: sum.quizCount || 0,
      maxScore: Math.max(isl.length, 1) * 300, maxCrowns: Math.max(isl.length, 1) * 3
    };
  }

  function computeWallet(st, qs = quizStats()) {
    const locked = isAvatarLocked(st);
    if (!locked) {
      return {
        locked: false,
        earned: { easy: 0, medium: 0, hard: 0 },
        used: { easy: 0, medium: 0, hard: 0 },
        avail: { easy: 0, medium: 0, hard: 0 },
        vouchers: { easy: 0, medium: 0, hard: 0 },
        coinsEarned: 0,
        labCoinsEarned: 0,
        dojoCoinsEarned: 0,
        capstoneCoinsEarned: 0,
        citadelCoinsEarned: 0,
        spent: 0,
        coins: 0,
        starCoins: 0
      };
    }

    const preLockSet = new Set(Array.isArray(st.preLockStages) ? st.preLockStages : []);
    const earned = {
      easy: Array.from(qs.passed.easy).filter((u) => !preLockSet.has(`${u}:easy`)).length,
      medium: Array.from(qs.passed.medium).filter((u) => !preLockSet.has(`${u}:medium`)).length,
      hard: Array.from(qs.passed.hard).filter((u) => !preLockSet.has(`${u}:hard`)).length
    };
    const used = { easy: 0, medium: 0, hard: 0 };
    let spent = 0;
    (st.unlocked || []).forEach((id) => {
      const item = ITEM_MAP[id];
      if (!item) return;
      if (item.tier === "star") spent += item.price;
      else used[item.tier]++;
    });
    const avail = {};
    Object.keys(earned).forEach((k) => { avail[k] = Math.max(0, earned[k] - used[k]); });

    const isLegacy = st.lockPolicyVersion === 1;
    const labList = isLegacy ? (st.labCompleted || []) : (st.labRewarded || []);
    const ctList = isLegacy ? (st.citadelTokens || []) : (st.citadelRewarded || []);
    const npcList = isLegacy ? (st.npcSolved || []) : (st.npcRewarded || []);

    const labCount = Array.isArray(labList) ? labList.length : 0;
    const labCoinsEarned = labCount * LAB_COIN_REWARD;
    const ctSet = new Set(Array.isArray(ctList) ? ctList : []);
    const dojoCount = CITADEL_DOJO_KEYS.filter((k) => ctSet.has(k)).length;
    const capstoneCount = CITADEL_CAPSTONE_KEYS.filter((k) => ctSet.has(k)).length;
    const dojoCoinsEarned = dojoCount * DOJO_COIN_REWARD;
    const capstoneCoinsEarned = capstoneCount * CAPSTONE_COIN_REWARD;
    const citadelCoinsEarned = dojoCoinsEarned + capstoneCoinsEarned;
    const coinsEarned = npcList.length * COIN_PER_QUESTION + labCoinsEarned + citadelCoinsEarned;
    const coins = Math.max(0, coinsEarned - spent);
    return {
      locked: true,
      earned,
      used,
      avail,
      vouchers: { easy: avail.easy, medium: avail.medium, hard: avail.hard },
      coinsEarned,
      labCoinsEarned,
      dojoCoinsEarned,
      capstoneCoinsEarned,
      citadelCoinsEarned,
      spent,
      coins,
      starCoins: coins
    };
  }

  function wallet(st = getState(), qs = quizStats()) {
    return computeWallet(st, qs);
  }

  function recordQuizVoucher(rawStageToken) {
    const tok = String(rawStageToken || "").trim().toLowerCase();
    const m = tok.match(/^([a-z]+-\d+):(easy|medium|hard)$/);
    if (!m) return { gained: false, tier: "", ticket: "", short: "" };
    const st = getState();
    if (!isAvatarLocked(st)) {
      return { gained: false, lockedRequired: true, tier: m[2], ticket: "", short: "" };
    }
    const preLock = new Set(st.preLockStages || []);
    const rewarded = new Set(st.rewardedStages || []);
    const t = TIERS[m[2]];
    if (preLock.has(tok) || rewarded.has(tok)) {
      return { gained: false, already: true, tier: m[2], ticket: t ? t.ticket : "", short: t ? t.short : "" };
    }
    st.rewardedStages = [...rewarded, tok];
    saveState(st);
    emit();
    return {
      gained: true,
      tier: m[2],
      ticket: t ? t.ticket : "",
      short: t ? t.short : ""
    };
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
    if (!isAvatarLocked(st)) {
      return { ok: false, lockedRequired: true, msg: "🔒 請先至「基礎造型」選定並鎖定專屬角色，往後過關才能累積星幣與兌換券來解鎖裝備！" };
    }
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
    if (key === "hair") {
      if (isAvatarLocked(st) && val !== st.look.hair) {
        return { ok: false, locked: true, msg: "🔒 你已選定專屬造型，無法更換其他角色；快去闖關解鎖帽子、衣服、武器與寵物來自由搭配吧！" };
      }
      const next = normalizeLook({ ...st.look, hair: val });
      const styleObj = HAIR_STYLES.find((x) => x.id === next.hair) || HAIR_STYLES[0];
      st.look = { ...next, hairColor: styleObj.defaultColor };
    } else {
      st.look = normalizeLook({ ...st.look, [key]: val });
    }
    saveState(st);
    emit();
    return { ok: true, look: st.look };
  }
  function lockPreset() {
    const st = getState();
    if (!profile()) return { ok: false, msg: "請先登入探險護照！" };
    const chosenPresetId = (st.look && st.look.hair) ? String(st.look.hair).trim() : "";
    if (!chosenPresetId) return { ok: false, msg: "請先選擇一位專屬角色造型！" };
    if (isAvatarLocked(st)) return { ok: true, already: true, state: st };

    // 快照鎖定前已通過的所有測驗關卡，鎖定當下與之前過關項目絕不補發兌換券或星幣
    const qs = quizStats();
    const passedBeforeLock = [];
    ["easy", "medium", "hard"].forEach((diff) => {
      qs.passed[diff].forEach((unit) => {
        const tok = `${unit}:${diff}`;
        if (!passedBeforeLock.includes(tok)) passedBeforeLock.push(tok);
      });
    });

    st.presetLocked = true;
    st.presetId = chosenPresetId;
    st.lockPolicyVersion = 2;
    st.lockedAt = Date.now();
    st.preLockStages = Array.from(new Set([...(st.preLockStages || []), ...passedBeforeLock])).sort();
    st.rewardedStages = [];
    st.labRewarded = [];
    st.citadelRewarded = [];
    st.npcRewarded = [];
    st.starCoins = 0;
    st.vouchers = { easy: 0, medium: 0, hard: 0 };

    saveState(st, { immediate: true });
    emit();
    return { ok: true, state: st };
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
    const locked = isAvatarLocked(st);
    const already = st.npcSolved.includes(qid);
    if (already) return { ok: true, gained: 0, already: true, lockedRequired: !locked };
    st.npcSolved.push(qid);
    let gained = 0;
    if (locked) {
      st.npcRewarded = Array.from(new Set([...(st.npcRewarded || []), qid]));
      gained = COIN_PER_QUESTION;
    }
    saveState(st);
    emit();
    return { ok: true, gained, lockedRequired: !locked };
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
      const st = getState();
      const locked = isAvatarLocked(st);
      const solved = new Set(st.npcSolved);
      const doneCount = set.filter((q) => solved.has(q.id)).length;
      const q = set[idx];
      const isDone = solved.has(q.id);
      const isRewarded = st.lockPolicyVersion === 1
        ? solved.has(q.id)
        : (Array.isArray(st.npcRewarded) && st.npcRewarded.includes(q.id));
      const coins = wallet(st).coins;
      const opts = q.type === "tf" ? TF : q.options;
      host.innerHTML = `<div class="npcq npc-fade-in">
        <div class="npcq-head">
          <span class="npcq-title">⭐ 領航員隨堂快問快答</span>
          <span class="npcq-prog">本島已破解 ${doneCount} / ${set.length}</span>
          <span class="npcq-coin" data-coin>⭐ <b>${coins}</b></span>
        </div>
        <div class="npcq-dots">${set.map((x, i) => `<span class="${solved.has(x.id) ? "ok" : ""}${i === idx ? " cur" : ""}"></span>`).join("")}</div>
        <p class="npcq-q"><span class="npcq-type">${q.type === "tf" ? "是非題" : "選擇題"}</span>${esc(q.q)}
          ${isDone
            ? `<span class="npcq-done">${isRewarded ? "✔ 星幣已領取" : "✔ 已作答（鎖定角色前無星幣）"}</span>`
            : (locked ? `<span class="npcq-reward">答對 +${COIN_PER_QUESTION} ⭐</span>` : `<span class="npcq-reward is-locked">🔒 鎖定角色後才累計星幣</span>`)}</p>
        <div class="npcq-opts${q.type === "tf" ? " is-tf" : ""}">${opts.map((o, i) => `<button type="button" class="npcq-opt" data-i="${i}">${esc(o)}</button>`).join("")}</div>
        <div class="npcq-fb" hidden></div>
        <div class="npcq-actions">
          ${!profile()
            ? `<span class="npcq-hint">🔒 登入探險護照後答對才會累積星幣喔</span>`
            : (!locked ? `<span class="npcq-hint">🔒 尚未鎖定專屬角色：僅記錄作答進度，星幣維持 0（請至「學習成果 → 角色更衣室」鎖定）</span>` : "")}
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
        } else if (r.lockedRequired && !r.already) {
          gainedHtml = `<small>（🔒 尚未鎖定專屬角色，本次僅記錄探索進度，星幣維持 0）</small>`;
        } else if (r.lockedRequired) {
          gainedHtml = `<small>（🔒 尚未鎖定專屬角色，星幣維持 0）</small>`;
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

  window.isAvatarLocked = isAvatarLocked;
  window.AvatarSystem = {
    ITEMS, ITEM_MAP, TIERS, SLOT_NAME, HAIR_STYLES, HAIR_COLORS, FACES, TITLES, NPC_QUIZ, COIN_PER_QUESTION, LAB_COIN_REWARD, DOJO_COIN_REWARD, CAPSTONE_COIN_REWARD, DEFAULT_LOOK, EYE_PRESETS,
    renderAvatar, renderThumb, renderLookThumb, renderMiniAvatar, normalizeLook, getHairPalette, sanitizeState, restoreCloudAvatar, resetGuestState,
    isAvatarLocked, getState, quizStats, wallet, title, unlock, toggleEquip, setLook, lockPreset, answerNpc, recordQuizVoucher,
    resolveLabIslandId, isMicroLabCompleted, isMicroLabRewarded, getCompletedMicroLabs, completeMicroLab,
    grantCitadelToken, isCitadelTokenRewarded, getCitadelHonorsSummary, sanitizeCitadelTokens,
    toast, mountNpcQuiz, downloadCard, esc
  };
})();
