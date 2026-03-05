import { neon } from "@neondatabase/serverless";

export function getDB() {
  const sql = neon(process.env.DATABASE_URL!);
  return sql;
}
