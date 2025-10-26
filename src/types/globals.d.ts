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

import { Project } from '@/modules/projects/project.types'

// Extend the Request interface to include auth property
declare global {
    namespace Express {
        export interface Request {
            user?: User
            tier?: Tiers
            workspace?: Workspaces
            project?: Project
        }
    }
}

// import 'express'; // Important: This imports the original 'express' module

// declare module 'express-serve-static-core' {
//   interface Request {
//     customValue?: string; // Define your custom property and its type
//     // You can add more custom properties here
//   }
// }
