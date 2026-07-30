import { redirect } from 'next/navigation';
import { StudioShell } from './StudioShell';
import './studio.css';
import { isReviewFeatureEnabled } from '@/lib/feature-flags';

export default function StudioLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (!isReviewFeatureEnabled('studio')) {
    redirect('/admin/designs');
  }
  return <StudioShell>{children}</StudioShell>;
}
