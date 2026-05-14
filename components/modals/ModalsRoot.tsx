"use client";

import NovaReceitaModal from "./NovaReceitaModal";
import NovaDespesaModal from "./NovaDespesaModal";
import AgendarModal from "./AgendarModal";
import NovaContaModal from "./NovaContaModal";
import EditProfileModal from "./EditProfileModal";
import ChangePasswordModal from "./ChangePasswordModal";

export default function ModalsRoot() {
  return (
    <>
      <NovaReceitaModal />
      <NovaDespesaModal />
      <AgendarModal />
      <NovaContaModal />
      <EditProfileModal />
      <ChangePasswordModal />
    </>
  );
}
