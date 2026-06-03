import i18next from '../i18n';
import type { ComponentDataType } from '../types';

type ComponentDisplaySource = Partial<Pick<ComponentDataType, 'name' | 'technicalID'>>;
type TranslateLabel = (key: string) => string;

const defaultTranslate = (key: string) => String(i18next.t(key, { ns: 'main' }));

export const getComponentDisplayName = (
  component: ComponentDisplaySource | undefined,
  fallbackId?: string,
  translate: TranslateLabel = defaultTranslate,
) => {
  const name = component?.name?.trim();
  if (name) return translate(name);

  return component?.technicalID || fallbackId || '';
};
