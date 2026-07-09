import { firebaseService } from "../../services/firebase.service.js";

export class ChatController {
  async getFirebaseToken(userId: number, role: string) {
    try {
      const token = await firebaseService.generateCustomToken(userId, role);
      return { token };
    } catch (error) {
      // Log the error for internal tracking but return a clean error to the client
      console.error("[ChatController] Error generating token:", error);
      throw new Error("Unable to generate chat token at this time.");
    }
  }
}
