"use client";

import { Heart, MessageCircle, Send, MoreHorizontal, Music } from "lucide-react";

interface InstagramReelsPreviewProps {
  username?: string;
  profileImage?: string;
  mediaUrl?: string | null;
  caption?: string;
}

export function InstagramReelsPreview({
  username = "seu_usuario",
  profileImage,
  mediaUrl,
  caption,
}: InstagramReelsPreviewProps) {
  const isVideo = mediaUrl?.match(/\.(mp4|mov|webm)$/i);

  return (
    <div className="relative flex flex-col w-full max-w-[280px] mx-auto rounded-[3rem] border-[14px] border-[#0a0a0a] bg-[#121212] overflow-hidden shadow-[0_0_80px_-20px_rgba(0,0,0,0.8)] aspect-[9/16] min-h-[500px]">
      {/* Dynamic Island */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 h-[28px] w-[100px] bg-black rounded-b-2xl z-30" />
      {/* CONTEÚDO DO REELS (Tela Cheia) */}
      <div className="flex-1 bg-gray-900 w-full min-h-0 relative z-10">
        {mediaUrl ? (
          isVideo ? (
            <video
              src={mediaUrl}
              className="w-full h-full object-cover"
              autoPlay
              muted
              loop
              playsInline
            />
          ) : (
            <img src={mediaUrl} alt="Reels preview" className="w-full h-full object-cover" />
          )
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-500 flex-col gap-2">
            <Music className="w-10 h-10 animate-pulse" />
            <span>Prévia do Reels</span>
          </div>
        )}
        {/* OVERLAY DE TEXTO E AÇÕES */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/80 pointer-events-none" />
        {/* SIDEBAR DE AÇÕES (Direita) */}
        <div className="absolute bottom-20 right-4 flex flex-col items-center gap-6 z-20">
          <div className="flex flex-col items-center gap-1">
            <Heart className="w-7 h-7 text-white" />
            <span className="text-white text-xs font-medium">Likes</span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <MessageCircle className="w-7 h-7 text-white -rotate-90" />
            <span className="text-white text-xs font-medium">Comentários</span>
          </div>
          <Send className="w-7 h-7 text-white" />
          <MoreHorizontal className="w-7 h-7 text-white" />
          <div className="w-8 h-8 rounded-lg border-2 border-white overflow-hidden mt-4">
            {profileImage ? (
              <img src={profileImage} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="bg-gray-500 w-full h-full" />
            )}
          </div>
        </div>
        {/* INFO DO USUÁRIO E LEGENDA (Inferior Esquerdo) */}
        <div className="absolute bottom-6 left-4 right-16 z-20 text-white text-left">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-yellow-400 via-red-500 to-purple-600 p-[1px]">
              <div className="w-full h-full rounded-full bg-black p-[1px] overflow-hidden">
                {profileImage ? (
                  <img src={profileImage} alt="" className="w-full h-full object-cover rounded-full" />
                ) : (
                  <div className="w-full h-full bg-gray-700" />
                )}
              </div>
            </div>
            <span className="font-semibold text-sm shadow-sm">{username}</span>
            <span className="text-xs bg-white/20 px-2 py-0.5 rounded-md backdrop-blur-sm font-medium">Seguir</span>
          </div>
          <div className="text-sm leading-snug line-clamp-3 opacity-90">
            {caption || "Sua legenda do Reels aparecerá aqui..."}
          </div>
          <div className="flex items-center gap-2 mt-3 text-xs opacity-80">
            <Music className="w-3 h-3" />
            <div className="overflow-hidden w-32 relative">
              <span className="whitespace-nowrap">Áudio Original - {username}</span>
            </div>
          </div>
        </div>
      </div>
      {/* BARRA INFERIOR */}
      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-[120px] h-[5px] bg-white/50 rounded-full z-30" />
    </div>
  );
}
