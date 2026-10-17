"use client";

import { useState, useRef, useEffect, useCallback } from "react";

const STORAGE_KEY_VOLUME = "blackhole_audio_volume";
const AUDIO_SRC = "/audio/background-music.mp3";

export interface AudioState {
  isPlaying: boolean;
  volume: number;
}

export function useAudio() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolumeState] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_VOLUME);
      if (saved !== null) {
        const parsed = parseFloat(saved);
        return isNaN(parsed) ? 0.5 : Math.max(0, Math.min(1, parsed));
      }
    } catch {
      // localStorage unavailable
    }
    return 0.5;
  });

  // Create audio element once. Once playback starts, we NEVER call
  // audio.pause() — we only toggle audio.muted to avoid the unreliable
  // pause/resume cycle with preload="none".
  useEffect(() => {
    if (typeof window === "undefined") return;

    // preload = "none" is intentional — the 2.1MB MP3 must not compete
    // with WASM, JS bundles, or other critical startup resources for
    // network bandwidth.
    const audio = new Audio(AUDIO_SRC);
    audio.loop = true;
    audio.preload = "none";
    audio.volume = volume;
    audio.muted = true;
    audioRef.current = audio;

    return () => {
      audio.pause();
      audio.src = "";
      audioRef.current = null;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Sync volume
  useEffect(() => {
    const audio = audioRef.current;
    if (audio) audio.volume = volume;
  }, [volume]);

  // Persist volume
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_VOLUME, String(volume));
    } catch {
      // ignore
    }
  }, [volume]);

  // Sync isPlaying to audio muted state
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.muted = !isPlaying;
  }, [isPlaying]);

  /**
   * Called on first user interaction to satisfy browser autoplay policies.
   * After this, audio keeps playing internally forever; toggle() just
   * flips the muted flag.
   */
  const handleInteraction = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || !audio.paused) return;
    audio.muted = false;
    audio.play().catch(() => {
      // Browser blocked autoplay
    });
    setIsPlaying(true);
  }, []);

  const toggle = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (audio.paused) {
      // Audio was cleaned up (StrictMode remount / error recovery)
      audio.muted = false;
      audio.play().catch(() => {});
      setIsPlaying(true);
    } else {
      setIsPlaying((prev) => !prev);
    }
  }, []);

  const setVolume = useCallback((v: number) => {
    const clamped = Math.max(0, Math.min(1, v));
    setVolumeState(clamped);
  }, []);

  return {
    isPlaying,
    volume,
    toggle,
    setVolume,
    handleInteraction,
  } satisfies AudioState & {
    toggle: () => void;
    setVolume: (v: number) => void;
    handleInteraction: () => void;
  };
}
