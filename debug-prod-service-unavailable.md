[OPEN] Debug Session: prod-service-unavailable

- Symptom: `https://inventario.asr.org.br/` returns `503 Service Unavailable`
- Context: Portainer deploy, frontend Nginx proxies to backend
- Current evidence:
  - Previous upstream error showed `connect() failed (111: Connection refused)` to `backend:3002`
  - Production database `10.12.0.9` is missing `UsuarioEscola`
  - Current backend production image was prepared to run `prisma migrate deploy` on startup
  - Previous container inspection showed missing `prisma/migrations` in the running image/container
  - Backend log in production now shows `listening` on `0.0.0.0:3002`
  - Backend `/api/health` is returning HTTP `200`
  - Frontend root `/` should be served locally by Nginx and should not depend on backend availability
  - `frontend/nginx.conf` is copied into the image during frontend build, but `docker-compose.portainer.yml` only pulls the already built image

- Hypotheses:
  1. The backend container is failing on startup because the deployed image is old and does not contain `prisma/migrations`.
  2. The backend container is failing on startup because `migrate deploy` is running against production before the migration history has been resolved.
  3. The frontend container is healthy, but its Nginx upstream points to a backend service that is not listening on `3002`.
  4. The Portainer stack is using stale image tags or cached images, so the deployed backend differs from the code currently in the repository.
  5. The stack variables in Portainer are incomplete, causing backend startup failure before Express binds to `0.0.0.0:3002`.

- Next checks:
  1. Verify the running frontend image/tag in Portainer.
  2. Verify `/etc/nginx/conf.d/default.conf` inside the running frontend container.
  3. Verify frontend serves `/` locally and proxies `/api/health`.
  4. Verify the external domain proxy target points to the frontend published port and not to backend or stale upstream.
