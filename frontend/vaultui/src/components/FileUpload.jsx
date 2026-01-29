
import { uploadFile } from "../api/vaultApi";

export default function FileUpload() {
  return (
    <input
      type="file"
      onChange={(e) => uploadFile(e.target.files[0])}
    />
  );
}
