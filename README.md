# Sistema ClinicaFit Frontend

SPA administrativa em Angular 22, TypeScript 6, SCSS e Bootstrap 5. O projeto usa componentes standalone e carregamento lazy das telas.

## Executar localmente

Requisitos: Node.js `^24.15.0` e o backend em `http://localhost:8080`.

```bash
npm ci
npm start
```

Acesse `http://localhost:4200`. Nao existem credenciais padrao no codigo; use o admin configurado no backend.

## Validacao

```bash
npm test
npm run build
npm audit --omit=dev
```

Os testes usam Vitest. O build estatico e gerado em `dist/sistema-clinica-frontend/browser`.

## Configuracao da API

- Desenvolvimento: `src/environments/environment.ts`
- Producao: `src/environments/environment.production.ts`

A URL de producao tambem aparece em `connect-src` no `vercel.json`. Se o subdominio do Render mudar, atualize os dois arquivos.

O token fica apenas em `sessionStorage`, expira com a sessao da aba e e enviado no header `Authorization`. A ficha do paciente e obtida como `Blob` autenticado, sem expor o token na URL.

## Deploy na Vercel

1. Confirme que `environment.production.ts` aponta para o backend publicado no Render.
2. Envie este repositorio ao GitHub.
3. Na Vercel, escolha **Add New > Project** e importe o repositorio.
4. Mantenha o preset Angular e use os valores de `vercel.json`.
5. Publique e copie a URL final.
6. No Render, altere `CORS_ALLOWED_ORIGINS` para a URL exata da Vercel, sem barra no final.
7. Rode um novo deploy do backend e teste login, agenda, importacao e ficha.

O `vercel.json` inclui fallback das rotas da SPA e headers de seguranca. O workflow de CI instala com `npm ci`, audita dependencias de runtime, testa e gera o build.

## Observacao sobre a auditoria

As dependencias enviadas ao navegador estao sem vulnerabilidades conhecidas na auditoria atual. Restam avisos moderados somente na cadeia de desenvolvimento do Angular CLI, sem impacto no bundle de producao; nao use `npm audit fix --force`, pois ele tentaria rebaixar a versao principal do Angular.
