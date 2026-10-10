import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { GoogleGenerativeAI } from "@google/generative-ai";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// 1. Express Middleware
app.use(cors());
app.use(express.json({ limit: "10mb" }));

// Helper: fallback reviewer when Gemini API key is missing
function fallbackAnalyzeCode(code, filePath) {
  const findings = [];
  let status = "COMPATIBLE";
  let hasBreaking = false;

  // Basic syntax check for JS/JSX/TS
  const unclosedBrace = (code.match(/\{/g) || []).length !== (code.match(/\}/g) || []).length;
  const unclosedParen = (code.match(/\(/g) || []).length !== (code.match(/\)/g) || []).length;
  const unclosedBracket = (code.match(/\[/g) || []).length !== (code.match(/\]/g) || []).length;

  if (unclosedBrace || unclosedParen || unclosedBracket) {
    status = "CONFLICT_DETECTED";
    hasBreaking = true;
    findings.push({
      severity: "BREAKING",
      title: "Sözdizimi (Syntax) Hatası: Kapatılmamış Parantez",
      description: `Dosyada eşleşmeyen veya kapatılmamış parantez/süslü parantez tespit edildi: ${filePath || "aktif dosya"}.`,
      quick_fix: "Açılan tüm parantezlerin ({[) doğru şekilde kapatıldığından emin olun."
    });
  }

  // React JSX unclosed tag check
  if (code.includes("<") && code.includes(">")) {
    const openTags = (code.match(/<[A-Z][A-Za-z0-9]*(?:\s+[^>]*)?(?<!\/)>/g) || []).length;
    const closeTags = (code.match(/<\/[A-Z][A-Za-z0-9]*>/g) || []).length;
    if (openTags > closeTags) {
      status = "CONFLICT_DETECTED";
      hasBreaking = true;
      findings.push({
        severity: "BREAKING",
        title: "Kapatılmamış JSX Bileşeni",
        description: "Bileşen ağacında kapatılmamış JSX etiketleri bulundu.",
        quick_fix: "Bileşen etiketini </Tag> şeklinde kapatın veya self-closing (<Tag />) kullanın."
      });
    }
  }

  const summary = status === "COMPATIBLE"
    ? `${filePath || "Dosya"} statik analizi başarıyla tamamlandı. Entegrasyon uyumlu görünüyor.`
    : `${filePath || "Dosya"} içinde entegrasyonu engelleyen sözdizimi veya yapısal hatalar tespit edildi.`;

  return {
    status,
    has_breaking_changes: hasBreaking,
    summary,
    findings
  };
}

// 2. Analyze Code API Route
app.post("/api/analyze-code", async (req, res) => {
  try {
    const { code, filePath, category } = req.body;

    // Log input details for debugging
    console.log("Backend received code length:", req.body.code?.length);
    console.log("Backend received filePath:", filePath, "| category:", category);

    // Guard clause: ensure code is present and non-empty
    if (!code || typeof code !== "string" || !code.trim()) {
      return res.status(200).json({
        status: "CONFLICT_DETECTED",
        has_breaking_changes: true,
        summary: "Analiz edilecek kod parçası bulunamadı veya boş gönderildi.",
        findings: [
          {
            severity: "BREAKING",
            title: "Eksik Kod Girdisi",
            description: "Editör alanı boş veya sunucuya kod verisi iletilmedi.",
            quick_fix: "Editöre bir kod parçası ekleyip tekrar entegrasyon testini çalıştırın."
          }
        ]
      });
    }

    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;

    // If API key is not configured, use local intelligent fallback analysis
    if (!apiKey) {
      console.warn("⚠️ GEMINI_API_KEY environment variable is not configured. Running fallback analysis.");
      const fallbackResult = fallbackAnalyzeCode(code, filePath);
      return res.status(200).json(fallbackResult);
    }

    // Initialize Google Gemini API
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash",
      generationConfig: {
        responseMimeType: "application/json",
        temperature: 0.2,
      },
      systemInstruction: `You are an expert Static Code Reviewer and Integration Analysis AI built into the "ConFlux DevTool".
Your job is to analyze code written in JavaScript, React (JSX), HTML, CSS, or Node.js to check for syntax errors, API contract mismatches, breaking changes, or logical integration conflicts.

CRITICAL INSTRUCTION:
You MUST ALWAYS respond with a VALID JSON object and ONLY JSON. Do not include markdown code fences like \`\`\`json.

JSON RESPONSE FORMAT:
{
  "status": "COMPATIBLE" | "CONFLICT_DETECTED",
  "has_breaking_changes": boolean,
  "summary": "Tek cümlelik Türkçe özet (Örn: Checkout bileşeninde syntax hatası tespit edildi.)",
  "findings": [
    {
      "severity": "BREAKING" | "WARNING" | "INFO",
      "title": "Hatanın veya çakışmanın kısa başlığı",
      "description": "Detaylı açıklama (Türkçe)",
      "quick_fix": "Önerilen hızlı düzeltme açıklaması veya kod parçası"
    }
  ]
}

ANALYSIS RULES:
1. If there is an unclosed tag, syntax error, missing bracket, or undefined import/function, set "status" to "CONFLICT_DETECTED" and "has_breaking_changes" to true.
2. If the code is fully valid and safely integrates, set "status" to "COMPATIBLE" and "has_breaking_changes" to false.
3. Keep descriptions concise, action-oriented, and developer-friendly.`
    });

    const prompt = `Lütfen aşağıdaki kaynak kodu incele:
Dosya Yolu: ${filePath || "Bilinmeyen dosya"}
Kategori: ${category || "Genel"}

KOD:
\`\`\`
${code}
\`\`\``;

    const result = await model.generateContent(prompt);
    const rawResponse = result.response.text();
    
    let parsed;
    try {
      parsed = JSON.parse(rawResponse);
    } catch {
      // Clean potential fences if present
      const cleaned = rawResponse.replace(/```(?:json)?/gi, "").replace(/```/g, "").trim();
      parsed = JSON.parse(cleaned);
    }

    return res.status(200).json(parsed);

  } catch (error) {
    console.error("Error during code analysis:", error);
    return res.status(500).json({
      status: "CONFLICT_DETECTED",
      has_breaking_changes: true,
      summary: "Analiz sırasında sunucu hatası oluştu: " + (error?.message || "Bilinmeyen hata"),
      findings: [
        {
          severity: "BREAKING",
          title: "Sunucu Hatası",
          description: error?.message || "Gemini API çağrısı sırasında bir hata meydana geldi.",
          quick_fix: "Sunucu loglarını ve GEMINI_API_KEY yapılandırmanızı kontrol edin."
        }
      ]
    });
  }
});

// Health check route
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", service: "conflux-code-review-api" });
});

app.listen(PORT, () => {
  console.log(`🚀 ConFlux Code Review Backend running at http://localhost:${PORT}`);
});
