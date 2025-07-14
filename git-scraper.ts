#!/usr/bin/env tsx
/**
 * SOTA Git Repository Scraper - Clone repos and generate embeddings for commits/files
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import OpenAI from 'openai';
import { execSync, spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

// Load environment variables
config();

interface GitCommit {
  hash: string;
  author: string;
  email: string;
  date: string;
  message: string;
  files: string[];
  additions: number;
  deletions: number;
  repository: string;
  branch: string;
}

interface GitFile {
  path: string;
  content: string;
  repository: string;
  branch: string;
  lastModified: string;
  size: number;
  type: string; // 'code', 'config', 'docs', etc.
}

class GitScraper {
  private supabaseClient: any;
  private openai: OpenAI;
  private workingDir: string;

  constructor() {
    // Initialize Supabase
    const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase credentials');
    }
    
    this.supabaseClient = createClient(supabaseUrl, supabaseKey);

    // Initialize OpenAI for embeddings
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('Missing OpenAI API key');
    }
    
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    // Create working directory for cloned repos
    this.workingDir = path.join(process.cwd(), 'temp_repos');
    if (!fs.existsSync(this.workingDir)) {
      fs.mkdirSync(this.workingDir, { recursive: true });
    }
  }

  /**
   * Clone a Git repository
   */
  async cloneRepository(repoUrl: string, repoName: string): Promise<string | null> {
    const repoPath = path.join(this.workingDir, repoName);
    
    try {
      // Remove existing directory if it exists
      if (fs.existsSync(repoPath)) {
        console.log(`🗑️  Removing existing ${repoName}...`);
        fs.rmSync(repoPath, { recursive: true, force: true });
      }

      console.log(`📥 Cloning ${repoUrl}...`);
      execSync(`git clone ${repoUrl} ${repoPath}`, { 
        stdio: 'pipe',
        timeout: 300000 // 5 minute timeout
      });
      
      console.log(`✅ Successfully cloned ${repoName}`);
      return repoPath;
    } catch (error) {
      console.log(`❌ Error cloning ${repoUrl}:`, error.message);
      return null;
    }
  }

  /**
   * Get Git commits from a repository
   */
  async getCommits(repoPath: string, repoName: string, maxCommits: number = 1000): Promise<GitCommit[]> {
    try {
      const gitLog = execSync(
        `git log --pretty=format:"%H|%an|%ae|%ai|%s" --stat --numstat -${maxCommits}`,
        { 
          cwd: repoPath, 
          encoding: 'utf8',
          maxBuffer: 10 * 1024 * 1024 // 10MB buffer
        }
      );

      const commits: GitCommit[] = [];
      const lines = gitLog.split('\n');
      let currentCommit: Partial<GitCommit> | null = null;
      let files: string[] = [];
      let additions = 0;
      let deletions = 0;

      for (const line of lines) {
        if (line.includes('|') && line.split('|').length === 5) {
          // Save previous commit
          if (currentCommit) {
            commits.push({
              ...currentCommit,
              files,
              additions,
              deletions,
              repository: repoName,
              branch: 'main' // Default branch
            } as GitCommit);
          }

          // Parse new commit
          const [hash, author, email, date, message] = line.split('|');
          currentCommit = { hash, author, email, date, message };
          files = [];
          additions = 0;
          deletions = 0;
        } else if (line.includes('\t') && currentCommit) {
          // Parse file stats
          const parts = line.trim().split('\t');
          if (parts.length === 3) {
            const [add, del, file] = parts;
            files.push(file);
            additions += parseInt(add) || 0;
            deletions += parseInt(del) || 0;
          }
        }
      }

      // Save last commit
      if (currentCommit) {
        commits.push({
          ...currentCommit,
          files,
          additions,
          deletions,
          repository: repoName,
          branch: 'main'
        } as GitCommit);
      }

      return commits;
    } catch (error) {
      console.log(`❌ Error getting commits from ${repoName}:`, error.message);
      return [];
    }
  }

  /**
   * Get source files from repository
   */
  async getSourceFiles(repoPath: string, repoName: string): Promise<GitFile[]> {
    try {
      const files: GitFile[] = [];
      const extensions = ['.ts', '.js', '.tsx', '.jsx', '.py', '.java', '.go', '.rs', '.cpp', '.c', '.h', '.md', '.json', '.yaml', '.yml', '.toml'];
      
      const findFiles = (dir: string, relativePath: string = '') => {
        const items = fs.readdirSync(dir);
        
        for (const item of items) {
          const fullPath = path.join(dir, item);
          const relPath = path.join(relativePath, item);
          
          // Skip hidden directories and common build/cache directories
          if (item.startsWith('.') || ['node_modules', 'target', 'build', 'dist', '__pycache__'].includes(item)) {
            continue;
          }
          
          const stats = fs.statSync(fullPath);
          
          if (stats.isDirectory()) {
            findFiles(fullPath, relPath);
          } else if (stats.isFile()) {
            const ext = path.extname(item).toLowerCase();
            
            if (extensions.includes(ext) && stats.size < 100000) { // Max 100KB files
              try {
                const content = fs.readFileSync(fullPath, 'utf8');
                files.push({
                  path: relPath,
                  content,
                  repository: repoName,
                  branch: 'main',
                  lastModified: stats.mtime.toISOString(),
                  size: stats.size,
                  type: this.getFileType(ext)
                });
              } catch (error) {
                // Skip files that can't be read as UTF-8
              }
            }
          }
        }
      };

      findFiles(repoPath);
      return files;
    } catch (error) {
      console.log(`❌ Error getting source files from ${repoName}:`, error.message);
      return [];
    }
  }

  /**
   * Classify file type based on extension
   */
  private getFileType(extension: string): string {
    const typeMap = {
      '.ts': 'typescript',
      '.js': 'javascript', 
      '.tsx': 'react',
      '.jsx': 'react',
      '.py': 'python',
      '.java': 'java',
      '.go': 'go',
      '.rs': 'rust',
      '.cpp': 'cpp',
      '.c': 'c',
      '.h': 'header',
      '.md': 'markdown',
      '.json': 'config',
      '.yaml': 'config',
      '.yml': 'config',
      '.toml': 'config'
    };
    
    return typeMap[extension] || 'other';
  }

  /**
   * Generate embedding for text content
   */
  async generateEmbedding(text: string): Promise<number[] | null> {
    try {
      // Truncate text if too long (max ~8000 tokens)
      const maxLength = 30000;
      const truncatedText = text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
      
      const response = await this.openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: truncatedText,
        encoding_format: 'float'
      });

      return response.data[0].embedding;
    } catch (error) {
      console.log(`❌ Error generating embedding:`, error.message);
      return null;
    }
  }

  /**
   * Store Git commits in Supabase
   */
  async storeCommits(commits: GitCommit[]): Promise<number> {
    let stored = 0;
    
    for (const commit of commits) {
      try {
        // Create text for embedding
        const embeddingText = `${commit.message} ${commit.files.join(' ')}`;
        const embedding = await this.generateEmbedding(embeddingText);
        
        if (!embedding) continue;

        const commitData = {
          commit_hash: commit.hash,
          repository: commit.repository,
          branch: commit.branch,
          author: commit.author,
          author_email: commit.email,
          commit_date: new Date(commit.date).toISOString(),
          message: commit.message,
          files_changed: commit.files,
          additions: commit.additions,
          deletions: commit.deletions,
          embedding: embedding,
          metadata: {
            files_count: commit.files.length,
            scraped_at: new Date().toISOString()
          }
        };

        const { error } = await this.supabaseClient
          .from('git_commit_embeddings')
          .upsert(commitData, { onConflict: 'commit_hash' });

        if (error) {
          console.log(`❌ Error storing commit ${commit.hash}:`, error.message);
        } else {
          stored++;
        }

        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 50));
      } catch (error) {
        console.log(`❌ Error processing commit ${commit.hash}:`, error.message);
      }
    }

    return stored;
  }

  /**
   * Store source files in Supabase
   */
  async storeSourceFiles(files: GitFile[]): Promise<number> {
    let stored = 0;
    
    for (const file of files) {
      try {
        const embedding = await this.generateEmbedding(file.content);
        
        if (!embedding) continue;

        const fileData = {
          file_path: file.path,
          repository: file.repository,
          branch: file.branch,
          content: file.content,
          file_type: file.type,
          file_size: file.size,
          last_modified: new Date(file.lastModified).toISOString(),
          embedding: embedding,
          metadata: {
            extension: path.extname(file.path),
            scraped_at: new Date().toISOString()
          }
        };

        const { error } = await this.supabaseClient
          .from('git_file_embeddings')
          .upsert(fileData, { onConflict: 'file_path,repository,branch' });

        if (error) {
          console.log(`❌ Error storing file ${file.path}:`, error.message);
        } else {
          stored++;
        }

        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 50));
      } catch (error) {
        console.log(`❌ Error processing file ${file.path}:`, error.message);
      }
    }

    return stored;
  }

  /**
   * Scrape a single repository
   */
  async scrapeRepository(repoUrl: string, repoName: string, options = { commits: true, files: true, maxCommits: 1000 }): Promise<void> {
    console.log(`\n🔄 Scraping repository: ${repoName}`);
    console.log(`📍 URL: ${repoUrl}\n`);

    // Clone repository
    const repoPath = await this.cloneRepository(repoUrl, repoName);
    if (!repoPath) {
      console.log(`❌ Failed to clone ${repoName}`);
      return;
    }

    try {
      let totalStored = 0;

      // Process commits
      if (options.commits) {
        console.log(`📊 Analyzing commits (max ${options.maxCommits})...`);
        const commits = await this.getCommits(repoPath, repoName, options.maxCommits);
        console.log(`   Found ${commits.length} commits`);
        
        if (commits.length > 0) {
          console.log(`💾 Storing commits with embeddings...`);
          const storedCommits = await this.storeCommits(commits);
          console.log(`   ✅ Stored ${storedCommits}/${commits.length} commits`);
          totalStored += storedCommits;
        }
      }

      // Process source files
      if (options.files) {
        console.log(`📁 Analyzing source files...`);
        const files = await this.getSourceFiles(repoPath, repoName);
        console.log(`   Found ${files.length} source files`);
        
        if (files.length > 0) {
          console.log(`💾 Storing files with embeddings...`);
          const storedFiles = await this.storeSourceFiles(files);
          console.log(`   ✅ Stored ${storedFiles}/${files.length} files`);
          totalStored += storedFiles;
        }
      }

      console.log(`\n🎉 Repository ${repoName} completed! Total items stored: ${totalStored}`);

    } finally {
      // Cleanup cloned repository
      console.log(`🗑️  Cleaning up ${repoName}...`);
      if (fs.existsSync(repoPath)) {
        fs.rmSync(repoPath, { recursive: true, force: true });
      }
    }
  }

  /**
   * Scrape multiple repositories
   */
  async scrapeRepositories(repos: Array<{url: string, name: string}>, options = { commits: true, files: true, maxCommits: 1000 }): Promise<void> {
    console.log(`🚀 Starting Git scraping for ${repos.length} repositories...\n`);

    for (let i = 0; i < repos.length; i++) {
      const repo = repos[i];
      console.log(`\n📦 Repository ${i + 1}/${repos.length}:`);
      await this.scrapeRepository(repo.url, repo.name, options);
      
      // Delay between repositories
      if (i < repos.length - 1) {
        console.log('⏱️  Waiting 30 seconds before next repository...');
        await new Promise(resolve => setTimeout(resolve, 30000));
      }
    }

    console.log(`\n🎉 All repositories scraped successfully!`);
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length < 2) {
    console.log('Usage: npx tsx git-scraper.ts <repoUrl> <repoName> [commits] [files] [maxCommits]');
    console.log('       npx tsx git-scraper.ts batch <configFile>');
    console.log('');
    console.log('Examples:');
    console.log('  npx tsx git-scraper.ts https://github.com/user/repo.git my-repo');
    console.log('  npx tsx git-scraper.ts https://github.com/user/repo.git my-repo true true 500');
    return;
  }

  const scraper = new GitScraper();

  try {
    if (args[0] === 'batch') {
      // Batch processing from config file
      const configFile = args[1];
      const config = JSON.parse(fs.readFileSync(configFile, 'utf8'));
      await scraper.scrapeRepositories(config.repositories, config.options);
    } else {
      // Single repository
      const repoUrl = args[0];
      const repoName = args[1];
      const commits = args[2] !== 'false';
      const files = args[3] !== 'false';
      const maxCommits = parseInt(args[4]) || 1000;

      await scraper.scrapeRepository(repoUrl, repoName, { commits, files, maxCommits });
    }
  } catch (error) {
    console.log('❌ Scraper error:', error.message);
  }
}

// Example config file for batch processing:
const exampleConfig = {
  repositories: [
    { url: 'https://github.com/microsoft/TypeScript.git', name: 'typescript' },
    { url: 'https://github.com/facebook/react.git', name: 'react' },
    { url: 'https://github.com/nodejs/node.git', name: 'nodejs' }
  ],
  options: {
    commits: true,
    files: true,
    maxCommits: 500
  }
};

if (require.main === module) {
  main().catch(console.error);
}

export { GitScraper };
