FROM node:24-slim
# Prisma's engine needs OpenSSL.
RUN apt-get update && apt-get install -y --no-install-recommends openssl && rm -rf /var/lib/apt/lists/*
WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma
# Installs dependencies; postinstall runs `prisma generate`.
RUN npm ci

COPY src ./src
EXPOSE 4000
# Bring the schema up to date, load demo data into an empty database, start the API.
CMD ["sh", "-c", "npx prisma migrate deploy && node prisma/seed.js --if-empty && node src/server.js"]
