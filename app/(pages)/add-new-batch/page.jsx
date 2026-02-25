
import AddNewBatchContent from "@/app/components/common/addNewBatch";
import { ToastProvider } from "@/app/components/common/Toaster";
import { Suspense } from "react";

export default function AddNewBatch() {
  return (
    <ToastProvider>
      <Suspense fallback={<div>Loading...</div>}>
        <AddNewBatchContent />
      </Suspense>
    </ToastProvider>
  );
}




