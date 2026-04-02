import { useEffect, useState } from "react";
import { getFiles, removeFile, restoreFile } from "../api/vaultApi";

export default function FileList({ isOpen }) {
  const [files, setFiles] = useState([]);

  useEffect(() => {
    if (!isOpen) return;

    getFiles()
      .then((data) => setFiles(data))
      .catch(console.error);
  }, [isOpen]);

  return (
    <ul>
      {files.map((file) => (
        <li key={file.name}>
          {file.name}
          <button onClick={() => removeFile(file.name)}>X</button>
          <button onClick={() => restoreFile(file.name)}>Restore</button>
        </li>
      ))}
    </ul>
  );
}
