import { IdolCategoryType, TaskCategory } from '../types/index.ts';

export const TASK_CATEGORIES_BY_IDOL_CATEGORY: Record<IdolCategoryType, TaskCategory[]> = {
  gaming_gear: ['Luyện tập', 'Livestream & Gaming', 'Quay chụp & Phỏng vấn', 'Quảng bá sản phẩm'],
  performance_donate: ['Luyện tập', 'Biểu diễn', 'PK & Donate', 'Quay chụp & Phỏng vấn', 'Ghi âm & Sản xuất'],
  live_commerce: ['Luyện tập', 'Livestream & Chốt đơn', 'Quay chụp & Phỏng vấn', 'Quảng bá sản phẩm']
};

const TASK_CATEGORIES_BY_ACTIVITY_CODE: Record<string, TaskCategory[]> = {
  gaming_gear: ['Luyện tập', 'Livestream & Gaming', 'Quay chụp & Phỏng vấn', 'Quảng bá sản phẩm'],
  performance: ['Luyện tập', 'Biểu diễn', 'Quay chụp & Phỏng vấn', 'Ghi âm & Sản xuất'],
  pk_donate: ['Luyện tập', 'Biểu diễn', 'PK & Donate', 'Quay chụp & Phỏng vấn'],
  live_commerce: ['Luyện tập', 'Livestream & Chốt đơn', 'Quay chụp & Phỏng vấn', 'Quảng bá sản phẩm']
};

export const DEFAULT_TASK_CATEGORIES: TaskCategory[] = [
  'Luyện tập',
  'Biểu diễn',
  'Quay chụp & Phỏng vấn',
  'Ghi âm & Sản xuất',
  'Học tập & Vũ đạo'
];

export function getTaskCategoriesForIdolCategory(idolCategory?: IdolCategoryType): TaskCategory[] {
  return idolCategory ? TASK_CATEGORIES_BY_IDOL_CATEGORY[idolCategory] || DEFAULT_TASK_CATEGORIES : DEFAULT_TASK_CATEGORIES;
}

export function isTaskCategoryAllowedForActivity(category: TaskCategory, activityCode?: string): boolean {
  if (!activityCode) return true;
  const categories = TASK_CATEGORIES_BY_ACTIVITY_CODE[activityCode];
  return !categories || categories.includes(category);
}

export function isTaskCategoryAllowedForIdol(idolCategory: IdolCategoryType | undefined, category: TaskCategory): boolean {
  return getTaskCategoriesForIdolCategory(idolCategory).includes(category);
}

