const message = document.getElementById("message");

function doRegister() {
    const email    = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value.trim();

    if (!email || !password) {
        showMsg("Bitte E-Mail und Passwort eingeben.", "error"); return;
    }
    if (!email.includes("@")) {
        showMsg("Bitte eine gültige E-Mail eingeben.", "error"); return;
    }
    if (password.length < 4) {
        showMsg("Passwort muss mindestens 4 Zeichen haben.", "error"); return;
    }
    if (getUserByEmail(email)) {
        showMsg("Diese E-Mail ist bereits registriert.", "error"); return;
    }

    saveUser({ email, password });
    showMsg("Konto erfolgreich erstellt! Weiterleitung...", "success");
    setTimeout(() => window.location.href = "login.html", 1200);
}

// Enter-Taste support
document.addEventListener("keydown", e => {
    if (e.key === "Enter") doRegister();
});

function showMsg(text, type) {
    message.textContent = text;
    message.className = "msg msg-" + type;
}
