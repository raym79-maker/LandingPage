const express = require('express');
const path = require('path');
const fs = require('fs');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const basicAuth = require('express-basic-auth');

const app = express();
const PORT = process.env.PORT || 8080;

const dbDir = path.join(__dirname, 'db');
if (!fs.existsSync(dbDir)) { fs.mkdirSync(dbDir); }
const dbPath = path.join(dbDir, 'smartplay.db');

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) console.error("Error DB:", err.message);
    else {
        db.run(`CREATE TABLE IF NOT EXISTS prospectos (
            id INTEGER PRIMARY KEY AUTOINCREMENT, 
            nombre TEXT, 
            whatsapp TEXT, 
            producto TEXT, 
            fecha DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);
    }
});

app.post('/api/prospectos', (req, res) => {
    const { nombre, whatsapp, producto } = req.body;
    if (!nombre || !whatsapp) return res.status(400).json({ error: "Faltan datos" });

    db.run(`INSERT INTO prospectos (nombre, whatsapp, producto) VALUES (?, ?, ?)`, 
    [nombre, whatsapp, producto || 'Demo'], (err) => {
        if (err) return res.status(500).json({ error: "Error de servidor" });
        res.status(200).json({ success: true });
    });
});

app.get('/admin-prospectos', basicAuth({ 
    users: { 'admin': 'smartplay2026' }, 
    challenge: true 
}), (req, res) => {
    db.all("SELECT * FROM prospectos ORDER BY fecha DESC", [], (err, rows) => {
        if (err) return res.status(500).send("Error");
        let html = `<body style="font-family:sans-serif;background:#0f172a;color:white;padding:40px;">
            <h1>Registros de Demos - Smartplay</h1>
            <table border="1" style="width:100%;border-collapse:collapse;">
                <tr style="background:#25D366;color:black;"><th>Fecha</th><th>Nombre</th><th>WhatsApp</th><th>Plan Solicitado</th></tr>`;
        rows.forEach(r => {
            html += `<tr><td>${r.fecha}</td><td>${r.nombre}</td><td>${r.whatsapp}</td><td>${r.producto}</td></tr>`;
        });
        res.send(html + "</table></body>");
    });
});

app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));
app.listen(PORT, '0.0.0.0', () => console.log(`Servidor activo en puerto ${PORT}`));
