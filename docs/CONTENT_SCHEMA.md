# 單元內容格式(教案 / 學習單 / 測驗)

每座島一個檔案:`data/content/<islandId>.js`,為每個單元提供內容。
**單元鍵值** = `<islandId>-<n>`,n 為該單元在 `data/islands.js` 中該島 `sequence` 陣列的順序(從 1 開始,依陣列原順序,不依學期排序)。

```js
window.CONTENT = window.CONTENT || {};
Object.assign(window.CONTENT, {
  "sys-1": {
    lesson: {
      overview: "一段 2–3 句的教學概述",
      standards: ["資S-IV-1","資S-IV-4","運t-IV-1"],          // 對應課綱條碼(取自該島 standards 的 code)
      objectives: ["學生能…", "學生能…"],            // 2–4 條可觀察、可評量的單元目標(動詞開頭:說明/比較/操作…)
      prep: ["教師準備…", "學生準備…"],              // 設備、軟體、紙本材料(優先免費/易取得)
      flow: [                                         // 教學流程;所有 min 加總 = 該單元節數 × 45
        { phase: "引起動機", min: 5, teacher: "教師做什麼", student: "學生做什麼" }
      ],
      differentiation: "差異化/補救與加深策略,2–3 句",
      assessmentFocus: "本單元評量重點,1–2 句",
      extension: "回家延伸任務或延伸閱讀,1–2 句"
    },
    worksheet: {
      title: "學習單標題",
      intro: "給學生的一段引導語(1–2 句,口吻親切)",
      sections: [
        { title: "一、暖身", items: [
          { type: "short", q: "題目或任務說明", hint: "(選填)提示", answer: "教師參考答案" }
          // type: "short"(簡答) | "fill"(填空,題目中用 ____ 表示空格) | "table"(請學生填表,q 描述欄位) | "draw"(繪圖/流程圖任務) | "reflect"(反思,answer 寫評量重點)
        ] }
      ]
    },
    quiz: {
      passScore: 60,
      questions: [
        { id: "q1", level: "記憶", type: "single", q: "題幹", options: ["A","B","C","D"], answer: 1, explain: "答對/答錯後顯示的解釋" },
        { id: "q2", level: "理解", type: "tf", q: "敘述…", answer: true, explain: "…" },
        { id: "q3", level: "應用", type: "multi", q: "下列哪些…(多選)", options: ["…","…","…","…"], answer: [0, 2], explain: "…" },
        { id: "q4", level: "應用", type: "fill", q: "二進位 101 轉十進位為 ____", answer: ["5"], explain: "…" }
      ]
    }
  }
});
```

## 品質規定
1. **繁體中文(台灣用語)**,適合國中七到九年級學生;題目情境生活化(校園、手機、遊戲、社群),**不得出現真實人名、電話、身分證等個資**。
2. **教案**:`flow` 至少 4 個階段(含引起動機、發展活動、統整/評量、總結),每階段 teacher 與 student 都要具體可執行;時間加總 = 節數 × 45。
3. **學習單**:2–3 個 section、共 6–10 題,由易到難(暖身 → 理解 → 應用/反思);每題都附 `answer`(教師參考答案)。
4. **測驗**:8–10 題;`level` 分布含記憶、理解、應用,應用題至少 3 題;題型至少含 single、tf 與 fill 或 multi;
   - single:`options` 恰 4 個,`answer` 為索引 0–3,且**正確答案位置不要全部相同**。
   - multi:`options` 4–5 個,`answer` 為索引陣列(2 個以上,非全選)。
   - fill:`answer` 為「可接受答案」字串陣列(同義詞、半形全形數字都列入);答案要短且唯一明確(數字、關鍵詞)。
   - 每題 `explain` 必填,說明為什麼,不要只寫「答案是 B」。
   - 題目必須依據單元 `topics` 與課綱內容,答案要**事實正確**;不確定的內容請不要出題。
5. 內容須與 `data/islands.js` 中該單元的 `topics`、`activity` 一致,可適度補充。
6. 不要引用會失效的特定網址;工具以名稱提及即可(如 Scratch、Python、Google 簡報、Teachable Machine)。

## 驗證
```
node tools/validate-content.js <islandId>
```
