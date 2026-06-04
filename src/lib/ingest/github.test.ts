import { describe, it, expect, vi, afterEach } from 'vitest';
import { fetchRepoData } from './github';

afterEach(() => vi.unstubAllGlobals());

const b64 = (s: string) => Buffer.from(s).toString('base64');

function router() {
  return vi.fn(async (url: string | URL) => {
    const u = String(url);
    const ok = (obj: unknown) => new Response(JSON.stringify(obj), { status: 200 });
    if (u.endsWith('/users/ada/repos?per_page=100&sort=updated&type=owner'))
      return ok([
        {
          name: 'my-ai',
          owner: { login: 'ada' },
          html_url: 'https://github.com/ada/my-ai',
          description: 'an AI persona',
          topics: ['ai', 'rag'],
          stargazers_count: 7,
          default_branch: 'main',
          fork: false,
        },
        { name: 'a-fork', owner: { login: 'ada' }, fork: true },
      ]);
    if (u.includes('/languages')) return ok({ TypeScript: 1000, CSS: 50 });
    if (u.endsWith('/readme')) return ok({ content: b64('# my-ai\nGrounded persona built with Next.js'), html_url: 'r' });
    if (u.includes('/commits')) return ok([{ commit: { message: 'feat: add brain endpoint\n\nbody' } }]);
    if (u.includes('/contents/')) return new Response('not found', { status: 404 });
    if (u.includes('/git/trees/')) return ok({ tree: [{ type: 'blob', path: 'src/app/page.tsx' }] });
    throw new Error(`unexpected url ${u}`);
  });
}

describe('fetchRepoData', () => {
  it('maps repo meta, README, commits, and tree; skips forks', async () => {
    vi.stubGlobal('fetch', router());
    const docs = await fetchRepoData('ada', 'tok');
    const byTitle = Object.fromEntries(docs.map((d) => [d.title, d]));

    expect(docs.some((d) => d.repo === 'a-fork')).toBe(false);
    expect(byTitle['Repo — my-ai'].source).toBe('repo_meta');
    expect(byTitle['Repo — my-ai'].text).toContain('Languages: TypeScript, CSS');
    expect(byTitle['README — my-ai'].source).toBe('repo_readme');
    expect(byTitle['README — my-ai'].text).toContain('Grounded persona built with Next.js');
    expect(byTitle['Recent commits — my-ai'].text).toContain('feat: add brain endpoint');
    expect(byTitle['File tree — my-ai'].text).toContain('src/app/page.tsx');
  });
});
