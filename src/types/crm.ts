export type UserRole = 'manager' | 'executor';

export type TaskStatus = 'new' | 'in_progress' | 'under_review' | 'completed' | 'revision';

export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  created_at: string;
}

export interface ConstructionObject {
  id: string;
  name: string;
  address: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
  tasks_count?: number;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  object_id: string;
  executor_id: string | null;
  status: TaskStatus;
  author_id: string;
  created_at: string;
  updated_at: string;
  object?: ConstructionObject;
  executor?: UserProfile;
  author?: UserProfile;
}

export interface TaskHistoryItem {
  id: string;
  task_id: string;
  user_id: string;
  from_status: TaskStatus | null;
  to_status: TaskStatus;
  comment: string | null;
  created_at: string;
  user?: UserProfile;
}

export const STATUS_LABELS: Record<TaskStatus, string> = {
  new: 'Новая',
  in_progress: 'В работе',
  under_review: 'На проверке',
  revision: 'На доработке',
  completed: 'Принята',
};

// Strict, restrained business color palette
export const STATUS_COLORS: Record<TaskStatus, { bg: string; text: string; border: string; dot: string }> = {
  new: {
    bg: 'bg-slate-100',
    text: 'text-slate-700',
    border: 'border-slate-300',
    dot: 'bg-slate-500',
  },
  in_progress: {
    bg: 'bg-slate-900',
    text: 'text-slate-100',
    border: 'border-slate-900',
    dot: 'bg-sky-400',
  },
  under_review: {
    bg: 'bg-amber-50',
    text: 'text-amber-900',
    border: 'border-amber-300',
    dot: 'bg-amber-600',
  },
  revision: {
    bg: 'bg-rose-50',
    text: 'text-rose-900',
    border: 'border-rose-300',
    dot: 'bg-rose-600',
  },
  completed: {
    bg: 'bg-emerald-50',
    text: 'text-emerald-900',
    border: 'border-emerald-300',
    dot: 'bg-emerald-600',
  },
};
