/**
 * 資訊課程島 — 輕量音訊與背景音樂控制器 (Web Audio API 合成，支援離線與即時互動)
 * ---------------------------------------------------------------
 * 功能：
 * 1. 右上角音訊開關圖示 (#audioToggleBtn) 狀態管理與靜音切換
 * 2. 學生點擊「登入/登島」（ii:login 或點擊 #loginBtn）後自動播放放鬆海島風 BGM
 * 3. 島嶼等級提升時播放清脆升級音效 (playLevelUp)
 * 4. 7 座島滿分、中央聖殿島升起時播放盛大慶祝號角與和弦音效 (playSanctuaryFanfare)
 */
(() => {
  const STORAGE_KEY = "ii:audio_muted";
  let isMuted = false;
  try {
    isMuted = localStorage.getItem(STORAGE_KEY) === "1";
  } catch (e) {}

  let ctx = null;
  let masterGain = null;
  let bgmTimer = null;
  let bgmPlaying = false;
  let stepIndex = 0;

  // 動森風溫暖五聲音階與七和弦進行 (C Major9 -> F Major7 -> A Minor7 -> G13)
  const CHORD_PROGRESSION = [
    { root: 261.63, notes: [523.25, 659.25, 783.99, 987.77, 1174.66] }, // Cmaj9
    { root: 174.61, notes: [440.00, 523.25, 659.25, 698.46, 880.00] },  // Fmaj7
    { root: 220.00, notes: [440.00, 523.25, 659.25, 783.99, 987.77] },  // Am9
    { root: 196.00, notes: [392.00, 493.88, 587.33, 659.25, 783.99] }   // G6/9
  ];
  const MELODY_PATTERN = [0, 2, 1, 3, 4, 2, 3, 1, 0, 1, 2, 4, 3, 2, 1, 0];

  function ensureContext() {
    if (!ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return null;
      ctx = new AudioCtx();
      masterGain = ctx.createGain();
      masterGain.gain.value = isMuted ? 0 : 0.65;
      masterGain.connect(ctx.destination);
    }
    if (ctx.state === "suspended") {
      ctx.resume().catch(() => {});
    }
    return ctx;
  }

  /** 播放溫暖木琴/拇指琴 (Kalimba/Marimba) 單音 */
  function playKalimbaNote(freq, startTime, duration = 0.65, volume = 0.11) {
    if (!ctx || isMuted) return;
    const osc = ctx.createOscillator();
    const subOsc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(freq, startTime);

    subOsc.type = "triangle";
    subOsc.frequency.setValueAtTime(freq * 2, startTime);

    const subGain = ctx.createGain();
    subGain.gain.setValueAtTime(volume * 0.22, startTime);
    subGain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration * 0.35);

    gain.gain.setValueAtTime(0.001, startTime);
    gain.gain.linearRampToValueAtTime(volume, startTime + 0.018);
    gain.gain.exponentialRampToValueAtTime(0.0008, startTime + duration);

    osc.connect(gain);
    subOsc.connect(subGain);
    subGain.connect(gain);
    gain.connect(masterGain);

    osc.start(startTime);
    subOsc.start(startTime);
    osc.stop(startTime + duration + 0.04);
    subOsc.stop(startTime + duration + 0.04);
  }

  /** 播放柔和海風溫暖襯底和弦 (Warm Pad) */
  function playWarmPad(rootFreq, chordNotes, startTime, duration = 2.6) {
    if (!ctx || isMuted) return;
    const freqs = [rootFreq, chordNotes[0] * 0.5, chordNotes[1] * 0.5];
    freqs.forEach((f, idx) => {
      const osc = ctx.createOscillator();
      const filter = ctx.createBiquadFilter();
      const gain = ctx.createGain();

      osc.type = idx === 0 ? "sine" : "triangle";
      osc.frequency.setValueAtTime(f, startTime);

      filter.type = "lowpass";
      filter.frequency.setValueAtTime(620, startTime);

      const peak = idx === 0 ? 0.055 : 0.028;
      gain.gain.setValueAtTime(0.0005, startTime);
      gain.gain.linearRampToValueAtTime(peak, startTime + 0.45);
      gain.gain.setValueAtTime(peak, startTime + duration - 0.55);
      gain.gain.exponentialRampToValueAtTime(0.0005, startTime + duration);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(masterGain);

      osc.start(startTime);
      osc.stop(startTime + duration + 0.05);
    });
  }

  function scheduleBgmTick() {
    if (!bgmPlaying || isMuted) return;
    const c = ensureContext();
    if (!c) return;

    const now = c.currentTime + 0.03;
    const chordIdx = Math.floor(stepIndex / 8) % CHORD_PROGRESSION.length;
    const beatInBar = stepIndex % 8;
    const chord = CHORD_PROGRESSION[chordIdx];

    // 每小節第一拍鋪陳柔和海島和弦襯底
    if (beatInBar === 0) {
      playWarmPad(chord.root, chord.notes, now, 2.75);
    }

    // 輕快放鬆的木琴琶音旋律（偶爾留白製造呼吸感）
    if (beatInBar !== 3 && beatInBar !== 7) {
      const noteIdx = MELODY_PATTERN[stepIndex % MELODY_PATTERN.length];
      const freq = chord.notes[noteIdx % chord.notes.length];
      playKalimbaNote(freq, now, 0.72, 0.095);
    } else if (beatInBar === 7 && stepIndex % 16 === 15) {
      // 小節尾端輕巧高音泛音點綴
      playKalimbaNote(chord.notes[4] * 1.5, now, 0.55, 0.055);
    }

    stepIndex++;
  }

  function startBGM() {
    ensureContext();
    if (bgmPlaying) return;
    bgmPlaying = true;
    if (!isMuted) {
      scheduleBgmTick();
    }
    bgmTimer = setInterval(() => {
      if (!isMuted && bgmPlaying) {
        scheduleBgmTick();
      }
    }, 350);
    updateToggleUI();
  }

  function stopBGM() {
    bgmPlaying = false;
    if (bgmTimer) {
      clearInterval(bgmTimer);
      bgmTimer = null;
    }
    updateToggleUI();
  }

  /** 島嶼等級提升音效：清脆上行琶音 + 閃亮泛音 */
  function playLevelUp() {
    if (isMuted) return;
    const c = ensureContext();
    if (!c) return;

    const now = c.currentTime + 0.02;
    // C5 -> E5 -> G5 -> B5 -> C6 歡快升級琶音
    const notes = [523.25, 659.25, 783.99, 987.77, 1046.50];
    notes.forEach((freq, i) => {
      const t = now + i * 0.085;
      const dur = i === notes.length - 1 ? 0.75 : 0.32;
      const vol = i === notes.length - 1 ? 0.22 : 0.16;
      playKalimbaNote(freq, t, dur, vol);
    });
    // 伴隨高八度星光閃爍音
    playKalimbaNote(1567.98, now + 0.42, 0.65, 0.12);
    playKalimbaNote(2093.00, now + 0.50, 0.85, 0.14);
  }

  /** 7 座島滿分、中央聖殿島升起：盛大慶祝禮樂音效 */
  function playSanctuaryFanfare() {
    if (isMuted) return;
    const c = ensureContext();
    if (!c) return;

    const now = c.currentTime + 0.03;
    // 莊嚴輝煌的號角上行與大三和弦綻放 (G4 -> C5 -> E5 -> G5 -> C6 + 和弦共鳴)
    const fanfare = [
      { f: 392.00, t: 0.00, d: 0.24, v: 0.20 },
      { f: 523.25, t: 0.16, d: 0.24, v: 0.22 },
      { f: 659.25, t: 0.32, d: 0.24, v: 0.22 },
      { f: 783.99, t: 0.48, d: 0.38, v: 0.24 },
      { f: 659.25, t: 0.78, d: 0.20, v: 0.20 },
      { f: 1046.50, t: 0.96, d: 1.45, v: 0.26 }
    ];
    fanfare.forEach((n) => {
      playKalimbaNote(n.f, now + n.t, n.d, n.v);
      playKalimbaNote(n.f * 0.5, now + n.t, n.d * 1.1, n.v * 0.55);
    });

    // 璀璨聖殿金色光束共鳴和弦與高音星塵琶音
    playWarmPad(261.63, [523.25, 659.25, 783.99], now + 0.95, 2.4);
    const sparkle = [1046.50, 1318.51, 1567.98, 1975.53, 2093.00];
    sparkle.forEach((f, idx) => {
      playKalimbaNote(f, now + 1.08 + idx * 0.09, 0.8, 0.13);
    });
  }

  function setMuted(mute) {
    isMuted = Boolean(mute);
    try {
      localStorage.setItem(STORAGE_KEY, isMuted ? "1" : "0");
    } catch (e) {}

    if (!isMuted) {
      ensureContext();
      if (!bgmPlaying) {
        startBGM();
      }
    }
    if (masterGain && ctx) {
      masterGain.gain.setTargetAtTime(isMuted ? 0 : 0.65, ctx.currentTime, 0.05);
    }
    updateToggleUI();
  }

  function toggleMute() {
    setMuted(!isMuted);
  }

  function updateToggleUI() {
    const btn = document.getElementById("audioToggleBtn");
    if (!btn) return;
    btn.classList.toggle("is-muted", isMuted);
    btn.setAttribute("aria-pressed", String(!isMuted));
    btn.title = isMuted ? "點擊開啟背景音樂與音效" : "點擊切換為靜音";
    btn.innerHTML = isMuted
      ? `<span class="audio-ico">🔇</span><span class="audio-txt">音效關閉</span>`
      : `<span class="audio-ico">🔊</span><span class="audio-txt">音樂播放中</span>`;
  }

  function initAudioUI() {
    const btn = document.getElementById("audioToggleBtn");
    if (btn) {
      btn.addEventListener("click", () => {
        ensureContext();
        toggleMute();
      });
      updateToggleUI();
    }

    // 1. 學生點擊「登入/登島」按鈕或完成登入事件時，立即解鎖 AudioContext 並播放 BGM
    document.addEventListener("ii:login", () => {
      startBGM();
    });

    const loginForm = document.getElementById("loginForm");
    if (loginForm) {
      loginForm.addEventListener("submit", () => {
        ensureContext();
        startBGM();
      });
    }

    // 2. 若學生已處於登入狀態，首次在畫面點擊互動時即自動恢復 BGM 播放
    const unlockOnce = (e) => {
      if (window.shouldSkipGlobalEvent && window.shouldSkipGlobalEvent(e)) return;
      if (e.target && e.target.closest && e.target.closest("#audioToggleBtn")) return;
      if (window.Store && window.Store.profile) {
        startBGM();
        window.removeEventListener("pointerdown", unlockOnce);
      }
    };
    window.addEventListener("pointerdown", unlockOnce, { passive: true });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initAudioUI);
  } else {
    initAudioUI();
  }

  window.AudioManager = {
    startBGM,
    stopBGM,
    playLevelUp,
    playSanctuaryFanfare,
    toggleMute,
    setMuted,
    isMuted: () => isMuted
  };
})();
