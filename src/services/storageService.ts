import { supabase } from './supabase';

const BUCKET_NAME = 'product-images';

/**
 * Uploads a product image file to the Supabase 'product-images' storage bucket
 * and returns the permanent public URL.
 */
export async function uploadProductImage(file: File): Promise<string> {
  const fileExt = file.name.split('.').pop()?.toLowerCase() || 'jpg';
  const cleanName = file.name.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 20);
  const fileName = `${Date.now()}_${cleanName}.${fileExt}`;
  const filePath = `products/${fileName}`;

  const { data, error } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: false,
    });

  if (error) {
    console.error('Supabase storage upload error:', error);
    throw new Error(error.message || 'Failed to upload image to Supabase Storage');
  }

  const { data: publicData } = supabase.storage
    .from(BUCKET_NAME)
    .getPublicUrl(data.path);

  return publicData.publicUrl;
}

/**
 * Deletes a product image from Supabase Storage by its public URL.
 */
export async function deleteProductImage(publicUrl: string): Promise<boolean> {
  try {
    const url = new URL(publicUrl);
    const pathParts = url.pathname.split(`/storage/v1/object/public/${BUCKET_NAME}/`);
    if (pathParts.length < 2) return false;
    const filePath = decodeURIComponent(pathParts[1]);

    const { error } = await supabase.storage
      .from(BUCKET_NAME)
      .remove([filePath]);

    if (error) {
      console.warn('Failed to delete image from Supabase Storage:', error);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('Error parsing image URL for deletion:', err);
    return false;
  }
}
