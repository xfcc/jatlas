import { clampLogPaneHeight, defaultLogPaneHeight } from '../../apps/desktop/renderer/src/splitPaneState';

describe('split pane state', () => {
  it('uses a stable default log height that fits normal desktop windows', () => {
    expect(defaultLogPaneHeight({ viewportHeight: 900 })).toBe(300);
  });

  it('keeps the log pane above its minimum height while dragging upward', () => {
    expect(clampLogPaneHeight(90, { viewportHeight: 900 })).toBe(180);
  });

  it('keeps enough height for the operation pane while dragging downward', () => {
    expect(clampLogPaneHeight(640, { viewportHeight: 780, headerHeight: 72 })).toBe(380);
  });
});
