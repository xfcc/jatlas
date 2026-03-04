
import { KeyRound } from 'lucide-react';
import { LoginForm } from './_components/login-form';

export default function LoginPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-900 text-white">
      <div className="flex flex-col items-center gap-4">
        <KeyRound className="h-10 w-10 text-gray-500" />
        <h1 className="text-2xl font-bold tracking-tighter">JATLAS</h1>
        <p className="text-sm text-gray-500">Jav Actress Tier Ledger & Asset System</p>
      </div>
      <div className="mt-8 w-full max-w-xs">
        <LoginForm />
      </div>
    </div>
  );
}
