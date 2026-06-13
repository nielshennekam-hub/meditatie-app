/* Stilte — taalondersteuning (NL/EN).
   Statische teksten via data-i18n-attributen; dynamische teksten via
   I18n.t(sleutel, ...argumenten). Waarden mogen functies zijn. */

const I18n = (() => {
  const STR = {
    nl: {
      "tab.timer": "Timer", "tab.breath": "Adem", "tab.sounds": "Geluiden", "tab.progress": "Voortgang",
      "greet.night": "Goedenacht", "greet.morning": "Goedemorgen",
      "greet.afternoon": "Goedemiddag", "greet.evening": "Goedenavond",
      dow: ["ma", "di", "wo", "do", "vr", "za", "zo"],
      days: ["zondag", "maandag", "dinsdag", "woensdag", "donderdag", "vrijdag", "zaterdag"],
      months: ["januari", "februari", "maart", "april", "mei", "juni",
        "juli", "augustus", "september", "oktober", "november", "december"],
      "dial.label": "minuten stilte",
      "settings.title": "Instellingen",
      "setting.gong": "Gong", "setting.strikes": "Aantal belletjes",
      "setting.interval": "Intervalbel", "setting.ambient": "Sfeergeluid",
      "setting.prep": "Voorbereiding", "setting.lang": "Taal",
      "setting.duration": "Duur", "setting.volume": "Volume", "setting.sleep": "Slaaptimer",
      "strikes.start": "Start", "strikes.mid": "Tussen", "strikes.end": "Einde",
      "chip.off": "Uit", "chip.none": "Geen", "chip.direct": "Direct",
      "gong.bowl": "Klankschaal", "gong.real": "Echte schaal", "gong.gong": "Diepe gong",
      "gong.bowl-small": "Heldere schaal", "gong.bowl-large": "Diepe schaal", "gong.bowl-warm": "Warme schaal",
      "gong.crystal": "Kristal", "gong.bells": "Belletjes",
      "gong.custom": "Eigen",
      "setting.gap": "Tussenpoos",
      "custom.none": "Nog geen eigen klank — neem er een op of kies een audiobestand.",
      "custom.saved": (name, s) => `${name} · ${s} s`,
      "custom.recname": n => `Opname ${n}`,
      "custom.record": "● Opnemen",
      "custom.starting": "Starten…",
      "custom.saving": "Opslaan…",
      "custom.choose": "Bestand kiezen",
      "custom.rename": "Hernoem",
      "custom.delete": "Verwijderen",
      "custom.play": "▶ Beluister",
      "custom.trimreset": "Herstel knip",
      "custom.trimhint": "sleep de randen om bij te knippen",
      "custom.error.mic": "Microfoon niet beschikbaar — geef toestemming voor de microfoon.",
      "custom.error.decode": "Dit bestand kon niet worden afgespeeld.",
      "amb.rain": "Regen", "amb.ocean": "Oceaan", "amb.wind": "Wind", "amb.noise": "Ruis",
      "btn.start.meditation": "Begin meditatie",
      "summary.bells": "belletjes",
      "summary.every": n => `elke ${n} min`,
      "breath.title": "Adem",
      "breath.sub": "Kom tot rust met een geleide ademhaling.",
      "tech.box.name": "Box-ademhaling",
      "tech.box.desc": "Gelijkmatig vierkant ritme voor focus en kalmte.",
      "tech.478.name": "4-7-8",
      "tech.478.desc": "Diep ontspannend, fijn voor het slapengaan.",
      "tech.coherent.name": "Gelijkmatig",
      "tech.coherent.desc": "Rustig in- en uitademen in balans.",
      "tech.calm.name": "Kalmerend",
      "tech.calm.desc": "Langere uitademing activeert ontspanning.",
      "btn.start.breath": "Begin oefening",
      "sounds.title": "Geluiden",
      "sounds.sub": "Sfeer om bij weg te dromen of te focussen.",
      "sound.rain": "Regen", "sound.ocean": "Oceaan",
      "sound.wind": "Wind", "sound.noise": "Diepe ruis",
      "sound.silent": "stil", "sound.playing": "speelt",
      "progress.title": "Voortgang",
      "stat.streak": "dagen op rij", "stat.minutes": "minuten totaal",
      "stat.sessions": "sessies", "stat.best": "langste reeks",
      "card.week": "Deze week", "card.milestones": "Mijlpalen", "card.recent": "Recente sessies",
      "progress.empty.sub": "Elke minuut stilte telt.",
      "progress.streak.sub": n => `Al ${n} dagen op rij — mooi zo.`,
      "progress.minutes.sub": n => `${n} minuten stilte verzameld.`,
      "sessions.empty": "Nog geen sessies — jouw eerste moment van stilte wacht.",
      "type.meditatie": "Meditatie", "type.adem": "Ademhaling",
      "ms.s1": "Eerste stap", "ms.s10": "10 sessies", "ms.s50": "50 sessies",
      "ms.d3": "3 dagen op rij", "ms.d7": "7 dagen op rij", "ms.d30": "30 dagen op rij",
      "ms.m60": "1 uur stilte", "ms.m300": "5 uur stilte", "ms.m1440": "24 uur stilte",
      "session.prepare": "Maak je klaar",
      "session.startsIn": n => `begint over ${n}`,
      "session.paused": "Gepauzeerd",
      "phase.in": "Adem in", "phase.hold": "Houd vast",
      "phase.out": "Adem uit", "phase.rest": "Rust",
      "done.title": "Mooi gedaan",
      "done.minutes": (n, mode) =>
        `${n} ${n === 1 ? "minuut" : "minuten"} ${mode === "adem" ? "ademruimte" : "stilte"}`,
      "done.session": n => `sessie ${n}`,
      "done.streak": n => `${n} dagen op rij`,
      "btn.done": "Klaar",
      "hint.ios": svg => "Zet Stilte op je beginscherm voor de volledige app-ervaring: " +
        "tik in Safari op " + svg + " <strong>Deel</strong> en kies " +
        "<strong>‘Zet op beginscherm’</strong>.",
      "hint.install": "Installeer Stilte als app — dan werkt hij offline en op volledig scherm.",
      "btn.install": "Installeer", "btn.notnow": "Niet nu"
    },
    en: {
      "tab.timer": "Timer", "tab.breath": "Breathe", "tab.sounds": "Sounds", "tab.progress": "Progress",
      "greet.night": "Good night", "greet.morning": "Good morning",
      "greet.afternoon": "Good afternoon", "greet.evening": "Good evening",
      dow: ["mo", "tu", "we", "th", "fr", "sa", "su"],
      days: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
      months: ["January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"],
      "dial.label": "minutes of stillness",
      "settings.title": "Settings",
      "setting.gong": "Gong", "setting.strikes": "Number of bells",
      "setting.interval": "Interval bell", "setting.ambient": "Ambience",
      "setting.prep": "Preparation", "setting.lang": "Language",
      "setting.duration": "Duration", "setting.volume": "Volume", "setting.sleep": "Sleep timer",
      "strikes.start": "Start", "strikes.mid": "During", "strikes.end": "End",
      "chip.off": "Off", "chip.none": "None", "chip.direct": "Now",
      "gong.bowl": "Singing bowl", "gong.real": "Real bowl", "gong.gong": "Deep gong",
      "gong.bowl-small": "Bright bowl", "gong.bowl-large": "Deep bowl", "gong.bowl-warm": "Warm bowl",
      "gong.crystal": "Crystal", "gong.bells": "Chimes",
      "gong.custom": "Custom",
      "setting.gap": "Bell spacing",
      "custom.none": "No custom sound yet — record one or choose an audio file.",
      "custom.saved": (name, s) => `${name} · ${s} s`,
      "custom.recname": n => `Recording ${n}`,
      "custom.record": "● Record",
      "custom.starting": "Starting…",
      "custom.saving": "Saving…",
      "custom.choose": "Choose file",
      "custom.rename": "Rename",
      "custom.delete": "Delete",
      "custom.play": "▶ Listen",
      "custom.trimreset": "Reset trim",
      "custom.trimhint": "drag the edges to trim",
      "custom.error.mic": "Microphone unavailable — please allow microphone access.",
      "custom.error.decode": "This file could not be played.",
      "amb.rain": "Rain", "amb.ocean": "Ocean", "amb.wind": "Wind", "amb.noise": "Noise",
      "btn.start.meditation": "Begin meditation",
      "summary.bells": "bells",
      "summary.every": n => `every ${n} min`,
      "breath.title": "Breathe",
      "breath.sub": "Settle down with a guided breath.",
      "tech.box.name": "Box breathing",
      "tech.box.desc": "An even, square rhythm for focus and calm.",
      "tech.478.name": "4-7-8",
      "tech.478.desc": "Deeply relaxing, lovely before sleep.",
      "tech.coherent.name": "Coherent",
      "tech.coherent.desc": "Calm, balanced inhaling and exhaling.",
      "tech.calm.name": "Calming",
      "tech.calm.desc": "A longer exhale invites relaxation.",
      "btn.start.breath": "Begin exercise",
      "sounds.title": "Sounds",
      "sounds.sub": "Ambience to drift away or focus.",
      "sound.rain": "Rain", "sound.ocean": "Ocean",
      "sound.wind": "Wind", "sound.noise": "Deep noise",
      "sound.silent": "quiet", "sound.playing": "playing",
      "progress.title": "Progress",
      "stat.streak": "day streak", "stat.minutes": "total minutes",
      "stat.sessions": "sessions", "stat.best": "longest streak",
      "card.week": "This week", "card.milestones": "Milestones", "card.recent": "Recent sessions",
      "progress.empty.sub": "Every minute of stillness counts.",
      "progress.streak.sub": n => `${n} days in a row — well done.`,
      "progress.minutes.sub": n => `${n} minutes of stillness collected.`,
      "sessions.empty": "No sessions yet — your first moment of stillness awaits.",
      "type.meditatie": "Meditation", "type.adem": "Breathing",
      "ms.s1": "First step", "ms.s10": "10 sessions", "ms.s50": "50 sessions",
      "ms.d3": "3-day streak", "ms.d7": "7-day streak", "ms.d30": "30-day streak",
      "ms.m60": "1 hour of stillness", "ms.m300": "5 hours of stillness", "ms.m1440": "24 hours of stillness",
      "session.prepare": "Get ready",
      "session.startsIn": n => `starting in ${n}`,
      "session.paused": "Paused",
      "phase.in": "Breathe in", "phase.hold": "Hold",
      "phase.out": "Breathe out", "phase.rest": "Rest",
      "done.title": "Well done",
      "done.minutes": (n, mode) =>
        `${n} ${n === 1 ? "minute" : "minutes"} of ${mode === "adem" ? "breathing" : "stillness"}`,
      "done.session": n => `session ${n}`,
      "done.streak": n => `${n} days in a row`,
      "btn.done": "Done",
      "hint.ios": svg => "Add Stilte to your Home Screen for the full app experience: " +
        "in Safari tap " + svg + " <strong>Share</strong> and choose " +
        "<strong>‘Add to Home Screen’</strong>.",
      "hint.install": "Install Stilte as an app — it works offline and full screen.",
      "btn.install": "Install", "btn.notnow": "Not now"
    }
  };

  let lang = "nl";

  function t(key, ...args) {
    const v = STR[lang][key] ?? STR.nl[key] ?? key;
    return typeof v === "function" ? v(...args) : v;
  }

  function apply() {
    document.documentElement.lang = lang;
    document.querySelectorAll("[data-i18n]").forEach(el => {
      el.textContent = t(el.dataset.i18n);
    });
  }

  function setLang(l) {
    lang = STR[l] ? l : "nl";
    apply();
  }

  function current() { return lang; }

  return { t, setLang, current, apply };
})();
