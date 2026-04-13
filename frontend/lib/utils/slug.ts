export function slugify(input: string): string {
    return input
        .normalize('NFKD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .trim()
        .replace(/['"]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');
}
export function generateSlug(name: string): string {
    return name
        .toLowerCase()
        .trim()
        .replace(/['"]/g, '')
        .replace(/[\s_]+/g, '-')
        .replace(/[^a-z0-9-]/g, '')
        .replace(/-+/g, '-')
        .replace(/^-+|-+$/g, '')
        || 'repo';
}
export function generateUniqueUrlName(baseName: string, organizationId: string, existingUrlNames: string[]): string {
    const baseSlug = generateSlug(baseName);
    if (!existingUrlNames.includes(baseSlug)) {
        return baseSlug;
    }
    let counter = 1;
    let candidate = `${baseSlug}-${counter}`;
    while (existingUrlNames.includes(candidate)) {
        counter++;
        candidate = `${baseSlug}-${counter}`;
    }
    return candidate;
}
