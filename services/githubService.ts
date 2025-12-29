import { Job } from '../types';

/**
 * Service to interact with the GitHub API for data backup and sync.
 */

export interface GitHubSyncResult {
    success: boolean;
    message: string;
    url?: string;
}

/**
 * Commits a file to the specified GitHub repository.
 */
const commitFile = async (token: string, repo: string, path: string, content: string): Promise<string> => {
    const encodedContent = btoa(unescape(encodeURIComponent(content)));
    
    // 1. Get existing file sha if it exists to allow updating
    let sha: string | undefined;
    try {
        const getRes = await fetch(`https://api.github.com/repos/${repo}/contents/${path}`, {
            headers: {
                'Authorization': `token ${token}`,
                'Accept': 'application/vnd.github.v3+json'
            }
        });
        if (getRes.ok) {
            const data = await getRes.json();
            sha = data.sha;
        }
    } catch (e) {
        // File doesn't exist yet, which is fine
    }

    // 2. Put / Update file
    const res = await fetch(`https://api.github.com/repos/${repo}/contents/${path}`, {
        method: 'PUT',
        headers: {
            'Authorization': `token ${token}`,
            'Accept': 'application/vnd.github.v3+json',
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            message: `JobFlow AI Data Backup: ${new Date().toISOString()}`,
            content: encodedContent,
            sha: sha
        })
    });

    if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || `Failed to sync ${path}`);
    }

    const resultData = await res.json();
    return resultData.content.html_url;
};

export const syncJobsToGithub = async (
    token: string, 
    repo: string, 
    jobs: Job[]
): Promise<GitHubSyncResult> => {
    try {
        const [owner, repoName] = repo.split('/');
        if (!owner || !repoName) {
            throw new Error("Invalid repository format. Use 'username/repo'.");
        }

        // Sync ONLY Jobs List
        const jobsPath = 'data/jobs_backup.json';
        const jobsContent = JSON.stringify(jobs, null, 2);
        await commitFile(token, repo, jobsPath, jobsContent);

        return {
            success: true,
            message: "Successfully committed Jobs backup to GitHub."
        };
    } catch (e: any) {
        return {
            success: false,
            message: e.message || "GitHub Sync Failed"
        };
    }
};

export const verifyGithubRepo = async (token: string, repo: string): Promise<boolean> => {
    try {
        const res = await fetch(`https://api.github.com/repos/${repo}`, {
            headers: {
                'Authorization': `token ${token}`,
                'Accept': 'application/vnd.github.v3+json'
            }
        });
        return res.ok;
    } catch (e) {
        return false;
    }
};