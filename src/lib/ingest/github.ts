import type { RawDoc } from './types';

const API = 'https://api.github.com';
const MAX_COMMITS = 30;
const MAX_TREE_PATHS = 200;
const MANIFESTS = ['package.json', 'requirements.txt', 'pyproject.toml', 'go.mod', 'Cargo.toml'];

function headers(token?: string): Record<string, string> {
  return {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': 'my-ai-persona-ingest',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function gh<T>(path: string, token?: string): Promise<T | null> {
  const res = await fetch(`${API}${path}`, { headers: headers(token) });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`GitHub ${res.status} on ${path}: ${await res.text()}`);
  return (await res.json()) as T;
}

function decodeBase64(content: string): string {
  return Buffer.from(content, 'base64').toString('utf-8');
}

/** Fetch ingestable documents for every public, non-fork repo of `username`.
 * Failures on a single repo are logged and skipped, never fatal. */
export async function fetchRepoData(
  username: string,
  token?: string,
  allowlist?: string[],
): Promise<RawDoc[]> {
  const repos =
    (await gh<any[]>(`/users/${username}/repos?per_page=100&sort=updated&type=owner`, token)) ?? [];
  const docs: RawDoc[] = [];

  for (const repo of repos) {
    if (repo.fork) continue;
    if (allowlist?.length && !allowlist.includes(repo.name)) continue;
    const owner: string = repo.owner?.login ?? username;
    const name: string = repo.name;
    const repoUrl: string = repo.html_url;

    try {
      const languages = (await gh<Record<string, number>>(`/repos/${owner}/${name}/languages`, token)) ?? {};
      const meta = [
        `Repository: ${name}`,
        repo.description ? `Description: ${repo.description}` : '',
        Object.keys(languages).length ? `Languages: ${Object.keys(languages).join(', ')}` : '',
        repo.topics?.length ? `Topics: ${repo.topics.join(', ')}` : '',
        `Stars: ${repo.stargazers_count ?? 0}`,
        repo.homepage ? `Homepage: ${repo.homepage}` : '',
        `Default branch: ${repo.default_branch}`,
      ].filter(Boolean);
      docs.push({ source: 'repo_meta', title: `Repo — ${name}`, repo: name, url: repoUrl, text: meta.join('\n') });

      const readme = await gh<any>(`/repos/${owner}/${name}/readme`, token);
      if (readme?.content) {
        const text = decodeBase64(readme.content);
        if (text.trim()) {
          docs.push({ source: 'repo_readme', title: `README — ${name}`, repo: name, url: readme.html_url ?? repoUrl, text });
        }
      }

      const commits = await gh<any[]>(`/repos/${owner}/${name}/commits?per_page=${MAX_COMMITS}`, token);
      if (commits?.length) {
        const msgs = commits
          .map((c) => c.commit?.message?.split('\n')[0])
          .filter(Boolean)
          .map((s: string) => `- ${s}`)
          .join('\n');
        if (msgs) {
          docs.push({
            source: 'repo_commit',
            title: `Recent commits — ${name}`,
            repo: name,
            url: `${repoUrl}/commits`,
            text: `Recent commit messages for ${name}:\n${msgs}`,
          });
        }
      }

      for (const file of MANIFESTS) {
        const f = await gh<any>(`/repos/${owner}/${name}/contents/${file}`, token);
        if (f?.content) {
          docs.push({
            source: 'repo_file',
            title: `${file} — ${name}`,
            repo: name,
            url: f.html_url ?? repoUrl,
            text: decodeBase64(f.content),
          });
        }
      }

      const tree = await gh<any>(`/repos/${owner}/${name}/git/trees/${repo.default_branch}?recursive=1`, token);
      const paths: string[] = (tree?.tree ?? [])
        .filter((t: any) => t.type === 'blob')
        .map((t: any) => t.path)
        .slice(0, MAX_TREE_PATHS);
      if (paths.length) {
        docs.push({
          source: 'repo_file',
          title: `File tree — ${name}`,
          repo: name,
          url: repoUrl,
          text: `Files in ${name}:\n${paths.join('\n')}`,
        });
      }
    } catch (e) {
      console.warn(`[ingest] skipping part of ${name}: ${String(e)}`);
    }
  }
  return docs;
}
