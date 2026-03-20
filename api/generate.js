export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { prompt, width = 1024, height = 1024, seed } = req.body;
    if (!prompt) return res.status(400).json({ error: 'Prompt required' });

    const useSeed = seed || Math.floor(Math.random() * 999999);
    const enc = encodeURIComponent(prompt.trim().substring(0, 500));
    const url = `https://image.pollinations.ai/prompt/${enc}?width=${width}&height=${height}&seed=${useSeed}&nologo=true&enhance=true`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 55000);

    const imgRes = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'FlushionStudio/1.0' }
    });
    clearTimeout(timeout);

    if (!imgRes.ok) throw new Error(`Pollinations error: ${imgRes.status}`);

    const buffer = await imgRes.arrayBuffer();
    const base64 = Buffer.from(buffer).toString('base64');
    const mime = imgRes.headers.get('content-type') || 'image/jpeg';

    return res.status(200).json({
      success: true,
      image: `data:${mime};base64,${base64}`,
      imageUrl: url
    });

  } catch (err) {
    console.error('Generate error:', err.message);
    const { prompt, width = 1024, height = 1024 } = req.body || {};
    const seed = Math.floor(Math.random() * 999999);
    const enc = encodeURIComponent((prompt || '').substring(0, 500));
    return res.status(200).json({
      success: true,
      imageUrl: `https://image.pollinations.ai/prompt/${enc}?width=${width}&height=${height}&seed=${seed}&nologo=true`
    });
  }
}export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { prompt, width = 1024, height = 1024, seed } = req.body || {};
  if (!prompt) return res.status(400).json({ error: 'Prompt required' });

  const useSeed = seed || Math.floor(Math.random() * 999999);
  const enc = encodeURIComponent(prompt.trim().substring(0, 500));
  const imageUrl = `https://image.pollinations.ai/prompt/${enc}?width=${width}&height=${height}&seed=${useSeed}&nologo=true&enhance=true&model=flux`;

  return res.status(200).json({
    success: true,
    imageUrl: imageUrl,
    image: null
  });
}

