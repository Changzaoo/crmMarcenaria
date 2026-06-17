import { useThumb } from "./furnitureThumbnails";
import type { FurnitureCategory } from "./types";

/* Mostra a "foto" 3D do móvel (gerada pelo ThumbnailFactory). Enquanto a imagem
   não foi capturada, exibe um placeholder pulsante. */
export default function FurniturePreview({
  id,
}: {
  category?: FurnitureCategory;
  id: string;
}) {
  const url = useThumb(id);
  if (!url) return <div className="h-full w-full animate-pulse bg-champagne/5" />;
  return (
    <img
      src={url}
      alt=""
      draggable={false}
      className="h-full w-full object-contain transition duration-300 group-hover:scale-[1.06]"
    />
  );
}
