/// <reference types="@clerk/express/env" />
import 'express-serve-static-core'
interface User {
    id: string
    email: string | null
    tierId: number
    createdAt: Date
}

interface Tiers {
    name: 'FREE' | 'PRO' | 'ENTERPRISE'
    storageLimitBytes: number
    fileUploadLimitBytes: number
    membersPerWorkspaceLimit: number
    projectsPerWorkspaceLimit: number
    docsPerWorkspaceLimit: number
    draftsPerDocLimit: number
}

interface Workspaces {
    id: number
    name: string
    ownerId: string
    createdAt: Date
}

// Extend the Request interface to include auth property
declare global {
    namespace Express {
        export interface Request {
            user?: User
            tier?: Tiers
            workspace?: Workspaces
        }
    }
}
