"use server";

import {
  toggleShiftTradeOffer,
  requestShiftTradeTakeover,
  decideShiftTradeApproval,
} from "@/lib/actions/team";

export async function planningToggleTradeOfferFormAction(formData: FormData) {
  const shiftId = String(formData.get("shiftId") ?? "");
  const makeOpen = String(formData.get("makeOpen") ?? "") === "true";
  if (!shiftId) return;
  await toggleShiftTradeOffer(shiftId, makeOpen);
}

export async function planningRequestTakeoverFormAction(formData: FormData) {
  const shiftId = String(formData.get("shiftId") ?? "");
  if (!shiftId) return;
  await requestShiftTradeTakeover(shiftId);
}

export async function planningDecideTradeFormAction(formData: FormData) {
  const shiftId = String(formData.get("shiftId") ?? "");
  const approve = String(formData.get("approve") ?? "") === "true";
  if (!shiftId) return;
  await decideShiftTradeApproval(shiftId, approve);
}
