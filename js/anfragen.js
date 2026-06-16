protectPage();

function renderAnfragen() {
    const eingang = getEingangAnfragen();
    const ausgang = getAusgangAnfragen();

    // Eingehende Anfragen
    const eingangDiv = document.getElementById("eingangList");
    if (eingang.length === 0) {
        eingangDiv.innerHTML = `<div class="empty-state"><div class="icon">📭</div><p>Keine eingehenden Anfragen.</p></div>`;
    } else {
        eingangDiv.innerHTML = "";
        eingang.forEach(a => {
            const profile = JSON.parse(localStorage.getItem("profile_" + a.from));
            const name = profile ? profile.name : a.from;
            const statusBadge = a.status === "pending"
                ? `<div class="anfrage-actions">
                     <button class="btn btn-success btn-sm" onclick="handleAnfrage('${a.from}','accepted')">Annehmen</button>
                     <button class="btn btn-danger btn-sm" onclick="handleAnfrage('${a.from}','rejected')">Ablehnen</button>
                   </div>`
                : `<span class="status-badge ${a.status === 'accepted' ? 'status-accepted' : 'status-rejected'}">${a.status === 'accepted' ? '✓ Angenommen' : '✗ Abgelehnt'}</span>`;

            const div = document.createElement("div");
            div.className = `anfrage-card ${a.status}`;
            div.id = `eingang-${a.from.replace(/[^a-z0-9]/gi, "")}`;
            div.innerHTML = `
                <div class="anfrage-info">
                    <strong>${name}</strong>
                    <span>${a.from}</span>
                </div>
                ${statusBadge}
            `;
            eingangDiv.appendChild(div);
        });
    }

    // Ausgehende Anfragen
    const ausgangDiv = document.getElementById("ausgangList");
    if (ausgang.length === 0) {
        ausgangDiv.innerHTML = `<div class="empty-state"><div class="icon">📤</div><p>Keine gesendeten Anfragen.</p></div>`;
    } else {
        ausgangDiv.innerHTML = "";
        ausgang.forEach(a => {
            const profile = JSON.parse(localStorage.getItem("profile_" + a.to));
            const name = profile ? profile.name : a.to;
            const statusClass = a.status === "accepted" ? "status-accepted" : a.status === "rejected" ? "status-rejected" : "status-pending";
            const statusLabel = a.status === "accepted" ? "✓ Angenommen" : a.status === "rejected" ? "✗ Abgelehnt" : "Ausstehend";

            const div = document.createElement("div");
            div.className = `anfrage-card ${a.status}`;
            div.innerHTML = `
                <div class="anfrage-info">
                    <strong>${name}</strong>
                    <span>${a.to}</span>
                </div>
                <span class="status-badge ${statusClass}">${statusLabel}</span>
            `;
            ausgangDiv.appendChild(div);
        });
    }

    updateNotifBadge();
}

function handleAnfrage(fromEmail, status) {
    updateAnfrageStatus(fromEmail, status);
    renderAnfragen();
}

renderAnfragen();
