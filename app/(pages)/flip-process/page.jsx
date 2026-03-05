import FlipProcessContent from "@/app/components/common/flipprocesscomp";
import { ToastProvider } from "@/app/components/common/Toaster";
import { Suspense } from "react";

export default function Soaking() {
  return (
    <ToastProvider>
      <Suspense fallback={<div>Loading...</div>}>
        <FlipProcessContent />
      </Suspense>

    </ToastProvider>
  );
}