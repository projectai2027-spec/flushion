export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { imageBase64, mimeType, userDesc } = req.body || {};
  if (!imageBase64) return res.status(400).json({ success: false, error: 'No image' });

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return res.status(500).json({ success: false, error: 'GEMINI_API_KEY missing' });

  const models = ['gemini-2.5-flash-preview-04-17', 'gemini-2.5-flash', 'gemini-2.0-flash-exp'];

  const prompt = `You are a world-class product analyst and fashion expert. Your job is to CAREFULLY STUDY the uploaded image and identify EXACTLY what product is shown.

STEP 1 — IDENTIFY THE PRODUCT:
Look at the image carefully. What is it?
- Is it a saree? watch? shoes? bag? electronics? food? jewelry? fabric? garment?
- DO NOT assume. LOOK at what is actually there.
- The product could be ANYTHING — saree, watch, phone, shoes, food, jewelry, furniture, beauty product, etc.

STEP 2 — STUDY EVERY DETAIL:
Once you identify the product, study every visual detail:
- Exact colors (all colors visible)
- Material/fabric/surface texture
- Patterns, prints, motifs, designs
- Embellishments, hardware, details
- Shape, silhouette, construction

STEP 3 — SAREE SPECIFIC (only if it IS a saree):
If the product is a saree, identify the exact type using these markers:
- PATOLA: Geometric diamond grid, multicolor (red/green/orange/blue), peacock/parrot/elephant geometric motifs, red tassels
- BANARASI: Heavy silk, gold zari brocade, mango/paisley motifs, jewel colors
- KANJEEVARAM: Heavy silk, HIGH CONTRAST body vs border colors, temple/peacock motifs
- PAITHANI: Oblique squares in body + peacock border (BOTH mandatory)
- POCHAMPALLY IKAT: Diamond/rhombus geometric, blurred feathered edges
- CHANDERI: Sheer tissue fabric, small coin/floral motifs
- BANDHANI: Tiny raised circular dots pattern, bright Rajasthani colors
- CHIKANKARI: White embroidery on white/pastel, shadow work

STEP 4 — CREATE GENERATION PROMPT:
Write a detailed prompt that will allow an AI to generate a NEW professional photo of THIS EXACT product.

User hint: ${userDesc || 'none'}

IMPORTANT: Reply ONLY with valid JSON. No markdown. No explanation outside JSON.

{
  "category": "saree|western_fashion|jewelry|electronics|food|furniture|footwear|bag|beauty|fabric|watch|other",
  "sub_type": "VERY specific — e.g. Patola Silk Saree / Analog Watch / Running Shoe / Gold Necklace",
  "title": "product title",
  "description": "4-5 sentences describing EXACTLY what you see — colors, material, patterns, details",
  "fidelity_rules": [
    "material/fabric: exact material and texture",
    "color: all exact colors visible",
    "pattern: exact pattern or design detail",
    "details: specific embellishments or construction details",
    "style: overall style and aesthetic"
  ],
  "generation_prompt": "Professional [PRODUCT TYPE] photography. [EXACT MATERIAL]. [EXACT COLORS — specify 'NOT X' where needed]. [EXACT PATTERNS/MOTIFS in detail]. [SPECIFIC CONSTRUCTION DETAILS]. [MODEL OR PRODUCT ONLY based on product type]. Scene: [appropriate scene]. Shot: [appropriate shot type]. FIDELITY: [key accuracy rules]. NEGATIVE: cartoon, CGI, illustration, wrong colors, blurry details."
}`;

  let lastError = '';
  for (const model of models) {
    try {
      const r = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [
              { text: prompt },
              { inline_data: { mime_type: mimeType || 'image/jpeg', data: imageBase64 } }
            ]}],
            generationConfig: { temperature: 0.1, maxOutputTokens: 2000 }
          })
        }
      );
      const d = await r.json();
      if (!r.ok) { lastError = `${model}: ${d?.error?.message}`; continue; }
      const text = d.candidates?.[0]?.content?.parts?.[0]?.text || '';
      const match = text.match(/\{[\s\S]*\}/);
      if (!match) { lastError = `${model}: no JSON`; continue; }
      const data = JSON.parse(match[0]);
      return res.status(200).json({ success: true, data, model_used: model });
    } catch (e) {
      lastError = `${model}: ${e.message}`;
    }
  }
  return res.status(500).json({ success: false, error: lastError });
}
