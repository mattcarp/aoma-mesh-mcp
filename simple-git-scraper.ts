#!/usr/bin/env tsx
/**
 * Simple Git Scraper - Use GitHub/GitLab APIs to get commit data
 * No cloning needed - just API calls
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import OpenAI from 'openai';

config();

interface GitCommit {
  sha: string;
  message: string;
  author: {
    name: string;
    email: string;
    date: string;
  };
  url: string;
  repository: string;
  files?: any[];
}

class SimpleGitScraper {
  private supabaseClient: any;
  private openai: OpenAI;
  private githubToken?: string;

  constructor() {
    const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    this.supabaseClient = createClient(supabaseUrl!, supabaseKey!);
    this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });
    this.githubToken = process.env.GITHUB_TOKEN;
  }

  /**
   * Fetch commits from GitHub API
   */
  async fetchGitHubCommits(owner: string, repo: string, maxCommits: number = 100): Promise<GitCommit[]> {
    try {
      const headers: any = { 'Accept': 'application/vnd.github.v3+json' };
      if (this.githubToken) {
        headers['Authorization'] = `token ${this.githubToken}`;
      }

      const response = await fetch(
        `https://api.github.com/repos/${owner}/${repo}/commits?per_page=${Math.min(maxCommits, 100)}`,
        { headers }
      );

      if (!response.ok) {
        throw new Error(`GitHub API error: ${response.status}`);
      }

      const commits = await response.json();
      
      return commits.map((commit: any) => ({
        sha: commit.sha,
        message: commit.commit.message,
        author: {
          name: commit.commit.author.name,
          email: commit.commit.author.email,
          date: commit.commit.author.date
        },
        url: commit.html_url,
        repository: `${owner}/${repo}`
      }));
    } catch (error) {
      console.log(`❌ Error fetching commits for ${owner}/${repo}:`, error.message);
      return [];
    }
  }

  /**
   * Generate embedding and store commit
   */
  async storeCommit(commit: GitCommit): Promise<boolean> {
    try {
      // Generate embedding for commit message
      const embedding = await this.openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: commit.message
      });

      const { error } = await this.supabaseClient
        .from('git_commit_embeddings')
        .upsert({
          commit_hash: commit.sha,
          repository: commit.repository,
          author: commit.author.name,
          author_email: commit.author.email,
          commit_date: new Date(commit.author.date).toISOString(),
          message: commit.message,
          url: commit.url,
          embedding: embedding.data[0].embedding,
          metadata: { scraped_at: new Date().toISOString() }
        }, { onConflict: 'commit_hash' });

      return !error;
    } catch (error) {
      console.log(`❌ Error storing commit ${commit.sha}:`, error.message);
      return false;
    }
  }

  /**
   * Scrape a repository
   */
  async scrapeRepository(owner: string, repo: string, maxCommits: number = 100): Promise<void> {
    console.log(`🔄 Scraping ${owner}/${repo} (${maxCommits} commits)...`);
    
    const commits = await this.fetchGitHubCommits(owner, repo, maxCommits);
    console.log(`📊 Found ${commits.length} commits`);

    let stored = 0;
    for (const commit of commits) {
      if (await this.storeCommit(commit)) {
        stored++;
      }
      await new Promise(resolve => setTimeout(resolve, 100)); // Rate limiting
    }

    console.log(`✅ Stored ${stored}/${commits.length} commits for ${owner}/${repo}`);
  }
}

// CLI usage
async function main() {
  const [owner, repo, maxCommits] = process.argv.slice(2);
  
  if (!owner || !repo) {
    console.log('Usage: npx tsx simple-git-scraper.ts <owner> <repo> [maxCommits]');
    console.log('Example: npx tsx simple-git-scraper.ts microsoft TypeScript 500');
    return;
  }

  const scraper = new SimpleGitScraper();
  await scraper.scrapeRepository(owner, repo, parseInt(maxCommits) || 100);
}

if (require.main === module) {
  main().catch(console.error);
}
