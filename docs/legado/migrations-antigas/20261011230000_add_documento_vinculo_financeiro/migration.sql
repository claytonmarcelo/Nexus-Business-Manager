-- Fase 3e da auditoria: a venda confirmada e a compra recebida passam a ter
-- reflexo no financeiro. Três peças, todas reversíveis:
--   1. parcelamento nos documentos (quantas vezes o valor se divide);
--   2. a política por empresa de gerar (ou não) os lançamentos;
--   3. a procedência do lançamento — de qual venda ou compra ele nasceu.

-- AlterTable
ALTER TABLE `sales` ADD COLUMN `installments` INTEGER NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE `purchases` ADD COLUMN `installments` INTEGER NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE `companies` ADD COLUMN `auto_finance_sales` BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE `companies` ADD COLUMN `auto_finance_purchases` BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE `finance_entries` ADD COLUMN `sale_id` VARCHAR(36) NULL,
    ADD COLUMN `purchase_id` VARCHAR(36) NULL;

-- CreateIndex
CREATE INDEX `finance_entries_sale_id_idx` ON `finance_entries`(`sale_id`);

-- CreateIndex
CREATE INDEX `finance_entries_purchase_id_idx` ON `finance_entries`(`purchase_id`);

-- AddForeignKey
ALTER TABLE `finance_entries` ADD CONSTRAINT `finance_entries_sale_id_fkey` FOREIGN KEY (`sale_id`) REFERENCES `sales`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `finance_entries` ADD CONSTRAINT `finance_entries_purchase_id_fkey` FOREIGN KEY (`purchase_id`) REFERENCES `purchases`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- Revert:
--   ALTER TABLE `finance_entries` DROP FOREIGN KEY `finance_entries_sale_id_fkey`;
--   ALTER TABLE `finance_entries` DROP FOREIGN KEY `finance_entries_purchase_id_fkey`;
--   DROP INDEX `finance_entries_sale_id_idx` ON `finance_entries`;
--   DROP INDEX `finance_entries_purchase_id_idx` ON `finance_entries`;
--   ALTER TABLE `finance_entries` DROP COLUMN `sale_id`, DROP COLUMN `purchase_id`;
--   ALTER TABLE `companies` DROP COLUMN `auto_finance_sales`, DROP COLUMN `auto_finance_purchases`;
--   ALTER TABLE `purchases` DROP COLUMN `installments`;
--   ALTER TABLE `sales` DROP COLUMN `installments`;
