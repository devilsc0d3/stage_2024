
# Utilise l'image officielle Nginx
FROM nginx:alpine

# Copie le contenu du site dans le dossier web de Nginx
COPY src /usr/share/nginx/html

# Copie une configuration personnalisée pour écouter sur le port 8080
COPY nginx.conf /etc/nginx/nginx.conf

# Expose le port 8080
EXPOSE 8080
