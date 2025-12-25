# Release Script
# Usage: .\release.ps1 1.0.1

param(
    [Parameter(Mandatory=$true)]
    [string]$version
)

# Valida o formato da versão
if ($version -notmatch '^\d+\.\d+\.\d+$') {
    Write-Host "Erro: Versão deve estar no formato X.Y.Z (ex: 1.0.1)" -ForegroundColor Red
    exit 1
}

Write-Host "Criando release versão v$version..." -ForegroundColor Green

# Atualiza package.json
Write-Host "`nAtualizando package.json..." -ForegroundColor Yellow
$packagePath = "package.json"
$packageContent = Get-Content $packagePath -Raw
$packageContent = $packageContent -replace '"version": "\d+\.\d+\.\d+"', '"version": ' + '"' + $version + '"'
Set-Content $packagePath $packageContent

# Git add, commit e tag
Write-Host "`nCommitando mudanças..." -ForegroundColor Yellow
git add package.json
git commit -m "chore: bump version to $version"

Write-Host "`nCriando tag v$version..." -ForegroundColor Yellow
git tag "v$version"

Write-Host "`nEnviando para o GitHub..." -ForegroundColor Yellow
git push origin main
git push origin "v$version"

Write-Host "`nRelease v$version criada com sucesso!" -ForegroundColor Green
Write-Host "Acompanhe o build em: https://github.com/lwproducoes/quantum/actions" -ForegroundColor Cyan
