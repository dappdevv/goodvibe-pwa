import React from "react";
import { Home, Search, Library, User } from "lucide-react"; // или любые другие иконки

/**
 * BottomNav — нижняя навигация по design.json
 * Фон, цвета активных/неактивных иконок, индикатор
 */
const navItems = [
  { icon: Home, label: "Home", path: "/home" },
  { icon: Search, label: "Explore", path: "/explore" },
  { icon: Library, label: "Library", path: "/library" },
  { icon: User, label: "Profile", path: "/profile" },
];

export const BottomNav: React.FC<{ current: string }> = ({ current }) => (
  <nav className="fixed bottom-0 left-0 w-full bg-background flex justify-around py-2 z-40">
    {navItems.map((item) => {
      const isActive = current === item.path;
      return (
        <a
          key={item.path}
          href={item.path}
          className="flex flex-col items-center group"
          aria-current={isActive ? "page" : undefined}
        >
          <item.icon
            className={`w-6 h-6 ${
              isActive ? "text-primary" : "text-secondary"
            } transition`}
          />
          <span
            className={`text-xs mt-1 ${
              isActive ? "text-white" : "text-secondary"
            }`}
          >
            {item.label}
          </span>
          {isActive && (
            <span className="block w-1.5 h-1.5 rounded-full bg-primary mt-1" />
          )}
        </a>
      );
    })}
  </nav>
);

// Пример использования:
// <BottomNav current={location.pathname} />
