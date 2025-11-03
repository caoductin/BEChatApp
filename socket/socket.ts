import dotenv from "dotenv";
import { Server as SocketIOServer, Socket, DefaultEventsMap } from "socket.io";
import jwt from "jsonwebtoken";
import { registerUserEvents } from "./userEvent";
import Conversation from "../models/Conversation";

dotenv.config();

export function initializeSocket(server: any): SocketIOServer {
  const io = new SocketIOServer(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
  }); // socket io server instance

  io.use((socket: Socket, next) => {
    const token = socket.handshake.auth.token;

    if (!token) {
      return next(new Error("authentication faild for no token"));
    }
    jwt.verify(
      token,
      process.env.JWT_SECRET as string,
      (err: any, decoded: any) => {
        if (err) {
          return next(new Error("Authentication error: invalid token"));
        }

        // attach user data to socket
        let userData = decoded.user;
        socket.data = userData;
        socket.data.userId = userData.id;
        next();
      }
    );
  });

  io.on("connection", async (socket: Socket) => {
    const userId = socket.data.userId;
    console.log(`User connected: ${userId}, username: ${socket.data.name}`);

    // register events
    registerUserEvents(io, socket);
    registerChatEvent(io, socket);

    // join all the conversations the user is part of
    try {
      const conversations = await Conversation.find({
        participants: userId,
      }).select("_id");

      conversations.forEach((conversation) => {
        socket.join(conversation._id.toString());
      });
    } catch (error: any) {
      console.log("Error joining conversations: ", error);
    }

    socket.on("disconnect", () => {
      // user logs out
      console.log(`user disconnected: ${userId}`);
    });
  });
  return io;
}
function registerChatEvent(io: SocketIOServer<DefaultEventsMap, DefaultEventsMap, DefaultEventsMap, any>, socket: Socket<DefaultEventsMap, DefaultEventsMap, DefaultEventsMap, any>) {
  throw new Error("Function not implemented.");
}

