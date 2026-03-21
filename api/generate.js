export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { prompt, width = 1024, height = 1024 } = req.body || {};
  if (!prompt) return res.status(400).json({ error: 'Prompt required' });

  const hfToken = process.env.HF_TOKEN;
  if (!hfToken) return res.status(500).json({ error: 'HF_TOKEN missing in Vercel environment variables' });

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 55000);

    const hfRes = await fetch(
      'https://api-inference.huggingface.co/models/black-forest-labs/FLUX.1-schnell',
      {
        method: 'POST',
        signal: controller.signal,
        headers: {
          'Authorization': `Bearer ${hfToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          inputs: prompt.trim().substring(0, 500),
          parameters: {
            width: Math.min(width, 1024),
            height: Math.min(height, 1024),
            num_inference_steps: 4,
          }
        })
      }
    );
    clearTimeout(timeout);

    if (!hfRes.ok) {
      const errText = await hfRes.text();
      throw new Error(`HF error ${hfRes.status}: ${errText.substring(0, 200)}`);
    }

    const buffer = await hfRes.arrayBuffer();
    const base64 = Buffer.from(buffer).toString('base64');

    return res.status(200).json({
      success: true,
      image: `data:image/jpeg;base64,${base64}`
    });

  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
}
