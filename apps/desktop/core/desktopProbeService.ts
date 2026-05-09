export type DesktopHealthSnapshot = {
  appName: string;
  runtime: 'electron-main';
  nodeVersion: string;
  platform: NodeJS.Platform;
  arch: string;
  timestamp: string;
};

export function getDesktopHealthSnapshotCore(): DesktopHealthSnapshot {
  return {
    appName: 'JATLAS Desktop',
    runtime: 'electron-main',
    nodeVersion: process.version,
    platform: process.platform,
    arch: process.arch,
    timestamp: new Date().toISOString(),
  };
}
