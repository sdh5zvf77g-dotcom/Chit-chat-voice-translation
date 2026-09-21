/**
 * Chit-Chat — Working browser prototype
 * Uses Web Speech API + free translation endpoints
 * Online / Offline hybrid simulation
 */

(() => {
  // ── DOM ──────────────────────────────────────────────────────────────
  const speakBtn      = document.getElementById("speakBtn");
  const sourceLang    = document.getElementById("sourceLang");
  const targetLang    = document.getElementById("targetLang");
  const sourceText    = document.getElementById("sourceText");
  const targetText    = document.getElementById("targetText");
  const statusText    = document.getElementById("statusText");
  const latencyBadge  = document.getElementById("latencyBadge");
  const onlineBtn     = document.getElementById("onlineBtn");
  const offlineBtn    = document.getElementById("offlineBtn");
  const swapBtn       = document.getElementById("swapBtn");
  const clearBtn      = document.getElementById("clearBtn");
  const historyBtn    = document.getElementById("historyBtn");
  const settingsBtn   = document.getElementById("settingsBtn");
  const historyPanel  = document.getElementById("historyPanel");
  const settingsPanel = document.getElementById("settingsPanel");
  const closeHistory  = document.getElementById("closeHistory");
  const closeSettings = document.getElementById("closeSettings");
  const historyList   = document.getElementById("historyList");
  const autoSpeakChk  = document.getElementById("autoSpeak");
  const continuousChk = document.getElementById("continuousMode");
  const showLatencyChk= document.getElementById("showLatency");

  // ── State ────────────────────────────────────────────────────────────
  let isOnline = true;
  let isListening = false;
  let recognition = null;
  let history = JSON.parse(localStorage.getItem("chitchat-history") || "[]");
  let startTime = 0;

  // Simple offline dictionary for demo (common phrases)
  const offlineDict = {
    "en-es": {
      "hello": "hola",
      "hi": "hola",
      "how are you": "cómo estás",
      "thank you": "gracias",
      "thanks": "gracias",
      "yes": "sí",
      "no": "no",
      "please": "por favor",
      "goodbye": "adiós",
      "good morning": "buenos días",
      "good night": "buenas noches",
      "i love you": "te quiero",
      "where is": "dónde está",
      "how much": "cuánto cuesta",
      "help": "ayuda",
      "water": "agua",
      "food": "comida",
    },
    "es-en": {
      "hola": "hello",
      "cómo estás": "how are you",
      "gracias": "thank you",
      "sí": "yes",
      "no": "no",
      "por favor": "please",
      "adiós": "goodbye",
      "buenos días": "good morning",
      "te quiero": "i love you",
      "dónde está": "where is",
      "ayuda": "help",
      "agua": "water",
      "comida": "food",
    },
    "en-fr": {
      "hello": "bonjour",
      "hi": "salut",
      "thank you": "merci",
      "yes": "oui",
      "no": "non",
      "please": "s'il vous plaît",
      "goodbye": "au revoir",
      "good morning": "bonjour",
      "i love you": "je t'aime",
      "help": "aide",
      "water": "eau",
      "food": "nourriture",
    },
    "fr-en": {
      "bonjour": "hello",
      "salut": "hi",
      "merci": "thank you",
      "oui": "yes",
      "non": "no",
      "au revoir": "goodbye",
      "je t'aime": "i love you",
      "aide": "help",
      "eau": "water",
    },
  };

  // ── Speech Recognition setup ─────────────────────────────────────────
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

  function initRecognition() {
    if (!SpeechRecognition) {
      setStatus("Speech recognition not supported in this browser. Try Chrome / Edge.");
      return null;
    }
    const rec = new SpeechRecognition();
    rec.continuous = false;
    rec.interimResults = true;
    rec.maxAlternatives = 1;

    rec.onstart = () => {
      isListening = true;
      speakBtn.classList.add("listening");
      speakBtn.querySelector(".speak-label").textContent = "Listening…";
      setStatus("Listening… speak now");
      startTime = performance.now();
    };

    rec.onresult = (event) => {
      let interim = "";
      let final = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const t = event.results[i][0].transcript;
        if (event.results[i].isFinal) final += t;
        else interim += t;
      }
      if (final) {
        sourceText.textContent = final;
        sourceText.classList.remove("placeholder");
        translateAndSpeak(final);
      } else if (interim) {
        sourceText.textContent = interim + "…";
        sourceText.classList.remove("placeholder");
      }
    };

    rec.onerror = (e) => {
      console.warn("Speech error:", e.error);
      stopListening();
      if (e.error === "not-allowed") {
        setStatus("Microphone permission denied. Please allow mic access.");
      } else if (e.error === "no-speech") {
        setStatus("No speech detected. Try again.");
      } else {
        setStatus("Error: " + e.error);
      }
    };

    rec.onend = () => {
      stopListening();
      if (continuousChk.checked && isListening === false) {
        // optional continuous restart can be added later
      }
    };

    return rec;
  }

  recognition = initRecognition();

  // ── Translation ──────────────────────────────────────────────────────
  async function translateText(text, from, to) {
    const fromCode = from.split("-")[0];
    const toCode = to.split("-")[0];

    // Offline mode → try local dictionary first
    if (!isOnline) {
      const key = `${fromCode}-${toCode}`;
      const dict = offlineDict[key] || offlineDict[`${toCode}-${fromCode}`];
      if (dict) {
        const lower = text.toLowerCase().trim();
        // exact match
        if (dict[lower]) return dict[lower];
        // simple word replace
        let result = text;
        for (const [k, v] of Object.entries(dict)) {
          const re = new RegExp(`\\b${k}\\b`, "gi");
          result = result.replace(re, v);
        }
        if (result !== text) return result;
      }
      // fallback offline message
      return `[Offline] ${text}`;
    }

    // Online → try free public endpoints
    try {
      // 1. MyMemory (free, generous limits)
      const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${fromCode}|${toCode}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.responseData && data.responseData.translatedText) {
        return data.responseData.translatedText;
      }
    } catch (e) {
      console.warn("MyMemory failed", e);
    }

    // 2. Fallback – LibreTranslate public instance (may be rate-limited)
    try {
      const res = await fetch("https://libretranslate.com/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          q: text,
          source: fromCode,
          target: toCode,
          format: "text",
        }),
      });
      const data = await res.json();
      if (data.translatedText) return data.translatedText;
    } catch (e) {
      console.warn("LibreTranslate failed", e);
    }

    // Final fallback
    return `[Translated] ${text}`;
  }

  async function translateAndSpeak(text) {
    if (!text.trim()) return;

    setStatus(isOnline ? "Translating online…" : "Translating offline…");
    const t0 = performance.now();

    const translated = await translateText(
      text,
      sourceLang.value,
      targetLang.value
    );

    const elapsed = Math.round(performance.now() - t0);
    targetText.textContent = translated;
    targetText.classList.remove("placeholder");

    if (showLatencyChk.checked) {
      latencyBadge.textContent = `~${elapsed}ms`;
      latencyBadge.classList.remove("hidden");
    }

    // Save to history
    history.unshift({
      from: text,
      to: translated,
      source: sourceLang.value,
      target: targetLang.value,
      time: new Date().toLocaleTimeString(),
      mode: isOnline ? "online" : "offline",
    });
    if (history.length > 50) history.pop();
    localStorage.setItem("chitchat-history", JSON.stringify(history));

    setStatus(isOnline ? "Done (online)" : "Done (offline)");

    // Speak the translation
    if (autoSpeakChk.checked) {
      speak(translated, targetLang.value);
    }
  }

  // ── Text-to-Speech ───────────────────────────────────────────────────
  function speak(text, lang) {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = lang;
    utter.rate = 1.0;
    utter.pitch = 1.0;
    window.speechSynthesis.speak(utter);
  }

  // ── UI helpers ───────────────────────────────────────────────────────
  function setStatus(msg) {
    statusText.textContent = msg;
  }

  function stopListening() {
    isListening = false;
    speakBtn.classList.remove("listening");
    speakBtn.querySelector(".speak-label").textContent = "Hold to Speak";
  }

  function startListening() {
    if (!recognition) {
      setStatus("Speech recognition not available in this browser");
      return;
    }
    recognition.lang = sourceLang.value;
    try {
      recognition.start();
    } catch (e) {
      // already started
    }
  }

  // ── Event listeners ──────────────────────────────────────────────────
  // Hold to speak (pointer events work for both mouse and touch)
  speakBtn.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    startListening();
  });

  speakBtn.addEventListener("pointerup", () => {
    if (recognition && isListening) {
      recognition.stop();
    }
  });

  speakBtn.addEventListener("pointerleave", () => {
    if (recognition && isListening) {
      recognition.stop();
    }
  });

  // Also support click for continuous mode
  speakBtn.addEventListener("click", (e) => {
    // already handled by pointer events mostly
  });

  // Mode toggle
  onlineBtn.addEventListener("click", () => {
    isOnline = true;
    onlineBtn.classList.add("active");
    offlineBtn.classList.remove("active");
    setStatus("Online mode — best quality");
  });

  offlineBtn.addEventListener("click", () => {
    isOnline = false;
    offlineBtn.classList.add("active");
    onlineBtn.classList.remove("active");
    setStatus("Offline mode — local dictionary + privacy");
  });

  // Swap languages
  swapBtn.addEventListener("click", () => {
    const a = sourceLang.value;
    sourceLang.value = targetLang.value;
    targetLang.value = a;
    // also swap the visible texts
    const tmp = sourceText.textContent;
    sourceText.textContent = targetText.textContent;
    targetText.textContent = tmp;
  });

  // Clear
  clearBtn.addEventListener("click", () => {
    sourceText.textContent = "Tap the big button and start talking…";
    sourceText.classList.add("placeholder");
    targetText.textContent = "Translation will appear here";
    targetText.classList.add("placeholder");
    latencyBadge.classList.add("hidden");
    setStatus("Ready — choose languages and tap Speak");
  });

  // History
  historyBtn.addEventListener("click", () => {
    renderHistory();
    historyPanel.classList.remove("hidden");
  });
  closeHistory.addEventListener("click", () => historyPanel.classList.add("hidden"));

  // Settings
  settingsBtn.addEventListener("click", () => settingsPanel.classList.remove("hidden"));
  closeSettings.addEventListener("click", () => settingsPanel.classList.add("hidden"));

  // Close panels on backdrop click
  historyPanel.addEventListener("click", (e) => {
    if (e.target === historyPanel) historyPanel.classList.add("hidden");
  });
  settingsPanel.addEventListener("click", (e) => {
    if (e.target === settingsPanel) settingsPanel.classList.add("hidden");
  });

  function renderHistory() {
    if (history.length === 0) {
      historyList.innerHTML = "<p style='color:var(--dim)'>No conversations yet.</p>";
      return;
    }
    historyList.innerHTML = history
      .map(
        (h) => `
      <div class="history-item">
        <div class="from">${escapeHtml(h.from)}</div>
        <div class="to">${escapeHtml(h.to)}</div>
        <div style="font-size:0.7rem;color:var(--dim);margin-top:6px">
          ${h.time} · ${h.mode} · ${h.source.split("-")[0]} → ${h.target.split("-")[0]}
        </div>
      </div>`
      )
      .join("");
  }

  function escapeHtml(str) {
    return str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  // Initial placeholder classes
  sourceText.classList.add("placeholder");
  targetText.classList.add("placeholder");

  // Check support on load
  if (!SpeechRecognition) {
    setStatus("⚠️ Speech recognition limited. Use Chrome / Edge for best results.");
  } else {
    setStatus("Ready — hold the button and speak");
  }

  // Keyboard shortcut: Space to talk
  document.addEventListener("keydown", (e) => {
    if (e.code === "Space" && e.target === document.body) {
      e.preventDefault();
      if (!isListening) startListening();
    }
  });
  document.addEventListener("keyup", (e) => {
    if (e.code === "Space" && isListening) {
      recognition && recognition.stop();
    }
  });
})();
