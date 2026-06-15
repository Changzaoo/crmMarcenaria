import { RENDER_PRESET as P } from "./renderPreset";

/* Ambiente de renderização ÚNICO (fundo + fog + luzes + sombra) usado pelo
   site e pelo CRM. Garante iluminação e atmosfera idênticas nos dois.

   `maxDim`  = maior dimensão do ambiente em METROS (largura ou comprimento),
               usada para escalar o fog de forma proporcional.
   `mobile`  = desliga sombras pesadas no celular (mantendo as luzes iguais). */
export default function SceneEnvironment({
  maxDim,
  mobile = false,
}: {
  maxDim: number;
  mobile?: boolean;
}) {
  const dim = Math.max(1, maxDim || 1);
  const ms = mobile ? P.shadow.mapSizeMobile : P.shadow.mapSize;

  return (
    <>
      <color attach="background" args={[P.background]} />
      <fog attach="fog" args={[P.background, dim * P.fog.near, dim * P.fog.far]} />
      <ambientLight intensity={P.ambient.intensity} color={P.ambient.color} />
      <hemisphereLight args={[P.hemisphere.sky, P.hemisphere.ground, P.hemisphere.intensity]} />
      <directionalLight
        position={P.key.position}
        intensity={P.key.intensity}
        color={P.key.color}
        castShadow={!mobile}
        shadow-mapSize-width={ms}
        shadow-mapSize-height={ms}
        shadow-camera-left={-P.shadow.cam}
        shadow-camera-right={P.shadow.cam}
        shadow-camera-top={P.shadow.cam}
        shadow-camera-bottom={-P.shadow.cam}
        shadow-bias={P.shadow.bias}
      />
    </>
  );
}
