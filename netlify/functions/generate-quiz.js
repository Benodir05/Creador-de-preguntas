// netlify/functions/generate-quiz.js
import fetch from "node-fetch";

// ⚠️ PON TU API KEY EN VARIABLES DE ENTORNO DE NETLIFY: OPENAI_API_KEY
const OPENAI_API_URL = "https://api.openai.com/v1/responses"; // Responses API

export const handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  const { text, n = 8 } = JSON.parse(event.body || "{}");
  if (!text || !text.trim()) {
    return { statusCode: 400, body: "Missing text" };
  }

  // Pedimos SALIDA ESTRUCTURADA (JSON) al modelo
  const system = `
Eres un generador de quizzes. Devuelve SOLO JSON válido con este esquema:
[
  { "id": number, "topic": string, "pill": string,
    "question": string, "options": string[], "correctIndex": number, "explanation": string }
]
- "pill": 2–3 frases, concisas.
- "options": 3–4 opciones, solo UNA correcta.
- "correctIndex": índice 0-based en "options".
`;
  const user = `
Texto del PDF (resumido):
${text.slice(0, 20000)}  // ← corta si es muy largo
---
Genera ${n} preguntas variadas y de calidad.
`;

  const resp = await fetch(OPENAI_API_URL, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: "gpt-4o-mini", // o el modelo que uses
      input: [
        { role: "system", content: system },
        { role: "user", content: user }
      ],
      // Pide salida JSON estricta (Responses API soporta structured outputs)
      response_format: { type: "json_object" }
    })
  });

  if (!resp.ok) {
    const err = await resp.text();
    return { statusCode: resp.status, body: err };
    // Para depurar puedes console.log(err)
  }

  const data = await resp.json();
  // La Responses API devuelve el contenido en data.output[0].content[0].text (estructura típica)
  // Normaliza con fallback si cambia el shape
  let jsonText = "";
  try {
    const c = data.output?.[0]?.content?.[0]?.text ?? data.output_text ?? data?.choices?.[0]?.message?.content;
    jsonText = typeof c === "string" ? c : JSON.stringify(c);
  } catch (_) {}

  // Si el modelo devolvió un objeto con {items:[...]} ajusta aquí
  const parsed = JSON.parse(jsonText);
  const items = Array.isArray(parsed) ? parsed : parsed.items;

  return {
    statusCode: 200,
    headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    body: JSON.stringify(items)
  };
};
