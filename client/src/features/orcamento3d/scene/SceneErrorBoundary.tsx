import { Component, ErrorInfo, ReactNode } from "react";

interface Props {
  children: ReactNode;
}
interface State {
  error: Error | null;
}

// Captura erros de runtime da cena 3D (react-three-fiber/three/drei) e os mostra
// na tela em vez de deixar o canvas preto e a mensagem só no console do navegador.
export default class SceneErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // mantém o stack no console para depuração
    console.error("[cena-3d] erro de renderização:", error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="h-full grid place-items-center p-6 text-center bg-background">
          <div className="max-w-md">
            <p className="text-red-300 font-medium mb-2">Não foi possível desenhar o ambiente 3D.</p>
            <pre className="text-[11px] text-muted whitespace-pre-wrap break-words bg-black/40 border border-white/10 rounded-lg p-3 text-left">
              {this.state.error.message}
            </pre>
            <button className="btn-primary mt-4" onClick={() => this.setState({ error: null })}>
              Tentar novamente
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
