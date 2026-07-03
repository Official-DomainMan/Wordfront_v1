# Wordfront Discord Activity Setup

Wordfront can now be launched from Discord's Activity button once it is hosted and mapped in the Discord Developer Portal.

## 1. Discord Developer Portal

1. Open your Discord app in the Developer Portal.
2. Go to **OAuth2** and copy:
   - Client ID
   - Client Secret
3. Go to **Activities**.
4. Add a URL Mapping that points to your public HTTPS Wordfront URL.

Discord Activities are web apps hosted in an iframe. The Embedded App SDK handles communication between Discord and the iframe.

## 2. Client env

Create `client/.env`:

```env
VITE_DISCORD_CLIENT_ID=YOUR_DISCORD_CLIENT_ID
```

For local browser testing only:

```env
VITE_API_BASE_URL=http://localhost:3001
```

## 3. Server env

Create `server/.env`:

```env
PORT=3001
DISCORD_CLIENT_ID=YOUR_DISCORD_CLIENT_ID
DISCORD_CLIENT_SECRET=YOUR_DISCORD_CLIENT_SECRET
NODE_ENV=production
```

## 4. Install

Server:

```powershell
cd C:\Dev\wordfront-v024-discord-activity\server
npm install
```

Client:

```powershell
cd C:\Dev\wordfront-v024-discord-activity\client
yarn install
```

## 5. Local dev

Terminal 1:

```powershell
cd C:\Dev\wordfront-v024-discord-activity\server
npm run dev
```

Terminal 2:

```powershell
cd C:\Dev\wordfront-v024-discord-activity\client
yarn dev
```

## 6. Production

```powershell
cd C:\Dev\wordfront-v024-discord-activity\client
yarn build
```

Then:

```powershell
cd C:\Dev\wordfront-v024-discord-activity\server
npm start
```

The server serves `client/dist` when `NODE_ENV=production`.

## 7. Public URL

Discord needs a public HTTPS URL. Use Railway, Render, Fly.io, Cloudflare Tunnel, or ngrok, then put that URL into the Activity URL Mapping.
