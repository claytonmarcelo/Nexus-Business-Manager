-- F2 (N14 / G8 opção D): a auditoria ganha escopo.
--
-- Até aqui, evento de plataforma (vitrine, textos legais, rotinas de sistema)
-- era gravado com a empresa ativa da sessão: a ação aparecia na auditoria de um
-- tenant como se fosse dele, e a trilha da plataforma não existia em lugar
-- nenhum. `scope` separa as duas trilhas ('tenant' é o padrão histórico;
-- 'platform' passa a ser escrito por quem responde pela plataforma inteira), e o
-- índice novo é o que a tela de auditoria da plataforma usa para paginar sem
-- varrer a tabela.
--
-- O evento de plataforma passa a ter company_id NULL. A empresa em que o
-- administrador estava sentado continua registrada, mas no metadata — onde ela
-- não decide dono nenhum.
--
-- Linha antiga não é reescrita: o que foi gravado antes da F2 permaneceu na
-- auditoria do tenant onde nasceu, e isso é honesto — a ação saiu de uma sessão
-- daquela empresa. A separação vale daqui para frente.
-- Reversão: DROP INDEX `audit_logs_scope_created_at_idx` ON `audit_logs`;
--           ALTER TABLE `audit_logs` DROP COLUMN `scope`;
ALTER TABLE `audit_logs` ADD COLUMN `scope` VARCHAR(16) NOT NULL DEFAULT 'tenant';

CREATE INDEX `audit_logs_scope_created_at_idx` ON `audit_logs`(`scope`, `created_at`);
