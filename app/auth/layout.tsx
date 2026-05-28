import { Container } from '@/components/Container';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <Container size="sm" className="flex items-center justify-center min-h-[calc(100vh-80px)]">
      {children}
    </Container>
  );
}
