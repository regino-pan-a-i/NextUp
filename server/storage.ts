// Referenced from javascript_auth_all_persistance and javascript_database blueprints
import {
  users,
  experiences,
  friendships,
  recommendations,
  adventures,
  invitations,
  type User,
  type InsertUser,
  type Experience,
  type InsertExperience,
  type Friendship,
  type InsertFriendship,
  type Recommendation,
  type InsertRecommendation,
  type Adventure,
  type InsertAdventure,
  type Invitation,
  type InsertInvitation,
} from "@shared/schema";
import { db, pool } from "./db";
import { eq, and, or, ilike, desc } from "drizzle-orm";
import session from "express-session";
import connectPg from "connect-pg-simple";

const PostgresSessionStore = connectPg(session);

export interface IStorage {
  // Session store
  sessionStore: session.Store;
  
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  searchUsers(query: string, excludeUserId?: string): Promise<User[]>;

  // Experiences
  getExperience(id: string): Promise<Experience | undefined>;
  getExperiences(userId: string, filters?: { category?: string; status?: string }): Promise<Experience[]>;
  createExperience(experience: InsertExperience & { userId: string }): Promise<Experience>;
  updateExperience(id: string, experience: Partial<InsertExperience>): Promise<Experience | undefined>;
  deleteExperience(id: string): Promise<void>;

  // Friendships
  getFriendship(userId: string, friendId: string): Promise<Friendship | undefined>;
  getFriends(userId: string): Promise<User[]>;
  getPendingFriendRequests(userId: string): Promise<(Friendship & { user: User })[]>;
  createFriendship(friendship: InsertFriendship): Promise<Friendship>;
  updateFriendshipStatus(id: string, status: "Accepted" | "Pending"): Promise<Friendship | undefined>;
  deleteFriendship(id: string): Promise<void>;

  // Recommendations
  getRecommendation(id: string): Promise<Recommendation | undefined>;
  getReceivedRecommendations(userId: string): Promise<(Recommendation & { fromUser: User; experience: Experience })[]>;
  createRecommendation(recommendation: InsertRecommendation): Promise<Recommendation>;
  updateRecommendationStatus(id: string, status: "Accepted" | "Declined"): Promise<Recommendation | undefined>;

  // Adventures
  getAdventure(id: string): Promise<Adventure | undefined>;
  getAdventures(userId: string): Promise<Adventure[]>;
  createAdventure(adventure: InsertAdventure): Promise<Adventure>;
  updateAdventure(id: string, adventure: Partial<InsertAdventure>): Promise<Adventure | undefined>;
  deleteAdventure(id: string): Promise<void>;

  // Invitations
  getInvitation(id: string): Promise<Invitation | undefined>;
  getInvitations(userId: string): Promise<(Invitation & { adventure: Adventure })[]>;
  createInvitation(invitation: InsertInvitation): Promise<Invitation>;
  updateInvitationStatus(id: string, status: "Accepted" | "Declined"): Promise<Invitation | undefined>;
  deleteInvitation(id: string): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  sessionStore: session.Store;

  constructor() {
    this.sessionStore = new PostgresSessionStore({ pool, createTableIfMissing: true });
  }

  // Users
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async searchUsers(query: string, excludeUserId?: string): Promise<User[]> {
    let baseQuery = db.select().from(users).where(ilike(users.username, `%${query}%`));
    
    if (excludeUserId) {
      const results = await baseQuery;
      return results.filter(u => u.id !== excludeUserId);
    }
    
    return await baseQuery;
  }

  // Experiences
  async getExperience(id: string): Promise<Experience | undefined> {
    const [experience] = await db.select().from(experiences).where(eq(experiences.id, id));
    return experience || undefined;
  }

  async getExperiences(userId: string, filters?: { category?: string; status?: string }): Promise<Experience[]> {
    let query = db.select().from(experiences).where(eq(experiences.userId, userId));
    
    const results = await query.orderBy(desc(experiences.createdAt));
    
    // Apply filters in memory for simplicity
    let filtered = results;
    if (filters?.category && filters.category !== "All") {
      filtered = filtered.filter(e => e.category === filters.category);
    }
    if (filters?.status) {
      filtered = filtered.filter(e => e.status === filters.status);
    }
    
    return filtered;
  }

  async createExperience(experience: InsertExperience & { userId: string }): Promise<Experience> {
    const [newExperience] = await db.insert(experiences).values(experience).returning();
    return newExperience;
  }

  async updateExperience(id: string, experience: Partial<InsertExperience>): Promise<Experience | undefined> {
    const [updated] = await db
      .update(experiences)
      .set({ ...experience, updatedAt: new Date() })
      .where(eq(experiences.id, id))
      .returning();
    return updated || undefined;
  }

  async deleteExperience(id: string): Promise<void> {
    await db.delete(experiences).where(eq(experiences.id, id));
  }

  // Friendships
  async getFriendship(userId: string, friendId: string): Promise<Friendship | undefined> {
    const [friendship] = await db
      .select()
      .from(friendships)
      .where(
        or(
          and(eq(friendships.userId, userId), eq(friendships.friendId, friendId)),
          and(eq(friendships.userId, friendId), eq(friendships.friendId, userId))
        )
      );
    return friendship || undefined;
  }

  async getFriends(userId: string): Promise<User[]> {
    const acceptedFriendships = await db
      .select()
      .from(friendships)
      .where(
        and(
          or(eq(friendships.userId, userId), eq(friendships.friendId, userId)),
          eq(friendships.status, "Accepted")
        )
      );

    const friendIds = acceptedFriendships.map(f => 
      f.userId === userId ? f.friendId : f.userId
    );

    if (friendIds.length === 0) return [];

    const friends = await db.select().from(users).where(
      or(...friendIds.map(id => eq(users.id, id)))
    );

    return friends;
  }

  async getPendingFriendRequests(userId: string): Promise<(Friendship & { user: User })[]> {
    const pending = await db
      .select()
      .from(friendships)
      .where(
        and(
          eq(friendships.friendId, userId),
          eq(friendships.status, "Pending")
        )
      );

    const results = await Promise.all(
      pending.map(async (friendship) => {
        const [user] = await db.select().from(users).where(eq(users.id, friendship.userId));
        return { ...friendship, user };
      })
    );

    return results;
  }

  async createFriendship(friendship: InsertFriendship): Promise<Friendship> {
    const [newFriendship] = await db.insert(friendships).values(friendship).returning();
    return newFriendship;
  }

  async updateFriendshipStatus(id: string, status: "Accepted" | "Pending"): Promise<Friendship | undefined> {
    const [updated] = await db
      .update(friendships)
      .set({ status })
      .where(eq(friendships.id, id))
      .returning();
    return updated || undefined;
  }

  async deleteFriendship(id: string): Promise<void> {
    await db.delete(friendships).where(eq(friendships.id, id));
  }

  // Recommendations
  async getRecommendation(id: string): Promise<Recommendation | undefined> {
    const [recommendation] = await db.select().from(recommendations).where(eq(recommendations.id, id));
    return recommendation || undefined;
  }

  async getReceivedRecommendations(userId: string): Promise<(Recommendation & { fromUser: User; experience: Experience })[]> {
    const recs = await db
      .select()
      .from(recommendations)
      .where(eq(recommendations.toUserId, userId))
      .orderBy(desc(recommendations.createdAt));

    const results = await Promise.all(
      recs.map(async (rec) => {
        const [fromUser] = await db.select().from(users).where(eq(users.id, rec.fromUserId));
        const [experience] = await db.select().from(experiences).where(eq(experiences.id, rec.experienceId));
        return { ...rec, fromUser, experience };
      })
    );

    return results;
  }

  async createRecommendation(recommendation: InsertRecommendation): Promise<Recommendation> {
    const [newRecommendation] = await db.insert(recommendations).values(recommendation).returning();
    return newRecommendation;
  }

  async updateRecommendationStatus(id: string, status: "Accepted" | "Declined"): Promise<Recommendation | undefined> {
    const [updated] = await db
      .update(recommendations)
      .set({ status })
      .where(eq(recommendations.id, id))
      .returning();
    return updated || undefined;
  }

  // Adventures
  async getAdventure(id: string): Promise<Adventure | undefined> {
    const [adventure] = await db.select().from(adventures).where(eq(adventures.id, id));
    return adventure || undefined;
  }

  async getAdventures(userId: string): Promise<Adventure[]> {
    // Get adventures where user is the host
    const hostedAdventures = await db
      .select()
      .from(adventures)
      .where(eq(adventures.hostId, userId))
      .orderBy(desc(adventures.createdAt));

    // Get adventures where user is invited
    const invitedAdventures = await db
      .select({
        adventure: adventures,
        invitation: invitations,
      })
      .from(invitations)
      .innerJoin(adventures, eq(invitations.adventureId, adventures.id))
      .where(eq(invitations.userId, userId));

    const invited = invitedAdventures.map(item => item.adventure);

    // Combine and deduplicate
    const allAdventures = [...hostedAdventures, ...invited];
    const uniqueAdventures = Array.from(
      new Map(allAdventures.map(a => [a.id, a])).values()
    );

    return uniqueAdventures;
  }

  async createAdventure(adventure: InsertAdventure): Promise<Adventure> {
    const [newAdventure] = await db.insert(adventures).values(adventure).returning();
    return newAdventure;
  }

  async updateAdventure(id: string, adventure: Partial<InsertAdventure>): Promise<Adventure | undefined> {
    const [updated] = await db
      .update(adventures)
      .set(adventure)
      .where(eq(adventures.id, id))
      .returning();
    return updated || undefined;
  }

  async deleteAdventure(id: string): Promise<void> {
    await db.delete(adventures).where(eq(adventures.id, id));
  }

  // Invitations
  async getInvitation(id: string): Promise<Invitation | undefined> {
    const [invitation] = await db.select().from(invitations).where(eq(invitations.id, id));
    return invitation || undefined;
  }

  async getInvitations(userId: string): Promise<(Invitation & { adventure: Adventure })[]> {
    const invites = await db
      .select()
      .from(invitations)
      .where(eq(invitations.userId, userId))
      .orderBy(desc(invitations.createdAt));

    const results = await Promise.all(
      invites.map(async (invite) => {
        const [adventure] = await db.select().from(adventures).where(eq(adventures.id, invite.adventureId));
        return { ...invite, adventure };
      })
    );

    return results;
  }

  async createInvitation(invitation: InsertInvitation): Promise<Invitation> {
    const [newInvitation] = await db.insert(invitations).values(invitation).returning();
    return newInvitation;
  }

  async updateInvitationStatus(id: string, status: "Accepted" | "Declined"): Promise<Invitation | undefined> {
    const [updated] = await db
      .update(invitations)
      .set({ status })
      .where(eq(invitations.id, id))
      .returning();
    return updated || undefined;
  }

  async deleteInvitation(id: string): Promise<void> {
    await db.delete(invitations).where(eq(invitations.id, id));
  }
}

export const storage = new DatabaseStorage();
