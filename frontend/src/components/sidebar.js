'use client';
import Link from "next/link";

export default function Sidebar() {
  return (
    <div className="w-64 bg-white shadow-md h-full p-4">
      <h2 className="text-xl font-bold mb-4">Menu</h2>
      <ul className="space-y-4">
        <li>
          <Link href="/dashboard/training" className="text-blue-500 hover:underline">
            Training Management
          </Link>
        </li>
        <li>
          <Link href="/dashboard/visualization" className="text-blue-500 hover:underline">
            Data Visualization
          </Link>
        </li>
        <li>
          <Link href="/dashboard/data" className="text-blue-500 hover:underline">
            Data Management
          </Link>
        </li>
      </ul>
    </div>
  );
}
