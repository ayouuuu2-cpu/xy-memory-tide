/**
 * Read the `role` claim from a Supabase JWT without verifying the signature.
 * Used only by the gated diagnostic route — not for auth decisions.
 */
export function readJwtRoleClaim(jwt: string): string | null {
  const t = jwt.trim();
  if (!t.startsWith("eyJ")) return null;
  const parts = t.split(".");
  if (parts.length < 2) return null;
  try {
    const payloadJson = Buffer.from(parts[1], "base64url").toString("utf8");
    const payload = JSON.parse(payloadJson) as { role?: string };
    return typeof payload.role === "string" ? payload.role : null;
  } catch {
    return null;
  }
}
