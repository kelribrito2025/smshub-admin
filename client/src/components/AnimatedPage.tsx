import { motion } from "framer-motion";
import { pageTransition } from "@/lib/animations";

interface AnimatedPageProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * Wrapper para páginas com animação de fade-in/fade-out
 * Usa Framer Motion para transições suaves
 */
export function AnimatedPage({ children, className }: AnimatedPageProps) {
  return (
    <motion.div
      initial={pageTransition.initial}
      animate={pageTransition.animate}
      exit={pageTransition.exit}
      transition={{ duration: 0.25, ease: "easeInOut" as any }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
