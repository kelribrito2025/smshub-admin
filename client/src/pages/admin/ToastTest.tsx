import { toast } from '@/contexts/ToastContext';

export default function ToastTest() {
  return (
    <div className="p-8 space-y-6">
      <h1 className="text-3xl font-bold text-green-400 mb-8">Teste de Toasts - Estilo Brutal</h1>
      
      <div className="grid grid-cols-2 gap-4 max-w-2xl">
        <button
          onClick={() => {
            toast.success('Número adquirido com sucesso! Número: +55 11 98765-4321. Aguardando SMS...');
          }}
          className="px-6 py-4 bg-green-500 hover:bg-green-400 text-black font-bold rounded transition-colors"
        >
          Toast de Sucesso
        </button>

        <button
          onClick={() => {
            toast.error('Erro ao comprar número: Saldo insuficiente. Você precisa de R$ 2,06, mas tem apenas R$ 0,00');
          }}
          className="px-6 py-4 bg-red-500 hover:bg-red-400 text-black font-bold rounded transition-colors"
        >
          Toast de Erro
        </button>

        <button
          onClick={() => {
            toast.info('Em breve: sistema de recarga - Adicione saldo via PIX, cartão de crédito ou boleto bancário');
          }}
          className="px-6 py-4 bg-cyan-500 hover:bg-cyan-400 text-black font-bold rounded transition-colors"
        >
          Toast de Info
        </button>

        <button
          onClick={() => {
            toast.warning('Atenção: Estoque baixo - Apenas 3 números disponíveis para WhatsApp no Brasil');
          }}
          className="px-6 py-4 bg-yellow-500 hover:bg-yellow-400 text-black font-bold rounded transition-colors"
        >
          Toast de Warning
        </button>

        <button
          onClick={() => {
            // Toast customizado não suporta chamada direta com description
            toast.info('Pedido Cancelado: Você cancelou com sucesso seu pedido #12345. Se isso foi um erro, por favor, refaça o pedido ou entre em contato com o suporte.');
          }}
          className="px-6 py-4 bg-gray-500 hover:bg-gray-400 text-black font-bold rounded transition-colors"
        >
          Toast Normal (Longo)
        </button>

        <button
          onClick={() => {
            toast.success('Operação concluída!');
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
          Os toasts aparecem no canto superior direito com o visual brutal customizado.
        </p>
      </div>
    </div>
  );
}
