protectPage();

const email = getCurrentUserEmail();

function switchTab(tab, btn) {
    document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    document.getElementById("tab-eingang").style.display = tab === "eingang" ? "block" : "none";
    document.getElementById("tab-ausgang").style.display = tab === "ausgang" ? "block" : "none";
}

async function renderAnfragen() {
    try {
        const { eingang, ausgang } = await apiFetch(`/api/anfragen?email=${encodeURIComponent(email)}`);

        const pendingCount = eingang.filter(a => a.status === "pending").length;
        const badge = document.getElementById("eingangCount");
        if (badge && pendingCount > 0) {
            badge.innerHTML = `<span style="background:var(--rose);color:white;border-radius:99px;padding:1px 7px;font-size:0.7rem;font-weight:700;margin-left:4px">${pendingCount}</span>`;
        }

        const eingangDiv = document.getElementById("eingangList");
        if (!eingang.length) {
            eingangDiv.innerHTML = `
                <div class="empty-state">
                    <i data-lucide="inbox" style="width:40px;height:40px;color:var(--text-muted);margin-bottom:12px"></i>
                    <p>Noch keine eingehenden Anfragen.</p>
                </div>`;
        } else {
            eingangDiv.innerHTML = "";
            for (const a of eingang) {
                let senderName = a.from;
                try { const p = await apiFetch(`/api/profil?email=${encodeURIComponent(a.from)}`); if (p?.name) senderName = p.name; } catch {}
                const actionHtml = a.status === "pending"
                    ? `<div class="anfrage-actions">
                           <button class="btn btn-success btn-sm" onclick="handleAnfrage('${a.from}','accepted')">
                               <i data-lucide="check" style="width:13px;height:13px"></i> Annehmen
                           </button>
                           <button class="btn btn-danger btn-sm" onclick="handleAnfrage('${a.from}','rejected')">
                               <i data-lucide="x" style="width:13px;height:13px"></i> Ablehnen
                           </button>
                       </div>`
                    : `<span class="status-badge ${a.status==='accepted'?'status-accepted':'status-rejected'}">
                           <i data-lucide="${a.status==='accepted'?'check':'x'}" style="width:12px;height:12px"></i>
                           ${a.status==='accepted'?'Angenommen':'Abgelehnt'}
                       </span>`;
                const div = document.createElement("div");
                div.className = `anfrage-card ${a.status}`;
                div.innerHTML = `
                    <div class="anfrage-left">
                        <div class="anfrage-avatar">${getInitials(senderName)}</div>
                        <div class="anfrage-info"><strong>${senderName}</strong><span>${a.from}</span></div>
                    </div>
                    ${actionHtml}
                `;
                eingangDiv.appendChild(div);
            }
        }

        const ausgangDiv = document.getElementById("ausgangList");
        if (!ausgang.length) {
            ausgangDiv.innerHTML = `
                <div class="empty-state">
                    <i data-lucide="send" style="width:40px;height:40px;color:var(--text-muted);margin-bottom:12px"></i>
                    <p>Noch keine Anfragen gesendet.<br><a href="matching.html">Jetzt Matches finden</a></p>
                </div>`;
        } else {
            ausgangDiv.innerHTML = "";
            for (const a of ausgang) {
                let empfName = a.to;
                try { const p = await apiFetch(`/api/profil?email=${encodeURIComponent(a.to)}`); if (p?.name) empfName = p.name; } catch {}
                const iconMap = { pending: "clock", accepted: "check", rejected: "x" };
                const cls     = { pending: "status-pending", accepted: "status-accepted", rejected: "status-rejected" }[a.status];
                const label   = { pending: "Ausstehend", accepted: "Angenommen", rejected: "Abgelehnt" }[a.status];
                const div = document.createElement("div");
                div.className = `anfrage-card ${a.status}`;
                div.innerHTML = `
                    <div class="anfrage-left">
                        <div class="anfrage-avatar">${getInitials(empfName)}</div>
                        <div class="anfrage-info"><strong>${empfName}</strong><span>${a.to}</span></div>
                    </div>
                    <span class="status-badge ${cls}">
                        <i data-lucide="${iconMap[a.status]}" style="width:12px;height:12px"></i>
                        ${label}
                    </span>
                `;
                ausgangDiv.appendChild(div);
            }
        }

        updateNotifBadge();
        initIcons();
    } catch (err) {
        document.getElementById("eingangList").innerHTML = `
            <div class="msg msg-error"><i data-lucide="alert-circle" style="width:15px;height:15px"></i> ${err.message}</div>`;
        initIcons();
    }
}

async function handleAnfrage(fromEmail, status) {
    try {
        await apiFetch("/api/anfragen", { method: "PATCH", body: JSON.stringify({ from: fromEmail, to: email, status }) });
        showToast(status === "accepted" ? "Anfrage angenommen" : "Anfrage abgelehnt", status === "accepted" ? "success" : "info");
        renderAnfragen();
    } catch (err) { showToast(err.message, "error"); }
}

renderAnfragen();