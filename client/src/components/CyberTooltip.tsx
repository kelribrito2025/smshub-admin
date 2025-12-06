import { Star, X } from 'lucide-react';

interface CyberTooltipProps {
  isOpen: boolean;
  onClose: () => void;
  className?: string;
  successRate?: number;
}

export default function CyberTooltip({ isOpen, onClose, className = '', successRate = 35 }: CyberTooltipProps) {
  if (!isOpen) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-40"
        onClick={onClose}
      />
      <div className={`absolute z-50 w-[580px] animate-in fade-in zoom-in duration-200 ${className}`}>
        <div className="bg-black border-2 border-green-500 rounded-lg shadow-2xl shadow-green-500/20 overflow-hidden">
          <div className="bg-gradient-to-r from-green-500 to-emerald-500 px-6 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2 text-black font-bold">
              <Star className="w-5 h-5 fill-black" />
              <span>Opção Recomendada</span>
            </div>
            <button
              onClick={onClose}
              className="text-black hover:text-zinc-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-6 space-y-2">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <p className="text-green-400 font-semibold text-lg">
                Taxa de sucesso: {successRate}%
              </p>
            </div>

            <p className="text-gray-400 text-sm pl-4">
              (melhor desempenho entre as opções)
            </p>
          </div>
        </div>

        <div className="w-4 h-4 bg-black border-l-2 border-t-2 border-green-500 absolute -top-2 left-8 rotate-45" />
      </div>
    </>
  );
}
