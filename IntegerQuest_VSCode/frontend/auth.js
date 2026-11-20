// ===== Mathinik Quest — login and role dashboards =====
// Everyone logs in first. What they can open depends on their role:
//   student → the game (Adventure, Number Trail, Free Practice, Learning Check, My Progress)
//   teacher → Teacher dashboard: own students, their results, add students, reset passwords
//   admin   → Admin dashboard: every account and every class
// Loaded before app.js; buttons are wired up on DOMContentLoaded (after every script has run).

let authToken = null, authUser = null, loginRole = "student";
(function restoreLogin() {
  try {
    const saved = JSON.parse(localStorage.getItem("iq_auth") || "null");
    if (saved && saved.token && saved.user) { authToken = saved.token; authUser = saved.user; }
  } catch (e) {}
})();

// Grade 7 sections offered in every "Section" drop-down. Keep this list the same as SECTIONS in backend/server.js.
const SECTIONS = ["Narra", "Acacia", "Mahogany"];
// Until a section is picked, the drop-down looks like the grey placeholder text in the other boxes.
const markEmptySection = sel => sel.classList.toggle("is-empty", !sel.value);
function fillSectionSelects() {
  document.querySelectorAll("select[data-sections]").forEach(sel => {
    sel.innerHTML = `<option value="">Choose a section</option>` + SECTIONS.map(s => `<option value="${s}">${s}</option>`).join("");
    sel.addEventListener("change", () => markEmptySection(sel));
    markEmptySection(sel);
  });
  // form.reset() puts the drop-down back on "Choose a section"; grey it again afterwards.
  document.addEventListener("reset", e => setTimeout(() => e.target.querySelectorAll("select[data-sections]").forEach(markEmptySection)));
}

const ROLE_HOME = { student: "home", teacher: "teacher", admin: "admin" };
const ROLE_SCREENS = {
  student: ["home", "map", "story", "lesson", "puzzle", "setup", "game", "result", "assessment", "myprogress", "account", "profile"],
  teacher: ["teacher", "account", "profile"],
  admin: ["admin", "account", "profile"]
};
const ROLE_LABEL = { student: "Student", teacher: "Teacher", admin: "Admin" };
const ROLE_ICON = { student: "🎒", teacher: "🍎", admin: "🛡️" };
const LOGIN_HELP = {
  student: "Ask your teacher for your username and password.",
  teacher: "Your teacher account is created by the school admin.",
  admin: "The first admin account is shown in the server window the first time the server starts."
};

function canSee(id) { return authUser ? (ROLE_SCREENS[authUser.role] || []).includes(id) : id === "login"; }
function roleHome() { return authUser ? ROLE_HOME[authUser.role] || "login" : "login"; }
function userTag() { return authUser ? "u_" + authUser.id : null; }

// --- Talking to the server ---
async function api(path, opts = {}) {
  const headers = { "Content-Type": "application/json" };
  if (authToken) headers.Authorization = "Bearer " + authToken;
  const res = await fetch(path, { method: opts.method || "GET", headers, body: opts.body ? JSON.stringify(opts.body) : undefined });
  let data = null;
  try { data = await res.json(); } catch (e) {}
  if (res.status === 401 && authToken && !opts.keepLogin) logout(true, "Your session has ended. Please log in again.");
  if (!res.ok) { const err = new Error((data && data.error) || "Something went wrong. Please try again."); err.status = res.status; throw err; }
  return data;
}
const offlineMsg = e => e && e.status ? e.message : "Can't reach the server. Check the connection and try again.";

// --- Small formatting helpers ---
const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const pctText = v => v == null ? "—" : Math.round(v) + "%";
function whenText(iso) {
  if (!iso) return "Never";
  const d = new Date(iso);
  return isNaN(d) ? "—" : d.toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}
function pctClass(v) { return v == null ? "" : v >= 75 ? "good" : v >= 50 ? "mid" : "low"; }
function setMsg(id, text, kind) { const el = $(id); if (!el) return; el.textContent = text || ""; el.className = "form-msg " + (kind || ""); }
function sessionRowsHtml(rows, showUser) {
  if (!rows.length) return `<p class="empty">No games played yet.</p>`;
  return rows.map(r => {
    const pct = r.total_questions ? Math.round(r.score / (r.total_questions * 10) * 100) : 0, type = r.type || "Practice";
    return `<div class="session-row">
      <div class="sr-main"><b>${esc(r.player_name)}</b>${showUser && r.username ? ` <span class="muted tiny">@${esc(r.username)}</span>` : ""}
        <span class="type-badge ${esc(type.replace(/\W/g, "").toLowerCase())}">${esc(type)}</span><br>
        <span class="muted">${esc(r.topic)} • ${esc(r.difficulty)}${r.mode === "Team" ? " • Team" : ""} • ${whenText(r.created_at)}</span></div>
      <span class="sr-score ${pctClass(pct)}">${r.score}/${r.total_questions * 10}<small>${pct}%</small></span></div>`;
  }).join("");
}

// --- Log in / log out ---
function saveLogin() { try { localStorage.setItem("iq_auth", JSON.stringify({ token: authToken, user: authUser })); } catch (e) {} }
// The login card has three views: log in, create an account, forgot password. The role tabs apply to all three.
let authMode = "login";
const REGISTER_INTRO = {
  student: "Type the class code your teacher gives you to join their class. No code yet? Leave it blank — your teacher or the admin can add you to a class later.",
  teacher: "After you sign up, an admin has to approve your account before you can log in.",
  admin: "Admin accounts can only be created by another admin, from the Admin dashboard."
};
const FORGOT_INTRO = {
  student: "Your teacher will see your request on their dashboard and give you a new password.",
  teacher: "An admin will see your request on their dashboard and give you a new password.",
  admin: "Another admin can set a new password for you. If you are the only admin, run  npm run reset-password -- admin NEWPASSWORD  in the backend folder on the server computer."
};
function chooseLoginRole(role) {
  loginRole = role;
  document.querySelectorAll("[data-role]").forEach(b => { b.classList.toggle("chosen", b.dataset.role === role); b.setAttribute("aria-selected", String(b.dataset.role === role)); });
  $("loginHelp").textContent = LOGIN_HELP[role];
  setAuthMode(authMode);
}
function setAuthMode(mode) {
  authMode = mode;
  $("loginForm").classList.toggle("hidden", mode !== "login");
  $("registerForm").classList.toggle("hidden", mode !== "register");
  $("forgotForm").classList.toggle("hidden", mode !== "forgot");
  const label = ROLE_LABEL[loginRole];
  $("loginTitle").textContent = mode === "register" ? `Create a ${label.toLowerCase()} account` : mode === "forgot" ? "Forgot your password?" : `${label} log in`;
  $("toRegister").classList.toggle("hidden", loginRole === "admin");
  $("regIntro").textContent = REGISTER_INTRO[loginRole];
  $("regFields").classList.toggle("hidden", loginRole === "admin");
  $("regCodeWrap").classList.toggle("hidden", loginRole !== "student");
  $("forgotIntro").textContent = FORGOT_INTRO[loginRole];
  ["loginError", "regMsg", "forgotMsg"].forEach(id => setMsg(id, ""));
}
async function doRegister(e) {
  e.preventDefault();
  if (loginRole === "admin") return;
  const body = {
    role: loginRole, name: $("regName").value, username: $("regUser").value, password: $("regPass").value,
    confirm: $("regConfirm").value, classCode: $("regCode").value, section: $("regSection").value
  };
  if (!body.name.trim() || !body.username.trim() || !body.password) { setMsg("regMsg", "Fill in your name, a username and a password.", "bad"); return; }
  if (body.password !== body.confirm) { setMsg("regMsg", "The two passwords do not match.", "bad"); return; }
  $("regBtn").disabled = true;
  try {
    const data = await api("/api/auth/register", { method: "POST", body });
    $("registerForm").reset();
    if (data.token) { // student: logged in straight away
      authToken = data.token; authUser = data.user; saveLogin();
      if (typeof Sound !== "undefined") Sound.sfx("levelup");
      applyUser();
      await syncProgressFromServer();
      showScreen(roleHome());
    } else {          // teacher: waits for approval
      $("loginUser").value = body.username.trim().toLowerCase();
      setAuthMode("login");
      setMsg("loginError", data.message, "good");
    }
  } catch (err) { setMsg("regMsg", offlineMsg(err), "bad"); }
  finally { $("regBtn").disabled = false; }
}
async function doForgot(e) {
  e.preventDefault();
  const username = $("forgotUser").value.trim();
  if (!username) { setMsg("forgotMsg", "Type your username.", "bad"); return; }
  $("forgotBtn").disabled = true;
  try {
    const data = await api("/api/auth/forgot", { method: "POST", body: { username, role: loginRole } });
    setMsg("forgotMsg", data.message, "good");
    $("forgotUser").value = "";
  } catch (err) { setMsg("forgotMsg", offlineMsg(err), "bad"); }
  finally { $("forgotBtn").disabled = false; }
}
async function doLogin(e) {
  e.preventDefault();
  const username = $("loginUser").value.trim(), password = $("loginPass").value;
  if (!username || !password) { setMsg("loginError", "Enter your username and password.", "bad"); return; }
  $("loginBtn").disabled = true; $("loginBtn").textContent = "LOGGING IN…";
  try {
    const data = await api("/api/auth/login", { method: "POST", body: { username, password, role: loginRole } });
    authToken = data.token; authUser = data.user; saveLogin();
    $("loginPass").value = ""; setMsg("loginError", "");
    if (typeof Sound !== "undefined") Sound.sfx("success", 3);
    applyUser();
    if (authUser.role === "student") { await syncProgressFromServer(); if (typeof syncQueue === "function") syncQueue(); }
    showScreen(roleHome());
  } catch (err) {
    setMsg("loginError", offlineMsg(err), "bad");
  } finally {
    $("loginBtn").disabled = false; $("loginBtn").textContent = "LOG IN";
  }
}
function logout(expired, message) {
  if (typeof setAuthMode === "function") setAuthMode("login");
  if (!expired && authToken) api("/api/auth/logout", { method: "POST", keepLogin: true }).catch(() => {});
  authToken = null; authUser = null;
  try { localStorage.removeItem("iq_auth"); } catch (e) {}
  applyUser();
  showScreen("login");
  if (message) setMsg("loginError", message, "bad");
}
function applyUser() {
  const u = authUser;
  document.body.dataset.role = u ? u.role : "guest";
  $("userChip").classList.toggle("hidden", !u);
  if (!u) return;
  $("userName").textContent = u.name;
  $("userRole").textContent = ROLE_LABEL[u.role] + (u.section ? " · " + u.section : "");
  renderBadge();
  loadOwnPfp();
  if (u.role === "student") { $("playerName").value = u.name; $("welcomeName").textContent = u.name; }
}

// --- Profile pictures ---
// Shown as a round photo; without one, a coloured circle with the person's initials.
const pfpCache = new Map(); // account id -> { at, url }
const PFP_COLORS = ["#4f46e5", "#0891b2", "#16a34a", "#d97706", "#db2777", "#7c3aed", "#0d9488", "#dc2626"];
const initials = name => String(name || "?").trim().split(/\s+/).slice(0, 2).map(w => w[0]).join("").toUpperCase() || "?";
function pfpHtml(u, cls) {
  const color = PFP_COLORS[[...String(u.username || u.name || "")].reduce((a, ch) => a + ch.charCodeAt(0), 0) % PFP_COLORS.length];
  const c = pfpCache.get(u.id), img = c && u.avatarAt && c.at === u.avatarAt ? `<img src="${c.url}" alt="">` : "";
  return `<span class="pfp ${cls || ""}" data-pfp="${esc(u.id)}" data-at="${esc(u.avatarAt || "")}" style="--pfp-bg:${color}">${img || esc(initials(u.name))}</span>`;
}
// Fetches the pictures for every [data-pfp] circle inside root (only those the server lets this account see).
async function fillPfps(root) {
  const els = [...root.querySelectorAll("[data-pfp]")].filter(e => e.dataset.at);
  const atOf = id => els.find(e => e.dataset.pfp === id).dataset.at;
  const need = [...new Set(els.map(e => e.dataset.pfp))].filter(id => { const c = pfpCache.get(id); return !c || c.at !== atOf(id); });
  if (need.length) {
    try { const got = await api("/api/avatars?ids=" + need.join(",")); need.forEach(id => { if (got[id]) pfpCache.set(id, { at: atOf(id), url: got[id] }); }); }
    catch (e) { return; }
  }
  els.forEach(e => { const c = pfpCache.get(e.dataset.pfp); if (c && c.at === e.dataset.at) e.innerHTML = `<img src="${c.url}" alt="">`; });
}
// Your own picture is also kept on this device so the top bar shows it offline.
function ownPfp() {
  if (!authUser || !authUser.avatarAt) return null;
  const c = pfpCache.get(authUser.id);
  if (c && c.at === authUser.avatarAt) return c.url;
  try { const s = JSON.parse(localStorage.getItem("iq_pfp") || "null"); if (s && s.id === authUser.id && s.at === authUser.avatarAt) { pfpCache.set(s.id, { at: s.at, url: s.url }); return s.url; } } catch (e) {}
  return null;
}
function rememberOwnPfp(url) {
  pfpCache.set(authUser.id, { at: authUser.avatarAt, url });
  try { localStorage.setItem("iq_pfp", JSON.stringify({ id: authUser.id, at: authUser.avatarAt, url })); } catch (e) {}
}
function renderBadge() {
  if (!authUser) return;
  const url = ownPfp(), b = $("userBadge");
  b.classList.toggle("has-photo", !!url);
  if (url) b.innerHTML = `<img src="${url}" alt="">`; else b.textContent = authUser.role === "student" ? avatar : ROLE_ICON[authUser.role];
}
async function loadOwnPfp() {
  if (!authUser || !authUser.avatarAt || ownPfp()) return;
  try { const got = await api("/api/avatars?ids=" + authUser.id); if (got[authUser.id]) { rememberOwnPfp(got[authUser.id]); renderBadge(); if ($("account").classList.contains("active")) renderAccount(); if ($("profile").classList.contains("active")) renderProfile(true); } } catch (e) {}
}
// Crops the photo to a square in the middle and shrinks it to 256×256 before upload (about 20–40 KB).
function shrinkImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file), img = new Image();
    img.onload = () => {
      const side = Math.min(img.naturalWidth, img.naturalHeight), c = document.createElement("canvas");
      c.width = c.height = 256;
      const ctx = c.getContext("2d");
      ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, 256, 256); // transparent PNGs get a white background
      ctx.drawImage(img, (img.naturalWidth - side) / 2, (img.naturalHeight - side) / 2, side, side, 0, 0, 256, 256);
      URL.revokeObjectURL(url);
      resolve(c.toDataURL("image/jpeg", 0.85));
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("unreadable")); };
    img.src = url;
  });
}
async function uploadPfp() {
  const file = $("pfpFile").files[0];
  $("pfpFile").value = "";
  if (!file) return;
  if (!/^image\/(png|jpeg|webp)$/.test(file.type)) { setMsg("pfpMsg", "Please choose a JPG, PNG or WebP picture.", "bad"); return; }
  if (file.size > 15 * 1024 * 1024) { setMsg("pfpMsg", "That file is very large. Please choose a picture under 15 MB.", "bad"); return; }
  setMsg("pfpMsg", "Uploading…");
  try {
    const image = await shrinkImage(file);
    if (profileTarget) { // teacher uploading for a student
      const d = await api(`/api/users/${profileTarget.id}/avatar`, { method: "PUT", body: { image } });
      profileTarget.avatarAt = d.avatarAt; pfpCache.set(profileTarget.id, { at: d.avatarAt, url: d.image });
      renderProfile(true);
      setMsg("pfpMsg", `${profileTarget.name}'s new picture is saved.`, "good");
    } else {
      const d = await api("/api/me/avatar", { method: "PUT", body: { image } });
      authUser.avatarAt = d.avatarAt; saveLogin(); rememberOwnPfp(d.image);
      renderBadge(); renderProfile(true);
      setMsg("pfpMsg", "Your new profile picture is saved.", "good");
    }
    if (typeof Sound !== "undefined") Sound.sfx("success", 2);
  } catch (err) { setMsg("pfpMsg", err.message === "unreadable" ? "That picture could not be opened. Try another one." : offlineMsg(err), "bad"); }
}
async function removePfp() {
  if (profileTarget) { // teacher removing a student's picture
    if (!profileTarget.avatarAt || !confirm(`Remove ${profileTarget.name}'s profile picture?`)) return;
    try {
      await api(`/api/users/${profileTarget.id}/avatar`, { method: "DELETE" });
      profileTarget.avatarAt = null; pfpCache.delete(profileTarget.id);
      renderProfile(true);
      setMsg("pfpMsg", `${profileTarget.name}'s picture is removed.`, "good");
    } catch (err) { setMsg("pfpMsg", offlineMsg(err), "bad"); }
    return;
  }
  if (!authUser || !authUser.avatarAt || !confirm("Remove your profile picture?")) return;
  try {
    await api("/api/me/avatar", { method: "DELETE" });
    authUser.avatarAt = null; saveLogin(); pfpCache.delete(authUser.id);
    try { localStorage.removeItem("iq_pfp"); } catch (e) {}
    renderBadge(); renderProfile(true);
    setMsg("pfpMsg", "Profile picture removed.", "good");
  } catch (err) { setMsg("pfpMsg", offlineMsg(err), "bad"); }
}
// Teachers (own students) and admins (anyone) can take down an unsuitable picture.
function bindRemovePhoto(root, msgId, reload) {
  root.querySelectorAll("[data-rmpfp]").forEach(b => b.onclick = async () => {
    if (!confirm(`Remove the profile picture of ${b.dataset.name}?`)) return;
    try { await api(`/api/users/${b.dataset.rmpfp}/avatar`, { method: "DELETE" }); setMsg(msgId, `Removed ${b.dataset.name}'s picture.`, "good"); reload(); }
    catch (err) { setMsg(msgId, offlineMsg(err), "bad"); }
  });
}
const removePhotoBtn = u => u.avatarAt ? ` <button class="mini-btn" data-rmpfp="${esc(u.id)}" data-name="${esc(u.name)}">Remove photo</button>` : "";

// --- Student: progress saved to the account (so it follows the student to any device) ---
let progressTimer = null;
function writeLocalProgress(p) { try { localStorage.setItem(progressKey(), JSON.stringify(p)); } catch (e) {} }
function queueProgressSync() {
  if (!authUser || authUser.role !== "student") return;
  clearTimeout(progressTimer);
  progressTimer = setTimeout(pushProgress, 800);
}
async function pushProgress() {
  const p = loadProgress();
  try { writeLocalProgress(await api("/api/me/progress", { method: "PUT", body: { xp: p.xp, stars: p.stars, trailBest: p.trailBest || {} } })); } catch (e) {}
}
async function syncProgressFromServer() {
  // One-time move of progress saved under the old nickname system on this device.
  try {
    if (!localStorage.getItem(progressKey())) {
      const old = localStorage.getItem("iq_adv_" + authUser.name.toLowerCase());
      if (old) localStorage.setItem(progressKey(), old);
    }
  } catch (e) {}
  try {
    const server = await api("/api/me/progress");
    const local = loadProgress(), merged = { xp: Math.max(local.xp || 0, server.xp || 0), stars: { ...server.stars }, trailBest: { ...server.trailBest } };
    for (const [k, v] of Object.entries(local.stars || {})) merged.stars[k] = Math.max(merged.stars[k] || 0, v);
    for (const [k, v] of Object.entries(local.trailBest || {})) merged.trailBest[k] = Math.max(merged.trailBest[k] || 0, v);
    writeLocalProgress(merged);
    pushProgress();
  } catch (e) {} // offline: keep playing with what is on this device
}

// --- Student: My Progress ---
async function loadMyProgress() {
  const p = loadProgress(), stars = Object.values(p.stars || {}).reduce((a, b) => a + b, 0);
  const best = Math.max(0, ...Object.values(p.trailBest || {}));
  const statsHtml = (games, avg) => `
    <div class="stat"><small>Games played</small><b>${games}</b></div>
    <div class="stat accent"><small>Average score</small><b>${avg}</b></div>
    <div class="stat"><small>Adventure</small><b>⭐ ${stars}</b><span class="stat-sub">Level ${Math.floor((p.xp || 0) / 100) + 1} · ${p.xp || 0} XP</span></div>
    <div class="stat"><small>Number Trail best</small><b>${best || "—"}</b></div>`;
  $("myStats").innerHTML = statsHtml("—", "—");
  try {
    const [sum, rows] = await Promise.all([api("/api/summary"), api("/api/sessions")]);
    $("myStats").innerHTML = statsHtml(sum.sessions, sum.sessions ? pctText(sum.average_percent) : "—");
    const latest = t => rows.find(r => r.type === t);
    const pctOf = r => r ? Math.round(r.score / (r.total_questions * 10) * 100) : null;
    const pre = pctOf(latest("Pre-test")), post = pctOf(latest("Post-test"));
    $("myTests").innerHTML = `
      <div class="tc-box"><small>Pre-test</small><b class="${pctClass(pre)}">${pctText(pre)}</b></div>
      <span class="tc-arrow" aria-hidden="true">→</span>
      <div class="tc-box"><small>Post-test</small><b class="${pctClass(post)}">${pctText(post)}</b></div>
      <p class="tc-note">${pre != null && post != null ? (post > pre ? `🎉 You improved by ${post - pre} points!` : post === pre ? "Same score — keep practicing!" : "Keep practicing, then try the post-test again.") : "Take both checks on the Learning Check screen to see your growth."}</p>`;
    $("myGames").innerHTML = sessionRowsHtml(rows.slice(0, 30), false);
  } catch (err) {
    $("myGames").innerHTML = `<p class="empty">${esc(offlineMsg(err))}</p>`;
    $("myTests").innerHTML = "";
  }
}

// --- Teacher dashboard ---
function studentTableHtml(list, opts) {
  if (!list.length) return `<tbody><tr><td class="empty">${opts.empty}</td></tr></tbody>`;
  return `<thead><tr><th>Student</th>${opts.teacherCol ? "<th>Teacher</th>" : ""}<th>Games</th><th>Average</th><th>Pre-test</th><th>Post-test</th><th>Adventure</th><th>Last played</th><th></th></tr></thead><tbody>` +
    list.map(s => {
      const growth = s.prePercent != null && s.postPercent != null ? s.postPercent - s.prePercent : null;
      return `<tr>
        <td><div class="who">${pfpHtml(s)}<div><b>${esc(s.name)}</b><small>@${esc(s.username)}${s.section ? " · " + esc(s.section) : ""}</small></div></div></td>
        ${opts.teacherCol ? `<td>${opts.teacherCol(s)}</td>` : ""}
        <td>${s.games}</td>
        <td><span class="pct ${pctClass(s.averagePercent)}">${pctText(s.averagePercent)}</span></td>
        <td>${pctText(s.prePercent)}</td>
        <td>${pctText(s.postPercent)}${growth != null ? ` <span class="growth ${growth >= 0 ? "up" : "down"}">${growth >= 0 ? "+" : ""}${growth}</span>` : ""}</td>
        <td>⭐ ${s.stars}<small>${s.xp} XP</small></td>
        <td>${whenText(s.lastPlayed)}</td>
        <td class="actions">${opts.actions(s)}</td></tr>`;
    }).join("") + "</tbody>";
}
function classGrowth(list) {
  const both = list.filter(s => s.prePercent != null && s.postPercent != null);
  if (!both.length) return "—";
  const g = Math.round(both.reduce((a, s) => a + s.postPercent - s.prePercent, 0) / both.length);
  return (g >= 0 ? "+" : "") + g + " pts";
}
async function loadTeacher() {
  if (!authUser || authUser.role !== "teacher") return;
  $("teacherTitle").textContent = `${authUser.name}'s class`;
  setMsg("tMsg", "");
  try {
    const [students, sum, rows, requests, me] = await Promise.all([
      api("/api/teacher/students"), api("/api/summary"), api("/api/sessions"), api("/api/teacher/requests"), api("/api/auth/me")]);
    authUser = me.user; saveLogin();
    $("tClassCode").textContent = authUser.classCode || "——————";
    renderRequests(requests, { list: "tRequests", card: "tRequestsCard", count: "tReqCount", msg: "tMsg",
      resetUrl: r => `/api/teacher/students/${r.userId}`, dismissUrl: r => `/api/teacher/requests/${r.id}/dismiss`, reload: loadTeacher });
    $("tStudents").textContent = students.length;
    $("totalSessions").textContent = sum.sessions;
    $("averageScore").textContent = sum.sessions ? pctText(sum.average_percent) : "—";
    $("tGrowth").textContent = classGrowth(students);
    $("tCount").textContent = students.length ? `${students.length} student${students.length > 1 ? "s" : ""}` : "";
    $("studentTable").innerHTML = studentTableHtml(students, {
      empty: "No students yet. Add your first student below.",
      actions: s => `<button class="mini-btn primary-mini" data-edit="${esc(s.id)}">✏️ Edit</button> <button class="mini-btn" data-reset="${esc(s.id)}" data-name="${esc(s.name)}">Reset password</button>`
    });
    document.querySelectorAll("#studentTable [data-edit]").forEach(b => b.onclick = () => openStudentProfile(students.find(s => s.id === b.dataset.edit)));
    document.querySelectorAll("#studentTable [data-reset]").forEach(b => b.onclick = () => resetPassword(`/api/teacher/students/${b.dataset.reset}`, b.dataset.name, "tMsg"));
    bindRemovePhoto($("studentTable"), "tMsg", loadTeacher);
    fillPfps($("studentTable"));
    $("sessionList").innerHTML = sessionRowsHtml(rows.slice(0, 50), true);
  } catch (err) {
    $("sessionList").innerHTML = `<p class="empty">${esc(offlineMsg(err))}</p>`;
  }
}
async function resetPassword(url, name, msgId, onDone) {
  const pw = prompt(`New password for ${name} (at least 6 characters):`);
  if (pw === null) return;
  if (pw.length < 6) { setMsg(msgId, "The password needs at least 6 characters.", "bad"); return; }
  try {
    await api(url, { method: "PATCH", body: { password: pw } });
    setMsg(msgId, `Password changed for ${name}. Tell them the new password.`, "good");
    if (onDone) onDone();
  } catch (err) { setMsg(msgId, offlineMsg(err), "bad"); }
}
// "Forgot password?" requests, shown on the teacher and admin dashboards.
function renderRequests(list, o) {
  $(o.card).classList.toggle("hidden", !list.length);
  $(o.count).textContent = list.length ? `${list.length} waiting` : "";
  $(o.list).innerHTML = list.map(r => `<div class="request-row">
    <div><b>${esc(r.name)}</b> <span class="muted tiny">@${esc(r.username)} · ${ROLE_LABEL[r.role] || ""} · asked ${whenText(r.createdAt)}</span></div>
    <div class="actions"><button class="mini-btn primary-mini" data-rq-reset="${esc(r.id)}">Set new password</button>
      <button class="mini-btn" data-rq-dismiss="${esc(r.id)}">Dismiss</button></div></div>`).join("");
  const byId = id => list.find(r => r.id === id);
  document.querySelectorAll(`#${o.list} [data-rq-reset]`).forEach(b => b.onclick = () => {
    const r = byId(b.dataset.rqReset);
    resetPassword(o.resetUrl(r), r.name, o.msg, o.reload); // setting the password also closes the request
  });
  document.querySelectorAll(`#${o.list} [data-rq-dismiss]`).forEach(b => b.onclick = async () => {
    try { await api(o.dismissUrl(byId(b.dataset.rqDismiss)), { method: "POST" }); o.reload(); }
    catch (err) { setMsg(o.msg, offlineMsg(err), "bad"); }
  });
}
async function newClassCode() {
  if (!confirm("Make a new class code? The old code stops working. Students already in your class stay.")) return;
  try { const d = await api("/api/teacher/class-code", { method: "POST" }); authUser.classCode = d.classCode; saveLogin(); $("tClassCode").textContent = d.classCode; setMsg("tMsg", `New class code: ${d.classCode}`, "good"); }
  catch (err) { setMsg("tMsg", offlineMsg(err), "bad"); }
}
async function addStudent(e) {
  e.preventDefault();
  const body = { name: $("nsName").value, username: $("nsUser").value, password: $("nsPass").value, section: $("nsSection").value };
  try {
    const u = await api("/api/teacher/students", { method: "POST", body });
    setMsg("nsMsg", `Account created. Give ${u.name} the username “${u.username}” and the password you set.`, "good");
    $("addStudentForm").reset();
    loadTeacher();
  } catch (err) { setMsg("nsMsg", offlineMsg(err), "bad"); }
}

// --- Admin dashboard ---
let adminUsers = [], adminFilter = "all";
async function loadAdmin() {
  if (!authUser || authUser.role !== "admin") return;
  try {
    const [sum, list, rows, requests] = await Promise.all([api("/api/admin/summary"), api("/api/admin/users"), api("/api/sessions"), api("/api/admin/requests")]);
    adminUsers = list;
    renderRequests(requests, { list: "aRequests", card: "aRequestsCard", count: "aReqCount", msg: "aMsg",
      resetUrl: r => `/api/admin/users/${r.userId}`, dismissUrl: r => `/api/admin/requests/${r.id}/dismiss`, reload: loadAdmin });
    renderPending(list.filter(u => u.status === "pending"));
    $("aTeachers").textContent = sum.users.teacher;
    $("aStudents").textContent = sum.users.student;
    $("aGames").textContent = sum.sessions;
    $("aAverage").textContent = sum.sessions ? pctText(sum.average_percent) : "—";
    fillTeacherSelect($("nuTeacher"), "", "No teacher yet");
    renderAdminUsers();
    $("adminSessions").innerHTML = sessionRowsHtml(rows.slice(0, 50), true);
  } catch (err) {
    $("adminSessions").innerHTML = `<p class="empty">${esc(offlineMsg(err))}</p>`;
  }
}
// Teachers who signed up themselves wait here until an admin approves (or deletes) them.
function renderPending(list) {
  $("aPendingCard").classList.toggle("hidden", !list.length);
  $("aPendCount").textContent = list.length ? `${list.length} waiting` : "";
  $("aPending").innerHTML = list.map(u => `<div class="request-row">
    <div><b>${esc(u.name)}</b> <span class="muted tiny">@${esc(u.username)}${u.section ? " · " + esc(u.section) : ""} · signed up ${whenText(u.createdAt)}</span></div>
    <div class="actions"><button class="mini-btn primary-mini" data-approve="${esc(u.id)}">Approve</button>
      <button class="mini-btn danger" data-reject="${esc(u.id)}" data-name="${esc(u.name)}">Delete</button></div></div>`).join("");
  document.querySelectorAll("#aPending [data-approve]").forEach(b => b.onclick = async () => {
    try { await api(`/api/admin/users/${b.dataset.approve}`, { method: "PATCH", body: { status: "active" } }); setMsg("aMsg", "Teacher approved. They can log in now.", "good"); loadAdmin(); }
    catch (err) { setMsg("aMsg", offlineMsg(err), "bad"); }
  });
  document.querySelectorAll("#aPending [data-reject]").forEach(b => b.onclick = async () => {
    if (!confirm(`Delete the sign-up from ${b.dataset.name}?`)) return;
    try { await api(`/api/admin/users/${b.dataset.reject}`, { method: "DELETE" }); setMsg("aMsg", `Deleted the sign-up from ${b.dataset.name}.`, "good"); loadAdmin(); }
    catch (err) { setMsg("aMsg", offlineMsg(err), "bad"); }
  });
}
function fillTeacherSelect(sel, selected, noneLabel) {
  const teachers = adminUsers.filter(u => u.role === "teacher");
  sel.innerHTML = `<option value="">${esc(noneLabel)}</option>` + teachers.map(t => `<option value="${esc(t.id)}"${t.id === selected ? " selected" : ""}>${esc(t.name)}</option>`).join("");
}
function renderAdminUsers() {
  const q = $("userSearch").value.trim().toLowerCase();
  // Admin accounts are not listed or counted here (the school has one admin, managed from My account).
  const list = adminUsers.filter(u => u.role !== "admin" && (adminFilter === "all" || u.role === adminFilter) &&
    (!q || u.name.toLowerCase().includes(q) || u.username.includes(q) || (u.section || "").toLowerCase().includes(q)));
  const teacherOptions = sel => `<select class="assign" data-assign="ID" aria-label="Teacher">` +
    `<option value="">No teacher</option>` + adminUsers.filter(u => u.role === "teacher").map(t => `<option value="${esc(t.id)}"${t.id === sel ? " selected" : ""}>${esc(t.name)}</option>`).join("") + `</select>`;
  const actions = u => `<button class="mini-btn" data-areset="${esc(u.id)}" data-name="${esc(u.name)}">Reset password</button>` + removePhotoBtn(u) +
    (u.id === authUser.id ? "" : ` <button class="mini-btn danger" data-delete="${esc(u.id)}" data-name="${esc(u.name)}" data-urole="${esc(u.role)}">Delete</button>`);
  if (adminFilter === "student") {
    $("userTable").innerHTML = studentTableHtml(list, {
      empty: "No students match.", actions, teacherCol: s => teacherOptions(s.teacherId).replace("ID", esc(s.id))
    });
  } else {
    $("userTable").innerHTML = !list.length ? `<tbody><tr><td class="empty">No accounts match.</td></tr></tbody>` :
      `<thead><tr><th>Name</th><th>Role</th><th>Class / teacher</th><th>Last login</th><th></th></tr></thead><tbody>` +
      list.map(u => `<tr>
        <td><div class="who">${pfpHtml(u)}<div><b>${esc(u.name)}</b><small>@${esc(u.username)}${u.section ? " · " + esc(u.section) : ""}</small></div></div></td>
        <td><span class="role-badge ${esc(u.role)}">${ROLE_ICON[u.role]} ${ROLE_LABEL[u.role]}</span>${u.status === "pending" ? ` <span class="role-badge pending">⏳ Pending</span>` : ""}</td>
        <td>${u.role === "student" ? teacherOptions(u.teacherId).replace("ID", esc(u.id)) : u.role === "teacher" ? `${u.studentCount} student${u.studentCount === 1 ? "" : "s"}` : "—"}</td>
        <td>${whenText(u.lastLoginAt)}</td>
        <td class="actions">${actions(u)}</td></tr>`).join("") + "</tbody>";
  }
  $("uCount").textContent = `${list.length} account${list.length === 1 ? "" : "s"}`;
  bindRemovePhoto($("userTable"), "aMsg", loadAdmin);
  fillPfps($("userTable"));
  document.querySelectorAll("#userTable [data-areset]").forEach(b => b.onclick = () => resetPassword(`/api/admin/users/${b.dataset.areset}`, b.dataset.name, "aMsg"));
  document.querySelectorAll("#userTable [data-assign]").forEach(s => s.onchange = async () => {
    try { await api(`/api/admin/users/${s.dataset.assign}`, { method: "PATCH", body: { teacherId: s.value } }); setMsg("aMsg", "Teacher updated. Past games moved to the new teacher's reports.", "good"); loadAdmin(); }
    catch (err) { setMsg("aMsg", offlineMsg(err), "bad"); }
  });
  document.querySelectorAll("#userTable [data-delete]").forEach(b => b.onclick = async () => {
    const extra = b.dataset.urole === "teacher" ? " Their students will stay, without a teacher." : " Their past game records stay in the reports.";
    if (!confirm(`Delete the account for ${b.dataset.name}?${extra}`)) return;
    try { await api(`/api/admin/users/${b.dataset.delete}`, { method: "DELETE" }); setMsg("aMsg", `Deleted ${b.dataset.name}.`, "good"); loadAdmin(); }
    catch (err) { setMsg("aMsg", offlineMsg(err), "bad"); }
  });
}
async function createAccount(e) {
  e.preventDefault();
  const role = $("nuRole").value;
  const body = { role, name: $("nuName").value, username: $("nuUser").value, password: $("nuPass").value, section: $("nuSection").value, teacherId: role === "student" ? $("nuTeacher").value : "" };
  try {
    const u = await api("/api/admin/users", { method: "POST", body });
    setMsg("nuMsg", `${ROLE_LABEL[u.role]} account created for ${u.name} (username “${u.username}”).`, "good");
    $("newUserForm").reset(); $("nuTeacherWrap").classList.remove("hidden");
    loadAdmin();
  } catch (err) { setMsg("nuMsg", offlineMsg(err), "bad"); }
}

// --- My account (all roles) ---
function renderAccount() {
  if (!authUser) return;
  const u = authUser;
  ownPfp(); // puts your saved picture in the cache so pfpHtml can show it
  $("accountInfo").innerHTML = `<div class="acct">${pfpHtml(u, "pfp-md")}
    <div><b>${esc(u.name)}</b><small>@${esc(u.username)} · ${ROLE_LABEL[u.role]}${u.section ? " · " + esc(u.section) : ""}</small>
    <small>Last login: ${whenText(u.lastLoginAt)}</small></div></div>`;
  if (u.avatarAt && !ownPfp()) loadOwnPfp();
  setMsg("pwMsg", "");
}

// --- Edit profile: your own (all roles), or a teacher editing one of their students ---
// profileTarget = null → your own profile; a student object → the teacher is editing that student.
let profileTarget = null;
function openOwnProfile() { profileTarget = null; showScreen("profile"); }
function openStudentProfile(student) { profileTarget = { ...student }; showScreen("profile"); }
function renderProfile(keepMsg) {
  if (!authUser) return;
  const self = !profileTarget, u = profileTarget || authUser;
  if (self) ownPfp();
  $("profileTitle").textContent = self ? "Edit profile" : `Edit ${u.name}'s profile`;
  $("profileIntro").textContent = self
    ? "Change your photo and the name others see."
    : "Change this student's photo, name and section. The student sees the changes the next time they open the game.";
  $("profileBack").dataset.screen = self ? "account" : "teacher";
  $("profileBack").textContent = self ? "← My account" : "← My class";
  $("pfpPreview").outerHTML = pfpHtml(u, "pfp-big").replace('<span class="pfp', '<span id="pfpPreview" aria-hidden="true" class="pfp');
  if (!self) fillPfps($("profile"));
  $("pfpNote").textContent = (!self
    ? "Only the student, you and the admin can see it."
    : u.role === "student" ? "Only you, your teacher and the admin can see it."
    : u.role === "teacher" ? "Only you and the admin can see it." : "Only you and the other admins can see it.") +
    " Square photos look best; the picture is shrunk to 256 × 256 before it is saved.";
  $("pfpRemove").disabled = !u.avatarAt;
  if (self && u.avatarAt && !ownPfp()) loadOwnPfp();
  $("profName").value = u.name;
  $("profUser").value = "@" + u.username;
  $("profUserHint").textContent = self
    ? "Your username is how you log in, so it can't be changed here. Ask the admin if it needs to change."
    : "The username is how the student logs in, so it can't be changed here. Ask the admin if it needs to change.";
  // Only a teacher editing a student can change the section; a student sees their own section read-only.
  $("profSectionWrap").classList.toggle("hidden", self || u.role !== "student");
  $("profSectionView").classList.toggle("hidden", !(self && u.role === "student"));
  $("profSectionText").value = u.section || "Not set yet";
  const sel = $("profSection");
  // An older account may have a section that is not in today's list; keep it as a choice so it isn't lost.
  sel.querySelectorAll("option[data-legacy]").forEach(o => o.remove());
  if (u.section && !SECTIONS.includes(u.section)) sel.insertAdjacentHTML("beforeend", `<option value="${esc(u.section)}" data-legacy>${esc(u.section)}</option>`);
  sel.value = u.section || "";
  markEmptySection(sel);
  if (!keepMsg) { setMsg("profMsg", ""); setMsg("pfpMsg", ""); }
}
async function saveProfile(e) {
  e.preventDefault();
  const name = $("profName").value.trim();
  if (!name) { setMsg("profMsg", profileTarget ? "Please enter the student's name." : "Please enter your name.", "bad"); return; }
  const target = profileTarget || authUser;
  const body = { name };
  if (profileTarget && target.role === "student") body.section = $("profSection").value; // teachers only
  $("profSave").disabled = true;
  try {
    if (profileTarget) {
      const updated = await api(`/api/teacher/students/${profileTarget.id}`, { method: "PATCH", body });
      Object.assign(profileTarget, updated);
      renderProfile(true);
      setMsg("profMsg", `${updated.name}'s profile is saved.`, "good");
    } else {
      const d = await api("/api/me", { method: "PATCH", body });
      authUser = d.user; saveLogin(); applyUser();
      renderProfile(true);
      setMsg("profMsg", "Your profile is saved.", "good");
    }
    if (typeof Sound !== "undefined") Sound.sfx("success", 2);
  } catch (err) { setMsg("profMsg", offlineMsg(err), "bad"); }
  finally { $("profSave").disabled = false; }
}
async function changePassword(e) {
  e.preventDefault();
  const cur = $("pwCurrent").value, next = $("pwNew").value;
  if (next !== $("pwConfirm").value) { setMsg("pwMsg", "The new passwords do not match.", "bad"); return; }
  try { await api("/api/auth/password", { method: "POST", body: { currentPassword: cur, newPassword: next } }); $("pwForm").reset(); setMsg("pwMsg", "Password changed. Other devices have been logged out.", "good"); }
  catch (err) { setMsg("pwMsg", offlineMsg(err), "bad"); }
}

// --- Wire up the page ---
document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll("[data-role]").forEach(b => b.onclick = () => chooseLoginRole(b.dataset.role));
  fillSectionSelects();
  $("loginForm").onsubmit = doLogin;
  $("registerForm").onsubmit = doRegister;
  $("forgotForm").onsubmit = doForgot;
  document.querySelectorAll("[data-auth]").forEach(b => b.onclick = () => setAuthMode(b.dataset.auth));
  $("newCodeBtn").onclick = newClassCode;
  $("regCode").oninput = () => { const el = $("regCode"); el.value = el.value.toUpperCase(); };
  $("togglePass").onclick = () => { const p = $("loginPass"), show = p.type === "password"; p.type = show ? "text" : "password"; $("togglePass").textContent = show ? "Hide" : "Show"; };
  $("logoutBtn").onclick = () => logout(false);
  $("logoutBtn2").onclick = () => logout(false);
  $("accountBtn").onclick = () => showScreen("account");
  $("editProfileBtn").onclick = openOwnProfile;
  $("profileChip").onclick = openOwnProfile;
  $("profileForm").onsubmit = saveProfile;
  $("pwForm").onsubmit = changePassword;
  $("refreshTeacher").onclick = loadTeacher;
  $("addStudentForm").onsubmit = addStudent;
  $("refreshAdmin").onclick = loadAdmin;
  $("refreshMine").onclick = loadMyProgress;
  $("newUserForm").onsubmit = createAccount;
  $("nuRole").onchange = () => $("nuTeacherWrap").classList.toggle("hidden", $("nuRole").value !== "student");
  $("userSearch").oninput = renderAdminUsers;
  document.querySelectorAll("[data-ufilter]").forEach(b => b.onclick = () => {
    adminFilter = b.dataset.ufilter;
    document.querySelectorAll("[data-ufilter]").forEach(x => x.classList.toggle("chosen", x === b));
    renderAdminUsers();
  });
  document.querySelectorAll("[data-avatar]").forEach(b => b.addEventListener("click", renderBadge));
  $("pfpFile").onchange = uploadPfp;
  $("pfpRemove").onclick = removePfp;
  document.querySelector(".pfp-upload").onkeydown = e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); $("pfpFile").click(); } };
  chooseLoginRole("student");
  applyUser();
  showScreen(roleHome());
  if (authUser) {
    // Check the saved login is still valid (works offline too: then we keep the saved one).
    api("/api/auth/me").then(d => { authUser = d.user; saveLogin(); applyUser(); if (authUser.role === "student") syncProgressFromServer(); }).catch(() => {});
  }
});
