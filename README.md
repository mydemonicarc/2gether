# 2gether

Watch YouTube together, see each other on camera, chat and react in real time — like the distance was never there. Wrapped in a retro drive-in cinema that actually feels like somewhere you'd want to hang out.

No accounts. No installs. Just a room code and the people who matter.

---

## what you can do

**watch together** — paste a YouTube link, hit load, and everyone's in sync. Host plays, everyone follows.

**see each other** — live camera and mic, peer-to-peer, right in the browser.

**chat and react** — talk while you watch. Send emojis that float across the screen.

**the lobby** — there's a whole animated drive-in to mess around in before you even start. Honk the cars. Click the moon. Throw your ticket around the screen.

---

## getting started

You'll need Node.js. Then:

```bash
# terminal 1 — server
cd server
npm install
npm run dev        # http://localhost:4000

# terminal 2 — frontend
cd client
npm install
npm run dev        # http://localhost:3000
```

Open `http://localhost:3000` in two tabs to try it yourself.

---

## how rooms work

1. Enter your name → **CREATE ROOM**
2. A retro ticket appears with your room code — share it or copy the link
3. Friends paste the code → **JOIN**
4. Paste a YouTube URL → **LOAD** → you're watching together