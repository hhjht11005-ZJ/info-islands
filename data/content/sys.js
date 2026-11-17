/**
 * 示範內容:電腦探險島 · 單元 1「電腦大進化」(sys-1)
 * 單元鍵值 = <島嶼id>-<該單元在 islands.js sequence 陣列的順序(從1開始)>
 * 之後完整教案 / 學習單會依 docs/CONTENT_SCHEMA.md 擴充於同一檔案。
 */
window.CONTENT = window.CONTENT || {};
Object.assign(window.CONTENT, {
  "sys-1": {
    quiz: {
      passScore: 60,
      questions: [
        {
          id: "q1", level: "記憶", type: "single",
          q: "下列哪一種電腦的普及,讓電腦從「大型機房」走進一般家庭與辦公桌?",
          options: ["大型電腦(Mainframe)", "個人電腦(PC)", "算盤", "電報機"],
          answer: 1,
          explain: "早期電腦體積龐大、只有機構才負擔得起;個人電腦(PC)體積變小、價格下降,才讓一般人也能使用電腦。算盤是計算工具,電報機是通訊工具,都不是電腦。"
        },
        {
          id: "q2", level: "理解", type: "tf",
          q: "智慧型手機和平板電腦也是一種運算平臺,同樣有作業系統與應用程式(App)。",
          answer: true,
          explain: "手機、平板屬於行動運算平臺,例如 Android、iOS 就是它們的作業系統,App 則是在作業系統上執行的軟體。"
        },
        {
          id: "q3", level: "應用", type: "single",
          q: "小明在手機上寫了一半的報告,回家想用電腦繼續編輯。下列哪個做法最方便、也最不容易搞丟檔案?",
          options: ["把手機拆開,把零件裝到電腦上", "把報告印出來再重新打字", "把檔案存在雲端硬碟,回家在電腦上登入同一個帳號開啟", "每次都把手機帶去學校的電腦教室"],
          answer: 2,
          explain: "雲端服務把資料放在網路上的伺服器,只要登入同一個帳號,就能在手機、平板、電腦之間同步存取,這就是平臺從單機走向「雲端」的好處。"
        }
      ]
    }
  }
});
