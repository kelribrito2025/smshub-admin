import { forwardRef, useState } from "react";
import { Input } from "./input";

interface CurrencyInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange" | "value"> {
  value?: number; // Value in cents
  onChange?: (valueInCents: number) => void;
}

/**
 * Input com máscara brasileira para valores em reais.
 * 
 * Regra: Os últimos 2 dígitos digitados são sempre os centavos.
 * O restante à esquerda é o valor inteiro.
 * 
 * Exemplo:
 * - Digitar "250" → R$ 2,50
 * - Digitar "12345" → R$ 123,45
 * - Digitar "1000000" → R$ 10.000,00
 */
// Helper function to format cents to BRL currency
const formatCurrency = (cents: number): string => {
  const reais = cents / 100;
  return reais.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
};

export const CurrencyInput = forwardRef<HTMLInputElement, CurrencyInputProps>(
  ({ value = 0, onChange, ...props }, ref) => {
    const [displayValue, setDisplayValue] = useState(() => formatCurrency(value));

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      // Remove tudo que não é dígito
      const digits = e.target.value.replace(/\D/g, "");
      
      if (digits === "") {
        setDisplayValue("R$ 0,00");
        onChange?.(0);
        return;
      }

      // Converte para número (centavos)
      const cents = parseInt(digits, 10);
      
      // Formata para exibição
      setDisplayValue(formatCurrency(cents));
      
      // Notifica mudança
      onChange?.(cents);
    };

    return (
      <Input
        ref={ref}
        type="text"
        value={displayValue}
        onChange={handleChange}
        {...props}
      />
    );
  }
);

CurrencyInput.displayName = "CurrencyInput";
