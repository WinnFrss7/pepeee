import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = "https://utdzhqikrkamklgciobp.supabase.co"
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV0ZHpocWlrcmthbWtsZ2Npb2JwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM1NDEwOTIsImV4cCI6MjA2OTExNzA5Mn0.lyxAnTcnCHNvB7HGMfIKtpTtcmIwhLFPgzbsb4jARbI"

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)