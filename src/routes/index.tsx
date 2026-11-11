import { createFileRoute } from "@tanstack/react-router";
import { BarrioApp } from "@/components/barrio/app";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  return <BarrioApp />;
}
