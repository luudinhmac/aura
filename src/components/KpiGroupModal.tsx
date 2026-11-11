import React, { useState, useEffect } from 'react';
import { Idol, KpiGroup } from '../types/index.ts';
import { X, Users, Sparkles, Building2, Search, Check, ShieldCheck, AlertCircle } from 'lucide-react';

interface KpiGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  groupToEdit: KpiGroup | null;
  idols: Idol[]; // Toàn bộ 13 nhân sự (Idol + Staff)
  onSave: (groupData: Partial<KpiGroup>) => Promise<void>;
}

export const KpiGroupModal: React.FC<KpiGroupModalProps> = ({
  isOpen,
  onClose,
  groupToEdit,
  idols,
  onSave
}) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<'idol' | 'corporate' | 'mixed'>('mixed');
  const [leaderId, setLeaderId] = useState<string>('');
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [searchMember, setSearchMember] = useState('');
  const [filterBlock, setFilterBlock] = useState<'all' | 'idol' | 'corporate'>('all');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (groupToEdit) {
      setName(groupToEdit.name || '');
      setDescription(groupToEdit.description || '');
      setCategory(groupToEdit.category || 'mixed');
      setLeaderId(groupToEdit.leaderId || '');
      setSelectedMemberIds(groupToEdit.memberIds || []);
    } else {
      setName('');
      setDescription('');
      setCategory('mixed');
      setLeaderId('');
      setSelectedMemberIds([]);
    }
    setSearchMember('');
    setError(null);
  }, [groupToEdit, isOpen]);

  if (!isOpen) return null;

  const toggleMember = (id: string) => {
    setSelectedMemberIds(prev => {
      if (prev.includes(id)) {
        const next = prev.filter(m => m !== id);
        if (leaderId === id) setLeaderId('');
        return next;
      } else {
        return [...prev, id];
      }
    });
  };

  const handleSelectAllIdols = () => {
    const idolIds = idols.filter(i => i.isIdol !== false).map(i => i.id);
    setSelectedMemberIds(prev => Array.from(new Set([...prev, ...idolIds])));
  };

  const handleSelectAllStaff = () => {
    const staffIds = idols.filter(i => i.isIdol === false).map(i => i.id);
    setSelectedMemberIds(prev => Array.from(new Set([...prev, ...staffIds])));
  };

  const handleClearAll = () => {
    setSelectedMemberIds([]);
    setLeaderId('');
  };

  const filteredPersonnel = idols.filter(person => {
    // KPI chỉ áp dụng cho nhân sự loại "Công ty"
    const isCompany = (person.personnelType || 'Công ty') === 'Công ty';
    if (!isCompany) return false;

    const matchesSearch =
      person.stageName.toLowerCase().includes(searchMember.toLowerCase()) ||
      person.realName.toLowerCase().includes(searchMember.toLowerCase()) ||
      person.department.toLowerCase().includes(searchMember.toLowerCase()) ||
      person.role.toLowerCase().includes(searchMember.toLowerCase());

    const isIdol = person.isIdol !== false;
    const matchesBlock =
      filterBlock === 'all' ||
      (filterBlock === 'idol' && isIdol) ||
      (filterBlock === 'corporate' && !isIdol);

    return matchesSearch && matchesBlock;
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Vui lòng nhập tên nhóm chỉ định');
      return;
    }
    if (selectedMemberIds.length === 0) {
      setError('Vui lòng chọn ít nhất 1 nhân sự vào nhóm');
      return;
    }

    try {
      setSaving(true);
      setError(null);
      await onSave({
        name: name.trim(),
        description: description.trim(),
        category,
        leaderId: leaderId || undefined,
        memberIds: selectedMemberIds,
        type: groupToEdit?.type || 'custom'
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Không thể lưu thông tin nhóm');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-2xl w-full max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-indigo-50/80 via-white to-rose-50/40">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-xs">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                {groupToEdit ? 'Chỉnh Sửa Nhóm Nhân Viên Chỉ Định' : 'Tạo Nhóm Nhân Viên Chỉ Định Mới'}
              </h3>
              <p className="text-xs text-slate-500">
                Chỉ định nhóm thành viên phục vụ chiến dịch hoặc gán bộ KPI chung
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Tên nhóm & Phân loại */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Tên Nhóm Nhân Viên Chỉ Định <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                placeholder="VD: Đội Chiến Dịch Mega Sale 11.11, Tổ Review Công Nghệ..."
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-semibold text-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Phân Loại Nhóm
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as any)}
                className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-medium text-slate-800"
              >
                <option value="mixed">🌐 Nhóm Hỗn Hợp (Idol + Staff)</option>
                <option value="idol">⭐ Khối Idol (Nghệ sĩ)</option>
                <option value="corporate">🏢 Khối Vận Hành (Hậu cần)</option>
              </select>
            </div>
          </div>

          {/* Mô tả nhóm */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Mục Tiêu & Diễn Giải Hoạt Động Của Nhóm
            </label>
            <textarea
              rows={2}
              placeholder="VD: Tập trung đẩy mạnh doanh số chốt đơn các phiên livestream cao điểm, kết hợp hỗ trợ kỹ thuật và chuẩn bị giỏ hàng..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-700"
            />
          </div>

          {/* Chọn Trưởng nhóm (Leader) */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Chỉ Định Trưởng Nhóm (Leader) <span className="text-slate-400 font-normal">(Tùy chọn)</span>
            </label>
            <select
              value={leaderId}
              onChange={(e) => setLeaderId(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-medium text-slate-800"
            >
              <option value="">-- Chưa chỉ định trưởng nhóm --</option>
              {idols
                .filter(i => selectedMemberIds.includes(i.id))
                .map(i => (
                  <option key={i.id} value={i.id}>
                    ⭐ {i.stageName} ({i.realName}) - {i.role}
                  </option>
                ))}
            </select>
            <p className="text-[10px] text-slate-400 mt-1">
              * Danh sách trưởng nhóm được lọc theo các thành viên bạn đã tick chọn bên dưới
            </p>
          </div>

          {/* Danh Sách Thành Viên Chỉ Định */}
          <div className="space-y-2 pt-2 border-t border-slate-100">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <label className="block text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <span>Chọn Thành Viên Chỉ Định Vào Nhóm</span>
                <span className="px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 text-[10px] font-bold">
                  {selectedMemberIds.length} nhân sự đã chọn
                </span>
              </label>

              {/* Nút chọn nhanh */}
              <div className="flex items-center gap-1.5 text-[10px]">
                <button
                  type="button"
                  onClick={handleSelectAllIdols}
                  className="px-2 py-1 rounded bg-rose-50 text-rose-700 hover:bg-rose-100 font-semibold transition-colors cursor-pointer"
                >
                  + Tất cả Idol (6)
                </button>
                <button
                  type="button"
                  onClick={handleSelectAllStaff}
                  className="px-2 py-1 rounded bg-indigo-50 text-indigo-700 hover:bg-indigo-100 font-semibold transition-colors cursor-pointer"
                >
                  + Tất cả Staff (7)
                </button>
                <button
                  type="button"
                  onClick={handleClearAll}
                  className="px-2 py-1 rounded bg-slate-100 text-slate-600 hover:bg-slate-200 font-medium transition-colors cursor-pointer"
                >
                  Bỏ chọn
                </button>
              </div>
            </div>

            {/* Bộ lọc tìm kiếm nhân sự */}
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Tìm theo tên, nghệ danh, nghề nghiệp..."
                  value={searchMember}
                  onChange={(e) => setSearchMember(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:bg-white focus:border-indigo-400"
                />
              </div>

              <div className="flex items-center p-0.5 bg-slate-100 border border-slate-200 rounded-lg text-xs">
                <button
                  type="button"
                  onClick={() => setFilterBlock('all')}
                  className={`px-2 py-1 rounded text-[10px] font-semibold cursor-pointer ${
                    filterBlock === 'all' ? 'bg-white text-slate-900 shadow-2xs font-bold' : 'text-slate-600'
                  }`}
                >
                  Tất cả
                </button>
                <button
                  type="button"
                  onClick={() => setFilterBlock('idol')}
                  className={`px-2 py-1 rounded text-[10px] font-semibold cursor-pointer ${
                    filterBlock === 'idol' ? 'bg-rose-600 text-white font-bold' : 'text-slate-600'
                  }`}
                >
                  Idol
                </button>
                <button
                  type="button"
                  onClick={() => setFilterBlock('corporate')}
                  className={`px-2 py-1 rounded text-[10px] font-semibold cursor-pointer ${
                    filterBlock === 'corporate' ? 'bg-indigo-600 text-white font-bold' : 'text-slate-600'
                  }`}
                >
                  Vận hành
                </button>
              </div>
            </div>

            {/* Danh sách thẻ nhân sự có Checkbox */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-56 overflow-y-auto pr-1">
              {filteredPersonnel.map((person) => {
                const isSelected = selectedMemberIds.includes(person.id);
                const isLeader = leaderId === person.id;
                const isIdol = person.isIdol !== false;

                return (
                  <div
                    key={person.id}
                    onClick={() => toggleMember(person.id)}
                    className={`flex items-center gap-2.5 p-2 rounded-xl border transition-all cursor-pointer select-none ${
                      isSelected
                        ? isIdol
                          ? 'bg-rose-50/70 border-rose-300 ring-1 ring-rose-400/30'
                          : 'bg-indigo-50/70 border-indigo-300 ring-1 ring-indigo-400/30'
                        : 'bg-white border-slate-200/90 hover:bg-slate-50'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => {}} // Handle by parent div click
                      className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 cursor-pointer pointer-events-none"
                    />

                    <div className="relative w-8 h-8 rounded-lg overflow-hidden border border-slate-200 bg-slate-100 shrink-0">
                      <img
                        src={person.avatarUrl}
                        alt={person.stageName}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                      />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-slate-900 truncate">
                          {person.stageName}
                        </span>
                        {isLeader && (
                          <span className="px-1 py-0.2 rounded text-[9px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                            Leader
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1 text-[10px] text-slate-500 truncate">
                        <span>{person.realName}</span>
                        <span>·</span>
                        <span className="truncate">{person.department}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Modal Footer */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg transition-colors shadow-xs cursor-pointer disabled:opacity-50"
            >
              {saving ? 'Đang lưu...' : groupToEdit ? 'Cập Nhật Nhóm' : 'Tạo Nhóm Chỉ Định'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
