import React, { useState } from 'react';
import {
    ArrowLeftIcon,
    SaveIcon,
    ShieldIcon,
    BuildingIcon,
    TrendingUpIcon,
    LoaderIcon,
} from '../icons';
import type {
    ISOScenarioDefinition,
    ThreatActorProfile,
    TargetOrganization,
    SeverityCurve,
    ThreatSophistication,
    OrganizationSize,
    OTSector,
} from '../../types';

interface ScenarioBuilderProps {
    onSave: (definition: Omit<ISOScenarioDefinition, 'id' | 'createdAt' | 'updatedAt'>) => void;
    onCancel: () => void;
    isLoading: boolean;
}

const ScenarioBuilder: React.FC<ScenarioBuilderProps> = ({ onSave, onCancel, isLoading }) => {
    const [step, setStep] = useState(1);

    // Form state
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');

    // Threat Actor
    const [threatActorName, setThreatActorName] = useState('');
    const [sophistication, setSophistication] = useState<'low' | 'medium' | 'high' | 'nation-state'>('medium');
    const [ttps, setTtps] = useState('');
    const [motivation, setMotivation] = useState('');

    // Target Organization
    const [orgName, setOrgName] = useState('');
    const [sector, setSector] = useState('');
    const [size, setSize] = useState<'small' | 'medium' | 'large' | 'enterprise'>('medium');
    const [domain, setDomain] = useState('');
    const [hasOT, setHasOT] = useState(false);
    const [regulatoryFrameworks, setRegulatoryFrameworks] = useState('');

    // Exercise Parameters
    const [durationMinutes, setDurationMinutes] = useState(120);
    const [injectCount, setInjectCount] = useState(10);
    const [startSeverity, setStartSeverity] = useState<1 | 2 | 3 | 4 | 5>(2);
    const [peakSeverity, setPeakSeverity] = useState<1 | 2 | 3 | 4 | 5>(5);
    const [severityPattern, setSeverityPattern] = useState<'slow_burn' | 'rapid_escalation' | 'wave' | 'persistent'>('slow_burn');
    const [peakTimeMinutes, setPeakTimeMinutes] = useState(60);

    const handleSubmit = () => {
        const definition: Omit<ISOScenarioDefinition, 'id' | 'createdAt' | 'updatedAt'> = {
            name,
            description,
            threatActor: {
                name: threatActorName,
                sophistication,
                ttps: ttps.split(',').map(t => t.trim()).filter(Boolean),
                motivation,
            },
            targetOrganization: {
                name: orgName,
                sector,
                size,
                domain,
                hasOT,
                regulatoryFrameworks: regulatoryFrameworks.split(',').map(r => r.trim()).filter(Boolean),
            },
            severityCurve: {
                startSeverity,
                peakSeverity,
                pattern: severityPattern,
                peakTimeMinutes,
            },
            exerciseDurationMinutes: durationMinutes,
            targetInjectCount: injectCount,
        };
        onSave(definition);
    };

    const canProceed = () => {
        if (step === 1) return name && description;
        if (step === 2) return threatActorName && motivation;
        if (step === 3) return orgName && sector && domain;
        return true;
    };

    return (
        <div className="h-full flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-border">
                <div className="flex items-center gap-3">
                    <button
                        onClick={onCancel}
                        className="p-2 hover:bg-secondary rounded-md"
                    >
                        <ArrowLeftIcon className="w-4 h-4" />
                    </button>
                    <div>
                        <h2 className="text-lg font-semibold">Create New Scenario</h2>
                        <p className="text-sm text-muted-foreground">Step {step} of 4</p>
                    </div>
                </div>
            </div>

            {/* Progress bar */}
            <div className="h-1 bg-secondary">
                <div
                    className="h-full bg-primary transition-all duration-300"
                    style={{ width: `${(step / 4) * 100}%` }}
                />
            </div>

            {/* Content */}
            <div className="flex-1 overflow-auto p-6">
                <div className="max-w-2xl mx-auto">
                    {/* Step 1: Basic Info */}
                    {step === 1 && (
                        <div className="space-y-6">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="p-2 bg-primary/10 rounded-lg">
                                    <ShieldIcon className="w-5 h-5 text-primary" />
                                </div>
                                <div>
                                    <h3 className="font-semibold">Scenario Overview</h3>
                                    <p className="text-sm text-muted-foreground">Define the basic parameters of your exercise</p>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-2">Scenario Name</label>
                                <input
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="e.g., APT Ransomware Attack"
                                    className="w-full px-3 py-2 bg-secondary border border-border rounded-md text-gray-900 dark:text-gray-100 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-primary"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-2">Description</label>
                                <textarea
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    placeholder="Describe the scenario and learning objectives..."
                                    rows={4}
                                    className="w-full px-3 py-2 bg-secondary border border-border rounded-md text-gray-900 dark:text-gray-100 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium mb-2">Duration (minutes)</label>
                                    <input
                                        type="number"
                                        value={durationMinutes}
                                        onChange={(e) => setDurationMinutes(parseInt(e.target.value) || 60)}
                                        min={30}
                                        max={480}
                                        className="w-full px-3 py-2 bg-secondary border border-border rounded-md text-gray-900 dark:text-gray-100 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-primary"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-2">Number of Injects</label>
                                    <input
                                        type="number"
                                        value={injectCount}
                                        onChange={(e) => setInjectCount(parseInt(e.target.value) || 5)}
                                        min={3}
                                        max={30}
                                        className="w-full px-3 py-2 bg-secondary border border-border rounded-md text-gray-900 dark:text-gray-100 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-primary"
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Step 2: Threat Actor */}
                    {step === 2 && (
                        <div className="space-y-6">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="p-2 bg-destructive/10 rounded-lg">
                                    <ShieldIcon className="w-5 h-5 text-destructive" />
                                </div>
                                <div>
                                    <h3 className="font-semibold">Threat Actor Profile</h3>
                                    <p className="text-sm text-muted-foreground">Define the simulated adversary</p>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-2">Threat Actor Name</label>
                                <input
                                    type="text"
                                    value={threatActorName}
                                    onChange={(e) => setThreatActorName(e.target.value)}
                                    placeholder="e.g., Crimson Tempest, APT-42"
                                    className="w-full px-3 py-2 bg-secondary border border-border rounded-md text-gray-900 dark:text-gray-100 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-primary"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-2">Sophistication Level</label>
                                <select
                                    value={sophistication}
                                    onChange={(e) => setSophistication(e.target.value as any)}
                                    className="w-full px-3 py-2 bg-secondary border border-border rounded-md text-gray-900 dark:text-gray-100 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-primary"
                                >
                                    <option value="low">Low - Script Kiddie</option>
                                    <option value="medium">Medium - Cybercriminal</option>
                                    <option value="high">High - APT</option>
                                    <option value="nation-state">Nation-State</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-2">MITRE ATT&CK TTPs (comma-separated)</label>
                                <input
                                    type="text"
                                    value={ttps}
                                    onChange={(e) => setTtps(e.target.value)}
                                    placeholder="e.g., T1566, T1078, T1486"
                                    className="w-full px-3 py-2 bg-secondary border border-border rounded-md text-gray-900 dark:text-gray-100 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-primary"
                                />
                                <p className="text-xs text-muted-foreground mt-1">Enter MITRE ATT&CK technique IDs</p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-2">Motivation</label>
                                <textarea
                                    value={motivation}
                                    onChange={(e) => setMotivation(e.target.value)}
                                    placeholder="e.g., Financial gain through ransomware deployment"
                                    rows={2}
                                    className="w-full px-3 py-2 bg-secondary border border-border rounded-md text-gray-900 dark:text-gray-100 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                                />
                            </div>
                        </div>
                    )}

                    {/* Step 3: Target Organization */}
                    {step === 3 && (
                        <div className="space-y-6">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="p-2 bg-blue-500/10 rounded-lg">
                                    <BuildingIcon className="w-5 h-5 text-blue-500" />
                                </div>
                                <div>
                                    <h3 className="font-semibold">Target Organization</h3>
                                    <p className="text-sm text-muted-foreground">Define the simulated target</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium mb-2">Organization Name</label>
                                    <input
                                        type="text"
                                        value={orgName}
                                        onChange={(e) => setOrgName(e.target.value)}
                                        placeholder="e.g., Acme Corp"
                                        className="w-full px-3 py-2 bg-secondary border border-border rounded-md text-gray-900 dark:text-gray-100 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-primary"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-2">Domain</label>
                                    <input
                                        type="text"
                                        value={domain}
                                        onChange={(e) => setDomain(e.target.value)}
                                        placeholder="e.g., acme-corp.local"
                                        className="w-full px-3 py-2 bg-secondary border border-border rounded-md text-gray-900 dark:text-gray-100 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-primary"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium mb-2">Sector</label>
                                    <select
                                        value={sector}
                                        onChange={(e) => setSector(e.target.value)}
                                        className="w-full px-3 py-2 bg-secondary border border-border rounded-md text-gray-900 dark:text-gray-100 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-primary"
                                    >
                                        <option value="">Select sector...</option>
                                        <option value="Healthcare">Healthcare</option>
                                        <option value="Financial">Financial Services</option>
                                        <option value="Energy">Energy</option>
                                        <option value="Manufacturing">Manufacturing</option>
                                        <option value="Retail">Retail</option>
                                        <option value="Technology">Technology</option>
                                        <option value="Government">Government</option>
                                        <option value="Education">Education</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-2">Organization Size</label>
                                    <select
                                        value={size}
                                        onChange={(e) => setSize(e.target.value as any)}
                                        className="w-full px-3 py-2 bg-secondary border border-border rounded-md text-gray-900 dark:text-gray-100 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-primary"
                                    >
                                        <option value="small">Small (1-100)</option>
                                        <option value="medium">Medium (100-1000)</option>
                                        <option value="large">Large (1000-10000)</option>
                                        <option value="enterprise">Enterprise (10000+)</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-2">Regulatory Frameworks (comma-separated)</label>
                                <input
                                    type="text"
                                    value={regulatoryFrameworks}
                                    onChange={(e) => setRegulatoryFrameworks(e.target.value)}
                                    placeholder="e.g., HIPAA, PCI-DSS, SOX"
                                    className="w-full px-3 py-2 bg-secondary border border-border rounded-md text-gray-900 dark:text-gray-100 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-primary"
                                />
                            </div>

                            <div className="flex items-center gap-3 p-4 bg-secondary/50 rounded-lg">
                                <input
                                    type="checkbox"
                                    id="hasOT"
                                    checked={hasOT}
                                    onChange={(e) => setHasOT(e.target.checked)}
                                    className="w-4 h-4"
                                />
                                <label htmlFor="hasOT" className="flex-1">
                                    <span className="font-medium">OT/ICS Environment</span>
                                    <p className="text-sm text-muted-foreground">Include operational technology systems in the scenario</p>
                                </label>
                            </div>
                        </div>
                    )}

                    {/* Step 4: Severity Curve */}
                    {step === 4 && (
                        <div className="space-y-6">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="p-2 bg-orange-500/10 rounded-lg">
                                    <TrendingUpIcon className="w-5 h-5 text-orange-500" />
                                </div>
                                <div>
                                    <h3 className="font-semibold">Severity Curve</h3>
                                    <p className="text-sm text-muted-foreground">Define how the incident escalates</p>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-2">Escalation Pattern</label>
                                <select
                                    value={severityPattern}
                                    onChange={(e) => setSeverityPattern(e.target.value as any)}
                                    className="w-full px-3 py-2 bg-secondary border border-border rounded-md text-gray-900 dark:text-gray-100 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-primary"
                                >
                                    <option value="slow_burn">Slow Burn - Gradual escalation</option>
                                    <option value="rapid_escalation">Rapid Escalation - Quick spike</option>
                                    <option value="wave">Wave - Multiple peaks</option>
                                    <option value="persistent">Persistent - Constant high severity</option>
                                </select>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium mb-2">Starting Severity (1-5)</label>
                                    <input
                                        type="range"
                                        min={1}
                                        max={5}
                                        value={startSeverity}
                                        onChange={(e) => setStartSeverity(parseInt(e.target.value) as any)}
                                        className="w-full"
                                    />
                                    <div className="flex justify-between text-xs text-muted-foreground">
                                        <span>Low</span>
                                        <span className="font-medium text-foreground">{startSeverity}</span>
                                        <span>Critical</span>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-2">Peak Severity (1-5)</label>
                                    <input
                                        type="range"
                                        min={1}
                                        max={5}
                                        value={peakSeverity}
                                        onChange={(e) => setPeakSeverity(parseInt(e.target.value) as any)}
                                        className="w-full"
                                    />
                                    <div className="flex justify-between text-xs text-muted-foreground">
                                        <span>Low</span>
                                        <span className="font-medium text-foreground">{peakSeverity}</span>
                                        <span>Critical</span>
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-2">Peak Time (minutes from start)</label>
                                <input
                                    type="number"
                                    value={peakTimeMinutes}
                                    onChange={(e) => setPeakTimeMinutes(parseInt(e.target.value) || 30)}
                                    min={10}
                                    max={durationMinutes}
                                    className="w-full px-3 py-2 bg-secondary border border-border rounded-md text-gray-900 dark:text-gray-100 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-primary"
                                />
                                <p className="text-xs text-muted-foreground mt-1">
                                    When the incident reaches maximum severity (T+{peakTimeMinutes} of {durationMinutes} min exercise)
                                </p>
                            </div>

                            {/* Summary */}
                            <div className="p-4 bg-secondary/50 rounded-lg border border-border">
                                <h4 className="font-medium mb-3">Scenario Summary</h4>
                                <div className="grid grid-cols-2 gap-2 text-sm">
                                    <div><span className="text-muted-foreground">Name:</span> {name || '-'}</div>
                                    <div><span className="text-muted-foreground">Duration:</span> {durationMinutes} min</div>
                                    <div><span className="text-muted-foreground">Threat Actor:</span> {threatActorName || '-'}</div>
                                    <div><span className="text-muted-foreground">Sophistication:</span> {sophistication}</div>
                                    <div><span className="text-muted-foreground">Target:</span> {orgName || '-'}</div>
                                    <div><span className="text-muted-foreground">Sector:</span> {sector || '-'}</div>
                                    <div><span className="text-muted-foreground">Target Injects:</span> {injectCount}</div>
                                    <div><span className="text-muted-foreground">OT:</span> {hasOT ? 'Yes' : 'No'}</div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between p-4 border-t border-border">
                <button
                    onClick={() => setStep(s => Math.max(1, s - 1))}
                    disabled={step === 1}
                    className="px-4 py-2 bg-secondary text-secondary-foreground rounded-md text-sm font-medium hover:bg-secondary/80 disabled:opacity-50"
                >
                    Back
                </button>
                <div className="flex gap-2">
                    <button
                        onClick={onCancel}
                        className="px-4 py-2 bg-secondary text-secondary-foreground rounded-md text-sm font-medium hover:bg-secondary/80"
                    >
                        Cancel
                    </button>
                    {step < 4 ? (
                        <button
                            onClick={() => setStep(s => s + 1)}
                            disabled={!canProceed()}
                            className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 disabled:opacity-50"
                        >
                            Next
                        </button>
                    ) : (
                        <button
                            onClick={handleSubmit}
                            disabled={isLoading || !canProceed()}
                            className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 disabled:opacity-50 flex items-center gap-2"
                        >
                            {isLoading ? (
                                <LoaderIcon className="w-4 h-4 animate-spin" />
                            ) : (
                                <SaveIcon className="w-4 h-4" />
                            )}
                            Create Scenario
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ScenarioBuilder;
