"use client";

import { ArrowDown, ArrowUp, Plus, Trash2, X } from "lucide-react";
import { useId, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Field } from "@/lib/sites/section-fields";

import { ImageField } from "./image-field";

type Values = Record<string, unknown>;
type Ctx = { siteId: string; uploadsEnabled: boolean };

const str = (v: unknown) => (typeof v === "string" ? v : "");
const strList = (v: unknown) =>
  Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
const objList = (v: unknown) =>
  Array.isArray(v) ? v.filter((x): x is Values => !!x && typeof x === "object") : [];

/** Renders a list of fields bound to `values`; calls onChange with the next object. */
export function FieldsEditor({
  fields,
  values,
  onChange,
  ctx,
}: {
  fields: Field[];
  values: Values;
  onChange: (next: Values) => void;
  ctx: Ctx;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {fields.map((field) => {
        const wide = ["textarea", "list", "image", "lines", "tags"].includes(field.kind);
        return (
          <div key={field.name} className={wide ? "sm:col-span-2" : undefined}>
            <FieldInput
              field={field}
              value={values[field.name]}
              onChange={(v) => onChange({ ...values, [field.name]: v })}
              ctx={ctx}
            />
          </div>
        );
      })}
    </div>
  );
}

function FieldInput({
  field,
  value,
  onChange,
  ctx,
}: {
  field: Field;
  value: unknown;
  onChange: (v: unknown) => void;
  ctx: Ctx;
}) {
  const id = useId();
  switch (field.kind) {
    case "text":
    case "url":
    case "email":
      return (
        <div className="space-y-2">
          <Label htmlFor={id}>{field.label}</Label>
          <Input
            id={id}
            type={field.kind === "email" ? "email" : "text"}
            inputMode={field.kind === "url" ? "url" : undefined}
            value={str(value)}
            maxLength={field.max}
            placeholder={field.placeholder}
            aria-describedby={field.hint ? `${id}-hint` : undefined}
            onChange={(e) => onChange(e.target.value)}
            className="h-9"
          />
          {field.hint ? (
            <p id={`${id}-hint`} className="text-xs text-muted-foreground">
              {field.hint}
            </p>
          ) : null}
        </div>
      );
    case "textarea":
      return (
        <div className="space-y-2">
          <Label htmlFor={id}>{field.label}</Label>
          <textarea
            id={id}
            value={str(value)}
            maxLength={field.max}
            rows={4}
            onChange={(e) => onChange(e.target.value)}
            className="w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
          />
          {field.hint ? <p className="text-xs text-muted-foreground">{field.hint}</p> : null}
        </div>
      );
    case "lines":
      return (
        <div className="space-y-2">
          <Label htmlFor={id}>{field.label}</Label>
          <textarea
            id={id}
            value={strList(value).join("\n")}
            rows={3}
            onChange={(e) => onChange(e.target.value.split("\n"))}
            className="w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
          />
          {field.hint ? <p className="text-xs text-muted-foreground">{field.hint}</p> : null}
        </div>
      );
    case "checkbox":
      return (
        <label className="flex items-center gap-2 pt-6 text-sm">
          <input
            type="checkbox"
            checked={value === true}
            onChange={(e) => onChange(e.target.checked)}
            className="size-4 accent-[var(--brand-from)]"
          />
          {field.label}
        </label>
      );
    case "select":
      return (
        <div className="space-y-2">
          <Label htmlFor={id}>{field.label}</Label>
          <select
            id={id}
            value={str(value) || field.options[0]?.value}
            onChange={(e) => onChange(e.target.value)}
            className="h-9 w-full rounded-lg border border-input bg-background px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            {field.options.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
      );
    case "image":
      return (
        <ImageField
          label={field.label}
          value={str(value)}
          onChange={onChange}
          siteId={ctx.siteId}
          uploadsEnabled={ctx.uploadsEnabled}
        />
      );
    case "tags":
      return (
        <TagsInput
          label={field.label}
          placeholder={field.placeholder}
          value={strList(value)}
          onChange={onChange}
        />
      );
    case "list":
      return <ListEditor field={field} value={objList(value)} onChange={onChange} ctx={ctx} />;
  }
}

function TagsInput({
  label,
  placeholder,
  value,
  onChange,
}: {
  label: string;
  placeholder?: string;
  value: string[];
  onChange: (v: string[]) => void;
}) {
  const id = useId();
  const [draft, setDraft] = useState("");
  const add = () => {
    const tag = draft.trim().replace(/,$/, "");
    if (tag && !value.includes(tag)) onChange([...value, tag]);
    setDraft("");
  };
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      {value.length ? (
        <ul className="flex flex-wrap gap-1.5" aria-label={label}>
          {value.map((tag) => (
            <li
              key={tag}
              className="inline-flex items-center gap-1 rounded-md bg-white/10 py-0.5 pr-1 pl-2 text-xs"
            >
              {tag}
              <button
                type="button"
                aria-label={`Remove ${tag}`}
                onClick={() => onChange(value.filter((t) => t !== tag))}
                className="rounded p-0.5 hover:bg-white/10"
              >
                <X className="size-3" aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      <Input
        id={id}
        value={draft}
        placeholder={placeholder}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === ",") {
            e.preventDefault();
            add();
          }
        }}
        onBlur={add}
        className="h-9"
      />
    </div>
  );
}

function ListEditor({
  field,
  value,
  onChange,
  ctx,
}: {
  field: Extract<Field, { kind: "list" }>;
  value: Values[];
  onChange: (v: Values[]) => void;
  ctx: Ctx;
}) {
  const move = (i: number, d: -1 | 1) => {
    const next = [...value];
    [next[i], next[i + d]] = [next[i + d]!, next[i]!];
    onChange(next);
  };
  return (
    <fieldset className="space-y-3">
      <legend className="mb-2 text-sm font-medium">{field.label}</legend>
      {value.map((item, i) => {
        const title = str(item[field.titleField]) || `New ${field.itemLabel}`;
        return (
          <div key={i} className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
            <div className="mb-3 flex items-center justify-between gap-2">
              <p className="min-w-0 truncate text-sm font-medium">
                {i + 1}. {title}
              </p>
              <div className="flex shrink-0 gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Move ${title} up`}
                  disabled={i === 0}
                  onClick={() => move(i, -1)}
                >
                  <ArrowUp aria-hidden="true" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Move ${title} down`}
                  disabled={i === value.length - 1}
                  onClick={() => move(i, 1)}
                >
                  <ArrowDown aria-hidden="true" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Remove ${title}`}
                  onClick={() => onChange(value.filter((_, j) => j !== i))}
                >
                  <Trash2 aria-hidden="true" />
                </Button>
              </div>
            </div>
            <FieldsEditor
              fields={field.fields}
              values={item}
              onChange={(next) => onChange(value.map((v, j) => (j === i ? next : v)))}
              ctx={ctx}
            />
          </div>
        );
      })}
      {value.length < field.max ? (
        <Button type="button" variant="outline" onClick={() => onChange([...value, {}])}>
          <Plus aria-hidden="true" /> Add {field.itemLabel}
        </Button>
      ) : (
        <p className="text-xs text-muted-foreground">Maximum of {field.max} reached.</p>
      )}
    </fieldset>
  );
}
