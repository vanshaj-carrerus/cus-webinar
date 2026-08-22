import { Suspense } from "react";
import HostClient from "./host-client";

export default function HostPage() {
  return (
    <Suspense fallback={null}>
      <HostClient />
    </Suspense>
  );
}
