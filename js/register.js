const message = document.getElementById("message");

function checkStrength(pw) {
    const fill = document.getElementById("pwFill");
    const hint = document.getElementById("pwHint");
    if (!fill) return;
    const score = [pw.length >= 6, /[A-Z]/.test(pw), /[0-9]/.test(pw), pw.length >= 10].filter(Boolean).length;
    const configs = [
        { w: "0%",   bg: "transparent", text: "Passwort eingeben" },
        { w: "25%",  bg: "#f87171",     text: "Schwach" },
        { w: "50%",  bg: "#fbbf24",     text: "Mittel" },
        { w: "75%",  bg: "#34d399",     text: "Gut" },
        { w: "100%", bg: "#6366f1",     text: "Stark" }
    ];
    const c = configs[Math.max(0, pw.length === 0 ? 0 : score + 1)];
    fill.style.width = c.w;
    fill.style.background = c.bg;
    if (hint) hint.textContent = c.text;
}

async function doRegister() {
    const email    = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value.trim();
    const btn      = document.getElementById("regBtn");

    if (!email || !password)  { showMsg("Bitte alle Felder ausfüllen.", "error"); return; }
    if (!email.includes("@")) { showMsg("Ungültige E-Mail-Adresse.", "error"); return; }
    if (password.length < 4)  { showMsg("Passwort zu kurz (min. 4 Zeichen).", "error"); return; }

    btn.disabled = true;
    btn.textContent = "Konto wird erstellt...";
    try {
        await apiFetch("/api/register", { method: "POST", body: JSON.stringify({ email, password }) });
        showMsg("Konto erstellt! Du wirst weitergeleitet...", "success");
        setTimeout(() => window.location.href = "login.html", 1300);
    } catch (err) {
        showMsg(err.message, "error");
        btn.disabled = false;
        btn.textContent = "Konto erstellen";
    }
}

function showMsg(text, type) {
    const icon = type === "success" ? "check-circle" : "alert-circle";
    message.innerHTML = `<div class="msg msg-${type}"><i data-lucide="${icon}" style="width:15px;height:15px;flex-shrink:0"></i> ${text}</div>`;
    initIcons();
}

document.addEventListener("keydown", e => { if (e.key === "Enter") doRegister(); });
