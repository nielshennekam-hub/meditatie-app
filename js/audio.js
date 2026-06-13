/* Stilte — geluidsengine
   Alle klanken worden gesynthetiseerd met Web Audio:
   - gongs/klankschalen: optellende sinus-boventonen met trage uitsterving
   - sfeergeluiden: gefilterde ruis met langzame modulatie
   Hierdoor zijn er geen audiobestanden nodig en werkt alles offline. */

const SoundEngine = (() => {
  let ctx = null;
  let master = null;
  let ambientBus = null;
  let ambient = null;         // actief sfeergeluid { name, nodes, gain }
  let ambientVolume = 0.6;
  let silentEl = null;
  let recordingActive = false;

  const IS_IOS = /iphone|ipad|ipod/i.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

  // iOS dempt Web Audio bij de stil-schakelaar. De audiosessie op
  // "playback" zetten (moderne API) plus een onhoorbaar loopend
  // <audio>-element (beproefde fallback) houdt de gongs hoorbaar.
  function unlockMuteSwitch() {
    if (recordingActive) return; // tijdens opname blokkeert "playback" de microfoon
    try {
      if ("audioSession" in navigator) navigator.audioSession.type = "playback";
    } catch (e) { /* oudere iOS */ }
    if (!IS_IOS) return;
    if (!silentEl) {
      silentEl = new Audio("assets/sounds/silence.mp3");
      silentEl.loop = true;
      silentEl.setAttribute("playsinline", "");
    }
    if (silentEl.paused) {
      const p = silentEl.play();
      if (p) p.catch(() => { /* buiten gebaar: volgende keer */ });
    }
  }

  // Vóór een microfoonopname: de keep-alive pauzeren en de audiosessie naar
  // opnamemodus. Zonder dit blijft iOS in "playback" hangen, waardoor een
  // tweede getUserMedia-aanroep de microfoon niet meer krijgt.
  function beginRecording() {
    recordingActive = true;
    if (silentEl && !silentEl.paused) silentEl.pause();
    try {
      if ("audioSession" in navigator) navigator.audioSession.type = "play-and-record";
    } catch (e) { /* oudere iOS */ }
  }

  // Na de opname: afspeelmodus en keep-alive herstellen.
  function endRecording() {
    recordingActive = false;
    unlockMuteSwitch();
  }

  function ensure() {
    unlockMuteSwitch();
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 0.9;
      master.connect(ctx.destination);
      ambientBus = ctx.createGain();
      ambientBus.gain.value = ambientVolume;
      ambientBus.connect(master);
    }
    if (ctx.state !== "running") ctx.resume().catch(() => { /* volgt bij gebaar */ });
    return ctx;
  }

  // Sluit de audiocontext; bij de volgende klank wordt een verse opgebouwd.
  // Nodig op iOS: na microfoongebruik blijft de uitvoer anders stil of
  // hangt hij op het oorspeakertje.
  async function reset() {
    if (!ctx) return;
    const old = ctx;
    ctx = null;
    master = null;
    ambientBus = null;
    ambient = null;
    customBuffer = null;
    decoding = null;
    sampleBuffers = {};
    samplePending = {};
    for (const k of Object.keys(noiseCache)) delete noiseCache[k];
    try { await old.close(); } catch (e) { /* al gesloten */ }
  }

  function now() { ensure(); return ctx.currentTime; }

  /* ---------- Gongs & klankschalen ---------- */

  const GONGS = {
    bowl: {   // Tibetaanse klankschaal
      f0: 196,
      decay: 9,
      partials: [
        { r: 1, g: 1.0 }, { r: 1.003, g: 0.55 },     // zweving
        { r: 2.71, g: 0.42 }, { r: 4.95, g: 0.2 }, { r: 7.4, g: 0.09 }
      ]
    },
    gong: {   // diepe gong
      f0: 82,
      decay: 14,
      noise: true,
      partials: [
        { r: 1, g: 1.0 }, { r: 1.48, g: 0.6 }, { r: 2.39, g: 0.45 },
        { r: 3.62, g: 0.28 }, { r: 5.11, g: 0.16 }, { r: 6.94, g: 0.08 }
      ]
    },
    crystal: { // kristallen schaal
      f0: 432,
      decay: 11,
      partials: [
        { r: 1, g: 1.0 }, { r: 1.0015, g: 0.5 },
        { r: 2.0, g: 0.22 }, { r: 3.01, g: 0.08 }
      ]
    },
    bells: {  // koshi-achtige belletjes (drie aanslagen)
      cluster: [
        { f0: 1175, delay: 0 }, { f0: 1397, delay: 0.18 }, { f0: 1568, delay: 0.42 }
      ],
      decay: 4,
      partials: [{ r: 1, g: 1.0 }, { r: 2.76, g: 0.18 }, { r: 5.4, g: 0.05 }]
    }
  };

  /* ---------- meegeleverde opnames (echte klankschaal) ---------- */

  // gain stemt het niveau af op de gesynthetiseerde klanken (RMS-gematcht)
  const SAMPLES = {
    "bowl-small": { url: "assets/sounds/bowl-small.mp3", gain: 1.05 }
  };
  let sampleBuffers = {};
  let samplePending = {};

  function loadSample(name) {
    if (sampleBuffers[name]) return Promise.resolve(sampleBuffers[name]);
    if (!samplePending[name]) {
      samplePending[name] = fetch(SAMPLES[name].url)
        .then(r => r.arrayBuffer())
        .then(ab => ctx.decodeAudioData(ab))
        .then(buf => { sampleBuffers[name] = buf; return buf; })
        .catch(() => { samplePending[name] = null; return null; });
    }
    return samplePending[name];
  }

  // Alvast ophalen en decoderen, zodat de eerste slag direct klinkt.
  function preload(name) {
    if (!SAMPLES[name]) return;
    ensure();
    loadSample(name);
  }

  function strikeSample(name, when, volume) {
    const t0 = when ?? ctx.currentTime;
    const state = { cancelled: false, src: null };
    const play = () => {
      const buf = sampleBuffers[name];
      if (state.cancelled || !buf) return;
      const src = ctx.createBufferSource();
      src.buffer = buf;
      const g = ctx.createGain();
      const at = Math.max(ctx.currentTime, t0);
      g.gain.setValueAtTime(0, at);
      g.gain.linearRampToValueAtTime(SAMPLES[name].gain * volume, at + 0.01);
      src.connect(g).connect(master);
      src.start(at);
      state.src = src;
    };
    if (sampleBuffers[name]) play();
    else loadSample(name).then(play);
    return {
      cancel() {
        state.cancelled = true;
        if (state.src) { try { state.src.stop(); } catch (e) { /* al gestopt */ } }
      }
    };
  }

  // Slaat één klank aan op tijdstip `when` (AudioContext-klok).
  // Geeft een handle terug waarmee de klank geannuleerd kan worden.
  function strike(type, when, volume = 1) {
    ensure();
    if (SAMPLES[type]) return strikeSample(type, when, volume);
    if (type === "custom") {
      if (customBlob) return strikeCustom(when, volume);
      type = "bowl"; // geen opname: terugvallen op de klankschaal
    }
    const def = GONGS[type] || GONGS.bowl;
    const t0 = when ?? ctx.currentTime;
    const sources = [];

    const hit = (f0, t, vol) => {
      const env = ctx.createGain();
      env.gain.setValueAtTime(0, t);
      env.gain.linearRampToValueAtTime(vol, t + 0.015);
      env.gain.exponentialRampToValueAtTime(0.0001, t + def.decay);
      env.connect(master);

      for (const p of def.partials) {
        const osc = ctx.createOscillator();
        const og = ctx.createGain();
        osc.type = "sine";
        osc.frequency.value = f0 * p.r;
        og.gain.setValueAtTime(p.g, t);
        // hogere boventonen sterven sneller uit
        og.gain.exponentialRampToValueAtTime(0.0001, t + def.decay / (0.6 + 0.55 * p.r));
        osc.connect(og).connect(env);
        osc.start(t);
        osc.stop(t + def.decay + 0.1);
        sources.push(osc);
      }

      if (def.noise) {  // metalige attack van een grote gong
        const nb = noiseBuffer("white");
        const src = ctx.createBufferSource();
        src.buffer = nb;
        const lp = ctx.createBiquadFilter();
        lp.type = "lowpass";
        lp.frequency.value = 900;
        const ng = ctx.createGain();
        ng.gain.setValueAtTime(0.25 * vol, t);
        ng.gain.exponentialRampToValueAtTime(0.0001, t + 0.5);
        src.connect(lp).connect(ng).connect(master);
        src.start(t);
        src.stop(t + 0.6);
        sources.push(src);
      }
    };

    const base = 0.28 * volume;
    if (def.cluster) {
      for (const c of def.cluster) hit(c.f0, t0 + c.delay, base * 0.8);
    } else {
      hit(def.f0, t0, base);
    }

    return {
      cancel() {
        for (const s of sources) { try { s.stop(); } catch (e) { /* al gestopt */ } }
      }
    };
  }

  /* ---------- Eigen klank (opname of audiobestand) ---------- */

  const DB_NAME = "stilte";
  const DB_STORE = "sounds";
  let customBlob = null;     // ruwe audio van de actieve opname
  let customBuffer = null;   // gedecodeerd
  let customGain = 1;        // normalisatie naar gelijk volume
  let customMeta = null;     // { name, duration }
  let customTrim = null;     // { start, end } in seconden
  let customId = null;       // sleutel van de actieve opname
  let customItems = [];      // [{ id, name, duration }] — alle opnames
  let trimSaveId = null;
  let decoding = null;
  const waveCache = { blob: null, peaks: null };

  function idb() {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => req.result.createObjectStore(DB_STORE);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  function idbOp(mode, fn) {
    return idb().then(db => new Promise((resolve, reject) => {
      const tx = db.transaction(DB_STORE, mode);
      const req = fn(tx.objectStore(DB_STORE));
      tx.oncomplete = () => resolve(req && req.result);
      tx.onerror = () => reject(tx.error);
    }));
  }

  async function refreshCustomList() {
    try {
      const keys = await idbOp("readonly", store => store.getAllKeys());
      const vals = await idbOp("readonly", store => store.getAll());
      customItems = keys.map((k, i) =>
        ({ id: k, name: vals[i].name, duration: vals[i].duration }));
    } catch (e) { customItems = []; }
  }

  // Bij het opstarten: bibliotheek inladen en de voorkeursopname activeren.
  async function initCustomSound(preferId) {
    try {
      // migratie: het oude enkele "custom"-slot wordt een bibliotheekitem
      const legacy = await idbOp("readonly", store => store.get("custom"));
      if (legacy) {
        await idbOp("readwrite", store => {
          store.put(legacy, "c" + Date.now());
          return store.delete("custom");
        });
      }
      await refreshCustomList();
      const pick = customItems.find(it => it.id === preferId) || customItems[0];
      if (pick) await selectCustom(pick.id);
    } catch (e) { /* opslag niet beschikbaar */ }
    return customMeta;
  }

  // Maakt een opname uit de bibliotheek actief (voor afspelen en knippen).
  async function selectCustom(id) {
    let rec = null;
    try { rec = await idbOp("readonly", store => store.get(id)); }
    catch (e) { /* ok */ }
    if (!rec) return null;
    customId = id;
    customBlob = rec.blob;
    customBuffer = null;
    decoding = null;
    customMeta = { name: rec.name, duration: rec.duration };
    customTrim = { start: rec.trimStart || 0, end: rec.trimEnd || rec.duration };
    return customMeta;
  }

  function decodeCustom() {
    if (customBuffer) return Promise.resolve(customBuffer);
    if (!customBlob) return Promise.resolve(null);
    if (!decoding) {
      decoding = customBlob.arrayBuffer()
        .then(ab => ctx.decodeAudioData(ab))
        .then(buf => {
          let peak = 0;
          for (let c = 0; c < buf.numberOfChannels; c++) {
            const d = buf.getChannelData(c);
            for (let i = 0; i < d.length; i++) {
              const a = Math.abs(d[i]);
              if (a > peak) peak = a;
            }
          }
          customGain = peak > 0 ? Math.min(3, 0.9 / peak) : 1;
          customBuffer = buf;
          return buf;
        })
        .catch(() => { decoding = null; return null; });
    }
    return decoding;
  }

  // Voegt een nieuwe opname toe aan de bibliotheek en maakt hem actief.
  async function addCustomSound(blob, name) {
    ensure();
    const prev = { blob: customBlob, buf: customBuffer, dec: decoding };
    customBlob = blob;
    customBuffer = null;
    decoding = null;
    const buf = await decodeCustom();
    if (!buf) {
      customBlob = prev.blob;
      customBuffer = prev.buf;
      decoding = prev.dec;
      throw new Error("decode");
    }
    customId = "c" + Date.now();
    customMeta = { name: name || "opname", duration: Math.round(buf.duration * 10) / 10 };
    customTrim = { start: 0, end: customMeta.duration };
    try {
      await idbOp("readwrite", store =>
        store.put({ blob, name: customMeta.name, duration: customMeta.duration,
          trimStart: 0, trimEnd: customMeta.duration }, customId));
    } catch (e) { /* dan alleen voor deze sessie */ }
    await refreshCustomList();
    return { id: customId, ...customMeta };
  }

  // Verwijdert de actieve opname; geeft de id van de volgende terug (of null).
  async function deleteCustomSound() {
    if (customId) {
      try { await idbOp("readwrite", store => store.delete(customId)); }
      catch (e) { /* ok */ }
    }
    customId = customBlob = customBuffer = customMeta = customTrim = decoding = null;
    waveCache.blob = waveCache.peaks = null;
    await refreshCustomList();
    if (customItems[0]) {
      await selectCustom(customItems[0].id);
      return customItems[0].id;
    }
    return null;
  }

  function customList() { return customItems; }
  function activeCustomId() { return customId; }

  // Hernoemt de actieve opname (max. 40 tekens) en bewaart de naam.
  async function renameCustom(name) {
    if (!customId || !customMeta) return null;
    name = String(name).trim().slice(0, 40);
    if (!name) return customMeta;
    customMeta.name = name;
    try {
      await idbOp("readwrite", store =>
        store.put({ blob: customBlob, name, duration: customMeta.duration,
          trimStart: customTrim ? customTrim.start : 0,
          trimEnd: customTrim ? customTrim.end : customMeta.duration }, customId));
    } catch (e) { /* dan alleen voor deze sessie */ }
    await refreshCustomList();
    return customMeta;
  }

  function customInfo() { return customMeta; }

  function trimInfo() {
    if (!customMeta) return null;
    const tr = customTrim || { start: 0, end: customMeta.duration };
    return { start: tr.start, end: tr.end, duration: customMeta.duration };
  }

  // Knip direct in het geheugen aanpassen; opslaan gebeurt kort daarna
  // (debounce), zodat slepen over de golfvorm vloeiend blijft.
  function setTrim(start, end) {
    if (!customMeta) return null;
    const d = customMeta.duration;
    start = Math.max(0, Math.min(start, d - 0.1));
    end = Math.max(start + 0.1, Math.min(end, d));
    customTrim = { start, end };
    clearTimeout(trimSaveId);
    const id = customId;
    trimSaveId = setTimeout(() => {
      if (!id) return;
      idbOp("readwrite", store =>
        store.put({ blob: customBlob, name: customMeta.name, duration: customMeta.duration,
          trimStart: customTrim.start, trimEnd: customTrim.end }, id))
        .catch(() => { /* dan alleen voor deze sessie */ });
    }, 250);
    return customTrim;
  }

  // Piekwaarden per kolom voor de golfvormweergave (genormaliseerd 0..1).
  async function getWaveform(buckets = 160) {
    ensure();
    const buf = await decodeCustom();
    if (!buf) return null;
    if (waveCache.blob === customBlob && waveCache.peaks &&
        waveCache.peaks.length === buckets) {
      return { peaks: waveCache.peaks, duration: buf.duration };
    }
    const d = buf.getChannelData(0);
    const peaks = new Float32Array(buckets);
    const step = Math.max(1, Math.floor(d.length / buckets));
    for (let b = 0; b < buckets; b++) {
      let m = 0;
      const s0 = b * step;
      const s1 = Math.min(s0 + step, d.length);
      for (let i = s0; i < s1; i += 8) {
        const a = Math.abs(d[i]);
        if (a > m) m = a;
      }
      peaks[b] = m;
    }
    let mx = 0;
    for (const p of peaks) mx = Math.max(mx, p);
    if (mx > 0) for (let i = 0; i < buckets; i++) peaks[i] /= mx;
    waveCache.blob = customBlob;
    waveCache.peaks = peaks;
    return { peaks, duration: buf.duration };
  }

  function strikeCustom(when, volume) {
    const t0 = when ?? ctx.currentTime;
    const state = { cancelled: false, src: null };
    const play = () => {
      if (state.cancelled || !customBuffer) return;
      const src = ctx.createBufferSource();
      src.buffer = customBuffer;
      const g = ctx.createGain();
      const v = 0.8 * volume * customGain;
      const at = Math.max(ctx.currentTime, t0);
      const tr = customTrim || { start: 0, end: customBuffer.duration };
      const dur = Math.max(0.1, tr.end - tr.start);
      g.gain.setValueAtTime(0, at);
      g.gain.linearRampToValueAtTime(v, at + 0.01);               // klikvrije inzet
      g.gain.setValueAtTime(v, at + Math.max(0.02, dur - 0.08));
      g.gain.linearRampToValueAtTime(0.0001, at + dur);           // klikvrij einde
      src.connect(g).connect(master);
      src.start(at, tr.start, dur);
      state.src = src;
    };
    if (customBuffer) play();
    else decodeCustom().then(play);
    return {
      cancel() {
        state.cancelled = true;
        if (state.src) { try { state.src.stop(); } catch (e) { /* al gestopt */ } }
      }
    };
  }

  /* ---------- Ruisbuffers ---------- */

  const noiseCache = {};

  function noiseBuffer(kind) {
    if (noiseCache[kind]) return noiseCache[kind];
    const len = ctx.sampleRate * 3;
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    if (kind === "white") {
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    } else if (kind === "pink") {
      let b0 = 0, b1 = 0, b2 = 0;
      for (let i = 0; i < len; i++) {
        const w = Math.random() * 2 - 1;
        b0 = 0.997 * b0 + 0.029591 * w;
        b1 = 0.985 * b1 + 0.032534 * w;
        b2 = 0.95 * b2 + 0.048056 * w;
        d[i] = (b0 + b1 + b2 + w * 0.05) * 3.2;
      }
    } else { // brown
      let last = 0;
      for (let i = 0; i < len; i++) {
        const w = Math.random() * 2 - 1;
        last = (last + 0.02 * w) / 1.02;
        d[i] = last * 9;
      }
    }
    noiseCache[kind] = buf;
    return buf;
  }

  function lfo(freq, depth, target, offset) {
    const osc = ctx.createOscillator();
    osc.frequency.value = freq;
    const g = ctx.createGain();
    g.gain.value = depth;
    osc.connect(g).connect(target);
    osc.start(ctx.currentTime + (offset || 0));
    return osc;
  }

  /* ---------- Sfeergeluiden ---------- */

  function buildAmbient(name) {
    const nodes = [];
    const out = ctx.createGain();
    out.gain.value = 0;

    const noiseSrc = (kind) => {
      const src = ctx.createBufferSource();
      src.buffer = noiseBuffer(kind);
      src.loop = true;
      src.start();
      nodes.push(src);
      return src;
    };

    if (name === "rain") {
      const hiss = noiseSrc("white");
      const bp = ctx.createBiquadFilter();
      bp.type = "bandpass"; bp.frequency.value = 1400; bp.Q.value = 0.35;
      const hg = ctx.createGain(); hg.gain.value = 0.5;
      hiss.connect(bp).connect(hg).connect(out);
      nodes.push(lfo(0.31, 0.05, hg.gain));

      const rumbleSrc = noiseSrc("brown");
      const lp = ctx.createBiquadFilter();
      lp.type = "lowpass"; lp.frequency.value = 320;
      const rg = ctx.createGain(); rg.gain.value = 0.25;
      rumbleSrc.connect(lp).connect(rg).connect(out);
    } else if (name === "ocean") {
      const src = noiseSrc("brown");
      const lp = ctx.createBiquadFilter();
      lp.type = "lowpass"; lp.frequency.value = 650;
      const swell = ctx.createGain(); swell.gain.value = 0.5;
      src.connect(lp).connect(swell).connect(out);
      // twee langzame golven die net niet synchroon lopen
      nodes.push(lfo(0.065, 0.3, swell.gain));
      nodes.push(lfo(0.043, 0.16, swell.gain, 3));
    } else if (name === "wind") {
      const src = noiseSrc("pink");
      const bp = ctx.createBiquadFilter();
      bp.type = "bandpass"; bp.frequency.value = 480; bp.Q.value = 1.1;
      const wg = ctx.createGain(); wg.gain.value = 0.55;
      src.connect(bp).connect(wg).connect(out);
      nodes.push(lfo(0.05, 220, bp.frequency));     // vlagen van toonhoogte
      nodes.push(lfo(0.085, 0.18, wg.gain, 1.5));   // vlagen van sterkte
    } else { // noise: diepe bruine ruis
      const src = noiseSrc("brown");
      const lp = ctx.createBiquadFilter();
      lp.type = "lowpass"; lp.frequency.value = 380;
      const g = ctx.createGain(); g.gain.value = 0.6;
      src.connect(lp).connect(g).connect(out);
    }

    out.connect(ambientBus);
    return { name, nodes, gain: out };
  }

  function startAmbient(name, fade = 2) {
    ensure();
    if (ambient && ambient.name === name) return;
    stopAmbient(1);
    if (!name) return;
    ambient = buildAmbient(name);
    const t = ctx.currentTime;
    ambient.gain.gain.setValueAtTime(0, t);
    ambient.gain.gain.linearRampToValueAtTime(1, t + fade);
  }

  function stopAmbient(fade = 1.2) {
    if (!ambient) return;
    const old = ambient;
    ambient = null;
    const t = ctx.currentTime;
    old.gain.gain.cancelScheduledValues(t);
    old.gain.gain.setValueAtTime(old.gain.gain.value, t);
    old.gain.gain.linearRampToValueAtTime(0, t + fade);
    setTimeout(() => {
      for (const n of old.nodes) { try { n.stop(); } catch (e) { /* ok */ } }
      old.gain.disconnect();
    }, fade * 1000 + 100);
  }

  function setAmbientVolume(v) {
    ambientVolume = v;
    if (ambientBus) ambientBus.gain.setTargetAtTime(v, ctx.currentTime, 0.1);
  }

  function fadeOutAll(seconds) {
    if (!ctx) return;
    const t = ctx.currentTime;
    master.gain.cancelScheduledValues(t);
    master.gain.setValueAtTime(master.gain.value, t);
    master.gain.linearRampToValueAtTime(0.0001, t + seconds);
    setTimeout(() => {
      stopAmbient(0.1);
      master.gain.setValueAtTime(0.9, ctx.currentTime + 0.5);
    }, seconds * 1000 + 200);
  }

  function currentAmbient() { return ambient ? ambient.name : ""; }

  return {
    ensure, now, strike, startAmbient, stopAmbient, setAmbientVolume,
    fadeOutAll, currentAmbient, reset, preload, beginRecording, endRecording,
    initCustomSound, addCustomSound, deleteCustomSound, selectCustom, renameCustom,
    customList, activeCustomId, customInfo,
    trimInfo, setTrim, getWaveform
  };
})();
