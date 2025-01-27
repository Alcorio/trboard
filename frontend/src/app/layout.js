import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "My trboard",
  description: "A demo trboard application",
};

// 用于定义页面的根布局
export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
          {children}
        
      </body>
    </html>
  );
}

// flex无法居中
// export default function RootLayout({ children }) {
//   return (
//     <html lang="en">
//       <body className="bg-gray-100">
//         <div className="flex">
//           {children}
//         </div>
//       </body>
//     </html>
//   );
// }

// 这样写能居中
// export default function RootLayout({ children }) {
//   return (
//     <html lang="en">
//       <body className="bg-gray-100">
//         {children}
//       </body>
//     </html>
//   );
// }

