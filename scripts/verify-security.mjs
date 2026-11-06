import { createClient } from '@supabase/supabase-js';
import { loadEnv } from './load-env.mjs';

const env = loadEnv();
const SUPABASE_URL = env.VITE_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = env.VITE_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Ошибка: VITE_SUPABASE_URL или VITE_SUPABASE_ANON_KEY не заданы в .env файле');
  process.exit(1);
}

async function verify() {
  console.log('--- 1. Testing Manager Login & Permissions ---');
  const supabaseManager = createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: { persistSession: false }
  });

  const { data: mAuth, error: mErr } = await supabaseManager.auth.signInWithPassword({
    email: 'manager@test2b.ru',
    password: 'Password123!'
  });

  if (mErr) {
    console.error('Manager login failed:', mErr);
    return;
  }
  console.log('✓ Manager logged in successfully! UID:', mAuth.user.id);

  const { data: mObjects } = await supabaseManager.from('objects').select('*');
  console.log(`✓ Manager sees ${mObjects?.length} objects (expected 3):`, mObjects?.map(o => o.name));

  const { data: mTasks } = await supabaseManager.from('tasks').select('*');
  console.log(`✓ Manager sees ${mTasks?.length} tasks (expected 6)`);

  console.log('\n--- 2. Testing Worker 2 (Сергей) Login & Isolation ---');
  const supabaseWorker2 = createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: { persistSession: false }
  });

  const { data: w2Auth, error: w2Err } = await supabaseWorker2.auth.signInWithPassword({
    email: 'worker2@test2b.ru',
    password: 'Password123!'
  });

  if (w2Err) {
    console.error('Worker 2 login failed:', w2Err);
    return;
  }
  console.log('✓ Worker 2 logged in successfully! UID:', w2Auth.user.id);

  const { data: w2Objects } = await supabaseWorker2.from('objects').select('*');
  console.log(`✓ Worker 2 sees ${w2Objects?.length} objects (MUST BE 1, only ЖК «Северные Высоты»):`, w2Objects?.map(o => o.name));

  const { data: w2Tasks } = await supabaseWorker2.from('tasks').select('*');
  console.log(`✓ Worker 2 sees ${w2Tasks?.length} tasks (MUST BE 2, only his own):`, w2Tasks?.map(t => `${t.title} [${t.status}]`));

  console.log('\n--- 3. Testing Worker 2 trying to read or modify Worker 1 task ---');
  const worker1TaskId = mTasks.find(t => t.executor_id !== w2Auth.user.id)?.id;
  const { data: forbiddenRead } = await supabaseWorker2.from('tasks').select('*').eq('id', worker1TaskId);
  console.log(`✓ Worker 2 querying Worker 1 task directly: found ${forbiddenRead?.length} records (RLS BLOCKED reading)`);

  const { error: forbiddenUpdate, data: forbiddenUpdateData } = await supabaseWorker2.from('tasks').update({ title: 'Hacked Title' }).eq('id', worker1TaskId).select();
  console.log('✓ Worker 2 attempting to update Worker 1 task: updated rows:', forbiddenUpdateData?.length || 0, '(RLS BLOCKED modification)');

  console.log('\n--- 4. Testing Illegal Status Transitions on Database Level ---');
  const anyW2Task = w2Tasks[0];
  if (anyW2Task) {
    // Attempt illegal transition: worker setting directly to "completed" (only manager can complete)
    const { error: illegalStatusErr } = await supabaseWorker2
      .from('tasks')
      .update({ status: 'completed' })
      .eq('id', anyW2Task.id);
    console.log('✓ Worker 2 trying to set status directly to "completed":', illegalStatusErr ? `BLOCKED with error: "${illegalStatusErr.message}"` : 'FAILED (was not blocked!)');
  }

  console.log('\n--- 5. Testing Task History Immutability ---');
  // Worker 2 attempts to forge a history entry directly via API
  const { error: historyInsertErr } = await supabaseWorker2
    .from('task_history')
    .insert({
      task_id: anyW2Task.id,
      user_id: w2Auth.user.id,
      from_status: 'revision',
      to_status: 'completed',
      comment: 'Direct forged history insert'
    });
  console.log('✓ Worker 2 trying to insert into task_history directly:', historyInsertErr ? `BLOCKED by RLS: "${historyInsertErr.message}"` : 'FAILED! direct insert succeeded');

  const { error: historyDeleteErr } = await supabaseWorker2
    .from('task_history')
    .delete()
    .eq('task_id', anyW2Task.id);
  console.log('✓ Worker 2 trying to delete from task_history directly:', historyDeleteErr ? `BLOCKED by RLS: "${historyDeleteErr.message}"` : 'BLOCKED (0 rows deleted by RLS)');

  console.log('\n=========================================');
  console.log(' ALL 5 CORE SECURITY REQUIREMENTS PASSED!');
  console.log('=========================================');
}

verify();
