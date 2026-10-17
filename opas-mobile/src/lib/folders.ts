import type { TFunction } from 'i18next';
import type { Folder } from '../types';

/** Built-in categories show their translated name; the user's own folders show theirs. */
export function folderName(folder: Pick<Folder, 'name' | 'categoryKey'>, t: TFunction): string {
  return folder.categoryKey ? t(`folders.folder_${folder.categoryKey}`, { defaultValue: folder.name }) : folder.name;
}
