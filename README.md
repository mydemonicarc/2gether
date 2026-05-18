#  2gether — Watch Party Platform

A real-time social watch party app. Watch YouTube videos or local files together with friends, see each other on camera, chat live and react in real time — all in a retro drive-in cinema themed interface.

---

## Project structure

```
cinesync/
├── server/                    ← Node.js + Socket.IO backend
│   ├── index.js               ← Main server (HTTP + WebSocket + WebRTC signalling)
│   ├── roomManager.js         ← In-memory room state management
│   └── package.json
│
└── client/                    ← React frontend
    ├── src/
    │   ├── hooks/
    │   │   ├── useSocket.js       ← Socket.IO connection + emit helpers
    │   │   ├── useWebRTC.js       ← Camera/mic peer connections + data channels
    │   │   └── useFileStream.js   ← Local video file chunking + streaming
    │   ├── components/
    │   │   ├── LobbyScreen.jsx    ← Animated drive-in landing page
    │   │   ├── TicketPopup.jsx    ← Draggable room ticket with physics
    │   │   ├── Room.jsx           ← Main room layout (night sky scene)
    │   │   ├── VideoPlayer.jsx    ← YouTube + local file player with sync
    │   │   ├── VideoCall.jsx      ← Camera feed grid with mic/cam controls
    │   │   ├── Chat.jsx           ← Real-time chat panel
    │   │   └── Reactions.jsx      ← Floating emoji reactions
    │   ├── App.jsx                ← Root — routes between lobby and room
    │   └── main.jsx               ← React entry point
    └── package.json
```

---

## Setup

### 1. Start the server
```bash
cd server
npm install
npm run dev        # starts on http://localhost:4000
```

### 2. Start the frontend (new terminal)
```bash
cd client
npm install
npm run dev        # starts on http://localhost:3000
```

### 3. Open your browser
Go to `http://localhost:3000`

---

## How to test

1. Open two browser tabs at `http://localhost:3000`
2. Tab 1: enter your name → click **CREATE ROOM**
3. A retro cinema ticket pops up with your room code — copy it or share the link
4. Tab 2: enter a different name → paste the room code → click **JOIN**
5. Both tabs are now in the same room
6. **YouTube sync:** paste a YouTube URL in the top bar → click LOAD → both tabs sync
7. **Local file:** click 📁 OPEN FILE → pick a video → guests see a loading bar then playback starts
8. Try chatting, reacting with emojis, and toggling your mic/cam

---

## Features

### Lobby (LobbyScreen)
- Animated retro drive-in night scene
- Stars, shooting stars, drifting clouds, silhouette trees
- 4 clickable retro cars — click to honk (BEEP BEEP! + headlight beam)
- Cars occasionally drift on their own
- Click the moon to toggle day/night mode (sky, trees, ground all transition)
- Draggable room ticket with physics — throw it around the screen
- Ticket has Copy Code + Share Link + Enter Room buttons

### Room
- Night sky scene with floating video screen
- YouTube video sync — host controls play/pause/seek, guests mirror automatically
- Local video file streaming — host picks a file, chunks stream to guests via WebRTC
- Guest loading bar fills up as file buffers, playback starts at 5%
- WebRTC camera + mic — peer-to-peer, no media server needed
- Mic and camera toggle buttons
- Real-time chat with styled message bubbles
- Floating emoji reactions
- Automatic host transfer when host leaves
- Invite link copies to clipboard

---

## Tech stack

| Layer | Tool | Why |
|---|---|---|
| Frontend | React + Vite | Fast dev server, industry standard |
| Styling | Tailwind CSS + inline styles | Utility classes + fine-grained control |
| Font | Courier New | Consistent retro cinema feel |
| Realtime | Socket.IO | WebSocket with fallbacks |
| YouTube | YouTube IFrame API | Free, reliable, no hosting needed |
| Camera/Mic | WebRTC + simple-peer | Peer-to-peer, no media server |
| File streaming | WebRTC data channels | Chunk-based peer-to-peer file transfer |
| Backend | Node.js + Express | Same language as frontend |
| Room state | In-memory (Map) | Simple, fast, no DB needed for MVP |

---

## Roadmap

### Done
- Room creation + joining via code
- YouTube sync (play, pause, seek)
- Local file streaming via WebRTC data channels
- WebRTC camera + mic
- Real-time chat + emoji reactions
- Animated lobby (drive-in theme, day/night toggle, interactive cars)
- Draggable ticket popup with physics
- Host auto-transfer on disconnect

### Phase 2
- Sync drift correction (re-sync if > 500ms off)
- Redis for multi-instance room state
- Mobile layout optimisation

### Phase 3
- Screen share mode (host shares screen → guests watch stream)
- SFU integration (mediasoup) for larger rooms

### Phase 4
- Browser extension (Netflix / Prime / Hotstar sync like Teleparty)

---

## Key files to read first

If you're new to the codebase, read in this order:

1. `server/roomManager.js` — understand how rooms are stored
2. `server/index.js` — all Socket.IO events
3. `client/src/hooks/useSocket.js` — how frontend connects to server
4. `client/src/App.jsx` — routing between lobby and room
5. `client/src/components/LobbyScreen.jsx` — lobby animations + interactions
6. `client/src/components/Room.jsx` — main room layout
7. `client/src/hooks/useWebRTC.js` — camera/mic + data channels
8. `client/src/hooks/useFileStream.js` — local file streaming logic