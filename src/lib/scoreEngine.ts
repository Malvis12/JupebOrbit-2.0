import { doc, updateDoc, collection, getDocs, query } from 'firebase/firestore';
import { db } from './firebase';

/**
 * PROFESSIONAL JUPEB SCORE ENGINE
 * Implements: 
 * - Confidence-Weighted Mastery (Mocks = 3x weight, Practice = 1x)
 * - JUPEB Bonus Point (+1 for no F-grades)
 * - Admission Risk Flagging
 */
export async function updateAggregateScore(uid: string): Promise<void> {
  try {
    const histRef = collection(db, 'users', uid, 'examHistory');
    const snapshot = await getDocs(query(histRef));

    if (snapshot.empty) return;

    const subjectGroups: Record<string, Array<{ percentage: number; weight: number }>> = {};
    const now = new Date();

    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      const sub = (data.subject || 'General').toLowerCase();
      if (!subjectGroups[sub]) subjectGroups[sub] = [];

      const timestamp = data.timestamp ? new Date(data.timestamp).getTime() : now.getTime();
      const ageDays = (now.getTime() - timestamp) / (1000 * 60 * 60 * 24);

      // 1. Recency Weight (Time Decay)
      let recencyWeight = 0.2;
      if (ageDays <= 7) recencyWeight = 1.0;
      else if (ageDays <= 21) recencyWeight = 0.6;

      // 2. Confidence Weight (Mocks carry 3x more predictive value than Practice)
      const isMock = data.mode === 'Mock Simulator' || (data.maxScore && data.maxScore >= 40);
      const confidenceWeight = isMock ? 3.0 : 1.0;

      const maxScore = data.maxScore || 1;
      const score = data.score || 0;

      subjectGroups[sub].push({
        percentage: (score / maxScore) * 100,
        weight: recencyWeight * confidenceWeight
      });
    });

    let totalJupebPoints = 0;
    let hasFGrade = false;
    const newMastery: Record<string, number> = {};
    const subjectGrades: Record<string, string> = {};

    for (const sub in subjectGroups) {
      const runs = subjectGroups[sub];
      let weightedSum = 0;
      let weightTotal = 0;

      runs.forEach(run => {
        weightedSum += (run.percentage * run.weight);
        weightTotal += run.weight;
      });

      const subjectAverage = weightTotal > 0 ? weightedSum / weightTotal : 0;
      newMastery[sub] = subjectAverage / 100;

      // Map to JUPEB Points
      let points = 0;
      let grade = 'F';

      if (subjectAverage >= 70) { points = 5; grade = 'A'; }
      else if (subjectAverage >= 60) { points = 4; grade = 'B'; }
      else if (subjectAverage >= 50) { points = 3; grade = 'C'; }
      else if (subjectAverage >= 45) { points = 2; grade = 'D'; }
      else if (subjectAverage >= 40) { points = 1; grade = 'E'; }
      else { points = 0; grade = 'F'; hasFGrade = true; }

      totalJupebPoints += points;
      subjectGrades[sub] = grade;
    }

    // 3. THE 16th POINT (Official JUPEB Bonus)
    // One bonus point is awarded if a candidate has no F grade across at least 3 subjects.
    let bonusPoint = 0;
    const subjectCount = Object.keys(subjectGroups).filter(s => s !== 'general' && s !== 'daily mix').length;
    if (subjectCount >= 3 && !hasFGrade) {
      bonusPoint = 1;
    }

    const finalAggregate = Math.min(totalJupebPoints + bonusPoint, 16);

    const userRef = doc(db, 'users', uid);
    await updateDoc(userRef, {
      aggregateScore: finalAggregate,
      mastery: newMastery,
      subjectGrades: subjectGrades,
      hasAdmissionRisk: hasFGrade,
      bonusPointAwarded: bonusPoint > 0,
      lastCalculated: new Date().toISOString()
    });
  } catch (e) {
    console.error('Error in Professional Score Engine:', e);
  }
}

