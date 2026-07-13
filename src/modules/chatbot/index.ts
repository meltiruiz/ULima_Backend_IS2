import { db } from "../../db/index.js";
import { scheduleService } from "../schedule/index.js";
import { ChatbotRepository } from "./chatbot.repository.js";
import { ChatbotService } from "./chatbot.service.js";
import { ChatbotController } from "./chatbot.controller.js";
import { createChatbotRoutes } from "./chatbot.routes.js";

export const chatbotRoutes = (() => {
  const repository = new ChatbotRepository(db);
  const service = new ChatbotService(repository, scheduleService);
  const controller = new ChatbotController(service);
  return createChatbotRoutes(controller);
})();
