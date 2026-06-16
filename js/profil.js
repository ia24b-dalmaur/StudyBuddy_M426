protectPage();

const message = document.getElementById("profileMessage");
const output  = document.getElementById("profileOutput");

const LERNZEITEN = [
    "Morgens (6–9)",
    "Vormittags (9–12)",
    "Mittags (12–14)",
    "Nachmittags (14–17)",
    "Abends (17–20)",
    "Nachts (20–23)"
];

function renderZeitGrid(selectedZeiten) {
    const grid = document.getElementById("zeitGrid");
    if (!grid) return;
    grid.innerHTML = "";
    LERNZEITEN.forEach(zeit => {
        const div = document.createElement("div");
        div.className = "zeit-option" + (selectedZeiten.includes(zeit) ? " selected" : "");
        div.innerHTML = `<span class="zeit-dot"></span>${zeit}`;
        div.addEventListener("click", () => div.classList.toggle("selected"));
        grid.appendChild(div);
    });
}

function getSelectedZeiten() {
    return [...document.querySelectorAll(".zeit-option.selected")]
        .map(el => el.textContent.trim());
}

// Daten laden
const savedProfile = JSON.parse(localStorage.getItem(getProfileKey()) || "null");
const savedZeiten  = JSON.parse(localStorage.getItem(getZeitenKey()) || "[]");

renderZeitGrid(savedZeiten);

if (savedProfile) {
    document.getElementById("name").value       = savedProfile.name      || "";
    document.getElementById("klasse").value     = savedProfile.klasse    || "";
    document.getElementById("faecher").value    = (savedProfile.faecher    || []).join(", ");
    document.getElementById("interessen").value = (savedProfile.interessen || []).join(", ");
    showProfile(savedProfile, savedZeiten);
}

// Save button
document.getElementById("saveBtn").addEventListener("click", function() {
    const name  = document.getElementById("name").value.trim();
    const klasse = document.getElementById("klasse").value.trim();
    const faecher = document.getElementById("faecher").value
        .split(",").map(f => f.trim()).filter(Boolean);
    const interessen = document.getElementById("interessen").value
        .split(",").map(i => i.trim()).filter(Boolean);
    const lernzeiten = getSelectedZeiten();

    if (!name || !klasse || faecher.length === 0) {
        showMsg("Bitte Name, Klasse und mindestens ein Fach eingeben.", "error"); return;
    }

    const profile = { name, klasse, faecher, interessen };
    localStorage.setItem(getProfileKey(), JSON.stringify(profile));
    localStorage.setItem(getZeitenKey(), JSON.stringify(lernzeiten));

    showMsg("Profil gespeichert.", "success");
    showProfile(profile, lernzeiten);
});

function showMsg(text, type) {
    message.textContent = text;
    message.className = "msg msg-" + type;
}

function showProfile(profile, zeiten) {
    zeiten = zeiten || [];
    const fächerTags    = (profile.faecher    || []).map(f => `<span class="tag tag-match">${f}</span>`).join("") || "<span style='color:var(--text-muted);font-size:0.85rem'>Keine</span>";
    const interessenTags= (profile.interessen || []).map(i => `<span class="tag">${i}</span>`).join("")           || "<span style='color:var(--text-muted);font-size:0.85rem'>Keine</span>";
    const zeitenTags    = zeiten.map(z => `<span class="tag">${z}</span>`).join("")                               || "<span style='color:var(--text-muted);font-size:0.85rem'>Keine</span>";

    output.innerHTML = `
        <div class="card-sm">
            <h2>Gespeichertes Profil</h2>
            <p style="margin-bottom:8px"><strong>${profile.name}</strong> · Klasse ${profile.klasse}</p>
            <div class="match-tags-label">Fächer</div>
            <div class="zeiten-display" style="margin-bottom:8px">${fächerTags}</div>
            <div class="match-tags-label">Interessen</div>
            <div class="zeiten-display" style="margin-bottom:8px">${interessenTags}</div>
            <div class="match-tags-label">Lernzeiten</div>
            <div class="zeiten-display">${zeitenTags}</div>
        </div>
    `;
}
