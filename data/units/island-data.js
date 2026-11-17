/**
 * 資料海灣（data）· 第 1 批次單元教材擴充
 * ---------------------------------------------------------------
 * 本批次包含以下 2 個單元：
 *   - data-1：二進位制與文字/數字數位化編碼
 *   - data-2：影像與聲音的數位化取樣與壓縮原理
 *
 * 資料結構完全對齊 data/units/island-programming.js：
 *   - study     : 【📖 學習內容】數值進制轉換表、取樣率/量化概念表格、核心概念 SVG 圖解、易混淆迷思
 *   - lesson    : 【📝 教案綱要】教學目標、教學流程、差異化教學、評量重點
 *   - worksheet : 【📝 課堂學習單】暖身、理解、應用與反思
 *   - print     : 【🖨️ A4 列印版資料轉換練習與評量規準表（Rubric）】
 *   - quiz      : 【🎯 分級測驗】easy（3 題）、medium（4 題）、hard（5 題），均含 options、answer、explanation / explain
 */
window.CONTENT = window.CONTENT || {};
window.ISLAND_DATA = window.ISLAND_DATA || {};

(() => {
  const mkQ = (id, level, q, options, answer, explanation) => ({
    id,
    level,
    type: "single",
    q,
    question: q,
    options,
    answer,
    explain: explanation,
    explanation
  });

  const lv = (label, icon, badge, desc, questions) => ({
    label,
    icon,
    badge,
    desc,
    questions
  });

  /* ============================================================================
   * 單元一：data-1（二進位制與文字/數字數位化編碼）
   * ============================================================================ */
  const studyData1 = `
<section class="study-sec">
  <h3>🔢 二進位制原理與位元/位元組（bit / Byte）架構圖解</h3>
  <p class="study-lead">電腦內部由無數個微小的電子開關（電晶體）組成，物理上最穩定、最不容易出錯的狀態就是「高電位/通電（1）」與「低電位/斷電（0）」。因此，電腦裡所有的數字、文字、圖片與聲音，底層全都以<b>二進位制（Binary，逢二進一）</b>來表示與儲存。</p>
  <div class="hw-diagram" role="img" aria-label="8位元二進位權重位值圖與文字編碼流程：上方展示1 Byte等於8 bits的位值128到1，下方展示字元A對應ASCII 65轉為01000001">
    <svg viewBox="0 0 640 245" xmlns="http://www.w3.org/2000/svg">
      <rect x="4" y="4" width="632" height="237" rx="20" fill="#10375f" stroke="#7fb8e6" stroke-width="3"/>
      <text x="320" y="30" text-anchor="middle" fill="#ffd166" font-size="14" font-weight="800">1 Byte（位元組）= 8 bits（位元）位值權重與 ASCII 編碼範例（'A' = 65）</text>
      <g transform="translate(32,46)" font-weight="800" text-anchor="middle">
        <g fill="#0b2545" stroke="#4fb3ff" stroke-width="2">
          <rect x="0" y="0" width="66" height="92" rx="8"/><rect x="72" y="0" width="66" height="92" rx="8"/>
          <rect x="144" y="0" width="66" height="92" rx="8"/><rect x="216" y="0" width="66" height="92" rx="8"/>
          <rect x="288" y="0" width="66" height="92" rx="8"/><rect x="360" y="0" width="66" height="92" rx="8"/>
          <rect x="432" y="0" width="66" height="92" rx="8"/><rect x="504" y="0" width="66" height="92" rx="8"/>
        </g>
        <g font-size="11" fill="#cfe8ff">
          <text x="33" y="20">2⁷ 位值</text><text x="105" y="20">2⁶ 位值</text>
          <text x="177" y="20">2⁵ 位值</text><text x="249" y="20">2⁴ 位值</text>
          <text x="321" y="20">2³ 位值</text><text x="393" y="20">2² 位值</text>
          <text x="465" y="20">2¹ 位值</text><text x="537" y="20">2⁰ 位值</text>
        </g>
        <g font-size="15" fill="#ffd166">
          <text x="33" y="42">128</text><text x="105" y="42">64</text>
          <text x="177" y="42">32</text><text x="249" y="42">16</text>
          <text x="321" y="42">8</text><text x="393" y="42">4</text>
          <text x="465" y="42">2</text><text x="537" y="42">1</text>
        </g>
        <g font-size="22">
          <text x="33" y="76" fill="#94a3b8">0</text><text x="105" y="76" fill="#7be0b0">1</text>
          <text x="177" y="76" fill="#94a3b8">0</text><text x="249" y="76" fill="#94a3b8">0</text>
          <text x="321" y="76" fill="#94a3b8">0</text><text x="393" y="76" fill="#94a3b8">0</text>
          <text x="465" y="76" fill="#94a3b8">0</text><text x="537" y="76" fill="#7be0b0">1</text>
        </g>
      </g>
      <rect x="32" y="152" width="576" height="68" rx="12" fill="#0b2545" stroke="#7be0b0" stroke-width="2"/>
      <text x="320" y="178" text-anchor="middle" fill="#d9fff0" font-size="13" font-weight="800">二進位 01000001₂ ➜ 十進位位值相加：64 × 1 ＋ 1 × 1 ＝ 65₁₀ ➜ 對應 ASCII 字元 'A'</text>
      <text x="320" y="203" text-anchor="middle" fill="#ffd166" font-size="12" font-weight="700">💡 n 個位元（bits）可表示 2ⁿ 種狀態；8 bits（1 Byte）共有 2⁸ = 256 種狀態（十進位範圍 0 ~ 255）</text>
    </svg>
  </div>
  <ul class="study-list">
    <li><b>位元（bit）與位元組（Byte）</b>：<code>1 bit</code> 是數位資料的最小單位（僅 <code>0</code> 或 <code>1</code>）；<code>1 Byte = 8 bits</code>，為電腦儲存與定址的基本單位。常用容量換算：<code>1 KB = 1,024 Bytes (2¹⁰ B)</code>、<code>1 MB = 1,024 KB</code>、<code>1 GB = 1,024 MB</code>。</li>
    <li><b>二進位轉十進位（位值加權法）</b>：從最右邊（最低位）往左，位值依序為 <code>1, 2, 4, 8, 16, 32, 64, 128</code>（每次乘以 2），將標記為 <code>1</code> 的位值全部相加即可。</li>
    <li><b>十進位轉二進位（湊數法 / 連除以 2 取餘數）</b>：從不大於該數的最大位值開始拆解（例如 <code>25 = 16 + 8 + 1 = 00011001₂</code>），或反覆除以 2 並將餘數由下往上排列。</li>
    <li><b>文字數位化編碼</b>：<b>ASCII</b> 使用 1 Byte 表示英文字母、數字與控制符號；<b>Unicode（萬國碼，常見實作為 UTF-8）</b>則統一收錄全球各國語言（含繁體中文）與 Emoji，解決跨語系「亂碼」問題。</li>
  </ul>
</section>

<section class="study-sec">
  <h3>📊 數值進制轉換表與常用文字編碼（ASCII / Unicode）對照表</h3>
  <div class="study-table-wrap">
  <table class="study-table">
    <tr><th>十進位 (Decimal)</th><th>4 位元二進位 (Binary)</th><th>十六進位 (Hex)</th><th>十進位 (Decimal)</th><th>4 位元二進位 (Binary)</th><th>十六進位 (Hex)</th></tr>
    <tr><td>0</td><td><code>0000</code></td><td>0</td><td>8</td><td><code>1000</code></td><td>8</td></tr>
    <tr><td>1</td><td><code>0001</code></td><td>1</td><td>9</td><td><code>1001</code></td><td>9</td></tr>
    <tr><td>2</td><td><code>0010</code></td><td>2</td><td>10</td><td><code>1010</code></td><td>A</td></tr>
    <tr><td>3</td><td><code>0011</code></td><td>3</td><td>11</td><td><code>1011</code></td><td>B</td></tr>
    <tr><td>4</td><td><code>0100</code></td><td>4</td><td>12</td><td><code>1100</code></td><td>C</td></tr>
    <tr><td>5</td><td><code>0101</code></td><td>5</td><td>13</td><td><code>1101</code></td><td>D</td></tr>
    <tr><td>6</td><td><code>0110</code></td><td>6</td><td>14</td><td><code>1110</code></td><td>E</td></tr>
    <tr><td>7</td><td><code>0111</code></td><td>7</td><td>15</td><td><code>1111</code></td><td>F</td></tr>
  </table>
  </div>

  <div class="study-table-wrap">
  <table class="study-table">
    <tr><th>編碼標準</th><th>涵蓋字元範圍</th><th>每字元占用空間</th><th>重要基準碼位與轉換規則（必背重點）</th></tr>
    <tr><td>🔤 <b>ASCII</b></td><td>英文字母大小寫、阿拉伯數字 0–9、英文標點符號</td><td>固定 <b>1 Byte</b> (8 bits)</td><td>• 數字字元 <code>'0' = 48 (00110000₂)</code> ～ <code>'9' = 57</code><br>• 大寫英文 <code>'A' = 65 (01000001₂)</code> ～ <code>'Z' = 90</code><br>• 小寫英文 <code>'a' = 97 (01100001₂)</code> ～ <code>'z' = 122</code>（大小寫相差 32）</td></tr>
    <tr><td>🌏 <b>Big5</b></td><td>傳統繁體中文常用字（台灣早期系統編碼）</td><td>中文字 <b>2 Bytes</b></td><td>僅支援繁體中文，跨國傳送日文、韓文或簡體字時極易產生<b>亂碼</b>。</td></tr>
    <tr><td>🌐 <b>Unicode (UTF-8)</b></td><td>全球所有語言文字、罕見字、數學符號與 Emoji 😊</td><td>可變長度 <b>1 ~ 4 Bytes</b></td><td>• 英文相容 ASCII 占 <b>1 Byte</b><br>• 常用中文字在 UTF-8 中占 <b>3 Bytes (24 bits)</b><br>• Emoji 表情符號占 <b>4 Bytes</b></td></tr>
  </table>
  </div>
  <div class="flow-strip" aria-label="文字數位化儲存流程">
    <span>人類輸入字元（如 'B'）</span><i>➜</i><span>查詢編碼表（ASCII = 66）</span><i>➜</i><span>轉為二進位（01000010₂）</span><i>➜</i><span>寫入記憶體 / 硬碟</span>
  </div>
</section>

<section class="study-sec">
  <h3>⚠️ 二進位制與文字編碼常見迷思</h3>
  <div class="myth-grid">
    <div class="myth"><div class="myth-q">❌ 「8 個位元（bits）總共有 256 種狀態，所以最大可以表示十進位的 256。」</div><div class="myth-a">✅ <b>最大是 255 而非 256</b>：因為最小狀態從 <code>00000000₂ = 0</code> 開始起算，所以 256 種狀態涵蓋的無號整數範圍是 <b>0 到 255</b>（<code>11111111₂ = 255</code>）。</div></div>
    <div class="myth"><div class="myth-q">❌ 「字元 <code>'0'</code> 在電腦裡的 ASCII 二進位編碼就是 <code>00000000₂</code>。」</div><div class="myth-a">✅ <b>文字 <code>'0'</code> 與數值 <code>0</code> 編碼不同</b>：在 ASCII 表中，文字字元 <code>'0'</code> 的十進位碼位是 <b>48</b>（二進位 <code>00110000₂</code>），方便與控制字元區隔。</div></div>
  </div>
</section>`;

  const lessonData1 = {
    title: "二進位制與文字/數字數位化編碼",
    overview: "本單元從電腦硬體電路的「通電(1) / 斷電(0)」物理特性出發，帶領學生掌握位元（bit）與位元組（Byte）的單位換算、8 位元二進位與十進位的雙向轉換，並透過 ASCII 與 Unicode（UTF-8）文字編碼表，理解數字與各國文字如何轉換成 0 與 1 儲存在電腦中。",
    standards: ["資D-IV-2", "運t-IV-4", "運p-IV-3"],
    objectives: [
      "能說明電腦採用二進位制的原因，並正確換算 bit、Byte、KB、MB、GB 等儲存單位。",
      "能利用 8 位元位值表（128, 64, 32, 16, 8, 4, 2, 1）進行二進位與十進位正整數的雙向轉換。",
      "能運用 ASCII 編碼規則推算英文字母大小寫與數字字元的編碼值。",
      "能比較 ASCII、Big5 與 Unicode（UTF-8）的差異，並解釋「亂碼」產生的原因與解決方法。"
    ],
    prep: [
      "教師：簡報、8 位元二進位翻翻卡教具（印有 128, 64, 32, 16, 8, 4, 2, 1）、ASCII 編碼對照表。",
      "學生：A4 列印版資料轉換練習學習單、鉛筆與橡皮擦。"
    ],
    flow: [
      { phase: "引起動機：二進位讀心術卡牌", min: 10, teacher: "展示 5 張點數卡（16, 8, 4, 2, 1），請學生心中想一個 1~31 的座號，透過卡片亮面(1)與暗面(0)立刻算出座號，引出二進位權重概念。", student: "觀察點數卡倍增規律，嘗試用 0 與 1 組合出自己的座號。" },
      { phase: "發展活動一：bit / Byte 單位與進制轉換", min: 35, teacher: "講解 bit 與 Byte（1 Byte = 8 bits，2⁸ = 256 種狀態，範圍 0~255），示範以 8 位元位值表進行二進位轉十進位（位值相加）及十進位轉二進位（湊數法与除2取餘法）。", student: "在學習單的位值表格中練習將二進位與十進位互轉，並核對鄰座答案。" },
      { phase: "發展活動二：ASCII 與 Unicode 文字編碼解密", min: 35, teacher: "發下 ASCII 對照表，引導學生觀察 `'0'=48`、`'A'=65`、`'a'=97` 的規律；說明為何中文需要 Unicode（UTF-8）以及編碼不一致為何會產生亂碼。", student: "進行「二進位特務密電」解碼挑戰，將一連串 8 位元二進位轉為十進位再查出英文單字，並計算中英文混合字串在 UTF-8 下的 Byte 數。" },
      { phase: "總結與分級評量", min: 10, teacher: "統整「萬物皆 0 與 1」的核心觀念，進行三階段分級測驗檢核。", student: "完成線上分級測驗並針對錯誤題目檢視解析訂正。" }
    ],
    differentiation: "補救教學：提供印有「128 | 64 | 32 | 16 | 8 | 4 | 2 | 1」位值格的輔助尺，對齊填入 0 與 1 即可相加。加深加廣：延伸練習二進位與十六進位（4 bits 一組）的快速轉換，觀察網頁色碼（如 #2EC4B6）。",
    assessmentFocus: "能否正確換算 bit/Byte 單位、完成 0~255 的十進位與二進位互轉，並正確推算 ASCII 編碼與 UTF-8 字串大小。",
    extension: "用記事本分別以 ANSI（Big5）與 UTF-8 儲存同一句中英文混合文字，觀察檔案大小（Bytes）的差異。"
  };

  const worksheetData1 = {
    title: "資料海灣探險單（一）：二進位密碼與文字編碼轉換練習",
    intro: "電腦只認識 0 與 1，卻能儲存無數的數字與各國文字！請跟著底下的位值表與 ASCII 線索，一步步破解數位編碼的奧祕。",
    sections: [
      {
        title: "一、暖身：數位單位換算",
        items: [
          { type: "fill", q: "電腦最小資料單位是位元（bit），而 1 個位元組（1 Byte）等於 ____ 個 bits，最多可表示 ____ 種不同狀態，可表示的無號十進位整數範圍為 0 到 ____。", answer: "8、256、255" },
          { type: "short", q: "若隨身碟剩餘容量為 2 KB，請問相當於多少 Bytes？若改以 bits 計算又是多少 bits？（提示：1 KB = 1,024 Bytes）", hint: "先乘以 1,024 換成 Bytes，再乘以 8 換成 bits。", answer: "2 KB = 2 × 1,024 = 2,048 Bytes；2,048 × 8 = 16,384 bits。" }
        ]
      },
      {
        title: "二、理解：數值進制雙向轉換表",
        items: [
          { type: "table", q: "請利用 8 位元位值表（128, 64, 32, 16, 8, 4, 2, 1）完成下列轉換：\n(1) 二進位 `00101101₂` ➜ 十進位 = ？\n(2) 二進位 `10010011₂` ➜ 十進位 = ？\n(3) 十進位 `37` ➜ 8 位元二進位 = ？\n(4) 十進位 `100` ➜ 8 位元二進位 = ？", answer: "(1) 32 + 8 + 4 + 1 = 45；(2) 128 + 16 + 2 + 1 = 147；(3) 37 = 32 + 4 + 1 ➜ 00100101₂；(4) 100 = 64 + 32 + 4 ➜ 01100100₂。" }
        ]
      },
      {
        title: "三、應用與反思：ASCII 解碼與 Unicode 應用",
        items: [
          { type: "short", q: "已知 ASCII 編碼中 `'A' = 65`、`'a' = 97`、`'0' = 48`。請解讀這封 3 個 Byte 的二進位密電：`01000100`、`01000001`、`01011001`，拼出對應的英文單字！", answer: "01000100₂ = 64+4 = 68 ('D')；01000001₂ = 64+1 = 65 ('A')；01011001₂ = 64+16+8+1 = 89 ('Y')，單字為 DAY。" },
          { type: "reflect", q: "為什麼當我們收到外國朋友傳來的純文字檔，打開卻看到滿螢幕「亂碼」？改用哪一種編碼標準可以解決跨國語言與 Emoji 的顯示問題？", answer: "亂碼是因為「存檔時的編碼表」與「讀取時的編碼表」不一致；改用全球通用的 Unicode（UTF-8）即可同時支援各國文字與 Emoji。" }
        ]
      }
    ]
  };

  const printData1 = {
    situation: "【A4 資料轉換實作任務】海洋觀測站收到一串由水下感測器傳回的 8 位元二進位電報，裡面包含水溫數值與觀測站英文代號。請你運用 8 位元位值表與 ASCII 編碼規則完成資料轉換，並為跨國研究團隊規劃不會產生亂碼的文字儲存格式！",
    thinking: [
      "在十進位中，數字後面多加一個 0 會變成 10 倍；那麼在二進位中，數字最右邊多加一個 0（例如 `101₂` 變成 `1010₂`），數值會變成原本的幾倍？",
      "已知 ASCII 中大寫 `'A'` 是 `65 (01000001₂)`、小寫 `'a'` 是 `97 (01100001₂)`，觀察它們的二進位編碼，大小寫轉換其實只改變了哪一個位值（bit）？",
      "若在 UTF-8 編碼下，1 個英文字母占 1 Byte、1 個中文字占 3 Bytes，請問儲存「AI智慧島」這 5 個字共需多少 Bytes（相當於多少 bits）？"
    ],
    flowchart: "請畫出「十進位數值與中英文字元轉換為二進位儲存」的對照流程圖：分支一（數值）透過除以 2 取餘數或位值湊數法轉為二進位；分支二（文字）先查 ASCII / UTF-8 編碼表取得碼位數值，再轉換為對應 Bytes 的二進位 0 與 1 序列。",
    rubric: [
      { c: "數位單位與位元概念", a: "能精確換算 bit、Byte、KB、MB 並正確推算 n 位元可表示的狀態數(2ⁿ)與範圍", b: "能完成基本 bit 與 Byte 換算，僅少數次方推算微偏", t: "混淆 bit 與 Byte 的倍數關係" },
      { c: "二進位與十進位轉換正確度", a: "8 位元二進位與十進位雙向轉換完全正確，且能清楚寫出位值拆解過程", b: "多數轉換正確，僅個別位值相加粗心計算錯誤", t: "無法對齊位值表或進制轉換多處錯誤" },
      { c: "文字編碼應用與分析", a: "能熟練推算 ASCII 編碼、計算 UTF-8 中英文字串容量並清楚解釋亂碼成因", b: "能查表完成 ASCII 轉換並說明 Unicode 用途", t: "無法區分數值與文字編碼之差異" }
    ]
  };

  const data1EasyQuestions = [
    mkQ(
      "data1-e1",
      "記憶",
      "電腦內部所有資料最終都以「0」與「1」兩種狀態來儲存與運算，這種逢二進一的數值表示法稱為什麼？",
      ["十進位制（Decimal）", "二進位制（Binary）", "八進位制（Octal）", "六十進位制"],
      1,
      "電腦電路以高電位（1）與低電位（0）兩種穩定狀態運作，因此採用「二進位制（Binary）」。"
    ),
    mkQ(
      "data1-e2",
      "記憶",
      "在數位資料儲存單位中，1 個位元組（1 Byte）是由幾個位元（bits）所組成？",
      ["2 個 bits", "4 個 bits", "8 個 bits", "10 個 bits"],
      2,
      "1 Byte（位元組）固定由 8 個 bits（位元）組成，是電腦衡量檔案大小與記憶體空間的基本單位。"
    ),
    mkQ(
      "data1-e3",
      "應用",
      "某份純文字報告的檔案大小為 40 Bytes，請問這份檔案總共包含多少個位元（bits）？",
      ["5 bits", "80 bits", "320 bits", "400 bits"],
      2,
      "因為 1 Byte = 8 bits，所以 40 Bytes = 40 × 8 = 320 bits。"
    )
  ];

  const data1MediumQuestions = [
    mkQ(
      "data1-m1",
      "應用",
      "將十進位數值 45 轉換為 8 位元的二進位表示法，下列結果何者正確？（提示：位值由左至右為 128, 64, 32, 16, 8, 4, 2, 1）",
      ["00101101", "00110101", "01001101", "00101011"],
      0,
      "將 45 拆解為 2 的次方位值相加：45 = 32 + 8 + 4 + 1，對照 8 位元位值（128, 64, 32, 16, 8, 4, 2, 1）可得 00101101₂。"
    ),
    mkQ(
      "data1-m2",
      "應用",
      "將二進位數值 01010110₂ 轉換為十進位數值，其結果為何？",
      ["76", "86", "92", "106"],
      1,
      "01010110₂ 中標記為 1 的位值分別為 64、16、4、2，相加得 64 + 16 + 4 + 2 = 86。"
    ),
    mkQ(
      "data1-m3",
      "應用",
      "在標準 ASCII 編碼表中，已知大寫英文字母 'A' 的十進位編碼為 65，且字母編碼依序遞增。請問大寫字母 'F' 的十進位編碼與 8 位元二進位編碼為何？",
      ["十進位 69，二進位 01000101", "十進位 70，二進位 01000110", "十進位 71，二進位 01000111", "十進位 72，二進位 01001000"],
      1,
      "依序推算：A=65, B=66, C=67, D=68, E=69, F=70。將 70 拆解為 64 + 4 + 2，轉為 8 位元二進位即為 01000110₂。"
    ),
    mkQ(
      "data1-m4",
      "理解",
      "關於文字數位化編碼標準「ASCII」與「Unicode（UTF-8）」的比較，下列敘述何者正確？",
      ["標準 ASCII 只用 1 Byte，就能直接裝下全球數萬個繁體中文字與日文字", "Unicode（萬國碼）統一收錄了全球各國文字與 Emoji 表情符號，能有效避免跨國文件交換時出現亂碼", "UTF-8 編碼只能用來儲存黑白圖片，不能存文字", "在電腦裡，數字字元 '0' 的 ASCII 編碼值就是十進位的 0"],
      1,
      "ASCII 僅占 1 Byte，主要表示英文字母、數字與符號（其中 '0' 的 ASCII 為 48）；Unicode（UTF-8）則支援全球語言與 Emoji，解決跨語系亂碼。"
    )
  ];

  const data1HardQuestions = [
    mkQ(
      "data1-h1",
      "理解",
      "小安需要將「全校學生的學期成績試算表」與「Python 專題原始碼」壓縮備份，請問他應該選擇哪一種壓縮類型？為什麼？",
      ["失真壓縮（有損壓縮），因為少掉幾個數字或程式碼符號還是能正常執行", "非失真壓縮（無損壓縮，如 ZIP），因為文字、數據與程式碼只要改變任何一個位元就會導致資料錯誤或程式無法運作", "MP3 音訊壓縮，因為壓縮率最高", "JPEG 影像壓縮，因為最常使用"],
      1,
      "非失真壓縮（無損壓縮，Lossless）解壓縮後可 100% 完整還原每一個位元，適用於文字檔、數據表與程式碼；失真壓縮（Lossy）則用於影音照片。"
    ),
    mkQ(
      "data1-h2",
      "應用",
      "在 UTF-8 文字編碼下，若每個英文字母或半形數字占 1 Byte、每個繁體中文字占 3 Bytes。請問儲存字串「資訊課101」這 6 個字元（不含引號），在未壓縮情況下共需占用多少 Bytes 與多少 bits？",
      ["6 Bytes（48 bits）", "12 Bytes（96 bits）", "15 Bytes（120 bits）", "18 Bytes（144 bits）"],
      1,
      "「資訊課」為 3 個中文字，占 3 × 3 = 9 Bytes；「101」為 3 個半形數字字元，占 3 × 1 = 3 Bytes。合計 9 + 3 = 12 Bytes，換算為位元即 12 × 8 = 96 bits。"
    ),
    mkQ(
      "data1-h3",
      "應用",
      "有一張解析度為 400 × 300 像素的「8 位元灰階（256 階）」未壓縮點陣圖，請問這張圖片的影像資料量為多少 Bytes？",
      ["12,000 Bytes", "120,000 Bytes", "360,000 Bytes", "960,000 Bytes"],
      1,
      "總像素數 = 400 × 300 = 120,000 個像素；每個像素色彩深度為 8 bits = 1 Byte，因此未壓縮檔案大小為 120,000 × 1 = 120,000 Bytes。"
    ),
    mkQ(
      "data1-h4",
      "應用",
      "使用錄音程式錄製一段 5 秒鐘的「單聲道」語音，設定取樣頻率為 8,000 Hz、量化位元深度為 16 bits（即 2 Bytes）。請問這段未壓縮音訊的資料量為多少 Bytes？",
      ["40,000 Bytes", "80,000 Bytes", "160,000 Bytes", "640,000 bits"],
      1,
      "每秒未壓縮資料量 = 取樣率 8,000 次/秒 × 位元深度 2 Bytes × 單聲道 1 = 16,000 Bytes/秒；錄製 5 秒共需 16,000 × 5 = 80,000 Bytes。"
    ),
    mkQ(
      "data1-h5",
      "分析",
      "將一段連續重複的英文文字字串 `\"AAAAABBBBBCCCC\"`（共 14 個字元，每個字元 1 Byte）採用非失真的「游程編碼（RLE）」記為 `\"5A5B4C\"`（共 6 個字元）。請問壓縮後的資料量比原本減少了多少 Bytes？這屬於哪一種壓縮？",
      ["減少了 6 Bytes，屬於失真壓縮", "減少了 8 Bytes，屬於可 100% 還原成原字串的「非失真壓縮（無損壓縮）」", "減少了 8 Bytes，屬於無法還原的「失真壓縮」", "檔案反而增加了 6 Bytes"],
      1,
      "原始字串 14 Bytes，經 RLE 編碼後為 6 Bytes，共減少 14 - 6 = 8 Bytes；且從 `\"5A5B4C\"` 可完全精確還原回 5 個 A、5 個 B、4 個 C，屬於非失真壓縮。"
    )
  ];

  const quizData1 = {
    passScore: 60,
    easy: data1EasyQuestions,
    medium: data1MediumQuestions,
    hard: data1HardQuestions,
    levels: {
      easy: lv("入門探險家", "🧭", null, "掌握二進位定義與 bit / Byte 基本儲存單位換算。", data1EasyQuestions),
      medium: lv("進階挑戰者", "🧰", "silver", "熟練十進位轉二進位計算、ASCII 推算與 Unicode 編碼應用。", data1MediumQuestions),
      hard: lv("大師領航員", "👑", "gold", "綜合分析非失真/失真壓縮差異及未壓縮文字、影像與音訊檔案大小計算。", data1HardQuestions)
    }
  };

  const unitData1 = {
    id: "data-1",
    unit: "二進位制與文字/數字數位化編碼",
    study: { title: "二進位制與文字/數字數位化編碼", html: studyData1 },
    learningContent: { title: "二進位制與文字/數字數位化編碼", html: studyData1 },
    lesson: lessonData1,
    worksheet: worksheetData1,
    print: printData1,
    lessonPlan: { lesson: lessonData1, worksheet: worksheetData1, print: printData1 },
    quiz: quizData1
  };

  /* ============================================================================
   * 單元二：data-2（影像與聲音的數位化取樣與壓縮原理）
   * ============================================================================ */
  const studyData2 = `
<section class="study-sec">
  <h3>🎨 影像與聲音數位化：取樣（Sampling）、量化（Quantization）與壓縮圖解</h3>
  <p class="study-lead">自然界的風景與聲音是「連續不斷」的類比訊號（Analog）；要放進只懂有限數字的電腦裡，必須經過<b>「1. 取樣（切分時間或空間間隔）」</b>與<b>「2. 量化（對應到有限數值階層）」</b>兩大步驟，最後再透過<b>資料壓縮</b>平衡品質與檔案容量。</p>
  <div class="hw-diagram" role="img" aria-label="影像與聲音數位化及壓縮原理圖解：左側為點陣像素空間取樣與RLE游程壓縮，右側為聲波時間取樣與振幅量化階梯圖">
    <svg viewBox="0 0 640 250" xmlns="http://www.w3.org/2000/svg">
      <rect x="4" y="4" width="632" height="242" rx="20" fill="#10375f" stroke="#7fb8e6" stroke-width="3"/>
      <text x="165" y="32" text-anchor="middle" fill="#ffd166" font-size="14" font-weight="800">🖼️ 影像數位化：空間取樣（像素 Pixel）</text>
      <g transform="translate(30,46)">
        <rect x="0" y="0" width="144" height="144" fill="#e2e8f0" stroke="#475569" stroke-width="2"/>
        <g fill="#0f172a">
          <rect x="18" y="18" width="36" height="18"/><rect x="90" y="18" width="36" height="18"/>
          <rect x="0" y="36" width="144" height="36"/>
          <rect x="18" y="72" width="108" height="18"/>
          <rect x="36" y="90" width="72" height="18"/>
          <rect x="54" y="108" width="36" height="18"/>
        </g>
        <g stroke="#94a3b8" stroke-width="1">
          <path d="M18 0v144M36 0v144M54 0v144M72 0v144M90 0v144M108 0v144M126 0v144"/>
          <path d="M0 18h144M0 36h144M0 54h144M0 72h144M0 90h144M0 108h144M0 126h144"/>
        </g>
      </g>
      <g font-size="11.5" font-weight="700" fill="#e6f6ff">
        <text x="186" y="70" fill="#ffd166">• 解析度：寬 × 高</text>
        <text x="186" y="90">  8 × 8 = 64 像素</text>
        <text x="186" y="116" fill="#7be0b0">• 色彩深度 (量化)：</text>
        <text x="186" y="136">  1 bit ➜ 2¹ = 2 色</text>
        <text x="186" y="154">  8 bits ➜ 2⁸ = 256 色</text>
        <text x="186" y="172">  24 bits ➜ 約1677萬色</text>
      </g>

      <text x="475" y="32" text-anchor="middle" fill="#7be0b0" font-size="14" font-weight="800">🎵 聲音數位化：時間取樣率 ＋ 位元深度量化</text>
      <g transform="translate(335,46)">
        <rect x="0" y="0" width="275" height="144" rx="10" fill="#0b2545" stroke="#4fb3ff" stroke-width="2"/>
        <g stroke="#335c81" stroke-width="1" stroke-dasharray="4 4">
          <path d="M10 28h255M10 56h255M10 84h255M10 112h255"/>
        </g>
        <path d="M15 84 Q 55 12, 95 80 T 175 90 T 255 40" fill="none" stroke="#ff8a65" stroke-width="3"/>
        <g stroke="#7be0b0" stroke-width="2">
          <line x1="35" y1="128" x2="35" y2="52"/><circle cx="35" cy="56" r="4" fill="#ffd166"/>
          <line x1="75" y1="128" x2="75" y2="45"/><circle cx="75" cy="56" r="4" fill="#ffd166"/>
          <line x1="115" y1="128" x2="115" y2="106"/><circle cx="115" cy="112" r="4" fill="#ffd166"/>
          <line x1="155" y1="128" x2="155" y2="110"/><circle cx="155" cy="112" r="4" fill="#ffd166"/>
          <line x1="195" y1="128" x2="195" y2="58"/><circle cx="195" cy="56" r="4" fill="#ffd166"/>
          <line x1="235" y1="128" x2="235" y2="32"/><circle cx="235" cy="28" r="4" fill="#ffd166"/>
        </g>
        <text x="137" y="138" text-anchor="middle" fill="#cfe8ff" font-size="10.5">橘線：類比聲波 ｜ 綠線：取樣頻率(Hz) ｜ 黃點：量化位元階層</text>
      </g>
      <text x="320" y="224" text-anchor="middle" fill="#ffd166" font-size="12" font-weight="800">💡 取樣越密集、量化位元數越高 ➜ 畫質與音質越逼真，但未壓縮檔案容量也成倍數增加！</text>
    </svg>
  </div>
  <ul class="study-list">
    <li><b>影像數位化</b>：將畫面切分成網格<b>像素（Pixel，空間取樣）</b>，再將每格顏色對應到固定位元數的<b>色彩深度（Color Depth，色彩量化）</b>。例如 24 bits RGB 全彩圖，R、G、B 三原色各占 8 bits（0~255），共可表現 <code>2²⁴ ≈ 1,677 萬</code>種顏色。</li>
    <li><b>聲音數位化</b>：每隔固定時間測量一次聲波振幅稱為<b>取樣頻率（Sampling Rate，單位 Hz，代表每秒取樣次數）</b>；將每次測得的振幅高度對應到固定位元數稱為<b>取樣位元深度（Bit Depth）</b>。</li>
    <li><b>非失真壓縮 vs. 失真壓縮</b>：<b>非失真壓縮（無損，Lossless）</b>利用重複規律（如游程編碼 RLE）縮減空間，可 100% 還原；<b>失真壓縮（有損，Lossy）</b>則移除人眼或人耳不敏感的細節，換取極高壓縮率。</li>
  </ul>
</section>

<section class="study-sec">
  <h3>📊 取樣率/量化概念與非失真/失真壓縮規格總整理表</h3>
  <div class="study-table-wrap">
  <table class="study-table">
    <tr><th>媒體類型</th><th>取樣指標（切多細）</th><th>量化指標（分幾階）</th><th>未壓縮檔案大小計算公式（必考重點）</th></tr>
    <tr><td>🖼️ <b>數位影像</b></td><td><b>解析度（Resolution）</b><br><code>寬像素 × 高像素</code></td><td><b>色彩深度（Color Depth）</b><br>• 黑白：1 bit (2色)<br>• 灰階：8 bits = 1 Byte (256階)<br>• RGB全彩：24 bits = 3 Bytes</td><td><code>影像大小 (bits) = 寬 × 高 × 色彩深度(bits)</code><br><code>影像大小 (Bytes) = 寬 × 高 × 色彩深度(bits) ÷ 8</code><br>例：800×600 全彩(24 bits) = 800×600×3 = <b>1,440,000 Bytes</b></td></tr>
    <tr><td>🎵 <b>數位音訊</b></td><td><b>取樣頻率（Sampling Rate）</b><br>每秒取樣次數 (Hz)<br>• 電話語音：8,000 Hz<br>• 音樂 CD：44,100 Hz (44.1 kHz)</td><td><b>位元深度（Bit Depth）</b><br>每次取樣紀錄位元數<br>• 語音：8 bits (1 Byte)<br>• 音樂 CD：16 bits (2 Bytes)</td><td><code>音訊大小 (bits) = 取樣率(Hz) × 位元深度(bits) × 聲道數 × 秒數</code><br><code>音訊大小 (Bytes) = 上式 ÷ 8</code><br>例：10秒單聲道(8000Hz, 16bits) = 8000×2×1×10 = <b>160,000 Bytes</b></td></tr>
  </table>
  </div>

  <div class="study-table-wrap">
  <table class="study-table">
    <tr><th>壓縮類別</th><th>還原程度與壓縮原理</th><th>常見檔案格式</th><th>適用情境與理由</th></tr>
    <tr><td>🛡️ <b>非失真壓縮</b><br>(無損 Lossless)</td><td>解壓縮後與原檔 <b>100% 完全相同</b>；利用統計重複資料（如 RLE 游程編碼、字典編碼）精簡紀錄。</td><td>• 壓縮檔：<code>ZIP</code>、<code>RAR</code><br>• 圖片：<code>PNG</code>、<code>GIF</code><br>• 音訊：<code>FLAC</code></td><td><b>文字文件、試算表數據、程式碼、線條圖標</b>（任何一個字元或數字都不能出錯）。</td></tr>
    <tr><td>📉 <b>失真壓縮</b><br>(有損 Lossy)</td><td>永久捨棄人眼對高頻色彩變化或人耳聽不見的頻率細節，<b>無法還原成原始位元</b>，但檔案極小。</td><td>• 圖片：<code>JPEG (.jpg)</code><br>• 音訊：<code>MP3</code>、<code>AAC</code><br>• 視訊：<code>MP4</code></td><td><b>自然風景照片、流行音樂、網路串流影片</b>（微小細節流失不易察覺，卻能大幅節省空間與頻寬）。</td></tr>
  </table>
  </div>
  <div class="flow-strip" aria-label="多媒體數位化與壓縮流程">
    <span>連續類比影音</span><i>➜</i><span>1. 取樣 (解析度/取樣率)</span><i>➜</i><span>2. 量化 (色彩深度/位元深度)</span><i>➜</i><span>3. 壓縮儲存 (PNG無損 / JPEG・MP3有損)</span>
  </div>
</section>

<section class="study-sec">
  <h3>⚠️ 取樣、量化與壓縮常見迷思</h3>
  <div class="myth-grid">
    <div class="myth"><div class="myth-q">❌ 「把一張圖片的長與寬像素各放大為 2 倍，未壓縮檔案大小也會變成 2 倍。」</div><div class="myth-a">✅ <b>會變成 4 倍！</b>因為總像素面積是「寬 × 高」，當寬變 2 倍、高也變 2 倍時，總像素與資料量會變成 <code>2 × 2 = 4</code> 倍。</div></div>
    <div class="myth"><div class="myth-q">❌ 「把 MP3 音樂轉檔回 WAV 未壓縮格式，被壓縮掉的音質細節就會全部恢復！」</div><div class="myth-a">✅ <b>失真壓縮無法復原細節</b>：MP3 在壓縮時已永久捨棄部分聲音細節，轉回 WAV 只會讓檔案變大，不會變回原本的高音質。</div></div>
  </div>
</section>`;

  const lessonData2 = {
    title: "影像與聲音的數位化取樣與壓縮原理",
    overview: "本單元深入探討影像與聲音如何透過「取樣（Sampling）」與「量化（Quantization）」轉化為數位資料，帶領學生實際計算未壓縮點陣圖與數位音訊的檔案大小，並比較非失真壓縮（無損，如 PNG、ZIP、RLE）與失真壓縮（有損，如 JPEG、MP3）的原理與生活選用策略。",
    standards: ["資D-IV-1", "資D-IV-3", "運t-IV-4"],
    objectives: [
      "能說明影像數位化（像素解析度、色彩深度）與聲音數位化（取樣頻率 Hz、位元深度、聲道）的取樣與量化意義。",
      "能運用公式正確計算未壓縮影像與未壓縮音訊的檔案大小（bits 與 Bytes 換算）。",
      "能操作黑白點陣圖的游程編碼（RLE），體驗非失真壓縮的運作原理。",
      "能比較非失真壓縮（Lossless）與失真壓縮（Lossy）的差異，並依生活情境選擇合適的檔案格式。"
    ],
    prep: [
      "教師：簡報、放大可見像素網格的圖片範例、不同取樣率音訊試聽檔、方格取樣與 RLE 壓縮練習單。",
      "學生：A4 列印版數位化容量計算與壓縮練習單、計算機或紙筆。"
    ],
    flow: [
      { phase: "引起動機：放大鏡下的馬賽克與聲波階梯", min: 10, teacher: "將一張照片放大至出現像素方格，並播放 44.1 kHz 與 8 kHz 的同一段音樂，提問：「電腦是如何把平滑的畫面與連續的聲音切成數字的？」", student: "觀察影像像素與不同取樣率的音質差異，體會連續訊號離散化的過程。" },
      { phase: "發展活動一：取樣與量化——影像與音訊容量計算", min: 35, teacher: "講解影像解析度（寬×高）與色彩深度（1/8/24 bits），以及聲音取樣頻率（Hz）、位元深度与聲道數；推導未壓縮檔案大小公式並帶算範例。", student: "在學習單練習計算全彩圖片與雙聲道 CD 音訊的未壓縮 Bytes 容量。" },
      { phase: "發展活動二：非失真壓縮（RLE / ZIP / PNG）vs. 失真壓縮（JPEG / MP3）", min: 35, teacher: "示範黑白點陣圖的游程編碼（RLE）無損壓縮，接著比較為什麼風景照與音樂常用有損壓縮（JPEG、MP3），而校徽圖標與成績單必須用無損壓縮。", student: "動手完成 8×5 黑白點陣圖 RLE 壓縮與還原，並針對不同情境判斷應採用哪種壓縮格式。" },
      { phase: "總結與分級評量", min: 10, teacher: "回顧取樣、量化與壓縮如何共同決定數位媒體的「品質」與「容量」，進行分級測驗。", student: "完成線上分級測驗並檢討計算過程。" }
    ],
    differentiation: "補救教學：提供標註好「先算總bits → 再除以8換成Bytes」的步驟計算格。加深加廣：請學生計算一段 3 分鐘 CD 音質（44.1 kHz、16 bits、雙聲道）未壓縮 WAV 檔需要多少 MB，並與壓縮後的 MP3（約 3 MB）計算壓縮比。",
    assessmentFocus: "能否正確區分取樣與量化、準確計算未壓縮影像與音訊檔案大小，並正確比較非失真與失真壓縮的適用情境。",
    extension: "比較手機拍出的一張照片（JPEG）與電腦螢幕截圖（PNG）的解析度及檔案大小差異。"
  };

  const worksheetData2 = {
    title: "資料海灣探險單（二）：影音取樣量化計算與壓縮挑戰",
    intro: "高畫質照片與好聽的音樂背後都是龐大的數位數據！讓我們學會計算未壓縮影音的檔案大小，並運用壓縮技術幫檔案瘦身。",
    sections: [
      {
        title: "一、暖身：取樣與量化概念配對",
        items: [
          { type: "fill", q: "將連續的類比訊號轉為數位資料時，在空間或時間上每隔固定間隔擷取樣本稱為「____」；將樣本數值四捨五入對應到有限位元階層稱為「____」。", answer: "取樣、量化" },
          { type: "short", q: "一張「24 位元 RGB 全彩圖片」中，每個像素占 24 bits（相當於幾個 Bytes？），最多可以調配出 2 的幾次方種顏色？", answer: "24 bits = 3 Bytes；最多可表示 2²⁴（約 1,677 萬）種顏色。" }
        ]
      },
      {
        title: "二、理解：未壓縮影像與音訊檔案大小計算",
        items: [
          { type: "table", q: "請寫出計算過程並算出下列未壓縮檔案的大小（單位：Bytes，記得 1 Byte = 8 bits）：\n(1) 解析度 200 × 100 像素的「8 位元灰階圖」\n(2) 解析度 100 × 100 像素的「24 位元全彩圖」\n(3) 取樣率 10,000 Hz、位元深度 16 bits、單聲道、長度 4 秒的音訊", answer: "(1) 200 × 100 × (8÷8) = 20,000 Bytes；(2) 100 × 100 × (24÷8) = 30,000 Bytes；(3) 10,000 × (16÷8) × 1 × 4 = 80,000 Bytes。" }
        ]
      },
      {
        title: "三、應用與反思：RLE 無損壓縮與失真壓縮選擇",
        items: [
          { type: "draw", q: "有一列 10 格的黑白像素為 `0000111100`（0代表白W、1代表黑B）。若使用游程編碼（RLE）記為「連續數量+顏色」，可簡記為什麼？若遇到黑白單格交替 `0101010101`，為什麼 RLE 反而沒效？", answer: "可記為 4W4B2W（或 4, 4, 2）；若單格交替（1W1B1W1B...）沒有連續重複區塊，加上次數標記後資料量反而比原本更大。" },
          { type: "reflect", q: "請比較「非失真壓縮（如 ZIP、PNG）」與「失真壓縮（如 JPEG、MP3）」：為什麼旅遊風景照適合存成 JPEG，但醫院的精密 X 光醫療影像或銀行帳本卻不能隨便用高比例失真壓縮？", answer: "旅遊照少掉微小色彩細節人眼不易察覺，用 JPEG 可大幅節省空間；但醫療影像的微小陰影或銀行帳本數字一旦失真會影響診斷與金額正確性，必須維持無損。" }
        ]
      }
    ]
  };

  const printData2 = {
    situation: "【A4 數位化轉換與壓縮實作任務】學校數位博物館正在進行「老照片與校歌錄音數位化典藏計畫」。館長請你負責規劃掃描圖片的解析度與錄音取樣規格，預估硬碟儲存空間，並決定哪些檔案該用「非失真壓縮」、哪些該用「失真壓縮」！",
    thinking: [
      "當圖片的寬與高像素各提高為原本的 3 倍（例如 100×100 變成 300×300），在色彩深度不變下，未壓縮檔案大小會變成原本的幾倍？",
      "為什麼電話語音只需要 8,000 Hz 的取樣頻率就聽得懂說話，而音樂 CD 卻需要 44,100 Hz（44.1 kHz）？",
      "請列出「非失真壓縮（Lossless）」與「失真壓縮（Lossy）」在還原程度、壓縮率以及常見副檔名上的核心差異。"
    ],
    flowchart: "請畫出「影像與音訊數位化容量估算與壓縮選用」決策流程圖：輸入媒體規格 ➜ 計算未壓縮總位元數（影像：寬×高×色彩深度；音訊：取樣率×位元深度×聲道×秒數）➜ 除以 8 換算為 Bytes ➜ 判斷用途（需 100% 精確還原選無損 PNG/ZIP/FLAC；一般網路傳播選有損 JPEG/MP3/MP4）。",
    rubric: [
      { c: "取樣與量化概念理解", a: "能清楚區分空間/時間取樣與色彩/振幅量化，並準確說明規格高低對品質與容量的影響", b: "能正確配對解析度、色彩深度與取樣率概念", t: "混淆取樣與量化定義" },
      { c: "未壓縮檔案大小計算", a: "能熟練運用公式計算各種影像與單/雙聲道音訊容量，且 bit 與 Byte 單位轉換完全正確", b: "列式正確，僅計算過程或除以 8 轉換時有微小疏漏", t: "無法列出容量計算公式" },
      { c: "非失真与失真壓縮比較", a: "能正確執行 RLE 編碼，並能依據資料特性精準選擇無損或有損壓縮格式並說明理由", b: "能區分常見無損與有損檔案格式", t: "無法區分非失真與失真壓縮的差異" }
    ]
  };

  const data2EasyQuestions = [
    mkQ(
      "data2-e1",
      "記憶",
      "電腦在處理與儲存數位影像或音訊時，最小的基本資訊單位「位元（bit）」只能表示哪兩種狀態？且 1 Byte 等於多少 bits？",
      ["只能表示 0 與 9；1 Byte = 10 bits", "只能表示 0 與 1（二進位）；1 Byte = 8 bits", "可表示 0 到 255；1 Byte = 100 bits", "只能表示 A 與 B；1 Byte = 4 bits"],
      1,
      "二進位制中每個位元（bit）僅有 0 與 1 兩種狀態，且 1 Byte（位元組）= 8 bits。"
    ),
    mkQ(
      "data2-e2",
      "記憶",
      "將連續的影像或聲音轉成數位資料時，先在空間或時間上切分擷取樣本點（如切成像素方格或每秒測量 44,100 次），再將數值對應到固定位元階層，這兩個步驟依序稱為什麼？",
      ["取樣（Sampling）與量化（Quantization）", "排序（Sorting）與搜尋（Searching）", "加密（Encryption）與解密（Decryption）", "複製（Copy）與貼上（Paste）"],
      0,
      "數位化的兩大核心步驟依序為「取樣（切分空間像素或時間頻率）」與「量化（對應到固定色彩深度或位元階層）」。"
    ),
    mkQ(
      "data2-e3",
      "應用",
      "一張「24 位元（bits）RGB 全彩圖片」中，每一個像素（Pixel）需要占用幾個位元組（Bytes）的儲存空間？",
      ["1 Byte", "2 Bytes", "3 Bytes", "24 Bytes"],
      2,
      "因為 1 Byte = 8 bits，所以每像素 24 bits 相當於 24 ÷ 8 = 3 Bytes（紅 R、綠 G、藍 B 各占 1 Byte）。"
    )
  ];

  const data2MediumQuestions = [
    mkQ(
      "data2-m1",
      "應用",
      "在 8 位元灰階影像中，每個像素用 8 bits 二進位數（0~255）代表亮度。若某個像素的亮度值為十進位的 180，轉換為 8 位元二進位應為下列何者？",
      ["10110100", "10101100", "11010100", "01110100"],
      0,
      "將 180 拆解為位值相加：180 = 128 + 32 + 16 + 4，對照 8 位元位值（128, 64, 32, 16, 8, 4, 2, 1）可得 10110100₂。"
    ),
    mkQ(
      "data2-m2",
      "理解",
      "將一張點陣圖的解析度由 100 × 100 提高為 200 × 200（色彩深度維持不變），請問總像素數量與未壓縮影像資料量會變成原本的幾倍？",
      ["2 倍", "4 倍", "8 倍", "16 倍"],
      1,
      "寬度與高度各變為 2 倍（100→200），總像素由 10,000 變為 40,000，面積與未壓縮資料量變為 2 × 2 = 4 倍。"
    ),
    mkQ(
      "data2-m3",
      "理解",
      "關於聲音數位化中的「取樣頻率（Sampling Rate，如 CD 音質的 44.1 kHz）」與「量化位元深度」，下列敘述何者正確？",
      ["取樣頻率越高、量化位元數越多，記錄的聲波越接近真實原音，但未壓縮的檔案容量也越大", "取樣頻率越低，聲音聽起來越細膩清晰", "44.1 kHz 代表整首歌的檔案大小只有 44.1 Bytes", "取樣頻率只跟圖片顏色有關，跟聲音無關"],
      0,
      "44.1 kHz 代表每秒對聲音取樣 44,100 次；取樣越密集、量化位元深度越高，失真越小、音質越好，但數據量也越大。"
    ),
    mkQ(
      "data2-m4",
      "應用",
      "數位音樂檔案常在檔頭（Metadata）使用 Unicode（UTF-8）儲存曲名與歌手資訊，而未壓縮音訊檔的檔頭常以 ASCII 標記 `\"WAVE\"`。已知 ASCII 中 `'A'=65`，請問字母 `'W'`（第 23 個英文字母）的十進位與 8 位元二進位編碼為何？",
      ["十進位 86，二進位 01010110", "十進位 87，二進位 01010111", "十進位 88，二進位 01011000", "十進位 89，二進位 01011001"],
      1,
      "'A' 為第 1 個字母（65），第 23 個字母 'W' 為 65 + 22 = 87；將 87 拆解為 64 + 16 + 4 + 2 + 1，二進位為 01010111₂。"
    )
  ];

  const data2HardQuestions = [
    mkQ(
      "data2-h1",
      "分析",
      "關於「非失真壓縮（無損壓縮，Lossless）」與「失真壓縮（有損壓縮，Lossy）」的比較，下列配對與敘述何者完全正確？",
      ["ZIP、PNG 屬於失真壓縮；JPEG、MP3 屬於非失真壓縮", "JPEG 與 MP3 透過捨棄人眼或人耳不易察覺的微小細節來大幅縮小檔案，屬於「失真壓縮」；ZIP 與 PNG 解壓縮後可 100% 完整還原，屬於「非失真壓縮」", "所有壓縮方法都會讓文字檔裡的文字隨機消失", "把 MP3 轉檔成 WAV 就能把當初失真壓縮捨棄掉的高頻細節重新變回來"],
      1,
      "JPEG（影像）、MP3（音訊）、MP4（視訊）屬於失真壓縮（有損），壓縮率高但無法還原被捨棄的細節；ZIP、PNG、FLAC 屬於非失真壓縮（無損），可 100% 還原。"
    ),
    mkQ(
      "data2-h2",
      "應用",
      "有一張解析度為 800 × 600 像素的「24 位元 RGB 全彩」未壓縮點陣圖，請問這張圖片的影像資料量為多少 Bytes？（提示：1 Byte = 8 bits）",
      ["480,000 Bytes", "960,000 Bytes", "1,440,000 Bytes", "11,520,000 Bytes"],
      2,
      "總像素 = 800 × 600 = 480,000 個像素；每像素色彩深度 24 bits = 3 Bytes；因此未壓縮容量 = 480,000 × 3 = 1,440,000 Bytes（約 1.37 MB）。"
    ),
    mkQ(
      "data2-h3",
      "應用",
      "錄製一段 10 秒鐘的「雙聲道（立體聲，2 聲道）」高音質數位錄音，設定取樣頻率為 44,100 Hz、量化位元深度為 16 bits（即 2 Bytes）。請問這段未壓縮音訊的檔案大小為多少 Bytes？",
      ["441,000 Bytes", "882,000 Bytes", "1,764,000 Bytes", "14,112,000 Bytes"],
      2,
      "未壓縮音訊大小 = 取樣率 44,100 × 位元深度 2 Bytes (16 bits) × 雙聲道 2 × 時間 10 秒 = 1,764,000 Bytes。"
    ),
    mkQ(
      "data2-h4",
      "分析",
      "某黑白圖示的一列像素共 12 格為「白白白白黑黑黑黑黑黑白白」（WWWWWBBBBBBWW 的變化型：4 個白、6 個黑、2 個白）。若使用非失真的「游程編碼（RLE）」記為 `4W6B2W`，請問下列哪一種圖案使用 RLE 壓縮時效果最差？",
      ["整張全白只有中間一條粗黑橫線的圖案", "上半部全黑、下半部全白的圖案", "黑白單格交替出現的西洋棋盤格（如 BWBWBWBWBWBW...）", "大面積純色背景的簡單卡通標誌"],
      2,
      "游程編碼（RLE）依賴「大量連續重複的相同資料」來縮減空間；若為黑白單格交替（1B1W1B1W...），毫無連續重複，加上數量標記後反而比原資料更大。"
    ),
    mkQ(
      "data2-h5",
      "應用",
      "小凱有一張未壓縮大小為 2,400,000 Bytes 的全彩風景照，轉存為 JPEG（失真壓縮）後檔案大小變為 240,000 Bytes；另一張轉存為 PNG（非失真壓縮）後檔案大小為 1,200,000 Bytes。下列分析何者正確？",
      ["JPEG 的壓縮率較高（檔案縮小為原本的 1/10），適合放在網頁上加快載入速度，但捨棄了部分微小色彩細節", "PNG 會破壞圖片細節導致文字模糊不清", "JPEG 屬於非失真壓縮，可以 100% 還原出原本 2,400,000 Bytes 的每一個原始像素值", "壓縮後的檔案之所以變小，是因為圖片的長寬像素被裁切掉只剩十分之一"],
      0,
      "JPEG 透過失真壓縮將檔案縮減為 240,000 / 2,400,000 = 1/10（解析度長寬不變，但捨棄人眼不敏感的高頻色彩細節），非常適合網頁與相片儲存。"
    )
  ];

  const quizData2 = {
    passScore: 60,
    easy: data2EasyQuestions,
    medium: data2MediumQuestions,
    hard: data2HardQuestions,
    levels: {
      easy: lv("入門探險家", "🧭", null, "認識二進位位元定義、bit/Byte 換算與取樣/量化基本概念。", data2EasyQuestions),
      medium: lv("進階挑戰者", "🧰", "silver", "掌握十進位轉二進位灰階值、解析度倍數、取樣頻率與 ASCII 應用。", data2MediumQuestions),
      hard: lv("大師領航員", "👑", "gold", "精熟非失真/失真壓縮比較、RLE 原理及未壓縮音訊与全彩影像檔案大小計算。", data2HardQuestions)
    }
  };

  const unitData2 = {
    id: "data-2",
    unit: "影像與聲音的數位化取樣與壓縮原理",
    study: { title: "影像與聲音的數位化取樣與壓縮原理", html: studyData2 },
    learningContent: { title: "影像與聲音的數位化取樣與壓縮原理", html: studyData2 },
    lesson: lessonData2,
    worksheet: worksheetData2,
    print: printData2,
    lessonPlan: { lesson: lessonData2, worksheet: worksheetData2, print: printData2 },
    quiz: quizData2
  };

  /* ============================================================================
   * 單元三：data-3（試算表資料處理、統計公式與條件判斷函式）
   * ============================================================================ */
  const studyData3 = `
<section class="study-sec">
  <h3>🧹 試算表資料清理（Data Cleaning）與四大常見「髒資料」圖解</h3>
  <p class="study-lead">真實世界收回來的問卷或感測器原始資料（Raw Data）常包含漏填、重複或格式混亂等問題。資料科學鐵則：<b>「垃圾進，垃圾出（Garbage In, Garbage Out）」</b>——套用統計公式前，務必先備份原始工作表並完成資料清理！</p>
  <div class="hw-diagram" role="img" aria-label="資料清理流程與四大髒資料類型：重複值、格式單位不一、異常離群值、缺漏值">
    <svg viewBox="0 0 640 210" xmlns="http://www.w3.org/2000/svg">
      <rect x="4" y="4" width="632" height="202" rx="20" fill="#10375f" stroke="#7fb8e6" stroke-width="3"/>
      <text x="320" y="30" text-anchor="middle" fill="#ffd166" font-size="14" font-weight="800">🩺 原始資料健檢：四大常見問題與清理對策</text>
      <g font-weight="800" text-anchor="middle" font-size="13">
        <g><rect x="18" y="48" width="142" height="115" rx="12" fill="#ffd166" stroke="#a87400" stroke-width="3"/>
          <text x="89" y="72" fill="#3a2a00">① 重複值</text>
          <text x="89" y="96" font-size="11" fill="#3a2a00">同一人連按兩次提交</text>
          <rect x="30" y="112" width="118" height="36" rx="6" fill="#fff3b0"/>
          <text x="89" y="135" font-size="11" fill="#3a2a00">✅ 移除重複資料列</text></g>
        <g><rect x="174" y="48" width="142" height="115" rx="12" fill="#7fb8ff" stroke="#0b5a99" stroke-width="3"/>
          <text x="245" y="72" fill="#04243f">② 格式/單位不一</text>
          <text x="245" y="96" font-size="11" fill="#04243f">填 165cm、1.65m、165</text>
          <rect x="186" y="112" width="118" height="36" rx="6" fill="#e0f2fe"/>
          <text x="245" y="135" font-size="11" fill="#04243f">✅ 統一為純數字 165</text></g>
        <g><rect x="330" y="48" width="142" height="115" rx="12" fill="#ff8a65" stroke="#a83a15" stroke-width="3"/>
          <text x="401" y="72" fill="#3d0f00">③ 異常值(離群值)</text>
          <text x="401" y="96" font-size="11" fill="#3d0f00">每日睡眠填 99 小時</text>
          <rect x="342" y="112" width="118" height="36" rx="6" fill="#ffedd5"/>
          <text x="401" y="135" font-size="11" fill="#3d0f00">✅ 查證修正或排除</text></g>
        <g><rect x="486" y="48" width="136" height="115" rx="12" fill="#7be0b0" stroke="#0c6f50" stroke-width="3"/>
          <text x="554" y="72" fill="#02301f">④ 缺漏值</text>
          <text x="554" y="96" font-size="11" fill="#02301f">儲存格空白未填寫</text>
          <rect x="496" y="112" width="116" height="36" rx="6" fill="#d1fae5"/>
          <text x="554" y="135" font-size="11" fill="#02301f">✅ 補齊或略過不捏造</text></g>
      </g>
      <text x="320" y="188" text-anchor="middle" fill="#e6f6ff" font-size="12" font-weight="700">🛡️ 黃金守則：動手清理前，務必先「複製工作表」備份原始資料！</text>
    </svg>
  </div>
  <ul class="study-list">
    <li><b>排序（Sort）與篩選（Filter）</b>：<b>排序</b>可依數值大小（遞增/遞減）重排資料列；<b>篩選</b>則能只顯示符合指定條件的資料列，且不會刪除隱藏的資料。</li>
    <li><b>試算表公式基本語法</b>：所有公式與函式一律以等號 <code>=</code> 開頭；連續儲存格範圍以冒號 <code>:</code> 表示（例如 <code>C2:C6</code> 代表 C2、C3、C4、C5、C6 共 5 格）。</li>
    <li><b>相對參照 vs. 絕對參照（<code>$</code>）</b>：向下拖曳填滿控點複製公式時，<code>C2</code> 會自動變成 <code>C3</code>（相對參照）；若加上錢字號如 <code>$G$1</code>（絕對參照），則拖曳時固定鎖定該格不變。</li>
  </ul>
</section>

<section class="study-sec">
  <h3>🧮 統計公式與條件判斷函式（SUM, AVERAGE, MAX/MIN, IF, COUNTIF）對照表</h3>
  <div class="study-table-wrap">
  <table class="study-table">
    <tr><th>列號</th><th>A 欄：姓名</th><th>B 欄：社團志願</th><th>C 欄：每週運動(hr)</th><th>D 欄：體適能分數</th><th>E 欄：運動達標判定 (IF 條件函式)</th></tr>
    <tr><td><b>2</b></td><td>小安</td><td>籃球社</td><td>5</td><td>85</td><td><code>=IF(C2&gt;=3, "達標", "待加強")</code> ➜ <b>達標</b></td></tr>
    <tr><td><b>3</b></td><td>小凱</td><td>熱舞社</td><td>2</td><td>70</td><td><code>=IF(C3&gt;=3, "達標", "待加強")</code> ➜ <b>待加強</b></td></tr>
    <tr><td><b>4</b></td><td>小妍</td><td>籃球社</td><td>6</td><td>90</td><td><code>=IF(C4&gt;=3, "達標", "待加強")</code> ➜ <b>達標</b></td></tr>
    <tr><td><b>5</b></td><td>小哲</td><td>科研社</td><td>1</td><td>65</td><td><code>=IF(C5&gt;=3, "達標", "待加強")</code> ➜ <b>待加強</b></td></tr>
    <tr><td><b>6</b></td><td>小華</td><td>籃球社</td><td>4</td><td>80</td><td><code>=IF(C6&gt;=3, "達標", "待加強")</code> ➜ <b>達標</b></td></tr>
  </table>
  </div>

  <div class="study-table-wrap">
  <table class="study-table">
    <tr><th>函式名稱</th><th>核心功能</th><th>標準語法結構</th><th>對照上表實作範例</th><th>運算結果與解析</th></tr>
    <tr><td><b>SUM</b></td><td>計算範圍內數值的<b>總和</b></td><td><code>=SUM(起始格:結束格)</code></td><td><code>=SUM(C2:C6)</code></td><td><b>18</b>（5 + 2 + 6 + 1 + 4 = 18）</td></tr>
    <tr><td><b>AVERAGE</b></td><td>計算範圍內數值的<b>算術平均數</b></td><td><code>=AVERAGE(起始格:結束格)</code></td><td><code>=AVERAGE(D2:D6)</code></td><td><b>78</b>（(85+70+90+65+80) ÷ 5 = 78）</td></tr>
    <tr><td><b>MAX / MIN</b></td><td>找出範圍內<b>最大值 / 最小值</b></td><td><code>=MAX(範圍)</code> / <code>=MIN(範圍)</code></td><td><code>=MAX(D2:D6)</code> / <code>=MIN(C2:C6)</code></td><td><b>90</b>（最高分）/ <b>1</b>（最少時數）</td></tr>
    <tr><td><b>IF</b></td><td><b>條件判斷</b>：成立回傳第2參數，不成立回傳第3參數</td><td><code>=IF(條件, 真值, 假值)</code></td><td><code>=IF(D3&gt;=60, "及格", "補考")</code></td><td><b>"及格"</b>（因 D3=70 符合 &gt;=60）</td></tr>
    <tr><td><b>COUNTIF</b></td><td><b>條件計數</b>：統計符合條件的儲存格個數</td><td><code>=COUNTIF(範圍, "條件")</code></td><td><code>=COUNTIF(B2:B6, "籃球社")</code><br><code>=COUNTIF(C2:C6, "&gt;=4")</code></td><td><b>3</b>（選籃球社共 3 人）<br><b>3</b>（運動 &gt;=4 小時有 5, 6, 4 共 3 人）</td></tr>
  </table>
  </div>
  <div class="flow-strip" aria-label="試算表資料處理標準流程">
    <span>1. 備份原始資料</span><i>➜</i><span>2. 清理髒資料（純數字化）</span><i>➜</i><span>3. 排序與篩選檢視</span><i>➜</i><span>4. 套用統計與 IF / COUNTIF 函式</span>
  </div>
</section>

<section class="study-sec">
  <h3>⚠️ 試算表資料處理與函式常見迷思</h3>
  <div class="myth-grid">
    <div class="myth"><div class="myth-q">❌ 「在儲存格輸入 <code>5小時</code> 跟輸入純數字 <code>5</code>，用 <code>SUM</code> 算出來一樣。」</div><div class="myth-a">✅ <b>單位不可寫進數值儲存格！</b><code>5小時</code> 含中文字會被視為「文字型態」，導致 <code>SUM</code> 與 <code>AVERAGE</code> 直接忽略該格而算錯；單位應標註在欄位標題。</div></div>
    <div class="myth"><div class="myth-q">❌ 「缺漏未填的空白格，跟填入數字 <code>0</code>，對 <code>AVERAGE</code> 平均值沒影響。」</div><div class="myth-a">✅ <b>影響極大！</b><code>AVERAGE</code> 會自動略過空白格（分母減 1）；若把缺漏格填 <code>0</code>，<code>0</code> 會被算進分母，嚴重拉低全班平均值。</div></div>
  </div>
</section>`;

  const lessonData3 = {
    title: "試算表資料處理、統計公式與條件判斷函式",
    overview: "本單元帶領學生認識真實資料科學中的「資料清理（Data Cleaning）」流程，辨識重複值、格式不一致、異常值與缺漏值，並上機操作試算表的排序、篩選、相對/絕對參照，以及 SUM、AVERAGE、MAX、MIN、IF、COUNTIF 等核心統計與條件判斷函式。",
    standards: ["資D-IV-3", "資T-IV-1", "運p-IV-3", "運t-IV-4"],
    objectives: [
      "能說明「垃圾進、垃圾出」的原則，並在試算表中辨識與清理重複值、格式不一致、異常值與缺漏值。",
      "能運用試算表的排序與篩選功能整理資料。",
      "能正確撰寫 SUM、AVERAGE、MAX、MIN 統計公式，並理解文字型態與空白格對平均值計算的影響。",
      "能運用 IF 條件判斷函式與 COUNTIF 條件計數函式完成自動化分級與人數統計。"
    ],
    prep: [
      "教師：簡報、含有髒資料案例的「校園生活問卷調查表」試算表練習檔。",
      "學生：每人一台電腦、試算表軟體、A4 列印版試算表清理與函式實作學習單。"
    ],
    flow: [
      { phase: "引起動機：失真的全班平均運動時間", min: 10, teacher: "展示一份未清理的問卷試算表（含 60分鐘 與 1小時 混填、999 極端值、文字單位），提問為何平均運動時間算出離譜數字，引出資料清理。", student: "觀察表格找出錯誤儲存格，理解 Garbage In, Garbage Out。" },
      { phase: "發展活動一：資料清理健檢與排序篩選", min: 30, teacher: "講解先備份分頁再清理的原則，示範修正四大髒資料（重複、格式、異常、缺值），並操作多欄排序與條件篩選。", student: "複製原始工作表備份，將含有單位文字的儲存格改為純數字並排除重複列。" },
      { phase: "發展活動二：統計函式與 IF / COUNTIF 實作", min: 40, teacher: "示範 `=SUM`、`=AVERAGE`、`=MAX`、`=MIN` 的範圍語法，接著講解 `=IF(條件, 真值, 假值)` 自動判定達標，以及 `=COUNTIF(範圍, 條件)` 統計人數。", student: "在試算表中撰寫公式，利用填滿控點複製公式，完成全班統計報表與學習單。" },
      { phase: "總結與分級評量", min: 10, teacher: "比較空白格與填 0 對 AVERAGE 的差異，並進行分級測驗檢核。", student: "完成線上分級測驗並檢視公式解析。" }
    ],
    differentiation: "補救教學：提供標明參數位置的公式填空提示卡（如 `=IF(C2>=3, \"達標\", \"____\")`）。加深加廣：練習使用絕對參照 `$` 固定門檻儲存格（如 `=IF(C2>=$G$1, \"達標\", \"未達標\")`）及巢狀 IF 判定等第。",
    assessmentFocus: "能否妥善清理髒資料並正確撰寫 SUM、AVERAGE、IF、COUNTIF 公式得出統計結果。",
    extension: "設計一份線上問卷表單，利用「下拉選單」與「數值回應驗證」從源頭防止髒資料產生。"
  };

  const worksheetData3 = {
    title: "資料海灣探險單（三）：試算表資料清理與統計函式實作",
    intro: "學生會收回了「九年級每週運動與閱讀調查表」，請先幫表格做資料清理健檢，再寫出正確的試算表統計與條件判斷函式！",
    sections: [
      {
        title: "一、暖身：資料清理四大問題診斷",
        items: [
          { type: "fill", q: "在動手修改原始資料前，第一步務必先「____」原始工作表。若輸入錯誤的髒資料，算出的統計結果也會錯誤，稱為「垃圾進、____出（Garbage In, Garbage Out）」。", answer: "備份、垃圾" },
          { type: "table", q: "請判斷下列「每日運動分鐘數」欄位的 4 筆問題資料屬於哪類髒資料（重複值 / 格式不一致 / 異常值 / 缺漏值）並寫出處理方式：\n(1) 5 號同學連續出現兩筆完全相同的提交紀錄\n(2) 8 號同學填寫 `45分鐘`（其他人皆填純數字 `45`）\n(3) 14 號同學填寫 `9999`\n(4) 21 號同學該欄空白未填", answer: "(1) 重複值：刪除重複列；(2) 格式不一致：改為純數字 45；(3) 異常值：查證修正或依規則排除；(4) 缺漏值：保持空白讓 AVERAGE 自動略過，不可亂填 0。" }
        ]
      },
      {
        title: "二、理解：統計公式與 IF / COUNTIF 函式撰寫",
        items: [
          { type: "table", q: "已知清理後的試算表範圍為第 2 列至第 31 列（共 30 人）：`B2:B31` 為「社團志願」、`C2:C31` 為「每週運動時數」、`D2:D31` 為「體適能分數」。請寫出對應公式：\n(1) 計算全班每週運動時數的「總和」\n(2) 計算全班體適能分數的「平均值」\n(3) 在 E2 判斷 C2 是否大於或等於 3，是顯示 `\"達標\"`，否則顯示 `\"未達標\"`\n(4) 統計 `B2:B31` 中選擇 `\"籃球社\"` 的人數", answer: "(1) `=SUM(C2:C31)`；(2) `=AVERAGE(D2:D31)`；(3) `=IF(C2>=3, \"達標\", \"未達標\")`；(4) `=COUNTIF(B2:B31, \"籃球社\")`。" }
        ]
      },
      {
        title: "三、應用與反思：空白格 vs. 0 與資料倫理",
        items: [
          { type: "short", q: "若有 4 位同學小考成績分別為 80, 90, 100，第 4 位同學請假。將第 4 位儲存格「保持空白」與「填入 0」，使用 `=AVERAGE(B2:B5)` 算出的平均各是多少？", answer: "保持空白時自動略過空白格，平均為 (80+90+100)÷3 = 90 分；填入 0 時分母為 4，平均變成 (80+90+100+0)÷4 = 67.5 分。" },
          { type: "reflect", q: "在整理問卷時，如果發現有幾筆真實且合理的數據跟你想證明的結論相反，可以把這幾筆當成「異常值」刪掉嗎？為什麼？", answer: "絕對不可以！故意刪除不利於預設結論的真實合理數據屬於竄改資料，嚴重違反資料誠信與學術倫理。" }
        ]
      }
    ]
  };

  const printData3 = {
    situation: "【A4 試算表資料處理實作任務】健康中心委託你整理九年級的「睡眠時數與體適能測驗」試算表。請先排除原始表格中的髒資料，接著設計 SUM、AVERAGE、MAX、MIN、IF 與 COUNTIF 公式，建立能自動標示「睡眠充足」並統計達標人數的智慧報表！",
    thinking: [
      "為什麼在試算表的數值儲存格中輸入 `7hr` 會害 `SUM` 和 `AVERAGE` 算錯？單位應該寫在哪裡才正確？",
      "請說明 `=IF(C2>=7, \"充足\", \"不足\")` 與 `=COUNTIF(C2:C31, \">=7\")` 這兩個函式在功能與回傳結果上的差別。",
      "當我們將 E2 的公式往下拖曳複製到 E31 時，若希望固定參照 G1 儲存格的及格標準而不隨列號改變，應該如何寫 G1 的參照位址？"
    ],
    flowchart: "請畫出「試算表問卷資料清理與統計分析」標準流程圖：匯入原始資料 ➜ 複製工作表備份 ➜ 清理四大髒資料（刪重複、去單位純數字化、處理異常與缺值）➜ 撰寫統計與條件函式（SUM / AVERAGE / IF / COUNTIF）➜ 驗證結果。",
    rubric: [
      { c: "資料清理完整性", a: "能先備份工作表，並完整修正所有重複值、格式單位混用、異常值與缺漏值", b: "能找出並修正多數髒資料，僅少數格式細節遺漏", t: "未進行資料清理直接套用公式導致結果錯誤" },
      { c: "統計與條件函式正確性", a: "SUM、AVERAGE、MAX/MIN、IF、COUNTIF 語法與儲存格範圍完全正確，且能活用相對/絕對參照", b: "基本統計與 IF 公式正確，僅 COUNTIF 條件引號語法微偏", t: "公式缺少等號或範圍錯誤無法運算" },
      { c: "資料誠信與數值詮釋", a: "能正確區分空白格與 0 的差異，並恪守資料誠信原則不任意捏造或刪改真實數據", b: "能正確解讀統計數據意義", t: "隨意將缺漏值填 0 或刪改合理數據" }
    ]
  };

  const data3EasyQuestions = [
    mkQ(
      "data3-e1",
      "記憶",
      "在試算表軟體（如 Excel 或 Google 試算表）中，輸入任何計算公式或函式時，第一個字元必須以什麼符號開頭？",
      ["井字號 `#`", "等號 `=`", "錢字號 `$`", "問號 `?`"],
      1,
      "試算表中所有公式與函式一律必須以等號 `=` 開頭（例如 `=SUM(A1:A10)`），否則會被當成普通文字。"
    ),
    mkQ(
      "data3-e2",
      "記憶",
      "若想在試算表中計算 `B2` 到 `B30` 連續儲存格範圍內所有數值的「算術平均數」，應該使用下列哪一個函式？",
      ["`=SUM(B2:B30)`", "`=AVERAGE(B2:B30)`", "`=MAX(B2:B30)`", "`=COUNTIF(B2:B30)`"],
      1,
      "`AVERAGE` 用於計算算術平均數；`SUM` 為計算總和，`MAX` 為找出最大值。"
    ),
    mkQ(
      "data3-e3",
      "理解",
      "在進行統計分析前，先將原始資料中「重複提交、格式單位不一致、明顯異常錯值或漏填」進行檢查與修正的過程，稱為什麼？",
      ["資料清理（Data Cleaning）", "資料取樣（Data Sampling）", "資料壓縮（Data Compression）", "資料加密（Data Encryption）"],
      0,
      "排除原始資料中的髒資料（重複、格式不一、異常、缺值）以確保分析品質的過程稱為「資料清理（Data Cleaning）」。"
    )
  ];

  const data3MediumQuestions = [
    mkQ(
      "data3-m1",
      "理解",
      "小凱在試算表 `A2` 到 `A5` 四個儲存格依序輸入運動時間：`30`、`40分鐘`、`50`、`60`。當他輸入公式 `=SUM(A2:A5)` 時，結果只算出 `140` 而非 `180`，原因為何？",
      ["因為 `SUM` 最多只能加總 3 個儲存格", "因為 `40分鐘` 包含了中文字，被試算表判定為「文字型態」而非數值，在加總時被忽略了", "因為 40 是偶數不能加總", "因為沒有使用 `AVERAGE`"],
      1,
      "在數值儲存格中混入單位文字（如 `40分鐘`）會使該格變成「文字型態」，導致 `SUM` 與 `AVERAGE` 直接略過該格；單位應寫在欄位標題。"
    ),
    mkQ(
      "data3-m2",
      "應用",
      "已知試算表 `D2` 儲存格存放某位同學的體適能成績 `75`。若在 `E2` 輸入條件判斷公式 `=IF(D2>=60, \"及格\", \"補考\")`，請問 `E2` 會顯示什麼結果？",
      ["`75`", "`及格`", "`補考`", "`TRUE`"],
      1,
      "`IF(條件, 成立回傳值, 不成立回傳值)` 中，因為 `D2` 為 75，符合 `>=60` 的條件（True），所以會回傳第 2 個參數 `\"及格\"`。"
    ),
    mkQ(
      "data3-m3",
      "應用",
      "全班 30 位同學的社團志願記錄在 `B2:B31` 儲存格範圍。若想自動統計全班選擇「熱舞社」的共有幾人，應該使用下列哪一個公式？",
      ["`=SUM(B2:B31, \"熱舞社\")`", "`=COUNTIF(B2:B31, \"熱舞社\")`", "`=IF(B2:B31=\"熱舞社\", 1, 0)`", "`=MAX(B2:B31)`"],
      1,
      "`COUNTIF(範圍, 條件)` 專門用來計算指定範圍內符合特定條件（如 `\"熱舞社\"`）的儲存格個數。"
    ),
    mkQ(
      "data3-m4",
      "理解",
      "若想在全校 500 筆學生資料中，暫時只顯示「九年二班」且「睡眠時數小於 6 小時」的學生列，同時保留所有其他學生的資料不被刪除，應該使用試算表的哪一項功能？",
      ["篩選（Filter）", "刪除重複項", "合併儲存格", "取代（Replace）"],
      0,
      "「篩選（Filter）」可依據設定的條件僅顯示符合條件的資料列，並將不符合的列暫時隱藏而非刪除。"
    )
  ];

  const data3HardQuestions = [
    mkQ(
      "data3-h1",
      "應用",
      "已知試算表 `C2:C6` 五個儲存格的數值依序為 `3, 7, 5, 9, 6`。若在 `C7` 輸入 `=COUNTIF(C2:C6, \">=6\")`、在 `C8` 輸入 `=AVERAGE(C2:C6)`，請問 `C7` 與 `C8` 的計算結果分別為何？",
      ["`C7` 為 `2`、`C8` 為 `6`", "`C7` 為 `3`、`C8` 為 `6`", "`C7` 為 `3`、`C8` 為 `30`", "`C7` 為 `22`、`C8` 為 `5`"],
      1,
      "`C2:C6` 中大於或等於 6 的數值有 `7, 9, 6` 共 3 個，故 `C7 = 3`；平均值為 `(3 + 7 + 5 + 9 + 6) ÷ 5 = 30 ÷ 5 = 6`，故 `C8 = 6`。"
    ),
    mkQ(
      "data3-h2",
      "分析",
      "有 5 位學生參加測驗，前 4 位分數皆為 `80` 分，第 5 位學生因公假未考。若老師將第 5 位的儲存格分別「保持空白」與「填入 0」，則使用 `=AVERAGE(B2:B6)` 算出的平均分數分別為何？",
      ["兩種作法算出來都是 80 分", "保持空白算出 80 分（自動略過空白格，以 4 人計算）；填入 0 則算出 64 分（0 被納入分母，以 5 人計算）", "保持空白算出 64 分；填入 0 算出 80 分", "保持空白會顯示語法錯誤"],
      1,
      "`AVERAGE` 函式會自動忽略空白儲存格（320 ÷ 4 = 80）；但若填入數值 `0`，則 `0` 會參與平均運算（320 ÷ 5 = 64），因此缺漏值絕不可隨意補 0。"
    ),
    mkQ(
      "data3-h3",
      "應用",
      "小妍在 `D2` 儲存格輸入巢狀條件判斷公式：`=IF(C2>=90, \"優等\", IF(C2>=60, \"及格\", \"待加強\"))`。當 `C2` 儲存格的分數為 `78` 時，請問 `D2` 會顯示什麼？",
      ["優等", "及格", "待加強", "FALSE"],
      1,
      "先檢查外層條件 `C2>=90`（78>=90 為 False），進入第 3 參數的內層 `IF(C2>=60, \"及格\", \"待加強\")`；因 `78>=60` 為 True，故回傳 `\"及格\"`。"
    ),
    mkQ(
      "data3-h4",
      "應用",
      "在試算表中，`C2` 為第 1 位學生的得分，而全班統一的加分倍率存放在固定的 `G1` 儲存格。若小安在 `D2` 輸入公式後，想直接往下拖曳填滿控點複製到 `D3:D30`，且每一列都要固定乘以 `G1` 的數值，請問 `D2` 的公式應該怎麼寫？",
      ["`=C2 * G1`", "`=C2 * $G$1`", "`=$C$2 * G1`", "`=SUM(C2:G1)`"],
      1,
      "向下拖曳時，學生得分 `C2` 需隨列號變為 `C3, C4...`（相對參照），而固定不變的 `G1` 必須加上錢字號寫成 `$G$1`（絕對參照）鎖定列與欄。"
    ),
    mkQ(
      "data3-h5",
      "分析",
      "在清理全校「國中生身高（單位：公分）」調查資料時，發現有一筆紀錄為 `1650`。下列哪一種資料處理方式最符合資料科學與誠信原則？",
      ["直接保留 `1650` 不處理，讓全校平均身高大幅提高", "判斷這是明顯違反事實的異常值（可能漏打小數點或多打 0），向原紀錄查證修正為 `165.0`，若無法查證則依明確規則排除並在報告中註明", "為了省事，把全校所有人的身高都改成 `165`", "把所有身高低於 `160` 公分的正常紀錄也一起刪掉"],
      1,
      "`1650` 公分明顯屬於輸入錯誤的異常值（Outlier），應先查證原始問卷修正，若無法查證則依客觀標準排除並誠實記錄處理方式。"
    )
  ];

  const quizData3 = {
    passScore: 60,
    easy: data3EasyQuestions,
    medium: data3MediumQuestions,
    hard: data3HardQuestions,
    levels: {
      easy: lv("入門探險家", "🧭", null, "認識試算表公式開頭符號、AVERAGE 基礎函式與資料清理定義。", data3EasyQuestions),
      medium: lv("進階挑戰者", "🧰", "silver", "掌握數值/文字型態排錯、IF 條件判斷、COUNTIF 計數與資料篩選。", data3MediumQuestions),
      hard: lv("大師領航員", "👑", "gold", "精熟多函式綜合追蹤、空白格與 0 差異、巢狀 IF、絕對參照 $ 與異常值處理。", data3HardQuestions)
    }
  };

  const unitData3 = {
    id: "data-3",
    unit: "試算表資料處理、統計公式與條件判斷函式",
    study: { title: "試算表資料處理、統計公式與條件判斷函式", html: studyData3 },
    learningContent: { title: "試算表資料處理、統計公式與條件判斷函式", html: studyData3 },
    lesson: lessonData3,
    worksheet: worksheetData3,
    print: printData3,
    lessonPlan: { lesson: lessonData3, worksheet: worksheetData3, print: printData3 },
    quiz: quizData3
  };

  /* ============================================================================
   * 單元四：data-4（資料視覺化圖表選擇與數據趨勢分析）
   * ============================================================================ */
  const studyData4 = `
<section class="study-sec">
  <h3>📈 四大統計圖表選擇指南與「誤導性圖表」剖析圖解</h3>
  <p class="study-lead">將整理好的數據轉化為圖表稱為<b>資料視覺化（Data Visualization）</b>。唯有依照「資料特性與分析目的」選對圖表，並保持座標軸與視覺比例誠實，才能準確解讀數據趨勢、不被誤導性圖表欺騙！</p>
  <div class="hw-diagram" role="img" aria-label="四大統計圖表與誤導性圖表比較：左側展示長條圖、折線圖、圓餅圖、散布圖；右側對比截斷Y軸造成的視覺誇大誤導">
    <svg viewBox="0 0 640 240" xmlns="http://www.w3.org/2000/svg">
      <rect x="4" y="4" width="632" height="232" rx="20" fill="#10375f" stroke="#7fb8e6" stroke-width="3"/>
      <text x="175" y="30" text-anchor="middle" fill="#ffd166" font-size="14" font-weight="800">📊 四大核心圖表快速選用指南</text>
      <g transform="translate(20,42)" font-size="11" font-weight="700">
        <rect x="0" y="0" width="145" height="82" rx="10" fill="#0b2545" stroke="#4fb3ff" stroke-width="2"/>
        <rect x="18" y="42" width="14" height="28" fill="#4fb3ff"/><rect x="40" y="20" width="14" height="50" fill="#ffd166"/><rect x="62" y="32" width="14" height="38" fill="#7be0b0"/>
        <text x="108" y="36" text-anchor="middle" fill="#fff">長條圖</text><text x="108" y="56" text-anchor="middle" fill="#cfe8ff" font-size="10">比較類別數量</text>

        <rect x="158" y="0" width="145" height="82" rx="10" fill="#0b2545" stroke="#4fb3ff" stroke-width="2"/>
        <polyline points="172,62 192,40 212,48 232,22" fill="none" stroke="#ff8a65" stroke-width="3"/>
        <circle cx="172" cy="62" r="3" fill="#ffd166"/><circle cx="192" cy="40" r="3" fill="#ffd166"/><circle cx="212" cy="48" r="3" fill="#ffd166"/><circle cx="232" cy="22" r="3" fill="#ffd166"/>
        <text x="268" y="36" text-anchor="middle" fill="#fff">折線圖</text><text x="268" y="56" text-anchor="middle" fill="#cfe8ff" font-size="10">時間變化趨勢</text>

        <rect x="0" y="94" width="145" height="82" rx="10" fill="#0b2545" stroke="#4fb3ff" stroke-width="2"/>
        <circle cx="44" cy="135" r="24" fill="#4fb3ff"/><path d="M44 135 L44 111 A24 24 0 0 1 68 135 Z" fill="#ffd166"/><path d="M44 135 L68 135 A24 24 0 0 1 30 155 Z" fill="#ff8a65"/>
        <text x="108" y="130" text-anchor="middle" fill="#fff">圓餅圖</text><text x="108" y="150" text-anchor="middle" fill="#cfe8ff" font-size="10">占整體100%比例</text>

        <rect x="158" y="94" width="145" height="82" rx="10" fill="#0b2545" stroke="#4fb3ff" stroke-width="2"/>
        <circle cx="176" cy="158" r="3.5" fill="#7be0b0"/><circle cx="190" cy="146" r="3.5" fill="#7be0b0"/><circle cx="205" cy="138" r="3.5" fill="#7be0b0"/><circle cx="220" cy="122" r="3.5" fill="#7be0b0"/><circle cx="234" cy="114" r="3.5" fill="#7be0b0"/>
        <text x="268" y="130" text-anchor="middle" fill="#fff">散布圖</text><text x="268" y="150" text-anchor="middle" fill="#cfe8ff" font-size="10">兩數值變數關係</text>
      </g>

      <text x="480" y="30" text-anchor="middle" fill="#ff8a65" font-size="14" font-weight="800">⚠️ 識破誤導性圖表：截斷縱軸 (Y 軸)</text>
      <g transform="translate(345,42)" font-size="11" font-weight="700">
        <rect x="0" y="0" width="130" height="176" rx="10" fill="#3b1219" stroke="#ff8a65" stroke-width="2"/>
        <text x="65" y="20" text-anchor="middle" fill="#fecdd3">❌ 誤導：Y軸從 90 起跳</text>
        <line x1="28" y1="35" x2="28" y2="135" stroke="#fff" stroke-width="2"/><line x1="28" y1="135" x2="115" y2="135" stroke="#fff" stroke-width="2"/>
        <text x="16" y="135" fill="#fecdd3" font-size="9">90</text><text x="16" y="42" fill="#fecdd3" font-size="9">94</text>
        <rect x="42" y="110" width="24" height="25" fill="#94a3b8"/><text x="54" y="104" text-anchor="middle" fill="#fff" font-size="10">A:91</text>
        <rect x="78" y="55" width="24" height="80" fill="#ff8a65"/><text x="90" y="49" text-anchor="middle" fill="#ffd166" font-size="10">B:93</text>
        <text x="65" y="160" text-anchor="middle" fill="#fecdd3" font-size="10">差 2 分卻像高出 3 倍！</text>

        <rect x="142" y="0" width="130" height="176" rx="10" fill="#06372a" stroke="#7be0b0" stroke-width="2"/>
        <text x="207" y="20" text-anchor="middle" fill="#a7f3d0">✅ 誠實：Y軸從 0 起跳</text>
        <line x1="170" y1="35" x2="170" y2="135" stroke="#fff" stroke-width="2"/><line x1="170" y1="135" x2="257" y2="135" stroke="#fff" stroke-width="2"/>
        <text x="160" y="135" fill="#a7f3d0" font-size="9">0</text><text x="155" y="42" fill="#a7f3d0" font-size="9">100</text>
        <rect x="184" y="46" width="24" height="89" fill="#94a3b8"/><text x="196" y="41" text-anchor="middle" fill="#fff" font-size="10">A:91</text>
        <rect x="220" y="44" width="24" height="91" fill="#7be0b0"/><text x="232" y="39" text-anchor="middle" fill="#ffd166" font-size="10">B:93</text>
        <text x="207" y="160" text-anchor="middle" fill="#a7f3d0" font-size="10">真實呈現微小差距</text>
      </g>
    </svg>
  </div>
  <ul class="study-list">
    <li><b>圖表必備要素</b>：一張完整的統計圖表必須包含<b>圖表標題</b>、<b>橫軸與縱軸名稱及單位</b>、<b>圖例（Legend）</b>以及<b>資料來源</b>。</li>
    <li><b>數據趨勢與相關性</b>：在散布圖中，當 X 增加時 Y 也跟著增加稱為<b>正相關</b>（如複習時間 vs. 測驗成績）；當 X 增加時 Y 反而減少稱為<b>負相關</b>；若無規律則為<b>無相關</b>。</li>
    <li><b>相關不等於因果（Correlation ≠ Causation）</b>：兩組數據同時上升或下降，常是受到第三個「共同潛在因素（如季節氣溫）」影響，不能直接斷言誰導致了誰。</li>
  </ul>
</section>

<section class="study-sec">
  <h3>📊 四大圖表類型選擇與常見誤導手法對照表</h3>
  <div class="study-table-wrap">
  <table class="study-table">
    <tr><th>圖表類型</th><th>核心分析目的</th><th>生活應用案例</th><th>繪製守則與常見誤導陷阱</th></tr>
    <tr><td>📊 <b>長條圖 / 直條圖</b><br>(Bar / Column Chart)</td><td>比較<b>不同類別項目</b>之間的數量大小高低</td><td>各社團報名人數比較、複選題各選項勾選率比較</td><td>• 數量軸（Y 軸）<b>必須從 0 開始</b><br>• 陷阱：<b>截斷 Y 軸</b>會把微小差距誇大數倍</td></tr>
    <tr><td>📈 <b>折線圖</b><br>(Line Chart)</td><td>呈現資料隨<b>時間連續變化</b>的上升、下降或週期趨勢</td><td>1~12 月平均氣溫變化、近十年再生能源發電量趨勢</td><td>• 橫軸（X 軸）時間間隔必須等距且依序排列<br>• 陷阱：跳過特定年份或不等距刻度會扭曲斜率趨勢</td></tr>
    <tr><td>🥧 <b>圓餅圖</b><br>(Pie Chart)</td><td>呈現單一整體中<b>各部分所占的比例（結構占比）</b></td><td>家庭每月總支出各項占比（飲食、房租、交通、儲蓄）</td><td>• 所有扇形總和<b>必須剛好等於 100%</b><br>• 陷阱：<b>不可用於複選題</b>；避免用 3D 傾斜角度扭曲視覺面積</td></tr>
    <tr><td>🟢 <b>散布圖</b><br>(Scatter Plot)</td><td>觀察<b>兩個數值變數（X 與 Y）</b>之間的相關性與分布</td><td>每日運動時數 vs. 體適能分數、身高 vs. 體重</td><td>• 橫軸與縱軸皆為連續數值變數<br>• 陷阱：將<b>正相關誤認為因果關係</b></td></tr>
  </table>
  </div>
  <div class="flow-strip" aria-label="資料視覺化與趨勢分析三部曲">
    <span>1. 確認分析目的（比較/趨勢/占比/相關）</span><i>➜</i><span>2. 選對圖表並檢查座標軸起點與單位</span><i>➜</i><span>3. 解讀趨勢並提出具體行動建議</span>
  </div>
</section>

<section class="study-sec">
  <h3>⚠️ 資料視覺化與趨勢解讀常見迷思</h3>
  <div class="myth-grid">
    <div class="myth"><div class="myth-q">❌ 「只要數據後面有百分比（%），就一定可以畫成圓餅圖！」</div><div class="myth-a">✅ <b>複選題百分比不能畫圓餅圖！</b>例如「常使用的交通工具（可複選）」算出公車 60%、捷運 55%、步行 40%，總和超過 100%，必須改用<b>長條圖</b>比較。</div></div>
    <div class="myth"><div class="myth-q">❌ 「散布圖顯示夏天冷氣耗電量與溺水人數呈正相關，證明吹冷氣會害人溺水！」</div><div class="myth-a">✅ <b>這是典型的『相關誤當因果』謬誤！</b>兩者同時增加是因為背後的共同原因「夏季炎熱高溫」，彼此並無直接因果關係。</div></div>
  </div>
</section>`;

  const lessonData4 = {
    title: "資料視覺化圖表選擇與數據趨勢分析",
    overview: "本單元帶領學生依資料特性與溝通目的，正確選用長條圖、折線圖、圓餅圖與散布圖進行資料視覺化；同時訓練學生識破截斷座標軸、複選題誤用圓餅圖、3D 比例失真及「相關誤當因果」等誤導性圖表手法，完成具數據證據力的趨勢分析報告。",
    standards: ["資D-IV-3", "資T-IV-1", "運p-IV-1", "運t-IV-4"],
    objectives: [
      "能依分析目的（比較類別、時間趨勢、部分占整體比例、兩變數關係）選擇最合適的統計圖表。",
      "能在試算表中繪製包含完整標題、座標軸標籤、單位與圖例的統計圖表。",
      "能辨識截斷縱軸（Y 軸未從 0 開始）、不等距時間軸、複選題圓餅圖等誤導性圖表手法。",
      "能正確解讀折線圖趨勢與散布圖相關性（正相關、負相關），並區分「相關性」與「因果關係」。"
    ],
    prep: [
      "教師：簡報、四大圖表配對情境卡、新聞與廣告中的誤導性圖表實例、開放資料集（CSV）。",
      "學生：每人一台電腦、試算表軟體、A4 列印版圖表選擇與趨勢分析學習單。"
    ],
    flow: [
      { phase: "引起動機：5 秒看懂數據趨勢", min: 10, teacher: "同時展示「密密麻麻的 12 個月氣溫數字表」與「折線圖」，計時 5 秒請學生找出最高溫月份與溫差趨勢，體會視覺化的優勢。", student: "對比純文字表格與統計圖表的閱讀效率。" },
      { phase: "發展活動一：四大圖表選擇法則與趨勢判讀", min: 30, teacher: "講解長條圖（類別比較）、折線圖（時間趨勢）、圓餅圖（100% 占比，禁用於複選題）與散布圖（兩數值變數正/負相關）的挑選準則。", student: "完成學習單上的調查主題與圖表類型配對，並練習判讀散布圖相關方向。" },
      { phase: "發展活動二：圖表糾察隊——破解誤導性圖表与因果謬誤", min: 40, teacher: "展示截斷 Y 軸的廣告長條圖與「吃巧克力得諾貝爾獎」散布圖案例，引導學生找出破綻，並在試算表中親手繪製誠實圖表與一頁式趨勢分析。", student: "在試算表中修正截斷的座標軸，補齊圖表標題與單位，撰寫數據發現與行動建議。" },
      { phase: "總結與分級評量", min: 10, teacher: "統整資料海灣四個單元的完整資料科學脈絡，進行分級測驗檢核。", student: "完成線上分級測驗並訂正。" }
    ],
    differentiation: "補救教學：提供「圖表挑選決策樹」提示卡（先問：有時間順序嗎？是占全部的100%比例嗎？是兩個數字看關係嗎？）。加深加廣：利用政府資料開放平臺（data.gov.tw）下載真實氣候或交通資料集，繪製組合圖表進行交叉趨勢分析。",
    assessmentFocus: "能否依資料特性選出正確圖表、指出誤導性圖表的破綻，並正確解讀數據趨勢與相關性。",
    extension: "蒐集一則新聞報導中的統計圖表，檢核其座標軸起點、刻度間距與推論是否符合資料誠信。"
  };

  const worksheetData4 = {
    title: "資料海灣探險單（四）：圖表選擇與數據趨勢分析實作",
    intro: "好的圖表能讓數據開口說真話，但設計不良的圖表卻會誤導大眾！請運用四大圖表挑選法則與批判性思維，完成底下的視覺化挑戰。",
    sections: [
      {
        title: "一、暖身：圖表要素與類型配對",
        items: [
          { type: "fill", q: "一張清楚誠實的統計圖表，除了圖形本身外，必須標明圖表「____」、橫軸與縱軸的名稱及「____」（如：人、元、°C），而長條圖的數量縱軸（Y 軸）原則上應從「____」開始。", answer: "標題、單位、0" },
          { type: "table", q: "請為下列 4 個分析主題填入最適合的圖表名稱（長條圖 / 折線圖 / 圓餅圖 / 散布圖）：\n(1) 台北市 1 月至 12 月各月平均降雨量的連續變化趨勢\n(2) 九年級各班在資源回收競賽中的回收重量高低比較\n(3) 班費總支出中，班服、聚餐、文具、儲蓄四項各占總支出的百分比（總和 100%）\n(4) 全班 30 位學生「每日運動分鐘數」與「體適能成績」兩個數值變數的關聯", answer: "(1) 折線圖；(2) 長條圖（或直條圖）；(3) 圓餅圖；(4) 散布圖。" }
        ]
      },
      {
        title: "二、理解：破解誤導性圖表",
        items: [
          { type: "short", q: "某球鞋廣告畫了一張長條圖比較彈跳高度，A 鞋為 51 公分、B 鞋為 53 公分，但圖中 B 鞋的柱子長度看起來卻是 A 鞋的 3 倍高！請問廣告商在座標軸動了什麼手腳？該如何修正？", answer: "廣告商將縱軸（Y 軸）起點「截斷」從 50 公分開始畫，誇大了僅 2 公分的差距；應將 Y 軸起點改回從 0 開始。" },
          { type: "short", q: "問卷調查「你平常使用哪些社群軟體？（可複選）」，統計結果為：LINE 90%、IG 85%、YouTube 95%。為什麼這組數據「不能」畫成圓餅圖？應該改用哪一種圖表？", answer: "因為複選題各選項百分比加總超過 100%（270%），不符合圓餅圖部分占整體總和須為 100% 的原則；應改用「長條圖」比較各選項勾選率。" }
        ]
      },
      {
        title: "三、應用與反思：數據趨勢與相關/因果辨析",
        items: [
          { type: "draw", q: "請根據「某校近五年視力不良率折線圖（2022年至2026年依序為 42%, 48%, 55%, 61%, 68%）」加上「每日平均螢幕使用時數（依序為 1.5hr, 2.2hr, 3.0hr, 3.8hr, 4.5hr）」，描述你觀察到的數據趨勢，並為學務處提出 1 項具體改善建議。", answer: "趨勢發現：近五年學生每日螢幕使用時數逐年上升，同時視力不良率也從 42% 持續攀升至 68%（呈正相關趨勢）。建議：推動下課走出教室遠眺與用眼 30 分鐘休息 10 分鐘計畫。" },
          { type: "reflect", q: "統計發現「各縣市消防車出動次數越多，火災財物損失金額也越高」（正相關），有人因此建議「少派消防車就能減少火災損失」。請用「相關性 vs. 因果關係」說明這個推論錯在哪裡？", answer: "犯了將「相關性」當成「因果關係」的錯誤！兩者同時升高是因為背後的共同原因「火勢規模大小」（火勢越大才派越多消防車，損失也越大），並非消防車導致損失。" }
        ]
      }
    ]
  };

  const printData4 = {
    situation: "【A4 圖表選擇與趨勢分析實作任務】校園永續發展委員會正在檢視「過去一年各月份校園用電量」、「各大樓耗電占比」以及「冷氣設定溫度與耗電量關係」三份數據，同時收到廠商提供的一張節能廣告圖表。請你選出最合適的圖表類型，並揪出廠商圖表中的誤導陷阱！",
    thinking: [
      "請分別說明「長條圖」、「折線圖」、「圓餅圖」與「散布圖」各自最擅長回答哪一種數據問題？",
      "當你在新聞或廣告上看到一張長條圖或折線圖，起伏看起來非常劇烈驚人時，你應該先檢查座標軸的哪兩個地方？",
      "在散布圖中觀察到 X 與 Y 呈現明顯的「正相關」，為什麼不能立刻下結論說「X 導致了 Y 發生」？請舉一個生活例子說明。"
    ],
    flowchart: "請畫出「資料視覺化與圖表誠信檢核」決策流程圖：確認資料型態與分析目的 ➜ 選擇圖表（比較類別選長條圖 / 時間趨勢選折線圖 / 100%占比選圓餅圖 / 兩數值關係選散布圖）➜ 誠實檢核（Y軸從0開始、時間等距、複選不用圓餅圖、標註標題與單位）➜ 解讀趨勢並區分相關與因果。",
    rubric: [
      { c: "圖表類型選擇正確性", a: "能精準依據資料特性與分析目的選出最合適的圖表，並清楚說明選用理由與複選題限制", b: "能正確配對四大基本圖表與常見情境", t: "圖表類型與資料特性不符（如將複選題畫成圓餅圖）" },
      { c: "誤導性圖表識讀能力", a: "能敏銳揪出截斷 Y 軸、不等距刻度、3D 視覺扭曲等手法，並說明正確修正方式", b: "能看出截斷座標軸造成的視覺誇大現象", t: "無法辨識圖表座標軸異常" },
      { c: "趨勢分析與相關/因果推論", a: "能結合圖表具體數值描述趨勢與正/負相關，並嚴格區分相關性與因果關係提出合理建議", b: "能讀出圖表高低趨勢並提出基本看法", t: "將相關性直接誤判為因果關係或僅抄寫數字" }
    ]
  };

  const data4EasyQuestions = [
    mkQ(
      "data4-e1",
      "記憶",
      "若想呈現台灣「過去 20 年來每年平均氣溫隨時間連續變化的上升或下降趨勢」，選擇下列哪一種統計圖表最合適？",
      ["圓餅圖（Pie Chart）", "折線圖（Line Chart）", "散布圖（Scatter Plot）", "組織圖"],
      1,
      "折線圖（Line Chart）以橫軸表示連續時間，最擅長呈現數據隨時間變化的上升、下降或週期波動趨勢。"
    ),
    mkQ(
      "data4-e2",
      "記憶",
      "小安想用圖表呈現自己每月零用錢花在「買書（25%）、飲食（40%）、文具（15%）、儲蓄（20%）」各占總零用錢的比例（總和剛好 100%）。最適合使用哪一種圖表？",
      ["圓餅圖（Pie Chart）", "散布圖（Scatter Plot）", "折線圖（Line Chart）", "流程圖"],
      0,
      "圓餅圖（Pie Chart）最適合用來呈現單一整體（100%）中，各組成部分所占的比例結構。"
    ),
    mkQ(
      "data4-e3",
      "記憶",
      "想直觀比較九年級五個班級在校慶園遊會「各班攤位募款金額的高低差異」，最適合使用下列哪一種圖表？",
      ["長條圖 / 直條圖（Bar / Column Chart）", "圓餅圖（超過 30 個扇形）", "散布圖", "心智圖"],
      0,
      "長條圖或直條圖以柱子長度代表數值大小，最能清楚比較不同類別項目之間的數量高低。"
    )
  ];

  const data4MediumQuestions = [
    mkQ(
      "data4-m1",
      "應用",
      "健康中心想探討全校學生「每日睡眠時數（X）」與「注意力測驗分數（Y）」這兩個連續數值變數之間是否存在關聯（如正相關或負相關），最適合繪製成哪一種圖表？",
      ["圓餅圖", "散布圖（XY Scatter Plot）", "長條圖", "甘特圖"],
      1,
      "散布圖（Scatter Plot）以橫軸（X）與縱軸（Y）分別對應兩個數值變數，能直觀看出資料點的分布趨勢與相關性。"
    ),
    mkQ(
      "data4-m2",
      "理解",
      "在繪製或閱讀「長條圖」時，下列哪一種作法最容易造成視覺誤導，讓微小的數量差距（例如 A 牌 91 分、B 牌 93 分）看起來像相差了好幾倍？",
      ["在圖表上方加上清楚的標題", "將縱軸（Y 軸）起點不從 0 開始，而是「截斷座標軸」直接從 90 開始畫", "在座標軸旁邊標註分數單位", "使用不同顏色區分長條"],
      1,
      "長條圖依賴柱子的視覺長度比例來比較大小；若縱軸未從 0 開始（截斷 Y 軸），會嚴重破壞長度比例，誇大微小差距。"
    ),
    mkQ(
      "data4-m3",
      "應用",
      "學生會進行「你平常最常使用的休閒場所？（可複選，最多選 3 項）」調查，結果為：操場 70%、圖書館 45%、籃球場 60%、交誼廳 30%。關於這份資料的圖表呈現，下列何者正確？",
      ["因為百分比加起來超過 100%，代表計算公式一定寫錯了", "複選題各選項百分比總和超過 100% 是正常的，應使用「長條圖」比較各場所勾選率，絕不可畫成圓餅圖", "一定要畫成圓餅圖才能看出比例", "應該畫成散布圖"],
      1,
      "圓餅圖要求所有部分加總必須剛好等於單一整體的 100%；複選題各選項獨立計數，總和超過 100%，必須使用長條圖比較。"
    ),
    mkQ(
      "data4-m4",
      "理解",
      "觀察全班「每日滑手機娛樂時數（X 軸）」與「定期考查總成績（Y 軸）」的散布圖時，發現資料點呈現「由左上往右下傾斜（當 X 越大，Y 反而越小）」的趨勢。這代表兩變數之間呈現什麼關係？",
      ["正相關", "負相關", "完全無相關", "恆等關係"],
      1,
      "當一個變數（X）數值增加，另一個變數（Y）數值呈現減少趨勢（圖形由左上往右下分布），稱為「負相關」。"
    )
  ];

  const data4HardQuestions = [
    mkQ(
      "data4-h1",
      "分析",
      "某研究統計發現「夏天冰淇淋銷售量」與「海邊溺水人數」在散布圖上呈現高度正相關，於是新聞標題寫道：「吃冰淇淋會導致溺水風險大增！」請問這則推論犯了資料分析上的什麼重大謬誤？",
      ["將「相關性（Correlation）」直接誤當成「因果關係（Causation）」，忽略了背後共同的潛在因素（夏天炎熱高溫）", "沒有把散布圖改畫成圓餅圖", "忘記將數據轉成二進位", "沒有先將資料進行失真壓縮"],
      0,
      "兩變數呈正相關不代表其中一個直接導致另一個（Correlation ≠ Causation）；夏天炎熱同時促使人們買冰淇淋與去海邊戲水，氣溫才是背後的共同潛在變數。"
    ),
    mkQ(
      "data4-h2",
      "分析",
      "某企業在呈現「2018、2019、2020、2025、2026 年」營收折線圖時，在橫軸上將這五個年份以「完全相等的間距」排列（直接跳過了虧損嚴重的 2021~2024 年），讓折線看起來一路平穩上升。這違反了折線圖的哪一項誠信原則？",
      ["折線圖的橫軸時間刻度必須保持連續且等距，任意跳過中間年份或改變時間間距會扭曲斜率，誤導讀者對趨勢的判斷", "折線圖不能標示年份", "折線圖的線條不能用藍色", "營收數據不能使用十進位"],
      0,
      "折線圖藉由線段斜率反映隨時間變化的速率；若橫軸時間間隔不一致或故意隱瞞特定年份，會造成假性平穩上升的視覺誤導。"
    ),
    mkQ(
      "data4-h3",
      "分析",
      "某簡報使用「3D 立體傾斜圓餅圖」展示各品牌市占率，將自家僅占 18% 的扇形放在圖表最前方並拉厚立體邊緣，使其在畫面上的視覺面積看起來比放在後方占 24% 的競爭對手還要大。下列評論何者正確？",
      ["這是很好的創意設計，能幫公司提高實際市占率", "這屬於誤導性圖表：利用 3D 透視角度（近大遠小）扭曲了扇形面積與真實數據比例（18% vs. 24%）的對應關係，應改用平面 2D 圓餅圖或長條圖", "圓餅圖原本就不看面積與角度", "只要把百分比數字藏起來就不會誤導"],
      1,
      "3D 傾斜圓餅圖會因透視變形（近大遠小）與立體厚度，使前方扇形視覺面積被誇大、後方被縮小，違背資料視覺化真實反映比例的原則。"
    ),
    mkQ(
      "data4-h4",
      "應用",
      "小哲下載了政府開放資料「某市近 12 個月 YouBike 各站點租借次數與氣溫統計」，想在同一頁報告中同時呈現「(甲) 1~12 月全市總租借次數隨月份的變化趨勢」與「(乙) 行政區 A、B、C、D、E 五區年度總租借量的高低排名」。請問 (甲) 與 (乙) 分別應選用哪種圖表？",
      ["(甲) 圓餅圖、(乙) 散布圖", "(甲) 折線圖、(乙) 長條圖", "(甲) 散布圖、(乙) 圓餅圖", "(甲) 長條圖、(乙) 圓餅圖"],
      1,
      "(甲) 隨 1~12 月連續時間變化的趨勢最適合用「折線圖」；(乙) 比較五個不同行政區類別的數量高低排名最適合用「長條圖」。"
    ),
    mkQ(
      "data4-h5",
      "分析",
      "閱讀一張「A、B 兩家分店 1~6 月營業額折線圖」時，兩張圖的折線斜率看起來一模一樣陡峭，但仔細看縱軸（Y 軸）刻度：A 店每格代表 100 萬元（從 0 到 500 萬），B 店每格只代表 10 萬元（從 0 到 50 萬）。下列數據解讀何者正確？",
      ["A 店與 B 店這半年的營業額成長金額完全相同", "比較兩張獨立圖表時必須先檢查縱軸（Y 軸）刻度單位與最大範圍；A 店的實際成長金額是 B 店的 10 倍，不能只看線條陡峭程度就以為成長量一樣", "B 店成長比較快，因為數字比較小", "縱軸刻度數字不重要，看線條顏色即可"],
      1,
      "並排比較兩張圖表時，若兩圖的縱軸（Y 軸）刻度比例尺不同（一格 100 萬 vs. 一格 10 萬），直接比較視覺斜率會產生誤判，必須統一座標軸範圍或對照刻度數值。"
    )
  ];

  const quizData4 = {
    passScore: 60,
    easy: data4EasyQuestions,
    medium: data4MediumQuestions,
    hard: data4HardQuestions,
    levels: {
      easy: lv("入門探險家", "🧭", null, "掌握折線圖、圓餅圖、長條圖三大基本圖表的適用情境。", data4EasyQuestions),
      medium: lv("進階挑戰者", "🧰", "silver", "理解散布圖正負相關、截斷 Y 軸誤導手法與複選題圖表限制。", data4MediumQuestions),
      hard: lv("大師領航員", "👑", "gold", "深入分析相關與因果謬誤、不等距時間軸、3D 視覺扭曲與跨圖表比例尺判讀。", data4HardQuestions)
    }
  };

  const unitData4 = {
    id: "data-4",
    unit: "資料視覺化圖表選擇與數據趨勢分析",
    study: { title: "資料視覺化圖表選擇與數據趨勢分析", html: studyData4 },
    learningContent: { title: "資料視覺化圖表選擇與數據趨勢分析", html: studyData4 },
    lesson: lessonData4,
    worksheet: worksheetData4,
    print: printData4,
    lessonPlan: { lesson: lessonData4, worksheet: worksheetData4, print: printData4 },
    quiz: quizData4
  };

  /* 自我校驗：確保 data-1 ~ data-4 的 quiz.easy.length === 3, quiz.medium.length === 4, quiz.hard.length === 5 */
  [unitData1, unitData2, unitData3, unitData4].forEach((u) => {
    if (
      u.quiz.easy.length !== 3 ||
      u.quiz.medium.length !== 4 ||
      u.quiz.hard.length !== 5
    ) {
      throw new Error(`Quiz count validation failed for ${u.id}`);
    }
  });

  /* 匯出至 window.ISLAND_DATA 與 window.CONTENT */
  window.ISLAND_DATA["data-1"] = unitData1;
  window.ISLAND_DATA["data-2"] = unitData2;
  window.ISLAND_DATA["data-3"] = unitData3;
  window.ISLAND_DATA["data-4"] = unitData4;

  window.CONTENT["data-1"] = Object.assign({}, window.CONTENT["data-1"] || {}, unitData1);
  window.CONTENT["data-2"] = Object.assign({}, window.CONTENT["data-2"] || {}, unitData2);
  window.CONTENT["data-3"] = Object.assign({}, window.CONTENT["data-3"] || {}, unitData3);
  window.CONTENT["data-4"] = Object.assign({}, window.CONTENT["data-4"] || {}, unitData4);
})();
