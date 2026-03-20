export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { prompt, width = 1024, height = 1024 } = req.body;
    if (!prompt) return res.status(400).json({ error: 'Prompt is required' });

    const cleanPrompt = encodeURIComponent(prompt.trim().substring(0, 500));
    const seed = Math.floor(Math.random() * 999999);
    const imageUrl = `https://image.pollinations.ai/prompt/${cleanPrompt}?width=${width}&height=${height}&seed=${seed}&nologo=true&enhance=true`;

    console.log('Fetching from Pollinations:', imageUrl);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 55000);

    const imageRes = await fetch(imageUrl, {
      signal: controller.signal,
      headers: { 'User-Agent': 'FlushionStudio/1.0' }
    });
    clearTimeout(timeout);

    if (!imageRes.ok) throw new Error(`Pollinations error: ${imageRes.status}`);

    const buffer = await imageRes.arrayBuffer();
    const base64 = Buffer.from(buffer).toString('base64');
    const contentType = imageRes.headers.get('content-type') || 'image/jpeg';

    return res.status(200).json({
      success: true,
      image: `data:${contentType};base64,${base64}`,
      url: imageUrl
    });

  } catch (err) {
    console.error('Generate error:', err.message);
    return res.status(500).json({ error: err.message || 'Generation failed' });
  }
}
