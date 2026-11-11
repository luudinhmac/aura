import React, { useState, useMemo } from 'react';
import { Idol, IdolTask, TaskCategory, TaskStatus, UserAccount } from '../types/index.ts';
import { getTodayIsoDate, formatDateVN } from '../utils/dateUtils.ts';
import { DateInput } from '../components/DateInput.tsx';
import { SearchableSelect } from '../components/SearchableSelect.tsx';
import { CheckSquare, Clock, Play, Square, Plus, Trash2, CheckCircle2, Circle, AlertCircle, ChevronRight, User, Calendar, Tag, Search } from 'lucide-react';
import { notify } from '../utils/uiFeedback.ts';
import { getTaskCategoriesForIdolCategory, isTaskCategoryAllowedForActivity } from '../utils/taskTaxonomy.ts';

interface TaskManagementViewProps {
  idols: Idol[];
  tasks: IdolTask[];
  onAddTask: (task: Partial<IdolTask>) => Promise<void>;
  onUpdateTask: (id: string, updates: Partial<IdolTask>) => Promise<void>;
  onDeleteTask: (id: string) => Promise<void>;
  onAddSubtask: (taskId: string, title: string, minutes: number) => Promise<void>;
  onUpdateSubtask: (taskId: string, subtaskId: string, data: { completed?: boolean; timeSpentMinutes?: number; title?: string }) => Promise<void>;
  onDeleteSubtask: (taskId: string, subtaskId: string) => Promise<void>;
  selectedIdolId?: string;
  currentUser: UserAccount;
  onStartTimer: (taskId: string) => Promise<IdolTask>;
  onStopTimer: (taskId: string) => Promise<IdolTask>;
  onRefreshTasks: () => Promise<void>;
}

export const TaskManagementView: React.FC<TaskManagementViewProps> = ({
  idols,
  tasks,
  onAddTask,
  onUpdateTask,
  onDeleteTask,
  onAddSubtask,
  onUpdateSubtask,
  onDeleteSubtask,
  selectedIdolId: initialSelectedIdolId,
  currentUser,
  onStartTimer,
  onStopTimer,
  onRefreshTasks
}) => {
  const [activeTab, setActiveTab] = useState<'summary' | 'detail'>(() => {
    try {
      const saved = localStorage.getItem('aura_tasks_subtab') as 'summary' | 'detail';
      if (saved) return saved;
    } catch {
      // fallback
    }
    return 'summary';
  });

  React.useEffect(() => {
    try {
      localStorage.setItem('aura_tasks_subtab', activeTab);
    } catch {
      // ignore
    }
  }, [activeTab]);
  const isTaskManager = Boolean(!currentUser.isIdol && (currentUser.isSuperAdmin || currentUser.isBusinessAdmin || currentUser.allowedActions?.includes('manage_tasks')));
  const selfIdolId = currentUser.idolId;
  const visibleIdols = isTaskManager ? idols : idols.filter((idol) => idol.id === selfIdolId);
  const [selectedIdolId, setSelectedIdolId] = useState<string>(
    isTaskManager ? (initialSelectedIdolId || idols[0]?.id || '') : (selfIdolId || '')
  );
  const [searchQuery, setSearchQuery] = useState<string>('');
  
  // Timer state for active stopwatch simulation
  const [runningTaskId, setRunningTaskId] = useState<string | null>(null);
  const [lastTimerTaskId, setLastTimerTaskId] = useState<string | null>(null);
  const [timerSeconds, setTimerSeconds] = useState<number>(0);
  const timerRef = React.useRef<any>(null);

  // New task modal / form
  const [showNewTaskModal, setShowNewTaskModal] = useState(false);
  const [newTaskForm, setNewTaskForm] = useState<{
    title: string;
    description: string;
    category: TaskCategory;
    activityCode: string;
    dueDate: string;
  }>({
    title: '',
    description: '',
    category: 'Luyện tập',
    activityCode: '',
    dueDate: getTodayIsoDate()
  });

  // New subtask input for each task
  const [newSubtaskTitles, setNewSubtaskTitles] = useState<Record<string, string>>({});

  // Timer effect
  React.useEffect(() => {
    if (runningTaskId) {
      timerRef.current = setInterval(() => {
        setTimerSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [runningTaskId]);

  React.useEffect(() => {
    if (!isTaskManager && selfIdolId && selectedIdolId !== selfIdolId) {
      setSelectedIdolId(selfIdolId);
    }
  }, [isTaskManager, selfIdolId, selectedIdolId]);

  React.useEffect(() => {
    const interval = window.setInterval(() => { void onRefreshTasks().catch(() => undefined); }, 5000);
    return () => window.clearInterval(interval);
  }, [onRefreshTasks]);

  React.useEffect(() => {
    void onRefreshTasks().catch(() => undefined);
  }, [onRefreshTasks, selectedIdolId]);

  React.useEffect(() => {
    const activeTask = tasks.find((task) => task.idolId === selectedIdolId && task.startTime && !task.endTime);
    if (!activeTask) {
      if (!runningTaskId) return;
      return;
    }
    setRunningTaskId(activeTask.id);
    setLastTimerTaskId(activeTask.id);
    setTimerSeconds(Math.max(0, Math.floor((Date.now() - new Date(activeTask.startTime as string).getTime()) / 1000)));
  }, [tasks, selectedIdolId, runningTaskId]);

  const handleStartTimer = async (taskId: string) => {
    if (runningTaskId && runningTaskId !== taskId) {
      await handleStopTimer();
    }
    try {
      const updated = await onStartTimer(taskId);
      setRunningTaskId(taskId);
      setLastTimerTaskId(taskId);
      setTimerSeconds(Math.max(0, Math.floor((Date.now() - new Date(updated.startTime || Date.now()).getTime()) / 1000)));
    } catch (error: any) {
      notify(error?.message || 'Không thể bắt đầu bấm giờ.', 'error');
    }
  };

  const handleStopTimer = async () => {
    if (!runningTaskId) return;
    const task = tasks.find((t) => t.id === runningTaskId);
    if (task) {
      try {
        await onStopTimer(runningTaskId);
      } catch (error: any) {
        notify(error?.message || 'Không thể dừng và lưu thời gian.', 'error');
        return;
      }
    }
    setRunningTaskId(null);
    setTimerSeconds(0);
  };

  React.useEffect(() => {
    const handleTimerShortcut = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const isEditable = target?.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target?.tagName || '');
      const isInteractiveControl = target?.closest('button, a, [role="button"]');
      if (event.code !== 'Space' || isEditable || isInteractiveControl || showNewTaskModal) return;

      event.preventDefault();
      if (runningTaskId) {
        void handleStopTimer();
        return;
      }

      const taskToStart = tasks.find((task) => task.id === lastTimerTaskId && task.idolId === selectedIdolId)
        || tasks.find((task) => task.idolId === selectedIdolId);
      if (taskToStart) void handleStartTimer(taskToStart.id);
    };

    window.addEventListener('keydown', handleTimerShortcut);
    return () => window.removeEventListener('keydown', handleTimerShortcut);
  }, [lastTimerTaskId, runningTaskId, selectedIdolId, showNewTaskModal, tasks]);

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskForm.title.trim() || !selectedIdolId) return;

    await onAddTask({
      idolId: selectedIdolId,
      title: newTaskForm.title,
      description: newTaskForm.description,
      category: newTaskForm.category,
      activityCode: newTaskForm.activityCode || undefined,
      status: 'todo',
      loggedDurationMinutes: 0,
      dueDate: newTaskForm.dueDate,
      subtasks: []
    });

    setNewTaskForm({
      title: '',
      description: '',
      category: 'Luyện tập',
      activityCode: '',
      dueDate: getTodayIsoDate()
    });
    setShowNewTaskModal(false);
  };

  const handleAddSubtaskSubmit = async (taskId: string) => {
    const title = newSubtaskTitles[taskId]?.trim();
    if (!title) return;

    await onAddSubtask(taskId, title, 30);
    setNewSubtaskTitles((prev) => ({ ...prev, [taskId]: '' }));
  };

  const tasksByIdol = useMemo(() => {
    const grouped = new Map<string, IdolTask[]>();
    tasks.forEach((task) => {
      const current = grouped.get(task.idolId) || [];
      current.push(task);
      grouped.set(task.idolId, current);
    });
    return grouped;
  }, [tasks]);

  const taskStatsByIdol = useMemo(() => {
    const stats = new Map<string, { total: number; completed: number; inProgress: number; todo: number; totalMinutes: number }>();
    tasksByIdol.forEach((idolTasks, idolId) => {
      stats.set(idolId, {
        total: idolTasks.length,
        completed: idolTasks.filter((task) => task.status === 'completed').length,
        inProgress: idolTasks.filter((task) => task.status === 'in_progress').length,
        todo: idolTasks.filter((task) => task.status === 'todo').length,
        totalMinutes: idolTasks.reduce((total, task) => total + (task.loggedDurationMinutes || 0), 0),
      });
    });
    return stats;
  }, [tasksByIdol]);

  const selectedIdol = visibleIdols.find((i) => i.id === selectedIdolId) || visibleIdols[0];
  const availableTaskCategories = getTaskCategoriesForIdolCategory(selectedIdol?.idolCategory);
  const availableActivities = selectedIdol?.activities?.filter((activity) =>
    isTaskCategoryAllowedForActivity(newTaskForm.category, activity.code)
  ) || [];
  const idolTasks = tasksByIdol.get(selectedIdolId) || [];

  React.useEffect(() => {
    if (!availableTaskCategories.includes(newTaskForm.category)) {
      setNewTaskForm((prev) => ({ ...prev, category: availableTaskCategories[0] || 'Luyện tập', activityCode: '' }));
      return;
    }
    if (newTaskForm.activityCode && !availableActivities.some((activity) => activity.code === newTaskForm.activityCode)) {
      setNewTaskForm((prev) => ({ ...prev, activityCode: '' }));
    }
  }, [selectedIdol?.idolCategory, selectedIdol?.id, newTaskForm.category, newTaskForm.activityCode, availableActivities, availableTaskCategories]);

  // Format minutes into clean hours & minutes string
  const formatDuration = (mins: number) => {
    const hours = Math.floor(mins / 60);
    const m = mins % 60;
    if (hours === 0) return `${m} phút`;
    if (m === 0) return `${hours} giờ`;
    return `${hours}h ${m}m`;
  };

  const filteredIdols = useMemo(() => {
    const term = searchQuery.toLowerCase().trim();
    if (!term) return visibleIdols;
    return visibleIdols.filter(
      (i) =>
        i.stageName.toLowerCase().includes(term) ||
        i.realName.toLowerCase().includes(term) ||
        i.department.toLowerCase().includes(term) ||
        i.role.toLowerCase().includes(term)
    );
  }, [visibleIdols, searchQuery]);

  return (
    <div className="space-y-6">
      {/* Top Banner Toolbar with Mode Switch */}
      <div className="bg-white rounded-xl border border-slate-200/90 p-4 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <CheckSquare className="w-4 h-4 text-emerald-600" />
            <span>Quản Lý Tiến Độ Công Việc & Thời Gian Thực Hiện</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Theo dõi tổng kết việc làm theo danh sách từng người và chi tiết task / subtask bấm giờ thực tế.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Search bar */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm kiếm nhân sự, nhiệm vụ..."
              className="pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-rose-500 focus:bg-white w-48 sm:w-56"
            />
          </div>

          {/* View Segmented Switch */}
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
            <button
              onClick={() => setActiveTab('summary')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                activeTab === 'summary'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Tổng Kết Công Việc
            </button>
            <button
              onClick={() => setActiveTab('detail')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                activeTab === 'detail'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Chi Tiết & Bấm Giờ Task
            </button>
          </div>
        </div>
      </div>

      {/* TAB 1: WORKLOAD SUMMARY PER IDOL */}
      {activeTab === 'summary' && (
        <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-200/80 bg-slate-50/70 flex items-center justify-between">
            <span className="text-xs font-bold text-slate-800">
              Danh Sách Tổng Hợp Khối Lượng Công Việc Từng Nhân Sự
            </span>
            <span className="text-[11px] text-slate-500">
              Tổng cộng: <strong>{tasks.length}</strong> nhiệm vụ đã giao
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/90 border-b border-slate-200 text-slate-700 text-[11px] font-bold">
                  <th className="py-3 px-3 w-12 text-center">STT</th>
                  <th className="py-3 px-4 min-w-[200px]">Idol & Nghệ Danh</th>
                  <th className="py-3 px-3 min-w-[130px]">Phòng Ban / Team</th>
                  <th className="py-3 px-3 text-center min-w-[90px]">Tổng Việc</th>
                  <th className="py-3 px-3 text-center min-w-[100px]">Hoàn Thành</th>
                  <th className="py-3 px-3 text-center min-w-[100px]">Đang Làm</th>
                  <th className="py-3 px-3 text-center min-w-[90px]">Chưa Làm</th>
                  <th className="py-3 px-4 min-w-[150px]">Tiến Độ Hoàn Thành</th>
                  <th className="py-3 px-3 text-right min-w-[120px]">Thời Gian Đã Ghi</th>
                  <th className="py-3 px-4 w-32 text-center">Thao Tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-normal">
                {filteredIdols.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="py-8 text-center text-slate-400">
                      {searchQuery ? `Không tìm thấy nhân sự nào phù hợp với "${searchQuery}"` : 'Không có nhân sự nào trong phạm vi được phân quyền.'}
                    </td>
                  </tr>
                ) : (
                  filteredIdols.map((idol, index) => {
                    const stats = taskStatsByIdol.get(idol.id) || { total: 0, completed: 0, inProgress: 0, todo: 0, totalMinutes: 0 };
                  const { total, completed, inProgress, todo, totalMinutes } = stats;
                  const percent = total > 0 ? Math.round((completed / total) * 100) : 0;

                  return (
                    <tr
                      key={idol.id}
                      className="hover:bg-slate-50/70 transition-colors cursor-pointer"
                      onClick={() => {
                        setSelectedIdolId(idol.id);
                        setActiveTab('detail');
                      }}
                    >
                      {/* STT */}
                      <td className="py-3 px-3 text-center font-mono text-slate-600 tabular-nums">
                        {String(index + 1).padStart(2, '0')}
                      </td>

                      {/* Idol */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <img
                            src={idol.avatarUrl}
                            alt={idol.stageName}
                            referrerPolicy="no-referrer"
                            className="w-8 h-8 rounded-lg object-cover border border-rose-200 shrink-0"
                          />
                          <div className="min-w-0">
                            <div className="font-bold text-slate-900 truncate">
                              {idol.stageName}
                            </div>
                            <div className="text-[11px] text-slate-600 truncate">
                              {idol.realName}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Department */}
                      <td className="py-3 px-3 text-slate-600 truncate">
                        {idol.department}
                      </td>

                      {/* Counts */}
                      <td className="py-3 px-3 text-center font-mono font-bold text-slate-700 tabular-nums">
                        {total}
                      </td>
                      <td className="py-3 px-3 text-center font-mono font-semibold text-emerald-700 tabular-nums">
                        {completed}
                      </td>
                      <td className="py-3 px-3 text-center font-mono font-semibold text-sky-700 tabular-nums">
                        {inProgress}
                      </td>
                      <td className="py-3 px-3 text-center font-mono text-slate-600 tabular-nums">
                        {todo}
                      </td>

                      {/* Progress Bar */}
                      <td className="py-3 px-4">
                        <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden flex">
                          <div
                            className="bg-emerald-500 h-full rounded-full transition-all"
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                        <div className="text-[10px] text-slate-400 mt-1 font-mono text-right">
                          {percent}% ({completed}/{total})
                        </div>
                      </td>

                      {/* Total Logged Duration */}
                      <td className="py-3 px-3 text-right font-mono font-bold text-slate-800 tabular-nums">
                        {formatDuration(totalMinutes)}
                      </td>

                      {/* Action */}
                      <td className="py-3 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => {
                            setSelectedIdolId(idol.id);
                            setActiveTab('detail');
                          }}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-md transition-colors"
                        >
                          <span>Xem việc</span>
                          <ChevronRight className="w-3 h-3" />
                        </button>
                      </td>
                    </tr>
                  );
                }))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: DETAILED TASK & SUBTASK TIME TRACKER */}
      {activeTab === 'detail' && (
        <div className="space-y-5">
          {/* Idol Selector Bar */}
          <div className="bg-white rounded-xl border border-slate-200/90 p-4 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              {selectedIdol && (
                <>
                  <img
                    src={selectedIdol.avatarUrl}
                    alt={selectedIdol.stageName}
                    className="w-12 h-12 rounded-xl object-cover border-2 border-rose-200 shadow-2xs shrink-0"
                  />
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-base text-slate-900">{selectedIdol.stageName}</h3>
                      <span className="text-xs text-sky-800 font-medium">({selectedIdol.role})</span>
                    </div>
                    <p className="text-xs text-slate-500">{selectedIdol.realName} · {selectedIdol.department}</p>
                  </div>
                </>
              )}
            </div>

            <div className="flex items-center gap-3">
              {/* Select another idol */}
              <div className="flex items-center gap-1.5 text-xs text-slate-600">
                <span>Chọn Idol:</span>
                <SearchableSelect
                  value={selectedIdolId}
                  onChange={setSelectedIdolId}
                  ariaLabel="Tìm và chọn Idol"
                  searchPlaceholder="Nhập tên Idol..."
                  className="w-64"
                  options={visibleIdols.map((i) => ({ value: i.id, label: `${i.stageName} (${i.role})`, keywords: `${i.realName} ${i.department}` }))}
                />
              </div>

              {/* Add Task Button */}
              <button
                onClick={() => setShowNewTaskModal(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-500 rounded-lg shadow-sm transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Thêm Task Mới</span>
              </button>
            </div>
          </div>

          {/* Task Cards Grid */}
          {idolTasks.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 p-12 text-center space-y-3">
              <AlertCircle className="w-10 h-10 text-slate-300 mx-auto" />
              <h4 className="font-bold text-slate-700 text-sm">Chưa có nhiệm vụ nào cho {selectedIdol?.stageName}</h4>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Bấm vào nút "Thêm Task Mới" ở trên để phân bổ bài tập, lịch thu âm hoặc lịch trình biểu diễn.
              </p>
              <button
                onClick={() => setShowNewTaskModal(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-lg transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Tạo nhiệm vụ đầu tiên</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {idolTasks.map((task) => {
                const isRunning = runningTaskId === task.id;
                const completedSubtasks = task.subtasks.filter((s) => s.completed).length;

                return (
                  <div
                    key={task.id}
                    className={`bg-white rounded-xl border transition-all p-5 shadow-2xs flex flex-col justify-between ${
                      isRunning
                        ? 'border-rose-400 ring-2 ring-rose-500/10'
                        : task.status === 'completed'
                        ? 'border-emerald-200 bg-emerald-50/10'
                        : 'border-slate-200'
                    }`}
                  >
                    <div>
                      {/* Category & Status Row */}
                      <div className="flex items-center justify-between gap-2 mb-2.5">
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[11px] font-medium bg-sky-50 text-sky-800 border border-sky-100">
                          <Tag className="w-3 h-3 text-sky-600" />
                          {task.category}
                        </span>

                        {isTaskManager && <div className="flex items-center gap-2">
                          {task.status === 'in_progress' ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-semibold rounded border bg-sky-50 text-sky-700 border-sky-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-sky-500 animate-pulse" />
                              Đang làm · tự động từ Bấm giờ
                            </span>
                          ) : (
                            <select
                              value={task.status}
                              onChange={(e) => onUpdateTask(task.id, { status: e.target.value as TaskStatus })}
                              className={`px-2 py-0.5 text-xs font-semibold rounded border focus:outline-none ${
                                task.status === 'completed'
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                  : 'bg-slate-100 text-slate-600 border-slate-200'
                              }`}
                            >
                              <option value="todo">Chưa làm</option>
                              <option value="completed">Đã xong</option>
                            </select>
                          )}

                          <button
                            onClick={() => onDeleteTask(task.id)}
                            className="p-1 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                            title="Xóa nhiệm vụ"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>}
                      </div>

                      {/* Title & Description */}
                      <h4 className="font-bold text-sm text-slate-900">{task.title}</h4>
                      {task.description && (
                        <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                          {task.description}
                        </p>
                      )}

                      {/* Time logs metadata */}
                      <div className="mt-3 flex items-center justify-between text-xs text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          <span>Thời gian đã ghi:</span>
                          <strong className="text-slate-800 font-mono tabular-nums">
                            {formatDuration(task.loggedDurationMinutes || 0)}
                          </strong>
                        </div>

                        {/* Stopwatch controls */}
                        {isRunning ? (
                          <div className="flex items-center gap-2">
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-700 tabular-nums">
                              <span className="w-1.5 h-1.5 rounded-full bg-rose-600 animate-pulse" />
                              {Math.floor(timerSeconds / 60)}:{(timerSeconds % 60).toString().padStart(2, '0')}
                            </span>
                            <button
                              onClick={handleStopTimer}
                              className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold text-white bg-rose-600 hover:bg-rose-700 rounded transition-colors"
                            >
                              <Square className="w-3 h-3 fill-current" />
                              Dừng & Lưu
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => handleStartTimer(task.id)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold text-sky-800 bg-sky-100 hover:bg-sky-200 rounded transition-colors"
                          >
                            <Play className="w-3 h-3 fill-current" />
                            Bấm giờ
                          </button>
                        )}
                      </div>

                      {/* Subtasks Section */}
                      <div className="mt-4 pt-3 border-t border-slate-100 space-y-2">
                        <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
                          <span>Các mục công việc nhỏ (Subtasks):</span>
                          <span className="text-[11px] text-slate-400 font-mono">
                            {completedSubtasks}/{task.subtasks.length} xong
                          </span>
                        </div>

                        <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                          {task.subtasks.map((sub) => (
                            <div
                              key={sub.id}
                              className="flex items-center justify-between p-2 rounded-lg bg-slate-50/70 hover:bg-slate-50 border border-slate-100 text-xs transition-colors"
                            >
                              <div
                                className="flex items-center gap-2 cursor-pointer flex-1 min-w-0"
                                onClick={isTaskManager ? () => onUpdateSubtask(task.id, sub.id, { completed: !sub.completed }) : undefined}
                              >
                                {sub.completed ? (
                                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                                ) : (
                                  <Circle className="w-4 h-4 text-slate-300 shrink-0" />
                                )}
                                <span className={`truncate ${sub.completed ? 'line-through text-slate-400' : 'text-slate-700'}`}>
                                  {sub.title}
                                </span>
                              </div>

                              <div className="flex items-center gap-2 shrink-0 ml-2">
                                <span className="text-[10px] text-slate-400 font-mono">
                                  {sub.timeSpentMinutes}m
                                </span>
                                <button
                                  onClick={isTaskManager ? () => onDeleteSubtask(task.id, sub.id) : undefined}
                                  className="text-slate-300 hover:text-rose-500 transition-colors p-0.5"
                                  title="Xóa subtask"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Add subtask input */}
                         {isTaskManager && <div className="flex items-center gap-1.5 pt-1">
                          <input
                            type="text"
                            placeholder="+ Thêm việc nhỏ (subtask)..."
                            value={newSubtaskTitles[task.id] || ''}
                            onChange={(e) =>
                              setNewSubtaskTitles({ ...newSubtaskTitles, [task.id]: e.target.value })
                            }
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                handleAddSubtaskSubmit(task.id);
                              }
                            }}
                            className="flex-1 px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:bg-white focus:border-rose-400"
                          />
                          <button
                            type="button"
                            onClick={() => handleAddSubtaskSubmit(task.id)}
                            className="px-2.5 py-1.5 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-lg transition-colors"
                          >
                            Thêm
                          </button>
                         </div>}
                      </div>
                    </div>

                    {/* Due date footer */}
                    {task.dueDate && (
                      <div className="mt-4 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-slate-400" />
                          Hạn chót: {formatDateVN(task.dueDate)}
                        </span>
                        <span className="font-mono">Tạo lúc: {formatDateVN(task.createdAt.split('T')[0])}</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Create New Task Modal */}
      {showNewTaskModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full max-h-[calc(100dvh-1.5rem)] sm:max-h-[calc(100dvh-2rem)] p-4 sm:p-6 overflow-y-auto min-h-0 my-auto">
            <h3 className="text-base font-bold text-slate-900 mb-1">
              Giao Nhiệm Vụ Mới Cho {selectedIdol?.stageName}
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Điền nội dung task, phân loại công việc và mốc thời gian hoàn thành
            </p>

            <form onSubmit={handleCreateTask} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Tiêu đề nhiệm vụ <span className="text-rose-600">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="VD: Thu âm demo ca khúc mới, Tập vũ đạo break dance..."
                  value={newTaskForm.title}
                  onChange={(e) => setNewTaskForm({ ...newTaskForm, title: e.target.value })}
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Phân loại nhiệm vụ
                </label>
                <select
                  value={newTaskForm.category}
                  onChange={(e) => setNewTaskForm({ ...newTaskForm, category: e.target.value as TaskCategory })}
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-rose-500"
                >
                  {availableTaskCategories.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              {(selectedIdol?.activities?.length || 0) > 0 && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Hoạt động KPI đóng góp
                  </label>
                  <select
                    value={newTaskForm.activityCode}
                    onChange={(e) => setNewTaskForm({ ...newTaskForm, activityCode: e.target.value })}
                    className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-rose-500"
                  >
                    <option value="">Không gắn hoạt động</option>
                    {availableActivities.map((activity) => (
                      <option key={activity.code} value={activity.code}>
                        {activity.name}{activity.isPrimary ? ' (Chính)' : ''}
                      </option>
                    ))}
                  </select>
                  <p className="mt-1 text-[11px] text-slate-400">
                    Dùng để phân bổ thời gian và kết quả vào đúng hoạt động của Idol.
                  </p>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Hạn hoàn thành (Due date)
                </label>
                <DateInput
                  value={newTaskForm.dueDate}
                  onChange={(dueDate) => setNewTaskForm({ ...newTaskForm, dueDate })}
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-rose-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Mô tả chi tiết yêu cầu
                </label>
                <textarea
                  rows={3}
                  placeholder="Yêu cầu cụ thể, giáo viên hướng dẫn, phòng tập..."
                  value={newTaskForm.description}
                  onChange={(e) => setNewTaskForm({ ...newTaskForm, description: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-rose-500"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowNewTaskModal(false)}
                  className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-500 rounded-lg shadow-sm transition-colors cursor-pointer"
                >
                  Tạo Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
