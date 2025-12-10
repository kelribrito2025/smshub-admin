import React from 'react';
import { useLocation } from 'wouter';
import { useStoreAuth } from '../contexts/StoreAuthContext';
import StoreLayout from '../components/StoreLayout';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { User, Mail, Hash, Key, MapPin, Home, Copy } from 'lucide-react';
import { copyToClipboard } from '../lib/clipboard';
import { ProfileSkeleton } from '../components/skeletons';

export default function StoreAccount() {
  const { customer, logout } = useStoreAuth();
  const [, setLocation] = useLocation();
  const [copiedPin, setCopiedPin] = React.useState(false);

  const handleCopyPin = async () => {
    if (!customer) return;
    const pinText = `#${customer.pin.toString().padStart(4, '0')}`;
    await copyToClipboard(pinText);
    setCopiedPin(true);
    setTimeout(() => setCopiedPin(false), 2000);
  };

  // Redirect to /store if not authenticated
  React.useEffect(() => {
    if (!customer) {
      setLocation('/');
    }
  }, [customer, setLocation]);

  if (!customer) {
    return (
      <StoreLayout>
        <ProfileSkeleton />
      </StoreLayout>
    );
  }

  return (
    <StoreLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div>
          <div className="flex items-center gap-3 mb-2">
            <User className="w-6 h-6 text-green-400" />
            <h1 className="text-2xl font-bold text-green-400">PERFIL</h1>
          </div>
          <p className="text-green-600 text-sm">
            Gerencie suas informações pessoais
          </p>
        </div>

        {/* Profile Form */}
        <Card className="bg-black/50 border-green-900/50 p-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {/* PIN - Mesma altura dos outros campos */}
            <div>
              <label className="block text-sm font-bold text-green-400 mb-2 uppercase">
                PIN DE CLIENTE
              </label>
              <div className="relative">
                <Input
                  value={`#${customer.pin.toString().padStart(4, '0')}`}
                  readOnly
                  className="bg-gray-900 border-green-900/50 text-green-400 font-mono pr-10"
                />
                <button
                  type="button"
                  onClick={handleCopyPin}
                  onTouchEnd={(e) => {
                    e.preventDefault();
                    handleCopyPin();
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-green-600 hover:text-green-400 transition-colors cursor-pointer touch-manipulation"
                  title="Copiar PIN"
                >
                  {copiedPin ? (
                    <span className="text-xs font-bold">✓</span>
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Name */}
            <div>
              <label className="block text-sm font-bold text-green-400 mb-2 uppercase">
                NOME COMPLETO
              </label>
              <Input
                value={customer.name}
                readOnly
                placeholder="Digite seu nome completo"
                className="bg-gray-900 border-green-900/50 text-green-400 font-mono"
              />
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-bold text-green-400 mb-2 uppercase">
                EMAIL
              </label>
              <Input
                value={customer.email}
                readOnly
                placeholder="seu@email.com"
                className="bg-gray-900 border-green-900/50 text-green-400 font-mono"
              />
            </div>

            {/* CPF/CNPJ */}
            <div>
              <label className="block text-sm font-bold text-green-400 mb-2 uppercase">
                CPF/CNPJ
              </label>
              <Input
                placeholder="000.000.000-00"
                className="bg-gray-900 border-green-900/50 text-green-400 font-mono"
              />
            </div>
          </div>

          {/* Address Section */}
          <div className="mt-8 pt-8 border-t border-green-900/50">
            <h2 className="text-xl font-bold text-green-400 mb-6 flex items-center gap-2">
              <MapPin className="w-5 h-5" />
              ENDEREÇO
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* CEP */}
              <div>
                <label className="block text-sm font-bold text-green-400 mb-2 uppercase">
                  CEP
                </label>
                <Input
                  placeholder="00000-000"
                  className="bg-gray-900 border-green-900/50 text-green-400 font-mono"
                />
              </div>

              {/* Estado */}
              <div>
                <label className="block text-sm font-bold text-green-400 mb-2 uppercase">
                  ESTADO
                </label>
                <select className="w-full bg-gray-900 border border-green-900/50 rounded px-3 py-2 text-green-400 font-mono focus:outline-none focus:border-green-500">
                  <option value="">Selecione o estado</option>
                  <option value="AC">AC - Acre</option>
                  <option value="AL">AL - Alagoas</option>
                  <option value="AP">AP - Amapá</option>
                  <option value="AM">AM - Amazonas</option>
                  <option value="BA">BA - Bahia</option>
                  <option value="CE">CE - Ceará</option>
                  <option value="DF">DF - Distrito Federal</option>
                  <option value="ES">ES - Espírito Santo</option>
                  <option value="GO">GO - Goiás</option>
                  <option value="MA">MA - Maranhão</option>
                  <option value="MT">MT - Mato Grosso</option>
                  <option value="MS">MS - Mato Grosso do Sul</option>
                  <option value="MG">MG - Minas Gerais</option>
                  <option value="PA">PA - Pará</option>
                  <option value="PB">PB - Paraíba</option>
                  <option value="PR">PR - Paraná</option>
                  <option value="PE">PE - Pernambuco</option>
                  <option value="PI">PI - Piauí</option>
                  <option value="RJ">RJ - Rio de Janeiro</option>
                  <option value="RN">RN - Rio Grande do Norte</option>
                  <option value="RS">RS - Rio Grande do Sul</option>
                  <option value="RO">RO - Rondônia</option>
                  <option value="RR">RR - Roraima</option>
                  <option value="SC">SC - Santa Catarina</option>
                  <option value="SP">SP - São Paulo</option>
                  <option value="SE">SE - Sergipe</option>
                  <option value="TO">TO - Tocantins</option>
                </select>
              </div>

              {/* Cidade */}
              <div>
                <label className="block text-sm font-bold text-green-400 mb-2 uppercase">
                  CIDADE
                </label>
                <Input
                  placeholder="Digite a cidade"
                  className="bg-gray-900 border-green-900/50 text-green-400 font-mono"
                />
              </div>

              {/* Bairro */}
              <div>
                <label className="block text-sm font-bold text-green-400 mb-2 uppercase">
                  BAIRRO
                </label>
                <Input
                  placeholder="Digite o bairro"
                  className="bg-gray-900 border-green-900/50 text-green-400 font-mono"
                />
              </div>

              {/* Rua/Avenida */}
              <div>
                <label className="block text-sm font-bold text-green-400 mb-2 uppercase">
                  RUA/AVENIDA
                </label>
                <Input
                  placeholder="Digite a rua"
                  className="bg-gray-900 border-green-900/50 text-green-400 font-mono"
                />
              </div>

              {/* Número */}
              <div>
                <label className="block text-sm font-bold text-green-400 mb-2 uppercase">
                  NÚMERO
                </label>
                <Input
                  placeholder="Nº"
                  className="bg-gray-900 border-green-900/50 text-green-400 font-mono"
                />
              </div>
            </div>
          </div>

          {/* Action Button */}
          <div className="mt-8">
            <Button className="bg-green-500 hover:bg-green-400 text-black font-mono font-bold">
              💾 SALVAR PERFIL
            </Button>
          </div>
        </Card>
      </div>
    </StoreLayout>
  );
}
