import { useRouter } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { AppHeader, AppText, Button, Chip, Input, Screen } from '@/components/ui';
import { spacing } from '@/constants/theme';
import { useAuth } from '@/lib/auth';
import { criarVeiculo } from '@/lib/db';
import { tipoVeiculoLabel } from '@/lib/labels';
import type { TipoVeiculo } from '@/lib/types';

const tipos: TipoVeiculo[] = ['carro', 'moto', 'outro'];

export default function NovoVeiculo() {
  const router = useRouter();
  const { condominioId, user, membershipAtual } = useAuth();
  const unidadeId = membershipAtual?.unidade_id ?? null;

  const [placa, setPlaca] = useState('');
  const [modelo, setModelo] = useState('');
  const [cor, setCor] = useState('');
  const [tipo, setTipo] = useState<TipoVeiculo>('carro');
  const [vaga, setVaga] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  async function salvar() {
    if (!placa.trim()) return setErro('Informe a placa do veículo.');
    if (!condominioId || !unidadeId) return;
    setSalvando(true);
    setErro(null);
    try {
      await criarVeiculo({
        condominio_id: condominioId,
        unidade_id: unidadeId,
        proprietario_id: user?.id ?? null,
        placa: placa.trim(),
        modelo: modelo.trim() || null,
        cor: cor.trim() || null,
        tipo,
        vaga: vaga.trim() || null,
      });
      router.back();
    } catch (e: any) {
      setErro(e?.message?.includes('duplicate') ? 'Esse veículo já está cadastrado.' : e?.message ?? 'Não foi possível cadastrar.');
      setSalvando(false);
    }
  }

  return (
    <Screen>
      <AppHeader title="Novo veículo" back />
      <View style={{ gap: spacing.lg }}>
        <Input label="Placa" placeholder="ABC1D23" autoCapitalize="characters" value={placa} onChangeText={setPlaca} />

        <View style={{ gap: spacing.sm }}>
          <AppText variant="label" color="muted">Tipo</AppText>
          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            {tipos.map((t) => (
              <Chip key={t} label={tipoVeiculoLabel[t].label} selected={tipo === t} onPress={() => setTipo(t)} />
            ))}
          </View>
        </View>

        <View style={{ flexDirection: 'row', gap: spacing.md }}>
          <View style={{ flex: 1 }}>
            <Input label="Modelo (opcional)" placeholder="Ex.: Onix" value={modelo} onChangeText={setModelo} />
          </View>
          <View style={{ flex: 1 }}>
            <Input label="Cor (opcional)" placeholder="Ex.: Prata" value={cor} onChangeText={setCor} />
          </View>
        </View>
        <Input label="Vaga (opcional)" placeholder="Ex.: G-12" value={vaga} onChangeText={setVaga} />

        {erro ? <AppText color="danger" variant="label">{erro}</AppText> : null}

        <Button title="Cadastrar veículo" icon="checkmark" onPress={salvar} loading={salvando} size="lg" />
      </View>
    </Screen>
  );
}
