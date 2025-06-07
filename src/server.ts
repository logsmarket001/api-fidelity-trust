import express from "express";
import { createServer } from "http";
import { initializeSocketIO } from "./websocket/socket";
import { initializeNotificationSocket } from "./websocket/notificationSocket";
// ... other imports ...

const app = express();
const httpServer = createServer(app);

// Initialize both socket servers


// ... rest of your server setup ...

export default httpServer;
