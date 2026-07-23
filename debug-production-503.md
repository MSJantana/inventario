# [OPEN] Debug Session: production-503

## Sintoma
- Em produção, a aplicação responde `503 Service Unavailable`.

## Hipóteses
1. O `frontend`/Nginx está no ar, mas o `backend` não iniciou ou está reiniciando.
2. O `backend` iniciou, mas falha no healthcheck por `DATABASE_URL` inválida ou indisponibilidade do MySQL.
3. O proxy do frontend aponta para `backend:3002`, mas o container backend não está acessível nessa porta/rede.
4. O frontend publicado está saudável, porém o upstream `/api` no Nginx está retornando indisponível.
5. A stack do Portainer subiu parcialmente e o backend ficou em erro por variável obrigatória ausente.

## Evidências Coletadas
- `GET /api/health` no backend respondeu `200` em `2026-07-23T13:12:53.254Z`.
- O backend está acessível em `localhost:3002` e respondeu em ~2ms.
- O container/frontend não apresentou logs úteis do erro no momento da coleta.
- `curl -i http://localhost:8081/` falhou com `Couldn't connect to server`.
- `curl -i http://localhost:8081/api/health` falhou com `Couldn't connect to server`.
- `curl -k -i https://inventario.asr.org.br/` respondeu `503 Service Unavailable` com `Server: Apache`.

## Status Das Hipóteses
- Hipótese 1: rejeitada parcialmente. O backend não está indisponível no momento do healthcheck.
- Hipótese 2: rejeitada parcialmente. O backend conseguiu consultar o banco e respondeu saudável.
- Hipótese 3: ainda aberta. O problema pode estar no acesso do frontend/Nginx ao serviço `backend:3002`.
- Hipótese 4: ainda aberta. O `503` pode estar vindo do proxy do frontend para `/api`.
- Hipótese 5: menos provável no momento, pois o backend está iniciado e atendendo.
- Hipótese adicional: confirmada parcialmente. O `503` está sendo gerado pelo Apache do domínio, e o frontend container não está exposto/escutando em `localhost:8081`.

## Próximos Passos
- Coletar status da stack e logs dos containers `frontend` e `backend`.
- Validar healthcheck do backend e resposta de `/api/health`.
- Confirmar se o `503` ocorre na raiz, no login ou apenas nas chamadas `/api`.
