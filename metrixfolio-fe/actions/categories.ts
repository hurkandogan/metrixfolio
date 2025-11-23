'use server';

import { adminDb } from '@/utils/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { Category, CollectionType } from '@/types/settings';
import { auth } from 'firebase-admin';

// Helper: Config Döküman Referansı
// PATH: users/{userId}/configuration/main
const getConfigRef = (userId: string) =>
  adminDb
    .collection(CollectionType.USERS)
    .doc(userId)
    .collection(CollectionType.CONFIG)
    .doc('main');

export async function addCategoryAction(
  userId: string, // Bunu client'tan değil, session'dan almak daha güvenli ama şimdilik böyle
  name: string,
  target: number,
  type: string,
) {
  if (!name) return { success: false, message: 'Kategori adı boş olamaz' };

  try {
    const newCategory: Category = {
      id: `cat_${Date.now()}`, // Benzersiz ID
      name: name.trim(),
      target_percentage: target,
      type: type as any,
    };

    const ref = getConfigRef(userId);

    // arrayUnion: Varsa ekler, yoksa dökümanı oluşturur ve ekler
    await ref.set(
      {
        categories: FieldValue.arrayUnion(newCategory),
        // Eğer döküman hiç yoksa base_currency de ekleyelim varsayılan olarak
        base_currency: 'USD',
      },
      { merge: true },
    );

    return {
      success: true,
      message: 'Kategori eklendi',
      category: newCategory,
    };
  } catch (error: any) {
    console.error('Add Category Error:', error);
    return { success: false, message: error.message };
  }
}

export async function getCategoriesAction(userId: string): Promise<Category[]> {
  try {
    const doc = await getConfigRef(userId).get();
    if (doc.exists) {
      const data = doc.data();
      return data?.categories || [];
    }
    return [];
  } catch (error) {
    console.error('Get Categories Error:', error);
    return [];
  }
}

export async function deleteCategoryAction(userId: string, category: Category) {
  try {
    await getConfigRef(userId).update({
      categories: FieldValue.arrayRemove(category),
    });
    return { success: true };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}
