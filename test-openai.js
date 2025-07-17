#!/usr/bin/env node
import dotenv from 'dotenv';
import OpenAI from 'openai';

// Load environment variables
dotenv.config();

console.log('=== Testing OpenAI Connection ===');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

try {
  console.log('Testing OpenAI API connection...');
  const models = await openai.models.list();
  console.log('✅ OpenAI API connection successful');
  console.log(`Found ${models.data.length} models`);
  
  // Test the specific assistant
  if (process.env.AOMA_ASSISTANT_ID) {
    console.log('Testing AOMA Assistant...');
    const assistant = await openai.beta.assistants.retrieve(process.env.AOMA_ASSISTANT_ID);
    console.log('✅ AOMA Assistant found:', assistant.name);
  }
  
} catch (error) {
  console.error('❌ OpenAI API connection failed:', error.message);
}
