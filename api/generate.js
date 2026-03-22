export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { prompt, width = 1024, height = 1024, refImage, refMime } = req.body || {};
  if (!prompt) return res.status(400).json({ error: 'Prompt required' });

  const falKey = process.env.FAL_KEY;
  if (!falKey) return res.status(500).json({ error: 'FAL_KEY missing' });

  const w = Math.round(Math.min(parseInt(width)||1024, 1440)/8)*8;
  const h = Math.round(Math.min(parseInt(height)||1024, 1440)/8)*8;

  try {
    let falRes, endpoint, body;

    if (refImage) {
      // IMAGE-TO-IMAGE — use reference image for accuracy
      // Upload reference image to fal.ai storage first
      const imgBuffer = Buffer.from(refImage, 'base64');
      const uploadRes = await fetch('https://fal.run/fal-ai/storage/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Key ${falKey}`,
          'Content-Type': refMime || 'image/jpeg',
        },
        body: imgBuffer
      });

      let refImageUrl = null;
      if (uploadRes.ok) {
        const uploadData = await uploadRes.json();
        refImageUrl = uploadData.url || uploadData.file_url;
      }

      if (refImageUrl) {
        // Use img2img with reference
        endpoint = 'https://fal.run/fal-ai/flux/dev/image-to-image';
        body = {
          prompt: prompt.trim().substring(0, 500),
          image_url: refImageUrl,
          strength: 0.75, // 75% new generation, 25% keeps reference structure
          num_inference_steps: 28,
          guidance_scale: 3.5,
          num_images: 1,
          enable_safety_checker: false,
          output_format: 'jpeg'
        };
      } else {
        // Upload failed — fall through to text2img
        refImage && console.log('Upload failed, using text2img');
        endpoint = 'https://fal.run/fal-ai/flux/dev';
        body = {
          prompt: prompt.trim().substring(0, 500),
          image_size: { width: w, height: h },
          num_inference_steps: 28,
          guidance_scale: 3.5,
          num_images: 1,
          enable_safety_checker: false,
          output_format: 'jpeg'
        };
      }
    } else {
      // TEXT-TO-IMAGE
      endpoint = 'https://fal.run/fal-ai/flux/dev';
      body = {
        prompt: prompt.trim().substring(0, 500),
        image_size: { width: w, height: h },
        num_inference_steps: 28,
        guidance_scale: 3.5,
        num_images: 1,
        enable_safety_checker: false,
        output_format: 'jpeg'
      };
    }

    falRes = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Key ${falKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body)
    });

    const falData = await falRes.json();
    if (!falRes.ok) throw new Error(`fal.ai ${falRes.status}: ${JSON.stringify(falData).substring(0,200)}`);

    const imageUrl = falData.images?.[0]?.url;
    if (!imageUrl) throw new Error('No image URL: ' + JSON.stringify(falData).substring(0,150));

    // Return as base64
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
