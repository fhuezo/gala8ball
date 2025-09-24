import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { PositionData, TradeData, OrderData } from "@/types/market";

export default function Portfolio() {
  const [activeTab, setActiveTab] = useState<'positions' | 'history' | 'orders'>('positions');
  const [isDepositOpen, setIsDepositOpen] = useState(false);
  const [depositAmount, setDepositAmount] = useState('');
  const currentUserId = "user1"; // Mock user ID
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: positions = [] } = useQuery<PositionData[]>({
    queryKey: ['/api/users', currentUserId, 'positions'],
  });

  const { data: trades = [] } = useQuery<TradeData[]>({
    queryKey: ['/api/users', currentUserId, 'trades'],
  });

  const { data: orders = [] } = useQuery<OrderData[]>({
    queryKey: ['/api/users', currentUserId, 'orders'],
  });

  const { data: balance } = useQuery({
    queryKey: ['/api/users', currentUserId, 'balance'],
  });

  const depositMutation = useMutation({
    mutationFn: async (amount: string) => {
      const currentBalance = parseFloat((balance as any)?.balance || '0');
      const newBalance = currentBalance + parseFloat(amount);
      const response = await apiRequest('PATCH', `/api/users/${currentUserId}/balance`, {
        balance: newBalance.toString()
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Deposit Successful",
        description: `Successfully deposited $${depositAmount} USDC`,
      });
      setIsDepositOpen(false);
      setDepositAmount('');
      queryClient.invalidateQueries({ queryKey: ['/api/users', currentUserId, 'balance'] });
    },
    onError: () => {
      toast({
        title: "Deposit Failed", 
        description: "Failed to deposit funds. Please try again.",
        variant: "destructive",
      });
    },
  });

  const tabs = [
    { id: 'positions', label: 'Positions' },
    { id: 'history', label: 'History' },
    { id: 'orders', label: 'Orders' }
  ] as const;

  const calculatePortfolioValue = () => {
    // Mock calculation - in real app, this would use current market prices
    return positions.reduce((total, position) => {
      const currentValue = parseFloat(position.shares) * 0.7; // Mock current price
      return total + currentValue;
    }, 0);
  };

  const portfolioValue = calculatePortfolioValue();
  const totalCost = positions.reduce((total, pos) => total + parseFloat(pos.totalCost), 0);
  const pnl = portfolioValue - totalCost;

  return (
    <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Portfolio</h1>
            <p className="text-muted-foreground">Track your positions and trading history</p>
          </div>
          <Dialog open={isDepositOpen} onOpenChange={setIsDepositOpen}>
            <DialogTrigger asChild>
              <Button className="bg-primary hover:bg-primary/90" data-testid="deposit-btn">
                Deposit USDC
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Deposit USDC</DialogTitle>
                <DialogDescription>
                  Add USDC to your account for trading
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="deposit-amount">Amount (USDC)</Label>
                  <Input
                    id="deposit-amount"
                    type="number"
                    placeholder="100.00"
                    value={depositAmount}
                    onChange={(e) => setDepositAmount(e.target.value)}
                    data-testid="deposit-amount-input"
                  />
                </div>
                <div className="flex justify-end space-x-3">
                  <Button
                    variant="outline" 
                    onClick={() => setIsDepositOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={() => depositMutation.mutate(depositAmount)}
                    disabled={!depositAmount || parseFloat(depositAmount) <= 0 || depositMutation.isPending}
                    data-testid="deposit-confirm-btn"
                  >
                    {depositMutation.isPending ? 'Depositing...' : `Deposit $${depositAmount || '0.00'}`}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Portfolio Summary */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-card border border-border rounded-lg p-4">
            <div className="text-2xl font-bold text-foreground" data-testid="portfolio-value">
              ${portfolioValue.toFixed(2)}
            </div>
            <div className="text-sm text-muted-foreground">Portfolio Value</div>
            <div className={`text-sm ${pnl >= 0 ? 'text-chart-1' : 'text-destructive'}`}>
              {pnl >= 0 ? '+' : ''}${pnl.toFixed(2)} ({((pnl / totalCost) * 100).toFixed(1)}%)
            </div>
          </div>
          <div className="bg-card border border-border rounded-lg p-4">
            <div className="text-2xl font-bold text-foreground" data-testid="available-balance">
              ${(balance as any)?.balance || '0.00'}
            </div>
            <div className="text-sm text-muted-foreground">Available Balance</div>
          </div>
          <div className="bg-card border border-border rounded-lg p-4">
            <div className="text-2xl font-bold text-foreground" data-testid="open-positions">
              {positions.length}
            </div>
            <div className="text-sm text-muted-foreground">Open Positions</div>
          </div>
          <div className="bg-card border border-border rounded-lg p-4">
            <div className="text-2xl font-bold text-foreground" data-testid="portfolio-pnl">
              {pnl >= 0 ? '+' : ''}${pnl.toFixed(2)}
            </div>
            <div className="text-sm text-muted-foreground">Total P&L</div>
            <div className={`text-sm ${pnl >= 0 ? 'text-chart-1' : 'text-destructive'}`}>
              {((pnl / totalCost) * 100).toFixed(1)}%
            </div>
          </div>
        </div>

        {/* Portfolio Tabs */}
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
              data-testid={`portfolio-tab-${tab.id}`}
            >
              {tab.label}
            </Button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          {activeTab === 'positions' && (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left p-4 text-sm font-medium text-muted-foreground">Market</th>
                    <th className="text-left p-4 text-sm font-medium text-muted-foreground">Position</th>
                    <th className="text-left p-4 text-sm font-medium text-muted-foreground">Shares</th>
                    <th className="text-left p-4 text-sm font-medium text-muted-foreground">Avg Price</th>
                    <th className="text-left p-4 text-sm font-medium text-muted-foreground">Current</th>
                    <th className="text-left p-4 text-sm font-medium text-muted-foreground">P&L</th>
                  </tr>
                </thead>
                <tbody>
                  {positions.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-8 text-muted-foreground">
                        No positions yet. Start trading to see your positions here.
                      </td>
                    </tr>
                  ) : (
                    positions.map((position) => {
                      const currentPrice = 0.7; // Mock current price
                      const currentValue = parseFloat(position.shares) * currentPrice;
                      const positionPnl = currentValue - parseFloat(position.totalCost);
                      
                      return (
                        <tr key={position.id} className="border-t border-border">
                          <td className="p-4">
                            <div className="font-medium text-foreground">Market #{position.marketId.slice(0, 8)}...</div>
                            <div className="text-sm text-muted-foreground">Crypto</div>
                          </td>
                          <td className="p-4">
                            <span className={`px-2 py-1 rounded-md text-sm font-medium ${
                              position.outcome === 'yes' 
                                ? 'bg-chart-1/20 text-chart-1' 
                                : 'bg-destructive/20 text-destructive'
                            }`}>
                              {position.outcome.toUpperCase()}
                            </span>
                          </td>
                          <td className="p-4 text-foreground">{parseFloat(position.shares).toFixed(1)}</td>
                          <td className="p-4 text-foreground">${parseFloat(position.avgPrice).toFixed(2)}</td>
                          <td className="p-4 text-foreground">${currentPrice.toFixed(2)}</td>
                          <td className={`p-4 ${positionPnl >= 0 ? 'text-chart-1' : 'text-destructive'}`}>
                            {positionPnl >= 0 ? '+' : ''}${positionPnl.toFixed(2)}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === 'history' && (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left p-4 text-sm font-medium text-muted-foreground">Date</th>
                    <th className="text-left p-4 text-sm font-medium text-muted-foreground">Market</th>
                    <th className="text-left p-4 text-sm font-medium text-muted-foreground">Type</th>
                    <th className="text-left p-4 text-sm font-medium text-muted-foreground">Shares</th>
                    <th className="text-left p-4 text-sm font-medium text-muted-foreground">Price</th>
                    <th className="text-left p-4 text-sm font-medium text-muted-foreground">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {trades.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-8 text-muted-foreground">
                        No trading history yet. Start trading to see your history here.
                      </td>
                    </tr>
                  ) : (
                    trades.map((trade) => (
                      <tr key={trade.id} className="border-t border-border">
                        <td className="p-4 text-foreground">
                          {new Date(trade.createdAt).toLocaleDateString()}
                        </td>
                        <td className="p-4">
                          <div className="font-medium text-foreground">Market #{trade.marketId.slice(0, 8)}...</div>
                        </td>
                        <td className="p-4">
                          <span className={`px-2 py-1 rounded-md text-sm font-medium ${
                            trade.outcome === 'yes' 
                              ? 'bg-chart-1/20 text-chart-1' 
                              : 'bg-destructive/20 text-destructive'
                          }`}>
                            BUY {trade.outcome.toUpperCase()}
                          </span>
                        </td>
                        <td className="p-4 text-foreground">{parseFloat(trade.shares).toFixed(1)}</td>
                        <td className="p-4 text-foreground">${parseFloat(trade.price).toFixed(2)}</td>
                        <td className="p-4 text-foreground">${parseFloat(trade.amount).toFixed(2)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === 'orders' && (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left p-4 text-sm font-medium text-muted-foreground">Date</th>
                    <th className="text-left p-4 text-sm font-medium text-muted-foreground">Market</th>
                    <th className="text-left p-4 text-sm font-medium text-muted-foreground">Type</th>
                    <th className="text-left p-4 text-sm font-medium text-muted-foreground">Shares</th>
                    <th className="text-left p-4 text-sm font-medium text-muted-foreground">Price</th>
                    <th className="text-left p-4 text-sm font-medium text-muted-foreground">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-8 text-muted-foreground">
                        No orders yet. Start trading to see your orders here.
                      </td>
                    </tr>
                  ) : (
                    orders.map((order) => (
                      <tr key={order.id} className="border-t border-border">
                        <td className="p-4 text-foreground">
                          {new Date(order.createdAt).toLocaleDateString()}
                        </td>
                        <td className="p-4">
                          <div className="font-medium text-foreground">Market #{order.marketId.slice(0, 8)}...</div>
                        </td>
                        <td className="p-4">
                          <span className={`px-2 py-1 rounded-md text-sm font-medium ${
                            order.outcome === 'yes' 
                              ? 'bg-chart-1/20 text-chart-1' 
                              : 'bg-destructive/20 text-destructive'
                          }`}>
                            {order.type.toUpperCase()} {order.outcome.toUpperCase()}
                          </span>
                        </td>
                        <td className="p-4 text-foreground">{parseFloat(order.shares).toFixed(1)}</td>
                        <td className="p-4 text-foreground">${parseFloat(order.price).toFixed(2)}</td>
                        <td className="p-4">
                          <span className={`px-2 py-1 rounded-md text-sm ${
                            order.filled 
                              ? 'bg-chart-1/20 text-chart-1' 
                              : 'bg-chart-2/20 text-chart-2'
                          }`}>
                            {order.filled ? 'Filled' : 'Open'}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
