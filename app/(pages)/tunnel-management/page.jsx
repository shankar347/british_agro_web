import { ToastProvider } from "@/app/components/common/Toaster";
import TunnelManagementContent from "@/app/components/common/tunnelmange";
import { Suspense } from "react";

export default function TunnelManagement() {
  return (
    <ToastProvider>
      <Suspense fallback={<div>Loading...</div>}>

        <TunnelManagementContent />
      </Suspense>

    </ToastProvider>
  );
}