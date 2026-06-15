/* Barramento de toasts do estúdio (premium, discreto). */
export function toast(message: string, tone: "info" | "success" | "warn" = "info") {
  window.dispatchEvent(new CustomEvent("orc3d:toast", { detail: { message, tone } }));
}

export interface ToastDetail {
  message: string;
  tone: "info" | "success" | "warn";
}
