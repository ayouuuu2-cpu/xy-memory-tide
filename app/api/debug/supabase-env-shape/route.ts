import { NextResponse } from "next/server";
import { readJwtRoleClaim } from "@/lib/supabase/jwt-role-peek";

export const runtime = "nodejs";

type KeyShape = "empty" | "jwt" | "publishable" | "sb_secret" | "other";

function classifyKey(k: string): KeyShape {
  if (!k) return "empty";
  if (k.startsWith("eyJ")) return "jwt";
  if (k.startsWith("sb_publishable_")) return "publishable";
  if (k.startsWith("sb_secret_")) return "sb_secret";
  return "other";
}

function safeHost(raw: string | undefined): string | null {
  const u = raw?.trim();
  if (!u) return null;
  try {
    return new URL(u).hostname;
  } catch {
    return "invalid_url";
  }
}

/**
 * Temporary diagnostics: set `ALLOW_SUPABASE_ENV_DIAGNOSTIC=1` on Vercel (or `.env.local`),
 * deploy, open `GET /api/debug/supabase-env-shape`, then remove the flag.
 * Does not print full keys — only hostnames + key shape + JWT `role` claim when applicable.
 */
export async function GET() {
  if (process.env.ALLOW_SUPABASE_ENV_DIAGNOSTIC !== "1") {
    return NextResponse.json(
      {
        error: "Disabled. Set ALLOW_SUPABASE_ENV_DIAGNOSTIC=1 in the same environment as this deployment, redeploy, then open this URL again.",
      },
      { status: 404 },
    );
  }

  const pubUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? "";
  const srvUrl = process.env.SUPABASE_URL?.trim() ?? "";
  const anon =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ||
    process.env.SUPABASE_ANON_KEY?.trim() ||
    "";
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || "";

  const anonShape = classifyKey(anon);
  const serviceShape = classifyKey(service);
  const anonRole = anonShape === "jwt" ? readJwtRoleClaim(anon) : null;
  const svcJwtRole = serviceShape === "jwt" ? readJwtRoleClaim(service) : null;

  const sameString = Boolean(anon && service && anon === service);

  const problems: string[] = [];
  if (!service) {
    problems.push("SUPABASE_SERVICE_ROLE_KEY_missing_or_empty");
  }
  if (!anon) {
    problems.push("anon_key_missing_on_server_set_NEXT_PUBLIC_SUPABASE_ANON_KEY_or_SUPABASE_ANON_KEY");
  }
  if (anonShape === "publishable") {
    problems.push("anon_is_sb_publishable_realtime_and_rest_will_fail");
  }
  if (serviceShape === "publishable") {
    problems.push("service_role_slot_contains_publishable_public_key");
  }
  if (sameString) {
    problems.push("anon_and_service_role_env_values_are_identical_strings");
  }
  if (serviceShape === "jwt" && svcJwtRole === "anon") {
    problems.push("service_role_env_holds_anon_jwt_use_service_role_jwt_from_dashboard");
  } else if (serviceShape === "jwt" && svcJwtRole && svcJwtRole !== "service_role") {
    problems.push(`service_key_jwt_role_is_${svcJwtRole}_expected_service_role`);
  }
  const hostPub = safeHost(pubUrl);
  const hostSrv = safeHost(srvUrl);
  if (hostPub && hostSrv && hostPub !== hostSrv) {
    problems.push("NEXT_PUBLIC_SUPABASE_URL_and_SUPABASE_URL_hostnames_differ");
  }

  return NextResponse.json({
    ok: true,
    vercelEnv: process.env.VERCEL_ENV ?? null,
    urls: {
      NEXT_PUBLIC_SUPABASE_URL_host: hostPub,
      SUPABASE_URL_host: hostSrv || hostPub,
    },
    keyShapes: {
      NEXT_PUBLIC_SUPABASE_ANON_KEY: anonShape,
      SUPABASE_SERVICE_ROLE_KEY: serviceShape,
    },
    jwtRoleClaims: {
      anon: anonRole,
      serviceKey: svcJwtRole,
    },
    lengths: {
      anon: anon.length,
      service: service.length,
    },
    problems,
    hint: "If problems is non-empty, fix env vars for this Vercel environment (Production vs Preview), redeploy, then unset ALLOW_SUPABASE_ENV_DIAGNOSTIC.",
  });
}
