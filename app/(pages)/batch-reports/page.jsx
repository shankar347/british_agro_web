import BatchReportsContent from "@/app/components/common/batchreportcomp";
import { ToastProvider } from "@/app/components/common/Toaster";
import { Suspense } from "react";

export default function BatchReports() {
  return (
    <ToastProvider>
      <Suspense fallback={<div>Loading...</div>}>
        <BatchReportsContent />
      </Suspense>
    </ToastProvider>
  );
}