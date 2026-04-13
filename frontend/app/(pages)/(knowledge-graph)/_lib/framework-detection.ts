export interface FrameworkHint {
    framework: string;
    entryPointMultiplier: number;
    reason: string;
}
export function detectFrameworkFromPath(filePath: string): FrameworkHint | null {
    let p = filePath.toLowerCase().replace(/\\/g, '/');
    if (!p.startsWith('/'))
        p = '/' + p;
    if (p.includes('/pages/') && !p.includes('/_') && !p.includes('/api/')) {
        if (p.endsWith('.tsx') || p.endsWith('.ts') || p.endsWith('.jsx') || p.endsWith('.js')) {
            return { framework: 'nextjs-pages', entryPointMultiplier: 3.0, reason: 'nextjs-page' };
        }
    }
    if (p.includes('/app/') && (p.endsWith('page.tsx') || p.endsWith('page.ts') || p.endsWith('page.jsx') || p.endsWith('page.js'))) {
        return { framework: 'nextjs-app', entryPointMultiplier: 3.0, reason: 'nextjs-app-page' };
    }
    if (p.includes('/pages/api/') || (p.includes('/app/') && p.includes('/api/') && p.endsWith('route.ts'))) {
        return { framework: 'nextjs-api', entryPointMultiplier: 3.0, reason: 'nextjs-api-route' };
    }
    if (p.includes('/routes/') || p.includes('/router/') || p.includes('/controllers/')) {
        return { framework: 'generic-routes', entryPointMultiplier: 2.5, reason: 'routes-dir' };
    }
    if (p.includes('/views/') || p.includes('/handlers/')) {
        return { framework: 'generic-views', entryPointMultiplier: 2.0, reason: 'views-dir' };
    }
    return null;
}
