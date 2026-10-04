import React, { createContext, useEffect, useState } from 'react';
import socketClient from '../services/socket';

export const SocketContext = createContext();

export const SocketProvider = ({ children }) => {
  const [socket] = useState(socketClient);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    socket.connect();

    socket.on('connect', () => {
      setIsConnected(true);
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
    });

    return () => {
      socket.disconnect();
    };
  }, [socket]);

  return (
    <SocketContext.Provider value={{ socket, isConnected }}>
      {children}
    </SocketContext.Provider>
  );
};
