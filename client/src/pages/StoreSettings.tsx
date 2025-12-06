import React from 'react';
import { Settings, Volume2, Bell, CheckCircle2, Play } from 'lucide-react';
import StoreLayout from '../components/StoreLayout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import {
  getSoundSettings,
  saveSoundSettings,
  testNotificationSound,
  type SoundSettings,
} from '@/lib/utils';

// Biblioteca de sons disponíveis
const SOUND_LIBRARY = [
  { id: 'sound1-digital.mp3', name: 'Digital', description: 'Som digital moderno e curto' },
  { id: 'sound2-bright.mp3', name: 'Brilhante', description: 'Tom claro e vibrante' },
  { id: 'sound3-ping.mp3', name: 'Ping', description: 'Ping suave e discreto' },
  { id: 'sound4-soft.mp3', name: 'Suave', description: 'Notificação suave e agradável' },
  { id: 'sound5-classic.mp3', name: 'Clássico', description: 'Som de notificação tradicional' },
];

export default function StoreSettings() {
  const [settings, setSettings] = React.useState<SoundSettings>(getSoundSettings());

  // Salvar configurações automaticamente quando mudarem
  React.useEffect(() => {
    saveSoundSettings(settings);
  }, [settings]);

  const handleToggleEnabled = () => {
    setSettings((prev) => ({ ...prev, enabled: !prev.enabled }));
    toast.success(
      settings.enabled ? 'Sons desabilitados' : 'Sons habilitados',
      { duration: 2000 }
    );
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const volume = parseInt(e.target.value, 10);
    setSettings((prev) => ({ ...prev, volume }));
  };

  const handleTestSound = () => {
    testNotificationSound();
    toast.info('Testando som...', { duration: 2000 });
  };

  const handleToggleEvent = (event: 'playOnSms' | 'playOnRecharge' | 'playOnPurchase') => {
    setSettings((prev) => ({ ...prev, [event]: !prev[event] }));
  };

  const handleSelectSound = (soundId: string) => {
    setSettings((prev) => ({ ...prev, selectedSound: soundId }));
    
    // Tocar preview do som selecionado
    if (settings.enabled) {
      const audio = new Audio(`/sounds/${soundId}`);
      audio.volume = settings.volume / 100;
      audio.play().catch((error) => {
        console.error('Erro ao tocar preview:', error);
      });
    }
    
    toast.success('Som alterado!', { duration: 2000 });
  };

  const handlePlayPreview = (soundId: string) => {
    if (!settings.enabled) {
      toast.error('Ative os sons primeiro!', { duration: 2000 });
      return;
    }
    
    const audio = new Audio(`/sounds/${soundId}`);
    audio.volume = settings.volume / 100;
    audio.play().catch((error) => {
      console.error('Erro ao tocar preview:', error);
    });
  };

  return (
    <StoreLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Settings className="w-6 h-6 text-green-400" />
            <h1 className="text-2xl font-bold text-green-400">Configurações</h1>
          </div>
          <p className="text-green-600 text-sm">
            Personalize sua experiência no painel de vendas
          </p>
        </div>

        {/* Container de Notificações Sonoras */}
        <Card className="bg-black/50 border-green-900/50 p-6">
          <div className="flex items-center gap-3 mb-6">
            <Bell className="h-6 w-6 text-green-400" />
            <h2 className="text-xl font-bold text-green-400">Notificações Sonoras</h2>
          </div>

          {/* Toggle Ativar/Desativar */}
          <div className="mb-6 p-4 bg-black/30 rounded-lg border border-green-900/30">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Volume2 className="h-5 w-5 text-green-400" />
                <div>
                  <p className="font-semibold text-white">Ativar Sons</p>
                  <p className="text-sm text-gray-400">
                    Reproduzir sons de notificação no painel
                  </p>
                </div>
              </div>
              <button
                onClick={handleToggleEnabled}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  settings.enabled ? 'bg-green-500' : 'bg-gray-700'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    settings.enabled ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Biblioteca de Sons */}
          <div className="mb-6 p-4 bg-black/30 rounded-lg border border-green-900/30">
            <p className="font-semibold text-white mb-4">Escolha o Som de Notificação</p>
            
            <div className="space-y-2">
              {SOUND_LIBRARY.map((sound) => (
                <div
                  key={sound.id}
                  className={`flex items-center justify-between p-3 rounded-lg border transition-all cursor-pointer ${
                    settings.selectedSound === sound.id
                      ? 'bg-green-900/30 border-green-500'
                      : 'bg-black/20 border-green-900/20 hover:border-green-700/50'
                  }`}
                  onClick={() => handleSelectSound(sound.id)}
                >
                  <div className="flex items-center gap-3 flex-1">
                    {settings.selectedSound === sound.id && (
                      <CheckCircle2 className="h-5 w-5 text-green-400 flex-shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className={`font-medium ${
                        settings.selectedSound === sound.id ? 'text-green-400' : 'text-white'
                      }`}>
                        {sound.name}
                      </p>
                      <p className="text-xs text-gray-400 truncate">{sound.description}</p>
                    </div>
                  </div>
                  
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handlePlayPreview(sound.id);
                    }}
                    disabled={!settings.enabled}
                    className="ml-2 p-2 rounded-full bg-green-600 hover:bg-green-700 disabled:bg-gray-700 disabled:cursor-not-allowed transition-colors"
                  >
                    <Play className="h-4 w-4 text-white" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Controle de Volume */}
          <div className="mb-6 p-4 bg-black/30 rounded-lg border border-green-900/30">
            <div className="flex items-center gap-3 mb-3">
              <Volume2 className="h-5 w-5 text-green-400" />
              <p className="font-semibold text-white">Volume</p>
              <span className="ml-auto text-green-400 font-mono">{settings.volume}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={settings.volume}
              onChange={handleVolumeChange}
              disabled={!settings.enabled}
              className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>0%</span>
              <span>50%</span>
              <span>100%</span>
            </div>
          </div>

          {/* Botão Testar Som */}
          <div className="mb-6">
            <Button
              onClick={handleTestSound}
              disabled={!settings.enabled}
              className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Volume2 className="h-4 w-4 mr-2" />
              Testar Som Selecionado
            </Button>
          </div>

          {/* Eventos que Acionam Som */}
          <div className="p-4 bg-black/30 rounded-lg border border-green-900/30">
            <p className="font-semibold text-white mb-4">Tocar som quando:</p>
            
            <div className="space-y-3">
              {/* SMS Recebido */}
              <label className="flex items-center gap-3 cursor-pointer group">
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={settings.playOnSms}
                    onChange={() => handleToggleEvent('playOnSms')}
                    disabled={!settings.enabled}
                    className="sr-only peer"
                  />
                  <div className="w-5 h-5 border-2 border-green-500 rounded bg-transparent peer-checked:bg-green-500 peer-disabled:opacity-50 peer-disabled:cursor-not-allowed transition-all flex items-center justify-center">
                    {settings.playOnSms && <CheckCircle2 className="h-3 w-3 text-black" />}
                  </div>
                </div>
                <span className={`text-sm ${settings.enabled ? 'text-white' : 'text-gray-500'}`}>
                  Código SMS recebido
                </span>
              </label>

              {/* Recarga Aprovada */}
              <label className="flex items-center gap-3 cursor-pointer group">
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={settings.playOnRecharge}
                    onChange={() => handleToggleEvent('playOnRecharge')}
                    disabled={!settings.enabled}
                    className="sr-only peer"
                  />
                  <div className="w-5 h-5 border-2 border-green-500 rounded bg-transparent peer-checked:bg-green-500 peer-disabled:opacity-50 peer-disabled:cursor-not-allowed transition-all flex items-center justify-center">
                    {settings.playOnRecharge && <CheckCircle2 className="h-3 w-3 text-black" />}
                  </div>
                </div>
                <span className={`text-sm ${settings.enabled ? 'text-white' : 'text-gray-500'}`}>
                  Recarga aprovada
                </span>
              </label>

              {/* Compra Concluída */}
              <label className="flex items-center gap-3 cursor-pointer group">
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={settings.playOnPurchase}
                    onChange={() => handleToggleEvent('playOnPurchase')}
                    disabled={!settings.enabled}
                    className="sr-only peer"
                  />
                  <div className="w-5 h-5 border-2 border-green-500 rounded bg-transparent peer-checked:bg-green-500 peer-disabled:opacity-50 peer-disabled:cursor-not-allowed transition-all flex items-center justify-center">
                    {settings.playOnPurchase && <CheckCircle2 className="h-3 w-3 text-black" />}
                  </div>
                </div>
                <span className={`text-sm ${settings.enabled ? 'text-white' : 'text-gray-500'}`}>
                  Compra de número concluída
                </span>
              </label>
            </div>
          </div>

          {/* Informação Adicional */}
          <div className="mt-6 p-3 bg-green-900/10 border border-green-900/30 rounded-lg">
            <p className="text-xs text-green-400">
              💡 <strong>Dica:</strong> Clique no botão de play ao lado de cada som para ouvir uma prévia antes de escolher. 
              Os sons de notificação ajudam você a não perder nenhum código SMS importante!
            </p>
          </div>
        </Card>
      </div>
    </StoreLayout>
  );
}
