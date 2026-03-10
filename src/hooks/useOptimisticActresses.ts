'use client';

import { useOptimistic } from 'react';
import { type Actress, type Tier } from '@prisma/client';
import { createActress, updateActress, deleteActress } from '@/app/actions';
import { useToast } from '@/hooks/use-toast';

// 为乐观更新定义一个更具体的数据结构，增加了 pending 状态和关联的 tier 信息
export type OptimisticActress = Omit<Actress, 'emby_id'> & { emby_id: string[]; pending?: boolean; tier?: Tier };

// 定义了三种 UI 上的“意图”：新增、更新、删除
type Action =
  | { type: 'add'; actress: OptimisticActress }
  | { type: 'update'; actress: Partial<OptimisticActress> & { id: number } }
  | { type: 'delete'; id: number };

/**
 * 【业务意图】UI 状态劫持与伪装：这是一个实现“乐观更新”的核心钩子，用于在数据库确认前，立即在前端伪造出操作成功后的 UI 状态，从而实现零延迟的交互反馈。
 */
export function useOptimisticActresses(actresses: OptimisticActress[], tiers: Tier[]) {
  const { toast } = useToast();

  // Step 1: 初始化 useOptimistic
  // optimisticActresses 是一个“代理”状态。它优先展示伪造的状态，当真实数据从服务器返回后，会自动回退到真实状态。
  const [optimisticActresses, setOptimisticActresses] = useOptimistic<OptimisticActress[], Action>(
    actresses, // 初始的、来自服务器的真实数据
    // Step 2: 定义状态伪装逻辑
    // 这是一个 reducer，它根据不同的 action（意图），在真实状态（state）之上，计算出要临时展示的虚假状态。
    (state, action) => {
      switch (action.type) {
        case 'add':
          // 意图：新增。立即在列表末尾追加一个带有“pending”标记的假数据。
          return [...state, { ...action.actress, pending: true }];
        case 'update':
          // 意图：更新。立即在列表中找到对应项，并用假数据覆盖，同时打上“pending”标记。
          return state.map(a =>
            a.id === action.actress.id ? { ...a, ...action.actress, pending: true } : a
          );
        case 'delete':
          // 意图：删除。立即在列表中将该项过滤掉。
          return state.filter(a => a.id !== action.id);
        default:
          return state;
      }
    }
  );

  // Step 3: 封装“写”操作
  // 下面的这些函数会在用户触发操作时被调用

  const handleCreateActress = async (data: { name: string; video_count: number; tierId: number; emby_id?: string[] }) => {
    // 3.1 在调用 Server Action 前，先在前端伪造一个女优对象
    const tier = tiers.find(t => t.id === data.tierId);
    const newActress: OptimisticActress = {
      id: Math.random(), // 乐观更新的关键：使用一个临时的、随机的 ID 用于 React 的 key，避免 UI 渲染错乱
      name: data.name,
      video_count: data.video_count,
      tierId: data.tierId,
      emby_id: data.emby_id || [],
      created_at: new Date(),
      updated_at: new Date(),
      pending: true, // 标记为“处理中”
      tier,
    };
    // 3.2 调用 setOptimisticActresses，触发上面定义的 reducer，让 UI 瞬间“假更新”
    setOptimisticActresses({ type: 'add', actress: newActress });
    // 3.3 然后，在后台真正地调用 Server Action 去操作数据库
    await createActress(data);
  };

  const handleUpdateActress = async (data: { id: number; video_count?: number; tierId?: number; emby_id?: string[] }) => {
    // 同样，先触发假更新，再执行真实操作
    setOptimisticActresses({ type: 'update', actress: data });
    await updateActress(data);
  };

  const handleDeleteActress = async (id: number) => {
    // 同样，先触发假更新，再执行真实操作
    setOptimisticActresses({ type: 'delete', id });
    const result = await deleteActress(id);
    // 异常边界：如果后台真实操作失败（例如数据库权限问题），前端的乐观更新会自动回滚，并弹出错误提示
    if (!result.success) {
      toast({
        title: 'Action Failed',
        description: result.message,
        variant: 'destructive',
      });
    }
  };

  return { optimisticActresses, handleCreateActress, handleUpdateActress, handleDeleteActress };
}
