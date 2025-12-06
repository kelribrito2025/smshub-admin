# Guia de Configuração do Webhook EfiPay PIX

## Resumo

O webhook da EfiPay permite receber notificações automáticas quando um pagamento PIX é confirmado. Este guia explica como configurar o webhook tanto automaticamente via API quanto manualmente.

## Endpoint de Configuração

```
PUT https://pix.api.efipay.com.br/v2/webhook/:chave
```

**Parâmetros:**
- `:chave` - Sua chave PIX cadastrada na EfiPay

**Body da Requisição:**
```json
{
  "webhookUrl": "https://seu-dominio.com/api/webhook/pix"
}
```

**Headers:**
- `Authorization: Bearer {access_token}`
- `Content-Type: application/json`
- `x-skip-mtls-checking: true` (opcional, para servidores compartilhados)

**Resposta de Sucesso (201):**
```json
{
  "webhookUrl": "https://seu-dominio.com/api/webhook/pix"
}
```

## Opções de Configuração

### Opção 1: Configuração Automática via API (Recomendado)

O sistema já possui um endpoint para configurar o webhook automaticamente. Basta acessar:

```
POST /api/trpc/pix.setupWebhook
```

Este endpoint irá:
1. Obter token de acesso da EfiPay
2. Registrar a URL do webhook automaticamente
3. Validar a configuração

### Opção 2: Configuração Manual via Painel EfiPay

1. Acesse https://sejaefi.com.br/ e faça login
2. Vá em **API Pix** → **Webhooks**
3. Clique em **Configurar Webhook**
4. Insira a URL: `https://seu-dominio.com/api/webhook/pix`
5. Selecione sua chave PIX
6. Clique em **Salvar**

## Skip mTLS

Para servidores compartilhados (sem acesso root), use o header `x-skip-mtls-checking: true` para pular a validação mTLS.

**Importante:** Quando usar skip-mTLS, você deve validar manualmente:
1. **IP de origem:** Aceitar apenas do IP da EfiPay: `34.193.116.226`
2. **Hash na URL:** Adicionar HMAC na URL para validar origem

Exemplo com hash:
```
https://seu-dominio.com/api/webhook/pix?hmac=xyz&ignorar=
```

## URL do Webhook no Projeto

A URL do webhook já está configurada em:
```
https://seu-dominio.com/api/webhook/pix
```

Este endpoint:
- Recebe notificações de pagamento da EfiPay
- Valida o txid e busca a transação no banco
- Atualiza o status da transação para "paid"
- Adiciona o valor ao saldo do cliente automaticamente
- Retorna status 200 para confirmar recebimento

## Estrutura da Notificação

Quando um PIX é pago, a EfiPay envia um POST para o webhook com:

```json
{
  "pix": [
    {
      "endToEndId": "E00000000202201010000000000000000",
      "txid": "7978c0c97ea847e78e8849634473c1f1",
      "valor": "0.01",
      "horario": "2022-01-01T00:00:00.000Z",
      "infoPagador": "Pagamento recebido"
    }
  ]
}
```

O sistema processa automaticamente e atualiza o saldo do cliente.

## Próximos Passos

1. Obter URL pública do projeto (após deploy)
2. Executar configuração automática via endpoint `pix.setupWebhook`
3. Testar com pagamento real
4. Verificar logs de webhook em `/api/webhook/pix`
