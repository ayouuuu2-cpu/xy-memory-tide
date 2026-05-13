/** New “publishable” public key — PostgREST + Realtime WebSocket often reject it when passed as `apikey`. */
const PUBLISHABLE_ANON_PREFIX = "sb_publishable_";

export function looksLikePublishableSupabaseAnonKey(key: string | undefined | null): boolean {
  return Boolean(key?.trim().startsWith(PUBLISHABLE_ANON_PREFIX));
}

/** Shown when anon is `sb_publishable_` and routes rely on JWT anon. */
export const USE_LEGACY_JWT_ANON_HINT =
  "当前 NEXT_PUBLIC_SUPABASE_ANON_KEY 为 sb_publishable_ 格式。请改用 Dashboard → Settings → API 里以 eyJ 开头的 legacy「anon public」JWT；Realtime 与浏览器直连 PostgREST（memory_images 等）需要该格式。";

/** Shown when server admin queries fail with auth-style errors. */
export const USE_LEGACY_JWT_SERVICE_ROLE_HINT =
  "请确认 SUPABASE_SERVICE_ROLE_KEY 为 Dashboard 中以 eyJ 开头的 legacy「service_role」JWT，且与项目 URL 对应；不要用 anon / publishable 误填。";

/** Browser anon hits RLS / missing GRANT-style denials on memory_images etc. */
export function isSupabaseRlsViolation(msg: string): boolean {
  const m = msg.trim();
  return (
    /row-level security|\brls\b|new row violates row-level security|violating.*policy/i.test(m) ||
    /permission denied for table|permission denied for relation/i.test(m) ||
    /\b42501\b/.test(m)
  );
}

/** After anon INSERT policy drift / Supabase role changes. */
export const MEMORY_IMAGES_INSERT_POLICY_REPAIR =
  "在 Supabase → SQL Editor 执行 supabase/repair_memory_images_insert_policy.sql（或 supabase/migrations/20260213120000_memory_images_gallery_rls.sql），修复 memory_images 的 SELECT/INSERT 策略。";

export function supabaseAuthishErrorMessage(msg: string): boolean {
  return /invalid.*jwt|malformed.*jwt|invalid api key|jwt expired|apikey|unauthorized|401/i.test(msg.trim());
}

/** Service role env must never be the publishable public key. */
export const WRONG_KEY_IN_SERVICE_ROLE_SLOT =
  "SUPABASE_SERVICE_ROLE_KEY 不能是 sb_publishable_（那是公钥）。请改为 Dashboard → API 里 service_role 对应的 JWT（以 eyJ 开头）。";

export function supabaseMissingRelationHint(msg: string): string {
  if (!/does not exist|schema cache|could not find the table|42P01/i.test(msg.trim())) return "";
  return " 若表尚未创建，请在 Supabase → SQL Editor 执行仓库中的 supabase/schema.sql。";
}

/** Anon JWT in service_role slot: RLS still applies; memory_images has no anon DELETE policy. */
export function supabaseRlsDeniedHint(msg: string): string {
  if (!/row-level security|\brls\b|permission denied|42501|violating.*policy/i.test(msg.trim())) return "";
  return " 若已使用 eyJ 密钥仍失败，请确认 SUPABASE_SERVICE_ROLE_KEY 来自 Dashboard 的 service_role（不是 anon）；仅 anon 时无法 DELETE / 部分写入。";
}

/** JSON `error` body for routes that use `getSupabaseAdmin()`. */
export function formatSupabaseAdminRouteError(msg: string): string {
  let out = msg;
  if (supabaseAuthishErrorMessage(msg)) out += ` ${USE_LEGACY_JWT_SERVICE_ROLE_HINT}`;
  const schema = supabaseMissingRelationHint(msg);
  if (schema) out += ` ${schema}`;
  const rls = supabaseRlsDeniedHint(msg);
  if (rls) out += ` ${rls}`;
  return out;
}
