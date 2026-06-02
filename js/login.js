const form = document.getElementById("loginForm");
const message = document.getElementById("message");

form.addEventListener("submit", function (event) {
    event.preventDefault();

    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value.trim();

    const user = JSON.parse(localStorage.getItem("user"));

    if (!user || user.email !== email || user.password !== password) {
        message.textContent = "E-Mail oder Passwort ist falsch.";
        message.className = "error";
        return;
    }

    sessionStorage.setItem("currentUser", email);
    window.location.href = "profil.html";
});