import { z } from "zod";

const envSchema = z.object({
  // Database
  DATABASE_URL: z.string().min(1, "DATABASE_URL est requis"),
  // DIRECT_URL est optionnel en production (pooler only)
  DIRECT_URL: z.string().optional(),

  // Supabase (public)
  NEXT_PUBLIC_SUPABASE_URL: z.string().url("NEXT_PUBLIC_SUPABASE_URL doit être une URL valide"),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1, "NEXT_PUBLIC_SUPABASE_ANON_KEY est requis"),

  // Webhook
  WEBHOOK_SECRET: z.string().min(8, "WEBHOOK_SECRET doit faire au moins 8 caractères"),

  // Node env
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
});

type Env = z.infer<typeof envSchema>;

let _env: Env | null = null;

export function getEnv(): Env {
  if (_env) return _env;

  const parsed = envSchema.safeParse(process.env);

  if (!parsed.success) {
    const errors = parsed.error.flatten().fieldErrors;
    const messages = Object.entries(errors)
      .map(([key, msgs]) => `  • ${key}: ${(msgs ?? []).join(", ")}`)
      .join("\n");
    throw new Error(`❌ Variables d'environnement invalides:\n${messages}`);
  }

  _env = parsed.data;
  return _env;
}

// Validate on module load in server context
// This provides early error detection rather than failing on first DB call
if (typeof window === "undefined") {
  try {
    getEnv();
  } catch (e) {
    // Only warn in dev — don't crash the build
    if (process.env.NODE_ENV === "development") {
      console.warn(e);
    }
  }
}
