import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase-admin";
import { stripUndefined } from "@/lib/stripUndefined";
import type { BenchReservation } from "@/types/move-os";
import { getMoveOsLevers } from "./config";
import { ensureMoveItinerary } from "./itinerary";
import { notifyMoveOsParty } from "./notify";

function addHoursIso(hours: number): string {
  return new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();
}

export async function listReadyBenchStudents(
  limit = 40,
): Promise<Array<Record<string, unknown> & { id: string }>> {
  const snap = await adminDb
    .collection("students")
    .where("benchStatus", "==", "ready")
    .limit(limit)
    .get();
  return snap.docs.map((doc) => ({
    id: doc.id,
    ...(doc.data() as Record<string, unknown>),
  }));
}

export async function reserveBenchSeat(input: {
  companyId: string;
  studentId: string;
  matchId?: string | null;
}): Promise<BenchReservation> {
  const studentRef = adminDb.collection("students").doc(input.studentId);
  const studentSnap = await studentRef.get();
  if (!studentSnap.exists) throw new Error("student_not_found");
  const benchStatus = String(studentSnap.data()?.benchStatus ?? "");
  if (benchStatus !== "ready") throw new Error("student_not_bench_ready");

  const levers = await getMoveOsLevers();
  const ref = adminDb.collection("bench_reservations").doc();
  const expiresAt = addHoursIso(levers.benchHoldHours);
  const reservation = stripUndefined({
    id: ref.id,
    companyId: input.companyId,
    studentId: input.studentId,
    matchId: input.matchId ?? null,
    status: "held" as const,
    expiresAt,
    createdAt: new Date().toISOString(),
  });

  await adminDb.runTransaction(async (tx) => {
    const fresh = await tx.get(studentRef);
    if (String(fresh.data()?.benchStatus ?? "") !== "ready") {
      throw new Error("student_not_bench_ready");
    }
    tx.set(ref, {
      ...reservation,
      createdAt: FieldValue.serverTimestamp(),
    });
    tx.set(
      studentRef,
      stripUndefined({
        benchStatus: "reserved",
        benchReservedBy: input.companyId,
        benchReservationId: ref.id,
        benchReservedUntil: expiresAt,
      }),
      { merge: true },
    );
  });

  if (input.matchId) {
    await ensureMoveItinerary({
      matchId: input.matchId,
      studentId: input.studentId,
      companyId: input.companyId,
    });
  }

  void notifyMoveOsParty({
    userId: input.studentId,
    kind: "bench_reserved",
    body: `An employer reserved your Visa-Cleared Bench seat until ${expiresAt}.`,
    link: "/student/move",
  });

  return reservation as BenchReservation;
}

export async function listCompanyReservations(companyId: string) {
  const snap = await adminDb
    .collection("bench_reservations")
    .where("companyId", "==", companyId)
    .get();
  return snap.docs.map((doc) => ({
    id: doc.id,
    ...(doc.data() as Omit<BenchReservation, "id">),
  }));
}

/** Release expired holds so students return to the Visa-Cleared Bench. */
export async function expireStaleBenchHolds(limit = 80): Promise<number> {
  const nowIso = new Date().toISOString();
  const snap = await adminDb
    .collection("bench_reservations")
    .where("status", "==", "held")
    .limit(limit)
    .get();

  let expired = 0;
  for (const doc of snap.docs) {
    const data = doc.data() as BenchReservation;
    if (!data.expiresAt || data.expiresAt > nowIso) continue;
    await adminDb.runTransaction(async (tx) => {
      const fresh = await tx.get(doc.ref);
      if (!fresh.exists || String(fresh.data()?.status) !== "held") return;
      const studentRef = adminDb.collection("students").doc(data.studentId);
      const studentSnap = await tx.get(studentRef);
      tx.set(
        doc.ref,
        stripUndefined({
          status: "expired",
          updatedAt: FieldValue.serverTimestamp(),
        }),
        { merge: true },
      );
      if (
        studentSnap.exists &&
        String(studentSnap.data()?.benchStatus) === "reserved" &&
        String(studentSnap.data()?.benchReservationId ?? "") === doc.id
      ) {
        tx.set(
          studentRef,
          stripUndefined({
            benchStatus: "ready",
            benchReservedBy: null,
            benchReservationId: null,
            benchReservedUntil: null,
            updatedAt: FieldValue.serverTimestamp(),
          }),
          { merge: true },
        );
      }
    });
    expired += 1;
  }
  return expired;
}

export async function cancelBenchReservation(input: {
  reservationId: string;
  companyId: string;
}): Promise<void> {
  const ref = adminDb.collection("bench_reservations").doc(input.reservationId);
  const snap = await ref.get();
  if (!snap.exists) throw new Error("reservation_not_found");
  const data = snap.data() as BenchReservation;
  if (data.companyId !== input.companyId) throw new Error("forbidden");
  if (data.status !== "held") throw new Error("reservation_not_held");

  await adminDb.runTransaction(async (tx) => {
    const fresh = await tx.get(ref);
    if (!fresh.exists || String(fresh.data()?.status) !== "held") {
      throw new Error("reservation_not_held");
    }
    const studentRef = adminDb.collection("students").doc(data.studentId);
    const studentSnap = await tx.get(studentRef);
    tx.set(
      ref,
      stripUndefined({
        status: "cancelled",
        updatedAt: FieldValue.serverTimestamp(),
      }),
      { merge: true },
    );
    if (
      studentSnap.exists &&
      String(studentSnap.data()?.benchReservationId ?? "") === input.reservationId
    ) {
      tx.set(
        studentRef,
        stripUndefined({
          benchStatus: "ready",
          benchReservedBy: null,
          benchReservationId: null,
          benchReservedUntil: null,
          updatedAt: FieldValue.serverTimestamp(),
        }),
        { merge: true },
      );
    }
  });
}

/** Mark a held reservation converted (proceed toward hire / dual commit). */
export async function convertBenchReservation(input: {
  reservationId: string;
  companyId: string;
}): Promise<BenchReservation> {
  const ref = adminDb.collection("bench_reservations").doc(input.reservationId);
  const snap = await ref.get();
  if (!snap.exists) throw new Error("reservation_not_found");
  const data = snap.data() as BenchReservation;
  if (data.companyId !== input.companyId) throw new Error("forbidden");
  if (data.status !== "held") throw new Error("reservation_not_held");

  await adminDb.runTransaction(async (tx) => {
    const fresh = await tx.get(ref);
    if (!fresh.exists || String(fresh.data()?.status) !== "held") {
      throw new Error("reservation_not_held");
    }
    const studentRef = adminDb.collection("students").doc(data.studentId);
    const studentSnap = await tx.get(studentRef);
    tx.set(
      ref,
      stripUndefined({
        status: "converted",
        updatedAt: FieldValue.serverTimestamp(),
      }),
      { merge: true },
    );
    if (
      studentSnap.exists &&
      String(studentSnap.data()?.benchReservationId ?? "") === input.reservationId
    ) {
      tx.set(
        studentRef,
        stripUndefined({
          benchStatus: "placed",
          updatedAt: FieldValue.serverTimestamp(),
        }),
        { merge: true },
      );
    }
  });

  return { ...data, status: "converted" };
}
