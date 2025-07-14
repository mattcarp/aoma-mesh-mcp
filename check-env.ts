#!/usr/bin/env npx tsx

import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

console.log('Environment variables check:');
console.log('SUPABASE_URL:', process.env.SUPABASE_URL ? 'SET' : 'NOT SET');
console.log('NEXT_PUBLIC_SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL ? 'SET' : 'NOT SET');
console.log('SUPABASE_SERVICE_ROLE_KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY ? 'SET' : 'NOT SET');
console.log('OPENAI_API_KEY:', process.env.OPENAI_API_KEY ? 'SET' : 'NOT SET');
console.log('S3_ACCESS_KEY:', process.env.S3_ACCESS_KEY ? 'SET' : 'NOT SET');
console.log('S3_SECRET_ACCESS_KEY:', process.env.S3_SECRET_ACCESS_KEY ? 'SET' : 'NOT SET');
console.log('S3_REGION:', process.env.S3_REGION ? 'SET' : 'NOT SET');
console.log('S3_BUCKET:', process.env.S3_BUCKET ? 'SET' : 'NOT SET');

// Check AWS env vars with different names
console.log('\nChecking AWS variants:');
console.log('AWS_ACCESS_KEY_ID:', process.env.AWS_ACCESS_KEY_ID ? 'SET' : 'NOT SET');
console.log('AWS_SECRET_ACCESS_KEY:', process.env.AWS_SECRET_ACCESS_KEY ? 'SET' : 'NOT SET');
console.log('AWS_REGION:', process.env.AWS_REGION ? 'SET' : 'NOT SET');
