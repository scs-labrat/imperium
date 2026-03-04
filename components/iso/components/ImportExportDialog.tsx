import React, { useState, useRef } from 'react';
import {
    XIcon,
    DownloadIcon,
    FileTextIcon,
    CheckCircleIcon,
    AlertTriangleIcon,
    LoaderIcon,
} from '../../icons';
import type { ISOExerciseExport } from '../../../types';

interface ImportExportDialogProps {
    mode: 'import' | 'export';
    exportData?: ISOExerciseExport | null;
    onImport: (data: ISOExerciseExport) => Promise<void>;
    onClose: () => void;
}

const ImportExportDialog: React.FC<ImportExportDialogProps> = ({
    mode,
    exportData,
    onImport,
    onClose,
}) => {
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const [importData, setImportData] = useState<ISOExerciseExport | null>(null);
    const [fileName, setFileName] = useState<string>('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setError(null);
        setFileName(file.name);

        try {
            const text = await file.text();
            const data = JSON.parse(text) as ISOExerciseExport;

            // Validate the import data
            if (!data.version || !data.scenarioDefinition) {
                throw new Error('Invalid exercise file format. Missing required fields.');
            }

            setImportData(data);
        } catch (err: any) {
            setError(err.message || 'Failed to parse file');
            setImportData(null);
        }
    };

    const handleImport = async () => {
        if (!importData) return;

        setIsProcessing(true);
        setError(null);

        try {
            await onImport(importData);
            setSuccess(true);
            setTimeout(() => onClose(), 1500);
        } catch (err: any) {
            setError(err.message || 'Failed to import exercise');
        } finally {
            setIsProcessing(false);
        }
    };

    const handleExportDownload = () => {
        if (!exportData) return;

        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `iso-exercise-${exportData.exerciseState?.id || 'new'}-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        setSuccess(true);
        setTimeout(() => onClose(), 1500);
    };

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
            <div className="bg-card border border-border rounded-lg w-[500px] max-h-[80vh] flex flex-col">
                {/* Header */}
                <div className="p-4 border-b border-border flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary/10 rounded-lg">
                            {mode === 'import' ? (
                                <FileTextIcon className="w-5 h-5 text-primary" />
                            ) : (
                                <DownloadIcon className="w-5 h-5 text-primary" />
                            )}
                        </div>
                        <h2 className="text-lg font-semibold">
                            {mode === 'import' ? 'Import Exercise' : 'Export Exercise'}
                        </h2>
                    </div>
                    <button onClick={onClose} className="p-1 hover:bg-secondary rounded">
                        <XIcon className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 flex-1 overflow-auto">
                    {success ? (
                        <div className="text-center py-8">
                            <CheckCircleIcon className="w-16 h-16 mx-auto mb-4 text-green-400" />
                            <p className="text-lg font-medium">
                                {mode === 'import' ? 'Exercise imported successfully!' : 'Export complete!'}
                            </p>
                        </div>
                    ) : mode === 'import' ? (
                        <>
                            {/* Import UI */}
                            <div
                                className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                                    importData
                                        ? 'border-green-500/50 bg-green-500/5'
                                        : 'border-border hover:border-primary/50'
                                }`}
                            >
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept=".json"
                                    onChange={handleFileSelect}
                                    className="hidden"
                                />

                                {importData ? (
                                    <div>
                                        <CheckCircleIcon className="w-12 h-12 mx-auto mb-3 text-green-400" />
                                        <p className="font-medium">{fileName}</p>
                                        <p className="text-sm text-muted-foreground mt-1">
                                            Ready to import
                                        </p>
                                        <button
                                            onClick={() => fileInputRef.current?.click()}
                                            className="mt-3 text-sm text-primary hover:underline"
                                        >
                                            Choose different file
                                        </button>
                                    </div>
                                ) : (
                                    <div>
                                        <FileTextIcon className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
                                        <p className="font-medium mb-1">Select exercise file</p>
                                        <p className="text-sm text-muted-foreground mb-4">
                                            JSON file exported from ISO
                                        </p>
                                        <button
                                            onClick={() => fileInputRef.current?.click()}
                                            className="px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90"
                                        >
                                            Browse Files
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* Import Preview */}
                            {importData && (
                                <div className="mt-4 p-4 bg-secondary/30 rounded-lg">
                                    <h4 className="font-medium mb-3">Import Preview</h4>
                                    <div className="space-y-2 text-sm">
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">Scenario:</span>
                                            <span>{importData.scenarioDefinition.name}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">Threat Actor:</span>
                                            <span>{importData.scenarioDefinition.threatActor.name}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">Duration:</span>
                                            <span>{importData.scenarioDefinition.exerciseDurationMinutes} min</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">Has Compiled Scenario:</span>
                                            <span>{importData.compiledScenario ? 'Yes' : 'No'}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">Has Exercise State:</span>
                                            <span>{importData.exerciseState ? 'Yes' : 'No'}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">Exported:</span>
                                            <span>{new Date(importData.exportedAt).toLocaleString()}</span>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </>
                    ) : (
                        <>
                            {/* Export UI */}
                            {exportData ? (
                                <div className="space-y-4">
                                    <div className="p-4 bg-secondary/30 rounded-lg">
                                        <h4 className="font-medium mb-3">Export Contents</h4>
                                        <div className="space-y-2 text-sm">
                                            <div className="flex justify-between">
                                                <span className="text-muted-foreground">Scenario:</span>
                                                <span>{exportData.scenarioDefinition.name}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-muted-foreground">Version:</span>
                                                <span>{exportData.version}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-muted-foreground">Includes Compiled:</span>
                                                <span>{exportData.compiledScenario ? 'Yes' : 'No'}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-muted-foreground">Includes State:</span>
                                                <span>{exportData.exerciseState ? 'Yes' : 'No'}</span>
                                            </div>
                                            {exportData.postExerciseReport && (
                                                <div className="flex justify-between">
                                                    <span className="text-muted-foreground">Includes Report:</span>
                                                    <span>Yes</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <p className="text-sm text-muted-foreground">
                                        The export file will contain the full exercise data including scenario definition,
                                        compiled content, exercise state, and any post-exercise reports.
                                    </p>
                                </div>
                            ) : (
                                <div className="text-center py-8">
                                    <AlertTriangleIcon className="w-12 h-12 mx-auto mb-3 text-yellow-400" />
                                    <p className="text-muted-foreground">No export data available</p>
                                </div>
                            )}
                        </>
                    )}

                    {/* Error Display */}
                    {error && (
                        <div className="mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg flex items-start gap-2">
                            <AlertTriangleIcon className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                            <p className="text-sm text-red-400">{error}</p>
                        </div>
                    )}
                </div>

                {/* Footer */}
                {!success && (
                    <div className="p-4 border-t border-border flex justify-end gap-2">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 bg-secondary text-secondary-foreground rounded hover:bg-secondary/80"
                        >
                            Cancel
                        </button>
                        {mode === 'import' ? (
                            <button
                                onClick={handleImport}
                                disabled={!importData || isProcessing}
                                className="px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                            >
                                {isProcessing && <LoaderIcon className="w-4 h-4 animate-spin" />}
                                Import Exercise
                            </button>
                        ) : (
                            <button
                                onClick={handleExportDownload}
                                disabled={!exportData}
                                className="px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                            >
                                <DownloadIcon className="w-4 h-4" />
                                Download JSON
                            </button>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default ImportExportDialog;
