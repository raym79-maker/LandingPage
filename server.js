const express = require('express');
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
            fecha DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);
    }
});

// Autenticación para administración
const auth = basicAuth({
    users: { 'admin': 'smartplay2026' },
    challenge: true
});

// Ruta para guardar prospectos
app.post('/api/prospectos', (req, res) => {
    const { nombre, whatsapp, producto } = req.body;
    db.run(`INSERT INTO prospectos (nombre, whatsapp, producto) VALUES (?, ?, ?)`, 
    [nombre, whatsapp, producto || 'Demo'], (err) => {
        if (err) return res.status(500).json({ error: "Error de servidor" });
        res.status(200).json({ success: true });
    });
});

// PANEL DE ADMINISTRACIÓN
app.get('/admin-prospectos', auth, (req, res) => {
    db.all("SELECT * FROM prospectos ORDER BY fecha DESC", [], (err, rows) => {
        if (err) return res.status(500).send("Error");
        let html = `
        <body style="font-family:sans-serif;background:#0f172a;color:white;padding:40px;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:30px;">
                <h1>Registros de Demos - Smartplay</h1>
                <a href="/admin-reset-confirm" style="background:#ef4444; color:white; padding:10px 20px; text-decoration:none; font-weight:bold; border-radius:8px; font-size:12px;">BORRAR TODOS LOS REGISTROS</a>
            </div>
            <table border="1" style="width:100%; border-collapse:collapse; text-align:center; border-color:#1e293b;">
                <tr style="background:#25D366; color:black;">
                    <th style="padding:12px;">Fecha</th>
                    <th>Nombre</th>
                    <th>WhatsApp</th>
                    <th>Producto</th>
                    <th>Acción</th>
                </tr>`;
        
        rows.forEach(r => {
            const cleanPhone = r.whatsapp.replace(/\D/g,'');
            html += `
                <tr style="border-bottom:1px solid #1e293b;">
                    <td style="padding:12px;">${r.fecha}</td>
                    <td>${r.nombre}</td>
                    <td>${r.whatsapp}</td>
                    <td>${r.producto}</td>
                    <td>
                        <a href="https://wa.me/${cleanPhone}?text=Hola%20${r.nombre},%20vengo%20de%20Smartplay" 
                           style="background:#25D366; color:black; padding:5px 12px; text-decoration:none; font-weight:bold; border-radius:5px; font-size:11px;" 
                           target="_blank">Contactar</a>
                    </td>
                </tr>`;
        });

        if (rows.length === 0) {
            html += `<tr><td colspan="5" style="padding:40px; color:#64748b;">No hay registros nuevos actualmente.</td></tr>`;
        }

        res.send(html + "</table></body>");
    });
});

// RUTA DE CONFIRMACIÓN DE REINICIO
app.get('/admin-reset-confirm', auth, (req, res) => {
    res.send(`
        <body style="font-family:sans-serif;background:#0f172a;color:white;text-align:center;padding:100px;">
            <h1 style="color:#ef4444;">⚠ ¿ESTÁS SEGURO?</h1>
            <p style="margin-bottom:30px;">Esta acción eliminará todos los registros de la base de datos de forma permanente.</p>
            <div style="display:flex; justify-content:center; gap:20px;">
                <a href="/admin-prospectos" style="background:#1e293b; color:white; padding:15px 30px; text-decoration:none; border-radius:10px; font-weight:bold;">CANCELAR</a>
                <a href="/admin-reset-execute" style="background:#ef4444; color:white; padding:15px 30px; text-decoration:none; border-radius:10px; font-weight:bold;">SÍ, BORRAR TODO</a>
            </div>
        </body>
    `);
});

// EJECUCIÓN DEL REINICIO
app.get('/admin-reset-execute', auth, (req, res) => {
    db.run("DELETE FROM prospectos", (err) => {
        if (err) return res.status(500).send("Error al limpiar base de datos");
        res.redirect('/admin-prospectos');
    });
});

app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Servidor Smartplay corriendo en puerto ${PORT}`);
});
