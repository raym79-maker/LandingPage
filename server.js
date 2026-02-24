const express = require('express');
const path = require('path');
const fs = require('fs');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// 1. Configuración de persistencia (Volumen de Railway)
const dataDir = '/app/data';
const dbPath = path.join(dataDir, 'iptv.db');

if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

// 2. Middlewares
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// 3. Conexión y Lógica de Base de Datos
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error("Error al abrir DB:", err.message);
    } else {
        console.log("Base de datos conectada en: " + dbPath);
        
        // Ejecutar inicialización en serie
        db.serialize(() => {
            // Tabla de Prospectos (Clientes)
            db.run(`CREATE TABLE IF NOT EXISTS prospectos (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                nombre TEXT,
                whatsapp TEXT,
                plan_interes TEXT,
                fecha DATETIME DEFAULT CURRENT_TIMESTAMP
            )`);

            // Tabla de Planes
            db.run(`CREATE TABLE IF NOT EXISTS planes (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                nombre TEXT,
                precio TEXT,
                conexiones INTEGER,
                caracteristicas TEXT
            )`);

            // Insertar planes iniciales si la tabla está vacía
            db.get("SELECT COUNT(*) as count FROM planes", (err, row) => {
                if (row && row.count === 0) {
                    const stmt = db.prepare("INSERT INTO planes (nombre, precio, conexiones, caracteristicas) VALUES (?, ?, ?, ?)");
                    stmt.run("Básico", "$9.99", 1, "SD/HD, +5000 Canales, Películas");
                    stmt.run("Estándar", "$14.99", 2, "FHD/4K, Todos los Canales, Series");
                    stmt.run("Premium", "$19.99", 3, "4K Ultra, Eventos PPV, Soporte 24/7");
                    stmt.finalize();
                    console.log("Planes iniciales creados.");
                }
            });
        });
    }
});

// --- RUTAS API ---

// Salud del servidor
app.get('/health', (req, res) => res.status(200).send('OK'));

// Obtener los planes para la Landing
app.get('/api/planes', (req, res) => {
    db.all("SELECT * FROM planes", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// Guardar nuevo prospecto
app.post('/api/prospectos', (req, res) => {
    const { nombre, whatsapp, plan } = req.body;
    const sql = `INSERT INTO prospectos (nombre, whatsapp, plan_interes) VALUES (?, ?, ?)`;
    db.run(sql, [nombre, whatsapp, plan || 'No seleccionado'], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.status(200).json({ success: true, id: this.lastID });
    });
});

/**
 * 4. PANEL DE ADMINISTRACIÓN (Ruta Secreta)
 * Aquí verás tanto los clientes como los planes actuales
 */
app.get('/admin-prospectos', (req, res) => {
    db.all("SELECT * FROM prospectos ORDER BY fecha DESC", [], (err, rows) => {
        if (err) return res.status(500).send("Error");
        
        let html = `
        <html>
        <head>
            <title>Admin IPTV</title>
            <style>
                body { font-family: sans-serif; background: #1a202c; color: white; padding: 20px; }
                table { width: 100%; border-collapse: collapse; margin-bottom: 40px; }
                th, td { padding: 10px; border: 1px solid #4a5568; text-align: left; }
                th { background: #2d3748; }
                h1 { color: #63b3ed; }
            </style>
        </head>
        <body>
            <h1>Prospectos Registrados</h1>
            <table>
                <tr><th>ID</th><th>Nombre</th><th>WhatsApp</th><th>Plan</th><th>Fecha</th></tr>`;
        
        rows.forEach(r => {
            html += `<tr><td>${r.id}</td><td>${r.nombre}</td><td>${r.whatsapp}</td><td>${r.plan_interes}</td><td>${r.fecha}</td></tr>`;
        });
        
        html += `</table></body></html>`;
        res.send(html);
    });
});

// Servir la Landing
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 5. Arranque
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Servidor con lógica de planes en puerto ${PORT}`);
});
