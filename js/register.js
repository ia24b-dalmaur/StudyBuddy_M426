const form = document.getElementById("registerForm");
const message = document.getElementById("message");

form.addEventListener("submit", function (event) {
    event.preventDefault();

    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value.trim();

    if (email === "" || password === "") {
        message.textContent = "Bitte E-Mail und Passwort eingeben.";
        message.className = "error";
        return;
    }

    if (!email.includes("@")) {
        message.textContent = "Bitte eine gültige E-Mail eingeben.";
        message.className = "error";
        return;
    }

    const user = {
        email: email,
        password: password
    };

    localStorage.setItem("user", JSON.stringify(user));

    message.textContent = "Konto wurde erfolgreich erstellt.";
    message.className = "success";
});