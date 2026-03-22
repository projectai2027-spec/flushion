export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { prompt, width = 1024, height = 1024 } = req.body || {};
  if (!prompt) return res.status(400).json({ error: 'Prompt required' });

  const falKey = process.env.FAL_KEY;
  if (!falKey) return res.status(500).json({ error: 'FAL_KEY missing' });

  // fal.ai supports max 2048x2048
  const w = Math.min(parseInt(width) || 1024, 2048);
  const h = Math.min(parseInt(height) || 1024, 2048);

  try {
    const falRes = await fetch('https://fal.run/fal-ai/flux/dev', {
      method: 'POST',
      headers: {
        'Authorization': `Key ${falKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt: prompt.trim().substring(0, 500),
        image_size: { width: w, height: h },
        num_inference_steps: 28,
        guidance_scale: 3.5,
        num_images: 1,
        enable_safety_checker: false,
        output_format: 'jpeg'
      })
    });

    const falData = await falRes.json();
    if (!falRes.ok) throw new Error(`fal.ai ${falRes.status}: ${JSON.stringify(falData).substring(0,300)}`);

    const imageUrl = falData.images?.[0]?.url;
    if (!imageUrl) throw new Error('No image URL: ' + JSON.stringify(falData).substring(0,200));

    // Fetch image → base64
    const imgRes = await fetch(imageUrl);
    const buffer = await imgRes.arrayBuffer();
    const base64 = Buffer.from(buffer).toString('base64');
    const mime = imgRes.headers.get('content-type') || 'image/jpeg';

    return res.status(200).json({ success: true, image: `data:${mime};base64,${base64}` });

  } catch (err) {
    console.error('Generate error:', err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
}
