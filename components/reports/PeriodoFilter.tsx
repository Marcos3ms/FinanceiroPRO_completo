"use client";

import { useState } from "react";
import { FilterGroup } from "@/components/ui/FilterBar";

type Mode = "mes" | "personalizado";

export default function PeriodoFilter({
  defaultMode,
  defaultMes,
  defaultInicio,
  defaultFim,
}: {
  defaultMode: Mode;
  defaultMes: string;
  defaultInicio: string;
  defaultFim: string;
}) {
  const [mode, setMode] = useState<Mode>(defaultMode);
  const isCustom = mode === "personalizado";

  return (
    <>
      <FilterGroup label="Competência">
        <select
          name="periodo"
          className="form-select"
          value={mode}
          onChange={(e) => setMode(e.target.value as Mode)}
        >
          <option value="mes">Mês completo</option>
          <option value="personalizado">Personalizado</option>
        </select>
      </FilterGroup>

      {!isCustom && (
        <FilterGroup label="Mês">
          <input
            name="mes"
            type="month"
            className="form-input"
            defaultValue={defaultMes}
          />
        </FilterGroup>
      )}

      {isCustom && (
        <>
          <FilterGroup label="De">
            <input
              name="inicio"
              type="date"
              className="form-input"
              defaultValue={defaultInicio || `${defaultMes}-01`}
              required
            />
          </FilterGroup>
          <FilterGroup label="Até">
            <input
              name="fim"
              type="date"
              className="form-input"
              defaultValue={defaultFim || `${defaultMes}-01`}
              required
            />
          </FilterGroup>
          {/* Mantém o mes atual no submit para que o servidor tenha um fallback
              caso as datas não sejam preenchidas. */}
          <input type="hidden" name="mes" value={defaultMes} />
        </>
      )}
    </>
  );
}
