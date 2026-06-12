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

  function ensure() {
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
    if (ctx.state === "suspended") ctx.resume();
    return ctx;
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

  // Slaat één klank aan op tijdstip `when` (AudioContext-klok).
  // Geeft een handle terug waarmee de klank geannuleerd kan worden.
  function strike(type, when, volume = 1) {
    ensure();
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
  let customBlob = null;     // ruwe audio uit IndexedDB
  let customBuffer = null;   // gedecodeerd
  let customGain = 1;        // normalisatie naar gelijk volume
  let customMeta = null;     // { name, duration }
  let decoding = null;

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

  // Bij het opstarten: opgeslagen opname alvast inladen (zonder audio-context).
  async function initCustomSound() {
    try {
      const rec = await idbOp("readonly", store => store.get("custom"));
      if (rec) {
        customBlob = rec.blob;
        customMeta = { name: rec.name, duration: rec.duration };
      }
    } catch (e) { /* opslag niet beschikbaar */ }
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

  async function setCustomSound(blob, name) {
    ensure();
    customBlob = blob;
    customBuffer = null;
    decoding = null;
    const buf = await decodeCustom();
    if (!buf) {
      customBlob = null;
      customMeta = null;
      throw new Error("decode");
    }
    customMeta = { name: name || "opname", duration: Math.round(buf.duration * 10) / 10 };
    try {
      await idbOp("readwrite", store =>
        store.put({ blob, name: customMeta.name, duration: customMeta.duration }, "custom"));
    } catch (e) { /* dan alleen voor deze sessie */ }
    return customMeta;
  }

  async function clearCustomSound() {
    customBlob = customBuffer = customMeta = decoding = null;
    try { await idbOp("readwrite", store => store.delete("custom")); }
    catch (e) { /* ok */ }
  }

  function customInfo() { return customMeta; }

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
      g.gain.setValueAtTime(0, at);
      g.gain.linearRampToValueAtTime(v, at + 0.01); // klikvrije inzet
      src.connect(g).connect(master);
      src.start(at);
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
    fadeOutAll, currentAmbient,
    initCustomSound, setCustomSound, clearCustomSound, customInfo
  };
})();
