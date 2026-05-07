-- Ensure employee numbers are unique per company (NULL values remain allowed).
CREATE UNIQUE INDEX "User_companyId_employeeNumber_key" ON "User"("companyId", "employeeNumber");
