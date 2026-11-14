/**
 * Lightweight, no-WebGL fallback of the Conversation Sculpture: layered CSS rings around a glowing core.
 * Used when WebGL is unavailable or fails, and as the first paint before the 3D scene is ready.
 */
export function StaticSculpture({ className = "" }: { className?: string }) {
  return (
    <div aria-hidden className={`pointer-events-none relative aspect-square ${className}`}>
      <div className="absolute inset-[6%] rounded-full bg-[radial-gradient(circle,rgb(186_172_247/0.28),transparent_62%)] blur-2xl" />
      <div className="absolute inset-[4%] rounded-full border border-champagne/60 [transform:rotateX(68deg)_rotateZ(-12deg)] shadow-[0_0_30px_rgb(233_214_184/0.25)]" />
      <div className="absolute inset-[1%] rounded-full border border-champagne/25 [transform:rotateX(64deg)_rotateZ(-4deg)]" />
      <div className="absolute inset-[16%] rounded-full border-[3px] border-lavender/70 [transform:rotateX(30deg)_rotateY(35deg)] shadow-[0_0_40px_rgb(186_172_247/0.35)]" />
      <div className="absolute inset-[13%] rounded-full border-2 border-sage/70 [transform:rotateX(72deg)_rotateZ(18deg)]" />
      <div className="absolute inset-[38%] rounded-full bg-[radial-gradient(circle_at_40%_35%,#fff,rgb(233_214_184/0.9)_30%,rgb(186_172_247/0.35)_65%,transparent_72%)] shadow-[0_0_80px_rgb(255_246_232/0.55)]" />
    </div>
  );
}
