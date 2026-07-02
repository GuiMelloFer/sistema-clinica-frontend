# Sistema ClinicaFit Frontend

Frontend Angular do Sistema ClinicaFit.

## Stack

- Angular 17
- Standalone components
- SCSS
- Bootstrap 5
- SSR habilitado, seguindo a estrutura do projeto Torneio das Estacoes

## Estrutura

```text
src/app/core
src/app/features
src/app/layout
src/app/shared
src/environments
```

Base criada:

- Login em `/login`
- Layout administrativo protegido
- Dashboard em `/dashboard`
- Pacientes em `/pacientes`, consumindo `GET /pacientes`
- Agenda em `/agenda`, ainda como base visual
- Interceptor JWT com `Authorization: Bearer <token>`
- Guard de autenticacao

## Rodar localmente

Backend esperado:

```text
http://localhost:8080
```

Subir frontend:

```powershell
npm start
```

Acessar:

```text
http://localhost:4200
```

Login padrao local:

```text
guimello113@gmail.com
123456
```

## Build

```powershell
npm run build
```

Observacao: com Node 24 o Angular CLI emite aviso de versao nao suportada. Se houver erro estranho em build/serve, usar Node 20 LTS.

## Configuracao de API

Ambiente local:

```text
src/environments/environment.ts
```

Producao:

```text
src/environments/environment.production.ts
```
