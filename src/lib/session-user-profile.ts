import { cache } from "react";
import { db } from "@/lib/db";

/** Pro Request dedupliziert — für Session-Aufbau ohne mehrfache DB-Hits in einer RSC-Tree. */
export const getCachedUserProfile = cache(async (userId: string) => {
  return db.user.findUnique({
    where: { id: userId },
    select: { name: true, email: true, image: true },
  });
});
