-- A4 do prompt de mercado: o refresh token passa a lembrar a empresa ativa da
-- sessão. O access token carrega a empresa no claim `cid`, mas morre em 15
-- minutos; sem esta coluna a renovação escolhia a primeira empresa ativa do
-- usuário e quem tinha trocado para a B acordava na A — gravando venda, cliente
-- e financeiro no tenant errado, sem nenhum aviso. Nullable porque os tokens
-- emitidos antes continuam válidos e mantêm o comportamento antigo.
-- Reversão: DROP INDEX `refresh_tokens_company_id_idx` ON `refresh_tokens`;
--           ALTER TABLE `refresh_tokens` DROP COLUMN `company_id`;
ALTER TABLE `refresh_tokens` ADD COLUMN `company_id` VARCHAR(36) NULL;

-- A6: a aba Sessões lista "o que está aberto nesta empresa" por esta coluna.
-- Sem índice, cada listagem varre a tabela inteira de tokens.
CREATE INDEX `refresh_tokens_company_id_idx` ON `refresh_tokens`(`company_id`);
