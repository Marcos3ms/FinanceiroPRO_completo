"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type {
  Account,
  Schedule,
  Transaction,
} from "@/features/common/types";

export type ModalKey =
  | "nova-receita"
  | "nova-despesa"
  | "agendar"
  | "nova-conta"
  | "editar-perfil"
  | "alterar-senha"
  | null;

export type EditingPayload =
  | { kind: "receita"; row: Transaction }
  | { kind: "despesa"; row: Transaction }
  | { kind: "agendar"; row: Schedule }
  | { kind: "conta"; row: Account };

export type Profile = {
  full_name: string | null;
  username: string | null;
  company_name: string | null;
  cnpj: string | null;
};

type Ctx = {
  current: ModalKey;
  editing: EditingPayload | null;
  open: (key: Exclude<ModalKey, null>) => void;
  openEdit: (payload: EditingPayload) => void;
  close: () => void;
  accounts: Account[];
  profile: Profile | null;
  email: string;
};

const ModalsContext = createContext<Ctx | null>(null);

const KIND_TO_KEY: Record<EditingPayload["kind"], Exclude<ModalKey, null>> = {
  receita: "nova-receita",
  despesa: "nova-despesa",
  agendar: "agendar",
  conta: "nova-conta",
};

export function ModalsProvider({
  children,
  accounts,
  profile,
  email,
}: {
  children: ReactNode;
  accounts: Account[];
  profile: Profile | null;
  email: string;
}) {
  const [current, setCurrent] = useState<ModalKey>(null);
  const [editing, setEditing] = useState<EditingPayload | null>(null);

  const open = useCallback((key: Exclude<ModalKey, null>) => {
    setEditing(null);
    setCurrent(key);
  }, []);

  const openEdit = useCallback((payload: EditingPayload) => {
    setEditing(payload);
    setCurrent(KIND_TO_KEY[payload.kind]);
  }, []);

  const close = useCallback(() => {
    setCurrent(null);
    setEditing(null);
  }, []);

  const value = useMemo(
    () => ({
      current,
      editing,
      open,
      openEdit,
      close,
      accounts,
      profile,
      email,
    }),
    [current, editing, open, openEdit, close, accounts, profile, email],
  );

  return (
    <ModalsContext.Provider value={value}>{children}</ModalsContext.Provider>
  );
}

export function useModals() {
  const ctx = useContext(ModalsContext);
  if (!ctx) throw new Error("useModals must be used inside ModalsProvider");
  return ctx;
}
