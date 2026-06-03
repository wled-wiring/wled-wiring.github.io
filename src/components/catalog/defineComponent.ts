import type { ComponentPackage } from './componentSchema';

export const defineComponent = <Package extends ComponentPackage>(componentPackage: Package): Package => {
  return componentPackage;
};
