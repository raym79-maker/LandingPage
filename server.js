const express = require('express');
const path = require('path');
const fs = require('fs');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// Persistencia en Railway (Volumen 5GB)
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
            // 1. Tabla de Prospectos
            db.run(`CREATE TABLE IF NOT EXISTS prospectos (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                nombre TEXT,
                whatsapp TEXT,
                producto_interes TEXT,
                fecha DATETIME DEFAULT CURRENT_TIMESTAMP
            )`);

            // 2. Tabla de Productos
            db.run(`CREATE TABLE IF NOT EXISTS productos (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                nombre TEXT,
                precio TEXT,
                conexiones INTEGER,
                caracteristicas TEXT,
                imagen TEXT
            )`);

            // 3. Inicializar Productos (Limpiamos e insertamos para evitar el error de los logs)
            db.get("SELECT COUNT(*) as count FROM productos", (err, row) => {
                if (row && row.count === 0) {
                    const stmt = db.prepare("INSERT INTO productos (nombre, precio, conexiones, caracteristicas, imagen) VALUES (?, ?, ?, ?, ?)");
                    
                    stmt.run("M327", "$10.00", 1, "Estabilidad Premium, Canales MX, FHD/4K", "https://images.unsplash.com/photo-1593784991095-a205039470b6?w=400");
                    stmt.run("TU LATINO", "$12.00", 2, "Contenido Latam, Deportes en Vivo, Series", "https://images.unsplash.com/photo-1552667466-07770ae110d0?w=400");
                    stmt.run("LEDTV", "$15.00", 3, "Ultra HD, Multi-dispositivo, Sin Cortes", "https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?w=400");
                    stmt.run("ALFATV", "$18.00", 3, "Todo Incluido, Eventos Especiales, Soporte VIP", "https://images.unsplash.com/photo-1461151304267-38535e770f75?w=400");
                    
                    stmt.finalize();
                    console.log("Productos inicializados exitosamente.");
                }
            });
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

// Admin
app.get('/admin-prospectos', (req, res) => {
    db.all("SELECT * FROM prospectos ORDER BY fecha DESC", [], (err, rows) => {
        if (err) return res.status(500).send("Error");
        let html = `<html><head><title>Admin IPTV</title><style>body{font-family:sans-serif;background:#1a202c;color:white;padding:20px;}table{width:100%;border-collapse:collapse;}th,td{padding:12px;border:1px solid #4a5568;} .btn-ws{background:#25d366;color:black;padding:5px 10px;border-radius:5px;text-decoration:none;font-weight:bold;}</style></head><body><h1>Gestión de Ventas IPTV</h1><table><tr><th>Nombre</th><th>Producto</th><th>WhatsApp</th><th>Acción</th></tr>`;
        rows.forEach(r => {
            const tel = r.whatsapp.replace(/\D/g,''); 
            html += `<tr><td>${r.nombre}</td><td><strong>${r.producto_interes}</strong></td><td>${r.whatsapp}</td><td><a href="https://wa.me/${tel}?text=Hola%20${r.nombre},%20vimos%20tu%20interés%20en%20el%20producto%20${r.producto_interes}" class="btn-ws" target="_blank">WhatsApp</a></td></tr>`;
        });
        html += `</table></body></html>`;
        res.send(html);
    });
});

app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

app.listen(PORT, '0.0.0.0', () => console.log(`Servidor activo en puerto ${PORT}`));
