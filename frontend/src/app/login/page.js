"use client";
import { useRouter } from "next/navigation";

export default function Login() {
  const router = useRouter();

  const handleLogin = () => {
    // 模拟登录，跳转到主面板
    router.push("/dashboard");
  };

  return (
    <div className="flex items-center justify-center h-screen bg-gray-100">
      <div className="bg-white p-6 rounded shadow-md">
        <h1 className="text-2xl font-bold mb-4">Login</h1>
        <button
          onClick={handleLogin}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Login
        </button>
      </div>
    </div>
  );
}
