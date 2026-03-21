export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { prompt, width = 1024, height = 1024, seed } = req.body || {};
  if (!prompt) return res.status(400).json({ error: 'Prompt required' });

  const useSeed = seed || Math.floor(Math.random() * 999999);
  const enc = encodeURIComponent(prompt.trim().substring(0, 500));
  const imageUrl = `https://image.pollinations.ai/prompt/${enc}?width=${width}&height=${height}&seed=${useSeed}&nologo=true`;

  return res.status(200).json({ success: true, imageUrl });
}
