import SoakingContent from "@/app/components/common/soakingcomp";
import { ToastProvider } from "@/app/components/common/Toaster";
import { Suspense } from "react";

export default function Soaking() {
  return (
    <ToastProvider>
      <Suspense fallback={<div>Loading...</div>}>
        <SoakingContent />
      </Suspense>

    </ToastProvider>
  );
}