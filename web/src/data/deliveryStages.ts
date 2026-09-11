export type DeliveryStage = 'preparing' | 'packed' | 'picked_up' | 'received'

export interface DeliveryStageInfo {
  key: DeliveryStage
  staffLabel: string
  staffActionLabel: string
  customerLabel: string
}

// Single source of truth for the manual delivery tracker's stage order and
// copy — shared by the admin Delivery tab (staffLabel/staffActionLabel) and
// the customer-facing order view (customerLabel), so the two never drift.
export const deliveryStages: DeliveryStageInfo[] = [
  { key: 'preparing', staffLabel: 'Preparing', staffActionLabel: 'Mark Packed & Ready', customerLabel: 'Order Received' },
  { key: 'packed', staffLabel: 'Packed & Ready', staffActionLabel: 'Mark Picked Up', customerLabel: 'Packed & Ready' },
  { key: 'picked_up', staffLabel: 'Picked Up From Store', staffActionLabel: 'Mark Received', customerLabel: 'Out For Delivery' },
  { key: 'received', staffLabel: 'Received', staffActionLabel: '', customerLabel: 'Delivered' },
]

export function deliveryStageIndex(stage: DeliveryStage): number {
  return deliveryStages.findIndex((s) => s.key === stage)
}

export function nextDeliveryStage(stage: DeliveryStage): DeliveryStage | null {
  const next = deliveryStages[deliveryStageIndex(stage) + 1]
  return next ? next.key : null
}
