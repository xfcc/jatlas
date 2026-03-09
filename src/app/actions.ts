'use server';

import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import prisma from '@/lib/db';
import { Prisma } from '@prisma/client';
import { fetchActressCountFromEmby, fetchEmbyIdsByName } from '@/lib/emby';
import { exec } from 'child_process';
import fs from 'fs/promises';
import path from 'path';
import { promisify } from 'util';

const execAsync = promisify(exec);
const backupDir = path.join(process.cwd(), 'backups');

export type State = {
    message?: string;
    success: boolean,
  } | undefined;

export async function getEmbyIdsByName(actressName: string) {
    try {
        const ids = await fetchEmbyIdsByName(actressName);
        return { success: true, data: ids };
    } catch (error) {
        console.error('Failed to fetch emby ids by name:', error);
        if (error instanceof Error) {
            return { success: false, message: error.message };
        }
        return { success: false, message: '按姓名获取 Emby ID 失败。' };
    }
}

export async function authenticate(
    prevState: State,
    formData: FormData,
  ) {
    try {
      const password = formData.get('password') as string;
      
      if (password !== process.env.ADMIN_PASSWORD) {
        return {
            success: false,
            message: 'Invalid password.',
          };
      }

      cookies().set('session', password, { httpOnly: true, secure: process.env.NODE_ENV === 'production' });
    } catch (error) {
      if (error instanceof Error) {
        return {
            success: false,
            message: 'Something went wrong.',
          };
      }
      throw error;
    }
    
    redirect('/console');
  }



export async function getTiers() {
  return prisma.tier.findMany();
}

export async function getActresses(params?: { 
    query?: string; 
    status?: string; 
    tierId?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc'; 
    page?: number;
    pageSize?: number;
}) {
    const { query, status, tierId, sortBy, sortOrder, page = 1, pageSize = 20 } = params || {};
    const where: Prisma.ActressWhereInput = {};

    if (query) {
        where.name = { contains: query, mode: 'insensitive' };
    }
    if (status) {
        where.tier = { status: status };
    }
    if (tierId) {
        where.tierId = parseInt(tierId, 10);
    }

    const orderBy: Prisma.ActressOrderByWithRelationInput = (sortBy && sortOrder) 
        ? { [sortBy]: sortOrder } 
        : { id: 'asc' };

    const total = await prisma.actress.count({ where });
    const actresses = await prisma.actress.findMany({
        where,
        include: {
            tier: true,
        },
        orderBy,
        skip: (page - 1) * pageSize,
        take: pageSize,
    });

    return { data: actresses, total };
}

export async function updateActress(data: { id: number; video_count?: number; tierId?: number; emby_id?: string[] }) {
    const { id, emby_id, ...rest } = data;
    try {
        const updatedActress = await prisma.actress.update({
            where: { id },
            data: {
                ...rest,
                emby_id: emby_id ? { set: emby_id } : undefined,
            },
            include: {
                tier: true,
            },
        });
        revalidatePath('/');
        return { success: true, data: updatedActress };
    } catch (error) {
        console.error('Failed to update actress:', error);
        return { success: false, message: '数据库同步超时，已回滚。' };
    }
}

export async function createActress(data: { name: string; video_count: number; tierId: number; emby_id?: string[] }) {
    try {
        const newActress = await prisma.actress.create({
            data: {
                ...data,
                emby_id: data.emby_id ?? [],
            },
            include: {
                tier: true,
            },
        });
        revalidatePath('/');
        return { success: true, data: newActress };
    } catch (error) {
        console.error('Failed to create actress:', error);
        return { success: false, message: '创建失败，数据库错误。' };
    }
}

export async function deleteActress(id: number) {
    try {
        await prisma.actress.delete({ where: { id } });
        revalidatePath('/');
        return { success: true };
    } catch (error) {
        console.error('Failed to delete actress:', error);
        return { success: false, message: '删除失败，请检查相关依赖。' };
    }
}

export async function batchCreateActresses(data: { tierId: number; names: string }) {
    const { tierId, names } = data;

    const nameList = names.split('\n').map(name => name.trim()).filter(Boolean);
    if (nameList.length === 0) {
        return { success: false, message: '姓名列表不能为空。' };
    }

    try {
        const existingActresses = await prisma.actress.findMany({
            where: {
                name: { in: nameList },
            },
        });

        const existingNames = new Set(existingActresses.map(a => a.name));
        const newNames = nameList.filter(name => !existingNames.has(name));

        if (newNames.length > 0) {
            await prisma.actress.createMany({
                data: newNames.map(name => ({
                    name,
                    tierId,
                    video_count: 0,
                    emby_id: [],
                })),
            });
        }

        revalidatePath('/');
        
        return {
            success: true,
            data: {
                createdCount: newNames.length,
                skippedCount: existingNames.size,
                skippedNames: Array.from(existingNames),
            },
        };
    } catch (error) {
        console.error('Failed to batch create actresses:', error);
        return { success: false, message: '批量创建失败，数据库发生错误。' };
    }
}

export async function createTier(data: { name: string; video_limit: number | null, status: string }) {
    try {
        const newTier = await prisma.tier.create({ data });
        revalidatePath('/');
        return newTier;
    } catch (error) {
        console.error('Failed to create tier:', error);
        throw new Error('Tier creation failed.');
    }
}

export async function updateTier(data: { id: number; name?: string; video_limit?: number | null, status?: string }) {
    const { id, ...rest } = data;
    try {
        const updatedTier = await prisma.tier.update({
            where: { id },
            data: rest,
        });
        revalidatePath('/');
        return updatedTier;
    } catch (error) {
        console.error('Failed to update tier:', error);
        throw new Error('Tier update failed.');
    }
}

export async function deleteTier(id: number) {
    try {
        await prisma.tier.delete({ where: { id } });
        revalidatePath('/');
    } catch (error) {
        console.error('Failed to delete tier:', error);
        throw new Error('Tier deletion failed.');
    }
}

export async function syncActressVideoCount(actressId: number, embyPersonIds: string[]) {
    try {
        const newCount = await fetchActressCountFromEmby(embyPersonIds);
        const updatedActress = await prisma.actress.update({
            where: { id: actressId },
            data: { 
                video_count: newCount,
            },
        });
        revalidatePath('/console');
        return { success: true, data: updatedActress };
    } catch (error) {
        console.error('Failed to sync actress video count:', error);
        if (error instanceof Error) {
            return { success: false, message: `对账失败: ${error.message}` };
        }

        return { success: false, message: '发生未知错误，对账失败。' };
    }
}

export async function listDatabaseBackups() {
  try {
    await fs.mkdir(backupDir, { recursive: true });
    const files = await fs.readdir(backupDir);
    const backups = files
      .filter(file => file.endsWith('.sql'))
      .map(file => {
        const match = file.match(/(\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2})/);
        const createdAt = match ? new Date(match[0].slice(0, 11) + match[0].slice(11).replace(/-/g, ':')).toISOString() : new Date().toISOString();
        return {
          name: file,
          createdAt,
        };
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return { success: true, data: backups };
  } catch (error) {
    console.error('Failed to list database backups:', error);
    return { success: false, message: '无法列出数据库备份。' };
  }
}

export async function backupDatabase() {
  try {
    await fs.mkdir(backupDir, { recursive: true });
    const timestamp = new Date().toISOString().replace(/:/g, '-').slice(0, 19);
    const backupFileName = `backup-${timestamp}.sql`;
    const backupFilePath = path.join(backupDir, backupFileName);
    const pgDumpPath = '/Applications/Postgres.app/Contents/Versions/18/bin/pg_dump';
    const dbUrl = process.env.DATABASE_URL?.split('?')[0];
      const command = `${pgDumpPath} "${dbUrl}" > "${backupFilePath}"`;

    await execAsync(command);

    return { success: true, message: `成功创建备份 ${backupFileName}` };
  } catch (error) {
    console.error('Failed to backup database:', error);
    // Log the detailed error message from the command
    let stderrMessage = '';
    if (error && typeof error === 'object' && 'stderr' in error) {
      stderrMessage = (error as { stderr: string }).stderr;
      console.error('pg_dump stderr:', stderrMessage);
    }
    
    let errorMessage = '';
    if (error instanceof Error) {
      errorMessage = error.message;
    }

    return { success: false, message: `数据库备份失败: ${stderrMessage || errorMessage}` };
  }
}

export async function restoreDatabase(fileName: string) {
  const backupFilePath = path.join(backupDir, fileName);

  try {
    // First, create a new backup before restoring
    await backupDatabase();

    const psqlPath = '/Applications/Postgres.app/Contents/Versions/18/bin/psql';
      const dbUrl = process.env.DATABASE_URL?.split('?')[0];
      const command = `${psqlPath} "${dbUrl}" < "${backupFilePath}"`;
    await execAsync(command);
    
    revalidatePath('/');
    return { success: true, message: `成功从 ${fileName} 恢复数据库。` };
  } catch (error) {
    console.error('Failed to restore database:', error);
    return { success: false, message: '数据库恢复失败。' };
  }
}

export async function deleteDatabaseBackup(fileName: string) {
  const backupFilePath = path.join(backupDir, fileName);

  try {
    await fs.unlink(backupFilePath);
    return { success: true, message: `成功删除备份 ${fileName}` };
  } catch (error) {
    console.error('Failed to delete database backup:', error);
    return { success: false, message: '数据库备份删除失败。' };
  }
}

