import React, { useState } from 'react';
import {
    XIcon,
    EyeIcon,
    FileTextIcon,
    AlertTriangleIcon,
    SearchIcon,
    ClockIcon,
    CheckCircleIcon,
} from '../../icons';
import type {
    SyntheticEvidence,
    ISORole,
    EvidenceType,
} from '../../../types';

interface EvidenceViewerProps {
    evidence: SyntheticEvidence[];
    accessedIds: string[];
    currentRole: ISORole;
    onAccess: (evidenceId: string) => void;
    onClose?: () => void;
}

const TYPE_ICONS: Record<string, React.ReactNode> = {
    Alert: <AlertTriangleIcon className="w-4 h-4 text-red-400" />,
    Log: <FileTextIcon className="w-4 h-4 text-blue-400" />,
    Email: <FileTextIcon className="w-4 h-4 text-yellow-400" />,
    Screenshot: <EyeIcon className="w-4 h-4 text-purple-400" />,
    OT_Readout: <FileTextIcon className="w-4 h-4 text-orange-400" />,
    Threat_Intel: <FileTextIcon className="w-4 h-4 text-cyan-400" />,
};

const TYPE_COLORS: Record<string, string> = {
    Alert: 'border-red-500/30 bg-red-500/5',
    Log: 'border-blue-500/30 bg-blue-500/5',
    Email: 'border-yellow-500/30 bg-yellow-500/5',
    Screenshot: 'border-purple-500/30 bg-purple-500/5',
    OT_Readout: 'border-orange-500/30 bg-orange-500/5',
    Threat_Intel: 'border-cyan-500/30 bg-cyan-500/5',
};

const EvidenceViewer: React.FC<EvidenceViewerProps> = ({
    evidence,
    accessedIds,
    currentRole,
    onAccess,
    onClose,
}) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedType, setSelectedType] = useState<EvidenceType | null>(null);
    const [selectedEvidence, setSelectedEvidence] = useState<SyntheticEvidence | null>(null);

    // Filter evidence by current role
    const roleEvidence = evidence.filter(e =>
        e.visibleToRoles.includes(currentRole)
    );

    // Apply search and type filters
    const filteredEvidence = roleEvidence.filter(e => {
        const matchesSearch = !searchTerm ||
            e.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            e.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
            e.source.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesType = !selectedType || e.type === selectedType;

        return matchesSearch && matchesType;
    });

    // Group by type
    const evidenceTypes = [...new Set(roleEvidence.map(e => e.type))];

    // Stats
    const totalCount = roleEvidence.length;
    const accessedCount = roleEvidence.filter(e => accessedIds.includes(e.id)).length;

    const handleSelectEvidence = (ev: SyntheticEvidence) => {
        setSelectedEvidence(ev);
        if (!accessedIds.includes(ev.id)) {
            onAccess(ev.id);
        }
    };

    return (
        <div className="h-full flex flex-col bg-card border-l border-border">
            {/* Header */}
            <div className="p-4 border-b border-border">
                <div className="flex items-center justify-between mb-3">
                    <div>
                        <h3 className="font-semibold">Evidence Hub</h3>
                        <p className="text-sm text-muted-foreground">
                            {accessedCount}/{totalCount} accessed
                        </p>
                    </div>
                    {onClose && (
                        <button
                            onClick={onClose}
                            className="p-1 hover:bg-secondary rounded"
                        >
                            <XIcon className="w-4 h-4" />
                        </button>
                    )}
                </div>

                {/* Search */}
                <div className="relative mb-3">
                    <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Search evidence..."
                        className="w-full pl-9 pr-3 py-2 bg-secondary border border-border rounded text-sm"
                    />
                </div>

                {/* Type Filter */}
                <div className="flex flex-wrap gap-1">
                    <button
                        onClick={() => setSelectedType(null)}
                        className={`px-2 py-1 rounded text-xs transition-colors ${
                            !selectedType
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                        }`}
                    >
                        All ({roleEvidence.length})
                    </button>
                    {evidenceTypes.map(type => {
                        const count = roleEvidence.filter(e => e.type === type).length;
                        const typeKey = type as string;
                        return (
                            <button
                                key={typeKey}
                                onClick={() => setSelectedType(type === selectedType ? null : type)}
                                className={`px-2 py-1 rounded text-xs transition-colors flex items-center gap-1 ${
                                    selectedType === type
                                        ? 'bg-primary text-primary-foreground'
                                        : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                                }`}
                            >
                                {TYPE_ICONS[typeKey] || <FileTextIcon className="w-3 h-3" />}
                                {typeKey} ({count})
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Evidence List / Detail Split */}
            <div className="flex-1 flex overflow-hidden">
                {/* Evidence List */}
                <div className={`${selectedEvidence ? 'w-1/2' : 'w-full'} overflow-auto border-r border-border`}>
                    <div className="p-2 space-y-2">
                        {filteredEvidence.length === 0 ? (
                            <div className="text-center py-8 text-muted-foreground">
                                <FileTextIcon className="w-8 h-8 mx-auto mb-2 opacity-50" />
                                <p className="text-sm">No evidence found</p>
                            </div>
                        ) : (
                            filteredEvidence.map(ev => {
                                const isAccessed = accessedIds.includes(ev.id);
                                const isSelected = selectedEvidence?.id === ev.id;
                                return (
                                    <button
                                        key={ev.id}
                                        onClick={() => handleSelectEvidence(ev)}
                                        className={`w-full text-left p-3 rounded border transition-colors ${
                                            isSelected
                                                ? 'border-primary bg-primary/10'
                                                : isAccessed
                                                    ? `${TYPE_COLORS[ev.type as string] || 'border-border bg-card'} border-l-4`
                                                    : 'border-border bg-card hover:border-primary/50'
                                        }`}
                                    >
                                        <div className="flex items-start gap-2">
                                            <div className="mt-0.5">
                                                {TYPE_ICONS[ev.type as string] || <FileTextIcon className="w-4 h-4" />}
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-medium text-sm truncate">{ev.title}</span>
                                                    {isAccessed && (
                                                        <CheckCircleIcon className="w-3 h-3 text-green-500 flex-shrink-0" />
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                                                    <span>{ev.source}</span>
                                                    <span>|</span>
                                                    <span className="flex items-center gap-1">
                                                        <ClockIcon className="w-3 h-3" />
                                                        {ev.timestamp ? new Date(ev.timestamp).toLocaleTimeString() : 'N/A'}
                                                    </span>
                                                </div>
                                                {ev.integrity && ev.integrity !== 'verified' && (
                                                    <div className={`mt-1 text-xs px-1.5 py-0.5 rounded inline-block ${
                                                        ev.integrity === 'tampered'
                                                            ? 'bg-red-500/20 text-red-400'
                                                            : 'bg-yellow-500/20 text-yellow-400'
                                                    }`}>
                                                        {ev.integrity}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </button>
                                );
                            })
                        )}
                    </div>
                </div>

                {/* Evidence Detail */}
                {selectedEvidence && (
                    <div className="w-1/2 overflow-auto p-4">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                                {TYPE_ICONS[selectedEvidence.type] || <FileTextIcon className="w-5 h-5" />}
                                <h4 className="font-semibold">{selectedEvidence.title}</h4>
                            </div>
                            <button
                                onClick={() => setSelectedEvidence(null)}
                                className="p-1 hover:bg-secondary rounded"
                            >
                                <XIcon className="w-4 h-4" />
                            </button>
                        </div>

                        {/* Metadata */}
                        <div className="grid grid-cols-2 gap-2 mb-4 text-sm">
                            <div className="p-2 bg-secondary/30 rounded">
                                <div className="text-xs text-muted-foreground">Type</div>
                                <div>{selectedEvidence.type}</div>
                            </div>
                            <div className="p-2 bg-secondary/30 rounded">
                                <div className="text-xs text-muted-foreground">Source</div>
                                <div>{selectedEvidence.source}</div>
                            </div>
                            <div className="p-2 bg-secondary/30 rounded">
                                <div className="text-xs text-muted-foreground">Timestamp</div>
                                <div>{selectedEvidence.timestamp || 'N/A'}</div>
                            </div>
                            <div className="p-2 bg-secondary/30 rounded">
                                <div className="text-xs text-muted-foreground">Integrity</div>
                                <div className={
                                    selectedEvidence.integrity === 'verified' ? 'text-green-400' :
                                    selectedEvidence.integrity === 'tampered' ? 'text-red-400' :
                                    'text-yellow-400'
                                }>
                                    {selectedEvidence.integrity || 'Unknown'}
                                </div>
                            </div>
                        </div>

                        {/* Visible To */}
                        <div className="mb-4">
                            <div className="text-xs text-muted-foreground mb-1">Visible To Roles</div>
                            <div className="flex flex-wrap gap-1">
                                {selectedEvidence.visibleToRoles.map(role => (
                                    <span
                                        key={role}
                                        className={`px-2 py-0.5 rounded text-xs ${
                                            role === currentRole
                                                ? 'bg-primary/20 text-primary'
                                                : 'bg-secondary text-secondary-foreground'
                                        }`}
                                    >
                                        {role}
                                    </span>
                                ))}
                            </div>
                        </div>

                        {/* Content */}
                        <div>
                            <div className="text-xs text-muted-foreground mb-1">Content</div>
                            <div className="bg-secondary/50 p-3 rounded font-mono text-xs whitespace-pre-wrap max-h-64 overflow-auto">
                                {selectedEvidence.content}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default EvidenceViewer;
