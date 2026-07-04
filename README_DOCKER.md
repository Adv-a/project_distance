# Docker Django backend

Fichiers à placer à la racine du repo, au même niveau que `manage.py`.

## Local

```bash
cp .env.example .env
docker compose up --build
```

Backend : http://localhost:8000  
Healthcheck : http://localhost:8000/health/

## Production

```bash
cp .env.prod.example .env.prod
# modifier SECRET_KEY, POSTGRES_PASSWORD, domaines, origins CSRF/CORS
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build
```

Le backend est exposé en `127.0.0.1:8000`, prévu pour être derrière Nginx.

## Commandes utiles

```bash
docker compose exec backend python manage.py createsuperuser
docker compose exec backend python manage.py makemigrations
docker compose exec backend python manage.py migrate
docker compose logs -f backend
docker compose ps
```