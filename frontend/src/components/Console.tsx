import React from 'react';
import { Terminal, Play, Square, Trash2 } from 'lucide-react';

interface ConsoleProps {
  output: string[];
  isRunning: boolean;
}

export const Console: React.FC<ConsoleProps> = ({ output, isRunning }) => {
  const clearConsole = () => {
    // This would be handled by the parent component
    console.log('Clear console');
  };

  return (
    <div className="console-panel">
      <div className="console-header">
        <div className="console-title">
          <Terminal size={16} />
          <span>Console</span>
        </div>
        <div className="console-actions">
          <button 
            className="btn-icon" 
            title="Clear Console"
            onClick={clearConsole}
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>
      
      <div className="console-content">
        {output.length === 0 ? (
          <div className="console-empty">
            <Terminal size={32} />
            <p>Console output will appear here when you run your code</p>
          </div>
        ) : (
          <div className="console-output">
            {output.map((line, index) => (
              <div key={index} className="console-line">
                <span className="console-prompt">
                  {isRunning && index === output.length - 1 ? '>' : '$'}
                </span>
                <span className="console-text">{line}</span>
              </div>
            ))}
            {isRunning && (
              <div className="console-line">
                <span className="console-prompt">></span>
                <span className="console-text console-running">
                  <span className="console-cursor">█</span>
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
