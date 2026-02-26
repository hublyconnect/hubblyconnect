"use client";

import { useRef, useState, useEffect } from "react";

type Props = {
  src: string;
  className?: string;
  /** Light theme usa azul Hubly; dark usa dourado */
  theme?: "light" | "dark";
};

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function PortalAudioPlayer({ src, className = "", theme = "dark" }: Props) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onLoadedMetadata = () => setDuration(audio.duration);
    const onTimeUpdate = () => setCurrentTime(audio.currentTime);
    const onEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);

    audio.addEventListener("loadedmetadata", onLoadedMetadata);
    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("ended", onEnded);
    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);

    if (audio.readyState >= 1) setDuration(audio.duration);

    return () => {
      audio.removeEventListener("loadedmetadata", onLoadedMetadata);
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("ended", onEnded);
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onPause);
    };
  }, [src]);

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;
  const accentColor = theme === "light" ? "#0052FF" : "#f59e0b";

  return (
    <div className={`flex items-center gap-3 rounded-lg p-3 animate-in fade-in-0 slide-in-from-bottom-2 duration-300 ${theme === "dark" ? "border border-zinc-800 bg-zinc-800/50" : "border border-slate-200/80 bg-slate-50/50"} ${className}`}>
      <audio ref={audioRef} src={src} preload="metadata" className="hidden" />
      <button
        type="button"
        onClick={() => {
          const audio = audioRef.current;
          if (!audio) return;
          if (isPlaying) audio.pause();
          else audio.play();
        }}
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 transition-colors"
        style={{
          borderColor: accentColor,
          color: accentColor,
        }}
        aria-label={isPlaying ? "Pausar" : "Reproduzir"}
      >
        {isPlaying ? (
          <svg className="size-5" fill="currentColor" viewBox="0 0 24 24">
            <rect x="6" y="4" width="4" height="16" rx="1" />
            <rect x="14" y="4" width="4" height="16" rx="1" />
          </svg>
        ) : (
          <svg className="ml-0.5 size-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M8 5v14l11-7z" />
          </svg>
        )}
      </button>
      <div className="min-w-0 flex-1">
        <div className={`h-2 w-full rounded-full overflow-hidden ${theme === "dark" ? "bg-zinc-700" : "bg-slate-200/80"}`}>
          <div
            className="h-full rounded-full transition-all duration-150"
            style={{ width: `${progress}%`, backgroundColor: accentColor }}
          />
        </div>
        <p className={`mt-1 text-xs tabular-nums ${theme === "dark" ? "text-zinc-400" : "text-slate-600"}`}>
          {formatTime(currentTime)} / {formatTime(duration)}
        </p>
      </div>
    </div>
  );
}
