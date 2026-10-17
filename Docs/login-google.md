# Login do ERP Pessoal

Endereço oficial: https://erp.jeffersonthales.com
Único administrador autorizado: jeff.thchaves@gmail.com.
A conta existente e seu identificador no banco são preservados. Não há cadastro público.
O login com senha continua disponível. Tokens de sessão com outro e-mail são recusados no servidor.

## Ativar Google

1. No Google Cloud Console, crie ou selecione um projeto e configure o Google Auth Platform com o nome ERP Pessoal e seu e-mail de suporte.
2. Configure o público e permita seu próprio e-mail como usuário de teste, caso o aplicativo esteja em teste.
3. Crie um cliente OAuth do tipo Aplicativo da Web.
4. Origem autorizada: `https://erp.jeffersonthales.com`.
5. URI de redirecionamento autorizada, exatamente: `https://erp.jeffersonthales.com/api/auth/google/callback`.
6. Grave `GOOGLE_CLIENT_ID` e `GOOGLE_CLIENT_SECRET` no arquivo privado `/docker/erp-inova/.env` da VPS. Não envie o segredo pelo chat e não faça commit do JSON de credenciais.
7. Aplique as variáveis com `docker compose up -d --no-deps app`, executado em `/docker/erp-inova`. Não é necessário recompilar a imagem.
8. O botão Entrar com Google aparece quando ambas as variáveis estão preenchidas. Teste a entrada com sua conta autorizada.

A aplicação pede somente os escopos `openid email`; verifica a assinatura do Google, o destinatário do token, a expiração, o nonce e o e-mail verificado. Usa estado assinado e PKCE. Qualquer outra conta Google é recusada, mesmo que consiga passar pela tela de consentimento.
Não cria usuários nem armazena access tokens ou refresh tokens do Google.

Ao mudar de domínio, faça login novamente: o cookie do endereço anterior não é compartilhado com o novo.

Referência: https://developers.google.com/identity/openid-connect/openid-connect
