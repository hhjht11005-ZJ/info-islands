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
    { id: "male_jinwoo", group: "male", name: "暗影君王碎髮", defaultColor: "indigo", baseHex: "#1E1B4B" },
    { id: "male_isagi", group: "male", name: "雙呆毛前鋒少年", defaultColor: "navy", baseHex: "#172554" },
    { id: "male_okarun", group: "male", name: "詛咒白髮面具客", defaultColor: "silver", baseHex: "#F8FAFC" },
    { id: "female_frieren", group: "female", name: "銀髮精靈魔法使", defaultColor: "silver", baseHex: "#E2E8F0" },
    { id: "female_ai", group: "female", name: "星瞳偶像側馬尾", defaultColor: "violetpink", baseHex: "#9333EA" },
    { id: "female_bocchi", group: "female", name: "粉髮方塊夾吉他手", defaultColor: "pink", baseHex: "#F472B6" },
    { id: "female_momo", group: "female", name: "外翹短髮大耳環少女", defaultColor: "caramel", baseHex: "#A14D3A" }
  ];
  const HAIR_COLORS = [
    { id: "silver", name: "純銀雪白", top: "#FFFFFF", c: "#F1F5F9", s: "#B8C7D9", hl: "#38BDF8", shine: "#FFFFFF" },
    { id: "indigo", name: "暗影藍黑", top: "#312E81", c: "#1E1B4B", s: "#0F0D2E", hl: "#A855F7", shine: "#818CF8" },
    { id: "navy", name: "深海靛藍", top: "#1E40AF", c: "#172554", s: "#0B1333", hl: "#10B981", shine: "#60A5FA" },
    { id: "violetpink", name: "夢幻紫紅", top: "#9333EA", c: "#C026D3", bot: "#EC4899", s: "#6B21A8", hl: "#FDE047", shine: "#F5D0FE" },
    { id: "pink", name: "櫻花粉晶", top: "#FBCFE8", c: "#F472B6", s: "#BE185D", hl: "#38BDF8", shine: "#FFF1F7" },
    { id: "caramel", name: "焦糖紅棕", top: "#C96A53", c: "#A14D3A", s: "#692B1E", hl: "#34D399", shine: "#F5C2B4" },
    { id: "black", name: "星空黑", top: "#484D78", c: "#2B2E4D", s: "#17182B", hl: "#FF4D8D", shine: "#98A0E6" },
    { id: "blue", name: "電光藍", top: "#78C6FF", c: "#3498F0", s: "#1756B0", hl: "#FF79C6", shine: "#D6EEFF" }
  ];
  const FACES = [
    { id: "calm", name: "呆萌平靜臉" },
    { id: "happy", name: "彎月開心笑" },
    { id: "angry", name: "鼓臉生氣氣" },
    { id: "surprised", name: "驚訝 O 型嘴" },
    { id: "teary", name: "委屈淚汪汪" }
  ];
  const LEGACY_HAIR_MAP = {
    male_fluffy: "male_jinwoo",
    male_spiky: "male_gojo",
    male_comma: "male_isagi",
    male_wavy: "male_okarun",
    female_bob: "female_momo",
    female_ponytail: "female_ai",
    female_buns: "female_frieren",
    female_longwavy: "female_bocchi",
    short: "male_isagi",
    ponytail: "female_ai",
    wavy: "male_okarun",
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
    if (hairColorId === "silver") {
      if (hairId === "male_okarun") return { ...base, top: "#FFFFFF", c: "#F8FAFC", s: "#CBD5E1", hl: "#EF4444" };
      if (hairId === "female_frieren") return { ...base, top: "#F8FAFC", c: "#E2E8F0", s: "#94A3B8", hl: "#EF4444" };
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

  // 8 款招牌動漫角色立體雕塑髮型 ＋ 專屬髮飾與暗影微粒
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

    // 2｜暗影君王碎髮（成振宇特徵）：深藍黑髮、不規則尖角狼尾碎瀏海（微遮左眼）＋後頸微翹＋暗影微粒
    male_jinwoo: {
      back: (h, c) => `<path d="M54 118 Q48 44 120 38 Q192 44 186 118 Q183 132 174 138 L202 146 Q184 150 166 141 L74 141 Q56 150 38 146 L66 138 Q57 132 54 118Z" fill="${hairBackFill(c)}" stroke="${OL}" stroke-width="2.3" stroke-linejoin="round"/>`,
      crown: (h, c, headId) => COVER_HATS.has(headId)
        ? openTopCap(h, c, headId)
        : `<path d="M55 92 Q52 44 120 38 Q188 44 185 92 Q168 60 120 58 Q72 60 55 92 Z" fill="${hairFill(c)}" stroke="${OL}" stroke-width="2.3" stroke-linejoin="round"/>
          ${shine(h, "M82 50 Q114 39 148 47")}`,
      sideburns: (h, c) => `<path d="M56 84 L46 116 L59 138 L68 112 L67 90 Z" fill="${hairFill(c)}" stroke="${OL}" stroke-width="2" stroke-linejoin="round"/>
        <path d="M184 84 L194 116 L181 138 L172 112 L173 90 Z" fill="${hairFill(c)}" stroke="${OL}" stroke-width="2" stroke-linejoin="round"/>`,
      bangs: (h, c) => `<path d="M58 90 Q66 53 120 52 Q174 53 182 90 L170 76 L163 97 L151 74 L141 103 L130 75 L119 98 L111 76 L101 117 L93 79 L80 99 L73 77 L64 90 Z" fill="${hairFill(c)}" stroke="${OL}" stroke-width="2.1" stroke-linejoin="round"/>
        <path d="M98 63 Q102 88 101 112 M139 63 Q141 80 141 96" fill="none" stroke="${h.shine}" stroke-width="1.6" stroke-linecap="round" opacity=".55"/>`,
      aura: (h, c) => `<g opacity=".82">
        <path d="M56 172 Q42 156 54 138 Q56 154 66 164 Z" fill="#1e1b4b" stroke="#a855f7" stroke-width="1.3" filter="${c.sglow}"/>
        <path d="M184 168 Q199 151 187 134 Q183 149 175 160 Z" fill="#1e1b4b" stroke="#a855f7" stroke-width="1.3" filter="${c.sglow}"/>
        <path d="M46 148 L50 140 L54 148 L50 156 Z" fill="#a855f7" opacity=".88" filter="${c.sglow}"/>
        <path d="M190 144 L194 137 L198 144 L194 151 Z" fill="#c084fc" opacity=".9" filter="${c.sglow}"/>
        <circle cx="64" cy="144" r="2.2" fill="#d8b4fe" opacity=".85"/>
      </g>`
    },

    // 3｜雙呆毛前鋒少年（潔世一特徵）：深海靛藍黑髮、運動短碎髮＋頭頂超大 V 字形雙呆毛
    male_isagi: {
      back: (h, c) => `<path d="M56 116 Q52 44 120 40 Q188 44 184 116 Q178 134 166 138 L74 138 Q62 134 56 116Z" fill="${hairBackFill(c)}" stroke="${OL}" stroke-width="2.3"/>`,
      crown: (h, c, headId) => {
        const ahoge = `<g>
          <path d="M119 46 Q102 22 80 9 Q103 18 117 41 Z" fill="${hairFill(c)}" stroke="${OL}" stroke-width="2.2" stroke-linejoin="round"/>
          <path d="M121 46 Q138 22 160 9 Q137 18 123 41 Z" fill="${hairFill(c)}" stroke="${OL}" stroke-width="2.2" stroke-linejoin="round"/>
          <path d="M90 15 Q104 23 114 38 M150 15 Q136 23 126 38" fill="none" stroke="${h.shine}" stroke-width="1.6" stroke-linecap="round" opacity=".7"/>
        </g>`;
        if (COVER_HATS.has(headId)) {
          return `${ahoge}${openTopCap(h, c, headId)}`;
        }
        return `${ahoge}<path d="M57 90 Q57 42 120 40 Q183 42 183 90 Q168 58 120 56 Q72 58 57 90 Z" fill="${hairFill(c)}" stroke="${OL}" stroke-width="2.2"/>
          ${shine(h, "M82 51 Q110 41 142 47")}`;
      },
      sideburns: (h, c) => `<path d="M57 84 Q51 108 61 126 L69 98 Z" fill="${hairFill(c)}" stroke="${OL}" stroke-width="2" stroke-linejoin="round"/>
        <path d="M183 84 Q189 108 179 126 L171 98 Z" fill="${hairFill(c)}" stroke="${OL}" stroke-width="2" stroke-linejoin="round"/>`,
      bangs: (h, c) => `<path d="M59 88 Q68 54 120 53 Q172 54 181 88 L170 74 L161 89 L149 70 L138 92 L127 71 L118 95 L108 71 L96 92 L85 70 L74 87 L67 74 Z" fill="${hairFill(c)}" stroke="${OL}" stroke-width="2.1" stroke-linejoin="round"/>
        <path d="M94 64 L96 84 M120 61 L119 86 M145 64 L141 84" fill="none" stroke="${h.shine}" stroke-width="1.7" stroke-linecap="round" opacity=".5"/>`
    },

    // 4｜詛咒白髮面具客（厄卡倫變身特徵）：純白雪霧髮、大體積炸開閃電波浪捲髮束
    male_okarun: {
      back: (h, c) => `<path d="M44 114 Q30 88 46 66 Q36 42 66 36 Q82 14 110 26 Q134 10 156 28 Q186 18 196 46 Q214 68 194 92 Q204 118 182 134 Q168 142 154 136 L86 136 Q72 142 58 134 Q42 126 44 114 Z" fill="${hairBackFill(c)}" stroke="${OL}" stroke-width="2.3" stroke-linejoin="round"/>`,
      crown: (h, c, headId) => COVER_HATS.has(headId)
        ? openTopCap(h, c, headId)
        : `<path d="M46 92 Q32 62 56 44 Q64 20 96 28 Q118 8 144 26 Q178 16 188 46 Q210 66 192 92 Q178 72 162 66 Q142 58 120 58 Q98 58 78 66 Q60 72 46 92 Z" fill="${hairFill(c)}" stroke="${OL}" stroke-width="2.3" stroke-linejoin="round"/>
          <path d="M64 46 Q86 30 108 38 M124 26 Q150 22 172 40 M178 52 Q196 64 186 80" fill="none" stroke="${h.s}" stroke-width="1.8" stroke-linecap="round" opacity=".55"/>
          ${shine(h, "M84 44 Q118 32 154 42")}`,
      sideburns: (h, c) => `<path d="M52 82 Q36 96 44 114 Q52 126 63 122 Q68 106 64 88 Z" fill="${hairFill(c)}" stroke="${OL}" stroke-width="2" stroke-linejoin="round"/>
        <path d="M188 82 Q204 96 196 114 Q188 126 177 122 Q172 106 176 88 Z" fill="${hairFill(c)}" stroke="${OL}" stroke-width="2" stroke-linejoin="round"/>`,
      bangs: (h, c) => `<path d="M54 90 Q62 52 120 51 Q178 52 186 90 Q173 74 162 84 Q152 62 138 82 Q126 62 115 86 Q104 60 92 84 Q80 64 68 83 Z" fill="${hairFill(c)}" stroke="${OL}" stroke-width="2.1" stroke-linejoin="round"/>`
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

    // 6｜星瞳偶像側馬尾（星野愛特徵）：紫紅漸層髮、空氣斜瀏海＋右側高束大側馬尾＋粉白兔子造型髮飾
    female_ai: {
      back: (h, c) => `<g>
        <path d="M150 52 Q204 26 218 82 Q226 134 198 184 Q192 150 189 124 Q182 88 156 68 Z" fill="${hairFill(c)}" stroke="${OL}" stroke-width="2.3" stroke-linejoin="round"/>
        <path d="M178 56 Q208 98 198 164" fill="none" stroke="${h.s}" stroke-width="2.4" stroke-linecap="round" opacity=".5"/>
        <path d="M180 52 Q202 82 200 120" fill="none" stroke="${h.shine}" stroke-width="2.2" stroke-linecap="round" opacity=".55"/>
        <path d="M53 118 Q47 44 120 39 Q193 44 187 118 Q194 174 178 224 L62 224 Q46 174 53 118Z" fill="${hairBackFill(c)}" stroke="${OL}" stroke-width="2.3" stroke-linejoin="round"/>
      </g>`,
      crown: (h, c, headId) => {
        const covered = COVER_HATS.has(headId);
        const by = covered ? 58 : 48;
        const bx = covered ? 164 : 158;
        const bunnyClip = `<g transform="translate(${bx} ${by}) rotate(18)">
          <ellipse cx="-6" cy="-14" rx="4.5" ry="11" fill="#ffffff" stroke="${OL}" stroke-width="1.8" transform="rotate(-12 -6 -14)"/>
          <ellipse cx="-6" cy="-14" rx="2.1" ry="7" fill="#f472b6" transform="rotate(-12 -6 -14)"/>
          <ellipse cx="6" cy="-14" rx="4.5" ry="11" fill="#ffffff" stroke="${OL}" stroke-width="1.8" transform="rotate(12 6 -14)"/>
          <ellipse cx="6" cy="-14" rx="2.1" ry="7" fill="#f472b6" transform="rotate(12 6 -14)"/>
          <ellipse cx="0" cy="-1" rx="10" ry="7.5" fill="#ffffff" stroke="${OL}" stroke-width="1.9"/>
          <path d="M-8 6 L-1 2 L-8 -2 Z" fill="#ec4899" stroke="${OL}" stroke-width="1.3" stroke-linejoin="round"/>
          <path d="M8 6 L1 2 L8 -2 Z" fill="#ec4899" stroke="${OL}" stroke-width="1.3" stroke-linejoin="round"/>
          <circle cx="0" cy="2" r="2.6" fill="#f472b6" stroke="${OL}" stroke-width="1.2"/>
        </g>`;
        return `${openTopCap(h, c, headId, covered ? "" : "M80 51 Q110 41 138 47")}${bunnyClip}`;
      },
      sideburns: (h, c) => `<path d="M56 86 Q48 122 60 156 Q68 152 68 118 Z" fill="${hairFill(c)}" stroke="${OL}" stroke-width="2" stroke-linejoin="round"/>
        <path d="M184 86 Q192 122 180 156 Q172 152 172 118 Z" fill="${hairFill(c)}" stroke="${OL}" stroke-width="2" stroke-linejoin="round"/>`,
      bangs: (h, c) => `<path d="M58 92 Q66 53 122 52 Q174 54 182 90 Q168 88 156 83 Q150 67 142 84 Q128 87 115 86 Q109 68 102 86 Q86 88 73 84 Q64 90 58 92 Z" fill="${hairFill(c)}" stroke="${OL}" stroke-width="2.1" stroke-linejoin="round"/>
        <path d="M88 64 Q85 76 83 84 M124 62 Q122 76 120 84 M154 64 Q156 75 158 82" fill="none" stroke="${h.shine}" stroke-width="1.8" stroke-linecap="round" opacity=".55"/>`
    },

    // 7｜粉髮方塊夾吉他手（小孤獨特徵）：櫻花粉晶髮、及腰超長直髮＋右側天藍與亮黃雙立體方塊髮夾
    female_bocchi: {
      back: (h, c) => `<path d="M52 114 Q47 42 120 38 Q193 42 188 114 L194 246 Q180 256 164 248 L76 248 Q60 256 46 246 Z" fill="${hairBackFill(c)}" stroke="${OL}" stroke-width="2.3" stroke-linejoin="round"/>
        <path d="M62 152 L58 238 M178 152 L182 238" fill="none" stroke="${h.shine}" stroke-width="2.6" stroke-linecap="round" opacity=".45"/>`,
      crown: (h, c, headId) => openTopCap(h, c, headId, COVER_HATS.has(headId) ? "" : "M80 51 Q120 40 160 51"),
      sideburns: (h, c) => {
        const clips = `<g transform="translate(172 86) rotate(-14)">
          <rect x="-13" y="-6" width="11.5" height="11.5" rx="2.4" fill="#38bdf8" stroke="${OL}" stroke-width="2"/>
          <rect x="-10.8" y="-3.8" width="4.5" height="3.2" rx="1" fill="#bae6fd" opacity=".85"/>
          <rect x="0.5" y="-6" width="11.5" height="11.5" rx="2.4" fill="#facc15" stroke="${OL}" stroke-width="2"/>
          <rect x="2.7" y="-3.8" width="4.5" height="3.2" rx="1" fill="#fef9c3" opacity=".85"/>
        </g>`;
        return `<path d="M55 84 Q47 128 57 166 Q65 174 71 160 Q65 130 68 94 Z" fill="${hairFill(c)}" stroke="${OL}" stroke-width="2.1" stroke-linejoin="round"/>
          <path d="M185 84 Q193 128 183 166 Q175 174 169 160 Q175 130 172 94 Z" fill="${hairFill(c)}" stroke="${OL}" stroke-width="2.1" stroke-linejoin="round"/>${clips}`;
      },
      bangs: (h, c) => `<path d="M60 88 Q66 53 120 53 Q174 53 180 88 Q165 92 152 89 Q146 72 140 89 Q126 92 114 89 Q106 72 99 89 Q84 92 60 88 Z" fill="${hairFill(c)}" stroke="${OL}" stroke-width="2.1" stroke-linejoin="round"/>
        <path d="M84 68 L82 84 M118 65 L118 85 M154 68 L156 84" fill="none" stroke="${h.s}" stroke-width="1.4" stroke-linecap="round" opacity=".45"/>`
    },

    // 8｜外翹短髮大耳環少女（綾瀨桃特徵）：焦糖紅棕髮、齊肩層次短髮＋兩側髮尾向外上方「外翹翻飛」
    female_momo: {
      back: (h, c) => `<path d="M52 114 Q48 44 120 39 Q192 44 188 114 Q196 130 212 122 Q204 146 174 145 L66 145 Q36 146 28 122 Q44 130 52 114 Z" fill="${hairBackFill(c)}" stroke="${OL}" stroke-width="2.3" stroke-linejoin="round"/>`,
      crown: (h, c, headId) => openTopCap(h, c, headId, COVER_HATS.has(headId) ? "" : "M82 51 Q120 40 158 51"),
      sideburns: (h, c) => `<path d="M56 86 Q50 116 40 132 Q31 136 27 124 Q38 144 64 142 Q71 124 68 94 Z" fill="${hairFill(c)}" stroke="${OL}" stroke-width="2.1" stroke-linejoin="round"/>
        <path d="M184 86 Q190 116 200 132 Q209 136 213 124 Q202 144 176 142 Q169 124 172 94 Z" fill="${hairFill(c)}" stroke="${OL}" stroke-width="2.1" stroke-linejoin="round"/>`,
      bangs: (h, c) => `<path d="M58 92 Q66 53 126 52 Q174 54 182 90 Q168 85 156 76 Q146 92 132 82 Q122 93 108 82 Q93 90 78 78 Q68 87 58 92 Z" fill="${hairFill(c)}" stroke="${OL}" stroke-width="2.1" stroke-linejoin="round"/>
        <path d="M98 63 Q112 72 126 78 M138 62 Q150 70 162 78" fill="none" stroke="${h.shine}" stroke-width="2" stroke-linecap="round" opacity=".5"/>`
    }
  };

  // 各造型專屬瞳孔色彩與特效樣式
  const EYE_PRESETS = {
    male_gojo: { top: "#7dd3fc", mid: "#38bdf8", bot: "#0284c7", ring: "#bae6fd", scleraGlow: true },
    male_jinwoo: { top: "#e9d5ff", mid: "#a855f7", bot: "#581c87", ring: "#d8b4fe", sharp: true, energyTrail: true },
    male_isagi: { top: "#6ee7b7", mid: "#10b981", bot: "#065f46", ring: "#a7f3d0", crossStar: true },
    male_okarun: { top: "#fca5a5", mid: "#dc2626", bot: "#450a0a", ring: "#f87171", curseMarks: true },
    female_frieren: { top: "#a7f3d0", mid: "#34d399", bot: "#047857", ring: "#6ee7b7", halfLid: true },
    female_ai: { top: "#7c3aed", mid: "#c026d3", bot: "#f472b6", ring: "#f5d0fe", starPupil: true },
    female_bocchi: { top: "#bfdbfe", mid: "#60a5fa", bot: "#1d4ed8", ring: "#93c5fd", shyBlush: true },
    female_momo: { top: "#fbbf24", mid: "#b45309", bot: "#451a03", ring: "#fcd34d", bigEyes: true }
  };

  // 盲盒公仔立體大眼（寬眼距＋各角色專屬瞳孔、星芒、六眼、半垂眼瞼）
  function vinylEye(x, c, opts = {}) {
    const ep = EYE_PRESETS[opts.hairId] || EYE_PRESETS.male_gojo;
    const ry = opts.ry || (ep.bigEyes ? 11.2 : ep.sharp ? 9.4 : 10.5);
    const rx = opts.rx || (ep.bigEyes ? 9.0 : 8.5);
    const cy = opts.cy || 112;
    let out = "";
    if (ep.scleraGlow) {
      out += `<ellipse cx="${x}" cy="${cy}" rx="${rx + 2.4}" ry="${ry + 1.6}" fill="#e0f2fe" stroke="#38bdf8" stroke-width="1.2" opacity=".95" filter="${c.sglow}"/>`;
    }
    out += `<ellipse cx="${x}" cy="${cy}" rx="${rx}" ry="${ry}" fill="url(#${c.u}-iris)" stroke="#20162b" stroke-width="1.4"${ep.scleraGlow || ep.energyTrail ? ` filter="${c.sglow}"` : ""}/>`;
    out += `<ellipse cx="${x}" cy="${cy + ry * 0.36}" rx="${rx * 0.66}" ry="${ry * 0.34}" fill="${ep.ring}" opacity=".48"/>`;
    if (ep.scleraGlow) {
      out += `<circle cx="${x}" cy="${cy}" r="${(rx * 0.56).toFixed(1)}" fill="none" stroke="#e0f2fe" stroke-width="1.6" opacity=".92"/>`;
      out += `<circle cx="${x}" cy="${cy}" r="${(rx * 0.3).toFixed(1)}" fill="#0c4a6e"/>`;
    }
    if (ep.crossStar) {
      out += `<path d="${starPath(x, cy + 0.5, 6.4, 1.5, 4)}" fill="#ecfdf5" opacity=".95"/>`;
      out += `<circle cx="${x}" cy="${cy + 0.5}" r="2.1" fill="#ffffff"/>`;
    }
    if (ep.starPupil) {
      out += `<path d="${starPath(x, cy + 0.5, 7.2, 3.0, 6)}" fill="#fde68a" stroke="#f472b6" stroke-width="0.9"/>`;
      out += `<path d="${starPath(x, cy + 0.5, 5.2, 2.0, 6)}" fill="#ffffff"/>`;
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

  // 角色臉部招牌配件（五條眼罩開右眼縫 / 厄卡倫眼下紅紋＋圓框眼鏡＋獠牙口罩 / 成振宇眼角流光）
  function characterFaceOverlay(hairId, c, faceId, exprId) {
    let s = "";
    if (hairId === "male_jinwoo") {
      s += `<path d="M84 109 Q73 107 65 101 Q74 109 83 113 Z" fill="#c084fc" opacity=".88" filter="${c.sglow}"/>`;
      s += `<path d="M156 109 Q167 107 175 101 Q166 109 157 113 Z" fill="#c084fc" opacity=".88" filter="${c.sglow}"/>`;
    }
    if (hairId === "male_okarun") {
      // 鮮紅垂直咒紋（保留於臉頰眼下）
      s += `<path d="M92.5 123 L97.5 123 L96 138 L94 138 Z" fill="#ef4444" stroke="#991b1b" stroke-width=".8"/>`;
      s += `<path d="M142.5 123 L147.5 123 L146 138 L144 138 Z" fill="#ef4444" stroke="#991b1b" stroke-width=".8"/>`;
      // 若尚未戴上獎勵眼鏡，顯示圓框眼鏡＋黑底白齒鋸齒狀獠牙口罩
      if (!faceId) {
        s += `<g>
          <circle cx="95" cy="112" r="14.5" fill="#ffffff" fill-opacity=".14" stroke="#334155" stroke-width="2.4"/>
          <circle cx="145" cy="112" r="14.5" fill="#ffffff" fill-opacity=".14" stroke="#334155" stroke-width="2.4"/>
          <path d="M109.5 110 Q120 107 130.5 110 M59 109 L80.5 110 M181 109 L159.5 110" fill="none" stroke="#334155" stroke-width="2.2" stroke-linecap="round"/>
          <path d="M86 105 L93 99" stroke="#ffffff" stroke-width="1.8" stroke-linecap="round" opacity=".65"/>
          <path d="M136 105 L143 99" stroke="#ffffff" stroke-width="1.8" stroke-linecap="round" opacity=".65"/>
        </g>`;
        s += `<g>
          <path d="M62 117 L79 127 M178 117 L161 127 M63 134 L82 141 M177 134 L158 141" stroke="#18181b" stroke-width="2.2" stroke-linecap="round"/>
          <path d="M77 125 Q120 119 163 125 L159 147 Q120 157 81 147 Z" fill="#111827" stroke="#000" stroke-width="2" stroke-linejoin="round"/>
          <path d="M85 130 L91 139 L97 130 L103 139 L109 130 L115 139 L120 130 L125 139 L131 130 L137 139 L143 130 L149 139 L155 130 L153 142 L147 134 L141 144 L135 134 L129 144 L123 134 L117 144 L111 134 L105 144 L99 134 L93 144 L87 135 Z" fill="#ffffff"/>
        </g>`;
      }
    }
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
    }
    return s;
  }

  // 5 款盲盒公仔表情（整合各角色專屬瞳孔與臉部招牌特徵）
  const FACE = {
    calm: (h, c, hairId, faceId) => `${vinylEye(95, c, { hairId })}${vinylEye(145, c, { hairId })}
      <path d="M86 94 Q95 89 104 93" fill="none" stroke="${h.s}" stroke-width="2.6" stroke-linecap="round"/>
      <path d="M136 93 Q145 89 154 94" fill="none" stroke="${h.s}" stroke-width="2.6" stroke-linecap="round"/>
      <path d="M115.5 134.5 Q120 137.5 124.5 134.5" fill="none" stroke="${OL}" stroke-width="2.5" stroke-linecap="round"/>
      <path d="M118 138.5 Q120 139.6 122 138.5" fill="none" stroke="#d99a7e" stroke-width="1.6" stroke-linecap="round"/>
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
  const momoChoker = () => `<g>
    <path d="M108 147 Q120 152 132 147 L132 153 Q120 158 108 153 Z" fill="#18181b" stroke="#09090b" stroke-width="1.4" stroke-linejoin="round"/>
    <circle cx="120" cy="151.5" r="2.1" fill="#e2e8f0" stroke="#475569" stroke-width=".8"/>
  </g>`;
  const defTop = (c) => `<path d="${TORSO}" fill="url(#${c.u}-defTop)" stroke="${OL}" stroke-width="2.2" stroke-linejoin="round"/>
    <path d="M104 153 Q120 165 136 153" fill="none" stroke="#6ec5e9" stroke-width="3.2" stroke-linecap="round"/>
    <path d="M96 164 Q102 186 98 206" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" opacity=".55"/>
    <path d="${starPath(120, 186, 9.5, 4.2)}" fill="#ffd166" stroke="#d99b00" stroke-width="1.3"/>`;
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
    } else if (hairId === "female_momo") {
      earsHtml += `
        <g>
          <circle cx="52" cy="125" r="9.5" fill="none" stroke="${OL}" stroke-width="5.6"/>
          <circle cx="52" cy="125" r="9.5" fill="none" stroke="#34d399" stroke-width="3.6"/>
          <circle cx="55.5" cy="117" r="2.4" fill="#6ee7b7" stroke="${OL}" stroke-width="1.2"/>
          <circle cx="188" cy="125" r="9.5" fill="none" stroke="${OL}" stroke-width="5.6"/>
          <circle cx="188" cy="125" r="9.5" fill="none" stroke="#34d399" stroke-width="3.6"/>
          <circle cx="184.5" cy="117" r="2.4" fill="#6ee7b7" stroke="${OL}" stroke-width="1.2"/>
        </g>`;
    }
    const blushRx = hairId === "female_bocchi" ? 14.2 : 12;
    const blushRy = hairId === "female_bocchi" ? 7.8 : 6.8;
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
    const keepLongBackWithHood = look.hair === "female_frieren" || look.hair === "female_ai" || look.hair === "female_bocchi" || look.hair === "female_momo";
    const size = opt.width ? ` width="${opt.width}" height="${opt.height}"` : "";
    const animIdleCls = opt.noAnim ? "" : (I.mount ? "av-hover" : "av-idle");
    let s = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${opt.viewBox || "0 0 240 300"}"${size} class="av-svg ${opt.cls || ""}" role="img" aria-label="${esc(opt.label || "盲盒公仔角色")}">`;
    s += `<defs>
      <filter id="${u}-glow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="3.2" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
      <filter id="${u}-sglow" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="1.4" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
      ${rg(`${u}-skin`, [[0, "#fff2e6"], [0.48, "#ffe1c8"], [0.86, "#f7c9a6"], [1, "#e8ae86"]], "42%", "34%", "65%")}
      ${rg(`${u}-ear`, [[0, "#f4b998"], [1, "#dfa07b"]], "50%", "45%", "55%")}
      ${rg(`${u}-blush`, [[0, "#ff7a9e", 0.72], [0.6, "#ff94b2", 0.35], [1, "#ff94b2", 0]], "50%", "50%", "50%")}
      ${lg(`${u}-hair`, hc.bot ? [[0, hc.top], [0.5, hc.c], [1, hc.bot]] : [[0, hc.top], [0.45, hc.c], [1, hc.s]], 0.75, 1)}
      ${lg(`${u}-hairBack`, hc.bot ? [[0, hc.top], [0.52, hc.c], [1, hc.bot]] : [[0, hc.c], [1, hc.s]], 0, 1)}
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
    s += neck(c) + (I.top ? L(I.top, "main") : defTop(c)) + L(I.bottom, "over");
    s += arms(I.top, c) + L(I.outer, "front");
    if (look.hair === "female_momo") s += momoChoker();
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
      viewBox: "26 4 188 188", noBg: true, noShadow: true, noAnim: true, cls: opt.cls || "av-mini-svg", label: opt.label || "冒險者頭像"
    });
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
      st.look = normalizeLook(raw.look);
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
    if (key === "hair") {
      const next = normalizeLook({ ...st.look, hair: val });
      const styleObj = HAIR_STYLES.find((x) => x.id === next.hair) || HAIR_STYLES[0];
      st.look = { ...next, hairColor: styleObj.defaultColor };
    } else {
      st.look = normalizeLook({ ...st.look, [key]: val });
    }
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
    ITEMS, ITEM_MAP, TIERS, SLOT_NAME, HAIR_STYLES, HAIR_COLORS, FACES, TITLES, NPC_QUIZ, COIN_PER_QUESTION, DEFAULT_LOOK, EYE_PRESETS,
    renderAvatar, renderThumb, renderLookThumb, renderMiniAvatar, normalizeLook, getHairPalette,
    getState, quizStats, wallet, title, unlock, toggleEquip, setLook, answerNpc,
    toast, mountNpcQuiz, downloadCard, esc
  };
})();
