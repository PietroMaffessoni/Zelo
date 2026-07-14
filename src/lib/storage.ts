import * as ImagePicker from 'expo-image-picker';

import { supabase } from '@/lib/supabase';

export type Bucket = 'avatars' | 'chamados' | 'achados' | 'portaria';

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
