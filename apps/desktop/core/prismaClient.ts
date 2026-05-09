import { PrismaClient } from '@prisma/client';

let prismaInstance: PrismaClient | null = null;

function getDesktopPrismaClient() {
  if (!prismaInstance) {
    prismaInstance = new PrismaClient();
  }
  return prismaInstance;
}

export async function resetDesktopPrismaClient() {
  if (prismaInstance) {
    await prismaInstance.$disconnect();
    prismaInstance = null;
  }
}

export const prisma = new Proxy({} as PrismaClient, {
  get(_target, prop, receiver) {
    const value = Reflect.get(getDesktopPrismaClient(), prop, receiver);
    return typeof value === 'function' ? value.bind(getDesktopPrismaClient()) : value;
  },
});
