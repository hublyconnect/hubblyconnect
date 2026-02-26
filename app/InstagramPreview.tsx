import { Heart, MessageCircle, Send, Bookmark, MoreHorizontal } from "lucide-react"; // Se não tiver lucide, use ícones SVG normais

interface InstagramPreviewProps {
  username?: string;
  profileImage?: string;
  postImage?: string | null; // URL da imagem selecionada (blob ou link)
  caption?: string;
}

export function InstagramPreview({ 
  username = "seu_usuario", 
  profileImage, 
  postImage, 
  caption 
}: InstagramPreviewProps) {
  return (
    <div className="flex justify-center items-center py-4">
      {/* --- CARCAÇA DO IPHONE --- */}
      <div className="relative mx-auto border-gray-900 bg-black border-[14px] rounded-[2.5rem] h-[600px] w-[300px] shadow-2xl flex flex-col overflow-hidden">
        
        {/* Dynamic Island / Notch */}
        <div className="h-[32px] w-full bg-black absolute top-0 left-0 z-20 flex justify-center">
             <div className="h-[18px] w-[80px] bg-black rounded-b-3xl absolute top-0"></div>
        </div>

        {/* --- TELA DO APP (Branca) --- */}
        <div className="flex-1 bg-white w-full h-full rounded-[2rem] overflow-y-auto no-scrollbar pt-8 relative z-10">
          
          {/* HEADER DO POST */}
          <div className="flex items-center justify-between px-3 py-2 border-b border-gray-50">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-yellow-400 via-red-500 to-purple-600 p-[2px]">
                <div className="w-full h-full rounded-full bg-white p-[2px] overflow-hidden">
                   {/* Fallback se não tiver imagem */}
                   {profileImage ? (
                     <img src={profileImage} alt={username} className="w-full h-full object-cover rounded-full" />
                   ) : (
                     <div className="w-full h-full bg-gray-200" />
                   )}
                </div>
              </div>
              <span className="text-xs font-semibold text-gray-900">{username}</span>
            </div>
            <MoreHorizontal className="w-4 h-4 text-gray-600" />
          </div>

          {/* ÁREA DA IMAGEM DO POST */}
          <div className="w-full aspect-square bg-gray-100 flex items-center justify-center overflow-hidden relative group">
            {postImage ? (
              <img src={postImage} alt="Post preview" className="w-full h-full object-cover" />
            ) : (
              <div className="text-gray-400 text-xs flex flex-col items-center gap-2">
                 <span>Prévia da Mídia</span>
              </div>
            )}
          </div>

          {/* BARRA DE AÇÕES */}
          <div className="flex items-center justify-between px-3 py-3">
            <div className="flex items-center gap-4">
              <Heart className="w-6 h-6 text-gray-800 hover:text-red-500 cursor-pointer" />
              <MessageCircle className="w-6 h-6 text-gray-800 -rotate-90" />
              <Send className="w-6 h-6 text-gray-800" />
            </div>
            <Bookmark className="w-6 h-6 text-gray-800" />
          </div>

          {/* LEGENDA */}
          <div className="px-3 pb-4">
            <div className="text-xs font-semibold mb-1">1.234 curtidas</div>
            <div className="text-xs text-gray-800 leading-snug">
              <span className="font-semibold mr-1">{username}</span>
              {caption || "Sua legenda aparecerá aqui..."}
            </div>
            <div className="text-[10px] text-gray-400 mt-1 uppercase">HÁ 2 HORAS</div>
          </div>

        </div>

        {/* BARRA INFERIOR (Home Indicator) */}
        <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1/3 h-1 bg-gray-600 rounded-full z-20"></div>
      </div>
    </div>
  );
}