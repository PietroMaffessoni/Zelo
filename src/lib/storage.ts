import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';

import { supabase } from '@/lib/supabase';

export type Bucket = 'avatars' | 'chamados' | 'achados' | 'portaria' | 'financeiro' | 'documentos';

/** Abre a galeria e retorna o URI local da imagem escolhida (ou null). */
export async function escolherImagem(): Promise<string | null> {
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) return null;
  const res = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    quality: 0.7,
  });
  if (res.canceled || !res.assets?.length) return null;
  return res.assets[0].uri;
}

/** Envia a imagem local para o Storage e retorna a URL pública. */
export async function enviarImagem(bucket: Bucket, localUri: string): Promise<string> {
  const ext = (localUri.split('.').pop()?.split('?')[0] || 'jpg').toLowerCase();
  const nome = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const resp = await fetch(localUri);
  const blob = await resp.blob();
  const { error } = await supabase.storage.from(bucket).upload(nome, blob, {
    contentType: blob.type || `image/${ext}`,
    upsert: false,
  });
  if (error) throw error;
  const { data } = supabase.storage.from(bucket).getPublicUrl(nome);
  return data.publicUrl;
}

/** Escolhe e envia numa etapa. Retorna a URL pública ou null se cancelado. */
export async function escolherEEnviar(bucket: Bucket): Promise<string | null> {
  const uri = await escolherImagem();
  if (!uri) return null;
  return enviarImagem(bucket, uri);
}

/** Abre o seletor de arquivos (PDF ou imagem) e retorna o arquivo escolhido (ou null). */
export async function escolherDocumento(): Promise<{ uri: string; nome: string; tamanho: number | null } | null> {
  const res = await DocumentPicker.getDocumentAsync({
    type: ['application/pdf', 'image/*'],
    copyToCacheDirectory: true,
  });
  if (res.canceled || !res.assets?.length) return null;
  const a = res.assets[0];
  return { uri: a.uri, nome: a.name, tamanho: a.size ?? null };
}

/**
 * Envia um arquivo qualquer (PDF/imagem) para um bucket **privado**, dentro de uma pasta
 * (por convenção, o `condominio_id` — é o que as policies de storage desses buckets checam).
 * Retorna o *path* dentro do bucket, não uma URL — buckets privados exigem `urlAssinada` para leitura.
 */
export async function enviarArquivo(bucket: Bucket, localUri: string, pasta: string, nomeOriginal?: string): Promise<string> {
  const ext = (nomeOriginal ?? localUri).split('.').pop()?.split('?')[0]?.toLowerCase() || 'dat';
  const path = `${pasta}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const resp = await fetch(localUri);
  const blob = await resp.blob();
  const { error } = await supabase.storage.from(bucket).upload(path, blob, {
    contentType: blob.type || undefined,
    upsert: false,
  });
  if (error) throw error;
  return path;
}

/** Gera uma URL temporária de leitura para um arquivo de bucket privado. */
export async function urlAssinada(bucket: Bucket, path: string, expiresIn = 3600): Promise<string> {
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, expiresIn);
  if (error) throw error;
  return data.signedUrl;
}
