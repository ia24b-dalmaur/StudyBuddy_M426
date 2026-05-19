const partnerList = document.getElementById("partnerList");

const testProfile = [
    {
        name: "Anna",
        faecher: ["Mathe", "Deutsch"],
        status: "Verfügbar"
    },
    {
        name: "Noah",
        faecher: ["Biologie", "Geschichte"],
        status: "Beschäftigt"
    },
    {
        name: "Mia",
        faecher: ["Englisch", "Mathe"],
        status: "Verfügbar"
    },
    {
        name: "Leo",
        faecher: ["Informatik", "Französisch"],
        status: "Verfügbar"
    }
];

const ownProfile = JSON.parse(localStorage.getItem("profile"));

if (!ownProfile) {
    partnerList.innerHTML = "<p class='error'>Bitte zuerst ein Lernprofil erstellen.</p>";
} else {
    const matches = testProfile.map(person => {
        const gemeinsameFaecher = person.faecher.filter(fach =>
            ownProfile.faecher.includes(fach)
        );

        return {
            ...person,
            gemeinsameFaecher: gemeinsameFaecher
        };
    }).filter(person => person.gemeinsameFaecher.length > 0);

    if (matches.length === 0) {
        partnerList.innerHTML = "<p>Keine passenden Lernpartner:innen gefunden.</p>";
    } else {
        matches.forEach(person => {
            const card = document.createElement("div");
            card.className = "card";

            card.innerHTML = `
                <h2>${person.name}</h2>
                <p><strong>Gemeinsame Fächer:</strong> ${person.gemeinsameFaecher.join(", ")}</p>
                <p><strong>Status:</strong> ${person.status}</p>
            `;

            partnerList.appendChild(card);
        });
    }
}