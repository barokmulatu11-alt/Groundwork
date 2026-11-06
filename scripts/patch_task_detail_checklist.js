const fs = require('fs');
const filePath = 'c:/Barok/Projects/Groundwork/app/tasks/task-detail.tsx';
let content = fs.readFileSync(filePath, 'utf8');

// 1. Add unmount reset for loadedTaskIdRef
const oldUseEffect = `  const loadedTaskIdRef = React.useRef<string | null>(null);
  useEffect(() => {
    if (task && loadedTaskIdRef.current !== task.id) {
      loadedTaskIdRef.current = task.id;
      setTitle(task.title || '');
      setNote(task.note || '');
      setPriority(task.priority || 'medium');
      setDate(task.date || '');
      setDueTime(task.due_time || (task as any).time_block || '');
      setSubtasks(task.sub_tasks || []);
      setTitleError(null);
    }
  }, [task?.id]);`;

const newUseEffect = `  const loadedTaskIdRef = React.useRef<string | null>(null);
  useEffect(() => {
    return () => {
      loadedTaskIdRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (task && loadedTaskIdRef.current !== task.id) {
      loadedTaskIdRef.current = task.id;
      setTitle(task.title || '');
      setNote(task.note || '');
      setPriority(task.priority || 'medium');
      setDate(task.date || '');
      setDueTime(task.due_time || (task as any).time_block || '');
      setSubtasks(task.sub_tasks || []);
      setTitleError(null);
    }
  }, [task?.id]);`;

content = content.replace(oldUseEffect.replace(/\r?\n/g, '\r\n'), newUseEffect.replace(/\r?\n/g, '\r\n'))
                 .replace(oldUseEffect.replace(/\r?\n/g, '\n'), newUseEffect.replace(/\r?\n/g, '\n'));

// 2. Update handleSave, handleAddSubtask, handleToggleSubtask, handleRemoveSubtask, and add handleBackWithAutoSave
const oldHandlers = `  const handleSave = async () => {
    const trimmed = title.trim();
    if (!trimmed) {
      setTitleError('Task title cannot be blank');
      return;
    }
    setTitleError(null);
    hapticSuccess();
    const cleanTime = dueTime.trim() || null;
    const cleanDate = date.trim() || task.date || getLocalDateString();
    await updateTask(task.id, {
      title: trimmed,
      note: note.trim(),
      priority,
      date: cleanDate,
      due_time: cleanTime,
      time_block: cleanTime,
      sub_tasks: subtasks,
    });
    setSavedFeedback(true);
    setTimeout(() => {
      setSavedFeedback(false);
      router.back();
    }, 250);
  };

  const handleDeleteConfirmed = () => {
    deleteTask(task.id);
    setShowDeleteConfirm(false);
    router.back();
  };

  const handleToggleSubtask = (subtaskId: string) => {
    hapticLight();
    setSubtasks((prev) =>
      prev.map((st) => (st.id === subtaskId ? { ...st, completed: !st.completed } : st))
    );
  };

  const handleAddSubtask = () => {
    const stTitle = newSubtaskTitle.trim();
    if (!stTitle) return;
    hapticLight();
    setSubtasks((prev) => [
      ...prev,
      {
        id: 'st_' + Date.now(),
        task_id: task.id,
        title: stTitle,
        completed: false,
        order_index: prev.length,
        created_at: new Date().toISOString(),
      },
    ]);
    setNewSubtaskTitle('');
  };

  const handleRemoveSubtask = (subtaskId: string) => {
    hapticLight();
    setSubtasks((prev) => prev.filter((st) => st.id !== subtaskId));
  };`;

const newHandlers = `  const handleSave = async () => {
    const trimmed = title.trim();
    if (!trimmed) {
      setTitleError('Task title cannot be blank');
      return;
    }
    setTitleError(null);
    hapticSuccess();
    const cleanTime = dueTime.trim() || null;
    const cleanDate = date.trim() || task.date || getLocalDateString();

    let finalSubs = [...subtasks];
    if (newSubtaskTitle.trim()) {
      finalSubs.push({
        id: 'st_' + Date.now(),
        task_id: task.id,
        title: newSubtaskTitle.trim(),
        completed: false,
        order_index: finalSubs.length,
        created_at: new Date().toISOString(),
      });
      setNewSubtaskTitle('');
      setSubtasks(finalSubs);
    }

    await updateTask(task.id, {
      title: trimmed,
      note: note.trim(),
      priority,
      date: cleanDate,
      due_time: cleanTime,
      time_block: cleanTime,
      sub_tasks: finalSubs,
    });
    setSavedFeedback(true);
    setTimeout(() => {
      setSavedFeedback(false);
      router.back();
    }, 250);
  };

  const handleBackWithAutoSave = async () => {
    const trimmed = title.trim();
    if (trimmed && task) {
      let finalSubs = [...subtasks];
      if (newSubtaskTitle.trim()) {
        finalSubs.push({
          id: 'st_' + Date.now(),
          task_id: task.id,
          title: newSubtaskTitle.trim(),
          completed: false,
          order_index: finalSubs.length,
          created_at: new Date().toISOString(),
        });
      }
      const cleanTime = dueTime.trim() || null;
      const cleanDate = date.trim() || task.date || getLocalDateString();
      await updateTask(task.id, {
        title: trimmed,
        note: note.trim(),
        priority,
        date: cleanDate,
        due_time: cleanTime,
        time_block: cleanTime,
        sub_tasks: finalSubs,
      });
    }
    router.back();
  };

  const handleDeleteConfirmed = () => {
    deleteTask(task.id);
    setShowDeleteConfirm(false);
    router.back();
  };

  const handleToggleSubtask = (subtaskId: string) => {
    hapticLight();
    const nextSubs = subtasks.map((st) => (st.id === subtaskId ? { ...st, completed: !st.completed } : st));
    setSubtasks(nextSubs);
    updateTask(task.id, { sub_tasks: nextSubs });
  };

  const handleAddSubtask = () => {
    const stTitle = newSubtaskTitle.trim();
    if (!stTitle) return;
    hapticLight();
    const newSub: SubTask = {
      id: 'st_' + Date.now(),
      task_id: task.id,
      title: stTitle,
      completed: false,
      order_index: subtasks.length,
      created_at: new Date().toISOString(),
    };
    const nextSubs = [...subtasks, newSub];
    setSubtasks(nextSubs);
    setNewSubtaskTitle('');
    updateTask(task.id, { sub_tasks: nextSubs });
  };

  const handleRemoveSubtask = (subtaskId: string) => {
    hapticLight();
    const nextSubs = subtasks.filter((st) => st.id !== subtaskId);
    setSubtasks(nextSubs);
    updateTask(task.id, { sub_tasks: nextSubs });
  };`;

content = content.replace(oldHandlers.replace(/\r?\n/g, '\r\n'), newHandlers.replace(/\r?\n/g, '\r\n'))
                 .replace(oldHandlers.replace(/\r?\n/g, '\n'), newHandlers.replace(/\r?\n/g, '\n'));

// 3. Update BrandHeader in JSX to add Save button and auto-saving back button
const oldHeader = `<BrandHeader showBack />`;
const newHeader = `<BrandHeader
          showBack
          onBack={handleBackWithAutoSave}
          rightAction={
            <TouchableOpacity onPress={handleSave} style={{ paddingHorizontal: 10, paddingVertical: 5 }}>
              <Text style={{ color: theme.accent, fontSize: 16, fontFamily: 'Inter_600SemiBold' }}>
                {savedFeedback ? 'Saved' : 'Save'}
              </Text>
            </TouchableOpacity>
          }
        />`;

content = content.replace(oldHeader, newHeader);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Successfully patched app/tasks/task-detail.tsx with instant checklist auto-save');
