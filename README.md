# Crash Game

Implementação full-stack de um Crash Game multiplayer em tempo real, com backend NestJS, frontend Next.js, autenticação Keycloak/OIDC, mensageria RabbitMQ, API Gateway Kong, PostgreSQL, WebSocket e algoritmo provably fair verificável.

O foco da solução foi entregar um fluxo vertical completo e validável: usuário autenticado, carteira com saldo, rodada automática, aposta, débito assíncrono, cashout/crash, liquidação, realtime e histórico.

## 1. Como Rodar

### Pré-requisitos

- Bun >= 1.x
- Docker + Docker Compose

### Setup

```bash
bun install

cp services/games/.env.example services/games/.env
cp services/wallets/.env.example services/wallets/.env

# Opcional: necessário apenas para rodar o frontend fora do Docker
cp frontend/.env.example frontend/.env
```

### Subir a stack completa

```bash
bun run docker:up
```

Esse comando sobe:

- PostgreSQL
- RabbitMQ
- Keycloak
- Kong
- Game Service
- Wallet Service
- Frontend
- Seed automático da carteira do usuário teste

### Usuário de teste

O ambiente sobe com um usuário pronto para validar o fluxo completo:

| Campo | Valor |
| --- | --- |
| Usuário | `player` |
| Senha | `player123` |
| Saldo inicial | `1000000` centavos (`R$ 10.000,00`) |

### Parar a stack

```bash
bun run docker:down
```

### Limpar containers, volumes e imagens

```bash
bun run docker:prune
```

## 2. Acessos

| Recurso | URL / Credenciais |
| --- | --- |
| Frontend | `http://localhost:3000` |
| API Gateway | `http://localhost:8000` |
| Game Service direto | `http://localhost:4001` |
| Wallet Service direto | `http://localhost:4002` |
| RabbitMQ UI | `http://localhost:15672` (`admin` / `admin`) |
| Keycloak Admin | `http://localhost:8080` (`admin` / `admin`) |

### Swagger / OpenAPI

| Serviço | Swagger UI | OpenAPI JSON |
| --- | --- | --- |
| Games | `http://localhost:4001/docs` | `http://localhost:4001/docs-json` |
| Wallets | `http://localhost:4002/docs` | `http://localhost:4002/docs-json` |
| Games via Kong | - | `http://localhost:8000/games/docs-json` |
| Wallets via Kong | - | `http://localhost:8000/wallets/docs-json` |

## 3. Comandos de Validação

### Typecheck

```bash
cd services/games && bunx tsc -p tests/tsconfig.json --noEmit
cd services/wallets && bunx tsc --noEmit
cd frontend && npm run typecheck
```

### Testes unitários

```bash
cd services/games && bun test tests/unit
cd services/wallets && bun test tests/unit
```

### Testes do frontend

```bash
cd frontend && bun test
cd frontend && npm run lint
cd frontend && npm run build
```

### E2E de API

Os testes E2E usam uma stack determinística que desliga a engine automática de rounds para controlar os cenários por endpoints internos.

```bash
bun run docker:e2e -d
cd services/games && bun test tests/e2e
```

### Validações realizadas localmente

- `bun run docker:up` validado com todos os serviços healthy.
- Login Keycloak com `player / player123` validado.
- `GET /wallets/me` via Kong validado com saldo seedado.
- `GET /games/rounds/current` via Kong validado.
- Swagger/OpenAPI validado.
- E2E de API validado com 12 cenários passando.

## 4. Stack

| Camada | Tecnologia |
| --- | --- |
| Runtime | Bun |
| Backend | NestJS + TypeScript strict |
| Frontend | Next.js App Router |
| UI | Tailwind CSS v4 + shadcn/ui |
| Server state | TanStack Query |
| Client state | React state/contexto local onde suficiente |
| Banco | PostgreSQL |
| ORM | Prisma |
| Mensageria | RabbitMQ |
| Gateway | Kong |
| Auth | Keycloak OIDC/PKCE + JWT |
| Realtime | Socket.IO via `@nestjs/websockets` |
| Docs | `@nestjs/swagger` |
| Testes | Bun test runner |
| Infra | Docker Compose |

## 5. Arquitetura

O sistema é separado em dois bounded contexts principais:

- `games`: dono de rounds, bets, ciclo do jogo, cálculo de crash, provably fair e eventos WebSocket.
- `wallets`: dono de saldo, carteira e ledger financeiro.

O frontend acessa os serviços via Kong para REST e conecta no WebSocket do `games` para realtime. `games` e `wallets` se comunicam assincronamente via RabbitMQ.

```text
Frontend (Next.js)
  | REST via Kong
  | WebSocket /game
  v
Kong
  |-----------------> Game Service
  |                    | rounds, bets, cashout, provably fair
  |                    | RabbitMQ debit/credit messages
  |-----------------> Wallet Service
                       | wallets, balances, ledger

PostgreSQL: databases games e wallets
Keycloak: OIDC/JWT
RabbitMQ: comunicação assíncrona entre contexts
```

### Comunicação entre Games e Wallets

Fluxo de aposta:

1. O jogador envia uma aposta para `games`.
2. `games` cria a bet como `PENDING`.
3. `games` envia pedido de débito para `wallets` via RabbitMQ.
4. `wallets` aprova ou rejeita o débito.
5. `games` resolve a bet como `ACCEPTED` ou `REJECTED`.

Fluxo de cashout:

1. O jogador pede cashout durante `IN_PROGRESS`.
2. `games` reserva a bet como `CASHOUT_PENDING`.
3. `games` envia pedido de crédito para `wallets`.
4. `wallets` credita o payout.
5. `games` marca a bet como `CASHED_OUT`.

Há `correlationId`, ack/nack manual e eventos de reconciliação para reduzir risco de inconsistência em entregas tardias.

## 6. Fluxo do Jogo

A engine automática do `games` conduz o ciclo:

1. `BETTING`: janela de apostas aberta.
2. `IN_PROGRESS`: multiplicador sobe continuamente.
3. `CRASHED`: crash point é atingido; apostas não sacadas perdem.
4. Nova rodada é criada após o delay configurado.

Regras implementadas:

- Uma aposta por jogador por rodada.
- Aposta mínima: `100` centavos (`R$ 1,00`).
- Aposta máxima: `100000` centavos (`R$ 1.000,00`).
- Saldo insuficiente rejeita a aposta.
- Cashout só é permitido com bet aceita e rodada em andamento.
- Valores monetários são inteiros em centavos, persistidos como `BIGINT` e expostos como string na API.

## 7. API

Todos os endpoints principais estão disponíveis via Kong em `http://localhost:8000`.

### Wallets

| Método | Endpoint | Auth | Descrição |
| --- | --- | --- | --- |
| `POST` | `/wallets` | Sim | Cria carteira do usuário autenticado |
| `GET` | `/wallets/me` | Sim | Retorna a carteira do usuário autenticado |

### Games

| Método | Endpoint | Auth | Descrição |
| --- | --- | --- | --- |
| `GET` | `/games/rounds/current` | Não | Retorna a rodada atual |
| `GET` | `/games/rounds/history?limit=20&cursor=...` | Não | Histórico paginado de rodadas |
| `GET` | `/games/rounds/:roundId/verify` | Não | Verificação provably fair da rodada |
| `GET` | `/games/bets/me?limit=20&cursor=...` | Sim | Histórico paginado de apostas do jogador |
| `POST` | `/games/bet` | Sim | Aposta na rodada atual |
| `POST` | `/games/bet/cashout` | Sim | Cashout da aposta atual |

As rotas antigas `POST /games/bets` e `POST /games/bets/me/current/cashout` continuam existindo por compatibilidade interna/frontend, mas as rotas acima seguem o contrato do desafio.

### Contratos Paginados

Históricos paginados retornam envelope:

```json
{
  "items": [],
  "nextCursor": null
}
```

- `limit` é opcional.
- Default: `20`.
- Máximo: `50`.
- `cursor` é opaco para o cliente.

## 8. Realtime

O WebSocket fica no namespace:

```text
http://localhost:4001/game
```

A conexão exige token JWT no handshake. Todas as ações do jogador continuam via REST; o WebSocket é usado para push do servidor.

Eventos principais:

- `round:betting_started`
- `round:started`
- `round:multiplier`
- `round:crashed`
- `bet:placed`
- `bet:cashed_out`

O frontend usa os eventos como fonte realtime e mantém polling apenas como fallback/reconciliação quando o socket não está conectado.

## 9. Autenticação

O frontend usa Keycloak com OIDC Authorization Code Flow + PKCE.

- Login redireciona para Keycloak.
- Callback salva a sessão no browser.
- REST usa `Authorization: Bearer <token>`.
- Backend valida JWT via JWKS do Keycloak.
- WebSocket também valida JWT no handshake.
- `playerId` é derivado do `sub` do token.
- `username` vem de `preferred_username`, com fallback para `email` ou `sub`.

O usuário de teste `player` tem `id: "player"` no realm, o que permite que o seed automático financie exatamente a carteira usada pelo JWT.

## 10. Provably Fair

Cada rodada nasce com um `serverSeed` e publica antecipadamente apenas o `serverSeedHash`.

No crash:

- o `serverSeed` é revelado;
- o crash point é recalculado;
- o endpoint `/games/rounds/:roundId/verify` retorna os dados necessários para verificação.

O cálculo usa HMAC-SHA256:

```text
hash = HMAC_SHA256(serverSeed, clientSeed || "crash-game-salt")
seed = first 52 bits do hash
crashPoint = floor((0.99 / (seed / 2^52)) * 100)
```

O resultado é limitado entre `1.00x` e `1000.00x`, representado em hundredths.

Também há uma hash chain simples de server seeds: quando existe uma rodada anterior crashada, a próxima `serverSeed` deriva de `sha256(previous.serverSeed)`. A primeira rodada usa seed aleatória.

O `clientSeed` é opcional e pode ser enviado na primeira aposta da rodada. Se nenhum client seed for enviado, o sistema usa o salt padrão `crash-game-salt`.

Para verificar uma rodada:

1. Buscar a rodada atual/histórico e guardar o `serverSeedHash`.
2. Após o crash, chamar `GET /games/rounds/:roundId/verify`.
3. Confirmar que `sha256(serverSeed) === serverSeedHash`.
4. Recalcular o crash point com o mesmo HMAC.
5. Comparar com `actualCrashPointHundredths`.

## 11. Decisões e Trade-offs

### Dinheiro em centavos

Dinheiro nunca usa ponto flutuante no domínio. Valores são inteiros em centavos, persistidos como `BIGINT` e serializados como string para JSON.

### Consistência distribuída pragmática

A solução usa RabbitMQ, `correlationId`, ack/nack manual e eventos de reconciliação. Não há outbox/inbox transacional completo. Para produção, esse seria o próximo passo natural.

### Engine single-instance

A engine automática assume uma única instância de `games` no Docker Compose. Não há lock distribuído para múltiplas instâncias conduzindo rounds simultaneamente.

### Dev tools locais

O compose local mantém dev tools habilitadas para demonstração e testes manuais:

- funding manual de wallet;
- criação/início/crash manual de rounds.

Essas rotas são protegidas por `X-Internal-Token`, mas são tratadas como ferramentas de ambiente local, não superfície pública de produção.

### Tokens no browser

O frontend é uma SPA Next.js e armazena tokens no browser para manter o fluxo PKCE simples. Uma versão mais rígida poderia mover sessão para cookies HttpOnly/server-side.

### E2E determinístico

Os testes E2E usam `docker-compose.e2e.yml` para desligar a engine automática. Isso permite controlar rounds por endpoints internos e evitar flakiness temporal sem alterar o comportamento da stack padrão.

## 12. Como a Solução Evoluiu

A implementação foi feita por fases para reduzir risco:

1. Bootstrap de Prisma, Docker e frontend.
2. Wallet com saldo em centavos e ledger.
3. Game core com rounds, bets e cashout.
4. Integração assíncrona com RabbitMQ.
5. Engine automática de rounds.
6. Realtime com WebSocket.
7. UI jogável com Tailwind v4 + shadcn/ui.
8. Keycloak/JWT no frontend, backend e WebSocket.
9. Swagger/OpenAPI.
10. Testes unitários, frontend e E2E.
11. Hardening final de Docker, CORS e configuração.

## 13. Estrutura

```text
fullstack-challenge/
  docker/
    keycloak/
    kong/
    postgres/
  frontend/
    app/
    components/
    hooks/
    lib/
    tests/
  services/
    games/
      src/
        application/
        domain/
        infrastructure/
        presentation/
      tests/
    wallets/
      src/
        application/
        domain/
        infrastructure/
        presentation/
      tests/
```

## 14. Notas de Operação

- A stack padrão deve ser usada para demonstração manual: `bun run docker:up`.
- A stack E2E deve ser usada para testes automatizados determinísticos: `bun run docker:e2e -d`.
- Se rodar serviços fora do Docker, copie os `.env.example` correspondentes.
- As portas diretas dos serviços ficam expostas para inspeção local, mas o fluxo principal da aplicação passa pelo Kong.
