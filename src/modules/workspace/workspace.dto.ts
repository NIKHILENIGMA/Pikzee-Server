import { Permission } from '@/core/db/schema'

export interface WorkspaceSummaryDto {
    id: string
    name: string
    ownerId: string
    workspaceLogoUrl: string | null
    permission?: string
    createdAt: Date
}

export interface WorkspaceMemberDto {
    memberId: string
    userId: string
    permission: Permission
    avatar: string | null
    joinedAt: Date
}

export interface WorkspaceProjectDto {
    id: string
    workspaceId: string
    name: string
    status: string
    createdBy: string
    createdAt: Date
}

export interface WorkspaceDetailsDto extends WorkspaceSummaryDto {
    members?: WorkspaceMemberDto[]
    projects?: WorkspaceProjectDto[]
}

export interface WorkspacesResponseDto {
    workspaces: WorkspaceSummaryDto[]
}

export interface WorkspaceResponseDto {
    workspace: WorkspaceDetailsDto
}

export interface WorkspaceStorageResponseDto {
    id: string
    name: string
    currentStorageBytes: number
    storageLimitBytes: number
    usagePercentage: number
}
