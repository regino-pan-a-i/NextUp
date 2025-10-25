import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer } from "ws";
import { setupAuth, isAuthenticated } from "./auth";
import { storage } from "./storage";
import { ObjectStorageService, ObjectNotFoundError } from "./objectStorage";
import { insertExperienceSchema, insertAdventureSchema } from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  // In-memory map of groupId -> Set<ws connections>
  const wsClients = new Map<string, Set<any>>();

  function broadcastToGroup(groupId: string, payload: unknown) {
    const clients = wsClients.get(groupId);
    if (!clients) return;
    const msg = JSON.stringify(payload);
    Array.from(clients).forEach((c) => {
      try {
        c.send(msg);
      } catch (err) {
        // ignore send errors; cleanup will occur on close
      }
    });
  }
  // Setup authentication routes: /api/register, /api/login, /api/logout, /api/user
  setupAuth(app);

  // ===== EXPERIENCES ROUTES =====
  
  // Get all experiences for current user
  app.get("/api/experiences", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user!.id;
      const { category, status } = req.query;
      
      const experiences = await storage.getExperiences(userId, {
        category: category as string,
        status: status as string,
      });
      
      res.json(experiences);
    } catch (error) {
      console.error("Error fetching experiences:", error);
      res.status(500).json({ error: "Failed to fetch experiences" });
    }
  });

  // Get single experience
  app.get("/api/experiences/:id", isAuthenticated, async (req, res) => {
    try {
      const experience = await storage.getExperience(req.params.id);
      
      if (!experience) {
        return res.status(404).json({ error: "Experience not found" });
      }
      
      // Check if user owns this experience
      if (experience.userId !== req.user!.id) {
        return res.status(403).json({ error: "Unauthorized" });
      }
      
      res.json(experience);
    } catch (error) {
      console.error("Error fetching experience:", error);
      res.status(500).json({ error: "Failed to fetch experience" });
    }
  });

  // Create experience
  app.post("/api/experiences", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user!.id;
      const experienceData = insertExperienceSchema.parse(req.body);
      
      const experience = await storage.createExperience({
        ...experienceData,
        userId,
      });
      
      res.status(201).json(experience);
    } catch (error) {
      console.error("Error creating experience:", error);
      res.status(400).json({ error: "Failed to create experience" });
    }
  });

  // Update experience
  app.patch("/api/experiences/:id", isAuthenticated, async (req, res) => {
    try {
      const experience = await storage.getExperience(req.params.id);
      
      if (!experience) {
        return res.status(404).json({ error: "Experience not found" });
      }
      
      if (experience.userId !== req.user!.id) {
        return res.status(403).json({ error: "Unauthorized" });
      }
      
      const updated = await storage.updateExperience(req.params.id, req.body);
      res.json(updated);
    } catch (error) {
      console.error("Error updating experience:", error);
      res.status(400).json({ error: "Failed to update experience" });
    }
  });

  // Delete experience
  app.delete("/api/experiences/:id", isAuthenticated, async (req, res) => {
    try {
      const experience = await storage.getExperience(req.params.id);
      
      if (!experience) {
        return res.status(404).json({ error: "Experience not found" });
      }
      
      if (experience.userId !== req.user!.id) {
        return res.status(403).json({ error: "Unauthorized" });
      }
      
      await storage.deleteExperience(req.params.id);
      res.sendStatus(204);
    } catch (error) {
      console.error("Error deleting experience:", error);
      res.status(500).json({ error: "Failed to delete experience" });
    }
  });

  // ===== FRIENDS ROUTES =====
  
  // Search for users
  app.get("/api/users/search", isAuthenticated, async (req, res) => {
    try {
      const query = req.query.q as string;
      
      if (!query || query.length < 2) {
        return res.json([]);
      }
      
      const users = await storage.searchUsers(query, req.user!.id);
      
      // Don't return passwords
      const safeUsers = users.map(({ password, ...user }) => user);
      res.json(safeUsers);
    } catch (error) {
      console.error("Error searching users:", error);
      res.status(500).json({ error: "Failed to search users" });
    }
  });

  // Get friends list
  app.get("/api/friends", isAuthenticated, async (req, res) => {
    try {
      const friends = await storage.getFriends(req.user!.id);
      
      // Don't return passwords
      const safeFriends = friends.map(({ password, ...friend }) => friend);
      res.json(safeFriends);
    } catch (error) {
      console.error("Error fetching friends:", error);
      res.status(500).json({ error: "Failed to fetch friends" });
    }
  });

  // Get pending friend requests
  app.get("/api/friends/pending", isAuthenticated, async (req, res) => {
    try {
      const requests = await storage.getPendingFriendRequests(req.user!.id);
      
      // Don't return passwords
      const safeRequests = requests.map(req => ({
        ...req,
        user: { ...req.user, password: undefined },
      }));
      
      res.json(safeRequests);
    } catch (error) {
      console.error("Error fetching pending requests:", error);
      res.status(500).json({ error: "Failed to fetch pending requests" });
    }
  });

  // Send friend request
  app.post("/api/friends/request", isAuthenticated, async (req, res) => {
    try {
      const { friendId } = req.body;
      const userId = req.user!.id;
      
      if (userId === friendId) {
        return res.status(400).json({ error: "Cannot add yourself as friend" });
      }
      
      // Check if friendship already exists
      const existing = await storage.getFriendship(userId, friendId);
      if (existing) {
        return res.status(400).json({ error: "Friendship already exists" });
      }
      
      const friendship = await storage.createFriendship({
        userId,
        friendId,
        status: "Pending",
      });
      
      res.status(201).json(friendship);
    } catch (error) {
      console.error("Error sending friend request:", error);
      res.status(400).json({ error: "Failed to send friend request" });
    }
  });

  // Accept/decline friend request
  app.patch("/api/friends/:id", isAuthenticated, async (req, res) => {
    try {
      const { status } = req.body; // "Accepted" or "Declined"
      
      if (status === "Declined") {
        await storage.deleteFriendship(req.params.id);
        return res.sendStatus(204);
      }
      
      const updated = await storage.updateFriendshipStatus(req.params.id, "Accepted");
      res.json(updated);
    } catch (error) {
      console.error("Error updating friendship:", error);
      res.status(400).json({ error: "Failed to update friendship" });
    }
  });

  // ===== RECOMMENDATIONS ROUTES =====
  
  // Get received recommendations
  app.get("/api/recommendations", isAuthenticated, async (req, res) => {
    try {
      const recommendations = await storage.getReceivedRecommendations(req.user!.id);
      
      // Remove passwords from user objects
      const safeRecs = recommendations.map(rec => ({
        ...rec,
        fromUser: { ...rec.fromUser, password: undefined },
      }));
      
      res.json(safeRecs);
    } catch (error) {
      console.error("Error fetching recommendations:", error);
      res.status(500).json({ error: "Failed to fetch recommendations" });
    }
  });

  // Send recommendation
  app.post("/api/recommendations", isAuthenticated, async (req, res) => {
    try {
      const { toUserId, experienceId } = req.body;
      const fromUserId = req.user!.id;
      
      // Verify the experience exists and belongs to the sender
      const experience = await storage.getExperience(experienceId);
      if (!experience || experience.userId !== fromUserId) {
        return res.status(404).json({ error: "Experience not found" });
      }
      
      const recommendation = await storage.createRecommendation({
        fromUserId,
        toUserId,
        experienceId,
        status: "Pending",
      });
      
      res.status(201).json(recommendation);
    } catch (error) {
      console.error("Error creating recommendation:", error);
      res.status(400).json({ error: "Failed to create recommendation" });
    }
  });

  // Accept/decline recommendation
  app.patch("/api/recommendations/:id", isAuthenticated, async (req, res) => {
    try {
      const { status } = req.body; // "Accepted" or "Declined"
      
      const recommendation = await storage.getRecommendation(req.params.id);
      if (!recommendation) {
        return res.status(404).json({ error: "Recommendation not found" });
      }
      
      if (recommendation.toUserId !== req.user!.id) {
        return res.status(403).json({ error: "Unauthorized" });
      }

      if (recommendation.status !== "Pending") {
        return res.status(400).json({ 
          error: `Recommendation already ${recommendation.status.toLowerCase()}`,
          currentStatus: recommendation.status 
        });
      }
      
      // If accepted, create a copy of the experience for this user
      if (status === "Accepted") {
        const originalExperience = await storage.getExperience(recommendation.experienceId);
        if (originalExperience) {
          const fromUser = await storage.getUser(recommendation.fromUserId);

          const {id, userId, createdAt, updatedAt, ...experienceData} = originalExperience;

          await storage.createExperience({
            ...experienceData,
            // id: undefined as any,
            userId: req.user!.id,
            status: "Pending",
            recommendedBy: fromUser?.username || "Friend",
          });
        }
      }
      
      const updated = await storage.updateRecommendationStatus(req.params.id, status);
      res.json(updated);
    } catch (error) {
      console.error("Error updating recommendation:", error);
      res.status(400).json({ error: "Failed to update recommendation" });
    }
  });

  // ===== ADVENTURES ROUTES =====
  
  // Get all adventures
  app.get("/api/adventures", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user!.id;
      const { experienceId } = req.query;

      // Fetch adventures for the user (hosted or invited)
      const adventures = await storage.getAdventures(userId);

      // If an experienceId query param is provided, filter the results
      if (experienceId) {
        const filtered = adventures.filter(a => a.experienceId === String(experienceId));
        return res.json(filtered);
      }

      res.json(adventures);
    } catch (error) {
      console.error("Error fetching adventures:", error);
      res.status(500).json({ error: "Failed to fetch adventures" });
    }
  });

  // Get single adventure
  app.get("/api/adventures/:id", isAuthenticated, async (req, res) => {
    try {
      const adventure = await storage.getAdventure(req.params.id);
      
      if (!adventure) {
        return res.status(404).json({ error: "Adventure not found" });
      }
      
      res.json(adventure);
    } catch (error) {
      console.error("Error fetching adventure:", error);
      res.status(500).json({ error: "Failed to fetch adventure" });
    }
  });

  // Create adventure
  app.post("/api/adventures", isAuthenticated, async (req, res) => {
    try {
      const hostId = req.user!.id;
      const adventureData = insertAdventureSchema.parse(req.body);
      
      const adventure = await storage.createAdventure({
        ...adventureData,
        hostId,
      });
      
      res.status(201).json(adventure);
    } catch (error) {
      console.error("Error creating adventure:", error);
      res.status(400).json({ error: "Failed to create adventure" });
    }
  });

  // Update adventure
  app.patch("/api/adventures/:id", isAuthenticated, async (req, res) => {
    try {
      const adventure = await storage.getAdventure(req.params.id);
      
      if (!adventure) {
        return res.status(404).json({ error: "Adventure not found" });
      }
      
      if (adventure.hostId !== req.user!.id) {
        return res.status(403).json({ error: "Only the host can update the adventure" });
      }
      // Ensure date fields are proper Date objects for the DB layer
      const payload = { ...req.body } as any;
      if (payload.date !== undefined && payload.date !== null) {
        // If the client sent an ISO string, convert to Date
        if (typeof payload.date === "string") {
          payload.date = new Date(payload.date);
        }
      } else if (payload.date === null) {
        // allow null to clear the date
        payload.date = null;
      }

      const updated = await storage.updateAdventure(req.params.id, payload);
      res.json(updated);
    } catch (error) {
      console.error("Error updating adventure:", error);
      res.status(400).json({ error: "Failed to update adventure" });
    }
  });

  // Delete adventure
  app.delete("/api/adventures/:id", isAuthenticated, async (req, res) => {
    try {
      const adventure = await storage.getAdventure(req.params.id);
      
      if (!adventure) {
        return res.status(404).json({ error: "Adventure not found" });
      }
      
      if (adventure.hostId !== req.user!.id) {
        return res.status(403).json({ error: "Only the host can delete the adventure" });
      }
      
      await storage.deleteAdventure(req.params.id);
      res.sendStatus(204);
    } catch (error) {
      console.error("Error deleting adventure:", error);
      res.status(500).json({ error: "Failed to delete adventure" });
    }
  });

  // ===== INVITATIONS ROUTES =====
  
  // Get invitations for current user
  app.get("/api/invitations", isAuthenticated, async (req, res) => {
    try {
      const invitations = await storage.getInvitations(req.user!.id);
      res.json(invitations);
    } catch (error) {
      console.error("Error fetching invitations:", error);
      res.status(500).json({ error: "Failed to fetch invitations" });
    }
  });

  // Create invitation
  app.post("/api/invitations", isAuthenticated, async (req, res) => {
    try {
      const { adventureId, userId } = req.body;
      
      // Verify the adventure exists and user is the host
      const adventure = await storage.getAdventure(adventureId);
      if (!adventure || adventure.hostId !== req.user!.id) {
        return res.status(403).json({ error: "Unauthorized" });
      }
      
      const invitation = await storage.createInvitation({
        adventureId,
        userId,
        status: "Pending",
      });
      
      res.status(201).json(invitation);
    } catch (error) {
      console.error("Error creating invitation:", error);
      res.status(400).json({ error: "Failed to create invitation" });
    }
  });

  // Accept/decline invitation
  app.patch("/api/invitations/:id", isAuthenticated, async (req, res) => {
    try {
      const { status } = req.body; // "Accepted" or "Declined"
      
      const invitation = await storage.getInvitation(req.params.id);
      if (!invitation) {
        return res.status(404).json({ error: "Invitation not found" });
      }
      
      if (invitation.userId !== req.user!.id) {
        return res.status(403).json({ error: "Unauthorized" });
      }
      
      const updated = await storage.updateInvitationStatus(req.params.id, status);
      res.json(updated);
    } catch (error) {
      console.error("Error updating invitation:", error);
      res.status(400).json({ error: "Failed to update invitation" });
    }
  });

  // ===== OBJECT STORAGE ROUTES =====
  // ===== GROUPS ROUTES =====

  // Get all groups for current user (owned or member)
  app.get("/api/groups", isAuthenticated, async (req, res) => {
    try {
      const groups = await storage.getGroups(req.user!.id);
      res.json(groups);
    } catch (error) {
      console.error("Error fetching groups:", error);
      res.status(500).json({ error: "Failed to fetch groups" });
    }
  });

  // Get single group
  app.get("/api/groups/:id", isAuthenticated, async (req, res) => {
    try {
      const group = await storage.getGroup(req.params.id);
      if (!group) return res.sendStatus(404);
      res.json(group);
    } catch (error) {
      console.error("Error fetching group:", error);
      res.status(500).json({ error: "Failed to fetch group" });
    }
  });

  // Create group
  app.post("/api/groups", isAuthenticated, async (req, res) => {
    try {
      const ownerId = req.user!.id;
      const { name } = req.body;
      if (!name || typeof name !== "string") return res.status(400).json({ error: "Name is required" });

      const group = await storage.createGroup({ name, ownerId });
      res.status(201).json(group);
    } catch (error) {
      console.error("Error creating group:", error);
      res.status(400).json({ error: "Failed to create group" });
    }
  });

  // Update group (owner only)
  app.patch("/api/groups/:id", isAuthenticated, async (req, res) => {
    try {
      const group = await storage.getGroup(req.params.id);
      if (!group) return res.sendStatus(404);
      if (group.ownerId !== req.user!.id) return res.sendStatus(403);

      const updated = await storage.updateGroup(req.params.id, req.body);
      res.json(updated);
    } catch (error) {
      console.error("Error updating group:", error);
      res.status(400).json({ error: "Failed to update group" });
    }
  });

  // Delete group (owner only)
  app.delete("/api/groups/:id", isAuthenticated, async (req, res) => {
    try {
      const group = await storage.getGroup(req.params.id);
      if (!group) return res.sendStatus(404);
      if (group.ownerId !== req.user!.id) return res.sendStatus(403);

      await storage.deleteGroup(req.params.id);
      res.sendStatus(204);
    } catch (error) {
      console.error("Error deleting group:", error);
      res.status(500).json({ error: "Failed to delete group" });
    }
  });

  // Group members
  app.get("/api/groups/:id/members", isAuthenticated, async (req, res) => {
    try {
      const members = await storage.getGroupMembers(req.params.id);
      res.json(members);
    } catch (error) {
      console.error("Error fetching group members:", error);
      res.status(500).json({ error: "Failed to fetch group members" });
    }
  });

  app.post("/api/groups/:id/members", isAuthenticated, async (req, res) => {
    try {
      const group = await storage.getGroup(req.params.id);
      if (!group) return res.sendStatus(404);
      // only owner can add members
      if (group.ownerId !== req.user!.id) return res.sendStatus(403);

      const { memberId } = req.body;
      const member = await storage.addGroupMember(req.params.id, memberId);
      res.status(201).json(member);
    } catch (error) {
      console.error("Error adding group member:", error);
      res.status(400).json({ error: "Failed to add group member" });
    }
  });

  app.delete("/api/groups/:id/members/:memberId", isAuthenticated, async (req, res) => {
    try {
      const group = await storage.getGroup(req.params.id);
      if (!group) return res.sendStatus(404);
      const memberId = req.params.memberId;
      // allow owner or the member themselves to remove
      if (req.user!.id !== group.ownerId && req.user!.id !== memberId) return res.sendStatus(403);

      await storage.removeGroupMember(req.params.id, memberId);
      res.sendStatus(204);
    } catch (error) {
      console.error("Error removing group member:", error);
      res.status(400).json({ error: "Failed to remove group member" });
    }
  });

  // ===== MESSAGES (group chat) =====

  // Get messages for a group (most recent first)
  app.get("/api/groups/:id/messages", isAuthenticated, async (req, res) => {
    try {
      const groupId = req.params.id;
      const messages = await storage.getMessages(groupId);
      res.json(messages);
    } catch (error) {
      console.error("Error fetching messages:", error);
      res.status(500).json({ error: "Failed to fetch messages" });
    }
  });

  // Post a message to a group. Only members or owner may post.
  app.post("/api/groups/:id/messages", isAuthenticated, async (req, res) => {
    try {
      const groupId = req.params.id;
      const group = await storage.getGroup(groupId);
      if (!group) return res.sendStatus(404);

      // Check membership/ownership
      const userId = req.user!.id;
      const members = await storage.getGroupMembers(groupId);
      const isMember = group.ownerId === userId || members.some(m => m.memberId === userId);
      if (!isMember) return res.sendStatus(403);

      const { content } = req.body;
      if (!content || typeof content !== "string") return res.status(400).json({ error: "content is required" });

      const message = await storage.createMessage(groupId, userId, content);

      // Broadcast to any connected websocket clients subscribed to this group
      try {
        broadcastToGroup(groupId, { type: "message", message });
      } catch (err) {
        // non-fatal
      }

      res.status(201).json(message);
    } catch (error) {
      console.error("Error creating message:", error);
      res.status(400).json({ error: "Failed to create message" });
    }
  });

  
  // Get upload URL for experience photo
  app.post("/api/objects/upload", isAuthenticated, async (req, res) => {
    try {
      const objectStorageService = new ObjectStorageService();
      const { uploadURL, objectPath } = await objectStorageService.getObjectEntityUploadURL();
      // Return both the presigned URL and the internal object path so the client
      // can save the path directly on the Experience when creating/updating.
      res.json({ uploadURL, objectPath });
    } catch (error) {
      console.error("Error getting upload URL:", error);
      res.status(500).json({ error: "Failed to get upload URL" });
    }
  });

  // Serve uploaded objects (with ACL check)
  app.get("/objects/:objectPath(*)", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user!.id;
      const objectStorageService = new ObjectStorageService();
      
      const objectFile = await objectStorageService.getObjectEntityFile(req.path);

      // Authorization is handled by `isAuthenticated`; objects under the
      // configured PRIVATE_OBJECT_DIR are considered accessible to authenticated users.
      objectStorageService.downloadObject(objectFile, res);
    } catch (error) {
      console.error("Error accessing object:", error);
      if (error instanceof ObjectNotFoundError) {
        return res.sendStatus(404);
      }
      return res.sendStatus(500);
    }
  });

  // Update experience with photo URL (sets ACL)
  app.put("/api/experiences/:id/photo", isAuthenticated, async (req, res) => {
    try {
      const { photoUrl } = req.body;
      
      if (!photoUrl) {
        return res.status(400).json({ error: "photoUrl is required" });
      }
      
      const experience = await storage.getExperience(req.params.id);
      if (!experience || experience.userId !== req.user!.id) {
        return res.status(403).json({ error: "Unauthorized" });
      }
      
      const userId = req.user!.id;
      const objectStorageService = new ObjectStorageService();
      
      // Normalize the provided photo URL (if the client passed an S3 URL)
      // into the internal `/objects/<id>` path used by the app.
      const objectPath = objectStorageService.normalizeObjectEntityPath(photoUrl);
      
      // Update experience with normalized object path
      const updated = await storage.updateExperience(req.params.id, {
        photoUrl: objectPath,
      });
      
      res.json(updated);
    } catch (error) {
      console.error("Error updating experience photo:", error);
      res.status(500).json({ error: "Failed to update photo" });
    }
  });

  // Update user profile photo
  app.put("/api/user/photo", isAuthenticated, async (req, res) => {
    try {
      const { photoUrl } = req.body;

      if (!photoUrl) {
        return res.status(400).json({ error: "photoUrl is required" });
      }

      const userId = req.user!.id;
      const objectStorageService = new ObjectStorageService();

      // Normalize any S3 URL into the internal /objects/<id> path
      const objectPath = objectStorageService.normalizeObjectEntityPath(photoUrl);

      // Persist photo path on user record
      const updated = await storage.updateUser(userId, { photoUrl: objectPath });

      if (!updated) return res.sendStatus(404);

      // Remove sensitive fields
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { password, ...safe } = updated as any;
      res.json(safe);
    } catch (error) {
      console.error("Error updating user photo:", error);
      res.status(500).json({ error: "Failed to update user photo" });
    }
  });

  app.get("/api/places/search", async (req, res) => {
  try {
    const { q } = req.query;
    
    if (!q || typeof q !== 'string') {
      return res.status(400).json({ error: "Search query required" });
    }

    const apiKey = process.env.GOOGLE_PLACES_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: "Google Places API not configured" });
    }

    const searchUrl = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(q)}&key=${apiKey}&fields=place_id,name,formatted_address,rating,user_ratings_total,price_level,photos,opening_hours,formatted_phone_number,website,types`;

    const response = await fetch(searchUrl);
    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({ error: data.error_message || "Places API error" });
    }

    res.json({
      results: data.results || [],
      status: data.status
    });
  } catch (error) {
    console.error("Places search error:", error);
    res.status(500).json({ error: "Failed to search places" });
  }
});

// Get place photo
app.get("/api/places/photo", async (req, res) => {
  try {
    const { photo_reference, maxwidth = "400" } = req.query;
    
    if (!photo_reference) {
      return res.status(400).json({ error: "Photo reference required" });
    }

    const apiKey = process.env.GOOGLE_PLACES_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: "Google Places API not configured" });
    }

    const photoUrl = `https://maps.googleapis.com/maps/api/place/photo?photoreference=${photo_reference}&maxwidth=${maxwidth}&key=${apiKey}`;

    // Proxy the image request
    const response = await fetch(photoUrl);
    
    if (!response.ok) {
      return res.status(404).json({ error: "Photo not found" });
    }

    // Forward the image
    const buffer = await response.arrayBuffer();
    res.set({
      'Content-Type': response.headers.get('content-type') || 'image/jpeg',
      'Cache-Control': 'public, max-age=86400', // Cache for 1 day
    });
    res.send(Buffer.from(buffer));
  } catch (error) {
    console.error("Photo fetch error:", error);
    res.status(500).json({ error: "Failed to fetch photo" });
  }
});


  const httpServer = createServer(app);

  // Setup a WebSocket server for real-time group chat broadcasts.
  try {
    const wss = new WebSocketServer({ server: httpServer, path: "/ws" });

    wss.on("connection", (ws, req) => {
      // Clients should send a JSON message to subscribe: { type: 'subscribe', groupId }
      ws.on("message", (data) => {
        try {
          const parsed = JSON.parse(String(data));
          if (parsed && parsed.type === "subscribe" && parsed.groupId) {
            const groupId = String(parsed.groupId);
            let set = wsClients.get(groupId);
            if (!set) {
              set = new Set();
              wsClients.set(groupId, set);
            }
            set.add(ws);
            // acknowledge
            ws.send(JSON.stringify({ type: "subscribed", groupId }));
          } else if (parsed && parsed.type === "unsubscribe" && parsed.groupId) {
            const groupId = String(parsed.groupId);
            const set = wsClients.get(groupId);
            if (set) set.delete(ws);
          }
        } catch (err) {
          // ignore malformed messages
        }
      });

      ws.on("close", () => {
        // remove from all groups
        for (const [groupId, set] of Array.from(wsClients.entries())) {
          if (set.has(ws)) {
            set.delete(ws);
            if (set.size === 0) wsClients.delete(groupId);
          }
        }
      });
    });
  } catch (err) {
    console.error("Failed to start WebSocket server:", err);
  }

  return httpServer;
}
