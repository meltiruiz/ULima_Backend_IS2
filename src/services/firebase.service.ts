import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getDatabase } from "firebase-admin/database";
import { config } from "../config/app-config.js";
import type { ChatParticipant } from "../modules/chat/chat.types.js";

class FirebaseService {
  private static instance: FirebaseService;
  private initialized = false;

  private constructor() {
    this.initialize();
  }

  public static getInstance(): FirebaseService {
    if (!FirebaseService.instance) {
      FirebaseService.instance = new FirebaseService();
    }
    return FirebaseService.instance;
  }

  private initialize() {
    if (this.initialized) return;

    const { projectId, clientEmail, privateKey, databaseUrl } = config.firebase;

    // We only initialize if we have the minimum required credentials
    if (!projectId || !clientEmail || !privateKey) {
      console.warn("⚠️ Firebase Admin SDK config is missing. Chat features will not work.");
      return;
    }

    try {
      if (getApps().length === 0) {
        // Ensure private key newlines are handled correctly whether from .env or Vercel config
        const formattedPrivateKey = privateKey.replace(/\\n/g, "\n");

        initializeApp({
          credential: cert({
            projectId,
            clientEmail,
            privateKey: formattedPrivateKey,
          }),
          databaseURL: databaseUrl,
        });
      }

      this.initialized = true;
      console.log("✅ Firebase Admin SDK initialized successfully.");
    } catch (error) {
      console.error("❌ Failed to initialize Firebase Admin SDK:", error);
    }
  }

  public async generateCustomToken(
    uid: string,
    claims: Record<string, unknown> = {},
  ): Promise<string> {
    if (!this.initialized) {
      throw new Error("Firebase Admin SDK is not initialized.");
    }

    try {
      return await getAuth().createCustomToken(uid, claims);
    } catch (error) {
      console.error("Error creating custom token:", error);
      throw new Error("Failed to generate Firebase custom token");
    }
  }

  public async upsertChatMember(participant: ChatParticipant): Promise<void> {
    if (!this.initialized) {
      throw new Error("Firebase Admin SDK is not initialized.");
    }

    if (!config.firebase.databaseUrl) {
      throw new Error("Firebase Realtime Database URL is not configured.");
    }

    try {
      await getDatabase()
        .ref(`members/${participant.sectionId}/${participant.uid}`)
        .set({
          displayName: participant.displayName,
          role: participant.role,
          roleLabel: participant.roleLabel,
          moderator: participant.isModerator,
          weight: participant.weight,
          updatedAt: Date.now(),
          expiresAt: Date.now() + 60 * 60 * 1000,
        });
    } catch (error) {
      console.error("Error writing chat member:", error);
      throw new Error("Failed to register chat member");
    }
  }
  public async getRecentMessages(
    sectionId: number,
    limit: number = 200,
    since?: number,
  ): Promise<Array<{ id: string; senderName: string; body: string; createdAt: number }>> {
    if (!this.initialized) {
      console.warn("Firebase not initialized, skipping chat message fetch");
      return [];
    }

    try {
      const ref = getDatabase().ref(`sections/${sectionId}/messages`);
      let query = ref.orderByChild("createdAt").limitToLast(limit);

      const snapshot = await query.once("value");
      const data = snapshot.val() as Record<string, { senderName?: string; body?: string; createdAt?: number }> | null;
      if (!data) return [];

      let messages = Object.entries(data).map(([id, msg]) => ({
        id,
        senderName: msg.senderName ?? "Desconocido",
        body: msg.body ?? "",
        createdAt: msg.createdAt ?? 0,
      }));

      if (since) {
        messages = messages.filter((m) => m.createdAt >= since);
      }

      return messages.sort((a, b) => a.createdAt - b.createdAt);
    } catch (error) {
      console.error("Error reading chat messages from Firebase:", error);
      return [];
    }
  }

  /**
   * HU23: soft delete a chat message by marking it instead of removing it.
   * The backend already validates authorization before calling this method.
   */
  public async softDeleteChatMessage(
    sectionId: number,
    messageId: string,
    patch: { deletedBy: string; deletedByUid: string; deletedByRole: string },
  ): Promise<{ existed: boolean }> {
    if (!this.initialized) {
      throw new Error("Firebase Admin SDK is not initialized.");
    }
    if (!config.firebase.databaseUrl) {
      throw new Error("Firebase Realtime Database URL is not configured.");
    }

    try {
      const ref = getDatabase().ref(`sections/${sectionId}/messages/${messageId}`);
      const snapshot = await ref.get();
      if (!snapshot.exists()) return { existed: false };

      await ref.update({
        deleted: true,
        deletedBy: patch.deletedBy,
        deletedByUid: patch.deletedByUid,
        deletedByRole: patch.deletedByRole,
        deletedAt: Date.now(),
      });
      return { existed: true };
    } catch (error) {
      console.error("Error soft-deleting chat message:", error);
      throw new Error("Failed to delete chat message");
    }
  }
}

export const firebaseService = FirebaseService.getInstance();
