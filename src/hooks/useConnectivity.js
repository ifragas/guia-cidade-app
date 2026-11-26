// src/hooks/useConnectivity.js
import { useState, useEffect } from 'react';
import NetInfo from '@react-native-community/netinfo';

export default function useConnectivity() {
  const [isConnected, setIsConnected] = useState(true);
  const [isInternetReachable, setIsInternetReachable] = useState(true);

  useEffect(() => {
    // Subscribe to network state updates
    const unsubscribe = NetInfo.addEventListener((state) => {
      const connected = state.isConnected !== false && state.isInternetReachable !== false;
      setIsConnected(connected);
      setIsInternetReachable(state.isInternetReachable ?? true);
    });

    // Initial check
    NetInfo.fetch().then((state) => {
      setIsConnected(state.isConnected !== false && state.isInternetReachable !== false);
      setIsInternetReachable(state.isInternetReachable ?? true);
    });

    return () => unsubscribe();
  }, []);

  return { isConnected, isInternetReachable };
}