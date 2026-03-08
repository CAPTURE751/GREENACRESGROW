
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Settings as SettingsIcon,
  User,
  Bell,
  Shield,
  Database,
  Palette,
  Download,
  Upload,
  Save
} from "lucide-react";
import { Layout } from "@/components/Layout";
import { GeneralSettings } from "@/components/settings/GeneralSettings";
import { UserSettings } from "@/components/settings/UserSettings";
import { NotificationSettings } from "@/components/settings/NotificationSettings";

export default function Settings() {
  const [activeTab, setActiveTab] = useState('general');

  const tabs = [
    { id: 'general', name: 'General', icon: SettingsIcon },
    { id: 'users', name: 'Users', icon: User },
    { id: 'notifications', name: 'Notifications', icon: Bell },
    { id: 'security', name: 'Security', icon: Shield },
    { id: 'backup', name: 'Backup', icon: Database },
    { id: 'appearance', name: 'Appearance', icon: Palette },
  ];

  return (
    <Layout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Settings</h1>
            <p className="text-gray-600 mt-1">Configure your farm management system</p>
          </div>
          <Button className="bg-farm-green hover:bg-farm-green/90">
            <Save className="h-4 w-4 mr-2" />
            Save Changes
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Settings Navigation */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle>Settings Menu</CardTitle>
            </CardHeader>
            <CardContent>
              <nav className="space-y-2">
                {tabs.map((tab) => (
                  <Button
                    key={tab.id}
                    variant={activeTab === tab.id ? "default" : "ghost"}
                    className="w-full justify-start"
                    onClick={() => setActiveTab(tab.id)}
                  >
                    <tab.icon className="h-4 w-4 mr-2" />
                    {tab.name}
                  </Button>
                ))}
              </nav>
            </CardContent>
          </Card>

          {/* Settings Content */}
          <div className="lg:col-span-3 space-y-6">
            {activeTab === 'general' && <GeneralSettings />}

            {activeTab === 'users' && <UserSettings />}

            {activeTab === 'notifications' && <NotificationSettings />}

            {activeTab === 'backup' && (
              <Card>
                <CardHeader>
                  <CardTitle>Backup & Restore</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="p-4 border rounded-lg bg-blue-50">
                    <p className="font-medium mb-2">Last Backup</p>
                    <p className="text-sm text-muted-foreground">January 15, 2024 at 2:30 PM</p>
                  </div>
                  <div className="flex gap-4">
                    <Button className="flex-1">
                      <Download className="h-4 w-4 mr-2" />
                      Create Backup
                    </Button>
                    <Button variant="outline" className="flex-1">
                      <Upload className="h-4 w-4 mr-2" />
                      Restore Backup
                    </Button>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <p className="font-medium mb-2">Auto Backup</p>
                    <p className="text-sm text-muted-foreground mb-2">Automatically backup data daily</p>
                    <input type="checkbox" defaultChecked className="toggle" />
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
