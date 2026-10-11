-- AlterTable (Fase 3b da auditoria: política de estoque por empresa)
ALTER TABLE `companies` ADD COLUMN `allow_negative_stock` BOOLEAN NOT NULL DEFAULT false;

-- Revert: ALTER TABLE `companies` DROP COLUMN `allow_negative_stock`;
