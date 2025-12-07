import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { publicProcedure, protectedProcedure, router } from '../_core/trpc';
import { 
  getPriceByCountryAndService,
  getPriceByCountryServiceAndApi,
  getAllPrices,
  createActivation as dbCreateActivation,
  getActivationById,
  updateActivation,
  getActivationsByUser,
  getActivationsWithSms,
  getAllServices,
  getAllCountries,
  getSetting,
  toggleFavorite,
  getCustomerFavorites,
  createSmsMessage,
  getSmsMessagesByActivation,
} from '../db-helpers';
import { getDb } from '../db';
import { 
  getCustomerByEmail, 
  getCustomerByPin,
  getCustomerById,
  createCustomer,
  addBalance,
  updateCustomer,
} from '../customers-helpers';
import { SMSHubClient } from '../smshub-client';
import { SMS24hClient } from '../sms24h-client';
import { getServiceApiOptions } from '../service-api-options-helper';
import { 
  getRecommendedSupplier, 
  getCachedRecommendation, 
  setCachedRecommendation 
} from '../recommendation-helpers';
import { operators as operatorsTable, smsApis } from '../../drizzle/schema';
import { eq } from 'drizzle-orm';

export const storeRouter = router({
  // Autenticação de clientes
  login: publicProcedure
    .input(z.object({
      email: z.string().email(),
    }))
    .mutation(async ({ input }) => {
      const customer = await getCustomerByEmail(input.email);
      if (!customer) {
        throw new Error('Cliente não encontrado');
      }
      return customer;
    }),

  register: publicProcedure
    .input(z.object({
      email: z.string().email(),
      password: z.string().min(8),
    }))
    .mutation(async ({ input }) => {
      // Verificar se já existe
      const existing = await getCustomerByEmail(input.email);
      if (existing) {
        throw new Error('Email já cadastrado');
      }

      // Hash da senha
      const hashedPassword = await bcrypt.hash(input.password, 10);

      // Criar novo cliente com senha
      const customer = await createCustomer({ 
        email: input.email, 
        name: input.email.split('@')[0], // Usa parte do email como nome inicial
        password: hashedPassword,
      });
      return customer;
    }),

  // Obter dados do cliente
  getCustomer: publicProcedure
    .input(z.object({
      customerId: z.number(),
    }))
    .query(async ({ input }) => {
      // ✅ CORREÇÃO: Retornar null ao invés de erro quando cliente não existe
      // Isso permite que admins acessem /store sem erro (mas sem autenticação)
      const customer = await getCustomerById(input.customerId);
      return customer || null;
    }),

  // Listar serviços disponíveis
  getServices: publicProcedure.query(async () => {
    const allServices = await getAllServices(true); // activeOnly = true
    
    // Adicionar flag isNew para serviços criados nos últimos 7 dias
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const sevenDaysAgoTimestamp = sevenDaysAgo.getTime();
    
    return allServices.map(service => {
      // Converter createdAt para timestamp para comparação confiável
      const createdAtTimestamp = service.createdAt instanceof Date 
        ? service.createdAt.getTime()
        : new Date(service.createdAt).getTime();
      
      return {
        ...service,
        isNew: createdAtTimestamp > sevenDaysAgoTimestamp,
      };
    });
  }),

  // Listar países disponíveis
  getCountries: publicProcedure.query(async () => {
    return await getAllCountries(true); // activeOnly = true
  }),

  // Obter preços por país e serviço (agrupados por API)
  getPrices: publicProcedure
    .input(z.object({
      countryId: z.number().optional(),
      serviceId: z.number().optional(),
    }))
    .query(async ({ input }) => {
      // Retornar todos os preços (apenas países válidos)
      const allPrices = await getAllPrices();
      const validPrices = allPrices.filter(p => 
        p.country?.smshubId && 
        p.country.smshubId !== 999 && 
        p.service?.smshubCode
      );

      // Agrupar por (countryId, serviceId) e incluir todas as APIs disponíveis
      const grouped = new Map<string, any>();
      
      for (const item of validPrices) {
        const key = `${item.price.countryId}-${item.price.serviceId}`;
        
        if (!grouped.has(key)) {
          grouped.set(key, {
            country: item.country,
            service: item.service,
            apiOptions: [],
          });
        }
        
        grouped.get(key)!.apiOptions.push({
          apiId: item.price.apiId,
          apiName: item.api?.name || 'API Padrão',
          apiPriority: item.api?.priority ?? 999,
          price: item.price.ourPrice,
          available: item.price.quantityAvailable,
        });
      }
      
      // Ordenar apiOptions por prioridade (menor número = maior prioridade)
      const result = Array.from(grouped.values());
      result.forEach(item => {
        item.apiOptions.sort((a: any, b: any) => a.apiPriority - b.apiPriority);
      });
      
      return result;
    }),

  // Comprar número SMS
  purchaseNumber: publicProcedure
    .input(z.object({
      customerId: z.number(),
      countryId: z.number(),
      serviceId: z.number(),
      operator: z.string().optional(), // Optional operator filter (e.g., 'claro', 'vivo', 'tim')
      apiId: z.number().optional(), // Optional API ID to use specific API
    }))
    .mutation(async ({ input }) => {
      // Import operation lock manager
      const { operationLockManager } = await import('../operation-lock');
      const { notificationsManager } = await import('../notifications-manager');

      // Execute with exclusive lock per customer to prevent race conditions
      return await operationLockManager.executeWithLock(input.customerId, async () => {
        // 0. Broadcast operation started to all customer's devices
        notificationsManager.sendToCustomer(input.customerId, {
          type: 'operation_started',
          title: 'Operação em andamento',
          message: 'Comprando número SMS...',
          data: { operation: 'purchase', customerId: input.customerId },
        });

        try {
        // 1. Verificar saldo do cliente
        const customer = await getCustomerById(input.customerId);
      if (!customer) {
        throw new Error('Cliente não encontrado');
      }

      // 2. Obter preço (considerando API específica se fornecida)
      let price;
      if (input.apiId) {
        price = await getPriceByCountryServiceAndApi(input.countryId, input.serviceId, input.apiId);
        if (!price) {
          throw new Error(`Preço não encontrado para este serviço na API selecionada (API ID: ${input.apiId})`);
        }
      } else {
        price = await getPriceByCountryAndService(input.countryId, input.serviceId);
        if (!price) {
          throw new Error('Preço não encontrado para este serviço');
        }
      }

      if (customer.balance < price.price.ourPrice) {
        throw new Error('Saldo insuficiente');
      }

      // 2.5. Validar limite de pedidos simultâneos por API
      // Determinar qual API será usada para validação
      let targetApiId = input.apiId || price.price.apiId;
      
      if (targetApiId) {
        const { getApiById } = await import('../apis-helpers');
        const targetApi = await getApiById(targetApiId);
        
        if (targetApi && targetApi.maxSimultaneousOrders > 0) {
          // Contar pedidos ativos do cliente nesta API
          const db = await getDb();
          if (!db) throw new Error('Database not available');
          
          const { activations } = await import('../../drizzle/schema');
          const { eq, and, inArray } = await import('drizzle-orm');
          
          const activeOrders = await db
            .select()
            .from(activations)
            .where(
              and(
                eq(activations.userId, input.customerId),
                eq(activations.apiId, targetApiId),
                inArray(activations.status, ['pending', 'active'])
              )
            );
          
          const currentActiveCount = activeOrders.length;
          
          if (currentActiveCount >= targetApi.maxSimultaneousOrders) {
            // Log tentativa bloqueada
            console.warn(`[ABUSE CONTROL] Customer ${input.customerId} exceeded simultaneous orders limit for API ${targetApi.name} (${currentActiveCount}/${targetApi.maxSimultaneousOrders})`);
            
            throw new Error(
              `Limite de pedidos simultâneos atingido para ${targetApi.name}. ` +
              `Você tem ${currentActiveCount} pedidos ativos e o limite é ${targetApi.maxSimultaneousOrders}. ` +
              `Aguarde a conclusão ou cancelamento de pedidos existentes.`
            );
          }
          
          console.log(`[ABUSE CONTROL] Customer ${input.customerId} has ${currentActiveCount}/${targetApi.maxSimultaneousOrders} active orders on API ${targetApi.name}`);
        }
      }

      // 3. Obter API para usar (específica ou da tabela de preços)
      let client: SMSHubClient | SMS24hClient;
      let selectedApiId = input.apiId;
       // Se o usuário forneceu apiId explícito, buscar essa API
      if (input.apiId) {
        const { getApiById } = await import('../apis-helpers');
        const api = await getApiById(input.apiId);
        if (!api) {
          throw new Error(`API não encontrada (ID: ${input.apiId})`);
        }
        if (!api.active) {
          throw new Error(`API ${api.name} não está ativa`);
        }
        console.log(`[purchaseNumber] Using user-selected API: ${api.name} (ID: ${api.id}, URL: ${api.url})`);
        // Use correct client based on apiId
        if (api.id === 2) {
          // API ID 2 = SMS24h
          client = new SMS24hClient(api.token, api.url);
        } else {
          // API ID 1 = SMSHub (default)
          client = new SMSHubClient(api.token, api.url);
        }
        selectedApiId = api.id;} 
      // Se não foi fornecido apiId mas o preço tem apiId associado, buscar essa API
      else if (price.price.apiId) {
        const { getApiById } = await import('../apis-helpers');
        const api = await getApiById(price.price.apiId);
        if (!api) {
          throw new Error(`API do preço não encontrada (ID: ${price.price.apiId})`);
        }
        if (!api.active) {
          throw new Error(`API ${api.name} não está ativa`);
        }
        console.log(`[purchaseNumber] Using API from price record: ${api.name} (ID: ${api.id}, URL: ${api.url})`);
        // Use correct client based on apiId
        if (api.id === 2) {
          // API ID 2 = SMS24h
          client = new SMS24hClient(api.token, api.url);
        } else {
          // API ID 1 = SMSHub (default)
          client = new SMSHubClient(api.token, api.url);
        }
        selectedApiId = api.id;
      }
      // Fallback: usar API padrão das configurações
      else {
        const apiKeySetting = await getSetting('smshub_api_key');
        if (!apiKeySetting?.value) {
          throw new Error('SMSHub API key not configured');
        }
        console.log('[purchaseNumber] Using default API from settings');
        client = new SMSHubClient(apiKeySetting.value);
      }

      // 4. Comprar número na API SMSHub
      
      console.log('[purchaseNumber] Calling SMSHub API with:', {
        service: price.service?.smshubCode,
        country: price.country?.smshubId,
        countryName: price.country?.name
      });
      
      const smshubResponse = await client.getNumber(
        price.service?.smshubCode || '',
        price.country?.smshubId || 0,
        input.operator
      );
      
      console.log('[purchaseNumber] SMSHub response:', smshubResponse);

      if (!smshubResponse.activationId || !smshubResponse.phoneNumber) {
        throw new Error('Falha ao obter número da API SMSHub');
      }

      // Detectar formato inválido: activationId == phoneNumber
      const isInvalidFormat = smshubResponse.activationId === smshubResponse.phoneNumber;
      if (isInvalidFormat) {
        console.warn('[purchaseNumber] INVALID FORMAT DETECTED: activationId == phoneNumber');
        console.warn('[purchaseNumber] API returned:', smshubResponse);
        console.warn('[purchaseNumber] Will use database ID as fallback');
      }

      // 5. Criar ativação no banco
      const activation = await dbCreateActivation({
        userId: input.customerId,
        countryId: input.countryId,
        serviceId: input.serviceId,
        smshubActivationId: smshubResponse.activationId,
        apiId: input.apiId || null,
        phoneNumber: smshubResponse.phoneNumber,
        status: 'active',
        smshubCost: price.price.smshubPrice,
        sellingPrice: price.price.ourPrice,
        profit: price.price.ourPrice - price.price.smshubPrice,
      });

        // 6. Debitar saldo do cliente e criar transação
        await addBalance(
          input.customerId,
          -price.price.ourPrice,
          'purchase',
          `Compra de número SMS - ${price.service?.name || 'Unknown'} (${price.country?.name || 'Unknown'})`,
          undefined,
          activation.id
        );

        // Broadcast operation completed
        notificationsManager.sendToCustomer(input.customerId, {
          type: 'operation_completed',
          title: 'Compra realizada',
          message: 'Número SMS adquirido com sucesso',
          data: { operation: 'purchase', customerId: input.customerId },
        });

        return {
          activationId: activation.id,
          phoneNumber: smshubResponse.phoneNumber,
          service: price.service?.name || 'Unknown',
          country: price.country?.name || 'Unknown',
          price: price.price.ourPrice,
        };
        } catch (error: any) {
          // Broadcast operation failed
          notificationsManager.sendToCustomer(input.customerId, {
            type: 'operation_failed',
            title: 'Erro na compra',
            message: error.message || 'Falha ao comprar número SMS',
            data: { operation: 'purchase', customerId: input.customerId },
          });
          throw error;
        }
      });
    }),

  // Listar ativações ativas do cliente (apenas < 20 minutos)
  getMyActivations: publicProcedure
    .input(z.object({
      customerId: z.number(),
    }))
    .query(async ({ input }) => {
      console.log('[getMyActivations] customerId:', input.customerId);
      const results = await getActivationsByUser(input.customerId);
      console.log('[getMyActivations] Total results:', results.length);
      const now = new Date();
      const twentyMinutesAgo = new Date(now.getTime() - 20 * 60 * 1000);
      
      const filtered = results
        .filter((r: any) => {
          const activation = r.activation;
          const isActive = activation.status === 'active' || activation.status === 'pending';
          const isRecent = new Date(activation.createdAt) > twentyMinutesAgo;
          console.log(`[getMyActivations] Activation ${activation.id}: isActive=${isActive}, isRecent=${isRecent}, createdAt=${activation.createdAt}`);
          return isActive && isRecent;
        })
        .map((r: any) => ({
          ...r.activation,
          service: r.service,
          country: r.country
        }));
      
      console.log('[getMyActivations] Filtered results:', filtered.length);

      // 🕒 VERIFICAÇÃO PRÉVIA: Marcar ativações antigas como expiradas ANTES do polling
      // Isso garante que ativações > 20min sejam processadas mesmo sem chamar API externa
      for (const r of results) {
        const activation = r.activation;
        const isActive = activation.status === 'active' || activation.status === 'pending';
        const activationAge = now.getTime() - new Date(activation.createdAt).getTime();
        const isExpired = activationAge > 20 * 60 * 1000; // > 20 minutos
        const hasNoCode = !activation.smsCode;
        
        if (isActive && isExpired && hasNoCode) {
          console.log(`[getMyActivations] ⚠️ PRE-CHECK: Activation ${activation.id} is expired (age=${Math.round(activationAge / 60000)}min, status=${activation.status})`);
          
          // Marcar como expirado
          await updateActivation(activation.id, {
            status: 'expired',
          });
          
          // Reembolsar cliente automaticamente
          if (activation.userId) {
            const refundAmount = activation.sellingPrice;
            
            try {
              const { balanceBefore, balanceAfter } = await addBalance(
                activation.userId,
                refundAmount,
                'refund',
                `Reembolso automático - Ativação expirada #${activation.id} (${activation.phoneNumber})`,
                undefined,
                activation.id
              );
              
              console.log(`[getMyActivations] ✅ PRE-CHECK REFUND: R$ ${(refundAmount / 100).toFixed(2)} for customer ${activation.userId} (balance: ${balanceBefore/100} -> ${balanceAfter/100})`);
            } catch (error) {
              console.error(`[getMyActivations] Error processing refund for activation ${activation.id}:`, error);
            }
          }
        }
      }

      // Fazer polling automático de cada ativação ativa
      const apiKeySetting = await getSetting('smshub_api_key');
      if (apiKeySetting?.value) {
        // Get database connection
        const db = await getDb();
        
        // Get API 1 configuration (SMSHub principal)
        const api1Results = db ? await db.select().from(smsApis).where(eq(smsApis.id, 1)).limit(1) : [];
        const api1 = api1Results && api1Results.length > 0 ? api1Results[0] : null;
        const client1 = api1 ? new SMSHubClient(api1.token, api1.url) : new SMSHubClient(apiKeySetting.value);
        
        // Get API 2 configuration (SMS24h)
        const api2Results = db ? await db.select().from(smsApis).where(eq(smsApis.id, 2)).limit(1) : [];
        const api2 = api2Results && api2Results.length > 0 ? api2Results[0] : null;
        const client2 = api2 ? new SMSHubClient(api2.token, api2.url) : null;
        
        // OPTIMIZATION: Cache getCurrentActivations para API 2 (SMS24h)
        // Buscar lista apenas uma vez se houver ativações com formato inválido
        let api2Cache: Array<{ activationId: string; phoneNumber: string; smsCode?: string; status: string }> | null = null;
        const hasApi2InvalidFormat = filtered.some((a: any) => 
          a.apiId === 2 && a.smshubActivationId === a.phoneNumber
        );
        
        if (hasApi2InvalidFormat && api2) {
          console.log('[getMyActivations] Fetching getCurrentActivations for API 2 (cache optimization)');
          const { getCurrentActivations } = await import('../smshub-client');
          api2Cache = await getCurrentActivations(api2.token, api2.url);
          console.log(`[getMyActivations] API 2 cache loaded: ${api2Cache.length} active numbers`);
        }
        
        for (const activation of filtered) {
          try {
            console.log(`[getMyActivations] Checking activation ${activation.id}: apiId=${activation.apiId}, smshubId=${activation.smshubActivationId}, phone=${activation.phoneNumber}`);
            
            // Detectar formato inválido: activationId == phoneNumber
            const isInvalidFormat = activation.smshubActivationId === activation.phoneNumber;
            
            // CASO 1: Formato inválido (activationId == phoneNumber) - Usar cache getCurrentActivations
            if (isInvalidFormat && activation.apiId === 2 && api2Cache) {
              console.log(`[getMyActivations] Using cache for API 2 activation ${activation.id} (invalid format)`);
              
              // Match por phoneNumber no cache
              const match = api2Cache.find(item => 
                item.phoneNumber === activation.phoneNumber || 
                item.phoneNumber === activation.phoneNumber.replace(/^\+/, '')
              );
              
              if (match && match.smsCode && !activation.smsCode) {
                console.log(`[getMyActivations] SMS FOUND in cache for activation ${activation.id}: ${match.smsCode}`);
                
                // Verificar se SMS já existe na tabela sms_messages
                const existingSms = await getSmsMessagesByActivation(activation.id);
                const smsExists = existingSms.some((sms: any) => sms.code === match.smsCode);
                
                if (!smsExists) {
                  // Inserir novo SMS na tabela sms_messages
                  await createSmsMessage({
                    activationId: activation.id,
                    code: match.smsCode,
                    receivedAt: new Date(),
                  });
                  console.log(`[getMyActivations] SMS saved to sms_messages table: ${match.smsCode}`);
                }
                
                await updateActivation(activation.id, {
                  smsCode: match.smsCode,
                  // NÃO mudar status - ativação continua ativa até usuário clicar em Concluir
                });
                
                // Atualizar objeto no array (manter status ativo)
                activation.smsCode = match.smsCode;
              } else {
                console.log(`[getMyActivations] No SMS in cache for phone ${activation.phoneNumber}`);
              }
              
              continue; // Pular polling padrão
            }
            
            // CASO 2: Formato válido - Usar polling normal com activationId (funciona para ambas as APIs)
            if (!isInvalidFormat && activation.smshubActivationId) {
              console.log(`[getMyActivations] Polling activation ${activation.id} (API ${activation.apiId}) with smshubActivationId=${activation.smshubActivationId}`);
              
              // Usar cliente correto por apiId
              const currentClient = activation.apiId === 1 ? client1 : (activation.apiId === 2 && client2 ? client2 : client1);
              
              // Verificar status na API SMSHub (ambas as APIs usam o mesmo protocolo)
              console.log(`[getMyActivations] Calling getStatus for activation ${activation.id} with smshubId=${activation.smshubActivationId}`);
              const smshubStatus = await currentClient.getStatus(activation.smshubActivationId!);
              console.log(`[getMyActivations] API Response for activation ${activation.id}:`, JSON.stringify(smshubStatus));
              
              // Atualizar status se mudou
              // Aceitar tanto "received" quanto "retry" (API retorna retry após múltiplas solicitações)
              // Código pode vir em "code" ou "lastCode"
              const smsCode = smshubStatus.code || smshubStatus.lastCode;
              const hasValidStatus = smshubStatus.status === 'received' || smshubStatus.status === 'retry';
              
              if (hasValidStatus && smsCode && smsCode !== activation.smsCode) {
                console.log(`[getMyActivations] SMS RECEIVED for activation ${activation.id}: ${smsCode} (status=${smshubStatus.status})`);
                
                // Verificar se SMS já existe na tabela sms_messages
                const existingSms = await getSmsMessagesByActivation(activation.id);
                const smsExists = existingSms.some((sms: any) => sms.code === smsCode);
                
                if (!smsExists) {
                  // Inserir novo SMS na tabela sms_messages
                  await createSmsMessage({
                    activationId: activation.id,
                    code: smsCode,
                    receivedAt: new Date(),
                  });
                  console.log(`[getMyActivations] SMS saved to sms_messages table: ${smsCode}`);
                }
                
                await updateActivation(activation.id, {
                  smsCode: smsCode,
                  smshubStatus: smshubStatus.status, // Salvar status da API ("received" ou "retry")
                  // NÃO mudar status - ativação continua ativa até usuário clicar em Concluir
                });
                
                // Atualizar objeto no array (manter status ativo)
                activation.smsCode = smsCode;
                activation.smshubStatus = smshubStatus.status;
              }
              
              // 🔄 DETECÇÃO DE EXPIRAÇÃO AUTOMÁTICA
              // Se ativação tem > 20 minutos e ainda está aguardando SMS (sem código)
              const activationAge = now.getTime() - new Date(activation.createdAt).getTime();
              const isExpired = activationAge > 20 * 60 * 1000; // > 20 minutos
              const isWaiting = smshubStatus.status === 'waiting' || smshubStatus.status === 'retry';
              const hasNoCode = !activation.smsCode && !smsCode;
              
              if (isExpired && isWaiting && hasNoCode) {
                console.log(`[getMyActivations] ⚠️ ACTIVATION EXPIRED: ${activation.id} (age=${Math.round(activationAge / 60000)}min, status=${smshubStatus.status})`);
                
                // Marcar como expirado
                await updateActivation(activation.id, {
                  status: 'expired',
                  smshubStatus: smshubStatus.status,
                });
                
                // Reembolsar cliente automaticamente
                if (activation.userId) {
                  const refundAmount = activation.sellingPrice;
                  
                  // Usar addBalance que já cria a transação automaticamente
                  const { balanceBefore, balanceAfter } = await addBalance(
                    activation.userId,
                    refundAmount, // Valor positivo para reembolso
                    'refund',
                    `Reembolso automático - Ativação expirada #${activation.id} (${activation.phoneNumber})`,
                    undefined, // createdBy (sistema)
                    activation.id // relatedActivationId
                  );
                  
                  console.log(`[getMyActivations] ✅ REFUND PROCESSED: R$ ${(refundAmount / 100).toFixed(2)} for customer ${activation.userId} (activation ${activation.id}, balance: ${balanceBefore/100} -> ${balanceAfter/100})`);
                }
              }
            }
          } catch (error) {
            console.error(`[getMyActivations] Error polling activation ${activation.id}:`, error);
          }
        }
      }
      
      return filtered;
    }),

  // Listar histórico de ativações do cliente (> 20 minutos ou finalizadas)
  getMyHistory: publicProcedure
    .input(z.object({
      customerId: z.number(),
      page: z.number().min(1).default(1),
      limit: z.number().min(1).max(100).default(20),
    }))
    .query(async ({ input }) => {
      console.log(`[getMyHistory] customerId=${input.customerId}, page=${input.page}`);
      const results = await getActivationsWithSms(input.customerId);
      console.log(`[getMyHistory] Total activations from DB: ${results.length}`);
      const now = new Date();
      const twentyMinutesAgo = new Date(now.getTime() - 20 * 60 * 1000);
      
      const filtered = results
        .filter((r: any) => {
          const activation = r.activation;
          const isFinished = activation.status === 'completed' || activation.status === 'cancelled' || activation.status === 'failed' || activation.status === 'expired';
          const isExpired = new Date(activation.createdAt) <= twentyMinutesAgo;
          console.log(`[getMyHistory] Activation ${activation.id}: isFinished=${isFinished}, isExpired=${isExpired}, status=${activation.status}`);
          return isFinished || isExpired;
        })
        .map((r: any) => ({
          ...r.activation,
          service: r.service,
          country: r.country,
          smsMessages: r.smsMessages || [], // Array of SMS messages
        }));
      
      console.log(`[getMyHistory] Filtered results: ${filtered.length}`);
      filtered.forEach((a: any) => {
        console.log(`[getMyHistory] - Activation ${a.id}: ${a.phoneNumber}, smsMessages=${a.smsMessages.length}`);
      });

      // Calculate pagination
      const total = filtered.length;
      const totalPages = Math.ceil(total / input.limit);
      const offset = (input.page - 1) * input.limit;
      const paginatedResults = filtered.slice(offset, offset + input.limit);

      return {
        data: paginatedResults,
        pagination: {
          page: input.page,
          limit: input.limit,
          total,
          totalPages,
        },
      };
    }),

  // Obter detalhes de uma ativação (para verificar SMS)
  getActivation: publicProcedure
    .input(z.object({
      activationId: z.number(),
      customerId: z.number(), // Para segurança
    }))
    .query(async ({ input }) => {
      const result = await getActivationById(input.activationId);
      
      if (!result || result.activation.userId !== input.customerId) {
        throw new Error('Ativação não encontrada');
      }

      const activation = result.activation;

      // Se ainda está ativa, verificar status na API SMSHub
      if (activation.status === 'active' || activation.status === 'pending') {
        try {
          // Detectar formato inválido: smshubActivationId == phoneNumber
          const isInvalidFormat = activation.smshubActivationId === activation.phoneNumber;
          if (isInvalidFormat) {
            console.warn(`[getActivation] SKIPPING POLLING: Invalid format detected for activation ${activation.id}`);
            console.warn(`[getActivation] smshubActivationId=${activation.smshubActivationId}, phoneNumber=${activation.phoneNumber}`);
            // Não fazer polling, retornar como está
            return result;
          }

          const apiKeySetting = await getSetting('smshub_api_key');
          if (!apiKeySetting?.value) {
            return result;
          }
          const client = new SMSHubClient(apiKeySetting.value);
          const smshubStatus = await client.getStatus(activation.smshubActivationId!);
          
          // Atualizar smsCode se chegou (mas manter status ativo)
          // Aceitar tanto "received" quanto "retry" e buscar em "code" ou "lastCode"
          const smsCode = smshubStatus.code || smshubStatus.lastCode;
          const hasValidStatus = smshubStatus.status === 'received' || smshubStatus.status === 'retry';
          
          if (hasValidStatus && smsCode) {
            // Verificar se SMS já existe na tabela sms_messages
            const existingSms = await getSmsMessagesByActivation(activation.id);
            const smsExists = existingSms.some((sms: any) => sms.code === smsCode);
            
            if (!smsExists) {
              // Inserir novo SMS na tabela sms_messages
              await createSmsMessage({
                activationId: activation.id,
                code: smsCode,
                receivedAt: new Date(),
              });
              console.log(`[getActivation] SMS saved to sms_messages table: ${smsCode}`);
            }
            
            await updateActivation(activation.id, {
              smsCode: smsCode,
              // NÃO mudar status - ativação continua ativa até usuário clicar em Concluir
            });
            
            return {
              ...result,
              activation: {
                ...activation,
                smsCode: smshubStatus.code,
                // Manter status ativo
              }
            };
          }
        } catch (error) {
          console.error('Error checking SMSHub status:', error);
        }
      }

      return result;
    }),

  // Verificar SMS manualmente (botão "Verificar SMS")
  checkSmsStatus: publicProcedure
    .input(z.object({
      activationId: z.number(),
      customerId: z.number(),
    }))
    .mutation(async ({ input }) => {
      const result = await getActivationById(input.activationId);
      
      if (!result || result.activation.userId !== input.customerId) {
        throw new Error('Ativação não encontrada');
      }

      const activation = result.activation;

      // Se já foi concluída, retornar
      if (activation.status === 'completed') {
        return {
          success: true,
          message: 'SMS já foi recebido',
          smsCode: activation.smsCode,
        };
      }

      // Se não está ativa, não pode verificar
      if (activation.status !== 'active' && activation.status !== 'pending') {
        return {
          success: false,
          message: 'Ativação não está mais ativa',
        };
      }

      try {
        // API 2 (API 1 - SMS24h) - Use phone number
        if (activation.apiId === 2 && activation.phoneNumber) {
          const db = await getDb();
          const api2Results = db ? await db.select().from(smsApis).where(eq(smsApis.id, 2)).limit(1) : [];
          const api2 = api2Results && api2Results.length > 0 ? api2Results[0] : null;
          
          if (!api2) {
            return {
              success: false,
              message: 'API 2 não configurada',
            };
          }

          const sms24hClient = new SMS24hClient(api2.token, api2.url);
          const smsStatus = await sms24hClient.getSmsByPhone(activation.phoneNumber);
          
          if (smsStatus && smsStatus.status === 'received' && smsStatus.code) {
            await updateActivation(activation.id, {
              smsCode: smsStatus.code,
              // NÃO mudar status - ativação continua ativa até usuário clicar em Concluir
            });
            
            return {
              success: true,
              message: 'SMS recebido com sucesso!',
              smsCode: smsStatus.code,
            };
          }
          
          return {
            success: false,
            message: 'SMS ainda não foi recebido',
          };
        }

        // API 1 (API 2 - SMSHub) - Use activationId
        const isInvalidFormat = activation.smshubActivationId === activation.phoneNumber;
        if (isInvalidFormat) {
          return {
            success: false,
            message: 'Formato inválido de ativação. Entre em contato com o suporte.',
          };
        }

        const apiKeySetting = await getSetting('smshub_api_key');
        if (!apiKeySetting?.value) {
          return {
            success: false,
            message: 'API não configurada',
          };
        }

        const client = new SMSHubClient(apiKeySetting.value);
        const smshubStatus = await client.getStatus(activation.smshubActivationId!);
        
        // Aceitar tanto "received" quanto "retry" e buscar em "code" ou "lastCode"
        const smsCode = smshubStatus.code || smshubStatus.lastCode;
        const hasValidStatus = smshubStatus.status === 'received' || smshubStatus.status === 'retry';
        
        if (hasValidStatus && smsCode) {
          // Verificar se SMS já existe na tabela sms_messages
          const existingSms = await getSmsMessagesByActivation(activation.id);
          const smsExists = existingSms.some((sms: any) => sms.code === smsCode);
          
          if (!smsExists) {
            // Inserir novo SMS na tabela sms_messages
            await createSmsMessage({
              activationId: activation.id,
              code: smsCode,
              receivedAt: new Date(),
            });
            console.log(`[requestNewSms] SMS saved to sms_messages table: ${smsCode}`);
          }
          
          await updateActivation(activation.id, {
            smsCode: smsCode,
            // NÃO mudar status - ativação continua ativa até usuário clicar em Concluir
          });
          
          return {
            success: true,
            message: 'SMS recebido com sucesso!',
            smsCode: smsCode,
          };
        }
        
        return {
          success: false,
          message: 'SMS ainda não foi recebido',
        };
      } catch (error: any) {
        console.error('Error checking SMS status:', error);
        return {
          success: false,
          message: error.message || 'Erro ao verificar status',
        };
      }
    }),

  // Cancelar ativação
  cancelActivation: publicProcedure
    .input(z.object({
      activationId: z.number(),
      customerId: z.number(),
    }))
    .mutation(async ({ input }) => {
      // Import operation lock manager
      const { operationLockManager } = await import('../operation-lock');
      const { notificationsManager } = await import('../notifications-manager');

      // Execute with exclusive lock per customer to prevent race conditions
      return await operationLockManager.executeWithLock(input.customerId, async () => {
        // Broadcast operation started to all customer's devices
        notificationsManager.sendToCustomer(input.customerId, {
          type: 'operation_started',
          title: 'Operação em andamento',
          message: 'Cancelando pedido...',
          data: { operation: 'cancel', customerId: input.customerId, activationId: input.activationId },
        });

        try {
        const result = await getActivationById(input.activationId);
      
      if (!result || result.activation.userId !== input.customerId) {
        throw new Error('Ativação não encontrada');
      }

      const activation = result.activation;

      if (activation.status !== 'active' && activation.status !== 'pending') {
        throw new Error('Ativação não pode ser cancelada');
      }

      // Validar regra de 2 minutos para API 3 (SMSActivate)
      if (activation.apiId === 3) {
        const createdAt = new Date(activation.createdAt);
        const now = new Date();
        const elapsedMinutes = (now.getTime() - createdAt.getTime()) / (1000 * 60);
        
        if (elapsedMinutes < 2) {
          const remainingSeconds = Math.ceil((2 - elapsedMinutes) * 60);
          throw new Error(
            `Este pedido só pode ser cancelado após 2 minutos. ` +
            `Aguarde mais ${remainingSeconds} segundos.`
          );
        }
        
        console.log(`[cancelActivation] API 3 cooldown passed: ${elapsedMinutes.toFixed(2)} minutes elapsed`);
      }

      // Cancelar na API SMSHub
      try {
        // Detectar formato inválido: smshubActivationId == phoneNumber
        const isInvalidFormat = activation.smshubActivationId === activation.phoneNumber;
        if (!isInvalidFormat) {
          const apiKeySetting = await getSetting('smshub_api_key');
          if (apiKeySetting?.value) {
            const client = new SMSHubClient(apiKeySetting.value);
            await client.setStatus(activation.smshubActivationId!, 8); // 8 = cancel
          }
        } else {
          console.warn(`[cancelActivation] SKIPPING API CANCEL: Invalid format for activation ${activation.id}`);
        }
      } catch (error) {
        console.error('Error cancelling on SMSHub:', error);
      }

      // Atualizar no banco
      await updateActivation(activation.id, {
        status: 'cancelled',
      });

        // Reembolsar cliente
        await addBalance(
          input.customerId,
          activation.sellingPrice,
          'refund',
          `Reembolso de ativação cancelada #${activation.id}`
        );

        // Broadcast operation completed
        notificationsManager.sendToCustomer(input.customerId, {
          type: 'operation_completed',
          title: 'Cancelamento concluído',
          message: 'Pedido cancelado e saldo reembolsado',
          data: { operation: 'cancel', customerId: input.customerId, activationId: input.activationId },
        });

          return { success: true };
        } catch (error: any) {
          // Broadcast operation failed
          notificationsManager.sendToCustomer(input.customerId, {
            type: 'operation_failed',
            title: 'Erro no cancelamento',
            message: error.message || 'Falha ao cancelar pedido',
            data: { operation: 'cancel', customerId: input.customerId, activationId: input.activationId },
          });
          throw error;
        }
      });
    }),

  // Toggle favorite
  toggleFavorite: publicProcedure
    .input(z.object({
      customerId: z.number(),
      serviceId: z.number(),
    }))
    .mutation(async ({ input }) => {
      const result = await toggleFavorite(input.customerId, input.serviceId);
      return result;
    }),

  // Get customer favorites
  getFavorites: publicProcedure
    .input(z.object({
      customerId: z.number(),
    }))
    .query(async ({ input }) => {
      const favorites = await getCustomerFavorites(input.customerId);
      return favorites;
    }),

  // Listar operadoras disponíveis por país
  getOperators: publicProcedure
    .input(z.object({
      countryId: z.number().optional(),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');
      
      // If countryId is provided, filter by country; otherwise return all operators
      const operators = input.countryId 
        ? await db.select().from(operatorsTable).where(eq(operatorsTable.countryId, input.countryId))
        : await db.select().from(operatorsTable);
      
      return operators;
    }),

  // Get API options for a specific service and country
  getServiceApiOptions: publicProcedure
    .input(z.object({
      serviceId: z.number(),
      countryId: z.number(),
    }))
    .query(async ({ input }) => {
      return await getServiceApiOptions(input.serviceId, input.countryId);
    }),

  // Complete activation (mark as completed)
  completeActivation: publicProcedure
    .input(z.object({
      activationId: z.number(),
      customerId: z.number(),
    }))
    .mutation(async ({ input }) => {
      const activation = await getActivationById(input.activationId);
      
      if (!activation) {
        throw new Error('Ativação não encontrada');
      }
      
      if (activation.activation.userId !== input.customerId) {
        throw new Error('Você não tem permissão para concluir esta ativação');
      }
      
      if (!activation.activation.smsCode) {
        throw new Error('Não é possível concluir sem código SMS');
      }
      
      await updateActivation(input.activationId, {
        status: 'completed',
        completedAt: new Date(),
      });
      
      return {
        success: true,
        message: 'Ativação concluída com sucesso!',
      };
    }),

  // Solicitar novo SMS (limpa código atual e pede novo na API)
  requestNewSms: publicProcedure
    .input(z.object({
      activationId: z.number(),
      customerId: z.number(),
    }))
    .mutation(async ({ input }) => {
      const activation = await getActivationById(input.activationId);
      
      if (!activation) {
        throw new Error('Ativação não encontrada');
      }
      
      if (activation.activation.userId !== input.customerId) {
        throw new Error('Você não tem permissão para solicitar novo SMS');
      }
      
      if (activation.activation.status !== 'active') {
        throw new Error('Ativação não está mais ativa');
      }
      
      console.log(`[requestNewSms] Requesting new SMS for activation ${input.activationId}`);
      console.log(`[requestNewSms] Activation details:`, {
        id: activation.activation.id,
        smshubActivationId: activation.activation.smshubActivationId,
        phoneNumber: activation.activation.phoneNumber,
        apiId: activation.activation.apiId,
        currentSmsCode: activation.activation.smsCode,
      });
      
      // Limpar código SMS atual no banco e marcar como "retry"
      await updateActivation(input.activationId, {
        smsCode: null,
        smshubStatus: 'retry', // Marca como aguardando novo SMS
      });
      console.log(`[requestNewSms] SMS code cleared and status set to 'retry'`);
      
      // Solicitar novo SMS na API (setStatus 3 = request another SMS)
      try {
        const isInvalidFormat = activation.activation.smshubActivationId === activation.activation.phoneNumber;
        console.log(`[requestNewSms] isInvalidFormat=${isInvalidFormat}`);
        
        if (!isInvalidFormat && activation.activation.smshubActivationId) {
          // Buscar configuração da API correta
          const db = await getDb();
          if (db) {
            const apiResults = await db.select().from(smsApis).where(eq(smsApis.id, activation.activation.apiId!)).limit(1);
            const api = apiResults && apiResults.length > 0 ? apiResults[0] : null;
            console.log(`[requestNewSms] API configuration:`, api ? { id: api.id, name: api.name, url: api.url } : 'NOT FOUND');
            
            if (api) {
              const client = new SMSHubClient(api.token, api.url);
              console.log(`[requestNewSms] Calling setStatus(${activation.activation.smshubActivationId}, 3) on ${api.url}`);
              const response = await client.setStatus(activation.activation.smshubActivationId, 3); // 3 = request another SMS
              console.log(`[requestNewSms] setStatus response:`, response);
            }
          }
        } else {
          console.log(`[requestNewSms] SKIPPING API CALL: Invalid format or missing smshubActivationId`);
        }
      } catch (error) {
        console.error('[requestNewSms] Error requesting new SMS from API:', error);
        // Não falhar se API der erro - código já foi limpo no banco
      }
      
      return {
        success: true,
        message: 'Novo SMS solicitado! Aguarde a chegada do código.',
      };
    }),

  // Obter recomendação de fornecedor para um serviço
  getRecommendedSupplier: publicProcedure
    .input(z.object({
      serviceId: z.number(),
      availableApiIds: z.array(z.number()).optional().default([1, 2, 3]),
    }))
    .query(async ({ input }) => {
      // Verificar cache primeiro
      const cached = getCachedRecommendation(input.serviceId);
      if (cached) {
        return cached;
      }

      // Calcular recomendação
      const recommendation = await getRecommendedSupplier(
        input.serviceId,
        input.availableApiIds
      );

      // Armazenar no cache por 5 minutos
      setCachedRecommendation(input.serviceId, recommendation);

      return recommendation;
    }),
});
