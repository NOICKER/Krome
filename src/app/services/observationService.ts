import type { Observation } from "../types";
import { STORAGE_KEYS, getItem, setItem, subscribeToKey } from "./storageService";

export function getObservations(): Observation[] {
  return getItem<Observation[]>(STORAGE_KEYS.OBSERVATIONS, []);
}

export function saveObservation(observation: Observation) {
  setItem(STORAGE_KEYS.OBSERVATIONS, [observation, ...getObservations()]);
}

export function updateObservation(observation: Observation) {
  const observations = getObservations();
  const index = observations.findIndex((entry) => entry.id === observation.id);
  if (index === -1) return;

  const nextObservations = [...observations];
  nextObservations[index] = observation;
  setItem(STORAGE_KEYS.OBSERVATIONS, nextObservations);
}

export function deleteObservation(observationId: string) {
  setItem(
    STORAGE_KEYS.OBSERVATIONS,
    getObservations().filter((observation) => observation.id !== observationId)
  );
}

export function subscribeToObservations(listener: (observations: Observation[]) => void) {
  return subscribeToKey<Observation[]>(STORAGE_KEYS.OBSERVATIONS, (observations) => {
    listener(observations ?? []);
  });
}
