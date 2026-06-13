import type { DesktopBootstrapState } from '../../core/bootstrapService';

export function getBootstrapFailureMessage(state: DesktopBootstrapState | null) {
  if (!state?.configured || state.initialized) return '';
  return state.message;
}
