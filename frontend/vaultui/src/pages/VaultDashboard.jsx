import { useState } from "react";
import VaultInit from "../components/VaultInit";
import VaultLogin from "../components/VaultLogin";
import VaultStatus from "../components/VaultStatus";
import FileUpload from "../components/FileUpload";
import FileList from "../components/FileList";

export default function VaultDashboard() {
  const [isOpen, setIsOpen] = useState(false);
  const [initialized, setInitialized] = useState(false);

  return (
    <div>
      <VaultStatus isOpen={isOpen} />

      {!initialized && <VaultInit onInit={() => setInitialized(true)} />}

      {initialized && !isOpen && <VaultLogin onOpen={setIsOpen} />}

      {isOpen && (
        <>
          <FileUpload />
          <FileList />
        </>
      )}
    </div>
  );
}
