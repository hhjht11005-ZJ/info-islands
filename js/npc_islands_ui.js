/**
 * 7 座主題 NPC 島嶼專屬點擊互動彩蛋（動森溫暖毛玻璃風格 · 零考試壓力趣味體驗）
 * ---------------------------------------------------------------
 * 1. ⏳ 量子沙漏咖啡島 (quantum-cafe)：國中資訊科技冷知識 / 解題小撇步 (18 則)
 * 2. 🔭 星象觀測小島 (observatory)：今日演算法幸運籤 (12 則)
 * 3. 📮 海風瓶中信郵局 (bottle-post)：資訊史上的奇蹟瓶中信 (12 則)
 * 4. 🎣 像素釣魚棧橋島 (fishing-pier)：資安與防詐騙快問快答 (12 題，不計入正式成績)
 * 5. 🎵 芯片音樂八音盒島 (music-box)：8-bit 數位音訊原理 + Web Audio API 合成旋律
 * 6. 🌱 數位綠洲溫室島 (greenhouse)：綠色科技與 AI 節能冷知識 (12 則)
 * 7. 🧭 迷霧燈塔瞭望島 (lighthouse)：智慧航線推薦羅盤 (讀取 localStorage 各島分數紀錄)
 */
(() => {
  const esc = (s) =>
    String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

  /* ============================================================
   * 一、7 座 NPC 島嶼資料與互動內容庫
   * ============================================================ */
  const CAFE_TRIVIA = [
    {
      kind: "💡 趣味冷知識",
      title: "為什麼電腦只認識 0 與 1？",
      body: "因為電腦內部的電晶體就像超迷你的電燈開關，只有「通電 (1)」與「斷電 (0)」兩種穩定狀態，這就是二進位 (Binary) 的由來！"
    },
    {
      kind: "📝 解題小撇步",
      title: "二進位轉十進位口訣：8-4-2-1",
      body: "看到 4 位數二進位（例如 1011），只要從右到左寫上 1、2、4、8，把「1」下面的數字加起來：8 + 2 + 1 = 11，3 秒就能算出來！"
    },
    {
      kind: "💡 趣味冷知識",
      title: "1 Byte 為什麼剛好是 8 個 bits？",
      body: "早期的英文字母、數字與符號（ASCII）加上偵錯需求大約需要百來種組合，而 2⁸ = 256 種剛好裝得下，從此 1 Byte = 8 bits 就成為世界標準！"
    },
    {
      kind: "📝 解題小撇步",
      title: "二分搜尋法的前提條件",
      body: "考題問「什麼時候才能用二分搜尋法？」答案一定是「資料必須先經過排序（由小到大或由大到小）」！沒排序只能乖乖用循序搜尋喔。"
    },
    {
      kind: "💡 趣味冷知識",
      title: "第一個電腦「Bug」真的是隻蟲！",
      body: "1947 年電腦先驅葛麗絲·霍普在維修馬克二號電腦時，發現繼電器裡卡了一隻飛蛾導致當機，從此把除錯稱為 Debug！"
    },
    {
      kind: "📝 解題小撇步",
      title: "圖片檔案大小怎麼算？",
      body: "口訣：「寬像素 × 高像素 × 每個像素佔的位元組」。例如 100×100 全彩圖（每像素 3 Bytes）= 30,000 Bytes（尚未壓縮前）。"
    },
    {
      kind: "💡 趣味冷知識",
      title: "DNS 就像是網際網路的「電話簿」",
      body: "人類喜歡記好念的網址（如 google.com），但電腦連線要靠數字 IP 位址。DNS 伺服器的任務就是幫我們把網址翻譯成 IP！"
    },
    {
      kind: "📝 解題小撇步",
      title: "區分 RAM 與 SSD/硬碟",
      body: "RAM（主記憶體）像「書桌桌面」，速度快但斷電資料就會消失；SSD/硬碟像「書櫃」，容量大而且關機後檔案依然保留！"
    },
    {
      kind: "💡 趣味冷知識",
      title: "Wi-Fi 其實不是任何英文縮寫",
      body: "很多人以為 Wi-Fi 是 Wireless Fidelity 的縮寫，其實它是行銷團隊為了順口，模仿音響界 Hi-Fi 創造出來的品牌名稱！"
    },
    {
      kind: "📝 解題小撇步",
      title: "Python 迴圈 `range(1, 5)` 會跑幾次？",
      body: "記住「含頭不含尾」原則！`range(1, 5)` 會依序產生 1, 2, 3, 4 共 4 個數字，永遠不包含結束值 5 喔！"
    },
    {
      kind: "💡 趣味冷知識",
      title: "數位聲音是把波形「切蛋糕」",
      body: "把類比聲波變成數位檔需要「取樣（每隔多久量一次）」和「量化（把高度變成數字）」。取樣率越高，聲音就越接近原音！"
    },
    {
      kind: "📝 解題小撇步",
      title: "看懂創用 CC（Creative Commons）圖示",
      body: "BY＝要標示作者、NC＝不能商業營利、ND＝不能改作內容、SA＝改作後要用相同授權分享。考題最常考 NC 與 BY！"
    },
    {
      kind: "💡 趣味冷知識",
      title: "為什麼 AI 有時候會「一本正經胡說八道」？",
      body: "生成式 AI 是根據大量資料計算「下一個最合理的字詞機率」，並非真的理解事實，這個現象叫做「AI 幻覺 (Hallucination)」，一定要查證！"
    },
    {
      kind: "📝 解題小撇步",
      title: "流程圖符號一眼辨識",
      body: "「橢圓形」代表開始或結束、「長方形」代表處理步驟、「菱形」代表條件判斷（一定會有兩條分支：是/否）！"
    },
    {
      kind: "💡 趣味冷知識",
      title: "像素 (Pixel) 其實是兩個英文合體字",
      body: "Pixel 來自 Picture（圖片）和 Element（元素），把手機螢幕用放大鏡看，其實是由無數顆紅、綠、藍 (RGB) 三色小光點組成的！"
    },
    {
      kind: "📝 解題小撇步",
      title: "泡沫排序 vs. 選擇排序怎麼分？",
      body: "「泡沫排序」是相鄰兩個一直比、把最大（或最小）像泡泡一樣推到邊邊；「選擇排序」則是每一輪直接找出最小的值放到最前面！"
    },
    {
      kind: "💡 趣味冷知識",
      title: "Ctrl+C / Ctrl+V 救了無數人的作業",
      body: "複製貼上是由電腦科學家 Larry Tesler 在 1970 年代發明的，他在 Xerox PARC 研究如何讓電腦變得像紙筆一樣直覺好用。"
    },
    {
      kind: "📝 解題小撇步",
      title: "變數交換一定要找「第三個空杯子」",
      body: "想把 A 和 B 的值互換，不能直接 `A = B; B = A`（這樣 A 原本的值會被蓋掉），一定要先 `temp = A; A = B; B = temp`！"
    }
  ];

  const OBSERVATORY_FORTUNES = [
    {
      luck: "🌟 星光大吉",
      algo: "二分搜尋法 (Binary Search)",
      quote: "「把大問題對半切開，每次都能離答案更近一步！」",
      tip: "今天寫作業或解題卡關時，試著先排除一半不可能的選項，思路會瞬間清晰。"
    },
    {
      luck: "✨ 靈感超吉",
      algo: "堆疊 (Stack · 先進後出)",
      quote: "「就像疊盤子一樣，先把最緊急的那件事解決掉吧！」",
      tip: "遇到多重步驟任務時，使用便利貼排出優先順序，完成一張撕一張超療癒。"
    },
    {
      luck: "🔭 洞察吉",
      algo: "分治法 (Divide & Conquer)",
      quote: "「沒有拆不開的難題，只有還沒分解的小任務。」",
      tip: "把今天的複習進度拆成 3 個 15 分鐘小關卡，輕鬆破關無壓力！"
    },
    {
      luck: "💫 順風中吉",
      algo: "佇列 (Queue · 先進先出)",
      quote: "「一步一腳印排好隊，不急不躁就能準時抵達終點。」",
      tip: "寫程式忘記哪裡出錯時，從第一行開始逐行追蹤變數變化，很快就能抓出 Bug！"
    },
    {
      luck: "🌙 智慧大吉",
      algo: "雜湊表 (Hash Table)",
      quote: "「把常用知識建立好索引，關鍵時刻一秒就能找到！」",
      tip: "幫自己的筆記加上重點顏色標籤，考前複習效率直接翻倍！"
    },
    {
      luck: "☄️ 閃耀吉",
      algo: "貪婪演算法 (Greedy)",
      quote: "「專注當下最好的選擇，小進步也會累積成大奇蹟。」",
      tip: "先挑選一座最有把握的島嶼練習挑戰，累積滿滿信心！"
    },
    {
      luck: "🌠 奇蹟大吉",
      algo: "廣度優先搜尋 (BFS)",
      quote: "「多看看身邊的朋友與不同角度，答案就在下一層！」",
      tip: "今天很適合跟同學互相討論程式碼或分享學習筆記，會有意想不到的收穫。"
    },
    {
      luck: "🪐 沉穩吉",
      algo: "選擇排序 (Selection Sort)",
      quote: "「在紛亂的資訊中，每次都先挑出最重要的那一顆星。」",
      tip: "先處理最關鍵的課綱核心概念，再補充延伸細節，學習節奏最穩健。"
    },
    {
      luck: "🛸 突破吉",
      algo: "遞迴 (Recursion)",
      quote: "「相信未來的自己，只要把終止條件設好就能安全返航！」",
      tip: "遇到重複執行的動作，試著寫成函式或迴圈，讓電腦替你做苦工。"
    },
    {
      luck: "🌌 探索吉",
      algo: "深度優先搜尋 (DFS)",
      quote: "「勇於往一個方向深入探索，走不通再優雅回溯重來。」",
      tip: "實驗失敗不是錯誤，而是幫你畫出正確地圖的寶貴座標！"
    },
    {
      luck: "💎 清晰中吉",
      algo: "快速排序 (Quick Sort)",
      quote: "「找一個穩定的基準點 (Pivot)，混亂立刻變得井然有序。」",
      tip: "整理電腦桌面與雲端資料夾，用「年份-科目」命名會讓你開心一整天！"
    },
    {
      luck: "🌈 幸運大吉",
      algo: "動態規劃 (Dynamic Programming)",
      quote: "「過去走過的每一步紀錄，都會成為未來加速的能量。」",
      tip: "複習以前錯過的題目，是拿到 100 分皇冠最快的秘密航道！"
    }
  ];

  const BOTTLE_STORIES = [
    {
      year: "1843 年",
      title: "世界第一位程式設計師：愛達·勒芙蕾絲",
      story: "在電子電腦還沒發明的維多利亞時代，數學家愛達為巴貝奇的「分析機」寫下計算伯努利數的步驟，成為人類史上第一位程式設計師！她甚至預言機器未來還能用來創作音樂與藝術。"
    },
    {
      year: "1936 年",
      title: "艾倫·圖靈與「圖靈機」的誕生",
      story: "艾倫·圖靈提出一個想像中的紙帶機器模型，證明只要給定明確規則，一台通用機器就能模擬任何計算過程——這奠定了現代電腦科學與人工智慧「圖靈測試」的基石！"
    },
    {
      year: "1947 年",
      title: "世界上第一隻「電腦 Bug」",
      story: "海軍電腦科學家葛麗絲·霍普團隊在哈佛馬克二號當機時，從繼電器夾出一隻飛蛾並貼進工作日誌寫著「First actual case of bug being found」，從此「Debug」變成工程師日常！"
    },
    {
      year: "1963 年",
      title: "ASCII 讓全世界的電腦說同一種話",
      story: "早期不同廠牌電腦連字母數字的編碼都不一樣，檔案傳過去就變亂碼。ASCII 標準誕生後，規定 A 是 65、a 是 97，電腦之間終於能順利交換文字訊息！"
    },
    {
      year: "1969 年",
      title: "網際網路的第一個字：「LO」",
      story: "ARPANET 首次從 UCLA 傳送訊息「LOGIN」給史丹佛大學時，才剛打完「L」和「O」系統就當機了！於是網際網路史上的第一句話意外成了「LO」（像極了 Hello）。"
    },
    {
      year: "1971 年",
      title: "第一封電子郵件與「@」符號",
      story: "工程師 Ray Tomlinson 發明跨電腦寄信程式時，需要一個不會出現在人名裡的符號來區分「使用者」和「電腦主機」，他低頭看了鍵盤一眼，選中了「@」（at）！"
    },
    {
      year: "1983 年",
      title: "TCP/IP 協定讓網路串成一整個世界",
      story: "Vint Cerf 與 Bob Kahn 設計了 TCP/IP，把大資料切成一小包一小包的「封包」，就算中途某條海纜壞掉也能繞路送達，成就了今天的網際網路。"
    },
    {
      year: "1989 年",
      title: "全球資訊網 (WWW) 的起點",
      story: "英國科學家提姆·柏內茲-李在歐洲核子研究組織工作時，為了讓各地研究員方便分享文件，發明了超連結、HTML 與瀏覽器，而且免費開放給全人類使用！"
    },
    {
      year: "1991 年",
      title: "Unicode 與 Emoji 讓世界表情豐富",
      story: "為了讓中文、日文、阿拉伯文與各種文字都能在同一台電腦和平共處，Unicode 誕生了；後來更收錄了上千種可愛的 Emoji，成為跨越語言的全球表情符號！"
    },
    {
      year: "1992 年",
      title: "史上第一張上傳到網路的照片",
      story: "世界上第一個網站誕生後不久，提姆·柏內茲-李幫 CERN 的女子喜劇樂團「Les Horribles Cernettes」拍了一張合照並掃描上傳，成為網路史上第一張圖片！"
    },
    {
      year: "1999 年",
      title: "第一張手機拍的照片分享到網路",
      story: "工程師 Philippe Kahn 在醫院等女兒出生時，用零件把數位相機跟手機焊在一起，寫了程式把剛出生的寶寶照片即時傳給兩千位親友，開啟了手機拍照分享時代！"
    },
    {
      year: "2016 年",
      title: "AI 在圍棋賽場寫下「第 37 手」",
      story: "AlphaGo 在與棋王李世乭對弈時，下出人類棋譜從未出現過的奇招「第 37 手」，讓全球棋迷驚呼：人工智慧已經能從大量練習中自己發掘新策略！"
    }
  ];

  const FISHING_QUIZZES = [
    {
      q: "收到簡訊寫著「您的包裹地址有誤，請點此短網址補填信用卡資料驗證身份」，這是常見的釣魚簡訊詐騙嗎？",
      options: ["⭕ 是，這是釣魚詐騙！", "❌ 不是，趕快點進去填"],
      answer: 0,
      explain: "正確！物流公司不會透過簡訊短網址要求輸入信用卡或個資，遇到可疑連結請直接向官方客服或 165 反詐騙查證。"
    },
    {
      q: "在咖啡廳連上免密碼的「Free_WiFi」時，直接登入網路銀行轉帳很安全嗎？",
      options: ["⭕ 很安全，方便最重要", "❌ 不安全，可能被竊聽封包"],
      answer: 1,
      explain: "公共免費 Wi-Fi 往往缺乏加密保護，駭客可能架設同名假熱點攔截帳號密碼，重要帳務建議改用自己的 4G/5G 行動網路！"
    },
    {
      q: "為了好記，把 IG、遊戲帳號、學校信箱和銀行全部設定成「同一組密碼」是個好習慣嗎？",
      options: ["⭕ 沒錯，才不會忘記", "❌ 不行，一旦外洩會全軍覆沒"],
      answer: 1,
      explain: "不同網站應使用不同密碼（可用「主詞＋網站縮寫」規則記憶），否則只要其中一個小網站被駭，駭客就能「撞庫」登入你所有帳號！"
    },
    {
      q: "開啟「雙重驗證 (2FA)」後，就算別人意外知道你的密碼，沒有你的手機驗證碼也無法輕易登入。",
      options: ["⭕ 正確，多一層鎖更安全", "❌ 錯誤，雙重驗證沒有用"],
      answer: 0,
      explain: "太棒了！雙重驗證結合「你知道的（密碼）」與「你擁有的（手機/驗證器 App）」，能擋掉超過 99% 的自動盜號攻擊！"
    },
    {
      q: "好朋友突然傳訊息說「我的 LINE 被登出了，幫我收一下簡訊驗證碼再截圖傳給我」，應該幫他嗎？",
      options: ["⭕ 馬上幫朋友截圖傳過去", "❌ 絕對不行，這會把帳號送給詐騙集團"],
      answer: 1,
      explain: "這是最經典的帳號盜用話術！對方要的是「你」的登入驗證碼（OTP），傳出去後換成你的帳號被盜，再繼續去騙下一個朋友！"
    },
    {
      q: "在學校電腦教室地上撿到一支沒有人認領的隨身碟，直接插進自己的電腦看看裡面有什麼，安全嗎？",
      options: ["⭕ 沒關係，打開看一下而已", "❌ 危險！可能暗藏惡意程式或病毒"],
      answer: 1,
      explain: "來路不明的隨身碟可能藏有自動執行木馬或偽裝資料夾的勒索病毒，切勿隨意插上自己的電腦，應交給師長或失物招領處處理。"
    },
    {
      q: "接到自稱「知名電商客服」的電話，說不小心把你設成高級會員要重複扣款，叫你去 ATM 操作「解除分期付款」，這是真的嗎？",
      options: ["⭕ 真的，趕快去 ATM 解除", "❌ 假的！ATM 沒有解除扣款功能"],
      answer: 1,
      explain: "記住黃金法則：ATM 只有「提款」與「轉帳」功能，絕對沒有「解除分期」或「驗證身分」功能，聽到這幾個關鍵字直接掛斷！"
    },
    {
      q: "設定密碼時，下列哪一組密碼最安全、最不容易被暴力破解？",
      options: ["🔑 12345678 / birthday0901", "🛡️ M#9kP!v2Q8xL (12位混合)"],
      answer: 1,
      explain: "優秀！密碼長度越長、混合大小寫英文＋數字＋特殊符號，越能抵抗電腦字典攻擊與暴力破解。"
    },
    {
      q: "在網路上看到同學被偷拍的醜照，只要「按讚或轉傳」但沒有自己留言罵人，就完全不會有法律或倫理問題嗎？",
      options: ["⭕ 沒留言就沒事", "❌ 不對！轉傳與散播同樣會造成二次傷害與法律責任"],
      answer: 1,
      explain: "不轉傳、不散布他人隱私與不實照片，是保護自己也尊重他人的數位公民素養！"
    },
    {
      q: "現在有 AI 換臉與聲音合成技術，就算視訊通話看到「熟人的臉」，只要對方突然急著借錢，還是應該打電話或當面再次確認。",
      options: ["⭕ 正確，防人之心不可無", "❌ 不可能，視訊看到臉一定是本人"],
      answer: 0,
      explain: "沒錯！深偽 (Deepfake) 技術已經能即時模仿聲音與臉部表情，涉及金錢轉帳務必用「原本熟悉的聯絡方式」或約定通關密語二次查證！"
    },
    {
      q: "為了玩免費的付費遊戲，去不明網站下載號稱「破解版 / 外掛安裝檔 (.exe/.apk)」，會有什麼風險？",
      options: ["⭕ 賺到了，免費玩真開心", "❌ 高風險！常捆綁木馬與竊密程式"],
      answer: 1,
      explain: "破解版軟體最常被惡意植入竊密木馬或挖礦病毒，不只可能偷走遊戲帳號與家長信用卡資料，還可能觸犯著作權法喔！"
    },
    {
      q: "要轉傳網路上的驚悚新聞或免費貼圖活動前，可以先用「台灣事實查核中心」或「Cofacts 真的假的」查證一下。",
      options: ["⭕ 好主意，先查證再分享！", "❌ 太麻煩，先轉傳再說"],
      answer: 0,
      explain: "讚喔！養成「停、看、查」的好習慣，就能阻止假訊息與詐騙貼圖在班群和家庭群組擴散！"
    }
  ];

  const GREEN_TECH_FACTS = [
    {
      tag: "🌊 海洋降溫",
      title: "把資料中心沉進海底！",
      body: "全球機房消耗大量電力在吹冷氣散熱。科技公司曾實驗把密封的伺服器艙沉入蘇格蘭海底（Project Natick），利用冰涼的海水自然散熱，故障率還比陸上低了 8 倍！"
    },
    {
      tag: "📱 螢幕省電",
      title: "深色模式 (Dark Mode) 在 OLED 螢幕真的更省電",
      body: "傳統 LCD 螢幕不管顯示什麼顏色，背光燈都是全亮的；但 OLED 螢幕的黑色像素會「直接關閉不發光」，開啟深色模式最高可替手機省下 30%~40% 電量！"
    },
    {
      tag: "♻️ 城市採礦",
      title: "手機裡的黃金比金礦還純！",
      body: "開採 1 公噸金礦大約只能提煉出 5 公克黃金；但回收 1 公噸廢棄手機電路板，竟能提煉出高達 300 公克的黃金！妥善回收電子垃圾就是環保的「城市採礦」。"
    },
    {
      tag: "🤖 AI 耗能",
      title: "問一次大型 AI 等於亮著一顆燈泡好幾分鐘",
      body: "訓練與運行大型 AI 需要數千張 GPU 同時運算。研究指出，使用簡潔精準的提示詞 (Prompt) 並選用「輕量化小模型」處理簡單問題，能大幅減少碳足跡！"
    },
    {
      tag: "🔥 廢熱再利用",
      title: "用伺服器的熱氣幫社區燒熱水",
      body: "在北歐（如芬蘭、瑞典）的綠色資料中心，工程師把電腦運轉產生的廢熱透過熱交換管線送到附近社區，變成冬天家家戶戶的免費暖氣與游泳池溫水！"
    },
    {
      tag: "⚡ 綠能指標",
      title: "看懂資料中心的環保成績單：PUE",
      body: "PUE（電力使用效率）= 機房總耗電 ÷ 資訊設備耗電。越接近 1.0 代表冷氣與照明浪費越少，目前最先進的液冷綠能機房 PUE 已可降到 1.08 左右！"
    },
    {
      tag: "🧊 浸沒式液冷",
      title: "把電腦主機泡進「不導電油」裡散熱",
      body: "高階 AI 伺服器熱到風扇吹不動時，工程師會把整台伺服器泡進特製的不導電冷卻液中，吸熱速度比空氣快上千倍，能省下超過 30% 的空調用電！"
    },
    {
      tag: "📧 數位大掃除",
      title: "刪除不需要的雲端舊照片也能減碳",
      body: "我們存在雲端硬碟的每張模糊連拍、廣告信件，都必須由遠方的伺服器持續通電保存與備份。定期整理雲端空間，既能省錢也能幫地球降溫！"
    },
    {
      tag: "🔋 延長壽命",
      title: "把電子產品多用一年，減碳效果最驚人",
      body: "一支手機約有 70% 的碳排發生在「製造與開採原料」階段。好好保護手機與筆電、定期換電池延續壽命，比急著換新機環保得多！"
    },
    {
      tag: "☀️ 追著太陽跑",
      title: "讓運算任務「跟著太陽與風力移動」",
      body: "雲端業者開發出智慧排程技術：如果白天某地區太陽能發電過剩，就把不用急著算完的 AI 訓練任務自動切換到該機房執行，把乾淨綠電用到極致！"
    },
    {
      tag: "🌿 模組化設計",
      title: "像樂高積木一樣能單獨維修的筆電",
      body: "越來越多環保電腦採用模組化設計，螢幕、電池、USB 孔或記憶體都能用一把螺絲起子單獨更換，不會因為一個小零件壞掉就整台報廢！"
    },
    {
      tag: "🎬 串流省電",
      title: "用手機小螢幕看影片，選 720p 就很清晰又省電",
      body: "在 6 吋手機上播放 4K 超高畫質影片，肉眼幾乎看不出差別，但網路傳輸與手機解碼耗電卻暴增數倍。依螢幕大小調整畫質，也是實踐綠色科技的小妙招！"
    }
  ];

  const NPC_ISLAND_META = {
    "quantum-cafe": {
      emoji: "⏳",
      name: "量子沙漏驛站・星光咖啡島",
      badge: "核心航道驛站 · 趣味冷知識",
      accent: "#00b4d8",
      hostEmoji: "☕",
      hostName: "星光咖啡師 ＆ 量子旅人團",
      greeting: "歡迎來到星光咖啡島！點一杯星塵拿鐵，抽一則資訊科技冷知識或解題密技吧！"
    },
    observatory: {
      emoji: "🔭",
      name: "星象觀測小島",
      badge: "天文運算站 · 今日幸運籤",
      accent: "#4f7cff",
      hostEmoji: "🦉",
      hostName: "觀星小學者",
      greeting: "今晚的星象顯示演算法軌道非常順暢呢！要來抽一支今日的運算思維幸運籤嗎？"
    },
    "bottle-post": {
      emoji: "📮",
      name: "海風瓶中信郵局",
      badge: "海洋郵政 · 資訊史故事",
      accent: "#e11d48",
      hostEmoji: "✉️",
      hostName: "海風郵差",
      greeting: "潮汐又把遠方科技先驅們的故事吹上岸囉！快來撈起一封奇蹟瓶中信看看吧！"
    },
    "fishing-pier": {
      emoji: "🎣",
      name: "像素釣魚棧橋島",
      badge: "防詐垂釣碼頭 · 快問快答",
      accent: "#14b8a6",
      hostEmoji: "🐟",
      hostName: "像素老漁夫",
      greeting: "這裡沒有考試壓力，只有從海裡釣上來的資安小考驗！放心試試看吧！"
    },
    "music-box": {
      emoji: "🎵",
      name: "芯片音樂八音盒島",
      badge: "8-bit 聲學舞台 · 數位音訊",
      accent: "#ec4899",
      hostEmoji: "🎧",
      hostName: "DJ 芯片貓",
      greeting: "Yo！想知道紅白機和復古像素遊戲的洗腦配樂是怎麼發出聲音的嗎？按下播放鍵就對了！"
    },
    greenhouse: {
      emoji: "🌱",
      name: "數位綠洲溫室島",
      badge: "永續實驗花房 · 綠色科技",
      accent: "#10b981",
      hostEmoji: "🪴",
      hostName: "綠洲小園丁",
      greeting: "科技也能和大自然一起呼吸喔！來看看工程師怎麼替電腦與 AI 節能降溫吧！"
    },
    lighthouse: {
      emoji: "🧭",
      name: "迷霧燈塔瞭望島",
      badge: "航線導航塔 · 智慧推薦羅盤",
      accent: "#f59e0b",
      hostEmoji: "🗼",
      hostName: "燈塔領航員",
      greeting: "迷霧中不知道下一座該去哪座島挑戰嗎？讓我用智慧羅盤幫你查看目前的航行進度！"
    }
  };

  /* ============================================================
   * 二、8-bit Chiptune 原生 Web Audio API 合成器
   * ============================================================ */
  let chipCtx = null;
  let chipStopTimer = null;
  let chipNodes = [];
  let isChipPlaying = false;

  function stopChiptuneMelody() {
    isChipPlaying = false;
    if (chipStopTimer) {
      clearTimeout(chipStopTimer);
      chipStopTimer = null;
    }
    chipNodes.forEach((n) => {
      try {
        n.stop();
        n.disconnect();
      } catch {}
    });
    chipNodes = [];
    const btn = document.getElementById("npcMusicPlayBtn");
    const eq = document.getElementById("npcMusicEq");
    if (btn) {
      btn.textContent = "🎹 播放 8-bit 島嶼旋律";
      btn.classList.remove("is-playing");
    }
    if (eq) eq.classList.remove("is-playing");
  }

  function playChiptuneMelody() {
    if (isChipPlaying) {
      stopChiptuneMelody();
      return;
    }
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) {
      if (window.AvatarSystem && typeof window.AvatarSystem.toast === "function") {
        window.AvatarSystem.toast("目前的瀏覽器不支援 Web Audio API 合成音效。", "warn");
      }
      return;
    }
    if (!chipCtx) chipCtx = new AudioCtx();
    if (chipCtx.state === "suspended") chipCtx.resume().catch(() => {});

    isChipPlaying = true;
    const btn = document.getElementById("npcMusicPlayBtn");
    const eq = document.getElementById("npcMusicEq");
    if (btn) {
      btn.textContent = "⏹️ 停止播放旋律";
      btn.classList.add("is-playing");
    }
    if (eq) eq.classList.add("is-playing");

    const now = chipCtx.currentTime + 0.04;
    const step = 0.16; // 16分音符輕快節奏
    // 動森風輕快大調島嶼旋律 (C5-E5-G5-A5-C6 跳躍感 + 尾音上揚和弦)
    const melody = [
      [523.25, 1], [659.25, 1], [783.99, 1.5], [659.25, 0.5],
      [880.00, 1], [783.99, 1], [659.25, 2],
      [587.33, 1], [698.46, 1], [880.00, 1.5], [783.99, 0.5],
      [659.25, 1], [587.33, 1], [523.25, 2],
      [523.25, 0.75], [659.25, 0.75], [783.99, 0.75], [1046.50, 1.75],
      [987.77, 1], [880.00, 1], [783.99, 1.5], [659.25, 0.5],
      [698.46, 1], [880.00, 1], [783.99, 1], [987.77, 1],
      [1046.50, 3]
    ];
    // 溫暖 8-bit 三角波低音貝斯線
    const bass = [
      [261.63, 2], [196.00, 2], [174.61, 2], [196.00, 2],
      [146.83, 2], [196.00, 2], [261.63, 2], [196.00, 2],
      [261.63, 2], [220.00, 2], [174.61, 2], [196.00, 2],
      [174.61, 2], [196.00, 2], [261.63, 3]
    ];

    const scheduleTrack = (notes, type, peakGain) => {
      let cursor = 0;
      notes.forEach(([freq, beats]) => {
        const dur = beats * step;
        const t0 = now + cursor;
        const osc = chipCtx.createOscillator();
        const gain = chipCtx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, t0);

        gain.gain.setValueAtTime(0.001, t0);
        gain.gain.linearRampToValueAtTime(peakGain, t0 + 0.015);
        gain.gain.exponentialRampToValueAtTime(0.0008, t0 + Math.max(0.05, dur * 0.9));

        osc.connect(gain);
        gain.connect(chipCtx.destination);
        osc.start(t0);
        osc.stop(t0 + dur + 0.02);
        chipNodes.push(osc);
        cursor += dur;
      });
      return cursor;
    };

    const totalSec = Math.max(
      scheduleTrack(melody, "square", 0.075),
      scheduleTrack(bass, "triangle", 0.11)
    );

    chipStopTimer = setTimeout(() => {
      stopChiptuneMelody();
    }, Math.ceil((totalSec + 0.12) * 1000));
  }

  /* ============================================================
   * 三、迷霧燈塔瞭望島：智慧航線推薦羅盤 (讀取 localStorage)
   * ============================================================ */
  function readStudentQuizEventsFromStorage() {
    if (window.Store && typeof window.Store.events === "function") {
      return window.Store.events();
    }
    try {
      const rawProfile = localStorage.getItem("ii:profile");
      if (rawProfile) {
        const p = JSON.parse(rawProfile);
        if (p && p.cls && p.name) {
          const evRaw = localStorage.getItem(`ii:ev:${p.cls}-${p.seat}-${p.name}`);
          if (evRaw) {
            const parsed = JSON.parse(evRaw);
            if (Array.isArray(parsed)) return parsed;
          }
        }
      }
    } catch {}
    return [];
  }

  function analyzeCompassRoute() {
    const islands = Array.isArray(window.ISLANDS) ? window.ISLANDS.slice(0, 7) : [];
    const routeOrder = (window.SITE && Array.isArray(window.SITE.route) && window.SITE.route.length)
      ? window.SITE.route
      : islands.map((i) => i.id);
    const orderedIslands = routeOrder
      .map((id) => islands.find((i) => i.id === id))
      .filter(Boolean);

    const events = readStudentQuizEventsFromStorage().filter((e) => e && (!e.type || e.type === "quiz"));
    const statsList = orderedIslands.map((isl) => {
      const mine = events.filter(
        (e) => e.island === isl.id || (e.unit && String(e.unit).split("-")[0] === isl.id)
      );
      let bestScore = 0;
      const full = { easy: false, medium: false, hard: false };
      mine.forEach((e) => {
        const sc = Math.max(0, Math.min(100, Math.round(Number(e.score) || 0)));
        if (sc > bestScore) bestScore = sc;
        const diff = e.difficulty || (e.detail && e.detail.difficulty) || "";
        if (diff in full && sc >= 100) full[diff] = true;
      });
      let stages = 0;
      if (full.easy) {
        stages = full.medium ? (full.hard ? 3 : 2) : 1;
      }
      return {
        id: isl.id,
        name: isl.name,
        emoji: isl.emoji,
        color: isl.color,
        bestScore,
        attempts: mine.length,
        stages,
        full
      };
    });

    const totalAttempts = statsList.reduce((sum, s) => sum + s.attempts, 0);
    if (totalAttempts === 0) {
      const starter = statsList[0] || { id: "sys", name: "電腦探險島", emoji: "🖥️", bestScore: 0 };
      return {
        statsList,
        target: starter,
        headline: `🧭 燈塔領航員建議：目前尚未有測驗航行紀錄，建議從第一座入門島【${starter.name}】開始啟航，挑戰 100 分解鎖第一座島嶼建築吧！`,
        subHint: "完成任一單元「易」難度 100 分即可點亮 1/3 主建築，收集「易 / 中 / 難」可達 3/3 滿級！"
      };
    }

    // 1. 優先找出「已作答但尚未達 100 分」且分數最接近 100 分的島嶼
    const almostList = statsList
      .filter((s) => s.attempts > 0 && s.bestScore < 100)
      .sort((a, b) => b.bestScore - a.bestScore);
    if (almostList.length > 0) {
      const top = almostList[0];
      return {
        statsList,
        target: top,
        headline: `🧭 燈塔領航員建議：你目前在【${top.name}】已經拿到 ${top.bestScore} 分了，只差一步就能達成 100 分解鎖建築，快去挑戰吧！`,
        subHint: "建議先複習該島錯題或「單元學習頁」，一口氣衝上 100 分！"
      };
    }

    // 2. 接著找出尚未挑戰過的島嶼（按建議航線順序）
    const unvisited = statsList.find((s) => s.attempts === 0);
    if (unvisited) {
      return {
        statsList,
        target: unvisited,
        headline: `🧭 燈塔領航員建議：你在已挑戰的島嶼表現超棒！下一座尚未探索的航道是【${unvisited.name}】，快揚帆出發解鎖新建築吧！`,
        subHint: "7 座主島都達成完全繁榮時，海中央的神秘聖殿就會甦醒喔！"
      };
    }

    // 3. 若 7 島皆有 100 分紀錄，檢查是否還有未達 3/3 階段建築的島嶼
    const partialStage = statsList.find((s) => s.stages < 3);
    if (partialStage) {
      const nextDiff = !partialStage.full.easy ? "易" : !partialStage.full.medium ? "中" : "難";
      return {
        statsList,
        target: partialStage,
        headline: `🧭 燈塔領航員建議：你目前在【${partialStage.name}】已經解鎖 ${partialStage.stages}/3 階段建築了，再挑戰「${nextDiff}」難度達 100 分就能升級喔！`,
        subHint: "集齊「易 / 中 / 難」三個 100 分，讓島嶼建築迎來最華麗的竣工狀態！"
      };
    }

    // 4. 全部 7 島皆 3/3 滿分！
    return {
      statsList,
      target: statsList[0],
      allDone: true,
      headline: "🌟 燈塔領航員讚嘆：太強了！你已經在 7 座主課程島嶼全數達成 3/3 滿分竣工，快點擊海中央的【中央資訊聖殿】領取全域領航證書吧！",
      subHint: "你也可以繼續在各座 NPC 島收集冷知識與故事彩蛋。"
    };
  }

  /* ============================================================
   * 四、建立動森溫暖毛玻璃風格互動彈窗 DOM
   * ============================================================ */
  const modalWrap = document.createElement("div");
  modalWrap.id = "npcIslandModal";
  modalWrap.className = "modal-wrap npc-island-modal-wrap";
  modalWrap.setAttribute("role", "dialog");
  modalWrap.setAttribute("aria-modal", "true");
  modalWrap.setAttribute("aria-labelledby", "npcModalTitle");
  modalWrap.innerHTML = `
    <div class="npc-frosted-card" id="npcFrostedCard">
      <button type="button" class="npc-card-close" id="npcCardCloseBtn" aria-label="關閉視窗">✕</button>
      <div class="npc-card-head">
        <span class="npc-card-badge" id="npcCardBadge"></span>
        <h2 class="npc-card-title" id="npcModalTitle"></h2>
      </div>
      <div class="npc-host-box">
        <div class="npc-host-avatar" id="npcHostAvatar"></div>
        <div class="npc-host-speech">
          <div class="npc-host-name" id="npcHostName"></div>
          <p class="npc-host-greeting" id="npcHostGreeting"></p>
        </div>
      </div>
      <div class="npc-card-body" id="npcCardBody"></div>
      <div class="npc-star-quiz-host" id="npcStarQuizHost"></div>
    </div>
  `;
  document.body.appendChild(modalWrap);

  const cardEl = modalWrap.querySelector("#npcFrostedCard");
  const cardBody = modalWrap.querySelector("#npcCardBody");
  const state = {
    activeId: null,
    lastIndexByIsland: {}
  };

  function pickNonRepeatingIndex(key, len) {
    if (len <= 1) return 0;
    const prev = state.lastIndexByIsland[key];
    let next = Math.floor(Math.random() * len);
    if (next === prev) next = (next + 1 + Math.floor(Math.random() * (len - 1))) % len;
    state.lastIndexByIsland[key] = next;
    return next;
  }

  function closeNpcIslandModal() {
    stopChiptuneMelody();
    modalWrap.classList.remove("show");
    state.activeId = null;
  }

  modalWrap.querySelector("#npcCardCloseBtn").addEventListener("click", closeNpcIslandModal);
  modalWrap.addEventListener("click", (e) => {
    if (e.target === modalWrap) closeNpcIslandModal();
  });
  document.addEventListener("keydown", (e) => {
    if (window.shouldSkipGlobalEvent && window.shouldSkipGlobalEvent(e)) return;
    if (e.key === "Escape" && modalWrap.classList.contains("show")) {
      closeNpcIslandModal();
    }
  });

  /* ============================================================
   * 五、各島專屬互動內容渲染函式
   * ============================================================ */
  function renderQuantumCafe() {
    const idx = pickNonRepeatingIndex("quantum-cafe", CAFE_TRIVIA.length);
    const item = CAFE_TRIVIA[idx];
    cardBody.innerHTML = `
      <div class="npc-feature-box npc-fade-in">
        <div class="npc-pill-row">
          <span class="npc-sub-pill">${esc(item.kind)}</span>
          <span class="npc-counter-pill">第 ${idx + 1} / ${CAFE_TRIVIA.length} 則</span>
        </div>
        <h3 class="npc-feature-title">${esc(item.title)}</h3>
        <p class="npc-feature-text">${esc(item.body)}</p>
      </div>
      <div class="npc-card-actions">
        <button type="button" class="npc-action-btn" id="npcCafeNextBtn">🎲 再抽一則</button>
      </div>
    `;
    cardBody.querySelector("#npcCafeNextBtn").addEventListener("click", renderQuantumCafe);
  }

  function renderObservatory() {
    const idx = pickNonRepeatingIndex("observatory", OBSERVATORY_FORTUNES.length);
    const f = OBSERVATORY_FORTUNES[idx];
    cardBody.innerHTML = `
      <div class="npc-feature-box npc-fortune-box npc-fade-in">
        <div class="npc-fortune-top">
          <span class="npc-fortune-luck">${esc(f.luck)}</span>
          <span class="npc-sub-pill">✨ 幸運演算法：${esc(f.algo)}</span>
        </div>
        <blockquote class="npc-fortune-quote">${esc(f.quote)}</blockquote>
        <p class="npc-feature-text">🔭 <b>星象小叮嚀：</b>${esc(f.tip)}</p>
      </div>
      <div class="npc-card-actions">
        <button type="button" class="npc-action-btn" id="npcObsDrawBtn">🔮 再抽一支演算法幸運籤</button>
      </div>
    `;
    cardBody.querySelector("#npcObsDrawBtn").addEventListener("click", renderObservatory);
  }

  function renderBottlePost() {
    const idx = pickNonRepeatingIndex("bottle-post", BOTTLE_STORIES.length);
    const s = BOTTLE_STORIES[idx];
    cardBody.innerHTML = `
      <div class="npc-feature-box npc-parchment-box npc-fade-in">
        <div class="npc-pill-row">
          <span class="npc-sub-pill">📜 資訊史奇蹟瓶中信 · ${esc(s.year)}</span>
          <span class="npc-counter-pill">第 ${idx + 1} / ${BOTTLE_STORIES.length} 封</span>
        </div>
        <h3 class="npc-feature-title">${esc(s.title)}</h3>
        <p class="npc-feature-text">${esc(s.story)}</p>
      </div>
      <div class="npc-card-actions">
        <button type="button" class="npc-action-btn" id="npcBottleNextBtn">🍾 再撈一封瓶中信</button>
      </div>
    `;
    cardBody.querySelector("#npcBottleNextBtn").addEventListener("click", renderBottlePost);
  }

  function renderFishingPier() {
    const idx = pickNonRepeatingIndex("fishing-pier", FISHING_QUIZZES.length);
    const quiz = FISHING_QUIZZES[idx];
    cardBody.innerHTML = `
      <div class="npc-feature-box npc-fade-in">
        <div class="npc-pill-row">
          <span class="npc-sub-pill">🛡️ 資安與防詐騙快問快答</span>
          <span class="npc-counter-pill">趣味挑戰 · 不計分</span>
        </div>
        <h3 class="npc-feature-title">${esc(quiz.q)}</h3>
        <div class="npc-quiz-options" id="npcFishOptions">
          ${quiz.options
            .map(
              (opt, oIdx) =>
                `<button type="button" class="npc-quiz-opt" data-opt="${oIdx}">${esc(opt)}</button>`
            )
            .join("")}
        </div>
        <div class="npc-quiz-feedback" id="npcFishFeedback" hidden></div>
      </div>
      <div class="npc-card-actions">
        <button type="button" class="npc-action-btn" id="npcFishNextBtn">🎣 再釣一題</button>
      </div>
    `;

    const optsWrap = cardBody.querySelector("#npcFishOptions");
    const feedbackEl = cardBody.querySelector("#npcFishFeedback");
    optsWrap.querySelectorAll(".npc-quiz-opt").forEach((btn) => {
      btn.addEventListener("click", () => {
        const chosen = Number(btn.dataset.opt);
        const isCorrect = chosen === quiz.answer;
        optsWrap.querySelectorAll(".npc-quiz-opt").forEach((b, bIdx) => {
          b.disabled = true;
          if (bIdx === quiz.answer) b.classList.add("is-correct");
          else if (bIdx === chosen && !isCorrect) b.classList.add("is-wrong");
        });
        feedbackEl.hidden = false;
        feedbackEl.className = `npc-quiz-feedback ${isCorrect ? "is-ok npc-sparkle" : "is-warn"}`;
        feedbackEl.innerHTML = isCorrect
          ? `<div class="npc-fb-head">🎉 太棒了！你成功守護了自己的數位安全！</div><p>${esc(quiz.explain)}</p>`
          : `<div class="npc-fb-head">💡 差一點點！生活防詐小提醒：</div><p>${esc(quiz.explain)}</p>`;

        if (isCorrect && typeof window.confetti === "function") {
          try {
            window.confetti({ particleCount: 28, spread: 55, origin: { y: 0.62 } });
          } catch {}
        }
      });
    });
    cardBody.querySelector("#npcFishNextBtn").addEventListener("click", renderFishingPier);
  }

  function renderMusicBox() {
    cardBody.innerHTML = `
      <div class="npc-feature-box npc-fade-in">
        <div class="npc-pill-row">
          <span class="npc-sub-pill">🎼 數位音訊與 8-bit 合成原理</span>
          <span class="npc-counter-pill">Web Audio API 即時合成</span>
        </div>
        <h3 class="npc-feature-title">為什麼紅白機的 8-bit 音樂這麼洗腦？</h3>
        <p class="npc-feature-text">
          早期的遊戲主機記憶體非常小，存不下真人錄音的 MP3，只好內建「音訊晶片」即時算出簡單波形！
          像是<b>方波 (Square Wave)</b> 聽起來清脆明亮適合當主旋律，<b>三角波 (Triangle Wave)</b> 圓潤低沉適合當貝斯，
          再靠每秒數萬次的「取樣」與數位「量化」，就能用極少位元組奏出活潑的島嶼樂章！
        </p>
        <div class="npc-music-visualizer" id="npcMusicEq" aria-hidden="true">
          <span>🎵</span><span>🎶</span><span>🎹</span><span>🎶</span><span>🎵</span>
        </div>
      </div>
      <div class="npc-card-actions">
        <button type="button" class="npc-action-btn npc-music-btn" id="npcMusicPlayBtn">🎹 播放 8-bit 島嶼旋律</button>
      </div>
    `;
    cardBody.querySelector("#npcMusicPlayBtn").addEventListener("click", playChiptuneMelody);
  }

  function renderGreenhouse() {
    const idx = pickNonRepeatingIndex("greenhouse", GREEN_TECH_FACTS.length);
    const g = GREEN_TECH_FACTS[idx];
    cardBody.innerHTML = `
      <div class="npc-feature-box npc-green-box npc-fade-in">
        <div class="npc-pill-row">
          <span class="npc-sub-pill">${esc(g.tag)}</span>
          <span class="npc-counter-pill">第 ${idx + 1} / ${GREEN_TECH_FACTS.length} 則</span>
        </div>
        <h3 class="npc-feature-title">${esc(g.title)}</h3>
        <p class="npc-feature-text">${esc(g.body)}</p>
      </div>
      <div class="npc-card-actions">
        <button type="button" class="npc-action-btn" id="npcGreenNextBtn">🌿 換一則綠色冷知識</button>
      </div>
    `;
    cardBody.querySelector("#npcGreenNextBtn").addEventListener("click", renderGreenhouse);
  }

  function renderLighthouse() {
    const report = analyzeCompassRoute();
    const gridHtml = report.statsList
      .map(
        (s) => `
        <button type="button" class="npc-compass-item${report.target && report.target.id === s.id && !report.allDone ? " is-target" : ""}" data-jump-island="${esc(s.id)}">
          <span class="nci-top">${esc(s.emoji)} <b>${esc(s.name)}</b></span>
          <span class="nci-meta">
            <span>最高 ${s.bestScore} 分</span>
            <span class="nci-stage">建築 ${s.stages}/3</span>
          </span>
        </button>`
      )
      .join("");

    cardBody.innerHTML = `
      <div class="npc-feature-box npc-compass-box npc-fade-in">
        <div class="npc-pill-row">
          <span class="npc-sub-pill">🧭 智慧航線推薦羅盤</span>
          <span class="npc-counter-pill">即時讀取你的學習進度</span>
        </div>
        <p class="npc-compass-headline">${esc(report.headline)}</p>
        <p class="npc-compass-sub">${esc(report.subHint)}</p>
        <div class="npc-compass-grid">${gridHtml}</div>
      </div>
      <div class="npc-card-actions">
        ${
          report.allDone
            ? `<button type="button" class="npc-action-btn" id="npcGoSanctuaryBtn">🏛️ 前往中央資訊聖殿</button>`
            : `<button type="button" class="npc-action-btn" id="npcGoTargetBtn">🚀 立即前往【${esc(report.target.name)}】</button>`
        }
      </div>
    `;

    cardBody.querySelectorAll("[data-jump-island]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const targetId = btn.dataset.jumpIsland;
        closeNpcIslandModal();
        if (typeof window.focusIsland === "function") window.focusIsland(targetId);
      });
    });

    const goBtn = cardBody.querySelector("#npcGoTargetBtn");
    if (goBtn && report.target) {
      goBtn.addEventListener("click", () => {
        const targetId = report.target.id;
        closeNpcIslandModal();
        if (typeof window.focusIsland === "function") window.focusIsland(targetId);
      });
    }

    const goSanctBtn = cardBody.querySelector("#npcGoSanctuaryBtn");
    if (goSanctBtn) {
      goSanctBtn.addEventListener("click", () => {
        closeNpcIslandModal();
        if (typeof window.focusIsland === "function") window.focusIsland("sanctuary");
      });
    }
  }

  const RENDERERS = {
    "quantum-cafe": renderQuantumCafe,
    observatory: renderObservatory,
    "bottle-post": renderBottlePost,
    "fishing-pier": renderFishingPier,
    "music-box": renderMusicBox,
    greenhouse: renderGreenhouse,
    lighthouse: renderLighthouse
  };

  function openNpcIslandModal(islandId) {
    const meta = NPC_ISLAND_META[islandId];
    const renderer = RENDERERS[islandId];
    if (!meta || !renderer) return;

    stopChiptuneMelody();
    state.activeId = islandId;
    cardEl.style.setProperty("--npc-card-accent", meta.accent);
    modalWrap.querySelector("#npcCardBadge").textContent = `${meta.emoji} ${meta.badge}`;
    modalWrap.querySelector("#npcModalTitle").textContent = meta.name;
    modalWrap.querySelector("#npcHostAvatar").textContent = meta.hostEmoji;
    modalWrap.querySelector("#npcHostName").textContent = meta.hostName;
    modalWrap.querySelector("#npcHostGreeting").textContent = meta.greeting;

    renderer();
    if (window.AvatarSystem && typeof window.AvatarSystem.mountNpcQuiz === "function") {
      window.AvatarSystem.mountNpcQuiz(modalWrap.querySelector("#npcStarQuizHost"), islandId);
    }
    modalWrap.classList.add("show");
  }

  window.openNpcIslandModal = openNpcIslandModal;
  window.closeNpcIslandModal = closeNpcIslandModal;
})();
