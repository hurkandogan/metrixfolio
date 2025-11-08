'use server';

import { adminDb } from '@/utils/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { Category, ManualAsset } from '@/types/settings';

type FormResponse = {
  success: boolean;
  message: string;
  data?: any;
};

export enum CollectionType {
  USER_SETTINGS = 'user_settings',
  MANUAL_ASSETS = 'manual_assets',
}

enum ConnectionType {
  KRAKEN = 'kraken',
}

export async function addCategoryAction(
  userId: string,
  newCategoryName: string,
  newCategoryTarget: number,
): Promise<FormResponse> {
  if (!userId) return { success: false, message: 'User not authenticated.' };
  if (newCategoryName.trim().length === 0)
    return { success: false, message: 'Category name cannot be empty.' };
  if (newCategoryTarget && (newCategoryTarget <= 0 || newCategoryTarget > 100))
    return {
      success: false,
      message: 'Target percentage must be between 1 and 100.',
    };

  try {
    const docRef = adminDb.collection(CollectionType.USER_SETTINGS).doc(userId);
    const newCategory: Category = {
      id: `cat_${Date.now()}`,
      name: newCategoryName.trim(),
      target_percentage: newCategoryTarget ? newCategoryTarget : 0,
    };
    await docRef.update({
      categories: FieldValue.arrayUnion(newCategory),
    });
    return {
      success: true,
      message: `Category '${newCategory.name}' added successfully.`,
      data: newCategory,
    };
  } catch (error: any) {
    console.error('addCategoryAction Error:', error);
    return { success: false, message: `Server error: ${error.message}` };
  }
}

export async function deleteCategoryAction(
  userId: string,
  categoryToDelete: Category,
): Promise<FormResponse> {
  if (!userId) return { success: false, message: 'User not authenticated.' };

  try {
    const docRef = adminDb.collection(CollectionType.USER_SETTINGS).doc(userId);
    await docRef.update({
      categories: FieldValue.arrayRemove(categoryToDelete),
    });
    return {
      success: true,
      message: `Category '${categoryToDelete.name}' deleted.`,
    };
  } catch (error: any) {
    console.error('deleteCategoryAction Error:', error);
    return { success: false, message: `Server error: ${error.message}` };
  }
}

export async function updateCategoryAction(
  userId: string,
  oldCategory: Category,
  newCategoryData: { name: string; target_percentage: number },
): Promise<FormResponse> {
  if (!userId) return { success: false, message: 'User not authenticated.' };

  const newName = newCategoryData.name.trim();
  const newTarget = newCategoryData.target_percentage;

  if (newName.length === 0 || newTarget <= 0 || newTarget > 100)
    return { success: false, message: 'Invalid name or target percentage.' };

  try {
    const docRef = adminDb.collection('user_settings').doc(userId);

    const updatedCategory: Category = {
      id: oldCategory.id,
      name: newName,
      target_percentage: newTarget,
    };

    await docRef.update({
      categories: FieldValue.arrayRemove(oldCategory),
    });
    await docRef.update({
      categories: FieldValue.arrayUnion(updatedCategory),
    });

    return {
      success: true,
      message: `Category '${updatedCategory.name}' updated.`,
      data: updatedCategory,
    };
  } catch (error: any) {
    console.error('updateCategoryAction Error:', error);
    return { success: false, message: `Server error: ${error.message}` };
  }
}

export async function addAssetAction(
  userId: string,
  newAsset: Omit<ManualAsset, 'id'>,
): Promise<FormResponse> {
  if (!userId) return { success: false, message: 'User not authenticated.' };

  if (newAsset.ticker.trim().length === 0 || newAsset.amount <= 0)
    return { success: false, message: 'Ticket and amount are required!' };

  try {
    const docRef = adminDb.collection(CollectionType.USER_SETTINGS).doc(userId);
    const assetToAdd: ManualAsset = {
      ...newAsset,
      id: `asset_${Date.now()}`,
    };
    await docRef.update({
      [CollectionType.MANUAL_ASSETS]: FieldValue.arrayUnion(assetToAdd),
    });
    return {
      success: true,
      message: `Asset '${assetToAdd.ticker}' added successfully.`,
      data: assetToAdd,
    };
  } catch (error: any) {
    console.error('addAssetActionError: ', error);
    return { success: false, message: `Server error: ${error.message}` };
  }
}

export async function deleteAssetAction(
  userId: string,
  assetToDelete: ManualAsset,
): Promise<FormResponse> {
  if (!userId) return { success: false, message: 'User not authenticated.' };

  try {
    const docRef = adminDb.collection(CollectionType.USER_SETTINGS).doc(userId);
    await docRef.update({
      [CollectionType.MANUAL_ASSETS]: FieldValue.arrayRemove(assetToDelete),
    });
    return {
      success: true,
      message: `Asset '${assetToDelete.ticker}' deleted.`,
    };
  } catch (error: any) {
    console.error('deleteAssetAction Error:', error);
    return { success: false, message: `Server error: ${error.message}` };
  }
}
