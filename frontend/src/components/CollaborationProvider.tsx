import React, { createContext, useContext, useEffect, useState } from 'react';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import { MonacoBinding } from 'y-monaco';
import * as monaco from 'monaco-editor';

interface CollaborationContextType {
  ydoc: Y.Doc | null;
  provider: WebsocketProvider | null;
  isConnected: boolean;
  connectedUsers: number;
}

const CollaborationContext = createContext<CollaborationContextType>({
  ydoc: null,
  provider: null,
  isConnected: false,
  connectedUsers: 0,
});

export const useCollaboration = () => {
  const context = useContext(CollaborationContext);
  if (!context) {
    throw new Error('useCollaboration must be used within a CollaborationProvider');
  }
  return context;
};

interface CollaborationProviderProps {
  children: React.ReactNode;
  projectId: string;
}

export const CollaborationProvider: React.FC<CollaborationProviderProps> = ({ 
  children, 
  projectId 
}) => {
  const [ydoc, setYdoc] = useState<Y.Doc | null>(null);
  const [provider, setProvider] = useState<WebsocketProvider | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectedUsers, setConnectedUsers] = useState(0);

  useEffect(() => {
    if (!projectId) return;

    // Create Yjs document
    const doc = new Y.Doc();
    setYdoc(doc);

    // Create WebSocket provider
    const wsProvider = new WebsocketProvider(
      'ws://localhost:3000',
      `project-${projectId}`,
      doc
    );

    setProvider(wsProvider);

    // Handle connection status
    wsProvider.on('status', (event: any) => {
      setIsConnected(event.status === 'connected');
    });

    // Handle awareness (connected users)
    wsProvider.awareness.on('change', () => {
      setConnectedUsers(wsProvider.awareness.getStates().size);
    });

    // Cleanup on unmount
    return () => {
      wsProvider.destroy();
      doc.destroy();
    };
  }, [projectId]);

  const value: CollaborationContextType = {
    ydoc,
    provider,
    isConnected,
    connectedUsers,
  };

  return (
    <CollaborationContext.Provider value={value}>
      {children}
    </CollaborationContext.Provider>
  );
};

// Hook to bind Monaco editor with Yjs
export const useMonacoBinding = (
  editor: monaco.editor.IStandaloneCodeEditor | null,
  ydoc: Y.Doc | null,
  fieldName: string = 'content'
) => {
  useEffect(() => {
    if (!editor || !ydoc) return;

    const yText = ydoc.getText(fieldName);
    const binding = new MonacoBinding(yText, editor.getModel()!, new Set([editor]));

    return () => {
      binding.destroy();
    };
  }, [editor, ydoc, fieldName]);
};
