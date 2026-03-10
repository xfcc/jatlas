"use client"

import * as React from 'react';
import { useToast } from "@/hooks/use-toast"
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "@/components/ui/toast"
import { Check, Clipboard } from 'lucide-react';

function ToastItem({ id, title, description, action, ...props }: any) {
  const [copied, setCopied] = React.useState(false);

  const handleCopy = () => {
    const textToCopy = `${title ? title : ''}${description ? (title ? ': ' + description : description) : ''}`;
    navigator.clipboard.writeText(textToCopy).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <Toast key={id} {...props}>
      <div className="grid gap-1 select-text">
        {title && <ToastTitle>{title}</ToastTitle>}
        {description && (
          <ToastDescription>{description}</ToastDescription>
        )}
      </div>
      {action}
      <div className='flex flex-col gap-2'>
        <button onClick={handleCopy} className='p-1'>
          {copied ? <Check size={16} className='text-emerald-500' /> : <Clipboard size={16} />}
        </button>
        <ToastClose />
      </div>
    </Toast>
  );
}

export function Toaster() {
  const { toasts } = useToast()

  return (
    <ToastProvider>
      {toasts.map(toast => (
        <ToastItem key={toast.id} {...toast} />
      ))}
      <ToastViewport />
    </ToastProvider>
  )
}
