import React, { useState } from 'react';
import { X, Check, RotateCcw, Sliders, Type } from 'lucide-react';
import { ColumnHeadersConfig } from '../types/index.ts';
import { notify } from '../utils/uiFeedback.ts';

interface ColumnHeadersModalProps {
  isOpen: boolean;
  onClose: () => void;
  headers: ColumnHeadersConfig;
  onSave: (updated: ColumnHeadersConfig) => Promise<void>;
}

const DEFAULT_HEADERS: ColumnHeadersConfig = {
  stt: 'STT',
  stageName: 'Nghệ Danh & Ảnh',
  realName: 'Tên Thật',
  age: 'Tuổi',
  dob: 'Ngày Sinh',
  role: 'Nghề Nghiệp',
  height: 'Chiều Cao',
  weight: 'Cân Nặng',
  hometown: 'Quê Quán',
  currentLiving: 'Nơi Sống',
  department: 'Thuộc Đơn Vị',
  status: 'Trạng Thái',
  actions: 'Thao Tác'
};

export const ColumnHeadersModal: React.FC<ColumnHeadersModalProps> = ({
  isOpen,
  onClose,
  headers,
  onSave
}) => {
  const [formData, setFormData] = useState<ColumnHeadersConfig>({ ...headers });
  const [saving, setSaving] = useState(false);

  if (!isOpen) return null;

  const handleChange = (key: keyof ColumnHeadersConfig, value: string) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const handleResetToDefault = () => {
    setFormData({ ...DEFAULT_HEADERS });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      await onSave(formData);
      onClose();
    } catch (err) {
      notify('Không thể lưu cấu hình tiêu đề cột', 'error');
    } finally {
      setSaving(false);
    }
  };

  const fields: { key: keyof ColumnHeadersConfig; label: string; placeholder: string }[] = [
    { key: 'department', label: 'Cột "Thuộc đơn vị"', placeholder: 'VD: Ban Nhạc, Đoàn Nghệ Thuật, Team...' },
    { key: 'age', label: 'Cột "Tuổi"', placeholder: 'VD: Số Tuổi, Tuổi Đời...' },
    { key: 'stageName', label: 'Cột "Nghệ danh & Ảnh"', placeholder: 'VD: Nghệ Danh, Stage Name...' },
    { key: 'realName', label: 'Cột "Tên thật"', placeholder: 'VD: Họ Và Tên Thật, Khai Sinh...' },
    { key: 'role', label: 'Cột "Nghề nghiệp"', placeholder: 'VD: Chức Vụ, Vai Trò, Vị Trí...' },
    { key: 'dob', label: 'Cột "Ngày sinh"', placeholder: 'VD: Ngày Sinh, Năm Sinh...' },
    { key: 'height', label: 'Cột "Chiều cao"', placeholder: 'VD: Chiều Cao (cm)...' },
    { key: 'weight', label: 'Cột "Cân nặng"', placeholder: 'VD: Cân Nặng (kg)...' },
    { key: 'hometown', label: 'Cột "Quê quán"', placeholder: 'VD: Nguyên Quán, Quê Hương...' },
    { key: 'currentLiving', label: 'Cột "Nơi sống"', placeholder: 'VD: Nơi Ở Hiện Tại, Ký Túc Xá...' },
    { key: 'status', label: 'Cột "Trạng thái"', placeholder: 'VD: Trạng Thái Hoạt Động...' },
    { key: 'stt', label: 'Cột "STT"', placeholder: 'VD: STT, Số Thứ Tự...' },
    { key: 'actions', label: 'Cột "Thao tác"', placeholder: 'VD: Thao Tác, Hành Động...' },
  ];

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
              <Type className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Tùy Chỉnh Tiêu Đề Cột Danh Sách
              </h3>
              <p className="text-xs text-slate-500">
                Thay đổi tên hiển thị của các cột trong bảng (ví dụ: đổi "Thuộc đơn vị" thành "Ban nhạc", "Team"...)
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

        {/* Content Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {fields.map(({ key, label, placeholder }) => (
              <div key={key}>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {label}
                </label>
                <input
                  type="text"
                  value={formData[key] || ''}
                  placeholder={placeholder}
                  onChange={(e) => handleChange(key, e.target.value)}
                  className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:bg-white focus:border-rose-500 font-medium text-slate-800"
                />
              </div>
            ))}
          </div>
        </form>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-slate-100 flex items-center justify-between bg-slate-50/80">
          <button
            type="button"
            onClick={handleResetToDefault}
            className="inline-flex items-center gap-1.5 text-xs text-slate-600 hover:text-rose-600 font-medium"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Khôi phục mặc định</span>
          </button>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
            >
              Hủy
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={saving}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-500 rounded-lg shadow-sm transition-colors cursor-pointer"
            >
              <Check className="w-3.5 h-3.5" />
              <span>{saving ? 'Đang lưu...' : 'Lưu Thay Đổi'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
