# Documentação da API Pública - SMSHub Admin

## Visão Geral

Esta API REST permite que seu painel de vendas se integre ao painel administrativo SMSHub para consultar serviços disponíveis, preços em tempo real e gerenciar pedidos de números SMS para verificação.

**Base URL:** `https://seu-dominio.manus.space/api/public`

**Autenticação:** Todas as requisições devem incluir o header `X-API-Key` com uma chave válida gerada no painel administrativo.

**Formato:** Todas as respostas são em JSON puro (não tRPC).

---

## Autenticação

### Gerando uma API Key

1. Acesse o painel administrativo
2. Navegue até **API Keys** no menu lateral
3. Clique em **Nova API Key**
4. Dê um nome descritivo (ex: "Painel de Vendas Principal")
5. Copie a chave gerada (ela só será exibida uma vez)

### Usando a API Key

Todas as requisições devem incluir o header:

```
X-API-Key: sk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

---

## Endpoints Disponíveis

### 1. Listar Países Ativos

Retorna todos os países disponíveis para compra de números SMS.

**Endpoint:** `GET /api/public/countries`

**Exemplo de Requisição:**

```bash
curl -X GET 'https://seu-dominio.manus.space/api/public/countries' \
  -H 'X-API-Key: sk_sua_chave_aqui'
```

**Resposta de Sucesso (200):**

```json
[
  {
    "id": 1,
    "name": "Brasil",
    "code": "BR",
    "smshubId": 67
  },
  {
    "id": 2,
    "name": "Estados Unidos",
    "code": "US",
    "smshubId": 187
  }
]
```

---

### 2. Listar Serviços Ativos

Retorna todos os serviços disponíveis, com opção de filtrar por categoria.

**Endpoint:** `GET /api/public/services`

**Parâmetros de Query (opcionais):**
- `category` (string): Filtrar por categoria específica

**Exemplo de Requisição:**

```bash
# Todos os serviços
curl -X GET 'https://seu-dominio.manus.space/api/public/services' \
  -H 'X-API-Key: sk_sua_chave_aqui'

# Filtrar por categoria
curl -X GET 'https://seu-dominio.manus.space/api/public/services?category=Social' \
  -H 'X-API-Key: sk_sua_chave_aqui'
```

**Resposta de Sucesso (200):**

```json
[
  {
    "id": 1,
    "name": "WhatsApp",
    "code": "wa",
    "category": "Social"
  },
  {
    "id": 2,
    "name": "Telegram",
    "code": "tg",
    "category": "Social"
  }
]
```

---

### 3. Listar Categorias de Serviços

Retorna lista única de categorias disponíveis.

**Endpoint:** `GET /api/public/categories`

**Exemplo de Requisição:**

```bash
curl -X GET 'https://seu-dominio.manus.space/api/public/categories' \
  -H 'X-API-Key: sk_sua_chave_aqui'
```

**Resposta de Sucesso (200):**

```json
[
  {
    "name": "Social",
    "count": 15
  },
  {
    "name": "Delivery",
    "count": 8
  },
  {
    "name": "Finance",
    "count": 12
  }
]
```

---

### 4. Consultar Preços

Retorna preços para todas as combinações de país/serviço disponíveis, com opção de filtrar.

**Endpoint:** `GET /api/public/prices`

**Parâmetros de Query (opcionais):**
- `countryId` (number): Filtrar por país específico
- `serviceId` (number): Filtrar por serviço específico

**Exemplo de Requisição:**

```bash
# Todos os preços
curl -X GET 'https://seu-dominio.manus.space/api/public/prices' \
  -H 'X-API-Key: sk_sua_chave_aqui'

# Filtrar por país
curl -X GET 'https://seu-dominio.manus.space/api/public/prices?countryId=1' \
  -H 'X-API-Key: sk_sua_chave_aqui'

# Filtrar por serviço
curl -X GET 'https://seu-dominio.manus.space/api/public/prices?serviceId=1' \
  -H 'X-API-Key: sk_sua_chave_aqui'
```

**Resposta de Sucesso (200):**

```json
[
  {
    "countryId": 1,
    "countryName": "Brasil",
    "countryCode": "BR",
    "serviceId": 1,
    "serviceName": "WhatsApp",
    "serviceCode": "wa",
    "serviceCategory": "Social",
    "price": 250,
    "available": 150,
    "lastSync": "2024-01-15T10:30:00.000Z"
  }
]
```

**Nota:** O campo `price` está em centavos (ex: 250 = R$ 2,50).

---

### 5. Criar Ativação (Comprar Número SMS)

Solicita um número SMS para verificação. **Debita automaticamente o saldo do cliente.**

**Endpoint:** `POST /api/public/activations`

**Parâmetros do Body (obrigatórios):**
- `countryId` (number): ID do país
- `serviceId` (number): ID do serviço
- `customerId` (number): ID do cliente

**Exemplo de Requisição:**

```bash
curl -X POST 'https://seu-dominio.manus.space/api/public/activations' \
  -H 'X-API-Key: sk_sua_chave_aqui' \
  -H 'Content-Type: application/json' \
  -d '{
    "countryId": 1,
    "serviceId": 1,
    "customerId": 123
  }'
```

**Resposta de Sucesso (200):**

```json
{
  "activationId": 12345,
  "phoneNumber": "+5511999887766",
  "price": 250,
  "status": "active"
}
```

**Possíveis Erros:**
- `400` - `Country not available` - País não está ativo
- `400` - `Service not available` - Serviço não está ativo
- `400` - `Price not found` - Combinação país/serviço não disponível
- `400` - `No numbers available for this service` - Sem números disponíveis no momento
- `404` - `Customer not found` - Cliente não existe
- `403` - `Customer account is inactive` - Conta do cliente está inativa
- `402` - `Insufficient balance` - Saldo insuficiente

---

### 6. Consultar Status da Ativação

Verifica o status de uma ativação e retorna o código SMS quando disponível.

**Endpoint:** `GET /api/public/activations/:id`

**Parâmetros de URL:**
- `id` (number): ID da ativação retornado ao criar

**Exemplo de Requisição:**

```bash
curl -X GET 'https://seu-dominio.manus.space/api/public/activations/12345' \
  -H 'X-API-Key: sk_sua_chave_aqui'
```

**Resposta de Sucesso (200) - Aguardando SMS:**

```json
{
  "activationId": 12345,
  "phoneNumber": "+5511999887766",
  "status": "active",
  "smsCode": null,
  "price": 250
}
```

**Resposta de Sucesso (200) - SMS Recebido:**

```json
{
  "activationId": 12345,
  "phoneNumber": "+5511999887766",
  "status": "completed",
  "smsCode": "123456",
  "price": 250
}
```

**Status Possíveis:**
- `active` - Número recebido, aguardando SMS
- `completed` - SMS recebido com sucesso
- `cancelled` - Ativação cancelada
- `failed` - Falha ao receber número ou SMS

---

### 7. Cancelar Ativação

Cancela uma ativação ativa.

**Endpoint:** `POST /api/public/activations/:id/cancel`

**Parâmetros de URL:**
- `id` (number): ID da ativação

**Exemplo de Requisição:**

```bash
curl -X POST 'https://seu-dominio.manus.space/api/public/activations/12345/cancel' \
  -H 'X-API-Key: sk_sua_chave_aqui' \
  -H 'Content-Type: application/json'
```

**Resposta de Sucesso (200):**

```json
{
  "success": true,
  "message": "Activation cancelled successfully"
}
```

**Possíveis Erros:**
- `404` - `Activation not found` - Ativação não existe
- `400` - `Can only cancel active activations` - Ativação já foi completada ou cancelada

---

## Endpoints de Clientes

### 8. Criar Cliente

Cria um novo cliente no sistema. Retorna o cliente existente se o email já estiver cadastrado.

**Endpoint:** `POST /api/public/customers`

**Parâmetros do Body:**
- `email` (string, obrigatório): Email do cliente
- `name` (string, opcional): Nome do cliente (padrão: "Indefinido")

**Exemplo de Requisição:**

```bash
curl -X POST 'https://seu-dominio.manus.space/api/public/customers' \
  -H 'X-API-Key: sk_sua_chave_aqui' \
  -H 'Content-Type: application/json' \
  -d '{
    "email": "cliente@example.com",
    "name": "João Silva"
  }'
```

**Resposta de Sucesso (201):**

```json
{
  "id": 123,
  "pin": 42,
  "name": "João Silva",
  "email": "cliente@example.com",
  "balance": 0,
  "active": true,
  "createdAt": "2024-01-15T10:30:00.000Z"
}
```

**Resposta - Cliente Já Existe (409):**

```json
{
  "error": "Customer with this email already exists",
  "customer": {
    "id": 123,
    "pin": 42,
    "name": "João Silva",
    "email": "cliente@example.com",
    "balance": 1500,
    "active": true,
    "createdAt": "2024-01-15T10:30:00.000Z"
  }
}
```

---

### 9. Buscar Cliente por Email

Retorna os dados de um cliente pelo email.

**Endpoint:** `GET /api/public/customers/by-email`

**Parâmetros de Query:**
- `email` (string, obrigatório): Email do cliente

**Exemplo de Requisição:**

```bash
curl -X GET 'https://seu-dominio.manus.space/api/public/customers/by-email?email=cliente@example.com' \
  -H 'X-API-Key: sk_sua_chave_aqui'
```

**Resposta de Sucesso (200):**

```json
{
  "id": 123,
  "pin": 42,
  "name": "João Silva",
  "email": "cliente@example.com",
  "balance": 1500,
  "active": true,
  "createdAt": "2024-01-15T10:30:00.000Z"
}
```

**Nota:** O campo `balance` está em centavos (ex: 1500 = R$ 15,00).

---

### 10. Buscar Cliente por PIN

Retorna os dados de um cliente pelo PIN único.

**Endpoint:** `GET /api/public/customers/by-pin`

**Parâmetros de Query:**
- `pin` (number, obrigatório): PIN do cliente

**Exemplo de Requisição:**

```bash
curl -X GET 'https://seu-dominio.manus.space/api/public/customers/by-pin?pin=42' \
  -H 'X-API-Key: sk_sua_chave_aqui'
```

**Resposta de Sucesso (200):**

```json
{
  "id": 123,
  "pin": 42,
  "name": "João Silva",
  "email": "cliente@example.com",
  "balance": 1500,
  "active": true,
  "createdAt": "2024-01-15T10:30:00.000Z"
}
```

---

### 11. Buscar Cliente por ID

Retorna os dados de um cliente pelo ID.

**Endpoint:** `GET /api/public/customers/:id`

**Parâmetros de URL:**
- `id` (number): ID do cliente

**Exemplo de Requisição:**

```bash
curl -X GET 'https://seu-dominio.manus.space/api/public/customers/123' \
  -H 'X-API-Key: sk_sua_chave_aqui'
```

**Resposta de Sucesso (200):**

```json
{
  "id": 123,
  "pin": 42,
  "name": "João Silva",
  "email": "cliente@example.com",
  "balance": 1500,
  "active": true,
  "createdAt": "2024-01-15T10:30:00.000Z"
}
```

---

## Tratamento de Erros

Todas as respostas de erro seguem o formato padrão JSON:

```json
{
  "error": "Tipo do erro",
  "message": "Mensagem descritiva do erro"
}
```

**Códigos de Erro Comuns:**

| Código HTTP | Descrição |
|-------------|-----------|
| 400 | Bad Request - Parâmetros inválidos ou faltando |
| 401 | Unauthorized - API Key ausente |
| 402 | Payment Required - Saldo insuficiente |
| 403 | Forbidden - API Key inválida ou cliente inativo |
| 404 | Not Found - Recurso não encontrado |
| 409 | Conflict - Recurso já existe (ex: email duplicado) |
| 500 | Internal Server Error - Erro interno do servidor |

---

## Fluxo de Integração Recomendado

### 1. Inicialização do Painel de Vendas

```javascript
const API_KEY = 'sk_sua_chave_aqui';
const BASE_URL = 'https://seu-dominio.manus.space/api/public';

// Carregar países e serviços disponíveis
const countries = await fetch(`${BASE_URL}/countries`, {
  headers: { 'X-API-Key': API_KEY }
}).then(r => r.json());

const services = await fetch(`${BASE_URL}/services`, {
  headers: { 'X-API-Key': API_KEY }
}).then(r => r.json());

// Carregar preços
const prices = await fetch(`${BASE_URL}/prices`, {
  headers: { 'X-API-Key': API_KEY }
}).then(r => r.json());
```

### 2. Cadastro/Login de Cliente

```javascript
// Tentar buscar cliente existente
let customer = await fetch(
  `${BASE_URL}/customers/by-email?email=${encodeURIComponent(email)}`,
  { headers: { 'X-API-Key': API_KEY } }
).then(r => r.ok ? r.json() : null);

// Se não existir, criar novo
if (!customer) {
  customer = await fetch(`${BASE_URL}/customers`, {
    method: 'POST',
    headers: {
      'X-API-Key': API_KEY,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ email, name })
  }).then(r => r.json());
}

// Salvar ID do cliente na sessão
sessionStorage.setItem('customerId', customer.id);
console.log(`Cliente autenticado - PIN: ${customer.pin}`);
console.log(`Saldo disponível: R$ ${(customer.balance / 100).toFixed(2)}`);
```

### 3. Compra de Número SMS

```javascript
const customerId = sessionStorage.getItem('customerId');

// Cliente seleciona país e serviço
const activation = await fetch(`${BASE_URL}/activations`, {
  method: 'POST',
  headers: {
    'X-API-Key': API_KEY,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    countryId: 1,
    serviceId: 1,
    customerId: parseInt(customerId)
  })
}).then(r => r.json());

// Exibir número para o cliente
console.log(`Número: ${activation.phoneNumber}`);
console.log(`Preço: R$ ${(activation.price / 100).toFixed(2)}`);
console.log(`Use este número para verificação`);
```

### 4. Polling para Verificar SMS

```javascript
// Verificar status a cada 5 segundos
const checkStatus = setInterval(async () => {
  const status = await fetch(
    `${BASE_URL}/activations/${activationId}`,
    { headers: { 'X-API-Key': API_KEY } }
  ).then(r => r.json());

  if (status.status === 'completed' && status.smsCode) {
    console.log(`Código SMS: ${status.smsCode}`);
    clearInterval(checkStatus);
    
    // Exibir código para o usuário
    alert(`Código recebido: ${status.smsCode}`);
  }
}, 5000);

// Timeout após 10 minutos
setTimeout(() => {
  clearInterval(checkStatus);
  // Cancelar ativação se necessário
  fetch(`${BASE_URL}/activations/${activationId}/cancel`, {
    method: 'POST',
    headers: { 'X-API-Key': API_KEY }
  });
}, 600000);
```

---

## Limites e Recomendações

### Rate Limiting

Atualmente não há limite de requisições, mas recomendamos:

- **Consulta de preços:** Máximo 1 requisição por minuto
- **Verificação de status:** Máximo 1 requisição a cada 5 segundos
- **Criação de ativações:** Conforme demanda do usuário

### Cache

Recomendamos implementar cache local para:

- **Lista de países:** Cache de 24 horas
- **Lista de serviços:** Cache de 24 horas
- **Preços:** Cache de 5-10 minutos
- **Status de ativação:** Sem cache (polling em tempo real)
- **Dados do cliente:** Cache durante a sessão

### Timeout

- **Ativações:** Considere timeout de 10-15 minutos para recebimento de SMS
- **Após timeout:** Cancele automaticamente a ativação

---

## Exemplos de Código Completos

### JavaScript/TypeScript (Fetch API)

```typescript
class SMSHubAPI {
  private apiKey: string;
  private baseUrl: string;

  constructor(apiKey: string, baseUrl: string) {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl;
  }

  private async request(endpoint: string, options: RequestInit = {}) {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers: {
        'X-API-Key': this.apiKey,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'API request failed');
    }

    return response.json();
  }

  // Países
  async getCountries() {
    return this.request('/countries');
  }

  // Serviços
  async getServices(category?: string) {
    const query = category ? `?category=${encodeURIComponent(category)}` : '';
    return this.request(`/services${query}`);
  }

  // Categorias
  async getCategories() {
    return this.request('/categories');
  }

  // Preços
  async getPrices(filters?: { countryId?: number; serviceId?: number }) {
    const params = new URLSearchParams();
    if (filters?.countryId) params.set('countryId', filters.countryId.toString());
    if (filters?.serviceId) params.set('serviceId', filters.serviceId.toString());
    const query = params.toString() ? `?${params}` : '';
    return this.request(`/prices${query}`);
  }

  // Clientes
  async createCustomer(email: string, name?: string) {
    return this.request('/customers', {
      method: 'POST',
      body: JSON.stringify({ email, name }),
    });
  }

  async getCustomerByEmail(email: string) {
    return this.request(`/customers/by-email?email=${encodeURIComponent(email)}`);
  }

  async getCustomerByPin(pin: number) {
    return this.request(`/customers/by-pin?pin=${pin}`);
  }

  async getCustomerById(id: number) {
    return this.request(`/customers/${id}`);
  }

  // Ativações
  async createActivation(countryId: number, serviceId: number, customerId: number) {
    return this.request('/activations', {
      method: 'POST',
      body: JSON.stringify({ countryId, serviceId, customerId }),
    });
  }

  async getActivation(activationId: number) {
    return this.request(`/activations/${activationId}`);
  }

  async cancelActivation(activationId: number) {
    return this.request(`/activations/${activationId}/cancel`, {
      method: 'POST',
    });
  }

  // Polling helper
  async waitForSMS(
    activationId: number,
    options: {
      interval?: number;
      timeout?: number;
      onUpdate?: (status: any) => void;
    } = {}
  ): Promise<string> {
    const interval = options.interval || 5000;
    const timeout = options.timeout || 600000;
    const startTime = Date.now();

    return new Promise((resolve, reject) => {
      const check = setInterval(async () => {
        try {
          const status = await this.getActivation(activationId);
          
          options.onUpdate?.(status);

          if (status.status === 'completed' && status.smsCode) {
            clearInterval(check);
            resolve(status.smsCode);
          } else if (status.status === 'cancelled' || status.status === 'failed') {
            clearInterval(check);
            reject(new Error(`Activation ${status.status}`));
          } else if (Date.now() - startTime > timeout) {
            clearInterval(check);
            await this.cancelActivation(activationId);
            reject(new Error('Timeout waiting for SMS'));
          }
        } catch (error) {
          clearInterval(check);
          reject(error);
        }
      }, interval);
    });
  }
}

// Uso
const api = new SMSHubAPI(
  'sk_sua_chave_aqui',
  'https://seu-dominio.manus.space/api/public'
);

// Exemplo completo
async function purchaseSMS(email: string, countryId: number, serviceId: number) {
  try {
    // 1. Criar/buscar cliente
    let customer;
    try {
      customer = await api.getCustomerByEmail(email);
    } catch {
      customer = await api.createCustomer(email);
    }

    console.log(`Cliente: ${customer.name} (PIN: ${customer.pin})`);
    console.log(`Saldo: R$ ${(customer.balance / 100).toFixed(2)}`);

    // 2. Criar ativação
    const activation = await api.createActivation(countryId, serviceId, customer.id);
    console.log(`Número recebido: ${activation.phoneNumber}`);
    console.log(`Aguardando SMS...`);

    // 3. Aguardar SMS
    const smsCode = await api.waitForSMS(activation.activationId, {
      onUpdate: (status) => {
        console.log(`Status: ${status.status}`);
      },
    });

    console.log(`Código SMS recebido: ${smsCode}`);
    return smsCode;
  } catch (error) {
    console.error('Erro:', error);
    throw error;
  }
}
```

### Python (Requests)

```python
import requests
import time
from typing import Optional, Dict, Any

class SMSHubAPI:
    def __init__(self, api_key: str, base_url: str):
        self.api_key = api_key
        self.base_url = base_url
        self.headers = {
            'X-API-Key': api_key,
            'Content-Type': 'application/json'
        }

    def _request(self, endpoint: str, method: str = 'GET', data: Optional[Dict] = None) -> Any:
        url = f"{self.base_url}{endpoint}"
        response = requests.request(method, url, headers=self.headers, json=data)
        
        if not response.ok:
            error = response.json()
            raise Exception(error.get('message', 'API request failed'))
        
        return response.json()

    # Países
    def get_countries(self):
        return self._request('/countries')

    # Serviços
    def get_services(self, category: Optional[str] = None):
        endpoint = f'/services?category={category}' if category else '/services'
        return self._request(endpoint)

    # Categorias
    def get_categories(self):
        return self._request('/categories')

    # Preços
    def get_prices(self, country_id: Optional[int] = None, service_id: Optional[int] = None):
        params = []
        if country_id:
            params.append(f'countryId={country_id}')
        if service_id:
            params.append(f'serviceId={service_id}')
        query = '?' + '&'.join(params) if params else ''
        return self._request(f'/prices{query}')

    # Clientes
    def create_customer(self, email: str, name: Optional[str] = None):
        data = {'email': email}
        if name:
            data['name'] = name
        return self._request('/customers', 'POST', data)

    def get_customer_by_email(self, email: str):
        return self._request(f'/customers/by-email?email={email}')

    def get_customer_by_pin(self, pin: int):
        return self._request(f'/customers/by-pin?pin={pin}')

    def get_customer_by_id(self, customer_id: int):
        return self._request(f'/customers/{customer_id}')

    # Ativações
    def create_activation(self, country_id: int, service_id: int, customer_id: int):
        return self._request('/activations', 'POST', {
            'countryId': country_id,
            'serviceId': service_id,
            'customerId': customer_id
        })

    def get_activation(self, activation_id: int):
        return self._request(f'/activations/{activation_id}')

    def cancel_activation(self, activation_id: int):
        return self._request(f'/activations/{activation_id}/cancel', 'POST')

    # Polling helper
    def wait_for_sms(
        self,
        activation_id: int,
        interval: int = 5,
        timeout: int = 600,
        on_update = None
    ) -> str:
        start_time = time.time()
        
        while True:
            status = self.get_activation(activation_id)
            
            if on_update:
                on_update(status)
            
            if status['status'] == 'completed' and status['smsCode']:
                return status['smsCode']
            elif status['status'] in ['cancelled', 'failed']:
                raise Exception(f"Activation {status['status']}")
            elif time.time() - start_time > timeout:
                self.cancel_activation(activation_id)
                raise Exception('Timeout waiting for SMS')
            
            time.sleep(interval)

# Uso
api = SMSHubAPI(
    'sk_sua_chave_aqui',
    'https://seu-dominio.manus.space/api/public'
)

# Exemplo completo
def purchase_sms(email: str, country_id: int, service_id: int):
    try:
        # 1. Criar/buscar cliente
        try:
            customer = api.get_customer_by_email(email)
        except:
            customer = api.create_customer(email)
        
        print(f"Cliente: {customer['name']} (PIN: {customer['pin']})")
        print(f"Saldo: R$ {customer['balance'] / 100:.2f}")
        
        # 2. Criar ativação
        activation = api.create_activation(country_id, service_id, customer['id'])
        print(f"Número recebido: {activation['phoneNumber']}")
        print("Aguardando SMS...")
        
        # 3. Aguardar SMS
        sms_code = api.wait_for_sms(
            activation['activationId'],
            on_update=lambda s: print(f"Status: {s['status']}")
        )
        
        print(f"Código SMS recebido: {sms_code}")
        return sms_code
    except Exception as e:
        print(f"Erro: {e}")
        raise
```

---

## Suporte

Para dúvidas ou problemas com a API, entre em contato através do painel administrativo ou consulte a documentação técnica completa.

**Versão da Documentação:** 2.0 (REST API)  
**Última Atualização:** 30 de Novembro de 2025
