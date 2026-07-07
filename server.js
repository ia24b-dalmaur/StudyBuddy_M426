const express = require("express");
const fs      = require("fs");
const path    = require("path");

const app  = express();
const PORT = 8080;
const DB   = path.join(__dirname, "db.json");

const EMPTY_DB = { users: [], profiles: [], lernzeiten: [], anfragen: [], sessions: [], einladungen: [] };
if (!fs.existsSync(DB)) {
    fs.writeFileSync(DB, JSON.stringify(EMPTY_DB, null, 2));
    console.log("db.json erstellt.");
}

app.use(express.json());
app.use(express.static(__dirname));

app.get("/", (req, res) => {
    res.redirect("/pages/login.html");
});

function readDB() {
    try {
        return JSON.parse(fs.readFileSync(DB, "utf-8"));
    } catch (e) {
        fs.writeFileSync(DB, JSON.stringify(EMPTY_DB, null, 2));
        return { ...EMPTY_DB };
    }
}
function writeDB(data) {
    fs.writeFileSync(DB, JSON.stringify(data, null, 2));
}
function apiError(res, status, message) {
    res.status(status).json({ error: message });
}

// Liefert alle E-Mails der Freunde (= angenommene Anfragen) eines Users
function getFriends(db, email) {
    return (db.anfragen || [])
        .filter(a => a.status === "accepted" && (a.from === email || a.to === email))
        .map(a => a.from === email ? a.to : a.from);
}

// Berechnet den Match-Score zwischen zwei Profilen (0–100)
function calcMatchScore(ownProfil, ownZeiten, otherProfil) {
    if (!ownProfil || !otherProfil) return 0;
    const gemFaecher    = (otherProfil.faecher    || []).filter(f => (ownProfil.faecher    || []).includes(f));
    const gemInteressen = (otherProfil.interessen || []).filter(i => (ownProfil.interessen || []).includes(i));
    const otherZeiten   = otherProfil.lernzeiten || [];
    const gemZeiten     = otherZeiten.filter(z => (ownZeiten || []).includes(z));
    const score = gemFaecher.length * 3 + gemInteressen.length * 2 + gemZeiten.length;
    const MAX   = Math.max(ownProfil.faecher?.length || 1, 1) * 3 + 4 + 6;
    return gemFaecher.length > 0 ? Math.min(100, Math.round((score / MAX) * 100)) : 0;
}

// ── AUTH ──────────────────────────────────────────────────────────
app.post("/api/register", (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) return apiError(res, 400, "E-Mail und Passwort erforderlich.");
        const db = readDB();
        if (db.users.find(u => u.email === email)) return apiError(res, 409, "E-Mail bereits registriert.");
        db.users.push({ email, password });
        writeDB(db);
        res.json({ ok: true });
    } catch (e) { apiError(res, 500, "Serverfehler: " + e.message); }
});

app.post("/api/login", (req, res) => {
    try {
        const { email, password } = req.body;
        const db   = readDB();
        const user = db.users.find(u => u.email === email && u.password === password);
        if (!user) return apiError(res, 401, "E-Mail oder Passwort falsch.");
        res.json({ ok: true, email });
    } catch (e) { apiError(res, 500, "Serverfehler: " + e.message); }
});

// ── PROFIL ────────────────────────────────────────────────────────
app.get("/api/profil", (req, res) => {
    try {
        const db = readDB();
        res.json(db.profiles.find(p => p.email === req.query.email) || null);
    } catch (e) { apiError(res, 500, e.message); }
});

app.post("/api/profil", (req, res) => {
    try {
        const { email, name, klasse, faecher, interessen } = req.body;
        if (!email) return apiError(res, 400, "E-Mail fehlt.");
        const db  = readDB();
        const idx = db.profiles.findIndex(p => p.email === email);
        const entry = { email, name, klasse, faecher, interessen };
        if (idx >= 0) db.profiles[idx] = entry;
        else          db.profiles.push(entry);
        writeDB(db);
        res.json({ ok: true });
    } catch (e) { apiError(res, 500, e.message); }
});

// ── LERNZEITEN ────────────────────────────────────────────────────
app.get("/api/lernzeiten", (req, res) => {
    try {
        const db    = readDB();
        const entry = db.lernzeiten.find(l => l.email === req.query.email);
        res.json(entry ? entry.zeiten : []);
    } catch (e) { apiError(res, 500, e.message); }
});

app.post("/api/lernzeiten", (req, res) => {
    try {
        const { email, zeiten } = req.body;
        const db  = readDB();
        const idx = db.lernzeiten.findIndex(l => l.email === email);
        if (idx >= 0) db.lernzeiten[idx].zeiten = zeiten;
        else          db.lernzeiten.push({ email, zeiten });
        writeDB(db);
        res.json({ ok: true });
    } catch (e) { apiError(res, 500, e.message); }
});

// ── MATCHING ──────────────────────────────────────────────────────
app.get("/api/matching", (req, res) => {
    try {
        const db = readDB();
        const others = db.profiles
            .filter(p => p.email !== req.query.email)
            .map(p => {
                const lz = db.lernzeiten.find(l => l.email === p.email);
                return { ...p, lernzeiten: lz ? lz.zeiten : [] };
            });
        res.json(others);
    } catch (e) { apiError(res, 500, e.message); }
});

// ── ANFRAGEN ──────────────────────────────────────────────────────
app.get("/api/anfragen", (req, res) => {
    try {
        const { email } = req.query;
        const db = readDB();
        res.json({
            eingang: db.anfragen.filter(a => a.to   === email),
            ausgang: db.anfragen.filter(a => a.from === email)
        });
    } catch (e) { apiError(res, 500, e.message); }
});

app.post("/api/anfragen", (req, res) => {
    try {
        const { from, to } = req.body;
        if (!from || !to) return apiError(res, 400, "from und to erforderlich.");
        const db = readDB();
        if (db.anfragen.find(a => a.from === from && a.to === to))
            return apiError(res, 409, "Anfrage bereits gesendet.");
        db.anfragen.push({ from, to, status: "pending", timestamp: Date.now() });
        writeDB(db);
        res.json({ ok: true });
    } catch (e) { apiError(res, 500, e.message); }
});

app.patch("/api/anfragen", (req, res) => {
    try {
        const { from, to, status } = req.body;
        const db  = readDB();
        const idx = db.anfragen.findIndex(a => a.from === from && a.to === to);
        if (idx < 0) return apiError(res, 404, "Anfrage nicht gefunden.");
        db.anfragen[idx].status = status;
        writeDB(db);
        res.json({ ok: true });
    } catch (e) { apiError(res, 500, e.message); }
});

app.get("/api/anfragen/pending-count", (req, res) => {
    try {
        const db    = readDB();
        const count = db.anfragen.filter(a => a.to === req.query.email && a.status === "pending").length;
        res.json({ count });
    } catch (e) { apiError(res, 500, e.message); }
});

// ── FREUNDE ───────────────────────────────────────────────────────
app.get("/api/freunde", (req, res) => {
    try {
        const db = readDB();
        const friends = getFriends(db, req.query.email);
        const list = friends.map(fEmail => {
            const p = db.profiles.find(p => p.email === fEmail);
            return { email: fEmail, name: p?.name || fEmail };
        });
        res.json(list);
    } catch (e) { apiError(res, 500, e.message); }
});

// ── SESSIONS ──────────────────────────────────────────────────────
app.get("/api/sessions", (req, res) => {
    try {
        const { email } = req.query;
        const db  = readDB();
        const now = Date.now();

        // Abgelaufene live-Sessions entfernen (geplante nie löschen)
        db.sessions = (db.sessions || []).filter(s =>
            s.type === "planned" || s.expiresAt > now
        );
        writeDB(db);

        const ownProfil      = db.profiles.find(p => p.email === email) || null;
        const ownZeitenEntry = db.lernzeiten.find(l => l.email === email);
        const ownZeiten      = ownZeitenEntry ? ownZeitenEntry.zeiten : [];

        const sessions = db.sessions.map(s => {
            const creatorProfil      = db.profiles.find(p => p.email === s.creator);
            const creatorZeitenEntry = db.lernzeiten.find(l => l.email === s.creator);
            const creatorZeiten      = creatorZeitenEntry ? creatorZeitenEntry.zeiten : [];
            const creatorProfilMitZeiten = creatorProfil
                ? { ...creatorProfil, lernzeiten: creatorZeiten }
                : null;

            const matchScore = email && email !== s.creator
                ? calcMatchScore(ownProfil, ownZeiten, creatorProfilMitZeiten)
                : null;

            return { ...s, creatorName: creatorProfil?.name || s.creator, matchScore };
        });

        res.json(sessions);
    } catch (e) { apiError(res, 500, e.message); }
});

app.post("/api/sessions", (req, res) => {
    try {
        const { creator, fach, thema, startAt, dauer, maxTeilnehmer, format, link } = req.body;
        if (!creator || !fach || !startAt) return apiError(res, 400, "creator, fach und startAt erforderlich.");
        const db = readDB();
        if (!db.sessions) db.sessions = [];

        db.sessions = db.sessions.filter(s => s.creator !== creator);

        const start = parseInt(startAt);
        const dauerMin = parseInt(dauer) || 60;
        const session = {
            id: Date.now().toString(),
            creator, fach, thema,
            startAt: start,
            dauer: dauerMin,
            maxTeilnehmer: parseInt(maxTeilnehmer) || 999,
            format: format === "online" ? "online" : "vor-ort",
            link: format === "online" ? (link || "") : "",
            teilnehmer: [],
            createdAt: Date.now(),
            expiresAt: start + dauerMin * 60 * 1000
        };
        db.sessions.push(session);
        writeDB(db);
        res.json({ ok: true, session });
    } catch (e) { apiError(res, 500, e.message); }
});

app.post("/api/sessions/join", (req, res) => {
    try {
        const { sessionId, email } = req.body;
        const db  = readDB();
        if (!db.sessions) db.sessions = [];
        const idx = db.sessions.findIndex(s => s.id === sessionId);
        if (idx < 0) return apiError(res, 404, "Session nicht gefunden.");
        const session = db.sessions[idx];
        if (session.creator === email) return apiError(res, 400, "Du bist der Ersteller.");
        if (session.teilnehmer.includes(email)) return apiError(res, 409, "Du bist bereits dabei.");
        if (session.teilnehmer.length >= session.maxTeilnehmer) return apiError(res, 400, "Session ist voll.");
        const friends = getFriends(db, email);
        if (!friends.includes(session.creator)) {
            return apiError(res, 403, "Nur Freunde können dieser Session beitreten.");
        }
        session.teilnehmer.push(email);
        writeDB(db);
        res.json({ ok: true });
    } catch (e) { apiError(res, 500, e.message); }
});

app.post("/api/sessions/invite", (req, res) => {
    try {
        const { sessionId, from } = req.body;
        if (!sessionId || !from) return apiError(res, 400, "sessionId und from erforderlich.");
        const db = readDB();
        if (!db.einladungen) db.einladungen = [];
        const session = (db.sessions || []).find(s => s.id === sessionId);
        if (!session) return apiError(res, 404, "Session nicht gefunden.");
        if (session.creator !== from) return apiError(res, 403, "Keine Berechtigung.");

        const friends = getFriends(db, from);
        let anzahl = 0;
        friends.forEach(friendEmail => {
            const exists = db.einladungen.find(e => e.sessionId === sessionId && e.to === friendEmail);
            if (!exists) {
                db.einladungen.push({ sessionId, from, to: friendEmail, timestamp: Date.now() });
                anzahl++;
            }
        });
        writeDB(db);
        res.json({ ok: true, anzahl, gesamt: friends.length });
    } catch (e) { apiError(res, 500, e.message); }
});

app.get("/api/einladungen", (req, res) => {
    try {
        const { email } = req.query;
        const db = readDB();
        const eigene = (db.einladungen || []).filter(e => e.to === email);
        const list = eigene.map(e => {
            const session = (db.sessions || []).find(s => s.id === e.sessionId);
            const creatorProfil = session ? db.profiles.find(p => p.email === session.creator) : null;
            return session ? { ...session, creatorName: creatorProfil?.name || session.creator } : null;
        }).filter(Boolean);
        res.json(list);
    } catch (e) { apiError(res, 500, e.message); }
});

app.delete("/api/sessions/:id", (req, res) => {
    try {
        const { email } = req.body;
        const db  = readDB();
        if (!db.sessions) db.sessions = [];
        const idx = db.sessions.findIndex(s => s.id === req.params.id);
        if (idx < 0) return apiError(res, 404, "Session nicht gefunden.");
        if (db.sessions[idx].creator !== email) return apiError(res, 403, "Keine Berechtigung.");
        db.sessions.splice(idx, 1);
        writeDB(db);
        res.json({ ok: true });
    } catch (e) { apiError(res, 500, e.message); }
});

app.use("/api/*", (req, res) => {
    apiError(res, 404, "API-Route nicht gefunden: " + req.path);
});

app.listen(PORT, () => {
    console.log(`\n✓ StudyBuddy läuft auf http://localhost:${PORT}\n`);
});