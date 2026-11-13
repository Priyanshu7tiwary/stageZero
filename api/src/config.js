// All settings come from environment variables (see .env.example).

export const config = {
  port: Number(process.env.PORT ?? 4000),
  corsOrigins: (process.env.CORS_ORIGIN ?? 'http://localhost:3000').split(',').map((o) => o.trim()),
  timeZone: process.env.APP_TIMEZONE ?? 'UTC',
};
