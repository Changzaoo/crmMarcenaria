import type { TourStep } from "../../components/Tutorial";
import type { Role } from "./types";

// Passos do tutorial do Estúdio 3D — explicam cada item do menu e como operar.
// Variam conforme o papel (cliente x arquiteto) e o modo somente-leitura.
export function buildStudioSteps(role: Role, readOnly?: boolean): TourStep[] {
  const cliente = role === "cliente";
  const steps: TourStep[] = [];

  steps.push({
    title: cliente ? "Bem-vindo ao seu Estúdio 3D" : "Atendimento no Estúdio 3D",
    body: cliente
      ? "Aqui você monta o seu ambiente em 3D: escolhe móveis, ajusta medidas e materiais, e pode chamar um especialista para te ajudar em tempo real. Vou mostrar cada parte da tela."
      : "Você entrou na sessão do cliente — é a mesma cena que ele vê, ao vivo. Vou apresentar cada controle do estúdio para você conduzir o atendimento.",
  });

  steps.push({
    target: '[data-tour="studio-nome"]',
    title: "Nome do projeto",
    body: "Clique no título para renomear o projeto. É por ele que o ambiente é identificado nas listas e no orçamento.",
    placement: "bottom",
  });

  steps.push({
    target: '[data-tour="studio-camera"]',
    title: "Modos de câmera",
    body: "Troque a forma de ver o ambiente: 1ª pessoa (caminhe por dentro), 3ª pessoa (siga um avatar), Isométrica (perspectiva, ideal para posicionar móveis) e Vista superior (planta vista de cima). Atalhos: teclas 1, 2, 3 e 4.",
    placement: "bottom",
  });

  if (!readOnly) {
    steps.push({
      target: '[data-tour="studio-lib"]',
      title: "Biblioteca de móveis",
      body: "Busque por nome ou categoria (cozinhas, armários, closets…) e clique em um item para inseri-lo no ambiente. Depois é só arrastá-lo até o lugar certo.",
      placement: "right",
    });
  }

  steps.push({
    target: '[data-tour="studio-floors"]',
    title: "Andares e paredes",
    body: "Adicione ou remova andares com + e −, navegue entre eles e alterne o modo das paredes: altas, rebaixadas ou ocultas — como no The Sims. Dá para escolher também quais andares ficam visíveis. Atalhos: [ e ] mudam de andar, C alterna as paredes.",
    placement: "right",
  });

  steps.push({
    target: '[data-tour="studio-camera"]',
    title: "Como se movimentar e mexer nos móveis",
    body: "Em 1ª/3ª pessoa, ande com W A S D ou as setas. Em Isométrica/Vista superior, arraste os móveis para posicioná-los, gire a cena com o botão direito do mouse e use a rolagem para aproximar ou afastar. Clique em um móvel para selecioná-lo.",
  });

  steps.push({
    target: '[data-tour="studio-props"]',
    title: "Propriedades do móvel",
    body: readOnly
      ? "Com um móvel selecionado, este painel mostra o tamanho, o material e o acabamento dele."
      : "Selecione um móvel para editar largura, altura, profundidade, material e acabamento aqui. Atalhos: R gira ±45°, Ctrl/Cmd+D duplica e Delete remove o móvel selecionado.",
    placement: "left",
  });

  steps.push({
    target: '[data-tour="studio-session"]',
    title: "Sessão e colaboração",
    body: cliente
      ? "Mostra quem está online. Quando um especialista entra, a sessão fica colaborativa: vocês veem e editam o mesmo ambiente ao vivo."
      : "Mostra cliente e arquiteto online. Ao concluir, use “Finalizar atendimento” para encerrar e voltar ao painel de Suporte 3D.",
    placement: "left",
  });

  steps.push({
    target: '[data-tour="studio-save"]',
    title: "Salvar",
    body: "O projeto salva sozinho enquanto você edita, mas você pode salvar quando quiser aqui ou com Ctrl/Cmd+S.",
    placement: "bottom",
  });

  steps.push({
    target: '[data-tour="studio-resumo"]',
    title: "Pré-orçamento",
    body: cliente
      ? "Gera um resumo com os móveis e uma estimativa de valores. É também por aqui que você envia o projeto para análise da marcenaria."
      : "Gera o resumo do ambiente com a estimativa de valores para conduzir a proposta.",
    placement: "bottom",
  });

  steps.push({
    target: '[data-tour="studio-atalhos"]',
    title: "Atalhos de teclado",
    body: "Abre a lista completa de atalhos do estúdio. Você também pode abri-la a qualquer momento pressionando a tecla ?.",
    placement: "bottom",
  });

  if (cliente) {
    steps.push({
      target: '[data-tour="studio-chamar"]',
      title: "Chamar arquiteto",
      body: "Precisa de ajuda? Clique aqui para chamar um especialista. Ele recebe um aviso na hora e pode entrar na sua sessão para montar o ambiente junto com você.",
      placement: "bottom",
    });
  }

  return steps;
}
