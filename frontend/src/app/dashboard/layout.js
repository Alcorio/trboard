import Sidebar from "@/components/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "react-hot-toast";

export default function DashboardLayout({ children }) {
  return (
    <div className="flex h-screen">
      {/* 侧边栏固定宽度且禁止收缩 */}
      <div className="w-60 shrink-0">
        <Sidebar />
      </div>
      <TooltipProvider>
         {/* 其余全屏区域；min-w-0 允许自身出现横向滚动而不是撑破父级 */}
        <main className="flex-1 overflow-y-auto min-w-0">{children}</main>
      </TooltipProvider>
        {/* 消息提示 替代alert，非警告确认型*/}
        <Toaster /> 
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
