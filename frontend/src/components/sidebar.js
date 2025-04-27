// 'use client';
// import Link from "next/link";

// export default function Sidebar() {
//   return (
//     <div className="w-64 bg-white shadow-md h-full p-4">
//       <h2 className="text-xl font-bold mb-4">Menu</h2>
//       <ul className="space-y-4">
//         <li>
//           <Link href="/dashboard/training" className="text-blue-500 hover:underline">
//             Training Management
//           </Link>
//         </li>
//         <li>
//           <Link href="/dashboard/visualization" className="text-blue-500 hover:underline">
//             Data Visualization
//           </Link>
//         </li>
//         <li>
//           <Link href="/dashboard/data" className="text-blue-500 hover:underline">
//             Data Management
//           </Link>
//         </li>
//       </ul>
//     </div>
//   );
// }
'use client';

import Link from "next/link";
import { useState } from "react";
import { usePathname } from "next/navigation";

export default function Sidebar({ onMenuClick }) {
  const pathname = usePathname();
  const [openMenus, setOpenMenus] = useState({
    visualization: false,
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
        { label: "上传数据", path: "/dashboard/training?tab=uploadData" },
      ],
    },
    {
      label: "数据可视化",
      submenu: [
        { label: "数据分布可视化", path: "/dashboard/visualization/distribution" },
        { label: "训练过程指标可视化", path: "/dashboard/visualization/training" },
        { label: "数据贡献度可视化", path: "/dashboard/visualization/contribution" },
        { label: "数据离群度可视化", path: "/dashboard/visualization/outlier" },
      ],
    },
    {
      label: "文件管理",
      submenu: [
        { label: "上传管理", path: "/dashboard/data/upload" },
        { label: "样本选择", path: "/dashboard/data/select" },
        { label: "数据质量报告", path: "/dashboard/data/report" },
      ],
    },
  ];

  return (
    <div className="w-48 bg-white text-black h-full shadow-md p-4">
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



// 'use client';

// import Link from "next/link";
// import { useState } from "react";
// import { usePathname } from "next/navigation";

// export default function Sidebar({ onMenuClick }) {
//   const pathname = usePathname();
//   const [openMenus, setOpenMenus] = useState({
//     visualization: false,
//     training: false,
//     data: false,
//   });

//   const toggleMenu = (menu) => {
//     setOpenMenus((prev) => ({
//       ...prev,
//       [menu]: !prev[menu],
//     }));
//   };

//   const menuItems = [
//     {
//       label: "首页",
//       path: "/dashboard/home",
//     },
//     {
//       label: "训练管理",
//       submenu: [
//         { label: "上传脚本", key: "uploadScript" },
//         { label: "上传数据", key: "uploadData" },
//       ],
//     },
//     {
//       label: "数据可视化",
//       submenu: [
//         { label: "数据分布可视化", path: "/dashboard/visualization/distribution" },
//         { label: "训练过程指标可视化", path: "/dashboard/visualization/training" },
//         { label: "数据贡献度可视化", path: "/dashboard/visualization/contribution" },
//         { label: "数据离群度可视化", path: "/dashboard/visualization/outlier" },
//       ],
//     },
//     {
//       label: "数据管理",
//       path: "/dashboard/data",
//     },
//   ];

//   return (
//     <div className="w-48 bg-white text-black h-full shadow-md p-4">
//       <h2 className="text-lg font-bold mb-4 border-b pb-2 border-gray-300">Menu</h2>
//       <ul className="space-y-2">
//         {menuItems.map((item) =>
//           item.submenu ? (
//             <li key={item.label}>
//               <button
//                 onClick={() => toggleMenu(item.label)}
//                 className="w-full flex justify-between items-center px-4 py-2 rounded-md hover:bg-gray-100"
//               >
//                 <span>{item.label}</span>
//                 <span>{openMenus[item.label] ? "▲" : "▼"}</span>
//               </button>
//               {openMenus[item.label] && (
//                 <ul className="ml-4 mt-2 space-y-1">
//                   {item.submenu.map((subItem) => (
//                     <li key={subItem.path}>
//                        <button
//                         onClick={() => onMenuClick(subItem.key)}
//                         className={`block px-4 py-2 rounded-md hover:bg-gray-100 hover:text-black`}
//                       >
//                         {subItem.label}
//                       </button>
//                       {/* <Link
//                         href={subItem.path}
//                         className={`block px-4 py-2 rounded-md ${
//                           pathname === subItem.path
//                             ? "bg-blue-100 text-blue-500"
//                             : "hover:bg-gray-100 hover:text-black"
//                         }`}
//                       >
//                         {subItem.label}
//                       </Link> */}
//                     </li>
//                   ))}
//                 </ul>
//               )}
//             </li>
//           ) : (
//             <li key={item.path}>
//               <Link
//                 href={item.path}
//                 className={`block px-4 py-2 rounded-md ${
//                   pathname === item.path
//                     ? "bg-blue-100 text-blue-500"
//                     : "hover:bg-gray-100 hover:text-black"
//                 }`}
//               >
//                 {item.label}
//               </Link>
//             </li>
//           )
//         )}
//       </ul>
//     </div>
//   );
// }
// 英文 黑色侧边栏
// 'use client';

// import Link from "next/link";
// import { useState } from "react";
// import { usePathname } from "next/navigation";

// export default function Sidebar() {
//   const pathname = usePathname();

//   // 管理下拉菜单的状态
//   const [openMenus, setOpenMenus] = useState({
//     training: false,
//     data: false,
//   });

//   // 切换菜单展开状态
//   const toggleMenu = (menu) => {
//     setOpenMenus((prev) => ({
//       ...prev,
//       [menu]: !prev[menu],
//     }));
//   };

//   return (
//     <div className="w-48 bg-gray-900 text-white h-full p-4 transition-shadow duration-300 hover:shadow-lg hover:shadow-gray-700">
//       <h2 className="text-lg font-bold mb-4 border-b pb-2 border-gray-700">Menu</h2>
//       <ul className="space-y-2">
//         {/* Training Management */}
//         <li>
//           <button
//             className="flex justify-between items-center w-full px-4 py-2 rounded-md bg-gray-800 hover:bg-gray-700"
//             onClick={() => toggleMenu("training")}
//           >
//             Training Management
//             <span>{openMenus.training ? "▲" : "▼"}</span>
//           </button>
//           {openMenus.training && (
//             <ul className="ml-4 mt-2 space-y-1">
//               <li>
//                 <Link
//                   href="/dashboard/training/module1"
//                   className={`block px-4 py-2 rounded-md ${
//                     pathname === "/dashboard/training/module1"
//                       ? "bg-gray-700 text-white"
//                       : "hover:bg-gray-800 hover:text-gray-300"
//                   }`}
//                 >
//                   Module 1
//                 </Link>
//               </li>
//               <li>
//                 <Link
//                   href="/dashboard/training/module2"
//                   className={`block px-4 py-2 rounded-md ${
//                     pathname === "/dashboard/training/module2"
//                       ? "bg-gray-700 text-white"
//                       : "hover:bg-gray-800 hover:text-gray-300"
//                   }`}
//                 >
//                   Module 2
//                 </Link>
//               </li>
//             </ul>
//           )}
//         </li>

//         {/* Data Management */}
//         <li>
//           <button
//             className="flex justify-between items-center w-full px-4 py-2 rounded-md bg-gray-800 hover:bg-gray-700"
//             onClick={() => toggleMenu("data")}
//           >
//             Data Management
//             <span>{openMenus.data ? "▲" : "▼"}</span>
//           </button>
//           {openMenus.data && (
//             <ul className="ml-4 mt-2 space-y-1">
//               <li>
//                 <Link
//                   href="/dashboard/data/import"
//                   className={`block px-4 py-2 rounded-md ${
//                     pathname === "/dashboard/data/import"
//                       ? "bg-gray-700 text-white"
//                       : "hover:bg-gray-800 hover:text-gray-300"
//                   }`}
//                 >
//                   Import Data
//                 </Link>
//               </li>
//               <li>
//                 <Link
//                   href="/dashboard/data/export"
//                   className={`block px-4 py-2 rounded-md ${
//                     pathname === "/dashboard/data/export"
//                       ? "bg-gray-700 text-white"
//                       : "hover:bg-gray-800 hover:text-gray-300"
//                   }`}
//                 >
//                   Export Data
//                 </Link>
//               </li>
//             </ul>
//           )}
//         </li>

//         {/* Data Visualization */}
//         <li>
//           <Link
//             href="/dashboard/visualization"
//             className={`block px-4 py-2 rounded-md ${
//               pathname === "/dashboard/visualization"
//                 ? "bg-gray-700 text-white"
//                 : "hover:bg-gray-800 hover:text-gray-300"
//             }`}
//           >
//             Data Visualization
//           </Link>
//         </li>
//       </ul>
//     </div>
//   );
// }
