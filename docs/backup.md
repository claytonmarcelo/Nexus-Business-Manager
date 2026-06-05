# Backup e Recuperação de Dados

## Visão Geral

O Nexus Business Manager possui um sistema de backup projetado para garantir a integridade dos dados e possibilitar a recuperação rápida em caso de falhas, atualizações incorretas, exclusões acidentais ou desastres operacionais.

Todos os backups são gerados em formato compactado (`.sql.gz`) e armazenados na pasta:

```text
database/backups/
```

Formato padrão dos arquivos:

```text
nexus_business_manager_YYYYMMDD_HHMMSS.sql.gz
```

Exemplo:

```text
nexus_business_manager_20260604_120000.sql.gz
```

---

# Backup Manual

## Linux e macOS

Execute o script:

```bash
bash database/backup.sh
```

O sistema irá:

1. Conectar ao banco MySQL
2. Executar o dump completo da base de dados
3. Compactar o arquivo utilizando GZIP
4. Salvar o backup na pasta padrão
5. Registrar logs da operação

---

## Windows

Execute o PowerShell como Administrador:

```powershell
.\database\backup.ps1
```

O processo realiza as mesmas etapas do ambiente Linux.

---

# Estrutura Recomendada

```text
database/
│
├── backup.sh
├── backup.ps1
├── restore.sh
├── restore.ps1
│
└── backups/
    ├── nexus_business_manager_20260601_030000.sql.gz
    ├── nexus_business_manager_20260602_030000.sql.gz
    ├── nexus_business_manager_20260603_030000.sql.gz
    └── nexus_business_manager_20260604_030000.sql.gz
```

---

# Restauração Manual

## Linux e macOS

Para restaurar um backup específico:

```bash
bash database/restore.sh \
database/backups/nexus_business_manager_20260604_120000.sql.gz
```

O sistema irá:

1. Descompactar o arquivo
2. Limpar conexões ativas
3. Restaurar a estrutura do banco
4. Restaurar todos os registros
5. Validar a conclusão do processo

---

## Windows

```powershell
.\database\restore.ps1 `
-RestoreFile "database\backups\nexus_business_manager_20260604_120000.sql.gz"
```

---

# Processo de Recuperação

```text
Backup Selecionado
         │
         ▼
Descompactação (.gz)
         │
         ▼
Validação do Arquivo
         │
         ▼
Conexão MySQL
         │
         ▼
Restauração das Tabelas
         │
         ▼
Restauração dos Dados
         │
         ▼
Verificação Final
         │
         ▼
Sistema Operacional
```

---

# Política Recomendada de Backup

## Ambiente de Desenvolvimento

* Backup diário
* Retenção de 7 dias

## Ambiente de Homologação

* Backup diário
* Retenção de 15 dias

## Ambiente de Produção

* Backup diário
* Retenção mínima de 30 dias
* Backup adicional antes de qualquer atualização
* Backup completo antes de alterações estruturais

---

# Automação no Linux (Cron)

## Backup Diário às 03:00

```bash
0 3 * * * cd /caminho/para/nexus-business-manager && bash database/backup.sh
```

## Limpeza Automática de Backups Antigos

Remove backups com mais de 30 dias:

```bash
0 4 * * * find /caminho/para/nexus-business-manager/database/backups \
-name "*.sql.gz" -mtime +30 -delete
```

---

# Automação no Windows

## Agendador de Tarefas

### Passo 1

Abrir:

```text
Painel de Controle
→ Ferramentas Administrativas
→ Agendador de Tarefas
```

### Passo 2

Selecionar:

```text
Criar Tarefa Básica
```

### Passo 3

Configurar:

```text
Nome:
Backup Nexus Business Manager
```

### Passo 4

Gatilho:

```text
Diariamente
03:00
```

### Passo 5

Ação:

```text
Iniciar Programa
```

Programa:

```text
powershell.exe
```

Argumentos:

```powershell
-ExecutionPolicy Bypass -File "C:\Nexus-Business-Manager\database\backup.ps1"
```

---

# Estratégia de Recuperação de Desastres

Em caso de falha crítica:

1. Interromper a aplicação
2. Restaurar o último backup válido
3. Validar a integridade do banco
4. Reiniciar Backend
5. Reiniciar Frontend
6. Executar testes básicos de operação
7. Liberar acesso aos usuários

---

# Boas Práticas

* Nunca executar restauração diretamente em produção sem validação.
* Manter cópia dos backups em local externo.
* Testar restaurações periodicamente.
* Realizar backup antes de migrations.
* Realizar backup antes de atualizações do sistema.
* Manter histórico mínimo de 30 dias.
* Monitorar falhas de backup através de logs.

---

# Segurança dos Backups

Recomenda-se:

* Armazenamento em disco separado.
* Replicação em nuvem.
* Criptografia dos arquivos.
* Controle de acesso restrito.
* Auditoria das operações de backup e restauração.

---

# Objetivo

Garantir:

* Continuidade operacional
* Recuperação rápida
* Integridade dos dados
* Confiabilidade do ERP
* Segurança das informações empresariais
* Conformidade com boas práticas de infraestrutura
