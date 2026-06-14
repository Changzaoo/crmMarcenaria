// Entrada virtual (joysticks de toque) compartilhada entre os controles em DOM
// (fora do Canvas) e a cena R3F (PlayerAndCamera, dentro do Canvas). Como o R3F
// roda em outra árvore React, usamos um singleton mutável lido a cada frame.

export const virtualInput = {
  // Movimento: x = lateral (-1..1), y = frente (-1..1, +1 = para frente)
  move: { x: 0, y: 0 },
  // Olhar (1ª pessoa): x = giro horizontal, y = inclinação vertical (-1..1)
  look: { x: 0, y: 0 },
};

export function resetVirtualInput() {
  virtualInput.move.x = 0;
  virtualInput.move.y = 0;
  virtualInput.look.x = 0;
  virtualInput.look.y = 0;
}
