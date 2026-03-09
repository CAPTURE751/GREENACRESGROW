
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Settings, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NotificationCenter } from "@/components/NotificationCenter";
import { useFarm } from "@/contexts/FarmContext";

export function Header() {
  const { activeFarm } = useFarm();
  const farmName = activeFarm?.name || 'My Farm';
  const farmLocation = activeFarm?.location || '';
  const logoUrl = activeFarm?.logo_url;

  return (
    <header className="h-16 border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60 flex items-center justify-between px-4 sticky top-0 z-50">
      <div className="flex items-center gap-4">
        <SidebarTrigger className="lg:hidden" />
        <div className="flex items-center gap-3">
          {logoUrl && (
            <img src={logoUrl} alt="Farm logo" className="h-10 w-10 rounded-md object-contain" />
          )}
          <div className="hidden sm:block">
            <h1 className="text-xl font-semibold text-farm-green">{farmName}</h1>
            <p className="text-xs text-muted-foreground">{farmLocation}</p>
          </div>
        </div>
      </div>
      
      <div className="flex items-center gap-2">
        <NotificationCenter />
        <Button variant="ghost" size="icon">
          <Settings className="h-5 w-5" />
        </Button>
        <Button variant="ghost" size="icon">
          <User className="h-5 w-5" />
        </Button>
      </div>
    </header>
  );
}
