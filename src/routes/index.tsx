import { createFileRoute } from "@tanstack/react-router";
import FootballField from "@/components/FootballField";

export const Route = createFileRoute("/")({
  component: Index,
  head: () => ({
    meta: [
      { title: "Interactive Football Field" },
      { name: "description", content: "A realistic, responsive football field. Move the player with arrow keys and kick the ball." },
    ],
  }),
});

function Index() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex flex-col items-center justify-center p-4 sm:p-8">
      <header className="mb-6 text-center">
        <h1 className="text-3xl sm:text-5xl font-bold text-white tracking-tight">
          Football Field
        </h1>
        <p className="mt-2 text-sm sm:text-base text-slate-300">
          Use arrow keys (or WASD) to move the blue player and kick the ball.
        </p>
      </header>
      <FootballField />
    </main>
  );
}
