import React, { useState } from 'react';
import { X, Key, Save, Eye, EyeOff } from 'lucide-react';

interface SettingsProps {
  apiKey: string;
  onSave: (key: string) => void;
  onClose: () => void;
}

export const Settings: React.FC<SettingsProps> = ({ apiKey, onSave, onClose }) => {
  const [tempApiKey, setTempApiKey] = useState(apiKey);
  const [showApiKey, setShowApiKey] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      onSave(tempApiKey);
    } finally {
      setIsSaving(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave();
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">Settings</h3>
          <button className="modal-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>
        
        <div className="settings-content">
          <div className="settings-section">
            <h4 className="settings-section-title">
              <Key size={16} />
              Gemini API Configuration
            </h4>
            <p className="settings-description">
              Enter your Gemini API key to enable AI-powered code assistance and chat features.
            </p>
            
            <div className="form-group">
              <label className="form-label">API Key</label>
              <div className="input-group">
                <input
                  type={showApiKey ? 'text' : 'password'}
                  value={tempApiKey}
                  onChange={(e) => setTempApiKey(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Enter your Gemini API key"
                  className="form-control"
                />
                <button
                  type="button"
                  className="input-group-append"
                  onClick={() => setShowApiKey(!showApiKey)}
                  title={showApiKey ? 'Hide API key' : 'Show API key'}
                >
                  {showApiKey ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            
            <div className="api-key-info">
              <h5>How to get your Gemini API key:</h5>
              <ol>
                <li>Visit <a href="https://makersuite.google.com/app/apikey" target="_blank" rel="noopener noreferrer">Google AI Studio</a></li>
                <li>Sign in with your Google account</li>
                <li>Click "Create API Key"</li>
                <li>Copy the generated key and paste it above</li>
              </ol>
            </div>
          </div>
          
          <div className="settings-section">
            <h4 className="settings-section-title">Editor Settings</h4>
            <div className="form-group">
              <label className="form-label">Theme</label>
              <select className="form-control" defaultValue="dark">
                <option value="dark">Dark</option>
                <option value="light">Light</option>
                <option value="auto">Auto</option>
              </select>
            </div>
            
            <div className="form-group">
              <label className="form-label">Font Size</label>
              <input
                type="range"
                min="12"
                max="24"
                defaultValue="14"
                className="form-range"
              />
            </div>
          </div>
        </div>
        
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button 
            className="btn btn-primary" 
            onClick={handleSave}
            disabled={isSaving}
          >
            {isSaving ? (
              <>
                <div className="spinner" />
                Saving...
              </>
            ) : (
              <>
                <Save size={16} />
                Save Settings
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
