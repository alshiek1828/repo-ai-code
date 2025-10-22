import React from 'react';
import { Play, Settings, Download, Upload, FolderOpen } from 'lucide-react';

interface HeaderProps {
  onRun: () => void;
  isRunning: boolean;
  onSettings: () => void;
  onExport: () => void;
  onUpload: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onRun, isRunning, onSettings, onExport, onUpload }) => {
  return (
    <header className="header">
      <div className="header-left">
        <div className="logo">
          <span className="logo-icon">⚡</span>
          <span className="logo-text">Replit AI</span>
        </div>
      </div>
      
      <div className="header-center">
        <div className="project-info">
          <span className="project-name">My Project</span>
          <span className="project-status">●</span>
        </div>
      </div>
      
      <div className="header-right">
        <button className="btn btn-secondary" title="Open Project">
          <FolderOpen size={16} />
        </button>
        
        <button className="btn btn-secondary" title="Upload Files" onClick={onUpload}>
          <Upload size={16} />
        </button>
        
        <button className="btn btn-secondary" title="Download Project" onClick={onExport}>
          <Download size={16} />
        </button>
        
        <button 
          className={`btn ${isRunning ? 'btn-danger' : 'btn-success'}`}
          onClick={onRun}
          disabled={isRunning}
          title="Run Code"
        >
          <Play size={16} />
          {isRunning ? 'Running...' : 'Run'}
        </button>
        
        <button className="btn btn-secondary" onClick={onSettings} title="Settings">
          <Settings size={16} />
        </button>
      </div>
    </header>
  );
};
