'use server';

import { adminDb } from '@/utils/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';

const CONFIG_PATH = (userId: string) =>
  adminDb
    .collection('users')
    .doc(userId)
    .collection('configuration')
    .doc('main');

export interface GrowthWidgetData {
  startAmount: number;
  targetAmount: number;
  growthRate: number;
  milestones: { step: number; date: string; value: number }[];
}

// 1. Ayarları Kaydetme
export async function saveGrowthSettingsAction(
  userId: string,
  data: Omit<GrowthWidgetData, 'milestones'>,
) {
  if (!userId) return { success: false, message: 'Auth required' };

  try {
    await CONFIG_PATH(userId).set(
      {
        widgets: {
          growth_goals: {
            ...data,
            // Milestones'u koru veya sıfırla? Şimdilik koruyalım, merge: true yetmez, manuel koruma lazım.
            // Basitlik için UI'dan mevcut milestones'u da gönderebiliriz veya merge option kullanırız.
          },
        },
      },
      { merge: true },
    );

    return { success: true };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}

// 2. Milestone Kontrolü (Sayfa yüklendiğinde çalışacak)
export async function checkMilestonesAction(
  userId: string,
  currentPortfolioValue: number,
) {
  if (!userId) return;

  const ref = CONFIG_PATH(userId);
  const doc = await ref.get();

  if (!doc.exists) return;

  const widgets = doc.data()?.widgets || {};
  const growth = widgets.growth_goals as GrowthWidgetData;

  if (!growth) return;

  let loopVal = growth.startAmount;
  let step = 1;
  const rate = growth.growthRate / 100;
  const newMilestones = [...(growth.milestones || [])];
  let updated = false;

  // Hedefe kadar döngü
  while (loopVal < growth.targetAmount) {
    const nextVal = loopVal + loopVal * rate;

    // Eğer şu anki portföy değeri bu basamağı geçtiyse VE daha önce kaydedilmediyse
    if (currentPortfolioValue >= nextVal) {
      const exists = newMilestones.find((m) => m.step === step);
      if (!exists) {
        newMilestones.push({
          step,
          value: nextVal,
          date: new Date().toISOString().split('T')[0], // Bugünün tarihi
        });
        updated = true;
      }
    }

    loopVal = nextVal;
    step++;

    // Sonsuz döngü koruması (Max 1000 adım)
    if (step > 1000) break;
  }

  if (updated) {
    // Sadece milestones alanını güncelle
    await ref.update({
      'widgets.growth_goals.milestones': newMilestones,
    });
    return { success: true, newMilestones };
  }

  return { success: false };
}

export async function getGrowthWidgetAction(
  userId: string,
): Promise<GrowthWidgetData | null> {
  const doc = await CONFIG_PATH(userId).get();
  return doc.data()?.widgets?.growth_goals || null;
}
