import http from "http";

const PORT = 4821;
const WEBHOOK = process.env.DISCORD_WEBHOOK;
const ALLOWED_ORIGIN = "https://youtubevidshare.shareroute.org";

// In-memory rate limiter
const rateLimits = new Map(); // ip -> { count, resetTime }

function isRateLimited(ip) {
  const now = Date.now();
  const windowMs = 60 * 1000; // 1 minute window
  const limit = 5; // 5 requests per window

  if (!rateLimits.has(ip)) {
    rateLimits.set(ip, { count: 1, resetTime: now + windowMs });
    return false;
  }

  const limitData = rateLimits.get(ip);
  if (now > limitData.resetTime) {
    limitData.count = 1;
    limitData.resetTime = now + windowMs;
    return false;
  }

  if (limitData.count >= limit) {
    return true;
  }

  limitData.count++;
  return false;
}

// Periodically clean up memory from expired entries
setInterval(() => {
  const now = Date.now();
  for (const [ip, limitData] of rateLimits.entries()) {
    if (now > limitData.resetTime) {
      rateLimits.delete(ip);
    }
  }
}, 5 * 60 * 1000).unref();

const server = http.createServer(async (req, res) => {
  if (req.method !== "POST" || req.url !== "/api/discord") {
    res.writeHead(404);
    return res.end();
  }

  // Rate Limiting Check (get real client IP behind Caddy)
  const ip = (req.headers["x-forwarded-for"] || "").split(",")[0].trim() || req.socket.remoteAddress;
  if (isRateLimited(ip)) {
    res.writeHead(429, { "Content-Type": "application/json" });
    return res.end(JSON.stringify({ error: "Too many requests. Limit is 5 per minute." }));
  }

  const origin = req.headers["origin"];
  if (origin && origin !== ALLOWED_ORIGIN) {
    res.writeHead(403);
    return res.end();
  }

  let body = "";
  req.on("data", chunk => {
    body += chunk;
    if (body.length > 16384) req.destroy();
  });

  req.on("end", async () => {
    try {
      const parsed = JSON.parse(body);
      const content = parsed.content;
      if (typeof content !== "string") {
        res.writeHead(400);
        return res.end();
      }

      const chunks = [];
      const lines = content.split("\n");
      let current = "";
      for (const line of lines) {
        if ((current + "\n" + line).length > 1990) {
          if (current) chunks.push(current);
          current = line;
        } else {
          current = current ? current + "\n" + line : line;
        }
      }
      if (current) chunks.push(current);

      let allOk = true;
      for (const chunk of chunks) {
        const r = await fetch(WEBHOOK, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content: chunk }),
        });
        if (!r.ok) { allOk = false; break; }
        if (chunks.length > 1) await new Promise(r => setTimeout(r, 500));
      }

      res.writeHead(allOk ? 200 : 502, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: allOk }));
    } catch {
      res.writeHead(400);
      res.end();
    }
  });
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`API server running on 127.0.0.1:${PORT}`);
});
