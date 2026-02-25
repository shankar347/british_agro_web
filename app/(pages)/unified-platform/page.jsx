import { ToastProvider } from "@/app/components/common/Toaster";
import UnifiedPlatformContent from "@/app/components/common/unifiedplatform";
import { Suspense } from "react";

export default function UnifiedPlatform() {
  return (
    <ToastProvider>
      <Suspense fallback={<div>Loading...</div>}>
        <UnifiedPlatformContent />
      </Suspense>

    </ToastProvider>
  );
}