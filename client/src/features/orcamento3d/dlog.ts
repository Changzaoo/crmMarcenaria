/* Log de depuração apenas em desenvolvimento. Em produção vira no-op.
   Tags padronizadas com o site: [3D_SESSION], [CRM_CALL], [REALTIME]. */
const DEV = typeof import.meta !== "undefined" && !!(import.meta as any).env?.DEV;

export function dlog(tag: string, ...args: unknown[]): void {
  if (DEV) console.log(`[${tag}]`, ...args);
}
