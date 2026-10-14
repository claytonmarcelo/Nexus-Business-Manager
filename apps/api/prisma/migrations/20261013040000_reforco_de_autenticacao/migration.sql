-- T3 (F4) do prompt de continuação: autenticação reforçada. As três decisões do
-- dono entram aqui — D1 (entrega de mensagem por SMTP), D2 (verificação de
-- e-mail) e D3 (segundo fator) — mais o bloqueio por conta que a F4 pede.
--
-- D2: `email_verified_at` marca a caixa postal confirmada. Nulo é "ninguém provou
-- ler aquele e-mail nunca". O login só cobra a coluna quando o ambiente declara
-- REQUIRE_EMAIL_VERIFICATION=1, que é a régua de produção; por isso contas
-- antigas não são barradas numa atualização de servidor — elas seguem entrando
-- até a própria pessoa confirmar o endereço quando quiser.
--
-- D3: `totp_secret_ciphertext` nunca guarda o segredo em claro. O texto é o
-- envelope `v1:<iv>:<tag>:<cifrado>` do AES-256-GCM com a chave
-- TOTP_ENCRYPTION_KEY, que vive só no ambiente de quem hospeda. `totp_enabled_at`
-- separa o segredo gerado do segundo fator ligado de fato: um setup começado e
-- abandonado não tranca login nenhum.
--
-- As duas tabelas de código (verificação e recuperação do 2FA) copiam o desenho
-- de `password_reset_tokens`: guardam só o HMAC do que saiu para o cliente, com
-- expiração e uso único. Uma delas lida junto do dump do banco não dá porta de
-- entrada para ninguém.
--
-- `login_attempts` é a única tabela nova sem chave estrangeira, e é assim de
-- propósito: ela conta tentativas por endereço, inclusive de endereços que não
-- existem no sistema — bloquear só quem tem conta seria justamente a resposta que
-- denuncia quais endereços estão cadastrados.
--
-- Reversao, na ordem inversa:
--   DROP TABLE `login_attempts`, `recovery_codes`, `email_verification_tokens`;
--   ALTER TABLE `users` DROP COLUMN `totp_enabled_at`, DROP COLUMN `totp_secret_ciphertext`,
--     DROP COLUMN `email_verified_at`;

ALTER TABLE `users`
  ADD COLUMN `email_verified_at` DATETIME(3) NULL,
  ADD COLUMN `totp_secret_ciphertext` VARCHAR(512) NULL,
  ADD COLUMN `totp_enabled_at` DATETIME(3) NULL;

CREATE TABLE `email_verification_tokens` (
  `id` VARCHAR(36) NOT NULL,
  `user_id` VARCHAR(36) NOT NULL,
  `token_hash` VARCHAR(191) NOT NULL,
  `expires_at` DATETIME(3) NOT NULL,
  `used_at` DATETIME(3) NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  UNIQUE INDEX `email_verification_tokens_token_hash_key` (`token_hash`),
  INDEX `email_verification_tokens_user_id_idx` (`user_id`),
  PRIMARY KEY (`id`),
  CONSTRAINT `email_verification_tokens_user_id_fkey`
    FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `recovery_codes` (
  `id` VARCHAR(36) NOT NULL,
  `user_id` VARCHAR(36) NOT NULL,
  `code_hash` VARCHAR(191) NOT NULL,
  `used_at` DATETIME(3) NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  UNIQUE INDEX `recovery_codes_code_hash_key` (`code_hash`),
  INDEX `recovery_codes_user_id_idx` (`user_id`),
  PRIMARY KEY (`id`),
  CONSTRAINT `recovery_codes_user_id_fkey`
    FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `login_attempts` (
  `email` VARCHAR(191) NOT NULL,
  `failures` INTEGER NOT NULL DEFAULT 0,
  `first_failed_at` DATETIME(3) NOT NULL,
  `last_failed_at` DATETIME(3) NOT NULL,
  `locked_until` DATETIME(3) NULL,

  PRIMARY KEY (`email`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
