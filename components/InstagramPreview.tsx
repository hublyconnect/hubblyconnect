"use client";

import { Heart, MessageCircle, Send, Bookmark, MoreHorizontal } from "lucide-react";

interface InstagramPreviewProps {
  username?: string;
  profileImage?: string;
  postImage?: string | null;
  caption?: string;
}

export function InstagramPreview({
  username = "seu_usuario",
  profileImage,
  postImage,
  caption,
}: InstagramPreviewProps) {
  return (
    <div className="relative flex flex-col w-full max-w-[320px] mx-auto rounded-[3rem] border-[14px] border-[#0a0a0a] bg-[#121212] overflow-hidden shadow-[0_0_80px_-20px_rgba(0,0,0,0.8)] min-h-[560px]">
      {/* Dynamic Island */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 h-[28px] w-[100px] bg-black rounded-b-2xl z-30" />
      {/* TELA DO APP */}
      <div className="flex-1 bg-white w-full min-h-0 pt-10 relative z-10 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        {/* HEADER */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-yellow-400 via-red-500 to-purple-600 p-[2px]">
              <div className="w-full h-full rounded-full bg-white p-[1px]">
                {profileImage ? (
                  <img src={profileImage} alt={username} className="w-full h-full object-cover rounded-full" />
                ) : (
                  <div className="w-full h-full bg-gray-200 rounded-full" />
                )}
              </div>
            </div>
            <span className="text-sm font-semibold text-gray-900">{username}</span>
          </div>
          <MoreHorizontal className="w-5 h-5 text-gray-900 shrink-0" />
        </div>
        {/* IMAGEM DO POST */}
        <div className="w-full aspect-square bg-gray-50 flex items-center justify-center overflow-hidden border-y border-gray-100">
          {postImage ? (
            <img src={postImage} alt="Post preview" className="w-full h-full object-cover" />
          ) : (
            <div className="text-gray-400 text-sm flex flex-col items-center gap-2">
              <span>Prévia da Imagem</span>
            </div>
          )}
        </div>
        {/* AÇÕES */}
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-4">
            <Heart className="w-6 h-6 text-gray-900" />
            <MessageCircle className="w-6 h-6 text-gray-900 -rotate-90" />
            <Send className="w-6 h-6 text-gray-900" />
          </div>
          <Bookmark className="w-6 h-6 text-gray-900" />
        </div>
        {/* LEGENDA */}
        <div className="px-4 pb-6">
          <div className="text-sm font-semibold mb-1">1.234 curtidas</div>
          <div className="text-sm text-gray-900 leading-snug">
            <span className="font-semibold mr-1">{username}</span>
            {caption || "Sua legenda aparecerá aqui..."}
          </div>
          <div className="text-[10px] text-gray-400 mt-2 uppercase">HÁ 2 HORAS</div>
        </div>
      </div>
      {/* BARRA INFERIOR */}
      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-[120px] h-[5px] bg-gray-800 rounded-full z-30" />
    </div>
  );
}
