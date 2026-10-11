-- Fase 2 da auditoria (reuso de refresh token): `used_at` marca o token já
-- consumido pela rotação. Sem essa coluna não dá para distinguir o reuso
-- malicioso de um token rotacionado (que derruba todas as sessões do usuário)
-- de uma revogação manual normal (logout, admin, recuperação de senha).
-- Reversão: ALTER TABLE `refresh_tokens` DROP COLUMN `used_at`;
ALTER TABLE `refresh_tokens` ADD COLUMN `used_at` DATETIME(3) NULL;
