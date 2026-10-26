// Serverless function for Vercel (api/discord.js).
// Reads process.env.DISCORD_WEBHOOK and forwards the incoming body to Discord.
// Deploy this file under /api on Vercel (root api/discord.js).
export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }
  const secret = process.env.WEBHOOK_SECRET;
  if (!secret || req.headers["x-webhook-token"] !== secret) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  const webhook = process.env.DISCORD_WEBHOOK;
  if (!webhook) {
    return res.status(500).json({ error: "Discord webhook is not configured" });
  }
  try {
    const body = req.body || {};
    // If the client provided a simple 'content' string, forward that. Otherwise stringify body.
    const discordPayload = {
      content: body.content || JSON.stringify(body, null, 2),
    };
    const r = await fetch(webhook, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(discordPayload),
    });
    if (!r.ok) {
      const text = await r.text().catch(() => "");
      return res.status(502).json({ error: "Discord returned an error", status: r.status, body: text });
    }
    return res.status(200).json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: String(err) });
  }
}
