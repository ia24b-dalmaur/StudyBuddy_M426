function getCurrentUserEmail() { return sessionStorage.getItem("currentUser"); }
function isLoggedIn() { return getCurrentUserEmail() !== null; }
function protectPage() { if (!isLoggedIn()) window.location.href = "login.html"; }
function logout() { sessionStorage.removeItem("currentUser"); window.location.href = "login.html"; }

async function apiFetch(url, options = {}) {
    const res  = await fetch(url, { headers: { "Content-Type": "application/json" }, ...options });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Fehler");
    return data;
}

function getInitials(nameOrEmail) {
    if (!nameOrEmail) return "?";
    const parts = nameOrEmail.split(/[\s@]/);
    return parts.slice(0, 2).map(p => p[0]?.toUpperCase() || "").join("") || "?";
}

function initIcons() {
    if (window.lucide) lucide.createIcons();
}

function showToast(text, type = "info") {
    let container = document.getElementById("toast-container");
    if (!container) {
        container = document.createElement("div");
        container.id = "toast-container";
        document.body.appendChild(container);
    }
    const iconMap = { success: "check", error: "x", info: "info" };
    const toast = document.createElement("div");
    toast.className = `toast ${type}`;
    toast.innerHTML = `<i data-lucide="${iconMap[type]}" style="width:15px;height:15px;flex-shrink:0"></i> ${text}`;
    container.appendChild(toast);
    if (window.lucide) lucide.createIcons({ nodes: [toast] });
    setTimeout(() => {
        toast.style.opacity = "0";
        toast.style.transform = "translateX(20px)";
        toast.style.transition = "all 0.3s";
        setTimeout(() => toast.remove(), 300);
    }, 2800);
}

async function updateNotifBadge() {
    const badge = document.querySelector(".notif-badge");
    if (!badge || !isLoggedIn()) return;
    try {
        const { count } = await apiFetch(`/api/anfragen/pending-count?email=${encodeURIComponent(getCurrentUserEmail())}`);
        badge.textContent = count;
        badge.classList.toggle("visible", count > 0);
    } catch {}
}

function setActiveNav() {
    const page = window.location.pathname.split("/").pop();
    document.querySelectorAll(".nav-links a").forEach(a => {
        a.classList.toggle("active", a.getAttribute("href") === page);
    });
}

async function renderNav() {
    const nav = document.getElementById("mainNav");
    if (!nav || !isLoggedIn()) return;
    const email = getCurrentUserEmail();
    let initials = getInitials(email);
    try {
        const p = await apiFetch(`/api/profil?email=${encodeURIComponent(email)}`);
        if (p?.name) initials = getInitials(p.name);
    } catch {}
    nav.innerHTML = `
        <a href="profil.html" class="nav-brand">
            <span class="brand-dot"></span>
            StudyBuddy
        </a>
        <div class="nav-links">
            <a href="profil.html">
                <i data-lucide="user" style="width:15px;height:15px"></i>
                <span>Profil</span>
            </a>
            <a href="matching.html">
                <i data-lucide="zap" style="width:15px;height:15px"></i>
                <span>Matching</span>
            </a>
            <a href="session.html">
                <i data-lucide="radio" style="width:15px;height:15px"></i>
                <span>Sessions</span>
            </a>
            <a href="anfragen.html">
                <i data-lucide="bell" style="width:15px;height:15px"></i>
                <span>Anfragen</span>
                <span class="notif-badge"></span>
            </a>
        </div>
        <div class="nav-right">
            <div class="nav-avatar" title="${email}">${initials}</div>
            <button class="nav-logout" onclick="logout()">
                <i data-lucide="log-out" style="width:14px;height:14px"></i>
                Logout
            </button>
        </div>
    `;
    setActiveNav();
    updateNotifBadge();
    if (window.lucide) lucide.createIcons({ nodes: [nav] });
}