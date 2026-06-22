/** Felder für Listen/UI — ohne AU-Rohdaten (Art. 5 DSGVO Datenminimierung). */
export const VACATION_REQUEST_LIST_SELECT = {
  id: true,
  userId: true,
  absenceType: true,
  startDate: true,
  endDate: true,
  days: true,
  reason: true,
  status: true,
  decisionNote: true,
  sickAttachmentMime: true,
  createdAt: true,
} as const;
