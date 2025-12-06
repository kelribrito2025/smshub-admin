# Integração API Pix EfiPay - Resumo

## Credenciais Necessárias

1. **Client_Id** e **Client_Secret** - Gerados ao criar aplicação na conta EfiPay
2. **Certificado P12** (.p12) - Certificado de segurança obrigatório
3. **Ambientes**: Produção e Homologação (credenciais separadas)

## Escopos Necessários para Recarga

Para implementar recarga via PIX, precisamos ativar os seguintes escopos:

- `cob.write` - Criar cobranças PIX
- `cob.read` - Consultar cobranças PIX
- `webhook.write` - Configurar webhook para notificações
- `webhook.read` - Consultar webhooks
- `pix.read` - Consultar Pix recebidos

## Fluxo de Integração

### 1. Autenticação OAuth2
- Endpoint: `POST /oauth/token`
- Autenticação Basic com Client_Id:Client_Secret (Base64)
- Certificado P12 obrigatório
- Retorna `access_token` com validade de 3600 segundos

### 2. Criar Cobrança PIX Imediata
- Endpoint: `POST /v2/cob`
- Requer `access_token` no header
- Body: valor, devedor (nome, cpf), chave PIX
- Retorna: txid, location, qrcode (payload e imagem base64)

### 3. Webhook de Confirmação
- Endpoint configurado: `POST /v2/webhook/:chave`
- Recebe notificação quando PIX é pago
- Payload: txid, status (CONCLUIDA)

### 4. Consultar PIX Recebido
- Endpoint: `GET /v2/pix/:e2eid`
- Confirma valor recebido e dados do pagador

## Rotas Base

- **Produção**: `https://api.efipay.com.br`
- **Homologação**: `https://api-h.efipay.com.br`

## Estrutura de Implementação

```
1. Usuário clica em "Recarregar" e escolhe PIX + valor
2. Backend gera token OAuth2
3. Backend cria cobrança PIX imediata
4. Frontend exibe modal com QR Code + botão copiar
5. Usuário paga via app bancário
6. EfiPay envia webhook de confirmação
7. Backend valida pagamento e credita saldo
8. Frontend atualiza saldo automaticamente
```

## Dados a Armazenar no Banco

- txid (ID da transação EfiPay)
- userId (cliente que fez recarga)
- amount (valor em centavos)
- status (pending, completed, failed)
- pixCopyPaste (código copia e cola)
- qrcodeImage (base64 da imagem QR)
- createdAt, updatedAt


## Exemplo de Requisição POST /v2/cob

```json
{
  "calendario": {
    "expiracao": 3600
  },
  "devedor": {
    "cpf": "12345678909",
    "nome": "Francisco da Silva"
  },
  "valor": {
    "original": "123.45"
  },
  "chave": "71cdf0ba-c695-4c3c-b010-abb521a3f1be",
  "solicitacaoPagador": "Cobrança dos serviços prestados."
}
```

## Exemplo de Resposta 201 (Sucesso)

```json
{
  "calendario": {
    "criacao": "2020-09-09T20:15:00.358Z",
    "expiracao": 3600
  },
  "txid": "7978dc0c97ed847c78d8849634473c1f1",
  "revisao": 0,
  "loc": {
    "id": 789,
    "location": "pix.example.com/qr/v2/9d36b84fc70b478fb05c12729b90ca25",
    "tipoCob": "cob"
  },
  "location": "pix.example.com/qr/v2/9d36b84fc70b478fb05c12729b90ca25",
  "status": "ATIVA",
  "devedor": {
    "cpf": "12345678000195",
    "nome": "Empresa de Serviços SA"
  },
  "valor": {
    "original": "567.89"
  },
  "chave": "a1f4102e-a446-4a57-bcce-6fa48899c1d1",
  "solicitacaoPagador": "Informar cartão fidelidade",
  "pixCopiaCola": "00020101021226830014br.gov.bcb.pix..."
}
```

**Campos importantes da resposta:**
- `txid` - ID único da transação (usar para consultas)
- `pixCopiaCola` - Código PIX Copia e Cola (QR Code em texto)
- `status` - Status da cobrança (ATIVA, CONCLUIDA, REMOVIDA_PELO_USUARIO_RECEBEDOR)
- `location` - URL para gerar imagem do QR Code


## Webhook - Notificações de Pagamento

### Configuração do Webhook

**Endpoint:** `PUT /v2/webhook/:chave`

Configurar URL de webhook para receber notificações de Pix recebidos.

**Importante:**
- Ao cadastrar webhook, EfiPay envia notificação de teste para URL cadastrada
- Quando notificação real for enviada, o caminho `/pix` será acrescentado ao final da URL
- **Solução:** Adicionar `?ignorar=` ao final da URL cadastrada para evitar duas rotas distintas

**Exemplo de URL:**
```
https://seu-dominio.com/api/webhook/pix?ignorar=
```

### Recebendo Callbacks

**Método:** `POST url-webhook-cadastrada/pix`

Quando há alteração no status do Pix, EfiPay envia requisição POST com objeto JSON.

**Timeout:** 60 segundos

**Estrutura do Callback (exemplo):**
```json
{
  "pix": [
    {
      "endToEndId": "E1234567820210101000000000000000",
      "txid": "7978dc0c97ed847c78d8849634473c1f1",
      "valor": "123.45",
      "horario": "2021-01-01T00:00:00.000Z",
      "infoPagador": "Pagamento de serviços"
    }
  ]
}
```

**Campos importantes:**
- `endToEndId` - ID único da transação Pix
- `txid` - ID da cobrança (mesmo retornado na criação)
- `valor` - Valor pago
- `horario` - Data/hora do pagamento

### Autenticação mTLS

**Requerido:** Certificado público da EfiPay no servidor

**Certificados:**
- Produção: `https://certificados.efipay.com.br/webhooks/certificate-chain-prod.crt`
- Homologação: `https://certificados.efipay.com.br/webhooks/certificate-chain-homolog.crt`

**Alternativa (skip-mTLS):**
Para servidores compartilhados, usar header `x-skip-mtls-checking: true` e validar:
1. IP da EfiPay: `34.193.116.226`
2. Hash HMAC na URL do webhook

### Ambiente de Homologação

**Simulação de pagamentos:**
- Cobranças de R$ 0.01 a R$ 10.00 → Confirmadas automaticamente (webhook enviado)
- Cobranças acima de R$ 10.00 → Permanecem ativas (sem confirmação/webhook)

## Fluxo Completo de Integração

### 1. Criar Cobrança PIX
```
POST /v2/cob
Body: {
  "calendario": { "expiracao": 3600 },
  "valor": { "original": "50.00" },
  "chave": "sua-chave-pix",
  "solicitacaoPagador": "Recarga SMSHub"
}
```

**Resposta:**
- `txid` - Salvar no banco (vincular ao usuário)
- `pixCopiaCola` - QR Code em texto
- `location` - URL para gerar imagem do QR Code

### 2. Exibir QR Code ao Usuário

Modal com:
- Imagem do QR Code (gerar a partir de `pixCopiaCola`)
- Botão "Copiar código PIX"
- Valor da recarga
- Tempo de expiração (countdown)

### 3. Aguardar Webhook

Quando pagamento for confirmado:
```
POST /api/webhook/pix
Body: {
  "pix": [{
    "txid": "7978dc0c97ed847c78d8849634473c1f1",
    "valor": "50.00",
    "horario": "2021-01-01T00:00:00.000Z"
  }]
}
```

### 4. Processar Pagamento

1. Buscar transação no banco pelo `txid`
2. Validar valor recebido
3. Adicionar saldo ao usuário
4. Atualizar status da transação para "CONCLUIDA"
5. Notificar usuário (opcional)

## Credenciais Necessárias

**Ambiente de Produção:**
- `EFIPAY_CLIENT_ID` - Client ID da aplicação
- `EFIPAY_CLIENT_SECRET` - Client Secret da aplicação
- `EFIPAY_CERTIFICATE` - Certificado .p12 (base64)
- `EFIPAY_PIX_KEY` - Chave PIX cadastrada

**Ambiente de Homologação:**
- Mesmas credenciais mas com sufixo `_SANDBOX`

## Próximos Passos de Implementação

1. ✅ Estudar documentação
2. ⏳ Solicitar credenciais ao usuário
3. ⏳ Criar tabela `transactions` no banco
4. ⏳ Implementar cliente EfiPay no backend
5. ⏳ Criar endpoint para gerar cobrança PIX
6. ⏳ Criar modal de pagamento com QR Code
7. ⏳ Implementar webhook para confirmar pagamento
8. ⏳ Testar em homologação
9. ⏳ Deploy em produção
