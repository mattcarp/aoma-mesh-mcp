import { validateAndLoadEnvironment } from './src/config/environment.js';
import { SupabaseService } from './src/services/supabase.service.js';
import { OpenAIService } from './src/services/openai.service.js';
import { OpenAIEmbeddings } from '@langchain/openai';
import { SupabaseUnifiedRetriever } from './src/services/retrievers/supabase-unified-retriever.js';
import { OpenAIVectorRetriever } from './src/services/retrievers/openai-vector-retriever.js';

console.log('Starting retriever initialization test...');

try {
  const config = validateAndLoadEnvironment();
  console.log('✅ Environment loaded');

  const openaiService = new OpenAIService(config);
  console.log('✅ OpenAI service created');

  const supabaseService = new SupabaseService(config);
  console.log('✅ Supabase service created');

  // Test embeddings creation
  console.log('\nTesting OpenAI embeddings...');
  const embeddings = new OpenAIEmbeddings({
    openAIApiKey: config.OPENAI_API_KEY,
    modelName: 'text-embedding-ada-002',
  });
  console.log('✅ OpenAI embeddings created');

  // Test Supabase retriever creation
  console.log('\nTesting Supabase retriever...');
  const supabaseRetriever = SupabaseUnifiedRetriever.forAll(
    supabaseService.client,
    embeddings,
    10,
    0.7
  );
  console.log('✅ Supabase retriever created');

  // Test OpenAI retriever creation
  console.log('\nTesting OpenAI retriever...');
  const openaiRetriever = OpenAIVectorRetriever.create(openaiService, 10);
  console.log('✅ OpenAI retriever created');

  // Test a simple retrieval
  console.log('\nTesting Supabase retrieval with sample query...');
  // LangChain v1.0 uses invoke() not getRelevantDocuments()
  const docs = await supabaseRetriever.invoke('How do I manage QC providers?');
  console.log(`✅ Supabase retrieval successful: ${docs.length} documents returned`);
  if (docs.length > 0) {
    console.log(`First doc source: ${docs[0].metadata.source}, type: ${docs[0].metadata.sourceType}`);
  }

  console.log('\n✅ All retriever tests passed!');

} catch (error) {
  console.error('❌ Test failed:', error);
  if (error instanceof Error) {
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
  }
  process.exit(1);
}
