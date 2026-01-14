import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useHelpers } from '@/hooks/useHelpers';
import { HelperRole, CreateHelperInput } from '@/types/helper';
import { 
  UserPlus, 
  Phone, 
  MapPin, 
  Shield, 
  Heart, 
  Users,
  Loader2,
  Trash2,
  Edit
} from 'lucide-react';
import { cn } from '@/lib/utils';

const roleIcons: Record<HelperRole, React.ReactNode> = {
  security: <Shield className="h-4 w-4" />,
  medical: <Heart className="h-4 w-4" />,
  volunteer: <Users className="h-4 w-4" />,
};

const roleColors: Record<HelperRole, string> = {
  security: 'bg-blue-500/10 text-blue-500 border-blue-500/30',
  medical: 'bg-red-500/10 text-red-500 border-red-500/30',
  volunteer: 'bg-green-500/10 text-green-500 border-green-500/30',
};

export function HelperManagement() {
  const { helpers, isLoading, createHelper, deleteHelper, toggleHelperStatus } = useHelpers();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<CreateHelperInput>({
    name: '',
    mobile_number: '',
    role: 'security',
    latitude: 0,
    longitude: 0,
    is_active: true,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    const success = await createHelper(formData);
    
    if (success) {
      setFormData({
        name: '',
        mobile_number: '',
        role: 'security',
        latitude: 0,
        longitude: 0,
        is_active: true,
      });
      setIsDialogOpen(false);
    }
    
    setIsSubmitting(false);
  };

  const handleGetCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setFormData(prev => ({
            ...prev,
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          }));
        },
        (error) => {
          console.error('Error getting location:', error);
        }
      );
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (confirm(`Are you sure you want to remove ${name} from the helpers registry?`)) {
      await deleteHelper(id);
    }
  };

  return (
    <Card className="bg-card/50 border-border/50">
      <CardHeader className="flex flex-row items-center justify-between">
        <div className="space-y-1">
          <CardTitle className="text-lg flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-primary" />
            Emergency Helpers Registry
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Manage campus security, medical responders, and volunteers
          </p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <UserPlus className="h-4 w-4 mr-2" />
              Register Helper
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Register New Helper</DialogTitle>
              <DialogDescription>
                Add a new emergency responder to the registry
              </DialogDescription>
            </DialogHeader>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="John Doe"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="mobile">Mobile Number</Label>
                <Input
                  id="mobile"
                  type="tel"
                  value={formData.mobile_number}
                  onChange={(e) => setFormData(prev => ({ ...prev, mobile_number: e.target.value }))}
                  placeholder="+1234567890"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="role">Role</Label>
                <Select
                  value={formData.role}
                  onValueChange={(value: HelperRole) => setFormData(prev => ({ ...prev, role: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="security">
                      <div className="flex items-center gap-2">
                        <Shield className="h-4 w-4" />
                        Security
                      </div>
                    </SelectItem>
                    <SelectItem value="medical">
                      <div className="flex items-center gap-2">
                        <Heart className="h-4 w-4" />
                        Medical
                      </div>
                    </SelectItem>
                    <SelectItem value="volunteer">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        Volunteer
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="latitude">Latitude</Label>
                  <Input
                    id="latitude"
                    type="number"
                    step="any"
                    value={formData.latitude || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, latitude: parseFloat(e.target.value) || 0 }))}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="longitude">Longitude</Label>
                  <Input
                    id="longitude"
                    type="number"
                    step="any"
                    value={formData.longitude || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, longitude: parseFloat(e.target.value) || 0 }))}
                    required
                  />
                </div>
              </div>
              
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={handleGetCurrentLocation}
              >
                <MapPin className="h-4 w-4 mr-2" />
                Use Current Location
              </Button>
              
              <div className="flex items-center justify-between">
                <Label htmlFor="active">Active Status</Label>
                <Switch
                  id="active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_active: checked }))}
                />
              </div>
              
              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Registering...
                  </>
                ) : (
                  <>
                    <UserPlus className="h-4 w-4 mr-2" />
                    Register Helper
                  </>
                )}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </CardHeader>
      
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : helpers.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>No helpers registered yet</p>
            <p className="text-sm">Click "Register Helper" to add emergency responders</p>
          </div>
        ) : (
          <div className="rounded-md border border-border/50 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Mobile</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {helpers.map((helper) => (
                  <TableRow key={helper.id}>
                    <TableCell className="font-medium">{helper.name}</TableCell>
                    <TableCell>
                      <Badge 
                        variant="outline" 
                        className={cn('flex items-center gap-1 w-fit', roleColors[helper.role])}
                      >
                        {roleIcons[helper.role]}
                        <span className="capitalize">{helper.role}</span>
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Phone className="h-3 w-3" />
                        <span className="font-mono text-sm">{helper.mobile_number}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-muted-foreground text-sm">
                        <MapPin className="h-3 w-3" />
                        <span>{helper.latitude.toFixed(4)}, {helper.longitude.toFixed(4)}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={helper.is_active}
                        onCheckedChange={(checked) => toggleHelperStatus(helper.id, checked)}
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => handleDelete(helper.id, helper.name)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
