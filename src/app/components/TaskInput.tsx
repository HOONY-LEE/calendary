import { InputHTMLAttributes, forwardRef } from 'react';

interface TaskInputProps extends InputHTMLAttributes<HTMLInputElement> {}

export const TaskInput = forwardRef<HTMLInputElement, TaskInputProps>(
  ({ className = '', ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={`flex-1 bg-transparent outline-none border-none focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0 ${className}`}
        {...props}
      />
    );
  }
);

TaskInput.displayName = 'TaskInput';
