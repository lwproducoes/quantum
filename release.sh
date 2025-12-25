#!/bin/bash

# Release Script
# Usage: ./release.sh 1.0.1

VERSION=$1

# Valida se a versão foi informada
if [ -z "$VERSION" ]; then
    echo "Erro: Informe a versão (ex: ./release.sh 1.0.1)"
    exit 1
fi

# Valida o formato da versão
if ! [[ "$VERSION" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
    echo "Erro: Versão deve estar no formato X.Y.Z (ex: 1.0.1)"
    exit 1
fi

echo "Criando release versão v$VERSION..."

# Atualiza package.json
echo -e "\nAtualizando package.json..."
sed -i.bak "s/\"version\": \"[0-9]*\.[0-9]*\.[0-9]*\"/\"version\": \"$VERSION\"/" package.json
rm package.json.bak

# Git add, commit e tag
echo -e "\nCommitando mudanças..."
git add package.json
git commit -m "chore: bump version to $VERSION"

echo -e "\nCriando tag v$VERSION..."
git tag "v$VERSION"

echo -e "\nEnviando para o GitHub..."
git push origin main
git push origin "v$VERSION"

echo -e "\n✓ Release v$VERSION criada com sucesso!"
echo "Acompanhe o build em: https://github.com/lwproducoes/quantum/actions"
