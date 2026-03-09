'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { listDatabaseBackups, backupDatabase, restoreDatabase } from '@/app/actions';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';

interface BackupFile {
  name: string;
  createdAt: string;
}

export default function SettingsPage() {
  const [backups, setBackups] = useState<BackupFile[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchBackups();
  }, []);

  const fetchBackups = async () => {
    setIsLoading(true);
    const result = await listDatabaseBackups();
    if (result.success && result.data) {
      setBackups(result.data);
    }
    setIsLoading(false);
  };

  const handleBackup = async () => {
    setIsLoading(true);
    const result = await backupDatabase();
    if (result.success) {
      toast({ title: '成功', description: result.message });
      fetchBackups();
    } else {
      toast({ title: '错误', description: result.message, variant: 'destructive' });
    }
    setIsLoading(false);
  };

  const handleRestore = async (fileName: string) => {
    setIsLoading(true);
    const result = await restoreDatabase(fileName);
    if (result.success) {
      toast({ title: '成功', description: result.message });
    } else {
      toast({ title: '错误', description: result.message, variant: 'destructive' });
    }
    setIsLoading(false);
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">数据库备份与恢复</h3>
        <p className="text-sm text-muted-foreground">
          管理数据库备份，您可以创建新的备份或从现有备份中恢复。
        </p>
      </div>
      <div className="flex items-center gap-4">
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button disabled={isLoading}>{isLoading ? '正在创建...' : '创建新备份'}</Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>确认创建备份？</AlertDialogTitle>
              <AlertDialogDescription>
                将立即创建一个当前数据库的快照。
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>取消</AlertDialogCancel>
              <AlertDialogAction onClick={handleBackup}>创建</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
      <div className="border rounded-md">
        <div className="p-4 border-b">
          <h4 className="font-medium">可用备份</h4>
        </div>
        <ul className="divide-y">
          {backups.map((backup) => (
            <li key={backup.name} className="p-4 flex items-center justify-between">
              <div>
                <p className="font-mono">{backup.name}</p>
                <p className="text-sm text-muted-foreground">
                  {new Date(backup.createdAt).toLocaleString()}
                </p>
              </div>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" disabled={isLoading}>恢复</Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>确认恢复数据库？</AlertDialogTitle>
                    <AlertDialogDescription>
                      此操作将使用此备份覆盖当前数据库。为安全起见，在恢复前会自动创建一个新的备份。确定要继续吗？
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>取消</AlertDialogCancel>
                    <AlertDialogAction onClick={() => handleRestore(backup.name)}>恢复</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </li>
          ))}
        </ul>
        {backups.length === 0 && (
          <div className="p-4 text-center text-sm text-muted-foreground">
            没有找到备份。
          </div>
        )}
      </div>
    </div>
  );
}
