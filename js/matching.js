protectPage();

const partnerList = document.getElementById("partnerList");
const matchButton = document.getElementById("matchButton");

const testProfile = [
    {
        name: "Anna",
        faecher: ["Mathe", "Deutsch"],
        interessen: ["Lesen"],
        status: "Verfügbar"
    },
    {
        name: "Noah",
        faecher: ["Biologie", "Geschichte"],
        interessen: ["Sport"],
        status: "Beschäftigt"
    },
    {
        name: "Mia",
        faecher: ["Englisch", "Mathe"],
        interessen: ["Musik"],
        status: "Verfügbar"
    },
    {
        name: "Leo",
        faecher: ["Informatik", "Französisch"],
        interessen: ["Programmieren"],
        status: "Verfügbar"
    }
];

matchButton.addEventListener("click", function () {
    partnerList.innerHTML = "";

    const ownProfile = JSON.parse(localStorage.getItem(getProfileKey()));

    if (!ownProfile) {
        partnerList.innerHTML = "<p class='error'>Bitte zuerst ein Lernprofil erstellen.</p>";
        return;
    }

    const matches = testProfile
        .map(function (person) {
            const gemeinsameFaecher = person.faecher.filter(function (fach) {
                return ownProfile.faecher.includes(fach);
            });

            return {
                ...person,
                gemeinsameFaecher: gemeinsameFaecher
            };
        })
        .filter(function (person) {
            return person.gemeinsameFaecher.length > 0;
        });

    if (matches.length === 0) {
        partnerList.innerHTML = "<p>Keine passenden Lernpartner:innen gefunden.</p>";
        return;
    }

    matches.forEach(function (person) {
        const card = document.createElement("div");
        card.className = "card";

        card.innerHTML = `
            <h2>${person.name}</h2>
            <p><strong>Gemeinsame Fächer:</strong> ${person.gemeinsameFaecher.join(", ")}</p>
            <p><strong>Interessen:</strong> ${person.interessen.join(", ")}</p>
            <p><strong>Status:</strong> ${person.status}</p>
        `;

        partnerList.appendChild(card);
    });
});