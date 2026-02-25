
import BunkerManagementContent from "@/app/components/common/bunkermanage";
import { ToastProvider } from "@/app/components/common/Toaster";
import { Suspense } from "react";
export default function BunkerManagement() {
  return (
    <ToastProvider>
      <Suspense fallback={<div>Loading...</div>}>

        <BunkerManagementContent />
      </Suspense>

    </ToastProvider>
  );
}