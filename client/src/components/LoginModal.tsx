import { X, Shield, Zap, Lock, Mail, User, Eye, EyeOff, Check } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLogin: (email: string, password?: string) => Promise<void>;
  onRegister?: (email: string, password: string, name: string) => Promise<void>;
}

export default function LoginModal({ isOpen, onClose, onLogin, onRegister }: LoginModalProps) {
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  // Validações
  const isEmailValid = email.includes('@') && email.includes('.');
  
  // Validações detalhadas de senha
  const passwordRequirements = {
    minLength: password.length >= 8,
    hasUpperCase: /[A-Z]/.test(password),
    hasLowerCase: /[a-z]/.test(password),
    hasNumber: /[0-9]/.test(password),
    hasSpecialChar: /[!@#$%^&*(),.?":{}|<>]/.test(password),
  };
  
  const isPasswordStrong = Object.values(passwordRequirements).every(req => req);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !isEmailValid) {
      toast.error('Digite um email válido');
      return;
    }

    if (isRegisterMode) {
      // Validações de registro
      if (!name || name.trim().length < 3) {
        toast.error('Digite seu nome completo (mínimo 3 caracteres)');
        return;
      }

      if (!password) {
        toast.error('Digite uma senha');
        return;
      }

      if (!isPasswordStrong) {
        toast.error('A senha deve ter no mínimo 8 caracteres');
        return;
      }

      if (!onRegister) {
        toast.error('Função de registro não disponível');
        return;
      }

      setIsLoading(true);
      try {
        await onRegister(email, password, name);
        setName('');
        setEmail('');
        setPassword('');
        onClose();
        toast.success('Conta criada com sucesso!');
      } catch (error: any) {
        toast.error(error.message || 'Erro ao criar conta');
      } finally {
        setIsLoading(false);
      }
    } else {
      // Login
      setIsLoading(true);
      try {
        await onLogin(email);
        setEmail('');
        onClose();
      } catch (error: any) {
        toast.error(error.message || 'Erro ao fazer login');
      } finally {
        setIsLoading(false);
      }
    }
  };

  const toggleMode = () => {
    setIsRegisterMode(!isRegisterMode);
    setName('');
    setEmail('');
    setPassword('');
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="w-full max-w-6xl bg-black border-2 border-green-500 rounded-2xl overflow-hidden shadow-2xl shadow-green-500/20">
        <div className="grid grid-cols-1 lg:grid-cols-2">
          {/* Left Side - Info Section */}
          <div className="relative bg-gradient-to-br from-green-950/50 to-black p-8 lg:p-12 border-r-2 border-green-500/30">
            {/* Cyber Grid Background */}
            <div className="absolute inset-0 opacity-5">
              <div
                className="absolute inset-0"
                style={{
                  backgroundImage:
                    'linear-gradient(#22c55e 1px, transparent 1px), linear-gradient(90deg, #22c55e 1px, transparent 1px)',
                  backgroundSize: '20px 20px',
                }}
              />
            </div>

            <div className="relative z-10">
              {/* Logo */}
              <div className="mb-8">
                <div className="w-20 h-20 border-4 border-green-500 rounded-2xl flex items-center justify-center mb-6" style={{borderWidth: '3px'}}>
                  <span className="text-5xl font-bold text-green-400 font-mono">N</span>
                </div>
                <h2 className="text-4xl font-bold text-green-400 mb-3 font-mono">
                  {isRegisterMode ? 'CRIAR CONTA' : 'FAZER LOGIN'}
                </h2>
                <p className="text-green-300 text-lg font-mono">
                  {isRegisterMode
                    ? 'Cadastre-se agora e comece a usar.'
                    : 'Acesse sua conta de forma segura e rápida.'}
                </p>
              </div>

              {/* Features */}
              <div className="hidden md:block space-y-6">
                <div className="flex items-start gap-4 bg-black/30 p-4 rounded-lg border border-green-500/20">
                  <div className="w-12 h-12 bg-green-500/10 rounded-full flex items-center justify-center flex-shrink-0">
                    <Shield className="w-6 h-6 text-green-400" strokeWidth={2} />
                  </div>
                  <div>
                    <h3 className="text-green-400 font-bold mb-1 font-mono">
                      Transação 100% segura
                    </h3>
                    <p className="text-green-300/70 text-sm font-mono">
                      Seus dados protegidos com criptografia
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4 bg-black/30 p-4 rounded-lg border border-green-500/20">
                  <div className="w-12 h-12 bg-green-500/10 rounded-full flex items-center justify-center flex-shrink-0">
                    <Zap className="w-6 h-6 text-green-400" strokeWidth={2} />
                  </div>
                  <div>
                    <h3 className="text-green-400 font-bold mb-1 font-mono">
                      Acesso instantâneo
                    </h3>
                    <p className="text-green-300/70 text-sm font-mono">
                      Entre na sua conta em segundos
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4 bg-black/30 p-4 rounded-lg border border-green-500/20">
                  <div className="w-12 h-12 bg-green-500/10 rounded-full flex items-center justify-center flex-shrink-0">
                    <Lock className="w-6 h-6 text-green-400" strokeWidth={2} />
                  </div>
                  <div>
                    <h3 className="text-green-400 font-bold mb-1 font-mono">
                      Dados criptografados
                    </h3>
                    <p className="text-green-300/70 text-sm font-mono">
                      Proteção máxima das suas informações
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Side - Form Section */}
          <div className="relative bg-black p-8 lg:p-12">
            {/* Close Button */}
            <button
              onClick={onClose}
              className="absolute top-6 right-6 w-10 h-10 flex items-center justify-center rounded-lg border-2 border-green-500/30 text-green-400 hover:bg-green-500/10 hover:border-green-500 transition-all"
            >
              <X className="w-5 h-5" strokeWidth={2.5} />
            </button>

            <div className="max-w-md mx-auto">
              {/* Form Title */}
              <div className="mb-8">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                  <span className="text-green-400 text-sm font-bold font-mono">
                    {isRegisterMode ? 'NOVO USUÁRIO' : 'AUTENTICAÇÃO'}
                  </span>
                </div>
                <h3 className="text-2xl font-bold text-white mb-2">
                  {isRegisterMode ? 'Crie sua conta' : 'Entre na sua conta'}
                </h3>
                <p className="text-gray-400 text-sm">
                  {isRegisterMode
                    ? 'Preencha os dados para se cadastrar'
                    : 'Insira suas credenciais para acessar'}
                </p>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-5">
                {/* Name Field (only for register) */}
                {isRegisterMode && (
                  <div>
                    <label className="block text-green-400 text-sm font-bold mb-2 font-mono">
                      NOME
                    </label>
                    <div className="relative">
                      <User
                        className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-green-500/50"
                        strokeWidth={2}
                      />
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Seu nome completo"
                        className="w-full bg-black border-2 border-green-500/30 rounded-lg px-12 py-3 text-white placeholder-gray-600 focus:border-green-500 focus:outline-none transition-colors font-mono"
                        required
                        disabled={isLoading}
                        minLength={3}
                      />
                    </div>
                  </div>
                )}

                {/* Email Field */}
                <div>
                  <label className="block text-green-400 text-sm font-bold mb-2 font-mono">
                    EMAIL
                  </label>
                  <div className="relative">
                    <Mail
                      className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-green-500/50"
                      strokeWidth={2}
                    />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="seu@email.com"
                      className="w-full bg-black border-2 border-green-500/30 rounded-lg px-12 py-3 text-white placeholder-gray-600 focus:border-green-500 focus:outline-none transition-colors font-mono"
                      required
                      disabled={isLoading}
                    />
                  </div>
                </div>



                {/* Password Field (only for register) */}
                {isRegisterMode && (
                  <div>
                    <label className="block text-green-400 text-sm font-bold mb-2 font-mono">
                      SENHA
                    </label>
                    <div className="relative">
                      <Lock
                        className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-green-500/50"
                        strokeWidth={2}
                      />
                      <input
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="mínimo 8 caracteres"
                        className={`w-full bg-black border-2 rounded-lg px-12 pr-12 py-3 text-white placeholder-gray-600 focus:outline-none transition-colors font-mono ${
                          password && !isPasswordStrong
                            ? 'border-red-500 focus:border-red-500'
                            : password && isPasswordStrong
                            ? 'border-green-500 focus:border-green-500'
                            : 'border-green-500/30 focus:border-green-500'
                        }`}
                        required
                        disabled={isLoading}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-green-500/50 hover:text-green-400 transition-colors focus:outline-none"
                        tabIndex={-1}
                      >
                        {showPassword ? (
                          <EyeOff className="w-5 h-5" strokeWidth={2} />
                        ) : (
                          <Eye className="w-5 h-5" strokeWidth={2} />
                        )}
                      </button>
                    </div>
                    {password && (
                      <div className="mt-3 space-y-2 bg-black/30 border border-green-500/20 rounded-lg p-3">
                        <p className="text-green-400 text-xs font-bold font-mono mb-2">REQUISITOS DA SENHA:</p>
                        
                        <div className="space-y-1.5">
                          {/* Mínimo 8 caracteres */}
                          <div className="flex items-center gap-2">
                            <div className={`w-4 h-4 rounded-full flex items-center justify-center ${
                              passwordRequirements.minLength 
                                ? 'bg-green-500/20 border border-green-500' 
                                : 'bg-red-500/20 border border-red-500/50'
                            }`}>
                              {passwordRequirements.minLength && (
                                <Check className="w-3 h-3 text-green-400" strokeWidth={3} />
                              )}
                            </div>
                            <span className={`text-xs font-mono ${
                              passwordRequirements.minLength ? 'text-green-400' : 'text-red-400/70'
                            }`}>
                              Mínimo 8 caracteres
                            </span>
                          </div>

                          {/* Letra maiúscula */}
                          <div className="flex items-center gap-2">
                            <div className={`w-4 h-4 rounded-full flex items-center justify-center ${
                              passwordRequirements.hasUpperCase 
                                ? 'bg-green-500/20 border border-green-500' 
                                : 'bg-red-500/20 border border-red-500/50'
                            }`}>
                              {passwordRequirements.hasUpperCase && (
                                <Check className="w-3 h-3 text-green-400" strokeWidth={3} />
                              )}
                            </div>
                            <span className={`text-xs font-mono ${
                              passwordRequirements.hasUpperCase ? 'text-green-400' : 'text-red-400/70'
                            }`}>
                              Letra maiúscula (A-Z)
                            </span>
                          </div>

                          {/* Letra minúscula */}
                          <div className="flex items-center gap-2">
                            <div className={`w-4 h-4 rounded-full flex items-center justify-center ${
                              passwordRequirements.hasLowerCase 
                                ? 'bg-green-500/20 border border-green-500' 
                                : 'bg-red-500/20 border border-red-500/50'
                            }`}>
                              {passwordRequirements.hasLowerCase && (
                                <Check className="w-3 h-3 text-green-400" strokeWidth={3} />
                              )}
                            </div>
                            <span className={`text-xs font-mono ${
                              passwordRequirements.hasLowerCase ? 'text-green-400' : 'text-red-400/70'
                            }`}>
                              Letra minúscula (a-z)
                            </span>
                          </div>

                          {/* Número */}
                          <div className="flex items-center gap-2">
                            <div className={`w-4 h-4 rounded-full flex items-center justify-center ${
                              passwordRequirements.hasNumber 
                                ? 'bg-green-500/20 border border-green-500' 
                                : 'bg-red-500/20 border border-red-500/50'
                            }`}>
                              {passwordRequirements.hasNumber && (
                                <Check className="w-3 h-3 text-green-400" strokeWidth={3} />
                              )}
                            </div>
                            <span className={`text-xs font-mono ${
                              passwordRequirements.hasNumber ? 'text-green-400' : 'text-red-400/70'
                            }`}>
                              Número (0-9)
                            </span>
                          </div>

                          {/* Caractere especial */}
                          <div className="flex items-center gap-2">
                            <div className={`w-4 h-4 rounded-full flex items-center justify-center ${
                              passwordRequirements.hasSpecialChar 
                                ? 'bg-green-500/20 border border-green-500' 
                                : 'bg-red-500/20 border border-red-500/50'
                            }`}>
                              {passwordRequirements.hasSpecialChar && (
                                <Check className="w-3 h-3 text-green-400" strokeWidth={3} />
                              )}
                            </div>
                            <span className={`text-xs font-mono ${
                              passwordRequirements.hasSpecialChar ? 'text-green-400' : 'text-red-400/70'
                            }`}>
                              Caractere especial (!@#$%...)
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-green-500 hover:bg-green-400 text-black font-bold py-4 rounded-lg transition-all border-2 border-green-400 font-mono text-lg hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <User className="w-5 h-5" strokeWidth={2.5} />
                  {isLoading
                    ? isRegisterMode
                      ? 'CRIANDO CONTA...'
                      : 'ENTRANDO...'
                    : isRegisterMode
                    ? 'CRIAR CONTA'
                    : 'ENTRAR'}
                </button>

                {/* Toggle Mode */}
                <div className="text-center pt-4">
                  <p className="text-gray-400 text-sm">
                    {isRegisterMode ? 'Já tem conta?' : 'Não tem conta?'}{' '}
                    <button
                      type="button"
                      onClick={toggleMode}
                      disabled={isLoading}
                      className="text-green-400 font-bold hover:text-green-300 transition-colors font-mono disabled:opacity-50"
                    >
                      {isRegisterMode ? 'Fazer login' : 'Criar agora'}
                    </button>
                  </p>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
