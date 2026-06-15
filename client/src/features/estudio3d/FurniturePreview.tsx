import type { FurnitureCategory } from "./types";

/* Silhueta em linha (SVG) por categoria — dá ao catálogo um ar de
   desenho técnico premium, sem imagens pesadas. */
export default function FurniturePreview({
  category,
  id,
}: {
  category: FurnitureCategory;
  id: string;
}) {
  return (
    <svg viewBox="0 0 64 48" className="h-16 w-full" fill="none" stroke="#D8B978" strokeWidth="1.4" strokeLinejoin="round">
      <rect x="2" y="2" width="60" height="44" rx="2" stroke="#3a2f22" />
      <g opacity="0.9">{shape(category, id)}</g>
    </svg>
  );
}

function shape(cat: FurnitureCategory, id: string) {
  switch (cat) {
    case "balcao":
    case "checkout":
      return (
        <>
          <rect x="12" y="22" width="40" height="18" />
          <rect x="10" y="18" width="44" height="4" fill="#D8B978" opacity="0.25" />
          <line x1="18" y1="24" x2="18" y2="38" /><line x1="26" y1="24" x2="26" y2="38" />
          <line x1="34" y1="24" x2="34" y2="38" /><line x1="42" y1="24" x2="42" y2="38" />
        </>
      );
    case "prateleira":
      return (
        <>
          <rect x="10" y="22" width="44" height="4" fill="#D8B978" opacity="0.25" />
          <line x1="16" y1="26" x2="16" y2="30" /><line x1="48" y1="26" x2="48" y2="30" />
        </>
      );
    case "estante":
      return (
        <>
          <rect x="14" y="8" width="36" height="34" />
          <line x1="14" y1="18" x2="50" y2="18" /><line x1="14" y1="27" x2="50" y2="27" /><line x1="14" y1="35" x2="50" y2="35" />
        </>
      );
    case "gondola":
      return (
        <>
          <line x1="32" y1="10" x2="32" y2="40" />
          <line x1="16" y1="18" x2="48" y2="18" /><line x1="16" y1="28" x2="48" y2="28" /><line x1="16" y1="38" x2="48" y2="38" />
        </>
      );
    case "mesa":
      return (
        <>
          <ellipse cx="32" cy="18" rx="20" ry="5" />
          <line x1="32" y1="22" x2="32" y2="38" /><line x1="24" y1="40" x2="40" y2="40" />
        </>
      );
    case "armario":
      return id === "planejado-l" ? (
        <>
          <path d="M14 12 H40 V28 H50 V40 H14 Z" />
          <line x1="27" y1="12" x2="27" y2="28" />
        </>
      ) : (
        <>
          <rect x="16" y="10" width="32" height="32" />
          <line x1="32" y1="10" x2="32" y2="42" />
          <circle cx="29" cy="26" r="1.2" fill="#D8B978" /><circle cx="35" cy="26" r="1.2" fill="#D8B978" />
        </>
      );
    case "painel":
      return id === "painel-tv" ? (
        <>
          <rect x="12" y="8" width="40" height="34" />
          <rect x="22" y="16" width="20" height="14" fill="#0a0a0c" stroke="#0a0a0c" />
        </>
      ) : (
        <>
          <rect x="12" y="8" width="40" height="34" />
          {[18, 24, 30, 36, 42].map((x) => <line key={x} x1={x} y1="10" x2={x} y2="40" />)}
        </>
      );
    case "nicho":
      return (
        <>
          {[14, 30].map((y) => [14, 30, 40].map((x) => <rect key={`${x}-${y}`} x={x} y={y} width="10" height="10" />))}
        </>
      );
    case "ilha":
      return (
        <>
          <rect x="10" y="20" width="44" height="18" />
          <rect x="8" y="16" width="48" height="4" fill="#D8B978" opacity="0.25" />
        </>
      );
    case "bancada":
      return (
        <>
          <rect x="10" y="18" width="44" height="4" fill="#D8B978" opacity="0.25" />
          <rect x="12" y="22" width="40" height="18" />
          {id === "bancada-cuba" && <rect x="34" y="25" width="12" height="8" fill="#15171a" stroke="#15171a" />}
        </>
      );
    case "vitrine":
      return (
        <>
          <rect x="18" y="22" width="28" height="18" />
          <rect x="16" y="8" width="32" height="16" opacity="0.5" />
        </>
      );
    case "closet":
      return (
        <>
          <rect x="12" y="8" width="40" height="34" />
          <line x1="25" y1="8" x2="25" y2="42" /><line x1="39" y1="8" x2="39" y2="42" />
          <line x1="27" y1="16" x2="37" y2="16" />
        </>
      );
    case "gaveteiro":
      return (
        <>
          <rect x="20" y="14" width="24" height="28" />
          <line x1="20" y1="23" x2="44" y2="23" /><line x1="20" y1="32" x2="44" y2="32" />
        </>
      );
    case "aereo":
      return (
        <>
          <rect x="14" y="14" width="36" height="16" />
          <line x1="32" y1="14" x2="32" y2="30" />
        </>
      );
    default:
      return <rect x="16" y="14" width="32" height="26" />;
  }
}
