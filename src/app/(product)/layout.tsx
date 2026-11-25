import type { ReactNode } from "react";
import { ProductFlowBar } from "@/components/layout/product-shell";

export default function ProductLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-col">
      <ProductFlowBar />
      {children}
    </div>
  );
}
