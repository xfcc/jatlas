import fs from 'fs/promises';
import path from 'path';

export type DesktopRuntimeConfig = {
  dbMode: 'sqlite' | 'postgres';
  databaseUrl: string;
  adminPassword?: string;
  embyServerUrl?: string;
  embyApiKey?: string;
};

export function getDesktopConfigPath(userDataPath: string) {
  return path.join(userDataPath, 'desktop-config.json');
}

export async function loadDesktopRuntimeConfig(userDataPath: string): Promise<DesktopRuntimeConfig | null> {
  const configPath = getDesktopConfigPath(userDataPath);
  try {
    const raw = await fs.readFile(configPath, 'utf8');
    const parsed = JSON.parse(raw) as DesktopRuntimeConfig;
    if (!parsed?.databaseUrl || (parsed.dbMode !== 'sqlite' && parsed.dbMode !== 'postgres')) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export async function saveDesktopRuntimeConfig(userDataPath: string, config: DesktopRuntimeConfig) {
  const configPath = getDesktopConfigPath(userDataPath);
  await fs.mkdir(path.dirname(configPath), { recursive: true });
  await fs.writeFile(configPath, JSON.stringify(config, null, 2), 'utf8');
  return configPath;
}

export function applyDesktopRuntimeEnv(config: DesktopRuntimeConfig) {
  process.env.DATABASE_URL = config.databaseUrl;
  if (config.adminPassword) {
    process.env.ADMIN_PASSWORD = config.adminPassword;
  } else {
    delete process.env.ADMIN_PASSWORD;
  }
  if (config.embyServerUrl) {
    process.env.EMBY_SERVER_URL = config.embyServerUrl;
  } else {
    delete process.env.EMBY_SERVER_URL;
  }
  if (config.embyApiKey) {
    process.env.EMBY_API_KEY = config.embyApiKey;
  } else {
    delete process.env.EMBY_API_KEY;
  }
}
