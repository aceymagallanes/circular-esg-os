import type { DispositionKey, MaterialKey } from "./types";

export const DISPOSITION_META: Record<
  DispositionKey,
  { label: string; short: string; color: string; note: string }
> = {
  reuse: { label: "Reuse / redeploy", short: "Reuse", color: "#0A4E56", note: "Device redeployed as-is — highest value retention" },
  refurbish: { label: "Refurbish & resell", short: "Refurbish", color: "#0096D6", note: "Second life via certified refurbishment" },
  harvest: { label: "Parts harvest", short: "Harvest", color: "#6C5CE0", note: "Components reclaimed as service spares" },
  recycle: { label: "Materials recycle", short: "Recycle", color: "#2FA37A", note: "Shredded to certified material streams" },
  disposal: { label: "Responsible disposal", short: "Disposal", color: "#9AAAB1", note: "Energy recovery or landfill — residual loss from the circular economy" },
};

export const DISPOSITION_ORDER: DispositionKey[] = [
  "reuse", "refurbish", "harvest", "recycle", "disposal",
];

export const MATERIAL_META: Record<
  MaterialKey,
  { label: string; short: string; color: string }
> = {
  aluminum: { label: "Aluminum", short: "Al", color: "#8FA6B2" },
  steel: { label: "Steel", short: "Fe", color: "#6B7A82" },
  copper: { label: "Copper", short: "Cu", color: "#C67A46" },
  plastics: { label: "Plastics (rPET / PC-ABS)", short: "Plastics", color: "#4E9BD1" },
  glass: { label: "Glass", short: "Glass", color: "#7FB8B0" },
  gold: { label: "Gold", short: "Au", color: "#D9A93B" },
  ree: { label: "Rare earths", short: "REE", color: "#9B6CD1" },
  cobalt: { label: "Cobalt", short: "Co", color: "#4C6EF0" },
  board: { label: "Circuit boards", short: "PCB", color: "#5FA37A" },
};

export const MATERIAL_ORDER: MaterialKey[] = [
  "aluminum", "steel", "copper", "plastics", "board", "cobalt", "glass", "gold", "ree",
];
