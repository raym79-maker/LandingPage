const express = require('express');
const https = require('https');
const path = require('path');
const fs = require('fs');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const basicAuth = require('express-basic-auth');

const app = express();
const PORT = process.env.PORT || 8080;

// Configuración de persistencia para Railway
const dbDir = '/app/data'; 
if (!fs.existsSync(dbDir)) { 
    fs.mkdirSync(dbDir, { recursive: true }); 
}
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
            dispositivo TEXT,
            fecha DATETIME DEFAULT CURRENT_TIMESTAMP
        )`, (err) => {
            if (!err) {
                db.run(`ALTER TABLE prospectos ADD COLUMN dispositivo TEXT`, (err) => {
                    if (err) console.log("La columna dispositivo ya está lista.");
                });
            }
        });
    }
});

// ✅ Proxy WC2026 API - INTEGRADO CON LÍMITE DE 150 PARTIDOS
const WC_API_KEY = 'wc26_7ZUpLM34e6iELPUF5w4Mtt';
const WC_API_BASE = 'api.wc2026api.com';

app.get('/api/wc/:endpoint', (req, res) => {
    // Agregamos ?limit=150 para que la fase de grupos salga completa
    const options = {
        hostname: WC_API_BASE,
        path: '/' + req.params.endpoint + '?limit=150',
        method: 'GET',
        headers: { 'Authorization': 'Bearer ' + WC_API_KEY }
    };

    const request = https.request(options, (response) => {
        let data = '';
        response.on('data', chunk => data += chunk);
        response.on('end', () => {
            try {
                res.setHeader('Content-Type', 'application/json');
                res.send(data);
            } catch (e) {
                res.status(500).json({ error: 'Parse error' });
            }
        });
    });
    request.on('error', (err) => {
        console.error("Proxy Error:", err.message);
        res.status(500).json({ error: 'API Offline' });
    });
    request.end();
});

// Rutas de Prospectos (Tu lógica original)
app.post('/api/prospectos', (req, res) => {
    const { nombre, whatsapp, producto, dispositivo } = req.body;
    const query = `INSERT INTO prospectos (nombre, whatsapp, producto, dispositivo) VALUES (?, ?, ?, ?)`;
    db.run(query, [nombre, whatsapp, producto, dispositivo], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ id: this.lastID, message: "Prospecto guardado" });
    });
});

// Autenticación para ver registros
const auth = basicAuth({
    users: { 'admin': 'smartplay2026' },
    challenge: true
});

app.get('/api/prospectos', auth, (req, res) => {
    db.all(`SELECT * FROM prospectos ORDER BY fecha DESC`, [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// Servir archivos HTML
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/sitemap.xml', (req, res) => {
    res.setHeader('Content-Type', 'text/xml');
    res.sendFile(path.join(__dirname, 'public', 'sitemap.xml'));
});

app.get('/robots.txt', (req, res) => {
    res.setHeader('Content-Type', 'text/plain');
    res.sendFile(path.join(__dirname, 'public', 'robots.txt'));
});

app.get('/mundial-2026.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'mundial-2026.html'));
});

app.listen(PORT, () => {
    console.log(`Servidor Smartplay corriendo en http://localhost:${PORT}`);
});
