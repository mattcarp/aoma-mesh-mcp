#!/usr/bin/env tsx
/**
 * Test to see full GPT-5 completion response with AOMA context
 */

import { config } from 'dotenv';
import OpenAI from 'openai';

config();

async function testFullResponse() {
  console.log('🔍 Testing GPT-5 Full Response Structure\n');

  const client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY || '',
  });

  const query = 'How do I manage QC providers in AOMA?';
  const context = `[Source: QC_Providers_Guide.pdf (relevance: 0.93)]
AOMA QC Provider Management allows administrators to configure and manage quality control service providers. You can add new QC providers through the Admin panel by clicking QC Providers and selecting Add Provider.`;

  console.log('Query:', query);
  console.log('Context length:', context.length, 'chars\n');

  try {
    const completion = await client.chat.completions.create({
      model: 'gpt-5',
      messages: [
        {
          role: 'system',
          content: 'You are an expert AOMA system analyst. Answer questions using the provided knowledge base. Always cite sources by filename.'
        },
        {
          role: 'user',
          content: `Query: ${query}\n\nKnowledge Base:\n${context}`
        }
      ],
      temperature: 1,
      max_completion_tokens: 1000
    });

    console.log('Full completion response:');
    console.log(JSON.stringify(completion, null, 2));
    console.log('\n');
    console.log('Message content:', completion.choices[0]?.message?.content);
    console.log('Content length:', completion.choices[0]?.message?.content?.length || 0);
    console.log('Finish reason:', completion.choices[0]?.finish_reason);

  } catch (error: any) {
    console.error('Error:', error);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
  }
}

testFullResponse();
