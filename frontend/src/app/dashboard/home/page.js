"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";  // 访问路由实现

export default function home() {
  const router = useRouter();

  useEffect(() => {
    // 跳转到登录页面
    router.push("/dashboard");
  }, [router]);    // useEffect是react的副作用hook，[router]是依赖数组，当发生变化时，重新执行

  return <></>; // 首页没有内容
}
