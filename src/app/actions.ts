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

/**
 * 【业务意图】数据探测：根据女优姓名，从 Emby 媒体库中反向查询对应的唯一 ID。
 * 【异常边界】当 Emby 接口不稳定或查询无结果时，向前端返回明确的错误信息。
 */
export async function getEmbyIdsByName(actressName: string) {
    try {
        // Step 1: 调用 Emby 接口进行精确查询
        const ids = await fetchEmbyIdsByName(actressName);
        return { success: true, data: ids };
    } catch (error) {
        // Step 2: 捕获并处理异常
        console.error('Failed to fetch emby ids by name:', error);
        if (error instanceof Error) {
            return { success: false, message: error.message };
        }
        return { success: false, message: '按姓名获取 Emby ID 失败。' };
    }
}

/**
 * 【业务意图】系统鉴权：验证用户提供的密码，并为合法用户颁发会话凭证。
 */
export async function authenticate(
    prevState: State,
    formData: FormData,
  ) {
    try {
      // Step 1: 提取用户输入的密码
      const password = formData.get('password') as string;
      
      // Step 2: 核心鉴权逻辑，比对环境变量中的密码
      if (password !== process.env.ADMIN_PASSWORD) {
        return {
            success: false,
            message: 'Invalid password.',
          };
      }

      // Step 3: 鉴权成功，签发加密会话 Cookie
      cookies().set('session', password, { httpOnly: true, secure: process.env.NODE_ENV === 'production' });
    } catch (error) {
      // 兜底：防止鉴权流程中出现意外的服务端崩溃
      if (error instanceof Error) {
        return {
            success: false,
            message: 'Something went wrong.',
          };
      }
      throw error;
    }
    
    // Step 4: 重定向至后台主控台
    redirect('/console');
  }


/**
 * 【业务意图】数据拉取：获取系统中定义的所有“女优评级”挡位。
 */
export async function getTiers() {
  return prisma.tier.findMany();
}

/**
 * 【业务意图】数据检索与过滤：根据多种条件（关键词、状态、评级等）查询女优列表，支持分页和排序。
 */
export async function getActresses(params?: { 
    query?: string; 
    status?: string; 
    tierId?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc'; 
    page?: number;
    pageSize?: number;
}) {
    // Step 1: 解构和初始化查询参数
    const { query, status, tierId, sortBy, sortOrder, page = 1, pageSize = 20 } = params || {};
    const where: Prisma.ActressWhereInput = {};

    // Step 2: 构建动态查询条件
    if (query) {
        where.name = { contains: query, mode: 'insensitive' }; // 模糊搜索
    }
    if (status) {
        where.tier = { status: status }; // 按评级状态过滤
    }
    if (tierId) {
        where.tierId = parseInt(tierId, 10); // 按评级 ID 过滤
    }

    // Step 3: 构建排序逻辑
    const orderBy: Prisma.ActressOrderByWithRelationInput = (sortBy && sortOrder) 
        ? { [sortBy]: sortOrder } 
        : { id: 'asc' };

    // Step 4: 执行数据库查询，同时返回总数用于分页
    const total = await prisma.actress.count({ where });
    const actresses = await prisma.actress.findMany({
        where,
        include: {
            tier: true, // 关联查询评级信息
        },
        orderBy,
        skip: (page - 1) * pageSize, // 分页跳过
        take: pageSize, // 每页数量
    });

    return { data: actresses, total };
}

/**
 * 【业务意图】数据更新：修改指定女优的核心档案信息，如作品数、评级或 Emby ID。
 */
export async function updateActress(data: { id: number; video_count?: number; tierId?: number; emby_id?: string[] }) {
    const { id, emby_id, ...rest } = data;
    try {
        // Step 1: 执行数据库更新操作
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
        // Step 2: 使前端缓存失效，强制刷新页面数据
        revalidatePath('/');
        return { success: true, data: updatedActress };
    } catch (error) {
        // 兜底：数据库操作失败时，向前端返回错误提示
        console.error('Failed to update actress:', error);
        return { success: false, message: '数据库同步超时，已回滚。' };
    }
}

/**
 * 【业务意图】数据创建：在数据库中新增一名女优的档案。
 */
export async function createActress(data: { name: string; video_count: number; tierId: number; emby_id?: string[] }) {
    try {
        // Step 1: 执行数据库创建操作
        const newActress = await prisma.actress.create({
            data: {
                ...data,
                emby_id: data.emby_id ?? [],
            },
            include: {
                tier: true,
            },
        });
        // Step 2: 使前端缓存失效，强制刷新页面数据
        revalidatePath('/');
        return { success: true, data: newActress };
    } catch (error) {
        // 兜底：数据库操作失败时，向前端返回错误提示
        console.error('Failed to create actress:', error);
        return { success: false, message: '创建失败，数据库错误。' };
    }
}

/**
 * 【业务意图】数据删除：从数据库中永久移除一名女优的档案。
 */
export async function deleteActress(id: number) {
    try {
        // Step 1: 执行数据库删除操作
        await prisma.actress.delete({ where: { id } });
        // Step 2: 使前端缓存失效，强制刷新页面数据
        revalidatePath('/');
        return { success: true };
    } catch (error) {
        // 兜底：数据库操作失败时（如存在外键约束），向前端返回错误提示
        console.error('Failed to delete actress:', error);
        return { success: false, message: '删除失败，请检查相关依赖。' };
    }
}

/**
 * 【业务意图】批量入库：通过文本粘贴，一次性创建多名女优档案，并自动去重。
 */
export async function batchCreateActresses(data: { tierId: number; names: string }) {
    const { tierId, names } = data;

    // Step 1: 解析和清洗输入的姓名列表
    const nameList = names.split('\n').map(name => name.trim()).filter(Boolean);
    if (nameList.length === 0) {
        return { success: false, message: '姓名列表不能为空。' };
    }

    try {
        // Step 2: 查询数据库，找出已存在的女优，实现幂等性
        const existingActresses = await prisma.actress.findMany({
            where: {
                name: { in: nameList },
            },
        });

        // Step 3: 计算出需要新增的姓名列表
        const existingNames = new Set(existingActresses.map(a => a.name));
        const newNames = nameList.filter(name => !existingNames.has(name));

        // Step 4: 对新姓名执行批量创建
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

        // Step 5: 使前端缓存失效，并返回本次操作的详细报告
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
        // 兜底：批量创建过程中任意环节失败，则整体回滚
        console.error('Failed to batch create actresses:', error);
        return { success: false, message: '批量创建失败，数据库发生错误。' };
    }
}

/**
 * 【业务意图】评级管理：创建新的女优评级挡位。
 */
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

/**
 * 【业务意图】评级管理：更新已有的女优评级挡位。
 */
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

/**
 * 【业务意图】评级管理：删除指定的女优评级挡位。
 */
export async function deleteTier(id: number) {
    try {
        await prisma.tier.delete({ where: { id } });
        revalidatePath('/');
    } catch (error) {
        // 兜底：如果评级已被女优使用，删除会失败
        console.error('Failed to delete tier:', error);
        throw new Error('Tier deletion failed.');
    }
}

/**
 * 【业务意图】自动对账：将 Emby 媒体库的真实影片库存，同步回 JATLAS 系统的数据库。
 */
export async function syncActressVideoCount(actressId: number, embyPersonIds: string[]) {
    try {
        // Step 1: 调用 Emby 接口，获取最新的影片计数
        const newCount = await fetchActressCountFromEmby(embyPersonIds);
        // Step 2: 将新计数值覆写到数据库
        const updatedActress = await prisma.actress.update({
            where: { id: actressId },
            data: { 
                video_count: newCount,
            },
        });
        // Step 3: 使后台主控台缓存失效
        revalidatePath('/console');
        return { success: true, data: updatedActress };
    } catch (error) {
        // 兜底：防止 Emby 接口超时或数据库写入失败，导致前端状态异常
        console.error('Failed to sync actress video count:', error);
        if (error instanceof Error) {
            return { success: false, message: `对账失败: ${error.message}` };
        }

        return { success: false, message: '发生未知错误，对账失败。' };
    }
}

/**
 * 【业务意图】系统维护：拉取所有数据库备份文件的列表。
 */
export async function listDatabaseBackups() {
  try {
    // Step 1: 确保备份目录存在
    await fs.mkdir(backupDir, { recursive: true });
    // Step 2: 读取目录下的所有 .sql 文件
    const files = await fs.readdir(backupDir);
    // Step 3: 解析文件名以提取创建时间，并按时间倒序排列
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
    // 兜底：文件系统读取失败
    console.error('Failed to list database backups:', error);
    return { success: false, message: '无法列出数据库备份。' };
  }
}

/**
 * 【业务意图】系统维护：执行一次全量数据库备份。
 */
export async function backupDatabase() {
  try {
    // Step 1: 准备备份目录和文件名
    await fs.mkdir(backupDir, { recursive: true });
    const now = new Date();
    const beijingTimeOffset = 8 * 60 * 60 * 1000; // 8 hours in milliseconds
    const beijingDate = new Date(now.getTime() + beijingTimeOffset);
    const timestamp = beijingDate.toISOString().replace(/:/g, '-').slice(0, 19);
    const backupFileName = `backup-${timestamp}.sql`;
    const backupFilePath = path.join(backupDir, backupFileName);
    
    // Step 2: 定位 pg_dump 工具和数据库连接
    const pgDumpPath = '/Applications/Postgres.app/Contents/Versions/18/bin/pg_dump';
    const dbUrl = process.env.DATABASE_URL?.split('?')[0];
    const command = `${pgDumpPath} "${dbUrl}" > "${backupFilePath}"`;

    // Step 3: 执行命令行备份
    await execAsync(command);

    return { success: true, message: `成功创建备份 ${backupFileName}` };
  } catch (error) {
    // 兜底：捕获并记录命令行执行的详细错误
    console.error('Failed to backup database:', error);
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

/**
 * 【业务意图】系统维护：从指定的备份文件恢复数据库。
 */
export async function restoreDatabase(fileName: string) {
  const backupFilePath = path.join(backupDir, fileName);

  try {
    // Step 1: 安全第一，在恢复前自动执行一次新的备份
    await backupDatabase();

    // Step 2: 准备 psql 恢复命令
    const psqlPath = '/Applications/Postgres.app/Contents/Versions/18/bin/psql';
    const dbUrl = process.env.DATABASE_URL?.split('?')[0];
    const command = `${psqlPath} "${dbUrl}" < "${backupFilePath}"`;

    // Step 3: 执行恢复
    await execAsync(command);
    
    // Step 4: 全局缓存失效，确保前端看到最新数据
    revalidatePath('/');
    return { success: true, message: `成功从 ${fileName} 恢复数据库。` };
  } catch (error) {
    // 兜底：恢复失败
    console.error('Failed to restore database:', error);
    return { success: false, message: '数据库恢复失败。' };
  }
}

/**
 * 【业务意图】系统维护：删除指定的数据库备份文件。
 */
export async function deleteDatabaseBackup(fileName: string) {
  const backupFilePath = path.join(backupDir, fileName);

  try {
    // Step 1: 直接从文件系统删除
    await fs.unlink(backupFilePath);
    return { success: true, message: `成功删除备份 ${fileName}` };
  } catch (error) {
    // 兜底：文件删除失败
    console.error('Failed to delete database backup:', error);
    return { success: false, message: '数据库备份删除失败。' };
  }
}


