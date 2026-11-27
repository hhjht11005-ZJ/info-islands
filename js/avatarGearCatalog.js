/* ==========================================================================
 * 擴充裝備庫（32 款角色專屬神裝 ＋ 20 款全角色共同裝備）與 SVG 紙娃娃圖層定義
 * --------------------------------------------------------------------------
 * - 透過 window.__createAvatarExtraItems(h) 注入至 AvatarSystem
 * - 所有 SVG <defs> 漸層均以 `${c.u}-...` 動態命名，確保在風雲榜多個 42px 頭像同場渲染時不衝突
 * ========================================================================== */
(() => {
  window.__createAvatarExtraItems = function createAvatarExtraItems(h) {
    const {
      OL, TORSO,
      WEAPON, WEAPON_L,
      starPath, sparkle, pixelArt, note, lg, rg
    } = h;

    return [
      /* ================================================================
       * A. 五條悟（male_gojo）專屬神裝 × 4
       * ================================================================ */
      {
        id: "gojo_jujutsu_uniform",
        exclusiveFor: "male_gojo",
        characterName: "五條悟",
        tier: "medium",
        price: 650,
        voucherType: "medium",
        vouchers: 3,
        slot: "top",
        style: "tech",
        name: "高專黑色立領術師服",
        desc: "【五條悟專屬】高領暗黑咒術高專制服，金釦閃耀特級威壓。",
        sleeve: { color: "#141824", long: true, cuff: "#1e293b" },
        L: {
          main: (c) => `<defs>${lg(`${c.u}-gjU`, [[0, "#1e2436"], [1, "#0b0e17"]])}</defs>
            <path d="${TORSO}" fill="url(#${c.u}-gjU)" stroke="${OL}" stroke-width="2.2" stroke-linejoin="round"/>
            <path d="M98 156 L102 139 Q120 144 138 139 L142 156 Q120 164 98 156 Z" fill="#181e2c" stroke="${OL}" stroke-width="2" stroke-linejoin="round"/>
            <path d="M120 156 V217" stroke="#334155" stroke-width="2"/>
            <circle cx="127" cy="150" r="3" fill="#eab308" stroke="#713f12" stroke-width="1"/>
            <circle cx="127" cy="172" r="3" fill="#eab308" stroke="#713f12" stroke-width="1"/>
            <circle cx="127" cy="193" r="3" fill="#eab308" stroke="#713f12" stroke-width="1"/>
            <path d="M84 202 H156 V218 Q120 223 84 218 Z" fill="#0f131f" stroke="${OL}" stroke-width="1.8"/>
            <path d="M84 202 H156" stroke="#38bdf8" stroke-width="1.4" opacity=".45"/>`
        }
      },
      {
        id: "gojo_blue_sunglasses",
        exclusiveFor: "male_gojo",
        characterName: "五條悟",
        tier: "easy",
        price: 420,
        voucherType: "easy",
        vouchers: 2,
        slot: "face",
        style: "tech",
        name: "半透明蒼藍圓框墨鏡",
        desc: "【五條悟專屬】卸下眼罩戴上蒼藍圓框墨鏡，六眼青藍光芒隱約透出。",
        L: {
          front: (c) => `<g>
            <path d="M62 108 L78 111 M178 108 L162 111 M112 112 Q120 108 128 112" stroke="#cbd5e1" stroke-width="2.6" stroke-linecap="round"/>
            <circle cx="95" cy="112" r="16.5" fill="#0284c7" fill-opacity=".55" stroke="#e2e8f0" stroke-width="2.8" filter="${c.sglow}"/>
            <circle cx="145" cy="112" r="16.5" fill="#0284c7" fill-opacity=".55" stroke="#e2e8f0" stroke-width="2.8" filter="${c.sglow}"/>
            <circle cx="95" cy="112" r="14" fill="none" stroke="#38bdf8" stroke-width="1.2" opacity=".7"/>
            <circle cx="145" cy="112" r="14" fill="none" stroke="#38bdf8" stroke-width="1.2" opacity=".7"/>
            <path d="M84 105 L95 101 M134 105 L145 101" stroke="#ffffff" stroke-width="2.6" stroke-linecap="round" opacity=".82"/>
          </g>`
        }
      },
      {
        id: "gojo_hollow_purple",
        exclusiveFor: "male_gojo",
        characterName: "五條悟",
        tier: "hard",
        price: 950,
        voucherType: "hard",
        vouchers: 4,
        slot: "weapon",
        style: "tech",
        thumbViewBox: "22 50 198 188",
        name: "無下限「茈」紫紅雙色光球",
        desc: "【五條悟專屬】蒼與赫匯聚而成的虛式「茈」，掌間迸發紫紅能量旋渦。",
        L: {
          left: (c) => WEAPON_L(0, `<g class="av-halo">
            <circle cx="-6" cy="-24" r="16" fill="#38bdf8" opacity=".45" filter="${c.glow}"/>
            <circle cx="-6" cy="-24" r="9" fill="#e0f2fe" stroke="#0284c7" stroke-width="2"/>
          </g>`),
          main: (c) => WEAPON(0, `<defs>${rg(`${c.u}-murasaki`, [[0, "#fff0ff"], [0.38, "#c026d3"], [0.75, "#7e22ce"], [1, "#ef4444", 0.1]])}</defs>
            <circle cx="10" cy="-34" r="27" fill="url(#${c.u}-murasaki)" opacity=".75" filter="${c.glow}"/>
            <circle cx="10" cy="-34" r="16" fill="#f5d0fe" stroke="#a855f7" stroke-width="2.4" filter="${c.sglow}"/>
            <circle cx="4" cy="-37" r="7" fill="#38bdf8" opacity=".65"/>
            <circle cx="16" cy="-31" r="7" fill="#f43f5e" opacity=".65"/>
            <ellipse cx="10" cy="-34" rx="28" ry="8" fill="none" stroke="#e879f9" stroke-width="2" transform="rotate(-24 10 -34)"/>
            ${sparkle(-12, -52, 4.5, "#f0abfc")}${sparkle(30, -18, 4, "#fb7185")}`)
        }
      },
      {
        id: "gojo_infinite_void",
        exclusiveFor: "male_gojo",
        characterName: "五條悟",
        tier: "hard",
        price: 1200,
        voucherType: "hard",
        vouchers: 5,
        slot: "outer",
        style: "tech",
        thumbViewBox: "10 10 220 220",
        name: "無量空處六眼星軌領域",
        desc: "【五條悟專屬】身後展開無量空處的深空星軌矩陣與發光六眼印記。",
        L: {
          back: (c) => `<g>
            <circle cx="120" cy="116" r="88" fill="#090d1e" fill-opacity=".34" stroke="#38bdf8" stroke-width="2.2" stroke-dasharray="9 6" filter="${c.sglow}"/>
            <circle cx="120" cy="116" r="74" fill="none" stroke="#818cf8" stroke-width="1.6" opacity=".8"/>
            <ellipse cx="120" cy="116" rx="96" ry="30" fill="none" stroke="#bae6fd" stroke-width="1.8" opacity=".75" transform="rotate(-22 120 116)"/>
            <ellipse cx="120" cy="116" rx="96" ry="30" fill="none" stroke="#c084fc" stroke-width="1.8" opacity=".75" transform="rotate(22 120 116)"/>
            <circle cx="44" cy="76" r="5" fill="#7dd3fc" filter="${c.glow}"/><circle cx="196" cy="76" r="5" fill="#7dd3fc" filter="${c.glow}"/>
            <circle cx="34" cy="150" r="4" fill="#c084fc"/><circle cx="206" cy="150" r="4" fill="#c084fc"/>
            ${sparkle(120, 22, 6, "#e0f2fe")}${sparkle(56, 40, 4, "#38bdf8")}${sparkle(184, 40, 4, "#38bdf8")}
          </g>`
        }
      },

      /* ================================================================
       * B. 芙莉蓮（female_frieren）專屬神裝 × 4
       * ================================================================ */
      {
        id: "frieren_archmage_robe",
        exclusiveFor: "female_frieren",
        characterName: "芙莉蓮",
        tier: "medium",
        price: 650,
        voucherType: "medium",
        vouchers: 3,
        slot: "top",
        style: "cute",
        name: "白金滾邊大魔法使長袍",
        desc: "【芙莉蓮專屬】聖潔白底金色飾邊法師長袍，搭配典雅短披肩與腰帶。",
        sleeve: { color: "#f8fafc", long: true, cuff: "#eab308" },
        L: {
          main: (c) => `<defs>${lg(`${c.u}-frR`, [[0, "#ffffff"], [0.7, "#f1f5f9"], [1, "#cbd5e1"]])}</defs>
            <path d="M90 154 Q120 147 150 154 L164 236 Q120 245 76 236 Z" fill="url(#${c.u}-frR)" stroke="${OL}" stroke-width="2.2" stroke-linejoin="round"/>
            <path d="M88 154 Q120 168 152 154 L158 176 Q120 189 82 176 Z" fill="#ffffff" stroke="#eab308" stroke-width="2" stroke-linejoin="round"/>
            <path d="M78 232 Q120 240 162 232" fill="none" stroke="#eab308" stroke-width="3.2"/>
            <rect x="86" y="198" width="68" height="8" rx="3" fill="#475569" stroke="${OL}" stroke-width="1.5"/>
            <circle cx="120" cy="202" r="5" fill="#facc15" stroke="#854d0e" stroke-width="1.4"/>
            <path d="M120 162 L126 170 L120 178 L114 170 Z" fill="#ef4444" stroke="#eab308" stroke-width="1.4"/>`
        }
      },
      {
        id: "frieren_gold_ruby_ears",
        exclusiveFor: "female_frieren",
        characterName: "芙莉蓮",
        tier: "easy",
        price: 400,
        voucherType: "easy",
        vouchers: 2,
        slot: "head",
        style: "cute",
        name: "精靈雙馬尾金環與紅寶石耳飾",
        desc: "【芙莉蓮專屬】閃亮鏤空金絲髮環與晨星紅寶石吊墜，散發千年魔法氣息。",
        L: {
          front: (c) => `<g>
            <circle cx="62" cy="116" r="8.5" fill="none" stroke="#facc15" stroke-width="3.4" filter="${c.sglow}"/>
            <circle cx="62" cy="116" r="5" fill="#1e293b" stroke="#eab308" stroke-width="1.3"/>
            <circle cx="178" cy="116" r="8.5" fill="none" stroke="#facc15" stroke-width="3.4" filter="${c.sglow}"/>
            <circle cx="178" cy="116" r="5" fill="#1e293b" stroke="#eab308" stroke-width="1.3"/>
            <path d="M44 126 L51 138 L44 150 L37 138 Z" fill="#ef4444" stroke="#fde047" stroke-width="1.8" filter="${c.sglow}"/>
            <path d="M196 126 L203 138 L196 150 L189 138 Z" fill="#ef4444" stroke="#fde047" stroke-width="1.8" filter="${c.sglow}"/>
            <path d="M100 44 Q120 32 140 44" fill="none" stroke="#facc15" stroke-width="2.4" opacity=".85"/>
            ${sparkle(120, 32, 4.5, "#fef08a")}
          </g>`
        }
      },
      {
        id: "frieren_moon_staff",
        exclusiveFor: "female_frieren",
        characterName: "芙莉蓮",
        tier: "hard",
        price: 920,
        voucherType: "hard",
        vouchers: 4,
        slot: "weapon",
        style: "cute",
        name: "紅寶石月牙魔法杖",
        desc: "【芙莉蓮專屬】金框弦月法杖鑲嵌炙紅寶石，能釋放蒼月草與一般攻擊魔法。",
        L: {
          main: (c) => WEAPON(14, `<rect x="-3.2" y="-110" width="6.4" height="136" rx="3" fill="#7c2d12" stroke="${OL}" stroke-width="1.5"/>
            <rect x="-4" y="-112" width="8" height="10" rx="2" fill="#eab308" stroke="#854d0e" stroke-width="1.2"/>
            <path d="M0 -146 A20 20 0 1 0 16 -116 A15 15 0 1 1 0 -146 Z" fill="#facc15" stroke="#a16207" stroke-width="2" filter="${c.sglow}"/>
            <circle cx="3" cy="-129" r="9" fill="#ef4444" stroke="#fef08a" stroke-width="2" filter="${c.glow}"/>
            <circle cx="1" cy="-131" r="2.8" fill="#fecaca"/>
            ${sparkle(-16, -144, 4.5, "#93c5fd")}${sparkle(20, -120, 4, "#fef08a")}`)
        }
      },
      {
        id: "frieren_grimoire_aura",
        exclusiveFor: "female_frieren",
        characterName: "芙莉蓮",
        tier: "hard",
        price: 1180,
        voucherType: "hard",
        vouchers: 5,
        slot: "outer",
        style: "cute",
        thumbViewBox: "10 20 220 210",
        name: "漂浮古籍魔導書與花田光環",
        desc: "【芙莉蓮專屬】兩側飄浮的魔法古籍與蒼月草花瓣環，重現最溫柔的魔法奇蹟。",
        L: {
          back: (c) => `<g>
            <circle cx="120" cy="128" r="82" fill="none" stroke="#93c5fd" stroke-width="2" stroke-dasharray="6 5" opacity=".78" filter="${c.sglow}"/>
            <g transform="translate(32 104) rotate(-14)">
              <path d="M-16 -10 L0 -6 L16 -10 L16 12 L0 16 L-16 12 Z" fill="#fef3c7" stroke="#92400e" stroke-width="1.8" stroke-linejoin="round"/>
              <path d="M0 -6 V16 M-11 -4 H-3 M3 -4 H11 M-11 3 H-3 M3 3 H11" stroke="#b45309" stroke-width="1.3"/>
            </g>
            <g transform="translate(208 104) rotate(14)">
              <path d="M-16 -10 L0 -6 L16 -10 L16 12 L0 16 L-16 12 Z" fill="#e0f2fe" stroke="#1e40af" stroke-width="1.8" stroke-linejoin="round"/>
              <path d="M0 -6 V16 M-11 -4 H-3 M3 -4 H11" stroke="#2563eb" stroke-width="1.3"/>
            </g>
            <g fill="#60a5fa" opacity=".88">
              <circle cx="44" cy="176" r="5"/><circle cx="52" cy="182" r="4"/><circle cx="196" cy="172" r="5"/><circle cx="188" cy="180" r="4"/>
            </g>
            <g fill="#bfdbfe"><circle cx="48" cy="178" r="2.2"/><circle cx="192" cy="176" r="2.2"/></g>
            ${sparkle(46, 70, 5, "#93c5fd")}${sparkle(194, 70, 5, "#fef08a")}
          </g>`
        }
      },

      /* ================================================================
       * C. 炭治郎（male_tanjiro）專屬神裝 × 4
       * ================================================================ */
      {
        id: "tanjiro_haori_uniform",
        exclusiveFor: "male_tanjiro",
        characterName: "炭治郎",
        tier: "medium",
        price: 620,
        voucherType: "medium",
        vouchers: 3,
        slot: "top",
        style: "cute",
        name: "黑綠市松紋羽織隊服",
        desc: "【炭治郎專屬】鬼殺隊黑色隊服外罩綠黑相間市松紋羽織，守護同伴的決心。",
        sleeve: { color: "#15803d", long: true, cuff: "#111827" },
        L: {
          main: (c) => `<defs><pattern id="${c.u}-ichimatsu" width="14" height="14" patternUnits="userSpaceOnUse">
              <rect width="14" height="14" fill="#16a34a"/>
              <rect width="7" height="7" fill="#111827"/><rect x="7" y="7" width="7" height="7" fill="#111827"/>
            </pattern></defs>
            <path d="${TORSO}" fill="#18181b" stroke="${OL}" stroke-width="2.2" stroke-linejoin="round"/>
            <path d="M90 155 L110 154 L108 216 L81 215 Z" fill="url(#${c.u}-ichimatsu)" stroke="${OL}" stroke-width="2" stroke-linejoin="round"/>
            <path d="M150 155 L130 154 L132 216 L159 215 Z" fill="url(#${c.u}-ichimatsu)" stroke="${OL}" stroke-width="2" stroke-linejoin="round"/>
            <rect x="85" y="198" width="70" height="7" rx="2" fill="#f8fafc" stroke="${OL}" stroke-width="1.5"/>
            <circle cx="120" cy="168" r="2.2" fill="#e2e8f0"/><circle cx="120" cy="182" r="2.2" fill="#e2e8f0"/>`
        }
      },
      {
        id: "tanjiro_hanafuda_mark",
        exclusiveFor: "male_tanjiro",
        characterName: "炭治郎",
        tier: "easy",
        price: 420,
        voucherType: "easy",
        vouchers: 2,
        slot: "head",
        style: "cute",
        name: "花札日輪耳飾與額頭炎紋",
        desc: "【炭治郎專屬】覺醒的赫灼炎紋發光印記與金色鑲邊日輪花札耳墜。",
        L: {
          front: (c) => `<g>
            <path d="M77 65 L83 56 L88 64 L96 55 L100 66 L106 70 L99 77 L102 86 L92 80 L87 89 L82 78 L74 81 L78 72 Z" fill="#ef4444" stroke="#facc15" stroke-width="1.6" filter="${c.sglow}"/>
            <g transform="translate(50 124) rotate(8)">
              <rect x="-6.5" y="0" width="13" height="22" rx="2" fill="#ffffff" stroke="#eab308" stroke-width="2" filter="${c.sglow}"/>
              <circle cx="0" cy="8" r="4" fill="#ef4444"/>
              <path d="M-4.5 18 L0 12 L4.5 18 M0 12 V20" stroke="#dc2626" stroke-width="1.5" fill="none"/>
            </g>
            <g transform="translate(190 124) rotate(-8)">
              <rect x="-6.5" y="0" width="13" height="22" rx="2" fill="#ffffff" stroke="#eab308" stroke-width="2" filter="${c.sglow}"/>
              <circle cx="0" cy="8" r="4" fill="#ef4444"/>
              <path d="M-4.5 18 L0 12 L4.5 18 M0 12 V20" stroke="#dc2626" stroke-width="1.5" fill="none"/>
            </g>
          </g>`
        }
      },
      {
        id: "tanjiro_nichirin_blade",
        exclusiveFor: "male_tanjiro",
        characterName: "炭治郎",
        tier: "hard",
        price: 900,
        voucherType: "hard",
        vouchers: 4,
        slot: "weapon",
        style: "tech",
        name: "漆黑日輪刀（水之呼吸波紋）",
        desc: "【炭治郎專屬】漆黑刀身纏繞蔚藍奔湧的水之呼吸浪花，斬斷一切難題。",
        L: {
          main: (c) => WEAPON(22, `<path d="M-5 -132 L4 -144 L5 -12 L-5 -12 Z" fill="#18181b" stroke="#64748b" stroke-width="1.6" stroke-linejoin="round"/>
            <path d="M-4 -128 Q-22 -102 -3 -78 Q18 -54 -4 -26" fill="none" stroke="#38bdf8" stroke-width="5.2" stroke-linecap="round" filter="${c.glow}"/>
            <path d="M-4 -128 Q-22 -102 -3 -78 Q18 -54 -4 -26" fill="none" stroke="#e0f2fe" stroke-width="2.1" stroke-linecap="round"/>
            <circle cx="-12" cy="-98" r="3" fill="#ffffff"/><circle cx="10" cy="-62" r="2.8" fill="#ffffff"/>
            <ellipse cx="0" cy="-12" rx="12" ry="4" fill="#18181b" stroke="#dc2626" stroke-width="1.6"/>
            <rect x="-4" y="-9" width="8" height="28" rx="2" fill="#dc2626" stroke="#18181b" stroke-width="1.4"/>`)
        }
      },
      {
        id: "tanjiro_box_sun_wheel",
        exclusiveFor: "male_tanjiro",
        characterName: "炭治郎",
        tier: "hard",
        price: 1150,
        voucherType: "hard",
        vouchers: 5,
        slot: "outer",
        style: "cute",
        thumbViewBox: "10 20 220 220",
        name: "祢豆子木箱與日之呼吸火輪",
        desc: "【炭治郎專屬】背後背著堅固桐木箱，外圍環繞熾烈金紅日之呼吸火焰輪。",
        L: {
          back: (c) => `<g>
            <circle cx="120" cy="144" r="78" fill="none" stroke="#f97316" stroke-width="6" stroke-dasharray="14 8" opacity=".82" filter="${c.glow}"/>
            <circle cx="120" cy="144" r="78" fill="none" stroke="#fde047" stroke-width="2.2" opacity=".95"/>
            <rect x="66" y="132" width="108" height="96" rx="6" fill="#92400e" stroke="${OL}" stroke-width="2.3"/>
            <rect x="74" y="140" width="92" height="80" rx="3" fill="#b45309" stroke="#78350f" stroke-width="1.6"/>
            <rect x="66" y="156" width="108" height="8" fill="#27272a"/><rect x="66" y="196" width="108" height="8" fill="#27272a"/>
            ${sparkle(48, 98, 5, "#fb923c")}${sparkle(192, 98, 5, "#fde047")}
          </g>`
        }
      },

      /* ================================================================
       * D. 爆豪勝己（male_bakugo）專屬神裝 × 4
       * ================================================================ */
      {
        id: "bakugo_battle_suit",
        exclusiveFor: "male_bakugo",
        characterName: "爆豪勝己",
        tier: "medium",
        price: 650,
        voucherType: "medium",
        vouchers: 3,
        slot: "top",
        style: "tech",
        name: "黑橙爆破戰鬥緊身服",
        desc: "【爆豪勝己專屬】經典黑底大橘 X 爆閃戰衣，領口與腰際配有爆破彈匣。",
        sleeve: { color: "#18181b", long: false, cuff: "#f97316" },
        L: {
          main: () => `<path d="${TORSO}" fill="#18181b" stroke="${OL}" stroke-width="2.2" stroke-linejoin="round"/>
            <path d="M93 156 L120 183 L147 156 L149 169 L126 190 L149 213 L136 216 L120 198 L104 216 L91 213 L114 190 L91 169 Z" fill="#f97316" stroke="${OL}" stroke-width="1.5" stroke-linejoin="round"/>
            <rect x="85" y="199" width="70" height="9" rx="3" fill="#3f3f46" stroke="${OL}" stroke-width="1.5"/>
            <circle cx="98" cy="203.5" r="4" fill="#ef4444" stroke="#18181b" stroke-width="1.2"/>
            <circle cx="142" cy="203.5" r="4" fill="#ef4444" stroke="#18181b" stroke-width="1.2"/>
            <rect x="112" y="197" width="16" height="12" rx="3" fill="#f97316" stroke="${OL}" stroke-width="1.4"/>`
        }
      },
      {
        id: "bakugo_flare_visor",
        exclusiveFor: "male_bakugo",
        characterName: "爆豪勝己",
        tier: "easy",
        price: 440,
        voucherType: "easy",
        vouchers: 2,
        slot: "face",
        style: "tech",
        name: "爆破星芒護目面罩",
        desc: "【爆豪勝己專屬】高階爆閃尖角戰術護目罩，阻隔硝煙閃光並強化鎖定視界。",
        L: {
          front: (c) => `<g>
            <path d="M56 96 L28 76 L52 106 L34 128 L60 120 L76 125 L112 119 L120 112 L128 119 L164 125 L180 120 L206 128 L188 106 L212 76 L184 96 L152 89 L120 96 L88 89 Z" fill="#0f172a" stroke="#fb923c" stroke-width="3" stroke-linejoin="round" filter="${c.sglow}"/>
            <rect x="78" y="102" width="32" height="18" rx="7" fill="#ef4444" fill-opacity=".68" stroke="#facc15" stroke-width="2"/>
            <rect x="130" y="102" width="32" height="18" rx="7" fill="#ef4444" fill-opacity=".68" stroke="#facc15" stroke-width="2"/>
            <path d="M84 107 H100 M136 107 H152" stroke="#ffffff" stroke-width="2.3" stroke-linecap="round" opacity=".8"/>
          </g>`
        }
      },
      {
        id: "bakugo_grenade_bracers",
        exclusiveFor: "male_bakugo",
        characterName: "爆豪勝己",
        tier: "hard",
        price: 940,
        voucherType: "hard",
        vouchers: 4,
        slot: "weapon",
        style: "tech",
        thumbViewBox: "26 88 190 156",
        name: "雙手手榴彈型爆破護腕",
        desc: "【爆豪勝己專屬】招牌重型手榴彈護腕套組，拉開插銷就能釋放爆速推進！",
        L: {
          left: (c) => WEAPON_L(-12, `<g>
            <ellipse cx="0" cy="-6" rx="16" ry="20" fill="#15803d" stroke="${OL}" stroke-width="2.1"/>
            <path d="M-15 -6 H15 M-13 -14 H13 M-13 2 H13" stroke="#052e16" stroke-width="2.2"/>
            <rect x="-17" y="4" width="34" height="8" rx="3" fill="#f97316" stroke="${OL}" stroke-width="1.6"/>
            <circle cx="-12" cy="-19" r="4" fill="none" stroke="#eab308" stroke-width="2"/>
            ${sparkle(-16, -28, 4.5, "#facc15", 0.9)}
          </g>`),
          main: (c) => WEAPON(12, `<g>
            <ellipse cx="0" cy="-6" rx="16" ry="20" fill="#15803d" stroke="${OL}" stroke-width="2.1"/>
            <path d="M-15 -6 H15 M-13 -14 H13 M-13 2 H13" stroke="#052e16" stroke-width="2.2"/>
            <rect x="-17" y="4" width="34" height="8" rx="3" fill="#f97316" stroke="${OL}" stroke-width="1.6"/>
            <circle cx="12" cy="-19" r="4" fill="none" stroke="#eab308" stroke-width="2"/>
            ${sparkle(16, -28, 4.5, "#facc15", 0.9)}
          </g>`)
        }
      },
      {
        id: "bakugo_booster_sparks",
        exclusiveFor: "male_bakugo",
        characterName: "爆豪勝己",
        tier: "hard",
        price: 1200,
        voucherType: "hard",
        vouchers: 5,
        slot: "outer",
        style: "tech",
        thumbViewBox: "10 40 220 200",
        name: "背後交叉推進器與爆閃火花",
        desc: "【爆豪勝己專屬】高出力交叉爆破噴射器，伴隨橙黃十字閃電爆閃登場。",
        L: {
          back: (c) => `<g>
            <path d="M90 174 L38 118 L54 104 L106 160 Z" fill="#27272a" stroke="#f97316" stroke-width="2"/>
            <path d="M150 174 L202 118 L186 104 L134 160 Z" fill="#27272a" stroke="#f97316" stroke-width="2"/>
            <path d="M40 112 L16 86 L46 94 L38 66 L62 90 Z" fill="#fb923c" stroke="#fef08a" stroke-width="1.5" filter="${c.glow}"/>
            <path d="M200 112 L224 86 L194 94 L202 66 L178 90 Z" fill="#fb923c" stroke="#fef08a" stroke-width="1.5" filter="${c.glow}"/>
            ${sparkle(26, 134, 6, "#facc15")}${sparkle(214, 134, 6, "#facc15")}
          </g>`
        }
      },

      /* ================================================================
       * E. 日向翔陽（male_hinata）專屬神裝 × 4
       * ================================================================ */
      {
        id: "hinata_karasuno_jersey",
        exclusiveFor: "male_hinata",
        characterName: "日向翔陽",
        tier: "easy",
        price: 580,
        voucherType: "easy",
        vouchers: 3,
        slot: "top",
        style: "cute",
        name: "烏野黑橘 10 號排球戰袍",
        desc: "【日向翔陽專屬】飛吧！烏野高校王牌 10 號黑橘戰袍，球場上最閃亮的小巨人。",
        sleeve: { color: "#18181b", long: false, cuff: "#fb923c" },
        L: {
          main: () => `<path d="${TORSO}" fill="#18181b" stroke="${OL}" stroke-width="2.2" stroke-linejoin="round"/>
            <path d="M96 153 Q120 172 144 153" fill="none" stroke="#f97316" stroke-width="5.5" stroke-linecap="round"/>
            <path d="M92 155 L85 214 M148 155 L155 214" stroke="#f97316" stroke-width="4.2"/>
            <rect x="103" y="162" width="34" height="5" rx="2" fill="#f8fafc"/>
            <text x="120" y="198" text-anchor="middle" font-family="Noto Sans TC, sans-serif" font-size="20" font-weight="900" fill="#f97316" stroke="#fff7ed" stroke-width="0.6">10</text>`
        }
      },
      {
        id: "hinata_crow_headband",
        exclusiveFor: "male_hinata",
        characterName: "日向翔陽",
        tier: "easy",
        price: 380,
        voucherType: "easy",
        vouchers: 2,
        slot: "head",
        style: "cute",
        name: "烏鴉羽毛髮飾與運動髮帶",
        desc: "【日向翔陽專屬】印有飛羽的橘黑排球運動髮帶，躍動感直衝網頂！",
        L: {
          front: () => `<g>
            <path d="M58 84 Q120 65 182 84" fill="none" stroke="#18181b" stroke-width="8.5" stroke-linecap="round"/>
            <path d="M62 82 Q120 64 178 82" fill="none" stroke="#fb923c" stroke-width="3.2" stroke-linecap="round"/>
            <g transform="translate(168 62) rotate(22)">
              <path d="M0 0 Q14 -24 24 -22 Q20 -6 4 4 Z" fill="#1e293b" stroke="#fb923c" stroke-width="1.6"/>
              <path d="M2 1 Q10 -14 18 -14" fill="none" stroke="#94a3b8" stroke-width="1.3"/>
            </g>
          </g>`
        }
      },
      {
        id: "hinata_gold_volleyball",
        exclusiveFor: "male_hinata",
        characterName: "日向翔陽",
        tier: "hard",
        price: 850,
        voucherType: "hard",
        vouchers: 3,
        slot: "weapon",
        style: "cute",
        name: "飛躍扣殺金光排球",
        desc: "【日向翔陽專屬】高速旋轉的金藍排球伴隨金色氣流，一記快攻突破攔網！",
        L: {
          main: (c) => WEAPON(0, `<g>
            <circle cx="8" cy="-26" r="22" fill="#facc15" opacity=".32" filter="${c.glow}"/>
            <circle cx="8" cy="-26" r="16" fill="#fef08a" stroke="${OL}" stroke-width="2.1"/>
            <path d="M-7 -29 Q8 -39 23 -25 M-6 -20 Q8 -28 22 -18 M4 -41 Q14 -26 5 -11" fill="none" stroke="#2563eb" stroke-width="3" stroke-linecap="round"/>
            <path d="M-12 -10 Q-4 -4 8 -6" fill="none" stroke="#fb923c" stroke-width="2.6" stroke-linecap="round"/>
            ${sparkle(-12, -44, 4, "#fde047")}${sparkle(26, -42, 4, "#60a5fa")}
          </g>`)
        }
      },
      {
        id: "hinata_black_wings_cape",
        exclusiveFor: "male_hinata",
        characterName: "日向翔陽",
        tier: "hard",
        price: 1100,
        voucherType: "hard",
        vouchers: 4,
        slot: "outer",
        style: "cute",
        thumbViewBox: "10 40 220 200",
        name: "烏野黑色王者飛翼披風",
        desc: "【日向翔陽專屬】展開純黑烏鴉巨翼與「飛べ」橙金羽光，制霸整片天空！",
        L: {
          back: (c) => `<g>
            <path d="M98 164 Q44 102 18 124 Q34 152 24 176 Q54 178 46 204 Q82 204 102 188 Z" fill="#18181b" stroke="#f97316" stroke-width="2"/>
            <path d="M142 164 Q196 102 222 124 Q206 152 216 176 Q186 178 194 204 Q158 204 138 188 Z" fill="#18181b" stroke="#f97316" stroke-width="2"/>
            <path d="M40 144 L76 164 M38 172 L82 178 M200 144 L164 164 M202 172 L158 178" stroke="#3f3f46" stroke-width="2.2" stroke-linecap="round"/>
            ${sparkle(26, 110, 4.5, "#fb923c")}${sparkle(214, 110, 4.5, "#fb923c")}
          </g>`,
          front: () => `<path d="M90 156 Q120 172 150 156" fill="none" stroke="#f97316" stroke-width="3.2" stroke-linecap="round"/>`
        }
      },

      /* ================================================================
       * F. 安妮亞（female_anya）專屬神裝 × 4
       * ================================================================ */
      {
        id: "anya_eden_uniform",
        exclusiveFor: "female_anya",
        characterName: "安妮亞",
        tier: "medium",
        price: 600,
        voucherType: "medium",
        vouchers: 3,
        slot: "top",
        style: "cute",
        name: "伊甸學園黑金貴族制服",
        desc: "【安妮亞專屬】伊甸學園典雅黑金滾邊洋裝制服，胸前戴上耀眼星星胸針！",
        sleeve: { color: "#1e1b2e", long: true, cuff: "#facc15" },
        L: {
          main: () => `<path d="M90 154 Q120 148 150 154 L166 234 Q120 242 74 234 Z" fill="#1e1b2e" stroke="${OL}" stroke-width="2.2" stroke-linejoin="round"/>
            <path d="M98 156 L120 172 L142 156" fill="none" stroke="#facc15" stroke-width="2.6" stroke-linejoin="round"/>
            <path d="M120 172 L109 165 L109 178 Z M120 172 L131 165 L131 178 Z" fill="#dc2626" stroke="${OL}" stroke-width="1.4"/>
            <path d="M84 202 H156 M76 230 Q120 238 164 230" fill="none" stroke="#facc15" stroke-width="2.8"/>
            <path d="${starPath(136, 178, 6.2, 2.7)}" fill="#facc15" stroke="#a16207" stroke-width="1.2"/>`
        }
      },
      {
        id: "anya_telepath_horns",
        exclusiveFor: "female_anya",
        characterName: "安妮亞",
        tier: "easy",
        price: 400,
        voucherType: "easy",
        vouchers: 2,
        slot: "head",
        style: "cute",
        name: "雙角尖錐髮飾與讀心閃電",
        desc: "【安妮亞專屬】星光金環雙角頭飾發動讀心術，發出亮黃色感應電波！",
        L: {
          front: (c) => `<g>
            <g transform="translate(74 44) rotate(-25)">
              <path d="M-12 4 L0 -28 L12 4 Z" fill="#18181b" stroke="#facc15" stroke-width="2" filter="${c.sglow}"/>
              <ellipse cx="0" cy="4" rx="13" ry="4.5" fill="#fde047"/>
            </g>
            <g transform="translate(166 44) rotate(25)">
              <path d="M-12 4 L0 -28 L12 4 Z" fill="#18181b" stroke="#facc15" stroke-width="2" filter="${c.sglow}"/>
              <ellipse cx="0" cy="4" rx="13" ry="4.5" fill="#fde047"/>
            </g>
            <path d="M52 56 L42 48 L48 42 L36 34 M188 56 L198 48 L192 42 L204 34" fill="none" stroke="#fde047" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" filter="${c.glow}"/>
          </g>`
        }
      },
      {
        id: "anya_chimera_peanuts",
        exclusiveFor: "female_anya",
        characterName: "安妮亞",
        tier: "hard",
        price: 820,
        voucherType: "hard",
        vouchers: 3,
        slot: "weapon",
        style: "cute",
        thumbViewBox: "26 88 190 156",
        name: "奇美拉布偶與黃金花生袋",
        desc: "【安妮亞專屬】最喜歡的奇美拉長官玩偶 ＋ 香噴噴的黃金花生點心袋（哇庫哇庫）！",
        L: {
          left: () => WEAPON_L(-10, `<g>
            <circle cx="-2" cy="-14" r="14" fill="#fca5a5" stroke="${OL}" stroke-width="1.8"/>
            <path d="M-12 -24 L-16 -34 L-4 -27 M8 -24 L12 -34 L0 -27" fill="#fca5a5" stroke="${OL}" stroke-width="1.6"/>
            <circle cx="-7" cy="-16" r="2" fill="#18181b"/><circle cx="3" cy="-16" r="2" fill="#18181b"/>
            <ellipse cx="-2" cy="-10" rx="5" ry="3.2" fill="#fef2f2"/>
            <path d="M-6 0 L-8 10 H4 L2 0 Z" fill="#c084fc" stroke="${OL}" stroke-width="1.5"/>
          </g>`),
          main: (c) => WEAPON(12, `<g>
            <path d="M-13 -22 L13 -22 L16 8 Q0 14 -16 8 Z" fill="#fef3c7" stroke="${OL}" stroke-width="1.8" stroke-linejoin="round"/>
            <path d="M-9 -22 L-13 -32 L13 -32 L9 -22 Z" fill="#fde68a" stroke="${OL}" stroke-width="1.6"/>
            <path d="M-10 -22 H10" stroke="#ef4444" stroke-width="2.4"/>
            <ellipse cx="0" cy="-7" rx="7" ry="10" fill="#eab308" stroke="#854d0e" stroke-width="1.5" filter="${c.sglow}"/>
            <ellipse cx="0" cy="-7" rx="4.5" ry="2.2" fill="#ca8a04"/>
          </g>`)
        }
      },
      {
        id: "anya_stella_halo",
        exclusiveFor: "female_anya",
        characterName: "安妮亞",
        tier: "hard",
        price: 1080,
        voucherType: "hard",
        vouchers: 4,
        slot: "outer",
        style: "cute",
        thumbViewBox: "10 10 220 210",
        name: "星光優等生「星星」浮空光環",
        desc: "【安妮亞專屬】環繞身後的金色 Stella 榮譽星星陣列，朝帝國學者邁進！",
        L: {
          back: (c) => `<g>
            <circle cx="120" cy="118" r="82" fill="none" stroke="#fde047" stroke-width="2.2" stroke-dasharray="10 8" opacity=".82" filter="${c.sglow}"/>
            <path d="${starPath(48, 76, 12, 5.2)}" fill="#facc15" stroke="#a16207" stroke-width="1.6" filter="${c.sglow}"/>
            <path d="${starPath(192, 76, 12, 5.2)}" fill="#facc15" stroke="#a16207" stroke-width="1.6" filter="${c.sglow}"/>
            <path d="${starPath(38, 152, 10, 4.4)}" fill="#fef08a" stroke="#ca8a04" stroke-width="1.4"/>
            <path d="${starPath(202, 152, 10, 4.4)}" fill="#fef08a" stroke="#ca8a04" stroke-width="1.4"/>
            <path d="${starPath(120, 30, 13, 5.8)}" fill="#facc15" stroke="#a16207" stroke-width="1.6" filter="${c.glow}"/>
          </g>`
        }
      },

      /* ================================================================
       * G. 禰豆子（female_nezuko）專屬神裝 × 4
       * ================================================================ */
      {
        id: "nezuko_asanoha_kimono",
        exclusiveFor: "female_nezuko",
        characterName: "禰豆子",
        tier: "medium",
        price: 620,
        voucherType: "medium",
        vouchers: 3,
        slot: "top",
        style: "cute",
        name: "麻葉紋粉紅和服與深棕羽織",
        desc: "【禰豆子專屬】經典粉紅幾何麻葉紋和服、紅白格子腰帶與溫暖深棕羽織。",
        sleeve: { color: "#451a03", long: true, cuff: "#f9a8d4" },
        L: {
          main: (c) => `<defs><pattern id="${c.u}-asanoha" width="14" height="14" patternUnits="userSpaceOnUse">
              <rect width="14" height="14" fill="#fbcfe8"/>
              <path d="M0 7 L7 0 L14 7 L7 14 Z M7 0 V14 M0 7 H14" stroke="#f472b6" stroke-width="1" fill="none"/>
            </pattern></defs>
            <path d="M88 154 Q120 148 152 154 L162 234 Q120 242 78 234 Z" fill="url(#${c.u}-asanoha)" stroke="${OL}" stroke-width="2.2"/>
            <path d="M88 154 L106 155 L103 234 L77 233 Z" fill="#451a03" stroke="${OL}" stroke-width="2"/>
            <path d="M152 154 L134 155 L137 234 L163 233 Z" fill="#451a03" stroke="${OL}" stroke-width="2"/>
            <rect x="92" y="192" width="56" height="14" rx="2" fill="#dc2626" stroke="${OL}" stroke-width="1.6"/>
            <rect x="104" y="192" width="12" height="7" fill="#ffffff"/><rect x="128" y="199" width="12" height="7" fill="#ffffff"/>
            <path d="M106 155 L120 176 L134 155" fill="none" stroke="#ffffff" stroke-width="3.2"/>`
        }
      },
      {
        id: "nezuko_ribbon_bamboo",
        exclusiveFor: "female_nezuko",
        characterName: "禰豆子",
        tier: "easy",
        price: 420,
        voucherType: "easy",
        vouchers: 2,
        slot: "head",
        style: "cute",
        name: "粉紅緞帶髮飾與經典竹筒",
        desc: "【禰豆子專屬】綴有粉櫻金墜的立體緞帶蝴蝶結與翡翠靈氣竹筒光澤。",
        L: {
          front: (c) => `<g>
            <g transform="translate(76 47) rotate(-22)">
              <path d="M-2 0 L-20 -12 L-17 10 Z" fill="#f472b6" stroke="#fde047" stroke-width="1.8" filter="${c.sglow}"/>
              <path d="M2 0 L20 -12 L17 10 Z" fill="#f472b6" stroke="#fde047" stroke-width="1.8" filter="${c.sglow}"/>
              <circle cx="0" cy="0" r="5" fill="#ec4899" stroke="#fef08a" stroke-width="1.5"/>
            </g>
            <rect x="95" y="126" width="50" height="15" rx="6.5" fill="#22c55e" stroke="#bbf7d0" stroke-width="2" filter="${c.sglow}"/>
            <path d="M120 126 V141" stroke="#15803d" stroke-width="2.6"/>
            ${sparkle(60, 42, 4, "#fbcfe8")}
          </g>`
        }
      },
      {
        id: "nezuko_blood_lantern",
        exclusiveFor: "female_nezuko",
        characterName: "禰豆子",
        tier: "hard",
        price: 880,
        voucherType: "hard",
        vouchers: 4,
        slot: "weapon",
        style: "cute",
        name: "爆血粉紅星火手燈",
        desc: "【禰豆子專屬】燃燒著桃紅爆血焰火的神社手燈，能淨化暗夜中的迷惘。",
        L: {
          main: (c) => WEAPON(10, `<g>
            <path d="M0 -84 V-104" stroke="#451a03" stroke-width="3"/>
            <ellipse cx="0" cy="-64" rx="18" ry="22" fill="#f472b6" fill-opacity=".86" stroke="#831843" stroke-width="2" filter="${c.glow}"/>
            <rect x="-13" y="-86" width="26" height="5" rx="2" fill="#18181b"/>
            <rect x="-13" y="-45" width="26" height="5" rx="2" fill="#18181b"/>
            <circle cx="0" cy="-64" r="7" fill="#fdf2f8" opacity=".85"/>
            <path d="M-2 -26 Q-12 -52 -4 -76 M6 -24 Q14 -50 6 -72" fill="none" stroke="#fb7185" stroke-width="2.6" stroke-linecap="round" filter="${c.sglow}"/>
            ${sparkle(-16, -92, 5, "#f9a8d4")}${sparkle(18, -88, 4.5, "#fef08a")}
          </g>`)
        }
      },
      {
        id: "nezuko_mini_box_sakura",
        exclusiveFor: "female_nezuko",
        characterName: "禰豆子",
        tier: "hard",
        price: 1150,
        voucherType: "hard",
        vouchers: 5,
        slot: "outer",
        style: "cute",
        thumbViewBox: "10 20 220 220",
        name: "縮小版和風背箱與櫻吹雪陣",
        desc: "【禰豆子專屬】可愛迷你木箱護身，身後舞動滿天粉嫩櫻花瓣旋風。",
        L: {
          back: (c) => `<g>
            <circle cx="120" cy="128" r="82" fill="none" stroke="#f9a8d4" stroke-width="2.2" stroke-dasharray="8 6" opacity=".82" filter="${c.sglow}"/>
            <rect x="86" y="152" width="68" height="66" rx="5" fill="#92400e" stroke="${OL}" stroke-width="2.2"/>
            <rect x="92" y="158" width="56" height="54" rx="3" fill="#b45309"/>
            <rect x="86" y="170" width="68" height="6" fill="#18181b"/><rect x="86" y="198" width="68" height="6" fill="#18181b"/>
            <g fill="#f9a8d4" filter="${c.sglow}">
              <ellipse cx="44" cy="94" rx="7" ry="4" transform="rotate(-25 44 94)"/>
              <ellipse cx="196" cy="96" rx="7" ry="4" transform="rotate(25 196 96)"/>
              <ellipse cx="52" cy="170" rx="6" ry="3.5" transform="rotate(35 52 170)"/>
              <ellipse cx="188" cy="170" rx="6" ry="3.5" transform="rotate(-35 188 170)"/>
              <ellipse cx="120" cy="36" rx="7" ry="4"/>
            </g>
            ${sparkle(36, 130, 4.5, "#fbcfe8")}${sparkle(204, 130, 4.5, "#fbcfe8")}
          </g>`
        }
      },

      /* ================================================================
       * H. 初音未來（female_miku）專屬神裝 × 4
       * ================================================================ */
      {
        id: "miku_diva_outfit",
        exclusiveFor: "female_miku",
        characterName: "初音未來",
        tier: "medium",
        price: 680,
        voucherType: "medium",
        vouchers: 3,
        slot: "top",
        style: "tech",
        name: "銀灰未來感無袖歌姬套裝",
        desc: "【初音未來專屬】銀灰未來無袖歌姬服配湖水藍長領帶，全場舞台的絕對主角！",
        sleeve: { color: "#1e293b", long: true, cuff: "#2dd4bf" },
        L: {
          main: (c) => `<defs>${lg(`${c.u}-mkT`, [[0, "#f1f5f9"], [1, "#94a3b8"]])}</defs>
            <path d="${TORSO}" fill="url(#${c.u}-mkT)" stroke="${OL}" stroke-width="2.2" stroke-linejoin="round"/>
            <path d="M98 154 L120 172 L142 154" fill="none" stroke="#2dd4bf" stroke-width="3.2"/>
            <path d="M116 164 L124 164 L127 205 L120 214 L113 205 Z" fill="#14b8a6" stroke="#0f766e" stroke-width="1.5"/>
            <rect x="85" y="206" width="70" height="10" rx="2" fill="#1e293b" stroke="${OL}" stroke-width="1.5"/>
            <path d="M88 211 H152" stroke="#2dd4bf" stroke-width="2.4" stroke-dasharray="6 4" filter="${c.sglow}"/>
            <text x="103" y="182" font-family="Consolas, monospace" font-size="8" font-weight="900" fill="#ec4899">01</text>`
        }
      },
      {
        id: "miku_holo_headset_clips",
        exclusiveFor: "female_miku",
        characterName: "初音未來",
        tier: "easy",
        price: 450,
        voucherType: "easy",
        vouchers: 2,
        slot: "head",
        style: "tech",
        name: "黑紅方塊髮飾與全息耳麥",
        desc: "【初音未來專屬】升級版霓虹粉框雙馬尾方塊髮飾 ＋ 透明藍綠全息歌姬耳麥。",
        L: {
          front: (c) => `<g>
            <g transform="translate(55 64) rotate(-18)">
              <rect x="-11" y="-11" width="22" height="22" rx="3" fill="#09090b" stroke="#f43f5e" stroke-width="2.8" filter="${c.sglow}"/>
              <rect x="-5" y="-5" width="10" height="10" rx="1.5" fill="none" stroke="#2dd4bf" stroke-width="1.8"/>
            </g>
            <g transform="translate(185 64) rotate(18)">
              <rect x="-11" y="-11" width="22" height="22" rx="3" fill="#09090b" stroke="#f43f5e" stroke-width="2.8" filter="${c.sglow}"/>
              <rect x="-5" y="-5" width="10" height="10" rx="1.5" fill="none" stroke="#2dd4bf" stroke-width="1.8"/>
            </g>
            <rect x="44" y="95" width="16" height="28" rx="6" fill="#0f172a" stroke="#2dd4bf" stroke-width="2.2" filter="${c.sglow}"/>
            <rect x="180" y="95" width="16" height="28" rx="6" fill="#0f172a" stroke="#2dd4bf" stroke-width="2.2" filter="${c.sglow}"/>
            <path d="M51 122 Q60 137 86 135" fill="none" stroke="#38bdf8" stroke-width="2.6" stroke-linecap="round"/>
            <circle cx="88" cy="135" r="3.4" fill="#f43f5e" filter="${c.glow}"/>
          </g>`
        }
      },
      {
        id: "miku_dual_leek_sabers",
        exclusiveFor: "female_miku",
        characterName: "初音未來",
        tier: "hard",
        price: 960,
        voucherType: "hard",
        vouchers: 4,
        slot: "weapon",
        style: "tech",
        thumbViewBox: "20 60 202 175",
        name: "雙蔥雷射光劍",
        desc: "【初音未來專屬】左一手、右一手！青蔥造型全息光刃在舞台劃出雙色音軌。",
        L: {
          left: (c) => WEAPON_L(-24, `<g>
            <rect x="-4" y="-82" width="8" height="72" rx="4" fill="#4ade80" opacity=".42" filter="${c.glow}"/>
            <rect x="-2.5" y="-78" width="5" height="62" rx="2.5" fill="#bbf7d0"/>
            <path d="M-2.5 -78 L-9 -98 L-1 -84 M2.5 -78 L9 -96 L1 -84" fill="#22c55e" stroke="#15803d" stroke-width="1.2"/>
            <rect x="-4" y="-14" width="8" height="24" rx="3" fill="#f8fafc" stroke="#15803d" stroke-width="1.4"/>
          </g>`),
          main: (c) => WEAPON(24, `<g>
            <rect x="-4" y="-82" width="8" height="72" rx="4" fill="#2dd4bf" opacity=".45" filter="${c.glow}"/>
            <rect x="-2.5" y="-78" width="5" height="62" rx="2.5" fill="#ccfbf1"/>
            <path d="M-2.5 -78 L-9 -98 L-1 -84 M2.5 -78 L9 -96 L1 -84" fill="#22c55e" stroke="#0f766e" stroke-width="1.2"/>
            <rect x="-4" y="-14" width="8" height="24" rx="3" fill="#f8fafc" stroke="#0f766e" stroke-width="1.4"/>
          </g>`)
        }
      },
      {
        id: "miku_soundwave_wings",
        exclusiveFor: "female_miku",
        characterName: "初音未來",
        tier: "hard",
        price: 1250,
        voucherType: "hard",
        vouchers: 5,
        slot: "outer",
        style: "tech",
        thumbViewBox: "10 24 220 212",
        name: "浮空音符與聲波全息雙翼",
        desc: "【初音未來專屬】全息幾何雙翼加上舞動音波條與音符，奏響未來交響曲。",
        L: {
          back: (c) => `<g>
            <path d="M96 156 L22 98 L34 150 L18 168 L58 188 L98 182 Z" fill="#2dd4bf" fill-opacity=".38" stroke="#2dd4bf" stroke-width="2.2" filter="${c.sglow}"/>
            <path d="M144 156 L218 98 L206 150 L222 168 L182 188 L142 182 Z" fill="#2dd4bf" fill-opacity=".38" stroke="#ec4899" stroke-width="2.2" filter="${c.sglow}"/>
            <path d="M36 122 L84 158 M34 148 L86 168 M204 122 L156 158 M206 148 L154 168" stroke="#ccfbf1" stroke-width="1.8" opacity=".8"/>
            <g class="av-notes">${note(46, 72, "#2dd4bf", -12)}${note(194, 72, "#ec4899", 12)}${note(120, 26, "#38bdf8", 4)}</g>
          </g>`
        }
      },

      /* ================================================================
       * I. 20 款全角色共同裝備 — 入門質感系（300~480 ⭐ ＋ 2~3 初階券）
       * ================================================================ */
      {
        id: "pixel_sunglasses",
        tier: "easy",
        price: 300,
        voucherType: "easy",
        vouchers: 2,
        slot: "face",
        style: "tech",
        name: "像素墨鏡",
        desc: "Deal with it! 經典 8-bit 階梯黑色墨鏡，白格高光帥氣度滿分。",
        L: {
          front: () => `<g shape-rendering="crispEdges">
            <rect x="64" y="106" width="112" height="7" fill="#111827"/>
            <rect x="76" y="104" width="38" height="20" fill="#111827"/>
            <rect x="126" y="104" width="38" height="20" fill="#111827"/>
            <rect x="82" y="124" width="26" height="5" fill="#111827"/>
            <rect x="132" y="124" width="26" height="5" fill="#111827"/>
            <rect x="81" y="108" width="6" height="4" fill="#ffffff"/>
            <rect x="87" y="112" width="6" height="4" fill="#ffffff"/>
            <rect x="131" y="108" width="6" height="4" fill="#ffffff"/>
            <rect x="137" y="112" width="6" height="4" fill="#ffffff"/>
          </g>`
        }
      },
      {
        id: "scholar_mortarboard",
        tier: "easy",
        price: 360,
        voucherType: "easy",
        vouchers: 2,
        slot: "head",
        style: "cute",
        name: "學霸博士帽",
        desc: "資訊小博士的榮譽方帽，金色流蘇隨步伐輕輕擺動。",
        L: {
          front: () => `<g>
            <path d="M84 44 H156 L152 60 Q120 68 88 60 Z" fill="#1e293b" stroke="${OL}" stroke-width="2"/>
            <path d="M120 20 L182 40 L120 56 L58 40 Z" fill="#0f172a" stroke="${OL}" stroke-width="2.1" stroke-linejoin="round"/>
            <circle cx="120" cy="39" r="3.6" fill="#facc15" stroke="#854d0e" stroke-width="1.3"/>
            <path d="M120 39 L164 46 L166 76" fill="none" stroke="#eab308" stroke-width="2.8" stroke-linecap="round"/>
            <path d="M162 74 L170 74 L168 86 L160 86 Z" fill="#facc15" stroke="#854d0e" stroke-width="1.2"/>
          </g>`
        }
      },
      {
        id: "cat_holo_headphones",
        tier: "easy",
        price: 420,
        voucherType: "easy",
        vouchers: 2,
        slot: "head",
        style: "tech",
        name: "貓耳全息耳機",
        desc: "透亮青紫霓虹透明貓耳耳機，一邊聽音樂一邊寫程式。",
        L: {
          front: (c) => `<g>
            <path d="M62 106 Q62 36 120 35 Q178 36 178 106" fill="none" stroke="#e2e8f0" stroke-width="8" stroke-linecap="round"/>
            <path d="M78 60 L82 26 L108 46 Z" fill="#22d3ee" fill-opacity=".68" stroke="#0891b2" stroke-width="2" filter="${c.sglow}"/>
            <path d="M162 60 L158 26 L132 46 Z" fill="#a855f7" fill-opacity=".68" stroke="#7e22ce" stroke-width="2" filter="${c.sglow}"/>
            <rect x="48" y="96" width="22" height="32" rx="9" fill="#0f172a" stroke="#22d3ee" stroke-width="2.2" filter="${c.sglow}"/>
            <rect x="170" y="96" width="22" height="32" rx="9" fill="#0f172a" stroke="#a855f7" stroke-width="2.2" filter="${c.sglow}"/>
          </g>`
        }
      },
      {
        id: "info_hacker_hoodie",
        tier: "easy",
        price: 480,
        voucherType: "easy",
        vouchers: 3,
        slot: "top",
        style: "tech",
        name: "資訊駭客連帽衫",
        desc: "深灰科技連帽衫，胸口印有 { CODE } 發光代碼徽記與安全線。",
        sleeve: { color: "#1e293b", long: true, cuff: "#22c55e" },
        L: {
          main: (c) => `<path d="${TORSO}" fill="#1e293b" stroke="${OL}" stroke-width="2.2" stroke-linejoin="round"/>
            <path d="M96 153 Q120 167 144 153" fill="none" stroke="#334155" stroke-width="5"/>
            <rect x="97" y="168" width="46" height="20" rx="5" fill="#0f172a" stroke="#22c55e" stroke-width="1.6" filter="${c.sglow}"/>
            <text x="120" y="181.5" text-anchor="middle" font-family="Consolas, monospace" font-size="8.5" font-weight="900" fill="#4ade80">{CODE}</text>
            <path d="M98 197 H142 L146 213 Q120 218 94 213 Z" fill="#0f172a" stroke="#334155" stroke-width="1.5"/>`
        }
      },
      {
        id: "detective_magnifier",
        tier: "easy",
        price: 350,
        voucherType: "easy",
        vouchers: 2,
        slot: "weapon",
        style: "cute",
        name: "偵探放大鏡",
        desc: "資安小偵探必備黃銅放大鏡，任何微小的系統 bug 都逃不過法眼！",
        L: {
          main: (c) => WEAPON(22, `<g>
            <rect x="-4" y="-34" width="8" height="44" rx="3" fill="#78350f" stroke="${OL}" stroke-width="1.6"/>
            <rect x="-5" y="-36" width="10" height="7" rx="2" fill="#eab308" stroke="${OL}" stroke-width="1.3"/>
            <circle cx="0" cy="-64" r="28" fill="#bae6fd" fill-opacity=".55" stroke="#eab308" stroke-width="5" filter="${c.sglow}"/>
            <circle cx="0" cy="-64" r="22" fill="none" stroke="#854d0e" stroke-width="1.5"/>
            <path d="M-12 -74 Q-4 -82 8 -77" fill="none" stroke="#ffffff" stroke-width="3.2" stroke-linecap="round"/>
          </g>`)
        }
      },

      /* ================================================================
       * J. 20 款全角色共同裝備 — 進階學院科技系（550~850 ⭐ ＋ 3~4 進階券）
       * ================================================================ */
      {
        id: "star_navigator_spacesuit",
        tier: "medium",
        price: 680,
        voucherType: "medium",
        vouchers: 3,
        slot: "top",
        style: "tech",
        name: "星際領航員宇航服",
        desc: "銀白與海軍藍拼色星艦宇航服，配有星圖顯示器與動力推進背包扣環。",
        sleeve: { color: "#e2e8f0", long: true, cuff: "#0284c7" },
        L: {
          main: (c) => `<path d="${TORSO}" fill="#e2e8f0" stroke="${OL}" stroke-width="2.2" stroke-linejoin="round"/>
            <path d="M91 154 L149 154 L152 174 L88 174 Z" fill="#1e3a8a" stroke="${OL}" stroke-width="1.8"/>
            <rect x="102" y="176" width="36" height="22" rx="4" fill="#0f172a" stroke="#38bdf8" stroke-width="1.8" filter="${c.sglow}"/>
            <path d="M107 187 L114 182 L122 190 L133 181" fill="none" stroke="#38bdf8" stroke-width="2" stroke-linecap="round"/>
            <rect x="85" y="204" width="70" height="8" rx="3" fill="#0284c7" stroke="${OL}" stroke-width="1.5"/>
            <circle cx="120" cy="164" r="5" fill="#facc15"/>`
        }
      },
      {
        id: "academy_hanfu",
        tier: "medium",
        price: 650,
        voucherType: "medium",
        vouchers: 3,
        slot: "top",
        style: "cute",
        name: "古風書院漢服",
        desc: "雅緻雲紋青白交領漢服與垂墜玉佩腰帶，如詩畫般溫潤儒雅。",
        sleeve: { color: "#dbeafe", long: true, cuff: "#2563eb" },
        L: {
          main: (c) => `<defs>${lg(`${c.u}-hf`, [[0, "#f8fafc"], [1, "#bfdbfe"]])}</defs>
            <path d="M89 154 Q120 148 151 154 L166 238 Q120 246 74 238 Z" fill="url(#${c.u}-hf)" stroke="${OL}" stroke-width="2.2"/>
            <path d="M98 155 L126 184 M142 155 L114 184" stroke="#1d4ed8" stroke-width="5.2" stroke-linecap="round"/>
            <path d="M98 155 L126 184 M142 155 L114 184" stroke="#f8fafc" stroke-width="2" stroke-linecap="round"/>
            <rect x="86" y="190" width="68" height="10" rx="3" fill="#1e40af" stroke="${OL}" stroke-width="1.5"/>
            <circle cx="120" cy="206" r="6" fill="#2dd4bf" stroke="#facc15" stroke-width="1.8"/>
            <path d="M120 212 V226" stroke="#ef4444" stroke-width="2.4" stroke-linecap="round"/>`
        }
      },
      {
        id: "cyber_neon_jacket",
        tier: "medium",
        price: 720,
        voucherType: "medium",
        vouchers: 3,
        slot: "top",
        style: "tech",
        name: "賽博霓虹夾克",
        desc: "炫光紫粉高立領機能夾克，夜色中閃耀極光霓虹管線！",
        sleeve: { color: "#1e1b4b", long: true, cuff: "#f43f5e" },
        L: {
          main: (c) => `<path d="${TORSO}" fill="#1e1b4b" stroke="${OL}" stroke-width="2.2" stroke-linejoin="round"/>
            <path d="M94 156 L102 141 L138 141 L146 156 L120 174 Z" fill="#312e81" stroke="#22d3ee" stroke-width="2" filter="${c.sglow}"/>
            <path d="M95 162 L92 212 M145 162 L148 212" stroke="#f43f5e" stroke-width="3.6" stroke-linecap="round" filter="${c.sglow}"/>
            <path d="M107 184 H133" stroke="#22d3ee" stroke-width="3" stroke-linecap="round" filter="${c.sglow}"/>`
        }
      },
      {
        id: "mecha_kb_lightsaber",
        tier: "medium",
        price: 780,
        voucherType: "medium",
        vouchers: 4,
        slot: "weapon",
        style: "tech",
        name: "機械鍵盤光劍",
        desc: "高階青軸鍵帽能源劍刃＋極光能量束，打字如流、輸出爆表！",
        L: {
          main: (c) => {
            const cols = ["#22d3ee", "#a855f7", "#f43f5e", "#facc15", "#4ade80", "#38bdf8"];
            let keys = "";
            for (let i = 0; i < 6; i++) {
              keys += `<rect x="-8" y="${-114 + i * 16}" width="16" height="11" rx="2.2" fill="${cols[i]}" stroke="#0f172a" stroke-width="1.2"/>`;
            }
            return WEAPON(24, `<rect x="-12" y="-124" width="24" height="112" rx="6" fill="#38bdf8" opacity=".32" filter="${c.glow}"/>
              <rect x="-10" y="-122" width="20" height="106" rx="3" fill="#0f172a" stroke="#22d3ee" stroke-width="2"/>
              ${keys}
              <rect x="-16" y="-16" width="32" height="8" rx="3" fill="#e2e8f0" stroke="#0f172a" stroke-width="1.6"/>
              <rect x="-4.5" y="-8" width="9" height="26" rx="3" fill="#334155"/>`);
          }
        }
      },
      {
        id: "python_serpent_staff",
        tier: "medium",
        price: 820,
        voucherType: "medium",
        vouchers: 4,
        slot: "weapon",
        style: "tech",
        name: "Python 巨蟒法杖",
        desc: "盤繞雙色巨蟒雕飾的水晶秘杖，為演算法施展最強加速咒語。",
        L: {
          main: (c) => WEAPON(18, `<rect x="-3.8" y="-108" width="7.6" height="132" rx="3.8" fill="#1e293b" stroke="${OL}" stroke-width="1.5"/>
            <path d="M-8 -94 C-18 -76 16 -62 -8 -44 C-16 -36 10 -24 0 -16" fill="none" stroke="#3b82f6" stroke-width="4.5" stroke-linecap="round"/>
            <path d="M8 -94 C18 -76 -16 -62 8 -44 C16 -36 -10 -24 0 -16" fill="none" stroke="#facc15" stroke-width="4.5" stroke-linecap="round"/>
            <circle cx="0" cy="-120" r="18" fill="#38bdf8" opacity=".4" filter="${c.glow}"/>
            <circle cx="0" cy="-120" r="12" fill="#2563eb" stroke="#facc15" stroke-width="2.4"/>
            ${sparkle(-16, -134, 4.5, "#facc15")}${sparkle(16, -134, 4.5, "#38bdf8")}`)
        }
      },
      {
        id: "golden_trophy",
        tier: "medium",
        price: 750,
        voucherType: "medium",
        vouchers: 3,
        slot: "weapon",
        style: "cute",
        name: "黃金獎盃",
        desc: "屬於頂尖創客與資訊王牌的純金冠軍獎盃，自帶閃亮金星特效！",
        L: {
          main: (c) => WEAPON(12, `<defs>${lg(`${c.u}-tr`, [[0, "#fef08a"], [0.5, "#facc15"], [1, "#ca8a04"]])}</defs>
            <path d="M-20 -78 H20 L14 -40 Q0 -26 -14 -40 Z" fill="url(#${c.u}-tr)" stroke="#854d0e" stroke-width="2" stroke-linejoin="round" filter="${c.sglow}"/>
            <path d="M-20 -72 Q-32 -70 -28 -54 Q-24 -44 -14 -46 M20 -72 Q32 -70 28 -54 Q24 -44 14 -46" fill="none" stroke="#eab308" stroke-width="3.6" stroke-linecap="round"/>
            <rect x="-4" y="-32" width="8" height="18" fill="#eab308" stroke="#854d0e" stroke-width="1.5"/>
            <rect x="-14" y="-14" width="28" height="10" rx="2.5" fill="#78350f" stroke="${OL}" stroke-width="1.6"/>
            <path d="${starPath(0, -58, 7, 3)}" fill="#ffffff" opacity=".88"/>
            ${sparkle(-22, -88, 4.5, "#fef08a")}${sparkle(22, -88, 4.5, "#ffffff")}`)
        }
      },
      {
        id: "holo_data_tablet",
        tier: "medium",
        price: 550,
        voucherType: "medium",
        vouchers: 3,
        slot: "weapon",
        style: "tech",
        name: "全息數據平板",
        desc: "展開懸浮 3D 圖表與程式碼串流的科技平板，分析力 MAX。",
        L: {
          main: (c) => WEAPON(8, `<g>
            <rect x="-20" y="-34" width="40" height="30" rx="4" fill="#0f172a" stroke="#38bdf8" stroke-width="2.2"/>
            <rect x="-16" y="-30" width="32" height="22" rx="2" fill="#082f49"/>
            <path d="M-12 -18 L-4 -24 L4 -15 L12 -25" fill="none" stroke="#22d3ee" stroke-width="2.2" stroke-linecap="round" filter="${c.sglow}"/>
            <path d="M-16 -36 L-24 -64 H24 L16 -36 Z" fill="#38bdf8" fill-opacity=".22" stroke="#7dd3fc" stroke-width="1.3" filter="${c.sglow}"/>
            <rect x="-14" y="-58" width="12" height="14" rx="2" fill="#22d3ee" fill-opacity=".55"/>
            <path d="M3 -55 H16 M3 -49 H13" stroke="#bae6fd" stroke-width="2" stroke-linecap="round"/>
          </g>`)
        }
      },

      /* ================================================================
       * K. 20 款全角色共同裝備 — 傳說終局神裝（1000~1500 ⭐ ＋ 5~8 大師券）
       * ================================================================ */
      {
        id: "royal_gold_crown",
        tier: "hard",
        price: 1050,
        voucherType: "hard",
        vouchers: 5,
        slot: "head",
        style: "cute",
        name: "皇家黃金小皇冠",
        desc: "【傳說神裝】鑲滿紅寶石與鑽石的天鵝絨黃金王冠，王者的最高象徵。",
        L: {
          front: (c) => `<defs>${lg(`${c.u}-rgc`, [[0, "#fef9c3"], [0.5, "#facc15"], [1, "#b45309"]])}</defs>
            <g transform="translate(120 47)">
              <ellipse cx="0" cy="-2" rx="28" ry="12" fill="#dc2626" stroke="#854d0e" stroke-width="1.8"/>
              <path d="M-32 4 L-36 -18 L-18 -6 L0 -26 L18 -6 L36 -18 L32 4 Z" fill="url(#${c.u}-rgc)" stroke="#854d0e" stroke-width="2.1" stroke-linejoin="round" filter="${c.sglow}"/>
              <rect x="-33" y="2" width="66" height="8" rx="3" fill="#eab308" stroke="#854d0e" stroke-width="1.6"/>
              <circle cx="0" cy="-28" r="4.5" fill="#38bdf8" stroke="#fff" stroke-width="1.3"/>
              <circle cx="-36" cy="-20" r="3.6" fill="#f43f5e" stroke="#fff" stroke-width="1"/>
              <circle cx="36" cy="-20" r="3.6" fill="#f43f5e" stroke="#fff" stroke-width="1"/>
              <circle cx="0" cy="6" r="3" fill="#ef4444"/><circle cx="-18" cy="6" r="2.5" fill="#38bdf8"/><circle cx="18" cy="6" r="2.5" fill="#38bdf8"/>
            </g>
            ${sparkle(82, 26, 5, "#fef08a")}${sparkle(158, 26, 5, "#ffffff")}`
        }
      },
      {
        id: "esports_commander_headset",
        tier: "hard",
        price: 1000,
        voucherType: "hard",
        vouchers: 5,
        slot: "head",
        style: "tech",
        name: "電競指揮官耳罩",
        desc: "【傳說神裝】金黑指揮官戰術耳麥 ＋ 右眼全息雷達投影視鏡。",
        L: {
          front: (c) => `<g>
            <path d="M62 106 Q62 36 120 35 Q178 36 178 106" fill="none" stroke="#0f172a" stroke-width="10" stroke-linecap="round"/>
            <path d="M66 96 Q68 41 120 40 Q172 41 174 96" fill="none" stroke="#facc15" stroke-width="2.6" stroke-linecap="round"/>
            <rect x="46" y="94" width="24" height="36" rx="10" fill="#1e293b" stroke="#facc15" stroke-width="2.4" filter="${c.sglow}"/>
            <rect x="170" y="94" width="24" height="36" rx="10" fill="#1e293b" stroke="#facc15" stroke-width="2.4" filter="${c.sglow}"/>
            <path d="M168 124 Q162 146 130 144" fill="none" stroke="#64748b" stroke-width="3" stroke-linecap="round"/>
            <circle cx="128" cy="144" r="3.8" fill="#22d3ee" filter="${c.glow}"/>
            <path d="M169 98 L142 94 L132 114 L166 116 Z" fill="#22d3ee" fill-opacity=".28" stroke="#38bdf8" stroke-width="1.6" filter="${c.sglow}"/>
          </g>`
        }
      },
      {
        id: "pixel_angel_wings",
        tier: "hard",
        price: 1250,
        voucherType: "hard",
        vouchers: 6,
        slot: "outer",
        style: "cute",
        thumbViewBox: "10 30 220 205",
        name: "像素天使光翼",
        desc: "【傳說神裝】8-bit 聖潔光耀天使雙翼，在背後綻放像素黃金神光。",
        L: {
          back: (c) => `<g filter="${c.glow}" shape-rendering="crispEdges">
            ${pixelArt([
              "WWWW................WWWW",
              "WGGWW..............WWGGW",
              "WWGGWW............WWGGWW",
              ".WWGGWW..........WWGGWW.",
              "..WWWWWW........WWWWWW..",
              "...WWWWWW......WWWWWW...",
              "....WWWWW......WWWWW....",
              ".....WWWW......WWWW....."
            ], 8.2, 22, 108, { W: "#ffffff", G: "#fde047" })}
          </g>`
        }
      },
      {
        id: "cyber_mech_jetpack",
        tier: "hard",
        price: 1320,
        voucherType: "hard",
        vouchers: 6,
        slot: "outer",
        style: "tech",
        thumbViewBox: "10 40 220 215",
        name: "賽博機械噴射背包",
        desc: "【傳說神裝】雙渦輪離子推進器，背後噴出熾青電漿尾焰高速飛行！",
        L: {
          back: (c) => `<g>
            <rect x="64" y="138" width="26" height="68" rx="8" fill="#334155" stroke="#38bdf8" stroke-width="2.2"/>
            <rect x="150" y="138" width="26" height="68" rx="8" fill="#334155" stroke="#38bdf8" stroke-width="2.2"/>
            <rect x="86" y="152" width="68" height="44" rx="6" fill="#0f172a" stroke="#64748b" stroke-width="2"/>
            <path d="M68 206 L77 248 L86 206 Z M154 206 L163 248 L172 206 Z" fill="#22d3ee" filter="${c.glow}"/>
            <path d="M72 206 L77 234 L82 206 Z M158 206 L163 234 L168 206 Z" fill="#ffffff"/>
            <circle cx="77" cy="154" r="5" fill="#22d3ee" filter="${c.sglow}"/><circle cx="163" cy="154" r="5" fill="#22d3ee" filter="${c.sglow}"/>
          </g>`
        }
      },
      {
        id: "magic_grimoire_ring",
        tier: "hard",
        price: 1380,
        voucherType: "hard",
        vouchers: 7,
        slot: "outer",
        style: "cute",
        thumbViewBox: "10 14 220 220",
        name: "漂浮魔法陣書環",
        desc: "【傳說神裝】六芒幾何秘法大陣與環繞身後的魔導浮游書頁。",
        L: {
          back: (c) => `<g>
            <circle cx="120" cy="126" r="88" fill="#31105c" fill-opacity=".22" stroke="#c084fc" stroke-width="2.6" filter="${c.sglow}"/>
            <circle cx="120" cy="126" r="74" fill="none" stroke="#facc15" stroke-width="1.8" stroke-dasharray="6 4"/>
            <polygon points="120,42 192,168 48,168" fill="none" stroke="#e879f9" stroke-width="2" opacity=".75"/>
            <polygon points="120,210 192,84 48,84" fill="none" stroke="#38bdf8" stroke-width="2" opacity=".75"/>
            ${sparkle(120, 38, 6, "#fef08a")}${sparkle(42, 168, 5, "#f0abfc")}${sparkle(198, 168, 5, "#38bdf8")}
          </g>`
        }
      },
      {
        id: "aurora_stardust_cloak",
        tier: "hard",
        price: 1200,
        voucherType: "hard",
        vouchers: 6,
        slot: "outer",
        style: "cute",
        thumbViewBox: "10 40 220 220",
        name: "極光星塵披風",
        desc: "【傳說神裝】如北極光般流轉翡翠與幻紫的星塵長披風，宛如星空披身。",
        L: {
          back: (c) => `<defs>${lg(`${c.u}-aurC`, [[0, "#06b6d4"], [0.5, "#6366f1"], [1, "#a855f7"]], 1, 1)}</defs>
            <path d="M84 152 Q42 206 50 264 Q120 278 190 264 Q198 206 156 152 Z" fill="url(#${c.u}-aurC)" stroke="${OL}" stroke-width="2.2" stroke-linejoin="round" filter="${c.sglow}"/>
            <path d="M54 256 Q120 270 186 256" fill="none" stroke="#5eead4" stroke-width="3.2"/>
            ${sparkle(68, 224, 5, "#ffffff")}${sparkle(172, 218, 5, "#fde047")}${sparkle(164, 246, 4, "#5eead4")}`,
          front: () => `<path d="M88 153 Q120 172 152 153 L156 164 Q120 184 84 164 Z" fill="#312e81" stroke="#5eead4" stroke-width="2"/>
            <path d="${starPath(120, 169, 7.5, 3.2)}" fill="#5eead4" stroke="#facc15" stroke-width="1.3"/>`
        }
      },
      {
        id: "dark_dragon_wings",
        tier: "hard",
        price: 1450,
        voucherType: "hard",
        vouchers: 7,
        slot: "outer",
        style: "tech",
        thumbViewBox: "6 34 228 205",
        name: "暗黑龍翼披風",
        desc: "【傳說神裝】覆有深紅脈紋的漆黑巨龍蝠翼，展翼氣勢撼動整個資訊島。",
        L: {
          back: (c) => `<g>
            <path d="M98 164 L40 94 L12 118 L28 150 L20 184 L54 176 L72 200 L102 184 Z" fill="#18181b" stroke="#dc2626" stroke-width="2.2" stroke-linejoin="round" filter="${c.sglow}"/>
            <path d="M142 164 L200 94 L228 118 L212 150 L220 184 L186 176 L168 200 L138 184 Z" fill="#18181b" stroke="#dc2626" stroke-width="2.2" stroke-linejoin="round" filter="${c.sglow}"/>
            <path d="M40 94 L94 166 M24 148 L96 174 M200 94 L146 166 M216 148 L144 174" stroke="#991b1b" stroke-width="2"/>
            ${sparkle(36, 90, 4.5, "#ef4444")}${sparkle(204, 90, 4.5, "#ef4444")}
          </g>`
        }
      },
      {
        id: "cosmic_galaxy_halo",
        tier: "hard",
        price: 1500,
        voucherType: "hard",
        vouchers: 8,
        slot: "aura",
        style: "tech",
        thumbViewBox: "10 0 220 220",
        name: "星穹銀河光環",
        desc: "【傳說神裝】終極極光雙環與行星軌道在身周流轉，象徵滿級資訊傳奇。",
        L: {
          back: (c) => `<g>
            <circle cx="120" cy="124" r="96" fill="#4f46e5" fill-opacity=".14" filter="${c.glow}"/>
            <ellipse cx="120" cy="124" rx="102" ry="34" fill="none" stroke="#38bdf8" stroke-width="2.6" transform="rotate(-24 120 124)" filter="${c.sglow}"/>
            <ellipse cx="120" cy="124" rx="102" ry="34" fill="none" stroke="#f472b6" stroke-width="2.6" transform="rotate(24 120 124)" filter="${c.sglow}"/>
            <circle cx="32" cy="88" r="6" fill="#facc15" filter="${c.glow}"/>
            <circle cx="208" cy="160" r="5" fill="#22d3ee" filter="${c.glow}"/>
          </g>`,
          front: (c) => `<g class="av-halo">
            <ellipse cx="120" cy="24" rx="44" ry="10" fill="none" stroke="#facc15" stroke-width="4.2" filter="${c.glow}"/>
            <ellipse cx="120" cy="24" rx="44" ry="10" fill="none" stroke="#ffffff" stroke-width="1.6"/>
            ${sparkle(74, 24, 5, "#fef08a")}${sparkle(166, 24, 5, "#38bdf8")}
          </g>`
        }
      }
    ];
  };
})();
