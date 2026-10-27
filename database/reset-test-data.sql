/*
  Réinitialisation des données de gestion ETUSA NEXUS.
  AdminSYS est volontairement conservée pour préserver l'accès à l'application.
  Exécuter ce script dans SQL Server Management Studio sur ETUSA_Cartographie.
*/
USE [ETUSA_Cartographie];
GO
SET XACT_ABORT ON;

BEGIN TRY
    BEGIN TRANSACTION;

    -- Supprimer d'abord les lignes dépendantes, puis leurs tables parentes.
    DELETE FROM [dbo].[REF_PROFIL];
    DELETE FROM [dbo].[UTILISATEUR];
    DELETE FROM [dbo].[REFERENCE];
    DELETE FROM [dbo].[PROFIL];
    DELETE FROM [dbo].[Direction];

    -- Repartir à 1 pour les prochaines insertions, uniquement si la table
    -- possède réellement une colonne IDENTITY.
    IF EXISTS (SELECT 1 FROM sys.identity_columns WHERE object_id = OBJECT_ID(N'dbo.REF_PROFIL'))
        DBCC CHECKIDENT ('dbo.REF_PROFIL', RESEED, 0);
    IF EXISTS (SELECT 1 FROM sys.identity_columns WHERE object_id = OBJECT_ID(N'dbo.UTILISATEUR'))
        DBCC CHECKIDENT ('dbo.UTILISATEUR', RESEED, 0);
    IF EXISTS (SELECT 1 FROM sys.identity_columns WHERE object_id = OBJECT_ID(N'dbo.REFERENCE'))
        DBCC CHECKIDENT ('dbo.REFERENCE', RESEED, 0);
    IF EXISTS (SELECT 1 FROM sys.identity_columns WHERE object_id = OBJECT_ID(N'dbo.PROFIL'))
        DBCC CHECKIDENT ('dbo.PROFIL', RESEED, 0);
    IF EXISTS (SELECT 1 FROM sys.identity_columns WHERE object_id = OBJECT_ID(N'dbo.Direction'))
        DBCC CHECKIDENT ('dbo.Direction', RESEED, 0);

    COMMIT TRANSACTION;

    SELECT 'Direction' AS [Table], COUNT(*) AS [Lignes restantes] FROM [dbo].[Direction]
    UNION ALL SELECT 'PROFIL', COUNT(*) FROM [dbo].[PROFIL]
    UNION ALL SELECT 'UTILISATEUR', COUNT(*) FROM [dbo].[UTILISATEUR]
    UNION ALL SELECT 'REFERENCE', COUNT(*) FROM [dbo].[REFERENCE]
    UNION ALL SELECT 'REF_PROFIL', COUNT(*) FROM [dbo].[REF_PROFIL]
    UNION ALL SELECT 'AdminSYS (conservée)', COUNT(*) FROM [dbo].[AdminSYS];
END TRY
BEGIN CATCH
    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
    THROW;
END CATCH;
GO
