import { useAdminToast } from '../../hooks/useAdminToast';

export default function ToastTest() {
  const { showToast, ToastContainer } = useAdminToast();

  return (
    <>
      <ToastContainer />
      <div className="p-8 space-y-6">
        <h1 className="text-3xl font-bold text-green-400 mb-8">Teste de Toasts - Estilo Customizado</h1>
        
        <div className="grid grid-cols-2 gap-4 max-w-2xl">
          <button
            onClick={() => {
              showToast('Número adquirido com sucesso! Número: +55 11 98765-4321. Aguardando SMS...', 'success');
            }}
            className="px-6 py-4 bg-green-500 hover:bg-green-400 text-black font-bold rounded transition-colors"
          >
            Toast de Sucesso
          </button>

          <button
            onClick={() => {
              showToast('Erro ao comprar número: Saldo insuficiente. Você precisa de R$ 2,06, mas tem apenas R$ 0,00', 'error');
            }}
            className="px-6 py-4 bg-red-500 hover:bg-red-400 text-black font-bold rounded transition-colors"
          >
            Toast de Erro
          </button>

          <button
            onClick={() => {
              showToast('Em breve: sistema de recarga. Adicione saldo via PIX, cartão de crédito ou boleto bancário', 'info');
            }}
            className="px-6 py-4 bg-cyan-500 hover:bg-cyan-400 text-black font-bold rounded transition-colors"
          >
            Toast de Info
          </button>

          <button
            onClick={() => {
              showToast('Atenção: Estoque baixo. Apenas 3 números disponíveis para WhatsApp no Brasil', 'info');
            }}
            className="px-6 py-4 bg-yellow-500 hover:bg-yellow-400 text-black font-bold rounded transition-colors"
          >
            Toast de Aviso
          </button>

          <button
            onClick={() => {
              showToast('Pedido Cancelado: Você cancelou com sucesso seu pedido #12345. Se isso foi um erro, por favor, refaça o pedido ou entre em contato com o suporte.', 'info');
            }}
            className="px-6 py-4 bg-gray-500 hover:bg-gray-400 text-black font-bold rounded transition-colors"
          >
            Toast Normal (Longo)
          </button>

          <button
            onClick={() => {
              showToast('Operação concluída!', 'success');
            }}
            className="px-6 py-4 bg-green-600 hover:bg-green-500 text-white font-bold rounded transition-colors"
          >
            Toast Simples (Sem Descrição)
          </button>
        </div>

        <div className="mt-12 p-6 bg-gray-900 border border-green-500 rounded">
          <h2 className="text-xl font-bold text-green-400 mb-4">Instruções</h2>
          <p className="text-gray-300">
            Clique nos botões acima para testar os diferentes estilos de toast.
            Os toasts aparecem no canto superior direito com backdrop blur e animações suaves.
          </p>
        </div>
      </div>
    </>
  );
}
