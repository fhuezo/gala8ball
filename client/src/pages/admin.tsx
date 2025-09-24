import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { MarketData } from "@/types/market";
import { Plus } from "lucide-react";

export default function Admin() {
  const [activeTab, setActiveTab] = useState<'markets' | 'users' | 'disputes' | 'analytics'>('markets');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: markets = [] } = useQuery<MarketData[]>({
    queryKey: ['/api/markets'],
  });

  const { data: stats } = useQuery({
    queryKey: ['/api/stats'],
  });

  const createMarketMutation = useMutation({
    mutationFn: async (marketData: any) => {
      const response = await apiRequest('POST', '/api/markets', marketData);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Market Created",
        description: "New market has been created successfully",
      });
      setIsCreateModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['/api/markets'] });
      queryClient.invalidateQueries({ queryKey: ['/api/stats'] });
    },
    onError: (error: any) => {
      toast({
        title: "Creation Failed",
        description: error.message || "Failed to create market",
        variant: "destructive",
      });
    },
  });

  const tabs = [
    { id: 'markets', label: 'Markets' },
    { id: 'users', label: 'Users' },
    { id: 'disputes', label: 'Disputes' },
    { id: 'analytics', label: 'Analytics' }
  ] as const;

  const handleCreateMarket = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    
    const marketData = {
      question: formData.get('question') as string,
      description: formData.get('description') as string,
      category: formData.get('category') as string,
      oracleType: formData.get('oracleType') as string,
      oracleConfig: formData.get('oracleConfig') as string,
      endDate: new Date(formData.get('endDate') as string).toISOString(),
      resolutionSource: formData.get('resolutionSource') as string,
      tradingFee: (parseFloat(formData.get('tradingFee') as string) / 100).toString(),
    };

    createMarketMutation.mutate(marketData);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatCurrency = (amount: string) => {
    const num = parseFloat(amount);
    if (num >= 1000) {
      return `$${(num / 1000).toFixed(1)}K`;
    }
    return `$${num.toFixed(0)}`;
  };

  return (
    <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Admin Panel</h1>
            <p className="text-muted-foreground">Manage markets and platform operations</p>
          </div>
          <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
            <DialogTrigger asChild>
              <Button className="bg-primary hover:bg-primary/90" data-testid="create-market-btn">
                <Plus className="w-4 h-4 mr-2" />
                Create Market
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create New Market</DialogTitle>
                <DialogDescription>
                  Create a new binary prediction market for users to trade on
                </DialogDescription>
              </DialogHeader>
              
              <form onSubmit={handleCreateMarket} className="space-y-4">
                <div>
                  <Label htmlFor="question">Market Question *</Label>
                  <Input
                    id="question"
                    name="question"
                    placeholder="Will Bitcoin reach $150,000 by end of 2025?"
                    required
                    data-testid="market-question-input"
                  />
                </div>
                
                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    name="description"
                    placeholder="Detailed description of the market resolution criteria..."
                    rows={3}
                    data-testid="market-description-input"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="category">Category</Label>
                    <Select name="category" required>
                      <SelectTrigger data-testid="market-category-select">
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="crypto">🪙 Crypto</SelectItem>
                        <SelectItem value="politics">🗳️ Politics</SelectItem>
                        <SelectItem value="sports">⚽ Sports</SelectItem>
                        <SelectItem value="tech">💻 Tech</SelectItem>
                        <SelectItem value="entertainment">🎬 Entertainment</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="oracle">Oracle Type</Label>
                    <Select name="oracleType" required>
                      <SelectTrigger data-testid="market-oracle-select">
                        <SelectValue placeholder="Select oracle" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="coingecko">📈 CoinGecko API</SelectItem>
                        <SelectItem value="sportradar">🏆 Sportradar API</SelectItem>
                        <SelectItem value="ap_elections">📊 AP Elections API</SelectItem>
                        <SelectItem value="manual">✋ Manual Resolution</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="endDate">End Date *</Label>
                    <Input
                      id="endDate"
                      name="endDate"
                      type="datetime-local"
                      required
                      data-testid="market-end-date-input"
                    />
                  </div>
                  <div>
                    <Label htmlFor="oracleConfig">Oracle Configuration</Label>
                    <Input
                      id="oracleConfig"
                      name="oracleConfig"
                      placeholder="e.g., bitcoin, election-2024-president"
                      data-testid="market-oracle-config-input"
                    />
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="tradingFee">Trading Fee (%)</Label>
                  <Input
                    id="tradingFee"
                    name="tradingFee"
                    type="number"
                    placeholder="2"
                    step="0.1"
                    defaultValue="2"
                    data-testid="market-trading-fee-input"
                  />
                </div>

                <div>
                  <Label htmlFor="resolutionSource">Resolution Source</Label>
                  <Input
                    id="resolutionSource"
                    name="resolutionSource"
                    placeholder="e.g., CoinGecko API, Official announcement"
                    data-testid="market-resolution-source-input"
                  />
                </div>
                
                <div className="flex justify-end space-x-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsCreateModalOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={createMarketMutation.isPending}
                    data-testid="create-market-submit-btn"
                  >
                    {createMarketMutation.isPending ? 'Creating...' : 'Create Market'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Admin Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-card border border-border rounded-lg p-4">
            <div className="text-2xl font-bold text-foreground" data-testid="admin-total-markets">
              {markets.length}
            </div>
            <div className="text-sm text-muted-foreground">Total Markets</div>
          </div>
          <div className="bg-card border border-border rounded-lg p-4">
            <div className="text-2xl font-bold text-chart-2" data-testid="admin-pending-resolution">
              {markets.filter(m => m.status === 'disputed').length}
            </div>
            <div className="text-sm text-muted-foreground">Pending Resolution</div>
          </div>
          <div className="bg-card border border-border rounded-lg p-4">
            <div className="text-2xl font-bold text-foreground" data-testid="admin-total-users">
              {(stats as any)?.totalUsers || 0}
            </div>
            <div className="text-sm text-muted-foreground">Total Users</div>
          </div>
          <div className="bg-card border border-border rounded-lg p-4">
            <div className="text-2xl font-bold text-chart-1" data-testid="admin-protocol-fees">
              $0
            </div>
            <div className="text-sm text-muted-foreground">Protocol Fees</div>
          </div>
        </div>

        {/* Admin Tabs */}
        <div className="flex space-x-1 bg-muted rounded-lg p-1 w-fit">
          {tabs.map((tab) => (
            <Button
              key={tab.id}
              variant={activeTab === tab.id ? 'default' : 'ghost'}
              className={`py-2 px-4 text-sm font-medium rounded-md ${
                activeTab === tab.id 
                  ? 'bg-background text-foreground' 
                  : 'text-muted-foreground'
              }`}
              onClick={() => setActiveTab(tab.id)}
              data-testid={`admin-tab-${tab.id}`}
            >
              {tab.label}
            </Button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          {activeTab === 'markets' && (
            <>
              <div className="p-4 border-b border-border">
                <h3 className="text-lg font-semibold text-foreground">Market Management</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="text-left p-4 text-sm font-medium text-muted-foreground">Market ID</th>
                      <th className="text-left p-4 text-sm font-medium text-muted-foreground">Question</th>
                      <th className="text-left p-4 text-sm font-medium text-muted-foreground">Status</th>
                      <th className="text-left p-4 text-sm font-medium text-muted-foreground">Volume</th>
                      <th className="text-left p-4 text-sm font-medium text-muted-foreground">End Date</th>
                      <th className="text-left p-4 text-sm font-medium text-muted-foreground">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {markets.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="text-center py-8 text-muted-foreground">
                          No markets yet. Create your first market to get started.
                        </td>
                      </tr>
                    ) : (
                      markets.map((market) => (
                        <tr key={market.id} className="border-t border-border">
                          <td className="p-4 text-foreground font-mono text-sm">
                            {market.id.slice(0, 8)}...
                          </td>
                          <td className="p-4">
                            <div className="font-medium text-foreground max-w-xs truncate">
                              {market.question}
                            </div>
                            <div className="text-sm text-muted-foreground capitalize">
                              {market.category}
                            </div>
                          </td>
                          <td className="p-4">
                            <span className={`px-2 py-1 rounded-md text-sm ${
                              market.status === 'active' 
                                ? 'bg-chart-1/20 text-chart-1'
                                : market.status === 'resolved'
                                ? 'bg-muted text-muted-foreground'
                                : 'bg-chart-2/20 text-chart-2'
                            }`}>
                              {market.status.charAt(0).toUpperCase() + market.status.slice(1)}
                            </span>
                          </td>
                          <td className="p-4 text-foreground">{formatCurrency(market.volume)}</td>
                          <td className="p-4 text-foreground">{formatDate(market.endDate)}</td>
                          <td className="p-4">
                            <div className="flex space-x-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-primary hover:text-primary/80"
                                data-testid={`edit-market-${market.id}`}
                              >
                                Edit
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-destructive hover:text-destructive/80"
                                data-testid={`resolve-market-${market.id}`}
                              >
                                Resolve
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {(activeTab === 'users' || activeTab === 'disputes' || activeTab === 'analytics') && (
            <div className="p-8 text-center">
              <div className="text-muted-foreground mb-4">
                {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} management coming soon
              </div>
              <div className="text-sm text-muted-foreground">
                This section will be available in a future update
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
