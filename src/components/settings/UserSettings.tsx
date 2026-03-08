import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Loader2, ShieldCheck, Lock } from 'lucide-react';
import type { Database } from '@/integrations/supabase/types';

type UserRole = Database['public']['Enums']['user_role'];
type Profile = Database['public']['Tables']['profiles']['Row'];

export function UserSettings() {
  const { user, hasRole } = useAuth();
  const { toast } = useToast();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const isAdmin = hasRole('admin');

  useEffect(() => {
    fetchProfiles();
  }, []);

  const fetchProfiles = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to load users.' });
    } else {
      setProfiles(data || []);
    }
    setLoading(false);
  };

  const updateRole = async (profileId: string, userId: string, newRole: UserRole) => {
    if (!isAdmin) {
      toast({ variant: 'destructive', title: 'Access Denied', description: 'Only admins can change roles.' });
      return;
    }
    if (userId === user?.id) {
      toast({ variant: 'destructive', title: 'Error', description: 'You cannot change your own role.' });
      return;
    }

    setUpdatingId(profileId);
    const { error } = await supabase
      .from('profiles')
      .update({ role: newRole })
      .eq('id', profileId);

    if (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to update role.' });
    } else {
      toast({ title: 'Role Updated', description: `User role changed to ${newRole}.` });
      setProfiles(prev => prev.map(p => p.id === profileId ? { ...p, role: newRole } : p));
    }
    setUpdatingId(null);
  };

  const roleBadgeVariant = (role: UserRole) => {
    switch (role) {
      case 'admin': return 'destructive';
      case 'staff': return 'default';
      default: return 'secondary';
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5" />
          User Management
        </CardTitle>
        {!isAdmin && (
          <Badge variant="outline" className="text-muted-foreground">
            <Lock className="h-3 w-3 mr-1" />
            Admin Only
          </Badge>
        )}
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : profiles.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">No users found.</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Role</TableHead>
                  {isAdmin && <TableHead>Change Role</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {profiles.map((profile) => (
                  <TableRow key={profile.id}>
                    <TableCell className="font-medium">
                      {profile.name}
                      {profile.user_id === user?.id && (
                        <span className="ml-2 text-xs text-muted-foreground">(You)</span>
                      )}
                    </TableCell>
                    <TableCell>{profile.phone || '—'}</TableCell>
                    <TableCell>{profile.farm_location || '—'}</TableCell>
                    <TableCell>
                      <Badge variant={roleBadgeVariant(profile.role)}>
                        {profile.role}
                      </Badge>
                    </TableCell>
                    {isAdmin && (
                      <TableCell>
                        {profile.user_id === user?.id ? (
                          <span className="text-xs text-muted-foreground">Cannot edit own role</span>
                        ) : (
                          <div className="flex items-center gap-2">
                            <Select
                              defaultValue={profile.role}
                              onValueChange={(value) => updateRole(profile.id, profile.user_id, value as UserRole)}
                              disabled={updatingId === profile.id}
                            >
                              <SelectTrigger className="w-32">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="farmer">Farmer</SelectItem>
                                <SelectItem value="staff">Staff</SelectItem>
                                <SelectItem value="admin">Admin</SelectItem>
                              </SelectContent>
                            </Select>
                            {updatingId === profile.id && <Loader2 className="h-4 w-4 animate-spin" />}
                          </div>
                        )}
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
        <p className="text-xs text-muted-foreground mt-4">
          {profiles.length} registered user{profiles.length !== 1 ? 's' : ''}. New users register via the sign-up page and default to the Farmer role.
        </p>
      </CardContent>
    </Card>
  );
}
