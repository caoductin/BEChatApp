import { Socket, Server as SocketIOServer } from "socket.io";
import User from "../models/User";
import { genarateToken } from "../utils/token";

export function registerUserEvents(io: SocketIOServer, socket: Socket) {
  socket.on("testSocket", (data) => {
    socket.emit("testSocket", { msg: "its working!!!" });
  });

  socket.on(
    "updateProfile",
    async (data: { name?: string; avatar?: string }) => {
      console.log("update profile event", data);

      const userId = socket.data.userId;
      if (!userId) {
        return socket.emit("updateProfile", {
          success: false,
          msg: "unthorized",
        });
      }

      try {
        const updateUser = await User.findByIdAndUpdate(
          userId,
          {
            name: data.name,
            avatar: data.avatar,
          },
          {
            new: true,
          }
        );

        if (!updateUser) {
          return socket.emit("updateProfile", {
            success: false,
            msg: "user not found",
          });
        }

        //gen updated token
        const newToken = genarateToken(updateUser);
        socket.emit("updateProfile", {
          success: true,
          data: { newToken: newToken },
          msg: "Profile update success",
        });
      } catch (error) {
        console.log("Error updating profile");
        socket.emit("updateProfile", {
          success: false,
          msg: "error update profile",
        });
      }
    }
  );
}
