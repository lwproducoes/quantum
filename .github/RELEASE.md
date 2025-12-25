# GitHub Actions - Build e Release Automático

Este projeto usa GitHub Actions para automatizar o build e publicação de releases.

## Como funciona

1. Quando você cria uma tag com formato `v*.*.*` (ex: `v1.0.0`), o workflow é acionado
2. O build é executado em paralelo para Windows, macOS e Linux
3. Os instaladores são automaticamente publicados em GitHub Releases
4. Os arquivos `latest.yml` são gerados para auto-update

## Como criar uma release

### 1. Atualize a versão no package.json

```bash
# Edite package.json e mude a versão para a nova versão (ex: 1.0.1)
```

### 2. Commit as mudanças

```bash
git add .
git commit -m "chore: bump version to 1.0.1"
```

### 3. Crie e publique a tag

```bash
# Crie a tag
git tag v1.0.1

# Envie a tag para o GitHub
git push origin v1.0.1
```

### 4. Aguarde o build

- Acesse a aba "Actions" no GitHub
- O workflow será executado automaticamente
- Quando concluído, a release estará disponível em "Releases"

## Configuração necessária

### Secrets do GitHub

Adicione em Settings > Secrets and variables > Actions:

1. **VITE_API_BASE_URL** (opcional)
   - Valor: `https://quantum.lwproducoes.com/api/v1`
   - Usado para configurar a URL da API em produção

**Nota:** O `GITHUB_TOKEN` é fornecido automaticamente pelo GitHub Actions.

## Estrutura do Workflow

```
.github/
└── workflows/
    └── build.yml  # Workflow principal de build e release
```

## O que é gerado

Após o build, os seguintes arquivos são publicados:

### Windows

- `quantum-{version}-setup.exe` - Instalador NSIS
- `Quantum {version}.exe` - Versão portable
- `latest.yml` - Metadata para auto-update

### macOS

- `quantum-{version}.dmg` - Instalador DMG
- `latest-mac.yml` - Metadata para auto-update

### Linux

- `quantum-{version}.AppImage` - AppImage
- `quantum-{version}.deb` - Pacote Debian
- `quantum-{version}.snap` - Snap package
- `latest-linux.yml` - Metadata para auto-update

## Auto-Update

Com os arquivos `latest*.yml` publicados no GitHub Releases, o auto-update funcionará automaticamente para usuários que já têm o app instalado.

## Troubleshooting

### Build falhou no macOS

- macOS builds podem precisar de code signing
- Para desabilitar temporariamente, edite `electron-builder.yml`:
  ```yaml
  mac:
    notarize: false
  ```

### Permissões negadas

- Verifique se o repositório tem permissões de escrita para o GITHUB_TOKEN
- Vá em Settings > Actions > General > Workflow permissions
- Selecione "Read and write permissions"

### Build lento

- Os builds em macOS são geralmente mais lentos
- Considere usar cache de dependências se necessário

## Testando localmente

Para testar o build antes de criar a tag:

```bash
# Windows
yarn build:win

# macOS
yarn build:mac

# Linux
yarn build:linux
```

## Releases manuais

Se preferir fazer release manual:

```bash
# Build local
yarn build:win

# Depois crie a release manualmente no GitHub
# E faça upload dos arquivos de dist/
```
