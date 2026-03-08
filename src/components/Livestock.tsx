import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useLivestock } from "@/hooks/useLivestock";
import { LivestockForm } from "@/components/LivestockForm";
import { calculateAge } from "@/lib/age-calculator";
import { 
  Plus, 
  Search, 
  Beef, 
  Calendar,
  MapPin,
  Activity,
  Heart,
  Scale,
  Loader2,
  Baby
} from "lucide-react";


const getStatusColor = (status: string) => {
  switch (status) {
    case 'healthy': return 'bg-green-100 text-green-800';
    case 'needs-attention': return 'bg-yellow-100 text-yellow-800';
    case 'sick': return 'bg-red-100 text-red-800';
    default: return 'bg-gray-100 text-gray-800';
  }
};

const getTypeIcon = (type: string) => {
  switch (type.toLowerCase()) {
    case 'cattle': return '🐄';
    case 'pig': return '🐷';
    case 'chicken': return '🐔';
    case 'sheep': return '🐑';
    default: return '🐾';
  }
};

export function Livestock() {
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { livestock, isLoading, createLivestock, isCreating } = useLivestock();
  
  const filteredLivestock = livestock.filter(animal =>
    (animal.type?.toLowerCase().includes(searchTerm.toLowerCase()) || false) ||
    (animal.breed?.toLowerCase().includes(searchTerm.toLowerCase()) || false) ||
    animal.farm_location.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleCreateLivestock = async (livestockData: any) => {
    createLivestock(livestockData);
    setIsDialogOpen(false);
  };

  // Calculate stats from real data
  const totalAnimals = livestock.length;
  const healthyAnimals = livestock.filter(animal => animal.health_status === 'healthy').length;
  const needAttentionAnimals = livestock.filter(animal => animal.health_status === 'needs_attention' || animal.health_status === 'sick').length;
  const avgWeight = livestock.length > 0 
    ? livestock.reduce((sum, animal) => sum + (animal.weight || 0), 0) / livestock.length 
    : 0;


  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Livestock Management</h1>
          <p className="text-muted-foreground">Monitor and care for your animals</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-farm-barn hover:bg-farm-barn/90 text-white">
              <Plus className="h-4 w-4 mr-2" />
              Add New Animal
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add New Animal</DialogTitle>
            </DialogHeader>
            <LivestockForm onSubmit={handleCreateLivestock} onCancel={() => setIsDialogOpen(false)} isLoading={isCreating} />
          </DialogContent>
        </Dialog>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search by name, tag, type, or breed..." 
                className="pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm">All Types</Button>
              <Button variant="outline" size="sm">Health Status</Button>
              <Button variant="outline" size="sm">Location</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Livestock Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Animals</p>
                <p className="text-2xl font-bold">{totalAnimals}</p>
              </div>
              <Beef className="h-8 w-8 text-farm-barn" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Healthy Animals</p>
                <p className="text-2xl font-bold text-green-600">
                  {healthyAnimals}
                </p>
              </div>
              <Heart className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Need Attention</p>
                <p className="text-2xl font-bold text-yellow-600">
                  {needAttentionAnimals}
                </p>
              </div>
              <Activity className="h-8 w-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Avg Weight</p>
                <p className="text-2xl font-bold">{avgWeight > 0 ? `${Math.round(avgWeight)} lbs` : 'N/A'}</p>
              </div>
              <Scale className="h-8 w-8 text-farm-sage" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="flex justify-center items-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-farm-barn" />
          <span className="ml-2 text-muted-foreground">Loading livestock...</span>
        </div>
      )}

      {/* Livestock Grid */}
      {!isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredLivestock.map((animal) => (
            <Card key={animal.id} className="hover:shadow-lg transition-shadow group">
              <div className="relative h-48 bg-gradient-to-br from-farm-earth to-farm-sage rounded-t-lg overflow-hidden">
                <img 
                  src={`https://images.unsplash.com/photo-1472396961693-142e6e269027?w=400&h=200&fit=crop`}
                  alt={animal.type}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute top-4 left-4">
                  <div className="bg-white/90 backdrop-blur-sm rounded-full p-2 text-2xl">
                    {getTypeIcon(animal.type)}
                  </div>
                </div>
                <div className="absolute top-4 right-4">
                  <Badge className={getStatusColor(animal.health_status || 'healthy')}>
                    {animal.health_status === 'healthy' ? 'Healthy' : 
                     animal.health_status === 'sick' ? 'Sick' : 'Needs Attention'}
                  </Badge>
                </div>
              </div>
              
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg">{animal.type}</CardTitle>
                    <p className="text-sm text-muted-foreground">{animal.breed} {animal.gender && `• ${animal.gender}`}</p>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    Age: {calculateAge(animal.date_of_birth, animal.date_of_birth_on_farm)}
                  </Badge>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-3">
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="flex items-center gap-2">
                      <Baby className="h-4 w-4 text-muted-foreground" />
                      <span>Age: {calculateAge(animal.date_of_birth, animal.date_of_birth_on_farm)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Scale className="h-4 w-4 text-muted-foreground" />
                      <span>{animal.weight ? `${animal.weight} lbs` : 'N/A'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <span>{animal.farm_location}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Activity className="h-4 w-4 text-muted-foreground" />
                      <span>{animal.health_status || 'Unknown'}</span>
                    </div>
                  </div>
                  
                  <div className="pt-2 border-t text-xs text-muted-foreground space-y-1">
                    {animal.date_of_birth && (
                      <div>DOB: {new Date(animal.date_of_birth).toLocaleDateString()}</div>
                    )}
                    {animal.date_of_arrival_at_farm && (
                      <div>Arrived: {new Date(animal.date_of_arrival_at_farm).toLocaleDateString()}</div>
                    )}
                    {animal.date_of_birth_on_farm && (
                      <div>Born on farm: {new Date(animal.date_of_birth_on_farm).toLocaleDateString()}</div>
                    )}
                  </div>
                </div>
                
                {animal.purchase_price && (
                  <div className="pt-2 border-t">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-muted-foreground">Purchase Price:</span>
                      <span className="font-medium">${animal.purchase_price.toLocaleString()}</span>
                    </div>
                  </div>
                )}
                
                <div className="flex gap-2 pt-2">
                  <Button size="sm" variant="outline" className="flex-1">
                    Health Log
                  </Button>
                  <Button size="sm" className="flex-1 bg-farm-barn hover:bg-farm-barn/90 text-white">
                    Update
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {filteredLivestock.length === 0 && (
        <Card>
          <CardContent className="text-center py-12">
            <Beef className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No animals found</h3>
            <p className="text-muted-foreground mb-4">
              {searchTerm ? "Try adjusting your search terms" : "Get started by adding your first animal"}
            </p>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-farm-barn hover:bg-farm-barn/90 text-white">
                  <Plus className="h-4 w-4 mr-2" />
                  Add New Animal
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Add New Animal</DialogTitle>
                </DialogHeader>
                <LivestockForm onSubmit={handleCreateLivestock} isLoading={isCreating} />
              </DialogContent>
            </Dialog>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
