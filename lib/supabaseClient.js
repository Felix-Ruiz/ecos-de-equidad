import { createClient } from '@supabase/supabase-js';

// Se añaden valores de respaldo temporales ('https://placeholder.supabase.co') 
// para evitar que el compilador de Next.js colapse si lee las variables vacías durante el build.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder_key';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);