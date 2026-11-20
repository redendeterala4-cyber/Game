// ===== Mathinik Quest — Number Trail =====
// A tile-linking puzzle: build a trail of touching number tiles whose sum equals the target.
// Cleared tiles vanish, the tiles above fall down and new ones drop in from the top.
// Uses $, avatar, replayAnim and Sound from app.js / sound.js.

const TR_COLS = 6, TR_ROWS = 7;
const TR_LEVEL_POINTS = 250;
const trCfg = {
  Easy:      { neg: 0,    min: 2, max: 3, stormEvery: 6, stormCount: 7 },
  Average:   { neg: 0.35, min: 2, max: 4, stormEvery: 4, stormCount: 6 },
  Difficult: { neg: 0.5,  min: 3, max: 5, stormEvery: 3, stormCount: 5 }
};
let tr = null, trMode = "Average", trTileId = 0;

const trFmt = v => v < 0 ? "−" + Math.abs(v) : String(v);
const trCell = (c, r) => tr.grid[c][r];
const trAdj = (a, b) => Math.max(Math.abs(a.c - b.c), Math.abs(a.r - b.r)) === 1;
const trSum = () => tr.chain.reduce((a, p) => a + trCell(p.c, p.r).v, 0);

function trRand() {
  const c = trCfg[trMode], neg = c.neg ? Math.min(0.55, c.neg + 0.03 * (tr.level - 1)) : 0;
  const v = 1 + Math.floor(Math.random() * 9);
  return Math.random() < neg ? -v : v;
}
function trNewTile(fall) { return { id: ++trTileId, v: trRand(), gold: Math.random() < 1 / 12, storm: 0, fall: fall || 0 }; }

// The target always comes from a real trail on the board, so every round can be solved.
function trPickTarget() {
  const cfg = trCfg[trMode];
  tr.showHint = false;
  for (let tries = 0; tries < 80; tries++) {
    const len = cfg.min + Math.floor(Math.random() * (cfg.max - cfg.min + 1));
    let cur = { c: Math.floor(Math.random() * TR_COLS), r: Math.floor(Math.random() * TR_ROWS) };
    const path = [cur];
    while (path.length < len) {
      const opts = [];
      for (let dc = -1; dc <= 1; dc++) for (let dr = -1; dr <= 1; dr++) {
        const n = { c: cur.c + dc, r: cur.r + dr };
        if ((dc || dr) && n.c >= 0 && n.c < TR_COLS && n.r >= 0 && n.r < TR_ROWS && !path.some(p => p.c === n.c && p.r === n.r)) opts.push(n);
      }
      if (!opts.length) break;
      cur = opts[Math.floor(Math.random() * opts.length)];
      path.push(cur);
    }
    if (path.length < len) continue;
    const sum = path.reduce((a, p) => a + trCell(p.c, p.r).v, 0);
    if (sum === 0 && trMode !== "Difficult") continue;
    tr.target = sum; tr.solution = path;
    return;
  }
  tr.solution = [{ c: 0, r: 0 }, { c: 1, r: 0 }];
  tr.target = trCell(0, 0).v + trCell(1, 0).v;
}

function trShowIntro() {
  $("trailIntro").classList.remove("hidden");
  $("trailGame").classList.add("hidden");
  $("trailOver").classList.add("hidden");
  trUpdateBest();
}
// Best scores are part of the student's progress, so they are saved to their account.
function trGetBest() { return (loadProgress().trailBest || {})[trMode] || 0; }
function trUpdateBest() {
  const best = trGetBest();
  $("trailBest").textContent = best ? `Your best on ${trMode}: ${best} points` : `No ${trMode} score yet. Can you set one?`;
}

function trStart() {
  tr = { grid: [], chain: [], target: 0, solution: [], showHint: false, score: 0, hearts: 3, level: 1, hints: 3, chains: 0, longest: 0, busy: false };
  for (let c = 0; c < TR_COLS; c++) { tr.grid.push([]); for (let r = 0; r < TR_ROWS; r++) tr.grid[c].push(trNewTile(TR_ROWS)); }
  trPickTarget();
  $("trailIntro").classList.add("hidden");
  $("trailOver").classList.add("hidden");
  $("trailGame").classList.remove("hidden");
  trMsg("Find a trail that adds up to the target!", "");
  trRender();
}

function trMsg(text, kind) { $("trMsg").textContent = text; $("trMsg").className = "tr-msg " + (kind || ""); }

function trRender() {
  const sol = tr.showHint ? tr.solution : [];
  let html = "";
  for (let r = 0; r < TR_ROWS; r++) for (let c = 0; c < TR_COLS; c++) {
    const t = tr.grid[c][r], idx = tr.chain.findIndex(p => p.c === c && p.r === r);
    const hint = sol.some(p => p.c === c && p.r === r);
    const cls = ["tile", t.v < 0 ? "neg" : "pos", t.gold ? "gold" : "", t.storm ? "storm" : "", idx >= 0 ? "sel" : "", hint ? "hint" : "", t.fall ? "drop" : ""].filter(Boolean).join(" ");
    const label = `${t.v}${t.gold ? ", gold" : ""}${t.storm ? `, storm in ${t.storm}` : ""}${idx >= 0 ? `, selected ${idx + 1}` : ""}`;
    html += `<button class="${cls}" data-c="${c}" data-r="${r}" style="--fall:${t.fall}" aria-label="${label}">${trFmt(t.v)}${idx >= 0 ? `<i class="ord">${idx + 1}</i>` : ""}${t.storm ? `<i class="cd">⚡${t.storm}</i>` : ""}</button>`;
    t.fall = 0;
  }
  $("trBoard").innerHTML = html;
  document.querySelectorAll("#trBoard .tile").forEach(b => b.onclick = () => trTap(+b.dataset.c, +b.dataset.r));

  $("trHero").textContent = avatar;
  $("trHearts").textContent = "❤️".repeat(tr.hearts) + "🖤".repeat(3 - tr.hearts);
  $("trLevel").textContent = tr.level;
  $("trScore").textContent = tr.score;
  $("trTarget").textContent = trFmt(tr.target);
  $("trHint").textContent = `💡 Hint (${tr.hints})`;
  $("trHint").disabled = !tr.hints;

  const sum = trSum(), ok = tr.chain.length >= 2 && sum === tr.target;
  $("trExpr").innerHTML = tr.chain.length
    ? `${tr.chain.map(p => { const v = trCell(p.c, p.r).v; return v < 0 ? `(${trFmt(v)})` : trFmt(v); }).join(" + ")} = <b class="${ok ? "ok" : ""}">${trFmt(sum)}</b>`
    : "Tap tiles to build a trail";
  $("trSubmit").disabled = !ok || tr.busy;
}

function trTap(c, r) {
  if (!tr || tr.busy) return;
  const p = { c, r }, i = tr.chain.findIndex(q => q.c === c && q.r === r);
  if (i >= 0) { tr.chain = tr.chain.slice(0, i === tr.chain.length - 1 ? i : i + 1); Sound.sfx("deselect"); }   // tap last = undo, tap earlier = cut back
  else if (!tr.chain.length || trAdj(tr.chain[tr.chain.length - 1], p)) { tr.chain.push(p); Sound.sfx("select", tr.chain.length); }
  else { tr.chain = [p]; Sound.sfx("select", 1); }                                                          // not touching: start a new trail
  trRender();
}

function trSubmit() {
  const len = tr ? tr.chain.length : 0;
  if (!tr || tr.busy || len < 2 || trSum() !== tr.target) return;
  tr.busy = true;
  const tiles = tr.chain.map(p => trCell(p.c, p.r));
  const golds = tiles.filter(t => t.gold).length, defused = tiles.filter(t => t.storm).length;
  const pts = len * len * 5 * Math.pow(2, golds) + defused * 30;
  tr.score += pts; tr.chains++; tr.longest = Math.max(tr.longest, len);
  Sound.sfx("success", len);
  tr.chain.forEach(p => { const b = document.querySelector(`#trBoard .tile[data-c="${p.c}"][data-r="${p.r}"]`); if (b) b.classList.add("pop"); });
  trMsg(`+${pts} points${golds ? ` · gold ×${Math.pow(2, golds)}` : ""}${defused ? " · ⚡ storm cleared!" : ""}`, "good");
  $("trSubmit").disabled = true;
  setTimeout(trAfterSubmit, 280);
}

function trAfterSubmit() {
  // Remove the trail; tiles above fall down, new tiles drop in from the top.
  const removed = new Set(tr.chain.map(p => p.c + "," + p.r));
  tr.chain = [];
  for (let c = 0; c < TR_COLS; c++) {
    const keep = [];
    for (let r = 0; r < TR_ROWS; r++) if (!removed.has(c + "," + r)) keep.push({ t: tr.grid[c][r], r });
    const nNew = TR_ROWS - keep.length, col = [];
    for (let i = 0; i < nNew; i++) col.push(trNewTile(nNew));
    keep.forEach((k, i) => { k.t.fall = nNew + i - k.r; col.push(k.t); });
    tr.grid[c] = col;
  }
  // Storm tiles count down; one that reaches 0 strikes.
  let struck = 0;
  for (const col of tr.grid) for (const t of col) if (t.storm) { t.storm--; if (t.storm === 0) { struck++; t.v = trRand(); } }
  if (struck) {
    tr.hearts = Math.max(0, tr.hearts - struck);
    Sound.sfx("hurt");
    trMsg(`⚡ A storm tile struck! −${struck} ❤️`, "bad");
    replayAnim($("trailGame"), "shake");
  }
  // A new storm tile appears every few trails.
  const cfg = trCfg[trMode];
  if (tr.chains % cfg.stormEvery === 0) {
    const t = tr.grid[Math.floor(Math.random() * TR_COLS)][Math.floor(Math.random() * TR_ROWS)];
    if (!t.storm) { t.storm = cfg.stormCount; Sound.sfx("storm"); }
  }
  // Level up every 250 points and win back a heart.
  const lv = 1 + Math.floor(tr.score / TR_LEVEL_POINTS);
  if (lv > tr.level && tr.hearts > 0) {
    tr.level = lv; tr.hearts = Math.min(3, tr.hearts + 1);
    Sound.sfx("levelup");
    trMsg(`🎉 Level ${lv}! You won back a heart.`, "good");
  }
  tr.busy = false;
  if (tr.hearts === 0) { trRender(); tr.busy = true; setTimeout(trOver, 700); return; }
  trPickTarget();
  trRender();
}

function trOver() {
  const best = trGetBest();
  const isBest = tr.score > best;
  if (isBest) { const p = loadProgress(); p.trailBest = Object.assign({}, p.trailBest, { [trMode]: tr.score }); saveProgress(p); }
  $("trailGame").classList.add("hidden");
  $("trailOver").classList.remove("hidden");
  $("trOverTitle").textContent = isBest ? "New best score!" : "Great run!";
  $("trOverScore").textContent = `${tr.score} pts`;
  $("trOverDetail").textContent = `${trMode} • ${tr.chains} trails • longest trail: ${tr.longest} tiles • level ${tr.level} • best: ${Math.max(best, tr.score)}`;
  Sound.sfx(isBest ? "win" : "lose");
}

// --- Buttons ---
document.querySelectorAll("[data-trail]").forEach(b => b.onclick = () => {
  trMode = b.dataset.trail;
  document.querySelectorAll("[data-trail]").forEach(x => x.classList.toggle("chosen", x === b));
  trUpdateBest(); Sound.sfx("click");
});
$("trailStart").onclick = () => { Sound.sfx("click"); trStart(); };
$("trAgain").onclick = () => { Sound.sfx("click"); trStart(); };
$("trSubmit").onclick = trSubmit;
$("trClear").onclick = () => { if (!tr || tr.busy) return; tr.chain = []; Sound.sfx("deselect"); trRender(); };
$("trHint").onclick = () => {
  if (!tr || tr.busy || !tr.hints) return;
  tr.hints--; tr.chain = []; tr.showHint = true;
  Sound.sfx("click");
  trMsg("💡 The glowing tiles make the target. Link them in a trail!", "");
  trRender();
};
$("trEnd").onclick = () => { if (tr && !tr.busy) { tr.busy = true; trOver(); } };
