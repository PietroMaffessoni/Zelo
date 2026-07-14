import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { AppHeader, AppText, Avatar, Badge, Button, Card, Chip, Divider, Input, Loading, Screen } from '@/components/ui';
import { palette, radius, spacing, tone as tones } from '@/constants/theme';
import { useAuth } from '@/lib/auth';
import {
  atualizarPapelMorador,
  atualizarVinculoMorador,
  criarDependente,
  criarPet,
  getUnidade,
  removerDependente,
  removerMoradorDaUnidade,
  removerPet,
} from '@/lib/db';
import { especiePetLabel, papelLabel, vinculoLabel } from '@/lib/labels';
import { isGestor, type EspeciePet, type Vinculo } from '@/lib/types';
import { useFetch } from '@/lib/useFetch';

const vinculos: Vinculo[] = ['proprietario', 'inquilino', 'dependente'];
const especies: EspeciePet[] = ['cachorro', 'gato', 'outro'];

export default function UnidadeDetalhe() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { condominioId, membershipAtual, papel } = useAuth();
  const gestor = isGestor(papel);
  const souDaUnidade = membershipAtual?.unidade_id === id;
  const podeGerenciar = gestor || souDaUnidade;

  const { data: unidade, loading, refetch } = useFetch(() => getUnidade(id), [id]);

  const [mudandoVinculo, setMudandoVinculo] = useState<string | null>(null);
  const [removendoMorador, setRemovendoMorador] = useState<string | null>(null);

  const [formDependente, setFormDependente] = useState(false);
  const [nomeDep, setNomeDep] = useState('');
  const [parentesco, setParentesco] = useState('');
  const [salvandoDep, setSalvandoDep] = useState(false);

  const [formPet, setFormPet] = useState(false);
  const [nomePet, setNomePet] = useState('');
  const [especiePet, setEspeciePet] = useState<EspeciePet>('cachorro');
  const [salvandoPet, setSalvandoPet] = useState(false);

  async function mudarVinculo(membershipId: string, v: Vinculo) {
    setMudandoVinculo(membershipId);
    await atualizarVinculoMorador(membershipId, v);
    setMudandoVinculo(null);
    refetch();
  }

  async function remover(membershipId: string) {
    setRemovendoMorador(membershipId);
    await removerMoradorDaUnidade(membershipId);
    setRemovendoMorador(null);
    refetch();
  }

  async function alternarConselheiro(membershipId: string, atual: 'morador' | 'conselheiro') {
    setMudandoVinculo(membershipId);
    await atualizarPapelMorador(membershipId, atual === 'conselheiro' ? 'morador' : 'conselheiro');
    setMudandoVinculo(null);
    refetch();
  }

  async function salvarDependente() {
    if (!nomeDep.trim() || !condominioId) return;
    setSalvandoDep(true);
    await criarDependente({
      condominio_id: condominioId,
      unidade_id: id,
      nome: nomeDep.trim(),
      parentesco: parentesco.trim() || null,
    });
    setNomeDep('');
    setParentesco('');
    setFormDependente(false);
    setSalvandoDep(false);
    refetch();
  }

  async function salvarPet() {
    if (!nomePet.trim() || !condominioId) return;
    setSalvandoPet(true);
    await criarPet({
      condominio_id: condominioId,
      unidade_id: id,
      nome: nomePet.trim(),
      especie: especiePet,
    });
    setNomePet('');
    setEspeciePet('cachorro');
    setFormPet(false);
    setSalvandoPet(false);
    refetch();
  }

  if (loading || !unidade)
    return (
      <Screen>
        <AppHeader title="Unidade" back />
        {loading ? <Loading /> : <AppText color="muted" center>Unidade não encontrada.</AppText>}
      </Screen>
    );

  return (
    <Screen>
      <AppHeader
        title={unidade.bloco ? `Bloco ${unidade.bloco} · ${unidade.numero}` : `Unidade ${unidade.numero}`}
        back
        subtitle={unidade.observacoes ?? undefined}
      />

      {/* Moradores */}
      <AppText variant="subtitle" style={{ marginTop: spacing.md, marginBottom: spacing.sm }}>
        Moradores
      </AppText>
      {unidade.moradores.length === 0 ? (
        <Card>
          <AppText color="muted">Nenhum morador vinculado a esta unidade ainda.</AppText>
        </Card>
      ) : (
        <View style={{ gap: spacing.sm }}>
          {unidade.moradores.map((m) => (
            <Card key={m.id}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
                <Avatar nome={m.profile?.nome_completo} url={m.profile?.avatar_url} size={40} />
                <View style={{ flex: 1 }}>
                  <AppText variant="label" numberOfLines={1}>
                    {m.profile?.nome_completo || 'Morador'}
                  </AppText>
                  <View style={{ flexDirection: 'row', gap: spacing.xs, marginTop: 2 }}>
                    <Badge label={vinculoLabel[m.vinculo].label} tone={vinculoLabel[m.vinculo].tone} />
                    {m.papel !== 'morador' ? <Badge label={papelLabel[m.papel]} tone="primary" /> : null}
                  </View>
                </View>
                {gestor ? (
                  <Pressable onPress={() => remover(m.id)} hitSlop={8} disabled={removendoMorador === m.id}>
                    <Ionicons name="close-circle-outline" size={22} color={palette.danger} />
                  </Pressable>
                ) : null}
              </View>
              {gestor ? (
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginTop: spacing.sm }}>
                  {vinculos.map((v) => {
                    const meta = vinculoLabel[v];
                    const ativo = m.vinculo === v;
                    return (
                      <Pressable
                        key={v}
                        disabled={mudandoVinculo === m.id}
                        onPress={() => mudarVinculo(m.id, v)}
                        style={{
                          paddingHorizontal: spacing.md,
                          paddingVertical: 6,
                          borderRadius: radius.full,
                          borderWidth: 1.5,
                          borderColor: ativo ? tones[meta.tone].fg : palette.border,
                          backgroundColor: ativo ? tones[meta.tone].bg : palette.surface,
                        }}
                      >
                        <AppText variant="caption" style={{ color: ativo ? tones[meta.tone].fg : palette.textMuted }}>
                          {meta.label}
                        </AppText>
                      </Pressable>
                    );
                  })}
                </View>
              ) : null}
              {gestor && (m.papel === 'morador' || m.papel === 'conselheiro') ? (
                <Pressable
                  onPress={() => alternarConselheiro(m.id, m.papel as 'morador' | 'conselheiro')}
                  disabled={mudandoVinculo === m.id}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: spacing.sm }}
                  hitSlop={6}
                >
                  <Ionicons
                    name={m.papel === 'conselheiro' ? 'star' : 'star-outline'}
                    size={16}
                    color={m.papel === 'conselheiro' ? palette.warning : palette.textMuted}
                  />
                  <AppText variant="caption" color={m.papel === 'conselheiro' ? 'default' : 'muted'}>
                    {m.papel === 'conselheiro' ? 'Conselheiro — toque para remover' : 'Tornar conselheiro'}
                  </AppText>
                </Pressable>
              ) : null}
            </Card>
          ))}
        </View>
      )}

      {/* Dependentes */}
      <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: spacing.xl, marginBottom: spacing.sm }}>
        <AppText variant="subtitle" style={{ flex: 1 }}>
          Dependentes
        </AppText>
        {podeGerenciar ? (
          <Pressable onPress={() => setFormDependente((v) => !v)} hitSlop={8}>
            <Ionicons name={formDependente ? 'close-outline' : 'add-circle-outline'} size={24} color={palette.primary} />
          </Pressable>
        ) : null}
      </View>
      {formDependente ? (
        <Card style={{ marginBottom: spacing.sm, gap: spacing.md }}>
          <Input label="Nome" placeholder="Nome completo" value={nomeDep} onChangeText={setNomeDep} />
          <Input label="Parentesco (opcional)" placeholder="Ex.: Filho(a)" value={parentesco} onChangeText={setParentesco} />
          <Button title="Adicionar" size="sm" onPress={salvarDependente} loading={salvandoDep} fullWidth={false} icon="checkmark" />
        </Card>
      ) : null}
      {unidade.dependentes.length === 0 ? (
        <AppText color="subtle" variant="caption">
          Nenhum dependente cadastrado.
        </AppText>
      ) : (
        <Card>
          {unidade.dependentes.map((d, i) => (
            <View key={d.id}>
              {i > 0 ? <Divider style={{ marginVertical: spacing.sm }} /> : null}
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View style={{ flex: 1 }}>
                  <AppText variant="label">{d.nome}</AppText>
                  {d.parentesco ? (
                    <AppText color="muted" variant="caption">
                      {d.parentesco}
                    </AppText>
                  ) : null}
                </View>
                {podeGerenciar ? (
                  <Pressable onPress={() => removerDependente(d.id).then(refetch)} hitSlop={8}>
                    <Ionicons name="trash-outline" size={18} color={palette.textSubtle} />
                  </Pressable>
                ) : null}
              </View>
            </View>
          ))}
        </Card>
      )}

      {/* Pets */}
      <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: spacing.xl, marginBottom: spacing.sm }}>
        <AppText variant="subtitle" style={{ flex: 1 }}>
          Pets
        </AppText>
        {podeGerenciar ? (
          <Pressable onPress={() => setFormPet((v) => !v)} hitSlop={8}>
            <Ionicons name={formPet ? 'close-outline' : 'add-circle-outline'} size={24} color={palette.primary} />
          </Pressable>
        ) : null}
      </View>
      {formPet ? (
        <Card style={{ marginBottom: spacing.sm, gap: spacing.md }}>
          <Input label="Nome" placeholder="Nome do pet" value={nomePet} onChangeText={setNomePet} />
          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            {especies.map((e) => (
              <Chip key={e} label={especiePetLabel[e].label} selected={especiePet === e} onPress={() => setEspeciePet(e)} />
            ))}
          </View>
          <Button title="Adicionar" size="sm" onPress={salvarPet} loading={salvandoPet} fullWidth={false} icon="checkmark" />
        </Card>
      ) : null}
      {unidade.pets.length === 0 ? (
        <AppText color="subtle" variant="caption">
          Nenhum pet cadastrado.
        </AppText>
      ) : (
        <Card>
          {unidade.pets.map((p, i) => {
            const meta = especiePetLabel[p.especie];
            return (
              <View key={p.id}>
                {i > 0 ? <Divider style={{ marginVertical: spacing.sm }} /> : null}
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                  <View style={{ flex: 1 }}>
                    <AppText variant="label">{p.nome}</AppText>
                    <Badge label={meta.label} tone={meta.tone} style={{ marginTop: 2 }} />
                  </View>
                  {podeGerenciar ? (
                    <Pressable onPress={() => removerPet(p.id).then(refetch)} hitSlop={8}>
                      <Ionicons name="trash-outline" size={18} color={palette.textSubtle} />
                    </Pressable>
                  ) : null}
                </View>
              </View>
            );
          })}
        </Card>
      )}
    </Screen>
  );
}
