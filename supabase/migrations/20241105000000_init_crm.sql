-- ====================================================================
-- MINI-CRM «ОБЪЕКТЫ И ЗАДАЧИ»
-- MIGRATION: 20241105000000_init_crm.sql
-- ====================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- --------------------------------------------------------------------
-- 1. PROFILES TABLE (Пользователи и роли: manager, executor)
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('manager', 'executor')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- --------------------------------------------------------------------
-- Helper functions for RLS & business logic (SECURITY DEFINER)
-- --------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.is_manager()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT role = 'manager' FROM public.profiles WHERE id = auth.uid()),
    false
  );
$$;

CREATE OR REPLACE FUNCTION public.is_executor()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT role = 'executor' FROM public.profiles WHERE id = auth.uid()),
    false
  );
$$;

-- RLS for profiles:
-- All authenticated users can view profiles (to see names and roles)
DROP POLICY IF EXISTS "Profiles viewable by authenticated users" ON public.profiles;
CREATE POLICY "Profiles viewable by authenticated users"
ON public.profiles FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "Managers can update profiles" ON public.profiles;
CREATE POLICY "Managers can update profiles"
ON public.profiles FOR UPDATE
TO authenticated
USING (public.is_manager());

DROP POLICY IF EXISTS "Managers can insert profiles" ON public.profiles;
CREATE POLICY "Managers can insert profiles"
ON public.profiles FOR INSERT
TO authenticated
WITH CHECK (public.is_manager());


-- --------------------------------------------------------------------
-- 2. OBJECTS TABLE (Стройки)
-- Поля: название (name), адрес (address)
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.objects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.objects ENABLE ROW LEVEL SECURITY;


-- --------------------------------------------------------------------
-- 3. TASKS TABLE (Задачи)
-- Поля: название, описание, объект, исполнитель, статус, автор, дата создания
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  object_id UUID NOT NULL REFERENCES public.objects(id) ON DELETE CASCADE,
  executor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'in_progress', 'under_review', 'completed', 'revision')),
  author_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;


-- --------------------------------------------------------------------
-- 4. TASK HISTORY TABLE (История статусов)
-- Каждая смена статуса сохраняется: кто, когда, из какого в какой, комментарий
-- Защищена от подделки, изменения или удаления через API.
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.task_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  from_status TEXT CHECK (from_status IS NULL OR from_status IN ('new', 'in_progress', 'under_review', 'completed', 'revision')),
  to_status TEXT NOT NULL CHECK (to_status IN ('new', 'in_progress', 'under_review', 'completed', 'revision')),
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.task_history ENABLE ROW LEVEL SECURITY;


-- --------------------------------------------------------------------
-- 5. RLS POLICIES FOR OBJECTS
-- Постановщик: видит все объекты, создает, редактирует, удаляет.
-- Исполнитель: видит ТОЛЬКО те объекты, в которых у него есть задачи!
-- --------------------------------------------------------------------
DROP POLICY IF EXISTS "Objects select policy" ON public.objects;
CREATE POLICY "Objects select policy"
ON public.objects FOR SELECT
TO authenticated
USING (
  public.is_manager()
  OR (
    public.is_executor()
    AND EXISTS (
      SELECT 1 FROM public.tasks
      WHERE tasks.object_id = objects.id
      AND tasks.executor_id = auth.uid()
    )
  )
);

DROP POLICY IF EXISTS "Objects insert policy" ON public.objects;
CREATE POLICY "Objects insert policy"
ON public.objects FOR INSERT
TO authenticated
WITH CHECK (public.is_manager());

DROP POLICY IF EXISTS "Objects update policy" ON public.objects;
CREATE POLICY "Objects update policy"
ON public.objects FOR UPDATE
TO authenticated
USING (public.is_manager());

DROP POLICY IF EXISTS "Objects delete policy" ON public.objects;
CREATE POLICY "Objects delete policy"
ON public.objects FOR DELETE
TO authenticated
USING (public.is_manager());


-- --------------------------------------------------------------------
-- 6. RLS POLICIES FOR TASKS
-- Постановщик: видит всё, создает, редактирует, удаляет.
-- Исполнитель: видит ТОЛЬКО свои задачи, может менять статус только своих задач.
-- --------------------------------------------------------------------
DROP POLICY IF EXISTS "Tasks select policy" ON public.tasks;
CREATE POLICY "Tasks select policy"
ON public.tasks FOR SELECT
TO authenticated
USING (
  public.is_manager()
  OR (
    public.is_executor()
    AND executor_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Tasks insert policy" ON public.tasks;
CREATE POLICY "Tasks insert policy"
ON public.tasks FOR INSERT
TO authenticated
WITH CHECK (
  public.is_manager()
  AND status = 'new'
  AND author_id = auth.uid()
);

DROP POLICY IF EXISTS "Tasks update policy" ON public.tasks;
CREATE POLICY "Tasks update policy"
ON public.tasks FOR UPDATE
TO authenticated
USING (
  public.is_manager()
  OR (
    public.is_executor()
    AND executor_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Tasks delete policy" ON public.tasks;
CREATE POLICY "Tasks delete policy"
ON public.tasks FOR DELETE
TO authenticated
USING (public.is_manager());


-- --------------------------------------------------------------------
-- 7. RLS POLICIES FOR TASK HISTORY
-- Постановщик: видит всю историю.
-- Исполнитель: видит историю только для своих задач.
-- ВАЖНО: НЕТ ПОЛИТИК ДЛЯ INSERT/UPDATE/DELETE ДЛЯ КЛИЕНТОВ!
-- Это гарантирует невозможность подделать, изменить или удалить историю через API!
-- --------------------------------------------------------------------
DROP POLICY IF EXISTS "Task history select policy" ON public.task_history;
CREATE POLICY "Task history select policy"
ON public.task_history FOR SELECT
TO authenticated
USING (
  public.is_manager()
  OR EXISTS (
    SELECT 1 FROM public.tasks
    WHERE tasks.id = task_history.task_id
    AND tasks.executor_id = auth.uid()
  )
);


-- --------------------------------------------------------------------
-- 8. STATUS TRANSITION INTEGRITY TRIGGER & LOGGING
-- --------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.check_task_update_validity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role TEXT;
  v_user_id UUID;
  v_comment TEXT;
BEGIN
  v_user_id := auth.uid();
  -- If executed without auth context (e.g. initial migrations / seed scripts), allow
  IF v_user_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT role INTO v_role FROM public.profiles WHERE id = v_user_id;

  -- 1. Check executor field modification restrictions
  IF v_role = 'executor' THEN
    IF NEW.title IS DISTINCT FROM OLD.title
       OR NEW.description IS DISTINCT FROM OLD.description
       OR NEW.object_id IS DISTINCT FROM OLD.object_id
       OR NEW.executor_id IS DISTINCT FROM OLD.executor_id
       OR NEW.author_id IS DISTINCT FROM OLD.author_id
       OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
      RAISE EXCEPTION 'Исполнитель не имеет права редактировать параметры задачи';
    END IF;

    IF OLD.executor_id IS DISTINCT FROM v_user_id THEN
      RAISE EXCEPTION 'Вы не назначены исполнителем этой задачи';
    END IF;
  END IF;

  -- 2. Check status transitions state machine
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF OLD.status = 'new' AND NEW.status = 'in_progress' THEN
      IF v_role <> 'executor' OR OLD.executor_id IS DISTINCT FROM v_user_id THEN
        RAISE EXCEPTION 'Перевести задачу "В работу" может только назначенный исполнитель';
      END IF;

    ELSIF OLD.status = 'in_progress' AND NEW.status = 'under_review' THEN
      IF v_role <> 'executor' OR OLD.executor_id IS DISTINCT FROM v_user_id THEN
        RAISE EXCEPTION 'Отправить задачу "На проверку" может только назначенный исполнитель';
      END IF;

    ELSIF OLD.status = 'under_review' AND NEW.status = 'completed' THEN
      IF v_role <> 'manager' THEN
        RAISE EXCEPTION 'Принять задачу может только постановщик';
      END IF;

    ELSIF OLD.status = 'under_review' AND NEW.status = 'revision' THEN
      IF v_role <> 'manager' THEN
        RAISE EXCEPTION 'Отправить задачу "На доработку" может только постановщик';
      END IF;

      -- Check mandatory comment
      v_comment := NULLIF(TRIM(current_setting('app.status_comment', true)), '');
      IF v_comment IS NULL THEN
        RAISE EXCEPTION 'При возврате задачи на доработку комментарий обязателен';
      END IF;

    ELSIF OLD.status = 'revision' AND NEW.status = 'in_progress' THEN
      IF v_role <> 'executor' OR OLD.executor_id IS DISTINCT FROM v_user_id THEN
        RAISE EXCEPTION 'Взять задачу повторно в работу может только назначенный исполнитель';
      END IF;

    ELSE
      RAISE EXCEPTION 'Запрещённый переход статуса: из "%" в "%"', OLD.status, NEW.status;
    END IF;
  END IF;

  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_check_task_update_validity ON public.tasks;
CREATE TRIGGER tr_check_task_update_validity
BEFORE UPDATE ON public.tasks
FOR EACH ROW
EXECUTE FUNCTION public.check_task_update_validity();


-- Trigger to log history automatically
CREATE OR REPLACE FUNCTION public.log_task_history()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_comment TEXT;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    v_user_id := NEW.author_id;
  END IF;

  v_comment := NULLIF(TRIM(current_setting('app.status_comment', true)), '');

  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.task_history (task_id, user_id, from_status, to_status, comment)
    VALUES (NEW.id, v_user_id, NULL, NEW.status, COALESCE(v_comment, 'Задача создана'));
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.status IS DISTINCT FROM OLD.status THEN
      INSERT INTO public.task_history (task_id, user_id, from_status, to_status, comment)
      VALUES (NEW.id, v_user_id, OLD.status, NEW.status, v_comment);
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_log_task_history ON public.tasks;
CREATE TRIGGER tr_log_task_history
AFTER INSERT OR UPDATE OF status ON public.tasks
FOR EACH ROW
EXECUTE FUNCTION public.log_task_history();


-- Secure RPC for changing task status (supports comment)
CREATE OR REPLACE FUNCTION public.change_task_status(
  p_task_id UUID,
  p_new_status TEXT,
  p_comment TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_task public.tasks%ROWTYPE;
BEGIN
  IF p_comment IS NOT NULL AND length(trim(p_comment)) > 0 THEN
    PERFORM set_config('app.status_comment', trim(p_comment), true);
  ELSE
    PERFORM set_config('app.status_comment', '', true);
  END IF;

  UPDATE public.tasks
  SET status = p_new_status
  WHERE id = p_task_id
  RETURNING * INTO v_task;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Задача не найдена или нет прав на изменение';
  END IF;

  RETURN to_jsonb(v_task);
END;
$$;

-- Grant execution of RPC
GRANT EXECUTE ON FUNCTION public.change_task_status(UUID, TEXT, TEXT) TO authenticated;
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role, supabase_auth_admin;
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, anon, authenticated, service_role, supabase_auth_admin;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO postgres, anon, authenticated, service_role, supabase_auth_admin;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, anon, authenticated, service_role, supabase_auth_admin;
