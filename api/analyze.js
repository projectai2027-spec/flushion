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
  return res.status(500).json({ success: false, error: lastError });export default async function handler(req, res) {
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

  // ============================================================
  // FLUSHION KNOWLEDGE BASE — EMBEDDED IN PROMPT
  // ============================================================
  const knowledgeBase = `
You are a master textile analyst and professional fashion photographer with 200 years of combined knowledge about Indian and global fashion products. Use this knowledge base to analyze any product image with extreme accuracy.

=== SAREE KNOWLEDGE BASE ===

FABRIC IDENTIFICATION RULES:
- Pure Mulberry Silk: High natural sheen, smooth surface, luminous colors, heavy opaque drape, one bright highlight spot
- Tussar/Wild Silk: Matte-ish, visible natural slubs (irregularities), warm amber natural color, rough texture
- Georgette: Crinkled pebbly surface, flowing, semi-transparent, matte, slight stretch
- Chiffon: Very sheer near-transparent, extremely lightweight, fluid, soft matte
- Organza: Crisp stiff semi-transparent, holds shape unlike chiffon
- Handloom Cotton: Matte, visible weave, natural slubs, slight stiffness, no sheen
- Khadi: Very matte, rough uneven surface, off-white/natural cream
- Art Silk/Viscose: Shinier than pure silk but slightly synthetic/plastic-looking sheen

ZARI IDENTIFICATION:
- Real Zari (Karchobi): Pure gold/silver wire, very heavy, rich warm gold, tarnishes minimally
- Tested Zari: Silver wire + gold coating, metallic quality, catches light
- Imitation/Lurex: Metallic plastic, brighter but slightly artificial
- Mirror Work (Shisha): Small mirrors sewn in, light-reflective spots
- Sequins: Circular metal/plastic discs, very reflective

SAREE TYPE IDENTIFICATION — VISUAL MARKERS:
1. BANARASI SILK: Heavy pure mulberry silk + gold zari brocade. Motifs: kalga (mango/paisley), jali (net), butti (dots). Broad 4-8 inch zari border. Heavy zari pallu. Deep jewel colors: crimson, royal blue, emerald, purple.
2. KANJEEVARAM: Heaviest silk. Body color ALWAYS different from border color (high contrast). Temple gopuram, peacock, elephant, chakra motifs. Thick prominent zari.
3. PAITHANI: OBLIQUE SQUARE pattern in body (bangdi-mor) — MANDATORY. PEACOCK BORDER — MANDATORY. Brilliant single jewel colors.
4. POCHAMPALLY IKAT: Geometric diamond/rhombus patterns ONLY. Slight blur/feathering at pattern edges — authentic ikat characteristic.
5. PATOLA: Extremely precise geometric patterns. Women/elephant/parrot figures in geometric style. Both sides identical.
6. CHANDERI: Sheer tissue-like fabric. Small coin/floral butis. Gold zari on delicate base. Pastel colors.
7. MAHESHWARI: Five-stripe pallu (panch-patti). Reversible border. Silk warp + cotton weft mixed texture.
8. TANT BENGAL: Fine cotton, thin 1-3 inch colored border, white/pastel plain body.
9. CHIKANKARI: White thread on white/pastel. Shadow embroidery. Ethereal delicate stitching on georgette/muslin.
10. BANDHANI: Tiny circular dots (slightly raised/puckered texture). Patterns: shikari, leheriya. Bright Rajasthani colors.
11. KALAMKARI: Hand-drawn quality lines. Mythological figures. Natural dye earthy palette. Black outlines.
12. PHULKARI: Dense geometric (triangles/diamonds/stars) embroidery. Silk floss on cotton. NOT floral.
13. KERALA KASAVU: White/cream cotton body. Gold kasavu border ONLY. Minimal. Pure.
14. KANTHA: Running stitch texture visible. Folk art style motifs.

=== WESTERN FASHION ===
- T-Shirt: Round neck, jersey knit, side seams, shoulder seams
- Dress Shirt: Collar, button placket, cuffs, back yoke
- Jeans: 5-pocket, diagonal twill texture, indigo blue, rivets at stress points
- Blazer: Structured lining, lapels, 1-3 buttons, welt pockets
- Trench Coat: Double-breasted, storm flap, belt, epaulettes, khaki/beige
- Denim Jacket: Rigid denim, button front, chest pocket flaps, back yoke seam

=== JEWELRY ===
- 22K Indian Gold: Deep warm yellow, heavy, traditional
- Kundan: Glass stones in gold foil, flat-cut, Mughal style, matte gold setting
- Polki: Uncut rough diamonds, irregular shapes, rustic sparkle
- Jhumka: Bell-shaped dome + dangling bells, classic Indian
- Bangles: Always in SETS, rigid circular, various materials

=== FIDELITY RULES FOR AI GENERATION ===
SAREE:
- Fabric opacity: Pure silk = fully opaque. Chiffon/georgette = semi-transparent. Chanderi = sheer.
- Zari must appear METALLIC — catches light with gold/silver sheen
- Draping: Nivi style (most common) = pleats at front waist + pallu over LEFT shoulder
- Colors must be exact — specify 'deep crimson NOT orange NOT pink'
- Motifs must match saree type exactly
- Fabric must appear iron-pressed — no crush marks unless vintage/rustic style
- Model: Always specify 'Indian woman, warm honey-brown skin, almond eyes, Indian facial features'

COMMON AI MISTAKES:
- Making silk look transparent → Add 'fully opaque non-transparent fabric'
- Zari looking like yellow paint → Add 'metallic gold thread that catches light'
- Wrong draping → Specify exact drape style with details
- Wrong color temperature → Specify exact color with NOT alternatives
- Generic Western model → Always specify Indian features
`;

  const prompt = `${knowledgeBase}

---
NOW ANALYZE THIS IMAGE:

Using all the knowledge above, examine this product image with EXTREME detail. Identify EVERY visual characteristic:
- Exact fabric type and texture
- Exact colors (primary, secondary, border, pallu if saree)
- Every pattern, motif, and design element visible
- All embellishments (zari, embroidery, sequins, mirrors)
- Construction details (weave, print technique, stitching)
- Category and specific sub-type

Then create a HIGHLY DETAILED generation prompt that will allow an AI image generator to reproduce this EXACT product accurately.

User additional hint: ${userDesc || 'none'}

Reply ONLY with valid JSON, no markdown, no extra text:
{
  "category": "saree|western_fashion|jewelry|electronics|food|furniture|footwear|bag|beauty|fabric",
  "sub_type": "very specific type e.g. Banarasi Katan Silk Saree with gold zari brocade",
  "title": "product title",
  "description": "detailed 4-5 sentence description of exact fabric, colors, patterns, work, construction",
  "fidelity_rules": [
    "fabric: exact fabric type and opacity rule",
    "color: exact color with NOT alternatives",
    "pattern: exact pattern/motif description",
    "work: exact embellishment details",
    "draping/construction: specific construction note"
  ],
  "generation_prompt": "EXTREMELY DETAILED prompt — describe fabric type, exact colors (with NOT alternatives), pattern names, motif details, border description, pallu/construction details, so AI reproduces the EXACT same product. Include all fidelity rules inline."
}`;

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
            generationConfig: { temperature: 0.1, maxOutputTokens: 2000 }
          })
        }
      );

      const geminiData = await geminiRes.json();
      if (!geminiRes.ok) { lastError = `${model}: ${geminiData?.error?.message}`; continue; }

      const text = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || '';
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) { lastError = `${model}: no JSON in response`; continue; }

      const data = JSON.parse(jsonMatch[0]);
      return res.status(200).json({ success: true, data, model_used: model });

    } catch (err) {
      lastError = `${model}: ${err.message}`;
    }
  }
  return res.status(500).json({ success: false, error: lastError });
}

}
