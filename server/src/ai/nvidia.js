// Cliente do NVIDIA NIM (catálogo NVIDIA, endpoint OpenAI-compatible).
// Mesmo provedor usado pelo Assistente do projeto vnmax — suporta tool calling.
const BASE_URL = process.env.NVIDIA_BASE_URL || "https://integrate.api.nvidia.com/v1";

export async function chatCompletion({ apiKey, model, messages, tools, temperature = 0.4, maxTokens = 800, signal }) {
  const body = { model, messages, temperature, max_tokens: maxTokens };
  if (tools && tools.length) {
    body.tools = tools;
    body.tool_choice = "auto";
  }

  const res = await fetch(`${BASE_URL}/chat/completions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    const err = new Error(`NVIDIA ${res.status}: ${text.slice(0, 300)}`);
    err.status = res.status;
    err.upstream = true; // erro do provedor: não repassar verbatim ao cliente
    throw err;
  }
  return res.json();
}
