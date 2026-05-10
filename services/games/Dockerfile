FROM oven/bun:1-alpine

WORKDIR /app

RUN apk add --no-cache curl

ENV DATABASE_URL=postgresql://placeholder:placeholder@localhost:5432/placeholder

COPY package.json ./
COPY prisma.config.ts ./
COPY prisma ./prisma
RUN bun install

COPY . .

RUN bun run prisma:generate

EXPOSE 4001

CMD ["sh", "-c", "bun run prisma:deploy && exec bun run start"]
