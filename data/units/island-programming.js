/**
 * 程式森林島（code / prog）· 第 1 批次單元教材擴充
 * ---------------------------------------------------------------
 * 本批次包含以下 2 個單元：
 *   - prog-1（同步對應 code-1）：程式基本概念、變數與資料型態
 *   - prog-2（同步對應 code-2）：運算子與條件判斷分支結構 if-else
 *
 * 資料結構相容於 data/units/island-hardware.js：
 *   - study     : 【📖 學習內容】條列重點、核心概念 SVG 圖解、對照表格、易混淆迷思
 *   - lesson    : 【📝 教案綱要】教學目標、教學流程、差異化教學、評量規準
 *   - worksheet : 【📝 課堂學習單】暖身、理解、應用與反思
 *   - print     : 【🖨️ A4 列印版實作引導與評量規準（Rubric）】
 *   - quiz      : 【🎯 分級測驗】easy（3 題）、medium（4 題）、hard（5 題），均含 options、answer、explanation / explain
 */
window.CONTENT = window.CONTENT || {};
window.ISLAND_PROGRAMMING = window.ISLAND_PROGRAMMING || {};

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
   * 單元一：prog-1（程式基本概念、變數與資料型態）
   * ============================================================================ */
  const studyProg1 = `
<section class="study-sec">
  <h3>📦 程式基本概念與「變數收納盒」圖解</h3>
  <p class="study-lead">「程式（Program）」是人類用電腦能理解的語法所寫下的一連串明確指令；而「變數（Variable）」則像貼上標籤的資料收納盒，用來在記憶體中儲存並隨時更新遊戲分數、角色座標或玩家姓名等資料。</p>
  <div class="hw-diagram" role="img" aria-label="程式 IPO 流程與變數收納盒圖解：左側為輸入、處理、輸出流程，右側為整數、浮點數、字串、布林值四種資料型態收納盒">
    <svg viewBox="0 0 640 260" xmlns="http://www.w3.org/2000/svg">
      <rect x="4" y="4" width="632" height="252" rx="20" fill="#10375f" stroke="#7fb8e6" stroke-width="3"/>
      <text x="165" y="30" text-anchor="middle" fill="#d9fff0" font-size="14" font-weight="800">程式運作流程（IPO 模型）</text>
      <text x="465" y="30" text-anchor="middle" fill="#d9fff0" font-size="14" font-weight="800">記憶體中的「變數收納盒」與資料型態</text>
      <g font-weight="800" font-size="13" text-anchor="middle">
        <rect x="30" y="48" width="260" height="44" rx="10" fill="#ffd166" stroke="#a87400" stroke-width="2.5"/>
        <text x="160" y="75" fill="#3a2a00">1. 事件觸發 / 輸入（Input）</text>
        <rect x="30" y="116" width="260" height="44" rx="10" fill="#4fb3ff" stroke="#0b5a99" stroke-width="2.5"/>
        <text x="160" y="143" fill="#04243f">2. 變數存取與運算處理（Process）</text>
        <rect x="30" y="184" width="260" height="44" rx="10" fill="#7be0b0" stroke="#0c6f50" stroke-width="2.5"/>
        <text x="160" y="211" fill="#02301f">3. 畫面動作 / 輸出（Output）</text>
        <path d="M160 92 V116 M160 160 V184" stroke="#fff" stroke-width="3" stroke-dasharray="4 4"/>
      </g>
      <g font-weight="800" text-anchor="middle">
        <rect x="325" y="48" width="135" height="82" rx="12" fill="#ff8a65" stroke="#a83a15" stroke-width="2.5"/>
        <text x="392" y="70" font-size="12" fill="#3d0f00">變數名稱：score</text>
        <text x="392" y="98" font-size="20" fill="#fff">100</text>
        <text x="392" y="118" font-size="11" fill="#3d0f00">整數 (int)</text>

        <rect x="475" y="48" width="135" height="82" rx="12" fill="#ffd166" stroke="#a87400" stroke-width="2.5"/>
        <text x="542" y="70" font-size="12" fill="#3a2a00">變數名稱：height</text>
        <text x="542" y="98" font-size="20" fill="#3a2a00">158.5</text>
        <text x="542" y="118" font-size="11" fill="#3a2a00">浮點數 (float)</text>

        <rect x="325" y="146" width="135" height="82" rx="12" fill="#c58bff" stroke="#6a2fb0" stroke-width="2.5"/>
        <text x="392" y="168" font-size="12" fill="#25063f">變數名稱：player</text>
        <text x="392" y="196" font-size="17" fill="#fff">"小安"</text>
        <text x="392" y="216" font-size="11" fill="#25063f">字串 (str)</text>

        <rect x="475" y="146" width="135" height="82" rx="12" fill="#7be0b0" stroke="#0c6f50" stroke-width="2.5"/>
        <text x="542" y="168" font-size="12" fill="#02301f">變數名稱：is_pass</text>
        <text x="542" y="196" font-size="18" fill="#02301f">True</text>
        <text x="542" y="216" font-size="11" fill="#02301f">布林值 (bool)</text>
      </g>
    </svg>
  </div>
  <ul class="study-list">
    <li><b>程式與指令循序性</b>：電腦會嚴格按照程式由上往下的順序逐步執行；在積木環境中需以「事件積木（如點擊綠旗）」作為啟動起點。</li>
    <li><b>變數賦值（Assignment）</b>：在程式中寫 <code>score = 80</code>（或積木「將變數 score 設為 80」），代表把右邊的資料 <code>80</code> 放進左邊名為 <code>score</code> 的盒子裡，並覆蓋舊值。</li>
    <li><b>變數命名規則</b>：只能使用字母、數字與底線 <code>_</code>，<b>不能以數字開頭</b>、不能包含空白，也不能使用系統保留字（如 <code>if</code>、<code>for</code>）；建議採具意義的名稱（如 <code>user_age</code>）。</li>
    <li><b>狀態初始化（Initialization）</b>：在程式最開頭先為變數與角色座標設定初始值（例如 <code>score = 0</code>），確保每次重播都從正確狀態開始。</li>
  </ul>
</section>

<section class="study-sec">
  <h3>📊 四大基本資料型態與積木/文字語法對照表</h3>
  <div class="study-table-wrap">
  <table class="study-table">
    <tr><th>資料型態</th><th>英文縮寫</th><th>資料特徵與範例</th><th>Scratch 積木對應</th><th>Python 語法與型態轉換</th></tr>
    <tr><td>🔢 整數</td><td><code>int</code></td><td>不含小數點的正負整數與 0<br>例：<code>0</code>、<code>25</code>、<code>-10</code></td><td><code>將 [得分] 設為 (0)</code></td><td><code>score = 0</code><br>轉型：<code>int("25")</code></td></tr>
    <tr><td>💧 浮點數</td><td><code>float</code></td><td>帶有小數點的數值<br>例：<code>3.14</code>、<code>36.5</code></td><td><code>將 [體溫] 設為 (36.5)</code></td><td><code>temp = 36.5</code><br>轉型：<code>float("36.5")</code></td></tr>
    <tr><td>🔤 字串</td><td><code>str</code></td><td>用單引號或雙引號包住的文字<br>例：<code>"Hello"</code>、<code>"123"</code></td><td><code>說 ("你好！") (2) 秒</code></td><td><code>name = "小安"</code><br>轉型：<code>str(100)</code></td></tr>
    <tr><td>⚖️ 布林值</td><td><code>bool</code></td><td>只有「真」與「假」兩種狀態<br>例：<code>True</code>、<code>False</code></td><td>六角形條件積木<br><code>&lt;分數 &gt; 60&gt;</code></td><td><code>is_alive = True</code><br>轉型：<code>bool(1)</code></td></tr>
  </table>
  </div>
  <div class="flow-strip" aria-label="輸入轉型與運算流程">
    <span>input() 讀取使用者輸入（預設為 str 字串）</span><i>➜</i><span>int() / float() 轉換為數值</span><i>➜</i><span>進行數學計算</span><i>➜</i><span>print() 輸出結果</span>
  </div>
</section>

<section class="study-sec">
  <h3>⚠️ 易混淆迷思與常見錯誤整理</h3>
  <div class="myth-grid">
    <div class="myth"><div class="myth-q">❌ 「程式裡的 <code>x = x + 1</code> 在數學上根本不成立，是寫錯了吧？」</div><div class="myth-a">✅ <b>單等號 <code>=</code> 是「賦值（存入）」而非相等</b>：電腦會先算出等號右邊的 <code>x + 1</code>，再把結果存回左邊的變數 <code>x</code>（相當於積木「將變數 x 改變 1」）。</div></div>
    <div class="myth"><div class="myth-q">❌ 「<code>"50" + "20"</code> 算出來的結果一定是 <code>70</code>！」</div><div class="myth-a">✅ <b>字串串接 vs 數值相加</b>：加上引號的 <code>"50"</code> 是文字（字串 <code>str</code>），兩個字串相加會直接頭尾拼接成 <code>"5020"</code>；去掉引號的 <code>50 + 20</code> 才會算出數值 <code>70</code>。</div></div>
    <div class="myth"><div class="myth-q">❌ 「一個變數盒子可以同時裝好幾個歷史數字，舊的數字不會不見。」</div><div class="myth-a">✅ <b>新值覆蓋舊值</b>：單一變數一次只能保存一個值。當執行 <code>a = 10</code> 後再執行 <code>a = 25</code>，原本的 <code>10</code> 就會被覆蓋消失。</div></div>
    <div class="myth"><div class="myth-q">❌ 「用 <code>input()</code> 輸入身高體重後，可以直接拿來相除算 BMI。」</div><div class="myth-a">✅ <b>輸入預設型態為字串</b>：<code>input()</code> 讀進來的資料一律是字串（<code>str</code>），必須先用 <code>int()</code> 或 <code>float()</code> 轉成數值才能做加減乘除。</div></div>
  </div>
</section>`;

  const lessonProg1 = {
    title: "程式基本概念、變數與資料型態",
    overview: "本單元從「程式是明確的指令步驟」與 IPO（輸入—處理—輸出）模型出發，帶領學生認識積木與文字程式環境中的變數概念、命名規則，以及整數（int）、浮點數（float）、字串（str）、布林值（bool）四大基本資料型態，並動手完成互動角色自我介紹與個人數值小工具。",
    standards: ["資P-IV-1", "資P-IV-2", "運t-IV-3", "運t-IV-4"],
    objectives: [
      "能說明程式語言的功能與 IPO（輸入—處理—輸出）運作流程。",
      "能正確命名變數，並區分「將變數設為（賦值 =）」與「將變數改變（累加 +=）」的差異。",
      "能辨識整數（int）、浮點數（float）、字串（str）與布林值（bool）四種基本資料型態。",
      "能運用輸入、型態轉換與變數運算，設計並測試一個互動資訊小工具。"
    ],
    prep: [
      "教師：電腦教室（Scratch 與 Python IDE 環境）、貼有標籤的實體透明收納盒教具、投影設備。",
      "學生：每人一台電腦、A4 實作引導學習單。"
    ],
    flow: [
      { phase: "引起動機", min: 10, teacher: "拿出貼有「score」標籤的透明收納盒，示範放入分數卡與更換分數卡，提問：「遊戲是怎麼記住玩家現在幾分的？」", student: "觀察教具示範，理解變數如同貼有標籤且一次存放一個值的收納盒。" },
      { phase: "發展活動一：程式概念與變數操作", min: 25, teacher: "講解程式循序執行、初始化的重要性，對比 Scratch「設為 / 改變」積木與 Python `score = 0`、`score = score + 10` 語法。", student: "上機練習變數初始化與數值更新，追蹤每一步執行後的變數變化。" },
      { phase: "發展活動二：四大資料型態與轉型", min: 30, teacher: "示範 `int`、`float`、`str`、`bool` 四種型態，並透過 `\"50\" + \"20\"` 與 `50 + 20` 的對比實驗，說明 `input()` 搭配 `int()` / `float()` 轉型的必要性。", student: "實測不同資料型態的運算結果，完成型態辨識與轉型練習。" },
      { phase: "實作挑戰：角色迎新與數值小管家", min: 25, teacher: "發布實作任務：設計能詢問使用者姓名、身高與體重（或購買商品數量），存入對應型態變數並計算輸出結果的互動程式。", student: "依學習單規劃變數表與流程圖，撰寫程式並與同儕交換測試除錯。" }
    ],
    differentiation: "補救教學：提供已標註型態轉換位置的程式填空範本。加深加廣：挑戰同時結合字串格式化（f-string 或字串合併積木）與浮點數四捨五入輸出。",
    assessmentFocus: "能否正確區分四大資料型態、遵循變數命名規則，並正確處理輸入轉型與變數賦值。",
    extension: "觀察一款日常使用的手機 App，列出其中至少 4 個背後需要用變數儲存的資料及其對應的資料型態。"
  };

  const worksheetProg1 = {
    title: "程式森林探險單（一）：變數收納盒與資料型態大解密",
    intro: "歡迎來到程式森林島！在開始打造互動程式之前，我們要先學會如何用「變數」幫電腦記住重要資訊，並分清楚數字與文字的型態差異。",
    sections: [
      {
        title: "一、暖身：認識指令與變數",
        items: [
          { type: "fill", q: "在程式設計中，用來儲存資料、有專屬名稱且內容可以隨時更新的記憶體空間，稱為「____」；在遊戲剛開始時先把分數設為 0 的動作稱為「____化」。", answer: "變數、初始" },
          { type: "short", q: "下列四個變數名稱：`player_1`、`2nd_score`、`totalScore`、`my age`，哪兩個是「不合法」的？為什麼？", hint: "檢查開頭字元與是否包含空白。", answer: "`2nd_score` 不合法（不能以數字開頭）、`my age` 不合法（變數名稱中間不能有空白）。" }
        ]
      },
      {
        title: "二、理解：資料型態與變數追蹤",
        items: [
          { type: "table", q: "請判斷下列資料屬於哪一種資料型態（填入 int、float、str 或 bool）：(1) `2026` (2) `\"2026\"` (3) `37.2` (4) `False`。", answer: "(1) 2026 為 int（整數）；(2) \"2026\" 有引號為 str（字串）；(3) 37.2 有小數點為 float（浮點數）；(4) False 為 bool（布林值）。" },
          { type: "short", q: "請逐步追蹤下列程式執行完畢後，變數 `a` 與 `b` 的最終值分別是多少？\n`a = 10`\n`b = a + 5`\n`a = 20`", answer: "第一行 a 為 10；第二行 b 為 10 + 5 = 15；第三行將 a 覆蓋為 20（此時 b 不會重算）。因此最終 a = 20，b = 15。" }
        ]
      },
      {
        title: "三、應用與反思：設計互動資訊小工具",
        items: [
          { type: "draw", q: "請規劃一個「園遊會找零小幫手」或「BMI 計算機」的 IPO 流程圖，標明需要建立哪些變數、各自的資料型態，以及輸入→計算→輸出的步驟。", answer: "輸入：商品單價 price (int)、購買數量 qty (int)、付現金額 paid (int) → 處理：total = price * qty，change = paid - total → 輸出：印出應找金額 change。" },
          { type: "reflect", q: "如果在 Python 中寫 `age = input(\"請輸入年齡：\")` 接著直接算 `age + 1` 會發生什麼錯誤？你該如何修正？", answer: "`input()` 回傳的是 `str` 字串，不能直接與整數 `1` 相加（會發生 TypeError）；應改為 `age = int(input(\"請輸入年齡：\"))`。" }
        ]
      }
    ]
  };

  const printProg1 = {
    situation: "學校園遊會即將登場，班上攤位需要一套「智慧點餐與找零小幫手」程式。請你規劃程式所需的變數（例如顧客暱稱、訂購杯數、單價、折扣率、是否自備環保杯），選擇正確的資料型態，並完成輸入、計算與畫面輸出！",
    thinking: [
      "顧客輸入的「訂購杯數」與「顧客暱稱」分別屬於什麼資料型態？為什麼兩者不能直接用加號算總和？",
      "當下一位顧客上門點餐時，哪些變數必須重新「初始化（設為初始值）」，才不會把上一位顧客的金額算進來？",
      "在程式中寫 `total = total - 5` 代表什麼意思？請用「變數收納盒」的概念解釋給同學聽。"
    ],
    flowchart: "請畫出「智慧點餐與找零小幫手」的 IPO 流程圖：開始與變數初始化 → 輸入顧客姓名(str)與購買數量(int) → 轉換型態並計算總價 `total = price * count` → 輸出點餐明細與應付金額，並在各節點旁標註變數名稱與資料型態。",
    rubric: [
      { c: "變數命名與初始化", a: "變數命名具語意且完全符合語法規則，開頭正確完成所有變數初始化", b: "變數命名合法且能運作，僅少數命名語意較不清楚", t: "變數命名違反規則（如數字開頭）或未初始化導致結果異常" },
      { c: "資料型態與轉換正確性", a: "正確區分並運用 int、float、str、bool，輸入轉型與運算完全正確", b: "主要數值與字串處理正確，僅小數或字串拼接格式微偏", t: "混淆字串與數值導致程式發生型態錯誤（TypeError）無法執行" },
      { c: "IPO 流程與測試除錯", a: "輸入、處理、輸出結構完整清晰，並以多組測試資料驗證無誤", b: "能完成基本輸入與計算輸出，經提示可修正小錯誤", t: "程式流程中斷或無法完成指定計算輸出" }
    ]
  };

  const prog1EasyQuestions = [
    {
      id: "prog1-e1",
      level: "記憶",
      type: "single",
      q: "在程式設計中，用來在記憶體裡儲存資料、擁有專屬名稱且數值可以隨時更新的容器稱為什麼？",
      question: "在程式設計中，用來在記憶體裡儲存資料、擁有專屬名稱且數值可以隨時更新的容器稱為什麼？",
      options: ["變數（Variable）", "螢幕（Monitor）", "滑鼠（Mouse）", "印表機（Printer）"],
      answer: 0,
      explain: "變數（Variable）就像貼上名稱標籤的資料收納盒，用來在程式執行期間儲存並隨時更新各類資料。",
      explanation: "變數（Variable）就像貼上名稱標籤的資料收納盒，用來在程式執行期間儲存並隨時更新各類資料。"
    },
    {
      id: "prog1-e2",
      level: "記憶",
      type: "single",
      q: "下列哪一個資料在程式語言（如 Python）中屬於「字串（str）」資料型態？",
      question: "下列哪一個資料在程式語言（如 Python）中屬於「字串（str）」資料型態？",
      options: ["100", "3.14", "\"Hello\"", "True"],
      answer: 2,
      explain: "以單引號或雙引號包住的文字（如 \"Hello\"）屬於字串（str）；100 為整數（int），3.14 為浮點數（float），True 為布林值（bool）。",
      explanation: "以單引號或雙引號包住的文字（如 \"Hello\"）屬於字串（str）；100 為整數（int），3.14 為浮點數（float），True 為布林值（bool）。"
    },
    {
      id: "prog1-e3",
      level: "理解",
      type: "single",
      q: "在 Scratch 或 Python 遊戲剛啟動時，先執行「將變數 score 設為 0（`score = 0`）」，這個動作的主要目的為何？",
      question: "在 Scratch 或 Python 遊戲剛啟動時，先執行「將變數 score 設為 0（`score = 0`）」，這個動作的主要目的為何？",
      options: ["把電腦硬碟格式化清空", "進行狀態初始化，避免上一局殘留的分數影響新的一局", "讓電腦螢幕變亮", "永遠禁止分數再改變"],
      answer: 1,
      explain: "在程式開頭設定變數初始值稱為「初始化（Initialization）」，能確保每次重新執行時都從正確的起點狀態開始。",
      explanation: "在程式開頭設定變數初始值稱為「初始化（Initialization）」，能確保每次重新執行時都從正確的起點狀態開始。"
    }
  ];

  const prog1MediumQuestions = [
    {
      id: "prog1-m1",
      level: "理解",
      type: "single",
      q: "根據常見程式語言（如 Python）的變數命名規則，下列哪一個變數名稱是「合法且正確」的？",
      question: "根據常見程式語言（如 Python）的變數命名規則，下列哪一個變數名稱是「合法且正確」的？",
      options: ["1st_player", "user name", "total_score", "if"],
      answer: 2,
      explain: "`total_score` 僅使用英文字母與底線，符合命名規則；`1st_player` 以數字開頭不合法、`user name` 含空白不合法、`if` 為系統保留字不可作為變數名稱。",
      explanation: "`total_score` 僅使用英文字母與底線，符合命名規則；`1st_player` 以數字開頭不合法、`user name` 含空白不合法、`if` 為系統保留字不可作為變數名稱。"
    },
    {
      id: "prog1-m2",
      level: "應用",
      type: "single",
      q: "依序執行下列三行程式後，變數 `x` 的最終數值是多少？\n`x = 10`\n`x = 25`\n`x = x + 5`",
      question: "依序執行下列三行程式後，變數 `x` 的最終數值是多少？\n`x = 10`\n`x = 25`\n`x = x + 5`",
      options: ["15", "25", "30", "40"],
      answer: 2,
      explain: "第一行 x 設為 10；第二行新值 25 覆蓋舊值使 x 變為 25；第三行先算右邊 25 + 5 = 30 再存回 x，故最終 x 為 30。",
      explanation: "第一行 x 設為 10；第二行新值 25 覆蓋舊值使 x 變為 25；第三行先算右邊 25 + 5 = 30 再存回 x，故最終 x 為 30。"
    },
    {
      id: "prog1-m3",
      level: "應用",
      type: "single",
      q: "在 Python 中執行 `print(\"12\" + \"34\")` 與 `print(12 + 34)`，螢幕上輸出的結果分別為何？",
      question: "在 Python 中執行 `print(\"12\" + \"34\")` 與 `print(12 + 34)`，螢幕上輸出的結果分別為何？",
      options: ["都是 46", "都是 1234", "前者輸出 1234，後者輸出 46", "前者輸出 46，後者輸出 1234"],
      answer: 2,
      explain: "`\"12\"` 與 `\"34\"` 有雙引號，屬於字串（str），相加會進行文字串接得到 `\"1234\"`；`12` 與 `34` 為整數（int），相加為數值運算得到 `46`。",
      explanation: "`\"12\"` 與 `\"34\"` 有雙引號，屬於字串（str），相加會進行文字串接得到 `\"1234\"`；`12` 與 `34` 為整數（int），相加為數值運算得到 `46`。"
    },
    {
      id: "prog1-m4",
      level: "理解",
      type: "single",
      q: "關於「布林值（Boolean, `bool`）」資料型態，下列敘述何者正確？",
      question: "關於「布林值（Boolean, `bool`）」資料型態，下列敘述何者正確？",
      options: ["專門用來儲存帶有小數點的圓周率數值", "只有 `True`（真）與 `False`（假）兩種值，常用於表示條件是否成立", "可以儲存無限長度的文章段落", "必須加上雙引號才算布林值"],
      answer: 1,
      explain: "布林值（bool）僅有 `True` 與 `False` 兩種狀態，是條件判斷與邏輯控制的核心資料型態。",
      explanation: "布林值（bool）僅有 `True` 與 `False` 兩種狀態，是條件判斷與邏輯控制的核心資料型態。"
    }
  ];

  const prog1HardQuestions = [
    {
      id: "prog1-h1",
      level: "分析",
      type: "single",
      q: "依序執行下列程式碼後，變數 `a` 與 `b` 的值分別是多少？\n`a = 6`\n`b = a`\n`a = a + 4`\n`b = a - 2`",
      question: "依序執行下列程式碼後，變數 `a` 與 `b` 的值分別是多少？\n`a = 6`\n`b = a`\n`a = a + 4`\n`b = a - 2`",
      options: ["a = 6, b = 4", "a = 10, b = 6", "a = 10, b = 8", "a = 8, b = 8"],
      answer: 2,
      explain: "逐行追蹤：(1) a = 6；(2) b = 6；(3) a = 6 + 4 = 10；(4) b = 10 - 2 = 8。最終 a = 10、b = 8。",
      explanation: "逐行追蹤：(1) a = 6；(2) b = 6；(3) a = 6 + 4 = 10；(4) b = 10 - 2 = 8。最終 a = 10、b = 8。"
    },
    {
      id: "prog1-h2",
      level: "應用",
      type: "single",
      q: "小華寫了一支計算正方形周長的 Python 程式：\n`side = input(\"請輸入邊長：\")`\n`ans = side * 4`\n`print(ans)`\n當使用者輸入 `5` 時，螢幕卻印出 `5555` 而非 `20`。原因與修正方式為何？",
      question: "小華寫了一支計算正方形周長的 Python 程式：\n`side = input(\"請輸入邊長：\")`\n`ans = side * 4`\n`print(ans)`\n當使用者輸入 `5` 時，螢幕卻印出 `5555` 而非 `20`。原因與修正方式為何？",
      options: ["因為 `*` 代表加法；應改成 `side + 4`", "因為 `input()` 讀入的資料預設為字串 `\"5\"`，字串乘以 4 會重複印出四次；應改用 `side = int(input(\"請輸入邊長：\"))` 先轉為整數", "因為 Python 不能做乘法運算", "因為變數名稱不能叫做 `side`"],
      answer: 1,
      explain: "`input()` 取得的一律是字串（`str`），`\"5\" * 4` 在 Python 中會將字串重複 4 次變成 `\"5555\"`；需以 `int()` 或 `float()` 轉為數值才能進行算術乘法。",
      explanation: "`input()` 取得的一律是字串（`str`），`\"5\" * 4` 在 Python 中會將字串重複 4 次變成 `\"5555\"`；需以 `int()` 或 `float()` 轉為數值才能進行算術乘法。"
    },
    {
      id: "prog1-h3",
      level: "分析",
      type: "single",
      q: "已知變數 `x = 10`、`y = 99`。若想將 `x` 與 `y` 兩個變數盒子的內容「互相交換」，下列哪一段透過暫存變數 `temp` 的作法是正確的？",
      question: "已知變數 `x = 10`、`y = 99`。若想將 `x` 與 `y` 兩個變數盒子的內容「互相交換」，下列哪一段透過暫存變數 `temp` 的作法是正確的？",
      options: ["`x = y` 接著 `y = x`", "`temp = x` → `x = y` → `y = temp`", "`temp = x` → `y = temp` → `x = temp`", "`x = 10` → `y = 10`"],
      answer: 1,
      explain: "若直接寫 `x = y`，原本 `x` 裡的 `10` 會立刻被覆蓋消失；必須先用 `temp = x` 備份 `10`，再執行 `x = y`（x 變 99），最後 `y = temp`（y 變 10）才能完成交換。",
      explanation: "若直接寫 `x = y`，原本 `x` 裡的 `10` 會立刻被覆蓋消失；必須先用 `temp = x` 備份 `10`，再執行 `x = y`（x 變 99），最後 `y = temp`（y 變 10）才能完成交換。"
    },
    {
      id: "prog1-h4",
      level: "應用",
      type: "single",
      q: "在 Python 中執行 `a = int(3.9)` 與 `b = str(25) + str(5)` 後，變數 `a` 與 `b` 的值分別為何？",
      question: "在 Python 中執行 `a = int(3.9)` 與 `b = str(25) + str(5)` 後，變數 `a` 與 `b` 的值分別為何？",
      options: ["`a` 為 `4`，`b` 為 `30`", "`a` 為 `3`，`b` 為 `\"255\"`", "`a` 為 `3.9`，`b` 為 `\"30\"`", "程式會發生語法錯誤"],
      answer: 1,
      explain: "`int(3.9)` 會無條件捨去小數部分轉為整數 `3`；`str(25) + str(5)` 是將兩個字串 `\"25\"` 與 `\"5\"` 串接為 `\"255\"`。",
      explanation: "`int(3.9)` 會無條件捨去小數部分轉為整數 `3`；`str(25) + str(5)` 是將兩個字串 `\"25\"` 與 `\"5\"` 串接為 `\"255\"`。"
    },
    {
      id: "prog1-h5",
      level: "分析",
      type: "single",
      q: "小妍在程式中寫下 `price = 100`、`discount = 0.8`、`final_price = price * discount`。請問 `price`、`discount`、`final_price` 三個變數在 Python 中的資料型態依序為何？",
      question: "小妍在程式中寫下 `price = 100`、`discount = 0.8`、`final_price = price * discount`。請問 `price`、`discount`、`final_price` 三個變數在 Python 中的資料型態依序為何？",
      options: ["int、int、int", "int、float、int", "int、float、float", "str、float、float"],
      answer: 2,
      explain: "`100` 為整數（`int`），`0.8` 為浮點數（`float`），而整數 `int` 與浮點數 `float` 相乘後的結果 `80.0` 會自動提升為浮點數（`float`）。",
      explanation: "`100` 為整數（`int`），`0.8` 為浮點數（`float`），而整數 `int` 與浮點數 `float` 相乘後的結果 `80.0` 會自動提升為浮點數（`float`）。"
    }
  ];

  const quizProg1 = {
    passScore: 60,
    easy: prog1EasyQuestions,
    medium: prog1MediumQuestions,
    hard: prog1HardQuestions,
    levels: {
      easy: {
        label: "入門探險家",
        icon: "🧭",
        badge: null,
        desc: "認識程式基本概念、變數作用與四大基本資料型態。",
        questions: prog1EasyQuestions
      },
      medium: {
        label: "進階挑戰者",
        icon: "🧰",
        badge: "silver",
        desc: "掌握變數命名規則、賦值追蹤與字串/數值運算差異。",
        questions: prog1MediumQuestions
      },
      hard: {
        label: "大師領航員",
        icon: "👑",
        badge: "gold",
        desc: "深入分析多變數連動追蹤、輸入型態轉換與交換演算法。",
        questions: prog1HardQuestions
      }
    }
  };

  const unitProg1 = {
    id: "prog-1",
    unit: "程式基本概念、變數與資料型態",
    study: { title: "程式基本概念、變數與資料型態", html: studyProg1 },
    learningContent: { title: "程式基本概念、變數與資料型態", html: studyProg1 },
    lesson: lessonProg1,
    worksheet: worksheetProg1,
    print: printProg1,
    lessonPlan: { lesson: lessonProg1, worksheet: worksheetProg1, print: printProg1 },
    quiz: quizProg1
  };


  /* ============================================================================
   * 單元二：prog-2（運算子與條件判斷分支結構 if-else）
   * ============================================================================ */
  const studyProg2 = `
<section class="study-sec">
  <h3>🔀 運算子與條件判斷分支結構（if / elif / else）圖解</h3>
  <p class="study-lead">程式不只能照順序一行行往下走，還能透過「比較運算子」與「邏輯運算子」構成條件判斷式（回傳布林值 <code>True</code> 或 <code>False</code>），讓程式在菱形決策點自動選擇正確的分支路線！</p>
  <div class="hw-diagram" role="img" aria-label="if-elif-else 多向條件判斷流程圖：輸入體溫與症狀後，透過菱形條件框依序檢查並分流至不同處理動作，最後匯合輸出">
    <svg viewBox="0 0 640 275" xmlns="http://www.w3.org/2000/svg">
      <rect x="4" y="4" width="632" height="267" rx="20" fill="#10375f" stroke="#7fb8e6" stroke-width="3"/>
      <g font-weight="800" font-size="13" text-anchor="middle">
        <polygon points="225,18 425,18 405,52 205,52" fill="#4fb3ff" stroke="#0b5a99" stroke-width="2.5"/>
        <text x="315" y="40" fill="#04243f">輸入分數 score（整數 int）</text>

        <polygon points="220,76 325,112 220,148 115,112" fill="#ffd166" stroke="#a87400" stroke-width="3"/>
        <text x="220" y="109" fill="#3a2a00">條件 1 (if)</text>
        <text x="220" y="126" font-size="12" fill="#3a2a00">score &gt;= 90 ?</text>

        <polygon points="445,112 550,148 445,184 340,148" fill="#ffd166" stroke="#a87400" stroke-width="3"/>
        <text x="445" y="145" fill="#3a2a00">條件 2 (elif)</text>
        <text x="445" y="162" font-size="12" fill="#3a2a00">score &gt;= 60 ?</text>

        <rect x="28" y="172" width="135" height="46" rx="10" fill="#7be0b0" stroke="#0c6f50" stroke-width="2.5"/>
        <text x="95" y="193" fill="#02301f">分支 A：優等</text>
        <text x="95" y="209" font-size="11" fill="#02301f">頒發榮譽金章</text>

        <rect x="245" y="198" width="135" height="46" rx="10" fill="#4fb3ff" stroke="#0b5a99" stroke-width="2.5"/>
        <text x="312" y="219" fill="#04243f">分支 B：及格</text>
        <text x="312" y="235" font-size="11" fill="#04243f">通過本關挑戰</text>

        <rect x="475" y="198" width="135" height="46" rx="10" fill="#ff8a65" stroke="#a83a15" stroke-width="2.5"/>
        <text x="542" y="219" fill="#3d0f00">分支 C (else)</text>
        <text x="542" y="235" font-size="11" fill="#3d0f00">未及格・啟動補考</text>
      </g>
      <g stroke="#fff" stroke-width="2.8" fill="none">
        <path d="M315 52 V64 H220 V76"/>
        <path d="M115 112 H95 V172"/>
        <path d="M325 112 H445"/>
        <path d="M340 148 H312 V198"/>
        <path d="M550 148 H575 V198"/>
      </g>
      <text x="72" y="102" fill="#7be0b0" font-size="12" font-weight="800">True (是)</text>
      <text x="385" y="104" fill="#ff8a65" font-size="12" font-weight="800">False (否)</text>
      <text x="305" y="140" fill="#7be0b0" font-size="12" font-weight="800">True</text>
      <text x="582" y="140" fill="#ff8a65" font-size="12" font-weight="800">False</text>
    </svg>
  </div>
  <ul class="study-list">
    <li><b>單向選擇（<code>if</code>）</b>：當條件為 <code>True</code> 時執行縮排區塊內的動作；若為 <code>False</code> 則直接略過。</li>
    <li><b>雙向選擇（<code>if - else</code>）</b>：二選一互斥結構——條件成立走 <code>if</code> 分支，條件不成立則必定走 <code>else</code> 分支。</li>
    <li><b>多向選擇（<code>if - elif - else</code>）</b>：由上而下依序檢查條件，<b>只要其中一個條件成立，執行完該分支後就會立刻跳出整個判斷結構</b>，不會再檢查後面的 <code>elif</code> 或 <code>else</code>。</li>
    <li><b>巢狀選擇（Nested <code>if</code>）</b>：在一個 <code>if</code> 分支內部再放進另一層 <code>if - else</code>，適合處理具有先後前提的多階段判斷。</li>
  </ul>
</section>

<section class="study-sec">
  <h3>📊 三大類運算子（算術、比較、邏輯）完整對照表</h3>
  <div class="study-table-wrap">
  <table class="study-table">
    <tr><th>運算子類別</th><th>符號 / 關鍵字</th><th>功能說明與規則</th><th>程式範例</th><th>運算結果</th></tr>
    <tr><td>🧮 算術運算子</td><td><code>+</code> <code>-</code> <code>*</code> <code>/</code><br><code>//</code>（整除） <code>%</code>（取餘數）</td><td><code>//</code> 取商的整數部分；<br><code>%</code> 取相除後的餘數（常判別奇偶數或倍數）</td><td><code>17 // 5</code><br><code>17 % 5</code></td><td><code>3</code><br><code>2</code></td></tr>
    <tr><td>⚖️ 比較運算子</td><td><code>==</code>（等於） <code>!=</code>（不等於）<br><code>&gt;</code> <code>&lt;</code> <code>&gt;=</code> <code>&lt;=</code></td><td>比較左右兩邊的值，結果必為布林值 <code>True</code> 或 <code>False</code></td><td><code>60 &gt;= 60</code><br><code>5 == 3</code></td><td><code>True</code><br><code>False</code></td></tr>
    <tr><td>🔗 邏輯：且（AND）</td><td><code>and</code>（Scratch：<code>且</code>）</td><td>左右兩條件<b>同時為 True</b>，結果才為 <code>True</code></td><td><code>(8 &gt; 5) and (3 &gt; 10)</code></td><td><code>False</code></td></tr>
    <tr><td>🔗 邏輯：或（OR）</td><td><code>or</code>（Scratch：<code>或</code>）</td><td>左右兩條件<b>只要有一個為 True</b>，結果就為 <code>True</code></td><td><code>(8 &gt; 5) or (3 &gt; 10)</code></td><td><code>True</code></td></tr>
    <tr><td>🔗 邏輯：非（NOT）</td><td><code>not</code>（Scratch：<code>不成立</code>）</td><td>將布林結果反轉（<code>True</code> 變 <code>False</code>、<code>False</code> 變 <code>True</code>）</td><td><code>not (5 &gt; 10)</code></td><td><code>True</code></td></tr>
  </table>
  </div>
  <div class="flow-strip" aria-label="運算子優先順序與多向選擇原則">
    <span>算術運算（* / // % 先於 + -）</span><i>➜</i><span>比較運算（&gt; &lt; == !=）</span><i>➜</i><span>邏輯運算（not ➜ and ➜ or）</span>
  </div>
</section>

<section class="study-sec">
  <h3>⚠️ 易混淆迷思與常見邏輯漏洞整理</h3>
  <div class="myth-grid">
    <div class="myth"><div class="myth-q">❌ 「判斷分數是否等於 100，寫成 <code>if score = 100:</code> 就可以了吧？」</div><div class="myth-a">✅ <b>混淆賦值 <code>=</code> 與相等比較 <code>==</code></b>：單等號 <code>=</code> 是把值放進變數；在 <code>if</code> 條件式中比較兩者是否相等，必須使用<b>雙等號 <code>==</code></b>！</div></div>
    <div class="myth"><div class="myth-q">❌ 「多向判斷把 <code>if score &gt;= 60:</code> 放第一關、<code>elif score &gt;= 90:</code> 放第二關，考 95 分會拿到 90 分以上的獎勵吧？」</div><div class="myth-a">✅ <b>條件順序遮蔽漏洞</b>：95 分在第一關 <code>&gt;= 60</code> 就已經成立並直接結束判斷，永遠走不到第二關！範圍較嚴格（較小）的條件一定要排在前面。</div></div>
    <div class="myth"><div class="myth-q">❌ 「寫兩個獨立的 <code>if</code>，跟寫 <code>if ... elif ...</code> 執行結果完全一樣。」</div><div class="myth-a">✅ <b>獨立判斷 vs 互斥分支</b>：兩個獨立的 <code>if</code> 不論第一個是否成立，都會繼續檢查第二個；而 <code>if - elif</code> 只要第一個成立，就絕不會執行第二個。</div></div>
    <div class="myth"><div class="myth-q">❌ 「滿 18 歲可考駕照，條件寫 <code>age &gt; 18</code> 就不會有問題。」</div><div class="myth-a">✅ <b>邊界值（Boundary Value）遺漏</b>：<code>&gt; 18</code> 不包含剛好 18 歲的人！應寫成 <code>age &gt;= 18</code>，並以邊界數字 <code>17、18、19</code> 進行測試。</div></div>
  </div>
</section>`;

  const lessonProg2 = {
    title: "運算子與條件判斷分支結構 if-else",
    overview: "本單元深入探討算術運算子（含整除 // 與取餘數 %）、比較運算子與邏輯運算子（and、or、not），並結合結構化程式設計中的單向（if）、雙向（if-else）與多向（if-elif-else）條件分支結構，帶領學生學會繪製菱形判斷流程圖、避開條件遮蔽與邊界值陷阱，完成智慧分級判定與互動問答系統。",
    standards: ["資P-IV-2", "運t-IV-3", "運t-IV-4"],
    objectives: [
      "能正確運用算術運算子（含 `//` 與 `%`）、比較運算子（`==`、`!=`、`>=`、`<=`）與邏輯運算子（`and`、`or`、`not`）撰寫條件式。",
      "能繪製包含菱形決策符號的條件分支流程圖，並區分單向、雙向與多向選擇結構。",
      "能辨識並修正「多向選擇條件遮蔽」與「邊界值遺漏（`>` vs `>=`）」等常見邏輯錯誤。",
      "能運用 `if - elif - else` 設計具備複合條件判斷與自動分級回饋的互動程式。"
    ],
    prep: [
      "教師：電腦教室、條件判斷情境卡、含條件遮蔽 Bug 的示範程式碼、投影設備。",
      "學生：每人一台電腦、A4 實作引導與流程圖學習單。"
    ],
    flow: [
      { phase: "引起動機", min: 10, teacher: "展示遊樂園雲霄飛車規定：「年滿 12 歲『且』身高達 140 公分可搭乘；65 歲以上『或』未滿 6 歲免門票」，請學生快速判斷不同遊客是否符合資格。", student: "透過生活案例體會比較運算與 `and` / `or` 邏輯組合的判斷規則。" },
      { phase: "發展活動一：三大運算子實作解析", min: 25, teacher: "講解 `//`（整除）、`%`（取餘數判奇偶）、`==`（相等比較）與 `and`、`or`、`not` 真值表。", student: "上機測試各類運算式輸出的布林結果，練習用 `n % 2 == 0` 判斷偶數。" },
      { phase: "發展活動二：if / elif / else 與條件遮蔽除錯", min: 30, teacher: "示範單向、雙向與多向選擇語法與縮排規則；故意展示先寫 `score >= 60` 再寫 `elif score >= 90` 的錯誤案例，引導學生找出遮蔽原因。", student: "繪製分支流程圖，修正條件判斷順序並使用邊界值（如 60、90）測試驗證。" },
      { phase: "實作挑戰：智慧門票與空品分級判定器", min: 25, teacher: "發布任務：運用 `if - elif - else` 與邏輯運算子，完成具備多段分級與複合優待條件的判定程式。", student: "獨立完成程式撰寫，設計至少 4 組測試資料（含邊界值）進行自我檢核。" }
    ],
    differentiation: "補救教學：提供已畫好菱形判斷流程圖與縮排骨架的程式模板。加深加廣：挑戰使用巢狀 `if-else` 結合 `%` 餘數運算，實作「閏年判斷器（4 的倍數且非 100 的倍數，或 400 的倍數）」。",
    assessmentFocus: "能否正確組合比較與邏輯運算子、安排合理的多向判斷順序，並以邊界值完成測試。",
    extension: "觀察超商優惠活動或捷運票價規則，將其整理成一張多向選擇流程圖與 Python 條件判斷式。"
  };

  const worksheetProg2 = {
    title: "程式森林探險單（二）：運算子與 if-else 條件分支指揮官",
    intro: "要讓程式變得「聰明」、懂得看情況做決定，關鍵就在「運算子」與「if-else 選擇結構」！一起來解開邏輯判斷的奧秘吧。",
    sections: [
      {
        title: "一、暖身：運算子大考驗",
        items: [
          { type: "fill", q: "在 Python 中，要把數值 10 存入變數 `a` 應使用 `____` 號；若要在 `if` 條件中比較變數 `a` 是否等於 10，則必須使用 `____` 號；想計算 23 除以 5 的「餘數」應使用 `____` 運算子。", answer: "=、==、%" },
          { type: "short", q: "設 `x = 15`、`y = 8`，請寫出下列三個條件式的布林值結果（True 或 False）：\n(1) `x % 2 == 1`\n(2) `(x > 10) and (y > 10)`\n(3) `(x > 10) or (y > 10)`", answer: "(1) 15 除以 2 餘 1，故為 True；(2) y > 10 不成立，and 需兩者皆成立，故為 False；(3) x > 10 成立，or 只要其一成立即為 True。" }
        ]
      },
      {
        title: "二、理解：分支流程圖與條件順序除錯",
        items: [
          { type: "draw", q: "請使用標準流程圖符號（特別是菱形判斷框），畫出「輸入整數 n → 判斷 n % 2 == 0 是否成立 → 是則輸出『偶數』、否則輸出『奇數』」的雙向選擇流程圖。", answer: "平行四邊形(輸入 n) → 菱形(n % 2 == 0 ?) → True 分支：平行四邊形(輸出「偶數」) / False 分支：平行四邊形(輸出「奇數」)。" },
          { type: "short", q: "小宇寫了一段體溫分級程式：\n`if temp >= 37.0: print(\"體溫偏高\")`\n`elif temp >= 38.5: print(\"高燒警報\")`\n`else: print(\"體溫正常\")`\n當輸入 `39.2` 度時，為什麼只印出「體溫偏高」而沒有印出「高燒警報」？該如何修正？", answer: "因為 39.2 在第一關 `temp >= 37.0` 就已經成立並離開整個 if-elif 結構（條件遮蔽）。應把較嚴格的 `if temp >= 38.5:` 移到第一關，第二關再寫 `elif temp >= 37.0:`。" }
        ]
      },
      {
        title: "三、應用與反思：複合條件與邊界值測試",
        items: [
          { type: "table", q: "某電影院優待票條件為：「年齡未滿 12 歲，或年齡滿 65 歲以上，或持有學生證（has_id == True）」。請寫出對應的條件判斷式，並設計 3 組測試資料。", answer: "條件式：`if age < 12 or age >= 65 or has_id == True:`；測試資料可涵蓋：(1) 10 歲無學生證→優待、(2) 65 歲邊界值→優待、(3) 20 歲無學生證→全票。" },
          { type: "reflect", q: "為什麼測試「滿 60 分及格」的程式時，除了測 90 分和 30 分之外，一定要特別測試「60 分」這個數字？", answer: "60 分是及格與不及格的分界點（邊界值），專門用來檢驗程式有沒有把 `>=` 誤寫成 `>`。" }
        ]
      }
    ]
  };

  const printProg2 = {
    situation: "環保局委託你們小隊設計一套「校園空氣品質（AQI）與戶外活動智慧廣播系統」：系統需讀取當日 AQI 指數與是否下雨（`is_rain`），依多段條件自動判定旗幟顏色（綠旗 <= 50、黃旗 51~100、橘旗 101~150、紅旗 > 150），並結合邏輯運算決定體育課要「正常戶外上課」還是「改至體育館室內進行」！",
    thinking: [
      "在使用 `if - elif - else` 判斷 AQI 四種旗幟等級時，如果從大到小檢查（先檢查 `> 150`）與從小到大檢查（先檢查 `<= 50`），條件式該如何正確排列才不會發生遮蔽？",
      "若體育課改到室內的條件是「AQI 大於 100『或（or）』正在下雨」，當 AQI 為 45 且正在下雨時，系統會做出什麼決定？",
      "為了確認分級程式在每個門檻值都沒有寫錯（例如把 `<=` 寫成 `<`），你應該挑出哪些「邊界值數據」來逐一測試？"
    ],
    flowchart: "請使用標準流程圖符號（橢圓起止、平行四邊形輸入輸出、菱形條件判斷、矩形處理），畫出「輸入 AQI 與是否下雨 → 多向判斷旗幟顏色等級 → 結合邏輯運算決定戶外或室內上課 → 輸出廣播訊息」的完整分支流程圖。",
    rubric: [
      { c: "運算子與條件式正確性", a: "精準運用比較運算子（==, >=, <=）與邏輯運算子（and, or, not），語法完全正確", b: "基本比較判斷正確，僅複合邏輯條件組合有小瑕疵", t: "混淆 = 與 == 或無法寫出可執行的條件判斷式" },
      { c: "多向分支結構與無遮蔽性", a: "if-elif-else 結構層次分明、縮排正確，條件排列嚴謹且完全無遮蔽漏洞", b: "能使用 if-else 完成雙向分支，但多向順序偶有疏漏", t: "分支順序錯誤導致多數分支無法觸發，或縮排錯誤無法執行" },
      { c: "流程圖與邊界值測試", a: "菱形分支流程圖繪製完整，並主動以 50、51、100、150 等邊界值完成測試驗證", b: "完成流程圖與一般數值測試，經提醒可補齊邊界值測試", t: "流程圖符號錯誤，且未進行測試驗證" }
    ]
  };

  const prog2EasyQuestions = [
    {
      id: "prog2-e1",
      level: "記憶",
      type: "single",
      q: "在繪製程式流程圖時，用來代表「條件判斷（if 分支決策，有 True 與 False 出口）」的標準圖形是哪一種？",
      question: "在繪製程式流程圖時，用來代表「條件判斷（if 分支決策，有 True 與 False 出口）」的標準圖形是哪一種？",
      options: ["長方形（矩形）", "菱形", "正圓形", "三角形"],
      answer: 1,
      explain: "標準流程圖中，菱形代表條件判斷與決策節點，會依條件成立（True）或不成立（False）分出不同流向。",
      explanation: "標準流程圖中，菱形代表條件判斷與決策節點，會依條件成立（True）或不成立（False）分出不同流向。"
    },
    {
      id: "prog2-e2",
      level: "記憶",
      type: "single",
      q: "在 Python 的 `if` 條件判斷式中，想要檢查變數 `ans` 的值「是否等於 100」，應該使用下列哪一個運算子寫法？",
      question: "在 Python 的 `if` 條件判斷式中，想要檢查變數 `ans` 的值「是否等於 100」，應該使用下列哪一個運算子寫法？",
      options: ["`if ans = 100:`", "`if ans == 100:`", "`if ans + 100:`", "`if ans // 100:`"],
      answer: 1,
      explain: "在 Python 中，單等號 `=` 代表賦值（存入變數），雙等號 `==` 才是比較左右兩邊是否相等的比較運算子。",
      explanation: "在 Python 中，單等號 `=` 代表賦值（存入變數），雙等號 `==` 才是比較左右兩邊是否相等的比較運算子。"
    },
    {
      id: "prog2-e3",
      level: "理解",
      type: "single",
      q: "在 `if 條件: 動作A` 與 `else: 動作B` 的雙向選擇結構中，什麼時候會執行 `動作B`？",
      question: "在 `if 條件: 動作A` 與 `else: 動作B` 的雙向選擇結構中，什麼時候會執行 `動作B`？",
      options: ["當 `if` 的條件成立（True）時", "當 `if` 的條件不成立（False）時", "不論條件是否成立，每次都會同時執行動作A與動作B", "只有在沒有輸入任何資料時"],
      answer: 1,
      explain: "`if - else` 為二選一的互斥分支結構：當 `if` 條件為 `True` 時執行動作A；當條件為 `False` 時則執行 `else` 區塊的動作B。",
      explanation: "`if - else` 為二選一的互斥分支結構：當 `if` 條件為 `True` 時執行動作A；當條件為 `False` 時則執行 `else` 區塊的動作B。"
    }
  ];

  const prog2MediumQuestions = [
    {
      id: "prog2-m1",
      level: "應用",
      type: "single",
      q: "在 Python 中，算術運算式 `19 // 4` 與 `19 % 4` 的計算結果分別是多少？",
      question: "在 Python 中，算術運算式 `19 // 4` 與 `19 % 4` 的計算結果分別是多少？",
      options: ["4.75 與 4", "4 與 3", "3 與 4", "5 與 1"],
      answer: 1,
      explain: "`//` 為整數除法（取商的整數部分），19 除以 4 商為 `4`；`%` 為取餘數運算子，19 除以 4 的餘數為 `3`。",
      explanation: "`//` 為整數除法（取商的整數部分），19 除以 4 商為 `4`；`%` 為取餘數運算子，19 除以 4 的餘數為 `3`。"
    },
    {
      id: "prog2-m2",
      level: "理解",
      type: "single",
      q: "想要用 `if` 判斷一個正整數變數 `n` 是不是「偶數（能被 2 整除）」，下列哪一個條件式最正確？",
      question: "想要用 `if` 判斷一個正整數變數 `n` 是不是「偶數（能被 2 整除）」，下列哪一個條件式最正確？",
      options: ["`n / 2 == 1`", "`n % 2 == 0`", "`n // 2 == 0`", "`n % 2 == 2`"],
      answer: 1,
      explain: "偶數除以 2 的餘數必為 0，因此使用取餘數運算子檢查 `n % 2 == 0` 即可準確判斷偶數。",
      explanation: "偶數除以 2 的餘數必為 0，因此使用取餘數運算子檢查 `n % 2 == 0` 即可準確判斷偶數。"
    },
    {
      id: "prog2-m3",
      level: "應用",
      type: "single",
      q: "設變數 `age = 15`、`has_ticket = False`。請問邏輯運算式 `(age >= 12) and (has_ticket == True)` 與 `(age >= 12) or (has_ticket == True)` 的結果依序為何？",
      question: "設變數 `age = 15`、`has_ticket = False`。請問邏輯運算式 `(age >= 12) and (has_ticket == True)` 與 `(age >= 12) or (has_ticket == True)` 的結果依序為何？",
      options: ["True、True", "False、False", "False、True", "True、False"],
      answer: 2,
      explain: "`age >= 12` 為 `True`，但 `has_ticket == True` 為 `False`。`and` 需要兩者皆為真才回傳 `True`（故為 `False`）；`or` 只要其中之一為真即回傳 `True`（故為 `True`）。",
      explanation: "`age >= 12` 為 `True`，但 `has_ticket == True` 為 `False`。`and` 需要兩者皆為真才回傳 `True`（故為 `False`）；`or` 只要其中之一為真即回傳 `True`（故為 `True`）。"
    },
    {
      id: "prog2-m4",
      level: "應用",
      type: "single",
      q: "設變數 `score = 75`，執行下列 Python 多向選擇結構後，螢幕會印出什麼？\n`if score >= 90:`\n`    print(\"A\")`\n`elif score >= 70:`\n`    print(\"B\")`\n`elif score >= 60:`\n`    print(\"C\")`\n`else:`\n`    print(\"D\")`",
      question: "設變數 `score = 75`，執行下列 Python 多向選擇結構後，螢幕會印出什麼？\n`if score >= 90:`\n`    print(\"A\")`\n`elif score >= 70:`\n`    print(\"B\")`\n`elif score >= 60:`\n`    print(\"C\")`\n`else:`\n`    print(\"D\")`",
      options: ["只印出 B", "印出 B 和 C", "印出 A、B、C", "只印出 C"],
      answer: 0,
      explain: "75 不滿足 `>= 90`，往下檢查 `elif score >= 70` 成立，因此印出 `\"B\"` 並直接離開整個 `if-elif-else` 結構，不會再執行下方的 `score >= 60`。",
      explanation: "75 不滿足 `>= 90`，往下檢查 `elif score >= 70` 成立，因此印出 `\"B\"` 並直接離開整個 `if-elif-else` 結構，不會再執行下方的 `score >= 60`。"
    }
  ];

  const prog2HardQuestions = [
    {
      id: "prog2-h1",
      level: "分析",
      type: "single",
      q: "小凱寫了一段百貨公司滿額折價程式：\n`if money >= 500:`\n`    discount = 50`\n`elif money >= 1000:`\n`    discount = 150`\n`else:`\n`    discount = 0`\n當顧客消費 `money = 1200` 元時，為什麼 `discount` 只拿到 `50` 元而不是 `150` 元？",
      question: "小凱寫了一段百貨公司滿額折價程式：\n`if money >= 500:`\n`    discount = 50`\n`elif money >= 1000:`\n`    discount = 150`\n`else:`\n`    discount = 0`\n當顧客消費 `money = 1200` 元時，為什麼 `discount` 只拿到 `50` 元而不是 `150` 元？",
      options: ["因為 1200 小於 1000", "因為第一關 `money >= 500` 範圍較寬鬆，1200 在第一關就成立並跳出判斷，造成第二關 `elif money >= 1000` 永遠被遮蔽而無法執行", "因為 `elif` 不能放數字比較", "因為沒有使用 `not` 運算子"],
      answer: 1,
      explain: "在 `if - elif` 結構中，一旦前面的條件成立就會離開判斷。因為 1200 滿足第一關 `>= 500`，程式執行 `discount = 50` 後即結束；應將較嚴格的 `money >= 1000` 放在第一關。",
      explanation: "在 `if - elif` 結構中，一旦前面的條件成立就會離開判斷。因為 1200 滿足第一關 `>= 500`，程式執行 `discount = 50` 後即結束；應將較嚴格的 `money >= 1000` 放在第一關。"
    },
    {
      id: "prog2-h2",
      level: "分析",
      type: "single",
      q: "請比較「兩個獨立的 `if`」與「`if - elif`」的差異。設初值 `x = 80`，依序執行下列程式碼後，`x` 的最終值是多少？\n`if x >= 60:`\n`    x = x - 30`\n`if x < 60:`\n`    x = x + 10`",
      question: "請比較「兩個獨立的 `if`」與「`if - elif`」的差異。設初值 `x = 80`，依序執行下列程式碼後，`x` 的最終值是多少？\n`if x >= 60:`\n`    x = x - 30`\n`if x < 60:`\n`    x = x + 10`",
      options: ["50", "60", "80", "90"],
      answer: 1,
      explain: "注意這裏是兩個獨立的 `if` 而非 `elif`！第一個 `if x >= 60` 成立，使 `x` 變成 `80 - 30 = 50`；接著程式繼續往下檢查第二個 `if x < 60`，此時 `50 < 60` 成立，因此 `x` 又被加 10 變成 `60`。",
      explanation: "注意這裏是兩個獨立的 `if` 而非 `elif`！第一個 `if x >= 60` 成立，使 `x` 變成 `80 - 30 = 50`；接著程式繼續往下檢查第二個 `if x < 60`，此時 `50 < 60` 成立，因此 `x` 又被加 10 變成 `60`。"
    },
    {
      id: "prog2-h3",
      level: "分析",
      type: "single",
      q: "設 `a = 4`、`b = 9`。請問複合邏輯運算式 `not (a > 5) and (b % 3 == 0)` 的布林結果為何？",
      question: "設 `a = 4`、`b = 9`。請問複合邏輯運算式 `not (a > 5) and (b % 3 == 0)` 的布林結果為何？",
      options: ["True", "False", "0", "發生執行期錯誤"],
      answer: 0,
      explain: "逐步拆解：`a > 5`（4 > 5）為 `False`，加上 `not` 反轉後 `not (a > 5)` 為 `True`；右邊 `9 % 3 == 0`（9 除以 3 餘 0）為 `True`；最後 `True and True` 結果為 `True`。",
      explanation: "逐步拆解：`a > 5`（4 > 5）為 `False`，加上 `not` 反轉後 `not (a > 5)` 為 `True`；右邊 `9 % 3 == 0`（9 除以 3 餘 0）為 `True`；最後 `True and True` 結果為 `True`。"
    },
    {
      id: "prog2-h4",
      level: "應用",
      type: "single",
      q: "閱讀下列巢狀條件判斷程式，當輸入 `vip = True`、`total = 800` 時，輸出結果為何？\n`if vip == True:`\n`    if total >= 1000:`\n`        print(\"VIP 享 7 折\")`\n`    else:`\n`        print(\"VIP 享 85 折\")`\n`else:`\n`    print(\"一般會員無折扣\")`",
      question: "閱讀下列巢狀條件判斷程式，當輸入 `vip = True`、`total = 800` 時，輸出結果為何？\n`if vip == True:`\n`    if total >= 1000:`\n`        print(\"VIP 享 7 折\")`\n`    else:`\n`        print(\"VIP 享 85 折\")`\n`else:`\n`    print(\"一般會員無折扣\")`",
      options: ["VIP 享 7 折", "VIP 享 85 折", "一般會員無折扣", "什麼都不會印出"],
      answer: 1,
      explain: "外層 `vip == True` 成立，進入內層判斷；內層檢查 `total >= 1000`（800 >= 1000）不成立，因此執行內層的 `else` 分支，印出 `\"VIP 享 85 折\"`。",
      explanation: "外層 `vip == True` 成立，進入內層判斷；內層檢查 `total >= 1000`（800 >= 1000）不成立，因此執行內層的 `else` 分支，印出 `\"VIP 享 85 折\"`。"
    },
    {
      id: "prog2-h5",
      level: "應用",
      type: "single",
      q: "西元「閏年」的規則為：「年份是 4 的倍數『且』不是 100 的倍數，『或者』年份是 400 的倍數」。若變數為 `y`，下列哪一個 Python 條件式能正確判斷閏年？",
      question: "西元「閏年」的規則為：「年份是 4 的倍數『且』不是 100 的倍數，『或者』年份是 400 的倍數」。若變數為 `y`，下列哪一個 Python 條件式能正確判斷閏年？",
      options: ["`(y % 4 == 0 and y % 100 == 0) or (y % 400 == 0)`", "`(y % 4 == 0 and y % 100 != 0) or (y % 400 == 0)`", "`y % 4 == 0 or y % 100 != 0 or y % 400 == 0`", "`y // 4 == 0 and y // 400 == 0`"],
      answer: 1,
      explain: "「是 4 的倍數」寫為 `y % 4 == 0`，「不是 100 的倍數」寫為 `y % 100 != 0`，兩者以 `and` 連接；再與「是 400 的倍數」`y % 400 == 0` 以 `or` 連接。",
      explanation: "「是 4 的倍數」寫為 `y % 4 == 0`，「不是 100 的倍數」寫為 `y % 100 != 0`，兩者以 `and` 連接；再與「是 400 的倍數」`y % 400 == 0` 以 `or` 連接。"
    }
  ];

  const quizProg2 = {
    passScore: 60,
    easy: prog2EasyQuestions,
    medium: prog2MediumQuestions,
    hard: prog2HardQuestions,
    levels: {
      easy: {
        label: "入門探險家",
        icon: "🧭",
        badge: null,
        desc: "認識比較運算子、流程圖菱形判斷框與基本 if-else 分支。",
        questions: prog2EasyQuestions
      },
      medium: {
        label: "進階挑戰者",
        icon: "🧰",
        badge: "silver",
        desc: "運用算術取餘數（%）、邏輯運算子（and / or / not）與多向選擇追蹤。",
        questions: prog2MediumQuestions
      },
      hard: {
        label: "大師領航員",
        icon: "👑",
        badge: "gold",
        desc: "診斷多向選擇遮蔽漏洞、獨立 if 陷阱、巢狀條件與複合邏輯優先序。",
        questions: prog2HardQuestions
      }
    }
  };

  const unitProg2 = {
    id: "prog-2",
    unit: "運算子與條件判斷分支結構 if-else",
    study: { title: "運算子與條件判斷分支結構 if-else", html: studyProg2 },
    learningContent: { title: "運算子與條件判斷分支結構 if-else", html: studyProg2 },
    lesson: lessonProg2,
    worksheet: worksheetProg2,
    print: printProg2,
    lessonPlan: { lesson: lessonProg2, worksheet: worksheetProg2, print: printProg2 },
    quiz: quizProg2
  };


  /* ============================================================================
   * 單元三：prog-3（重複結構與迴圈控制 loop）
   * ============================================================================ */
  const studyProg3 = `
<section class="study-sec">
  <h3>🔄 計數迴圈（for）、條件迴圈（while）與巢狀迴圈圖解</h3>
  <p class="study-lead">當程式需要執行規律且重複的任務時，「重複結構（Loop）」能用短短幾行指令取代成百上千行的重複程式碼。若在迴圈內部再包進另一層迴圈，則稱為「巢狀迴圈（Nested Loop）」。</p>
  <div class="hw-diagram" role="img" aria-label="重複結構與巢狀迴圈示意圖：左側為計數與條件迴圈控制流程，右側為外層6次乘以內層4次繪製幾何圖騰">
    <svg viewBox="0 0 640 270" xmlns="http://www.w3.org/2000/svg">
      <rect x="4" y="4" width="632" height="262" rx="20" fill="#10375f" stroke="#7fb8e6" stroke-width="3"/>
      <text x="195" y="30" text-anchor="middle" fill="#d9fff0" font-size="14" font-weight="800">巢狀迴圈結構（外層 M 次 × 內層 N 次）</text>
      <text x="505" y="30" text-anchor="middle" fill="#d9fff0" font-size="14" font-weight="800">幾何繪圖成果（6 × 4 = 24 次動作）</text>
      <g font-weight="800" font-size="13">
        <rect x="28" y="44" width="330" height="204" rx="12" fill="#ffd166" stroke="#a87400" stroke-width="3"/>
        <text x="46" y="68" fill="#3a2a00">🔁 外層：for i in range(6)（重複 6 次）</text>
        <rect x="52" y="80" width="290" height="114" rx="10" fill="#ff8a65" stroke="#a83a15" stroke-width="2.5"/>
        <text x="68" y="104" fill="#3d0f00">🔁 內層：for j in range(4)（畫正方形）</text>
        <rect x="74" y="114" width="252" height="32" rx="6" fill="#4fb3ff" stroke="#0b5a99" stroke-width="2"/>
        <text x="200" y="135" text-anchor="middle" fill="#04243f">前進 60 步（畫邊長）</text>
        <rect x="74" y="152" width="252" height="32" rx="6" fill="#4fb3ff" stroke="#0b5a99" stroke-width="2"/>
        <text x="200" y="173" text-anchor="middle" fill="#04243f">右轉 90 度（外角 360 ÷ 4）</text>
        <rect x="52" y="202" width="290" height="34" rx="6" fill="#7be0b0" stroke="#0c6f50" stroke-width="2"/>
        <text x="197" y="224" text-anchor="middle" fill="#02301f">↻ 外層右轉 60 度（360 ÷ 6 換方向）</text>
      </g>
      <rect x="384" y="44" width="232" height="204" rx="14" fill="#0b2545" stroke="#7be0b0" stroke-width="3"/>
      <g transform="translate(500,146)" fill="none" stroke-width="2.2">
        <rect x="0" y="0" width="48" height="48" stroke="#ffd166" transform="rotate(0)"/>
        <rect x="0" y="0" width="48" height="48" stroke="#ff8a65" transform="rotate(60)"/>
        <rect x="0" y="0" width="48" height="48" stroke="#c58bff" transform="rotate(120)"/>
        <rect x="0" y="0" width="48" height="48" stroke="#7be0b0" transform="rotate(180)"/>
        <rect x="0" y="0" width="48" height="48" stroke="#4fb3ff" transform="rotate(240)"/>
        <rect x="0" y="0" width="48" height="48" stroke="#ff6fb5" transform="rotate(300)"/>
        <circle cx="0" cy="0" r="4" fill="#fff"/>
      </g>
    </svg>
  </div>
  <ul class="study-list">
    <li><b>計數迴圈（<code>for</code> / 重複 N 次）</b>：適用於「事先已知固定重複次數」的情境；在 Python 中常搭配 <code>range(起始, 結束, 間隔)</code> 產生數列（注意<b>不包含結束值本身</b>）。</li>
    <li><b>條件迴圈（<code>while</code> / 重複直到）</b>：適用於「事先不知道要重複幾次，需視條件決定何時停止」的情境（如猜數字直到猜中、扣血直到 HP &lt;= 0）。</li>
    <li><b>迴圈控制指令（<code>break</code> 與 <code>continue</code>）</b>：<code>break</code> 會立刻強制跳出整層迴圈；<code>continue</code> 則會跳過「本輪剩餘的動作」，直接進入下一輪迴圈。</li>
    <li><b>正多邊形轉角公式與巢狀次數</b>：畫正 N 邊形每次外角旋轉 <code>360 ÷ N</code> 度；外層重複 M 次、內層重複 N 次時，內層核心動作共執行 <code>M × N</code> 次。</li>
  </ul>
</section>

<section class="study-sec">
  <h3>📊 迴圈語法與 range() 數列規則對照表</h3>
  <div class="study-table-wrap">
  <table class="study-table">
    <tr><th>語法 / 積木</th><th>Python 範例</th><th>產生的數列或行為</th><th>總執行次數 / 說明</th></tr>
    <tr><td><code>range(n)</code></td><td><code>for i in range(5):</code></td><td><code>i</code> 依序為 <code>0, 1, 2, 3, 4</code></td><td>共 <b>5 次</b>（從 0 開始，停在 5 之前）</td></tr>
    <tr><td><code>range(start, stop)</code></td><td><code>for i in range(1, 6):</code></td><td><code>i</code> 依序為 <code>1, 2, 3, 4, 5</code></td><td>共 <b>5 次</b>（含起點 1，不含終點 6）</td></tr>
    <tr><td><code>range(start, stop, step)</code></td><td><code>for i in range(2, 10, 3):</code></td><td><code>i</code> 依序為 <code>2, 5, 8</code></td><td>共 <b>3 次</b>（每次遞增 3，不超過 9）</td></tr>
    <tr><td><code>while 條件:</code></td><td><code>while hp &gt; 0:</code></td><td>當 <code>hp &gt; 0</code> 為 True 時持續重複</td><td>須在迴圈內更新 <code>hp</code>，否則造成無窮迴圈</td></tr>
    <tr><td>Scratch <code>重複直到 &lt;條件&gt;</code></td><td>對應 <code>while not 條件:</code></td><td>直到條件<b>成立（True）</b>才停止迴圈</td><td>與 Python <code>while</code> 的繼續條件剛好相反</td></tr>
  </table>
  </div>
  <div class="flow-strip" aria-label="迴圈累加器標準三步驟">
    <span>1. 迴圈外初始化（total = 0）</span><i>➜</i><span>2. 進入迴圈逐輪累加（total += i）</span><i>➜</i><span>3. 迴圈結束後輸出結果</span>
  </div>
</section>

<section class="study-sec">
  <h3>⚠️ 易混淆迷思與常見迴圈陷阱整理</h3>
  <div class="myth-grid">
    <div class="myth"><div class="myth-q">❌ 「<code>for i in range(1, 10):</code> 會從 1 印到 10，總共執行 10 次！」</div><div class="myth-a">✅ <b><code>range</code> 終點值不包含（含頭不含尾）</b>：<code>range(1, 10)</code> 只會產生 <code>1 ~ 9</code> 共 9 個數字；若要包含 10，必須寫成 <code>range(1, 11)</code>。</div></div>
    <div class="myth"><div class="myth-q">❌ 「寫 <code>while n &lt; 10:</code> 時電腦突然卡死動不了，是電腦壞了嗎？」</div><div class="myth-a">✅ <b>無窮迴圈（Infinite Loop）</b>：迴圈內部忘記寫 <code>n = n + 1</code> 更新計數變數，導致 <code>n &lt; 10</code> 永遠為真，程式永遠停不下來！</div></div>
    <div class="myth"><div class="myth-q">❌ 「計算 1 加到 10 的總和時，我把 <code>total = 0</code> 寫在 <code>for</code> 迴圈裡面（縮排內），為什麼最後印出來只有 10？」</div><div class="myth-a">✅ <b>迴圈內誤重置累加器</b>：初始化 <code>total = 0</code> 必須放在<b>迴圈外面（進入迴圈之前）</b>；放迴圈內會害每一輪都把前面加好的總和歸零！</div></div>
    <div class="myth"><div class="myth-q">❌ 「<code>break</code> 跟 <code>continue</code> 都是直接把整個迴圈結束掉。」</div><div class="myth-a">✅ <b>強制跳出 vs 跳過本輪</b>：<code>break</code> 是直接打斷並離開整個迴圈；<code>continue</code> 只是跳過「這一次」後面的程式碼，馬上繼續跑下一輪迴圈。</div></div>
  </div>
</section>`;

  const lessonProg3 = {
    title: "重複結構與迴圈控制 loop",
    overview: "本單元帶領學生認識結構化程式設計中的「重複結構（迴圈）」，比較計數迴圈（for / 重複 N 次）與條件迴圈（while / 重複直到）的適用情境，掌握 Python `range()` 數列規則、累加器設計、`break` / `continue` 流程控制以及巢狀迴圈（Nested Loop），並實作幾何圖案繪製與數值統計程式。",
    standards: ["資P-IV-2", "運t-IV-3", "運t-IV-4"],
    objectives: [
      "能比較計數迴圈（`for`）與條件迴圈（`while`）的差異，並依問題情境選擇適當的迴圈結構。",
      "能正確使用 `range(起始, 結束, 間隔)` 與累加變數，計算指定範圍的數列總和或統計結果。",
      "能說明 `break`（跳出迴圈）與 `continue`（跳過本輪）的作用，並避免產生無窮迴圈。",
      "能運用巢狀迴圈（外層與內層迴圈）繪製幾何圖騰或輸出二維規律圖形。"
    ],
    prep: [
      "教師：電腦教室（Scratch 畫筆擴充模組與 Python 環境）、幾何萬花筒與九九乘法表圖卡。",
      "學生：每人一台電腦、A4 迴圈追蹤與實作學習單。"
    ],
    flow: [
      { phase: "引起動機", min: 10, teacher: "展示畫出正十二邊形的兩種寫法：一段連續貼了 24 塊移動轉彎積木，另一段只用了 1 個「重複 12 次」積木，提問哪一種好維護？", student: "觀察對比，歸納重複結構能精簡程式碼並方便修改參數。" },
      { phase: "發展活動一：for 計數迴圈與 range() 累加", min: 25, teacher: "講解 `range(n)`、`range(a, b, s)` 的「含頭不含尾」規則，示範如何用累加變數 `total` 計算 1 到 100 的總和。", student: "上機練習不同 `range` 參數組合，並比較 `total = 0` 放在迴圈外與迴圈內的差異。" },
      { phase: "發展活動二：while 條件迴圈與 break / continue", min: 25, teacher: "以「猜密碼最多限猜 3 次或猜對即停」為例，示範 `while` 迴圈搭配 `break` 與 `continue`，並剖析無窮迴圈的成因。", student: "實作條件迴圈並練習修正故意遺漏變數更新的無窮迴圈程式。" },
      { phase: "實作挑戰：巢狀迴圈幾何萬花筒 / 乘法表", min: 30, teacher: "指導學生運用雙層巢狀迴圈（外層控制旋轉或列數、內層控制多邊形或行數）完成幾何萬花筒或九九乘法表。", student: "完成巢狀迴圈作品，填寫學習單變數追蹤表並與同儕展示交流。" }
    ],
    differentiation: "補救教學：提供單層迴圈畫正多邊形與累加器的程式碼鷹架。加深加廣：挑戰結合 `while` 迴圈、`if-elif-else` 與 `break` 設計「終極密碼（自動縮小上下界範圍）」小遊戲。",
    assessmentFocus: "能否正確推算 `range()` 與巢狀迴圈執行次數、正確放置累加器初始化位置，並避免無窮迴圈。",
    extension: "利用巢狀迴圈嘗試在螢幕上印出由 `*` 號組成的直角三角形與金字塔圖案。"
  };

  const worksheetProg3 = {
    title: "程式森林探險單（三）：迴圈魔法師與巢狀幾何圖騰",
    intro: "只要掌握「重複結構（Loop）」，不管是累加一萬個數字還是畫出絢麗的幾何萬花筒，電腦都能在一瞬間幫你完成！",
    sections: [
      {
        title: "一、暖身：分辨計數迴圈與條件迴圈",
        items: [
          { type: "fill", q: "在 Python 中，已知固定重複次數時通常使用 `____` 迴圈搭配 `range()`；若事先不知道要重複幾次、需依條件成立與否決定何時停止，則適合使用 `____` 迴圈。", answer: "for、while" },
          { type: "short", q: "請寫出下列三個 `range()` 依序產生的整數數列：\n(1) `range(4)`\n(2) `range(2, 7)`\n(3) `range(1, 10, 2)`", answer: "(1) 0, 1, 2, 3；(2) 2, 3, 4, 5, 6；(3) 1, 3, 5, 7, 9。" }
        ]
      },
      {
        title: "二、理解：迴圈追蹤與除錯",
        items: [
          { type: "table", q: "請逐步追蹤下列迴圈執行時，每一輪的 `i` 與 `s` 變化，並寫出最終輸出的 `s` 值：\n`s = 0`\n`for i in range(1, 5):`\n`    s = s + i`\n`print(s)`", answer: "第1輪 i=1, s=1；第2輪 i=2, s=3；第3輪 i=3, s=6；第4輪 i=4, s=10。最終輸出 s = 10。" },
          { type: "short", q: "小安寫了一段條件迴圈：\n`x = 1`\n`while x <= 5:`\n`    print(x)`\n執行後螢幕不斷印出 1 停不下來（無窮迴圈）。為什麼會這樣？請加上一行程式碼修正它。", answer: "因為迴圈內沒有改變 `x` 的值，`x` 永遠是 1，`x <= 5` 永遠成立。應在迴圈縮排內加上 `x = x + 1`。" }
        ]
      },
      {
        title: "三、應用與反思：巢狀迴圈設計",
        items: [
          { type: "draw", q: "想用「巢狀迴圈」畫出由 8 個正五邊形旋轉組成的幾何花朵，請畫出外層迴圈與內層迴圈的流程結構，並標註：(1) 內層重複幾次、每次轉幾度？(2) 外層重複幾次、每次轉幾度？", answer: "(1) 內層畫正五邊形：重複 5 次，每次移動邊長後右轉 360 ÷ 5 = 72 度；(2) 外層排成一圈 8 個：重複 8 次，每畫完一個正五邊形右轉 360 ÷ 8 = 45 度。" },
          { type: "reflect", q: "在迴圈中遇到 `break` 和遇到 `continue`，程式的行為有什麼不同？請舉一個生活例子比喻。", answer: "`break` 像比賽吹終場哨音，直接結束整個迴圈；`continue` 像跳過這一棒直接換下一棒，只略過本輪剩下的動作並繼續下一輪迴圈。" }
        ]
      }
    ]
  };

  const printProg3 = {
    situation: "學校創客展邀請你設計一套「自動儲蓄目標計算機與幾何徽章繪圖儀」：(1) 輸入每日固定存錢金額與目標金額，利用迴圈模擬每天累計存款，並印出第幾天能達成目標；(2) 達標後利用「巢狀迴圈」自動繪製一枚對稱的多邊形榮譽幾何徽章！",
    thinking: [
      "計算「固定存 30 天總共有多少錢」和「每天存 50 元，要存幾天才能買到 1200 元的耳機」，哪一個適合用 `for` 計數迴圈？哪一個適合用 `while` 條件迴圈？為什麼？",
      "如果在計算累計存款時，不小心把 `total = 0` 寫在迴圈縮排裡面，存了 30 天後螢幕顯示的總金額會變成多少？",
      "當外層迴圈執行 6 次、內層迴圈執行 5 次時，內層的畫筆移動指令總共被執行了幾次？"
    ],
    flowchart: "請畫出「儲蓄達標與巢狀迴圈繪圖」的流程圖：初始化 `total = 0, day = 0` → `while total < target` 迴圈（每日累加存款與天數） → 達標輸出天數 → 進入雙層巢狀 `for` 迴圈繪製幾何徽章。",
    rubric: [
      { c: "迴圈結構選用與範圍控制", a: "精準選用 for 或 while 迴圈，range() 起訖參數與終止條件完全正確", b: "能完成迴圈基本運作，僅邊界次數（差 1 次）需微調", t: "迴圈語法錯誤或條件設定不當導致無法執行" },
      { c: "累加器與避免無窮迴圈", a: "正確在迴圈外初始化累加器，迴圈內正確更新狀態，無無窮迴圈且善用 break/continue", b: "累加結果正確，但變數更新寫法稍顯冗長", t: "把初始化寫在迴圈內，或漏寫變數更新造成無窮迴圈" },
      { c: "巢狀迴圈邏輯與幾何應用", a: "清楚掌握內外層迴圈執行次數與旋轉外角公式（360/N），成功完成規律作品", b: "能使用單層迴圈完成基本圖形，巢狀外層角度略偏", t: "無法區分內外層迴圈層次" }
    ]
  };

  const prog3EasyQuestions = [
    {
      id: "prog3-e1",
      level: "記憶",
      type: "single",
      q: "在 Python 中執行 `for i in range(6):`，請問迴圈內部的縮排指令總共會重複執行幾次？",
      question: "在 Python 中執行 `for i in range(6):`，請問迴圈內部的縮排指令總共會重複執行幾次？",
      options: ["4 次", "5 次", "6 次", "7 次"],
      answer: 2,
      explain: "`range(6)` 會依序產生 `0, 1, 2, 3, 4, 5` 共 6 個整數，因此迴圈總共執行 6 次。",
      explanation: "`range(6)` 會依序產生 `0, 1, 2, 3, 4, 5` 共 6 個整數，因此迴圈總共執行 6 次。"
    },
    {
      id: "prog3-e2",
      level: "理解",
      type: "single",
      q: "若事先「不知道要重複幾次」，只知道「當玩家血量 `hp > 0` 時就繼續戰鬥」，最適合使用哪一種結構？",
      question: "若事先「不知道要重複幾次」，只知道「當玩家血量 `hp > 0` 時就繼續戰鬥」，最適合使用哪一種結構？",
      options: ["`while` 條件迴圈", "只用一行 `print()`", "把程式碼複製貼上 5 次", "刪除所有變數"],
      answer: 0,
      explain: "事先未知重複次數、需依條件決定是否繼續重複時，最適合使用 `while` 條件迴圈。",
      explanation: "事先未知重複次數、需依條件決定是否繼續重複時，最適合使用 `while` 條件迴圈。"
    },
    {
      id: "prog3-e3",
      level: "理解",
      type: "single",
      q: "在 Scratch 或 Python 海龜繪圖中，利用「重複 4 次：前進 100 步 → 右轉 N 度」來畫出一個正方形，請問每次右轉的外角 N 應該設為幾度？",
      question: "在 Scratch 或 Python 海龜繪圖中，利用「重複 4 次：前進 100 步 → 右轉 N 度」來畫出一個正方形，請問每次右轉的外角 N 應該設為幾度？",
      options: ["45 度", "60 度", "90 度", "180 度"],
      answer: 2,
      explain: "正 N 邊形繞行一圈的外角總和為 360 度，正方形有 4 個角，故每次轉彎角度為 `360 ÷ 4 = 90` 度。",
      explanation: "正 N 邊形繞行一圈的外角總和為 360 度，正方形有 4 個角，故每次轉彎角度為 `360 ÷ 4 = 90` 度。"
    }
  ];

  const prog3MediumQuestions = [
    {
      id: "prog3-m1",
      level: "理解",
      type: "single",
      q: "在 Python 中，`list(range(2, 11, 3))` 所產生的數列為何？",
      question: "在 Python 中，`list(range(2, 11, 3))` 所產生的數列為何？",
      options: ["[2, 5, 8]", "[2, 5, 8, 11]", "[2, 3, 11]", "[3, 6, 9]"],
      answer: 0,
      explain: "`range(2, 11, 3)` 從 2 開始，每次遞增 3，且不包含終點 11，因此依序產生 `2, 5, 8`。",
      explanation: "`range(2, 11, 3)` 從 2 開始，每次遞增 3，且不包含終點 11，因此依序產生 `2, 5, 8`。"
    },
    {
      id: "prog3-m2",
      level: "應用",
      type: "single",
      q: "執行下列 Python 程式碼後，螢幕輸出的 `total` 值是多少？\n`total = 0`\n`for x in range(1, 5):`\n`    total = total + x`\n`print(total)`",
      question: "執行下列 Python 程式碼後，螢幕輸出的 `total` 值是多少？\n`total = 0`\n`for x in range(1, 5):`\n`    total = total + x`\n`print(total)`",
      options: ["6", "10", "15", "4"],
      answer: 1,
      explain: "`range(1, 5)` 產生 `1, 2, 3, 4`，累加過程為 `0 + 1 + 2 + 3 + 4 = 10`。",
      explanation: "`range(1, 5)` 產生 `1, 2, 3, 4`，累加過程為 `0 + 1 + 2 + 3 + 4 = 10`。"
    },
    {
      id: "prog3-m3",
      level: "應用",
      type: "single",
      q: "在一個「外層重複 5 次、內層重複 3 次」的巢狀迴圈中，放在內層迴圈裡的 `print(\"*\")` 總共會被執行幾次？",
      question: "在一個「外層重複 5 次、內層重複 3 次」的巢狀迴圈中，放在內層迴圈裡的 `print(\"*\")` 總共會被執行幾次？",
      options: ["8 次", "12 次", "15 次", "53 次"],
      answer: 2,
      explain: "外層每執行 1 次，內層就會完整執行 3 次，因此總執行次數為 `5 × 3 = 15` 次。",
      explanation: "外層每執行 1 次，內層就會完整執行 3 次，因此總執行次數為 `5 × 3 = 15` 次。"
    },
    {
      id: "prog3-m4",
      level: "分析",
      type: "single",
      q: "下列哪一段 `while` 迴圈程式碼會陷入永遠停不下來的「無窮迴圈（Infinite Loop）」？",
      question: "下列哪一段 `while` 迴圈程式碼會陷入永遠停不下來的「無窮迴圈（Infinite Loop）」？",
      options: ["`n = 1`\n`while n <= 3:`\n`    n = n + 1`", "`n = 5`\n`while n > 0:`\n`    n = n - 2`", "`n = 1`\n`while n < 10:`\n`    print(n)`", "`n = 10`\n`while n < 5:`\n`    print(n)`"],
      answer: 2,
      explain: "選項 C 中 `n` 初值為 1，且迴圈內只有 `print(n)` 而沒有更新 `n` 的值，導致 `n < 10` 永遠為 `True`，形成無窮迴圈。",
      explanation: "選項 C 中 `n` 初值為 1，且迴圈內只有 `print(n)` 而沒有更新 `n` 的值，導致 `n < 10` 永遠為 `True`，形成無窮迴圈。"
    }
  ];

  const prog3HardQuestions = [
    {
      id: "prog3-h1",
      level: "分析",
      type: "single",
      q: "執行下列含有 `break` 的 Python 程式碼後，變數 `s` 的最終值是多少？\n`s = 0`\n`for i in range(1, 10):`\n`    if i == 4:`\n`        break`\n`    s = s + i`\n`print(s)`",
      question: "執行下列含有 `break` 的 Python 程式碼後，變數 `s` 的最終值是多少？\n`s = 0`\n`for i in range(1, 10):`\n`    if i == 4:`\n`        break`\n`    s = s + i`\n`print(s)`",
      options: ["6", "10", "45", "3"],
      answer: 0,
      explain: "當 `i` 為 1, 2, 3 時，`s` 依序累加 `1 + 2 + 3 = 6`；當 `i` 變成 4 時，`if i == 4` 成立並執行 `break` 直接跳出整個迴圈，故最終 `s` 為 `6`。",
      explanation: "當 `i` 為 1, 2, 3 時，`s` 依序累加 `1 + 2 + 3 = 6`；當 `i` 變成 4 時，`if i == 4` 成立並執行 `break` 直接跳出整個迴圈，故最終 `s` 為 `6`。"
    },
    {
      id: "prog3-h2",
      level: "分析",
      type: "single",
      q: "若將上一題中的 `break` 改為 `continue`，執行下列程式碼後，變數 `s` 的最終值是多少？\n`s = 0`\n`for i in range(1, 6):`\n`    if i == 3:`\n`        continue`\n`    s = s + i`\n`print(s)`",
      question: "若將上一題中的 `break` 改為 `continue`，執行下列程式碼後，變數 `s` 的最終值是多少？\n`s = 0`\n`for i in range(1, 6):`\n`    if i == 3:`\n`        continue`\n`    s = s + i`\n`print(s)`",
      options: ["3", "12", "15", "6"],
      answer: 1,
      explain: "`range(1, 6)` 產生 `1, 2, 3, 4, 5`。當 `i == 3` 時執行 `continue` 會跳過本輪的 `s = s + i` 直接進入下一輪 `i = 4`，因此 `s = 1 + 2 + 4 + 5 = 12`。",
      explanation: "`range(1, 6)` 產生 `1, 2, 3, 4, 5`。當 `i == 3` 時執行 `continue` 會跳過本輪的 `s = s + i` 直接進入下一輪 `i = 4`，因此 `s = 1 + 2 + 4 + 5 = 12`。"
    },
    {
      id: "prog3-h3",
      level: "分析",
      type: "single",
      q: "小華想計算 1 到 5 的總和，卻不小心把程式碼寫成：\n`for i in range(1, 6):`\n`    total = 0`\n`    total = total + i`\n`print(total)`\n請問最後印出的結果是多少？為什麼？",
      question: "小華想計算 1 到 5 的總和，卻不小心把程式碼寫成：\n`for i in range(1, 6):`\n`    total = 0`\n`    total = total + i`\n`print(total)`\n請問最後印出的結果是多少？為什麼？",
      options: ["15，因為程式完全正確", "0，因為最後被歸零", "5，因為 `total = 0` 被寫在迴圈內部，每一輪都把前一輪的累加結果洗掉歸零，只留下最後一輪 `i = 5` 的值", "1，因為只會執行第一輪"],
      answer: 2,
      explain: "`total = 0` 寫在迴圈縮排內，導致每一輪開始時 `total` 都被重設為 0；最後一輪 `i = 5` 時 `total = 0 + 5 = 5`，因此印出 `5`。",
      explanation: "`total = 0` 寫在迴圈縮排內，導致每一輪開始時 `total` 都被重設為 0；最後一輪 `i = 5` 時 `total = 0 + 5 = 5`，因此印出 `5`。"
    },
    {
      id: "prog3-h4",
      level: "應用",
      type: "single",
      q: "執行下列結合迴圈與條件判斷的程式碼後，變數 `count` 的最終值為何？\n`count = 0`\n`for n in range(1, 10):`\n`    if n % 3 == 0:`\n`        count = count + 1`\n`print(count)`",
      question: "執行下列結合迴圈與條件判斷的程式碼後，變數 `count` 的最終值為何？\n`count = 0`\n`for n in range(1, 10):`\n`    if n % 3 == 0:`\n`        count = count + 1`\n`print(count)`",
      options: ["2", "3", "9", "18"],
      answer: 1,
      explain: "`range(1, 10)` 為 `1 ~ 9`，其中滿足 `n % 3 == 0`（3 的倍數）的數字有 `3, 6, 9` 共 3 個，每遇到一個 `count` 就加 1，故最終 `count` 為 `3`。",
      explanation: "`range(1, 10)` 為 `1 ~ 9`，其中滿足 `n % 3 == 0`（3 的倍數）的數字有 `3, 6, 9` 共 3 個，每遇到一個 `count` 就加 1，故最終 `count` 為 `3`。"
    },
    {
      id: "prog3-h5",
      level: "分析",
      type: "single",
      q: "閱讀下列雙層巢狀迴圈程式碼，請問執行完畢後 `ans` 的值是多少？\n`ans = 0`\n`for i in range(1, 4):`\n`    for j in range(1, i + 1):`\n`        ans = ans + 1`\n`print(ans)`",
      question: "閱讀下列雙層巢狀迴圈程式碼，請問執行完畢後 `ans` 的值是多少？\n`ans = 0`\n`for i in range(1, 4):`\n`    for j in range(1, i + 1):`\n`        ans = ans + 1`\n`print(ans)`",
      options: ["3", "6", "9", "12"],
      answer: 1,
      explain: "外層 `i` 依序為 1, 2, 3：當 `i = 1` 時內層 `range(1, 2)` 執行 1 次；當 `i = 2` 時內層 `range(1, 3)` 執行 2 次；當 `i = 3` 時內層 `range(1, 4)` 執行 3 次。總計 `1 + 2 + 3 = 6` 次。",
      explanation: "外層 `i` 依序為 1, 2, 3：當 `i = 1` 時內層 `range(1, 2)` 執行 1 次；當 `i = 2` 時內層 `range(1, 3)` 執行 2 次；當 `i = 3` 時內層 `range(1, 4)` 執行 3 次。總計 `1 + 2 + 3 = 6` 次。"
    }
  ];

  const quizProg3 = {
    passScore: 60,
    easy: prog3EasyQuestions,
    medium: prog3MediumQuestions,
    hard: prog3HardQuestions,
    levels: {
      easy: {
        label: "入門探險家",
        icon: "🧭",
        badge: null,
        desc: "認識計數迴圈、條件迴圈與 range() 基本次數。",
        questions: prog3EasyQuestions
      },
      medium: {
        label: "進階挑戰者",
        icon: "🧰",
        badge: "silver",
        desc: "掌握 range(起始, 結束, 間隔)、迴圈累加追蹤與無窮迴圈判斷。",
        questions: prog3MediumQuestions
      },
      hard: {
        label: "大師領航員",
        icon: "👑",
        badge: "gold",
        desc: "深入分析 break / continue 流程控制、巢狀變數追蹤與迴圈結合條件篩選。",
        questions: prog3HardQuestions
      }
    }
  };

  const unitProg3 = {
    id: "prog-3",
    unit: "重複結構與迴圈控制 loop",
    study: { title: "重複結構與迴圈控制 loop", html: studyProg3 },
    learningContent: { title: "重複結構與迴圈控制 loop", html: studyProg3 },
    lesson: lessonProg3,
    worksheet: worksheetProg3,
    print: printProg3,
    lessonPlan: { lesson: lessonProg3, worksheet: worksheetProg3, print: printProg3 },
    quiz: quizProg3
  };


  /* ============================================================================
   * 單元四：prog-4（清單/陣列與函式模組化設計）
   * ============================================================================ */
  const studyProg4 = `
<section class="study-sec">
  <h3>🗂️ 清單/陣列（List/Array）與函式模組化（Function）架構圖解</h3>
  <p class="study-lead">當我們要處理全班 30 位同學的成績時，不需要建立 30 個獨立變數，只要用一個「清單/陣列（List）」就能依編號（索引 Index）整齊收納！而當程式規模變大時，將重複或特定功能拆解成獨立的「函式（Function）」模組，更能讓團隊分工合作、事半功倍。</p>
  <div class="hw-diagram" role="img" aria-label="清單索引結構與函式模組化圖解：上方為從索引 0 開始編號的清單格子，下方為主程式傳入參數呼叫函式並透過 return 取回結果">
    <svg viewBox="0 0 640 275" xmlns="http://www.w3.org/2000/svg">
      <rect x="4" y="4" width="632" height="267" rx="20" fill="#10375f" stroke="#7fb8e6" stroke-width="3"/>
      <text x="320" y="28" text-anchor="middle" fill="#d9fff0" font-size="14" font-weight="800">📦 清單 / 陣列（scores = [85, 92, 78, 96, 88]）— Python 索引從 0 開始！</text>
      <g font-weight="800" text-anchor="middle">
        <rect x="65" y="40" width="96" height="62" rx="8" fill="#ffd166" stroke="#a87400" stroke-width="2.5"/>
        <text x="113" y="60" font-size="11" fill="#3a2a00">索引 [0]</text>
        <text x="113" y="88" font-size="19" fill="#3a2a00">85</text>

        <rect x="171" y="40" width="96" height="62" rx="8" fill="#ffd166" stroke="#a87400" stroke-width="2.5"/>
        <text x="219" y="60" font-size="11" fill="#3a2a00">索引 [1]</text>
        <text x="219" y="88" font-size="19" fill="#3a2a00">92</text>

        <rect x="277" y="40" width="96" height="62" rx="8" fill="#ffd166" stroke="#a87400" stroke-width="2.5"/>
        <text x="325" y="60" font-size="11" fill="#3a2a00">索引 [2]</text>
        <text x="325" y="88" font-size="19" fill="#3a2a00">78</text>

        <rect x="383" y="40" width="96" height="62" rx="8" fill="#ffd166" stroke="#a87400" stroke-width="2.5"/>
        <text x="431" y="60" font-size="11" fill="#3a2a00">索引 [3]</text>
        <text x="431" y="88" font-size="19" fill="#3a2a00">96</text>

        <rect x="489" y="40" width="96" height="62" rx="8" fill="#ffd166" stroke="#a87400" stroke-width="2.5"/>
        <text x="537" y="60" font-size="11" fill="#3a2a00">索引 [4]</text>
        <text x="537" y="88" font-size="19" fill="#3a2a00">88</text>
      </g>

      <line x1="24" y1="118" x2="616" y2="118" stroke="#7fb8e6" stroke-width="1.5" stroke-dasharray="5 5"/>
      <text x="320" y="138" text-anchor="middle" fill="#d9fff0" font-size="14" font-weight="800">🧩 函式模組化設計：參數傳入（Input）➜ 函式處理 ➜ return 回傳值（Output）</text>

      <g font-weight="800" font-size="12" text-anchor="middle">
        <rect x="36" y="154" width="165" height="96" rx="12" fill="#4fb3ff" stroke="#0b5a99" stroke-width="2.5"/>
        <text x="118" y="178" font-size="13" fill="#04243f">主程式（Caller）</text>
        <text x="118" y="202" fill="#04243f">avg = get_avg(scores)</text>
        <text x="118" y="224" fill="#04243f">print(avg)  # 87.8</text>

        <rect x="258" y="150" width="346" height="104" rx="12" fill="#0f6b4f" stroke="#7be0b0" stroke-width="2.5"/>
        <text x="431" y="174" font-size="13" fill="#d9fff0">自訂函式：def get_avg(data):</text>
        <rect x="280" y="184" width="302" height="28" rx="6" fill="#7be0b0"/>
        <text x="431" y="203" fill="#02301f">計算總和與平均：ans = sum(data) / len(data)</text>
        <rect x="280" y="218" width="302" height="26" rx="6" fill="#c58bff"/>
        <text x="431" y="236" fill="#25063f">回傳結果：return ans</text>
      </g>
      <path d="M201 182 H258" stroke="#ffd166" stroke-width="3"/>
      <text x="230" y="174" text-anchor="middle" fill="#ffd166" font-size="11" font-weight="800">傳入參數</text>
      <path d="M258 228 H201" stroke="#c58bff" stroke-width="3"/>
      <text x="230" y="246" text-anchor="middle" fill="#f5d0fe" font-size="11" font-weight="800">return 回傳</text>
    </svg>
  </div>
  <ul class="study-list">
    <li><b>清單 / 陣列與索引值（Index）</b>：在 Python 中以中括號 <code>scores = [85, 92, 78]</code> 建立清單，<b>第一筆資料的索引編號永遠是 <code>0</code></b>（即 <code>scores[0]</code> 為 <code>85</code>），最後一筆的索引為 <code>len(scores) - 1</code>（或 <code>scores[-1]</code>）。</li>
    <li><b>走訪清單（Traversal）</b>：結合 <code>for x in scores:</code> 迴圈，可以從頭到尾依序取出清單中的每一筆資料進行統計、篩選或最高分比較。</li>
    <li><b>函式定義與呼叫（<code>def</code> &amp; Call）</b>：用 <code>def 函式名(參數):</code> 定義功能模組；定義後必須在主程式中「呼叫」它，函式才會真正執行。</li>
    <li><b>參數、回傳值（<code>return</code>）與變數作用範圍（Scope）</b>：<code>return</code> 負責把計算結果交回呼叫處並立刻結束函式；函式內部建立的變數屬於「區域變數（Local Variable）」，外部主程式無法直接存取。</li>
  </ul>
</section>

<section class="study-sec">
  <h3>📊 清單常用操作與函式構成要素對照表</h3>
  <div class="study-table-wrap">
  <table class="study-table">
    <tr><th>分類</th><th>語法 / 函式</th><th>功能說明</th><th>程式碼範例（設 <code>a = [10, 20, 30]</code>）</th><th>執行結果</th></tr>
    <tr><td>📋 清單讀取與修改</td><td><code>a[索引]</code></td><td>讀取或更新指定索引位置的資料</td><td><code>a[1] = 99</code></td><td><code>a</code> 變為 <code>[10, 99, 30]</code></td></tr>
    <tr><td>➕ 清單新增與長度</td><td><code>a.append(x)</code> / <code>len(a)</code></td><td>在清單尾端加入新元素 / 取得元素總數</td><td><code>a.append(40)</code> 後算 <code>len(a)</code></td><td>長度為 <code>4</code></td></tr>
    <tr><td>🧮 清單統計內建函式</td><td><code>sum(a)</code> / <code>max(a)</code> / <code>min(a)</code></td><td>快速計算清單總和、最大值、最小值</td><td><code>max([10, 20, 30])</code></td><td><code>30</code></td></tr>
    <tr><td>🧩 自訂函式定義</td><td><code>def 名稱(參數1, 參數2):</code></td><td>封裝可重複呼叫的子程式模組</td><td><code>def add(x, y): return x + y</code></td><td>呼叫 <code>add(3, 5)</code> 得 <code>8</code></td></tr>
    <tr><td>🔙 回傳值 vs 輸出</td><td><code>return 值</code> vs <code>print(值)</code></td><td><code>return</code> 將值傳回程式供後續計算；<code>print</code> 僅印在螢幕上</td><td>無 <code>return</code> 的函式預設回傳 <code>None</code></td><td><code>res = add(3, 5)</code> 可繼續運算</td></tr>
  </table>
  </div>
  <div class="flow-strip" aria-label="問題分解與模組化開發流程">
    <span>拆解大問題為子任務</span><i>➜</i><span>約定函式名稱、參數與 return 規格</span><i>➜</i><span>獨立撰寫與單測</span><i>➜</i><span>主程式整合呼叫</span>
  </div>
</section>

<section class="study-sec">
  <h3>⚠️ 易混淆迷思與常見錯誤整理</h3>
  <div class="myth-grid">
    <div class="myth"><div class="myth-q">❌ 「清單 <code>items = [\"劍\", \"盾\", \"藥水\"]</code> 裡有 3 樣東西，所以第 1 樣『劍』是 <code>items[1]</code>，第 3 樣是 <code>items[3]</code>！」</div><div class="myth-a">✅ <b>索引從 0 開始（Zero-based Indexing）與越界錯誤</b>：在 Python 等多數文字語言中，第 1 筆是 <code>items[0]</code>，第 3 筆是 <code>items[2]</code>；若存取 <code>items[3]</code> 會引發 <code>IndexError: list index out of range</code>（索引超出範圍）！（註：Scratch 積木的清單編號則是從 1 開始，轉換時要特別小心！）</div></div>
    <div class="myth"><div class="myth-q">❌ 「我在函式裡面已經寫了 <code>print(ans)</code>，為什麼主程式寫 <code>x = my_func()</code> 時，<code>x</code> 卻拿到 <code>None</code>？」</div><div class="myth-a">✅ <b>混淆 <code>print()</code> 與 <code>return</code></b>：<code>print()</code> 只是把字顯示在螢幕給人看，並沒有把值傳回給主程式！必須寫 <code>return ans</code>，主程式的變數才能接到計算結果。</div></div>
    <div class="myth"><div class="myth-q">❌ 「寫好 <code>def battle():</code> 之後按執行，為什麼電腦完全沒跑裡面的戰鬥程式？」</div><div class="myth-a">✅ <b>只定義而未呼叫函式</b>：<code>def</code> 就像寫好食譜收在抽屜裡，必須在主程式中實際寫出 <code>battle()</code> 呼叫它，電腦才會照食譜做菜。</div></div>
    <div class="myth"><div class="myth-q">❌ 「在函式裡面寫 <code>hp = hp - 20</code>，外面的全域變數 <code>hp</code> 就會自動少 20。」</div><div class="myth-a">✅ <b>變數作用範圍（Scope）隔離</b>：函式內的參數與變數預設是獨立的「區域變數」；應透過 <code>return hp</code> 並在主程式寫 <code>hp = hurt(hp)</code> 來更新外部狀態。</div></div>
  </div>
</section>`;

  const lessonProg4 = {
    title: "清單/陣列與函式模組化設計",
    overview: "本單元結合「陣列/清單（List）資料結構」與「模組化程式設計（Function）」，帶領學生學會使用清單與索引值管理整批資料、透過迴圈走訪清單完成統計分析，並運用「問題分解」思維定義具參數與 `return` 回傳值的自訂函式，理解變數作用範圍（Scope），分組完成模組化專題。",
    standards: ["資P-IV-3", "資P-IV-4", "資P-IV-5", "運t-IV-3", "運t-IV-4"],
    objectives: [
      "能建立清單（List），並正確使用從 0 開始的索引值（Index）進行資料讀取、修改、新增（`append`）與長度查詢（`len`）。",
      "能結合 `for` 迴圈走訪清單，實作總和、平均、最高分或條件篩選等資料處理功能。",
      "能使用 `def` 定義含參數與 `return` 回傳值的函式，並區分區域變數與全域變數的作用範圍。",
      "能將複雜問題拆解為多個獨立函式模組，與同儕依介面規格分工合作並完成整合除錯。"
    ],
    prep: [
      "教師：電腦教室（Python / Scratch 環境）、編號 0~4 的五格實體置物盒教具、模組分工規格單。",
      "學生：每人一台電腦、A4 清單與函式模組化實作學習單。"
    ],
    flow: [
      { phase: "引起動機", min: 10, teacher: "展示編號 0 到 4 的五格連排置物盒，對比「拿 5 個散落袋子」與「用一排編號置物盒管理班級成績」，引出清單（List）與索引概念。", student: "體驗從編號 0 開始取物，理解清單能有系統地收納同類型的多筆資料。" },
      { phase: "發展活動一：清單索引操作與迴圈走訪", min: 25, teacher: "講解 Python 清單 `scores = [80, 95, 70]` 的索引讀取、修改、`append()`、`len()`，以及用 `for s in scores:` 走訪統計及格人數。", student: "上機實作清單增刪改查，並用迴圈走訪清單找出全班最高分與平均分。" },
      { phase: "發展活動二：問題分解、def 函式與 return", min: 25, teacher: "示範將「計算平均」、「找出最高分」、「判定等第」封裝成獨立函式，剖析參數傳遞、`return` 與 `print` 的差異及區域變數 Scope。", student: "將剛才的清單統計程式改寫為自訂函式，練習傳入清單參數並接收 `return` 回傳值。" },
      { phase: "實作挑戰：班級成績分析儀 / 背包道具管理模組", min: 30, teacher: "指導學生結合「清單」與「多個自訂函式」完成模組化小專題，並進行邊界與錯誤測試。", student: "依學習單規格定義函式、撰寫主程式呼叫，完成整合測試與互評。" }
    ],
    differentiation: "補救教學：提供已定義好函式名稱與參數列的程式骨架，讓學生填入清單走訪與 `return` 語句。加深加廣：挑戰設計多關卡《文字冒險遊戲》，用清單管理玩家背包道具，各關卡獨立為函式並回傳更新後的生命值與背包。",
    assessmentFocus: "能否正確使用 0 起始的清單索引、結合迴圈走訪清單，以及正確運用 `def`、參數與 `return` 完成模組化程式。",
    extension: "嘗試撰寫一個函式 `filter_pass(scores)`，傳入全班成績清單後，回傳一個「只包含 60 分以上及格成績」的新清單。"
  };

  const worksheetProg4 = {
    title: "程式森林探險單（四）：清單百寶箱與函式模組建築師",
    intro: "學會了「清單（List）」與「函式（Function）」，你就能一次處理成千上萬筆資料，還能像積木建築師一樣把大程式拆成清爽好維護的模組！",
    sections: [
      {
        title: "一、暖身：清單索引大考驗",
        items: [
          { type: "fill", q: "在 Python 中，若建立清單 `bag = [\"羅盤\", \"水壺\", \"帳篷\", \"手電筒\"]`，則 `len(bag)` 的值為 `____`；第一項 `\"羅盤\"` 的索引寫法是 `bag[____]`；`bag[2]` 拿到的物品是 `____`。", answer: "4、0、\"帳篷\"" },
          { type: "short", q: "承上題，如果執行 `bag.append(\"急救包\")` 之後，再執行 `bag[1] = \"保溫瓶\"`，請寫出此時 `bag` 清單的完整內容。", answer: "[\"羅盤\", \"保溫瓶\", \"帳篷\", \"手電筒\", \"急救包\"]" }
        ]
      },
      {
        title: "二、理解：清單走訪與函式回傳值追蹤",
        items: [
          { type: "short", q: "請追蹤下列結合清單與迴圈的程式碼，寫出最終印出的 `c` 值是多少？\n`nums = [12, 5, 20, 8, 15]`\n`c = 0`\n`for x in nums:`\n`    if x >= 10:`\n`        c = c + 1`\n`print(c)`", answer: "迴圈依序檢查清單元素，大於等於 10 的有 12、20、15 共 3 個，因此最終印出 c = 3。" },
          { type: "table", q: "請比較在自訂函式中寫 `print(ans)` 與寫 `return ans` 的差異，並說明若函式沒有寫 `return`，主程式呼叫並賦值時會拿到什麼？", answer: "`print(ans)` 僅在螢幕顯示文字，無法把值傳回主程式運算；`return ans` 會將計算結果傳回呼叫處並結束函式。若未寫 `return`，預設會回傳 `None`。" }
        ]
      },
      {
        title: "三、應用與反思：模組化問題分解設計",
        items: [
          { type: "draw", q: "請為「班級運動會成績統計系統」畫出模組化架構圖：主程式 `main()` 擁有成績清單 `scores`，並分別呼叫三個子函式：(1) `calc_avg(data)`、(2) `find_max(data)`、(3) `count_pass(data)`，標註每個函式的傳入參數與 `return` 回傳值。", answer: "主程式傳入 `scores` 清單作為參數 → `calc_avg` 回傳平均浮點數、`find_max` 回傳最高分整數、`count_pass` 回傳及格人數整數 → 主程式接收回傳值並印出總表。" },
          { type: "reflect", q: "當你跟三位同學一起分工合作寫一個大型遊戲程式時，把不同功能拆成獨立的「函式（Function）」有哪些好處？", answer: "每個人可以負責獨立的函式互不干擾、相同的程式碼不必重複貼上、哪個功能出錯只要檢查該函式即可（易於除錯與維護）。" }
        ]
      }
    ]
  };

  const printProg4 = {
    situation: "校慶園遊會結束後，學生會需要一套「各班攤位營收統計與榮譽評選系統」。請你將全部攤位的營收金額儲存在一個「清單（List）」中，並運用「函式模組化設計」分別撰寫：(1) 計算總營收與平均營收函式、(2) 找出最高營收攤位函式、(3) 篩選達標攤位數量函式，最後由主程式呼叫整合並印出成果報表！",
    thinking: [
      "為什麼把 10 個攤位的營收放進同一個清單 `revenues = [...]`，比建立 `rev1, rev2, ..., rev10` 十個變數更好處理？",
      "在撰寫 `find_max(data)` 函式時，如果沒有使用 `return` 把最高金額傳出來，主程式在計算「最高金額佔總營收比例」時會發生什麼問題？",
      "如果清單共有 10 筆資料（長度 `len` 為 10），合法的索引範圍是從幾號到幾號？為什麼寫 `revenues[10]` 會發生執行期錯誤？"
    ],
    flowchart: "請畫出「攤位營收統計系統」的模組化呼叫與清單走訪流程圖：主程式建立營收清單 `revenues` → 呼叫 `get_summary(revenues)` 與 `count_goal(revenues, 5000)` → 函式內部以 `for` 迴圈走訪清單元素並透過 `return` 回傳結果 → 主程式輸出完整報表。",
    rubric: [
      { c: "清單索引與走訪正確性", a: "熟練運用 0 起始索引、append、len 與 for 迴圈走訪清單，無索引越界錯誤", b: "能建立清單並完成基本讀取與走訪，偶有索引偏移需修正", t: "混淆索引編號規則或無法使用迴圈讀取清單元素" },
      { c: "函式定義、參數與 return", a: "清楚拆解多個職責分明的函式，參數傳遞與 return 回傳值設計完全正確", b: "能定義並呼叫函式，但部分功能誤用 print 取代 return", t: "只定義未呼叫函式，或完全未進行函式模組化設計" },
      { c: "問題分解與整合除錯", a: "模組架構清晰、變數作用範圍（Scope）正確，並以多組清單資料完成整合測試", b: "主程式能成功呼叫函式完成主要統計，完成基本測試", t: "因區域變數混淆或語法錯誤導致程式無法整合執行" }
    ]
  };

  const prog4EasyQuestions = [
    {
      id: "prog4-e1",
      level: "記憶",
      type: "single",
      q: "在 Python 中建立一個清單 `fruits = [\"蘋果\", \"香蕉\", \"芒果\", \"奇異果\"]`，請問 `fruits[0]` 會取出哪一項資料？",
      question: "在 Python 中建立一個清單 `fruits = [\"蘋果\", \"香蕉\", \"芒果\", \"奇異果\"]`，請問 `fruits[0]` 會取出哪一項資料？",
      options: ["\"蘋果\"", "\"香蕉\"", "\"奇異果\"", "發生錯誤，因為沒有第 0 項"],
      answer: 0,
      explain: "Python 清單的索引值（Index）是從 `0` 開始編號，因此 `fruits[0]` 代表第一筆資料 `\"蘋果\"`。",
      explanation: "Python 清單的索引值（Index）是從 `0` 開始編號，因此 `fruits[0]` 代表第一筆資料 `\"蘋果\"`。"
    },
    {
      id: "prog4-e2",
      level: "記憶",
      type: "single",
      q: "在 Python 中，用來「定義一個自訂函式」與「將計算結果從函式傳回呼叫處」的關鍵字分別是什麼？",
      question: "在 Python 中，用來「定義一個自訂函式」與「將計算結果從函式傳回呼叫處」的關鍵字分別是什麼？",
      options: ["`if` 與 `else`", "`for` 與 `while`", "`def` 與 `return`", "`list` 與 `append`"],
      answer: 2,
      explain: "Python 使用 `def` 定義函式，並使用 `return` 將函式運算結果回傳給呼叫者。",
      explanation: "Python 使用 `def` 定義函式，並使用 `return` 將函式運算結果回傳給呼叫者。"
    },
    {
      id: "prog4-e3",
      level: "理解",
      type: "single",
      q: "已知清單 `scores = [70, 85, 90]`。若執行 `scores.append(100)` 後，再查詢清單長度 `len(scores)`，結果會是多少？",
      question: "已知清單 `scores = [70, 85, 90]`。若執行 `scores.append(100)` 後，再查詢清單長度 `len(scores)`，結果會是多少？",
      options: ["3", "4", "100", "345"],
      answer: 1,
      explain: "`append(100)` 會在清單尾端新增一筆元素，使清單變成 `[70, 85, 90, 100]`，共有 4 筆元素，故 `len(scores)` 為 `4`。",
      explanation: "`append(100)` 會在清單尾端新增一筆元素，使清單變成 `[70, 85, 90, 100]`，共有 4 筆元素，故 `len(scores)` 為 `4`。"
    }
  ];

  const prog4MediumQuestions = [
    {
      id: "prog4-m1",
      level: "應用",
      type: "single",
      q: "設清單 `arr = [10, 20, 30, 40]`。依序執行 `arr[2] = arr[0] + arr[3]` 後，清單 `arr` 的內容會變成什麼？",
      question: "設清單 `arr = [10, 20, 30, 40]`。依序執行 `arr[2] = arr[0] + arr[3]` 後，清單 `arr` 的內容會變成什麼？",
      options: ["[10, 50, 30, 40]", "[10, 20, 50, 40]", "[50, 20, 30, 40]", "[10, 20, 30, 50]"],
      answer: 1,
      explain: "`arr[0]` 為 10，`arr[3]` 為 40，相加得 50，存入索引為 2 的位置（第 3 個元素 `arr[2]`），因此清單變為 `[10, 20, 50, 40]`。",
      explanation: "`arr[0]` 為 10，`arr[3]` 為 40，相加得 50，存入索引為 2 的位置（第 3 個元素 `arr[2]`），因此清單變為 `[10, 20, 50, 40]`。"
    },
    {
      id: "prog4-m2",
      level: "應用",
      type: "single",
      q: "執行下列結合清單走訪的程式碼後，螢幕會輸出什麼結果？\n`data = [4, 9, 2, 7, 6]`\n`total = 0`\n`for n in data:`\n`    if n > 5:`\n`        total = total + n`\n`print(total)`",
      question: "執行下列結合清單走訪的程式碼後，螢幕會輸出什麼結果？\n`data = [4, 9, 2, 7, 6]`\n`total = 0`\n`for n in data:`\n`    if n > 5:`\n`        total = total + n`\n`print(total)`",
      options: ["28", "22", "16", "3"],
      answer: 1,
      explain: "迴圈走訪清單 `data` 中的每個數字，並篩選出「大於 5」的數字（9、7、6）進行累加：`9 + 7 + 6 = 22`。",
      explanation: "迴圈走訪清單 `data` 中的每個數字，並篩選出「大於 5」的數字（9、7、6）進行累加：`9 + 7 + 6 = 22`。"
    },
    {
      id: "prog4-m3",
      level: "應用",
      type: "single",
      q: "執行下列含自訂函式的 Python 程式碼後，螢幕上會印出什麼？\n`def calc_price(price, qty):`\n`    return price * qty - 10`\n`ans = calc_price(30, 4)`\n`print(ans)`",
      question: "執行下列含自訂函式的 Python 程式碼後，螢幕上會印出什麼？\n`def calc_price(price, qty):`\n`    return price * qty - 10`\n`ans = calc_price(30, 4)`\n`print(ans)`",
      options: ["120", "110", "80", "34"],
      answer: 1,
      explain: "呼叫 `calc_price(30, 4)` 時，`price = 30`、`qty = 4`，計算 `30 * 4 - 10 = 110` 並透過 `return` 回傳存入 `ans`，故印出 `110`。",
      explanation: "呼叫 `calc_price(30, 4)` 時，`price = 30`、`qty = 4`，計算 `30 * 4 - 10 = 110` 並透過 `return` 回傳存入 `ans`，故印出 `110`。"
    },
    {
      id: "prog4-m4",
      level: "理解",
      type: "single",
      q: "關於「模組化程式設計（將大問題拆解為多個函式）」，下列敘述何者「錯誤」？",
      question: "關於「模組化程式設計（將大問題拆解為多個函式）」，下列敘述何者「錯誤」？",
      options: ["相同的邏輯只需寫成一個函式，就能在程式不同地方重複呼叫，減少重複程式碼", "團隊合作時，組員只要事先約定好函式的名稱、參數與回傳值規格，就能分工撰寫不同函式", "某個功能算錯時，只需針對負責該功能的函式進行局部測試與除錯", "只要定義了 `def my_func():`，就算主程式完全沒有呼叫它，它也會在開機時自動執行"],
      answer: 3,
      explain: "使用 `def` 僅是「定義」函式，若主程式中沒有實際「呼叫」該函式（`my_func()`），函式內的程式碼不會被執行。",
      explanation: "使用 `def` 僅是「定義」函式，若主程式中沒有實際「呼叫」該函式（`my_func()`），函式內的程式碼不會被執行。"
    }
  ];

  const prog4HardQuestions = [
    {
      id: "prog4-h1",
      level: "分析",
      type: "single",
      q: "已知清單 `nums = [15, 28, 33, 41]`（共有 4 個元素）。若在 Python 中執行 `print(nums[4])` 會發生什麼事？",
      question: "已知清單 `nums = [15, 28, 33, 41]`（共有 4 個元素）。若在 Python 中執行 `print(nums[4])` 會發生什麼事？",
      options: ["印出 41", "印出 0", "引發 `IndexError: list index out of range`（索引超出範圍錯誤），因為合法的正整數索引只有 0 到 3", "自動在清單尾端新增一個 4"],
      answer: 2,
      explain: "長度為 4 的清單，其正索引範圍為 `0, 1, 2, 3`（即 `0` 到 `len(nums) - 1`）。存取 `nums[4]` 會超出範圍並引發執行期的 `IndexError`。",
      explanation: "長度為 4 的清單，其正索引範圍為 `0, 1, 2, 3`（即 `0` 到 `len(nums) - 1`）。存取 `nums[4]` 會超出範圍並引發執行期的 `IndexError`。"
    },
    {
      id: "prog4-h2",
      level: "分析",
      type: "single",
      q: "閱讀下列在清單中尋找最大值的函式程式碼：\n`def get_max(arr):`\n`    m = arr[0]`\n`    for x in arr:`\n`        if x > m:`\n`            m = x`\n`    return m`\n`print(get_max([-12, -5, -20, -8]))`\n請問執行結果為何？且為什麼初值要設為 `m = arr[0]` 而不是 `m = 0`？",
      question: "閱讀下列在清單中尋找最大值的函式程式碼：\n`def get_max(arr):`\n`    m = arr[0]`\n`    for x in arr:`\n`        if x > m:`\n`            m = x`\n`    return m`\n`print(get_max([-12, -5, -20, -8]))`\n請問執行結果為何？且為什麼初值要設為 `m = arr[0]` 而不是 `m = 0`？",
      options: ["輸出 `0`；因為設為 0 比較簡單", "輸出 `-5`；因為若初值誤設為 `m = 0`，當清單全部都是負數時，沒有任何負數大於 0，就會錯誤回傳不在清單裡的 `0`", "輸出 `-20`；因為 `-20` 數字最大", "會發生語法錯誤，清單不能放負數"],
      answer: 1,
      explain: "清單 `[-12, -5, -20, -8]` 中最大的值是 `-5`。將擂台主初值設為第一筆元素 `arr[0]`（-12），才能確保即使全為負數也能正確比較出最大值 `-5`。",
      explanation: "清單 `[-12, -5, -20, -8]` 中最大的值是 `-5`。將擂台主初值設為第一筆元素 `arr[0]`（-12），才能確保即使全為負數也能正確比較出最大值 `-5`。"
    },
    {
      id: "prog4-h3",
      level: "分析",
      type: "single",
      q: "執行下列考驗「變數作用範圍（Scope）」的 Python 程式碼後，螢幕輸出的結果為何？\n`hp = 100`\n`def poison(hp):`\n`    hp = hp - 25`\n`poison(hp)`\n`print(hp)`",
      question: "執行下列考驗「變數作用範圍（Scope）」的 Python 程式碼後，螢幕輸出的結果為何？\n`hp = 100`\n`def poison(hp):`\n`    hp = hp - 25`\n`poison(hp)`\n`print(hp)`",
      options: ["75", "100", "25", "None"],
      answer: 1,
      explain: "函式 `poison` 內的 `hp` 是區域變數（Local Variable），且該函式沒有 `return`、主程式也沒有將回傳值重新賦值給全域變數 `hp`，因此外部的 `hp` 不受影響，依然維持 `100`。",
      explanation: "函式 `poison` 內的 `hp` 是區域變數（Local Variable），且該函式沒有 `return`、主程式也沒有將回傳值重新賦值給全域變數 `hp`，因此外部的 `hp` 不受影響，依然維持 `100`。"
    },
    {
      id: "prog4-h4",
      level: "應用",
      type: "single",
      q: "執行下列結合「函式呼叫函式」與清單的程式碼後，最後印出的結果是多少？\n`def square(n):`\n`    return n * n`\n`def sum_squares(items):`\n`    s = 0`\n`    for x in items:`\n`        s = s + square(x)`\n`    return s`\n`print(sum_squares([2, 3, 4]))`",
      question: "執行下列結合「函式呼叫函式」與清單的程式碼後，最後印出的結果是多少？\n`def square(n):`\n`    return n * n`\n`def sum_squares(items):`\n`    s = 0`\n`    for x in items:`\n`        s = s + square(x)`\n`    return s`\n`print(sum_squares([2, 3, 4]))`",
      options: ["9", "20", "29", "81"],
      answer: 2,
      explain: "`sum_squares([2, 3, 4])` 會走訪清單，依序呼叫 `square(2)` 得 4、`square(3)` 得 9、`square(4)` 得 16，累加 `4 + 9 + 16 = 29` 並回傳印出。",
      explanation: "`sum_squares([2, 3, 4])` 會走訪清單，依序呼叫 `square(2)` 得 4、`square(3)` 得 9、`square(4)` 得 16，累加 `4 + 9 + 16 = 29` 並回傳印出。"
    },
    {
      id: "prog4-h5",
      level: "分析",
      type: "single",
      q: "閱讀下列含有多個 `return` 與清單索引的程式碼，請問 `mystery([10, 25, 30, 45])` 的回傳值為何？\n`def mystery(data):`\n`    for i in range(len(data)):`\n`        if data[i] > 20:`\n`            return i`\n`    return -1`",
      question: "閱讀下列含有多個 `return` 與清單索引的程式碼，請問 `mystery([10, 25, 30, 45])` 的回傳值為何？\n`def mystery(data):`\n`    for i in range(len(data)):`\n`        if data[i] > 20:`\n`            return i`\n`    return -1`",
      options: ["25", "1", "3", "-1"],
      answer: 1,
      explain: "`range(len(data))` 產生索引 `i = 0, 1, 2, 3`。當 `i = 0` 時 `data[0]` 為 10（未大於 20）；當 `i = 1` 時 `data[1]` 為 25（> 20 成立），立刻執行 `return i` 回傳索引值 `1` 並結束函式！",
      explanation: "`range(len(data))` 產生索引 `i = 0, 1, 2, 3`。當 `i = 0` 時 `data[0]` 為 10（未大於 20）；當 `i = 1` 時 `data[1]` 為 25（> 20 成立），立刻執行 `return i` 回傳索引值 `1` 並結束函式！"
    }
  ];

  const quizProg4 = {
    passScore: 60,
    easy: prog4EasyQuestions,
    medium: prog4MediumQuestions,
    hard: prog4HardQuestions,
    levels: {
      easy: {
        label: "入門探險家",
        icon: "🧭",
        badge: null,
        desc: "認識清單（List）索引規則、len() 長度與函式 def 基本語法。",
        questions: prog4EasyQuestions
      },
      medium: {
        label: "進階挑戰者",
        icon: "🧰",
        badge: "silver",
        desc: "掌握清單元素修改、迴圈走訪統計、函式參數傳遞與 return 追蹤。",
        questions: prog4MediumQuestions
      },
      hard: {
        label: "大師領航員",
        icon: "👑",
        badge: "gold",
        desc: "深入分析索引越界、最大值演算法、變數作用範圍（Scope）與函式整合清單處理。",
        questions: prog4HardQuestions
      }
    }
  };

  const unitProg4 = {
    id: "prog-4",
    unit: "清單/陣列與函式模組化設計",
    study: { title: "清單/陣列與函式模組化設計", html: studyProg4 },
    learningContent: { title: "清單/陣列與函式模組化設計", html: studyProg4 },
    lesson: lessonProg4,
    worksheet: worksheetProg4,
    print: printProg4,
    lessonPlan: { lesson: lessonProg4, worksheet: worksheetProg4, print: printProg4 },
    quiz: quizProg4
  };

  /* ============================================================================
   * 單元五：prog-5（函式與問題分解）
   * ============================================================================ */
  const studyProg5 = `
<section class="study-sec">
  <h3>🧩 問題分解（Decomposition）、函式模組化與變數作用域圖解</h3>
  <p class="study-lead">面對「文字冒險遊戲」或「點餐系統」等大型任務時，直接把數百行程式碼全寫在一起會極難閱讀與除錯。運用運算思維的<b>問題分解（Decomposition）</b>與<b>模組化（Modularization）</b>，將複雜問題拆成一個個專職獨立的 Python <b>函式（Function）</b>，就能大幅減少重複程式碼、方便團隊分工與局部除錯！</p>
  <div class="hw-diagram" role="img" aria-label="問題分解階層圖、Python函式位置與預設參數語法、以及區域變數與全域變數作用域對照圖">
    <svg viewBox="0 0 640 275" xmlns="http://www.w3.org/2000/svg">
      <rect x="4" y="4" width="632" height="267" rx="20" fill="#10375f" stroke="#7fb8e6" stroke-width="3"/>
      <text x="160" y="28" text-anchor="middle" fill="#ffd166" font-size="13" font-weight="800">🌲 問題分解與模組化呼叫架構</text>
      <g font-weight="800" text-anchor="middle" font-size="11">
        <rect x="75" y="40" width="170" height="34" rx="8" fill="#ffd166" stroke="#a87400" stroke-width="2"/>
        <text x="160" y="61" fill="#3a2a00">主程式：文字冒險遊戲 main()</text>
        <path d="M160 74 V88 M65 88 H255 M65 88 V102 M160 88 V102 M255 88 V102" stroke="#fff" stroke-width="2" fill="none"/>
        <rect x="20" y="102" width="90" height="44" rx="8" fill="#4fb3ff" stroke="#0b5a99" stroke-width="2"/>
        <text x="65" y="121" fill="#04243f">開場設定</text>
        <text x="65" y="137" font-size="10" fill="#04243f">init_hero()</text>

        <rect x="115" y="102" width="90" height="44" rx="8" fill="#7be0b0" stroke="#0c6f50" stroke-width="2"/>
        <text x="160" y="121" fill="#02301f">戰鬥扣血</text>
        <text x="160" y="137" font-size="10" fill="#02301f">battle(hp)</text>

        <rect x="210" y="102" width="90" height="44" rx="8" fill="#c58bff" stroke="#6a2fb0" stroke-width="2"/>
        <text x="255" y="121" fill="#25063f">結局判定</text>
        <text x="255" y="137" font-size="10" fill="#25063f">end_game()</text>
      </g>

      <text x="475" y="28" text-anchor="middle" fill="#7be0b0" font-size="13" font-weight="800">⚙️ 位置參數與預設參數語法規則</text>
      <g transform="translate(320, 40)" font-weight="700" font-size="11">
        <rect x="0" y="0" width="300" height="106" rx="10" fill="#0b2545" stroke="#7be0b0" stroke-width="2"/>
        <text x="14" y="24" fill="#ffd166" font-weight="800">def calc_fee(price, rate=0.9):</text>
        <text x="26" y="45" fill="#e2e8f0">return price * rate   # 預設參數置於右側</text>
        <line x1="14" y1="56" x2="286" y2="56" stroke="#4fb3ff" stroke-dasharray="4 3"/>
        <text x="14" y="75" fill="#93c5fd">calc_fee(100)      ➜ rate 用預設 0.9 ➜ 90.0</text>
        <text x="14" y="95" fill="#a7f3d0">calc_fee(100, 0.8) ➜ 位置對應覆蓋為 0.8 ➜ 80.0</text>
      </g>

      <text x="320" y="168" text-anchor="middle" fill="#ff8a65" font-size="13" font-weight="800">📦 變數作用域（Scope）：全域變數 Global vs 區域變數 Local</text>
      <g transform="translate(20, 178)" font-weight="700" font-size="11">
        <rect x="0" y="0" width="290" height="78" rx="10" fill="#1b2a4a" stroke="#4fb3ff" stroke-width="2"/>
        <text x="145" y="22" text-anchor="middle" fill="#4fb3ff" font-weight="800">🌍 全域作用域（函式外部）</text>
        <text x="16" y="44" fill="#e2e8f0">score = 100   # 全程式皆可讀取</text>
        <text x="16" y="64" fill="#93c5fd">需靠 new = add_bonus(score) 接收回傳更新</text>

        <rect x="310" y="0" width="290" height="78" rx="10" fill="#2b1d38" stroke="#ff8a65" stroke-width="2"/>
        <text x="455" y="22" text-anchor="middle" fill="#ff8a65" font-weight="800">🏠 區域作用域（函式內部）</text>
        <text x="326" y="44" fill="#ffe5d9">def add_bonus(s): bonus = 20 ...</text>
        <text x="326" y="64" fill="#fda4af">bonus 僅存活於函式內，結束即釋放！</text>
      </g>
    </svg>
  </div>
  <ul class="study-list">
    <li><b>問題分解與模組化優勢</b>：將大系統拆成職責單一的小函式，可達成<b>① 消除重複程式碼（DRY）</b>、<b>② 團隊平行分工開發</b>、<b>③ 獨立單元測試與快速除錯維護</b>。</li>
    <li><b>函式定義與參數傳遞</b>：語法為 <code>def 函式名稱(位置參數, 預設參數=預設值):</code>（結尾須加冒號 <code>:</code> 並縮排）。呼叫時依位置順序傳入引數；若有「預設參數」，必須排在沒有預設值的參數<b>後面</b>。</li>
    <li><b><code>return</code> 立即結束並回傳</b>：<code>return</code> 會把運算結果交回呼叫處並<b>立刻終止該函式執行</b>（寫在 <code>return</code> 後方的同層程式碼不會被執行）；若只寫 <code>print()</code> 而無 <code>return</code>，函式預設回傳 <code>None</code>。</li>
    <li><b>區域變數（Local）與全域變數（Global）</b>：函式內部建立的變數或參數皆屬「區域變數」，無法在函式外直接讀取，也不會直接改動外部同名變數；實務上推薦以「參數傳入 + <code>return</code> 回傳」取代隨意使用 <code>global</code>。</li>
  </ul>
</section>

<section class="study-sec">
  <h3>📊 函式參數類型、回傳與作用域對照表</h3>
  <div class="study-table-wrap">
  <table class="study-table">
    <tr><th>核心概念</th><th>Python 語法範例</th><th>執行行為說明</th><th>常見錯誤或注意事項</th></tr>
    <tr><td>📍 位置參數</td><td><code>def rect(w, h): return w * h</code></td><td>呼叫 <code>rect(5, 3)</code> 時依順序 <code>w=5, h=3</code></td><td>引數個數若與參數不符會引發 <code>TypeError</code></td></tr>
    <tr><td>🎛️ 預設參數</td><td><code>def greet(name, msg="你好"):</code></td><td><code>greet("小安")</code> 用預設 <code>"你好"</code>；<code>greet("小安","早")</code> 可覆蓋</td><td><code>def f(a=1, b):</code> 不合法！預設參數必須放右側</td></tr>
    <tr><td>🔙 return vs print</td><td><code>return x * 2</code> vs <code>print(x * 2)</code></td><td><code>return</code> 將值交回主程式並立刻離開函式</td><td><code>res = f(3)</code> 若無 <code>return</code>，<code>res</code> 為 <code>None</code></td></tr>
    <tr><td>🔭 變數作用域</td><td>函式外 <code>x = 10</code> / 函式內 <code>x = 99</code></td><td>函式內賦值會建立獨立區域變數 <code>x</code>，外部 <code>x</code> 仍為 10</td><td>若在函式內讀取同名全域變數後又賦值會觸發 <code>UnboundLocalError</code></td></tr>
  </table>
  </div>
  <div class="flow-strip" aria-label="模組化程式開發四步驟">
    <span>1 問題分解成子任務</span><i>➜</i><span>2 約定函式名稱、參數與 return 規格</span><i>➜</i><span>3 單獨測試各函式模組</span><i>➜</i><span>4 主程式呼叫整合成完整系統</span>
  </div>
</section>

<section class="study-sec">
  <h3>⚠️ 易混淆迷思與常見陷阱整理</h3>
  <div class="myth-grid">
    <div class="myth"><div class="myth-q">❌ 「函式裡面已經寫了 <code>print(total)</code>，主程式寫 <code>ans = calc(10)</code> 就能拿到數字去乘以 2！」</div><div class="myth-a">✅ <b><code>print()</code> 只是顯示在螢幕，並非回傳值</b>：沒有寫 <code>return</code> 的函式會回傳 <code>None</code>，拿 <code>None * 2</code> 會立刻引發 <code>TypeError</code>！</div></div>
    <div class="myth"><div class="myth-q">❌ 「函式裡的 <code>return</code> 執行完後，同一層後面的 <code>print(\"完成\")</code> 還是會繼續執行吧？」</div><div class="myth-a">✅ <b><code>return</code> 會立刻終止函式並跳回呼叫處</b>：一旦執行到 <code>return</code>，函式內接在後面的程式碼都將被跳過不執行。</div></div>
    <div class="myth"><div class="myth-q">❌ 「定義預設參數時，寫成 <code>def buy(qty=1, price):</code> 應該沒關係，反正呼叫時會看清楚。」</div><div class="myth-a">✅ <b>語法規定預設參數必須全部放在非預設參數之後</b>：<code>def buy(qty=1, price):</code> 會直接報 <code>SyntaxError</code>，必須寫成 <code>def buy(price, qty=1):</code>。</div></div>
    <div class="myth"><div class="myth-q">❌ 「在每個函式裡全部加上 <code>global</code> 修改同一個全域變數，比用參數傳來傳去更高級！」</div><div class="myth-a">✅ <b>濫用 <code>global</code> 會破壞模組獨立性</b>：多個函式同時偷改全域變數會讓除錯變噩夢；標準模組化寫法應靠「參數輸入 + <code>return</code> 輸出」清楚交接資料。</div></div>
  </div>
</section>`;

  const lessonProg5 = {
    title: "函式與問題分解",
    overview: "本單元帶領學生掌握運算思維的「問題分解（Decomposition）」與「模組化程式設計（Modularization）」，深入學習 Python 函式定義語法 `def 函式名稱(參數):`、位置參數與預設參數規則、`return` 回傳值與 `print()` 輸出的核心差異、函式執行流程追蹤，以及區域變數（Local）與全域變數（Global）的作用域觀念，並分工實作模組化「文字冒險遊戲」。",
    standards: ["資P-IV-4", "資P-IV-5", "運t-IV-3", "運t-IV-4"],
    objectives: [
      "能說明運算思維中「問題分解」與「模組化」的意義與優點（減少重複程式碼、團隊分工、易於除錯維護）。",
      "能正確撰寫 Python `def` 函式語法，並運用位置參數與預設參數（預設參數置後規則）呼叫函式。",
      "能區分 `return` 回傳值與 `print()` 螢幕輸出的差異，並追蹤多函式呼叫與提前 `return` 的執行流程。",
      "能辨識區域變數與全域變數的作用域（Scope），以「參數傳入＋`return` 回傳」取代濫用 `global` 完成模組整合。"
    ],
    prep: [
      "教師：電腦教室（Python 環境）、模組介面規格卡、作用域與執行流程追蹤示範檔。",
      "學生：每人一台電腦、A4 函式與問題分解實作學習單。"
    ],
    flow: [
      { phase: "引起動機", min: 25, teacher: "比較 120 行擠在一起的冒險程式與拆分為 4 個函式的模組化程式，請學生討論修改與分工難度差異。", student: "歸納問題分解與模組化的優點：好讀、不重複、易分工除錯。" },
      { phase: "發展活動一：def 語法、位置參數與預設參數", min: 65, teacher: "講解 `def 函式名(參數):` 縮排語法、位置參數順序對應，以及預設參數（如 `rate=0.9` 必須放非預設參數右側）的設計方式。", student: "撰寫具位置參數與預設參數的計價/打招呼函式，驗證省略與覆蓋預設值的執行結果。" },
      { phase: "發展活動二：return 追蹤與變數作用域（Scope）", min: 80, teacher: "實驗對比 `print()` 與 `return`（含 `None` 錯誤與 `return` 提前結束函式），並以實體房間比喻說明區域變數與全域變數作用域。", student: "完成多函式呼叫流程追蹤表與作用域除錯練習，改寫誤用全域變數的範例程式。" },
      { phase: "實作與評量：分組開發文字冒險遊戲", min: 100, teacher: "指導各組先填寫函式介面規格（名稱、參數、回傳值）再各自開發關卡函式，最後整合測試並檢核。", student: "依規格撰寫與測試獨立函式模組，整合完成多場景文字冒險遊戲並互評。" }
    ],
    differentiation: "補救教學：提供已畫好主控流程與關卡函式參數簽名的程式碼骨架。加深加廣：挑戰加入預設參數選項、多層函式呼應呼叫，以及編寫自動單元測試函式驗證每個關卡回傳值。",
    assessmentFocus: "能否正確區分 `return` 與 `print()`、正確設定預設參數順序、理解區域/全域變數作用域並追蹤函式執行流程。",
    extension: "將課堂完成的文字冒險遊戲模組化整理成獨立 Python 模組檔（`.py`），嘗試用 `import` 匯入主程式執行。"
  };

  const worksheetProg5 = {
    title: "程式森林探險單（五）：函式模組師與作用域偵探",
    intro: "學會「問題分解」與「函式模組化」，你就能把龐大的系統拆成乾淨俐落的積木模組！快來挑戰參數設定、回傳追蹤與作用域偵錯吧。",
    sections: [
      {
        title: "一、問題分解與函式語法基礎",
        items: [
          { type: "short", q: "在開發多關卡遊戲時，運用「問題分解」將大任務拆成多個獨立函式有哪些主要優點？請寫出三點。", answer: "1. 減少重複程式碼（相同功能寫一次即可重複呼叫）；2. 方便團隊分工合作；3. 程式結構清晰且易於局部除錯維護。" },
          { type: "fill", q: "在 Python 定義函式 `def greet(name, role=\"勇者\"):` 中，`role=\"勇者\"` 稱為「____參數」；若函式內沒有寫 `return` 敘述，呼叫函式後預設會回傳 `____`。", answer: "預設、None" }
        ]
      },
      {
        title: "二、參數順序、return 與執行流程追蹤",
        items: [
          { type: "short", q: "小凱想寫一個計算折扣後價格的函式，寫成 `def discount(rate=0.8, price): return price * rate`，執行時卻馬上出現 `SyntaxError`！請問語法錯在哪裡？該如何修正？", answer: "Python 規定有預設值的參數（預設參數）必須全部放在沒有預設值的位置參數「後面」。應改寫為 `def discount(price, rate=0.8):`。" },
          { type: "short", q: "請逐行追蹤下列程式碼，寫出螢幕輸出的完整順序：\n`def step(x):`\n`    print(\"B:\", x)`\n`    return x + 10`\n`    print(\"C:\", x)`\n`print(\"A\")`\n`ans = step(5)`\n`print(\"D:\", ans)`", answer: "會依序印出：\n`A`\n`B: 5`\n`D: 15`\n注意 `return x + 10` 會立刻結束 `step` 函式，因此 `print(\"C:\", x)` 永遠不會被執行。" }
        ]
      },
      {
        title: "三、區域變數 vs 全域變數作用域除錯",
        items: [
          { type: "table", q: "閱讀程式：`gold = 50`、`def earn(): gold = 120`、`earn()`、`print(gold)`。請問最後印出的是 50 還是 120？為什麼？若不用 `global` 關鍵字，該怎麼改寫才能安全地把 `gold` 更新為 120？", answer: "印出 `50`。因為函式 `earn()` 內部的 `gold = 120` 只是建立了新的區域變數，並未改變外部全域變數 `gold`。推薦改法：讓函式回傳新金額 `def earn(g): return g + 70`，主程式寫 `gold = earn(gold)`。" },
          { type: "reflect", q: "為什麼專業軟體工程師常建議「儘量透過參數傳入資料與 `return` 回傳結果」，而不要到處用 `global` 修改全域變數？", answer: "若多個函式隨意修改同一個全域變數，會導致模組之間高度耦合，一旦數值出錯很難追查是哪個函式改壞的；透過參數與 `return` 能讓每個函式的輸入輸出清楚可控、方便單獨測試。" }
        ]
      }
    ]
  };

  const printProg5 = {
    situation: "學校園遊會攤位需要一套「智慧點餐結帳模組系統」，包含：(1) `calc_item(price, qty=1)` 計算單品小計（支援預設數量 1）、(2) `apply_vip(total, is_vip=False)` 計算會員折扣、(3) 主程式流程整合。請運用問題分解思維規劃函式規格，並檢查 `return` 與變數作用域是否正確無誤！",
    thinking: [
      "為什麼把「算小計」和「算折扣」拆成兩個獨立函式，比全部擠在一個大迴圈裡更好測試與維護？",
      "在 `calc_item(price, qty=1)` 中，如果把參數順序反寫成 `calc_item(qty=1, price)` 為什麼會違反 Python 語法規則？",
      "如果 `apply_vip` 函式裡只寫 `print(total * 0.8)` 而忘了寫 `return`，主程式把回傳值拿去做總金額加總時會發生什麼錯誤？"
    ],
    flowchart: "請畫出「智慧點餐結帳系統」模組分解與資料流向圖：主程式 `main()` 讀取品項單價與數量 → 傳入參數呼叫 `calc_item(price, qty)` 並接收 `return` 小計 → 傳入呼叫 `apply_vip(subtotal, is_vip)` 並接收 `return` 折後價 → 最後輸出結帳總表。",
    rubric: [
      { c: "問題分解與模組介面", a: "清楚將問題拆解為職責單一之函式模組，參數與回傳值介面規格明確無重複程式碼", b: "能拆出基本函式，但模組分工或介面設計略顯鬆散", t: "所有邏輯全寫在全域主程式，完全未進行函式分解" },
      { c: "參數、return 與執行流程", a: "正確運用位置參數與預設參數順序，精準區分 return 與 print()，並能正確追蹤呼叫順序", b: "能使用 def 與位置參數完成功能，預設參數或 return 細節稍有疏漏", t: "混淆 print() 與 return 導致 None 錯誤，或預設參數位置寫反無法執行" },
      { c: "變數作用域與可維護性", a: "清楚區分區域與全域變數作用域，全程以參數＋return 安全傳遞資料，程式碼可讀性極佳", b: "主要功能可執行，但偶爾依賴全域變數處理狀態", t: "因誤解變數作用域導致數值未更新或發生 UnboundLocalError" }
    ]
  };

  const prog5EasyQuestions = [
    mkQ(
      "prog5-e1",
      "理解",
      "在運算思維與程式設計中，將一個龐大複雜的程式問題拆解成數個功能單純、可獨立撰寫與重複呼叫的小函式（模組），這種做法稱為什麼？主要的優點為何？",
      [
        "問題分解與模組化；能減少重複程式碼、方便團隊分工，且單一功能出錯時容易定位與除錯維護",
        "無窮迴圈化；能讓電腦永遠停不下來",
        "硬體超頻；能讓電腦記憶體自動加倍",
        "全數全域化；能強迫所有程式碼擠在同一行"
      ],
      0,
      "「問題分解（Decomposition）」與「模組化（Modularization）」能將複雜系統拆分為職責單一的函式，達到重複利用（DRY）、平行分工與易於維護除錯的優勢。"
    ),
    mkQ(
      "prog5-e2",
      "記憶",
      "下列哪一個 Python 自訂函式的定義語法格式（包含關鍵字、參數括號、結尾冒號與縮排）完全正確？",
      [
        "`function hello(name) print(name)`",
        "`def hello(name):`\n`    print(\"你好\", name)`",
        "`def hello(name)`\n`print(\"你好\", name)`",
        "`define hello[name]:`\n`    print(\"你好\", name)`"
      ],
      1,
      "Python 定義函式必須以關鍵字 `def` 開頭，函式名稱後接小括號 `(參數)` 與英文冒號 `:`，且函式內部的程式碼必須向內縮排。"
    ),
    mkQ(
      "prog5-e3",
      "理解",
      "比較函式內使用 `return ans` 與直接寫 `print(ans)` 的差異，下列敘述何者正確？",
      [
        "`print(ans)` 會將數值傳回主程式供後續加減乘除使用",
        "`return ans` 只會在螢幕印出文字，不會把結果交回給呼叫處",
        "`return ans` 能把計算結果傳回呼叫處存入變數繼續運算；若只寫 `print(ans)` 而沒寫 `return`，函式預設會回傳 `None`",
        "兩者完全相同，把 `return` 全部改成 `print` 程式照樣能算總和"
      ],
      2,
      "`print()` 僅把資料輸出到螢幕給人看；若要讓主程式拿到函式算出的結果進行後續運算，必須透過 `return` 回傳，否則函式預設回傳 `None`。"
    )
  ];

  const prog5MediumQuestions = [
    mkQ(
      "prog5-m1",
      "應用",
      "觀察下列含有「位置參數」的 Python 函式與呼叫方式，請問螢幕上會印出什麼結果？\n`def calc_score(win, lose):`\n`    return win * 3 - lose * 1`\n`print(calc_score(4, 2))`",
      ["2", "10", "14", "-2"],
      1,
      "位置參數依順序對應：`win = 4`、`lose = 2`，代入算式 `4 * 3 - 2 * 1 = 12 - 2 = 10`。"
    ),
    mkQ(
      "prog5-m2",
      "應用",
      "下列函式使用了「預設參數」`rate=0.9`。依序執行兩次呼叫後，螢幕上會印出什麼？\n`def pay(price, rate=0.9):`\n`    return int(price * rate)`\n`a = pay(100)`\n`b = pay(100, 0.7)`\n`print(a, b)`",
      ["90 90", "70 70", "90 70", "100 70"],
      2,
      "第一次呼叫 `pay(100)` 省略第二個引數，故使用預設值 `rate = 0.9` 得到 `90`；第二次呼叫 `pay(100, 0.7)` 傳入 `0.7` 覆蓋預設值，得到 `70`，故印出 `90 70`。"
    ),
    mkQ(
      "prog5-m3",
      "分析",
      "請追蹤下列包含函式定義與多次呼叫的 Python 程式碼執行順序，螢幕上依序印出的文字為何？\n`def step_b():`\n`    print(\"B\")`\n`def step_a():`\n`    print(\"A\")`\n`    step_b()`\n`print(\"Start\")`\n`step_a()`\n`print(\"End\")`",
      [
        "B → A → Start → End",
        "Start → A → B → End",
        "Start → B → A → End",
        "A → B → Start → End"
      ],
      1,
      "`def` 僅定義函式而不立即執行！程式從 `print(\"Start\")` 開始印出 `Start` ➜ 呼叫 `step_a()` 先印 `A` 再呼叫 `step_b()` 印 `B` ➜ 回到主程式印出 `End`。"
    ),
    mkQ(
      "prog5-m4",
      "分析",
      "小安寫了一支程式如下，執行到最後一行時卻發生 `TypeError` 錯誤！請問原因為何？\n`def double(n):`\n`    print(n * 2)`\n`x = double(5)`\n`print(x + 1)`",
      [
        "因為 `double(5)` 的參數不能放整數",
        "因為 `double` 函式只有 `print()` 而沒有 `return`，導致變數 `x` 拿到的是 `None`，無法執行 `None + 1`",
        "因為 Python 不能同時寫兩個 `print`",
        "因為 `n * 2` 會變成無窮迴圈"
      ],
      1,
      "`double(5)` 雖在螢幕印出 10，但因缺少 `return n * 2`，實際回傳值為 `None`；`x` 存著 `None`，執行 `None + 1` 即引發 `TypeError`。"
    )
  ];

  const prog5HardQuestions = [
    mkQ(
      "prog5-h1",
      "分析",
      "執行下列 Python 程式碼追蹤「區域變數（Local）」與「全域變數（Global）」作用域，螢幕最後印出的結果為何？\n`level = 10`\n`def upgrade():`\n`    level = 25`\n`    return level + 5`\n`new_lv = upgrade()`\n`print(level, new_lv)`",
      ["25 30", "10 30", "30 30", "10 15"],
      1,
      "在 `upgrade()` 內賦值 `level = 25` 會建立獨立的區域變數 `level`，不影響外部全域變數 `level`（維持 `10`）；而 `return level + 5` 回傳 `30` 存入 `new_lv`，故印出 `10 30`。"
    ),
    mkQ(
      "prog5-h2",
      "分析",
      "閱讀下列含多個 `return` 分支的函式程式碼，請問執行 `print(check(15), check(5))` 的輸出結果為何？\n`def check(n):`\n`    if n >= 10:`\n`        return \"PASS\"`\n`    print(\"RETRY\")`\n`    return \"FAIL\"`",
      [
        "先印 RETRY，最後印 PASS FAIL",
        "先印 RETRY，最後印 PASS RETRY FAIL",
        "不印出任何字直接報錯",
        "先印出兩行 RETRY，最後印 PASS FAIL"
      ],
      0,
      "第一次呼叫 `check(15)` 時 `15 >= 10` 成立，立刻執行 `return \"PASS\"` 結束函式（跳過 `print(\"RETRY\")`）；第二次呼叫 `check(5)` 條件不成立，先印出 `RETRY` 再回傳 `\"FAIL\"`，最後印出 `PASS FAIL`。"
    ),
    mkQ(
      "prog5-h3",
      "分析",
      "追蹤下列模組化函式鏈呼叫與預設參數的執行結果，請問螢幕最終印出的數值為何？\n`def add_tax(p, tax=1.1):`\n`    return int(p * tax)`\n`def checkout(price, qty=2):`\n`    sub = price * qty`\n`    return add_tax(sub)`\n`print(checkout(50))`",
      ["55", "100", "110", "120"],
      2,
      "呼叫 `checkout(50)` 未給 `qty`，使用預設值 `qty = 2` 算出 `sub = 50 * 2 = 100`；接著呼叫 `add_tax(100)` 未給 `tax`，使用預設值 `1.1`，回傳 `int(100 * 1.1) = 110`。"
    ),
    mkQ(
      "prog5-h4",
      "應用",
      "在進行大型遊戲的「問題分解與模組化設計」時，下列哪一種寫法最符合「低耦合、高內聚、易於測試與維護」的良好作用域原則？",
      [
        "把玩家血量 `hp`、金幣 `coin` 全設成全域變數，讓 10 個不同函式都在內部寫 `global hp, coin` 直接偷改數值",
        "透過函式參數明確傳入目前的狀態值（如 `def heal(hp, item=20):`），運算後以 `return` 回傳更新後的值，由主程式統一接收更新",
        "為了避免區域變數，全部程式都不寫 `def`，直接複製貼上 500 行",
        "把每個函式的 `return` 全部刪掉，改用 `print()` 印在螢幕上"
      ],
      1,
      "濫用 `global` 會讓多個函式暗中互相干擾狀態，極難除錯；以「參數傳入資料、計算後以 `return` 明確交回結果」才是模組化設計的最佳實務。"
    ),
    mkQ(
      "prog5-h5",
      "分析",
      "下列四段 Python 函式定義與呼叫程式碼中，哪一段「語法完全合法」且執行後會正確印出 `18`？",
      [
        "`def order(qty=1, price):`\n`    return price * qty`\n`print(order(2, 9))`",
        "`def order(price, qty=2):`\n`    return price * qty`\n`print(order(9))`",
        "`def order(price=9, qty):`\n`    return price * qty`\n`print(order(2))`",
        "`def order(price, qty=2):`\n`    print(price * qty)`\n`print(order(9) + 0)`"
      ],
      1,
      "Python 規定預設參數必須放在非預設參數之後（A、C 皆會產生 `SyntaxError`）；D 選項因函式無 `return` 回傳 `None`，與 `+ 0` 相加會報 `TypeError`；唯有 B 選項合法且 `9 * 2 = 18`。"
    )
  ];

  const quizProg5 = {
    passScore: 60,
    easy: prog5EasyQuestions,
    medium: prog5MediumQuestions,
    hard: prog5HardQuestions,
    levels: {
      easy: {
        label: "入門探險家",
        icon: "🧭",
        badge: null,
        desc: "掌握問題分解與模組化優點、def 定義語法及 return 與 print() 差異。",
        questions: prog5EasyQuestions
      },
      medium: {
        label: "進階挑戰者",
        icon: "🧰",
        badge: "silver",
        desc: "熟練位置參數、預設參數設定、函式執行流程追蹤與 None 除錯。",
        questions: prog5MediumQuestions
      },
      hard: {
        label: "大師領航員",
        icon: "👑",
        badge: "gold",
        desc: "深入剖析區域/全域作用域、提前 return 控制、多函式模組鏈與預設參數語法規範。",
        questions: prog5HardQuestions
      }
    }
  };

  const unitProg5 = {
    id: "prog-5",
    unit: "函式與問題分解",
    study: { title: "函式與問題分解", html: studyProg5 },
    learningContent: { title: "函式與問題分解", html: studyProg5 },
    lesson: lessonProg5,
    worksheet: worksheetProg5,
    print: printProg5,
    lessonPlan: { lesson: lessonProg5, worksheet: worksheetProg5, print: printProg5 },
    quiz: quizProg5
  };

  /* 匯出至 window.ISLAND_PROGRAMMING 與 window.CONTENT（同時支援 prog-* 與 code-* 索引） */
  window.ISLAND_PROGRAMMING["prog-1"] = unitProg1;
  window.ISLAND_PROGRAMMING["prog-2"] = unitProg2;
  window.ISLAND_PROGRAMMING["prog-3"] = unitProg3;
  window.ISLAND_PROGRAMMING["prog-4"] = unitProg4;
  window.ISLAND_PROGRAMMING["prog-5"] = unitProg5;

  window.CONTENT["prog-1"] = unitProg1;
  window.CONTENT["prog-2"] = unitProg2;
  window.CONTENT["prog-3"] = unitProg3;
  window.CONTENT["prog-4"] = unitProg4;
  window.CONTENT["prog-5"] = unitProg5;

  window.CONTENT["code-1"] = Object.assign({}, window.CONTENT["code-1"] || {}, unitProg1);
  window.CONTENT["code-2"] = Object.assign({}, window.CONTENT["code-2"] || {}, unitProg2);
  window.CONTENT["code-3"] = Object.assign({}, window.CONTENT["code-3"] || {}, unitProg3);
  window.CONTENT["code-4"] = Object.assign({}, window.CONTENT["code-4"] || {}, unitProg4);
  window.CONTENT["code-5"] = Object.assign({}, window.CONTENT["code-5"] || {}, unitProg5);
})();
