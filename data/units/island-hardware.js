/**
 * 電腦探險島（sys）· 完整單元教材與分級題庫（sys-1 ~ sys-5）
 * ---------------------------------------------------------------
 * 需在 data/units/pc-adventure.js 之後載入：
 *   - 完整保留 sys-1 與 sys-4 既有【study / learningContent】與【lesson / worksheet / print / lessonPlan】圖文教材與學習單
 *   - 補齊並升級 sys-2（檔案與作業系統小管家）、sys-3（網路與雲端出航）、sys-5（當電腦生病了）之精練圖文學習內容與 A4 學習單
 *   - 全島 5 個單元（sys-1 ~ sys-5）測驗題數嚴格校驗為：
 *       * easy   : 3 題（quiz.easy.length === 3 & quiz.levels.easy.questions.length === 3）
 *       * medium : 4 題（quiz.medium.length === 4 & quiz.levels.medium.questions.length === 4）
 *       * hard   : 5 題（quiz.hard.length === 5 & quiz.levels.hard.questions.length === 5）
 */
window.CONTENT = window.CONTENT || {};
window.ISLAND_HARDWARE = window.ISLAND_HARDWARE || {};

(() => {
  const mkQ = (id, level, q, options, answer, explain) => ({
    id,
    level,
    type: "single",
    q,
    question: q,
    options,
    answer,
    explain,
    explanation: explain
  });

  const lv = (label, icon, badge, desc, questions) => ({
    label,
    icon,
    badge,
    desc,
    questions
  });

  const buildQuiz = (easyQs, mediumQs, hardQs, easyDesc, mediumDesc, hardDesc) => ({
    passScore: 60,
    easy: easyQs,
    medium: mediumQs,
    hard: hardQs,
    levels: {
      easy: lv("入門探險家", "🧭", null, easyDesc, easyQs),
      medium: lv("進階挑戰者", "🧰", "silver", mediumDesc, mediumQs),
      hard: lv("大師領航員", "👑", "gold", hardDesc, hardQs)
    }
  });

  const base1 = window.CONTENT["sys-1"] || {};
  const base2 = window.CONTENT["sys-2"] || {};
  const base3 = window.CONTENT["sys-3"] || {};
  const base4 = window.CONTENT["sys-4"] || {};
  const base5 = window.CONTENT["sys-5"] || {};

  /* ============================================================================
   * 單元四：sys-4 電腦內部大解密（保留既有圖文教材與學習單，校正題數為 3/4/5）
   * ============================================================================ */
  const studyHtml = `
<section class="study-sec">
  <h3>🔍 電腦主機剖析圖解</h3>
  <p class="study-lead">打開桌上型電腦的機殼,你會看到這些主角。滑鼠移到各零件上,想想它在「輸入 → 處理 → 輸出 → 儲存」中負責哪一段。</p>
  <div class="hw-diagram" role="img" aria-label="電腦主機內部示意圖：主機板上有 CPU、記憶體、顯示卡、固態硬碟與電源供應器">
    <svg viewBox="0 0 640 380" xmlns="http://www.w3.org/2000/svg">
      <rect x="6" y="6" width="628" height="368" rx="22" fill="#10375f" stroke="#7fb8e6" stroke-width="3"/>
      <rect x="150" y="26" width="360" height="326" rx="14" fill="#0f6b4f" stroke="#7be0b0" stroke-width="3"/>
      <text x="330" y="48" text-anchor="middle" fill="#d9fff0" font-size="14" font-weight="700">主機板 Motherboard（所有零件的馬路）</text>
      <g class="hw-part"><rect x="215" y="70" width="110" height="90" rx="10" fill="#ffd166" stroke="#a87400" stroke-width="3"/>
        <text x="270" y="108" text-anchor="middle" font-size="20" font-weight="800" fill="#3a2a00">CPU</text>
        <text x="270" y="132" text-anchor="middle" font-size="12" fill="#3a2a00">中央處理器・大腦</text></g>
      <g class="hw-part"><rect x="360" y="66" width="22" height="108" rx="4" fill="#4fb3ff" stroke="#0b5a99" stroke-width="2"/>
        <rect x="388" y="66" width="22" height="108" rx="4" fill="#4fb3ff" stroke="#0b5a99" stroke-width="2"/>
        <rect x="416" y="66" width="22" height="108" rx="4" fill="#4fb3ff" stroke="#0b5a99" stroke-width="2"/>
        <text x="399" y="196" text-anchor="middle" font-size="13" font-weight="700" fill="#e6f6ff">RAM 記憶體・工作桌</text></g>
      <g class="hw-part"><rect x="190" y="222" width="250" height="40" rx="8" fill="#c58bff" stroke="#6a2fb0" stroke-width="3"/>
        <text x="315" y="247" text-anchor="middle" font-size="14" font-weight="800" fill="#25063f">GPU 顯示卡・負責畫面輸出</text></g>
      <g class="hw-part"><rect x="190" y="284" width="130" height="46" rx="8" fill="#ff8a65" stroke="#a83a15" stroke-width="3"/>
        <text x="255" y="305" text-anchor="middle" font-size="14" font-weight="800" fill="#3d0f00">SSD / HDD</text>
        <text x="255" y="321" text-anchor="middle" font-size="11" fill="#3d0f00">儲存裝置・檔案櫃</text></g>
      <rect x="335" y="284" width="150" height="46" rx="8" fill="#2ec4b6" stroke="#0c6f66" stroke-width="3"/>
      <text x="410" y="312" text-anchor="middle" font-size="13" font-weight="800" fill="#02302c">I/O 連接埠 USB·HDMI</text>
      <g class="hw-part"><rect x="22" y="250" width="110" height="100" rx="10" fill="#cbd5e1" stroke="#475569" stroke-width="3"/>
        <text x="77" y="296" text-anchor="middle" font-size="14" font-weight="800" fill="#0f172a">電源供應器</text>
        <text x="77" y="316" text-anchor="middle" font-size="11" fill="#0f172a">PSU・供電</text></g>
      <g class="hw-part"><rect x="22" y="40" width="110" height="60" rx="30" fill="#fff3b0" stroke="#a87400" stroke-width="3"/>
        <text x="77" y="76" text-anchor="middle" font-size="14" font-weight="800" fill="#3a2a00">風扇散熱</text></g>
      <g fill="none" stroke="#fff" stroke-width="3" stroke-dasharray="6 5" opacity=".85">
        <path d="M325 115 H360"/><path d="M270 160 V222"/><path d="M255 262 V284"/><path d="M132 300 H190"/>
      </g>
      <text x="570" y="120" text-anchor="middle" font-size="26">⌨️</text><text x="570" y="146" text-anchor="middle" font-size="11" fill="#cfe8ff">輸入</text>
      <text x="570" y="220" text-anchor="middle" font-size="26">🖥️</text><text x="570" y="246" text-anchor="middle" font-size="11" fill="#cfe8ff">輸出</text>
      <path d="M512 110 H545" stroke="#fff" stroke-width="3" stroke-dasharray="5 4" fill="none"/><path d="M440 238 H545" stroke="#fff" stroke-width="3" stroke-dasharray="5 4" fill="none"/>
    </svg>
  </div>
  <ul class="study-list">
    <li><b>CPU</b>:執行指令、做計算的大腦;時脈(GHz)與核心數是常見規格。</li>
    <li><b>RAM</b>:CPU 的「工作桌」,正在使用的程式與資料暫放於此,關機後內容消失。</li>
    <li><b>SSD / HDD</b>:長期保存檔案的「檔案櫃」,關機後資料仍保留;SSD 無機械零件,速度較快。</li>
    <li><b>GPU</b>:專門處理圖像運算,把畫面送到螢幕。</li>
  </ul>
</section>

<section class="study-sec">
  <h3>🔄 五大單元資料流動表</h3>
  <p class="study-lead">不論桌機、手機或平板,電腦運作都可歸納成五大單元,資料依下列路線流動:</p>
  <div class="study-table-wrap">
  <table class="study-table">
    <tr><th>單元</th><th>角色比喻</th><th>常見硬體</th><th>資料流向</th></tr>
    <tr><td>⌨️ 輸入單元</td><td>耳朵與雙手</td><td>鍵盤、滑鼠、麥克風、觸控螢幕</td><td>外界資料 → 記憶單元</td></tr>
    <tr><td>🧠 控制單元</td><td>交通指揮員</td><td>CPU 內部控制電路</td><td>讀取指令 → 指揮各單元動作</td></tr>
    <tr><td>🧮 算術邏輯單元 (ALU)</td><td>計算機</td><td>CPU 內部運算電路</td><td>記憶單元 ⇄ 運算與比較</td></tr>
    <tr><td>📦 記憶單元</td><td>工作桌與檔案櫃</td><td>RAM、SSD、HDD</td><td>暫存／保存資料與程式</td></tr>
    <tr><td>🖨️ 輸出單元</td><td>嘴巴與雙眼</td><td>螢幕、喇叭、印表機</td><td>記憶單元 → 呈現給使用者</td></tr>
  </table>
  </div>
  <div class="flow-strip" aria-label="資料流動順序">
    <span>輸入</span><i>➜</i><span>記憶</span><i>➜</i><span>控制 ＋ 運算</span><i>➜</i><span>記憶</span><i>➜</i><span>輸出</span>
  </div>
  <p class="study-note">💡 例:按下鍵盤「A」→ 資料先存進 RAM → CPU 依指令處理 → 結果存回 RAM → 顯示卡把「A」畫在螢幕上。</p>
</section>

<section class="study-sec">
  <h3>⚠️ 選購電腦常見迷思概念整理</h3>
  <div class="myth-grid">
    <div class="myth"><div class="myth-q">❌ 「CPU 核心越多,電腦一定越快。」</div><div class="myth-a">✅ 核心多對「同時做很多事」有幫助,但單一程式若只用到少數核心,效能取決於單核心速度與軟體設計。</div></div>
    <div class="myth"><div class="myth-q">❌ 「硬碟(SSD)容量大,電腦就會變快。」</div><div class="myth-a">✅ 容量代表「能放多少檔案」;開機與讀檔快不快看的是儲存類型(SSD 比 HDD 快),不是容量大小。</div></div>
    <div class="myth"><div class="myth-q">❌ 「RAM 就是硬碟,兩個差不多。」</div><div class="myth-a">✅ RAM 是速度快但關機即消失的「工作桌」;硬碟是長期保存的「檔案櫃」。RAM 不足會讓多工變卡。</div></div>
    <div class="myth"><div class="myth-q">❌ 「顯示卡越貴越好,每個人都該買。」</div><div class="myth-a">✅ 文書與上網用內建顯示功能即可;剪輯、3D 與遊戲才需要高階 GPU。依需求配置最划算。</div></div>
    <div class="myth"><div class="myth-q">❌ 「只看 GHz 數字就能判斷 CPU 好壞。」</div><div class="myth-a">✅ 不同世代與架構的 CPU 每個時脈完成的工作量不同,應同時參考核心數、快取、世代與實測評比。</div></div>
  </div>
</section>`;

  const sys4EasyQs = [
    mkQ("e1", "記憶", "負責執行指令、進行運算,被稱為電腦「大腦」的零件是哪一個?", ["中央處理器(CPU)", "喇叭", "鍵盤", "螢幕"], 0, "CPU(中央處理器)負責讀取指令並執行運算,是電腦的運算與控制核心。"),
    mkQ("e2", "記憶", "下列哪一項屬於電腦五大單元中的「輸入單元」?", ["印表機", "螢幕", "喇叭", "滑鼠"], 3, "滑鼠把使用者的操作傳進電腦,屬於輸入單元;螢幕、喇叭與印表機屬於輸出單元。"),
    mkQ("e3", "理解", "下列哪一個「不是」電腦五大單元之一?", ["記憶單元", "控制單元", "算術邏輯單元", "網路單元"], 3, "五大單元為輸入、輸出、記憶、算術邏輯與控制單元;網路是連接電腦的服務或裝置,不在五大單元之內。")
  ];

  const sys4MediumQs = [
    mkQ("m1", "理解", "電腦規格寫著「16GB DDR5、1TB SSD、Core i5」。其中的「16GB」指的是什麼?", ["固態硬碟(SSD)的儲存空間", "記憶體(RAM)的容量", "螢幕的對角線尺寸", "CPU 的運算速度"], 1, "DDR5 是記憶體規格,16GB 指 RAM 容量;硬碟容量是後面標示的 1TB。"),
    mkQ("m2", "應用", "小安的電腦同時開十幾個瀏覽器分頁和文書軟體就會卡頓,查看發現記憶體 8GB 幾乎滿載。在預算有限時,最合適的升級是?", ["把螢幕換成更大的尺寸", "加裝第二個喇叭", "將 RAM 由 8GB 增加到 16GB", "換一條更長的網路線"], 2, "多工卡頓且記憶體滿載,代表「工作桌」太小,增加 RAM 容量最直接有效。"),
    mkQ("m3", "應用", "把作業系統由傳統 HDD 搬到 SSD 後,開機與開啟程式明顯變快,主要原因是?", ["SSD 沒有機械轉動零件,資料存取速度更快", "SSD 會自動增加 CPU 的核心數", "SSD 讓螢幕顯示更亮", "SSD 的容量一定比 HDD 大"], 0, "HDD 需靠磁頭與碟片機械式讀寫,SSD 以快閃記憶體存取,延遲低、速度快。"),
    mkQ("m4", "理解", "下列哪一項設備同時具備「輸入單元」與「輸出單元」的功能?", ["傳統有線滑鼠", "平板電腦的觸控螢幕", "一般桌上型喇叭", "光學條碼掃描器"], 1, "觸控螢幕能顯示畫面（輸出），又能感應手指點擊與滑動位置送進電腦（輸入），因此兼具輸入與輸出功能。")
  ];

  const sys4HardQs = [
    mkQ("h1", "應用", "某電腦執行大型程式時極度卡頓。工作管理員顯示:CPU 使用率 20%、記憶體使用率 98%、磁碟活動持續接近 100%。最可能的瓶頸與原因是?", ["CPU 太慢,應立即更換顯示卡", "硬碟容量不足,所以螢幕變暗", "網路頻寬不夠,導致磁碟忙碌", "記憶體不足,系統把資料頻繁換到硬碟(虛擬記憶體),造成磁碟忙碌與卡頓"], 3, "CPU 閒置而 RAM 滿載、磁碟忙碌,是典型的記憶體不足:作業系統把資料換進換出硬碟,速度遠慢於 RAM。"),
    mkQ("h2", "理解", "電腦以二進位表示資料。二進位數字 1011 轉換為十進位是多少?", ["9", "10", "11", "13"], 2, "1011₂ = 1×8 + 0×4 + 1×2 + 1×1 = 11。"),
    mkQ("h3", "理解", "現代 CPU 內部通常內建「快取記憶體(Cache)」。它存在的主要目的為何?", ["增加硬碟可儲存的檔案數量", "存放最常用的資料,縮短 CPU 等待較慢 RAM 的時間", "取代作業系統管理檔案", "讓電腦關機後仍能保存全部資料"], 1, "Cache 位於 CPU 內,速度比 RAM 更快;把常用資料放近一點,可減少 CPU 等待資料的時間,是記憶體階層設計的核心概念。"),
    mkQ("h4", "分析", "比較 CPU 內部的「控制單元(CU)」與「算術邏輯單元(ALU)」，下列敘述何者正確?", ["CU 負責加減乘除計算，ALU 負責儲存長期檔案", "CU 負責解讀指令並指揮各單元協調運作，ALU 負責執行算術運算與邏輯比較", "兩者都是非揮發性儲存裝置", "只有連接網路時 ALU 才會運作"], 1, "控制單元(CU)如同交通指揮官，負責擷取與解碼指令並發出控制訊號；算術邏輯單元(ALU)則負責算術加減乘除與邏輯比較判斷。"),
    mkQ("h5", "分析", "若依「CPU 存取資料的速度由快到慢」排列電腦的記憶與儲存階層，下列順序何者正確?", ["傳統硬碟(HDD) → 固態硬碟(SSD) → 主記憶體(RAM) → CPU 暫存器/快取(Cache)", "CPU 暫存器/快取(Cache) → 主記憶體(RAM) → 固態硬碟(SSD) → 傳統硬碟(HDD)", "主記憶體(RAM) → CPU 暫存器/快取(Cache) → 傳統硬碟(HDD) → 固態硬碟(SSD)", "固態硬碟(SSD) → 主記憶體(RAM) → CPU 暫存器/快取(Cache) → 傳統硬碟(HDD)"], 1, "距離 CPU 核心越近的記憶元件速度越快、單位成本越高：CPU 內部暫存器與快取(Cache)最快，其次是主記憶體(RAM)，再來是 SSD，最後是機械式 HDD。")
  ];

  const printSys4 = {
    situation: "週末你想幫家人挑選一台適合「上網、寫報告、剪輯家庭影片」的新電腦。店員遞給你一張規格表,上面寫著 CPU、RAM、SSD、顯示卡……你必須先看懂每個零件負責什麼,才不會多花冤枉錢。",
    thinking: [
      "如果電腦「同時開很多視窗就變慢」,你會先懷疑哪一個零件?為什麼?",
      "「容量 1TB」和「速度很快」是同一件事嗎?請用 RAM 與硬碟的差別說明。",
      "剪輯影片與只寫文書報告,在 CPU、RAM、顯示卡的需求上有何不同?"
    ],
    flowchart: "請用方框與箭頭,畫出「按下鍵盤上的 A 鍵,到螢幕出現字母 A」的資料流動流程圖,至少標示:輸入單元、記憶單元(RAM)、控制/算術邏輯單元(CPU)、輸出單元。",
    rubric: [
      { c: "五大單元與硬體對應", a: "精準辨識各硬體所屬單元，並清楚說明 CPU(CU/ALU)、RAM、SSD 之分工", b: "能正確對應多數硬體與五大單元，僅少數細節混淆", t: "混淆 RAM 與硬碟角色，或無法區分輸入與輸出單元" },
      { c: "資料流動流程圖", a: "完整繪出輸入→RAM→CPU(控制+運算)→RAM→輸出的流向與箭頭標註", b: "主要節點正確，僅記憶單元中轉步驟略簡化", t: "流程方向錯誤或缺少關鍵處理單元" },
      { c: "規格判讀與配置建議", a: "能依使用情境合理評估 CPU、RAM、SSD 與 GPU 需求並破除選購迷思", b: "能讀懂基本規格並給出大致合理的選購方向", t: "僅憑單一數字或價格高低做判斷" }
    ]
  };

  const studyObjSys4 = { title: "電腦主機剖析與五大單元", html: studyHtml };
  const quizSys4 = buildQuiz(
    sys4EasyQs,
    sys4MediumQs,
    sys4HardQs,
    "認識硬體基本名稱與電腦五大單元。",
    "解讀實務硬體規格,完成裝機配置判斷。",
    "系統瓶頸排查、二進位與快取架構延伸思維。"
  );

  window.CONTENT["sys-4"] = Object.assign({}, base4, {
    id: "sys-4",
    unit: base4.unit || "電腦內部大解密",
    study: studyObjSys4,
    learningContent: studyObjSys4,
    print: printSys4,
    lessonPlan: { lesson: base4.lesson, worksheet: base4.worksheet, print: printSys4 },
    quiz: quizSys4
  });
  window.ISLAND_HARDWARE["sys-4"] = window.CONTENT["sys-4"];


  /* ============================================================================
   * 單元一：sys-1 電腦大進化（保留既有圖文教材與學習單，校正題數為 3/4/5）
   * ============================================================================ */
  const evoStudy = `
<section class="study-sec">
  <h3>🕰️ 電腦四大世代演進圖解</h3>
  <p class="study-lead">電腦能從「占滿整間房間」縮小到「放進口袋」,關鍵在於核心電子元件一次次的突破。</p>
  <div class="hw-diagram" role="img" aria-label="電腦四大世代：真空管、電晶體、積體電路、超大型積體電路與微處理器">
    <svg viewBox="0 0 640 250" xmlns="http://www.w3.org/2000/svg">
      <rect x="4" y="4" width="632" height="242" rx="20" fill="#10375f" stroke="#7fb8e6" stroke-width="3"/>
      <g font-weight="800" text-anchor="middle">
        <g class="hw-part"><rect x="18" y="40" width="140" height="170" rx="14" fill="#ffd166" stroke="#a87400" stroke-width="3"/>
          <text x="88" y="64" font-size="13" fill="#3a2a00">第一代 1940s</text>
          <ellipse cx="88" cy="118" rx="22" ry="34" fill="#fff3b0" stroke="#a87400" stroke-width="3"/><path d="M78 150h20" stroke="#a87400" stroke-width="4"/>
          <text x="88" y="180" font-size="15" fill="#3a2a00">真空管</text><text x="88" y="198" font-size="10" fill="#3a2a00">巨大・耗電・易燒壞</text></g>
        <g class="hw-part"><rect x="176" y="40" width="140" height="170" rx="14" fill="#7fb8ff" stroke="#0b5a99" stroke-width="3"/>
          <text x="246" y="64" font-size="13" fill="#04243f">第二代 1950s</text>
          <rect x="232" y="100" width="28" height="30" rx="5" fill="#222" stroke="#cfe8ff" stroke-width="2"/><path d="M238 130v22M246 130v22M254 130v22" stroke="#e5e7eb" stroke-width="3"/>
          <text x="246" y="180" font-size="15" fill="#04243f">電晶體</text><text x="246" y="198" font-size="10" fill="#04243f">更小・省電・可靠</text></g>
        <g class="hw-part"><rect x="334" y="40" width="140" height="170" rx="14" fill="#7be0b0" stroke="#0c6f50" stroke-width="3"/>
          <text x="404" y="64" font-size="13" fill="#02301f">第三代 1960s</text>
          <rect x="378" y="98" width="52" height="40" rx="4" fill="#1f2937" stroke="#d1d5db" stroke-width="2"/><path d="M386 138v10M398 138v10M410 138v10M422 138v10M386 98v-10M398 98v-10M410 98v-10M422 98v-10" stroke="#e5e7eb" stroke-width="3"/>
          <text x="404" y="180" font-size="15" fill="#02301f">積體電路 IC</text><text x="404" y="198" font-size="10" fill="#02301f">多元件整合於一片矽</text></g>
        <g class="hw-part"><rect x="492" y="40" width="140" height="170" rx="14" fill="#c58bff" stroke="#6a2fb0" stroke-width="3"/>
          <text x="562" y="64" font-size="13" fill="#25063f">第四代 1970s~</text>
          <rect x="544" y="98" width="36" height="36" rx="3" fill="#111827" stroke="#f5d0fe" stroke-width="2"/><rect x="552" y="106" width="20" height="20" fill="#7c3aed"/>
          <text x="562" y="180" font-size="15" fill="#25063f">VLSI / 微處理器</text><text x="562" y="198" font-size="10" fill="#25063f">數十億電晶體・PC 誕生</text></g>
      </g>
      <g fill="#fff" font-size="22" text-anchor="middle"><text x="167" y="130">➜</text><text x="325" y="130">➜</text><text x="483" y="130">➜</text></g>
    </svg>
  </div>
  <ul class="study-list">
    <li><b>真空管</b>:像小燈泡的電子開關,例如 ENIAC 用了約 1 萬 8 千支,占地約半個籃球場。</li>
    <li><b>電晶體</b>:用半導體做成的開關,取代真空管,縮小體積、降低耗電。</li>
    <li><b>積體電路(IC)</b>:把許多電晶體與線路做在一小片矽晶片上。</li>
    <li><b>VLSI 與微處理器</b>:一顆晶片容納數十萬到數十億個電晶體,把 CPU 做成單一晶片,催生個人電腦與手機。</li>
  </ul>
</section>

<section class="study-sec">
  <h3>📊 體積／運算速度／耗電量演進對照表</h3>
  <div class="study-table-wrap">
  <table class="study-table">
    <tr><th>世代</th><th>核心元件</th><th>體積</th><th>運算速度</th><th>耗電與發熱</th><th>代表例子</th></tr>
    <tr><td>第一代</td><td>真空管</td><td>占滿整間機房</td><td>每秒數千次運算</td><td>極高、易燒壞</td><td>ENIAC</td></tr>
    <tr><td>第二代</td><td>電晶體</td><td>縮小為數個機櫃</td><td>每秒數十萬次</td><td>明顯降低</td><td>大型主機</td></tr>
    <tr><td>第三代</td><td>積體電路 IC</td><td>桌子或小型機櫃</td><td>每秒數百萬次</td><td>更低、更穩定</td><td>迷你電腦</td></tr>
    <tr><td>第四代</td><td>VLSI／微處理器</td><td>桌上型到口袋大小</td><td>每秒數十億次以上</td><td>低功耗、需散熱設計</td><td>個人電腦、智慧型手機</td></tr>
  </table>
  </div>
  <p class="study-note">💡 趨勢:每一代都是「更小、更快、更省電、更便宜」,電腦因此從研究機構走進每個家庭。(數據為概略量級,用於比較趨勢)</p>
</section>

<section class="study-sec">
  <h3>📈 摩爾定律與現代智慧型行動裝置發展</h3>
  <p><b>摩爾定律</b>:1965 年 Gordon Moore 觀察到,晶片上可容納的電晶體數量大約每 18~24 個月增加一倍,同時單位成本下降。它是「經驗趨勢」,不是自然法則。</p>
  <div class="flow-strip" aria-label="摩爾定律趨勢"><span>電晶體變多</span><i>➜</i><span>效能提升</span><i>➜</i><span>成本下降</span><i>➜</i><span>裝置更普及</span></div>
  <ul class="study-list">
    <li>電晶體變小,才有辦法把整台電腦、相機、定位、通訊模組塞進一支智慧型手機。</li>
    <li>行動裝置加上網路與雲端,形成「隨時在線」的生活:行動支付、線上學習、導航、影音串流。</li>
    <li>硬體進步帶動軟體與 App 發展,軟體需求又反過來推動硬體升級。</li>
  </ul>
  <p class="study-note">⚠️ 近年電晶體已縮到只有數奈米,製程逼近物理極限,摩爾定律趨緩,業界轉向多核心、專用晶片(如 AI 加速器)與先進封裝。</p>
</section>

<section class="study-sec">
  <h3>⚠️ 常見迷思概念整理</h3>
  <div class="myth-grid">
    <div class="myth"><div class="myth-q">❌ 「第一台電腦就是手機或個人電腦的祖先長相。」</div><div class="myth-a">✅ 早期電腦是占滿房間的專業機器,用於彈道、科學計算,個人電腦要到微處理器出現後才普及。</div></div>
    <div class="myth"><div class="myth-q">❌ 「摩爾定律是一定會成真的自然定律。」</div><div class="myth-a">✅ 它是產業觀察的經驗趨勢,受製程與成本限制,現在已明顯趨緩。</div></div>
    <div class="myth"><div class="myth-q">❌ 「電腦變快只靠 CPU,和軟體無關。」</div><div class="myth-a">✅ 演算法、作業系統與軟體最佳化同樣重要,軟硬體互相推動。</div></div>
  </div>
</section>`;

  const sys1EasyQs = [
    mkQ("e1", "記憶", "第一代電子計算機(如 ENIAC)使用哪一種關鍵電子元件?", ["電晶體", "真空管", "積體電路", "微處理器"], 1, "第一代電腦以真空管作為電子開關,體積大、耗電高且易燒壞。"),
    mkQ("e2", "記憶", "取代真空管、讓電腦體積縮小且更省電的第二代核心元件是?", ["算盤", "電晶體", "硬碟", "顯示卡"], 1, "電晶體以半導體製成,取代真空管,是第二代電腦的標誌。"),
    mkQ("e3", "理解", "把許多電晶體與線路整合在一小片矽晶片上,這項技術稱為?", ["積體電路(IC)", "真空管", "機械式差分機", "光纖"], 0, "積體電路(IC)把大量電子元件整合於單一晶片,是第三代電腦的特徵。")
  ];

  const sys1MediumQs = [
    mkQ("m1", "理解", "下列對「摩爾定律」的描述,何者最正確?", ["晶片上的電晶體數量約每 18~24 個月增加一倍的經驗趨勢", "電腦每年耗電量會減少一半的自然法則", "網路速度每月提升一倍的法律規定", "硬碟價格永遠不會改變"], 0, "摩爾定律是對晶片電晶體密度成長的經驗觀察,並非自然法則或法律。"),
    mkQ("m2", "應用", "為何智慧型手機能把相機、定位與通訊功能整合在掌心大小的機身內?", ["因為手機不需要晶片", "因為電晶體與晶片持續微縮,讓大量功能整合於小體積且省電", "因為手機只使用真空管", "因為手機運算全靠天上的雲"], 1, "電子元件微縮與整合(IC、VLSI、微處理器)使小體積高效能成為可能。"),
    mkQ("m3", "應用", "行動裝置、高速網路與雲端服務普及後,下列哪一項是直接的生活改變?", ["人們不再需要任何電子裝置", "行動支付、線上學習與即時導航變得普遍", "所有電腦都回到真空管時代", "網路只能在機房中使用"], 1, "硬體演進結合網路與軟體生態,帶動行動支付、線上學習、導航等新應用。"),
    mkQ("m4", "理解", "若將電腦硬體四個世代的核心電子元件依「歷史出現先後順序」排列，下列何者正確?", ["電晶體 → 真空管 → 積體電路(IC) → 超大型積體電路(VLSI)", "真空管 → 電晶體 → 積體電路(IC) → 超大型積體電路(VLSI)", "積體電路(IC) → 電晶體 → 超大型積體電路(VLSI) → 真空管", "超大型積體電路(VLSI) → 積體電路(IC) → 電晶體 → 真空管"], 1, "電腦硬體四代演進依序為：(1)真空管 → (2)電晶體 → (3)積體電路(IC) → (4)超大型積體電路(VLSI)與微處理器。")
  ];

  const sys1HardQs = [
    mkQ("h1", "應用", "晶片製程縮到數奈米後,工程師遇到的主要瓶頸之一是?", ["元件太大而放不進晶片", "密度提高使功耗密度與發熱難以散去,且逼近物理極限(如量子穿隧漏電)", "電晶體會自動變回真空管", "晶片無法使用電力"], 1, "電晶體極度微縮後,漏電與發熱加劇、製程成本暴增,使單純縮小難以持續,這是摩爾定律趨緩的原因。"),
    mkQ("h2", "理解", "為了在製程逼近極限時繼續提升效能,近年業界常採取哪種策略?", ["回到單一極大核心並大幅提高電壓", "採用多核心、專用加速晶片(如 AI/GPU)與先進封裝", "取消作業系統", "把晶片做得更厚而不改設計"], 1, "多核心、異質整合與專用加速器是在單核心頻率與製程瓶頸下,提升整體效能與能效的主流作法。"),
    mkQ("h3", "理解", "關於量子運算與神經型態運算,下列敘述何者正確?", ["兩者都只是把傳統 CPU 的時脈調高", "量子運算利用量子位元的疊加與糾纏,神經型態運算模仿大腦神經元與突觸,屬於不同於傳統馮紐曼架構的前瞻方向", "兩者早已取代所有個人電腦", "它們不需要任何硬體"], 1, "量子運算以量子位元處理特定問題;神經型態運算仿腦、低功耗處理感知與學習任務,皆為突破傳統架構瓶頸的研究方向,尚非通用替代品。"),
    mkQ("h4", "分析", "智慧農業系統在田間部署溫溼度感測器（IoT 裝置）蒐集環境數據，再透過網路將大量資料傳送到遠端資料中心進行長期趨勢分析。這項應用展現了哪兩種運算平臺的協同合作?", ["真空管主機與紙帶打卡機", "物聯網（IoT 邊緣感測）與雲端運算平臺（遠端儲存與大數據分析）", "單機版文書處理與算盤", "純機械式差分機與光碟機"], 1, "物聯網（IoT）負責在第一線環境感測與收集資料，雲端運算平臺則提供彈性的遠端儲存與強大算力進行分析，兩者相輔相成。"),
    mkQ("h5", "分析", "現代智慧型手機常採用「系統單晶片（SoC, System on a Chip）」設計，將 CPU、GPU、AI 神經網路引擎（NPU）與通訊模組整合在同一顆晶片中。這種設計相較於分散多顆獨立晶片的最大優勢為何?", ["可以讓手機重量增加十倍", "縮短元件間訊號傳輸距離、大幅降低耗電量並節省機身內部空間", "讓手機必須插著家用插座才能開機", "只為了讓晶片看起來比較大顆"], 1, "SoC 高密度整合能減少晶片間走線距離與訊號延遲、降低功耗並縮小主機板面積，是行動與穿戴裝置輕薄長效的關鍵。")
  ];

  const printSys1 = {
    situation: "學校要辦「電腦博物館週」,你負責「從算盤到智慧型手機」展區的導覽。你必須說清楚:計算工具如何演進、關鍵元件有什麼突破,以及這些改變怎麼影響我們的生活。",
    thinking: [
      "若沒有電晶體與積體電路,今天的智慧型手機可能會是什麼樣子?",
      "科技演進讓哪些生活事務變方便?又帶來哪些新的問題(如隱私、沉迷)?",
      "你認為下一個世代的電腦會突破什麼限制?"
    ],
    flowchart: "請畫出「計算工具與電腦演進時間軸」流程圖:算盤 → 機械計算器 → 真空管 → 電晶體 → 積體電路 → 微處理器/行動裝置,並在每個節點旁寫下一項生活改變。",
    rubric: [
      { c: "演進時序與核心元件", a: "正確排列四大世代與計算工具演進順序，精確說明各代關鍵元件突破", b: "順序大致正確，能說出主要電子元件名稱", t: "世代順序顛倒或混淆元件名稱" },
      { c: "平臺比較與生活影響", a: "能具體比較 PC、行動裝置、雲端與物聯網特色並舉出貼切生活實例", b: "能描述現代電腦帶來的便利，舉例尚稱合理", t: "僅列出名詞，未說明對生活的影響" },
      { c: "時間軸圖表與導覽表達", a: "時間軸結構清晰、圖文並茂，並能深入反思摩爾定律與未來趨勢", b: "完成基本時間軸繪製與簡要說明", t: "時間軸缺漏多數節點" }
    ]
  };

  const studyObjSys1 = { title: "電腦四大世代與摩爾定律", html: evoStudy };
  const quizSys1 = buildQuiz(
    sys1EasyQs,
    sys1MediumQs,
    sys1HardQs,
    "辨識各世代關鍵電子元件。",
    "理解摩爾定律,以及軟硬體演進對生活的影響。",
    "分析微處理器瓶頸與前瞻運算概念。"
  );

  window.CONTENT["sys-1"] = Object.assign({}, base1, {
    id: "sys-1",
    unit: base1.unit || "電腦大進化",
    study: studyObjSys1,
    learningContent: studyObjSys1,
    print: printSys1,
    lessonPlan: { lesson: base1.lesson, worksheet: base1.worksheet, print: printSys1 },
    quiz: quizSys1
  });
  window.ISLAND_HARDWARE["sys-1"] = window.CONTENT["sys-1"];


  /* ============================================================================
   * 單元二：sys-2 檔案與作業系統小管家（作業系統、周邊介面、檔案樹狀管理與雲端權限）
   * ============================================================================ */
  const fileStudy = `
<section class="study-sec">
  <h3>🗂️ 作業系統分層架構、周邊介面與檔案樹狀結構圖解</h3>
  <p class="study-lead">「作業系統（Operating System, OS）」是使用者與電腦硬體之間的「大總管」，向下管理 CPU、記憶體、儲存裝置與周邊連接介面（USB、HDMI、藍牙），向上提供操作介面讓應用程式順利執行；而「檔案系統」則像有階層的數位檔案櫃，用資料夾樹狀結構把資料整理得井然有序。</p>
  <div class="hw-diagram" role="img" aria-label="作業系統分層架構與檔案樹狀結構圖解：左側為使用者、應用軟體、作業系統與硬體周邊介面分層，右側為磁碟根目錄、子資料夾與檔案路徑樹狀圖">
    <svg viewBox="0 0 640 270" xmlns="http://www.w3.org/2000/svg">
      <rect x="4" y="4" width="632" height="262" rx="20" fill="#10375f" stroke="#7fb8e6" stroke-width="3"/>
      <text x="155" y="28" text-anchor="middle" fill="#d9fff0" font-size="13" font-weight="800">電腦軟硬體分層與周邊介面</text>
      <text x="460" y="28" text-anchor="middle" fill="#d9fff0" font-size="13" font-weight="800">檔案系統樹狀結構（Tree Structure）</text>
      <g font-weight="800" text-anchor="middle">
        <rect x="24" y="42" width="256" height="42" rx="10" fill="#ffd166" stroke="#a87400" stroke-width="2.5"/>
        <text x="152" y="68" font-size="14" fill="#3a2a00">📱 應用軟體（瀏覽器、文書、遊戲）</text>

        <rect x="24" y="104" width="256" height="54" rx="10" fill="#7be0b0" stroke="#0c6f50" stroke-width="2.5"/>
        <text x="152" y="128" font-size="14" fill="#02301f">⚙️ 作業系統 OS（資源與檔案總管）</text>
        <text x="152" y="146" font-size="11" fill="#02301f">Windows · macOS · Linux · Android · iOS</text>

        <rect x="24" y="178" width="256" height="58" rx="10" fill="#c58bff" stroke="#6a2fb0" stroke-width="2.5"/>
        <text x="152" y="202" font-size="14" fill="#25063f">🔌 硬體與周邊連接介面（I/O 埠）</text>
        <text x="152" y="222" font-size="11" fill="#25063f">USB-A/C · HDMI · 音源孔 · Wi-Fi / 藍牙</text>

        <path d="M152 84v20M152 158v20" stroke="#fff" stroke-width="3" stroke-dasharray="5 4"/>

        <rect x="405" y="38" width="110" height="32" rx="8" fill="#ff8a65" stroke="#a83a15" stroke-width="2"/>
        <text x="460" y="59" font-size="13" fill="#3d0f00">💽 D:\\ (根目錄)</text>

        <rect x="315" y="96" width="125" height="34" rx="8" fill="#4fb3ff" stroke="#0b5a99" stroke-width="2"/>
        <text x="377" y="118" font-size="13" fill="#04243f">📁 01_學科作業</text>

        <rect x="485" y="96" width="125" height="34" rx="8" fill="#4fb3ff" stroke="#0b5a99" stroke-width="2"/>
        <text x="547" y="118" font-size="13" fill="#04243f">📁 02_活動素材</text>

        <rect x="298" y="158" width="168" height="32" rx="8" fill="#fff3b0" stroke="#a87400" stroke-width="2"/>
        <text x="382" y="179" font-size="11.5" fill="#3a2a00">📄 20261105_資訊_v1.docx</text>

        <rect x="298" y="200" width="168" height="32" rx="8" fill="#fff3b0" stroke="#a87400" stroke-width="2"/>
        <text x="382" y="221" font-size="11.5" fill="#3a2a00">📄 20261108_自然_v2.pdf</text>

        <rect x="485" y="158" width="130" height="32" rx="8" fill="#fff3b0" stroke="#a87400" stroke-width="2"/>
        <text x="550" y="179" font-size="11.5" fill="#3a2a00">🖼️ 校慶海報.png</text>

        <rect x="485" y="200" width="130" height="32" rx="8" fill="#fff3b0" stroke="#a87400" stroke-width="2"/>
        <text x="550" y="221" font-size="11.5" fill="#3a2a00">🎵 背景配樂.mp3</text>

        <path d="M460 70 V83 H377 V96 M460 83 H547 V96 M377 130 V158 M547 130 V158" stroke="#fff" stroke-width="2.2" fill="none"/>
      </g>
      <text x="460" y="252" text-anchor="middle" fill="#cfe8ff" font-size="11.5" font-weight="700">完整檔案路徑：D:\\01_學科作業\\20261105_資訊_v1.docx</text>
    </svg>
  </div>
  <ul class="study-list">
    <li><b>作業系統（OS）四大任務</b>：行程與 CPU 排程管理、主記憶體空間調配、檔案系統管理、周邊設備與驅動程式控制。</li>
    <li><b>常見周邊連接介面</b>：<b>USB Type-A / Type-C</b>（傳資料與供電，Type-C 正反皆可插）、<b>HDMI</b>（同時傳輸高畫質數位影像與聲音）、<b>藍牙 Bluetooth</b>（短距離無線連接耳機、滑鼠）。</li>
    <li><b>檔案名稱與副檔名</b>：由「<code>主檔名.副檔名</code>」構成；副檔名（如 <code>.docx</code>、<code>.pdf</code>、<code>.jpg</code>、<code>.mp4</code>、<code>.zip</code>）標示檔案格式，讓作業系統知道該用哪個軟體開啟。</li>
    <li><b>黃金命名法則</b>：採用「<code>YYYYMMDD_科目或專案_主題_版本</code>」（如 <code>20261105_資訊_專題簡報_v2.pptx</code>），依檔名排序時即可自動按日期先後整齊排列。</li>
  </ul>
</section>

<section class="study-sec">
  <h3>📊 常見副檔名格式與雲端共享權限對照表</h3>
  <div class="study-table-wrap">
  <table class="study-table">
    <tr><th>檔案類別</th><th>常見副檔名</th><th>格式特性與適用情境</th></tr>
    <tr><td>📄 文件與簡報</td><td><code>.txt</code> <code>.docx</code> <code>.pptx</code> <code>.pdf</code></td><td><code>.txt</code> 為純文字檔；<code>.pdf</code> 能跨裝置固定版面與字型，最常作為正式繳交或列印格式</td></tr>
    <tr><td>🖼️ 靜態影像</td><td><code>.jpg</code> <code>.png</code> <code>.gif</code> <code>.svg</code></td><td><code>.jpg</code> 壓縮率高適合照片；<code>.png</code> 無損壓縮且支援透明背景；<code>.svg</code> 為向量圖放大不失真</td></tr>
    <tr><td>🎬 音訊與視訊</td><td><code>.mp3</code> <code>.wav</code> <code>.mp4</code></td><td><code>.mp3</code> 為常見壓縮音樂檔；<code>.mp4</code> 為整合動態影像與音軌的主流影片格式</td></tr>
    <tr><td>🗜️ 壓縮封存檔</td><td><code>.zip</code> <code>.7z</code></td><td>將多個檔案與子資料夾打包成單一檔案並縮小體積；下載後須先「解壓縮」再編輯</td></tr>
  </table>
  </div>
  <div class="study-table-wrap">
  <table class="study-table">
    <tr><th>雲端硬碟權限等級</th><th>允許的操作行為</th><th>建議使用情境</th></tr>
    <tr><td>👀 檢視者（僅可檢視）</td><td>只能閱讀或下載，<b>無法修改或刪除原檔</b></td><td>公開作品集、發放課程講義、分享活動照片給全班</td></tr>
    <tr><td>💬 留言者（可加註解）</td><td>不可直接改動內文，但可在旁新增建議與討論留言</td><td>請老師或同儕審閱報告初稿、提供修改回饋</td></tr>
    <tr><td>✏️ 編輯者（可編輯）</td><td>可新增、修改、覆蓋或刪除檔案內容</td><td>小組成員共同編輯同一份專題簡報或共編文件</td></tr>
  </table>
  </div>
  <div class="flow-strip" aria-label="3-2-1 備份黃金原則">
    <span>3 份資料（1 份原檔 ＋ 2 份備份）</span><i>➜</i><span>2 種不同儲存媒介（如電腦 SSD ＋ 外接硬碟）</span><i>➜</i><span>1 份異地或雲端保存</span>
  </div>
</section>

<section class="study-sec">
  <h3>⚠️ 常見迷思概念整理</h3>
  <div class="myth-grid">
    <div class="myth"><div class="myth-q">❌ 「把 <code>照片.jpg</code> 重新命名改成 <code>照片.mp4</code>，圖片就會自動轉成影片檔了！」</div><div class="myth-a">✅ <b>改檔名不等於轉檔</b>：手動修改副檔名只改了外層標籤，沒有改變內部的資料編碼，反而會害軟體讀不懂而顯示檔案損毀；必須使用「另存新檔」或轉檔工具。</div></div>
    <div class="myth"><div class="myth-q">❌ 「Google Chrome、Word 和 LINE 也都是電腦的作業系統。」</div><div class="myth-a">✅ <b>區分作業系統與應用軟體</b>：Windows、macOS、Linux、Android、iOS 才是管理硬體的「作業系統（OS）」；Chrome、Word、LINE 則是安裝在作業系統之上的「應用軟體（App）」。</div></div>
    <div class="myth"><div class="myth-q">❌ 「把雲端資料夾設為『知道連結的任何人皆可編輯』最方便，完全沒風險。」</div><div class="myth-a">✅ <b>最小權限原則</b>：權限過寬一旦連結外流，任何人都能竄改或清空你的心血！僅供閱覽時務必設為「檢視者」，共編則只針對指定組員開放「編輯者」。</div></div>
    <div class="myth"><div class="myth-q">❌ 「檔案只要放進雲端硬碟，就永遠不可能遺失，不需要本機備份。」</div><div class="myth-a">✅ <b>雲端同步也會同步誤刪</b>：若帳號被盜、誤刪檔案或網路中斷，單靠雲端仍有風險；重要檔案應落實「3-2-1 備份原則」。</div></div>
  </div>
</section>`;

  const printSys2 = {
    situation: "班級共用資料夾被同學們塞滿「新增資料夾(3)」、「final最終版真的不改版.docx」、「IMG_0001.jpg」，期末要繳交成果作品集時大家卻找不到正確檔案！老師任命你擔任「班級檔案與雲端小管家」，負責規劃三層資料夾樹狀結構、制定黃金命名規範，並安全地設定雲端共享權限。",
    thinking: [
      "作業系統（OS）為什麼需要提供「樹狀檔案系統」？如果整顆硬碟只能把幾萬個檔案全部平鋪放在同一個畫面，會發生什麼問題？",
      "為什麼把檔名定為 `20261105_自然科_水質實驗報告_v2.pdf` 比 `自然報告最新最終版.pdf` 好得多？請從「排序」與「版本辨識」兩個角度說明。",
      "當你要把「小組共編簡報」分享給組員一起修改，以及把「成品海報」分享給全班同學觀賞時，雲端硬碟權限分別該設為哪一種？為什麼？"
    ],
    flowchart: "請畫出「混亂桌面與資料夾大掃除」的標準流程圖：盤點檔案與開啟顯示副檔名 → 依學科/類型建立多層樹狀資料夾 → 依「日期_主題_版本」規則重新命名歸檔 → 打包壓縮或上傳雲端 → 設定對應分享權限並完成 3-2-1 備份。",
    rubric: [
      { c: "作業系統與副檔名辨識", a: "精確區分作業系統與應用軟體，並正確判讀各類副檔名格式與周邊介面用途", b: "能辨識常見副檔名與主要作業系統，僅少數格式混淆", t: "誤以為直接改副檔名即可轉檔，或分不清作業系統與應用軟體" },
      { c: "樹狀結構與黃金命名", a: "資料夾階層邏輯分明（2~3 層），所有檔案皆依「YYYYMMDD_類別_主題_版本」規範命名", b: "完成基本資料夾分類與命名，僅少數檔名格式不一致", t: "資料夾無階層分類，仍使用「未命名」「最終版」等模糊名稱" },
      { c: "雲端權限與備份策略", a: "依情境精準設定「檢視者/留言者/編輯者」最小必要權限，並落實 3-2-1 備份概念", b: "能成功上傳雲端並設定分享連結，經提醒可修正權限範圍", t: "權限設定錯誤導致檔案有遭誤刪風險，且無備份觀念" }
    ]
  };

  const sys2EasyQs = [
    mkQ("e1", "記憶", "下列哪一項屬於管理電腦軟硬體資源的核心「作業系統（Operating System）」？", ["Windows 11", "JPG 圖片", "USB 連接線", "Google 搜尋引擎"], 0, "Windows 11（以及 macOS、Linux、Android、iOS）是作業系統；JPG 是檔案格式，USB 是硬體介面。"),
    mkQ("e2", "記憶", "當我們需要繳交一份「跨裝置開啟也不會跑版、版面固定」的正式報告時，最適合匯出成下列哪一種副檔名格式？", [".pdf", ".mp3", ".zip", ".wav"], 0, "PDF（可攜式文件格式）能完整保留字型與排版，跨平臺開啟不會跑版，最常用於正式文件繳交與列印。"),
    mkQ("e3", "理解", "在電腦與螢幕之間連接一條「HDMI 線」，這條線的主要功能是什麼？", ["同時傳輸高畫質數位影像與音訊聲音", "把傳統硬碟變成固態硬碟", "自動幫作業系統殺毒", "提供無限量的雲端硬碟空間"], 0, "HDMI 是現代主流的數位影音介面，單一條線即可將電腦或遊戲機的高畫質畫面與聲音傳送到螢幕或投影機。")
  ];

  const sys2MediumQs = [
    mkQ("m1", "應用", "為了讓資料夾內的多份報告在「依名稱排序」時能自動照日期先後整齊排列，且一眼看懂科目與版本，下列哪一個檔名設計最理想？", ["新增Microsoft Word文件(3).docx", "最終版_真的最終版_打死不改版.docx", "20261105_資訊_網路架構報告_v2.docx", "報告123.docx"], 2, "以 8 碼日期（YYYYMMDD）開頭搭配科目、主題與版本號（v2），依字元排序時即完全符合時間先後且語意清晰。"),
    mkQ("m2", "應用", "你要把班級旅遊的雲端相簿連結貼到班群，讓全班同學「只能欣賞與下載照片，但不能刪除或亂改別人的照片」，雲端共用權限應設為？", ["編輯者", "檢視者（僅可檢視）", "擁有者", "知道連結的任何人皆可編輯"], 1, "「檢視者」權限僅允許閱覽與（依設定）下載，無法新增、修改或刪除檔案，能有效保護共用資料不被誤刪。"),
    mkQ("m3", "理解", "小明把一張照片 `photo.jpg` 直接在檔案總管手動改名為 `photo.mp4`，結果影片播放器卻顯示無法開啟。原因為何？", ["手動更改副檔名只改了名稱標籤，檔案內部仍是圖片編碼，並不會自動轉換格式", "因為電腦中了勒索病毒", "因為檔名使用了英文字母", "因為硬碟容量被撐爆了"], 0, "修改副檔名不會改變檔案內部的實際資料結構與編碼；若要轉換格式，必須透過軟體「另存新檔」或轉檔程式處理。"),
    mkQ("m4", "理解", "從網路下載一個名為 `專題素材包.zip` 的壓縮檔後，最標準且安全的處理步驟為何？", ["直接把副檔名改成 .docx 就好", "先執行「解壓縮」將裡面的資料夾與檔案還原出來，再進行檢視與編輯", "必須先把螢幕關機才能打開 .zip", "壓縮檔裡面的檔案永遠無法再被打開"], 1, "`.zip` 是將多個檔案打包並壓縮體積的封存格式，下載後應先「解壓縮（Extract）」成一般資料夾，才能正常編輯與存檔。")
  ];

  const sys2HardQs = [
    mkQ("h1", "應用", "資訊安全與檔案管理常強調「3-2-1 備份原則」。下列哪一種儲存做法最符合這項原則？", ["把檔案在同一個電腦桌面複製貼上 3 次", "只存在一支隨身碟裡並隨身攜帶", "保存 3 份資料（含原檔），分別存放在 2 種不同媒介（如電腦內部 SSD 與外接硬碟），且其中 1 份同步於異地或雲端硬碟", "把檔案印在紙上後就把電腦裡的原檔刪除"], 2, "3-2-1 原則為：至少 3 份資料、使用 2 種不同儲存媒介、1 份異地/雲端保存，可同時防範硬碟損壞、遺失與單點災害。"),
    mkQ("h2", "理解", "當使用者同時開啟瀏覽器聽音樂、用文書軟體打字、又在背景下載檔案時，作業系統（OS）在背後扮演什麼關鍵角色？", ["自動幫使用者撰寫報告內容", "負責多工排程與資源分配（協調 CPU 時間、配置各程式的 RAM 空間並管理 I/O 存取），避免程式互相衝突", "將電腦內部的電晶體數量增加一倍", "只負責顯示桌面背景圖片"], 1, "作業系統負責處理程序排程（Process Scheduling）、記憶體管理與裝置 I/O 協調，讓多個應用程式能穩定且安全地共享硬體資源。"),
    mkQ("h3", "分析", "小華整理完檔案後，某個檔案的完整路徑顯示為 `D:\\701_資訊課\\專題報告\\20261108_組別A_v1.pptx`。關於此路徑的判讀，下列何者正確？", ["`20261108_組別A_v1.pptx` 是一個資料夾名稱", "`D:` 代表磁碟根目錄，檔案位於 `701_資訊課` 資料夾底下的 `專題報告` 子資料夾中，且為簡報格式檔案", "這個檔案目前儲存在雲端伺服器而非本機磁碟", "`.pptx` 代表這是一個純音訊音樂檔"], 1, "路徑由左至右呈現樹狀階層：`D:` 為本機磁碟代號，`701_資訊課` 與 `專題報告` 為上層與子層資料夾，最末端為簡報檔名與副檔名 `.pptx`。"),
    mkQ("h4", "分析", "某小組把期末專題雲端資料夾權限設為「知道連結的任何人皆可編輯」，並將短連結張貼在公開社群論壇。這樣做最主要的風險是什麼？", ["雲端硬碟會因為有人點連結而自動把電腦螢幕燒壞", "任何取得連結的陌生人都能隨意竄改、刪除專題檔案，甚至上傳惡意程式或釣魚檔案", "檔案的副檔名會自動變成 .mp3", "只有用有線網路的人才能點開連結"], 1, "公開連結又給予「可編輯」權限違反最小權限原則，將導致資料隨時可能遭不明人士惡意刪除、覆蓋或植入不當檔案。"),
    mkQ("h5", "應用", "小安想把手機拍的 4K 影片傳到筆電剪輯，並同時幫手機快速充電；她看到筆電側邊有一個「正反兩面都能插、呈橢圓扁平狀」的高速連接埠。請問這是哪一種周邊介面？", ["VGA 類比顯示埠", "USB Type-C 連接埠", "RJ-45 有線網路孔", "3.5mm 耳機音源孔"], 1, "USB Type-C 具備正反皆可插的對稱接頭設計，並支援高速資料傳輸、電力供應（PD 快充）與影音輸出擴充。")
  ];

  const studyObjSys2 = { title: "作業系統與檔案管理", html: fileStudy };
  const quizSys2 = buildQuiz(
    sys2EasyQs,
    sys2MediumQs,
    sys2HardQs,
    "認識作業系統、周邊介面與檔案基本概念。",
    "運用命名規則、副檔名判讀與雲端分享處理情境。",
    "權限控管、路徑解析、3-2-1 備份策略與作業系統資源管理深入判斷。"
  );

  window.CONTENT["sys-2"] = Object.assign({}, base2, {
    id: "sys-2",
    unit: base2.unit || "檔案與作業系統小管家",
    study: studyObjSys2,
    learningContent: studyObjSys2,
    print: printSys2,
    lessonPlan: { lesson: base2.lesson, worksheet: base2.worksheet, print: printSys2 },
    quiz: quizSys2
  });
  window.ISLAND_HARDWARE["sys-2"] = window.CONTENT["sys-2"];


  /* ============================================================================
   * 單元三：sys-3 網路與雲端出航（網路硬體組成、IP/DNS、封包路由與雲端服務）
   * ============================================================================ */
  const netStudy = `
<section class="study-sec">
  <h3>🌐 一次網頁請求的封包旅程與 DNS 解析圖解</h3>
  <p class="study-lead">當你在瀏覽器輸入網址（如 <code>www.school.edu.tw</code>）按下 Enter 時，電腦會先向「DNS 伺服器（網路電話簿）」查出目標網站的「IP 位址（數位門牌號碼）」，接著把資料切成小「封包（Packets）」，交給「路由器（Router）」接力轉送到網站伺服器，最後再把網頁資料帶回你的螢幕！</p>
  <div class="hw-diagram" role="img" aria-label="網頁請求與封包傳輸流程圖：用戶端電腦先向 DNS 伺服器查詢網址對應的 IP，再經由家用路由器與網際網路路由器轉送封包至雲端網站伺服器">
    <svg viewBox="0 0 640 245" xmlns="http://www.w3.org/2000/svg">
      <rect x="4" y="4" width="632" height="237" rx="20" fill="#10375f" stroke="#7fb8e6" stroke-width="3"/>
      <g font-weight="800" text-anchor="middle" font-size="13">
        <rect x="18" y="88" width="118" height="68" rx="12" fill="#ffd166" stroke="#a87400" stroke-width="3"/>
        <text x="77" y="114" fill="#3a2a00">💻 你的電腦</text>
        <text x="77" y="132" font-size="10.5" fill="#3a2a00">LAN IP: 192.168.1.5</text>
        <text x="77" y="147" font-size="10" fill="#3a2a00">輸入 www.edu.tw</text>

        <rect x="178" y="88" width="112" height="68" rx="12" fill="#7be0b0" stroke="#0c6f50" stroke-width="3"/>
        <text x="234" y="116" fill="#02301f">📡 路由器 Router</text>
        <text x="234" y="135" font-size="10.5" fill="#02301f">跨網路指路轉送</text>

        <rect x="334" y="18" width="136" height="58" rx="12" fill="#c58bff" stroke="#6a2fb0" stroke-width="3"/>
        <text x="402" y="42" fill="#25063f">📖 DNS 伺服器</text>
        <text x="402" y="60" font-size="10.5" fill="#25063f">網址 ➜ 140.111.34.1</text>

        <rect x="334" y="160" width="136" height="62" rx="12" fill="#4fb3ff" stroke="#0b5a99" stroke-width="3"/>
        <text x="402" y="186" fill="#04243f">🌍 網際網路骨幹</text>
        <text x="402" y="204" font-size="10.5" fill="#04243f">光纖海底電纜・封包交換</text>

        <rect x="502" y="88" width="118" height="68" rx="12" fill="#ff8a65" stroke="#a83a15" stroke-width="3"/>
        <text x="561" y="114" fill="#3d0f00">☁️ 網站伺服器</text>
        <text x="561" y="132" font-size="10.5" fill="#3d0f00">IP: 140.111.34.1</text>
        <text x="561" y="147" font-size="10" fill="#3d0f00">回傳 HTTPS 網頁封包</text>
      </g>
      <g stroke="#fff" stroke-width="2.8" stroke-dasharray="6 4" fill="none">
        <path d="M136 122 H178"/>
        <path d="M265 88 L334 52"/>
        <path d="M265 156 L334 186"/>
        <path d="M470 186 L535 156"/>
      </g>
      <text x="278" y="62" fill="#ffd166" font-size="11" font-weight="800">① 查 IP</text>
      <text x="275" y="184" fill="#7be0b0" font-size="11" font-weight="800">② 傳送封包</text>
      <text x="515" y="184" fill="#ff8a65" font-size="11" font-weight="800">③ 抵達與回傳</text>
    </svg>
  </div>
  <ul class="study-list">
    <li><b>構成網路的三大要素</b>：<b>連網裝置</b>（電腦、手機、伺服器）、<b>傳輸媒介</b>（有線雙絞線、光纖；無線 Wi-Fi、4G/5G、藍牙）與<b>通訊協定（Protocol）</b>（雙方溝通的規則，如 TCP/IP、HTTP/HTTPS）。</li>
    <li><b>IP 位址（Internet Protocol Address）</b>：連網裝置在網路上的「數位門牌號碼」（如 IPv4 的 <code>140.111.34.1</code>，以及為解決位址不足而發展的 128 位元 <b>IPv6</b>）。</li>
    <li><b>DNS（網域名稱系統）</b>：網路世界的「自動電話簿」，負責把好記的文字網址（如 <code>www.ntnu.edu.tw</code>）翻譯成電腦能路由尋址的數字 IP。</li>
    <li><b>封包交換（Packet Switching）</b>：大檔案傳輸時會被拆成許多編好順序的小「封包」，各自標上來源與目的 IP 沿最佳路徑傳送，抵達終點後再依編號重組。</li>
  </ul>
</section>

<section class="study-sec">
  <h3>📊 網路傳輸媒介、規模分類與雲端服務模式比較表</h3>
  <div class="study-table-wrap">
  <table class="study-table">
    <tr><th>分類項目</th><th>名稱與縮寫</th><th>範圍 / 技術特性</th><th>生活常見實例</th></tr>
    <tr><td>🔌 有線媒介</td><td>雙絞網路線（RJ-45）／光纖（Fiber）</td><td>雙絞線常用於室內區域網路；<b>光纖</b>以光訊號傳輸，速度極快、抗電磁干擾，用於跨海與主幹網路</td><td>電腦教室網路線、中華電信光世代、海底光纜</td></tr>
    <tr><td>📶 無線媒介</td><td>藍牙（PAN）／Wi-Fi（WLAN）／5G</td><td>藍牙距離約數公尺且省電；Wi-Fi 涵蓋室內或熱點；4G/5G 涵蓋廣域行動基地台</td><td>藍牙耳機、家用 Wi-Fi 分享器、手機行動上網</td></tr>
    <tr><td>🏫 網路規模</td><td>PAN ➜ LAN ➜ WAN ➜ Internet</td><td>個人網路（PAN）＜ 區域網路（LAN，單一建築/校園）＜ 廣域網路（WAN，跨城市/跨國）＜ 網際網路</td><td>校園電腦教室（LAN）、全球網際網路（Internet）</td></tr>
    <tr><td>☁️ 雲端模式</td><td>SaaS ／ PaaS ／ IaaS</td><td><b>SaaS</b> 直接使用雲端軟體；<b>PaaS</b> 租用開發執行平臺；<b>IaaS</b> 租用底層虛擬主機與儲存空間</td><td>Google 文件/Gmail（SaaS）、雲端虛擬主機（IaaS）</td></tr>
  </table>
  </div>
  <div class="flow-strip" aria-label="網址結構與安全傳輸">
    <span>https://（TLS 加密安全協定）</span><i>➜</i><span>www.example</span><i>➜</i><span>.edu（機構類別：教育）/ .gov（政府）/ .com（商業）</span><i>➜</i><span>.tw（國家地區代碼：台灣）</span>
  </div>
</section>

<section class="study-sec">
  <h3>⚠️ 常見迷思概念整理</h3>
  <div class="myth-grid">
    <div class="myth"><div class="myth-q">❌ 「手機右上角顯示連上 Wi-Fi 滿格，就代表一定能連上網際網路！」</div><div class="myth-a">✅ <b>Wi-Fi 只是區域無線連接</b>：Wi-Fi 滿格只代表手機成功連上「家裡的無線路由器（LAN）」；若路由器通往電信機房的外線（WAN）斷了，依然無法連上網際網路。</div></div>
    <div class="myth"><div class="myth-q">❌ 「雲端硬碟裡的資料是飄在天空大氣層的雲朵裡面。」</div><div class="myth-a">✅ <b>雲端是遠端大型資料中心機房</b>：「雲」只是網際網路的圖示比喻，雲端資料實際上儲存在世界各地全年開機、具備多重備援與散熱系統的實體伺服器硬碟中。</div></div>
    <div class="myth"><div class="myth-q">❌ 「輸入英文網址打不開網頁，就一定是網路線被剪斷了。」</div><div class="myth-a">✅ <b>可能是 DNS 解析故障</b>：若直接輸入數字 IP 能通、輸入英文網址卻打不開，代表實體線路正常，而是負責把網址翻譯成 IP 的「DNS 設定或 DNS 伺服器」出問題。</div></div>
    <div class="myth"><div class="myth-q">❌ 「在車站連上不用密碼的免費公共 Wi-Fi，拿來輸入銀行帳號密碼最省流量又安全。」</div><div class="myth-a">✅ <b>公共 Wi-Fi 潛藏竊聽與偽造熱點風險</b>：未加密或來路不明的免費 Wi-Fi 容易被攔截封包；處理帳密與金融交易應改用個人行動網路，並確認網址開頭為加密的 <code>https://</code>。</div></div>
  </div>
</section>`;

  const printSys3 = {
    situation: "你在家用平板電腦想打開學校網站查課表，畫面卻一直轉圈圈打不開；奇怪的是，客廳的智慧電視卻還能透過同一個路由器操作區網投影。爸媽好奇地問你：「一個網頁請求到底是怎麼在網路世界旅行的？為什麼有時候連上 Wi-Fi 卻還是打不開網站？」請你化身「網路領航員」，用圖解為家人揭開 IP、DNS、路由器與雲端的運作祕密！",
    thinking: [
      "如果網路世界突然沒有了「DNS 伺服器（網域名稱系統）」，我們每天上網瀏覽網站時會遇到什麼大麻煩？",
      "當我們在網路上傳送一部 2GB 的高畫質影片時，為什麼系統要先把它切成成千上萬個「小封包（Packets）」分別傳送，而不是整部影片塞成一大包一次送出？",
      "比較「把檔案存在自己的隨身碟」與「使用 Google 文件等雲端服務（SaaS）共編」，雲端服務有哪些優勢？在沒有網路或使用公共 Wi-Fi 時又要注意什麼？"
    ],
    flowchart: "請畫出「在瀏覽器輸入 https://www.school.edu.tw 到螢幕顯示網頁」的封包旅程流程圖，至少標示四個角色：用戶端瀏覽器、DNS 伺服器、路由器（Router）、網站伺服器，並在連接箭頭上註明傳遞的關鍵資訊（查詢網址、回傳 IP 位址、發送請求封包、回傳網頁封包重組）。",
    rubric: [
      { c: "網路組成與媒介理解", a: "清楚說明網路三要素，並能準確比較光纖、雙絞線、Wi-Fi、藍牙與 LAN/WAN 差異", b: "能分辨有線與無線網路優缺點及基本網路設備功能", t: "混淆 Wi-Fi 與網際網路，或無法分辨傳輸媒介特性" },
      { c: "IP、DNS 與封包流程圖", a: "完整繪出先向 DNS 查 IP、再經路由器轉送封包至伺服器並回傳重組的正確順序", b: "能畫出主要連線角色與方向，僅 DNS 查詢先後細節略模糊", t: "缺少 DNS 或路由器角色，不清楚 IP 位址的作用" },
      { c: "雲端服務與連網安全", a: "能區分 SaaS/PaaS/IaaS 雲端模式，並具體指出 HTTPS 加密與公共 Wi-Fi 資安防護作法", b: "能舉出常見雲端服務實例並具備基本連網安全意識", t: "對雲端運作與公共網路風險缺乏正確觀念" }
    ]
  };

  const sys3EasyQs = [
    mkQ("e1", "記憶", "在網路世界中，負責把人類好記的「文字網址（如 www.edu.tw）」自動查詢並轉換成「數字 IP 位址」的網路電話簿服務稱為什麼？", ["DNS（網域名稱系統）", "CPU（中央處理器）", "USB（通用序列匯流排）", "PSU（電源供應器）"], 0, "DNS（Domain Name System）就像網路上的電話簿，負責將網域名稱解析為電腦通訊所需的數字 IP 位址。"),
    mkQ("e2", "記憶", "每一台連上網路的電腦或伺服器都有一組用來識別收發位置的數字編號（例如 `140.111.34.1`）。這組編號稱為什麼？", ["IP 位址（網路門牌號碼）", "檔案副檔名", "螢幕更新率", "硬碟轉速"], 0, "IP 位址（Internet Protocol Address）是裝置在網路上的邏輯門牌號碼，用於定位傳送與接收資料封包的對象。"),
    mkQ("e3", "理解", "打開瀏覽器就能直接線上使用 Google 文件、Canva 或網頁版信箱，不必在自己電腦安裝龐大軟體。這屬於哪一種網路應用？", ["雲端運算服務（SaaS 軟體即服務）", "離線單機遊戲", "純紙本印刷作業", "傳統機械算盤"], 0, "軟體與資料運行於遠端雲端伺服器，使用者透過瀏覽器連網即可直接使用軟體功能，屬於雲端服務中的 SaaS（Software as a Service）。")
  ];

  const sys3MediumQs = [
    mkQ("m1", "應用", "學校一間電腦教室內 35 台電腦透過交換器連接而成的內部網路，依網路涵蓋範圍分類屬於下列何者？", ["LAN（區域網路）", "PAN（個人區域網路）", "跨洲際海底廣域專線", "藍牙耳機配對網"], 0, "涵蓋單一教室、辦公室或單棟校園建築的網路稱為「區域網路（LAN, Local Area Network）」。"),
    mkQ("m2", "應用", "小安的平板顯示「已連上家裡的 Wi-Fi 且訊號滿格」，但所有網站卻都打不開。下列哪一個原因最可能造成這個現象？", ["家用 Wi-Fi 路由器通往電信業者的對外網路線（WAN）斷線或數據機沒開", "平板電腦的螢幕保護貼太厚", "平板的記憶體（RAM）容量太大", "藍牙耳機沒有充電"], 0, "Wi-Fi 滿格僅代表平板與家用路由器之間的無線區域連線正常；若路由器對外的網際網路線路中斷，仍無法連上外部網站。"),
    mkQ("m3", "理解", "大型檔案在網路上傳輸時，會先被拆分成許多編有順序的小單位分別傳送，抵達目的地後再重新組合。這些小單位稱為什麼？", ["封包（Packet）", "副檔名（Extension）", "像素（Pixel）", "磁區（Sector）"], 0, "網路採用「封包交換」技術，將資料切分為小封包（Packet），可避免單一巨型檔案霸占線路，且若某封包遺失只需重傳該小封包。"),
    mkQ("m4", "理解", "下列哪一種有線傳輸媒介是利用「光脈衝訊號」在玻璃纖維內全反射傳遞資料，具備極高頻寬、低衰減且不受電磁干擾的特性，常用於跨海電纜與高速主幹網路？", ["光纖（Optical Fiber）", "傳統電話銅線", "紅外線遙控器", "3.5mm 音源線"], 0, "光纖（Optical Fiber）以光訊號傳輸，速度快、距離遠且抗電磁干擾，是現代骨幹網路與海底電纜的核心媒介。")
  ];

  const sys3HardQs = [
    mkQ("h1", "理解", "瀏覽網站時，網址開頭的 `https://` 比傳統 `http://` 多了一個 `s`。關於兩者的核心差異，下列敘述何者正確？", ["HTTPS 會對瀏覽器與伺服器之間傳輸的資料進行加密（TLS/SSL），防止中途被竊聽或竄改", "HTTP 只能在智慧型手機上使用，HTTPS 只能在桌上型電腦使用", "HTTPS 代表該網站完全不需要使用 IP 位址", "兩者沒有任何安全性差別，只是字母拼法不同"], 0, "HTTPS 在 HTTP 通訊協定上加入 TLS/SSL 加密機制，能保護傳輸過程中的帳號密碼與敏感內容不被明文竊聽。"),
    mkQ("h2", "應用", "某新創團隊不想花大錢購買實體伺服器放機房，決定直接向雲端大廠「租用虛擬主機（VM）、儲存空間與網路基礎設施」，再自己安裝作業系統與架設網站。這屬於哪一種雲端服務模式？", ["SaaS（軟體即服務）", "IaaS（基礎設施即服務）", "PAN（個人區域網路）", "BIOS（基本輸入輸出系統）"], 1, "IaaS（Infrastructure as a Service）提供底層運算、儲存與網路等虛擬化基礎設施，由租用者自行管理作業系統與應用程式。"),
    mkQ("h3", "應用", "在百貨公司或車站搜尋到一個「免密碼、名稱近似知名店家」的免費公共 Wi-Fi 時，若要登入網路銀行轉帳，最安全的判斷與做法為何？", ["免費 Wi-Fi 最划算，應立刻連上並輸入所有信用卡號與網銀密碼", "公共未加密 Wi-Fi 可能為駭客架設的偽造熱點或易遭封包側錄；涉及敏感帳密時應關閉 Wi-Fi 改用個人行動網路，並確認 HTTPS 憑證與雙重驗證", "只要把手機螢幕調到最暗，駭客就看不到無線封包", "先把手機副檔名改掉就能安全連上免費 Wi-Fi"], 1, "不明公共 Wi-Fi 存在中間人攻擊（MITM）與偽造熱點風險；金融交易與敏感登入應使用可信賴的行動網路或加密 VPN，並開啟雙重驗證（2FA）。"),
    mkQ("h4", "分析", "小華在電腦測試網路時發現：在瀏覽器直接輸入某網站的數字 IP 位址（如 `http://140.111.34.1`）可以正常連上，但輸入英文網址 `http://www.edu.tw` 卻顯示找不到伺服器。請問問題最可能出在哪裡？", ["電腦背後的實體網路線完全斷裂", "電腦的 DNS 伺服器設定異常或 DNS 服務未回應，導致無法將英文網址解析為 IP 位址", "網站伺服器已經徹底關機停電", "電腦的顯示卡壞掉了"], 1, "直接輸入 IP 能通，證明本機網路卡、路由器與遠端伺服器連線皆正常；唯獨輸入網域名稱失敗，代表負責「網址轉 IP」的 DNS 環節異常。"),
    mkQ("h5", "理解", "隨著全球智慧型手機、電腦與數百億個物聯網（IoT）感測器連網，傳統 32 位元的「IPv4」位址（約 43 億個）面臨枯竭。網際網路工程界主要透過哪一項次世代協定來提供近乎無限的 IP 位址？", ["改用 128 位元位址長度的「IPv6」通訊協定", "把所有網址都改成 .zip 副檔名", "規定全世界的電腦每天只能輪流上網 5 分鐘", "全面退回使用真空管數據機"], 0, "IPv6 採用 128 位元位址空間（共 2¹²⁸ 個位址），能徹底解決 IPv4 位址不足的問題，滿足萬物連網（IoT）時代的需求。")
  ];

  const studyObjSys3 = { title: "網路運作與雲端服務", html: netStudy };
  const quizSys3 = buildQuiz(
    sys3EasyQs,
    sys3MediumQs,
    sys3HardQs,
    "認識 IP 位址、DNS 與雲端基本名詞。",
    "區分網路規模、傳輸媒介並判斷常見連線情境。",
    "深入分析 HTTPS 加密協定、雲端服務模式（SaaS/PaaS/IaaS）、DNS 故障診斷與 IPv6。"
  );

  window.CONTENT["sys-3"] = Object.assign({}, base3, {
    id: "sys-3",
    unit: base3.unit || "網路與雲端出航",
    study: studyObjSys3,
    learningContent: studyObjSys3,
    print: printSys3,
    lessonPlan: { lesson: base3.lesson, worksheet: base3.worksheet, print: printSys3 },
    quiz: quizSys3
  });
  window.ISLAND_HARDWARE["sys-3"] = window.CONTENT["sys-3"];


  /* ============================================================================
   * 單元五：sys-5 當電腦生病了（科學化故障排除五步驟、交叉測試與系統維護）
   * ============================================================================ */
  const fixStudy = `
<section class="study-sec">
  <h3>🩺 電腦科學化故障排除五步驟與決策樹圖解</h3>
  <p class="study-lead">遇到電腦「打不開、沒聲音、連不上網或軟體卡住」時，先別急著拍打機殼或重灌系統！優秀的「電腦急診室醫師」會遵循<b>觀察記錄 ➜ 縮小範圍 ➜ 由簡而繁（先外後內） ➜ 一次只改一個變因（交叉測試） ➜ 備份並尋求專業協助</b>的科學化流程來抓出真正病因。</p>
  <div class="hw-diagram" role="img" aria-label="電腦故障排除五步驟流程圖：1觀察與記錄症狀、2界定問題範圍、3由外而內由簡入繁檢查、4交叉測試驗證假設、5安全底線與專業報修">
    <svg viewBox="0 0 640 230" xmlns="http://www.w3.org/2000/svg">
      <rect x="4" y="4" width="632" height="222" rx="20" fill="#10375f" stroke="#7fb8e6" stroke-width="3"/>
      <text x="320" y="28" text-anchor="middle" fill="#d9fff0" font-size="13.5" font-weight="800">電腦急診室：科學化故障排除（Troubleshooting）標準流程</text>
      <g font-weight="800" text-anchor="middle" font-size="13">
        <rect x="14" y="50" width="108" height="72" rx="10" fill="#ffd166" stroke="#a87400" stroke-width="3"/>
        <text x="68" y="76" fill="#3a2a00">1 觀察症狀</text>
        <text x="68" y="95" font-size="10.5" fill="#3a2a00">拍下錯誤訊息</text>
        <text x="68" y="111" font-size="10" fill="#3a2a00">回想最近變更</text>

        <rect x="140" y="50" width="108" height="72" rx="10" fill="#7fb8ff" stroke="#0b5a99" stroke-width="3"/>
        <text x="194" y="76" fill="#04243f">2 界定範圍</text>
        <text x="194" y="95" font-size="10.5" fill="#04243f">電源？周邊線材？</text>
        <text x="194" y="111" font-size="10" fill="#04243f">單一軟體？網路？</text>

        <rect x="266" y="50" width="108" height="72" rx="10" fill="#7be0b0" stroke="#0c6f50" stroke-width="3"/>
        <text x="320" y="76" fill="#02301f">3 由簡而繁</text>
        <text x="320" y="95" font-size="10.5" fill="#02301f">先外後內檢查</text>
        <text x="320" y="111" font-size="10" fill="#02301f">重插線・看開關</text>

        <rect x="392" y="50" width="108" height="72" rx="10" fill="#c58bff" stroke="#6a2fb0" stroke-width="3"/>
        <text x="446" y="76" fill="#25063f">4 交叉測試</text>
        <text x="446" y="95" font-size="10.5" fill="#25063f">一次只改一變因</text>
        <text x="446" y="111" font-size="10" fill="#25063f">工作管理員排障</text>

        <rect x="518" y="50" width="108" height="72" rx="10" fill="#ff8a65" stroke="#a83a15" stroke-width="3"/>
        <text x="572" y="76" fill="#3d0f00">5 專業報修</text>
        <text x="572" y="95" font-size="10.5" fill="#3d0f00">不拆高壓零件</text>
        <text x="572" y="111" font-size="10" fill="#3d0f00">附完整紀錄求助</text>
      </g>
      <g fill="#fff" font-size="19" text-anchor="middle">
        <text x="131" y="92">➜</text><text x="257" y="92">➜</text><text x="383" y="92">➜</text><text x="509" y="92">➜</text>
      </g>
      <rect x="24" y="142" width="592" height="64" rx="12" fill="#0b2545" stroke="#4fb3ff" stroke-width="2"/>
      <text x="320" y="166" text-anchor="middle" fill="#ffd166" font-size="12.5" font-weight="800">💡 黃金診斷法：「交叉測試（Cross-Testing）」與「工作管理員（Ctrl + Shift + Esc）」</text>
      <text x="320" y="188" text-anchor="middle" fill="#d9fff0" font-size="11.5">把疑似故障的滑鼠改插到正常電腦測試，即可馬上分出是「滑鼠壞」還是「原本的 USB 孔壞」！</text>
    </svg>
  </div>
  <ul class="study-list">
    <li><b>先觀察再動手</b>：看清楚螢幕上的錯誤代碼、指示燈顏色（主機燈、螢幕燈、網路燈），並回想剛剛安裝或更動了什麼。</li>
    <li><b>由外而內、由簡而繁</b>：先檢查最簡單的外部電源開關、線材是否鬆脫、是否誤按靜音或飛航模式，最後才處理軟體與系統設定。</li>
    <li><b>一次只改一個變因（交叉測試）</b>：若同時拔換三條線又改五個設定，就算修好也不知道真正原因，還可能製造新問題。</li>
    <li><b>安全紅線</b>：遇到主機冒煙、燒焦味、電源供應器（PSU）或螢幕內部異常時，<b>嚴禁自行拿螺絲起子拆解</b>，應立即切斷電源並報修。</li>
  </ul>
</section>

<section class="study-sec">
  <h3>📊 電腦常見故障症狀、可能原因與標準排除對照表</h3>
  <div class="study-table-wrap">
  <table class="study-table">
    <tr><th>故障症狀</th><th>先觀察與縮小範圍</th><th>常見原因與建議排除步驟</th></tr>
    <tr><td>🖥️ 主機有運轉聲，但螢幕全黑無畫面</td><td>看「螢幕右下角電源燈」有沒有亮？</td><td>① 螢幕燈沒亮 ➜ 檢查螢幕電源開關與電源線；<br>② 螢幕燈有亮（閃爍）➜ 檢查 HDMI/顯示訊號線兩端是否插緊或選錯輸入訊號源</td></tr>
    <tr><td>🔇 播放影片完全沒有聲音</td><td>看系統右下角喇叭圖示與耳機插孔</td><td>① 檢查是否誤按「靜音」或播放器音量為 0；<br>② 確認音訊輸出裝置是否選對（喇叭 vs 耳機）；<br>③ 換另一副耳機進行交叉測試</td></tr>
    <tr><td>⏳ 單一程式畫面凍結「沒有回應」</td><td>滑鼠游標還能動嗎？其他視窗正常嗎？</td><td>不必拔電源線！按 <code>Ctrl + Shift + Esc</code> 開啟<b>工作管理員</b>，選取該無回應程式點選「結束工作」</td></tr>
    <tr><td>🐢 電腦越用越慢、無法存新檔案</td><td>檢查工作管理員效能頁與 C 槽剩餘空間</td><td>① 關閉背景過多閒置程式釋放 RAM；<br>② 清理資源回收筒與暫存檔，確保系統碟（SSD）保有足夠剩餘空間</td></tr>
    <tr><td>🌐 電腦無法連上網際網路</td><td>看鄰座電腦或手機能不能連上同一個網路？</td><td>① 只有自己連不上 ➜ 檢查本機網路線（RJ-45 燈號）、Wi-Fi 開關或飛航模式；<br>② 全家都連不上 ➜ 重啟數據機與路由器，或向電信商報修</td></tr>
    <tr><td>🦠 頻繁跳出奇怪中獎彈窗、首頁被綁架</td><td>回想是否點了不明連結或安裝免費外掛</td><td>立即移除可疑瀏覽器擴充功能、切斷網路並使用防毒軟體進行完整掃描</td></tr>
  </table>
  </div>
  <div class="flow-strip" aria-label="報修溝通四要素">
    <span>清楚報修四要素：1. 設備編號/型號</span><i>➜</i><span>2. 具體異常症狀與發生時機</span><i>➜</i><span>3. 錯誤訊息畫面截圖</span><i>➜</i><span>4. 已嘗試過的初步檢查</span>
  </div>
</section>

<section class="study-sec">
  <h3>⚠️ 常見迷思概念整理</h3>
  <div class="myth-grid">
    <div class="myth"><div class="myth-q">❌ 「只要某個遊戲或繪圖軟體卡住動不了，直接拔掉牆壁上的電腦電源插頭最快！」</div><div class="myth-a">✅ <b>強制斷電易傷硬碟與系統</b>：硬碟可能正在寫入資料，直接拔插頭會導致未存檔資料遺失甚至損毀系統磁區；應先用 <code>Ctrl + Shift + Esc</code> 工作管理員結束該程式。</div></div>
    <div class="myth"><div class="myth-q">❌ 「電腦開機變慢或視窗卡頓，百分之百一定是中了電腦病毒，只能馬上重灌！」</div><div class="myth-a">✅ <b>先查資源瓶頸而非盲目重灌</b>：開機自啟動軟體過多、RAM 空間不足、SSD 剩餘空間幾乎為 0 或散熱積灰降頻，都會讓電腦變慢，透過工作管理員即可快速診斷。</div></div>
    <div class="myth"><div class="myth-q">❌ 「重新開機只是敷衍人的招數，對解決問題一點科學根據都沒有。」</div><div class="myth-a">✅ <b>重開機能釋放記憶體與重置暫態錯誤</b>：許多軟體衝突或背景程序卡死留在 RAM 中，正常儲存後重新啟動能清空揮發性記憶體（RAM），是成本最低且有效的初階排障法。</div></div>
    <div class="myth"><div class="myth-q">❌ 「遇到問題時一口氣把設定全部亂改一遍、線全部拔掉重插，效率最高。」</div><div class="myth-a">✅ <b>一次只改一個變因</b>：同時改動多處會讓你無法判斷哪個動作有效，甚至把原本正常的設定改壞；科學排障講究逐項測試並記錄結果。</div></div>
  </div>
</section>`;

  const printSys5 = {
    situation: "資訊課剛開始，電腦教室裡突然傳來兩聲呼救——小華焦急地喊：「老師！我按下主機開機鍵，主機有亮燈，但螢幕全黑完全沒畫面！」坐在後排的小安也舉手：「我的繪圖軟體突然卡住顯示『沒有回應』，而且耳機完全沒聲音！」你受命擔任「電腦急診室」實習總醫師，請運用科學化故障排除五步驟與交叉測試法，幫同學們找出病因並開立安全處方箋！",
    thinking: [
      "面對小華「主機燈有亮、但螢幕全黑」的狀況，你會依序檢查哪三個最簡單的地方？為什麼要先看「螢幕自己的電源指示燈」？",
      "什麼叫做「交叉測試法（Cross-Testing）」？當小安懷疑是自己的耳機壞掉時，如何利用旁邊正常的電腦進行交叉測試來確認真兇？",
      "當遇到無法自行解決的故障需要向資訊老師或工程師「報修」時，提供哪些關鍵資訊比只說一句「電腦壞了」更能幫助快速修好電腦？"
    ],
    flowchart: "請畫出「電腦無法上網」或「螢幕無畫面」的故障診斷決策樹流程圖（使用菱形判斷框與「是／否」分支），至少包含 3 個由簡而繁的檢查節點（例如：檢查其他裝置能否上網 → 檢查本機網路線/飛航模式 → 檢查 DNS 或重啟路由器 → 記錄錯誤訊息報修）。",
    rubric: [
      { c: "科學化排障流程邏輯", a: "嚴格遵循觀察→縮小範圍→由簡而繁→一次改一變因的邏輯，決策樹分支完整清晰", b: "能列出合理的檢查步驟，僅先後順序略需調整", t: "毫無邏輯隨機亂試，或動輒主張直接拔插頭、重灌系統" },
      { c: "交叉測試與工具運用", a: "精準運用交叉測試法定位硬體故障點，並熟練使用工作管理員與磁碟檢查排解軟體問題", b: "理解交叉測試概念並能使用工作管理員關閉無回應程式", t: "無法區分硬體與軟體問題，不知如何使用系統內建排障工具" },
      { c: "安全規範與報修溝通", a: "嚴守電氣安全底線（不自行拆解電源或帶電插拔），並能撰寫具備四要素的專業報修紀錄", b: "具備基本安全意識，能描述主要故障現象", t: "忽略拆機危險，或報修時無法具體描述任何症狀" }
    ]
  };

  const sys5EasyQs = [
    mkQ("e1", "記憶", "在 Windows 作業系統中，當某一個應用程式突然卡住、標題顯示「（沒有回應）」，而滑鼠還能移動時，最恰當的處理方式為何？", ["按下 Ctrl + Shift + Esc 開啟「工作管理員」，選取該卡住的程式並點選「結束工作」", "直接拔掉牆壁上的電腦主機電源插頭", "拿鐵鎚敲打螢幕邊框", "把整顆硬碟格式化清空"], 0, "單一程式沒有回應時，可透過「工作管理員（Ctrl+Shift+Esc）」安全地強制結束該異常程序，避免直接斷電傷及硬碟與其他未存檔資料。"),
    mkQ("e2", "記憶", "按下桌上型電腦的主機電源鍵後，主機燈有亮且風扇有轉，但「螢幕全黑且螢幕右下角的電源指示燈完全沒亮」。此時最優先應檢查什麼？", ["螢幕本身的電源開關是否按開、以及螢幕電源線是否插緊", "主機裡面的 CPU 核心數夠不夠", "雲端硬碟的分享權限設定", "鍵盤的空白鍵有沒有卡住"], 0, "主機已通電而螢幕指示燈完全沒亮，代表螢幕本身未通電，應遵循「由簡而繁」原則先檢查螢幕電源開關與電源線。"),
    mkQ("e3", "理解", "遇到電腦或軟體故障時，為什麼第一時間要先「觀察並拍下螢幕上的錯誤訊息」？", ["錯誤訊息與發生時機是診斷病因的重要線索，有助於精準排查或提供工程師報修參考", "拍照可以讓電腦的記憶體容量自動變大", "這樣螢幕就會自動變亮", "完全沒有任何幫助"], 0, "錯誤代碼與訊息能直接指出是哪個檔案、驅動程式或連線環節異常，是科學化故障排除的第一步。")
  ];

  const sys5MediumQs = [
    mkQ("m1", "應用", "小安的電腦最近越來越慢，開啟檔案總管發現系統碟（C 槽）顯示紅色且剩餘空間不到 1%。最合適的處理方式為何？", ["清理資源回收筒、刪除不需要的暫存檔與大型舊檔（或搬移至外接硬碟/雲端），釋出儲存空間", "把螢幕的亮度調到最暗", "更換一個新的滑鼠墊", "把桌面背景換成白色圖片"], 0, "系統磁碟空間幾乎滿載會導致作業系統缺乏快取與虛擬記憶體周轉空間而嚴重卡頓，清理或擴充儲存空間才是根本解法。"),
    mkQ("m2", "應用", "瀏覽網頁時突然不斷跳出不明的中獎廣告視窗，且瀏覽器首頁被強制改成陌生網站。最可能的原因與對策為何？", ["遭到惡意廣告軟體或不良瀏覽器擴充功能綁架，應移除可疑擴充功能並以防毒軟體掃描", "電腦螢幕的液晶壞掉了，應更換螢幕", "CPU 的散熱風扇轉太快", "鍵盤沒有電了"], 0, "異常彈窗與首頁綁架是惡意軟體或惡意擴充外掛的典型症狀，應檢查瀏覽器外掛、重設設定並進行防毒掃描。"),
    mkQ("m3", "應用", "在教室裡，小宇發現自己的 18 號電腦連不上網際網路，但轉頭看左右鄰座同學的電腦都能正常上網。小宇據此可以做出什麼合理推論？", ["學校對外的總網路應該是正常的，問題較可能出在 18 號電腦自己的網路線鬆脫或本機設定異常", "全台灣的網際網路都斷線了", "18 號電腦的喇叭壞掉了", "一定是鍵盤壞了才會連不上網"], 0, "透過與同區網內鄰座正常電腦比對，可立即排除「全校對外網路斷線」的共同因素，將排查範圍縮小至本機線路與設定。"),
    mkQ("m4", "理解", "小華的有線滑鼠插在電腦 A 上完全不會動。他把這支滑鼠拔下來，改插到旁邊正常的電腦 B 上測試，結果滑鼠在電腦 B 上也完全不會動！這種診斷方法稱為什麼？結論為何？", ["稱為「交叉測試法」；結論是這支滑鼠本身故障了", "稱為「格式化法」；結論是電腦 B 也中毒了", "稱為「雲端備份法」；結論是螢幕壞了", "稱為「摩爾定律」；結論是網路太慢"], 0, "將疑似故障的周邊換到正常主機測試稱為「交叉測試（Cross-Testing）」，既然在正常電腦 B 上也不動，即可確認是滑鼠本身損壞。")
  ];

  const sys5HardQs = [
    mkQ("h1", "應用", "自從昨天安裝了一款來路不明的免費改圖軟體與新驅動程式後，電腦今天就頻繁出現「藍底白字當機畫面（BSOD）」。最有系統的排障做法是？", ["針對最近變更逐一回復（進入安全模式或將該軟體/驅動程式移除與還原），一次測試一項並觀察是否改善", "同時把主機板、CPU、硬碟全部拆下來重買", "用膠帶把螢幕藍色的地方貼起來繼續用", "完全不理會，不停強制按電源鍵開關機一百次"], 0, "故障緊接在特定軟體或驅動變更後發生，應遵循「回溯最近變更、一次只改一個變因」原則，移除或回滾該變更來驗證病因。"),
    mkQ("h2", "理解", "下列哪一項日常習慣最符合「資訊系統預防性維護與資安防護」的原則？", ["定期安裝作業系統與防毒更新、落實重要檔案異地備份，且不隨意點擊不明郵件附件", "為了省時間，永遠關閉系統更新與防火牆", "把所有帳號密碼用便利貼貼在螢幕正面", "把電腦出風口用厚毛巾緊緊蓋住防塵"], 0, "定期更新修補漏洞、定期備份（3-2-1 原則）與維持良好散熱，能大幅降低系統中毒、資料遺失與硬體過熱故障的機率。"),
    mkQ("h3", "應用", "夏天天氣炎熱，電腦執行 3D 遊戲十幾分鐘後，機殼風扇狂轉、機身異常發燙，隨後就「自動斷電關機」。最可能的原因與正確處置為何？", ["散熱不良（散熱孔積滿灰塵或機殼通風受阻）觸發 CPU 過熱保護機制；應關機斷電後清理散熱孔灰塵並保持機殼周圍通風", "因為網路速度太快害電腦頭暈，應拔掉網路線", "因為螢幕解析度太低，調高就不會發燙", "趁熱往主機殼裡面潑冰水降溫"], 0, "現代 CPU/GPU 設有過熱保護機制（Thermal Throttling / Shutdown），當散熱器積灰或通風不良導致溫度超標時會自動關機保護晶片。"),
    mkQ("h4", "分析", "小芸從雲端下載了同學傳來的檔案 `期末音樂會海報.psd`，雙擊卻跳出「Windows 無法開啟此檔案，請選擇要用來開啟的應用程式」。下列何者是最合理的原因與解法？", ["這顆硬碟已經徹底壞死，必須整台電腦報廢", "電腦目前未安裝支援 `.psd`（Photoshop 專用圖層檔）的軟體；可安裝對應繪圖軟體，或請同學另存匯出成通用的 `.png` / `.pdf` 格式", "只要把螢幕倒過來放就能打開", "因為檔案名稱有中文字所以中毒了"], 1, "作業系統依副檔名關聯開啟程式；當電腦未安裝專用格式（如 `.psd`）的軟體時便無法直接開啟，應安裝對應軟體或請對方匯出通用格式。"),
    mkQ("h5", "分析", "當電腦主機的「電源供應器（PSU）傳出燒焦味並冒出白煙」時，下列哪一個應變措施最安全且正確？", ["立即關閉插座總電源並拔除電源線、遠離機台保持通風，並通知老師或專業維修人員處理，絕不自行拆開電源供應器", "馬上拿螺絲起子拆開電源供應器外殼，用手觸摸裡面的高壓電容檢查", "繼續把遊戲打完再說", "把螢幕關掉就當作沒事了"], 0, "電源供應器（PSU）內部含有高壓電容，即使拔掉插頭仍可能殘留致命高壓電，且冒煙有起火風險，必須立即斷電並交由專業人員處理。")
  ];

  const studyObjSys5 = { title: "電腦故障判斷與簡易排除", html: fixStudy };
  const quizSys5 = buildQuiz(
    sys5EasyQs,
    sys5MediumQs,
    sys5HardQs,
    "認識基本故障觀察、電源檢查與工作管理員步驟。",
    "依症狀判斷硬碟空間、惡意彈窗、網路連線與交叉測試。",
    "整合性診斷變更回溯、過熱保護、副檔名關聯與高壓電氣安全底線。"
  );

  window.CONTENT["sys-5"] = Object.assign({}, base5, {
    id: "sys-5",
    unit: base5.unit || "當電腦生病了",
    study: studyObjSys5,
    learningContent: studyObjSys5,
    print: printSys5,
    lessonPlan: { lesson: base5.lesson, worksheet: base5.worksheet, print: printSys5 },
    quiz: quizSys5
  });
  window.ISLAND_HARDWARE["sys-5"] = window.CONTENT["sys-5"];

  /* 同步支援 hw-1 ~ hw-5 別名索引，並執行全單元題數自我校驗（3 / 4 / 5） */
  ["1", "2", "3", "4", "5"].forEach((n) => {
    const u = window.CONTENT[`sys-${n}`];
    window.CONTENT[`hw-${n}`] = u;
    window.ISLAND_HARDWARE[`hw-${n}`] = u;
    if (
      !u ||
      !u.quiz ||
      u.quiz.easy.length !== 3 ||
      u.quiz.medium.length !== 4 ||
      u.quiz.hard.length !== 5 ||
      u.quiz.levels.easy.questions.length !== 3 ||
      u.quiz.levels.medium.questions.length !== 4 ||
      u.quiz.levels.hard.questions.length !== 5
    ) {
      throw new Error(`Unit sys-${n} quiz length validation failed!`);
    }
  });
})();
