import { WorkAssignment, WorkAssignmentAssignee } from '../types/index.ts';

const isResolvedAssignee = (assignee: WorkAssignmentAssignee) => (
  assignee.responseStatus === 'completed'
  || assignee.responseStatus === 'declined'
);

export const getWorkAssignmentStatus = (assignment: WorkAssignment): 'published' | 'in_progress' | 'completed' | 'cancelled' => {
  if (assignment.status === 'cancelled') return 'cancelled';
  if (assignment.assignees.length > 0 && assignment.assignees.every(isResolvedAssignee)) return 'completed';
  if (assignment.assignees.some((assignee) => assignee.responseStatus === 'in_progress' || assignee.responseStatus === 'accepted')) return 'in_progress';
  return 'published';
};

export const isWorkAssignmentExpired = (endAt: string | null | undefined, now: Date): boolean => {
  if (!endAt) return false;
  const endTime = new Date(endAt).getTime();
  return Number.isFinite(endTime) && now.getTime() >= endTime;
};

export const getPersonalWorkAssignmentStatus = (assignment: WorkAssignment, personnelId?: string) => {
  if (assignment.status === 'cancelled') return 'cancelled' as const;
  const assignee = assignment.assignees.find((item) => item.personnelId === personnelId);
  if (assignee?.responseStatus === 'declined') return 'completed' as const;
  return assignee?.responseStatus || 'pending';
};
