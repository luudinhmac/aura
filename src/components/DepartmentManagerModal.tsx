import React, { useState } from 'react';
import { X, Plus, Edit2, Trash2, Building2, Check, AlertCircle } from 'lucide-react';
import { Idol } from '../types/index.ts';
import { confirmDialog } from '../utils/uiFeedback.ts';

interface DepartmentManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  departments: string[];
  idols: Idol[];
  onAddDepartment: (name: string) => Promise<void>;
  onUpdateDepartment: (oldName: string, newName: string) => Promise<void>;
  onDeleteDepartment: (name: string) => Promise<void>;
}

export const DepartmentManagerModal: React.FC<DepartmentManagerModalProps> = ({
  isOpen,
  onClose,
  departments,
  idols,
  onAddDepartment,
  onUpdateDepartment,
  onDeleteDepartment
}) => {
  const [newDeptName, setNewDeptName] = useState('');
  const [editingDept, setEditingDept] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDeptName.trim()) return;
    try {
      setLoading(true);
      setError(null);
      await onAddDepartment(newDeptName.trim());
      setNewDeptName('');
    } catch (err: any) {
      setError(err.message || 'Lỗi khi thêm đơn vị');
    } finally {
      setLoading(false);
    }
  };

  const handleStartEdit = (dept: string) => {
    setEditingDept(dept);
    setEditValue(dept);
  };

  const handleSaveEdit = async (oldName: string) => {
    if (!editValue.trim() || editValue.trim() === oldName) {
      setEditingDept(null);
      return;
    }
    try {
      setLoading(true);
      setError(null);
      await onUpdateDepartment(oldName, editValue.trim());
      setEditingDept(null);
    } catch (err: any) {
      setError(err.message || 'Lỗi khi đổi tên đơn vị');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (dept: string) => {
    if (!await confirmDialog(`Bạn có chắc muốn xóa đơn vị/nhóm "${dept}"?`, 'Xác nhận xóa đơn vị')) return;
    try {
      setLoading(true);
      await onDeleteDepartment(dept);
    } catch (err: any) {
      setError(err.message || 'Lỗi khi xóa đơn vị');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-sky-50 text-sky-700 flex items-center justify-center">
              <Building2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Quản Lý Danh Sách Đơn Vị / Phòng Ban
              </h3>
              <p className="text-xs text-slate-500">
                Nhập danh sách trước để khi tạo/sửa idol chỉ cần chọn từ danh sách thả xuống
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 overflow-y-auto flex-1">
          {error && (
            <div className="p-3 text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-lg flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Add form */}
          <form onSubmit={handleAdd} className="flex gap-2">
            <input
              type="text"
              placeholder="Nhập tên đơn vị mới (VD: Ban Nhạc Eclipse, Nhóm Gen 4...)"
              value={newDeptName}
              onChange={(e) => setNewDeptName(e.target.value)}
              className="flex-1 px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:bg-white focus:border-rose-500"
            />
            <button
              type="submit"
              disabled={loading || !newDeptName.trim()}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-500 rounded-lg transition-colors disabled:opacity-50 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Thêm</span>
            </button>
          </form>

          {/* List of departments */}
          <div className="space-y-2 pt-2">
            <div className="text-xs font-semibold text-slate-700 flex items-center justify-between">
              <span>Các đơn vị hiện có ({departments.length}):</span>
              <span className="text-[11px] text-slate-400">Số lượng nhân sự</span>
            </div>

            <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
              {departments.map((dept) => {
                const count = idols.filter((i) => i.department === dept).length;
                const isEditing = editingDept === dept;

                return (
                  <div
                    key={dept}
                    className="flex items-center justify-between p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs hover:bg-slate-100/70 transition-colors"
                  >
                    {isEditing ? (
                      <div className="flex items-center gap-2 flex-1 mr-2">
                        <input
                          type="text"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          className="flex-1 px-2 py-1 text-xs bg-white border border-rose-300 rounded focus:outline-none"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveEdit(dept);
                            if (e.key === 'Escape') setEditingDept(null);
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => handleSaveEdit(dept)}
                          className="p-1 text-emerald-600 hover:bg-emerald-50 rounded"
                          title="Lưu"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingDept(null)}
                          className="p-1 text-slate-400 hover:bg-slate-200 rounded"
                          title="Hủy"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 truncate flex-1">
                        <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="font-semibold text-slate-800 truncate">{dept}</span>
                      </div>
                    )}

                    {!isEditing && (
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-medium bg-white border border-slate-200 text-slate-600">
                          {count} idol
                        </span>
                        <button
                          type="button"
                          onClick={() => handleStartEdit(dept)}
                          className="p-1 text-slate-400 hover:text-sky-600 hover:bg-white rounded transition-colors"
                          title="Đổi tên đơn vị"
                        >
                          <Edit2 className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(dept)}
                          className="p-1 text-slate-400 hover:text-rose-600 hover:bg-white rounded transition-colors"
                          title="Xóa đơn vị"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-100 flex items-center justify-end bg-slate-50/80">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
