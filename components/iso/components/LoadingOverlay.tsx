import React from 'react';
import { LoaderIcon } from '../../icons';

interface LoadingOverlayProps {
    message?: string;
    progress?: number;
    stages?: { id: string; label: string; status: 'pending' | 'active' | 'completed' }[];
}

const LoadingOverlay: React.FC<LoadingOverlayProps> = ({
    message = 'Loading...',
    progress,
    stages,
}) => {
    return (
        <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-40">
            <div className="bg-card border border-border rounded-lg p-6 max-w-sm w-full text-center">
                <LoaderIcon className="w-10 h-10 mx-auto mb-4 text-primary animate-spin" />
                <p className="font-medium mb-2">{message}</p>

                {/* Progress Bar */}
                {progress !== undefined && (
                    <div className="mt-4">
                        <div className="h-2 bg-secondary rounded-full overflow-hidden">
                            <div
                                className="h-full bg-primary transition-all duration-300"
                                style={{ width: `${progress}%` }}
                            />
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">{progress.toFixed(0)}%</p>
                    </div>
                )}

                {/* Stages */}
                {stages && stages.length > 0 && (
                    <div className="mt-4 text-left space-y-2">
                        {stages.map(stage => (
                            <div
                                key={stage.id}
                                className={`flex items-center gap-2 text-sm ${
                                    stage.status === 'completed'
                                        ? 'text-green-400'
                                        : stage.status === 'active'
                                        ? 'text-primary'
                                        : 'text-muted-foreground'
                                }`}
                            >
                                {stage.status === 'completed' ? (
                                    <span className="w-4 h-4 rounded-full bg-green-500/20 flex items-center justify-center">
                                        <span className="w-2 h-2 rounded-full bg-green-500" />
                                    </span>
                                ) : stage.status === 'active' ? (
                                    <LoaderIcon className="w-4 h-4 animate-spin" />
                                ) : (
                                    <span className="w-4 h-4 rounded-full border border-border" />
                                )}
                                <span>{stage.label}</span>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default LoadingOverlay;
