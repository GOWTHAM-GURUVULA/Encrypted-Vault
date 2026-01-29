import { useEffect, useState } from "react";
import { getFiles, removeFile, restoreFile } from "../api/vaultApi";

export default function FileList({ isOpen }) {
  const [files, setFiles] = useState([]);

  useEffect(() => {
    if (!isOpen) return;

    getFiles()
      .then((data) => setFiles(data.files || []))
      .catch(console.error);
  }, [isOpen]);

  return (
    <ul>
      {files.map((f) => (
        <li key={f}>
          {f}
          <button onClick={() => removeFile(f)}>❌</button>
          <button onClick={() => restoreFile(f)}>Restore</button>
        </li>
      ))}
    </ul>
  );
}
