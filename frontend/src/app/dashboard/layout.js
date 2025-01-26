import Sidebar from "@/components/sidebar";

export default function DashboardLayout({ children }) {
  return (
    <div className="flex h-screen">
      <Sidebar />
      <main className="flex-1 p-6">{children}</main>
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
