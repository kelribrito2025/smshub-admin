// Script para testar banner de impersonação
// Cole este código no Console do navegador (F12) e pressione Enter

console.log('🧪 Iniciando teste de impersonação...');

// Simular impersonação
const impersonationData = {
  isImpersonating: true,
  customer: {
    id: 999,
    email: "teste@exemplo.com",
  },
  admin: {
    id: 1,
    name: "Admin Teste",
  },
  timestamp: Date.now(),
};

localStorage.setItem('impersonation_session', JSON.stringify(impersonationData));
console.log('✅ Dados de impersonação salvos no localStorage');
console.log('📦 Dados:', impersonationData);
console.log('🔄 Recarregando página em 2 segundos...');

setTimeout(() => {
  window.location.reload();
}, 2000);
