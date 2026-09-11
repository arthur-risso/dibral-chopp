# Guia de Deploy — Dibral Gestão de Chopp

Este guia parte do zero: ao final, você terá o sistema rodando em um link
próprio, sem custo, com os dados salvos com segurança.

Tempo estimado: 20–30 minutos na primeira vez.

> **Já tem o sistema no ar e só está atualizando?** Pule para
> [Atualizando um sistema que já está no ar](#atualizando-um-sistema-que-já-está-no-ar).

---

## Parte 1 — Criar o banco de dados (Supabase)

1. Acesse **supabase.com** e crie uma conta gratuita (pode entrar com GitHub).
2. Clique em **New project**.
3. Preencha:
   - **Name**: `dibral-chopp`
   - **Database password**: crie uma senha forte e **guarde ela** (é a senha do banco, diferente da senha de acesso ao app — você provavelmente não vai precisar dela de novo, mas é bom ter salva).
   - **Region**: a mais próxima do Brasil disponível (ex.: South America - São Paulo).
4. Clique em **Create new project** e aguarde ~2 minutos enquanto o Supabase prepara tudo.
5. No menu à esquerda, clique em **SQL Editor** → **New query**.
6. Abra o arquivo `supabase/schema.sql` (está dentro da pasta do projeto que você recebeu), copie **todo o conteúdo** e cole no editor do Supabase.
7. Clique em **Run**. Deve aparecer "Success. No rows returned".

   > Em um projeto novo é só isso — o `schema.sql` já vem completo. Os
   > arquivos de `supabase/migrations/` servem apenas para atualizar um
   > banco que já existia.
8. Confirme: vá em **Table Editor** (menu à esquerda) e veja se existem as tabelas `produtos`, `clientes`, `reservas`, `estoque`, `fechamentos` e `fechamento_vendas`, com os 7 chopps já listados em `produtos`.
9. Agora vá em **Project Settings** (ícone de engrenagem, embaixo à esquerda) → **API**.
10. Você vai precisar de dois valores desta página — deixe-a aberta ou anote:
    - **Project URL** (formato `https://xxxxxxxx.supabase.co`)
    - **service_role key**, na seção "Project API keys" — ⚠️ **não** é a "anon public", é a **service_role** (clique em "reveal" para ver o valor completo). Essa chave dá acesso total ao banco: nunca a coloque no código nem mande para ninguém.

---

## Parte 2 — Subir o código para o GitHub

Se você já usa Git/GitHub, pode pular direto para o `git push`. Se nunca usou:

1. Crie uma conta gratuita em **github.com**.
2. Clique em **New repository**. Nome sugerido: `dibral-chopp`. Deixe como **Private**. Não marque nenhuma opção de inicialização (README, .gitignore etc.) — o projeto já vem com esses arquivos.
3. Clique em **Create repository**.
4. No seu computador, abra um terminal dentro da pasta do projeto (a que você extraiu do zip) e rode, um comando por vez:

   ```bash
   git init
   git add -A
   git commit -m "primeira versão"
   git branch -M main
   git remote add origin https://github.com/SEU-USUARIO/dibral-chopp.git
   git push -u origin main
   ```

   Troque `SEU-USUARIO` pelo seu nome de usuário do GitHub. Se pedir login, use suas credenciais do GitHub (ou um token de acesso, se ele solicitar — o próprio GitHub explica como gerar na hora).

   > O arquivo `.env.local` (com suas chaves, se você rodou o app no
   > computador) nunca vai para o GitHub — ele está no `.gitignore`.

---

## Parte 3 — Deploy na Vercel

1. Acesse **vercel.com** e crie uma conta gratuita — o mais simples é clicar em "Continue with GitHub", assim ela já enxerga seus repositórios.
2. Clique em **Add New…** → **Project**.
3. Encontre o repositório `dibral-chopp` na lista e clique em **Import**.
4. Antes de clicar em Deploy, expanda **Environment Variables** e adicione as quatro, uma de cada vez (nome à esquerda, valor à direita):

   | Nome | Valor |
   |---|---|
   | `SUPABASE_URL` | o Project URL da Parte 1, passo 10 |
   | `SUPABASE_SERVICE_ROLE_KEY` | a service_role key da Parte 1, passo 10 |
   | `APP_PASSWORD` | uma senha longa, só sua (12 caracteres ou mais) — é o que você vai digitar para entrar no sistema |
   | `SESSION_SECRET` | um texto aleatório longo (veja abaixo) — assina o cookie de login |

   Para gerar o `SESSION_SECRET`, rode no terminal (dentro da pasta do projeto):

   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"
   ```

   e cole o resultado. Se preferir, use um gerador de senhas com 40+ caracteres.
   Você nunca vai precisar digitar esse valor.

5. Clique em **Deploy** e aguarde ~1–2 minutos.
6. Ao terminar, clique em **Visit** (ou no link do projeto) para abrir o app. Você deve cair na tela de login — entre com a senha que definiu em `APP_PASSWORD`.

Pronto — o link gerado pela Vercel (algo como `dibral-chopp.vercel.app`) é o endereço fixo do seu sistema. Pode salvar nos favoritos do navegador do computador da revenda.

---

## Parte 4 — Primeiro uso

1. Vá em **Estoque** e ajuste a quantidade atual de cada chopp de acordo com o que você tem hoje (consultando o Promax). Se quiser, ajuste também o "alerta abaixo de" de cada produto.
2. Vá em **Clientes** e cadastre sua carteira de clientes.
3. Toda segunda-feira, depois de coletar as respostas no WhatsApp, lance as reservas da semana em **Reservas**.
4. A partir da segunda ou terceira semana de uso, a página **Sugestão de compra** já vai ter histórico suficiente para calcular a média com mais precisão. Antes disso, ela vai se basear só nas reservas já feitas na semana atual.

---

## Atualizando um sistema que já está no ar

1. **Banco**: no SQL Editor do Supabase, rode — na ordem — os arquivos de
   `supabase/migrations/` que você ainda não rodou:

   | Arquivo | O que faz |
   |---|---|
   | `001_clientes_codigo.sql` | clientes com código principal/secundário |
   | `002_setor_cidade_grade.sql` | setor/cidade e grade de reservas |
   | `003_fechamento.sql` | seção de Fechamento (importação do Promax) |
   | `004_sincronizacao_fechamento.sql` | botão de sincronizar fechamento com reservas |
   | `005_seguranca.sql` | reforço de segurança e regras de integridade do banco |

   Na dúvida se já rodou algum, pode rodar de novo: todos foram feitos para
   não estragar nada se executados mais de uma vez.
2. **Variáveis**: confira se as variáveis da Parte 3 estão todas cadastradas
   na Vercel (a `SESSION_SECRET` é nova).
3. **Código**: `git add -A && git commit -m "..." && git push` — a Vercel faz o
   redeploy automaticamente a cada push na branch `main`.

> Na primeira vez depois da atualização de segurança, o sistema vai pedir a
> senha de novo — o formato do cookie de login mudou. Isso é esperado.

---

## Manutenção e dúvidas comuns

**Esqueci a senha de acesso.**
Na Vercel: Project → Settings → Environment Variables → edite `APP_PASSWORD` → Save. Depois vá em Deployments, clique nos "..." do deployment mais recente e escolha **Redeploy**.

**Acho que alguém entrou no sistema / perdi um aparelho que estava logado.**
Troque a `SESSION_SECRET` (e, se a senha pode ter vazado, a `APP_PASSWORD`) na Vercel e faça o **Redeploy**. Todos os aparelhos são desconectados na hora.

**O login diz "Muitas tentativas erradas".**
Depois de 5 senhas erradas seguidas o acesso fica bloqueado por 15 minutos naquela conexão. É só esperar.

**Meus dados estão seguros?**
Sim: o banco fica no Supabase (não no navegador) e a chave de acesso ao banco nunca é exposta ao navegador. O app inteiro fica atrás da senha em `APP_PASSWORD`, o login é protegido contra tentativas repetidas e expira sozinho depois de 7 dias sem uso. No Supabase, as tabelas têm Row Level Security sem nenhuma política de acesso público e as chaves públicas não têm permissão nenhuma — ou seja, não dá para ler nem gravar dados sem passar pelo servidor do app.

**Quero um backup extra dos dados.**
No Supabase, vá em **Table Editor**, abra cada tabela e use **Export** para baixar um CSV. Recomendo fazer isso de tempos em tempos, por precaução.

**Vai custar alguma coisa?**
Para uso de uma pessoa só, os planos gratuitos do Supabase e da Vercel são mais do que suficientes — não deve haver custo.
