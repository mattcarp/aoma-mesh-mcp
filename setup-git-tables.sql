-- Create tables for Git source code indexing

CREATE TABLE IF NOT EXISTS git_commits (
    id SERIAL PRIMARY KEY,
    hash VARCHAR(40) UNIQUE NOT NULL,
    author VARCHAR(255) NOT NULL,
    commit_date TIMESTAMP NOT NULL,
    message TEXT NOT NULL,
    files TEXT[] NOT NULL,
    repository VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS git_files (
    id SERIAL PRIMARY KEY,
    path VARCHAR(1000) NOT NULL,
    content TEXT NOT NULL,
    file_size INTEGER NOT NULL,
    last_modified TIMESTAMP NOT NULL,
    language VARCHAR(50) NOT NULL,
    repository VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(path, repository)
);

-- Create indexes for better search performance
CREATE INDEX IF NOT EXISTS idx_git_commits_hash ON git_commits(hash);
CREATE INDEX IF NOT EXISTS idx_git_commits_author ON git_commits(author);
CREATE INDEX IF NOT EXISTS idx_git_commits_repository ON git_commits(repository);
CREATE INDEX IF NOT EXISTS idx_git_files_path ON git_files(path);
CREATE INDEX IF NOT EXISTS idx_git_files_language ON git_files(language);
CREATE INDEX IF NOT EXISTS idx_git_files_repository ON git_files(repository);

-- Enable full-text search on file content
ALTER TABLE git_files ADD COLUMN IF NOT EXISTS content_search tsvector;
CREATE INDEX IF NOT EXISTS idx_git_files_content_search ON git_files USING gin(content_search);

-- Create trigger to update search vector
CREATE OR REPLACE FUNCTION update_git_files_search() RETURNS trigger AS $$
BEGIN
    NEW.content_search := to_tsvector('english', NEW.content);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS git_files_search_trigger ON git_files;
CREATE TRIGGER git_files_search_trigger
    BEFORE INSERT OR UPDATE ON git_files
    FOR EACH ROW EXECUTE FUNCTION update_git_files_search();
