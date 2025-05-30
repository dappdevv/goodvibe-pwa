import {
  NavigationMenu,
  NavigationMenuList,
  NavigationMenuItem,
  NavigationMenuLink,
} from "./ui/navigation-menu";
import { Link, useLocation } from "react-router-dom";

const navItems = [
  { label: "Главная", to: "/home" },
  { label: "Профиль", to: "/profile" },
  { label: "Кошелёк", to: "/wallet" },
  { label: "Карта", to: "/map" },
  { label: "Биржа", to: "/exchange" },
  { label: "ИИ ассистент", to: "/ai" },
  { label: "Контракты", to: "/contracts" },
  { label: "Документация", to: "/docs" },
];

export default function MainNavigation() {
  const location = useLocation();
  return (
    <nav className="w-full flex justify-center py-2">
      <NavigationMenu>
        <NavigationMenuList>
          {navItems.map((item) => (
            <NavigationMenuItem key={item.to}>
              <NavigationMenuLink
                asChild
                active={location.pathname === item.to}
              >
                <Link to={item.to}>{item.label}</Link>
              </NavigationMenuLink>
            </NavigationMenuItem>
          ))}
        </NavigationMenuList>
      </NavigationMenu>
    </nav>
  );
}
