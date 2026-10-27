USE [ETUSA_Cartographie];
GO
-- Required for PHP password_hash(): its output is longer than 50 characters.
ALTER TABLE dbo.AdminSYS ALTER COLUMN [Password] NVARCHAR(255) NOT NULL;
GO
-- Optional: enforce unique login values after checking existing duplicates.
-- CREATE UNIQUE INDEX UX_AdminSYS_Login ON dbo.AdminSYS([Login]);
