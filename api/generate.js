export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { prompt, width, height, seed } = req.body;
    if (!prompt) return res.status(400).json({ error: 'Prompt required' });

    const w = width || 512;
    const h = height || 512;
    const s = seed || Math.floor(Math.random() * 999999);

    const encoded = encodeURIComponent(prompt + ', professional photography, highly detailed, sharp focus, commercial grade');
    const imageUrl = `https://image.pollinations.ai/prompt/${encoded}?width=${w}&height=${h}&nologo=true&seed=${s}`;

    // Fetch from Pollinations on server side
    const imgRes = await fetch(imageUrl, {
      headers: { 'User-Agent': 'Flushion-Studio/1.0' }
    });

    if (!imgRes.ok) {
      // Return the URL anyway — let client try
      return res.status(200).json({ success: true, imageUrl });
    }

    const buffer = await imgRes.arrayBuffer();
    const base64 = Buffer.from(buffer).toString('base64');
    const mimeType = imgRes.headers.get('content-type') || 'image/jpeg';

    return res.status(200).json({
      success: true,
      imageUrl,
      imageBase64: `data:${mimeType};base64,${base64}`
    });

  } catch (err) {
    // Even on error, return the direct URL so client can try
    const { prompt, width, height, seed } = req.body;
    const w = width || 512;
    const h = height || 512;
    const s = seed || Math.floor(Math.random() * 999999);
    const encoded = encodeURIComponent((prompt || '') + ', professional photography');
    const imageUrl = `https://image.pollinations.ai/prompt/${encoded}?width=${w}&height=${h}&nologo=true&seed=${s}`;
    return res.status(200).json({ success: true, imageUrl, error: err.message });
  }
}
