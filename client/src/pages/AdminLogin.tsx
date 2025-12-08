import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "../lib/trpc";
import { toast } from "sonner";
import { Eye, EyeOff, Loader2, Shield } from "lucide-react";

export default function AdminLogin() {
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const loginMutation = trpc.adminAuth.login.useMutation({
    onSuccess: () => {
      toast.success("Login realizado com sucesso!");
      setLocation("/admin/dashboard");
    },
    onError: (error) => {
      toast.error(error.message || "Erro ao fazer login");
      setIsLoading(false);
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !password) {
      toast.error("Preencha todos os campos");
      return;
    }

    if (password.length < 8) {
      toast.error("A senha deve ter no mínimo 8 caracteres");
      return;
    }

    setIsLoading(true);
    loginMutation.mutate({ email, password });
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-500/10 border-2 border-green-500 mb-4">
            <Shield className="w-8 h-8 text-green-500" />
          </div>
          <h1 className="text-3xl font-bold text-green-400 mb-2">ADMIN LOGIN</h1>
          <p className="text-green-600">Painel Administrativo</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Email */}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-green-400 mb-2">
              EMAIL
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 bg-green-950/20 border border-green-500/30 rounded-lg text-green-100 placeholder-green-700 focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500"
              placeholder="admin@exemplo.com"
              disabled={isLoading}
              autoComplete="email"
            />
          </div>

          {/* Password */}
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-green-400 mb-2">
              SENHA
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 pr-12 bg-green-950/20 border border-green-500/30 rounded-lg text-green-100 placeholder-green-700 focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500"
                placeholder="••••••••"
                disabled={isLoading}
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-green-500/50 hover:text-green-400 transition-colors"
                tabIndex={-1}
              >
                {showPassword ? (
                  <EyeOff className="w-5 h-5" />
                ) : (
                  <Eye className="w-5 h-5" />
                )}
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full px-4 py-3 bg-green-500 hover:bg-green-600 disabled:bg-green-500/50 text-black font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Entrando...
              </>
            ) : (
              "ENTRAR"
            )}
          </button>
        </form>

        {/* Footer */}
        <div className="mt-8 text-center">
          <p className="text-sm text-green-600">
            Acesso restrito a administradores
          </p>
        </div>
      </div>
    </div>
  );
}
