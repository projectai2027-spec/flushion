export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { imageBase64, mimeType, userDesc } = req.body;
    if (!imageBase64) return res.status(400).json({ error: 'Image required' });

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return res.status(500).json({ error: 'API key not configured' });

    const prompt = `You are an expert product photography AI for Flushion Universal Studio. Analyze this product image carefully.

Respond in EXACTLY this JSON format (no markdown, no explanation, pure JSON only):
{
  "category": "one of: saree, western_fashion, jewelry, electronics, food, furniture, footwear, bag, beauty",
  "sub_type": "specific sub-type (e.g. Banarasi Silk, Kanjeevaram, Patola, T-Shirt, Gold Jewelry, Smartphone etc)",
  "title": "short descriptive title in Hindi or English",
  "description": "2-3 sentences describing the product, its material, style, and commercial potential",
  "fidelity_rules": [
    "specific rule 1 about what must be preserved in AI generation",
    "specific rule 2",
    "specific rule 3",
    "specific rule 4"
  ],
  "generation_prompt": "Detailed English prompt for AI image generation describing this exact product — include material, color, pattern, texture, style, quality descriptors",
  "scene": "recommended scene/background for this product type",
  "negative_prompt": "what to avoid in generation for this product type"
}

${userDesc ? 'Additional user info: ' + userDesc : ''}

Be very specific and accurate. For sarees, identify the exact type (Banarasi/Kanjeevaram/Patola/Chanderi/Bandhani/Cotton). For fashion, identify garment type and style. For jewelry, identify metal and style.`;

    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              {
                inline_data: {
                  mime_type: mimeType || 'image/jpeg',
                  data: imageBase64
                }
              },
              { text: prompt }
            ]
          }],
          generationConfig: {
            temperature: 0.2,
            maxOutputTokens: 1024
          }
        })
      }
    );

    const geminiData = await geminiRes.json();

    if (geminiData.error) {
      return res.status(500).json({ error: geminiData.error.message });
    }

    const rawText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const clean = rawText.replace(/```json|```/g, '').trim();

    let parsed;
    try {
      parsed = JSON.parse(clean);
    } catch (e) {
      return res.status(500).json({ error: 'Parse error', raw: rawText });
    }

    return res.status(200).json({ success: true, data: parsed });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
