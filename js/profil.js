protectPage();

const form = document.getElementById("profileForm");
const message = document.getElementById("message");
const output = document.getElementById("profileOutput");

const savedProfile = JSON.parse(localStorage.getItem(getProfileKey()));

if (savedProfile) {
    fillForm(savedProfile);
    showProfile(savedProfile);
}

form.addEventListener("submit", function (event) {
    event.preventDefault();

    const name = document.getElementById("name").value.trim();
    const klasse = document.getElementById("klasse").value.trim();

    const faecher = document.getElementById("faecher").value
        .split(",")
        .map(fach => fach.trim())
        .filter(fach => fach !== "");

    const interessen = document.getElementById("interessen").value
        .split(",")
        .map(interesse => interesse.trim())
        .filter(interesse => interesse !== "");

    if (name === "" || klasse === "" || faecher.length === 0) {
        message.textContent = "Bitte Name, Klasse und mindestens ein Fach eingeben.";
        message.className = "error";
        return;
    }

    const profile = {
        name: name,
        klasse: klasse,
        faecher: faecher,
        interessen: interessen
    };

    localStorage.setItem(getProfileKey(), JSON.stringify(profile));

    message.textContent = "Profil wurde gespeichert.";
    message.className = "success";

    showProfile(profile);
});

function fillForm(profile) {
    document.getElementById("name").value = profile.name;
    document.getElementById("klasse").value = profile.klasse;
    document.getElementById("faecher").value = profile.faecher.join(", ");
    document.getElementById("interessen").value = profile.interessen.join(", ");
}

function showProfile(profile) {
    output.innerHTML = `
        <div class="card">
            <h2>Gespeichertes Profil</h2>
            <p><strong>Name:</strong> ${profile.name}</p>
            <p><strong>Klasse:</strong> ${profile.klasse}</p>
            <p><strong>Fächer:</strong> ${profile.faecher.join(", ")}</p>
            <p><strong>Interessen:</strong> ${profile.interessen.join(", ")}</p>
        </div>
    `;
}