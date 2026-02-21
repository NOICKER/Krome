import React, { ReactNode } from 'react';
import { LucideIcon } from 'lucide-react';

interface AnalyticsCardProps {
    title: string;
    children: ReactNode;
    icon?: LucideIcon;
    isEmpty?: boolean;
}

export function AnalyticsCard({ title, children, icon: Icon, isEmpty = false }: AnalyticsCardProps) {
    return (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 flex flex-col h-80">
            <div className="flex items-center space-x-2 mb-6 text-slate-300">
                {Icon && <Icon size={18} className="text-slate-500" />}
                <h3 className="font-bold uppercase tracking-widest text-sm">{title}</h3>
            </div>

            <div className="flex-1 w-full h-full min-h-0 relative">
                {isEmpty ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-500">
                        <span className="text-sm font-medium">Not enough data yet.</span>
                    </div>
                ) : (
                    children
                )}
            </div>
        </div>
    );
}
