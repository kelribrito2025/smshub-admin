import { createTRPCProxyClient, httpBatchLink } from '@trpc/client';
import superjson from 'superjson';

const API_URL = 'http://localhost:3000/api/trpc';

const trpc = createTRPCProxyClient({
  transformer: superjson,
  links: [
    httpBatchLink({
      url: API_URL,
      headers: async () => {
        // Você precisará adicionar o cookie de autenticação aqui
        return {};
      },
    }),
  ],
});

async function importAPI2Services() {
  try {
    console.log('🚀 Iniciando importação de todos os serviços da API 2...');
    console.log('📊 Markup configurado: 100%\n');
    
    const result = await trpc.sync.importAllServicesFromApi.mutate({
      apiId: 2,
      markupPercentage: 100,
    });
    
    console.log('✅ Importação concluída com sucesso!\n');
    console.log('📈 Resultados:');
    console.log(`   - API: ${result.apiName}`);
    console.log(`   - Preços importados: ${result.pricesImported}`);
    console.log(`   - Preços atualizados: ${result.pricesUpdated}`);
    console.log(`   - Serviços criados: ${result.servicesCreated}`);
    console.log(`   - Total de registros: ${result.pricesImported + result.pricesUpdated}`);
    
  } catch (error) {
    console.error('❌ Erro na importação:', error.message);
    if (error.data) {
      console.error('Detalhes:', error.data);
    }
  }
}

importAPI2Services();
