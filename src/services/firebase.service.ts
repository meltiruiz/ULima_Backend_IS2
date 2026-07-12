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

  /**
   * HU23: "borrado suave" de un mensaje del chat. Marca el nodo con `deleted` +
   * quién lo eliminó (lápida "eliminado por…"), en vez de removerlo. Se hace con
   * el Admin SDK (salta las reglas RTDB), y la autorización (solo el profesor de
   * la sección) la valida el backend ANTES de llamar aquí. Devuelve si el mensaje
   * existía para poder responder 404.
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
