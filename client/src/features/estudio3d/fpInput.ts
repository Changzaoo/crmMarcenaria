/* Estado de input do modo primeira pessoa, partilhado entre o
   joystick/teclado (DOM) e o rig de câmera (Three). Mutável por
   performance — lido a cada frame, sem causar re-render. */
export const fpInput = {
  forward: 0, // -1..1
  strafe: 0, // -1..1
  lookDX: 0, // delta de olhar (mobile), consumido por frame
  lookDY: 0,
};

export function resetFpInput() {
  fpInput.forward = 0;
  fpInput.strafe = 0;
  fpInput.lookDX = 0;
  fpInput.lookDY = 0;
}
