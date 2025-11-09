import { Position } from '@/types/positions';
import { UserSettings } from '@/types/settings';
import { FirestoreDataConverter, Timestamp } from 'firebase/firestore';

function fixTimestamps(obj: any): any {
  if (!obj) return obj;

  if (obj instanceof Timestamp) return obj;

  if (typeof obj === 'object' && 'seconds' in obj && 'nanoseconds' in obj) {
    return new Timestamp(obj.seconds, obj.nanoseconds);
  }
  if (Array.isArray(obj)) {
    return obj.map((item) => fixTimestamps(item));
  }
  if (typeof obj === 'object') {
    const newObj: any = {};
    for (const key of Object.keys(obj)) {
      newObj[key] = fixTimestamps(obj[key]);
    }
    return newObj;
  }
  return obj;
}

export function createConverter<T>(): FirestoreDataConverter<T> {
  return {
    toFirestore(data: T): any {
      return data;
    },
    fromFirestore(snapshot, options): T {
      const data = snapshot.data(options);
      return fixTimestamps(data) as T;
    },
  };
}

export const positionConverter = createConverter<Position>();
export const settingsConverter = createConverter<UserSettings>();
