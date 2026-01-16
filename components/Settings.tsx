import React from 'react';
import { UserProfile, Job, NotificationType } from '../types';

interface SettingsProps {
    userProfile: UserProfile;
    onUpdate: (p: UserProfile) => void;
    dirHandle: FileSystemDirectoryHandle | null;
    onDirHandleChange: () => void;
    jobs: Job[];
    showNotification: (message: string, type: NotificationType) => void;
    onReset: () => Promise<void>;
    isOwner: boolean;  // ✅ FIXED - This was missing
}

const Settings: React.FC<SettingsProps> = ({
    userProfile,
    onUpdate,
    dirHandle,
    onDirHandleChange,
    jobs,
    showNotification,
    onReset,
    isOwner
}) => {
    const handleProfileUpdate = (field: keyof UserProfile, value: string) => {
        onUpdate({ ...userProfile, [field]: value });
    };

    const handleResetAll = async () => {
        if (confirm('Reset all settings? This cannot be undone.')) {
            await onReset();
            showNotification('Settings reset successfully', 'success');
        }
    };

    return (
        <div className="settings-panel p-6 bg-white rounded-lg shadow-lg max-w-2xl mx-auto">
            <h2 className="text-2xl font-bold mb-6 text-gray-800">Settings</h2>

            {/* Profile Section */}
            <div className="space-y-4 mb-8">
                <h3 className="text-lg font-semibold text-gray-700">Profile</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input
                        type="text"
                        placeholder="Full Name"
                        value={userProfile.name}
                        onChange={(e) => handleProfileUpdate('name', e.target.value)}
                        className="p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <input
                        type="email"
                        placeholder="Email"
                        value={userProfile.email}
                        onChange={(e) => handleProfileUpdate('email', e.target.value)}
                        className="p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <input
                        type="tel"
                        placeholder="Phone"
                        value={userProfile.phone}
                        onChange={(e) => handleProfileUpdate('phone', e.target.value)}
                        className="p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <input
                        type="text"
                        placeholder="Location"
                        value={userProfile.location}
                        onChange={(e) => handleProfileUpdate('location', e.target.value)}
                        className="p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                </div>
                <textarea
                    placeholder="Professional Summary"
                    value={userProfile.summary}
                    onChange={(e) => handleProfileUpdate('summary', e.target.value)}
                    rows={4}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
            </div>

            {/* Jobs Section */}
            <div className="space-y-4 mb-8">
                <h3 className="text-lg font-semibold text-gray-700">Jobs ({jobs.length})</h3>
                {jobs.length === 0 ? (
                    <p className="text-gray-500 italic">No jobs tracked yet</p>
                ) : (
                    <div className="grid grid-cols-1 gap-2 max-h-40 overflow-y-auto">
                        {jobs.slice(-5).map((job) => (
                            <div key={job.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                                <span>{job.title} - {job.company}</span>
                                <span className="text-sm text-gray-500">{job.status}</span>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Directory Handle */}
            <div className="space-y-4 mb-8">
                <h3 className="text-lg font-semibold text-gray-700">Resume Storage</h3>
                <div className="flex items-center space-x-3">
                    <span className="text-sm font-medium text-gray-700">
                        {dirHandle ? `📁 ${dirHandle.name}` : 'No directory selected'}
                    </span>
                    <button
                        onClick={onDirHandleChange}
                        className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
                    >
                        {dirHandle ? 'Change' : 'Select Directory'}
                    </button>
                </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-3 pt-6 border-t">
                {isOwner && (
                    <button
                        onClick={handleResetAll}
                        className="flex-1 px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
                    >
                        Reset All Settings
                    </button>
                )}
                <button
                    onClick={() => showNotification('Settings saved!', 'success')}
                    className="flex-1 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
                >
                    Save Settings
                </button>
            </div>
        </div>
    );
};

export default Settings;
