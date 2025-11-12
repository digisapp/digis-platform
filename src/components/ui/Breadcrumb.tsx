import Link from 'next/link';
import { ChevronRight } from 'lucide-react';

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
}

export function Breadcrumb({ items }: BreadcrumbProps) {
  return (
    <nav className="flex items-center space-x-2 mb-6">
      {items.map((item, index) => (
        <div key={index} className="flex items-center">
          {index > 0 && (
            <ChevronRight className="w-4 h-4 text-gray-500 mx-2" />
          )}
          {item.href ? (
            <Link
              href={item.href}
              className="text-sm text-gray-600 hover:text-digis-cyan transition-colors duration-200"
            >
              {item.label}
            </Link>
          ) : (
            <span className="text-sm font-semibold text-gray-900">
              {item.label}
            </span>
          )}
        </div>
      ))}
    </nav>
  );
}
