import {
  NavigationMenu,
  NavigationMenuList,
  NavigationMenuItem,
  NavigationMenuLink,
} from "./ui/navigation-menu";
import { Link, useLocation } from "react-router-dom";
import React, { useState } from "react";

const navItems = [
  { label: "Главная", to: "/home" },
  { label: "Профиль", to: "/profile" },
  { label: "Кошелёк", to: "/wallet" },
  { label: "GoodVPN", to: "/goodvpn" },
  { label: "Биржа", to: "/exchange" },
  { label: "ИИ ассистент", to: "/ai" },
  { label: "Контракты", to: "/contracts" },
  { label: "Документация", to: "/docs" },
  { label: "Suno API", to: "/suno" },
];

export default function MainNavigation() {
  const location = useLocation();
  // Состояние для мобильного меню
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Обработчик открытия/закрытия мобильного меню
  const handleToggleMobileMenu = () => setIsMobileMenuOpen((v) => !v);
  // Обработчик закрытия по overlay/escape
  const handleCloseMobileMenu = () => setIsMobileMenuOpen(false);
  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Escape") handleCloseMobileMenu();
  };

  return (
    <nav className="w-full flex justify-center px-2 sm:px-0 mt-2 mb-4 max-w-screen overflow-x-auto min-w-0 fixed top-0 left-0 z-50 bg-background sm:static sm:mt-2 sm:mb-4">
      <div className="bg-card border shadow-sm rounded-lg w-full max-w-screen mx-auto overflow-x-auto min-w-0">
        {/* Desktop меню */}
        <div className="hidden sm:block">
          <NavigationMenu>
            <NavigationMenuList
              className="
                flex
                px-1 sm:px-4 py-1 gap-1 sm:gap-2
                min-w-0
                // На мобильных: горизонтальный скролл и nowrap (но меню скрыто)
                flex-nowrap overflow-x-auto scrollbar-thin scrollbar-thumb-muted-foreground/30 sm:overflow-visible sm:flex-wrap
              "
            >
              {navItems.map((item) => {
                const isActive = location.pathname === item.to;
                return (
                  <NavigationMenuItem key={item.to}>
                    <NavigationMenuLink
                      asChild
                      active={isActive}
                      className={
                        `px-3 py-2 rounded-md transition-colors duration-150 text-sm sm:text-base font-medium whitespace-nowrap ` +
                        (isActive
                          ? "bg-primary/10 text-primary font-semibold border border-primary/30"
                          : "hover:bg-muted hover:text-primary/80 text-muted-foreground border border-transparent")
                      }
                    >
                      <Link to={item.to}>{item.label}</Link>
                    </NavigationMenuLink>
                  </NavigationMenuItem>
                );
              })}
            </NavigationMenuList>
          </NavigationMenu>
        </div>
        {/* Мобильный бургер */}
        <div className="sm:hidden flex items-center px-2 py-2">
          <button
            aria-label="Открыть меню"
            aria-expanded={isMobileMenuOpen}
            aria-controls="mobile-menu-dropdown"
            tabIndex={0}
            onClick={handleToggleMobileMenu}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") handleToggleMobileMenu();
            }}
            className="p-2 rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-primary border border-border bg-background"
          >
            {/* Иконка бургера */}
            <svg
              width="28"
              height="28"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              className="text-primary"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6h16M4 12h16M4 18h16"
              />
            </svg>
          </button>
          {/* Dropdown меню */}
          {isMobileMenuOpen && (
            <div
              id="mobile-menu-dropdown"
              role="menu"
              tabIndex={-1}
              aria-label="Мобильное меню"
              className="fixed inset-0 z-50 flex flex-col items-center justify-start bg-background/95 backdrop-blur-sm pt-24 px-4 animate-fade-in"
              onKeyDown={handleKeyDown}
            >
              {/* Overlay для закрытия */}
              <div
                className="fixed inset-0 z-40 bg-black/30"
                aria-hidden="true"
                onClick={handleCloseMobileMenu}
              />
              <div className="relative z-50 w-full max-w-xs mx-auto flex flex-col gap-2 bg-card rounded-lg p-4 border shadow-lg">
                {navItems.map((item) => {
                  const isActive = location.pathname === item.to;
                  return (
                    <Link
                      key={item.to}
                      to={item.to}
                      tabIndex={0}
                      aria-label={item.label}
                      className={
                        `block w-full text-left px-4 py-3 rounded-md text-base font-medium transition-colors whitespace-nowrap ` +
                        (isActive
                          ? "bg-primary/10 text-primary font-semibold border border-primary/30"
                          : "hover:bg-muted hover:text-primary/80 text-muted-foreground border border-transparent")
                      }
                      onClick={handleCloseMobileMenu}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ")
                          handleCloseMobileMenu();
                      }}
                    >
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
