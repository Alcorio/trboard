'use client';

import Link from "next/link";
import { useState } from "react";
import { usePathname } from "next/navigation";

export default function Sidebar({ onMenuClick }) {
  const pathname = usePathname();
  const [openMenus, setOpenMenus] = useState({
    visual: false,
    training: false,
    data: false,
  });

  const toggleMenu = (menu) => {
    setOpenMenus((prev) => ({
      ...prev,
      [menu]: !prev[menu],
    }));
  };

  const menuItems = [
    {
      label: "首页",
      path: "/dashboard/home",
    },
    {
      label: "训练管理",
      submenu: [
        { label: "上传脚本", path: "/dashboard/training?tab=uploadScript" },
        { label: "上传数据集", path: "/dashboard/training?tab=uploadData" },
        { label: "脚本执行", path:"/dashboard/training/running"}
      ],
    },
    {
      label: "数据可视化",
      submenu: [
        { label: "数据分布可视化", path: "/dashboard/visual/distribution" },
        { label: "训练过程指标可视化", path: "/dashboard/visual/training" },
        { label: "数据贡献度可视化", path: "/dashboard/visual/contribution" },
        { label: "数据离群度可视化", path: "/dashboard/visual/outlier" },
      ],
    },
    {
      label: "数据管理",
      submenu: [
        { label: "上传管理", path: "/dashboard/data/upload" },
        { label: "样本选择", path: "/dashboard/data/select" },
        { label: "数据质量报告", path: "/dashboard/data/report" },
      ],
    },
  ];

  return ( // shrink-0 禁止收缩，
    <div className="w-48 shrink-0 bg-white text-black h-full shadow-md p-4">
      <h2 className="text-lg font-bold mb-4 border-b pb-2 border-gray-300">Menu</h2>
      <ul className="space-y-2">
        {menuItems.map((item) =>
          item.submenu ? (
            <li key={item.label}>
              <button
                onClick={() => toggleMenu(item.label)}
                className="w-full flex justify-between items-center px-4 py-2 rounded-md hover:bg-gray-100"
              >
                <span>{item.label}</span>
                <span>{openMenus[item.label] ? "▲" : "▼"}</span>
              </button>
              {openMenus[item.label] && (
                <ul className="ml-4 mt-2 space-y-1">
                  {item.submenu.map((subItem) => (
                    <li key={subItem.key || subItem.path}>
                      {subItem.key ? (
                        <button
                          onClick={() => onMenuClick(subItem.key)}
                          className={`block px-4 py-2 rounded-md ${
                            pathname === subItem.path
                              ? "bg-blue-100 text-blue-500"
                              : "hover:bg-gray-100 hover:text-black"
                          }`}
                        >
                          {subItem.label}
                        </button>
                      ) : (
                        <Link
                          href={subItem.path}
                          className={`block px-4 py-2 rounded-md ${
                            pathname === subItem.path
                              ? "bg-blue-100 text-blue-500"
                              : "hover:bg-gray-100 hover:text-black"
                          }`}
                        >
                          {subItem.label}
                        </Link>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ) : (
            <li key={item.path}>
              <Link
                href={item.path}
                className={`block px-4 py-2 rounded-md ${
                  pathname === item.path
                    ? "bg-blue-100 text-blue-500"
                    : "hover:bg-gray-100 hover:text-black"
                }`}
              >
                {item.label}
              </Link>
            </li>
          )
        )}
      </ul>
    </div>
  );
}