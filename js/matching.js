protectPage();

const email       = getCurrentUserEmail();
const partnerList = document.getElementById("partnerList");
let allMatches     = [];
let hasMatchedOnce = false;

document.getElementById("matchButton").addEventListener("click", doMatching);

// Enter-Taste löst Matching aus (ausser im Suchfeld, das filtert nur)
document.addEventListener("keydown", e => {
    if (e.key !== "Enter") return;
    if (e.target.id === "searchInput") return;
    doMatching();
});

// Live-Suche: erstes Tippen startet automatisch das Matching
async function filterMatches() {
    if (!hasMatchedOnce) {
        await doMatching();
        return; // doMatching() rendert bereits gefiltert über applyFilter()
    }
    applyFilter();
}

function applyFilter() {
    const q = document.getElementById("searchInput").value.toLowerCase();
    const filtered = q ? allMatches.filter(p =>
        p.name?.toLowerCase().includes(q) ||
        (p.faecher||[]).some(f => f.toLowerCase().includes(q)) ||
        (p.interessen||[]).some(i => i.toLowerCase().includes(q))
    ) : allMatches;
    renderMatchCards(filtered, document.getElementById("matchCount"));
}

async function doMatching() {
    partnerList.innerHTML = `<div class="msg msg-info"><i data-lucide="loader" style="width:15px;height:15px"></i> Analyse läuft...</div>`;
    initIcons();
    const meta = document.getElementById("matchMeta");

    try {
        const [ownProfil, ownZeiten, others, anfragenData] = await Promise.all([
            apiFetch(`/api/profil?email=${encodeURIComponent(email)}`),
            apiFetch(`/api/lernzeiten?email=${encodeURIComponent(email)}`),
            apiFetch(`/api/matching?email=${encodeURIComponent(email)}`),
            apiFetch(`/api/anfragen?email=${encodeURIComponent(email)}`)
        ]);

        if (!ownProfil) {
            partnerList.innerHTML = `
                <div class="empty-state">
                    <i data-lucide="user-x" style="width:40px;height:40px;color:var(--text-muted);margin-bottom:12px"></i>
                    <p>Bitte zuerst ein <a href="profil.html">Lernprofil</a> erstellen.</p>
                </div>`;
            initIcons();
            return;
        }

        const sentAnfragen = anfragenData.ausgang || [];
        const MAX_SCORE = Math.max(ownProfil.faecher?.length || 1, 1) * 3 + 4 + 6;

        allMatches = others
            .map(person => {
                const gemFaecher    = (person.faecher    ||[]).filter(f => (ownProfil.faecher    ||[]).includes(f));
                const gemInteressen = (person.interessen ||[]).filter(i => (ownProfil.interessen ||[]).includes(i));
                const gemZeiten     = (person.lernzeiten ||[]).filter(z => (ownZeiten           ||[]).includes(z));
                const score  = gemFaecher.length * 3 + gemInteressen.length * 2 + gemZeiten.length;
                const pct    = Math.min(100, Math.round((score / MAX_SCORE) * 100));
                const anfrage = sentAnfragen.find(a => a.to === person.email);
                return { ...person, gemFaecher, gemInteressen, gemZeiten, score, pct, anfrage };
            })
            .filter(p => p.gemFaecher.length > 0)
            .sort((a, b) => b.score - a.score);

        meta.style.display = "block";
        hasMatchedOnce = true;
        applyFilter();
        initIcons();
    } catch (err) {
        partnerList.innerHTML = `<div class="msg msg-error"><i data-lucide="alert-circle" style="width:15px;height:15px"></i> ${err.message}</div>`;
        initIcons();
    }
}

function renderMatchCards(matches, badge) {
    partnerList.innerHTML = "";
    if (badge) badge.textContent = `${matches.length} Match${matches.length !== 1 ? "es" : ""} gefunden`;

    if (!matches.length) {
        partnerList.innerHTML = `
            <div class="empty-state">
                <i data-lucide="search-x" style="width:40px;height:40px;color:var(--text-muted);margin-bottom:12px"></i>
                <p>Keine Matches gefunden.<br>Erweitere deine Fächer oder passe den Filter an.</p>
            </div>`;
        initIcons();
        return;
    }

    matches.forEach((person, idx) => {
        let actionHtml;
        if (person.anfrage) {
            const map = {
                pending:  [`<i data-lucide="clock" style="width:12px;height:12px"></i> Ausstehend`,  "status-pending"],
                accepted: [`<i data-lucide="check" style="width:12px;height:12px"></i> Verbunden`,   "status-accepted"],
                rejected: [`<i data-lucide="x"     style="width:12px;height:12px"></i> Abgelehnt`,   "status-rejected"]
            };
            const [label, cls] = map[person.anfrage.status];
            actionHtml = `<span class="status-badge ${cls}">${label}</span>`;
        } else {
            actionHtml = `
                <button class="btn btn-sm" onclick="sendRequest('${person.email}', this)">
                    <i data-lucide="user-plus" style="width:13px;height:13px"></i>
                    Anfrage senden
                </button>`;
        }

        const tagsHtml = (arr, cls) => (arr||[]).map(x => `<span class="tag ${cls}">${x}</span>`).join("");
        const card = document.createElement("div");
        card.className = "match-card";
        card.style.animationDelay = (idx * 60) + "ms";
        card.innerHTML = `
            <div class="match-header">
                <div style="display:flex;align-items:center">
                    <div class="match-avatar">${getInitials(person.name || person.email)}</div>
                    <div class="match-info">
                        <div class="match-name">${person.name || person.email}</div>
                        <div class="match-meta">Klasse ${person.klasse || "?"}</div>
                    </div>
                </div>
                <div class="match-score-wrap">
                    <div class="match-score">${person.pct}%</div>
                    <div class="match-score-label">Kompatibel</div>
                </div>
            </div>
            <div class="match-score-bar">
                <div class="match-score-fill" style="width:0%" data-pct="${person.pct}"></div>
            </div>
            ${person.gemFaecher.length ? `
            <div class="match-tags-section">
                <div class="match-tags-label"><i data-lucide="book" style="width:11px;height:11px"></i> Gemeinsame Fächer</div>
                <div class="tags-row">${tagsHtml(person.gemFaecher, "tag-indigo")}</div>
            </div>` : ""}
            ${person.gemInteressen.length ? `
            <div class="match-tags-section">
                <div class="match-tags-label"><i data-lucide="heart" style="width:11px;height:11px"></i> Gemeinsame Interessen</div>
                <div class="tags-row">${tagsHtml(person.gemInteressen, "tag-violet")}</div>
            </div>` : ""}
            ${person.gemZeiten.length ? `
            <div class="match-tags-section">
                <div class="match-tags-label"><i data-lucide="clock" style="width:11px;height:11px"></i> Gemeinsame Lernzeiten</div>
                <div class="tags-row">${tagsHtml(person.gemZeiten, "")}</div>
            </div>` : ""}
            <div class="match-footer">
                <span style="font-size:0.78rem;color:var(--text-muted)">${person.email}</span>
                ${actionHtml}
            </div>
        `;
        partnerList.appendChild(card);
        requestAnimationFrame(() => {
            setTimeout(() => {
                const fill = card.querySelector(".match-score-fill");
                if (fill) fill.style.width = fill.dataset.pct + "%";
            }, 100 + idx * 60);
        });
    });

    initIcons();
}

async function sendRequest(toEmail, btn) {
    try {
        await apiFetch("/api/anfragen", { method: "POST", body: JSON.stringify({ from: email, to: toEmail }) });
        btn.outerHTML = `<span class="status-badge status-pending"><i data-lucide="clock" style="width:12px;height:12px"></i> Ausstehend</span>`;
        const m = allMatches.find(p => p.email === toEmail);
        if (m) m.anfrage = { to: toEmail, status: "pending" };
        showToast("Anfrage gesendet!", "success");
        updateNotifBadge();
        initIcons();
    } catch (err) {
        showToast(err.message, "error");
    }
}