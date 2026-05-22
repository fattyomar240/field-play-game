import { useEffect, useRef, useState } from "react";

// Field dimensions in arbitrary units (we scale via CSS aspect-ratio)
const FIELD_W = 1050;
const FIELD_H = 680;
const PLAYER_R = 18;
const BALL_R = 12;
const SPEED = 6;
const GOAL_TOP = (FIELD_H - 120) / 2;
const GOAL_BOTTOM = GOAL_TOP + 120;
const MATCH_SECONDS = 90;

type Pos = { x: number; y: number };

interface Player {
  id: number;
  pos: Pos;
  color: string;
  ring: string;
  label: string;
  controlled?: boolean;
}

const initialPlayers: Player[] = [
  { id: 1, pos: { x: 150, y: 340 }, color: "bg-sky-500", ring: "ring-sky-200", label: "1", controlled: true },
  { id: 2, pos: { x: 300, y: 200 }, color: "bg-sky-500", ring: "ring-sky-200", label: "2" },
  { id: 3, pos: { x: 300, y: 480 }, color: "bg-sky-500", ring: "ring-sky-200", label: "3" },
  { id: 4, pos: { x: 450, y: 340 }, color: "bg-sky-500", ring: "ring-sky-200", label: "4" },
  { id: 5, pos: { x: 900, y: 340 }, color: "bg-rose-500", ring: "ring-rose-200", label: "1" },
  { id: 6, pos: { x: 750, y: 200 }, color: "bg-rose-500", ring: "ring-rose-200", label: "2" },
  { id: 7, pos: { x: 750, y: 480 }, color: "bg-rose-500", ring: "ring-rose-200", label: "3" },
  { id: 8, pos: { x: 600, y: 340 }, color: "bg-rose-500", ring: "ring-rose-200", label: "4" },
];

const cloneInitial = () => initialPlayers.map((p) => ({ ...p, pos: { ...p.pos } }));

export default function FootballField() {
  const [players, setPlayers] = useState<Player[]>(cloneInitial);
  const [ball, setBall] = useState<Pos>({ x: FIELD_W / 2, y: FIELD_H / 2 });
  const [scoreBlue, setScoreBlue] = useState(0);
  const [scoreRed, setScoreRed] = useState(0);
  const [timeLeft, setTimeLeft] = useState(MATCH_SECONDS);
  const [finished, setFinished] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);

  const ballVel = useRef<Pos>({ x: 0, y: 0 });
  const keys = useRef<Set<string>>(new Set());
  const finishedRef = useRef(false);

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

  // Match timer
  useEffect(() => {
    if (finished) return;
    const id = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          finishedRef.current = true;
          setFinished(true);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [finished]);

  const resetAfterGoal = (scorer: "blue" | "red") => {
    setFlash(scorer === "blue" ? "GOAL — BLUE!" : "GOAL — RED!");
    setTimeout(() => setFlash(null), 1200);
    ballVel.current = { x: 0, y: 0 };
    setBall({ x: FIELD_W / 2, y: FIELD_H / 2 });
    setPlayers(cloneInitial());
  };

  const restart = () => {
    finishedRef.current = false;
    setScoreBlue(0);
    setScoreRed(0);
    setTimeLeft(MATCH_SECONDS);
    setFinished(false);
    setFlash(null);
    ballVel.current = { x: 0, y: 0 };
    setBall({ x: FIELD_W / 2, y: FIELD_H / 2 });
    setPlayers(cloneInitial());
  };

  // Game loop
  useEffect(() => {
    let raf = 0;
    const tick = () => {
      if (finishedRef.current) {
        raf = requestAnimationFrame(tick);
        return;
      }
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

        setBall((b) => {
          let nx = b.x + ballVel.current.x;
          let ny = b.y + ballVel.current.y;
          ballVel.current.x *= 0.96;
          ballVel.current.y *= 0.96;
          if (Math.abs(ballVel.current.x) < 0.05) ballVel.current.x = 0;
          if (Math.abs(ballVel.current.y) < 0.05) ballVel.current.y = 0;

          // Goal detection — ball crosses goal line within goal mouth
          const inGoalY = ny > GOAL_TOP && ny < GOAL_BOTTOM;
          if (nx - BALL_R <= 5 && inGoalY) {
            setScoreRed((s) => s + 1);
            resetAfterGoal("red");
            return { x: FIELD_W / 2, y: FIELD_H / 2 };
          }
          if (nx + BALL_R >= FIELD_W - 5 && inGoalY) {
            setScoreBlue((s) => s + 1);
            resetAfterGoal("blue");
            return { x: FIELD_W / 2, y: FIELD_H / 2 };
          }

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

          for (const p of next) {
            const ddx = nx - p.pos.x;
            const ddy = ny - p.pos.y;
            const dist = Math.hypot(ddx, ddy);
            const minDist = PLAYER_R + BALL_R;
            if (dist < minDist && dist > 0) {
              const nxn = ddx / dist;
              const nyn = ddy / dist;
              nx = p.pos.x + nxn * minDist;
              ny = p.pos.y + nyn * minDist;
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

  const winner =
    scoreBlue === scoreRed ? "Draw" : scoreBlue > scoreRed ? "Blue wins!" : "Red wins!";

  return (
    <div className="w-full max-w-6xl">
      {/* Scoreboard */}
      <div className="mb-3 flex items-center justify-between gap-3 rounded-xl bg-slate-950/60 ring-1 ring-white/10 px-4 py-3 backdrop-blur">
        <div className="flex items-center gap-2 text-sky-400 font-bold">
          <span className="inline-block w-3 h-3 rounded-full bg-sky-500" />
          BLUE
          <span className="ml-2 text-2xl text-white tabular-nums">{scoreBlue}</span>
        </div>
        <div className="text-center">
          <div className="text-[10px] uppercase tracking-widest text-slate-400">Time</div>
          <div className={`text-2xl font-bold tabular-nums ${timeLeft <= 10 && !finished ? "text-rose-400" : "text-white"}`}>
            {formatTime(timeLeft)}
          </div>
        </div>
        <div className="flex items-center gap-2 text-rose-400 font-bold">
          <span className="text-2xl text-white tabular-nums mr-2">{scoreRed}</span>
          RED
          <span className="inline-block w-3 h-3 rounded-full bg-rose-500" />
        </div>
      </div>

      <div
        className="relative w-full rounded-2xl overflow-hidden shadow-[0_25px_80px_-20px_rgba(0,0,0,0.7)] ring-1 ring-black/40"
        style={{ aspectRatio: `${FIELD_W} / ${FIELD_H}` }}
      >
        <div
          className="absolute inset-0"
          style={{
            background:
              "repeating-linear-gradient(90deg, #2f9a4a 0 8.33%, #267d3d 8.33% 16.66%)",
          }}
        />
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse at center, rgba(255,255,255,0.18), transparent 60%), linear-gradient(180deg, rgba(0,0,0,0.25), transparent 30%, transparent 70%, rgba(0,0,0,0.35))",
          }}
        />

        <svg
          viewBox={`0 0 ${FIELD_W} ${FIELD_H}`}
          className="absolute inset-0 w-full h-full"
          preserveAspectRatio="none"
        >
          <g fill="none" stroke="white" strokeWidth={3} opacity={0.95}>
            <rect x={20} y={20} width={FIELD_W - 40} height={FIELD_H - 40} />
            <line x1={FIELD_W / 2} y1={20} x2={FIELD_W / 2} y2={FIELD_H - 20} />
            <circle cx={FIELD_W / 2} cy={FIELD_H / 2} r={75} />
            <circle cx={FIELD_W / 2} cy={FIELD_H / 2} r={3} fill="white" />
            <rect x={20} y={(FIELD_H - 280) / 2} width={140} height={280} />
            <rect x={20} y={(FIELD_H - 120) / 2} width={50} height={120} />
            <rect x={FIELD_W - 160} y={(FIELD_H - 280) / 2} width={140} height={280} />
            <rect x={FIELD_W - 70} y={(FIELD_H - 120) / 2} width={50} height={120} />
            <circle cx={110} cy={FIELD_H / 2} r={3} fill="white" />
            <circle cx={FIELD_W - 110} cy={FIELD_H / 2} r={3} fill="white" />
            <path d={`M 160 ${FIELD_H / 2 - 40} A 50 50 0 0 1 160 ${FIELD_H / 2 + 40}`} />
            <path d={`M ${FIELD_W - 160} ${FIELD_H / 2 - 40} A 50 50 0 0 0 ${FIELD_W - 160} ${FIELD_H / 2 + 40}`} />
            <path d="M 20 30 A 10 10 0 0 1 30 20" />
            <path d={`M ${FIELD_W - 30} 20 A 10 10 0 0 1 ${FIELD_W - 20} 30`} />
            <path d={`M 20 ${FIELD_H - 30} A 10 10 0 0 0 30 ${FIELD_H - 20}`} />
            <path d={`M ${FIELD_W - 30} ${FIELD_H - 20} A 10 10 0 0 0 ${FIELD_W - 20} ${FIELD_H - 30}`} />
          </g>

          <g>
            <rect x={5} y={GOAL_TOP} width={15} height={120} fill="white" opacity={0.9} stroke="#999" />
            <rect x={FIELD_W - 20} y={GOAL_TOP} width={15} height={120} fill="white" opacity={0.9} stroke="#999" />
          </g>
        </svg>

        {players.map((p) => (
          <PlayerDot key={p.id} player={p} />
        ))}

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

        {/* Goal flash */}
        {flash && !finished && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="px-6 py-3 rounded-xl bg-black/70 text-white text-2xl sm:text-4xl font-extrabold tracking-wide animate-[scale-in_0.2s_ease-out] ring-2 ring-white/30">
              {flash}
            </div>
          </div>
        )}

        {/* Final scoreboard overlay */}
        {finished && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
            <div className="w-full max-w-sm rounded-2xl bg-slate-900 ring-1 ring-white/15 shadow-2xl p-6 text-center animate-[scale-in_0.25s_ease-out]">
              <div className="text-xs uppercase tracking-[0.3em] text-slate-400">Full time</div>
              <div className="mt-2 text-3xl font-extrabold text-white">{winner}</div>
              <div className="mt-5 flex items-center justify-center gap-6">
                <div>
                  <div className="text-xs font-semibold text-sky-400">BLUE</div>
                  <div className="text-5xl font-black text-white tabular-nums">{scoreBlue}</div>
                </div>
                <div className="text-3xl text-slate-500">–</div>
                <div>
                  <div className="text-xs font-semibold text-rose-400">RED</div>
                  <div className="text-5xl font-black text-white tabular-nums">{scoreRed}</div>
                </div>
              </div>
              <button
                onClick={restart}
                className="mt-6 w-full rounded-lg bg-white text-slate-900 font-semibold py-2.5 hover:bg-slate-200 transition-colors"
              >
                Play again
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-xs sm:text-sm text-slate-400">
        <span>Arrow keys / WASD to move. Push the ball into the right goal to score.</span>
        <button
          onClick={restart}
          className="rounded-md bg-slate-800 hover:bg-slate-700 text-slate-100 px-3 py-1.5 ring-1 ring-white/10"
        >
          Reset match
        </button>
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

function formatTime(s: number) {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec.toString().padStart(2, "0")}`;
}
