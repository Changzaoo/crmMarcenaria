import { ReactNode } from "react";
import { Spinner } from "../components/ui";
import Login from "../pages/Login";
import { useAuth } from "./AuthContext";

export default function AuthGate({ children }: { children: ReactNode }) {
  const { loading, user } = useAuth();

  if (loading) {
    return (
      <div className="min-h-full bg-background grid place-items-center px-6">
        <div className="text-center">
          <Spinner />
          <p className="text-sm text-muted">Validando sessão...</p>
        </div>
      </div>
    );
  }

  if (!user) return <Login />;

  return <>{children}</>;
}
