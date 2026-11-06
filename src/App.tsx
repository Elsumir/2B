import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from './context/AuthContext';
import { LoginView } from './components/LoginView';
import { Navbar } from './components/Navbar';
import { ObjectsList } from './components/ObjectsList';
import { ObjectDetail } from './components/ObjectDetail';
import { MyTasksView } from './components/MyTasksView';
import { TaskDetailModal } from './components/TaskDetailModal';
import { CreateObjectModal } from './components/CreateObjectModal';
import { CreateTaskModal } from './components/CreateTaskModal';
import { ConstructionObject, Task } from './types/crm';
import { supabase } from './lib/supabase';

const getInitialTab = (): 'objects' | 'tasks' => {
  const hash = window.location.hash.replace('#', '');
  if (hash === 'tasks' || hash === 'objects') return hash;
  const saved = localStorage.getItem('crm_active_tab');
  if (saved === 'tasks' || saved === 'objects') return saved;
  return 'objects';
};

const getInitialObjectId = (): string | null => {
  const saved = localStorage.getItem('crm_selected_object_id');
  return saved || null;
};

export const App: React.FC = () => {
  const { user, profile, loading: authLoading, isManager } = useAuth();

  const [currentTab, setCurrentTab] = useState<'objects' | 'tasks'>(getInitialTab);
  const [selectedObjectId, setSelectedObjectId] = useState<string | null>(getInitialObjectId);

  // Sync tab changes to URL hash and localStorage
  const handleTabChange = useCallback((tab: 'objects' | 'tasks') => {
    setCurrentTab(tab);
    setSelectedObjectId(null);
    window.location.hash = tab;
    localStorage.setItem('crm_active_tab', tab);
    localStorage.removeItem('crm_selected_object_id');
  }, []);

  const handleSelectObject = useCallback((id: string | null) => {
    setSelectedObjectId(id);
    if (id) {
      localStorage.setItem('crm_selected_object_id', id);
    } else {
      localStorage.removeItem('crm_selected_object_id');
    }
  }, []);

  // Listen to browser forward/back hash changes
  useEffect(() => {
    const onHashChange = () => {
      const hash = window.location.hash.replace('#', '');
      if (hash === 'tasks' || hash === 'objects') {
        setCurrentTab(hash);
        if (hash === 'tasks') {
          setSelectedObjectId(null);
          localStorage.removeItem('crm_selected_object_id');
        }
      }
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  const [objects, setObjects] = useState<ConstructionObject[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loadingData, setLoadingData] = useState(false);

  // Modals state
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isTaskDetailOpen, setIsTaskDetailOpen] = useState(false);

  const [isCreateObjectOpen, setIsCreateObjectOpen] = useState(false);
  const [objectToEdit, setObjectToEdit] = useState<ConstructionObject | null>(null);

  const [isCreateTaskOpen, setIsCreateTaskOpen] = useState(false);
  const [taskToEdit, setTaskToEdit] = useState<Task | null>(null);
  const [taskDefaultObjectId, setTaskDefaultObjectId] = useState<string | undefined>(undefined);

  // OPTIMIZED: fetchData depends ONLY on user?.id, eliminating the 8-12 re-renders cascade!
  const fetchData = useCallback(async () => {
    if (!user) return;
    setLoadingData(true);
    try {
      // 1. Fetch objects accessible to current user
      const { data: objectsData, error: objectsErr } = await supabase
        .from('objects')
        .select('*')
        .order('created_at', { ascending: false });

      if (objectsErr) {
        console.error('Error fetching objects:', objectsErr);
      }

      // 2. Fetch tasks accessible to current user with profiles relationships
      const { data: tasksData, error: tasksErr } = await supabase
        .from('tasks')
        .select(`
          *,
          object:objects(*),
          executor:profiles!tasks_executor_id_fkey(id, email, full_name, role),
          author:profiles!tasks_author_id_fkey(id, email, full_name, role)
        `)
        .order('created_at', { ascending: false });

      if (tasksErr) {
        console.error('Error fetching tasks:', tasksErr);
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const rawTasks = (tasksData as any[]) || [];

      // Calculate task counts per object
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const processedObjects = ((objectsData as any[]) || []).map((obj) => {
        const count = rawTasks.filter((t) => t.object_id === obj.id).length;
        return {
          ...obj,
          tasks_count: count,
        };
      });

      setObjects(processedObjects);
      setTasks(rawTasks);

      // Functional update to avoid putting selectedTask into dependencies
      setSelectedTask((prev) => {
        if (!prev) return null;
        return rawTasks.find((t) => t.id === prev.id) || prev;
      });
    } catch (err) {
      console.error('Exception fetching data:', err);
    } finally {
      setLoadingData(false);
    }
  }, [user?.id]);

  useEffect(() => {
    if (user?.id && profile) {
      fetchData();
    }
  }, [user?.id, profile?.role, fetchData]);

  // Object handlers
  const handleSaveObject = useCallback(async (data: { name: string; address: string }) => {
    if (objectToEdit) {
      const { error } = await supabase
        .from('objects')
        .update({ name: data.name, address: data.address, updated_at: new Date().toISOString() })
        .eq('id', objectToEdit.id);
      if (error) throw error;
    } else {
      const { error } = await supabase
        .from('objects')
        .insert({
          name: data.name,
          address: data.address,
          created_by: user?.id,
        });
      if (error) throw error;
    }
    await fetchData();
  }, [objectToEdit, user?.id, fetchData]);

  const handleDeleteObject = useCallback(async (obj: ConstructionObject) => {
    if (!window.confirm(`Вы уверены, что хотите удалить объект «${obj.name}» и все его задачи?`)) {
      return;
    }
    const { error } = await supabase.from('objects').delete().eq('id', obj.id);
    if (error) {
      alert(`Ошибка удаления: ${error.message}`);
    } else {
      setSelectedObjectId((prev) => (prev === obj.id ? null : prev));
      await fetchData();
    }
  }, [fetchData]);

  // Task handlers
  const handleSaveTask = useCallback(async (data: {
    title: string;
    description: string;
    object_id: string;
    executor_id: string | null;
  }) => {
    if (taskToEdit) {
      const { error } = await supabase
        .from('tasks')
        .update({
          title: data.title,
          description: data.description,
          object_id: data.object_id,
          executor_id: data.executor_id,
          updated_at: new Date().toISOString(),
        })
        .eq('id', taskToEdit.id);
      if (error) throw error;
    } else {
      const { error } = await supabase.from('tasks').insert({
        title: data.title,
        description: data.description,
        object_id: data.object_id,
        executor_id: data.executor_id,
        status: 'new',
        author_id: user?.id,
      });
      if (error) throw error;
    }
    await fetchData();
  }, [taskToEdit, user?.id, fetchData]);

  const handleDeleteTask = useCallback(async (task: Task) => {
    if (!window.confirm(`Удалить задачу «${task.title}»?`)) return;
    const { error } = await supabase.from('tasks').delete().eq('id', task.id);
    if (error) {
      alert(`Ошибка удаления задачи: ${error.message}`);
    } else {
      setIsTaskDetailOpen(false);
      await fetchData();
    }
  }, [fetchData]);

  // Stable callbacks for modal and selection actions to prevent re-renders of list views
  const handleSelectTask = useCallback((task: Task) => {
    setSelectedTask(task);
    setIsTaskDetailOpen(true);
  }, []);

  const handleCloseTaskDetail = useCallback(() => {
    setIsTaskDetailOpen(false);
    setSelectedTask(null);
  }, []);

  const handleOpenCreateObject = useCallback(() => {
    setObjectToEdit(null);
    setIsCreateObjectOpen(true);
  }, []);

  const handleEditObject = useCallback((obj: ConstructionObject) => {
    setObjectToEdit(obj);
    setIsCreateObjectOpen(true);
  }, []);

  const handleCloseCreateObject = useCallback(() => {
    setIsCreateObjectOpen(false);
    setObjectToEdit(null);
  }, []);

  const handleOpenCreateTask = useCallback((objId?: string) => {
    setTaskToEdit(null);
    setTaskDefaultObjectId(objId);
    setIsCreateTaskOpen(true);
  }, []);

  const handleEditTask = useCallback((task: Task) => {
    setIsTaskDetailOpen(false);
    setTaskToEdit(task);
    setIsCreateTaskOpen(true);
  }, []);

  const handleCloseCreateTask = useCallback(() => {
    setIsCreateTaskOpen(false);
    setTaskToEdit(null);
    setTaskDefaultObjectId(undefined);
  }, []);

  const handleBackFromObject = useCallback(() => {
    handleSelectObject(null);
  }, [handleSelectObject]);

  // Memoize selected object tasks
  const selectedObject = useMemo(
    () => objects.find((o) => o.id === selectedObjectId),
    [objects, selectedObjectId]
  );

  const selectedObjectTasks = useMemo(
    () => tasks.filter((t) => t.object_id === selectedObjectId),
    [tasks, selectedObjectId]
  );

  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <div className="w-8 h-8 border-2 border-slate-400 border-t-white rounded-full animate-spin" />
          <span className="text-xs text-slate-400 font-mono">Загрузка CRM...</span>
        </div>
      </div>
    );
  }

  if (!user || !profile) {
    return <LoginView />;
  }

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans">
      {/* Top Navigation */}
      <Navbar
        currentTab={currentTab}
        onTabChange={handleTabChange}
        onSelectObject={handleSelectObject}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {currentTab === 'objects' ? (
          selectedObjectId && selectedObject ? (
            <ObjectDetail
              object={selectedObject}
              tasks={selectedObjectTasks}
              loading={loadingData}
              onBack={handleBackFromObject}
              onSelectTask={handleSelectTask}
              onCreateTask={handleOpenCreateTask}
            />
          ) : (
            <ObjectsList
              objects={objects}
              loading={loadingData}
              onSelectObject={handleSelectObject}
              onCreateObject={handleOpenCreateObject}
              onEditObject={handleEditObject}
              onDeleteObject={handleDeleteObject}
            />
          )
        ) : (
          <MyTasksView
            tasks={tasks}
            objects={objects}
            loading={loadingData}
            onSelectTask={handleSelectTask}
            onCreateTask={isManager ? handleOpenCreateTask : undefined}
          />
        )}
      </main>

      {/* Modals rendered directly to document.body via Portals */}
      <TaskDetailModal
        task={selectedTask}
        isOpen={isTaskDetailOpen}
        onClose={handleCloseTaskDetail}
        onTaskUpdated={fetchData}
        onEditTask={handleEditTask}
        onDeleteTask={handleDeleteTask}
      />

      <CreateObjectModal
        isOpen={isCreateObjectOpen}
        objectToEdit={objectToEdit}
        onClose={handleCloseCreateObject}
        onSubmit={handleSaveObject}
      />

      <CreateTaskModal
        isOpen={isCreateTaskOpen}
        taskToEdit={taskToEdit}
        defaultObjectId={taskDefaultObjectId}
        objects={objects}
        onClose={handleCloseCreateTask}
        onSubmit={handleSaveTask}
      />
    </div>
  );
};
