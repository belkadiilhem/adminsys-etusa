USE [ETUSA_Cartographie];
GO
-- Facultatif. Vérifier auparavant les éventuels doublons.
CREATE UNIQUE INDEX UX_Direction_Code ON dbo.Direction(Code);
CREATE UNIQUE INDEX UX_PROFIL_Code ON dbo.PROFIL(CODE);
CREATE UNIQUE INDEX UX_REF_PROFIL_Profile_Reference ON dbo.REF_PROFIL(CODE_PROFIL,CODE_REFERENCE);
GO
