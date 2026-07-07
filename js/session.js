function changeVal(id, delta) {
    const input = document.getElementById(id);
    const min   = parseInt(input.min) || 1;
    const max   = parseInt(input.max) || 999;
    input.value = Math.min(max, Math.max(min, parseInt(input.value) + delta));
}

protectPage();

const email = getCurrentUserEmail();
let currentFormat = "vor-ort";
let myFriends = [];

async function loadFriends() {
    try {
        myFriends = await apiFetch(`/api/freunde?email=${encodeURIComponent(email)}`);
    } catch {
        myFriends = [];
    }
}

document.getElementById("openCreateBtn").addEventListener("click", () => {
    document.getElementById("createCard").style.display = "block";
    document.getElementById("openCreateBtn").style.display = "none";
    setJetzt();
    document.getElementById("createCard").scrollIntoView({ behavior: "smooth", block: "start" });
});

function closeCreateForm() {
    document.getElementById("createCard").style.display = "none";
    document.getElementById("openCreateBtn").style.display = "inline-flex";
}

function setJetzt() {
    const now = new Date();
    document.getElementById("sessionDatum").value = now.toISOString().split("T")[0];
    document.getElementById("sessionZeit").value  = now.toTimeString().slice(0, 5);
}

function setFormat(format) {
    currentFormat = format;
    document.getElementById("vorOrtBtn").classList.toggle("active", format === "vor-ort");
    document.getElementById("onlineBtn").classList.toggle("active", format === "online");
    document.getElementById("linkField").style.display = format === "online" ? "flex" : "none";
}

async function loadSessions() {
    try {
        await loadFriends();
        const sessions = await apiFetch("/api/sessions");
        const friendEmails = myFriends.map(f => f.email);
        const mySession = sessions.find(s => s.creator === email);
        const others    = sessions.filter(s => s.creator !== email && friendEmails.includes(s.creator));
        renderMySession(mySession);
        renderSessionList(others);
        renderEinladungen();
        initIcons();
    } catch (err) {
        document.getElementById("sessionList").innerHTML =
            `<div class="msg msg-error"><i data-lucide="alert-circle" style="width:15px;height:15px"></i> ${err.message}</div>`;
        initIcons();
    }
}

async function renderEinladungen() {
    const wrap = document.getElementById("einladungenWrap");
    const div  = document.getElementById("einladungenList");
    if (!wrap || !div) return;
    try {
        const einladungen = await apiFetch(`/api/einladungen?email=${encodeURIComponent(email)}`);
        const offen = einladungen.filter(s => !s.teilnehmer.includes(email) && s.creator !== email);
        if (!offen.length) { wrap.style.display = "none"; return; }
        wrap.style.display = "block";
        div.innerHTML = offen.map(s => `
<div class="session-card">
<div class="session-header">
<div style="display:flex;align-items:center;gap:12px">
<div class="session-avatar">${getInitials(s.creatorName)}</div>
<div>
<div class="session-fach">${s.fach}</div>
<div class="session-thema">${s.thema || "Kein Thema angegeben"}</div>
<div style="font-size:0.78rem;color:var(--text-muted);margin-top:2px">von ${s.creatorName} • Einladung</div>
</div>
</div>
<button class="btn btn-sm" onclick="joinSession('${s.id}', this)">
<i data-lucide="log-in" style="width:13px;height:13px"></i> Beitreten
</button>
</div>
</div>
        `).join("");
        initIcons();
    } catch {
        wrap.style.display = "none";
    }
}

function getSessionStatus(session) {
    const now   = Date.now();
    const start = session.startAt;
    const end   = session.expiresAt;
    if (now < start) return { label: "Geplant", cls: "status-pending", icon: "calendar-clock" };
    if (now >= start && now <= end) return { label: "Läuft jetzt", cls: "status-accepted", icon: "radio" };
    return { label: "Beendet", cls: "status-rejected", icon: "check" };
}

function formatDateTime(ts) {
    const d = new Date(ts);
    const heute = new Date().toDateString() === d.toDateString();
    const datum = heute ? "Heute" : d.toLocaleDateString("de-CH", { day: "2-digit", month: "2-digit" });
    const zeit  = d.toLocaleTimeString("de-CH", { hour: "2-digit", minute: "2-digit" });
    return `${datum}, ${zeit} Uhr`;
}

function renderMySession(session) {
    const wrap = document.getElementById("mySessionWrap");
    const div  = document.getElementById("mySession");
    if (!session) { wrap.style.display = "none"; return; }
    wrap.style.display = "block";
    const status = getSessionStatus(session);
    div.innerHTML = `
<div class="session-card my-session">
<div class="session-header">
<div>
<div class="session-fach">${session.fach}</div>
<div class="session-thema">${session.thema || "Kein Thema angegeben"}</div>
</div>
<button class="btn btn-danger btn-sm" onclick="endSession('${session.id}')">
<i data-lucide="trash-2" style="width:13px;height:13px"></i>
                    Löschen
</button>
</div>
<div style="margin-top:10px">
<button class="btn btn-ghost btn-sm" onclick="inviteFriends('${session.id}', this)">
<i data-lucide="send" style="width:13px;height:13px"></i>
                    Session an alle Freunde schicken
</button>
</div>
<div class="session-meta">
<span class="session-meta-item">
<i data-lucide="users" style="width:12px;height:12px"></i>
                    ${session.teilnehmer.length}/${session.maxTeilnehmer} Teilnehmer
</span>
<span class="session-meta-item">
<i data-lucide="calendar" style="width:12px;height:12px"></i>
                    ${formatDateTime(session.startAt)}
</span>
                ${session.format === "online" ? `
<span class="session-meta-item">
<i data-lucide="video" style="width:12px;height:12px"></i> Online
</span>` : `
<span class="session-meta-item">
<i data-lucide="map-pin" style="width:12px;height:12px"></i> Vor Ort
</span>`}
<span class="status-badge ${status.cls}">
<i data-lucide="${status.icon}" style="width:11px;height:11px"></i>
                    ${status.label}
</span>
</div>
            ${session.format === "online" && session.link ? `
<div style="margin-top:10px">
<a href="${session.link}" target="_blank" class="btn btn-ghost btn-sm">
<i data-lucide="external-link" style="width:13px;height:13px"></i>
                    Meeting-Link öffnen
</a>
</div>` : ""}
            ${session.teilnehmer.length > 0 ? `
<div style="margin-top:10px">
<div class="match-tags-label" style="margin-bottom:6px">
<i data-lucide="user-check" style="width:11px;height:11px"></i> Teilnehmer
</div>
<div style="display:flex;flex-wrap:wrap;gap:6px">
                    ${session.teilnehmer.map(t => `<span class="tag tag-emerald">${t}</span>`).join("")}
</div>
</div>` : ""}
</div>
    `;
    initIcons();
}

function renderSessionList(sessions) {
    const list = document.getElementById("sessionList");
    if (!sessions.length) {
        list.innerHTML = `
<div class="empty-state">
<i data-lucide="users" style="width:40px;height:40px;color:var(--text-muted);margin-bottom:12px"></i>
<p>Deine Freunde haben bis jetzt noch keine Session erstellt.<br>Sobald einer von ihnen eine Session erstellt, siehst du sie hier.</p>
</div>`;
        initIcons();
        return;
    }
    sessions.sort((a, b) => {
        const sa = getSessionStatus(a), sb = getSessionStatus(b);
        const order = { "Läuft jetzt": 0, "Geplant": 1, "Beendet": 2 };
        if (order[sa.label] !== order[sb.label]) return order[sa.label] - order[sb.label];
        return a.startAt - b.startAt;
    });
    list.innerHTML = "";
    sessions.forEach((s, idx) => {
        const status    = getSessionStatus(s);
        const isFull    = s.teilnehmer.length >= s.maxTeilnehmer;
        const hasJoined = s.teilnehmer.includes(email);
        let actionHtml;
        if (hasJoined) {
            actionHtml = `<span class="status-badge status-accepted"><i data-lucide="check" style="width:12px;height:12px"></i> Beigetreten</span>`;
        } else if (isFull) {
            actionHtml = `<span class="status-badge status-rejected"><i data-lucide="x" style="width:12px;height:12px"></i> Voll</span>`;
        } else if (status.label === "Beendet") {
            actionHtml = `<span class="status-badge status-rejected">Beendet</span>`;
        } else {
            actionHtml = `<button class="btn btn-sm" onclick="joinSession('${s.id}', this)">
<i data-lucide="log-in" style="width:13px;height:13px"></i> Beitreten
</button>`;
        }
        const card = document.createElement("div");
        card.className = "session-card";
        card.style.animationDelay = (idx * 60) + "ms";
        card.innerHTML = `
<div class="session-header">
<div style="display:flex;align-items:center;gap:12px">
<div class="session-avatar">${getInitials(s.creatorName)}</div>
<div>
<div class="session-fach">${s.fach}</div>
<div class="session-thema">${s.thema || "Kein Thema angegeben"}</div>
<div style="font-size:0.78rem;color:var(--text-muted);margin-top:2px">von ${s.creatorName}</div>
</div>
</div>
                ${actionHtml}
</div>
<div class="session-meta">
<span class="session-meta-item">
<i data-lucide="users" style="width:12px;height:12px"></i>
                    ${s.teilnehmer.length}/${s.maxTeilnehmer} Teilnehmer
</span>
<span class="session-meta-item">
<i data-lucide="calendar" style="width:12px;height:12px"></i>
                    ${formatDateTime(s.startAt)}
</span>
                ${s.format === "online" ? `
<span class="session-meta-item">
<i data-lucide="video" style="width:12px;height:12px"></i> Online
</span>` : `
<span class="session-meta-item">
<i data-lucide="map-pin" style="width:12px;height:12px"></i> Vor Ort
</span>`}
<span class="status-badge ${status.cls}">
<i data-lucide="${status.icon}" style="width:11px;height:11px"></i>
                    ${status.label}
</span>
</div>
            ${hasJoined && s.format === "online" && s.link ? `
<div style="margin-top:10px">
<a href="${s.link}" target="_blank" class="btn btn-ghost btn-sm">
<i data-lucide="external-link" style="width:13px;height:13px"></i>
                    Meeting-Link öffnen
</a>
</div>` : ""}
        `;
        list.appendChild(card);
    });
    initIcons();
}

document.getElementById("createBtn").addEventListener("click", async function() {
    const fach          = document.getElementById("sessionFach").value.trim();
    const thema         = document.getElementById("sessionThema").value.trim();
    const datum         = document.getElementById("sessionDatum").value;
    const zeit          = document.getElementById("sessionZeit").value;
    const dauer         = document.getElementById("sessionDauer").value;
    const maxTeilnehmer = document.getElementById("sessionMax").value;
    const link          = document.getElementById("sessionLink").value.trim();
    const msg           = document.getElementById("createMsg");

    if (!fach || !datum || !zeit) {
        msg.innerHTML = `<div class="msg msg-error"><i data-lucide="alert-circle" style="width:15px;height:15px"></i> Fach, Datum und Uhrzeit sind Pflicht.</div>`;
        initIcons(); return;
    }
    if (currentFormat === "online" && !link) {
        msg.innerHTML = `<div class="msg msg-error"><i data-lucide="alert-circle" style="width:15px;height:15px"></i> Bitte einen Meeting-Link angeben.</div>`;
        initIcons(); return;
    }
    const btn = document.getElementById("createBtn");
    btn.disabled = true;
    btn.innerHTML = `<i data-lucide="loader" style="width:15px;height:15px"></i> Wird erstellt...`;
    initIcons();

    const startAt = new Date(`${datum}T${zeit}`).getTime();

    try {
        await apiFetch("/api/sessions", { method: "POST", body: JSON.stringify({
                creator: email, fach, thema, startAt, dauer, maxTeilnehmer,
                format: currentFormat, link: currentFormat === "online" ? link : ""
            })});
        msg.innerHTML = `<div class="msg msg-success"><i data-lucide="check-circle" style="width:15px;height:15px"></i> Session erstellt!</div>`;
        initIcons();
        showToast("Session erstellt!", "success");
        document.getElementById("sessionFach").value  = "";
        document.getElementById("sessionThema").value = "";
        document.getElementById("sessionLink").value  = "";
        setTimeout(() => { msg.innerHTML = ""; closeCreateForm(); }, 1200);
        loadSessions();
    } catch (err) {
        msg.innerHTML = `<div class="msg msg-error"><i data-lucide="alert-circle" style="width:15px;height:15px"></i> ${err.message}</div>`;
        initIcons();
    } finally {
        btn.disabled = false;
        btn.innerHTML = `<i data-lucide="play-circle" style="width:15px;height:15px"></i> Session erstellen`;
        initIcons();
    }
});

async function inviteFriends(sessionId, btn) {
    if (!myFriends.length) {
        showToast("Du hast noch keine Freunde, denen du die Session schicken kannst.", "info");
        return;
    }
    btn.disabled = true;
    try {
        const result = await apiFetch("/api/sessions/invite", { method: "POST", body: JSON.stringify({ sessionId, from: email }) });
        showToast(`Session an ${result.gesamt} Freund${result.gesamt === 1 ? "" : "e"} geschickt!`, "success");
    } catch (err) {
        showToast(err.message, "error");
    } finally {
        btn.disabled = false;
    }
}

async function joinSession(sessionId, btn) {
    try {
        await apiFetch("/api/sessions/join", { method: "POST", body: JSON.stringify({ sessionId, email }) });
        showToast("Beigetreten!", "success");
        loadSessions();
        updateNotifBadge();
    } catch (err) {
        showToast(err.message, "error");
    }
}

async function endSession(sessionId) {
    try {
        await apiFetch(`/api/sessions/${sessionId}`, { method: "DELETE", body: JSON.stringify({ email }) });
        showToast("Session gelöscht.", "info");
        loadSessions();
    } catch (err) {
        showToast(err.message, "error");
    }
}

loadSessions();
setInterval(loadSessions, 30000);