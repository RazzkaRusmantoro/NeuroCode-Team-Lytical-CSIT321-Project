import { detectFrameworkFromPath } from './framework-detection';
const ENTRY_POINT_PATTERNS: Record<string, RegExp[]> = {
    '*': [
        /^(main|init|bootstrap|start|run|setup|configure)$/i,
        /^handle[A-Z]/,
        /^on[A-Z]/,
        /Handler$/,
        /Controller$/,
        /^process[A-Z]/,
        /^execute[A-Z]/,
        /^dispatch[A-Z]/,
        /^trigger[A-Z]/,
    ],
    javascript: [/^use[A-Z]/],
    typescript: [/^use[A-Z]/],
    python: [
        /^app$/,
        /^(get|post|put|delete|patch)_/i,
        /^api_/,
        /^view_/,
    ],
};
const UTILITY_PATTERNS = [
    /^get[A-Z]/,
    /^set[A-Z]/,
    /^is[A-Z]/,
    /^has[A-Z]/,
    /^to[A-Z]/,
    /^from[A-Z]/,
    /Helper$/,
    /Util$/,
    /Utils$/,
];
export const isTestFile = (filePath: string): boolean => {
    const p = filePath.toLowerCase();
    return (p.includes('/test/') ||
        p.includes('/tests/') ||
        p.includes('/spec/') ||
        p.includes('/__tests__/') ||
        p.endsWith('.test.ts') ||
        p.endsWith('.test.tsx') ||
        p.endsWith('.spec.ts') ||
        p.endsWith('.test.js') ||
        p.endsWith('.spec.js'));
};
export const isUtilityFile = (filePath: string): boolean => {
    const p = filePath.toLowerCase();
    return (p.includes('/utils/') ||
        p.includes('/helpers/') ||
        p.includes('/common/') ||
        p.endsWith('/utils.ts') ||
        p.endsWith('/helpers.ts'));
};
export const calculateEntryPointScore = (name: string, language: string, isExported: boolean, callerCount: number, calleeCount: number, filePath: string): {
    score: number;
    reasons: string[];
} => {
    const reasons: string[] = [];
    const callRatio = calleeCount / (callerCount + 1);
    let baseScore = callRatio;
    reasons.push(`callRatio:${callRatio.toFixed(2)}`);
    const exportMultiplier = isExported ? 2.0 : 1.0;
    if (isExported)
        reasons.push('exported:2.0×');
    let nameMultiplier = 1.0;
    const universalPatterns = ENTRY_POINT_PATTERNS['*'] || [];
    const langPatterns = ENTRY_POINT_PATTERNS[language] || [];
    const allPatterns = [...universalPatterns, ...langPatterns];
    const isEntryPoint = allPatterns.some(p => p.test(name));
    const isUtility = UTILITY_PATTERNS.some(p => p.test(name));
    if (isEntryPoint) {
        nameMultiplier = 1.5;
        reasons.push('entryPattern:1.5×');
    }
    else if (isUtility) {
        nameMultiplier = 0.3;
        reasons.push('utilityPenalty:0.3×');
    }
    const frameworkHint = detectFrameworkFromPath(filePath);
    const frameworkMultiplier = frameworkHint ? frameworkHint.entryPointMultiplier : 1.0;
    if (frameworkHint)
        reasons.push(`framework(${frameworkHint.framework}):${frameworkMultiplier}×`);
    const score = baseScore * exportMultiplier * nameMultiplier * frameworkMultiplier;
    return { score, reasons };
};
