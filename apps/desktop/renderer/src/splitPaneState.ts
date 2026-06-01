export type SplitPaneHeightOptions = {
  viewportHeight: number;
  headerHeight?: number;
  splitterHeight?: number;
  minOperationPaneHeight?: number;
  minLogPaneHeight?: number;
};

const defaultHeaderHeight = 0;
const defaultSplitterHeight = 8;
const defaultMinOperationPaneHeight = 320;
const defaultMinLogPaneHeight = 180;
const preferredLogPaneHeight = 300;

function availablePaneHeight(options: SplitPaneHeightOptions) {
  return Math.max(
    0,
    options.viewportHeight - (options.headerHeight ?? defaultHeaderHeight) - (options.splitterHeight ?? defaultSplitterHeight),
  );
}

export function clampLogPaneHeight(rawHeight: number, options: SplitPaneHeightOptions) {
  const minLog = options.minLogPaneHeight ?? defaultMinLogPaneHeight;
  const minOperation = options.minOperationPaneHeight ?? defaultMinOperationPaneHeight;
  const availableHeight = availablePaneHeight(options);
  const maxLog = Math.max(minLog, availableHeight - minOperation);

  return Math.min(Math.max(Math.round(rawHeight), minLog), maxLog);
}

export function defaultLogPaneHeight(options: SplitPaneHeightOptions) {
  return clampLogPaneHeight(preferredLogPaneHeight, options);
}
