-- T6 (F7) do prompt de continuação: LGPD, item 1 — o registro do aceite.
--
-- A pessoa que cria uma conta precisa aceitar os textos legais, e "precisa" só é
-- verificável depois se ficou registrado o que foi aceito. Uma linha por aceite,
-- com a versão do documento, a data e o endereço de onde ele foi dado — é isso que
-- responde, meses depois, à pergunta "mostre o que este usuário aceitou".
--
-- O histórico não se sobrescreve: mudou a versão, a pessoa aceita de novo e nasce
-- uma linha nova. A antiga continua contando o que estava em vigor naquela data.
--
-- `kind` e `version` são cópia do momento, e não junção viva com `legal_documents`,
-- de propósito: o texto pode ser reescrito amanhã, e a prova do que foi aceito
-- ontem não pode mudar junto com ele.
--
-- `legal_documents.version` é o número que o editor da plataforma sobe a cada
-- mudança de conteúdo. Sem ele, "ele aceitou os Termos de uso" seria uma afirmação
-- sobre um texto que já não existe.
--
-- Reversao, na ordem inversa:
--   ALTER TABLE `consent_records` DROP FOREIGN KEY `consent_records_user_id_fkey`;
--   DROP TABLE `consent_records`;
--   ALTER TABLE `legal_documents` DROP COLUMN `version`;

-- AlterTable
ALTER TABLE `legal_documents` ADD COLUMN `version` INTEGER NOT NULL DEFAULT 1;

-- CreateTable
CREATE TABLE `consent_records` (
    `id` VARCHAR(36) NOT NULL,
    `user_id` VARCHAR(36) NOT NULL,
    `kind` ENUM('TERMS', 'PRIVACY', 'LGPD') NOT NULL,
    `version` INTEGER NOT NULL,
    `ip` VARCHAR(64) NULL,
    `accepted_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `consent_records_user_id_kind_version_idx`(`user_id`, `kind`, `version`),
    INDEX `consent_records_kind_version_idx`(`kind`, `version`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `consent_records` ADD CONSTRAINT `consent_records_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
