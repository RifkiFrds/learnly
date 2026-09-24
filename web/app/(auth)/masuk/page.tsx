import { Suspense } from 'react';
import { LoginForm } from './LoginForm';

export const metadata = { title: 'Masuk' };

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
