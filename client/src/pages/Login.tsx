import { FormEvent, useState } from "react";
import { ArrowRight, Eye, EyeOff, KeyRound, LockKeyhole, Mail, ShieldCheck } from "lucide-react";
import { useAuth } from "../auth/AuthContext";

function authErrorMessage(error: unknown) {
  const code =
    typeof error === "object" && error && "code" in error
      ? String((error as { code?: string }).code)
      : "";

  const messages: Record<string, string> = {
    "auth/invalid-credential": "Email ou senha inválidos.",
    "auth/user-not-found": "Email ou senha inválidos.",
    "auth/wrong-password": "Email ou senha inválidos.",
    "auth/invalid-email": "Informe um email válido.",
    "auth/missing-password": "Informe a senha.",
    "auth/too-many-requests": "Muitas tentativas. Aguarde um pouco e tente novamente.",
    "auth/network-request-failed": "Não foi possível conectar ao Firebase agora.",
    "auth/operation-not-allowed": "Ative o provedor Email/Senha no Firebase Authentication.",
  };

  return messages[code] || "Não foi possível entrar. Confira os dados e tente novamente.";
}

export default function Login() {
  const { signIn, resetPassword } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [resetting, setResetting] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    setMessage("");
    setSubmitting(true);

    try {
      await signIn(email, password);
    } catch (err) {
      setError(authErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleReset = async () => {
    setError("");
    setMessage("");

    if (!email.trim()) {
      setError("Informe seu email para recuperar a senha.");
      return;
    }

    setResetting(true);
    try {
      await resetPassword(email);
      setMessage("Enviamos o link de recuperação para o email informado.");
    } catch (err) {
      setError(authErrorMessage(err));
    } finally {
      setResetting(false);
    }
  };

  return (
    <div className="min-h-full bg-background text-text grid lg:grid-cols-[1.05fr_0.95fr]">
      <section className="hidden lg:flex relative overflow-hidden border-r border-white/5 p-10 flex-col justify-between">
        <div className="absolute inset-0 opacity-[0.18] bg-[linear-gradient(120deg,rgba(216,185,120,0.28),transparent_28%),linear-gradient(0deg,rgba(90,56,37,0.35),transparent_42%)]" />
        <div className="relative">
          <div className="inline-flex items-center gap-2 rounded-lg border border-champagne/25 bg-surfaceSoft/70 px-3 py-2 text-xs text-champagne">
            <ShieldCheck size={16} />
            Acesso autenticado
          </div>
        </div>

        <div className="relative max-w-2xl">
          <p className="text-xs uppercase tracking-[0.28em] text-champagne mb-4">CRM de marcenaria</p>
          <h1 className="font-display text-7xl text-text leading-none">NEXUS</h1>
          <p className="mt-6 max-w-xl text-muted leading-7">
            Acesso interno para equipe autorizada.
          </p>
        </div>

        <div className="relative grid grid-cols-3 gap-3 max-w-xl">
          {["Comercial", "Produção", "Financeiro"].map((item) => (
            <div key={item} className="rounded-lg border border-white/10 bg-surface/80 px-4 py-3">
              <div className="h-1.5 w-10 rounded-full bg-champagne mb-3" />
              <div className="text-sm font-medium">{item}</div>
            </div>
          ))}
        </div>
      </section>

      <main className="grid place-items-center px-5 py-10">
        <form onSubmit={handleSubmit} className="card w-full max-w-md p-6 sm:p-8">
          <div className="mb-8">
            <div className="w-12 h-12 rounded-lg bg-champagne text-background grid place-items-center mb-5">
              <KeyRound size={24} />
            </div>
            <h2 className="font-display text-3xl">Entrar</h2>
            <p className="text-sm text-muted mt-2">Email e senha da equipe Nexus Marcenaria.</p>
          </div>

          <div className="space-y-4">
            <label className="block">
              <span className="label">Email</span>
              <span className="relative block">
                <Mail size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                <input
                  className="input pl-10"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="nome@empresa.com"
                  required
                />
              </span>
            </label>

            <label className="block">
              <span className="label">Senha</span>
              <span className="relative block">
                <LockKeyhole size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                <input
                  className="input pl-10 pr-11"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Sua senha"
                  required
                />
                <button
                  type="button"
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg grid place-items-center text-muted hover:text-text hover:bg-white/5"
                  onClick={() => setShowPassword((value) => !value)}
                  aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                >
                  {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </span>
            </label>
          </div>

          {error && <div className="mt-5 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">{error}</div>}
          {message && <div className="mt-5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200">{message}</div>}

          <button type="submit" className="btn-primary w-full mt-6" disabled={submitting}>
            {submitting ? "Entrando..." : "Entrar"}
            <ArrowRight size={18} />
          </button>

          <button type="button" className="btn-ghost w-full mt-3" onClick={handleReset} disabled={resetting}>
            {resetting ? "Enviando..." : "Recuperar senha"}
          </button>
        </form>
      </main>
    </div>
  );
}
