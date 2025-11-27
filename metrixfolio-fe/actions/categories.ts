'use server';

import { adminDb } from '@/utils/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { Category, CollectionType } from '@/types/settings';
import { auth } from 'firebase-admin';

const getConfigRef = (userId: string) =>
  adminDb
    .collection(CollectionType.USERS)
    .doc(userId)
    .collection(CollectionType.CONFIG)
    .doc('main');

export async function addCategoryAction(
  userId: string,
  name: string,
  target: number,
  type: string,
) {
  if (!name)
    return { success: false, message: 'Category name cannot be empty.' };

  try {
    const newCategory: Category = {
      id: `cat_${Date.now()}`,
      name: name.trim(),
      target_percentage: target,
      type: type as any,
    };

    const ref = getConfigRef(userId);

    await ref.set(
      {
        categories: FieldValue.arrayUnion(newCategory),
        base_currency: 'USD',
      },
      { merge: true },
    );

    return {
      success: true,
      message: 'Category added',
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
