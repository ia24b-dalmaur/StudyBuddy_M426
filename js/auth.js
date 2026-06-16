// ── Auth helpers ──────────────────────────────────────────────────
function getCurrentUserEmail() {
    return sessionStorage.getItem("currentUser");
}

function isLoggedIn() {
    return getCurrentUserEmail() !== null;
}

function protectPage() {
    if (!isLoggedIn()) {
        window.location.href = "login.html";
    }
}

function logout() {
    sessionStorage.removeItem("currentUser");
    window.location.href = "login.html";
}

function getProfileKey() {
    return "profile_" + getCurrentUserEmail();
}

function getZeitenKey() {
    return "lernzeiten_" + getCurrentUserEmail();
}

// ── Multi-user support ────────────────────────────────────────────
function getAllUsers() {
    return JSON.parse(localStorage.getItem("users") || "[]");
}

function getUserByEmail(email) {
    return getAllUsers().find(u => u.email === email) || null;
}

function saveUser(user) {
    const users = getAllUsers();
    const idx = users.findIndex(u => u.email === user.email);
    if (idx >= 0) users[idx] = user;
    else users.push(user);
    localStorage.setItem("users", JSON.stringify(users));
}

// ── Requests / Anfragen ───────────────────────────────────────────
function getAnfragenKey() {
    return "anfragen";
}

function getAllAnfragen() {
    return JSON.parse(localStorage.getItem(getAnfragenKey()) || "[]");
}

function saveAnfragen(anfragen) {
    localStorage.setItem(getAnfragenKey(), JSON.stringify(anfragen));
}

function sendAnfrage(toEmail) {
    const fromEmail = getCurrentUserEmail();
    if (!fromEmail || fromEmail === toEmail) return false;
    const anfragen = getAllAnfragen();
    const exists = anfragen.find(a => a.from === fromEmail && a.to === toEmail);
    if (exists) return false;
    anfragen.push({ from: fromEmail, to: toEmail, status: "pending", timestamp: Date.now() });
    saveAnfragen(anfragen);
    return true;
}

function getEingangAnfragen() {
    const email = getCurrentUserEmail();
    return getAllAnfragen().filter(a => a.to === email);
}

function getAusgangAnfragen() {
    const email = getCurrentUserEmail();
    return getAllAnfragen().filter(a => a.from === email);
}

function getPendingCount() {
    return getEingangAnfragen().filter(a => a.status === "pending").length;
}

function updateAnfrageStatus(fromEmail, status) {
    const email = getCurrentUserEmail();
    const anfragen = getAllAnfragen();
    const idx = anfragen.findIndex(a => a.from === fromEmail && a.to === email);
    if (idx >= 0) { anfragen[idx].status = status; saveAnfragen(anfragen); }
}

// ── Notification badge ────────────────────────────────────────────
function updateNotifBadge() {
    const badge = document.querySelector(".notif-badge");
    if (!badge) return;
    const count = getPendingCount();
    badge.textContent = count;
    badge.classList.toggle("visible", count > 0);
}

// ── Navigation active state ───────────────────────────────────────
function setActiveNav() {
    const path = window.location.pathname.split("/").pop();
    document.querySelectorAll(".nav-links a").forEach(a => {
        a.classList.toggle("active", a.getAttribute("href") === path);
    });
}

// ── Nav HTML (injected by pages) ──────────────────────────────────
function renderNav() {
    const nav = document.getElementById("mainNav");
    if (!nav || !isLoggedIn()) return;
    nav.innerHTML = `
        <a href="profil.html" class="nav-brand">📚 StudyBuddy</a>
        <div class="nav-links">
            <a href="profil.html"><span>Profil</span></a>
            <a href="matching.html"><span>Matching</span></a>
            <a href="anfragen.html">
                <span>Anfragen</span>
                <span class="notif-badge"></span>
            </a>
        </div>
        <button class="nav-logout" onclick="logout()">Logout</button>
    `;
    setActiveNav();
    updateNotifBadge();
}
