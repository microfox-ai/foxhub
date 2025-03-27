import { PrismaClient } from '@prisma/client';
// Define custom event types to handle Prisma's event system
declare global {
  namespace PrismaJson {
    type EventType = 'error'
  }
}
// Instantiate Prisma client
const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});
// Handle connection errors using type assertion
(prisma as any).$on('error', (e: Error) => {
  console.error('Prisma Client error:', e);
});
export default prisma;