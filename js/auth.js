function getCurrentUserEmail() {
    return sessionStorage.getItem("currentUser");
}

function isLoggedIn() {
    return getCurrentUserEmail() !== null;
}

function protectPage() {
    if (!isLoggedIn()) {
        window.location.href = "login.html";
    }
}

function logout() {
    sessionStorage.removeItem("currentUser");
    window.location.href = "login.html";
}

function getProfileKey() {
    return "profile_" + getCurrentUserEmail();
}