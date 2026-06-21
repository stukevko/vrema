"use server";

import {
  cancelShiftTradePeerRequest,
  finalizeShiftTradeApproval,
  requestShiftTradeToColleague,
  respondShiftTradePeerRequest,
} from "@/lib/actions/shift-trade";

export async function planningRequestTradeToColleagueFormAction(formData: FormData) {
  const shiftId = String(formData.get("shiftId") ?? "");
  const targetUserId = String(formData.get("targetUserId") ?? "");
  const counterShiftId = String(formData.get("counterShiftId") ?? "").trim() || null;
  if (!shiftId || !targetUserId) return;
  await requestShiftTradeToColleague({ shiftId, targetUserId, counterShiftId });
}

export async function planningRespondPeerTradeFormAction(formData: FormData) {
  const shiftId = String(formData.get("shiftId") ?? "");
  const accept = String(formData.get("accept") ?? "") === "true";
  if (!shiftId) return;
  await respondShiftTradePeerRequest(shiftId, accept);
}

export async function planningCancelPeerTradeFormAction(formData: FormData) {
  const shiftId = String(formData.get("shiftId") ?? "");
  if (!shiftId) return;
  await cancelShiftTradePeerRequest(shiftId);
}

export async function planningDecideTradeFormAction(formData: FormData) {
  const shiftId = String(formData.get("shiftId") ?? "");
  const approve = String(formData.get("approve") ?? "") === "true";
  if (!shiftId) return;
  await finalizeShiftTradeApproval(shiftId, approve);
}
