import { SSMClient, GetParameterCommand } from "@aws-sdk/client-ssm";
import OpenAI from 'openai';

const ssmClient = new SSMClient({ region: process.env.AWS_REGION || 'us-east-2' });

// Cache for SSM parameters
const parameterCache = new Map<string, string>();

async function getSSMParameter(name: string): Promise<string> {
  if (parameterCache.has(name)) {
    return parameterCache.get(name)!;
  }
  
  try {
    const command = new GetParameterCommand({
      Name: name,
      WithDecryption: true
    });
    
    const response = await ssmClient.send(command);
    const value = response.Parameter?.Value;
    
    if (!value) {
      throw new Error(`SSM parameter ${name} not found`);
    }
    
    parameterCache.set(name, value);
    return value;
  } catch (error) {
    console.error(`Error getting SSM parameter ${name}:`, error);
    throw error;
  }
}

export async function aomaQueryTool(query: string) {
  try {
    // Get OpenAI API key from SSM
    const openaiApiKey = await getSSMParameter('/mcp-server/openai-api-key');
    const assistantId = await getSSMParameter('/mcp-server/aoma-assistant-id');
    
    const openai = new OpenAI({
      apiKey: openaiApiKey,
    });

    // Create a thread for the query
    const thread = await openai.beta.threads.create({
      messages: [
        {
          role: "user",
          content: query
        }
      ]
    });

    // Run the assistant
    const run = await openai.beta.threads.runs.create(thread.id, {
      assistant_id: assistantId,
    });

    // Wait for completion
    let runStatus = await openai.beta.threads.runs.retrieve(thread.id, run.id);
    
    while (runStatus.status === 'queued' || runStatus.status === 'in_progress') {
      await new Promise(resolve => setTimeout(resolve, 1000));
      runStatus = await openai.beta.threads.runs.retrieve(thread.id, run.id);
    }

    if (runStatus.status === 'completed') {
      // Get the messages
      const messages = await openai.beta.threads.messages.list(thread.id);
      const assistantMessage = messages.data.find(msg => msg.role === 'assistant');
      
      if (assistantMessage && assistantMessage.content[0]?.type === 'text') {
        return {
          content: [
            {
              type: "text",
              text: assistantMessage.content[0].text.value
            }
          ]
        };
      }
    }

    return {
      content: [
        {
          type: "text",
          text: `Query failed with status: ${runStatus.status}`
        }
      ]
    };

  } catch (error) {
    console.error('Error in AOMA query tool:', error);
    return {
      content: [
        {
          type: "text",
          text: `Error querying AOMA: ${error instanceof Error ? error.message : 'Unknown error'}`
        }
      ]
    };
  }
}
