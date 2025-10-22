import React, { useState } from 'react';
import { 
  File, 
  Folder, 
  FolderOpen, 
  Plus, 
  MoreHorizontal,
  FileText,
  FileCode,
  FileImage,
  FileJson
} from 'lucide-react';

interface File {
  name: string;
  type: 'file' | 'directory';
  path: string;
  content?: string;
  children?: File[];
}

interface FileTreeProps {
  files: File[];
  onFileSelect: (file: File) => void;
  currentFile: File | null;
}

export const FileTree: React.FC<FileTreeProps> = ({ files, onFileSelect, currentFile }) => {
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; file: File } | null>(null);

  const toggleFolder = (path: string) => {
    const newExpanded = new Set(expandedFolders);
    if (newExpanded.has(path)) {
      newExpanded.delete(path);
    } else {
      newExpanded.add(path);
    }
    setExpandedFolders(newExpanded);
  };

  const getFileIcon = (fileName: string) => {
    const extension = fileName.split('.').pop()?.toLowerCase();
    
    switch (extension) {
      case 'js':
      case 'jsx':
      case 'ts':
      case 'tsx':
        return <FileCode size={16} />;
      case 'html':
      case 'css':
        return <FileText size={16} />;
      case 'json':
        return <FileJson size={16} />;
      case 'png':
      case 'jpg':
      case 'jpeg':
      case 'gif':
      case 'svg':
        return <FileImage size={16} />;
      default:
        return <File size={16} />;
    }
  };

  const handleContextMenu = (e: React.MouseEvent, file: File) => {
    e.preventDefault();
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      file
    });
  };

  const closeContextMenu = () => {
    setContextMenu(null);
  };

  const renderFile = (file: File, level: number = 0) => {
    const isExpanded = expandedFolders.has(file.path);
    const isSelected = currentFile?.path === file.path;
    const hasChildren = file.children && file.children.length > 0;

    return (
      <div key={file.path}>
        <div
          className={`file-item ${isSelected ? 'selected' : ''}`}
          style={{ paddingLeft: `${level * 20 + 8}px` }}
          onClick={() => {
            if (file.type === 'file') {
              onFileSelect(file);
            } else {
              toggleFolder(file.path);
            }
          }}
          onContextMenu={(e) => handleContextMenu(e, file)}
        >
          <div className="file-icon">
            {file.type === 'directory' ? (
              isExpanded ? <FolderOpen size={16} /> : <Folder size={16} />
            ) : (
              getFileIcon(file.name)
            )}
          </div>
          <span className="file-name">{file.name}</span>
          {file.type === 'directory' && (
            <button
              className="expand-btn"
              onClick={(e) => {
                e.stopPropagation();
                toggleFolder(file.path);
              }}
            >
              {isExpanded ? '▼' : '▶'}
            </button>
          )}
        </div>
        
        {file.type === 'directory' && isExpanded && file.children && (
          <div className="folder-children">
            {file.children.map(child => renderFile(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="file-tree">
      <div className="file-tree-header">
        <h3>Files</h3>
        <div className="file-tree-actions">
          <button className="btn-icon" title="New File">
            <Plus size={16} />
          </button>
          <button className="btn-icon" title="New Folder">
            <Folder size={16} />
          </button>
        </div>
      </div>
      
      <div className="file-tree-content">
        {files.map(file => renderFile(file))}
      </div>
      
      {contextMenu && (
        <div
          className="context-menu"
          style={{
            position: 'fixed',
            left: contextMenu.x,
            top: contextMenu.y,
            zIndex: 1000
          }}
          onClick={closeContextMenu}
        >
          <div className="context-menu-content">
            <button className="context-menu-item">
              <File size={14} />
              New File
            </button>
            <button className="context-menu-item">
              <Folder size={14} />
              New Folder
            </button>
            <hr className="context-menu-divider" />
            <button className="context-menu-item">
              Rename
            </button>
            <button className="context-menu-item text-danger">
              Delete
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
