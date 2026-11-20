// ===== Mathinik Quest — sound =====
// Original chiptune background music and sound effects, generated live with the Web Audio API
// (no audio files, so it also works offline). Players choose music on/off and sound effects on/off;
// both choices are remembered on this device.

const soundPref = (key, fallback) => { try { const v = localStorage.getItem(key); return v === null ? fallback : v; } catch (e) { return fallback; } };
const soundSave = (key, value) => { try { localStorage.setItem(key, value); } catch (e) {} };
let musicOn = soundPref("iq_music", "off") === "on";
let sfxEnabled = soundPref("iq_sfx", "on") === "on";

const Sound = (() => {
  let ctx = null, master, musicGain, sfxGain, timer = null, step = 0, nextTime = 0, noiseBuf = null;
  const mtof = m => 440 * Math.pow(2, (m - 69) / 12);

  function ensure() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      ctx = new AC();
      master = ctx.createGain(); master.gain.value = 0.9; master.connect(ctx.destination);
      musicGain = ctx.createGain(); musicGain.gain.value = 0.11; musicGain.connect(master);
      sfxGain = ctx.createGain(); sfxGain.gain.value = 0.25; sfxGain.connect(master);
    }
    if (ctx.state === "suspended") ctx.resume();
    return true;
  }
  function tone(dest, type, freq, t, dur, vol, slideTo) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(dest); o.start(t); o.stop(t + dur + 0.02);
  }
  function hat(t) {
    if (!noiseBuf) {
      noiseBuf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.05), ctx.sampleRate);
      const d = noiseBuf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    const s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    s.buffer = noiseBuf; f.type = "highpass"; f.frequency.value = 7000;
    g.gain.setValueAtTime(0.22, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.04);
    s.connect(f); f.connect(g); g.connect(musicGain); s.start(t);
  }

  // --- Original 8-bar loop in C major, 112 BPM, counted in eighth notes ---
  const BPM = 112, EIGHTH = 60 / BPM / 2;
  const CHORDS = [
    { root: 36, arp: [60, 64, 67, 72] }, // C
    { root: 45, arp: [57, 60, 64, 69] }, // Am
    { root: 41, arp: [53, 57, 60, 65] }, // F
    { root: 43, arp: [55, 59, 62, 67] }, // G
    { root: 36, arp: [60, 64, 67, 72] }, // C
    { root: 45, arp: [57, 60, 64, 69] }, // Am
    { root: 38, arp: [50, 53, 57, 62] }, // Dm
    { root: 43, arp: [55, 59, 62, 67] }  // G
  ];
  const _ = null;
  const MELODY = [
    76, _, 79, _, 81, 79, 76, _,
    72, _, 76, _, 74, 72, 69, _,
    72, _, 77, _, 81, _, 79, 77,
    79, _, 74, _, 71, 74, 79, _,
    84, _, 81, _, 79, _, 76, 79,
    81, _, 79, 76, 72, _, 76, _,
    74, _, 77, _, 81, 79, 77, 74,
    79, _, 74, _, 71, _, 74, _
  ];

  function schedule() {
    if (nextTime < ctx.currentTime - 0.2) nextTime = ctx.currentTime + 0.05; // skip ahead after a pause
    while (nextTime < ctx.currentTime + 0.12) {
      const bar = Math.floor(step / 8) % 8, s = step % 8, c = CHORDS[bar], t = nextTime;
      if (s === 0 || s === 4) tone(musicGain, "sine", 150, t, 0.12, 0.55, 45);               // kick
      if (s % 2 === 1) hat(t);                                                                   // hi-hat
      if (s % 2 === 0) tone(musicGain, "square", mtof(s % 4 === 0 ? c.root : c.root + 12), t, EIGHTH * 1.6, 0.16); // bass
      tone(musicGain, "triangle", mtof(c.arp[s % 4]), t, EIGHTH * 0.9, 0.12);                   // arpeggio
      const m = MELODY[step % 64];
      if (m) tone(musicGain, "square", mtof(m), t, EIGHTH * 1.8, 0.12);                         // melody
      step++; nextTime += EIGHTH;
    }
  }

  return {
    startMusic() {
      if (!ensure() || timer) return;
      step = 0; nextTime = ctx.currentTime + 0.05;
      timer = setInterval(schedule, 25);
    },
    stopMusic() { if (timer) { clearInterval(timer); timer = null; } },
    pause(hidden) {
      if (!ctx) return;
      if (hidden) ctx.suspend(); else if (musicOn || sfxEnabled) ctx.resume();
    },
    sfx(name, n) {
      if (!sfxEnabled || !ensure()) return;
      const t = ctx.currentTime, g = sfxGain, seq = (notes, gap, dur, type = "square", vol = 0.2) =>
        notes.forEach((m, i) => tone(g, type, mtof(m), t + i * gap, dur, vol));
      switch (name) {
        case "click": tone(g, "square", 660, t, 0.06, 0.18); break;
        case "select": tone(g, "square", mtof(70 + Math.min(n || 1, 12) * 2), t, 0.09, 0.2); break;
        case "deselect": tone(g, "square", 330, t, 0.08, 0.14, 220); break;
        case "success": seq([72, 76, 79, 84, 88].slice(0, Math.min(5, (n || 2) + 1)), 0.06, 0.12); break;
        case "correct": seq([76, 84], 0.08, 0.14); break;
        case "wrong": tone(g, "sawtooth", 196, t, 0.25, 0.16, 110); break;
        case "hit": tone(g, "square", 880, t, 0.07, 0.16, 330); tone(g, "triangle", 130, t, 0.16, 0.4, 50); break;
        case "whoosh": tone(g, "sawtooth", 160, t, 0.4, 0.1, 1600); tone(g, "triangle", 300, t + 0.1, 0.3, 0.12, 1200); break;
        case "hurt": tone(g, "sawtooth", 220, t, 0.3, 0.18, 80); break;
        case "roar": tone(g, "sawtooth", 110, t, 0.45, 0.16, 55); tone(g, "square", 165, t + 0.05, 0.35, 0.08, 70); tone(g, "sawtooth", 140, t + 0.12, 0.35, 0.1, 1400); break;
        case "ko": seq([84, 79, 76, 72, 67], 0.06, 0.1, "square", 0.17); break;
        case "storm": tone(g, "sawtooth", 110, t, 0.4, 0.14, 440); break;
        case "levelup": seq([72, 76, 79, 84, 88], 0.06, 0.12); break;
        case "win": seq([72, 76, 79, 84, 79, 84], 0.1, 0.16, "square", 0.2); break;
        case "lose": seq([67, 64, 60, 55], 0.16, 0.25, "triangle", 0.28); break;
      }
    }
  };
})();

// --- Settings: top-bar buttons and the first-visit choice ---
function updateSoundButtons() {
  const m = document.getElementById("musicBtn"), s = document.getElementById("sfxBtn");
  if (m) { m.classList.toggle("off", !musicOn); m.setAttribute("aria-pressed", String(musicOn)); m.title = musicOn ? "Music on (tap to turn off)" : "Music off (tap to turn on)"; }
  if (s) { s.textContent = sfxEnabled ? "🔊" : "🔈"; s.classList.toggle("off", !sfxEnabled); s.setAttribute("aria-pressed", String(sfxEnabled)); s.title = sfxEnabled ? "Sound effects on" : "Sound effects off"; }
}
function setMusic(on) { musicOn = on; soundSave("iq_music", on ? "on" : "off"); on ? Sound.startMusic() : Sound.stopMusic(); updateSoundButtons(); }
function setSfx(on) { sfxEnabled = on; soundSave("iq_sfx", on ? "on" : "off"); updateSoundButtons(); }

(function initSound() {
  const byId = id => document.getElementById(id);
  updateSoundButtons();
  byId("musicBtn").onclick = () => setMusic(!musicOn);
  byId("sfxBtn").onclick = () => { setSfx(!sfxEnabled); Sound.sfx("click"); };
  const choose = withMusic => { setSfx(byId("sfxCheck").checked); setMusic(withMusic); byId("soundModal").classList.add("hidden"); Sound.sfx("click"); };
  byId("withMusic").onclick = () => choose(true);
  byId("noMusic").onclick = () => choose(false);
  if (soundPref("iq_music", null) === null) {
    byId("soundModal").classList.remove("hidden");      // first visit: ask
  } else if (musicOn) {
    // Browsers only allow audio after a tap, so start the remembered music on the first tap.
    const kick = () => { Sound.startMusic(); window.removeEventListener("pointerdown", kick); };
    window.addEventListener("pointerdown", kick);
  }
  document.addEventListener("visibilitychange", () => Sound.pause(document.hidden));
})();
