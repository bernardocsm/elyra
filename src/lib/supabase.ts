import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  'https://jcnttuhykknyfkzmmkug.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpjbnR0dWh5a2tueWZrem1ta3VnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM3OTQxNTgsImV4cCI6MjA4OTM3MDE1OH0.tTd_QgJblZOXFrs6rjUT0a8IfDGTFAyNxSqJic-2TDQ'
)
