import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
type NotifCtx = {
  permissionGranted: boolean | null;
  ensurePermissions: () => Promise<boolean>;
};

const Ctx = createContext<NotifCtx>({ permissionGranted: null, ensurePermissions: async () => false });

// единый behavior (важно для новых типов iOS)
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export const NotificationsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [permissionGranted, setGranted] = useState<boolean | null>(null);

  const check = async () => {
    const cur = await Notifications.getPermissionsAsync();
    setGranted(cur.status === 'granted');
  };

  useEffect(() => { check(); }, []);

  const ensurePermissions = async () => {
    const cur = await Notifications.getPermissionsAsync();
    if (cur.status === 'granted') { setGranted(true); return true; }
    const req = await Notifications.requestPermissionsAsync();
    const ok = req.status === 'granted';
    setGranted(ok);
    return ok;
  };
  useEffect(() => {
    if (Platform.OS === 'android') {
      Notifications.setNotificationChannelAsync('expiry', {
        name: 'Сроки годности',
        importance: Notifications.AndroidImportance.DEFAULT,
        // sound: 'default', // если нужен звук — раскомментируй
      });
    }
  }, []);

  const value = useMemo(() => ({ permissionGranted, ensurePermissions }), [permissionGranted]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
};

export function useNotifications() { return useContext(Ctx); }