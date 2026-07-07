protectPage();

const email   = getCurrentUserEmail();
const message = document.getElementById("profileMessage");
const output  = document.getElementById("profileOutput");

const FAECHER_OPTIONS = [
    "Mathematik", "Deutsch", "Englisch", "Französisch", "Latein",
    "Biologie", "Chemie", "Physik", "Geschichte", "Geografie",
    "Informatik", "Sport", "Kunst", "Musik", "Wirtschaft"
];
const INTERESSEN_OPTIONS = [
    "Programmieren", "Gaming", "Musik", "Sport", "Lesen",
    "Filme", "Reisen", "Kochen", "Zeichnen", "Fotografie",
    "Natur", "Wissenschaft", "Sprachen", "Theater", "Podcasts"
];
const LERNZEITEN = [
    "Morgens (6–9)", "Vormittags (9–12)", "Mittags (12–14)",
    "Nachmittags (14–17)", "Abends (17–20)", "Nachts (20–23)"
];
const ZEIT_ICONS = {
    "Morgens (6–9)": "sunrise", "Vormittags (9–12)": "sun",
    "Mittags (12–14)": "sun", "Nachmittags (14–17)": "cloud-sun",
    "Abends (17–20)": "sunset", "Nachts (20–23)": "moon"
};

let selectedFaecher    = [];
let selectedInteressen = [];
let currentProfil      = null;
let currentZeiten      = [];

function openEdit() {
    document.getElementById("editCard").style.display = "block";
    document.getElementById("editCard").scrollIntoView({ behavior: "smooth", block: "start" });
}
function closeEdit() {
    document.getElementById("editCard").style.display = "none";
}

function renderTagSelector(containerId, options, selected, addFn) {
    const container = document.getElementById(containerId);
    container.innerHTML = "";
    const allOptions = [...new Set([...options, ...selected])];
    allOptions.forEach(opt => {
        const isSelected = selected.includes(opt);
        const tag = document.createElement("div");
        tag.className = "tag-selector-item" + (isSelected ? " selected" : "");
        tag.innerHTML = `
            <span class="tag-label">${opt}</span>
            ${isSelected ? `<button class="tag-remove" onclick="event.stopPropagation(); removeTag('${containerId}', '${opt}')">
                <i data-lucide="x" style="width:10px;height:10px"></i>
            </button>` : ""}
        `;
        if (!isSelected) tag.addEventListener("click", () => addFn(opt));
        container.appendChild(tag);
    });
    initIcons();
}

function removeTag(containerId, opt) {
    if (containerId === "faecherGrid") {
        selectedFaecher = selectedFaecher.filter(f => f !== opt);
        refreshFaecher();
    } else {
        selectedInteressen = selectedInteressen.filter(i => i !== opt);
        refreshInteressen();
    }
}
function addFach(opt) {
    if (!selectedFaecher.includes(opt)) selectedFaecher.push(opt);
    refreshFaecher();
}
function addInteresse(opt) {
    if (!selectedInteressen.includes(opt)) selectedInteressen.push(opt);
    refreshInteressen();
}
function refreshFaecher() {
    renderTagSelector("faecherGrid", FAECHER_OPTIONS, selectedFaecher, addFach);
}
function refreshInteressen() {
    renderTagSelector("interessenGrid", INTERESSEN_OPTIONS, selectedInteressen, addInteresse);
}

function setupCustomInput(inputId, btnId, addFn) {
    const input = document.getElementById(inputId);
    const btn   = document.getElementById(btnId);
    const add = () => {
        const val = input.value.trim();
        if (!val) return;
        addFn(val);
        input.value = "";
        input.focus();
    };
    btn.addEventListener("click", add);
    input.addEventListener("keydown", e => { if (e.key === "Enter") { e.preventDefault(); add(); } });
}

function renderZeitGrid(selected = []) {
    const grid = document.getElementById("zeitGrid");
    grid.innerHTML = "";
    LERNZEITEN.forEach(zeit => {
        const div = document.createElement("div");
        div.className = "zeit-option" + (selected.includes(zeit) ? " selected" : "");
        div.innerHTML = `<i data-lucide="${ZEIT_ICONS[zeit]}" style="width:14px;height:14px;flex-shrink:0"></i>${zeit}`;
        div.addEventListener("click", () => div.classList.toggle("selected"));
        grid.appendChild(div);
    });
    initIcons();
}
function getSelectedZeiten() {
    return [...document.querySelectorAll(".zeit-option.selected")].map(el => el.textContent.trim());
}

async function load() {
    try {
        const [profil, zeiten] = await Promise.all([
            apiFetch(`/api/profil?email=${encodeURIComponent(email)}`),
            apiFetch(`/api/lernzeiten?email=${encodeURIComponent(email)}`)
        ]);
        currentProfil = profil;
        currentZeiten = zeiten || [];
        if (profil) {
            document.getElementById("name").value   = profil.name   || "";
            document.getElementById("klasse").value = profil.klasse || "";
            selectedFaecher    = profil.faecher    || [];
            selectedInteressen = profil.interessen || [];
        } else {
            selectedFaecher    = [];
            selectedInteressen = [];
        }
        renderZeitGrid(currentZeiten);
        refreshFaecher();
        refreshInteressen();
        showProfile(profil, currentZeiten);
    } catch (err) {
        output.innerHTML = `<div class="msg msg-error"><i data-lucide="alert-circle" style="width:15px;height:15px"></i> ${err.message}</div>`;
        initIcons();
    }
}

document.getElementById("saveBtn").addEventListener("click", async function() {
    const name   = document.getElementById("name").value.trim();
    const klasse = document.getElementById("klasse").value.trim();
    const zeiten = getSelectedZeiten();

    if (!name || !klasse || !selectedFaecher.length) {
        message.innerHTML = `<div class="msg msg-error"><i data-lucide="alert-circle" style="width:15px;height:15px"></i> Name, Klasse und min. ein Fach sind Pflicht.</div>`;
        initIcons();
        return;
    }
    const btn = document.getElementById("saveBtn");
    btn.disabled = true;
    btn.innerHTML = `<i data-lucide="loader" style="width:15px;height:15px"></i> Wird gespeichert...`;
    initIcons();

    try {
        await Promise.all([
            apiFetch("/api/profil", { method: "POST", body: JSON.stringify({
                    email, name, klasse, faecher: selectedFaecher, interessen: selectedInteressen
                })}),
            apiFetch("/api/lernzeiten", { method: "POST", body: JSON.stringify({ email, zeiten }) })
        ]);
        showToast("Profil erfolgreich gespeichert", "success");
        currentProfil = { name, klasse, faecher: selectedFaecher, interessen: selectedInteressen };
        currentZeiten = zeiten;
        showProfile(currentProfil, currentZeiten);
        closeEdit();
    } catch (err) {
        message.innerHTML = `<div class="msg msg-error"><i data-lucide="alert-circle" style="width:15px;height:15px"></i> ${err.message}</div>`;
        initIcons();
        showToast(err.message, "error");
    } finally {
        btn.disabled = false;
        btn.innerHTML = `<i data-lucide="save" style="width:15px;height:15px"></i> Speichern`;
        initIcons();
    }
});

function showProfile(profil, zeiten = []) {
    if (!profil) {
        output.innerHTML = `
            <div class="card">
                <div class="empty-state">
                    <i data-lucide="user-plus" style="width:40px;height:40px;color:var(--text-muted);margin-bottom:12px"></i>
                    <p>Du hast noch kein Profil erstellt.</p>
                    <button onclick="openEdit()" style="margin-top:12px">
                        <i data-lucide="plus" style="width:14px;height:14px"></i>
                        Profil erstellen
                    </button>
                </div>
            </div>`;
        initIcons();
        return;
    }
    const tags = (arr, cls) => (arr||[]).length
        ? arr.map(x => `<span class="tag ${cls}">${x}</span>`).join("")
        : `<span style="color:var(--text-muted);font-size:0.82rem">Keine angegeben</span>`;
    output.innerHTML = `
        <div class="profil-display">
            <div class="profil-display-header">
                <div style="display:flex;align-items:center;gap:14px">
                    <div class="profil-display-avatar">${getInitials(profil.name)}</div>
                    <div>
                        <div class="profil-display-name">${profil.name}</div>
                        <div class="profil-display-sub">Klasse ${profil.klasse} · ${email}</div>
                    </div>
                </div>
                <button class="btn btn-ghost btn-sm" onclick="openEdit()" title="Profil bearbeiten">
                    <i data-lucide="pencil" style="width:14px;height:14px"></i>
                </button>
            </div>
            <div class="section-label">Fächer</div>
            <div class="zeiten-display" style="margin-bottom:14px">${tags(profil.faecher, "tag-indigo")}</div>
            <div class="section-label">Interessen</div>
            <div class="zeiten-display" style="margin-bottom:14px">${tags(profil.interessen, "tag-violet")}</div>
            <div class="section-label">Lernzeiten</div>
            <div class="zeiten-display">${tags(zeiten, "")}</div>
        </div>
    `;
    initIcons();
}

setupCustomInput("faecherInput", "faecherAddBtn", addFach);
setupCustomInput("interessenInput", "interessenAddBtn", addInteresse);
load();