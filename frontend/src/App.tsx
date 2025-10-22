import React, { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import { Editor } from './components/Editor';
import { FileTree } from './components/FileTree';
import { ChatPanel } from './components/ChatPanel';
import { Console } from './components/Console';
import { Settings } from './components/Settings';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { CollaborationProvider } from './components/CollaborationProvider';
import './App.css';

interface File {
  name: string;
  type: 'file' | 'directory';
  path: string;
  content?: string;
  children?: File[];
}

interface Project {
  id: string;
  name: string;
  files: File[];
}

function App() {
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [currentFile, setCurrentFile] = useState<File | null>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [consoleOutput, setConsoleOutput] = useState<string[]>([]);
  const [socket, setSocket] = useState<any>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [geminiApiKey, setGeminiApiKey] = useState('');

  useEffect(() => {
    // Initialize WebSocket connection
    const newSocket = io('http://localhost:3000');
    setSocket(newSocket);

    // Load saved API key
    const savedKey = localStorage.getItem('gemini-api-key');
    if (savedKey) {
      setGeminiApiKey(savedKey);
    }

    // Create default project
    const defaultProject: Project = {
      id: 'default',
      name: 'My Project',
      files: [
        {
          name: 'index.js',
          type: 'file',
          path: 'index.js',
          content: 'console.log("Hello, Replit AI!");\n\n// Write your JavaScript code here\n'
        }
      ]
    };
    setCurrentProject(defaultProject);
    setFiles(defaultProject.files);
    setCurrentFile(defaultProject.files[0]);

    return () => {
      newSocket.close();
    };
  }, []);

  const handleFileSelect = (file: File) => {
    setCurrentFile(file);
  };

  const handleFileChange = (content: string) => {
    if (currentFile) {
      const updatedFile = { ...currentFile, content };
      setCurrentFile(updatedFile);
      
      // Update in files array
      const updateFileInArray = (files: File[]): File[] => {
        return files.map(file => {
          if (file.path === currentFile.path) {
            return updatedFile;
          }
          if (file.children) {
            return { ...file, children: updateFileInArray(file.children) };
          }
          return file;
        });
      };
      
      setFiles(updateFileInArray(files));
    }
  };

  const handleRunCode = async () => {
    if (!currentFile) return;
    
    setIsRunning(true);
    setConsoleOutput(['Running code...']);
    
    try {
      const response = await fetch('http://localhost:3000/api/execute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token') || 'demo-token'}`
        },
        body: JSON.stringify({
          code: currentFile.content,
          language: 'javascript'
        })
      });
      
      const result = await response.json();
      
      if (result.success) {
        setConsoleOutput([
          ...consoleOutput,
          'Output:',
          result.result || 'No output',
          result.error ? `Error: ${result.error}` : ''
        ]);
      } else {
        setConsoleOutput([...consoleOutput, `Error: ${result.error}`]);
      }
    } catch (error) {
      setConsoleOutput([...consoleOutput, `Error: ${error}`]);
    } finally {
      setIsRunning(false);
    }
  };

  const handleSaveApiKey = (key: string) => {
    setGeminiApiKey(key);
    localStorage.setItem('gemini-api-key', key);
    setIsSettingsOpen(false);
  };

  const handleExportProject = async () => {
    try {
      const response = await fetch('http://localhost:3000/api/export/default', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token') || 'demo-token'}`
        }
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'project.zip';
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        console.error('Export failed');
      }
    } catch (error) {
      console.error('Export error:', error);
    }
  };

  const handleUploadFiles = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = true;
    input.onchange = async (e) => {
      const files = (e.target as HTMLInputElement).files;
      if (files) {
        for (const file of Array.from(files)) {
          // Handle file upload logic here
          console.log('Uploading file:', file.name);
        }
      }
    };
    input.click();
  };

  return (
    <CollaborationProvider projectId="default">
      <div className="app">
        <Header 
          onRun={handleRunCode}
          isRunning={isRunning}
          onSettings={() => setIsSettingsOpen(true)}
          onExport={handleExportProject}
          onUpload={handleUploadFiles}
        />
        
        <div className="main-content">
          <Sidebar>
            <FileTree 
              files={files}
              onFileSelect={handleFileSelect}
              currentFile={currentFile}
            />
          </Sidebar>
          
          <div className="editor-container">
            <Editor
              file={currentFile}
              onChange={handleFileChange}
              socket={socket}
            />
          </div>
          
          <div className="right-panel">
            <ChatPanel 
              apiKey={geminiApiKey}
              currentFile={currentFile}
            />
            <Console 
              output={consoleOutput}
              isRunning={isRunning}
            />
          </div>
        </div>
        
        {isSettingsOpen && (
          <Settings
            apiKey={geminiApiKey}
            onSave={handleSaveApiKey}
            onClose={() => setIsSettingsOpen(false)}
          />
        )}
      </div>
    </CollaborationProvider>
  );
}

export default App;
