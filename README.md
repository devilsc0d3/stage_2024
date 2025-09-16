# Déploiement du site avec Nginx et Docker

Ce projet permet de déployer un site web statique avec Nginx dans un conteneur Docker. Il est optimisé pour un accès via un sous-dossier (ex : `/portfolio`) et fonctionne sur un VPS ou via Coolify.

## Structure du projet
- Le site se trouve dans le dossier `src/`.
- Les fichiers HTML, CSS, JS et images sont organisés dans `src`.
- Le serveur Nginx est configuré pour router les pages et servir les assets correctement.

## Fichiers importants
- `Dockerfile` : construit l'image Nginx et copie le site dans le conteneur.
- `nginx.conf` : configuration personnalisée pour Nginx (routes, alias, sous-dossier).
- `docker-compose.yml` : lance le conteneur avec le bon mapping de ports.

## Déploiement local
1. Construire l'image Docker :
   ```sh
   docker build -t mon-site-nginx .
   ```
2. Lancer le conteneur :
   ```sh
   docker run -p 8080:8080 mon-site-nginx
   ```
3. Accéder au site :
   - http://localhost:8080

## Déploiement sur VPS/Coolify
- Mapper le port 80 ou 8080 selon la configuration souhaitée.
- Exemple d'accès :
  - http://thesauvo.fr/portfolio
  - http://thesauvo.fr/portfolio/contact

## Configuration Nginx
- Les routes `/contact`, `/context`, `/ticket` affichent les bonnes pages.
- Les fichiers CSS, JS et images sont servis via des alias Nginx.
- Les liens dans le HTML utilisent l'URL complète pour garantir l'affichage correct des assets.

## Astuces
- Adapter les chemins dans le HTML si le site est servi dans un sous-dossier.
- Pour HTTPS, ajouter un reverse proxy ou configurer Nginx avec SSL.

## Exemple de configuration Nginx (nginx.conf)
```nginx
server {
	listen 8080;
	server_name localhost;
	root /usr/share/nginx/html;

	location / {
		try_files $uri $uri/ /index.html;
	}
	location /contact {
		try_files $uri $uri/ /web/contact.html;
	}
	location /context {
		try_files $uri $uri/ /web/context.html;
	}
	location /ticket {
		try_files $uri $uri/ /web/ticket.html;
	}
	location /css/ {
		alias /usr/share/nginx/html/css/;
	}
	location /img/ {
		alias /usr/share/nginx/html/img/;
	}
	location /web/ {
		alias /usr/share/nginx/html/web/;
	}
	location /animation.js {
		alias /usr/share/nginx/html/animation.js;
	}
}
```

## Contact
Pour toute question, contacter Fauré Léo.
