#!/usr/bin/env node
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

console.log('=== Environment Test ===');
console.log('OPENAI_API_KEY:', process.env.OPENAI_API_KEY ? 'Set (***' + process.env.OPENAI_API_KEY.slice(-4) + ')' : 'NOT SET');
console.log('AOMA_ASSISTANT_ID:', process.env.AOMA_ASSISTANT_ID || 'NOT SET');
console.log('OPENAI_VECTOR_STORE_ID:', process.env.OPENAI_VECTOR_STORE_ID || 'NOT SET');
console.log('NEXT_PUBLIC_SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL || 'NOT SET');
console.log('SUPABASE_SERVICE_ROLE_KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY ? 'Set (***' + process.env.SUPABASE_SERVICE_ROLE_KEY.slice(-4) + ')' : 'NOT SET');
console.log('NODE_ENV:', process.env.NODE_ENV || 'NOT SET');
console.log('=== End Test ===');
