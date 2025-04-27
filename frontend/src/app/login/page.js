// "use client";
// import { useRouter } from "next/navigation";
// 此处为原简单代码
// export default function Login() {
//   const router = useRouter();

//   const handleLogin = () => {
//     // 模拟登录，跳转到主面板
//     router.push("/dashboard");
//   };

//   return (
//     <div className="flex items-center justify-center h-screen bg-gray-100">
//       <div className="bg-white p-6 rounded shadow-md">
//         <h1 className="text-2xl font-bold mb-4">Login</h1>
//         <button
//           onClick={handleLogin}
//           className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
//         >
//           Login
//         </button>
//       </div>
//     </div>
//   );
// }

"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();

  const handleLogin = async () => {
    // 如果用户名和密码是 admin 和 123，直接跳转
    if (username == "admin" && password == "123") {

      localStorage.setItem("token", "admin");
      
      // console.log("yes admin", { isAdmin: true, username });
      router.push("/dashboard");
      return;
    }

    try {
      const response = await fetch("/api/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, password }),
      });

      if (response.ok) {
        const data = await response.json();
        // 假设后端返回一个token
        localStorage.setItem("token", data.token);
        router.push("/dashboard");
        
      } else {
        const errorData = await response.json();
        setError(errorData.message || "Login failed");
      }
    } catch (err) {
      setError("Error connecting to the server");
    }
  };

  return (
    <div className="flex items-center justify-center h-screen bg-gray-100">
      <div className="bg-white p-6 rounded shadow-md">
        <h1 className="text-2xl font-bold mb-4">Login</h1>
        <div className="mb-4">
          <input
            type="text"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full px-3 py-2 border rounded"
          />
        </div>
        <div className="mb-4">
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-3 py-2 border rounded"
          />
        </div>
        {error && <p className="text-red-500 text-sm mb-4">{error}</p>}
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
