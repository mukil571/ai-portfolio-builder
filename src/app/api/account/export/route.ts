import { connection } from "next/server";

import { getCurrentUser } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { exportAccountData } from "@/lib/db/queries/account";

/** Everything stored for the signed-in account, as a JSON download (no secrets). */
export async function GET(): Promise<Response> {
  await connection();
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Sign in first." }, { status: 401 });
  const data = await exportAccountData(getDb(), user.id);
  if (!data) return Response.json({ error: "Not found." }, { status: 404 });
  return new Response(JSON.stringify(data, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="loriyum-export-${new Date().toISOString().slice(0, 10)}.json"`,
      "Cache-Control": "no-store",
    },
  });
}
