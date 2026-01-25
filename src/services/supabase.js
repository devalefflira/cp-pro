import { createClient } from '@supabase/supabase-js';

// PREENCHA AQUI COM SEUS DADOS
// Vá no Painel do Supabase > Project Settings > API
const supabaseUrl = 'https://dullprawzjkvctsrhcsm.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR1bGxwcmF3emprdmN0c3JoY3NtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkzMTYxMjUsImV4cCI6MjA4NDg5MjEyNX0.EPZYjRCQFQlkeKPYuPLmq_yDK7RvDXJbTUJ03AsjpZ8';

export const supabase = createClient(supabaseUrl, supabaseKey);