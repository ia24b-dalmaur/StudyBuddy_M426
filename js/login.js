const message = document.getElementById("message");

document.getElementById("loginForm").addEventListener("submit", async function(e) {
    e.preventDefault();
    const email    = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value.trim();
    const btn      = document.getElementById("loginBtn");
    const spinner  = document.getElementById("spinner");
    const btnText  = document.getElementById("btnText");

    btn.disabled = true;
    spinner.style.display = "block";
    btnText.textContent = "Einloggen...";

    try {
        await apiFetch("/api/login", { method: "POST", body: JSON.stringify({ email, password }) });
        sessionStorage.setItem("currentUser", email);
        btnText.textContent = "Erfolgreich";
        setTimeout(() => window.location.href = "profil.html", 500);
    } catch (err) {
        message.innerHTML = `<div class="msg msg-error"><i data-lucide="alert-circle" style="width:15px;height:15px;flex-shrink:0"></i> ${err.message}</div>`;
        initIcons();
        btn.disabled = false;
        spinner.style.display = "none";
        btnText.textContent = "Einloggen";
    }
});