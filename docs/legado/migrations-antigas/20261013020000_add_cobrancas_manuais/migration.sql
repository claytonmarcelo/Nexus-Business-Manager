-- F3.2 Parte 2: Cobranças e gateway MANUAL.
--
-- A cobrança é o papel que a empresa estende ao cliente: "você deve X até tal
-- dia, e aqui está como pagar". Ela nasce da venda, da ordem de serviço ou
-- sozinha, e vive no mundo manual enquanto não há integração de pagamento: PIX
-- na chave cadastrada, boleto combinado no balcão, transferência, dinheiro ou
-- cartão na maquininha. Nada aqui fala com um provedor externo — é por isso que
-- a tabela tem `provider` e ele vale MANUAL: quando um gateway de mercado
-- entrar, o vínculo com a transação externa será dele, e as cobranças escritas
-- à mão continuarão dizendo a verdade.
--
-- Duas travas de integridade, e as duas são o desenho inteiro:
--   UNIQUE(company_id, number)  — a série é por empresa, e a corrida entre duas
--                                 requisições vira chave duplicada (o serviço
--                                 refaz a conta), nunca número repetido;
--   UNIQUE(finance_entry_id)    — uma cobrança gera, no máximo, UM lançamento
--                                 no caixa. Duas pessoas registrando o mesmo
--                                 pagamento ao mesmo tempo não viram duas
--                                 receitas: a segunda falha antes de escrever.
--
-- `due_date` é @db.Date, como em finance_entries: o que a pessoa escreveu foi um
-- dia de calendário, e "vencida" é calculado na leitura contra o calendário da
-- empresa (lib/time.ts) — por isso não existe coluna de estado de vencimento.
--
-- Dinheiro em DECIMAL(14,2), a mesma escala de sales/service_orders/finance:
-- conta feita no servidor, em centavo, sem linha flutuante chegando ao banco.
--
-- `payment_gateways` recebe o valor MANUAL no enum e uma coluna JSON de
-- configuração de exibição (chave PIX, beneficiário, instruções, vencimento
-- padrão). As colunas cifradas do arquivo anterior continuam existindo para os
-- provedores que ainda não têm integração — e continuam vazias.
--
-- Reversão: DROP TABLE `charges`;
--           ALTER TABLE `payment_gateways` DROP COLUMN `charge_settings`;
--           ALTER TABLE `payment_gateways` MODIFY `provider`
--             ENUM('MERCADO_PAGO','EFI','STRIPE') NOT NULL;

-- AlterTable
ALTER TABLE `payment_gateways`
    ADD COLUMN `charge_settings` JSON NULL,
    MODIFY `provider` ENUM('MANUAL', 'MERCADO_PAGO', 'EFI', 'STRIPE') NOT NULL;

-- CreateTable
CREATE TABLE `charges` (
    `id` VARCHAR(36) NOT NULL,
    `company_id` VARCHAR(36) NOT NULL,
    `number` INTEGER NOT NULL,
    `client_id` VARCHAR(36) NULL,
    `sale_id` VARCHAR(36) NULL,
    `service_order_id` VARCHAR(36) NULL,
    `title` VARCHAR(160) NOT NULL,
    `amount` DECIMAL(14, 2) NOT NULL,
    `due_date` DATE NOT NULL,
    `method` ENUM('PIX', 'BOLETO', 'TRANSFERENCIA', 'DINHEIRO', 'CARTAO', 'OUTRO') NOT NULL,
    `provider` ENUM('MANUAL', 'MERCADO_PAGO', 'EFI', 'STRIPE') NOT NULL DEFAULT 'MANUAL',
    `pix_key_type` VARCHAR(16) NULL,
    `pix_key` VARCHAR(255) NULL,
    `instructions` VARCHAR(500) NULL,
    `notes` VARCHAR(500) NULL,
    `status` ENUM('PENDING', 'PAID', 'CANCELLED') NOT NULL DEFAULT 'PENDING',
    `paid_at` DATETIME(3) NULL,
    `paid_method` ENUM('PIX', 'BOLETO', 'TRANSFERENCIA', 'DINHEIRO', 'CARTAO', 'OUTRO') NULL,
    `paid_by` VARCHAR(36) NULL,
    `payment_note` VARCHAR(500) NULL,
    `cancelled_at` DATETIME(3) NULL,
    `cancel_reason` VARCHAR(500) NULL,
    `cancelled_by` VARCHAR(36) NULL,
    `finance_entry_id` VARCHAR(36) NULL,
    `created_by` VARCHAR(36) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `charges_finance_entry_id_key`(`finance_entry_id`),
    UNIQUE INDEX `charges_company_id_number_key`(`company_id`, `number`),
    INDEX `charges_company_id_status_due_date_idx`(`company_id`, `status`, `due_date`),
    INDEX `charges_company_id_client_id_idx`(`company_id`, `client_id`),
    INDEX `charges_sale_id_idx`(`sale_id`),
    INDEX `charges_service_order_id_idx`(`service_order_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `charges` ADD CONSTRAINT `charges_company_id_fkey` FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `charges` ADD CONSTRAINT `charges_client_id_fkey` FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `charges` ADD CONSTRAINT `charges_sale_id_fkey` FOREIGN KEY (`sale_id`) REFERENCES `sales`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `charges` ADD CONSTRAINT `charges_service_order_id_fkey` FOREIGN KEY (`service_order_id`) REFERENCES `service_orders`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `charges` ADD CONSTRAINT `charges_finance_entry_id_fkey` FOREIGN KEY (`finance_entry_id`) REFERENCES `finance_entries`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `charges` ADD CONSTRAINT `charges_created_by_fkey` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `charges` ADD CONSTRAINT `charges_paid_by_fkey` FOREIGN KEY (`paid_by`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `charges` ADD CONSTRAINT `charges_cancelled_by_fkey` FOREIGN KEY (`cancelled_by`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
