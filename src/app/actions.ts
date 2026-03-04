'use server';

import prisma from '@/lib/db';
import { revalidatePath } from 'next/cache';



export async function getTiers() {
  return prisma.tier.findMany();
}

export async function getActresses(params?: { query?: string; status?: string; tierId?: string }) {
    const { query, status, tierId } = params || {};
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

    return prisma.actress.findMany({
        where,
        include: {
            tier: true,
        },
        orderBy: {
            id: 'asc',
        }
    });
}

export async function updateActress(data: { id: number; video_count?: number; tierId?: number }) {
    const { id, ...rest } = data;
    const updatedActress = await prisma.actress.update({
        where: { id },
        data: rest,
        include: {
            tier: true,
        },
    });
    revalidatePath('/');
    return updatedActress;
}

export async function createActress(data: { name: string; video_count: number; tierId: number }) {
    const newActress = await prisma.actress.create({
        data,
        include: {
            tier: true,
        },
    });
    revalidatePath('/');
    return newActress;
}

export async function deleteActress(id: number) {
    await prisma.actress.delete({ where: { id } });
    revalidatePath('/');
}

export async function createTier(data: { name: string; video_limit: number | null, status: string }) {
    const newTier = await prisma.tier.create({ data });
    revalidatePath('/');
    return newTier;
}

export async function updateTier(data: { id: number; name?: string; video_limit?: number | null, status?: string }) {
    const { id, ...rest } = data;
    const updatedTier = await prisma.tier.update({
        where: { id },
        data: rest,
    });
    revalidatePath('/');
    return updatedTier;
}

export async function deleteTier(id: number) {
    await prisma.tier.delete({ where: { id } });
    revalidatePath('/');
}
