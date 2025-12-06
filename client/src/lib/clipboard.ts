/**
 * Copy text to clipboard with haptic feedback on mobile devices
 * @param text - Text to copy to clipboard
 * @returns Promise that resolves when copy is successful
 */
export async function copyToClipboard(text: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(text);
    
    // Provide haptic feedback on supported devices (mobile)
    if ('vibrate' in navigator) {
      navigator.vibrate(50); // Short vibration (50ms)
    }
  } catch (error) {
    // Fallback for older browsers or when clipboard API fails
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '-999999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    
    try {
      document.execCommand('copy');
      
      // Provide haptic feedback on fallback too
      if ('vibrate' in navigator) {
        navigator.vibrate(50);
      }
    } finally {
      document.body.removeChild(textArea);
    }
  }
}
