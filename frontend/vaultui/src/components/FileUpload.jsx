import { uploadFile } from "../api/vaultApi";

export default function FileUpload() {
  async function handleChange(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    await uploadFile(file);
    event.target.value = "";
  }

  return <input type="file" onChange={handleChange} />;
}
