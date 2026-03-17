import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from './schema';

// WHY: usiamo neon-http invece di neon-serverless per compatibilità con
// Vercel serverless functions — non richiede WebSocket, funziona in edge runtime
const sql = neon(process.env.DATABASE_URL!);
export const db = drizzle(sql, { schema });

export * from './schema';
