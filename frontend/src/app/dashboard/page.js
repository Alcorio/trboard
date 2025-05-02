// export default function DashboardHome() {
//     return <h1 className="text-3xl font-bold">Welcome to the Dashboard</h1>;
// }
// app/dashboard/page.js

"use client";  // 客户端代码，输出日志只会输出到浏览器
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { deleteFromCache, clearAllCache } from "@/components/indexdb/db"; // 引入

export default function DashboardHome() {

    const router = useRouter();

    // 检查用户是否已登陆 
    useEffect(() => {
        const token = localStorage.getItem("token");
        if (!token) {
            router.push("/login");
        }
    }, [router]);

    const handleLogout = () => {
        // 清除token，并跳转回登陆页面
        localStorage.removeItem("token");
        router.push("/login");
    }

    const handleClearCache = async () => {
      try {
        await clearAllCache(); // 👈 清除所有缓存
        alert("已清除所有可视化缓存！");
      } catch (err) {
        console.error("清除缓存失败", err);
        alert("缓存清除失败！");
      }
    };
  
    
    return (
      <div className="relative flex flex-col items-center justify-center h-screen bg-gray-100">
        <h1 className="text-3xl font-bold mb-6">Welcome to trboard!</h1>
        
        <div className="space-x-3 absolute top-3 right-3">
          <button
            onClick={handleClearCache}
            className="px-2 py-1 bg-yellow-500 text-white rounded hover:bg-yellow-600 text-sm"
          >
            清除缓存
          </button>
          <button
            onClick={handleLogout}
            className="px-2 py-1 bg-red-500 text-white rounded hover:bg-red-600 text-sm"
          >
            Logout
          </button>
        </div>
      </div>
    );
   // return <h1 className="text-3xl font-bold">Welcome to the trboard!</h1>;
}
/*
top-4：距离顶部 4（1rem，即 16px）。

right-4：距离右侧 4（1rem，即 16px）。

px-4 py-2：水平内边距为 4（1rem，即 16px），垂直内边距为 2（0.5rem，即 8px）。

bg-red-500：背景颜色为红色。

text-white：文本颜色为白色。

rounded：圆角边框。

hover:bg-red-600：鼠标悬停时背景颜色变为深红色。
*/