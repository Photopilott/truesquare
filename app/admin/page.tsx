import type { Metadata } from 'next';

import { AdminReviewConsole } from '@/components/admin-review-console';
import { ADMIN_EMAIL, getCurrentAdminSession } from '@/lib/admin-auth';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Admin review — TrueSquare',
  description: 'Private contribution review console.',
  robots: { index: false, follow: false },
};

export default async function AdminPage() {
  const session = await getCurrentAdminSession();
  return (
    <AdminReviewConsole
      initiallyAuthenticated={Boolean(session)}
      adminEmail={ADMIN_EMAIL}
      sessionExpiresAt={session?.expiresAt ?? null}
    />
  );
}
