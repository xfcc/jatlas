'use server';

import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import prisma from '@/lib/db';
import { fetchActressCountFromEmby } from '@/lib/emby';

export type State = {
    message?: string;
    success: boolean,
  } | undefined;

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
}) {
    const { query, status, tierId, sortBy, sortOrder } = params || {};
    const where: any = {};

    if (query) {
        where.name = { contains: query, mode: 'insensitive' };
    }
    if (status) {
        where.tier = { status: status };
    }
    if (tierId) {
        where.tierId = parseInt(tierId, 10);
    }

    const orderBy: any = (sortBy && sortOrder) 
        ? { [sortBy]: sortOrder } 
        : { id: 'asc' };

    return prisma.actress.findMany({
        where,
        include: {
            tier: true,
        },
        orderBy
    });
}

export async function updateActress(data: { id: number; video_count?: number; tierId?: number; emby_id?: string }) {
    const { id, ...rest } = data;
    try {
        const updatedActress = await prisma.actress.update({
            where: { id },
            data: rest,
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

export async function createActress(data: { name: string; video_count: number; tierId: number; emby_id?: string }) {
    try {
        const newActress = await prisma.actress.create({
            data,
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

export async function syncActressVideoCount(actressId: number, embyPersonId: string) {
    try {
        const newCount = await fetchActressCountFromEmby(embyPersonId);
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
