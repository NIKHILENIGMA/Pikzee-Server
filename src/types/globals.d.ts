/// <reference types="@clerk/express/env" />

// Extend the Request interface to include auth property
declare namespace Express {
  export interface Request {
    auth?: {
        userId: string;
        sessionId: string;
        getToken: (options?: { template?: string }) => Promise<string>;
    };
  } 
}