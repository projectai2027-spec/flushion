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

  const models = ['gemini-2.5-flash-preview-04-17', 'gemini-2.5-flash', 'gemini-2.0-flash-exp'];
  
  const prompt = `You are an expert fashion photographer and textile analyst. Study this product image with extreme detail.

Analyze EVERY visual detail you can see:
- Exact fabric type, texture, weave pattern
- All colors (primary, secondary, border, pallu)
- Every design motif, pattern, print visible
- Embroidery/zari/work details
- Border design and width
- Pallu design if visible
- Any embellishments

Then create a HIGHLY DETAILED generation prompt that will reproduce this EXACT product on a new model.

Reply ONLY with valid JSON, no markdown:
{
  "category": "saree|western_fashion|jewelry|electronics|food|furniture|footwear|bag|beauty",
  "sub_type": "very specific type e.g. Banarasi Silk Saree with gold zari work",
  "title": "product title",
  "description": "detailed 3-4 sentence description of exact colors, fabric, patterns, work",
  "fidelity_rules": [
    "exact color: [list exact colors seen]",
    "fabric: [exact fabric type]", 
    "pattern: [exact pattern description]",
    "work: [exact embroidery/zari details]",
    "border: [exact border description]"
  ],
  "generation_prompt": "EXTREMELY DETAILED prompt — describe fabric, colors, patterns, work in full detail so AI reproduces the EXACT same product. Include: fabric type, exact colors, pattern names, border details, pallu design, all visible motifs"
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
            generationConfig: { temperature: 0.1, maxOutputTokens: 1500 }
          })
        }
      );
      const geminiData = await geminiRes.json();
      if (!geminiRes.ok) { lastError = `${model}: ${geminiData?.error?.message}`; continue; }
      const text = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || '';
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) { lastError = `${model}: no JSON`; continue; }
      const data = JSON.parse(jsonMatch[0]);
      return res.status(200).json({ success: true, data });
    } catch (err) {
      lastError = `${model}: ${err.message}`;
    }
  }
  return res.status(500).json({ success: false, error: lastError });
}
