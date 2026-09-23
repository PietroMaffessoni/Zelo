/**
 * Recuperação de senha em duas etapas na MESMA tela.
 *
 * Antes daqui saía um "link de recuperação" que, no celular, abria o navegador
 * e não voltava para o app — a pessoa recebia o e-mail e mesmo assim não
 * conseguia trocar a senha. Ver `definirNovaSenha` em `@/lib/auth` para por que
 * o código de seis dígitos substituiu o link.
 *
 * As duas etapas não podem virar duas telas: confirmar o código já abre sessão,
 * e o guarda de rota levaria a pessoa para dentro do app antes de ela escolher a
 * senha. Por isso código e senha nova são pedidos juntos.
 */
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { AppHeader, AppText, Button, Card, Input, Screen } from '@/components/ui';
import { spacing } from '@/constants/theme';
import { useAuth } from '@/lib/auth';
import { hapticSuccess } from '@/lib/haptics';
import { useToast } from '@/lib/toast';

const MINIMO_SENHA = 8;

export default function EsqueciSenha() {
  const router = useRouter();
  const { resetarSenha, definirNovaSenha } = useAuth();
  const toast = useToast();

  const [email, setEmail] = useState('');
  const [codigo, setCodigo] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [enviado, setEnviado] = useState(false);
  const [carregando, setCarregando] = useState(false);

  async function enviar() {
    if (!email.trim()) {
      setErro('Informe seu e-mail.');
      return;
    }
    setCarregando(true);
    setErro(null);
    const { error } = await resetarSenha(email);
    setCarregando(false);
    if (error) {
      setErro(error);
      return;
    }
    setEnviado(true);
    hapticSuccess();
    toast.sucesso('Código enviado por e-mail');
  }

  async function confirmar() {
    if (codigo.trim().length < 6) {
      setErro('Digite o código de 6 dígitos que enviamos.');
      return;
    }
    if (senha.length < MINIMO_SENHA) {
      setErro(`A nova senha deve ter no mínimo ${MINIMO_SENHA} caracteres.`);
      return;
    }
    setCarregando(true);
    setErro(null);
    const { error } = await definirNovaSenha(email, codigo, senha);
    setCarregando(false);
    if (error) {
      setErro(error);
      return;
    }
    hapticSuccess();
    toast.sucesso('Senha alterada');
    // Confirmar o código já deixou a sessão aberta: o guarda de rota leva daqui
    // para dentro do app sozinho. Esta rota volta para o login só se isso falhar.
    router.replace('/');
  }

  return (
    <Screen maxWidth={400}>
      <AppHeader title="Recuperar senha" back />

      {enviado ? (
        <View style={{ gap: spacing.lg, marginTop: spacing.lg }}>
          <Card style={{ gap: spacing.sm }}>
            <AppText variant="subtitle">Confira seu e-mail</AppText>
            <AppText color="muted" variant="caption">
              Se houver uma conta com <AppText variant="label">{email.trim()}</AppText>, enviamos um
              código de 6 dígitos. Verifique também a caixa de spam.
            </AppText>
          </Card>

          <Input
            label="Código de 6 dígitos"
            placeholder="000000"
            icon="keypad-outline"
            keyboardType="number-pad"
            autoCapitalize="none"
            maxLength={6}
            value={codigo}
            onChangeText={(t) => {
              setCodigo(t.replace(/\D/g, ''));
              if (erro) setErro(null);
            }}
          />
          <Input
            label="Nova senha"
            placeholder="Mínimo de 8 caracteres"
            icon="lock-closed-outline"
            senha
            value={senha}
            onChangeText={(t) => {
              setSenha(t);
              if (erro) setErro(null);
            }}
            error={erro ?? undefined}
            onSubmitEditing={confirmar}
          />

          <Button title="Salvar nova senha" onPress={confirmar} loading={carregando} size="lg" />
          <Button
            title="Não recebi — enviar de novo"
            variant="ghost"
            onPress={() => {
              setCodigo('');
              setSenha('');
              setEnviado(false);
            }}
          />
        </View>
      ) : (
        <View style={{ gap: spacing.lg, marginTop: spacing.lg }}>
          <AppText color="muted" variant="caption">
            Digite o e-mail cadastrado e enviaremos um código para você criar uma nova senha.
          </AppText>
          <Input
            label="E-mail"
            placeholder="voce@email.com"
            icon="mail-outline"
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={(t) => {
              setEmail(t);
              if (erro) setErro(null);
            }}
            error={erro ?? undefined}
            onSubmitEditing={enviar}
          />
          <Button title="Enviar código" onPress={enviar} loading={carregando} size="lg" />
        </View>
      )}
    </Screen>
  );
}
