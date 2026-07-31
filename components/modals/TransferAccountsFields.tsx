"use client";

import { FormGroup, FormRow } from "@/components/ui/FormField";
import type { Account } from "@/features/common/types";

/** Campos "Conta Origem" e "Conta Destino" usados na transferência entre
 *  contas (na criação e na edição). */
export default function TransferAccountsFields({
  accounts,
  idPrefix,
  origemDefault = "",
  destinoDefault = "",
}: {
  accounts: Account[];
  idPrefix: string;
  origemDefault?: string;
  destinoDefault?: string;
}) {
  return (
    <FormRow>
      <FormGroup label="Conta Origem" htmlFor={`${idPrefix}-origem`}>
        <select
          id={`${idPrefix}-origem`}
          name="account_origem"
          className="form-select"
          defaultValue={origemDefault}
          required
        >
          <option value="">Selecione</option>
          {accounts.map((a) => (
            <option key={a.id} value={a.id}>
              {a.nome}
            </option>
          ))}
        </select>
      </FormGroup>
      <FormGroup label="Conta Destino" htmlFor={`${idPrefix}-destino`}>
        <select
          id={`${idPrefix}-destino`}
          name="account_destino"
          className="form-select"
          defaultValue={destinoDefault}
          required
        >
          <option value="">Selecione</option>
          {accounts.map((a) => (
            <option key={a.id} value={a.id}>
              {a.nome}
            </option>
          ))}
        </select>
      </FormGroup>
    </FormRow>
  );
}
