import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { config } from "../config/app-config.js";

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

  public async generateCustomToken(userId: number, role: string): Promise<string> {
    if (!this.initialized) {
      throw new Error("Firebase Admin SDK is not initialized.");
    }

    const uid = `user_${userId}`;
    const additionalClaims = {
      role,
    };

    try {
      return await getAuth().createCustomToken(uid, additionalClaims);
    } catch (error) {
      console.error("Error creating custom token:", error);
      throw new Error("Failed to generate Firebase custom token");
    }
  }
}

export const firebaseService = FirebaseService.getInstance();
