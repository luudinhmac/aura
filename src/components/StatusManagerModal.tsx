import React, { useState } from 'react';
import { X, Plus, Edit2, Trash2, Tag, Check, AlertCircle } from 'lucide-react';
import { Idol } from '../types/index.ts';
import { confirmDialog } from '../utils/uiFeedback.ts';

interface StatusManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  statuses: string[];
  idols: Idol[];
  onAddStatus: (name: string) => Promise<void>;
  onUpdateStatus: (oldName: string, newName: string) => Promise<void>;
  onDeleteStatus: (name: string) => Promise<void>;
}

export const StatusManagerModal: React.FC<StatusManagerModalProps> = ({
  isOpen,
  onClose,
  statuses,
  idols,
  onAddStatus,
  onUpdateStatus,
  onDeleteStatus
}) => {
  const [newStatusName, setNewStatusName] = useState('');
  const [editingStatus, setEditingStatus] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStatusName.trim()) return;
    try {
      setLoading(true);
      setError(null);
      await onAddStatus(newStatusName.trim());
      setNewStatusName('');
    } catch (err: any) {
      setError(err.message || 'Lỗi khi thêm trạng thái');
    } finally {
      setLoading(false);
    }
  };

  const handleStartEdit = (status: string) => {
    setEditingStatus(status);
    setEditValue(status);
  };

  const handleSaveEdit = async (oldName: string) => {
    if (!editValue.trim() || editValue.trim() === oldName) {
      setEditingStatus(null);
      return;
    }
    try {
      setLoading(true);
      setError(null);
      await onUpdateStatus(oldName, editValue.trim());
      setEditingStatus(null);
    } catch (err: any) {
      setError(err.message || 'Lỗi khi đổi tên trạng thái');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (status: string) => {
    if (!await confirmDialog(`Bạn có chắc muốn xóa trạng thái "${status}"?`, 'Xác nhận xóa trạng thái')) return;
    try {
      setLoading(true);
      await onDeleteStatus(status);
    } catch (err: any) {
      setError(err.message || 'Lỗi khi xóa trạng thái');
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
            <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
              <Tag className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Quản Lý Trạng Thái Nhân Sự
              </h3>
              <p className="text-xs text-slate-500">
                Tùy chỉnh các trạng thái hoạt động của idol trong hệ thống (thêm mới, đổi tên hoặc xóa)
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
              placeholder="Nhập trạng thái mới (VD: Đang debut, Đào tạo nâng cao, Dưỡng thương...)"
              value={newStatusName}
              onChange={(e) => setNewStatusName(e.target.value)}
              className="flex-1 px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:bg-white focus:border-rose-500"
            />
            <button
              type="submit"
              disabled={loading || !newStatusName.trim()}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-500 rounded-lg transition-colors disabled:opacity-50 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Thêm</span>
            </button>
          </form>

          {/* List of statuses */}
          <div className="space-y-2 pt-2">
            <div className="text-xs font-semibold text-slate-700 flex items-center justify-between">
              <span>Các trạng thái khả dụng ({statuses.length}):</span>
              <span className="text-[11px] text-slate-400">Số lượng nhân sự</span>
            </div>

            <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
              {statuses.map((status) => {
                const count = idols.filter((i) => i.status === status).length;
                const isEditing = editingStatus === status;

                return (
                  <div
                    key={status}
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
                            if (e.key === 'Enter') handleSaveEdit(status);
                            if (e.key === 'Escape') setEditingStatus(null);
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => handleSaveEdit(status)}
                          className="p-1 text-emerald-600 hover:bg-emerald-50 rounded"
                          title="Lưu"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingStatus(null)}
                          className="p-1 text-slate-400 hover:bg-slate-200 rounded"
                          title="Hủy"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 truncate flex-1">
                        <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
                        <span className="font-semibold text-slate-800 truncate">{status}</span>
                      </div>
                    )}

                    {!isEditing && (
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-medium bg-white border border-slate-200 text-slate-600">
                          {count} idol
                        </span>
                        <button
                          type="button"
                          onClick={() => handleStartEdit(status)}
                          className="p-1 text-slate-400 hover:text-sky-600 hover:bg-white rounded transition-colors"
                          title="Đổi tên trạng thái"
                        >
                          <Edit2 className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(status)}
                          className="p-1 text-slate-400 hover:text-rose-600 hover:bg-white rounded transition-colors"
                          title="Xóa trạng thái"
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
