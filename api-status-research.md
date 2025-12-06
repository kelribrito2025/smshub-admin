# Pesquisa de Status de Expiração das APIs

## API 1: SMSHub (smshub.org)

### Endpoint getStatus
**URL:** `https://smshub.org/stubs/handler_api.php?api_key=APIKEY&action=getStatus&id=ID`

### Status Retornados:

| Status | Descrição |
|--------|-----------|
| `STATUS_WAIT_CODE` | Aguardando chegada do SMS |
| `STATUS_WAIT_RETRY:LASTCODE` | Aguardando outro SMS (LASTCODE = último SMS recebido) |
| `STATUS_CANCEL` | Ativação cancelada |
| `STATUS_OK:CODE` | Código recebido (CODE = código de ativação) |

### Endpoint setStatus
**URL:** `https://smshub.org/stubs/handler_api.php?api_key=APIKEY&action=setStatus&status=STATUS&id=ID`

### Status que podem ser enviados:

| Status | Descrição |
|--------|-----------|
| `1` | SMS enviado para o número (opcional) |
| `3` | SMS precisa ser repetido |
| `6` | Ativação completada com sucesso |
| `8` | Cancelar ativação |

### Respostas do setStatus:

| Resposta | Descrição |
|----------|-----------|
| `ACCESS_READY` | SMS aguardando prontidão |
| `ACCESS_RETRY_GET` | Esperamos novo SMS |
| `ACCESS_ACTIVATION` | Ativação completada com sucesso |
| `ACCESS_CANCEL` | Ativação cancelada |

### ⚠️ IMPORTANTE - Status de Expiração:

**A API SMSHub NÃO retorna um status específico de "expirado" (expired).**

Os status possíveis são apenas:
- `STATUS_WAIT_CODE` (aguardando)
- `STATUS_WAIT_RETRY` (aguardando retry)
- `STATUS_CANCEL` (cancelado manualmente)
- `STATUS_OK` (código recebido)

**Conclusão:** Precisamos implementar lógica interna para detectar expiração baseada em:
- Tempo decorrido desde criação (> 20 minutos)
- Status ainda em `STATUS_WAIT_CODE` ou `STATUS_WAIT_RETRY`
- Sem código SMS recebido

---

## API 2: SMS24h (sms24h.org)

### Endpoint getStatus
**URL:** `https://api.sms24h.org/stubs/handler_api?api_key=APIKEY&action=getStatus&id=ID`

### Status Retornados:

| Status | Descrição |
|--------|-----------||
| `STATUS_WAIT_CODE` | Aguardando chegada do SMS |
| `STATUS_WAIT_RETRY:LASTCODE` | Aguardando outro SMS (LASTCODE = último SMS recebido) |
| `STATUS_CANCEL` | Ativação cancelada |
| `STATUS_OK:CODE` | Código recebido (CODE = código de ativação) |

### ⚠️ IMPORTANTE - Status de Expiração:

**A API SMS24h NÃO retorna um status específico de "expirado" (expired).**

A API SMS24h é **totalmente compatível com sms-activate.ru** (conforme documentação).

Os status possíveis são idênticos aos da SMSHub:
- `STATUS_WAIT_CODE` (aguardando)
- `STATUS_WAIT_RETRY` (aguardando retry)
- `STATUS_CANCEL` (cancelado manualmente)
- `STATUS_OK` (código recebido)

**Conclusão:** Mesma lógica da SMSHub - precisamos implementar detecção interna baseada em tempo.

---

## API 3: SMSActivate (sms-activate.io)

### Endpoint getStatus
**URL:** `https://api.sms-activate.ae/stubs/handler_api.php?api_key=APIKEY&action=getStatus&id=ID`

### Status Retornados:

| Status | Descrição |
|--------|-----------||
| `STATUS_WAIT_CODE` | Aguardando SMS |
| `STATUS_WAIT_RETRY:LASTCODE` | Aguardando esclarecimento do código (LASTCODE = código anterior não correspondido) |
| `STATUS_CANCEL` | Ativação cancelada ou completada |
| `STATUS_OK:CODE` | Código recebido (CODE = código de ativação) |

### ⚠️ IMPORTANTE - Status de Expiração:

**A API SMSActivate NÃO retorna um status específico de "expirado" (expired).**

**ATENÇÃO:** O status `STATUS_CANCEL` é usado tanto para:
- Ativações canceladas manualmente
- Ativações completadas com sucesso

Os status possíveis são idênticos aos das outras APIs:
- `STATUS_WAIT_CODE` (aguardando)
- `STATUS_WAIT_RETRY` (aguardando retry)
- `STATUS_CANCEL` (cancelado manualmente OU completado)
- `STATUS_OK` (código recebido)

**Conclusão:** Mesma lógica das outras APIs - precisamos implementar detecção interna baseada em tempo.

---

## Próximos Passos:

1. ✅ Verificar documentação SMSHub - **CONCLUÍDO**
2. ✅ Verificar documentação SMS24h - **CONCLUÍDO**
3. ✅ Verificar documentação SMSActivate - **CONCLUÍDO**
4. ⏳ Implementar lógica de detecção de expiração
5. ⏳ Implementar sistema de reembolso automático

---

## CONCLUSÃO GERAL

### 🚨 Descoberta Importante:

**NENHUMA das 3 APIs retorna um status específico de "expirado".**

Todas as 3 APIs (SMSHub, SMS24h, SMSActivate) são compatíveis entre si e retornam apenas:

1. `STATUS_WAIT_CODE` - Aguardando SMS
2. `STATUS_WAIT_RETRY` - Aguardando retry
3. `STATUS_CANCEL` - Cancelado manualmente
4. `STATUS_OK` - Código recebido

### 🛠️ Solução Necessária:

Precisamos implementar **detecção interna de expiração** baseada em:

1. **Tempo decorrido:** Ativação criada há mais de 20 minutos
2. **Status atual:** Ainda em `STATUS_WAIT_CODE` ou `STATUS_WAIT_RETRY`
3. **Sem código:** Não recebeu SMS
4. **Não cancelado:** Não foi cancelado manualmente pelo usuário

### 🔄 Fluxo de Reembolso Automático:

1. **Polling de SMS:** Ao verificar status da ativação
2. **Checar tempo:** Se `createdAt` > 20 minutos atrás
3. **Checar status:** Se ainda `STATUS_WAIT_CODE` ou `STATUS_WAIT_RETRY`
4. **Marcar como expirado:** Atualizar status interno para `expired`
5. **Reembolsar:** Criar transação de reembolso automático
6. **Atualizar UI:** Exibir como "EXPIRADO" no histórico
