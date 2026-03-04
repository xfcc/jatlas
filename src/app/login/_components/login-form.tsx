'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowRight } from 'lucide-react';
import { useFormState } from 'react-dom';
import { authenticate } from '@/app/actions';
import { useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';

export function LoginForm() {
  const [state, dispatch] = useFormState(authenticate, undefined);
  const { toast } = useToast();

  useEffect(() => {
    if (state && !state.success) {
      toast({
        variant: 'destructive',
        title: 'Login Failed',
        description: state.message,
      });
    }
  }, [state, toast]);

  return (
    <form action={dispatch} className="flex items-center gap-2">
      <Input
        type="password"
        name="password"
        placeholder="············"
        className="flex-1 bg-gray-800 text-white placeholder:text-gray-500 border-gray-700"
        required
      />
      <Button type="submit" size="icon" className="bg-gray-800 hover:bg-gray-700 border-gray-700">
        <ArrowRight className="h-4 w-4" />
        <span className="sr-only">Login</span>
      </Button>
    </form>
  );
}
