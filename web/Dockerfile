FROM node:24-slim
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
# The browser calls the API directly, so the URL is baked in at build time.
ARG NEXT_PUBLIC_API_URL=http://localhost:4000
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
RUN npm run build

EXPOSE 3000
CMD ["npm", "start"]
