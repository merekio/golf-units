#!/bin/bash
# Script para validar Google OAuth Configuration
# Uso: bash validate-oauth.sh

echo "=========================================="
echo "🔐 Golf Units - Google OAuth Validator"
echo "=========================================="
echo ""

# Verificar .env.local
echo "1️⃣  Verificando variables de entorno..."
if [ -f .env.local ]; then
  echo "   ✅ .env.local existe"
  
  if grep -q "NEXT_PUBLIC_SUPABASE_URL" .env.local; then
    echo "   ✅ NEXT_PUBLIC_SUPABASE_URL configurada"
  else
    echo "   ❌ NEXT_PUBLIC_SUPABASE_URL NO configurada"
  fi
  
  if grep -q "NEXT_PUBLIC_SUPABASE_ANON_KEY" .env.local; then
    echo "   ✅ NEXT_PUBLIC_SUPABASE_ANON_KEY configurada"
  else
    echo "   ❌ NEXT_PUBLIC_SUPABASE_ANON_KEY NO configurada"
  fi
else
  echo "   ❌ .env.local NO encontrado"
fi

echo ""
echo "2️⃣  Verificando archivos de autenticación..."

FILES=(
  "middleware.ts"
  "app/login/page.tsx"
  "app/auth/callback/route.ts"
  "app/components/SiteHeader.tsx"
  "lib/supabase.ts"
)

for file in "${FILES[@]}"; do
  if [ -f "$file" ]; then
    echo "   ✅ $file existe"
  else
    echo "   ❌ $file NO encontrado"
  fi
done

echo ""
echo "3️⃣  Verificando build..."
if npm run build > /dev/null 2>&1; then
  echo "   ✅ Build exitoso"
else
  echo "   ❌ Build falló"
fi

echo ""
echo "4️⃣  Verificando lint..."
if npm run lint > /dev/null 2>&1; then
  echo "   ✅ Lint pasó"
else
  echo "   ❌ Lint falló"
fi

echo ""
echo "=========================================="
echo "✅ Verificación completada"
echo ""
echo "Próximo paso: Configurar Google OAuth en:"
echo "  1. Google Cloud Console"
echo "  2. Supabase Dashboard"
echo ""
echo "Ver: files/oauth-action-plan.md"
echo "=========================================="
