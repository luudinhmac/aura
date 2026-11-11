export interface RevenuePersonnelClassification {
  personnelType?: string | null;
  cooperationType?: string | null;
}

export function isExternalServicePersonnel(
  personnel: RevenuePersonnelClassification | null | undefined
): boolean {
  return personnel?.personnelType === 'Dịch vụ ngoài' || personnel?.cooperationType === 'service_guest';
}
