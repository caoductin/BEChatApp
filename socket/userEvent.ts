import { Socket, Server as SocketIOServer } from "socket.io";
import User from "../models/User";
import { genarateToken } from "../utils/token";
import Message from "../models/Message";

export function registerUserEvents(io: SocketIOServer, socket: Socket) {
  socket.on("testSocket", (data) => {
    socket.emit("testSocket", { msg: "its failed in somewhere!!!" });
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

  socket.on("getContacts", async () => {
    try {
      const currentUserId = socket.data.userId;
      if (!currentUserId) {
        socket.emit("getContact", {
          success: false,
          msg: "Unauthorized",
        });
        return;
      }

      const users = await User.find(
        { _id: { $ne: currentUserId } },
        { password: 0 } // exlude password field
      ).lean();

      const contacts = users.map((user) => ({
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        avatar: user.avatar || "",
      }));

      socket.emit("getContacts", {
        success: true,
        data: contacts,
      });
    } catch (error: any) {
      console.log("getContacts error: ", error);
      socket.emit("getContacts", {
        success: false,
        msg: "Failed to fetch contacts",
      });
    }
  });

  socket.on("newMessage", async (data) => {
    console.log("newMessage event:", data);

    try {
      const message = await Message.create({
        conversationId: data.conversationId,
        senderId: data.sender.id,
        content: data.content,
        attachement: data.attachement,
      });

      io.to(data.conversationId).emit("newMessage", {
        success: true,
        data: {
          id: message._id, // Sử dụng ID tin nhắn đã được tạo từ DB
          content: data.content,
          sender: {
            id: data.sender.id,
            name: data.sender.name,
            avatar: data.sender.avatar,
          },
          attachement: data.attachement,
          createdAt: new Date().toISOString(), // Dùng thời gian hiện tại của server
          conversationId: data.conversationId,
          tempId: data.tempId,
        },
      });
    } catch (error) {
      console.log("newMessage error: ", error);

      // Gửi thông báo lỗi cho người gửi
      socket.emit("newMessage", {
        success: false,
        msg: "Failed to send message",
      });
    }
  });

  socket.on("getMessages", async (data: { conversationId: string }) => {
    console.log("getMessages event:", data);

    try {
      const messages = await Message.find({
        conversationId: data.conversationId,
      })
        .sort({ createdAt: -1 }) // Sắp xếp: mới nhất lên trước
        .populate({
          path: "senderId", // "Populate" trường senderId
          select: "name avatar", // Chỉ lấy 2 trường name và avatar
        })
        .lean(); // <-- Tối ưu: Chuyển Mongoose Doc thành object JS thuần túy

      const messagesWithSender = messages.map((message) => {
        return {
          ...message,
          id: message._id, // Đổi tên _id thành id cho client
          sender: message.senderId, // Gán thẳng object senderId đã được populate
        };
      });

      console.log("this is data", messagesWithSender);
      socket.emit("getMessages", {
        sucess: true,
        data: messagesWithSender,
      });
    } catch (error) {
      console.log("getMessages error: ", error);

      // Gửi thông báo lỗi cho người gửi
      socket.emit("getMessages", {
        success: false,
        msg: "Failed to send message",
      });
    }
  });
}
