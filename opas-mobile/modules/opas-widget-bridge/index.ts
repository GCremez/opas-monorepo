import { requireOptionalNativeModule } from 'expo';

interface OpasWidgetBridge {
  setNextDeadline(json: string | null): void;
}

/** Null in Expo Go and on Android, where there is no widget to update. */
export default requireOptionalNativeModule<OpasWidgetBridge>('OpasWidgetBridge');
