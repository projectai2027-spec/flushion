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

  try {
    // Step 1: Submit request to fal.ai queue
    const submitRes = await fetch('https://queue.fal.run/fal-ai/flux/schnell', {
      method: 'POST',
      headers: {
        'Authorization': `Key ${falKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt: prompt.trim().substring(0, 500),
        image_size: { width: Math.min(width, 1024), height: Math.min(height, 1024) },
        num_inference_steps: 4,
        num_images: 1,
        enable_safety_checker: false,
        output_format: 'jpeg'
      })
    });

    if (!submitRes.ok) {
      const errText = await submitRes.text();
      throw new Error(`fal submit error ${submitRes.status}: ${errText.substring(0, 300)}`);
    }

    const submitData = await submitRes.json();
    const requestId = submitData.request_id;
    if (!requestId) throw new Error('No request_id from fal.ai');

    // Step 2: Poll for result
    const statusUrl = `https://queue.fal.run/fal-ai/flux/schnell/requests/${requestId}`;
    
    for (let i = 0; i < 30; i++) {
      await new Promise(r => setTimeout(r, 2000));
      
      const pollRes = await fetch(statusUrl, {
        headers: { 'Authorization': `Key ${falKey}` }
      });
      
      if (!pollRes.ok) continue;
      
      const pollData = await pollRes.json();
      
      if (pollData.status === 'COMPLETED' || pollData.images?.[0]?.url) {
        const imageUrl = pollData.images?.[0]?.url || pollData.output?.images?.[0]?.url;
        if (!imageUrl) throw new Error('No image URL in result');
        
        // Fetch image and return as base64
        const imgRes = await fetch(imageUrl);
        const buffer = await imgRes.arrayBuffer();
        const base64 = Buffer.from(buffer).toString('base64');
        const mime = imgRes.headers.get('content-type') || 'image/jpeg';
        
        return res.status(200).json({ 
          success: true, 
          image: `data:${mime};base64,${base64}` 
        });
      }
      
      if (pollData.status === 'FAILED') {
        throw new Error('fal.ai generation failed: ' + JSON.stringify(pollData).substring(0, 200));
      }
    }
    
    throw new Error('Timeout: fal.ai took too long');

  } catch (err) {
    console.error('Generate error:', err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
}
