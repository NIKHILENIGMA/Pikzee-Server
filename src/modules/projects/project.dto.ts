export interface ProjectSummaryDto {
    id: string
    name: string
    workspaceId: string
    status: 'active' | 'inactive'
    createdBy: string
    createdAt: Date
}

export interface ProjectsResponseDto {
    projects: ProjectSummaryDto[]
}

export interface ProjectResponseDto {
    project: ProjectSummaryDto
}

export interface ProjectAccessDto {
    id: string
    userId: string
    projectId: string
    isOwner: boolean
}

export interface GrantProjectAccessResponseDto {
    access: ProjectAccessDto
}
