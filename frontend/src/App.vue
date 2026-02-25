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
import { CircleX, FilePen, Trash2 } from 'lucide-vue-next';

const actresses = ref([]);
const isAddDialogOpen = ref(false);
const isEditDialogOpen = ref(false);
const isNameDuplicate = ref(false);

const newActress = ref({ name: '', video_count: 0 });
const currentActress = ref({ id: null, name: '', video_count: 0 });

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

onMounted(fetchActresses);

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
      newActress.value = { name: '', video_count: 0 };
      isNameDuplicate.value = false; 
    } else {
      console.error('Failed to add actress');
    }
  } catch (error) {
    console.error('An error occurred while adding the actress:', error);
  }
};

const openEditDialog = (actress) => {
  currentActress.value = { ...actress };
  isEditDialogOpen.value = true;
};

const updateActress = async () => {
  if (!currentActress.value.id) return;
  try {
    const response = await fetch(`http://127.0.0.1:8000/api/actresses/${currentActress.value.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: currentActress.value.name,
        video_count: currentActress.value.video_count,
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

</script>

<template>
  <div class="min-h-screen bg-zinc-900 text-white">
    <header class="p-4 border-b border-zinc-700 flex justify-between items-center">
      <h1 class="text-xl font-bold">JATLAS - 影视收集看板</h1>
      <Button @click="isAddDialogOpen = true">新增演员</Button>
    </header>
    <main class="p-4">
      <div class="rounded-lg border border-zinc-700">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead class="w-[100px] text-white">ID</TableHead>
              <TableHead class="text-white">姓名</TableHead>
              <TableHead class="text-white">影片数量</TableHead>
              <TableHead class="text-right text-white">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow v-for="actress in actresses" :key="actress.id">
              <TableCell class="font-medium">{{ actress.id }}</TableCell>
              <TableCell>{{ actress.name }}</TableCell>
              <TableCell>{{ actress.video_count }}</TableCell>
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
    </main>

    <!-- Add Actress Dialog -->
    <Dialog :open="isAddDialogOpen" @update:open="isAddDialogOpen = $event">
      <DialogContent class="sm:max-w-[425px] bg-zinc-800 border-zinc-700">
        <DialogHeader>
          <DialogTitle class="text-white">新增演员</DialogTitle>
          <DialogDescription>填写新演员的姓名和影片数量。</DialogDescription>
        </DialogHeader>
        <div class="grid gap-4 py-4">
          <div class="grid grid-cols-4 items-center gap-4">
            <Label for="name" class="text-right text-zinc-300">姓名</Label>
            <div class="col-span-3 flex items-center gap-2">
              <Input 
                id="name" 
                v-model="newActress.name" 
                @blur="checkName"
                :class="cn(
                  'bg-zinc-700 border-zinc-600 text-white w-full',
                  isNameDuplicate && 'border-red-500'
                )" />
              <div v-if="isNameDuplicate" class="flex items-center text-red-500 flex-shrink-0">
                <CircleX class="h-4 w-4 mr-1" />
                <span class="whitespace-nowrap">已收录</span>
              </div>
            </div>
          </div>
          <div class="grid grid-cols-4 items-center gap-4">
            <Label for="video_count" class="text-right text-zinc-300">影片数量</Label>
            <Input id="video_count" v-model.number="newActress.video_count" type="number" class="col-span-3 bg-zinc-700 border-zinc-600 text-white" />
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
          <DialogDescription>修改演员的姓名或影片数量。</DialogDescription>
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
        </div>
        <DialogFooter>
          <Button type="submit" @click="updateActress">保存</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
</template>