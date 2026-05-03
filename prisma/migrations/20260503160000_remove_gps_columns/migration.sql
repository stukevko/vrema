-- Standort- und Geofence-Felder entfernen (Privacy by Design)
ALTER TABLE "WorkLog" DROP COLUMN IF EXISTS "latitude";
ALTER TABLE "WorkLog" DROP COLUMN IF EXISTS "longitude";
ALTER TABLE "WorkLog" DROP COLUMN IF EXISTS "isOutOfRange";
ALTER TABLE "WorkLog" DROP COLUMN IF EXISTS "distanceMeters";

ALTER TABLE "Company" DROP COLUMN IF EXISTS "geoRadiusMeters";
ALTER TABLE "Company" DROP COLUMN IF EXISTS "geoLatitude";
ALTER TABLE "Company" DROP COLUMN IF EXISTS "geoLongitude";
