import { Suspense, useRef, type ReactNode } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { ContactShadows, Edges } from "@react-three/drei";
import type { Group } from "three";

// Paleta consistente com o restante do estúdio 3D.
const WOOD = "#a9794b";
const WOOD_DARK = "#5f4327";
const BRASS = "#c8a24a";
const STEEL = "#b7bcc4";
const INOX = "#cfd4da";
const STONE = "#e7e3da";
const DARK = "#15120e";

// Gira lentamente o conteúdo para dar volume ao modelo.
function Spin({ children, speed = 0.5 }: { children: ReactNode; speed?: number }) {
  const ref = useRef<Group>(null);
  useFrame((_, dt) => {
    if (ref.current) ref.current.rotation.y += dt * speed;
  });
  return <group ref={ref}>{children}</group>;
}

// ---------------- Modelos por categoria ----------------

function ChapaModel() {
  // Duas chapas empilhadas, levemente deslocadas, com fita de borda escura.
  return (
    <group rotation={[0, 0, 0]} position={[0, -0.15, 0]}>
      {[0, 0.16].map((y, i) => (
        <group key={i} position={[i * 0.12, y, i * -0.1]}>
          <mesh castShadow receiveShadow>
            <boxGeometry args={[1.7, 0.12, 1.0]} />
            <meshStandardMaterial color={i ? "#bd8a55" : WOOD} roughness={0.62} metalness={0.04} />
          </mesh>
          <mesh position={[0, 0, 0.505]}>
            <boxGeometry args={[1.7, 0.12, 0.02]} />
            <meshStandardMaterial color={WOOD_DARK} roughness={0.5} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function FitaModel() {
  // Rolo de fita de borda + ponta solta saindo do rolo.
  return (
    <group rotation={[Math.PI / 2.4, 0, 0]}>
      <mesh castShadow>
        <torusGeometry args={[0.55, 0.26, 24, 48]} />
        <meshStandardMaterial color={WOOD} roughness={0.55} />
      </mesh>
      <mesh>
        <cylinderGeometry args={[0.3, 0.3, 0.5, 32]} />
        <meshStandardMaterial color={WOOD_DARK} roughness={0.7} />
      </mesh>
      <mesh position={[0.78, -0.5, 0]} rotation={[0, 0, 0.5]} castShadow>
        <boxGeometry args={[0.5, 0.02, 0.5]} />
        <meshStandardMaterial color="#bd8a55" roughness={0.55} side={2} />
      </mesh>
    </group>
  );
}

function FerragemModel() {
  // Dobradiça aberta: duas abas metálicas + pino central (knuckle).
  return (
    <group rotation={[0.2, 0, 0]}>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * 0.42, 0, 0]} rotation={[0, s < 0 ? 0.5 : -0.5, 0]} castShadow>
          <boxGeometry args={[0.8, 0.7, 0.05]} />
          <meshStandardMaterial color={STEEL} roughness={0.3} metalness={0.85} />
        </mesh>
      ))}
      <mesh rotation={[Math.PI / 2, 0, 0]} castShadow>
        <cylinderGeometry args={[0.1, 0.1, 0.85, 20]} />
        <meshStandardMaterial color={BRASS} roughness={0.25} metalness={0.9} />
      </mesh>
      {[-0.28, 0, 0.28].map((y) =>
        [-1, 1].map((s) => (
          <mesh key={`${s}-${y}`} position={[s * 0.55, y, 0.03]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.05, 0.05, 0.04, 12]} />
            <meshStandardMaterial color={DARK} roughness={0.5} metalness={0.6} />
          </mesh>
        ))
      )}
    </group>
  );
}

function IluminacaoModel() {
  // Lâmpada: bulbo emissivo + rosca metálica.
  return (
    <group position={[0, 0.05, 0]}>
      <mesh castShadow>
        <sphereGeometry args={[0.5, 32, 32]} />
        <meshStandardMaterial color="#fff2cf" emissive="#ffcf6b" emissiveIntensity={1.1} roughness={0.15} />
      </mesh>
      <pointLight position={[0, 0, 0]} intensity={0.8} distance={3} color="#ffd9a0" />
      <mesh position={[0, -0.55, 0]}>
        <cylinderGeometry args={[0.22, 0.26, 0.18, 24]} />
        <meshStandardMaterial color={STEEL} roughness={0.3} metalness={0.85} />
      </mesh>
      {[-0.62, -0.7, -0.78].map((y) => (
        <mesh key={y} position={[0, y, 0]}>
          <torusGeometry args={[0.2, 0.022, 8, 24]} />
          <meshStandardMaterial color={BRASS} roughness={0.3} metalness={0.85} />
        </mesh>
      ))}
    </group>
  );
}

function PedraModel() {
  // Bloco de pedra/quartzo polido com tampo levemente saliente.
  return (
    <group position={[0, -0.1, 0]}>
      <mesh castShadow receiveShadow>
        <boxGeometry args={[1.4, 0.55, 0.95]} />
        <meshStandardMaterial color={STONE} roughness={0.18} metalness={0.06} />
      </mesh>
      <mesh position={[0, 0.32, 0]} castShadow>
        <boxGeometry args={[1.5, 0.1, 1.05]} />
        <meshStandardMaterial color="#f4f1ea" roughness={0.12} metalness={0.08} />
      </mesh>
      <mesh position={[0.3, 0, 0.48]}>
        <boxGeometry args={[0.5, 0.4, 0.005]} />
        <meshStandardMaterial color="#cfcabd" roughness={0.2} />
      </mesh>
    </group>
  );
}

function CubaModel() {
  // Cuba inox redonda embutida: corpo + cavidade escura + torneira.
  return (
    <group position={[0, -0.1, 0]}>
      <mesh position={[0, 0.32, 0]} castShadow>
        <boxGeometry args={[1.5, 0.12, 1.05]} />
        <meshStandardMaterial color={STONE} roughness={0.2} metalness={0.05} />
      </mesh>
      <mesh position={[0, -0.05, 0]} castShadow>
        <cylinderGeometry args={[0.5, 0.42, 0.6, 32]} />
        <meshStandardMaterial color={INOX} roughness={0.25} metalness={0.9} />
      </mesh>
      <mesh position={[0, 0.27, 0]}>
        <cylinderGeometry args={[0.46, 0.46, 0.04, 32]} />
        <meshStandardMaterial color="#2a2723" roughness={0.6} metalness={0.4} />
      </mesh>
      <group position={[0, 0.36, -0.42]}>
        <mesh position={[0, 0.18, 0]}>
          <cylinderGeometry args={[0.05, 0.05, 0.4, 16]} />
          <meshStandardMaterial color={INOX} roughness={0.2} metalness={0.95} />
        </mesh>
        <mesh position={[0, 0.36, 0.12]} rotation={[Math.PI / 2.4, 0, 0]}>
          <cylinderGeometry args={[0.045, 0.045, 0.3, 16]} />
          <meshStandardMaterial color={INOX} roughness={0.2} metalness={0.95} />
        </mesh>
      </group>
    </group>
  );
}

function InsumoModel() {
  // Lata/balde de insumo com tampa e alça.
  return (
    <group position={[0, -0.15, 0]}>
      <mesh castShadow receiveShadow>
        <cylinderGeometry args={[0.5, 0.58, 0.9, 32]} />
        <meshStandardMaterial color="#d9d2c4" roughness={0.4} metalness={0.2} />
      </mesh>
      <mesh position={[0, 0.52, 0]} castShadow>
        <cylinderGeometry args={[0.52, 0.52, 0.1, 32]} />
        <meshStandardMaterial color={WOOD_DARK} roughness={0.5} />
      </mesh>
      <mesh position={[0, 0, 0]}>
        <cylinderGeometry args={[0.505, 0.505, 0.4, 32]} />
        <meshStandardMaterial color={BRASS} roughness={0.4} metalness={0.4} />
      </mesh>
      <mesh position={[0, 0.7, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.4, 0.025, 10, 24, Math.PI]} />
        <meshStandardMaterial color={STEEL} roughness={0.3} metalness={0.85} />
      </mesh>
    </group>
  );
}

function MaoDeObraModel() {
  // Martelo: cabo de madeira + cabeça metálica.
  return (
    <group rotation={[0, 0, -0.4]} position={[0, -0.05, 0]}>
      <mesh position={[0, -0.35, 0]} castShadow>
        <cylinderGeometry args={[0.08, 0.09, 1.1, 20]} />
        <meshStandardMaterial color={WOOD} roughness={0.6} />
      </mesh>
      <mesh position={[0, 0.32, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.16, 0.16, 0.7, 24]} />
        <meshStandardMaterial color={STEEL} roughness={0.3} metalness={0.85} />
      </mesh>
      <mesh position={[0.45, 0.32, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <coneGeometry args={[0.16, 0.3, 24]} />
        <meshStandardMaterial color={STEEL} roughness={0.3} metalness={0.85} />
      </mesh>
    </group>
  );
}

function OutroModel() {
  // Caixa genérica de madeira com contorno destacado.
  return (
    <mesh castShadow receiveShadow position={[0, -0.05, 0]}>
      <boxGeometry args={[1.1, 1.1, 1.1]} />
      <meshStandardMaterial color={WOOD} roughness={0.6} />
      <Edges color={BRASS} threshold={15} />
    </mesh>
  );
}

// ---------------- Modelos específicos por item ----------------

function CorredicaModel() {
  // Par de trilhos de gaveta (corrediça telescópica).
  return (
    <group rotation={[0.12, 0, 0]}>
      {[-0.32, 0.32].map((z) => (
        <group key={z} position={[0, 0, z]}>
          <mesh castShadow>
            <boxGeometry args={[1.7, 0.16, 0.05]} />
            <meshStandardMaterial color={STEEL} roughness={0.3} metalness={0.85} />
          </mesh>
          <mesh position={[0.25, 0, 0.035]} castShadow>
            <boxGeometry args={[1.25, 0.1, 0.04]} />
            <meshStandardMaterial color="#e7eaef" roughness={0.25} metalness={0.9} />
          </mesh>
          {[-0.6, 0.6].map((x) => (
            <mesh key={x} position={[x, 0, 0.05]} rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.05, 0.05, 0.05, 16]} />
              <meshStandardMaterial color={DARK} roughness={0.4} metalness={0.6} />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  );
}

function PuxadorModel() {
  // Puxador tipo barra com dois pés.
  return (
    <group position={[0, 0.1, 0]}>
      <mesh rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.07, 0.07, 1.7, 24]} />
        <meshStandardMaterial color={BRASS} roughness={0.25} metalness={0.95} />
      </mesh>
      {[-0.65, 0.65].map((x) => (
        <group key={x}>
          <mesh position={[x, -0.22, 0]} castShadow>
            <cylinderGeometry args={[0.05, 0.05, 0.36, 16]} />
            <meshStandardMaterial color={BRASS} roughness={0.25} metalness={0.95} />
          </mesh>
          <mesh position={[x, -0.42, 0]}>
            <cylinderGeometry args={[0.11, 0.11, 0.03, 20]} />
            <meshStandardMaterial color={STEEL} roughness={0.3} metalness={0.85} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function PeModel() {
  // Pé nivelador: base + haste rosqueada + sapata.
  return (
    <group position={[0, -0.35, 0]}>
      <mesh position={[0, 0.06, 0]} castShadow>
        <cylinderGeometry args={[0.42, 0.5, 0.12, 28]} />
        <meshStandardMaterial color={DARK} roughness={0.7} metalness={0.2} />
      </mesh>
      <mesh position={[0, 0.6, 0]} castShadow>
        <cylinderGeometry args={[0.12, 0.12, 0.95, 18]} />
        <meshStandardMaterial color={STEEL} roughness={0.4} metalness={0.85} />
      </mesh>
      {Array.from({ length: 9 }).map((_, i) => (
        <mesh key={i} position={[0, 0.2 + i * 0.08, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.13, 0.012, 6, 18]} />
          <meshStandardMaterial color="#9aa0a8" roughness={0.4} metalness={0.85} />
        </mesh>
      ))}
      <mesh position={[0, 1.1, 0]}>
        <boxGeometry args={[0.42, 0.08, 0.42]} />
        <meshStandardMaterial color={STEEL} roughness={0.4} metalness={0.85} />
      </mesh>
    </group>
  );
}

function SuporteModel() {
  // Mão-francesa / suporte de prateleira em "L".
  return (
    <group position={[-0.15, -0.25, 0]} rotation={[0, 0.3, 0]}>
      <mesh position={[0, 0.5, 0]} castShadow>
        <boxGeometry args={[0.12, 1.1, 0.5]} />
        <meshStandardMaterial color={STEEL} roughness={0.35} metalness={0.8} />
      </mesh>
      <mesh position={[0.5, 0.0, 0]} castShadow>
        <boxGeometry args={[1.1, 0.12, 0.5]} />
        <meshStandardMaterial color={STEEL} roughness={0.35} metalness={0.8} />
      </mesh>
      <mesh position={[0.42, 0.46, 0]} rotation={[0, 0, -Math.PI / 4]}>
        <boxGeometry args={[1.05, 0.06, 0.06]} />
        <meshStandardMaterial color="#9aa0a8" roughness={0.4} metalness={0.8} />
      </mesh>
    </group>
  );
}

function ParafusoModel() {
  // Parafuso: cabeça sextavada + haste rosqueada + ponta.
  return (
    <group rotation={[0, 0, Math.PI / 9]}>
      <mesh position={[0, 0.58, 0]} castShadow>
        <cylinderGeometry args={[0.27, 0.27, 0.16, 6]} />
        <meshStandardMaterial color={STEEL} roughness={0.3} metalness={0.9} />
      </mesh>
      <mesh position={[0, 0.67, 0]}>
        <boxGeometry args={[0.38, 0.03, 0.08]} />
        <meshStandardMaterial color={DARK} />
      </mesh>
      <mesh castShadow>
        <cylinderGeometry args={[0.12, 0.12, 0.95, 18]} />
        <meshStandardMaterial color="#9aa0a8" roughness={0.35} metalness={0.9} />
      </mesh>
      {Array.from({ length: 9 }).map((_, i) => (
        <mesh key={i} position={[0, 0.4 - i * 0.1, 0]} rotation={[Math.PI / 2, 0.25, 0]}>
          <torusGeometry args={[0.15, 0.02, 6, 16]} />
          <meshStandardMaterial color="#b7bcc4" roughness={0.35} metalness={0.9} />
        </mesh>
      ))}
      <mesh position={[0, -0.62, 0]} rotation={[Math.PI, 0, 0]} castShadow>
        <coneGeometry args={[0.12, 0.22, 18]} />
        <meshStandardMaterial color="#9aa0a8" roughness={0.35} metalness={0.9} />
      </mesh>
    </group>
  );
}

function CavilhaModel() {
  // Cavilha de madeira (pino estriado).
  return (
    <group rotation={[0, 0, Math.PI / 2.5]}>
      <mesh castShadow>
        <cylinderGeometry args={[0.16, 0.16, 1.4, 20]} />
        <meshStandardMaterial color="#c79a63" roughness={0.7} />
      </mesh>
      {[-0.7, 0.7].map((y) => (
        <mesh key={y} position={[0, y, 0]} rotation={[y > 0 ? 0 : Math.PI, 0, 0]}>
          <cylinderGeometry args={[0.1, 0.16, 0.14, 20]} />
          <meshStandardMaterial color="#b78a52" roughness={0.7} />
        </mesh>
      ))}
      {Array.from({ length: 6 }).map((_, i) => (
        <mesh key={i} position={[0, -0.5 + i * 0.2, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.165, 0.012, 6, 18]} />
          <meshStandardMaterial color="#9c7038" roughness={0.8} />
        </mesh>
      ))}
    </group>
  );
}

function ColaModel() {
  // Frasco de cola branca com bico laranja e rótulo.
  return (
    <group position={[0, -0.3, 0]}>
      <mesh position={[0, 0.45, 0]} castShadow>
        <cylinderGeometry args={[0.4, 0.45, 0.9, 28]} />
        <meshStandardMaterial color="#f0ece2" roughness={0.4} />
      </mesh>
      <mesh position={[0, 0.98, 0]} castShadow>
        <cylinderGeometry args={[0.18, 0.4, 0.2, 28]} />
        <meshStandardMaterial color="#f0ece2" roughness={0.4} />
      </mesh>
      <mesh position={[0, 1.18, 0]}>
        <cylinderGeometry args={[0.08, 0.14, 0.22, 18]} />
        <meshStandardMaterial color={WOOD_DARK} roughness={0.5} />
      </mesh>
      <mesh position={[0, 1.34, 0]}>
        <coneGeometry args={[0.06, 0.12, 16]} />
        <meshStandardMaterial color="#e6932b" roughness={0.5} />
      </mesh>
      <mesh position={[0, 0.45, 0.452]}>
        <boxGeometry args={[0.5, 0.5, 0.005]} />
        <meshStandardMaterial color="#3a6ea5" roughness={0.5} />
      </mesh>
    </group>
  );
}

function FitaLedModel() {
  // Fita de LED: tira flexível com pontos de luz.
  const n = 14;
  return (
    <group rotation={[Math.PI / 2.6, 0, 0]}>
      <mesh castShadow>
        <boxGeometry args={[1.85, 0.05, 0.18]} />
        <meshStandardMaterial color="#d9d4c8" roughness={0.5} />
      </mesh>
      {Array.from({ length: n }).map((_, i) => {
        const x = -0.88 + (i / (n - 1)) * 1.76;
        return (
          <mesh key={i} position={[x, 0.04, 0]}>
            <boxGeometry args={[0.06, 0.03, 0.07]} />
            <meshStandardMaterial color="#fff6d6" emissive="#ffd76a" emissiveIntensity={0.9} />
          </mesh>
        );
      })}
      <pointLight position={[0, 0.5, 0]} intensity={0.5} distance={3} color="#ffe7a8" />
    </group>
  );
}

function PerfilModel() {
  // Perfil de alumínio em "U" com difusor leitoso.
  return (
    <group position={[0, 0, 0]}>
      <mesh castShadow>
        <boxGeometry args={[1.8, 0.06, 0.5]} />
        <meshStandardMaterial color={STEEL} roughness={0.35} metalness={0.85} />
      </mesh>
      {[-0.22, 0.22].map((z) => (
        <mesh key={z} position={[0, 0.1, z]} castShadow>
          <boxGeometry args={[1.8, 0.18, 0.06]} />
          <meshStandardMaterial color="#9aa0a8" roughness={0.35} metalness={0.85} />
        </mesh>
      ))}
      <mesh position={[0, 0.16, 0]}>
        <boxGeometry args={[1.8, 0.03, 0.4]} />
        <meshStandardMaterial color="#fdf6e3" emissive="#ffdf8a" emissiveIntensity={0.5} transparent opacity={0.75} />
      </mesh>
      <pointLight position={[0, 0.5, 0]} intensity={0.35} distance={3} color="#ffe7a8" />
    </group>
  );
}

function FonteModel() {
  // Fonte/driver de LED: caixa metálica com aletas, terminais e fios.
  return (
    <group position={[0, -0.1, 0]}>
      <mesh castShadow>
        <boxGeometry args={[1.6, 0.5, 0.7]} />
        <meshStandardMaterial color="#c2c7cd" roughness={0.4} metalness={0.7} />
      </mesh>
      {Array.from({ length: 7 }).map((_, i) => (
        <mesh key={i} position={[-0.7 + i * 0.23, 0, 0]}>
          <boxGeometry args={[0.04, 0.5, 0.72]} />
          <meshStandardMaterial color="#9aa0a8" roughness={0.4} metalness={0.8} />
        </mesh>
      ))}
      <mesh position={[0.85, 0, 0]}>
        <boxGeometry args={[0.12, 0.4, 0.6]} />
        <meshStandardMaterial color={DARK} roughness={0.6} />
      </mesh>
      {["#c0392b", "#111", "#2c6fb5"].map((c, idx) => (
        <mesh key={c} position={[-0.95, -0.12 + idx * 0.12, 0.12]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.03, 0.03, 0.45, 10]} />
          <meshStandardMaterial color={c} roughness={0.6} />
        </mesh>
      ))}
    </group>
  );
}

function SensorModel() {
  // Sensor de presença: base + domo translúcido + lente.
  return (
    <group position={[0, -0.15, 0]}>
      <mesh position={[0, 0.1, 0]} castShadow>
        <cylinderGeometry args={[0.55, 0.6, 0.2, 28]} />
        <meshStandardMaterial color="#efeae0" roughness={0.5} />
      </mesh>
      <mesh position={[0, 0.22, 0]} castShadow>
        <sphereGeometry args={[0.45, 24, 18, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color="#3a3f46" roughness={0.3} metalness={0.2} transparent opacity={0.85} />
      </mesh>
      <mesh position={[0, 0.3, 0]}>
        <sphereGeometry args={[0.22, 16, 16]} />
        <meshStandardMaterial color="#11151b" roughness={0.2} />
      </mesh>
    </group>
  );
}

function CubaResinaModel() {
  // Cuba de resina branca embutida + torneira.
  return (
    <group position={[0, -0.1, 0]}>
      <mesh position={[0, 0.32, 0]} castShadow>
        <boxGeometry args={[1.5, 0.12, 1.05]} />
        <meshStandardMaterial color={STONE} roughness={0.3} />
      </mesh>
      <mesh position={[0, 0.0, 0]} castShadow>
        <cylinderGeometry args={[0.52, 0.34, 0.55, 32]} />
        <meshStandardMaterial color="#f4f1ea" roughness={0.3} />
      </mesh>
      <mesh position={[0, 0.27, 0]}>
        <cylinderGeometry args={[0.46, 0.46, 0.04, 32]} />
        <meshStandardMaterial color="#cfc9bd" roughness={0.5} />
      </mesh>
      <group position={[0, 0.36, -0.42]}>
        <mesh position={[0, 0.18, 0]}>
          <cylinderGeometry args={[0.05, 0.05, 0.4, 16]} />
          <meshStandardMaterial color={INOX} roughness={0.2} metalness={0.95} />
        </mesh>
        <mesh position={[0, 0.36, 0.12]} rotation={[Math.PI / 2.4, 0, 0]}>
          <cylinderGeometry args={[0.045, 0.045, 0.3, 16]} />
          <meshStandardMaterial color={INOX} roughness={0.2} metalness={0.95} />
        </mesh>
      </group>
    </group>
  );
}

const MODELOS: Record<string, () => JSX.Element> = {
  chapa: ChapaModel,
  fita: FitaModel,
  ferragem: FerragemModel,
  iluminacao: IluminacaoModel,
  pedra: PedraModel,
  cuba: CubaModel,
  insumo: InsumoModel,
  maodeobra: MaoDeObraModel,
  outro: OutroModel,
  // específicos por item
  dobradica: FerragemModel,
  corredica: CorredicaModel,
  puxador: PuxadorModel,
  pe: PeModel,
  suporte: SuporteModel,
  parafuso: ParafusoModel,
  cavilha: CavilhaModel,
  cola: ColaModel,
  fitaled: FitaLedModel,
  perfil: PerfilModel,
  fonte: FonteModel,
  sensor: SensorModel,
  cubaresina: CubaResinaModel,
};

// Resolve o modelo 3D mais específico para UM item do catálogo, a partir do nome
// (e da categoria como apoio). Retorna "" quando não há um modelo específico —
// nesse caso o chamador usa o modelo da categoria.
export function inferItemModel(nome = "", categoria = ""): string {
  const t = `${nome} ${categoria}`
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
  const has = (re: RegExp) => re.test(t);

  // Ferragens específicas
  if (has(/corredica|trilho telesc|deslizante/)) return "corredica";
  if (has(/dobradica/)) return "dobradica";
  if (has(/puxador/)) return "puxador";
  if (has(/parafuso|chipboard/)) return "parafuso";
  if (has(/cavilha/)) return "cavilha";
  if (has(/nivelador|sapata|pe regul|pe nivel/)) return "pe";
  if (has(/suporte|mao francesa|mao-francesa|invisivel/)) return "suporte";

  // Iluminação
  if (has(/fita led|fita de led/)) return "fitaled";
  if (has(/perfil/)) return "perfil";
  if (has(/fonte|driver/)) return "fonte";
  if (has(/sensor/)) return "sensor";
  if (has(/led|lampada|spot|luminaria|ilumin/)) return "iluminacao";

  // Insumos
  if (has(/cola|adesivo|pva|verniz|selante/)) return "cola";

  // Cubas
  if (has(/cuba.*resina|resina|lavato/)) return "cubaresina";
  if (has(/cuba|pia|tanque/)) return "cuba";

  // Pedra
  if (has(/quartzo|granito|marmore|pedra|silestone|porcelanato/)) return "pedra";

  // Chapa
  if (has(/mdf|mdp|compensad|chapa|lamina|madeira/)) return "chapa";

  // Fita de borda
  if (has(/fita de borda|borda|fita/)) return "fita";

  // Mão de obra
  if (has(/mao de obra|marceneiro|instalador|servico|montagem/)) return "maodeobra";

  return "";
}

function ModelByKey({ modelo }: { modelo?: string }) {
  const Comp = MODELOS[modelo || "outro"] || OutroModel;
  return <Comp />;
}

interface Props {
  modelo?: string;
  className?: string;
  spin?: boolean;
}

export default function CategoriaModel3D({ modelo, className, spin = true }: Props) {
  return (
    <div className={className}>
      <Canvas shadows dpr={[1, 1.8]} camera={{ position: [2.3, 1.7, 2.6], fov: 38 }} gl={{ antialias: true }}>
        <color attach="background" args={["#100e0b"]} />
        <ambientLight intensity={0.6} />
        <hemisphereLight args={["#fff4e0", "#1a1612", 0.5]} />
        <directionalLight
          position={[4, 6, 4]}
          intensity={1.1}
          castShadow
          shadow-mapSize={[1024, 1024]}
        />
        <pointLight position={[-3, 2, -2]} intensity={0.35} color="#ffd9a0" />
        <Suspense fallback={null}>
          {spin ? (
            <Spin>
              <ModelByKey modelo={modelo} />
            </Spin>
          ) : (
            <ModelByKey modelo={modelo} />
          )}
          <ContactShadows position={[0, -0.8, 0]} opacity={0.45} scale={6} blur={2.6} far={3} />
        </Suspense>
      </Canvas>
    </div>
  );
}
