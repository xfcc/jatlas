<script setup>
import { ref, onMounted } from 'vue';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '@/components/ui/table';
import {
  Tabs, TabsContent, TabsList, TabsTrigger
} from '@/components/ui/tabs';
import { CircleX, FilePen, Trash2 } from 'lucide-vue-next';

const actresses = ref([]);
const tiers = ref([]);
const isAddDialogOpen = ref(false);
const isEditDialogOpen = ref(false);
const isNameDuplicate = ref(false);

const newActress = ref({ name: '', video_count: 0, tier_id: null });
const currentActress = ref({ id: null, name: '', video_count: 0, tier_id: null });

const selectedStatus = ref('现役'); // For radio buttons in forms

// Fetch Tiers
const fetchTiers = async () => {
  try {
    const response = await fetch('http://127.0.0.1:8000/api/tiers');
    if (response.ok) {
      tiers.value = await response.json();
    } else {
      console.error('Failed to fetch tiers');
    }
  } catch (error) {
    console.error('An error occurred while fetching tiers:', error);
  }
};

// Fetch Actresses
const fetchActresses = async () => {
  try {
    const response = await fetch('http://127.0.0.1:8000/api/actresses');
    if (response.ok) {
      actresses.value = await response.json();
    } else {
      console.error('Failed to fetch actresses');
    }
  } catch (error) {
    console.error('An error occurred while fetching actresses:', error);
  }
};

onMounted(() => {
  fetchActresses();
  fetchTiers();
});

// Check for duplicate name
const checkName = async () => {
  if (!newActress.value.name) {
    isNameDuplicate.value = false;
    return;
  }
  try {
    const response = await fetch(`http://127.0.0.1:8000/api/actresses/check?name=${newActress.value.name}`);
    const data = await response.json();
    isNameDuplicate.value = data.exists;
  } catch (error) {
    console.error('An error occurred while checking the name:', error);
  }
};

// Add Actress
const addActress = async () => {
  if (isNameDuplicate.value) return;
  try {
    const response = await fetch('http://127.0.0.1:8000/api/actresses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newActress.value),
    });
    if (response.ok) {
      await fetchActresses();
      isAddDialogOpen.value = false;
      newActress.value = { name: '', video_count: 0, tier_id: null };
      isNameDuplicate.value = false;
    } else {
      console.error('Failed to add actress');
    }
  } catch (error) {
    console.error('An error occurred while adding the actress:', error);
  }
};

// Open Edit Dialog and set status
const openEditDialog = (actress) => {
  currentActress.value = { ...actress };
  if (actress.tier_id) {
    const tier = tiers.value.find(t => t.id === actress.tier_id);
    if (tier) {
      selectedStatus.value = tier.status;
    }
  } else {
    selectedStatus.value = '现役'; // Default
  }
  isEditDialogOpen.value = true;
};

// Update Actress
const updateActress = async () => {
  if (!currentActress.value.id) return;
  try {
    const response = await fetch(`http://127.0.0.1:8000/api/actresses/${currentActress.value.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: currentActress.value.name,
        video_count: currentActress.value.video_count,
        tier_id: currentActress.value.tier_id,
      }),
    });
    if (response.ok) {
      await fetchActresses();
      isEditDialogOpen.value = false;
    } else {
      console.error('Failed to update actress');
    }
  } catch (error) {
    console.error('An error occurred while updating the actress:', error);
  }
};

// Delete Actress
const deleteActress = async (id) => {
  if (confirm('Are you sure you want to delete this actress?')) {
    try {
      const response = await fetch(`http://127.0.0.1:8000/api/actresses/${id}`, {
        method: 'DELETE',
      });
      if (response.ok) {
        await fetchActresses();
      } else {
        console.error('Failed to delete actress');
      }
    } catch (error) {
      console.error('An error occurred while deleting the actress:', error);
    }
  }
};

const selectTier = (tierId, context) => {
  if (context === 'new') {
    newActress.value.tier_id = newActress.value.tier_id === tierId ? null : tierId;
  } else {
    currentActress.value.tier_id = currentActress.value.tier_id === tierId ? null : tierId;
  }
};

</script>

<template>
  <div class="min-h-screen bg-zinc-900 text-white">
    <header class="p-4 border-b border-zinc-700 flex justify-between items-center">
      <h1 class="text-xl font-bold">JATLAS - 影视收集看板 (V0.3.2)</h1>
      <Button @click="isAddDialogOpen = true">新增演员</Button>
    </header>

    <main class="p-4">
      <Tabs default-value="actresses" class="w-full">
        <TabsList class="grid w-full grid-cols-2 bg-zinc-800">
          <TabsTrigger value="actresses">演员看板</TabsTrigger>
          <TabsTrigger value="tiers">分类字典</TabsTrigger>
        </TabsList>

        <!-- Actresses Panel -->
        <TabsContent value="actresses">
          <div class="rounded-lg border border-zinc-700 mt-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead class="w-[100px] text-white">ID</TableHead>
                  <TableHead class="text-white">姓名</TableHead>
                  <TableHead class="text-white">影片数量</TableHead>
                  <TableHead class="text-white">当前分类</TableHead>
                  <TableHead class="text-right text-white">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow v-for="actress in actresses" :key="actress.id">
                  <TableCell class="font-medium">{{ actress.id }}</TableCell>
                  <TableCell>{{ actress.name }}</TableCell>
                  <TableCell>{{ actress.video_count }}</TableCell>
                  <TableCell>
                    <span v-if="actress.tier_name">{{ actress.tier_name }}</span>
                    <span v-else class="text-zinc-500">待分类</span>
                  </TableCell>
                  <TableCell class="text-right">
                    <Button variant="ghost" size="icon" @click="openEditDialog(actress)">
                      <FilePen class="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" @click="deleteActress(actress.id)" class="text-red-500 hover:text-red-400">
                      <Trash2 class="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <!-- Tiers Panel -->
        <TabsContent value="tiers">
          <div class="rounded-lg border border-zinc-700 mt-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead class="text-white">ID</TableHead>
                  <TableHead class="text-white">分类名称</TableHead>
                  <TableHead class="text-white">所属状态</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow v-for="tier in tiers" :key="tier.id">
                  <TableCell>{{ tier.id }}</TableCell>
                  <TableCell>{{ tier.name }}</TableCell>
                  <TableCell>{{ tier.status }}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>
    </main>

    <!-- Add Actress Dialog -->
    <Dialog :open="isAddDialogOpen" @update:open="isAddDialogOpen = $event">
      <DialogContent class="sm:max-w-[425px] bg-zinc-800 border-zinc-700">
        <DialogHeader>
          <DialogTitle class="text-white">新增演员</DialogTitle>
          <DialogDescription>填写新演员的信息。</DialogDescription>
        </DialogHeader>
        <div class="grid gap-4 py-4">
          <div class="grid grid-cols-4 items-center gap-4">
            <Label for="name" class="text-right text-zinc-300">姓名</Label>
            <div class="col-span-3 flex items-center gap-2">
              <Input 
                id="name" 
                v-model="newActress.name" 
                @blur="checkName"
                :class="cn('bg-zinc-700 border-zinc-600 text-white w-full', isNameDuplicate && 'border-red-500')" />
              <div v-if="isNameDuplicate" class="flex items-center text-red-500 flex-shrink-0">
                <CircleX class="h-4 w-4 mr-1" />
                <span class="whitespace-nowrap">已存在</span>
              </div>
            </div>
          </div>
          <div class="grid grid-cols-4 items-center gap-4">
            <Label for="video_count" class="text-right text-zinc-300">影片数量</Label>
            <Input id="video_count" v-model.number="newActress.video_count" type="number" class="col-span-3 bg-zinc-700 border-zinc-600 text-white" />
          </div>
          <div class="grid grid-cols-4 items-center gap-4">
            <Label class="text-right text-zinc-300">状态</Label>
            <div class="col-span-3 flex">
              <Button
                :variant="selectedStatus === '现役' ? 'secondary' : 'ghost'"
                @click="selectedStatus = '现役'"
                class="rounded-r-none border border-zinc-600"
              >
                现役
              </Button>
              <Button
                :variant="selectedStatus === '引退' ? 'secondary' : 'ghost'"
                @click="selectedStatus = '引退'"
                class="rounded-l-none border border-zinc-600"
              >
                引退
              </Button>
            </div>
          </div>
          <div class="grid grid-cols-4 items-start gap-4">
            <Label class="text-right text-zinc-300 pt-2">分类</Label>
            <div class="col-span-3 flex flex-wrap gap-2">
              <Button
                v-for="tier in tiers"
                :key="tier.id"
                variant="outline"
                :disabled="tier.status !== selectedStatus"
                @click="selectTier(tier.id, 'new')"
                class="transition-all"
                :class="{
                  'bg-sky-400/90 border-sky-400 text-white hover:bg-sky-400': newActress.tier_id === tier.id,
                  'opacity-50 cursor-not-allowed': tier.status !== selectedStatus
                }"
              >
                {{ tier.name }}
              </Button>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button type="submit" @click="addActress" :disabled="isNameDuplicate">保存</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <!-- Edit Actress Dialog -->
    <Dialog :open="isEditDialogOpen" @update:open="isEditDialogOpen = $event">
      <DialogContent class="sm:max-w-[425px] bg-zinc-800 border-zinc-700">
        <DialogHeader>
          <DialogTitle class="text-white">编辑演员</DialogTitle>
          <DialogDescription>修改演员的信息。</DialogDescription>
        </DialogHeader>
        <div class="grid gap-4 py-4">
          <div class="grid grid-cols-4 items-center gap-4">
            <Label for="edit-name" class="text-right text-zinc-300">姓名</Label>
            <Input id="edit-name" v-model="currentActress.name" class="col-span-3 bg-zinc-700 border-zinc-600 text-white" />
          </div>
          <div class="grid grid-cols-4 items-center gap-4">
            <Label for="edit-video_count" class="text-right text-zinc-300">影片数量</Label>
            <Input id="edit-video_count" v-model.number="currentActress.video_count" type="number" class="col-span-3 bg-zinc-700 border-zinc-600 text-white" />
          </div>
          <div class="grid grid-cols-4 items-center gap-4">
            <Label class="text-right text-zinc-300">状态</Label>
            <div class="col-span-3 flex">
              <Button
                :variant="selectedStatus === '现役' ? 'secondary' : 'ghost'"
                @click="selectedStatus = '现役'"
                class="rounded-r-none border border-zinc-600"
              >
                现役
              </Button>
              <Button
                :variant="selectedStatus === '引退' ? 'secondary' : 'ghost'"
                @click="selectedStatus = '引退'"
                class="rounded-l-none border border-zinc-600"
              >
                引退
              </Button>
            </div>
          </div>
          <div class="grid grid-cols-4 items-start gap-4">
            <Label class="text-right text-zinc-300 pt-2">分类</Label>
            <div class="col-span-3 flex flex-wrap gap-2">
              <Button
                v-for="tier in tiers"
                :key="tier.id"
                variant="outline"
                :disabled="tier.status !== selectedStatus"
                @click="selectTier(tier.id, 'edit')"
                class="transition-all"
                :class="{
                  'bg-sky-400/90 border-sky-400 text-white hover:bg-sky-400': currentActress.tier_id === tier.id,
                  'opacity-50 cursor-not-allowed': tier.status !== selectedStatus
                }"
              >
                {{ tier.name }}
              </Button>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button type="submit" @click="updateActress">保存</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
</template>
