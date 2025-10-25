import { sql, relations } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, integer, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Enums for status fields
export const experienceStatusEnum = pgEnum("experience_status", [
  // "Received",
  "Pending", 
  "NextUp",
  "InProgress",
  "Completed"
]);

export const friendshipStatusEnum = pgEnum("friendship_status", [
  "Pending",
  "Accepted"
]);

export const recommendationStatusEnum = pgEnum("recommendation_status", [
  "Pending",
  "Accepted",
  "Declined"
]);

export const invitationStatusEnum = pgEnum("invitation_status", [
  "Pending",
  "Accepted",
  "Declined"
]);

export const experienceCategoryEnum = pgEnum("experience_category", [
  "Food",
  "Movies",
  "Books",
  "Places",
  "Music",
  "Activities",
  "Other"
]);

// Users table
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  photoUrl: text("photo_url"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Experiences table
export const experiences = pgTable("experiences", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  category: experienceCategoryEnum("category").notNull(),
  place: text("place"),
  moneyNeeded: integer("money_needed").default(0),
  timeRequired: integer("time_required").default(0), // in minutes
  status: experienceStatusEnum("status").default("Pending").notNull(),
  opinion: text("opinion"),
  photoUrl: text("photo_url"),
  recommendedBy: text("recommended_by"), // name or source
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Friendships table (bidirectional)
export const friendships = pgTable("friendships", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  friendId: varchar("friend_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  status: friendshipStatusEnum("status").default("Pending").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Experience recommendations
export const recommendations = pgTable("recommendations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  fromUserId: varchar("from_user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  toUserId: varchar("to_user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  experienceId: varchar("experience_id").notNull().references(() => experiences.id, { onDelete: "cascade" }),
  status: recommendationStatusEnum("status").default("Pending").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Adventures table
export const adventures = pgTable("adventures", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  experienceId: varchar("experience_id").references(() => experiences.id, { onDelete: "set null" }),
  hostId: varchar("host_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  place: text("place"),
  date: timestamp("date"),
  cost: integer("cost").default(0),
  timeRequired: integer("time_required").default(0), // in minutes
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Adventure invitations
export const invitations = pgTable("invitations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  adventureId: varchar("adventure_id").notNull().references(() => adventures.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  status: invitationStatusEnum("status").default("Pending").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  experiences: many(experiences),
  friendships: many(friendships, { relationName: "userFriendships" }),
  friendOf: many(friendships, { relationName: "friendOfUser" }),
  sentRecommendations: many(recommendations, { relationName: "sentRecommendations" }),
  receivedRecommendations: many(recommendations, { relationName: "receivedRecommendations" }),
  hostedAdventures: many(adventures),
  invitations: many(invitations),
}));

export const experiencesRelations = relations(experiences, ({ one, many }) => ({
  user: one(users, {
    fields: [experiences.userId],
    references: [users.id],
  }),
  recommendations: many(recommendations),
  adventures: many(adventures),
}));

export const friendshipsRelations = relations(friendships, ({ one }) => ({
  user: one(users, {
    fields: [friendships.userId],
    references: [users.id],
    relationName: "userFriendships",
  }),
  friend: one(users, {
    fields: [friendships.friendId],
    references: [users.id],
    relationName: "friendOfUser",
  }),
}));

export const recommendationsRelations = relations(recommendations, ({ one }) => ({
  fromUser: one(users, {
    fields: [recommendations.fromUserId],
    references: [users.id],
    relationName: "sentRecommendations",
  }),
  toUser: one(users, {
    fields: [recommendations.toUserId],
    references: [users.id],
    relationName: "receivedRecommendations",
  }),
  experience: one(experiences, {
    fields: [recommendations.experienceId],
    references: [experiences.id],
  }),
}));

export const adventuresRelations = relations(adventures, ({ one, many }) => ({
  experience: one(experiences, {
    fields: [adventures.experienceId],
    references: [experiences.id],
  }),
  host: one(users, {
    fields: [adventures.hostId],
    references: [users.id],
  }),
  invitations: many(invitations),
}));

export const invitationsRelations = relations(invitations, ({ one }) => ({
  adventure: one(adventures, {
    fields: [invitations.adventureId],
    references: [adventures.id],
  }),
  user: one(users, {
    fields: [invitations.userId],
    references: [users.id],
  }),
}));

// Insert schemas
export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export const insertExperienceSchema = createInsertSchema(experiences).omit({
  id: true,
  userId: true,
  createdAt: true,
  updatedAt: true,
});

export const insertFriendshipSchema = createInsertSchema(friendships).omit({
  id: true,
  createdAt: true,
});

export const insertRecommendationSchema = createInsertSchema(recommendations).omit({
  id: true,
  createdAt: true,
});

export const insertAdventureSchema = createInsertSchema(adventures, {
    date: z.string().pipe(z.coerce.date()),
    experienceId: z.string()
        .nullish()
        .transform(e => (e === "" ? null : e))
  }).omit({
    id: true,
    createdAt: true,
});

export const insertInvitationSchema = createInsertSchema(invitations).omit({
  id: true,
  createdAt: true,
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Experience = typeof experiences.$inferSelect;
export type InsertExperience = z.infer<typeof insertExperienceSchema>;

export type Friendship = typeof friendships.$inferSelect;
export type InsertFriendship = z.infer<typeof insertFriendshipSchema>;

export type Recommendation = typeof recommendations.$inferSelect;
export type InsertRecommendation = z.infer<typeof insertRecommendationSchema>;

export type Adventure = typeof adventures.$inferSelect;
export type InsertAdventure = z.infer<typeof insertAdventureSchema>;

export type Invitation = typeof invitations.$inferSelect;
export type InsertInvitation = z.infer<typeof insertInvitationSchema>;

// Enums as const for frontend use
export const ExperienceStatus = {
  
  Pending: "Pending",
  NextUp: "NextUp",
  InProgress: "InProgress",
  Completed: "Completed",
} as const;

export const ExperienceCategory = {
  Food: "Food",
  Movies: "Movies",
  Books: "Books",
  Places: "Places",
  Music: "Music",
  Activities: "Activities",
  Other: "Other",
} as const;

export const FriendshipStatus = {
  Pending: "Pending",
  Accepted: "Accepted",
} as const;

export const RecommendationStatus = {
  Pending: "Pending",
  Accepted: "Accepted",
  Declined: "Declined",
} as const;

export const InvitationStatus = {
  Pending: "Pending",
  Accepted: "Accepted",
  Declined: "Declined",
} as const;
