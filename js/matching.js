protectPage();

// Demo-Profile
const DEMO_PROFILES = [
    { email: "anna@demo.ch",  name: "Anna M.",    klasse: "3a", faecher: ["Mathe", "Deutsch"],            interessen: ["Lesen", "Musik"],       lernzeiten: ["Morgens (6–9)", "Nachmittags (14–17)"] },
    { email: "noah@demo.ch",  name: "Noah K.",    klasse: "3b", faecher: ["Biologie", "Geschichte"],       interessen: ["Sport", "Natur"],        lernzeiten: ["Abends (17–20)"] },
    { email: "mia@demo.ch",   name: "Mia S.",     klasse: "3a", faecher: ["Englisch", "Mathe"],           interessen: ["Musik", "Reisen"],       lernzeiten: ["Nachmittags (14–17)", "Abends (17–20)"] },
    { email: "leo@demo.ch",   name: "Leo T.",     klasse: "4b", faecher: ["Informatik", "Französisch"],   interessen: ["Programmieren", "Gaming"], lernzeiten: ["Nachts (20–23)", "Nachmittags (14–17)"] },
    { email: "sara@demo.ch",  name: "Sara B.",    klasse: "4a", faecher: ["Chemie", "Mathe", "Physik"],  interessen: ["Wissenschaft", "Lesen"], lernzeiten: ["Morgens (6–9)", "Vormittags (9–12)"] },
    { email: "tom@demo.ch",   name: "Tom W.",     klasse: "2b", faecher: ["Geschichte", "Deutsch"],       interessen: ["Film", "Musik"],         lernzeiten: ["Mittags (12–14)", "Abends (17–20)"] }
];

const partnerList = document.getElementById("partnerList");
const matchButton = document.getElementById("matchButton");

matchButton.addEventListener("click", doMatching);

function doMatching() {
    partnerList.innerHTML = "";
    const ownProfile  = JSON.parse(localStorage.getItem(getProfileKey()));
    const ownZeiten   = JSON.parse(localStorage.getItem(getZeitenKey()) || "[]");
    const ownEmail    = getCurrentUserEmail();

    if (!ownProfile) {
        partnerList.innerHTML = `<div class="msg msg-error">Bitte zuerst ein <a href="profil.html">Lernprofil</a> erstellen.</div>`;
        return;
    }

    // Echte Benutzer-Profile aus localStorage hinzufügen
    const allUsers = getAllUsers().filter(u => u.email !== ownEmail);
    const otherProfiles = [...DEMO_PROFILES];

    allUsers.forEach(u => {
        const p = JSON.parse(localStorage.getItem("profile_" + u.email));
        if (p) otherProfiles.push({ ...p, email: u.email, lernzeiten: JSON.parse(localStorage.getItem("lernzeiten_" + u.email) || "[]") });
    });

    const anfragen = getAllAnfragen();

    const matches = otherProfiles.map(person => {
        const gemFaecher    = (person.faecher    || []).filter(f => (ownProfile.faecher    || []).includes(f));
        const gemInteressen = (person.interessen || []).filter(i => (ownProfile.interessen || []).includes(i));
        const gemZeiten     = (person.lernzeiten || []).filter(z => ownZeiten.includes(z));
        const score = gemFaecher.length * 3 + gemInteressen.length * 2 + gemZeiten.length;
        return { ...person, gemFaecher, gemInteressen, gemZeiten, score };
    })
        .filter(p => p.gemFaecher.length > 0)
        .sort((a, b) => b.score - a.score);

    if (matches.length === 0) {
        partnerList.innerHTML = `
            <div class="empty-state">
                <div class="icon">🔍</div>
                <p>Keine passenden Lernpartner:innen gefunden.<br>Erweitere deine Fächer im Profil.</p>
            </div>`;
        return;
    }

    matches.forEach(person => {
        const anfrage = anfragen.find(a => a.from === ownEmail && a.to === person.email);
        let actionHtml = "";
        if (anfrage) {
            const label = anfrage.status === "pending"  ? "Anfrage gesendet" :
                anfrage.status === "accepted" ? "✓ Verbunden" : "Abgelehnt";
            const cls   = anfrage.status === "accepted" ? "status-accepted" :
                anfrage.status === "rejected" ? "status-rejected" : "status-pending";
            actionHtml = `<span class="status-badge ${cls}">${label}</span>`;
        } else {
            actionHtml = `<button class="btn btn-sm" onclick="sendRequest('${person.email}', this)">Anfrage senden</button>`;
        }

        const zeitenHtml = person.gemZeiten.length > 0
            ? `<div class="match-tags-label" style="margin-top:10px">Gemeinsame Lernzeiten</div>
               <div class="zeiten-display">${person.gemZeiten.map(z=>`<span class="tag">${z}</span>`).join("")}</div>`
            : "";

        const card = document.createElement("div");
        card.className = "match-card";
        card.innerHTML = `
            <div class="match-header">
                <div>
                    <div class="match-name">${person.name}</div>
                    <div class="match-meta">Klasse ${person.klasse || "?"}</div>
                </div>
                <span class="match-score">${person.score} Punkte</span>
            </div>
            <div class="match-tags">
                <div class="match-tags-label">Gemeinsame Fächer</div>
                <div>${person.gemFaecher.map(f => `<span class="tag tag-match">${f}</span>`).join("")}</div>
            </div>
            ${person.gemInteressen.length > 0 ? `
            <div class="match-tags">
                <div class="match-tags-label">Gemeinsame Interessen</div>
                <div>${person.gemInteressen.map(i => `<span class="tag">${i}</span>`).join("")}</div>
            </div>` : ""}
            ${zeitenHtml}
            <div style="margin-top:14px">${actionHtml}</div>
        `;
        partnerList.appendChild(card);
    });
}

function sendRequest(toEmail, btn) {
    const success = sendAnfrage(toEmail);
    if (success) {
        btn.outerHTML = `<span class="status-badge status-pending">Anfrage gesendet</span>`;
        updateNotifBadge();
    }
}
