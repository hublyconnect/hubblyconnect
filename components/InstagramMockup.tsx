"use client";

import { Heart, MessageCircle, Send, Bookmark, MoreHorizontal, Music, Link2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface InstagramMockupProps {
  mode: "feed" | "reels";
  username?: string;
  profileImage?: string;
  mediaUrl?: string | null;
  isVideo?: boolean;
  caption?: string;
  /** Exibe estilo "Perfil não conectado" (texto acinzentado, sem avatar) */
  isDisconnected?: boolean;
  /** Callback para iniciar OAuth do Instagram (exibido como botão quando isDisconnected) */
  onConnectClick?: () => void;
}

export function InstagramMockup({
  mode,
  username = "seu_perfil",
  profileImage,
  mediaUrl,
  isVideo = false,
  caption = "",
  isDisconnected = false,
  onConnectClick,
}: InstagramMockupProps) {
  const displayName = isDisconnected ? "Perfil não conectado" : username;
  const showPlaceholder = isDisconnected || !profileImage;
  const showConnectButton = isDisconnected && onConnectClick;
  const renderMedia = () => {
    if (!mediaUrl) {
      return (
        <div className="w-full h-full flex items-center justify-center text-gray-400 text-sm">
          {mode === "reels" ? (
            <>
              <Music className="w-10 h-10 animate-pulse mb-2" />
              <span>Prévia do Reels</span>
            </>
          ) : (
            <span>Prévia da imagem</span>
          )}
        </div>
      );
    }
    const isVideoContent = isVideo || /\.(mp4|mov|webm)$/i.test(mediaUrl);
    if (isVideoContent) {
      return (
        <video
          src={mediaUrl}
          className="w-full h-full object-cover"
          autoPlay
          muted
          loop
          playsInline
        />
      );
    }
    return <img src={mediaUrl} alt="Preview" className="w-full h-full object-cover" />;
  };

  return (
    <div className="relative w-full max-w-[300px] mx-auto rounded-[2.5rem] border-[8px] border-[#1c1c1e] bg-[#1c1c1e] overflow-hidden shadow-[0_0_60px_-15px_rgba(0,0,0,0.6),0_25px_50px_-12px_rgba(0,0,0,0.25)] aspect-[9/19] min-h-[520px]">
      {showConnectButton && (
        <div className="absolute inset-0 z-50 flex items-center justify-center rounded-[2rem] bg-black/60 backdrop-blur-sm p-4">
          <Button
            type="button"
            onClick={(e) => { e.stopPropagation(); onConnectClick?.(); }}
            className="rounded-full bg-[#3B82F6] hover:bg-[#2563EB] text-white shadow-lg shadow-blue-500/30 gap-2 border-0"
          >
            <Link2 className="size-4" />
            Conectar Instagram
          </Button>
        </div>
      )}
      {/* iPhone 15 Pro: Dynamic Island (menor) */}
      <div className="absolute top-2.5 left-1/2 -translate-x-1/2 w-[100px] h-[32px] bg-black rounded-full z-50 flex items-center justify-center">
        <div className="w-2.5 h-2.5 rounded-full bg-[#2c2c2e]" />
      </div>
      {/* STATUS BAR */}
      <div className="absolute top-3 left-6 z-40 text-white text-[10px] font-semibold">9:41</div>
      <div className="absolute top-3 right-6 z-40 flex gap-1">
        <div className="w-4 h-2.5 border border-white/25 rounded-[2px]" />
      </div>
      {/* TELA + reflexo sutil */}
      <div className={cn("w-full h-full bg-white relative overflow-hidden pt-11", mode === "reels" && "bg-black")}>
        {/* Reflexo na tela (glass) */}
        <div className="absolute inset-0 pointer-events-none z-30 bg-gradient-to-br from-white/20 via-transparent to-transparent rounded-b-[1.5rem]" aria-hidden />
        {/* === LAYOUT FEED === */}
        {mode === "feed" && (
          <div className="w-full h-full flex flex-col">
            {/* Header Feed */}
            <div className="flex items-center justify-between px-3 pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full p-[2px] bg-gradient-to-tr from-yellow-400 via-red-500 to-purple-600">
                  <div className="w-full h-full bg-white rounded-full p-[2px] overflow-hidden">
                    {!showPlaceholder && profileImage ? (
                      <img src={profileImage} alt="" className="w-full h-full object-cover rounded-full" />
                    ) : (
                      <div className={cn("w-full h-full rounded-full", isDisconnected ? "bg-gray-200 flex items-center justify-center" : "bg-gray-200")}>
                        {isDisconnected && (
                          <span className="text-[10px] text-gray-400" aria-hidden>?</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                <span className={cn("text-xs font-semibold", isDisconnected ? "text-gray-500 italic" : "text-gray-900")}>{displayName}</span>
              </div>
              <MoreHorizontal className="w-4 h-4 text-gray-700" />
            </div>
            {/* Mídia Feed (Quadrada) */}
            <div className="w-full aspect-square bg-gray-100 relative">
              {renderMedia()}
            </div>
            {/* Ações Feed */}
            <div className="p-3">
              <div className="flex justify-between items-center mb-3">
                <div className="flex gap-4">
                  <Heart className="w-6 h-6 text-gray-900" />
                  <MessageCircle className="w-6 h-6 text-gray-900 -rotate-90" />
                  <Send className="w-6 h-6 text-gray-900" />
                </div>
                <Bookmark className="w-6 h-6 text-gray-900" />
              </div>
              <div className="text-xs font-semibold mb-1">Curtido por você e outras pessoas</div>
              <div className="text-xs leading-snug">
                <span className={cn("font-semibold mr-1", isDisconnected && "text-gray-500")}>{displayName}</span>
                {caption || "Sua legenda..."}
              </div>
            </div>
          </div>
        )}
        {/* === LAYOUT REELS === */}
        {mode === "reels" && (
          <div className="w-full h-full relative">
            {/* Mídia Reels (Full) */}
            <div className="absolute inset-0 bg-gray-900">
              {renderMedia()}
            </div>
            {/* Overlay Preto Gradiente */}
            <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/90 pointer-events-none" />
            {/* Header Reels */}
            <div className="absolute top-12 left-4 z-40 flex justify-between w-[90%] items-center">
              <span className="text-white font-bold text-lg drop-shadow-md">Reels</span>
              <span className="text-xl" aria-hidden>📷</span>
            </div>
            {/* Sidebar Ações */}
            <div className="absolute bottom-20 right-3 z-40 flex flex-col gap-6 items-center">
              <div className="flex flex-col items-center gap-1">
                <Heart className="w-7 h-7 text-white drop-shadow-sm" />
                <span className="text-white text-[10px] font-medium">Likes</span>
              </div>
              <div className="flex flex-col items-center gap-1">
                <MessageCircle className="w-7 h-7 text-white -rotate-90 drop-shadow-sm" />
                <span className="text-white text-[10px] font-medium">123</span>
              </div>
              <Send className="w-7 h-7 text-white drop-shadow-sm" />
              <MoreHorizontal className="w-7 h-7 text-white drop-shadow-sm" />
              <div className="w-7 h-7 rounded border border-white overflow-hidden mt-2">
                {!showPlaceholder && profileImage ? (
                  <img src={profileImage} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className={cn("w-full h-full", isDisconnected ? "bg-gray-600 flex items-center justify-center" : "bg-gray-500")}>
                    {isDisconnected && <span className="text-[8px] text-gray-400">?</span>}
                  </div>
                )}
              </div>
            </div>
            {/* Info Inferior */}
            <div className="absolute bottom-6 left-4 right-14 z-40 text-white">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-full border border-white/20 overflow-hidden">
                  {!showPlaceholder && profileImage ? (
                    <img src={profileImage} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className={cn("w-full h-full", isDisconnected ? "bg-gray-600 flex items-center justify-center" : "bg-gray-500")}>
                      {isDisconnected && <span className="text-[10px] text-gray-400">?</span>}
                    </div>
                  )}
                </div>
                <span className={cn("text-sm font-semibold drop-shadow-md", isDisconnected && "text-white/70 italic")}>{displayName}</span>
                <span className="text-[10px] border border-white/40 px-2 py-0.5 rounded-lg backdrop-blur-sm">Seguir</span>
              </div>
              <div className="text-sm leading-snug line-clamp-2 mb-3 drop-shadow-sm">
                {caption || "Legenda do seu vídeo..."}
              </div>
              <div className="flex items-center gap-2 text-xs opacity-90">
                <Music className="w-3 h-3" />
                <div className="w-32 overflow-hidden">
                  <div className="whitespace-nowrap">Áudio Original • {displayName}</div>
                </div>
              </div>
            </div>
          </div>
        )}
        {/* Home Indicator */}
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-[110px] h-[4px] bg-white/50 rounded-full z-50 backdrop-blur-md" />
      </div>
    </div>
  );
}
