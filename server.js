const express = require('express');
const path = require('path');
const fs = require('fs');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const basicAuth = require('express-basic-auth');

const app = express();
const PORT = process.env.PORT || 8080;

const dataDir = '/app/data';
const dbPath = path.join(dataDir, 'iptv.db');

if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/downloads', express.static(path.join(__dirname, 'downloads')));

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
                nombre TEXT,
                precio TEXT,
                conexiones INTEGER,
                caracteristicas TEXT,
                imagen TEXT
            )`);
        });
    }
});

app.get('/api/productos', (req, res) => {
    db.all("SELECT * FROM productos", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.post('/api/prospectos', (req, res) => {
    const { nombre, whatsapp, producto } = req.body;
    const sql = `INSERT INTO prospectos (nombre, whatsapp, producto_interes) VALUES (?, ?, ?)`;
    db.run(sql, [nombre, whatsapp, producto || 'Demo'], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.status(200).json({ success: true, id: this.lastID });
    });
});

const auth = basicAuth({
    users: { 'admin': 'smartplay2026' }, 
    challenge: true,
    realm: 'SmartplayAdmin'
});

app.get('/admin-prospectos', auth, (req, res) => {
    db.all("SELECT * FROM prospectos ORDER BY fecha DESC", [], (err, rows) => {
        if (err) return res.status(500).send("Error");
        let html = `<html><head><title>Admin Smartplay</title><style>
            body{font-family:sans-serif;background:#1a202c;color:white;padding:20px;}
            table{width:100%;border-collapse:collapse;margin-top:20px;}
            th,td{padding:12px;border:1px solid #4a5568
