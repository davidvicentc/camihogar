"use client";

import { AnimatePresence, motion } from "framer-motion";
import type { Category } from "@/lib/types";

/**
 * Render vectorial paramétrico del mueble: redibuja la pieza según la
 * categoría y la configuración elegida, y pinta tapizado/acabado en vivo.
 *
 * Arquitectura de animación:
 * - Posiciones y tamaños son atributos SVG estáticos por render.
 * - Los colores se animan con animate={{ fill }} (transición suave al
 *   cambiar tela/acabado, sin remontar el mueble).
 * - Los cambios de forma (configuración) remontan el grupo con un spring
 *   de asentamiento vía key + AnimatePresence.
 */

interface FurnitureRenderProps {
  category: Category;
  fabricHex?: string | null;
  finishHex?: string | null;
  configurationLabel?: string | null;
}

/* ── utilidades de color ──────────────────────────────────────── */

function clamp255(n: number): number {
  return Math.max(0, Math.min(255, Math.round(n)));
}

/** Mezcla el color hacia blanco (amt > 0) o negro (amt < 0). */
function shade(hex: string, amt: number): string {
  const h = hex.replace("#", "");
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  const num = parseInt(full, 16);
  if (Number.isNaN(num)) return hex;
  const target = amt > 0 ? 255 : 0;
  const t = Math.abs(amt);
  const r = clamp255(((num >> 16) & 255) * (1 - t) + target * t);
  const g = clamp255(((num >> 8) & 255) * (1 - t) + target * t);
  const b = clamp255((num & 255) * (1 - t) + target * t);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
}

const FABRIC_FALLBACK = "#C9B99F";
const FINISH_FALLBACK = "#4A2F1F";

const colorFade = { duration: 0.45, ease: "easeInOut" } as const;
const popSpring = { type: "spring", stiffness: 260, damping: 20 } as const;

/** Rect que solo anima su color de relleno. */
function Tinted(
  props: React.ComponentProps<typeof motion.rect> & { fill: string }
) {
  const { fill, ...rest } = props;
  return (
    <motion.rect initial={false} animate={{ fill }} transition={colorFade} {...rest} />
  );
}

function TintedPath(
  props: React.ComponentProps<typeof motion.path> & { fill: string }
) {
  const { fill, ...rest } = props;
  return (
    <motion.path initial={false} animate={{ fill }} transition={colorFade} {...rest} />
  );
}

/* ── interpretación de la configuración ───────────────────────── */

interface SofaLayout {
  seats: number;
  chaise: "none" | "right" | "left";
}

function sofaLayoutFrom(label?: string | null): SofaLayout {
  const l = (label ?? "").toLowerCase();
  if (l.includes("l-shape") || l.includes("modular")) return { seats: 3, chaise: "right" };
  if (l.includes("reversible")) return { seats: 3, chaise: "left" };
  const match = l.match(/(\d+)/);
  const seats = match ? Math.max(2, Math.min(4, Number(match[1]))) : 3;
  return { seats, chaise: "none" };
}

function bedScaleFrom(label?: string | null): number {
  const l = (label ?? "").toLowerCase();
  if (l.includes("king")) return 1.14;
  if (l.includes("queen")) return 1;
  if (l.includes("matrimonial")) return 0.9;
  if (l.includes("individual")) return 0.74;
  return 1;
}

function tableSeatsFrom(label?: string | null): number {
  const match = (label ?? "").match(/(\d+)/);
  const n = match ? Number(match[1]) : 6;
  return Math.max(4, Math.min(8, n));
}

function widthScaleFrom(label?: string | null): number {
  const match = (label ?? "").match(/(\d+)\s*cm/i);
  if (!match) return 1;
  return Math.max(0.8, Math.min(1.2, Number(match[1]) / 140));
}

/* ── escena común (pared, piso, glow, planta, lámpara) ────────── */

function Ambient({ children }: { children: React.ReactNode }) {
  return (
    <svg
      viewBox="0 0 800 560"
      role="img"
      aria-label="Render del mueble personalizado"
      className="h-full w-full"
      preserveAspectRatio="xMidYMid slice"
    >
      <defs>
        <radialGradient id="fr-glow" cx="50%" cy="42%" r="55%">
          <stop offset="0%" stopColor="#E8511A" stopOpacity="0.22" />
          <stop offset="60%" stopColor="#E8511A" stopOpacity="0.07" />
          <stop offset="100%" stopColor="#E8511A" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="fr-wall" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#F4EEE6" />
          <stop offset="100%" stopColor="#EDE4D8" />
        </linearGradient>
      </defs>

      <rect width="800" height="470" fill="url(#fr-wall)" />
      <rect y="470" width="800" height="90" fill="#E3D7C6" />
      <line x1="0" y1="470" x2="800" y2="470" stroke="#231510" strokeOpacity="0.08" strokeWidth="2" />

      {/* Iluminación cálida que respira */}
      <motion.circle
        cx="400"
        cy="250"
        r="300"
        fill="url(#fr-glow)"
        animate={{ opacity: [0.7, 1, 0.7] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Lámpara de arco */}
      <g opacity="0.9">
        <path
          d="M 690 470 L 690 210 Q 690 140 620 140 L 600 140"
          fill="none"
          stroke="#C9A876"
          strokeWidth="7"
          strokeLinecap="round"
        />
        <path d="M 600 118 A 30 30 0 0 0 600 166 Z" fill="#B98A5A" />
        <motion.circle
          cx="588"
          cy="152"
          r="26"
          fill="#F7C873"
          animate={{ opacity: [0.25, 0.5, 0.25] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        />
        <rect x="660" y="464" width="60" height="10" rx="5" fill="#A9713C" />
      </g>

      {/* Planta que se mece */}
      <g opacity="0.95">
        <motion.g
          style={{ transformBox: "fill-box", transformOrigin: "50% 100%" }}
          animate={{ rotate: [-1.5, 1.5, -1.5] }}
          transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
        >
          <path d="M110 430 C 96 360 70 340 52 310" fill="none" stroke="#5C6247" strokeWidth="6" strokeLinecap="round" />
          <path d="M110 430 C 112 350 118 330 142 296" fill="none" stroke="#5C6247" strokeWidth="6" strokeLinecap="round" />
          <path d="M110 430 C 104 380 92 366 88 344" fill="none" stroke="#6B7352" strokeWidth="5" strokeLinecap="round" />
          <ellipse cx="48" cy="304" rx="16" ry="30" fill="#5C6247" transform="rotate(-28 48 304)" />
          <ellipse cx="146" cy="290" rx="16" ry="32" fill="#6B7352" transform="rotate(22 146 290)" />
          <ellipse cx="86" cy="336" rx="13" ry="24" fill="#5C6247" transform="rotate(-12 86 336)" />
        </motion.g>
        <path d="M 82 430 L 138 430 L 130 486 L 90 486 Z" fill="#B45338" />
        <rect x="78" y="424" width="64" height="12" rx="6" fill="#A34A30" />
      </g>

      {children}
    </svg>
  );
}

/** Envuelve la pieza: pop de asentamiento al cambiar de forma. */
function Piece({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.g
        key={id}
        initial={{ opacity: 0, scale: 0.96, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.97, y: -6 }}
        transition={popSpring}
        style={{ transformBox: "fill-box", transformOrigin: "50% 80%" }}
      >
        {children}
      </motion.g>
    </AnimatePresence>
  );
}

function FloorShadow({ cx, rx }: { cx: number; rx: number }) {
  return <ellipse cx={cx} cy={492} rx={rx} ry={16} fill="#231510" opacity={0.14} />;
}

/* ── SOFÁ (Salas) ─────────────────────────────────────────────── */

function SofaRender({
  fabric,
  finish,
  layout,
}: {
  fabric: string;
  finish: string;
  layout: SofaLayout;
}) {
  const seatW = 118;
  const gap = 6;
  const armW = 46;
  const bodyW = layout.seats * seatW + (layout.seats - 1) * gap + armW * 2;
  // Con chaise, desplaza el cuerpo para centrar la huella combinada
  // (y no invadir la lámpara/planta decorativas).
  const shift = layout.chaise === "right" ? -55 : layout.chaise === "left" ? 55 : 0;
  const x0 = 400 - bodyW / 2 + shift;
  const topY = 212;
  const seatY = 336;
  const baseY = 400;

  const fLight = shade(fabric, 0.16);
  const fDark = shade(fabric, -0.2);
  const wDark = shade(finish, -0.25);

  const chaiseW = 128;
  const chaiseX =
    layout.chaise === "right" ? x0 + bodyW - armW - 10 : x0 + armW + 10 - chaiseW;

  return (
    <g>
      <FloorShadow cx={400} rx={bodyW / 2 + (layout.chaise === "none" ? 30 : 90)} />

      {/* Chaise (L-Shape a la derecha / Reversible a la izquierda) */}
      {layout.chaise !== "none" && (
        <g>
          <Tinted fill={fDark} x={chaiseX} y={seatY + 8} width={chaiseW} height={118} rx={20} />
          <Tinted fill={fLight} x={chaiseX + 8} y={seatY + 16} width={chaiseW - 16} height={54} rx={16} />
          <Tinted fill={wDark} x={chaiseX + 14} y={seatY + 108} width={20} height={20} rx={5} />
          <Tinted fill={wDark} x={chaiseX + chaiseW - 34} y={seatY + 108} width={20} height={20} rx={5} />
        </g>
      )}

      {/* Base de madera */}
      <Tinted fill={finish} x={x0 + 10} y={baseY} width={bodyW - 20} height={26} rx={10} />

      {/* Patas cónicas */}
      {[x0 + 26, x0 + bodyW - 44].map((legX, i) => (
        <TintedPath
          key={`leg-${i}`}
          fill={wDark}
          d={`M ${legX} ${baseY + 24} L ${legX + 18} ${baseY + 24} L ${legX + 12} ${baseY + 62} L ${legX + 6} ${baseY + 62} Z`}
        />
      ))}

      {/* Respaldo */}
      <Tinted
        fill={fabric}
        x={x0 + armW - 6}
        y={topY - 26}
        width={bodyW - armW * 2 + 12}
        height={110}
        rx={22}
      />

      {/* Brazos */}
      <Tinted fill={fDark} x={x0} y={topY + 16} width={armW} height={188} rx={20} />
      <Tinted fill={fDark} x={x0 + bodyW - armW} y={topY + 16} width={armW} height={188} rx={20} />

      {/* Cojines de respaldo y asiento */}
      {Array.from({ length: layout.seats }).map((_, i) => {
        const cx = x0 + armW + i * (seatW + gap);
        return (
          <g key={`mod-${i}`}>
            <Tinted fill={fLight} x={cx} y={topY - 8} width={seatW} height={104} rx={18} />
            <Tinted fill={fabric} x={cx} y={seatY} width={seatW} height={62} rx={16} />
            {/* Pespunte del cojín */}
            <motion.line
              x1={cx + 16}
              y1={seatY + 31}
              x2={cx + seatW - 16}
              y2={seatY + 31}
              strokeWidth={2.5}
              strokeLinecap="round"
              initial={false}
              animate={{ stroke: fDark }}
              transition={colorFade}
              strokeOpacity={0.4}
            />
          </g>
        );
      })}

      {/* Cojín decorativo */}
      <g transform={`rotate(-8 ${x0 + armW + 41} ${topY + 57})`}>
        <Tinted
          fill={shade(fabric, 0.34)}
          x={x0 + armW + 14}
          y={topY + 30}
          width={54}
          height={54}
          rx={14}
        />
      </g>
    </g>
  );
}

/* ── CAMA (Dormitorios) ───────────────────────────────────────── */

function BedRender({
  fabric,
  finish,
  scale,
  label,
}: {
  fabric: string;
  finish: string;
  scale: number;
  label: string;
}) {
  const w = 420 * scale;
  const x0 = 400 - w / 2;
  const fLight = shade(fabric, 0.5);
  const fDark = shade(fabric, -0.2);
  const wDark = shade(finish, -0.25);

  return (
    <g>
      <FloorShadow cx={400} rx={w / 2 + 24} />

      {/* Cabecero tapizado con costuras verticales */}
      <Tinted fill={fabric} x={x0} y={170} width={w} height={180} rx={26} />
      {[0.25, 0.5, 0.75].map((p) => (
        <motion.line
          key={p}
          x1={x0 + w * p}
          y1={188}
          x2={x0 + w * p}
          y2={298}
          strokeWidth={3}
          strokeLinecap="round"
          strokeOpacity={0.35}
          initial={false}
          animate={{ stroke: fDark }}
          transition={colorFade}
        />
      ))}

      {/* Colchón, manta y caída de la sábana */}
      <rect x={x0 - 12} y={300} width={w + 24} height={56} rx={16} fill="#FFFFFF" />
      <Tinted fill={fLight} x={x0 - 12} y={330} width={w + 24} height={78} rx={18} />
      <Tinted fill={fabric} x={x0 - 12} y={356} width={w + 24} height={52} rx={16} />

      {/* Almohadas */}
      <g transform={`rotate(-3 ${x0 + 22 + w * 0.17} 288)`}>
        <rect x={x0 + 22} y={266} width={w * 0.34} height={44} rx={14} fill="#FDFBF7" />
      </g>
      <g transform={`rotate(3 ${x0 + 38 + w * 0.51} 288)`}>
        <rect x={x0 + 38 + w * 0.34} y={266} width={w * 0.34} height={44} rx={14} fill="#FDFBF7" />
      </g>

      {/* Base y patas de madera */}
      <Tinted fill={finish} x={x0 - 12} y={404} width={w + 24} height={22} rx={10} />
      <Tinted fill={wDark} x={x0 - 4} y={424} width={22} height={34} rx={6} />
      <Tinted fill={wDark} x={x0 + w - 20} y={424} width={22} height={34} rx={6} />

      {/* Etiqueta del tamaño */}
      <AnimatePresence mode="wait" initial={false}>
        <motion.g
          key={label}
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 6 }}
          transition={popSpring}
        >
          <rect x={344} y={116} width={112} height={30} rx={15} fill="#231510" opacity={0.85} />
          <text x={400} y={136} textAnchor="middle" fontSize="14" fontWeight="700" fill="#FAFAF7">
            {label || "Queen"}
          </text>
        </motion.g>
      </AnimatePresence>
    </g>
  );
}

/* ── COMEDOR (Comedores) ──────────────────────────────────────── */

function TableRender({
  fabric,
  finish,
  seats,
}: {
  fabric: string;
  finish: string;
  seats: number;
}) {
  const backChairs = Math.max(2, Math.min(4, Math.round(seats / 2)));
  const w = 240 + backChairs * 80;
  const x0 = 400 - w / 2;
  const wDark = shade(finish, -0.25);
  const wLight = shade(finish, 0.15);
  const fDark = shade(fabric, -0.15);

  const span = w - 160;
  const chairXs = Array.from({ length: backChairs }).map(
    (_, i) => x0 + 80 + (backChairs === 1 ? span / 2 : (span / (backChairs - 1)) * i)
  );

  return (
    <g>
      <FloorShadow cx={400} rx={w / 2 + 50} />

      {/* Sillas del fondo */}
      {chairXs.map((cx, i) => (
        <g key={`chair-${i}`}>
          <Tinted fill={fabric} x={cx - 27} y={218} width={54} height={92} rx={16} />
          <Tinted fill={fDark} x={cx - 19} y={228} width={38} height={56} rx={12} opacity={0.35} />
        </g>
      ))}

      {/* Tablero con veta */}
      <Tinted fill={finish} x={x0} y={310} width={w} height={26} rx={12} />
      <motion.line
        x1={x0 + 20}
        y1={323}
        x2={x0 + w - 20}
        y2={323}
        strokeWidth={3}
        strokeLinecap="round"
        strokeOpacity={0.6}
        initial={false}
        animate={{ stroke: wLight }}
        transition={colorFade}
      />

      {/* Patas */}
      {[x0 + 26, x0 + w - 48].map((legX, i) => (
        <TintedPath
          key={`tleg-${i}`}
          fill={wDark}
          d={`M ${legX} 336 L ${legX + 22} 336 L ${legX + 16} 470 L ${legX + 6} 470 Z`}
        />
      ))}

      {/* Centro de mesa con flores */}
      <g>
        <rect x={382} y={282} width={36} height={28} rx={6} fill="#B45338" />
        <path d="M392 282 C 388 262 384 258 380 250" stroke="#5C6247" strokeWidth="4" fill="none" strokeLinecap="round" />
        <path d="M400 282 C 402 258 406 254 412 246" stroke="#6B7352" strokeWidth="4" fill="none" strokeLinecap="round" />
        <circle cx="378" cy="246" r="7" fill="#E8511A" />
        <circle cx="414" cy="242" r="7" fill="#F7C873" />
      </g>

      {/* Sillas de los extremos */}
      {([[x0 - 40, 0], [x0 + w - 26, 54]] as const).map(([cx, backOffset], i) => (
        <g key={`endchair-${i}`}>
          <Tinted fill={finish} x={cx + backOffset} y={214} width={12} height={94} rx={5} />
          <Tinted fill={fabric} x={cx} y={300} width={66} height={20} rx={9} />
          <Tinted fill={wDark} x={cx + 6} y={320} width={10} height={82} rx={4} />
          <Tinted fill={wDark} x={cx + 50} y={320} width={10} height={82} rx={4} />
        </g>
      ))}
    </g>
  );
}

/* ── ESCRITORIO (Oficina) ─────────────────────────────────────── */

function DeskRender({
  fabric,
  finish,
  scale,
}: {
  fabric: string;
  finish: string;
  scale: number;
}) {
  const w = 380 * scale;
  const x0 = 400 - w / 2;
  const wDark = shade(finish, -0.25);
  const wLight = shade(finish, 0.15);

  return (
    <g>
      <FloorShadow cx={400} rx={w / 2 + 40} />

      {/* Tablero con veta */}
      <Tinted fill={finish} x={x0} y={320} width={w} height={22} rx={10} />
      <motion.line
        x1={x0 + 16}
        y1={331}
        x2={x0 + w - 16}
        y2={331}
        strokeWidth={3}
        strokeOpacity={0.6}
        strokeLinecap="round"
        initial={false}
        animate={{ stroke: wLight }}
        transition={colorFade}
      />

      {/* Patas caballete */}
      {[x0 + 42, x0 + w - 92].map((legX, i) => (
        <g key={`dleg-${i}`}>
          <TintedPath
            fill={wDark}
            d={`M ${legX} 342 L ${legX + 12} 342 L ${legX - 14} 474 L ${legX - 26} 474 Z`}
          />
          <TintedPath
            fill={wDark}
            d={`M ${legX + 38} 342 L ${legX + 50} 342 L ${legX + 76} 474 L ${legX + 64} 474 Z`}
          />
        </g>
      ))}

      {/* Laptop, taza humeante */}
      <path d="M 348 320 L 356 272 L 444 272 L 452 320 Z" fill="#26211E" />
      <rect x={360} y={278} width={80} height={34} rx={4} fill="#3A332E" />
      <Tinted fill={fabric} x={478} y={300} width={26} height={20} rx={5} />
      <motion.path
        d="M 504 305 q 12 5 0 12"
        fill="none"
        strokeWidth={4}
        initial={false}
        animate={{ stroke: fabric }}
        transition={colorFade}
      />
      <motion.g
        animate={{ opacity: [0.2, 0.7, 0.2], y: [0, -4, 0] }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
      >
        <path
          d="M 486 292 q 3 -8 8 -10 M 494 294 q 3 -8 8 -10"
          fill="none"
          strokeWidth={3}
          strokeLinecap="round"
          stroke="#B9AFA5"
        />
      </motion.g>

      {/* Silla de escritorio tapizada */}
      <g>
        <Tinted fill={fabric} x={144} y={190} width={16} height={100} rx={7} />
        <Tinted fill={fabric} x={150} y={286} width={80} height={22} rx={10} />
        <rect x={184} y={308} width={12} height={120} rx={5} fill="#26211E" />
        <path d="M 150 466 L 230 466" stroke="#26211E" strokeWidth="10" strokeLinecap="round" />
        <circle cx="152" cy="472" r="9" fill="#3A332E" />
        <circle cx="228" cy="472" r="9" fill="#3A332E" />
      </g>
    </g>
  );
}

/* ── GENÉRICO (Muebles Auxiliares / Decoración) ───────────────── */

function GenericRender({ fabric, finish }: { fabric: string; finish: string }) {
  const wDark = shade(finish, -0.25);
  const wLight = shade(finish, 0.15);

  return (
    <g>
      <FloorShadow cx={400} rx={200} />

      {/* Aparador */}
      <Tinted fill={finish} x={250} y={250} width={300} height={170} rx={20} />
      {[0, 1, 2].map((i) => (
        <Tinted
          key={`door-${i}`}
          fill={wLight}
          x={266 + i * 92}
          y={268}
          width={84}
          height={134}
          rx={12}
          opacity={0.55}
        />
      ))}
      <Tinted fill={wDark} x={268} y={420} width={16} height={40} rx={6} />
      <Tinted fill={wDark} x={516} y={420} width={16} height={40} rx={6} />

      {/* Jarrón con la tela elegida + ramas */}
      <TintedPath fill={fabric} d="M 330 250 L 350 250 L 346 200 Q 340 188 334 200 Z" />
      <path d="M340 196 C 334 176 328 172 322 164" stroke="#5C6247" strokeWidth="4" fill="none" strokeLinecap="round" />
      <path d="M342 196 C 346 174 352 170 358 160" stroke="#6B7352" strokeWidth="4" fill="none" strokeLinecap="round" />

      {/* Pila de libros */}
      <rect x={430} y={226} width={70} height={10} rx={3} fill="#B45338" />
      <rect x={438} y={214} width={54} height={10} rx={3} fill="#5C6247" />
      <Tinted fill={fabric} x={446} y={202} width={38} height={10} rx={3} />

      {/* Espejo redondo sobre el aparador */}
      <circle cx="400" cy="160" r="52" fill="#F7F1E8" stroke="#C9A876" strokeWidth="6" />
      <path d="M 372 176 A 40 40 0 0 1 384 130" stroke="#FFFFFF" strokeWidth="8" fill="none" strokeLinecap="round" opacity="0.7" />
    </g>
  );
}

/* ── componente principal ─────────────────────────────────────── */

export function FurnitureRender({
  category,
  fabricHex,
  finishHex,
  configurationLabel,
}: FurnitureRenderProps) {
  const fabric = fabricHex ?? FABRIC_FALLBACK;
  const finish = finishHex ?? FINISH_FALLBACK;

  let pieceId: string;
  let piece: React.ReactNode;

  switch (category) {
    case "Salas": {
      const layout = sofaLayoutFrom(configurationLabel);
      pieceId = `sofa-${layout.seats}-${layout.chaise}`;
      piece = <SofaRender fabric={fabric} finish={finish} layout={layout} />;
      break;
    }
    case "Dormitorios": {
      const scale = bedScaleFrom(configurationLabel);
      pieceId = `bed-${scale}`;
      piece = (
        <BedRender fabric={fabric} finish={finish} scale={scale} label={configurationLabel ?? ""} />
      );
      break;
    }
    case "Comedores": {
      const seats = tableSeatsFrom(configurationLabel);
      pieceId = `table-${seats}`;
      piece = <TableRender fabric={fabric} finish={finish} seats={seats} />;
      break;
    }
    case "Oficina": {
      const scale = widthScaleFrom(configurationLabel);
      pieceId = `desk-${scale}`;
      piece = <DeskRender fabric={fabric} finish={finish} scale={scale} />;
      break;
    }
    default: {
      pieceId = "generic";
      piece = <GenericRender fabric={fabric} finish={finish} />;
    }
  }

  return (
    <Ambient>
      <Piece id={pieceId}>{piece}</Piece>
    </Ambient>
  );
}
