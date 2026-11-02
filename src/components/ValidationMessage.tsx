import { CircleAlert } from 'lucide-react';

interface ValidationMessageProps {
  message?: string;
}

export function ValidationMessage({ message }: ValidationMessageProps) {
  if (!message) return null;
  return (
    <p className="field-error" role="alert">
      <CircleAlert size={14} aria-hidden="true" />
      <span>{message}</span>
    </p>
  );
}
