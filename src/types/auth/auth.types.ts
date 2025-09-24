import z from "zod";
import { loginSchema, signupSchema } from "../../validators";
import { changePasswordSchema } from "../../validators/auth.validators";

export type SignupCredientials = z.infer<typeof signupSchema>

export type LoginCredientials = z.infer<typeof loginSchema>

export type ChangePasswordCredientials = z.infer<typeof changePasswordSchema>

export interface TokenPayload {
    id: string;
    name: string;
    email: string;
}

export interface TokenPair {
    accessToken: string;
    refreshToken: string;
}

export interface UpdatePassword {
    oldPassword: string
    newPassword: string
}