export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { imageBase64, mimeType, userDesc } = req.body || {};
  if (!imageBase64) return res.status(400).json({ success: false, error: 'No image received' });

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ 
      success: false, 
      error: 'GEMINI_API_KEY missing in Vercel environment variables' 
    });
  }

  try {
    const prompt = `Analyze this product image. Reply ONLY with valid JSON, no markdown:
{
  "category": "saree|western_fashion|jewelry|electronics|food|furniture|footwear|bag|beauty",
  "sub_type": "specific type",
  "title": "product title",
  "description": "2-3 sentence description",
  "fidelity_rules": ["rule1","rule2","rule3"],
  "generation_prompt": "Professional product photography, high quality, sharp focus"
}
User hint: ${userDesc || 'none'}`;

    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
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
      return res.status(500).json({ 
        success: false, 
        error: `Gemini error ${geminiRes.status}: ${JSON.stringify(geminiData).substring(0,300)}`
      });
    }

    const text = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    
    if (!jsonMatch) {
      return res.status(500).json({ 
        success: false, 
        error: 'Gemini response not JSON: ' + text.substring(0, 200)
      });
    }

    const data = JSON.parse(jsonMatch[0]);
    return res.status(200).json({ success: true, data });

  } catch (err) {
    return res.status(500).json({ 
      success: false, 
      error: err.message 
    });
  }
}
