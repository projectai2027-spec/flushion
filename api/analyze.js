export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { imageBase64, mimeType, userDesc } = req.body || {};
  if (!imageBase64) return res.status(400).json({ success: false, error: 'No image received' });

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return res.status(500).json({ success: false, error: 'GEMINI_API_KEY missing' });

  // Updated models - 2.5 Flash is current free tier model (March 2026)
  const models = ['gemini-2.5-flash-preview-04-17', 'gemini-2.5-flash', 'gemini-2.5-flash-lite-preview-06-17'];

  const prompt = `Analyze this product image. Reply ONLY with valid JSON, no markdown, no extra text:
{
  "category": "saree|western_fashion|jewelry|electronics|food|furniture|footwear|bag|beauty",
  "sub_type": "specific type e.g. Banarasi Silk Saree",
  "title": "short product title",
  "description": "2-3 sentence description of product, colors, material",
  "fidelity_rules": ["rule1","rule2","rule3"],
  "generation_prompt": "Professional product photography, high quality, sharp focus"
}
User hint: ${userDesc || 'none'}`;

  let lastError = '';

  for (const model of models) {
    try {
      const geminiRes = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{
              parts: [
                { text: prompt },
                { inline_data: { mime_type: mimeType || 'image/jpeg', data: imageBase64 } }
              ]
            }],
            generationConfig: { temperature: 0.1, maxOutputTokens: 800 }
          })
        }
      );

      const geminiData = await geminiRes.json();

      if (!geminiRes.ok) {
        lastError = `${model}: ${geminiData?.error?.message || geminiRes.status}`;
        continue;
      }

      const text = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || '';
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) { lastError = `${model}: bad response`; continue; }

      const data = JSON.parse(jsonMatch[0]);
      return res.status(200).json({ success: true, data, model_used: model });

    } catch (err) {
      lastError = `${model}: ${err.message}`;
      continue;
    }
  }

  return res.status(500).json({ success: false, error: lastError });
}
