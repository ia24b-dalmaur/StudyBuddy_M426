const express = require("express");
const fs      = require("fs");
const path    = require("path");

const app  = express();
const PORT = 8080;
const DB   = path.join(__dirname, "db.json");

const EMPTY_DB = { users: [], profiles: [], lernzeiten: [], anfragen: [], sessions: [] };
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

// ── SESSIONS ──────────────────────────────────────────────────────
app.get("/api/sessions", (req, res) => {
    try {
        const db  = readDB();
        const now = Date.now();
        db.sessions = (db.sessions || []).filter(s => s.expiresAt > now);
        writeDB(db);
        const sessions = db.sessions.map(s => {
            const profil = db.profiles.find(p => p.email === s.creator);
            return { ...s, creatorName: profil?.name || s.creator };
        });
        res.json(sessions);
    } catch (e) { apiError(res, 500, e.message); }
});

app.post("/api/sessions", (req, res) => {
    try {
        const { creator, fach, thema, dauer, maxTeilnehmer } = req.body;
        if (!creator || !fach) return apiError(res, 400, "creator und fach erforderlich.");
        const db = readDB();
        if (!db.sessions) db.sessions = [];
        db.sessions = db.sessions.filter(s => s.creator !== creator);
        const session = {
            id: Date.now().toString(),
            creator, fach, thema,
            dauer: parseInt(dauer) || 60,
            maxTeilnehmer: parseInt(maxTeilnehmer) || 999,
            teilnehmer: [],
            createdAt: Date.now(),
            expiresAt: Date.now() + (parseInt(dauer) || 60) * 60 * 1000
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
        session.teilnehmer.push(email);
        if (!db.anfragen) db.anfragen = [];
        const exists = db.anfragen.find(a =>
            (a.from === email && a.to === session.creator) ||
            (a.from === session.creator && a.to === email)
        );
        if (!exists) {
            db.anfragen.push({ from: email, to: session.creator, status: "pending", timestamp: Date.now() });
        }
        writeDB(db);
        res.json({ ok: true });
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

// ── Start ─────────────────────────────────────────────────────────
app.listen(PORT, () => {
    console.log(`\n✓ StudyBuddy läuft auf http://localhost:${PORT}\n`);
});