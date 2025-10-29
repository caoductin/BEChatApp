import mongoose from "mongoose";
import dotenv from 'dotenv';

const connectDB = async(): Promise<void> => {
    try {
        await mongoose.connect(process.env.MONGO_URI as string)
        console.log("Mongodb is connect")
    } catch(error) { 
        console.log("Error to connect mongDB", error)
    }
}

export default connectDB;