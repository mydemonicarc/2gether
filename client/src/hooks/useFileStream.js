/**
 * useFileStream.js
 * Handles local video file streaming between host and guests.
 *
 * HOST flow:
 *   1. selectFile() → user picks a file
 *   2. Creates a local Blob URL immediately for host playback
 *   3. Sends file metadata to all peers
 *   4. Streams file chunks to all peers
 *
 * GUEST flow:
 *   1. Receives file metadata → prepares buffer array
 *   2. Receives chunks → fills buffer, updates progress
 *   3. At START_THRESHOLD → creates Blob URL and triggers playback
 */

import { useRef, useState, useCallback } from 'react';

const CHUNK_SIZE       = 256 * 1024; // 256 KB per chunk
const START_THRESHOLD  = 0.05;       // start playing at 5% received

export function useFileStream({ isHost, broadcastData, broadcastBinary, onIncomingData }) {
  const [localFileUrl,  setLocalFileUrl]  = useState(null); // host's blob URL
  const [guestFileUrl,  setGuestFileUrl]  = useState(null); // guest's blob URL
  const [streamProgress, setStreamProgress] = useState(0);  // 0–100 (guest buffer %)
  const [isBuffering,   setIsBuffering]   = useState(false);
  const [fileName,      setFileName]      = useState('');

  const fileRef        = useRef(null);   // the actual File object (host)
  const chunksRef      = useRef([]);     // received chunk array (guest)
  const totalChunksRef = useRef(0);      // total expected chunks (guest)
  const fileSizeRef    = useRef(0);
  const fileTypeRef    = useRef('');
  const startedRef     = useRef(false);  // has guest started playback yet?

  // ── HOST: open file picker ─────────────────────────────────────────────────
  const selectFile = useCallback(() => {
    const input = document.createElement('input');
    input.type   = 'file';
    input.accept = 'video/mp4,video/webm,video/mkv,video/*';

    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      fileRef.current = file;
      setFileName(file.name);

      // Immediately create a local URL for the host to play
      const localUrl = URL.createObjectURL(file);
      setLocalFileUrl(localUrl);

      // Tell guests a file is coming
      const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
      broadcastData({
        type:        'file-meta',
        name:        file.name,
        size:        file.size,
        mimeType:    file.type || 'video/mp4',
        totalChunks,
      });

      // Start streaming chunks
      await streamChunks(file, totalChunks);
    };

    input.click();
  }, [broadcastData, broadcastBinary]);

  // ── HOST: read + send chunks ──────────────────────────────────────────────
  const streamChunks = useCallback(async (file, totalChunks) => {
    for (let i = 0; i < totalChunks; i++) {
      const start  = i * CHUNK_SIZE;
      const end    = Math.min(start + CHUNK_SIZE, file.size);
      const slice  = file.slice(start, end);

      // Read chunk as ArrayBuffer
      const buffer = await slice.arrayBuffer();

      // Send chunk index metadata first so guest can reassemble in order
      broadcastData({ type: 'file-chunk-meta', index: i, totalChunks });

      // Then send the raw binary
      broadcastBinary(new Uint8Array(buffer));

      // Small delay to avoid flooding the data channel
      await new Promise(r => setTimeout(r, 8));
    }

    broadcastData({ type: 'file-stream-done' });
    console.log('[filestream] host: done sending all chunks');
  }, [broadcastData, broadcastBinary]);

  // ── GUEST: handle incoming data ───────────────────────────────────────────
  // Call this once from Room.jsx via onIncomingData
  const handleIncomingData = useCallback((msg) => {
    if (msg.type === 'file-meta') {
      // Reset state for new file
      totalChunksRef.current = msg.totalChunks;
      fileSizeRef.current    = msg.size;
      fileTypeRef.current    = msg.mimeType;
      chunksRef.current      = new Array(msg.totalChunks).fill(null);
      startedRef.current     = false;
      setGuestFileUrl(null);
      setStreamProgress(0);
      setIsBuffering(true);
      setFileName(msg.name);
      console.log(`[filestream] guest: expecting ${msg.totalChunks} chunks`);
    }

    else if (msg.type === 'file-chunk-meta') {
      // Store the upcoming chunk index so we know where to put the next binary
      chunksRef.current._nextIndex = msg.index;
    }

    else if (msg.type === 'file-chunk-binary') {
      // Place binary in the correct slot
      const idx = chunksRef.current._nextIndex;
      if (idx !== undefined && chunksRef.current[idx] === null) {
        chunksRef.current[idx] = msg.buffer;

        const received = chunksRef.current.filter(c => c !== null).length;
        const progress = Math.round((received / totalChunksRef.current) * 100);
        setStreamProgress(progress);

        // Start playback once threshold is met
        if (!startedRef.current && received / totalChunksRef.current >= START_THRESHOLD) {
          startedRef.current = true;
          buildAndPlayPartial();
        }
      }
    }

    else if (msg.type === 'file-stream-done') {
      // Build final complete Blob
      buildFinalBlob();
      setIsBuffering(false);
      console.log('[filestream] guest: stream complete');
    }
  }, []);

  // Build a partial Blob from chunks received so far and start playback
  function buildAndPlayPartial() {
    const received = chunksRef.current.filter(c => c !== null);
    const blob = new Blob(received, { type: fileTypeRef.current || 'video/mp4' });
    const url  = URL.createObjectURL(blob);
    setGuestFileUrl(url);
    setIsBuffering(false);
  }

  // Build the final complete Blob once all chunks are in
  function buildFinalBlob() {
    const allChunks = chunksRef.current.filter(c => c !== null);
    if (allChunks.length === 0) return;
    const blob = new Blob(allChunks, { type: fileTypeRef.current || 'video/mp4' });
    const url  = URL.createObjectURL(blob);
    setGuestFileUrl(url);
  }

  return {
    // Host
    selectFile,
    localFileUrl,
    // Guest
    guestFileUrl,
    streamProgress,
    isBuffering,
    // Shared
    fileName,
    handleIncomingData,
  };
}