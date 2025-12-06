import { useEffect, useRef, useState } from 'react';

/**
 * Hook customizado para animar contagem de números (counter animation)
 * Cria efeito visual de "rolar" números para cima ou para baixo
 * 
 * @param end - Valor final desejado
 * @param duration - Duração da animação em milissegundos (padrão: 800ms)
 * @returns Valor animado atual
 */
export function useCountUp(end: number, duration: number = 800): number {
  const [count, setCount] = useState(end);
  const startRef = useRef(end);
  const startTimeRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    // Se o valor final não mudou, não animar
    if (startRef.current === end) {
      return;
    }

    const startValue = startRef.current;
    const endValue = end;
    const difference = endValue - startValue;

    // Função de easing (ease-out cubic) para animação suave
    const easeOutCubic = (t: number): number => {
      return 1 - Math.pow(1 - t, 3);
    };

    // Função de animação usando requestAnimationFrame
    const animate = (currentTime: number) => {
      if (startTimeRef.current === null) {
        startTimeRef.current = currentTime;
      }

      const elapsed = currentTime - startTimeRef.current;
      const progress = Math.min(elapsed / duration, 1);
      const easedProgress = easeOutCubic(progress);

      // Calcular valor atual baseado no progresso
      const currentValue = startValue + (difference * easedProgress);
      setCount(currentValue);

      // Continuar animação se não terminou
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate);
      } else {
        // Garantir que termina exatamente no valor final
        setCount(endValue);
        startRef.current = endValue;
        startTimeRef.current = null;
      }
    };

    // Iniciar animação
    rafRef.current = requestAnimationFrame(animate);

    // Cleanup: cancelar animação se componente desmontar
    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [end, duration]);

  return count;
}
