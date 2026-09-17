import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/cad/")({
  beforeLoad: () => {
    throw redirect({ to: "/cad/dashboard", replace: true });
  },
});
