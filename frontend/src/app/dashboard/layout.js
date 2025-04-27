import Sidebar from "@/components/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";

export default function DashboardLayout({ children }) {
  return (
    <div className="flex h-screen">
      <Sidebar />
      <TooltipProvider>
        <main className="flex-1 p-6">{children}</main>
      </TooltipProvider>
    </div>
  );
}

// app/dashboard/layout.js
// export default function DashboardLayout({ children }) {
//     return (
//       <div>
//         {/* 移除 Sidebar */}
//         <main>{children}</main>
//       </div>
//     );
//   }
