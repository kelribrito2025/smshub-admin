import { motion } from "framer-motion";
import { staggerContainer, staggerItem } from "@/lib/animations";

interface AnimatedListProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * Container para listas com animação stagger
 * Cada item filho aparece com um pequeno delay
 */
export function AnimatedList({ children, className }: AnimatedListProps) {
  return (
    <motion.div
      variants={staggerContainer}
      initial="initial"
      animate="animate"
      className={className}
    >
      {children}
    </motion.div>
  );
}

interface AnimatedListItemProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * Item de lista com animação fade-in
 * Deve ser usado dentro de AnimatedList
 */
export function AnimatedListItem({ children, className }: AnimatedListItemProps) {
  return (
    <motion.div
      variants={staggerItem}
      className={className}
    >
      {children}
    </motion.div>
  );
}
