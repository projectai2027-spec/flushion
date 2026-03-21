export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { imageBase64, mimeType, userDesc } = req.body || {};
  if (!imageBase64) return res.status(400).json({ error: 'Image required' });

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return res.status(500).json({ success: false, error: 'GEMINI_API_KEY not set in Vercel environment variables' });

  try {
    const prompt = `You are a professional product photographer and AI image analyst. Analyze this product image carefully.

Respond ONLY with a valid JSON object — no markdown, no extra text. Format:
{
  "category": "saree|western_fashion|jewelry|electronics|food|furniture|footwear|bag|beauty",
  "sub_type": "specific type e.g. Banarasi Silk Saree / Denim Jacket / Gold Necklace",
  "title": "Short product title",
  "description": "2-3 sentence professional description of the product, colors, patterns, material",
  "fidelity_rules": ["rule1", "rule2", "rule3", "rule4", "rule5"],
  "generation_prompt": "Professional [category] product photography, [key details], high quality, detailed, sharp focus"
}

User hint: ${userDesc || 'none'}

For fidelity_rules, list the most important things the AI must preserve when generating images of this product.`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
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
          generationConfig: { temperature: 0.1, maxOutputTokens: 1024 }
        })
      }
    );

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Gemini API error ${response.status}: ${err.substring(0, 200)}`);
    }

    const result = await response.json();
    const text = result.candidates?.[0]?.content?.parts?.[0]?.text || '';

    // Parse JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON in Gemini response');

    const data = JSON.parse(jsonMatch[0]);

    return res.status(200).json({ success: true, data });

  } catch (err) {
    console.error('Analyze error:', err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
}
