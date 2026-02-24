const express = require('express');
const path = require('path');
const fs = require('fs');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 8080;

// Configuración de persistencia en Railway (Volumen 5GB)
const dataDir = '/app/data';
const dbPath = path.join(dataDir, 'iptv.db');

if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error("Error al abrir DB:", err.message);
    } else {
        db.serialize(() => {
            // Tablas base
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

            // --- ACTUALIZACIÓN DE DATOS ---
            // Esta línea limpia la tabla para que se graben los nuevos datos actualizados
            db.run("DELETE FROM productos"); 

            const stmt = db.prepare("INSERT INTO productos (nombre, precio, conexiones, caracteristicas, imagen) VALUES (?, ?, ?, ?, ?)");
            
            // Configuración M327
            stmt.run(
                "M327", 
                "$200 MXN", 
                3, 
                "Mas de 2000 Canales de TV en vivo, Mas de 40000 Peliculas, Mas de 20000 Series, 3 Dispositivos", 
                "/img/m327.jpg"
            );

            // Configuración TU LATINO
            stmt.run(
                "TU LATINO", 
                "$250 MXN", 
                3, 
                "Mas de 11000 Canales de TV en vivo, Mas de 55000 Peliculas, Mas de 14000 Series, 3 Dispositivos", 
                "/img/tu latino.jpg"
            );

            // Otros planes (pendientes de actualizar a MXN si lo deseas)
            stmt.run("LEDTV", "$15.00", 3, "Resolución 4K, Multi-dispositivo, Sin Contratos, Soporte Técnico", "/img/ledtv.jpg");
            stmt.run("ALFATV", "$18.00", 3, "Contenido VIP, Eventos PPV, Actualizaciones Diarias, Ultra Estabilidad", "/img/alfatv.jpg");
            
            stmt.finalize();
            console.log("Catálogo Smartplay: M327 y TU LATINO actualizados en MXN.");
        });
    }
});

// APIs
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

// Panel Admin Smartplay
app.get('/admin-prospectos', (req, res) => {
    db.all("SELECT * FROM prospectos ORDER BY fecha DESC", [], (err, rows) => {
        if (err) return res.status(500).send("Error");
        let html = `<html><head><title>Admin Smartplay</title><style>
            body{font-family:sans-serif;background:#1a202c;color:white;padding:20px;}
            table{width:100%;border-collapse:collapse;margin-top:20px;}
            th,td{padding:12px;border:1px solid #4a5568;}
            th{background:#25D366;color:black;}
            .btn-ws{background:#25D366;color:black;padding:6px 12px;border-radius:6px;text-decoration:none;font-weight:bold;}
        </style></head><body>
        <h1>Panel de Ventas - Smartplay</h1>
        <table><tr><th>Nombre</th><th>Producto</th><th>WhatsApp</th><th>Acción</th></tr>`;
        rows.forEach(r => {
            const tel = r.whatsapp.replace(/\D/g,''); 
            html += `<tr>
                <td>${r.nombre}</td>
                <td><strong>${r.producto_interes}</strong></td>
                <td>${r.whatsapp}</td>
                <td><a href="https://wa.me/${tel}?text=Hola%20${r.nombre},%20vi%20tu%20interés%20en%20el%20producto%20${r.producto_interes}%20en%20Smartplay" class="btn-ws" target="_blank">Contactar</a></td>
            </tr>`;
        });
        html += `</table></body></html>`;
        res.send(html);
    });
});

app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Smartplay activo y actualizado en puerto ${PORT}`);
});
