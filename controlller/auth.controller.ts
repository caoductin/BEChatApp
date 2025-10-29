import { Request, Response } from "express"
import User from "../models/User"
import bcryst from 'bcryptjs';
import { genarateToken } from "../utils/token";

export const registerUser = async(req: Request, res: Response): Promise<void> => {
    const {email, password, name,  avatar} = req.body 
    try {
        let user = await User.findOne({email})
        if(user) {
            res.status(400).json({success: false, msg: "User already exsit"})
            return;
        }

        user = new User({
            email,
            password,
            name,
            avatar: avatar || ""
        })
        const salt = await bcryst.genSalt(10)
        user.password = await bcryst.hash(password,salt)

        // save salt
        await user.save();

        //gen token
        const token = genarateToken(user);
        res.json({
            success: true,
            token
        })
    } catch(error) {
        console.log('error',error)
        res.status(500).json({success: false, msg: "Server error"})
    }

}

export const loginUser = async(req: Request, res: Response): Promise<void> => {
    const {email, password} = req.body 
    try {
        const user = await User.findOne({email})
        if(!user) {
            res.status(400).json({success: false, msg: "invalid credentials"})
            return;
        }
        //compare passswrod 
        const isMatch = await bcryst.compare(password, user.password)
        if(!isMatch) {
            res.status(400).json({success: false, msg: "invalid credentials"})
            return;
        }
        //gen token
        const token = genarateToken(user);
        res.json({
            success: true,
            token
        })
    } catch(error) {
        console.log('error',error)
        res.status(500).json({success: false, msg: "Server error"})
    }

}