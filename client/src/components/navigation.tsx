import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Menu } from "lucide-react";

interface NavigationProps {
  currentUser: { id: string; walletAddress: string } | null;
}

export function Navigation({ currentUser }: NavigationProps) {
  const [location] = useLocation();
  const [isOpen, setIsOpen] = useState(false);

  const navItems = [
    { path: "/", label: "Markets", id: "markets" },
    { path: "/portfolio", label: "Portfolio", id: "portfolio" },
    { path: "/admin", label: "Admin", id: "admin" },
  ];

  const isActive = (path: string) => {
    if (path === "/" && location === "/") return true;
    if (path !== "/" && location.startsWith(path)) return true;
    return false;
  };

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link href="/" className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-accent rounded-lg flex items-center justify-center">
                <span className="text-accent-foreground font-bold text-sm">8B</span>
              </div>
              <span className="text-xl font-bold text-foreground">Gala 8Ball</span>
            </Link>
            <div className="hidden md:flex items-center space-x-6 ml-8">
              {navItems.map((item) => (
                <Link
                  key={item.id}
                  href={item.path}
                  data-testid={`nav-${item.id}`}
                >
                  <Button
                    variant="ghost"
                    className={`text-sm font-medium transition-colors ${
                      isActive(item.path)
                        ? "text-foreground"
                        : "text-muted-foreground hover:text-primary"
                    }`}
                  >
                    {item.label}
                  </Button>
                </Link>
              ))}
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <Button
              variant="outline"
              className="hidden sm:flex items-center space-x-2"
              data-testid="wallet-connect-btn"
              id="wallet-connect-trigger"
            >
              <div className={`w-2 h-2 rounded-full ${currentUser ? 'bg-chart-1' : 'bg-destructive'}`}></div>
              <span className="text-sm font-medium">
                {currentUser ? 'Connected' : 'Connect GalaChain'}
              </span>
            </Button>
            
            <Sheet open={isOpen} onOpenChange={setIsOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden">
                  <Menu className="w-6 h-6" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right">
                <div className="flex flex-col space-y-4 mt-8">
                  {navItems.map((item) => (
                    <Link
                      key={item.id}
                      href={item.path}
                      onClick={() => setIsOpen(false)}
                    >
                      <Button
                        variant="ghost"
                        className={`w-full justify-start ${
                          isActive(item.path)
                            ? "text-foreground"
                            : "text-muted-foreground"
                        }`}
                      >
                        {item.label}
                      </Button>
                    </Link>
                  ))}
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </nav>
  );
}
