<script setup>
import { ref, onMounted, computed } from 'vue';
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

import { Slider } from '@/components/ui/slider';

const actresses = ref([]);
const tiers = ref([]);
const isAddDialogOpen = ref(false);
const isEditDialogOpen = ref(false);
const isEditTierDialogOpen = ref(false);
const isNameDuplicate = ref(false);

const newActress = ref({ name: '', video_count: 0, tier_id: null });
const currentActress = ref({ id: null, name: '', video_count: 0, tier_id: null });
const currentTier = ref({ id: null, name: '', recommended_count: 10 });

const sliderValue = computed({
  get: () => [currentTier.value.recommended_count],
  set: (val) => { currentTier.value.recommended_count = val[0] },
});

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

const openEditTierDialog = (tier) => {
  currentTier.value = { ...tier };
  isEditTierDialogOpen.value = true;
};

const updateTier = async () => {
  if (!currentTier.value.id) return;
  try {
    const response = await fetch(`http://127.0.0.1:8000/api/tiers/${currentTier.value.id}`,
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        recommended_count: currentTier.value.recommended_count,
      }),
    });
    if (response.ok) {
      await fetchTiers();
      isEditTierDialogOpen.value = false;
    } else {
      console.error('Failed to update tier');
    }
  } catch (error) {
    console.error('An error occurred while updating the tier:', error);
  }
};

const selectTier = (tierId, context) => {
  if (context === 'new') {
    newActress.value.tier_id = newActress.value.tier_id === tierId ? null : tierId;
  } else {
    currentActress.value.tier_id = currentActress.value.tier_id === tierId ? null : tierId;
  }
};

const getTierClass = (tierName) => {
  if (!tierName) return '';
  const name = tierName.toLowerCase();
  if (name === 'premium') return 'tier-premium';
  if (name === 'classic') return 'tier-classic';
  if (name === 'fame') return 'tier-fame';
  return '';
};

const getVideoCountClass = (actress) => {
  if (!actress.tier_name) {
    return 'video-count-badge';
  }
  const C = actress.video_count;
  const R = actress.tier_recommended_count;
  if (C <= R) {
    return 'video-count-badge video-count-safe';
  }
  if (R < C && C <= R * 1.1) {
    return 'video-count-badge video-count-warn';
  }
  if (C > R * 1.1) {
    return 'video-count-badge video-count-danger';
  }
  return 'video-count-badge';
};

</script>

<template>
  <div class="min-h-screen bg-gray-100 text-gray-800">
    <header class="p-4 border-b border-zinc-700 flex justify-between items-center">
      <div class="flex items-center gap-4">
        <h1 class="text-xl font-bold">JATLAS</h1>
        <nav class="flex items-center gap-2">
          <Button variant="ghost" class="text-zinc-300">Actress Dashboard</Button>
          <Button variant="ghost" class="text-zinc-300">Tier Dictionary</Button>
        </nav>
      </div>
      <Button @click="isAddDialogOpen = true">+ Add Actress</Button>
    </header>

    <main class="p-4">
      <h2 class="text-lg font-semibold text-gray-600 mb-4">Digital Asset Risk Control Terminal</h2>
      <Tabs default-value="actresses" class="w-full">
        <TabsContent value="actresses">
          <div class="rounded-lg border border-gray-200 mt-4 bg-white">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead class="w-[100px] text-gray-700">ID</TableHead>
                  <TableHead class="text-gray-700">Name</TableHead>
                  <TableHead class="text-gray-700">Current Tier</TableHead>
                  <TableHead class="text-gray-700">Video Count</TableHead>
                  <TableHead class="text-right text-gray-700">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow v-for="actress in actresses" :key="actress.id">
                  <TableCell class="font-medium">{{ actress.id }}</TableCell>
                  <TableCell>{{ actress.name }}</TableCell>
                  <TableCell>
                    <span 
                      v-if="actress.tier_name"
                      :class="['tier-badge', getTierClass(actress.tier_name)]"
                    >
                      {{ actress.tier_name }}
                    </span>
                    <span v-else class="text-zinc-500">N/A</span>
                  </TableCell>
                  <TableCell>
                    <span :class="getVideoCountClass(actress)">
                      {{ actress.video_count }}
                    </span>
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

        <!-- Tiers Panel (currently hidden, can be re-enabled with Tabs) -->
        <TabsContent value="tiers">
          <div class="rounded-lg border border-gray-200 mt-4 bg-white">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead class="text-gray-700">ID</TableHead>
                  <TableHead class="text-gray-700">Tier Name</TableHead>
                  <TableHead class="text-gray-700">Status</TableHead>
                  <TableHead class="text-gray-700">Recommended Count</TableHead>
                  <TableHead class="text-right text-gray-700">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow v-for="tier in tiers" :key="tier.id">
                  <TableCell>{{ tier.id }}</TableCell>
                  <TableCell>{{ tier.name }}</TableCell>
                  <TableCell>{{ tier.status }}</TableCell>
                  <TableCell>{{ tier.recommended_count }}</TableCell>
                  <TableCell class="text-right">
                    <Button variant="ghost" size="icon" @click="openEditTierDialog(tier)">
                      <FilePen class="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>
    </main>

    <!-- Add Actress Dialog -->
    <Dialog :open="isAddDialogOpen" @update:open="isAddDialogOpen = $event">
      <DialogContent class="sm:max-w-[425px] bg-white border-gray-200">
        <DialogHeader>
          <DialogTitle class="text-gray-900">新增演员</DialogTitle>
          <DialogDescription>填写新演员的信息。</DialogDescription>
        </DialogHeader>
        <div class="grid gap-4 py-4">
          <div class="grid grid-cols-4 items-center gap-4">
            <Label for="name" class="text-right text-gray-600">姓名</Label>
            <div class="col-span-3 flex items-center gap-2">
              <Input 
                id="name" 
                v-model="newActress.name" 
                @blur="checkName"
                :class="cn('bg-white border-gray-300 text-gray-900 w-full', isNameDuplicate && 'border-red-500')" />
              <div v-if="isNameDuplicate" class="flex items-center text-red-500 flex-shrink-0">
                <CircleX class="h-4 w-4 mr-1" />
                <span class="whitespace-nowrap">已存在</span>
              </div>
            </div>
          </div>
          <div class="grid grid-cols-4 items-center gap-4">
            <Label for="video_count" class="text-right text-gray-600">影片数量</Label>
            <Input id="video_count" v-model.number="newActress.video_count" type="number" class="col-span-3 bg-white border-gray-300 text-gray-900" />
          </div>
          <div class="grid grid-cols-4 items-center gap-4">
            <Label class="text-right text-gray-600">状态</Label>
            <div class="col-span-3 flex">
              <Button
                :variant="selectedStatus === '现役' ? 'secondary' : 'ghost'"
                @click="selectedStatus = '现役'"
                class="rounded-r-none border border-gray-300"
              >
                现役
              </Button>
              <Button
                :variant="selectedStatus === '引退' ? 'secondary' : 'ghost'"
                @click="selectedStatus = '引退'"
                class="rounded-l-none border border-gray-300"
              >
                引退
              </Button>
            </div>
          </div>
          <div class="grid grid-cols-4 items-start gap-4">
            <Label class="text-right text-gray-600 pt-2">分类</Label>
            <div class="col-span-3 flex flex-wrap gap-2">
              <Button
                v-for="tier in tiers"
                :key="tier.id"
                variant="outline"
                :disabled="tier.status !== selectedStatus"
                @click="selectTier(tier.id, 'new')"
                class="transition-all"
                :class="{
                  'bg-sky-500/90 border-sky-500 text-white hover:bg-sky-500': newActress.tier_id === tier.id,
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
      <DialogContent class="sm:max-w-[425px] bg-white border-gray-200">
        <DialogHeader>
          <DialogTitle class="text-gray-900">编辑演员</DialogTitle>
          <DialogDescription>修改演员的信息。</DialogDescription>
        </DialogHeader>
        <div class="grid gap-4 py-4">
          <div class="grid grid-cols-4 items-center gap-4">
            <Label for="edit-name" class="text-right text-gray-600">姓名</Label>
            <Input id="edit-name" v-model="currentActress.name" class="col-span-3 bg-white border-gray-300 text-gray-900" />
          </div>
          <div class="grid grid-cols-4 items-center gap-4">
            <Label for="edit-video_count" class="text-right text-gray-600">影片数量</Label>
            <Input id="edit-video_count" v-model.number="currentActress.video_count" type="number" class="col-span-3 bg-white border-gray-300 text-gray-900" />
          </div>
          <div class="grid grid-cols-4 items-center gap-4">
            <Label class="text-right text-gray-600">状态</Label>
            <div class="col-span-3 flex">
              <Button
                :variant="selectedStatus === '现役' ? 'secondary' : 'ghost'"
                @click="selectedStatus = '现役'"
                class="rounded-r-none border border-gray-300"
              >
                现役
              </Button>
              <Button
                :variant="selectedStatus === '引退' ? 'secondary' : 'ghost'"
                @click="selectedStatus = '引退'"
                class="rounded-l-none border border-gray-300"
              >
                引退
              </Button>
            </div>
          </div>
          <div class="grid grid-cols-4 items-start gap-4">
            <Label class="text-right text-gray-600 pt-2">分类</Label>
            <div class="col-span-3 flex flex-wrap gap-2">
              <Button
                v-for="tier in tiers"
                :key="tier.id"
                variant="outline"
                :disabled="tier.status !== selectedStatus"
                @click="selectTier(tier.id, 'edit')"
                class="transition-all"
                :class="{
                  'bg-sky-500/90 border-sky-500 text-white hover:bg-sky-500': currentActress.tier_id === tier.id,
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

    <!-- Edit Tier Dialog -->
    <Dialog :open="isEditTierDialogOpen" @update:open="isEditTierDialogOpen = $event">
      <DialogContent class="sm:max-w-[425px] bg-white border-gray-200">
        <DialogHeader>
          <DialogTitle class="text-gray-900">编辑分类</DialogTitle>
          <DialogDescription>修改 {{ currentTier.name }} 的建议保存数量。</DialogDescription>
        </DialogHeader>
        <div class="grid gap-4 py-4">
          <div class="grid grid-cols-4 items-center gap-4">
            <Label for="recommended_count" class="text-right text-gray-600">建议数量</Label>
            <Slider
              v-model="sliderValue"
              :max="200"
              :min="0"
              :step="1"
              class="col-span-2"
            />
            <span class="col-span-1 text-gray-800">{{ currentTier.recommended_count }} 部</span>
          </div>
        </div>
        <DialogFooter>
          <Button type="submit" @click="updateTier">保存</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
</template>

<style scoped>
/* General Style */
.bg-gray-100 {
  background-color: #f3f4f6;
}
.text-gray-800 {
  color: #1f2937;
}

/* Header */
header {
  background-color: #ffffff;
  border-bottom: 1px solid #e5e7eb;
}

header .text-zinc-300 {
  color: #374151;
}

/* Table styling */
.table-container {
  border: 1px solid #e5e7eb;
  border-radius: 0.5rem;
  overflow: hidden;
  background-color: #ffffff;
}

:deep(table) {
  width: 100%;
  border-collapse: collapse;
}

:deep(thead) {
  background-color: #f9fafb;
}

:deep(th) {
  padding: 0.75rem 1rem;
  text-align: left;
  font-weight: 600;
  color: #4b5563;
  border-bottom: 1px solid #e5e7eb;
}

:deep(tbody tr) {
  border-bottom: 1px solid #e5e7eb;
}

:deep(tbody tr:last-child) {
  border-bottom: none;
}

:deep(td) {
  padding: 0.75rem 1rem;
  color: #374151;
}

/* Tier Badge Styling */
.tier-badge {
  display: inline-block;
  padding: 0.25rem 0.75rem;
  border-radius: 9999px;
  font-weight: 500;
  font-size: 0.875rem;
  border: 1px solid;
  background-color: transparent;
}

.tier-premium {
  color: #ca8a04;
  border-color: #ca8a04;
}

.tier-classic {
  color: #52525b;
  border-color: #52525b;
}

.tier-fame {
  color: #dc2626;
  border-color: #dc2626;
}

/* Video Count Badge Styling */
.video-count-badge {
  display: inline-block;
  padding: 0.25rem 0.75rem;
  border-radius: 0.375rem;
  font-weight: 600;
  min-width: 40px;
  text-align: center;
  border: 1px solid;
  background-color: transparent;
}

.video-count-safe {
  color: #16a34a;
  border-color: #16a34a;
}

.video-count-warn {
  color: #f59e0b;
  border-color: #f59e0b;
}

.video-count-danger {
  color: #dc2626;
  border-color: #dc2626;
}

/* Button styling */
header .lucide-plus {
  margin-right: 0.5rem;
}
</style>
