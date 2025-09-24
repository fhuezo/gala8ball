import { 
  users, markets, positions, orders, trades, userBalances,
  type User, type InsertUser,
  type Market, type InsertMarket,
  type Position, type InsertPosition,
  type Order, type InsertOrder,
  type Trade, type InsertTrade,
  type UserBalance
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, sql } from "drizzle-orm";

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByWalletAddress(walletAddress: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Markets
  getAllMarkets(): Promise<Market[]>;
  getMarket(id: string): Promise<Market | undefined>;
  createMarket(market: InsertMarket): Promise<Market>;
  updateMarket(id: string, updates: Partial<Market>): Promise<Market>;
  
  // Positions
  getUserPositions(userId: string): Promise<Position[]>;
  getPosition(userId: string, marketId: string, outcome: 'yes' | 'no'): Promise<Position | undefined>;
  createPosition(position: InsertPosition): Promise<Position>;
  updatePosition(id: string, updates: Partial<Position>): Promise<Position>;
  
  // Orders
  getMarketOrders(marketId: string): Promise<Order[]>;
  getUserOrders(userId: string): Promise<Order[]>;
  createOrder(order: InsertOrder): Promise<Order>;
  updateOrder(id: string, updates: Partial<Order>): Promise<Order>;
  
  // Trades
  getMarketTrades(marketId: string): Promise<Trade[]>;
  getUserTrades(userId: string): Promise<Trade[]>;
  createTrade(trade: InsertTrade): Promise<Trade>;
  
  // User Balances
  getUserBalance(userId: string): Promise<UserBalance | undefined>;
  updateUserBalance(userId: string, balance: string): Promise<UserBalance>;
  
  // Analytics
  getMarketStats(): Promise<{
    totalVolume: string;
    activeMarkets: number;
    totalTrades: number;
    totalUsers: number;
  }>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByWalletAddress(walletAddress: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.walletAddress, walletAddress));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    
    // Create initial balance
    await db.insert(userBalances).values({
      userId: user.id,
      balance: '1000', // Give new users 1000 USDC to start
    });
    
    return user;
  }

  async getAllMarkets(): Promise<Market[]> {
    return await db.select().from(markets).orderBy(desc(markets.createdAt));
  }

  async getMarket(id: string): Promise<Market | undefined> {
    const [market] = await db.select().from(markets).where(eq(markets.id, id));
    return market || undefined;
  }

  async createMarket(insertMarket: InsertMarket): Promise<Market> {
    const [market] = await db.insert(markets).values({
      ...insertMarket,
      yesPrice: '0.50',
      noPrice: '0.50',
      volume: '0',
      liquidity: '1000', // Initial liquidity
    }).returning();
    return market;
  }

  async updateMarket(id: string, updates: Partial<Market>): Promise<Market> {
    const [market] = await db
      .update(markets)
      .set({ ...updates, updatedAt: new Date() } as any)
      .where(eq(markets.id, id))
      .returning();
    return market;
  }

  async getUserPositions(userId: string): Promise<Position[]> {
    return await db.select().from(positions).where(eq(positions.userId, userId));
  }

  async getPosition(userId: string, marketId: string, outcome: 'yes' | 'no'): Promise<Position | undefined> {
    const [position] = await db
      .select()
      .from(positions)
      .where(
        and(
          eq(positions.userId, userId),
          eq(positions.marketId, marketId),
          eq(positions.outcome, outcome)
        )
      );
    return position || undefined;
  }

  async createPosition(insertPosition: InsertPosition): Promise<Position> {
    const [position] = await db.insert(positions).values(insertPosition).returning();
    return position;
  }

  async updatePosition(id: string, updates: Partial<Position>): Promise<Position> {
    const [position] = await db
      .update(positions)
      .set({ ...updates, updatedAt: new Date() } as any)
      .where(eq(positions.id, id))
      .returning();
    return position;
  }

  async getMarketOrders(marketId: string): Promise<Order[]> {
    return await db
      .select()
      .from(orders)
      .where(and(eq(orders.marketId, marketId), eq(orders.filled, false)))
      .orderBy(desc(orders.createdAt));
  }

  async getUserOrders(userId: string): Promise<Order[]> {
    return await db
      .select()
      .from(orders)
      .where(eq(orders.userId, userId))
      .orderBy(desc(orders.createdAt));
  }

  async createOrder(insertOrder: InsertOrder): Promise<Order> {
    const [order] = await db.insert(orders).values(insertOrder).returning();
    return order;
  }

  async updateOrder(id: string, updates: Partial<Order>): Promise<Order> {
    const [order] = await db
      .update(orders)
      .set(updates as any)
      .where(eq(orders.id, id))
      .returning();
    return order;
  }

  async getMarketTrades(marketId: string): Promise<Trade[]> {
    return await db
      .select()
      .from(trades)
      .where(eq(trades.marketId, marketId))
      .orderBy(desc(trades.createdAt));
  }

  async getUserTrades(userId: string): Promise<Trade[]> {
    return await db
      .select()
      .from(trades)
      .where(eq(trades.buyerId, userId))
      .orderBy(desc(trades.createdAt));
  }

  async createTrade(insertTrade: InsertTrade): Promise<Trade> {
    const [trade] = await db.insert(trades).values(insertTrade).returning();
    return trade;
  }

  async getUserBalance(userId: string): Promise<UserBalance | undefined> {
    const [balance] = await db.select().from(userBalances).where(eq(userBalances.userId, userId));
    return balance || undefined;
  }

  async updateUserBalance(userId: string, balance: string): Promise<UserBalance> {
    const [userBalance] = await db
      .update(userBalances)
      .set({ balance, updatedAt: new Date() })
      .where(eq(userBalances.userId, userId))
      .returning();
    return userBalance;
  }

  async getMarketStats(): Promise<{
    totalVolume: string;
    activeMarkets: number;
    totalTrades: number;
    totalUsers: number;
  }> {
    const [volumeResult] = await db
      .select({ totalVolume: sql<string>`COALESCE(SUM(${markets.volume}), 0)` })
      .from(markets);
    
    const [activeMarketsResult] = await db
      .select({ activeMarkets: sql<number>`COUNT(*)` })
      .from(markets)
      .where(eq(markets.status, 'active'));
    
    const [totalTradesResult] = await db
      .select({ totalTrades: sql<number>`COUNT(*)` })
      .from(trades);
    
    const [totalUsersResult] = await db
      .select({ totalUsers: sql<number>`COUNT(*)` })
      .from(users);

    return {
      totalVolume: volumeResult.totalVolume,
      activeMarkets: activeMarketsResult.activeMarkets,
      totalTrades: totalTradesResult.totalTrades,
      totalUsers: totalUsersResult.totalUsers,
    };
  }
}

export const storage = new DatabaseStorage();
