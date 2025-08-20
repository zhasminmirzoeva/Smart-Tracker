export type LocalNotifSettings = {
    enabled: boolean;
    hour: number;   // 0..23
    minute: number; // 0..59
    days: number[]; // например [7,3,1,0]
  };
  
  export const DEFAULT_LOCAL_SETTINGS: LocalNotifSettings = {
    enabled: true,
    hour: 9,
    minute: 0,
    days: [3, 0],
  };
  
  export type ProductLite = {
    id: number | string;
    name: string;
    expiry_date: string; // 'YYYY-MM-DD' или ISO
    quantity?: number | null;
  };
  
  export type NotificationSettings = {
    enabled: boolean;
    remind_at_hour: number;       // 0..23
    remind_at_minute: number;     // 0..59
    remind_before_days: number[]; // например [3,0]
  };
  