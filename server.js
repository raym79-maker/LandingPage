const express = require('express');
const path = require('path');
const fs = require('fs');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const basicAuth = require('express-basic-auth');

const app = express();
const PORT = process.env.PORT || 8080;

// Configuración de persistencia en Railway
const dataDir = '/app/data';
const dbPath = path.join(dataDir, 'iptv.db');

if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/downloads', express.static(path.join(__dirname, 'downloads')));

// Inicialización de Base de Datos
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error("Error al abrir DB:", err.message);
    } else {
        db.serialize(() => {
            db.run(`CREATE TABLE IF NOT EXISTS prospectos (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                nombre TEXT,
                whatsapp TEXT,
                producto_interes TEXT,
                fecha DATETIME DEFAULT CURRENT_TIMESTAMP
            )`);
            db.run(`CREATE TABLE IF NOT EXISTS productos (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                nombre TEXT, precio TEXT, conexiones INTEGER, caracteristicas TEXT, imagen TEXT
            )`, () => {
                db.get("SELECT COUNT(*) as count FROM productos", (err, row) => {
                    if (row && row.count === 0) {
                        const stmt = db.prepare("INSERT INTO productos (nombre, precio, conexiones, caracteristicas, imagen) VALUES (?, ?, ?, ?, ?)");
                        stmt.run("M327", "$200 MXN", 3, "2000 Canales, 40000 Películas, 20000 Series", "/img/m327.jpg");
                        stmt.run("TU LATINO", "$250 MXN", 3, "11000 Canales, 55000 Películas, 14000 Series", "/img/tu latino.jpg");
                        stmt.run("LEDTV", "$130 MXN", 3, "2400 Canales, 19000 Películas, 5000 Series", "/img/ledtv.jpg");
                        stmt.run("ALFATV", "$180 MXN", 3, "1500 Canales, 25000 Películas, 3000 Series", "/img/alfatv.jpg");
                        stmt.finalize();
                    }
                });
            });
        });
    }
});

// API para obtener productos
app.get('/api/productos', (req, res) => {
    db.all("SELECT * FROM productos", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// API para registrar prospectos (CORREGIDA)
app.post('/api/prospectos', (req, res) => {
    const { nombre, whatsapp, producto } = req.body;
    if (!nombre || !whatsapp) {
        return res.status(400).json({ error: "Nombre y WhatsApp son obligatorios" });
    }
    const sql = `INSERT INTO prospectos (nombre, whatsapp, producto_interes) VALUES (?, ?, ?)`;
    db.run(sql, [nombre, whatsapp, producto || 'Demo'], function(err) {
        if (err) {
            console.error("Error al insertar:", err.message);
            return res.status(500).json({ error: err.message });
        }
        res.status(200).json({ success: true, id: this.lastID });
    });
});

// Panel Admin
const auth = basicAuth({
    users: { 'admin': 'smartplay2026' }, 
    challenge: true,
    realm: 'SmartplayAdmin'
});

app.get('/admin-prospectos', auth, (req, res) => {
    db.all("SELECT * FROM prospectos ORDER BY fecha DESC", [], (err, rows) => {
        if (err) return res.status(500).send("Error de DB");
        let html = `<html><head><title>Admin Smartplay</title><style>
            body{font-family:sans-serif;background:#0f172a;color:white;padding:20px;}
            table{width:100%;border-collapse:collapse;margin-top:20px;background:#1e293b;}
            th,td{padding:12px;border:1px solid #334155;text-align:left;}
            th{background:#25D366;color:black;}
            .btn-ws{background:#25D366;color:black;padding:6px 12px;border-radius:6px;text-decoration:none;font-weight:bold;}
        </style></head><body>
        <h1>Panel de Ventas - Smartplay</h1>
        <table><tr><th>Fecha</th><th>Nombre</th><th>Producto</th><th>WhatsApp</th><th>Acción</th></tr>`;
        rows.forEach(r => {
            const tel = r.whatsapp.replace(/\D/g,''); 
            html += `<tr><td>${r.fecha}</td><td>${r.nombre}</td><td><strong>${r.producto_interes}</strong></td><td>${r.whatsapp}</td><td><a href="https://wa.me/${tel}?text=Hola%20${r.nombre}" class="btn-ws" target="_blank">WhatsApp</a></td></tr>`;
        });
        html += `</table></body></html>`;
        res.send(html);
    });
});

app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

app.listen(PORT, '0.0.0.0', () => console.log(`Servidor activo en puerto ${PORT}`));
