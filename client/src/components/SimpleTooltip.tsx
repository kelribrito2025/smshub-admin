import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';

interface SimpleTooltipProps {
  content: React.ReactNode;
  children: React.ReactNode;
}

export function SimpleTooltip({ content, children }: SimpleTooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isVisible && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      const tooltipWidth = 280;
      
      // Calcula a posição ideal (centralizada no trigger)
      let idealLeft = rect.left + rect.width / 2;
      
      // Verifica se o tooltip vai sair da viewport
      const halfTooltipWidth = tooltipWidth / 2;
      const viewportWidth = window.innerWidth;
      
      // Ajusta se estiver muito à esquerda
      if (idealLeft - halfTooltipWidth < 10) {
        idealLeft = halfTooltipWidth + 10;
      }
      
      // Ajusta se estiver muito à direita
      if (idealLeft + halfTooltipWidth > viewportWidth - 10) {
        idealLeft = viewportWidth - halfTooltipWidth - 10;
      }
      
      setPosition({
        top: rect.top - 8, // 8px acima do trigger
        left: idealLeft, // centralizado com ajuste de viewport
      });
    }
  }, [isVisible]);

  const tooltipContent = isVisible && createPortal(
    <div 
      className="fixed z-[9999] animate-in fade-in-0 zoom-in-95 duration-200"
      style={{
        top: `${position.top}px`,
        left: `${position.left}px`,
        transform: 'translate(-50%, -100%)',
        minWidth: '280px',
        maxWidth: '280px',
        pointerEvents: 'none'
      }}
    >
      <div className="bg-black border-2 border-green-500 rounded-lg shadow-2xl shadow-green-500/20">
        {content}
      </div>
      {/* Seta do tooltip */}
      <div 
        className="absolute top-full left-1/2 -translate-x-1/2 -mt-1"
        style={{
          width: 0,
          height: 0,
          borderLeft: '6px solid transparent',
          borderRight: '6px solid transparent',
          borderTop: '6px solid #10b981'
        }}
      />
    </div>,
    document.body
  );

  return (
    <div className="relative inline-block">
      <div
        ref={triggerRef}
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
        className="cursor-help"
      >
        {children}
      </div>
      {tooltipContent}
    </div>
  );
}
