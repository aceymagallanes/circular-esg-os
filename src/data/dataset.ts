import { buildDataset } from "./generate";

// Built once — deterministic, so every reload shows the same "operating history".
export const DATASET = buildDataset();
