<script setup>
import { h, onMounted, ref } from 'vue'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

const actresses = ref([])

onMounted(async () => {
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
});
</script>

<template>
  <div class="min-h-screen bg-zinc-900 text-white">
    <header class="p-4 border-b border-zinc-700">
      <h1 class="text-xl font-bold">JATLAS - 影视收集看板</h1>
    </header>
    <main class="p-4">
      <div class="rounded-lg border border-zinc-700">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead class="w-[100px] text-white">
                ID
              </TableHead>
              <TableHead class="text-white">
                姓名
              </TableHead>
              <TableHead class="text-right text-white">
                影片数量
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow v-for="actress in actresses" :key="actress.id">
              <TableCell class="font-medium">
                {{ actress.id }}
              </TableCell>
              <TableCell>{{ actress.name }}</TableCell>
              <TableCell class="text-right">
                {{ actress.video_count }}
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    </main>
  </div>
</template>