export interface WorkAssignmentPenaltyDisplayInput {
  mandatory: boolean;
  assignmentStatus: string;
  penaltyType: string;
  responseStatus: string;
  violationStatus?: string;
  waiverRequestStatus?: string;
  waiverDecision?: string;
  penaltyAmount?: number;
  penaltyRate?: number;
  possiblePenaltyAmount: number;
}

export type WorkAssignmentPenaltyDisplay = {
  kind: 'confirmed' | 'possible' | 'review' | 'waived' | 'accepted' | 'pending' | 'missing';
  text: string;
};

export function shouldShowAssignmentPenaltyRule(
  canManage: boolean,
  responseStatus: string,
  assignmentStatus: string
): boolean {
  if (assignmentStatus === 'cancelled') return false;
  return canManage || responseStatus !== 'completed';
}

const formatAmount = (amount: number): string => `${Math.round(amount).toLocaleString('vi-VN')} đ`;

export function getWorkAssignmentPenaltyDisplay(
  input: WorkAssignmentPenaltyDisplayInput
): WorkAssignmentPenaltyDisplay | null {
  if (input.violationStatus === 'confirmed') {
    if ((input.penaltyAmount || 0) <= 0) {
      return { kind: 'confirmed', text: 'Vi phạm đã xác nhận · không phạt tiền' };
    }
    const reducedRate = input.waiverDecision === 'reduced_penalty' && input.penaltyRate != null
      ? ` · mức áp dụng ${input.penaltyRate}%`
      : '';
    return { kind: 'confirmed', text: `Đã phạt ${formatAmount(input.penaltyAmount || 0)}${reducedRate}` };
  }
  if (input.responseStatus === 'completed' || input.assignmentStatus === 'cancelled') return null;

  if (input.waiverRequestStatus === 'pending') {
    return { kind: 'pending', text: 'Đang chờ xử lý giải trình' };
  }
  if (input.violationStatus === 'under_review') {
    return { kind: 'review', text: 'Đang xem xét vi phạm' };
  }
  if (input.violationStatus === 'waived' || input.waiverDecision === 'no_penalty') {
    return { kind: 'waived', text: 'Đã miễn phạt' };
  }
  if (input.waiverDecision === 'penalty' && (input.penaltyAmount || 0) > 0) {
    return { kind: 'confirmed', text: `Đã phạt ${formatAmount(input.penaltyAmount || 0)}` };
  }
  if (input.waiverDecision === 'accept') {
    return { kind: 'accepted', text: 'Đã xác nhận tham gia' };
  }
  if (!input.mandatory || input.penaltyType === 'none') return null;
  if (input.possiblePenaltyAmount > 0) {
    return { kind: 'possible', text: `Có thể áp dụng ${formatAmount(input.possiblePenaltyAmount)} nếu vi phạm` };
  }
  if (input.penaltyType === 'percentage') {
    return { kind: 'missing', text: 'Chưa đủ dữ liệu lương để tính mức phạt' };
  }
  return null;
}
