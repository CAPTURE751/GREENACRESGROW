import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Loader2, ShieldCheck, Lock, UserPlus, Trash2 } from 'lucide-react';
import type { Database } from '@/integrations/supabase/types';

type UserRole = Database['public']['Enums']['user_role'];
type Profile = Database['public']['Tables']['profiles']['Row'];

export function UserSettings() {
  const { user, hasRole } = useAuth();
  const { toast } = useToast();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [adding, setAdding] = useState(false);

  // New user form
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newLocation, setNewLocation] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState<UserRole>('farmer');

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
    if (!isAdmin || userId === user?.id) return;

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

  const addUser = async () => {
    if (!newName || !newEmail || !newPassword) {
      toast({ variant: 'destructive', title: 'Missing fields', description: 'Please fill in all required fields.' });
      return;
    }
    if (newPassword.length < 6) {
      toast({ variant: 'destructive', title: 'Weak password', description: 'Password must be at least 6 characters.' });
      return;
    }

    setAdding(true);
    try {
      const { data, error } = await supabase.functions.invoke('manage-users', {
        body: { action: 'create', email: newEmail, password: newPassword, name: newName, phone: newPhone, location: newLocation, role: newRole },
      });

      if (error || data?.error) {
        toast({ variant: 'destructive', title: 'Error', description: data?.error || error?.message || 'Failed to create user.' });
      } else {
        toast({ title: 'User Created', description: `${newName} has been added as ${newRole}.` });
        setNewName('');
        setNewPhone('');
        setNewEmail('');
        setNewLocation('');
        setNewPassword('');
        setNewRole('farmer');
        setAddDialogOpen(false);
        fetchProfiles();
      }
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Error', description: err.message });
    }
    setAdding(false);
  };

  const deleteUser = async (profileUserId: string, profileName: string) => {
    if (profileUserId === user?.id) return;

    setDeletingId(profileUserId);
    try {
      const { data, error } = await supabase.functions.invoke('manage-users', {
        body: { action: 'delete', user_id: profileUserId },
      });

      if (error || data?.error) {
        toast({ variant: 'destructive', title: 'Error', description: data?.error || error?.message || 'Failed to delete user.' });
      } else {
        toast({ title: 'User Deleted', description: `${profileName} has been removed from the system.` });
        setProfiles(prev => prev.filter(p => p.user_id !== profileUserId));
      }
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Error', description: err.message });
    }
    setDeletingId(null);
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
        <div className="flex items-center gap-2">
          {!isAdmin && (
            <Badge variant="outline" className="text-muted-foreground">
              <Lock className="h-3 w-3 mr-1" />
              Admin Only
            </Badge>
          )}
          {isAdmin && (
            <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="bg-farm-green hover:bg-farm-green/90">
                  <UserPlus className="h-4 w-4 mr-2" />
                  Add User
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add New User</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="new-name">Full Name *</Label>
                    <Input id="new-name" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="e.g. Jane Wanjiku" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="new-email">Email *</Label>
                    <Input id="new-email" type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="jane@example.com" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="new-password">Password *</Label>
                    <Input id="new-password" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Min 6 characters" />
                  </div>
                  <div className="space-y-2">
                    <Label>Role</Label>
                    <Select value={newRole} onValueChange={(v) => setNewRole(v as UserRole)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="farmer">Farmer</SelectItem>
                        <SelectItem value="staff">Staff</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <DialogClose asChild>
                    <Button variant="outline">Cancel</Button>
                  </DialogClose>
                  <Button onClick={addUser} disabled={adding} className="bg-farm-green hover:bg-farm-green/90">
                    {adding ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <UserPlus className="h-4 w-4 mr-2" />}
                    Create User
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>
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
                  {isAdmin && <TableHead className="w-16">Actions</TableHead>}
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
                    {isAdmin && (
                      <TableCell>
                        {profile.user_id === user?.id ? (
                          <span className="text-xs text-muted-foreground">—</span>
                        ) : (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive hover:bg-destructive/10" disabled={deletingId === profile.user_id}>
                                {deletingId === profile.user_id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Trash2 className="h-4 w-4" />
                                )}
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete User</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to permanently delete <strong>{profile.name}</strong>? This will remove their account and all associated data. This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => deleteUser(profile.user_id, profile.name)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Delete User
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
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
          {profiles.length} registered user{profiles.length !== 1 ? 's' : ''}. New users can also register via the sign-up page (default role: Farmer).
        </p>
      </CardContent>
    </Card>
  );
}
