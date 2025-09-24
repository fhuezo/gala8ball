import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertMarketSchema, insertOrderSchema, insertUserSchema } from "@shared/schema";
import { z } from "zod";
import { IStorage } from "./storage";

// Helper function to update user positions
async function updateUserPosition(
  storage: IStorage,
  userId: string,
  marketId: string,
  outcome: 'yes' | 'no',
  shares: string,
  price: string,
  amount: string
) {
  const existingPosition = await storage.getPosition(userId, marketId, outcome);

  if (existingPosition) {
    const newShares = parseFloat(existingPosition.shares) + parseFloat(shares);
    const newTotalCost = parseFloat(existingPosition.totalCost) + parseFloat(amount);
    const newAvgPrice = newTotalCost / newShares;

    await storage.updatePosition(existingPosition.id, {
      shares: newShares.toString(),
      totalCost: newTotalCost.toString(),
      avgPrice: newAvgPrice.toString(),
    });
  } else {
    await storage.createPosition({
      userId,
      marketId,
      outcome,
      shares,
      avgPrice: price,
      totalCost: amount,
    });
  }
}

// Helper function to update market prices with AMM logic
async function updateMarketPrices(
  storage: IStorage,
  marketId: string,
  outcome: 'yes' | 'no',
  side: 'buy' | 'sell',
  tradeAmount: number
) {
  const market = await storage.getMarket(marketId);
  if (!market) return;

  const newVolume = parseFloat(market.volume) + tradeAmount;
  
  // Enhanced AMM logic - larger trades have more price impact
  const baseImpact = 0.01;
  const volumeMultiplier = Math.min(tradeAmount / 1000, 0.05); // Cap at 5% impact
  const priceImpact = baseImpact + volumeMultiplier;
  
  // CRITICAL FIX: Consider both outcome and side for price impact direction
  // BUY YES or SELL NO = increases YES price
  // SELL YES or BUY NO = decreases YES price
  let yesPrice = parseFloat(market.yesPrice);
  
  if ((outcome === 'yes' && side === 'buy') || (outcome === 'no' && side === 'sell')) {
    // Increases YES price
    yesPrice = Math.min(0.95, yesPrice + priceImpact);
  } else {
    // Decreases YES price  
    yesPrice = Math.max(0.05, yesPrice - priceImpact);
  }
  
  await storage.updateMarket(marketId, {
    volume: newVolume.toString(),
    yesPrice: yesPrice.toString(),
    noPrice: (1 - yesPrice).toString(),
  });
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Markets
  app.get("/api/markets", async (req, res) => {
    try {
      const markets = await storage.getAllMarkets();
      res.json(markets);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch markets" });
    }
  });

  app.get("/api/markets/:id", async (req, res) => {
    try {
      const market = await storage.getMarket(req.params.id);
      if (!market) {
        return res.status(404).json({ error: "Market not found" });
      }
      res.json(market);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch market" });
    }
  });

  app.post("/api/markets", async (req, res) => {
    try {
      const validatedData = insertMarketSchema.parse(req.body);
      const market = await storage.createMarket(validatedData);
      res.status(201).json(market);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid market data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to create market" });
    }
  });

  app.patch("/api/markets/:id", async (req, res) => {
    try {
      const market = await storage.updateMarket(req.params.id, req.body);
      res.json(market);
    } catch (error) {
      res.status(500).json({ error: "Failed to update market" });
    }
  });

  // Market orders
  app.get("/api/markets/:id/orders", async (req, res) => {
    try {
      const orders = await storage.getMarketOrders(req.params.id);
      res.json(orders);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch orders" });
    }
  });

  // Market trades
  app.get("/api/markets/:id/trades", async (req, res) => {
    try {
      const trades = await storage.getMarketTrades(req.params.id);
      res.json(trades);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch trades" });
    }
  });

  // Users
  app.post("/api/users", async (req, res) => {
    try {
      const validatedData = insertUserSchema.parse(req.body);
      const existingUser = await storage.getUserByWalletAddress(validatedData.walletAddress!);
      
      if (existingUser) {
        return res.json(existingUser);
      }

      const user = await storage.createUser(validatedData);
      res.status(201).json(user);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid user data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to create user" });
    }
  });

  app.get("/api/users/:id/balance", async (req, res) => {
    try {
      const balance = await storage.getUserBalance(req.params.id);
      if (!balance) {
        return res.status(404).json({ error: "User balance not found" });
      }
      res.json(balance);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch user balance" });
    }
  });

  app.patch("/api/users/:id/balance", async (req, res) => {
    try {
      const { balance } = req.body;
      if (!balance || parseFloat(balance) < 0) {
        return res.status(400).json({ error: "Invalid balance amount" });
      }
      
      const updatedBalance = await storage.updateUserBalance(req.params.id, balance);
      res.json(updatedBalance);
    } catch (error) {
      res.status(500).json({ error: "Failed to update user balance" });
    }
  });

  // User positions
  app.get("/api/users/:id/positions", async (req, res) => {
    try {
      const positions = await storage.getUserPositions(req.params.id);
      res.json(positions);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch positions" });
    }
  });

  // User orders
  app.get("/api/users/:id/orders", async (req, res) => {
    try {
      const orders = await storage.getUserOrders(req.params.id);
      res.json(orders);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch orders" });
    }
  });

  // User trades
  app.get("/api/users/:id/trades", async (req, res) => {
    try {
      const trades = await storage.getUserTrades(req.params.id);
      res.json(trades);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch trades" });
    }
  });

  // Trading
  app.post("/api/orders", async (req, res) => {
    try {
      const validatedData = insertOrderSchema.parse(req.body);
      
      const market = await storage.getMarket(validatedData.marketId);
      if (!market) {
        return res.status(404).json({ error: "Market not found" });
      }

      // Get user balance and position for validation
      const userBalance = await storage.getUserBalance(validatedData.userId);
      if (!userBalance) {
        return res.status(404).json({ error: "User balance not found" });
      }

      // CRITICAL FIX: Only check cash balance for BUY orders
      if (validatedData.side === 'buy' && parseFloat(userBalance.balance) < parseFloat(validatedData.amount)) {
        return res.status(400).json({ error: "Insufficient balance" });
      }

      // Calculate current price first for validation
      const currentPrice = validatedData.outcome === 'yes' 
        ? parseFloat(market.yesPrice) 
        : parseFloat(market.noPrice);

      // For SELL orders, check shares availability upfront
      if (validatedData.side === 'sell') {
        const existingPosition = await storage.getPosition(
          validatedData.userId,
          validatedData.marketId,
          validatedData.outcome
        );
        const actualAmount = parseFloat(validatedData.amount);
        const requiredShares = actualAmount / currentPrice;
        
        if (!existingPosition || parseFloat(existingPosition.shares) < requiredShares) {
          return res.status(400).json({ 
            error: "Insufficient shares to sell",
            available: existingPosition?.shares || '0',
            required: requiredShares.toString()
          });
        }
      }

      // Calculate execution parameters based on order type

      let executionPrice = currentPrice;
      let canExecute = false;

      if (validatedData.type === 'market') {
        // Market orders execute immediately at current price
        canExecute = true;
        
        // Apply slippage protection for market orders
        const maxSlippage = parseFloat(validatedData.maxSlippage || '0.05');
        const slippageLimit = validatedData.side === 'buy' 
          ? currentPrice * (1 + maxSlippage)
          : currentPrice * (1 - maxSlippage);

        if (validatedData.maxPrice && executionPrice > parseFloat(validatedData.maxPrice)) {
          return res.status(400).json({ 
            error: "Price exceeds maximum limit",
            currentPrice: executionPrice,
            maxPrice: validatedData.maxPrice
          });
        }

        if (validatedData.minPrice && executionPrice < parseFloat(validatedData.minPrice)) {
          return res.status(400).json({ 
            error: "Price below minimum limit",
            currentPrice: executionPrice,
            minPrice: validatedData.minPrice
          });
        }
      } else if (validatedData.type === 'limit') {
        // Limit orders only execute if price conditions are met
        const limitPrice = parseFloat(validatedData.limitPrice!);
        
        if (validatedData.side === 'buy') {
          // Buy limit: execute if market price <= limit price
          canExecute = currentPrice <= limitPrice;
          executionPrice = Math.min(currentPrice, limitPrice);
        } else {
          // Sell limit: execute if market price >= limit price
          canExecute = currentPrice >= limitPrice;
          executionPrice = Math.max(currentPrice, limitPrice);
        }
      }

      // CRITICAL FIX: Override client-provided shares with server-calculated ones
      const actualAmount = parseFloat(validatedData.amount);
      const actualShares = actualAmount / executionPrice;
      const validatedDataWithServerShares = {
        ...validatedData,
        shares: actualShares.toString()
      };

      // Create the order with server-calculated shares
      const order = await storage.createOrder(validatedDataWithServerShares);

      // CRITICAL FIX: Declare trade variable in proper scope
      let trade = null;

      if (canExecute) {

        // CRITICAL FIX: Enforce slippage protection
        const maxSlippage = parseFloat(validatedData.maxSlippage || '0.05');
        const slippageBound = validatedData.side === 'buy' 
          ? currentPrice * (1 + maxSlippage)
          : currentPrice * (1 - maxSlippage);
        
        if (validatedData.side === 'buy' && executionPrice > slippageBound) {
          return res.status(400).json({ 
            error: "Price exceeds slippage tolerance",
            currentPrice,
            executionPrice,
            maxSlippage: `${(maxSlippage * 100).toFixed(1)}%`
          });
        }

        if (validatedData.side === 'sell' && executionPrice < slippageBound) {
          return res.status(400).json({ 
            error: "Price below slippage tolerance", 
            currentPrice,
            executionPrice,
            maxSlippage: `${(maxSlippage * 100).toFixed(1)}%`
          });
        }

        // CRITICAL FIX: Handle BUY vs SELL properly
        if (validatedData.side === 'buy') {
          // BUY: Deduct balance, add shares
          trade = await storage.createTrade({
            buyOrderId: order.id,
            marketId: validatedData.marketId,
            buyerId: validatedData.userId,
            outcome: validatedData.outcome,
            shares: actualShares.toString(),
            price: executionPrice.toString(),
            amount: actualAmount.toString(),
          });

          const newBalance = (parseFloat(userBalance.balance) - actualAmount).toString();
          await storage.updateUserBalance(validatedData.userId, newBalance);

          // Update or create position (add shares)
          await updateUserPosition(
            storage,
            validatedData.userId,
            validatedData.marketId,
            validatedData.outcome,
            actualShares.toString(),
            executionPrice.toString(),
            actualAmount.toString()
          );
        } else {
          // SELL: Verify shares available, reduce shares, credit balance
          const existingPosition = await storage.getPosition(
            validatedData.userId,
            validatedData.marketId,
            validatedData.outcome
          );

          if (!existingPosition || parseFloat(existingPosition.shares) < actualShares) {
            return res.status(400).json({ 
              error: "Insufficient shares to sell",
              available: existingPosition?.shares || '0',
              requested: actualShares.toString()
            });
          }

          trade = await storage.createTrade({
            sellOrderId: order.id,
            marketId: validatedData.marketId,
            sellerId: validatedData.userId,
            outcome: validatedData.outcome,
            shares: actualShares.toString(),
            price: executionPrice.toString(),
            amount: actualAmount.toString(),
          });

          // Credit balance for sell
          const newBalance = (parseFloat(userBalance.balance) + actualAmount).toString();
          await storage.updateUserBalance(validatedData.userId, newBalance);

          // CRITICAL FIX: Reduce shares from position with proper cost basis math
          const newShares = parseFloat(existingPosition.shares) - actualShares;
          if (newShares <= 0) {
            // Position fully closed
            await storage.updatePosition(existingPosition.id, {
              shares: '0',
              totalCost: '0',
              avgPrice: existingPosition.avgPrice,
            });
          } else {
            // CRITICAL FIX: Reduce cost basis proportionally by average price
            const avgPrice = parseFloat(existingPosition.avgPrice);
            const costReduction = actualShares * avgPrice;
            const newTotalCost = parseFloat(existingPosition.totalCost) - costReduction;
            
            await storage.updatePosition(existingPosition.id, {
              shares: newShares.toString(),
              totalCost: Math.max(0, newTotalCost).toString(),
              avgPrice: existingPosition.avgPrice, // Keep original avg price
            });
          }
        }

        // Update market with AMM logic
        await updateMarketPrices(storage, validatedData.marketId, validatedData.outcome, validatedData.side, actualAmount);

        // Mark order as filled
        await storage.updateOrder(order.id, { 
          status: 'filled',
          filledShares: actualShares.toString(),
          avgFillPrice: executionPrice.toString()
        });

        res.status(201).json({ 
          order: { ...order, status: 'filled' }, 
          trade,
          executed: true,
          executionPrice,
          message: `Successfully ${validatedData.side} ${actualShares.toFixed(1)} ${validatedData.outcome.toUpperCase()} shares at $${executionPrice.toFixed(3)}`
        });
      } else {
        // Order created but not executed (pending limit order)
        res.status(201).json({ 
          order: { ...order, status: 'pending' }, 
          executed: false,
          message: `Limit order created. Will execute when price ${validatedData.side === 'buy' ? 'drops to' : 'rises to'} ${validatedData.limitPrice}`
        });
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid order data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to create order" });
    }
  });

  // Analytics
  app.get("/api/stats", async (req, res) => {
    try {
      const stats = await storage.getMarketStats();
      res.json(stats);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch stats" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
