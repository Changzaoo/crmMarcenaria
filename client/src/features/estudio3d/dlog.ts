/* Log de depuração apenas em desenvolvimento. Em produção vira no-op.
   Padroniza as tags pedidas na spec: [3D_SESSION], [CRM_CALL], [REALTIME]. */
const DEV = typeof import.meta !== "undefined" && !!import.meta.env?.DEV;

export function dlog(tag: string, ...args: unknown[]): void {
  if (DEV) console.log(`[${tag}]`, ...args);
}

export function dwarn(tag: string, ...args: unknown[]): void {
  if (DEV) console.warn(`[${tag}]`, ...args);
}
