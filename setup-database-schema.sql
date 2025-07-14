-- SOTA Database Schema for Git Repository Scraping
-- Run this in Supabase SQL Editor to create tables

-- Git Commit Embeddings Table
CREATE TABLE IF NOT EXISTS git_commit_embeddings (
    id BIGSERIAL PRIMARY KEY,
    commit_hash TEXT UNIQUE NOT NULL,
    repository TEXT NOT NULL,
    branch TEXT NOT NULL DEFAULT 'main',
    author TEXT NOT NULL,
    author_email TEXT NOT NULL,
    commit_date TIMESTAMPTZ NOT NULL,
    message TEXT NOT NULL,
    files_changed TEXT[] NOT NULL DEFAULT '{}',
    additions INTEGER NOT NULL DEFAULT 0,
    deletions INTEGER NOT NULL DEFAULT 0,
    embedding vector(1536) NOT NULL,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Git File Embeddings Table
CREATE TABLE IF NOT EXISTS git_file_embeddings (
    id BIGSERIAL PRIMARY KEY,
    file_path TEXT NOT NULL,
    repository TEXT NOT NULL,
    branch TEXT NOT NULL DEFAULT 'main',
    content TEXT NOT NULL,
    file_type TEXT NOT NULL,
    file_size INTEGER NOT NULL,
    last_modified TIMESTAMPTZ NOT NULL,
    embedding vector(1536) NOT NULL,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(file_path, repository, branch)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_git_commits_repo_date ON git_commit_embeddings(repository, commit_date DESC);
CREATE INDEX IF NOT EXISTS idx_git_commits_author ON git_commit_embeddings(author);
CREATE INDEX IF NOT EXISTS idx_git_commits_embedding ON git_commit_embeddings USING ivfflat (embedding vector_cosine_ops);

CREATE INDEX IF NOT EXISTS idx_git_files_repo_type ON git_file_embeddings(repository, file_type);
CREATE INDEX IF NOT EXISTS idx_git_files_path ON git_file_embeddings(file_path);
CREATE INDEX IF NOT EXISTS idx_git_files_embedding ON git_file_embeddings USING ivfflat (embedding vector_cosine_ops);

-- Vector search functions
CREATE OR REPLACE FUNCTION search_git_commits_semantic(
    query_embedding vector(1536),
    repository_filter text DEFAULT NULL,
    author_filter text DEFAULT NULL,
    match_threshold float DEFAULT 0.5,
    match_count int DEFAULT 10
)
RETURNS TABLE (
    commit_hash text,
    repository text,
    author text,
    commit_date timestamptz,
    message text,
    files_changed text[],
    similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        gcc.commit_hash,
        gcc.repository,
        gcc.author,
        gcc.commit_date,
        gcc.message,
        gcc.files_changed,
        1 - (gcc.embedding <=> query_embedding) AS similarity
    FROM git_commit_embeddings gcc
    WHERE 
        (repository_filter IS NULL OR gcc.repository = repository_filter)
        AND (author_filter IS NULL OR gcc.author ILIKE '%' || author_filter || '%')
        AND (1 - (gcc.embedding <=> query_embedding)) > match_threshold
    ORDER BY gcc.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;

CREATE OR REPLACE FUNCTION search_git_files_semantic(
    query_embedding vector(1536),
    repository_filter text DEFAULT NULL,
    file_type_filter text DEFAULT NULL,
    match_threshold float DEFAULT 0.5,
    match_count int DEFAULT 10
)
RETURNS TABLE (
    file_path text,
    repository text,
    file_type text,
    content text,
    last_modified timestamptz,
    similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        gfe.file_path,
        gfe.repository,
        gfe.file_type,
        gfe.content,
        gfe.last_modified,
        1 - (gfe.embedding <=> query_embedding) AS similarity
    FROM git_file_embeddings gfe
    WHERE 
        (repository_filter IS NULL OR gfe.repository = repository_filter)
        AND (file_type_filter IS NULL OR gfe.file_type = file_type_filter)
        AND (1 - (gfe.embedding <=> query_embedding)) > match_threshold
    ORDER BY gfe.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;

-- Update timestamp triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language plpgsql;

CREATE TRIGGER update_git_commit_embeddings_updated_at 
    BEFORE UPDATE ON git_commit_embeddings 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_git_file_embeddings_updated_at 
    BEFORE UPDATE ON git_file_embeddings 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
