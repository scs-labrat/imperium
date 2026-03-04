import React from 'react';
import { AlertTriangleIcon, XIcon, RefreshIcon } from '../../icons';

interface ErrorBannerProps {
    message: string;
    details?: string;
    onDismiss?: () => void;
    onRetry?: () => void;
    variant?: 'error' | 'warning' | 'info';
}

const ErrorBanner: React.FC<ErrorBannerProps> = ({
    message,
    details,
    onDismiss,
    onRetry,
    variant = 'error',
}) => {
    const colors = {
        error: {
            bg: 'bg-red-500/10',
            border: 'border-red-500/30',
            text: 'text-red-400',
            icon: 'text-red-400',
        },
        warning: {
            bg: 'bg-yellow-500/10',
            border: 'border-yellow-500/30',
            text: 'text-yellow-400',
            icon: 'text-yellow-400',
        },
        info: {
            bg: 'bg-blue-500/10',
            border: 'border-blue-500/30',
            text: 'text-blue-400',
            icon: 'text-blue-400',
        },
    };

    const colorClasses = colors[variant];

    return (
        <div className={`${colorClasses.bg} border ${colorClasses.border} rounded-lg p-4`}>
            <div className="flex items-start gap-3">
                <AlertTriangleIcon className={`w-5 h-5 ${colorClasses.icon} flex-shrink-0 mt-0.5`} />
                <div className="flex-1 min-w-0">
                    <p className={`font-medium ${colorClasses.text}`}>{message}</p>
                    {details && (
                        <p className="text-sm text-muted-foreground mt-1">{details}</p>
                    )}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                    {onRetry && (
                        <button
                            onClick={onRetry}
                            className={`p-1 hover:bg-secondary rounded ${colorClasses.text}`}
                            title="Retry"
                        >
                            <RefreshIcon className="w-4 h-4" />
                        </button>
                    )}
                    {onDismiss && (
                        <button
                            onClick={onDismiss}
                            className="p-1 hover:bg-secondary rounded text-muted-foreground"
                            title="Dismiss"
                        >
                            <XIcon className="w-4 h-4" />
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ErrorBanner;
