import { PrismaClient } from '@prisma/client';

// One shared Prisma client (it holds the connection pool).
export const prisma = new PrismaClient();
