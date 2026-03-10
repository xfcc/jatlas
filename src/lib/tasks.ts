export const tasks = new Map<string, { 
    progress: number; 
    total: number; 
    status: string;
    lastProcessedItem?: { 
        name: string; 
        result: 'success' | 'skipped' | 'error'; 
        detail: string; 
    };
}>();
