import { Toaster as Sonner, type ToasterProps } from "sonner";

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="dark"
      className="toaster group"
      position="top-right"
      richColors
      duration={2000}
      closeButton
      {...props}
    />
  );
};

export { Toaster };
