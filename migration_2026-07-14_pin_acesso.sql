-- PIN de 4 dígitos por primo, usado como "trava leve" no portal de
-- entrada (/entrar): depois de escolher o próprio avatar (sem nome
-- visível), a pessoa confirma com esse PIN antes de receber o token de
-- acesso. Fica null até o admin gerar um pela primeira vez.
alter table primos
  add column if not exists pin_acesso text;
