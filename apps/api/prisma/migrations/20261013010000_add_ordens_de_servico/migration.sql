-- F3.2 Parte 1: Ordens de Serviço.
--
-- A empresa que conserta ou instala tinha onde registrar a nota (Vendas) e onde
-- ver o caixa (Financeiro), mas não tinha a peça que liga as duas: o papel que
-- diz quem está com o quê, desde quando, com quais peças e o que foi feito. Sem
-- ele, o atendimento vivia no caderno do balcão e o estoque baixava na venda
-- de uma peça que talvez nem fosse usada.
--
-- Três tabelas:
--   service_orders          — a ordem, com número sequencial POR EMPRESA
--                             (UNIQUE(company_id, number) é o que garante a
--                             série: a corrida entre duas requisições vira
--                             chave duplicada, não número repetido),
--   service_order_items     — a linha do que foi cobrado: serviço (descrição +
--                             preço) ou peça (produto + quantidade). A coluna
--                             `line_number` guarda a ordem em que o operador
--                             digitou as linhas: sem ela o banco devolveria as
--                             peças pela ordem do uuid, e o documento — o
--                             impresso para o cliente, inclusive — sairia
--                             embaralhado.
--   service_order_histories — a linha do tempo, imutável: cada mudança de status
--                             grava de-para, quem e por quê.
--
-- Estoque é o ponto que decide o resto do desenho. A baixa acontece na
-- CONCLUSÃO, não na abertura: uma OS aberta é intenção, e baixa de estoque é
-- fato. Por isso `client_id` e `product_id` são RESTRICT — cliente ou peça com
-- ordem em andamento não somem por trás do técnico — e `company_id` é CASCADE,
-- como em toda tabela de tenant deste banco.
--
-- Money em DECIMAL(14,2) (total e discount) e medida em DECIMAL(12,3)
-- (quantity), exatamente as escalas de sales/sale_items: a conta é feita no
-- servidor, em centavo, e nenhuma linha flutuante chega ao banco.
--
-- Reversão: DROP TABLE `service_order_histories`; DROP TABLE `service_order_items`;
--           DROP TABLE `service_orders`;

-- CreateTable
CREATE TABLE `service_orders` (
    `id` VARCHAR(36) NOT NULL,
    `company_id` VARCHAR(36) NOT NULL,
    `number` INTEGER NOT NULL,
    `client_id` VARCHAR(36) NOT NULL,
    `assigned_user_id` VARCHAR(36) NULL,
    `status` ENUM('OPEN', 'IN_PROGRESS', 'WAITING', 'COMPLETED', 'CANCELLED') NOT NULL DEFAULT 'OPEN',
    `priority` ENUM('LOW', 'NORMAL', 'HIGH', 'URGENT') NOT NULL DEFAULT 'NORMAL',
    `title` VARCHAR(160) NOT NULL,
    `description` TEXT NULL,
    `diagnosis` TEXT NULL,
    `scheduled_at` DATETIME(3) NULL,
    `started_at` DATETIME(3) NULL,
    `completed_at` DATETIME(3) NULL,
    `discount` DECIMAL(14, 2) NOT NULL DEFAULT 0,
    `total` DECIMAL(14, 2) NOT NULL,
    `notes` VARCHAR(500) NULL,
    `created_by` VARCHAR(36) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `service_orders_company_id_status_created_at_idx`(`company_id`, `status`, `created_at`),
    INDEX `service_orders_company_id_assigned_user_id_idx`(`company_id`, `assigned_user_id`),
    UNIQUE INDEX `service_orders_company_id_number_key`(`company_id`, `number`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `service_order_items` (
    `id` VARCHAR(36) NOT NULL,
    `service_order_id` VARCHAR(36) NOT NULL,
    `line_number` INTEGER NOT NULL,
    `kind` ENUM('SERVICE', 'PART') NOT NULL,
    `product_id` VARCHAR(36) NULL,
    `description` VARCHAR(200) NULL,
    `quantity` DECIMAL(12, 3) NOT NULL,
    `unit_price` DECIMAL(12, 2) NOT NULL,
    `line_total` DECIMAL(14, 2) NOT NULL,

    INDEX `service_order_items_service_order_id_idx`(`service_order_id`),
    INDEX `service_order_items_product_id_idx`(`product_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `service_order_histories` (
    `id` VARCHAR(36) NOT NULL,
    `service_order_id` VARCHAR(36) NOT NULL,
    `from_status` ENUM('OPEN', 'IN_PROGRESS', 'WAITING', 'COMPLETED', 'CANCELLED') NULL,
    `to_status` ENUM('OPEN', 'IN_PROGRESS', 'WAITING', 'COMPLETED', 'CANCELLED') NOT NULL,
    `user_id` VARCHAR(36) NULL,
    `note` VARCHAR(500) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `service_order_histories_service_order_id_created_at_idx`(`service_order_id`, `created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `service_orders` ADD CONSTRAINT `service_orders_company_id_fkey` FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `service_orders` ADD CONSTRAINT `service_orders_client_id_fkey` FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `service_orders` ADD CONSTRAINT `service_orders_assigned_user_id_fkey` FOREIGN KEY (`assigned_user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `service_orders` ADD CONSTRAINT `service_orders_created_by_fkey` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `service_order_items` ADD CONSTRAINT `service_order_items_service_order_id_fkey` FOREIGN KEY (`service_order_id`) REFERENCES `service_orders`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `service_order_items` ADD CONSTRAINT `service_order_items_product_id_fkey` FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `service_order_histories` ADD CONSTRAINT `service_order_histories_service_order_id_fkey` FOREIGN KEY (`service_order_id`) REFERENCES `service_orders`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `service_order_histories` ADD CONSTRAINT `service_order_histories_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

