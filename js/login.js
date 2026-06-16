const form = document.getElementById("loginForm");
const message = document.getElementById("message");

form.addEventListener("submit", function (event) {
    event.preventDefault();

    const email    = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value.trim();

    const user = getUserByEmail(email);

    if (!user || user.password !== password) {
        message.textContent = "E-Mail oder Passwort ist falsch.";
        message.className = "msg msg-error";
        return;
    }

    sessionStorage.setItem("currentUser", email);
    window.location.href = "profil.html";
});
