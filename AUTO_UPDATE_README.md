# Auto-Update Configuration

## Configuração Implementada

O auto-update foi implementado usando `electron-updater` e está pronto para uso em produção.

### Arquivos Criados/Modificados:

1. **src/main/services/updater.ts** - Serviço de atualização
2. **src/main/index.ts** - Integração do updater no main process
3. **src/preload/index.ts** - APIs expostas para o renderer
4. **src/preload/index.d.ts** - Tipos TypeScript
5. **src/renderer/src/components/updater-notification.tsx** - Componente UI de notificações
6. **src/renderer/src/main.tsx** - Integração do componente

## Como Funciona

### No Main Process:

- Verifica automaticamente por atualizações 3 segundos após o app iniciar (apenas em produção)
- Envia eventos de atualização para o renderer via IPC
- Controla download e instalação de atualizações

### No Renderer:

- Mostra dialogs quando uma atualização está disponível
- Exibe progresso do download
- Permite instalar ou adiar a atualização

## Configuração para Produção

### 1. Configurar URL de Updates

Edite `electron-builder.yml` e `dev-app-update.yml`:

```yaml
publish:
  provider: generic
  url: https://seu-servidor.com/updates
```

**Opções de Provider:**

- `generic` - Servidor HTTP customizado
- `github` - GitHub Releases
- `s3` - Amazon S3
- `spaces` - DigitalOcean Spaces

### 2. Para GitHub Releases:

```yaml
publish:
  provider: github
  owner: seu-usuario
  repo: seu-repositorio
  releaseType: release
```

### 3. Para S3:

```yaml
publish:
  provider: s3
  bucket: seu-bucket
  region: us-east-1
```

## Estrutura do Servidor de Updates

Se usar `provider: generic`, seu servidor deve ter esta estrutura:

```
https://seu-servidor.com/updates/
├── latest.yml              # Para Windows (NSIS)
├── latest-mac.yml          # Para macOS
├── latest-linux.yml        # Para Linux
├── quantum-1.0.1-setup.exe
├── quantum-1.0.1.dmg
└── quantum-1.0.1.AppImage
```

### Exemplo de latest.yml:

```yaml
version: 1.0.1
files:
  - url: quantum-1.0.1-setup.exe
    sha512: <hash-sha512>
    size: 123456789
path: quantum-1.0.1-setup.exe
sha512: <hash-sha512>
releaseDate: '2025-12-25T00:00:00.000Z'
```

## Build e Publicação

### Build com auto-update:

```bash
# Windows
yarn build:win

# macOS
yarn build:mac

# Linux
yarn build:linux
```

Os arquivos gerados estarão em `dist/`:

- Instaladores
- Arquivos `latest*.yml` com metadados

### Publicação Manual:

1. Faça build da nova versão
2. Atualize a versão em `package.json`
3. Copie os arquivos de `dist/` para seu servidor
4. Certifique-se de que `latest.yml` aponta para a nova versão

### Publicação Automática (GitHub):

```bash
# Configurar token do GitHub
export GH_TOKEN="seu-github-token"

# Build e publicar
yarn build:win --publish always
```

## Testing em Desenvolvimento

Para testar em dev mode, edite `src/main/services/updater.ts`:

```typescript
// Remova temporariamente esta condição:
if (updaterService && !is.dev) {
  // <- Remova "!is.dev"
  updaterService.checkForUpdates()
}
```

E configure `dev-app-update.yml` com uma URL de teste válida.

## API Disponível no Renderer

```typescript
// Verificar atualizações manualmente
await window.api.checkForUpdates()

// Baixar atualização
await window.api.downloadUpdate()

// Instalar e reiniciar
await window.api.installUpdate()

// Ouvir eventos de atualização
window.api.onUpdateMessage((data) => {
  console.log(data.event, data.data)
})
```

## Eventos do Updater

- `checking-for-update` - Verificando atualizações
- `update-available` - Atualização disponível
- `update-not-available` - Sem atualizações
- `update-download-progress` - Progresso do download
- `update-downloaded` - Download concluído
- `update-error` - Erro durante atualização

## Segurança

- As atualizações são verificadas com hash SHA-512
- Apenas atualizações assinadas são aceitas (em produção)
- Para Windows, recomenda-se assinar o código com certificado válido

## Code Signing (Recomendado)

### Windows:

```yaml
win:
  certificateFile: path/to/cert.pfx
  certificatePassword: ${env.CSC_PASSWORD}
```

### macOS:

```yaml
mac:
  identity: 'Developer ID Application: Your Name (TEAM_ID)'
```

## Troubleshooting

### Updates não funcionam em dev:

- Normal! Auto-update só funciona em builds de produção
- Use `!is.dev` removido apenas para testar

### Erro de assinatura:

- Em desenvolvimento, desative verificação de assinatura
- Em produção, sempre use code signing

### URL não encontrada:

- Verifique se `latest.yml` está acessível
- Teste a URL manualmente no browser
