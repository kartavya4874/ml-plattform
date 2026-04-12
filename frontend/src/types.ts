/** Shared TypeScript interfaces for the NexusML platform. */

export interface User {
    id: string
    email: string
    full_name: string | null
    username: string | null
    avatar_url: string | null
    is_public: boolean
    role: string
    is_active: boolean
    is_verified: boolean
    slug: string
    created_at: string
}

export interface Dataset {
    id: string
    name: string
    description: string | null
    is_public: boolean
    collaborator_ids: string[]
    dataset_type: string
    file_size_bytes: number
    row_count: number | null
    column_count: number | null
    status: string
    quality_score: number | null
    version: number
    created_at: string
}

export interface MLModel {
    id: string
    name: string
    description: string | null
    is_public: boolean
    collaborator_ids: string[]
    task_type: string
    framework: string
    stage: string
    metrics: any | null
    input_schema: any | null
    artifact_path: string
    version: number
    slug: string
    created_at: string
    updated_at: string
}

export interface Discussion {
    id: string
    author_id: string
    title: string
    content: string
    resource_type: string | null
    resource_id: string | null
    upvotes: number
    created_at: string
}

export interface Comment {
    id: string
    discussion_id: string
    author_id: string
    content: string
    upvotes: number
    created_at: string
}
