# 1. Usar una imagen oficial de Node.js ligera como base
FROM node:18-slim

# 2. Establecer el directorio de trabajo dentro del contenedor
WORKDIR /app

# 3. Copiar los archivos de configuración de dependencias
COPY package*.json ./

# 4. Instalar las dependencias de producción (incluyendo sqlite3, express, etc.)
RUN npm install --production

# 5. Copiar todo el resto del código (server.js, carpeta public, etc.)
COPY . .

# 6. Crear el directorio para la base de datos persistente de SQLite
RUN mkdir -p /app/data

# 7. Exponer el puerto 8080 que utiliza tu servidor
EXPOSE 8080

# 8. Comando oficial para arrancar tu script de 174 líneas
CMD ["node", "server.js"]
