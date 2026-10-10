# Paleta oficial — extraída da logo (evidência)

Valores obtidos por decodificação PNG de `assets/brand/logo/logo.png` (quantização por família de
matiz sobre pixels opacos, ignorando fundo branco/transparência). Estes são a fonte de verdade da
identidade, substituindo as referências aproximadas do prompt.

## Cobre / rosé (acento primário)

| Token | HEX | Papel |
|---|---|---|
| `copper-900` | `#5A1F1F` | cobre profundo (sombras) |
| `copper-700` | `#803030` | cobre base escuro |
| `copper-600` | `#883838` | cobre base |
| `copper-500` | `#A85048` | cobre médio (marca) |
| `copper-400` | `#B05050` | rosé cobre |
| `copper-300` | `#D07870` | rosé claro |
| `copper-200` | `#E09080` | rosé brilho |

## Dourado / bronze (acento secundário)

| Token | HEX | Papel |
|---|---|---|
| `bronze-600` | `#A87040` | bronze |
| `gold-500` | `#B08850` | dourado escuro |
| `gold-400` | `#C0A068` | dourado |
| `gold-300` | `#C8A870` | dourado claro |
| `gold-200` | `#D0B078` | champanhe |
| `gold-100` | `#F8F0B0` | brilho do ouro |

## Neutros derivados (superfícies)

Neutros de tema derivados para harmonizar com cobre/dourado, sem preto/branco puros (§13/§14).
Definidos em `apps/web/src/styles/tokens.css`.

- Dark base: `#0B0D10` → superfícies `#12151A`, `#171B22` (não preto absoluto)
- Light base: `#F5F1EA` (creme, não branco puro) → superfícies `#FBF8F3`, `#EFE8DD`
