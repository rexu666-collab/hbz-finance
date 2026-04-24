import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://slarxfxbvliyajtxemvs.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNsYXJ4ZnhidmxpeWFqdHhlbXZzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcwMzE4MTAsImV4cCI6MjA5MjYwNzgxMH0.k8AEQxG2i3WUHGqy0iMNd1QSX6iuZerYE4UQuoS8lwo';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
