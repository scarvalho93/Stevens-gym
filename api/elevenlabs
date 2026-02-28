export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "ElevenLabs not configured" });
  }

  const { text, voiceId } = req.body;
  if (!text) {
    return res.status(400).json({ error: "No text provided" });
  }

  const vid = voiceId || "2UMI2FME0FFUFMlUoRER";

  try {
    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${vid}`,
      {
        method: "POST",
        headers: {
          "xi-api-key": apiKey,
          "Content-Type": "application/json",
          Accept: "audio/mpeg",
        },
        body: JSON.stringify({
          text: text.slice(0, 500),
          model_id: "eleven_monolingual_v1",
          voice_settings: { stability: 0.5, similarity_boost: 0.75 },
        }),
      }
    );

    if (!response.ok) {
      const err = await response.text();
      return res.status(response.status).json({ error: err });
    }

    const buffer = await response.arrayBuffer();
    res.setHeader("Content-Type", "audio/mpeg");
    res.setHeader("Cache-Control", "no-cache");
    res.send(Buffer.from(buffer));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
