import { redirect } from 'next/navigation';
import { StudioShell } from './StudioShell';
import './studio.css';

export default function StudioLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (process.env.NEXT_PUBLIC_STUDIO_ENABLED !== 'true') {
    redirect('/admin/designs');
  }
  return <StudioShell>{children}</StudioShell>;
}
