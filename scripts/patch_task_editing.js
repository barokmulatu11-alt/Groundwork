const fs = require('fs');

// 1. Patch lib/db.ts
let dbCode = fs.readFileSync('lib/db.ts', 'utf8');

if (!dbCode.includes('ALTER TABLE tasks ADD COLUMN due_time TEXT')) {
  const alterTarget = "try { db.execSync(`ALTER TABLE notes ADD COLUMN formulas TEXT DEFAULT '[]';`); } catch (e) {}";
  const alterRepl = "try { db.execSync(`ALTER TABLE notes ADD COLUMN formulas TEXT DEFAULT '[]';`); } catch (e) {}\n  try { db.execSync(`ALTER TABLE tasks ADD COLUMN due_time TEXT;`); } catch (e) {}";
  dbCode = dbCode.replace(alterTarget, alterRepl);
}

// Ensure getTasks returns due_time
dbCode = dbCode.replace(
  /return tasks\.map\(t => \(\{[\r\n\s]+\.\.\.t,[\r\n\s]+completed: Boolean\(t\.completed\),/g,
  `return tasks.map(t => ({
      ...t,
      due_time: t.due_time || t.time_block || null,
      time_block: t.time_block || t.due_time || null,
      completed: Boolean(t.completed),`
);

const newUpdateTask = `export function updateTask(id: string, updates: Partial<Task>) {
  try {
    if (!id || id === 'guest') return;
    const sanitizedUpdates = { ...updates };
    // Prevent blank titles from erasing task title
    if (sanitizedUpdates.title !== undefined) {
      const trimmed = String(sanitizedUpdates.title).trim();
      if (!trimmed) {
        delete sanitizedUpdates.title;
      } else {
        sanitizedUpdates.title = trimmed;
      }
    }

    // Sync due_time and time_block
    if ((sanitizedUpdates as any).due_time !== undefined) {
      const timeVal = (sanitizedUpdates as any).due_time ? String((sanitizedUpdates as any).due_time).trim() : null;
      (sanitizedUpdates as any).due_time = timeVal;
      sanitizedUpdates.time_block = timeVal;
    } else if (sanitizedUpdates.time_block !== undefined) {
      const timeVal = sanitizedUpdates.time_block ? String(sanitizedUpdates.time_block).trim() : null;
      sanitizedUpdates.time_block = timeVal;
      (sanitizedUpdates as any).due_time = timeVal;
    }

    const VALID_TASK_COLUMNS = new Set([
      'user_id',
      'title',
      'time_block',
      'due_time',
      'date',
      'completed',
      'completed_at',
      'priority',
      'note',
      'reminder_time',
      'order_index',
      'created_at',
      'updated_at',
      'deleted_at'
    ]);

    const now = new Date().toISOString();
    const keys = Object.keys(sanitizedUpdates).filter(k => k !== 'id' && VALID_TASK_COLUMNS.has(k));
    if (keys.length > 0) {
      const setClause = [...keys.map(k => \`\${k} = ?\`), 'updated_at = ?'].join(', ');
      const values = keys.map(k => {
        const val = (sanitizedUpdates as any)[k];
        if (typeof val === 'boolean') return val ? 1 : 0;
        if (val === undefined) return null;
        return val;
      });
      db.runSync(\`UPDATE tasks SET \${setClause} WHERE id = ?\`, [...values, now, id]);
    } else if (updates.sub_tasks !== undefined) {
      // Even if only sub_tasks changed, update task's updated_at
      db.runSync('UPDATE tasks SET updated_at = ? WHERE id = ?', [now, id]);
    }

    // Persist and sync sub_tasks if provided
    if (Array.isArray(updates.sub_tasks)) {
      const taskRow = db.getFirstSync<any>('SELECT user_id FROM tasks WHERE id = ?', [id]);
      const userId = taskRow?.user_id || 'guest';
      const currentSubs = db.getAllSync<any>('SELECT id FROM sub_tasks WHERE task_id = ? AND deleted_at IS NULL', [id]);
      const currentIds = new Set(currentSubs.map((s: any) => s.id));
      const incomingIds = new Set<string>();

      for (let i = 0; i < updates.sub_tasks.length; i++) {
        const st = updates.sub_tasks[i];
        const stTitle = typeof st === 'string' ? st : (st?.title || '');
        if (!stTitle.trim()) continue;
        const subId = (typeof st === 'object' && st.id) ? st.id : Math.random().toString(36).substring(7);
        const completed = (typeof st === 'object' && st.completed) ? 1 : 0;
        const orderIndex = (typeof st === 'object' && typeof st.order_index === 'number') ? st.order_index : i;
        incomingIds.add(subId);

        const existing = db.getFirstSync<any>('SELECT id FROM sub_tasks WHERE id = ?', [subId]);
        if (existing) {
          db.runSync(
            'UPDATE sub_tasks SET title = ?, completed = ?, order_index = ?, updated_at = ?, deleted_at = NULL WHERE id = ?',
            [stTitle.trim(), completed, orderIndex, now, subId]
          );
        } else {
          db.runSync(
            'INSERT INTO sub_tasks (id, task_id, user_id, title, completed, order_index, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [subId, id, userId, stTitle.trim(), completed, orderIndex, now, now]
          );
        }
      }

      // Any subtask that was in currentIds but not in incomingIds should be soft-deleted
      for (const curId of currentIds) {
        if (!incomingIds.has(curId)) {
          db.runSync('UPDATE sub_tasks SET deleted_at = ?, updated_at = ? WHERE id = ?', [now, now, curId]);
        }
      }
    }
  } catch (e) {
    console.error('[DB] updateTask error:', e);
  }
}

export function deleteTask(id: string) {`;

const updateTaskRegex = /export function updateTask\(id: string, updates: Partial<Task>\)[\s\S]*?export function deleteTask\(id: string\) \{/;
dbCode = dbCode.replace(updateTaskRegex, newUpdateTask);

fs.writeFileSync('lib/db.ts', dbCode, 'utf8');
console.log('lib/db.ts patched successfully');
