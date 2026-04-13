import { cache } from 'react';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
export const getCachedSession = cache(async () => {
    return await getServerSession(authOptions);
});
