export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { prompt, width = 1024, height = 1024 } = req.body || {};
  if (!prompt) return res.status(400).json({ error: 'Prompt required' });

  const falKey = process.env.FAL_KEY;
  if (!falKey) return res.status(500).json({ error: 'FAL_KEY missing in Vercel environment variables' });

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 55000);

    // Use FLUX.1-dev — best quality for fashion/product photography
    const falRes = await fetch('https://queue.fal.run/fal-ai/flux/dev', {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Authorization': `Key ${falKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt: prompt.trim().substring(0, 500),
        image_size: { width: Math.min(width, 1024), height: Math.min(height, 1024) },
        num_inference_steps: 28,
        guidance_scale: 3.5,
        num_images: 1,
        enable_safety_checker: false
      })
    });
    clearTimeout(timeout);

    if (!falRes.ok) {
      const err = await falRes.text();
      throw new Error(`fal.ai error ${falRes.status}: ${err.substring(0, 200)}`);
    }

    const falData = await falRes.json();

    // fal.ai queue — poll for result
    if (falData.request_id) {
      const resultUrl = `https://queue.fal.run/fal-ai/flux/dev/requests/${falData.request_id}`;
      let result = null;
      for (let i = 0; i < 30; i++) {
        await new Promise(r => setTimeout(r, 2000));
        const poll = await fetch(resultUrl, {
          headers: { 'Authorization': `Key ${falKey}` }
        });
        const pollData = await poll.json();
        if (pollData.status === 'COMPLETED' && pollData.output?.images?.[0]?.url) {
          result = pollData.output.images[0].url;
          break;
        }
        if (pollData.status === 'FAILED') throw new Error('fal.ai generation failed');
      }
      if (!result) throw new Error('Timeout waiting for fal.ai');

      // Fetch image and return base64
      const imgRes = await fetch(result);
      const buffer = await imgRes.arrayBuffer();
      const base64 = Buffer.from(buffer).toString('base64');
      const mime = imgRes.headers.get('content-type') || 'image/jpeg';

      return res.status(200).json({ success: true, image: `data:${mime};base64,${base64}` });
    }

    // Direct response (non-queue)
    if (falData.images?.[0]?.url) {
      const imgRes = await fetch(falData.images[0].url);
      const buffer = await imgRes.arrayBuffer();
      const base64 = Buffer.from(buffer).toString('base64');
      return res.status(200).json({ success: true, image: `data:image/jpeg;base64,${base64}` });
    }

    throw new Error('No image in fal.ai response');

  } catch (err) {
    console.error('Generate error:', err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
}
