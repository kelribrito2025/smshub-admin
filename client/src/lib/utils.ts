import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ========================================
// Utilitário de Notificações Sonoras
// ========================================

export interface SoundSettings {
  enabled: boolean;
  volume: number; // 0-100
  playOnSms: boolean;
  playOnRecharge: boolean;
  playOnPurchase: boolean;
  selectedSound: string; // Nome do arquivo de som
}

const SOUND_SETTINGS_KEY = 'store_sound_settings';

// Configurações padrão
const DEFAULT_SOUND_SETTINGS: SoundSettings = {
  enabled: true,
  volume: 35,
  playOnSms: true,
  playOnRecharge: false,
  playOnPurchase: false,
  selectedSound: 'sound2-bright.mp3',
};

// Carregar configurações do localStorage
export function getSoundSettings(): SoundSettings {
  try {
    const stored = localStorage.getItem(SOUND_SETTINGS_KEY);
    if (stored) {
      const settings = { ...DEFAULT_SOUND_SETTINGS, ...JSON.parse(stored) };
      
      // Migração automática: sound3-ping.wav → sound3-ping.mp3
      if (settings.selectedSound === 'sound3-ping.wav') {
        settings.selectedSound = 'sound3-ping.mp3';
        saveSoundSettings(settings); // Salvar migração
        console.log('[Sound Migration] Updated sound3-ping.wav to sound3-ping.mp3');
      }
      
      // Migração automática: sound2-bright.wav → sound2-bright.mp3
      if (settings.selectedSound === 'sound2-bright.wav') {
        settings.selectedSound = 'sound2-bright.mp3';
        saveSoundSettings(settings); // Salvar migração
        console.log('[Sound Migration] Updated sound2-bright.wav to sound2-bright.mp3');
      }
      
      return settings;
    }
  } catch (error) {
    console.error('Erro ao carregar configurações de som:', error);
  }
  return DEFAULT_SOUND_SETTINGS;
}

// Salvar configurações no localStorage
export function saveSoundSettings(settings: SoundSettings): void {
  try {
    localStorage.setItem(SOUND_SETTINGS_KEY, JSON.stringify(settings));
  } catch (error) {
    console.error('Erro ao salvar configurações de som:', error);
  }
}

// Tocar som de notificação
export function playNotificationSound(eventType: 'sms' | 'recharge' | 'purchase' = 'sms'): void {
  try {
    const settings = getSoundSettings();

    // Verificar se som está habilitado globalmente
    if (!settings.enabled) {
      return;
    }

    // Verificar se som está habilitado para este tipo de evento
    if (eventType === 'sms' && !settings.playOnSms) return;
    if (eventType === 'recharge' && !settings.playOnRecharge) return;
    if (eventType === 'purchase' && !settings.playOnPurchase) return;

    // Criar elemento de áudio com som selecionado
    const audio = new Audio(`/sounds/${settings.selectedSound}`);
    audio.volume = settings.volume / 100; // Converter 0-100 para 0-1

    // Tocar som
    audio.play().catch((error) => {
      console.error('Erro ao tocar som de notificação:', error);
    });
  } catch (error) {
    console.error('Erro ao executar playNotificationSound:', error);
  }
}

// Testar som (sempre toca, ignorando configurações de evento)
export function testNotificationSound(): void {
  try {
    const settings = getSoundSettings();
    
    if (!settings.enabled) {
      console.log('Som desabilitado, não é possível testar');
      return;
    }

    const audio = new Audio(`/sounds/${settings.selectedSound}`);
    audio.volume = settings.volume / 100;
    
    audio.play().catch((error) => {
      console.error('Erro ao testar som:', error);
    });
  } catch (error) {
    console.error('Erro ao executar testNotificationSound:', error);
  }
}

// ========================================
// Utilitário de Copiar para Clipboard
// ========================================

export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    // Tentar usar Clipboard API moderna
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
      
      // Feedback tátil em dispositivos móveis
      if (navigator.vibrate) {
        navigator.vibrate(50);
      }
      
      return true;
    }

    // Fallback para navegadores antigos
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    const success = document.execCommand('copy');
    document.body.removeChild(textarea);

    // Feedback tátil em dispositivos móveis
    if (success && navigator.vibrate) {
      navigator.vibrate(50);
    }

    return success;
  } catch (error) {
    console.error('Erro ao copiar para clipboard:', error);
    return false;
  }
}
