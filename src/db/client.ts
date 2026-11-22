import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from './schema';

const connectionString =
  process.env.DATABASE_URL ||
  'postgres://eventovivo:eventovivo_pass@localhost:5435/eventovivo';

export const pool = new Pool({ connectionString });
export const db = drizzle(pool, { schema });
