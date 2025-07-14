import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

interface GitCommit {
    hash: string;
    author: string;
    date: string;
    message: string;
    files: string[];
}

interface GitFile {
    path: string;
    content: string;
    size: number;
    lastModified: string;
    language: string;
}

async function indexGitRepository(repoPath: string) {
    console.log(`Indexing repository: ${repoPath}`);
    
    // Get all commits
    const commitLog = execSync(`git log --pretty=format:"%H|%an|%ad|%s" --date=iso --name-only`, {
        cwd: repoPath,
        encoding: 'utf8'
    });
    
    const commits: GitCommit[] = [];
    const commitBlocks = commitLog.split('\n\n');
    
    for (const block of commitBlocks) {
        const lines = block.trim().split('\n');
        if (lines.length < 2) continue;
        
        const [hash, author, date, message] = lines[0].split('|');
        const files = lines.slice(1).filter(f => f.trim());
        
        commits.push({
            hash,
            author,
            date,
            message,
            files
        });
    }
    
    console.log(`Found ${commits.length} commits`);
    
    // Get all current files
    const allFiles = execSync(`find . -type f -name "*.ts" -o -name "*.js" -o -name "*.py" -o -name "*.java" -o -name "*.go" -o -name "*.rs" -o -name "*.cpp" -o -name "*.c" -o -name "*.h" | grep -v node_modules | grep -v .git`, {
        cwd: repoPath,
        encoding: 'utf8'
    }).split('\n').filter(f => f.trim());
    
    console.log(`Found ${allFiles.length} source files`);
    
    const files: GitFile[] = [];
    
    for (const filePath of allFiles) {
        try {
            const fullPath = path.join(repoPath, filePath);
            const stats = fs.statSync(fullPath);
            const content = fs.readFileSync(fullPath, 'utf8');
            
            const language = getLanguage(filePath);
            
            files.push({
                path: filePath,
                content,
                size: stats.size,
                lastModified: stats.mtime.toISOString(),
                language
            });
        } catch (error) {
            console.warn(`Error reading file ${filePath}:`, error);
        }
    }
    
    // Store in Supabase
    console.log('Storing commits in Supabase...');
    const { error: commitError } = await supabase
        .from('git_commits')
        .upsert(commits.map(c => ({
            hash: c.hash,
            author: c.author,
            commit_date: c.date,
            message: c.message,
            files: c.files,
            repository: path.basename(repoPath)
        })));
    
    if (commitError) {
        console.error('Error storing commits:', commitError);
    }
    
    console.log('Storing files in Supabase...');
    const { error: fileError } = await supabase
        .from('git_files')
        .upsert(files.map(f => ({
            path: f.path,
            content: f.content,
            file_size: f.size,
            last_modified: f.lastModified,
            language: f.language,
            repository: path.basename(repoPath)
        })));
    
    if (fileError) {
        console.error('Error storing files:', fileError);
    }
    
    console.log('Git indexing complete!');
}

function getLanguage(filePath: string): string {
    const ext = path.extname(filePath).toLowerCase();
    const langMap: { [key: string]: string } = {
        '.js': 'javascript',
        '.ts': 'typescript',
        '.py': 'python',
        '.java': 'java',
        '.go': 'go',
        '.rs': 'rust',
        '.cpp': 'cpp',
        '.c': 'c',
        '.h': 'c',
        '.hpp': 'cpp',
        '.cs': 'csharp',
        '.php': 'php',
        '.rb': 'ruby',
        '.swift': 'swift',
        '.kt': 'kotlin',
        '.scala': 'scala',
        '.clj': 'clojure',
        '.hs': 'haskell',
        '.elm': 'elm',
        '.dart': 'dart',
        '.lua': 'lua',
        '.r': 'r',
        '.m': 'objective-c',
        '.pl': 'perl',
        '.sh': 'bash',
        '.sql': 'sql',
        '.json': 'json',
        '.xml': 'xml',
        '.yaml': 'yaml',
        '.yml': 'yaml',
        '.toml': 'toml',
        '.ini': 'ini',
        '.cfg': 'ini',
        '.conf': 'ini'
    };
    
    return langMap[ext] || 'text';
}

// Run indexer
const repoPath = process.argv[2] || '.';
indexGitRepository(repoPath);
