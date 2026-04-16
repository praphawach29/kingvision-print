import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';

export interface BreadcrumbItem {
  label: string;
  path?: string;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
  className?: string;
  light?: boolean;
}

export function Breadcrumb({ items, className = '', light = false }: BreadcrumbProps) {
  const textColor = light ? 'text-white/80' : 'text-gray-500';
  const hoverColor = light ? 'hover:text-white' : 'hover:text-kv-orange';
  const activeColor = light ? 'text-white font-medium' : 'text-gray-900 font-medium';
  const separatorColor = light ? 'text-white/50' : 'text-gray-400';

  return (
    <nav className={`flex text-sm mb-6 overflow-x-auto whitespace-nowrap pb-2 ${className}`} aria-label="Breadcrumb">
      <ol className="inline-flex items-center space-x-1 md:space-x-3">
        <li className="inline-flex items-center">
          <Link to="/" className={`inline-flex items-center transition-colors ${textColor} ${hoverColor}`}>
            <Home size={16} className="mr-2" />
            หน้าแรก
          </Link>
        </li>
        {items.map((item, index) => (
          <li key={index}>
            <div className="flex items-center">
              <ChevronRight size={16} className={`mx-1 ${separatorColor}`} />
              {item.path ? (
                <Link to={item.path} className={`transition-colors ${textColor} ${hoverColor}`}>
                  {item.label}
                </Link>
              ) : (
                <span className={activeColor}>{item.label}</span>
              )}
            </div>
          </li>
        ))}
      </ol>
    </nav>
  );
}
