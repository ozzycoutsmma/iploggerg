const fs = require("fs");
const path = require("path");

const env = {};
const envFile = path.join(__dirname, ".env");
fs.readFileSync(envFile, "utf8").split("\n").forEach(line => {
  const [k, ...v] = line.split("=");
  if (k && k.trim()) env[k.trim()] = v.join("=").trim();
});

module.exports = {
  apps: [{
    name: "youtubevidshare-api",
    script: "server.js",
    cwd: __dirname,
    env,
  }],
};
