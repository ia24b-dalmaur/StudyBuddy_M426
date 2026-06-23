function changeVal(id, delta) {
    const input = document.getElementById(id);
    const min   = parseInt(input.min) || 1;
    const max   = parseInt(input.max) || 999;
    input.value = Math.min(max, Math.max(min, parseInt(input.value) + delta));
}

protectPage();

const email = getCurrentUserEmail();
let autoRefresh = null;

async function loadSessions() {
    try {
        const sessions = await apiFetch("/api/sessions");
        const mySession = sessions.find(s => s.creator === email);
        const others    = sessions.filter(s => s.creator !== email);
        renderMySession(mySession);
        renderSessionList(others);
        initIcons();
    } catch (err) {
        document.getElementById("sessionList").innerHTML =
            `<div class="msg msg-error"><i data-lucide="alert-circle" style="width:15px;height:15px"></i> ${err.message}</div>`;
        initIcons();
    }
}

function renderMySession(session) {
    const wrap = document.getElementById("mySessionWrap");
    const div  = document.getElementById("mySession");
    if (!session) { wrap.style.display = "none"; return; }
    wrap.style.display = "block";
    const remaining = Math.max(0, Math.round((session.expiresAt - Date.now()) / 60000));
    div.innerHTML = `
        <div class="session-card my-session">
            <div class="session-header">
                <div>
                    <div class="session-fach">${session.fach}</div>
                    <div class="session-thema">${session.thema || "Kein Thema angegeben"}</div>
                </div>
                <button class="btn btn-danger btn-sm" onclick="endSession('${session.id}')">
                    <i data-lucide="square" style="width:13px;height:13px"></i>
                    Beenden
                </button>
            </div>
            <div class="session-meta">
                <span class="session-meta-item">
                    <i data-lucide="users" style="width:12px;height:12px"></i>
                    ${session.teilnehmer.length}/${session.maxTeilnehmer} Teilnehmer
                </span>
                <span class="session-meta-item">
                    <i data-lucide="clock" style="width:12px;height:12px"></i>
                    Noch ~${remaining} Min.
                </span>
                <span class="live-dot"><span class="live-pulse"></span>Live</span>
            </div>
            ${session.teilnehmer.length > 0 ? `
            <div style="margin-top:10px">
                <div class="match-tags-label" style="margin-bottom:6px">
                    <i data-lucide="user-check" style="width:11px;height:11px"></i> Beigetreten
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
                <i data-lucide="coffee" style="width:40px;height:40px;color:var(--text-muted);margin-bottom:12px"></i>
                <p>Keine aktiven Sessions gerade.<br>Starte die erste!</p>
            </div>`;
        initIcons();
        return;
    }
    list.innerHTML = "";
    sessions.forEach((s, idx) => {
        const remaining = Math.max(0, Math.round((s.expiresAt - Date.now()) / 60000));
        const isFull    = s.teilnehmer.length >= s.maxTeilnehmer;
        const hasJoined = s.teilnehmer.includes(email);

        let actionHtml;
        if (hasJoined) {
            actionHtml = `<span class="status-badge status-accepted"><i data-lucide="check" style="width:12px;height:12px"></i> Beigetreten</span>`;
        } else if (isFull) {
            actionHtml = `<span class="status-badge status-rejected"><i data-lucide="x" style="width:12px;height:12px"></i> Voll</span>`;
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
                    <i data-lucide="clock" style="width:12px;height:12px"></i>
                    Noch ~${remaining} Min.
                </span>
                <span class="live-dot"><span class="live-pulse"></span>Live</span>
            </div>
        `;
        list.appendChild(card);
    });
    initIcons();
}

document.getElementById("createBtn").addEventListener("click", async function() {
    const fach          = document.getElementById("sessionFach").value.trim();
    const thema         = document.getElementById("sessionThema").value.trim();
    const dauer         = document.getElementById("sessionDauer").value;
    const maxTeilnehmer = document.getElementById("sessionMax").value;
    const msg           = document.getElementById("createMsg");

    if (!fach) {
        msg.innerHTML = `<div class="msg msg-error"><i data-lucide="alert-circle" style="width:15px;height:15px"></i> Bitte ein Fach angeben.</div>`;
        initIcons(); return;
    }
    const btn = document.getElementById("createBtn");
    btn.disabled = true;
    btn.innerHTML = `<i data-lucide="loader" style="width:15px;height:15px"></i> Wird erstellt...`;
    initIcons();

    try {
        await apiFetch("/api/sessions", { method: "POST", body: JSON.stringify({
                creator: email, fach, thema, dauer, maxTeilnehmer
            })});
        msg.innerHTML = `<div class="msg msg-success"><i data-lucide="check-circle" style="width:15px;height:15px"></i> Session gestartet!</div>`;
        initIcons();
        showToast("Session gestartet!", "success");
        document.getElementById("sessionFach").value  = "";
        document.getElementById("sessionThema").value = "";
        setTimeout(() => msg.innerHTML = "", 3000);
        loadSessions();
    } catch (err) {
        msg.innerHTML = `<div class="msg msg-error"><i data-lucide="alert-circle" style="width:15px;height:15px"></i> ${err.message}</div>`;
        initIcons();
    } finally {
        btn.disabled = false;
        btn.innerHTML = `<i data-lucide="play-circle" style="width:15px;height:15px"></i> Session starten`;
        initIcons();
    }
});

async function joinSession(sessionId, btn) {
    try {
        await apiFetch("/api/sessions/join", { method: "POST", body: JSON.stringify({ sessionId, email }) });
        showToast("Beigetreten! Kontaktanfrage wurde gesendet.", "success");
        loadSessions();
        updateNotifBadge();
    } catch (err) {
        showToast(err.message, "error");
    }
}

async function endSession(sessionId) {
    try {
        await apiFetch(`/api/sessions/${sessionId}`, { method: "DELETE", body: JSON.stringify({ email }) });
        showToast("Session beendet.", "info");
        loadSessions();
    } catch (err) {
        showToast(err.message, "error");
    }
}

loadSessions();
autoRefresh = setInterval(loadSessions, 30000);