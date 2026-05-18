/**
 * useFileStream.js
 * Handles local video file streaming between host and guests.
 *
 * HOST flow:
 *   1. selectFile() → user picks a file
 *   2. Creates a local Blob URL immediately for host playback
 *   3. Sends file metadata to all peers
 *   4. Streams file chunks to all peers with backpressure
 *
 * GUEST flow:
 *   1. Receives file metadata → prepares buffer array
 *   2. Receives chunks → fills buffer, updates progress
 *   3. At START_THRESHOLD → creates Blob URL and triggers playback
 */

import { useRef, useState, useCallback, useEffect } from 'react';

const CHUNK_SIZE       = 256 * 1024; // 256 KB per chunk
const START_THRESHOLD  = 0.05;       // start playing at 5% received
const BUFFER_THRESHOLD = 256 * 1024; // pause sending if buffer exceeds 256KB

export function useFileStream({ isHost, broadcastData, broadcastBinary, onIncomingData, getPeers }) {
  const [localFileUrl,   setLocalFileUrl]   = useState(null);
  const [guestFileUrl,   setGuestFileUrl]   = useState(null);
  const [streamProgress, setStreamProgress] = useState(0);
  const [isBuffering,    setIsBuffering]    = useState(false);
  const [fileName,       setFileName]       = useState('');

  const broadcastDataRef   = useRef(broadcastData);
  const broadcastBinaryRef = useRef(broadcastBinary);
  const getPeersRef        = useRef(getPeers);
  useEffect(() => { broadcastDataRef.current   = broadcastData;   }, [broadcastData]);
  useEffect(() => { broadcastBinaryRef.current = broadcastBinary; }, [broadcastBinary]);
  useEffect(() => { getPeersRef.current        = getPeers;        }, [getPeers]);
  

  const fileRef        = useRef(null);
  const chunksRef      = useRef([]);
  const totalChunksRef = useRef(0);
  const fileSizeRef    = useRef(0);
  const fileTypeRef    = useRef('');
  const startedRef     = useRef(false);

  // ── Reset file state ───────────────────────────────────────────────────────
  const resetFile = useCallback(() => {
    setLocalFileUrl(null);
    setGuestFileUrl(null);
    setStreamProgress(0);
    setIsBuffering(false);
    setFileName('');
    fileRef.current        = null;
    chunksRef.current      = [];
    totalChunksRef.current = 0;
    startedRef.current     = false;
  }, []);

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

      const localUrl = URL.createObjectURL(file);
      setLocalFileUrl(localUrl);

      const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
      broadcastDataRef.current({
        type:        'file-meta',
        name:        file.name,
        size:        file.size,
        mimeType:    file.type || 'video/mp4',
        totalChunks,
      });

      await streamChunks(file, totalChunks);
    };

    input.click();
  }, [broadcastData, broadcastBinary]);

  // ── Wait until all peer data channel buffers have drained ────────────────
  function waitForBuffer() {
    return new Promise(resolve => {
      const check = () => {
      const peers = getPeersRef.current?.() || {};
      const allClear = Object.values(peers).every(peer => {
        const channel = peer._channel;
        console.log('[buffer] channel:', channel, 'bufferedAmount:', channel?.bufferedAmount);
        return !channel || channel.bufferedAmount < BUFFER_THRESHOLD;
      });
        if (allClear) resolve();
        else setTimeout(check, 50);
      };
      check();
    });
  }

  // ── HOST: read + send chunks with backpressure ────────────────────────────
  const streamChunks = useCallback(async (file, totalChunks) => {
    for (let i = 0; i < totalChunks; i++) {
      const start  = i * CHUNK_SIZE;
      const end    = Math.min(start + CHUNK_SIZE, file.size);
      const slice  = file.slice(start, end);
      const buffer = await slice.arrayBuffer();

      // Wait until buffers drain before sending next chunk
      await waitForBuffer();

      broadcastDataRef.current({ type: 'file-chunk-meta', index: i, totalChunks });
      broadcastBinaryRef.current(new Uint8Array(buffer));
    }

    broadcastDataRef.current({ type: 'file-stream-done' });
    console.log('[filestream] host: done sending all chunks');
  }, [broadcastData, broadcastBinary]);

  // ── GUEST: handle incoming data ───────────────────────────────────────────
  const handleIncomingData = useCallback((msg) => {
    if (msg.type === 'file-meta') {
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
      chunksRef.current._nextIndex = msg.index;
    }

    else if (msg.type === 'file-chunk-binary') {
      const idx = chunksRef.current._nextIndex;
      if (idx !== undefined && chunksRef.current[idx] === null) {
        chunksRef.current[idx] = msg.buffer;

        const received = chunksRef.current.filter(c => c !== null).length;
        const progress = Math.round((received / totalChunksRef.current) * 100);
        setStreamProgress(progress);

        if (!startedRef.current && received / totalChunksRef.current >= START_THRESHOLD) {
          startedRef.current = true;
          buildAndPlayPartial();
        }
      }
    }

    else if (msg.type === 'file-stream-done') {
      buildFinalBlob();
      setIsBuffering(false);
      console.log('[filestream] guest: stream complete');
    }
  }, []);

  function buildAndPlayPartial() {
    const received = chunksRef.current.filter(c => c !== null);
    const blob = new Blob(received, { type: fileTypeRef.current || 'video/mp4' });
    const url  = URL.createObjectURL(blob);
    setGuestFileUrl(url);
    setIsBuffering(false);
  }

  function buildFinalBlob() {
    const allChunks = chunksRef.current.filter(c => c !== null);
    if (allChunks.length === 0) return;
    const blob = new Blob(allChunks, { type: fileTypeRef.current || 'video/mp4' });
    const url  = URL.createObjectURL(blob);
    setGuestFileUrl(url);
  }

  return {
    selectFile,
    localFileUrl,
    guestFileUrl,
    streamProgress,
    isBuffering,
    fileName,
    handleIncomingData,
    resetFile,
  };
}