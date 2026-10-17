# Alterar a senha do administrador

Abra https://erp.jeffersonthales.com/configuracoes e use a seção Alterar senha.
Informe sua senha atual, uma nova senha exclusiva com pelo menos 15 caracteres e a confirmação.
O limite técnico é 72 bytes em UTF-8 para impedir truncamento pelo bcrypt.
Use preferencialmente um gerenciador de senhas. Não envie senhas pelo chat.

A senha é enviada por HTTPS, validada novamente no servidor e armazenada como hash bcrypt com custo 12.
A alteração exige sessão ativa e origem correta, limita tentativas a cinco por janela de 15 minutos e salva a troca de forma atômica.
Após o sucesso, todas as sessões anteriores perdem acesso aos dados, inclusive em outros dispositivos. Entre novamente usando sua nova senha.
O e-mail autorizado continua sendo jeff.thchaves@gmail.com. A senha atual nunca é mostrada ou recuperada.

Referências:
- https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html
- https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html
