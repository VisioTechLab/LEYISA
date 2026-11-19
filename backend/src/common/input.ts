import { BadRequestException } from "@nestjs/common";
export function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new BadRequestException("Objet JSON requis.");
  return value as Record<string, unknown>;
}
export function text(value: unknown, label: string, max = 150): string {
  if (typeof value !== "string" || !value.trim() || value.trim().length > max) throw new BadRequestException(`${label} invalide.`);
  return value.trim();
}
export function optionalText(value: unknown, label: string, max = 150): string | null {
  return value === undefined || value === null || value === "" ? null : text(value, label, max);
}
export function uuid(value: unknown): string {
  const id = text(value, "Identifiant", 36);
  if (!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(id)) throw new BadRequestException("Identifiant invalide.");
  return id;
}
export function day(value: unknown): Date {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new BadRequestException("Date civile requise (AAAA-MM-JJ).");
  const date = new Date(value+"T00:00:00.000Z");
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0,10) !== value) throw new BadRequestException("Date civile invalide.");
  return date;
}
export function todayCivil(now=new Date()):string {
  const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'Africa/Kinshasa',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(now);
  const get=(type:string)=>parts.find(p=>p.type===type)!.value;
  return `${get('year')}-${get('month')}-${get('day')}`;
}
export function positive(value: unknown): string {
  const s=String(value);
  if (!/^\d{1,6}(\.\d{1,4})?$/.test(s) || Number(s)<=0) throw new BadRequestException("Maximum positif à quatre décimales requis.");
  return s;
}
export function page(value: unknown): number {
  const p=Number(value ?? 1);
  if (!Number.isInteger(p)||p<1||p>100000) throw new BadRequestException("Page invalide.");
  return p;
}
