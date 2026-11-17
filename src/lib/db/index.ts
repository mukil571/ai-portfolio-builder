import "server-only";

import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";

import { env } from "@/env";

import * as schema from "./schema";

/** Neon HTTP driver: one stateless HTTPS request per query, ideal for serverless. */
const sql = neon(env.DATABASE_URL);

export const db = drizzle({ client: sql, schema });
