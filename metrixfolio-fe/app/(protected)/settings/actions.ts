'use server';

import { adminDb } from '@/utils/firebase-admin';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { Category, CategoryType, CollectionType } from '@/types/settings';
import { Position } from '@/types/positions';

type FormResponse = {
  success: boolean;
  message: string;
  data?: any;
};

function getSettingsRef(userId: string) {
  return adminDb
    .collection(CollectionType.USERS)
    .doc(userId)
    .collection(CollectionType.SETTINGS)
    .doc(CollectionType.CONFIG);
}

function getOpenPositionsRef(userId: string) {
  return adminDb
    .collection(CollectionType.USERS)
    .doc(userId)
    .collection(CollectionType.OPEN_POSITIONS);
}

export async function addCategoryAction(
  userId: string,
  newCategoryName: string,
  newCategoryTarget: number,
  newCategoryType: CategoryType,
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
    const settingsRef = getSettingsRef(userId);
    const newCategory: Category = {
      id: `cat_${Date.now()}`,
      name: newCategoryName.trim(),
      target_percentage: newCategoryTarget ? newCategoryTarget : 0,
      type: newCategoryType,
    };

    await settingsRef.set(
      {
        categories: FieldValue.arrayUnion(newCategory),
      },
      { merge: true },
    );

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
    const settingsRef = getSettingsRef(userId);
    await settingsRef.update({
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
  newCategoryData: {
    name: string;
    target_percentage: number;
    type: CategoryType;
  },
): Promise<FormResponse> {
  if (!userId) return { success: false, message: 'User not authenticated.' };

  const newName = newCategoryData.name.trim();
  const newTarget = newCategoryData.target_percentage;

  if (newName.length === 0 || newTarget <= 0 || newTarget > 100)
    return { success: false, message: 'Invalid name or target percentage.' };

  try {
    const settingsRef = getSettingsRef(userId);

    const updatedCategory: Category = {
      id: oldCategory.id,
      name: newName,
      target_percentage: newTarget,
      type: newCategoryData.type,
    };
    // Remove old category
    await settingsRef.update({
      categories: FieldValue.arrayRemove(oldCategory),
    });
    // Add updated category
    await settingsRef.update({
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

export async function addPositionAction(
  userId: string,
  newPositionData: Omit<Position, 'id' | 'user_id'>,
): Promise<FormResponse> {
  if (!userId) return { success: false, message: 'User not authenticated.' };

  if (newPositionData.amount <= 0 || newPositionData.total_cost <= 0) {
    return { success: false, message: 'Amount must be greater than zero.' };
  }

  try {
    const positionsRef = getOpenPositionsRef(userId);
    const newDocRef = positionsRef.doc();

    const positionToAdd: Position = {
      ...newPositionData,
      id: newDocRef.id,
      user_id: userId,
    };

    await newDocRef.set(positionToAdd, { merge: true });
    return {
      success: true,
      message: `Position added successfully.`,
      data: positionToAdd,
    };
  } catch (error: any) {
    console.error('addPositionAction Error: ', error);
    return { success: false, message: `Server error: ${error.message}` };
  }
}

export async function closePositionAction(
  userId: string,
  positionToClose: Position,
  exitPrice: number,
  exitDateMillis: number,
): Promise<FormResponse> {
  if (!userId) return { success: false, message: 'User not authenticated.' };

  try {
    const closedPositionRef = adminDb
      .collection(CollectionType.USERS)
      .doc(userId)
      .collection(CollectionType.CLOSED_POSITIONS);

    const openPositionRef = getOpenPositionsRef(userId).doc(positionToClose.id);

    const profitLoss =
      (exitPrice - positionToClose.total_cost / positionToClose.amount) *
      positionToClose.amount;

    const exitDate = Timestamp.fromMillis(exitDateMillis);

    const closedPositionData = {
      ...positionToClose,
      exit_price_per_unit: exitPrice,
      exit_date: exitDate,
      profit_loss: profitLoss,
    };

    const batch = adminDb.batch();
    const newClosedRef = closedPositionRef.doc(positionToClose.id);
    batch.set(newClosedRef, closedPositionData);
    batch.delete(openPositionRef);

    await batch.commit();
    return {
      success: true,
      message: `Position '${positionToClose.ticker || positionToClose.currency}' closed.`,
    };
  } catch (error: any) {
    console.error('closePositionAction Error:', error);
    return { success: false, message: `Server error: ${error.message}` };
  }
}
