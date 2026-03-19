import Conf from 'conf';
import type { Identity } from '@cling-talk/shared';

export const appConfig = new Conf<{ identity?: Identity }>({
  projectName: 'cling-talk',
});
