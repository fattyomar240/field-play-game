import { useEffect, useRef, useState } from "react";

// Field dimensions in arbitrary units (we scale via CSS aspect-ratio)
const FIELD_W = 1050;
const FIELD_H = 680;
const PLAYER_R = 18;
const BALL_R = 12;
const SPEED = 6;

type Pos = { x: number; y: number };

interface Player {
  id: number;
  pos: Pos;
  color: string; // tailwind bg class
  ring: string;
  label: string;
  controlled?: boolean;
}

const initialPlayers: Player[] = [
  // Blue team (left)
  { id: 1, pos: { x: 150, y: 340 }, color: "bg-sky-500", ring: "ring-sky-200", label: "1", controlled: true },
  { id: 2, pos: { x: 300, y: 200 }, color: "bg-sky-500", ring: "ring-sky-200", label: "2" },
  { id: 3, pos: { x: 300, y: 480 }, color: "bg-sky-500", ring: "ring-sky-200", label: "3" },
  { id: 4, pos: { x: 450, y: 340 }, color: "bg-sky-500", ring: "ring-sky-200", label: "4" },
  // Red team (right)
  { id: 5, pos: { x: 900, y: 340 }, color: "bg-rose-500", ring: "ring-rose-200", label: "1" },
  { id: 6, pos: { x: 750, y: 200 }, color: "bg-rose-500", ring: "ring-rose-200", label: "2" },
  { id: 7, pos: { x: 750, y: 480 }, color: "bg-rose-500", ring: "ring-rose-200", label: "3" },
  { id: 8, pos: { x: 600, y: 340 }, color: "bg-rose-500", ring: "ring-rose-200", label: "4" },
];

export default function FootballField() {
  const [players, setPlayers] = useState<Player[]>(initialPlayers);
  const [ball, setBall] = useState<Pos>({ x: FIELD_W / 2, y: FIELD_H / 2 });
  const ballVel = useRef<Pos>({ x: 0, y: 0 });
  const keys = useRef<Set<string>>(new Set());

  // Keyboard listeners
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (["arrowup", "arrowdown", "arrowleft", "arrowright", "w", "a", "s", "d"].includes(k)) {
        e.preventDefault();
        keys.current.add(k);
      }
    };
    const up = (e: KeyboardEvent) => keys.current.delete(e.key.toLowerCase());
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, []);

  // Game loop
  useEffect(() => {
    let raf = 0;
    const tick = () => {
      setPlayers((prev) => {
        const next = prev.map((p) => ({ ...p, pos: { ...p.pos } }));
        const ctrl = next.find((p) => p.controlled);
        if (ctrl) {
          let dx = 0,
            dy = 0;
          if (keys.current.has("arrowup") || keys.current.has("w")) dy -= 1;
          if (keys.current.has("arrowdown") || keys.current.has("s")) dy += 1;
          if (keys.current.has("arrowleft") || keys.current.has("a")) dx -= 1;
          if (keys.current.has("arrowright") || keys.current.has("d")) dx += 1;
          if (dx || dy) {
            const len = Math.hypot(dx, dy);
            ctrl.pos.x = clamp(ctrl.pos.x + (dx / len) * SPEED, PLAYER_R, FIELD_W - PLAYER_R);
            ctrl.pos.y = clamp(ctrl.pos.y + (dy / len) * SPEED, PLAYER_R, FIELD_H - PLAYER_R);
          }
        }

        // Ball physics
        setBall((b) => {
          let nx = b.x + ballVel.current.x;
          let ny = b.y + ballVel.current.y;
          ballVel.current.x *= 0.96;
          ballVel.current.y *= 0.96;
          if (Math.abs(ballVel.current.x) < 0.05) ballVel.current.x = 0;
          if (Math.abs(ballVel.current.y) < 0.05) ballVel.current.y = 0;

          // Wall bounce
          if (nx < BALL_R) {
            nx = BALL_R;
            ballVel.current.x *= -0.7;
          }
          if (nx > FIELD_W - BALL_R) {
            nx = FIELD_W - BALL_R;
            ballVel.current.x *= -0.7;
          }
          if (ny < BALL_R) {
            ny = BALL_R;
            ballVel.current.y *= -0.7;
          }
          if (ny > FIELD_H - BALL_R) {
            ny = FIELD_H - BALL_R;
            ballVel.current.y *= -0.7;
          }

          // Collisions with players
          for (const p of next) {
            const ddx = nx - p.pos.x;
            const ddy = ny - p.pos.y;
            const dist = Math.hypot(ddx, ddy);
            const minDist = PLAYER_R + BALL_R;
            if (dist < minDist && dist > 0) {
              const nxn = ddx / dist;
              const nyn = ddy / dist;
              // Push ball out
              nx = p.pos.x + nxn * minDist;
              ny = p.pos.y + nyn * minDist;
              // Kick velocity
              const kick = p.controlled ? 7 : 4;
              ballVel.current.x = nxn * kick;
              ballVel.current.y = nyn * kick;
            }
          }
          return { x: nx, y: ny };
        });

        return next;
      });
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div className="w-full max-w-6xl">
      <div
        className="relative w-full rounded-2xl overflow-hidden shadow-[0_25px_80px_-20px_rgba(0,0,0,0.7)] ring-1 ring-black/40"
        style={{ aspectRatio: `${FIELD_W} / ${FIELD_H}` }}
      >
        {/* Grass with stripes */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "repeating-linear-gradient(90deg, #2f9a4a 0 8.33%, #267d3d 8.33% 16.66%)",
          }}
        />
        {/* Lighting overlay */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse at center, rgba(255,255,255,0.18), transparent 60%), linear-gradient(180deg, rgba(0,0,0,0.25), transparent 30%, transparent 70%, rgba(0,0,0,0.35))",
          }}
        />

        {/* SVG field lines */}
        <svg
          viewBox={`0 0 ${FIELD_W} ${FIELD_H}`}
          className="absolute inset-0 w-full h-full"
          preserveAspectRatio="none"
        >
          <g fill="none" stroke="white" strokeWidth={3} opacity={0.95}>
            {/* Outer border */}
            <rect x={20} y={20} width={FIELD_W - 40} height={FIELD_H - 40} />
            {/* Midline */}
            <line x1={FIELD_W / 2} y1={20} x2={FIELD_W / 2} y2={FIELD_H - 20} />
            {/* Center circle */}
            <circle cx={FIELD_W / 2} cy={FIELD_H / 2} r={75} />
            <circle cx={FIELD_W / 2} cy={FIELD_H / 2} r={3} fill="white" />
            {/* Left penalty box */}
            <rect x={20} y={(FIELD_H - 280) / 2} width={140} height={280} />
            <rect x={20} y={(FIELD_H - 120) / 2} width={50} height={120} />
            {/* Right penalty box */}
            <rect x={FIELD_W - 160} y={(FIELD_H - 280) / 2} width={140} height={280} />
            <rect x={FIELD_W - 70} y={(FIELD_H - 120) / 2} width={50} height={120} />
            {/* Penalty spots */}
            <circle cx={110} cy={FIELD_H / 2} r={3} fill="white" />
            <circle cx={FIELD_W - 110} cy={FIELD_H / 2} r={3} fill="white" />
            {/* Penalty arcs */}
            <path d={`M 160 ${FIELD_H / 2 - 40} A 50 50 0 0 1 160 ${FIELD_H / 2 + 40}`} />
            <path d={`M ${FIELD_W - 160} ${FIELD_H / 2 - 40} A 50 50 0 0 0 ${FIELD_W - 160} ${FIELD_H / 2 + 40}`} />
            {/* Corner arcs */}
            <path d="M 20 30 A 10 10 0 0 1 30 20" />
            <path d={`M ${FIELD_W - 30} 20 A 10 10 0 0 1 ${FIELD_W - 20} 30`} />
            <path d={`M 20 ${FIELD_H - 30} A 10 10 0 0 0 30 ${FIELD_H - 20}`} />
            <path d={`M ${FIELD_W - 30} ${FIELD_H - 20} A 10 10 0 0 0 ${FIELD_W - 20} ${FIELD_H - 30}`} />
          </g>

          {/* Goals */}
          <g>
            <rect x={5} y={(FIELD_H - 120) / 2} width={15} height={120} fill="white" opacity={0.9} stroke="#999" />
            <rect x={FIELD_W - 20} y={(FIELD_H - 120) / 2} width={15} height={120} fill="white" opacity={0.9} stroke="#999" />
          </g>
        </svg>

        {/* Players */}
        {players.map((p) => (
          <PlayerDot key={p.id} player={p} />
        ))}

        {/* Ball */}
        <div
          className="absolute rounded-full bg-white shadow-[0_4px_10px_rgba(0,0,0,0.5)] border border-black/40"
          style={{
            width: `${(BALL_R * 2 / FIELD_W) * 100}%`,
            aspectRatio: "1 / 1",
            left: `${(ball.x / FIELD_W) * 100}%`,
            top: `${(ball.y / FIELD_H) * 100}%`,
            transform: "translate(-50%, -50%)",
            backgroundImage:
              "radial-gradient(circle at 30% 30%, #fff, #ddd 60%, #888)",
          }}
        />
      </div>

      <div className="mt-4 text-center text-xs sm:text-sm text-slate-400">
        Tip: the blue player with the white ring is yours. Bump the ball to kick it.
      </div>
    </div>
  );
}

function PlayerDot({ player }: { player: Player }) {
  return (
    <div
      className={`absolute rounded-full ${player.color} shadow-[0_6px_12px_rgba(0,0,0,0.5)] flex items-center justify-center text-white text-[10px] sm:text-xs font-bold transition-[left,top] duration-75 ease-linear ${
        player.controlled ? "ring-4 ring-white/80" : `ring-2 ${player.ring}`
      }`}
      style={{
        width: `${(PLAYER_R * 2 / FIELD_W) * 100}%`,
        aspectRatio: "1 / 1",
        left: `${(player.pos.x / FIELD_W) * 100}%`,
        top: `${(player.pos.y / FIELD_H) * 100}%`,
        transform: "translate(-50%, -50%)",
      }}
    >
      {player.label}
    </div>
  );
}

function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v));
}
