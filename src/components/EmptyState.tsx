import { type LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
}

export default function EmptyState({ icon: Icon, title, description }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="p-4 rounded-2xl bg-gray-100 dark:bg-slate-800 mb-4">
        <Icon size={40} className="text-gray-400 dark:text-slate-500" />
      </div>
      <p className="text-sm font-medium text-gray-600 dark:text-slate-300">{title}</p>
      {description && (
        <p className="text-xs text-gray-400 dark:text-slate-500 mt-1 max-w-xs">{description}</p>
      )}
    </div>
  );
}
