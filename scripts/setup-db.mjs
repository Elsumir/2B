import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { loadEnv } from './load-env.mjs';

const env = loadEnv();

const dbHost = env.SUPABASE_DB_HOST || process.env.SUPABASE_DB_HOST;
const dbPort = parseInt(env.SUPABASE_DB_PORT || process.env.SUPABASE_DB_PORT || '5432', 10);
const dbUser = env.SUPABASE_DB_USER || process.env.SUPABASE_DB_USER;
const dbPassword = env.SUPABASE_DB_PASSWORD || process.env.SUPABASE_DB_PASSWORD;

if (!dbHost || !dbUser || !dbPassword) {
  console.error('Ошибка: SUPABASE_DB_HOST, SUPABASE_DB_USER или SUPABASE_DB_PASSWORD не заданы в .env файле');
  process.exit(1);
}

const client = new pg.Client({
  host: dbHost,
  port: dbPort,
  user: dbUser,
  password: dbPassword,
  database: 'postgres',
  ssl: { rejectUnauthorized: false }
});

async function setup() {
  await client.connect();
  console.log('Connected to PostgreSQL...');

  // 1. Clean old test tables and users
  console.log('Cleaning public schema and test users...');
  await client.query(`
    DROP TABLE IF EXISTS public.task_history CASCADE;
    DROP TABLE IF EXISTS public.tasks CASCADE;
    DROP TABLE IF EXISTS public.objects CASCADE;
    DROP TABLE IF EXISTS public.profiles CASCADE;
    DELETE FROM auth.identities WHERE email LIKE '%@test2b.ru' OR email LIKE '%@crm.local';
    DELETE FROM auth.users WHERE email LIKE '%@test2b.ru' OR email LIKE '%@crm.local';
  `);

  // 2. Apply migration schema
  console.log('Applying migration 20241105000000_init_crm.sql...');
  const migrationSql = fs.readFileSync(path.resolve('supabase/migrations/20241105000000_init_crm.sql'), 'utf-8');
  await client.query(migrationSql);
  console.log('Schema applied successfully.');

  // 3. Create test users in auth.users and auth.identities
  const testUsers = [
    {
      id: '11111111-1111-1111-1111-111111111111',
      email: 'manager@test2b.ru',
      password: 'Password123!',
      role: 'manager',
      full_name: 'Алексей Смирнов (Постановщик)'
    },
    {
      id: '22222222-2222-2222-2222-222222222222',
      email: 'worker1@test2b.ru',
      password: 'Password123!',
      role: 'executor',
      full_name: 'Иван Петров (Электрик)'
    },
    {
      id: '33333333-3333-3333-3333-333333333333',
      email: 'worker2@test2b.ru',
      password: 'Password123!',
      role: 'executor',
      full_name: 'Сергей Васильев (Отделочник)'
    }
  ];

  console.log('Creating auth users and profiles...');
  for (const u of testUsers) {
    await client.query(`
      INSERT INTO auth.users (
        instance_id,
        id,
        aud,
        role,
        email,
        encrypted_password,
        email_confirmed_at,
        invited_at,
        confirmation_token,
        confirmation_sent_at,
        recovery_token,
        recovery_sent_at,
        email_change_token_new,
        email_change,
        email_change_sent_at,
        last_sign_in_at,
        raw_app_meta_data,
        raw_user_meta_data,
        is_super_admin,
        created_at,
        updated_at,
        phone,
        phone_confirmed_at,
        phone_change,
        phone_change_token,
        phone_change_sent_at,
        email_change_token_current,
        email_change_confirm_status,
        banned_until,
        reauthentication_token,
        reauthentication_sent_at,
        is_sso_user,
        deleted_at,
        is_anonymous
      ) VALUES (
        '00000000-0000-0000-0000-000000000000',
        $1::uuid,
        'authenticated',
        'authenticated',
        $2,
        crypt($3, gen_salt('bf', 10)),
        now(),
        null,
        '',
        null,
        '',
        null,
        '',
        '',
        null,
        null,
        '{"provider":"email","providers":["email"]}'::jsonb,
        jsonb_build_object('full_name', $4::text),
        null,
        now(),
        now(),
        null,
        null,
        '',
        '',
        null,
        '',
        0,
        null,
        '',
        null,
        false,
        null,
        false
      );
    `, [u.id, u.email, u.password, u.full_name]);

    await client.query(`
      INSERT INTO auth.identities (
        id,
        user_id,
        identity_data,
        provider,
        provider_id,
        last_sign_in_at,
        created_at,
        updated_at
      ) VALUES (
        gen_random_uuid(),
        $1::uuid,
        jsonb_build_object('sub', $1::text, 'email', $2::text),
        'email',
        $1::text,
        now(),
        now(),
        now()
      );
    `, [u.id, u.email]);

    await client.query(`
      INSERT INTO public.profiles (id, email, full_name, role)
      VALUES ($1::uuid, $2, $3, $4);
    `, [u.id, u.email, u.full_name, u.role]);

    console.log(`Created user: ${u.email} [${u.role}]`);
  }

  // 4. Create Objects
  console.log('Creating sample construction objects...');
  const managerId = testUsers[0].id;
  const worker1Id = testUsers[1].id;
  const worker2Id = testUsers[2].id;

  const obj1 = (await client.query(`
    INSERT INTO public.objects (name, address, created_by)
    VALUES ('ЖК «Северные Высоты»', 'г. Москва, ул. Полярная, д. 28, корп. 1', $1)
    RETURNING id;
  `, [managerId])).rows[0].id;

  const obj2 = (await client.query(`
    INSERT INTO public.objects (name, address, created_by)
    VALUES ('Бизнес-центр «Атлант»', 'г. Москва, Ленинградский пр-т, д. 39, стр. 2', $1)
    RETURNING id;
  `, [managerId])).rows[0].id;

  const obj3 = (await client.query(`
    INSERT INTO public.objects (name, address, created_by)
    VALUES ('Коттеджный посёлок «Лесное Озеро»', 'Московская обл., Истринский р-н, пос. Озерки, уч. 14', $1)
    RETURNING id;
  `, [managerId])).rows[0].id;

  // 5. Create Tasks and realistic status histories
  console.log('Creating tasks and histories...');

  // Task 1: ЖК «Северные Высоты» -> worker1, status: in_progress
  const t1 = (await client.query(`
    INSERT INTO public.tasks (title, description, object_id, executor_id, status, author_id)
    VALUES ('Монтаж вводного распределительного щита', 'Собрать щит ВРУ согласно схеме ЭОМ-2, установить автоматические выключатели ABB.', $1, $2, 'in_progress', $3)
    RETURNING id;
  `, [obj1, worker1Id, managerId])).rows[0].id;

  await client.query(`
    INSERT INTO public.task_history (task_id, user_id, from_status, to_status, comment, created_at)
    VALUES ($1, $2, 'new', 'in_progress', 'Принял задачу в работу, комплектующие получены со склада.', now() - interval '2 hours');
  `, [t1, worker1Id]);

  // Task 2: ЖК «Северные Высоты» -> worker2, status: new
  await client.query(`
    INSERT INTO public.tasks (title, description, object_id, executor_id, status, author_id)
    VALUES ('Шпатлёвка стен 3-го этажа', 'Подготовить стены под покраску, нанести стартовый и финишный слой.', $1, $2, 'new', $3);
  `, [obj1, worker2Id, managerId]);

  // Task 3: ЖК «Северные Высоты» -> worker2, status: revision
  const t3 = (await client.query(`
    INSERT INTO public.tasks (title, description, object_id, executor_id, status, author_id)
    VALUES ('Укладка керамогранита в холле', 'Уложить керамогранит 60х60 с системой выравнивания плитки СВП.', $1, $2, 'revision', $3)
    RETURNING id;
  `, [obj1, worker2Id, managerId])).rows[0].id;

  await client.query(`
    INSERT INTO public.task_history (task_id, user_id, from_status, to_status, comment, created_at)
    VALUES 
      ($1, $2, 'new', 'in_progress', 'Начал укладку первого ряда плитки.', now() - interval '2 days'),
      ($1, $2, 'in_progress', 'under_review', 'Плитка уложена, швы очищены под затирку.', now() - interval '4 hours'),
      ($1, $3, 'under_review', 'revision', 'Неровные швы в зоне лифта и перепады по высоте на входе. Переделать!', now() - interval '1 hour');
  `, [t3, worker2Id, managerId]);

  // Task 4: Бизнес-центр «Атлант» -> worker1, status: under_review
  const t4 = (await client.query(`
    INSERT INTO public.tasks (title, description, object_id, executor_id, status, author_id)
    VALUES ('Прокладка силового кабеля 10кВ', 'Протяжка кабеля в лотках по подземному паркингу к трансформаторной подстанции.', $1, $2, 'under_review', $3)
    RETURNING id;
  `, [obj2, worker1Id, managerId])).rows[0].id;

  await client.query(`
    INSERT INTO public.task_history (task_id, user_id, from_status, to_status, comment, created_at)
    VALUES 
      ($1, $2, 'new', 'in_progress', 'Кабель доставлен на объект, начали протяжку.', now() - interval '3 days'),
      ($1, $2, 'in_progress', 'under_review', 'Кабель уложен в лотки, выполнена опрессовка наконечников, готов к замеру изоляции.', now() - interval '3 hours');
  `, [t4, worker1Id]);

  // Task 5: Бизнес-центр «Атлант» -> worker1, status: completed
  const t5 = (await client.query(`
    INSERT INTO public.tasks (title, description, object_id, executor_id, status, author_id)
    VALUES ('Установка противопожарных перегородок', 'Монтаж огнестойких перегородок EI-60 в серверной и кроссовой комнатах.', $1, $2, 'completed', $3)
    RETURNING id;
  `, [obj2, worker1Id, managerId])).rows[0].id;

  await client.query(`
    INSERT INTO public.task_history (task_id, user_id, from_status, to_status, comment, created_at)
    VALUES 
      ($1, $2, 'new', 'in_progress', 'Каркас смонтирован, укладываем минеральную вату Rockwool.', now() - interval '5 days'),
      ($1, $2, 'in_progress', 'under_review', 'Перегородки зашиты гипсофибровыми листами, огнезащитные гильзы установлены.', now() - interval '2 days'),
      ($1, $3, 'under_review', 'completed', 'Принято технадзором и пожарным инспектором без замечаний.', now() - interval '1 day');
  `, [t5, worker1Id, managerId]);

  // Task 6: Коттеджный посёлок «Лесное Озеро» -> worker1, status: new
  await client.query(`
    INSERT INTO public.tasks (title, description, object_id, executor_id, status, author_id)
    VALUES ('Монтаж контура заземления', 'Забить омедненные штыри заземления на глубину 6м, провести замер сопротивления (не более 4 Ом).', $1, $2, 'new', $3);
  `, [obj3, worker1Id, managerId]);

  console.log('\n=========================================');
  console.log(' DATABASE INITIALIZED & SEEDED PERFECTLY!');
  console.log('=========================================');

  await client.end();
}

setup().catch(err => {
  console.error('Setup failed:', err);
  process.exit(1);
});
