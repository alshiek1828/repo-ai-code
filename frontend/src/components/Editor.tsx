import React, { useRef, useEffect } from 'react';
import { Editor as MonacoEditor } from '@monaco-editor/react';
import * as monaco from 'monaco-editor';
import { useCollaboration, useMonacoBinding } from './CollaborationProvider';

interface File {
  name: string;
  type: 'file' | 'directory';
  path: string;
  content?: string;
  children?: File[];
}

interface EditorProps {
  file: File | null;
  onChange: (content: string) => void;
  socket: any;
}

export const Editor: React.FC<EditorProps> = ({ file, onChange, socket }) => {
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  const { ydoc, isConnected, connectedUsers } = useCollaboration();

  const handleEditorDidMount = (editor: monaco.editor.IStandaloneCodeEditor) => {
    editorRef.current = editor;
    
    // Configure editor
    editor.updateOptions({
      fontSize: 14,
      lineHeight: 20,
      fontFamily: 'JetBrains Mono, Consolas, monospace',
      minimap: { enabled: true },
      scrollBeyondLastLine: false,
      automaticLayout: true,
      wordWrap: 'on',
      lineNumbers: 'on',
      renderWhitespace: 'selection',
      cursorBlinking: 'blink',
      cursorSmoothCaret: true,
      smoothScrolling: true,
      contextmenu: true,
      mouseWheelZoom: true,
      bracketPairColorization: { enabled: true },
      guides: {
        bracketPairs: true,
        indentation: true
      }
    });

    // Set up real-time collaboration with Yjs
    if (socket) {
      editor.onDidChangeModelContent(() => {
        const content = editor.getValue();
        onChange(content);
        
        // Send changes to other collaborators
        socket.emit('code-change', {
          projectId: 'default',
          content: content,
          timestamp: Date.now()
        });
      });

      // Listen for changes from other collaborators
      socket.on('code-change', (data: any) => {
        if (data.projectId === 'default') {
          const currentContent = editor.getValue();
          if (currentContent !== data.content) {
            editor.setValue(data.content);
          }
        }
      });
    }
  };

  // Bind Monaco editor with Yjs for real-time collaboration
  useMonacoBinding(editorRef.current, ydoc, file?.path || 'content');

  const getLanguageFromFileName = (fileName: string): string => {
    const extension = fileName.split('.').pop()?.toLowerCase();
    
    switch (extension) {
      case 'js':
      case 'jsx':
        return 'javascript';
      case 'ts':
      case 'tsx':
        return 'typescript';
      case 'py':
        return 'python';
      case 'html':
        return 'html';
      case 'css':
        return 'css';
      case 'json':
        return 'json';
      case 'md':
        return 'markdown';
      case 'xml':
        return 'xml';
      case 'sql':
        return 'sql';
      case 'yaml':
      case 'yml':
        return 'yaml';
      default:
        return 'plaintext';
    }
  };

  const getTheme = (): string => {
    return 'vs-dark';
  };

  if (!file) {
    return (
      <div className="editor-placeholder">
        <div className="placeholder-content">
          <h3>Welcome to Replit AI</h3>
          <p>Select a file from the sidebar to start coding</p>
          <div className="placeholder-features">
            <div className="feature">
              <span className="feature-icon">🤖</span>
              <span>AI-powered code assistance</span>
            </div>
            <div className="feature">
              <span className="feature-icon">⚡</span>
              <span>Real-time collaboration</span>
            </div>
            <div className="feature">
              <span className="feature-icon">🚀</span>
              <span>Instant code execution</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="editor-wrapper">
      <div className="editor-tabs">
        <div className="tab active">
          <span className="tab-icon">📄</span>
          <span className="tab-name">{file.name}</span>
          <button className="tab-close">×</button>
        </div>
      </div>
      
      <div className="editor-container">
        <MonacoEditor
          height="100%"
          language={getLanguageFromFileName(file.name)}
          theme={getTheme()}
          value={file.content || ''}
          onMount={handleEditorDidMount}
          options={{
            selectOnLineNumbers: true,
            roundedSelection: false,
            readOnly: false,
            cursorStyle: 'line',
            automaticLayout: true,
            mouseWheelZoom: true,
            contextmenu: true,
            wordWrap: 'on',
            lineNumbers: 'on',
            minimap: { enabled: true },
            scrollBeyondLastLine: false,
            fontSize: 14,
            fontFamily: 'JetBrains Mono, Consolas, monospace',
            lineHeight: 20,
            renderWhitespace: 'selection',
            cursorBlinking: 'blink',
            cursorSmoothCaret: true,
            smoothScrolling: true,
            bracketPairColorization: { enabled: true },
            guides: {
              bracketPairs: true,
              indentation: true
            }
          }}
        />
      </div>
    </div>
  );
};
