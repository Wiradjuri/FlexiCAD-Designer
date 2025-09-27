// functions/generate-template.js
import OpenAI from "openai";
import fs from "fs";
import path from "path";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

export async function handler(event) {
  try {
    if (event.httpMethod === "OPTIONS") {
      return {
        statusCode: 200,
        headers: corsHeaders(),
        body: "OK"
      };
    }

    if (event.httpMethod !== "POST") {
      return {
        statusCode: 405,
        headers: corsHeaders(),
        body: JSON.stringify({ error: "Method not allowed" })
      };
    }

    const { prompt } = JSON.parse(event.body || "{}");
    if (!prompt) {
      return {
        statusCode: 400,
        headers: corsHeaders(),
        body: JSON.stringify({ error: "Missing prompt" })
      };
    }

    // --- Load AI reference manifest ---
    const manifestPath = path.resolve("ai-reference", "manifest.json");
    let references = [];
    try {
      const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
      references = manifest.examples || [];
    } catch (e) {
      console.warn("No ai-reference/manifest.json found or invalid", e);
    }

    // Build reference context string
    const referenceText = references
      .map(
        (r) =>
          `- ${r.id}: ${r.description} [files: ${r.files.join(", ")}]`
      )
      .join("\n");

    // --- Build system + user prompt ---
    const systemPrompt = `
You are FlexiCAD's AI Generator. 
Your job is to output valid OpenSCAD code only (filetype .scad).
Do not include explanations, only code inside a \`\`\`openscad block.
When relevant, you may adapt or reuse features from the ai-reference library below.

AI Reference Library:
${referenceText || "No references available"}
`;

    // --- Call OpenAI ---
    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini", // lightweight for generation
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: prompt }
      ],
      temperature: 0.2,
      max_tokens: 800
    });

    const raw = completion.choices[0].message.content || "";
    const scadCode = extractScad(raw);

    return {
      statusCode: 200,
      headers: corsHeaders(),
      body: JSON.stringify({
        code: scadCode,
        raw: raw
      })
    };
  } catch (err) {
    console.error("Generation error:", err);
    return {
      statusCode: 500,
      headers: corsHeaders(),
      body: JSON.stringify({ error: err.message })
    };
  }
}

// --- Helpers ---

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type"
  };
}

function extractScad(text) {
  // Extract only the code block
  const match = text.match(/```(?:openscad)?\s*([\s\S]*?)```/i);
  return match ? match[1].trim() : text.trim();
}
