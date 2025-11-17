import 'dotenv/config';
import bcrypt from "bcryptjs";
import { createClient } from "@supabase/supabase-js";

// Usa las variables TAL CUAL están en tu .env
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("❌ ERROR: Variables de entorno faltantes en .env");
  console.error("Leídas:");
  console.error("SUPABASE_URL:", SUPABASE_URL);
  console.error("SUPABASE_SERVICE_KEY:", SUPABASE_KEY);
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function main() {
  const email = "admin@admin.com";
  const password = "admin123";
  const hashedPassword = await bcrypt.hash(password, 10);

  const { error } = await supabase
    .from("admins")
    .insert({ email, password_hash: hashedPassword });

  if (error) {
    console.error("❌ Error creando admin:", error);
    return;
  }

  console.log("✅ Admin creado correctamente");
}

main();
