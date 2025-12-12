import { Toaster as Sonner, type ToasterProps } from "sonner";

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="dark"
      className="toaster group"
      position="top-center"
      duration={2000}
      closeButton={false}
      toastOptions={{
        unstyled: true,
        classNames: {
          toast: 'w-full flex items-center gap-3 p-4 rounded-lg border backdrop-blur-sm shadow-2xl font-mono text-sm',
          success: 'bg-black/90 border-cyan-500/50 text-cyan-400',
          error: 'bg-black/90 border-red-500/50 text-red-400',
          warning: 'bg-black/90 border-yellow-500/50 text-yellow-400',
          info: 'bg-black/90 border-blue-500/50 text-blue-400',
          title: 'font-bold',
          description: 'text-xs opacity-80 mt-1',
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
